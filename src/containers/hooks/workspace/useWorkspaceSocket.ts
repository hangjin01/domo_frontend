'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketUrl } from '@/src/models/api/config';
import type { SocketConnectionState } from '@/src/models/types';

// ============================================
// 상수
// ============================================

const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000;

const isDev = process.env.NODE_ENV === 'development';

// ============================================
// 타입 정의
// ============================================

export type WorkspaceEventType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'WORKSPACE_UPDATED'
  | 'PROJECT_CREATED'
  | 'PROJECT_DELETED';

export interface WorkspaceSocketMessage {
  type: WorkspaceEventType;
  user_id?: number;
  data: Record<string, unknown>;
}

interface UseWorkspaceSocketOptions {
  workspaceId: number;
  currentUserId?: number;
  enabled?: boolean;
  onMessage?: (message: WorkspaceSocketMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface UseWorkspaceSocketReturn {
  connectionState: SocketConnectionState;
  isConnected: boolean;
  lastError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

// ============================================
// 메인 훅
// ============================================

export function useWorkspaceSocket(options: UseWorkspaceSocketOptions): UseWorkspaceSocketReturn {
  const {
    workspaceId,
    currentUserId,
    enabled = true,
    onMessage,
    onConnected,
    onDisconnected,
  } = options;

  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);

  const callbacksRef = useRef({ onMessage, onConnected, onDisconnected });
  useEffect(() => {
    callbacksRef.current = { onMessage, onConnected, onDisconnected };
  });

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as WorkspaceSocketMessage;

      if ((message as unknown as { type: string }).type === 'pong') return;

      // Self-echo 필터링
      if (message.user_id !== undefined && message.user_id === currentUserIdRef.current) {
        if (isDev) console.log(`[WorkspaceSocket] Self-echo ignored: ${message.type}`);
        return;
      }

      if (isDev) console.log(`[WorkspaceSocket] Received: ${message.type}`, message.data);

      callbacksRef.current.onMessage?.(message);
    } catch (error) {
      console.error('[WorkspaceSocket] Failed to parse message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !workspaceId) return;

    if (socketRef.current?.readyState === WebSocket.CONNECTING ||
        socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isManualDisconnectRef.current = false;
    setConnectionState('connecting');
    setLastError(null);

    try {
      const uid = currentUserIdRef.current ?? 0;
      const wsUrl = getWebSocketUrl(`/api/ws/workspaces/${workspaceId}?user_id=${uid}`);
      if (isDev) console.log(`[WorkspaceSocket] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        if (isDev) console.log('[WorkspaceSocket] Connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        setLastError(null);

        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);

        callbacksRef.current.onConnected?.();
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        const errorMsg = 'WebSocket 연결 오류가 발생했습니다.';
        setLastError(errorMsg);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        clearTimers();
        socketRef.current = null;

        if (!isManualDisconnectRef.current) {
          setConnectionState('reconnecting');
          scheduleReconnect();
        } else {
          setConnectionState('disconnected');
        }

        callbacksRef.current.onDisconnected?.();
      };
    } catch {
      setLastError('WebSocket 생성에 실패했습니다.');
      setConnectionState('disconnected');
    }
  }, [enabled, workspaceId, handleMessage, clearTimers]);

  const scheduleReconnect = useCallback(() => {
    if (isManualDisconnectRef.current || !mountedRef.current) return;

    const nextAttempt = ++reconnectAttemptsRef.current;
    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      setLastError('최대 재연결 시도 횟수를 초과했습니다.');
      setConnectionState('disconnected');
      return;
    }

    const delay = RECONNECT_INTERVALS[Math.min(nextAttempt - 1, RECONNECT_INTERVALS.length - 1)];
    if (isDev) console.log(`[WorkspaceSocket] Reconnecting in ${delay}ms (attempt ${nextAttempt})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !isManualDisconnectRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearTimers();
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearTimers]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    isManualDisconnectRef.current = false;
    setTimeout(() => { if (mountedRef.current) connect(); }, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && workspaceId) connect();

    return () => {
      mountedRef.current = false;
      isManualDisconnectRef.current = true;
      clearTimers();
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmount');
        socketRef.current = null;
      }
    };
  }, [enabled, workspaceId, connect, clearTimers]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    lastError,
    reconnect,
    disconnect,
  };
}

export default useWorkspaceSocket;

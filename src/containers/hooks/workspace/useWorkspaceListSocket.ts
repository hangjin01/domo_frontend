'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketUrl } from '@/src/models/api/config';
import type { WorkspaceSocketMessage } from './useWorkspaceSocket';

const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_DELAY = 5000;
const isDev = process.env.NODE_ENV === 'development';

interface UseWorkspaceListSocketOptions {
  workspaceIds: number[];
  currentUserId?: number;
  enabled?: boolean;
  onEvent?: (workspaceId: number, message: WorkspaceSocketMessage) => void;
}

/**
 * 여러 워크스페이스에 동시에 WebSocket 연결을 유지하는 훅.
 * 워크스페이스 목록 페이지에서 사용하여, 어떤 워크스페이스든 변경이 생기면
 * onEvent 콜백으로 알려줌.
 */
export function useWorkspaceListSocket(options: UseWorkspaceListSocketOptions) {
  const { workspaceIds, currentUserId, enabled = true, onEvent } = options;

  const connectionsRef = useRef<Map<number, WebSocket>>(new Map());
  const heartbeatsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const reconnectTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const onEventRef = useRef(onEvent);
  const currentUserIdRef = useRef(currentUserId);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const targetIdsRef = useRef(new Set(workspaceIds));

  useEffect(() => { onEventRef.current = onEvent; });
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { targetIdsRef.current = new Set(workspaceIds); }, [workspaceIds]);

  const cleanupConnection = useCallback((wsId: number) => {
    const ws = connectionsRef.current.get(wsId);
    if (ws) {
      ws.close(1000, 'Cleanup');
      connectionsRef.current.delete(wsId);
    }
    const hb = heartbeatsRef.current.get(wsId);
    if (hb) {
      clearInterval(hb);
      heartbeatsRef.current.delete(wsId);
    }
    const rt = reconnectTimersRef.current.get(wsId);
    if (rt) {
      clearTimeout(rt);
      reconnectTimersRef.current.delete(wsId);
    }
  }, []);

  const connectToWorkspace = useCallback((wsId: number) => {
    // 이미 연결 중이면 스킵
    const existing = connectionsRef.current.get(wsId);
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const uid = currentUserIdRef.current ?? 0;
    const url = getWebSocketUrl(`/api/ws/workspaces/${wsId}?user_id=${uid}`);
    const ws = new WebSocket(url);
    connectionsRef.current.set(wsId, ws);

    ws.onopen = () => {
      if (isDev) console.log(`[WsListSocket] Connected to workspace ${wsId}`);
      // Heartbeat
      const hb = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL);
      heartbeatsRef.current.set(wsId, hb);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WorkspaceSocketMessage;
        if ((message as unknown as { type: string }).type === 'pong') return;

        // Self-echo 필터링
        if (message.user_id !== undefined && message.user_id === currentUserIdRef.current) {
          if (isDev) console.log(`[WsListSocket] Self-echo ignored: workspace ${wsId} ${message.type}`);
          return;
        }

        if (isDev) console.log(`[WsListSocket] workspace ${wsId}: ${message.type}`, message.data);
        onEventRef.current?.(wsId, message);
      } catch {
        // 파싱 실패 무시
      }
    };

    ws.onclose = () => {
      if (isDev) console.log(`[WsListSocket] Disconnected from workspace ${wsId}`);
      connectionsRef.current.delete(wsId);
      const hb = heartbeatsRef.current.get(wsId);
      if (hb) {
        clearInterval(hb);
        heartbeatsRef.current.delete(wsId);
      }

      // 재연결: 아직 마운트 상태이고 해당 워크스페이스가 target에 포함되어 있으면
      if (mountedRef.current && enabledRef.current && targetIdsRef.current.has(wsId)) {
        const timer = setTimeout(() => {
          reconnectTimersRef.current.delete(wsId);
          if (mountedRef.current && enabledRef.current && targetIdsRef.current.has(wsId)) {
            connectToWorkspace(wsId);
          }
        }, RECONNECT_DELAY);
        reconnectTimersRef.current.set(wsId, timer);
      }
    };

    ws.onerror = () => {
      // 에러 시 조용히 처리 (목록 페이지에서 개별 WS 실패는 치명적이지 않음)
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || workspaceIds.length === 0) return;

    // 현재 연결 목록과 비교하여 추가/제거
    const currentIds = new Set(connectionsRef.current.keys());
    const targetIds = new Set(workspaceIds);

    // 새로 추가해야 할 것
    for (const id of targetIds) {
      if (!currentIds.has(id)) {
        connectToWorkspace(id);
      }
    }

    // 더 이상 필요 없는 것
    for (const id of currentIds) {
      if (!targetIds.has(id)) {
        cleanupConnection(id);
      }
    }

    return () => {
      // cleanup: 모든 연결 해제
      mountedRef.current = false;
      for (const id of connectionsRef.current.keys()) {
        cleanupConnection(id);
      }
      for (const [, timer] of reconnectTimersRef.current) {
        clearTimeout(timer);
      }
      reconnectTimersRef.current.clear();
    };
  }, [enabled, workspaceIds.join(','), connectToWorkspace, cleanupConnection]);
}

export default useWorkspaceListSocket;

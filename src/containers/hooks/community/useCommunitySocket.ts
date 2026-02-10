'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketUrl } from '@/src/models/api/config';
import type { SocketConnectionState } from '@/src/models/types';

const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000;

const isDev = process.env.NODE_ENV === 'development';

export type CommunityEventType =
    | 'POST_CREATED'
    | 'POST_DELETED'
    | 'POST_UPDATED'
    | 'COMMENT_CREATED'
    | 'COMMENT_DELETED'
    | 'COMMENT_UPDATED';

export interface CommunitySocketMessage {
    type: CommunityEventType;
    user_id?: number;
    data: Record<string, unknown>;
}

interface UseCommunitySocketOptions {
    currentUserId?: number;
    enabled?: boolean;
    onMessage?: (message: CommunitySocketMessage) => void;
}

export function useCommunitySocket(options: UseCommunitySocketOptions) {
    const { currentUserId, enabled = true, onMessage } = options;

    const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isManualDisconnectRef = useRef(false);
    const mountedRef = useRef(true);
    const reconnectAttemptsRef = useRef(0);

    const callbacksRef = useRef({ onMessage });
    useEffect(() => { callbacksRef.current = { onMessage }; });

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
            const message = JSON.parse(event.data) as CommunitySocketMessage;
            if ((message as unknown as { type: string }).type === 'pong') return;

            // Self-echo 필터링
            if (message.user_id !== undefined && message.user_id === currentUserIdRef.current) {
                if (isDev) console.log(`[CommunitySocket] Self-echo ignored: ${message.type}`);
                return;
            }

            if (isDev) console.log(`[CommunitySocket] Received: ${message.type}`, message.data);
            callbacksRef.current.onMessage?.(message);
        } catch (error) {
            console.error('[CommunitySocket] Failed to parse message:', error);
        }
    }, []);

    // ref로 순환 의존 해결: connect ↔ scheduleReconnect
    const connectRef = useRef<() => void>(() => {});

    const scheduleReconnect = useCallback(() => {
        if (isManualDisconnectRef.current || !mountedRef.current) return;

        const nextAttempt = ++reconnectAttemptsRef.current;
        if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
            setConnectionState('disconnected');
            return;
        }

        const delay = RECONNECT_INTERVALS[Math.min(nextAttempt - 1, RECONNECT_INTERVALS.length - 1)];
        reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && !isManualDisconnectRef.current) connectRef.current();
        }, delay);
    }, []);

    const connect = useCallback(() => {
        if (!enabled) return;
        if (socketRef.current?.readyState === WebSocket.CONNECTING ||
            socketRef.current?.readyState === WebSocket.OPEN) return;

        isManualDisconnectRef.current = false;
        setConnectionState('connecting');

        try {
            const wsUrl = getWebSocketUrl('/api/ws/community');
            if (isDev) console.log(`[CommunitySocket] Connecting to ${wsUrl}`);

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                if (!mountedRef.current) return;
                if (isDev) console.log('[CommunitySocket] Connected');
                setConnectionState('connected');
                reconnectAttemptsRef.current = 0;

                heartbeatIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, HEARTBEAT_INTERVAL);
            };

            ws.onmessage = handleMessage;
            ws.onerror = () => {};

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
            };
        } catch {
            setConnectionState('disconnected');
        }
    }, [enabled, handleMessage, clearTimers, scheduleReconnect]);

    connectRef.current = connect;

    useEffect(() => {
        mountedRef.current = true;
        if (enabled) connect();

        return () => {
            mountedRef.current = false;
            isManualDisconnectRef.current = true;
            clearTimers();
            if (socketRef.current) {
                socketRef.current.close(1000, 'Component unmount');
                socketRef.current = null;
            }
        };
    }, [enabled, connect, clearTimers]);

    return {
        isConnected: connectionState === 'connected',
        connectionState,
    };
}

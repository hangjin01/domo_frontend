// src/containers/hooks/board/useBoardSocket.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketUrl } from '@/src/models/api/config';
import { snakeToCamelDeep } from '@/src/models/utils/caseConverter';
import type {
  Task,
  Column,
  Connection,
  Group,
  SocketConnectionState,
  UseBoardSocketReturn,
  BoardSocketMessage,
  BackendCardSocketData,
  BackendColumnSocketData,
  BackendConnectionSocketData,
  DeleteEventData,
  TaskStatus,
  Assignee,
  TaskFile,
} from '@/src/models/types';

// ============================================
// 상수 정의
// ============================================

const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000]; // 재연결 대기 시간 (점진적 증가)
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000; // 30초마다 ping

// ============================================
// 타입 정의
// ============================================

interface UseBoardSocketOptions {
  /** 프로젝트 ID */
  projectId: number;
  /** 현재 사용자 ID (본인 이벤트 필터링용) */
  currentUserId?: number;
  /** 활성화 여부 (기본: true) */
  enabled?: boolean;

  // 상태 업데이트 콜백
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: number) => void;
  onTasksBatchUpdated?: (tasks: Task[]) => void;

  onColumnCreated?: (column: Column) => void;
  onColumnUpdated?: (column: Column) => void;
  onColumnDeleted?: (columnId: number) => void;

  onConnectionCreated?: (connection: Connection) => void;
  onConnectionUpdated?: (connection: Connection) => void;
  onConnectionDeleted?: (connectionId: number) => void;

  // 파일 이벤트
  onFileUploaded?: (file: unknown) => void;
  onFileDeleted?: (fileId: number) => void;

  // 연결 상태 콜백
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

// ============================================
// 데이터 변환 헬퍼 함수
// ============================================

/**
 * 컬럼 제목으로 상태 추론
 */
function inferStatusFromColumn(columnTitle: string): TaskStatus {
  const lower = columnTitle.toLowerCase();
  if (lower.includes('done') || lower.includes('완료')) return 'done';
  if (lower.includes('doing') || lower.includes('진행') || lower.includes('progress')) return 'in-progress';
  if (lower.includes('inbox') || lower.includes('수신')) return 'inbox';
  return 'todo';
}

/**
 * 백엔드 날짜를 프론트엔드 time 형식으로 변환
 */
function formatTaskTime(startDate?: string | null, dueDate?: string | null): string | undefined {
  if (!startDate && !dueDate) return undefined;
  const formatDate = (d: string) => d.split('T')[0];
  if (startDate && dueDate) return `${formatDate(startDate)}|${formatDate(dueDate)}`;
  if (startDate) return formatDate(startDate);
  if (dueDate) return formatDate(dueDate);
  return undefined;
}

/**
 * 파일 확장자로 MIME 타입 추론
 */
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return typeMap[ext] || 'application/octet-stream';
}

/**
 * 백엔드 Card 데이터를 프론트엔드 Task로 변환
 */
function transformCardToTask(card: BackendCardSocketData, projectId: number): Task {
  // 기본 상태 추론 (column_id가 없으면 todo)
  const status: TaskStatus = 'todo';

  const assignees: Assignee[] = (card.assignees || []).map((user) => ({
    id: user.id,
    name: user.name,
    avatar: user.profile_image || null,
  }));

  const files: TaskFile[] = (card.files || []).map((file) => ({
    id: file.id,
    name: file.filename,
    url: file.latest_version
      ? `/api/files/download/${file.latest_version.id}`
      : '#',
    size: file.latest_version?.file_size || 0,
    type: getFileType(file.filename),
  }));

  return {
    id: card.id,
    title: card.title,
    description: card.content || undefined,
    content: card.content || undefined,
    status,
    x: card.x || 0,
    y: card.y || 0,
    boardId: projectId,
    column_id: card.column_id ?? undefined,
    card_type: card.card_type,
    taskType: card.card_type === 'task' ? 0 : card.card_type === 'memo' ? 1 : undefined,
    assignees,
    files,
    comments: [],
    start_date: card.start_date || undefined,
    due_date: card.due_date || undefined,
    time: formatTaskTime(card.start_date, card.due_date),
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

/**
 * 백엔드 Column 데이터를 프론트엔드 Column으로 변환
 */
function transformColumnToColumn(col: BackendColumnSocketData): Column {
  return {
    id: col.id,
    title: col.title,
    status: inferStatusFromColumn(col.title),
    order: col.order,
    project_id: col.project_id,
    localX: col.local_x,
    localY: col.local_y,
    width: col.width,
    height: col.height,
    parentId: col.parent_id,
    depth: col.depth,
    color: col.color,
    collapsed: col.collapsed,
  };
}

/**
 * 백엔드 Connection 데이터를 프론트엔드 Connection으로 변환
 */
function transformConnectionToConnection(conn: BackendConnectionSocketData): Connection {
  return {
    id: conn.id,
    from: conn.from ?? conn.from_card_id ?? 0,
    to: conn.to ?? conn.to_card_id ?? 0,
    boardId: conn.board_id,
    style: (conn.style as 'solid' | 'dashed') || 'solid',
    shape: (conn.shape as 'bezier' | 'straight') || 'bezier',
    sourceHandle: (conn.sourceHandle || conn.source_handle || 'right') as 'left' | 'right',
    targetHandle: (conn.targetHandle || conn.target_handle || 'left') as 'left' | 'right',
  };
}

// ============================================
// 메인 훅
// ============================================

export function useBoardSocket(options: UseBoardSocketOptions): UseBoardSocketReturn {
  const {
    projectId,
    currentUserId,
    enabled = true,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTasksBatchUpdated,
    onColumnCreated,
    onColumnUpdated,
    onColumnDeleted,
    onConnectionCreated,
    onConnectionUpdated,
    onConnectionDeleted,
    onFileUploaded,
    onFileDeleted,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  // 상태
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);

  // 콜백 refs (의존성 변경 시에도 최신 콜백 참조)
  const callbacksRef = useRef({
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTasksBatchUpdated,
    onColumnCreated,
    onColumnUpdated,
    onColumnDeleted,
    onConnectionCreated,
    onConnectionUpdated,
    onConnectionDeleted,
    onFileUploaded,
    onFileDeleted,
    onConnected,
    onDisconnected,
    onError,
  });

  // 콜백 refs 업데이트
  useEffect(() => {
    callbacksRef.current = {
      onTaskCreated,
      onTaskUpdated,
      onTaskDeleted,
      onTasksBatchUpdated,
      onColumnCreated,
      onColumnUpdated,
      onColumnDeleted,
      onConnectionCreated,
      onConnectionUpdated,
      onConnectionDeleted,
      onFileUploaded,
      onFileDeleted,
      onConnected,
      onDisconnected,
      onError,
    };
  });

  /**
   * 타이머/인터벌 정리
   */
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

  /**
   * WebSocket 메시지 핸들러
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as BoardSocketMessage;
      const { type, data } = message;

      // pong 메시지 처리 (heartbeat 응답)
      if (type === 'pong' as unknown) {
        return;
      }

      console.log(`[BoardSocket] Received: ${type}`, data);

      switch (type) {
        case 'CARD_CREATED': {
          const cardData = data as BackendCardSocketData;
          const task = transformCardToTask(cardData, projectId);
          callbacksRef.current.onTaskCreated?.(task);
          break;
        }

        case 'CARD_UPDATED': {
          const cardData = data as BackendCardSocketData;
          const task = transformCardToTask(cardData, projectId);
          callbacksRef.current.onTaskUpdated?.(task);
          break;
        }

        case 'CARD_DELETED': {
          const deleteData = data as DeleteEventData;
          callbacksRef.current.onTaskDeleted?.(deleteData.id);
          break;
        }

        case 'CARD_BATCH_UPDATED': {
          const cardsData = data as BackendCardSocketData[];
          const tasks = cardsData.map((card) => transformCardToTask(card, projectId));
          callbacksRef.current.onTasksBatchUpdated?.(tasks);
          break;
        }

        case 'COLUMN_CREATED': {
          const colData = data as BackendColumnSocketData;
          const column = transformColumnToColumn(colData);
          callbacksRef.current.onColumnCreated?.(column);
          break;
        }

        case 'COLUMN_UPDATED': {
          const colData = data as BackendColumnSocketData;
          const column = transformColumnToColumn(colData);
          callbacksRef.current.onColumnUpdated?.(column);
          break;
        }

        case 'COLUMN_DELETED': {
          const deleteData = data as DeleteEventData;
          callbacksRef.current.onColumnDeleted?.(deleteData.id);
          break;
        }

        case 'CONNECTION_CREATED': {
          const connData = data as BackendConnectionSocketData;
          const connection = transformConnectionToConnection(connData);
          callbacksRef.current.onConnectionCreated?.(connection);
          break;
        }

        case 'CONNECTION_UPDATED': {
          const connData = data as BackendConnectionSocketData;
          const connection = transformConnectionToConnection(connData);
          callbacksRef.current.onConnectionUpdated?.(connection);
          break;
        }

        case 'CONNECTION_DELETED': {
          const deleteData = data as DeleteEventData;
          callbacksRef.current.onConnectionDeleted?.(deleteData.id);
          break;
        }

        case 'FILE_UPLOADED':
        case 'FILES_UPLOADED': {
          callbacksRef.current.onFileUploaded?.(snakeToCamelDeep(data));
          break;
        }

        case 'FILE_DELETED': {
          const deleteData = data as DeleteEventData;
          callbacksRef.current.onFileDeleted?.(deleteData.id);
          break;
        }

        default:
          console.warn(`[BoardSocket] Unknown event type: ${type}`);
      }
    } catch (error) {
      console.error('[BoardSocket] Failed to parse message:', error);
    }
  }, [projectId]);

  /**
   * WebSocket 연결 시작
   */
  const connect = useCallback(() => {
    if (!enabled || !projectId) {
      return;
    }

    // 이미 연결 중이거나 연결됨
    if (socketRef.current?.readyState === WebSocket.CONNECTING ||
        socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isManualDisconnectRef.current = false;
    setConnectionState('connecting');
    setLastError(null);

    try {
      const wsUrl = getWebSocketUrl(`/api/ws/projects/${projectId}/board`);
      console.log(`[BoardSocket] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log('[BoardSocket] Connected');
        setConnectionState('connected');
        setReconnectAttempts(0);
        setLastError(null);

        // Heartbeat 시작
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);

        callbacksRef.current.onConnected?.();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        console.error('[BoardSocket] Error:', event);
        const errorMsg = 'WebSocket 연결 오류가 발생했습니다.';
        setLastError(errorMsg);
        callbacksRef.current.onError?.(errorMsg);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log(`[BoardSocket] Closed: code=${event.code}, reason=${event.reason}`);
        clearTimers();
        socketRef.current = null;

        // 수동 종료가 아니면 재연결 시도
        if (!isManualDisconnectRef.current) {
          setConnectionState('reconnecting');
          scheduleReconnect();
        } else {
          setConnectionState('disconnected');
        }

        callbacksRef.current.onDisconnected?.();
      };
    } catch (error) {
      console.error('[BoardSocket] Failed to create WebSocket:', error);
      const errorMsg = 'WebSocket 생성에 실패했습니다.';
      setLastError(errorMsg);
      setConnectionState('disconnected');
      callbacksRef.current.onError?.(errorMsg);
    }
  }, [enabled, projectId, handleMessage, clearTimers]);

  /**
   * 재연결 스케줄링
   */
  const scheduleReconnect = useCallback(() => {
    if (isManualDisconnectRef.current || !mountedRef.current) {
      return;
    }

    setReconnectAttempts((prev) => {
      const nextAttempt = prev + 1;

      if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
        const errorMsg = '최대 재연결 시도 횟수를 초과했습니다.';
        setLastError(errorMsg);
        setConnectionState('disconnected');
        callbacksRef.current.onError?.(errorMsg);
        return prev;
      }

      const delay = RECONNECT_INTERVALS[Math.min(nextAttempt - 1, RECONNECT_INTERVALS.length - 1)];
      console.log(`[BoardSocket] Reconnecting in ${delay}ms (attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !isManualDisconnectRef.current) {
          connect();
        }
      }, delay);

      return nextAttempt;
    });
  }, [connect]);

  /**
   * 수동 연결 해제
   */
  const disconnect = useCallback(() => {
    console.log('[BoardSocket] Manual disconnect');
    isManualDisconnectRef.current = true;
    clearTimers();

    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }

    setConnectionState('disconnected');
  }, [clearTimers]);

  /**
   * 수동 재연결
   */
  const reconnect = useCallback(() => {
    console.log('[BoardSocket] Manual reconnect');
    disconnect();
    setReconnectAttempts(0);
    isManualDisconnectRef.current = false;

    // 약간의 딜레이 후 연결
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);
  }, [disconnect, connect]);

  // 초기 연결 및 정리
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && projectId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      isManualDisconnectRef.current = true;
      clearTimers();

      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmount');
        socketRef.current = null;
      }
    };
  }, [enabled, projectId, connect, clearTimers]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    lastError,
    reconnectAttempts,
    reconnect,
    disconnect,
  };
}

export default useBoardSocket;
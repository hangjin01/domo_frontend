/**
 * [파일 안내] frontend/src/views/board/BoardCanvas.tsx
 * 무한 캔버스의 선택·드래그·그룹화·연결선·확대/이동 및 키보드 조작을 묶는 핵심 UI입니다.
 * 입력은 tasks/groups/connections와 부모 콜백입니다. 포인터 상태는 ref/state에, 저장 대기 변경은 usePendingSync에 맡깁니다.
 * 화면 픽셀, 캔버스 좌표, 부모 그룹 기준 상대좌표를 구분해야 합니다. 다른 좌표계의 값을 바로 더하면 중첩 그룹에서 위치가 틀어집니다.
 * 드래그는 미리보기를 즉시 갱신하고 종료 시 저장합니다. 실패 시 복원할 스냅샷과 임시 ID→저장 ID 매핑을 함께 살펴보세요.
 * 렌더링 중 API를 호출하지 않으며 이벤트/effect에서 처리합니다. 파일 드롭·삭제·배치 위치 변경은 외부 상태를 바꾸므로 콜백의 실패 경로도 확인해야 합니다.
 */

'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { clampZoom, zoomScroll, fitZoom } from '@/src/models/utils/boardZoom';
import { indexBoardTasks } from '@/src/models/utils/boardIndex';
import { getBoardMenuTarget, resolveBoardMenuTarget } from '@/src/models/utils/boardMenu';
import { DeleteConfirmation } from '@/src/views/common/DeleteConfirmation';
import { Task, Connection, Board, Group, Column } from '@/src/models/types';
import { TaskCard } from '@/src/views/task/TaskCard';
import { cardSize, groupGrid, fitGroup } from '@/src/models/utils/cardLayout';
import { SortableGroup, DropPlaceholder, SortableCard } from '@/src/views/board/SortableGroup';
import { SyncStatusIndicator, SyncErrorToast } from '@/src/views/board/SyncStatusIndicator';
import { useSortableGrid } from '@/src/containers/hooks/board/useSortableGrid';
import {
    usePendingSync,
    PendingChange,
    BatchChangeItem,
    BatchCardPositionPayload,
} from '@/src/containers/hooks/common/usePendingSync';
import { deleteTask, updateTask, batchUpdateCardPositions } from '@/src/models/api';
import {
    CARD_WIDTH,
    CARD_HEIGHT,
    GRID_GAP,
    GRID_PADDING,
    GROUP_HEADER_HEIGHT,
    DRAG_THRESHOLD,
    DEFAULT_GRID_CONFIG,
    GridConfig,
    indexToRelativePosition,
    indexToAbsolutePosition,
    absolutePositionToIndex,
    relativeToAbsolute,
    absoluteToRelative,
    isPointInGroup,
} from '@/src/models/constants/grid';
import {
    calculateGroupCreation,
    calculateLayoutAfterAddCard,
    calculateGroupLayout,
} from '@/src/models/utils/groupLayout';
import {
    Plus, LayoutDashboard, ChevronDown, Check, Pencil, X, MousePointer2, Layers, Spline, Trash2, FilePlus, Clipboard,
    Grid, Sun, Moon, Loader2
} from 'lucide-react';

// 카드 위치 변경 페이로드 타입
interface CardPositionPayload {
    taskId: number;
    x: number;
    y: number;
    column_id?: number | null;
}

// 카드 위치 스냅샷 타입
interface CardPositionSnapshot {
    x: number;
    y: number;
    column_id: number | undefined;
}

// 그룹 위치 변경 페이로드 타입
interface GroupPositionPayload {
    groupId: number;
    x: number;
    y: number;
}

// 그룹 위치 스냅샷 타입
interface GroupPositionSnapshot {
    x: number;
    y: number;
}

/** 라이브 커서 데이터 */
interface CursorInfo {
    userId: number;
    userName: string;
    x: number;
    y: number;
    color: string;
    lastSeen: number;
}

interface BoardCanvasProps {
    tasks: Task[];
    connections: Connection[];
    columns: Column[];
    onTasksUpdate: (tasks: Task[]) => void;
    onTaskSelect: (task: Task) => void;
    onTaskCreate?: (taskData: Partial<Task>) => Promise<Task>;
    onTaskUpdate?: (taskId: number, updates: Partial<Task>) => Promise<void>;
    onTaskDelete?: (taskId: number) => Promise<void>;
    onMoveTaskToColumn?: (taskId: number, columnId: number) => Promise<void>;
    onConnectionCreate: (from: number, to: number, sourceHandle?: 'left' | 'right', targetHandle?: 'left' | 'right') => void;
    onConnectionDelete: (id: number) => void;
    onConnectionUpdate: (id: number, updates: Partial<Connection>) => void | Promise<void>;
    boards: Board[];
    activeBoardId: number;
    onSwitchBoard: (id: number) => void;
    onAddBoard: (name: string) => void;
    onRenameBoard: (id: number, name: string) => void;
    snapToGrid: boolean;
    groups: Group[];
    onGroupsUpdate: (groups: Group[]) => Promise<Map<number, number>>;
    onGroupMove?: (groupId: number, newX: number, newY: number) => Promise<void>;
    onGroupDelete?: (groupId: number) => Promise<void>;
    onToggleGrid: () => void;
    onToggleTheme: () => void;
    onArrange?: (width: number) => Promise<void>;
    // 파일 드롭 관련
    onFileDropOnCard?: (cardId: number, fileId: number) => Promise<void>;
    onNativeFileDrop?: (cardId: number, files: File[]) => Promise<void>;
    onBackgroundFileDrop?: (files: File[]) => Promise<void>;
    // 🔧 [FIX] 임시 ID → 실제 ID 변환 함수
    resolveColumnId?: (columnId: number | null | undefined) => number | null | undefined;
    // 라이브 커서
    remoteCursors?: Map<number, CursorInfo>;
    onCursorMove?: (x: number, y: number) => void;
}

const COLUMN_WIDTH = 350;
const COLUMN_GAP = 30;
const COLUMN_START_X = 50;

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
                                                            tasks, connections, columns, onTasksUpdate, onTaskSelect, onTaskCreate, onTaskUpdate, onTaskDelete, onMoveTaskToColumn, onConnectionCreate, onConnectionDelete, onConnectionUpdate, boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, snapToGrid, groups: storedGroups, onGroupsUpdate, onGroupMove, onGroupDelete, onToggleGrid, onToggleTheme, onArrange, onFileDropOnCard, onNativeFileDrop, onBackgroundFileDrop, resolveColumnId, remoteCursors, onCursorMove
                                                        }) => {
    const groups = useMemo(() => storedGroups.map(g => fitGroup(g, tasks)), [storedGroups, tasks]);
    const containerRef = useRef<HTMLDivElement>(null);
    const planeRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const pendingScroll = useRef<{ left: number; top: number } | null>(null);
    const pointerHeld = useRef(false);
    // 화면 좌표에서 배율과 보드 원점을 제거하여 저장 좌표로 변환합니다.
    const worldPoint = useCallback((x: number, y: number) => {
        const rect = planeRef.current!.getBoundingClientRect();
        return { x: (x - rect.left) / zoomRef.current, y: (y - rect.top) / zoomRef.current };
    }, []);
    const changeZoom = useCallback((value: number, x?: number, y?: number) => {
        const el = containerRef.current;
        if (!el || pointerHeld.current) return;
        const next = clampZoom(value);
        const px = x ?? el.clientWidth / 2, py = y ?? el.clientHeight / 2;
        pendingScroll.current = { left: zoomScroll(el.scrollLeft, px, zoomRef.current, next), top: zoomScroll(el.scrollTop, py, zoomRef.current, next) };
        zoomRef.current = next;
        setZoom(next);
    }, []);
    useLayoutEffect(() => {
        if (pendingScroll.current && containerRef.current) {
            containerRef.current.scrollTo(pendingScroll.current);
            pendingScroll.current = null;
        }
    }, [zoom, origin]);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const wheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
            changeZoom(zoomRef.current * Math.exp(-delta * 0.002), e.clientX - rect.left, e.clientY - rect.top);
        };
        const release = () => { pointerHeld.current = false; };
        el.addEventListener('wheel', wheel, { passive: false });
        // 크기 조절 핸들이 버블링을 막아도 포인터 종료는 반드시 감지합니다.
        window.addEventListener('pointerup', release, true);
        window.addEventListener('pointercancel', release, true);
        window.addEventListener('blur', release);
        return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true); window.removeEventListener('blur', release); };
    }, [changeZoom]);
    const boardBounds = useMemo(() => {
        const items = [...groups.map(g => ({ x: g.x, y: g.y, width: g.width, height: g.collapsed ? 50 : g.height })),
            ...tasks.filter(t => !groups.some(g => g.id === t.column_id)).map(t => ({ x: t.x ?? 0, y: t.y ?? 0, ...cardSize(t) }))];
        return { left: Math.min(0, ...items.map(i => i.x)), top: Math.min(0, ...items.map(i => i.y)),
            right: Math.max(1, ...items.map(i => i.x + i.width)), bottom: Math.max(1, ...items.map(i => i.y + i.height)) };
    }, [groups, tasks]);
    const fitBoard = () => {
        const el = containerRef.current;
        if (!el || pointerHeld.current) return;
        const next = fitZoom(boardBounds.right - boardBounds.left, boardBounds.bottom - boardBounds.top, el.clientWidth, el.clientHeight);
        setOrigin({ x: -boardBounds.left + 32 / next, y: -boardBounds.top + 32 / next });
        pendingScroll.current = { left: 0, top: 0 };
        zoomRef.current = next;
        setZoom(next);
    };
    const boardSelectorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const taskFileInputRef = useRef<HTMLInputElement>(null);
    const [activeTaskForFile, setActiveTaskForFile] = useState<number | null>(null);

    const mousePosRef = useRef({ x: 0, y: 0 });
    const [lines, setLines] = useState<React.ReactElement[]>([]);
    const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

    // ============================================
    // [최적화] connections를 Ref로 관리
    // useCallback 의존성에서 제거하여 불필요한 함수 재생성 방지
    // (tasksRef는 이미 아래에서 선언됨)
    // ============================================
    const connectionsRef = useRef<Connection[]>(connections);

    // props 변경 시 ref 동기화
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // 파일 드래그 드롭 상태
    const [fileDropTargetCardId, setFileDropTargetCardId] = useState<number | null>(null);

    // 자유 배치 카드 드래그 상태 (그룹 밖 카드)
    const [freeDragState, setFreeDragState] = useState<{ id: number, startX: number, startY: number, initialTaskX: number, initialTaskY: number } | null>(null);

    // 그룹 드래그 상태
    const [groupDragState, setGroupDragState] = useState<{
        id: number,
        startX: number,
        startY: number,
        initialGroupX: number,
        initialGroupY: number,
        containedTaskIds: { id: number, initialX: number, initialY: number }[],
        containedChildGroups: { id: number, initialX: number, initialY: number }[]
    } | null>(null);

    const [connectionDraft, setConnectionDraft] = useState<{ fromId: number, startX: number, startY: number, currX: number, currY: number, sourceHandle: 'left' | 'right' } | null>(null);

    // 연결선 끝점 재연결 드래그 상태
    const [connectionReconnect, setConnectionReconnect] = useState<{
        connectionId: number;
        draggingEnd: 'source' | 'target';  // 어느 끝을 드래그하는지
        fixedCardId: number;               // 고정된 쪽 카드 ID
        fixedHandle: 'left' | 'right';     // 고정된 쪽 핸들
        originalCardId: number;            // 원래 연결되어 있던 카드 ID
        originalHandle: 'left' | 'right';  // 원래 핸들
        currX: number;
        currY: number;
    } | null>(null);

    const [activeMenu, setActiveMenu] = useState<{ id: number, x: number, y: number } | null>(null);
    const [savingConnection, setSavingConnection] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const saveConnectionChange = async (updates: Partial<Connection>) => {
        if (!activeMenu || savingConnection) return;
        setSavingConnection(true);
        setConnectionError('');
        try { await onConnectionUpdate(activeMenu.id, updates); setActiveMenu(null); }
        catch { setConnectionError('선 종류를 저장하지 못했습니다. 다시 시도해 주세요.'); }
        finally { setSavingConnection(false); }
    };
    const [backgroundMenu, setBackgroundMenu] = useState<{ x: number, y: number, taskX: number, taskY: number, targetTaskId?: number, targetGroupId?: number } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currX: number, currY: number } | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [editingGroupTitle, setEditingGroupTitle] = useState('');
    const [showBoardMenu, setShowBoardMenu] = useState(false);
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
    const [editBoardName, setEditBoardName] = useState('');

    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [arranging, setArranging] = useState(false);
    const [arrangeMessage, setArrangeMessage] = useState('');
    const [isDeletingTask, setIsDeletingTask] = useState(false);
    const [pendingTaskDelete, setPendingTaskDelete] = useState<number | null>(null);
    // React state가 pointerup에서 초기화돼도 contextmenu가 뒤늦게 올 수 있습니다.
    // 캡처 단계에서 기록해 그룹 내부 카드의 stopPropagation에도 영향을 받지 않습니다.
    const rightClickStart = useRef<ReturnType<typeof getBoardMenuTarget> | null>(null);
    const rightClickPanned = useRef(false);

    // 우클릭 팬 상태
    const [panState, setPanState] = useState<{
        startX: number;
        startY: number;
        scrollStartX: number;
        scrollStartY: number;
        hasMoved: boolean;
        target: ReturnType<typeof getBoardMenuTarget>;
    } | null>(null);

    // 호버된 연결선 끝점 (드래그 가능 표시)
    const [hoveredEndpoint, setHoveredEndpoint] = useState<{
        connectionId: number;
        endpoint: 'source' | 'target';
        x: number;
        y: number;
    } | null>(null);

    // 카드 드래그 대기 상태 (threshold 적용)
    const [pendingCardDrag, setPendingCardDrag] = useState<{
        taskId: number;
        startX: number;
        startY: number;
        cardRect: DOMRect;
    } | null>(null);

    // 자유 카드 드래그 시 타겟 그룹 하이라이트
    const [freeCardTargetGroupId, setFreeCardTargetGroupId] = useState<number | null>(null);

    // ============================================
    // Refs로 최신 상태 유지 (클로저 문제 방지)
    // ============================================
    const tasksRef = useRef(tasks);
    const groupsRef = useRef(groups);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    // ============================================
    // [Race Condition Guard] 상호작용 중인 엔티티 ID 추적
    // 드래그 중인 카드/그룹의 ID를 Set으로 관리하여
    // 서버 응답(롤백 포함)이 해당 엔티티를 덮어쓰지 않도록 함
    // ============================================
    const interactingEntitiesRef = useRef<Set<number>>(new Set());

    // 개발 환경에서만 로그 출력
    const isDev = process.env.NODE_ENV === 'development';

    // 엔티티 Lock 여부 확인 함수 (usePendingSync에 전달)
    const isEntityLocked = useCallback((entityId: number): boolean => {
        return interactingEntitiesRef.current.has(entityId);
    }, []);

    // 엔티티 Lock 추가
    const lockEntity = useCallback((entityId: number) => {
        interactingEntitiesRef.current.add(entityId);
        if (isDev) console.log('[Guard] Entity locked:', entityId, '| Current locks:', Array.from(interactingEntitiesRef.current));
    }, [isDev]);

    // 엔티티 Lock 해제
    const unlockEntity = useCallback((entityId: number) => {
        interactingEntitiesRef.current.delete(entityId);
        if (isDev) console.log('[Guard] Entity unlocked:', entityId, '| Current locks:', Array.from(interactingEntitiesRef.current));
    }, [isDev]);

    // 여러 엔티티 한번에 Lock
    const lockEntities = useCallback((entityIds: number[]) => {
        entityIds.forEach(id => interactingEntitiesRef.current.add(id));
        if (isDev) console.log('[Guard] Entities locked:', entityIds, '| Current locks:', Array.from(interactingEntitiesRef.current));
    }, [isDev]);

    // 여러 엔티티 한번에 Unlock
    const unlockEntities = useCallback((entityIds: number[]) => {
        entityIds.forEach(id => interactingEntitiesRef.current.delete(id));
        if (isDev) console.log('[Guard] Entities unlocked:', entityIds, '| Current locks:', Array.from(interactingEntitiesRef.current));
    }, [isDev]);

    // ============================================
    // Optimistic UI: 카드 동기화 큐 관리 (Batch 모드)
    // ============================================
    const {
        syncStatus: cardSyncStatus,
        pendingCount: cardPendingCount,
        lastError: cardLastError,
        queueChange: queueCardChange,
        queueBatchChange: queueBatchCardChange,
        retryFailed: retryCardFailed,
        clearError: clearCardError,
        flush: flushCardChanges,
    } = usePendingSync<CardPositionPayload, CardPositionSnapshot>({
        debounceMs: 400, // 연속 드래그 대응을 위해 400ms로 변경
        maxRetries: 3,
        onRollback: (change: PendingChange<CardPositionPayload, CardPositionSnapshot>) => {
            // 단건 실패 시 이전 상태로 롤백 (ref를 통해 최신 tasks 참조)
            const { entityId, snapshot } = change;
            onTasksUpdate(tasksRef.current.map(t =>
                t.id === entityId
                    ? { ...t, x: snapshot.x, y: snapshot.y, column_id: snapshot.column_id }
                    : t
            ));
        },
        onBatchRollback: (items: BatchChangeItem[]) => {
            // Batch 실패 시 모든 카드를 이전 상태로 롤백
            if (isDev) console.log('[BoardCanvas] Batch 롤백 실행, 카드 수:', items.length);
            onTasksUpdate(tasksRef.current.map(t => {
                const item = items.find(i => i.entityId === t.id);
                if (item) {
                    return {
                        ...t,
                        x: item.snapshot.x,
                        y: item.snapshot.y,
                        column_id: item.snapshot.column_id,
                    };
                }
                return t;
            }));
        },
        batchApiCall: async (payloads: BatchCardPositionPayload[]) => {
            // 🔧 [FIX] 임시 ID(타임스탬프) 필터링
            // PostgreSQL Integer 최대값: 2,147,483,647
            // Date.now() 범위: ~1,700,000,000,000 (약 1.7조)
            const MAX_VALID_DB_ID = 2147483647;

            const sanitizedPayloads = payloads.map(p => {
                let columnId = p.column_id;

                // 임시 ID인 경우 resolveColumnId로 실제 ID 변환 시도
                if (columnId && columnId > MAX_VALID_DB_ID) {
                    const resolvedId = resolveColumnId?.(columnId);
                    if (resolvedId && resolvedId <= MAX_VALID_DB_ID) {
                        console.log(`[BatchAPI] column_id 변환: ${columnId} → ${resolvedId}`);
                        columnId = resolvedId;
                    } else {
                        // 변환 실패 시 null로 설정 (자유 배치로 fallback)
                        console.warn(`[BatchAPI] 임시 ID ${columnId} 변환 실패, null로 대체`);
                        columnId = null;
                    }
                }

                return {
                    id: p.taskId,
                    x: p.x,
                    y: p.y,
                    column_id: columnId,
                };
            });

            await batchUpdateCardPositions(sanitizedPayloads);
        },
        // [Race Condition Guard] 드래그 중인 카드는 롤백하지 않음
        isEntityLocked,
    });

    // ============================================
    // Optimistic UI: 그룹 동기화 큐 관리
    // ============================================
    const {
        syncStatus: groupSyncStatus,
        pendingCount: groupPendingCount,
        lastError: groupLastError,
        queueChange: queueGroupChange,
        retryFailed: retryGroupFailed,
        clearError: clearGroupError,
        flush: flushGroupChanges,
    } = usePendingSync<GroupPositionPayload, GroupPositionSnapshot>({
        debounceMs: 400, // 연속 드래그 대응을 위해 400ms로 변경
        maxRetries: 3,
        onRollback: (change: PendingChange<GroupPositionPayload, GroupPositionSnapshot>) => {
            // 실패 시 이전 상태로 롤백 (ref를 통해 최신 groups 참조)
            const { entityId, snapshot } = change;
            onGroupsUpdate(groupsRef.current.map(g =>
                g.id === entityId
                    ? { ...g, x: snapshot.x, y: snapshot.y }
                    : g
            ));
        },
        // [Race Condition Guard] 드래그 중인 그룹은 롤백하지 않음
        isEntityLocked,
    });

    // 통합 동기화 상태 (카드 + 그룹)
    // 우선순위: error > syncing > success > pending > idle
    const syncStatus = cardSyncStatus === 'error' || groupSyncStatus === 'error'
        ? 'error'
        : cardSyncStatus === 'syncing' || groupSyncStatus === 'syncing'
            ? 'syncing'
            : cardSyncStatus === 'success' || groupSyncStatus === 'success'
                ? 'success'
                : cardSyncStatus === 'pending' || groupSyncStatus === 'pending'
                    ? 'pending'
                    : 'idle';
    const pendingCount = cardPendingCount + groupPendingCount;
    const lastError = cardLastError || groupLastError;
    const retryFailed = () => { retryCardFailed(); retryGroupFailed(); };
    const clearError = () => { clearCardError(); clearGroupError(); };

    // 에러 토스트 표시 여부
    const [showErrorToast, setShowErrorToast] = useState(false);
    useEffect(() => {
        if (lastError) {
            setShowErrorToast(true);
        }
    }, [lastError]);

    // ============================================
    // useSortableGrid 훅 사용 - 그룹 내 카드 정렬용
    // ============================================
    const {
        dragContext,
        dropPreview,
        cardPositions,
        isDragging: isSortableDragging,
        highlightedGroupId,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        isTaskBeingDragged,
        getCardTransition,
        isGroupHighlighted,
        setFreeCardPreview,
        gridConfig,
    } = useSortableGrid(
        tasks,
        groups,
        onTasksUpdate,
        // 드래그 종료 콜백: Batch API 저장 처리
        (result) => {
            // no-change는 콜백이 호출되지 않음 (useSortableGrid에서 필터링)

            // Batch 변경 항목 수집
            const batchItems: BatchChangeItem[] = [];

            // 1. 드래그한 카드 추가
            batchItems.push({
                entityId: result.taskId,
                payload: {
                    taskId: result.taskId,
                    x: result.newX,
                    y: result.newY,
                    column_id: result.newGroupId,
                },
                snapshot: result.snapshot,
            });

            // 2. 영향받은 다른 카드들도 추가 (그룹 내 재정렬 시)
            // 중요: affectedCards에는 이제 원본 좌표(originalX, originalY)가 포함됨
            if (result.affectedCards) {
                for (const affected of result.affectedCards) {
                    batchItems.push({
                        entityId: affected.taskId,
                        payload: {
                            taskId: affected.taskId,
                            x: affected.newX,
                            y: affected.newY,
                            column_id: affected.originalColumnId ?? null,
                        },
                        snapshot: {
                            x: affected.originalX,
                            y: affected.originalY,
                            column_id: affected.originalColumnId,
                        },
                    });
                }
            }

            // 3. Batch 큐에 추가 (단일 API 호출로 처리됨)
            if (isDev) console.log('[BoardCanvas] Batch 큐 추가, 카드 수:', batchItems.length);
            queueBatchCardChange(batchItems);
        },
        DEFAULT_GRID_CONFIG
    );

    // 드래그 중인 카드의 현재 위치 (절대 좌표)
    const [sortableDragPos, setSortableDragPos] = useState<{ x: number; y: number } | null>(null);

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    const getColumnByX = useCallback((x: number): Column | null => {
        if (sortedColumns.length === 0) return null;
        for (let i = 0; i < sortedColumns.length; i++) {
            const columnStartX = COLUMN_START_X + i * (COLUMN_WIDTH + COLUMN_GAP);
            const columnEndX = columnStartX + COLUMN_WIDTH;
            if (x >= columnStartX && x < columnEndX) {
                return sortedColumns[i];
            }
        }
        if (x < COLUMN_START_X) return sortedColumns[0];
        return sortedColumns[sortedColumns.length - 1];
    }, [sortedColumns]);

    const getConnectionById = useCallback((id: number) => connections.find(c => c.id === id), [connections]);

    const resetBoardMenuState = useCallback(() => {
        setIsCreatingBoard(false);
        setNewBoardName('');
        setEditingBoardId(null);
    }, []);

    useEffect(() => {
        if (!showBoardMenu) resetBoardMenuState();
    }, [showBoardMenu, resetBoardMenuState]);

    // ============================================
    // 연결선(Connection) 관련 유틸리티 함수들
    // ============================================

    // Handle 위치에 따른 연결점 좌표 계산
    const getConnectionPoint = useCallback((
        rect: DOMRect,
        containerRect: DOMRect,
        scrollLeft: number,
        scrollTop: number,
        handle: 'left' | 'right' | undefined
    ) => {
        const plane = planeRef.current!.getBoundingClientRect();
        const offsetX = -plane.left;
        const offsetY = -plane.top;

        if (handle === 'left') {
            return { x: (rect.left + offsetX) / zoomRef.current, y: (rect.top + rect.height / 2 + offsetY) / zoomRef.current };
        }
        // 'right' 또는 기본값
        return { x: (rect.right + offsetX) / zoomRef.current, y: (rect.top + rect.height / 2 + offsetY) / zoomRef.current };
    }, []);

    // 화살표 SVG 경로 계산 (targetHandle 방향에 따라)
    const getArrowPath = useCallback((endX: number, endY: number, handle: 'left' | 'right' | undefined) => {
        const size = 8;
        if (handle === 'right') {
            // 오른쪽에서 들어오는 화살표 (← 방향)
            return `M ${endX} ${endY} L ${endX - size} ${endY - size/2} L ${endX - size} ${endY + size/2} Z`;
        }
        // 'left' 또는 기본값: 왼쪽에서 들어오는 화살표 (→ 방향)
        return `M ${endX} ${endY} L ${endX + size} ${endY - size/2} L ${endX + size} ${endY + size/2} Z`;
    }, []);

    // Bezier 곡선 경로 계산
    const getBezierPath = useCallback((
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        sourceHandle: 'left' | 'right' | undefined,
        targetHandle: 'left' | 'right' | undefined
    ) => {
        const dist = Math.abs(endX - startX);
        const offset = Math.max(dist * 0.5, 50);

        // sourceHandle에 따라 제어점1 방향 결정
        const cp1x = sourceHandle === 'left' ? startX - offset : startX + offset;
        const cp1y = startY;

        // targetHandle에 따라 제어점2 방향 결정
        const cp2x = targetHandle === 'right' ? endX + offset : endX - offset;
        const cp2y = endY;

        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    }, []);

    // 직선 경로 계산
    const getStraightPath = useCallback((startX: number, startY: number, endX: number, endY: number) => {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }, []);

    // ============================================
    // 연결선 렌더링
    // ============================================

    const updateConnections = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newLines: React.ReactElement[] = [];
        setSvgSize({ width: Math.max(2000, boardBounds.right + 400), height: Math.max(2000, boardBounds.bottom + 400) });

        connections.forEach((conn) => {
            // 재연결 드래그 중인 연결선은 별도 처리
            if (connectionReconnect?.connectionId === conn.id) {
                const fixedEl = document.getElementById(`task-${connectionReconnect.fixedCardId}`);
                if (fixedEl) {
                    const fixedRect = fixedEl.getBoundingClientRect();
                    const fixedPoint = getConnectionPoint(fixedRect, containerRect, container.scrollLeft, container.scrollTop, connectionReconnect.fixedHandle);

                    let startX: number, startY: number, endX: number, endY: number;
                    let sourceHandle: 'left' | 'right', targetHandle: 'left' | 'right';

                    if (connectionReconnect.draggingEnd === 'source') {
                        // source를 드래그 중 -> fixed는 target
                        startX = connectionReconnect.currX;
                        startY = connectionReconnect.currY;
                        endX = fixedPoint.x;
                        endY = fixedPoint.y;
                        sourceHandle = 'right'; // 드래그 중 기본값
                        targetHandle = connectionReconnect.fixedHandle;
                    } else {
                        // target을 드래그 중 -> fixed는 source
                        startX = fixedPoint.x;
                        startY = fixedPoint.y;
                        endX = connectionReconnect.currX;
                        endY = connectionReconnect.currY;
                        sourceHandle = connectionReconnect.fixedHandle;
                        targetHandle = 'left'; // 드래그 중 기본값
                    }

                    const pathString = conn.shape === 'straight'
                        ? getStraightPath(startX, startY, endX, endY)
                        : getBezierPath(startX, startY, endX, endY, sourceHandle, targetHandle);

                    newLines.push(
                        <g key={conn.id}>
                            <path d={pathString} fill="none" stroke="#0a84ff" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" />
                            <circle cx={connectionReconnect.currX} cy={connectionReconnect.currY} r="6" fill="#0a84ff" className="animate-pulse" />
                            <circle cx={fixedPoint.x} cy={fixedPoint.y} r="4" fill="#0a84ff" />
                        </g>
                    );
                }
                return;
            }

            const fromEl = document.getElementById(`task-${conn.from}`);
            const toEl = document.getElementById(`task-${conn.to}`);
            if (fromEl && toEl) {
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();

                const sourceHandle = conn.sourceHandle || 'right';
                const targetHandle = conn.targetHandle || 'left';

                const startPoint = getConnectionPoint(fromRect, containerRect, container.scrollLeft, container.scrollTop, sourceHandle);
                const endPoint = getConnectionPoint(toRect, containerRect, container.scrollLeft, container.scrollTop, targetHandle);

                const { x: startX, y: startY } = startPoint;
                const { x: endX, y: endY } = endPoint;

                // 직선 또는 곡선 경로 생성
                const pathString = conn.shape === 'straight'
                    ? getStraightPath(startX, startY, endX, endY)
                    : getBezierPath(startX, startY, endX, endY, sourceHandle, targetHandle);

                const isSelected = activeMenu?.id === conn.id;
                const lineColor = isSelected || hoveredEndpoint?.connectionId === conn.id ? '#3b82f6' : '#808080';

                newLines.push(
                    <g key={conn.id}>
                        <defs>
                            {/* auto는 직선의 기울기 및 곡선의 마지막 접선 방향을 모두 반영합니다. */}
                            <marker id={`connection-arrow-${conn.id}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
                                <path d="M 0 0 L 10 5 L 0 10 Z" fill={lineColor} />
                            </marker>
                        </defs>
                        {/* 투명한 넓은 히트 영역 - 드래그 및 컨텍스트 메뉴용 */}
                        <path
                            d={pathString}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="20"
                            strokeLinecap="round"
                            className="cursor-grab pointer-events-auto"
                            onPointerMove={(evt) => {
                                const distToStart = Math.hypot(
                                    evt.clientX - (fromRect.left + (sourceHandle === 'left' ? 0 : fromRect.width)),
                                    evt.clientY - (fromRect.top + fromRect.height / 2)
                                );
                                const distToEnd = Math.hypot(
                                    evt.clientX - (toRect.left + (targetHandle === 'left' ? 0 : toRect.width)),
                                    evt.clientY - (toRect.top + toRect.height / 2)
                                );

                                if (distToStart < distToEnd) {
                                    setHoveredEndpoint({ connectionId: conn.id, endpoint: 'source', x: startX, y: startY });
                                } else {
                                    setHoveredEndpoint({ connectionId: conn.id, endpoint: 'target', x: endX, y: endY });
                                }
                            }}
                            onPointerLeave={() => setHoveredEndpoint(null)}
                            onPointerDown={(evt) => {
                                evt.stopPropagation();
                                if (evt.button !== 0) return;
                                setHoveredEndpoint(null);

                                // 마우스 위치와 가까운 끝점 계산
                                const distToStart = Math.hypot(
                                    evt.clientX - (fromRect.left + (sourceHandle === 'left' ? 0 : fromRect.width)),
                                    evt.clientY - (fromRect.top + fromRect.height / 2)
                                );
                                const distToEnd = Math.hypot(
                                    evt.clientX - (toRect.left + (targetHandle === 'left' ? 0 : toRect.width)),
                                    evt.clientY - (toRect.top + toRect.height / 2)
                                );

                                if (distToStart < distToEnd) {
                                    handleConnectionEndpointDragStart(evt, conn, 'source', startX, startY);
                                } else {
                                    handleConnectionEndpointDragStart(evt, conn, 'target', endX, endY);
                                }
                            }}
                            onDoubleClick={(evt) => {
                                evt.stopPropagation();
                                const rect = container.getBoundingClientRect();
                                setConnectionError('');
                                setActiveMenu({ id: conn.id, ...worldPoint(Math.max(rect.left + 8, Math.min(evt.clientX, rect.right - 232 * zoomRef.current)), Math.max(rect.top + 8, Math.min(evt.clientY, rect.bottom - 290 * zoomRef.current))) });
                                setBackgroundMenu(null);
                            }}
                            onContextMenu={(evt) => {
                                evt.preventDefault();
                                evt.stopPropagation();
                                const rect = container.getBoundingClientRect();
                                setConnectionError('');
                                setActiveMenu({ id: conn.id, ...worldPoint(Math.max(rect.left + 8, Math.min(evt.clientX, rect.right - 232 * zoomRef.current)), Math.max(rect.top + 8, Math.min(evt.clientY, rect.bottom - 290 * zoomRef.current))) });
                                setBackgroundMenu(null);
                            }}
                        />
                        {/* 실제 보이는 연결선 */}
                        <path
                            d={pathString}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={conn.style === 'dashed' ? "8,4" : "none"}
                            markerEnd={conn.style === 'arrow' ? `url(#connection-arrow-${conn.id})` : undefined}
                            className="pointer-events-none transition-colors duration-150"
                        />

                        {/* Source 끝점 - 기본 상태 */}
                        <circle
                            cx={startX}
                            cy={startY}
                            r="3"
                            fill="rgba(128,128,128,0.5)"
                            className="pointer-events-none"
                        />

                        {/* 실선·점선에는 화살촉을 붙이지 않고 화살표선에만 markerEnd를 표시합니다. */}
                    </g>
                );
            }
        });

        // 드래그 중인 연결선 (draft - 새 연결 생성용)
        if (connectionDraft) {
            const pathString = getBezierPath(
                connectionDraft.startX,
                connectionDraft.startY,
                connectionDraft.currX,
                connectionDraft.currY,
                connectionDraft.sourceHandle,
                'left' // 드래그 중에는 기본값 left
            );
            newLines.push(
                <g key="draft">
                    <path d={pathString} fill="none" stroke="#0a84ff" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" />
                    <circle cx={connectionDraft.currX} cy={connectionDraft.currY} r="4" fill="#0a84ff" />
                </g>
            );
        }

        setLines(newLines);
    }, [connections, connectionDraft, connectionReconnect, activeMenu, getConnectionPoint, getArrowPath, getBezierPath, getStraightPath, hoveredEndpoint, boardBounds.right, boardBounds.bottom, worldPoint]);

    useLayoutEffect(() => {
        updateConnections();
        const handleResize = () => updateConnections();
        window.addEventListener('resize', handleResize);
        let animationFrameId: number;
        const loop = () => { updateConnections(); animationFrameId = requestAnimationFrame(loop); };
        loop();
        return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); };
    }, [updateConnections]);

    // ============================================
    // [최적화] 새 카드 생성 핸들러
    // tasksRef를 사용하여 tasks 의존성 제거 → 불필요한 함수 재생성 방지
    // ============================================
    const handleCreateNewTask = useCallback(async (x: number, y: number) => {
        if (isCreatingTask) return;
        // 카드 생성 시 자동으로 그룹에 귀속시키지 않음 (자유 배치)
        const newTaskData: Partial<Task> = {
            title: "새로운 카드",
            status: "todo",
            x, y,
            tags: [],
            boardId: activeBoardId,
            column_id: undefined,  // undefined = 자유 배치 (그룹에 귀속 안 함)
        };

        if (onTaskCreate) {
            setIsCreatingTask(true);
            const tempTask: Task = { ...newTaskData, id: Date.now(), status: 'todo', x, y, boardId: activeBoardId } as Task;
            // [최적화] tasksRef.current 사용
            onTasksUpdate([...tasksRef.current, tempTask]);
            try {
                const savedTask = await onTaskCreate(newTaskData);
                onTasksUpdate(tasksRef.current.filter(t => t.id !== tempTask.id).concat(savedTask));
                onTaskSelect(savedTask);
            } catch {
                onTasksUpdate(tasksRef.current.filter(t => t.id !== tempTask.id));
            } finally {
                setIsCreatingTask(false);
            }
        } else {
            const newTask: Task = { ...newTaskData, id: Date.now(), status: 'todo', x, y, boardId: activeBoardId } as Task;
            // [최적화] tasksRef.current 사용
            onTasksUpdate([...tasksRef.current, newTask]);
            onTaskSelect(newTask);
        }
    }, [isCreatingTask, onTaskCreate, onTasksUpdate, activeBoardId, onTaskSelect]); // [최적화] tasks 의존성 제거

    // ============================================
    // [최적화] 선택된 카드 삭제 핸들러
    // tasksRef, connectionsRef를 사용하여 의존성 제거 → 불필요한 함수 재생성 방지
    // ============================================
    const handleDeleteSelectedTasks = useCallback(async () => {
        if (selectedTaskIds.size === 0 || isDeletingTask) return;
        const idsToDelete = Array.from(selectedTaskIds);
        setIsDeletingTask(true);
        // [최적화] tasksRef.current 사용
        const previousTasks = [...tasksRef.current];
        onTasksUpdate(tasksRef.current.filter(t => !selectedTaskIds.has(t.id)));
        // [최적화] connectionsRef.current 사용
        idsToDelete.forEach(id => {
            connectionsRef.current.filter(c => c.from === id || c.to === id).forEach(c => onConnectionDelete(c.id));
        });
        setSelectedTaskIds(new Set());
        try {
            await Promise.all(idsToDelete.map(async (id) => {
                try {
                    if (onTaskDelete) await onTaskDelete(id);
                    else await deleteTask(id);
                } catch {
                    // 개별 삭제 실패는 무시
                }
            }));
        } catch {
            onTasksUpdate(previousTasks);
        } finally {
            setIsDeletingTask(false);
            setBackgroundMenu(null);
        }
    }, [selectedTaskIds, isDeletingTask, onTasksUpdate, onConnectionDelete, onTaskDelete]); // [최적화] tasks, connections 의존성 제거

    useEffect(() => {
        const handleKeyDown = async (evt: KeyboardEvent) => {
            // 입력 필드에 포커스가 있으면 단축키 무시
            const target = evt.target as HTMLElement;
            if (
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLInputElement ||
                target.isContentEditable
            ) return;

            const key = evt.key.toLowerCase();
            if (key === 'c' && selectedTaskIds.size > 0) {
                evt.preventDefault();
                // [최적화] tasksRef.current 사용
                const selectedTasks = tasksRef.current.filter(t => selectedTaskIds.has(t.id));
                if (selectedTasks.length === 0) return;

                // =========================================
                // 구조적 개편: 중앙화된 레이아웃 계산 사용
                // =========================================

                // 1. 그룹 생성 레이아웃 계산 (크기 + 카드 위치)
                const layoutResult = calculateGroupCreation(
                    selectedTasks.map(t => ({ id: t.id, x: t.x, y: t.y })),
                    gridConfig
                );

                // 2. 새 그룹 생성 (임시 ID)
                const tempGroupId = Date.now();
                const newGroup: Group = {
                    id: tempGroupId,
                    title: 'Group',
                    x: layoutResult.group.x,
                    y: layoutResult.group.y,
                    width: layoutResult.group.width,
                    height: layoutResult.group.height,
                    projectId: activeBoardId,
                    parentId: null,
                    depth: 0,
                };

                // 3. 카드들의 column_id 및 좌표를 그리드 레이아웃에 맞게 업데이트 (UI 즉시 반영)
                const cardPositionMap = new Map(
                    layoutResult.cardPositions.map(cp => [cp.taskId, { x: cp.x, y: cp.y }])
                );

                // [최적화] tasksRef.current 사용
                const updatedTasks = tasksRef.current.map(t => {
                    if (selectedTaskIds.has(t.id)) {
                        const newPos = cardPositionMap.get(t.id);
                        return {
                            ...t,
                            column_id: tempGroupId, // 임시 ID로 먼저 설정
                            x: newPos?.x ?? t.x,
                            y: newPos?.y ?? t.y,
                        };
                    }
                    return t;
                });
                onTasksUpdate(updatedTasks);

                // 🔧 [FIX] 그룹 생성 완료 대기 후 실제 ID로 Batch API 호출
                try {
                    const idMapping = await onGroupsUpdate([...groups, newGroup]);
                    const realGroupId = idMapping.get(tempGroupId) ?? tempGroupId;

                    if (isDev) console.log(`[BoardCanvas] 그룹 생성 완료: 임시 ID ${tempGroupId} → 실제 ID ${realGroupId}`);

                    // 4. Batch API로 카드 위치 동기화 (실제 ID 사용)
                    const batchItems: BatchChangeItem[] = layoutResult.cardPositions.map(cp => {
                        const originalTask = selectedTasks.find(t => t.id === cp.taskId);
                        return {
                            entityId: cp.taskId,
                            payload: {
                                taskId: cp.taskId,
                                x: cp.x,
                                y: cp.y,
                                column_id: realGroupId, // 🔧 실제 ID 사용
                            },
                            snapshot: {
                                x: originalTask?.x ?? 0,
                                y: originalTask?.y ?? 0,
                                column_id: originalTask?.column_id,
                            },
                        };
                    });

                    if (batchItems.length > 0) {
                        if (isDev) console.log('[BoardCanvas] 그룹 생성 - Batch 큐 추가, 카드 수:', batchItems.length, '실제 column_id:', realGroupId);
                        queueBatchCardChange(batchItems);
                    }
                } catch (err) {
                    console.error('[BoardCanvas] 그룹 생성 실패:', err);
                }

                setSelectedTaskIds(new Set());
            }
            if (key === 'n') {
                evt.preventDefault();
                handleCreateNewTask(mousePosRef.current.x - 140, mousePosRef.current.y - 40);
            }
            if ((key === 'delete' || key === 'backspace') && selectedTaskIds.size > 0) {
                evt.preventDefault();
                handleDeleteSelectedTasks();
            }
            if (key === 'escape') {
                // ESC로 드래그 취소
                // [Race Condition Guard] 드래그 중인 엔티티들 Lock 해제
                if (dragContext) {
                    unlockEntity(dragContext.taskId);
                }
                if (freeDragState) {
                    unlockEntity(freeDragState.id);
                }
                if (groupDragState) {
                    unlockEntity(groupDragState.id);
                    unlockEntities(groupDragState.containedTaskIds.map(t => t.id));
                }

                cancelDrag();
                setFreeDragState(null);
                setGroupDragState(null);
                setConnectionDraft(null);
                cancelConnectionReconnect();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTaskIds, activeBoardId, groups, onGroupsUpdate, onTasksUpdate, cancelDrag, gridConfig, queueBatchCardChange, handleCreateNewTask, handleDeleteSelectedTasks, dragContext, freeDragState, groupDragState, unlockEntity, unlockEntities]); // [최적화] tasks 의존성 제거 (tasksRef 사용)

    useEffect(() => {
        const handleClickOutside = (evt: MouseEvent) => {
            setActiveMenu(null);
            setBackgroundMenu(null);
            if (editingGroupId) setEditingGroupId(null);
            if (boardSelectorRef.current && !boardSelectorRef.current.contains(evt.target as Node)) {
                setShowBoardMenu(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [editingGroupId]);

    // Optimistic UI: 카드 위치 저장 (큐에 등록, 즉시 반환)
    const saveTaskPosition = useCallback((taskId: number, newX: number, newY: number, snapshot: CardPositionSnapshot) => {
        if (!onTaskUpdate) {
            if (isDev) console.warn('[Optimistic] saveTaskPosition: onTaskUpdate가 없음');
            return;
        }

        if (isDev) console.log('[Optimistic] saveTaskPosition 큐 등록:', { taskId, newX, newY });

        // API 호출을 큐에 등록
        queueCardChange(
            'card-position',
            taskId,
            { taskId, x: newX, y: newY },
            snapshot,
            async (payload) => {
                if (isDev) console.log('[Optimistic] saveTaskPosition API 호출:', payload);
                await onTaskUpdate(payload.taskId, { x: payload.x, y: payload.y });
                if (isDev) console.log('[Optimistic] saveTaskPosition API 완료:', payload.taskId);
            }
        );
    }, [onTaskUpdate, queueCardChange, isDev]);

    const handleDeleteTask = async (taskId: number) => {
        if (isDeletingTask) return;
        setIsDeletingTask(true);
        try {
            if (onTaskDelete) await onTaskDelete(taskId);
            else {
                await deleteTask(taskId);
                onTasksUpdate(tasks.filter(t => t.id !== taskId));
            }
        } finally {
            setIsDeletingTask(false);
            setBackgroundMenu(null);
        }
    };

    // 카드 드래그 시작 핸들러 (그룹 내 카드용 - SortableGrid 사용)
    const handleSortableCardDragStart = useCallback((taskId: number, e: React.PointerEvent) => {
        // 우클릭은 무시 (팬 전용)
        if (e.button === 2) return;

        const cardEl = document.getElementById(`task-${taskId}`);
        if (!cardEl) return;

        const cardRect = cardEl.getBoundingClientRect();

        // 즉시 드래그 시작하지 않고 pending 상태로 저장
        setPendingCardDrag({
            taskId,
            startX: e.clientX,
            startY: e.clientY,
            cardRect
        });

        // PointerCapture 설정
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    // pending 드래그를 실제 드래그로 전환
    const activatePendingDrag = useCallback((clientX: number, clientY: number) => {
        if (!pendingCardDrag || !containerRef.current) return;

        const { taskId, cardRect } = pendingCardDrag;

        // [Race Condition Guard] 카드 Lock
        lockEntity(taskId);

        const scale = zoomRef.current;
        startDrag(taskId, pendingCardDrag.startX / scale, pendingCardDrag.startY / scale, new DOMRect(cardRect.x / scale, cardRect.y / scale, cardRect.width / scale, cardRect.height / scale));

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        setSortableDragPos(worldPoint(cardRect.left, cardRect.top));

        setPendingCardDrag(null);
    }, [pendingCardDrag, startDrag, lockEntity]);

    // 그룹 또는 자유 카드 드래그 시작
    const handlePointerDown = (e: React.PointerEvent, task?: Task, group?: Group) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const { x, y } = worldPoint(e.clientX, e.clientY);

        // 우클릭 팬 시작
        if (e.button === 2) {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setPanState({
                startX: e.clientX,
                startY: e.clientY,
                scrollStartX: container.scrollLeft,
                scrollStartY: container.scrollTop,
                hasMoved: false,
                target: getBoardMenuTarget(e.target as Element)
            });
            setActiveMenu(null);
            setBackgroundMenu(null);
            return;
        }

        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            setSelectionBox({ startX: x, startY: y, currX: x, currY: y });
            return;
        }

        if (group) {
            // =========================================
            // 이벤트 위임 명확화: 카드 클릭 시 그룹 드래그 방지
            // event.target이 카드(TaskCard) 또는 그 내부 요소인지 체크
            // =========================================
            const targetEl = e.target as HTMLElement;
            const isCardClick = targetEl.closest('[id^="task-"]');
            if (isCardClick) {
                // 카드 클릭이면 그룹 드래그 무시 - 카드의 onPointerDown이 처리
                return;
            }

            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

            // [FIX] tasksRef.current 사용 - props의 tasks는 stale할 수 있음
            const currentTasks = tasksRef.current;
            const containedTasks = currentTasks
                .filter(t => t.column_id === group.id)
                .map(t => ({ id: t.id, initialX: t.x || 0, initialY: t.y || 0 }));

            const containedChildGroups = groups
                .filter(g => g.parentId === group.id)
                .map(g => ({ id: g.id, initialX: g.x, initialY: g.y }));

            // [Race Condition Guard] 그룹 및 포함된 카드들 Lock
            const childCardIds = containedTasks.map(t => t.id);
            if (isDev) console.log(`[Guard] 🔒 Group drag start - Group ID: ${group.id}, Child cards: [${childCardIds.join(', ')}]`);

            lockEntity(group.id);
            if (childCardIds.length > 0) {
                lockEntities(childCardIds);
            }

            setGroupDragState({
                id: group.id,
                startX: e.clientX,
                startY: e.clientY,
                initialGroupX: group.x,
                initialGroupY: group.y,
                containedTaskIds: containedTasks,
                containedChildGroups: containedChildGroups
            });
            setActiveMenu(null);
            setBackgroundMenu(null);
            return;
        }

        if (task) {
            // 그룹에 속한 카드면 SortableGrid 사용
            if (task.column_id && groups.some(g => g.id === task.column_id)) {
                handleSortableCardDragStart(task.id, e);
                e.stopPropagation();
                return;
            }

            // 자유 배치 카드
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

            // [Race Condition Guard] 카드 Lock
            lockEntity(task.id);

            setFreeDragState({ id: task.id, startX: e.clientX, startY: e.clientY, initialTaskX: task.x || 0, initialTaskY: task.y || 0 });
            e.stopPropagation();
            setActiveMenu(null);
            setBackgroundMenu(null);
        }
        setActiveMenu(null);
        setBackgroundMenu(null);
    };

    const handleConnectStart = (taskId: number, e: React.PointerEvent, handle: 'left' | 'right') => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const { x, y } = worldPoint(e.clientX, e.clientY);
        setConnectionDraft({ fromId: taskId, startX: x, startY: y, currX: x, currY: y, sourceHandle: handle });
        setActiveMenu(null);
        setBackgroundMenu(null);
    };

    const handleConnectEnd = (targetId: number, handle: 'left' | 'right') => {
        if (connectionDraft && connectionDraft.fromId !== targetId) {
            onConnectionCreate(connectionDraft.fromId, targetId, connectionDraft.sourceHandle, handle);
        }
        setConnectionDraft(null);

        // 연결선 재연결 드래그 종료 처리
        if (connectionReconnect) {
            handleConnectionReconnectEnd(targetId, handle);
        }
    };

    // 연결선 끝점 드래그 시작 (선 위에서 드래그 시작 시 가까운 끝점 감지)
    const handleConnectionEndpointDragStart = (
        evt: React.PointerEvent<SVGElement>,
        conn: Connection,
        endpoint: 'source' | 'target',
        x: number,
        y: number
    ) => {
        evt.stopPropagation();
        evt.preventDefault();

        const sourceHandle = conn.sourceHandle || 'right';
        const targetHandle = conn.targetHandle || 'left';

        if (endpoint === 'source') {
            // source 끝점 드래그 -> target이 고정
            setConnectionReconnect({
                connectionId: conn.id,
                draggingEnd: 'source',
                fixedCardId: conn.to,
                fixedHandle: targetHandle,
                originalCardId: conn.from,
                originalHandle: sourceHandle,
                currX: x,
                currY: y,
            });
        } else {
            // target 끝점 드래그 -> source가 고정
            setConnectionReconnect({
                connectionId: conn.id,
                draggingEnd: 'target',
                fixedCardId: conn.from,
                fixedHandle: sourceHandle,
                originalCardId: conn.to,
                originalHandle: targetHandle,
                currX: x,
                currY: y,
            });
        }

        setActiveMenu(null);
        setBackgroundMenu(null);
    };

    // 연결선 재연결 드래그 종료 처리 (Optimistic: await 없음)
    const handleConnectionReconnectEnd = async (targetCardId: number, targetHandle: 'left' | 'right') => {
        if (!connectionReconnect) return;

        // 같은 카드에 재연결하는 것은 무시 (자기 자신에게 연결 불가)
        if (targetCardId === connectionReconnect.fixedCardId) {
            setConnectionReconnect(null);
            return;
        }

        // 원래 카드와 같은 곳에 드롭하면 원상 복구
        if (targetCardId === connectionReconnect.originalCardId && targetHandle === connectionReconnect.originalHandle) {
            setConnectionReconnect(null);
            return;
        }

        // Optimistic: 비동기 대기 없이 호출 (상위 컴포넌트에서 상태 관리)
        try { if (connectionReconnect.draggingEnd === 'source') {
            // source를 새 카드로 변경
            await onConnectionUpdate(connectionReconnect.connectionId, {
                from: targetCardId,
                sourceHandle: targetHandle,
            });
        } else {
            // target을 새 카드로 변경
            await onConnectionUpdate(connectionReconnect.connectionId, {
                to: targetCardId,
                targetHandle: targetHandle,
            });
        } } catch {
            window.alert('연결 변경을 저장하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            setConnectionReconnect(null);
        }
    };

    // 연결선 재연결 드래그 취소 (허공에 드롭)
    const cancelConnectionReconnect = () => {
        setConnectionReconnect(null);
    };

    // 라이브 커서 throttle ref
    const lastCursorSendRef = useRef(0);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const { x, y } = worldPoint(e.clientX, e.clientY);
        mousePosRef.current = { x, y };

        // 라이브 커서 전송 (50ms throttle)
        if (onCursorMove) {
            const now = Date.now();
            if (now - lastCursorSendRef.current >= 50) {
                lastCursorSendRef.current = now;
                onCursorMove(x, y);
            }
        }

        // 우클릭 팬 처리
        if (panState) {
            const deltaX = e.clientX - panState.startX;
            const deltaY = e.clientY - panState.startY;
            const moveThreshold = 5;

            // 일정 거리 이상 이동 시 팬 모드 확정
            if (!panState.hasMoved && (Math.abs(deltaX) > moveThreshold || Math.abs(deltaY) > moveThreshold)) {
                setPanState(prev => prev ? { ...prev, hasMoved: true } : null);
            }

            // 스크롤 적용 (반대 방향으로 이동해야 자연스러움)
            container.scrollLeft = panState.scrollStartX - deltaX;
            container.scrollTop = panState.scrollStartY - deltaY;
            return;
        }

        // 카드 드래그 pending 상태 체크 (threshold 적용)
        if (pendingCardDrag) {
            const deltaX = e.clientX - pendingCardDrag.startX;
            const deltaY = e.clientY - pendingCardDrag.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance >= DRAG_THRESHOLD) {
                // threshold 초과 시 실제 드래그 시작
                activatePendingDrag(e.clientX, e.clientY);
            }
            return;
        }

        // SortableGrid 드래그 중
        if (dragContext) {
            const newPos = updateDrag(e.clientX / zoomRef.current, e.clientY / zoomRef.current, -planeRef.current!.getBoundingClientRect().left / zoomRef.current, -planeRef.current!.getBoundingClientRect().top / zoomRef.current);
            setSortableDragPos(newPos);
            return;
        }

        if (selectionBox) {
            setSelectionBox(prev => prev ? { ...prev, currX: x, currY: y } : null);
            const boxStartX = Math.min(selectionBox.startX, x);
            const boxStartY = Math.min(selectionBox.startY, y);
            const boxEndX = Math.max(selectionBox.startX, x);
            const boxEndY = Math.max(selectionBox.startY, y);
            const newSelectedIds = new Set<number>();

            // [FIX] cardPositions 사용하여 그룹 내 카드도 절대 좌표로 비교
            cardPositions.forEach(pos => {
                if (pos.taskId === -1 || pos.isPlaceholder) return; // 플레이스홀더 제외
                const tx = pos.x;
                const ty = pos.y;
                const size = cardSize(tasksRef.current.find(t => t.id === pos.taskId) ?? {});
                if (tx < boxEndX && tx + size.width > boxStartX &&
                    ty < boxEndY && ty + size.height > boxStartY) {
                    newSelectedIds.add(pos.taskId);
                }
            });
            setSelectedTaskIds(newSelectedIds);
        } else if (groupDragState) {
            // =========================================
            // 그룹 드래그 - 상대 좌표 시스템!
            // 카드는 그룹 내 상대 좌표를 저장하므로 그룹만 이동하면 됨
            // 카드의 x, y는 그룹 기준 offset이므로 업데이트 불필요
            // =========================================
            const deltaX = (e.clientX - groupDragState.startX) / zoomRef.current;
            const deltaY = (e.clientY - groupDragState.startY) / zoomRef.current;
            let newGroupX = groupDragState.initialGroupX + deltaX;
            let newGroupY = groupDragState.initialGroupY + deltaY;
            if (snapToGrid) {
                newGroupX = Math.round(newGroupX / 20) * 20;
                newGroupY = Math.round(newGroupY / 20) * 20;
            }

            const effectiveDeltaX = newGroupX - groupDragState.initialGroupX;
            const effectiveDeltaY = newGroupY - groupDragState.initialGroupY;

            // 그룹 위치만 업데이트 (카드는 상대 좌표이므로 업데이트 불필요)
            onGroupsUpdate(groups.map(g => {
                if (g.id === groupDragState.id) {
                    return { ...g, x: newGroupX, y: newGroupY };
                }
                // 자식 그룹들도 함께 이동
                const childGroup = groupDragState.containedChildGroups.find(cg => cg.id === g.id);
                if (childGroup) {
                    return { ...g, x: childGroup.initialX + effectiveDeltaX, y: childGroup.initialY + effectiveDeltaY };
                }
                return g;
            }));

            // [상대 좌표 시스템] 카드 좌표 업데이트 불필요!
            // 카드의 x, y는 그룹 내 상대 좌표이므로 그룹이 이동해도 변경하지 않음
            // 렌더링 시 group.x + card.x로 절대 좌표 계산
        } else if (freeDragState) {
            const deltaX = (e.clientX - freeDragState.startX) / zoomRef.current;
            const deltaY = (e.clientY - freeDragState.startY) / zoomRef.current;
            let newX = freeDragState.initialTaskX + deltaX;
            let newY = freeDragState.initialTaskY + deltaY;
            if (snapToGrid) {
                newX = Math.round(newX / 20) * 20;
                newY = Math.round(newY / 20) * 20;
            }
            // [FIX] tasksRef.current 사용 - props의 tasks는 stale할 수 있음
            onTasksUpdate(tasksRef.current.map(t => t.id === freeDragState.id ? { ...t, x: newX, y: newY } : t));

            // 자유 카드 드래그 시 그룹 하이라이트 + 드롭 프리뷰
            const size = cardSize(tasksRef.current.find(t => t.id === freeDragState.id) ?? {});
            const cardCenterX = newX + size.width / 2;
            const cardCenterY = newY + size.height / 2;
            let targetGroup: Group | null = null;
            for (const group of groups) {
                if (isPointInGroup(cardCenterX, cardCenterY, group)) {
                    targetGroup = group;
                    break;
                }
            }
            setFreeCardTargetGroupId(targetGroup?.id ?? null);
            setFreeCardPreview(
                targetGroup?.id ?? null,
                cardCenterX, cardCenterY,
                freeDragState.id
            );
        } else if (connectionDraft) {
            setConnectionDraft(prev => prev ? { ...prev, currX: x, currY: y } : null);
        } else if (connectionReconnect) {
            // 연결선 끝점 재연결 드래그 중
            setConnectionReconnect(prev => prev ? { ...prev, currX: x, currY: y } : null);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // 카드 드래그 pending 상태 해제 (threshold 미달 = 단순 클릭, 아무 동작 안 함)
        if (pendingCardDrag) {
            setPendingCardDrag(null);
            return;
        }

        // 우클릭 팬 종료
        if (panState) {
            const wasPanning = panState.hasMoved;
            rightClickPanned.current = wasPanning;
            setPanState(null);

            // 팬 동작이 없었으면 (제자리 우클릭) 컨텍스트 메뉴 표시
            if (!wasPanning && containerRef.current) {
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();
                const { x, y } = worldPoint(e.clientX, e.clientY);
                setBackgroundMenu({ x: worldPoint(Math.min(e.clientX, rect.right - 220 * zoomRef.current), e.clientY).x, y: worldPoint(e.clientX, Math.min(e.clientY, rect.bottom - 170 * zoomRef.current)).y, taskX: x, taskY: y, ...panState.target });
            }
            return;
        }

        // SortableGrid 드래그 종료 - 현재 드래그 위치 전달 (비동기 대기 없음)
        if (dragContext) {
            const cardId = dragContext.taskId;

            endDrag(sortableDragPos ?? undefined);
            setSortableDragPos(null);

            // flush 없이 즉시 unlock — debounce가 자동으로 sync하고,
            // self-echo 필터가 서버 응답의 롤백을 방지함
            unlockEntity(cardId);
            if (isDev) console.log('[Guard] Sortable card drag complete - Lock released immediately');
            return;
        }

        if (selectionBox) setSelectionBox(null);
        if (freeDragState) {
            const task = tasksRef.current.find(t => t.id === freeDragState.id);
            if (task && (task.x !== freeDragState.initialTaskX || task.y !== freeDragState.initialTaskY) && task.x !== undefined && task.y !== undefined) {
                // 롤백용 스냅샷
                const snapshot: CardPositionSnapshot = {
                    x: freeDragState.initialTaskX,
                    y: freeDragState.initialTaskY,
                    column_id: task.column_id,
                };

                // 자유 배치 카드가 그룹 안에 드롭되면 column_id 설정
                const cardCenterX = task.x + cardSize(task).width / 2;
                const cardCenterY = task.y + cardSize(task).height / 2;
                let targetGroup: Group | null = null;
                for (const g of groups) {
                    if (isPointInGroup(cardCenterX, cardCenterY, g)) {
                        targetGroup = g;
                        break;
                    }
                }

                if (targetGroup) {
                    const gridConfig = groupGrid(tasksRef.current.filter(t => t.column_id === targetGroup.id || t.id === task.id));
                    // =========================================
                    // 자유 카드 → 그룹 드롭: 드롭 위치 기반 삽입
                    // 카드 사이에 넣거나, 가장자리면 맨 끝에 배치
                    // =========================================
                    const groupCards = tasks
                        .filter(t => t.column_id === targetGroup.id && t.id !== task.id)
                        .sort((a, b) => {
                            const yA = a.y ?? 0; const yB = b.y ?? 0;
                            if (yA !== yB) return yA - yB;
                            return (a.x ?? 0) - (b.x ?? 0);
                        });

                    // 드롭 위치로 삽입 인덱스 계산
                    const dropIndex = absolutePositionToIndex(
                        cardCenterX, cardCenterY,
                        targetGroup.x, targetGroup.y,
                        groupCards.length,
                        gridConfig
                    );

                    // 새 순서 배열 생성
                    const newOrder = [...groupCards];
                    newOrder.splice(dropIndex, 0, task);

                    // 모든 카드의 상대 좌표 재계산
                    const positionMap = new Map<number, { x: number; y: number }>();
                    for (let i = 0; i < newOrder.length; i++) {
                        positionMap.set(newOrder[i].id, indexToRelativePosition(i, gridConfig));
                    }

                    // Batch 업데이트 수집
                    const batchUpdates: Array<{ id: number; x: number; y: number; column_id: number | null }> = [];

                    const updatedTasks = tasks.map(t => {
                        const newPos = positionMap.get(t.id);
                        if (newPos) {
                            const changed = t.id === task.id || t.x !== newPos.x || t.y !== newPos.y;
                            if (changed) {
                                batchUpdates.push({ id: t.id, x: newPos.x, y: newPos.y, column_id: targetGroup.id });
                            }
                            return { ...t, column_id: targetGroup.id, x: newPos.x, y: newPos.y };
                        }
                        return t;
                    });

                    onTasksUpdate(updatedTasks);

                    // Batch API 동기화
                    const batchItems: BatchChangeItem[] = batchUpdates.map(u => ({
                        entityId: u.id,
                        payload: { taskId: u.id, x: u.x, y: u.y, column_id: u.column_id },
                        snapshot: u.id === task.id
                            ? snapshot
                            : { x: tasks.find(t => t.id === u.id)?.x ?? 0, y: tasks.find(t => t.id === u.id)?.y ?? 0, column_id: tasks.find(t => t.id === u.id)?.column_id },
                    }));
                    if (batchItems.length > 0) {
                        queueBatchCardChange(batchItems);
                    }
                } else {
                    // 그룹 밖에 드롭됨 - 절대 좌표로 저장 (Optimistic)
                    saveTaskPosition(freeDragState.id, task.x, task.y, snapshot);
                }
            }

            // flush 없이 즉시 unlock — debounce가 자동으로 sync하고,
            // self-echo 필터가 서버 응답의 롤백을 방지함
            const cardId = freeDragState.id;
            setFreeDragState(null);
            setFreeCardTargetGroupId(null);
            setFreeCardPreview(null); // 드롭 프리뷰 초기화

            unlockEntity(cardId);
            if (isDev) console.log('[Guard] Free card drag complete - Lock released immediately');
        }
        if (groupDragState) {
            const draggedGroup = groups.find(g => g.id === groupDragState.id);
            if (draggedGroup) {
                // 롤백용 스냅샷 (드래그 시작 전 위치)
                const groupSnapshot: GroupPositionSnapshot = {
                    x: groupDragState.initialGroupX,
                    y: groupDragState.initialGroupY,
                };

                // 그룹이 다른 그룹 안에 드롭되면 parent_id 설정
                // 단, 자신의 자식 그룹 안에는 들어갈 수 없음 (순환 참조 방지)
                const isDescendant = (parentId: number | null | undefined, targetId: number): boolean => {
                    let current = parentId;
                    while (current !== null && current !== undefined) {
                        if (current === targetId) return true;
                        const parentGroup = groups.find(g => g.id === current);
                        current = parentGroup?.parentId;
                    }
                    return false;
                };

                const targetGroup = groups.find(g => {
                    if (g.id === groupDragState.id) return false;
                    if (g.parentId === groupDragState.id) return false;
                    // 순환 참조 방지: 드래그 중인 그룹의 자손 그룹 안에는 들어갈 수 없음
                    if (isDescendant(g.parentId, groupDragState.id)) return false;

                    const centerX = draggedGroup.x + draggedGroup.width / 2;
                    const centerY = draggedGroup.y + draggedGroup.height / 2;
                    return (
                        centerX >= g.x &&
                        centerX <= g.x + g.width &&
                        centerY >= g.y &&
                        centerY <= g.y + g.height
                    );
                });

                if (targetGroup) {
                    const newDepth = (targetGroup.depth ?? 0) + 1;
                    onGroupsUpdate(groups.map(g => {
                        if (g.id === groupDragState.id) {
                            return { ...g, parentId: targetGroup.id, depth: newDepth };
                        }
                        return g;
                    }));
                } else {
                    // 그룹 밖으로 이동 - parent_id를 null로
                    if (draggedGroup.parentId) {
                        onGroupsUpdate(groups.map(g => {
                            if (g.id === groupDragState.id) {
                                return { ...g, parentId: null, depth: 0 };
                            }
                            return g;
                        }));
                    }
                }

                // Optimistic UI: 그룹 위치 저장 (큐에 등록, 비동기 대기 없음)
                if (onGroupMove) {
                    queueGroupChange(
                        'group-position',
                        groupDragState.id,
                        { groupId: groupDragState.id, x: draggedGroup.x, y: draggedGroup.y },
                        groupSnapshot,
                        async (payload) => {
                            await onGroupMove(payload.groupId, payload.x, payload.y);
                        }
                    );
                }

                // [상대 좌표 시스템] 카드 위치 저장 불필요!
                // 카드의 x, y는 그룹 내 상대 좌표이므로 그룹 이동 시 변경되지 않음
                // 그룹 위치만 저장하면 됨 (N개 카드 → 1회 API 호출로 최적화)
            }

            // flush 없이 즉시 unlock — debounce가 자동으로 sync하고,
            // self-echo 필터가 서버 응답의 롤백을 방지함
            const groupId = groupDragState.id;
            const containedCardIds = groupDragState.containedTaskIds.map(t => t.id);

            // 상태 정리 (드래그 상태 해제)
            setGroupDragState(null);

            // 즉시 Lock 해제
            unlockEntity(groupId);
            unlockEntities(containedCardIds);
            if (isDev) console.log('[Guard] Group drag complete - Locks released immediately');
        }
        if (connectionDraft) setConnectionDraft(null);

        // 연결선 재연결 드래그 중 허공에 드롭 -> 원래 위치로 복귀
        if (connectionReconnect) {
            cancelConnectionReconnect();
        }
    };

    const handleBackgroundContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // 팬 모드 중이면 컨텍스트 메뉴 표시하지 않음 (handlePointerUp에서 처리)
        if (panState || rightClickPanned.current) return;
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const { x, y } = worldPoint(e.clientX, e.clientY);
        setBackgroundMenu({ x: worldPoint(Math.min(e.clientX, rect.right - 220 * zoomRef.current), e.clientY).x, y: worldPoint(e.clientX, Math.min(e.clientY, rect.bottom - 170 * zoomRef.current)).y, taskX: x, taskY: y, ...resolveBoardMenuTarget(rightClickStart.current, e.target as Element) });
        setActiveMenu(null);
    };

    // 그룹에 속하지 않은 자유 배치 카드들
    // 이동 중에도 데이터가 같다면 그룹별 카드·자유 카드·ID 조회표를 재사용합니다.
    const taskIndex = useMemo(() => indexBoardTasks(tasks, groups), [tasks, groups]);
    const freeCards = taskIndex.free;

    // 그룹 타이틀 수정 핸들러
    const handleGroupTitleEdit = useCallback((groupId: number, newTitle: string) => {
        onGroupsUpdate(groups.map(g => g.id === groupId ? { ...g, title: newTitle } : g));
    }, [groups, onGroupsUpdate]);

    // 그룹 접기/펴기 핸들러
    const handleGroupCollapse = useCallback((groupId: number, collapsed: boolean) => {
        const updatedGroups = groups.map(g => g.id === groupId ? { ...g, collapsed } : g);
        onGroupsUpdate(updatedGroups);
    }, [groups, onGroupsUpdate]);

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-[var(--canvas-dark)] relative">
            {pendingTaskDelete !== null && <DeleteConfirmation
                title="카드 삭제"
                description={`‘${tasks.find(task => task.id === pendingTaskDelete)?.title ?? '선택한 카드'}’와 연결선을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
                onCancel={() => setPendingTaskDelete(null)}
                onConfirm={() => handleDeleteTask(pendingTaskDelete)}
            />}
            {/* Header */}
            {arrangeMessage && <p role="status" className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{arrangeMessage}</p>}
            <div className="theme-surface flex-shrink-0 bg-white/80 dark:bg-[var(--surface-panel)]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 p-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    {onArrange && <button disabled={arranging || pendingCount > 0 || !!groupDragState || !!freeDragState || !!dragContext} onClick={async () => {
                        setArranging(true);
                        try {
                            await onArrange((containerRef.current?.clientWidth ?? 960) / zoomRef.current);
                            containerRef.current?.scrollTo({ top: 0, left: 0 });
                            setArrangeMessage('위치를 정리했습니다. 카드 내용과 연결선은 유지됩니다.');
                        } catch { setArrangeMessage('정리에 실패했습니다. 저장 공간을 확인해 주세요.'); }
                        finally { setArranging(false); }
                    }} className="whitespace-nowrap rounded-lg border border-gray-400 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-50">{arranging ? '정리 중…' : '보드 정리'}</button>}
                    <div role="group" aria-label="보드 확대 축소" className="flex items-center gap-2 whitespace-nowrap text-sm">
                        <button type="button" aria-label="보드 축소" onClick={() => changeZoom(zoom / 1.2)}>−</button>
                        <button type="button" title="100%로 복원" onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
                        <button type="button" aria-label="보드 확대" onClick={() => changeZoom(zoom * 1.2)}>+</button>
                        <button type="button" onClick={fitBoard}>전체 맞춤</button>
                        <span className="text-xs text-gray-500">Ctrl + 휠</span>
                    </div>
                    {/* Optimistic UI: 동기화 상태 인디케이터 */}
                    <SyncStatusIndicator
                        status={syncStatus}
                        pendingCount={pendingCount}
                        error={lastError}
                        onRetry={retryFailed}
                        onDismissError={clearError}
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 glass-panel px-4 py-2 rounded-xl shadow-sm">
                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">Ctrl</span>+<span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">Drag</span><span>Select</span></div>
                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">C</span><span>Group</span></div>
                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">Del</span><span>Delete</span></div>
                    <div className="flex items-center gap-2 border-l border-gray-300 dark:border-white/10 pl-4"><MousePointer2 size={12} /><span>우클릭 / &apos;N&apos;</span></div>
                </div>
                <div className="h-6 w-[1px] bg-gray-300 dark:bg-white/10"></div>
                <div className="flex items-center gap-3">
                    <button onClick={onToggleGrid} className={`p-2 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 ${snapToGrid ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 dark:text-gray-500'}`} title={snapToGrid ? "스냅 끄기" : "스냅 켜기"}><Grid size={18} /></button>
                    <button onClick={onToggleTheme} aria-label="테마 전환" title="라이트/다크 테마 전환" className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"><Sun size={18} className="hidden dark:block" /><Moon size={18} className="block dark:hidden" /></button>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                data-board-zoom={zoom}
                className={`flex-1 overflow-auto relative custom-scrollbar w-full h-full bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:24px_24px] ${panState ? 'cursor-grabbing' : ''}`}
                onContextMenu={handleBackgroundContextMenu}
                onPointerDownCapture={event => {
                    pointerHeld.current = true;
                    rightClickStart.current = event.button === 2 ? getBoardMenuTarget(event.target as Element) : null;
                    rightClickPanned.current = false;
                }}
                onPointerDown={(evt) => handlePointerDown(evt)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={(e) => {
                    // 카드/그룹 드래그 중에는 pointerleave 무시
                    // 포인터 캡처가 자식 엘리먼트(카드/그룹)에 설정되어 있으므로
                    // 컨테이너의 pointerleave는 리렌더 시 발생하는 부작용 (Firefox 특히)
                    if (freeDragState || dragContext || pendingCardDrag || groupDragState) return;
                    handlePointerUp(e);
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 네이티브 파일이 배경에 드롭된 경우
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const files = Array.from(e.dataTransfer.files);
                        onBackgroundFileDrop?.(files);
                    }
                }}
            >
                <div style={{ width: (Math.max(2000, boardBounds.right + 400) + origin.x) * zoom, height: (Math.max(2000, boardBounds.bottom + 400) + origin.y) * zoom, position: 'relative', overflow: 'hidden' }}>
                <div ref={planeRef} style={{ position: 'absolute', left: origin.x * zoom, top: origin.y * zoom, width: Math.max(2000, boardBounds.right + 400), height: Math.max(2000, boardBounds.bottom + 400), transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                {/* ========== 레이어 1: 그룹 배경 (z-0) ========== */}
                {groups.map(group => {
                    const groupTasks = taskIndex.byGroup.get(group.id) ?? [];
                    // 드롭 타겟 하이라이트:
                    // 1. useSortableGrid에서 계산된 dropPreview
                    // 2. 자유 카드 드래그 시 freeCardTargetGroupId
                    const isDropTarget = isGroupHighlighted(group.id) || freeCardTargetGroupId === group.id;

                    return (
                        <SortableGroup
                            key={group.id}
                            group={group}
                            tasks={groupTasks}
                            isDropTarget={isDropTarget}
                            dropPreviewIndex={dropPreview?.groupId === group.id ? dropPreview.index : null}
                            onPointerDown={(e, g) => handlePointerDown(e, undefined, g)}
                            onTitleEdit={handleGroupTitleEdit}
                            onCollapse={handleGroupCollapse}
                            onDelete={onGroupDelete}
                            gridConfig={gridConfig}
                        >
                            {/* 카드는 여기서 렌더링하지 않음 - 레이어 3에서 별도 렌더링 */}
                            {null}
                        </SortableGroup>
                    );
                })}

                {/* ========== 레이어 2: 연결선 SVG (z-10) ========== */}
                <svg className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: Math.max(svgSize.width, 2000), height: Math.max(svgSize.height, 2000) }}>{lines}</svg>

                {/* ========== 레이어 3: 카드들 (z-20) ========== */}
                {groups.map(group => {
                    if (group.collapsed) return null;

                    return cardPositions
                        .filter(pos => pos.groupId === group.id)
                        .map(pos => {
                            if (pos.isPlaceholder) {
                                return (
                                    <DropPlaceholder
                                        key={`placeholder-${group.id}`}
                                        x={pos.x}
                                        y={pos.y}
                                        width={cardSize(tasks.find(t => t.id === (freeDragState?.id ?? dragContext?.taskId)) ?? {}).width}
                                        height={cardSize(tasks.find(t => t.id === (freeDragState?.id ?? dragContext?.taskId)) ?? {}).height}
                                        isVisible={true}
                                    />
                                );
                            }

                            const task = taskIndex.byId.get(pos.taskId);
                            if (!task) return null;

                            const isDragging = isTaskBeingDragged(task.id);
                            const transition = getCardTransition(task.id);

                            // 드래그 중인 카드는 별도 렌더링
                            if (isDragging) return null;

                            return (
                                <div
                                    key={task.id}
                                    className="absolute z-20"
                                    style={{
                                        left: pos.x,
                                        top: pos.y,
                                        ...cardSize(task),
                                        transform: `translate(${transition.x}px, ${transition.y}px)`,
                                        transition: transition.x !== 0 || transition.y !== 0 ? 'transform 200ms ease-out' : 'none',
                                    }}
                                >
                                    <TaskCard
                                        task={task}
                                        onResize={size => onTaskUpdate(task.id, size)}
                                        variant="sticky"
                                        isGrouped={true}
                                        isSelected={selectedTaskIds.has(task.id)}
                                        onClick={() => onTaskSelect(task)}
                                        onPointerDown={(e) => handleSortableCardDragStart(task.id, e)}
                                        onConnectStart={handleConnectStart}
                                        onConnectEnd={handleConnectEnd}
                                        onAttachFile={(taskId) => { setActiveTaskForFile(taskId); taskFileInputRef.current?.click(); }}
                                        isFileDropTarget={fileDropTargetCardId === task.id}
                                        onFileDragEnter={(taskId) => setFileDropTargetCardId(taskId)}
                                        onFileDragLeave={() => setFileDropTargetCardId(null)}
                                        onFileDrop={async (taskId, fileId) => {
                                            if (onFileDropOnCard) {
                                                await onFileDropOnCard(taskId, fileId);
                                            }
                                            setFileDropTargetCardId(null);
                                        }}
                                        onNativeFileDrop={async (taskId, files) => {
                                            if (onNativeFileDrop) {
                                                await onNativeFileDrop(taskId, files);
                                            }
                                            setFileDropTargetCardId(null);
                                        }}
                                        onStatusChange={async (taskId, newStatus) => {
                                            const targetColumn = sortedColumns.find(col => col.status === newStatus);
                                            if (targetColumn && onTaskUpdate) {
                                                try {
                                                    await onTaskUpdate(taskId, {
                                                        status: newStatus as Task['status'],
                                                        column_id: targetColumn.id
                                                    });
                                                } catch (err) {

                                                }
                                            }
                                        }}
                                    />
                                </div>
                            );
                        });
                })}

                {/* 드래그 중인 카드 (절대 위치로 렌더링) */}
                {dragContext && sortableDragPos && (
                    <div
                        className="absolute z-50 pointer-events-none"
                        style={{
                            left: sortableDragPos.x,
                            top: sortableDragPos.y,
                            ...cardSize(tasks.find(t => t.id === dragContext.taskId) ?? {}),
                            opacity: 0.9,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)',
                            transform: 'rotate(2deg)',
                        }}
                    >
                        {(() => {
                            const task = taskIndex.byId.get(dragContext.taskId);
                            if (!task) return null;
                            return (
                                <TaskCard
                                    task={task}
                                    variant="sticky"
                                    isGrouped={true}
                                    isSelected={true}
                                    onClick={() => {}}
                                    onConnectStart={() => {}}
                                    onConnectEnd={() => {}}
                                    onAttachFile={() => {}}
                                    onStatusChange={() => Promise.resolve()}
                                />
                            );
                        })()}
                    </div>
                )}

                {/* 자유 배치 카드들 (그룹에 속하지 않은 카드) */}
                {freeCards.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onResize={size => onTaskUpdate(task.id, size)}
                        variant="sticky"
                        isGrouped={false}
                        style={{ position: 'absolute', left: task.x || 0, top: task.y || 0 }}
                        isSelected={selectedTaskIds.has(task.id)}
                        onPointerDown={(evt) => handlePointerDown(evt, task)}
                        onClick={() => onTaskSelect(task)}
                        onConnectStart={handleConnectStart}
                        onConnectEnd={handleConnectEnd}
                        onAttachFile={(taskId) => { setActiveTaskForFile(taskId); taskFileInputRef.current?.click(); }}
                        isFileDropTarget={fileDropTargetCardId === task.id}
                        onFileDragEnter={(taskId) => setFileDropTargetCardId(taskId)}
                        onFileDragLeave={() => setFileDropTargetCardId(null)}
                        onFileDrop={async (taskId, fileId) => {
                            if (onFileDropOnCard) {
                                await onFileDropOnCard(taskId, fileId);
                            }
                            setFileDropTargetCardId(null);
                        }}
                        onNativeFileDrop={async (taskId, files) => {
                            if (onNativeFileDrop) {
                                await onNativeFileDrop(taskId, files);
                            }
                            setFileDropTargetCardId(null);
                        }}
                        onStatusChange={async (taskId, newStatus) => {
                            const targetColumn = sortedColumns.find(col => col.status === newStatus);
                            if (targetColumn && onTaskUpdate) {
                                try {
                                    await onTaskUpdate(taskId, {
                                        status: newStatus as Task['status'],
                                        column_id: targetColumn.id
                                    });
                                } catch (err) {

                                }
                            }
                        }}
                    />
                ))}

                {/* ========== 레이어 4: 호버된 연결선 끝점 (z-30, 카드 위) ========== */}
                {hoveredEndpoint && (
                    <svg
                        className="absolute top-0 left-0 pointer-events-none z-30"
                        style={{ width: Math.max(svgSize.width, 2000), height: Math.max(svgSize.height, 2000) }}
                    >
                        {/* 외곽 테두리 */}
                        <circle
                            cx={hoveredEndpoint.x}
                            cy={hoveredEndpoint.y}
                            r="8"
                            fill="rgba(59, 130, 246, 0.15)"
                            stroke="#3b82f6"
                            strokeWidth="2"
                        />
                        {/* 내부 점 */}
                        <circle
                            cx={hoveredEndpoint.x}
                            cy={hoveredEndpoint.y}
                            r="3"
                            fill="#3b82f6"
                        />
                    </svg>
                )}

                {selectionBox && (
                    <div className="absolute border-2 border-blue-500/50 bg-blue-500/10 rounded-xl z-50 pointer-events-none backdrop-blur-sm" style={{ left: Math.min(selectionBox.startX, selectionBox.currX), top: Math.min(selectionBox.startY, selectionBox.currY), width: Math.abs(selectionBox.currX - selectionBox.startX), height: Math.abs(selectionBox.currY - selectionBox.startY) }} />
                )}

                {activeMenu && (
                    <div className="absolute z-50 glass-card rounded-2xl overflow-hidden min-w-[140px] animate-in fade-in zoom-in-95 duration-100" style={{ left: activeMenu.x, top: activeMenu.y }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <button disabled={savingConnection} onClick={() => { const conn = getConnectionById(activeMenu.id); if (conn) void saveConnectionChange({ shape: conn.shape === 'straight' ? 'bezier' : 'straight' }); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium"><Spline size={14} /><span>{getConnectionById(activeMenu.id)?.shape === 'straight' ? '곡선으로 변경' : '직선으로 변경'}</span></button>
                        <div role="group" aria-label="선 종류">
                            {([{ value: 'solid', label: '실선', sample: '───' }, { value: 'dashed', label: '점선', sample: '┄┄┄' }, { value: 'arrow', label: '화살표선', sample: '──→' }] as const).map(option => <button key={option.value} disabled={savingConnection} aria-pressed={(getConnectionById(activeMenu.id)?.style ?? 'solid') === option.value} onClick={() => void saveConnectionChange({ style: option.value })} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium disabled:opacity-50">
                                <span aria-hidden="true">{option.sample}</span><span>{option.label}</span>{(getConnectionById(activeMenu.id)?.style ?? 'solid') === option.value && <Check size={14} />}
                            </button>)}
                        </div>
                        {connectionError && <p role="alert" className="max-w-56 p-3 text-xs text-red-600 dark:text-red-300">{connectionError}</p>}
                        <div className="h-[1px] bg-gray-200 dark:bg-white/10 my-1 mx-2"></div>
                        <button onClick={() => { onConnectionDelete(activeMenu.id); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left font-medium"><Trash2 size={14} /><span>삭제</span></button>
                    </div>
                )}

                {backgroundMenu && (
                    <div className="absolute z-[100] glass-card rounded-2xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-100" style={{ left: backgroundMenu.x, top: backgroundMenu.y }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <button onClick={() => { handleCreateNewTask(backgroundMenu.taskX, backgroundMenu.taskY); setBackgroundMenu(null); }} disabled={isCreatingTask} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium disabled:opacity-50">
                            {isCreatingTask ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <FilePlus size={16} className="text-blue-500" />}
                            <span>새로운 카드 추가</span>
                        </button>
                        {backgroundMenu.targetTaskId !== undefined && (
                            <button onClick={() => { setPendingTaskDelete(backgroundMenu.targetTaskId!); setBackgroundMenu(null); }} disabled={isDeletingTask} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left font-medium disabled:opacity-50">
                                {isDeletingTask ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>카드 삭제</span>
                            </button>
                        )}
                        {backgroundMenu.targetGroupId !== undefined && onGroupDelete && (
                            <button onClick={async () => { const id = backgroundMenu.targetGroupId!; setBackgroundMenu(null); await onGroupDelete(id); }} className="flex items-center gap-3 px-4 py-3 text-xs text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left font-medium">
                                <Trash2 size={16} /><span>그룹 삭제 (카드 유지)</span>
                            </button>
                        )}
                        <button disabled className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 cursor-not-allowed w-full text-left font-medium border-t border-gray-200 dark:border-white/10"><Clipboard size={16} /><span>붙여넣기</span></button>
                    </div>
                )}
                </div></div>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-8 right-8 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center z-40 group backdrop-blur-sm border border-white/20">
                <Plus size={36} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => { /* handleGlobalFileChange */ }} />
            <input type="file" multiple ref={taskFileInputRef} className="hidden" onChange={(e) => { /* handleTaskFileChange */ }} />

            {/* 라이브 커서 렌더링 */}
            {remoteCursors && remoteCursors.size > 0 && (
                <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
                    {Array.from(remoteCursors.values()).map((cursor) => {
                        const age = Date.now() - cursor.lastSeen;
                        const opacity = age > 2000 ? Math.max(0, 1 - (age - 2000) / 1000) : 1;
                        if (opacity <= 0) return null;

                        // 스크롤 오프셋 + 컨테이너 위치 보정
                        // 커서 좌표는 스크롤 컨테이너 기준 캔버스 절대좌표이지만,
                        // 오버레이는 래퍼(헤더 포함) 기준이므로 offsetTop/Left 보정 필요
                        const containerEl = containerRef.current;
                        if (!containerEl) return null;
                        const displayX = (cursor.x + origin.x) * zoom - containerEl.scrollLeft + containerEl.offsetLeft;
                        const displayY = (cursor.y + origin.y) * zoom - containerEl.scrollTop + containerEl.offsetTop;

                        return (
                            <div
                                key={cursor.userId}
                                className="absolute transition-all duration-75 ease-out"
                                style={{
                                    left: displayX,
                                    top: displayY,
                                    opacity,
                                }}
                            >
                                {/* 커서: 둥글고 끝이 뾰족한 형태 */}
                                <svg
                                    width="24"
                                    height="28"
                                    viewBox="0 0 24 28"
                                    fill="none"
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                >
                                    <path
                                        d="M3 2L5 22L10 17L16 26L20 24L14 15L21 13L3 2Z"
                                        fill={cursor.color}
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                {/* 유저 이름 라벨 */}
                                <div
                                    className="absolute left-5 top-5 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-sm"
                                    style={{ backgroundColor: cursor.color }}
                                >
                                    {cursor.userName}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Optimistic UI: 에러 토스트 */}
            {showErrorToast && lastError && (
                <SyncErrorToast
                    error={lastError}
                    onRetry={() => {
                        setShowErrorToast(false);
                        retryFailed();
                    }}
                    onDismiss={() => {
                        setShowErrorToast(false);
                        clearError();
                    }}
                />
            )}
        </div>
    );
};

export default BoardCanvas;

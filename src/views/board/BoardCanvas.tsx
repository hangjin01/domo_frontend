'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Task, Connection, Board, Group, Column } from '@/src/models/types';
import { TaskCard } from '@/src/views/task/TaskCard';
import { SortableGroup, DropPlaceholder, SortableCard } from '@/src/views/board/SortableGroup';
import { useSortableGrid, GridConfig } from '@/src/containers/hooks/board/useSortableGrid';
import { deleteTask } from '@/src/models/api';
import {
    Plus, LayoutDashboard, ChevronDown, Check, Pencil, X, MousePointer2, Layers, Spline, Activity, Trash2, FilePlus, Clipboard,
    Grid, Sun, Moon, Loader2
} from 'lucide-react';

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
    // [수정] handle 정보 추가
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
    onGroupsUpdate: (groups: Group[]) => void;
    onGroupMove?: (groupId: number, newX: number, newY: number) => Promise<void>;
    onGroupDelete?: (groupId: number) => Promise<void>;
    onToggleGrid: () => void;
    onToggleTheme: () => void;
    // 파일 드롭 관련
    onFileDropOnCard?: (cardId: number, fileId: number) => Promise<void>;
    onNativeFileDrop?: (cardId: number, files: File[]) => Promise<void>;
    onBackgroundFileDrop?: (files: File[]) => Promise<void>;
}

const COLUMN_WIDTH = 350;
const COLUMN_GAP = 30;
const COLUMN_START_X = 50;

// 그리드 설정
const GRID_CONFIG: Partial<GridConfig> = {
    columns: 1,           // 세로 리스트
    cardWidth: 260,
    cardHeight: 120,
    gap: 12,
    padding: 20,
    headerHeight: 50,
};

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
                                                            tasks, connections, columns, onTasksUpdate, onTaskSelect, onTaskCreate, onTaskUpdate, onTaskDelete, onMoveTaskToColumn, onConnectionCreate, onConnectionDelete, onConnectionUpdate, boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, snapToGrid, groups, onGroupsUpdate, onGroupMove, onGroupDelete, onToggleGrid, onToggleTheme, onFileDropOnCard, onNativeFileDrop, onBackgroundFileDrop
                                                        }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const boardSelectorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const taskFileInputRef = useRef<HTMLInputElement>(null);
    const [activeTaskForFile, setActiveTaskForFile] = useState<number | null>(null);

    const mousePosRef = useRef({ x: 0, y: 0 });
    const [lines, setLines] = useState<React.ReactElement[]>([]);
    const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

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
    const [backgroundMenu, setBackgroundMenu] = useState<{ x: number, y: number, taskX: number, taskY: number, targetTaskId?: number } | null>(null);
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
    const [isSavingPosition, setIsSavingPosition] = useState(false);
    const [isDeletingTask, setIsDeletingTask] = useState(false);

    // 우클릭 팬 상태
    const [panState, setPanState] = useState<{
        startX: number;
        startY: number;
        scrollStartX: number;
        scrollStartY: number;
        hasMoved: boolean;
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

    const CARD_DRAG_THRESHOLD = 8; // 8px 이상 이동해야 드래그 시작

    // useSortableGrid 훅 사용 - 그룹 내 카드 정렬용
    const {
        dragContext,
        dropPreview,
        cardPositions,
        isDragging: isSortableDragging,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        isTaskBeingDragged,
        getCardTransition,
        gridConfig,
    } = useSortableGrid(
        tasks,
        groups,
        onTasksUpdate,
        async (taskId, groupId, newIndex) => {
            // 백엔드에 카드 이동 저장
            if (onTaskUpdate) {
                await onTaskUpdate(taskId, { column_id: groupId ?? undefined });
            }
        },
        GRID_CONFIG
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
        const offsetX = -containerRect.left + scrollLeft;
        const offsetY = -containerRect.top + scrollTop;

        if (handle === 'left') {
            return { x: rect.left + offsetX, y: rect.top + rect.height / 2 + offsetY };
        }
        // 'right' 또는 기본값
        return { x: rect.right + offsetX, y: rect.top + rect.height / 2 + offsetY };
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
        setSvgSize({ width: container.scrollWidth, height: container.scrollHeight });

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
                const arrowPath = getArrowPath(endX, endY, targetHandle);
                const isHovered = hoveredEndpoint?.connectionId === conn.id;

                newLines.push(
                    <g key={conn.id}>
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
                                setActiveMenu({ id: conn.id, x: evt.clientX - rect.left + container.scrollLeft, y: evt.clientY - rect.top + container.scrollTop });
                                setBackgroundMenu(null);
                            }}
                            onContextMenu={(evt) => {
                                evt.preventDefault();
                                evt.stopPropagation();
                                const rect = container.getBoundingClientRect();
                                setActiveMenu({ id: conn.id, x: evt.clientX - rect.left + container.scrollLeft, y: evt.clientY - rect.top + container.scrollTop });
                                setBackgroundMenu(null);
                            }}
                        />
                        {/* 실제 보이는 연결선 */}
                        <path
                            d={pathString}
                            fill="none"
                            stroke={isSelected || isHovered ? "#3b82f6" : "rgba(128,128,128,0.4)"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={conn.style === 'dashed' ? "8,4" : "none"}
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

                        {/* Target 화살표 */}
                        <path
                            d={arrowPath}
                            fill={isSelected || isHovered ? "#3b82f6" : "rgba(128,128,128,0.5)"}
                            className="pointer-events-none transition-colors duration-150"
                        />
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
    }, [connections, connectionDraft, connectionReconnect, activeMenu, getConnectionPoint, getArrowPath, getBezierPath, getStraightPath]);

    useLayoutEffect(() => {
        updateConnections();
        const handleResize = () => updateConnections();
        window.addEventListener('resize', handleResize);
        let animationFrameId: number;
        const loop = () => { updateConnections(); animationFrameId = requestAnimationFrame(loop); };
        loop();
        return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); };
    }, [updateConnections]);

    useEffect(() => {
        const handleKeyDown = (evt: KeyboardEvent) => {
            const key = evt.key.toLowerCase();
            if (key === 'c' && selectedTaskIds.size > 0) {
                evt.preventDefault();
                const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
                if (selectedTasks.length === 0) return;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedTasks.forEach(t => {
                    minX = Math.min(minX, t.x || 0);
                    minY = Math.min(minY, t.y || 0);
                    maxX = Math.max(maxX, (t.x || 0) + 280);
                    maxY = Math.max(maxY, (t.y || 0) + 200);
                });
                const padding = 40;
                const newGroupId = Date.now();
                const newGroup: Group = {
                    id: newGroupId,
                    title: 'Group',
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + (padding * 2),
                    height: maxY - minY + (padding * 2),
                    projectId: activeBoardId,
                    parentId: null,
                    depth: 0,
                };
                onGroupsUpdate([...groups, newGroup]);

                // 선택된 카드들의 column_id를 새 그룹으로 설정
                const updatedTasks = tasks.map(t => {
                    if (selectedTaskIds.has(t.id)) {
                        return { ...t, column_id: newGroupId };
                    }
                    return t;
                });
                onTasksUpdate(updatedTasks);
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
                cancelDrag();
                setFreeDragState(null);
                setGroupDragState(null);
                setConnectionDraft(null);
                cancelConnectionReconnect();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTaskIds, tasks, activeBoardId, groups, onGroupsUpdate, onTasksUpdate, cancelDrag]);

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

    const handleCreateNewTask = async (x: number, y: number) => {
        if (isCreatingTask) return;
        // 카드 생성 시 자동으로 그룹에 귀속시키지 않음 (자유 배치)
        const newTaskData: Partial<Task> = {
            title: "새로운 카드",
            status: "todo",
            x, y,
            tags: [],
            boardId: activeBoardId,
            column_id: null,  // 명시적 null = 자유 배치 (그룹에 귀속 안 함)
        };

        if (onTaskCreate) {
            setIsCreatingTask(true);
            const tempTask: Task = { ...newTaskData, id: Date.now(), status: 'todo', x, y, boardId: activeBoardId } as Task;
            onTasksUpdate([...tasks, tempTask]);
            try {
                const savedTask = await onTaskCreate(newTaskData);
                onTasksUpdate(tasks.filter(t => t.id !== tempTask.id).concat(savedTask));
                onTaskSelect(savedTask);
            } catch (err) {
                
                onTasksUpdate(tasks.filter(t => t.id !== tempTask.id));
            } finally {
                setIsCreatingTask(false);
            }
        } else {
            const newTask: Task = { ...newTaskData, id: Date.now(), status: 'todo', x, y, boardId: activeBoardId } as Task;
            onTasksUpdate([...tasks, newTask]);
            onTaskSelect(newTask);
        }
    };

    const saveTaskPosition = async (taskId: number, x: number, y: number) => {
        if (!onTaskUpdate) return;
        const updates: Partial<Task> = { x, y };
        setIsSavingPosition(true);
        try {
            await onTaskUpdate(taskId, updates);
        } catch (err) {
            
        } finally {
            setIsSavingPosition(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (isDeletingTask) return;
        setIsDeletingTask(true);
        const previousTasks = [...tasks];
        onTasksUpdate(tasks.filter(t => t.id !== taskId));
        connections.filter(c => c.from === taskId || c.to === taskId).forEach(c => onConnectionDelete(c.id));
        try {
            if (onTaskDelete) await onTaskDelete(taskId);
            else await deleteTask(taskId);
        } catch (err) {
            
            onTasksUpdate(previousTasks);
            alert('카드 삭제에 실패했습니다.');
        } finally {
            setIsDeletingTask(false);
            setBackgroundMenu(null);
        }
    };

    const handleDeleteSelectedTasks = async () => {
        if (selectedTaskIds.size === 0 || isDeletingTask) return;
        const idsToDelete = Array.from(selectedTaskIds);
        setIsDeletingTask(true);
        const previousTasks = [...tasks];
        onTasksUpdate(tasks.filter(t => !selectedTaskIds.has(t.id)));
        idsToDelete.forEach(id => {
            connections.filter(c => c.from === id || c.to === id).forEach(c => onConnectionDelete(c.id));
        });
        setSelectedTaskIds(new Set());
        try {
            await Promise.all(idsToDelete.map(async (id) => {
                try {
                    if (onTaskDelete) await onTaskDelete(id);
                    else await deleteTask(id);
                } catch (err) {
                    
                }
            }));
        } catch (err) {
            
            onTasksUpdate(previousTasks);
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

        startDrag(taskId, pendingCardDrag.startX, pendingCardDrag.startY, cardRect);

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        setSortableDragPos({
            x: clientX - rect.left + container.scrollLeft - (clientX - cardRect.left),
            y: clientY - rect.top + container.scrollTop - (clientY - cardRect.top),
        });

        setPendingCardDrag(null);
    }, [pendingCardDrag, startDrag]);

    // 그룹 또는 자유 카드 드래그 시작
    const handlePointerDown = (e: React.PointerEvent, task?: Task, group?: Group) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;

        // 우클릭 팬 시작
        if (e.button === 2) {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setPanState({
                startX: e.clientX,
                startY: e.clientY,
                scrollStartX: container.scrollLeft,
                scrollStartY: container.scrollTop,
                hasMoved: false
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
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

            const containedTasks = tasks
                .filter(t => t.column_id === group.id)
                .map(t => ({ id: t.id, initialX: t.x || 0, initialY: t.y || 0 }));

            const containedChildGroups = groups
                .filter(g => g.parentId === group.id)
                .map(g => ({ id: g.id, initialX: g.x, initialY: g.y }));

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
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
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

    // 연결선 재연결 드래그 종료 처리
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

        try {
            if (connectionReconnect.draggingEnd === 'source') {
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
            }
        } catch (err) {
            
        }

        setConnectionReconnect(null);
    };

    // 연결선 재연결 드래그 취소 (허공에 드롭)
    const cancelConnectionReconnect = () => {
        setConnectionReconnect(null);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        mousePosRef.current = { x, y };

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

            if (distance >= CARD_DRAG_THRESHOLD) {
                // threshold 초과 시 실제 드래그 시작
                activatePendingDrag(e.clientX, e.clientY);
            }
            return;
        }

        // SortableGrid 드래그 중
        if (dragContext) {
            const newPos = updateDrag(e.clientX, e.clientY, container.scrollLeft - rect.left, container.scrollTop - rect.top);
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
            tasks.forEach(t => {
                const tx = t.x || 0, ty = t.y || 0;
                if (tx < boxEndX && tx + 280 > boxStartX && ty < boxEndY && ty + 100 > boxStartY) {
                    newSelectedIds.add(t.id);
                }
            });
            setSelectedTaskIds(newSelectedIds);
        } else if (groupDragState) {
            const deltaX = e.clientX - groupDragState.startX;
            const deltaY = e.clientY - groupDragState.startY;
            let newGroupX = groupDragState.initialGroupX + deltaX;
            let newGroupY = groupDragState.initialGroupY + deltaY;
            if (snapToGrid) {
                newGroupX = Math.round(newGroupX / 20) * 20;
                newGroupY = Math.round(newGroupY / 20) * 20;
            }

            const effectiveDeltaX = newGroupX - groupDragState.initialGroupX;
            const effectiveDeltaY = newGroupY - groupDragState.initialGroupY;

            onGroupsUpdate(groups.map(g => {
                if (g.id === groupDragState.id) {
                    return { ...g, x: newGroupX, y: newGroupY };
                }
                const childGroup = groupDragState.containedChildGroups.find(cg => cg.id === g.id);
                if (childGroup) {
                    return { ...g, x: childGroup.initialX + effectiveDeltaX, y: childGroup.initialY + effectiveDeltaY };
                }
                return g;
            }));

            if (groupDragState.containedTaskIds.length > 0) {
                onTasksUpdate(tasks.map(t => {
                    const c = groupDragState.containedTaskIds.find(item => item.id === t.id);
                    return c ? { ...t, x: c.initialX + effectiveDeltaX, y: c.initialY + effectiveDeltaY } : t;
                }));
            }
        } else if (freeDragState) {
            const deltaX = e.clientX - freeDragState.startX;
            const deltaY = e.clientY - freeDragState.startY;
            let newX = freeDragState.initialTaskX + deltaX;
            let newY = freeDragState.initialTaskY + deltaY;
            if (snapToGrid) {
                newX = Math.round(newX / 20) * 20;
                newY = Math.round(newY / 20) * 20;
            }
            onTasksUpdate(tasks.map(t => t.id === freeDragState.id ? { ...t, x: newX, y: newY } : t));
        } else if (connectionDraft) {
            setConnectionDraft(prev => prev ? { ...prev, currX: x, currY: y } : null);
        } else if (connectionReconnect) {
            // 연결선 끝점 재연결 드래그 중
            setConnectionReconnect(prev => prev ? { ...prev, currX: x, currY: y } : null);
        }
    };

    const handlePointerUp = async (e: React.PointerEvent) => {
        // 카드 드래그 pending 상태 해제 (threshold 미달 = 단순 클릭, 아무 동작 안 함)
        if (pendingCardDrag) {
            setPendingCardDrag(null);
            return;
        }

        // 우클릭 팬 종료
        if (panState) {
            const wasPanning = panState.hasMoved;
            setPanState(null);

            // 팬 동작이 없었으면 (제자리 우클릭) 컨텍스트 메뉴 표시
            if (!wasPanning && containerRef.current) {
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left + container.scrollLeft;
                const y = e.clientY - rect.top + container.scrollTop;
                const taskEl = (e.target as HTMLElement).closest('[id^="task-"]');
                let targetTaskId: number | undefined;
                if (taskEl) {
                    const match = taskEl.id.match(/^task-(\d+)$/);
                    if (match) targetTaskId = parseInt(match[1], 10);
                }
                setBackgroundMenu({ x, y, taskX: x, taskY: y, targetTaskId });
            }
            return;
        }

        // SortableGrid 드래그 종료 - 현재 드래그 위치 전달
        if (dragContext) {
            await endDrag(sortableDragPos ?? undefined);
            setSortableDragPos(null);
            return;
        }

        if (selectionBox) setSelectionBox(null);
        if (freeDragState) {
            const task = tasks.find(t => t.id === freeDragState.id);
            if (task && (task.x !== freeDragState.initialTaskX || task.y !== freeDragState.initialTaskY) && task.x !== undefined && task.y !== undefined) {
                // 자유 배치 카드가 그룹 안에 드롭되면 column_id 설정
                const targetGroup = groups.find(g => {
                    const cardCenterX = task.x + 140; // 카드 중심점
                    const cardCenterY = task.y + 60;
                    return (
                        cardCenterX >= g.x &&
                        cardCenterX <= g.x + g.width &&
                        cardCenterY >= g.y &&
                        cardCenterY <= g.y + g.height
                    );
                });

                if (targetGroup) {
                    // 그룹 안에 드롭됨 - column_id 설정
                    onTasksUpdate(tasks.map(t =>
                        t.id === task.id ? { ...t, column_id: targetGroup.id } : t
                    ));
                    if (onTaskUpdate) {
                        await onTaskUpdate(task.id, { column_id: targetGroup.id, x: task.x, y: task.y });
                    }
                } else {
                    // 그룹 밖에 드롭됨 - 위치만 저장
                    await saveTaskPosition(freeDragState.id, task.x, task.y);
                }
            }
            setFreeDragState(null);
        }
        if (groupDragState) {
            const draggedGroup = groups.find(g => g.id === groupDragState.id);
            if (draggedGroup) {
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

                if (onGroupMove) {
                    await onGroupMove(groupDragState.id, draggedGroup.x, draggedGroup.y);
                }
            }
            setGroupDragState(null);
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
        if (panState) return;
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        const taskEl = (e.target as HTMLElement).closest('[id^="task-"]');
        let targetTaskId: number | undefined;
        if (taskEl) {
            const match = taskEl.id.match(/^task-(\d+)$/);
            if (match) targetTaskId = parseInt(match[1], 10);
        }
        setBackgroundMenu({ x, y, taskX: x, taskY: y, targetTaskId });
        setActiveMenu(null);
    };

    // 그룹에 속하지 않은 자유 배치 카드들
    const freeCards = useMemo(() =>
            tasks.filter(t => !t.column_id || !groups.some(g => g.id === t.column_id)),
        [tasks, groups]);

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
        <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-[#0a0a0f] relative">
            {/* Header */}
            <div className="flex-shrink-0 bg-white/80 dark:bg-[#12131a]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 p-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    {isSavingPosition && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Loader2 size={14} className="animate-spin" />
                            <span>저장 중...</span>
                        </div>
                    )}
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
                    <button onClick={onToggleTheme} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"><Sun size={18} className="hidden dark:block" /><Moon size={18} className="block dark:hidden" /></button>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className={`flex-1 overflow-auto relative custom-scrollbar w-full h-full bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:24px_24px] ${panState ? 'cursor-grabbing' : ''}`}
                onContextMenu={handleBackgroundContextMenu}
                onPointerDown={(evt) => handlePointerDown(evt)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
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
                {/* ========== 레이어 1: 그룹 배경 (z-0) ========== */}
                {groups.map(group => {
                    const groupTasks = tasks.filter(t => t.column_id === group.id);
                    const isDropTarget = dropPreview?.groupId === group.id;

                    return (
                        <SortableGroup
                            key={group.id}
                            group={group}
                            tasks={groupTasks}
                            isDropTarget={isDropTarget}
                            dropPreviewIndex={isDropTarget ? dropPreview.index : null}
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
                                        width={gridConfig.cardWidth}
                                        height={gridConfig.cardHeight}
                                        isVisible={true}
                                    />
                                );
                            }

                            const task = tasks.find(t => t.id === pos.taskId);
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
                                        width: gridConfig.cardWidth,
                                        height: gridConfig.cardHeight,
                                        transform: `translate(${transition.x}px, ${transition.y}px)`,
                                        transition: transition.x !== 0 || transition.y !== 0 ? 'transform 200ms ease-out' : 'none',
                                    }}
                                >
                                    <TaskCard
                                        task={task}
                                        variant="sticky"
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
                            width: gridConfig.cardWidth,
                            height: gridConfig.cardHeight,
                            opacity: 0.9,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)',
                            transform: 'rotate(2deg)',
                        }}
                    >
                        {(() => {
                            const task = tasks.find(t => t.id === dragContext.taskId);
                            if (!task) return null;
                            return (
                                <TaskCard
                                    task={task}
                                    variant="sticky"
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
                        variant="sticky"
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
                        <button onClick={() => { const conn = getConnectionById(activeMenu.id); if (conn) onConnectionUpdate(activeMenu.id, { shape: conn.shape === 'straight' ? 'bezier' : 'straight' }); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium"><Spline size={14} /><span>{getConnectionById(activeMenu.id)?.shape === 'straight' ? '곡선으로 변경' : '직선으로 변경'}</span></button>
                        <button onClick={() => { const conn = getConnectionById(activeMenu.id); if (conn) onConnectionUpdate(activeMenu.id, { style: conn.style === 'dashed' ? 'solid' : 'dashed' }); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium"><Activity size={14} /><span>{getConnectionById(activeMenu.id)?.style === 'dashed' ? '실선으로 변경' : '점선으로 변경'}</span></button>
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
                        {backgroundMenu.targetTaskId && (
                            <button onClick={() => handleDeleteTask(backgroundMenu.targetTaskId!)} disabled={isDeletingTask} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left font-medium disabled:opacity-50">
                                {isDeletingTask ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>카드 삭제</span>
                            </button>
                        )}
                        <button disabled className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 cursor-not-allowed w-full text-left font-medium border-t border-gray-200 dark:border-white/10"><Clipboard size={16} /><span>붙여넣기</span></button>
                    </div>
                )}
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-8 right-8 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center z-40 group backdrop-blur-sm border border-white/20">
                <Plus size={36} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => { /* handleGlobalFileChange */ }} />
            <input type="file" multiple ref={taskFileInputRef} className="hidden" onChange={(e) => { /* handleTaskFileChange */ }} />
        </div>
    );
};

export default BoardCanvas;
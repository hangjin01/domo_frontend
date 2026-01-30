'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Task, Group } from '@/src/models/types';
import {
    GridConfig,
    DEFAULT_GRID_CONFIG,
    indexToRelativePosition,
    indexToAbsolutePosition,
    absolutePositionToIndex,
    relativeToAbsolute,
    isPointInGroup,
} from '@/src/models/constants/grid';

// ============================================
// 타입 정의
// ============================================

export interface DragContext {
    taskId: number;
    sourceGroupId: number | null;
    sourceIndex: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    snapshot: CardSnapshot;
}

export interface CardSnapshot {
    x: number;
    y: number;
    column_id: number | undefined;
}

export interface DropPreview {
    groupId: number;
    index: number;
    absoluteX: number;
    absoluteY: number;
}

export interface CardPosition {
    taskId: number;
    groupId: number | null;
    index: number;
    x: number;
    y: number;
    isPlaceholder?: boolean;
    translateX?: number;
    translateY?: number;
}

export interface CardTransitions {
    [taskId: number]: { x: number; y: number };
}

export interface DragEndResult {
    taskId: number;
    action: 'move-to-group' | 'reorder-in-group' | 'remove-from-group' | 'free-move' | 'no-change';
    newGroupId: number | null;
    newX: number;
    newY: number;
    snapshot: CardSnapshot;
    affectedCards?: Array<{
        taskId: number;
        newX: number;
        newY: number;
        originalX: number;
        originalY: number;
        originalColumnId: number | undefined;
    }>;
}

export type { GridConfig };

// ============================================
// 유틸리티 함수
// ============================================

function getGroupCardsSorted(tasks: Task[], groupId: number): Task[] {
    return tasks
        .filter(t => t.column_id === groupId)
        .sort((a, b) => {
            const yA = a.y ?? 0;
            const yB = b.y ?? 0;
            if (yA !== yB) return yA - yB;
            return (a.x ?? 0) - (b.x ?? 0);
        });
}

function shallowEqualTransitions(a: CardTransitions, b: CardTransitions): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        const numKey = Number(key);
        if (!b[numKey] || a[numKey].x !== b[numKey].x || a[numKey].y !== b[numKey].y) {
            return false;
        }
    }
    return true;
}

// ============================================
// 메인 훅
// ============================================

export function useSortableGrid(
    tasks: Task[],
    groups: Group[],
    onTasksUpdate: (tasks: Task[]) => void,
    onDragEnd?: (result: DragEndResult) => void,
    config: Partial<GridConfig> = {}
) {
    const gridConfig = useMemo(() => ({ ...DEFAULT_GRID_CONFIG, ...config }), [config]);

    const [dragContext, setDragContext] = useState<DragContext | null>(null);
    const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
    const [cardTransitions, setCardTransitions] = useState<CardTransitions>({});
    const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);

    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const groupsRef = useRef(groups);
    groupsRef.current = groups;

    // ========== 카드 위치 계산 (렌더링용 - 절대 좌표 반환) ==========
    const cardPositions = useMemo((): CardPosition[] => {
        const positions: CardPosition[] = [];
        const currentGroups = groupsRef.current;

        for (const group of currentGroups) {
            const groupCards = getGroupCardsSorted(tasks, group.id);
            const hasPreviewInGroup = dropPreview?.groupId === group.id;
            const previewIndex = dropPreview?.index ?? -1;

            let visualIndex = 0;

            for (let i = 0; i <= groupCards.length; i++) {
                if (hasPreviewInGroup && i === previewIndex) {
                    const absolutePos = indexToAbsolutePosition(visualIndex, group.x, group.y, gridConfig);
                    positions.push({
                        taskId: -1,
                        groupId: group.id,
                        index: previewIndex,
                        x: absolutePos.x,
                        y: absolutePos.y,
                        isPlaceholder: true,
                    });
                    visualIndex++;
                }

                if (i < groupCards.length) {
                    const task = groupCards[i];

                    if (dragContext && task.id === dragContext.taskId) {
                        continue;
                    }

                    const transition = cardTransitions[task.id];

                    // [마이그레이션 호환성] 기존 절대 좌표 데이터 자동 감지 및 변환
                    // 카드 좌표가 그룹 위치보다 크면 기존 절대 좌표 데이터로 간주
                    const cardX = task.x ?? 0;
                    const cardY = task.y ?? 0;
                    const isLegacyAbsoluteCoord = cardX >= group.x || cardY >= group.y;

                    let absolutePos: { x: number; y: number };
                    if (isLegacyAbsoluteCoord) {
                        // 기존 절대 좌표 데이터: 그대로 사용
                        absolutePos = { x: cardX, y: cardY };
                    } else {
                        // 새 상대 좌표 데이터: 절대 좌표로 변환
                        absolutePos = relativeToAbsolute(cardX, cardY, group.x, group.y);
                    }

                    positions.push({
                        taskId: task.id,
                        groupId: group.id,
                        index: i,
                        x: absolutePos.x,
                        y: absolutePos.y,
                        translateX: transition?.x ?? 0,
                        translateY: transition?.y ?? 0,
                    });
                    visualIndex++;
                }
            }
        }

        const freeCards = tasks.filter(t => !t.column_id);
        for (const task of freeCards) {
            if (dragContext && task.id === dragContext.taskId) continue;

            positions.push({
                taskId: task.id,
                groupId: null,
                index: -1,
                x: task.x ?? 0,
                y: task.y ?? 0,
            });
        }

        return positions;
    }, [tasks, groups, dropPreview, dragContext, cardTransitions, gridConfig]);

    // ========== 드래그 시작 ==========
    const startDrag = useCallback((
        taskId: number,
        clientX: number,
        clientY: number,
        cardRect: DOMRect
    ) => {
        const task = tasksRef.current.find(t => t.id === taskId);
        if (!task) {
            console.warn('[useSortableGrid] startDrag: Task not found', taskId);
            return;
        }

        const sourceGroupId = task.column_id ?? null;
        const sourceGroup = sourceGroupId
            ? groupsRef.current.find(g => g.id === sourceGroupId)
            : null;

        const sourceIndex = sourceGroup
            ? getGroupCardsSorted(tasksRef.current, sourceGroup.id).findIndex(t => t.id === taskId)
            : -1;

        const snapshot: CardSnapshot = {
            x: task.x ?? 0,
            y: task.y ?? 0,
            column_id: task.column_id,
        };

        setDragContext({
            taskId,
            sourceGroupId,
            sourceIndex,
            startX: clientX,
            startY: clientY,
            offsetX: clientX - cardRect.left,
            offsetY: clientY - cardRect.top,
            snapshot,
        });

        if (sourceGroupId !== null && sourceIndex !== -1 && sourceGroup) {
            const absolutePos = indexToAbsolutePosition(sourceIndex, sourceGroup.x, sourceGroup.y, gridConfig);
            setDropPreview({
                groupId: sourceGroupId,
                index: sourceIndex,
                absoluteX: absolutePos.x,
                absoluteY: absolutePos.y,
            });
        }
    }, [gridConfig]);

    // ========== 카드 밀어내기 트랜지션 계산 ==========
    const calculateShiftTransitions = useCallback((
        groupId: number,
        dropIndex: number,
        groupCards: Task[],
        group: Group
    ) => {
        const newTransitions: CardTransitions = {};

        for (let i = dropIndex; i < groupCards.length; i++) {
            const task = groupCards[i];
            const currentPos = indexToRelativePosition(i, gridConfig);
            const shiftedPos = indexToRelativePosition(i + 1, gridConfig);

            newTransitions[task.id] = {
                x: shiftedPos.x - currentPos.x,
                y: shiftedPos.y - currentPos.y,
            };
        }

        setCardTransitions(prev => {
            if (shallowEqualTransitions(prev, newTransitions)) {
                return prev;
            }
            return newTransitions;
        });
    }, [gridConfig]);

    // ========== 드래그 중 (위치 업데이트) ==========
    const updateDrag = useCallback((
        clientX: number,
        clientY: number,
        canvasScrollX: number = 0,
        canvasScrollY: number = 0
    ): { x: number; y: number } => {
        if (!dragContext) return { x: 0, y: 0 };

        const dragX = clientX + canvasScrollX - dragContext.offsetX;
        const dragY = clientY + canvasScrollY - dragContext.offsetY;

        const centerX = dragX + gridConfig.cardWidth / 2;
        const centerY = dragY + gridConfig.cardHeight / 2;

        let targetGroup: Group | null = null;
        for (const group of groupsRef.current) {
            if (isPointInGroup(centerX, centerY, group)) {
                targetGroup = group;
                break;
            }
        }

        if (targetGroup) {
            const groupCards = getGroupCardsSorted(tasksRef.current, targetGroup.id)
                .filter(t => t.id !== dragContext.taskId);

            const dropIndex = absolutePositionToIndex(
                centerX,
                centerY,
                targetGroup.x,
                targetGroup.y,
                groupCards.length,
                gridConfig
            );

            const absolutePos = indexToAbsolutePosition(dropIndex, targetGroup.x, targetGroup.y, gridConfig);

            setDropPreview({
                groupId: targetGroup.id,
                index: dropIndex,
                absoluteX: absolutePos.x,
                absoluteY: absolutePos.y,
            });

            calculateShiftTransitions(targetGroup.id, dropIndex, groupCards, targetGroup);
            setHighlightedGroupId(targetGroup.id);
        } else {
            setDropPreview(null);
            setCardTransitions({});
            setHighlightedGroupId(null);
        }

        return { x: dragX, y: dragY };
    }, [dragContext, gridConfig, calculateShiftTransitions]);

    // ========== 그룹 내 드롭 처리 ==========
    const handleDropInGroup = useCallback((
        ctx: DragContext,
        preview: DropPreview,
        snapshot: CardSnapshot
    ): DragEndResult => {
        const group = groupsRef.current.find(g => g.id === preview.groupId);
        if (!group) {
            throw new Error(`Group not found: ${preview.groupId}`);
        }

        const groupCards = getGroupCardsSorted(tasksRef.current, preview.groupId)
            .filter(t => t.id !== ctx.taskId);

        const task = tasksRef.current.find(t => t.id === ctx.taskId);
        if (!task) {
            throw new Error(`Task not found: ${ctx.taskId}`);
        }

        const newOrder = [...groupCards];
        newOrder.splice(preview.index, 0, task);

        const affectedCards: Array<{
            taskId: number;
            newX: number;
            newY: number;
            originalX: number;
            originalY: number;
            originalColumnId: number | undefined;
        }> = [];

        const updatedTasks = tasksRef.current.map(t => {
            const orderIndex = newOrder.findIndex(ot => ot.id === t.id);

            if (orderIndex !== -1) {
                const relativePos = indexToRelativePosition(orderIndex, gridConfig);

                if (t.id !== ctx.taskId && (t.x !== relativePos.x || t.y !== relativePos.y)) {
                    affectedCards.push({
                        taskId: t.id,
                        newX: relativePos.x,
                        newY: relativePos.y,
                        originalX: t.x ?? 0,
                        originalY: t.y ?? 0,
                        originalColumnId: t.column_id,
                    });
                }

                return {
                    ...t,
                    column_id: preview.groupId,
                    x: relativePos.x,
                    y: relativePos.y,
                };
            }

            return t;
        });

        onTasksUpdate(updatedTasks);

        const updatedTask = updatedTasks.find(t => t.id === ctx.taskId);
        const isNewGroup = ctx.sourceGroupId !== preview.groupId;

        return {
            taskId: ctx.taskId,
            action: isNewGroup ? 'move-to-group' : 'reorder-in-group',
            newGroupId: preview.groupId,
            newX: updatedTask?.x ?? 0,
            newY: updatedTask?.y ?? 0,
            snapshot,
            affectedCards: affectedCards.length > 0 ? affectedCards : undefined,
        };
    }, [gridConfig, onTasksUpdate]);

    // ========== 그룹 밖 드롭 처리 ==========
    const handleDropOutsideGroup = useCallback((
        ctx: DragContext,
        snapshot: CardSnapshot,
        currentDragPos?: { x: number; y: number }
    ): DragEndResult => {
        const newX = currentDragPos?.x ?? snapshot.x;
        const newY = currentDragPos?.y ?? snapshot.y;
        const wasInGroup = ctx.sourceGroupId !== null;

        if (wasInGroup) {
            const sourceGroup = groupsRef.current.find(g => g.id === ctx.sourceGroupId);
            const finalX = currentDragPos?.x ?? (sourceGroup ? sourceGroup.x + snapshot.x : snapshot.x);
            const finalY = currentDragPos?.y ?? (sourceGroup ? sourceGroup.y + snapshot.y : snapshot.y);

            const updatedTasks = tasksRef.current.map(t => {
                if (t.id === ctx.taskId) {
                    return {
                        ...t,
                        column_id: undefined,
                        x: finalX,
                        y: finalY,
                    };
                }
                return t;
            });

            onTasksUpdate(updatedTasks);

            return {
                taskId: ctx.taskId,
                action: 'remove-from-group',
                newGroupId: null,
                newX: finalX,
                newY: finalY,
                snapshot,
            };
        }

        const hasMoved = newX !== snapshot.x || newY !== snapshot.y;

        if (hasMoved) {
            const updatedTasks = tasksRef.current.map(t =>
                t.id === ctx.taskId ? { ...t, x: newX, y: newY } : t
            );
            onTasksUpdate(updatedTasks);

            return {
                taskId: ctx.taskId,
                action: 'free-move',
                newGroupId: null,
                newX,
                newY,
                snapshot,
            };
        }

        return {
            taskId: ctx.taskId,
            action: 'no-change',
            newGroupId: null,
            newX: snapshot.x,
            newY: snapshot.y,
            snapshot,
        };
    }, [onTasksUpdate]);

    // ========== 드래그 종료 ==========
    const endDrag = useCallback((currentDragPos?: { x: number; y: number }) => {
        if (!dragContext) return;

        const task = tasksRef.current.find(t => t.id === dragContext.taskId);
        if (!task) {
            console.warn('[useSortableGrid] endDrag: Task not found', dragContext.taskId);
            resetDragState();
            return;
        }

        const { snapshot } = dragContext;
        let result: DragEndResult;

        try {
            if (dropPreview) {
                result = handleDropInGroup(dragContext, dropPreview, snapshot);
            } else {
                result = handleDropOutsideGroup(dragContext, snapshot, currentDragPos);
            }

            if (onDragEnd && result.action !== 'no-change') {
                onDragEnd(result);
            }
        } catch (error) {
            console.error('[useSortableGrid] endDrag error:', error);
            onTasksUpdate(tasksRef.current.map(t =>
                t.id === dragContext.taskId
                    ? { ...t, x: snapshot.x, y: snapshot.y, column_id: snapshot.column_id }
                    : t
            ));
        } finally {
            resetDragState();
        }
    }, [dragContext, dropPreview, handleDropInGroup, handleDropOutsideGroup, onTasksUpdate, onDragEnd]);

    // ========== 드래그 취소 ==========
    const cancelDrag = useCallback(() => {
        if (dragContext) {
            onTasksUpdate(tasksRef.current.map(t =>
                t.id === dragContext.taskId
                    ? {
                        ...t,
                        x: dragContext.snapshot.x,
                        y: dragContext.snapshot.y,
                        column_id: dragContext.snapshot.column_id,
                    }
                    : t
            ));
        }
        resetDragState();
    }, [dragContext, onTasksUpdate]);

    // ========== 상태 초기화 ==========
    const resetDragState = () => {
        setDragContext(null);
        setDropPreview(null);
        setCardTransitions({});
        setHighlightedGroupId(null);
    };

    // ========== 유틸리티 메서드 ==========
    const isTaskBeingDragged = useCallback((taskId: number): boolean => {
        return dragContext?.taskId === taskId;
    }, [dragContext]);

    const getCardTransition = useCallback((taskId: number) => {
        return cardTransitions[taskId] ?? { x: 0, y: 0 };
    }, [cardTransitions]);

    const isGroupHighlighted = useCallback((groupId: number): boolean => {
        if (dropPreview?.groupId === groupId) return true;
        if (highlightedGroupId === groupId) return true;
        return false;
    }, [dropPreview, highlightedGroupId]);

    // ========== 반환 ==========
    return {
        dragContext,
        dropPreview,
        cardPositions,
        isDragging: dragContext !== null,
        highlightedGroupId,

        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,

        isTaskBeingDragged,
        getCardTransition,
        isGroupHighlighted,
        gridConfig,
    };
}

export default useSortableGrid;
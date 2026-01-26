'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Task, Group } from '@/src/models/types';
import {
    GridConfig,
    DEFAULT_GRID_CONFIG,
    indexToAbsolutePosition,
    absolutePositionToIndex,
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
    /** 드래그 시작 시점의 카드 상태 스냅샷 (롤백용) */
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
    x: number;
    y: number;
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

/** 드래그 종료 결과 */
export interface DragEndResult {
    taskId: number;
    action: 'move-to-group' | 'reorder-in-group' | 'remove-from-group' | 'free-move' | 'no-change';
    newGroupId: number | null;
    newX: number;
    newY: number;
    snapshot: CardSnapshot;
    /** 그룹 내 재정렬 시 영향받은 다른 카드들 (원본 좌표 포함) */
    affectedCards?: Array<{
        taskId: number;
        newX: number;
        newY: number;
        /** 변경 전 원본 X 좌표 (롤백용) */
        originalX: number;
        /** 변경 전 원본 Y 좌표 (롤백용) */
        originalY: number;
        /** 변경 전 column_id (롤백용) */
        originalColumnId: number | undefined;
    }>;
}

// Re-export for external use
export type { GridConfig };

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 그룹 내 카드들을 y좌표 기준으로 정렬
 */
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

    // ========== 상태 ==========
    const [dragContext, setDragContext] = useState<DragContext | null>(null);
    const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
    const [cardTransitions, setCardTransitions] = useState<Map<number, { x: number; y: number }>>(new Map());

    /** 자유 카드 드래그 시 하이라이트될 그룹 ID */
    const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);

    // ========== Refs (최신 상태 참조) ==========
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const groupsRef = useRef(groups);
    groupsRef.current = groups;

    // ========== 카드 위치 계산 (렌더링용) ==========
    const cardPositions = useMemo((): CardPosition[] => {
        const positions: CardPosition[] = [];

        for (const group of groups) {
            const groupCards = getGroupCardsSorted(tasks, group.id);
            const hasPreviewInGroup = dropPreview?.groupId === group.id;
            const previewIndex = dropPreview?.index ?? -1;

            let visualIndex = 0;

            for (let i = 0; i <= groupCards.length; i++) {
                // 플레이스홀더 삽입 위치
                if (hasPreviewInGroup && i === previewIndex) {
                    const pos = indexToAbsolutePosition(visualIndex, group.x, group.y, gridConfig);
                    positions.push({
                        taskId: -1, // placeholder
                        groupId: group.id,
                        index: previewIndex,
                        x: pos.x,
                        y: pos.y,
                        isPlaceholder: true,
                    });
                    visualIndex++;
                }

                if (i < groupCards.length) {
                    const task = groupCards[i];

                    // 드래그 중인 카드는 별도 렌더링하므로 건너뜀
                    if (dragContext && task.id === dragContext.taskId) {
                        continue;
                    }

                    const transition = cardTransitions.get(task.id);

                    positions.push({
                        taskId: task.id,
                        groupId: group.id,
                        index: i,
                        x: task.x ?? 0,
                        y: task.y ?? 0,
                        translateX: transition?.x ?? 0,
                        translateY: transition?.y ?? 0,
                    });
                    visualIndex++;
                }
            }
        }

        // 그룹에 속하지 않은 자유 배치 카드들
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

        // 스냅샷 캡처 (롤백용)
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

        // 그룹 내 카드면 초기 드롭 프리뷰 설정
        if (sourceGroupId !== null && sourceIndex !== -1 && sourceGroup) {
            const pos = indexToAbsolutePosition(sourceIndex, sourceGroup.x, sourceGroup.y, gridConfig);
            setDropPreview({
                groupId: sourceGroupId,
                index: sourceIndex,
                x: pos.x,
                y: pos.y,
            });
        }
    }, [gridConfig]);

    // ========== 카드 밀어내기 트랜지션 계산 ==========
    // NOTE: updateDrag에서 참조하므로 반드시 updateDrag 앞에 정의해야 함
    const calculateShiftTransitions = useCallback((
        groupId: number,
        dropIndex: number,
        groupCards: Task[],
        group: Group
    ) => {
        const newTransitions = new Map<number, { x: number; y: number }>();

        // dropIndex 이후의 카드들을 아래로 밀어냄
        for (let i = dropIndex; i < groupCards.length; i++) {
            const task = groupCards[i];
            const currentPos = indexToAbsolutePosition(i, group.x, group.y, gridConfig);
            const shiftedPos = indexToAbsolutePosition(i + 1, group.x, group.y, gridConfig);

            newTransitions.set(task.id, {
                x: shiftedPos.x - currentPos.x,
                y: shiftedPos.y - currentPos.y,
            });
        }

        setCardTransitions(newTransitions);
    }, [gridConfig]);

    // ========== 드래그 중 (위치 업데이트) ==========
    const updateDrag = useCallback((
        clientX: number,
        clientY: number,
        canvasScrollX: number = 0,
        canvasScrollY: number = 0
    ): { x: number; y: number } => {
        if (!dragContext) return { x: 0, y: 0 };

        // 캔버스 내 절대 좌표 계산
        const dragX = clientX + canvasScrollX - dragContext.offsetX;
        const dragY = clientY + canvasScrollY - dragContext.offsetY;

        // 카드 중심점
        const centerX = dragX + gridConfig.cardWidth / 2;
        const centerY = dragY + gridConfig.cardHeight / 2;

        // 타겟 그룹 찾기
        let targetGroup: Group | null = null;
        for (const group of groupsRef.current) {
            if (isPointInGroup(centerX, centerY, group)) {
                targetGroup = group;
                break;
            }
        }

        if (targetGroup) {
            // 그룹 내 드롭 위치 계산
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

            const pos = indexToAbsolutePosition(dropIndex, targetGroup.x, targetGroup.y, gridConfig);

            setDropPreview({
                groupId: targetGroup.id,
                index: dropIndex,
                x: pos.x,
                y: pos.y,
            });

            // 카드 밀어내기 트랜지션 계산
            calculateShiftTransitions(targetGroup.id, dropIndex, groupCards, targetGroup);

            // 그룹 하이라이트 (자유 카드가 그룹으로 진입 시)
            setHighlightedGroupId(targetGroup.id);
        } else {
            // 그룹 밖
            setDropPreview(null);
            setCardTransitions(new Map());
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

        // 새 순서 배열 생성
        const task = tasksRef.current.find(t => t.id === ctx.taskId);
        if (!task) {
            throw new Error(`Task not found: ${ctx.taskId}`);
        }

        const newOrder = [...groupCards];
        newOrder.splice(preview.index, 0, task);

        // 영향받은 카드들 추적 (원본 좌표 포함)
        const affectedCards: Array<{
            taskId: number;
            newX: number;
            newY: number;
            originalX: number;
            originalY: number;
            originalColumnId: number | undefined;
        }> = [];

        // 모든 카드의 절대 좌표 재계산
        const updatedTasks = tasksRef.current.map(t => {
            const orderIndex = newOrder.findIndex(ot => ot.id === t.id);

            if (orderIndex !== -1) {
                const absolutePos = indexToAbsolutePosition(orderIndex, group.x, group.y, gridConfig);

                // 드래그한 카드가 아니고, 좌표가 변경된 경우 추적
                // 중요: onTasksUpdate 호출 전에 원본 좌표를 캡처
                if (t.id !== ctx.taskId && (t.x !== absolutePos.x || t.y !== absolutePos.y)) {
                    affectedCards.push({
                        taskId: t.id,
                        newX: absolutePos.x,
                        newY: absolutePos.y,
                        originalX: t.x ?? 0,        // 변경 전 원본 좌표
                        originalY: t.y ?? 0,        // 변경 전 원본 좌표
                        originalColumnId: t.column_id,  // 변경 전 column_id
                    });
                }

                return {
                    ...t,
                    column_id: preview.groupId,
                    x: absolutePos.x,
                    y: absolutePos.y,
                };
            }

            return t;
        });

        onTasksUpdate(updatedTasks);

        // 결과 생성
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
            // 그룹에서 제거
            const updatedTasks = tasksRef.current.map(t => {
                if (t.id === ctx.taskId) {
                    return {
                        ...t,
                        column_id: undefined,
                        x: newX,
                        y: newY,
                    };
                }
                return t;
            });

            onTasksUpdate(updatedTasks);

            return {
                taskId: ctx.taskId,
                action: 'remove-from-group',
                newGroupId: null,
                newX,
                newY,
                snapshot,
            };
        }

        // 자유 배치 카드 이동
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

        // 변경 없음
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
                // ========== 그룹 내 배치 ==========
                result = handleDropInGroup(dragContext, dropPreview, snapshot);
            } else {
                // ========== 그룹 밖 드롭 ==========
                result = handleDropOutsideGroup(dragContext, snapshot, currentDragPos);
            }

            // 변경이 있으면 콜백 호출
            if (onDragEnd && result.action !== 'no-change') {
                onDragEnd(result);
            }
        } catch (error) {
            console.error('[useSortableGrid] endDrag error:', error);
            // 에러 시 원래 위치로 롤백
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
            // 원래 위치로 복원
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
        setCardTransitions(new Map());
        setHighlightedGroupId(null);
    };

    // ========== 유틸리티 메서드 ==========
    const isTaskBeingDragged = useCallback((taskId: number): boolean => {
        return dragContext?.taskId === taskId;
    }, [dragContext]);

    const getCardTransition = useCallback((taskId: number) => {
        return cardTransitions.get(taskId) ?? { x: 0, y: 0 };
    }, [cardTransitions]);

    /**
     * 특정 그룹이 드롭 타겟으로 하이라이트되어야 하는지 확인
     */
    const isGroupHighlighted = useCallback((groupId: number): boolean => {
        // dropPreview가 있으면 해당 그룹 하이라이트
        if (dropPreview?.groupId === groupId) return true;
        // 자유 카드 드래그 시 하이라이트
        if (highlightedGroupId === groupId) return true;
        return false;
    }, [dropPreview, highlightedGroupId]);

    // ========== 반환 ==========
    return {
        // 상태
        dragContext,
        dropPreview,
        cardPositions,
        isDragging: dragContext !== null,
        highlightedGroupId,

        // 메서드
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,

        // 유틸리티
        isTaskBeingDragged,
        getCardTransition,
        isGroupHighlighted,
        gridConfig,
    };
}

export default useSortableGrid;
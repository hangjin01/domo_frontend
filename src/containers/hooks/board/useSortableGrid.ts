'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
    /** 렌더링용 절대 좌표 X */
    x: number;
    /** 렌더링용 절대 좌표 Y */
    y: number;
    isPlaceholder?: boolean;
    translateX?: number;
    translateY?: number;
}

/** 카드 트랜지션 (객체 리터럴 - Map 대신 사용) */
export interface CardTransitions {
    [taskId: number]: { x: number; y: number };
}

export interface DragEndResult {
    taskId: number;
    action: 'move-to-group' | 'reorder-in-group' | 'remove-from-group' | 'free-move' | 'no-change';
    newGroupId: number | null;
    /** 새 좌표 X (그룹 내: 상대 좌표, 자유 카드: 절대 좌표) */
    newX: number;
    /** 새 좌표 Y (그룹 내: 상대 좌표, 자유 카드: 절대 좌표) */
    newY: number;
    snapshot: CardSnapshot;
    /** 그룹 내 재정렬 시 영향받은 카드들 (API 동기화용) */
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

/**
 * 그룹 내 카드를 상대 좌표 기준으로 정렬
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

/**
 * CardTransitions 객체 shallow equal 비교
 * - 불필요한 리렌더링 방지
 */
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

/**
 * 좌표가 상대 좌표인지 절대 좌표인지 판단 (개선된 휴리스틱)
 *
 * @description
 * 상대 좌표의 범위:
 * - X: padding ~ padding + cardWidth (단일 열 기준 약 20 ~ 300)
 * - Y: headerHeight + padding ~ (카드 수에 따라 증가)
 *
 * 판단 기준:
 * 1. 카드 좌표가 그룹 좌표보다 크거나 같으면 절대 좌표 (레거시)
 * 2. 상대 좌표 범위 내에 있으면 상대 좌표
 */
function isRelativeCoordinate(
    cardX: number,
    cardY: number,
    _groupX: number,
    _groupY: number,
    config: GridConfig
): boolean {
    // 상대 좌표의 합리적인 최대 범위
    const maxRelativeX = config.padding * 2 + config.columns * config.cardWidth + (config.columns - 1) * config.gap;
    const minRelativeY = config.headerHeight + config.padding;

    // 상대 좌표는 항상 작은 양수 범위 내 (그룹 위치와 무관)
    // 이전 휴리스틱(cardX >= groupX)은 그룹이 음수 좌표일 때 오판하므로 제거
    const isLikelyRelativeX = cardX >= 0 && cardX <= maxRelativeX;
    const isLikelyRelativeY = cardY >= minRelativeY;

    return isLikelyRelativeX && isLikelyRelativeY;
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
    const [cardTransitions, setCardTransitions] = useState<CardTransitions>({});
    const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);

    // ========== Refs - 최신 상태 참조 ==========
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const groupsRef = useRef(groups);
    groupsRef.current = groups;

    const dragContextRef = useRef(dragContext);
    dragContextRef.current = dragContext;

    // ========== 카드의 절대 좌표 계산 (렌더링용) ==========
    const getCardAbsolutePosition = useCallback((
        task: Task,
        group: Group | null
    ): { x: number; y: number } => {
        const cardX = task.x ?? 0;
        const cardY = task.y ?? 0;

        if (!group) {
            // 자유 배치 카드: 절대 좌표 그대로 사용
            return { x: cardX, y: cardY };
        }

        // 그룹 내 카드: 상대/절대 좌표 판단 후 변환
        const isRelative = isRelativeCoordinate(cardX, cardY, group.x, group.y, gridConfig);

        if (isRelative) {
            // 상대 좌표 → 절대 좌표 변환
            return relativeToAbsolute(cardX, cardY, group.x, group.y);
        } else {
            // 이미 절대 좌표 (레거시 데이터)
            return { x: cardX, y: cardY };
        }
    }, [gridConfig]);

    // ========== 카드 위치 계산 (렌더링용 - 절대 좌표 반환) ==========
    const cardPositions = useMemo((): CardPosition[] => {
        const positions: CardPosition[] = [];
        const currentGroups = groupsRef.current;
        const currentDragContext = dragContextRef.current;

        for (const group of currentGroups) {
            const groupCards = getGroupCardsSorted(tasks, group.id);

            // 카드 렌더링 (저장 좌표 + 트랜지션으로 시각적 위치 조정)
            for (let i = 0; i < groupCards.length; i++) {
                const task = groupCards[i];
                if (currentDragContext && task.id === currentDragContext.taskId) continue;

                const transition = cardTransitions[task.id];
                const absolutePos = getCardAbsolutePosition(task, group);

                positions.push({
                    taskId: task.id,
                    groupId: group.id,
                    index: i,
                    x: absolutePos.x,
                    y: absolutePos.y,
                    translateX: transition?.x ?? 0,
                    translateY: transition?.y ?? 0,
                });
            }

            // 드롭 플레이스홀더 (별도 — dropPreview의 사전 계산된 좌표 사용)
            if (dropPreview?.groupId === group.id) {
                positions.push({
                    taskId: -1,
                    groupId: group.id,
                    index: dropPreview.index,
                    x: dropPreview.absoluteX,
                    y: dropPreview.absoluteY,
                    isPlaceholder: true,
                });
            }
        }

        // 자유 배치 카드들 (절대 좌표 그대로 사용)
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
    }, [tasks, groups, dropPreview, dragContext, cardTransitions, gridConfig, getCardAbsolutePosition]);

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

        // 스냅샷 캡처 (롤백용) - 현재 저장된 좌표 그대로
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

        // 모든 카드의 트랜지션: 저장 좌표 → 타겟 위치
        // dropIndex 이전은 빈 자리 채우기(리플로우), 이후는 한 칸 밀림
        for (let i = 0; i < groupCards.length; i++) {
            const task = groupCards[i];
            const targetIndex = i >= dropIndex ? i + 1 : i;
            const targetPos = indexToRelativePosition(targetIndex, gridConfig);
            const storedX = task.x ?? 0;
            const storedY = task.y ?? 0;
            const dx = targetPos.x - storedX;
            const dy = targetPos.y - storedY;

            if (dx !== 0 || dy !== 0) {
                newTransitions[task.id] = { x: dx, y: dy };
            }
        }

        // 불필요한 리렌더링 방지
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
        const ctx = dragContextRef.current;
        if (!ctx) return { x: 0, y: 0 };

        // 캔버스 내 절대 좌표 계산
        const dragX = clientX + canvasScrollX - ctx.offsetX;
        const dragY = clientY + canvasScrollY - ctx.offsetY;

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
                .filter(t => t.id !== ctx.taskId);

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

            // 카드 밀어내기 트랜지션 계산
            calculateShiftTransitions(targetGroup.id, dropIndex, groupCards, targetGroup);
            setHighlightedGroupId(targetGroup.id);
        } else {
            // 그룹 밖
            setDropPreview(null);
            setCardTransitions({});
            setHighlightedGroupId(null);
        }

        return { x: dragX, y: dragY };
    }, [gridConfig, calculateShiftTransitions]);

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

        // 새 순서 배열 생성
        const newOrder = [...groupCards];
        newOrder.splice(preview.index, 0, task);

        // 영향받은 카드들 추적 (API 동기화용)
        const affectedCards: Array<{
            taskId: number;
            newX: number;
            newY: number;
            originalX: number;
            originalY: number;
            originalColumnId: number | undefined;
        }> = [];

        // 모든 카드의 상대 좌표 재계산
        const updatedTasks = tasksRef.current.map(t => {
            const orderIndex = newOrder.findIndex(ot => ot.id === t.id);

            if (orderIndex !== -1) {
                // 상대 좌표 계산 (그룹 내 offset)
                const relativePos = indexToRelativePosition(orderIndex, gridConfig);

                // 드래그한 카드가 아니고, 좌표가 변경된 경우 추적
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
                    x: relativePos.x,  // 상대 좌표 저장
                    y: relativePos.y,  // 상대 좌표 저장
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
            newX: updatedTask?.x ?? 0,  // 상대 좌표
            newY: updatedTask?.y ?? 0,  // 상대 좌표
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
        const wasInGroup = ctx.sourceGroupId !== null;

        if (wasInGroup) {
            // 그룹에서 제거 → 절대 좌표로 변환
            const sourceGroup = groupsRef.current.find(g => g.id === ctx.sourceGroupId);

            // 드래그 위치가 있으면 그 위치 사용
            // 없으면 원래 상대 좌표를 절대 좌표로 변환
            let finalX: number, finalY: number;

            if (currentDragPos) {
                finalX = currentDragPos.x;
                finalY = currentDragPos.y;
            } else if (sourceGroup) {
                // 스냅샷이 상대 좌표인지 확인
                const isRelative = isRelativeCoordinate(
                    snapshot.x,
                    snapshot.y,
                    sourceGroup.x,
                    sourceGroup.y,
                    gridConfig
                );
                if (isRelative) {
                    const abs = relativeToAbsolute(snapshot.x, snapshot.y, sourceGroup.x, sourceGroup.y);
                    finalX = abs.x;
                    finalY = abs.y;
                } else {
                    finalX = snapshot.x;
                    finalY = snapshot.y;
                }
            } else {
                finalX = snapshot.x;
                finalY = snapshot.y;
            }

            // 남은 카드들 재정렬 (빈 슬롯 채우기)
            const remainingCards = getGroupCardsSorted(
                tasksRef.current.filter(t => t.id !== ctx.taskId),
                ctx.sourceGroupId!
            );
            const reflowMap = new Map<number, { x: number; y: number }>();
            for (let i = 0; i < remainingCards.length; i++) {
                reflowMap.set(remainingCards[i].id, indexToRelativePosition(i, gridConfig));
            }

            // 영향받은 카드 추적 (API 동기화용)
            const affectedCards: Array<{
                taskId: number;
                newX: number;
                newY: number;
                originalX: number;
                originalY: number;
                originalColumnId: number | undefined;
            }> = [];

            const updatedTasks = tasksRef.current.map(t => {
                if (t.id === ctx.taskId) {
                    return {
                        ...t,
                        column_id: undefined,
                        x: finalX,  // 절대 좌표 (자유 배치)
                        y: finalY,
                    };
                }
                const newPos = reflowMap.get(t.id);
                if (newPos && (t.x !== newPos.x || t.y !== newPos.y)) {
                    affectedCards.push({
                        taskId: t.id,
                        newX: newPos.x,
                        newY: newPos.y,
                        originalX: t.x ?? 0,
                        originalY: t.y ?? 0,
                        originalColumnId: t.column_id,
                    });
                    return { ...t, x: newPos.x, y: newPos.y };
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
                affectedCards: affectedCards.length > 0 ? affectedCards : undefined,
            };
        }

        // 자유 배치 카드 이동 (절대 좌표)
        const newX = currentDragPos?.x ?? snapshot.x;
        const newY = currentDragPos?.y ?? snapshot.y;
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
    }, [gridConfig, onTasksUpdate]);

    // ========== 드래그 종료 ==========
    const endDrag = useCallback((currentDragPos?: { x: number; y: number }) => {
        const ctx = dragContextRef.current;
        if (!ctx) return;

        const task = tasksRef.current.find(t => t.id === ctx.taskId);
        if (!task) {
            console.warn('[useSortableGrid] endDrag: Task not found', ctx.taskId);
            resetDragState();
            return;
        }

        const { snapshot } = ctx;
        let result: DragEndResult;

        try {
            if (dropPreview) {
                result = handleDropInGroup(ctx, dropPreview, snapshot);
            } else {
                result = handleDropOutsideGroup(ctx, snapshot, currentDragPos);
            }

            if (onDragEnd && result.action !== 'no-change') {
                onDragEnd(result);
            }
        } catch (error) {
            console.error('[useSortableGrid] endDrag error:', error);
            // 에러 시 롤백
            onTasksUpdate(tasksRef.current.map(t =>
                t.id === ctx.taskId
                    ? { ...t, x: snapshot.x, y: snapshot.y, column_id: snapshot.column_id }
                    : t
            ));
        } finally {
            resetDragState();
        }
    }, [dropPreview, handleDropInGroup, handleDropOutsideGroup, onTasksUpdate, onDragEnd]);

    // ========== 드래그 취소 ==========
    const cancelDrag = useCallback(() => {
        const ctx = dragContextRef.current;
        if (ctx) {
            // 원래 위치로 복원
            onTasksUpdate(tasksRef.current.map(t =>
                t.id === ctx.taskId
                    ? {
                        ...t,
                        x: ctx.snapshot.x,
                        y: ctx.snapshot.y,
                        column_id: ctx.snapshot.column_id,
                    }
                    : t
            ));
        }
        resetDragState();
    }, [onTasksUpdate]);

    // ========== 상태 초기화 ==========
    const resetDragState = useCallback(() => {
        setDragContext(null);
        setDropPreview(null);
        setCardTransitions({});
        setHighlightedGroupId(null);
    }, []);

    // ========== ESC 키로 드래그 취소 ==========
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && dragContextRef.current) {
                cancelDrag();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancelDrag]);

    // ========== 유틸리티 메서드 ==========
    const isTaskBeingDragged = useCallback((taskId: number): boolean => {
        return dragContextRef.current?.taskId === taskId;
    }, []);

    const getCardTransition = useCallback((taskId: number) => {
        return cardTransitions[taskId] ?? { x: 0, y: 0 };
    }, [cardTransitions]);

    const isGroupHighlighted = useCallback((groupId: number): boolean => {
        if (dropPreview?.groupId === groupId) return true;
        if (highlightedGroupId === groupId) return true;
        return false;
    }, [dropPreview, highlightedGroupId]);

    // ========== 자유 카드 드래그 시 드롭 프리뷰 ==========
    const setFreeCardPreview = useCallback((
        groupId: number | null,
        absoluteX: number = 0,
        absoluteY: number = 0,
        excludeTaskId?: number
    ) => {
        if (groupId === null) {
            setDropPreview(null);
            setCardTransitions({});
            setHighlightedGroupId(null);
            return;
        }
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;

        const groupCards = getGroupCardsSorted(tasksRef.current, groupId)
            .filter(t => t.id !== excludeTaskId);
        const dropIndex = absolutePositionToIndex(
            absoluteX, absoluteY,
            group.x, group.y,
            groupCards.length,
            gridConfig
        );
        const absolutePos = indexToAbsolutePosition(dropIndex, group.x, group.y, gridConfig);
        setDropPreview({
            groupId,
            index: dropIndex,
            absoluteX: absolutePos.x,
            absoluteY: absolutePos.y,
        });
        calculateShiftTransitions(groupId, dropIndex, groupCards, group);
        setHighlightedGroupId(groupId);
    }, [gridConfig, calculateShiftTransitions]);

    /**
     * 카드의 절대 좌표 조회 (연결선 등 외부 컴포넌트용)
     */
    const getCardAbsoluteCoord = useCallback((taskId: number): { x: number; y: number } | null => {
        const task = tasksRef.current.find(t => t.id === taskId);
        if (!task) return null;

        const group = task.column_id
            ? groupsRef.current.find(g => g.id === task.column_id)
            : null;

        return getCardAbsolutePosition(task, group ?? null);
    }, [getCardAbsolutePosition]);

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
        getCardAbsoluteCoord,
        setFreeCardPreview,
        gridConfig,
    };
}

export default useSortableGrid;
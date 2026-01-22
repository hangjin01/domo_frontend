'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Task, Group } from '../types/index';

// ============================================
// 타입 정의
// ============================================

export interface GridConfig {
    columns: number;           // 그리드 열 수 (1 = 리스트, 2+ = 그리드)
    cardWidth: number;         // 카드 너비
    cardHeight: number;        // 카드 높이
    gap: number;               // 카드 간격
    padding: number;           // 그룹 내부 패딩
    headerHeight: number;      // 그룹 헤더 높이
}

export interface DragContext {
    taskId: number;
    sourceGroupId: number | null;
    sourceIndex: number;
    startX: number;
    startY: number;
    offsetX: number;           // 카드 내에서 클릭한 위치 오프셋
    offsetY: number;
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
    translateY?: number;        // 밀려나는 애니메이션용
    translateX?: number;
}

// ============================================
// 상수
// ============================================

const DEFAULT_CONFIG: GridConfig = {
    columns: 1,                // 기본: 세로 리스트
    cardWidth: 260,
    cardHeight: 120,
    gap: 12,
    padding: 20,
    headerHeight: 50,
};

const ANIMATION_DURATION = 200; // ms

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 그리드 인덱스를 x, y 좌표로 변환
 */
function indexToPosition(
    index: number,
    groupX: number,
    groupY: number,
    config: GridConfig
): { x: number; y: number } {
    const col = index % config.columns;
    const row = Math.floor(index / config.columns);

    return {
        x: groupX + config.padding + col * (config.cardWidth + config.gap),
        y: groupY + config.headerHeight + config.padding + row * (config.cardHeight + config.gap),
    };
}

/**
 * x, y 좌표를 그리드 인덱스로 변환 (드롭 위치 계산)
 */
function positionToIndex(
    x: number,
    y: number,
    groupX: number,
    groupY: number,
    totalCards: number,
    config: GridConfig
): number {
    // 그룹 내 상대 좌표
    const relX = x - groupX - config.padding;
    const relY = y - groupY - config.headerHeight - config.padding;

    // 열/행 계산
    const col = Math.max(0, Math.min(
        config.columns - 1,
        Math.round(relX / (config.cardWidth + config.gap))
    ));
    const row = Math.max(0, Math.round(relY / (config.cardHeight + config.gap)));

    // 인덱스 계산 (최대값 제한)
    const index = row * config.columns + col;
    return Math.max(0, Math.min(totalCards, index));
}

/**
 * 포인트가 그룹 영역 내에 있는지 확인
 */
function isPointInGroup(
    x: number,
    y: number,
    group: Group
): boolean {
    return (
        x >= group.x &&
        x <= group.x + group.width &&
        y >= group.y &&
        y <= group.y + group.height
    );
}

/**
 * 그룹 내 카드들을 order 기준으로 정렬
 */
function getGroupCards(tasks: Task[], groupId: number): Task[] {
    return tasks
        .filter(t => t.column_id === groupId)
        .sort((a, b) => {
            // order 필드가 있으면 사용, 없으면 id로 정렬
            const orderA = (a as any).order ?? a.id;
            const orderB = (b as any).order ?? b.id;
            return orderA - orderB;
        });
}

// ============================================
// 메인 훅
// ============================================

export function useSortableGrid(
    tasks: Task[],
    groups: Group[],
    onTasksUpdate: (tasks: Task[]) => void,
    onTaskMove?: (taskId: number, groupId: number | null, newIndex: number) => Promise<void>,
    config: Partial<GridConfig> = {}
) {
    const gridConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

    // 드래그 상태
    const [dragContext, setDragContext] = useState<DragContext | null>(null);
    const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
    const [cardTransitions, setCardTransitions] = useState<Map<number, { x: number; y: number }>>(new Map());

    // Ref로 최신 상태 유지 (클로저 문제 방지)
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const groupsRef = useRef(groups);
    groupsRef.current = groups;

    /**
     * 모든 카드의 현재 위치 계산 (드롭 프리뷰 포함)
     */
    const cardPositions = useMemo((): CardPosition[] => {
        const positions: CardPosition[] = [];

        for (const group of groups) {
            const groupCards = getGroupCards(tasks, group.id);

            // 드롭 프리뷰가 이 그룹에 있으면 플레이스홀더 포함
            const hasPreviewInGroup = dropPreview?.groupId === group.id;
            const previewIndex = dropPreview?.index ?? -1;

            let visualIndex = 0;

            for (let i = 0; i <= groupCards.length; i++) {
                // 플레이스홀더 삽입 위치
                if (hasPreviewInGroup && i === previewIndex) {
                    const pos = indexToPosition(visualIndex, group.x, group.y, gridConfig);
                    positions.push({
                        taskId: -1, // 플레이스홀더
                        groupId: group.id,
                        index: previewIndex,
                        x: pos.x,
                        y: pos.y,
                        isPlaceholder: true,
                    });
                    visualIndex++;
                }

                // 실제 카드
                if (i < groupCards.length) {
                    const task = groupCards[i];

                    // 드래그 중인 카드는 건너뜀 (원래 위치에서 제외)
                    if (dragContext && task.id === dragContext.taskId) {
                        continue;
                    }

                    const pos = indexToPosition(visualIndex, group.x, group.y, gridConfig);
                    const transition = cardTransitions.get(task.id);

                    positions.push({
                        taskId: task.id,
                        groupId: group.id,
                        index: i,
                        x: pos.x,
                        y: pos.y,
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

    /**
     * 드래그 시작
     */
    const startDrag = useCallback((
        taskId: number,
        clientX: number,
        clientY: number,
        cardRect: DOMRect
    ) => {
        const task = tasksRef.current.find(t => t.id === taskId);
        if (!task) return;

        const sourceGroupId = task.column_id ?? null;
        const sourceGroup = sourceGroupId
            ? groupsRef.current.find(g => g.id === sourceGroupId)
            : null;

        // 소스 그룹 내에서의 인덱스
        const sourceIndex = sourceGroup
            ? getGroupCards(tasksRef.current, sourceGroup.id).findIndex(t => t.id === taskId)
            : -1;

        setDragContext({
            taskId,
            sourceGroupId,
            sourceIndex,
            startX: clientX,
            startY: clientY,
            offsetX: clientX - cardRect.left,
            offsetY: clientY - cardRect.top,
        });

        // 초기 드롭 프리뷰 (원래 위치)
        if (sourceGroupId !== null && sourceIndex !== -1) {
            const pos = indexToPosition(sourceIndex, sourceGroup!.x, sourceGroup!.y, gridConfig);
            setDropPreview({
                groupId: sourceGroupId,
                index: sourceIndex,
                x: pos.x,
                y: pos.y,
            });
        }
    }, [gridConfig]);

    /**
     * 드래그 중 - 드롭 위치 계산 및 카드 밀어내기
     */
    const updateDrag = useCallback((
        clientX: number,
        clientY: number,
        canvasScrollX: number = 0,
        canvasScrollY: number = 0
    ) => {
        if (!dragContext) return { x: 0, y: 0 };

        // 드래그 중인 카드의 현재 위치 (캔버스 좌표)
        const dragX = clientX + canvasScrollX - dragContext.offsetX;
        const dragY = clientY + canvasScrollY - dragContext.offsetY;

        // 카드 중심점
        const centerX = dragX + gridConfig.cardWidth / 2;
        const centerY = dragY + gridConfig.cardHeight / 2;

        // 어떤 그룹 위에 있는지 확인
        let targetGroup: Group | null = null;
        for (const group of groupsRef.current) {
            if (isPointInGroup(centerX, centerY, group)) {
                targetGroup = group;
                break;
            }
        }

        if (targetGroup) {
            // 그룹 내 드롭 인덱스 계산
            const groupCards = getGroupCards(tasksRef.current, targetGroup.id)
                .filter(t => t.id !== dragContext.taskId);

            const dropIndex = positionToIndex(
                centerX,
                centerY,
                targetGroup.x,
                targetGroup.y,
                groupCards.length,
                gridConfig
            );

            const pos = indexToPosition(dropIndex, targetGroup.x, targetGroup.y, gridConfig);

            setDropPreview({
                groupId: targetGroup.id,
                index: dropIndex,
                x: pos.x,
                y: pos.y,
            });

            // 밀어내기 애니메이션 계산
            calculateShiftTransitions(targetGroup.id, dropIndex, groupCards);
        } else {
            // 그룹 밖 - 프리뷰 제거
            setDropPreview(null);
            setCardTransitions(new Map());
        }

        return { x: dragX, y: dragY };
    }, [dragContext, gridConfig]);

    /**
     * 카드 밀어내기 트랜지션 계산
     */
    const calculateShiftTransitions = useCallback((
        groupId: number,
        dropIndex: number,
        groupCards: Task[]
    ) => {
        const newTransitions = new Map<number, { x: number; y: number }>();
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;

        // dropIndex 이후의 카드들은 한 칸씩 뒤로 밀림
        for (let i = dropIndex; i < groupCards.length; i++) {
            const task = groupCards[i];

            // 현재 위치 (밀리기 전)
            const currentPos = indexToPosition(i, group.x, group.y, gridConfig);
            // 밀린 후 위치
            const shiftedPos = indexToPosition(i + 1, group.x, group.y, gridConfig);

            newTransitions.set(task.id, {
                x: shiftedPos.x - currentPos.x,
                y: shiftedPos.y - currentPos.y,
            });
        }

        setCardTransitions(newTransitions);
    }, [gridConfig]);

    /**
     * 드래그 종료 - 카드 배치 확정
     */
    const endDrag = useCallback(async () => {
        if (!dragContext) return;

        const task = tasksRef.current.find(t => t.id === dragContext.taskId);
        if (!task) {
            resetDragState();
            return;
        }

        if (dropPreview) {
            // 그룹 내 배치
            const groupCards = getGroupCards(tasksRef.current, dropPreview.groupId)
                .filter(t => t.id !== dragContext.taskId);

            // 새 순서 배열 생성
            const newOrder = [...groupCards];
            newOrder.splice(dropPreview.index, 0, task);

            // tasks 업데이트 (column_id + 순서)
            const updatedTasks = tasksRef.current.map(t => {
                if (t.id === dragContext.taskId) {
                    return {
                        ...t,
                        column_id: dropPreview.groupId,
                        x: dropPreview.x,
                        y: dropPreview.y,
                    };
                }

                // 같은 그룹 내 다른 카드들 위치 재계산
                const orderIndex = newOrder.findIndex(ot => ot.id === t.id);
                if (orderIndex !== -1 && t.column_id === dropPreview.groupId) {
                    const group = groupsRef.current.find(g => g.id === dropPreview.groupId);
                    if (group) {
                        const pos = indexToPosition(orderIndex, group.x, group.y, gridConfig);
                        return { ...t, x: pos.x, y: pos.y };
                    }
                }

                return t;
            });

            onTasksUpdate(updatedTasks);

            // 백엔드 업데이트
            if (onTaskMove) {
                await onTaskMove(dragContext.taskId, dropPreview.groupId, dropPreview.index);
            }
        } else {
            // 자유 배치 (그룹 밖)
            // 현재 위치 유지 - 별도 처리 필요 시 여기에 추가
        }

        resetDragState();
    }, [dragContext, dropPreview, onTasksUpdate, onTaskMove, gridConfig]);

    /**
     * 드래그 취소
     */
    const cancelDrag = useCallback(() => {
        resetDragState();
    }, []);

    /**
     * 상태 초기화
     */
    const resetDragState = () => {
        setDragContext(null);
        setDropPreview(null);
        setCardTransitions(new Map());
    };

    /**
     * 특정 카드가 드래그 중인지 확인
     */
    const isTaskBeingDragged = useCallback((taskId: number): boolean => {
        return dragContext?.taskId === taskId;
    }, [dragContext]);

    /**
     * 특정 카드의 현재 트랜지션 값
     */
    const getCardTransition = useCallback((taskId: number) => {
        return cardTransitions.get(taskId) ?? { x: 0, y: 0 };
    }, [cardTransitions]);

    return {
        // 상태
        dragContext,
        dropPreview,
        cardPositions,
        isDragging: dragContext !== null,

        // 메서드
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,

        // 유틸리티
        isTaskBeingDragged,
        getCardTransition,

        // 설정
        gridConfig,
    };
}

export default useSortableGrid;
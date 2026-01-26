/**
 * Group Layout Utilities
 *
 * 그룹 레이아웃 계산의 단일 진실 공급원 (Single Source of Truth)
 *
 * @description
 * 이 모듈은 그룹과 관련된 모든 레이아웃 계산을 중앙화합니다:
 * - 그룹 생성 시 크기 및 카드 배치
 * - 카드 추가/제거 시 레이아웃 재계산
 * - 그룹 리사이징 시 카드 재배치
 *
 * 사용처:
 * - BoardCanvas.tsx (그룹 생성, 카드 드롭)
 * - useSortableGrid.ts (드래그 앤 드롭)
 * - SortableGroup.tsx (렌더링)
 */

import {
    GridConfig,
    DEFAULT_GRID_CONFIG,
    indexToAbsolutePosition,
} from '@/src/models/constants/grid';

// ============================================
// 타입 정의
// ============================================

/** 카드 위치 정보 */
export interface CardPosition {
    taskId: number;
    x: number;
    y: number;
}

/** 그룹 크기 정보 */
export interface GroupDimensions {
    width: number;
    height: number;
}

/** 그룹 레이아웃 계산 결과 */
export interface GroupLayoutResult {
    /** 그룹 크기 */
    dimensions: GroupDimensions;
    /** 카드들의 새 위치 */
    cardPositions: CardPosition[];
}

/** 그룹 생성 결과 (위치 포함) */
export interface GroupCreationResult {
    /** 그룹 위치 및 크기 */
    group: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** 카드들의 새 위치 */
    cardPositions: CardPosition[];
}

// ============================================
// 핵심 계산 함수
// ============================================

/**
 * 카드 개수에 따른 그룹 크기 계산
 *
 * @param cardCount - 그룹 내 카드 수
 * @param config - 그리드 설정
 * @returns 그룹 크기 (width, height)
 */
export function calculateGroupDimensions(
    cardCount: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupDimensions {
    const rows = Math.max(1, Math.ceil(cardCount / config.columns));

    // 너비: 패딩 + (카드너비 × 열수) + (간격 × (열수-1)) + 패딩
    const width = config.padding * 2 +
        config.columns * config.cardWidth +
        (config.columns - 1) * config.gap;

    // 높이: 헤더 + 패딩 + (카드높이 × 행수) + (간격 × (행수-1)) + 패딩
    const height = config.headerHeight +
        config.padding * 2 +
        rows * config.cardHeight +
        Math.max(0, rows - 1) * config.gap;

    return { width, height };
}

/**
 * 그룹 내 카드들의 그리드 좌표 계산
 *
 * @param taskIds - 카드 ID 배열 (순서대로 배치)
 * @param groupX - 그룹 X 좌표
 * @param groupY - 그룹 Y 좌표
 * @param config - 그리드 설정
 * @returns 각 카드의 새 좌표
 */
export function calculateCardPositions(
    taskIds: number[],
    groupX: number,
    groupY: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): CardPosition[] {
    return taskIds.map((taskId, index) => {
        const pos = indexToAbsolutePosition(index, groupX, groupY, config);
        return {
            taskId,
            x: pos.x,
            y: pos.y,
        };
    });
}

/**
 * 그룹 레이아웃 전체 계산 (크기 + 카드 위치)
 *
 * @description
 * 그룹의 크기와 내부 카드들의 위치를 한 번에 계산합니다.
 * 그룹 생성, 카드 추가/제거, 리사이징 시 사용합니다.
 *
 * @param taskIds - 카드 ID 배열
 * @param groupX - 그룹 X 좌표
 * @param groupY - 그룹 Y 좌표
 * @param config - 그리드 설정
 * @returns 그룹 크기 및 카드 위치
 */
export function calculateGroupLayout(
    taskIds: number[],
    groupX: number,
    groupY: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupLayoutResult {
    return {
        dimensions: calculateGroupDimensions(taskIds.length, config),
        cardPositions: calculateCardPositions(taskIds, groupX, groupY, config),
    };
}

// ============================================
// 그룹 생성 전용 함수
// ============================================

/**
 * 새 그룹 생성 시 위치, 크기, 카드 배치 계산
 *
 * @description
 * 선택된 카드들의 중심점을 기준으로 그룹 위치를 결정하고,
 * 카드들을 그리드 레이아웃에 맞게 재배치합니다.
 *
 * @param selectedCards - 선택된 카드들 (id, x, y 필요)
 * @param config - 그리드 설정
 * @returns 그룹 정보 및 카드 새 위치
 */
export function calculateGroupCreation(
    selectedCards: Array<{ id: number; x?: number; y?: number }>,
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupCreationResult {
    if (selectedCards.length === 0) {
        throw new Error('그룹을 생성하려면 최소 1개의 카드가 필요합니다.');
    }

    // 1. 선택된 카드들의 바운딩 박스 중심점 계산
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    selectedCards.forEach(card => {
        const x = card.x ?? 0;
        const y = card.y ?? 0;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + config.cardWidth);
        maxY = Math.max(maxY, y + config.cardHeight);
    });

    // 바운딩 박스 중심점
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 2. 그룹 크기 계산
    const dimensions = calculateGroupDimensions(selectedCards.length, config);

    // 3. 그룹 위치 계산 (중심점 기준)
    const groupX = Math.round(centerX - dimensions.width / 2);
    const groupY = Math.round(centerY - dimensions.height / 2);

    // 4. 카드들의 새 위치 계산
    const taskIds = selectedCards.map(card => card.id);
    const cardPositions = calculateCardPositions(taskIds, groupX, groupY, config);

    return {
        group: {
            x: groupX,
            y: groupY,
            width: dimensions.width,
            height: dimensions.height,
        },
        cardPositions,
    };
}

// ============================================
// 카드 추가/제거 시 레이아웃 재계산
// ============================================

/**
 * 그룹에 카드 추가 시 레이아웃 재계산
 *
 * @param existingTaskIds - 기존 카드 ID 배열
 * @param newTaskId - 추가할 카드 ID
 * @param insertIndex - 삽입 위치 (기본: 마지막)
 * @param groupX - 그룹 X 좌표
 * @param groupY - 그룹 Y 좌표
 * @param config - 그리드 설정
 * @returns 그룹 새 크기 및 모든 카드 위치
 */
export function calculateLayoutAfterAddCard(
    existingTaskIds: number[],
    newTaskId: number,
    insertIndex: number = existingTaskIds.length,
    groupX: number,
    groupY: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupLayoutResult {
    // 새 카드를 지정된 위치에 삽입
    const newTaskIds = [...existingTaskIds];
    newTaskIds.splice(insertIndex, 0, newTaskId);

    return calculateGroupLayout(newTaskIds, groupX, groupY, config);
}

/**
 * 그룹에서 카드 제거 시 레이아웃 재계산
 *
 * @param existingTaskIds - 기존 카드 ID 배열
 * @param removeTaskId - 제거할 카드 ID
 * @param groupX - 그룹 X 좌표
 * @param groupY - 그룹 Y 좌표
 * @param config - 그리드 설정
 * @returns 그룹 새 크기 및 남은 카드 위치
 */
export function calculateLayoutAfterRemoveCard(
    existingTaskIds: number[],
    removeTaskId: number,
    groupX: number,
    groupY: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupLayoutResult {
    const newTaskIds = existingTaskIds.filter(id => id !== removeTaskId);
    return calculateGroupLayout(newTaskIds, groupX, groupY, config);
}

// ============================================
// 그룹 크기 자동 조정
// ============================================

/**
 * 카드 수에 맞게 그룹 크기 자동 조정이 필요한지 확인
 *
 * @param currentWidth - 현재 그룹 너비
 * @param currentHeight - 현재 그룹 높이
 * @param cardCount - 카드 수
 * @param config - 그리드 설정
 * @returns 조정 필요 여부 및 새 크기
 */
export function shouldResizeGroup(
    currentWidth: number,
    currentHeight: number,
    cardCount: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): { needsResize: boolean; newDimensions?: GroupDimensions } {
    const idealDimensions = calculateGroupDimensions(cardCount, config);

    // 허용 오차 (10px)
    const tolerance = 10;

    const widthDiff = Math.abs(currentWidth - idealDimensions.width);
    const heightDiff = Math.abs(currentHeight - idealDimensions.height);

    if (widthDiff > tolerance || heightDiff > tolerance) {
        return {
            needsResize: true,
            newDimensions: idealDimensions,
        };
    }

    return { needsResize: false };
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 카드가 그룹 내 몇 번째 인덱스에 위치하는지 계산
 *
 * @param cardX - 카드 X 좌표
 * @param cardY - 카드 Y 좌표
 * @param groupX - 그룹 X 좌표
 * @param groupY - 그룹 Y 좌표
 * @param totalCards - 그룹 내 총 카드 수
 * @param config - 그리드 설정
 * @returns 인덱스 (0부터 시작)
 */
export function calculateCardIndex(
    cardX: number,
    cardY: number,
    groupX: number,
    groupY: number,
    totalCards: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): number {
    const relX = cardX - groupX - config.padding;
    const relY = cardY - groupY - config.headerHeight - config.padding;

    const col = Math.max(0, Math.min(
        config.columns - 1,
        Math.round(relX / (config.cardWidth + config.gap))
    ));
    const row = Math.max(0, Math.round(relY / (config.cardHeight + config.gap)));

    const index = row * config.columns + col;
    return Math.max(0, Math.min(totalCards, index));
}

/**
 * 그룹 최소 크기 계산 (빈 그룹 포함)
 *
 * @param config - 그리드 설정
 * @returns 최소 크기
 */
export function getMinimumGroupDimensions(
    config: GridConfig = DEFAULT_GRID_CONFIG
): GroupDimensions {
    return calculateGroupDimensions(1, config);
}

export default {
    calculateGroupDimensions,
    calculateCardPositions,
    calculateGroupLayout,
    calculateGroupCreation,
    calculateLayoutAfterAddCard,
    calculateLayoutAfterRemoveCard,
    shouldResizeGroup,
    calculateCardIndex,
    getMinimumGroupDimensions,
};
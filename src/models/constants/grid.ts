/**
 * Grid & Card Constants
 * 
 * 모든 그리드, 카드, 드래그 관련 상수의 단일 진실 공급원 (Single Source of Truth)
 * 
 * @description
 * 이 파일은 다음 컴포넌트들에서 사용됩니다:
 * - BoardCanvas.tsx (그리드 레이아웃)
 * - TaskCard.tsx (카드 크기)
 * - useSortableGrid.ts (드래그 계산)
 * - SortableGroup.tsx (그룹 레이아웃)
 */

// ============================================
// 카드 크기 상수
// ============================================

/** 카드 너비 (px) */
export const CARD_WIDTH = 280;

/** 카드 높이 (px) - 기본 높이, 확장 시 변경 가능 */
export const CARD_HEIGHT = 140;

/** 카드 최소 높이 (px) */
export const CARD_MIN_HEIGHT = 100;

// ============================================
// 그리드 레이아웃 상수
// ============================================

/** 그리드 열 수 (세로 리스트 = 1) */
export const GRID_COLUMNS = 1;

/** 카드 간 간격 (px) */
export const GRID_GAP = 12;

/** 그룹 내부 패딩 (px) */
export const GRID_PADDING = 20;

/** 그룹 헤더 높이 (px) */
export const GROUP_HEADER_HEIGHT = 50;

// ============================================
// 드래그 관련 상수
// ============================================

/** 드래그 시작 임계값 (px) - 이 거리 이상 이동해야 드래그 시작 */
export const DRAG_THRESHOLD = 8;

/** 스냅 임계값 (px) - 그리드 스냅 시 사용 */
export const SNAP_THRESHOLD = 60;

/** 애니메이션 지속 시간 (ms) */
export const ANIMATION_DURATION = 200;

// ============================================
// 그룹 관련 상수
// ============================================

/** 그룹 최소 너비 (px) */
export const GROUP_MIN_WIDTH = 320;

/** 그룹 최소 높이 (px) */
export const GROUP_MIN_HEIGHT = 200;

/** 그룹 기본 너비 (px) */
export const GROUP_DEFAULT_WIDTH = 320;

/** 그룹 기본 높이 (px) */
export const GROUP_DEFAULT_HEIGHT = 400;

// ============================================
// 복합 설정 객체
// ============================================

export interface GridConfig {
    columns: number;
    cardWidth: number;
    cardHeight: number;
    gap: number;
    padding: number;
    headerHeight: number;
}

/** 기본 그리드 설정 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
    columns: GRID_COLUMNS,
    cardWidth: CARD_WIDTH,
    cardHeight: CARD_HEIGHT,
    gap: GRID_GAP,
    padding: GRID_PADDING,
    headerHeight: GROUP_HEADER_HEIGHT,
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 그리드 인덱스를 절대 좌표로 변환
 * 
 * @param index - 그리드 내 인덱스 (0부터 시작)
 * @param groupX - 그룹의 X 좌표
 * @param groupY - 그룹의 Y 좌표
 * @param config - 그리드 설정 (선택, 기본값 사용 가능)
 * @returns 절대 좌표 { x, y }
 */
export function indexToAbsolutePosition(
    index: number,
    groupX: number,
    groupY: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): { x: number; y: number } {
    const col = index % config.columns;
    const row = Math.floor(index / config.columns);

    return {
        x: groupX + config.padding + col * (config.cardWidth + config.gap),
        y: groupY + config.headerHeight + config.padding + row * (config.cardHeight + config.gap),
    };
}

/**
 * 절대 좌표를 그리드 인덱스로 변환
 * 
 * @param x - 절대 X 좌표
 * @param y - 절대 Y 좌표
 * @param groupX - 그룹의 X 좌표
 * @param groupY - 그룹의 Y 좌표
 * @param totalCards - 그룹 내 총 카드 수
 * @param config - 그리드 설정 (선택)
 * @returns 그리드 인덱스 (0 ~ totalCards)
 */
export function absolutePositionToIndex(
    x: number,
    y: number,
    groupX: number,
    groupY: number,
    totalCards: number,
    config: GridConfig = DEFAULT_GRID_CONFIG
): number {
    const relX = x - groupX - config.padding;
    const relY = y - groupY - config.headerHeight - config.padding;

    const col = Math.max(0, Math.min(
        config.columns - 1,
        Math.round(relX / (config.cardWidth + config.gap))
    ));
    const row = Math.max(0, Math.round(relY / (config.cardHeight + config.gap)));

    const index = row * config.columns + col;
    return Math.max(0, Math.min(totalCards, index));
}

/**
 * 포인트가 그룹 영역 내에 있는지 확인
 * 
 * @param x - 확인할 X 좌표
 * @param y - 확인할 Y 좌표
 * @param group - 그룹 객체 (x, y, width, height 필요)
 * @returns 그룹 내부면 true
 */
export function isPointInGroup(
    x: number,
    y: number,
    group: { x: number; y: number; width: number; height: number }
): boolean {
    return (
        x >= group.x &&
        x <= group.x + group.width &&
        y >= group.y &&
        y <= group.y + group.height
    );
}

/**
 * 카드 중심점이 그룹 영역 내에 있는지 확인
 * 
 * @param cardX - 카드의 X 좌표 (좌상단)
 * @param cardY - 카드의 Y 좌표 (좌상단)
 * @param group - 그룹 객체
 * @param config - 그리드 설정 (선택)
 * @returns 카드 중심이 그룹 내부면 true
 */
export function isCardCenterInGroup(
    cardX: number,
    cardY: number,
    group: { x: number; y: number; width: number; height: number },
    config: GridConfig = DEFAULT_GRID_CONFIG
): boolean {
    const centerX = cardX + config.cardWidth / 2;
    const centerY = cardY + config.cardHeight / 2;
    return isPointInGroup(centerX, centerY, group);
}

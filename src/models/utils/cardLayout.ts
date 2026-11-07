import type { Task, Group } from '../types';
import { DEFAULT_GRID_CONFIG, indexToRelativePosition } from '../constants/grid';

/** 실제 카드와 슬롯 계산이 공유하는 크기. 기존 카드도 기본 크기로 표시합니다. */
export function cardSize(task: Pick<Task, 'width' | 'height'>) {
  const clamp = (n: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n!))) : fallback;
  return { width: clamp(task.width, 280, 220, 800), height: clamp(task.height, 140, 100, 800) };
}
export function groupGrid(tasks: Task[]) {
  return { ...DEFAULT_GRID_CONFIG,
    cardWidth: Math.max(280, ...tasks.map(t => cardSize(t).width)),
    cardHeight: Math.max(140, ...tasks.map(t => cardSize(t).height)),
  };
}
export function orderedCards(tasks: Task[], groupId: number) {
  return tasks.filter(t => t.column_id === groupId).sort((a, b) => a.y - b.y || a.x - b.x || a.id - b.id);
}
/** 그룹 카드는 저장 좌표를 순서로만 사용하고 동일한 슬롯에 정렬합니다.
 * 오래된 어긋난 좌표도 데이터 삭제 없이 화면에서 복구하며 다음 드롭 때 정상 좌표를 저장합니다. */
export function groupedPosition(task: Task, group: Group, tasks: Task[]) {
  const cards = orderedCards(tasks, group.id);
  const pos = indexToRelativePosition(Math.max(0, cards.findIndex(t => t.id === task.id)), groupGrid(cards));
  return { x: group.x + pos.x, y: group.y + pos.y };
}
export function fitGroup(group: Group, tasks: Task[]) {
  const cards = orderedCards(tasks, group.id), grid = groupGrid(cards);
  return { ...group, width: Math.max(group.width, grid.padding * 2 + grid.cardWidth),
    height: Math.max(group.height, grid.headerHeight + grid.padding * 2 + Math.max(1, cards.length) * (grid.cardHeight + grid.gap) - grid.gap) };
}

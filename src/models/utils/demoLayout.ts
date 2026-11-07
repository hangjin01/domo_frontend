import type { Task, Group } from '../types';

/** 내용과 소속은 유지하고 좌표만 정리합니다. 그룹은 왼쪽, 자유 카드는 오른쪽 격자입니다. */
export function arrangeDemoLayout(tasks: Task[], groups: Group[], width: number) {
  const roots = groups.filter(group => !groups.some(parent => parent.id === group.parentId));
  const positions = new Map<number, { x: number; y: number }>();
  let top = 70;
  let lane = 0;
  for (const root of roots) {
    const descendants = new Set([root.id]);
    for (let pass = 0; pass < groups.length; pass++) {
      for (const group of groups) if (group.parentId != null && descendants.has(group.parentId)) descendants.add(group.id);
    }
    const dx = 20 - root.x, dy = top - root.y;
    let bottom = top + root.height;
    for (const group of groups.filter(group => descendants.has(group.id))) {
      const position = { x: group.x + dx, y: group.y + dy };
      positions.set(group.id, position);
      lane = Math.max(lane, position.x + group.width + 24);
      bottom = Math.max(bottom, position.y + group.height);
    }
    top = bottom + 70;
  }
  const stacked = width - lane < 300;
  const startX = stacked || !groups.length ? 20 : lane;
  const startY = stacked && groups.length ? top : 70;
  // 마지막 카드 뒤에는 간격이 필요 없으므로 24px을 돌려줍니다.
  const columns = Math.max(1, Math.floor((width - startX + 24) / 304));
  let index = 0;
  return {
    groups: groups.map(group => ({ ...group, ...positions.get(group.id) })),
    tasks: tasks.map(task => {
      if (groups.some(group => group.id === task.column_id)) return task;
      const slot = index++;
      return { ...task, x: startX + (slot % columns) * 304, y: startY + Math.floor(slot / columns) * 190 };
    }),
  };
}

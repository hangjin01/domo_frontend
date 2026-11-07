/**
 * [파일 안내] 보드의 반복 검색을 줄이는 순수 조회 함수입니다. 원본 카드/그룹을 수정하지 않습니다.
 * id 중복은 기존과 동일하게 첫 카드를 유지하고, 목록 순서와 객체 참조도 보존합니다.
 * 배열마다 findIndex/filter를 반복하던 작업을 Set/Map을 이용한 선형 순회로 바꿉니다.
 */
import type { Task, Group } from '../types';
import { groupedPosition } from './cardLayout';

/** 그룹만 제거하고 카드는 현재 화면의 절대 위치에 남깁니다.
 * 현재 렌더러의 그룹 x/y는 보드 좌표이며 카드 x/y만 소속 그룹 기준 좌표입니다.
 * 자식 그룹은 보드 위치를 유지한 채 최상위로 풀고, 남은 트리의 depth를 재계산합니다. */
export function removeBoardGroup(tasks: Task[], groups: Group[], groupId: number) {
  const removed = groups.find(group => group.id === groupId);
  if (!removed) return { tasks, groups };
  const remaining = groups.filter(group => group.id !== groupId).map(group => group.parentId === groupId ? { ...group, parentId: null } : { ...group });
  const byId = new Map(remaining.map(group => [group.id, group]));
  for (const group of remaining) {
    let parent = group.parentId, depth = 0;
    const seen = new Set([group.id]);
    while (parent != null && byId.has(parent) && !seen.has(parent)) {
      seen.add(parent); depth++; parent = byId.get(parent)!.parentId;
    }
    group.depth = depth;
  }
  return {
    groups: remaining,
    tasks: tasks.map(task => task.column_id === groupId ? {
      ...task, column_id: undefined, ...groupedPosition(task, removed, tasks),
    } : task),
  };
}

export function selectBoardTasks(tasks: Task[], boardId: number, projectId: number): Task[] {
  const seen = new Set<number>();
  return tasks.filter(task => {
    if (!(task.boardId === boardId || task.boardId === projectId || boardId === 1) || seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

export function indexBoardTasks(tasks: Task[], groups: Group[]) {
  const groupIds = new Set(groups.map(group => group.id));
  const byId = new Map<number, Task>();
  const byGroup = new Map<number, Task[]>();
  const free: Task[] = [];
  for (const task of tasks) {
    if (!byId.has(task.id)) byId.set(task.id, task);
    if (!task.column_id || !groupIds.has(task.column_id)) free.push(task);
    if (task.column_id !== undefined && task.column_id !== null) {
      const bucket = byGroup.get(task.column_id);
      if (bucket) bucket.push(task);
      else byGroup.set(task.column_id, [task]);
    }
  }
  return { byId, byGroup, free };
}

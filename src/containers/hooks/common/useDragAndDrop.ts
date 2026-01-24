'use client';

import { useState, useCallback, useRef } from 'react';
import { Task, Group } from '@/src/models/types';

// ============================================
// 타입 정의
// ============================================

export interface DragState {
  taskId: number;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  isDragging: boolean;
}

export interface DropZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetIndex: number;
  groupId?: number;
  type: 'before' | 'after' | 'into-group';
}

export interface DragPreview {
  taskId: number;
  x: number;
  y: number;
}

export interface TaskWithOffset extends Task {
  offsetY: number;
  isAnimating: boolean;
}

// ============================================
// 상수
// ============================================

const CARD_HEIGHT = 120;
const CARD_GAP = 12;
const DROP_ZONE_HEIGHT = 80;
const SNAP_THRESHOLD = 60; // 카드 근처로 드래그 시 스냅되는 거리
const ANIMATION_DURATION = 200; // ms

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 두 카드가 수직으로 겹치는지 확인
 */
function isVerticallyOverlapping(
  dragY: number,
  cardY: number,
  cardHeight: number = CARD_HEIGHT
): boolean {
  return dragY >= cardY - SNAP_THRESHOLD && dragY <= cardY + cardHeight + SNAP_THRESHOLD;
}

/**
 * 카드 그룹 내에서 드롭 가능한 위치 계산
 */
function calculateDropPositions(
  tasks: Task[],
  groupId: number,
  groupBounds: { x: number; y: number; width: number; height: number }
): DropZone[] {
  const zones: DropZone[] = [];
  
  // 그룹 내 카드들을 Y좌표로 정렬
  const groupTasks = tasks
    .filter(t => isTaskInGroup(t, groupBounds))
    .sort((a, b) => (a.y || 0) - (b.y || 0));

  if (groupTasks.length === 0) {
    // 빈 그룹 - 중앙에 드롭 존 생성
    zones.push({
      id: `drop-${groupId}-empty`,
      x: groupBounds.x + 20,
      y: groupBounds.y + 60, // 헤더 아래
      width: groupBounds.width - 40,
      height: DROP_ZONE_HEIGHT,
      targetIndex: 0,
      groupId,
      type: 'into-group',
    });
  } else {
    // 첫 번째 카드 위
    zones.push({
      id: `drop-${groupId}-before-0`,
      x: groupTasks[0].x - 10,
      y: (groupTasks[0].y || 0) - DROP_ZONE_HEIGHT / 2 - CARD_GAP / 2,
      width: 300,
      height: DROP_ZONE_HEIGHT,
      targetIndex: 0,
      groupId,
      type: 'before',
    });

    // 각 카드 사이
    for (let i = 0; i < groupTasks.length; i++) {
      const currentTask = groupTasks[i];
      const nextTask = groupTasks[i + 1];
      
      if (nextTask) {
        zones.push({
          id: `drop-${groupId}-between-${i}-${i + 1}`,
          x: currentTask.x - 10,
          y: (currentTask.y || 0) + CARD_HEIGHT + CARD_GAP / 2 - DROP_ZONE_HEIGHT / 2,
          width: 300,
          height: DROP_ZONE_HEIGHT,
          targetIndex: i + 1,
          groupId,
          type: 'after',
        });
      }
    }

    // 마지막 카드 아래
    const lastTask = groupTasks[groupTasks.length - 1];
    zones.push({
      id: `drop-${groupId}-after-last`,
      x: lastTask.x - 10,
      y: (lastTask.y || 0) + CARD_HEIGHT + CARD_GAP,
      width: 300,
      height: DROP_ZONE_HEIGHT,
      targetIndex: groupTasks.length,
      groupId,
      type: 'after',
    });
  }

  return zones;
}

/**
 * 카드가 그룹 내에 있는지 확인
 */
function isTaskInGroup(
  task: Task,
  groupBounds: { x: number; y: number; width: number; height: number }
): boolean {
  const tx = task.x || 0;
  const ty = task.y || 0;
  return (
    tx >= groupBounds.x &&
    tx <= groupBounds.x + groupBounds.width &&
    ty >= groupBounds.y &&
    ty <= groupBounds.y + groupBounds.height
  );
}

/**
 * 드래그 중인 카드의 위치에 가장 가까운 드롭 존 찾기
 */
function findNearestDropZone(
  dragX: number,
  dragY: number,
  dropZones: DropZone[]
): DropZone | null {
  let nearest: DropZone | null = null;
  let minDistance = Infinity;

  for (const zone of dropZones) {
    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;
    const distance = Math.sqrt(
      Math.pow(dragX - centerX, 2) + Math.pow(dragY - centerY, 2)
    );

    if (distance < minDistance && distance < SNAP_THRESHOLD * 2) {
      minDistance = distance;
      nearest = zone;
    }
  }

  return nearest;
}

// ============================================
// 메인 훅
// ============================================

export function useDragAndDrop(
  tasks: Task[],
  groups: Group[],
  onTasksUpdate: (tasks: Task[]) => void,
  onTaskMove?: (taskId: number, newX: number, newY: number, newGroupId?: number) => Promise<void>
) {
  // 드래그 상태
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null);
  const [taskOffsets, setTaskOffsets] = useState<Map<number, number>>(new Map());
  
  // 애니메이션 refs
  const animationFrameRef = useRef<number | null>(null);
  const dropZonesRef = useRef<DropZone[]>([]);

  /**
   * 드래그 시작
   */
  const startDrag = useCallback((
    taskId: number,
    startX: number,
    startY: number,
    initialX: number,
    initialY: number
  ) => {
    setDragState({
      taskId,
      startX,
      startY,
      initialX,
      initialY,
      isDragging: true,
    });

    // 모든 그룹에 대해 드롭 존 계산
    const allDropZones: DropZone[] = [];
    for (const group of groups) {
      const zones = calculateDropPositions(tasks, group.id, {
        x: group.x,
        y: group.y,
        width: group.width,
        height: group.height,
      });
      allDropZones.push(...zones);
    }
    dropZonesRef.current = allDropZones;
  }, [tasks, groups]);

  /**
   * 드래그 중 - 카드 밀어내기 애니메이션 계산
   */
  const updateDrag = useCallback((
    currentX: number,
    currentY: number
  ) => {
    if (!dragState) return;

    // 현재 드래그 위치 계산
    const deltaX = currentX - dragState.startX;
    const deltaY = currentY - dragState.startY;
    const dragX = dragState.initialX + deltaX;
    const dragY = dragState.initialY + deltaY;

    // 가장 가까운 드롭 존 찾기
    const nearestZone = findNearestDropZone(dragX, dragY, dropZonesRef.current);
    setActiveDropZone(nearestZone);

    // 다른 카드들의 오프셋 계산 (밀어내기 효과)
    const newOffsets = new Map<number, number>();
    
    if (nearestZone && nearestZone.groupId !== undefined) {
      const group = groups.find(g => g.id === nearestZone.groupId);
      if (group) {
        const groupTasks = tasks
          .filter(t => 
            t.id !== dragState.taskId && 
            isTaskInGroup(t, { x: group.x, y: group.y, width: group.width, height: group.height })
          )
          .sort((a, b) => (a.y || 0) - (b.y || 0));

        // 드롭 존 위치 이후의 카드들을 아래로 밀어내기
        for (let i = nearestZone.targetIndex; i < groupTasks.length; i++) {
          newOffsets.set(groupTasks[i].id, CARD_HEIGHT + CARD_GAP);
        }
      }
    }

    setTaskOffsets(newOffsets);

    // 드래그 중인 카드 위치 업데이트
    onTasksUpdate(tasks.map(t => 
      t.id === dragState.taskId 
        ? { ...t, x: dragX, y: dragY }
        : t
    ));
  }, [dragState, tasks, groups, onTasksUpdate]);

  /**
   * 드래그 종료
   */
  const endDrag = useCallback(async () => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState(null);
      setActiveDropZone(null);
      setTaskOffsets(new Map());
      return;
    }

    // 드롭 존이 있으면 해당 위치로 스냅
    if (activeDropZone && activeDropZone.groupId !== undefined) {
      const group = groups.find(g => g.id === activeDropZone.groupId);
      if (group) {
        const groupTasks = tasks
          .filter(t => 
            t.id !== dragState.taskId && 
            isTaskInGroup(t, { x: group.x, y: group.y, width: group.width, height: group.height })
          )
          .sort((a, b) => (a.y || 0) - (b.y || 0));

        // 새 위치 계산
        let newY: number;
        if (groupTasks.length === 0 || activeDropZone.targetIndex === 0) {
          newY = group.y + 60; // 그룹 상단
        } else if (activeDropZone.targetIndex >= groupTasks.length) {
          const lastTask = groupTasks[groupTasks.length - 1];
          newY = (lastTask.y || 0) + CARD_HEIGHT + CARD_GAP;
        } else {
          const prevTask = groupTasks[activeDropZone.targetIndex - 1];
          newY = (prevTask.y || 0) + CARD_HEIGHT + CARD_GAP;
        }

        const newX = group.x + 40; // 그룹 내 좌측 패딩

        // 다른 카드들 재정렬
        const updatedTasks = tasks.map(t => {
          if (t.id === dragState.taskId) {
            return { ...t, x: newX, y: newY };
          }
          
          // 드롭 위치 이후 카드들 아래로 이동
          const taskIndex = groupTasks.findIndex(gt => gt.id === t.id);
          if (taskIndex >= activeDropZone.targetIndex) {
            return { ...t, y: (t.y || 0) + CARD_HEIGHT + CARD_GAP };
          }
          
          return t;
        });

        onTasksUpdate(updatedTasks);

        // 백엔드 업데이트
        if (onTaskMove) {
          await onTaskMove(dragState.taskId, newX, newY, activeDropZone.groupId);
        }
      }
    } else {
      // 드롭 존 외부 - 위치 저장
      if (onTaskMove) {
        await onTaskMove(dragState.taskId, task.x || 0, task.y || 0);
      }
    }

    // 상태 초기화
    setDragState(null);
    setActiveDropZone(null);
    setTaskOffsets(new Map());
  }, [dragState, activeDropZone, tasks, groups, onTasksUpdate, onTaskMove]);

  /**
   * 드래그 취소
   */
  const cancelDrag = useCallback(() => {
    if (!dragState) return;

    // 원래 위치로 복원
    onTasksUpdate(tasks.map(t => 
      t.id === dragState.taskId 
        ? { ...t, x: dragState.initialX, y: dragState.initialY }
        : t
    ));

    setDragState(null);
    setActiveDropZone(null);
    setTaskOffsets(new Map());
  }, [dragState, tasks, onTasksUpdate]);

  /**
   * 카드의 렌더링 Y 오프셋 계산 (애니메이션용)
   */
  const getTaskRenderOffset = useCallback((taskId: number): number => {
    return taskOffsets.get(taskId) || 0;
  }, [taskOffsets]);

  /**
   * 드래그 중인지 확인
   */
  const isDragging = dragState?.isDragging ?? false;

  /**
   * 특정 카드가 드래그 중인지 확인
   */
  const isTaskBeingDragged = useCallback((taskId: number): boolean => {
    return dragState?.taskId === taskId && dragState?.isDragging;
  }, [dragState]);

  return {
    // 상태
    dragState,
    activeDropZone,
    isDragging,
    
    // 메서드
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    
    // 유틸리티
    getTaskRenderOffset,
    isTaskBeingDragged,
    
    // 드롭 존 (렌더링용)
    dropZones: dropZonesRef.current,
  };
}

export default useDragAndDrop;

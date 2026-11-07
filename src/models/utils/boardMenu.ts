/** 우클릭 시작 위치의 대상을 저장합니다. 포인터 캡처 후 event.target은 캔버스가 될 수 있습니다. */
export function getBoardMenuTarget(element: Element | null) {
  const task = element?.closest('[id^="task-"]');
  const match = task?.id.match(/^task-(\d+)$/);
  if (match) return { targetTaskId: Number(match[1]), targetGroupId: undefined };
  const group = element?.closest('[data-group-id]');
  const groupId = group?.getAttribute('data-group-id');
  return { targetTaskId: undefined, targetGroupId: groupId && /^\d+$/.test(groupId) ? Number(groupId) : undefined };
}

/** contextmenu가 pointerup보다 늦게 발생해도 캡처된 최초 대상을 우선합니다.
 * 캔버스를 누른 기록(빈 대상)도 유효하므로 이전 카드로 되돌아가면 안 됩니다. */
export function resolveBoardMenuTarget(start: ReturnType<typeof getBoardMenuTarget> | null, element: Element | null) {
  return start ?? getBoardMenuTarget(element);
}

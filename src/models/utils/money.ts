import type { Task, Connection } from '../types';

export const moneyLabels = { plus: '+ 금액', minus: '− 금액', sum: '총합', avg: '평균' };
export const formatMoney = (value: number) => `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function validMoney(m: NonNullable<Task['money']>) {
  const date = new Date(`${m.date}T00:00:00Z`);
  return Object.hasOwn(moneyLabels, m.mode) && Number.isSafeInteger(m.amount) && m.amount >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === m.date;
}
export type MoneyResult = { value: number | null; sources: number[]; error?: string };

/** 연결의 도착점에서 역방향 탐색합니다. 중간 합계를 다시 더하지 않고 원본 금액 ID를
 * 집합으로 수집하므로 분기/합류 경로에도 중복 합산하지 않습니다. 다른 프로젝트는 제외합니다. */
export function calculateMoney(tasks: Task[], connections: Connection[]): Map<number, MoneyResult> {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const parents = new Map<number, number[]>();
  for (const c of connections) {
    if (!byId.has(c.from) || !byId.has(c.to) || byId.get(c.from)!.boardId !== byId.get(c.to)!.boardId) continue;
    parents.set(c.to, [...(parents.get(c.to) ?? []), c.from]);
  }
  const results = new Map<number, MoneyResult>();
  for (const task of tasks) {
    if (!task.money) continue;
    if (!validMoney(task.money)) { results.set(task.id, { value: null, sources: [], error: '금액 또는 날짜를 확인하세요' }); continue; }
    if (task.money.mode === 'plus' || task.money.mode === 'minus') {
      results.set(task.id, { value: task.money.amount * (task.money.mode === 'minus' ? -1 : 1), sources: [task.id] }); continue;
    }
    const sources = new Set<number>();
    const visiting = new Set<number>();
    const visited = new Set<number>();
    let error: string | undefined;
    // 재귀 대신 명시적 스택을 사용하여 긴 카드 체인도 호출 스택을 넘치지 않게 합니다.
    const stack: [number, boolean][] = [[task.id, false]];
    while (stack.length) {
      const [id, exit] = stack.pop()!;
      if (exit) { visiting.delete(id); visited.add(id); continue; }
      if (visiting.has(id)) { error = '순환 연결: 연결 방향을 확인하세요'; break; }
      if (visited.has(id)) continue;
      visiting.add(id); stack.push([id, true]);
      const m = byId.get(id)?.money;
      if (m && !validMoney(m)) error = '연결 카드의 금액 또는 날짜를 확인하세요';
      if (m?.mode === 'plus' || m?.mode === 'minus') sources.add(id);
      for (const parent of parents.get(id) ?? []) stack.push([parent, false]);
    }
    const sum = [...sources].reduce((total, id) => {
      const m = byId.get(id)!.money!;
      if (!Number.isSafeInteger(m.amount)) return total;
      return total + BigInt(m.mode === 'minus' ? -m.amount : m.amount);
    }, BigInt(0));
    // 큰 양수/음수가 상쇄되는 경우도 중간 덧셈에서 정밀도를 잃지 않습니다.
    if (sum > BigInt(Number.MAX_SAFE_INTEGER) || sum < BigInt(Number.MIN_SAFE_INTEGER)) error = '계산 가능한 금액 범위를 초과했습니다';
    results.set(task.id, { sources: [...sources], value: error || !sources.size ? null : task.money.mode === 'avg' ? Number(sum) / sources.size : Number(sum), error });
  }
  return results;
}

/** 날짜 필터는 원본 카드 날짜에 적용합니다. 집계 카드는 거래 행에 포함하지 않습니다. */
export function moneyRows(tasks: Task[], start: string, end: string, sourceIds?: number[]) {
  return tasks.filter(t => t.money && (t.money.mode === 'plus' || t.money.mode === 'minus') &&
    (!start || t.money.date >= start) && (!end || t.money.date <= end) && (!sourceIds || sourceIds.includes(t.id)))
    .sort((a, b) => a.money!.date.localeCompare(b.money!.date) || a.id - b.id);
}

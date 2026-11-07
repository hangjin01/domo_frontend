'use client';
import React, { createContext, useContext, useState } from 'react';
import type { Task } from '@/src/models/types';
import { type MoneyResult, formatMoney, moneyLabels, todayLocal, validMoney } from '@/src/models/utils/money';

/** 계산 결과는 저장하지 않고 현재 보드 데이터에서 다시 만듭니다. */
export const MoneyContext = createContext<{ results: Map<number, MoneyResult>; tasks: Task[] }>({ results: new Map(), tasks: [] });
export function MoneyBadge({ task }: { task: Task }) {
  const { results } = useContext(MoneyContext);
  if (!task.money) return null;
  const result = results.get(task.id);
  return <div className="mt-2 rounded-lg bg-white text-gray-900 border border-gray-300 px-2 py-1 text-xs break-words" aria-label="카드 금액">
    <strong>{moneyLabels[task.money.mode]}: {result?.error ?? (result?.value == null ? '계산 대상 없음' : formatMoney(result.value))}</strong>
    <div className="text-gray-600">{task.money.date}</div>
  </div>;
}

export function MoneyFields({ task, onSave }: { task: Task; onSave: (task: Task) => void | Promise<void> }) {
  const [mode, setMode] = useState(task.money?.mode ?? 'none');
  const [amount, setAmount] = useState(String(task.money?.amount ?? 0));
  const [date, setDate] = useState(task.money?.date ?? todayLocal());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { results, tasks } = useContext(MoneyContext);
  const result = results.get(task.id);
  async function save() {
    const money = mode === 'none' ? null : { mode: mode as NonNullable<Task['money']>['mode'], amount: mode === 'plus' || mode === 'minus' ? Number(amount) : 0, date };
    if (money && (!validMoney(money) || ((mode === 'plus' || mode === 'minus') && !amount.trim()))) { setMessage('날짜와 0 이상의 정수 금액을 입력하세요.'); return; }
    setBusy(true); setMessage('');
    try { await onSave({ ...task, money }); setMessage('저장했습니다.'); }
    catch { setMessage('저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-gray-300 dark:border-gray-600 p-4 space-y-3">
    <h3 className="font-semibold">금액 옵션 · 원화</h3>
    <div className="flex flex-wrap gap-3">
      <label>계산 방식<select aria-label="계산 방식" value={mode} disabled={busy} onChange={e => setMode(e.target.value)} className="block rounded border p-2 bg-white text-gray-900"><option value="none">사용 안 함</option>{Object.entries(moneyLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {(mode === 'plus' || mode === 'minus') && <label>금액<input aria-label="금액" type="number" min="0" step="1" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} className="block w-40 rounded border p-2 bg-white text-gray-900" /></label>}
      {mode !== 'none' && <label>기준 날짜<input aria-label="금액 기준 날짜" type="date" value={date} disabled={busy} onChange={e => setDate(e.target.value)} className="block rounded border p-2 bg-white text-gray-900" /></label>}
    </div>
    <button disabled={busy} onClick={() => void save()} className="rounded-lg px-4 py-2 bg-blue-600 text-white disabled:opacity-50">{busy ? '저장 중…' : '금액 저장'}</button>
    <p role="status" className="text-sm">{message}</p>
    <MoneyBadge task={task} />
    {(task.money?.mode === 'sum' || task.money?.mode === 'avg') && <details><summary>계산에 포함된 카드 ({result?.sources.length ?? 0})</summary><p className="text-xs my-2">들어오는 연결의 원본 금액을 한 번씩 계산합니다. 평균은 부호를 포함하며 날짜 필터와 무관한 전체 연결 결과입니다.</p><ul>{result?.sources.map(id => <li key={id}>{tasks.find(t => t.id === id)?.title} · {formatMoney(results.get(id)?.value ?? 0)}</li>)}</ul></details>}
  </section>;
}

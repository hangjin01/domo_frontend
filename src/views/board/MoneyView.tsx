'use client';
import React, { useContext, useMemo, useState } from 'react';
import type { Task } from '@/src/models/types';
import { MoneyContext } from '@/src/views/task/MoneyFields';
import { moneyRows, formatMoney, moneyLabels, validMoney } from '@/src/models/utils/money';
import { buildMoneyXlsx, type ExcelCell } from '@/src/lib/moneyExcel';

export function MoneyView({ onTaskSelect }: { onTaskSelect: (task: Task) => void }) {
  const { tasks, results } = useContext(MoneyContext);
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const summaries = tasks.filter(t => t.money?.mode === 'sum' || t.money?.mode === 'avg');
  const selectedResult = selected ? results.get(Number(selected)) : undefined;
  const rows = useMemo(() => moneyRows(tasks, start, end, selected ? selectedResult?.sources ?? [] : undefined), [tasks, start, end, selected, selectedResult]);
  const error = start && end && start > end ? '시작일이 종료일보다 늦습니다.' : selectedResult?.error ?? (rows.some(t => !validMoney(t.money!)) ? '올바르지 않은 금액/날짜가 있습니다. 카드를 수정하세요.' : '');
  const days = new Map<string, { plus: number; minus: number }>();
  for (const task of rows) {
    const m = task.money!, day = days.get(m.date) ?? { plus: 0, minus: 0 };
    if (m.mode === 'plus') day.plus += m.amount; else day.minus += m.amount;
    days.set(m.date, day);
  }
  const plus = [...days.values()].reduce((n, d) => n + d.plus, 0), minus = [...days.values()].reduce((n, d) => n + d.minus, 0);
  const totalError = error || (!Number.isSafeInteger(plus) || !Number.isSafeInteger(minus) ? '집계 가능한 금액 범위를 초과했습니다.' : '');
  function download() {
    try {
      if (totalError) throw new Error(totalError);
      const detail: ExcelCell[][] = [['날짜', '카드명', '설명', '방식', '금액 (원)'], ...rows.map(t => [{ date: t.money!.date }, t.title, t.description ?? '', moneyLabels[t.money!.mode], results.get(t.id)!.value])];
      const daily: ExcelCell[][] = [['날짜', '더한 금액 (원)', '뺀 금액 (원)', '순금액 (원)'], ...[...days].map(([date, d]) => [{ date }, d.plus, d.minus, d.plus - d.minus]), ['전체 합계', plus, minus, plus - minus]];
      const summary: ExcelCell[][] = [['기준 날짜', '카드명', '방식', '전체 연결 결과 (원)', '상태'], ...summaries.filter(t => !selected || t.id === Number(selected)).map(t => [{ date: t.money!.date }, t.title, moneyLabels[t.money!.mode], results.get(t.id)?.value ?? null, results.get(t.id)?.error ?? (results.get(t.id)?.value == null ? '계산 대상 없음' : '전체 연결 기준 · 날짜 필터 미적용')])];
      const bytes = buildMoneyXlsx([{ name: '날짜별 집계', rows: daily }, { name: '상세 내역', rows: detail }, { name: '계산 카드', rows: summary }]);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = `DOMO-금액표-${start || '전체'}-${end || '전체'}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage('엑셀 파일을 내보냈습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '내보내기에 실패했습니다.'); }
  }
  return <div className="h-full overflow-auto p-6 space-y-5 bg-white dark:bg-[var(--surface-panel)] text-gray-900 dark:text-gray-100">
    <h1 className="text-2xl font-bold">금액표</h1>
    <p className="text-sm">원본 금액 카드의 기준 날짜로 집계합니다. 총합·평균 카드는 이중 합산하지 않습니다.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label>시작일<input aria-label="금액표 시작일" type="date" value={start} onChange={e => setStart(e.target.value)} className="block border rounded p-2 bg-white text-gray-900" /></label>
      <label>종료일<input aria-label="금액표 종료일" type="date" value={end} onChange={e => setEnd(e.target.value)} className="block border rounded p-2 bg-white text-gray-900" /></label>
      <label>계산 카드<select aria-label="계산 카드 필터" value={selected} onChange={e => setSelected(e.target.value)} className="block border rounded p-2 bg-white text-gray-900"><option value="">전체 금액 카드</option>{summaries.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <button onClick={download} disabled={!!totalError} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">엑셀 내보내기 (.xlsx)</button>
    </div>
    <p role="status">{totalError || message}</p>
    {!totalError && <p className="text-lg font-semibold">더한 금액 {formatMoney(plus)} · 뺀 금액 {formatMoney(minus)} · 순금액 {formatMoney(plus - minus)}</p>}
    <h2 className="font-bold">상세 내역 ({rows.length})</h2>
    <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">날짜</th><th>카드</th><th>방식</th><th className="text-right">금액</th></tr></thead><tbody>{rows.map(t => <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700"><td className="p-3">{t.money!.date}</td><td><button className="underline" onClick={() => onTaskSelect(t)}>{t.title}</button></td><td>{moneyLabels[t.money!.mode]}</td><td className="text-right">{results.get(t.id)?.value == null ? '입력 확인 필요' : formatMoney(results.get(t.id)!.value!)}</td></tr>)}</tbody></table>
    {!rows.length && <p>해당 기간에 금액 카드가 없습니다. 카드 상세의 설명 아래에서 금액을 설정하세요.</p>}
    <h2 className="font-bold">날짜별 집계</h2>
    {!totalError && <table className="w-full text-left text-sm"><thead><tr><th>날짜</th><th>더한 금액</th><th>뺀 금액</th><th>순금액</th></tr></thead><tbody>{[...days].map(([date, d]) => <tr key={date} className="border-b"><td className="py-3">{date}</td><td>{formatMoney(d.plus)}</td><td>{formatMoney(d.minus)}</td><td>{formatMoney(d.plus - d.minus)}</td></tr>)}</tbody></table>}
    <h2 className="font-bold">계산 카드 · 전체 연결 기준 (날짜 필터 미적용)</h2>
    {summaries.filter(t => !selected || t.id === Number(selected)).map(t => <button key={t.id} onClick={() => onTaskSelect(t)} className="block underline">{t.title}: {results.get(t.id)?.error ?? (results.get(t.id)?.value == null ? '계산 대상 없음' : formatMoney(results.get(t.id)!.value!))}</button>)}
  </div>;
}

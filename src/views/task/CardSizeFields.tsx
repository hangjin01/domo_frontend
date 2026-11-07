'use client';
import React, { useState } from 'react';
import type { Task } from '@/src/models/types';
import { cardSize } from '@/src/models/utils/cardLayout';

export function CardSizeFields({ task, onSave }: { task: Task; onSave: (task: Task) => void | Promise<void> }) {
  const initial = cardSize(task);
  const [width, setWidth] = useState(String(initial.width)), [height, setHeight] = useState(String(initial.height));
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function save(reset = false) {
    const size = reset ? { width: 280, height: 140 } : { width: Number(width), height: Number(height) };
    if (!Number.isInteger(size.width) || !Number.isInteger(size.height) || size.width < 220 || size.width > 800 || size.height < 100 || size.height > 800) { setMessage('너비 220~800, 높이 100~800 사이의 정수를 입력하세요.'); return; }
    setBusy(true);
    try { await onSave({ ...task, ...size }); setWidth(String(size.width)); setHeight(String(size.height)); setMessage('크기를 저장했습니다.'); }
    catch { setMessage('저장에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-gray-300 dark:border-gray-600 p-4 space-y-3"><h3 className="font-semibold">카드 크기</h3><div className="flex flex-wrap gap-3">
    <label>너비(px)<input aria-label="카드 너비" type="number" min="220" max="800" value={width} disabled={busy} onChange={e => setWidth(e.target.value)} className="block w-28 rounded border p-2 bg-white text-gray-900" /></label>
    <label>높이(px)<input aria-label="카드 높이" type="number" min="100" max="800" value={height} disabled={busy} onChange={e => setHeight(e.target.value)} className="block w-28 rounded border p-2 bg-white text-gray-900" /></label>
    <button disabled={busy} onClick={() => void save()} className="rounded bg-blue-600 text-white px-3">크기 저장</button><button disabled={busy} onClick={() => void save(true)} className="rounded border px-3">기본 크기</button>
  </div><p className="text-xs">그룹 안에서는 가장 큰 카드 기준의 간격으로 정렬합니다.</p><p role="status">{message}</p></section>;
}

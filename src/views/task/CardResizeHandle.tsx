'use client';
import React, { useRef, useState } from 'react';
import { cardSize } from '@/src/models/utils/cardLayout';
import type { Task } from '@/src/models/types';

/** 포인터 캡처로 보드 이동과 크기 변경을 분리합니다. 취소 시 원래 스타일을 복구합니다. */
export function CardResizeHandle({ task, onResize }: { task: Task; onResize?: (size: { width: number; height: number }) => void | Promise<void> }) {
  const drag = useRef<{ scale: number; x: number; y: number; width: number; height: number; node: HTMLElement; css: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!onResize) return null;
  function restore() { const d = drag.current; if (d) d.node.style.cssText = d.css; drag.current = null; }
  return <><button type="button" aria-label={`${task.title} 크기 조절`} title="드래그하여 크기 조절 · 정확한 크기는 카드 상세에서 설정" disabled={busy}
    className="absolute bottom-0 right-0 z-40 w-6 h-6 cursor-se-resize rounded-tl bg-gray-900/15 text-current touch-none"
    onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
    onPointerDown={e => { e.stopPropagation(); if(e.button !== 0) return; const node = e.currentTarget.closest('[data-card-variant]') as HTMLElement; const rect = node.getBoundingClientRect(); const scale = Number(node.closest('[data-board-zoom]')?.getAttribute('data-board-zoom')) || 1; drag.current = { scale, x:e.clientX, y:e.clientY, width:rect.width / scale, height:rect.height / scale, node, css:node.style.cssText }; e.currentTarget.setPointerCapture(e.pointerId); setError(''); }}
    onPointerMove={e => { e.stopPropagation(); const d = drag.current; if (!d) return; const size = cardSize({width:d.width+(e.clientX-d.x)/d.scale,height:d.height+(e.clientY-d.y)/d.scale}); d.node.style.width = `${size.width}px`; d.node.style.height = `${size.height}px`; }}
    onPointerCancel={restore} onLostPointerCapture={restore}
    onPointerUp={async e => { e.stopPropagation(); const d = drag.current; if (!d) return; const size = cardSize({width:d.width+(e.clientX-d.x)/d.scale,height:d.height+(e.clientY-d.y)/d.scale}); restore(); setBusy(true); try { await onResize!(size); } catch { setError('크기 저장 실패'); } finally { setBusy(false); } }}
  >◢</button>{error && <span role="alert" className="absolute bottom-6 right-0 text-xs bg-white text-red-700 p-1">{error}</span>}</>;
}

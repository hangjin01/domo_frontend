'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** 삭제는 명시적인 버튼으로만 실행합니다. 기본 포커스는 취소이며 Esc도 취소입니다.
 * dialog의 모달 동작으로 배경 조작·탭 이동을 막고, 저장 중에는 중복 삭제를 차단합니다. */
export function DeleteConfirmation({ title, description, onCancel, onConfirm }: {
    title: string;
    description: string;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const locked = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const titleId = useId();
    const descriptionId = useId();
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);

    return createPortal(
        <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
            onCancel={event => { event.preventDefault(); if (!locked.current) onCancel(); }}
            onKeyDown={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
            className="fixed inset-0 m-auto w-[min(90vw,420px)] rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl backdrop:bg-black/50 dark:border-gray-700 dark:bg-[var(--surface-panel)] dark:text-gray-100">
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            <p id={descriptionId} className="mt-3 text-sm leading-relaxed">{description}</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
                <button autoFocus disabled={busy} onClick={onCancel} className="rounded-lg border border-gray-400 px-4 py-2 disabled:opacity-50">취소</button>
                <button disabled={busy} onClick={async () => {
                    if (locked.current) return;
                    locked.current = true;
                    setBusy(true);
                    setError('');
                    try { await onConfirm(); onCancel(); }
                    catch { setError('삭제에 실패했습니다. 데이터는 유지되며 다시 시도할 수 있습니다.'); }
                    finally { locked.current = false; setBusy(false); }
                }} className="rounded-lg bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:opacity-50">{busy ? '삭제 중…' : '삭제 확인'}</button>
            </div>
        </dialog>, document.body,
    );
}

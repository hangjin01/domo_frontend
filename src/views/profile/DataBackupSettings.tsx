'use client';
import { useRef, useState } from 'react';
import { collectBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, type DomoBackup } from '@/src/lib/dataBackup';

/** 웹과 데스크톱이 같은 JSON을 사용해 브라우저에서 쓰던 데이터를 앱으로 옮길 수 있습니다. */
export function DataBackupSettings() {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<DomoBackup | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const action = async (work: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await work(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '백업 작업에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--surface-panel)] p-6" aria-label="데이터 백업">
    <h3 className="font-bold mb-3">데이터 백업</h3>
    <p className="text-sm mb-4">로컬 데이터와 테마를 JSON으로 옮깁니다. 백업에는 데모 계정·글·댓글 등이 포함되므로 Git에 올리거나 공개하지 마세요. 로그인 상태는 제외됩니다.</p>
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} className="border rounded-lg px-4 py-2" onClick={() => action(async () => {
        const backup = collectBackup(localStorage);
        if (window.domoDesktop) {
          if (!await window.domoDesktop.exportBackup(backup)) return;
        } else {
          const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
          const link = document.createElement('a'); link.href = url; link.download = `domo-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        setMessage('백업 파일을 내보냈습니다.');
      })}>백업 내보내기</button>
      <button disabled={busy} className="border rounded-lg px-4 py-2" onClick={() => action(async () => {
        if (window.domoDesktop) {
          const value = await window.domoDesktop.importBackup();
          if (value) setPending(parseBackup(JSON.stringify(value)));
        } else file.current?.click();
      })}>백업 가져오기</button>
      <input ref={file} type="file" accept="application/json,.json" className="hidden" aria-label="DOMO 백업 파일" onChange={event => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (selected) void action(async () => {
          if (selected.size > MAX_BACKUP_BYTES) throw new Error('백업은 20MB 이하여야 합니다.');
          setPending(parseBackup(await selected.text()));
        });
      }} />
    </div>
    {pending && <div className="mt-4 rounded-lg border border-amber-500 p-4">
      <p>백업 항목 {Object.keys(pending.data).length}개로 현재 로컬 데이터를 교체합니다. 먼저 현재 데이터를 내보내 보관하세요. 가져온 뒤 다시 로그인해야 합니다.</p>
      <button disabled={busy} className="mt-3 border rounded-lg px-4 py-2 mr-3" onClick={() => setPending(null)}>취소</button>
      <button disabled={busy} className="mt-3 border rounded-lg px-4 py-2" onClick={() => action(async () => {
        restoreBackup(localStorage, pending);
        sessionStorage.removeItem('domo:mock:session');
        // 가져오기 전 UserProvider/모듈 캐시도 버려야 하므로 의도적으로 전체 문서를 재시작합니다.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/login');
      })}>현재 데이터 교체하고 가져오기</button>
    </div>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}

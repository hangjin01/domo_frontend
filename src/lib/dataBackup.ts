export interface DomoBackup { format: 'domo-backup'; version: 1; createdAt: string; data: Record<string, string> }
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const allowed = (key: string) => (key === 'theme' || /^domo:mock:v2:[a-zA-Z0-9:_-]+$/.test(key)) && !key.toLowerCase().includes('session');
export function collectBackup(storage: Storage): DomoBackup {
  const data: Record<string, string> = Object.create(null);
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!;
    if (allowed(key)) data[key] = storage.getItem(key)!;
  }
  return { format: 'domo-backup', version: 1, createdAt: new Date().toISOString(), data };
}
export function parseBackup(raw: string): DomoBackup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error('백업은 20MB 이하여야 합니다.');
  const value = JSON.parse(raw);
  if (value?.format !== 'domo-backup' || value.version !== 1 || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) throw new Error('DOMO 백업 파일이 아닙니다.');
  for (const [key, item] of Object.entries(value.data)) {
    if (!allowed(key) || typeof item !== 'string') throw new Error('허용되지 않은 백업 항목입니다.');
    if (key !== 'theme') {
      const parsed = JSON.parse(item);
      // 핵심 보드 구조가 손상된 파일은 복원 전에 차단합니다.
      if (key === 'domo:mock:v2:board' && (!parsed || !['tasks', 'groups', 'columns', 'connections'].every(field => Array.isArray(parsed[field])))) throw new Error('보드 데이터 형식이 올바르지 않습니다.');
    }
  }
  return value;
}
/** 가져오기는 교체 작업입니다. 실패하면 현재 키를 지우고 이전 값을 다시 넣습니다. */
export function restoreBackup(storage: Storage, value: DomoBackup) {
  const next = parseBackup(JSON.stringify(value));
  const previous = collectBackup(storage);
  const replace = (data: Record<string, string>) => {
    const keys = Object.keys(collectBackup(storage).data);
    keys.forEach(key => storage.removeItem(key));
    Object.entries(data).forEach(([key, raw]) => storage.setItem(key, raw));
  };
  // 별도 복구 사본을 저장할 공간이 없으면 기존 데이터에 손대지 않습니다.
  storage.setItem('domo:backup:before-import', JSON.stringify(previous));
  try { replace(next.data); }
  catch (error) { replace(previous.data); throw error; }
}

declare global {
  interface Window {
    domoDesktop?: {
      exportBackup: (value: DomoBackup) => Promise<boolean>;
      importBackup: () => Promise<DomoBackup | null>;
    };
  }
}

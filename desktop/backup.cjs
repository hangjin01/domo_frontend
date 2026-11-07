// 네이티브 파일 접근 전에 포맷·크기·키를 제한합니다. 경로는 렌더러에서 받지 않습니다.
const MAX_BYTES = 20 * 1024 * 1024;
function validateBackup(value) {
  if (!value || value.format !== 'domo-backup' || value.version !== 1 || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) throw new Error('DOMO 백업 파일이 아닙니다.');
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_BYTES) throw new Error('백업은 20MB 이하여야 합니다.');
  const data = Object.create(null);
  for (const [key, raw] of Object.entries(value.data)) {
    if (!(key === 'theme' || /^domo:mock:v2:[a-zA-Z0-9:_-]+$/.test(key)) || key.toLowerCase().includes('session') || typeof raw !== 'string') throw new Error('허용되지 않은 백업 항목입니다.');
    if (key !== 'theme') JSON.parse(raw);
    data[key] = raw;
  }
  return { format: 'domo-backup', version: 1, createdAt: value.createdAt, data };
}
module.exports = { validateBackup, MAX_BYTES };

/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const { validateBackup } = require('../desktop/backup.cjs');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { collectBackup, parseBackup, restoreBackup } = require('../src/lib/dataBackup.ts');
function memoryStorage() {
  const map = new Map();
  return { get length() { return map.size; }, key: index => [...map.keys()][index], getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}
test('백업은 앱 데이터와 테마만 포함하며 세션과 다른 사이트 키를 제외', () => {
  const storage = memoryStorage();
  storage.setItem('theme', 'dark'); storage.setItem('domo:mock:v2:workspaces', '[]');
  storage.setItem('domo:mock:v2:session', 'secret'); storage.setItem('unrelated', 'private');
  const backup = collectBackup(storage);
  assert.deepEqual(Object.keys(backup.data).sort(), ['domo:mock:v2:workspaces', 'theme']);
  assert.equal(validateBackup(backup).data.theme, 'dark');
  assert.equal(parseBackup(JSON.stringify(backup)).format, 'domo-backup');
});
test('백업 포맷·위험 키·깨진 JSON·보드 구조 오류 차단', () => {
  for (const data of [{ '__proto__': null, bad: '1' }, { 'domo:mock:v2:session': '"x"' }, { 'domo:mock:v2:board': '{' }]) {
    const backup = { format: 'domo-backup', version: 1, data };
    assert.throws(() => validateBackup(backup));
    assert.throws(() => parseBackup(JSON.stringify(backup)));
  }
  assert.throws(() => parseBackup(JSON.stringify({ format: 'domo-backup', version: 1, data: { 'domo:mock:v2:board': '{}' } })));
  assert.throws(() => validateBackup({ version: 2, data: {} }));
});
test('가져오기는 관련 키만 교체하고 이전 복구 사본을 보존', () => {
  const storage = memoryStorage(); storage.setItem('theme', 'dark'); storage.setItem('unrelated', 'keep');
  const next = { format: 'domo-backup', version: 1, data: { theme: 'light', 'domo:mock:v2:workspaces': '[]' } };
  restoreBackup(storage, next);
  assert.equal(storage.getItem('theme'), 'light'); assert.equal(storage.getItem('unrelated'), 'keep');
  assert.equal(JSON.parse(storage.getItem('domo:backup:before-import')).data.theme, 'dark');
});
test('가져오기 중 저장 실패 시 이전 데이터로 되돌림', () => {
  const storage = memoryStorage(); storage.setItem('theme', 'dark');
  const set = storage.setItem; let fail = true;
  storage.setItem = (key, value) => { if (key === 'theme' && value === 'light' && fail) { fail = false; throw Error('quota'); } set(key, value); };
  assert.throws(() => restoreBackup(storage, { format: 'domo-backup', version: 1, data: { theme: 'light' } }));
  assert.equal(storage.getItem('theme'), 'dark');
});
test('배포 대상은 Windows 설치형과 Linux이며 제거 시 사용자 데이터 유지', () => {
  const config = require('../desktop/builder.cjs');
  assert.deepEqual(config.win.target, ['nsis']); assert.ok(config.linux.target.includes('AppImage'));
  assert.equal(config.nsis.createDesktopShortcut, true); assert.equal(config.nsis.deleteAppDataOnUninstall, false);
  assert.equal(config.mac, undefined);
});

test('다른 OS의 네이티브 리소스를 섞거나 macOS를 패키징하지 않음', async () => {
  const config = require('../desktop/builder.cjs');
  await assert.rejects(config.beforePack({ electronPlatformName: 'darwin' }));
  await assert.rejects(config.beforePack({ electronPlatformName: process.platform === 'linux' ? 'win32' : 'linux' }));
  if (['linux', 'win32'].includes(process.platform)) await config.beforePack({ electronPlatformName: process.platform });
});

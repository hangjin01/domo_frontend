// Windows/Linux에서 동일하게 실행되는 빌드 준비 스크립트. 개발용 .next에는 손대지 않습니다.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
async function main() {
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], {
    stdio: 'inherit', env: { ...process.env, DOMO_DESKTOP: '1', NEXT_PUBLIC_USE_MOCK: 'true', NEXT_TELEMETRY_DISABLED: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Next 데스크톱 빌드 실패');
  // 오직 이 스크립트의 생성물 두 디렉터리만 교체합니다.
  for (const folder of ['.desktop-app', '.desktop-web']) await fs.rm(path.join(root, folder), { recursive: true, force: true });
  await fs.mkdir(path.join(root, '.desktop-app'), { recursive: true });
  await fs.mkdir(path.join(root, '.desktop-app/node_modules'), { recursive: true });
  await fs.cp(path.join(root, '.next-desktop/standalone'), path.join(root, '.desktop-web'), { recursive: true, filter: source => !path.basename(source).startsWith('.env') });
  await fs.cp(path.join(root, '.next-desktop/static'), path.join(root, '.desktop-web/.next-desktop/static'), { recursive: true });
  await fs.cp(path.join(root, 'public'), path.join(root, '.desktop-web/public'), { recursive: true });
  for (const name of ['main.cjs', 'preload.cjs', 'backup.cjs', 'server.cjs']) await fs.copyFile(path.join(__dirname, name), path.join(root, '.desktop-app', name));
  const pkg = require('../package.json');
  await fs.writeFile(path.join(root, '.desktop-app/package.json'), JSON.stringify({ name: 'domo-desktop', productName: 'DOMO', desktopName: 'com.domo.workspace', version: pkg.version, main: 'main.cjs', description: 'DOMO local workspace for Windows and Linux', author: 'DOMO', private: true, dependencies: {} }, null, 2));
  // 기존 코드 기반 SVG를 PNG로 변환합니다. 외부 이미지 다운로드 없이 동일 아이콘을 사용합니다.
  await require('sharp')(path.join(__dirname, 'icon.svg')).resize(512, 512).png().toFile(path.join(root, '.desktop-app/icon.png'));
  console.log('DOMO desktop resources ready');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

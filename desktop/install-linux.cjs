// 빌드 결과를 앱 메뉴에 등록합니다. 앱 데이터는 이 폴더가 아니라 userData에 남습니다.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
async function main() {
  if (process.platform !== 'linux') throw new Error('Linux에서만 실행하세요. Windows는 설치 EXE가 바로가기를 만듭니다.');
  const root = path.resolve(__dirname, '..');
  const executable = path.join(root, 'dist-desktop/linux-unpacked/domo');
  const icon = path.join(root, '.desktop-app/icon.png');
  await fs.access(executable); await fs.access(icon);
  const quote = value => '"' + value.replace(/[\\"`$]/g, '\\$&').replace(/%/g, '%%') + '"';
  const entry = `[Desktop Entry]\nType=Application\nVersion=1.0\nName=DOMO\nComment=로컬 프로젝트 워크스페이스\nExec=${quote(executable)}\nIcon=${icon}\nTerminal=false\nCategories=Office;ProjectManagement;\nStartupWMClass=com.domo.workspace\n`;
  const folder = path.join(os.homedir(), '.local/share/applications');
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, 'domo.desktop');
  // 다른 앱이 같은 파일명을 이미 쓰면 덮어쓰지 않고 사용자에게 알립니다.
  const previous = await fs.readFile(target, 'utf8').catch(() => null);
  if (previous && !previous.includes('Name=DOMO\n')) throw new Error(`기존 다른 바로가기가 있습니다: ${target}`);
  await fs.writeFile(target, entry, { mode: 0o755 });
  console.log(`앱 메뉴에 DOMO를 등록했습니다: ${target}\n실행 파일 위치를 옮기면 이 명령을 다시 실행하세요.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { validateBackup, MAX_BYTES } = require('./backup.cjs');

// 이름·origin을 버전과 무관하게 고정해야 업데이트 후에도 localStorage가 유지됩니다.
app.setName('DOMO');
app.setPath('userData', path.join(app.getPath('appData'), app.isPackaged ? 'DOMO' : 'DOMO-Development'));
const PORT = app.isPackaged ? 47831 : 47832;
const ORIGIN = `http://127.0.0.1:${PORT}`;
let window, server, quitting = false;
let backupQueue = Promise.resolve();
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

function isAppUrl(url) {
  try { return new URL(url).origin === ORIGIN; } catch { return false; }
}
function assertSender(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !isAppUrl(event.senderFrame.url)) throw new Error('허용되지 않은 요청입니다.');
}
function writeAtomic(filename, text) {
  // 같은 날 여러 저장 요청이 들어와도 임시 파일 이름 충돌 없이 순서대로 처리합니다.
  backupQueue = backupQueue.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(`${filename}.tmp`, text, { mode: 0o600 });
    await fs.rename(`${filename}.tmp`, filename);
  });
  return backupQueue;
}
function registerBackup() {
  ipcMain.handle('backup:auto', async (event, value) => {
    assertSender(event);
    const snapshot = validateBackup(value);
    const folder = path.join(app.getPath('userData'), 'backups');
    await writeAtomic(path.join(folder, `auto-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(snapshot));
    // 일별 백업은 7개까지 유지합니다. 사용자가 내보낸 파일은 정리 대상이 아닙니다.
    const files = (await fs.readdir(folder)).filter(name => /^auto-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
    for (const name of files.slice(0, Math.max(0, files.length - 7))) await fs.unlink(path.join(folder, name));
  });
  ipcMain.handle('backup:export', async (event, value) => {
    assertSender(event);
    const snapshot = validateBackup(value);
    const result = await dialog.showSaveDialog(window, { title: 'DOMO 백업 내보내기', defaultPath: `domo-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'DOMO JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return false;
    await writeAtomic(result.filePath, JSON.stringify(snapshot, null, 2));
    return true;
  });
  ipcMain.handle('backup:import', async event => {
    assertSender(event);
    const result = await dialog.showOpenDialog(window, { title: 'DOMO 백업 가져오기', properties: ['openFile'], filters: [{ name: 'DOMO JSON', extensions: ['json'] }] });
    if (result.canceled) return null;
    if ((await fs.stat(result.filePaths[0])).size > MAX_BYTES) throw new Error('백업은 20MB 이하여야 합니다.');
    return validateBackup(JSON.parse(await fs.readFile(result.filePaths[0], 'utf8')));
  });
}
async function checkPort() {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error(`${PORT} 포트가 사용 중입니다. 다른 DOMO 앱을 종료한 뒤 다시 실행해 주세요.`)));
    probe.listen(PORT, '127.0.0.1', () => probe.close(resolve));
  });
}
async function startServer() {
  await checkPort();
  const root = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.resolve(__dirname, '../.desktop-web');
  await fs.access(path.join(root, 'server.js'));
  server = spawn(process.execPath, [path.join(__dirname, 'server.cjs'), root, String(process.pid)], {
    cwd: root, windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', PORT: String(PORT), HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.on('error', error => { console.error(error); });
  server.stdout.on('data', chunk => console.log(chunk.toString().trim()));
  server.stderr.on('data', chunk => console.error(chunk.toString().trim()));
  server.on('exit', () => { if (!quitting) { dialog.showErrorBox('DOMO 서버 종료', '내부 서버가 종료되었습니다. 앱을 다시 실행해 주세요.'); app.quit(); } });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && server.exitCode === null) {
    const ready = await new Promise(resolve => {
      const request = http.get(`${ORIGIN}/login`, response => { response.resume(); resolve(response.statusCode === 200); });
      request.on('error', () => resolve(false));
      request.setTimeout(1000, () => { request.destroy(); resolve(false); });
    });
    if (ready) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('내부 서버를 시작하지 못했습니다. 다른 DOMO 창을 닫고 다시 실행해 주세요.');
}

if (singleInstance) {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.on('before-quit', () => { quitting = true; server?.kill(); });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    app.setAppUserModelId('com.domo.workspace');
    registerBackup();
    await startServer();
    window = new BrowserWindow({ width: 1440, height: 940, minWidth: 1000, minHeight: 700, title: 'DOMO', backgroundColor: '#0f111a', icon: path.join(__dirname, 'icon.png'), show: false,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!isAppUrl(url)) event.preventDefault(); });
    window.webContents.on('will-redirect', (event, url) => { if (!isAppUrl(url)) event.preventDefault(); });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.webContents.session.setPermissionCheckHandler(() => false);
    // 개인 로컬 모드에서는 원격 웹 페이지/추적 스크립트를 불러오지 않습니다.
    window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => callback({ cancel: !isAppUrl(details.url) }));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'DOMO', submenu: [{ label: '데이터 폴더 열기', click: () => shell.openPath(app.getPath('userData')) }, { label: '백업 안내', click: () => dialog.showMessageBox(window, { message: '설정 → 환경설정 → 데이터 백업에서 내보내기/가져오기를 사용하세요.', detail: '자동 백업은 데이터가 바뀌면 30초 간격으로 저장합니다. 최근 7일분을 데이터 폴더의 backups에 보관합니다. 중요한 변경 뒤에는 직접 내보내세요.' }) }, { type: 'separator' }, { role: 'quit', label: '종료' }] },
      { label: '편집', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '보기', submenu: [{ role: 'reload', label: '새로고침' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen', label: '전체 화면' }] },
    ]));
    window.once('ready-to-show', () => window.show());
    await window.loadURL(ORIGIN);
    console.log('DOMO_DESKTOP_READY');
  }).catch(error => { dialog.showErrorBox('DOMO 실행 실패', error.message); app.quit(); });
}

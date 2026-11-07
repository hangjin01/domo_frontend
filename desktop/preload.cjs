const { contextBridge, ipcRenderer } = require('electron');

// 파일 경로나 범용 IPC를 노출하지 않고 승인된 백업 동작만 제공합니다.
contextBridge.exposeInMainWorld('domoDesktop', {
  exportBackup: snapshot => ipcRenderer.invoke('backup:export', snapshot),
  importBackup: () => ipcRenderer.invoke('backup:import'),
});

// 앱 전용 프로필의 데이터는 Chromium이 저장합니다. 별도 파일 스냅샷도 주기적으로 보관합니다.
let previous = '';
async function backup() {
  try {
    const data = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if ((key === 'theme' || /^domo:mock:v2:[a-zA-Z0-9:_-]+$/.test(key)) && !key.toLowerCase().includes('session')) data[key] = localStorage.getItem(key);
    }
    if (!Object.keys(data).some(key => key.startsWith('domo:mock:v2:'))) return;
    const serialized = JSON.stringify(data);
    if (serialized === previous) return;
    await ipcRenderer.invoke('backup:auto', { format: 'domo-backup', version: 1, createdAt: new Date().toISOString(), data });
    previous = serialized;
  } catch (error) { console.error('DOMO 자동 백업 실패:', error.message); }
}
window.addEventListener('DOMContentLoaded', () => { backup(); setInterval(backup, 30000); });

// Electron이 비정상 종료되어도 내부 Next 프로세스만 남아 포트를 점유하지 않도록 감시합니다.
const path = require('node:path');
const parentPid = Number(process.argv[3]);
if (!Number.isSafeInteger(parentPid) || parentPid < 1) throw new Error('부모 프로세스 정보가 없습니다.');
setInterval(() => {
  try { process.kill(parentPid, 0); }
  catch { process.exit(0); }
}, 3000).unref();
require(path.join(process.argv[2], 'server.js'));

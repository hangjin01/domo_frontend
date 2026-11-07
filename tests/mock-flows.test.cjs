// 공개 API 함수를 가짜 브라우저 Storage와 함께 실행하는 회귀 테스트입니다.
// 실제 개발 서버·백엔드 DB·사용자의 브라우저 저장소를 읽거나 수정하지 않습니다.
// beforeEach는 독립된 메모리 저장소를 만들고, reloadModules는 저장소를 유지한 채 모듈만 재로딩해
// 새로고침 뒤에도 저장값이 복원되는지 검사합니다. fetch를 차단하므로 실제 서버에 의존할 수 없습니다.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader exercises the TypeScript API modules without a bundler. */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const apiDir = path.resolve(__dirname, '../src/models/api');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() };
}
const api = name => require(path.join(apiDir, name + '.ts'));
function reloadModules() {
  for (const key of Object.keys(require.cache)) if (key.startsWith(apiDir + path.sep)) delete require.cache[key];
  api('config').mockDelay = async () => {};
}
beforeEach(() => {
  process.env.NEXT_PUBLIC_USE_MOCK = 'true';
  global.window = { localStorage: storage(), sessionStorage: storage() };
  global.fetch = async () => { throw new Error('Mock mode must not call the real API'); };
  reloadModules();
});
async function login() { await api('auth').login('test@gmail.com', '1234'); }

test('single-workspace demo ignores old data without deleting its recovery copy', async () => {
  const previous = JSON.stringify([{ id: 999, name: '이전 검증 데이터', projects: [] }]);
  window.localStorage.setItem('domo:mock:v1:workspaces', previous);
  window.localStorage.setItem('domo:mock:v1:chat:1', JSON.stringify([{ id: 999, content: '이전 대화' }]));
  await login();
  const workspaces = await api('workspace').getWorkspaces();
  assert.equal(workspaces.length, 1);
  assert.equal(workspaces[0].name, 'DOMO 데모');
  assert.equal(workspaces[0].projects.length, 1);
  assert.equal((await api('workspace').getMyProjects()).length, 1);
  assert.deepEqual(await api('chat').getChatMessages(1), []);
  assert.equal(window.localStorage.getItem('domo:mock:v1:workspaces'), previous);
  await api('workspace').updateWorkspace(1, { description: '새 데모 변경사항' });
  reloadModules();
  assert.equal((await api('workspace').getWorkspace(1)).description, '새 데모 변경사항');
});

test('login guard, invalid credentials, refresh and logout use one session', async () => {
  assert.equal(await api('auth').getCurrentUser(), null);
  await assert.rejects(api('user').getMyInfo(), /로그인/);
  await assert.rejects(api('auth').login('test@gmail.com', 'wrong'), /일치/);
  await login();
  reloadModules();
  assert.equal((await api('user').getMyInfo()).email, 'test@gmail.com');
  assert.deepEqual(await api('auth').getCurrentUser(), await api('user').getMyInfo());
  await api('auth').logout();
  reloadModules();
  assert.equal(await api('auth').getCurrentUser(), null);
});

test('signup -> verification -> login persists through reload', async () => {
  await api('auth').signup('demo@jj.ac.kr', 'test-only', 'Demo');
  reloadModules();
  await assert.rejects(api('auth').login('demo@jj.ac.kr', 'test-only'), /인증/);
  await assert.rejects(api('auth').verify('demo@jj.ac.kr', '000000'), /인증/);
  await api('auth').verify('demo@jj.ac.kr', '123456');
  await api('auth').login('demo@jj.ac.kr', 'test-only');
  assert.equal((await api('user').getMyInfo()).name, 'Demo');
  await assert.rejects(api('auth').signup('demo@jj.ac.kr', 'test-only', 'Duplicate'), /이미/);
});

test('profile changes survive reload and do not leak between accounts', async () => {
  await login();
  await api('user').updateMyInfo({ name: 'Updated', nickname: 'Nick' });
  reloadModules();
  assert.equal((await api('user').getMyInfo()).name, 'Updated');
  await api('auth').logout();
  await api('auth').login('admin@domo.com', 'admin1234');
  assert.equal((await api('user').getMyInfo()).name, '관리자(Admin)');
});

test('group deletion persists detached card positions and removes both group and column', async () => {
  await login();
  const board = api('board');
  const groups = await board.getGroups(1);
  const tasks = await board.getTasks(1);
  const group = groups.find(g => tasks.some(t => t.column_id === g.id));
  assert.ok(group);
  const cards = tasks.filter(t => t.column_id === group.id);
  const links = await board.getConnections(1);
  await board.deleteGroup(group.id);
  reloadModules();
  const after = await api('board').getTasks(1);
  assert.equal(after.length, tasks.length);
  const sorted = [...cards].sort((a,b) => a.y-b.y || a.x-b.x || a.id-b.id);
  for (const card of cards) {
    const found = after.find(t => t.id === card.id);
    assert.equal(found.column_id, undefined);
    assert.equal(found.x, 20 + group.x);
    assert.equal(found.y, 70 + sorted.indexOf(card) * 152 + group.y);
  }
  assert.ok(!(await api('board').getGroups(1)).some(g => g.id === group.id));
  assert.ok(!(await api('board').getColumns(1)).some(g => g.id === group.id));
  assert.deepEqual(await api('board').getConnections(1), links);
});

test('failed card/group deletion preserves persisted and in-memory board', async () => {
  await login();
  await api('board').getTasks(1);
  const data = api('mock-data');
  const before = structuredClone({ tasks: data.MOCK_TASKS, groups: data.MOCK_GROUPS, connections: data.MOCK_CONNECTIONS, columns: data.MOCK_COLUMNS });
  window.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(api('board').deleteTask(before.tasks[0].id), /저장/);
  await assert.rejects(api('board').deleteGroup(before.groups[0].id), /저장/);
  assert.deepEqual({ tasks: data.MOCK_TASKS, groups: data.MOCK_GROUPS, connections: data.MOCK_CONNECTIONS, columns: data.MOCK_COLUMNS }, before);
  reloadModules();
  assert.deepEqual(await api('board').getTasks(1), before.tasks.filter(t => t.boardId === 1));
});

test('profile trims input, rejects blank names and persists nickname removal', async () => {
  await login();
  const original = await api('user').getMyInfo();
  await assert.rejects(api('user').updateMyInfo({ name: '   ' }), /이름/);
  assert.deepEqual(await api('user').getMyInfo(), original);
  const saved = await api('user').updateMyInfo({ name: '  테스트  ', nickname: '  별명  ' });
  assert.equal(saved.name, '테스트'); assert.equal(saved.nickname, '별명');
  await api('user').updateMyInfo({ nickname: '   ' });
  reloadModules();
  assert.equal((await api('user').getMyInfo()).nickname, '');
});

test('profile image validates input and failed saves preserve the current profile', async () => {
  await login();
  const original = await api('user').getMyInfo();
  for (const file of [{ type: 'text/plain', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 2 * 1024 * 1024 + 1 }]) {
    await assert.rejects(api('user').updateProfileImage(file));
  }
  const write = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(api('user').updateMyInfo({ name: '저장 실패' }), /저장/);
  assert.deepEqual(await api('user').getMyInfo(), original);
  window.localStorage.setItem = write;
});

test('workspace/project creation, detail, rename and deletion survive reload', async () => {
  await login();
  const w = await api('workspace').createWorkspace('Test workspace', 'description');
  const p = await api('workspace').createProject(w.id, 'Test project');
  reloadModules();
  assert.equal((await api('workspace').getProject(p.id)).workspace_id, w.id);
  assert.equal((await api('workspace').getWorkspace(w.id)).projects[0].id, p.id);
  await api('workspace').updateWorkspace(w.id, { name: 'Renamed workspace' });
  await api('workspace').updateProject(p.id, { name: 'Renamed project' });
  reloadModules();
  assert.equal((await api('workspace').getProject(p.id)).workspace, 'Renamed workspace');
  assert.equal((await api('workspace').getProjects(w.id))[0].name, 'Renamed project');
  await api('workspace').deleteProject(p.id);
  reloadModules();
  await assert.rejects(api('workspace').getProject(p.id), /찾을/);
  await api('workspace').deleteWorkspace(w.id);
  reloadModules();
  await assert.rejects(api('workspace').getWorkspace(w.id), /찾을/);
});

test('board task persistence, project isolation and connection cleanup', async () => {
  const a = await api('board').createTask(2, { title: 'A', boardId: 2, status: 'todo', x: 10.6, y: 20.2 });
  const b = await api('board').createTask(2, { title: 'B', boardId: 2, status: 'todo', x: 30, y: 40 });
  const c = await api('board').createConnection(2, { from: a.id, to: b.id, boardId: 2 });
  await api('board').updateConnection(c.id, { style: 'dashed' });
  reloadModules();
  assert.equal((await api('board').getTask(a.id)).x, 11);
  assert.equal((await api('board').getConnections(2))[0].style, 'dashed');
  assert.equal((await api('board').getAllCards(1)).some(task => task.id === a.id), false);
  await api('board').deleteTask(a.id);
  reloadModules();
  assert.equal((await api('board').getConnections(2)).length, 0);
  await assert.rejects(api('board').getTask(a.id), /찾을/);
});

test('group title and size edits preserve coordinates after reload', async () => {
  const g = await api('board').createGroup(1, { title: 'Group', x: 125, y: 240 });
  await api('board').updateGroup(g.id, { title: 'Renamed' });
  await api('board').updateGroupSize(g.id, 500, 600);
  reloadModules();
  const saved = (await api('board').getGroups(1)).find(group => group.id === g.id);
  assert.deepEqual([saved.title, saved.x, saved.y, saved.width], ['Renamed', 125, 240, 500]);
  // The actual canvas creates columns and edits them through the group API.
  const column = await api('board').createColumn(2, { title: 'Canvas group', localX: 70, localY: 90 });
  await api('board').updateGroup(column.id, { title: 'Canvas renamed' });
  reloadModules();
  const restored = (await api('board').getColumns(2)).find(c => c.id === column.id);
  assert.deepEqual([restored.title, restored.localX, restored.localY], ['Canvas renamed', 70, 90]);
  await api('board').deleteGroup(column.id);
  assert.equal((await api('board').getColumns(2)).length, 0);
});

test('card comments persist and deletion is reflected on next read', async () => {
  await login();
  const c = await api('board').createCardComment(1, 'saved comment');
  reloadModules();
  assert.equal((await api('board').getCardComments(1))[0].text, 'saved comment');
  await api('board').deleteCardComment(c.id);
  reloadModules();
  assert.equal((await api('board').getCardComments(1)).length, 0);
});

test('community and project posts/comments use isolated persistent stores', async () => {
  await login();
  const p = await api('post').createProjectPost(1, { title: 'Project', content: 'body' });
  const c = await api('post').createCommunityPost({ title: 'Community', content: 'body' });
  await api('post').updateProjectPost(p.id, { title: 'Updated' });
  const comment = await api('post').createCommunityComment(c.id, { content: 'reply' });
  reloadModules();
  assert.equal((await api('post').getProjectPost(p.id)).title, 'Updated');
  assert.equal((await api('post').getCommunityPost(c.id)).comments[0].id, comment.id);
  assert.equal((await api('post').getProjectPosts(1)).some(post => post.id === c.id), false);
  assert.equal((await api('post').getCommunityPosts()).some(post => post.id === p.id), false);
  await api('post').deleteCommunityComment(comment.id);
  await api('post').deleteProjectPost(p.id);
  await api('post').deleteCommunityPost(c.id);
  reloadModules();
  await assert.rejects(api('post').getProjectPost(p.id), /찾을/);
  await assert.rejects(api('post').getCommunityPost(c.id), /찾을/);
});

test('local chat history survives reload and stays within its project', async () => {
  await login();
  const message = api('chat').sendMockChatMessage(1, ' hello ');
  reloadModules();
  assert.equal((await api('chat').getChatMessages(1))[0].content, 'hello');
  assert.equal((await api('chat').getChatMessages(2)).length, 0);
  assert.equal((await api('chat').getChatMessages(1, 50, message.id)).length, 0);
});

test('all connection styles persist without changing endpoints or curve shape', async () => {
  const original = (await api('board').getConnections(1))[0];
  assert.ok(original);
  for (const style of ['arrow', 'dashed', 'solid']) {
    await api('board').updateConnection(original.id, { style });
    reloadModules();
    const saved = (await api('board').getConnections(1)).find(c => c.id === original.id);
    assert.deepEqual(saved, { ...original, style });
  }
});

test('failed connection style save preserves both memory and stored data', async () => {
  const original = (await api('board').getConnections(1))[0];
  const setItem = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(api('board').updateConnection(original.id, { style: 'arrow' }), /저장/);
  assert.deepEqual(api('mock-data').MOCK_CONNECTIONS.find(c => c.id === original.id), original);
  window.localStorage.setItem = setItem;
  reloadModules();
  assert.deepEqual((await api('board').getConnections(1)).find(c => c.id === original.id), original);
});

test('money fields survive reload and storage failure does not mutate memory', async () => {
  const board = api('board');
  const money = { mode: 'minus', amount: 5000, date: '2026-11-05' };
  await board.updateTask(1, { money });
  reloadModules();
  await api('board').getTasks(1);
  assert.deepEqual(api('mock-data').MOCK_TASKS.find(t => t.id === 1).money, money);
  const before = structuredClone(api('mock-data').MOCK_TASKS);
  window.localStorage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(api('board').updateTask(1, { money: null }), /저장/);
  assert.deepEqual(api('mock-data').MOCK_TASKS, before);
});

test('card sizes persist alongside grouping and money', async () => {
  await api('board').updateTask(1, { width: 420, height: 250 });
  await api('board').batchUpdateCardPositions([{ id:1, x:20, y:70, column_id:1 }]);
  reloadModules();
  const task = (await api('board').getTasks(1)).find(t=>t.id===1);
  assert.deepEqual([task.width,task.height,task.x,task.y,task.column_id],[420,250,20,70,1]);
});

test('storage failure is reported instead of a fake successful mutation', async () => {
  await login();
  window.localStorage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(api('workspace').createWorkspace('not saved'), /저장/);
});

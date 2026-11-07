// 실제 사용자 저장소/운영체제를 변경하지 않고 테마 저장·복원·구독 수명을 검사합니다.
/* eslint-disable @typescript-eslint/no-require-imports -- 별도 번들러 없이 TS 모듈을 검사합니다. */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const modulePath = require.resolve('../src/lib/theme.ts');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
let theme, media, mediaListeners, storageListeners, localStorage, root;
beforeEach(() => {
  const values = new Map();
  mediaListeners = new Set();
  storageListeners = new Set();
  localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), clear: () => values.clear() };
  media = { matches: false, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) };
  root = { dark: false, style: {}, dataset: {}, classList: { toggle: (_, dark) => { root.dark = dark; } } };
  global.document = { documentElement: root };
  global.window = { localStorage, matchMedia: () => media, addEventListener: (_, fn) => storageListeners.add(fn), removeEventListener: (_, fn) => storageListeners.delete(fn) };
  delete require.cache[modulePath];
  theme = require(modulePath);
});
function systemChange(dark) { media.matches = dark; mediaListeners.forEach(fn => fn()); }
function storageChange(key = 'theme') { storageListeners.forEach(fn => fn({ key, storageArea: localStorage })); }

test('예전 선택과 손상 데이터를 밝기/색상으로 안전하게 해석', () => {
  assert.deepEqual(theme.parsePreferences('purple'), { theme: 'light', color: 'purple' });
  assert.deepEqual(theme.parsePreferences('dark'), { theme: 'dark', color: 'default' });
  for (const raw of [null, 'invalid', '{', 'null', '[]']) {
    assert.deepEqual(theme.parsePreferences(raw), { theme: 'system', color: 'default' });
  }
});

test('모든 밝기/색상 조합이 저장되고 재구독 뒤 복원', () => {
  for (const mode of ['light', 'dark', 'system']) for (const color of ['default', 'purple', 'yellow', 'red']) {
    const stop = theme.subscribeTheme(() => {});
    theme.setTheme(mode); theme.setThemeColor(color);
    stop();
    delete require.cache[modulePath]; theme = require(modulePath);
    const stopReloaded = theme.subscribeTheme(() => {});
    assert.deepEqual(theme.getThemeSnapshot(), { theme: mode, color, resolved: mode === 'dark' ? 'dark' : 'light' });
    assert.equal(root.dataset.theme, color);
    stopReloaded();
  }
});

test('밝기 전환은 색을 유지하고 색 선택은 밝기를 유지', () => {
  const stop = theme.subscribeTheme(() => {});
  theme.setThemeColor('purple');
  theme.setTheme('dark');
  assert.deepEqual(theme.getThemeSnapshot(), { theme: 'dark', color: 'purple', resolved: 'dark' });
  theme.setThemeColor('red');
  assert.equal(root.dark, true);
  theme.toggleTheme();
  assert.deepEqual(theme.getThemeSnapshot(), { theme: 'light', color: 'red', resolved: 'light' });
  stop();
});

test('시스템 자동 전환은 선택한 색을 바꾸지 않음', () => {
  const stop = theme.subscribeTheme(() => {});
  theme.setThemeColor('yellow');
  systemChange(true);
  assert.deepEqual(theme.getThemeSnapshot(), { theme: 'system', color: 'yellow', resolved: 'dark' });
  theme.setTheme('light');
  systemChange(false); systemChange(true);
  assert.equal(root.dark, false);
  stop();
});

test('다른 탭 변경·저장소 초기화와 구독 정리', () => {
  const stop1 = theme.subscribeTheme(() => {});
  const stop2 = theme.subscribeTheme(() => {});
  assert.equal(mediaListeners.size, 1);
  localStorage.setItem('theme', JSON.stringify({ theme: 'dark', color: 'red' })); storageChange();
  assert.deepEqual(theme.getThemeSnapshot(), { theme: 'dark', color: 'red', resolved: 'dark' });
  localStorage.clear(); storageChange(null);
  assert.equal(root.dataset.theme, 'default');
  stop1(); stop2();
  assert.equal(mediaListeners.size, 0); assert.equal(storageListeners.size, 0);
});

test('저장 실패 시 밝기·색상·화면 유지, 중복 선택은 재저장하지 않음', () => {
  const stop = theme.subscribeTheme(() => {});
  theme.setThemeColor('purple');
  const before = theme.getThemeSnapshot();
  localStorage.setItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => theme.setThemeColor('purple'));
  assert.throws(() => theme.setTheme('dark'), /blocked/);
  assert.throws(() => theme.setThemeColor('red'), /blocked/);
  assert.equal(theme.getThemeSnapshot(), before);
  stop();
});

test('초기 HTML과 React 테마 해석은 모든 조합 및 읽기 차단에서 일치', () => {
  const raws = ['light', 'dark', 'purple', 'yellow', 'red', 'invalid'];
  for (const mode of ['light', 'dark', 'system']) for (const color of ['default', 'purple', 'yellow', 'red']) {
    raws.push(JSON.stringify({ theme: mode, color }));
  }
  for (const raw of raws) for (const dark of [true, false]) {
    localStorage.setItem('theme', raw); media.matches = dark;
    vm.runInNewContext(theme.themeBootstrapScript, { window, document, localStorage });
    const expected = theme.parsePreferences(raw);
    assert.equal(root.dark, theme.resolveTheme(expected.theme, dark) === 'dark');
    assert.equal(root.dataset.theme, expected.color);
  }
  localStorage.getItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => vm.runInNewContext(theme.themeBootstrapScript, { window, document, localStorage }));
});

// 실제 CSS에 선언한 색으로 대비를 계산합니다. UI 전체의 접근성 인증을 대신하지는 않습니다.
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test('컬러 테마 기본/보조 글자와 버튼 글자는 정의된 표면에서 대비 4.5 이상', () => {
  const css = fs.readFileSync(require.resolve('../src/app/globals.css'), 'utf8');
  for (const value of ['purple', 'yellow', 'red']) {
    const block = css.split(':root[data-theme="' + value + '"] {')[1].split('}')[0];
    const tokens = Object.fromEntries([...block.matchAll(/--theme-([\w-]+):\s*(#[\da-f]{6})/g)].map(m => [m[1], m[2]]));
    for (const foreground of ['ink', 'muted', 'accent']) {
      for (const background of ['canvas', 'surface', 'soft']) {
        assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, value + ' ' + foreground + '/' + background);
      }
    }
    assert.ok(contrast('#ffffff', tokens.accent) >= 4.5, value + ' button');
  }
});

test('다크 컬러 테마의 본문·보조·강조 글자와 버튼 대비', () => {
  const css = fs.readFileSync(require.resolve('../src/app/globals.css'), 'utf8');
  for (const value of ['purple', 'yellow', 'red']) {
    const block = css.split(':root.dark[data-theme="' + value + '"] {')[1].split('}')[0];
    const tokens = Object.fromEntries([...block.matchAll(/--theme-([\w-]+):\s*(#[\da-f]{6})/g)].map(m => [m[1], m[2]]));
    for (const fg of ['ink', 'muted', 'accent']) for (const bg of ['canvas', 'surface', 'soft']) {
      assert.ok(contrast(tokens[fg], tokens[bg]) >= 4.5, value + ' ' + fg + '/' + bg);
    }
    assert.ok(contrast('#ffffff', tokens.button) >= 4.5, value + ' button');
  }
});

test('그룹 삭제는 카드 위치·연결 대상을 유지하고 자식 그룹을 해제', () => {
  const { removeBoardGroup } = require('../src/models/utils/boardIndex.ts');
  const tasks = [{ id: 1, column_id: 1, x: 20, y: 40 }, { id: 2, column_id: 2, x: 10, y: 10 }];
  const groups = [{ id: 1, x: 100, y: 200 }, { id: 2, parentId: 1, x: 500, y: 200, depth: 1 }, { id: 3, parentId: 2, depth: 2 }];
  const result = removeBoardGroup(tasks, groups, 1);
  // 그룹 안에서 표시되는 정렬 슬롯(20,70)의 절대 위치를 유지합니다.
  assert.deepEqual(result.tasks[0], { id: 1, column_id: undefined, x: 120, y: 270 });
  assert.equal(result.tasks[1], tasks[1]);
  assert.equal(result.groups[0].parentId, null);
  assert.equal(result.groups[0].x, 500);
  assert.equal(result.groups[1].depth, 1);
  assert.equal(tasks[0].column_id, 1);
  assert.equal(groups.length, 3);
});

test('연속 그룹 추가와 큰 카드도 동일한 왼쪽 정렬·간격·그룹 내부를 유지', () => {
  const { cardSize, groupedPosition, groupGrid, fitGroup } = require('../src/models/utils/cardLayout.ts');
  const group = { id: 7, x: -100, y: 150, width: 320, height: 200 };
  const tasks = [1,2,3].map((id,i) => ({ id, column_id: 7, x: i * 100, y: i * 120, width: id===2 ? 400 : 280, height: id===2 ? 260 : 140 }));
  for (let count=1;count<=3;count++) {
    const list = tasks.slice(0,count), fitted=fitGroup(group,list), grid=groupGrid(list);
    list.forEach((task,index) => {
      const p=groupedPosition(task,group,list), size=cardSize(task);
      assert.equal(p.x,-80);
      assert.equal(p.y,220+index*(grid.cardHeight+12));
      assert.ok(p.y+size.height<=fitted.y+fitted.height);
      assert.ok(p.x+size.width<=fitted.x+fitted.width);
    });
  }
  assert.deepEqual(cardSize({width:1,height:9999}),{width:220,height:800});
  assert.deepEqual(cardSize({width:NaN}),{width:280,height:140});
});

test('우클릭은 원래 카드 또는 그룹을 식별하고 캔버스에는 삭제 대상을 지정하지 않음', () => {
  const { getBoardMenuTarget } = require('../src/models/utils/boardMenu.ts');
  const taskElement = { closest: selector => selector.startsWith('[id') ? { id: 'task-42' } : null };
  const groupElement = { closest: selector => selector === '[data-group-id]' ? { getAttribute: () => '7' } : null };
  assert.equal(getBoardMenuTarget(taskElement).targetTaskId, 42);
  assert.equal(getBoardMenuTarget(groupElement).targetGroupId, 7);
  assert.equal(getBoardMenuTarget(null).targetTaskId, undefined);
});

test('pointerup 뒤 캔버스로 재지정된 contextmenu도 최초 카드 대상을 유지', () => {
  const { getBoardMenuTarget, resolveBoardMenuTarget } = require('../src/models/utils/boardMenu.ts');
  const card = { closest: selector => selector.startsWith('[id') ? { id: 'task-42' } : null };
  const canvas = { closest: () => null };
  const captured = getBoardMenuTarget(card);
  // pointerup에서 panState를 지운 뒤 contextmenu.target이 캔버스여도 카드 메뉴여야 합니다.
  assert.equal(resolveBoardMenuTarget(captured, canvas).targetTaskId, 42);
  // 다음 제스처가 빈 바탕에서 시작했다면 이전 카드가 선택되어서는 안 됩니다.
  assert.equal(resolveBoardMenuTarget(getBoardMenuTarget(canvas), card).targetTaskId, undefined);
  assert.equal(resolveBoardMenuTarget(null, card).targetTaskId, 42);
});

test('데모 정리는 내용·소속을 유지하고 좁은 화면에서는 그룹 아래에 배치', () => {
  const { arrangeDemoLayout } = require('../src/models/utils/demoLayout.ts');
  const groups = [{ id: 1, x: 800, y: 500, width: 320, height: 400 }];
  const tasks = [{ id: 1, title: '그룹 카드', column_id: 1, x: 20, y: 20 }, { id: 2, title: '자유 카드', x: 999, y: 999, description: '보존' }];
  const wide = arrangeDemoLayout(tasks, groups, 960);
  assert.equal(wide.tasks[0], tasks[0]);
  assert.equal(wide.tasks[1].description, '보존');
  assert.equal(wide.tasks[1].x, 364);
  assert.equal(wide.groups[0].x, 20);
  const narrow = arrangeDemoLayout(tasks, groups, 500);
  assert.ok(narrow.tasks[1].y > narrow.groups[0].y + groups[0].height);
  assert.equal(groups[0].x, 800);
  assert.deepEqual(arrangeDemoLayout(wide.tasks, wide.groups, 960), wide);
});

test('임의 카드 색은 고정 검정/흰색 중 대비가 높은 글자를 선택', () => {
  const { getContrastColor } = require('../src/models/utils/canvas.ts');
  for (const bg of ['#fff9c4', '#e3f2fd', '#e8f5e9', '#fce7f3', '#f3e8ff', '#ff0000', '#663399', '#777777', '#222222']) {
    const color = getContrastColor(bg) === 'text-black' ? '#000000' : '#ffffff';
    assert.ok(contrast(color, bg) >= 4.5, bg);
  }
  assert.equal(getContrastColor('#fff'), 'text-black');
  assert.equal(getContrastColor('#000'), 'text-white');
});

test('보드 조회 최적화는 기존 필터 순서·중복 정책·자유 카드 판정을 유지', () => {
  const { selectBoardTasks, indexBoardTasks } = require('../src/models/utils/boardIndex.ts');
  const tasks = Array.from({ length: 1000 }, (_, i) => ({ id: i % 900, boardId: i % 4, column_id: i % 6 || undefined }));
  const groups = [{ id: 1 }, { id: 2 }, { id: 3 }];
  for (const boardId of [1, 2, 3]) {
    const expected = tasks.filter(t => t.boardId === boardId || t.boardId === 2 || boardId === 1).filter((t, i, list) => i === list.findIndex(x => x.id === t.id));
    assert.deepEqual(selectBoardTasks(tasks, boardId, 2), expected);
  }
  const index = indexBoardTasks(tasks, groups);
  assert.deepEqual(index.free, tasks.filter(t => !t.column_id || !groups.some(g => g.id === t.column_id)));
  for (const group of groups) assert.deepEqual(index.byGroup.get(group.id), tasks.filter(t => t.column_id === group.id));
  assert.equal(index.byId.get(0), tasks[0]);
  assert.deepEqual(indexBoardTasks([], []).free, []);
});

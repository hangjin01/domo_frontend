// 카드 상세 모달을 실제 React 렌더러로 검사합니다. API 테스트만으로 놓칠 수 있는
// JSX의 undefined 접근을 잡되, effect/네트워크/사용자 브라우저 데이터는 실행하지 않습니다.
/* eslint-disable @typescript-eslint/no-require-imports -- Node 테스트에서 TSX 소스를 변환해 실제 컴포넌트를 불러옵니다. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

// Next의 @/ 경로와 TS/TSX를 이 테스트 프로세스 안에서만 해석합니다.
function loadTypeScript(module, filename) {
  const originalRequire = module.require.bind(module);
  module.require = id => originalRequire(id.startsWith('@/') ? path.join(root, id.slice(2)) : id);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
}
require.extensions['.ts'] = loadTypeScript;
require.extensions['.tsx'] = loadTypeScript;
const { TaskDetailModal } = require('../src/views/task/TaskDetailModal.tsx');

function renderTask(extra = {}) {
  return renderToStaticMarkup(React.createElement(TaskDetailModal, {
    task: { id: 1, title: '첨부 없는 샘플 카드', status: 'todo', boardId: 1, x: 0, y: 0, ...extra },
    projectId: 1, currentUser: '테스트 사용자', currentUserId: 1,
    onClose: () => {}, onUpdate: () => {},
  }));
}

for (const [label, extra] of [
  ['files 필드 생략', {}],
  ['files null 응답', { files: null }],
  ['빈 files 배열', { files: [] }],
]) {
  test(`프로젝트 카드 상세: ${label}에도 첨부 0개와 추가 버튼 표시`, () => {
    const html = renderTask(extra);
    assert.match(html, /첨부 파일 \(0\)/);
    assert.match(html, /<span>추가<\/span>/);
    assert.match(html, /첨부 없는 샘플 카드/);
  });
}

test('첨부 파일이 있는 카드의 목록과 개수는 유지', () => {
  const html = renderTask({ files: [{ id: 42, name: '샘플.pdf', size: 2048, url: '/sample.pdf' }] });
  assert.match(html, /첨부 파일 \(1\)/);
  assert.match(html, /샘플\.pdf/);
  assert.match(html, /2\.0 KB/);
});

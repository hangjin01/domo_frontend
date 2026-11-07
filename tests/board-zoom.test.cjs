const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(require.resolve('../src/models/utils/boardZoom.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { clampZoom, zoomScroll, fitZoom } = mod.exports;
test('배율 제한과 비정상 입력', () => {
  assert.equal(clampZoom(0.01), .25); assert.equal(clampZoom(3), 2); assert.equal(clampZoom(NaN), 1);
});
test('휠 포인터 아래 월드 좌표는 배율 변경 전후 동일', () => {
  for (const before of [.25, .5, 1, 2]) for (const after of [.25, .5, 1, 2]) {
    const next = zoomScroll(400, 120, before, after);
    assert.equal((next + 120) / after, (400 + 120) / before);
  }
});
test('전체 맞춤은 여백을 두고 축소하며 25%보다 작아지지 않음', () => {
  assert.equal(fitZoom(1000, 500, 564, 314), .5);
  assert.equal(fitZoom(10, 10, 1000, 1000), 1);
  assert.equal(fitZoom(10000, 10000, 100, 100), .25);
});

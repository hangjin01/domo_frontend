const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { calculateMoney, moneyRows, validMoney } = require('../src/models/utils/money.ts');
const { buildMoneyXlsx } = require('../src/lib/moneyExcel.ts');
const task = (id, mode, amount = 0, date = '2026-11-05') => ({ id, title: `카드${id}`, boardId: 1, money: { mode, amount, date } });
const link = (from, to) => ({ from, to });
test('chain sum and signed average, including zero and disabled cards', () => {
  const tasks = [task(1,'plus',10000), task(2,'minus',5000),task(3,'sum'),task(4,'avg')];
  const r = calculateMoney(tasks,[link(1,2),link(2,3),link(3,4)]);
  assert.equal(r.get(3).value,5000); assert.equal(r.get(4).value,2500);
  tasks[0].money.amount=0;
  assert.equal(calculateMoney(tasks,[link(1,3)]).get(3).value,0);
  tasks[0].money=null;
  assert.equal(calculateMoney(tasks,[link(1,3)]).get(3).value,null);
});
test('diamond, duplicate edges and intermediate sums do not double count', () => {
  const r = calculateMoney([task(1,'plus',100), task(2,'sum'), task(3,'sum'),task(4,'sum')], [link(1,2),link(1,3),link(2,4),link(3,4),link(3,4)]);
  assert.equal(r.get(4).value,100); assert.deepEqual(r.get(4).sources,[1]);
});
test('cycles, self links, invalid amounts and overflow report errors', () => {
  assert.match(calculateMoney([task(1,'sum'),task(2,'plus',1)], [link(1,2),link(2,1)]).get(1).error,/순환/);
  assert.match(calculateMoney([task(1,'sum')],[link(1,1)]).get(1).error,/순환/);
  assert.equal(validMoney({mode:'plus',amount:-1,date:'2026-11-05'}),false);
  assert.equal(validMoney({mode:'plus',amount:1,date:'2026-02-30'}),false);
  assert.equal(validMoney({mode:'plus',amount:Infinity,date:'2026-11-05'}),false);
  assert.match(calculateMoney([task(1,'plus',Number.MAX_SAFE_INTEGER),task(2,'plus',1),task(3,'sum')],[link(1,3),link(2,3)]).get(3).error,/범위/);
});
test('date filters are inclusive and exclude summary rows; project isolation', () => {
  const tasks=[task(1,'plus',10,'2026-11-04'),task(2,'minus',5),task(3,'sum')];
  assert.deepEqual(moneyRows(tasks,'2026-11-05','2026-11-05').map(t=>t.id),[2]);
  assert.deepEqual(moneyRows(tasks,'','',[1]).map(t=>t.id),[1]);
  tasks[0].boardId=2;
  assert.equal(calculateMoney(tasks,[link(1,3),link(99,3)]).get(3).value,null);
});
test('xlsx stores dates and amounts as numbers, strings never as formulas', () => {
  const bytes=buildMoneyXlsx([{name:'금액표',rows:[['날짜','카드','금액'],[{date:'2026-11-05'},'=1+1 & <태그>',5000]]}]);
  const buffer=Buffer.from(bytes); const files={}; let offset=0;
  while(buffer.readUInt32LE(offset)===0x04034b50) {
    const size=buffer.readUInt32LE(offset+18), n=buffer.readUInt16LE(offset+26), extra=buffer.readUInt16LE(offset+28);
    const name=buffer.subarray(offset+30,offset+30+n).toString(); const start=offset+30+n+extra;
    files[name]=buffer.subarray(start,start+size).toString(); offset=start+size;
  }
  assert.ok(files['[Content_Types].xml']);
  assert.match(files['xl/worksheets/sheet1.xml'],/<v>5000<\/v>/);
  assert.match(files['xl/worksheets/sheet1.xml'],/=1\+1 &amp; &lt;태그&gt;/);
  assert.doesNotMatch(files['xl/worksheets/sheet1.xml'],/<f>/);
  assert.match(files['xl/styles.xml'],/yyyy-mm-dd/);
});

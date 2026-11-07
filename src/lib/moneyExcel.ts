/** 외부 서버/런타임 없이 동작하는 최소 OOXML 내보내기입니다.
 * ZIP은 무압축으로 작성하고 문자열은 inlineStr로 저장해 =,+ 등의 수식 주입을 막습니다.
 * 계산 결과는 내보낸 시점의 값이며 Excel에서 다시 계산하는 수식은 포함하지 않습니다. */
export type ExcelCell = string | number | { date: string } | null;
const xml = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const encoder = new TextEncoder();
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files: Record<string, string>) {
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0, directorySize = 0;
  for (const [name, text] of Object.entries(files)) {
    const n = encoder.encode(name), data = encoder.encode(text), crc = crc32(data);
    const head = new Uint8Array(30 + n.length), view = new DataView(head.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(12, 33, true);
    view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, n.length, true); head.set(n, 30);
    const dir = new Uint8Array(46 + n.length), d = new DataView(dir.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(14, 33, true);
    d.setUint32(16, crc, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, n.length, true); d.setUint32(42, offset, true); dir.set(n, 46);
    parts.push(head, data); central.push(dir); offset += head.length + data.length; directorySize += dir.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  const output = new Uint8Array(offset + directorySize + end.length);
  let at = 0; for (const part of [...parts, ...central, end]) { output.set(part, at); at += part.length; }
  return output;
}
export function buildMoneyXlsx(sheets: { name: string; rows: ExcelCell[][] }[]) {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files: Record<string, string> = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="styles" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="#,##0.##;[Red]-#,##0.##"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF263650"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
  };
  sheets.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="3" width="36" customWidth="1"/><col min="4" max="8" width="22" customWidth="1"/></cols><sheetData>${sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => {
      const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
      if (value === null) return `<c r="${ref}"/>`;
      if (typeof value === 'object') return `<c r="${ref}" s="2"><v>${Date.parse(value.date + 'T00:00:00Z') / 86400000 + 25569}</v></c>`;
      if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('내보낼 수 없는 금액입니다.'); return `<c r="${ref}" s="3"><v>${value}</v></c>`; }
      return `<c r="${ref}" t="inlineStr" s="${r === 0 ? 1 : 0}"><is><t xml:space="preserve">${xml(value.slice(0, 32767))}</t></is></c>`;
    }).join('')}</row>`).join('')}</sheetData></worksheet>`;
  });
  return zip(files);
}

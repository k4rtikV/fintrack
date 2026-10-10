import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { parseStatementFile } from "../utils/statementFileParser.js";
import { amountPaise, normalizeStatementRows, parseStatementDate } from "../utils/statementImportRows.js";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel) => fs.readFileSync(path.join(base, rel), "utf8");
const csv = `Date,Description,Debit,Credit,Reference\r\n01/10/2026,"Tea, Cafe",125.50,,UPI-1\r\n02/10/2026,Salary,,50000.00,NEFT-1\r\n02/10/2026,Salary,,50000.00,NEFT-1\r\n`;
const parsed = parseStatementFile(Buffer.from(csv), "csv");
assert.equal(parsed.rows.length, 4);
assert.equal(parsed.rows[1][1], "Tea, Cafe");
const mapping = { headerRow: 0, mode: "DEBIT_CREDIT", dateColumn: 0,
  descriptionColumn: 1, debitColumn: 2, creditColumn: 3, referenceColumn: 4,
  dateOrder: "DMY" };
const rows = normalizeStatementRows({ rows: parsed.rows, mapping }).rows;
assert.equal(rows.length, 3);
assert.equal(rows[0].type, "EXPENSE");
assert.equal(rows[0].paise, 12550);
assert.equal(rows[1].type, "INCOME");
assert.equal(rows[1].paise, 5000000);
assert.notEqual(rows[1].fingerprint, rows[2].fingerprint, "Legitimate repeated same-day rows need distinct ordinal fingerprints");
assert.deepEqual(rows, normalizeStatementRows({ rows: parsed.rows, mapping }).rows, "Re-import fingerprints must be stable");
assert.equal(parseStatementDate("01/10/2026"), "2026-10-01");
assert.equal(parseStatementDate("01/10/26"), "2026-10-01");
assert.equal(parseStatementDate("10/01/2026", "MDY"), "2026-10-01");
assert.equal(parseStatementDate("2026-02-30"), null);
assert.equal(parseStatementDate("2026-10-01T00:00:00Z"), "2026-10-01");
assert.equal(parseStatementDate("46022", "DMY"), "2025-12-31");
assert.equal(amountPaise("₹1,25,234.99"), 12523499);
assert.equal(amountPaise("(125.40)"), -12540);
assert.equal(amountPaise("125.40 DR"), -12540, "DR-suffixed signed amounts must debit the account");
assert.equal(amountPaise("125.40 CR"), 12540, "CR-suffixed signed amounts must credit the account");
assert.equal(amountPaise("-125.40 CR"), null, "Conflicting amount direction must be rejected");
assert.throws(() => parseStatementFile(Buffer.from("date,value\na,b"), "xls"), /Only/);
assert.throws(() => parseStatementFile(Buffer.from('Date,Amount\n01/10/2026,"unclosed'), "csv"), /unfinished quoted/);

// Minimal compressed XLSX archive: test actual central-directory reading,
// shared strings, sparse columns, CRC and ZIP path validation without packages.
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  crcTable[i] = c >>> 0;
}
const crc32 = (data) => {
  let c = 0xffffffff;
  for (const byte of data) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const buildZip = (files) => {
  let offset = 0;
  const local = [], central = [];
  for (const [name, text] of Object.entries(files)) {
    const n = Buffer.from(name), value = Buffer.from(text), compressed = deflateRawSync(value);
    const crc = crc32(value);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(8, 8);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(compressed.length, 18); l.writeUInt32LE(value.length, 22); l.writeUInt16LE(n.length, 26);
    local.push(l, n, compressed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(value.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += l.length + n.length + compressed.length;
  }
  const centralData = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralData, end]);
};
const xlsx = buildZip({
  "xl/workbook.xml": '<workbook><sheets><sheet name="Statement" sheetId="1" r:id="rId1"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  "xl/sharedStrings.xml": '<sst><si><t>Date</t></si><si><t>Description</t></si><si><t>Amount</t></si><si><t>Groceries</t></si></sst>',
  "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2"><v>46022</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>-123.45</v></c></row></sheetData></worksheet>',
});
const decoded = parseStatementFile(xlsx, "xlsx");
assert.equal(decoded.rows[1][1], "Groceries");
const signed = normalizeStatementRows({ rows: decoded.rows,
  mapping: { headerRow: 0, mode: "SIGNED_AMOUNT", dateColumn: 0, descriptionColumn: 1, amountColumn: 2 } }).rows;
assert.equal(signed[0].type, "EXPENSE");
assert.equal(signed[0].paise, 12345);
assert.throws(() => parseStatementFile(buildZip({ "../xl/workbook.xml": "bad" }), "xlsx"), /unsafe/);
const corrupted = Buffer.from(xlsx);
corrupted[60] ^= 0xff;
assert.throws(() => parseStatementFile(corrupted, "xlsx"));

assert.match(read("server/src/models/StatementImportEntry.js"), /unique:\s*true/);
assert.match(read("server/src/services/statementImport.service.js"), /mongoose\.connection\.transaction/);
assert.match(read("server/src/services/statementImport.service.js"), /StatementImportEntry\.insertMany/);
assert.match(read("server/src/services/statementImport.service.js"), /account\.save\(\{ session/);
assert.match(read("server/src/routes/statementImport.routes.js"), /requireAppUnlocked/);
assert.match(read("server/src/app.js"), /3mb/);
assert.match(read("client/src/pages/BudgetsPage.jsx"), /useState\(""\)/);
assert.match(read("client/src/pages/BudgetsPage.jsx"), /All months/);
assert.match(read("server/src/services/budget.service.js"), /\$dateToString/);
assert.match(read("server/src/models/UserSession.js"), /SAME_BROWSER_SIGN_IN/);
assert.match(read("server/src/services/security.service.js"), /browserInstanceHash/);
assert.match(read("server/src/controllers/auth.controller.js"), /getOrSetBrowserInstance/);
assert.doesNotMatch(read("client/src/components/layout/TopNavigation.jsx"), /node\.scrollIntoView\(/);
assert.match(read("client/src/components/layout/AnimatedOutlet.jsx"), /useLayoutEffect/);
assert.doesNotMatch(read("client/src/components/accounts/AccountModal.jsx"), /value="USD"/);
assert.doesNotMatch(read("client/src/pages/SettingsPage.jsx"), /value="USD"/);
assert.match(read("server/src/validators/account.validator.js"), /z\.literal\("INR"\)/);
assert.match(read("server/src/validators/settings.validator.js"), /z\.literal\("INR"\)/);
console.log("FinTrack V2 completion-pass CSV/XLSX, date, duplicate, security and navigation regressions passed.");

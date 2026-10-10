// Bounded, dependency-free CSV and XLSX table reader. It never evaluates
// spreadsheet formulae, loads external relationships, or follows ZIP paths.
import { inflateRawSync } from "node:zlib";
import AppError from "./AppError.js";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ROWS = 501; // header/metadata + 500 transaction rows
const MAX_COLS = 30;
const MAX_CELL_LENGTH = 500;
const MAX_UNCOMPRESSED_XML = 5 * 1024 * 1024;
const MAX_TOTAL_XML = 12 * 1024 * 1024;
const MAX_ENTRIES = 256;

const reject = (message) => { throw new AppError(message, 400); };
const cleanCell = (value) => {
  const text = String(value ?? "").replace(/\u0000/g, "").trim();
  if (text.length > MAX_CELL_LENGTH) reject("Statement cell exceeds 500 characters; no values were truncated");
  return text;
};

const decodeXml = (value) => String(value).replace(/&(amp|lt|gt|quot|apos|#x[\da-fA-F]+|#\d+);/g, (all, entity) => {
  const names = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  if (entity in names) return names[entity];
  const codepoint = entity.startsWith("#x") ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
  return Number.isInteger(codepoint) && codepoint > 0 && codepoint <= 0x10ffff && !(codepoint >= 0xd800 && codepoint <= 0xdfff)
    ? String.fromCodePoint(codepoint) : "";
});
const extractText = (xml) => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
const attr = (tag, name) => new RegExp(`(?:\\s)${name}="([^"]*)"`).exec(tag)?.[1] || "";

const ensureBounds = (rows) => {
  if (rows.length > MAX_ROWS + 10) reject("Statement contains too many rows; upload up to 500 transactions at once");
  return rows.map((row) => {
    if (row.length > MAX_COLS) reject("Statement has too many columns (maximum 30)");
    return row.map(cleanCell);
  });
};

const parseDelimited = (text) => {
  const input = text.replace(/^\uFEFF/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] || "";
  const candidates = [",", "\t", ";"];
  const delimiter = candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') { field += '"'; i++; }
      else if (!inQuotes && !field.trim()) inQuotes = true;
      else if (inQuotes) inQuotes = false;
      else field += ch;
    } else if (ch === delimiter && !inQuotes) {
      row.push(field); field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS + 10) reject("Statement exceeds the 500 transaction row limit");
    } else {
      field += ch;
    }
    if (field.length > MAX_CELL_LENGTH * 16) reject("Statement cell is too long");
  }
  if (inQuotes) reject("CSV has an unfinished quoted field");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return ensureBounds(rows);
};

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  crcTable[n] = c >>> 0;
}
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const readZipParts = (buffer) => {
  // Use the ZIP central directory, never trust offsets/size in local headers.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) reject("Not a valid XLSX workbook");
  const count = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES || directorySize > buffer.length || directoryOffset + directorySize > eocd) reject("XLSX archive exceeds safe limits");
  const result = new Map();
  let offset = directoryOffset, total = 0;
  for (let n = 0; n < count; n++) {
    if (offset + 46 > eocd || buffer.readUInt32LE(offset) !== 0x02014b50) reject("Invalid XLSX archive directory");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const storedCrc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > eocd) reject("Malformed XLSX directory entry");
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset = end;
    if (/\\|\.\.|^\//.test(name) || (flags & 1) || ![0, 8].includes(method) || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) reject("Unsupported or unsafe XLSX archive");
    // Ignore media, embedded objects and external links. No code execution.
    if (!/^(?:xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml))$/.test(name)) continue;
    if (uncompressedSize > MAX_UNCOMPRESSED_XML || (total += uncompressedSize) > MAX_TOTAL_XML) reject("XLSX XML exceeds safe limits");
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) reject("Invalid XLSX local file header");
    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    if (start + compressedSize > buffer.length) reject("Truncated XLSX entry");
    const compressed = buffer.subarray(start, start + compressedSize);
    let data;
    try { data = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: MAX_UNCOMPRESSED_XML }); }
    catch { reject("Could not decompress XLSX workbook"); }
    if (data.length !== uncompressedSize || crc32(data) !== storedCrc) reject("Corrupted XLSX entry");
    const xml = data.toString("utf8");
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) reject("XLSX contains disallowed XML declarations");
    result.set(name, xml);
  }
  return result;
};

const columnIndex = (letters) => [...letters.toUpperCase()].reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) - 1;

const parseXlsx = (buffer) => {
  const entries = readZipParts(buffer);
  const workbook = entries.get("xl/workbook.xml") || "";
  if (!workbook) reject("XLSX workbook metadata is missing");
  const shared = [];
  for (const match of (entries.get("xl/sharedStrings.xml") || "").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    shared.push(extractText(match[1]));
    if (shared.length > 30000) reject("Too many XLSX shared strings");
  }
  let worksheetName = "xl/worksheets/sheet1.xml";
  const firstSheetId = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const rels = entries.get("xl/_rels/workbook.xml.rels") || "";
  if (firstSheetId) {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*\/>/g)].find(([tag]) => attr(tag, "Id") === firstSheetId)?.[0];
    const target = rel ? decodeXml(attr(rel, "Target")) : "";
    if (target) {
      const normalized = target.replace(/^\//, "").replace(/^xl\//, "");
      if (/^worksheets\/[^/]+\.xml$/.test(normalized)) worksheetName = `xl/${normalized}`;
    }
  }
  const xml = entries.get(worksheetName) || [...entries.entries()].find(([key]) => /^xl\/worksheets\/[^/]+\.xml$/.test(key))?.[1];
  if (!xml) reject("XLSX does not contain a readable worksheet");
  const rows = [];
  for (const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cell of match[1].matchAll(/<c\b([^>]*?)(?:\/\>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = `<c ${cell[1]}>`;
      const column = /^([A-Z]+)/i.exec(attr(attributes, "r"))?.[1];
      const index = column ? columnIndex(column) : row.length;
      if (index < 0 || index >= MAX_COLS) reject("XLSX contains too many columns");
      const content = cell[2] || "";
      const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(content)?.[1] || "";
      const type = attr(attributes, "t");
      const raw = type === "s" ? shared[Number(value)] || ""
        : type === "inlineStr" ? extractText(content)
        : type === "e" ? "" : decodeXml(value);
      row[index] = raw;
    }
    if (row.some((entry) => String(entry || "").trim())) rows.push(Array.from({ length: row.length }, (_, i) => row[i] || ""));
    if (rows.length > MAX_ROWS + 10) reject("XLSX exceeds the 500 transaction row limit");
  }
  return { rows: ensureBounds(rows), date1904: /<workbookPr\b[^>]*date1904="(?:1|true)"/.test(workbook) };
};

const parseStatementFile = (buffer, format) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_BYTES) reject("Statement must be a nonempty file of at most 3 MB");
  if (format === "csv") return { rows: parseDelimited(buffer.toString("utf8")), date1904: false };
  if (format === "xlsx") return parseXlsx(buffer);
  reject("Only .csv and .xlsx statements are supported");
};

export { parseStatementFile };

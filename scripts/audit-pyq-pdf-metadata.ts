/**
 * Read semester labels from PYQ PDFs and optionally correct explicit
 * mismatches in MongoDB. Every processed document is appended to a JSONL
 * audit log, so the job can resume after interruption.
 *
 * Usage (from the backend directory):
 *   npx tsx scripts/audit-pyq-pdf-metadata.ts
 *   npx tsx scripts/audit-pyq-pdf-metadata.ts --apply
 *
 * The default mode is read-only. --apply updates only `semester`, and only
 * when the PDF's first two pages contain exactly one explicit semester.
 */

import "dotenv/config";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import mongoose from "mongoose";

type PyqRecord = {
  _id: mongoose.Types.ObjectId;
  fileUrl?: string;
  semester?: number;
  title?: string;
  courseCode?: string;
};

type AuditRow = {
  id: string;
  url?: string;
  title?: string;
  courseCode?: string;
  oldSemester?: number;
  pdfSemester?: number;
  evidence?: string;
  status: "matched" | "corrected" | "conflict" | "no-explicit-semester" | "no-url" | "fetch-error" | "parse-error" | "update-conflict";
  detail?: string;
};

const APPLY = process.argv.includes("--apply");
const argIndex = process.argv.indexOf("--output");
const outputPath = resolve(argIndex >= 0 && process.argv[argIndex + 1]
  ? process.argv[argIndex + 1]
  : "output/pyq-pdf-metadata-audit.jsonl");
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : undefined;
const retryReportIndex = process.argv.indexOf("--retry-report");
const retryReportPath = retryReportIndex >= 0 && process.argv[retryReportIndex + 1]
  ? resolve(process.argv[retryReportIndex + 1])
  : undefined;
const CONCURRENCY = 6;
const PAGE_LIMIT = 2;
const FETCH_TIMEOUT_MS = 45_000;

function romanToNumber(raw: string): number | null {
  const s = raw.toUpperCase();
  if (/^\d{1,2}$/.test(s)) return Number(s);
  const values: Record<string, number> = { I: 1, V: 5, X: 10 };
  if (!/^[IVX]{1,4}$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const current = values[s[i]];
    const next = values[s[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function semesterMatches(text: string): { values: number[]; evidence: string[] } {
  const normalized = text
    .replace(/S\s*E\s*M\s*E\s*S\s*T\s*E\s*R/gi, "SEMESTER")
    .replace(/(\d)\s+(?=\d)/g, "$1");
  const patterns = [
    /\bSEMESTER\s*(?:NO\.?\s*)?[:.#-]?\s*(\d{1,2}|I{1,3}|IV|V|VI{0,3}|IX|X|XI|XII)\b/gi,
    /\b(\d{1,2}|I{1,3}|IV|V|VI{0,3}|IX|X|XI|XII)\s*(?:ST|ND|RD|TH)?\s+SEMESTER\b/gi,
    /\bSEM\s*[:.#-]?\s*(\d{1,2}|I{1,3}|IV|V|VI{0,3}|IX|X|XI|XII)\b/gi,
  ];
  const found: { value: number; evidence: string }[] = [];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const value = romanToNumber(match[1]);
      if (value !== null && value >= 1 && value <= 12) {
        found.push({ value, evidence: match[0].replace(/\s+/g, " ").trim() });
      }
    }
  }
  const unique = new Map<string, { value: number; evidence: string }>();
  for (const match of found) unique.set(`${match.value}:${match.evidence.toLowerCase()}`, match);
  return {
    values: [...new Set([...unique.values()].map((item) => item.value))],
    evidence: [...unique.values()].map((item) => item.evidence),
  };
}

async function extractPdf(url: string): Promise<{ text: string; numPages: number }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("pdf") && !url.toLowerCase().includes(".pdf")) {
    throw new Error(`Unexpected content type: ${type || "unknown"}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Downloaded content is not a PDF");
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let number = 1; number <= Math.min(document.numPages, PAGE_LIMIT); number++) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => "str" in item ? item.str : "").join(" "));
  }
  return { text: pages.join("\n"), numPages: document.numPages };
}

async function readCompletedIds(path: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!existsSync(path)) return ids;
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    try {
      const row = JSON.parse(line) as AuditRow;
      if (row.id) ids.add(row.id);
    } catch {
      // Ignore a final partial line left by an interrupted process.
    }
  }
  return ids;
}

async function readRetryIds(path: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!existsSync(path)) throw new Error(`Retry report not found: ${path}`);
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    try {
      const row = JSON.parse(line) as AuditRow;
      if (row.id && row.status === "no-explicit-semester") ids.add(row.id);
    } catch {
      // Ignore a final partial line left by an interrupted process.
    }
  }
  return ids;
}

async function main() {
  await mkdir(dirname(outputPath), { recursive: true });
  const completed = await readCompletedIds(outputPath);
  const mongoUri = process.env.MONGO_URI;
  const mongoDbName = process.env.MONGO_DB_NAME;
  if (!mongoUri || !mongoDbName) {
    throw new Error("MONGO_URI and MONGO_DB_NAME must be set (or present in .env)");
  }
  const mongo = mongoose.connection;
  await mongoose.connect(mongoUri, { dbName: mongoDbName });
  const collection = mongo.collection<PyqRecord>("pyqs");
  const retryIds = retryReportPath ? await readRetryIds(retryReportPath) : null;
  const total = retryIds ? retryIds.size : await collection.countDocuments();
  const filter = retryIds
    ? { _id: { $in: [...retryIds].map((id) => new mongoose.Types.ObjectId(id)) } }
    : {};
  const pending = collection.find(filter, {
    projection: { _id: 1, fileUrl: 1, semester: 1, title: 1, courseCode: 1 },
    sort: { _id: 1 },
  }).limit(Number.isInteger(limit) && (limit ?? 0) > 0 ? limit! : 0);
  const append = createWriteStream(outputPath, { flags: "a", encoding: "utf8" });
  const stats: Record<string, number> = {};
  let processed = completed.size;
  const inFlight = new Set<Promise<void>>();

  const writeRow = (row: AuditRow) => new Promise<void>((resolveWrite, rejectWrite) => {
    append.write(`${JSON.stringify(row)}\n`, (error) => error ? rejectWrite(error) : resolveWrite());
  });

  const processRecord = async (doc: PyqRecord) => {
    const id = String(doc._id);
    let row: AuditRow;
    if (!doc.fileUrl) {
      row = { id, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, status: "no-url" };
    } else {
      try {
        const { text } = await extractPdf(doc.fileUrl);
        const found = semesterMatches(text);
        if (!found.values.length) {
          row = { id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, status: "no-explicit-semester" };
        } else if (found.values.length > 1) {
          row = { id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, status: "conflict", detail: `PDF contains semester values ${found.values.join(", ")}`, evidence: found.evidence.join(" | ").slice(0, 500) };
        } else {
          const semester = found.values[0];
          if (semester === doc.semester) {
            row = { id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, pdfSemester: semester, status: "matched", evidence: found.evidence.join(" | ").slice(0, 500) };
          } else if (!APPLY) {
            row = { id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, pdfSemester: semester, status: "corrected", evidence: found.evidence.join(" | ").slice(0, 500) };
          } else {
            const result = await collection.updateOne(
              { _id: doc._id, semester: doc.semester },
              { $set: { semester } },
            );
            row = {
              id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode,
              oldSemester: doc.semester, pdfSemester: semester,
              status: result.modifiedCount === 1 ? "corrected" : "update-conflict",
              evidence: found.evidence.join(" | ").slice(0, 500),
            };
          }
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        row = { id, url: doc.fileUrl, title: doc.title, courseCode: doc.courseCode, oldSemester: doc.semester, status: detail.startsWith("HTTP ") ? "fetch-error" : "parse-error", detail: detail.slice(0, 500) };
      }
    }
    await writeRow(row);
    stats[row.status] = (stats[row.status] ?? 0) + 1;
    processed++;
    if (processed % 100 === 0) console.log(`processed ${processed}/${total}; ${JSON.stringify(stats)}`);
  };

  try {
    for await (const doc of pending) {
      if (completed.has(String(doc._id))) continue;
      let task!: Promise<void>;
      task = processRecord(doc).finally(() => inFlight.delete(task));
      inFlight.add(task);
      if (inFlight.size >= CONCURRENCY) await Promise.race(inFlight);
    }
    await Promise.all(inFlight);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) => append.end((error?: Error | null) => error ? rejectClose(error) : resolveClose()));
    await mongoose.disconnect();
  }
  console.log(JSON.stringify({ mode: APPLY ? "apply-explicit-semesters" : "dry-run", total, resumed: completed.size, processed: processed - completed.size, outputPath, results: stats }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});

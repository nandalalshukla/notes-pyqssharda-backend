/**
 * Bulk-imports the university's DSpace question papers into Cloudinary +
 * MongoDB, so they don't have to be downloaded and re-uploaded by hand.
 *
 * Design constraints that shaped this:
 *
 * - IDEMPOTENT. Every paper gets a Cloudinary public_id derived from its
 *   DSpace handle + bitstream sequence, and a Pyq row is only inserted if
 *   no row already carries that public_id. Re-running after a crash, a
 *   partial run, or next year's new papers adds only what's missing.
 * - RESUMABLE. Progress is appended to a checkpoint file as it goes, so an
 *   interrupted run picks up where it stopped instead of re-uploading
 *   gigabytes.
 * - DRY-RUNNABLE. --dry-run does the full crawl, classification and
 *   duplicate check and writes a report, touching neither Cloudinary nor
 *   the database.
 *
 * Usage:
 *   npx tsx scripts/pyq-import/import.ts --dry-run
 *   npx tsx scripts/pyq-import/import.ts --dry-run --school Engineering
 *   npx tsx scripts/pyq-import/import.ts --limit 20        # real, small
 *   npx tsx scripts/pyq-import/import.ts                   # the full run
 *
 * Flags:
 *   --dry-run          classify and report; write nothing
 *   --inventory <p>    reuse a crawl instead of re-crawling
 *   --school <key>     only one school (Engineering, Law, Nursing, ...)
 *   --last-years <n>   only the n most recent academic years
 *   --min-year <yyyy>  only academic years starting at or after yyyy
 *   --limit <n>        stop after n papers
 *   --concurrency <n>  parallel uploads (default 4)
 *   --min-confidence   high | medium | low   (default medium)
 */

import "dotenv/config";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { env } from "../../src/config/env.js";
import cloudinary from "../../src/config/cloudinary.js";
import { Pyq } from "../../src/models/pyqs/pyq.model.js";
import { User } from "../../src/models/users/user.model.js";
import { crawl } from "./crawl.js";
import { classify, schoolKey, type ClassifiedEntry, type RawEntry } from "./classify.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DSPACE_BASE_URL ?? "http://10.120.97.20:8080";
const CHECKPOINT = join(HERE, ".checkpoint.jsonl");
const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 } as const;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const DRY_RUN = has("dry-run");
const LIMIT = Number(flag("limit") ?? 0) || Infinity;
const CONCURRENCY = Number(flag("concurrency") ?? 4);
const SCHOOL_FILTER = flag("school");
const LAST_YEARS = Number(flag("last-years") ?? 0) || 0;
const MIN_YEAR = Number(flag("min-year") ?? 0) || 0;
const MIN_CONFIDENCE = (flag("min-confidence") ?? "medium") as keyof typeof CONFIDENCE_RANK;

/** Lowercase, hyphenated, safe for a Cloudinary folder segment. */
function slug(text: string, max = 60): string {
  return (
    text
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "unknown"
  );
}

/**
 * Where a paper lives in Cloudinary:
 *
 *   pyq_uploads/<school>/<programme>/<year>/<code>-<name>-<handle>-<seq>
 *
 * Foldering by school/programme/year makes the media library browsable in
 * the same shape as the site's own filters, instead of one directory with
 * thousands of files in it.
 *
 * The trailing handle + bitstream sequence is what makes the id unique and
 * stable: two papers in different years can share a filename, and a course
 * can be examined twice in a year, but a DSpace bitstream address cannot
 * repeat. That stability is what lets a re-run overwrite rather than
 * duplicate.
 */
export function publicIdFor(entry: RawEntry, row?: ClassifiedEntry): string {
  const m = /\/bitstream\/123456789\/(\d+)\/(\d+)\//.exec(entry.bitstream);
  const handle = m?.[1] ?? "x";
  const seq = m?.[2] ?? "0";

  const school = slug(row?.school ?? entry.school, 48);
  const program = slug(row?.program ?? "unclassified", 40);
  const year = slug(row?.year ?? "unknown-year", 10);
  const name = slug(
    [row?.courseCode, row?.courseName].filter(Boolean).join(" ") ||
      entry.filename.replace(/\.pdf$/i, ""),
    56,
  );

  return `pyq_uploads/${school}/${program}/${year}/${name}-${handle}-${seq}`;
}

interface CheckpointRow {
  publicId: string;
  status: "uploaded" | "skipped" | "failed";
}

function loadCheckpoint(): Map<string, CheckpointRow["status"]> {
  const map = new Map<string, CheckpointRow["status"]>();
  if (!existsSync(CHECKPOINT)) return map;
  for (const line of readFileSync(CHECKPOINT, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as CheckpointRow;
      map.set(row.publicId, row.status);
    } catch {
      /* a partially-written final line after a hard kill; ignore it */
    }
  }
  return map;
}

/** Streams the PDF from DSpace straight into Cloudinary. */
async function uploadPaper(entry: ClassifiedEntry, publicId: string) {
  const res = await fetch(BASE + entry.bitstream, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) throw new Error("empty file");

  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        // "raw" is what the rest of the app stores PDFs as, and what
        // destroyCloudinaryAssets will later need to delete them.
        resource_type: "raw",
        public_id: publicId,
        // Without an explicit format the delivery URL has no extension and
        // Cloudinary serves it as application/octet-stream, which makes a
        // browser download the paper instead of previewing it. The app's
        // own upload path sets this too (config/multer.ts).
        format: "pdf",
        // Makes a re-run replace the same asset instead of creating
        // "name_abc123" duplicates alongside it.
        overwrite: true,
        invalidate: true,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("no upload result"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Runs `worker` over `items` with a fixed number of parallel slots. */
async function pooled<T>(items: T[], size: number, worker: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  // ── 1. Inventory ────────────────────────────────────────────────────────
  const inventoryPath = flag("inventory") ?? join(HERE, "inventory.json");
  let raw: RawEntry[];
  if (existsSync(inventoryPath)) {
    raw = JSON.parse(readFileSync(inventoryPath, "utf-8"));
    console.log(`Inventory: ${raw.length} papers (from ${inventoryPath})`);
  } else {
    console.log("No inventory on disk — crawling the repository...");
    raw = await crawl();
    writeFileSync(inventoryPath, JSON.stringify(raw, null, 1), "utf-8");
  }

  // ── 2. Classify + filter ────────────────────────────────────────────────
  let rows = raw.map(classify);
  if (SCHOOL_FILTER) {
    rows = rows.filter((r) => schoolKey(r.school) === SCHOOL_FILTER);
    console.log(`Filtered to school "${SCHOOL_FILTER}": ${rows.length}`);
  }

  // Academic-year window. `--last-years N` is relative to what the
  // repository actually holds rather than to today's date, so it stays
  // correct whether or not the current year has been published yet.
  if (LAST_YEARS > 0 || MIN_YEAR > 0) {
    const startYear = (y: string | null) => (y ? Number(y.slice(0, 4)) : NaN);
    let cutoff = MIN_YEAR;

    if (LAST_YEARS > 0) {
      const present = [...new Set(rows.map((r) => startYear(r.year)))]
        .filter((y) => !Number.isNaN(y))
        .sort((a, b) => b - a);
      const nth = present[LAST_YEARS - 1];
      if (nth !== undefined) cutoff = Math.max(cutoff, nth);
    }

    const before = rows.length;
    rows = rows.filter((r) => {
      const y = startYear(r.year);
      return !Number.isNaN(y) && y >= cutoff;
    });
    const kept = [...new Set(rows.map((r) => r.year))].sort().reverse();
    console.log(
      `Academic-year filter (>= ${cutoff}-${String(cutoff + 1).slice(-2)}): ` +
        `${rows.length} of ${before}`,
    );
    console.log(`  years kept: ${kept.join(", ")}`);
  }

  // The model requires courseCode, courseName, semester, year and program;
  // a row missing any of them cannot be inserted at all.
  const importable = rows.filter(
    (r) =>
      r.problems.length === 0 &&
      CONFIDENCE_RANK[r.confidence] >= CONFIDENCE_RANK[MIN_CONFIDENCE],
  );
  const held = rows.filter((r) => !importable.includes(r));

  console.log(`\nImportable: ${importable.length}   held for review: ${held.length}`);
  const reviewPath = join(HERE, "needs-review.json");
  writeFileSync(reviewPath, JSON.stringify(held, null, 1), "utf-8");
  console.log(`Held rows written to ${reviewPath}`);

  // ── 3. Connect ──────────────────────────────────────────────────────────
  const mongoUri = process.env.IMPORT_MONGO_URI ?? env.MONGO_URI;
  const dbName = process.env.IMPORT_MONGO_DB_NAME ?? env.MONGO_DB_NAME;
  await mongoose.connect(mongoUri, { dbName });
  console.log(`\nMongo: ${dbName}`);

  // Bulk-imported papers are owned by an admin: `userId` is required, and
  // attributing them to a student would be wrong. Contributions are
  // deliberately NOT incremented — these aren't anyone's contributions.
  const uploaderEmail = process.env.IMPORT_UPLOADER_EMAIL;
  const uploader = uploaderEmail
    ? await User.findOne({ email: uploaderEmail }).select("_id username role").lean()
    : await User.findOne({ role: "admin" }).select("_id username role").lean();
  if (!uploader) {
    console.error(
      "No admin user found to attribute the import to. Set IMPORT_UPLOADER_EMAIL.",
    );
    process.exit(1);
  }
  console.log(`Uploader: ${uploader.username} (${uploader.role})`);

  // ── 4. Skip what's already imported ─────────────────────────────────────
  const checkpoint = loadCheckpoint();
  const candidates = importable.map((r) => ({ row: r, publicId: publicIdFor(r, r) }));
  // Keyed on the source bitstream rather than the Cloudinary publicId:
  // provenance is stable, whereas a publicId changes the moment the folder
  // scheme does, which would make every previously-imported paper look new.
  const existing = new Set<string>(
    (
      await Pyq.find({
        "source.bitstream": { $in: candidates.map((c) => c.row.bitstream) },
      })
        .select("source.bitstream")
        .lean()
    ).map((d) => (d as { source?: { bitstream?: string } }).source?.bitstream ?? ""),
  );

  const todo = candidates
    .filter(
      (c) =>
        !existing.has(c.row.bitstream) && checkpoint.get(c.publicId) !== "uploaded",
    )
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);

  console.log(
    `Already in DB: ${existing.size}   checkpointed: ${checkpoint.size}   to import now: ${todo.length}`,
  );

  const bytesEstimate = (todo.length * 228) / 1024;
  console.log(`Estimated download/upload: ~${bytesEstimate.toFixed(2)} MB`);

  if (DRY_RUN) {
    const preview = join(HERE, "dry-run.json");
    writeFileSync(
      preview,
      JSON.stringify(
        todo.slice(0, 200).map((c) => ({ publicId: c.publicId, ...c.row })),
        null,
        1,
      ),
      "utf-8",
    );
    console.log(`\nDRY RUN — nothing written. Preview of first 200 -> ${preview}`);
    await mongoose.disconnect();
    return;
  }

  // ── 5. Upload + insert ──────────────────────────────────────────────────
  let done = 0;
  let failed = 0;
  const started = Date.now();

  await pooled(todo, CONCURRENCY, async ({ row, publicId }) => {
    try {
      const uploaded = await uploadPaper(row, publicId);
      await Pyq.updateOne(
        { "source.bitstream": row.bitstream },
        {
          $setOnInsert: {
            title: row.title,
            fileUrl: uploaded.secure_url,
            publicId: uploaded.public_id,
            resourceType: "raw",
            userId: uploader._id,
            program: row.program,
            school: row.school,
            courseCode: row.courseCode,
            courseName: row.courseName,
            semester: row.semester,
            year: row.year,
            source: {
              system: "dspace",
              handle: row.itemHandle,
              bitstream: row.bitstream,
            },
            // Imported from the university's own repository, so it is
            // published outright rather than queued for moderation.
            status: "approved",
            approvedBy: uploader._id,
            approvedAt: new Date(),
          },
        },
        { upsert: true },
      );
      appendFileSync(CHECKPOINT, JSON.stringify({ publicId, status: "uploaded" }) + "\n");
      done += 1;
    } catch (err) {
      failed += 1;
      appendFileSync(
        CHECKPOINT,
        JSON.stringify({ publicId, status: "failed", error: String(err) }) + "\n",
      );
      console.error(`  !! ${row.filename}: ${(err as Error).message}`);
    }

    const n = done + failed;
    if (n % 25 === 0 || n === todo.length) {
      const rate = n / ((Date.now() - started) / 1000);
      const eta = Math.round((todo.length - n) / Math.max(rate, 0.01));
      console.log(
        `  ${n}/${todo.length}  ok=${done} failed=${failed}  ${rate.toFixed(1)}/s  ETA ${Math.floor(eta / 60)}m`,
      );
    }
  });

  console.log(`\nDone. imported=${done} failed=${failed}`);
  console.log(`Failures are recorded in ${CHECKPOINT}; re-run to retry them.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

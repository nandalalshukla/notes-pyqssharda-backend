/**
 * Re-runs the classifier over already-imported papers and corrects their
 * metadata in place.
 *
 * The PDFs in Cloudinary are unaffected by a classification change — only
 * the fields derived from the filename are — so this touches MongoDB only
 * and costs no bandwidth. That makes it the right tool whenever
 * `classify.ts` is corrected, instead of purging and re-uploading
 * gigabytes.
 *
 * Rows are matched on `source.bitstream`, the one identifier that survives
 * a change to the Cloudinary folder scheme.
 *
 * Usage:
 *   npx tsx scripts/pyq-import/reclassify.ts --dry-run
 *   npx tsx scripts/pyq-import/reclassify.ts
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { env } from "../../src/config/env.js";
import { Pyq } from "../../src/models/pyqs/pyq.model.js";
import { classify, type RawEntry } from "./classify.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

const inventoryPath =
  process.argv[process.argv.indexOf("--inventory") + 1] &&
  process.argv.includes("--inventory")
    ? process.argv[process.argv.indexOf("--inventory") + 1]
    : join(HERE, "inventory.json");

const raw: RawEntry[] = JSON.parse(readFileSync(inventoryPath, "utf-8"));
const byBitstream = new Map(raw.map((e) => [e.bitstream, classify(e)]));

await mongoose.connect(process.env.IMPORT_MONGO_URI ?? env.MONGO_URI, {
  dbName: process.env.IMPORT_MONGO_DB_NAME ?? env.MONGO_DB_NAME,
});

const rows = await Pyq.find({ "source.system": "dspace" })
  .select("source program school semester year courseCode courseName title")
  .lean();

console.log(`imported rows in DB: ${rows.length}`);

interface Change {
  field: string;
  from: unknown;
  to: unknown;
}

const updates: { id: unknown; set: Record<string, unknown>; changes: Change[] }[] = [];
let unmatched = 0;

for (const row of rows) {
  const bitstream = (row as { source?: { bitstream?: string } }).source?.bitstream;
  const fresh = bitstream ? byBitstream.get(bitstream) : undefined;
  if (!fresh) {
    unmatched += 1;
    continue;
  }

  // Only fields the classifier derives. Never touches status, ownership,
  // fileUrl or publicId — a reclassification is not a re-import.
  const candidate: Record<string, unknown> = {
    program: fresh.program,
    school: fresh.school,
    semester: fresh.semester,
    year: fresh.year,
    courseCode: fresh.courseCode,
    courseName: fresh.courseName,
    title: fresh.title,
  };

  const changes: Change[] = [];
  const set: Record<string, unknown> = {};
  for (const [field, next] of Object.entries(candidate)) {
    // A row that no longer classifies cleanly keeps what it has rather
    // than being blanked — losing good data to a regression would be worse
    // than leaving it slightly stale.
    if (next === null || next === undefined) continue;
    const current = (row as unknown as Record<string, unknown>)[field];
    if (current !== next) {
      changes.push({ field, from: current, to: next });
      set[field] = next;
    }
  }

  if (changes.length) updates.push({ id: row._id, set, changes });
}

console.log(`unmatched (not in inventory): ${unmatched}`);
console.log(`rows needing correction: ${updates.length}`);

const byField = new Map<string, number>();
for (const u of updates) {
  for (const c of u.changes) byField.set(c.field, (byField.get(c.field) ?? 0) + 1);
}
console.log("\nchanges by field:");
for (const [f, n] of [...byField.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${f}`);
}

console.log("\nsample corrections:");
for (const u of updates.slice(0, 10)) {
  console.log(
    `  ${u.changes.map((c) => `${c.field}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`).join(", ")}`,
  );
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  await mongoose.disconnect();
  process.exit(0);
}

if (updates.length) {
  // One round trip rather than 5,000.
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    await Pyq.bulkWrite(
      slice.map((u) => ({
        updateOne: { filter: { _id: u.id }, update: { $set: u.set } },
      })),
    );
    done += slice.length;
    console.log(`  updated ${done}/${updates.length}`);
  }
}

console.log(`\nDone. corrected ${updates.length} rows.`);
await mongoose.disconnect();

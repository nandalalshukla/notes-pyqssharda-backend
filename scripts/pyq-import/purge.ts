/**
 * Removes everything a previous import wrote: the Cloudinary assets under
 * the dspace prefix and their Pyq rows, plus the local checkpoint.
 *
 * Only ever touches records whose publicId marks them as imported, so
 * hand-uploaded papers are never at risk.
 *
 * Run: npx tsx scripts/pyq-import/purge.ts --yes
 */
import "dotenv/config";
import { existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { env } from "../../src/config/env.js";
import cloudinary from "../../src/config/cloudinary.js";
import { Pyq } from "../../src/models/pyqs/pyq.model.js";

if (!process.argv.includes("--yes")) {
  console.error("Refusing to purge without --yes");
  process.exit(1);
}

const IMPORT_MARKER = /^pyq_uploads\/(dspace-|school-)/;

await mongoose.connect(process.env.IMPORT_MONGO_URI ?? env.MONGO_URI, {
  dbName: process.env.IMPORT_MONGO_DB_NAME ?? env.MONGO_DB_NAME,
});

const rows = await Pyq.find({ publicId: IMPORT_MARKER }).select("publicId").lean();
console.log(`found ${rows.length} imported rows`);

let destroyed = 0;
for (const r of rows) {
  try {
    await cloudinary.uploader.destroy(r.publicId as string, { resource_type: "raw" });
    destroyed += 1;
  } catch (err) {
    console.error(`  !! ${r.publicId}: ${(err as Error).message}`);
  }
  if (destroyed % 50 === 0 && destroyed) console.log(`  destroyed ${destroyed}/${rows.length}`);
}

const del = await Pyq.deleteMany({ publicId: IMPORT_MARKER });

// Sweep Cloudinary by prefix as well as by DB row.
//
// The two can diverge: if a run is still uploading while a purge is
// listing rows to delete, the DB rows written afterwards get removed by
// the deleteMany above but their assets were never in the list, leaving
// files in Cloudinary that nothing references. Deleting by prefix catches
// those, and is a no-op when the two are already in step.
const PREFIXES = ["pyq_uploads/dspace-", "pyq_uploads/school-"];
let sweptTotal = 0;
for (const prefix of PREFIXES) {
  // delete_resources_by_prefix caps at 1000 per call, so keep going until
  // a pass deletes nothing.
  for (;;) {
    const result = (await cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: "raw",
    })) as { deleted?: Record<string, string> };
    const n = Object.keys(result.deleted ?? {}).length;
    sweptTotal += n;
    if (n === 0) break;
    console.log(`  swept ${n} orphaned assets under ${prefix}`);
  }
}
const checkpoint = join(dirname(fileURLToPath(import.meta.url)), ".checkpoint.jsonl");
if (existsSync(checkpoint)) unlinkSync(checkpoint);

console.log(`purged: ${destroyed} tracked assets + ${sweptTotal} orphaned, ${del.deletedCount} db rows, checkpoint cleared`);
await mongoose.disconnect();

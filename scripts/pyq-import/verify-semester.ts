/**
 * Checks the single biggest inference this import makes.
 *
 * Most filenames don't state a semester, so `classify()` falls back to the
 * hundreds digit of the course code (AGL 109 -> 1, AGL 502 -> 5). A few
 * hundred filenames DO state their semester outright, which makes them a
 * free test set: if the convention holds, the digit should agree with the
 * stated value on those.
 *
 * Run: npx tsx scripts/pyq-import/verify-semester.ts <inventory.json>
 */

import { readFileSync } from "node:fs";
import { classify, schoolKey, type RawEntry } from "./classify.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: verify-semester.ts <inventory.json>");
  process.exit(1);
}

const entries: RawEntry[] = JSON.parse(readFileSync(path, "utf-8"));

let agree = 0;
let disagree = 0;
const examples: string[] = [];
const offsets = new Map<number, number>();
const perSchool = new Map<string, { agree: number; total: number }>();

for (const entry of entries) {
  const stem = entry.filename.replace(/\.pdf$/i, "");

  // Pull the stated semester directly, independently of classify().
  const stated =
    /SEMESTER\s*[-_ ]?\s*(\d{1,2})/i.exec(stem) ||
    /\bSEM\s*[-_ ]?\s*(\d{1,2})\b/i.exec(stem) ||
    /\b(\d{1,2})\s*(?:st|nd|rd|th)\s+SEMESTER\b/i.exec(stem) ||
    // Sharda writes "TERM-05" at least as often as "SEMESTER-05". Omitting
    // it shrank the Engineering sample from 1581 files to 2, which is how
    // a wrong rule for the largest school passed verification unnoticed.
    /\bTERM\s*[-_ ]?\s*(\d{1,2})\b/i.exec(stem);
  if (!stated) continue;

  const statedSem = Number(stated[1]);
  if (statedSem < 1 || statedSem > 12) continue;

  // Holdout test: blank out the stated semester and ask classify() what it
  // would have inferred without it. That measures the fallback actually
  // used on the ~7,900 files that never state a semester, rather than
  // trivially confirming that classify() can read a number it was handed.
  const heldOut: RawEntry = {
    ...entry,
    filename: entry.filename.replace(stated[0], " "),
  };
  const guess = classify(heldOut);
  if (guess.semester === null) continue;

  const predicted = guess.semester;
  const delta = predicted - statedSem;
  offsets.set(delta, (offsets.get(delta) ?? 0) + 1);

  const sk = schoolKey(entry.school) ?? "?";
  const ps = perSchool.get(sk) ?? { agree: 0, total: 0 };
  ps.total += 1;
  if (predicted === statedSem) ps.agree += 1;
  perSchool.set(sk, ps);

  if (predicted === statedSem) {
    agree += 1;
  } else {
    disagree += 1;
    if (examples.length < 15) {
      examples.push(
        `  stated ${statedSem}  code-digit ${predicted}  ${entry.filename.slice(0, 74)}`,
      );
    }
  }
}

const total = agree + disagree;
console.log(`Filenames stating a semester AND carrying a code: ${total}`);
if (total === 0) {
  console.log("No overlap — cannot validate the convention from this data.");
  process.exit(0);
}
console.log(`  agree:    ${agree} (${Math.round((agree / total) * 100)}%)`);

// Always report per school. A rule that is wrong for one school averages
// away in a single overall number — which is how Engineering, the largest
// school by far, kept a year-of-study code being read as a semester.
console.log("\nPer school:");
for (const [school, st] of [...perSchool.entries()].sort(
  (a, b) => b[1].total - a[1].total,
)) {
  console.log(
    `  ${school.padEnd(17)} ${String(st.agree).padStart(4)}/${String(st.total).padEnd(5)} ` +
      `${Math.round((st.agree / st.total) * 100)}%`,
  );
}
console.log(`  disagree: ${disagree} (${Math.round((disagree / total) * 100)}%)`);

console.log("\nDistribution of (code digit - stated semester):");
for (const [delta, n] of [...offsets.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${delta >= 0 ? "+" : ""}${delta}: ${n}`);
}

if (examples.length) {
  console.log("\nDisagreements:");
  examples.forEach((e) => console.log(e));
}

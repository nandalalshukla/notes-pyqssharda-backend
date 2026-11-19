/**
 * Crawls the university's DSpace (JSPUI) repository and writes an inventory
 * of undergraduate, postgraduate, and doctoral coursework papers.
 *
 * Why HTML and not an API: the repository's OAI-PMH endpoint answers, but
 * its index was never built server-side ("No matches for the query" for
 * every set including the whole-repository one), and the DSpace REST API
 * isn't deployed. The rendered pages are the only source of truth.
 *
 * Structure it walks:
 *   PYQ community -> school sub-communities -> UG/PG collection (or the
 *   standalone PhD coursework community) -> academic year -> PDF bitstreams.
 *
 * Read-only. Pages are cached on disk so re-runs don't re-hammer a campus
 * server, and so a failed import can be retried without re-crawling.
 *
 * Run: npx tsx scripts/pyq-import/crawl.ts [--out inventory.json]
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { RawEntry } from "./classify.js";

const BASE = process.env.DSPACE_BASE_URL ?? "http://10.120.97.20:8080";
const ROOT_HANDLE = process.env.DSPACE_PYQ_HANDLE ?? "/jspui/handle/123456789/1";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, ".cache");
const REFRESH_CACHE = process.argv.includes("--refresh");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET a page, caching it on disk. */
async function fetchPage(path: string): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = path.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 150) + ".html";
  const cached = join(CACHE_DIR, key);
  if (!REFRESH_CACHE && existsSync(cached)) return readFileSync(cached, "utf-8");

  const url = BASE + path;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "sharda-pyq-import/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      writeFileSync(cached, body, "utf-8");
      await sleep(150); // be polite to a campus server
      return body;
    } catch (err) {
      if (attempt === 2) {
        throw new Error(`Failed to crawl ${url} after 3 attempts: ${(err as Error).message}`);
      }
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error(`Failed to crawl ${BASE + path}`);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

/** Every (href, label) handle link on a page, de-duplicated in order. */
function handleLinks(html: string): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = [];
  const seen = new Set<string>();
  const re = /href="(\/jspui\/handle\/123456789\/\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    const key = `${m[1]}|${label}`;
    if (label && !seen.has(key)) {
      seen.add(key);
      out.push({ href: m[1], label });
    }
  }
  return out;
}

/** Unique PDF bitstream paths on an item page, in document order. */
function bitstreams(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /href="(\/jspui\/bitstream\/[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const fileName = decodeEntities(
      decodeURIComponent(m[1].split("?")[0].split("/").pop() ?? ""),
    );
    // DSpace also links shortcuts and other attachments from paper items.
    // Only PDF documents belong in the PYQ library.
    const hasExtension = /\.[^.]+$/.test(fileName);
    if (hasExtension && !/\.pdf$/i.test(fileName)) continue;
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

export async function crawl(): Promise<RawEntry[]> {
  const root = await fetchPage(ROOT_HANDLE);
  const schools = handleLinks(root).filter(
    (l) => l.label.startsWith("School of") || l.label.startsWith("SU "),
  );
  console.log(`Schools: ${schools.length}`);

  const inventory: RawEntry[] = [];
  const visited = new Set<string>();
  visited.add(ROOT_HANDLE);

  for (const school of schools) {
    visited.add(school.href);
    const schoolHtml = await fetchPage(school.href);
    // Collection naming varies across schools; walk both UG and PG, plus
    // the standalone doctoral coursework community.
    const academicCollections = handleLinks(schoolHtml).filter((l) =>
      /^(under|post)\s*graduate/i.test(l.label.trim()),
    );
    if (school.label.startsWith("SU PHD")) {
      academicCollections.push({ href: school.href, label: "PhD Course Work" });
      visited.delete(school.href);
    }

    console.log(`\n${school.label}`);
    if (academicCollections.length === 0) {
      console.log("   (no UG/PG collection)");
      continue;
    }

    for (const collection of academicCollections) {
      let itemCount = 0;
      const walk = async (href: string, label: string, academicYear: string) => {
        if (visited.has(href)) return;
        visited.add(href);

        const html = await fetchPage(href);
        const year = /20\d{2}\s*[-–]\s*\d{2,4}/.test(label) ? label : academicYear;
        const files = bitstreams(html);
        if (files.length) {
          itemCount += 1;
          console.log(`      ${year.padEnd(16)} ${String(files.length).padStart(5)} PDFs`);
          for (const bitstream of files) {
            inventory.push({
              school: school.label,
              collection: collection.label,
              itemHandle: href,
              itemTitle: year,
              bitstream,
              filename: decodeEntities(
                decodeURIComponent(bitstream.split("/").pop() ?? ""),
              ),
            });
          }
        }

        // Some schools (notably Business Studies) nest degree and year
        // handles below the UG collection. Walk every child handle rather
        // than assuming each direct child is already a PDF-bearing item.
        for (const child of handleLinks(html)) {
          if (child.href === href || /^(under|post)\s*graduate/i.test(child.label)) continue;
          await walk(child.href, child.label, year);
        }
      };

      console.log(`   ${collection.label}: crawling nested handles`);
      await walk(collection.href, collection.label, "");
      console.log(`      PDF-bearing items: ${itemCount}`);
    }
  }

  return inventory;
}

async function main() {
  const outArg = process.argv.indexOf("--out");
  const out = outArg > -1 ? process.argv[outArg + 1] : join(HERE, "inventory.json");
  const inventory = await crawl();
  writeFileSync(out, JSON.stringify(inventory, null, 1), "utf-8");
  console.log(`\nTOTAL ${inventory.length} PDFs -> ${out}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

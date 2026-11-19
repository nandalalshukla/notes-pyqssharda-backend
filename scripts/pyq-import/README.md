# PYQ bulk import

Imports undergraduate, postgraduate, and doctoral coursework papers from the university's DSpace
repository into Cloudinary + MongoDB, so they don't have to be downloaded
and re-uploaded by hand.

Source: `http://10.120.97.20:8080/jspui/handle/123456789/1` (campus network
only). Override with `DSPACE_BASE_URL` / `DSPACE_PYQ_HANDLE`.

## Why it scrapes HTML

The repository's OAI-PMH endpoint responds but its index was never built
server-side — every set, including the whole-repository one, answers "No
matches for the query" — and the DSpace REST API isn't deployed. The
rendered pages are the only source of truth.

There is also no per-paper metadata: each DSpace "item" is one academic
year holding hundreds of PDFs (up to ~795), so a paper's **filename is its
only metadata**. `classify.ts` parses it.

## Usage

```bash
# Refresh the full academic inventory (including nested school folders).
npx tsx scripts/pyq-import/crawl.ts --refresh

# Preview the requested academic years without uploading.
npx tsx scripts/pyq-import/import.ts --dry-run --min-year 2020 --min-confidence low

# Import all available papers from 2020-21 through the newest year.
npx tsx scripts/pyq-import/import.ts --min-year 2020 --min-confidence low
```

| Flag | Meaning |
| --- | --- |
| `--dry-run` | Classify and compare against MongoDB; write local reports, but do not upload or change DB rows |
| `--inventory <path>` | Reuse a previous crawl instead of re-crawling |
| `--refresh` | Ignore cached HTML and fetch every source page again |
| `--school <key>` | One school only (`Engineering`, `Law`, `Nursing`, …) |
| `--limit <n>` | Stop after n papers |
| `--concurrency <n>` | Parallel uploads (default 4) |
| `--min-confidence` | `high` \| `medium` \| `low` (default `medium`) |

Environment overrides, so a run can target a different database than the
API's own `.env`:

- `IMPORT_MONGO_URI`, `IMPORT_MONGO_DB_NAME`
- `IMPORT_UPLOADER_EMAIL` — the admin the papers are attributed to
  (defaults to the first `role: "admin"` user)

## Safety properties

- **Idempotent.** Each paper's Cloudinary `public_id` is derived from its
  DSpace handle + bitstream sequence, and a row is only inserted if that
  `publicId` isn't already present. Re-running adds only what's missing —
  including next year's new papers.
- **Resumable.** Progress is appended to `.checkpoint.jsonl` as it goes.
  An interrupted run resumes instead of re-uploading gigabytes.
- **Cached crawl.** Fetched pages are cached under `.cache/`, so a retry
  doesn't re-hammer the campus server.

## What it does to the data

- `status` is `approved` — these come from the university's own repository,
  so they aren't queued for moderation.
- `userId` is an admin. Contributions are deliberately **not** incremented:
  a bulk import isn't anyone's contribution.
- Papers whose filename doesn't yield every required field are written to
  `metadata-review.json`. They are still preserved in the database using
  `courseCode: "UNSPECIFIED"` and/or `semester: 0` where source metadata is
  absent; the public library labels semester 0 as “Semester not listed” and
  excludes it from semester filter options. Rows missing a title, program, or
  academic year remain in `needs-review.json` and are not uploaded. PG and
  doctoral records use the explicit program labels `Postgraduate (Other)` and
  `PhD (Other)` when the source filename does not name a degree.

## Classification confidence

`classify.ts` tags every row:

| Confidence | Meaning |
| --- | --- |
| `high` | Every field came from something the filename states outright |
| `medium` | A documented inference was used (see below) |
| `low` | A required field is missing — held back for review |

The main inference is **semester**. Most filenames don't state one, so the
hundreds digit of the course code is used (`AGL 109` → 1, `AGL 502` → 5).
`verify-semester.ts` measures this against the ~250 filenames that *do*
state a semester, as a holdout:

```bash
npx tsx scripts/pyq-import/verify-semester.ts scripts/pyq-import/inventory.json
```

At the time of writing that scores **85%**. Compact `0xx` course codes use
their second digit as the semester (for example, `CSE 062` → 6). Law is handled separately —
its codes number by year of study (`BAL_408` is semester 8), where the
plain digit rule scored 6%.

The other inference is **program**, from the course-code prefix, keyed on
`(school, prefix)` because the same letters mean different degrees in
different schools. Unknown prefixes fall back to a school-level default.
Keep the programme list in sync with
`notesandpyqsharda-frontend/lib/constants/programs.ts`.

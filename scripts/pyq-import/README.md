# PYQ bulk import

Imports undergraduate question papers from the university's DSpace
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
# 1. See what would happen. Writes nothing.
npx tsx scripts/pyq-import/import.ts --dry-run

# 2. Small real run to sanity-check the output.
npx tsx scripts/pyq-import/import.ts --limit 20

# 3. The full run.
npx tsx scripts/pyq-import/import.ts
```

| Flag | Meaning |
| --- | --- |
| `--dry-run` | Classify and report; touch neither Cloudinary nor the DB |
| `--inventory <path>` | Reuse a previous crawl instead of re-crawling |
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
  `needs-review.json` rather than guessed into the database.

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

At the time of writing that scores **85%**. Law is handled separately —
its codes number by year of study (`BAL_408` is semester 8), where the
plain digit rule scored 6%.

The other inference is **program**, from the course-code prefix, keyed on
`(school, prefix)` because the same letters mean different degrees in
different schools. Unknown prefixes fall back to a school-level default.
Keep the programme list in sync with
`notesandpyqsharda-frontend/lib/constants/programs.ts`.

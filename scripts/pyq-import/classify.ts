/**
 * Turns a repository filename into the fields the Pyq model requires.
 *
 * The DSpace repository stores no per-paper metadata: its OAI index is
 * empty, and each "item" is a single record holding an entire academic
 * year's worth of PDFs (up to ~795 of them). So the *filename* is the only
 * metadata there is, and every school names its files differently.
 *
 * Everything here is therefore a documented best-effort parse. Each result
 * carries a `confidence` and a list of `problems` so a caller can decide
 * what to import and what to hold back for review — nothing silently
 * guesses its way into the database.
 */

export interface RawEntry {
  school: string;
  collection: string;
  itemHandle: string;
  itemTitle: string;
  bitstream: string;
  filename: string;
}

export interface ClassifiedEntry extends RawEntry {
  title: string;
  courseCode: string | null;
  courseName: string | null;
  semester: number | null;
  semesterSource: "explicit" | "from-code" | "from-year-of-study" | "missing";
  year: string | null;
  program: string | null;
  programSource: "prefix" | "school-default" | "none";
  problems: string[];
  confidence: "high" | "medium" | "low";
}

/**
 * Course codes: "AGL 109", "BPT_469", "BP 203T", "BDS 3rd-301", "CSE301".
 * The negative lookahead is load-bearing — without it "SSAHS_ 2024-25"
 * parses as the code "SSAHS 2024" and leaves a dangling "25" glued to the
 * course name.
 */
const CODE_RE =
  /\b([A-Za-z]{2,6})(?:\s*(?:1st|2nd|3rd|4th|5th|6th|7th|8th))?\s*[\s_-]?\s*(?!20\d{2}\b)(\d{3,4})\s*([A-Za-z])?\b/g;

/** Letters that look like a code prefix but are school tags, months, etc. */
const NOT_A_CODE = new Set([
  "SSAHS", "SOE", "SET", "SBSR", "SAS", "SHSS", "SOL", "SMSR", "SNSR",
  "SOP", "SDS", "SBS", "SEM", "SEMESTER", "MAY", "JUNE", "JULY", "DEC",
  "TERM", "PDF", "SESSION", "YEAR", "EVEN", "ODD",
]);

const SEM_PATTERNS = [
  /SEMESTER\s*[-_ ]?\s*(\d{1,2})/i,
  /\bSEM\s*[-_ ]?\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*(?:st|nd|rd|th)\s+SEMESTER\b/i,
  /\bTERM\s*[-_ ]?\s*(\d{1,2})\b/i,
];

const YEAR_RE = /(20\d{2})\s*[-–]\s*(\d{2,4})/;

/**
 * (school keyword, code prefix) -> the degree a student is enrolled in.
 *
 * Keyed on the school as well as the prefix because the same letters mean
 * different degrees in different schools — "BSP" is pharmaceutics under
 * Allied Health, and "BFS" is forensic science there but food science
 * under Engineering. A prefix-only table quietly mixes those up.
 */
const PROGRAM_BY_SCHOOL_PREFIX: Record<string, Record<string, string>> = {
  Engineering: {
    // B.Tech CSE and its specialisations. Kept as one degree: the
    // specialisation is a track within B.Tech CSE, and splitting it would
    // scatter shared first-year papers across half a dozen buckets.
    CSE: "B.Tech CSE", CSC: "B.Tech CSE", CSD: "B.Tech CSE", CSA: "B.Tech CSE",
    CSI: "B.Tech CSE", CSP: "B.Tech CSE", CSX: "B.Tech CSE", CMP: "B.Tech CSE",
    CTV: "B.Tech CSE", CBT: "B.Tech CSE", INT: "B.Tech CSE",

    MEC: "B.Tech Mechanical", AUT: "B.Tech Mechanical",
    CVL: "B.Tech Civil",
    ECE: "B.Tech ECE", ECR: "B.Tech ECE",
    EEE: "B.Tech EEE",

    BCA: "BCA", BCO: "B.Sc Computer Science", BDA: "B.Sc Data Analytics",

    BTY: "B.Sc Biotechnology", BBT: "B.Sc Biotechnology",
    BSB: "B.Sc Biotechnology", BBC: "B.Sc Biotechnology",
    BIC: "B.Sc Biotechnology",
    BSM: "B.Sc Microbiology",
    BGB: "B.Sc Biochemistry", BBY: "B.Sc Biochemistry",
    BSZ: "B.Sc Zoology",

    BAG: "B.Sc Agriculture", AGL: "B.Sc Agriculture", BAX: "B.Sc Agriculture",

    BPH: "B.Sc Physics", PHB: "B.Sc Physics", PHS: "B.Sc Physics",
    BCY: "B.Sc Chemistry", BCH: "B.Sc Chemistry", CHB: "B.Sc Chemistry",
    MTH: "B.Sc Mathematics", BHM: "B.Sc Mathematics",
    MSM: "B.Sc Mathematics", CMS: "B.Sc Mathematics",
    BSI: "B.Sc (Hons)",

    FPE: "B.Sc Food Technology", FST: "B.Sc Food Technology",
    BFS: "B.Sc Food Technology", BND: "B.Sc Nutrition & Dietetics",

    MBA: "B.Tech + MBA (Integrated)",
    BAL: "BA LLB",

    // Allied-health papers that were filed into the Engineering
    // collection in the source repository.
    BMT: "B.Sc Medical Lab Technology", BMH: "B.Sc Medical Lab Technology",
    BCT: "B.Sc Cardiac Technology",
    BIT: "B.Sc Radiology & Imaging", BIH: "B.Sc Radiology & Imaging",

    // Courses every programme sits, taught centrally.
    PHY: "Common / Open Elective", CHY: "Common / Open Elective",
    CHE: "Common / Open Elective", ENG: "Common / Open Elective",
    EVS: "Common / Open Elective", BEN: "Common / Open Elective",
    VAC: "Common / Open Elective", COC: "Common / Open Elective",
    HMM: "Common / Open Elective", ARP: "Common / Open Elective",
    OPE: "Common / Open Elective",
  },

  "Allied Health": {
    BPT: "BPT (Physiotherapy)",
    BOP: "B.Optometry",
    BND: "B.Sc Nutrition & Dietetics",
    BDT: "B.Sc Dialysis Technology",
    BSP: "B.Sc Pharmaceutical Sciences",
    BMT: "B.Sc Medical Lab Technology", BMH: "B.Sc Medical Lab Technology",
    DCP: "Diploma Cardiology",
    BIH: "B.Sc Radiology & Imaging", BIT: "B.Sc Radiology & Imaging",
    FSM: "B.Sc Forensic Science", FSB: "B.Sc Forensic Science",
    BPS: "B.Sc Clinical Psychology",
    BCT: "B.Sc Cardiac Technology",
    BFS: "B.Sc Food Technology",
  },

  Humanities: {
    BAE: "BA English", SHS: "BA English", MAE: "BA English",
    FEN: "BA English",
    BPO: "BA Political Science",
    BSO: "BA Sociology",
    BHI: "BA History", INDIA: "BA History",
    BPY: "BA Psychology", BPS: "BA Psychology",
    BGO: "BA Geography",
    BEC: "BA Economics", BAN: "BA Economics", DSE: "BA Economics",
    BSY: "B.Sc Yoga",
    BAL: "BA LLB",
    SEB: "B.Ed",
    BAI: "BA (Hons)", BIA: "BA (Hons)", BIS: "BA (Hons)",
    BDT: "B.Sc Dialysis Technology",
    OPE: "Common / Open Elective",
  },

  Law: { BAL: "BA LLB", BBA: "BBA LLB" },
  "Medical Sciences": { MBS: "MBBS" },
  Dental: { BDS: "BDS" },
  Nursing: {
    BSN: "B.Sc Nursing", BSNS: "B.Sc Nursing",
    PBSN: "Post Basic B.Sc Nursing",
  },
  Pharmacy: { BP: "B.Pharm", PHR: "B.Pharm", BPH: "B.Pharm" },
  Education: {
    SEB: "B.Ed",
    // The Education collection in the source repository also holds papers
    // belonging to other schools; classify them by what they actually are.
    BIA: "BA (Hons)", BSP: "B.Sc Pharmaceutical Sciences",
    BSI: "B.Sc (Hons)", OPE: "Common / Open Elective",
  },
};

/** Used when a prefix isn't in the table, so every row still gets a value. */
const SCHOOL_DEFAULT_PROGRAM: Record<string, string> = {
  Engineering: "B.Tech (Other)",
  "Allied Health": "Allied Health (Other)",
  Humanities: "BA (Hons)",
  Law: "BA LLB",
  "Medical Sciences": "MBBS",
  Dental: "BDS",
  Nursing: "B.Sc Nursing",
  Pharmacy: "B.Pharm",
  Education: "B.Ed",
};

/** Maps a full school name onto the short keys used by the tables above. */
export function schoolKey(school: string): string | null {
  const s = school.toLowerCase();
  if (s.includes("engineering")) return "Engineering";
  if (s.includes("allied health")) return "Allied Health";
  if (s.includes("humanities")) return "Humanities";
  if (s.includes("law")) return "Law";
  if (s.includes("medical sciences")) return "Medical Sciences";
  if (s.includes("dental")) return "Dental";
  if (s.includes("nursing")) return "Nursing";
  if (s.includes("pharmacy")) return "Pharmacy";
  if (s.includes("education")) return "Education";
  if (s.includes("business")) return "Business";
  if (s.includes("architecture")) return "Architecture";
  return null;
}

/** Every program value this classifier can emit — for the UI dropdowns. */
export function allPrograms(): string[] {
  const set = new Set<string>();
  for (const table of Object.values(PROGRAM_BY_SCHOOL_PREFIX)) {
    Object.values(table).forEach((p) => set.add(p));
  }
  Object.values(SCHOOL_DEFAULT_PROGRAM).forEach((p) => set.add(p));
  return [...set].sort();
}

function normalizeYear(text: string): string | null {
  const m = YEAR_RE.exec(text || "");
  if (!m) return null;
  return `${m[1]}-${m[2].slice(-2)}`;
}

function extractCode(stem: string): { code: string | null; digits: string | null } {
  // Strip the academic year before looking for a code (see CODE_RE note).
  const withoutYear = stem.replace(new RegExp(YEAR_RE, "g"), " ");
  CODE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CODE_RE.exec(withoutYear)) !== null) {
    const letters = m[1].toUpperCase();
    if (NOT_A_CODE.has(letters)) continue;
    const suffix = (m[3] || "").toUpperCase();
    return { code: `${letters} ${m[2]}${suffix}`, digits: m[2] };
  }
  return { code: null, digits: null };
}

/**
 * Schools whose course codes number by YEAR OF STUDY rather than semester.
 *
 * Measured against every filename that states a semester or term outright
 * (see verify-semester.ts), which is a large sample for each of these:
 *
 *   school        n      digit = semester    digit = year of study
 *   Engineering   1581        13%                   60%
 *   Law            233        12%                   60%
 *   Humanities     169        20%                   57%
 *   Pharmacy       179        91%                   15%
 *   Nursing         34        97%                   18%
 *
 * So Engineering, Law and Humanities number by year — CSE 353 is a third
 * year course (semester 5 or 6), not a semester-3 one — while Pharmacy and
 * Nursing put the semester in the code directly.
 *
 * Getting this wrong is not a rounding error: treating Engineering's year
 * digit as a semester compresses a four-year degree into semesters 1-4 and
 * leaves semesters 5, 7 and 8 completely empty, which is exactly what it
 * did before this was measured properly.
 */
const YEAR_NUMBERED_SCHOOLS = new Set(["Engineering", "Law", "Humanities"]);

/**
 * Course-code prefixes that number by SEMESTER even though their school
 * numbers by year. Checked before the school rule.
 *
 * "School of Engineering/ Basic Sciences/ Agriculture Science" is three
 * faculties sharing one DSpace community, and they don't share a
 * convention. Agriculture (AGL) is the clear case: its codes run 1xx-6xx
 * with an even spread, and a four-year B.Sc cannot have a sixth year of
 * study — so those are semesters. Reading them as years produced
 * "semester 11" papers.
 *
 * Every prefix with enough filenames stating a term outright was measured
 * (see the per-prefix analysis in the README); the Engineering prefixes
 * that aren't listed here scored 77-100% for year numbering.
 */
const SEMESTER_NUMBERED_PREFIXES = new Set(["AGL"]);

function extractSemester(
  stem: string,
  digits: string | null,
  school: string | null,
  prefix: string | null,
): { semester: number | null; source: ClassifiedEntry["semesterSource"] } {
  // Dental and MBBS state the year of study, not the semester.
  const yos = /\b(?:BDS|MBBS)\s*([1-5])(?:st|nd|rd|th)\b/i.exec(stem);
  if (yos) return { semester: Number(yos[1]) * 2 - 1, source: "from-year-of-study" };

  // Always prefer a semester the filename states outright.
  for (const pat of SEM_PATTERNS) {
    const m = pat.exec(stem);
    if (m) {
      const sem = Number(m[1]);
      if (sem >= 1 && sem <= 12) return { semester: sem, source: "explicit" };
    }
  }

  if (digits) {
    const digit = Number(digits[0]);

    const yearNumbered =
      school !== null &&
      YEAR_NUMBERED_SCHOOLS.has(school) &&
      !(prefix !== null && SEMESTER_NUMBERED_PREFIXES.has(prefix));

    if (yearNumbered) {
      // No undergraduate degree here runs past five years (BA LLB is the
      // longest, at five years / ten semesters). A leading 6 or above is
      // therefore not a year of study at all — it's a postgraduate code
      // (M.Tech 6xx) that was filed into the undergraduate collection.
      // Treating it as a year produced "semester 11" papers; leaving the
      // semester unset instead holds them back for review, which is the
      // honest answer for a paper that isn't undergraduate to begin with.
      if (digit > 5) return { semester: null, source: "missing" };

      // Year of study -> one of that year's two semesters. Some filenames
      // don't give a term number but do say which half of the year it was
      // ("... 2023-24 (EVEN TERM)"), which picks between the two; without
      // that marker the odd semester is the better guess.
      const evenTerm = /\bEVEN\s+TERM\b/i.test(stem);
      const sem = evenTerm ? digit * 2 : digit * 2 - 1;
      if (sem >= 1 && sem <= 12) {
        return { semester: sem, source: "from-year-of-study" };
      }
    }

    // Elsewhere the hundreds digit IS the semester (AGL 109 -> 1,
    // AGL 502 -> 5). Measured at 93% (185/198) against the filenames that
    // also state their semester outright — see verify-semester.ts.
    if (digit >= 1 && digit <= 12) {
      return { semester: digit, source: "from-code" };
    }
  }

  return { semester: null, source: "missing" };
}

function cleanName(stem: string): string {
  let out = stem.replace(new RegExp(YEAR_RE, "g"), " ");
  CODE_RE.lastIndex = 0;
  out = out.replace(CODE_RE, " ");

  // Underscores are flattened to spaces BEFORE the school-tag strip below.
  // `_` counts as a word character, so `\bSSAHS\b` does not match the very
  // common "SSAHS_ 2024-25" and the tag would survive into the course name.
  out = out.replace(/[_]+/g, " ");

  out = out.replace(
    /\b(SSAHS|SOE|SET|SBSR|SAS|SHSS|SOL|SMSR|SNSR|SOP|SDS|SBS|MBBS|BDS|B\.?Pharm|B\.?Sc\.?\s*Nursing|B\.?Tech|BBA|B\.?Com|LLB|Post Basic|Special Batch|Examination)\b/gi,
    " ",
  );
  for (const pat of SEM_PATTERNS) out = out.replace(new RegExp(pat, "gi"), " ");
  out = out
    .replace(/-+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\b\d{4,6}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,\-_\s]+|[.,\-_\s]+$/g, "");
  return out;
}

export function classify(entry: RawEntry): ClassifiedEntry {
  const stem = entry.filename.replace(/\.pdf$/i, "");
  const key = schoolKey(entry.school);
  const { code, digits } = extractCode(stem);
  const codePrefix = code ? code.split(" ")[0] : null;
  const { semester, source: semesterSource } = extractSemester(
    stem,
    digits,
    key,
    codePrefix,
  );

  // The bundle item's title IS the academic year, and is more reliable than
  // the filename — Dental omits the year from filenames entirely.
  const year = normalizeYear(entry.itemTitle) || normalizeYear(stem);
  const courseName = cleanName(stem) || null;

  const prefix = codePrefix;
  let program: string | null = null;
  let programSource: ClassifiedEntry["programSource"] = "none";

  if (key && prefix && PROGRAM_BY_SCHOOL_PREFIX[key]?.[prefix]) {
    program = PROGRAM_BY_SCHOOL_PREFIX[key][prefix];
    programSource = "prefix";
  } else if (key && SCHOOL_DEFAULT_PROGRAM[key]) {
    program = SCHOOL_DEFAULT_PROGRAM[key];
    programSource = "school-default";
  }

  const problems: string[] = [];
  if (!code) problems.push("no-course-code");
  if (!courseName || courseName.length < 3) problems.push("no-course-name");
  if (semester === null) problems.push("no-semester");
  if (!year) problems.push("no-year");
  if (!program) problems.push("no-program");

  // "high" means every field came from something stated in the data.
  // "medium" means a documented inference was used (the course-code
  // semester convention, or a school-level program default).
  const inferred =
    semesterSource === "from-code" ||
    semesterSource === "from-year-of-study" ||
    programSource === "school-default";
  const confidence: ClassifiedEntry["confidence"] =
    problems.length > 0 ? "low" : inferred ? "medium" : "high";

  return {
    ...entry,
    title: courseName || stem,
    courseCode: code,
    courseName,
    semester,
    semesterSource,
    year,
    program,
    programSource,
    problems,
    confidence,
  };
}

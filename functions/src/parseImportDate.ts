/**
 * Deterministic date resolution for Smart Import.
 *
 * The model NEVER parses dates — it returns each Date-sent cell verbatim (sentDateRaw). This pure
 * module turns one raw value into either an ISO date, or null with a typed reason. Parsing in code
 * (not in the model's head, mid-job) is what makes dates reliable run-to-run: identical formats
 * always resolve identically. The golden regression fixture is query-tracker-messy.xlsx — see
 * parseImportDate.test.ts.
 *
 * Reasons (the only date reasons the engine emits):
 *   - "missing-day"    : a month + year with no day (e.g. "March 2024") — can't pin a day.
 *   - "serial-outlier" : an Excel serial that resolved to a date well outside the file's date span
 *                        (kept as the pre-filled value, but flagged for a glance).
 *   - "no-date"        : blank, OR present but not a readable date ("last spring"). Unified: every
 *                        dateless query is surfaced once so the user consciously leaves it undated.
 */

export type DateReason = "missing-day" | "serial-outlier" | "no-date";

export interface DateResolution {
  /** ISO YYYY-MM-DD, or null when no date could be pinned. */
  date: string | null;
  /** A typed reason worth a glance, or null when the date resolved cleanly (or silently inferred). */
  reason: DateReason | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DAY_MS = 86_400_000;
/** Excel serials we treat as dates: ~2009–2036 in the 1900 system. Narrow on purpose so a stray
 *  small integer (a count, a star rating) is never mistaken for a date. */
const SERIAL_MIN = 40_000;
const SERIAL_MAX = 50_000;
/** Epoch for the 1900 date system (the historical leap-year bug means day 0 is 1899-12-30). */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
/** How far beyond the file's date span a serial may sit before we flag it (~12 months). */
const OUTLIER_MS = 365 * DAY_MS;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** A real calendar day? (rejects 31 Feb etc. — those fall back to no-date.) */
function valid(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Two-digit years map to the 2000s (24 → 2024). Four-digit years pass through. */
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/** Resolution context: today (for testability) and an optional anchor date. */
interface Ctx { now: Date; anchor: string | null; }

/**
 * Pick a year for a year-less day/month.
 *  - With an anchor (the query's sent date), a year-less date is a follow-on EVENT from a note:
 *    take the anchor's year, and roll forward one year if that would place the event strictly before
 *    the query was sent (events come after the send). This is why "20/3" on Jamal's 14 Mar 2024 query
 *    reads 2024, not the today-anchored year.
 *  - Without an anchor (a sent date itself), fall back to the most recent occurrence on or before today.
 */
function resolveYear(month: number, day: number, ctx: Ctx): number {
  if (ctx.anchor) {
    const ay = Number(ctx.anchor.slice(0, 4));
    return iso(ay, month, day) < ctx.anchor ? ay + 1 : ay; // ISO string compare == chronological
  }
  const y = ctx.now.getFullYear();
  const cand = Date.UTC(y, month - 1, day);
  const today = Date.UTC(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate());
  return cand <= today ? y : y - 1;
}

/** Resolve a written-month date ("14 March 2024", "03-May-2024", "5th Jan", "March 2024"). */
function parseWritten(s: string, ctx: Ctx): DateResolution | null {
  const tokens = s.toLowerCase().split(/[\s,./-]+/).filter(Boolean);
  let month: number | null = null, day: number | null = null, year: number | null = null;
  for (const t of tokens) {
    const m = MONTHS[t.slice(0, 3)];
    if (m && month === null) { month = m; continue; }
    if (/^\d{4}$/.test(t)) { year = Number(t); continue; }
    const dm = t.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
    if (dm && day === null) { day = Number(dm[1]); continue; }
  }
  if (month === null) return null; // no month word → not a written date; let the numeric path try.
  if (day !== null && year !== null) return valid(year, month, day) ? { date: iso(year, month, day), reason: null } : { date: null, reason: "no-date" };
  if (day !== null && year === null) { const y = resolveYear(month, day, ctx); return valid(y, month, day) ? { date: iso(y, month, day), reason: null } : { date: null, reason: "no-date" }; }
  if (day === null && year !== null) return { date: null, reason: "missing-day" }; // "March 2024"
  return { date: null, reason: "no-date" }; // a bare month word, nothing else
}

/** Resolve an all-numeric date ("2024-03-02", "18/04/2024", "15/5/24", "02/13/2024", "12.4.24"). */
function parseNumeric(s: string, ctx: Ctx): DateResolution | null {
  const parts = s.split(/[./-]/).map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d{1,4}$/.test(p))) return null;
  const nums = parts.map(Number);

  // Year-first / ISO: a leading 4-digit component → YYYY-MM-DD.
  if (parts[0].length === 4) {
    if (parts.length !== 3) return { date: null, reason: "no-date" };
    const [y, m, d] = nums;
    return valid(y, m, d) ? { date: iso(y, m, d), reason: null } : { date: null, reason: "no-date" };
  }

  let year: number | null = null, a: number, b: number;
  if (parts.length === 3) { year = fullYear(nums[2]); a = nums[0]; b = nums[1]; }
  else { a = nums[0]; b = nums[1]; } // day + month, no year

  // Order: a component ≥ 13 forces the reading; otherwise British day-first.
  let day: number, month: number;
  if (a >= 13) { day = a; month = b; }       // 18/04, 15/5 → day-first
  else if (b >= 13) { month = a; day = b; }  // 02/13/2024 → US month-first
  else { day = a; month = b; }               // 12/05, 12.4 → ambiguous → day-first (British)

  const y = year ?? resolveYear(month, day, ctx);
  return valid(y, month, day) ? { date: iso(y, month, day), reason: null } : { date: null, reason: "no-date" };
}

/** Convert an Excel serial to ISO and decide whether it's an outlier vs the file's other dates. */
function parseSerial(serial: number, otherDates: string[]): DateResolution {
  const date = new Date(EXCEL_EPOCH + serial * DAY_MS).toISOString().slice(0, 10);
  const times = otherDates.map((d) => Date.parse(d)).filter((t) => !Number.isNaN(t));
  if (times.length) {
    const t = Date.parse(date);
    const min = Math.min(...times), max = Math.max(...times);
    if (t < min - OUTLIER_MS || t > max + OUTLIER_MS) return { date, reason: "serial-outlier" };
  }
  return { date, reason: null };
}

/** Options for {@link parseImportDate}. */
export interface ParseOpts {
  /** Injectable "today" (defaults to real now) — keeps most-recent-past year inference testable. */
  now?: Date;
  /**
   * The query's resolved sent date (ISO). Pass ONLY when parsing a note-derived timeline EVENT date,
   * so a year-less event anchors to the query's year (and rolls forward if it would precede the send).
   * Omit for sent dates — they keep most-recent-past inference.
   */
  anchor?: string | null;
}

/**
 * Resolve one raw date value.
 * @param raw         the verbatim cell (string or number).
 * @param otherDates  ISO dates already resolved elsewhere in the file — only used to judge whether
 *                    an Excel serial is an outlier; ignored for every other format.
 * @param opts        { now, anchor } — see {@link ParseOpts}.
 */
export function parseImportDate(raw: string | number | null | undefined, otherDates: string[] = [], opts: ParseOpts = {}): DateResolution {
  const ctx: Ctx = { now: opts.now ?? new Date(), anchor: opts.anchor ?? null };
  if (raw === null || raw === undefined) return { date: null, reason: "no-date" };
  const s = String(raw).trim();
  if (!s) return { date: null, reason: "no-date" };

  // Bare integer in the serial band → Excel serial (44621 → 1 Mar 2022). Anything else numeric and
  // separator-free (a year, a count) is not a date.
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n >= SERIAL_MIN && n <= SERIAL_MAX) return parseSerial(n, otherDates);
    return { date: null, reason: "no-date" };
  }

  // Has a month word? → written date. Else if it looks numeric-with-separators → numeric date.
  if (/[a-z]/i.test(s)) {
    const w = parseWritten(s, ctx);
    if (w) return w;
    return { date: null, reason: "no-date" }; // letters but no month word ("last spring")
  }
  const num = parseNumeric(s, ctx);
  if (num) return num;

  return { date: null, reason: "no-date" };
}

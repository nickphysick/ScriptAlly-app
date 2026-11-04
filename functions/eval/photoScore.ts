/**
 * Smart Import from photos — the scorer (smart-import-photos-v1, phase 4).
 *
 * Scores one assembled photo read against its truth (photo-truth/<id>.json): agent names, agencies,
 * statuses and sent dates per entry; precision and recall for each reason code a photo read should
 * raise (crossed-out, mark-unclear, illegible-agency, no-date); and whether each entry's `src` band
 * contains its line. Pure — the runner (photoEval.mts) makes the calls.
 *
 * Matching: a read entry is paired with the truth entry of the same agent name (normalised), else
 * the closest within two edits, each truth entry used once. A truth entry with no pair scores wrong
 * on every field; a read entry with no pair is counted as spurious.
 */
import { parseImportDate } from "../src/parseImportDate";

export interface TruthEntry {
  name: string; agency: string; date: string; said: string; expect: string; accept?: string[];
  mark?: string; crossed?: boolean; illegibleAgency?: { legible: number };
  page: number;
  /** The line's band on its page. Optional in a real-photo truth file: without it, src isn't scored. */
  band?: [number, number];
  line: string;
}
export interface PhotoTruth { id: string; style: string; font: string; pages: number; entries: TruthEntry[] }

export const PHOTO_CODES = ["crossed-out", "mark-unclear", "illegible-agency", "no-date"] as const;
export type PhotoCode = (typeof PHOTO_CODES)[number];

export const normName = (s: unknown) => String(s ?? "").normalize("NFC").toLowerCase().replace(/[.’'`]/g, "").replace(/\s+/g, " ").trim();
const normAgency = (s: unknown) => normName(s).replace(/\s*&\s*/g, " & ").replace(/\.\.+$/, "").trim();

function edits(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** The codes a correct read raises for this entry. */
export function expectedCodes(e: TruthEntry): Set<PhotoCode> {
  const s = new Set<PhotoCode>();
  if (e.crossed) s.add("crossed-out");
  if (e.mark && e.mark !== "✓") s.add("mark-unclear");
  if (e.illegibleAgency) s.add("illegible-agency");
  if (!e.date) s.add("no-date");
  return s;
}

/** The truth's sent dates, parsed the way the app parses the read's (UK day-first, the year from
 *  the file's other dates where it is missing). */
export function truthDates(t: PhotoTruth): (string | null)[] {
  const file: string[] = [];
  for (const e of t.entries) { const r = e.date ? parseImportDate(e.date).date : null; if (r) file.push(r); }
  return t.entries.map((e) => (e.date ? parseImportDate(e.date, file).date : null));
}

export interface ReadEntry { name: string; agency: string; status: string; sentDate: string | null; reasons: string[]; src: { p: number; y: [number, number] } | null }
export function readEntries(result: any): ReadEntry[] {
  const agents = new Map<string, any>((result?.agents ?? []).map((a: any) => [a.ref, a]));
  return (result?.queries ?? []).map((q: any) => {
    const a = agents.get(q.agentRef) ?? {};
    return { name: a.name ?? "", agency: a.agency ?? "", status: q.status ?? "", sentDate: q.sentDate ?? null, reasons: q.reasons ?? [], src: q.src ?? null };
  });
}

export interface PhotoScore {
  id: string;
  entries: number;
  matched: number;
  spurious: number;
  correct: { name: number; agency: number; status: number; date: number };
  codes: Record<PhotoCode, { tp: number; fp: number; fn: number }>;
  src: { hit: number; of: number };
  /** One line per wrong field, for the report. */
  wrong: string[];
}

/** Did the read's band contain the entry's line: right page, the line's centre inside the band,
 *  and a band no taller than a quarter of the page. */
export function srcHit(read: ReadEntry["src"], t: TruthEntry): boolean {
  if (!read || !t.band) return false;
  const centre = (t.band[0] + t.band[1]) / 2;
  return read.p === t.page && read.y[0] <= centre && centre <= read.y[1] && read.y[1] - read.y[0] <= 0.25;
}

export function scorePhotoRead(truth: PhotoTruth, result: any): PhotoScore {
  const reads = readEntries(result);
  const dates = truthDates(truth);
  const used = new Set<number>();
  const pairOf: (number | null)[] = truth.entries.map(() => null);
  // exact names first, then the nearest within two edits
  for (const pass of [0, 2]) {
    truth.entries.forEach((t, ti) => {
      if (pairOf[ti] !== null) return;
      let best = -1, bestD = pass + 1;
      reads.forEach((r, ri) => {
        if (used.has(ri)) return;
        const d = pass === 0 ? (normName(r.name) === normName(t.name) ? 0 : 99) : edits(normName(r.name), normName(t.name));
        if (d < bestD) { best = ri; bestD = d; }
      });
      if (best >= 0) { pairOf[ti] = best; used.add(best); }
    });
  }
  const s: PhotoScore = {
    id: truth.id, entries: truth.entries.length, matched: used.size, spurious: reads.length - used.size,
    correct: { name: 0, agency: 0, status: 0, date: 0 },
    codes: Object.fromEntries(PHOTO_CODES.map((c) => [c, { tp: 0, fp: 0, fn: 0 }])) as PhotoScore["codes"],
    src: { hit: 0, of: truth.entries.length }, wrong: [],
  };
  truth.entries.forEach((t, ti) => {
    const ri = pairOf[ti];
    const r = ri === null ? null : reads[ri];
    const label = `${truth.id} #${ti + 1} ${t.name}`;
    if (!r) { s.wrong.push(`${label}: not read`); for (const c of expectedCodes(t)) s.codes[c].fn++; if (!t.band) s.src.of--; return; }
    if (normName(r.name) === normName(t.name)) s.correct.name++; else s.wrong.push(`${label}: name "${r.name}"`);
    const ra = normAgency(r.agency), ta = normAgency(t.agency);
    const agencyOk = t.illegibleAgency
      ? ra === ta || ra === "" || (ta.startsWith(ra) && ra.length >= Math.min(2, t.illegibleAgency.legible))
      : ra === ta;
    if (agencyOk) s.correct.agency++; else s.wrong.push(`${label}: agency "${r.agency}" (truth "${t.agency}")`);
    if ([t.expect, ...(t.accept ?? [])].includes(r.status)) s.correct.status++; else s.wrong.push(`${label}: status "${r.status}" (truth "${t.expect}")`);
    if ((r.sentDate ?? null) === dates[ti]) s.correct.date++; else s.wrong.push(`${label}: date ${r.sentDate} (truth ${dates[ti]} from "${t.date}")`);
    const want = expectedCodes(t), got = new Set(r.reasons.filter((c): c is PhotoCode => (PHOTO_CODES as readonly string[]).includes(c)));
    for (const c of PHOTO_CODES) {
      if (want.has(c) && got.has(c)) s.codes[c].tp++;
      else if (want.has(c)) { s.codes[c].fn++; s.wrong.push(`${label}: missed ${c}`); }
      else if (got.has(c)) { s.codes[c].fp++; s.wrong.push(`${label}: spurious ${c}`); }
    }
    if (!t.band) s.src.of--;
    else if (srcHit(r.src, t)) s.src.hit++;
    else s.wrong.push(`${label}: src ${JSON.stringify(r.src)} (line ${t.page}:${t.band.map((x) => x.toFixed(3)).join("–")})`);
  });
  return s;
}

/** What a perfect model would answer for this truth — the dry run's stub. */
export function perfectReply(truth: PhotoTruth): string {
  const agents = truth.entries.map((e, i) => ({ ref: `a${i + 1}`, name: e.name, agency: e.illegibleAgency ? e.agency.slice(0, e.illegibleAgency.legible) : e.agency }));
  const queries = truth.entries.map((e, i) => {
    const codes = [...expectedCodes(e)].filter((c) => c !== "no-date");
    return {
      agentRef: `a${i + 1}`, status: e.expect, ...(e.date ? { sentDateRaw: e.date } : {}),
      ...(codes.length ? { reasons: codes } : {}),
      ...(e.band ? { src: { p: e.page, y: [Math.max(0, e.band[0] - 0.005), Math.min(1, e.band[1] + 0.005)] } } : {}),
      lineRaw: e.line, ...(e.mark && e.mark !== "✓" ? { markRaw: e.mark } : {}),
    };
  });
  return JSON.stringify({ agents, queries });
}

/**
 * Smart Import evaluation — the fixture generator.
 *
 *   npx tsx functions/eval/generate.ts          (from the repo root; writes tests/fixtures/smart-eval/)
 *
 * Seeded and deterministic: the same seed gives byte-identical files (no Date.now, no Math.random,
 * and every .xlsx is re-zipped with a fixed timestamp).
 *
 * THE ORDER IS THE POINT. Each fixture first builds a TRUTH — an invented cast of agents and
 * agencies, each query with a true status and a true dated history — then RENDERS that truth into a
 * messy file, and writes the expected answer FROM THE TRUTH, never from the rendered file. Where a
 * rendering throws information away (a month with no day, a blank cell), the expected answer says
 * what a correct import can still know, and the rule for it lives with the renderer that lost it.
 *
 * Fixtures the CURRENT pipeline is expected to fail are kept in the set, marked `expectedToFail`
 * with the reason, so the baseline measures the gap rather than hiding it.
 */
import * as XLSX from "xlsx";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_DIR, repoRoot, type ExpectedEvent, type ExpectedFile, type ExpectedQuery, type Manifest, type ManifestEntry } from "./types";

// ── seeded randomness ──────────────────────────────────────────────────────────────────────────
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
  const chance = (p: number) => next() < p;
  const shuffle = <T>(xs: readonly T[]): T[] => {
    const out = xs.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  return { next, int, pick, chance, shuffle };
}
type Rng = ReturnType<typeof rng>;

// ── dates (all arithmetic in UTC days, never local time) ───────────────────────────────────────
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const isoToParts = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const addDays = (iso: string, n: number) => {
  const [y, m, d] = isoToParts(iso);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};
const dayIndex = (iso: string) => { const [y, m, d] = isoToParts(iso); return Date.UTC(y, m - 1, d) / 86_400_000; };
export const serialOf = (iso: string) => dayIndex(iso) - Date.UTC(1899, 11, 30) / 86_400_000;
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

// ── the truth ──────────────────────────────────────────────────────────────────────────────────
export const STATUS = {
  Q: "Queried", PR: "Partial Requested", PS: "Partial Sent", FR: "Full Requested", FS: "Full Sent",
  RR: "Revise & Resubmit", OF: "Offer", RJ: "Rejected", WD: "Withdrawn", NR: "No Response",
} as const;
type Status = (typeof STATUS)[keyof typeof STATUS];

interface Stage { status: Status; date: string }
interface TruthAgent { name: string; agency: string; website: string }
interface TruthQuery {
  n: number;
  agent: TruthAgent;
  /** stages[0] is always Queried on the sent date; the last stage is the current status. */
  stages: Stage[];
}

const FIRST = ["Clara", "Jamal", "Marianne", "Tomas", "Gregory", "Owen", "Priya", "Hannah", "Felix", "Imogen", "Rory", "Saoirse", "Dev", "Nadia", "Theo", "Esme", "Callum", "Ines", "Bea", "Malik", "Rosalind", "Hugo", "Freya", "Ezra", "Tamsin", "Kwame", "Lena", "Orla", "Seb", "Yusuf"];
const LAST = ["Voss", "Carter", "Webb", "Vidal", "Salt", "Hale", "Raman", "Okafor", "Lindqvist", "Marsh", "Fennimore", "Achebe", "Doyle", "Kaur", "Brennan", "Whitlock", "Sato", "Moreau", "Quigley", "Ashdown", "Penrose", "Nkemelu", "Harrow", "Castellane", "Rook", "Tremayne", "Ibbotson", "Faraday", "Llewellyn", "Ostrander"];
const AG_A = ["Pemberton", "Wren", "Kite", "Larkspur", "Hollis", "Marlow", "Greenhouse", "Quill", "Penfallow", "Blackthorn", "Ashgrove", "Bellwether", "Copperfield", "Dunmore", "Everly", "Fairweather", "Gilchrist", "Harwood", "Inkwell", "Juniper"];
const AG_B = ["Literary", "Literary Agency", "& Co", "Associates", "Agency", "Partners", "Management"];

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

/** A pipeline path: later stages each 7–45 days after the one before. */
function history(r: Rng, sent: string, pool?: readonly Status[]): Stage[] {
  const stages: Stage[] = [{ status: STATUS.Q, date: sent }];
  let d = sent;
  const step = (s: Status) => { d = addDays(d, r.int(7, 45)); stages.push({ status: s, date: d }); };
  const roll = r.next();
  if (roll < 0.33) { /* still Queried */ }
  else if (roll < 0.53) step(STATUS.RJ);
  else if (roll < 0.65) step(STATUS.NR);
  else if (roll < 0.73) { step(STATUS.PR); if (r.chance(0.5)) { step(STATUS.PS); if (r.chance(0.5)) step(STATUS.RJ); } }
  else if (roll < 0.96) {
    step(STATUS.FR);
    if (r.chance(0.6)) {
      step(STATUS.FS);
      const o = r.next();
      if (o < 0.15) step(STATUS.OF); else if (o < 0.45) step(STATUS.RJ); else if (o < 0.6) step(STATUS.RR);
    }
  } else step(STATUS.WD);
  if (pool && !pool.includes(stages[stages.length - 1].status)) return [{ status: STATUS.Q, date: sent }];
  return stages;
}

function cast(r: Rng, n: number, pool?: readonly Status[]): TruthQuery[] {
  const names = r.shuffle(FIRST.flatMap((f) => LAST.map((l) => `${f} ${l}`))).slice(0, n);
  const agencyCount = Math.max(2, Math.ceil(n / 3));
  const agencies = r.shuffle(AG_A.flatMap((a) => AG_B.map((b) => `${a} ${b}`))).slice(0, agencyCount);
  const out: TruthQuery[] = [];
  for (let i = 0; i < n; i++) {
    const agency = r.pick(agencies);
    // Sent dates 2023-01-02 … 2025-09-30, so every history ends before today and no year is ever inferred.
    const sent = addDays("2023-01-02", r.int(0, 1000));
    out.push({ n: i + 1, agent: { name: names[i], agency, website: `https://www.${slug(agency)}.co.uk` }, stages: history(r, sent, pool) });
  }
  return out;
}

const current = (q: TruthQuery) => q.stages[q.stages.length - 1];
const sentOf = (q: TruthQuery) => q.stages[0].date;

// ── cells and sheets ───────────────────────────────────────────────────────────────────────────
/** A cell: text as typed, a real Excel date cell (xlsx), or a bare number (xlsx). */
type Cell = string | { date: string } | { num: number };
interface SheetSpec {
  name: string;
  rows: Cell[][];
  merges?: { r0: number; c: number; r1: number }[];
  links?: { r: number; c: number; url: string }[];
  fills?: { r: number; c: number; rgb: string }[];
}

// ── rendering the standard one-row-per-query layout ───────────────────────────────────────────
type DateStyle = "iso" | "dmy" | "dmyShort" | "written" | "writtenShort" | "ordinal" | "dotted" | "monthOnly" | "serialText" | "us" | "blank" | "xlDate" | "xlSerial";
const FULL_STYLES: DateStyle[] = ["iso", "dmy", "dmyShort", "written", "writtenShort", "ordinal", "dotted"];

/** Render a date. `keeps` is what survives: the whole date, or nothing a correct import can pin. */
function renderDate(iso: string, style: DateStyle): { cell: Cell; keeps: "date" | "missing-day" | "no-date" } {
  const [y, m, d] = isoToParts(iso);
  switch (style) {
    case "iso": return { cell: iso, keeps: "date" };
    case "dmy": return { cell: `${pad(d)}/${pad(m)}/${y}`, keeps: "date" };
    case "dmyShort": return { cell: `${d}/${m}/${String(y).slice(2)}`, keeps: "date" };
    case "written": return { cell: `${d} ${MONTH_NAMES[m - 1]} ${y}`, keeps: "date" };
    case "writtenShort": return { cell: `${pad(d)}-${MONTH_NAMES[m - 1].slice(0, 3)}-${y}`, keeps: "date" };
    case "ordinal": return { cell: `${ordinal(d)} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`, keeps: "date" };
    case "dotted": return { cell: `${pad(d)}.${pad(m)}.${y}`, keeps: "date" };
    case "monthOnly": return { cell: `${MONTH_NAMES[m - 1]} ${y}`, keeps: "missing-day" };
    case "serialText": return { cell: String(serialOf(iso)), keeps: "date" };
    case "us": return { cell: `${pad(m)}/${pad(d)}/${y}`, keeps: "date" };
    case "blank": return { cell: "", keeps: "no-date" };
    case "xlDate": return { cell: { date: iso }, keeps: "date" };
    case "xlSerial": return { cell: { num: serialOf(iso) }, keeps: "date" };
  }
}

const PLAIN_STATUS: Record<Status, string> = {
  [STATUS.Q]: "Queried", [STATUS.PR]: "Partial requested", [STATUS.PS]: "Partial sent", [STATUS.FR]: "Full requested",
  [STATUS.FS]: "Full sent", [STATUS.RR]: "R&R", [STATUS.OF]: "Offer", [STATUS.RJ]: "Rejected", [STATUS.WD]: "Withdrawn", [STATUS.NR]: "No response",
};
const SLANG: Record<Status, string[]> = {
  [STATUS.Q]: ["sent", "QUERY SENT", "out", "nudged", "still waiting", "chased"],
  [STATUS.PR]: ["partial req", "requested partial"],
  [STATUS.PS]: ["sent partial", "partial out"],
  [STATUS.FR]: ["full req", "requested full", "FULL REQ!"],
  [STATUS.FS]: ["full out", "sent full"],
  [STATUS.RR]: ["R&R!!", "revise & resubmit"],
  [STATUS.OF]: ["Offer!!", "OFFER"],
  [STATUS.RJ]: ["pass", "declined", "form rejection"],
  [STATUS.WD]: ["withdrew"],
  [STATUS.NR]: ["CNR", "ghosted", "no response", "timed out"],
};
const EMOJI: Partial<Record<Status, string>> = { [STATUS.Q]: "📨 ", [STATUS.OF]: "🎉 ", [STATUS.RJ]: "❌ ", [STATUS.NR]: "👻 ", [STATUS.FR]: "🙌 " };
const PLAIN_NOTES = ["personalised", "loved the list", "met at the York festival", "wrong ms?? think i sent the old one", "comps: The Salt Path", "referred by Dana", "QM form"];
const EMOJI_NOTES = ["fingers crossed 🤞", "✨ dream agent ✨", "😬"];

/** The note that states a dated event, and the event a correct import lifts from it. */
function eventNote(r: Rng, q: TruthQuery): { note: string; event: ExpectedEvent } | null {
  const later = q.stages.slice(1).filter((s) => s.status === STATUS.FR || s.status === STATUS.PR || s.status === STATUS.PS || s.status === STATUS.OF);
  if (!later.length) return null;
  const s = later[later.length - 1];
  const [, m, d] = isoToParts(s.date);
  const when = r.chance(0.5) ? `${d}/${m}` : `${d} ${MONTH_NAMES[m - 1]}`;
  const words: Partial<Record<Status, string>> = { [STATUS.FR]: "requested full ms", [STATUS.PR]: "asked for a partial", [STATUS.PS]: "sent partial", [STATUS.OF]: "offer call" };
  return { note: `${words[s.status]} ${when}`, event: { type: s.status, date: s.date } };
}

const COLUMN_NAMES = {
  standard: { agent: "Agent", agency: "Agency", sent: "Date sent", status: "Status", notes: "Notes" },
  unusual: [
    { agent: "Who", agency: "Agency / house", sent: "Out", status: "Where it's at", notes: "Comments" },
    { agent: "Contact", agency: "Company", sent: "Date queried", status: "Result", notes: "Misc" },
    { agent: "Lit agent", agency: "Agency", sent: "Sent on", status: "Response", notes: "Notes" },
  ],
};

interface RenderedRow { cells: Record<"agent" | "agency" | "sent" | "status" | "notes", Cell>; expected: ExpectedQuery }

/** Render one query as a standard row, and derive what a correct import reads from it. */
function standardRow(r: Rng, q: TruthQuery, knobs: Set<string>, format: "csv" | "xlsx", ambiguousFullUsed: { v: boolean }): RenderedRow {
  const cur = current(q);
  const reasons = new Set<string>();
  let statusAccept: string[] | undefined;

  // Agent and agency cells.
  let agentCell = q.agent.name, agencyCell = q.agent.agency;
  let agentName = q.agent.name, agency = q.agent.agency;
  let notes = "";
  if (knobs.has("agentNotes") && r.chance(0.22)) {
    if (r.chance(0.5)) {
      // An agency with an annotation and no agent: the real part is the agency.
      agentCell = ""; agentName = "";
      agencyCell = `${q.agent.agency} - ${r.pick(["submitted, agent TBC", "agent TBC", "via website, no name"])}`;
      reasons.add("check-name");
    } else {
      // A submission method in the agent column: no agent, no agency.
      agentCell = r.pick(["submitted via QueryManager", "via the website", "QM - TBC"]);
      agencyCell = ""; agentName = ""; agency = "";
      reasons.add("needs-identifying");
    }
  }
  if (knobs.has("whitespace")) {
    const mangle = (s: string) => (!s ? s : r.pick([s.toLowerCase(), s.toUpperCase(), `  ${s} `, s.replace(" ", "  "), `${s}   `]));
    agentCell = mangle(agentCell); agencyCell = mangle(agencyCell);
  }

  // Status cell.
  let statusCell = PLAIN_STATUS[cur.status];
  if (knobs.has("slang") && r.chance(0.85)) statusCell = r.pick(SLANG[cur.status]);
  if (knobs.has("slang") && !ambiguousFullUsed.v && (cur.status === STATUS.FR || cur.status === STATUS.FS)) {
    // One bare direction per sheet — "FULL" cannot say requested or sent; the import must ask.
    ambiguousFullUsed.v = true;
    statusCell = "FULL";
    statusAccept = [STATUS.FR, STATUS.FS];
    reasons.add("status-direction");
  }
  if (knobs.has("emoji") && EMOJI[cur.status] && r.chance(0.6)) statusCell = EMOJI[cur.status] + statusCell;
  if (knobs.has("whitespace") && r.chance(0.5)) statusCell = r.pick([statusCell.toUpperCase(), statusCell.toLowerCase(), ` ${statusCell}  `]);

  // Date-sent cell.
  let style: DateStyle = format === "xlsx" ? "xlDate" : "dmy";
  if (knobs.has("dateStyles")) {
    const pool: DateStyle[] = [...FULL_STYLES, "monthOnly", "serialText", ...(format === "xlsx" ? (["xlDate", "xlSerial"] as DateStyle[]) : [])];
    style = r.chance(0.06) ? "blank" : r.pick(pool);
  }
  if (knobs.has("serials")) style = format === "xlsx" ? (r.chance(0.8) ? "xlSerial" : "serialText") : "serialText";
  if (knobs.has("usDates")) style = "us";
  const rendered = renderDate(sentOf(q), style);
  const sentDate = rendered.keeps === "date" ? sentOf(q) : null;
  if (rendered.keeps !== "date") reasons.add(rendered.keeps);

  // Notes — an event note only where the sent date survives, so a year-less event has its anchor.
  const timeline: ExpectedEvent[] = [];
  // Never on the bare-"FULL" row: an event note would resolve the direction it must ask about.
  if (knobs.has("notesDates") && sentDate && !statusAccept && r.chance(0.7)) {
    const ev = eventNote(r, q);
    if (ev) { notes = ev.note; timeline.push(ev.event); reasons.add("two-dates"); }
  }
  if (!notes && r.chance(0.25)) notes = r.pick(PLAIN_NOTES);
  if (knobs.has("emoji") && r.chance(0.2)) notes = (notes ? notes + " " : "") + r.pick(EMOJI_NOTES);

  return {
    cells: { agent: agentCell, agency: agencyCell, sent: rendered.cell, status: statusCell, notes },
    expected: {
      label: `q${q.n} ${agentName || "(no name)"} / ${agency || "(no agency)"}`,
      agentName, agency, status: cur.status, ...(statusAccept ? { statusAccept } : {}),
      sentDate, timeline, reasons: [...reasons].sort(),
    },
  };
}

const NON_DATA = {
  preamble: [["My query tracker — The Salt Road"], ["(update every Sunday!)"], []] as Cell[][],
  placeholders: [["TBC", "", "", "", ""], ["??", "??", "", "", ""]] as Cell[][],
};

/** The standard layout: a header and one row per query, plus whatever non-data rows the knobs ask for. */
function standardSheet(r: Rng, qs: TruthQuery[], knobs: Set<string>, format: "csv" | "xlsx", name = "Queries"): { sheet: SheetSpec; expected: ExpectedQuery[] } {
  const names = knobs.has("unusualColumns") ? r.pick(COLUMN_NAMES.unusual) : COLUMN_NAMES.standard;
  type Col = keyof typeof names | "genre" | "email";
  let cols: Col[] = ["agent", "agency", "sent", "status", "notes"];
  if (knobs.has("unusualColumns")) cols = r.shuffle<Col>([...cols, "genre", "email"]);
  const header = cols.map((c) => (c === "genre" ? "Genre" : c === "email" ? "Email" : names[c]));

  const used = { v: false };
  const rendered = qs.map((q) => standardRow(r, q, knobs, format, used));
  const dataRows: Cell[][] = rendered.map((row) => cols.map((c) =>
    c === "genre" ? r.pick(["litfic", "upmarket", "crime", "sci-fi", ""]) :
    c === "email" ? (r.chance(0.3) ? `queries@${slug(row.expected.agency || "agency")}.co.uk` : "") :
    row.cells[c]));

  const rows: Cell[][] = [];
  if (knobs.has("preamble")) rows.push(...NON_DATA.preamble);
  rows.push(header);
  dataRows.forEach((dr, i) => {
    rows.push(dr);
    if (knobs.has("blankRows") && r.chance(0.15)) rows.push([]);
    if (knobs.has("dupHeader") && i === Math.floor(dataRows.length / 2)) rows.push(header);
    if (knobs.has("placeholders") && i === Math.floor(dataRows.length / 3)) rows.push(...NON_DATA.placeholders);
  });
  if (knobs.has("totals")) {
    rows.push([]);
    rows.push([`Total queries sent: ${qs.length}`]);
    rows.push(["", "", "", `Requests: ${qs.filter((q) => q.stages.some((s) => s.status === STATUS.FR || s.status === STATUS.PR)).length}`]);
  }
  return { sheet: { name, rows }, expected: rendered.map((x) => x.expected) };
}

// ── the layouts the current pipeline is expected to fail ──────────────────────────────────────
const EVENT_WORD: Record<Status, string> = {
  [STATUS.Q]: "queried", [STATUS.PR]: "partial requested", [STATUS.PS]: "sent partial", [STATUS.FR]: "full requested",
  [STATUS.FS]: "sent full", [STATUS.RR]: "R&R", [STATUS.OF]: "offer!", [STATUS.RJ]: "rejection", [STATUS.WD]: "withdrew", [STATUS.NR]: "closed - no response",
};

/** The expected answer when the file states every stage with its date. */
function fullHistoryExpected(q: TruthQuery): ExpectedQuery {
  const timeline = q.stages.slice(1).map((s) => ({ type: s.status, date: s.date }));
  return {
    label: `q${q.n} ${q.agent.name} / ${q.agent.agency}`,
    agentName: q.agent.name, agency: q.agent.agency, status: current(q).status,
    sentDate: sentOf(q), timeline, reasons: timeline.length ? ["two-dates"] : [],
  };
}

function eventsSheet(qs: TruthQuery[], format: "csv" | "xlsx"): SheetSpec {
  const events = qs.flatMap((q) => q.stages.map((s) => ({ q, s })));
  events.sort((a, b) => (a.s.date < b.s.date ? -1 : a.s.date > b.s.date ? 1 : a.q.n - b.q.n));
  return {
    name: "Log",
    rows: [["Date", "Agent", "Agency", "What happened"],
      ...events.map(({ q, s }) => [format === "xlsx" ? { date: s.date } : renderDate(s.date, "dmy").cell, q.agent.name, q.agent.agency, EVENT_WORD[s.status]])],
  };
}

function wideSheet(qs: TruthQuery[], format: "csv" | "xlsx"): SheetSpec {
  const STAGE_COLS: Status[] = [STATUS.Q, STATUS.PR, STATUS.PS, STATUS.FR, STATUS.FS];
  const d = (iso: string | undefined): Cell => (!iso ? "" : format === "xlsx" ? { date: iso } : renderDate(iso, "dmy").cell);
  return {
    name: "Tracker",
    rows: [["Agent", "Agency", "Queried", "Partial req", "Partial sent", "Full req", "Full sent", "Outcome", "Outcome date"],
      ...qs.map((q) => {
        const at = (s: Status) => q.stages.find((x) => x.status === s)?.date;
        const end = current(q);
        const terminal = !STAGE_COLS.includes(end.status);
        return [q.agent.name, q.agent.agency, ...STAGE_COLS.map((s) => d(at(s))),
          terminal ? PLAIN_STATUS[end.status] : "", terminal ? d(end.date) : ""];
      })],
  };
}

// ── writers ────────────────────────────────────────────────────────────────────────────────────
const csvText = (rows: Cell[][]) =>
  rows.map((r) => r.map((v) => {
    const s = typeof v === "string" ? v : "date" in v ? v.date : String(v.num);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n") + "\n";

const FIXED_TIME = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));

function xlsxBytes(sheets: SheetSpec[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  wb.Props = { CreatedDate: FIXED_TIME, ModifiedDate: FIXED_TIME } as any;
  for (const spec of sheets) {
    const width = Math.max(1, ...spec.rows.map((r) => r.length));
    const aoa = spec.rows.map((r) => Array.from({ length: width }, (_, i) => {
      const v = r[i];
      return v === undefined ? "" : typeof v === "string" ? v : "date" in v ? "" : "";
    }));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    spec.rows.forEach((r, ri) => r.forEach((v, ci) => {
      if (typeof v === "string") return;
      const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
      ws[addr] = "date" in v ? { t: "n", v: serialOf(v.date), z: "dd/mm/yyyy" } : { t: "n", v: v.num };
    }));
    for (const l of spec.links ?? []) {
      const cell = ws[XLSX.utils.encode_cell({ r: l.r, c: l.c })];
      if (cell) (cell as any).l = { Target: l.url };
    }
    if (spec.merges?.length) ws["!merges"] = spec.merges.map((m) => ({ s: { r: m.r0, c: m.c }, e: { r: m.r1, c: m.c } }));
    XLSX.utils.book_append_sheet(wb, ws, spec.name);
  }
  const files = unzipSync(new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: false })));

  // SheetJS community edition does not WRITE fills, so colour is patched into the package directly.
  const fills = sheets.flatMap((s, si) => (s.fills ?? []).map((f) => ({ ...f, si })));
  if (fills.length) {
    const colours = [...new Set(fills.map((f) => f.rgb))];
    let styles = strFromU8(files["xl/styles.xml"]);
    let fillBase = 0, xfBase = 0;
    styles = styles.replace(/<fills count="(\d+)">([\s\S]*?)<\/fills>/, (_m, n, inner) => {
      fillBase = Number(n);
      return `<fills count="${fillBase + colours.length}">${inner}${colours.map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join("")}</fills>`;
    });
    styles = styles.replace(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/, (_m, n, inner) => {
      xfBase = Number(n);
      return `<cellXfs count="${xfBase + colours.length}">${inner}${colours.map((_, i) => `<xf numFmtId="0" fontId="0" fillId="${fillBase + i}" borderId="0" xfId="0" applyFill="1"/>`).join("")}</cellXfs>`;
    });
    files["xl/styles.xml"] = strToU8(styles);
    for (const f of fills) {
      const path = `xl/worksheets/sheet${f.si + 1}.xml`;
      const addr = XLSX.utils.encode_cell({ r: f.r, c: f.c });
      const xml = strFromU8(files[path]);
      const next = xml.replace(new RegExp(`<c r="${addr}"(?![^>]*\\ss=)`), `<c r="${addr}" s="${xfBase + colours.indexOf(f.rgb)}"`);
      if (next === xml) throw new Error(`fill: no cell ${addr} on sheet ${f.si + 1}`);
      files[path] = strToU8(next);
    }
  }
  // Re-zip with a fixed timestamp so the same seed gives byte-identical files.
  const ordered: Record<string, Uint8Array> = {};
  for (const k of Object.keys(files).sort()) ordered[k] = files[k];
  return zipSync(ordered, { level: 6, mtime: FIXED_TIME });
}

// ── the fixture set ────────────────────────────────────────────────────────────────────────────
interface Spec {
  id: string;
  format: "csv" | "xlsx";
  rows: number;
  layout: "standard" | "events" | "wide" | "tabsCover" | "tabsSplit" | "tabsRejections" | "merged" | "links" | "colour";
  knobs: string[];
  failReason?: string;
  /** Pins the split. Without it the split is positional (every third fixture is held out), which is
   *  why new fixtures are APPENDED and pinned rather than inserted: an insertion would move every
   *  later fixture between dev and holdout and invalidate every report measured before it. */
  split?: "dev" | "holdout";
}

const KITCHEN = ["preamble", "dupHeader", "totals", "blankRows", "placeholders", "agentNotes", "slang", "dateStyles", "notesDates", "whitespace", "emoji"];

export const SPECS: Spec[] = [
  { id: "clean-csv-10", format: "csv", rows: 10, layout: "standard", knobs: [] },
  { id: "clean-xlsx-10", format: "xlsx", rows: 10, layout: "standard", knobs: [] },
  { id: "clean-csv-50", format: "csv", rows: 50, layout: "standard", knobs: [] },
  { id: "preamble-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["preamble"] },
  { id: "preamble-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["preamble"] },
  { id: "dupheader-csv-50", format: "csv", rows: 50, layout: "standard", knobs: ["dupHeader"] },
  { id: "dupheader-xlsx-10", format: "xlsx", rows: 10, layout: "standard", knobs: ["dupHeader"] },
  { id: "totals-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["totals"] },
  { id: "blank-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["blankRows"] },
  { id: "placeholders-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["placeholders"] },
  { id: "agentnotes-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["agentNotes"] },
  { id: "agentnotes-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["agentNotes"] },
  { id: "agentnotes-csv-50", format: "csv", rows: 50, layout: "standard", knobs: ["agentNotes"] },
  { id: "slang-csv-50", format: "csv", rows: 50, layout: "standard", knobs: ["slang"] },
  { id: "slang-xlsx-10", format: "xlsx", rows: 10, layout: "standard", knobs: ["slang"] },
  { id: "slang-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["slang"] },
  { id: "datestyles-csv-50", format: "csv", rows: 50, layout: "standard", knobs: ["dateStyles"] },
  { id: "datestyles-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["dateStyles"] },
  { id: "datestyles-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["dateStyles"] },
  { id: "serials-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["serials"] },
  { id: "serials-xlsx-10", format: "xlsx", rows: 10, layout: "standard", knobs: ["serials"] },
  { id: "usdates-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["usDates"], failReason: "the date parser reads an ambiguous dd/mm the British way and infers no file-level order, so a US writer's 04/05 is read as 4 May" },
  { id: "notesdates-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["notesDates"] },
  { id: "notesdates-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["notesDates"] },
  { id: "notesdates-csv-50", format: "csv", rows: 50, layout: "standard", knobs: ["notesDates"] },
  { id: "whitespace-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["whitespace"] },
  { id: "unusualcols-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["unusualColumns"] },
  { id: "unusualcols-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: ["unusualColumns"] },
  { id: "emoji-csv-10", format: "csv", rows: 10, layout: "standard", knobs: ["emoji"] },
  { id: "kitchen-csv-50", format: "csv", rows: 50, layout: "standard", knobs: KITCHEN },
  { id: "kitchen-xlsx-50", format: "xlsx", rows: 50, layout: "standard", knobs: [...KITCHEN, "unusualColumns"] },
  { id: "kitchen-csv-150", format: "csv", rows: 150, layout: "standard", knobs: KITCHEN },
  { id: "kitchen-xlsx-150", format: "xlsx", rows: 150, layout: "standard", knobs: KITCHEN },
  { id: "size-csv-150", format: "csv", rows: 150, layout: "standard", knobs: [] },
  // Expected to fail until the quick-fixes pack raised the output ceiling 12k -> 32k (measured: 300
  // clean rows complete in 181 s at 15,034 tokens). size-xlsx-300 is holdout and unmeasured since.
  { id: "size-csv-300", format: "csv", rows: 300, layout: "standard", knobs: [] },
  { id: "size-xlsx-300", format: "xlsx", rows: 300, layout: "standard", knobs: ["dateStyles", "slang"] },
  { id: "events-csv-10", format: "csv", rows: 10, layout: "events", knobs: [], failReason: "one row per EVENT: the prompt maps every row to its own query, so one query becomes several" },
  { id: "events-xlsx-10", format: "xlsx", rows: 10, layout: "events", knobs: [], failReason: "one row per EVENT: the prompt maps every row to its own query, so one query becomes several" },
  { id: "events-csv-50", format: "csv", rows: 50, layout: "events", knobs: [], failReason: "one row per EVENT: the prompt maps every row to its own query, so one query becomes several" },
  { id: "wide-csv-10", format: "csv", rows: 10, layout: "wide", knobs: [], failReason: "a column per stage date: the contract takes the sent date from one column and events only from notes" },
  { id: "wide-xlsx-50", format: "xlsx", rows: 50, layout: "wide", knobs: [], failReason: "a column per stage date: the contract takes the sent date from one column and events only from notes" },
  { id: "tabscover-xlsx-10", format: "xlsx", rows: 10, layout: "tabsCover", knobs: ["tabs"], failReason: "the data is on tab 2 and the conversion reads only the first sheet" },
  { id: "tabssplit-xlsx-50", format: "xlsx", rows: 50, layout: "tabsSplit", knobs: ["tabs"], failReason: "closed queries live on an Archive tab the conversion never reads" },
  { id: "tabsrej-xlsx-10", format: "xlsx", rows: 10, layout: "tabsRejections", knobs: ["tabs"], failReason: "rejections live on their own tab, with no status column, which the conversion never reads" },
  { id: "merged-xlsx-10", format: "xlsx", rows: 10, layout: "merged", knobs: ["merged"], failReason: "the agency is a merged range; only its top cell carries the value" },
  { id: "merged-xlsx-50", format: "xlsx", rows: 50, layout: "merged", knobs: ["merged"], failReason: "the agency is a merged range; only its top cell carries the value" },
  { id: "links-xlsx-10", format: "xlsx", rows: 10, layout: "links", knobs: ["links"], failReason: "the website is only the agent name's link target, which the conversion drops" },
  { id: "links-xlsx-50", format: "xlsx", rows: 50, layout: "links", knobs: ["links"], failReason: "the website is only the agent name's link target, which the conversion drops" },
  { id: "colour-xlsx-10", format: "xlsx", rows: 10, layout: "colour", knobs: ["colour"], failReason: "the status column is empty and a fill colour carries the status; the conversion drops colour" },
  { id: "colour-xlsx-50", format: "xlsx", rows: 50, layout: "colour", knobs: ["colour"], failReason: "the status column is empty and a fill colour carries the status; the conversion drops colour" },
  // ── Added by the quick-fixes pack (20 Oct). Appended and pinned to dev — see Spec.split. ──
  { id: "size-csv-200", format: "csv", rows: 200, layout: "standard", knobs: [], split: "dev" },
  { id: "size-csv-250", format: "csv", rows: 250, layout: "standard", knobs: [], split: "dev" },
];

const COLOUR: Partial<Record<Status, { rgb: string; label: string }>> = {
  [STATUS.FR]: { rgb: "FFFFC000", label: "Full requested" },
  [STATUS.RJ]: { rgb: "FFFF7C80", label: "Pass" },
  [STATUS.NR]: { rgb: "FFBFBFBF", label: "No reply / closed" },
  [STATUS.OF]: { rgb: "FF92D050", label: "Offer" },
};

/** Build one fixture: its truth, its file, and the expected answer from the truth. */
export function buildFixture(spec: Spec, seed: number): { bytes: Uint8Array | string; expected: ExpectedFile } {
  const r = rng(seed);
  const knobs = new Set(spec.knobs);
  const pool = spec.layout === "colour" ? ([STATUS.Q, STATUS.FR, STATUS.RJ, STATUS.NR, STATUS.OF] as const) : undefined;
  const qs = cast(r, spec.rows, pool);
  let sheets: SheetSpec[] = [];
  let expected: ExpectedQuery[] = [];

  switch (spec.layout) {
    case "standard": {
      const s = standardSheet(r, qs, knobs, spec.format);
      sheets = [s.sheet]; expected = s.expected; break;
    }
    case "events": sheets = [eventsSheet(qs, spec.format)]; expected = qs.map(fullHistoryExpected); break;
    case "wide": sheets = [wideSheet(qs, spec.format)]; expected = qs.map(fullHistoryExpected); break;
    case "tabsCover": {
      const s = standardSheet(r, qs, knobs, spec.format, "Queries");
      sheets = [{ name: "Read me", rows: [["How I use this tracker"], ["One row per agent; update after every reply."], [], ["Good luck, me!"]] }, s.sheet];
      expected = s.expected; break;
    }
    case "tabsSplit": {
      const closed = new Set<Status>([STATUS.RJ, STATUS.NR, STATUS.WD, STATUS.OF]);
      const live = qs.filter((q) => !closed.has(current(q).status)), done = qs.filter((q) => closed.has(current(q).status));
      const a = standardSheet(r, live, knobs, spec.format, "Active");
      const b = standardSheet(r, done, knobs, spec.format, "Archive");
      sheets = [a.sheet, { name: "Notes", rows: [] }, b.sheet];
      expected = [...a.expected, ...b.expected]; break;
    }
    case "tabsRejections": {
      const rej = qs.filter((q) => current(q).status === STATUS.RJ), rest = qs.filter((q) => current(q).status !== STATUS.RJ);
      const a = standardSheet(r, rest, knobs, spec.format, "Queries");
      sheets = [a.sheet, { name: "Rejections", rows: [["Agent", "Agency", "Date sent", "Notes"],
        ...rej.map((q) => [q.agent.name, q.agent.agency, { date: sentOf(q) }, r.pick(["form rejection", "nice personal note", ""])] as Cell[])] }];
      expected = [...a.expected, ...rej.map((q) => ({
        label: `q${q.n} ${q.agent.name} / ${q.agent.agency}`, agentName: q.agent.name, agency: q.agent.agency,
        status: STATUS.RJ, sentDate: sentOf(q), timeline: [], reasons: [],
      }))]; break;
    }
    case "merged": {
      const sorted = qs.slice().sort((a, b) => (a.agent.agency < b.agent.agency ? -1 : a.agent.agency > b.agent.agency ? 1 : a.n - b.n));
      const s = standardSheet(r, sorted, knobs, spec.format);
      // Header is row 0; data rows 1…n in the same order. Merge each run of one agency.
      const merges: SheetSpec["merges"] = [];
      for (let i = 0; i < sorted.length;) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1].agent.agency === sorted[i].agent.agency) j++;
        if (j > i) { merges.push({ r0: i + 1, c: 1, r1: j + 1 }); for (let k = i + 1; k <= j; k++) s.sheet.rows[k + 1][1] = ""; }
        i = j + 1;
      }
      s.sheet.merges = merges;
      sheets = [s.sheet]; expected = s.expected; break;
    }
    case "links": {
      const s = standardSheet(r, qs, knobs, spec.format);
      s.sheet.links = qs.map((q, i) => ({ r: i + 1, c: 0, url: q.agent.website }));
      expected = s.expected.map((e, i) => ({ ...e, website: qs[i].agent.website }));
      sheets = [s.sheet]; break;
    }
    case "colour": {
      const legend: Cell[][] = [["Key"], ...Object.values(COLOUR).map((c) => ["", c!.label] as Cell[]), ["", "(no colour = still waiting)"], []];
      const rows: Cell[][] = [...legend, ["Agent", "Agency", "Date sent", "Status", "Notes"]];
      const fills: SheetSpec["fills"] = Object.values(COLOUR).map((c, i) => ({ r: i + 1, c: 1, rgb: c!.rgb }));
      qs.forEach((q) => {
        const cur = current(q).status;
        const ri = rows.length;
        rows.push([q.agent.name, q.agent.agency, { date: sentOf(q) }, "", r.chance(0.2) ? r.pick(PLAIN_NOTES) : ""]);
        const c = COLOUR[cur];
        if (c) fills.push({ r: ri, c: 3, rgb: c.rgb });
      });
      sheets = [{ name: "Queries", rows, fills }];
      expected = qs.map((q) => ({
        label: `q${q.n} ${q.agent.name} / ${q.agent.agency}`, agentName: q.agent.name, agency: q.agent.agency,
        status: current(q).status, sentDate: sentOf(q), timeline: [], reasons: [],
      }));
      break;
    }
  }

  const bytes = spec.format === "csv" ? csvText(sheets[0].rows) : xlsxBytes(sheets);
  return { bytes, expected: { id: spec.id, queries: expected } };
}

/** A stable seed per fixture, from its id. */
export function seedFor(id: string): number {
  let h = 2166136261;
  for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function generateAll(root: string): Manifest {
  const dir = join(root, FIXTURE_DIR);
  mkdirSync(dir, { recursive: true });
  const entries: ManifestEntry[] = SPECS.map((spec, i) => {
    const seed = seedFor(spec.id);
    const { bytes, expected } = buildFixture(spec, seed);
    const file = join(FIXTURE_DIR, `${spec.id}.${spec.format}`);
    const exp = join(FIXTURE_DIR, `${spec.id}.expected.json`);
    writeFileSync(join(root, file), bytes);
    writeFileSync(join(root, exp), JSON.stringify(expected, null, 1) + "\n");
    return {
      id: spec.id, file, expected: exp, format: spec.format, seed, layout: spec.layout, knobs: spec.knobs,
      rows: expected.queries.length, expectedToFail: !!spec.failReason, ...(spec.failReason ? { failReason: spec.failReason } : {}),
      // Every third fixture in list order is held out — the list is grouped by knob, so this spreads it.
      split: spec.split ?? (i % 3 === 2 ? "holdout" : "dev"),
    };
  });
  const manifest: Manifest = {
    note: "Generated by functions/eval/generate.ts — do not edit by hand. Expected answers come from each fixture's truth, never from a model run.",
    generator: "functions/eval/generate.ts",
    fixtures: entries,
  };
  writeFileSync(join(root, FIXTURE_DIR, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
  return manifest;
}

if (require.main === module) {
  const m = generateAll(repoRoot());
  const dev = m.fixtures.filter((f) => f.split === "dev").length;
  console.log(`${m.fixtures.length} fixtures written (${dev} dev, ${m.fixtures.length - dev} holdout; ${m.fixtures.filter((f) => f.expectedToFail).length} expected to fail)`);
}

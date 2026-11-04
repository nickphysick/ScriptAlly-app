/**
 * Smart Import from photos — the evaluation's lists (smart-import-photos-v1, phase 4).
 *
 * Twelve generated lists, each the truth for one fixture: handwritten-style (three handwriting
 * webfonts on ruled paper), printed, and spreadsheet screenshots; 1–3 pages; 8–40 entries; with
 * crossings-out, ticks, ✗, "?", day-first dates with and without years, and agencies blurred past
 * a legible start. photoRender.mts draws each one sharp and blurred and measures where every line
 * landed; photoScore.ts scores a read against this.
 *
 * Deterministic: the same seed draws the same list every time.
 */

export type PhotoStyle = "hand" | "print" | "shot";

export interface PhotoEntry {
  name: string;
  /** "" = no agency written. */
  agency: string;
  /** Written exactly as on the page; "" = no date. */
  date: string;
  /** The status words as written ("" = nothing); `expect` is what a correct read maps them to. */
  said: string;
  expect: string;
  /** Other statuses that are equally right for what is written. */
  accept?: string[];
  /** A mark after the entry. A tick is read as Queried, unflagged; the others are "mark-unclear". */
  mark?: "✓" | "✗" | "?" | "!";
  crossed?: boolean;
  /** Only the first `legible` characters of the agency can be read; the rest is blurred. */
  illegibleAgency?: { legible: number };
}

export interface PhotoList {
  id: string;
  style: PhotoStyle;
  /** The handwriting font for "hand", the face for "print". */
  font: string;
  title?: string;
  pages: PhotoEntry[][];
}

// ── A small deterministic generator ──────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FIRST = ["Cordelia", "Nadia", "Hannah", "Rhys", "Imogen", "Leo", "Daniel", "Sophie", "Tom", "Kirsten", "Tomasz", "Meredith", "Priyanka", "Oliver", "Harriet", "Jonah", "Esme", "Callum", "Ruth", "Felix", "Amara", "Gideon", "Lottie", "Marcus", "Isla", "Bertie", "Freya", "Kwame", "Ottilie", "Stanley", "Juno", "Edmund", "Saoirse", "Wilfred", "Anouk", "Barnaby", "Clemence", "Dev", "Elspeth", "Rafferty"];
const LAST = ["Vane", "Okafor", "Biddle", "Hale", "Price", "Marchetti", "Achebe", "Lindqvist", "Rafferty", "Vale", "Mróz", "Quaye", "Sharma", "Pennington", "Gale", "Whitlock", "Drummond", "Osei", "Fairbairn", "Lowther", "Castellano", "Brennan", "Ashworth", "Kowalski", "Merriman", "Thorne", "Abara", "Lacey", "Huxley", "Ferreira", "Nakamura", "Calloway", "Delacroix", "Inglis", "Mbeki", "Oyelaran", "Strand", "Tremaine", "Ventris", "Wexford"];
const AGENCIES = ["Vane & Hart", "Okafor Lit", "Greaves", "Hale Agency", "Price & Partners", "Marchetti Lit", "Achebe & Rowe", "Fairbairn Associates", "Lowther Books", "Castellano Lit", "Brennan & Moss", "Ashworth Agency", "Thorne Literary", "Huxley Grant", "Calloway Hunt", "Inglis & Day", "Strand Literary", "Tremaine Lit"];

/** One day-first date as a writer might write it, and whether it carries a year. */
function writtenDate(r: () => number): string {
  const d = 1 + Math.floor(r() * 27), m = 1 + Math.floor(r() * 9);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept"];
  const k = r();
  if (k < 0.35) return `${d}/${m}`;
  if (k < 0.55) return `${d}/${m}/26`;
  if (k < 0.7) return `${d}/${m}/2026`;
  if (k < 0.85) return `${d} ${MON[m - 1]}`;
  return `${d}/${m}/25`;
}
/** Written status words and what they mean. Kept to the unambiguous synonyms the prompt maps. */
const SAID: [string, string, string[]?][] = [
  ["", "Queried"], ["sent", "Queried"], ["", "Queried"], ["queried", "Queried"],
  ["full req", "Full Requested"], ["partial req", "Partial Requested"], ["sent partial", "Partial Sent"],
  ["pass", "Rejected"], ["no reply", "Queried", ["No Response"]], ["sent full", "Full Sent"], ["R&R", "Revise & Resubmit"],
];

interface Knobs { n: number; crossed: number; ticks: number; marks: ("✗" | "?" | "!")[]; illegible: number; noDate: number; noAgency: number }
function draw(seed: number, k: Knobs): PhotoEntry[] {
  const r = rng(seed);
  const used = new Set<string>();
  const out: PhotoEntry[] = [];
  for (let i = 0; i < k.n; i++) {
    let name = "";
    do { name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; } while (used.has(name));
    used.add(name);
    const [said, expect, accept] = SAID[Math.floor(r() * SAID.length)];
    out.push({ name, agency: AGENCIES[Math.floor(r() * AGENCIES.length)], date: writtenDate(r), said, expect, ...(accept ? { accept } : {}) });
  }
  // Knobs land on distinct entries, spread through the list.
  const slots = out.map((_, i) => i).sort(() => r() - 0.5);
  let at = 0;
  const take = () => out[slots[at++ % slots.length]];
  for (let i = 0; i < k.crossed; i++) { const e = take(); e.crossed = true; e.expect = "Rejected"; e.accept = ["No Response", "Withdrawn"]; }
  for (let i = 0; i < k.ticks; i++) { const e = take(); e.mark = "✓"; e.said = ""; e.expect = "Queried"; delete e.accept; }
  for (const m of k.marks) {
    const e = take(); e.mark = m;
    e.accept = ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Offer", "Rejected", "Withdrawn", "No Response"];
    if (m === "?") e.date = "";
  }
  for (let i = 0; i < k.illegible; i++) { const e = take(); if (e.agency) e.illegibleAgency = { legible: Math.min(5, Math.max(2, e.agency.indexOf(" ") + 2)) }; }
  for (let i = 0; i < k.noDate; i++) take().date = "";
  for (let i = 0; i < k.noAgency; i++) { const e = take(); if (!e.illegibleAgency) e.agency = ""; }
  return out;
}
const pages = (entries: PhotoEntry[], per: number) => {
  const out: PhotoEntry[][] = [];
  for (let i = 0; i < entries.length; i += per) out.push(entries.slice(i, i + per));
  return out;
};

export const PHOTO_LISTS: PhotoList[] = [
  { id: "hand-caveat-1p", style: "hand", font: "Caveat", title: "Queries — The October Test", pages: pages(draw(11, { n: 10, crossed: 2, ticks: 2, marks: ["✗"], illegible: 1, noDate: 0, noAgency: 1 }), 10) },
  { id: "hand-indie-2p", style: "hand", font: "Indie Flower", pages: pages(draw(12, { n: 18, crossed: 2, ticks: 3, marks: ["!"], illegible: 1, noDate: 1, noAgency: 2 }), 9) },
  { id: "hand-shadows-3p", style: "hand", font: "Shadows Into Light", title: "Agents", pages: pages(draw(13, { n: 30, crossed: 3, ticks: 4, marks: ["✗", "?"], illegible: 2, noDate: 1, noAgency: 3 }), 10) },
  { id: "hand-caveat-short", style: "hand", font: "Caveat", pages: pages(draw(14, { n: 8, crossed: 2, ticks: 1, marks: ["?"], illegible: 0, noDate: 0, noAgency: 0 }), 8) },
  { id: "hand-indie-22", style: "hand", font: "Indie Flower", title: "Querying — round 2", pages: pages(draw(15, { n: 22, crossed: 1, ticks: 3, marks: ["✗"], illegible: 1, noDate: 0, noAgency: 2 }), 11) },
  { id: "hand-shadows-12", style: "hand", font: "Shadows Into Light", pages: pages(draw(16, { n: 12, crossed: 1, ticks: 2, marks: ["!"], illegible: 1, noDate: 1, noAgency: 1 }), 12) },
  { id: "print-serif-15", style: "print", font: "Georgia", title: "Query log", pages: pages(draw(21, { n: 15, crossed: 1, ticks: 0, marks: [], illegible: 0, noDate: 1, noAgency: 2 }), 15) },
  { id: "print-sans-26", style: "print", font: "Arial", pages: pages(draw(22, { n: 26, crossed: 2, ticks: 2, marks: ["?"], illegible: 0, noDate: 0, noAgency: 3 }), 13) },
  { id: "print-mono-40", style: "print", font: "Courier New", title: "Submissions", pages: pages(draw(23, { n: 40, crossed: 2, ticks: 0, marks: [], illegible: 0, noDate: 2, noAgency: 4 }), 14) },
  { id: "shot-sheet-12", style: "shot", font: "Arial", pages: pages(draw(31, { n: 12, crossed: 0, ticks: 0, marks: [], illegible: 0, noDate: 1, noAgency: 2 }), 12) },
  { id: "shot-sheet-24", style: "shot", font: "Arial", pages: pages(draw(32, { n: 24, crossed: 0, ticks: 0, marks: [], illegible: 0, noDate: 1, noAgency: 3 }), 12) },
  { id: "shot-sheet-8", style: "shot", font: "Arial", pages: pages(draw(33, { n: 8, crossed: 1, ticks: 0, marks: [], illegible: 0, noDate: 0, noAgency: 1 }), 8) },
];

/** The words an entry's line shows (also what a correct `lineRaw` reads). */
export function entryLine(e: PhotoEntry, style: PhotoStyle): string[] {
  const cells = [e.name, e.agency, e.date, e.said].map((c) => c.trim());
  if (style === "shot") return cells;
  return [cells.filter(Boolean).join(" – ") + (e.mark ? ` ${e.mark}` : "")];
}

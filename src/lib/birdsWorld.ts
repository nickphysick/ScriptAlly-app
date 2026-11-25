/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1 (design-refs/phone-birds-eye-world-v1/phone-birds-eye-world-v1.html) — THE ENGINE, pure.
 * One canvas you zoom and pan: every live query against one finish line. The view (components/phone/birds/BirdsWorld)
 * draws from this; the unit suite calls it.
 *   - THE DATA IS THE DESKTOP'S (lib/qc150 `beLine` over `eyeRows`): each row's dated stages (`past`) and its current
 *     stage (`cur`), read here in whole days from today. Nothing here restates a stage rule.
 *   - THE MATHS IS THE REF'S `world.js`, ported name for name: `layout()`, `yOff`/`yWorld`, `rowPx`/`gapPx`, `SX`/`SY`,
 *     `fitS`/`fitSY`, `zT`, `clamp()`, `fitView()`, `topFor`, `rowSegs()`, `num()`, `SHORT`, `stageTx()`,
 *     `rulerMarks()`/`spaced()`. Its constants are the ref's. Two things are the build's own, each named where it is
 *     made: the axis extent grows to hold real data (the ref's fixed −140…+70 / −180…+60 days are its minimum), and the
 *     bottom reserve is the app's dock height plus 16 (the ref's 104 was its own dock plus 42).
 *   - THE GROUPS (Nick's): Past its date · Nearly there · Plenty of time (with the agent, by how much of the reply
 *     window has gone, the ref's `kk`) · Waiting on you (the writer's move, `tileCourt` "you") · No date.
 * ⚠️ COPY: never "overdue" or "late" — "past its date", "wks past".
 */
import { QueryStatus } from "../types";
import { STAGE_COLOURS, stageOf, statusBand } from "./stageColours";
import { tileCourt } from "./qcSummary";
import type { EyeRow } from "./qcBirdsEye";
import { beLine } from "./qc150";
import { dayMonth, MONTHS_SHORT } from "./dates";

export const DAY = 86_400_000;
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the ref's constants ── */
export const WX = 600, RH = 30, GAP = 40, MAXZ = 6.5, XP = 0.25;
export const RULE = 28, TOPFIT = 140, TOPFOLD = 96, RPMAX = 100, GPMAX = 44;
/** the levels, by row height on screen (ref `LV`) */
export const LV: readonly (readonly [number, BwLevel])[] = [[0, "Overview"], [22, "Names"], [44, "Figures"], [72, "Dates"], [86, "Timeline"]];
export type BwLevel = "Overview" | "Names" | "Figures" | "Dates" | "Timeline";
export const level = (rp: number): BwLevel => LV.filter((l) => rp >= l[0]).pop()![1];

/* ── colours: the Plumage table, read (BAND fill, EDGE inset) ── */
export const bandOf = (status: string): string => statusBand(status);
export const edgeOf = (status: string): string => STAGE_COLOURS[stageOf(status)].edge;
export const hatchOf = (status: string): string => `repeating-linear-gradient(135deg,${bandOf(status)} 0 4px,#fff 4px 7px)`;

/* ── the rows ── */
export type BwAxis = "reply" | "calendar";
export type BwFilter = "all" | "past" | "week" | "you";
export interface BwStage { d: number; status: string }
export interface BwRow {
  id: string;
  name: string;
  agency: string;
  status: string;
  /** the writer's move (`tileCourt` "you": a partial, full or revision asked for, an offer) */
  you: boolean;
  /** "Send by" where the date is the writer's to keep */
  sendBy: boolean;
  /** every dated stage, end to end, in calendar days from today (≤ 0) */
  ev: BwStage[];
  /** the current stage's start, in days (null when nothing dates it) */
  start: number | null;
  /** the reply date, in days from today (negative: past its date); null when there is none */
  due: number | null;
  /** how much of the reply window has gone (ref `kk`); null with no date */
  kk: number | null;
  /* the engine's own dates, carried for the measurements (the v5 view's attributes) */
  fromMs: number | null;
  toMs: number | null;
  pasts: string;
  dueMs: number | null;
}
const dayOf = (ms: number, today: number): number => Math.round((startOfDay(ms) - today) / DAY);

/** one row from the desktop's line (`beLine`): its stages in days, its date and its window */
export function bwRow(e: EyeRow, nowMs: number): BwRow {
  const today = startOfDay(nowMs);
  const line = beLine(e, nowMs);
  const row = e.row;
  const statusAt = new Map(row.history.spans.map((s) => [s.startMs, String(s.status)]));
  const ev: BwStage[] = line.past.map((b) => ({ d: dayOf(b.fromMs, today), status: statusAt.get(b.fromMs) ?? String(row.status) }));
  if (line.cur) ev.push({ d: dayOf(line.cur.fromMs, today), status: String(row.status) });
  const start = line.cur ? dayOf(line.cur.fromMs, today) : ev.length ? ev[ev.length - 1].d : null;
  const due = line.dueMs == null ? null : dayOf(line.dueMs, today);
  const s0 = start ?? 0;
  const kk = due == null ? null : -s0 / Math.max(7, due - s0);
  return {
    id: row.id, name: row.agentName, agency: row.agency && row.agency !== "No agency" ? row.agency : "", status: String(row.status),
    you: tileCourt(row.status as QueryStatus) === "you", sendBy: row.expectedKind === "sendBy" || tileCourt(row.status as QueryStatus) === "you",
    ev, start, due, kk,
    fromMs: line.cur?.fromMs ?? null, toMs: line.cur?.toMs ?? null, pasts: line.past.map((b) => `${b.fromMs}-${b.toMs}`).join(","), dueMs: line.dueMs,
  };
}

/* ── the groups (Nick's), and the chips that filter them ── */
export const BW_GROUPS = ["Past its date", "Nearly there", "Plenty of time", "Waiting on you", "No date"] as const;
export type BwGroupName = (typeof BW_GROUPS)[number];
export function groupOf(r: BwRow): BwGroupName {
  if (r.due == null || r.kk == null) return "No date";
  if (r.you) return "Waiting on you";
  return r.kk >= 1 ? "Past its date" : r.kk >= 0.75 ? "Nearly there" : "Plenty of time";
}
export function bwFilter(rows: readonly BwRow[], f: BwFilter): BwRow[] {
  switch (f) {
    case "all": return [...rows];
    case "past": return rows.filter((r) => r.due != null && r.due < 0);
    case "week": return rows.filter((r) => r.due != null && r.due >= 0 && r.due <= 7);
    case "you": return rows.filter((r) => r.you);
    default: { const unhandled: never = f; return unhandled; }
  }
}
export interface BwCounts { all: number; past: number; week: number; you: number }
/** the four chips' counts — over every live row, so they never change with the filter */
export const bwCounts = (rows: readonly BwRow[]): BwCounts => ({
  all: rows.length, past: bwFilter(rows, "past").length, week: bwFilter(rows, "week").length, you: bwFilter(rows, "you").length,
});
export const CHIP_WORDS: Record<BwFilter, string> = { all: "out", past: "past its date", week: "this week", you: "with you" };
export const BW_CHIPS: readonly BwFilter[] = ["all", "past", "week", "you"];

/** the groups in order, each most-elapsed first (No date: the longest in its stage first) */
export function bwGroups(rows: readonly BwRow[], f: BwFilter = "all"): { t: BwGroupName; rows: BwRow[] }[] {
  const mine = bwFilter(rows, f);
  return BW_GROUPS.map((t) => ({
    t,
    rows: mine.filter((r) => groupOf(r) === t).sort((a, b) =>
      t === "No date" ? (a.start ?? 0) - (b.start ?? 0) || a.name.localeCompare(b.name) : (b.kk ?? 0) - (a.kk ?? 0) || a.name.localeCompare(b.name)),
  })).filter((g) => g.rows.length);
}

/* ── a row's segments (ref `rowSegs`): its stages end to end, then past its date (hatched) or still to come (dashed) ── */
export type SegKind = "stage" | "past" | "ahead";
export interface BwSeg {
  /** on the axis, in days */
  a: number; b: number;
  /** on the calendar, in days (the replay clips on these) */
  ca: number; cb: number;
  /** the date its words name, in calendar days */
  d: number;
  st: string; k: SegKind; first: boolean; last: boolean;
}
/** where a row's axis 0 sits: its own reply date (reply axis; an undated row lines today up on the line), or today */
export const rowOffset = (r: BwRow, axis: BwAxis): number => (axis === "reply" ? r.due ?? 0 : 0);
export function rowSegs(r: BwRow, axis: BwAxis): BwSeg[] {
  const off = rowOffset(r, axis), P = (d: number) => d - off, out: BwSeg[] = [], ev = r.ev;
  ev.forEach((e, i) => {
    const nx = ev[i + 1];
    const seg = (ca: number, cb: number, k: SegKind, last: boolean, d = e.d, first = i === 0): BwSeg => ({ a: P(ca), b: P(cb), ca, cb, d, st: e.status, k, first, last });
    if (nx) { out.push(seg(e.d, nx.d, "stage", false)); return; }
    if (r.due == null) { out.push(seg(e.d, 0, "stage", true)); return; }
    if (r.due < 0) { out.push(seg(e.d, r.due, "stage", true)); out.push(seg(r.due, 0, "past", true, r.due, false)); }
    else { out.push(seg(e.d, 0, "stage", true)); out.push(seg(0, r.due, "ahead", true, r.due, false)); }
  });
  return out;
}

/* ── words ── */
/** the figure: [number, unit] — "8 wks past", "12 days to go"; an undated row says "No date" */
export function num(r: Pick<BwRow, "due">): [string, string] {
  const d = r.due;
  if (d == null) return ["", "No date"];
  if (d < 0) { const w = Math.round(-d / 7); return w >= 2 ? [String(w), "wks past"] : [String(-d), -d === 1 ? "day past" : "days past"]; }
  const w = Math.round(d / 7);
  return d >= 14 ? [String(w), "wks to go"] : [String(d), d === 1 ? "day to go" : "days to go"];
}
/** each stage's short name in its bar (ref `SHORT`) */
export function shortName(status: string): string {
  switch (status) {
    case QueryStatus.QUERIED: return "Queried";
    case QueryStatus.PARTIAL_REQUESTED: return "Partial asked";
    case QueryStatus.PARTIAL_SENT: return "Partial sent";
    case QueryStatus.FULL_REQUESTED: return "Full asked";
    case QueryStatus.FULL_SENT: return "Full sent";
    case QueryStatus.REVISE_RESUBMIT: return "R&R asked";
    case QueryStatus.RESUBMITTED: return "Resubmitted";
    case QueryStatus.OFFER: case QueryStatus.SIGNED: return "Offer";
    default: return "Passed";
  }
}
/** a day from today as the words say it: "16 Nov" */
export const dm = (d: number, nowMs: number): string => dayMonth(startOfDay(nowMs) + d * DAY + DAY / 2);
const tw = (t: string, k: number) => t.length * k;
/** what a stage's bar says in `w` px (ref `stageTx`): name and date, then name only, then date only, then nothing */
export type StageWords = "both" | "name" | "date" | "none";
export function stageTx(name: string, date: string, w: number): StageWords {
  return w >= tw(name, 7.4) + tw(date, 6.6) + 24 ? "both" : w >= tw(name, 7.4) + 18 ? "name" : w >= tw(date, 6.6) + 18 ? "date" : "none";
}
/** the dashed part's words (ref `inBar` "ahead"): "Reply by 14 Jan", then the date, then nothing */
export function aheadTx(lead: string, date: string, w: number): string {
  const t = `${lead} ${date}`;
  return w >= tw(t, 6.6) + 20 ? t : w >= tw(date, 6.6) + 20 ? date : "";
}

/* ── the axis ── */
export interface BwAxisExt { D0: number; D1: number; lab: string }
/** the ref's extents are the minimum; real data widens them to the earliest stage and the latest date, a week clear */
export function axisExt(rows: readonly BwRow[], axis: BwAxis): BwAxisExt {
  let D0 = axis === "reply" ? -140 : -180, D1 = axis === "reply" ? 70 : 60;
  for (const r of rows) for (const s of rowSegs(r, axis)) { D0 = Math.min(D0, Math.floor(s.a) - 7); D1 = Math.max(D1, Math.ceil(s.b) + 7); }
  return { D0, D1, lab: axis === "reply" ? "Reply due" : "Today" };
}
/** the ruler's marks: weeks either side of the reply date (every four), or the months on the calendar */
export function rulerMarks(axis: BwAxis, ext: BwAxisExt, X: (d: number) => number, nowMs: number): [number, string][] {
  const out: [number, string][] = [];
  if (axis === "reply") {
    for (let w = Math.ceil(ext.D0 / 28) * 4; w * 7 <= ext.D1; w += 4) { if (!w) continue; out.push([X(w * 7), `${w < 0 ? "−" : "+"}${Math.abs(w)} wks`]); }
  } else {
    const today = startOfDay(nowMs), n = new Date(today);
    for (let m = -48; m <= 24; m++) {
      const dt = new Date(n.getFullYear(), n.getMonth() + m, 1), d = Math.round((dt.getTime() - today) / DAY);
      if (d < ext.D0 || d > ext.D1) continue;
      out.push([X(d), MONTHS_SHORT[dt.getMonth()]]);
    }
  }
  return out;
}
/** at least 52px between marks (ref `spaced`) */
export const spaced = (m: readonly [number, string][]): [number, string][] => { let last = -99; return m.filter(([x]) => { if (x - last < 52) return false; last = x; return true; }); };

/* ── the world: layout and the mapping between world and screen (ref `layout`, `fitS` … `clamp`) ── */
export interface BwPlaced { r: BwRow; y: number }
export interface BwG { t: BwGroupName; y: number; rows: BwPlaced[] }
export interface BwView { z: number; ox: number; oy: number }
export interface World {
  G: BwG[]; H: number; ext: BwAxisExt; PPD: number; LINE: number;
  vpW: number; vpH: number; bot: number; land: boolean;
  /** the zoom ceiling: the ref's 6.5, raised so rows can always reach 100px */
  maxZ: number;
  wxd: (d: number) => number;
  topFor: (z: number) => number;
  fitS: () => number; fitSY: () => number; zT: () => number;
  SX: (z: number) => number; SY: (z: number) => number;
  rowPx: (z: number) => number; gapPx: (z: number) => number;
  yOff: (wy: number, z: number) => number; yWorld: (o: number, z: number) => number;
  clamp: (v: BwView) => BwView; fitView: () => BwView;
}
export interface WorldOpts {
  groups: { t: BwGroupName; rows: BwRow[] }[];
  ext: BwAxisExt;
  vpW: number; vpH: number;
  /** the space kept under the rows: the dock's height + 16 (16 with no dock) */
  bot: number;
  /** landscape: the header always folded */
  land?: boolean;
}
export function makeWorld(o: WorldOpts): World {
  let y = 0;
  const G: BwG[] = o.groups.map(({ t, rows }) => { const g = { t, y, rows: rows.map((r, i) => ({ r, y: y + GAP + i * RH })) }; y += GAP + rows.length * RH; return g; });
  const H = y + 12;
  const { vpW, vpH, bot, ext } = o, land = !!o.land;
  const PPD = WX / (ext.D1 - ext.D0);
  const wxd = (d: number) => (Math.max(ext.D0, Math.min(ext.D1, d)) - ext.D0) * PPD;
  const top0 = land ? TOPFOLD : TOPFIT;
  const topFor = (z: number) => (land || z > 1.05 ? TOPFOLD : TOPFIT);
  /* ⚠️ A DEPARTURE FOR REAL DATA. The ref's `fitS` is min(width fit, height fit) and its `fitSY` never goes under it:
     right for its 22 rows (the width binds), but a campaign of 35 squeezes time into a third of the screen, and the
     fitted rows overflow. Here time keeps the width fit (the ref's own comment: "time keeps the width fit") and rows
     take the height, whichever way — so every live query is on screen fitted. With the ref's 22 rows both are its. */
  const fitS = () => (vpW - 32) / WX;
  const fitSY = () => Math.min(fitS() * 3, (vpH - top0 - RULE - bot) / (H + 8));
  const zT = () => 86 / (RH * fitSY());
  const SX = (z: number) => fitS() * Math.pow(z, XP) * (1 + (Math.max(0, z - zT()) / zT()) * 3);
  const SY = (z: number) => fitSY() * z;
  const rowPx = (z: number) => Math.min(RH * SY(z), RPMAX), gapPx = (z: number) => Math.min(GAP * SY(z), GPMAX);
  const yOff = (wy: number, z: number): number => {
    const rp = rowPx(z) / RH, gp = gapPx(z) / GAP; let off = 0;
    for (const g of G) {
      const a = g.y, b = a + GAP, c = b + g.rows.length * RH;
      if (wy <= b) return off + Math.max(0, wy - a) * gp; off += GAP * gp;
      if (wy <= c) return off + (wy - b) * rp; off += (c - b) * rp;
    }
    const last = G.length ? G[G.length - 1] : null, end = last ? last.y + GAP + last.rows.length * RH : 0;
    return off + Math.min(12, Math.max(0, wy - end));
  };
  const yWorld = (o2: number, z: number): number => {
    const rp = rowPx(z) / RH, gp = gapPx(z) / GAP; let off = 0;
    if (o2 <= 0) return o2 / (gp || 1);
    for (const g of G) {
      const a = g.y, b = a + GAP, c = b + g.rows.length * RH, gh = GAP * gp, rh = (c - b) * rp;
      if (o2 <= off + gh) return a + (o2 - off) / gp; off += gh;
      if (o2 <= off + rh) return b + (o2 - off) / rp; off += rh;
    }
    const last = G[G.length - 1];
    return last ? last.y + GAP + last.rows.length * RH + (o2 - off) : o2;
  };
  /* ⚠️ MAXZ IS THE REF'S 6.5 WHEN ITS ROWS CAN REACH 100px WITHIN IT (the ref's own data: 6.5 × 30 × 0.667 = 130px, so
     1.3× the cap). A longer campaign starts with shorter rows, so the ceiling rises to keep that same 1.3× headroom —
     otherwise the Dates and Timeline levels could never be reached. */
  const maxZ = Math.max(MAXZ, (1.3 * RPMAX) / (RH * fitSY()));
  const clamp = (v: BwView): BwView => {
    const z = Math.min(maxZ, Math.max(1, v.z)); const ww = WX * SX(z), hh = yOff(H, z), pad = 16;
    const ox = ww + 2 * pad <= vpW ? (vpW - ww) / 2 : Math.min(pad, Math.max(vpW - ww - pad, v.ox));
    const T = topFor(z), oy = hh + T + RULE + bot <= vpH ? T + RULE + 8 : Math.min(T + RULE + 8, Math.max(vpH - hh - bot, v.oy));
    return { z, ox, oy };
  };
  const fitView = (): BwView => ({ z: 1, ox: (vpW - WX * SX(1)) / 2, oy: top0 + RULE + 8 });
  return { G, H, ext, PPD, LINE: wxd(0), vpW, vpH, bot, land, maxZ, wxd, topFor, fitS, fitSY, zT, SX, SY, rowPx, gapPx, yOff, yWorld, clamp, fitView };
}
/** the zoom that gives rows `rp` px (ref `zoomToRows`'s z) */
export const zoomForRows = (w: World, rp: number): number => Math.max(1, rp / RH / w.fitSY());

/** the heading's place (ref): just above its rows, pinned under the ruler, pushed up by the next */
export function headingTop(gy: number, gp: number, gEnd: number, top: number, small: boolean): { hy: number; hh: number; pinned: boolean } {
  const hh = small ? 22 : 28, natural = gy + Math.max(0, gp - hh - 6), hy = Math.min(Math.max(natural, top + RULE), gEnd - hh - 2);
  return { hy, hh, pinned: hy > natural + 1 };
}
/** a bar's thickness and top at row height `rp` (ref `draw()`'s `th`/`by`) */
export function barBox(rp: number, ry: number): { th: number; by: number; tall: boolean } {
  const th = rp < 22 ? Math.max(3, Math.min(10, rp * 0.5)) : rp < 44 ? 5 : rp < 80 ? 8 : Math.min(26, 8 + (rp - 80) * 1.2);
  return { th, by: rp < 22 ? ry + (rp - th) / 2 : ry + rp - (rp < 44 ? 6 : 12) - th, tall: th >= 16 };
}
/** where `&court=` lands: the nearest chip (with you → with you; gone quiet → past its date; with agents has none) */
export function chipForCourt(court: string | null | undefined): BwFilter {
  if (court === "you") return "you";
  if (court === "quiet") return "past";
  return "all";
}

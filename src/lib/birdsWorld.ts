/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v3 (design-refs/phone-birds-eye-world-v3/phone-birds-eye-world-v3.html; v2's ref for what v3
 * leaves alone) — THE ENGINE, pure.
 *   - v3: folding groups and the "No reply date yet" group in the chart (v2's footer retired); the snap levels All /
 *     Months / Weeks (`levels`, `nearestLv`; the ceiling is Weeks); `FZ` retired (a pill stays fitted, z = 1); the hawk's
 *     news (`changes` against this device's "last opened"), its one-liners (`tips`), the search match, the no-date
 *     default (the agent's stated time, else 6 weeks), the long-press menu's actions, the scrubber's words, the recap's
 *     figures and the timeline sheet's steps. v2's 30px gap floor and footer reserve are retired: v3's heading spacing
 *     (`PUSH`, drawWorld) keeps headings apart, and the footer is gone.
 * One canvas you zoom and pan: every open query on real dates, today as the line. The view (components/phone/birds/)
 * draws from this; the unit suite calls it.
 *   - THE DATA IS THE DESKTOP'S (lib/qc150 `beLine`): each row's dated stages and its current one, in whole days from
 *     today. A closed query's last stage is its closing (the outcome's own status, on the day it reached it —
 *     `stageStartMs`, as lib/qcSummary rules, never `lastMs`).
 *   - THE MATHS IS THE REF'S page script, ported name for name: `setAxis()` (the span), `fitS`/`fitSY`/`maxZ`/`zT`,
 *     `SX`/`SY`, `fitView()` and `FZ`, `rowPx`/`gapPx`, `yOff`/`yWorld`, `clamp()`, `topFor`, `allH()`/`layout()`,
 *     `rowSegs()` (with `cont`, the gone-quiet fade, the offer's run and the closed cap), `clipR()`, `num()`/`hasFig()`,
 *     `SHORT`/`stageTx()`, `rulerMarks()`/`spaced()`. v1's reply-date axis, its blend and its beside-the-bar levels are
 *     retired. The one departure kept from v1: the bottom reserve is the app's dock + 16 (the ref's 104 was its own dock).
 *   - THE PILLS (Nick's): All = With you + Needs chasing + Waiting, exactly — With you is the writer's move
 *     (`tileCourt` "you": a partial, full or revision asked for, or an offer); Needs chasing is with the agent and past
 *     its reply date; Waiting is with the agent and not past it, no-date queries included.
 *   - GONE QUIET starts at the writer's own setting (`quietWeeks`, Settings › "A query goes quiet after"; the phone reads
 *     it through useV3), counted from the reply date.
 * ⚠️ COPY: never "overdue" or "late" — "past its date", "wks past".
 */
import { QueryStatus } from "../types";
import { STAGE_COLOURS, stageOf, statusBand } from "./stageColours";
import { STAGE_NAME, tileCourt } from "./qcSummary";
import type { EyeRow } from "./qcBirdsEye";
import { beLine } from "./qc150";
import { MONTHS_SHORT, dayMonth } from "./dates";

export const DAY = 86_400_000;
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the ref's constants ── */
export const WX = 600, RH = 30, GAP = 40, XP = 0.25;
export const RULE = 28, TOPFIT = 140, TOPFOLD = 96, RPMAX = 48, GPMAX = 44;
/** the lowest the zoom ceiling goes (ref `maxZ`) */
export const MAXZ_MIN = 6.5;

/* ── colours: the Plumage table, read ── */
export const bandOf = (status: string): string => statusBand(status);
export const edgeOf = (status: string): string => STAGE_COLOURS[stageOf(status)].edge;
export const hatchOf = (status: string): string => `repeating-linear-gradient(135deg,${bandOf(status)} 0 4px,#fff 4px 7px)`;
/** an earlier stage, faded so the current one reads as the live one (ref `segBg`) */
export const fadedBand = (status: string): string => `color-mix(in srgb,${bandOf(status)} 45%,#fff)`;
export const fadedEdge = (status: string): string => `color-mix(in srgb,${edgeOf(status)} 50%,#fff)`;

/* ── the rows ── */
export type BwFilter = "all" | "you" | "chase" | "wait";
export interface BwStage { d: number; status: string }
export interface BwRow {
  id: string;
  name: string;
  agency: string;
  status: string;
  /** the writer's move (`tileCourt` "you") */
  you: boolean;
  /** "Send by" where the date is the writer's to keep */
  sendBy: boolean;
  closed: boolean;
  /** the closed outcome's word ("Passed", "No reply", "Withdrawn"…); "" while open */
  outcome: string;
  /** every dated stage, end to end, in calendar days from today (≤ 0); a closed query's last is its closing */
  ev: BwStage[];
  /** the reply date, in days from today (negative: past its date); null when there is none (and always when closed) */
  due: number | null;
  /* the engine's own dates, carried for the measurements */
  fromMs: number | null;
  toMs: number | null;
  pasts: string;
  dueMs: number | null;
}
const dayOf = (ms: number, today: number): number => Math.round((startOfDay(ms) - today) / DAY);
const isOffer = (s: string) => s === QueryStatus.OFFER || s === QueryStatus.SIGNED;
/** a closed query's outcome, said short (STAGE_NAME, with "Closed with no reply" as "No reply") */
export const outcomeWord = (status: string): string => (status === QueryStatus.NO_RESPONSE ? "No reply" : STAGE_NAME[status as QueryStatus] ?? "Closed");

/** one row from the desktop's line (`beLine`); `closed` from the phone's own court (V3Query.court) */
export function bwRow(e: EyeRow, nowMs: number, closed = false): BwRow {
  const today = startOfDay(nowMs);
  const line = beLine(e, nowMs);
  const row = e.row;
  const statusAt = new Map(row.history.spans.map((s) => [s.startMs, String(s.status)]));
  const ev: BwStage[] = line.past.map((b) => ({ d: dayOf(b.fromMs, today), status: statusAt.get(b.fromMs) ?? String(row.status) }));
  if (line.cur) ev.push({ d: dayOf(line.cur.fromMs, today), status: String(row.status) });
  const you = !closed && tileCourt(row.status as QueryStatus) === "you";
  return {
    id: row.id, name: row.agentName, agency: row.agency && row.agency !== "No agency" ? row.agency : "", status: String(row.status),
    you, sendBy: you || row.expectedKind === "sendBy", closed, outcome: closed ? outcomeWord(String(row.status)) : "",
    ev, due: closed || line.dueMs == null ? null : dayOf(line.dueMs, today),
    fromMs: line.cur?.fromMs ?? null, toMs: line.cur?.toMs ?? null, pasts: line.past.map((b) => `${b.fromMs}-${b.toMs}`).join(","), dueMs: closed ? null : line.dueMs,
  };
}
const start = (r: BwRow): number => (r.ev.length ? r.ev[r.ev.length - 1].d : 0);
/** how much of the reply window has gone (ref `kk`); with no date, against 60 days */
export const kk = (r: BwRow): number => (r.due == null ? -start(r) / 60 : -start(r) / Math.max(7, r.due - start(r)));

/* ── the pills: the open queries split exactly three ways ── */
export const isYou = (r: BwRow): boolean => !r.closed && r.you;
export const isChase = (r: BwRow): boolean => !r.closed && !r.you && r.due != null && r.due < 0;
/** gone quiet (Nick's ruling, phone query sheet v1 §A): WAITING ON THE AGENT and more than the setting's days past the
 *  reply date. A with-you query past its send-by date never goes quiet: it stays hatched to today with its "!" and sorts
 *  among the rest of Needs action. The ONE test — rowSegs draws the faded tail by it and bwGroups sorts by it. */
export const isGoneQuiet = (r: BwRow, quietDays: number): boolean => isChase(r) && -r.due! > quietDays;
export const isWait = (r: BwRow): boolean => !r.closed && !r.you && !(r.due != null && r.due < 0);
/** on its real dates: open with a reply date, an offer (its date sits on the line), or with you (a reply date is not
 *  the writer's to wait on there: with no send-by date its stage runs to today, in With you, where its pill counts it) */
export const isDrawn = (r: BwRow): boolean => !r.closed && (r.due != null || isOffer(r.status) || r.you) && r.ev.length > 0;
/** waiting with no reply date: its own group, "No reply date yet" (v3), a bar to today fading out after it */
export const isNoDate = (r: BwRow): boolean => !r.closed && !isDrawn(r) && r.ev.length > 0;
export const PILLS: readonly BwFilter[] = ["all", "you", "chase", "wait"];
export const PILL_LABEL: Record<BwFilter, string> = { all: "All", you: "With you", chase: "Needs chasing", wait: "Waiting" };
export interface BwCounts { all: number; you: number; chase: number; wait: number }
export const bwCounts = (rows: readonly BwRow[]): BwCounts => {
  const open = rows.filter((r) => !r.closed);
  return { all: open.length, you: open.filter(isYou).length, chase: open.filter(isChase).length, wait: open.filter(isWait).length };
};
export function inPill(r: BwRow, f: BwFilter): boolean {
  switch (f) {
    case "all": return !r.closed;
    case "you": return isYou(r);
    case "chase": return isChase(r);
    case "wait": return isWait(r);
    default: { const unhandled: never = f; return unhandled; }
  }
}
/** where `&court=` lands (v1's map): with you → With you; gone quiet → Needs chasing; with agents → All */
export function chipForCourt(court: string | null | undefined): BwFilter {
  if (court === "you") return "you";
  if (court === "quiet") return "chase";
  return "all";
}

/* ── the groups ── */
/* v3.2 (Nick's ruling: too many groups): "Nearly there" and "Plenty of time" are retired, and "Needs chasing" and "With
   you" fold into one group, Needs action. These are the groups' ids (and their fold keys); a heading follows the pill. */
export const BW_GROUPS = ["Needs action", "Within their window", "No reply date yet", "Closed"] as const;
export type BwGroupName = (typeof BW_GROUPS)[number];
/** a group's heading under a pill: Needs action reads "With you" under With you and "Needs chasing" under Needs chasing */
export function groupLabel(t: BwGroupName, f: BwFilter): string {
  if (t !== "Needs action") return t;
  return f === "you" ? PILL_LABEL.you : f === "chase" ? PILL_LABEL.chase : t;
}
/** saved folds: only today's group ids carry; a retired name (or v3's "Needs chasing" / "With you") is dropped */
export const keepFolds = (names: readonly string[]): string[] => names.filter((n) => (BW_GROUPS as readonly string[]).includes(n));
const byKk = (a: BwRow, b: BwRow) => kk(b) - kk(a) || a.name.localeCompare(b.name);
/** the groups under a pill, in order (v3.2). Needs action: every query past its reply date with the agent, and every
 *  query with you (undated ones too), mixed in one order, the largest share of its window used first (`kk`, the measure
 *  v3 split Nearly there from Plenty of time by). Within their window: with the agent and not yet past the date, the same
 *  sort. No reply date yet: under All and Waiting. Closed: the latest closed first, under All only. */
export function bwGroups(rows: readonly BwRow[], f: BwFilter = "all", quietDays = Infinity): { t: BwGroupName; label: string; rows: BwRow[] }[] {
  const drawn = rows.filter((r) => isDrawn(r) && inPill(r, f));
  /* v3.3 (Nick's ruling): in Needs action, the gone-quiet queries go last, each part most of its window used first */
  const quiet = (r: BwRow) => isGoneQuiet(r, quietDays) ? 1 : 0;
  const action = drawn.filter((r) => r.you || isChase(r)).sort((a, b) => quiet(a) - quiet(b) || byKk(a, b)), within = drawn.filter((r) => !r.you && !isChase(r)).sort(byKk);
  const closed = f === "all" ? rows.filter((r) => r.closed && r.ev.length).sort((a, b) => start(b) - start(a) || a.name.localeCompare(b.name)) : [];
  const nd = f === "all" || f === "wait" ? rows.filter((r) => isNoDate(r) && inPill(r, f)).sort(byKk) : [];
  const defs: [BwGroupName, BwRow[]][] = [["Needs action", action], ["Within their window", within], ["No reply date yet", nd], ["Closed", closed]];
  return defs.filter(([, r]) => r.length).map(([t, r]) => ({ t, label: groupLabel(t, f), rows: r }));
}
/** the open queries with no reply date, in the order the no-date sheet walks them */
export const noDateRows = (rows: readonly BwRow[]): BwRow[] => rows.filter(isNoDate).sort(byKk);
/** the "All" layout's height in world units (ref `allH`): every pill is drawn at its scale, folded or not */
export function allH(rows: readonly BwRow[]): number {
  return bwGroups(rows, "all").reduce((a, x) => a + GAP + x.rows.length * RH, 0) + 8;
}

/* ── the span (ref `setAxis`): a fortnight before the campaign's first date to three weeks after its last ── */
export interface BwExt { D0: number; D1: number }
export function setAxis(rows: readonly BwRow[]): BwExt {
  const qs = rows.filter((r) => !r.closed && r.ev.length);
  const first = Math.min(0, ...qs.flatMap((r) => r.ev.map((e) => e.d)));
  const last = Math.max(0, ...qs.map((r) => r.due ?? 0));
  return { D0: Math.max(-365, Math.min(-60, first - 14)), D1: Math.min(365, Math.max(42, last + 21)) };
}

/* ── a row's segments (ref `rowSegs`, on real dates) ── */
export type SegKind = "stage" | "past" | "quiet" | "ahead";
/** `mark`: the tail that starts past the reply date carries the "!" (v3.3: a query that went quiet with no hatched
 *  stretch before it carries it on its quiet tail) */
export interface BwSeg { a: number; b: number; d: number; st: string; k: SegKind; first: boolean; last: boolean; cont: boolean; mark?: boolean }
export function rowSegs(r: BwRow, quietDays: number): BwSeg[] {
  const out: BwSeg[] = [], ev = r.ev;
  const seg = (a: number, b: number, d: number, st: string, k: SegKind, first: boolean, last: boolean, cont = false): BwSeg => ({ a, b, d, st, k, first, last, cont });
  ev.forEach((e, i) => {
    const nx = ev[i + 1], first = i === 0;
    if (nx) { out.push(seg(e.d, nx.d, e.d, e.status, "stage", first, false)); return; }
    /* closed: a short grey cap on the day it closed. An offer (or no date): its stage runs on to today, 3 days at least */
    if (r.closed) { out.push(seg(e.d, e.d + 4, e.d, e.status, "stage", first, true)); return; }
    if (r.due == null) { out.push(seg(e.d, Math.max(0, e.d + 3), e.d, e.status, "stage", first, true)); return; }
    if (r.due < 0) {
      /* a stage reached after its reply date had gone (a nudge, a late request) starts its hatching at its own start */
      const end = Math.max(e.d, r.due);
      out.push(seg(e.d, end, e.d, e.status, "stage", first, true, true));
      /* past its date: hatched; once it has gone quiet (the writer's setting, from the reply date) it fades to today */
      const qp = r.due + quietDays;
      /* v3.3 (Nick): gone quiet stays hatched — the quiet tail is the same hatching, fading out to today (drawWorld).
         Phone query sheet v1 §A: only a query waiting on the agent goes quiet (isGoneQuiet, the sort's own test) */
      if (!isGoneQuiet(r, quietDays)) out.push({ ...seg(end, 0, r.due, e.status, "past", false, true), mark: true });
      else if (qp > end) { out.push({ ...seg(end, qp, r.due, e.status, "past", false, true, true), mark: true }); out.push(seg(qp, 0, r.due, e.status, "quiet", false, true)); }
      else out.push({ ...seg(end, 0, r.due, e.status, "quiet", false, true), mark: true });
    } else {
      out.push(seg(e.d, 0, e.d, e.status, "stage", first, true, true));
      out.push(seg(0, r.due, r.due, e.status, "ahead", false, true));
    }
  });
  return out;
}
/** the replay's cut (ref `clipR`): nothing after its "now", nothing still to come, the last piece squared off */
export function clipR(segs: readonly BwSeg[], rt: number | null): BwSeg[] {
  if (rt == null) return [...segs];
  const out: BwSeg[] = [];
  for (const g of segs) { if (g.k === "ahead" || g.a > rt) continue; const c = { ...g }; if (c.b > rt) c.b = rt; out.push(c); }
  if (out.length) { const l = out[out.length - 1]; if (l.k === "stage") { l.last = true; l.cont = false; } }
  return out;
}
/** the replay's start: three days before the earliest stage of anything drawn */
/** never before the axis's own start (a query older than a year would pin the line to the left edge) */
export const replayStart = (rows: readonly BwRow[], d0 = -Infinity): number => Math.max(d0, Math.min(0, ...rows.filter(isDrawn).map((r) => r.ev[0].d)) - 3);
/** the replay's clock: ease in-out over its duration (ref `replay`) */
export const replayAt = (t0: number, k: number): number => t0 + (0 - t0) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const REPLAY_MS = 6000;

/* ── figures: only past its date, an offer, or a closed outcome (ref `hasFig`, `num`) ── */
export const hasFig = (r: BwRow, replaying = false): boolean => !replaying && (r.closed || isOffer(r.status) || (r.due != null && r.due < 0));
export function num(r: Pick<BwRow, "due" | "closed" | "outcome" | "status">): [string, string] {
  if (r.closed) return ["", r.outcome];
  if (isOffer(r.status)) return ["", "Offer"];
  const d = r.due;
  if (d == null) return ["", ""];
  if (d < 0) { const w = Math.round(-d / 7); return w >= 2 ? [String(w), "wks past"] : [String(-d), -d === 1 ? "day past" : "days past"]; }
  const w = Math.round(d / 7);
  return d >= 14 ? [String(w), "wks to go"] : [String(d), d === 1 ? "day to go" : "days to go"];
}

/* ── words ── */
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
    default: return outcomeWord(status);
  }
}
/** a day from today, and as the words say it: "16 Nov" — lib/dates' one formatter (so September is "Sep", not the ref's "Sept") */
export const dateOf = (d: number, nowMs: number): Date => { const t = new Date(startOfDay(nowMs)); t.setDate(t.getDate() + d); return t; };
export const dm = (d: number, nowMs: number): string => dayMonth(dateOf(d, nowMs));
export const monthOf = (t: Date): string => MONTHS_SHORT[t.getMonth()];
const tw = (t: string, k: number) => t.length * k;
export type StageWords = "both" | "name" | "date" | "none";
/** what a stage says in `w` px (ref `stageTx`): name and date, then name only, then date only, then nothing */
export function stageTx(name: string, date: string, w: number): StageWords {
  return w >= tw(name, 7.4) + tw(date, 6.6) + 24 ? "both" : w >= tw(name, 7.4) + 18 ? "name" : w >= tw(date, 6.6) + 18 ? "date" : "none";
}
/** the still-to-come part's words (ref `inBar` "ahead"): "Reply by 14 Jan", then the date, then nothing */
export function aheadTx(lead: string, date: string, w: number): string {
  const t = `${lead} ${date}`;
  return w >= tw(t, 6.6) + 20 ? t : w >= tw(date, 6.6) + 20 ? date : "";
}

/* ── the ruler (ref `rulerMarks`): months, then a date every 4 / 2 / 1 weeks on Mondays, then every day ── */
export type BwTier = "months" | "4w" | "2w" | "1w" | "days";
export interface BwRuler { tier: BwTier; marks: [number, string, boolean][]; mon: Date | null }
export function rulerMarks(ext: BwExt, X: (d: number) => number, nowMs: number): BwRuler {
  const ppd = Math.abs(X(7) - X(0)) / 7, out: [number, string, boolean][] = [];
  const now = dateOf(0, nowMs);
  if (ppd * 28 < 64) {
    for (let m = -13; m <= 13; m++) {
      const dt = new Date(now.getFullYear(), now.getMonth() + m, 1), d = Math.round((dt.getTime() - now.getTime()) / DAY);
      if (d < ext.D0 || d > ext.D1) continue;
      out.push([X(d), monthOf(dt), false]);
    }
    return { tier: "months", marks: out, mon: null };
  }
  if (ppd >= 24) {
    let mon: Date | null = null;
    for (let d = ext.D0; d <= ext.D1; d++) {
      const t = dateOf(d, nowMs), x = X(d);
      out.push([x, t.getDate() === 1 ? dayMonth(t) : String(t.getDate()), true]);
      if (x <= 56) mon = t;
    }
    return { tier: "days", marks: out, mon: mon ?? dateOf(ext.D0, nowMs) };
  }
  const step = ppd * 7 >= 64 ? 7 : ppd * 14 >= 64 ? 14 : 28;
  let first = ext.D0;
  while (dateOf(first, nowMs).getDay() !== 1) first++;
  for (let d = first; d <= ext.D1; d += 7) { if (Math.round((d - first) / 7) % (step / 7)) continue; out.push([X(d), dm(d, nowMs), false]); }
  return { tier: step === 7 ? "1w" : step === 14 ? "2w" : "4w", marks: out, mon: null };
}
/** dates at least 64px apart, day numbers 22px (ref `spaced`) */
export const spaced = (m: readonly [number, string, boolean][]): [number, string, boolean][] => { let last = -99; return m.filter(([x, , day]) => { if (x - last < (day ? 22 : 64)) return false; last = x; return true; }); };

/* ── the world: layout and the mapping between world and screen ── */
export interface BwPlaced { r: BwRow; y: number }
/** a group as laid out: `n` its count (folded or not), `h` the world height its rows take (a folded group keeps 1.3 rows) */
export interface BwG { t: BwGroupName; label: string; y: number; h: number; n: number; folded: boolean; rows: BwPlaced[] }
export interface BwLevelStop { t: "All" | "Months" | "Weeks"; z: number }
export interface BwView { z: number; ox: number; oy: number }
export interface World {
  G: BwG[]; H: number; FOOT: number; HALL: number; ext: BwExt; PPD: number; LINE: number;
  vpW: number; vpH: number; bot: number; land: boolean; filter: BwFilter;
  /** v2's opening zoom for a short pill, retired in v3: always 1 (a pill stays fitted) */
  FZ: number;
  maxZ: number;
  /** the snap levels (ref `levels()`): All, then Months and Weeks where each is 15% closer than the one below */
  levels: BwLevelStop[];
  nearestLv: (z: number) => number;
  /** the zoom that shows `days` across the screen (ref `zForDays`) */
  zForDays: (days: number) => number;
  wxd: (d: number) => number;
  topFor: (z: number) => number;
  fitS: () => number; fitSY: () => number; zT: () => number;
  SX: (z: number) => number; SY: (z: number) => number;
  rowPx: (z: number) => number; gapPx: (z: number) => number;
  yOff: (wy: number, z: number) => number; yWorld: (o: number, z: number) => number;
  clamp: (v: BwView) => BwView; fitView: () => BwView;
}
export interface WorldOpts {
  rows: readonly BwRow[];
  filter: BwFilter;
  vpW: number; vpH: number;
  /** the space kept under the rows: the dock's height + 16 (16 with no dock) */
  bot: number;
  /** landscape: the header always folded */
  land?: boolean;
  /** the groups folded on this device */
  folded?: ReadonlySet<string>;
  /** the writer's "goes quiet after", in days (v3.3: gone-quiet queries sort last in Needs action) */
  quietDays?: number;
}
export function makeWorld(o: WorldOpts): World {
  const { vpW, vpH, bot, filter } = o, land = !!o.land;
  let y = 0;
  const G: BwG[] = bwGroups(o.rows, filter, o.quietDays).map(({ t, label, rows: rows0 }) => {
    const folded = !!o.folded?.has(t), rows = folded ? [] : rows0, h = folded ? RH * 1.3 : rows.length * RH;
    const g: BwG = { t, label, y, h, n: rows0.length, folded, rows: rows.map((r, i) => ({ r, y: y + GAP + i * RH })) };
    y += GAP + h; return g;
  });
  const FOOT = 8;
  const H = y + FOOT, HALL = allH(o.rows);
  const ext = setAxis(o.rows);
  const PPD = WX / (ext.D1 - ext.D0);
  const wxd = (d: number) => (Math.max(ext.D0, Math.min(ext.D1, d)) - ext.D0) * PPD;
  /* time always fills the width; rows share the height of the "All" layout, so a pill never changes the scale */
  const fitS = () => (vpW - 32) / WX;
  const fitSY = () => Math.min(fitS() * 3, (vpH - TOPFIT - RULE - bot) / (HALL + 8));
  const zT = () => Math.max(1.05, 24 / (RH * fitSY()));
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
    return off + Math.min(FOOT, Math.max(0, wy - end));
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
  /* the snap levels (ref `levels()`, `zForDays`): All is fitted; Months shows 120 days across; Weeks is the closer of
     42 days across and the zoom where rows reach 48px (× 1.02); each only where it is 15% closer than the one below */
  const zForDays = (days: number): number => { let lo = 1, hi = 200; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (days * PPD * SX(m) > vpW - 32) hi = m; else lo = m; } return lo; };
  const levels: BwLevelStop[] = [{ t: "All", z: 1 }];
  { const m = zForDays(120), wk = Math.max(zForDays(42), (RPMAX / (RH * fitSY())) * 1.02);
    if (m > 1.15) levels.push({ t: "Months", z: m });
    if (wk > levels[levels.length - 1].z * 1.15) levels.push({ t: "Weeks", z: wk }); }
  /* pinch stops at the closest level (ref `maxZ` with snapping on) */
  const maxZ = Math.max(1, levels[levels.length - 1].z * 1.001);
  const nearestLv = (z: number): number => { let b = 0; levels.forEach((l, i) => { if (Math.abs(Math.log(l.z / z)) < Math.abs(Math.log(levels[b].z / z))) b = i; }); return b; };
  /* v3: a pill stays fitted (v2's closer opening, FZ, is retired) */
  const FZ = 1;
  const topFor = (z: number) => (land || z > 1.05 ? TOPFOLD : TOPFIT);
  const top0 = land ? TOPFOLD : TOPFIT;
  const clamp = (v: BwView): BwView => {
    const z = Math.min(maxZ, Math.max(1, v.z)); const ww = WX * SX(z), hh = yOff(H, z), pad = 16;
    const ox = ww + 2 * pad <= vpW ? (vpW - ww) / 2 : Math.min(pad, Math.max(vpW - ww - pad, v.ox));
    const T = topFor(z), oy = hh + T + RULE + bot <= vpH ? T + RULE + 8 : Math.min(T + RULE + 8, Math.max(vpH - hh - bot, v.oy));
    return { z, ox, oy };
  };
  const LINE = wxd(0);
  const fitView = (): BwView => ({ z: 1, ox: (vpW - WX * SX(1)) / 2, oy: top0 + RULE + 8 });
  return { G, H, FOOT, HALL, ext, PPD, LINE, vpW, vpH, bot, land, filter, FZ, maxZ, levels, nearestLv, zForDays, wxd, topFor, fitS, fitSY, zT, SX, SY, rowPx, gapPx, yOff, yWorld, clamp, fitView };
}
/** the zoom that gives rows `rp` px */
export const zoomForRows = (w: World, rp: number): number => Math.min(w.maxZ, Math.max(1, rp / RH / w.fitSY()));

/** the heading's place (ref): just above its rows, pinned under the ruler, pushed up by the next */
export function headingTop(gy: number, gp: number, gEnd: number, top: number, small: boolean): { hy: number; hh: number; pinned: boolean } {
  const hh = small ? 22 : 28, natural = gy + Math.max(0, gp - hh - 6), hy = Math.min(Math.max(natural, top + RULE), gEnd - hh - 2);
  return { hy, hh, pinned: hy > natural + 1 };
}
/** a row's bar (ref `inRow`): fitted, a thin bar; zoomed in, it fills the row (row − 8, at most 40) and carries its
 *  name from 18px, the agency and each stage's words from 34px */
export function barBox(rp: number, ry: number, zoomed: boolean): { th: number; by: number; named: boolean; one: boolean; two: boolean } {
  const named = zoomed && rp >= 24, th = !named ? Math.max(3, Math.min(12, rp * 0.45)) : Math.min(40, rp - 8);
  return { th, by: ry + (rp - th) / 2, named, one: named && th >= 18, two: named && th >= 34 };
}

/* ── the sample campaign (ref `BEP`), invented, for the no-queries screen behind its card. Never real data. ── */
const SN = [["Harriet", "Vance"], ["Callum", "Reid"], ["Rosalind", "Ashby"], ["Samuel", "Osei"], ["Eleanor", "Voss"], ["Daniel", "O'Rourke"], ["Imogen", "Hartley"], ["Sam", "Okonjo"], ["Priya", "Kapoor"], ["Theo", "Abara"], ["Ottoline", "Frayn"], ["Noah", "Bright"], ["Jonathan", "Marsh"], ["Ana", "Kovic"], ["David", "Reyes"], ["Tom", "Ellery"], ["Edda", "Voss"], ["Mira", "Stone"], ["Lucy", "Penrose"], ["Kit", "Marlowe"], ["Ines", "Duarte"], ["Felix", "Grant"]];
const SA = ["Vance & Wren", "Northlight", "Ashby & Lowe", "Blackfriars", "Voss & Hart", "Hale & Finch", "Hartley Literary", "Pembroke Street", "Kapoor Agency", "Abara Lit", "Frayn & Co", "Ellery Bright", "Marsh Literary", "Kovic Agency", "Reyes Literary", "Ellery Bright", "Voss & Grey", "Stone House", "Penrose Lit", "Marlowe Mills", "Duarte Agency", "Grant & Co"];
type K = "q" | "preq" | "psent" | "freq" | "fsent" | "offer" | "pass";
const SK: Record<K, QueryStatus> = { q: QueryStatus.QUERIED, preq: QueryStatus.PARTIAL_REQUESTED, psent: QueryStatus.PARTIAL_SENT, freq: QueryStatus.FULL_REQUESTED, fsent: QueryStatus.FULL_SENT, offer: QueryStatus.OFFER, pass: QueryStatus.REJECTED };
const SP: [[number, K][], number][] = [[[[150, "q"], [96, "preq"], [90, "psent"], [44, "freq"], [40, "fsent"]], 10], [[[60, "q"]], 8], [[[51, "q"]], 6], [[[70, "q"], [30, "preq"], [24, "psent"]], 8], [[[90, "q"], [60, "freq"], [52, "fsent"]], 10], [[[40, "q"], [11, "preq"]], 2], [[[30, "q"]], 8], [[[100, "q"]], 6], [[[24, "q"]], 8], [[[80, "q"], [50, "preq"], [48, "psent"]], 6], [[[130, "q"]], 12], [[[95, "q"], [60, "freq"], [55, "fsent"], [3, "offer"]], 0], [[[56, "q"], [20, "freq"]], 2], [[[70, "q"], [30, "freq"]], 2], [[[63, "q"], [35, "preq"]], 2], [[[18, "q"]], 8], [[[77, "q"], [40, "preq"], [36, "psent"]], 8], [[[6, "q"]], 8], [[[120, "q"], [70, "pass"]], 0], [[[45, "q"]], 6], [[[12, "q"]], 10], [[[160, "q"], [110, "preq"], [104, "psent"], [60, "pass"]], 0]];
/** the ref's invented campaign, relative to today: 22 queries (2 closed, 3 with no reply date). Never real data. */
export function sampleRows(): BwRow[] {
  let nd = 0;
  return SP.map(([ev, wk], i) => {
    const st = ev[ev.length - 1][1], closed = st === "pass", last = -ev[ev.length - 1][0];
    let due: number | null = closed || st === "offer" ? null : last + (wk ? wk * 7 : 0);
    if (nd < 3 && !closed && st === "q" && due != null && due > 10) { due = null; nd++; }
    const status = SK[st], you = st === "preq" || st === "freq" || st === "offer";
    return {
      id: `sample${i}`, name: SN[i].join(" "), agency: SA[i], status, you, sendBy: you,
      closed, outcome: closed ? outcomeWord(status) : "", ev: ev.map(([d, s]) => ({ d: -d, status: SK[s] })), due,
      fromMs: null, toMs: null, pasts: "", dueMs: null,
    };
  });
}

/* ══ v3 · the hawk's news, its one-liners, search, the no-date default, the long-press menu, the scrubber, the recap and
   the timeline sheet (ref `changes`, `tips`, `openSearch`, `openNd`, `menuHTML`, the scrubber, `recapCard`,
   `openSheet`). Pure. ══ */

/** what each stage it moved to is called in the news (ref `WHO`) */
const WHO: Partial<Record<string, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "asked for a partial", [QueryStatus.FULL_REQUESTED]: "asked for the full",
  [QueryStatus.OFFER]: "made an offer", [QueryStatus.REJECTED]: "passed",
};
export interface BwChange { id: string; d: number; t: string }
/** what changed since `seenDay` (days from today, ≤ 0): each stage moved, and each reply date reached, oldest first.
 *  A change ON the day last opened counts only if after it (ref `e.d > SEEN`) */
/** v3.1 (Nick's ruling 2): when two lines would start with the same agent's name, each of them carries the
 *  manuscript's title after the name — "Jo Smith (The Salt Road) asked for the full". Only then; never grouped. */
export function changes(rows: readonly BwRow[], seenDay: number, titleOf: (id: string) => string | null | undefined = () => null): BwChange[] {
  const raw: (BwChange & { name: string; rest: string })[] = [];
  for (const r of rows) {
    for (const e of r.ev) if (e.d > seenDay && e.d <= 0 && WHO[e.status]) raw.push({ id: r.id, d: e.d, t: "", name: r.name, rest: WHO[e.status] });
    if (!r.closed && !r.you && r.due != null && r.due <= 0 && r.due > seenDay) raw.push({ id: r.id, d: r.due, t: "", name: r.name, rest: "reached the reply date" });
  }
  const per = new Map<string, number>();
  for (const x of raw) per.set(x.name, (per.get(x.name) ?? 0) + 1);
  const out = raw.map(({ id, d, name, rest }) => {
    const title = (per.get(name) ?? 0) > 1 ? titleOf(id)?.trim() : null;
    return { id, d, t: `${name}${title ? ` (${title})` : ""} ${rest}` };
  });
  return out.sort((a, b) => a.d - b.d || a.t.localeCompare(b.t));
}
/** "since Thursday" — the weekday within a week, the date beyond it */
export function seenLabel(seenDay: number, nowMs: number): string {
  const t = dateOf(seenDay, nowMs);
  return seenDay >= -6 ? t.toLocaleDateString("en-GB", { weekday: "long" }) : dm(seenDay, nowMs);
}
/** a stored instant → its day from today (ref `SEEN`) */
export const dayFromMs = (ms: number, nowMs: number): number => dayOf(ms, startOfDay(nowMs));

/** the hawk's one-liners, in order, each only when it applies (ref `tips`) */
export function tips(rows: readonly BwRow[], quietDays: number): string[] {
  const open = rows.filter((r) => !r.closed), out: string[] = [];
  const you = open.filter((r) => r.you).length;
  const wk = open.filter((r) => !r.you && r.due != null && r.due >= 0 && r.due <= 7).length;
  const quiet = open.filter((r) => !r.you && r.due != null && -r.due > quietDays).sort((a, b) => a.due! - b.due!)[0];
  const firsts = rows.filter((r) => r.ev.length).map((r) => r.ev[0].d);
  if (you) out.push(`${you} ${you === 1 ? "thing is" : "things are"} waiting on you. The ball’s in your court.`);
  out.push(wk ? `${wk} ${wk === 1 ? "reply is" : "replies are"} due this week. Fingers crossed.` : "No replies due this week. A good week to send a few more.");
  if (quiet) out.push(`${quiet.name} has gone quiet. A nudge, or time to let it go?`);
  if (firsts.length) { const n = -Math.min(...firsts); out.push(`${n} ${n === 1 ? "day" : "days"} on the hunt. Most searches take months, not weeks. Keep going.`); }
  return out;
}

/** search (ref `openSearch`): by name or agency, open first then closed, at most six */
export function searchRows(rows: readonly BwRow[], q: string, n = 6): BwRow[] {
  const v = q.trim().toLowerCase();
  const all = [...rows.filter((r) => !r.closed), ...rows.filter((r) => r.closed)];
  return (v ? all.filter((r) => `${r.name} ${r.agency}`.toLowerCase().includes(v)) : all).slice(0, n);
}

/** the no-date sheet's starting point: the agent's stated response time from their card, else 6 weeks */
export const ND_DEFAULT_WEEKS = 6;
/** the send-by sheet (v3.1) starts two weeks from today */
export const SB_DEFAULT_WEEKS = 2;
export function noDateDefault(statedWeeks: number | null | undefined): { weeks: number; stated: boolean } {
  return statedWeeks != null && statedWeeks > 0 ? { weeks: Math.round(statedWeeks), stated: true } : { weeks: ND_DEFAULT_WEEKS, stated: false };
}

/** the long-press menu (ref `menuHTML`): per state, each mapped to the app's journey by the view */
/* v3.1 (Nick's rulings): no Reopen on the phone (no phone journey), so a closed query's menu is just Open query; an
   undated with-you query gets "Add send-by date" after "I've sent it" */
export type BwAct = "replied" | "nudge" | "open" | "edit" | "sent" | "sendby";
export const ACT_LABEL: Record<BwAct, string> = { replied: "They replied", nudge: "Send a nudge", open: "Open query", edit: "Edit dates", sent: "I’ve sent it", sendby: "Add send-by date" };
/** with you and no send-by date (v3.1): drawn to today, with "Add send-by date" in its menu and its timeline */
export const needsSendBy = (r: Pick<BwRow, "closed" | "you" | "due">): boolean => !r.closed && r.you && r.due == null;
export function menuActions(r: Pick<BwRow, "closed" | "you" | "due">): BwAct[] {
  if (r.closed) return ["open"];
  if (r.you) return needsSendBy(r) ? ["sent", "sendby", "open", "edit"] : ["sent", "open", "edit"];
  return ["replied", "nudge", "open", "edit"];
}

/** what a row was doing on `day` (the scrubber's label) */
export function scrubLabel(r: BwRow, day: number, quietDays: number): string | null {
  if (isNoDate(r)) return r.ev[0] && day >= r.ev[0].d && day <= 0 ? "Waiting" : null;
  const g = rowSegs(r, quietDays).find((s) => day >= s.a && day <= s.b + 0.5);
  if (!g) return null;
  return g.k === "past" ? "Past its date" : g.k === "quiet" ? "Gone quiet" : g.k === "ahead" ? (r.you ? "To send" : "Waiting") : shortName(g.st);
}
/** how many were out on `day` (the scrubber's pill on the fitted view) */
export const outOn = (rows: readonly BwRow[], day: number): number => rows.filter((r) => r.ev.length && r.ev[0].d <= day && !(r.closed && r.ev[r.ev.length - 1].d < day)).length;

/** the recap's figures (ref `recapCard`) */
export interface BwRecap { days: number; sent: number; replies: number; requests: number; offers: number }
export function recapStats(rows: readonly BwRow[]): BwRecap {
  const dated = rows.filter((r) => r.ev.length);
  const evs = dated.flatMap((r) => r.ev.map((e) => e.status));
  const reqs = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);
  const reps = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REJECTED]);
  return {
    days: dated.length ? -Math.min(...dated.map((r) => r.ev[0].d)) : 0, sent: dated.length,
    replies: evs.filter((s) => reps.has(s)).length, requests: evs.filter((s) => reqs.has(s)).length,
    offers: dated.filter((r) => r.ev.some((e) => e.status === QueryStatus.OFFER)).length,
  };
}

/** the timeline sheet (ref `openSheet`): one step per stage, the reply-due step, the line and the button */
/** "nosendby" (v3.1): an undated with-you query's send-by step, "No send-by date yet" with an Add link */
export interface BwStep { k: "done" | "next" | "late" | "nosendby"; t: string; d: number; status: string | null; cur: boolean }
export function sheetOf(r: BwRow, quietDays: number, nowMs: number): { steps: BwStep[]; line: string; cta: "replied" | "sent" | null } {
  const past = r.due != null && r.due < 0, quiet = past && -r.due! > quietDays;
  const steps: BwStep[] = r.ev.map((e, i) => ({ k: "done", t: (STAGE_NAME[e.status as QueryStatus] ?? e.status).replace(" requested", " asked for"), d: e.d, status: e.status, cur: i === r.ev.length - 1 }));
  if (r.due != null && !r.closed) steps.push({ k: past ? "late" : "next", t: r.you ? "Your send-by date" : "Reply due", d: r.due, status: null, cur: false });
  else if (needsSendBy(r)) steps.push({ k: "nosendby", t: "No send-by date yet", d: 0, status: null, cur: false });
  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const line = r.closed ? `Closed ${dm(r.ev[r.ev.length - 1]?.d ?? 0, nowMs)}.`
    : r.you ? (past ? `${days(-r.due!)} past the date you set to send it.` : r.due != null ? `Send it by ${dm(r.due, nowMs)}.` : "No send-by date set.")
    : quiet ? "It’s gone quiet. A last nudge, or time to let it go?"
    : past ? `${days(-r.due!)} past the reply date. A polite nudge often gets things moving.`
    : r.due == null ? "No reply date set." : `Reply expected in ${days(r.due)}.`;
  return { steps, line, cta: r.closed ? null : r.you ? "sent" : "replied" };
}
/** "x days ago" (ref `ago`) */
export const agoOf = (d: number): string => (d === 0 ? "today" : d < 0 ? `${-d} ${d === -1 ? "day" : "days"} ago` : `in ${d} ${d === 1 ? "day" : "days"}`);

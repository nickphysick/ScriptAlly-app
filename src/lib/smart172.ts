/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the smart filter panel's model: its choices (`Smart172`, held as Queries.tsx page state and
 * remembered for the visit beside `qcF138`), the test a row must pass (`pass172`), the applied row's chips, the
 * date fields' wording, and the list's grouping (`group172`, `tier172`). v172.5 — what's next: every query in one of
 * seven parts (`stand172`), shown or hidden by the panel's ring (`hide` beside `closed`, picked by `pickPart172`).
 */
import { QueryStatus } from "../types";
import { whereItStands, type QcRow } from "./qcSummary";
import { dayMonth } from "./dates";

export type Who172 = "you" | "chase" | "wait";
/** v172.5 — what's next for an open query: the five action parts, then in their window; Closed is the seventh part */
export type Stand172 = "offer" | "req" | "nudge" | "nodate" | "close" | "window";
export const STAND172: readonly { k: Stand172; label: string }[] = [
  { k: "offer", label: "Offer to answer" }, { k: "req", label: "Materials requested" }, { k: "nudge", label: "Nudge due" },
  { k: "nodate", label: "Reply date needed" }, { k: "close", label: "Consider closing" }, { k: "window", label: "In their window" },
];
/** the parts Action needed is made of, and No action needed */
export const ACT172: readonly Stand172[] = ["offer", "req", "nudge", "nodate", "close"];
export const WAIT172: readonly Stand172[] = ["window"];
/** a due-date range in days from today (the ends are open: "or earlier" / "or later"), and whether undated ones count */
export interface Due172 { lo: number; hi: number; nd: boolean }
export const REPLY172 = { min: -56, max: 84 };
export const SENDBY172 = { min: -28, max: 56 };
export const dueOn172 = (d: Due172, b: { min: number; max: number }) => d.lo > b.min || d.hi < b.max || !d.nd;
export interface Smart172 {
  hide: Stand172[];           // v172.5 — the open parts left out (none = all shown)
  closed: boolean;            // include closed
  stage: number[];            // stages picked (furthest reached): 0 queried · 1 partial · 2 full · 3 offer; none = any
  sent: [number, number] | null;   // ms range
  pkgs: string[];
  methods: string[];
  fit: number;                // min stars, 0 any
  countries: string[];
  date: Due172;      // the agent's reply date: waiting on the agent only
  sendby: Due172;    // your send-by date: your move only
  mats: "any" | "yes" | "no";
}
export const EMPTY172: Smart172 = { hide: [], closed: true, stage: [], sent: null, pkgs: [], methods: [], fit: 0, countries: [], date: { lo: REPLY172.min, hi: REPLY172.max, nd: true }, sendby: { lo: SENDBY172.min, hi: SENDBY172.max, nd: true }, mats: "any" };
export const smartOn172 = (s: Smart172): number =>
  (s.hide.length ? 1 : 0) + (s.closed ? 0 : 1) + (stageOn172(s) ? 1 : 0) + (s.sent ? 1 : 0) + (s.pkgs.length ? 1 : 0) + (s.methods.length ? 1 : 0)
  + (s.fit ? 1 : 0) + (s.countries.length ? 1 : 0) + (dueOn172(s.date, REPLY172) ? 1 : 0) + (dueOn172(s.sendby, SENDBY172) ? 1 : 0) + (s.mats !== "any" ? 1 : 0);

export interface Ctx172 { nowMs: number; pkg: (r: QcRow) => string; stars: (r: QcRow) => number; country: (r: QcRow) => string }
const DAY = 86400000;
export const whoOf172 = (r: QcRow, now: number): Who172 | "closed" => {
  const w = whereItStands(r, now);
  if (w === "closed") return "closed";
  if (w === "quiet" || (w === "you" && r.court === "agent")) return "chase";
  return w === "you" ? "you" : "wait";
};
/** v172.5 — the part a query is in: closed · gone quiet → consider closing · with you and the agent's court → a nudge
 *  due · with you on an offer → offer to answer · with you otherwise → materials requested · waiting with no reply
 *  date → reply date needed · waiting with one → in their window */
export const stand172 = (r: QcRow, now: number): Stand172 | "closed" => {
  const w = whereItStands(r, now);
  if (w === "closed") return "closed";
  if (w === "quiet") return "close";
  if (w === "you") return r.court === "agent" ? "nudge" : r.status === QueryStatus.OFFER ? "offer" : "req";
  return r.expectedMs == null ? "nodate" : "window";
};
const IDX: Partial<Record<QueryStatus, number>> = {
  [QueryStatus.PARTIAL_REQUESTED]: 1, [QueryStatus.PARTIAL_SENT]: 1, [QueryStatus.FULL_REQUESTED]: 2, [QueryStatus.FULL_SENT]: 2,
  [QueryStatus.REVISE_RESUBMIT]: 2, [QueryStatus.RESUBMITTED]: 2, [QueryStatus.OFFER]: 3,
};
export const stageIdx172 = (r: QcRow): number => Math.max(IDX[r.status] ?? 0, r.furthest === "full" ? 2 : r.furthest === "partial" ? 1 : 0);
export const method172 = (r: QcRow): string => String(r.query.sendMethod ?? "").toLowerCase().trim().replace("querymanager", "query manager") || "none";

/** does the row pass every smart filter except `skip` (the faceted count's) */
export function pass172(r: QcRow, s: Smart172, c: Ctx172, skip?: keyof Smart172): boolean {
  const who = whoOf172(r, c.nowMs);
  if (skip !== "closed" && !s.closed && who === "closed") return false;
  if (skip !== "hide" && s.hide.length && who !== "closed" && s.hide.includes(stand172(r, c.nowMs) as Stand172)) return false;
  if (skip !== "stage" && stageOn172(s) && !s.stage.includes(stageIdx172(r))) return false;
  if (skip !== "sent" && s.sent && (r.sentMs == null || r.sentMs < s.sent[0] || r.sentMs > s.sent[1])) return false;
  if (skip !== "pkgs" && s.pkgs.length && !s.pkgs.includes(c.pkg(r))) return false;
  if (skip !== "methods" && s.methods.length && !s.methods.includes(method172(r))) return false;
  if (skip !== "fit" && s.fit && c.stars(r) < s.fit) return false;
  if (skip !== "countries" && s.countries.length && !s.countries.includes(c.country(r))) return false;
  /* the two date fields cover different queries (the agent's side, your side), so when both are set a query passes on
     either; on its own, each keeps to its side */
  const dOn = skip !== "date" && dueOn172(s.date, REPLY172), sOn = skip !== "sendby" && dueOn172(s.sendby, SENDBY172);
  if ((dOn || sOn) && !((dOn && dueIn172(r, c.nowMs, "agent", s.date, REPLY172)) || (sOn && dueIn172(r, c.nowMs, "you", s.sendby, SENDBY172)))) return false;
  if (skip !== "mats" && s.mats !== "any" && (s.mats === "yes") !== r.materialsRecorded) return false;
  return true;
}

/** Agent's reply date covers queries waiting on the agent (in their window or needing a chase); undated ones are exactly
 *  Birds-eye's "Waiting, no reply date". Send-by date covers your move. A query outside the field's side never matches
 *  while the field is set. */
export const sideOf172 = (r: QcRow, now: number): "agent" | "you" | "closed" => { const w = whoOf172(r, now); return w === "closed" ? "closed" : w === "you" ? "you" : "agent"; };
export const dueDays172 = (r: QcRow, now: number): number | null => (r.expectedMs == null ? null : Math.round((r.expectedMs - now) / DAY));
export function dueIn172(r: QcRow, now: number, side: "agent" | "you", d: Due172, b: { min: number; max: number }): boolean {
  if (sideOf172(r, now) !== side) return false;
  const n = dueDays172(r, now);
  if (n == null) return d.nd && undated172(r, now, side);
  return (d.lo <= b.min || n >= d.lo) && (d.hi >= b.max || n <= d.hi);
}

/** an undated query the field's "Not dated" counts: on your side every one; on the agent's side only those simply
 *  waiting — exactly Birds-eye's "Waiting, no reply date" (an undated query that needs chasing is not "waiting") */
export const undated172 = (r: QcRow, now: number, side: "agent" | "you"): boolean =>
  dueDays172(r, now) == null && (side === "you" || whoOf172(r, now) === "wait");

/* the applied row's chips for the smart panel: one per set section, each removable on its own */
const COUNTRY172: Record<string, string> = { GB: "UK", US: "US", IE: "Ireland", AU: "Australia", CA: "Canada", DE: "Germany", NZ: "New Zealand" };
const METHOD172: Record<string, string> = { email: "Email", "query manager": "QueryManager", "online form": "Online form", post: "Post" };
const STAGE172 = ["Queried", "Partial", "Full", "Offer"];
const wk172 = (x: number) => (x === 0 ? "today" : `${Math.abs(x / 7)}w ${x < 0 ? "ago" : "ahead"}`);
const day172 = (ms: number) => dayMonth(ms);
/** a due range in words, with real dates: "Overdue", "Due by 29 Jan", "Due 12 Dec – 29 Jan", "Due after 12 Dec",
 *  "Not yet due", "Dated only"; "+ undated" when undated ones still count */
export function dueText172(d: Due172, b: { min: number; max: number }): string {
  const on = (x: number) => day172(Date.now() + x * DAY);
  const lo = d.lo > b.min, hi = d.hi < b.max;
  let r = "";
  if (!lo && hi) r = d.hi <= 0 ? (d.hi === 0 ? "Overdue" : `Overdue by ${Math.abs(d.hi / 7)}w+`) : `Due by ${on(d.hi)}`;
  else if (lo && !hi) r = d.lo === 0 ? "Not yet due" : d.lo < 0 ? `Due after ${on(d.lo)}` : `Due after ${on(d.lo)}`;
  else if (lo && hi) r = d.lo === 0 && d.hi > 0 ? `Due in the next ${d.hi / 7}w` : `Due ${on(d.lo)} – ${on(d.hi)}`;
  if (!r) return d.nd ? "" : "Dated only";
  return d.nd ? `${r} + undated` : r;
}
export const resetPart172: Record<string, Partial<Smart172>> = {
  closed: { closed: true }, hide: { hide: [] }, ws: { hide: [], closed: true }, stage: { stage: [] }, sent: { sent: null }, pkgs: { pkgs: [] }, methods: { methods: [] },
  fit: { fit: 0 }, countries: { countries: [] }, date: { date: EMPTY172.date }, sendby: { sendby: EMPTY172.sendby }, mats: { mats: "any" },
};
export function chips172(s: Smart172, set: (p: Partial<Smart172>) => void): { key: string; label: string; part: Partial<Smart172>; onRemove: () => void }[] {
  const out: { key: string; label: string; part: Partial<Smart172>; onRemove: () => void }[] = [];
  const add = (key: string, label: string, p: Partial<Smart172>) => out.push({ key: `s172:${key}`, label, part: p, onRemove: () => set(p) });
  if (s.hide.length) add("ws", standText172(s), resetPart172.ws);
  else if (!s.closed) add("closed", "Closed hidden", resetPart172.closed);
  for (const k of [...s.stage].sort()) add(`stage:${k}`, `Stage: ${["Queried", "Partial", "Full", "Offer"][k]}`, { stage: s.stage.filter((x) => x !== k) });
  if (s.sent) add("sent", `Sent ${day172(s.sent[0])} – ${day172(s.sent[1])}`, resetPart172.sent);
  if (dueOn172(s.date, REPLY172)) add("date", `Reply: ${dueText172(s.date, REPLY172)}`, resetPart172.date);
  if (dueOn172(s.sendby, SENDBY172)) add("sendby", `Send-by: ${dueText172(s.sendby, SENDBY172)}`, resetPart172.sendby);
  for (const k of s.pkgs) add(`pkg:${k}`, k, { pkgs: s.pkgs.filter((x) => x !== k) });
  for (const k of s.methods) add(`m:${k}`, `Sent by ${METHOD172[k] ?? k}`, { methods: s.methods.filter((x) => x !== k) });
  if (s.fit) add("fit", `Fit ${s.fit}★ or more`, resetPart172.fit);
  for (const k of s.countries) add(`c:${k}`, `Agent in ${COUNTRY172[k] ?? k}`, { countries: s.countries.filter((x) => x !== k) });
  if (s.mats !== "any") add("mats", s.mats === "yes" ? "Materials recorded" : "Materials missing", resetPart172.mats);
  return out;
}

/** v172.5 — what the ring is showing, in words: "Action needed" (exactly the five action parts), "No action needed"
 *  (exactly In their window), else the shown names joined, Closed last; "Closed hidden" when only Closed is off */
export function standText172(s: Smart172): string {
  const shown = STAND172.filter((x) => !s.hide.includes(x.k)).map((x) => x.k);
  const only = (ks: readonly Stand172[]) => !s.closed && shown.length === ks.length && ks.every((k) => shown.includes(k));
  if (only(ACT172)) return "Action needed";
  if (only(WAIT172)) return "No action needed";
  if (!s.hide.length) return s.closed ? "" : "Closed hidden";
  const names = [...STAND172.filter((x) => shown.includes(x.k)).map((x) => x.label), ...(s.closed ? ["Closed"] : [])];
  return names.join(", ") || "Nothing shown";
}

/** v172.5 — a pick on the ring, its key or a group heading (`act`, `wait`, a part, or `closed`): from everything, the
 *  pick shows only that; after that each pick adds or takes away; taking the last away shows everything again */
export type Pick172 = Stand172 | "closed" | "act" | "wait";
export const partsOf172 = (k: Pick172): readonly (Stand172 | "closed")[] => (k === "act" ? ACT172 : k === "wait" ? WAIT172 : [k]);
export function pickPart172(s: Smart172, k: Pick172): Pick<Smart172, "hide" | "closed"> {
  const all = !s.hide.length && s.closed;
  const isShown = (x: Stand172 | "closed") => (x === "closed" ? s.closed : !s.hide.includes(x));
  const shown = new Set<Stand172 | "closed">(all ? [] : [...STAND172.map((x) => x.k), "closed" as const].filter(isShown));
  const ks = partsOf172(k);
  const takeAway = !all && ks.every((x) => shown.has(x));
  ks.forEach((x) => (takeAway ? shown.delete(x) : shown.add(x)));
  if (!shown.size) return { hide: [], closed: true };
  return { hide: STAND172.map((x) => x.k).filter((x) => !shown.has(x)), closed: shown.has("closed") };
}

export const stageOn172 = (s: Smart172) => s.stage.length > 0 && s.stage.length < 4;
export function stageText172(st: number[]): string {
  const L = ["Queried", "Partial", "Full", "Offer"];
  return [...st].sort().map((k) => L[k]).join(", ");
}

/** 1 · the list grouped: Action needed (v172.5 — taking in the waiting with no reply date) · Within their window · Closed */
export function group172(rows: readonly QcRow[], now: number): { key: string; label: string; rows: QcRow[] }[] {
  const w = (r: QcRow) => whoOf172(r, now);
  return [
    { key: "action", label: "Action needed", rows: rows.filter((r) => w(r) === "you" || w(r) === "chase" || (w(r) === "wait" && r.expectedMs == null)).map((r, i) => [r, i] as const).sort((a, b) => tier172(a[0], now) - tier172(b[0], now) || a[1] - b[1]).map(([r]) => r) },
    { key: "window", label: "Within their window", rows: rows.filter((r) => w(r) === "wait" && r.expectedMs != null) },
    { key: "closed", label: "Closed", rows: rows.filter((r) => w(r) === "closed") },
  ].filter((g) => g.rows.length > 0);
}

/** the most urgent first inside Action needed: an offer, then a request you're late with, a request to answer, a nudge
 *  due, a reply date needed (3.5), and last a query gone quiet (worth closing) */
export function tier172(r: QcRow, now: number): number {
  if (r.status === QueryStatus.OFFER) return 0;
  const w = whereItStands(r, now);
  if (w === "you" && r.court !== "agent") return r.expectedMs != null && r.expectedMs < now ? 1 : 2;
  if (w === "you") return 3;
  if (w !== "quiet" && r.expectedMs == null) return 3.5;
  return 4;
}

/** a remembered panel made safe, field by field (the visit's memory, lib/qcViewMemory): anything unreadable falls back
 *  to that field's untouched value */
export function sanitiseSmart172(raw: unknown): Smart172 {
  const e = EMPTY172;
  if (!raw || typeof raw !== "object") return e;
  const r = raw as Record<string, unknown>;
  const strs = (v: unknown, max: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 128))].slice(0, max) : []);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const due = (v: unknown, b: { min: number; max: number }, d: Due172): Due172 => {
    if (!v || typeof v !== "object") return d;
    const x = v as Record<string, unknown>; const lo = num(x.lo), hi = num(x.hi);
    if (lo == null || hi == null || lo < b.min || hi > b.max || lo > hi) return d;
    return { lo, hi, nd: x.nd !== false };
  };
  const sent = Array.isArray(r.sent) && r.sent.length === 2 && num(r.sent[0]) != null && num(r.sent[1]) != null && (r.sent[0] as number) <= (r.sent[1] as number)
    ? [r.sent[0] as number, r.sent[1] as number] as [number, number] : null;
  return {
    hide: Array.isArray(r.hide) ? [...new Set(r.hide.filter((x): x is Stand172 => STAND172.some((y) => y.k === x)))] : [],
    closed: r.closed !== false,
    stage: Array.isArray(r.stage) ? [...new Set(r.stage.filter((x): x is number => x === 0 || x === 1 || x === 2 || x === 3))] : [],
    sent,
    pkgs: strs(r.pkgs, 40),
    methods: strs(r.methods, 8),
    fit: r.fit === 1 || r.fit === 2 || r.fit === 3 || r.fit === 4 || r.fit === 5 ? r.fit : 0,
    countries: strs(r.countries, 40),
    date: due(r.date, REPLY172, e.date),
    sendby: due(r.sendby, SENDBY172, e.sendby),
    mats: r.mats === "yes" || r.mats === "no" ? r.mats : "any",
  };
}

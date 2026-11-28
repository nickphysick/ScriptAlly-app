/* MOCK ONLY (Query Centre v172 review build) — the smart filter panel's own state, applied on top of the page's filters. */
import { useSyncExternalStore } from "react";
import { QueryStatus } from "./types";
import { whereItStands, type QcRow } from "./lib/qcSummary";

export type Who172 = "you" | "chase" | "wait";
/** v19.7 — the four open states, exactly the list's own groups (Needs action split in two); Closed is the fifth */
export type Stand172 = "offer" | "req" | "nudge" | "close" | "window" | "nodate";
/** v19.11 — Needs action in its four parts (an offer to answer; materials they've asked for; a nudge due; gone quiet,
 *  worth closing), then the two kinds of waiting; Closed is the last */
export const STAND172: { k: Stand172; label: string }[] = [
  { k: "offer", label: "Offer to answer" }, { k: "req", label: "Materials requested" }, { k: "nudge", label: "Nudge due" }, { k: "nodate", label: "Reply date needed" }, { k: "close", label: "Consider closing" },
  { k: "window", label: "In their window" },
];
/** a due-date range in days from today (the ends are open: "or earlier" / "or later"), and whether undated ones count */
export interface Due172 { lo: number; hi: number; nd: boolean }
export const REPLY172 = { min: -56, max: 84 };
export const SENDBY172 = { min: -28, max: 56 };
export const dueOn172 = (d: Due172, b: { min: number; max: number }) => d.lo > b.min || d.hi < b.max || !d.nd;
export interface Smart172 {
  who: Who172 | null;
  closed: boolean;            // include closed
  hide: Stand172[];           // v19.7 — the open states left out (none = all shown)
  stage: number[];            // stages picked (furthest reached): 0 queried · 1 partial · 2 full · 3 offer; none = any
  sent: [number, number] | null;   // ms range
  quiet: [number, number] | null;  // days since anything happened
  pkgs: string[];
  methods: string[];
  fit: number;                // min stars, 0 any
  countries: string[];
  date: Due172;      // the agent's reply date: waiting on the agent only
  sendby: Due172;    // your send-by date: your move only
  mats: "any" | "yes" | "no";
}
export const EMPTY172: Smart172 = { who: null, closed: true, hide: [], stage: [], sent: null, quiet: null, pkgs: [], methods: [], fit: 0, countries: [], date: { lo: REPLY172.min, hi: REPLY172.max, nd: true }, sendby: { lo: SENDBY172.min, hi: SENDBY172.max, nd: true }, mats: "any" };
let cur: Smart172 = EMPTY172;
const subs = new Set<() => void>();
export const setSmart172 = (p: Partial<Smart172>) => { cur = { ...cur, ...p }; subs.forEach((f) => f()); };
export const resetSmart172 = () => { cur = EMPTY172; subs.forEach((f) => f()); };
export const useSmart172 = (): Smart172 => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cur, () => cur);
export const smartOn172 = (s: Smart172): number =>
  (s.who ? 1 : 0) + (s.hide.length ? 1 : 0) + (s.closed ? 0 : 1) + (stageOn172(s) ? 1 : 0) + (s.sent ? 1 : 0) + (s.quiet ? 1 : 0) + (s.pkgs.length ? 1 : 0) + (s.methods.length ? 1 : 0)
  + (s.fit ? 1 : 0) + (s.countries.length ? 1 : 0) + (dueOn172(s.date, REPLY172) ? 1 : 0) + (dueOn172(s.sendby, SENDBY172) ? 1 : 0) + (s.mats !== "any" ? 1 : 0);

export interface Ctx172 { nowMs: number; pkg: (r: QcRow) => string; stars: (r: QcRow) => number; country: (r: QcRow) => string }
const DAY = 86400000;
export const whoOf172 = (r: QcRow, now: number): Who172 | "closed" => {
  const w = whereItStands(r, now);
  if (w === "closed") return "closed";
  if (w === "quiet" || (w === "you" && r.court === "agent")) return "chase";
  return w === "you" ? "you" : "wait";
};
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
export const quietDays172 = (r: QcRow, now: number): number => Math.max(0, Math.floor((now - (r.stageStartMs ?? r.lastMs)) / DAY));
export const method172 = (r: QcRow): string => String(r.query.sendMethod ?? "").toLowerCase().trim().replace("querymanager", "query manager") || "none";

/** does the row pass every smart filter except `skip` (the faceted count's) */
export function pass172(r: QcRow, s: Smart172, c: Ctx172, skip?: keyof Smart172): boolean {
  const who = whoOf172(r, c.nowMs);
  if (skip !== "closed" && !s.closed && who === "closed") return false;
  if (skip !== "who" && s.who && who !== s.who) return false;
  if (skip !== "hide" && s.hide.length && who !== "closed" && s.hide.includes(stand172(r, c.nowMs) as Stand172)) return false;
  if (skip !== "stage" && stageOn172(s) && !s.stage.includes(stageIdx172(r))) return false;
  if (skip !== "sent" && s.sent && (r.sentMs == null || r.sentMs < s.sent[0] || r.sentMs > s.sent[1])) return false;
  if (skip !== "quiet" && s.quiet) { const d = quietDays172(r, c.nowMs); if (d < s.quiet[0] || (s.quiet[1] < 120 && d > s.quiet[1])) return false; }
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
  if (n == null) return d.nd;
  return (d.lo <= b.min || n >= d.lo) && (d.hi >= b.max || n <= d.hi);
}

/* the applied row's chips for the smart panel: one per set section, each removable on its own */
const COUNTRY172: Record<string, string> = { GB: "UK", US: "US", IE: "Ireland", AU: "Australia", CA: "Canada", DE: "Germany", NZ: "New Zealand" };
const METHOD172: Record<string, string> = { email: "Email", "query manager": "QueryManager", "online form": "Online form", post: "Post" };
const STAGE172 = ["Queried", "Partial", "Full", "Offer"];
const wk172 = (x: number) => (x === 0 ? "today" : `${Math.abs(x / 7)}w ${x < 0 ? "ago" : "ahead"}`);
const MON172 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day172 = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MON172[d.getMonth()]}`; };
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
  who: { who: null }, closed: { closed: true }, hide: { hide: [] }, ws: { hide: [], closed: true }, stage: { stage: [] }, sent: { sent: null }, pkgs: { pkgs: [] }, methods: { methods: [] },
  fit: { fit: 0 }, countries: { countries: [] }, date: { date: EMPTY172.date }, sendby: { sendby: EMPTY172.sendby }, mats: { mats: "any" },
};
export function chips172(s: Smart172): { key: string; label: string; part: Partial<Smart172>; onRemove: () => void }[] {
  const out: { key: string; label: string; part: Partial<Smart172>; onRemove: () => void }[] = [];
  const add = (key: string, label: string, p: Partial<Smart172>) => out.push({ key: `s172:${key}`, label, part: p, onRemove: () => setSmart172(p) });
  if (s.who) add("who", { you: "With you", chase: "Needs chasing", wait: "Waiting" }[s.who], resetPart172.who);
  if (s.hide.length) add("hide", s.closed ? `${standText172(s)}, Closed` : standText172(s), resetPart172.ws);
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

/** v19.7 — what Where it stands is showing, in words: "Needs action", "Your move", "Waiting", or the shown names */
export function standText172(s: Smart172): string {
  const shown = STAND172.filter((x) => !s.hide.includes(x.k)).map((x) => x.k);
  const is = (...k: Stand172[]) => shown.length === k.length && k.every((x) => shown.includes(x));
  if (is("offer", "req", "nudge", "nodate", "close")) return "Action needed";
  if (is("window")) return "No action needed";
  return shown.length || s.closed ? STAND172.filter((x) => shown.includes(x.k)).map((x) => x.label).join(", ") || "Closed" : "No open queries";
}
export const stageOn172 = (s: Smart172) => s.stage.length > 0 && s.stage.length < 4;
export function stageText172(st: number[]): string {
  const L = ["Queried", "Partial", "Full", "Offer"];
  return [...st].sort().map((k) => L[k]).join(", ");
}

/** 1 · the list grouped as Birds-eye and the phone: Needs action · Within their window · Waiting, no reply date · Closed */
export function group172(rows: readonly QcRow[], now: number): { key: string; label: string; rows: QcRow[] }[] {
  const w = (r: QcRow) => whoOf172(r, now);
  return [
    { key: "action", label: "Action needed", rows: rows.filter((r) => w(r) === "you" || w(r) === "chase" || (w(r) === "wait" && r.expectedMs == null)).map((r, i) => [r, i] as const).sort((a, b) => tier172(a[0], now) - tier172(b[0], now) || a[1] - b[1]).map(([r]) => r) },
    { key: "window", label: "Within their window", rows: rows.filter((r) => w(r) === "wait" && r.expectedMs != null) },
    { key: "closed", label: "Closed", rows: rows.filter((r) => w(r) === "closed") },
  ].filter((g) => g.rows.length > 0);
}

/** the most urgent first inside Needs action: an offer, then a request you're late with, a request to answer, a nudge
 *  due, and last a query gone quiet (worth closing) */
export function tier172(r: QcRow, now: number): number {
  if (r.status === QueryStatus.OFFER) return 0;
  const w = whereItStands(r, now);
  if (w === "you" && r.court !== "agent") return r.expectedMs != null && r.expectedMs < now ? 1 : 2;
  if (w === "you") return 3;
  if (w !== "quiet" && r.expectedMs == null) return 3.5;
  return 4;
}

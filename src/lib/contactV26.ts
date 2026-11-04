/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/) — the address book, a simpler page. The pure half:
 *
 *   Part A   the header's sentence figures and the List health ring's geometry and colours
 *   Part C/D the SECTIONS the list draws — one function, read by the index row AND the margin, so the index always
 *            names exactly the sections the list is drawing, in the same order
 *   Part E   the four quick picks (the shared `QUICK_PICKS` plus Missing details), one at a time
 *
 * Nothing here is stored. Every figure is the page's own facts (`AgentFacts`) or Housekeeping's own model.
 */
import type { AgentFacts, ContactFilters, SortKey, StatusKey } from "./contactList";
import { QUICK_PICKS, STATUS_GROUP_ORDER, STATUS_LABEL, addedMs, surnameInitial } from "./contactList";
import { healthTone, RING_TONES } from "./contactV256";
import { SET_LABEL, SET_ORDER, type SetKey } from "./contactV24";

/* ══ Part A · the header ═════════════════════════════════════════════════════════════════════════════════════════ */

/** "{n} agents on file. You've queried {q}, and {y} are waiting on you." — over every agent, never the filtered view */
export interface HeaderFigures { n: number; q: number; y: number }
export function headerFigures(facts: readonly Pick<AgentFacts, "stand">[]): HeaderFigures {
  let q = 0, y = 0;
  for (const x of facts) {
    if (x.stand !== "none") q += 1;
    if (x.stand === "you") y += 1;
  }
  return { n: facts.length, q, y };
}

/** the ring: 124px, a 46-unit viewBox, stroke 4 — the arc is the score's share of the circle, from 12 o'clock */
export const RING26 = { px: 124, box: 46, stroke: 4 } as const;
export const RING26_R = (RING26.box - RING26.stroke) / 2;
export const RING26_C = 2 * Math.PI * RING26_R;
/** the arc's length in viewBox units for a score (clamped 0–100) */
export const ringArc = (pct: number): number => (Math.max(0, Math.min(100, pct)) / 100) * RING26_C;
/** v26's track is cream at .16 on the navy (v25.6's was .18); the arc is `healthTone`'s on-navy colour */
export const RING26_TRACK = "rgba(244, 238, 229, 0.16)";
export const ring26Colours = (pct: number): { arc: string; track: string } => ({ arc: RING_TONES[healthTone(pct)].navy.arc, track: RING26_TRACK });

/* ══ Part E · the quick picks ════════════════════════════════════════════════════════════════════════════════════ */

/** Missing details — Housekeeping's own gap rule for each agent (`AgentFacts.gaps`, `hasMissingDetails`), a pick over the
 *  same `ContactFilters.missing` field the v25.4 toggle wrote */
export type Pick26Key = "you" | "ready" | "wait" | "missing";
export interface Pick26 { key: Pick26Key; title: string; line: string; on: (f: ContactFilters) => boolean; set: (f: ContactFilters, on: boolean) => ContactFilters }
const shared = (k: "you" | "ready" | "wait"): Pick26 => { const p = QUICK_PICKS.find((q) => q.key === k)!; return { key: k, title: p.title, line: p.line, on: p.on, set: p.set }; };
export const MISSING_PICK: Pick26 = {
  key: "missing", title: "Missing details", line: "Agents with gaps in their profile",
  on: (f) => !!f.missing, set: (f, v) => ({ ...f, missing: v }),
};
/** the menu's four, in its order: three of the shared `QUICK_PICKS` (Open to submissions is the Submissions box, not a
 *  pick here), then Missing details */
export const PICKS26: readonly Pick26[] = [shared("you"), shared("ready"), shared("wait"), MISSING_PICK];
/** which pick is on (the first that reads on), or null */
export const pickOn = (f: ContactFilters): Pick26Key | null => PICKS26.find((p) => p.on(f))?.key ?? null;
/** radio, one at a time: the others are cleared, then this one is set — and a second click on the one that is on
 *  clears it */
export function applyPick(f: ContactFilters, k: Pick26Key): ContactFilters {
  const target = PICKS26.find((p) => p.key === k)!;
  if (target.on(f)) return target.set(f, false);
  let g = f;
  for (const p of PICKS26) if (p.key !== k && p.on(g)) g = p.set(g, false);
  return target.set(g, true);
}

/* ══ Part C/D · the sections the list draws ══════════════════════════════════════════════════════════════════════ */

export type Group26 = "letter" | "status" | "none";
export const GROUP26: readonly Group26[] = ["letter", "status", "none"];
/** the four sorts the page offers (the chip's menu and the two headings) */
export const SORTS26: readonly SortKey[] = ["surname", "added", "reply", "status"];

export type SectionKind = "letter" | "reply" | "month" | "stage" | "set" | "all";
export interface Section {
  key: string;
  kind: SectionKind;
  /** the index entry's words ("A", "6 wks", "Oct", "Partial requested", "Your move") */
  label: string;
  /** the margin's big value ("A", "6", "Oct", or null where the margin draws a glyph) */
  big: string | null;
  /** the margin's small second line ("weeks", "2026", the status name), or null */
  small: string | null;
  /** the section's year, for a month — the index draws a year marker before the first month of a year */
  year?: number;
  /** a stage section's status key, a set section's set */
  stage?: StatusKey;
  set?: SetKey;
  /** an empty letter (the A–Z index keeps all 26; the list draws none) */
  empty?: boolean;
  ids: string[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weeksOf = (x: AgentFacts): number | null =>
  (typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0 ? x.agent.responseTimeWeeks : null);

/** the reply-time bucket: 1–12 one each, then 12+, then not known */
export function replyBucket(w: number | null): { key: string; label: string; big: string; small: string } {
  if (w == null) return { key: "r:?", label: "? not known", big: "?", small: "not known" };
  if (w > 12) return { key: "r:12+", label: "12+ wks", big: "12+", small: "weeks" };
  const n = Math.max(1, Math.round(w));
  return { key: `r:${n}`, label: `${n} ${n === 1 ? "wk" : "wks"}`, big: String(n), small: n === 1 ? "week" : "weeks" };
}

/** which kind of section a list draws under a grouping and a sort */
export function sectionKind(group: Group26, sort: SortKey): SectionKind {
  if (group === "none") return "all";
  if (group === "status") return "set";
  if (sort === "reply") return "reply";
  if (sort === "added") return "month";
  if (sort === "status") return "stage";
  return "letter";
}

/**
 * THE ONE PARTITION of the already-sorted list: runs of consecutive rows sharing a section key, in the order the list
 * draws them (so a section's rows keep the chosen order, ties broken by surname — `sortFacts`). Under Letter sorted by
 * Surname the result holds all 26 letters, the empty ones marked, in the sort's direction; a surname starting with
 * anything else takes "#" (drawn, and indexed after Z). Grouped by Status it is the four sets in their fixed order.
 */
export function sections(sorted: readonly AgentFacts[], group: Group26, sort: SortKey, reversed = false): Section[] {
  const kind = sectionKind(group, sort);
  if (kind === "all") return [{ key: "all", kind, label: "", big: null, small: null, ids: sorted.map((x) => x.agent.id) }];
  if (kind === "set") {
    return SET_ORDER.map((k) => ({ key: `s:${k}`, kind, label: SET_LABEL[k], big: null, small: null, set: k, ids: sorted.filter((x) => x.stand === k).map((x) => x.agent.id) }))
      .filter((s) => s.ids.length > 0);
  }
  const runs: Section[] = [];
  const at = new Map<string, Section>();
  for (const x of sorted) {
    let s: Omit<Section, "ids">;
    if (kind === "letter") {
      const L0 = surnameInitial(x.agent);
      const L = /^[A-Z]$/.test(L0) ? L0 : "#";
      s = { key: `l:${L}`, kind, label: L, big: L, small: null };
    } else if (kind === "reply") {
      const b = replyBucket(weeksOf(x));
      s = { key: b.key, kind, label: b.label, big: b.big, small: b.small };
    } else if (kind === "month") {
      const t = addedMs(x.agent);
      if (t == null) s = { key: "m:?", kind, label: "? not known", big: "?", small: "no date" };
      else {
        const d = new Date(t);
        const y = d.getFullYear();
        s = { key: `m:${y}-${d.getMonth()}`, kind, label: MONTHS[d.getMonth()], big: MONTHS[d.getMonth()], small: String(y), year: y };
      }
    } else {
      const k = x.status14;
      s = { key: `t:${k}`, kind, label: STATUS_LABEL[k], big: null, small: STATUS_LABEL[k], stage: k };
    }
    const hit = at.get(s.key);
    if (hit) { hit.ids.push(x.agent.id); continue; }
    const sec: Section = { ...s, ids: [x.agent.id] };
    at.set(s.key, sec);
    runs.push(sec);
  }
  if (kind !== "letter") return runs;
  /* the full A–Z, equal widths, in the sort's direction; an empty letter is kept for the index and drawn by nobody */
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const letters = reversed ? [...AZ].reverse() : AZ;
  const full: Section[] = letters.map((L) => at.get(`l:${L}`) ?? { key: `l:${L}`, kind, label: L, big: L, small: null, empty: true, ids: [] });
  const other = at.get("l:#");
  return other ? (reversed ? [other, ...full] : [...full, other]) : full;
}

/** the sections the list actually draws (an empty letter is in the index only) */
export const drawnSections = (s: readonly Section[]): Section[] => s.filter((x) => !x.empty && x.ids.length > 0);

/** a stage's order, furthest on first — the Query status sort's own (`STATUS_GROUP_ORDER`) */
export const STAGE_ORDER: readonly StatusKey[] = STATUS_GROUP_ORDER;

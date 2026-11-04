/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §4.3 — THE LOGIC CHECKS, one pure definition read by the record form (§3) and Fix a mistake (§4.2).
 * They run on every change and decide what is disabled: a step option, a calendar day, the Save button.
 *
 *   1. exactly one Query sent, and it is the earliest step
 *   2. stage order: partial requested < partial sent < full requested < full sent < offer
 *   3. a send needs its request first
 *   4. no duplicate stage steps
 *   5. nothing after a close (passed, no response, withdrawn)
 *   6. no nudge while it is your move
 *   7. no "closed: no response" while it is your move
 *   8. no pass while a request to you is open, unless after an offer
 *   9. no dates in the future
 *
 * ⚠️ THE WORDS ARE THE MOCK'S, which name the step and the date that conflict (query-centre-v152.html `validate`).
 * ⚠️ `deriveQueryFields` STAYS THE ONE DERIVATION OF STATUS. These checks only say whether a log is in order; they never
 *    decide where a query stands.
 */
import { MONTHS_SHORT } from "./dates";

export type StepType = "queried" | "preq" | "psent" | "freq" | "fsent" | "offer" | "nudge" | "passed" | "noresp" | "withdrawn";
export interface LogStep { id: string; t: StepType; d: number }

const DAY = 86_400_000;
const fd = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
export const STEP_LABEL: Record<StepType, string> = {
  queried: "Query sent", preq: "Partial requested", psent: "Partial sent", freq: "Full requested", fsent: "Full sent",
  offer: "Offer", nudge: "You nudged", passed: "Passed", noresp: "Closed: no response", withdrawn: "Withdrawn",
};
const RANK: Partial<Record<StepType, number>> = { preq: 1, psent: 2, freq: 3, fsent: 4, offer: 5 };
const NEEDS: Partial<Record<StepType, StepType>> = { psent: "preq", fsent: "freq" };
/** whose move the step leaves it: the agent's (a), yours (y) or closed (k) */
const SIDE: Record<StepType, "a" | "y" | "k" | null> = {
  queried: "a", preq: "y", psent: "a", freq: "y", fsent: "a", offer: "y", nudge: null, passed: "k", noresp: "k", withdrawn: "k",
};
const CLOSES = new Set<StepType>(["passed", "noresp", "withdrawn"]);
const lab = (t: StepType, first: string) => (t === "nudge" ? `You nudged ${first}` : STEP_LABEL[t]);

export interface Verdict { err: Map<string, string>; glob: string[]; ok: boolean }

export function validate(steps: readonly LogStep[], c: { nowMs: number; first: string }): Verdict {
  const err = new Map<string, string>(), glob: string[] = [];
  const S = [...steps].sort((a, b) => a.d - b.d || (RANK[a.t] ?? 0) - (RANK[b.t] ?? 0));
  const put = (e: LogStep, m: string) => { if (!err.has(e.id)) err.set(e.id, m); };
  /* 1 */
  const qs = S.filter((e) => e.t === "queried");
  if (!qs.length) glob.push("Every query needs a “Query sent” step.");
  qs.slice(1).forEach((e) => put(e, "There’s already a Query sent step."));
  const q0 = qs[0];
  if (q0) S.forEach((e) => { if (e !== q0 && e.d < q0.d) put(e, `This is before the query was sent (${fd(q0.d)}).`); });
  const seen: Partial<Record<StepType, LogStep>> = {};
  let top: LogStep | null = null, closed: LogStep | null = null;
  for (const e of S) {
    if (e.t === "queried" || err.has(e.id)) continue;
    /* 5 */
    if (closed) { put(e, `The query closed on ${fd(closed.d)}. Nothing can come after that.`); continue; }
    const side = top ? SIDE[top.t] : "a";
    if (CLOSES.has(e.t)) {
      /* 7 */
      if (e.t === "noresp" && side !== "a") { put(e, `You can only close for no reply while it’s with the agent. After “${STEP_LABEL[top!.t]}” it’s your move.`); continue; }
      /* 8 */
      if (e.t === "passed" && side === "y" && top!.t !== "offer") { put(e, `After “${STEP_LABEL[top!.t]}” the next step is yours, not a pass. Check the order.`); continue; }
      closed = e; continue;
    }
    /* 6 */
    if (e.t === "nudge") { if (side === "y") put(e, `You nudge an agent while you’re waiting on them. After “${STEP_LABEL[top!.t]}” it’s your move.`); continue; }
    /* 4 */
    if (seen[e.t]) { put(e, `${STEP_LABEL[e.t]} is already on the timeline (${fd(seen[e.t]!.d)}).`); continue; }
    /* 3 */
    const need = NEEDS[e.t];
    if (need && !seen[need]) { put(e, `You can’t send the ${e.t === "psent" ? "partial" : "full"} before it was requested.`); continue; }
    /* 2 */
    if (top && (RANK[e.t] ?? 0) < (RANK[top.t] ?? 0)) { put(e, `This can’t come after “${STEP_LABEL[top.t]}” (${fd(top.d)}). Check the date or the step.`); continue; }
    seen[e.t] = e; top = e;
  }
  /* 9 */
  const endOfToday = new Date(c.nowMs); endOfToday.setHours(23, 59, 59, 999);
  S.forEach((e) => { if (e.d > endOfToday.getTime()) put(e, "This date is in the future."); });
  void lab; void DAY;
  return { err, glob, ok: !err.size && !glob.length };
}

/**
 * Would changing the log from `base` to `next` break it, and how — said about step `id` (the one being changed or
 * added). Empty when it fits. The reason names the step it would knock out of order.
 */
export function knock(base: readonly LogStep[], next: readonly LogStep[], id: string, c: { nowMs: number; first: string }): string {
  const a = validate(base, c), b = validate(next, c);
  const mine = b.err.get(id);
  if (mine) return mine;
  for (const [k] of b.err) {
    if (k !== id && !a.err.has(k)) {
      const o = next.find((e) => e.id === k)!, me = next.find((e) => e.id === id);
      if (me && me.t === o.t && o.t !== "nudge") return `There’s already a “${lab(o.t, c.first)}” step (${fd(o.d)}).`;
      return `That would put “${lab(o.t, c.first)}” (${fd(o.d)}) out of order.`;
    }
  }
  if (b.glob.length > a.glob.length) return b.glob[0];
  return "";
}

/** the steps that would break if `id` were removed, in the order they fall (the remove warning, §4.3) */
export function dependents(steps: readonly LogStep[], id: string, c: { nowMs: number; first: string }): LogStep[] {
  let rest = steps.filter((e) => e.id !== id);
  let out: LogStep[] = [];
  for (let k = 0; k < 12; k++) {
    const v = validate(rest, c);
    if (v.ok) break;
    const bad = rest.filter((e) => v.err.has(e.id));
    if (!bad.length) break;
    out = out.concat(bad);
    rest = rest.filter((e) => !v.err.has(e.id));
  }
  return out;
}

/** a day for the calendar: is it greyed, and why (future, before the floor, or out of order) */
export function dayBlocked(dayMs: number, c: { nowMs: number; floorMs?: number | null; check?: (ms: number) => string }): string {
  const end = new Date(c.nowMs); end.setHours(23, 59, 59, 999);
  if (dayMs > end.getTime()) return "In the future";
  if (c.floorMs != null && dayMs < new Date(new Date(c.floorMs).setHours(0, 0, 0, 0)).getTime()) return `Before the latest step (${fd(c.floorMs)})`;
  return c.check ? c.check(dayMs) : "";
}

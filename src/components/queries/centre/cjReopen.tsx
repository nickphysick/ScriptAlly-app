/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 5 — REOPEN (design-refs/card-journeys-v1 screens 30–37). Agent · Why · Nudge · Log.
 *   "I closed it too soon"       → the close comes off: the query goes back to where it stood, as it was
 *   "{First} replied after all"  → a reply: Record a response takes over in the same panel, at "What did {First} say?"
 *
 * ⚠️ THE SAVE IS THE CARD'S OWN "TAKE IT OFF" (lib/qc1522Write `planUnpass` = lib/qc152Write `planFix` removing the
 *    closing step from the query's log and its feed twin, the reply clock restarting today), plus the new nudge date.
 *    Nothing new goes on the thread; recompute derives the status the log is left with.
 * ⚠️ The closing step is found in the AUTHORITATIVE log the save reads (`pc.existing`): any close, whoever made it (a
 *    pass, no reply, a withdrawal, a declined offer). The card composer's "recorded by mistake" handled only a pass.
 */
import React from "react";
import { QueryStatus, type Query } from "../../../types";
import { planUnpass } from "../../../lib/qc1522Write";
import { byEventOrder, getActivityTime } from "../../../lib/queryDerivation";
import { liveCount } from "../../../lib/dashBreakdown";
import { CLOSED_STATUSES } from "../../../lib/qc151";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { dayIso } from "../../../lib/queryActions/dates";
import { addDaysMs, dm, plural, w3dm } from "../../../lib/queryActions/respondStages";
import type { RawActivityDoc } from "../../../lib/recomputeFields";
import type { CJCount, CJCtx, CJSpec } from "./QcCardJourney";
import { MINUS } from "./cjClose";

export interface ReopenState { why: "soon" | null; wk: number; none: boolean; nudgeOk: boolean }

const anyMs = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toMillis" in (v as object) ? (v as { toMillis: () => number }).toMillis() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
const isClose = (st: unknown) => CLOSED_STATUSES.includes(st as QueryStatus);
const rs = (x: unknown) => String((x as { resultingStatus?: string })?.resultingStatus ?? "");

/** the close on the feed (for the words), and the status the query stood at before it */
export function closeOf(c: CJCtx): { ms: number; reason: string; before: QueryStatus | null } {
  const log = c.log;
  let i = -1;
  for (let k = log.length - 1; k >= 0; k--) if (isClose(rs(log[k]))) { i = k; break; }
  const row = i >= 0 ? log[i] as unknown as Record<string, unknown> : null;
  const st = row ? rs(row) : String(c.q.status);
  const key = String(row?.eventKey ?? ""), token = String((c.q as { closingReason?: string }).closingReason ?? "");
  const reason = st === QueryStatus.REJECTED ? `${c.first} passed`
    : st === QueryStatus.NO_RESPONSE ? "no reply"
    : key === "offer_declined" || token === "offer_declined" ? "you turned the offer down"
    : key === "withdrawn_on_offer" || token === "accepted_offer" ? "withdrawn when you accepted an offer"
    : "you withdrew it";
  let before: QueryStatus | null = null;
  for (let k = i - 1; k >= 0; k--) { const b = rs(log[k]); if (b && !isClose(b)) { before = b as QueryStatus; break; } }
  return { ms: anyMs(row?.date) ?? c.nowMs, reason, before: before ?? QueryStatus.QUERIED };
}
/** the closing step in the query's own log (the save's), the latest by the app's one event order */
export function closingStepId(existing: readonly RawActivityDoc[]): string | null {
  /* the app's one event order (lib/queryDerivation `byEventOrder`): time, then id, then original index */
  const ordered = existing.map((x, i) => ({ x, time: getActivityTime(x.data.createdAt), id: x.id, i })).sort(byEventOrder);
  for (let k = ordered.length - 1; k >= 0; k--) if (isClose(ordered[k].x.data.resultingStatus ?? ordered[k].x.data.type)) return ordered[k].id;
  return null;
}
const nudgeAt = (s: ReopenState, c: CJCtx): number | null => (s.none ? null : addDaysMs(c.nowMs, s.wk * 7));

function reopenCounts(c: CJCtx, after: Query): CJCount[] {
  const was = c.book_queries;
  const now = was.map((x) => (x.id === after.id ? after : x));
  const closed = (l: readonly Query[]) => l.filter((x) => CLOSED_STATUSES.includes(x.status)).length;
  return [
    { k: "active", n: liveCount(now), d: liveCount(now) - liveCount(was), label: "active queries" },
    { k: "closed", n: closed(now), d: closed(now) - closed(was), label: "closed" },
  ];
}

export const REOPEN_SPEC: CJSpec<ReopenState> = {
  kind: "reopen",
  init: () => ({ why: null, wk: 4, none: false, nudgeOk: false }),
  stages: () => ["agent", "why", "nudge", "log"],
  done: (s, k) => (k === "why" ? s.why != null : k === "nudge" ? s.nudgeOk : false),
  value: (s, k) => (k === "why" ? (s.why ? "Too soon" : "") : k === "nudge" ? (s.none ? "No reminder" : plural(s.wk, "week")) : ""),
  head: () => ["Opening this one back up.", "Let’s log the details."],
  tone: (s, c) => (s.why ? closeOf(c).before : c.q.status),
  body: (k, api) => {
    const { s, c, parts, set, answer } = api;
    const f = c.first;
    if (k === "why") {
      const cl = closeOf(c);
      return (
        <>
          <h2 className="laq-qh" data-cj="q">Why reopen it?</h2>
          <p className="laq-qs" data-cj="sub">Closed {dm(cl.ms)}: {cl.reason}.</p>
          <div className="laq-big" data-cj="why-rows">
            {parts.big({ k: "soon", data: "why", glyph: MINUS, title: "I closed it too soon", sub: `It goes back to ${(STAGE_NAME[cl.before as QueryStatus] ?? cl.before ?? "where it was").toLowerCase()}, as it was.`, on: s.why === "soon", onClick: () => answer({ why: "soon" }) })}
            {parts.big({ k: "replied", data: "why", glyph: MINUS, title: `${f} replied after all`, sub: "That’s a reply, so it’s recorded as one.", on: false, onClick: () => api.handOver(null) })}
          </div>
        </>
      );
    }
    if (k === "nudge") {
      const at = nudgeAt(s, c);
      return (
        <>
          <h2 className="laq-qh" data-cj="q">How long will you give {f}?</h2>
          <p className="laq-qs" data-cj="sub">The old reply date has passed, so set a new reminder.</p>
          {parts.slider({ k: "give", label: "Give it another", value: s.wk, none: s.none, noneLabel: "No reminder",
            onChange: (n) => set({ wk: n, none: false }), onNone: () => set({ none: !s.none }),
            note: at == null ? "There’s no reminder set." : <>We’ll remind you to nudge on <b>{w3dm(at)}</b>.</> })}
        </>
      );
    }
    return null;
  },
  carry: (k, api) => (k === "nudge" ? { ok: true, run: () => api.answer({ nudgeOk: true }) } : null),
  check: {
    title: () => "Ready to reopen it?",
    button: "Reopen query",
    extras: (api) => { const at = nudgeAt(api.s, api.c); return at != null ? api.parts.todo(`Nudge ${api.c.first} if there’s no reply`, w3dm(at), "nudge") : null; },
  },
  finish: (s, c, counts) => {
    const n = counts.find((x) => x.k === "active")?.n ?? 0, at = nudgeAt(s, c);
    return {
      head: ["Reopened.", `${n} ${n === 1 ? "query is" : "queries are"} out.`], slot: "the mentor · reopened", big: `${c.first}’s query is open again.`,
      line: at != null ? ["We’ll remind you to nudge on ", w3dm(at), "."] : ["There’s no reminder set.", null, ""], stamp: "Reopened", stampMs: c.nowMs,
    };
  },
  write: {
    plans: (pc, s, c) => {
      const id = closingStepId(pc.existing);
      if (!id) throw new Error("No close to take off");
      const plan = planUnpass(pc, id);
      const at = nudgeAt(s, c);
      plan.query.nudgeDate = at != null ? dayIso(new Date(at)) : undefined;
      return [plan];
    },
    counts: (c, after) => reopenCounts(c, after),
  },
};

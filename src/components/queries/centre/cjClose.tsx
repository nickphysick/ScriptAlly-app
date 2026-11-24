/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 3 — CLOSE (design-refs/card-journeys-v1 screens 12–20). Agent · Why · (When) · Log.
 *   "No reply"       → closes as of today, straight to the review (no When step)
 *   "I withdrew it"  → "When did you withdraw it?", and the track gains a When step
 *   "{First} passed" → a reply: Record a response takes over in the same panel, Passed chosen, at "When did {First} reply?"
 *
 * ⚠️ THE SAVE IS THE CARD'S OWN CLOSE (lib/qc152Write `planRecord` "noresp" / "withdrawn" token "withdrew"), and what
 *    `saveClose` takes off with it: the nudge reminder and the close plan.
 */
import React from "react";
import { QueryStatus, type Query } from "../../../types";
import { planRecord } from "../../../lib/qc152Write";
import { liveCount } from "../../../lib/dashBreakdown";
import { CLOSED_STATUSES } from "../../../lib/qc151";
import { dm, daysSince, plural, sod, whenWord } from "../../../lib/queryActions/respondStages";
import type { CJCount, CJCtx, CJSpec } from "./QcCardJourney";

export interface CloseState { why: "noreply" | "withdraw" | null; whenMs: number | null }

export const MINUS = <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M5.5 8h5" /></svg>;

const anyMs = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toMillis" in (v as object) ? (v as { toMillis: () => number }).toMillis() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
/** the day it was queried, and the latest dated step (nothing can be closed before it) */
export const queriedMs = (c: CJCtx): number => anyMs(c.q.dateSent) ?? anyMs(c.log[0]?.date) ?? c.nowMs;
export const lastStepMs = (c: CJCtx): number => Math.max(queriedMs(c), ...c.log.map((x) => anyMs(x.date) ?? 0));

/** active queries and closed ones, by the Dashboard's and the Queries page's own rules */
export function closeCounts(c: CJCtx, after: Query): CJCount[] {
  const was = c.book_queries;
  const now = was.map((x) => (x.id === after.id ? after : x));
  const closed = (l: readonly Query[]) => l.filter((x) => CLOSED_STATUSES.includes(x.status)).length;
  return [
    { k: "active", n: liveCount(now), d: liveCount(now) - liveCount(was), label: "active queries" },
    { k: "closed", n: closed(now), d: closed(now) - closed(was), label: "closed" },
  ];
}
export const stillOut = (n: number) => `${n} ${n === 1 ? "query" : "queries"} still out.`;

export const CLOSE_SPEC: CJSpec<CloseState> = {
  kind: "close",
  init: () => ({ why: null, whenMs: null }),
  stages: (s) => (s.why === "withdraw" ? ["agent", "why", "when", "log"] : ["agent", "why", "log"]),
  done: (s, k) => (k === "why" ? s.why != null : k === "when" ? s.whenMs != null : false),
  value: (s, k, c) => (k === "why" ? (s.why === "noreply" ? "No reply" : s.why === "withdraw" ? "Withdrawn" : "") : k === "when" && s.whenMs != null ? whenWord(s.whenMs, c.nowMs) : ""),
  head: () => ["Closing this one.", "Let’s log the details."],
  tone: (s, c) => (s.why === "noreply" ? QueryStatus.NO_RESPONSE : s.why === "withdraw" ? QueryStatus.WITHDRAWN : c.q.status),
  body: (k, api) => {
    const { s, c, parts, answer } = api;
    const f = c.first;
    if (k === "why") {
      const qm = queriedMs(c);
      return (
        <>
          <h2 className="laq-qh" data-cj="q">Why are you closing it?</h2>
          <p className="laq-qs" data-cj="sub">Queried {dm(qm)}, {plural(daysSince(qm, c.nowMs), "day")} ago.</p>
          <div className="laq-big" data-cj="why-rows">
            {parts.big({ k: "noreply", data: "why", glyph: MINUS, title: "No reply", sub: `${f} hasn’t answered.`, on: s.why === "noreply", onClick: () => answer({ why: "noreply", whenMs: sod(c.nowMs) }) })}
            {parts.big({ k: "withdraw", data: "why", glyph: MINUS, title: "I withdrew it", sub: `You’ve told ${f} you’re pulling it.`, on: s.why === "withdraw", onClick: () => answer({ why: "withdraw", whenMs: s.why === "withdraw" ? s.whenMs : null }) })}
            {parts.big({ k: "passed", data: "why", glyph: MINUS, title: `${f} passed`, sub: "That’s a reply, so it’s recorded as one.", on: false, onClick: () => api.handOver("passed") })}
          </div>
        </>
      );
    }
    if (k === "when") return (
      <>
        <h2 className="laq-qh" data-cj="q">When did you withdraw it?</h2>
        {parts.dates({ data: "when", cur: s.whenMs, minMs: lastStepMs(c), onPick: (ms) => answer({ whenMs: ms }) })}
      </>
    );
    return null;
  },
  check: {
    title: () => "Ready to close it?",
    button: "Close query",
    extras: (api) => <p className="cj-line" data-cj="nudge-off">Any reminder to nudge {api.c.first} comes off your to-do list.</p>,
  },
  finish: (s, c, counts) => {
    const left = counts.find((x) => x.k === "active")?.n ?? 0;
    return {
      head: ["Closed.", stillOut(left)], slot: s.why === "noreply" ? "the mentor · no reply" : "the mentor · withdrawn", big: `${c.first}’s query is closed.`,
      line: [s.why === "noreply" ? "It’s marked as no reply. A reply later reopens it." : "It’s marked as withdrawn.", null, ""], stamp: "Closed", stampMs: s.whenMs ?? c.nowMs,
    };
  },
  write: {
    plans: (pc, s) => {
      const day = s.whenMs ?? pc.nowMs;
      const plan = s.why === "withdraw"
        ? planRecord(pc, "withdrawn", day, [], { withdraw: { token: "withdrew", event: "withdrawn" } })
        : planRecord(pc, "noresp", day, []);
      /* what saveClose takes off with a close: the nudge reminder and the close plan */
      if (pc.q.nudgeDate) plan.query.nudgeDate = undefined;
      if (pc.q.closePlan) plan.query.closePlan = undefined;
      return [plan];
    },
    counts: (c, after) => closeCounts(c, after),
  },
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 4 — ANSWER AN OFFER (design-refs/card-journeys-v1 screens 21–29). Agent · Answer · When ·
 * (Others) · Log. "Let the other agents know?" is asked only after "I accepted", and only when other queries are open;
 * it is never forced, and QueryHawk drafts nothing.
 *
 * ⚠️ THE SAVE IS THE CARD'S OWN ANSWER: accepted → lib/qc1522Write `planSigned` (the Signed step, recomputed; with the
 *    task, the existing "tell the others" marks on every other open query: `offerRefQueryId` + `offerTold: false`, and the
 *    offer step's to-do flag). Turned down → lib/qc152Write `planRecord` "withdrawn" with the token `offer_declined`.
 *    The card then reads the app's own words for each: "Signed", or "Withdrawn" / "You declined".
 */
import React from "react";
import { QueryStatus, type Query } from "../../../types";
import { planRecord } from "../../../lib/qc152Write";
import { planSigned } from "../../../lib/qc1522Write";
import { liveCount } from "../../../lib/dashBreakdown";
import { CLOSED_STATUSES } from "../../../lib/qc151";
import { dm, plural, whenWord } from "../../../lib/queryActions/respondStages";
import type { CJCount, CJCtx, CJSpec } from "./QcCardJourney";
import { MINUS } from "./cjClose";

export interface OfferState { ans: "yes" | "no" | null; whenMs: number | null; others: "task" | "no" | null }

const anyMs = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toMillis" in (v as object) ? (v as { toMillis: () => number }).toMillis() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
/** the day the offer was made: its step on the feed, else the query's own offer date */
export const offerMs = (c: CJCtx): number =>
  anyMs([...c.log].reverse().find((x) => (x as { resultingStatus?: string }).resultingStatus === QueryStatus.OFFER)?.date)
  ?? anyMs((c.q as { offerDate?: unknown }).offerDate) ?? c.nowMs;

const STAR = <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><path d="M8 2.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z" /></svg>;
const TASK = <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M5.3 8.2l1.9 1.9 3.6-4" /></svg>;
const tellTask = (n: number) => `Tell the other ${plural(n, "agent")} you’ve signed`;
const asksOthers = (s: OfferState, c: CJCtx) => s.ans === "yes" && c.othersN > 0;

function offerCounts(c: CJCtx, after: Query, s: OfferState): CJCount[] {
  const was = c.book_queries;
  const now = was.map((x) => (x.id === after.id ? after : x));
  const signed = (l: readonly Query[]) => l.filter((x) => x.status === QueryStatus.SIGNED).length;
  const closed = (l: readonly Query[]) => l.filter((x) => CLOSED_STATUSES.includes(x.status)).length;
  const active: CJCount = { k: "active", n: liveCount(now), d: liveCount(now) - liveCount(was), label: "active queries" };
  return s.ans === "yes"
    ? [{ k: "signed", n: signed(now), d: signed(now) - signed(was), label: signed(now) === 1 ? "offer accepted" : "offers accepted" }, active]
    : [active, { k: "closed", n: closed(now), d: closed(now) - closed(was), label: "closed" }];
}

export const OFFER_SPEC: CJSpec<OfferState> = {
  kind: "offer",
  init: () => ({ ans: null, whenMs: null, others: null }),
  stages: (s, c) => (asksOthers(s, c) ? ["agent", "answer", "when", "others", "log"] : ["agent", "answer", "when", "log"]),
  done: (s, k) => (k === "answer" ? s.ans != null : k === "when" ? s.whenMs != null : k === "others" ? s.others != null : false),
  value: (s, k, c) => (k === "answer" ? (s.ans === "yes" ? "Accepted" : s.ans === "no" ? "Turned down" : "")
    : k === "when" ? (s.whenMs != null ? whenWord(s.whenMs, c.nowMs) : "") : k === "others" ? (s.others === "task" ? "Task" : s.others === "no" ? "Not now" : "") : ""),
  head: (_s, c) => [`An answer for ${c.first}.`, "Let’s log the details."],
  tone: (s, c) => (s.ans === "yes" ? QueryStatus.SIGNED : s.ans === "no" ? QueryStatus.WITHDRAWN : c.q.status),
  body: (k, api) => {
    const { s, c, parts, answer } = api;
    const f = c.first;
    if (k === "answer") return (
      <>
        <h2 className="laq-qh" data-cj="q">What did you tell {f}?</h2>
        <p className="laq-qs" data-cj="sub">{f} offered on {dm(offerMs(c))}.</p>
        <div className="laq-big" data-cj="answer-rows">
          {parts.big({ k: "yes", data: "answer", glyph: STAR, title: "I accepted", sub: `You’re signing with ${f}.`, on: s.ans === "yes", onClick: () => answer({ ans: "yes", others: s.ans === "yes" ? s.others : null }) })}
          {parts.big({ k: "no", data: "answer", glyph: MINUS, title: "I turned it down", sub: "It closes the query.", on: s.ans === "no", onClick: () => answer({ ans: "no", others: null }) })}
        </div>
      </>
    );
    if (k === "when") return (
      <>
        <h2 className="laq-qh" data-cj="q">When did you tell {f}?</h2>
        {parts.dates({ data: "when", cur: s.whenMs, minMs: offerMs(c), onPick: (ms) => answer({ whenMs: ms }) })}
      </>
    );
    if (k === "others") {
      const n = c.othersN;
      return (
        <>
          <h2 className="laq-qh" data-cj="q">Let the other agents know?</h2>
          <p className="laq-qs" data-cj="sub">{n} of your queries {n === 1 ? "is" : "are"} still with other agents.</p>
          <div className="laq-big" data-cj="others-rows">
            {parts.big({ k: "task", data: "others", glyph: TASK, title: "Put it on my to-do list", sub: `One task, with all ${plural(n, "agent")} listed.`, on: s.others === "task", onClick: () => answer({ others: "task" }) })}
            {parts.big({ k: "no", data: "others", glyph: MINUS, title: "Not now", sub: "Nothing goes on your to-do list.", on: s.others === "no", onClick: () => answer({ others: "no" }) })}
          </div>
        </>
      );
    }
    return null;
  },
  check: {
    title: () => "Ready to log your answer?",
    button: "Log answer",
    extras: (api) => (asksOthers(api.s, api.c) && api.s.others === "task" ? api.parts.todo(tellTask(api.c.othersN), "Today", "tell") : null),
  },
  finish: (s, c, counts) => {
    const n = c.othersN;
    if (s.ans === "yes") {
      const line: [string, string | null, string] = asksOthers(s, c) && s.others === "task" ? [`Telling the other ${plural(n, "agent")} is on your to-do list for `, "today", "."]
        : n > 0 ? [`Your other ${n} ${n === 1 ? "query is" : "queries are"} still open.`, null, ""] : ["", null, ""];
      return { head: ["Logged. You said yes!", "Congratulations."], slot: "celebration · signed", big: `You’re signing with ${c.first}.`, line, stamp: "Signed", stampMs: s.whenMs ?? c.nowMs };
    }
    const left = counts.find((x) => x.k === "active")?.n ?? 0;
    const q = left === 1 ? "query" : "queries";
    return {
      head: ["Logged.", `${left} ${q} still out.`], slot: "the mentor · offer declined", big: `You turned ${c.first}’s offer down.`,
      line: [`The query is closed. ${left} ${q} ${left === 1 ? "is" : "are"} still with agents.`, null, ""], stamp: "Logged", stampMs: s.whenMs ?? c.nowMs,
    };
  },
  write: {
    plans: (pc, s, c) => {
      const day = s.whenMs ?? pc.nowMs;
      if (s.ans === "yes") return [planSigned({ ...pc, nowMs: day }, asksOthers(s, c) && s.others === "task", c.otherIds ?? [])];
      return [planRecord(pc, "withdrawn", day, [], { withdraw: { token: "offer_declined", event: "offer_declined" } })];
    },
    extraIds: (s, c) => (asksOthers(s, c) && s.others === "task" ? [...(c.otherIds ?? [])] : []),
    counts: (c, after, s) => offerCounts(c, after, s),
  },
};

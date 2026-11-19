/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — the next-step box's model (`nextStep`). Agent card v2 retired the
 * box itself; its successor, the footer (lib/agentCardV2 `acFoot`), takes the box's journeys from here, so a footer button
 * opens what the box's button opened. The band's chip, the meta line, the four tiles and the materials chips are retired.
 */
import { QueryStatus } from "../types";
import type { AgentFacts } from "./contactList";
import type { CallBox } from "./contactV24";
import { STAGE_NAME } from "./qcSummary";
import { formatDate } from "./dates";

const stageOf = (x: Pick<AgentFacts, "q">): string => (x.q ? STAGE_NAME[x.q.status as QueryStatus] ?? String(x.q.status) : "");

/** the next-step box: one per card, its tone by who it's with; its words and verbs are the call box's where it has
 *  them (your move, not queried, hold off), and the list's facts otherwise */
export type StepTone = "you" | "agent" | "closed" | "none";
export interface NextStep {
  tone: StepTone;
  bold: string;
  sub: string;
  /** the stage whose glyph the disc holds; null: not queried (the dotted ring) */
  status: QueryStatus | null;
  /** the button, and what it starts; null: no button */
  button: { label: string; act: { kind: "journey"; mode: string; queryId: string } | { kind: "log" } | { kind: "open"; queryId: string } } | null;
}
const dm = (ms: number) => formatDate(ms, { day: "numeric", month: "short" });
export function nextStep(x: AgentFacts, first: string, call: CallBox | null, nowMs: number): NextStep {
  const q = x.q;
  if (x.stand === "you" && q && call?.kind === "you") {
    return { tone: "you", bold: call.bold, sub: call.sub, status: q.status as QueryStatus, button: { label: call.button, act: { kind: "journey", mode: call.door.mode, queryId: call.queryId } } };
  }
  if (x.stand === "you" && q) {
    return { tone: "you", bold: `${first} is waiting on you.`, sub: stageOf(x), status: q.status as QueryStatus, button: null };
  }
  if (x.stand === "agent" && q) {
    const sub = q.expectedMs != null ? (q.expectedMs < nowMs ? `${stageOf(x)} · expected by ${dm(q.expectedMs)}` : `${stageOf(x)} · expect a reply by ${dm(q.expectedMs)}`)
      : q.sentMs != null ? `${stageOf(x)} · sent ${dm(q.sentMs)}` : stageOf(x);
    return { tone: "agent", bold: `Waiting to hear from ${first}.`, sub: `${sub}.`, status: q.status as QueryStatus, button: { label: "Record a response", act: { kind: "journey", mode: "resp", queryId: q.id } } };
  }
  /* Card offers v1 — closed as no reply (the card's close offer, or anywhere): the mock's words, and a way to query again */
  if (x.stand === "closed" && q && q.status === QueryStatus.NO_RESPONSE) {
    return { tone: "closed", bold: "Closed · No response.", sub: q.sentMs != null ? `Your query from ${dm(q.sentMs)} is on your Wall of no. You can reopen it from History.` : "It’s on your Wall of no. You can reopen it from History.",
      status: q.status as QueryStatus, button: { label: "Query again", act: { kind: "log" } } };
  }
  if (x.stand === "closed" && q) {
    return { tone: "closed", bold: `${stageOf(x)}.`, sub: q.lastMs ? `Closed ${dm(q.lastMs)}.` : "This query is closed.", status: q.status as QueryStatus, button: { label: "See the query", act: { kind: "open", queryId: q.id } } };
  }
  /* not queried */
  if (call?.kind === "hold") return { tone: "none", bold: call.bold, sub: call.sub, status: null, button: null };
  if (x.door === "closed") {
    const t = typeof x.agent.reopensOn === "string" ? Date.parse(x.agent.reopensOn) : NaN;
    return { tone: "none", bold: "Closed to queries.", sub: Number.isFinite(t) ? `${first} reopens ${dm(t)}.` : `Check back before you query ${first}.`, status: null, button: null };
  }
  return { tone: "none", bold: call?.bold ?? `You haven’t queried ${first} yet.`, sub: call?.sub ?? "Check the wishlist before you send.", status: null, button: { label: "Log a query", act: { kind: "log" } } };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1 (design-refs/card-journeys-v1) — the pure half of the four journeys that replace the query card's
 * small forms on the desktop: Mark sent, Close, Answer an offer, Reopen. Each is a stepped journey in Record a response's
 * own panel and shell (queries/centre/QcCardJourney), opened through `openCardJourney` (lib/queryPanelStore).
 *
 * ⚠️ EACH JOURNEY SWITCHES ON BY ITSELF. `CARD_JOURNEY_LIVE` names the kinds whose journey has landed; a door asking for a
 *    kind that is not live keeps its old form. Reverting one journey's commit takes it out of this table and nothing else.
 * ⚠️ NOTHING HERE WRITES. The plans are the existing writers' (lib/qc152Write `planRecord`, lib/qc1522Write `planSigned`,
 *    `planUnpass`), committed by the host in one batch under one snapshot.
 */
import { openCardJourney, rightPanelOwner, setCardJourneyLive, cardJourneyHosted, type CardJourneyKind } from "../queryPanelStore";
import { setDrawerInterceptor, type OpenRequest } from "./drawerStore";

export const CARD_JOURNEY_LIVE: Record<CardJourneyKind, boolean> = {
  send: true,
  close: true,
  offer: true,
  reopen: true,
};
setCardJourneyLive((k) => CARD_JOURNEY_LIVE[k]);

/**
 * Card journeys v1, Phase 6 — ONE JOURNEY PER ACTION, EVERYWHERE. The drawer's doors for these actions are handed to the
 * journeys (lib/queryActions/drawerStore `setDrawerInterceptor`):
 *   "sent"  → Mark sent;  "close" → Close;  "offer" → Answer an offer, unless the door is a task that TELLS the others
 *   (opened at the offer's step 1 without `answer`): those keep the drawer's offer journey, whose tell list they need.
 * Only while a host listens and the kind is live; never for the practice query (Pip has none of these).
 * From the query's own side panel (a step into the panel) the card steps back behind the journey; a To-do desk's slot
 * or a floating drawer opens it over the page.
 */
export function drawerKindOf(r: OpenRequest): CardJourneyKind | null {
  if (r.mode === "sent") return "send";
  if (r.mode === "close") return "close";
  if (r.mode === "offer") return r.preset?.step === 1 && !r.preset?.answer ? null : "offer";
  return null;
}
setDrawerInterceptor({
  takes: (r) => { const k = drawerKindOf(r); return !!k && !!r.queryId && !r.queryId.startsWith("practice") && cardJourneyHosted(k); },
  open: (r) => {
    const k = drawerKindOf(r)!;
    openCardJourney({ queryId: r.queryId!, kind: k, fromCard: !!r.panel && !r.panel.slot && rightPanelOwner() === "query" });
  },
});

/** the steps of a card journey (Agent is always first and already answered) */
export type CJStage = "agent" | "went" | "sent" | "reply" | "why" | "when" | "answer" | "others" | "nudge" | "log";
export const CJ_LABEL: Record<CJStage, string> = {
  agent: "Agent", went: "What went", sent: "Sent", reply: "Reply time", why: "Why", when: "When", answer: "Answer", others: "Others", nudge: "Nudge", log: "Log",
};

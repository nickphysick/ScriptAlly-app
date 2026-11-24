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
import { setCardJourneyLive, type CardJourneyKind } from "../queryPanelStore";

export const CARD_JOURNEY_LIVE: Record<CardJourneyKind, boolean> = {
  send: false,
  close: false,
  offer: false,
  reopen: false,
};
setCardJourneyLive((k) => CARD_JOURNEY_LIVE[k]);

/** the steps of a card journey (Agent is always first and already answered) */
export type CJStage = "agent" | "went" | "sent" | "reply" | "why" | "when" | "answer" | "others" | "nudge" | "log";
export const CJ_LABEL: Record<CJStage, string> = {
  agent: "Agent", went: "What went", sent: "Sent", reply: "Reply time", why: "Why", when: "When", answer: "Answer", others: "Others", nudge: "Nudge", log: "Log",
};

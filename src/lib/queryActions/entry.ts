/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which journey each door opens (brief §F), as pure data — the Query Centre's row actions and the
 * query card's footer both read it, so the two cannot offer different verbs for one status.
 *
 * ⚠️ `DRAWER_LIVE` IS THE CUT-OVER, ONE JOURNEY AT A TIME (brief §I): "until a journey lands, its
 * old flow stays live". A door asks whether its journey is live and, if not, keeps its old route.
 * When every journey is live the flag and the old routes are deleted together.
 */
import { QueryStatus } from "../../types";
import type { DrawerMode } from "./drawerStore";
import { nudgePhase } from "../nudgeWindow";

export const DRAWER_LIVE: Record<DrawerMode, boolean> = {
  log: true,
  resp: true,
  sent: true,
  nudge: true,
  close: true,
  offer: true,
  edit: true,
};

const OWED: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);
const ENDED: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);

export interface Door { mode: DrawerMode; label: string; primary?: boolean }

/** The query card's footer, by status — the mock's table (MOCK-SPEC §3.4). */
export function cardDoors(status: QueryStatus | string): Door[] {
  if (ENDED.has(status)) return [{ mode: "resp", label: "Record a late reply", primary: true }];
  if (status === QueryStatus.SIGNED) return [];
  if (status === QueryStatus.OFFER) return [{ mode: "offer", label: "Offer: next steps", primary: true }];
  if (OWED.has(status)) return [
    { mode: "sent", label: "I've sent it", primary: true },
    { mode: "resp", label: "Record a response" },
    { mode: "close", label: "Close" },
  ];
  return [
    { mode: "resp", label: "Record a response", primary: true },
    { mode: "nudge", label: "Nudge" },
    { mode: "close", label: "Close query" },
  ];
}

/**
 * Query panel v1 §C — THE NEXT MOVE DECIDES THE PRIMARY. The panel's footer, by where the query stands:
 * the journeys are `cardDoors`'s own (nothing here opens anything new); what the panel adds is the wording
 * and one rule — a query with the agent for over a year with no reply leads with Close.
 *
 * ⚠️ A CLOSED QUERY'S DOOR IS STILL "Record a late reply". There is no reopen-without-a-reply journey: what
 *    reopens a query is the reply that arrived, and the response journey records it.
 */
/** v141.1 — a year with the agent: no longer what decides the lead (that is the nudge window); only the row's second
    line still says "NO REPLY · N YEARS" past it */
export const LONG_SILENCE_DAYS = 365;
/** what leads an agent-court query: Close once it has gone quiet, Nudge inside the nudge window, else a response */
export type AgentLead = "close" | "nudge" | null;
/**
 * @param lead  v141.1 — for a query with the agent: "close" past the nudge window (unless the writer pressed "Keep
 *              tracking"), "nudge" inside it, null otherwise. `leadDoors` works it out (lib/nudgeWindow).
 */
export function panelDoors(status: QueryStatus | string, lead: AgentLead = null): Door[] {
  if (ENDED.has(status)) return [{ mode: "resp", label: "Record a late reply", primary: true }];
  if (status === QueryStatus.SIGNED) return [];
  if (status === QueryStatus.OFFER) return [{ mode: "offer", label: "Record your answer", primary: true }, { mode: "close", label: "Close query" }];
  if (OWED.has(status)) return [
    { mode: "sent", label: status === QueryStatus.PARTIAL_REQUESTED ? "Mark partial sent" : status === QueryStatus.FULL_REQUESTED ? "Mark full sent" : "Mark revision sent", primary: true },
    { mode: "resp", label: "Record a response" },
    { mode: "close", label: "Close query" },
  ];
  if (lead === "close") return [
    { mode: "close", label: "Close query", primary: true },
    { mode: "resp", label: "Record a response" },
    { mode: "nudge", label: "Nudge" },
  ];
  if (lead === "nudge") return [
    { mode: "nudge", label: "Nudge", primary: true },
    { mode: "resp", label: "Record a response" },
    { mode: "close", label: "Close query" },
  ];
  return [
    { mode: "resp", label: "Record a response", primary: true },
    { mode: "nudge", label: "Nudge" },
    { mode: "close", label: "Close query" },
  ];
}

/**
 * ⚠️ ONE "NEXT MOVE" FOR EVERY ROW (ruling, 13 Oct). The panel's primary, the list tray's first button, the
 *    "Next move" column and the Birds-eye pill all read THIS, and nothing else: no board card overrides it.
 *
 *      a request the writer owes          → Mark partial / full / revision sent
 *      an offer                           → Record your answer
 *      with the agent, past the nudge window → Close query       (Record a response, once "Keep tracking" is set)
 *      with the agent, inside the nudge window → Nudge
 *    (v141.1 — the nudge window is lib/nudgeWindow, the rule the Next action grouping and the four sets read: the
 *    year-with-the-agent rule that decided Close before is retired as a lead)
 *      with the agent, otherwise          → Record a response
 *      closed                             → Record a late reply   (signed: nothing)
 *
 *    It reads four facts of the row: its status, whose court it is in, how long it has waited, whether its
 *    expected-reply date has gone — and the writer's "Keep tracking" (`closureOfferDismissed`). Record a response
 *    stays as a secondary door wherever it does not lead.
 */
export interface LeadRow {
  status: QueryStatus | string; court: string; dayN: number | null; pastExpected?: boolean; query?: object | null;
  /** v141.1 — the nudge window reads these (a QcRow carries both) */
  expectedMs?: number | null; stageStartMs?: number | null;
}
export const keptTracking = (row: LeadRow): boolean => (row.query as { closureOfferDismissed?: boolean } | null | undefined)?.closureOfferDismissed === true;
export const longSilence = (row: LeadRow): boolean => row.court === "agent" && row.dayN != null && row.dayN > LONG_SILENCE_DAYS;
/** The row's doors, the next move first. */
export function leadDoors(row: LeadRow, nowMs: number = Date.now()): Door[] {
  return panelDoors(row.status, agentLead(row, nowMs));
}
/** v141.1 — the nudge window decides the lead; "Keep tracking" stops Close leading (a response leads instead) */
export function agentLead(row: LeadRow, nowMs: number = Date.now()): AgentLead {
  if (row.court !== "agent") return null;
  const p = nudgePhase({ expectedMs: row.expectedMs ?? null, stageStartMs: row.stageStartMs ?? null }, nowMs);
  return p === "close" ? (keptTracking(row) ? null : "close") : p === "nudge" ? "nudge" : null;
}
/** The row's next move: the door that leads. Null only where there is none (a signed query). */
export function nextDoor(row: LeadRow, nowMs: number = Date.now()): Door | null {
  return leadDoors(row, nowMs).find((d) => d.primary) ?? null;
}
/**
 * The "Next move" column's words for each door — the column's own vocabulary, held beside the predicate so the
 * column, the tray's button and the panel's primary are one decision said three ways.
 */
export const NEXT_WORDS: Record<string, string> = {
  "Mark partial sent": "Send partial", "Mark full sent": "Send full", "Mark revision sent": "Send revision",
  "Record your answer": "Decide on offer", "Nudge": "Nudge", "Close query": "Consider closing", "Record a response": "Waiting",
};
export function nextWords(row: LeadRow, nowMs: number = Date.now()): string | null {
  const d = nextDoor(row, nowMs);
  return d ? NEXT_WORDS[d.label] ?? d.label : null;
}
/** The step's title in the query's panel, said for this query ("What did Eleanor say?"). */
export function panelStepWords(mode: DrawerMode, status: QueryStatus | string | undefined, first: string): { title: string } {
  const who = first || "the agent";
  void status;
  if (mode === "resp") return { title: `What did ${who} say?` };
  if (mode === "sent") return { title: `What went to ${who}?` };
  if (mode === "offer") return { title: `Your answer to ${who}` };
  if (mode === "nudge") return { title: `A nudge to ${who}` };
  if (mode === "close") return { title: `Close ${who}\u2019s query?` };
  if (mode === "edit") return { title: `Correct ${who}\u2019s record` };
  return { title: "Log a query" };
}

/** A Query Centre row's hover actions, by status (MOCK-SPEC §3.3). */
export function rowDoors(status: QueryStatus | string): Door[] {
  if (OWED.has(status)) return [{ mode: "sent", label: "✓ SENT IT" }];
  if (status === QueryStatus.OFFER) return [{ mode: "offer", label: "OFFER" }];
  if (status === QueryStatus.SIGNED) return [];
  if (ENDED.has(status)) return [{ mode: "resp", label: "LATE REPLY" }];
  return [{ mode: "resp", label: "✓ RESPONSE" }, { mode: "nudge", label: "NUDGE" }];
}

/** The card's primary — the first door, when its journey is live. */
export function primaryDoor(status: QueryStatus | string): Door | null {
  const d = cardDoors(status).find((x) => x.primary) ?? null;
  return d && DRAWER_LIVE[d.mode] ? d : null;
}

/**
 * K3 — which journey a query task opens, and at which step. The tick NEVER commits: it opens the
 * drawer here, and only the drawer writes. Returns null for a task whose journey is not yet live
 * in the drawer, so the caller keeps its old route (the one-journey-at-a-time cut-over).
 */
export interface TaskDoor { mode: DrawerMode; queryId: string; preset?: { nudgeTab?: "sent" | "plan"; closeWhy?: "noreply"; step?: number } }
export function drawerDoorForTask(
  taskType: string | undefined,
  queryId: string | undefined,
  /** resolves a query's offer reference — `offer_tell` hangs on the OTHER agent's query and opens
   *  the offering query's journey */
  offerRefOf?: (id: string) => string | undefined,
): TaskDoor | null {
  if (!taskType || !queryId) return null;
  if (taskType === "offer_tell") {
    const ref = offerRefOf?.(queryId);
    return ref && DRAWER_LIVE.offer ? { mode: "offer", queryId: ref, preset: { step: 1 } } : null;
  }
  const door: TaskDoor | null =
    taskType === "partial_requested" || taskType === "full_requested" || taskType === "revise_resubmit" ? { mode: "sent", queryId }
    : taskType === "nudge_overdue" ? { mode: "nudge", queryId, preset: { nudgeTab: "sent" } }
    : taskType === "no_response_close" ? { mode: "close", queryId, preset: { closeWhy: "noreply" } }
    : taskType === "offer_received" ? { mode: "offer", queryId, preset: { step: 1 } }
    : taskType === "offer_send_full" ? { mode: "sent", queryId }
    /* the "told" variant of D7 — no entry id: one step, "I've told …" */
    : taskType === "withdraw_tell" || taskType === "signed_tell" ? { mode: "edit", queryId }
    : null;
  return door && DRAWER_LIVE[door.mode] ? door : null;
}

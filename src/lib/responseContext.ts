/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE REFERENCE PANEL, FOR A REPLY (ref 83-record-response.html).
 *
 * ⚠️ IT ANSWERS A DIFFERENT QUESTION FROM CREATE'S PANEL, which is why this is a second derivation
 * rather than the same one re-rendered. Create's panel describes an agent you are ABOUT to query —
 * what they ask for, what they are seeking, whether they are open. None of that helps while you are
 * recording what came back. What helps is what you sent and when, what reply window that implied,
 * and what has passed between you before.
 *
 * ⚠️ AND IT IS PRESENT FROM THE FIRST FRAME. In create the agent is unknown until stage 2, so the
 * panel has nothing to describe; here it is known before the takeover opens, so an empty column on
 * arrival would be a frame around nothing.
 *
 * Pure, and it OMITS rather than blanks: a row with no value is not rendered, and a panel with no
 * rows is not rendered either. A labelled empty row states that we hold nothing, which is noise on
 * a surface whose whole job is to be glanceable.
 */
import type { Agent, Query } from "../types";
import { isTerminalStatus } from "./agentList";

export interface RefRow { label: string; text: string }

const asISO = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  const d = v as { toDate?: () => Date; seconds?: number };
  if (typeof d.toDate === "function") return d.toDate().toISOString().slice(0, 10);
  if (typeof d.seconds === "number") return new Date(d.seconds * 1000).toISOString().slice(0, 10);
  return "";
};

/**
 * ⚠️ AN UNPARSEABLE DATE IS OMITTED, NEVER PRINTED. `new Date(junk).toLocaleDateString()` is the
 * literal string "Invalid Date", and it has reached this app's screens before (fix pack 3 §2). A
 * row we cannot state truthfully does not appear.
 */
export const refDate = (v: unknown): string => {
  const iso = asISO(v);
  if (!iso) return "";
  const ms = Date.parse(`${iso}T00:00:00`);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** "What you sent, and when" — the send this reply is answering. */
export function sentRow(query: Query, manuscriptTitle?: string): RefRow | null {
  const when = refDate((query as { dateSent?: unknown }).dateSent);
  const title = manuscriptTitle?.trim();
  if (!when && !title) return null;
  const text = title && when ? `${title} · ${when}` : title || when;
  return { label: "What you sent", text };
}

/**
 * "Expected by" — the window the agent's own stated turnaround implied.
 *
 * ⚠️ OMITTED WHEN THEY STATE NOTHING, rather than filled with a house default. The panel reports
 * what is on file about THIS agent; a default presented here would read as their policy.
 */
export function windowRow(agent: Agent | null): RefRow | null {
  const weeks = agent?.responseTimeWeeks;
  if (!weeks || weeks <= 0) return null;
  return { label: "They said", text: `Around ${weeks} week${weeks === 1 ? "" : "s"} to reply` };
}

/**
 * "Your history" — everything else you have sent this agent, and how it went.
 *
 * ⚠️ COUNTED OFF `isTerminalStatus`, the app's existing split, so this cannot disagree with the
 * agent list about what "concluded" means. OFFER counts as ACTIVE, per the standing rule: a live
 * offer is the most open a conversation gets.
 */
export function historyRow(agent: Agent | null, queries: Query[], excludeQueryId?: string): RefRow | null {
  if (!agent) return null;
  const mine = queries.filter((q) => q.agentId === agent.id && q.id !== excludeQueryId);
  if (mine.length === 0) return null;
  const closed = mine.filter((q) => isTerminalStatus(q.status)).length;
  const live = mine.length - closed;
  const parts: string[] = [];
  if (live > 0) parts.push(`${live} still open`);
  if (closed > 0) parts.push(`${closed} concluded`);
  return {
    label: "Your history",
    text: `${mine.length} other quer${mine.length === 1 ? "y" : "ies"} — ${parts.join(", ")}`,
  };
}

/** The whole panel. Empty array → the caller renders nothing at all. */
export function responseRefRows(
  query: Query,
  agent: Agent | null,
  queries: Query[],
  manuscriptTitle?: string,
): RefRow[] {
  return [sentRow(query, manuscriptTitle), windowRow(agent), historyRow(agent, queries, query.id)]
    .filter((r): r is RefRow => r !== null);
}

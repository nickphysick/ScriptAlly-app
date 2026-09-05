/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * nudgeDraft — the ONE follow-up-nudge draft generator. A copyable starting point the writer pastes
 * into their OWN email client; ScriptAlly never sends anything. Extracted from NudgeModal so the
 * modal and the focus flow share one text (no duplication). Deliberately brief + warm + UK-voiced;
 * built ONLY from what we actually know — the base case (agent name + send date) is byte-identical
 * to the original; the optional manuscript title / requested-material facts, when present, make the
 * letter concrete ("I queried you … regarding THE BOOK OF …, and you kindly requested the full…").
 * Pure + unit-tested.
 */
import { QueryStatus } from "../types";

/** What the agent asked for, in prose, for the draft's "you kindly requested…" clause.
 *  Moved here from FocusFlow (respond-nudge §4) so the desk and the To-do walkthrough share
 *  the ONE mapping — a second copy is how the two letters come to disagree about a request. */
export function requestedProse(status?: QueryStatus): string | undefined {
  if (status === QueryStatus.FULL_SENT || status === QueryStatus.FULL_REQUESTED) return "the full manuscript";
  if (status === QueryStatus.PARTIAL_SENT || status === QueryStatus.PARTIAL_REQUESTED) return "the partial";
  return undefined;
}

export interface NudgeDraftInput {
  agentName?: string | null;
  dateSent?: string; // ISO
  /** The manuscript's title — woven in as "regarding {TITLE}" when known. */
  msTitle?: string;
  /** What the agent asked for, in prose ("the full manuscript" / "the partial"), when they did. */
  requested?: string;
  /** When they asked for it (ISO) — "on 29 March" when known. */
  requestedDate?: string;
}

const longDate = (iso: string): string => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export function nudgeDraft(inp: NudgeDraftInput): string {
  const firstName = inp.agentName ? inp.agentName.split(" ")[0] : null;
  const sentPhrase = inp.dateSent ? `, sent on ${longDate(inp.dateSent)}` : "";
  const about = inp.msTitle ? ` regarding ${inp.msTitle.toUpperCase()}` : "";

  // When we know they requested materials, the letter says so — concrete beats generic.
  const body = inp.requested
    ? `I hope this finds you well. I'm writing to gently follow up on my query${about}${sentPhrase}. You kindly requested ${inp.requested}${inp.requestedDate && longDate(inp.requestedDate) ? ` on ${longDate(inp.requestedDate)}` : ""}, and I wondered whether you'd had a chance to consider it — I'd be glad to resend the materials if helpful.`
    : `I hope this finds you well. I'm writing to gently follow up on my query${about}${sentPhrase}. I remain very enthusiastic about the possibility of working together, and would be grateful for any update when you have a moment.`;

  return [`Dear ${firstName || "there"},`, "", body, "", "With thanks for your time,"].join("\n");
}

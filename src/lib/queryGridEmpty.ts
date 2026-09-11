/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's empty states (Grid pass §6) — which one shows, and what the filtered one says.
 *
 * ⚠️ FILTERED TO ZERO IS NOT THE SAME FACT AS "NOTHING NEEDS YOU". The ref draws one card for the
 * filtered moment, headed "Nothing needs you right now", and that headline is a claim about the
 * whole set the tiles count, not about the filter. A search typed to zero while a partial is waiting
 * to go out would state it falsely. So the card renders only where it is true — nothing in that set
 * is in a register that needs the writer — and everywhere else the page keeps its plain no-match
 * line. Three outcomes, not two.
 *
 * ⚠️ "NEEDS YOU" IS THE ATTENTION SORT'S LEAD, NOT A NEW LIST: your move, past the window, offers —
 * the three registers that sort above calm. Deriving it any other way is how the headline and the
 * sort come to disagree about the same query.
 */
import { inQuick } from "./queryCentreGrid";
import { shortDate, type CardFacts, type Register } from "./queryCardFacts";

export type GridEmptyKind = "first" | "filtered" | "nomatch";

/** The registers that need the writer — the attention sort's first three, in its order. */
export const NEEDS_YOU: readonly Register[] = ["you", "late", "offer"];

export interface WaitingSummary {
  /** in a register that needs the writer */
  needsYou: number;
  /** on the agent's side — counted with the With-the-agent tile's OWN predicate, so the two
   *  numbers are one derivation and cannot come apart */
  withAgents: number;
  /** of those, calm and carrying a stated expected date */
  inWindow: number;
  /** the nearest of those dates; null when none is stated */
  nextExpectedMs: number | null;
}

export function waitingSummary(
  facts: readonly Pick<CardFacts, "register" | "turn" | "expectedReply">[],
): WaitingSummary {
  let needsYou = 0;
  let withAgents = 0;
  let inWindow = 0;
  let next: number | null = null;
  for (const f of facts) {
    if (NEEDS_YOU.includes(f.register)) needsYou += 1;
    if (!inQuick(f.turn, "agent")) continue;
    withAgents += 1;
    if (f.register === "calm" && f.expectedReply) {
      inWindow += 1;
      const ms = f.expectedReply.getTime();
      if (next === null || ms < next) next = ms;
    }
  }
  return { needsYou, withAgents, inWindow, nextExpectedMs: next };
}

/**
 * Which empty state, if any. `ghost` is the log sheet's preview card — while it shows, the grid is
 * not empty, it is holding the thing being written. `creating` with no queries at all is the same
 * moment in a view that has no ghost: the sheet is open, so offering to open it would be a second
 * door onto a room you are already in.
 */
export function gridEmptyKind(i: {
  total: number;
  visible: number;
  needsYou: number;
  creating: boolean;
  ghost: boolean;
}): GridEmptyKind | null {
  if (i.ghost || i.visible > 0) return null;
  if (i.total === 0) return i.creating ? null : "first";
  return i.needsYou === 0 ? "filtered" : "nomatch";
}

/**
 * The filtered card's factual line — the ref's sentence where every query with an agent has a
 * window, and a true one where some do not. A query nobody gave a window is with an agent and is
 * NOT "inside its window"; the ref's sentence would say it was. Null when nothing is with an agent,
 * because a line about zero queries says nothing.
 */
export function waitingLine(s: WaitingSummary): string | null {
  const n = s.withAgents;
  const w = s.inWindow;
  if (n === 0) return null;
  const head =
    w === n
      ? n === 1
        ? "1 query is with an agent and inside its window."
        : `${n} queries are with agents and inside their windows.`
      : w === 0
        ? n === 1
          ? "1 query is with an agent."
          : `${n} queries are with agents.`
        : `${n} queries are with agents; ${w === 1 ? "1 is inside its window" : `${w} are inside their windows`}.`;
  return s.nextExpectedMs === null
    ? head
    : `${head} The next reply is expected on ${shortDate(new Date(s.nextExpectedMs))}.`;
}

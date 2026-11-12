/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 (design-refs/contact-list-principles-v1/contact-list-principles-v1.html, the pp layer) —
 * the words the page derives from the writer's own numbers. Pure, so every sentence is unit-locked (CLP2) and the
 * rendered page can only show what these return.
 *
 *   clHeadline     the header's sentence and the count line beneath it, from `headerFigures` (the same `stand` the rail's
 *                  Where they stand tiles count)
 *   isDayOne       three or fewer agents on file and none queried
 *   noMatchCopy    the no-matches state: what is applied, named, and what to do about it
 */
import type { HeaderFigures } from "./contactV26";

/** an agent's stand is "you" (Your move) — `HeaderFigures.y`; not queried is everyone not yet queried, `n - q` */
export const isDayOne = (f: HeaderFigures): boolean => f.n >= 1 && f.n <= 3 && f.q === 0;

export interface Headline {
  /** the rust part ("5 need you."), or null when nothing needs the writer */
  lead: string | null;
  /** the rest of the sentence, after the lead and a space */
  rest: string;
  /** day one: the line beneath is words, not the count */
  dayOne: boolean;
  /** day one's line beneath */
  under: string | null;
}

const DAY_ONE: Record<number, string> = {
  1: "1 agent so far. Not queried yet.",
  2: "2 agents so far. Neither queried yet.",
  3: "3 agents so far. None queried yet.",
};
export const DAY_ONE_UNDER = "Add a few more and QueryHawk can start suggesting who to query next.";

export function clHeadline(f: HeaderFigures): Headline {
  if (isDayOne(f)) return { lead: null, rest: DAY_ONE[f.n], dayOne: true, under: DAY_ONE_UNDER };
  const you = f.y;
  const nq = Math.max(0, f.n - f.q);
  const lead = you > 0 ? `${you} need${you === 1 ? "s" : ""} you.` : null;
  const second = nq > 0 ? `${nq} not queried yet.` : "Everyone’s been queried.";
  return { lead, rest: lead ? second : `Nothing needs you right now. ${second}`, dayOne: false, under: null };
}
/** the whole sentence as it reads (the lead, a space, the rest) */
export const headlineText = (h: Headline): string => (h.lead ? `${h.lead} ${h.rest}` : h.rest);

const WORD = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** “a”, “a” and “b”, “a”, “b” and “c” */
const quoted = (xs: readonly string[]): string => {
  const q = xs.map((x) => `“${x}”`);
  return q.length <= 1 ? q.join("") : `${q.slice(0, -1).join(", ")} and ${q[q.length - 1]}`;
};

export interface NoMatchCopy { title: string; line: string | null; removeLast: string | null }
/** what is applied, in the order the applied row draws it; `labels` empty is the bare "No agents match." */
export function noMatchCopy(labels: readonly string[]): NoMatchCopy {
  if (labels.length === 0) return { title: "No agents match.", line: null, removeLast: null };
  const title = `No agents match ${quoted(labels)}.`;
  if (labels.length === 1) return { title, line: null, removeLast: null };
  const n = labels.length;
  const line = `${WORD[n] ?? String(n)} filters together left nobody. Take one off, or clear them ${n === 2 ? "both" : "all"}.`;
  return { title, line, removeLast: `Just remove “${labels[n - 1]}”` };
}

/** the band's count: "41 agents", "0 of 41 agents" when filters leave nobody, "Agents" while loading or failed */
export function bandCount(shown: number, total: number, state: "list" | "loading" | "error"): string {
  if (state !== "list") return "Agents";
  if (shown === 0 && total > 0) return `0 of ${total} ${total === 1 ? "agent" : "agents"}`;
  return `${shown} ${shown === 1 ? "agent" : "agents"}`;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 (design-refs/contact-list-principles-v1/contact-list-principles-v1.html, the pp layer) —
 * the words the page derives from the writer's own numbers. Pure, so every sentence is unit-locked (CLP2) and the
 * rendered page can only show what these return.
 *
 *   clHeadline     the header's headline and the line beneath it, from `headerFigures` (header v2: "{n} agents on
 *                  file" over "{nq} not yet queried" / "All of them queried")
 *   isDayOne       three or fewer agents on file and none queried
 *   noMatchCopy    the no-matches state: what is applied, named, and what to do about it
 */
import type { HeaderFigures } from "./contactV26";

/** not queried is everyone not yet queried, `n - q` (`HeaderFigures.y`, Your move, is no longer the header's) */
export const isDayOne = (f: HeaderFigures): boolean => f.n >= 1 && f.n <= 3 && f.q === 0;

export interface Headline {
  /** the h1: "{n} agents on file", or day one's sentence */
  title: string;
  /** the line under it: "{nq} not yet queried", "All of them queried", "Already queried"; null on day one */
  sub: string | null;
  /** the sub is a control (it applies the `queried: "no"` filter) — only when someone is not yet queried */
  subLink: boolean;
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

/** Contact list header v2 (design-refs/contact-list-header-v2.html) — the agents page says how many agents there are
 *  and how many have not been queried. "need you" left the header (it stays in the filter panel's Your move chip). */
export function clHeadline(f: HeaderFigures): Headline {
  if (isDayOne(f)) return { title: DAY_ONE[f.n], sub: null, subLink: false, dayOne: true, under: DAY_ONE_UNDER };
  const nq = Math.max(0, f.n - f.q);
  const title = `${f.n} ${f.n === 1 ? "agent" : "agents"} on file`;
  if (nq > 0) return { title, sub: `${nq} not yet queried`, subLink: true, dayOne: false, under: null };
  return { title, sub: f.n === 1 ? "Already queried" : "All of them queried", subLink: false, dayOne: false, under: null };
}
/** the h1 as it reads */
export const headlineText = (h: Headline): string => h.title;

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

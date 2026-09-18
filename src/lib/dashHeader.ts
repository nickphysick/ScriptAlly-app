/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashHeader — the dashboard header's greeting and its one line of live figures (stage 1, 17 Sep).
 *
 *   Hello, Nick.
 *   12 queries out · 3 waiting on you · Day 118
 *
 * ⚠️ NEITHER FIGURE IS A NEW DERIVATION, AND THAT IS THE POINT OF THIS FILE. The header sits directly
 * above two cards that already state both numbers — the chart's "Active queries" headline and the
 * to-do card's badge — so a count of its own would be a third opinion placed where a reader compares
 * them at a glance. Each figure is the SAME call its card makes, over the same scoped arrays, and
 * `dashHeader.test.ts` asserts the two against each other rather than against literals.
 *
 *   · QUERIES OUT is every LIVE query — sent, and not closed by a pass, a withdrawal or a stated
 *     no-response. An offer is live (stages 2–3, 17 Sep: it used to count as closed here). It is
 *     `dashBreakdown.liveCount`, the same set the breakdown's five columns and its R&R/offer line
 *     partition, so header = columns + footer by construction; the chart's headline reads it too.
 *     (`accountHeaderFacts.queryingLabel` uses "out" for every query with a send date; that helper has
 *     no caller and describes an account's lifetime, not today.)
 *   · WAITING ON YOU is `boardFigures(...).cards` — the To-do and Today columns, snoozed excluded —
 *     which is what the sidebar badge, every Tasks page and the dashboard's to-do card count.
 *   · DAY N is `dashBreakdown.queryingDay` — days since this manuscript's first query, that day being
 *     day 1 (v16, 18 Sep). It was the quick-actions foot until that card became three tiles and no
 *     text; the clause simply moves, and it is the same call it always was.
 *
 * ⚠️ NULL IS "NOT LOADED YET", NEVER ZERO. The header renders the line without figures until the
 * collections land; a zero appears only where zero is true. Nick's rule: never show a number that
 * might change.
 *
 * ⚠️ A NEW ACCOUNT GETS A DIFFERENT LINE, ON THE SAME SWITCH AS THE CARD BENEATH IT. While the page
 * is in its empty moment (no queries for the current manuscript — the flag that turns the to-do card
 * into the Getting Started list), "0 tasks waiting on you" sat above a list of five things to do.
 * True, and awkward. The line reads "No queries out yet · N steps to get started" instead, and N is
 * the list's own open count by the list's own derivation — so the two can never disagree.
 */
import type { Query } from "../types";
import { liveCount, queryingDay } from "./dashBreakdown";
import { assembleBoardColumns, boardFigures, type AssembleColumnsInput } from "./todoColumns";
import { gettingStartedOpen, gettingStartedRows, type GettingStartedInput } from "./dashEmpty";

/**
 * What the header's second line states. A STRING discriminant, because this repo compiles without
 * `strictNullChecks` and a boolean one would not narrow.
 */
export type DashHeaderLine =
  /** `day` is null before the first query — the clause is dropped, never "Day 0" */
  | { kind: "counts"; queriesOut: number; tasksWaiting: number; day: number | null }
  | { kind: "starting"; steps: number };

/** Every live query — the figure the chart's headline and the breakdown's total also state. */
export const queriesOutCount = (queries: Query[]): number => liveCount(queries);

/** The to-do card's total, by the call every Tasks surface makes. */
export const tasksWaitingCount = (input: AssembleColumnsInput): number =>
  boardFigures(assembleBoardColumns(input).cols).cards;

/** The Getting Started list's open steps — the empty-state card's badge, by the card's own call. */
export const startingStepsCount = (input: GettingStartedInput): number =>
  gettingStartedOpen(gettingStartedRows(input));

export interface DashHeaderInput {
  /** the collections have not landed — the line states no figure at all */
  loading: boolean;
  /** the page's empty moment (no queries for the current manuscript) — the card shows Getting Started */
  empty: boolean;
  /** the manuscript-scoped queries the chart reads */
  scopedQueries: Query[];
  now: Date;
  /** exactly what the to-do card hands `assembleBoardColumns` */
  board: AssembleColumnsInput;
  /** exactly what the to-do card hands `gettingStartedRows` */
  starting: GettingStartedInput;
}

/**
 * The line, or null while loading. Only the branch that is shown is derived — the board is not
 * assembled for a page that is showing the Getting Started count.
 */
export const dashHeaderLine = (i: DashHeaderInput): DashHeaderLine | null => {
  if (i.loading) return null;
  if (i.empty) return { kind: "starting", steps: startingStepsCount(i.starting) };
  return {
    kind: "counts",
    queriesOut: queriesOutCount(i.scopedQueries),
    tasksWaiting: tasksWaitingCount(i.board),
    day: queryingDay(i.scopedQueries, i.now),
  };
};

/**
 * "Hello, Nick." — the full stop is part of the greeting, and a name that already ends in one
 * ("J.") does not get a second.
 */
export const greetingText = (firstName: string): string =>
  `Hello, ${firstName}${/[.!?]$/.test(firstName) ? "" : "."}`;

export interface CountClause {
  /** null while loading — the clause renders its words and no figure */
  n: number | null;
  noun: string;
}

/**
 * The line's clauses. Singulars agree ("1 query out", "1 step to get started"); without a figure the
 * plural stands, because there is no number for it to agree with. "No queries out yet" carries no
 * figure by design — the sentence is the figure.
 *
 * ⚠️ IT RETURNS A LIST, NOT A PAIR (v16, 18 Sep). The counts line gained "Day n" and the
 * getting-started line did not, so a fixed pair could only have carried the day as a third clause
 * that is sometimes empty — which the renderer would then have to test for anyway. The renderer
 * joins whatever it is given with the dot.
 *
 * ⚠️ AND THE DAY CLAUSE CARRIES NO `n`, THOUGH IT STATES A NUMBER. `n` is the figure the renderer
 * emboldens; the ref sets "Day 1,018" in plain weight, the number inside the words rather than
 * before them. The clause is therefore one phrase, formatted here.
 */
export const lineClauses = (line: DashHeaderLine | null): CountClause[] => {
  if (line?.kind === "starting") {
    return [
      { n: null, noun: "No queries out yet" },
      { n: line.steps, noun: line.steps === 1 ? "step to get started" : "steps to get started" },
    ];
  }
  const c = line?.kind === "counts" ? line : null;
  const out: CountClause[] = [
    { n: c ? c.queriesOut : null, noun: c?.queriesOut === 1 ? "query out" : "queries out" },
    { n: c ? c.tasksWaiting : null, noun: "waiting on you" },
  ];
  if (c && c.day !== null) out.push({ n: null, noun: `Day ${c.day.toLocaleString("en-GB")}` });
  return out;
};

/* ⚠️ `HEADER_ART` IS RETIRED WITH THE HEADER'S ILLUSTRATION (v16, 18 Sep). The hawk stood at the
   right-hand end of this row; the v16 header is the greeting and the line alone, and
   `public/images/top-of-dashboard.png` is deleted with it — it had no other reader. */

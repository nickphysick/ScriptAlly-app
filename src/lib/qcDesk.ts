/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK — three cards, one a court (v134: the icon card; v131.1's two tiled lines are kept). Each
 * card: the court's figure and words, two lines each led by a tile, the change since the end of last
 * month, and a ten-week chart of the running count.
 *
 * ⚠️ IT READS THE SAME ROWS AS `courtTiles` AND THE SAME MEMBERSHIP (`rowsForTile`), so a card's total,
 * the carousel it chooses for and every line here agree by construction. Every line's figure is a
 * derivation already on `QcRow` (`status`, `pastExpected`, `expectedMs`, `closedHow`); nothing here
 * re-counts the pipeline.
 *
 * ⚠️ THE CHART AND THE MONTH-ON-MONTH FIGURE COME FROM ONE FUNCTION (`lib/qcCourtHistory`), the running
 * count read from each query's own dated history, so "the end of last month" is a point on the same
 * curve the chart draws. v131.1's rubber stamp (the change against four weeks ago) is retired.
 */
import { QueryStatus } from "../types";
import { rowsForTile, type QcRow, type TileCourt } from "./qcSummary";
import { courtSeries, monthChange, monthText } from "./qcCourtHistory";
import { weekStart } from "./qcDeskWeeks";
import { MONTHS_SHORT } from "./dates";

const DAY = 86_400_000;

export interface DeskLine {
  n: number;
  /** The words after the figure, singular when it is 1. */
  text: string;
  /** "Needs you now": an offer to consider or a response overdue, when there is one. */
  hot: boolean;
}
export interface DeskSection {
  key: TileCourt;
  label: string;
  total: number;
  lines: [DeskLine, DeskLine];
  /** Month on month: now minus the end of last month. `text` is the words after the arrow. */
  mom: { delta: number; dir: "up" | "down" | "none"; text: string };
  /** The card, said aloud: "13 with you: 1 offer to consider, 12 requests to send; up 3 since last month". */
  said: string;
  /** Ten points, oldest first, the last is now; and the week each starts. */
  trend: { weeks: number[]; values: number[] };
}

/** "With agents" — the desk, the carousel's title when that card is chosen, and the page guide. */
export const DESK_LABEL: Record<TileCourt, string> = { you: "With you", agent: "With agents", closed: "Closed" };
/** The words after a card's figure: "13 with you". */
export const COURT_WORDS: Record<TileCourt, string> = { you: "with you", agent: "with agents", closed: "closed" };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** What With you owes: "partials" when every one is a partial, "fulls" when every one is a full, else "requests". */
function owedWords(owed: readonly QcRow[]): string {
  const n = owed.length;
  if (n > 0 && owed.every((r) => r.status === QueryStatus.PARTIAL_REQUESTED)) return `${plural(n, "partial", "partials")} to send`;
  if (n > 0 && owed.every((r) => r.status === QueryStatus.FULL_REQUESTED)) return `${plural(n, "full", "fulls")} to send`;
  return `${plural(n, "request", "requests")} to send`;
}

/** The London week holding `nowMs`: Monday 00:00 to the next Monday 00:00. */
export function londonWeek(nowMs: number): { from: number; to: number } {
  const from = weekStart(nowMs);
  return { from, to: weekStart(from + 8 * DAY) };
}

const londonDate = (ms: number) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "numeric" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { d: +p.day, m: +p.month - 1 };
};
/** The trend's first label: the month its first week starts in, "Aug". */
export const trendStartLabel = (weekStartMs: number): string => MONTHS_SHORT[londonDate(weekStartMs).m];
export function deskSections(rows: readonly QcRow[], nowMs: number): DeskSection[] {
  const series = courtSeries(rows, nowMs);
  const you = rowsForTile(rows, "you");
  const agent = rowsForTile(rows, "agent");
  const closed = rowsForTile(rows, "closed");
  const week = londonWeek(nowMs);

  /* with you: offers to consider; the rest are materials owed */
  const offers = you.filter((r) => r.status === QueryStatus.OFFER).length;
  const owed = you.filter((r) => r.status !== QueryStatus.OFFER);
  /* with agents: past the expected date; and due inside this London week, not yet past */
  const overdue = agent.filter((r) => r.pastExpected).length;
  const dueWeek = agent.filter((r) => !r.pastExpected && r.expectedMs != null && r.expectedMs >= week.from && r.expectedMs < week.to).length;
  /* closed: rejections and no response — a withdrawal is on neither line */
  const rejected = closed.filter((r) => r.closedHow === "passed").length;
  const noReply = closed.filter((r) => r.closedHow === "noReply").length;

  const mom = (key: TileCourt): DeskSection["mom"] => {
    const d = monthChange(rows, key, nowMs);
    return { delta: d, dir: d > 0 ? "up" : d < 0 ? "down" : "none", text: monthText(d) };
  };
  const said = (key: TileCourt, total: number, lines: readonly DeskLine[], m: DeskSection["mom"]) =>
    `${total} ${COURT_WORDS[key]}: ${lines.map((l) => `${l.n} ${l.text}`).join(", ")}; ${m.dir === "none" ? "no change" : `${m.dir} ${Math.abs(m.delta)}`} since last month`;
  const trend = (key: TileCourt) => ({ weeks: series.weeks, values: series[key] });

  const card = (key: TileCourt, total: number, lines: [DeskLine, DeskLine]): DeskSection => {
    const m = mom(key);
    return { key, label: DESK_LABEL[key], total, lines, mom: m, said: said(key, total, lines, m), trend: trend(key) };
  };
  return [
    card("you", you.length, [
      { n: offers, text: plural(offers, "offer to consider", "offers to consider"), hot: offers > 0 },
      { n: owed.length, text: owedWords(owed), hot: false },
    ]),
    card("agent", agent.length, [
      { n: overdue, text: plural(overdue, "response overdue", "responses overdue"), hot: overdue > 0 },
      { n: dueWeek, text: "due this week", hot: false },
    ]),
    card("closed", closed.length, [
      { n: rejected, text: plural(rejected, "rejection", "rejections"), hot: false },
      { n: noReply, text: "no response", hot: false },
    ]),
  ];
}

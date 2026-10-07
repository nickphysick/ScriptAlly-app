/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v131.1 — three ledger cards (ref design-refs/desk-ledger-v6.html, `data-sub=tile`). Each
 * card: the court's name, a rubber stamp with the change against four weeks ago, the big number, two
 * lines each led by a tile, and a ten-week trend of the running count.
 *
 * ⚠️ IT READS THE SAME ROWS AS `courtTiles` AND THE SAME MEMBERSHIP (`rowsForTile`), so a card's total,
 * the carousel it chooses for and every line here agree by construction. Every line's figure is a
 * derivation already on `QcRow` (`status`, `pastExpected`, `expectedMs`, `closedHow`); nothing here
 * re-counts the pipeline.
 *
 * ⚠️ THE TREND AND THE STAMP COME FROM ONE FUNCTION (`lib/qcCourtHistory`), the running count read from
 * each query's own dated history, so the stamp's "four weeks ago" is a point the chart could draw.
 */
import { QueryStatus } from "../types";
import { rowsForTile, type QcRow, type TileCourt } from "./qcSummary";
import { courtChange, courtSeries, countAt, stampText } from "./qcCourtHistory";
import { weekLabel, weekStart } from "./qcDeskWeeks";
import { MONTHS_SHORT } from "./dates";
import { MONTH_FULL } from "./qcTimeline";

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
  /** The stamp: the change against four weeks ago, and the count it was then. */
  stamp: { text: string; ago: number };
  /** Ten points, oldest first, the last is now; and the week each starts. */
  trend: { weeks: number[]; values: number[] };
}

/** "With agents" — the desk, the carousel's title when that card is chosen, and the page guide. */
export const DESK_LABEL: Record<TileCourt, string> = { you: "With you", agent: "With agents", closed: "Closed" };
/** The tooltip's unit: "W/C 29 SEP · 20 with agents". */
export const TREND_UNIT: Record<TileCourt, string> = { you: "with you", agent: "with agents", closed: "closed" };

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
/** The chart's accessible label: "With agents: 14 in early August, 19 now". */
export function trendLabel(label: string, weekStartMs: number, first: number, last: number): string {
  const { d, m } = londonDate(weekStartMs);
  const part = d <= 10 ? "early" : d <= 20 ? "mid" : "late";
  return `${label}: ${first} in ${part} ${MONTH_FULL[m]}, ${last} now`;
}
/** The tooltip: "W/C 29 SEP · 20 with agents". */
export const trendTip = (key: TileCourt, weekStartMs: number, n: number): string => `${weekLabel(weekStartMs)} · ${n} ${TREND_UNIT[key]}`;

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

  const stamp = (key: TileCourt) => {
    const d = courtChange(rows, key, nowMs);
    return { text: stampText(d), ago: countAt(rows, key, nowMs - 28 * DAY, nowMs) };
  };
  const trend = (key: TileCourt) => ({ weeks: series.weeks, values: series[key] });

  return [
    {
      key: "you", label: DESK_LABEL.you, total: you.length,
      lines: [
        { n: offers, text: plural(offers, "offer to consider", "offers to consider"), hot: offers > 0 },
        { n: owed.length, text: owedWords(owed), hot: false },
      ],
      stamp: stamp("you"), trend: trend("you"),
    },
    {
      key: "agent", label: DESK_LABEL.agent, total: agent.length,
      lines: [
        { n: overdue, text: plural(overdue, "response overdue", "responses overdue"), hot: overdue > 0 },
        { n: dueWeek, text: "due this week", hot: false },
      ],
      stamp: stamp("agent"), trend: trend("agent"),
    },
    {
      key: "closed", label: DESK_LABEL.closed, total: closed.length,
      lines: [
        { n: rejected, text: plural(rejected, "rejection", "rejections"), hot: false },
        { n: noReply, text: "no response", hot: false },
      ],
      stamp: stamp("closed"), trend: trend("closed"),
    },
  ];
}

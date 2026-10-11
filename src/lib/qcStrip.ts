/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 §B — "At a glance": the figures the strip's four cells state.
 *
 * ⚠️ NOTHING IS RE-COUNTED. Cells 2–4 are `deskSections`' own three sections (v136's With you, With agents and
 * Closed, with their two figures each); this file only gives those figures the strip's words. Cell 1's figure is
 * the three added up, so the four cells cannot disagree (QC137 B1). A withdrawn or signed query is in no section,
 * and so in no cell.
 *
 * ⚠️ THE WEEKS ARE MONDAY TO SUNDAY BY THE LONDON CALENDAR (`lib/qcDeskWeeks`), read from each query's own send
 * date. The last bar is this week.
 */
import type { QcRow, TileCourt } from "./qcSummary";
import type { DeskSection } from "./qcDesk";
import { deskWeeks } from "./qcDeskWeeks";
import { MONTHS_SHORT } from "./dates";

export const STRIP_WEEKS = 20;
const DAY = 86_400_000;

export interface StripSent {
  /** oldest first; the last is this week */
  weeks: { start: number; n: number; tip: string }[];
  n30: number;
  nWeek: number;
}

const wcLabel = (ms: number): string => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "numeric" }).formatToParts(new Date(ms));
  const d = Number(p.find((x) => x.type === "day")?.value), m = Number(p.find((x) => x.type === "month")?.value);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};

/** Queries sent per week for the last `n` weeks, and in the last 30 days. Undated queries are in neither. */
export function stripSent(rows: readonly Pick<QcRow, "sentMs">[], nowMs: number, n = STRIP_WEEKS): StripSent {
  const starts = deskWeeks(nowMs, n);
  const counts = starts.map(() => 0);
  let n30 = 0;
  for (const r of rows) {
    const t = r.sentMs;
    if (t == null || !Number.isFinite(t) || t > nowMs) continue;
    if (t > nowMs - 30 * DAY) n30++;
    /* a send before the first week is before the chart, and in no bar */
    for (let i = starts.length - 1; i >= 0; i--) if (t >= starts[i]) { counts[i]++; break; }
  }
  const weeks = starts.map((start, i) => ({ start, n: counts[i], tip: `${counts[i]} sent · w/c ${wcLabel(start)}` }));
  return { weeks, n30, nWeek: counts[counts.length - 1] };
}

export interface StripPart { n: number; text: string; hot: boolean }

const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** A court cell's line, in two parts: v136's two figures, in the strip's words. */
export function stripLine(s: Pick<DeskSection, "key" | "lines">): [StripPart, StripPart] {
  const [a, b] = s.lines;
  const by: Record<TileCourt, [StripPart, StripPart]> = {
    you: [
      { n: a.n, text: pl(a.n, "offer to consider", "offers to consider"), hot: a.n > 0 },
      { n: b.n, text: pl(b.n, "request to send", "requests to send"), hot: false },
    ],
    agent: [
      { n: a.n, text: "past their reply time", hot: a.n > 0 },
      { n: b.n, text: "due this week", hot: false },
    ],
    closed: [
      { n: a.n, text: "passed", hot: false },
      { n: b.n, text: "no reply", hot: false },
    ],
  };
  return by[s.key];
}

/** Cell 1's line. */
export const sentLine = (s: StripSent): [StripPart, StripPart] => [
  { n: s.n30, text: "in the last 30 days", hot: false },
  { n: s.nWeek, text: "this week", hot: false },
];

/** The strip's total: the three courts added up. */
export const stripTotal = (sections: readonly Pick<DeskSection, "total">[]): number => sections.reduce((n, s) => n + s.total, 0);

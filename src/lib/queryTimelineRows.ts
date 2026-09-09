/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre's Calendar rows — the SECOND caller of `laneBars`, and deliberately not a second
 * derivation.
 *
 * ⚠️ THE BARS ARE NOT COMPUTED HERE AND MUST NEVER BE. `laneBars(LaneInput, BarWindow)` in
 * `journeyBars` turns a `Query` and an `Agent` into segments and nodes; `todoTimeline` has called it
 * since the board was built. Everything this file does is ASSEMBLE its inputs. A bar's start, its
 * end, its state, its marks and its provenance are decided there and nowhere else — so the two
 * boards cannot disagree about the same wait, which is the property the whole extraction exists to
 * protect. If you find yourself writing a date subtraction in this file, that is the bug.
 *
 * ⚠️ AND THE ROW MODEL MIRRORS TO-DO'S ON PURPOSE: a row per AGENT, a lane per MANUSCRIPT. It is
 * not the obvious shape for a page whose list is queries — one row per query would be — and it is
 * the right one, because a lane index decides a row's height (`--row-h × --lanes`) and a reader
 * looking at the same agency on both pages must see the same object. Grouping by query would make
 * every cross-page comparison a coincidence.
 *
 * ⚠️ PROVENANCE PASSES THROUGH UNTOUCHED. `NamedEndSource` is three values — `window`, `sendBy`,
 * `reminder` — plus the separate `window` fact for the date the AGENCY stated whether or not it won.
 * Nothing here collapses them to a two-way "stated vs estimate": a reminder standing ahead of the
 * window takes the bar's end while the window still decides whether a reply time was ever given.
 */
import type { Query, Agent, Activity } from "../types";
import type { BoardRow } from "../components/shared/timeline/types";
import { laneBars, statusIndex, laneWinner, type Bars, type BarWindow } from "./journeyBars";
import { recordDays } from "./todoCalendar";
import { windowDays } from "./todoTimeline";
import { agentPrimary, agentSecondary } from "./agentDisplay";
import { stateFor } from "./queryCardFacts";

export interface QueryTimelineInput {
  /** the page's OWN filtered, sorted list — the same collection the other three views render */
  queries: readonly Query[];
  agents: readonly Agent[];
  activities: readonly Activity[];
  /** the window's first day and its span, from the same derivation To-do uses */
  winFrom: string;
  days: number;
  today: string;
  manuscriptTitle: (id: string) => string;
}

export interface QueryTimelineResult {
  rows: BoardRow[];
  barsByRow: Map<string, Bars>;
}

/** the key a row is addressed by — the agent, or the query itself where no agent resolves */
export const rowKeyFor = (q: Query): string => `qc-${q.agentId ?? `noagent-${q.id}`}`;

export function queryTimelineRows(input: QueryTimelineInput): QueryTimelineResult {
  const { queries, agents, activities, winFrom, days, today, manuscriptTitle } = input;

  const win = windowDays(winFrom, days);
  const last = win.length ? win[win.length - 1] : winFrom;
  const barWin: BarWindow = { days: win, today, past: last < today };
  const statusOf = statusIndex(activities);
  const byAgent = new Map(agents.map((a) => [a.id, a]));

  /* ⚠️ ONE PASS OVER THE DAYS, NOT ONE PER QUERY. `recordDays` walks every activity in the window;
     calling it inside the query loop would walk them once per query, which on a full account is the
     difference between one sweep and a hundred. */
  const recordsByDay = recordDays(activities as Activity[], queries as Query[], agents as Agent[], win);

  /* group by agent, then lane by manuscript — To-do's own shape, for the reason in the header */
  const perAgent = new Map<string, Map<string, Query>>();
  for (const q of queries) {
    const rk = rowKeyFor(q);
    let per = perAgent.get(rk);
    if (!per) { per = new Map(); perAgent.set(rk, per); }
    /* ⚠️ THE SAME RULE TO-DO APPLIES, FROM THE SAME FUNCTION. A live query outranks a finished
       one; among equals the newer send wins. Restating it here would give the two boards different
       lane COUNTS for one agency — and a lane count decides a row's height. */
    per.set(q.manuscriptId, laneWinner(per.get(q.manuscriptId), q));
  }

  const rows: BoardRow[] = [];
  const barsByRow = new Map<string, Bars>();

  for (const [rowKey, per] of perAgent) {
    const first = [...per.values()][0];
    const agent = first?.agentId ? byAgent.get(first.agentId) ?? null : null;

    /* stable lane order: the manuscript titles, so the row reads the same way twice running */
    const pairs = [...per.entries()].sort((a, b) =>
      manuscriptTitle(a[0]).localeCompare(manuscriptTitle(b[0]), "en-GB", { sensitivity: "base" }));

    const segs: Bars["segments"] = [];
    const nodes: Bars["nodes"] = [];
    let drawn = 0;

    pairs.forEach(([, q], lane) => {
      const recs = win.flatMap((ymd) => (recordsByDay.get(ymd) ?? []).filter((r) => r.queryId === q.id));
      const bars = laneBars({
        rowKey, lane, query: q, agent, records: recs,
        statusOf: (id) => statusOf.get(id) ?? null,
        /* ⚠️ `flag` AND `moveLabel` ARE OMITTED, NOT PASSED AS NULL-ISH DEFAULTS. Both are To-do's:
           a snooze flag lives on a task, and the move label comes from a To-do board card. They are
           optional on `LaneInput` precisely so a page without tasks says nothing about them. */
      }, barWin);
      segs.push(...bars.segments);
      nodes.push(...bars.nodes);
      drawn += bars.segments.length + bars.nodes.length;
    });

    /* ⚠️ A ROW WITH NOTHING IN THE WINDOW IS NOT DRAWN. The board's own emptiness rule: a row that
       draws no segment and no node states nothing, and an empty lane on a 90-day board reads as a
       relationship that has gone quiet rather than as one that simply started later. */
    if (drawn === 0) continue;

    barsByRow.set(rowKey, { segments: segs, nodes });
    rows.push({
      key: rowKey,
      name: agentPrimary(agent),
      agency: agentSecondary(agent),
      lanes: Math.max(1, pairs.length),
      /* every query on the row is terminal — the board fades a closed row rather than hiding it */
      closed: [...per.values()].every((q) => isClosed(q)),
      group: null,
      pressingAt: null,
      subjects: { deed: null, caption: null, sort: null },
      items: [],
    });
  }

  return { rows, barsByRow };
}

/* ⚠️ THE CLOSED SET IS THE APP'S, READ FROM THE STATUS AND NOT RE-LISTED. `stateFor` is the one
   place the five states are decided; a literal list of terminal statuses here would be a second
   answer to a question `queryCardFacts` already answers for the card, the drawer and the band. */
function isClosed(q: Query): boolean {
  return stateFor(q.status) === "closed";
}

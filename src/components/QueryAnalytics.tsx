/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — Queries → Analytics (ref design-refs/scriptally-analytics-v6-ideas.html).
 *
 * The placeholder this replaces was honest about being one, and the rule it stated survives the
 * build rather than ending with it: ⚠️ IT INVENTS NO FIGURES. Every number here is derived at read
 * time from the queries and activities the store already holds (`lib/analytics.ts`); nothing is
 * stamped, stored or written, and a figure the data cannot support is stated as the fraction it is
 * rather than rounded into a percentage that reads as a measurement.
 *
 * ⚠️ IT READS AND DERIVES. NOTHING ELSE. No `updateDoc`, no callable, no `recomputeQuery`, and no
 * new stored field behind any number on the page.
 *
 * ⚠️ THE PAGE LIVES IN THIS FILE, and moving its body into `analytics/` would break two locks
 * quietly rather than loudly. `workspacePageGrid.test.tsx` reads THIS path twice — once for the
 * grid-conversion census (which requires `variant="workspace"` here) and once for the inline-
 * overflow check. Behind a thin re-export the census goes red and the overflow check goes
 * VACUOUS, which is the worse of the two. The page's parts live in `analytics/`; the page does not.
 *
 * ⚠️ SCOPE IS THE SHELL'S, READ EVERY RENDER. The manuscript in scope is
 * `localStorage["scriptally_active_manuscript_id"]`, which the shell's own scope control writes
 * before re-navigating. A `useState` initialiser would latch it at mount and leave this page
 * reporting the previous book while the chrome above it named the new one — the reasoning
 * `ComparableTitlesPage` records for deleting its own copy of that control.
 *
 * ⚠️ ONE MANUSCRIPT, NEVER AN AGGREGATE. Two books have different genres, different agent lists
 * and different vintages; a combined request rate is a number about no manuscript at all.
 */
import React from "react";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../lib/db";
import { resolveScopedManuscript } from "../lib/shellSidebar";
import { IllustrationSlot } from "./analytics/IllustrationSlot";
import { RangeToggle, ExportButton } from "./analytics/HeaderControls";
import { StatStrip, statCells } from "./analytics/StatStrip";
import { Panel, PanelRow } from "./analytics/Panel";
import { JourneyFunnel, funnelNote } from "./analytics/JourneyFunnel";
import { SendingChart, SENDING_NOTE } from "./analytics/SendingChart";
import { StatusDonut } from "./analytics/StatusDonut";
import { ReplyHistogram, histogramNote } from "./analytics/ReplyHistogram";
import { AgingChart, agingNote } from "./analytics/AgingChart";
import {
  AnalyticsRange,
  AnalyticsRow,
  buildRows,
  EARLY_STATE_HINT,
  isEarlyState,
  previousWindow,
  previousWindowLabel,
  rangeWindow,
  rowsInWindow,
  statSet,
} from "../lib/analytics";
import "./analytics/analytics.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const QueryAnalytics: React.FC = () => {
  const { queries, activities, agents, manuscripts } = useScriptAllyDb();

  /**
   * ⚠️ LOCAL STATE, AND IT STAYS THAT WAY. A URL param would turn a way of looking at the same
   * queries into a place in the app that the shell has to model; a persisted one would have a
   * writer return next week to a three-month window they set once and forgot.
   */
  const [range, setRange] = React.useState<AnalyticsRange>("all");

  /* Read every render — see the scope note above. */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = resolveScopedManuscript(manuscripts, storedMs);

  /**
   * ⚠️ ONE CLOCK PER RENDER, PASSED DOWN. Every selector that needs "today" takes it as an
   * argument, so two panels cannot disagree about what today is halfway through a render — and
   * the derivations stay testable without faking a global.
   */
  const nowMs = Date.now();

  const scoped = React.useMemo(
    () => (manuscript ? queries.filter((q) => q.manuscriptId === manuscript.id) : []),
    [queries, manuscript],
  );
  const allRows = React.useMemo(
    () => buildRows(scoped, activities, agents, nowMs),
    [scoped, activities, agents, nowMs],
  );

  const rows: AnalyticsRow[] = React.useMemo(
    () => rowsInWindow(allRows, rangeWindow(range, nowMs)),
    [allRows, range, nowMs],
  );
  const prevRows = React.useMemo(() => {
    const w = previousWindow(range, nowMs);
    return w ? rowsInWindow(allRows, w) : null;
  }, [allRows, range, nowMs]);

  const stats = statSet(rows);
  const prevStats = prevRows && prevRows.length ? statSet(prevRows) : null;
  const cells = statCells(stats, prevStats, previousWindowLabel(range), range === "all");

  /* The mono tally under the title — the two figures a writer checks first. */
  const subLine = `${stats.sent} ${stats.sent === 1 ? "query" : "queries"} · ${stats.open} awaiting reply`;

  return (
    <div className="qa-wrap">
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9): the plate is row 1, the content is
          row 3, and row 3 is the only thing that scrolls. This page never gained a toolbar row —
          its two controls belong to the header, beside the title they qualify. */}
      <WorkspacePageGrid
        className="qa-wpg"
        scrollLabel="Analytics"
        plate={
          <PageHeader
            variant="workspace"
            mark="analytics"
            title="Analytics"
            description={subLine}
            actionsSlot={
              <div className="an-head">
                <RangeToggle value={range} onChange={setRange} />
                <ExportButton />
              </div>
            }
          />
        }
      >
        {/* ⚠️ THREE STATES, AND THE TWO EMPTY ONES ARE NOT A PAGE OF ZEROES. Five stats reading 0
            beside four blank charts describes a broken page; a line describes an account that has
            not started yet. The two are told apart because their causes are different — no
            manuscript at all, or a manuscript nobody has queried. */}
        {manuscript === null ? (
          <div className="an-blank">
            <IllustrationSlot art="post" size="empty" />
            <p>
              Analytics follow a manuscript. Add one and its queries, requests and reply times will
              be gathered here.
            </p>
          </div>
        ) : allRows.length === 0 ? (
          <div className="an-blank">
            <IllustrationSlot art="plane" size="empty" />
            <p>
              No queries logged for {manuscript.title} yet. Once the first one goes out, this page
              starts keeping its history.
            </p>
          </div>
        ) : (
          <>
            <StatStrip cells={cells} />
            {/* ⚠️ A ROADMAP, NOT A DEFICIENCY. It says when each figure firms up; it never says the
                writer has too few queries out, which is a judgement about how they are going about
                their own submissions. */}
            {isEarlyState(rows) ? (
              <div className="an-early">
                <b>Early days —</b> {EARLY_STATE_HINT}
              </div>
            ) : null}

            <PanelRow>
              <Panel icon="journey" title="The journey so far" span={12} note={funnelNote(rows)}>
                <JourneyFunnel rows={rows} />
              </Panel>
            </PanelRow>

            <PanelRow>
              <Panel icon="chart" title="Sending and hearing back" span={8} note={SENDING_NOTE}>
                <SendingChart rows={rows} range={range} nowMs={nowMs} />
              </Panel>
              <Panel icon="donut" title="Where things stand" span={4}>
                <StatusDonut rows={rows} />
              </Panel>
            </PanelRow>

            <PanelRow>
              <Panel icon="clock" title="How long replies take" span={6} note={histogramNote(rows)}>
                <ReplyHistogram rows={rows} />
              </Panel>
              <Panel icon="hourglass" title="Queries still out" span={6} note={agingNote(rows)}>
                <AgingChart rows={rows} />
              </Panel>
            </PanelRow>
          </>
        )}
      </WorkspacePageGrid>
    </div>
  );
};

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
import { WorkspacePageGrid, PageTally } from "./shell/WorkspacePageGrid";
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
import { Horizon, horizonNote, horizonWorthShowing } from "./analytics/Horizon";
import { FullsPanel, fullsNote } from "./analytics/FullsPanel";
import { LatestResponses, latestResponsesNote } from "./analytics/LatestResponses";
import { ShareCard } from "./analytics/ShareCard";
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
  /* the share card is a view of the journey panel, so the panel's own button owns it */
  const [shareOpen, setShareOpen] = React.useState(false);
  const shareBtn = React.useRef<HTMLButtonElement>(null);

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
  /**
   * ⚠️ THIS WAS THE MASTHEAD'S DESCRIPTION AND IT IS A TALLY, WHICH IS WHY IT MOVED (in-flow
   * masthead, step 1). "25 queries · 16 awaiting reply" says nothing about what the page is FOR —
   * it states two figures, in exactly the shape the Contact list's row has always stated its own.
   * Split rather than reworded: same two numbers, same derivation, now the control row's count.
   *
   * ⚠️ SO THE MASTHEAD IS TITLE-ONLY, and that is a real consequence rather than an oversight. The
   * page has no description now because it never had one — it had a count in the slot. Flagged for
   * Nick: a sentence saying what Analytics is for would go in the description if he wants one.
   */
  const tallyValue = `${stats.sent} ${stats.sent === 1 ? "query" : "queries"}`;
  const tallyNote = `${stats.open} AWAITING REPLY`;

  return (
    <div className="qa-wrap">
      {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9): the plate is row 1, the content is
          row 3, and row 3 is the only thing that scrolls. This page never gained a toolbar row —
          its two controls belong to the header, beside the title they qualify. */}
      <WorkspacePageGrid
        className="qa-wpg"
        scrollLabel="Analytics"
        masthead={
          <PageHeader
            variant="workspace"
            mark="analytics"
            title="Analytics"
            /**
             * ⚠️ THE DESCRIPTION IS NEW COPY, NOT THE OLD ONE RESTORED (Nick's, step 2). What used
             * to sit here was a TALLY — "25 queries · 16 awaiting reply" — which is two figures
             * rather than a sentence about the page, and it is the control row's count now. Leaving
             * the slot empty would have made this the one workspace page with no description; it
             * has one for the same reason every other page does.
             *
             * ⚠️ AND IT REPORTS RATHER THAN APPRAISING, which on THIS page is load-bearing rather
             * than stylistic. Analytics is where an app is most tempted to tell a writer how they
             * are doing, and this one deliberately does not: the early-state hint says when figures
             * firm up, the funnel footnote calls its reference rate self-reported and widely
             * varying. "what the numbers can and can't tell you" is that same honesty in the
             * page's own opening line.
             *
             * ⚠️ NO ACTIONS EITHER — the range toggle and Export are in the control row below.
             */
            description="How your querying is going — response rates, timings, and what the numbers can and can't tell you."
          />
        }
        toolbar={
          <>
            <PageTally value={tallyValue} note={tallyNote} />
            <div className="an-head">
              <RangeToggle value={range} onChange={setRange} />
              <ExportButton />
            </div>
          </>
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
              <Panel
                icon="journey"
                title="The journey so far"
                span={12}
                note={funnelNote(rows)}
                action={
                  <button type="button" className="an-sharebtn" ref={shareBtn}
                    onClick={() => setShareOpen(true)} aria-haspopup="dialog">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 15 V4" /><path d="M8 7.5 L12 3.5 L16 7.5" /><path d="M5 12 v7 h14 v-7" />
                    </svg>
                    Share card
                  </button>
                }
              >
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

            {/* ⚠️ THE PANEL IS ABSENT WHEN IT HAS NOTHING TO SAY, rather than present and empty.
                Every other panel on this page reports on history, which always exists once there
                are queries; this one reports on the next four weeks, which can genuinely be
                empty — and a full-width band saying "nothing" is a worse answer than no band. */}
            {horizonWorthShowing(rows, nowMs) ? (
              <PanelRow>
                <Panel icon="calendar" title="On the horizon" span={12} note={horizonNote(rows, nowMs)}>
                  <Horizon rows={rows} nowMs={nowMs} />
                </Panel>
              </PanelRow>
            ) : null}

            <PanelRow>
              <Panel icon="pages" title="Fulls under consideration" span={5} note={fullsNote(rows, nowMs)}>
                <FullsPanel rows={rows} nowMs={nowMs} />
              </Panel>
              <Panel icon="mail" title="Latest responses" span={7} note={latestResponsesNote(rows)}>
                <LatestResponses rows={rows} />
              </Panel>
            </PanelRow>
          </>
        )}
      </WorkspacePageGrid>

      {/* ⚠️ FOCUS GOES BACK TO THE BUTTON THAT OPENED IT. A dialog that closes and leaves focus on
          the document body drops a keyboard user at the top of the page. */}
      {shareOpen && manuscript ? (
        <ShareCard
          rows={rows}
          manuscriptTitle={manuscript.title}
          nowMs={nowMs}
          onClose={() => { setShareOpen(false); shareBtn.current?.focus(); }}
        />
      ) : null}
    </div>
  );
};

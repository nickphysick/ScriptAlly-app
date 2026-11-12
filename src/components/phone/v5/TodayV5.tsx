/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A — TODAY AS THE HUB (design-refs/phone-app-v5/phone-hub-v5.html): v4's Today (below) with a tab
 * strip under its lead card — Queries · Agents · Activity — that pins under the slim bar (V5TabStrip). The chosen tab is
 * remembered for the session and set by the address (`/queries` → Queries, `/agents` → Agents, via `?tab=`).
 *   - Queries: v4.1's Birds-eye card, "Your move" (v4's inbox rows for the queries with you), "See all queries" (pushed);
 *   - Agents (Phase C, AgentsTabV5): the summary, List health with Housekeeping's groups and the gap-filling sheet,
 *     Next to query, "See all N agents" and Discover;
 *   - Activity: v4's Lately feed only (the founding writer card is on Profile).
 * Phase B: the header is v5's (TodayHeaderV5: "Today", the day of the campaign, the need pill that opens To do, the
 * active figure, the chart with the Mentor), and the Queries tab's Birds-eye block is v5's (BirdsBlockV5, on the page).
 * Up next's lead card has left Today: its tasks are To do's (the need pill and the dock badge open them there). Only
 * day one keeps a card above the tabs. v4's "straight after a task" and "quiet day" cards existed only as the lead
 * card's states, so they are retired with it.
 *
 * Phone app v4 — TODAY (design-refs/phone-app-v4/phone-app-v4-today.html, four states). The Mentor leans on the header's
 * right edge; the journey track counts the Analytics page's own four rungs; the first card is the To-do workspace's
 * own first task (v3's `ordered`, the same order and count as the desktop board).
 *
 * The state is read from data alone (PA4-4; `data-state`): everyday (there are tasks), a quiet day (queries, no task),
 * day one (no queries at all — the one state with a card above the tabs).
 * ⚠️ List health hides at 100% with nothing to fill (AgentsTabV5).
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { V3Glyph } from "../v3/V3Parts";
import { openV3, openV3Query } from "../v3/v3Store";
import { courtRows } from "../../../lib/phoneV3";
import { buildRows } from "../../../lib/analytics";
import { dayN, firstSentMs, streakLine } from "../../../lib/phoneV4";
import { activeSeries, weekChange } from "../../../lib/phoneV41";
import { feedEntries } from "../../../lib/dashFeed";
import { dayMonth } from "../../../lib/dates";
import { QueryStatus, type Activity } from "../../../types";
import { Chev, Cta, LapCard as LapCard0, Link4 } from "../v4/V4Parts";
import { QRowV4 } from "../v4/QueriesV4";
import { V5TabStrip } from "./V5Tabs";
import { AgentsTabV5 } from "./AgentsTabV5";
import { openFeedbackSheet } from "./FeedbackSheetV5";
import { TodayHeaderV5 } from "./TodayHeaderV5";
import { BirdsBlockV5 } from "./BirdsBlockV5";
import { QUERIES_ALL_PATH } from "../../../lib/phoneV3Nav";
import { TODAY_TAB_KEY, TODAY_TABS, feedbackAbout, isTodayTab, readTab, saveTab, type TodayTab } from "../../../lib/phoneV5";

import { todayState } from "../v4/todayState";
import "../v4/phoneV4.css";
import "./phoneV5.css";

/* v4.1: Today's first card sits below the header — nothing overlaps the chart's months (PA41-4) */
const LapCard: React.FC<React.ComponentProps<typeof LapCard0>> = ({ style, ...p }) => <LapCard0 {...p} style={{ marginTop: 16, ...style }} />;

export const TodayV5: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
  const navigate = useNavigate();
  const loc = useLocation();
  /* the chosen tab: this session's last, or the one the address names (`?tab=`, which is then dropped from the address) */
  const [tab, setTab] = useState<TodayTab>(() => readTab(TODAY_TAB_KEY, isTodayTab, "queries"));
  const pick = (t: TodayTab) => { setTab(t); saveTab(TODAY_TAB_KEY, t); };
  /* a door that names a tab (the address, "See who's next to query") also brings the strip up to its pinned place */
  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    if (loc.pathname !== "/dashboard") return;
    const p = new URLSearchParams(loc.search);
    const asked = p.get("tab");
    if (!isTodayTab(asked)) return;
    setTab(asked); saveTab(TODAY_TAB_KEY, asked); setReveal((n) => n + 1);
    p.delete("tab");
    navigate({ pathname: loc.pathname, search: p.toString() ? `?${p}` : "", hash: loc.hash }, { replace: true });
  }, [loc.pathname, loc.search, loc.hash, navigate]);
  const v = useV3Data();
  const now = v.now;
  const { queries, agents, activities, manuscripts, currentUser } = v.core.db;

  const rows = useMemo(() => buildRows(queries, activities as Activity[], agents, now), [queries, activities, agents, now]);
  const first = useMemo(() => firstSentMs(rows), [rows]);
  const streak = useMemo(() => streakLine(rows, currentUser?.queryingGoals, now), [rows, currentUser?.queryingGoals, now]);
  const c = v.counts;
  /* a DEV-ONLY review aid (PA4-4): `window.__SA_PA4_TODAY = { tasks: 0 | queries: 0 | healthPct }` feeds the same
     derivations emptied inputs, so the measurement can render each of Today's states. The MODE test is at the call site,
     so a production build folds it away. */
  const aid: { tasks?: number; queries?: number; healthPct?: number } | null = import.meta.env.MODE !== "production" && typeof window !== "undefined"
    ? ((window as unknown as { __SA_PA4_TODAY?: { tasks?: number; queries?: number; healthPct?: number } }).__SA_PA4_TODAY ?? null) : null;
  const tasks = aid?.tasks === 0 ? [] : v.ordered;
  const state = todayState(aid?.queries === 0 ? 0 : v.qs.length, tasks.length, false);


  const feed = useMemo(() => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now: new Date(now), seenAt: null, honestDates: true })
    .filter((e) => !e.app).slice(0, 4)), [loading, activities, queries, agents, manuscripts, now]);

  /* the header (v5): the need pill opens To do, where Up next's tasks now are */
  const series = useMemo(() => activeSeries(queries, now), [queries, now]);
  const hero = (
    <TodayHeaderV5 day={first != null ? `Day ${dayN(first, now)} of your campaign` : "Getting started"} streakWeeks={streak.weeks}
      active={c.active} change={weekChange(series)} need={tasks.length} series={series} dayOne={state === "dayone"}
      onNeed={() => navigate("/todo")} onFeedback={() => openFeedbackSheet(feedbackAbout("/dashboard", { today: tab }))} onSearch={() => openV3({ type: "search" })} />
  );

  /* ── above the tabs: only day one keeps a card (no queries yet) ── */
  let lead: React.ReactNode = null;
  if (state === "dayone") {
    lead = (
      <LapCard pa4="dayone">
        <div className="pa4-s" style={{ marginBottom: 16 }}>Start here</div>
        <h2 className="pa4-h" style={{ marginBottom: 8 }}>Who have you queried so far?</h2>
        <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>Log one now and this page starts keeping track.</p>
        <Cta pa4="log-first" onClick={() => openV3({ type: "plus" })}>Log your first query</Cta>
        <div style={{ marginTop: 16, borderTop: "1px solid var(--pa-rule)" }}>
          <button type="button" className="pa4-tap" data-pa4="import" onClick={() => navigate("/import")}>
            <V3Glyph status={QueryStatus.QUERIED} size={40} label={false} /><span className="pa4-x pa4-b">Bring your spreadsheet across</span><Chev />
          </button>
          <button type="button" className="pa4-tap" data-pa4="add-agents" onClick={() => openV3({ type: "add" })}>
            <V3Glyph status={QueryStatus.QUERIED} size={40} label={false} /><span className="pa4-x pa4-b">Add agents you plan to query</span><Chev />
          </button>
        </div>
      </LapCard>
    );
  }

  /* ── the three tabs ── */
  const mine = useMemo(() => courtRows(v.qs, "you"), [v.qs]);
  const hasQueries = aid?.queries === 0 ? false : v.qs.length > 0;
  let panel: React.ReactNode = null;
  if (tab === "queries") {
    panel = (<>
      <div className="pa4-inset" style={{ paddingTop: 16 }}>
        {/* v5: the Birds-eye block, straight on the page; absent with nothing open (day one shows above the tabs) */}
        {hasQueries && c.active > 0 ? <BirdsBlockV5 qs={v.qs} c={c} nowMs={now} /> : null}
      </div>
      {mine.length ? (<>
        <div className="pa4-grp" data-pa5="your-move"><h2 className="pa4-h">Your move</h2><span className="pa4-s">{mine.length}</span></div>
        {mine.map((q) => <QRowV4 key={q.id} q={q} now={now} />)}
      </>) : null}
      <div className="pa4-inset">
        <Link4 sb pa4="all-queries" data-pa5="all-queries" onClick={() => navigate(QUERIES_ALL_PATH)}>See all queries</Link4>
      </div>
    </>);
  } else if (tab === "agents") {
    panel = <AgentsTabV5 />;
  } else {
    panel = (
      <div className="pa4-inset">
        <div className="pa4-sec" style={{ margin: "32px 8px 8px" }}><h2 className="pa4-h">Lately</h2></div>
        <div style={{ padding: "0 8px" }} data-pa4="lately">
          {feed.length ? feed.map((e) => {
            const name = e.say.find((x) => x.who)?.t;
            return (
              <button key={e.id} type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa4="feed-row" onClick={() => { if (e.queryId) openV3Query(e.queryId); }}>
                <V3Glyph status={e.status} size={40} label={false} />
                <span className="pa4-x"><b>{name ?? e.say.map((x) => x.t).join("")}</b><span className="pa4-s">{name ? e.say.map((x) => x.t).join("") : e.provenance}</span></span>
                <span className="pa4-s pa4-T">{dayMonth(e.at)}</span>
              </button>
            );
          }) : <p className="pa4-b pa4-empty">Nothing logged yet.</p>}
          <Link4 rule pa4="all-replies" onClick={() => navigate("/queries/responses")}>See all replies</Link4>
          <div style={{ height: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pa4 pa4-today pa5" data-pa5="today" data-pa4="today" data-state={state} data-tasks={tasks.length} data-loading={loading ? "1" : "0"} data-tab={tab}>
      {hero}
      {loading || !lead ? null : <div data-pa41="lead">{lead}</div>}
      {loading ? null : (
        <V5TabStrip page="today" tabs={TODAY_TABS} value={tab} onPick={pick} label="Today" reveal={reveal}>
          {panel}
        </V5TabStrip>
      )}
    </div>
  );
};

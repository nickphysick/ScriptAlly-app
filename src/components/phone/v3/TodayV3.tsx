/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — TODAY (ref `vToday`): the compact navy hero, the tasks, Lately, Corkboard, the one-row beta notice.
 * `/dashboard` (and `/todo`, which lands here) on a phone; the desktop dashboard is untouched.
 *
 * ⚠️ EVERY FIGURE IS AN EXISTING ONE.
 *    - The hero's line is the dashboard chart's own weekly ledger (`dailyLedger` → `aggregateLedger`): Active its
 *      closing stock, Sent its running total of sends. Replies is the Responses page's own replies (`respItems`, asked
 *      for more or passed), counted up to each week's end. The big figure is the line's last point, as in the ref.
 *    - The three-part bar is lib/phoneV3's courts — the same counts as the Queries chips (PA3-4).
 *    - The tasks are the desktop To-do workspace's own (useV3 → useWsCore), in its order and groups. A row opens the
 *      query sheet; the verb opens the app's own phone task screen (`PhoneTaskScreen`) for that task.
 *    - Lately is the desktop activity feed's newest four entries (`feedEntries`, `honestDates`).
 *    - Corkboard is the Corkboard page's own notes (`sortNotes`).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV3 } from "./useV3";
import { HAWK_SRC, Spark, TaskRowV3, V3Glyph } from "./V3Parts";
import { V3I } from "./v3Icons";
import { taskLine } from "../../../lib/phoneV3";
import { aggregateLedger, dailyLedger } from "../../../lib/oneScreen";
import { respItems } from "../../../lib/responses";
import { feedEntries } from "../../../lib/dashFeed";
import { sortNotes } from "../../../lib/noteboard";
import { dayMonth } from "../../../lib/dates";
import { openFeedback } from "../../../lib/feedbackStore";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import { openV3Query } from "./v3Store";
import type { Query } from "../../../types";
import "./phoneV3.css";

export type HeroKind = "active" | "sent" | "replies";
const HERO_LABEL: Record<HeroKind, string> = { active: "active queries", sent: "queries sent", replies: "replies from agents" };
const HERO_WEEKS = 31;

/** the hero's weekly line, oldest first, ending this week */
export function heroSeries(kind: HeroKind, queries: readonly Query[], replyMs: readonly number[], now: Date): number[] {
  const weekly = aggregateLedger(dailyLedger(queries as Query[], now), "weekly");
  let run = 0;
  const all = weekly.map((w) => {
    if (kind === "active") return w.active;
    if (kind === "sent") return (run += w.sent);
    const end = w.end.getTime();
    return replyMs.filter((t) => t <= end).length;
  });
  return all.slice(-HERO_WEEKS);
}

export const TodayV3: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());
  const v = useV3(now);
  const { queries, agents, activities, manuscripts, userTasks } = v.core.db;
  const [hero, setHero] = useState<HeroKind>("active");
  const [open, setOpen] = useState<string | null>(null);
  const [houseOpen, setHouseOpen] = useState(false);

  const replyMs = useMemo(() => respItems(v.qs.map((q) => q.row))
    .filter((i) => i.group === "more" || i.group === "passed").map((i) => i.answerMs).filter((t): t is number => t != null), [v.qs]);
  const series = useMemo(() => heroSeries(hero, queries, replyMs, new Date(now)), [hero, queries, replyMs, now]);
  const num = series.length ? series[series.length - 1] : 0;
  const c = v.counts;

  const feed = useMemo(() => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now: new Date(now), seenAt: null, honestDates: true })
    .filter((e) => !e.app).slice(0, 4)), [loading, activities, queries, agents, manuscripts, now]);
  const notes = useMemo(() => sortNotes(userTasks), [userTasks]);

  const goCourt = (k: "you" | "agent" | "quiet") => navigate(`/queries?court=${k}`);
  const total = v.ordered.length;

  return (
    <div className="pa3 pa3-today" data-pa3="today" data-loading={loading ? "1" : "0"} data-tasks={total}>
      <div className="pa3-hero" data-pa3="hero" data-kind={hero}>
        <div className="pa3-tg" role="group" aria-label="Show">
          {(["active", "sent", "replies"] as HeroKind[]).map((k) => (
            <button key={k} type="button" className={hero === k ? "on" : ""} aria-pressed={hero === k} data-pa3="hero-kind" data-k={k} onClick={() => setHero(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="pa3-big"><b data-pa3="hero-num">{num}</b><span>{HERO_LABEL[hero]}</span></div>
        <Spark values={series} />
        <div className="pa3-split" aria-hidden="true">
          <i style={{ flex: c.you, background: "var(--pa-blush)" }} />
          {/* ref #8fa3bf → nearest token --pa-st-slate; ref #c9c1b4 → nearest token --pa-st-grey */}
          <i style={{ flex: c.agent, background: "var(--pa-st-slate)" }} />
          <i style={{ flex: c.quiet, background: "var(--pa-st-grey)" }} />
        </div>
        <div className="pa3-legend">
          <button type="button" data-pa3="court" data-k="you" data-count={c.you} onClick={() => goCourt("you")}><b>{c.you}</b><i style={{ background: "var(--pa-blush)" }} /><span>With you</span></button>
          <button type="button" data-pa3="court" data-k="agent" data-count={c.agent} onClick={() => goCourt("agent")}><b>{c.agent}</b><i style={{ background: "var(--pa-st-slate)" }} /><span>With the agent</span></button>
          <button type="button" data-pa3="court" data-k="quiet" data-count={c.quiet} onClick={() => goCourt("quiet")}><b>{c.quiet}</b><i style={{ background: "var(--pa-st-grey)" }} /><span>Gone quiet</span></button>
        </div>
      </div>

      <div className="pa3-page" data-pa3="today-page">
        {loading ? null : total === 0 ? (
          <div className="pa3-card" data-pa3="caught-up">
            <div className="pa3-empty"><img src={HAWK_SRC} alt="" /><b>You’re all caught up.</b>Nothing needs you today. When an agent replies, tap the plus button to log it.</div>
          </div>
        ) : v.groups.map((g) => {
          const shut = g.folded && !houseOpen;
          return (
            <React.Fragment key={g.id}>
              <div className="pa3-sec" data-pa3="group" data-k={g.id}><h2 className="pa3-h2">{g.name}</h2><span className="pa3-n">{g.tasks.length}</span></div>
              <div className="pa3-card" data-pa3="group-card" data-k={g.id}>
                {g.tasks.map((t) => {
                  const q = t.query ? v.byId.get(t.query.id) ?? null : null;
                  return (
                    <TaskRowV3 key={t.key} t={t} line={taskLine(t, q)} status={t.query?.status ?? null} hidden={shut}
                      onOpen={() => (t.query ? openV3Query(t.query.id) : setOpen(t.key))} onVerb={() => setOpen(t.key)} />
                  );
                })}
                {g.folded ? (
                  <button type="button" className="pa3-fold" data-pa3="fold" aria-expanded={!shut} onClick={() => setHouseOpen((o) => !o)}>
                    {shut ? `Show ${g.tasks.length}` : "Fold away"}
                  </button>
                ) : null}
              </div>
            </React.Fragment>
          );
        })}

        <div className="pa3-sec"><h2 className="pa3-h2">Lately</h2><button type="button" className="pa3-more" data-pa3="all-replies" onClick={() => navigate("/queries/responses")}>All replies</button></div>
        <div className="pa3-card pa3-feed" data-pa3="lately">
          {feed.length ? feed.map((e) => (
            <div key={e.id} className="pa3-row" role="button" tabIndex={0} data-pa3="feed-row"
              onClick={() => { if (e.queryId) openV3Query(e.queryId); }} onKeyDown={(k) => { if (k.key === "Enter" && e.queryId) openV3Query(e.queryId); }}>
              <V3Glyph status={e.status} size={32} />
              <span className="pa3-tx"><span className="pa3-t">{e.say.map((s) => s.t).join("")}</span>{e.provenance ? <span className="pa3-s">{e.provenance}</span> : null}</span>
              <span className="pa3-r">{dayMonth(e.at)}</span>
            </div>
          )) : <div className="pa3-empty">Nothing logged yet.</div>}
        </div>

        <div className="pa3-sec"><h2 className="pa3-h2">Corkboard</h2><span className="pa3-n">{notes.length}</span><button type="button" className="pa3-more" data-pa3="cork-open" onClick={() => navigate("/todo/corkboard")}>Open</button></div>
        <div className="pa3-card" data-pa3="cork">
          {notes.length ? notes.slice(0, 2).map((n) => (
            <button key={n.id} type="button" className="pa3-row" style={{ minHeight: 50 }} data-pa3="note" onClick={() => navigate("/todo/corkboard")}>
              <span className="pa3-pinic"><V3I n="pin" /></span>
              <span className="pa3-tx"><span className="pa3-t" style={{ fontWeight: 500, fontSize: 14.5 }}>{n.text}</span></span>
            </button>
          )) : <div className="pa3-empty">Nothing pinned.</div>}
        </div>

        <button type="button" className="pa3-beta" data-pa3="beta" onClick={() => openFeedback()}>
          <b>BETA</b><span>You’re using QueryHawk before it’s finished. Found a rough edge? Tell us.</span>
        </button>
      </div>

      {open ? <PhoneTaskScreen core={v.core} tasks={v.ordered} startKey={open} now={now} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settled desk's lower half: "The story so far" and "Dates for the diary" side by side, with
 * "Live pipeline" full-width beneath (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ THE TIMELINE IS INLINE NOW, NOT A DRAWER. It used to live behind a right-edge pull tab —
 * furniture you had to discover, holding the page's only narrative. Inline it is simply the left
 * column of the row below the stats, and it is shorter for it: a fortnight of events, five at a
 * time, with the full story living on each query where it belongs.
 */
import React from "react";
import { Activity, Agent, Manuscript, Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { DeskCard } from "./DeskCard";
import { diaryWeek, emptyDayLine } from "../../lib/deskWeek";
import { deriveFortnightEvents, FEvent, fmtDayMonth } from "./fortnightEvents";
import { activeStageBreakdown, STAGE_LABEL } from "../../lib/dashboardStats";
import "./deskBelow.css";

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayHeading = (d: Date) => `${WD_SHORT[d.getDay()]} ${fmtDayMonth(d)}`;
const timeOf = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "");

/** How many events the card shows before deferring to the full timeline. */
export const STORY_LIMIT = 5;

/* ══════════════ THE STORY SO FAR ══════════════ */

export const StoryCard: React.FC<{
  queries: Query[]; agents: Agent[]; manuscripts: Manuscript[]; activities: Activity[];
  onOpenTimeline: () => void; now?: Date;
}> = ({ queries, agents, manuscripts, activities, onOpenTimeline, now = new Date() }) => {
  const all = deriveFortnightEvents(queries, agents, manuscripts, activities, now)
    .filter((e) => e.date.getTime() <= now.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const shown = all.slice(0, STORY_LIMIT);

  return (
    <DeskCard
      title="The story so far"
      pill={<span className="dk-pill">This fortnight · {all.length} {all.length === 1 ? "event" : "events"}</span>}
      foot={
        <>
          <span className="dk-lbl">The full story lives on each query</span>
          <button type="button" className="dk-link" onClick={onOpenTimeline}>Open the timeline →</button>
        </>
      }
    >
      {shown.length === 0 ? (
        <div className="dk-empty">The story starts with your first query.</div>
      ) : (
        shown.map((e, i) => (
          <React.Fragment key={e.id}>
            {(i === 0 || dayHeading(e.date) !== dayHeading(shown[i - 1].date)) && (
              <div className="db-tlday dk-lbl">{dayHeading(e.date)}</div>
            )}
            <div className="db-tlev">
              {/* the thread rail — a real StatusDot where the event has one, never a recreation */}
              <div className="db-thread">
                {e.marker.kind === "status"
                  ? <StatusDot status={e.marker.status} overrideSize={12} decorative />
                  : <span className="db-tldot" aria-hidden="true" />}
                <span className="db-tlline" aria-hidden="true" />
              </div>
              <div className="db-cardlet">
                <div className="db-cl-left">
                  <div className="db-who">{e.title}</div>
                  <div className="db-cap">{[e.agency, e.manuscript].filter(Boolean).join(" · ")}</div>
                </div>
                <span className={`db-st${e.urgency === "elapsed" ? " hot" : e.urgency === "upcoming" ? " sg" : ""}`}>{e.line}</span>
                <span className="db-tm">{timeOf(e.date)}</span>
              </div>
            </div>
          </React.Fragment>
        ))
      )}
    </DeskCard>
  );
};

/* ══════════════ DATES FOR THE DIARY ══════════════ */

/** Burgundy where the move is yours, sage where you are waiting. */
const markerTone = (e: FEvent) => (e.urgency === "elapsed" || e.type === "pages_due" || e.type === "pages_overdue" ? "b" : "s");

export const DiaryCard: React.FC<{
  queries: Query[]; agents: Agent[]; manuscripts: Manuscript[]; activities: Activity[]; now?: Date;
}> = ({ queries, agents, manuscripts, activities, now = new Date() }) => {
  const week = diaryWeek(deriveFortnightEvents(queries, agents, manuscripts, activities, now), now);

  return (
    <DeskCard title="Dates for the diary" pill={<span className="dk-pill">This week</span>} bare>
      <div className="db-dibody">
        {week.map((d) => (
          <div key={d.date.toISOString()} className={`db-dirow${d.isToday ? " today" : ""}${d.isPast ? " past" : ""}`}>
            <span className="db-dw">{d.weekday}</span>
            <span className="db-dn">{d.dayLabel}</span>
            <div className="db-what">
              {d.events.length === 0 ? (
                <em className="dk-empty">{emptyDayLine(d)}</em>
              ) : (
                d.events.map((e) => (
                  <div className="db-due" key={e.id}>
                    <i className={markerTone(e)} aria-hidden="true" />
                    {e.title} — {e.line}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </DeskCard>
  );
};

/* ══════════════ LIVE PIPELINE ══════════════ */

export const PipelineCard: React.FC<{
  queries: Query[]; agents: Agent[]; manuscripts: Manuscript[];
}> = ({ queries, agents, manuscripts }) => {
  /* ⚠️ THE BAND'S COUNTS ARE THE SAME DERIVATION THE TREND'S BREAKDOWN USES. Two stage tallies on
     one page, computed two ways, is how they come to disagree. */
  const stages = activeStageBreakdown(queries);
  const live = queries.filter((q) => q.status === QueryStatus.FULL_SENT || q.status === QueryStatus.PARTIAL_SENT);
  const agentOf = (id?: string) => agents.find((a) => a.id === id);
  const msOf = (id?: string) => manuscripts.find((m) => m.id === id);

  return (
    <DeskCard
      title="Live pipeline"
      bandExtra={
        <div className="db-pstages">
          {stages.map((s) => (
            <span key={s.status} className={`db-pstage${s.count > 0 ? " hot" : ""}`}>
              <StatusDot status={s.status} overrideSize={11} ghost={s.count === 0} decorative />
              {s.label}
              <b>{s.count}</b>
            </span>
          ))}
        </div>
      }
      bare
    >
      <div className="db-prows">
        {live.length === 0 ? (
          <div className="dk-empty" style={{ padding: "14px 18px" }}>Nothing out with an agent just now.</div>
        ) : (
          live.map((q) => {
            const a = agentOf(q.agentId);
            const m = msOf(q.manuscriptId);
            return (
              <div className="db-prow" key={q.id}>
                <StatusDot status={q.status} overrideSize={12} decorative />
                <span className="db-pnm">{a?.name || a?.agency || "The agent"}</span>
                <span className="db-pmeta">{[a?.agency, m?.title].filter(Boolean).join(" · ")}</span>
                <span className="db-pwhen">{STAGE_LABEL[q.status].toLowerCase()}</span>
              </div>
            );
          })
        )}
      </div>
    </DeskCard>
  );
};

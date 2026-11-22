/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STREAKS & GOALS ON A PHONE (Phone app v2, Part 7D; ref design-refs/phone-app-v2/src/restv.js `PAGES.goals` at GLV B).
 * `/goals`, a phone page; on a computer the route sends you to the dashboard until a desktop page is designed.
 *
 * ⚠️ IT STORES NOTHING NEW. The goal is the writer's own (`deriveGoalProgress` over `queryingGoals`, the append-only
 * entries); tapping the ring opens the existing `GoalTargetSheet`, whose one write (`appendGoalEntry` →
 * `updateUserProfile`) is the dashboard's. The streak and the milestones are `lib/milestones` over `buildRows`, derived
 * on every read. The ranks are the founding card's own (`useFoundingStats`, `TIERS`, `cardTier`, `nextStep`).
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { buildRows } from "../../../lib/analytics";
import { deriveGoalProgress, appendGoalEntry, nextPeriodStart } from "../../../lib/queryingGoals";
import type { GoalCadence } from "../../../types";
import { milestones, weekStreak } from "../../../lib/milestones";
import { cardTier, TIERS, useFoundingStats } from "../../../lib/foundingStats";
import { nextStep } from "../../../lib/foundingCard";
import { dayMonth, formatDate } from "../../../lib/dates";
import { GoalTargetSheet } from "../../dashboard/GoalTargetSheet";
import { usePhoneBandSlot } from "../phoneBandStore";
import { PhoneDisc } from "../PhoneDisc";
import { PI } from "../phoneIcons";
import "./pagesPhone.css";

const OF: Record<GoalCadence, string> = { week: "This week’s goal", fortnight: "This fortnight’s goal", month: "This month’s goal" };
const R = 38, C = 2 * Math.PI * R;
/** "9 Jul", with the year when it is not this year — a badge set spanning two years must not read out of order */
const when = (ms: number, nowMs: number) => (new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? dayMonth(ms) : formatDate(ms, { day: "numeric", month: "short", year: "numeric" }));
const dotLabel = (day: string, i: number, all: string[]) => {
  const d = new Date(`${day}T12:00:00Z`);
  const prev = i ? new Date(`${all[i - 1]}T12:00:00Z`) : null;
  return !prev || prev.getUTCMonth() !== d.getUTCMonth() ? dayMonth(d) : String(d.getUTCDate());
};

export const GoalsPhone: React.FC = () => {
  const { queries, activities, agents, currentUser, updateUserProfile } = useScriptAllyDb();
  const [sheet, setSheet] = useState(false);
  const founding = useFoundingStats(currentUser?.id ?? null);
  const m = useMemo(() => {
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const rows = buildRows(queries, activities, agents, nowMs);
    return {
      now, nowMs,
      goal: deriveGoalProgress(queries, currentUser?.queryingGoals ?? [], now),
      streak: weekStreak(rows.map((r) => r.sentMs), currentUser?.queryingGoals, nowMs),
      badges: milestones(rows),
    };
  }, [queries, activities, agents, currentUser?.queryingGoals]);

  usePhoneBandSlot("/goals", null, []);
  const g = m.goal;
  const weeks = m.streak.weeks.slice(-7);
  const days = weeks.map((w) => w.start);
  const earned = m.badges.filter((b) => b.earned).length;
  const tier = cardTier(founding.stats);
  const left = g.target != null ? Math.max(0, g.target - g.count) : null;
  const frac = g.target ? Math.min(1, g.count / g.target) : 0;
  const write = async (next: { target: number; cadence: GoalCadence }) => {
    await updateUserProfile({ queryingGoals: appendGoalEntry(currentUser?.queryingGoals, next, m.now) });
  };

  return (
    <div className="pa-pg" data-pa="goals">
      <div className="pa-pgbody">
        <button type="button" className="pa-card pa-goal" data-pa="goal-ring" data-count={g.count} data-target={g.target ?? ""} onClick={() => setSheet(true)}>
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
            <circle cx="46" cy="46" r={R} fill="none" stroke="var(--pa-fill)" strokeWidth="10" />
            {g.target && g.count > 0 ? <circle cx="46" cy="46" r={R} fill="none" stroke="var(--pa-navy)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 46 46)" /> : null}
            <text x="46" y="53" textAnchor="middle" className="pa-goaltxt">{g.target ? `${g.count}/${g.target}` : g.count}</text>
          </svg>
          <span className="pa-goalw">
            <span className="pa-sub">{g.cadence ? OF[g.cadence] : "No goal set"}</span>
            <span className="pa-goalbig" data-pa="goal-left">
              {left == null ? "Set a weekly goal" : left === 0 ? "Goal reached" : `${left} more ${left === 1 ? "query" : "queries"}`}
            </span>
            <span className="pa-sub">{g.cadence ? (g.cadence === "week" ? "Resets on Monday" : `Resets on ${nextPeriodStart(g.cadence, m.now)}`) : `${g.count} sent this month`}</span>
          </span>
        </button>

        <div className="pa-card pa-mt12" data-pa="goal-streak" data-current={m.streak.current} data-best={m.streak.best}>
          <div className="pa-strhead">
            <b>{PI.flame}{m.streak.current ? `${m.streak.current}-week streak` : "No current streak"}</b>
            <span className="pa-sub">Best: {m.streak.best} {m.streak.best === 1 ? "week" : "weeks"}</span>
          </div>
          <div className="pa-wdots">
            {weeks.map((w, i) => (
              <div key={w.start} className="pa-wdcol">
                <span className={`pa-wdot${w.met ? " on" : ""}${w.current ? " now" : ""}`} data-pa="goal-week" data-start={w.start} data-met={w.met ? "1" : "0"} data-count={w.count}>{w.met ? PI.check : null}</span>
                <div className="pa-sub pa-wdl">{dotLabel(w.start, i, days)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pa-shd"><h2 className="pa-h2">Milestones</h2><span className="pa-shn" data-pa="goal-earned">{earned} of {m.badges.length}</span></div>
        <div className="pa-bgrid">
          {m.badges.map((b) => (
            <div key={b.key} className={`pa-badge${b.earned ? "" : " off"}`} data-pa="goal-badge" data-k={b.key} data-earned={b.earned ? "1" : "0"} data-at={b.atMs ?? ""}>
              <PhoneDisc status={b.status} size={44} />
              <b>{b.label}</b>
              <span className="pa-sub">{b.earned ? (b.atMs != null ? when(b.atMs, m.nowMs) : "Reached") : b.progress}</span>
            </div>
          ))}
        </div>

        <div className="pa-shd"><h2 className="pa-h2">Founding writer ranks</h2></div>
        <div className="pa-card" data-pa="goal-ranks" data-tier={tier}>
          <div className="pa-ranks">
            {TIERS.map((t, i) => (
              <div key={t.key} className={`pa-rank${i === tier - 1 ? " on" : ""}`} data-pa="goal-rank" data-k={t.key}>
                <span className="pa-num pa-rankn">{i + 1}</span>
                <span className="pa-rankw">{t.name}</span>
              </div>
            ))}
          </div>
          {!founding.loading ? <p className="pa-sub pa-rankline" data-pa="goal-next">{nextStep(founding.stats)}</p> : null}
        </div>
      </div>
      {sheet ? (
        <div className="pa-layer">
          <GoalTargetSheet initialTarget={g.target ?? 3} initialCadence={g.cadence ?? "week"} now={m.now} onCommit={(next) => write(next)} onClose={() => setSheet(false)} />
        </div>
      ) : null}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156.1 §1 (design-refs/query-centre-v156-1.html) — THE STREAK LEADS the navy header's top right.
 *
 * ⚠️ HOW IT COUNTS (changed from v154): the run of consecutive weeks that met the target, counting back from this week.
 *    This week counts the moment its target is met (6 becomes 7 on the third query of a 3-a-week target); while it is
 *    not yet met it neither adds nor breaks; a completed week that missed breaks it. `weekGoal154.streak` is the run
 *    of completed weeks before this one (each against the target in force that week), so the streak here is that,
 *    plus one once this week is met.
 * ⚠️ QUERY CENTRE ONLY: `weekGoal154` (lib/qc154goal) is read by the Query Centre alone. The shared `weekStreak`
 *    (lib/milestones: the Dashboard's book card and the phone's Goals page) is not changed; it already counts this week
 *    once met, against a fallback target of 1 where the writer has set none (this page's fallback is 3).
 */
import type { WeekGoal154 } from "./qc154goal";

export interface StreakLead {
  /** the streak, this week included once met */
  k: number;
  /** the flame shows (and the line's dot is rust) while there is a streak */
  flame: boolean;
  title: string;
  line: string;
  /** the text alternative for the block's line chart */
  alt: string;
}

export const streakTitle = (k: number): string => (k > 0 ? `${k} week streak` : "No streak yet");
export const targetLineWords = (goal: number): string => `your target · ${goal} a week`;

export function streakLead(m: Pick<WeekGoal154, "streak" | "left" | "now" | "goal" | "weeks">): StreakLead {
  const met = m.left <= 0;
  const k = m.streak + (met ? 1 : 0);
  const line = k > 0
    ? (met ? "You’ve hit your target this week." : `${m.left} more this week to keep it going.`)
    : (m.now > 0 ? `${m.left} more this week starts one.` : `${m.goal} this week starts one.`);
  const title = streakTitle(k);
  return { k, flame: k > 0, title, line, alt: `${title}. ${line} Queries sent per week over the last ${m.weeks.length} weeks.` };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WEEKLY PULSE (Dashboard v59) — one answer per writer per ISO week, changeable within the week.
 *
 * Pure: the week key, the five weeks the panel draws, and the words. The client call and the read
 * live in `weeklyPulseClient.ts`, so this module stays free of Firebase for the unit suites.
 *
 * ⚠️ THE WEEK IS THE WRITER'S LOCAL DATE, MONDAY START (ISO 8601). The server validates the key it is
 * sent against its own date with a week's slack either side (`functions/src/weeklyPulseCore.ts`), so
 * a writer late on a Sunday in one timezone is not refused by a server already in Monday.
 */

export type Mood = 1 | 2 | 3 | 4;

export const MOODS: readonly { mood: Mood; label: string }[] = [
  { mood: 1, label: "Lost" },
  { mood: 2, label: "Meh" },
  { mood: 3, label: "Good" },
  { mood: 4, label: "Loving it" },
];
export const moodLabel = (m: Mood): string => MOODS.find((x) => x.mood === m)?.label ?? "";
export const isMood = (v: unknown): v is Mood => v === 1 || v === 2 || v === 3 || v === 4;

/** The ISO week of a local date, as `YYYY-Www`. */
export function isoWeekKey(d: Date): string {
  /* the Thursday of this week decides the year (ISO 8601) */
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (t.getDay() + 6) % 7; // Monday 0
  t.setDate(t.getDate() - dow + 3);
  const year = t.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const week = 1 + Math.round(((t.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The five weeks the history dots draw, oldest first: four weeks ago … this week. */
export function pulseWeeks(now: Date): string[] {
  return [28, 21, 14, 7, 0].map((back) => isoWeekKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)));
}

/** The dot's tooltip: "4 weeks ago: Meh", "Last week: Loving it", "This week". */
export function dotLabel(index: number, mood: Mood | null): string {
  const when = index === 4 ? "This week" : index === 3 ? "Last week" : `${4 - index} weeks ago`;
  if (index === 4) return mood ? `This week: ${moodLabel(mood)}` : "This week";
  return mood ? `${when}: ${moodLabel(mood)}` : `${when}: no answer`;
}

/** The document id for a writer's week. */
export const pulseDocId = (uid: string, week: string): string => `${uid}_${week}`;

/**
 * ⚠️ THE LOCAL ECHO. A week's answer is written here ONLY after the server has accepted it, so it is
 * a true record and never an optimistic one. It lets the panel open in its Noted state when the
 * server read is refused — the rules for `betaPulse` are Nick's to deploy, and until they are, every
 * read is denied.
 */
export const echoKey = (uid: string, week: string): string => `sa.pulse.${uid}.${week}`;
export function readEcho(uid: string, week: string): Mood | null {
  try {
    const v = Number(localStorage.getItem(echoKey(uid, week)));
    return isMood(v) ? v : null;
  } catch { return null; }
}
export function writeEcho(uid: string, week: string, mood: Mood): void {
  try { localStorage.setItem(echoKey(uid, week), String(mood)); } catch { /* private mode */ }
}

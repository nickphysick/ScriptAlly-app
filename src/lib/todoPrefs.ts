/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoPrefs — the four DESK BEHAVIOURS, as one stored object with pure readers (board-optimise
 * pack, Phase 5; ref design-refs/board-optimised.html §3).
 *
 * ⚠️ ONE FIELD ON THE USER DOC, NOT FOUR. `User.todoPrefs` is a single optional map — one rules
 * allowlist entry, one write path, one place to look. Four flat fields would each need their own
 * allowlist line and their own default, and the day a fifth behaviour arrives that is five more
 * chances to forget one (this repo has lost writes to exactly that omission before — see the
 * affectedKeys note in CLAUDE.md).
 *
 * ⚠️ EVERY READER GOES THROUGH `todoPrefs()`, WHICH IS TOTAL. An absent map, an absent field and
 * a nonsense value all resolve to the same stated default, so no consumer needs a `?? 12` of its
 * own — that is how two surfaces end up disagreeing about what "unset" means.
 */

export interface TodoPrefs {
  /** Months of silence before a query becomes housekeeping. */
  staleMonths: number;
  /** The Today column's gentle line — "a good day is {n}". Advice, never a block. */
  goodDay: number;
  /** At midnight, undone work moves to today (the calendar's roll-forward markers). */
  rollForward: boolean;
  /** Mondays, the weekly review briefing above the list. */
  weeklyBriefing: boolean;
}

/** ⚠️ THE DEFAULTS ARE THE BEHAVIOUR THE APP ALREADY HAD — a setting's arrival must not silently
 *  change anything for a writer who never opens it. 12 months is the existing close ceiling's
 *  spirit, 5 is the WIP line's own upper bound, and both behaviours shipped ON. */
export const TODO_PREFS_DEFAULT: TodoPrefs = {
  staleMonths: 12,
  goodDay: 5,
  rollForward: true,
  weeklyBriefing: true,
};

/** The bounds a stored value must sit inside — a corrupt or hostile value reads as the default
 *  rather than producing a board nobody can explain. */
export const STALE_MONTHS_CHOICES = [3, 6, 12, 18, 24] as const;
export const GOOD_DAY_MIN = 1;
export const GOOD_DAY_MAX = 12;

/** Total: absent map, absent field, or out-of-range → the stated default. */
export function todoPrefs(stored: Partial<TodoPrefs> | undefined | null): TodoPrefs {
  const s = stored ?? {};
  const staleMonths = (STALE_MONTHS_CHOICES as readonly number[]).includes(Number(s.staleMonths))
    ? Number(s.staleMonths) : TODO_PREFS_DEFAULT.staleMonths;
  const rawDay = Number(s.goodDay);
  const goodDay = Number.isFinite(rawDay) && rawDay >= GOOD_DAY_MIN && rawDay <= GOOD_DAY_MAX
    ? Math.round(rawDay) : TODO_PREFS_DEFAULT.goodDay;
  return {
    staleMonths,
    goodDay,
    rollForward: typeof s.rollForward === "boolean" ? s.rollForward : TODO_PREFS_DEFAULT.rollForward,
    weeklyBriefing: typeof s.weeklyBriefing === "boolean" ? s.weeklyBriefing : TODO_PREFS_DEFAULT.weeklyBriefing,
  };
}

/** The rows the sheet renders — each with the plain-spoken subtitle the ref specifies. */
export const TODO_PREF_ROWS = [
  { key: "staleMonths" as const, title: "Stale threshold", sub: "When a silent query becomes housekeeping" },
  { key: "goodDay" as const, title: "A good day is", sub: "The Today column’s gentle line" },
  { key: "rollForward" as const, title: "Roll unfinished work forward", sub: "At midnight, undone moves to today" },
  { key: "weeklyBriefing" as const, title: "Weekly review briefing", sub: "Mondays, above the list" },
];

/** "12 months" · "3 months" — the stale row's own value display. */
export function staleLabel(months: number): string {
  return `${months} month${months === 1 ? "" : "s"}`;
}

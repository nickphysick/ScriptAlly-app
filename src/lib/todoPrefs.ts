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
  /* ⚠️ `goodDay` IS RETIRED (tasks-consolidation P2 follow-up, 9 Aug) — the Today column it
     advised on is gone with the board, and a stored setting with no reader is the exact fault
     this map was built to end. Deliberately NOT left as an optional field: a key nothing writes
     and nothing reads is dormant code, and the revert-shaped alternative is what P6 taught. */
  /** At midnight, undone work moves to today (the calendar's roll-forward markers). */
  rollForward: boolean;
  /** Mondays, the weekly review briefing above the list. */
  weeklyBriefing: boolean;
  /**
   * ⚠️ WHICH TASK TYPES ARE GENERATED AT ALL — the sheet's half of the line the funnel draws the
   * other side of. Generation decides what EXISTS; the funnel decides what is SHOWN. A type turned
   * off here produces no card, so it is absent from the list, the meter, the footer and the pane
   * queue at once, because all four read the one array.
   *
   * ⚠️ NOTES HAVE NO ENTRY. A note the writer wrote is not the app's to suppress.
   * ⚠️ AND `decide` IS ALWAYS TRUE. An offer is not something a setting may hide; the sheet renders
   * its switch on and disabled with the reason stated, rather than greying it mysteriously.
   */
  types: Record<TaskTypeKey, boolean>;
}

/** the five generated kinds — `note` is deliberately absent (see `types`) */
export type TaskTypeKey = "send" | "decide" | "chase" | "close" | "fix";
export const TASK_TYPE_KEYS: TaskTypeKey[] = ["send", "decide", "chase", "close", "fix"];
/** the reviewed language, matching the filter menu — Nudge not Chase, Fill in not Fix */
export const TASK_TYPE_LABEL: Record<TaskTypeKey, string> = {
  send: "Send", decide: "Decide", chase: "Nudge", close: "Close", fix: "Fill in",
};
export const TASK_TYPE_GLOSS: Record<TaskTypeKey, string> = {
  send: "When an agent has asked for pages",
  decide: "When an offer of representation arrives",
  chase: "When a query passes the agent's stated window",
  close: "When a query has been silent past your threshold",
  fix: "When an imported query is missing its materials",
};

/** ⚠️ THE DEFAULTS ARE THE BEHAVIOUR THE APP ALREADY HAD — a setting's arrival must not silently
 *  change anything for a writer who never opens it. 12 months is the existing close ceiling's
 *  spirit, 5 is the WIP line's own upper bound, and both behaviours shipped ON. */
export const TODO_PREFS_DEFAULT: TodoPrefs = {
  staleMonths: 12,
  rollForward: true,
  weeklyBriefing: true,
  types: { send: true, decide: true, chase: true, close: true, fix: true },
};

/** The bounds a stored value must sit inside — a corrupt or hostile value reads as the default
 *  rather than producing a board nobody can explain. */
export const STALE_MONTHS_CHOICES = [3, 6, 12, 18, 24] as const;

/** Total: absent map, absent field, or out-of-range → the stated default. */
export function todoPrefs(stored: Partial<TodoPrefs> | undefined | null): TodoPrefs {
  const s = stored ?? {};
  const staleMonths = (STALE_MONTHS_CHOICES as readonly number[]).includes(Number(s.staleMonths))
    ? Number(s.staleMonths) : TODO_PREFS_DEFAULT.staleMonths;
  return {
    staleMonths,
    rollForward: typeof s.rollForward === "boolean" ? s.rollForward : TODO_PREFS_DEFAULT.rollForward,
    weeklyBriefing: typeof s.weeklyBriefing === "boolean" ? s.weeklyBriefing : TODO_PREFS_DEFAULT.weeklyBriefing,
    /* ⚠️ TOTAL, AND `decide` IS FORCED. A stored map from a future build cannot switch a type this
       one does not know about, and cannot turn offers off — the one value the sheet refuses to
       take an instruction on. Unknown keys are dropped; missing ones default to on. */
    types: TASK_TYPE_KEYS.reduce((acc, k) => {
      const v = (s.types ?? {})[k];
      acc[k] = k === "decide" ? true : (typeof v === "boolean" ? v : true);
      return acc;
    }, {} as Record<TaskTypeKey, boolean>),
  };
}

/** The rows the sheet renders — each with the plain-spoken subtitle the ref specifies. */
export const TODO_PREF_ROWS = [
  { key: "staleMonths" as const, title: "Stale threshold", sub: "When a silent query becomes housekeeping" },
  { key: "rollForward" as const, title: "Roll unfinished work forward", sub: "At midnight, undone moves to today" },
  { key: "weeklyBriefing" as const, title: "Weekly review briefing", sub: "Mondays, above the list" },
];

/** "12 months" · "3 months" — the stale row's own value display. */
export function staleLabel(months: number): string {
  return `${months} month${months === 1 ? "" : "s"}`;
}

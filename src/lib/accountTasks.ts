/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountTasks — what the Tasks settings section shows, derived from the fields that already exist.
 *
 * ⚠️ NO NEW FIELD AND NO NEW VOCABULARY. The page owns all four of `todoPrefs`'s values
 * (`rollForward`, `weeklyBriefing`, `staleMonths`, `types`) plus `mutedTaskRules`, and every label
 * it renders comes from the list the to-do board already reads. A settings page that invented its
 * own plain-English names would give the app two vocabularies for one set of tasks, and the writer
 * would meet both.
 */
import { TASK_TYPE_KEYS, TASK_TYPE_LABEL, TASK_TYPE_GLOSS, TaskTypeKey } from "./todoPrefs";
import { TASK_SETTING_ROWS } from "./taskSettings";

/* ── What appears on your list ─────────────────────────────────────────────── */

export interface TaskTypeRow {
  key: TaskTypeKey;
  label: string;
  gloss: string;
}

/**
 * ⚠️ `decide` IS NOT A TOGGLE, AND THAT IS THE WHOLE REASON THIS FUNCTION EXISTS. `todoPrefs`
 * forces it true — "the one value the sheet refuses to take an instruction on" — so a switch for
 * it would be a control that cannot act, which this build has already removed twice (the sessions
 * button, the author photo). It is stated as a plain line instead.
 */
export function optionalTaskTypes(): TaskTypeRow[] {
  return TASK_TYPE_KEYS
    .filter((k) => k !== "decide")
    .map((k) => ({ key: k, label: TASK_TYPE_LABEL[k], gloss: TASK_TYPE_GLOSS[k] }));
}

/** The line that stands in for the toggle `decide` cannot have. */
export const ALWAYS_ON_LINE = "Decisions you need to make always appear.";

/* ── Reminders you've switched off ─────────────────────────────────────────── */

export interface MutedRuleRow {
  key: string;
  label: string;
}

/**
 * One row per muted rule, named from the board's own list.
 *
 * ⚠️ AN UNRECOGNISED KEY IS STILL SHOWN, NOT DROPPED. A rule muted by an older build, or by one
 * this version does not know about, is still muting something — hiding it would leave a reminder
 * switched off with nowhere to switch it back on, which is the one outcome this section exists to
 * prevent. It is listed under its own key rather than silently disappearing.
 *
 * ⚠️ AND THERE IS NO DATE. `mutedTaskRules` is a bare `string[]`; nothing records WHEN a rule was
 * muted. The design ref draws "Switched off 12 August 2026" — a date the data cannot produce, and
 * inventing one would be a plausible number stating something untrue, which this repo has paid for
 * before. The rows say "Switched off" and stop.
 */
export function mutedRuleRows(muted: string[] | null | undefined): MutedRuleRow[] {
  const byKey = new Map(TASK_SETTING_ROWS.filter((r) => r.key).map((r) => [r.key as string, r.title]));
  return (muted ?? []).map((key) => ({ key, label: byKey.get(key) ?? key }));
}

/** Removing one key — the whole of "switch back on". */
export function unmute(muted: string[] | null | undefined, key: string): string[] {
  return (muted ?? []).filter((k) => k !== key);
}

export const MUTED_EMPTY_LINE =
  "Nothing switched off. When you switch a reminder off from the to-do list, it'll appear here so " +
  "you can bring it back.";

/* ── Your to-do list ───────────────────────────────────────────────────────── */

/** "3 months of waiting" … "24 months of waiting" — the real `STALE_MONTHS_CHOICES`, not the ref's
 *  invented list, and with no "Never" because the field cannot hold one. */
export const staleOptionLabel = (months: number): string => `${months} months of waiting`;

export const STALE_NOTE =
  "Long-waiting tasks drop to the back so your list leads with what's current. Nothing is deleted.";

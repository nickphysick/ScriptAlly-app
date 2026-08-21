/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountTasks — what the Tasks settings section shows, derived from the fields that already exist.
 *
 * ⚠️ NO NEW FIELD AND NO NEW VOCABULARY. The page owns the four `todoPrefs` values —
 * `rollForward`, `weeklyBriefing`, `staleMonths`, `types` — and every label it renders comes from
 * the list the to-do board already reads. A settings page that invented its own plain-English
 * names would give the app two vocabularies for one set of tasks, and the writer would meet both.
 *
 * ⚠️ `mutedTaskRules` IS NOT HERE ANY MORE. It is one of three kinds of hiding, and all three now
 * live together on the board's set-aside panel; a settings page owning one of them was how a
 * writer came to need to know WHICH kind before they knew where to look.
 */
import { TASK_TYPE_KEYS, TASK_TYPE_LABEL, TASK_TYPE_GLOSS, TaskTypeKey } from "./todoPrefs";

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

/* ── The muted-rule list left this module with the section ────────────────────
   ⚠️ `mutedRuleRows`, `unmute` and `MUTED_EMPTY_LINE` ARE GONE, and they are gone rather than kept
   "in case". They listed ONE of the three kinds of hiding the app has; the board's set-aside panel
   renders all three from `hiddenItems()`, which is the shape they should always have shared. A
   second, narrower derivation surviving beside it is how two surfaces come to disagree about what
   "hidden" means — which is the fault that put these rules in settings in the first place. */

/* ── Your to-do list ───────────────────────────────────────────────────────── */

/** "3 months of waiting" … "24 months of waiting" — the real `STALE_MONTHS_CHOICES`, not the ref's
 *  invented list, and with no "Never" because the field cannot hold one. */
export const staleOptionLabel = (months: number): string => `${months} months of waiting`;

export const STALE_NOTE =
  "Long-waiting tasks drop to the back so your list leads with what's current. Nothing is deleted.";

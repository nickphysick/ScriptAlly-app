/**
 * ══ THE ACTION KINDS, AND THE ONE DESK THAT IMPLEMENTS EACH (v65 §E ruling) ═══════════════════
 *
 * The ruling: **the desks are the shared component**. There is no Action sheet. `NudgeDesk`,
 * `MarkSentDesk`, `RespondDesk` and `MarkClosedDesk` are the app's four writes and stay the only
 * implementation; `action-journey.html` is the specification they conform to, not a fifth thing
 * to build.
 *
 * This module is the SEAM's vocabulary: which kinds exist, which desk owns each, and how a
 * calendar bar's own facts resolve to one. It holds no UI and performs no write — the door is
 * `requestAction(kind, subject, prefill)`, which mounts the matching desk in the chassis.
 *
 * ⚠️ THE RESOLVER READS THE APP'S OWN CTA ENGINE, never a hand-written status list.
 * `getPrimaryAction(status).kind` already answers "is this a send or a record" for every surface
 * that asks; a second table here is how two surfaces come to disagree about whose move it is.
 */
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";
import { DEEDS } from "./calendarPill";

export type ActionKind = "nudge" | "marksent" | "respond" | "closed" | "task";

/** every kind, as data, so a census can be taken over it rather than over a memory of it */
export const ACTION_KINDS: readonly ActionKind[] = ["nudge", "marksent", "respond", "closed", "task"];

/**
 * ⚠️ THE ONE IMPLEMENTATION PER KIND, BY NAME. A lock resolves each of these to exactly one
 * component file; a second file exporting the same name — or a kind gaining a second desk — is
 * the duplication the ruling exists to prevent, and it fails there rather than being noticed.
 *
 * `task` has no desk: a plain task ticks with no desk at all (ruling §3), and a task LINKED to a
 * relationship resolves to the linked kind before it ever reaches this table.
 */
export const DESK_FOR_KIND: Readonly<Record<Exclude<ActionKind, "task">, string>> = {
  nudge: "NudgeDesk",
  marksent: "MarkSentDesk",
  respond: "RespondDesk",
  closed: "MarkClosedDesk",
};

/** what a calendar bar knows about itself when its action is pressed */
export interface ActionFacts {
  isTask: boolean;
  status?: QueryStatus;
  /** the calendar's own cap source — `window`/`reminder` mean the move is a nudge */
  capSource?: "sendBy" | "window" | "reminder" | null;
  /** the deed as the board words it (`DEEDS`, or a status word) */
  deed?: string | null;
}

const NUDGE_DEEDS: readonly string[] = [DEEDS.nudge, DEEDS.them, "Nudge", "Nudge again"];

/**
 * The kind a press resolves to.
 *
 * ⚠️ ORDER IS THE CLAIM. A task is a task whatever its status says; a nudge is named by the deed
 * or by the cap's own source; everything else asks the CTA engine, so a send is a send and a
 * reply is a reply on the same terms every other surface uses.
 */
export function actionKindFor(f: ActionFacts): ActionKind {
  if (f.isTask) return "task";
  if (f.deed && NUDGE_DEEDS.includes(f.deed)) return "nudge";
  if (f.capSource === "window" || f.capSource === "reminder") return "nudge";
  if (f.status && getPrimaryAction(f.status).kind === "mark-sent") return "marksent";
  return "respond";
}

/** the subject a desk needs to name what it is about — never the desk's own state */
export interface ActionSubject {
  rowKey: string;
  queryId?: string;
  taskId?: string;
  name: string;
  agency?: string;
  status?: QueryStatus;
  isTask: boolean;
}

/** what the calendar knows that the desk would otherwise ask for */
export interface ActionPrefill {
  /** the deed as the board worded it, so the desk's title can say the same thing */
  deed?: string | null;
  /** the day the press is about — the board's own "today", ISO */
  when?: string;
}

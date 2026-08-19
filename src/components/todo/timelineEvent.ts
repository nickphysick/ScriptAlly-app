/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ LIFTED OUT OF THE RETIRED `TodoDock` SO THE TYPE SURVIVES THE COMPONENT. `ToDoPage.dockTimeline`
 * builds these from the activity log and `taskPaneJourney` narrows them to the mockup's `tl` rungs;
 * neither is pane markup, so neither went with the pane. Kept verbatim — this is the same shape the
 * page has always produced.
 */
import { QueryStatus } from "../../types";

export interface DockTimelineEvent {
  key: string;
  label: string;
  when: string;
  /**
   * ⚠️ EVERYTHING BELOW IS OPTIONAL AND ABSENT WHERE THE RECORD IS SILENT (journeys pack, Phase 2).
   * A row with no channel shows no channel; a row with no materials shows no chips. None of it is
   * inferred — an entry that says "Partial sent" and nothing else renders exactly that.
   */
  /** "via email" — appended in REGULAR weight beside the event's 600. */
  via?: string;
  /** Anything the agent said: the request quote, the R&R notes. */
  note?: string;
  /**
   * ⚠️ MATERIAL CHIPS ARE CUT, NOT DEFERRED, AND THE REASON IS THAT NOTHING CAN FEED THEM.
   * `Activity` carries no package or version reference — only a free-text `details`. The package's
   * filled slots describe the QUERY'S CURRENT package, not what went with a specific entry, so
   * there is no join from an activity to what accompanied it. Structured chips are therefore
   * possible on ZERO historical entries.
   *
   * ⚠️ AND `details` IS DISPLAYED, NEVER PARSED. Splitting "QL v2 + Syn v4" on "+" to fake chips
   * would be deriving state by reading a display string, which is the fault the whole record is
   * built to avoid. The string renders VERBATIM as the sub-line instead: it is what a human wrote
   * for a human to read, and that is all it is.
   *
   * The field returns the day an activity can name what went with it — a data decision, not a
   * display one.
   */
  /** The wait against the agent's STATED window. Absent where they state none. */
  progress?: { pct: number; over: boolean; from: string; to: string };
  /**
   * ⚠️ THE ENTRY'S OWN STATUS, HANDED STRAIGHT TO `StatusDot`. Not a ring state, not a direction,
   * not a colour — the exact `QueryStatus` the rung produced. `StatusDot` is the app's ONE drawing
   * of a query status and it is never recreated locally; anything less than the status itself
   * throws away what the glyph is for.
   *
   * ⚠️ ABSENT ON A NUDGE, and correctly so. `NUDGE_SENT` carries no `resultingStatus` — it is not
   * a status change — so it takes no dot, and the mark track is simply empty on that row while the
   * connector runs past it.
   */
  status?: QueryStatus | string;
}
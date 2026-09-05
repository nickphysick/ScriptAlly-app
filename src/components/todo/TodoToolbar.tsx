/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoToolbar — ONE 32px row: the workload meter, then the three actions (tightened round,
 * Phase 1; ref design-refs/todo-belongs.html `.toolbar`/`.meterMini`/`.cb`).
 *
 * ⚠️ IT IS THE LIST CARD'S OWN TOP CHROME, NOT A PAGE ROW — the contract draws the toolbar at
 * page level carrying the H1, but the H1 here is the masthead's (`PageHeader` via the shared
 * grid), and the masthead is the HEADER STREAM's surface whose ten-page census asserts nobody
 * opts out. So the toolbar renders inside `.tlc` with no title, the masthead keeps the page's
 * one title element, and the duplication (a masthead plate above a one-row toolbar) is recorded
 * in the round report for the header stream to resolve. This file replaces `TodoCommandBar`
 * wholesale — the separate bar row above the split is retired, its contents are these.
 *
 * ⚠️ THE METER READS THE GROUPS THE LIST RENDERS FROM — the same post-view array, handed in as
 * `groups`. Deriving its own counts is how the meter and the group heads would come to disagree;
 * the counting law's fault, wearing a 150px track.
 *
 * ⚠️ THE JUMP-TO CLICKS ARE RETIRED WITH THE BAR. The contract's meter is not interactive, and
 * the group heads are sticky (and collapsible from Phase 2), so the jump the segments offered is
 * one flick of the same scroll. Recorded in the report rather than quietly dropped.
 */
import React from "react";
import { TaskGroup } from "../../lib/todoGroups";
import { GroupId, GROUP_IDS } from "../../lib/todoListView";

/** the contract's three family tints and their inks */
const TINT: Record<GroupId, string> = { urgent: "#e8c8bc", housekeeping: "#c8d1c5", yours: "#efe4cc" };
const INK: Record<GroupId, string> = { urgent: "#7c3a2a", housekeeping: "#4c5f4a", yours: "#8a7440" };
const SHORT: Record<GroupId, string> = { urgent: "need you", housekeeping: "housekeeping", yours: "yours" };

export interface TodoToolbarProps {
  /** the groups AFTER the view is applied — the same array the list maps over */
  groups: TaskGroup[];
  onAddTask: () => void;
  onAddNote: () => void;
  onCalendar: () => void;
}

const Ic = ({ d }: { d: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden><path d={d} /></svg>
);

export const TodoToolbar: React.FC<TodoToolbarProps> = ({
  groups, onAddTask, onAddNote, onCalendar,
}) => {
  const count = (id: GroupId) => groups.find((g) => g.id === id)?.cards.length ?? 0;
  const counts = GROUP_IDS.map((id) => ({ id, n: count(id) }));
  const total = counts.reduce((a, b) => a + b.n, 0);

  return (
    <div className="l-toolbar">
      {/* ⚠️ ALL CLEAR IS A SENTENCE, NOT AN EMPTY TRACK. A meter of three collapsed segments is a
          grey line that says nothing; one mono line says the true thing. */}
      <div className="meterMini">
        {total > 0 && (
          <div className="track" aria-hidden="true">
            {counts.map(({ id, n }) => (
              <span key={id}
                style={{ flexGrow: n, flexBasis: 0, background: TINT[id], display: n ? undefined : "none" }} />
            ))}
          </div>
        )}
        <span className="legend">
          {total === 0
            ? "All clear"
            : counts.map(({ id, n }, i) => (
                <React.Fragment key={id}>
                  {i > 0 && " · "}
                  <b style={{ color: INK[id] }}>{n}</b> {SHORT[id]}
                </React.Fragment>
              ))}
        </span>
      </div>
      <span className="l-tbsp" aria-hidden />
      {/* the one filled control in the card — the command-bar rule, kept through the move */}
      <button type="button" className="cb fill" onClick={onAddTask}>
        <Ic d="M12 5v14M5 12h14" />Add a task
      </button>
      <button type="button" className="cb line" onClick={onAddNote}>
        <Ic d="M12 5v14M5 12h14" />Add a note
      </button>
      <button type="button" className="cb line" onClick={onCalendar}>
        <Ic d="M3 9h18M7 3v4M17 3v4M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
        Calendar
      </button>
    </div>
  );
};

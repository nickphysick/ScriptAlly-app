/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoCommandBar — the frame contract's bar, above the split.
 *
 * ⚠️ ONE FILLED CONTROL ON THE PAGE, and it is `Add a task`. Everything else is outlined. No
 * burgundy fill anywhere — burgundy is the ink on a soft-pink fill, never the fill itself.
 *
 * ⚠️ THE METER COUNTS THE SAME ARRAY THE ROWS RENDER FROM. Its segments are `flex: <count>`, so the
 * bar is proportional by construction rather than by a percentage computed somewhere else. A group
 * the filter hides has no cards, so its segment collapses and its legend entry greys — the meter
 * cannot disagree with the list because it is not told the counts, it is given the groups.
 */
import React from "react";
import { TaskGroup } from "../../lib/todoGroups";
import { GroupId, GROUP_IDS } from "../../lib/todoListView";
import "./todoFrame.css";

/** the contract's three family tints and their inks */
const TINT: Record<GroupId, string> = { urgent: "#e8c8bc", housekeeping: "#c8d1c5", yours: "#efe4cc" };
const INK: Record<GroupId, string> = { urgent: "#7c3a2a", housekeeping: "#4c5f4a", yours: "#8a7440" };
const SHORT: Record<GroupId, string> = { urgent: "Needs you", housekeeping: "Housekeeping", yours: "Yours" };

export interface TodoCommandBarProps {
  /** the groups AFTER the view is applied — the same array the list maps over */
  groups: TaskGroup[];
  onAddTask: () => void;
  onAddNote: () => void;
  /** null when nothing is open — both task verbs then render disabled */
  hasSelection: boolean;
  onSnooze: (anchor: HTMLElement) => void;
  onDismiss: () => void;
  /** scroll the list to a group's head */
  onJumpTo: (id: GroupId) => void;
}

const Ic = ({ d }: { d: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden><path d={d} /></svg>
);

export const TodoCommandBar: React.FC<TodoCommandBarProps> = ({
  groups, onAddTask, onAddNote, hasSelection, onSnooze, onDismiss, onJumpTo,
}) => {
  const count = (id: GroupId) => groups.find((g) => g.id === id)?.cards.length ?? 0;
  const counts = GROUP_IDS.map((id) => ({ id, n: count(id) }));
  const total = counts.reduce((a, b) => a + b.n, 0);

  return (
    <div className="tdf">
      <div className="cmdbar">
        <div className="cmd-l">
          {/* the one filled control */}
          <button type="button" className="cb fill" onClick={onAddTask}>
            <Ic d="M12 5v14M5 12h14" />Add a task
          </button>
          <button type="button" className="cb line" onClick={onAddNote}>
            <Ic d="M12 5v14M5 12h14" />Add a note
          </button>
        </div>

        <div className="cmd-mid">
          {/* ⚠️ ALL CLEAR IS A SENTENCE, NOT AN EMPTY BAR. A meter of three collapsed segments is a
              grey line that says nothing; one mono line says the true thing. */}
          {total === 0 ? (
            <div className="meter"><div className="legend"><span>All clear</span></div></div>
          ) : (
            <div className="meter">
              <div className="track">
                {counts.map(({ id, n }) => (
                  <span key={id} role="button" tabIndex={-1} aria-label={`${SHORT[id]}: ${n}`}
                    title={`${SHORT[id]} · ${n}`} onClick={() => onJumpTo(id)}
                    style={{ flexGrow: n, flexBasis: 0, background: TINT[id], display: n ? undefined : "none" }} />
                ))}
              </div>
              <div className="legend">
                {counts.map(({ id, n }) => (
                  <span key={id} role="button" tabIndex={-1} onClick={() => onJumpTo(id)}
                    style={{ cursor: "pointer", opacity: n ? 1 : 0.45 }}>
                    {SHORT[id]} <b style={{ color: INK[id] }}>{n}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="cmd-r">
          {/* ⚠️ BOTH ACT ON THE OPEN TASK, so with nothing open they are disabled rather than absent
              — a control that vanishes teaches that the page changed, not that nothing is selected. */}
          <button type="button" className="cb line" disabled={!hasSelection}
            onClick={(e) => onSnooze(e.currentTarget)}>
            <Ic d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z" />Snooze
          </button>
          <button type="button" className="cb line" disabled={!hasSelection} onClick={onDismiss}>
            <Ic d="M18 6L6 18M6 6l12 12" />Dismiss
          </button>
        </div>
      </div>
      <div className="cmd-rule" />
    </div>
  );
};

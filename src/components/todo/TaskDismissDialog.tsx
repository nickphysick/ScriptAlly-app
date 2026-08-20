/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskDismissDialog — THE PORT of `design-refs/todo-pane-contract.html`'s `#dismissDlg`.
 *
 * ⚠️ DISMISSING IS THE ONE ACT ON THIS PAGE THAT ASKS FIRST, and it asks because it is the one
 * that cannot be read off the page afterwards. Snoozing states its own return date on the card;
 * completing writes a record you can go and look at; dismissing removes a task and leaves nothing
 * where it was. Before this, the pane's Dismiss wrote immediately.
 *
 * ⚠️ THE DIALOG'S JOB IS TO SAY WHERE IT GOES, NOT TO WARN. There is no "are you sure", no red,
 * and the safe option is the plain one on the left. What the writer needs is the three facts that
 * make the act reversible in practice: it is behind a filter entry, the query keeps its own record,
 * and a change in the situation raises a fresh task. All three are in the box, and all three are
 * true of the implementation — the flag is a stance, and the card is rebuilt from the query.
 */
import React from "react";
import "./taskDismiss.css";

export interface TaskDismissDialogProps {
  /** what is being dismissed, in the writer's own terms — the deed, never a task id */
  deed: string;
  /** ⚠️ ABSENT ON A NOTE, and the copy changes rather than lying: a note has no query behind it. */
  hasQuery: boolean;
  /** the agent, where the record holds one — for the "if the situation changes" example */
  agent?: string | null;
  onKeep: () => void;
  onDismiss: () => void;
}

export const TaskDismissDialog: React.FC<TaskDismissDialogProps> = ({
  deed, hasQuery, agent, onKeep, onDismiss,
}) => {
  /* ⚠️ ESCAPE KEEPS IT. The dialog is a question, and the answer to a question you dismiss by
     pressing Escape is the one that changes nothing. Captured, so the pane's own Escape handling
     cannot also fire and take a second action on one key. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onKeep();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onKeep]);

  /* ⚠️ NO PRONOUN FOR THE AGENT, EVER — the app does not know, and the contract's own example
     ("Greg replies, say") is safe only because it happens to avoid one. Named where the record
     holds a name, "the agent" where it does not. */
  const who = (agent || "").trim() || "the agent";

  return (
    <div className="tdlg dlg open" role="alertdialog" aria-modal="true" aria-label="Dismiss this task?"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onKeep(); }}>
      <div className="dlg-card">
        <h3>Dismiss this task?</h3>
        <p>
          It leaves your list and <b>won't come back on its own</b>
          {hasQuery ? <> — the query itself doesn't change.</> : <>. Nothing else changes.</>}
        </p>
        <div className="dlg-where">
          <b>Where it goes:</b> dismissed tasks sit behind the filter's “Include dismissed”
          {hasQuery
            ? <>, and the query keeps its own record — you can act on it any time from the Query
                Centre. If the situation changes ({who} replies, say), a fresh task appears as
                normal.</>
            : <>. You can bring it back from there at any time.</>}
        </div>
        {/* ⚠️ THE DEED, SO THE DIALOG NAMES WHAT IT IS ABOUT. A confirm that says "this task" over a
            list of fourteen is asking the writer to remember which row they clicked. */}
        <div className="dlg-subj">{deed}</div>
        <div className="dlg-foot">
          <button type="button" className="ab quiet" onClick={onKeep}>Keep it</button>
          <button type="button" className="ab go" onClick={onDismiss}>Dismiss it</button>
        </div>
      </div>
    </div>
  );
};

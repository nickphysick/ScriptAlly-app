/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashTaskDrawer — the To-do page's own pane, opened from the dashboard (Phase 5).
 *
 * ⚠️ IT IS A SEPARATE MODULE SO THE PANEL CAN `React.lazy` IT, AND THAT IS NOT AN OPTIMISATION.
 * `useTaskCommit` reaches `lib/db` → `lib/firebase`, which initialises the Firebase SDK AT MODULE
 * LOAD. This repo's test environment is `node` with no emulator, so a static import from the panel
 * put `auth/invalid-api-key` in the import graph of ELEVEN dashboard suites at once and they stopped
 * COLLECTING — the failure that reads as "no tests found" rather than as a red. `OneScreenDashboard`
 * already dodges the same trap by importing `lib/firebase` dynamically inside an effect; this is
 * that shape, applied to a subtree instead of a module.
 *
 * ⚠️ AND IT IS A REAL SAVING, NOT ONLY A TEST FIX. The dashboard does not pay for the To-do page's
 * whole write layer until somebody opens a ticket.
 *
 * ⚠️ THE PANE IS MOUNTED WHOLE, NEVER REDUCED. Its intent fork, its materials with the expanding
 * unit pill, its date, its expected-by with provenance, its reminder timing, its notes, its
 * will-record strip and its filling primary arrive together because they are one component and one
 * session. A cut-down copy here would be a second answer to "what does finishing this involve".
 */
import React, { useMemo, useRef } from "react";
import { SlideOver } from "../shared/SlideOver";
import { TaskPane } from "../todo/TaskPane";
import { useTaskPaneSession, type TaskPaneHost } from "../todo/useTaskPaneSession";
import { useTaskCommit } from "../todo/useTaskCommit";
import { useTodoToast } from "../todo/useTodoToast";
import { useConfirmAsk } from "../todo/ConfirmAsk";
import { BoardCard } from "../../lib/todoBoard";
import { CATEGORY_TAG, taskCategory } from "../../lib/todoCategory";

export const DashTaskDrawer: React.FC<{
  card: BoardCard | null;
  onClose: () => void;
  /** the flow hand-off and "See all" are one destination: the page that owns the takeover */
  onSeeAll: () => void;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ card, onClose, onSeeAll, onNavigate }) => {
  const paneRef = useRef<HTMLDivElement>(null);
  /* ⚠️ THE To-do PAGE'S OWN TOAST, AND ITS PILL RENDERED THE SAME WAY. `useTaskCommit` needs
     `flash` and `remember`, and its own docstring says there is no parallel undo store in the app
     and there must not be one — so this takes the real hook rather than bridging its calls into
     the dashboard's note toast, which knows nothing about remembering an inverse by card key. */
  const { toast, flash, dismiss: dismissToast, pause: pauseToast, resume: resumeToast, remember: rememberUndo } = useTodoToast();
  const { ask: confirmAsk, node: askNode } = useConfirmAsk();

  /**
   * ⚠️ THE FLOW HAND-OFF NAVIGATES; IT DOES NOT MOUNT A SECOND TAKEOVER. `FocusFlow` is a
   * full-screen overlay the To-do page hosts, and a card whose journey is a takeover rather than a
   * pane belongs there. Opening a second host on the dashboard would put two of the app's one
   * completion surface on screen at once.
   */
  const goToFlow = useMemo(() => (_c: BoardCard) => { onClose(); onSeeAll(); }, [onClose, onSeeAll]);
  const { commit } = useTaskCommit({ flash, rememberUndo, confirmAsk, openFlow: goToFlow });

  const host: TaskPaneHost = {
    /* ⚠️ SCOPED TO THIS DRAWER. Every workspace page stays mounted under the display-toggling
       shell, so a `document` query would answer about a copy the reader cannot see — and
       `TaskPaneBody`'s ids are shared with the To-do page's own mount, which is why it takes an
       `idPrefix` in the first place. */
    jumpToSection: (id) => paneRef.current?.querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    openFlow: goToFlow,
    commit: (c, v, rows) => commit(c, v, rows),
    /* ⚠️ THERE IS NO QUEUE HERE, so "advance" is "you are done with this one". The To-do page moves
       to the next card because it HAS a cursor; a panel of tickets has none, and inventing one
       would be a second board cursor free to disagree with the page's. */
    advance: onClose,
    completed: onClose,
    openQuery: (c) => { if (c.relatedRecordId) onNavigate("queries", c.relatedRecordId); },
    openAgent: (agentId) => {
      try { sessionStorage.setItem("sa.agentReveal", agentId); } catch { /* private mode */ }
      onNavigate("agents");
    },
    openManuscript: (manuscriptId) => {
      try { sessionStorage.setItem("sa.manuscriptReveal", manuscriptId); } catch { /* private mode */ }
      onNavigate("manuscripts");
    },
    /* ⚠️ SNOOZE AND DISMISS ARE ABSENT, AND ABSENCE IS NOT DISABLED — `TaskPane` renders those
       verbs only when the callback is present, which is the grammar its own type states. Both need
       surfaces this panel does not have (an anchored dial, a dialog); a host with nowhere to put
       them passes neither and the pane draws neither, rather than showing a dead control. */
  };
  const session = useTaskPaneSession(card, host, "dash-");

  return (
    <>
      <SlideOver open={!!card} onClose={onClose} label="Task" width={580} fullBleedBelowMd>
        <div className="tpn dash-tpn" ref={paneRef}>
          {card && session.journey && (
            <TaskPane
              journey={session.journey}
              onPrimary={session.onPrimary}
              heroFixed
              nav={{ index: 0, total: 0, label: CATEGORY_TAG[taskCategory(card)], onPrev: () => {}, onNext: () => {}, onClose }}
            />
          )}
        </div>
      </SlideOver>
      {toast && (
        <div className={`tdb-toast${toast.tone === "warn" ? " warn" : ""}`}
          role={toast.tone === "warn" ? "alert" : "status"}
          onMouseEnter={pauseToast} onMouseLeave={resumeToast}>
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismissToast(); }}>{toast.action.label}</button>}
        </div>
      )}
      {askNode}
    </>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashTaskCommit — the dashboard's writing half, and nothing else (to-do row round, 20 Sep).
 *
 * ⚠️ A SEPARATE MODULE SO THE CARD CAN `React.lazy` IT, AND THAT IS NOT AN OPTIMISATION.
 * `useTaskCommit` reaches `lib/db` → `lib/firebase`, which initialises the Firebase SDK AT MODULE
 * LOAD; this repo's test environment is `node` with no emulator, so a static import from
 * `OneScreenTasks` would put `auth/invalid-api-key` into eleven dashboard suites' import graph and
 * they would stop COLLECTING. `DashTaskDrawer` was the same shape for the same reason.
 *
 * ⚠️ IT IS DECLARATIVE, NOT AN IMPERATIVE HANDLE. The card sets a `request` and this performs it;
 * there is no ref handing functions upward. A hook cannot be called conditionally, so the
 * alternative was a ref populated from an effect — which is a second source of truth about whether
 * the writer is ready, and it is null on exactly the first render somebody will test.
 *
 * ⚠️ AND IT WRITES THROUGH `useTaskCommit`, WHICH IS THE POINT. The To-do page's pane and this row
 * commit the SAME records through the same functions; a second write path would be a second answer
 * to what finishing a task involves, and the two would drift on the first new task type.
 */
import React, { useEffect, useRef } from "react";
import { useTaskCommit } from "../todo/useTaskCommit";
import { useScriptAllyDb } from "../../lib/db";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { useTodoToast } from "../todo/useTodoToast";
import type { BoardCard } from "../../lib/todoBoard";
import type { JourneySendValues } from "../../lib/paneJourney";

/**
 * What the row asks for.
 *
 * ⚠️ `id` IS WHAT MAKES IT RUN ONCE. The effect keys on it, so re-rendering with the same request
 * does nothing and a second tick on the same row is a new number rather than a second write.
 */
export type CommitRequest =
  /** the tick's optimistic path — commit with the defaults `useTaskCommit` already owns */
  | { id: number; kind: "quick"; card: BoardCard }
  /** Save from the in-row editor, or a menu option that carries values */
  | { id: number; kind: "values"; card: BoardCard; values: JourneySendValues }
  /**
   * Dismiss — stop suggesting this task.
   *
   * ⚠️ IT DOES *NOT* GO THROUGH `dismissTask`, AND THE REASON IS A REAL DEFECT IN THAT FUNCTION.
   * `db.dismissTask` special-cases `nudge_overdue` and writes a **`NUDGE_SENT` activity** —
   * "Nudge sent to {agent} at {agency}", with a fabricated "They've had your query for N days" —
   * before it touches the flag. So dismissing a nudge SUGGESTION records that the writer nudged the
   * agent, which they did not. It lands in the global feed only, so it is also a rung the
   * authoritative subcollection has never heard of.
   *
   * What dismissing actually means is the LAST line of that function: mute the task's flag. So this
   * writes exactly that — `upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL, bumpSnooze: true })`,
   * the same primitive, minus a write that states something untrue. The inverse is the same call
   * with `snoozedUntil: null`, which is what makes the row's Undo real.
   *
   * ⚠️ The To-do page still calls `dismissTask` and therefore still has the defect. Flagged, not
   * fixed here — repairing a shared writer belongs in its own change, with its own reds.
   */
  | { id: number; kind: "dismiss"; card: BoardCard };

export interface DashTaskCommitProps {
  request: CommitRequest | null;
  /** what was logged, in the app's own words, and the way back — both from the commit's own toast */
  onLogged: (cardKey: string, logged: string, undo?: () => void) => void;
  /**
   * ⚠️ THE DUPLICATE-SEND GUARD, REHOMED RATHER THAN SUPPRESSED (Nick, 20 Sep). `useTaskCommit`
   * asks `confirmAsk` before a second send of the same materials; on the To-do page that is a
   * dialog, and a tick that commits optimistically has nowhere to put one. So the dashboard's
   * `confirmAsk` DECLINES — nothing is written — and hands the question to the row, which opens its
   * editor pre-filled with the warning above the fields and `Log it anyway` on Save.
   *
   * The optimistic path therefore runs only when the guard passes, which is the whole of the rule.
   */
  onDuplicate: (cardKey: string, prompt: string) => void;
  onFailed: (cardKey: string, message: string) => void;
  /** a flow this row cannot host — the takeover lives on the To-do page */
  onNeedsPage: () => void;
}

export const DashTaskCommit: React.FC<DashTaskCommitProps> = ({
  request, onLogged, onDuplicate, onFailed, onNeedsPage,
}) => {
  const { flash, remember: rememberUndo } = useTodoToast();
  const { upsertTaskFlag } = useScriptAllyDb();

  /* ⚠️ A REF, BECAUSE `flash` IS A setState AND THE COMMIT READS ITS RESULT IN THE SAME TICK.
     Reading the toast from render scope hands the receipt the PREVIOUS write's words — worse than
     no receipt, because it is a plausible one. */
  const lastFlash = useRef<{ msg: string; action?: { label: string; fn: () => void | Promise<void> } } | null>(null);
  const pendingKey = useRef<string | null>(null);
  const duplicated = useRef(false);

  const flashAndKeep = React.useCallback<typeof flash>((msg, action, ms) => {
    lastFlash.current = { msg, action };
    flash(msg, action, ms);
  }, [flash]);

  const { commit, quickDone } = useTaskCommit({
    flash: flashAndKeep,
    rememberUndo,
    /* the guard's new home — see `onDuplicate` */
    confirmAsk: async (msg: string) => {
      duplicated.current = true;
      if (pendingKey.current) onDuplicate(pendingKey.current, msg);
      return false;
    },
    openFlow: () => onNeedsPage(),
  });

  useEffect(() => {
    if (!request) return;
    let live = true;
    void (async () => {
      lastFlash.current = null;
      duplicated.current = false;
      pendingKey.current = request.card.key;
      if (request.kind === "dismiss") {
        const c = request.card;
        if (!c.taskType || !c.relatedRecordId) { onFailed(c.key, "There is nothing to dismiss here."); return; }
        const key = flagKeyForTask(c.taskType, c.relatedRecordId);
        await upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL, bumpSnooze: true });
        if (!live) return;
        onLogged(c.key, "Dismissed — this one won’t be suggested again.",
          () => { void upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); });
        return;
      }
      const ok = request.kind === "quick"
        ? await quickDone(request.card)
        : await commit(request.card, request.values, []);
      if (!live) return;
      /* the guard already spoke — the row is showing its editor, and saying "couldn't" over it
         would report a refusal the writer did not make */
      if (duplicated.current) return;
      const f = lastFlash.current;
      if (ok && f) {
        onLogged(request.card.key, f.msg, f.action ? () => { void f.action!.fn(); } : undefined);
      } else if (!ok) {
        /* ⚠️ A COMMIT THAT WROTE NOTHING SAYS SO. Leaving the tick on over an unwritten record is
           the one outcome a writer cannot tell from success. */
        onFailed(request.card.key, f?.msg || "That didn’t save. Nothing was recorded.");
      }
    })();
    return () => { live = false; };
  }, [request, quickDone, commit, upsertTaskFlag, onLogged, onFailed, onDuplicate]);

  return null;
};

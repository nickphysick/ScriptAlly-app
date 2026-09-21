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
import { nudgeWriteArgs, quickNudgePayload } from "../../lib/todoWalk";
import { ActivityType, QueryStatus } from "../../types";
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
  | { id: number; kind: "quick"; card: BoardCard; allowDuplicate?: boolean }
  /** the modal's answer and its values */
  | { id: number; kind: "values"; card: BoardCard; values: JourneySendValues; allowDuplicate?: boolean }
  /**
   * Dismiss — stop suggesting this task.
   *
   * ⚠️ IT DOES NOT GO THROUGH `dismissTask`, AND THE DEFECT THAT WAS THE REASON IS NOW FIXED —
   * `main` `5c19285a`, 21 Sep. `db.dismissTask` used to special-case `nudge_overdue` and write a
   * **`NUDGE_SENT` activity** — "Nudge sent to {agent} at {agency}", with a fabricated "They've
   * had your query for N days" — before it touched the flag, so dismissing a nudge SUGGESTION
   * recorded that the writer had chased the agent, which they had not. It landed in the global
   * feed alone, so it was also a rung the authoritative subcollection had never heard of. The
   * branch is gone; `lib/dismissTask.test.ts` holds it gone.
   *
   * What dismissing means is the last line of that function: mute the task's flag. So this writes
   * exactly that — `upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL, bumpSnooze: true })` — and
   * its inverse is the same call with `snoozedUntil: null`, which is what makes the row's Undo
   * real. That inverse is now a member of the type as well (`dismissTask(…, "lift")`): the undos
   * that wanted it were passing `("fixed snooze", 0)`, and `0` is falsy, so the patch resolved to
   * `undefined` — which `upsertTaskFlag` reads as KEEP. An undo that restored nothing.
   *
   * ⚠️ SO THIS ARM AND `dismissTask("…", "permanent")` ARE NOW THE SAME TWO WRITES, AND ONE OF
   * THEM SHOULD GO. Collapsing this into the shared writer is a follow-up for whoever merges this
   * branch, not a change to make inside a review branch — but it is the one thing left here, and
   * leaving two spellings of one intent is how they come to disagree.
   */
  | { id: number; kind: "dismiss"; card: BoardCard }
  /**
   * ⚠️ A NUDGE ON A CARD WHOSE OWN COMPLETION IS SOMETHING ELSE — "Nudge once more" on a quiet row.
   *
   * It cannot go through `commit`, and that is not a shortcut being taken: `commitFromPane` routes
   * on the CARD's journey, so a quiet card's values land in the CLOSE arm however they are filled
   * in. Passing nudge values there produced a close with no reason and returned false — measured,
   * the row showed nothing at all.
   *
   * So it calls the nudge's own write directly — and it is the SAME write: `quickNudgePayload` →
   * `nudgeWriteArgs` → `logNudge`, the three things `useTaskCommit`'s own `log-nudge` arm uses.
   */
  | { id: number; kind: "nudge"; card: BoardCard }
  /**
   * ⚠️ CLOSE A QUERY FROM A CARD WHOSE OWN JOURNEY IS SOMETHING ELSE — "I'm not going to send it" on
   * a SEND card (task-modal round, §6).
   *
   * ⚠️ AND THIS IS THE THIRD TIME THE SAME SEAM HAS BEEN ASKED FOR, WHICH IS WHY IT IS A KIND
   * RATHER THAN A ROUTE. `commitFromPane` routes on the CARD's journey, so a send card's values
   * land in the SEND arm however they are filled in — the fault that produced a close with no
   * reason when the nudge kind was added. Nick, 21 Sep: *"you've already had to do that once for
   * nudge and a third time through the same seam suggests the seam wants a kind field that names
   * the write, not the card."* So these two name their write and take it directly.
   *
   * It is the same write `quickDone`'s own `close-query` arm makes — `updateQueryStatus` to
   * `NO_RESPONSE`, `undoQueryStatus` as the inverse — so a query closed from a send card and one
   * closed from a quiet card are the same record, which is the whole point of not forking.
   */
  | { id: number; kind: "close"; card: BoardCard; note?: string }
  /**
   * ⚠️ STOP SUGGESTING THIS — "I'll leave it" on a nudge card (§6), and it is a MUTE rather than a
   * snooze. A snooze says come back on a date; this says the app was wrong to raise it, so it takes
   * `MUTED_UNTIL` and nothing on the query moves. Its `records` line says "Query unchanged" and
   * that is a claim this arm has to keep: no status, no date, no activity.
   */
  | { id: number; kind: "mute"; card: BoardCard };

export interface DashTaskCommitProps {
  request: CommitRequest | null;
  /** what was logged, in the app's own words, and the way back — both from the commit's own toast */
  onLogged: (cardKey: string, logged: string, undo?: () => void) => void;
  /**
   * ⚠️ THE DUPLICATE-SEND GUARD ASKS IN THE MODAL NOW (task-modal round §8; Nick, 21 Sep: *"take the
   * simplification"*). `useTaskCommit` calls `confirmAsk` before a second send of the same
   * materials. There is nowhere to put a dialog over a dialog, so this arm DECLINES — writing
   * nothing — and hands the question up as `warn`, which the modal renders as a rose banner above
   * the form with `Log it anyway` on the primary.
   *
   * ⚠️ AND THE ANSWER COMES BACK AS A NEW REQUEST CARRYING `allowDuplicate`, NOT AS A RESOLVER THIS
   * COMPONENT HOLDS. A promise parked here across renders is a second source of truth about whether
   * a write is in flight, and it is exactly the imperative handle this module's own header refuses.
   * The writer pressing `Log it anyway` raises a fresh request; the guard reads the flag and passes.
   * Same outcome, and the write path still runs exactly once per press.
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
  const { upsertTaskFlag, logNudge, deleteActivity, updateQueryStatus, undoQueryStatus, queries, activities } = useScriptAllyDb();

  /* ⚠️ A REF, BECAUSE `flash` IS A setState AND THE COMMIT READS ITS RESULT IN THE SAME TICK.
     Reading the toast from render scope hands the receipt the PREVIOUS write's words — worse than
     no receipt, because it is a plausible one. */
  const lastFlash = useRef<{ msg: string; action?: { label: string; fn: () => void | Promise<void> } } | null>(null);
  const pendingKey = useRef<string | null>(null);
  const duplicated = useRef(false);
  /* the flag the banner's button sets, read by `confirmAsk` — see `onDuplicate` */
  const allowDup = useRef(false);

  const flashAndKeep = React.useCallback<typeof flash>((msg, action, ms) => {
    lastFlash.current = { msg, action };
    flash(msg, action, ms);
  }, [flash]);

  const { commit, quickDone } = useTaskCommit({
    flash: flashAndKeep,
    rememberUndo,
    /* the guard's new home — see `onDuplicate` */
    confirmAsk: async (msg: string) => {
      /* the writer has already been asked and said yes — this request IS the answer */
      if (allowDup.current) return true;
      duplicated.current = true;
      if (pendingKey.current) ctx.current.onDuplicate(pendingKey.current, msg);
      return false;
    },
    openFlow: () => onNeedsPage(),
  });

  /**
   * ⚠️ THE EFFECT KEYS ON `request.id` AND NOTHING ELSE, AND EVERYTHING ELSE IT NEEDS IS HELD IN A
   * REF. This was written with the callbacks and `quickDone` in the dependency list, which is what
   * the linter asks for and is exactly wrong here: every one of them is a fresh identity on every
   * render, so the effect re-ran continuously — **re-running the COMMIT** each time, while the
   * previous run's cleanup set `live = false` and threw its result away. Measured: the nudge chunk
   * loaded, the write path ran, and the row showed nothing at all.
   *
   * A commit is an EVENT, not a synchronisation. `id` is the event; the rest is context.
   */
  const ctx = useRef({ quickDone, commit, upsertTaskFlag, onLogged, onDuplicate, onFailed, logNudge, deleteActivity, updateQueryStatus, undoQueryStatus, queries, activities });
  ctx.current = { quickDone, commit, upsertTaskFlag, onLogged, onDuplicate, onFailed, logNudge, deleteActivity, updateQueryStatus, undoQueryStatus, queries, activities };

  const reqId = request?.id ?? null;
  useEffect(() => {
    if (!request || reqId === null) return;
    const { quickDone: qd, commit: cm, upsertTaskFlag: flag, onLogged: logged, onFailed: failed,
      logNudge, queries } = ctx.current;
    let live = true;
    void (async () => {
      lastFlash.current = null;
      duplicated.current = false;
      allowDup.current = (request.kind === "quick" || request.kind === "values") && !!request.allowDuplicate;
      pendingKey.current = request.card.key;
      if (request.kind === "dismiss") {
        const c = request.card;
        if (!c.taskType || !c.relatedRecordId) { failed(c.key, "There is nothing to dismiss here."); return; }
        const key = flagKeyForTask(c.taskType, c.relatedRecordId);
        await upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL, bumpSnooze: true });
        if (!live) return;
        onLogged(c.key, "Dismissed — this one won’t be suggested again.",
          () => { void upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); });
        return;
      }
      if (request.kind === "mute") {
        const c = request.card;
        if (!c.taskType || !c.relatedRecordId) { failed(c.key, "There is nothing to stop here."); return; }
        const key = flagKeyForTask(c.taskType, c.relatedRecordId);
        await upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL, bumpSnooze: true });
        if (!live) return;
        onLogged(c.key, "Left it — no more nudges suggested for this one.",
          () => { void upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); });
        return;
      }
      if (request.kind === "close") {
        const c = request.card;
        const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
        if (!q) { failed(c.key, "There is no query to close here."); return; }
        const prev = q.status as QueryStatus;
        /* ⚠️ THE SAME CALL `quickDone`'s `close-query` ARM MAKES, and the same inverse. A second
           spelling of "close a query" is a second answer to what closing means. */
        await ctx.current.updateQueryStatus(q.id, QueryStatus.NO_RESPONSE,
          request.note || "Closed with no reply from the agent");
        if (!live) return;
        onLogged(c.key, "Closed — no reply from the agent.",
          () => { void ctx.current.undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE); });
        return;
      }
      if (request.kind === "nudge") {
        const c = request.card;
        const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
        if (!q) { failed(c.key, "There is no query to nudge here."); return; }
        const pay = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso: new Date().toISOString() });
        const r = await logNudge(...nudgeWriteArgs(pay, new Date().toISOString()));
        if (!live) return;
        if (!r.success) { failed(c.key, r.error || "Couldn't log the nudge."); return; }
        /**
         * ⚠️ THE INVERSE IS `deleteActivity` ON THE NUDGE ITSELF, which unwinds both twins and the
         * two fields — the same undo `useTaskCommit`'s own nudge arm remembers.
         *
         * ⚠️ AND IT READS `ctx.current` INSIDE THE CLOSURE, NOT THE ARRAY DESTRUCTURED ABOVE. That
         * array is the snapshot from BEFORE the write, so the nudge just logged is not in it: the
         * undo deleted the previous newest nudge, or nothing at all. Measured — the feed still read
         * "You nudged Rachel Lin" after pressing Undo. An undo that restores nothing is worse than
         * no undo, because it looks like it worked.
         */
        logged(c.key, "Nudge sent", () => {
          const mine = ctx.current.activities
            .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
            .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
          if (mine[0]?.id) void ctx.current.deleteActivity(mine[0].id);
        });
        return;
      }
      const ok = request.kind === "quick"
        ? await qd(request.card)
        : await cm(request.card, request.values, []);
      if (!live) return;
      /* the guard already spoke — the row is showing its editor, and saying "couldn't" over it
         would report a refusal the writer did not make */
      if (duplicated.current) return;
      const f = lastFlash.current;
      if (ok && f) {
        logged(request.card.key, f.msg, f.action ? () => { void f.action!.fn(); } : undefined);
      } else if (!ok) {
        /* ⚠️ A COMMIT THAT WROTE NOTHING SAYS SO. Leaving the tick on over an unwritten record is
           the one outcome a writer cannot tell from success. */
        onFailed(request.card.key, f?.msg || "That didn’t save. Nothing was recorded.");
      }
    })();
    return () => { live = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- see the note above: `id` is the event */
  }, [reqId]);

  return null;
};

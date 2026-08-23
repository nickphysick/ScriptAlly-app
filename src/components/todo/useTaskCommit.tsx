/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ONE COMMITTER, BOTH PAGES (tasks-workflow, Pack C Phase 1) ═══════════════════════════════
 *
 * ⚠️ THE PANE'S WRITE LAYER, LIFTED WHOLE. `useTaskPaneSession` took the form; this takes what the
 * form's primary does with it. Both had exactly one consumer and both lived on `ToDoPage` only
 * because that is where the pane happened to be mounted first.
 *
 * ⚠️ `quickDone` CAME WITH IT, WHOLE AND UNSPLIT. The note arm must go through the primitive —
 * CLAUDE.md: *"an inline completion is how the undo was bypassed once already. One primitive, four
 * entrances."* Nothing in this pack writes a completion inline, and the four entrances are still
 * four.
 *
 * ⚠️ THE OVERLAY IS AN OPTIONAL SINK, AND THAT IS A RULING RATHER THAN A CONVENIENCE. On `/todo`
 * the card overlay is a receipt drawn ON A BOARD CARD, additional to the toast. The calendar has no
 * board cards, so it passes no sink and the toast alone carries the receipt — including Undo, which
 * is what makes it a receipt rather than a notice. **This is one primitive with one surface-specific
 * decoration that only exists where it can be drawn**: not a no-op, and not a second invented
 * receipt. Do not add another.
 *
 * ⚠️ EVERY REACH THE SINK COVERS IS DECORATION, VERIFIED BEFORE THE SHAPE WAS CHOSEN (Phase 0).
 * `set` is only ever called AFTER a completed write; `clear` only ever inside an undo closure; and
 * `prefill` + the takeover it opens are reachable ONLY through the receipt's own `edit`, which is
 * handed nowhere else. With no sink, `edit` is constructed and never reachable — so a quick
 * mark-sent on the calendar has no "Edit details", and nothing else differs.
 *
 * ⚠️ THE SINK IS OPTIONAL IN BOTH DIRECTIONS. The undo closures call `clear` unconditionally, so a
 * missing sink must SKIP the clear rather than throw inside an undo — a throw there would strand a
 * writer mid-reversal, which is the one place an error is least recoverable.
 */
import React from "react";
import { useScriptAllyDb } from "../../lib/db";
import { BoardCard } from "../../lib/todoBoard";
import { JourneySendValues } from "../../lib/paneJourney";
import { QueryStatus, ActivityType, Agent } from "../../types";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { completionVia } from "../../lib/todoActions";
import { quickSendPayload, quickNudgePayload, markSentWriteArgs, nudgeWriteArgs, receiptLine,
  materialOptsForTask, priorSameTypeSend, duplicateSendPrompt, journeyEventISO } from "../../lib/todoWalk";
import { isBulkCard } from "../../lib/paneGate";
import { paneJourneyKind } from "./useTaskPaneSession";
import { type RecordSweepRow, sweepWrites, sweepActLabel } from "../../lib/materialsSweep";
import { type MaterialRow, materialsWantedFromRows, summaryFromRows, willRecordText } from "../../lib/agentMaterials";
import { notifyGroups, reminderFields } from "../../lib/offerNotify";
import { flagKeyForTask } from "../../lib/taskFlags";
import { CLOSE_REASONS } from "../../lib/todoJourneys";
import { localYMD } from "../../lib/shellSidebar";

/** the receipt a board card can draw — `/todo` supplies one, the calendar has nowhere to draw it */
export interface TaskOverlaySink {
  set: (key: string, receipt: any) => void;
  clear: (key: string) => void;
  /** only reachable through the receipt's own `edit` — see the head note */
  prefill: (p: { sentDate?: string; method?: string; materials?: string[] }) => void;
}

export interface TaskCommitHost {
  flash: (msg: string, action?: { label: string; fn: () => void | Promise<void> }) => void;
  /** the session REDO's memory of an inverse, by card key */
  rememberUndo: (key: string, fn: () => Promise<void>) => void;
  /** the duplicate-send guard — PART OF THE WRITE PATH, not decoration: declining writes nothing */
  confirmAsk: (msg: string, opts?: { confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  /** the `offer`/`fix` hand-off, and the takeover a receipt's `edit` re-opens */
  openFlow: (card: BoardCard) => void;
  overlay?: TaskOverlaySink;
}

export interface TaskCommit {
  commit: (card: BoardCard, v: JourneySendValues, bulkRows: RecordSweepRow[]) => Promise<boolean>;
  /** the quick ✓'s primitive — the page's row taps reach it; `commit`'s note arm goes through it too */
  quickDone: (c: BoardCard) => Promise<void>;
}

export function useTaskCommit(host: TaskCommitHost): TaskCommit {
  const {
    queries, agents, activities, userTasks,
    updateQuery, updateQueryStatus, updateUserTask, addUserTask, updateAgent,
    recordMaterialsSent, recordOfferDecision, undoQueryStatus, logNudge, deleteActivity,
    upsertTaskFlag, resolveTaskFlag,
  } = useScriptAllyDb();
  const today = localYMD(Date.now());
  /* ⚠️ THE HOOK HOLDS ITS OWN REF, for the same reason the page did: the nudge undo and the
     duplicate-send guard read the activity feed from inside an async closure, where the array
     captured at render is already stale. */
  const activitiesRef = React.useRef(activities);
  activitiesRef.current = activities;
  const { flash, rememberUndo, confirmAsk } = host;
  const setOverlay = (key: string, receipt: any) => host.overlay?.set(key, receipt);
  const clearOverlay = (key: string) => host.overlay?.clear(key);
  const setFlowPrefill = (p: { sentDate?: string; method?: string; materials?: string[] }) => host.overlay?.prefill(p);
  const openFlowCards = (cards: BoardCard[]) => { if (cards[0]) host.openFlow(cards[0]); };

  function doneToast(c: BoardCard, fn: () => Promise<void>) {
    rememberUndo(c.key, fn);
    flash(`Done — “${c.title}”`, { label: "Undo", fn });
  }
  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    /* ⚠️ WHICH WRITE PATH A KIND TAKES IS `completionVia` (tasks-consolidation, extraction). It
       was an if-ladder here, so "which kinds can be ticked at all" was answerable only by reading
       this function to its end — and the row needs that answer BEFORE it draws a tick. */
    const via = completionVia(c);
    if (via === "none") return;
    if (via === "user-task") {
      // save-and-today P1 — ticking is a write like any other: it must not silently no-op. On a
      // denied/dropped write, surface a Try-again toast rather than the old unhandled throw.
      try {
        await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      } catch {
        flash("Couldn’t mark that done — try again?", { label: "Try again", fn: () => quickDone(c) });
        return;
      }
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on Today.`, undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    if (!q) return;
    if (via === "close-query") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from the quick rail");
      const undo = () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE);
      setOverlay(c.key, { kind: "receipt", lane: "hk", title: `${c.who || "Query"} — closed`, line: "Logged as no response — not a rejection, so your response rate stays honest." , undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    if (via === "log-nudge") {
      const p = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso });
      const r = await logNudge(...nudgeWriteArgs(p, new Date().toISOString()));
      if (!r.success) { flash(r.error || "Couldn’t log the nudge."); return; }
      // deleteActivity on a NUDGE_SENT fully unwinds it (twins + nudgeDate fields + the flag).
      const undo = async () => {
        const acts = activitiesRef.current
          .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        if (acts[0]?.id) await deleteActivity(acts[0].id);
      };
      setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line: receiptLine(p, today), undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return;
    // B3 — the soft duplicate-send guard in the quick-✓'s grammar (the styled ConfirmAsk;
    // decline writes nothing, the card stays). R&R resubmissions are never guarded.
    const prior = priorSameTypeSend(activitiesRef.current, q.id, action.target as QueryStatus, action.markKind === "resubmit");
    if (prior && !(await confirmAsk(duplicateSendPrompt(action.target as QueryStatus, c.who, prior), { confirmLabel: "Send again", cancelLabel: "Cancel" }))) return;
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    const line = receiptLine(p, today, materialOptsForTask(c.taskType));
    const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);
    const edit = async () => {
      // "Edit details" = undo the quick write, then re-open the journey PRE-FILLED with what was
      // logged — saving again writes once, honestly.
      await undo();
      clearOverlay(c.key);
      setFlowPrefill({ sentDate: p.sentDate.slice(0, 10), method: p.method, materials: p.materials });
      openFlowCards([c]);
    };
    setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line, undo, edit });
    doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
  }
  async function writeQueryMaterials(card: BoardCard, rows: MaterialRow[]): Promise<(() => Promise<void>) | null> {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return null;
    const wanted = materialsWantedFromRows(rows);
    if (!wanted.length) return null;
    const before = q.materialsWanted;
    await updateQuery(q.id, { materialsWanted: wanted });
    return async () => { await updateQuery(q.id, { materialsWanted: before ?? [] }); };
  }
  async function commitMaterialsFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const undo = await writeQueryMaterials(card, v.recordRows);
    /* nothing ticked is not a save — the escape hatch is how you leave without recording */
    if (!undo) return false;
    setOverlay(card.key, {
      kind: "receipt", lane: "hk",
      title: card.who || "Recorded",
      line: `${willRecordText(v.recordRows, "and") ?? "Materials"} — on your query to ${card.who || "the agent"}.`,
      undo,
    });
    doneToast(card, async () => { await undo(); clearOverlay(card.key); flash("Restored"); });
    return true;
  }
  async function commitRecordSweep(card: BoardCard, rows: RecordSweepRow[]): Promise<boolean> {
    const writes = sweepWrites(rows);
    if (!writes.length) return false;
    const before = new Map(writes.map((w) => [w.queryId, queries.find((q) => q.id === w.queryId)?.materialsWanted]));
    for (const w of writes) await updateQuery(w.queryId, { materialsWanted: w.materialsWanted });
    const undo = async () => {
      for (const w of writes) await updateQuery(w.queryId, { materialsWanted: before.get(w.queryId) ?? [] });
    };
    setOverlay(card.key, {
      kind: "receipt", lane: "hk",
      title: sweepActLabel(writes.length),
      line: "Recorded on your queries — nothing else about them changed.",
      undo,
    });
    doneToast(card, async () => { await undo(); clearOverlay(card.key); flash("Restored"); });
    return true;
  }
  async function commitOfferFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q || !v.branch) return false;

    if (v.branch === "decide") {
      if (!v.decision) return false;
      const r = await recordOfferDecision(q.id, v.decision);
      if (!r.success) { flash(r.error || "Couldn’t record the decision — try again."); return false; }
      flash(v.decision === "accepted" ? "Recorded — congratulations." : "Recorded — the querying continues.");
      return true;
    }

    if (v.branch === "time") {
      if (!v.remindDate) return;
      await upsertTaskFlag(flagKeyForTask("offer_received", q.id), {
        snoozedUntil: journeyEventISO(v.remindDate, new Date().toISOString()),
      });
      flash("Quieter until then — the reply-by date still counts down.");
      return;
    }

    /* notify — one task per selected agent, through the existing builder */
    const groups = notifyGroups(q, queries, agents, userTasks);
    const rows = [...groups.pages, ...groups.queryOnly].filter((r) => v.notifySel[r.queryId]);
    if (!rows.length) return;
    /* ⚠️ `reminderFields` TAKES THE WHOLE SELECTION — one builder, one shape, and the reply-by
       becomes the tasks' due date (omitted where there is none, rather than invented). */
    const fields = reminderFields(rows, q.id, q.responseDeadline);
    let made = 0;
    for (const f of fields) {
      try { await addUserTask(f); made += 1; }
      catch { /* one refusal must not lose the others — the count states what landed */ }
    }
    /* ⚠️ THE TOAST STATES WHAT ACTUALLY LANDED, not what was asked for. A partial failure that
       reported the full number would be the app telling the writer people had been remembered who
       had not. */
    flash(made === rows.length
      ? `${made} reminder${made === 1 ? "" : "s"} added to your list.`
      : `${made} of ${rows.length} reminders added — try the rest again?`);
  }
  async function commitChaseFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return false;
    const nowIso = new Date().toISOString();
    const base = quickNudgePayload({ cardKey: card.key, label: card.title, queryId: q.id, method: q.sendMethod, nowIso });
    const p = {
      ...base,
      nudgeDate: v.sentDate,
      checkBackDate: new Date(new Date(`${v.sentDate}T12:00:00`).getTime() + v.checkBackDays * 86400000).toISOString(),
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
    };
    const r = await logNudge(...nudgeWriteArgs(p, nowIso));
    if (!r.success) { flash(r.error || "Couldn’t log the nudge."); return false; }
    const undo = async () => {
      const acts = activitiesRef.current
        .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
        .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
      if (acts[0]?.id) await deleteActivity(acts[0].id);
    };
    doneToast(card, async () => { await undo(); flash("Restored"); });
    return true;
  }
  async function commitCloseFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q || !v.reason) return false;
    const target = CLOSE_REASONS.find((r) => r.key === v.reason);
    if (!target) return false;
    const prev = q.status as QueryStatus;
    try {
      await updateQueryStatus(q.id, target.status, v.note.trim() || `Closed — ${target.label.toLowerCase()}`);
    } catch {
      flash("Couldn’t close that — try again?", { label: "Try again", fn: () => { void commitCloseFromPane(card, v); } });
      return false;
    }
    const undo = () => undoQueryStatus(q.id, prev, target.status);
    doneToast(card, async () => { await undo(); flash("Restored"); });
    return true;
  }
  async function commitFixFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const ag = card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;
    if (!ag) return false;
    const fields: Partial<Agent> = {};
    if (v.fixResponseWeeks.trim()) {
      fields.responseTimeWeeks = Number(v.fixResponseWeeks);
      fields.noResponseMeansNo = v.fixNoMeansNo;
    }
    if (v.fixMaterials.length) fields.materialsWanted = v.fixMaterials;
    if (v.fixMswl.trim()) fields.mswlNotes = v.fixMswl.trim();
    if (!Object.keys(fields).length) return false;
    try {
      await updateAgent(ag.id, fields);
    } catch {
      flash("Couldn’t save that — try again?", { label: "Try again", fn: () => { void commitFixFromPane(card, v); } });
      return false;
    }
    /* ⚠️ THE FLAG IS RESOLVED ONLY AFTER THE WRITE LANDS. Resolving first would clear the card on a
       failed save, which is the one outcome worse than the card staying. */
    resolveTaskFlag(flagKeyForTask("data_quality_poor", ag.id));
    /* ⚠️ NO UNDO ARM. The other four journeys undo by restoring a query's PREVIOUS status, which
       `recomputeQuery` derives and this write does not touch. Here the previous state is an ABSENT
       field, and "undo" would mean writing `deleteField()` back over three fields the writer may
       have edited elsewhere in between. The agent's own editor is the honest way back.
       So the receipt says what happened and offers nothing it cannot deliver — `doneToast` takes an
       undo arm as a REQUIRED argument, which is the signature doing its job. */
    flash("Saved to the profile.");
    return true;
  }
  async function commitSendFromPane(card: BoardCard, v: JourneySendValues): Promise<boolean> {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return false;
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return false;
    const nowIso = new Date().toISOString();
    const base = quickSendPayload({
      cardKey: card.key, label: card.title, taskType: card.taskType, queryId: q.id,
      targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit",
      method: v.method, nowIso,
    });
    /* the writer's answers replace the defaults; the SHAPE is the quick path's, so the write is */
    const p = {
      ...base,
      sentDate: journeyEventISO(v.sentDate, nowIso),
      method: v.method,
      materials: [...v.materials, ...(v.also.trim() ? [v.also.trim()] : [])],
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
      /* ⚠️ THE EXPECTATION AND THE REMINDER TRAVEL WITH THE SEND (popup round, Phase 1). The pane
         REQUIRES both, and this committer had no member for either — so the day the primary began
         writing in place, the form's two hardest-won answers would have been demanded and then
         dropped. `markSentWriteArgs` has accepted both all along; nothing downstream changes. */
      ...(v.writerExpectedDate ? { writerExpectedDate: v.writerExpectedDate } : {}),
      ...(v.nudgeDate ? { nudgeDate: v.nudgeDate } : {}),
    };
    const prev = q.status as QueryStatus;
    try {
      await recordMaterialsSent(markSentWriteArgs(p));
    } catch {
      flash("Couldn’t record that — try again?", { label: "Try again", fn: () => { void commitSendFromPane(card, v); } });
      return false;
    }
    const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);
    doneToast(card, async () => { await undo(); flash("Restored"); });
    return true;
  }
  async function commitFromPane(card: BoardCard, v: JourneySendValues, bulkRows: RecordSweepRow[]): Promise<boolean> {
    /* ⚠️ THE COHORT IS DECIDED BY THE CARD, NOT BY A JOURNEY KIND. `paneJourneyKind` has no member
       for bulk — it predates the table — and the rows live in the page's own state rather than in
       the values object, because the table edits fifteen queries and `JourneySendValues` describes
       one. `commitRecordSweep` is the existing per-row `updateQuery`, unchanged. */
    if (isBulkCard(card)) return commitRecordSweep(card, bulkRows);
    const kind = paneJourneyKind(card, agents);
    if (kind === "chase") return commitChaseFromPane(card, v);
    if (kind === "close") return commitCloseFromPane(card, v);
    if (kind === "offer") return commitOfferFromPane(card, v);
    /* ⚠️ THE NOTE'S COMMIT IS `quickDone` ITSELF — completion goes through the PRIMITIVE, from
       every path. My first version wrote `updateUserTask({ done: true })` inline, which is a COPY
       of `quickDone`'s user-task arm: the same write, its own receipt, its own undo. The board lock
       caught it, and it was right to — an inline completion is how the undo was bypassed once
       already. One primitive, four entrances. */
    if (kind === "note") {
      /* ⚠️ `completionVia` DECIDES WHETHER A TICK CAN WRITE AT ALL, and it is asked rather than
         assumed: a kind it answers "none" for has nothing to record, so there is nothing to advance
         past. `quickDone` surfaces its own failure toast where the write is attempted and denied. */
      if (completionVia(card) === "none") return false;
      await quickDone(card);
      return true;
    }
    if (kind === "fix") return commitFixFromPane(card, v);
    if (kind === "materials") return commitMaterialsFromPane(card, v);
    /**
     * ⚠️ A SEND RECORDS THE PARCEL BEFORE IT RECORDS THE SEND, and in that order deliberately. The
     * two live on different records — `materialsWanted` on the query, the send itself in the
     * activity — so there is no single write that does both. Parcel first means a status write that
     * fails leaves the parcel recorded (recoverable), where the other order would leave a query
     * marked sent with no record of what went. One receipt covers both: `commitSendFromPane`'s.
     */
    await writeQueryMaterials(card, v.recordRows);
    return commitSendFromPane(card, v);
  }
  /* ⚠️ `doneToast` IS NOT RETURNED, because nothing outside this module calls it — every one of
     its callers moved here with it. An exported helper with no consumer is API invented on spec. */
  return { commit: commitFromPane, quickDone };
}

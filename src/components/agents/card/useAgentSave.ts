/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 C — THE ONE SAVE for an agent's details, whichever shape asked: the card's edit mode on the Contact
 * list, the wide card's, the app-level panel on every other page, and each inline edit (a wishlist, the genres, the
 * reply time, a contact row, the rating). It is the agent card host's `onEditorSave`, lifted out unchanged:
 *
 *   · ONLY what changed (`cardPatch`), through `commitCardSave` — sanitised, atomic, with the reply-time deadline
 *     fan-out in the same batch, a wishlist edit stamping `mswlCheckedAt`, and the data-quality flag resolved when the
 *     save closes the last gap;
 *   · DECISION 13: a save leaving the door closed with a new reopening date adds the reopen reminder;
 *   · THE UNDO IS A SNAPSHOT, read before the save; none offered when the snapshot could not be read.
 *
 * ⚠️ NEVER THROUGH `updateAgent`: that writer logs an activity, so an Undo would append a second entry.
 */
import { useCallback } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import type { Agent } from "../../../types";
import { type EditCtx, alsoChanges } from "../../../lib/contactEdit";
import { type AgentEditPatch, type SaveAgentResult } from "../../../lib/saveAgentEdits";
import { commitCardSave } from "../../../lib/agentCardSave";
import { cardSavedLine, reminderOnSave, reopenReminder } from "../../../lib/agentCard";
import { type CardDraft, applyPatch, cardPatch, changedTabs, inversePatch, toContactDraft } from "../../../lib/cardDraft";
import { emitAgentCardEvent } from "../../../lib/agentCardStore";

export type AgentSaveOutcome =
  | { ok: true; line: string; undo?: () => Promise<boolean>; nothing?: boolean; tabs: ReturnType<typeof changedTabs> }
  | { ok: false; error: string };

export function useAgentSave(o: { writeAgent?: (id: string, patch: AgentEditPatch) => Promise<SaveAgentResult>; editCtx: EditCtx }) {
  const { currentUser, queries, resolveTaskFlag, addUserTask, deleteUserTask } = useScriptAllyDb();
  const { writeAgent, editCtx } = o;

  /** `emit: false` — an inline edit: the caller says so in its own toast, and the list raises no notice */
  const saveDraft = useCallback(async (agent: Agent, base: CardDraft, d: CardDraft, opts: { emit?: boolean } = {}): Promise<AgentSaveOutcome> => {
    const patch = cardPatch(agent, base, d, new Date().toISOString());
    const tabs = changedTabs(base, d);
    if (Object.keys(patch).length === 0) return { ok: true, line: "No changes.", nothing: true, tabs };
    const notes = alsoChanges(agent, toContactDraft(agent, base, d), editCtx);
    const before = { ...agent } as Agent;
    const after = applyPatch(agent, patch);
    const due = reminderOnSave(before, after);
    let reminderId: string | undefined;
    const addReminder = async () => {
      const task = due ? reopenReminder(after) : null;
      if (task) { try { reminderId = await addUserTask(task); } catch { reminderId = undefined; } }
    };
    let undo: (() => Promise<boolean>) | undefined;
    if (writeAgent) {
      /* the lab's cast: nothing but the agent, and the reminder the save added, to put back */
      const res = await writeAgent(agent.id, patch);
      if ("error" in res) return { ok: false, error: res.error };
      await addReminder();
      undo = async () => {
        const r = await writeAgent(before.id, inversePatch(before, patch));
        if ("error" in r) return false;
        if (reminderId) await deleteUserTask(reminderId);
        emitAgentCardEvent({ type: "undone", agentId: before.id });
        return true;
      };
    } else {
      if (!currentUser) return { ok: false, error: "Not signed in." };
      const out = await commitCardSave({ uid: currentUser.id, agent, queries, patch, resolveTaskFlag, afterCommit: addReminder });
      /* "in", not `!res.ok`: with strictNullChecks off a boolean discriminant does not narrow */
      if ("error" in out.res) return { ok: false, error: out.res.error };
      if (out.undo) {
        const restore = out.undo;
        undo = async () => {
          const ok = await restore();
          if (ok) emitAgentCardEvent({ type: "undone", agentId: agent.id });
          return ok;
        };
      }
    }
    if (opts.emit !== false) emitAgentCardEvent({ type: "saved", agentId: agent.id, before, after, undo: undo ? async () => ((await undo!()) ? { text: "Undone." } : { text: "Couldn’t undo the save." }) : undefined });
    return { ok: true, line: cardSavedLine(notes, reminderId ? due : null), undo, tabs };
  }, [writeAgent, editCtx, currentUser, queries, resolveTaskFlag, addUserTask, deleteUserTask]);

  return { saveDraft };
}

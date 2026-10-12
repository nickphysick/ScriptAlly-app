/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AN AGENT'S NOTES — the one listener and the three writers, lifted out of the agent card's host (Contact list
 * v16 §F) so the card and the agent's side panel write a note the same way. Moved, not rewritten: the documents,
 * their shapes and the card cache (`notePreview`) are exactly as the host wrote them.
 *
 * ⚠️ ONE LISTENER, FOR THE OPEN AGENT ONLY — never one per row.
 * ⚠️ A NOTE HAS `text` AND `createdAt` AND NOTHING ELSE. There is no pin on an agent's note: the rules allow an
 *    update to change `text` only, and nothing writes `pinnedNoteId`.
 */
import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import type { Agent } from "../../../types";
import type { AgentEditPatch, SaveAgentResult } from "../../../lib/saveAgentEdits";
import { type AgentNote, committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft } from "../../../lib/agentNotes";

export type AgentNoteWriter = (agentId: string, patch: AgentEditPatch) => Promise<SaveAgentResult>;

export function useAgentNotes(agent: Agent | null, uid: string | null, writeAgent: AgentNoteWriter) {
  const agentId = agent?.id ?? null;
  const currentUser = uid ? { id: uid } : null;
  /* ONE notes listener, for the open agent only — never one per row. */
  const [storedNotes, setStoredNotes] = useState<AgentNote[]>([]);
  useEffect(() => {
    setStoredNotes([]);
    if (!agentId || !currentUser) return;
    const ref = collection(db, "users", currentUser.id, "agents", agentId, "notes");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list: AgentNote[] = [];
        snap.forEach((d) => {
          const data = d.data() as { text?: string; createdAt?: { toDate?: () => Date } | string };
          list.push({
            id: d.id,
            text: String(data.text ?? ""),
            createdAt:
              typeof data.createdAt === "object" && data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : String(data.createdAt ?? ""),
          });
        });
        setStoredNotes(list);
      },
      (e) => handleFirestoreError(e, OperationType.LIST, `users/${currentUser.id}/agents/${agentId}/notes`),
    );
    return () => unsub();
  }, [agentId, uid]);

  /* ── the notes subcollection: a note saves as it is written, outside Save changes ─────────── */

  /** The documented card cache, kept in step with the notes as they now stand. */
  const keepPreview = useCallback(async (orig: Agent, list: AgentNote[]) => {
    const after = committedNotes(effectiveNotes(list, emptyNotesDraft(), { flatNote: orig.notes, dateAdded: orig.dateAdded }));
    const preview = computeNotePreview(after, orig.pinnedNoteId);
    if ((orig.notePreview ?? "") !== preview) await writeAgent(orig.id, { notePreview: preview });
  }, [writeAgent]);

  /** A note write, its preview, and the house error handling — resolving to whether it landed, so
   *  the composer keeps the words when it did not. */
  const noteWrite = useCallback(async (
    op: OperationType,
    run: (uid: string, orig: Agent) => Promise<AgentNote[]>,
  ): Promise<boolean> => {
    if (!agent || !currentUser) return false;
    try {
      await keepPreview(agent, await run(currentUser.id, agent));
      return true;
    } catch (e) {
      /* the handler logs and THROWS (its callers' control flow); here the flow is the boolean */
      try { handleFirestoreError(e, op, `users/${currentUser.id}/agents/${agent.id}/notes`); } catch { /* logged */ }
      return false;
    }
  }, [agent, currentUser, keepPreview]);

  const onAddNote = useCallback((text: string) => noteWrite(OperationType.WRITE, async (uid, orig) => {
    const noteId = `note-${Math.random().toString(36).slice(2, 11)}`;
    const createdAt = new Date().toISOString();
    await setDoc(doc(collection(db, "users", uid, "agents", orig.id, "notes"), noteId), { text, createdAt });
    return [...storedNotes, { id: noteId, text, createdAt }];
  }), [noteWrite, storedNotes]);
  const onEditNote = useCallback((id: string, text: string) => noteWrite(OperationType.UPDATE, async (uid, orig) => {
    await updateDoc(doc(db, "users", uid, "agents", orig.id, "notes", id), { text });
    return storedNotes.map((n) => (n.id === id ? { ...n, text } : n));
  }), [noteWrite, storedNotes]);
  const onDeleteNote = useCallback((n: AgentNote) => noteWrite(OperationType.DELETE, async (uid, orig) => {
    await deleteDoc(doc(db, "users", uid, "agents", orig.id, "notes", n.id));
    return storedNotes.filter((x) => x.id !== n.id);
  }), [noteWrite, storedNotes]);

  return { storedNotes, onAddNote, onEditNote, onDeleteNote };
}

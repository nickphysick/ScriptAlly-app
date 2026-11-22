/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YOUR NOTES v1 — THE READS AND THE TWO CALLS. The writer's own `betaFeedback` docs (a list filtered `where uid == me`,
 * which the rules allow), one note's `thread` (read only while its panel is open), and the two callables that are the
 * writer's only way to write anything under a note: `addFeedbackNote` and `markFeedbackSeen`.
 *
 * ⚠️ NO CLIENT WRITES TO `betaFeedback`. Everything here reads, or calls a function that checks the verified uid.
 * ⚠️ A FAILED READ IS AN ERROR, NEVER AN EMPTY LIST: "Nothing sent yet" would be false for a writer whose record could
 *    not be read, and a ring of zeros would be a figure made up.
 * ⚠️ FIREBASE IS LOADED WHEN FIRST NEEDED, as `useFoundingStats` does.
 */
import { useCallback, useEffect, useState } from "react";
import { byNewest, msOf, newReplyCount, noteFrom, type YourNote } from "./yourNotes";

export interface NotesState { loading: boolean; error: boolean; notes: YourNote[]; retry: () => void }

export function useYourNotes(uid: string | null | undefined): NotesState {
  const [state, setState] = useState<{ loading: boolean; error: boolean; notes: YourNote[] }>({ loading: true, error: false, notes: [] });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (!uid) { setState({ loading: false, error: false, notes: [] }); return undefined; }
    setState((s) => ({ ...s, loading: true, error: false }));
    let off: (() => void) | undefined;
    let live = true;
    void (async () => {
      try {
        const [{ collection, onSnapshot, query, where }, { db }] = await Promise.all([import("firebase/firestore"), import("./firebase")]);
        if (!live) return;
        off = onSnapshot(
          query(collection(db, "betaFeedback"), where("uid", "==", uid)),
          (snap) => setState({ loading: false, error: false, notes: snap.docs.map((d) => noteFrom(d.id, d.data())).sort(byNewest) }),
          () => setState({ loading: false, error: true, notes: [] }),
        );
      } catch {
        if (live) setState({ loading: false, error: true, notes: [] });
      }
    })();
    return () => { live = false; off?.(); };
  }, [uid, attempt]);
  return { ...state, retry };
}

/** The badge the sidebar and the rail show: replies the writer has not seen. 0 while loading or on a failed read. */
export function useNewReplies(uid: string | null | undefined): number {
  const { notes } = useYourNotes(uid);
  return newReplyCount(notes);
}

export interface ThreadMessage { id: string; from: "writer" | "founder"; text: string; at: number | null }

/** One note's thread, oldest first, read while `on` (the panel is open). */
export function useThread(noteId: string | null, on: boolean): { loading: boolean; error: boolean; messages: ThreadMessage[] } {
  const [state, setState] = useState<{ loading: boolean; error: boolean; messages: ThreadMessage[] }>({ loading: true, error: false, messages: [] });
  useEffect(() => {
    if (!noteId || !on) { setState({ loading: false, error: false, messages: [] }); return undefined; }
    setState({ loading: true, error: false, messages: [] });
    let off: (() => void) | undefined;
    let live = true;
    void (async () => {
      try {
        const [{ collection, onSnapshot }, { db }] = await Promise.all([import("firebase/firestore"), import("./firebase")]);
        if (!live) return;
        off = onSnapshot(
          collection(db, "betaFeedback", noteId, "thread"),
          (snap) => setState({
            loading: false, error: false,
            messages: snap.docs.flatMap((d) => {
              const x = d.data();
              const text = typeof x.text === "string" ? x.text.trim() : "";
              if (!text) return [];
              return [{ id: d.id, from: x.from === "founder" ? "founder" as const : "writer" as const, text, at: msOf(x.at) }];
            }).sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity)),
          }),
          () => setState({ loading: false, error: true, messages: [] }),
        );
      } catch {
        if (live) setState({ loading: false, error: true, messages: [] });
      }
    })();
    return () => { live = false; off?.(); };
  }, [noteId, on]);
  return state;
}

async function call<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const out = await httpsCallable(getFunctions(undefined, "europe-west2"), name)(data);
  return out.data as T;
}

/** A follow-up on the writer's own note; `stillHappening` opens a built or fixed note again. */
export const addFeedbackNote = (id: string, text: string, stillHappening = false): Promise<{ ok: true; reopened: boolean }> =>
  call("addFeedbackNote", { id, text, ...(stillHappening ? { stillHappening: true } : {}) });

/** The writer opened the note: its `writerSeenAt`, and nothing else. */
export const markFeedbackSeen = (id: string): Promise<{ ok: true }> => call("markFeedbackSeen", { id });

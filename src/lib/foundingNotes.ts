/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * foundingNotes — the founding card's "Your notes" (Dashboard v2, Part D).
 *
 * The record is `betaFeedback`, written only by the `sendBetaFeedback` callable; the rules let a writer read their
 * OWN documents (a list filtered `where uid == me`). Nick sets `status`, `title` and `statusAt` by hand
 * (functions/src/betaFeedbackCore.ts documents them): absent = sent, then read · planned · built · fixed.
 *
 * ⚠️ FIREBASE IS LOADED WHEN FIRST NEEDED, as `useFoundingStats` does: this page is also the onboarding ghost,
 * mounted with no Firebase to load. A failed read shows the empty line rather than an error: the card is about
 * contributing, and "Nothing sent yet" is never false for a writer whose record cannot be read… so it says nothing
 * instead (`error`), and the card hides the section's body.
 */
import { useEffect, useState } from "react";
import type { FeedbackKind } from "./beta";

export type NoteTag = "Like" | "Don’t like" | "Idea";
export interface FoundingNote { tag: NoteTag; text: string; sentMs: number | null; outcome: string }

const TAG: Record<FeedbackKind, NoteTag> = {
  "Something I liked": "Like",
  "Something's broken": "Don’t like",
  "Something's confusing": "Don’t like",
  "An idea": "Idea",
};
/** what became of a note — the console's statuses, in the writer's words */
export const OUTCOME: Record<string, string> = { read: "Read", planned: "Planned", built: "Now in the app", fixed: "Fixed" };
export const SENT_OUTCOME = "Sent";
/** v2.1: the line where the last note would be, with no note yet — named for the writer's NEXT rank */
export const noNotesLine = (nextRank: string): string => `Your first note counts towards ${nextRank}.`;

const ms = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  return null;
};

/** One stored document → the note the card shows; null where it is not a note the card can name. */
export function noteFrom(d: Record<string, unknown>): FoundingNote | null {
  const kind = d.kind as FeedbackKind;
  const tag = TAG[kind];
  if (!tag) return null;
  const title = typeof d.title === "string" && d.title.trim() ? d.title.trim() : "";
  const message = typeof d.message === "string" ? d.message.trim() : "";
  const text = title || (message.length > 120 ? `${message.slice(0, 119).trimEnd()}…` : message);
  if (!text) return null;
  const status = typeof d.status === "string" ? d.status : "";
  return { tag, text, sentMs: ms(d.createdAt ?? d.sentAt ?? d.timestamp), outcome: OUTCOME[status] ?? SENT_OUTCOME };
}

/** The newest note; undated notes sort last. */
export function latestNote(docs: readonly Record<string, unknown>[]): FoundingNote | null {
  const notes = docs.map(noteFrom).filter((n): n is FoundingNote => n !== null);
  notes.sort((a, b) => (b.sentMs ?? -Infinity) - (a.sentMs ?? -Infinity));
  return notes[0] ?? null;
}

export function useLatestNote(uid: string | null | undefined): { loading: boolean; error: boolean; note: FoundingNote | null } {
  const [state, setState] = useState<{ loading: boolean; error: boolean; note: FoundingNote | null }>({ loading: true, error: false, note: null });
  useEffect(() => {
    if (!uid) { setState({ loading: false, error: false, note: null }); return undefined; }
    let off: (() => void) | undefined;
    let live = true;
    void (async () => {
      try {
        const [{ collection, onSnapshot, query, where }, { db }] = await Promise.all([import("firebase/firestore"), import("./firebase")]);
        if (!live) return;
        off = onSnapshot(
          query(collection(db, "betaFeedback"), where("uid", "==", uid)),
          (snap) => setState({ loading: false, error: false, note: latestNote(snap.docs.map((x) => x.data())) }),
          () => setState({ loading: false, error: true, note: null }),
        );
      } catch {
        if (live) setState({ loading: false, error: true, note: null });
      }
    })();
    return () => { live = false; off?.(); };
  }, [uid]);
  return state;
}

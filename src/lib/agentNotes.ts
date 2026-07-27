/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — notes (decision 13) and the `notePreview` denormalisation.
 *
 * Notes live in the per-agent `notes` subcollection. Posting, deleting and pinning are all
 * DRAFT-BUFFERED like every other editor interaction: nothing is written until Done, which commits
 * the note documents and the agent diff together. That single-writer property is what makes the
 * denormalised preview safe.
 *
 * WHY notePreview IS STORED (a deliberate, documented exception to derived-over-stored): the card
 * face shows a note preview, but notes live in a subcollection — deriving it per card would mean
 * one listener per card. The alternatives all cost more: collectionGroup needs a rules change and a
 * userId on note docs; fetch-on-open removes the preview from the face, which IS the feature; and a
 * flat-string-only preview strands the moment notes migrate. It is safe because there is exactly
 * one writer (the Done commit), nothing derives correctness from it (no status, count or task rule
 * reads it), and it is a display cache rather than a fact.
 *
 * THE BLANKING FOOTGUN: the recompute must never run against a subcollection that hasn't resolved
 * yet — an unresolved listener looks exactly like "no notes", and would wipe a valid preview on
 * Done. Hence `loaded` is a REAL flag, never a defaulted empty array, and an empty computed preview
 * may only overwrite a non-empty stored one when the loaded notes are genuinely empty.
 */

export interface AgentNote {
  id: string;
  text: string;
  createdAt: string;
  /** Typed but not yet committed — rendered muted, WITHOUT a timestamp, marked UNSAVED. The
   *  timestamp is a commit artefact, so withholding it is truthful rather than decorative. */
  pending?: boolean;
  /** Marked for deletion by Done — struck through rather than removed, so Escape visibly restores
   *  something the writer can see they didn't lose. */
  pendingDelete?: boolean;
}

/** A note the writer has typed but not yet committed — it has no doc id until Done. */
export interface PendingNote {
  tempId: string;
  text: string;
  createdAt: string;
}

/** The buffered note state carried on the draft. */
export interface NotesDraft {
  added: PendingNote[];
  deletedIds: string[];
  /** Set once the legacy flat `agent.notes` string has been folded into the bubble list. */
  migratedFlat: boolean;
}

export const emptyNotesDraft = (): NotesDraft => ({ added: [], deletedIds: [], migratedFlat: false });

/** The id the legacy flat note carries until Done gives it a real one. */
export const FLAT_NOTE_ID = "__flat__";

const byOldestFirst = (a: AgentNote, b: AgentNote) =>
  Date.parse(a.createdAt || "0") - Date.parse(b.createdAt || "0");

/**
 * What the Notes pane renders: the stored notes minus buffered deletions, plus buffered additions,
 * with the legacy flat note as the OLDEST bubble (timestamped `dateAdded`) until it's migrated.
 * Oldest first — the chat reads downward and the composer sits at the foot.
 */
export function effectiveNotes(
  stored: AgentNote[],
  draft: NotesDraft,
  legacy?: { flatNote?: string; dateAdded?: string },
): AgentNote[] {
  const out: AgentNote[] = [];
  const flat = (legacy?.flatNote || "").trim();
  if (flat && !draft.migratedFlat) {
    out.push({
      id: FLAT_NOTE_ID, text: flat, createdAt: legacy?.dateAdded || "",
      pendingDelete: draft.deletedIds.includes(FLAT_NOTE_ID),
    });
  }
  // Deletions are SHOWN struck, not removed — the buffer is visible, so Escape reads as undo.
  for (const n of stored) out.push({ ...n, pendingDelete: draft.deletedIds.includes(n.id) });
  out.sort(byOldestFirst);
  for (const p of draft.added) out.push({ id: p.tempId, text: p.text, createdAt: p.createdAt, pending: true });
  return out;
}

/**
 * The preview text for a given note list: the pinned note when it resolves, else the latest, else
 * "". A dangling pin (its note deleted) falls back to the latest — the pin is cleared separately.
 */
/** The notes as they will be once Done commits: struck ones gone, pending ones real. */
export const committedNotes = (notes: AgentNote[]): AgentNote[] =>
  notes.filter((n) => !n.pendingDelete).map(({ pending, pendingDelete, ...n }) => n);

export function computeNotePreview(notes: AgentNote[], pinnedNoteId?: string): string {
  if (pinnedNoteId) {
    const pinned = notes.find((n) => n.id === pinnedNoteId);
    if (pinned) return pinned.text.trim();
  }
  const latest = notes[notes.length - 1];
  return latest ? latest.text.trim() : "";
}

export interface PreviewInput {
  /** TRUE only once the notes listener has actually resolved. Never default this. */
  loaded: boolean;
  notes: AgentNote[];
  pinnedNoteId?: string;
  /** What's currently stored on the agent. */
  stored?: string;
}

/**
 * The value Done should write for `notePreview`, or `undefined` for "leave it alone".
 *
 * Guards, in order:
 *  1. the listener hasn't resolved → never touch it (the blanking footgun);
 *  2. nothing changed → stay out of the diff entirely;
 *  3. an EMPTY computed preview may only overwrite a non-empty stored one when the loaded notes are
 *     genuinely empty — which is exactly how deleting the last note clears it to "".
 */
export function notePreviewWrite(input: PreviewInput): string | undefined {
  if (!input.loaded) return undefined;

  const computed = computeNotePreview(input.notes, input.pinnedNoteId);
  const stored = (input.stored || "").trim();
  if (computed === stored) return undefined;

  if (!computed && stored && input.notes.length > 0) return undefined;

  return computed;
}

/**
 * Self-healing: legacy and imported agents have no stored preview, so opening one and pressing Done
 * repairs it. This is just `notePreviewWrite` — it returns a value whenever the stored preview
 * disagrees with the resolved truth — but named so the intent is legible at the call site.
 */
export const repairedNotePreview = notePreviewWrite;

/** A dangling pin (the pinned note is gone) must clear, so the preview falls back to latest. */
export function resolvePin(notes: AgentNote[], pinnedNoteId?: string): string | undefined {
  if (!pinnedNoteId) return undefined;
  return notes.some((n) => n.id === pinnedNoteId) ? pinnedNoteId : undefined;
}

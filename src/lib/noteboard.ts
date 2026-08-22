/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * noteboard — the Noteboard's pure layer (build from design-refs/noteboard-mockup.html).
 *
 * Everything here is a function of its arguments: no db, no React, no Firebase. The page is a
 * rendering of these, which is what lets the locks call the SAME function the page calls rather
 * than a literal that agrees with it today.
 */
import { NoteColour, TagDef, UserTask } from "../types";
import { isNoteTask } from "./todoBoard";

/**
 * The mockup's band sentence, verbatim. It lives here rather than in the component because the
 * lock reads it from the ref and from the render, and a string typed twice is a string that
 * drifts once.
 */
export const NOTEBOARD_SUBTITLE =
  "Thoughts, snippets, and things worth keeping — pinned where you can see them.";

/**
 * ⚠️ THE COUNT EXISTS ONLY WHILE SOMETHING NARROWS (finish run, 1c — supersedes `noteCountLabel`,
 * whose resting tally sat beside the search box and read as its label). It states both figures,
 * because "3 notes" under a filter cannot say whether three is all of them.
 */
export const noteFilterLabel = (shown: number, total: number): string => `${shown} of ${total} notes`;

/**
 * The three papers, in the order the composer offers them. Typed as the app's own `NoteColour`,
 * so adding a fourth to that union fails to compile here until this list says where it sits.
 */
export const NOTE_COLOURS: readonly NoteColour[] = ["yellow", "pink", "sage"];

/**
 * ⚠️ ABSENCE IS YELLOW, AND THE DEFAULT LIVES HERE — at the READ, once. Every note written before
 * the field existed has no colour; writing one to each of them would be inventing a choice the
 * writer never made. It is also what makes the write path safe to degrade: when the rules deploy
 * has not landed and the colour write is denied, the note simply reads yellow.
 */
export const noteColour = (t: Pick<UserTask, "colour">): NoteColour => t.colour ?? "yellow";

/**
 * The board's order: newest pinned first. There is no stored order and there should not be — a
 * position is a fact about a list, and this list is a filter over the task store that four other
 * surfaces also read.
 *
 * ⚠️ WHICH IS WHY `createdAt` DECIDES WHERE AN UNDONE REMOVAL LANDS. Nothing else does.
 */
export const sortNotes = (tasks: UserTask[]): UserTask[] =>
  tasks.filter(isNoteTask).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

/**
 * ⚠️ THE RECEIPT IS THE WHOLE DOCUMENT, CAPTURED BEFORE THE DELETE — a COPY, so mutations after
 * capture cannot reach it. Its predecessor (`noteRestoreFields`) carried a NAMED LIST of fields,
 * and two optional fields postdated the list — `committedDate` and `estimateMin` — so a note
 * committed to Today came back silently uncommitted. A list has to chase the schema; the document
 * does not. The restore writes this back verbatim (`restoreUserTask`), never through the create
 * path, whose builder stamps its own `createdAt` and accepts only the fields it knows about.
 */
export const noteReceipt = (n: UserTask): UserTask => ({ ...n });

/** The composer's draft — the mockup's three fields and nothing else. */
export interface NoteDraft {
  body: string;
  colour: NoteColour;
  tag: string;
}

export const emptyDraft = (): NoteDraft => ({ body: "", colour: "yellow", tag: "" });

/**
 * ⚠️ CHANGING THE PAPER REPAINTS; IT DOES NOT START AGAIN. The swatch is pressed mid-sentence more
 * often than not, so the body and the tag come through untouched.
 */
export const composerWithColour = (d: NoteDraft, colour: NoteColour): NoteDraft => ({ ...d, colour });

/**
 * ⚠️ AN EMPTY COMMIT KEEPS THE WORDS. Blur commits, and blur happens by accident — clicking away,
 * tabbing out, the window losing focus. Treating an empty field as "delete what was there" would
 * make a misclick destructive on a surface whose whole promise is that nothing is final.
 */
export const editCommit = (previous: string, typed: string): string => typed.trim() || previous;

/** One chip in the tool row. `id` is null for #All, which narrows nothing. */
export interface NoteChip {
  id: string | null;
  label: string;
}

/**
 * ⚠️ DERIVED FROM THE TAGS IN USE, never from the stored taxonomy. A tag the writer defined and
 * has not put on a note is not a way to narrow this board — offering it would hand them a filter
 * that can only ever return nothing, which is the "control over nothing" fault the Tasks pack
 * retired a chip for once already.
 *
 * The DEFS still supply the label, because that is where a tag's identity lives and the id is not
 * something a reader should ever see. A tag id with no def is skipped rather than rendered raw:
 * `#t-letter` in a chip row is a leak, not a label.
 */
export const noteTagChips = (notes: UserTask[], defs: TagDef[]): NoteChip[] => {
  const used = new Set<string>();
  for (const n of notes) for (const t of n.tags ?? []) used.add(t);
  const named = defs
    .filter((d) => used.has(d.id))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((d) => ({ id: d.id, label: d.label }));
  return [{ id: null, label: "All" }, ...named];
};

/**
 * The label of a note's FIRST tag — what the composer's single tag field seeds with. A note can
 * carry several through the ⋯ Tags… picker; the field shows the first and, per `saveEdit`'s
 * contract, governs the set only when touched. A tag id with no def yields "" rather than the
 * raw id — an id in an input is a leak, not a value.
 */
export const firstTagLabel = (n: Pick<UserTask, "tags">, defs: TagDef[]): string =>
  defs.find((d) => d.id === n.tags?.[0])?.label ?? "";

/** Case-insensitive, over the words a note actually shows. */
export const noteMatchesSearch = (n: UserTask, q: string): boolean => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${n.text} ${n.detail ?? ""}`.toLowerCase().includes(needle);
};

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Turning a note into a task
 *
 * ⚠️ THIS REVERSES A ⚠️ LAW OF THIS APP, KNOWINGLY. The model was "THE DATE IS THE DOOR": a note
 * and a task were ONE document and giving a note a date MOVED it — off this board, onto the To-do
 * list, onto the Calendar. "One object, three rooms. Nothing copies, nothing moves." The design
 * now asks for the opposite: the note stays where the writer pinned it and a task appears beside
 * it. That is two documents, and it cannot be a rendering of the old model. "Give it a date…" is
 * retired with it rather than left standing — two doors to the same place with opposite meanings
 * is worse than either one.
 *
 * ⚠️ AND THE LINK IS DERIVED, NOT STORED. A reference field would need the closed `userTasks`
 * rules allowlist opened, and an unlisted key on a `hasOnly()` create denies the whole document —
 * so the projection takes a KNOWN id instead. The note has a task iff `notetask-{noteId}` exists.
 * No field, no schema change, no deploy, and nothing to keep in step.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ BUILT FROM AN ID, NEVER FROM WORDS. `isValidId` requires `^[a-zA-Z0-9_-]+$`, and an id
 * composed from display text is exactly how that gets failed by accident — the R&R heal id
 * carried an ampersand from a status label and was denied permanently and silently. A task id is
 * already in the charset, so a prefix keeps it there.
 */
export const projectedTaskId = (noteId: string): string => `notetask-${noteId}`;

/** The task a note has projected, if it still has one. Absence is the answer, not an error. */
export const projectedTask = (n: Pick<UserTask, "id">, all: UserTask[]): UserTask | undefined =>
  all.find((t) => t.id === projectedTaskId(n.id));

/**
 * The title the popover OFFERS — the note's first line, capped. It is a starting point the writer
 * edits, never a decision: a note is prose and a task is a thing to do, and the two are only
 * sometimes the same sentence.
 */
export const noteTaskTitle = (body: string): string =>
  (body.split("\n")[0] ?? "").trim().slice(0, 60);

/**
 * An example, turned into a draft the writer can edit.
 *
 * ⚠️ IT SEEDS, IT DOES NOT WRITE. Nothing reaches the board until Pin it is pressed — an example
 * that pinned itself would put words there that nobody decided to keep.
 */
export const draftFromExample = (ex: { body: string; colour: NoteColour; tag: string }): NoteDraft => ({
  body: ex.body,
  colour: ex.colour,
  tag: ex.tag,
});

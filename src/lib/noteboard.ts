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
import { NoteColour, UserTask } from "../types";
import { isNoteTask } from "./todoBoard";

/**
 * The mockup's band sentence, verbatim. It lives here rather than in the component because the
 * lock reads it from the ref and from the render, and a string typed twice is a string that
 * drifts once.
 */
export const NOTEBOARD_SUBTITLE =
  "Thoughts, snippets, and things worth keeping — pinned where you can see them.";

/**
 * ⚠️ THE TALLY, NOT THE FILTERED VIEW. It counts what is PINNED — a search that hides five notes
 * has not unpinned them, and a count that moved with the search would be describing the query
 * rather than the board.
 */
export const noteCountLabel = (n: number): string => `${n} note${n === 1 ? "" : "s"} pinned`;

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

/** What a removed note must carry to come back as itself. */
export interface NoteRestore {
  id: string;
  text: string;
  createdAt: string;
  detail?: string;
  tags?: string[];
  colour?: NoteColour;
}

/**
 * ⚠️ CAPTURE BEFORE YOU DESTROY. "Restore by id" is only possible while something still holds the
 * contents; after the delete there is nowhere to read them from. This is called on the note that
 * is about to go, and its result is what the toast's inverse closes over.
 *
 * ⚠️ AND `createdAt` IS THE LOAD-BEARING FIELD. `addUserTask` stamps `createdAt: now` when the
 * caller does not supply one, so an inverse that omits it returns the note to the TOP of the
 * board rather than to its slot — present, and in the wrong place, which reads as a bug in the
 * board rather than in the undo. `tags` and `colour` are here for the same reason: a note that
 * comes back wearing less has not been restored.
 *
 * `userId` is the writer's, `updatedAt` is stamped by the write, and `done` is false by
 * definition on a note — those three are the only fields deliberately not carried.
 */
export const noteRestoreFields = (n: UserTask): NoteRestore => ({
  id: n.id,
  text: n.text,
  createdAt: n.createdAt,
  ...(n.detail ? { detail: n.detail } : {}),
  ...(n.tags && n.tags.length ? { tags: n.tags } : {}),
  ...(n.colour ? { colour: n.colour } : {}),
});

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

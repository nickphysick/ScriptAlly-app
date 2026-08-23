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
import React from "react";
import { NoteColour, TagDef, User, UserTask } from "../types";
import { NOTE_EXAMPLES } from "../components/todo/noteboardExamples";
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
 * What the Noteboard shows, newest pinned first. There is no stored order — a position is a fact
 * about a list, and `createdAt` decides where an undone removal lands.
 *
 * ⚠️ A DATED NOTE STAYS, AND THE PAPER IS HOW THE BOARD TELLS IT FROM A TASK (finish run,
 * Phase 4 / Branch A). The date lives on the note's own document now — one object, one To-do
 * row, one Calendar day — but a dated `UserTask` is indistinguishable from an ordinary To-do
 * task, and a filter that kept every dated task would turn this board into a second To-do list.
 * The discriminator is `colour`: the Noteboard is its ONLY writer (swept and locked in
 * noteboardTask.test.ts), and the conversion stamps it before the date. So:
 *   · dateless ∧ unticked        → a note, by the two-natures law — no marker needed
 *   · dated ∧ papered ∧ unticked → a note that became a task, and it KEEPS ITS PLACE
 *   · dated ∧ unpapered          → the To-do list's business, never shown here
 *   · done                       → off the board (the document survives; untick brings it back)
 */
export const sortNotes = (tasks: UserTask[]): UserTask[] =>
  tasks
    .filter((t) => isNoteTask(t) || (!t.done && !!t.dueDate && t.colour !== undefined))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

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

/* ⚠️ THE PROJECTION LAYER STOOD HERE FOR ONE DAY (projectedTaskId / projectedTask /
 * noteTaskTitle) and is retired, not shadowed — the date lives on the note's own document now
 * (see `sortNotes`), so there is no second document to derive a link to, and the duplicate To-do
 * row the projection produced disappears by construction. The reasoning it carried — the closed
 * rules allowlist, the id charset — is preserved in the finish report. */

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

/* ⚠️ THE EXAMPLE PAPERS RETIRED FROM THE BOARD (workflow run, Phase 1). `ExamplePaper`,
 * `NOTE_EXAMPLE_PAPERS`, `sparseExamples` and `NOTEBOARD_HINT` stood here for one day: three
 * papers, one per colour, shown below the real notes while the board held fewer than three, each
 * dismissible for good. v2 moves the examples to the DRAWER entirely — the board shows the
 * writer's notes and nothing else, and the examples become a place you visit rather than cards
 * you send away. The threshold and the board-level dismissal go with them.
 *
 * ⚠️ THE PREFS READER BELOW STAYS, and its `dismissedExamples` key is now DEAD DATA rather than
 * dead code: `order` (drag-to-reorder) lives in the same sub-map and is read every render, so the
 * reader is load-bearing. Existing dismissals sit unread on user documents; the data and the
 * rules are deliberately untouched — deleting a store is not an unattended-run decision.
 */

/** The total reader for the Noteboard's pref sub-map — absent anything reads as empty. */
export const noteboardPrefs = (
  user: Pick<User, "todoPrefs"> | undefined,
): { dismissedExamples: string[]; order: string[] } => ({
  dismissedExamples: user?.todoPrefs?.noteboard?.dismissedExamples ?? [],
  order: user?.todoPrefs?.noteboard?.order ?? [],
});

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * The writer's own order (paper run, Phase 3)
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE LIST IS A PREFERENCE, NOT A SOURCE. It names ids; the notes are still the notes. An id
 * it names that no longer exists is ignored, and a note it has never heard of still appears —
 * `createdAt` descending remains the answer for anything unplaced. A stale list can therefore
 * never hide a note, which is the property that makes it safe to store on the user rather than
 * on the documents.
 */
export const orderNotes = (notes: UserTask[], order: readonly string[]): UserTask[] => {
  const rank = new Map<string, number>();
  order.forEach((id, i) => { if (!rank.has(id)) rank.set(id, i); });
  return [...notes].sort((a, b) => {
    const ra = rank.get(a.id), rb = rank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;   // both placed
    if (ra !== undefined) return -1;                            // placed beats unplaced
    if (rb !== undefined) return 1;
    return (b.createdAt || "").localeCompare(a.createdAt || ""); // neither: newest first
  });
};

/**
 * Move `from` to sit where `to` sits. Total by construction: the same multiset out as in, so a
 * drag can never drop or duplicate a note however the ids arrive.
 */
export const reorderIds = (ids: readonly string[], from: string, to: string): string[] => {
  const fi = ids.indexOf(from), ti = ids.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return [...ids];
  const next = [...ids];
  next.splice(fi, 1);
  next.splice(next.indexOf(to) + (fi < ti ? 1 : 0), 0, from);
  return next;
};

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Link-aware bodies (paper run, Phase 4)
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Bare http(s) up to whitespace, minus trailing punctuation that belongs to the sentence. */
const URL_RE = /https?:\/\/[^\s<]+/g;
/* a full stop, comma, bracket or quote at the end of a URL is prose — "see https://x/a." */
const TRAILING = /[.,;:!?)\]}'"»]+$/;

/**
 * A note body as React nodes: plain text, with bare URLs as anchors.
 *
 * ⚠️ THERE IS NOTHING TO ESCAPE, AND THAT IS THE POINT. The instruction is "escape first, then
 * linkify — never the reverse", which is the right rule for anyone BUILDING MARKUP. This builds
 * NODES: the text arrives as React children, which React escapes on render by construction, and
 * the href is an attribute value React also escapes. Ordering cannot be got wrong here because
 * there is no string of markup at any point — a body can never become HTML, whatever it contains.
 *
 * `noteboardLinks.test.tsx` holds the same cases against a deliberately linkify-first string
 * implementation and requires them to FAIL there, so the property is evidenced rather than
 * assumed. `dangerouslySetInnerHTML` appears nowhere in this file or the page, and is locked.
 */
export const linkifyBody = (body: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of body.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    const raw = m[0];
    const trimmed = raw.replace(TRAILING, "");
    if (start > last) out.push(body.slice(last, start));
    out.push(
      React.createElement(
        "a",
        { key: `l${i++}`, href: trimmed, target: "_blank", rel: "noopener noreferrer" },
        trimmed,
      ),
    );
    /* whatever the trim took back is prose and rejoins the text */
    if (raw.length > trimmed.length) out.push(raw.slice(trimmed.length));
    last = start + raw.length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
};

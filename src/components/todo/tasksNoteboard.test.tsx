/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Noteboard (tasks-pages pack, Phase 4): masonry not grid, no sidebar, notes only, the
 * note→task conversion (one write, three rooms), the grouped ⋯ menu, delete's confirm + 8s undo,
 * the tag filter and the column-reading toggle. Render smokes live in todoPageSmoke.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserTask } from "../../types";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";
import { facetOf } from "../../lib/todoBoardSort";
import { cardActionYmd } from "../../lib/todoCalendar";
import { isNoteTask as isNote } from "../../lib/todoBoard";

const here = __dirname;
const page = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
const css = readFileSync(join(here, "todoNoteboard.css"), "utf8");

const ut = (over: Partial<UserTask>): UserTask => ({
  id: "n1", userId: "u", text: "Open with the flood", done: false, createdAt: "2026-08-01T09:00:00Z", updatedAt: "",
  ...over,
});

describe("⚠️ masonry, not a stretched grid — and it can be read as a column", () => {
  it("the flow is CSS columns; no display:grid anywhere near it", () => {
    /* ⚠️ RENAMED `.nb-grid` → `.nb-board` (Noteboard rebuild, 22 Aug): the mockup's class is
       `.board`, and porting it class-for-class is what lets the ref and the sheet be diffed.
       The SUBJECT is unchanged — CSS columns, never a stretched grid. */
    /* ⚠️ RE-RE-POINTED (finish run, 1a): `columns: 3` → `column-width: 280px`. The fixed count
       was the mockup's, drawn against a 1240px card; on the full-width page it produced 505px
       notes at 1920. The count now falls out of the viewport. Same subject: columns, never grid. */
    expect(css).toMatch(/\.nb-board\s*\{[^}]*column-width:\s*280px/);
    expect(css).toContain("break-inside: avoid");
    expect(css).not.toMatch(/\.nb-board[^}]*display:\s*grid/);
    expect(css).not.toContain(".nb-grid");   // and the old name is gone, not shadowed
  });

  it("the toggle collapses to one reading column", () => {
    expect(css).toMatch(/\.nb-board\.nb-col1\s*\{[^}]*columns:\s*1/);
    expect(page).toContain('className={`nb-board${column ? " nb-col1" : ""}`}');
  });
});

describe("⚠️ notes only — nothing derived reaches this board", () => {
  it("isNote is the two-natures law: dateless and unticked", () => {
    expect(isNote(ut({}))).toBe(true);
    expect(isNote(ut({ dueDate: "2026-08-12" }))).toBe(false);  // a dated card is a task
    expect(isNote(ut({ done: true }))).toBe(false);             // finished work is the day's record
  });

  it("the page reads userTasks THROUGH isNote and nothing else — no derived source in reach", () => {
    /* ⚠️ THE FILTER MOVED INTO THE PURE LAYER (Noteboard rebuild, 22 Aug) — `sortNotes` is
       `tasks.filter(isNoteTask).sort(byCreatedAtDesc)`, called by the page and by the undo's
       lock, so the two cannot disagree about what a note is. The CLAIM is unchanged: the page's
       only source is userTasks read through isNote. */
    expect(page).toContain("sortNotes(userTasks)");
    /* ⚠️ THE FILTER WIDENED BY ONE CLAUSE (finish run, Phase 4): dated-and-papered notes stay on
       the board — the date lives on the note's own document now, and `colour` (this page's own
       field, nothing else writes it) is what tells a converted note from an ordinary task. The
       claim is unchanged: the ONLY source is userTasks, read through the board's own predicate. */
    const lib = readFileSync(join(here, "../../lib/noteboard.ts"), "utf8");
    expect(lib).toContain("isNoteTask(t) || (!t.done && !!t.dueDate && t.colour !== undefined)");
    for (const derived of ["assembleBoard", "boardColumns", "tasks,", "taskFlags", "activities"]) {
      expect(page, derived).not.toContain(derived);
    }
  });

  it("⚠️ no page sidebar — the layout gets no sidebar prop, per the pack's word over the ref's drawing", () => {
    expect(page).not.toContain("sidebar={");
    expect(page).not.toContain("TodoSideContainer");
  });
});

describe("⚠️ 'THE DATE IS THE DOOR' IS RETIRED — the board projects a task, it does not become one", () => {
  /* ⚠️ THIS BLOCK USED TO ASSERT THE OPPOSITE, and the reversal is deliberate (Noteboard rebuild,
     22 Aug). The old law was: a note and a task are ONE document, and giving the note a date MOVES
     it — off this board, onto the To-do list, onto the Calendar. "One object, three rooms. Nothing
     copies, nothing moves." The design now asks for the note to STAY while a task appears beside
     it, which is two documents and cannot be a rendering of the old model.
     The claims worth keeping are kept, restated against the new mechanism. */

  it("the conversion is the note's OWN date again — and the projection is gone with its id", () => {
    /* ⚠️ REVERSED KNOWINGLY (finish run, Phase 4 / Branch A — the projection lasted one day and
       produced a duplicate To-do row). The write this case once forbade is the correct one now:
       the date goes onto the note, ONE document renders one row everywhere, and the board keeps
       the note because the conversion stamps its paper. noteboardTask.test.ts holds the one-row
       probe against the To-do board's own selector. */
    expect(page).toContain("updateUserTask(note.id, { dueDate: dateDraft })");
    expect(page).not.toContain("projectedTaskId");
    expect(page).not.toContain("give-date");   // the RETIRED door stays retired — this is not it back
  });

  it("the projection lands in the Your-tasks family and on the Calendar — still by derivation", () => {
    const projected = {
      key: "notetask-n1", stream: "nt" as const, title: "t", who: "", subtitle: "", due: "", warn: false,
      snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false,
      userTaskId: "notetask-n1", nature: "task" as const, dueYmd: "2026-08-12",
    };
    expect(facetOf(projected)).toBe("yours");                     // the To-do list's group
    expect(cardActionYmd(projected, [])).toBe("2026-08-12");      // the Calendar's day
    /* ⚠️ AND THE NOTE IS STILL A NOTE — this is the half that reversed */
    expect(isNote(ut({}))).toBe(true);
    expect(isNote(ut({ dueDate: "2026-08-12" }))).toBe(false);    // the PROJECTION is not one
  });

  it("the menu's door says so: Turn into a task…", () => {
    expect(page).toContain('item.id === "make-task"');
    expect(page).toContain("Add to tasks");
  });
});

describe("⚠️ the ⋯ menu — the SAME grammar, the SAME shell", () => {
  it("⚠️ THE MENU'S DOOR CHANGED — Turn into a task…, and its inverse, never both", () => {
    /* ⚠️ SUPERSEDED (Noteboard rebuild, 22 Aug). "Give it a date…" converted the note IN PLACE —
       one write, and it left this board for the To-do list and the Calendar. The board projects
       a task now: the note stays and a second document appears beside it. The two doors mean
       opposite things about whether the note survives, so only one of them ships.
       noteboardTask.test.ts holds the full case, including the retirement. */
    const flat = noteMenu(false).flatMap((g) => g.entries) as MenuLeaf[];
    expect(flat.map((l) => l.label)).toEqual(["Edit the note…", "Tags…", "Turn into a task…", "Remove note…"]);
    expect(noteMenu(false)).toHaveLength(2); // the danger group stands apart, the board's pattern
    expect(flat.find((l) => l.id === "delete-task")!.danger).toBe(true);
    /* every OPENER says so — and the two that act at once deliberately do not */
    for (const l of flat) {
      const opens = !["detach-task"].includes(l.id);
      expect(l.label.endsWith("…"), l.label).toBe(opens);
    }
  });

  it("the cards feed the SHARED PortalMenu and wear the SAME reserved-corner seat", () => {
    expect(page).toContain("<PortalMenu");
    expect(page).toContain('className="tbd-more"');
    /* ⚠️ THE RESERVED CORNER IS RETIRED, not relaxed. `todoBoard.css` seats `.tbd-more`
       `position: absolute` at a board card's bottom-right, and the body reserved 30px of padding
       so the two never met. The mockup draws the ⋯ as the last item of the FOOT ROW, in flow, so
       there is nothing to reserve against — the seat is overridden page-side (that file belongs
       to the board and is not edited) and the padding went with the overlap. */
    expect(css).toMatch(/\.nb-note\s+\.tbd-more\s*\{[^}]*position:\s*static/);
    expect(css).not.toMatch(/padding-right:\s*30px/);
  });
});

describe("⚠️ delete asks first and holds the LONG way back", () => {
  it("confirm → delete → an 8s undo that re-creates the SAME id (no new write path)", () => {
    /* ⚠️ THE VERB IS "REMOVE" NOW, not "Delete" — the approved set for this board is Pin a note ·
       Pin it · Remove note · Turn into a task · Detach from tasks. The confirm and the 8s window
       are unchanged. */
    expect(page).toContain("await confirmAsk(`Remove “${note.text}”?`");
    expect(page).toContain("}, 8000)");
    /* ⚠️ AND THE INVERSE IS THE WHOLE DOCUMENT NOW (finish run, Phase 2 — the second tightening
       of this line). First fix: carry createdAt so Undo stopped returning the note to the TOP.
       This fix: carry EVERYTHING — the named field list dropped `committedDate` and `estimateMin`
       (a note committed to Today came back silently uncommitted), so the receipt is a copy of the
       document and the restore writes it back verbatim through restoreUserTask, never through the
       create builder. noteboardCompose.test.ts holds the sequence-and-payload comparison. */
    expect(page).toContain("noteReceipt(note)");
    expect(page).toContain("restoreUserTask(receipt)");
    expect(page).not.toContain("addUserTask({ id: note.id");
  });

  it("the toast machinery takes the override rather than a second timer", () => {
    const toastSrc = readFileSync(join(here, "useTodoToast.ts"), "utf8");
    expect(toastSrc).toContain("ms?: number");
    expect(toastSrc).toContain("arm(ms ?? (action ? WITH_UNDO_MS : PLAIN_MS))");
  });
});

describe("the tool row: search · the derived chips · Board/Column · Examples · the pink Pin", () => {
  it("⚠️ THE TAG FILTER IS A DERIVED CHIP ROW NOW, not a dropdown over the taxonomy", () => {
    /* ⚠️ SUPERSEDED (Noteboard rebuild, 22 Aug). The `#All ▾` menu listed `currentUser.tags` —
       the whole stored taxonomy — so it offered tags the writer had defined and never applied,
       which can only ever return an empty board. The chips are the tags IN USE, derived from the
       pinned notes, with the defs supplying the label. The page's filter DIMENSION is unchanged:
       one tag at a time, or #All. */
    const tools = sliceBetween(page, "tools={", "/* ⚠️ NO sidebar prop");
    expect(tools).toContain("nb-chipset");
    expect(tools).toContain("chips.map");
    expect(page).toContain("noteTagChips(pinned, currentUser?.tags ?? [])");
    /* ⚠️ AND IT DERIVES FROM `pinned`, NOT `notes`. From the filtered view the chips would vanish
       as you used them — pick one and the rest disappear, because nothing left on the board
       carries them any more. */
    expect(page).not.toContain("noteTagChips(notes");
    expect(page).toContain("(n.tags ?? []).includes(tagSel)");
  });

  it("⚠️ THE TO-DO PAGE'S TOOL ROW IS RETIRED — the Noteboard keeps its own", () => {
    /* ⚠️ THE TOOL ROW IS RETIRED (corrections, Phase 4) — the page passes neither `tools` nor
       `eyebrow`, so the layout renders no row and no hairline. The Add is the control bar's. */
    const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    expect(listPage).not.toContain("function renderTools");
    /* the Noteboard is unaffected — its row is its own and still carries the pink right */
    expect(page).toContain("<TplGrow />");
  });

  it("the empty state TEACHES rather than apologises — and it is the WORKFLOW now", () => {
    /* ⚠️ THE `.nb-empty` PANEL IS RETIRED (empty-state run). Its single paragraph — which
       included the phrase this case used to pin, "give it a date from its ⋯ menu", wording the
       kebab itself had already retired — is superseded by three illustrated panels. The claim is
       unchanged and now lives with the component: noteboardEmptyState.test.tsx locks every word
       against the ref. */
    /* ⚠️ COMMENTS STRIPPED — the module's own docstring NAMES the retired phrase to explain the
       substitution, so a raw read matched the prose and went red on correct code. */
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
    const empty = strip(readFileSync(join(here, "noteboardEmptyState.tsx"), "utf8"));
    expect(empty).toContain("Your board is empty");
    expect(empty).not.toContain("Sorry");
    /* and the retired phrasing did not come back in with it */
    expect(empty).not.toContain("Give it a date");
    expect(page).not.toContain("give it a date from its ⋯ menu");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — turning a note into a task (build Phase 6).
 *
 * ⚠️ THIS REVERSES A ⚠️ LAW, KNOWINGLY. The app's model was "THE DATE IS THE DOOR": a note and a
 * task were ONE document, and giving a note a date moved it — it left the Noteboard, joined the
 * To-do list and appeared on the Calendar. "One object, three rooms. Nothing copies, nothing
 * moves." The mockup asks for the opposite: the note STAYS and a task appears beside it. That is
 * two documents, and it cannot be a rendering of the old model. "Give it a date…" is retired with
 * this change rather than left standing, because two doors to the same place with opposite
 * meanings is worse than either.
 *
 * ⚠️ THE LINK IS DERIVED, NOT STORED. A reference field would need `userTasks`' closed rules
 * allowlist opened, and an unlisted key on a `hasOnly()` create denies the whole document. So the
 * projected task takes the id `notetask-{noteId}`: the note has a task iff that document exists.
 * No field, no schema change, no deploy — and it is what derived-over-stored asks for anyway.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserTask } from "../../types";
import { projectedTaskId, projectedTask, noteTaskTitle, sortNotes } from "../../lib/noteboard";
import { assembleBoard, isNoteTask } from "../../lib/todoBoard";
import { cardActionYmd } from "../../lib/todoCalendar";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));

const NOTE: UserTask = {
  id: "task-abc123", userId: "u1", text: "Two form passes mentioned the opening pace.\nLook again.",
  done: false, createdAt: "2026-08-19T09:00:00Z", updatedAt: "2026-08-19T09:00:00Z",
};
const TASK: UserTask = {
  id: projectedTaskId(NOTE.id), userId: "u1", text: "Revisit chapter one pacing", done: false,
  dueDate: "2026-08-26", createdAt: "2026-08-22T09:00:00Z", updatedAt: "2026-08-22T09:00:00Z",
};

const boardInput = (userTasks: UserTask[]) => ({
  tasks: [], userTasks, queries: [], agents: [], manuscripts: [], activities: [], taskFlags: [],
  today: "2026-08-22", now: Date.parse("2026-08-22T09:00:00Z"),
});

describe("⚠️ the note stays, and a task appears beside it", () => {
  it("(a) the note carries a badge, (b) it is still on the board, (c) the TO-DO BOARD's own selector finds the task", () => {
    const all = [NOTE, TASK];

    /* (b) — the note is still a note: dateless, unticked, on the board */
    expect(isNoteTask(NOTE)).toBe(true);
    expect(sortNotes(all).map((n) => n.id)).toEqual([NOTE.id]);
    /* and its projection is NOT on the board beside it — a dated task is not a note */
    expect(sortNotes(all).some((n) => n.id === TASK.id)).toBe(false);

    /* (a) — the badge is DERIVED from the projection existing, never stored on the note */
    expect(projectedTask(NOTE, all)).toEqual(TASK);
    expect(projectedTask(NOTE, [NOTE])).toBeUndefined();
    expect(Object.keys(NOTE)).not.toContain("taskId");

    /* (c) — asked of the REAL selector the To-do board uses, not of a re-query of the store */
    const cols = assembleBoard(boardInput(all) as never);
    const cards = [...cols.do, ...cols.nt, ...cols.hk];
    expect(cards.some((c) => c.key === TASK.id), "the To-do board does not see the task").toBe(true);
    /* and the Calendar's own day derivation places it */
    const card = cards.find((c) => c.key === TASK.id)!;
    expect(cardActionYmd(card as never, [])).toBe("2026-08-26");
  });

  it("⚠️ the link is a derived id, and it survives isValidId's charset", () => {
    expect(projectedTaskId("task-abc123")).toBe("notetask-task-abc123");
    /* ⚠️ `isValidId` is ^[a-zA-Z0-9_-]+$, and an id BUILT FROM DISPLAY TEXT is how that gets
       failed by accident — the R&R heal id carried an ampersand and was denied permanently and
       silently. This one is built from an id, never from words, and the check says so. */
    for (const id of ["task-abc123", "a_b-C9", "x"]) {
      expect(projectedTaskId(id)).toMatch(/^[a-zA-Z0-9_-]+$/);
    }
  });

  it("detaching removes the TASK and leaves the note untouched", () => {
    const after = [NOTE];                                  // the task document is deleted
    expect(projectedTask(NOTE, after)).toBeUndefined();     // so the badge goes
    expect(sortNotes(after).map((n) => n.id)).toEqual([NOTE.id]);  // and the note is where it was
    expect(page).toContain("deleteUserTask(projectedTaskId(");
  });
});

describe("⚠️ the title is offered, not decided", () => {
  it("the first line, capped at 60 — and the cap is measured, not assumed", () => {
    expect(noteTaskTitle(NOTE.text)).toBe("Two form passes mentioned the opening pace.");
    const long = "x".repeat(200);
    expect(noteTaskTitle(long)).toHaveLength(60);
    expect(noteTaskTitle("  spaced  \nsecond")).toBe("spaced");
    expect(noteTaskTitle("")).toBe("");
  });

  it("the popover states what happens, in the mockup's words", () => {
    expect(page).toContain("Turn into a task");
    expect(page).toContain("The task appears on your to-do list and calendar. The note stays here, unchanged.");
  });
});

describe("⚠️ 'Give it a date…' is RETIRED — one door, not two with opposite meanings", () => {
  it("the menu offers the projection, and the conversion is gone", () => {
    const flat = noteMenu(false).flatMap((g) => g.entries) as MenuLeaf[];
    expect(flat.map((l) => l.label)).toContain("Turn into a task…");
    expect(flat.map((l) => l.label)).not.toContain("Give it a date…");
    /* and a note that already has one is offered the inverse instead — never both */
    const attached = noteMenu(true).flatMap((g) => g.entries) as MenuLeaf[];
    expect(attached.map((l) => l.label)).toContain("Detach from tasks");
    expect(attached.map((l) => l.label)).not.toContain("Turn into a task…");
  });

  it("⚠️ the old in-place conversion is gone from the page, not merely unreachable", () => {
    /* it moved a note off this board with one write; leaving it would give one note two
       conversions that disagree about whether it survives */
    expect(page).not.toContain('updateUserTask(note.id, { dueDate: dateDraft })');
    expect(page).not.toContain("Make it a task");
    expect(page).not.toContain("give-date");
  });
});

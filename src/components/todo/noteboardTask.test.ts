/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the date lives ON THE NOTE (finish run, Phase 4 / Branch A).
 *
 * ⚠️ THE PROJECTION IS RETIRED AFTER ONE DAY, AND THE REASON IS A DUPLICATE ROW. The build gave a
 * note's task its own document (`notetask-{noteId}`) because "the note stays on the board" and
 * "one row on the To-do list" looked irreconcilable under the two-natures law. They are not: the
 * board's own filter can keep a dated note IF it can tell one from an ordinary task — and a
 * discriminator already exists. `colour` is written by the Noteboard alone and by nothing else in
 * the app, so *dated ∧ papered* means "a note that became a task", and the conversion stamps the
 * paper. One document again: one To-do row, one Calendar day, one text — and the note stays put.
 *
 * ⚠️ WHAT THIS COSTS, on purpose: the popover's separate task TITLE. One object has one text; a
 * short title would have to overwrite the note's body, which violates "the note stays here,
 * unchanged". The task reads as the note's body — which is what the app's own original
 * "Give it a date" flow shipped for months. And completing the task retires the note from the
 * board (`done` excludes it); the document survives, and unticking brings it back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { UserTask } from "../../types";
import { sortNotes, noteColour } from "../../lib/noteboard";
import { assembleBoard, isNoteTask } from "../../lib/todoBoard";
import { cardActionYmd } from "../../lib/todoCalendar";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));
const lib = decls(readFileSync(join(here, "../../lib/noteboard.ts"), "utf8"));

const NOTE: UserTask = {
  id: "task-abc123", userId: "u1", text: "Two form passes mentioned the opening pace.\nLook again.",
  done: false, createdAt: "2026-08-19T09:00:00Z", updatedAt: "2026-08-19T09:00:00Z",
};
/* the SAME document, dated — the conversion is one update plus the paper stamp */
const DATED: UserTask = { ...NOTE, dueDate: "2026-08-26", colour: "yellow" };

const boardInput = (userTasks: UserTask[]) => ({
  tasks: [], userTasks, queries: [], agents: [], manuscripts: [], activities: [], taskFlags: [],
  today: "2026-08-22", now: Date.parse("2026-08-22T09:00:00Z"),
});

describe("⚠️ ONE document, ONE row — the whole point of the collapse", () => {
  it("a dated note is EXACTLY ONE card via the To-do board's own selector, and it is the note", () => {
    const cols = assembleBoard(boardInput([DATED]) as never);
    const cards = [...cols.do, ...cols.nt, ...cols.hk];
    const mine = cards.filter((c) => c.title.startsWith("Two form passes"));
    /* the one-row assertion is the whole point of this phase */
    expect(mine).toHaveLength(1);
    expect(mine[0].key).toBe(NOTE.id);          // the note's own id — no notetask-* sibling
    expect(cardActionYmd(mine[0] as never, [])).toBe("2026-08-26");   // and the Calendar's day
  });

  it("…and the note is STILL ON THE BOARD, because the paper marks it as the board's own", () => {
    expect(sortNotes([DATED]).map((n) => n.id)).toEqual([NOTE.id]);
    /* the two-natures law is untouched — the dated document is a TASK to the To-do board */
    expect(isNoteTask(DATED)).toBe(false);
    /* an ORDINARY task (dated, no paper) does not leak onto the Noteboard */
    const todoTask: UserTask = { ...NOTE, id: "task-ordinary", dueDate: "2026-08-26" };
    expect(sortNotes([todoTask])).toHaveLength(0);
    /* and a dateless note needs no marker — it is a note by the law itself */
    expect(sortNotes([NOTE]).map((n) => n.id)).toEqual([NOTE.id]);
  });

  it("⚠️ the discriminator holds: NOTHING outside the Noteboard writes colour onto a task", () => {
    /* the sweep that fences the pun — dated ∧ papered means noteboard-made, and that stays true
       only while this page is colour's sole writer. Population first: the census must find the
       writer before absence elsewhere means anything. */
    const dir = join(here, "..");
    const offenders: string[] = [];
    let writers = 0;
    const walk = (d: string) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, f.name);
        if (f.isDirectory()) { walk(p); continue; }
        if (!/\.(tsx?|ts)$/.test(f.name) || /\.test\./.test(f.name)) continue;
        const src = decls(readFileSync(p, "utf8"));
        if (src.includes("setUserTaskColour(")) {
          writers++;
          if (!p.endsWith("TodoNoteboardPage.tsx") && !p.endsWith("db.tsx")) offenders.push(p);
        }
      }
    };
    walk(dir);
    expect(writers).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});

describe("⚠️ the conversion and its inverse are ONE FIELD each way", () => {
  it("the paper is stamped BEFORE the date, and a refused stamp stops the conversion", () => {
    /* an unpapered note dated first would vanish from the board between the two writes — and
       permanently, if the colour write is then refused by stale rules */
    const fn = page.slice(page.indexOf("const makeTask"));
    expect(page.indexOf("const makeTask")).toBeGreaterThan(-1);
    const body = fn.slice(0, fn.indexOf("\n  };"));
    const stampAt = body.indexOf("setUserTaskColour");
    const dateAt = body.indexOf("dueDate: dateDraft");
    expect(stampAt).toBeGreaterThan(-1);
    expect(dateAt).toBeGreaterThan(-1);
    expect(stampAt).toBeLessThan(dateAt);
    expect(body).toContain("return");             // the refusal path stops before the date
  });

  it("detach clears the date and ONLY the date — the note keeps its paper and its place", () => {
    const fn = page.slice(page.indexOf("const detachTask"));
    expect(page.indexOf("const detachTask")).toBeGreaterThan(-1);
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(body).toContain("{ dueDate: null }");
    expect(body).not.toContain("deleteUserTask");
    /* the un-dated document is a note again, still papered, still on the board */
    const detached: UserTask = { ...DATED, dueDate: undefined };
    expect(sortNotes([detached]).map((n) => n.id)).toEqual([NOTE.id]);
    expect(noteColour(detached)).toBe("yellow");
  });

  it("the badge derives from the note's OWN date — no second document to consult", () => {
    expect(page).toContain("n.dueDate");
    expect(page).toContain("On your to-do list");
  });
});

describe("⚠️ the projection is GONE, not shadowed", () => {
  it("no notetask id, no projectedTask, no separate title — in the lib or the page", () => {
    for (const dead of ["projectedTaskId", "projectedTask", "noteTaskTitle", "notetask-"]) {
      expect(lib, dead).not.toContain(dead);
      expect(page, dead).not.toContain(dead);
    }
    /* the popover keeps its verbatim copy and loses its Task field — one object, one text */
    expect(page).toContain("Turn into a task");
    expect(page).toContain("The task appears on your to-do list and calendar. The note stays here, unchanged.");
    expect(page).not.toContain("nb-task-title");
  });

  it("the menu still forks on whether the note has a task — now the note's own date", () => {
    const flat = noteMenu(false).flatMap((g) => g.entries) as MenuLeaf[];
    expect(flat.map((l) => l.label)).toContain("Turn into a task…");
    const attached = noteMenu(true).flatMap((g) => g.entries) as MenuLeaf[];
    expect(attached.map((l) => l.label)).toContain("Detach from tasks");
    expect(page).toContain("noteMenu(!!menu.note.dueDate)");
  });
});

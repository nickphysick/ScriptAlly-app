/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Noteboard (tasks-pages pack, Phase 4): masonry not grid, no sidebar, notes only, the
 * note→task conversion (one write, three rooms), the grouped ⋯ menu, delete's confirm + 8s undo,
 * the tag filter and the column-reading toggle. Render smokes live in todoPageSmoke.
 */
import { describe, it, expect } from "vitest";
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
    expect(css).toMatch(/\.nb-grid\s*\{[^}]*columns:\s*3/);
    expect(css).toContain("break-inside: avoid");
    expect(css).not.toMatch(/\.nb-grid[^}]*display:\s*grid/);
  });

  it("the toggle collapses to one reading column", () => {
    expect(css).toMatch(/\.nb-grid\.column\s*\{[^}]*columns:\s*1/);
    expect(page).toContain("Read as a column");
    expect(page).toContain('className={`nb-grid${column ? " column" : ""}`}');
  });
});

describe("⚠️ notes only — nothing derived reaches this board", () => {
  it("isNote is the two-natures law: dateless and unticked", () => {
    expect(isNote(ut({}))).toBe(true);
    expect(isNote(ut({ dueDate: "2026-08-12" }))).toBe(false);  // a dated card is a task
    expect(isNote(ut({ done: true }))).toBe(false);             // finished work is the day's record
  });

  it("the page reads userTasks THROUGH isNote and nothing else — no derived source in reach", () => {
    expect(page).toContain("userTasks.filter(isNote)");
    for (const derived of ["assembleBoard", "boardColumns", "tasks,", "taskFlags", "activities"]) {
      expect(page, derived).not.toContain(derived);
    }
  });

  it("⚠️ no page sidebar — the layout gets no sidebar prop, per the pack's word over the ref's drawing", () => {
    expect(page).not.toContain("sidebar={");
    expect(page).not.toContain("TodoSideContainer");
  });
});

describe("⚠️ the date is the door — one write, three rooms", () => {
  it("the conversion is ONE updateUserTask carrying dueDate — nothing copies, nothing moves", () => {
    expect(page).toContain("await updateUserTask(note.id, { dueDate: dateDraft })");
    // and the undo is the same write reversed
    expect(page).toContain("await updateUserTask(note.id, { dueDate: null })");
  });

  it("a dated card lands in the Your-tasks family and on the Calendar — by derivation", () => {
    const converted = {
      key: "k", stream: "nt" as const, title: "t", who: "", subtitle: "", due: "", warn: false,
      snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false,
      userTaskId: "n1", nature: "task" as const, dueYmd: "2026-08-12",
    };
    expect(facetOf(converted)).toBe("yours");                     // the To-do list's group
    expect(cardActionYmd(converted, [])).toBe("2026-08-12");      // the Calendar's day
    expect(isNote(ut({ dueDate: "2026-08-12" }))).toBe(false);    // and it has left this board
  });

  it("the menu's door says so: Give it a date…", () => {
    expect(page).toContain('item.id === "give-date"');
    expect(page).toContain("Make it a task");
  });
});

describe("⚠️ the ⋯ menu — the SAME grammar, the SAME shell", () => {
  it("the note menu: Edit · Give it a date… · Tags… · a separated danger Delete (Tags… ARRIVED with its picker, P5)", () => {
    const groups = noteMenu();
    const flat = groups.flatMap((g) => g.entries) as MenuLeaf[];
    expect(flat.map((l) => l.label)).toEqual(["Edit the note…", "Give it a date…", "Tags…", "Delete the note…"]);
    expect(groups).toHaveLength(2); // the danger group stands apart, the board's own pattern
    expect(flat.find((l) => l.id === "delete-task")!.danger).toBe(true);
    // every opener says so
    for (const l of flat) expect(l.label.endsWith("…"), l.label).toBe(true);
  });

  it("the cards feed the SHARED PortalMenu and wear the SAME reserved-corner seat", () => {
    expect(page).toContain("<PortalMenu");
    expect(page).toContain('className="tbd-more"');
    expect(css).toMatch(/\.nb-nt\s*\{[^}]*padding-right:\s*30px/); // the corner stays reserved
  });
});

describe("⚠️ delete asks first and holds the LONG way back", () => {
  it("confirm → delete → an 8s undo that re-creates the SAME id (no new write path)", () => {
    expect(page).toContain("await confirmAsk(`Delete “${note.text}”?`");
    expect(page).toContain("}, 8000)");
    expect(page).toContain("addUserTask({ id: note.id, text: note.text, detail: note.detail })");
  });

  it("the toast machinery takes the override rather than a second timer", () => {
    const toastSrc = readFileSync(join(here, "useTodoToast.ts"), "utf8");
    expect(toastSrc).toContain("ms?: number");
    expect(toastSrc).toContain("arm(ms ?? (action ? WITH_UNDO_MS : PLAIN_MS))");
  });
});

describe("the tool row: search · #All ▾ · the toggle · the pink Pin", () => {
  it("the tag filter lives in the TOOL ROW (the page's only filter dimension) and reads the user's tags", () => {
    const tools = page.slice(page.indexOf("tools={"), page.indexOf("/* ⚠️ NO sidebar prop"));
    expect(tools).toContain('#{tagSel ? tagLabel(tagSel) : "All"}');
    expect(page).toContain("currentUser?.tags ?? []");
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

  it("the empty state TEACHES rather than apologises", () => {
    expect(page).toContain("give it a date from its ⋯ menu");
    expect(page).not.toContain("Sorry");
  });
});

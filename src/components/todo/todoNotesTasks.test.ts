/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NOTES AND TASKS (notes-and-tasks pack) — source/rule-text locks for the two natures of a
 * user-created item: a NOTE (pinned, dateless) and a TASK (dated, remindable). Design authority:
 * design-refs/notes-and-tasks.html (frame 1 the empty section · frame 2 the composer · frame 3
 * the cards). The page is auth-gated (jsdom mounts nothing); geometry, grammar and wiring are
 * locked here, the pixels are Nick's in-browser checklist.
 *   P1 — the empty Notes section
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { taskDueState, taskSurfaced, SURFACE_LEAD_DAYS } from "../../lib/todoBoard";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const types = readFileSync(join(here, "..", "..", "types.ts"), "utf8");
const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");
const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("notes-and-tasks P1 — the empty Notes section", () => {
  const emptyFn = sliceBetween(page, "function renderNotesEmpty", "function renderRailTools");

  it("the Notes section renders the dashed butter card (frame 1) when it is empty", () => {
    expect(page).toContain("function renderNotesEmpty()");
    expect(emptyFn).toContain('<div className="tdb-nte">');
    expect(emptyFn).toContain("<Pin size={16} />"); // the pin glyph in its tile (lucide — see report)
    expect(emptyFn).toContain("Nothing pinned here yet"); // Playfair headline
    // the explanatory line, verbatim from the pack
    expect(emptyFn).toContain("Notes are for the things you want to remember but don’t need chasing");
    expect(emptyFn).toContain("a reminder of where you left off.");
  });

  it("the ink 'Write a note' button opens the composer in NOTE mode — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("the card is the nt lane's empty node ONLY (gone the moment a note exists) with an honest count — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("the dashed card's tokens + treatment: butter ground, dashed border, the ink button", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--nt-empty-bg: #fbf7ee");
    expect(w).toContain("--nt-empty-bd: #d9cca8");
    expect(w).toContain("--nt-tile-bg: #f4ecd4");
    expect(w).toContain("--nt-ink-bg: #2a1a13");
    const card = rule(".tdb-nte");
    expect(card).toContain("background: var(--nt-empty-bg)");
    expect(card).toContain("border: 1px dashed var(--nt-empty-bd)");
    expect(card).toContain("border-radius: 13px");
    expect(rule(".tdb-nte-tx h4")).toContain("font-family: var(--f12-serif)"); // Playfair headline
    const btn = rule(".tdb-nte-btn");
    expect(btn).toContain("background: var(--nt-ink-bg)");
    expect(btn).toContain("color: var(--nt-ink-tx)");
    expect(btn).toContain("border-radius: 99px");
  });

  it("REGRESSION: 'Write a note' opens the composer even on an EMPTY Notes lane — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
});

describe("notes-and-tasks P2 — the composer + the schema", () => {
  const comp = sliceBetween(page, "function renderComposer", "function renderNotesEmpty");

  it("the SCHEMA: UserTask gains detail + surfaceOffset; surfaceOffset is an in-app lead, NOT a notification", () => {
    expect(types).toContain('export type SurfaceOffset = "on-day" | "day-before" | "week-before"');
    expect(types).toContain("detail?: string;");
    expect(types).toContain("surfaceOffset?: SurfaceOffset;");
    // the type's own words disclaim any delivery mechanism
    expect(types).toContain("NEVER a notification");
    expect(types).toMatch(/no push, no email/i);
  });

  it("addUserTask persists the new fields (detail trimmed; surfaceOffset only on a dated task, default omitted)", () => {
    expect(db).toContain("detail?: string");
    expect(db).toContain("surfaceOffset?: SurfaceOffset");
    expect(db).toContain("...(fields.detail && fields.detail.trim() ? { detail: fields.detail.trim() } : {})");
    expect(db).toContain('...(fields.dueDate && fields.surfaceOffset && fields.surfaceOffset !== "on-day" ? { surfaceOffset: fields.surfaceOffset } : {})');
  });

  it("the rules ALLOWLIST detail + surfaceOffset (create + update); surfaceOffset is one of three fixed strings", () => {
    expect(rules).toContain("'text', 'detail', 'done'"); // detail in the isValidUserTask hasOnly
    expect(rules).toContain("'dueDate', 'surfaceOffset', 'committedDate', 'tags', 'estimateMin'"); // hasOnly (P5 tags, P7 estimateMin)
    expect(rules).toContain("data.surfaceOffset in ['on-day', 'day-before', 'week-before']");
    // ⚠️ committedDate JOINED THIS LIST (6 Aug 2026). It is client-updated post-create by the
    // Today's-list commit, and its absence denied every such write in silence. This lock is what
    // blocked the fix for two days — so it now pins the CORRECT list, and the rules suite proves
    // the write actually succeeds rather than merely that a string is present.
    expect(rules).toContain("hasOnly(['text', 'detail', 'done', 'completedAt', 'updatedAt', 'dueDate', 'surfaceOffset', 'committedDate', 'tags', 'estimateMin'])"); // update affectedKeys
  });

  it("two entry points, two default natures: the section opens NOTE, the hero opens TASK — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("the type segment: ✎ Note / ✓ Task, the selected one deep-ink filled", () => {
    expect(comp).toContain("✎ Note");
    expect(comp).toContain("✓ Task");
    expect(comp).toContain('className={`tdb-nc-sgb${isTask ? "" : " on"}`}');
    expect(comp).toContain('className={`tdb-nc-sgb${isTask ? " on" : ""}`}');
    expect(rule(".tdb-nc-sgb.on")).toContain("background: var(--nt-seg-on-bg)"); // deep-ink fill
  });

  it("switching TRANSFORMS every property live — typeface, offset block, fields, nomark, save verb", () => {
    // title + detail swap Caveat (note) ↔ typeset (task) via the .note modifier
    expect(comp).toContain('className={`tdb-nc-ttl${isTask ? "" : " note"}`}');
    expect(comp).toContain('className={`tdb-nc-dtl${isTask ? "" : " note"}`}');
    expect(rule(".tdb-nc-ttl")).toContain("font-family: var(--f12-serif)"); // task = Playfair
    expect(rule(".tdb-nc-ttl.note")).toContain("font-family: Caveat"); // note = handwriting
    // the offset block swaps butter ↔ sage by mode
    expect(rule(".tdb-nc--note")).toContain("--nt-comp-block: var(--nt-block-note)");
    expect(rule(".tdb-nc--task")).toContain("--nt-comp-block: var(--nt-block-task)");
    expect(rule(".tdb-wrap")).toContain("--nt-block-note: #eedfae"); // butter
    expect(rule(".tdb-wrap")).toContain("--nt-block-task: #d5dbd3"); // sage
    // the date + surfacing fields are task-only; the note shows the NO-DATE line; the verb changes
    expect(comp).toContain("isTask ? (");
    expect(comp).toContain("NO DATE · NOTHING WILL CHASE YOU");
    expect(comp).toContain('{composerEdit ? "Save changes" : isTask ? "Add the task" : "Pin the note"}');
  });

  it("the surfacing field is IN-APP Today's-list timing, never a reminder — and it needs a date first", () => {
    expect(comp).toContain("Show it in Today’s list"); // NOT "Remind me"
    for (const opt of ["On the day", "A day early", "A week early"]) expect(comp).toContain(opt);
    // surfacing renders only once a date is set (dependency)
    expect(comp).toContain("{composerDate && (");
    expect(comp).toContain("<BrandDatePicker value={composerDate} onChange={setComposerDate}");
    // NO notification vocabulary anywhere in the composer
    for (const banned of ["Remind me", "remind", "notification", "notify", "push", "email"]) {
      expect(comp.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("validation + keyboard + NO native dialogs", () => {
    // title always required; a TASK additionally requires a date
    expect(page).toContain('const composerCanSave = !!composerDraft.trim() && (composerMode === "note" || !!composerDate)');
    expect(comp).toContain("disabled={!composerCanSave || savePending}"); // save-and-today P1: also disabled mid-write
    // ⌘⏎ saves · Esc runs the styled discard-confirm (only when dirty)
    expect(comp).toContain('(e.metaKey || e.ctrlKey) && e.key === "Enter"');
    expect(comp).toContain('e.key === "Escape"');
    expect(comp).toContain("tryCloseComposer()");
    expect(page).toContain('await confirmAsk("Discard this?"');
    // no native prompt/alert/confirm in the To-do page
    for (const nativeDlg of ["window.confirm", "window.alert", "window.prompt", "window.confirm("]) {
      expect(page).not.toContain(nativeDlg);
    }
  });

  it("save writes the nature: a note = title (+detail); a task = + dueDate + surfaceOffset", () => {
    const save = sliceBetween(page, "async function saveComposer", "function renderComposer");
    expect(save).toContain("text: composerDraft.trim()");
    expect(save).toContain("detail: composerDetail.trim() || undefined");
    expect(save).toContain("dueDate: isTask ? composerDate : undefined");
    expect(save).toContain("surfaceOffset: isTask ? composerSurface : undefined");
  });
});

describe("notes-and-tasks P3 — the two natures on the board", () => {
  const uc = sliceBetween(board, "function userCard", "function orderDoNext");
  /* (a `rc` slice stood here on `function renderUserCard`, which is retired — assigned, never read,
     and so asserting nothing even before its anchor died. The two natures on the board are covered
     by `uc` above and by the pure `taskDueState` / `taskSurfaced` cases.) */

  it("THE PROMOTION IS DERIVED BY THE CLOCK, not a stored flag — taskDueState is pure over (dueDate, today)", () => {
    // the SAME task promotes as the day arrives — proof the state is a function of `today`, never written
    expect(taskDueState("2026-08-10", "2026-08-01")).toBe("future");
    expect(taskDueState("2026-08-10", "2026-08-10")).toBe("today");
    expect(taskDueState("2026-08-10", "2026-08-12")).toBe("overdue");
  });

  it("surfacing is derived: a task joins Today's list `lead` days early (on-day/day-before/week-before)", () => {
    expect(SURFACE_LEAD_DAYS).toEqual({ "on-day": 0, "day-before": 1, "week-before": 7 });
    // due 2026-08-10 · week-before (7) → surfaces from 2026-08-03
    expect(taskSurfaced("2026-08-10", "week-before", "2026-08-02")).toBe(false);
    expect(taskSurfaced("2026-08-10", "week-before", "2026-08-03")).toBe(true);
    // on-day (default) surfaces only on the day itself
    expect(taskSurfaced("2026-08-10", "on-day", "2026-08-09")).toBe(false);
    expect(taskSurfaced("2026-08-10", "on-day", "2026-08-10")).toBe(true);
    expect(taskSurfaced("2026-08-10", undefined, "2026-08-10")).toBe(true); // default = on-day
  });

  it("userCard derives the nature from dueDate; a due/overdue task PROMOTES to the Urgent lane", () => {
    expect(uc).toContain("const isTask = !!t.dueDate;"); // nature is derived from the date, never stored
    expect(uc).toContain('nature: isTask ? "task" : "note"');
    expect(uc).toContain('const promoted = dueState === "today" || dueState === "overdue"');
    expect(uc).toContain('stream: promoted ? "do" : "nt"'); // due/overdue → Urgent, else Notes
    expect(uc).toContain('initials: isTask ? "✓" : "✎"');
    expect(uc).toContain("const surfaced = isTask && taskSurfaced(t.dueDate!, t.surfaceOffset, input.today)");
    // the surfacing joins Today's list without writing committedDate (derived in todaySplit)
    expect(board).toContain("c.committedDate === today || !!c.surfaced");
    // the linked-reminder split is superseded — no reminderDue call survives in userCard
    expect(uc).not.toContain("reminderDue(");
  });




  it("SAGE is the user-created family — no blue anywhere on a note or task card", () => {
    // the whole notes-and-tasks card + composer surface never uses the Pro blue
    for (const blue of ["#c2cfda", "#6A89A7", "#587991", "#5f7d99"]) {
      expect(rule(".tdb-ntc").includes(blue)).toBe(false);
    }
    // and no blue token is referenced by any .tdb-ntc rule
    const ntcRules = css.split("\n").filter((l) => l.includes(".tdb-ntc"));
    for (const line of ntcRules) expect(line).not.toMatch(/#c2cfda|#6A89A7|#587991/i);
  });
});

describe("notes-and-tasks P4 — the record + the tour", () => {
  const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
  const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");

  it("themes.md records the two natures, the sage=user-created / blue=Pro law, the promotion + composer specs", () => {
    expect(themes).toContain("## Notes and tasks — the two natures");
    expect(themes).toContain("SAGE IS THE USER-CREATED FAMILY; BLUE IS PRO");
    expect(themes).toContain("Blue never appears on a note or task card");
    expect(themes).toContain("THE PROMOTION RULE (derived at render, by the clock)");
    expect(themes).toContain("in-app surfacing lead");
    expect(themes).toMatch(/never a notification: no\s*\n?\s*push, no email/);
    expect(themes).toContain("THE COMPOSER'S TRANSFORMATION");
  });

  it("the tour teaches the two natures at the hero's 'Add task or note'", () => {
    expect(tour).toContain('sel: ".svh-btn-primary"');
    expect(tour).toContain("nothing chases you"); // the note nature
    // the target exists — PageHeader's primary action button carries that class
    const ph = readFileSync(join(here, "..", "shell", "PageHeader.tsx"), "utf8");
    expect(ph).toContain("svh-btn-primary");
  });
});

describe("notes gaps — adding another, and removing one (found in live use)", () => {
  it("REGRESSION: the add affordance PERSISTS once notes exist (the empty card is gone by then) — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });


  it("delete goes through the existing store, undoes by re-creating the SAME id, and fails visibly", () => {
    const del = sliceBetween(page, "async function deleteUserNote", "const composerCanSave");
    expect(del).toContain("await deleteUserTask(c.userTaskId)"); // the existing write path, no fork
    // P1's no-silent-no-op rule covers delete too
    expect(del).toContain('flash("Couldn’t delete that — try again?", { label: "Try again"');
    // undo restores the SAME document id through addUserTask (which accepts a caller id since P1)
    expect(del).toContain('label: "Undo"');
    expect(del).toContain("addUserTask({ id: c.userTaskId, text: c.title, detail: c.detail, dueDate: c.dueYmd, surfaceOffset: c.surfaceOffset })");
    expect(page).toContain("addUserTask, updateUserTask, deleteUserTask,"); // destructured from the db context
  });
});

describe("notes-store convergence — one store owns \"Notes to self\"", () => {
  const oty = readFileSync(join(here, "..", "dashboard", "OverToYou.tsx"), "utf8");
  const dash = readFileSync(join(here, "..", "Dashboard.tsx"), "utf8");

  /* ⚠️ RETARGETED (settled desk, Phase 7), and the RULE is unchanged: the dashboard's
     Notes-to-self reads the user-task store — what /todo writes — never the post-its. What moved
     is the surface. The hero's card is DeskTodoCard now, and its notes tier carries NO tick and no
     composer: a note there is a jotting you wrote, not a task the app is holding you to, so the
     onCompleteNote/onAddNote props this case used to name no longer exist. Asserting them would be
     pinning a prop rather than the rule. OverToYou itself is untouched and still serves /todo. */
  /* ⚠️ RETARGETED AGAIN (one-screen dashboard): the page no longer renders notes AT ALL — its
     tasks card is urgent + housekeeping only, and notes live on /todo. The rule survives as its
     contrapositive: the dashboard passes the USER-TASK store down and never the post-its, so if
     a notes surface returns here it starts from the right store. OverToYou is untouched and
     still serves /todo, where ticking and composing belong. */
  it("the dashboard passes the USER-TASK store down, never the post-its", () => {
    expect(dash).toContain("userTasks={userTasks}");
    expect(dash).not.toContain("userNotes={notes}");
    const osd = readFileSync(join(here, "..", "dashboard", "OneScreenDashboard.tsx"), "utf8");
    expect(osd).toContain("userTasks: UserTask[];");
    expect(osd).not.toContain("notes: Note[];");
    // and OverToYou keeps the same store on the surface that DOES tick and compose
    expect(oty).toContain("userNotes: UserTask[];");
    expect(oty).toContain("const noteRows = [...userNotes].filter((t) => !t.done)");
  });

  it("NO SURFACE calls both stores \"notes\": the post-its say post-it in every visible string", () => {
    for (const [file, s] of [
      ["NotesDesk", readFileSync(join(here, "..", "notes", "NotesDesk.tsx"), "utf8")],
      ["NoteQuickAdd", readFileSync(join(here, "..", "notes", "NoteQuickAdd.tsx"), "utf8")],
      ["NoteEditor", readFileSync(join(here, "..", "notes", "NoteEditor.tsx"), "utf8")],
      ["DeskNote", readFileSync(join(here, "..", "notes", "DeskNote.tsx"), "utf8")],
    ] as const) {
      const visible = [...s.matchAll(/(?:placeholder|aria-label|title)="([^"]*)"/g)].map((m) => m[1]);
      for (const v of visible) expect(`${file}: ${v}`).not.toMatch(/\bnotes?\b/i);
    }
    expect(dash).toContain('showNoteToast("Post-it completed"');
    expect(dash).toContain('showNoteToast("Post-it deleted"');
    // "Notes to self" now names exactly ONE store — the user-task one
    expect(oty).toContain('label: "Notes to self"');
  });
});

describe("notes — the composer fits, and deleting asks first (live-use fixes)", () => {
  it("the composer spans the grid row so its 560px cap applies; the save button never squashes", () => {
    // the bug: as a minmax(272px,1fr) GRID ITEM the composer was squeezed to one column, so the
    // meta row (date + surfacing + save) overflowed and "Add the task" broke out of its button.
    const nc = rule(".tdb-nc");
    expect(nc).toContain("grid-column: 1 / -1");
    expect(nc).toContain("max-width: 560px");
    const meta = rule(".tdb-nc-meta");
    expect(meta).toContain("flex-wrap: wrap"); // at any width it wraps rather than overflowing
    const save = rule(".tdb-nc-save");
    expect(save).toContain("flex: 0 0 auto");
    expect(save).toContain("white-space: nowrap"); // the label stays on one line, inside the pill
    expect(rule(".tdb-nc-surflbl")).toContain("white-space: nowrap");
  });

  it("DELETE ASKS FIRST — the ✕ is on the card, so consent is required; the task warns harder", () => {
    const del = sliceBetween(page, "async function deleteUserNote", "const composerCanSave");
    // the confirm gates the write: nothing is deleted until it resolves true
    expect(del).toContain("const ok = await confirmAsk(");
    expect(del).toContain("if (!ok) return;");
    expect(del.indexOf("await confirmAsk(")).toBeLessThan(del.indexOf("await deleteUserTask("));
    // a task's copy names what else is lost (its date, and Today's list when it is on it)
    expect(del).toContain("This task and its date will be removed from your board");
    expect(del).toContain('c.committed || c.surfaced ? " and from Today’s list" : ""');
    expect(del).toContain('confirmLabel: isTask ? "Delete the task" : "Delete the note"');
    expect(del).toContain('cancelLabel: "Keep it"');
    // it is the STYLED ask (no native dialog), and undo remains as the safety net after the fact
    expect(del).toContain('label: "Undo"');
  });
});

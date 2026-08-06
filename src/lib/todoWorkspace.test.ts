/**
 * Locks for the To-do workspace's routes, nav and counting law (To-do workspace pack, Phase 1).
 *
 * ⚠️ THE COUNTING LAW IS THE ONE THAT MATTERS. The badge said 44 while the lists totalled 52, and
 * nothing in the app defined either number. These fixtures are what make "badge == page total ==
 * board total" an invariant rather than a coincidence someone maintains by hand.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TODO_LISTS, TODO_OPEN_COMPOSER, TODO_OPEN_TASK_SETTINGS, TODO_ROUTES, todoPageForPath,
} from "./todoRoutes";
import { AssembledBoard, BoardCard } from "./todoBoard";
import { todoBadgeCount, todoCounts } from "./todoCount";
import { WORKSPACE_SHELL_PATHS } from "./shellForRoute";
import { PALETTE_PAGES } from "./searchPalette";
import { workspaceSections } from "./workspaceNav";

describe("the four routes", () => {
  it("are four, in the pack's order", () => {
    expect(TODO_ROUTES.map((r) => r.id)).toEqual(["list", "today", "calendar", "noteboard"]);
  });

  it("every route is a real workspace path", () => {
    for (const r of TODO_ROUTES) expect([...WORKSPACE_SHELL_PATHS], r.label).toContain(r.path);
  });

  /* ⚠️ "/todo" IS A PREFIX OF EVERY OTHER ROUTE, so a first-match scan answers "list" everywhere —
     the same class of bug as the shell's /agents vs /agents/discover. */
  it("resolves the longest path first", () => {
    expect(todoPageForPath("/todo")).toBe("list");
    expect(todoPageForPath("/todo/today")).toBe("today");
    expect(todoPageForPath("/todo/calendar")).toBe("calendar");
    expect(todoPageForPath("/todo/noteboard")).toBe("noteboard");
  });

  it("an unknown /todo sub-path falls back to the list rather than nothing", () => {
    expect(todoPageForPath("/todo/nonsense")).toBe("list");
  });

  it("is null off the workspace", () => {
    expect(todoPageForPath("/queries")).toBeNull();
  });

  /* ⌘K is global by definition (audit item 9) — one lumped "To-do" entry would make the palette
     the only surface treating the workspace as a single page. */
  it("each page is indexed in the palette individually", () => {
    const paths = PALETTE_PAGES.map((p) => (p.run as { path?: string }).path);
    for (const r of TODO_ROUTES) expect(paths, r.label).toContain(r.path);
  });
});

describe("the app sidebar's To-do row", () => {
  /* ⚠️ RETARGETED (final ref, "(4)"): To-do is ONE ROW UNDER WORKSPACE, not a group of four.
     The earlier lock required four children on a `todo` section, reasoning that folding it would
     hide three destinations. It does not — Today is linked from the board and Noteboard from
     Today; those are page-level views of one place, not peers in the IA. A nav column that lists
     every view of every page has stopped being navigation.

     `/todo/calendar` is the one with NO in-page link. That is a real gap and it is recorded in
     reports/shell-polish.md — a nav row left standing to cover for a missing link would hide it. */
  const nav = workspaceSections({ todo: 7 });
  const workspace = nav.find((s) => s.id === "workspace")!;
  const row = workspace.children!.find((c) => c.id === "todo")!;

  it("sits under Workspace, beside Dashboard, and there is no To-do section", () => {
    expect(nav.map((s) => s.id)).not.toContain("todo");
    expect(workspace.children!.map((c) => c.id)).toEqual(["dash", "todo"]);
    expect(row.path).toBe("/todo");
  });

  it("carries the count and the urgency dot — the app's only nav count", () => {
    const r = workspaceSections({ todo: 42 })
      .find((s) => s.id === "workspace")!.children!.find((c) => c.id === "todo")!;
    expect(r.count).toBe(42);
    expect(r.urgent).toBe(true);
  });

  it("a zero count is omitted rather than rendered as 0", () => {
    const r = workspaceSections({ todo: 0 })
      .find((s) => s.id === "workspace")!.children!.find((c) => c.id === "todo")!;
    expect(r.count).toBeUndefined();
  });

  /* The four ROUTES still exist and are still individually reachable — the nav is what changed,
     not the workspace. This is the assertion that keeps the two facts apart. */
  it("all four To-do routes remain real, and remain in the palette", () => {
    expect(TODO_ROUTES).toHaveLength(4);
    for (const r of TODO_ROUTES) expect([...WORKSPACE_SHELL_PATHS], r.label).toContain(r.path);
  });
});

/* ── the counting law (audit item 1) ── */

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const board = (over: Partial<AssembledBoard>): AssembledBoard => ({
  do: [], hk: [], nt: [], cleared: [], ...over,
} as AssembledBoard);

describe("THE COUNTING LAW — actionable, notes excluded", () => {
  /* ⚠️ THE FIXTURE FROM THE AUDIT: badge 44 vs lists 3 + 41 + 2 + 6 = 52. The 6 notes are the
     difference, and excluding them is the whole rule — they are dateless and nothing chases them,
     so they must not inflate a number meaning "things waiting on you". */
  it("excludes notes from the actionable total", () => {
    const b = board({
      do: Array.from({ length: 3 }, (_, i) => card({ key: `u${i}` })),
      nt: [
        ...Array.from({ length: 2 }, (_, i) => card({ key: `t${i}`, stream: "nt", nature: "task" })),
        ...Array.from({ length: 6 }, (_, i) => card({ key: `n${i}`, stream: "nt", nature: "note" })),
      ],
    });
    const c = todoCounts(b, 41, 0);
    expect(c.notes, "the notes are still counted for their own LIST row").toBe(6);
    expect(c.actionable).toBe(3 + 41 + 2);
    expect(c.actionable).not.toBe(3 + 41 + 2 + 6);
  });

  /* ⚠️ A LINKED REMINDER IS ROUTED INTO THE URGENT LANE by the assembler, so it is ALREADY inside
     `urgent`. Adding userTasks.length on top would inflate the badge by exactly the items the
     writer is most likely to notice. */
  it("does not double-count a user task already routed to urgent", () => {
    const b = board({
      do: [card({ key: "a" }), card({ key: "b", nature: "task" })],
      nt: [card({ key: "c", stream: "nt", nature: "task" })],
    });
    expect(todoCounts(b, 0, 0).actionable).toBe(3);
  });

  it("the badge is the actionable figure and nothing else", () => {
    const c = todoCounts(board({ do: [card({})], nt: [card({ stream: "nt", nature: "note" })] }), 2, 5);
    expect(todoBadgeCount(c)).toBe(c.actionable);
    expect(todoBadgeCount(c)).toBe(3);
  });

  it("snoozed is reported for its LIST row but is not actionable", () => {
    const c = todoCounts(board({}), 0, 9);
    expect(c.snoozed).toBe(9);
    expect(c.actionable).toBe(0);
  });

  it("an empty board is zero, not NaN", () => {
    expect(todoCounts(board({}), 0, 0).actionable).toBe(0);
  });
});

describe("the five LISTS (audit item 4)", () => {
  it("are five, with Snoozed among them", () => {
    expect(TODO_LISTS.map((l) => l.id)).toEqual(["urgent", "housekeeping", "yours", "notes", "snoozed"]);
  });

  /* ⚠️ DISMISSED IS DELIBERATELY ABSENT — it lives in the Task settings ledger, and the page
     search's include-toggle is what reaches both (audit items 4 and 9). */
  it("Dismissed is not a list", () => {
    expect(TODO_LISTS.map((l) => l.label)).not.toContain("Dismissed");
  });

  it("every swatch is a token, never a raw hex", () => {
    for (const l of TODO_LISTS) expect(l.swatch, l.label).toMatch(/^var\(--td-sw-/);
  });

  it("the swatch tokens are defined", () => {
    const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
    for (const l of TODO_LISTS) {
      const name = l.swatch.slice(4, -1);
      expect(css, name).toMatch(new RegExp(`${name}:\\s*#`));
    }
  });
});

describe("the window contracts are named once", () => {
  /* A literal typed in two places is a listener that silently never fires. */
  it("task settings keeps its EXISTING name", () => {
    expect(TODO_OPEN_TASK_SETTINGS).toBe("sa:open-task-settings");
  });

  it("no component re-types either literal", () => {
    for (const f of [
      "../components/shell/AccountMenu.tsx",
      "../components/todo/ToDoPage.tsx",
      "../components/todo/TodoTodayPage.tsx",
      "../components/shell/WorkspaceShell.tsx",
    ]) {
      const src = readFileSync(resolve(__dirname, f), "utf8");
      expect(src, f).not.toContain('"sa:open-task-settings"');
      expect(src, f).not.toContain('"sa:open-todo-composer"');
    }
  });

  it("the composer contract exists and the bar announces it", () => {
    expect(TODO_OPEN_COMPOSER).toBe("sa:open-todo-composer");
    const shell = readFileSync(resolve(__dirname, "../components/shell/WorkspaceShell.tsx"), "utf8");
    expect(shell).toContain("TODO_OPEN_COMPOSER");
    expect(shell).toContain('pathname.startsWith("/todo")');
    const page = readFileSync(resolve(__dirname, "../components/todo/ToDoPage.tsx"), "utf8");
    expect(page).toContain("window.addEventListener(TODO_OPEN_COMPOSER");
    // audit item 7 — one verb per control: the bar's global create makes a TASK.
    expect(page).toMatch(/setComposerMode\("task"\)/);
  });
});

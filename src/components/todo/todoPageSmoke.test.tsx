/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TRIPWIRE FOR A PAGE THAT DOES NOT LOAD.
 *
 * Every other To-do test reads SOURCE. Source-string tests cannot see a runtime crash, and this
 * page crashed on dev with "something went wrong" while the whole suite was green: a `const`
 * declared BELOW the component's `return` was read by the JSX above it, so it sat in the temporal
 * dead zone and threw a ReferenceError on every render. The file already carries a warning about
 * exactly that ("MUST be a hoisted function, not a post-return const"); the warning was not
 * enough, because nothing executed the render.
 *
 * So this RENDERS the page — `renderToStaticMarkup`, the same technique shellV2Smoke uses, with
 * the db hook mocked to an empty-but-complete state. Effects do not run under static rendering,
 * which is fine: the pure render path is where TDZ, undefined reads and bad destructures live.
 *
 * It asserts almost nothing about appearance on purpose. Its job is: THE PAGE RENDERS AT ALL.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

/* The seedable mock (tasks-pages P3): the Calendar's populated smoke needs a dated task in the
   db, and vi.mock is hoisted — so the factory reads this holder, and a test mutates it. Reset in
   afterEach so no file order matters. */
const seed: { userTasks: unknown[] } = { userTasks: [] };
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: seed.userTasks, queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], dismissedTasks: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    addUserTask: async () => undefined,
    updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined,
    updateUserProfile: async () => undefined,
  }),
}));

import { ToDoPage } from "./ToDoPage";
import { TodoTodayPage } from "./TodoTodayPage";
import { TodoCalendarPage } from "./TodoCalendarPage";
import { TodoNoteboardPage } from "./TodoNoteboardPage";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}>{node}</MemoryRouter>);

describe("the To-do pages RENDER — the check the source-string tests cannot make", () => {
  it("the board page renders without throwing", () => {
    expect(() => render(<ToDoPage onNavigate={() => {}} />)).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = render(<ToDoPage onNavigate={() => {}} />);
    expect(html).toContain("To-do list");        // the page header
    expect(html).toContain("tdb-tools");          // the tool row
    expect(html).toContain("Filters");            // the side container
  });

  it("the Today page renders without throwing", () => {
    expect(() => render(<TodoTodayPage onNavigate={() => {}} />)).not.toThrow();
  });

  it("…and carries its own header", () => {
    const html = render(<TodoTodayPage onNavigate={() => {}} />);
    expect(html).toContain("Today");
    expect(html).toContain("Today’s list");
  });

  /* tasks-pages P3 — the Calendar is REAL; its placeholder era ended. Smoke from day one,
     empty AND populated (a page that only smokes its first-run panel leaves every derivation
     unexecuted — the app-smoke law). */
  afterEach(() => { seed.userTasks = []; });

  it("the Calendar page renders without throwing", () => {
    expect(() => render(<TodoCalendarPage onNavigate={() => {}} />)).not.toThrow();
  });

  it("…and carries its grid, its legend and its tools", () => {
    const html = render(<TodoCalendarPage onNavigate={() => {}} />);
    expect(html).toContain("Calendar");
    expect(html).toContain("cal-grid");
    expect(html).toContain("AGENT DEADLINES"); // the legend renders from CAL_LEGEND
    expect(html).toContain("MON");
  });

  it("…and a dated task REACHES its day (the populated smoke)", () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    seed.userTasks = [{ id: "t1", userId: "u1", text: "Redraft the opening", done: false, dueDate: ymd, createdAt: "", updatedAt: "" }];
    const html = render(<TodoCalendarPage onNavigate={() => {}} />);
    expect(html).toContain("Redraft the opening");
    expect(html).toContain("cal-pip");
  });

  /* tasks-pages P4 — the Noteboard is real too. Empty AND populated. */
  it("the Noteboard renders, teaches when empty, and carries no sidebar", () => {
    const html = render(<TodoNoteboardPage onNavigate={() => {}} />);
    expect(html).toContain("Noteboard");
    expect(html).toContain("Nothing pinned yet");     // the teaching state
    expect(html).not.toContain("<aside");             // the contract's optional sidebar, absent
  });

  it("…and a pinned note REACHES the masonry (the populated smoke)", () => {
    seed.userTasks = [{ id: "n1", userId: "u1", text: "Open with the flood", detail: "Chapter one drags.", done: false, createdAt: "2026-08-01T09:00:00Z", updatedAt: "" }];
    const html = render(<TodoNoteboardPage onNavigate={() => {}} />);
    expect(html).toContain("Open with the flood");
    expect(html).toContain("nb-grid");
    expect(html).toContain("1 AUG"); // the pin date
  });
});

/*
 * ⚠️ THE STRUCTURAL CASE MOVED — and the copy that stood here was BROKEN.
 *
 * It split the file at `return (` and searched the part ABOVE for the reference. But the JSX is
 * part of the return statement: it is BELOW that line, not above it. So the check compared the
 * trailing consts against the hooks and handlers — the one region that cannot be in the temporal
 * dead zone — and would have passed on the very bug it was written for.
 *
 * The corrected check lives in `src/test/pageStructure.test.ts`, runs against every page component
 * in the app rather than this one file, and carries three self-tests including one that fails on
 * the broken model. That is the point of the exercise: a tripwire nobody has seen trip is a guess.
 */

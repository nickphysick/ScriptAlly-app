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
/* ⚠️ `agents` IS SEEDABLE TOO (tasks-consolidation P2): the consolidated page's first-run panel
   beats everything when there are no queries AND no agents, so a smoke that seeds only a task
   still renders the first-run state and executes none of the grouping. One agent is the smallest
   thing that gets the page past its own door. */
const seed: { userTasks: unknown[]; agents: unknown[] } = { userTasks: [], agents: [] };
/* ⚠️ THE FIRESTORE LAYER IS MOCKED TOO (v14 Phase 4). The dock now subscribes to the docked
   query's own activity subcollection — the AUTHORITATIVE store the Query Centre reads — so
   `ToDoPage` reaches `lib/firebase`, whose `getAuth` throws `auth/invalid-api-key` under
   `environment: 'node'`. Mocking the module keeps this a RENDER smoke rather than turning it into
   an integration test; the listener returning nothing is the correct default for a render check. */
vi.mock("../../lib/firebase", () => ({
  db: {},
  auth: {},
  OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" },
  handleFirestoreError: () => {},
}));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}),
}));
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    /* ⚠️ THE READINESS FLAG IS PART OF THE CONTRACT NOW (P5): the page renders its loading
       shell until the db's first snapshot lands, so a mock that omits this renders a
       skeleton and every content assertion below it fails for the wrong reason. */
    collectionsReady: true,
    tasks: [], userTasks: seed.userTasks, queries: [], agents: seed.agents, manuscripts: [], packages: [],
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
    /* ⚠️ THE TOOL ROW IS RETIRED (corrections, Phase 4) — the eyebrow, the tag dropdown, the
       count pills and `Work the list` all came out; search and sort are the list card's and
       `Add task or note` is the control bar's. */
    expect(html).toContain("tdb-centre");          // the page's own content column
    /* ⚠️ THE SIDE CONTAINER'S "Filters" WENT WITH THE SIDEBAR (tasks-consolidation P2, 9 Aug).
       The point of this smoke is that the page is not an empty shell that merely did not crash,
       so it anchors on chrome the CONSOLIDATED page produces in EVERY state — the mono eyebrow
       and the tool row's returned ink verb. (The stat chips and the groups are the populated
       state's, and they are smoked below: with no data at all this page renders its first-run
       panel, and smoking only that leaves every derivation unexecuted.) */
    /* ⚠️ THE EYEBROW IS RETIRED (corrections, Phase 4). With no data this render is the FIRST-RUN
       desk, which replaces the whole body — so the split is legitimately absent here and the
       page's own chrome is its header and content column. */
    /* ⚠️ `Work the list` IS RETIRED (Phase 4) — it opened the dock over the whole queue, and the
       dock IS the right-hand pane now, so the button entered a mode you were already in. */
    expect(html).not.toContain("Work the list");
  });

  /* ⚠️ TODAY'S TWO SMOKES WENT WITH THE PAGE (tasks-consolidation P1, 9 Aug), AND THIS IS THE
     POPULATED CASE THAT ABSORBED THEIR JOB (P2). The app-smoke law: a page that only smokes its
     first-run panel leaves every derivation unexecuted — and on this page the grouping, the stat
     chips, the family pills and the four-slot verb grid are ALL in that unexecuted half. */
  it("…and with real work on it, the GROUPS and a row all render (the populated smoke)", () => {
    /* ⚠️ THE TASK IS DATED ON PURPOSE. Under the two-natures law a DATELESS user card is a NOTE,
       and `boardEligible` keeps notes off this page entirely (they live on the Noteboard) — so a
       dateless seed renders an empty list and proves nothing. */
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    seed.agents = [{ id: "a1", userId: "u1", name: "Tom Ellery", agency: "Ellery & Frost" }];
    seed.userTasks = [{ id: "t1", userId: "u1", text: "Redraft the opening chapter", done: false, dueDate: ymd, createdAt: "2026-08-01T09:00:00Z", updatedAt: "" }];
    const html = render(<ToDoPage onNavigate={() => {}} />);
    expect(html).not.toContain("tdg-stats");             // the header's stat chips are retired
    /* ⚠️ THE FIGURE IS THE CONTROL BAR'S, AND IT AGREES WITH THE GROUP HEADING — asserted on the
       RENDERED page, which is the one check a source lock cannot make. One seeded task: the bar
       says "1 outstanding" and the heading beside the card says "1". The chips used to state the
       same number a third time. */
    /* ⚠️ THE FOOTER'S GRAMMAR IS THE CONTRACT'S NOW — "{n} tasks · {m} need you now", one count
       from the array the rows render from. "N outstanding" went with the retired rail footer, and
       with it the second number that made "showing 13 of 12" possible. */
    expect(html).toContain("1</b> tasks");
    expect(html).toContain('<span class="g-n">1</span>');
    expect(html).toContain("Your tasks");                // the group heading, outside its panel
    /* ⚠️ THE WHITE PANEL IS THE PORTED CARD — `.tlc` with its own `.l-body`. `tdg-panel` went
       with the retired list, and the claim is unchanged: the populated page draws a card. */
    /* the card carries both words — the scope and the contract's own name */
    expect(html).toContain('class="tlc listcard"');
    expect(html).toContain("Redraft the opening chapter");
    /* ⚠️ THE SEAT IS ALWAYS THERE; THE SPLIT IS NOT (Fix 4). The seeded row is a writer's own
       task, whose TICK is the act — so it draws the seat and no control, which is the deliberate
       shape rather than a gap. A derived card's split is exercised in tasksList.test.tsx. */
    /* ⚠️ NO ACTION CLUSTER — the brief removes hover actions from the row, which now does one
       thing: select. Asserted as an ABSENCE so a future row cannot quietly grow one back. */
    expect(html, "the row grew an action cluster").not.toContain("tdg-acts");
    /* ⚠️ NO TICK — the row's only job is selection now, and the completion path is the pane's.
       Asserted as an absence so a second place to finish work cannot reappear. */
    expect(html, "the row grew a tick again").not.toContain("tdg-tick");
    expect(html).not.toMatch(/["\s`]tdg-split["\s`]/);
    /* ⚠️ THE ROW IS ONE ELEMENT — never `display: contents`, which fractures hover, focus and any
       selected band into per-cell rectangles. Asserted against RENDERED output, not source. */
    expect(html).toContain('class="row"');   // the ported row
  });

  /* tasks-pages P3 — the Calendar is REAL; its placeholder era ended. Smoke from day one,
     empty AND populated (a page that only smokes its first-run panel leaves every derivation
     unexecuted — the app-smoke law). */
  afterEach(() => { seed.userTasks = []; seed.agents = []; });

  it("the Calendar page renders without throwing", () => {
    expect(() => render(<TodoCalendarPage onNavigate={() => {}} />)).not.toThrow();
  });

  /* ⚠️ RETARGETED by the `calendar` session (timeline pack, Phase 3), flagged in
     reports/calendar-timeline.md. THE LAW IS UNCHANGED — the page renders its board, its day
     header and its tools — and the classes it names moved with the month grid.
     ⚠️ THE LEGEND CLAUSE HAS NO SUBJECT and is not replaced. `CAL_LEGEND` taught the four CARD
     families' colours; the timeline's grammar is five kinds, and the filter chips name all five in
     words. A colour swatch on a chip would also fight the chip's own pink selected state — two
     colour meanings on one control. Reported for Nick, not decided here. */
  it("…and carries its board, its one column header and its groups", () => {
    const html = render(<TodoCalendarPage onNavigate={() => {}} />);
    expect(html).toContain("Calendar");
    expect(html).toContain("tl-board");
    /* ⚠️ ONE COLUMN HEADER, not a grid of weekday cells (Porcelain, Phase 2). `tl-head` and the
       weekday initials went with the day grid: a board of relationships measured in months has no
       use for "WED", and repeating the header per group restated nine dates five times down the
       page. `tl-hrow` is the single header; `tl-dt` are the ~nine dates along it. */
    /* ⚠️ `FULL BOARD / RIGHT NOW` IS RETIRED INTO THE VIEW STRIP (v40, Phase 6). It was a
       two-state segment that could say "you are seeing only what is asked of you" and could not
       say what the other cuts of the board even were; `Needs me` is the same filter with a home
       among its peers. The smoke's claim is unchanged — the page renders its view control — so it
       names the control that exists. */
    expect(html).toContain("Needs me");
    expect(html).toContain("With agents");
    /* ⚠️ AN EMPTY BOARD IS THE SPARSE PANEL, NOT AN EMPTY TABLE WITH A HEADER OVER IT. A column
       header above nothing teaches the shape of a board the writer does not have — the same rule
       that omits a group heading reading "0". The populated smoke below is where the header,
       the groups and the rows are proved. */
    expect(html).toContain("tl-sparse");
    expect(html).toContain("Nothing in this window");
  });

  it("…and a dated task REACHES its day (the populated smoke)", () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    seed.userTasks = [{ id: "t1", userId: "u1", text: "Redraft the opening", done: false, dueDate: ymd, createdAt: "", updatedAt: "" }];
    const html = render(<TodoCalendarPage onNavigate={() => {}} />);
    expect(html).toContain("Redraft the opening");
    /* the writer's own chip — `tl-tchip` since the rebuild; `tl-chip` was the grid-era class */
    expect(html).toContain("tl-tchip");
    /* ⚠️ AND THE POPULATED BOARD IS WHERE THE CHROME IS PROVED: one column header for the whole
       board, its ~nine dates, and the pinned group above the query groups. */
    /* ⚠️ THE DATE ROW IS THE RAIL NOW (v36, Phase 4). `tl-hrow` was the in-card header, drawn once
       inside the FIRST group's card — so it scrolled away with that card and a reader four groups
       down had no dates. It is the page's own sticky rail, above every group, and its ticks are
       proved to land on the same pixels as the lanes in `calLook.measure.ts`. */
    expect(html).toContain("tl-rail");
    expect(html).toContain("tl-dt");
    expect(html).toContain("tl-tick");
    expect(html).not.toContain("tl-hrow");
    /**
     * ⚠️ THE GROUP HEADING IS A MODE SINCE v37, NOT THE DEFAULT. The board opens on ONE LIST, which
     * has no headings at all — so "Your tasks" and its sentence are not on the page, and this
     * assertion has been red since that shipped. The claim it was making is that a dated task
     * REACHES the board, which is this case's whole title; the heading was how it used to be
     * visible, never what it was about.
     *
     * The task's own row is what carries it now, so the assertion follows the task rather than the
     * furniture it used to sit under.
     */
    expect(html).toContain("Redraft the opening");
    expect(html).toContain("tl-rrow");
    /* exactly ONE column header in the document, however many groups there are */
    /* ⚠️ ONE RAIL FOR THE WHOLE BOARD, however many groups there are — the claim that used to be
       "exactly one in-card header" and is stronger as a rail: it is the page's own and cannot
       scroll away with a card. */
    /* ⚠️ THE EXACT ATTRIBUTE, NEVER THE SUBSTRING. `tl-rail` is a prefix of `tl-railtl` — the
       rail's own timeline column — so a bare split counted two and reported the rail as drawn per
       group. The house rule, met on its own ground: a class-name lock bounds its token. */
    expect(html.split('class="tl-rail"').length - 1, "the rail is drawn per group").toBe(1);
  });

  /* tasks-pages P4 — the Noteboard is real too. Empty AND populated. */
  it("the Noteboard renders, teaches when empty, and carries no sidebar", () => {
    const html = render(<TodoNoteboardPage onNavigate={() => {}} />);
    expect(html).toContain("Noteboard");
    /* ⚠️ THE TEACHING STATE IS THE EXAMPLE PAPERS NOW (paper run, Phase 2). An empty board shows
       three keepable examples instead of the first-run panel — the panel returns only once every
       paper has been dismissed, which this mock (no todoPrefs) is not. Still a teaching state,
       still asserted; the words changed. */
    /* ⚠️ THE TEACHING STATE IS THE WORKFLOW NOW (empty-state run) — three illustrated panels
       above the example papers, which still render beneath them. The hint line this pinned one
       day ago became the examples' header block. */
    /* ⚠️ THE EXAMPLES LEFT THE BOARD (workflow run, Phase 1) — "What writers keep here" is the
       DRAWER's heading now, and the drawer mounts only when open, so a render smoke cannot see
       it. The teaching state on the page is the workflow. */
    expect(html).toContain("Your board is empty");
    expect(html).not.toContain("<aside");             // the contract's optional sidebar, absent
  });

  it("…and a pinned note REACHES the masonry (the populated smoke)", () => {
    seed.userTasks = [{ id: "n1", userId: "u1", text: "Open with the flood", detail: "Chapter one drags.", done: false, createdAt: "2026-08-01T09:00:00Z", updatedAt: "" }];
    const html = render(<TodoNoteboardPage onNavigate={() => {}} />);
    expect(html).toContain("Open with the flood");
    expect(html).toContain("nb-board");  // renamed from nb-grid in the Noteboard rebuild
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

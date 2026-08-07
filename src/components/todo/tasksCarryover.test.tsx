/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The walk's carry-over fixes (tasks-pages pack, Phase 2).
 *
 * 1. ⚠️ ONE COUNT DERIVATION — the badge said 42 beside a page saying fifteen cards, and Today's
 *    FILTERS said 27/24 against the list's 15/12: the badge was left on the member-unit law and
 *    Today fed its FILTERS the raw lanes. Everything walks assembleBoardColumns now.
 * 2. ⚠️ THE OFFER SNOOZE CAP holds on EVERY path — the bypass was FocusFlow's generic snooze
 *    (a flat 7 days), plus the dock's clock pointed at a popover that never mounted there.
 * 3. Snoozed cards keep their ORIGINAL titles (derivedCopy — never a template); the band says
 *    SNOOZED · BACK {date}.
 * 4. Done cards carry a populated band: ✓ DONE | {completion time}.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Query, Agent, UserTask, TaskFlag, QueryStatus } from "../../types";
import { assembleBoard } from "../../lib/todoBoard";
import {
  assembleBoardColumns, snoozedCards, liveBoardCards, boardFigures,
} from "../../lib/todoColumns";
import { facetCounts } from "../../lib/todoBoardSort";

const here = __dirname;
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const todayPage = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const sidebar = readFileSync(join(here, "..", "shell", "ShellSidebar.tsx"), "utf8");
const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
const dock = readFileSync(join(here, "TodoDock.tsx"), "utf8");
const colsLib = readFileSync(join(here, "..", "..", "lib", "todoColumns.ts"), "utf8");

const NOW = Date.parse("2026-08-06T12:00:00Z");
const TODAY = "2026-08-06";

const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.FULL_REQUESTED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email",
  ...over,
} as Query);
const ag = (over: Partial<Agent>): Agent => ({
  id: "a1", userId: "u", name: "Marcus Reed", agency: "Reed Literary", email: "", website: "", genres: [],
  ...over,
} as unknown as Agent);

const EMPTY = { tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: NOW };

/* ── fix 1: one derivation, every consumer ─────────────────────────────────────────────────── */

describe("⚠️ every count walks assembleBoardColumns — badge, page, FILTERS", () => {
  it("badge figure == page-subtitle figure == FILTERS Everything, over one input", () => {
    const flags: TaskFlag[] = [{ id: "f1", userId: "u", taskType: "no_response_close", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-08-08T00:00:00Z" }];
    const { cols } = assembleBoardColumns({ ...EMPTY, queries: [q({})], agents: [ag({})], taskFlags: flags });
    const badge = boardFigures(cols).cards;              // what the sidebar shows
    const page = boardFigures(cols).cards;               // what the subtitle speaks
    const everything = facetCounts(liveBoardCards(cols)).all; // what FILTERS heads
    expect(badge).toBe(page);
    expect(page).toBe(everything);
    expect(everything).toBeGreaterThan(0); // the fixture is not vacuous (the snoozed card counts)
  });

  it("⚠️ the three consumers all CALL the one derivation — no hand pipelines left", () => {
    expect(sidebar).toContain("assembleBoardColumns({");
    expect(sidebar).toContain("boardFigures(cols).cards");
    expect(sidebar).not.toContain("todoBadgeCount"); // the member-unit badge law is off the path
    expect(listPage).toContain("assembleBoardColumns({");
    expect(listPage).toContain("hiddenUserTaskId: pendingSaveId");
    expect(todayPage).toContain("assembleBoardColumns({");
    expect(todayPage).toContain("counts={facetCounts(liveBoardCards(assembled.cols))}");
    expect(todayPage).not.toContain("facetCounts([...board.do"); // the raw-lane feed is extinct
  });
});

/* ── fix 2: the offer cap, on every path ───────────────────────────────────────────────────── */

describe("⚠️ an offer's snooze is capped at tomorrow — on EVERY path", () => {
  it("the choke point: snoozeCard clamps offers regardless of the caller's tier", () => {
    const fn = listPage.slice(listPage.indexOf("function snoozeCard"), listPage.indexOf("function snoozeGroup"));
    expect(fn).toContain('if (c.taskType === "offer_received" && days > 1) { days = 1; when = "tomorrow"; }');
  });

  it("⚠️ THE PATH THAT BYPASSED IT — FocusFlow's generic snooze — is clamped, and says so", () => {
    const sn = flow.slice(flow.indexOf("function sweepSnooze"), flow.indexOf("function sweepSnooze") + 2600);
    expect(sn).toContain('const days = c.taskType === "offer_received" ? 1 : 7;');
    expect(sn).toContain("Snoozed until tomorrow");
    // and the staged-payload runner clamps at the write
    expect(flow).toContain('p.taskType === "offer_received" ? Math.min(p.days, 1) : p.days');
  });

  it("the dock's clock is a REAL menu now (it pointed at a popover that never mounted) — offers see only tomorrow", () => {
    expect(dock).toContain("tdk-snzmenu");
    expect(dock).toContain("Remind me tomorrow");
    // the week tier is ABSENT for offers, not disabled — a tier that can never be chosen is not a choice
    expect(dock).toContain('card.taskType !== "offer_received" && (');
    expect(dock).toContain("onSnoozeDays");
    expect(dock).not.toContain("onSnooze:");
    // the page routes the dock's choice through the clamped choke point
    expect(listPage).toContain("onSnoozeDays={(c, days, when) => snoozeCard(c, days, when)}");
  });

  it("the board's drag + menu tiers were already capped (board fixes II) — still true", () => {
    const menuLib = readFileSync(join(here, "..", "..", "lib", "todoMenu.ts"), "utf8");
    expect(menuLib).toContain("if (!isOffer) tiers.push");
  });
});

/* ── fix 3: snoozed cards keep their original titles ───────────────────────────────────────── */

describe("⚠️ a snoozed card keeps the work's identity", () => {
  const flag: TaskFlag = { id: "f1", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-08-08T00:00:00Z" };

  it("a derived card's title rebuilds through derivedCopy — the original, not a template", () => {
    const [c] = snoozedCards({ flags: [flag], queries: [q({})], agents: [ag({})], nowMs: NOW });
    expect(c.title).toBe("Send your full to Marcus Reed");
    // tasks-audit P2: the KIND survives snoozing — "{KIND} · 🕐 | BACK {date}", never bare SNOOZED
    expect(c.kind).toBe("AGENT WAITING · 🕐");
    expect(c.due).toBe("BACK 8 AUG");
  });

  it("a snoozed USER task keeps its own text — read from the raw collection the board filtered", () => {
    const utFlag: TaskFlag = { id: "f2", userId: "u", taskType: "user_task", queryId: "t9", snoozeCount: 1, snoozedUntil: "2026-08-09T00:00:00Z" };
    const userTasks = [{ id: "t9", userId: "u", text: "Redraft the opening", done: false, createdAt: "", updatedAt: "" } as UserTask];
    const [c] = snoozedCards({ flags: [utFlag], queries: [], agents: [], userTasks, nowMs: NOW });
    expect(c.title).toBe("Redraft the opening");
    expect(c.kind).toBe("YOUR TASK · 🕐"); // tasks-audit P2 — the kind survives
  });

  it('the "put away" template is extinct (the supersession comment may still QUOTE it)', () => {
    expect(colsLib).not.toContain("— put away`");   // the template expression itself
    expect(colsLib).not.toContain('"Put away"');    // and its fallback literal
    expect(colsLib).not.toContain("SNOOZED_KIND[");
  });
});

/* ── fix 4: the done band is populated ─────────────────────────────────────────────────────── */

describe("⚠️ done cards carry ✓ DONE | the completion time", () => {
  it("a task cleared today wears the state and the clock", () => {
    const doneAt = "2026-08-06T16:44:00";
    const board = assembleBoard({
      ...EMPTY,
      userTasks: [{ id: "t1", userId: "u", text: "Chase the reference", done: true, completedAt: doneAt, createdAt: "", updatedAt: "" } as UserTask],
    });
    expect(board.cleared).toHaveLength(1);
    expect(board.cleared[0].kind).toBe("✓ DONE");
    expect(board.cleared[0].due).toMatch(/^\d{2}:\d{2}$/);
    expect(board.cleared[0].due).toBe(new Date(doneAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  });
});

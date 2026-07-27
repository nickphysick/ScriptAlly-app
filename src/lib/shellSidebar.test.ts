/**
 * Locks for the v2 shell sidebar derivations. sidebarBoardTiles composes selectors that carry
 * their own deep locks (todoBoard/todoHousekeeping tests) — here it gets an all-empty smoke so
 * the composition itself is exercised; the display helpers get behavioural locks.
 */
import { describe, it, expect } from "vitest";
import {
  LEDGER_EMPTY_NOTE,
  SHELL_PRO_COPY,
  ledgerRows,
  localYMD,
  manuscriptInitials,
  manuscriptSubtitle,
  resolveActiveManuscript,
  sideNavCounts,
  sidebarBoardTiles,
} from "./shellSidebar";
import { Manuscript, Query, QueryStatus } from "../types";

const ms = (over: Partial<Manuscript>): Manuscript => ({ id: "m1", title: "Murphy's Day Out", ...over } as Manuscript);
const q = (over: Partial<Query>): Query => ({ id: "q1", status: QueryStatus.QUERIED, ...over } as Query);

describe("sidebarBoardTiles", () => {
  it("returns zeros on an empty desk", () => {
    expect(
      sidebarBoardTiles({
        tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [],
        taskFlags: [], activities: [], now: Date.parse("2026-07-27T12:00:00"),
      })
    ).toEqual({ urgent: 0, housekeeping: 0, notes: 0 });
  });
});

describe("ledgerRows — zero rows hidden (baked rule)", () => {
  it("keeps only non-zero rows, in urgent → housekeeping → notes order", () => {
    expect(ledgerRows({ urgent: 3, housekeeping: 0, notes: 2 }).map((r) => `${r.label} ${r.count}`)).toEqual([
      "Urgent 3",
      "Notes 2",
    ]);
  });
  it("goes empty when everything is zero (the quiet note takes over)", () => {
    expect(ledgerRows({ urgent: 0, housekeeping: 0, notes: 0 })).toEqual([]);
    expect(LEDGER_EMPTY_NOTE).toBe("Tasks and reminders will appear here — nothing to show right now.");
  });
});

describe("sideNavCounts", () => {
  it("maps page keys to list lengths + the board total", () => {
    const counts = sideNavCounts({
      queries: [q({}), q({ id: "q2" })],
      agents: [],
      manuscripts: [ms({})],
      packages: [],
      todoTotal: 44,
    });
    expect(counts["queries-hub"]).toBe(2);
    expect(counts.todo).toBe(44);
    expect(counts.packages).toBe(0);
    expect(counts.manuscripts).toBe(1);
  });
});

describe("manuscript switcher helpers", () => {
  it("tile initials — first two words (a title, not a person's name)", () => {
    expect(manuscriptInitials("Murphy's Day Out")).toBe("MD");
    expect(manuscriptInitials("Salt")).toBe("S");
  });
  it("subtitle — singular-safe count pair; shelved wins", () => {
    const queries = [q({}), q({ id: "q2", status: QueryStatus.REJECTED })];
    expect(manuscriptSubtitle(ms({}), queries)).toBe("2 queries · 1 active");
    expect(manuscriptSubtitle(ms({}), [q({})])).toBe("1 query · 1 active");
    expect(manuscriptSubtitle(ms({ shelved: true }), queries)).toBe("shelved");
  });
  it("resolveActiveManuscript — stored id wins, first is the fallback, empty is null", () => {
    const a = ms({ id: "a" });
    const b = ms({ id: "b" });
    expect(resolveActiveManuscript([a, b], "b")).toBe(b);
    expect(resolveActiveManuscript([a, b], "zz")).toBe(a);
    expect(resolveActiveManuscript([a, b], null)).toBe(a);
    expect(resolveActiveManuscript([], "a")).toBeNull();
  });
});

describe("localYMD", () => {
  it("formats local dates zero-padded", () => {
    expect(localYMD(Date.parse("2026-07-05T09:00:00"))).toBe("2026-07-05");
  });
});

describe("Pro line copy", () => {
  it("is the pack-baked option A", () => {
    expect(SHELL_PRO_COPY).toBe("Unlock your full query log");
  });
});

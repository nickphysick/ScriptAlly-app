/**
 * Locks for the v2 shell sidebar derivations. sidebarBoardTiles composes selectors that carry
 * their own deep locks (todoBoard/todoHousekeeping tests) — here it gets an all-empty smoke so
 * the composition itself is exercised; the display helpers get behavioural locks.
 */
import { resolveEntitlement, type Entitlement } from "./entitlements";
import { describe, it, expect } from "vitest";
import {
  SHELL_PRO_COPY,
  deskNotice,
  localYMD,
  manuscriptInitials,
  manuscriptSubtitle,
  planLine,
  resolveActiveManuscript,
  sideNavCounts,
  sidebarBoardTiles,
} from "./shellSidebar";
import { Manuscript, Query, QueryStatus, UserPlan } from "../types";

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

describe("deskNotice — recovered at 6d64b75; the surface is the MOBILE dashboard desk line", () => {
  it("HOT: the roundel carries the urgent count, housekeeping rides behind as context", () => {
    expect(deskNotice({ urgent: 3, housekeeping: 44, notes: 2 })).toEqual({
      tone: "hot",
      count: 3,
      headline: "3 tasks require your attention",
      sub: "plus 44 housekeeping items",
    });
  });

  it("CALM is its own treatment, not the loud one greyed out — and the figure is a plain 0", () => {
    expect(deskNotice({ urgent: 0, housekeeping: 44, notes: 9 })).toEqual({
      tone: "calm",
      count: 0,
      headline: "Nothing needs you today",
      sub: "44 housekeeping items when you have a moment",
    });
  });

  it("an EMPTY desk states no housekeeping line at all — never '0 housekeeping items'", () => {
    const n = deskNotice({ urgent: 0, housekeeping: 0, notes: 0 });
    expect(n.tone).toBe("calm");
    expect(n.sub).toBeNull();
    expect(n.headline).toBe("Nothing needs you today");
  });

  it("singulars agree with their verbs — one task REQUIRES, one ITEM", () => {
    expect(deskNotice({ urgent: 1, housekeeping: 1, notes: 0 })).toEqual({
      tone: "hot",
      count: 1,
      headline: "1 task requires your attention",
      sub: "plus 1 housekeeping item",
    });
  });

  it("notes never reach the line — they are neither urgent nor housekeeping", () => {
    const n = deskNotice({ urgent: 0, housekeeping: 0, notes: 12 });
    expect(`${n.headline} ${n.sub ?? ""}`).not.toContain("12");
  });
});

const CREATED = Date.parse("2026-11-01T00:00:00Z");
/** The real resolver, driven to each basis (so the test cannot restate the rule). */
const resolveFixture = (basis: Entitlement["basis"]): Entitlement => resolveEntitlement({
  founding: basis === "pending" ? null : basis === "founding",
  plan: basis === "pro" ? UserPlan.PRO : UserPlan.FREE,
  createdMs: CREATED,
  nowMs: basis === "trial" ? CREATED + 86_400_000 : CREATED + 30 * 86_400_000,
});

describe("planLine — the folded upsell (panel-foot treatment 1), read from the resolver (plan rules v1)", () => {
  const e = (basis: Entitlement["basis"]): Entitlement => resolveFixture(basis);
  it("free: the plan is stated as fact and the upsell is a link in that same line", () => {
    expect(planLine(e("free"))).toEqual({ label: "Free plan", upgrade: true });
  });
  it("trial: named as a trial, and the upsell may show", () => {
    expect(planLine(e("trial"))).toEqual({ label: "Pro trial", upgrade: true });
  });
  it("PRO: the plan, and NO link — a paying user is never sold to", () => {
    expect(planLine(e("pro"))).toEqual({ label: "Pro plan", upgrade: false });
  });
  it("founding: told so, and never sold to", () => {
    expect(planLine(e("founding"))).toEqual({ label: "Founding writer", upgrade: false });
  });
  it("pending: nothing claimed and nothing sold before the entitlement loads", () => {
    expect(planLine(e("pending"))).toEqual({ label: "", upgrade: false });
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

describe("Upgrade row copy", () => {
  it("is the capsule pack's baked wording (supersedes the flat shell's option A)", () => {
    expect(SHELL_PRO_COPY).toBe("Upgrade to Pro");
  });
});

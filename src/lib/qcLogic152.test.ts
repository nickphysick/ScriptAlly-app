import { describe, expect, it } from "vitest";
import { dayBlocked, dependents, knock, validate, type LogStep } from "./qcLogic152";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);
const at = (daysAgo: number) => NOW - daysAgo * DAY;
const c = { nowMs: NOW, first: "Jonathan" };
const s = (id: string, t: LogStep["t"], daysAgo: number): LogStep => ({ id, t, d: at(daysAgo) });
const base = [s("q", "queried", 100), s("pr", "preq", 60), s("ps", "psent", 40)];

describe("the nine logic checks (v152 §4.3)", () => {
  it("a log in order passes", () => { expect(validate(base, c).ok).toBe(true); });
  it("1 · exactly one Query sent, and it is the earliest", () => {
    expect(validate(base.filter((x) => x.t !== "queried"), c).glob[0]).toMatch(/needs a “Query sent”/);
    expect(validate([...base, s("q2", "queried", 30)], c).err.get("q2")).toMatch(/already a Query sent/);
    expect(validate([...base, s("early", "preq", 120)], c).err.get("early")).toMatch(/before the query was sent/);
  });
  it("2 · stage order", () => {
    expect(validate([s("q", "queried", 100), s("fr", "freq", 60), s("pr", "preq", 40)], c).err.get("pr")).toMatch(/can’t come after “Full requested”/);
  });
  it("3 · a send needs its request first", () => {
    expect(validate([s("q", "queried", 100), s("fs", "fsent", 40)], c).err.get("fs")).toMatch(/send the full before it was requested/);
  });
  it("4 · no duplicate stage steps", () => {
    expect(validate([...base.slice(0, 2), s("pr2", "preq", 50)], c).err.get("pr2")).toMatch(/already on the timeline/);
  });
  it("5 · nothing after a close", () => {
    expect(validate([s("q", "queried", 100), s("x", "passed", 60), s("n", "nudge", 30)], c).err.get("n")).toMatch(/closed on/);
  });
  it("6 · no nudge while it is your move", () => {
    expect(validate([...base.slice(0, 2), s("n", "nudge", 30)], c).err.get("n")).toMatch(/it’s your move/);
  });
  it("7 · no closed: no response while it is your move", () => {
    expect(validate([...base.slice(0, 2), s("x", "noresp", 30)], c).err.get("x")).toMatch(/only close for no reply while it’s with the agent/);
  });
  it("8 · no pass while a request to you is open, unless after an offer", () => {
    expect(validate([...base.slice(0, 2), s("x", "passed", 30)], c).err.get("x")).toMatch(/the next step is yours, not a pass/);
    expect(validate([s("q", "queried", 100), s("o", "offer", 60), s("x", "passed", 30)], c).ok).toBe(true);
  });
  it("9 · no dates in the future", () => {
    expect(validate([...base, s("fut", "nudge", -3)], c).err.get("fut")).toMatch(/in the future/);
  });
});

describe("knock, dependents and the calendar", () => {
  it("knock names the step a change would knock out of order", () => {
    expect(knock(base, base.map((x) => (x.id === "pr" ? { ...x, d: at(30) } : x)), "pr", c)).toMatch(/out of order|can’t come after|before it was requested/);
    expect(knock(base, [...base, s("n", "nudge", 10)], "n", c)).toBe("");
  });
  it("removing a request takes its send with it", () => {
    expect(dependents(base, "pr", c).map((x) => x.id)).toEqual(["ps"]);
    expect(dependents(base, "ps", c)).toEqual([]);
  });
  it("the calendar greys the future and days before the floor", () => {
    expect(dayBlocked(at(-2), { nowMs: NOW })).toBe("In the future");
    expect(dayBlocked(at(50), { nowMs: NOW, floorMs: at(40) })).toMatch(/Before the latest step/);
    expect(dayBlocked(at(10), { nowMs: NOW, floorMs: at(40) })).toBe("");
  });
});

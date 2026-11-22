/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2 (design-refs/log-a-query-v2/, mock v22) — the journey's pure model: the headline, catching up, the
 * nudge chips, what the agent asks for, and the review's two numbers.
 */
import { describe, expect, it } from "vitest";
import { headline, isCatchingUp, LOGGED_NAME_MAX, sod } from "./logStages";

const NOW = new Date(2026, 10, 22, 15).getTime();
const daysAgo = (n: number) => { const d = new Date(sod(NOW)); d.setDate(d.getDate() - n); return d.getTime(); };
const base = { sitting: 0, agentChosen: false, sentMs: null, nowMs: NOW };

describe("v2 · Phase 1 — the headline", () => {
  it("opens with the mock's two lines, on every step", () => {
    expect(headline(base)).toEqual(["Another query out. Great work!", "Let’s log the details."]);
    expect(headline({ ...base, agentChosen: true, sentMs: daysAgo(0) })).toEqual(["Another query out. Great work!", "Let’s log the details."]);
  });
  it("after Log and start another: the sitting's count, then the details once an agent is chosen", () => {
    expect(headline({ ...base, sitting: 2 })).toEqual(["That’s 2 logged.", "Who’s next?"]);
    expect(headline({ ...base, sitting: 2, agentChosen: true })).toEqual(["That’s 2 logged.", "Let’s log the details."]);
  });
  it("not sent yet", () => {
    expect(headline({ ...base, notSent: true })).toEqual(["Not out yet? No problem.", "It’s on your to-do list."]);
  });
  it("logged: the name up to 11 letters, else Logged. alone; the active count read back, else the Queries page", () => {
    expect(headline({ ...base, logged: { first: "Harriet", passed: false, active: 21 } })).toEqual(["Logged. Off to Harriet!", "That makes 21 active queries."]);
    expect(headline({ ...base, logged: { first: "Bartholomews", passed: false, active: 1 } })).toEqual(["Logged.", "That makes 1 active query."]);
    expect("Bartholomews".length).toBeGreaterThan(LOGGED_NAME_MAX);
    expect(headline({ ...base, logged: { first: "Maximiliana", passed: false, active: 3 } })[0]).toBe("Logged. Off to Maximiliana!");
    expect(headline({ ...base, logged: { first: "Harriet", passed: true, active: 21 } })[1]).toBe("It’s on your Queries page.");
    expect(headline({ ...base, logged: { first: "Harriet", passed: false, active: null } })[1]).toBe("It’s on your Queries page.");
  });
});

describe("v2 · Phase 3 — catching up", () => {
  it("7 days back is a normal log; 8 is catching up", () => {
    expect(isCatchingUp(daysAgo(7), NOW)).toBe(false);
    expect(isCatchingUp(daysAgo(8), NOW)).toBe(true);
    expect(isCatchingUp(null, NOW)).toBe(false);
    expect(headline({ ...base, sentMs: daysAgo(7) })[0]).toBe("Another query out. Great work!");
    expect(headline({ ...base, sentMs: daysAgo(8) })).toEqual(["Catching up.", "Let’s log the details."]);
  });
  it("catching up outranks the sitting's count; not sent and logged outrank both", () => {
    expect(headline({ ...base, sitting: 3, sentMs: daysAgo(30) })[0]).toBe("Catching up.");
    expect(headline({ ...base, sentMs: daysAgo(30), notSent: true })[0]).toBe("Not out yet? No problem.");
  });
});

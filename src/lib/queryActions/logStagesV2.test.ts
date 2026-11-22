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

/* ── Phase 2 — an agent added in the journey ── */
import { emptyCreated, heldTaskFor, toRemoveOnDiscard, toRemoveOnUndo, withAgent, withHeld, withLogged, withoutAgent, withoutHeld } from "./journeyCreated";
import { cascadePlan } from "../cascade";
import { agentFromDraft } from "../agentCreate";
import { emptyCardDraft, problemsOf } from "../cardDraft";
import { readFileSync } from "node:fs";

describe("v2 · Phase 2 — adding an agent without leaving", () => {
  it("the record is the new agent card's own: name and agency through the one mapping, an unknown agency marked so", () => {
    const d = { ...emptyCardDraft(), name: "Jo March", agency: "", agencyUnknown: true };
    expect(problemsOf(d)).toEqual({});
    const rec = agentFromDraft(d);
    expect(rec.name).toBe("Jo March");
    expect((rec as { agencyUnknown?: boolean }).agencyUnknown).toBe(true);
    /* without the mark the card's own rule asks for one — which is why the journey sets it */
    expect(problemsOf({ ...d, agencyUnknown: false }).agency).toBeTruthy();
  });
  it("create → select → discard removes the agent, and the agent's delete takes its Finish task", () => {
    let c = withAgent(emptyCreated(), "agent-new", "task-finish");
    expect(toRemoveOnDiscard(c)).toEqual([{ id: "agent-new", taskId: "task-finish" }]);
    /* the one delete (db.deleteAgent → cascadePlan) takes the agent's stored tasks with it */
    const plan = cascadePlan("agent", "agent-new", { queries: [], activities: [], taskFlags: [], userTasks: [{ id: "task-finish", agentId: "agent-new" }, { id: "other", agentId: "x" }] } as never);
    expect(plan.docs).toContainEqual({ col: "tasks", id: "task-finish" });
    expect(plan.docs).not.toContainEqual({ col: "tasks", id: "other" });
    c = withoutAgent(c, "agent-new");
    expect(toRemoveOnDiscard(c)).toEqual([]);
  });
  it("a logged agent is kept on close; Undo of that query removes it", () => {
    const c = withLogged(withAgent(emptyCreated(), "a1", "t1"), "a1");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    expect(toRemoveOnUndo(c, "a1")).toEqual({ id: "a1", taskId: "t1" });
  });
  it("an agent the journey did not create is never removed (the duplicate check merged into it)", () => {
    const c = withLogged(emptyCreated(), "existing");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    expect(toRemoveOnUndo(c, "existing")).toBeNull();
  });
  it("the host records an agent only when its id was not on the list before (the twin case is not recorded)", () => {
    const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
    expect(host).toMatch(/const isNew = !before\.has\(res\.id\);\s*if \(isNew\)/);
    expect(host).toMatch(/await addAgent\(agentFromDraft\(d\)\)/);
    expect(host).not.toMatch(/openNewAgentCard/);
  });
});

describe("v2 · Phase 3 — not sent yet", () => {
  it("one task per agent however often the link is pressed; a kept task keeps a new agent", () => {
    let c = withAgent(emptyCreated(), "a1", "t1");
    c = withHeld(c, "a1", "send-1");
    c = withHeld(c, "a1", "send-2");
    expect(c.held).toEqual([{ agentId: "a1", taskId: "send-1" }]);
    expect(heldTaskFor(c, "a1")).toBe("send-1");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    c = withoutHeld(c, "a1");
    expect(heldTaskFor(c, "a1")).toBeNull();
    expect(toRemoveOnDiscard(c)).toEqual([{ id: "a1", taskId: "t1" }]);
  });
  it("the host reuses the held task before it makes one, and the not-sent route never saves a query", () => {
    const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
    const body = host.slice(host.indexOf("const onNotSent"), host.indexOf("const onSentAfterAll"));
    expect(body.indexOf("heldTaskFor")).toBeLessThan(body.indexOf("addUserTask"));
    expect(body).not.toMatch(/saveLog|onSave/);
  });
});

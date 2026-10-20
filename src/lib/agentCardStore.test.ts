/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's one door (Agent card v1 §2): every opener calls the store, the host subscribes.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  closeAgentCard, currentAgentCard, openAgentCard, openNewAgentCard,
  subscribeAgentCard, emitAgentCardEvent, subscribeAgentCardEvents,
  stepAgentCard, completeNewAgent, type AgentCardRequest,
} from "./agentCardStore";

afterEach(() => closeAgentCard());

describe("‹ › — a step moves the SAME session", () => {
  it("changes the agent and keeps the seq, so the card is not re-opened", () => {
    openAgentCard("a", { from: "row", sequence: ["a", "b", "c"], tab: "want", focus: "genres" });
    const before = currentAgentCard()!;
    stepAgentCard("b");
    const after = currentAgentCard()!;
    expect(after.agentId).toBe("b");
    expect(after.seq, "a step is not an open — the session must not remount").toBe(before.seq);
    expect(after.sequence).toEqual(["a", "b", "c"]);
    expect(after.tab, "a step reads the next agent from the top, not at the last door's field").toBeUndefined();
    expect(after.focus).toBeUndefined();
    closeAgentCard();
  });
  it("refuses an agent outside the order, a new-agent card, and a closed card", () => {
    openAgentCard("a", { sequence: ["a", "b"] });
    stepAgentCard("z");
    expect(currentAgentCard()!.agentId).toBe("a");
    openNewAgentCard();
    stepAgentCard("a");
    expect(currentAgentCard()!.agentId).toBeNull();
    closeAgentCard();
    stepAgentCard("a");
    expect(currentAgentCard()).toBeNull();
  });
});

describe("the agent card's store", () => {
  it("opens an agent with every option carried, and notifies subscribers", () => {
    const seen: (AgentCardRequest | null)[] = [];
    const off = subscribeAgentCard((r) => seen.push(r));
    openAgentCard("ag-1", { tab: "want", focus: "genres", from: "slip", sequence: ["ag-0", "ag-1", "ag-2"], prefill: { genres: ["Thriller"] } });
    off();
    const r = currentAgentCard();
    expect(r?.agentId).toBe("ag-1");
    expect(r?.tab).toBe("want");
    expect(r?.focus).toBe("genres");
    expect(r?.from).toBe("slip");
    expect(r?.sequence).toEqual(["ag-0", "ag-1", "ag-2"]);
    expect(r?.prefill).toEqual({ genres: ["Thriller"] });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(r);
  });

  it("re-opening the SAME agent is a new session — the seq moves", () => {
    openAgentCard("ag-1");
    const a = currentAgentCard()!.seq;
    openAgentCard("ag-1");
    expect(currentAgentCard()!.seq).toBeGreaterThan(a);
  });

  it("a new agent is agentId null; close clears; an unsubscribed listener hears nothing", () => {
    let calls = 0;
    const off = subscribeAgentCard(() => { calls += 1; });
    openNewAgentCard({ from: "button" });
    expect(currentAgentCard()?.agentId).toBeNull();
    expect(currentAgentCard()?.from).toBe("button");
    off();
    closeAgentCard();
    expect(currentAgentCard()).toBeNull();
    expect(calls).toBe(1);
  });

  it("events reach the page (the list's notice, FLIP and new-row ring ride them)", () => {
    const got: string[] = [];
    const off = subscribeAgentCardEvents((e) => got.push(`${e.type}:${e.agentId}`));
    const a = { id: "ag-1" } as never;
    emitAgentCardEvent({ type: "saved", agentId: "ag-1", before: a, after: a });
    emitAgentCardEvent({ type: "added", agentId: "ag-9" });
    off();
    emitAgentCardEvent({ type: "added", agentId: "ag-x" });
    expect(got).toEqual(["saved:ag-1", "added:ag-9"]);
  });
});

/* Retire the add-agent pop-up: every door opens the ONE new-agent panel, a typed name carries in, and a flow waiting
   on the new agent (Log a query's picker) is handed its id once the panel saves. */
describe("the new-agent panel — prefill and hand-back", () => {
  it("carries the typed name, the panel host, the drawer stacking and the hand-back on the request", () => {
    const onCreated = () => {};
    openNewAgentCard({ from: "button", host: "panel", over: "drawer", prefill: { name: "Priya Shah" }, onCreated });
    const r = currentAgentCard()!;
    expect(r.agentId).toBeNull();
    expect(r.host).toBe("panel");
    expect(r.over).toBe("drawer");
    expect(r.prefill).toEqual({ name: "Priya Shah" });
    expect(r.onCreated).toBe(onCreated);
  });

  it("a save closes the session, tells the page, then hands the id back — once", () => {
    const handed: string[] = [];
    const heard: string[] = [];
    const off = subscribeAgentCardEvents((e) => heard.push(`${e.type}:${e.agentId}`));
    openNewAgentCard({ host: "panel", onCreated: (id) => { handed.push(id); heard.push(`handed:${id}`); } });
    completeNewAgent("ag-new");
    expect(currentAgentCard(), "the session is over").toBeNull();
    expect(handed).toEqual(["ag-new"]);
    expect(heard, "the page hears the add before the waiting flow picks the agent").toEqual(["added:ag-new", "handed:ag-new"]);
    completeNewAgent("ag-new");
    expect(handed, "a second completion with nothing open hands nothing back").toEqual(["ag-new"]);
    off();
  });

  it("a cancel hands nothing back", () => {
    const handed: string[] = [];
    openNewAgentCard({ host: "panel", prefill: { name: "Zed" }, onCreated: (id) => handed.push(id) });
    closeAgentCard();
    completeNewAgent("ag-late");
    expect(handed).toEqual([]);
  });

  it("completes only a NEW-agent session — never an open agent's card", () => {
    const heard: string[] = [];
    const off = subscribeAgentCardEvents((e) => heard.push(e.type));
    openAgentCard("ag-1", { host: "panel" });
    completeNewAgent("ag-2");
    expect(currentAgentCard()?.agentId).toBe("ag-1");
    expect(heard).toEqual([]);
    off();
  });

  it("a door opened afterwards replaces the waiting flow: only the live request is handed the id", () => {
    const first: string[] = [];
    const second: string[] = [];
    openNewAgentCard({ host: "panel", onCreated: (id) => first.push(id) });
    openNewAgentCard({ host: "panel", onCreated: (id) => second.push(id) });
    completeNewAgent("ag-3");
    expect(first).toEqual([]);
    expect(second).toEqual(["ag-3"]);
  });
});

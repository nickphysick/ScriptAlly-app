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
  stepAgentCard, type AgentCardRequest,
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

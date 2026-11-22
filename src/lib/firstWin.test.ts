/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DFV-B — Dashboard first visit v1, Part B: the first-win stamp fires on the act, once per kind, user and
 * manuscript, and never for a second manuscript's earlier kind. (The stamp on a rendered page is measured by
 * tests/e2e/dashFirstVisit.check.mjs.)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { __resetFirstWins, clearWin, noteFirstWin, pendingWins } from "./firstWin";
import { isFirstAgentWin, isFirstQueryWin, pickStamp, winCopy, winKey, type WinKind } from "./dashFirstVisit";

type W = { kind: WinKind; msId: string | null };

describe("DFV-B · the triggers", () => {
  it("a logged query is a first win only when its manuscript had none", () => {
    expect(isFirstQueryWin([], "ms-a", false)).toBe(true);
    expect(isFirstQueryWin([{ manuscriptId: "ms-b" }], "ms-a", false)).toBe(true); // another book's queries do not count
    expect(isFirstQueryWin([{ manuscriptId: "ms-a" }], "ms-a", false)).toBe(false);
  });
  it("an imported query never is — the import records its own stamp, once, for the file", () => {
    expect(isFirstQueryWin([], "ms-a", true)).toBe(false);
  });
  it("an agent is a first win only when the writer had none", () => {
    expect(isFirstAgentWin(0)).toBe(true);
    expect(isFirstAgentWin(1)).toBe(false);
  });
});

describe("DFV-B · once only, per kind, user and manuscript", () => {
  it("each kind fires once, not twice", () => {
    const pending: W[] = [{ kind: "query", msId: "ms-a" }];
    const first = pickStamp(pending, {}, new Set());
    expect(first.strike).toEqual(pending[0]);
    /* the strike is recorded (prefs, then this mount's own set): the same stamp again is dropped */
    const again = pickStamp(pending, { [first.key!]: true }, new Set());
    expect(again.strike).toBeNull();
    expect(again.drop).toEqual(pending);
    expect(pickStamp(pending, {}, new Set([first.key!])).strike).toBeNull();
  });
  it("not for a second manuscript's earlier kind: the agent stamp is the writer's, the query stamp the manuscript's", () => {
    expect(winKey("agent", "ms-a")).toBe(winKey("agent", "ms-b"));
    expect(winKey("query", "ms-a")).not.toBe(winKey("query", "ms-b"));
    const shown = { [winKey("agent", "ms-a")]: true as const, [winKey("query", "ms-a")]: true as const };
    expect(pickStamp([{ kind: "agent", msId: "ms-b" }], shown, new Set()).strike).toBeNull();
    expect(pickStamp([{ kind: "query", msId: "ms-b" }], shown, new Set()).strike).toEqual({ kind: "query", msId: "ms-b" });
  });
  it("strikes the oldest not yet shown, dropping the ones already shown before it", () => {
    const pending: W[] = [{ kind: "agent", msId: null }, { kind: "query", msId: "ms-a" }];
    const r = pickStamp(pending, { [winKey("agent", null)]: true }, new Set());
    expect(r.strike).toEqual(pending[1]);
    expect(r.drop).toEqual([pending[0]]);
  });
});

describe("DFV-B · the hand-off", () => {
  beforeEach(() => __resetFirstWins());
  it("keeps one pending stamp per kind and manuscript, for its own writer only", () => {
    noteFirstWin({ kind: "query", uid: "u1", msId: "ms-a", title: "First query logged", sub: "x" });
    noteFirstWin({ kind: "query", uid: "u1", msId: "ms-a", title: "First query logged", sub: "y" });
    noteFirstWin({ kind: "agent", uid: "u2", msId: null, title: "First agent added", sub: "z" });
    expect(pendingWins("u1").map((w) => w.sub)).toEqual(["y"]);
    expect(pendingWins("u2")).toHaveLength(1);
    clearWin({ uid: "u1", kind: "query", msId: "ms-a" });
    expect(pendingWins("u1")).toHaveLength(0);
  });
});

describe("DFV-B · the copy records the event and never congratulates", () => {
  it("states the agent, the agency and the sent day — and never the same words twice", () => {
    expect(winCopy.query("Tessa Rowe", "Rowe Literary", "2026-10-28T11:00:00.000Z")).toEqual({ title: "First query logged", sub: "Tessa Rowe · Rowe Literary · 28 Oct" });
    expect(winCopy.agent("Tessa Rowe", "Rowe Literary")).toEqual({ title: "First agent added", sub: "Tessa Rowe · Rowe Literary" });
    expect(winCopy.agent("Rowe Literary", "Rowe Literary").sub).toBe("Rowe Literary");
    expect(winCopy.import(14)).toEqual({ title: "14 queries imported", sub: "Your campaign is on the dashboard" });
    expect(winCopy.import(1).title).toBe("1 query imported");
    for (const c of [winCopy.query("A", "B", null), winCopy.agent("A", "B"), winCopy.import(3)]) {
      expect(`${c.title} ${c.sub}`).not.toMatch(/congrat|well done|great|!/i);
    }
  });
});

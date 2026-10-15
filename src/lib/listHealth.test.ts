/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { POINTS, agentPct, health, minutesFor, possibleFor } from "./listHealth";
import { SubmissionStatus, type Agent } from "../types";
import type { GapKey } from "./contactHousekeeping";

const ag = (id: string, closed = false) => ({ id, submissionStatus: closed ? SubmissionStatus.CLOSED : SubmissionStatus.OPEN }) as unknown as Agent;
const model = (m: Record<string, GapKey[]>, items = 0) => ({ gapsById: new Map(Object.entries(m)), items: Array.from({ length: items }) as never[] });

describe("List health (points)", () => {
  it("the table is the pack's", () => expect(POINTS).toEqual({ reply: 6, materials: 5, genres: 4, wishlist: 3, reopen: 2 }));
  it("a profile is worth 18, or 20 closed for now", () => {
    expect(possibleFor(ag("a"))).toBe(18);
    expect(possibleFor(ag("b", true))).toBe(20);
  });
  it("held ÷ possible, rounded, over 41 agents with closed ones", () => {
    const agents = [...Array.from({ length: 36 }, (_, i) => ag(`o${i}`)), ...Array.from({ length: 5 }, (_, i) => ag(`c${i}`, true))];
    const gaps: Record<string, GapKey[]> = { o0: ["reply", "genres"], o1: ["wishlist"], c0: ["reopen"], c1: ["reply", "reopen"] };
    const h = health(agents, model(gaps, 6));
    expect(h.possible).toBe(36 * 18 + 5 * 20);
    expect(h.missing).toBe(6 + 4 + 3 + 2 + 6 + 2);
    expect(h.held).toBe(h.possible - h.missing);
    expect(h.pct).toBe(Math.round((100 * h.held) / h.possible));
    expect(h.gaps).toBe(6);
  });
  it("saving a reply time adds exactly 6 to held", () => {
    const agents = [ag("a"), ag("b")];
    const before = health(agents, model({ a: ["reply", "genres"] }));
    const after = health(agents, model({ a: ["genres"] }));
    expect(after.held - before.held).toBe(6);
  });
  it("no agents, no score", () => expect(health([], model({})).pct).toBeNull());
  it("an agent's own share, and the minutes", () => {
    expect(agentPct(ag("a"), ["reply"])).toBe(Math.round((100 * 12) / 18));
    expect(minutesFor(5)).toBe(3);
    expect(minutesFor(0)).toBe(0);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v118.1 Part E — the Closed stack's card data: the sent date as stored (never a future one), and whole weeks
 * of no reply, at least one where there was any time at all.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import { closedCards } from "./dashHover";

const iso = (d: string) => new Date(`${d}T12:00:00Z`).toISOString();
const NOW = Date.parse("2026-10-28T12:00:00Z");
const agents = [{ id: "a1", name: "Fenella Strathcarron-Whitby", agency: "Northbank" } as unknown as Agent];
const q = (id: string, sent: string | null, closed: string | null): Query =>
  ({ id, agentId: "a1", manuscriptId: "m1", status: QueryStatus.NO_RESPONSE, dateSent: sent ? iso(sent) : undefined, lastStatusChange: closed ? iso(closed) : undefined } as unknown as Query);
const card = (query: Query) => closedCards({ members: { quiet: [query.id], letter: [], partial: [], full: [] } }, "quiet", [query], agents, NOW)[0];

describe("no-reply weeks", () => {
  it("whole weeks from the sent date to the close", () => { expect(card(q("w1", "2026-06-21", "2026-10-04")).end).toBe("15 wks"); });
  it("at least one week where there was any time", () => { expect(card(q("w2", "2026-10-01", "2026-10-04")).end).toBe("1 wk"); });
  it("to today where nothing dates the close", () => { expect(card(q("w3", "2026-09-01", null)).end).toBe("8 wks"); });
  it("no sent date: no number", () => { expect(card(q("w4", null, "2026-10-04")).end).toBe("No reply"); });
});

describe("the queried date", () => {
  it("is the sent date", () => { expect(card(q("d1", "2026-06-21", "2026-10-04")).queried).toBe("21 Jun"); });
  it("a sent date in the future reads as unknown, and says so", () => {
    const c = card(q("d2", "2026-12-05", "2026-10-04"));
    expect([c.queried, c.end, c.futureSent]).toEqual(["—", "No reply", true]);
  });
  it("a missing sent date reads as unknown", () => { expect(card(q("d3", null, null)).queried).toBe("—"); });
});

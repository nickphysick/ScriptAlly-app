/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 · Phase 4 — the panel's new filter keys: how they match, and how a remembered filter set from
 * before this build reads (safely: unknown keys ignored, the new keys off).
 */
import { describe, expect, it } from "vitest";
import { emptyContactFilters, fitMatches, matchesContactFilters, replyMatches, type AgentFacts } from "./contactList";
import { LIST_VISIT_VERSION, sanitiseListVisit } from "./contactListMemory";

const fx = (agent: Record<string, unknown>, o: Partial<AgentFacts> = {}) =>
  ({ agent: { id: "a", name: "Ann", agency: "", ...agent }, stand: "none", standing: { kind: "none" }, status14: "none", genres: [], gaps: 0, door: "open", openKey: "open", ...o }) as unknown as AgentFacts;

describe("the new keys", () => {
  it("Fit: 5 is exactly five, 4 is four and up, 0 is not rated", () => {
    expect([5, 4, 0].map((c) => fitMatches(fx({ starRating: 5 }), c as 5 | 4 | 0))).toEqual([true, true, false]);
    expect([5, 4, 0].map((c) => fitMatches(fx({ starRating: 4 }), c as 5 | 4 | 0))).toEqual([false, true, false]);
    expect([5, 4, 0].map((c) => fitMatches(fx({}), c as 5 | 4 | 0))).toEqual([false, false, true]);
  });
  it("Replies: always, no response means no, reply time known (the stub 0 is not known)", () => {
    expect(replyMatches(fx({ noResponseMeansNo: false }), "always")).toBe(true);
    expect(replyMatches(fx({ noResponseMeansNo: true }), "nrmn")).toBe(true);
    expect(replyMatches(fx({}), "always")).toBe(false);
    expect(replyMatches(fx({ responseTimeWeeks: 6 }), "known")).toBe(true);
    expect(replyMatches(fx({ responseTimeWeeks: 0 }), "known")).toBe(false);
  });
  it("Outside the UK reads the page's `abroad`", () => {
    expect(matchesContactFilters(fx({}, { abroad: true } as Partial<AgentFacts>), { ...emptyContactFilters(), abroad: true })).toBe(true);
    expect(matchesContactFilters(fx({}), { ...emptyContactFilters(), abroad: true })).toBe(false);
  });
});

describe("a remembered filter set", () => {
  const read = (filters: Record<string, unknown>) => sanitiseListVisit({ v: LIST_VISIT_VERSION, filters, search: "", scroll: 0 })!.filters;
  it("from before this build reads with the new keys off", () => {
    const f = read({ queried: "no", open: "open", always: true });
    expect([f.queried, f.open, f.always, f.fit, f.reply, f.abroad]).toEqual(["no", "open", true, null, "any", false]);
  });
  it("unknown keys and bad values are ignored", () => {
    const f = read({ fit: 3, reply: "sometimes", abroad: "yes", colour: "blue" });
    expect([f.fit, f.reply, f.abroad]).toEqual([null, "any", false]);
    expect("colour" in f).toBe(false);
    expect(read({ fit: 0, reply: "nrmn", abroad: true })).toMatchObject({ fit: 0, reply: "nrmn", abroad: true });
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.3 · Phase 2 — the smart panel's filter keys: how they match, and how a remembered filter set from
 * before this build reads (safely: unknown keys and the retired v1.2 keys ignored, the new keys off).
 */
import { describe, expect, it } from "vitest";
import { emptyContactFilters, matchesContactFilters, rtWords, type AgentFacts, type ContactFilters } from "./contactList";
import { LIST_VISIT_VERSION, sanitiseListVisit } from "./contactListMemory";

const fx = (agent: Record<string, unknown>, o: Partial<AgentFacts> = {}) =>
  ({ agent: { id: "a", name: "Ann", agency: "", ...agent }, stand: "none", standing: { kind: "none" }, status14: "none", genres: [], gaps: 0, door: "open", openKey: "open", ...o }) as unknown as AgentFacts;
const m = (x: AgentFacts, f: Partial<ContactFilters>) => matchesContactFilters(x, { ...emptyContactFilters(), ...f });

describe("the smart panel's keys", () => {
  it("Minimum fit: k is k and up; the unrated only with Not rated; the stub 0 is unrated", () => {
    expect([m(fx({ starRating: 5 }), { fitMin: 4 }), m(fx({ starRating: 3 }), { fitMin: 4 }), m(fx({}), { fitMin: 4 })]).toEqual([true, false, false]);
    expect([m(fx({}), { fitMin: 4, fitUnrated: true }), m(fx({ starRating: 0 }), { fitMin: 4, fitUnrated: true })]).toEqual([true, true]);
  });
  it("Reply time: inside the range; 16 means 16 and over; the unknown only with Not known (on by default)", () => {
    expect([m(fx({ responseTimeWeeks: 6 }), { rt: [2, 8] }), m(fx({ responseTimeWeeks: 10 }), { rt: [2, 8] })]).toEqual([true, false]);
    expect(m(fx({ responseTimeWeeks: 30 }), { rt: [6, 16] })).toBe(true);
    expect([m(fx({}), { rt: [2, 8] }), m(fx({}), { rt: [2, 8], rtUnknown: false }), m(fx({ responseTimeWeeks: 0 }), { rt: [2, 8], rtUnknown: false })]).toEqual([true, false, false]);
    expect([rtWords([2, 8]), rtWords([6, 16]), rtWords([6, 6])]).toEqual(["2–8 wks", "6–16+ wks", "6 wks"]);
  });
  it("Location: any picked country, by its normalised code", () => {
    expect([m(fx({ country: "United Kingdom" }), { countries: ["GB", "US"] }), m(fx({ country: "IE" }), { countries: ["GB"] }), m(fx({}), { countries: ["GB"] })]).toEqual([true, false, false]);
  });
  it("Always reply / Not always; Full profile / Has gaps (List health's lhGaps)", () => {
    expect([m(fx({ noResponseMeansNo: false }), { alwaysReply: "yes" }), m(fx({}), { alwaysReply: "yes" }), m(fx({}), { alwaysReply: "no" })]).toEqual([true, false, true]);
    expect([m(fx({}, { lhGaps: 1 } as Partial<AgentFacts>), { profile: "gaps" }), m(fx({}), { profile: "gaps" }), m(fx({}), { profile: "full" })]).toEqual([true, false, true]);
  });
});

describe("a remembered filter set", () => {
  const read = (filters: Record<string, unknown>) => sanitiseListVisit({ v: LIST_VISIT_VERSION, filters, search: "", scroll: 0 })!.filters;
  it("from before this build reads with the new keys off and the retired ones dropped", () => {
    const f = read({ queried: "no", open: "open", fit: 4, reply: "always", abroad: true, noGenres: true });
    expect([f.queried, f.open, f.fitMin, f.fitUnrated, f.rt, f.rtUnknown, f.countries, f.alwaysReply, f.profile]).toEqual(["no", "open", null, false, null, true, [], "any", "any"]);
    for (const k of ["fit", "reply", "abroad", "noGenres", "colour"]) expect(k in f).toBe(false);
  });
  it("bad values are ignored; good ones survive; a full-width range is no range", () => {
    expect(read({ fitMin: 7, rt: [8, 2], countries: ["gb", 3], alwaysReply: "maybe", profile: "x" })).toMatchObject({ fitMin: null, rt: null, countries: [], alwaysReply: "any", profile: "any" });
    expect(read({ fitMin: 4, fitUnrated: true, rt: [2, 8], rtUnknown: false, countries: ["GB", "GB", "US"], alwaysReply: "yes", profile: "gaps" }))
      .toMatchObject({ fitMin: 4, fitUnrated: true, rt: [2, 8], rtUnknown: false, countries: ["GB", "US"], alwaysReply: "yes", profile: "gaps" });
    expect(read({ rt: [1, 16] }).rt).toBeNull();
    expect(read({ fitUnrated: true }).fitUnrated).toBe(false);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28, unit locks: CX28 S3 (the age chip), S4 (the sort), the slip table behind S2, the picker's
 * record and tip behind E3, and the two rates "What's landing" reads (D1's average against Analytics, D2's per letter).
 */
import { describe, expect, it } from "vitest";
import { Query, QueryStatus } from "../types";
import type { CompRow } from "./compsLibrary";
import { averageAsked, letterRate } from "./compUsage";
import { analyticsModel } from "./analyticsModel";
import {
  NO_FILTER, ageChip, filterShelf, noticeOf, pendiumNote, pendiumOrder, pickRecord, pickTip, podiumOf, statOf,
  sortShelf, whereCounts,
} from "./compsShelf";

const NOW = 2026;
const row = (o: Partial<CompRow> & { title: string; index: number }): CompRow => ({
  key: `k${o.index}`, index: o.index, comp: { title: o.title, ...(o.comp ?? {}) }, kind: o.kind ?? "book", ready: o.ready ?? true,
  where: o.where ?? "none", letters: o.letters ?? [], packages: [], queries: o.queries ?? [], askedForMore: o.askedForMore ?? 0, lastSent: null,
});
const qs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `q${i}` })) as CompRow["queries"];

describe("CX28 S3 · the age chip (v30: two tones, no sage)", () => {
  const cases: [number, string, string][] = [[0, "This year", "plain"], [1, "1 yr old", "plain"], [3, "3 yrs old", "plain"], [5, "5 yrs old", "plain"], [6, "6 yrs old", "old"], [9, "9 yrs old", "old"]];
  for (const [age, text, tone] of cases) {
    it(`age ${age} reads "${text}" (${tone})`, () => {
      const c = ageChip(NOW - age, NOW)!;
      expect(c.text).toBe(text);
      expect(c.tone).toBe(tone);
      expect(c.title !== null).toBe(tone === "old");
    });
  }
  it("no year, no chip", () => expect(ageChip(undefined, NOW)).toBeNull());
  it("rust begins at 6, never at 5", () => { expect(ageChip(NOW - 5, NOW)!.tone).toBe("plain"); expect(ageChip(NOW - 6, NOW)!.tone).toBe("old"); });
});

describe("CP30 S3 (unit) · the stat card, by state", () => {
  const L = (id: string, sent: boolean) => ({ id, name: `Letter ${id}`, short: id, sent, packages: [] });
  it("a sent card names only the letters that went out; under five is early days; the meter is the rate in tens", () => {
    const s = statOf(row({ title: "S", index: 0, where: "sent", queries: qs(4), askedForMore: 1, letters: [L("A", true), L("D", false), L("B", true)] }));
    expect(s).toEqual({ kind: "sent", queries: 4, asked: 1, pct: 25, on: 3, letters: ["Letter A", "Letter B"], early: true });
    expect(statOf(row({ title: "T", index: 1, where: "sent", queries: qs(9), askedForMore: 6, letters: [L("A", true)] }))).toMatchObject({ pct: 67, on: 7, early: false });
  });
  it("draft names the unsent letters; shelf says nothing more", () => {
    expect(statOf(row({ title: "D", index: 1, where: "unsent", letters: [L("V3", false)] }))).toEqual({ kind: "draft", letters: ["Letter V3"] });
    expect(statOf(row({ title: "N", index: 2 }))).toEqual({ kind: "shelf" });
  });
});

describe("CX28 S4 · the sort", () => {
  const rows = [
    row({ title: "The Zebra", index: 0, where: "sent", queries: qs(2), askedForMore: 2, comp: { title: "The Zebra", year: 2019 } }),
    row({ title: "Apple", index: 1, comp: { title: "Apple", year: 2025 } }),
    row({ title: "Mango", index: 2, where: "sent", queries: qs(9), askedForMore: 3, comp: { title: "Mango", year: 2022 } }),
    row({ title: "Kiwi", index: 3, where: "sent", queries: qs(5), askedForMore: 4, comp: { title: "Kiwi", year: 2021 } }),
  ];
  const t = (k: Parameters<typeof sortShelf>[1]) => sortShelf(rows, k).map((r) => r.comp.title);
  it("your order is the stored order", () => expect(t("own")).toEqual(["The Zebra", "Apple", "Mango", "Kiwi"]));
  it("most queries, highest first", () => expect(t("queries")).toEqual(["Mango", "Kiwi", "The Zebra", "Apple"]));
  it("best response, highest first, never-sent last", () => expect(t("rate")).toEqual(["The Zebra", "Kiwi", "Mango", "Apple"]));
  it("newest first", () => expect(t("newest")).toEqual(["Apple", "Mango", "Kiwi", "The Zebra"]));
  it("A to Z ignores a leading The", () => expect(t("az")).toEqual(["Apple", "Kiwi", "Mango", "The Zebra"]));
});

describe("CX28 S5 (unit) · filters compose; counts sum", () => {
  const rows = [
    row({ title: "A", index: 0, where: "sent", queries: qs(1) }), row({ title: "B", index: 1, where: "unsent", kind: "tv" }),
    row({ title: "C", index: 2, kind: "tv", comp: { title: "C", publisher: "BBC Two" } }), row({ title: "D", index: 3 }),
  ];
  it("where AND find (v30: no type filter)", () => {
    expect(filterShelf(rows, { where: "shelf", find: "" }).map((r) => r.comp.title)).toEqual(["C", "D"]);
    expect(filterShelf(rows, { ...NO_FILTER, find: "bbc" }).map((r) => r.comp.title)).toEqual(["C"]);
    expect(filterShelf(rows, { where: "sent", find: "bbc" })).toEqual([]);
  });
  it("the where counts sum to the comp count", () => { const c = whereCounts(rows); expect(c.sent + c.draft + c.shelf).toBe(rows.length); expect(c).toEqual({ sent: 1, draft: 1, shelf: 2 }); });
});

describe("CP32 B1 (unit) · the band's letter", () => {
  it("the unrecorded sent letter with the most queries (ties: the oldest); none, none", () => {
    expect(noticeOf([{ letterId: "L1", name: "Hook-first", queries: 5 }])).toEqual({ letterId: "L1", name: "Hook-first", queries: 5 });
    expect(noticeOf([{ letterId: "L1", name: "A", queries: 2 }, { letterId: "L2", name: "B", queries: 7 }, { letterId: "L3", name: "C", queries: 7 }])).toMatchObject({ letterId: "L2" });
    expect(noticeOf([])).toBeNull();
  });
});

describe("CP32 P (unit) · podiumOf", () => {
  const r = (i: number, q: number, a: number) => row({ title: `C${i}`, index: i, where: q ? "sent" : "none", queries: qs(q), askedForMore: a });
  const flat = (rows: CompRow[]) => podiumOf(rows).map((p) => [p.row.key, p.place, p.equal, p.pct]);
  it("order: compRate descending, then more queries, then the writer's order; only comps at READY_AT or more", () => {
    expect(flat([r(0, 9, 3), r(1, 5, 4), r(2, 4, 4), r(3, 10, 2), r(4, 20, 9)])).toEqual([["k1", 1, false, 80], ["k4", 2, false, 45], ["k0", 3, false, 33]]);
    expect(flat([r(0, 5, 2), r(1, 10, 4)]).map((x) => x[0])).toEqual(["k1", "k0"]);
  });
  it("ties: equal rates share a place and say so (1, 1, 3)", () => {
    expect(flat([r(0, 9, 6), r(1, 6, 4), r(2, 20, 11)])).toEqual([["k0", 1, true, 67], ["k1", 1, true, 67], ["k2", 3, false, 55]]);
    expect(flat([r(0, 5, 1), r(1, 5, 4), r(2, 10, 2)])).toEqual([["k1", 1, false, 80], ["k2", 2, true, 20], ["k0", 2, true, 20]]);
  });
  it("under three: only the ranked; none: an empty podium", () => {
    expect(flat([r(0, 9, 6), r(1, 3, 3)])).toEqual([["k0", 1, false, 67]]);
    expect(flat([r(0, 4, 4), r(1, 0, 0)])).toEqual([]);
    expect(flat([])).toEqual([]);
  });
  it("the Comp-pendium: ranked in podium order, then the rest by queries, then letters, then the writer's order", () => {
    const L = (id: string) => ({ id, name: id, short: id, sent: false, packages: [] });
    const rows = [row({ title: "A", index: 0 }), r(1, 3, 1), r(2, 9, 6), row({ title: "D", index: 3, where: "unsent", letters: [L("x")] }), r(4, 6, 1)];
    expect(pendiumOrder(rows).map((x) => x.key)).toEqual(["k2", "k4", "k1", "k3", "k0"]);
  });
  it("the Comp-pendium's note: letters with comps only, summed; null when none mentioned comps", () => {
    const rate = (id: string) => ({ L1: { asked: 6, sent: 9, pct: 67 }, L2: { asked: 1, sent: 5, pct: 20 }, L3: { asked: 3, sent: 4, pct: 75 } } as Record<string, { asked: number; sent: number; pct: number }>)[id];
    expect(pendiumNote([{ id: "L1", compIds: ["a"] }, { id: "L2", compIds: [] }, { id: "L3" }], rate, 24)).toEqual({ lq: 9, lm: 6, tot: 24 });
    expect(pendiumNote([{ id: "L2", compIds: [] }], rate, 5)).toBeNull();
  });
});

describe("CP30 L1 (unit) · the rates the page reads", () => {
  it("letterRate is asked ÷ queries for that letter", () => {
    const m = { letterOfQuery: new Map([["q1", "L"], ["q2", "L"], ["q3", "L"], ["q4", "M"]]), asked: new Set(["q1", "q4"]) };
    expect(letterRate(m, "L")).toEqual({ asked: 1, sent: 3, pct: 33 });
    expect(letterRate(m, "Z")).toEqual({ asked: 0, sent: 0, pct: null });
  });
  it("your average IS Analytics' request rate on all time", () => {
    const st = [QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.OFFER, QueryStatus.NO_RESPONSE];
    const queries = Array.from({ length: 24 }, (_, i) => ({ id: `q${i}`, manuscriptId: "m", agentId: `a${i}`, packageId: "", status: st[i % st.length], dateSent: `2026-0${1 + (i % 8)}-10` } as Query));
    const avg = averageAsked({ id: "m" }, queries);
    const facts = analyticsModel({ queries, activities: [], agents: [], range: "all", nowMs: Date.UTC(2026, 9, 1) }).facts;
    expect(`${avg.pct}%`).toBe(facts.requestRate.value);
    expect(avg.sent).toBe(24);
  });
});

describe("CX28 E3 (unit) · the picker's record and tip", () => {
  it("a sent comp shows its rate; an unsent old one its age; else not sent yet", () => {
    expect(pickRecord(row({ title: "A", index: 0, queries: qs(14), askedForMore: 7 }), NOW)).toEqual({ kind: "rate", pct: 50, queries: 14 });
    expect(pickRecord(row({ title: "K", index: 1, comp: { title: "K", year: 2019 } }), NOW)).toEqual({ kind: "old", age: 7 });
    expect(pickRecord(row({ title: "B", index: 2, comp: { title: "B", year: 2024 } }), NOW)).toEqual({ kind: "unsent" });
  });
  it("four ticked, one seven years old: both sentences", () => {
    const t = pickTip([{ title: "A", year: 2021 }, { title: "B", year: 2023 }, { title: "Kestrel Hour", year: 2019 }, { title: "D", year: 2023 }], NOW);
    expect(t.map((p) => p.strong + p.rest)).toEqual([
      "4 comps is more than most letters name. Two or three usually reads cleaner.",
      "Kestrel Hour is more than five years old. Agents tend to prefer recent comps.",
    ]);
    expect(pickTip([{ title: "A", year: 2024 }, { title: "B", year: 2023 }], NOW)).toEqual([]);
  });
});

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
  NO_FILTER, ageChip, filterShelf, highlightOf, leadLine, letterCards, noticeOf, pickRecord, pickTip, statOf,
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

describe("CX28 N1 (unit) · the notice", () => {
  it("one letter, then several, then none", () => {
    expect(noticeOf([{ letterId: "L1", name: "Hook-first", queries: 5 }])).toMatchObject({ lead: "Hook-first", button: "Log it now", letterId: "L1" });
    const two = noticeOf([{ letterId: "L1", name: "A", queries: 5 }, { letterId: "L2", name: "B", queries: 1 }])!;
    expect(two.lead + two.rest).toBe("2 letters went out with 6 queries before their comps were logged. Log what they named and those queries count too.");
    expect(two.button).toBe("Log them now");
    expect(noticeOf([])).toBeNull();
  });
});

describe("CP30 H3 · the lead sentence's three shapes", () => {
  const line = (n: number, sent: number) => { const l = leadLine(n, sent); return `${l.before}X${l.after}`; };
  it("some sent, some waiting; words up to ten, sentence-cased", () => {
    expect(line(7, 2)).toBe("Seven comps on file for X. Two have gone out with your queries, and five are waiting to be used.");
    expect(line(12, 11)).toBe("12 comps on file for X. 11 have gone out with your queries, and one is waiting to be used.");
  });
  it("singulars, and the 'and' clause dropped when nothing is waiting", () => {
    expect(line(1, 1)).toBe("One comp on file for X. One has gone out with your queries.");
    expect(line(3, 1)).toBe("Three comps on file for X. One has gone out with your queries, and two are waiting to be used.");
    expect(line(4, 4)).toBe("Four comps on file for X. Four have gone out with your queries.");
  });
  it("none sent", () => expect(line(3, 0)).toBe("Three comps on file for X. None has gone out with a query yet."));
});

describe("CP30 H2 · the header's highlight", () => {
  const r = (i: number, q: number, a: number) => row({ title: `C${i}`, index: i, where: q ? "sent" : "none", queries: qs(q), askedForMore: a });
  it("ready: the best rate among comps with five or more queries; ties go to more queries, then shelf order", () => {
    expect(highlightOf([r(0, 9, 3), r(1, 5, 4), r(2, 4, 4)])).toEqual({ kind: "ready", key: "k1", title: "C1", pct: 80, asked: 4, queries: 5 });
    expect(highlightOf([r(0, 5, 2), r(1, 10, 4)])).toMatchObject({ key: "k1" });
    expect(highlightOf([r(0, 5, 2), r(1, 5, 2)])).toMatchObject({ key: "k0" });
  });
  it("too soon: something out, nothing at five; nothing sent: nothing out", () => {
    expect(highlightOf([r(0, 3, 1), r(1, 4, 0), r(2, 0, 0)])).toEqual({ kind: "soon", busiest: 4 });
    expect(highlightOf([r(0, 0, 0)])).toEqual({ kind: "none" });
    expect(highlightOf([])).toEqual({ kind: "none" });
  });
});

describe("CP30 L1 (unit) · the letter cards", () => {
  it("sent letters by queries then name, then drafts; logged, unrecorded and draft-empty", () => {
    const letters = [
      { id: "L1", versionName: "Hook-first", createdDate: "1" },
      { id: "L2", versionName: "Coastal pitch", createdDate: "2", compIds: ["a", "b"] },
      { id: "L3", versionName: "Tide version", createdDate: "3", compIds: ["a"] },
      { id: "L4", versionName: "Blank draft", createdDate: "4", compIds: [] },
      { id: "L5", versionName: "Short and sharp", createdDate: "5", compIds: ["b"] },
    ];
    const rows = [row({ title: "A", index: 0, comp: { id: "a", title: "A", year: 2021 } }), row({ title: "B", index: 1, comp: { id: "b", title: "B" } })];
    const c = letterCards(letters, rows, new Map([["L1", 5], ["L2", 9], ["L5", 5]]), (id) => ({ asked: id === "L2" ? 6 : 0, sent: 0, pct: null }));
    expect(c.map((x) => [x.name, x.middle])).toEqual([
      ["Coastal pitch", "logged"], ["Hook-first", "unrecorded"], ["Short and sharp", "logged"], ["Blank draft", "empty"], ["Tide version", "logged"],
    ]);
    expect(c[0].comps.map((x) => [x.title, x.year])).toEqual([["A", 2021], ["B", null]]);
    expect(c[0].rate.asked).toBe(6);
    expect(c.filter((x) => x.draft).map((x) => x.id)).toEqual(["L4", "L3"]);
  });
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

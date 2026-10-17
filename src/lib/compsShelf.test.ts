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
  NO_FILTER, ageChip, filterShelf, kindsPresent, landingRows, letterBlocks, noticeOf, pickRecord, pickTip, restLine, slipOf,
  sortShelf, whereCounts,
} from "./compsShelf";

const NOW = 2026;
const row = (o: Partial<CompRow> & { title: string; index: number }): CompRow => ({
  key: `k${o.index}`, index: o.index, comp: { title: o.title, ...(o.comp ?? {}) }, kind: o.kind ?? "book", ready: o.ready ?? true,
  where: o.where ?? "none", letters: o.letters ?? [], packages: [], queries: o.queries ?? [], askedForMore: o.askedForMore ?? 0, lastSent: null,
});
const qs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `q${i}` })) as CompRow["queries"];

describe("CX28 S3 · the age chip", () => {
  const cases: [number, string, string][] = [[0, "This year", "new"], [1, "1 yr old", "new"], [3, "3 yrs old", "mid"], [5, "5 yrs old", "mid"], [6, "6 yrs old", "old"], [9, "9 yrs old", "old"]];
  for (const [age, text, tone] of cases) {
    it(`age ${age} reads "${text}" (${tone})`, () => {
      const c = ageChip(NOW - age, NOW)!;
      expect(c.text).toBe(text);
      expect(c.tone).toBe(tone);
      expect(c.title !== null).toBe(tone === "old");
    });
  }
  it("no year, no chip", () => expect(ageChip(undefined, NOW)).toBeNull());
  it("blush begins at 6, never at 5", () => { expect(ageChip(NOW - 5, NOW)!.tone).toBe("mid"); expect(ageChip(NOW - 6, NOW)!.tone).toBe("old"); });
});

describe("CX28 S2 (unit) · the slip, by state", () => {
  it("not ready wins: a book with no publisher asks for one, anything else for a year", () => {
    expect(slipOf(row({ title: "A", index: 0, ready: false, comp: { title: "A", year: 2020 }, where: "sent", queries: qs(3) }))).toEqual({ kind: "notready", text: "A letter can name it once it has a publisher.", link: "Add publisher" });
    expect(slipOf(row({ title: "B", index: 1, ready: false, kind: "film", comp: { title: "B", media: "film" } }))).toEqual({ kind: "notready", text: "A letter can name it once it has a year.", link: "Add year" });
  });
  it("sent, draft and shelf", () => {
    expect(slipOf(row({ title: "S", index: 0, where: "sent", queries: qs(4), askedForMore: 1 }))).toEqual({ kind: "sent", queries: 4, asked: 1, pct: 25 });
    expect(slipOf(row({ title: "D", index: 1, where: "unsent", letters: [{ id: "L", name: "Query letter v3", short: "QL v3", sent: false, packages: [] }] }))).toEqual({ kind: "draft", letter: "QL v3" });
    expect(slipOf(row({ title: "N", index: 2 }))).toEqual({ kind: "shelf" });
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
  it("where AND type AND find", () => {
    expect(filterShelf(rows, { where: "shelf", kind: "tv", find: "" }).map((r) => r.comp.title)).toEqual(["C"]);
    expect(filterShelf(rows, { ...NO_FILTER, find: "bbc" }).map((r) => r.comp.title)).toEqual(["C"]);
    expect(filterShelf(rows, { where: "sent", kind: "tv", find: "" })).toEqual([]);
  });
  it("the where counts sum to the comp count", () => { const c = whereCounts(rows); expect(c.sent + c.draft + c.shelf).toBe(rows.length); expect(c).toEqual({ sent: 1, draft: 1, shelf: 2 }); });
  it("type toggles appear only with two or more types", () => { expect(kindsPresent(rows)).toEqual(["book", "tv"]); expect(kindsPresent(rows.slice(0, 1))).toEqual(["book"]); });
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

describe("CX28 D1/D2 (unit) · what's landing", () => {
  it("by comp: sent comps only, most queries first, hollow under five", () => {
    const rows = [row({ title: "A", index: 0, where: "sent", queries: qs(3), askedForMore: 1 }), row({ title: "B", index: 1, where: "sent", queries: qs(9), askedForMore: 6 }), row({ title: "C", index: 2 })];
    expect(landingRows(rows).map((r) => [r.title, r.queries, r.pct, r.light])).toEqual([["B", 9, 67, false], ["A", 3, 33, true]]);
    expect(restLine(rows)).toEqual({ lead: "1 comp hasn’t", rest: " gone out yet: C." });
  });
  it("by letter: sent recorded, then sent unrecorded, then unsent", () => {
    const letters = [
      { id: "L1", versionName: "v1", createdDate: "1" }, { id: "L2", versionName: "v2", createdDate: "2", compIds: ["a"] },
      { id: "L3", versionName: "v3", createdDate: "3", compIds: [] }, { id: "L4", versionName: "v4", createdDate: "4", compIds: ["a"] },
    ];
    const b = letterBlocks(letters, [{ id: "a", title: "A" }], new Map([["L1", 5], ["L4", 2]]), "L3", () => ({ asked: 0, sent: 0, pct: null }));
    expect(b.map((x) => [x.id, x.group])).toEqual([["L4", "sent"], ["L1", "unrecorded"], ["L2", "unsent"], ["L3", "unsent"]]);
    expect(b.find((x) => x.id === "L3")!.current).toBe(true);
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

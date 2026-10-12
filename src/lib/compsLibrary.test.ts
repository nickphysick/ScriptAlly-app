/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25: the library list's pure logic — the three-click sort, the one filter, the
 * grouping and each row's next move.
 */
import { describe, expect, it } from "vitest";
import {
  COLUMNS, CompRow, FILTERS, ariaSort, filterCounts, glance, groupRows, kindOf, letterShort, libraryTag, nextMove, nextSort, passes, sortRows, visibleRows,
} from "./compsLibrary";

const row = (index: number, title: string, o: Partial<CompRow> = {}): CompRow => ({
  key: `k${index}`, index, comp: { title, year: 2020, publisher: "P" }, kind: "book", ready: true, where: "none", letters: [], packages: [], queries: [], askedForMore: 0, lastSent: null, ...o,
});
const q = (id: string) => ({ id, agentName: "A", agency: "B", initials: "AB", status: "Queried", dateSent: "2026-09-30T12:00:00.000Z", letterId: "L2", packageName: null, asked: false });
const L2 = { id: "L2", name: "Query letter v2", short: "QL v2", sent: true, packages: ["Light"] };
const L3 = { id: "L3", name: "Query letter v3", short: "QL v3", sent: false, packages: [] };
/* deliberately NOT in any order under test */
const rows: CompRow[] = [
  row(0, "The Tidewater Line", { where: "sent", letters: [L2, L3], queries: [q("a"), q("b"), q("c")], askedForMore: 2, lastSent: "2026-09-30T12:00:00.000Z" }),
  row(1, "Salt Road", { where: "sent", letters: [L2], queries: [q("a"), q("b"), q("c")] }),
  row(2, "Nine Miles Out", { kind: "tv" }),
  row(3, "Bright Water"),
  row(4, "The Ferry at Dusk", { ready: false, comp: { title: "The Ferry at Dusk", year: 2025 } }),
  row(5, "Last Crossing", { kind: "film", where: "unsent", letters: [L3] }),
];
const titles = (r: readonly CompRow[]) => r.map((x) => x.comp.title);

describe("the sort is a column heading, three clicks", () => {
  it("first click sorts, the second reverses, the third returns to the writer's own order", () => {
    const one = nextSort(null, "seen");
    expect(one).toEqual({ key: "seen", dir: -1 });
    const two = nextSort(one, "seen");
    expect(two).toEqual({ key: "seen", dir: 1 });
    expect(nextSort(two, "seen")).toBeNull();
    /* Comp sorts A–Z first; another heading starts its own cycle */
    expect(nextSort(null, "title")).toEqual({ key: "title", dir: 1 });
    expect(nextSort(one, "title")).toEqual({ key: "title", dir: 1 });
  });
  it("Seen by: highest first, then lowest first; ties keep the writer's order", () => {
    expect(titles(sortRows(rows, { key: "seen", dir: -1 })).slice(0, 2)).toEqual(["The Tidewater Line", "Salt Road"]);
    expect(titles(sortRows(rows, { key: "seen", dir: 1 })).slice(-2)).toEqual(["The Tidewater Line", "Salt Road"]);
    expect(titles(sortRows(rows, { key: "seen", dir: 1 })).slice(0, 4)).toEqual(["Nine Miles Out", "Bright Water", "The Ferry at Dusk", "Last Crossing"]);
  });
  it("Comp: A–Z ignoring a leading The", () => {
    expect(titles(sortRows(rows, { key: "title", dir: 1 }))).toEqual(["Bright Water", "The Ferry at Dusk", "Last Crossing", "Nine Miles Out", "Salt Road", "The Tidewater Line"]);
  });
  it("no sort is the stored order, whatever order the rows arrive in", () => {
    expect(titles(sortRows([...rows].reverse(), null))).toEqual(titles(rows));
  });
  it("aria-sort follows", () => {
    expect(COLUMNS.map((c) => ariaSort({ key: "seen", dir: -1 }, c.key))).toEqual(["none", "none", "descending", "none"]);
    expect(ariaSort({ key: "title", dir: 1 }, "title")).toBe("ascending");
    expect(ariaSort(null, "title")).toBe("none");
  });
});

describe("one filter at a time, and the search", () => {
  it("each filter's count is the rows it passes", () => {
    expect(filterCounts(rows)).toEqual({ sent: 2, unsent: 1, none: 3, book: 4, screen: 2 });
    for (const f of FILTERS) expect(visibleRows(rows, f.key, "").every((r) => passes(r, f.key))).toBe(true);
  });
  it("the search reads the title and the author", () => {
    expect(titles(visibleRows(rows, null, "salt"))).toEqual(["Salt Road"]);
    expect(titles(visibleRows(rows, "none", "water"))).toEqual(["Bright Water"]);
    expect(visibleRows(rows, null, "  ").length).toBe(rows.length);
  });
});

describe("the grouping", () => {
  const letters = [{ id: "L1", versionName: "Query letter v1", createdDate: "1" }, { id: "L2", versionName: "Query letter v2", createdDate: "2", compIds: ["x"] }, { id: "L3", versionName: "Query letter v3", createdDate: "3", compIds: ["y"] }];
  const sent = new Map([["L1", 5], ["L2", 9]]);
  it("none draws no bands", () => { expect(groupRows(rows, "none", letters, sent)).toBeNull(); });
  it("Where it's used and Book or screen partition the list", () => {
    const where = groupRows(rows, "where", letters, sent)!;
    expect(where.map((b) => [b.name, b.tone, b.rows.length])).toEqual([["Sent to agents", "powder", 2], ["In an unsent letter", "blush", 1], ["Not in a letter yet", "grey", 3]]);
    expect(where.reduce((s, b) => s + b.rows.length, 0)).toBe(rows.length);
    const media = groupRows(rows, "media", letters, sent)!;
    expect(media.map((b) => [b.name, b.rows.length])).toEqual([["Books", 4], ["Film and TV", 2]]);
  });
  it("Query letter: a band per RECORDED letter, then Not in a letter; a comp two letters name is in both", () => {
    const g = groupRows(rows, "letter", letters, sent)!;
    expect(g.map((b) => [b.name, b.hint, b.rows.length])).toEqual([
      ["Query letter v2", "sent with 9 queries", 2], ["Query letter v3", "not sent yet", 2], ["Not in a letter", "on your shelf only", 3],
    ]);
    expect(new Set(g.flatMap((b) => b.rows.map((r) => r.key))).size).toBe(rows.length);
    expect(g.reduce((s, b) => s + b.rows.length, 0)).toBe(rows.length + 1);
  });
  it("an empty band is dropped, and sorting works inside a group", () => {
    expect(groupRows(rows.filter((r) => r.where === "none"), "where", letters, sent)!.map((b) => b.key)).toEqual(["none"]);
    const sorted = sortRows(rows, { key: "title", dir: 1 });
    expect(titles(groupRows(sorted, "where", letters, sent)![2].rows)).toEqual(["Bright Water", "The Ferry at Dusk", "Nine Miles Out"]);
  });
});

describe("the next move", () => {
  it("one of four states, each with its tray", () => {
    expect(nextMove(rows[4])).toEqual({ text: "Add a publisher", mono: "NEEDED BEFORE A LETTER", hot: true, tray: "Add publisher", act: "edit" });
    expect(nextMove(rows[0])).toEqual({ text: "In 3 queries", mono: "LAST SENT 30 SEP", hot: false, tray: "See the queries", act: "open" });
    expect(nextMove(rows[5])).toEqual({ text: "Waiting to go out", mono: "IN QL V3 · NOT SENT", hot: false, tray: "Open QL v3", act: "pick", letterId: "L3" });
    expect(nextMove(rows[3])).toEqual({ text: "Log in a letter", mono: "ON YOUR SHELF ONLY", hot: false, tray: "Log in a letter", act: "pick-for" });
  });
  it("a screen comp with no year needs a year, never a publisher", () => {
    const film = row(9, "F", { kind: "film", ready: false, comp: { title: "F", media: "film" } });
    expect(nextMove(film).text).toBe("Add a year");
    expect(nextMove(row(8, "One", { where: "sent", queries: [q("a")] })).text).toBe("In 1 query");
  });
});

describe("the tag, the glance and the small things", () => {
  it("the heading's tag says the order and the grouping", () => {
    expect(libraryTag(7, null, "none")).toBe("7 titles · in your own order");
    expect(libraryTag(1, { key: "seen", dir: -1 }, "letter")).toBe("1 title · sorted by agents who saw it · grouped by query letter");
  });
  it("the glance: the top three by queries, and the comps in no letter", () => {
    const g = glance(rows, { sent: 14, logged: 9, rate: 64, bars: [] });
    expect([g.total, g.books, g.screen]).toEqual([6, 4, 2]);
    expect(g.top).toEqual([{ title: "The Tidewater Line", n: 3 }, { title: "Salt Road", n: 3 }, { title: "Nine Miles Out", n: 0 }]);
    expect([g.notInLetter.length, g.needFirst]).toEqual([3, 1]);
  });
  it("a kind is an icon's name, and a letter's short name", () => {
    expect([kindOf({}), kindOf({ media: "tv" }), kindOf({ media: "film" }), kindOf({ media: "other" })]).toEqual(["book", "tv", "film", "film"]);
    expect([letterShort("Query letter v2"), letterShort("Agent-specific opener")]).toEqual(["QL v2", "Agent-specific opener"]);
  });
});

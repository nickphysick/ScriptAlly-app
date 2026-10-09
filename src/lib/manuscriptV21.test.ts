/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v21 — the derivations' unit locks (the rendered halves are tests/e2e/manuscriptsV21.measure.ts).
 */
import { describe, it, expect } from "vitest";
import { ManuscriptStatus, QueryStatus } from "../types";
import type { BookVersion, Query } from "../types";
import type { ActivityRow, VersionTile } from "./manuscriptShelf";
import { owedRequests } from "./manuscriptSummary";
import {
  STATUS_ORDER, STATUS_WORDS, bookFacts, deckPose, longDay, materialDoors, rowDoor, shortSay, v21Activity,
  versionCards, versionsLede, yourMoveLine, V21_ACTIVITY_MAX,
} from "./manuscriptV21";

const NOW = new Date(2026, 9, 9, 12);
const row = (id: string, day: number, qid: string | null, status?: QueryStatus, who = "Edda Voss"): ActivityRow => ({
  id, at: new Date(2026, 8, day, 12).getTime(), date: `${day} Sep`,
  glyph: status ? { kind: "status", status } : { kind: "ms" },
  say: status ? [{ t: who, who: true }, { t: " did a long thing about " }, { t: "The Book", em: true }] : [{ t: "You updated a manuscript's details" }],
  sub: status ? "Fast-paced opening · Autumn round" : null, queryId: qid, manuscriptId: "m1",
});
const q = (id: string, status: QueryStatus, extra: Partial<Query> = {}): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId: `a-${id}`, status, dateSent: "2026-08-01T12:00:00.000Z", ...extra } as Query);

describe("the book card's facts", () => {
  const ms = { status: ManuscriptStatus.QUERYING, genre: "Thriller", ageCategory: "Adult", wordCount: 50000 };
  const cur: BookVersion = { id: "b3", name: "Fast-paced opening", kind: "revision", createdDate: "2026-09-02" };

  it("nine facts in the oracle's order, the author the account's name", () => {
    const f = bookFacts({ ms, authorName: "Isla Morven", since: "2026-03-03T12:00:00.000Z", current: cur });
    expect(f.map((x) => x.label)).toEqual(["Status", "Genre", "Age category", "Word count", "Setting", "Series", "Author name", "Querying since", "Current version"]);
    const by = Object.fromEntries(f.map((x) => [x.key, x]));
    expect(by.author.value).toBe("Isla Morven");
    expect(by.words.value).toBe("50,000");
    expect(by.since.value).toBe("3 March 2026");
    expect(by.version.value).toBe("Fast-paced opening");
    expect(by.status.querying).toBe(true);
  });

  it("an unset fact says so, muted — never a blank, a dash or a zero", () => {
    const by = Object.fromEntries(bookFacts({ ms: { ...ms, wordCount: 0 }, authorName: "", since: null, current: null }).map((x) => [x.key, x]));
    expect([by.setting.value, by.setting.muted]).toEqual(["Not set", true]);
    expect([by.series.value, by.series.muted]).toEqual(["Standalone", true]);
    expect([by.since.value, by.since.muted]).toEqual(["Not yet", true]);
    expect(by.words.value).toBe("Not set");
    expect(by.version.muted).toBe(true);
  });

  it("a shelved flag reads Shelved whatever the status says; the six statuses each have words", () => {
    expect(bookFacts({ ms: { ...ms, shelved: true }, authorName: "x", since: null, current: null })[0].value).toBe("Shelved");
    expect(STATUS_ORDER.length).toBe(Object.values(ManuscriptStatus).length);
    for (const s of Object.values(ManuscriptStatus)) expect(STATUS_WORDS[s], s).toBeTruthy();
  });

  it("a date is read from its date part, never shifted by a time zone", () => {
    expect(longDay("2026-03-01")).toBe("1 March 2026");
    expect(longDay(null)).toBeNull();
  });
});

describe("recent activity", () => {
  const owedQs = [
    q("q3", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: "2026-09-28T12:00:00.000Z", materialsRequestedType: "pages", materialsRequestedQuantity: 50, expectedSendDate: "2026-10-12T12:00:00.000Z" }),
    q("q4", QueryStatus.FULL_REQUESTED, { fullRequestedDate: "2026-09-19T12:00:00.000Z" }),
  ];
  const owed = owedRequests(owedQs);
  const name = (id: string) => `Agent ${id}`;

  it("the your-move line states what to send, and by when only where a date was set", () => {
    expect(yourMoveLine(owed.find((o) => o.query.id === "q3")!)).toBe("Send the first 50 pages by 12 Oct");
    expect(yourMoveLine(owed.find((o) => o.query.id === "q4")!)).toBe("Send the full manuscript");
  });

  it("five at most, newest first, and an owed request marks its own request row", () => {
    const rows = [
      row("r1", 28, "q3", QueryStatus.PARTIAL_REQUESTED), row("r2", 19, "q4", QueryStatus.FULL_REQUESTED),
      row("r3", 12, "q6", QueryStatus.REJECTED), row("r4", 10, "q6", QueryStatus.QUERIED), row("r5", 3, "q5", QueryStatus.FULL_SENT),
      row("r6", 2, null), row("r7", 1, "q4", QueryStatus.QUERIED),
    ];
    const out = v21Activity({ rows, owed, agentName: name, now: NOW });
    expect(out.length).toBe(V21_ACTIVITY_MAX);
    expect(out.map((r) => r.at)).toEqual([...out.map((r) => r.at)].sort((a, b) => b - a));
    expect(out.filter((r) => r.yourMove).map((r) => r.queryId)).toEqual(["q3", "q4"]);
    expect(out[0].sub).toBe("Send the first 50 pages by 12 Oct");
    /* the QUERIED row of an owed query is not the request: it keeps its own sub-line */
    expect(rows.find((r) => r.id === "r7")!.sub).toBe("Fast-paced opening · Autumn round");
  });

  it("an owed request is never pushed out by five newer events", () => {
    const newer = [1, 2, 3, 4, 5, 6].map((d) => row(`n${d}`, 20 + d, "q9", QueryStatus.QUERIED));
    const old = new Date(2026, 5, 1, 12).getTime();
    const out = v21Activity({ rows: [...newer, { ...row("old", 1, "q4", QueryStatus.FULL_REQUESTED), at: old }], owed, agentName: name, now: NOW });
    expect(out.length).toBe(5);
    expect(out.some((r) => r.queryId === "q4" && r.yourMove), "the owed request's own row is kept").toBe(true);
  });

  it("an owed request with no record gets a row from the request's own date, and none where it has no date", () => {
    const out = v21Activity({ rows: [], owed, agentName: name, now: NOW });
    expect(out.map((r) => [r.queryId, r.yourMove])).toEqual([["q3", true], ["q4", true]]);
    expect(out[0].say.map((s) => s.t).join("")).toBe("Agent a-q3 requested a partial");
    const undated = owedRequests([q("q7", QueryStatus.FULL_REQUESTED)]);
    expect(v21Activity({ rows: [], owed: undated, agentName: name, now: NOW })).toEqual([]);
  });

  it("the sentence is the short form where the status has one, and the feed's own where it has none", () => {
    expect(shortSay(row("a", 1, "q", QueryStatus.REJECTED)).map((s) => s.t).join("")).toBe("Edda Voss passed");
    expect(shortSay(row("a", 1, "q", QueryStatus.FULL_SENT)).map((s) => s.t).join("")).toBe("You sent the full to Edda Voss");
    expect(shortSay(row("a", 1, null)).map((s) => s.t).join("")).toBe("You updated a manuscript's details");
    expect(shortSay(row("a", 1, "q", QueryStatus.WITHDRAWN)).map((s) => s.t).join("")).toContain("did a long thing");
  });

  it("a your-move row opens the sent journey; any other query row opens the edit journey; a row with no query opens nothing", () => {
    expect(rowDoor({ yourMove: true, queryId: "q3" })).toEqual({ mode: "sent", queryId: "q3" });
    expect(rowDoor({ yourMove: false, queryId: "q6" })).toEqual({ mode: "edit", queryId: "q6" });
    expect(rowDoor({ yourMove: false, queryId: null })).toBeNull();
  });
});

describe("versions", () => {
  const tile = (id: string, current: boolean, n: [number, number, number, number], pk: number, wordCount?: number): VersionTile => ({
    v: { id, name: `Version ${id}`, kind: "revision", createdDate: "2026-09-02", ...(wordCount ? { wordCount } : {}) },
    current, queried: n[0], requested: n[1], sent: n[2], closed: n[3], packages: pk,
  });

  it("a version's words show only where it carries a count — never '0 words'", () => {
    const cards = versionCards([tile("c", true, [2, 2, 0, 0], 2, 50000), tile("b", false, [0, 0, 1, 1], 1), tile("a", false, [0, 0, 0, 0], 0, 0)]);
    expect(cards.map((c) => c.words)).toEqual(["50,000 words", null, null]);
    expect(cards.map((c) => c.total)).toEqual([4, 2, 0]);
  });

  it("the lede counts the current version's queries and requests, in the singular where there is one, and drops the clause at none", () => {
    const say = (cards: ReturnType<typeof versionCards>) => versionsLede(cards, "The Book").map((s) => s.t).join("");
    expect(say(versionCards([tile("c", true, [2, 2, 0, 0], 2), tile("b", false, [0, 0, 0, 0], 0)])))
      .toBe("You've saved 2 versions of The Book. Version c is the one going out now, with 4 queries and 2 requests so far.");
    expect(say(versionCards([tile("c", true, [0, 1, 0, 0], 1)])))
      .toBe("You've saved 1 version of The Book. Version c is the one going out now, with 1 query and 1 request so far.");
    expect(say(versionCards([tile("c", true, [0, 0, 0, 0], 0)])))
      .toBe("You've saved 1 version of The Book. Version c is the one going out now.");
  });

  it("the deck: one card in front, three behind stepping right and up, the rest and the passed ones not drawn", () => {
    expect(deckPose(0, 0, 48)).toMatchObject({ x: 0, y: 0, scale: 1, opacity: 1, hidden: false });
    const behind = [1, 2, 3].map((i) => deckPose(i, 0, 48));
    expect(behind.map((p) => p.x)).toEqual([48, 96, 144]);
    expect(behind.map((p) => p.y)).toEqual([-14, -28, -42]);
    expect(behind.map((p) => Number(p.scale.toFixed(2)))).toEqual([0.94, 0.88, 0.82]);
    expect(behind.map((p) => Number(p.opacity.toFixed(2)))).toEqual([0.82, 0.64, 0.46]);
    expect(deckPose(4, 0, 48).hidden).toBe(true);
    expect(deckPose(0, 1, 48)).toMatchObject({ hidden: true, opacity: 0 });
    expect(deckPose(1, 0, 36).x).toBe(36);
    const z = [0, 1, 2, 3].map((i) => deckPose(i, 0, 48).z);
    expect(z).toEqual([...z].sort((a, b) => b - a));
  });
});

describe("your materials", () => {
  const base = { comps: [{ inQuery: true }, { inQuery: true }, { inQuery: false }], letters: 3, synopses: 2, letterName: "Query letter v3", livePackages: 3, packageQueries: 6 };

  it("three doors, each with one number and one sentence", () => {
    const d = materialDoors(base);
    expect(d.map((x) => [x.name, x.n, x.unit])).toEqual([["Comparable titles", 3, "comps"], ["Letters & synopses", 5, "saved"], ["Submission packages", 3, "in use"]]);
    expect(d.map((x) => x.sentence)).toEqual([
      "Books and films like yours. 2 are in your query letter.",
      "3 query letters and 2 synopses. You're using Query letter v3.",
      "The letter, synopsis and pages you send together. 6 queries sent so far.",
    ]);
  });

  it("singular where the count is one; 'None yet.' at none; no 'using' sentence when no letter is in use", () => {
    const d = materialDoors({ comps: [{ inQuery: true }], letters: 1, synopses: 1, letterName: null, livePackages: 1, packageQueries: 1 });
    expect([d[0].unit, d[0].sentence]).toEqual(["comp", "Books and films like yours. 1 is in your query letter."]);
    expect(d[1].sentence).toBe("1 query letter and 1 synopsis.");
    expect(d[2].sentence).toBe("The letter, synopsis and pages you send together. 1 query sent so far.");
    const none = materialDoors({ comps: [], letters: 0, synopses: 0, letterName: null, livePackages: 0, packageQueries: 0 });
    expect(none.map((x) => x.n)).toEqual([0, 0, 0]);
    expect(none.map((x) => x.sentence)).toEqual([
      "Books and films like yours. None yet.", "Query letters and synopses. None yet.",
      "The letter, synopsis and pages you send together. None yet.",
    ]);
    expect(materialDoors({ ...base, comps: [{ inQuery: false }] })[0].sentence).toBe("Books and films like yours. None are in your query letter yet.");
  });
});

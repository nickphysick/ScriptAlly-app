/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shelf's derivations (v13). Inputs are built in an order that is none of the orders under test,
 * so no ordering claim can pass because the fixture happened to arrive sorted.
 */
import { describe, it, expect } from "vitest";
import { ActivityType, ComponentType, QueryStatus } from "../types";
import type { Activity, Agent, BookVersion, CompTitle, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import {
  ACTIVITY_ROWS_MAX, COMP_ROWS_MAX, compRows, manuscriptActivity, materialChips, materialsFact,
  packageRows, packagesFact, savedOn, versionTiles,
} from "./manuscriptShelf";
import { sayText } from "./dashFeed";

const comp = (title: string, over: Partial<CompTitle> = {}): CompTitle => ({ title, ...over });

describe("compRows", () => {
  it("in the letter first, then the newest by year; undated after dated; list order breaks ties", () => {
    const rows = compRows([
      comp("Aster", { year: 2015, inQuery: false }),
      comp("Birch", { year: 2019, inQuery: true }),
      comp("Cedar", { inQuery: true }),
      comp("Damson", { year: 2023, inQuery: false }),
      comp("Elder", { year: 2021, inQuery: true }),
    ]);
    expect(rows.length).toBe(COMP_ROWS_MAX);
    expect(rows.map((r) => r.comp.title)).toEqual(["Elder", "Birch", "Cedar"]);
    /* below the cap the order is the same rule, so a fourth comp never reshuffles the three shown */
    expect(compRows([comp("Aster", { year: 2015 }), comp("Birch", { year: 2019, inQuery: true })]).map((r) => r.comp.title))
      .toEqual(["Birch", "Aster"]);
    expect(compRows([comp("Ash"), comp("Bay")]).map((r) => r.comp.title), "later in the list is newer").toEqual(["Bay", "Ash"]);
  });

  it("a book states author · publisher · year; anything else states its medium · year", () => {
    const [book] = compRows([comp("The Tidewater Line", { author: "R. Okafor", publisher: "Harvill", year: 2021 })]);
    expect(book.meta).toBe("R. Okafor · Harvill · 2021");
    expect(book.initial).toBe("T");
    const [film] = compRows([comp("Kestrel Hour", { media: "film", year: 2019, author: "ignored" })]);
    expect(film.meta).toBe("Film · 2019");
    const [bare] = compRows([comp("Salt Road")]);
    expect(bare.meta, "absent pieces drop their clause rather than rendering a hole").toBe("");
    expect(bare.inLetter, "absent inQuery is false").toBe(false);
  });
});

const mat = (id: string, type: ComponentType, createdDate: string, over: Partial<ManuscriptVersion> = {}): ManuscriptVersion => ({
  id, manuscriptId: "m", userId: "u", componentType: type, versionName: id, fileAttached: false, createdDate, ...over,
});
const pkg = (id: string, over: Partial<SubmissionPackage> = {}): SubmissionPackage => ({
  id, manuscriptId: "m", userId: "u", packageName: id, queryLetterVersionId: "", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active" as SubmissionPackage["status"], createdDate: "2026-01-01T00:00:00Z", ...over,
});

describe("materialChips", () => {
  const letters = [
    mat("let-1", ComponentType.QUERY_LETTER, "2026-03-01", { wordCount: 402 }),
    mat("let-3", ComponentType.QUERY_LETTER, "2026-09-01", { wordCount: 310 }),
    mat("let-2", ComponentType.QUERY_LETTER, "2026-08-29", { wordCount: 355 }),
  ];
  const synopses = [mat("syn-3", ComponentType.SYNOPSIS, "2026-06-14"), mat("syn-1", ComponentType.SYNOPSIS, "2026-08-20", { wordCount: 480 })];
  const packages = [
    pkg("p1", { queryLetterVersionId: "let-3", synopsisVersionId: "syn-1" }),
    pkg("p3", { queryLetterVersionId: "let-3", synopsisVersionId: "syn-1" }),
    pkg("p2", { queryLetterVersionId: "let-2", synopsisVersionId: "syn-3" }),
  ];

  it("the letter in use leads, then the newest across both kinds, three at most", () => {
    const chips = materialChips(letters, synopses, "let-1", packages);
    expect(chips.map((c) => c.id)).toEqual(["let-1", "let-3", "let-2"]);
    expect(chips.map((c) => c.lead)).toEqual([true, false, false]);
  });

  it("each states its words and the live packages holding it in its own slot", () => {
    const chips = materialChips(letters, synopses, "let-3", packages);
    expect(chips.map((c) => [c.id, c.meta])).toEqual([
      ["let-3", "310 words · in 2 packages"],
      ["let-2", "355 words · in 1 package"],
      ["syn-1", "480 words · in 2 packages"],
    ]);
    expect(materialChips([], [synopses[0]], null, []).map((c) => c.meta), "no words recorded, no packages").toEqual(["no packages"]);
  });

  it("no letter in use leaves nothing ringed", () => {
    expect(materialChips(letters, synopses, null, packages).some((c) => c.lead)).toBe(false);
  });

  it("the fact agrees in number", () => {
    expect(materialsFact(1, 1)).toEqual({ letters: { n: 1, word: "query letter" }, synopses: { n: 1, word: "synopsis" } });
    expect(materialsFact(3, 0).synopses.word).toBe("synopses");
  });
});

const q = (id: string, over: Partial<Query> = {}): Query => ({
  id, userId: "u", manuscriptId: "m", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
  dateSent: "2026-08-01T12:00:00Z", personalisationNotes: "", ...over,
} as Query);

describe("packageRows + packagesFact", () => {
  const packages = [pkg("winter", { createdDate: "2026-09-20T00:00:00Z" }), pkg("mswl"), pkg("autumn"), pkg("spring", { createdDate: "2026-02-01T00:00:00Z" })];
  const queries = [
    q("a", { packageId: "autumn", dateSent: "2026-08-05T12:00:00Z" }),
    q("b", { packageId: "mswl", dateSent: "2026-07-02T12:00:00Z" }),
    q("c", { packageId: "mswl", dateSent: "2026-07-01T12:00:00Z" }),
    q("d", { packageId: "spring", dateSent: "2026-03-01T12:00:00Z" }),
    q("e", { packageId: "" }),
  ];

  it("the active package first, then sent by most recent send, then unsent; three at most", () => {
    const rows = packageRows(packages, queries, "autumn");
    expect(rows.map((r) => [r.pkg.id, r.active, r.sent])).toEqual([["autumn", true, 1], ["mswl", false, 2], ["spring", false, 1]]);
    const noActive = packageRows([pkg("winter", { createdDate: "2026-09-20T00:00:00Z" }), pkg("mswl")], queries, null);
    expect(noActive.map((r) => r.pkg.id), "an unsent package follows the sent ones").toEqual(["mswl", "winter"]);
  });

  it("an active id that names no live package marks nothing — never a fallback", () => {
    expect(packageRows(packages, queries, "gone").some((r) => r.active)).toBe(false);
  });

  it("queries sent across the packages they rode, live packages only", () => {
    expect(packagesFact(packages, queries)).toEqual({ queries: 4, packages: 3 });
    expect(packagesFact([pkg("winter")], queries)).toEqual({ queries: 0, packages: 0 });
  });
});

describe("versionTiles", () => {
  const bv = (id: string, createdDate: string): BookVersion => ({ id, name: id, kind: "revision", createdDate });
  const versions = [bv("v1", "2026-03-03"), bv("v3", "2026-09-02"), bv("v2", "2026-06-14"), bv("v3b", "2026-09-02")];
  const packages = [pkg("p1", { bookVersionId: "v3" }), pkg("p2", { bookVersionId: "v2" }), pkg("p3", { bookVersionId: "v3" })];
  const queries = [
    q("1", { packageId: "p1" }), q("2", { packageId: "p1" }),
    q("3", { packageId: "p1", status: QueryStatus.PARTIAL_REQUESTED }), q("4", { packageId: "p1", status: QueryStatus.FULL_REQUESTED }),
    q("5", { packageId: "p2", status: QueryStatus.FULL_SENT }), q("6", { packageId: "p2", status: QueryStatus.REJECTED }),
    q("7", { packageId: "" }),
  ];

  it("newest first, a same-day tie broken by list order (later is newer)", () => {
    expect(versionTiles(versions, "v3b", packages, queries).map((t) => t.v.id)).toEqual(["v3b", "v3", "v2", "v1"]);
  });

  it("queried · requested · sent and the package count come from versionUsage, through the package edge only", () => {
    const tiles = Object.fromEntries(versionTiles(versions, "v3", packages, queries).map((t) => [t.v.id, t]));
    expect([tiles.v3.queried, tiles.v3.requested, tiles.v3.sent, tiles.v3.packages]).toEqual([2, 2, 0, 2]);
    expect([tiles.v2.queried, tiles.v2.requested, tiles.v2.sent, tiles.v2.closed, tiles.v2.packages]).toEqual([0, 0, 1, 1, 1]);
    expect([tiles.v1.queried, tiles.v1.requested, tiles.v1.sent, tiles.v1.packages], "the packageless query reaches no version").toEqual([0, 0, 0, 0]);
    expect(Object.values(tiles).filter((t) => t.current).map((t) => t.v.id)).toEqual(["v3"]);
  });

  it("a saved date is read off the string, never through Date (UTC would show the previous day)", () => {
    expect(savedOn("2026-09-02")).toBe("2 Sep 2026");
    expect(savedOn("nonsense")).toBe("");
  });
});

describe("manuscriptActivity", () => {
  const agents = [
    { id: "a1", name: "Edda Voss", agency: "Voss Literary" },
    { id: "a2", name: "Rosa Quintana", agency: "Quintana Books" },
  ] as Agent[];
  const book = [{ id: "bv-2", name: "Dual timeline edit", kind: "revision", createdDate: "2026-06-14" }, { id: "bv-3", name: "Fast-paced opening", kind: "revision", createdDate: "2026-09-02" }] as BookVersion[];
  const packages = [pkg("p1", { packageName: "Autumn round", bookVersionId: "bv-3" }), pkg("p2", { packageName: "Agents with MSWL", bookVersionId: "bv-2" })];
  const queries = [
    q("q1", { agentId: "a1", packageId: "p1", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-08-07T12:00:00Z" }),
    q("q2", { agentId: "a2", packageId: "p2", status: QueryStatus.FULL_SENT, dateSent: "2026-07-01T12:00:00Z" }),
    q("q9", { agentId: "a1", manuscriptId: "other" }),
    q("qx", { agentId: "nobody" }),
  ];
  const act = (id: string, date: string, over: Partial<Activity>): Activity => ({
    id, userId: "u", queryId: "", manuscriptId: "m", activityType: ActivityType.STATUS_CHANGED, description: "", date, details: "", ...over,
  });
  const activities: Activity[] = [
    act("send-q2", "2026-07-01T12:00:00Z", { queryId: "q2", activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
    act("full-q2", "2026-09-03T12:00:00Z", { queryId: "q2", activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.FULL_SENT, bookVersionId: "bv-2" }),
    act("msupd", "2026-09-02T12:00:00Z", { activityType: ActivityType.MANUSCRIPT_UPDATED, description: "You updated a manuscript's details" }),
    act("pr-q1", "2026-09-28T12:00:00Z", { queryId: "q1", resultingStatus: QueryStatus.PARTIAL_REQUESTED }),
    act("send-q1", "2026-08-07T12:00:00Z", { queryId: "q1", activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
    act("nudge-q2", "2026-09-10T12:00:00Z", { queryId: "q2", activityType: ActivityType.NUDGE_SENT, description: "Nudge sent to Rosa Quintana at Quintana Books" }),
    /* the other book's record is the newest on the account, and must not appear */
    act("send-q9", "2026-10-01T12:00:00Z", { queryId: "q9", manuscriptId: "other", activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
    /* a query event whose agent cannot be resolved drops rather than rendering a hole */
    act("send-qx", "2026-09-30T12:00:00Z", { queryId: "qx", activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
    /* a future-dated record is not yet history */
    act("future", "2026-12-01T12:00:00Z", { queryId: "q1", resultingStatus: QueryStatus.FULL_REQUESTED }),
  ];
  const run = (over: Partial<Parameters<typeof manuscriptActivity>[0]> = {}) => manuscriptActivity({
    ms: { id: "m", title: "Harbour of Glass" }, activities, queries, agents, packages, bookVersions: book,
    now: new Date("2026-10-03T12:00:00Z"), ...over,
  });

  it("this book only, newest first, every renderable row counted", () => {
    const { rows, total } = run();
    expect(rows.map((r) => r.id)).toEqual(["pr-q1", "nudge-q2", "full-q2", "msupd", "send-q1", "send-q2"]);
    expect(total).toBe(6);
    expect(rows.every((r) => r.manuscriptId === "m")).toBe(true);
  });

  it("the feed's own sentence, with the version and the package beneath it", () => {
    const by = Object.fromEntries(run().rows.map((r) => [r.id, r]));
    expect(sayText(by["pr-q1"].say)).toMatch(/^Edda Voss asked to read part of Harbour of Glass/);
    expect(by["pr-q1"].sub, "a request names its package's version").toBe("Fast-paced opening · Autumn round");
    expect(by["full-q2"].sub, "a versioned send names its own version").toBe("Dual timeline edit · Agents with MSWL");
    expect(sayText(by["nudge-q2"].say)).toMatch(/^You nudged Rosa Quintana/);
    expect(sayText(by["msupd"].say)).toBe("You updated a manuscript's details");
    expect(by["msupd"].sub).toBeNull();
  });

  it("a status record draws its status; a manuscript record the rust square; a nudge no mark", () => {
    const by = Object.fromEntries(run().rows.map((r) => [r.id, r]));
    expect(by["pr-q1"].glyph).toEqual({ kind: "status", status: QueryStatus.PARTIAL_REQUESTED });
    expect(by["msupd"].glyph).toEqual({ kind: "ms" });
    expect(by["nudge-q2"].glyph).toEqual({ kind: "none" });
  });

  it("seven at most, and the year only when it is not this year's", () => {
    const many = Array.from({ length: 10 }, (_, k) => act(`n${k}`, `2026-0${(k % 8) + 1}-1${k}T12:00:00Z`, {
      activityType: ActivityType.MANUSCRIPT_UPDATED, description: "You updated a manuscript's details",
    }));
    const { rows, total } = run({ activities: many });
    expect(rows.length).toBe(ACTIVITY_ROWS_MAX);
    expect(total).toBe(10);
    const old = run({ activities: [act("old", "2025-11-04T12:00:00Z", { activityType: ActivityType.MANUSCRIPT_UPDATED, description: "x" })] });
    expect(old.rows[0].date).toBe("4 Nov 2025");
    expect(run().rows[0].date).toBe("28 Sep");
  });
});

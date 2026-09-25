/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * manuscriptSummary — the Manuscripts page's derivations, proved on inputs the system can
 * actually produce (real enum values, real record shapes; no hand-invented buckets).
 *
 * The L3 (one-edge) cases here are the derivation half of the rendered lock in
 * tests/e2e/manuscriptsV12.measure.ts: a query whose package states no version — or which has no
 * package — appears in NO version's usage, and the named mutation (fold unattributed queries into
 * the current version) must turn them red.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ComponentType, QueryStatus } from "../types";
import type { Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import {
  bylineFor, compLetterTally, currentBookVersion, hasTwoPageSynopsis, initialsOf, letterInUse,
  materialQueryCount, materialsOf, otherMaterialTiles, owedAsk, owedRequests, packageQueries,
  packageUsageCounts, packagesInUse, queryVersionId, queryingSince, scopedManuscript,
  unattributedQueryIds, versionUsage,
} from "./manuscriptSummary";
import { oMs, oPkg } from "./designTokens";

const q = (id: string, status: QueryStatus, pkg: string, extra: Partial<Query> = {}): Query => ({
  id, userId: "u", manuscriptId: "ms", agentId: `ag-${id}`, packageId: pkg,
  status, personalisationNotes: "", sendMethod: "Email" as Query["sendMethod"], ...extra,
});
const pkg = (id: string, bookVersionId?: string, extra: Partial<SubmissionPackage> = {}): SubmissionPackage => ({
  id, manuscriptId: "ms", userId: "u", packageName: id,
  queryLetterVersionId: "let-1", synopsisVersionId: "", samplePagesVersionId: "",
  ...(bookVersionId ? { bookVersionId } : {}),
  status: "Active", createdDate: "2026-01-01T00:00:00.000Z", ...extra,
});
const mat = (id: string, type: ComponentType, name: string, created: string, extra: Partial<ManuscriptVersion> = {}): ManuscriptVersion => ({
  id, manuscriptId: "ms", userId: "u", componentType: type, versionName: name,
  fileAttached: false, createdDate: created, ...extra,
});

/* the fixture-shaped world: two versioned packages, one versionless, one query with no package */
const PKGS = [pkg("p1", "bv-3"), pkg("p2", "bv-2"), pkg("p0")];
const QUERIES: Query[] = [
  q("q1", QueryStatus.QUERIED, "p1", { dateSent: "2026-09-05T09:00:00.000Z" }),
  q("q2", QueryStatus.QUERIED, "p1", { dateSent: "2026-09-08T09:00:00.000Z" }),
  q("q3", QueryStatus.PARTIAL_REQUESTED, "p1", {
    dateSent: "2026-09-06T09:00:00.000Z", partialRequestedDate: "2026-09-12T09:00:00.000Z",
    materialsRequestedType: "pages", materialsRequestedQuantity: 50,
  }),
  q("q4", QueryStatus.FULL_REQUESTED, "p1", { dateSent: "2026-09-07T09:00:00.000Z", fullRequestedDate: "2026-09-19T09:00:00.000Z" }),
  q("q5", QueryStatus.FULL_SENT, "p2", { dateSent: "2026-07-01T09:00:00.000Z" }),
  q("q6", QueryStatus.REJECTED, "p2", { dateSent: "2026-03-03T09:00:00.000Z" }),
  q("q7", QueryStatus.QUERIED, "p0", { dateSent: "2026-03-10T09:00:00.000Z" }),
  q("q8", QueryStatus.NO_RESPONSE, "", { dateSent: "2026-03-05T09:00:00.000Z" }),
];

describe("the one edge (L3)", () => {
  it("a query reaches a version only through its package's own bookVersionId", () => {
    expect(queryVersionId(QUERIES[0], PKGS)).toBe("bv-3");
    expect(queryVersionId(q("x", QueryStatus.QUERIED, "p0"), PKGS)).toBeNull();
    expect(queryVersionId(q("x", QueryStatus.QUERIED, ""), PKGS)).toBeNull();
    expect(queryVersionId(q("x", QueryStatus.QUERIED, "no-such"), PKGS)).toBeNull();
  });

  it("versionUsage counts exactly its own package's queries, in pipeline order", () => {
    const u3 = versionUsage("bv-3", PKGS, QUERIES);
    expect(u3.total).toBe(4);
    expect(u3.packages).toBe(1);
    expect(u3.counts).toEqual([
      { status: QueryStatus.QUERIED, n: 2 },
      { status: QueryStatus.PARTIAL_REQUESTED, n: 1 },
      { status: QueryStatus.FULL_REQUESTED, n: 1 },
    ]);
    const u2 = versionUsage("bv-2", PKGS, QUERIES);
    expect(u2.total).toBe(2);
    expect(u2.counts).toEqual([
      { status: QueryStatus.FULL_SENT, n: 1 },
      { status: QueryStatus.REJECTED, n: 1, closed: true },
    ]);
    expect(versionUsage("bv-1", PKGS, QUERIES)).toEqual({ versionId: "bv-1", counts: [], total: 0, packages: 0 });
  });

  it("an unattributed query is in NO version's count — never folded, never dropped silently", () => {
    const totals = ["bv-1", "bv-2", "bv-3"].map((v) => versionUsage(v, PKGS, QUERIES).total);
    expect(totals.reduce((a, b) => a + b, 0)).toBe(6); // 8 queries, 2 outside every version
    expect(unattributedQueryIds(PKGS, QUERIES).sort()).toEqual(["q7", "q8"]);
  });

  it("the closed fold sums the three closed statuses into one entry that says so", () => {
    const world = [
      q("a", QueryStatus.REJECTED, "p1"), q("b", QueryStatus.WITHDRAWN, "p1"),
      q("c", QueryStatus.NO_RESPONSE, "p1"), q("d", QueryStatus.QUERIED, "p1"),
    ];
    const u = versionUsage("bv-3", PKGS, world);
    expect(u.counts).toEqual([
      { status: QueryStatus.QUERIED, n: 1 },
      { status: QueryStatus.REJECTED, n: 3, closed: true },
    ]);
  });
});

describe("the hero's facts", () => {
  it("current version is the newest by date — a date fact, not a verdict", () => {
    const ms = { bookVersions: [
      { id: "b1", name: "one", kind: "initial", createdDate: "2026-03-03" },
      { id: "b2", name: "two", kind: "revision", createdDate: "2026-09-02" },
    ] } as unknown as Manuscript;
    expect(currentBookVersion(ms)?.id).toBe("b2");
    expect(currentBookVersion({ bookVersions: [] } as unknown as Manuscript)).toBeNull();
  });

  it("querying since is the earliest sent date, and null while nothing has gone", () => {
    expect(queryingSince(QUERIES)).toBe("2026-03-03T09:00:00.000Z");
    expect(queryingSince([])).toBeNull();
    expect(queryingSince([{ dateSent: undefined }])).toBeNull();
  });

  it("the byline speaks the record's own words, dropping absent clauses", () => {
    expect(bylineFor({ genre: "Thriller", ageCategory: "Adult", wordCount: 50000 }, "Ashe Merren"))
      .toBe("An adult thriller by Ashe Merren, about 50,000 words");
    expect(bylineFor({ genre: "Crime", ageCategory: "Young adult", wordCount: 0 }, "P Q"))
      .toBe("A young adult crime by P Q");
    expect(bylineFor({ genre: "Thriller", ageCategory: "Adult", wordCount: 1000 }, null))
      .toBe("An adult thriller, about 1,000 words");
  });
});

describe("owed requests", () => {
  it("only the two requested statuses, newest request first", () => {
    const owed = owedRequests(QUERIES);
    expect(owed.map((o) => o.query.id)).toEqual(["q4", "q3"]);
    expect(owed[0].kind).toBe("full");
    expect(owed[1].kind).toBe("partial");
  });

  it("a request without a date sorts last and keeps a null date rather than borrowing one", () => {
    const owed = owedRequests([
      q("u", QueryStatus.PARTIAL_REQUESTED, "p1"),
      q("d", QueryStatus.FULL_REQUESTED, "p1", { fullRequestedDate: "2026-09-01T00:00:00.000Z" }),
    ]);
    expect(owed.map((o) => o.query.id)).toEqual(["d", "u"]);
    expect(owed[1].requestedIso).toBeNull();
  });

  it("the ask repeats the agent's stated quantity and invents none", () => {
    expect(owedAsk(QUERIES[2])).toBe("requested a partial, the first 50 pages");
    expect(owedAsk(q("x", QueryStatus.PARTIAL_REQUESTED, "p1"))).toBe("requested a partial");
    expect(owedAsk(q("x", QueryStatus.FULL_REQUESTED, "p1"))).toBe("requested the full manuscript");
    expect(owedAsk(q("x", QueryStatus.PARTIAL_REQUESTED, "p1", { materialsRequestedType: "other", materialsRequestedQuantity: "three acts" })))
      .toBe("requested a partial");
  });

  it("no appraisal word in any ask", () => {
    const banned = /\b(only|already|still|good|bad|slow|fast|poor|strong|weak|overdue|late|behind)\b/i;
    for (const o of owedRequests(QUERIES)) expect(o.ask).not.toMatch(banned);
  });
});

describe("materials", () => {
  const mats = [
    mat("l1", ComponentType.QUERY_LETTER, "Query letter v1", "2026-03-01T00:00:00.000Z"),
    mat("l2", ComponentType.QUERY_LETTER, "Query letter v2", "2026-06-02T00:00:00.000Z"),
    mat("l3", ComponentType.QUERY_LETTER, "Query letter v3", "2026-08-30T00:00:00.000Z"),
    mat("l4", ComponentType.QUERY_LETTER, "Put away", "2026-09-01T00:00:00.000Z", { status: "Retired" }),
    mat("s1", ComponentType.SYNOPSIS, "Synopsis, 1 page", "2026-08-28T00:00:00.000Z"),
    mat("other-ms", ComponentType.QUERY_LETTER, "Someone else's", "2026-08-28T00:00:00.000Z", { manuscriptId: "ms2" }),
  ];

  it("materialsOf filters by manuscript and type, newest first, archived out", () => {
    expect(materialsOf("ms", ComponentType.QUERY_LETTER, mats).map((m) => m.id)).toEqual(["l3", "l2", "l1"]);
  });

  it("the letter in use is the most recently sent query's, and absent without one", () => {
    const packs = [pkg("p1", undefined, { queryLetterVersionId: "l3" }), pkg("p2", undefined, { queryLetterVersionId: "l2" })];
    expect(letterInUse(packs, QUERIES)).toBe("l3"); // q2 (8 Sep) is the newest send, rides p1
    expect(letterInUse(packs, [])).toBeNull();
    expect(letterInUse(packs, [q("x", QueryStatus.QUERIED, "", { dateSent: "2026-09-09T00:00:00.000Z" })])).toBeNull();
  });

  it("material counts read the slot the material actually fills", () => {
    const packs = [pkg("p1", undefined, { queryLetterVersionId: "l3", synopsisVersionId: "s1" }), pkg("p2", undefined, { queryLetterVersionId: "l2" })];
    expect(materialQueryCount("l3", "letter", packs, QUERIES)).toBe(4);
    expect(materialQueryCount("s1", "synopsis", packs, QUERIES)).toBe(4);
    expect(materialQueryCount("l2", "letter", packs, QUERIES)).toBe(2);
    expect(materialQueryCount("nope", "letter", packs, QUERIES)).toBe(0);
  });

  it("the 2-page note gate reads the writer's own names, and 12 pages is not 2", () => {
    expect(hasTwoPageSynopsis([{ versionName: "Synopsis, 1 page" }, { versionName: "Synopsis, 3 pages" }])).toBe(false);
    expect(hasTwoPageSynopsis([{ versionName: "Synopsis, 2 pages" }])).toBe(true);
    expect(hasTwoPageSynopsis([{ versionName: "2-page synopsis" }])).toBe(true);
    expect(hasTwoPageSynopsis([{ versionName: "Synopsis, 12 pages" }])).toBe(false);
  });
});

describe("packages", () => {
  it("in use means at least one query went out with it, retired packages aside", () => {
    const packs = [pkg("p1"), pkg("p2"), pkg("p3"), pkg("p4", undefined, { status: "Retired" })];
    const world = [q("a", QueryStatus.QUERIED, "p1"), q("b", QueryStatus.REJECTED, "p2"), q("c", QueryStatus.QUERIED, "p4")];
    expect(packagesInUse(packs, world)).toBe(2);
  });

  it("package usage counts fold closed the same way a version's do", () => {
    expect(packageUsageCounts("p2", QUERIES)).toEqual([
      { status: QueryStatus.FULL_SENT, n: 1 },
      { status: QueryStatus.REJECTED, n: 1, closed: true },
    ]);
    expect(packageQueries("p1", QUERIES).length).toBe(4);
  });

  it("initials take the first two words", () => {
    expect(initialsOf("Mira Kovic")).toBe("MK");
    expect(initialsOf("Tom Achebe-Grant")).toBe("TA");
    expect(initialsOf("Plainname")).toBe("P");
    expect(initialsOf("")).toBe("?");
  });
});

describe("other materials", () => {
  it("tiles are the writer's own package lines, deduplicated, with the queries that carried them", () => {
    const packs = [
      pkg("p1", undefined, { otherMaterials: "Author bio" }),
      pkg("p2", undefined, { otherMaterials: "Author bio" }),
      pkg("p3", undefined, { otherMaterials: "Comps paragraph" }),
      pkg("p4"),
      pkg("p5", undefined, { otherMaterials: "Retired words", status: "Retired" }),
    ];
    const world = [
      q("a", QueryStatus.QUERIED, "p1"), q("b", QueryStatus.REJECTED, "p2"),
      q("c", QueryStatus.QUERIED, "p2"), q("d", QueryStatus.QUERIED, "p4"),
      q("e", QueryStatus.QUERIED, "p5"),
    ];
    expect(otherMaterialTiles(packs, world)).toEqual([
      { label: "Author bio", queries: 3 },
      { label: "Comps paragraph", queries: 0 },
    ]);
  });

  it("no lines, no tiles — never a placeholder row", () => {
    expect(otherMaterialTiles([pkg("p1")], [])).toEqual([]);
  });
});

describe("comps and scope", () => {
  it("the tray tally reads inQuery, absent meaning false", () => {
    expect(compLetterTally([{ title: "A", inQuery: true }, { title: "B", inQuery: true }, { title: "C" }]))
      .toEqual({ total: 3, inLetter: 2 });
  });

  it("the scoped manuscript is the stored choice when it exists, else the most recently moved", () => {
    const mss = [
      { id: "m1", statusChangedDate: "2026-01-01T00:00:00.000Z" },
      { id: "m2", statusChangedDate: "2026-06-01T00:00:00.000Z" },
    ] as Manuscript[];
    expect(scopedManuscript(mss, "m1")?.id).toBe("m1");
    expect(scopedManuscript(mss, "gone")?.id).toBe("m2");
    expect(scopedManuscript(mss, null)?.id).toBe("m2");
    expect(scopedManuscript([], "m1")).toBeNull();
  });
});

describe("the object colours", () => {
  it("designTokens and index.css state the same two values, declared at :root", () => {
    const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
    const decl = (name: string) => new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
    expect(decl("--o-ms")).toBe(oMs);
    expect(decl("--o-pkg")).toBe(oPkg);
    expect(oMs).toBe("#8a4a3c");
    expect(oPkg).toBe("#9a7233");
  });
});

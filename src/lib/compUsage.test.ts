/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CV25 A2 (unit): comp usage, the attachment rate and the unrecorded letters, on one fixture.
 *
 * The fixture holds every branch the derivations have: a letter sent with its comps recorded, a
 * letter sent with nothing recorded, an unsent letter, a query sent by package (resolved through the
 * edition that went), a query sent with its versions recorded, and a query with no letter at all.
 */
import { describe, expect, it } from "vitest";
import { ComponentType, Manuscript, ManuscriptVersion, Query, QueryStatus, SubmissionPackage } from "../types";
import {
  MAX_LETTER_COMPS, attachment, compKey, compUsage, compsInLetter, currentLetter, letterFixed, letterOf, letterSent,
  ready, resolutionCounts, traceLetter, unrecordedLetters, whereOf, withCompIds,
} from "./compUsage";
import { normalizeComp } from "./comps";
import { readFileSync } from "node:fs";

const MS = "ms1";
const letter = (id: string, name: string, createdDate: string, compIds?: string[]): ManuscriptVersion => ({
  id, manuscriptId: MS, userId: "u", componentType: ComponentType.QUERY_LETTER, versionName: name, fileAttached: false, createdDate,
  ...(compIds ? { compIds } : {}),
});
const versions: ManuscriptVersion[] = [
  letter("L1", "Query letter v1", "2026-01-01"),                       /* sent, nothing recorded */
  letter("L2", "Query letter v2", "2026-03-01", ["cmp_a", "cmp_b"]),   /* sent, recorded */
  letter("L3", "Query letter v3", "2026-06-01", ["cmp_a", "cmp_c"]),   /* not sent */
  { ...letter("S1", "Synopsis", "2026-01-01"), componentType: ComponentType.SYNOPSIS },
];
const packages = [
  /* the package's letter is L3 NOW; its first edition, the one that went, held L2 */
  {
    id: "P1", manuscriptId: MS, queryLetterVersionId: "L3", synopsisVersionId: "S1", samplePagesVersionId: "", createdDate: "2026-03-02", edition: 2,
    editions: [
      { n: 1, startedAt: "2026-03-02", summary: "", versions: ["L2", "S1"], queryLetterVersionId: "L2", synopsisVersionId: "S1" },
      { n: 2, startedAt: "2026-06-02", summary: "", versions: ["L3", "S1"], queryLetterVersionId: "L3", synopsisVersionId: "S1" },
    ],
  },
] as unknown as SubmissionPackage[];
const q = (id: string, status: QueryStatus, dateSent: string, extra: Partial<Query>): Query =>
  ({ id, manuscriptId: MS, agentId: `a-${id}`, packageId: "", status, dateSent, ...extra } as Query);
const queries: Query[] = [
  q("q1", QueryStatus.QUERIED, "2026-01-10", { sentHow: "individual", sentVersions: ["L1"] }),
  q("q2", QueryStatus.REJECTED, "2026-01-12", { sentHow: "individual", sentVersions: ["L1", "S1"] }),
  /* sent by package, first edition: resolves to L2, not the package's letter now */
  q("q3", QueryStatus.PARTIAL_REQUESTED, "2026-03-10", { packageId: "P1", sentHow: "package", sentPackageId: "P1", sentPackageEdition: 1 }),
  q("q4", QueryStatus.QUERIED, "2026-03-12", { sentHow: "individual", sentVersions: ["L2"] }),
  q("q5", QueryStatus.OFFER, "2026-03-14", { sentHow: "individual", sentVersions: ["S1", "L2"] }),
  /* no letter at all */
  q("q6", QueryStatus.QUERIED, "2026-04-01", {}),
  /* another manuscript's query never counts */
  { ...q("qx", QueryStatus.QUERIED, "2026-04-02", { sentVersions: ["L2"] }), manuscriptId: "other" },
];
const ms = {
  id: MS, title: "Book",
  comps: [
    { id: "cmp_a", title: "A", publisher: "P", year: 2021 },
    { id: "cmp_b", title: "B", publisher: "P", year: 2022 },
    { id: "cmp_c", title: "C", year: 2023, media: "film" },
    { id: "cmp_d", title: "D", year: 2024 },          /* a book with no publisher: not ready */
    { title: "E", publisher: "P", year: 2020 },       /* stored before ids: no id yet */
  ],
} as unknown as Manuscript;

describe("CV25 A2: a query resolves to its letter", () => {
  it("by its recorded versions, by the package edition that went, or not at all", () => {
    expect(letterOf(queries[0], versions, packages)).toBe("L1");
    expect(traceLetter(queries[2], versions, packages)).toEqual({ kind: "letter", letterId: "L2", via: "edition", ambiguous: false });
    expect(letterOf(queries[4], versions, packages)).toBe("L2");
    expect(letterOf(queries[5], versions, packages)).toBeNull();
    expect(resolutionCounts(ms, versions, packages, queries)).toEqual({ resolved: 5, unresolved: 1, ambiguous: 0 });
  });
  it("two letters in one send is ambiguous and takes the first", () => {
    const two = q("q9", QueryStatus.QUERIED, "2026-05-01", { sentVersions: ["L2", "L1"] });
    expect(traceLetter(two, versions, packages)).toEqual({ kind: "letter", letterId: "L2", via: "versions", ambiguous: true });
  });
  it("a package with no stored editions resolves to its letter now", () => {
    const flat = [{ id: "P2", queryLetterVersionId: "L1", synopsisVersionId: "" }] as unknown as SubmissionPackage[];
    expect(letterOf(q("q8", QueryStatus.QUERIED, "2026-05-01", { packageId: "P2" }), versions, flat)).toBe("L1");
  });
  it("sent and fixed", () => {
    expect(letterSent("L1", queries, versions, packages)).toBe(true);
    expect(letterSent("L3", queries, versions, packages)).toBe(false);
    expect(letterFixed(versions[1], queries, versions, packages)).toBe(true);   /* sent and recorded */
    expect(letterFixed(versions[0], queries, versions, packages)).toBe(false);  /* sent, can be filled in once */
    expect(letterFixed(versions[2], queries, versions, packages)).toBe(false);  /* recorded, not sent */
    expect(currentLetter(MS, versions)?.id).toBe("L3");
  });
});

describe("CV25 A2: usage, attachment and the unrecorded letters", () => {
  const use = compUsage(ms, versions, packages, queries);
  it("each comp knows its letters and the queries it went out with", () => {
    expect(use.get("cmp_a")).toEqual({ letters: ["L2", "L3"], sentLetters: ["L2"], queries: ["q3", "q4", "q5"], askedForMore: 2 });
    expect(use.get("cmp_b")).toEqual({ letters: ["L2"], sentLetters: ["L2"], queries: ["q3", "q4", "q5"], askedForMore: 2 });
    expect(use.get("cmp_c")).toEqual({ letters: ["L3"], sentLetters: [], queries: [], askedForMore: 0 });
    expect(use.get("cmp_d")).toEqual({ letters: [], sentLetters: [], queries: [], askedForMore: 0 });
    /* a comp with no id yet is keyed by its index and is in no letter */
    expect(use.get(compKey(ms.comps[4], 4))).toEqual({ letters: [], sentLetters: [], queries: [], askedForMore: 0 });
    expect([...use.keys()]).toEqual(["cmp_a", "cmp_b", "cmp_c", "cmp_d", "idx_4"]);
    expect(["cmp_a", "cmp_c", "cmp_d"].map((k) => whereOf(use.get(k)))).toEqual(["sent", "unsent", "none"]);
  });
  it("a query with no letter, and one whose letter records nothing, are not logged", () => {
    const a = attachment(ms, versions, packages, queries);
    expect(a).toEqual({ sent: 6, logged: 3, rate: 50, bars: [false, false, true, true, true, false] });
    /* both branches of "not logged" were entered: the unrecorded letter (q1, q2) and no letter (q6) */
    expect(queries.slice(0, 2).every((x) => letterOf(x, versions, packages) === "L1")).toBe(true);
    expect(letterOf(queries[5], versions, packages)).toBeNull();
  });
  it("nothing sent has no rate", () => {
    expect(attachment(ms, versions, packages, []).rate).toBeNull();
  });
  it("an empty list is recorded: it mentions none", () => {
    const v = versions.map((x) => (x.id === "L1" ? { ...x, compIds: [] } : x));
    expect(attachment(ms, v, packages, queries).logged).toBe(5);
    expect(unrecordedLetters(ms, v, packages, queries)).toEqual([]);
  });
  it("the unrecorded letters are the sent ones with nothing recorded", () => {
    expect(unrecordedLetters(ms, versions, packages, queries)).toEqual([{ letterId: "L1", name: "Query letter v1", queries: 2 }]);
  });
  it("a letter's comps are read in the shelf's order", () => {
    expect(compsInLetter(ms.comps, versions[2]).map((c) => c.title)).toEqual(["A", "C"]);
    expect(compsInLetter(ms.comps, versions[0])).toEqual([]);
  });
});

describe("CV25 A1 (unit half): ids", () => {
  it("a comp without an id is given one; one with an id keeps it through a write and a reorder", () => {
    const withIds = withCompIds(ms.comps);
    expect(withIds.slice(0, 4).map((c) => c.id)).toEqual(["cmp_a", "cmp_b", "cmp_c", "cmp_d"]);
    expect(withIds[4].id).toMatch(/^cmp_[a-z0-9]{6,}$/);
    expect(new Set(withIds.map((c) => c.id)).size).toBe(5);
    const again = withCompIds([...withIds].reverse().map(normalizeComp));
    expect(again.map((c) => c.id)).toEqual([...withIds].reverse().map((c) => c.id));
  });
  it("a duplicated id is replaced, so no two comps share one", () => {
    const out = withCompIds([{ id: "cmp_a", title: "A" }, { id: "cmp_a", title: "A again" }]);
    expect(out[0].id).toBe("cmp_a");
    expect(out[1].id).not.toBe("cmp_a");
  });
  it("ready: a book needs a publisher and a year; a film or TV comp needs a year", () => {
    expect(ms.comps.map((c) => ready(c))).toEqual([true, true, true, false, true]);
    expect(ready({ media: "tv" })).toBe(false);
  });
});

describe("CV25: the rules carry the letter's cap", () => {
  it("firestore.rules allows compIds on a version, capped at MAX_LETTER_COMPS", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    expect(rules).toContain(`data.compIds is list && data.compIds.size() <= ${MAX_LETTER_COMPS}`);
    const m = /match \/versions\/\{versionId\}[\s\S]*?hasOnly\(\[([^\]]*)\]\)/.exec(rules);
    expect(m, "the versions update allowlist").not.toBeNull();
    expect(m![1]).toContain("'compIds'");
  });
});

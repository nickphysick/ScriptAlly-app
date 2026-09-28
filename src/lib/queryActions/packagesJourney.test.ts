/**
 * Packages through the journey — Part A's pure locks (LP1–LP3, LP5, LP7, LP8 at the derivation
 * level). The rendered halves live in tests/e2e/packagesJourney.measure.ts.
 */
import { describe, expect, it } from "vitest";
import {
  editionsOn, exactPackage, openingPackage, packageToAttach, packagesFor, piecesChanged, piecesOf, readSummary, sentPieces, summaryOf, summaryWith,
  type PackageCard,
} from "./packages";
import { ComponentType, type ManuscriptVersion, type SubmissionPackage } from "../../types";

const V = (id: string, t: ComponentType, name: string): ManuscriptVersion =>
  ({ id, manuscriptId: "ms", userId: "u", componentType: t, versionName: name, fileAttached: false, createdDate: "2026-09-01" });
const versions = [V("ql3", ComponentType.QUERY_LETTER, "v3"), V("ql4", ComponentType.QUERY_LETTER, "v4"), V("syn2", ComponentType.SYNOPSIS, "v2")];
const P = (id: string, name: string, over: Partial<SubmissionPackage> = {}): SubmissionPackage => ({
  id, manuscriptId: "ms", userId: "u", packageName: name, queryLetterVersionId: "ql3", synopsisVersionId: "syn2",
  samplePagesVersionId: "", status: "Active", createdDate: "2026-09-01", ...over,
} as SubmissionPackage);
const bvs = [{ id: "bv1", name: "Fast-paced opening" }];
const pkgs: PackageCard[] = packagesFor("ms", [
  P("p1", "Standard", { bookVersionId: "bv1" }),
  P("p2", "Opening pages"),
  P("p3", "Letter only", { synopsisVersionId: "" }),
  P("px", "Old one", { status: "Retired" } as Partial<SubmissionPackage>),
], versions, bvs);
const askLetterOnly = { ql: true, syn: false, sample: { unit: "none" as const, amt: 0, from: 1, sect: false, fu: null }, stated: true };

describe("LP1–LP3 · which option step 2 opens on", () => {
  it("LP1 · the manuscript's 'used for new queries' package opens selected when nothing else applies", () => {
    expect(openingPackage(pkgs, null, null, "p2")).toBe("p2");
  });
  it("LP2 · an explicit packageId wins over again, the default and any guideline match", () => {
    expect(openingPackage(pkgs, "p1", "p3", "p2")).toBe("p1");
    // p3 matches the agent; the order never consults it
    expect(packageToAttach(pkgs, openingPackage(pkgs, "p1", null, null), askLetterOnly)).toBe("p1");
  });
  it("again.pkg comes before the default, and 'custom' is not a package", () => {
    expect(openingPackage(pkgs, null, "p3", "p2")).toBe("p3");
    expect(openingPackage(pkgs, null, "custom", "p2")).toBe("p2");
  });
  it("LP3 · a retired default or preset falls through and is never selected", () => {
    expect(pkgs.some((p) => p.id === "px")).toBe(false);
    expect(openingPackage(pkgs, "px", null, "px")).toBeNull();
    expect(openingPackage(pkgs, "px", null, "p2")).toBe("p2");
  });
  it("with none of the three, a match is the selection only once the writer asks for a package", () => {
    expect(openingPackage(pkgs, null, null, null)).toBeNull();
    expect(packageToAttach(pkgs, null, askLetterOnly)).toBe("p3");
    expect(packageToAttach(pkgs, null, null)).toBe("p1");
  });
});

describe("§C2 via the adapter · editions and the book version", () => {
  it("every package is its 1st edition until the model says otherwise", () => {
    expect(pkgs.map((p) => p.edition)).toEqual([1, 1, 1]);
    const [e] = packagesFor("ms", [{ ...P("p9", "Nine"), edition: 3 } as SubmissionPackage], versions);
    expect(e.edition).toBe(3);
  });
  it("a retiredAt takes a package out of the choices even with status Active", () => {
    expect(packagesFor("ms", [{ ...P("p8", "Eight"), retiredAt: "2026-09-20" } as SubmissionPackage], versions)).toEqual([]);
  });
});

describe("LP5/LP7 · what saving records", () => {
  const mat = { ql: true, syn: true, s: { unit: "chapters" as const, amt: 3, from: 1, sect: false, fu: null } };
  const p1 = pkgs[0];
  it("the summary is the pieces as they went, and reads back into the same rows", () => {
    const pieces = sentPieces(mat, p1);
    expect(summaryOf(pieces)).toBe("Query letter v3 · Synopsis v2 · first 3 chapters · Fast-paced opening");
    expect(piecesOf(summaryOf(pieces))).toEqual(pieces);
  });
  it("LP7 · starting from a package and dropping the synopsis is a change, recorded as such", () => {
    const now = { qlId: "ql3", synId: null, qlVersion: "v3", synVersion: null, other: null };
    expect(piecesChanged(p1, now)).toEqual(["Synopsis: v2 → none"]);
  });
  it("the sample's portion is never a package difference (D2)", () => {
    const now = { qlId: "ql3", synId: "syn2", qlVersion: "v3", synVersion: "v2", other: null };
    expect(piecesChanged(p1, now)).toEqual([]);
  });
  it("a newer letter than the package's is a change", () => {
    expect(piecesChanged(p1, { qlId: "ql4", synId: "syn2", qlVersion: "v4", synVersion: "v2", other: null })).toEqual(["Query letter: v3 → v4"]);
  });
});

describe("the summary never repeats a piece's name", () => {
  it("a version named after its piece reads as its remainder", () => {
    const pieces = sentPieces({ ql: true, syn: true, s: { unit: "none", amt: 0, from: 1, sect: false, fu: null } },
      { qlVersion: "Query letter v3", synVersion: "Synopsis, 3 pages", bookVersion: null, other: null });
    expect(summaryOf(pieces)).toBe("Query letter v3 · Synopsis 3 pages");
  });
});

describe("LP6 · the frozen name rides in the summary", () => {
  const pieces = sentPieces({ ql: true, syn: false, s: { unit: "none", amt: 0, from: 1, sect: false, fu: null } }, { qlVersion: "v3", synVersion: null, bookVersion: null, other: null });
  it("a package's name, and a based-on name, read back from the summary", () => {
    expect(readSummary(summaryWith(pieces, "Standard", null))).toEqual({ packageName: "Standard", basedOnName: null, pieces });
    expect(readSummary(summaryWith(pieces, null, "Standard"))).toEqual({ packageName: null, basedOnName: "Standard", pieces });
    expect(readSummary(summaryWith(pieces, null, null))).toEqual({ packageName: null, basedOnName: null, pieces });
  });
});

describe("LP8 · exact match", () => {
  it("pieces exactly a live package's are found; one piece different is not", () => {
    expect(exactPackage(pkgs, { qlId: "ql3", synId: null, other: null })?.id).toBe("p3");
    expect(exactPackage(pkgs, { qlId: "ql4", synId: null, other: null })).toBeNull();
  });
});

describe("§A4 · the correction offers every edition that existed on the query's date", () => {
  const all = [
    P("p1", "Standard", { createdDate: "2026-06-01" }),
    P("pr", "Opening pages", { status: "Retired", createdDate: "2026-05-01" } as Partial<SubmissionPackage>),
    P("late", "Made later", { createdDate: "2026-09-20" }),
    { ...P("pe", "Edited", { createdDate: "2026-05-01" }), editions: [{ n: 1, startedAt: "2026-05-01" }, { n: 2, startedAt: "2026-09-02" }] } as SubmissionPackage,
  ];
  const on = editionsOn("ms", "2026-08-14", all, versions);
  it("includes a retired package, marked retired", () => {
    expect(on.find((c) => c.id === "pr")?.retired).toBe(true);
  });
  it("leaves out a package made after that day, and an edition started after it", () => {
    expect(on.some((c) => c.id === "late")).toBe(false);
    expect(on.filter((c) => c.id === "pe").map((c) => c.edition)).toEqual([1]);
  });
  it("a later day offers the later edition too — a superseded edition still existed", () => {
    expect(editionsOn("ms", "2026-09-10", all, versions).filter((c) => c.id === "pe").map((c) => c.edition)).toEqual([1, 2]);
  });
  it("each row is keyed by package and edition, which is how AS RECORDED is found", () => {
    expect(on.map((c) => c.key)).toContain("p1#1");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the page's derivations (lib/packagesV26) and the route move (lib/packagesRoute).
 * Results' figures are asserted AGAINST packageReplies (a second route), never typed twice.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Manuscript, type Query, type SubmissionPackage } from "../types";
import { MIN_SENDS_FOR_CLAIM, packageSplit, qualifies, ranked, tally } from "./packageReplies";
import {
  askRate, BAR_MAX, copyName, extraNamed, extraSuggestions, extrasLine, iconOf, offersNewExtra, otherMaterialsMigration,
  materialSummary, packageFoot, rankedOnly, readiness, readinessLabel, resultRows, resultsFoot, resultsLead, sendSplit, compsLine,
} from "./packagesV26";
import { packagesRedirectFor } from "./packagesRoute";
import { contentsChanged, editionRecord } from "./packageEditions";

const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage => ({
  id: "p", userId: "u", manuscriptId: "m", packageName: "P", queryLetterVersionId: "L", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: "2026-01-01", ...over,
});
const q = (id: string, status: QueryStatus, over: Partial<Query>): Query => ({ id, status, manuscriptId: "m", ...over } as unknown as Query);

describe("packagesRoute — /manuscripts/packages moved to /queries/packages", () => {
  it("redirects the old path with its query string and hash", () => {
    expect(packagesRedirectFor("/manuscripts/packages", "?pkg=x", "#h")).toBe("/queries/packages?pkg=x#h");
    expect(packagesRedirectFor("/manuscripts/packages/")).toBe("/queries/packages");
  });
  it("leaves every other path alone", () => {
    for (const p of ["/queries/packages", "/manuscripts", "/manuscripts/versions", "/manuscripts/packagesx"]) expect(packagesRedirectFor(p)).toBeNull();
  });
});

describe("readiness — the header bar's pill", () => {
  it("needs a letter, then a version, then is ready", () => {
    expect(readiness(pkg({ queryLetterVersionId: "" }))).toBe("needs-letter");
    expect(readiness(pkg({ bookVersionId: undefined }))).toBe("needs-version");
    expect(readiness(pkg({ bookVersionId: "V" }))).toBe("ready");
    expect(readinessLabel("needs-letter")).toBe("Needs a letter");
    expect(readinessLabel("ready")).toBe("Ready");
  });
  it("an unknown icon reads as the box", () => {
    expect(iconOf({ icon: "crown" })).toBe("crown");
    expect(iconOf({})).toBe("box");
    expect(iconOf({ icon: "nope" as never })).toBe("box");
  });
});

describe("named extras", () => {
  const extras = [{ id: "e1", name: "Author bio" }, { id: "e2", name: "Pitch sheet" }];
  it("the otherMaterials mirror is the ticked names, in the manuscript's order", () => {
    expect(extrasLine(["e2", "e1"], extras)).toBe("Author bio, Pitch sheet");
    expect(extrasLine([], extras)).toBe("");
  });
  it("suggestions skip what the writer already has and filter as they type", () => {
    expect(extraSuggestions("", [{ id: "x", name: "marketing plan" }])).not.toContain("Marketing plan");
    expect(extraSuggestions("out", [])).toEqual(["Series outline", "Chapter outline"]);
  });
  it("+ Add “…” is offered only for a name that is new", () => {
    expect(offersNewExtra("Author bio", extras)).toBe(false);
    expect(offersNewExtra("writing cv", extras)).toBe(false);
    expect(offersNewExtra("Rights list", extras)).toBe(true);
    expect(offersNewExtra("  ", extras)).toBe(false);
  });
  it("never two extras of one name", () => {
    expect(extraNamed("author BIO", extras, () => "new").created).toBe(false);
    expect(extraNamed("Rights list", extras, () => "new")).toEqual({ extra: { id: "new", name: "Rights list" }, created: true });
  });
  /* ⚠️ THE LOCK THE PACK NAMES: adding an extra to a package does not change any SENT query's extras. A query's extras
     are its credited edition's, frozen with it; ticking one changes `otherMaterials`, which starts the next edition. */
  it("ticking an extra is a contents change (it starts an edition), and an edition record keeps the ids it held", () => {
    const before = pkg({ otherMaterials: "Author bio", extraIds: ["e1"] });
    const after = { ...before, otherMaterials: extrasLine(["e1", "e2"], extras), extraIds: ["e1", "e2"] };
    expect(contentsChanged(before, after)).toBe(true);
    const ed1 = editionRecord(1, "2026-01-01", before, "");
    expect(ed1.otherMaterials).toBe("Author bio");
    expect(ed1.extraIds).toEqual(["e1"]);
  });
  it("adding ids alone to a package whose text already names them is NOT a contents change (the migration)", () => {
    const legacy = pkg({ otherMaterials: "Author bio" });
    expect(contentsChanged(legacy, { ...legacy, extraIds: ["e1"] })).toBe(false);
  });
});

describe("the otherMaterials migration", () => {
  const ms = { id: "m", extras: [{ id: "e1", name: "Author bio" }] } as unknown as Manuscript;
  it("one extra per distinct text, shared; an existing extra is reused; a package with ids is left alone", () => {
    let n = 0;
    const mint = () => `n${++n}`;
    const plan = otherMaterialsMigration(ms, [
      pkg({ id: "a", otherMaterials: "Author bio" }),
      pkg({ id: "b", otherMaterials: "Writing CV, outline" }),
      pkg({ id: "c", otherMaterials: "writing cv, outline" }),
      pkg({ id: "d", otherMaterials: "Pitch", extraIds: [] }),
      pkg({ id: "e" }),
      pkg({ id: "f", manuscriptId: "other", otherMaterials: "Other book" }),
    ], mint);
    expect(plan.added).toBe(1);
    expect(plan.extras.map((e) => e.name)).toEqual(["Author bio", "Writing CV, outline"]);
    expect(plan.patches).toEqual([{ id: "a", extraIds: ["e1"] }, { id: "b", extraIds: ["n1"] }, { id: "c", extraIds: ["n1"] }]);
  });
});

describe("sent as is / with changes — the current edition", () => {
  it("as the package vs logged piece by piece from it; other editions and other packages do not count", () => {
    const p = pkg({ id: "p1", edition: 2, firstSentAt: "x" });
    const qs = [
      q("a", QueryStatus.QUERIED, { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 2 }),
      q("b", QueryStatus.QUERIED, { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 1 }),
      q("c", QueryStatus.QUERIED, { sentHow: "individual", basedOnPackageId: "p1", basedOnPackageEdition: 2, sentMaterials: "x" }),
      q("d", QueryStatus.QUERIED, { sentHow: "package", sentPackageId: "p2", sentPackageEdition: 2 }),
    ];
    expect(sendSplit(p, qs)).toEqual({ asIs: 1, changed: 1 });
  });
  it("the foot line says nothing is recorded until a send, then what went, from when", () => {
    expect(packageFoot(pkg({}), false, { asIs: 0, changed: 0 })).toBe("Change it as much as you like. Nothing is recorded until you log a query with it.");
    const sent = pkg({ edition: 2, editions: [
      { n: 1, startedAt: "2026-01-01", summary: "", versions: [], queryLetterVersionId: "L", synopsisVersionId: "" },
      { n: 2, startedAt: "2026-09-03T10:00:00Z", summary: "", versions: [], queryLetterVersionId: "L", synopsisVersionId: "" },
    ] });
    expect(packageFoot(sent, true, { asIs: 3, changed: 2 })).toBe("Counting from 3 Sep, when you last changed it. 3 sent as is, 2 with changes. Queries already sent keep exactly what went with them.");
    expect(packageFoot(pkg({}), true, { asIs: 0, changed: 0 })).toBe("Queries already sent keep exactly what went with them.");
  });
});

describe("Results — packageReplies' figures, its threshold, its order", () => {
  const S = (requests: number, passes: number, noReply: number, out = 0) =>
    ({ sent: requests + passes + noReply + out, requests, otherReplies: passes, out, noReply, withdrawnEarly: 0, replies: requests + passes, answered: requests + passes + noReply, rate: null });
  const items = [
    { id: "a", name: "Alpha", s: S(2, 2, 1) },      // 5 answered, 40%
    { id: "b", name: "Beta", s: S(3, 1, 0) },       // 4 answered, 75%
    { id: "c", name: "Gamma", s: S(1, 0, 0, 2) },   // 1 answered — too early
    { id: "d", name: "Delta", s: S(0, 0, 0) },      // not sent
  ];
  it("the share asked for more is requests over ANSWERED (still waiting never enters it)", () => {
    expect(askRate(items[2].s)).toBe(1);
    expect(askRate(items[3].s)).toBeNull();
  });
  it("an item under the threshold is shown, marked Too early, and never ranked", () => {
    const rows = resultRows(items);
    const g = rows.find((r) => r.item.id === "c")!;
    expect(qualifies(items[2].s)).toBe(false);
    expect(g.early).toBe(true);
    expect(g.label).toBe("Too early");
    expect(rankedOnly(rows).map((r) => r.item.id)).not.toContain("c");
    expect(rows.find((r) => r.item.id === "d")!.label).toBe("Not sent");
  });
  it("the order is packageReplies' house order", () => {
    expect(resultRows(items).map((r) => r.item.id)).toEqual(ranked(items).map((r) => r.id));
  });
  it("bars run to 50%", () => {
    const rows = resultRows(items);
    expect(rows.find((r) => r.item.id === "b")!.bar).toBe(100);
    expect(rows.find((r) => r.item.id === "a")!.bar).toBeCloseTo((0.4 / BAR_MAX) * 100);
  });
  it("the lead names the best and the lowest ranked", () => {
    const l = resultsLead(resultRows(items), "pk");
    expect(l.best).toBe(rankedOnly(resultRows(items))[0].item.name);
    expect(l.text).toContain("for Alpha");
  });
  it("the footnote states the threshold packageReplies uses", () => {
    expect(resultsFoot(S(2, 2, 1), "let")).toContain(`fewer than ${MIN_SENDS_FOR_CLAIM} answers`);
    expect(resultsFoot(S(2, 2, 1), "syn")).toMatch(/^Your average across everything: 40%\. Synopses /);
  });
  it("a package's figures are packageSplit's (the same tally, by the same first-answer rule)", () => {
    const p = pkg({ id: "p1" });
    const qs = [q("a", QueryStatus.PARTIAL_REQUESTED, { sentHow: "package", sentPackageId: "p1" }), q("b", QueryStatus.REJECTED, { sentHow: "package", sentPackageId: "p1" })];
    expect(packageSplit(p, qs, new Map())).toEqual(tally(qs, new Map()));
  });
});

describe("v26.1 — Results follows the builder's set", () => {
  const S = (requests: number, passes: number) =>
    ({ sent: requests + passes, requests, otherReplies: passes, out: 0, noReply: 0, withdrawnEarly: 0, replies: requests + passes, answered: requests + passes, rate: null });
  /* a RETIRED item with the best figures of all: it must still come last, read "Retired", and never be ranked */
  const items = [
    { id: "old", name: "Retired one", s: S(5, 0), retired: true },
    { id: "a", name: "Alpha", s: S(2, 2) },
    { id: "b", name: "Beta", s: S(3, 1) },
  ];
  it("a retired item is listed under the others, whatever its figures", () => {
    expect(resultRows(items).map((r) => r.item.id)).toEqual(["b", "a", "old"]);
  });
  it("…reads Retired and is never ranked", () => {
    const rows = resultRows(items);
    expect(rows.find((r) => r.item.id === "old")!.label).toBe("Retired");
    expect(rankedOnly(rows).map((r) => r.item.id)).toEqual(["b", "a"]);
    expect(resultsLead(rows, "pk").best).toBe("Beta");
  });
  it("the footnote states the average only when there is one", () => {
    const none = { ...S(0, 0), sent: 3, answered: 0 };
    expect(resultsFoot(none, "pk")).toBe(`Packages with fewer than ${MIN_SENDS_FOR_CLAIM} answers are shown but not ranked.`);
    expect(resultsFoot(S(1, 1), "pk")).toMatch(/^Your average across everything: 50%\. /);
  });
});

describe("v26.1 — a material's second line", () => {
  it("its own summary wins", () => expect(materialSummary("Hook first, comps second", 3, 1)).toBe("Hook first, comps second"));
  it("else what it did, leaving out the zeros", () => {
    expect(materialSummary("", 2, 1)).toBe("sent 2 · in 1 package");
    expect(materialSummary("  ", 0, 3)).toBe("in 3 packages");
    expect(materialSummary(undefined, 4, 0)).toBe("sent 4");
  });
  it("else nothing — never the type", () => {
    expect(materialSummary("", 0, 0)).toBe("");
    for (const t of [materialSummary("", 0, 0), materialSummary("", 1, 1)]) expect(t).not.toMatch(/Query letter|Synopsis/);
  });
});

describe("the tables", () => {
  it("names the first two comps and counts the rest", () => {
    expect(compsLine(["The Trees", "Small Pleasures", "Tin Man"])).toEqual({ text: "The Trees, Small Pleasures", more: 1 });
    expect(compsLine([])).toBeNull();
  });
  it("a new letter from a fix-or-new is “{name} (2)”, never a name already taken", () => {
    expect(copyName("Hook-first", ["Hook-first"])).toBe("Hook-first (2)");
    expect(copyName("Hook-first (2)", ["Hook-first", "Hook-first (2)"])).toBe("Hook-first (3)");
  });
});

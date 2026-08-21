/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Submission packages overview's derivations.
 *
 * ⚠️ THE FIXTURES ARE BUILT THE WAY THE APP BUILDS THEM, and where a value is computed in
 * production it is computed here too rather than typed in. `packageRows` is asserted against
 * `packageMetrics` — two derivations against EACH OTHER — because a `toBe(6)` on both sides goes
 * green the day someone changes both in the same wrong direction. Same reason the agent list's
 * three reconciliation invariants are written that way.
 *
 * ⚠️ AND THE TYPE LABELS ARE READ FROM `TYPE_META`, NOT TYPED AS "Covering letter". A literal here
 * would be a second copy of a display map that already exists, and it would pass on the day the map
 * changed and the register stopped matching it.
 */
import { describe, it, expect } from "vitest";
import {
  materialRows, materialDetail, addedLabel, packageRows, sentLine,
  trackingRows, howItWorks, packagedQueries, replyCount, packageTiles, tileFooter,
  materialColumns, packagesUsing, usageLine,
  isRetired, removalChoice, resolveSlot, MISSING_SLOT,
} from "./packagesOverview";
import { packageMetrics, UNFILLED_SLOT, isRequest as isRequestExport, packagesUsingVersion } from "./packageMetrics";
import { TYPE_META, BUILDER_TYPES } from "../components/packages/typeMeta";
import { ComponentType, QueryStatus } from "../types";
import type { ManuscriptVersion, SubmissionPackage, Query } from "../types";

const NOW = Date.parse("2026-08-19T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const v = (id: string, type: ComponentType, name: string, created: string, draft?: string): ManuscriptVersion => ({
  id, manuscriptId: "m1", userId: "u1", componentType: type, versionName: name,
  fileAttached: false, createdDate: created, ...(draft ? { contentDraft: draft } : {}),
});

const pkg = (id: string, name: string, ql: string, syn: string, sam: string): SubmissionPackage => ({
  id, manuscriptId: "m1", userId: "u1", packageName: name,
  queryLetterVersionId: ql, synopsisVersionId: syn, samplePagesVersionId: sam,
  status: "Active", createdDate: daysAgo(30),
});

const q = (id: string, packageId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", manuscriptId: "m1", agentId: `a-${id}`, packageId,
  status, dateSent: daysAgo(20), ...extra,
} as Query);

describe("materialRows", () => {
  const versions = [
    v("s1", ComponentType.SYNOPSIS, "One-page", daysAgo(6)),
    v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)),
    v("q2", ComponentType.QUERY_LETTER, "Comps-forward", daysAgo(14)),
    v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3", daysAgo(9), "word ".repeat(120)),
  ];

  it("groups by the builder's canonical type order, newest first inside a type", () => {
    const rows = materialRows(versions, NOW);
    expect(rows.map((r) => r.name)).toEqual(["Hook-first", "Comps-forward", "One-page", "Chapters 1-3"]);
  });

  it("labels each row from TYPE_META rather than a literal", () => {
    const rows = materialRows(versions, NOW);
    expect(rows[0].typeLabel).toBe(TYPE_META[ComponentType.QUERY_LETTER].label);
    expect(rows[2].typeLabel).toBe(TYPE_META[ComponentType.SYNOPSIS].label);
    expect(rows[3].typeLabel).toBe(TYPE_META[ComponentType.SAMPLE_PAGES].label);
  });

  /* The UK display map is what makes this worth stating: the STORED token is "Query Letter". */
  it("shows the covering-letter display label, not the stored token", () => {
    expect(materialRows(versions, NOW)[0].typeLabel).toBe("Covering letter");
  });

  /* ⚠️ THE STANDING LAW: a full manuscript is not a package material. BUILDER_TYPES excludes it,
     so a stored Full Manuscript version must not reach the register. */
  it("never lists a full manuscript", () => {
    const withFull = [...versions, v("f1", ComponentType.FULL_MANUSCRIPT, "The whole thing", daysAgo(1))];
    expect(materialRows(withFull, NOW).map((r) => r.name)).not.toContain("The whole thing");
    expect(BUILDER_TYPES).not.toContain(ComponentType.FULL_MANUSCRIPT);
  });

  it("is empty when there are no versions", () => {
    expect(materialRows([], NOW)).toEqual([]);
  });
});

describe("the detail line states only what the record holds", () => {
  /* ⚠️ THE POINT OF THIS CASE. There is no edited date on ManuscriptVersion, so the line must not
     claim one — a created date under an "edited" label is a plausible number stating something
     untrue, which is the Manuscripts-tile fault. */
  it("says added, never edited", () => {
    const detail = materialDetail(v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)), NOW);
    expect(detail).toContain("added");
    expect(detail).not.toContain("edited");
  });

  /* ⚠️ AND NO INVENTED VERSION NUMBER. `versionName` is free text; an ordinal would be a number the
     writer never chose. */
  it("invents no version number", () => {
    const detail = materialDetail(v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)), NOW);
    expect(detail).not.toMatch(/\bv\d+\b/);
  });

  it("carries a word count when there is a draft to count", () => {
    const detail = materialDetail(v("p1", ComponentType.SAMPLE_PAGES, "Ch 1-3", daysAgo(9), "word ".repeat(120)), NOW);
    expect(detail).toMatch(/120 words/);
    expect(detail).toContain(" · ");
  });

  it("falls back to the added date alone with no draft", () => {
    expect(materialDetail(v("q1", ComponentType.QUERY_LETTER, "Hook", daysAgo(1)), NOW)).toBe("added 1 day ago");
  });

  it("states an em-dash rather than inventing anything when it knows nothing", () => {
    const bare = { ...v("x", ComponentType.SYNOPSIS, "Untitled", ""), createdDate: "" } as ManuscriptVersion;
    expect(materialDetail(bare, NOW)).toBe("—");
  });

  it("returns null for an absent or unparseable date rather than NaN", () => {
    expect(addedLabel(undefined, NOW)).toBeNull();
    expect(addedLabel("not-a-date", NOW)).toBeNull();
  });

  it("says today, not '0 days ago'", () => {
    expect(addedLabel(daysAgo(0), NOW)).toBe("added today");
  });
});

describe("packageRows", () => {
  const versions = [
    v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)),
    v("s1", ComponentType.SYNOPSIS, "One-page", daysAgo(6)),
    v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3", daysAgo(9)),
  ];
  const packages = [pkg("pk1", "Standard UK", "q1", "s1", "p1")];
  const queries = [
    q("1", "pk1", QueryStatus.QUERIED),
    q("2", "pk1", QueryStatus.REJECTED, { hasAgentResponded: true }),
    q("3", "pk1", QueryStatus.FULL_REQUESTED),
  ];

  it("resolves the composition from real version references, in canonical order", () => {
    expect(packageRows(packages, versions, queries)[0].composition)
      .toBe("Hook-first · One-page · Chapters 1-3");
  });

  /* ⚠️ TWO DERIVATIONS AGAINST EACH OTHER, never a literal on both sides. */
  it("reports the same send count the analytics engine reports", () => {
    const row = packageRows(packages, versions, queries)[0];
    expect(row.sent).toBe(packageMetrics("pk1", queries).sent);
    expect(row.sentLine).toBe(sentLine(packageMetrics("pk1", queries).sent));
  });

  /**
   * ⚠️ THIS ASSERTION IS REVERSED FROM WHAT IT SAID, DELIBERATELY (Ruling 2). It used to require
   * that a slot whose material is gone be OMITTED, and called that honest. It is not: the resulting
   * line — "Hook-first · Chapters 1-3" — describes a package the writer does not have, one
   * deliberately built without a synopsis. The archive model is what made the state reachable at
   * all, so it is also what made the old wording testable and wrong.
   */
  it("names a slot whose version is gone rather than dropping it", () => {
    const orphaned = [pkg("pk2", "Half", "q1", "gone", "p1")];
    expect(packageRows(orphaned, versions, queries)[0].composition)
      .toBe(`Hook-first · ${MISSING_SLOT} · Chapters 1-3`);
  });

  /** An UNFILLED slot still contributes nothing — the two states must not collapse back together. */
  it("keeps an unfilled slot out of the composition line", () => {
    const noSyn = [pkg("pk4", "No synopsis", "q1", UNFILLED_SLOT, "p1")];
    expect(packageRows(noSyn, versions, queries)[0].composition).toBe("Hook-first · Chapters 1-3");
  });

  it("has a null composition when every slot is unfilled", () => {
    const bare = [pkg("pk3", "Empty", UNFILLED_SLOT, UNFILLED_SLOT, UNFILLED_SLOT)];
    expect(packageRows(bare, versions, queries)[0].composition).toBeNull();
  });

  it("states absence in words rather than as a zero count", () => {
    expect(sentLine(0)).toBe("Not sent yet");
    expect(sentLine(0)).not.toContain("0");
  });

  it("agrees with its verb at one", () => {
    expect(sentLine(1)).toBe("Sent with 1 query");
    expect(sentLine(6)).toBe("Sent with 6 queries");
  });
});

describe("trackingRows", () => {
  const versions = [v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4))];
  const packages = [pkg("pk1", "Standard UK", "q1", UNFILLED_SLOT, UNFILLED_SLOT),
                    pkg("pk2", "Comps-led", "q1", UNFILLED_SLOT, UNFILLED_SLOT)];

  it("is empty until something has actually gone out", () => {
    expect(trackingRows(packages, versions, [])).toEqual([]);
    /* a query with no package attached is not a package send */
    expect(trackingRows(packages, versions, [q("1", "", QueryStatus.QUERIED)])).toEqual([]);
  });

  it("quotes the busiest package, and its figures match the engine", () => {
    const queries = [
      q("1", "pk1", QueryStatus.QUERIED),
      q("2", "pk1", QueryStatus.REJECTED, { hasAgentResponded: true }),
      q("3", "pk2", QueryStatus.QUERIED),
    ];
    const rows = trackingRows(packages, versions, queries);
    const m = packageMetrics("pk1", queries);
    expect(rows[0].detail).toBe(`Standard UK · ${m.responses} of ${m.sent} replied`);
  });

  it("counts requests as events and agrees with its noun", () => {
    const one = [q("1", "pk1", QueryStatus.FULL_REQUESTED)];
    expect(trackingRows(packages, versions, one)[1].detail).toBe("1 request logged");
    const two = [q("1", "pk1", QueryStatus.FULL_REQUESTED), q("2", "pk1", QueryStatus.PARTIAL_REQUESTED)];
    expect(trackingRows(packages, versions, two)[1].detail).toBe("2 requests logged");
  });

  it("states no requests rather than a zero", () => {
    const sent = [q("1", "pk1", QueryStatus.QUERIED)];
    expect(trackingRows(packages, versions, sent)[1].detail).toBe("No requests yet");
  });

  /* A query pointing at a package that is not in the list (another manuscript's, or retired) is
     not this register's send. */
  it("ignores a query whose package is not among these packages", () => {
    expect(packagedQueries(packages, [q("1", "elsewhere", QueryStatus.QUERIED)])).toEqual([]);
  });

  it("totals replies across every package", () => {
    const queries = [
      q("1", "pk1", QueryStatus.REJECTED, { hasAgentResponded: true }),
      q("2", "pk2", QueryStatus.FULL_REQUESTED),
      q("3", "pk2", QueryStatus.QUERIED),
    ];
    const total = packageMetrics("pk1", queries).responses + packageMetrics("pk2", queries).responses;
    expect(replyCount(packages, queries)).toBe(total);
  });
});

describe("howItWorks — the infographic doubles as progress", () => {
  it("has nothing ticked on a first visit", () => {
    const [a, b, c] = howItWorks(0, 0, 0);
    expect([a.tick, b.tick, c.tick]).toEqual([null, null, null]);
    expect([a.done, b.done, c.done]).toEqual([false, false, false]);
    expect(c.live).toBe(false);
  });

  it("ticks each step from its own count", () => {
    const [a, b, c] = howItWorks(4, 2, 3);
    expect(a.tick).toBe("✓ 4 ADDED");
    expect(b.tick).toBe("✓ 2 BUILT");
    expect(c.tick).toBe("● LIVE");
    expect(c.live).toBe(true);
  });

  /* Step 3 is the only one that can be LIVE — the pink treatment is its alone. */
  it("marks only step three live", () => {
    const [a, b, c] = howItWorks(4, 2, 1);
    expect([a.live, b.live]).toEqual([false, false]);
    expect(c.live).toBe(true);
  });

  it("leaves later steps untouched when an earlier one is done alone", () => {
    const [a, b, c] = howItWorks(3, 0, 0);
    expect(a.done).toBe(true);
    expect(b.tick).toBeNull();
    expect(c.tick).toBeNull();
  });

  /* ⚠️ DERIVED, NOT STORED (D2): the ticks follow the data back down. Deleting the last package
     un-ticks step 2 with no flag to clear. */
  it("un-ticks when the records go away", () => {
    expect(howItWorks(0, 0, 0)[1].tick).toBeNull();
  });
});

describe("packageTiles — the working stage's grid (flow pack D7)", () => {
  const versions = [
    v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)),
    v("s1", ComponentType.SYNOPSIS, "One-page", daysAgo(6)),
    v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3", daysAgo(9)),
  ];
  const withSample = pkg("pk1", "Standard UK", "q1", "s1", "p1");
  const noSample = pkg("pk2", "Letter + synopsis", "q1", "s1", UNFILLED_SLOT);

  it("always renders three slot rows, in canonical order", () => {
    const t = packageTiles([noSample], versions, [])[0];
    expect(t.slots.map((s) => s.label)).toEqual(["Covering letter", "Synopsis", "Sample pages"]);
  });

  /* ⚠️ THE ROW SURVIVES AN EMPTY SLOT. A row that vanishes states nothing; a null name lets the
     component say "Not included", which states that the slot was considered and left out. */
  it("keeps the sample row with a null name when the slot is empty", () => {
    const t = packageTiles([noSample], versions, [])[0];
    expect(t.slots[2]).toEqual({ label: "Sample pages", name: null, state: "empty" });
  });

  /**
   * ⚠️ THE THREE STATES, ASSERTED AS THREE. `name` alone could not tell "left blank" from "the
   * material is gone" — both were `null` — so a package that once held a letter rendered exactly
   * like one that never had one. That is the state the archive model made reachable.
   */
  it("tells an empty slot apart from one whose material is gone", () => {
    const orphaned = pkg("pk5", "Orphan", "gone", UNFILLED_SLOT, "p1");
    const t = packageTiles([orphaned], versions, [])[0];
    expect(t.slots.map((sl) => sl.state)).toEqual(["missing", "empty", "held"]);
    expect(t.slots[0].name).toBe(MISSING_SLOT);
    expect(t.slots[1].name).toBeNull();
  });

  it("resolves filled slots to their material names", () => {
    const t = packageTiles([withSample], versions, [])[0];
    expect(t.slots.map((s) => s.name)).toEqual(["Hook-first", "One-page", "Chapters 1-3"]);
  });

  /* two derivations against each other, never a literal on both sides */
  it("reports the same figures the engine does", () => {
    const queries = [
      q("1", "pk1", QueryStatus.QUERIED),
      q("2", "pk1", QueryStatus.FULL_REQUESTED),
      q("3", "pk1", QueryStatus.REJECTED, { hasAgentResponded: true }),
    ];
    const t = packageTiles([withSample], versions, queries)[0];
    const m = packageMetrics("pk1", queries);
    expect(t.sent).toBe(m.sent);
    expect(t.replies).toBe(m.responses);
    expect(t.requests).toBe(queries.filter(isRequestExport).length);
  });

  it("states absence in words when nothing has gone out", () => {
    const foot = tileFooter(packageTiles([withSample], versions, [])[0]);
    expect(foot).toEqual({ idle: "Not yet sent — attach it when you log a query" });
  });

  it("shows the scorecard in direction order once it has", () => {
    const queries = [q("1", "pk1", QueryStatus.QUERIED), q("2", "pk1", QueryStatus.FULL_REQUESTED)];
    const foot = tileFooter(packageTiles([withSample], versions, queries)[0]) as Record<string, string>;
    expect(foot.out).toBe("→ 2 sent");
    expect(foot.replied).toBe("← 1 replied");
    expect(foot.requests).toBe("1 request");
  });

  it("agrees with its noun at two requests", () => {
    const queries = [q("1", "pk1", QueryStatus.FULL_REQUESTED), q("2", "pk1", QueryStatus.PARTIAL_REQUESTED)];
    const foot = tileFooter(packageTiles([withSample], versions, queries)[0]) as Record<string, string>;
    expect(foot.requests).toBe("2 requests");
  });
});

describe("materialColumns — the broadsheet's three type columns (D3)", () => {
  const versions = [
    v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)),
    v("q2", ComponentType.QUERY_LETTER, "Comps-forward", daysAgo(14)),
    v("s1", ComponentType.SYNOPSIS, "One-page", daysAgo(6)),
    v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3", daysAgo(9)),
  ];
  const packages = [pkg("pk1", "Standard UK", "q1", "s1", "p1")];

  it("gives exactly three columns, in canonical order, with PLURAL headings", () => {
    const cols = materialColumns(versions, packages);
    expect(cols.map((c) => c.heading)).toEqual(["Covering letters", "Synopses", "Sample pages"]);
  });

  it("never offers a Full Manuscript column", () => {
    expect(materialColumns(versions, packages).map((c) => c.type))
      .not.toContain(ComponentType.FULL_MANUSCRIPT);
  });

  it("counts what each column holds", () => {
    expect(materialColumns(versions, packages).map((c) => c.held)).toEqual([2, 1, 1]);
  });

  it("carries the ref's own per-type ghost wording", () => {
    expect(materialColumns(versions, packages).map((c) => c.ghostLabel))
      .toEqual(["Add a letter", "Add a synopsis", "Add sample pages"]);
  });

  /* ⚠️ ONE DERIVATION FOR THE LINE AND THE GUARD. If these could differ, a sheet could say a
     material is free while the delete guard refuses it. */
  it("prints the usage the guard will read", () => {
    const cols = materialColumns(versions, packages);
    const hook = cols[0].sheets.find((s) => s.name === "Hook-first")!;
    expect(hook.usedIn).toBe(packagesUsing("q1", packages).length);
    expect(hook.usage).toBe(usageLine(hook.usedIn));
    expect(hook.usage).toBe("In 1 package");
  });

  it("states absence in words rather than as a zero", () => {
    const free = materialColumns(versions, packages)[0].sheets.find((s) => s.name === "Comps-forward")!;
    expect(free.usage).toBe("Not in a package yet");
    expect(free.usage).not.toContain("0");
    expect(free.usedIn).toBe(0);
  });

  it("agrees with its noun at two packages", () => {
    const two = [...packages, pkg("pk2", "Second", "q1", "s1", UNFILLED_SLOT)];
    expect(usageLine(packagesUsing("q1", two).length)).toBe("In 2 packages");
  });

  it("carries the flow pack's source label unchanged", () => {
    const withText = [v("q3", ComponentType.QUERY_LETTER, "Pasted", daysAgo(1), "one two three")];
    expect(materialColumns(withText, [])[0].sheets[0].source).toBe("Text · 3 words");
  });

  it("ignores an unfilled slot rather than matching the empty sentinel", () => {
    const noSample = [pkg("pk9", "No sample", "q1", "s1", UNFILLED_SLOT)];
    expect(packagesUsing(UNFILLED_SLOT, noSample)).toEqual([]);
  });

  /**
   * ⚠️ TWO DERIVATIONS AGAINST EACH OTHER, NOT AGAINST A LITERAL. `packagesUsing` drives the usage
   * line a writer reads and the number the archive guard will refuse on; `packagesUsingVersion`
   * drives `componentMetrics`, `mostUsedVersionOfType` and `materialUsage`. `packagesUsing` was
   * briefly its OWN filter over the same slots — two answers to one question, agreeing on every
   * input the app can produce, which is how that pair survives until somebody edits one of them.
   * A `toEqual(["pk1"])` on both sides would go green the day both moved the same wrong way.
   *
   * ⚠️ AND THE IDS ARE TAKEN FROM THE FIXTURE, NOT TYPED. Every real material id is a Firestore
   * document id — the sentinel case above is the one input the app cannot produce, and it is
   * asserted separately because the guard, unlike the matching, genuinely is this module's own.
   */
  it("reconciles with packageMetrics rather than restating its matching", () => {
    const two = [...packages, pkg("pk2", "Second", "q1", "s1", UNFILLED_SLOT)];
    const ids = versions.map((v) => v.id);
    expect(ids.length).toBeGreaterThan(2);
    for (const id of ids) {
      expect(packagesUsing(id, two).map((p) => p.id), `disagreed about ${id}`)
        .toEqual(packagesUsingVersion(id, two).map((p) => p.id));
    }
  });

  /** The sheet's words and the guard's number are the same derivation, so they cannot disagree. */
  it("prints the number the guard will read", () => {
    for (const col of materialColumns(versions, packages)) {
      for (const sheet of col.sheets) {
        expect(sheet.usedIn).toBe(packagesUsing(sheet.id, packages).length);
        expect(sheet.usage).toBe(usageLine(sheet.usedIn));
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   THE ARCHIVE MODEL (Ruling 2)
   ══════════════════════════════════════════════════════════════════════════════ */

describe("isRetired — absent means Active", () => {
  /**
   * ⚠️ THE DEFAULT IS THE WHOLE TEST. Every material and package written before the field existed
   * has no `status`; a `=== "Active"` predicate reads all of them as retired and empties the page.
   * That is a one-character mistake with a total blast radius, so it is asserted first.
   */
  it("reads a record with no status as active", () => {
    expect(isRetired({})).toBe(false);
    expect(isRetired({ status: undefined })).toBe(false);
  });

  it("reads Active as active and Retired as retired", () => {
    expect(isRetired({ status: "Active" })).toBe(false);
    expect(isRetired({ status: "Retired" })).toBe(true);
  });
});

/* Built with the module's own helpers, so the fixtures are the shape the app writes. */
const ARCH_VERSIONS = [
  v("q1", ComponentType.QUERY_LETTER, "Hook-first", daysAgo(4)),
  v("q2", ComponentType.QUERY_LETTER, "Comps-forward", daysAgo(9)),
  v("s1", ComponentType.SYNOPSIS, "One-page", daysAgo(6)),
  v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3", daysAgo(2)),
];
const ARCH_PACKAGES = [pkg("pk1", "Hook + one-page", "q1", "s1", "p1")];

describe("removalChoice — the data decides, not the writer", () => {
  it("deletes a material nothing holds", () => {
    const free = [pkg("pkA", "Other", "q9", "s9", UNFILLED_SLOT)];
    expect(removalChoice("q1", free)).toEqual({ kind: "delete", usedIn: 0, packageNames: [] });
  });

  it("archives a material a package holds, and names the packages", () => {
    const held = [pkg("pkA", "Hook + one-page", "q1", "s1", UNFILLED_SLOT)];
    expect(removalChoice("q1", held)).toEqual({ kind: "archive", usedIn: 1, packageNames: ["Hook + one-page"] });
  });

  /**
   * ⚠️ A RETIRED PACKAGE STILL COUNTS. It is a record of what was sent; deleting the material out
   * from under it would damage a package the writer archived rather than discarded. The band hides
   * retired packages — this question is not about the band.
   */
  it("counts a retired package as a holder", () => {
    const retired = [{ ...pkg("pkR", "Old bundle", "q1", "s1", UNFILLED_SLOT), status: "Retired" as const }];
    expect(removalChoice("q1", retired).kind).toBe("archive");
  });

  /** The sheet's number and the choice's number are the same derivation, so they cannot disagree. */
  it("counts what the sheet prints", () => {
    for (const col of materialColumns(ARCH_VERSIONS, ARCH_PACKAGES)) {
      for (const sheet of col.sheets) {
        const choice = removalChoice(sheet.id, ARCH_PACKAGES);
        expect(choice.usedIn).toBe(sheet.usedIn);
        expect(choice.kind).toBe(sheet.usedIn === 0 ? "delete" : "archive");
      }
    }
  });
});

describe("archiving a material does not damage the packages holding it", () => {
  /**
   * ⚠️ THE INVARIANT THE WHOLE MODEL RESTS ON, and it is one filter away from being false. The band
   * lists Active only; a package's slots resolve against the FULL list. Filter both against the
   * same set and archiving becomes indistinguishable from deleting — which is the one thing it
   * exists to avoid.
   */
  it("leaves the band and stays in the package", () => {
    const held = [pkg("pkA", "Hook + one-page", "q1", "s1", UNFILLED_SLOT)];
    const archived = ARCH_VERSIONS.map((x) => (x.id === "q1" ? { ...x, status: "Retired" as const } : x));

    const listed = materialColumns(archived, held).flatMap((c) => c.sheets).map((sh) => sh.id);
    expect(listed, "an archived material is still in the working list").not.toContain("q1");

    const tile = packageTiles(held, archived, [])[0];
    expect(tile.slots[0].state, "archiving broke the package that held it").toBe("held");
    expect(tile.slots[0].name).toBe(ARCH_VERSIONS.find((x) => x.id === "q1")!.versionName);
  });

  /** And the count follows: the band's `held` drops by one, the package's is unchanged. */
  it("drops the band count without touching the package", () => {
    const held = [pkg("pkA", "Hook + one-page", "q1", "s1", UNFILLED_SLOT)];
    const before = materialColumns(ARCH_VERSIONS, held)[0].held;
    const archived = ARCH_VERSIONS.map((x) => (x.id === "q1" ? { ...x, status: "Retired" as const } : x));
    expect(materialColumns(archived, held)[0].held).toBe(before - 1);
    expect(packageRows(held, archived, [])[0].composition).toContain("Hook-first");
  });
});

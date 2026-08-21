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
} from "./packagesOverview";
import { packageMetrics, UNFILLED_SLOT, isRequest as isRequestExport } from "./packageMetrics";
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

  it("omits a slot whose version has been deleted rather than printing a blank", () => {
    const orphaned = [pkg("pk2", "Half", "q1", "gone", "p1")];
    expect(packageRows(orphaned, versions, queries)[0].composition).toBe("Hook-first · Chapters 1-3");
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
    expect(t.slots[2]).toEqual({ label: "Sample pages", name: null });
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
});

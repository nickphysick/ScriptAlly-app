/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The tracking dashboard's adapter.
 *
 * ⚠️ THE AGGREGATION CASE IS THE ONE THAT MATTERS. A material's figures are the SUM across every
 * package containing it, because one synopsis in three packages has travelled as many times as those
 * three packages have. Counting only one would understate every shared material — and a writer
 * typically keeps one synopsis and varies the letter, so that is most of them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  trackingTotals, repliesByPackage, requestsByMaterial, packagesContaining, trackingNudge, STAT_CELLS,
} from "./packageTracking";
import { packageMetrics, UNFILLED_SLOT } from "./packageMetrics";
import { ComponentType, QueryStatus } from "../types";
import type { ManuscriptVersion, SubmissionPackage, Query } from "../types";

const v = (id: string, type: ComponentType, name: string): ManuscriptVersion => ({
  id, manuscriptId: "m1", userId: "u1", componentType: type, versionName: name,
  fileAttached: false, createdDate: "2026-08-01T00:00:00.000Z",
});
const pkg = (id: string, name: string, ql: string, syn: string, sam: string): SubmissionPackage => ({
  id, manuscriptId: "m1", userId: "u1", packageName: name,
  queryLetterVersionId: ql, synopsisVersionId: syn, samplePagesVersionId: sam,
  status: "Active", createdDate: "2026-07-01T00:00:00.000Z",
});
const q = (id: string, packageId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", manuscriptId: "m1", agentId: `a-${id}`, packageId, status,
  dateSent: "2026-07-15", ...extra,
} as Query);

const LETTER_A = v("l1", ComponentType.QUERY_LETTER, "Hook-first");
const LETTER_B = v("l2", ComponentType.QUERY_LETTER, "Comps-forward");
const SYN = v("s1", ComponentType.SYNOPSIS, "One-page");
const SAMPLE = v("p1", ComponentType.SAMPLE_PAGES, "Chapters 1-3");
const VERSIONS = [LETTER_A, LETTER_B, SYN, SAMPLE];

/* two packages that SHARE the synopsis and the sample, and differ only by letter — the shape a
   writer actually produces, and the one the aggregation has to get right */
const PK1 = pkg("pk1", "Standard UK", "l1", "s1", "p1");
const PK2 = pkg("pk2", "Comps-led", "l2", "s1", "p1");
const PACKAGES = [PK1, PK2];

const QUERIES = [
  q("1", "pk1", QueryStatus.QUERIED),
  q("2", "pk1", QueryStatus.FULL_REQUESTED),
  q("3", "pk1", QueryStatus.REJECTED, { hasAgentResponded: true }),
  q("4", "pk2", QueryStatus.QUERIED),
  q("5", "pk2", QueryStatus.PARTIAL_REQUESTED),
  /* a query with no package — must be invisible to every figure here */
  q("6", "", QueryStatus.FULL_REQUESTED),
];

describe("trackingTotals", () => {
  it("counts only queries carrying one of these packages", () => {
    expect(trackingTotals(PACKAGES, QUERIES).sent).toBe(5);
  });

  it("ignores a query pointing at a package that is not on this manuscript", () => {
    expect(trackingTotals(PACKAGES, [q("x", "elsewhere", QueryStatus.QUERIED)]).sent).toBe(0);
  });

  /* two derivations against each other */
  it("reports the replies the engine reports", () => {
    const t = trackingTotals(PACKAGES, QUERIES);
    expect(t.replies).toBe(
      packageMetrics("pk1", QUERIES).responses + packageMetrics("pk2", QUERIES).responses,
    );
  });

  it("counts requests as events", () => {
    expect(trackingTotals(PACKAGES, QUERIES).requests).toBe(2);
  });

  it("is all zeros with nothing sent", () => {
    expect(trackingTotals(PACKAGES, [])).toEqual({ sent: 0, replies: 0, requests: 0 });
  });

  it("names its three cells in direction order", () => {
    expect(STAT_CELLS.map((c) => c.key)).toEqual(["sent", "replies", "requests"]);
    expect(STAT_CELLS.map((c) => c.dir)).toEqual(["→", "←", "←"]);
  });
});

describe("repliesByPackage", () => {
  it("gives one row per package that has gone out", () => {
    expect(repliesByPackage(PACKAGES, QUERIES).map((r) => r.name)).toEqual(["Standard UK", "Comps-led"]);
  });

  /* ⚠️ OMITTED, NOT DRAWN AT ZERO. "0 of 0 replied" asserts a measurement nobody took; the package
     is already visible as a tile saying "Not yet sent". */
  it("omits a package that has never been sent", () => {
    const unsent = pkg("pk3", "Never sent", "l1", "s1", UNFILLED_SLOT);
    expect(repliesByPackage([...PACKAGES, unsent], QUERIES).map((r) => r.name)).not.toContain("Never sent");
  });

  it("is empty when nothing has gone out at all", () => {
    expect(repliesByPackage(PACKAGES, [])).toEqual([]);
  });

  it("states the count, never a rate", () => {
    const row = repliesByPackage(PACKAGES, QUERIES)[0];
    expect(row.meta).toBe("2 of 3 replied");
    expect(row.meta).not.toMatch(/%/);
  });

  /* ⚠️ ONE SHARED MAXIMUM, so bar lengths compare between rows. Scaled to its own total, a single
     send would look the same as six. */
  it("scales every bar against the busiest package", () => {
    const rows = repliesByPackage(PACKAGES, QUERIES);
    expect(rows[0].sentPct).toBe(100);        // 3 sends, the max
    expect(rows[1].sentPct).toBeCloseTo(200 / 3);  // 2 of 3
  });

  it("scales the inner bar against its own row", () => {
    const rows = repliesByPackage(PACKAGES, QUERIES);
    expect(rows[0].inPct).toBeCloseTo(200 / 3);   // 2 replies of 3 sent
  });
});

describe("requestsByMaterial — the aggregation", () => {
  it("finds every package a material sits in, by any slot", () => {
    expect(packagesContaining("s1", PACKAGES).map((p) => p.id)).toEqual(["pk1", "pk2"]);
    expect(packagesContaining("l1", PACKAGES).map((p) => p.id)).toEqual(["pk1"]);
  });

  it("ignores an unfilled slot rather than matching the empty sentinel", () => {
    const noSample = pkg("pk9", "No sample", "l1", "s1", UNFILLED_SLOT);
    expect(packagesContaining(UNFILLED_SLOT, [noSample])).toEqual([]);
  });

  /* ⚠️ THE CASE THIS PANEL EXISTS FOR. The synopsis is in BOTH packages, so its sends are the sum of
     both — 5, not 3. A per-package reading would understate it every time. */
  it("sums a shared material across every package containing it", () => {
    const rows = requestsByMaterial(PACKAGES, VERSIONS, QUERIES);
    const syn = rows.find((r) => r.name === "One-page");
    expect(syn?.meta).toBe("2 requests from 5 sent");
  });

  it("keeps an exclusive material to its own package's figures", () => {
    const rows = requestsByMaterial(PACKAGES, VERSIONS, QUERIES);
    expect(rows.find((r) => r.name === "Hook-first")?.meta).toBe("1 request from 3 sent");
    expect(rows.find((r) => r.name === "Comps-forward")?.meta).toBe("1 request from 2 sent");
  });

  it("carries the type as an eyebrow, read from TYPE_META", () => {
    const rows = requestsByMaterial(PACKAGES, VERSIONS, QUERIES);
    expect(rows.find((r) => r.name === "Hook-first")?.eyebrow).toBe("Covering letter");
  });

  it("omits a material that has never travelled", () => {
    const spare = v("l3", ComponentType.QUERY_LETTER, "Voice-led");
    const rows = requestsByMaterial(PACKAGES, [...VERSIONS, spare], QUERIES);
    expect(rows.map((r) => r.name)).not.toContain("Voice-led");
  });

  it("agrees with its noun at one request", () => {
    const one = [q("1", "pk1", QueryStatus.FULL_REQUESTED)];
    expect(requestsByMaterial(PACKAGES, VERSIONS, one)[0].meta).toBe("1 request from 1 sent");
  });

  it("says from N sent rather than a percentage", () => {
    for (const r of requestsByMaterial(PACKAGES, VERSIONS, QUERIES)) {
      expect(r.meta).not.toMatch(/%/);
      expect(r.meta).toMatch(/from \d+ sent$/);
    }
  });
});

describe("trackingNudge", () => {
  it("names the first package while nothing has gone out", () => {
    expect(trackingNudge(PACKAGES, [])).toEqual({ packageName: "Standard UK" });
  });

  /* a nudge to do the thing you have already done makes a page feel unaware */
  it("is gone once anything has been sent", () => {
    expect(trackingNudge(PACKAGES, QUERIES)).toBeNull();
  });

  it("is absent with no packages at all", () => {
    expect(trackingNudge([], [])).toBeNull();
  });
});

describe("D8 — the adapter is the only thing reading query data, and it reaches into nothing", () => {
  const src = readFileSync(new URL("./packageTracking.ts", import.meta.url), "utf8");
  /* ⚠️ COMMENTS STRIPPED. This module's own docstring names Query Centre twice, explaining what it
     does NOT import — so a bare check would fail on the prose that documents the rule. */
  const decls = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const imports = [...decls.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

  it("imports only types, packageMetrics and typeMeta", () => {
    expect(imports.sort()).toEqual(["../components/packages/typeMeta", "../types", "./packageMetrics"]);
  });

  /* the brief's constraint, stated as the thing it forbids rather than the list it allows */
  it("imports nothing from a Query Centre component file", () => {
    for (const i of imports) {
      expect(i, `${i} reaches into a component file`).not.toMatch(/components\/(Queries|queries|f12)/);
      expect(i).not.toMatch(/Queries/);
    }
  });

  it("imports no React and no Firestore, so it stays testable and pure", () => {
    expect(imports).not.toContain("react");
    expect(imports.some((i) => i.startsWith("firebase/"))).toBe(false);
  });

  /* ⚠️ AND IT DOES NOT READ THE ACTIVITY LOG. recomputeQuery is the single writer that turns
     activities into query state; deriving replies from the log again would be a second
     implementation of something it owns. */
  it("derives from queries, never from the activity log", () => {
    expect(decls).not.toContain("ActivityType");
    expect(decls).not.toMatch(/\bactivities\b/);
  });

  /* counts only — packageMetrics exposes rates and this module deliberately ignores them */
  it("takes no rate from the engine", () => {
    expect(decls).not.toContain("requestRate");
    expect(decls).not.toContain("responseRate");
  });
});

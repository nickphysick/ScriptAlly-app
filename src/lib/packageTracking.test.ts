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
import { sliceBetween } from "../test/sliceBetween";
import {
  trackingTotals, requestsByMaterial, packagesContaining, trackingNudge, packageStamp, STAMP_ICONS,
} from "./packageTracking";
import { packageMetrics, UNFILLED_SLOT } from "./packageMetrics";
import { activityEventLabel } from "./activityEvent";
import { ActivityType, ComponentType, QueryStatus } from "../types";
import type { Activity, Agent, ManuscriptVersion, SubmissionPackage, Query } from "../types";

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

/* ══════════════════════════════════════════════════════════════════════════════
   THE LEDGER (broadsheet §4)
   ══════════════════════════════════════════════════════════════════════════════ */

const NOW = Date.parse("2026-08-21T12:00:00.000Z");
const agent = (id: string, name: string, agency = "Some Agency"): Agent =>
  ({ id, userId: "u1", name, agency } as Agent);
const AGENTS = [
  agent("a-1", "Jonathan Fairfax"), agent("a-2", "R. Osei"),
  agent("a-4", "A. Whitmore"), agent("a-5", "M. Okonkwo"),
];
const act = (id: string, queryId: string, date: string, over: Partial<Activity> = {}): Activity => ({
  id, userId: "u1", queryId, manuscriptId: "m1",
  activityType: ActivityType.STATUS_CHANGED, description: "prose nothing reads",
  date, details: "", ...over,
});

describe("packageStamp — decorative, derived, stable", () => {
  /**
   * ⚠️ STABLE ACROSS A DELETION, which is the whole reason it hashes the id rather than taking an
   * index. An index-based stamp re-draws every card below a deleted one — a change with no cause
   * the writer can see.
   */
  it("gives one package the same stamp however the list is ordered", () => {
    const a = packageStamp("pk1");
    expect(packageStamp("pk1")).toBe(a);
    expect(STAMP_ICONS).toContain(a);
  });

  it("does not give every package the same one", () => {
    const seen = new Set(["pk1", "pk2", "pk3", "pk4", "pk5", "pk6"].map(packageStamp));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("D8 — the adapter is the only thing reading query data, and it reaches into nothing", () => {
  const src = readFileSync(new URL("./packageTracking.ts", import.meta.url), "utf8");
  /* ⚠️ COMMENTS STRIPPED. This module's own docstring names Query Centre twice, explaining what it
     does NOT import — so a bare check would fail on the prose that documents the rule. */
  const decls = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const imports = [...decls.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

  /**
   * ⚠️ THE BOUNDARY IS STATED AS WHAT IT FORBIDS, NOT AS A LIST OF WHAT IT ALLOWS — REWRITTEN in
   * broadsheet §4. This was `toEqual([...three modules])`, which is the whitelist shape: it goes red
   * on every honest addition, and the reflex is to append the new name, which is not review. The
   * ledger legitimately needs `activityEvent` (the app's ONE event labeller, whose own docstring
   * forbids writing a second) and `queryDerivation` (the normaliser `recomputeQuery` uses). Neither
   * is a component and neither is the Query Centre, so D8's actual constraint is untouched — but
   * only a rule phrased as a constraint could say so.
   */
  it("imports no component file except typeMeta", () => {
    for (const i of imports) {
      if (!i.includes("components/")) continue;
      expect(i, `${i} is a component import`).toBe("../components/packages/typeMeta");
    }
  });

  /** Everything else it reads is a pure lib module — nothing with a surface of its own. */
  it("imports only pure lib modules besides that", () => {
    for (const i of imports) {
      if (i.includes("components/")) continue;
      expect(i, `${i} is not a sibling lib module`).toMatch(/^\.\.?\/(types|[a-zA-Z]+)$/);
    }
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

  /**
   * ⚠️ THE RULE SPLIT RATHER THAN LAPSED (broadsheet §4). It read "derives from queries, never from
   * the activity log", banning `ActivityType` and `activities` outright — right for a module that
   * only ever counted, and wrong the moment it gained the Latest-activity ledger. An EVENT LIST is
   * the one thing query state cannot express: a query holds its current status, not the sequence
   * that produced it. So the ban moves to where the reason still applies.
   *
   * ⚠️ THE REASON, RESTATED, because it is the load-bearing half: `recomputeQuery` is the single
   * writer that turns activities into query state. Any COUNT re-derived from the log would be a
   * second implementation of what it owns, and the two would eventually disagree — the shape the
   * dashboard and the To-do board had to be reconciled out of after they counted "urgent" twice.
   *
   * Bounded with sliceBetween: a bare indexOf pair widens to the rest of the file when an anchor is
   * renamed, and every assertion then reads another function while passing.
   */
  /* ⚠️ THE ANCHORS ARE CODE, NEVER SECTION HEADINGS. Written first against the file's `═══` comment
     banners, which read perfectly and are the first thing `decls` deletes — every slice failed with
     "the END anchor is gone" about markers that are plainly in the file. A lock that strips comments
     cannot then navigate by them. */
  /* ⚠️ TWO ANCHORS WENT WITH THEIR FUNCTIONS (F-U). `export const STAT_CELLS` and
     `export function repliesByPackage` are deleted, and `sliceBetween` failed LOUDLY naming them —
     which is the whole reason this lock navigates with it rather than a bare `indexOf` pair, and is
     the difference between a lock that reports a retirement and one that silently widens to the
     rest of the file. Re-anchored on what survives; the claim is unchanged. */
  const COUNTERS = [
    ["trackingTotals", "export const packagesContaining"],
    ["export function requestsByMaterial", "export function trackingNudge"],
    ["export function trackingNudge", "export const STAMP_ICONS"],
  ] as const;

  it.each(COUNTERS)("%s counts from queries, never from the log", (from, to) => {
    const body = sliceBetween(decls, from, to, `${from} body`);
    expect(body).not.toContain("ActivityType");
    expect(body).not.toMatch(/\bactivities\b/);
    expect(body).not.toContain("activityEventLabel");
  });

  /**
   * ⚠️ AND THE LEDGER IS THE ONLY FUNCTION ALLOWED TO — asserted, so "it reads the log" stays a
   * property of one named function rather than of the file.
   */
  /**
   * ⚠️ THE LEDGER CASE IS RETIRED WITH ITS SUBJECT (F-U). It asserted that `ledgerRows` was the only
   * function reading the activity log; `ledgerRows` is deleted, so the claim has nothing to be about.
   * The stronger half survives as a whole-file property below — NOTHING here reads the log now.
   */
  it("reads no activity log at all, now the ledger is gone", () => {
    expect(decls).not.toMatch(/\bactivities\b/);
    expect(decls).not.toContain("ActivityType");
  });

  /* counts only — packageMetrics exposes rates and this module deliberately ignores them */
  it("takes no rate from the engine", () => {
    expect(decls).not.toContain("requestRate");
    expect(decls).not.toContain("responseRate");
  });
});

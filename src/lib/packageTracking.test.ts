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
  trackingTotals, repliesByPackage, requestsByMaterial, packagesContaining, trackingNudge, STAT_CELLS,
  ledgerRows, packageStamp, STAMP_BRIEFS,
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

describe("ledgerRows — three stores joined by real references", () => {
  const ACTS = [
    act("e1", "1", "2026-08-12T09:00:00.000Z", { activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED }),
    act("e2", "2", "2026-08-18T09:00:00.000Z", { resultingStatus: QueryStatus.FULL_REQUESTED }),
    act("e3", "5", "2026-08-14T09:00:00.000Z", { resultingStatus: QueryStatus.PARTIAL_REQUESTED }),
    /* on a query with NO package — must never appear in a panel about packages */
    act("e4", "6", "2026-08-20T09:00:00.000Z", { resultingStatus: QueryStatus.FULL_REQUESTED }),
  ];

  it("lists newest first", () => {
    expect(ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW).map((r) => r.id)).toEqual(["e2", "e3", "e1"]);
  });

  /**
   * ⚠️ THE ONE THE PANEL'S HEADING DEPENDS ON. It sits inside a Tracking band whose every count
   * excludes unpackaged queries; an event from one would put a figure on the page that none of the
   * numbers above it include.
   */
  it("excludes an event on a query that carried no package", () => {
    expect(ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW).map((r) => r.id)).not.toContain("e4");
  });

  it("names the agent and the direction together", () => {
    const [full, partial, sent] = ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW);
    expect(full.direction).toBe("in");
    expect(full.who).toBe("from R. Osei");
    expect(partial.direction).toBe("in");
    expect(sent.direction).toBe("out");
    expect(sent.who).toBe("to Jonathan Fairfax");
  });

  /**
   * ⚠️ THE LABEL IS `activityEventLabel`'s, ASSERTED AGAINST IT rather than typed here. A literal
   * would be a second copy of a vocabulary whose own module exists to stop exactly that — and it
   * would pass on the day the labeller changed and this panel stopped matching the timeline.
   */
  it("speaks the app's one event vocabulary", () => {
    for (const row of ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW)) {
      const source = ACTS.find((a) => a.id === row.id)!;
      expect(row.what).toBe(activityEventLabel(source, { includeSend: true }));
    }
  });

  /** ⚠️ AND THE SEND IS INCLUDED — this panel has no hero row, which is what `includeSend` is for. */
  it("draws the query going out, which a hero-row surface suppresses", () => {
    const rows = ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW);
    expect(rows.find((r) => r.id === "e1")?.what).toBe("Query sent");
  });

  /** A deleted agent leaves a dangling id; inventing a name for it is worse than omitting it. */
  it("omits the clause rather than naming an agent it cannot resolve", () => {
    const row = ledgerRows(ACTS, QUERIES, [], PACKAGES, NOW)[0];
    expect(row.who).toBeNull();
    expect(row.what).toBeTruthy();
  });

  it("names the package that travelled", () => {
    const rows = ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW);
    expect(rows.map((r) => r.packageName)).toEqual(["Standard UK", "Comps-led", "Standard UK"]);
  });

  it("drops the year in the current one and keeps it otherwise", () => {
    const old = [act("e9", "1", "2025-03-04T09:00:00.000Z", { resultingStatus: QueryStatus.FULL_REQUESTED })];
    expect(ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW)[0].date).toBe("18 AUG");
    expect(ledgerRows(old, QUERIES, AGENTS, PACKAGES, NOW)[0].date).toBe("04 MAR 2025");
  });

  it("caps at the limit it is given", () => {
    expect(ledgerRows(ACTS, QUERIES, AGENTS, PACKAGES, NOW, 2)).toHaveLength(2);
  });

  /** An event with no typed signal is inert — never mis-mapped from its description prose. */
  it("drops an event with no typed status signal", () => {
    const untyped = [act("e8", "1", "2026-08-19T09:00:00.000Z")];
    expect(ledgerRows(untyped, QUERIES, AGENTS, PACKAGES, NOW)).toEqual([]);
  });
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
    expect(STAMP_BRIEFS).toContain(a);
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
  const COUNTERS = [
    ["trackingTotals", "export const STAT_CELLS"],
    ["export function repliesByPackage", "export const packagesContaining"],
    ["export function requestsByMaterial", "export function trackingNudge"],
    ["export function trackingNudge", "export const STAMP_BRIEFS"],
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
  it("confines the activity log to the ledger", () => {
    const ledger = sliceBetween(decls, "export function ledgerRows", "\n}", "ledgerRows body");
    expect(ledger).toMatch(/\bactivities\b/);
    const rest = decls.replace(sliceBetween(decls, "function directionOf", "export function ledgerRows", "event section"), "")
      .replace(ledger, "");
    expect(rest, "the log leaked outside the ledger").not.toMatch(/\bactivities\b/);
  });

  /* counts only — packageMetrics exposes rates and this module deliberately ignores them */
  it("takes no rate from the engine", () => {
    expect(decls).not.toContain("requestRate");
    expect(decls).not.toContain("responseRate");
  });
});

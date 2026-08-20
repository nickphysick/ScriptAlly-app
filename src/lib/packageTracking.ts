/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The tracking dashboard's adapter — every figure it shows, derived at read time.
 * Design authority: design-refs/submission-packages-flow.html.
 *
 * ⚠️ THIS IS THE ONLY THING THAT READS QUERY DATA FOR THIS PAGE, AND IT IMPORTS NOTHING FROM QUERY
 * CENTRE (D8). It takes plain `Query[]` and asks `packageMetrics` — a lib — what they mean. No
 * component file from that feature is imported, directly or transitively, so the dashboard cannot be
 * broken by a Query Centre refactor and cannot reach into one.
 *
 * ⚠️ AND IT DOES NOT READ THE ACTIVITY LOG. A reply and a request are not activity types to be
 * re-parsed: `Activity` carries `resultingStatus`, and `recomputeQuery` is the single writer that
 * turns the log into the query's derived state. The canonical reading is therefore the QUERY, via
 * `isResponse` / `isRequest`. Deriving them again from activities would be a second implementation
 * of something `recomputeQuery` owns — the divergence that had the dashboard and the To-do board
 * disagreeing about the word "urgent".
 *
 * ⚠️ COUNTS ONLY — NO RATES, NO PERCENTAGES. `packageMetrics` exposes `requestRate` and
 * `responseRate` and this module deliberately ignores them: at the sample sizes querying produces, a
 * request rate is noise wearing a percentage sign (the framing `AnalyticsTab` already argues for
 * itself, and `MIN_SENDS_FOR_CLAIM` exists for). The bars are proportions of a shared maximum, which
 * is a picture of relative volume rather than a claim about performance.
 *
 * Pure: no Firestore, no React, no clock.
 */
import { ManuscriptVersion, SubmissionPackage, Query } from "../types";
import { packageMetrics, isRequest, isSlotFilled } from "./packageMetrics";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "../components/packages/typeMeta";

/* ══════════════════════════════════════════════════════════════════════════════
   THE STAT STRIP
   ══════════════════════════════════════════════════════════════════════════════ */

export interface TrackingTotals {
  sent: number;
  replies: number;
  requests: number;
}

/** The three headline counts, across every package on the manuscript. */
export function trackingTotals(packages: SubmissionPackage[], queries: Query[]): TrackingTotals {
  const ids = new Set(packages.map((p) => p.id));
  const mine = queries.filter((q) => !!q.packageId && ids.has(q.packageId));
  return {
    sent: mine.length,
    replies: packages.reduce((n, p) => n + packageMetrics(p.id, queries).responses, 0),
    requests: mine.filter(isRequest).length,
  };
}

/** The strip's three cells, with their direction glyphs. Copy verbatim from the ref. */
export const STAT_CELLS = [
  { key: "sent" as const, dir: "→", direction: "out" as const, label: "Queries sent with a package" },
  { key: "replies" as const, dir: "←", direction: "in" as const, label: "Replies received" },
  { key: "requests" as const, dir: "←", direction: "in" as const, label: "Requests for more" },
];

/* ══════════════════════════════════════════════════════════════════════════════
   REPLIES BY PACKAGE
   ══════════════════════════════════════════════════════════════════════════════ */

export interface BarRow {
  id: string;
  name: string;
  /** Mono eyebrow above the name — the material's type. Absent for package rows. */
  eyebrow?: string;
  meta: string;
  /** Width of the "sent" bar as a percentage of the widest row. */
  sentPct: number;
  /** Width of the "came back" bar, as a percentage OF THIS ROW'S sent bar. */
  inPct: number;
}

const pct = (n: number, of: number): number => (of > 0 ? (n / of) * 100 : 0);

/**
 * One row per package that has actually gone out.
 *
 * ⚠️ A PACKAGE WITH NO SENDS IS OMITTED, NOT DRAWN AT ZERO. An empty bar labelled "0 of 0 replied"
 * asserts a measurement nobody has taken; the package is already visible as a tile saying "Not yet
 * sent", which is the honest place for that fact.
 *
 * ⚠️ THE BARS SHARE ONE MAXIMUM so their lengths are comparable between rows — a bar scaled to its
 * own total would make one send look like six.
 */
export function repliesByPackage(packages: SubmissionPackage[], queries: Query[]): BarRow[] {
  const rows = packages
    .map((p) => ({ p, m: packageMetrics(p.id, queries) }))
    .filter((x) => x.m.sent > 0);
  const max = Math.max(...rows.map((x) => x.m.sent), 1);
  return rows.map(({ p, m }) => ({
    id: p.id,
    name: p.packageName,
    meta: `${m.responses} of ${m.sent} replied`,
    sentPct: pct(m.sent, max),
    inPct: pct(m.responses, m.sent),
  }));
}

/* ══════════════════════════════════════════════════════════════════════════════
   REQUESTS BY MATERIAL
   ══════════════════════════════════════════════════════════════════════════════ */

/** Every package a material appears in, by any slot. */
export const packagesContaining = (versionId: string, packages: SubmissionPackage[]): SubmissionPackage[] =>
  packages.filter((p) => BUILDER_TYPES.some((t) => {
    const id = p[SLOT_FIELD[t]];
    return isSlotFilled(id) && id === versionId;
  }));

/**
 * One row per material that has travelled, aggregating across EVERY sent package containing it.
 *
 * ⚠️ A MATERIAL'S FIGURES ARE THE SUM OF ITS PACKAGES', AND THAT IS THE WHOLE POINT OF THIS PANEL.
 * One synopsis sitting in three packages has been sent as many times as those three packages have,
 * and a request against any of them is a request that travelled with it. Counting only one package
 * would understate every shared material — which is most of them, since a writer typically keeps one
 * synopsis and varies the letter.
 *
 * ⚠️ AND IT SAYS "from N sent", NOT A RATE. A request is an EVENT, not a conversion: nothing here
 * claims the material caused anything, only that it was in the envelope.
 */
export function requestsByMaterial(
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  queries: Query[],
): BarRow[] {
  const rows = versions.map((v) => {
    const inPkgs = packagesContaining(v.id, packages);
    const ids = new Set(inPkgs.map((p) => p.id));
    const mine = queries.filter((q) => !!q.packageId && ids.has(q.packageId));
    return {
      v,
      sent: mine.length,
      requests: mine.filter(isRequest).length,
    };
  }).filter((x) => x.sent > 0);

  const max = Math.max(...rows.map((x) => x.sent), 1);
  return rows.map(({ v, sent, requests }) => ({
    id: v.id,
    name: v.versionName,
    eyebrow: TYPE_META[v.componentType].label,
    meta: `${requests} ${requests === 1 ? "request" : "requests"} from ${sent} sent`,
    sentPct: pct(sent, max),
    inPct: pct(requests, sent),
  }));
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE PRE-SENT NUDGE
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * The nudge shown while packages exist but nothing has gone out, naming the first one.
 *
 * Null once anything has been sent — the dashboard replaces it with real figures, and a nudge to do
 * the thing you have already done is the kind of stale prompt that makes a page feel unaware.
 */
export function trackingNudge(packages: SubmissionPackage[], queries: Query[]): { packageName: string } | null {
  if (packages.length === 0) return null;
  if (trackingTotals(packages, queries).sent > 0) return null;
  return { packageName: packages[0].packageName };
}

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
import { packageMetrics, isRequest, isSlotFilled, packagesUsingVersion } from "./packageMetrics";
import { TYPE_META } from "../components/packages/typeMeta";
/* ⚠️ THE APP'S ONE EVENT LABELLER, NOT A SECOND ONE. Its own docstring says why: "a second labeller
   for the dock is how two surfaces come to call one event different things". The ledger has no hero
   row above it, so it passes `includeSend` — the option that exists for exactly this case. */

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

/**
 * Every package a material appears in, by any slot.
 *
 * ⚠️ THE THIRD COPY OF ONE PREDICATE, NOW DELEGATED. This filter, `packagesOverview.packagesUsing`
 * and `packageMetrics.packagesUsingVersion` were three implementations of "does this package
 * reference this material" — driving the requests-by-material panel, the sheet's usage line and
 * `componentMetrics`/`materialUsage` respectively. Three answers to one question, agreeing on every
 * input the app can produce, which is how such a set survives until somebody edits one of them.
 *
 * ⚠️ AND THE NAME STAYS, because the panel reads better for it. Delegating is what matters; keeping
 * a local alias with a docstring costs nothing and renaming every call site would touch a locked
 * module's vocabulary for no gain.
 */
export const packagesContaining = (versionId: string, packages: SubmissionPackage[]): SubmissionPackage[] =>
  isSlotFilled(versionId) ? packagesUsingVersion(versionId, packages) : [];

/**
 * ⚠️ `BarRow` SURVIVES ITS ORIGINAL OWNER. It was introduced for `repliesByPackage`, which is gone;
 * `requestsByMaterial` returns it too and is live, so the shape stays. tsc caught this — the name
 * read as part of the retired band and is not.
 */
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

/* ⚠️ ALSO SHARED, and also nearly lost with the retired band — `requestsByMaterial` scales its
   bars with it. */
const pct = (n: number, of: number): number => (of > 0 ? (n / of) * 100 : 0);

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

/* ══════════════════════════════════════════════════════════════════════════════
   THE STAMP (broadsheet D7) — a package card's illustration slot
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * The ref gives three distinct stamps so a grid of cards does not read as a repeating pattern.
 *
 * ⚠️ IT RETURNS AN ICON NAME NOW, NOT A BRIEF (D4) — and the measurement is what caught the change
 * being half-made. The re-cut swapped every slot to a mark, this function kept returning
 * "stamp:\ntypewriter", and `PACKAGE_ICONS[that]` is undefined: the stamp plates rendered as empty
 * dashed boxes. Nothing errored, nothing logged, and the page looked deliberate.
 *
 * ⚠️ DERIVED FROM THE ID, NOT FROM THE INDEX. An index-based choice re-stamps every card below a
 * deleted one, so archiving your first package would silently redraw the rest — a change with no
 * cause the writer can see. A hash of the id is stable for the life of the record.
 *
 * ⚠️ AND NOTHING IS STORED. A `stamp` field would be a decoration in the data model, and the first
 * thing anyone would ask is why it cannot be chosen.
 */
export const STAMP_ICONS = ["parcel", "typewriter", "inkwell"] as const;

export function packageStamp(packageId: string): string {
  let h = 0;
  for (let i = 0; i < packageId.length; i++) h = (h * 31 + packageId.charCodeAt(i)) >>> 0;
  return STAMP_ICONS[h % STAMP_ICONS.length];
}

/* ══════════════════════════════════════════════════════════════════════════════
   LATEST ACTIVITY — the ledger
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ `STAT_CELLS`, `repliesByPackage`, `ledgerRows` AND `LedgerRow` ARE GONE (F-U, closed), with
 * their tests in the same commit. A tested export with no caller reads as live code to the next
 * session, which is how a deleted surface gets "restored".
 *
 * ⚠️ AND THE DEV REVIEW ROUTE WAS NOT THEIR CALLER, though the brief said it was. It imported
 * `PackageTabs`, `WorkshopTab` and `AnalyticsTab` and none of these — they had already been orphaned
 * by an earlier change. (That route has since been deleted too, with all three components.) `TrackingBand.tsx` carries a comment RECORDING that it stopped importing them, and that
 * comment is what makes a plain grep read as though a caller survived. Strip comments before
 * believing a reachability answer.
 */

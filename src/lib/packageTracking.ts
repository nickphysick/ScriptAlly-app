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
import { ActivityType, Agent, Activity, ManuscriptVersion, QueryStatus, SubmissionPackage, Query } from "../types";
import { packageMetrics, isRequest, isSlotFilled, packagesUsingVersion } from "./packageMetrics";
import { TYPE_META } from "../components/packages/typeMeta";
/* ⚠️ THE APP'S ONE EVENT LABELLER, NOT A SECOND ONE. Its own docstring says why: "a second labeller
   for the dock is how two surfaces come to call one event different things". The ledger has no hero
   row above it, so it passes `includeSend` — the option that exists for exactly this case. */
import { activityEventLabel } from "./activityEvent";
import { normalizeResultingStatus } from "./queryDerivation";

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
 * ⚠️ DERIVED FROM THE ID, NOT FROM THE INDEX. An index-based choice re-stamps every card below a
 * deleted one, so archiving your first package would silently redraw the rest — a change with no
 * cause the writer can see. A hash of the id is stable for the life of the record.
 *
 * ⚠️ AND NOTHING IS STORED. A `stamp` field would be a decoration in the data model, and the first
 * thing anyone would ask is why it cannot be chosen.
 */
export const STAMP_BRIEFS = ["stamp:\nparcel", "stamp:\ntypewriter", "stamp:\ninkwell"] as const;

export function packageStamp(packageId: string): string {
  let h = 0;
  for (let i = 0; i < packageId.length; i++) h = (h * 31 + packageId.charCodeAt(i)) >>> 0;
  return STAMP_BRIEFS[h % STAMP_BRIEFS.length];
}

/* ══════════════════════════════════════════════════════════════════════════════
   LATEST ACTIVITY — the ledger
   ══════════════════════════════════════════════════════════════════════════════ */

export interface LedgerRow {
  id: string;
  /** `18 AUG` — mono, uppercase, no year unless it is not this one. */
  date: string;
  /** Which way the envelope went. `out` is the writer's act, `in` is the agency's. */
  direction: "out" | "in";
  /** The event, in the app's ONE event vocabulary — "Query sent", "Full requested". */
  what: string;
  /** "to Jonathan Fairfax" / "from R. Osei" — never a pronoun, and never a guess. */
  who: string | null;
  /** The package that travelled. Always present: a row without one is not in this ledger. */
  packageName: string;
}

/**
 * ⚠️ THE WRITER'S ACTS AND THE AGENCY'S, SEPARATED BY WHAT PRODUCED THE EVENT — and closed with the
 * house `never` idiom so a new QueryStatus fails to compile rather than defaulting to a direction.
 * A default here would be wrong in the expensive direction: an incoming event drawn as outgoing
 * tells the writer they did something they did not.
 */
function directionOf(act: Pick<Activity, "activityType" | "resultingStatus">): "out" | "in" | null {
  if (act.activityType === ActivityType.QUERY_SENT) return "out";
  if (act.activityType === ActivityType.NUDGE_SENT) return "out";
  /* The offer decisions are the writer's, and neither is a thing the agency did. */
  if (act.activityType === ActivityType.OFFER_ACCEPTED) return "out";
  if (act.activityType === ActivityType.OFFER_DECLINED) return "out";

  const rs = normalizeResultingStatus(act.resultingStatus);
  if (!rs) return null;
  switch (rs) {
    case QueryStatus.QUERIED: return "out";
    case QueryStatus.PARTIAL_SENT: return "out";
    case QueryStatus.FULL_SENT: return "out";
    case QueryStatus.WITHDRAWN: return "out";
    case QueryStatus.PARTIAL_REQUESTED: return "in";
    case QueryStatus.FULL_REQUESTED: return "in";
    case QueryStatus.REVISE_RESUBMIT: return "in";
    case QueryStatus.OFFER: return "in";
    case QueryStatus.REJECTED: return "in";
    case QueryStatus.NO_RESPONSE: return "in";
    default: {
      const unhandled: never = rs;
      return unhandled;
    }
  }
}

/** `18 AUG`, and the year only when it is not the one we are in. */
function ledgerDate(iso: string, now: number): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  return d.getFullYear() === new Date(now).getFullYear() ? `${day} ${mon}` : `${day} ${mon} ${d.getFullYear()}`;
}

/**
 * The ledger — recent events on queries that carried a package.
 *
 * ⚠️ IT JOINS THREE STORES AND EVERY HOP IS A REAL REFERENCE. `Activity.queryId` → `Query.agentId`
 * → `Agent`, and `Query.packageId` → the package. Nothing is parsed out of `description` prose,
 * which is the rule `activityEvent.ts` exists to enforce: the old inline mapper substring-matched
 * descriptions and broke the day any copy was reworded.
 *
 * ⚠️ A ROW WITH NO PACKAGE IS NOT IN THIS LEDGER, and that is the panel's whole claim. It is headed
 * "Latest activity" inside a Tracking band about packages; listing an event from an unpackaged query
 * would put a figure on this page that none of the counts above it include.
 *
 * ⚠️ AND THE AGENT MAY BE UNRESOLVABLE — `who` is null rather than "Unknown agent". A deleted agent
 * leaves a query with a dangling `agentId`, and inventing a name for it is the one thing worse than
 * omitting the clause.
 */
export function ledgerRows(
  activities: Activity[],
  queries: Query[],
  agents: Agent[],
  packages: SubmissionPackage[],
  now: number,
  limit = 5,
): LedgerRow[] {
  const queryById = new Map(queries.map((q) => [q.id, q]));
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const pkgById = new Map(packages.map((p) => [p.id, p]));

  return activities
    .map((a) => {
      const q = queryById.get(a.queryId);
      if (!q || !q.packageId) return null;
      const pkg = pkgById.get(q.packageId);
      if (!pkg) return null;
      const direction = directionOf(a);
      if (!direction) return null;
      /* `includeSend` because this panel has no hero row — the option activityEvent.ts added after
         the dock silently dropped the send for exactly this reason. */
      const what = activityEventLabel(a, { includeSend: true });
      if (!what) return null;
      const agent = agentById.get(q.agentId);
      const name = agent ? [agent.name, agent.agency].find((x) => !!x?.trim()) ?? null : null;
      return {
        id: a.id,
        date: ledgerDate(a.date, now),
        direction,
        what,
        who: name ? `${direction === "out" ? "to" : "from"} ${name}` : null,
        packageName: pkg.packageName,
        _ms: Date.parse(a.date),
      };
    })
    .filter((r): r is LedgerRow & { _ms: number } => r !== null && !Number.isNaN(r._ms))
    .sort((a, b) => b._ms - a._ms)
    .slice(0, limit)
    .map(({ _ms, ...row }) => row);
}

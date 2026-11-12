/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * planComparison — what Free and Pro actually give you, in ONE place.
 *
 * ⚠️ IT USED TO BE A `GROUPS` CONST INSIDE `PlansPage.tsx`, unexported, beside a hardcoded
 * £3.99/£35. The settings card needed the same answers, and a second copy of a plan table is a
 * pair of surfaces that will eventually disagree about what someone is paying for.
 *
 * ⚠️ THE PRICE IS NOT HERE. Prices and lengths are `lib/planRules.ts` (plan rules v1): four plans, 1 month £7.99,
 * 3 months £19, 6 months £29, 12 months £45, rolling on monthly at £7.99.
 *
 * ⚠️ AND A PRICE IS STILL NOT A PAYMENT PATH. `PRO_PRICE_YEARLY` remains null, there is no Stripe,
 * no checkout, and `firestore.rules` denies a client-side plan change as its central guard — so
 * every surface goes on saying Pro is not on sale. Those are two different facts and collapsing
 * them is how a page starts implying something can be bought. `PlansPage`'s old £3.99/£35 was a
 * duplicate of a figure nobody could pay, and stays deleted rather than revived now that a real
 * one exists: one source, read by both tiers.
 *
 * ⚠️ PLAN RULES v1 (12 Nov) SUPERSEDES THE OLD "TWO ROWS CLAIMING A GATE" NOTE: packages, comps and the Scout ARE Pro
 * now, and the gates are in the code (lib/entitlements `canUse`/`readOnly`), so the table and the code agree again.
 *
 * ⚠️ ALLOWANCES ARE FIGURES; CAPABILITIES ARE TICK OR DASH — and never both inside one row. A row
 * reading "Unlimited" against a tick asks the reader to compare two different kinds of thing.
 * `planComparison.test.ts` asserts every row is one grammar or the other.
 */
import type { ProFeature } from "./planRules";

/** One side of one row. A figure states an allowance; included/absent state a capability. */
export type PlanCell =
  | { kind: "figure"; text: string }
  | { kind: "included" }
  | { kind: "absent" };

export interface PlanRow {
  label: string;
  /** The one-line description under the name — verbatim from design-refs/plan-table-v1.html. */
  sub: string;
  free: PlanCell;
  pro: PlanCell;
  /** On the seven rows that differ: the entitlement that row is (lib/planRules `PRO_FEATURES`). */
  feature?: ProFeature;
}

export interface PlanGroup { group: string; rows: PlanRow[] }

const figure = (text: string): PlanCell => ({ kind: "figure", text });
const YES: PlanCell = { kind: "included" };
const NO: PlanCell = { kind: "absent" };
const proOnly = (feature: ProFeature) => ({ free: NO, pro: YES, feature });

/**
 * PLAN RULES v1 — THE TABLE, grouped exactly as design-refs/plan-table-v1.html (SHA256 cf5ae3db…b2db64): group, label,
 * one-line description, Free cell, Pro cell. This is the one statement of what each plan includes; the entitlement
 * resolver's `PRO_FEATURES` must be exactly the `feature`s on the rows that differ (`planComparison.test.ts`).
 *
 * ⚠️ SMART IMPORT IS ONCE PER ACCOUNT ON BOTH PLANS (the monthly Pro allowance is retired), so it is a tick on both.
 * ⚠️ AGENTS ARE UNLIMITED ON BOTH. There is no agent cap in the code (v1.1 removed the Free cap of 5 from `addAgent`; planLimits.test.ts locks it).
 */
export const PLAN_GROUPS: PlanGroup[] = [
  { group: "Run your campaign", rows: [
    { label: "Agents", sub: "As many as you like, with what each one wants.", free: figure("Unlimited"), pro: figure("Unlimited") },
    { label: "Queries and responses", sub: "Every query, request and reply, with its dates.", free: figure("Unlimited"), pro: figure("Unlimited") },
    { label: "Query Centre and Birds-eye view", sub: "Where every query stands and whose move it is.", free: YES, pro: YES },
    { label: "To-do list and nudge reminders", sub: "What needs you today, in the app and by email.", free: YES, pro: YES },
    { label: "Manuscripts", sub: "A second manuscript is coming soon, on Pro.", free: figure("1"), pro: figure("1") },
  ] },
  { group: "Sharpen your submission", rows: [
    { label: "Query letters", sub: "Keep every draft of your letter and see which was sent where.", ...proOnly("letters") },
    { label: "Manuscript versions", sub: "One for each draft, so you know which pages an agent read.", ...proOnly("versions") },
    { label: "Submission packages", sub: "Pair a letter, synopsis and sample, then attach the set to a query.", ...proOnly("packages") },
    { label: "Which package wins requests", sub: "Request rates for each package and version, side by side.", ...proOnly("packageResults") },
    { label: "Comparable titles", sub: "Collect and compare the books yours sits beside.", ...proOnly("comps") },
  ] },
  { group: "Find agents", rows: [
    { label: "Your own agent list", sub: "Add agents by hand or bring them in.", free: YES, pro: YES },
    { label: "The Scout", sub: "Agents other writers have verified, and comp titles to consider.", ...proOnly("scout") },
  ] },
  { group: "Save time", rows: [
    { label: "Smart Import", sub: "Turns your spreadsheet or photos into your QueryHawk list, when you join.", free: YES, pro: YES },
    { label: "Spreadsheet template import", sub: "Fill in our template and upload it.", free: YES, pro: YES },
    { label: "Smart email drop", sub: "Forward an agent's reply and it's logged against the right query.", ...proOnly("emailDrop") },
  ] },
  { group: "Always yours", rows: [
    { label: "Take a copy of your data", sub: "Everything you have put in, whenever you want it.", free: YES, pro: YES },
    { label: "Keep your Pro work on Free", sub: "Versions and packages stay readable if you go back to Free.", free: YES, pro: YES },
  ] },
];

/** Every row, in order (the groups flattened). */
export const PLAN_ROWS: PlanRow[] = PLAN_GROUPS.flatMap((g) => g.rows);

const same = (a: PlanCell, b: PlanCell) => a.kind === b.kind && (a.kind !== "figure" || (b.kind === "figure" && a.text === b.text));
/** True when the row says something different on Free and on Pro. */
export const rowDiffers = (r: PlanRow): boolean => !same(r.free, r.pro);
/** The rows Pro adds — the table's "What Pro adds" view. */
export const DIFFERING_ROWS: PlanRow[] = PLAN_ROWS.filter(rowDiffers);
/** "The 7 things Pro adds." */
export const PLAN_DIFFERS = DIFFERING_ROWS.length;

/**
 * ⚠️ NO CHECKOUT EXISTS, SO THE CTA DOES NOT SAY "UPGRADE". Nothing can be upgraded: there is no
 * payment path, and a client that tried to write itself `plan: "Pro"` is denied by the rules. The
 * settings card sends you to the plans page to read about Pro, and says so.
 */
export const PLAN_CTA_LABEL = "See Pro plans";

/** The words for the "this is the one you are on" marker. */
export const CURRENT_PLAN_CHIP = "Current";
export const CURRENT_PLAN_CTA = "Your plan";

/* ── The rail aside's one line ───────────────────────────────────────────────
   ⚠️ DERIVED FROM `PLAN_ROWS`, NEVER WRITTEN OUT AGAIN. The aside states what your plan gives you,
   which is exactly what the comparison states — and a second hand-written sentence is the
   duplication this build spent a whole phase removing from `PlansPage`. If a row's figure changes,
   the rail changes with it or not at all.

   ⚠️ THE STANDING CAPACITIES ONLY, SELECTED BY A RULE RATHER THAN BY NAME. Smart Import's figures
   carry a PERIOD — "1 (lifetime)", "1 a month" — so they are an allowance over time rather than a
   capacity you hold, and they do not compose into a list beside "1 manuscript". The predicate is
   the qualifier, not a hardcoded list of three labels, so a new capacity row joins the line on its
   own and a new metered one stays out of it. */
/** ⚠️ EXPORTED SO THE TEST CANNOT RESTATE IT. A spec that re-typed this regex was asserting one
 *  hand-written rule against another, and it went red the moment the figures changed wording —
 *  correctly, but for the wrong reason. Two derivations must be the SAME derivation. */
export const isStandingCapacity = (text: string): boolean =>
  !/[()]|\b(a|per)\s+(day|week|month|year)\b|\bimport\b/i.test(text);

/** "1 manuscript · unlimited agents · unlimited queries" */
export function planAllowanceLine(tier: "free" | "pro"): string {
  return PLAN_ROWS
    .map((r) => ({ row: r, cell: tier === "free" ? r.free : r.pro }))
    .filter((x): x is { row: PlanRow; cell: { kind: "figure"; text: string } } =>
      x.cell.kind === "figure" && isStandingCapacity(x.cell.text))
    .map(({ row, cell }) => {
      /* Labels are plural nouns; a figure of exactly one needs the singular, and "Unlimited" reads
         as prose here rather than as a table value. */
      const noun = cell.text === "1" ? row.label.replace(/s$/, "") : row.label;
      return `${cell.text.toLowerCase()} ${noun.toLowerCase()}`;
    })
    .join(" · ");
}

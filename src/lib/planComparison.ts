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
 * ⚠️ THE PRICE IS NOT HERE. It comes from `marketing/landingCopy.PRICING_TIERS`, which is
 * verbatim-locked and currently reads "Price to be confirmed · no payment path yet" — and that is
 * the truth: there is no Stripe, no checkout, and `firestore.rules` denies a client-side plan
 * change as its central guard. `PlansPage`'s £3.99/£35 was a duplicate of a figure nobody could
 * pay, and it is deleted rather than moved.
 *
 * ⚠️ TWO ROWS WERE CLAIMING A GATE THAT DOES NOT EXIST. `GROUPS` listed "Submission package
 * builder" and "Agent matching & community access" as Pro-only. Neither is gated: grep
 * `SubmissionPackages.tsx` and `DiscoverNewAgents.tsx` for `isProUser` or `UserPlan.PRO` and you
 * get nothing, and CLAUDE.md records the Packages case as a DELIBERATE decision ("submission
 * packages is not Pro-gated, so it sells nothing"). The locked marketing copy agrees with the
 * code — its Free tier includes "Submission packages and comparable titles", and its Pro tier
 * names only unlimited manuscripts, a monthly Smart Import, smart email drop and comp
 * suggestions. So the code and the marketing copy agreed with each other and `GROUPS` was the
 * outlier; the table below follows the two that agree. STANDING FLAG: if either is MEANT to be
 * Pro, the fix is a gate in the code, not a claim in this file.
 *
 * ⚠️ ALLOWANCES ARE FIGURES; CAPABILITIES ARE TICK OR DASH — and never both inside one row. A row
 * reading "Unlimited" against a tick asks the reader to compare two different kinds of thing.
 * `planComparison.test.ts` asserts every row is one grammar or the other.
 */

/** One side of one row. A figure states an allowance; included/absent state a capability. */
export type PlanCell =
  | { kind: "figure"; text: string }
  | { kind: "included" }
  | { kind: "absent" };

export interface PlanRow {
  label: string;
  /**
   * The muted one-liner under the name. Present only where the app already had wording for it —
   * these are lifted from `PlansPage`'s table verbatim rather than newly written, because plan
   * copy is a product statement and inventing it in a settings build is how a page starts making
   * promises nobody approved. Rows without one are listed in the build report as open.
   */
  sub?: string;
  free: PlanCell;
  pro: PlanCell;
}

const figure = (text: string): PlanCell => ({ kind: "figure", text });
const YES: PlanCell = { kind: "included" };
const NO: PlanCell = { kind: "absent" };

/**
 * The rows, in the order both surfaces render them.
 *
 * ⚠️ AGENTS AND QUERIES ARE HERE DESPITE BEING IDENTICAL ON BOTH SIDES. They are the reassurance
 * that Free is not a crippled tier, and stating them plainly on both sides is more honest than
 * hiding them because they do not differ.
 *
 * ⚠️ SMART IMPORT'S FIGURES COME FROM `smartImportEntitlement.ts`, which is the policy the server
 * enforces: Free is ONE FOR THE LIFETIME OF THE ACCOUNT, Pro is one per UTC calendar month. Not
 * "1, at sign-up" (it is not tied to sign-up) and not "Unlimited" (the callable would refuse).
 */
export const PLAN_ROWS: PlanRow[] = [
  { label: "Manuscripts", free: figure("1"), pro: figure("Unlimited") },
  { label: "Agents", free: figure("Unlimited"), pro: figure("Unlimited") },
  { label: "Queries", free: figure("Unlimited"), pro: figure("Unlimited") },
  {
    label: "Smart Import",
    sub: "Bring the spreadsheet you've been wrangling and we'll spin it into a living database in moments.",
    free: figure("1 (lifetime)"),
    pro: figure("1 a month"),
  },
  { label: "Agent Discovery", free: YES, pro: YES },
  {
    label: "Submission Packages",
    sub: "Pair your best query letter, synopsis and pages into bespoke submission packages — then see at a glance which combination charms the most agents.",
    free: YES,
    pro: YES,
  },
  {
    label: "Smart Email Drop",
    sub: "Drop your email straight into ScriptAlly and we'll log the details in your database, completely hassle-free.",
    free: NO,
    pro: YES,
  },
  { label: "The Comp Scout", free: NO, pro: YES },
];

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
const isStandingCapacity = (text: string): boolean => !/[()]|\ba\s+(day|week|month|year)\b/i.test(text);

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

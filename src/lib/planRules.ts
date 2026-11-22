/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — what each plan includes and costs, in ONE module. The app's plan table, the entitlement resolver and
 * the public pricing copy all read from here; none of them keeps its own list of what is Pro.
 *
 * ⚠️ THE SERVER MIRRORS THE TRIAL LENGTH in `functions/src/entitlementCore.ts` (functions/ cannot import from src/);
 *    `entitlementsAgree.test.ts` fails if the two differ.
 */

/** A new non-founding account's first days are full Pro, counted from the sign-in account's creation. */
export const TRIAL_DAYS = 14;

/** Everything Pro adds. Each one is a row in the plan table that differs between Free and Pro. */
export const PRO_FEATURES = [
  "letters",        // Query letters
  "versions",       // Manuscript versions
  "packages",       // Submission packages
  "packageResults", // Which package wins requests
  "comps",          // Comparable titles
  "scout",          // The Scout (Discover, and comp suggestions)
  "emailDrop",      // Smart email drop
] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

/* ══════════════ The Pro plans — planned launch prices ══════════════
   ⚠️ ONE TABLE, AND EVERY OTHER FIGURE ON THE PAGE IS READ FROM IT. The per-month figure is DERIVED
   (price ÷ months, to the penny); the saving is STATED, because the ref's three savings are not one
   rounding of the arithmetic — 20 / 40 / 53 against a computed 20.7 / 39.5 / 53.1 — and the page
   prints the ref's words. `pricingCopy.test.ts` holds each stated saving within one point of the
   arithmetic, so a price that moves without its saving fails there rather than on the page.
   ⚠️ THE WORD IS "PLANS" (pricing v4; plan rules v1), in the copy and in every identifier. */
export interface ProPlan {
  months: 1 | 3 | 6 | 12;
  /** Pounds, as the page prints it: "7.99", "19". */
  price: string;
  /** Percentage off twelve single months at the one-month price. Null for the one-month plan. */
  saving: number | null;
}
export const PRO_PLANS: ProPlan[] = [
  { months: 1, price: "7.99", saving: null },
  { months: 3, price: "19", saving: 20 },
  { months: 6, price: "29", saving: 40 },
  { months: 12, price: "45", saving: 53 },
];

/** £ a month for a plan, to the penny: 19 / 3 → "6.33". */
export const perMonth = (p: ProPlan): string => (Number(p.price) / p.months).toFixed(2);
export const planFor = (months: ProPlan["months"]): ProPlan => PRO_PLANS.find((p) => p.months === months)!;
/** The cheapest month on any plan — Pro's "from" figure: £45 / 12 → "3.75". */
export const PRO_FROM = PRO_PLANS.map(perMonth).sort((a, b) => Number(a) - Number(b))[0];
/** "1 month", "3 months". */
export const planMonths = (m: number): string => `${m} month${m > 1 ? "s" : ""}`;
/** Every plan carries on month by month at the one-month price once it ends. */
export const ROLL_ON_PRICE = planFor(1).price;
/** "1, 3, 6 or 12 months" */
export const PLAN_LENGTHS_LINE = `${PRO_PLANS.slice(0, -1).map((p) => p.months).join(", ")} or ${PRO_PLANS[PRO_PLANS.length - 1].months} months`;

/** Free costs nothing. */
export const FREE_PRICE = "£0";
/** "from £3.75 a month" — Pro's price wherever one line has to stand for the four lengths. */
export const PRO_FROM_LINE = `from £${PRO_FROM} a month`;
/** Free's line under its price in the plan table. */
export const FREE_TRIAL_LINE = `First ${TRIAL_DAYS} days are Pro`;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings' live headlines — one sentence that states each section's current state, and the line under it
 * (non-workspace v1, Phase 2; ref: design-refs/settings-v2.html, `headline()`). PURE, so every branch is tested.
 */
import type { AccountSectionId } from "./accountRoutes";
import type { EntitlementBasis } from "./entitlements";

const WORD = ["No", "One", "Two", "Three", "Four", "Five"];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface HeadlineFacts {
  name: string;
  /** The home country's name, or null when it is not set. */
  country: string | null;
  email: string;
  basis: EntitlementBasis | "pending";
  /** Days of Pro left in the first 14 (a trial account only). */
  trialDaysLeft: number | null;
  emailsOn: { nudges: boolean; weekly: boolean; news: boolean };
  quietWeeks: number;
  counts: { queries: number; agents: number; manuscripts: number };
}

/** `the United Kingdom`, `Ireland` — the ref's own rule: "the" before a United… name. */
export const countryPhrase = (c: string) => `${/^United\b/.test(c) ? "the " : ""}${c}`;

export function settingsHeadline(section: AccountSectionId, f: HeadlineFacts): [string, string] {
  switch (section) {
    case "profile":
      return [
        f.country ? `${f.name}, writing from ${countryPhrase(f.country)}.` : `${f.name}.`,
        "Your name, where you write from and how you sign in.",
      ];
    case "preferences":
      return [
        `A query goes quiet ${plural(f.quietWeeks, "week", "weeks")} after its reply date.`,
        "How long QueryHawk waits before it suggests your next move, and what reaches your to-do list.",
      ];
    case "emails": {
      const on = [f.emailsOn.nudges, f.emailsOn.weekly, f.emailsOn.news].filter(Boolean).length;
      const off = 3 - on;
      const h = on === 3 ? "All three emails on." : on === 0 ? "No emails on." : `${WORD[on]} email${on > 1 ? "s" : ""} on. ${WORD[off]} off.`;
      return [h, `What we email you about, at ${f.email}.`];
    }
    case "plan":
      return planHeadline(f.basis, f.trialDaysLeft);
    case "data": {
      const { queries, agents, manuscripts } = f.counts;
      if (queries === 0 && agents === 0 && manuscripts === 0) {
        return ["Nothing here yet. It's all yours when there is.", "Bring your list in, or start by logging a query."];
      }
      return [
        `${plural(queries, "query", "queries")}, ${plural(agents, "agent", "agents")} and ${plural(manuscripts, "manuscript", "manuscripts")}. All yours.`,
        "Take a copy, bring more in, or remove the lot.",
      ];
    }
    default: {
      const unhandled: never = section;
      return unhandled;
    }
  }
}

/**
 * The Plan section's (and the Plans page's) headline for each account state. Founding and Free are the ref's;
 * the trial line and Pro are words written for states the refs do not draw (listed in the run report).
 */
export function planHeadline(basis: EntitlementBasis | "pending", trialDaysLeft: number | null): [string, string] {
  switch (basis) {
    case "founding":
    case "pending":
      return ["You're a founding writer. Everything's included.", "Full QueryHawk Pro, free for your whole querying campaign."];
    case "pro":
      return ["You're on Pro. Everything's included.", "Every QueryHawk feature, for as long as your plan runs."];
    case "trial":
      return [
        "You're on the Free plan.",
        `One manuscript, with as many agents and queries as you like. You have ${plural(trialDaysLeft ?? 0, "day", "days")} of Pro left.`,
      ];
    case "free":
      return ["You're on the Free plan.", "One manuscript, with as many agents and queries as you like."];
    default: {
      const unhandled: never = basis;
      return unhandled;
    }
  }
}

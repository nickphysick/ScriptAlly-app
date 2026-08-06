/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTiers — the hero to-do card's three-tier priority (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ ONE TIER AT A TIME, IN STRICT ORDER, AND NEVER MIXED. The card shows at most three items and
 * they all come from the highest non-empty tier. A card that mixed an offer to answer with a
 * reminder to tidy an agent's wish-list would be asking you to triage inside a surface whose whole
 * job is to have triaged for you.
 *
 * ⚠️ AND EVERY FIGURE IS DERIVED. Nothing here is stored, nothing is written; the three counts come
 * from the row builders the card already runs.
 */

export type TodoTier = "urgent" | "housekeeping" | "notes" | "clear";

export interface TierCounts {
  urgent: number;
  housekeeping: number;
  notes: number;
}

/** How many items the card shows — the rest live on the board. */
export const TODO_CARD_LIMIT = 3;

/** Strict priority: urgent beats housekeeping beats notes; nothing at all is its own state. */
export const todoTier = (c: TierCounts): TodoTier => {
  if (c.urgent > 0) return "urgent";
  if (c.housekeeping > 0) return "housekeeping";
  if (c.notes > 0) return "notes";
  return "clear";
};

/**
 * The band's headline.
 *
 * ⚠️ THE SINGULAR AGREES WITH ITS VERB — "1 thing requires your attention", not "1 things require".
 * It is the sentence a reader meets most often on a quiet week, and getting it wrong is the kind of
 * thing that makes a careful product feel careless.
 */
export const tierHeader = (tier: TodoTier, c: TierCounts): string => {
  switch (tier) {
    case "urgent":
      return c.urgent === 1
        ? "1 thing requires your attention"
        : `${c.urgent} things require your attention`;
    case "housekeeping":
      return "Spare some time to work on these";
    case "notes":
      return "Nothing on your to-do list, only notes";
    default:
      return "Nothing needs you";
  }
};

/** The outlined mono pill beside the headline. */
export const TIER_PILL: Record<TodoTier, string> = {
  urgent: "Urgent",
  housekeeping: "Housekeeping",
  notes: "Notes to self",
  clear: "All clear",
};

/**
 * The foot's left-hand line: what is waiting in the tiers the card is NOT showing.
 *
 * ⚠️ IT NEVER STATES A ZERO. "0 notes" is noise dressed as information; a tier with nothing in it
 * simply goes unmentioned, and when nothing at all is waiting the line says so in words.
 */
export const tierFooter = (tier: TodoTier, c: TierCounts): string => {
  const parts: string[] = [];
  if (tier !== "urgent" && c.urgent > 0) parts.push(`${c.urgent} urgent`);
  if (tier !== "housekeeping" && c.housekeeping > 0) parts.push(`${c.housekeeping} housekeeping`);
  if (tier !== "notes" && c.notes > 0) parts.push(`${c.notes} ${c.notes === 1 ? "note" : "notes"}`);
  if (parts.length === 0) return tier === "clear" ? "Nothing waiting" : "Nothing else waiting";
  return parts.join(" · ");
};

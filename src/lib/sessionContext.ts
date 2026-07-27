/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SESSION PAGE'S CONTEXT (v9: set as PROSE under the page's hairline rule; formerly the
 * boxed "where this stands" card) — a short derived summary composed from the query's state
 * via TEMPLATES, never free generation. Every fact arrives as
 * an input the caller derived from existing fields; a missing field OMITS its clause, never
 * guesses. An empty composition means the card does not render (notes carry no derived facts).
 */

export interface StandInput {
  kind: "offer" | "awaiting-send" | "nudge" | "stale" | "dq" | "note";
  agentName?: string;
  /** ISO — the offer's arrival (the status change onto Offer). */
  offerDate?: string;
  /** Agent names still holding the ball elsewhere (live queries, ballHolder = agent). */
  outstanding?: string[];
  /** ISO — when the material was requested (the status change onto the Requested state). */
  requestedDate?: string;
  /** The owed noun from the status map — "partial" · "full manuscript" · "revised manuscript". */
  owed?: string;
  /** ISO — dateSent. */
  sentDate?: string;
  silentDays?: number;
  windowWeeks?: number;
  /** The batch's own G3 sub line, verbatim. */
  batchLine?: string;
}

/** The owed noun per QueryStatus — template vocabulary keyed on the exact enum strings. */
export const STATUS_OWED: Record<string, string> = {
  "Partial Requested": "partial",
  "Full Requested": "full manuscript",
  "Revise & Resubmit": "revised manuscript",
};

const fmtDay = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** The last word of a display name — the template's short form ("Jonathan Marsh" → "Marsh"). */
const surname = (name: string): string => name.trim().split(/\s+/).slice(-1)[0] ?? name;

/** How many outstanding names the sentence will carry before it says "+n more". */
export const NAME_CAP = 3;

/**
 * v9 — THE NAME LIST, at the TEMPLATE level. A writer with two live queries to the same agent
 * (or the same name cased differently) must never read "Reed, Reed" — the template dedupes on
 * the rendered short form, case-insensitively, keeps first-seen order, and caps the sentence
 * at three with a "+{n} more" tail. The malformed sentence is impossible here regardless of
 * what the caller collected.
 */
export function nameList(names: string[], cap: number = NAME_CAP): string {
  const seen = new Set<string>();
  const shown: string[] = [];
  for (const n of names) {
    const short = surname(n);
    const k = short.toLocaleLowerCase();
    if (!short || seen.has(k)) continue;
    seen.add(k);
    shown.push(short);
  }
  if (shown.length <= cap) return shown.join(", ");
  return `${shown.slice(0, cap).join(", ")} +${shown.length - cap} more`;
}

/** The distinct count behind that list — the sentence's number must match its names. */
export function distinctNames(names: string[]): number {
  const seen = new Set<string>();
  for (const n of names) {
    const k = surname(n).toLocaleLowerCase();
    if (k) seen.add(k);
  }
  return seen.size;
}

/**
 * Compose the summary. Clause by clause; each clause requires ALL of its facts — a missing
 * field drops the clause. Returns "" when nothing can be said (the card then hides).
 */
export function whereThisStands(i: StandInput): string {
  const parts: string[] = [];
  if (i.kind === "offer") {
    if (i.offerDate && fmtDay(i.offerDate)) parts.push(`Offer received ${fmtDay(i.offerDate)}.`);
    if (i.outstanding && i.outstanding.length > 0) {
      // the COUNT is the distinct count, so the number and the names always agree
      const n = distinctNames(i.outstanding);
      if (n > 0) parts.push(`${n} still out (${nameList(i.outstanding)}).`);
    }
    if (i.agentName) parts.push(`Convention says you nudge them with the news and set ${surname(i.agentName)} a reply-by date.`);
  } else if (i.kind === "awaiting-send") {
    if (i.sentDate && fmtDay(i.sentDate)) parts.push(`Queried ${fmtDay(i.sentDate)}.`);
    if (i.agentName && i.owed && i.requestedDate && fmtDay(i.requestedDate)) {
      parts.push(`${surname(i.agentName)} asked for the ${i.owed} on ${fmtDay(i.requestedDate)} — that's what you owe.`);
    } else if (i.owed) {
      parts.push(`The ${i.owed} is what's owed.`);
    }
  } else if (i.kind === "nudge") {
    if (i.sentDate && fmtDay(i.sentDate)) parts.push(`Queried ${fmtDay(i.sentDate)}.`);
    if (i.windowWeeks) parts.push(`No reply past the ${i.windowWeeks}-week window — a nudge is due.`);
  } else if (i.kind === "stale") {
    if (typeof i.silentDays === "number") parts.push(`Silent for ${i.silentDays} days.`);
    if (i.agentName && i.windowWeeks) parts.push(`${surname(i.agentName)}'s window is ${i.windowWeeks} weeks — long past.`);
  } else if (i.kind === "dq") {
    if (i.batchLine) parts.push(i.batchLine);
  }
  // notes: no derived facts — "" hides the card
  return parts.join(" ");
}

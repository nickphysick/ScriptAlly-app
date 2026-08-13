/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * compsPage — the pure derivations behind the Comparable Titles page (design-refs/
 * comparable-titles-flat.html). Store only facts + one intent (`inQuery`); everything a writer sees
 * about a comp's ROLE, the query-letter LINE, its HEALTH and the recency FLAG is computed here from
 * the stored fields, never persisted. All functions take the current year as a parameter so they
 * stay pure and testable; `currentYear()` is the single live source callers pass in.
 */
import { CompMedia, CompTitle } from "../types";

/** The single live "today's year" source — pass its result into the pure helpers below. */
export function currentYear(): number {
  return new Date().getFullYear();
}

/** An absent media reads as a book (the additive default). */
export function compMedia(c: CompTitle): CompMedia {
  return c.media ?? "book";
}

/** A finite stored year, or null. */
function compYear(c: CompTitle): number | null {
  return typeof c.year === "number" && Number.isFinite(c.year) ? c.year : null;
}

/** A book published within the last five years — the "recent enough to prove a market" window. */
function isRecentBook(c: CompTitle, now: number): boolean {
  const y = compYear(c);
  return compMedia(c) === "book" && y !== null && now - y <= 5;
}

export interface CompRole {
  kind: "market" | "tone";
  /** Short chip label. */
  label: string;
  /** One-line explanation of what the role means. */
  line: string;
}

/**
 * Derived role — a CLASSIFICATION and the fact behind it, never a verdict on the comp.
 *
 * ⚠️ THE LINES STATE, THEY DO NOT APPRAISE (baked decision 17). Three of the four used to editorialise:
 * "perfect for signalling mood" (an adjective on the writer's choice), "recent enough to show agents
 * there's a live audience" (a judgement of sufficiency, dressed as a fact), and "Older — leans on
 * voice & feel" (a comparative). The labels do the classifying; the lines now only say what is true
 * of the record.
 *
 * ⚠️ THE YEARLESS BOOK GAINED ITS OWN BRANCH, AND THAT IS A CORRECTNESS FIX, NOT A REDESIGN. It used
 * to share the older-book line, so a comp with NO year recorded was told it was published more than
 * five years ago — a statement the data cannot support and which the old wording ("Older") asserted
 * anyway.
 */
export function compRole(c: CompTitle, now: number): CompRole {
  const media = compMedia(c);
  if (media !== "book") {
    return { kind: "tone", label: "Tone comp", line: `A ${media} comp — signals tone rather than the market.` };
  }
  if (isRecentBook(c, now)) {
    return { kind: "market", label: "Market comp", line: "Published within the last five years." };
  }
  if (compYear(c) === null) {
    return { kind: "tone", label: "Tone comp", line: "No publication year recorded." };
  }
  return { kind: "tone", label: "Tone comp", line: "Published more than five years ago." };
}

/**
 * A book's age in years, when it is old enough for the row to state it — otherwise null.
 *
 * ⚠️ IT RETURNS THE NUMBER BECAUSE THE CHIP STATES THE NUMBER. It was a boolean feeding a chip that
 * read "Old for a market comp" — an assessment of that comp's fit, which is precisely what baked
 * decision 8 forbids: old comps get a factual `N YRS AGO` and nothing on this page tells a writer
 * their comp is bad. A boolean cannot say "12"; the wording had to be a verdict because the shape
 * left nothing else to say.
 *
 * ⚠️ AND IT NO LONGER REQUIRES `inQuery`. The old gate fired only on a ticked comp, on the reasoning
 * that it was "being asked to carry a market case it can't" — reasoning that is itself an appraisal.
 * An age is a fact about the book whether or not the writer has ticked it, and both the pack (Phase
 * 2) and the v5 ref show it unconditionally.
 */
export function compAge(c: CompTitle, now: number): number | null {
  if (compMedia(c) !== "book") return null;
  const y = compYear(c);
  if (y === null) return null;
  const age = now - y;
  return age > 5 ? age : null;
}

/** The surname used in the "(Surname, Year)" attribution — the last whitespace token of the author. */
function surname(author?: string): string {
  const a = (author ?? "").trim();
  if (!a) return "";
  const parts = a.split(/\s+/);
  return parts[parts.length - 1];
}

/** "(Surname, Year)" / "(Surname)" / "(Year)" / "" — whichever parts are present. */
function attribution(c: CompTitle): string {
  const y = compYear(c);
  const bits = [surname(c.author), y !== null ? String(y) : ""].filter(Boolean);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

export interface QueryLinePart {
  title: string;
  /** The parenthetical, e.g. " (Marske, 2021)" — empty when no author/year. */
  attribution: string;
}

export type QueryLine =
  | { kind: "empty"; prompt: string }
  | { kind: "line"; text: string; parts: QueryLinePart[] };

/**
 * The query-letter line assembled from the in-query comps, in shelf order:
 *   "For readers of A (Surname, Year), B (Surname, Year) and C (Surname, Year)."
 * `text` is the flat sentence (clipboard + tests); `parts` lets the strategy strip bold the titles.
 * Zero in-query comps returns the graceful empty prompt.
 */
export function queryLine(comps: CompTitle[]): QueryLine {
  const inq = comps.filter((c) => c.inQuery);
  if (inq.length === 0) {
    return { kind: "empty", prompt: "Tick a comp below to start building your query line." };
  }
  const parts: QueryLinePart[] = inq.map((c) => ({ title: c.title, attribution: attribution(c) }));
  const rendered = parts.map((p) => `${p.title}${p.attribution}`);
  const joined =
    rendered.length === 1
      ? rendered[0]
      : `${rendered.slice(0, -1).join(", ")} and ${rendered[rendered.length - 1]}`;
  return { kind: "line", text: `For readers of ${joined}.`, parts };
}

/**
 * The composition of the query line, stated as a count.
 *
 * ⚠️ THIS REPLACES `queryHealth`, WHICH WAS DELETED RATHER THAN REWORDED (baked decision 17). Its
 * information was worth keeping and its framing was not: it read "a strong, current case", "solid",
 * and "add one so agents see a live market" — two adjectives about the writer's choices and one
 * instruction about their specific list, which Phase 2 forbids in nearly those words. Worse, its
 * TYPE was the verdict: `status: "empty" | "ok" | "tip"` encoded a quality judgement in the data,
 * so every consumer inherited it whatever the copy said. Rewording would have left that in place.
 *
 * Count and state. No adjective, no recommendation, no threshold to fall short of — a writer reading
 * "1 OF 3" can draw their own conclusion, which is the difference between reporting and appraising.
 *
 * ⚠️ THE DENOMINATOR IS EVERY TICKED COMP, not just the books. A ticked film counts in the total and
 * never in the count, so the sentence stays true ("2 of 3 published in the last five years" — the
 * film is not), and the total agrees with the `BUILT FROM N TICKED COMPS` beside it. A books-only
 * denominator would silently disagree with the caption it sits in.
 *
 * Null when nothing is ticked: there is no composition to state, and the line above is already
 * telling the writer to tick something.
 */
export function compositionLine(comps: CompTitle[], now: number): string | null {
  const inq = comps.filter((c) => c.inQuery);
  if (inq.length === 0) return null;
  const recent = inq.filter((c) => isRecentBook(c, now)).length;
  return `${recent} of ${inq.length} published in the last five years`;
}

/** Masthead + strategy-strip counts. */
export function compCounts(comps: CompTitle[]): { total: number; inQuery: number } {
  return { total: comps.length, inQuery: comps.filter((c) => c.inQuery).length };
}

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
 * Derived role. Non-book media can only ever be a tone comp; a book recent enough (≤5 years) carries
 * the market case; an older book (or a book with no year) leans on tone. Surfaced as a label + line.
 */
export function compRole(c: CompTitle, now: number): CompRole {
  const media = compMedia(c);
  if (media !== "book") {
    return {
      kind: "tone",
      label: "Tone comp",
      line: `A ${media} comp — perfect for signalling mood, not the market case.`,
    };
  }
  if (isRecentBook(c, now)) {
    return {
      kind: "market",
      label: "Market comp",
      line: "Recent enough to show agents there’s a live audience.",
    };
  }
  return {
    kind: "tone",
    label: "Tone comp",
    line: "Older — leans on voice & feel rather than proving a current market.",
  };
}

/**
 * The recency flag fires ONLY when an old book is ticked into the query — it is being asked to carry
 * a market case it can't. Films and older tone comps that aren't in-query never flag.
 */
export function recencyFlag(c: CompTitle, now: number): boolean {
  if (!c.inQuery || compMedia(c) !== "book") return false;
  const y = compYear(c);
  return y !== null && now - y > 5;
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

export interface QueryHealth {
  status: "empty" | "ok" | "tip";
  /** The note to show; "" for the empty state (no note rendered). */
  text: string;
}

/**
 * Health of the query line, driven by how many RECENT BOOK comps are in-query:
 *   ≥2 → strong/current · 1 → solid · 0 (with comps in-query) → prompt for a recent title.
 * No in-query comps at all → empty (the empty query line already tells the writer what to do).
 */
export function queryHealth(comps: CompTitle[], now: number): QueryHealth {
  const inq = comps.filter((c) => c.inQuery);
  if (inq.length === 0) return { status: "empty", text: "" };
  const recent = inq.filter((c) => isRecentBook(c, now)).length;
  if (recent >= 2) return { status: "ok", text: "Two recent market comps — a strong, current case." };
  if (recent === 1) return { status: "ok", text: "One recent comp anchoring the market — solid." };
  return {
    status: "tip",
    text: "No recent book in your query — add one so agents see a live market.",
  };
}

/** Masthead + strategy-strip counts. */
export function compCounts(comps: CompTitle[]): { total: number; inQuery: number } {
  return { total: comps.length, inQuery: comps.filter((c) => c.inQuery).length };
}

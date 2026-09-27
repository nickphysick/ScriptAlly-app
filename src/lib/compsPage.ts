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
 * The card's age line — a FACT about the record and nothing else (comps v2, 27 Sep; the mock's
 * `ageLine`).
 *
 * ⚠️ NO THRESHOLD, NO CUTOFF, NO COMPARISON. Every comp states its age the same way whatever the
 * number is; none gets a colour, an icon, an ordering or a warning. A line that appeared only on
 * older comps would be a flag whatever its words said — the appraisal this page has been walked
 * back from twice (c5832984, and the v3 `compAge` chip).
 *
 * ⚠️ AND IF YOU FIND YOURSELF WRITING A COMPARISON AGAINST A CUTOFF HERE, STOP.
 *
 * `2021 · 5 years ago` · `2025 · 1 year ago` · `2026 · this year` · `Year not recorded`.
 * Numerals, not words, and the same wording for a book and a broadcast — the v2 mock's, which
 * replaces v3's "Published 2021 · five years ago" / "First aired 2022". A year in the future (a
 * recorded forthcoming title) reads "this year" rather than a negative count.
 *
 * ⚠️ AN ABSENT YEAR IS STATED, NOT OMITTED — the card's age row is always present, and a missing
 * row would read as a card that failed to render.
 */
export function compAgeLine(c: CompTitle, now: number): string {
  const y = compYear(c);
  if (y === null) return "Year not recorded";
  const d = now - y;
  return `${y} · ${d <= 0 ? "this year" : d === 1 ? "1 year ago" : `${d} years ago`}`;
}

/**
 * The card's facet chips, from the writer's own free-text `matchAxis`.
 *
 * ⚠️ THE APP DOES NOT CLASSIFY — it splits what the writer typed. The ref draws chips reading
 * Structure / Tone / Audience / Premise, which looks like a fixed vocabulary; the model has ONE
 * free-text axis (documented "tone · atmosphere"), so the honest rendering is to split on the
 * separator that documented format already uses and show the writer's own words. Inventing a
 * taxonomy and mapping their prose onto it would be the app deciding what their comp is FOR.
 */
export function compFacets(c: CompTitle): string[] {
  return (c.matchAxis ?? "")
    .split("·")
    .map((x) => x.trim())
    .filter((x) => x !== "");
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

/**
 * ⚠️ TWO FORMATS, AND THE WORDING IS THE PACK'S — it differs from what this file used to produce.
 * The old line was "For readers of A (Clarke, 2020)." from the earlier flat ref; Phase 2 and the v5
 * ref both give `{Manuscript} will appeal to readers of A, B and C.` with NO parenthetical
 * attributions. The manuscript is named IN the sentence, which is what makes it a line a writer can
 * paste rather than a fragment they have to finish.
 */
export type QueryFormat = "readers" | "meets";

/** One run of the composed line — `emphasis` marks the titles the line sets in italic. */
export interface LineSeg {
  text: string;
  /** ms = the manuscript title · title = a comp title · absent = the connecting prose. Both marked
   *  runs render in ITALIC (comps v2 — the mock's `<i>`), the way a title is set in running prose;
   *  v3's weight-only rule is superseded. */
  emphasis?: "ms" | "title";
}

export type QueryLine =
  /** Nothing switched on — the same prompt in either format. */
  | { kind: "empty"; prompt: string; caption: string }
  /** A-meets-B with anything other than two switched on: the rule and the count, no scolding. */
  | { kind: "unavailable"; prompt: string; caption: string }
  | { kind: "line"; text: string; segments: LineSeg[]; caption: string };

/** "A, B and C" as segments — commas between, "and" before the last, no Oxford comma. */
function joinTitles(titles: string[]): LineSeg[] {
  const out: LineSeg[] = [];
  titles.forEach((t, i) => {
    if (i > 0) out.push({ text: i === titles.length - 1 ? " and " : ", " });
    out.push({ text: t, emphasis: "title" });
  });
  return out;
}

const segText = (segs: LineSeg[]): string => segs.map((s) => s.text).join("");

/** The phrase the empty prompt and its caption both name — the switch's own label, verbatim. */
export const IN_QUERY_LABEL = "In query letter";

/**
 * The query-letter line, composed from the switched-on comps IN LIST ORDER.
 *
 * ⚠️ LIST ORDER IS THE CONTRACT, which is why the list is reorderable and why the caption says so.
 * Sorting here — by year, by recency, by anything — would silently overrule the writer's own
 * arrangement of their sentence.
 *
 * ⚠️ THE COPY IS THE v2 MOCK'S (27 Sep), and the composition LEFT the caption: it is a fact about
 * the whole library now and sits under "Your comps" (`compositionLine`). The caption says only how
 * the line was built.
 */
export function queryLine(comps: CompTitle[], manuscriptTitle: string, format: QueryFormat): QueryLine {
  const inq = comps.filter((c) => c.inQuery);
  const waiting = `Switch on “${IN_QUERY_LABEL}” for a comp below`;
  if (inq.length === 0) {
    return { kind: "empty", prompt: `Switch on ${IN_QUERY_LABEL} for a comp to start your line.`, caption: waiting };
  }
  if (format === "meets" && inq.length !== 2) {
    /* factual: what the format needs, and how many are switched on. No instruction, no "only". */
    return {
      kind: "unavailable",
      prompt: `“A meets B” takes exactly two comps. ${inq.length} ${inq.length === 1 ? "is" : "are"} switched on.`,
      caption: waiting,
    };
  }
  const segments: LineSeg[] = format === "meets"
    ? [{ text: inq[0].title, emphasis: "title" }, { text: " meets " }, { text: inq[1].title, emphasis: "title" }, { text: "." }]
    : [{ text: manuscriptTitle, emphasis: "ms" }, { text: " will appeal to readers of " }, ...joinTitles(inq.map((c) => c.title)), { text: "." }];
  return {
    kind: "line",
    text: segText(segments),
    segments,
    caption: `Built from ${inq.length} comp${inq.length === 1 ? "" : "s"} switched on below, in list order`,
  };
}

/**
 * The library's composition, stated as counts — the mono line under "Your comps" (comps v2).
 *
 * `3 of 4 books published in the last five years · 1 film or TV`. Either part is omitted when its
 * count is 0; null for an empty library.
 *
 * ⚠️ IT MOVED FROM THE QUERY LINE'S CAPTION AND CHANGED ITS DENOMINATOR WITH THE MOVE. In the
 * caption it counted the SWITCHED-ON comps (films in the total, so it agreed with "built from N");
 * here it describes the whole list, so books are counted against books and screen comps are their
 * own clause — the mock's arithmetic.
 *
 * ⚠️ IT REPLACED `queryHealth`, AND THE REASON STANDS: count and state. No adjective, no
 * recommendation, no threshold to fall short of — `queryHealth`'s verdict lived in its TYPE
 * (`"ok" | "tip"`), so every consumer inherited the judgement whatever the copy said.
 */
export function compositionLine(comps: CompTitle[], now: number): string | null {
  const books = comps.filter((c) => compMedia(c) === "book");
  const recent = books.filter((c) => isRecentBook(c, now)).length;
  const screen = comps.length - books.length;
  const parts: string[] = [];
  if (books.length) parts.push(`${recent} of ${books.length} book${books.length === 1 ? "" : "s"} published in the last five years`);
  if (screen) parts.push(`${screen} film or TV`);
  return parts.length ? parts.join(" · ") : null;
}

/** "1st", "2nd", "3rd", "4th" … "11th", "12th", "13th", "21st" — the switch's position pill. */
export function ordinal(n: number): string {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** The spine tile's initial: the title's first letter, a leading The / A / An set aside. */
export function spineInitial(title: string): string {
  const t = title.trim().replace(/^(the|a|an)\s+/i, "");
  return (t.charAt(0) || title.trim().charAt(0) || "·").toUpperCase();
}

/** Masthead + strategy-strip counts. */
export function compCounts(comps: CompTitle[]): { total: number; inQuery: number } {
  return { total: comps.length, inQuery: comps.filter((c) => c.inQuery).length };
}

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
/** Spelled to twelve, then numerals — the house convention the dashboard's week eyebrow uses. */
const ELAPSED_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/**
 * The card's age chip — a FACT about the record and nothing else.
 *
 * ⚠️ NO THRESHOLD, NO CUTOFF, NO COMPARISON. This is the deliberate difference from `compAge`
 * below, which returns null unless a book is more than five years old — so the chip it feeds appears
 * ONLY on older comps, and a chip that appears only on some rows is a flag whatever its wording is.
 * The writer reads "this one got marked", which is an appraisal of their choice delivered by
 * presence rather than by words. Every comp with a year gets this chip; none of them gets a colour,
 * an icon, an ordering or a warning.
 *
 * ⚠️ AND IF YOU FIND YOURSELF WRITING A COMPARISON AGAINST A CUTOFF HERE, STOP — that is the
 * appraisal line, and this page has been walked back from it once already (c5832984).
 *
 * Book → "Published 2021 · five years ago". Screen → "First aired 2022", with no elapsed clause,
 * because the ref draws it that way and a broadcast year is not a publication date.
 * Published this year → the year alone; "zero years ago" is not something anyone says.
 * No year recorded → null, and the card omits the chip rather than stating an absence.
 */
export function compAgeLine(c: CompTitle, now: number): string | null {
  const y = compYear(c);
  if (y === null) return null;
  if (compMedia(c) !== "book") return `First aired ${y}`;
  const elapsed = now - y;
  if (elapsed <= 0) return `Published ${y}`;
  const words = elapsed <= 12 ? ELAPSED_WORDS[elapsed] : String(elapsed);
  return `Published ${y} · ${words} ${elapsed === 1 ? "year" : "years"} ago`;
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

/** One run of the composed line — `emphasis` drives WEIGHT only, never colour or italics. */
export interface LineSeg {
  text: string;
  /** ms = the manuscript title (700) · title = a comp title (600) · absent = the connecting prose. */
  emphasis?: "ms" | "title";
}

export type QueryLine =
  /** Nothing ticked — the same prompt in either format. */
  | { kind: "empty"; prompt: string; caption: string | null }
  /** X-meets-Y with anything other than two ticked: state the rule, state the count, no scolding. */
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

/**
 * The query-letter line, composed from the ticked comps IN LIST ORDER.
 *
 * ⚠️ LIST ORDER IS THE CONTRACT, which is why the list is reorderable and why the caption says so.
 * Sorting here — by year, by recency, by anything — would silently overrule the writer's own
 * arrangement of their sentence.
 *
 * ⚠️ THE CAPTION APPENDS THE COMPOSITION, never a verdict on it. See `compositionLine`.
 */
export function queryLine(
  comps: CompTitle[],
  manuscriptTitle: string,
  format: QueryFormat,
  now: number
): QueryLine {
  const inq = comps.filter((c) => c.inQuery);
  if (inq.length === 0) {
    return { kind: "empty", prompt: "Tick a comp below to start building your query line.", caption: null };
  }
  const composition = compositionLine(comps, now);
  const plural = inq.length === 1 ? "" : "s";

  if (format === "meets") {
    if (inq.length !== 2) {
      /* factual: what the format needs, and how many are ticked. No instruction, no "only". */
      return {
        kind: "unavailable",
        prompt: "The X-meets-Y format takes exactly two comps.",
        caption: `${inq.length} ticked`,
      };
    }
    const segments: LineSeg[] = [
      { text: inq[0].title, emphasis: "title" },
      { text: " meets " },
      { text: inq[1].title, emphasis: "title" },
      { text: "." },
    ];
    return {
      kind: "line",
      text: segText(segments),
      segments,
      caption: [`built from 2 ticked comps`, composition].filter(Boolean).join(" · "),
    };
  }

  const segments: LineSeg[] = [
    { text: manuscriptTitle, emphasis: "ms" },
    { text: " will appeal to readers of " },
    ...joinTitles(inq.map((c) => c.title)),
    { text: "." },
  ];
  return {
    kind: "line",
    text: segText(segments),
    segments,
    caption: [`built from ${inq.length} ticked comp${plural}`, "in list order", composition]
      .filter(Boolean)
      .join(" · "),
  };
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's feature-led empty state — its words (empty-states pack, Phase 2; ref
 * `design-refs/scriptally-empty-states-v3-feature-led.html`, the Query Centre screen).
 *
 * ⚠️ THE COPY LIVES HERE, NOT IN THE JSX. Same reason `contactListEmpty` and `noteboardEmptyState`
 * do it: a sentence in two places is two sentences the day one is edited, and a lock can only
 * assert what it can name.
 *
 * ⚠️ THE APOSTROPHES ARE STRAIGHT BECAUSE THE ARTEFACT'S ARE STRAIGHT — all 117 of them, with not
 * one curly quote in the file. The first cut of this module typed curly ones, which is a nicer
 * character and a DIFFERENT STRING: `queryEmptyFeatures.test.tsx` reads every sentence back out of
 * the ref and caught all of them on its first run. The house rule that marketing copy is never
 * paraphrased extends to never being re-punctuated, and this is that rule finding a reader who
 * "improved" the text without meaning to.
 *
 * ⚠️ THE EXAMPLE DATA IS HERE TOO, AND IT IS STATIC BY CONSTRUCTION. Nothing in this module is
 * derived, fetched, or shaped like a `Query` — the illustrations are drawn markup, so there is no
 * object for a future edit to accidentally feed through a real derivation. The one thing they DO
 * read from the app is `STATE_TOKEN` and `QueryStatus`, so the tints and the dots in the picture
 * are the app's own and cannot drift from what the populated page draws.
 */
import { QueryStatus } from "../../types";
import type { State } from "../../lib/queryCardFacts";

/* ── the hero ──────────────────────────────────────────────────────────────────────────────── */

export const QCF_HERO = {
  heading: "Every query. Every reply. One place.",
  /** the manuscript's title is interpolated where the ref emphasises it */
  ledeBefore: "Log who has ",
  ledeAfter:
    " and what you sent them. QueryHawk keeps the status, the dates and whose court it's in straight for you.",
  /** ⚠️ the fallback when no manuscript is scoped — the ref's sentence names a book, and a
   *  sentence naming nobody's book would read as a missing value */
  ledeNoBook:
    "Log who you've written to and what you sent them. QueryHawk keeps the status, the dates and whose court it's in straight for you.",
  cta: "Log your first query",
  importLink: "Import a spreadsheet",
  templateLink: "Download the template",
  caveat: "already tracking in a spreadsheet? import it and pick up where you left off",
} as const;

/** the ref's `.ill .under` notes beside the example card */
export const QCF_HERO_NOTES = {
  left: "↖ the shade is the status",
  right: "the button is always your next move ↙",
} as const;

/* ── the five state swatches ───────────────────────────────────────────────────────────────── */

export interface QcfSwatch {
  /** ⚠️ THE STATE KEY, so the fill comes from `STATE_TOKEN` and the picture cannot drift from
   *  the tints the populated page paints. */
  state: State;
  name: string;
  gloss: string;
}

export const QCF_SWATCHES: readonly QcfSwatch[] = [
  { state: "queried", name: "Queried", gloss: "Sent, no reply yet" },
  { state: "agent", name: "Sent", gloss: "Partial or full, with them" },
  { state: "you", name: "Requested", gloss: "They want more — your move" },
  { state: "offer", name: "Offer", gloss: "Representation on the table" },
  { state: "closed", name: "Closed", gloss: "Passed, withdrawn, or no response" },
];

/**
 * The depth sequence beneath the swatches.
 *
 * ⚠️ REAL STATUSES, DRAWN BY THE REAL `StatusDot`. The house law is that every dot in this app
 * renders through that component and that a legend renders the actual component rather than a
 * recreation — and this section IS a legend. The ref draws its own `.sdot` with a conic-gradient
 * `--fill`; reproducing that would put a second dot implementation on the one page whose whole
 * subject is what the dots mean. `StatusDot` needed no change to be used here.
 */
export const QCF_DEPTH: readonly { status: QueryStatus; label: string }[] = [
  { status: QueryStatus.QUERIED, label: "Queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, label: "Partial\nrequested" },
  { status: QueryStatus.PARTIAL_SENT, label: "Partial\nsent" },
  { status: QueryStatus.FULL_REQUESTED, label: "Full\nrequested" },
  { status: QueryStatus.FULL_SENT, label: "Full\nsent" },
  { status: QueryStatus.REJECTED, label: "Closed" },
];

/* ── the feature rows ──────────────────────────────────────────────────────────────────────── */

export interface QcfRow {
  key: "shades" | "court" | "views" | "wait";
  heading: string;
  sub: string;
  caveat: string;
  /** the band's ground — `sage`, `pink`, or the window's own paper */
  band: "sage" | "pink" | "plain";
  /** the ref's `.row.flip` — the text column moves to the right by `order`, never by markup */
  flip: boolean;
}

export const QCF_ROWS: readonly QcfRow[] = [
  {
    key: "shades",
    heading: "Show, don't tell.",
    sub: "Five simple shades to show every status.",
    caveat: "and the ring fills as a query gets further along",
    band: "sage",
    flip: false,
  },
  {
    key: "court",
    heading: "Whose court is it in?",
    sub: "Every query says whether the next move is yours or theirs.",
    caveat: "you record what happened — the rest is worked out",
    band: "plain",
    flip: true,
  },
  {
    key: "views",
    heading: "Your queries, four ways.",
    sub: "Grid, list, board or calendar — the same queries, in whichever view suits the job.",
    caveat: "filters, groups and sorts carry across all four",
    band: "pink",
    flip: false,
  },
  {
    key: "wait",
    heading: "See the wait.",
    sub: "The calendar lays every query out by date — what's expected back, and when.",
    caveat: "today is the dashed line; everything to the right is still to come",
    band: "plain",
    flip: true,
  },
];

/* ── the closing ───────────────────────────────────────────────────────────────────────────── */

export const QCF_CLOSING = {
  heading: "Start with one.",
  sub: "This page stops explaining itself the moment your first query lands.",
  cta: "Log your first query",
  importLink: "Import a spreadsheet",
} as const;

/** The dashed pill every illustration wears — the ref's `.ill .tag`. */
export const QCF_EXAMPLE_TAG = "Example";

/* ── the drawn examples ────────────────────────────────────────────────────────────────────── */

/** the hero's single query card */
export const QCF_CARD = {
  status: QueryStatus.FULL_REQUESTED,
  head: "Full requested",
  court: "With you",
  initials: "DO",
  name: "Daniel O'Rourke",
  agency: "Inkwell & Stone",
  meta: "~6 weeks · Email",
  sentLabel: "Sent",
  sentValue: "Query · synopsis · first 10 pages",
  nextLabel: "Next",
  nextValue: "Due 3 Oct",
  nextCourt: "3 weeks left",
  primary: "Mark sent",
  secondary: "Open",
} as const;

/** the move strip — four rows, each with the button the CTA engine would put on it */
export const QCF_MOVES: readonly {
  status: QueryStatus; who: string; court: string; line: string; act: string; primary: boolean;
}[] = [
  { status: QueryStatus.QUERIED, who: "Amara Osei", court: "With the agent", line: "Reply expected 30 Oct · 7 days waiting", act: "Record response", primary: false },
  { status: QueryStatus.FULL_REQUESTED, who: "Daniel O'Rourke", court: "With you", line: "Full requested 09 Sep · due 3 Oct", act: "Mark sent", primary: true },
  { status: QueryStatus.REVISE_RESUBMIT, who: "Penhallow Literary", court: "With you", line: "Revision notes received 28 Aug", act: "Record resubmission", primary: true },
  { status: QueryStatus.OFFER, who: "Rosa Bellamy", court: "Offer", line: "Offer received 02 Sep · call booked Tue", act: "Record decision", primary: true },
];

/** the four view names, with the one the excerpt is showing */
export const QCF_VIEWS: readonly string[] = ["Grid", "List", "Board", "Calendar"];
export const QCF_VIEW_ON = "List";

/** the list excerpt */
export const QCF_LIST: readonly { status: QueryStatus; who: string; date: string }[] = [
  { status: QueryStatus.QUERIED, who: "Amara Osei · Osei Literary", date: "04 Sep" },
  { status: QueryStatus.FULL_REQUESTED, who: "Daniel O'Rourke · Inkwell & Stone", date: "12 Aug" },
  { status: QueryStatus.PARTIAL_SENT, who: "Aisha Kapoor · The Lantern Agency", date: "21 Jul" },
  { status: QueryStatus.FULL_SENT, who: "Rosa Bellamy · Bellamy & Vane", date: "15 Jun" },
  { status: QueryStatus.REJECTED, who: "Tom Marlow · Marlow Rights", date: "02 Jun" },
];

/**
 * The board excerpt.
 *
 * ⚠️ EACH COLUMN'S COUNT IS DERIVED FROM ITS OWN STUBS, never typed beside them. The ref's contact
 * screen heads a group "Idle · 3" and draws two cards under it; a drawn count that disagrees with
 * the drawn cards is a false number on a page whose whole subject is that the numbers are real.
 */
export const QCF_BOARD: readonly {
  state: State; name: string; stubs: readonly { who: string; note: string }[];
}[] = [
  { state: "queried", name: "Queried", stubs: [{ who: "Amara Osei", note: "day 7" }, { who: "Jo Hartley", note: "day 3" }] },
  { state: "you", name: "Requested", stubs: [{ who: "Daniel O'Rourke", note: "full" }, { who: "Penhallow", note: "R&R" }] },
  { state: "offer", name: "Offer", stubs: [{ who: "Rosa Bellamy", note: "02 Sep" }] },
];

/** the calendar excerpt — the axis, and three date-positioned cards */
export const QCF_AXIS: readonly { label: string; today?: boolean }[] = [
  { label: "Aug 4" }, { label: "14" }, { label: "21" }, { label: "28" },
  { label: "11", today: true }, { label: "18" }, { label: "25" }, { label: "Oct 2" },
];

export const QCF_CAL: readonly {
  state: State; head: string; court: string; who: string; agency: string; line: string; note: string;
  left: number; width: number; top: number;
}[] = [
  { state: "you", head: "Partial requested", court: "With you", who: "Jonathan Marsh", agency: "The Marsh Agency", line: "Due 3 Oct", note: "3 weeks left", left: 30, width: 52, top: 52 },
  { state: "queried", head: "Queried", court: "With the agent", who: "Daniel O'Rourke", agency: "Inkwell & Stone", line: "Reply expected 25 Sept", note: "14 days waiting", left: 14, width: 56, top: 136 },
  { state: "queried", head: "Queried", court: "With the agent", who: "Harriet Vane-Coe", agency: "Stillwater Reps", line: "Reply expected 23 Sept", note: "12 days waiting", left: 4, width: 60, top: 220 },
];

/* ── which book the hero names ─────────────────────────────────────────────────────────────── */

/**
 * The title the hero's lede names, or null for the book-less sentence.
 *
 * ⚠️ THE SCOPE FIRST, THEN THE ONLY-ONE CASE, THEN NOTHING. The ref's lede names a manuscript, and
 * a brand-new account usually has exactly one with the scope chip still on "All" — so reading the
 * scope alone would print the book-less sentence to the writer whose book the page is plainly about.
 * Naming one of SEVERAL unscoped manuscripts is the opposite fault: it would state that this page
 * is about a book the writer did not choose. Two cases where the answer is unambiguous, and null
 * wherever it is not.
 */
export const heroBookTitle = (
  scoped: { title?: string } | null | undefined,
  all: readonly { title?: string }[],
): string | null => {
  const t = scoped?.title?.trim();
  if (t) return t;
  if (all.length === 1) {
    const only = all[0]?.title?.trim();
    if (only) return only;
  }
  return null;
};

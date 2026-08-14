/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoHandoff — where the work actually happens (rail + workspace, Phase 5).
 *
 * ⚠️ SCRIPTALLY DOES NOT SEND ANYTHING, AND THIS MODULE IS THE APP ADMITTING IT. The send happens
 * in the writer's own email client or on the agency's portal; the app's job is to hand them over
 * with the recipient and the subject already composed, and then to be told what happened. A page
 * that quietly implied it had sent the full would be lying about the one act that matters.
 *
 * ⚠️ NOTHING HERE IS FABRICATED. Every field is read from the record or is absent, and an absent
 * one produces a REASON rather than a guess — the affordance greys and says why. That is the same
 * law the manuscript card's `—` rows are built on: stating "this slot is empty" is information,
 * and inventing a plausible value is not.
 */
import { BoardCard } from "./todoBoard";
import { sendSpecFor } from "./todoDock";

export interface HandoffLink {
  /** The href, or null where the record has nothing to build one from. */
  href: string | null;
  /** Why it is unavailable — shown in the tooltip of the greyed control, never as a guess. */
  why: string;
}

export interface Handoff {
  /** The pre-composed subject, or null where this task is not a send. */
  subject: string | null;
  mail: HandoffLink;
  web: HandoffLink;
}

/**
 * ⚠️ THE SUBJECT NAMES WHAT WAS ASKED FOR, and it comes from `sendSpecFor` — the same derivation
 * that decides which material the flow records and which status follows. A second table here
 * would be a second answer to "what is going", and the failure would be a subject line saying
 * partial over a flow recording a full.
 */
const REQUESTED: Record<string, string> = {
  partial: "Requested partial",
  full: "Requested full",
};

/**
 * `Requested full — MURPHY'S DAY OUT — Bethany Carter`.
 *
 * ⚠️ THE MANUSCRIPT CLAUSE IS OMITTED WHEN THERE IS NO TITLE, never left as an empty pair of
 * dashes. A subject reading "Requested full —  — Bethany Carter" is the app showing its own
 * missing data to an agent.
 */
export function handoffSubject(card: BoardCard, msTitle?: string): string | null {
  const spec = sendSpecFor(card);
  if (!spec) return null;
  const lead = spec.isResubmit ? "Requested revision" : REQUESTED[spec.material];
  const parts = [lead, msTitle?.trim().toUpperCase(), card.who?.trim()].filter(Boolean);
  return parts.join(" — ");
}

/**
 * ⚠️ THE URL IS THE AGENT'S WEBSITE AND IT IS CALLED THAT — the record carries no submissions-page
 * field, so labelling this one "submission portal" would assert something the data does not know.
 * The same reasoning that made `SAMPLE_PAGES` read "Opening sample": a label must be true of every
 * value it can carry. If a dedicated submissions URL is ever added, this is the one place to read
 * it from, and the label changes with it.
 */
export function handoffFor(card: BoardCard, email?: string, website?: string, msTitle?: string): Handoff {
  const subject = handoffSubject(card, msTitle);
  const to = email?.trim();
  const site = website?.trim();
  return {
    subject,
    mail: to
      ? { href: `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`, why: "" }
      : { href: null, why: "No email address on file for this agent." },
    web: site
      ? { href: /^https?:\/\//i.test(site) ? site : `https://${site}`, why: "" }
      : { href: null, why: "No website on file for this agent." },
  };
}

/**
 * ⚠️ THE LINE THAT SAYS THE APP IS NOT THE POSTBOX. One sentence, stated once, on every hand-off:
 * the send happens outside, and coming back to mark it is what keeps the record true. It reports
 * and does not instruct anxiously — no "don't forget", no exclamation.
 */
export const HANDOFF_NOTE =
  "The send happens in your own email — come back and mark it, and the query moves with it.";

/**
 * "Task 2 of 4 · Urgent" — where you are in the set you are looking at.
 *
 * ⚠️ IT COUNTS THE FILTERED SET, because that is the set the arrows walk and the rail shows. A
 * position out of a number you cannot see would be a fact about a list that is not on screen.
 * Absent when the card is not in the queue at all — which is the held state, where a position
 * would be a claim about a set the card has left.
 */
export function panePosition(queue: BoardCard[], activeKey: string, groupLabel: string): string | null {
  const i = queue.findIndex((c) => c.key === activeKey);
  if (i === -1) return null;
  return `Task ${i + 1} of ${queue.length} · ${groupLabel}`;
}

/* ── the card's sections, declared per kind (Phase 5) ────────────────────────────────────────── */

/**
 * ⚠️ THE CARD DOES NOT DECIDE WHAT IT CONTAINS — this does, in one place. A card branching inline
 * on `taskType` grows a private opinion about each kind, and the day a kind gains a section the
 * component gains a fifth `if`. Declared as a list, the shape of every kind is readable at once
 * and a new kind is a row rather than a rewrite.
 *
 * ⚠️ AND THE SECTIONS ARE NAMED FOR WHAT THEY HOLD, NOT FOR THE KIND. "What the record shows" is
 * the same section on an offer and on a stale query; only its prose differs, and that prose is the
 * card's own derivation rather than a per-kind copy table here.
 */
export type PaneSectionId = "record" | "materials" | "handoff" | "note";

export interface PaneSection {
  id: PaneSectionId;
  /** The mono label above it. */
  label: string;
}

const SECTION_LABEL: Record<PaneSectionId, string> = {
  record: "What the record shows",
  materials: "On file for this send",
  handoff: "Where to send it",
  note: "Your note",
};

/**
 * ⚠️ THE HAND-OFF AND THE MATERIALS APPEAR ONLY WHERE THERE IS A SEND. A "Where to send it" block
 * over a housekeeping gap would offer to email an agent about a missing postcode; the materials
 * row over a user's own task would list a package that has nothing to do with it. `sendSpecFor`
 * is the one question that separates them, and it is the question the flow already asks.
 *
 * ⚠️ "Your note" IS ON EVERY KIND, deliberately — every one of them is a thing you might want to
 * say something about, including your own tasks, and a card that offers the note on four kinds
 * out of five teaches a rule nobody can hold.
 */
export function paneSections(card: BoardCard): PaneSection[] {
  const sends = !!sendSpecFor(card);
  const ids: PaneSectionId[] = sends
    ? ["record", "materials", "handoff", "note"]
    : ["record", "note"];
  return ids.map((id) => ({ id, label: SECTION_LABEL[id] }));
}

/* ── the empty pane's second line (Phase 5) ──────────────────────────────────────────────────── */

/**
 * ⚠️ THE APP REPORTS, IT NEVER APPRAISES — and an empty desk is where that is hardest to hold.
 * "Nothing needs you." is the whole verdict; this line beneath it carries FACTS and no adjectives:
 * how many queries are still out, and when the next reply window falls. No exclamation, no "great
 * work", no tally of what was cleared.
 *
 * ⚠️ IT OMITS WHATEVER IT CANNOT ANSWER, rather than padding with zeroes. No live queries → no
 * clause about them. No derivable window → no date. A sentence assembled from the facts that
 * exist beats one that states an absence as a figure — the same rule the estimate chip is built
 * on, and the reason the manuscript card writes `—` where `0` would be a lie.
 *
 * Both inputs are already-derived: the caller passes live queries and their deadlines, so nothing
 * here re-derives what `recomputeQuery` owns.
 */
export function paneRestLine(
  live: { responseDeadline?: string }[],
  now: Date,
  fmt: (d: Date) => string = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
): string {
  const clauses: string[] = [];
  if (live.length > 0) {
    clauses.push(`${live.length} ${live.length === 1 ? "query is" : "queries are"} still out`);
  }
  const ahead = live
    .map((q) => (q.responseDeadline ? Date.parse(q.responseDeadline) : NaN))
    .filter((t) => Number.isFinite(t) && t >= now.getTime())
    .sort((a, b) => a - b);
  if (ahead.length > 0) clauses.push(`the next reply window falls on ${fmt(new Date(ahead[0]))}`);
  /* ⚠️ NOTHING TO SAY IS SAID PLAINLY. An empty string would leave a heading floating over a gap,
     and a cheerful filler would be the appraisal this whole line exists to avoid. */
  if (clauses.length === 0) return "Nothing is out with an agent at the moment.";
  return `${clauses.join(", and ")}.`;
}

/* ── the list card's footer (visual rebuild, Phase 1) ────────────────────────────────────────── */

/** "Showing 12 of 34" — what you are looking at, out of what there is. */
export function showingLine(shown: number, total: number): string {
  return `Showing ${shown} of ${total}`;
}

/**
 * ⚠️ THE EXPORT IS THE ROWS YOU CAN SEE, not the whole store. A footer that said "Showing 12 of
 * 34" beside a button that wrote 34 would be two statements of one scope, and the button's is the
 * one nobody checks until the file is open.
 *
 * ⚠️ FIELDS ARE ESCAPED AND THE FILE CARRIES A BOM, matching the Queries export — an unescaped
 * comma in an agency name silently shifts every column after it, and without the BOM Excel reads
 * a manuscript title's curly apostrophe as mojibake.
 */
const csvField = (v: string): string =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export interface CsvRow {
  bucket: string;
  deed: string;
  agent: string;
  agency: string;
  figureLabel: string;
  figure: string;
}

export function tasksCsv(rows: CsvRow[]): string {
  const head = ["Bucket", "Task", "Agent", "Agency", "Waiting", "Figure"];
  const body = rows.map((r) =>
    [r.bucket, r.deed, r.agent, r.agency, r.figureLabel, r.figure].map(csvField).join(","));
  return `﻿${[head.join(","), ...body].join("\n")}\n`;
}

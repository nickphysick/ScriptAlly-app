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
import { cardBucket, Bucket } from "./todoBuckets";

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
/**
 * ⚠️ DECLARED PER BUCKET (visual rebuild, Phase 5) — one table, read at a glance, and a new kind
 * is a ROW rather than a fifth `if` inside the card. It was keyed on "does this send", which was
 * the same answer for Send and Decide and hid that they are different acts.
 */
const BUCKET_SECTIONS: Record<Bucket, PaneSectionId[]> = {
  /* a material is going: what the record shows, what is on file, where to send it */
  send: ["record", "materials", "handoff", "note"],
  /* a judgement: the record and the ask, and somewhere to think on paper. An offer needs no
     "where to send it" — answering it opens the offer flow, which is its own surface. */
  decide: ["record", "note"],
  /* a chase IS a message, so it hands off — but there is no package to list */
  chase: ["record", "handoff", "note"],
  close: ["record", "note"],
  fix: ["record", "note"],
  note: ["record", "note"],
};

export function paneSections(card: BoardCard): PaneSection[] {
  return BUCKET_SECTIONS[cardBucket(card)].map((id) => ({ id, label: SECTION_LABEL[id] }));
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

/* ── the band's facts strip (visual rebuild, Phase 5) ────────────────────────────────────────── */

export interface BandFact {
  /** The mono label. */
  k: string;
  /** The Playfair value beneath it. */
  v: string;
  /**
   * ⚠️ WHICH FACT THIS IS, TAGGED AT CONSTRUCTION RATHER THAN INFERRED. Tracking's stat pair sets
   * the figure in Playfair and its unit in Inter, so it has to split "6 weeks" and NOT split
   * "28 Jun" — and both start with a number, so the value cannot tell them apart. A first attempt
   * guessed from the LABEL and split "He asked on / 28 Jun" into "28" and "Jun", because the word
   * "asked" matched. The caller knows; it says.
   */
  kind: "date" | "wait";
}

/**
 * ⚠️ THE SAME PAIRING THE RAIL'S FIGURE COLUMN USES — mono label over a Playfair value — and that
 * match is not decoration. It is what makes the two panes read as one page: the figure you scanned
 * in the list is the figure you land on in the card, in the same two registers.
 *
 * ⚠️ AND IT REPORTS. `Requested / 2 August` is a date the record holds; `Waiting / 12 days` is
 * arithmetic on it. Neither is a judgement, and a fact with no value behind it is OMITTED rather
 * than shown as a dash — the strip is short by design and an empty column in it reads as a fault.
 */
/**
 * ⚠️ THE BAND CARRIES ONE FACT, THE PAIR CARRIES BOTH — and this is the deliberate exception to
 * "a figure appears once per card". The band states the ANCHOR (when they asked), because that is
 * the fact the identity line is about; the stat pair states the anchor AND the elapsed, because
 * the pair's whole job is the relationship between them. Two presentations of one derivation, on
 * purpose — never the same figure twice by accident, which is what the band showing both was.
 */
export function bandAnchor(facts: BandFact[]): BandFact[] {
  return facts.filter((f) => f.kind !== "wait");
}

export function bandFacts(
  sentLabel: string | null,
  sentValue: string | null,
  waitLabel: string | null,
  waitValue: string | null,
): BandFact[] {
  const out: BandFact[] = [];
  if (sentLabel && sentValue) out.push({ k: sentLabel, v: sentValue, kind: "date" });
  if (waitLabel && waitValue) out.push({ k: waitLabel, v: waitValue, kind: "wait" });
  return out;
}


/* ── the band's identity block (corrections, Phase 1) ────────────────────────────────────────── */

/**
 * ⚠️ THE PRE-LINE NAMES THE ACT so the band reads as a sentence into the name: "Sending your full
 * to / Bethany Carter". It is per BUCKET rather than per task type, because the sentence is about
 * what you are doing rather than about which flag raised it.
 */
export function bandPreline(c: BoardCard): string {
  switch (cardBucket(c)) {
    case "send": {
      const spec = sendSpecFor(c);
      return spec ? `Sending your ${spec.material}${spec.isResubmit ? " again" : ""} to` : "Sending to";
    }
    case "decide":
      return c.taskType === "offer_received" ? "An offer of representation from" : "A revision requested by";
    case "chase": return "Chasing";
    case "close": return "Closing your query to";
    case "fix": return "A gap on the record for";
    case "note": return "Your note";
  }
}

/**
 * ⚠️ THE SUBJECT IS NOT ALWAYS A PERSON, and the band must not pretend otherwise. A Fix card's
 * subject can be a manuscript and a Note's is the writer's own board — so where there is no agent
 * the standing subject is named rather than a blank disc with an empty line beside it.
 */
export function bandSubject(c: BoardCard): string {
  if (c.who) return c.who;
  if (cardBucket(c) === "note") return "Your noteboard";
  return c.msTitle || c.title || "Your list";
}

/**
 * The line beneath the name — the agency, and only where it is a DIFFERENT fact from the name.
 * `record` is already "name · agency", so the agency is what follows the separator; where there is
 * none, the line is absent rather than an echo of the name above it.
 */
export function bandUnder(c: BoardCard): string {
  if (!c.who || !c.record) return "";
  const rest = c.record.startsWith(c.who) ? c.record.slice(c.who.length) : c.record;
  return rest.replace(/^\s*·\s*/, "").trim();
}


/* ── Tracking's stat pair (journeys pack, Phase 2) ───────────────────────────────────────────── */

export interface TrackingStat {
  /** The mono caption beneath. */
  k: string;
  /** The Playfair figure. */
  v: string;
  /** The unit, in Inter beside it. Empty where the figure is a word or a date. */
  u: string;
  /** The icon tile's glyph — a clock for a wait, a calendar for a date. */
  icon: string;
}

/**
 * ⚠️ THE STAT PAIR IS THE BAND'S TWO FACTS IN A SECOND PRESENTATION, NEVER A SECOND DERIVATION.
 * It takes `bandFacts`' own output and re-presents it, so the card cannot state the wait twice and
 * differently — which is the same reason the band reads the rail's `figureFor` rather than
 * recomputing. Three surfaces, one number.
 *
 * ⚠️ THE UNIT SPLITS OFF THE VALUE because the two are set in different faces — Playfair for the
 * figure, Inter for the unit — and a single string cannot carry two faces. The split is on the
 * LAST space, so "6 weeks" divides and "28 Jun" does not (a date's parts belong together).
 */
/**
 * ⚠️ THE PAIR READS ELAPSED FIRST, ANCHOR SECOND — "Jonathan has waited / 13 days" beside "He
 * asked on / 2 Aug". `bandFacts` builds them anchor-first because that is the order the BAND wants
 * (see `bandAnchor`); the pair is a different presentation of the same two facts and reads the
 * other way, because the elapsed figure is the one the writer is looking for.
 */
export function trackingStats(facts: BandFact[]): TrackingStat[] {
  const ordered = [...facts].sort((a, b) => (a.kind === "wait" ? -1 : 0) - (b.kind === "wait" ? -1 : 0));
  return ordered.map((f) => {
    /* only a WAIT splits, and only when it actually has a unit — "Today" has none */
    const m = f.kind === "wait" ? /^(\S+)\s+(.+)$/.exec(f.v) : null;
    return {
      k: f.k,
      v: m ? m[1] : f.v,
      u: m ? m[2] : "",
      icon: f.kind === "wait" ? "◷" : "▤",
    };
  });
}

/* ── the band's variant (v14 close-the-gap, Phase 2) ─────────────────────────────────────────── */

/**
 * ⚠️ PINK IS THE OFFER, AND NOTHING ELSE. The dock's band was classed `fam-${bandFamily(card)}`,
 * and `bandFamily` answers a DIFFERENT question — how urgent is this — where `urgent` covers every
 * send, every R&R and the offer alike. `.fam-urgent` is the pink gradient, so nine of the ten cards
 * the ref draws in sage were rendering pink; measured on the deployed page, every single card came
 * back `fam-urgent`.
 *
 * ⚠️ SO THE FIX IS A DERIVATION, NOT A TERNARY AT THE CALL SITE. The band variant is a fact about
 * WHAT KIND OF ACT this is, which is exactly what `cardBucket` answers, and the mockup paints one
 * card of ten pink — the offer. Everything else is the sage default. Family keeps its own job
 * (the lanes, the swatches, the board); this is not it.
 */
export type BandVariant = "offer" | "default";

export function bandVariant(c: BoardCard): BandVariant {
  /* ⚠️ THE OFFER, NOT THE BUCKET. An R&R shares the `decide` bucket and the ref draws it sage —
     the celebration belongs to the offer alone, which is the one card that changes everything. */
  return c.taskType === "offer_received" ? "offer" : "default";
}

/**
 * The corner motif, per bucket. ⚠️ IT IS KEYED ON THE BUCKET, so a new task type inherits a motif
 * from the act it performs rather than needing its own; and the two that share one share it because
 * they ARE one act — a Close and a Fix are both tidying the record.
 */
export type MotifKey = "stack" | "laurel" | "bell" | "broom" | "note";

export function bandMotif(c: BoardCard): MotifKey {
  switch (cardBucket(c)) {
    case "send": return "stack";
    /* an R&R is a resubmission — the same manuscript stack goes back */
    case "decide": return c.taskType === "offer_received" ? "laurel" : "stack";
    case "chase": return "bell";
    case "close": return "broom";
    case "fix": return "broom";
    case "note": return "note";
  }
}

/* ── the card's materials, as a RECORD (v14 close-the-gap, Phase 6) ──────────────────────────── */

export interface MaterialRow {
  /** The material's own name — "Opening sample", never "Sample pages" (the ComponentType law). */
  label: string;
  /**
   * ⚠️ ABSENT WHERE THERE IS NOTHING TRUE TO SAY — Nick's ruling, and the reason it is optional
   * rather than a "Version not recorded" string. A line on every row announcing that a thing is
   * missing is noise, and the absence is already visible from the row having no second line.
   */
  sub?: string;
}

/**
 * ⚠️ THE CARD RECORDS, IT DOES NOT ASK. This replaced a checkbox — a control that belongs to the
 * JOURNEY, where the writer is choosing what went. On the reading card the same material is a
 * statement of what is on file, so it carries a tick that is a MARK rather than an input.
 *
 * ⚠️ THE SUB-LINE VARIES BY WHAT THE MATERIAL IS, because only one fact is legitimate for each:
 *
 *   · a FULL MANUSCRIPT takes the manuscript's own word count — the one place that figure is
 *     about the thing being sent. Beside a query letter it would state the novel's length as the
 *     letter's, which is why it appears nowhere else;
 *   · an OPENING SAMPLE, SYNOPSIS or QUERY LETTER takes the package slot's version, where one is
 *     recorded — the artefact genuinely has a version and the package names it;
 *   · anything with neither takes NO SUB-LINE. Not "Version not recorded": a line on every row
 *     saying a thing is absent is noise.
 *
 * ⚠️ AND NEVER A FORMAT, until there is a file to name. `ManuscriptVersion.fileName` is written
 * nowhere in `src/` outside a dev lab fixture and `contentType: "file"` is a disabled coming-soon
 * with no Storage behind it, so a format stamp would be invented on every row, every time.
 */
export function materialRows(
  materialLabel: string | null,
  opts: { isFull?: boolean; wordCount?: number; versionName?: string | null },
): MaterialRow[] {
  if (!materialLabel) return [];
  const sub = opts.isFull
    ? (opts.wordCount ? `${opts.wordCount.toLocaleString("en-GB")} words` : undefined)
    : (opts.versionName || undefined);
  return [{ label: materialLabel, ...(sub ? { sub } : {}) }];
}

/* ── §5 · facts and figures — the anti-duplication law ───────────────────────────────────────── */

/**
 * ⚠️ THE ANCHOR'S NOUN NAMES WHAT ACTUALLY HAPPENED. Every card on the deployed page printed
 * `REQUESTED` — the offer, five chases, both closes — because the label was a hardcoded string at
 * the call site rather than a derivation. Nothing was requested on an offer; the agent offered.
 *
 * ⚠️ AND IT IS KEYED ON THE BUCKET, so a new task type inherits the noun of the act it performs
 * rather than needing one chosen for it.
 */
export function anchorNoun(c: BoardCard): string {
  switch (cardBucket(c)) {
    case "decide": return c.taskType === "offer_received" ? "Offer received" : "Revision requested";
    case "send": return "Requested";
    case "chase": return "Queried";
    case "close": return "Last entry";
    case "note": return "Added";
    /* a housekeeping gap is NOTICED, not requested — and `rowFigure` already says so on the rail */
    case "fix": return "Noticed";
  }
}

/**
 * ⚠️ THE BAND CARRIES THE FORWARD-LOOKING FACT ALONE, AND NOTHING WHERE THERE IS NONE (§5.1). It
 * carried the anchor, which the stat pair also carries — the same figure twice on one card, which
 * is the law this section exists to state. Forward and elapsed are different facts about different
 * moments, so the band and the pair can both speak without repeating.
 *
 * ⚠️ ABSENT RATHER THAN PADDED: no reply-by on an offer and no stated window on a send means the
 * band shows no fact at all. A band that always has something to say will eventually say something
 * untrue.
 */
export function bandForward(
  c: BoardCard,
  replyBy: string | null,
  statedWeeks: number | null,
  fmt: (iso: string) => string,
): BandFact | null {
  const bucket = cardBucket(c);
  /* an offer's clock counts DOWN and is the most consequential figure on the page */
  if (bucket === "decide" && replyBy) return { k: "Reply by", v: fmt(replyBy), kind: "date" };
  if ((bucket === "send" || bucket === "chase") && statedWeeks && statedWeeks > 0) {
    return { k: "Their window", v: `${statedWeeks} weeks`, kind: "wait" };
  }
  return null;
}

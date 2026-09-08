/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenRail — the 308px rail (spec §6): author/manuscript tile → querying goals → activity →
 * Pro mini-card.
 *
 * ⚠️ THE EXPANDER IS RETIRED (ref v16) — the goals card moved to the left column and Activity
 * already fills this one, so there was nothing left to expand into. What follows describes the
 * mechanism it used, kept because the FLEX law under it is still what sizes the feed:
 * (max-height→0 with their margins, padding and borders — the rail spaces with margins so the
 * slot's spacing collapses WITH the panel), and activity, being flex:1, grows to fill what they
 * release. The flex recomputation IS the animation; the activity panel's own height is never
 * animated.
 *
 * ⚠️ DISMISS IS DELIBERATE (§6): the toggle, Escape (focus returns to the button), click-outside,
 * or the viewport dropping below the two-column breakpoint. No timer, no mouse-leave.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus, User, UserTask } from "../../types";
import { StatusDot } from "../StatusDot";
import { agentPrimary } from "../../lib/agentDisplay";
import { OneScreenPanel } from "./OneScreenPanel";
import { OneScreenMark } from "./OneScreenMark";
import { EdgeFadeScroll } from "../EdgeFadeScroll";
import { bubbleShape, markSentOffered, tightRunHeads, type Side } from "../../lib/feedConversation";
import { STATE_TOKEN, type State } from "../../lib/queryCardFacts";

/* ── the 30-day feed, pure (exported for tests) ── */

/**
 * ⚠️ FOUR TABS, AND THEIR DOTS ARE DIRECTION MARKS RATHER THAN STATES. All · Agents · You · Desk —
 * the same three groups the bubbles are aligned into, plus everything. The dot is a small direction
 * cue beside the word, deliberately NOT one of the v2 state fills: a tab is not a status, and
 * borrowing a state colour for it would put the chart's vocabulary on a view selector.
 */
export const FEED_TABS = [
  { key: "all" as const, label: "All", dot: "" },
  { key: "in" as const, label: "Agents", dot: "#9db497" },
  { key: "out" as const, label: "You", dot: "#d8a894" },
  { key: "desk" as const, label: "Desk", dot: "#cdc3b7" },
];
export type FeedTab = (typeof FEED_TABS)[number]["key"];

/** Which tab a row belongs to — one row, one tab, so the counts sum to All by construction. */
export const feedTabOf = (r: Pick<FeedRow, "kind" | "side">): Exclude<FeedTab, "all"> =>
  r.kind === "housekeeping" ? "desk" : r.side;

/** ⚠️ THE DEEPER STEP OF THE SAME FAMILY, for the bubble's own edge — same key as `STATE_TOKEN`,
 *  so the fill and the border cannot fall out of step. */
const STATE_ACCENT: Record<State, string> = {
  queried: "var(--state-queried-deep)",
  agent: "var(--state-agent-deep)",
  you: "var(--state-you-deep)",
  offer: "var(--state-offer-deep)",
  closed: "var(--state-closed-deep)",
};

export interface FeedRow {
  id: string;
  /** "Wed 29 Jul" — a row starts a new day group when this differs from the previous row's. */
  dayLabel: string;
  /** The pill's words — "Query sent", "Full requested", "An offer", "Status changed"… */
  pill: string;
  /** Sage when the motion is the agent's (requests, offers); pink otherwise. */
  sage: boolean;
  time: string;
  who: string;
  caption: string;
  /**
   * ⚠️ WHAT HAPPENED, AS A SENTENCE — the activity's own rendered description (refdiff pass,
   * Phase 7). This REVERSES the earlier subject-grammar decision, deliberately and on the ref's
   * authority: the bubble read the agent's NAME with the pill above it as the verb, so a feed of
   * eight events was eight names in a column and the reader had to assemble each line from three
   * places. The ref's bubble is a state label, then a sentence, then who and when — which is the
   * order a person reads a message in.
   *
   * ⚠️ THE DESCRIPTION IS USED WHOLE AND NEVER PARSED. It is the sentence the writer's own action
   * produced; picking it apart with a regex is the string-parsing this codebase forbids, and the
   * subject lookup above already exists for the cases that need a name.
   */
  sentence: string;
  /**
   * ⚠️ THE DESCRIPTIVE SENTENCE, IN SEGMENTS, AND `null` WHEN ONE CANNOT BE BUILT (v22, Phase 7).
   *
   * The ref's messages read "Ruth Alderman passed on <em>Murphy's Day Out</em> without requesting
   * pages, 24 days after you queried" where ours read "Rejected by Joan Whitfield" — a fragment
   * with the manuscript missing, the direction implicit and no elapsed time at all. At the indented
   * width that was survivable; at full width it leaves two thirds of the line empty and still does
   * not say what happened to which book.
   *
   * ⚠️ SEGMENTS RATHER THAN A STRING, BECAUSE THE TITLE IS ITALICISED. The ref emits `<em>`; doing
   * the same here would mean `dangerouslySetInnerHTML` on a line built partly from stored data,
   * which this repo permits in exactly one place and should not gain a second. A segment list is
   * typed, cannot inject, and renders as nodes.
   *
   * ⚠️ AND IT IS `null` RATHER THAN A GUESS WHENEVER A PART IS MISSING. No resolvable agent, no
   * manuscript, an event type with no template — any of those and the row keeps `sentence`, the
   * log's own words. A composed sentence with a hole in it is the "You updated details for at
   * Penhallow" fault wearing better clothes.
   */
  say: FeedSeg[] | null;
  /**
   * ⚠️ THE SURNAME AND THE AGENCY TRAVEL SEPARATELY, BECAUSE ONLY ONE OF THEM MAY ELLIPSE.
   *
   * They were joined into one string here and the whole line truncated as a unit, so a long agency
   * took the surname and the time down with it — the two facts a reader needs to place the event
   * lost to the one that is context. Ref `.m .who2`: the surname is `flex: none`, the agency is
   * `flex: 0 1 auto` with `text-overflow: ellipsis`, and the time is `flex: none`.
   */
  surname: string;
  agency: string;
  dotStatus: QueryStatus | null;
  /** What the event is ABOUT. The collapse law keys on it — query events never fold. */
  scope: "query" | "agent" | "manuscript";
  /** How many consecutive events this line stands for. 1 = an ordinary row. */
  count: number;
  /** DISTINCT subjects inside the run — six edits to one agent is not "six agents". */
  subjects: number;
  /** The run's subject NAMES, in order, so a collapsed row can name who it stands for. */
  subjectNames: string[];
  /** The EARLIEST time in a folded run, so a run reads as a span rather than one instant. */
  fromTime: string;

  /* ── the conversation (dashboard redesign, Phase 6) ─────────────────────────────────────────
     ⚠️ THE SHAPE IS `lib/feedConversation`'s, IMPORTED. `kind` is decided by the presence of a
     `queryId` and by nothing else — keying it off `resultingStatus` would draw every pre-migration
     query send as a white desk bubble, silently. `scope` above is a different question and stays:
     it chooses which lookup resolves the SUBJECT, not what the bubble is. */
  kind: "query" | "housekeeping";
  side: Side;
  /** the v2 state whose fill the bubble takes — `null` on housekeeping and on a neutral query */
  state: State | null;
  /** the exact status for `StatusDot`. Never a string that is not an enum member. */
  status: QueryStatus | null;
  /** a query event the record cannot place: no fill, no state label, and no guess */
  neutral: boolean;
  /** offered only while the query still sits at the request this bubble recorded */
  markSent: boolean;
  queryId: string;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PILL_FOR: Partial<Record<QueryStatus, { label: string; sage: boolean }>> = {
  [QueryStatus.QUERIED]: { label: "Query sent", sage: false },
  [QueryStatus.PARTIAL_REQUESTED]: { label: "Partial requested", sage: true },
  [QueryStatus.PARTIAL_SENT]: { label: "Partial sent", sage: false },
  [QueryStatus.FULL_REQUESTED]: { label: "Full requested", sage: true },
  [QueryStatus.FULL_SENT]: { label: "Full sent", sage: false },
  [QueryStatus.REVISE_RESUBMIT]: { label: "Revise & resubmit", sage: true },
  [QueryStatus.OFFER]: { label: "An offer", sage: true },
  [QueryStatus.REJECTED]: { label: "Closed", sage: false },
  [QueryStatus.WITHDRAWN]: { label: "Withdrawn", sage: false },
  [QueryStatus.NO_RESPONSE]: { label: "Closed", sage: false },
};

/**
 * ⚠️ EVERY EVENT TYPE GETS ITS OWN LABEL. "Status changed" was being shown for an agent being
 * ADDED — the generic fallback covering for a map that only knew about query statuses. An
 * unmapped type is a BUG, not something to paper over: `feedLabel` returns null for one and the
 * row is dropped, and a test enumerates the whole enum so adding a type without a label fails
 * the suite rather than shipping a mislabelled row.
 */
const TYPE_PILL: Record<string, { label: string; sage: boolean }> = {
  [ActivityType.STATUS_CHANGED]: { label: "Status changed", sage: false },
  [ActivityType.QUERY_SENT]: { label: "Query sent", sage: false },
  [ActivityType.MATERIALS_SENT]: { label: "Materials sent", sage: false },
  [ActivityType.NUDGE_SENT]: { label: "Nudge sent", sage: false },
  [ActivityType.OFFER_ACCEPTED]: { label: "Offer accepted", sage: true },
  [ActivityType.OFFER_DECLINED]: { label: "Offer declined", sage: false },
  [ActivityType.AGENT_ADDED]: { label: "Agent added", sage: false },
  [ActivityType.AGENT_UPDATED]: { label: "Agent updated", sage: false },
  [ActivityType.AGENT_DELETED]: { label: "Agent removed", sage: false },
  [ActivityType.MANUSCRIPT_ADDED]: { label: "Manuscript added", sage: false },
  [ActivityType.MANUSCRIPT_UPDATED]: { label: "Manuscript updated", sage: false },
  [ActivityType.MANUSCRIPT_DELETED]: { label: "Manuscript removed", sage: false },
};

/**
 * ⚠️ A CAPTION ADDS WHAT THE SUBJECT LINE DOES NOT ALREADY SAY (fixes-2 A3).
 *
 * THE FAULT: `agentPrimary` correctly falls back to the AGENCY for a nameless agent — and the
 * caption then led with the agency too, so the row read
 *
 *     Penhallow Literary
 *     PENHALLOW LITERARY · DETAILS UPDATED
 *
 * ⚠️ THIS IS A GENERAL RULE, NOT AN AGENT-UPDATED PATCH. The same fallback fires on every agent
 * event and on query rows whose agent has no name, so the rule lives in one function both paths
 * call rather than in a condition at one call site.
 *
 * The comparison is case- and space-insensitive because the caption is uppercased by CSS and the
 * two strings come from different fields of the same record.
 */
export const captionFor = (subject: string, ...parts: (string | undefined)[]): string => {
  const norm = (v: string) => v.trim().toLowerCase();
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p && norm(p) !== norm(subject))
    .join(" · ");
};

/** The caption's tail for an agent event — what was done, in words, since the pill is the verb. */
const agentEventContext = (t: string): string =>
  t === ActivityType.AGENT_ADDED ? "added to your list"
    : t === ActivityType.AGENT_DELETED ? "removed from your list"
      : "details updated";

/** Which family an event belongs to decides HOW its subject is found. */
const AGENT_TYPES = new Set<string>([ActivityType.AGENT_ADDED, ActivityType.AGENT_UPDATED, ActivityType.AGENT_DELETED]);
const MS_TYPES = new Set<string>([ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED]);

/** The pill for an event: its resulting STATUS where it has one (more specific), else its type. */
export const feedLabel = (a: Pick<Activity, "activityType" | "resultingStatus">): { label: string; sage: boolean } | null =>
  (a.resultingStatus ? PILL_FOR[a.resultingStatus] : undefined) ?? TYPE_PILL[a.activityType] ?? null;

/**
 * ⚠️ THE SUBJECT IS FOUND PER TYPE, not down one universal path. The single
 * `queryId → query → agent` lookup was the root cause: agent and manuscript events are written
 * with `queryId: ""` DELIBERATELY (they are not query-scoped), so every one of them fell through
 * to an em dash and a "Status changed" label.
 *
 * ⚠️ NO ROW MAY RENDER AN EM DASH WHERE A NAME BELONGS. A row whose subject cannot be resolved is
 * DROPPED, not blanked — and `feedLabel` returning null drops it too.
 *
 * ⚠️ Agent events resolve through their DESCRIPTION, used whole and never parsed: `Activity`
 * carries no `agentId`, and the description is the sentence the writer's own action produced
 * ("Added Sophie Dunn at Curtis Vane"). Using it entire is honest; picking a name out of it with
 * a regex would be the string-parsing this codebase forbids elsewhere.
 */
/** One run of the descriptive sentence. `em` marks the manuscript title. */
export type FeedSeg = { t: string; em?: boolean };

/**
 * ⚠️ EVERY CLAUSE HERE IS DERIVABLE FROM THE RECORD, AND THAT IS THE WHOLE CONSTRAINT.
 *
 * The ref's fixture writes clauses this app cannot support — "the first 50 pages", "after reading
 * the partial", "the full 50,000-word manuscript". Those are facts about a specific submission that
 * our log does not carry, and inventing them would be the copy fault this repo already records
 * three times: a sentence that names a behaviour the data cannot back is disproved by the reader at
 * a glance, and what they learn is that the app's prose cannot be trusted.
 *
 * So: the SUBJECT (who acted), the VERB (what the status says they did), the OBJECT (the
 * manuscript, when it resolves), and ONE optional clause — how long after the query went out. That
 * last is arithmetic on `dateSent`, so it is true whenever `dateSent` exists and is omitted
 * whenever it does not.
 *
 * ⚠️ THE ANCHOR IS ALWAYS "you queried", NEVER THE MOST RECENT THING YOU DID. The ref varies it
 * ("22 days after you sent the full manuscript"), which needs the query's whole history walked and
 * is a different claim on every row. One anchor is one derivation, always available and never
 * wrong; a varying anchor is four derivations and a chance to state the wrong one.
 */
export const describeEvent = (
  status: QueryStatus | null,
  who: string,
  msTitle: string,
  daysSinceSent: number | null,
): FeedSeg[] | null => {
  if (!status || !who) return null;
  const book: FeedSeg[] = msTitle ? [{ t: " " }, { t: msTitle, em: true }] : [];
  const to: FeedSeg[] = [{ t: ` to ${who}` }];
  let head: FeedSeg[] | null = null;
  switch (status) {
    case QueryStatus.QUERIED:
      head = msTitle ? [{ t: "You sent your query for" }, ...book, ...to] : [{ t: `You queried ${who}` }];
      break;
    case QueryStatus.PARTIAL_REQUESTED:
      head = [{ t: `${who} asked to read part of` }, ...book];
      break;
    case QueryStatus.PARTIAL_SENT:
      head = [{ t: "You sent the partial of" }, ...book, ...to];
      break;
    case QueryStatus.FULL_REQUESTED:
      head = [{ t: `${who} asked for the full manuscript of` }, ...book];
      break;
    case QueryStatus.FULL_SENT:
      head = [{ t: "You sent the full manuscript of" }, ...book, ...to];
      break;
    case QueryStatus.REVISE_RESUBMIT:
      head = [{ t: `${who} invited a revise and resubmit on` }, ...book];
      break;
    case QueryStatus.OFFER:
      head = [{ t: `${who} offered representation for` }, ...book];
      break;
    case QueryStatus.REJECTED:
      head = [{ t: `${who} passed on` }, ...book];
      break;
    case QueryStatus.WITHDRAWN:
      head = [{ t: "You withdrew your query for" }, ...book, { t: ` from ${who}` }];
      break;
    /* ⚠️ NOT "they ignored you". The status means the stated window passed with nothing recorded,
       which is a fact about the RECORD and not about the agent — they may have replied somewhere
       this app never saw. */
    case QueryStatus.NO_RESPONSE:
      head = [{ t: `No reply recorded from ${who} about` }, ...book];
      break;
    default:
      return null;
  }
  /* the one derived clause, and only where the query has a send date to measure from */
  if (daysSinceSent !== null && daysSinceSent >= 1 && status !== QueryStatus.QUERIED) {
    head.push({ t: `, ${daysSinceSent} ${daysSinceSent === 1 ? "day" : "days"} after you queried` });
  }
  return head;
};

export const feedRows = (
  activities: Activity[],
  queries: Query[],
  agents: Agent[],
  manuscripts: Manuscript[],
  now: Date,
): FeedRow[] => {
  const from = now.getTime() - 30 * 86400000;
  const rows: FeedRow[] = [];

  for (const { a, t } of activities
    .map((x) => ({ a: x, t: new Date(x.date).getTime() }))
    .filter((x) => Number.isFinite(x.t) && x.t >= from && x.t <= now.getTime())
    .sort((x, y) => y.t - x.t)) {
    const shape = bubbleShape(a);
    const pill = feedLabel(a);
    /* ⚠️ AN UNMAPPED HOUSEKEEPING TYPE IS STILL A BUG AND STILL DROPS — that law is unchanged. A
       QUERY event with no label does NOT drop: it becomes a neutral bubble, because "this happened
       on this query and the record does not say what it did" is true, and dropping it would hide
       an event that occurred. */
    if (!pill && shape.kind === "housekeeping") continue;

    let who = "";
    let caption = "";
    let say: FeedSeg[] | null = null;
    let queryAgency = "";
    let scope: FeedRow["scope"] = "query";
    if (AGENT_TYPES.has(a.activityType)) {
      scope = "agent";
      /**
       * ⚠️ SUBJECT GRAMMAR: THE ROW NAMES WHO, NOT WHAT HAPPENED IN A SENTENCE (polish P5). The
       * pill is the verb; this line is the subject. A sentence is what ran out of room and got
       * truncated mid-clause, and it is what hid the missing-name bug — "You updated details for
       * at Penhallow" reads as a layout problem rather than the data fault it is.
       *
       * ⚠️ THE SUBJECT IS LOOKED UP, NOT PARSED OUT. `Activity` carries no `agentId`, and picking
       * a name out of the description with a regex is the string-parsing this codebase forbids.
       * So the AGENT LIST is the authority: find the agent this description NAMES, by testing
       * known values against it. Longest match wins, or "Vane" would claim "Vane-Coe".
       *
       * ⚠️ AND THIS REPAIRS LEGACY RECORDS. Descriptions written before the db.tsx fix have a hole
       * where the name should be, but they still carry the AGENCY — so an agency match recovers
       * the subject for rows that can never be repaired at source.
       */
      const desc = a.description;
      let best: Agent | undefined;
      let bestLen = 0;
      for (const ag of agents) {
        for (const token of [agentPrimary(ag), ag.agency]) {
          const t = (token ?? "").trim();
          if (t.length > bestLen && desc.includes(t)) { best = ag; bestLen = t.length; }
        }
      }
      if (best) {
        who = agentPrimary(best);
        caption = captionFor(who, best.agency, agentEventContext(a.activityType));
      } else {
        /* No match — a deleted agent, or a description naming nobody we hold. The whole sentence
           is the honest fallback: it is what we know, and the row is not dropped. */
        who = desc.trim();
      }
    } else if (MS_TYPES.has(a.activityType)) {
      scope = "manuscript";
      who = manuscripts.find((m) => m.id === a.manuscriptId)?.title?.trim() || a.description.trim();
    } else {
      const q = queries.find((x) => x.id === a.queryId);
      const agent = q ? agents.find((x) => x.id === q.agentId) : undefined;
      who = (agent?.name || agent?.agency || "").trim();
      const msTitle = manuscripts.find((m) => m.id === a.manuscriptId)?.title;
      caption = captionFor(who, agent?.agency, msTitle);
      /* ⚠️ THE ELAPSED CLAUSE IS ARITHMETIC ON THE QUERY'S OWN `dateSent`, and it is `null` the
         moment that date is absent or unparseable. A query with no send date is ordinary — an
         import can carry one without it — and the sentence simply loses its last clause rather
         than gaining a wrong number. */
      /* ⚠️ THE AGENCY IS THE AGENT'S OWN FIELD. `metaAgency` below used to be
         `caption.split(" · ")[1]`, and `captionFor(who, agency, msTitle)` puts the MANUSCRIPT in
         that slot whenever an agency exists — so the line labelled "agency" throughout this file
         has been rendering the book's title. It read plausibly while the surname sat beside it
         ("Whitfield · The Smoke Test" looks like a person and their book) and became obvious the
         moment the surname came off and the meta stood alone under a sentence that already names
         the book. Splitting a display string to recover a field is the string-parsing this file
         forbids two hundred lines up; the field was there all along. */
      queryAgency = (agent?.agency ?? "").trim();
      const sentAt = q?.dateSent ? new Date(q.dateSent).getTime() : NaN;
      const days = Number.isFinite(sentAt) ? Math.round((t - sentAt) / 86400000) : null;
      say = describeEvent(shape.status, who, (msTitle ?? "").trim(), days);
    }
    /* ⚠️ NEVER AN EM DASH WHERE A NAME BELONGS — an unresolvable subject drops the row */
    if (!who) continue;

    /* ⚠️ THE SENTENCE IS THE RECORD'S OWN, AND THE FALLBACK IS THE SUBJECT RATHER THAN A BLANK.
       A description is written at the point of the action, so every live path has one; a legacy
       record that does not is still worth a row, and the name it resolved to is what we know. */
    const sentence = a.description?.trim() || who;
    /* ⚠️ THE SURNAME, NOT THE FULL NAME — ref `.m` is `${g.sur} · ${g.agency}`. The meta line is a
       reference back to a person already named in the sentence above it, so a full name would
       repeat that sentence's own subject two lines apart. */
    const surname = who.split(/\s+/).filter(Boolean).slice(-1)[0] ?? who;
    const metaAgency = shape.kind === "housekeeping" ? "" : queryAgency;

    const d = new Date(t);
    rows.push({
      id: a.id,
      dayLabel: `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      pill: pill.label,
      sage: pill.sage,
      time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase(),
      who,
      sentence,
      say,
      surname: shape.kind === "housekeeping" ? "" : surname,
      agency: metaAgency,
      caption,
      dotStatus: a.resultingStatus ?? null,
      scope,
      count: 1,
      subjects: 1,
      subjectNames: [who],
      fromTime: "",
      kind: shape.kind,
      side: shape.side,
      state: shape.state,
      status: shape.status,
      neutral: shape.kind === "query" && shape.status === null,
      markSent: markSentOffered(a, queries),
      queryId: a.queryId ?? "",
    });
  }
  return collapseFeedRuns(rows);
};

/**
 * ⚠️ A RUN IS FOLDED, NOT FILTERED (audit P7). Editing one agent six times in an afternoon wrote
 * six identical lines and pushed a week of real querying off the card. The six are still all
 * there — they are one line that says so — because a feed that silently drops events is worse
 * than a noisy one.
 *
 * THREE RULES, and each exists because breaking it loses information:
 *
 * 1. **QUERY-SCOPED EVENTS NEVER FOLD.** Two "Query sent" rows naming the same agent on the same
 *    day are two different queries. Folding them would report one submission where two happened —
 *    the one kind of error this feed must never make. Only agent and manuscript housekeeping
 *    folds, because there the repetition genuinely is one record being worked on.
 *
 * 2. **ONLY CONSECUTIVE ROWS FOLD — a run never merges across an interruption.** If an agent edit
 *    is followed by a query sent and then another edit of the same agent, that is TWO runs of one,
 *    not one run of two: the events did not happen together, and the order is the story the feed
 *    is telling. (This is why the fold walks the sorted list rather than grouping by key — a
 *    `groupBy` would silently merge the two ends around the interruption.)
 *
 * 3. **THE DAY IS PART OF THE KEY.** Rows are already day-grouped in the render, so a run
 *    crossing midnight would render under one day heading while containing another day's events.
 *
 * The fold keeps the FIRST row of the run (newest, since the list is newest-first) so the line
 * carries the most recent state, and records the run's earliest time so it reads as a span.
 */
export const collapseFeedRuns = (rows: FeedRow[]): FeedRow[] => {
  const out: FeedRow[] = [];
  const subjectsSeen: Set<string>[] = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    const foldable =
      prev
      && prev.scope !== "query" && r.scope !== "query"
      && prev.scope === r.scope
      && prev.dayLabel === r.dayLabel
      && prev.pill === r.pill;
    if (foldable) {
      const seen = subjectsSeen[subjectsSeen.length - 1];
      seen.add(r.who);
      // `prev` is the newer row; `r` is older, so it supplies the run's start time.
      out[out.length - 1] = {
        ...prev,
        count: prev.count + 1,
        subjects: seen.size,
        subjectNames: [...seen],
        fromTime: r.time,
      };
      continue;
    }
    out.push(r);
    subjectsSeen.push(new Set([r.who]));
  }
  return out;
};

/**
 * A folded run's two lines, in the SAME grammar as an ordinary row: the line is the subject, the
 * caption is the context. `null` when the row is not a run, or when the run has one subject —
 * six edits to ONE agent is not "six agents", so that row keeps its own name and shows ×n.
 */
export const runLines = (r: FeedRow): { line: string; caption: string } | null => {
  if (r.count < 2 || r.subjects < 2) return null;
  const noun = r.scope === "manuscript" ? "manuscripts" : "agents";
  return { line: `${r.subjects} ${noun}`, caption: nameList(r.subjectNames) };
};

/**
 * "Jonathan Marsh, Harriet Vane-Coe & 4 more" — two names then a count.
 *
 * ⚠️ TWO NAMES IS THE CAP BECAUSE THE CAPTION IS ONE LINE. Listing four and ellipsing the last
 * loses a name mid-word, which is the truncation this whole phase exists to remove; a stated
 * "& 4 more" is complete at whatever width it is given.
 */
export const nameList = (names: string[]): string => {
  const shown = names.slice(0, 2);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} & ${rest} more` : shown.join(" & ");
};

/** The pill's words for a run — the verb pluralises with its subjects. */
export const runPill = (r: FeedRow): string =>
  (r.count > 1 && r.subjects > 1 && r.pill.startsWith("Agent "))
    ? r.pill.replace(/^Agent /, "Agents ")
    : r.pill;

/* ── the rail ── */

export interface OneScreenRailProps {
  /* lifted to the page so the tour can collapse the rail before starting (§12) */
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userTasks: UserTask[];
  activities: Activity[];
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  /**
   * ⚠️ THE FEED'S ONE ACTION, AND IT OPENS THE PANEL'S DRAWER RATHER THAN A SECOND ONE. A
   * "Mark sent" here that mounted its own pane would be a second answer to what finishing a send
   * involves, three inches from the first. The rail hands up a query id; the dashboard resolves it
   * to a card and the to-do panel opens on it — one drawer, one session, one write path.
   */
  onOpenTask?: (queryId: string) => void;
  now: Date;
}

export const OneScreenRail: React.FC<OneScreenRailProps> = ({
  loading, queries, agents, manuscripts, activities, onOpenTask,
  activeManuscript, onNavigate, now,
}) => {
  const actvRef = useRef<HTMLDivElement>(null);

  const ms = activeManuscript ?? manuscripts[0] ?? null;
  const rows = useMemo(() => feedRows(activities, queries, agents, manuscripts, now), [activities, queries, agents, manuscripts, now]);
  const [tab, setTab] = useState<FeedTab>("all");
  /* ⚠️ THE FILTER ROW IS COLLAPSED AT REST AND THE FUNNEL OPENS IT — ref `body.ah-quiet #afilter`
     is `max-height:0;overflow:hidden`, with `.fopen` taking it to 60px. Four view tabs and their
     counts were standing permanently between the panel's title and the first thing that happened,
     on the one surface whose entire job is to be read top to bottom. They are a control, so they
     wait behind a control. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* ⚠️ THE COUNTS SUM TO `all` BY CONSTRUCTION, because `feedTabOf` gives each row exactly one tab
     and `all` is the length rather than a fourth sum. A tab whose count is derived separately is
     how a summary comes to disagree with the list beneath it. */
  const tabCounts = useMemo(() => {
    const c: Record<FeedTab, number> = { all: rows.length, in: 0, out: 0, desk: 0 };
    for (const r of rows) c[feedTabOf(r)]++;
    return c;
  }, [rows]);
  const shownRows = useMemo(() => (tab === "all" ? rows : rows.filter((r) => feedTabOf(r) === tab)), [rows, tab]);
  const runHeads = useMemo(() => tightRunHeads(shownRows), [shownRows]);


  /**
   * ⚠️ EVERY CHANGE APPENDS. Setting a target, changing one and removing one are the same write
   * with a different entry — which is what keeps a completed period readable with the target that
   * was actually in force while it ran. `appendGoalEntry` is the single place that shape is built.
   */


  return (
    <div className="os-colR">
      {/* ══ activity ══ */}
      <OneScreenPanel variant="os-actv" probe="activity-card" loading={loading} skel={["h", "", "", "grow"]} innerRef={actvRef}>
        <div className="os-ahead">
          {/* ⚠️ THE FLANKING RULES ARE GONE. They existed to centre the title on a plain card
              head; on a filled band they draw two lines across a colour that is already doing
              the separating. The title sits left, as the ref has it. */}
          <OneScreenMark name="activity" />
          <h2 data-probe-text="panel-title">Activity</h2>
          {/* ⚠️ THE COUNT IS THE FEED'S OWN, NOT THE FILTERED VIEW'S — ref `.sub2`, "14 events".
              It sits beside the title while the tabs are collapsed, so the panel still says how
              much there is to read without the row that lets you narrow it. */}
          {rows.length > 0 && (
            <span className="os-asub">{rows.length} {rows.length === 1 ? "event" : "events"}</span>
          )}
          <span className="os-asp" />
          {rows.length > 0 && (
            <button
              type="button"
              className={`os-funnel${filtersOpen ? " on" : ""}`}
              aria-expanded={filtersOpen}
              aria-controls="os-actv-filters"
              title="Filter"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <span className="sr-only">Filter the feed</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z" /></svg>
            </button>
          )}
          {/* ⚠️ THE CORNER EXPANDER IS STILL NOT BUILT, AND v22 DRAWING ONE DOES NOT CHANGE THAT.
              Its handler in the ref is `body.classList.toggle('tall')` and its tooltip is "Give the
              feed more room" — a control that makes the feed taller. This column is already the
              full height of the grid (`height:0; min-height:100%`), so there is no room for it to
              give: it would toggle a class, change nothing a reader can see, and read as a feature.
              That is the same reasoning the v16 pass retired it on, and the layout has only made it
              more true. Reported against the ref rather than quietly omitted. */}
          {/* ⚠️ THE EXPANDER IS RETIRED (ref v16, Phase 3), AND IT IS THE MOVE THAT RETIRED IT.
              It existed to give the feed the goals card's height; the goals card is the LEFT
              column's now, and Activity already occupies this column top to bottom. Expanding
              gained the feed nothing — the state's remaining effects were a heavier shadow, a
              hidden foot and an Escape hint for a thing that had not opened. A control whose only
              observable result is its own chrome is a control that lies about what it does. */}
        </div>
        {/* ⚠️ TABS ON A HAIRLINE, NOT PILLS. A pill row reads as a set of buttons of equal weight;
            these are a view selector, and the underline says which view you are in — the same
            grammar the app's other tab rows use. The active one underlines in burgundy, which is one
            of the four places this repo permits that colour. */}
        {/* ⚠️ THE WRAPPER IS THE PROBE, NOT THE TABS — ref `#afilter`, whose measured height at rest
            is ZERO while the `.ftabs` inside it is a full 37.9px. That is the design: a collapsed
            row is present, sized, and clipped to nothing. The harness had to learn the same thing —
            a probe with one zero dimension is visible for its purposes — because requiring both
            reported the row as absent from a page that renders it correctly. */}
        <div
          className={`os-afilter${filtersOpen ? " open" : ""}`}
          id="os-actv-filters"
          data-probe="activity-filters"
        >
        {rows.length > 0 && (
          <div className="os-ftabs" role="group" aria-label="Filter the feed">
            {FEED_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`os-ftab${tab === t.key ? " on" : ""}`}
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                {t.key !== "all" && <i style={{ background: t.dot }} aria-hidden="true" />}
                {t.label}
                <span className="os-ftabn">{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>
        )}
        </div>
        {/* ⚠️ THE SHARED FADE (polish P2) — conditional by construction, so a short feed shows
            none and the end of a long one is honestly the end. See the tasks card for the rule. */}
        {/* ⚠️ THE FADE IS THE GROUND'S TOO — ref `body.ac-hair .feedwrap:after`. Same reason as the
            day caption above it: with no card behind the panel, a `#fffdf9` fade paints a
            card-shaped wash at the foot of a column that has no card. */}
        <EdgeFadeScroll fade="#f4f0ea" outerClassName="os-abodywrap" scrollClassName="os-abody" scrollId="os-actv-body" scrollProbe="feed">
          {shownRows.length === 0 ? (
            <div className="os-aempty">
              <span className="os-aempty-thread" aria-hidden="true" />
              <span>{tab === "all" ? "The story starts with your first query." : "Nothing here yet."}</span>
            </div>
          ) : (
            shownRows.map((r, i) => {
              /* ⚠️ A TIGHT RUN DROPS THE FURNITURE, NEVER THE BUBBLE — the first of a same-side run
                 keeps its state label and its meta line so the burst can still be dated and
                 attributed; the rest read as one burst. */
              const head = runHeads[i];
              const newDay = i === 0 || r.dayLabel !== shownRows[i - 1].dayLabel;
              return (
                <React.Fragment key={r.id}>
                  {newDay && <div className="os-aday">{r.dayLabel}</div>}
                  {/* ⚠️ ALIGNMENT CARRIES DIRECTION, so there is no "From agents / From you" legend
                      — a legend for a thing the layout already says is the page explaining its own
                      picture. */}
                  <div className={`os-bub ${r.side}${r.kind === "housekeeping" ? " desk" : ""}${head ? "" : " run"}`}>
                    {/* ⚠️ THE KNOT IS GONE AND THE DOT MOVED INTO THE STRIP — ref `body.bw-full`
                        hides `.knot` and puts `sd(x.k,14)` at the head of `.striph`. The knot hung
                        off the bubble's outer edge, which only reads as an edge while the bubble is
                        indented; at full width there is no margin for it to hang in, so it would
                        have sat on top of the first word. The dot is still the app's one drawing of
                        a query status, and a housekeeping bubble still has none — that law is
                        unchanged, only its position. */}
                    {/* ⚠️ THE BODY IS PARCHMENT AND THE STATE COLOUR LIVES IN A STRIP ACROSS THE TOP
                        — ref `.b.v-strip`. The fill used to be the whole bubble, which made a feed
                        of eight events eight coloured rectangles and left the reader picking
                        sentences out of four different papers. In a strip the colour labels the
                        event and the words sit on the same ground as every other word on the page. */}
                    <div className="os-bubin">
                      {/* ⚠️ THE STRIP IS A QUERY BUBBLE'S ALONE — a housekeeping event has no query
                          state to name, so it has no strip to name it in, and its label sits in the
                          body with the sentence. Measured before this: seven housekeeping bubbles
                          rendering an empty strip, which drew a hairline across a card that has
                          nothing above the line. */}
                      {/* ⚠️ EVERY QUERY BUBBLE KEEPS ITS STRIP, INCLUDING INSIDE A TIGHT RUN, AND
                          THAT REVERSES A v16 DECISION ON THE REF'S AUTHORITY. A run used to drop
                          its furniture and read as one burst, which worked because the run's SIDE
                          said who it came from — the layout carried the direction and the members
                          needed nothing of their own. Full-width messages give that up, so a run
                          member with no strip has no direction, no state and no time: measured on
                          the harness account, four consecutive sends to THREE DIFFERENT AGENTS
                          rendered as one attributed burst and three anonymous lines. The ref draws
                          a strip on every message for the same reason. `head` still governs the
                          meta line and the tightened spacing, which is where the burst reads. */}
                      {r.kind === "query" && (
                        <div
                          className="os-bubstrip"
                          /* ⚠️ THE ONLY PLACE STATE COLOUR APPEARS ON A BUBBLE, and it is
                             `STATE_TOKEN`/`STATE_ACCENT` — never a local table. A neutral query
                             event (one the record cannot place) takes the strip's own default. */
                          style={r.state ? { background: STATE_TOKEN[r.state], borderBottomColor: STATE_ACCENT[r.state] } : undefined}
                        >
                          {r.status && (
                            <span className="os-bubsd" aria-hidden="true">
                              <StatusDot status={r.status} overrideSize={14} decorative />
                            </span>
                          )}
                          <span className="os-bublab">
                            {r.pill || "On this query"}
                            {r.count > 1 && <span className="os-runx">×{r.count}</span>}
                          </span>
                          {/* ⚠️ THE TIME RIDES THE STRIP AND MIRRORS WITH IT — ref `.tm3` is
                              `margin-left:auto`, and `.msg.out .striph` is `row-reverse` with the
                              time's margin flipped. So the strip reads dot, label, time on an
                              agent's event and time, label, dot on your own: direction is carried
                              by the ORDER of the strip rather than by which side of the column the
                              bubble sits on, which is what full-width messages give up. */}
                          <span className="os-bubtm">
                            {r.count > 1 && r.fromTime ? `${r.fromTime}–${r.time}` : r.time}
                          </span>
                        </div>
                      )}
                      <div className="os-bubbody">
                      {head && r.kind === "housekeeping" && (
                        <div className="os-bublab os-bublab-desk">
                          Housekeeping
                          {r.count > 1 && <span className="os-runx">×{r.count}</span>}
                        </div>
                      )}
                      {/* ⚠️ WHAT HAPPENED, NOT WHO — see `FeedRow.sentence`. A COLLAPSED run still
                          states its own count ("3 agents"), because a run's sentence is the thing
                          the fold exists to replace. */}
                      {/* ⚠️ THE COMPOSED SENTENCE WINS, THE LOG'S OWN WORDS ARE THE FALLBACK, AND A
                          FOLDED RUN OVERRIDES BOTH. A run's line is the thing the fold exists to
                          replace ("4 agents"), so it cannot be a sentence about one event. */}
                      <div className="os-bubsay">
                        {runLines(r)?.line
                          ?? (r.say
                            ? r.say.map((seg, i) => (seg.em
                                ? <em key={i}>{seg.t}</em>
                                : <React.Fragment key={i}>{seg.t}</React.Fragment>))
                            : r.sentence)}
                      </div>
                      {head && (
                        <div className="os-bubmeta">
                          {/* ⚠️ THE AGENCY IS THE ONLY PART THAT MAY ELLIPSE. The surname and the
                              time are what place the event; the agency is context, and it is the
                              one of the three that can be arbitrarily long. */}
                          {/* ⚠️ THE AGENCY ALONE, AND THE SURNAME IS GONE FROM HERE — ref
                              `body.bw-full .m .who2 b{display:none}`. It is not lost: the strip now
                              carries the state and the time, and the sentence above names the
                              person, so a surname on this line was the third statement of a subject
                              already given twice within two lines. What the agency adds is the one
                              thing neither of those says. */}
                          <span className="os-bubwho">
                            {r.kind === "housekeeping"
                              ? <i>Not tied to a query</i>
                              : runLines(r)?.caption
                                ? <i>{runLines(r)!.caption}</i>
                                : r.agency
                                  ? <i>{r.agency}</i>
                                  : <b>{r.surname}</b>}
                          </span>
                          {/* ⚠️ ONLY WHERE THERE IS NO STRIP TO CARRY IT. The ref hides `.tm2`
                              outright, because every one of its messages has a strip; ours does not
                              — a housekeeping event has no query state, so it has no strip, and
                              hiding the time here would leave it the one kind of event with no time
                              on it at all. */}
                          {r.kind === "housekeeping" && (
                            <span className="os-bubt">{r.count > 1 && r.fromTime ? `${r.fromTime}–${r.time}` : r.time}</span>
                          )}
                        </div>
                      )}
                      {/* ⚠️ OFFERED ONLY WHILE THE REQUEST IS STILL OPEN — read from the QUERY's
                          current status, never stored on the event, so it disappears the moment
                          the materials go out. */}
                      {r.markSent && (
                        <button type="button" className="os-bubact" onClick={() => onOpenTask?.(r.queryId)}>
                          Mark sent
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </EdgeFadeScroll>
        {/* §6: the footer is a quiet caption ONLY — no link; the arrows are the sole route in */}
        <div className="os-afoot"><span className="os-ac">Last 30 days</span></div>
      </OneScreenPanel>

      {/* ⚠️ THE PRO MINI LEFT THE RAIL (v16 §5) — it is the full-width banner beneath tasks now
          (OneScreenPro). Do not reinstate one here: two upsells on one screen sell the same thing
          twice, and the rail's job is goals and the record. */}
    </div>
  );
};

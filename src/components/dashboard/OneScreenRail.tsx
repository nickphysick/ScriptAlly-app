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
    const metaAgency = shape.kind === "housekeeping" ? "" : (caption.split(" · ")[1] ?? "");

    const d = new Date(t);
    rows.push({
      id: a.id,
      dayLabel: `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      pill: pill.label,
      sage: pill.sage,
      time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase(),
      who,
      sentence,
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
        {rows.length > 0 && (
          <div className="os-ftabs" data-probe="activity-tabs" role="group" aria-label="Filter the feed">
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
        {/* ⚠️ THE SHARED FADE (polish P2) — conditional by construction, so a short feed shows
            none and the end of a long one is honestly the end. See the tasks card for the rule. */}
        <EdgeFadeScroll fade="#fffdf9" outerClassName="os-abodywrap" scrollClassName="os-abody" scrollId="os-actv-body" scrollProbe="feed">
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
                    {/* ⚠️ THE KNOT IS THE REAL `StatusDot`, HUNG OFF THE OUTER EDGE — and a
                        HOUSEKEEPING bubble has none, because it has no query state to draw. That is
                        not a style choice: the dot is the app's one drawing of a query status, and
                        an event not tied to a query has no status to show. */}
                    {r.kind === "query" && r.status && (
                      <span className="os-knot" aria-hidden="true">
                        <StatusDot status={r.status} overrideSize={13} decorative />
                      </span>
                    )}
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
                      {head && r.kind === "query" && (
                        <div
                          className="os-bubstrip"
                          /* ⚠️ THE ONLY PLACE STATE COLOUR APPEARS ON A BUBBLE, and it is
                             `STATE_TOKEN`/`STATE_ACCENT` — never a local table. A neutral query
                             event (one the record cannot place) takes the strip's own default. */
                          style={r.state ? { background: STATE_TOKEN[r.state], borderBottomColor: STATE_ACCENT[r.state] } : undefined}
                        >
                          <span className="os-bublab">
                            {r.pill || "On this query"}
                            {r.count > 1 && <span className="os-runx">×{r.count}</span>}
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
                      <div className="os-bubsay">{runLines(r)?.line ?? r.sentence}</div>
                      {head && (
                        <div className="os-bubmeta">
                          {/* ⚠️ THE AGENCY IS THE ONLY PART THAT MAY ELLIPSE. The surname and the
                              time are what place the event; the agency is context, and it is the
                              one of the three that can be arbitrarily long. */}
                          <span className="os-bubwho">
                            {r.kind === "housekeeping"
                              ? <i>Not tied to a query</i>
                              : runLines(r)?.caption
                                ? <i>{runLines(r)!.caption}</i>
                                : <><b>{r.surname}</b>{r.agency && <i>&nbsp;· {r.agency}</i>}</>}
                          </span>
                          <span className="os-bubt">{r.count > 1 && r.fromTime ? `${r.fromTime}–${r.time}` : r.time}</span>
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskPaneJourney — the data side of the port.
 *
 * ⚠️ THIS FILLS IN THE MOCKUP'S `DATA` SHAPE AND NOTHING MORE. `design-refs/todo-materials-contract.html`
 * declares one object per journey — deed, sub, fig/figU, btns, tiles, actTitle/actSub/body,
 * will/quiet/prim, tl — and the pane renders whatever is in it. So the wiring's whole job is to
 * answer those fields from a `BoardCard`; it never reaches into the pane's markup, and the pane
 * never branches on a task type.
 *
 * ⚠️ ABSENCE IS A VALUE HERE, NOT A MISSING BRANCH. `tiles: null` hides the tile row; `tl: null`
 * drops the story column and leaves the middle one column. Both are the contract's own handling,
 * which is exactly why the structure does not have to bend when a journey is thin.
 *
 * ⚠️ THE DERIVATIONS ARE THE ONES ALREADY IN THE APP — `liveFamily`/`GROUP_CLASS` for the paper,
 * `bandDeed`/`bandSubline` for the words, `panePresence` for what a journey carries, `cardBucket`
 * for the act. Re-deriving any of them here would give the pane a second opinion about a card the
 * rest of the page has already settled.
 */
import React from "react";
import { QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import { GROUP_CLASS, liveFamily } from "./todoFamily";
import { anchorNoun, bandSubline, bandPreline, bandUnder, panePresence } from "./todoHandoff";
import { cardFootHint, deedSentence, type DeedParts } from "./todoBuckets";
import { paneCopy } from "./taskListRow";
import type { TaskPaneEvent, TaskPaneJourney, TaskPaneTile } from "../components/todo/TaskPane";

/** what the page hands in — every one of these is already computed for the list */
export interface JourneyInputs {
  card: BoardCard;
  /** the stat pair the header already derives */
  facts: { k: string; v: string }[];
  /** what already went to this agent, formatted through the one formatter */
  sentPreviously: string | null;
  /**
   * The activity-log timeline, oldest first.
   *
   * ⚠️ `status` IS THE LOG'S OWN `resultingStatus ?? type`, PASSED THROUGH UNJUDGED. It is a
   * QueryStatus on a status change and an activity type otherwise; deciding which is `toEntry`'s
   * job, above, and doing it at the call site would put that test in two places.
   */
  events: { key: string; label: string; when: string; via?: string; status?: string; incoming?: boolean; minor?: boolean }[];
  /** the verb the list row states, so the pane cannot name the deed differently */
  primaryLabel: string;
  /** a note's age, already formatted — "2 days ago". Absent on every other journey. */
  noteAdded?: string;
  /** a send whose material is a partial — the sentence's only split */
  partial?: boolean;
  /** a note's own added date, for the form's meta line — "18 Aug" */
  noteAddedDate?: string;
  /** what is still unanswered — the ONE list the chip, the line and the square all read */
  missing?: { id: string; name: string }[];
  /** the writer pressed an incomplete primary */
  showMissing?: boolean;
  onJump?: (id: string) => void;
  /** what pressing the primary will write */
  will: string;
  body: React.ReactNode;
  btns?: { label: string; onPress: (anchor: HTMLElement) => void }[];
  quiet?: { label: string; onPress: () => void };
  onOpenQuery?: () => void;
  primDisabled?: boolean;
  /**
   * ⚠️ THE COHORT'S TWO NUMBERS. `count` is how many queries the gap stands for; `touched` is how
   * many the writer has filled in. One source for the band, the strip and the primary's own label —
   * three surfaces that must never be able to state different totals about one table.
   */
  bulk?: { count: number; touched: number };
  /** the action bar's verbs — see `TaskPaneJourney` for why absence is not the same as disabled */
  onSnooze?: (anchor: HTMLElement) => void;
  onDismiss?: () => void;
}

/**
 * ⚠️ THE DEED CARRIES AN `<em>` (the mockup: `Send your <em>full manuscript</em>`), and it is built
 * rather than parsed out of a string. The emphasis falls on the OBJECT — what is being sent, chased
 * or logged — because that is the word you scan for; the verb is the same on every card in a group.
 */
function deedNode(c: BoardCard, parts: DeedParts): React.ReactNode {
  /* ⚠️ `<i>`, NOT `<em>`, AND NO COLOUR. The emphasis is typographic — italic in the heading's own
     ink — because a heading that shifts colour mid-sentence reads as two things, and the reader
     has to work out which half is the point. The stylesheet enforces `color: inherit`; this picks
     the spans. `<em>` carried a burgundy rule for three rounds and is retired with it. */
  const spans = deedSentence(c, parts);
  if (spans.length === 1 && !spans[0].em) return spans[0].text;
  return <>{spans.map((s, i) => (s.em ? <i key={i}>{s.text}</i> : <React.Fragment key={i}>{s.text}</React.Fragment>))}</>;
}

/**
 * ⚠️ THE BOUNDARY WHERE A STRING BECOMES A STATUS (pane round, Phase 8). The log's rung carries
 * `resultingStatus ?? type`, which is a status on a status change and an ACTIVITY TYPE otherwise —
 * `NUDGE_SENT` among them. Nothing downstream can tell those apart by looking, so the telling
 * happens once, here, against the enum itself.
 *
 * ⚠️ DERIVED FROM `QueryStatus`, NEVER A HAND-WRITTEN LIST. A tenth status added to the enum is
 * admitted the moment it exists; a list here would have quietly demoted it to a mark and drawn a
 * hollow circle where a real dot belonged.
 */
const QUERY_STATUSES = new Set<string>(Object.values(QueryStatus));
const asQueryStatus = (s: string | undefined): QueryStatus | null =>
  s && QUERY_STATUSES.has(s) ? (s as QueryStatus) : null;

/** one log rung → one typed entry; the status test decides which kind it is */
function toEntry(e: JourneyInputs["events"][number]): TaskPaneEvent {
  const status = asQueryStatus(e.status);
  const base = { key: e.key, t: e.label, d: e.via ? `${e.when} · ${e.via}` : e.when };
  return status
    ? { ...base, kind: "status", status }
    : { ...base, kind: "mark", ...(e.incoming ? { incoming: true } : {}) };
}

export function buildJourney(input: JourneyInputs): TaskPaneJourney {
  const { card: c } = input;
  const presence = panePresence(c);
  const isNote = !!(c.userTaskId || c.nature || c.stream === "nt");

  /**
   * ⚠️ A LABEL MAY NOT REPEAT INSIDE ONE TILE ROW (frame2 Phase 3). `paneFacts` can return two
   * entries whose keys resolve to the same word — a card with no query behind it produced "Added"
   * twice, one reading "12 days" and one "7 August", which states one fact under one name in two
   * places and invites the reader to think they are different. The FIRST wins: it is the row's own
   * order, and the second was the duplicate.
   */
  /**
   * ⚠️ THE "MOST RECENT INTERACTION" TILE READS THE STORY COLUMN'S OWN LAST RUNG (pane round,
   * Phase 5), rather than re-deriving "the latest thing" from the query. Two derivations of the
   * same fact, side by side in one pane, is how a tile comes to say 4 May while the rail beneath it
   * ends on 23 July — and the reader has no way to tell which is the record. One array, read twice.
   *
   * ⚠️ AND IT DEGRADES TO THE DATE RATHER THAN TO NOTHING. A close card whose query has no logged
   * activity still has an anchor date, which is a true fact; what it does not have is an
   * interaction to name, so the tile keeps the date and adds no second line.
   */
  const lastEvent = input.events.length ? input.events[input.events.length - 1] : null;
  const anchorKey = anchorNoun(c);

  const seen = new Set<string>();
  const tiles: TaskPaneTile[] | null = presence.tiles
    ? [
        ...input.facts.map((f) =>
          f.k === anchorKey && lastEvent
            ? {
                k: f.k,
                val: lastEvent.label,
                small: lastEvent.via ? `${lastEvent.when} · ${lastEvent.via}` : lastEvent.when,
              }
            : { k: f.k, val: f.v }),
        {
          k: "Sent previously",
          val: input.sentPreviously ?? "None sent",
          absent: !input.sentPreviously,
        },
      ].filter((t) => {
        const key = t.k.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    : null;

  /**
   * ⚠️ THE TERMINUS IS PART OF THE DATA, not something the pane appends. The mockup's own array
   * ends `['now','Your turn','Today']`, so a rail that stopped at the last thing that happened
   * would be a shorter array, not a different renderer.
   */
  const tl: TaskPaneEvent[] | null = presence.timeline
    ? [
        ...input.events.map(toEntry),
        { key: "__now", kind: "now" as const, t: "Your turn", d: "Today" },
      ]
    : null;

  return {
    cls: `u-${GROUP_CLASS[liveFamily(c)]}` as TaskPaneJourney["cls"],
    /* ⚠️ THE SENTENCE'S PARTS COME FROM THE CARD THE LIST ALREADY BUILT — `msTitle`, `who`, and the
       agency the band already splits out of `record`. Nothing is looked up again, so the pane and
       the row cannot name different people. */
    deed: isNote ? c.title : deedNode(c, {
      title: c.msTitle,
      agent: c.who,
      agency: bandUnder(c),
      ...(typeof input.partial === "boolean" ? { partial: input.partial } : {}),
      ...(input.bulk ? { bulkCount: input.bulk.count } : {}),
    }),
    hand: isNote,
    /* ⚠️ THE NOTE'S SUB-LINE SAYS WHOSE IT IS AND HOW OLD (finishing round, Phase 5). It printed
       `cardFootHint`, which is the sentence about ticking it off — the SAME sentence the form's
       meta line carries, so the pane said it twice, three inches apart. The band now states the
       provenance, which is the thing a sub-line is for; the form keeps the sentence. */
    /* ⚠️ A COHORT'S SUB-LINE STATES THE COHORT (finishing round, Phase 6). `bandSubline` composes
       a preline with an AGENT, and a bulk card has none — so it fell through to the preline alone
       and the band read "A gap on the record for", a sentence stopped in the middle of itself. The
       count is the subject here, and it comes from the same `bulkCount` the row states.
       ⚠️ AND THE IMPORT DATE IS ABSENT BECAUSE NOTHING STORES ONE — see the report. The earliest
       `dateSent` in the cohort would be a FIRST-QUERY date wearing an import label, which is the
       fault the Manuscripts tile already paid for once. The clause is omitted, not invented. */
    /**
     * ⚠️ THE SUB-LINE GOES WHERE THE DEED BECAME A SENTENCE (deed round, Phase 1). It existed to
     * name the agent and the agency the deed could not fit; the sentence names them, and a second
     * line repeating the pair three millimetres below is the same fact twice. The request DATE it
     * also carried is in the tiles, which is where a date belongs.
     *
     * ⚠️ THE NOTE KEEPS ITS SUB-LINE, and that is not an exception being carved — a note's deed is
     * the WRITER'S OWN WORDS, so it never gained a sentence to absorb the provenance. "Your own
     * note · added 2 days ago" is the only place that fact is stated.
     */
    sub: isNote
      ? (input.noteAdded ? `Your own note · added ${input.noteAdded}` : "Your own note")
      : "",
    btns: input.btns,
    tiles,
    /* ⚠️ THE PANE'S WORDS COME FROM THE ONE TABLE, not from the row's verb. `primaryLabel` is what
       the LIST says a card is for; the form beside it asks a different question, and the two had
       drifted into "Consider closing" against "Complete". */
    /* a note's form has no heading either — the words ARE the heading */
    actTitle: isNote ? "" : paneCopy(c).heading ?? "",
    /* ⚠️ THE JOURNEY'S OWN WORDS WHERE IT HAS THEM (Phase 5). Close carries a line that has to be
       carried verbatim — it is what stops "closing" reading as "rejecting" — and the generic foot
       hint said something true but weaker in its place. Everything else still falls back. */
    /* ⚠️ AND A NOTE HAS NO ACT SUB-LINE AT ALL. Its form opens with the writer's own words; a hint
       above them would be the app speaking first on the one journey that is entirely the writer's. */
    actSub: isNote ? "" : paneCopy(c).note ?? cardFootHint(c),
    body: input.body,
    will: input.will,
    quiet: input.quiet,
    /* ⚠️ THE BULK PRIMARY STATES ITS COUNT, AND IS INERT AT ZERO — the ONE journey whose primary is
       not always clickable, and the reason is stated rather than inherited: every other journey can
       point at the first missing field, and a table cannot, because every row is equally the one
       meant. A button reading "Log 0 queries" says what it would do; a disabled button with a
       generic label would say only that something is wrong. */
    bulk: input.bulk,
    missing: input.missing,
    showMissing: input.showMissing,
    onJump: input.onJump,
    prim: input.bulk
      ? `Log ${input.bulk.touched} ${input.bulk.touched === 1 ? "query" : "queries"}`
      : paneCopy(c).primary,
    primDisabled: input.bulk ? input.bulk.touched === 0 : input.primDisabled,
    tl,
    onOpenQuery: c.relatedRecordId ? input.onOpenQuery : undefined,
    onSnooze: input.onSnooze,
    onDismiss: input.onDismiss,
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashTodo — the dashboard's to-do rows (v16, 18 Sep; ref design-refs/dashboard-v16-2026-09-18.html).
 *
 * A row per card on the board's live columns: the state glyph, what to do and with whom, the date the
 * clock runs from, and the day count.
 *
 * ⚠️ NOT A SECOND BOARD. The cards are `assembleBoardColumns`' — the same call the sidebar badge and
 * every Tasks page make — and every fact on a row comes from the accessors the To-do page's own list
 * rows use (`listRowInputs`, `ticketFacts`). This module arranges them; it derives nothing new about a
 * task.
 *
 * ⚠️ THE PROGRESS BAR IS RETIRED (20 Sep) — the row states its age as a figure, and a bar beside a
 * figure is the same fact drawn twice. It was the only reader of `TodoBar`, so the type went with it;
 * what survives is `replyWindow`, which is the half that was never about drawing. The task panel's
 * "reply expected" reads it, and a second derivation of a reply window is how two surfaces come to
 * disagree about when a reply is due.
 */
import { ActivityType, QueryStatus, type Activity, type Query } from "../types";
import type { BoardCard } from "./todoBoard";
import { CATEGORIES, taskCategory, type Category } from "./todoCategory";
import { agentInitials } from "./agentDisplay";
import { listRowInputs, type TaskData } from "./taskCardFacts";
import { ticketFacts } from "./ticketFacts";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";

/**
 * How long the agency has to reply to a query sitting where this one is.
 *
 * ⚠️ ONE DERIVATION, BECAUSE TWO SURFACES STATE IT. The to-do row counts a query's age against this
 * window and the task panel's "reply expected" is this window added to the anchor; derived twice,
 * they would eventually disagree about when a reply is due, and neither would look wrong.
 *
 * `stated: false` means the AGENCY said nothing and the house assumption filled in
 * (`STAGE_RESPONSE_WINDOWS`, 8/12/12 weeks) — a guess must never be presented as a fact.
 */
export interface ReplyWindow {
  days: number;
  stated: boolean;
}

/** The card's sentence, split so the row can set the person in italic. */
export interface TodoTitle { pre: string; who: string; post: string }

/**
 * ⚠️ THIS READS A STATED RELATIONSHIP, IT DOES NOT PARSE PROSE. `BoardCard.who` is documented as "the
 * emphasised name INSIDE the title" — the board builds both from the same record — so finding it is a
 * lookup rather than a guess. Where it does not appear (a card with no person, a title the board
 * composed differently) the row states the title plain, which is what it would have done anyway.
 */
export const splitTitle = (title: string, who: string): TodoTitle => {
  const i = who ? title.indexOf(who) : -1;
  if (i < 0) return { pre: title, who: "", post: "" };
  return { pre: title.slice(0, i), who, post: title.slice(i + who.length) };
};

/**
 * ⚠️ A ROW THE WRITER HAS JUST TICKED (feed/to-do round, 20 Sep).
 *
 * Ticking opens the task panel and the panel does the writing; when it commits, the board stops
 * raising that card and the row would simply VANISH — which is the one thing a writer who has just
 * acted must not see, because they cannot tell "recorded" from "lost". So the card holds the row
 * where it was, struck through, saying what went down and offering the way back.
 *
 * ⚠️ `undo` IS A HANDLE, NOT A FLAG, and its absence is meaningful: a completion whose window has
 * closed still shows what was logged and simply offers no way back. A boolean here would have made
 * the row render a dead link — and this repo has already paid for an Undo that restored nothing.
 */
export interface TodoDone {
  /** what the tick recorded, in the app's own words — "Nudge logged", "Full sent" */
  logged: string;
  /** reverses that write; absent once it can no longer be reversed */
  undo?: () => void;
}

/**
 * ⚠️ THE DASHBOARD'S WORDING FOR THE FIVE SETS `taskCategory` ALREADY DECIDES — a fourth surface's
 * labels, not a fourth membership. The board column calls `req` "Agent requests" because a column
 * names a KIND of thing; a dashboard group says what is HAPPENING, so the same set reads "Agents
 * are waiting". `quiet` and `house` come out identical to `CATEGORY_LABEL`, which is the tell that
 * only the two were renamed.
 *
 * ⚠️ `yours` IS NAMED EVEN THOUGH THE BRIEF LISTS FOUR GROUPS. A writer's own note filed under
 * Housekeeping would be the app calling their work its own record-keeping — so it gets the label
 * the rest of the app already gives it. A sixth category fails the lock below rather than landing
 * silently in whichever group happens to be last.
 */
export const DASH_GROUP_LABEL: Record<Category, string> = {
  req: "Agents are waiting",
  nudge: "Worth a nudge",
  quiet: "Gone quiet",
  house: "Housekeeping",
  yours: "Your tasks",
};

/** the order the card stacks them in — what needs you, then what is worth doing, then the rest */
export const DASH_GROUP_ORDER: readonly Category[] = ["req", "nudge", "quiet", "house", "yours"];

/** the band down the row's left edge, and the state pill's fill: one token per category */
export type TodoBand = "rose" | "sand" | "stone";
const BAND: Record<Category, TodoBand> = {
  /* the ball is with the writer */
  req: "rose",
  /* out with the agency, and their window has closed */
  nudge: "sand",
  /* past prompting */
  quiet: "stone",
  /* neither is about a query's court at all */
  house: "stone",
  yours: "stone",
};

/**
 * How many times this query has been nudged.
 *
 * ⚠️ DERIVED, BECAUSE NOTHING STORES IT. `logNudge` writes `nudgeDate` and `lastNudgeSentDate` and
 * no counter; the count is the number of `NUDGE_SENT` activities against the query, which is the
 * same filter the Calendar and `useTaskCommit`'s undo already use. A stored counter would be a
 * fourth thing to keep in step with three existing readers of the same rows.
 */
export const nudgeCount = (queryId: string | null, activities: readonly Activity[]): number =>
  queryId ? activities.filter((a) => a.queryId === queryId && a.activityType === ActivityType.NUDGE_SENT).length : 0;

/** "nudged twice" — the count in words, absent at zero rather than "nudged 0 times" */
export const nudgePhrase = (n: number): string | null =>
  n <= 0 ? null : n === 1 ? "nudged once" : n === 2 ? "nudged twice" : `nudged ${n} times`;

export interface TodoRow {
  /** the board card's own key — the drawer opens on it */
  key: string;
  /** the query this is about, where there is one */
  queryId: string | null;
  /** the query's current status, for the glyph; null on a row that is not about a query */
  status: QueryStatus | null;
  /** "Send your full to Jonathan Marsh", split around the person */
  title: TodoTitle;
  /** the mono line beneath — "Asked on 22 August", or what the card is instead */
  meta: string;
  /** the day figure at the right; null where nothing is being counted */
  days: number | null;
  urgent: boolean;
  /** which group the row stacks under — `taskCategory`'s, never re-tested here */
  category: Category;
  /** the left band and the pill's fill */
  band: TodoBand;
  /** the agent's initials for the avatar — the app's own display rule, agency-less records included */
  initials: string;
  /**
   * The mono fact line: the agency, the ticket's own date phrase, and the nudge count where there
   * is one — `Bloomsbury Quill · quiet since 11 Jun · nudged twice`.
   *
   * ⚠️ IT REUSES `meta` VERBATIM rather than re-phrasing the date. The ticket says "Their window
   * closed 29 Jul" where the ref draws "window closed 29 Jul"; one word, and restating it here
   * would be a second vocabulary for one date — the fault this row's own `meta` comment names.
   */
  fact: string;
  /** the manuscript, set in the typewriter face after the task — absent where the card names none */
  ms: string | null;
  /** the board's own task type — what the editor pre-fills its materials from */
  taskType: string | undefined;
  /**
   * The reply window in DAYS, the agency's where they state one.
   *
   * ⚠️ IT CARRIES THE NUMBER, NOT THE `stated` FLAG, BECAUSE THE ROW NEVER PRINTS IT. The editor
   * fills a date field from it and the strip counts forward from it; neither says "their window",
   * so nothing here can present the house assumption as something the agency told us. Any surface
   * that wants to SAY it reads `replyWindow` and gets `stated` with it.
   */
  windowDays: number;
  /**
   * ⚠️ HELD, NEVER DERIVED. `todoRows` always returns `null` here — a completion is something that
   * happened in this session, not a fact about the board, and the board has by then stopped raising
   * the card at all. The CARD holds it and stamps it on (see `OneScreenTasks`), which is why the
   * shape lives on the row rather than beside it: one thing decides what a row looks like.
   */
  done: TodoDone | null;
}

/** Which of the house windows applies to a query sitting where this one is. */
const stageOf = (status: QueryStatus | null): keyof typeof STAGE_RESPONSE_WINDOWS => {
  if (status === QueryStatus.QUERIED) return "query";
  if (status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.PARTIAL_SENT) return "partial";
  return "full";
};

/** @see ReplyWindow — the agency's own figure where it gave one, the house window where it did not. */
export const replyWindow = (
  status: QueryStatus | null,
  responseTimeWeeks: number | undefined,
): ReplyWindow => {
  const stated = typeof responseTimeWeeks === "number" && responseTimeWeeks > 0;
  const weeks = stated ? (responseTimeWeeks as number) : STAGE_RESPONSE_WINDOWS[stageOf(status)];
  return { days: weeks * 7, stated };
};

export interface TodoRowsInput {
  cards: readonly BoardCard[];
  data: TaskData;
  /** the cards the board itself calls urgent — the row does not decide this */
  isUrgent?: (c: BoardCard) => boolean;
}

export const todoRows = (i: TodoRowsInput): TodoRow[] =>
  i.cards.map((c) => {
    const inputs = listRowInputs(c, i.data);
    const facts = ticketFacts(c, { days: inputs.days, dateLabel: inputs.anchorDate });
    const q: Query | undefined = c.relatedRecordId
      ? i.data.queries.find((x) => x.id === c.relatedRecordId)
      : undefined;
    const status = (q?.status as QueryStatus) ?? null;
    const days = inputs.days;
    const category = taskCategory(c);
    /**
     * ⚠️ `c.record` IS NOT A FALLBACK HERE, AND USING IT SAID THE AGENCY TWICE. It is built as
     * `[agentPrimary(ag), ag.agency].join(" · ")` — the agent AND the agency — so joining it after
     * `inputs.agency` produced **"BRIGHT LITERARY · NOAH BRIGHT · BRIGHT LITERARY"**, on three of
     * the harness board's eight rows. It reads as a rendering fault rather than a duplication,
     * which is why it survived a screenshot: the eye takes the third run as a different fact.
     *
     * ⚠️ AND IT WAS NEVER ADDING ANYTHING. The row's own sentence names the agent ("Noah Bright has
     * made an offer") and this line already opens with the agency, so every word of `c.record` is
     * one the row has just said.
     *
     * ⚠️ NOR IS `facts.spanKey` THE REPLACEMENT — it is a LABEL, not a fact. It pairs with
     * `spanValue` ("Waiting" · "7 weeks"), which is why `heroWait` exists to phrase the two
     * together; alone it renders the word **"Age"** in the middle of the line. So where the card
     * carries no anchor date there is no date to state, and the row states the agency and stops.
     * An undated row saying less is the point — it is the same rule the ticket follows with its em
     * dash, rather than reaching for whichever string is nearest.
     */
    const meta = inputs.anchorDate ? `${facts.dateKey} ${facts.dateValue}` : "";
    /* ⚠️ THE QUERY'S AGENT, NOT THE CARD'S, WHERE THEY DIFFER — the card carries `agentId` for the
       housekeeping rules, and a query's agent is the one whose initials belong beside it. */
    const agent = i.data.agents.find((a) => a.id === (q?.agentId ?? c.agentId));
    const nudged = nudgePhrase(nudgeCount(c.relatedRecordId ?? null, i.data.activities));
    return {
      key: c.key,
      queryId: c.relatedRecordId ?? null,
      status,
      title: splitTitle(c.title, c.who ?? ""),
      /* ⚠️ THE TICKET'S OWN WORDS — "Asked on 22 August". A second vocabulary for the same fact is
         how two surfaces come to call one date two things. Where there is no date the ticket says so
         with its em dash, and the row states the card's own meta line instead. */
      meta,
      days,
      done: null,
      urgent: i.isUrgent ? i.isUrgent(c) : false,
      category,
      band: BAND[category],
      initials: agentInitials(agent),
      /* the agency is `listRowInputs`', so the row and the ticket name one agency one way */
      fact: [inputs.agency, meta, nudged].filter(Boolean).join(" · "),
      ms: c.msTitle ?? null,
      taskType: c.taskType,
      windowDays: replyWindow(status, agent?.responseTimeWeeks).days,
    };
  });

/**
 * The foot's figure — how many live cards the card is not showing.
 *
 * ⚠️ IT COUNTS THE BOARD, NOT THE VIEWPORT. The rows scroll, so "more waiting" is about the tasks
 * beyond this card's own list rather than the ones below the fold, and it is 0 when the card holds
 * everything (the foot then states the total and the link, never "0 more").
 */
export const moreWaiting = (total: number, shown: number): number => Math.max(0, total - shown);

export interface TodoGroup {
  key: Category;
  label: string;
  rows: TodoRow[];
}

/**
 * The rows, stacked under their group headings, EMPTY GROUPS DROPPED.
 *
 * ⚠️ IT PARTITIONS AN ALREADY-ORDERED LIST rather than sorting within each group — so whatever
 * order the board handed over survives inside a heading, and a second ordering pass cannot come to
 * disagree with the first. The same shape the agent list's grouping uses.
 */
export const todoGroups = (rows: readonly TodoRow[]): TodoGroup[] =>
  DASH_GROUP_ORDER
    .map((key) => ({ key, label: DASH_GROUP_LABEL[key], rows: rows.filter((r) => r.category === key) }))
    .filter((g) => g.rows.length > 0);

/** every category has a heading — asserted rather than assumed, so a sixth cannot arrive unnamed */
export const DASH_GROUPS_COVER_CATEGORIES = CATEGORIES.every((c) => DASH_GROUP_ORDER.includes(c));

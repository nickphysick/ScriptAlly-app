/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoListView — what the list is showing, as a value.
 *
 * ⚠️ ONE ARRAY, STILL. The filter narrows the cards and the sort orders them; the meter, the group
 * heads and the footer all count the RESULT. Nothing here produces a second total, which is the
 * rule the list round established and this round extends to the meter.
 *
 * ⚠️ AND IT IS PURE. The page hands in the groups it already derived; this decides what survives and
 * in what order. No lookup, no clock, no store — so the same input always gives the same list, and
 * a test can ask it questions without a page.
 */
import { BoardCard } from "./todoBoard";
import { TaskGroup } from "./todoGroups";
import { Bucket, cardBucket } from "./todoBuckets";
import { CATEGORIES, CATEGORY_LABEL, taskCategory } from "./todoCategory";
import { overdueDays, whenBucket, WHEN_LABEL, WHEN_ORDER } from "./taskDue";

/** the three urgency groups, by the id the page already uses */
export type GroupId = "urgent" | "housekeeping" | "yours";
export const GROUP_IDS: GroupId[] = ["urgent", "housekeeping", "yours"];

/** ⚠️ THE MENU'S WORDS, NOT THE BUCKET KEYS — "Nudge" not "Chase", "Fill in" not "Fix". The bucket
 *  is still `chase`/`fix` underneath; this is the reviewed language, same display/storage split the
 *  row's deeds keep. */
export const TYPE_LABEL: Record<Bucket, string> = {
  send: "Send", decide: "Decide", chase: "Nudge", close: "Close", fix: "Fill in", note: "Notes",
};
export const TYPE_ORDER: Bucket[] = ["send", "decide", "chase", "close", "fix", "note"];

/**
 * ⚠️ THE SIX ORDERS ARE THE SORT-FILTER CONTRACT'S, IN ITS OWN SEQUENCE (drawer round, Phase 6).
 * `manuscript` is RETIRED as an order — the contract's answer to "everything by manuscript" is the
 * GROUPING, where it gathers rather than interleaves; a stored `sort: "manuscript"` falls back to
 * the default through `parseView`, which is what an unrecognised value has always done.
 */
/* ⚠️ `over`, `due` AND `task` ARE THE LIST CONTRACT'S COLUMN HEADS (list round, Phase 2), with `agent`
   the fourth — each head sorts by exactly what its column prints. They lead the union because the
   Sort menu enumerates it in order, and the contract's heads are the list's own vocabulary. */
export type SortId = "over" | "due" | "task" | "agent" | "needs-you" | "longest" | "newest" | "agency" | "type";
/**
 * ⚠️ GROUPING IS THE PRIMARY SORT, AND THE PANEL SAYS SO BY PUTTING IT FIRST. `grouped` is the
 * urgency partition the page already draws; `agent` turns the list into "what do I owe each
 * person"; `manuscript` does the same per book (offered only when the account has more than one —
 * hidden, not greyed, the manuscript-column rule again); `flat` is one list with no heads.
 */
/* ⚠️ `category` IS THE FIVE THE TILES COUNT, AS LIST HEADS (QC-chassis round, Phase 2), and it is
   NOT `type` renamed. `type` partitions by the six BUCKETS — the shape of the act (send · decide ·
   chase · close · fix · note). `category` partitions by the five the page's tiles, board columns
   and card tags all speak — where the work CAME FROM. An offer is a `decide` under one and an
   Agent request under the other, deliberately, and both readings are useful. */
/* ⚠️ `time` IS THE LANDING STATE'S GROUPING (list round, Phase 3) — When, which the contract's own
   toolbar offers beside Category and None. It leads the union because the Sort menu enumerates the
   record in order, and those three are the contract's; the four this app added stay behind them. */
export type GroupingId = "time" | "category" | "flat" | "grouped" | "agent" | "type" | "manuscript";
export type DirectionId = "asc" | "desc";

export const SORT_LABEL: Record<SortId, string> = {
  over: "Overdue by",
  due: "Due date",
  task: "Task A–Z",
  agent: "Agent A–Z",
  "needs-you": "Priority",
  longest: "Longest waiting",
  newest: "Most recent activity",
  agency: "Agency A–Z",
  type: "Task type",
};
/** the panel's sub-lines — the contract's own words, empty where it draws none */
export const SORT_DESC: Record<SortId, string> = {
  over: "Longest overdue first, then what falls due soonest",
  due: "Soonest first",
  task: "",
  "needs-you": "Urgency groups, then longest waiting",
  longest: "By how long the ball has been in someone’s court",
  newest: "By the last thing that happened on the query",
  agent: "", agency: "",
  type: "Send · nudge · close · fill in · note",
};

/** the four sortable column heads, in the contract's left-to-right order */
export type HeadKey = "task" | "agent" | "due" | "over";
export const HEAD_KEYS: HeadKey[] = ["task", "agent", "due", "over"];
export const HEAD_LABEL: Record<HeadKey, string> = { task: "Task", agent: "Agent", due: "Due", over: "Overdue by" };

/**
 * A head click — the contract's `sortBy(k)`: the same head flips, a new head starts in its natural
 * order.
 *
 * ⚠️ "NATURAL" IS THE ORDER THE COLUMN MEANS, and for Overdue by that is longest first. The model's
 * `direction` already flips the RESULT rather than the comparator (see `applyView`), so a new head is
 * always `asc` — natural — and the arrow, not the direction, says which way the numbers run.
 */
export function sortByHead(v: ListView, key: HeadKey): ListView {
  return v.sort === key
    ? { ...v, direction: v.direction === "asc" ? "desc" : "asc" }
    : { ...v, sort: key, direction: "asc" };
}

/** the head's arrow — ▼ where the column's own quantity runs largest-first, ▲ otherwise and at rest */
export function headArrow(sort: SortId, direction: DirectionId, key: HeadKey): "▲" | "▼" {
  if (sort !== key) return "▲";
  const largestFirst = (key === "over") !== (direction === "desc");
  return largestFirst ? "▼" : "▲";
}
export const GROUPING_LABEL: Record<GroupingId, string> = {
  time: "When", category: "Category", flat: "None",
  grouped: "Urgency", agent: "Agent", type: "Task type", manuscript: "Manuscript",
};
export const GROUPING_DESC: Record<GroupingId, string> = {
  time: "Overdue · Due this week · Coming up · No date",
  grouped: "Needs you now · Housekeeping · Yours",
  agent: "What you owe each person",
  type: "",
  /* the five the tiles count, in the order the tiles draw them — one sentence, one vocabulary */
  category: "Agent requests · Nudges · Gone quiet · Housekeeping · Yours",
  manuscript: "One head per book", flat: "One flat list",
};
/** the trigger's label — the contract's "By agent · Longest waiting" */
export const viewButtonLabel = (v: ListView): string =>
  `${v.grouping === "grouped" ? "By urgency" : v.grouping === "flat" ? "Flat" : `By ${GROUPING_LABEL[v.grouping].toLowerCase()}`} · ${SORT_LABEL[v.sort]}`;

export interface ListView {
  /** which urgency groups are shown — absent from the set means hidden */
  groups: GroupId[];
  /** which task types are shown */
  types: Bucket[];
  includeSnoozed: boolean;
  /**
   * ⚠️ ITS OWN KEY, NOT A SECOND MEANING FOR `includeSnoozed` (pane round, Phase 7). "Put away
   * until Tuesday" and "set aside for good" are different answers, and a writer looking for one is
   * usually not looking for the other. Both default OFF: the list shows what is live.
   */
  includeDismissed: boolean;
  /**
   * ⚠️ AGENT TICKS HOLD IDS, NOT NAMES (Phase 6). Two agents can share a name and one can be
   * renamed; the id is the identity the card already carries (`agentId`). Empty means ALL — the
   * resting state — so the parse cannot produce a view that hides every agent by accident.
   */
  agents: string[];
  sort: SortId;
  grouping: GroupingId;
  direction: DirectionId;
}

/**
 * THE LANDING STATE (list round, Phase 3) — grouped by When, ordered by Overdue by, longest first;
 * everything shown, which is what the funnel calls "not filtered".
 *
 * ⚠️ IT IS A DEFAULT, NOT A SETTING. A writer's own choice is stored in `todoPrefs.listView` and
 * wins field by field through `parseView`, so this decides only what a first visit sees.
 *
 * ⚠️ AND `direction: "asc"` IS LONGEST FIRST, because that is Overdue by's natural order — the
 * direction flips the RESULT rather than the comparator (see `applyView`), and the head's arrow, not
 * the direction's name, says which way the numbers run.
 */
export const VIEW_DEFAULT: ListView = {
  groups: [...GROUP_IDS], types: [...TYPE_ORDER], includeSnoozed: false, includeDismissed: false,
  agents: [],
  sort: "over", grouping: "time", direction: "asc",
};

/**
 * ⚠️ "OFF DEFAULT" IS WHAT LIGHTS THE FUNNEL, and it is computed rather than tracked. A flag set
 * when a menu is touched goes stale the moment the writer toggles something back; comparing to the
 * default cannot. A filtered list must never be able to pass as the full one.
 */
export const isFiltered = (v: ListView): boolean =>
  v.groups.length !== GROUP_IDS.length || v.types.length !== TYPE_ORDER.length
  || v.agents.length > 0 || v.includeSnoozed || v.includeDismissed;

export const isSorted = (v: ListView): boolean =>
  v.sort !== VIEW_DEFAULT.sort || v.grouping !== VIEW_DEFAULT.grouping
  || v.direction !== VIEW_DEFAULT.direction;

/** the filter button's badge — the contract's count of ACTIVE CHOICES, not of hidden rows */
export const filterBadge = (v: ListView): number =>
  (v.types.length !== TYPE_ORDER.length ? TYPE_ORDER.length - v.types.length : 0)
  + v.agents.length + (v.includeSnoozed ? 1 : 0) + (v.includeDismissed ? 1 : 0);

/** total across the groups — the one count, taken from the array the rows render from */
export const viewTotal = (groups: TaskGroup[]): number =>
  groups.reduce((n, g) => n + g.cards.length, 0);

/**
 * ⚠️ SORTING HAPPENS WITHIN GROUPS unless the writer asked for one flat list. Ordering across a
 * boundary the page still draws would put "longest waiting" rows above a head that says they are
 * housekeeping — the sort would be true and the page would read as a lie.
 */
/**
 * ⚠️ THE FACTS TRAVEL AS AN ACCESSOR BUNDLE (Phase 6). Agency is not on the card — the list's own
 * rule, from the row port: the card carries the pair in `record` and the page resolves the agency
 * through `listRowInputs` — so ordering by it here would have meant a second derivation. The page
 * hands in the same accessors the rows already use, and the sort cannot disagree with the cell.
 */
export interface ViewFacts {
  days: (c: BoardCard) => number | null;
  agency: (c: BoardCard) => string;
  /** the Task cell's own text (`listTaskText`) — the head sorts by exactly what the cell prints */
  task: (c: BoardCard) => string;
  /** the card's due day (`dueFor`) — the Due and Overdue-by heads count real days from it */
  due: (c: BoardCard) => { ymd: string | null };
  /** today, as a local "YYYY-MM-DD" — the day real days are counted to */
  today: string;
}

export function applyView(
  groups: TaskGroup[],
  view: ListView,
  facts: ViewFacts,
): TaskGroup[] {
  const days = facts.days;
  /* ⚠️ SNOOZED LEAVES THE ARRAY UNLESS THE VIEW ADMITS IT (frame2 Phase 2). It used to survive as a
     fourth group, which is the whole reason the footer said 11 while the meter said 10 — the meter
     counts the three families and the footer counted every group, so a snoozed task was inside one
     total and outside the other. One array, one membership rule: what is not shown is not counted,
     anywhere. */
  const keptGroups = groups.filter((g) => {
    if ((GROUP_IDS as string[]).includes(g.id)) return view.groups.includes(g.id as GroupId);
    if (g.id === "snoozed") return view.includeSnoozed;
    if (g.id === "dismissed") return view.includeDismissed;
    /* ⚠️ COMPLETION LEAVES THE LIST, AND IT HAS TO LEAVE HERE (list round, Phase 3). The page used to
       drop the `done` group AFTER this function — which worked only while the grouping was the
       urgency partition and the group kept its id. Every other grouping FLATTENS these groups and
       re-heads them, so a done card walked straight into a generated head and out the far side of
       that filter: latent under "By agent" since the day regrouping shipped, and about to become the
       default's behaviour. One membership rule, stated where the others are. */
    if (g.id === "done") return false;
    return true;
  });

  const order = (cards: BoardCard[]): BoardCard[] => {
    const by = [...cards];
    const natural = (() => {
      switch (view.sort) {
        case "longest": return by.sort((a, b) => (days(b) ?? -1) - (days(a) ?? -1));
        case "newest": return by.sort((a, b) => (days(a) ?? Infinity) - (days(b) ?? Infinity));
        /* ⚠️ THE AGENTLESS SORT LAST, as the contract's head does (`t.ag || '\uffff'`) — an empty
           name alphabetised first would put "You" rows above every agent the list is about. */
        case "agent": return by.sort((a, b) => {
          const x = (a.who || "").trim(), y = (b.who || "").trim();
          if (!x !== !y) return x ? -1 : 1;
          return x.localeCompare(y);
        });
        /* ⚠️ REAL DAYS, NEVER THE ROUNDED FIGURE. The cell prints "7 weeks" for 49 days and for 52;
           this orders by 49 and 52, so two rows reading the same figure still sit in the right order.
           Natural is longest first, then today, then the soonest ahead — and the undated last, the
           contract's `-1e9`. */
        case "over": {
          const k = (c: BoardCard) => { const y = facts.due(c).ymd; return y ? overdueDays(y, facts.today) : -1e9; };
          return by.sort((a, b) => k(b) - k(a));
        }
        /* soonest first, undated last — the contract's `Infinity`; a YYYY-MM-DD orders as its text */
        case "due": {
          const k = (c: BoardCard) => facts.due(c).ymd ?? "\uffff";
          return by.sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0));
        }
        case "task": return by.sort((a, b) => facts.task(a).localeCompare(facts.task(b)));
        case "agency": return by.sort((a, b) => facts.agency(a).localeCompare(facts.agency(b)));
        /* the contract's own sequence for the kinds — TYPE_ORDER, not the alphabet */
        case "type": return by.sort((a, b) => TYPE_ORDER.indexOf(cardBucket(a)) - TYPE_ORDER.indexOf(cardBucket(b)));
        /* the page's own order — whatever `railGroups` already decided */
        case "needs-you": return by;
        default: {
          const unhandled: never = view.sort;
          return unhandled;
        }
      }
    })();
    /* ⚠️ ONE SWITCH, APPLIED LAST — each order has a natural "first → last" and the direction
       flips the RESULT, never the comparator. Flipping comparators is six chances to get one
       backwards; reversing the array is zero. */
    return view.direction === "asc" ? natural : natural.reverse();
  };

  const keep = (c: BoardCard): boolean =>
    view.types.includes(cardBucket(c))
    && (view.agents.length === 0 || (!!c.agentId && view.agents.includes(c.agentId)));

  const filtered = keptGroups.map((g) => ({
    ...g,
    cards: order(g.cards.filter(keep)),
  })).filter((g) => g.cards.length > 0);

  if (view.grouping === "grouped") return filtered;

  /* ⚠️ REGROUPING PARTITIONS THE ALREADY-FILTERED, ALREADY-ORDERED CARDS — the agent-list rule:
     grouping partitions a sorted list, so the order applies within groups for free rather than
     through a second pass that could disagree. The heads are generated (agent names A–Z, the
     kinds in TYPE_ORDER, manuscripts by title), and a card the axis cannot place gets an honest
     head ("No agent") rather than vanishing — hiding rows because a grouping changed would make
     the footer lie. */
  const all = order(filtered.flatMap((g) => g.cards));
  if (!all.length) return [];
  if (view.grouping === "flat") {
    return [{ id: "flat" as TaskGroup["id"], label: "", description: "", cards: all }];
  }
  /**
   * ⚠️ WHEN IS A FIXED FOUR, IN ITS OWN ORDER — never the generated heads below, which sort
   * alphabetically. "Coming up" before "Due this week" would read as a list that had given up on
   * chronology. An empty bucket draws no head: a "No date" heading over nothing states nothing.
   */
  if (view.grouping === "time") {
    return WHEN_ORDER
      .map((w) => ({
        id: `when-${w}` as TaskGroup["id"], label: WHEN_LABEL[w], description: "",
        cards: all.filter((c) => whenBucket(facts.due(c).ymd, facts.today) === w),
      }))
      .filter((g) => g.cards.length > 0);
  }
  const keyOf = (c: BoardCard): string =>
    view.grouping === "agent" ? ((c.who || "").trim() || "No agent")
    : view.grouping === "type" ? TYPE_LABEL[cardBucket(c)]
    /* ⚠️ ONE VOCABULARY — the head reads `CATEGORY_LABEL`, the same table the tile and the board
       column read, so a head can never call a category something the tile does not. And there is
       no placeless case: `taskCategory` is total over every card. */
    : view.grouping === "category" ? CATEGORY_LABEL[taskCategory(c)]
    : ((c.msTitle || "").trim() || "No manuscript");
  const heads = [...new Set(all.map(keyOf))];
  if (view.grouping === "type") {
    heads.sort((a, b) => TYPE_ORDER.findIndex((t) => TYPE_LABEL[t] === a) - TYPE_ORDER.findIndex((t) => TYPE_LABEL[t] === b));
  } else if (view.grouping === "category") {
    /* ⚠️ THE TILES' ORDER, NOT THE ALPHABET. The reader has just picked from a row that runs
       Agent requests → Nudges → Gone quiet → Housekeeping → Your tasks; heads in a different
       order would make the same five sets read as a different five. */
    const order5 = CATEGORIES.map((c) => CATEGORY_LABEL[c]);
    heads.sort((a, b) => order5.indexOf(a) - order5.indexOf(b));
  } else {
    heads.sort((a, b) => a.localeCompare(b));
    /* the placeless head goes LAST — "No agent" alphabetised into the Ns reads as a person */
    for (const ph of ["No agent", "No manuscript"]) {
      const i = heads.indexOf(ph);
      if (i > -1) { heads.splice(i, 1); heads.push(ph); }
    }
  }
  return heads.map((h) => ({
    id: `gen-${h}` as TaskGroup["id"], label: h, description: "",
    cards: all.filter((c) => keyOf(c) === h),
  }));
}

/**
 * ⚠️ A FACET OPTION'S COUNT IS "WHAT THIS CHOICE WOULD LEAVE, GIVEN THE OTHERS" — the contract's
 * own sentence, printed in its panel foot. Computed by re-running the view with the option's OWN
 * facet lifted, so two set filters genuinely condition each other's numbers; a count over the raw
 * board would promise rows the other filters have already hidden.
 */
export function viewLeaving(
  groups: TaskGroup[], view: ListView, facts: ViewFacts, lift: "types" | "agents",
): BoardCard[] {
  const wide: ListView = lift === "types"
    ? { ...view, types: [...TYPE_ORDER] }
    : { ...view, agents: [] };
  return applyView(groups, wide, facts).flatMap((g) => g.cards);
}

/** counts for the menu's live figures — over the UNFILTERED set, so a zero is information */
export function typeCounts(groups: TaskGroup[]): Record<Bucket, number> {
  const out = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0])) as Record<Bucket, number>;
  for (const g of groups) for (const c of g.cards) out[cardBucket(c)] += 1;
  return out;
}
export function groupCounts(groups: TaskGroup[]): Record<GroupId, number> {
  const out = { urgent: 0, housekeeping: 0, yours: 0 } as Record<GroupId, number>;
  for (const g of groups) if ((GROUP_IDS as string[]).includes(g.id)) out[g.id as GroupId] = g.cards.length;
  return out;
}

/** what survives a round trip through the user document — unknown values fall back, never throw */
export function parseView(raw: unknown): ListView {
  const r = (raw ?? {}) as Partial<ListView>;
  const groups = Array.isArray(r.groups) ? r.groups.filter((g) => GROUP_IDS.includes(g)) : VIEW_DEFAULT.groups;
  const types = Array.isArray(r.types) ? r.types.filter((t) => TYPE_ORDER.includes(t)) : VIEW_DEFAULT.types;
  return {
    groups: groups.length ? groups : VIEW_DEFAULT.groups,
    types: types.length ? types : VIEW_DEFAULT.types,
    /* ids are opaque strings; an empty array is the resting ALL, so no fallback juggling */
    agents: Array.isArray(r.agents) ? r.agents.filter((a) => typeof a === "string") : [],
    includeSnoozed: typeof r.includeSnoozed === "boolean" ? r.includeSnoozed : false,
    includeDismissed: typeof r.includeDismissed === "boolean" ? r.includeDismissed : false,
    sort: (Object.keys(SORT_LABEL) as SortId[]).includes(r.sort as SortId) ? (r.sort as SortId) : VIEW_DEFAULT.sort,
    grouping: (Object.keys(GROUPING_LABEL) as GroupingId[]).includes(r.grouping as GroupingId)
      ? (r.grouping as GroupingId) : VIEW_DEFAULT.grouping,
    direction: r.direction === "desc" ? "desc" : "asc",
  };
}

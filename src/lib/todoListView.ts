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
export type SortId = "needs-you" | "longest" | "newest" | "agent" | "agency" | "type";
/**
 * ⚠️ GROUPING IS THE PRIMARY SORT, AND THE PANEL SAYS SO BY PUTTING IT FIRST. `grouped` is the
 * urgency partition the page already draws; `agent` turns the list into "what do I owe each
 * person"; `manuscript` does the same per book (offered only when the account has more than one —
 * hidden, not greyed, the manuscript-column rule again); `flat` is one list with no heads.
 */
export type GroupingId = "grouped" | "agent" | "type" | "manuscript" | "flat";
export type DirectionId = "asc" | "desc";

export const SORT_LABEL: Record<SortId, string> = {
  "needs-you": "Priority",
  longest: "Longest waiting",
  newest: "Most recent activity",
  agent: "Agent A–Z",
  agency: "Agency A–Z",
  type: "Task type",
};
/** the panel's sub-lines — the contract's own words, empty where it draws none */
export const SORT_DESC: Record<SortId, string> = {
  "needs-you": "Urgency groups, then longest waiting",
  longest: "By how long the ball has been in someone’s court",
  newest: "By the last thing that happened on the query",
  agent: "", agency: "",
  type: "Send · nudge · close · fill in · note",
};
export const GROUPING_LABEL: Record<GroupingId, string> = {
  grouped: "Urgency", agent: "Agent", type: "Task type", manuscript: "Manuscript", flat: "None",
};
export const GROUPING_DESC: Record<GroupingId, string> = {
  grouped: "Needs you now · Housekeeping · Yours",
  agent: "What you owe each person",
  type: "", manuscript: "One head per book", flat: "One flat list",
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

/** everything on, needs-you-first, grouped — the state the funnel calls "not filtered" */
export const VIEW_DEFAULT: ListView = {
  groups: [...GROUP_IDS], types: [...TYPE_ORDER], includeSnoozed: false, includeDismissed: false,
  agents: [],
  sort: "needs-you", grouping: "grouped", direction: "asc",
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
    return true;
  });

  const order = (cards: BoardCard[]): BoardCard[] => {
    const by = [...cards];
    const natural = (() => {
      switch (view.sort) {
        case "longest": return by.sort((a, b) => (days(b) ?? -1) - (days(a) ?? -1));
        case "newest": return by.sort((a, b) => (days(a) ?? Infinity) - (days(b) ?? Infinity));
        case "agent": return by.sort((a, b) => (a.who || "").localeCompare(b.who || ""));
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
  const keyOf = (c: BoardCard): string =>
    view.grouping === "agent" ? ((c.who || "").trim() || "No agent")
    : view.grouping === "type" ? TYPE_LABEL[cardBucket(c)]
    : ((c.msTitle || "").trim() || "No manuscript");
  const heads = [...new Set(all.map(keyOf))];
  if (view.grouping === "type") {
    heads.sort((a, b) => TYPE_ORDER.findIndex((t) => TYPE_LABEL[t] === a) - TYPE_ORDER.findIndex((t) => TYPE_LABEL[t] === b));
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

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

export type SortId = "needs-you" | "longest" | "newest" | "agent" | "manuscript";
export type GroupingId = "grouped" | "flat";

export const SORT_LABEL: Record<SortId, string> = {
  "needs-you": "Needs you first",
  longest: "Longest waiting first",
  newest: "Newest first",
  agent: "By agent, A to Z",
  manuscript: "By manuscript",
};
export const GROUPING_LABEL: Record<GroupingId, string> = {
  grouped: "Grouped by urgency", flat: "One flat list",
};

export interface ListView {
  /** which urgency groups are shown — absent from the set means hidden */
  groups: GroupId[];
  /** which task types are shown */
  types: Bucket[];
  includeSnoozed: boolean;
  sort: SortId;
  grouping: GroupingId;
}

/** everything on, needs-you-first, grouped — the state the funnel calls "not filtered" */
export const VIEW_DEFAULT: ListView = {
  groups: [...GROUP_IDS], types: [...TYPE_ORDER], includeSnoozed: false,
  sort: "needs-you", grouping: "grouped",
};

/**
 * ⚠️ "OFF DEFAULT" IS WHAT LIGHTS THE FUNNEL, and it is computed rather than tracked. A flag set
 * when a menu is touched goes stale the moment the writer toggles something back; comparing to the
 * default cannot. A filtered list must never be able to pass as the full one.
 */
export const isFiltered = (v: ListView): boolean =>
  v.groups.length !== GROUP_IDS.length || v.types.length !== TYPE_ORDER.length || v.includeSnoozed;

export const isSorted = (v: ListView): boolean =>
  v.sort !== VIEW_DEFAULT.sort || v.grouping !== VIEW_DEFAULT.grouping;

/** total across the groups — the one count, taken from the array the rows render from */
export const viewTotal = (groups: TaskGroup[]): number =>
  groups.reduce((n, g) => n + g.cards.length, 0);

/**
 * ⚠️ SORTING HAPPENS WITHIN GROUPS unless the writer asked for one flat list. Ordering across a
 * boundary the page still draws would put "longest waiting" rows above a head that says they are
 * housekeeping — the sort would be true and the page would read as a lie.
 */
export function applyView(
  groups: TaskGroup[],
  view: ListView,
  days: (c: BoardCard) => number | null,
): TaskGroup[] {
  const keptGroups = groups.filter((g) => (GROUP_IDS as string[]).includes(g.id)
    ? view.groups.includes(g.id as GroupId) : true);

  const order = (cards: BoardCard[]): BoardCard[] => {
    const by = [...cards];
    switch (view.sort) {
      case "longest": return by.sort((a, b) => (days(b) ?? -1) - (days(a) ?? -1));
      case "newest": return by.sort((a, b) => (days(a) ?? Infinity) - (days(b) ?? Infinity));
      case "agent": return by.sort((a, b) => (a.who || "").localeCompare(b.who || ""));
      case "manuscript": return by.sort((a, b) => (a.msTitle || "").localeCompare(b.msTitle || ""));
      /* the page's own order — whatever `railGroups` already decided */
      case "needs-you": return by;
      default: {
        const unhandled: never = view.sort;
        return unhandled;
      }
    }
  };

  const filtered = keptGroups.map((g) => ({
    ...g,
    cards: order(g.cards.filter((c) => view.types.includes(cardBucket(c)))),
  })).filter((g) => g.cards.length > 0);

  if (view.grouping === "grouped") return filtered;

  /* ⚠️ ONE FLAT LIST IS ONE GROUP WITH NO HEAD, not a second renderer. The list draws a head per
     group; a group whose id the head map does not know renders no head, so flat falls out of the
     same code path rather than needing a branch in the component. */
  const all = order(filtered.flatMap((g) => g.cards));
  return all.length ? [{ id: "flat" as TaskGroup["id"], label: "", description: "", cards: all }] : [];
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
    includeSnoozed: typeof r.includeSnoozed === "boolean" ? r.includeSnoozed : false,
    sort: (Object.keys(SORT_LABEL) as SortId[]).includes(r.sort as SortId) ? (r.sort as SortId) : VIEW_DEFAULT.sort,
    grouping: (Object.keys(GROUPING_LABEL) as GroupingId[]).includes(r.grouping as GroupingId)
      ? (r.grouping as GroupingId) : VIEW_DEFAULT.grouping,
  };
}

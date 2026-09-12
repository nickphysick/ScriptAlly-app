/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE VIEW'S PURE LAWS — drawer round, Phase 6. The module predates this round; the SUITE does
 * not, which the recon called "pure and unit-locked" and was half right about — the purity was
 * real, the locks were not. Every law here was proved red against a deliberate break before it
 * was believed.
 *
 * ⚠️ FIXTURES ARE BUILT FROM THE CARD SHAPE THE BOARD PRODUCES, with only the fields the view
 * reads — `who`, `agentId`, `msTitle`, `taskType`, `userTaskId` (for the bucket) — because a test
 * handing a function an input its callers cannot produce is testing a function nobody runs.
 */
import { describe, it, expect } from "vitest";
import {
  applyView, filterBadge, isFiltered, isSorted, parseView, VIEW_DEFAULT, viewButtonLabel,
  viewLeaving, ViewFacts, ListView, TYPE_ORDER, sortByHead, headArrow, HEAD_KEYS,
  GROUPING_LABEL, GroupingId,
} from "./todoListView";
import { BoardCard } from "./todoBoard";
import { TaskGroup } from "./todoGroups";

const card = (key: string, over: Partial<BoardCard> = {}): BoardCard => ({
  key, stream: "do", title: key, who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "", record: "", committed: false, done: false, ...over,
});
const grp = (id: string, label: string, cards: BoardCard[]): TaskGroup =>
  ({ id: id as TaskGroup["id"], label, description: "", cards });

/** stable facts: days, agency, due day and task text from tables — the page's accessors in miniature */
const facts = (
  days: Record<string, number> = {}, agency: Record<string, string> = {},
  due: Record<string, string | null> = {}, task: Record<string, string> = {}, today = "2026-09-11",
): ViewFacts => ({
  days: (c) => days[c.key] ?? null,
  agency: (c) => agency[c.key] ?? "",
  task: (c) => task[c.key] ?? c.title,
  due: (c) => ({ ymd: due[c.key] ?? null }),
  today,
});

const G = () => [
  grp("urgent", "Needs you now", [
    card("u1", { who: "Marsh", agentId: "a1", taskType: "full_requested" }),
    card("u2", { who: "Duarte", agentId: "a2", taskType: "full_requested" }),
  ]),
  grp("housekeeping", "Housekeeping", [
    card("h1", { who: "Marsh", agentId: "a1", taskType: "no_response_close" }),
    card("h2", { who: "Reed", agentId: "a3", taskType: "no_response_close" }),
  ]),
];

describe("grouping partitions; ordering runs within", () => {
  it("an order never moves a card across a group boundary", () => {
    /* ⚠️ THE GROUPING IS PINNED (list round, Phase 3): this case is about ORDER inside the urgency
       partition, and the default grouping is When now. A case that reads the default silently
       changes subject the day the default moves. */
    const out = applyView(G(), { ...VIEW_DEFAULT, grouping: "grouped", sort: "agent" }, facts());
    expect(out.map((g) => g.id)).toEqual(["urgent", "housekeeping"]);
    /* membership identical; only the internal order may differ */
    expect(out[0].cards.map((c) => c.key).sort()).toEqual(["u1", "u2"]);
    expect(out[1].cards.map((c) => c.key).sort()).toEqual(["h1", "h2"]);
    /* and it DID reorder within: Duarte before Marsh in the urgent group */
    expect(out[0].cards.map((c) => c.key)).toEqual(["u2", "u1"]);
  });

  it("direction reverses the result per group — asc and desc are exact mirrors", () => {
    const asc = applyView(G(), { ...VIEW_DEFAULT, grouping: "grouped", sort: "agent", direction: "asc" }, facts());
    const desc = applyView(G(), { ...VIEW_DEFAULT, grouping: "grouped", sort: "agent", direction: "desc" }, facts());
    expect(desc[0].cards.map((c) => c.key)).toEqual([...asc[0].cards.map((c) => c.key)].reverse());
  });

  it("group by agent generates A–Z heads with the placeless head LAST, never alphabetised", () => {
    const gs = [grp("urgent", "Needs you now", [
      card("z", { who: "Zhou", agentId: "az" }),
      card("n", { who: "" }),                        // no agent — must not file under N
      card("a", { who: "Abbott", agentId: "aa" }),
    ])];
    const out = applyView(gs, { ...VIEW_DEFAULT, grouping: "agent" }, facts());
    expect(out.map((g) => g.label)).toEqual(["Abbott", "Zhou", "No agent"]);
  });

  it("group by type follows TYPE_ORDER, not the alphabet", () => {
    const gs = [grp("urgent", "Needs you now", [
      card("c", { taskType: "no_response_close" }),  // close — the bucket's own type
      card("s", { taskType: "full_requested" }),     // send
    ])];
    const out = applyView(gs, { ...VIEW_DEFAULT, grouping: "type" }, facts());
    expect(out.map((g) => g.label)).toEqual(["Send", "Close"]);
  });
});

describe("the agent facet and the conditional counts", () => {
  it("an agent tick narrows to that agent's cards; an agentless card never survives a tick", () => {
    const out = applyView(G(), { ...VIEW_DEFAULT, agents: ["a1"] }, facts());
    expect(out.flatMap((g) => g.cards.map((c) => c.key)).sort()).toEqual(["h1", "u1"]);
  });

  it("a facet's count lifts ONLY its own facet — the two-filters proof", () => {
    /* agents narrowed to a1 AND types narrowed to send: the TYPE options' counts must be given
       the agent filter (a1's cards only), and the AGENT options' counts given the type filter */
    const v: ListView = { ...VIEW_DEFAULT, agents: ["a1"], types: ["send"] };
    const forTypes = viewLeaving(G(), v, facts(), "types").map((c) => c.key).sort();
    expect(forTypes, "the type counts must still respect the agent filter").toEqual(["h1", "u1"]);
    const forAgents = viewLeaving(G(), v, facts(), "agents").map((c) => c.key).sort();
    expect(forAgents, "the agent counts must still respect the type filter").toEqual(["u1", "u2"]);
  });
});

describe("the flags, the badge, the label, the parse", () => {
  it("isFiltered and isSorted know the new terms", () => {
    expect(isFiltered({ ...VIEW_DEFAULT, agents: ["a1"] })).toBe(true);
    expect(isSorted({ ...VIEW_DEFAULT, direction: "desc" })).toBe(true);
    expect(isSorted({ ...VIEW_DEFAULT, grouping: "agent" })).toBe(true);
    expect(isFiltered(VIEW_DEFAULT)).toBe(false);
    expect(isSorted(VIEW_DEFAULT)).toBe(false);
  });

  it("the badge counts CHOICES — hidden types, ticked agents, admitted states", () => {
    expect(filterBadge(VIEW_DEFAULT)).toBe(0);
    expect(filterBadge({ ...VIEW_DEFAULT, types: ["send"], agents: ["a1", "a2"], includeSnoozed: true }))
      .toBe((TYPE_ORDER.length - 1) + 2 + 1);
  });

  it("the trigger's label is the contract's two-part sentence", () => {
    expect(viewButtonLabel(VIEW_DEFAULT)).toBe("By when · Overdue by");
    expect(viewButtonLabel({ ...VIEW_DEFAULT, grouping: "grouped", sort: "needs-you" })).toBe("By urgency · Priority");
    expect(viewButtonLabel({ ...VIEW_DEFAULT, grouping: "agent", sort: "longest" }))
      .toBe("By agent · Longest waiting");
    expect(viewButtonLabel({ ...VIEW_DEFAULT, grouping: "flat" })).toBe("Flat · Overdue by");
  });

  it("parseView round-trips the new fields and retires the old sort by falling back", () => {
    const v: ListView = { ...VIEW_DEFAULT, agents: ["a1"], direction: "desc", grouping: "manuscript", sort: "agency" };
    expect(parseView(JSON.parse(JSON.stringify(v)))).toEqual(v);
    /* the retired order — a stored "manuscript" SORT — falls back to the default, the treatment
       every unrecognised value has always had; the GROUPING member of the same name survives */
    expect(parseView({ sort: "manuscript" }).sort).toBe(VIEW_DEFAULT.sort);
    expect(parseView({ agents: "a1" }).agents).toEqual([]);
    expect(parseView({ direction: "sideways" }).direction).toBe("asc");
  });
});

describe("the column heads sort by what the columns print (list round, Phase 2)", () => {
  const TODAY = "2026-09-11";
  /* ⚠️ THE FIGURES COLLIDE ON PURPOSE: 49 and 52 days both print "7 weeks", so an order read off the
     rounded figure could not tell them apart — a sort by real days must */
  const dues: Record<string, string | null> = {
    a: "2026-07-24", b: "2026-07-21", c: "2026-09-11", d: "2026-09-15", e: "2026-09-12", f: null,
  };
  const one = () => [grp("urgent", "Needs you now",
    ["f", "a", "d", "c", "b", "e"].map((k) => card(k, { who: k.toUpperCase(), agentId: k })))];
  /* the grouping is pinned for the same reason as above — these are claims about ORDER */
  const keys = (v: ListView, t: Record<string, string> = {}) =>
    applyView(one(), { ...v, grouping: "grouped" }, facts({}, {}, dues, t, TODAY))[0].cards.map((c) => c.key);

  it("Overdue by: real days, longest first — then due today, the soonest ahead, the undated last", () => {
    expect(keys({ ...VIEW_DEFAULT, sort: "over" })).toEqual(["b", "a", "c", "e", "d", "f"]);
  });

  it("Due: soonest first, undated last — and the direction mirrors it exactly", () => {
    expect(keys({ ...VIEW_DEFAULT, sort: "due" })).toEqual(["b", "a", "c", "e", "d", "f"]);
    expect(keys({ ...VIEW_DEFAULT, sort: "due", direction: "desc" })).toEqual(["f", "d", "e", "c", "a", "b"]);
  });

  it("Task: the text the cell prints, not the card's own title", () => {
    const text = { a: "Worth a nudge", b: "Send your partial", c: "Consider closing",
      d: "Fill in what you sent", e: "Reply to the offer", f: "Send your full manuscript" };
    expect(keys({ ...VIEW_DEFAULT, sort: "task" }, text)).toEqual(["c", "d", "e", "f", "b", "a"]);
  });

  it("Agent A–Z puts the agentless LAST, as the contract's head does", () => {
    const gs = [grp("yours", "Your tasks", [card("n", { who: "" }), card("z", { who: "Zhou" }), card("a", { who: "Abbott" })])];
    expect(applyView(gs, { ...VIEW_DEFAULT, sort: "agent" }, facts())[0].cards.map((c) => c.key))
      .toEqual(["a", "z", "n"]);
  });

  it("a head click: a new head starts in its natural order, the same head flips", () => {
    /* ⚠️ FROM A VIEW THAT IS NOT ALREADY SORTED BY THE HEAD BEING CLICKED — the landing state sorts
       by Overdue by, so starting there would test the FLIP and call it the first click. */
    const v1 = sortByHead({ ...VIEW_DEFAULT, sort: "needs-you" }, "over");
    expect([v1.sort, v1.direction]).toEqual(["over", "asc"]);
    const v2 = sortByHead(v1, "over");
    expect([v2.sort, v2.direction]).toEqual(["over", "desc"]);
    const v3 = sortByHead(v2, "due");
    expect([v3.sort, v3.direction]).toEqual(["due", "asc"]);
    expect(HEAD_KEYS).toEqual(["task", "agent", "due", "over"]);
  });

  it("the arrow says which way the column's own numbers run — ▼ for longest overdue first", () => {
    expect(headArrow("over", "asc", "over")).toBe("▼");
    expect(headArrow("over", "desc", "over")).toBe("▲");
    expect(headArrow("due", "asc", "due")).toBe("▲");
    expect(headArrow("due", "desc", "due")).toBe("▼");
    expect(headArrow("over", "asc", "task"), "an idle head rests on ▲").toBe("▲");
  });

  it("the new orders survive the round trip through the user document", () => {
    for (const sort of ["over", "due", "task"] as const) expect(parseView({ sort }).sort).toBe(sort);
  });
});

describe("the landing state — grouped by When (list round, Phase 3)", () => {
  const TODAY = "2026-09-11";
  const dues: Record<string, string | null> = {
    old: "2024-05-21", yest: "2026-09-10", now: "2026-09-11", wk: "2026-09-18", far: "2026-09-19", non: null,
  };
  const gs = () => [grp("urgent", "Needs you now",
    ["non", "far", "now", "old", "wk", "yest"].map((k) => card(k, { who: k, agentId: k })))];
  const F = () => facts({}, {}, dues, {}, TODAY);

  it("the default IS the landing state — When, Overdue by, longest first", () => {
    expect([VIEW_DEFAULT.grouping, VIEW_DEFAULT.sort, VIEW_DEFAULT.direction]).toEqual(["time", "over", "asc"]);
    expect(viewButtonLabel(VIEW_DEFAULT)).toBe("By when · Overdue by");
    /* and it is not "filtered" or "sorted" — the funnel and the order marker rest at the landing */
    expect(isFiltered(VIEW_DEFAULT)).toBe(false);
    expect(isSorted(VIEW_DEFAULT)).toBe(false);
  });

  it("four heads in the contract's order, and an empty bucket draws none", () => {
    const out = applyView(gs(), VIEW_DEFAULT, F());
    expect(out.map((g) => g.label)).toEqual(["Overdue", "Due this week", "Coming up", "No date"]);
    expect(out.map((g) => g.id)).toEqual(["when-over", "when-week", "when-later", "when-none"]);
    const fewer = applyView([grp("urgent", "Needs you now", [card("old"), card("non")])],
      VIEW_DEFAULT, facts({}, {}, { old: "2024-05-21", non: null }, {}, TODAY));
    expect(fewer.map((g) => g.label), "an empty bucket states nothing").toEqual(["Overdue", "No date"]);
  });

  it("Overdue holds only past days; Coming up only days past the week; and the order runs longest first", () => {
    const out = applyView(gs(), VIEW_DEFAULT, F());
    const by = Object.fromEntries(out.map((g) => [g.id, g.cards.map((c) => c.key)]));
    expect(by["when-over"]).toEqual(["old", "yest"]);
    expect(by["when-week"]).toEqual(["now", "wk"]);
    expect(by["when-later"]).toEqual(["far"]);
    expect(by["when-none"]).toEqual(["non"]);
  });

  /**
   * ⚠️ COMPLETION LEAVES THE LIST UNDER EVERY GROUPING, and this is the case that would have caught
   * the fault: the page's own `done` filter ran AFTER the view, so a regrouping — which flattens the
   * groups and re-heads them — carried the card straight past it.
   */
  it("a done card never survives the view, whichever grouping is asked for", () => {
    const withDone = [
      grp("urgent", "Needs you now", [card("live", { who: "Marsh", agentId: "a1" })]),
      grp("done", "Done", [card("gone", { who: "Marsh", agentId: "a1", done: true })]),
    ];
    for (const g of Object.keys(GROUPING_LABEL) as GroupingId[]) {
      const keys = applyView(withDone, { ...VIEW_DEFAULT, grouping: g }, F()).flatMap((x) => x.cards.map((c) => c.key));
      expect(keys, `grouping ${g} admitted a finished card`).not.toContain("gone");
      expect(keys, `grouping ${g} lost the live card`).toContain("live");
    }
  });
});

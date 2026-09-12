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
    const out = applyView(G(), { ...VIEW_DEFAULT, sort: "agent" }, facts());
    expect(out.map((g) => g.id)).toEqual(["urgent", "housekeeping"]);
    /* membership identical; only the internal order may differ */
    expect(out[0].cards.map((c) => c.key).sort()).toEqual(["u1", "u2"]);
    expect(out[1].cards.map((c) => c.key).sort()).toEqual(["h1", "h2"]);
    /* and it DID reorder within: Duarte before Marsh in the urgent group */
    expect(out[0].cards.map((c) => c.key)).toEqual(["u2", "u1"]);
  });

  it("direction reverses the result per group — asc and desc are exact mirrors", () => {
    const asc = applyView(G(), { ...VIEW_DEFAULT, sort: "agent", direction: "asc" }, facts());
    const desc = applyView(G(), { ...VIEW_DEFAULT, sort: "agent", direction: "desc" }, facts());
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
    expect(viewButtonLabel(VIEW_DEFAULT)).toBe("By urgency · Priority");
    expect(viewButtonLabel({ ...VIEW_DEFAULT, grouping: "agent", sort: "longest" }))
      .toBe("By agent · Longest waiting");
    expect(viewButtonLabel({ ...VIEW_DEFAULT, grouping: "flat" })).toBe("Flat · Priority");
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
  const keys = (v: ListView, t: Record<string, string> = {}) =>
    applyView(one(), v, facts({}, {}, dues, t, TODAY))[0].cards.map((c) => c.key);

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
    const v1 = sortByHead(VIEW_DEFAULT, "over");
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

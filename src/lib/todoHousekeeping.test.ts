/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import {
  HK_RULES,
  HK_RULE_ORDER,
  ruleForNeed,
  isRuleMuted,
  visibleAgentNeeds,
  taskSurvivesMute,
  groupHousekeeping,
  hkGapCount,
  hkGroupProgress,
  mutedMembersForRule,
} from "./todoHousekeeping";
import { MUTED_UNTIL } from "./taskFlags";
import { Agent, Query, TaskFlag } from "../types";
import { BoardCard } from "./todoBoard";

const agent = (over: Partial<Agent>): Agent =>
  ({ id: "a1", userId: "u1", name: "Jo Agent", agency: "Lit Co", ...over } as Agent);

// A minimally-populated hk board card (only the fields grouping reads).
const hkCard = (over: Partial<BoardCard>): BoardCard =>
  ({
    key: "task-dq-a1",
    stream: "hk",
    title: "",
    who: "Jo Agent",
    subtitle: "",
    due: "",
    warn: false,
    snoozes: 0,
    hk: true,
    initials: "JA",
    record: "",
    committed: false,
    done: false,
    taskType: "data_quality_poor",
    relatedRecordId: "a1",
    ...over,
  } as BoardCard);

describe("HK_RULES catalogue", () => {
  it("covers exactly the four rules, ordered", () => {
    expect(HK_RULE_ORDER).toEqual(["no_response_close", "dq_responseTime", "dq_materials", "dq_mswl"]);
    expect(Object.keys(HK_RULES).sort()).toEqual(HK_RULE_ORDER.slice().sort());
  });
  it("only the three data-quality rules are assistable + have a field", () => {
    expect(HK_RULES.dq_responseTime.assistable).toBe(true);
    expect(HK_RULES.dq_materials.assistable).toBe(true);
    expect(HK_RULES.dq_mswl.assistable).toBe(true);
    expect(HK_RULES.no_response_close.assistable).toBe(false);
    expect(HK_RULES.no_response_close.field).toBeUndefined();
    expect(HK_RULES.dq_responseTime.field).toBe("responseTimeWeeks");
    expect(HK_RULES.dq_materials.field).toBe("materialsWanted");
    expect(HK_RULES.dq_mswl.field).toBe("mswlNotes");
  });
  it("titles pluralise", () => {
    expect(HK_RULES.dq_responseTime.title(1)).toBe("1 agent has no reply window");
    expect(HK_RULES.dq_responseTime.title(3)).toBe("3 agents have no reply window");
    expect(HK_RULES.no_response_close.title(1)).toBe("1 query has gone quiet");
    expect(HK_RULES.no_response_close.title(2)).toBe("2 queries have gone quiet");
  });
  it("ruleForNeed maps each need", () => {
    expect(ruleForNeed("responseTime")).toBe("dq_responseTime");
    expect(ruleForNeed("materials")).toBe("dq_materials");
    expect(ruleForNeed("mswl")).toBe("dq_mswl");
  });
});

describe("isRuleMuted", () => {
  it("is false with no mute list", () => {
    expect(isRuleMuted("dq_mswl", undefined)).toBe(false);
    expect(isRuleMuted("dq_mswl", null)).toBe(false);
    expect(isRuleMuted("dq_mswl", [])).toBe(false);
  });
  it("is true when present", () => {
    expect(isRuleMuted("dq_mswl", ["dq_mswl"])).toBe(true);
    expect(isRuleMuted("dq_mswl", ["dq_materials"])).toBe(false);
  });
});

describe("visibleAgentNeeds", () => {
  // an agent lacking all three: responseTimeWeeks 0 (stub), no materials, no mswl
  const empty = agent({ responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" });
  it("returns all needs when nothing muted", () => {
    expect(visibleAgentNeeds(empty)).toEqual(["responseTime", "materials", "mswl"]);
  });
  it("drops a muted rule's need", () => {
    expect(visibleAgentNeeds(empty, ["dq_mswl"])).toEqual(["responseTime", "materials"]);
    expect(visibleAgentNeeds(empty, ["dq_responseTime", "dq_materials"])).toEqual(["mswl"]);
  });
  it("is empty when every rule is muted", () => {
    expect(visibleAgentNeeds(empty, ["dq_responseTime", "dq_materials", "dq_mswl"])).toEqual([]);
  });
});

describe("taskSurvivesMute", () => {
  const empty = agent({ responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" });
  it("passes unrelated task types through", () => {
    expect(taskSurvivesMute("offer_received", undefined, ["dq_mswl"])).toBe(true);
    expect(taskSurvivesMute("nudge_overdue", empty, ["dq_mswl", "no_response_close"])).toBe(true);
  });
  it("no_response_close dies only when its rule is muted", () => {
    expect(taskSurvivesMute("no_response_close", undefined, [])).toBe(true);
    expect(taskSurvivesMute("no_response_close", undefined, ["no_response_close"])).toBe(false);
  });
  it("data_quality survives while ANY gap is un-muted", () => {
    expect(taskSurvivesMute("data_quality_poor", empty, ["dq_mswl"])).toBe(true); // still has responseTime+materials
    expect(taskSurvivesMute("data_quality_poor", empty, ["dq_responseTime", "dq_materials"])).toBe(true); // still mswl
  });
  it("data_quality dies when all its gaps are muted", () => {
    expect(taskSurvivesMute("data_quality_poor", empty, ["dq_responseTime", "dq_materials", "dq_mswl"])).toBe(false);
  });
  it("data_quality with only one gap dies when that one is muted", () => {
    const oneGap = agent({ responseTimeWeeks: 4, materialsWanted: ["Query Letter"], mswlNotes: "" }); // only mswl missing
    expect(taskSurvivesMute("data_quality_poor", oneGap, ["dq_mswl"])).toBe(false);
    expect(taskSurvivesMute("data_quality_poor", oneGap, [])).toBe(true);
  });
});

describe("groupHousekeeping — dq rules only; stale stays individual", () => {
  const agents = [
    agent({ id: "a1", name: "Ann", agency: "Ann Lit", responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" }), // all three
    agent({ id: "a2", name: "Bo", agency: "Bo Co", responseTimeWeeks: 0, materialsWanted: ["Query Letter"], mswlNotes: "has one" }), // only reply window
  ];
  const cards = [
    hkCard({ key: "task-dq-a1", relatedRecordId: "a1", who: "Ann" }),
    hkCard({ key: "task-dq-a2", relatedRecordId: "a2", who: "Bo" }),
    hkCard({ key: "task-nrc-q9", taskType: "no_response_close", relatedRecordId: "q9", who: "Cy", hk: false }),
  ];

  it("groups by rule, one member per (agent, gap)", () => {
    const groups = groupHousekeeping(cards, agents);
    const byRule = Object.fromEntries(groups.map((g) => [g.rule, g.members.map((m) => m.agentName)]));
    // Ann is in all three dq groups; Bo only in reply windows.
    expect(byRule.dq_responseTime).toEqual(["Ann", "Bo"]);
    expect(byRule.dq_materials).toEqual(["Ann"]);
    expect(byRule.dq_mswl).toEqual(["Ann"]);
  });
  it("NEVER groups stale queries — closing is a one-off decision, not a batch", () => {
    const groups = groupHousekeeping(cards, agents);
    expect(groups.some((g) => g.rule === "no_response_close")).toBe(false);
    expect(groups.map((g) => g.rule)).toEqual(["dq_responseTime", "dq_materials", "dq_mswl"]);
  });
  it("QUERIED agents sort first within a group (stable)", () => {
    // Bo has a query; Ann doesn't — Bo leads the reply-window group despite Ann's card coming first.
    const queries = [{ id: "q1", agentId: "a2" } as Query];
    const groups = groupHousekeeping(cards, agents, undefined, queries);
    const rt = groups.find((g) => g.rule === "dq_responseTime")!;
    expect(rt.members.map((m) => m.agentName)).toEqual(["Bo", "Ann"]);
    expect(rt.members[0].queried).toBe(true);
    expect(rt.members[1].queried).toBe(false);
  });
  it("carries the agency for the batch row + the agentId write target", () => {
    const groups = groupHousekeeping(cards, agents);
    const rt = groups.find((g) => g.rule === "dq_responseTime")!;
    expect(rt.members[0].agentId).toBe("a1");
    expect(rt.members[0].agency).toBe("Ann Lit");
  });
  it("a muted rule produces no group", () => {
    const groups = groupHousekeeping(cards, agents, ["dq_mswl"]);
    expect(groups.map((g) => g.rule)).toEqual(["dq_responseTime", "dq_materials"]);
  });
  it("skips a card whose agent is missing", () => {
    const orphan = [hkCard({ key: "task-dq-gone", relatedRecordId: "ghost" })];
    expect(groupHousekeeping(orphan, agents)).toEqual([]);
  });
});

describe("hkGapCount — the ribbon/lane number is gaps, not piles (stale added separately by the page)", () => {
  const agents2 = [
    agent({ id: "a1", name: "Ann", responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" }), // 3 gaps
    agent({ id: "a2", name: "Bo", responseTimeWeeks: 0, materialsWanted: ["Query Letter"], mswlNotes: "has one" }), // 1 gap
  ];
  const cards = [
    hkCard({ key: "task-dq-a1", relatedRecordId: "a1", who: "Ann" }),
    hkCard({ key: "task-dq-a2", relatedRecordId: "a2", who: "Bo" }),
    hkCard({ key: "task-nrc-q9", taskType: "no_response_close", relatedRecordId: "q9", who: "Cy", hk: false }), // individual, NOT in groups
  ];

  it("sums dq members across groups (Ann 3 + Bo 1 = 4 gaps over 3 piles; stale excluded)", () => {
    const groups = groupHousekeeping(cards, agents2);
    expect(groups.length).toBe(3); // piles
    expect(hkGapCount(groups)).toBe(4); // gaps
  });

  it("muted rules reduce the gap count (already excluded by grouping)", () => {
    expect(hkGapCount(groupHousekeeping(cards, agents2, ["dq_mswl"]))).toBe(3);
    expect(hkGapCount(groupHousekeeping(cards, agents2, ["dq_responseTime"]))).toBe(2);
    expect(hkGapCount([])).toBe(0);
  });
});

describe("mutedMembersForRule — item-muted agents listed for the 'n muted — show' link", () => {
  const NOW = Date.parse("2026-07-16T12:00:00Z");
  const agents3 = [
    agent({ id: "a1", name: "Ann", responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" }),
    agent({ id: "a2", name: "Bo", responseTimeWeeks: 0, materialsWanted: ["Query Letter"], mswlNotes: "has one" }),
  ];
  const mutedFlag: TaskFlag = { id: "f1", userId: "u", taskType: "data_quality_poor", agentId: "a1", snoozeCount: 1, snoozedUntil: MUTED_UNTIL };

  it("lists an item-muted agent that still has the gap", () => {
    const out = mutedMembersForRule("dq_responseTime", agents3, [mutedFlag], NOW);
    expect(out).toEqual([{ agentId: "a1", agentName: "Ann" }]);
  });
  it("an un-muted agent is not listed (it's live on the board instead)", () => {
    expect(mutedMembersForRule("dq_responseTime", agents3, [], NOW)).toEqual([]);
  });
  it("an expired snooze no longer counts as muted", () => {
    const expired: TaskFlag = { ...mutedFlag, snoozedUntil: "2026-07-01T00:00:00.000Z" };
    expect(mutedMembersForRule("dq_responseTime", agents3, [expired], NOW)).toEqual([]);
  });
  it("only lists agents with THAT rule's gap; stale has no batch muted list", () => {
    expect(mutedMembersForRule("dq_materials", agents3, [mutedFlag], NOW)).toEqual([{ agentId: "a1", agentName: "Ann" }]);
    // Bo has materials → not listed even if muted
    const boMuted: TaskFlag = { ...mutedFlag, id: "f2", agentId: "a2" };
    expect(mutedMembersForRule("dq_materials", agents3, [boMuted], NOW)).toEqual([]);
    expect(mutedMembersForRule("no_response_close", agents3, [mutedFlag], NOW)).toEqual([]);
  });
});

describe("hkGroupProgress — the G3 card's bar (complete = total − gaps)", () => {
  it("computes complete/pct/caption from real counts", () => {
    expect(hkGroupProgress(56, 16)).toEqual({ complete: 40, total: 56, pct: 71, caption: "40 of 56 agents complete" });
    expect(hkGroupProgress(56, 15)).toEqual({ complete: 41, total: 56, pct: 73, caption: "41 of 56 agents complete" });
  });
  it("never divides by zero or goes negative", () => {
    expect(hkGroupProgress(0, 0)).toEqual({ complete: 0, total: 0, pct: 0, caption: "0 of 0 agents complete" });
    expect(hkGroupProgress(3, 5).complete).toBe(0); // more gaps than agents (multi-gap agents) floors at 0
  });
});

describe("taskSurvivesMute — Task Settings type gating (single suppression point)", () => {
  it("Nudge reminders off → nudge_overdue tasks are suppressed; on → they survive", () => {
    expect(taskSurvivesMute("nudge_overdue", undefined, [])).toBe(true);
    expect(taskSurvivesMute("nudge_overdue", undefined, ["nudge_overdue"])).toBe(false);
  });
  it("Your turn to send OFF → the send family (fulls/partials/R&R) is suppressed; ON → survives; offers never gated", () => {
    for (const t of ["partial_requested", "full_requested", "revise_resubmit"]) {
      expect(taskSurvivesMute(t, undefined, ["send"])).toBe(false);
      expect(taskSurvivesMute(t, undefined, [])).toBe(true);
    }
    expect(taskSurvivesMute("offer_received", undefined, ["send"])).toBe(true); // Offers ungateable
  });
  it("Stale queries + housekeeping gating still work (existing keys)", () => {
    expect(taskSurvivesMute("no_response_close", undefined, ["no_response_close"])).toBe(false);
  });
});

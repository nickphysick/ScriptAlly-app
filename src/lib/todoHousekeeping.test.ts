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
} from "./todoHousekeeping";
import { Agent } from "../types";
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

describe("groupHousekeeping", () => {
  const agents = [
    agent({ id: "a1", name: "Ann", responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" }), // all three
    agent({ id: "a2", name: "Bo", responseTimeWeeks: 0, materialsWanted: ["Query Letter"], mswlNotes: "has one" }), // only reply window
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
    expect(byRule.no_response_close).toEqual(["Cy"]);
  });
  it("orders groups by HK_RULE_ORDER", () => {
    const groups = groupHousekeeping(cards, agents);
    expect(groups.map((g) => g.rule)).toEqual(["no_response_close", "dq_responseTime", "dq_materials", "dq_mswl"]);
  });
  it("sets the write target: agentId for dq, queryId for no_response", () => {
    const groups = groupHousekeeping(cards, agents);
    const dq = groups.find((g) => g.rule === "dq_responseTime")!;
    expect(dq.members[0].agentId).toBe("a1");
    expect(dq.members[0].queryId).toBeUndefined();
    const nrc = groups.find((g) => g.rule === "no_response_close")!;
    expect(nrc.members[0].queryId).toBe("q9");
    expect(nrc.members[0].agentId).toBeUndefined();
  });
  it("a muted rule produces no group", () => {
    const groups = groupHousekeeping(cards, agents, ["dq_mswl", "no_response_close"]);
    expect(groups.map((g) => g.rule)).toEqual(["dq_responseTime", "dq_materials"]);
  });
  it("skips a card whose agent is missing", () => {
    const orphan = [hkCard({ key: "task-dq-gone", relatedRecordId: "ghost" })];
    expect(groupHousekeeping(orphan, agents)).toEqual([]);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { TASK_SETTING_ROWS, typeIsOn, setTypeMute, hiddenItems } from "./taskSettings";
import { MUTED_UNTIL } from "./taskFlags";
import { Agent, Query, QueryStatus, TaskFlag } from "../types";

describe("TASK_SETTING_ROWS — the approved v2 rows (Offers the only locked row)", () => {
  it("Offers is the ONLY ALWAYS ON row (no key — no preference exists at all)", () => {
    const locked = TASK_SETTING_ROWS.filter((r) => r.locked);
    expect(locked.map((r) => r.title)).toEqual(["Offers"]);
    expect(locked[0].key).toBeUndefined();
  });
  it("the toggleable rows map to engine keys — Your turn to send in THE WORK ITSELF; no reply-windows row", () => {
    const keyed = TASK_SETTING_ROWS.filter((r) => r.key).map((r) => r.key);
    expect(keyed).toEqual(["send", "nudge_overdue", "no_response_close", "dq_materials", "dq_mswl", "sunday_review"]);
    expect(TASK_SETTING_ROWS.find((r) => r.key === "send")!.group).toBe("urgent");
    expect(TASK_SETTING_ROWS.find((r) => r.key === "no_response_close")!.group).toBe("urgent"); // Stale in THE WORK ITSELF
    expect(keyed).not.toContain("dq_responseTime"); // the reply-windows row is dropped entirely
  });
});

describe("typeIsOn / setTypeMute — the switch ↔ mutedTaskRules mapping", () => {
  it("absent key = ON; present = OFF", () => {
    expect(typeIsOn("nudge_overdue", [])).toBe(true);
    expect(typeIsOn("nudge_overdue", ["nudge_overdue"])).toBe(false);
  });
  it("OFF adds the key (deduped); ON removes it — round-trips", () => {
    expect(setTypeMute("nudge_overdue", [], false)).toEqual(["nudge_overdue"]);
    expect(setTypeMute("nudge_overdue", ["nudge_overdue"], false)).toEqual(["nudge_overdue"]); // dedup
    expect(setTypeMute("nudge_overdue", ["nudge_overdue", "dq_mswl"], true)).toEqual(["dq_mswl"]);
    expect(setTypeMute("dq_mswl", undefined, false)).toEqual(["dq_mswl"]);
  });
});

describe("hiddenItems — rule-mutes + permanent dismisses + live snoozes (Phase 3)", () => {
  const NOW = Date.parse("2026-07-17T12:00:00Z");
  const agents = [{ id: "a1", name: "Marcus Reed", agency: "Bloomsbury" }] as unknown as Agent[];
  const queries = [{ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED }] as unknown as Query[];
  const flag = (over: Partial<TaskFlag>): TaskFlag => ({ id: "f", userId: "u", taskType: "no_response_close", snoozeCount: 0, ...over } as TaskFlag);

  it("rule-mutes list housekeeping/stale keys only (nudge/sunday are settings-only, excluded)", () => {
    const items = hiddenItems(["dq_mswl", "no_response_close", "nudge_overdue", "sunday_review"], [], agents, queries, NOW);
    expect(items.map((i) => i.label)).toEqual(["Missing wish lists", "Stale queries"]);
    expect(items.every((i) => i.meta === "MUTED AS A RULE")).toBe(true);
    expect(items[0].restore).toEqual({ rule: "dq_mswl" });
  });

  it("a permanent dismiss → DISMISSED (subject from the query's agent); its flag key restores it", () => {
    const items = hiddenItems([], [flag({ queryId: "q1", snoozedUntil: MUTED_UNTIL })], agents, queries, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("dismissed");
    expect(items[0].label).toBe("Marcus Reed — stale query");
    expect(items[0].meta).toBe("DISMISSED");
    expect(items[0].restore).toEqual({ flag: { taskType: "no_response_close", queryId: "q1" } });
  });

  it("a live snooze → SNOOZED UNTIL {date}; an expired one is not listed", () => {
    const future = new Date(NOW + 5 * 86400000).toISOString();
    const past = new Date(NOW - 86400000).toISOString();
    const live = hiddenItems([], [flag({ queryId: "q1", snoozedUntil: future })], agents, queries, NOW);
    expect(live[0].kind).toBe("snoozed");
    expect(live[0].meta).toMatch(/^SNOOZED UNTIL /);
    expect(hiddenItems([], [flag({ queryId: "q1", snoozedUntil: past })], agents, queries, NOW)).toEqual([]);
  });
});

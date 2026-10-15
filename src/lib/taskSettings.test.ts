/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { TASK_SETTING_ROWS, setAsideItems, setAsideLabel, setAsideMeta } from "./taskSettings";
import { MUTED_UNTIL, changeMs, dismissalHolds, isFlagSuppressing, subjectChange, subjectDatesChanges } from "./taskFlags";
import { Agent, Query, QueryStatus, TaskFlag } from "../types";

describe("TASK_SETTING_ROWS — the approved v2 rows (Offers the only locked row)", () => {
  it("Offers is the ONLY ALWAYS ON row (no key — no preference exists at all)", () => {
    const locked = TASK_SETTING_ROWS.filter((r) => r.locked);
    expect(locked.map((r) => r.title)).toEqual(["Offers"]);
    expect(locked[0].key).toBeUndefined();
  });
  it("the toggleable rows map to engine keys — Your turn to send in THE WORK ITSELF; no reply-windows row", () => {
    const keyed = TASK_SETTING_ROWS.filter((r) => r.key).map((r) => r.key);
    expect(keyed).toEqual(["send", "nudge_overdue", "no_response_close", "dq_materials", "dq_mswl"]);
    expect(TASK_SETTING_ROWS.find((r) => r.key === "send")!.group).toBe("urgent");
    expect(TASK_SETTING_ROWS.find((r) => r.key === "no_response_close")!.group).toBe("urgent"); // Stale in THE WORK ITSELF
    expect(keyed).not.toContain("dq_responseTime"); // the reply-windows row is dropped entirely
  });
});

/* ⚠️ THE SWITCH-MAPPING TESTS WENT WITH THEIR FUNCTIONS. `typeIsOn`/`setTypeMute` were the retired
   sheet's mapping between a switch and `mutedTaskRules`; the board's set-aside panel removes a rule
   key directly, and `boardSettings.test.tsx` locks that path against the surface that runs it. */

describe("TD5 I4 (unit) — setAsideItems: snoozes, holding dismissals, legacy mutes, every rule (v5.1 §I.7)", () => {
  const NOW = Date.parse("2026-07-17T12:00:00Z");
  const agents = [{ id: "a1", name: "Marcus Reed", agency: "Bloomsbury" }] as unknown as Agent[];
  const queries = [{ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED }] as unknown as Query[];
  const flag = (over: Partial<TaskFlag>): TaskFlag => ({ id: "f", userId: "u", taskType: "no_response_close", snoozeCount: 0, ...over } as TaskFlag);
  const user = (r: string[]) => ({ mutedTaskRules: r });

  it("EVERY muted rule key is listed — no_response_close and nudge_overdue included — and nothing else", () => {
    const items = setAsideItems(user(["dq_mswl", "no_response_close", "nudge_overdue", "send", "sunday_review"]), [], agents, queries, NOW);
    expect(items.map((i) => i.rule)).toEqual(["dq_mswl", "no_response_close", "nudge_overdue", "send"]);
    expect(items.every((i) => i.kind === "rule" && "rule" in i.restore)).toBe(true);
    expect(items.map(setAsideMeta)).toEqual(Array(4).fill("SWITCHED OFF · FOR EVERY AGENT"));
  });

  it("a legacy permanent mute is a DISMISSAL with no date, restored by clearing snoozedUntil", () => {
    const [i] = setAsideItems(user([]), [flag({ queryId: "q1", snoozedUntil: MUTED_UNTIL })], agents, queries, NOW);
    expect(i.kind).toBe("dismiss");
    expect(i.legacy).toBe(true);
    expect(setAsideMeta(i)).toBe("DISMISSED");
    expect(setAsideLabel(i)).toBe("Marcus Reed — stale query");
    expect(i.restore).toEqual({ flag: { taskType: "no_response_close", queryId: "q1" }, patch: { snoozedUntil: null } });
  });

  it("a dismissal is listed while it HOLDS and restored by clearing skippedAt — never snoozedUntil", () => {
    const skippedAt = new Date(NOW - 3600_000).toISOString();
    const f = flag({ queryId: "q1", skippedAt });
    const [i] = setAsideItems(user([]), [f], agents, queries, NOW, []);
    expect(i.kind).toBe("dismiss");
    expect(i.restore).toEqual({ flag: { taskType: "no_response_close", queryId: "q1" }, patch: { skippedAt: null } });
    /* something newer on the query: the dismissal no longer holds, so it is not set aside */
    const newer = [{ queryId: "q1", date: new Date(NOW - 60_000).toISOString() }];
    expect(setAsideItems(user([]), [f], agents, queries, NOW, newer)).toEqual([]);
  });

  it("a live snooze is listed with its day; an expired one and an offer's quiet reminder are not", () => {
    const future = new Date(NOW + 5 * 86400000).toISOString();
    const past = new Date(NOW - 86400000).toISOString();
    const live = setAsideItems(user([]), [flag({ queryId: "q1", snoozedUntil: future })], agents, queries, NOW);
    expect(live[0].kind).toBe("snooze");
    expect(setAsideMeta(live[0])).toMatch(/^SNOOZED UNTIL /);
    expect(live[0].restore).toEqual({ flag: { taskType: "no_response_close", queryId: "q1" }, patch: { snoozedUntil: null, unbumpSnooze: true } });
    expect(setAsideItems(user([]), [flag({ queryId: "q1", snoozedUntil: past })], agents, queries, NOW)).toEqual([]);
    expect(setAsideItems(user([]), [flag({ taskType: "offer_received", queryId: "q1", snoozedUntil: future })], agents, queries, NOW)).toEqual([]);
  });
});

describe("TD5 I1 (unit) — a dismissal holds until something newer is stored on its subject (v5.1 §I.2)", () => {
  const at = "2026-10-14T15:00:00.000Z";
  const f = { taskType: "nudge_overdue", queryId: "q1", skippedAt: at } as TaskFlag;
  it("holds with no newer change, and not after one", () => {
    expect(dismissalHolds(f, Date.parse(at) - 1)).toBe(true);
    expect(dismissalHolds(f, Date.parse(at))).toBe(true);
    expect(dismissalHolds(f, Date.parse(at) + 1)).toBe(false);
  });
  it("a subject with no stored change time holds until brought back (an agent's task)", () => {
    expect(dismissalHolds(f, null)).toBe(true);
    const ag = { taskType: "data_quality_poor", agentId: "a1" } as TaskFlag;
    expect(subjectDatesChanges(ag)).toBe(false);
    expect(subjectChange(ag, [{ queryId: "", date: "2026-10-20T10:00:00Z" }])).toBeNull();
  });
  it("the writer's own flag writes are not changes; the query's newest activity is", () => {
    const acts = [{ queryId: "q1", date: "2026-10-13T09:00:00.000Z" }, { queryId: "q2", date: "2026-10-16T09:00:00.000Z" }, { queryId: "q1", date: "2026-10-15T09:30:00.000Z" }];
    expect(subjectChange(f, acts)?.ms).toBe(Date.parse("2026-10-15T09:30:00.000Z"));
    expect(isFlagSuppressing(f, Date.parse("2026-10-16T00:00:00Z"), subjectChange(f, acts)?.ms)).toBe(false);
    expect(isFlagSuppressing(f, Date.parse("2026-10-16T00:00:00Z"), subjectChange(f, acts.slice(0, 1))?.ms)).toBe(true);
    /* a reader that passes nothing keeps the old behaviour: a dismissal holds */
    expect(isFlagSuppressing(f, Date.parse("2026-10-16T00:00:00Z"))).toBe(true);
  });
  it("a day-only (noon) date counts as late in its day", () => {
    const noon = new Date(2026, 9, 14, 12, 0, 0).toISOString();
    expect(changeMs(noon)).toBe(new Date(2026, 9, 15).getTime() - 1);
    const timed = new Date(2026, 9, 14, 12, 0, 1).toISOString();
    expect(changeMs(timed)).toBe(Date.parse(timed));
  });
});

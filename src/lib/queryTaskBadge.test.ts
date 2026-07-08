import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Task } from "../types";
import {
  queryTaskBadge,
  URGENT_TASK_TYPES,
  HOUSEKEEPING_TASK_TYPES,
} from "./queryTaskBadge";

const task = (relatedRecordId: string, taskType: string): Task =>
  ({
    id: `${relatedRecordId}:${taskType}`,
    priority: "urgent",
    title: "",
    description: "",
    manuscriptTitle: "",
    context: "",
    relatedRecordId,
    taskType,
    actionLabel: "",
    actionPath: "queries",
  } as Task);

describe("queryTaskBadge", () => {
  it("no tasks for the query → count 0, tier null", () => {
    expect(queryTaskBadge([task("q2", "nudge_overdue")], "q1")).toEqual({ count: 0, tier: null });
    expect(queryTaskBadge([], "q1")).toEqual({ count: 0, tier: null });
  });

  it("urgent wins the tier even when housekeeping is also present", () => {
    const tasks = [task("q1", "data_quality_poor"), task("q1", "nudge_overdue")];
    expect(queryTaskBadge(tasks, "q1")).toEqual({ count: 2, tier: "urgent" });
  });

  it("only housekeeping → housekeeping tier", () => {
    const tasks = [task("q1", "dream_agent_unqueried"), task("q1", "no_response_close")];
    expect(queryTaskBadge(tasks, "q1")).toEqual({ count: 2, tier: "housekeeping" });
  });

  it("counts only this query's actionable tasks; ignores other queries + unclassified types", () => {
    const tasks = [
      task("q1", "full_requested"),   // urgent, counts
      task("q1", "some_unknown_type"), // unclassified, ignored
      task("q2", "nudge_overdue"),    // other query, ignored
    ];
    expect(queryTaskBadge(tasks, "q1")).toEqual({ count: 1, tier: "urgent" });
  });
});

/**
 * Drift guard — the taskType lists here MUST match the dashboard's OverToYou classification, or the
 * ribbon badge and the To-do streams would disagree about what's urgent. Asserted against the source
 * text so this lib stays pure (no component import).
 */
describe("taskType lists mirror OverToYou", () => {
  const src = readFileSync(resolve(__dirname, "../components/dashboard/OverToYou.tsx"), "utf8");
  const arrayLiteral = (name: string): string[] => {
    const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
    if (!m) throw new Error(`could not find ${name} in OverToYou.tsx`);
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };

  it("URGENT_TASK_TYPES matches OverToYou.URGENT_TYPES", () => {
    expect([...URGENT_TASK_TYPES]).toEqual(arrayLiteral("URGENT_TYPES"));
  });
  it("HOUSEKEEPING_TASK_TYPES matches OverToYou.HOUSEKEEPING_TYPES", () => {
    expect([...HOUSEKEEPING_TASK_TYPES]).toEqual(arrayLiteral("HOUSEKEEPING_TYPES"));
  });
});

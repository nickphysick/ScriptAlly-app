/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SINGLE AND EMPTY CASES (manuscript-scope B3).
 *
 * The one-manuscript account is the common case today and THE REGRESSION RISK — it is the case
 * nobody thinks to check, because the feature it is testing does nothing there. These assert that
 * scoping is a NO-OP when there is one book, which is the strongest form of "renders as before".
 */
import { describe, it, expect } from "vitest";
import { scopeActivities, scopeQueries, scopeTasks } from "./manuscriptScope";
import { runStage } from "./oneScreen";
import { resolveScopedManuscript } from "./shellSidebar";
import { Activity, Query, Task } from "../types";

const NOW = new Date("2026-08-10T12:00:00Z");
const q = (id: string, manuscriptId: string, dateSent?: string): Query =>
  ({ id, manuscriptId, dateSent } as Query);
const act = (id: string, manuscriptId: string): Activity => ({ id, manuscriptId } as Activity);
const task = (id: string, relatedRecordId: string): Task => ({ id, relatedRecordId } as Task);

describe("⚠️ ONE MANUSCRIPT — scoping must be a no-op", () => {
  const ms = [{ id: "m1", createdDate: "2026-01-01" }];
  const ids = new Set(["m1"]);
  const queries = [q("q1", "m1", "2026-02-01"), q("q2", "m1", "2026-03-01")];
  const feed = [act("a1", "m1"), act("agent", "")];
  const tasks = [task("t1", "q1"), task("t-agent", "agent-9")];

  it("every scoped set is identical to the unscoped one", () => {
    expect(scopeQueries(queries, "m1")).toEqual(queries);
    expect(scopeActivities(feed, "m1")).toEqual(feed);
    expect(scopeTasks(tasks, queries, ids, "m1")).toEqual(tasks);
  });

  it("the scoped stage equals the account stage — no first-run state appears from nowhere", () => {
    expect(runStage(scopeQueries(queries, "m1"), ms, NOW)).toBe(runStage(queries, ms, NOW));
  });

  it("the selection resolves to the only book, stored or not", () => {
    expect(resolveScopedManuscript(ms, undefined)?.id).toBe("m1");
    expect(resolveScopedManuscript(ms, "m1")?.id).toBe("m1");
    expect(resolveScopedManuscript(ms, "deleted")?.id).toBe("m1");
  });
});

describe("⚠️ A NEW MANUSCRIPT WITH NO QUERIES shows a first-run state, not zeros", () => {
  const ms = [{ id: "old", createdDate: "2026-01-01" }, { id: "new", createdDate: "2026-08-01" }];
  const queries = [q("q1", "old", "2026-02-01")];

  it("the scoped stage is pre-line for the new book while the account is settled", () => {
    // a zero-filled populated chart would claim a reading that was never taken
    expect(runStage(scopeQueries(queries, "new"), ms, NOW)).toBe("early-days");
    expect(runStage(queries, ms, NOW)).toBe("settled");
  });

  it("⚠️ the ACCOUNT stage never regresses to day-one — a fourth book is not a fresh start", () => {
    expect(runStage(queries, ms, NOW)).not.toBe("day-one");
  });

  it("the new book's scoped sets are genuinely empty", () => {
    expect(scopeQueries(queries, "new")).toHaveLength(0);
  });
});

describe("⚠️ NO MANUSCRIPTS AT ALL — the day-one state stands", () => {
  it("both stages agree, so nothing extra is needed for this case", () => {
    expect(runStage([], [], NOW)).toBe("day-one");
    expect(runStage(scopeQueries([], null), [], NOW)).toBe("day-one");
  });

  it("a null scope passes everything through untouched", () => {
    const feed = [act("a", "m1"), act("b", "")];
    expect(scopeActivities(feed, null)).toEqual(feed);
    expect(scopeTasks([task("t", "x")], [], new Set(), null)).toHaveLength(1);
  });

  it("resolving with no manuscripts yields null rather than throwing", () => {
    expect(resolveScopedManuscript([], "anything")).toBeNull();
  });
});

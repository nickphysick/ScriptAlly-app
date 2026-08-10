/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ WHAT BELONGS TO A BOOK, AND WHAT BELONGS TO YOU (manuscript-scope B2).
 *
 * The classification matters more than the wiring, so these assert the CLASSIFICATION: three
 * records answer "which manuscript?" three ways, and account-scoped things must survive a switch.
 */
import { describe, it, expect } from "vitest";
import { activityIsScoped, scopeActivities, scopeQueries, scopeTasks, taskManuscriptId } from "./manuscriptScope";
import { Activity, Query, Task } from "../types";

const q = (id: string, manuscriptId: string): Query => ({ id, manuscriptId } as Query);
const act = (id: string, manuscriptId: string): Activity => ({ id, manuscriptId } as Activity);
const task = (id: string, relatedRecordId: string): Task => ({ id, relatedRecordId } as Task);

const QUERIES = [q("q1", "m1"), q("q2", "m2")];
const IDS = new Set(["m1", "m2"]);

describe("queries scope directly", () => {
  it("keeps only this manuscript's", () => {
    expect(scopeQueries(QUERIES, "m1").map((x) => x.id)).toEqual(["q1"]);
  });
  it("a null scope is everything — the no-manuscript case", () => {
    expect(scopeQueries(QUERIES, null)).toHaveLength(2);
  });
});

describe("activities: query events scope, agent events do not", () => {
  it("⚠️ an agent event carries manuscriptId '' DELIBERATELY and is ALWAYS visible", () => {
    expect(activityIsScoped(act("a", ""))).toBe(false);
    const feed = [act("query-ev", "m1"), act("other-book", "m2"), act("agent-ev", "")];
    expect(scopeActivities(feed, "m1").map((x) => x.id)).toEqual(["query-ev", "agent-ev"]);
  });

  it("⚠️ the feed never empties on a switch — unscoped context survives", () => {
    const feed = [act("other-book", "m2"), act("agent-ev", "")];
    expect(scopeActivities(feed, "m1").map((x) => x.id)).toEqual(["agent-ev"]);
  });
});

describe("tasks: three rules, resolved by ID and never by title", () => {
  it("a query-keyed task takes its query's manuscript", () => {
    expect(taskManuscriptId(task("t", "q1"), QUERIES, IDS)).toBe("m1");
  });

  it("a manuscript-keyed task points at the manuscript directly", () => {
    expect(taskManuscriptId(task("t", "m2"), QUERIES, IDS)).toBe("m2");
  });

  it("⚠️ an AGENT-keyed task belongs to nobody's book — always visible", () => {
    expect(taskManuscriptId(task("t", "agent-77"), QUERIES, IDS)).toBeNull();
    const tasks = [task("mine", "q1"), task("theirs", "q2"), task("agentish", "agent-77")];
    expect(scopeTasks(tasks, QUERIES, IDS, "m1").map((t) => t.id)).toEqual(["mine", "agentish"]);
  });

  it("⚠️ a task whose query was DELETED stays visible rather than vanishing", () => {
    // the work is still real; losing it silently because its record went is the worse failure
    expect(taskManuscriptId(task("t", "deleted-query"), QUERIES, IDS)).toBeNull();
    expect(scopeTasks([task("orphan", "deleted-query")], QUERIES, IDS, "m1")).toHaveLength(1);
  });

  it("⚠️ NEVER matches on a display string — two books may share a title", () => {
    const titled = [task("t", "Tidewrack")];
    // "Tidewrack" is a title, not an id: it resolves to no manuscript, so the task stays visible
    expect(scopeTasks(titled, QUERIES, IDS, "m1")).toHaveLength(1);
    expect(taskManuscriptId(titled[0], QUERIES, IDS)).toBeNull();
  });
});

describe("the switch changes scoped things and leaves account things alone", () => {
  const feed = [act("q-m1", "m1"), act("q-m2", "m2"), act("agent", "")];
  const tasks = [task("t-m1", "q1"), task("t-m2", "q2"), task("t-agent", "agent-9")];

  it("⚠️ BOTH DIRECTIONS — scoped figures MOVE and unscoped ones DO NOT", () => {
    const one = { qs: scopeQueries(QUERIES, "m1"), acts: scopeActivities(feed, "m1"), ts: scopeTasks(tasks, QUERIES, IDS, "m1") };
    const two = { qs: scopeQueries(QUERIES, "m2"), acts: scopeActivities(feed, "m2"), ts: scopeTasks(tasks, QUERIES, IDS, "m2") };

    // scoped: they differ
    expect(one.qs.map((x) => x.id)).not.toEqual(two.qs.map((x) => x.id));
    expect(one.acts.map((x) => x.id)).not.toEqual(two.acts.map((x) => x.id));
    expect(one.ts.map((x) => x.id)).not.toEqual(two.ts.map((x) => x.id));

    // account-scoped: present in BOTH, unchanged
    for (const side of [one, two]) {
      expect(side.acts.map((x) => x.id)).toContain("agent");
      expect(side.ts.map((x) => x.id)).toContain("t-agent");
    }
  });
});

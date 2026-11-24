/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1 — the activity feed's sentences. Part A: the subject is carried, never guessed.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ActivityType, type Activity, type Agent, type Manuscript } from "../types";
import { feedEntries, sayText, type FeedEntry } from "./dashFeed";
import { drawerEvents } from "./dashFeedDrawer";

const NOW = new Date(2026, 10, 24, 15, 0, 0);
const at = (minsAgo: number) => new Date(NOW.getTime() - minsAgo * 60_000).toISOString();
let seq = 0;
const act = (over: Partial<Activity>): Activity =>
  ({ id: `h${++seq}`, userId: "u", queryId: "", manuscriptId: "", date: at(30), details: "", description: "", ...over } as Activity);
const feed = (activities: Activity[], agents: Agent[] = [], manuscripts: Manuscript[] = []) =>
  feedEntries({ activities, queries: [], agents, manuscripts, now: NOW, seenAt: null });
const whoRuns = (e: FeedEntry) => e.say.filter((s) => s.who || s.em).map((s) => s.t);

describe("Part A — a deleted agent's and a deleted manuscript's rows name the subject once", () => {
  /* the agent and the book are gone from the live lists: only what the rows carry can name them */
  const rows = [
    act({ activityType: ActivityType.AGENT_ADDED, description: "Added Nadia Hussain at Hussain Literary", subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", date: at(50) }),
    act({ activityType: ActivityType.AGENT_UPDATED, description: "You updated details for Nadia Hussain at Hussain Literary", subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", changed: ["fit"], date: at(40) }),
    act({ activityType: ActivityType.AGENT_DELETED, description: "You deleted Nadia Hussain (and 2 queries removed)", subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", removedQueries: 2, date: at(20) }),
    act({ activityType: ActivityType.AGENT_DELETED, description: "You deleted Penhallow Literary", subjectAgency: "Penhallow Literary", date: at(19) }),
    act({ activityType: ActivityType.MANUSCRIPT_ADDED, description: "You added a new title Tidewrack to your manuscripts", manuscriptId: "m-gone", subjectName: "Tidewrack", date: at(15) }),
    act({ activityType: ActivityType.MANUSCRIPT_UPDATED, description: "You updated a manuscript's details", manuscriptId: "m-gone", subjectName: "Tidewrack", date: at(12) }),
    act({ activityType: ActivityType.MANUSCRIPT_DELETED, description: "You deleted “Tidewrack” (and 1 query removed)", subjectName: "Tidewrack", removedQueries: 1, date: at(10) }),
  ];
  const entries = feed(rows);

  it("the population is every row (non-zero)", () => {
    expect(entries).toHaveLength(rows.length);
  });

  it("each names its subject once, and the subject's run holds the name alone", () => {
    for (const e of entries) {
      const runs = whoRuns(e);
      expect(runs, sayText(e.say)).toHaveLength(1);
      const name = runs[0];
      expect(["Nadia Hussain", "Penhallow Literary", "Tidewrack"]).toContain(name);
      expect(sayText(e.say).split(name).length - 1, sayText(e.say)).toBe(1);
    }
  });

  it("no say run of any entry equals or contains its activity's description — on the feed and in the drawer", () => {
    const byId = new Map(rows.map((r) => [r.id, r.description]));
    const drawer = drawerEvents(entries, []);
    expect(drawer).toHaveLength(rows.length);
    for (const say of [...entries.map((e) => ({ id: e.id, say: e.say })), ...drawer.map((d) => ({ id: d.entry.id, say: d.say }))]) {
      const desc = byId.get(say.id)!;
      expect(desc.length).toBeGreaterThan(0);
      for (const run of say.say) expect(run.t.includes(desc), `${run.t} ⊇ ${desc}`).toBe(false);
      expect(sayText(say.say)).not.toBe(desc);
    }
  });

  it("a nameless agent is its agency, said once", () => {
    const e = entries.find((x) => x.say.some((s) => s.t === "Penhallow Literary"))!;
    expect(sayText(e.say)).toBe("You removed Penhallow Literary from your contact list");
    expect(drawerEvents([e], [])[0].meta).toBe("");
  });
});

describe("Part A — a row with no resolvable subject drops", () => {
  it("an update, an add and a delete naming nobody the feed can find are not shown", () => {
    const entries = feed([
      act({ activityType: ActivityType.AGENT_UPDATED, description: "You updated details for Rae Abbott at Abbott Books" }),
      act({ id: "act-added-agent-gone", activityType: ActivityType.AGENT_ADDED, description: "Added Rae Abbott at Abbott Books" }),
      act({ activityType: ActivityType.AGENT_DELETED, description: "You deleted Rae Abbott" }),
      act({ activityType: ActivityType.MANUSCRIPT_UPDATED, description: "You updated a manuscript's details", manuscriptId: "m-gone" }),
      act({ activityType: ActivityType.MANUSCRIPT_DELETED, description: "You deleted “Tidewrack”" }),
    ], [{ id: "ag-live", name: "Rae Abbott", agency: "Abbott Books" } as Agent]);
    expect(entries).toEqual([]);
  });

  it("an Added row with no carried subject is named by the live agent its id names", () => {
    const entries = feed([act({ id: "act-added-agent-ag-live", activityType: ActivityType.AGENT_ADDED, description: "Added Rae Abbott at Abbott Books" })],
      [{ id: "ag-live", name: "Rae Abbott", agency: "Abbott Books" } as Agent]);
    expect(entries.map((e) => sayText(e.say))).toEqual(["You added Rae Abbott to your contact list"]);
  });

  it("a manuscript row with no carried subject is named by the live manuscript", () => {
    const entries = feed([act({ activityType: ActivityType.MANUSCRIPT_UPDATED, description: "You updated a manuscript's details", manuscriptId: "m1" })],
      [], [{ id: "m1", title: "Saltmarsh" } as Manuscript]);
    expect(entries.map((e) => sayText(e.say))).toEqual(["You updated the details of Saltmarsh"]);
  });

  it("the longest-token match is gone: the feed never searches a description for a name", () => {
    const src = readFileSync("src/lib/dashFeed.ts", "utf8");
    expect(src).not.toMatch(/desc\.includes\(|description\.includes\(/);
  });
});

describe("Part A — every housekeeping write site carries its subject", () => {
  const db = readFileSync("src/lib/db.tsx", "utf8");
  const body = (fn: string) => { const i = db.indexOf(`const ${fn} = async`); return db.slice(i, db.indexOf("\n  };\n", i)); };
  it.each([
    ["addAgent", "...agentSubject(newAg)"],
    ["deleteAgent", "...goneSubject"],
    ["deleteAgent", "...removedOf(qn)"],
    ["addManuscript", "...manuscriptSubject(newMs)"],
    ["deleteManuscript", "...msSubject"],
    ["deleteManuscript", "...removedOf(qn)"],
  ])("%s writes %s", (fn, needle) => {
    expect(body(fn)).toContain(needle);
  });
  it("deleting a nameless agent records the agency, never 'an agent' when it has one", () => {
    expect(body("deleteAgent")).toMatch(/gone\?\.name\?\.trim\(\) \|\| gone\?\.agency\?\.trim\(\)/);
  });
});

describe("Part A — the rules allow the carried keys on both stores", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const fn = (name: string) => { const i = rules.indexOf(`function ${name}(`); return rules.slice(i, rules.indexOf("\n    }\n", i)); };
  it.each(["isValidActivity", "isValidActivityNested"])("%s types every new key", (name) => {
    const f = fn(name);
    for (const k of ["subjectName", "subjectAgency", "previousName", "changedTo"]) expect(f).toContain(`data.${k} is string && data.${k}.size() <= 200`);
    for (const k of ["removedQueries", "batchCount"]) expect(f).toContain(`data.${k} is int && data.${k} >= 0`);
    expect(f).toContain("data.changed is list && data.changed.size() <= 12");
  });
  it("the nested store's hasOnly names them", () => {
    const f = fn("isValidActivityNested");
    for (const k of ["subjectName", "subjectAgency", "previousName", "removedQueries", "changed", "changedTo", "batchCount"]) expect(f).toContain(`'${k}'`);
  });
});

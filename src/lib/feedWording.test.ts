/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1 — the activity feed's sentences. Part A: the subject is carried, never guessed.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ActivityType, type Activity, type Agent, type Manuscript } from "../types";
import { feedEntries, sayText, type FeedEntry, type FeedSeg } from "./dashFeed";
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

/* ═══ Part B — agent and manuscript updates say what changed ═══════════════════════════════════════ */
import { agentChange, agentUpdateActivity, manuscriptChange, houseSay, foldAgentBursts, AGENT_SILENT, AGENT_GROUP_OF, type HouseFields } from "./feedHouse";
import { ManuscriptStatus, SubmissionStatus } from "../types";

const AG = { id: "ag1", userId: "u", name: "Nadia Hussain", agency: "Hussain Literary", email: "n@h.co", website: "", genres: ["Crime"],
  mswlNotes: "Dark", starRating: 3, submissionStatus: SubmissionStatus.OPEN, submissionMethod: "Email", materialsWanted: [],
  dateAdded: "", lastCheckedDate: "", notes: "" } as unknown as Agent;
const X = { t: "Nadia Hussain", who: true } as const;
const upd = (changed: string[], over: Partial<Activity> = {}) => sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed, ...over }, X, "Hussain Literary")!);

describe("Part B — what a save changed", () => {
  it("fit, wishlist and open status in one save is ONE activity naming the three groups", () => {
    const a = agentUpdateActivity(AG, { starRating: 5, mswlNotes: "Darker", submissionStatus: SubmissionStatus.CLOSED }, "2026-11-24T10:00:00Z");
    expect(a).not.toBeNull();
    expect(a!.changed).toEqual(["open", "fit", "wishlist"]);
    expect(a!.changedTo).toBe("Closed");
    expect(a!.details).toBe("Submission status updated to Closed");
    expect(a!.subjectName).toBe("Nadia Hussain");
    expect(a!.subjectAgency).toBe("Hussain Literary");
  });
  it("a notes-only save writes none; nor does a save that changes nothing", () => {
    expect(agentUpdateActivity(AG, { notes: "rang her", agentNotes: "x", pinnedNoteId: "n1", mswlCheckedAt: "2026-11-24" }, "t")).toBeNull();
    expect(agentUpdateActivity(AG, { name: "Nadia Hussain", genres: ["Crime"], starRating: 3, website: null as unknown as string }, "t")).toBeNull();
    expect(agentUpdateActivity(AG, {}, "t")).toBeNull();
  });
  it("a rename carries the old name; an agency move the new agency", () => {
    const r = agentUpdateActivity(AG, { name: "Nadia Hussain-Reid" }, "t")!;
    expect(r).toMatchObject({ changed: ["name"], previousName: "Nadia Hussain", subjectName: "Nadia Hussain-Reid" });
    expect(agentUpdateActivity(AG, { agency: "Penhallow Literary" }, "t")).toMatchObject({ changed: ["agency"], subjectAgency: "Penhallow Literary" });
  });
  it("every field maps to one group or is silent, never both", () => {
    for (const k of Object.keys(AGENT_GROUP_OF)) expect(AGENT_SILENT.has(k), k).toBe(false);
    expect(agentChange(AG, { email: "x@y.z", city: "Leeds" }).changed).toEqual(["contact"]);
    expect(agentChange(AG, { responseTimeWeeks: 6 }).changed).toEqual(["replyTime"]);
    expect(agentChange(AG, { materialsWanted: ["Synopsis"] }).changed).toEqual(["asks"]);
    expect(agentChange(AG, { reopensOn: "2026-12-01" }).changed).toEqual(["reopens"]);
  });
  it("a manuscript save: title, status, else details; comps-only and unchanged say nothing", () => {
    const ms = { id: "m1", title: "Tidewrack", status: ManuscriptStatus.DRAFTING, genre: "Crime" } as unknown as Manuscript;
    expect(manuscriptChange(ms, { title: "Saltmarsh" })).toEqual({ changed: ["title"], previousName: "Tidewrack" });
    expect(manuscriptChange(ms, { status: ManuscriptStatus.READY_TO_QUERY })).toEqual({ changed: ["status"], changedTo: "Ready to Query" });
    expect(manuscriptChange(ms, { genre: "Thriller" })).toEqual({ changed: ["details"] });
    expect(manuscriptChange(ms, { comps: [] as never }).changed).toEqual([]);
    expect(manuscriptChange(ms, { title: "Tidewrack" }).changed).toEqual([]);
  });
});

describe("Part B — the update sentences", () => {
  it.each([
    [["name"], { previousName: "Nadia Hussein" }, "You renamed Nadia Hussein to Nadia Hussain"],
    [["agency"], {}, "You moved Nadia Hussain to Hussain Literary"],
    [["open"], { changedTo: "Open" }, "You marked Nadia Hussain as open to queries"],
    [["open"], { changedTo: "Closed" }, "You marked Nadia Hussain as closed to queries"],
    /* v1.1 ruling: Unknown has no sentence of its own (src/lib/feedWordingV11.test.ts) */
    [["open"], { changedTo: "Unknown" }, "You updated Nadia Hussain's details"],
    [["fit"], {}, "You updated Nadia Hussain's agent fit"],
    [["wishlist"], {}, "You updated Nadia Hussain's wishlist"],
    [["genres"], {}, "You updated Nadia Hussain's genres"],
    [["contact"], {}, "You updated Nadia Hussain's contact details"],
    [["replyTime"], {}, "You updated Nadia Hussain's reply time"],
    [["asks"], {}, "You updated what Nadia Hussain asks for"],
    [["reopens"], {}, "You updated when Nadia Hussain reopens"],
    [["fit", "wishlist"], {}, "You updated Nadia Hussain's agent fit and wishlist"],
    [["genres", "contact"], {}, "You updated Nadia Hussain's genres and contact details"],
    [["wishlist", "replyTime"], {}, "You updated Nadia Hussain's wishlist and reply time"],
    [["open", "fit"], {}, "You updated Nadia Hussain's details"],
    [["name", "fit"], { previousName: "N" }, "You updated Nadia Hussain's details"],
    [["fit", "wishlist", "genres"], {}, "You updated Nadia Hussain's details"],
  ] as [string[], Partial<Activity>, string][])("%j → %s", (changed, over, want) => {
    expect(upd(changed, over)).toBe(want);
  });
  it("in a rename only the NEW name is a person run; the old name is plain text", () => {
    const say = houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["name"], previousName: "Nadia Hussein" }, X)!;
    expect(say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
    expect(say.find((s) => s.t.includes("Nadia Hussein"))?.who).toBeFalsy();
  });
  it.each([
    [{ changed: ["title"], previousName: "Tidewrack" }, "You renamed Tidewrack to Saltmarsh"],
    [{ changed: ["status"], changedTo: ManuscriptStatus.READY_TO_QUERY }, "You marked Saltmarsh as ready to query"],
    [{ changed: ["status"], changedTo: ManuscriptStatus.ON_SUBMISSION }, "You marked Saltmarsh as on submission"],
    [{ changed: ["details"] }, "You updated the details of Saltmarsh"],
    [{ changed: ["title", "status"], previousName: "T", changedTo: ManuscriptStatus.SHELVED }, "You updated the details of Saltmarsh"],
    [{}, "You updated the details of Saltmarsh"],
  ] as [Partial<Activity>, string][])("manuscript %j → %s", (over, want) => {
    expect(sayText(houseSay({ activityType: ActivityType.MANUSCRIPT_UPDATED, ...over }, { t: "Saltmarsh", em: true })!)).toBe(want);
  });
});

describe("Part B — bursts", () => {
  const u = (id: string, minsAgo: number, over: Partial<Activity>) =>
    act({ id, activityType: ActivityType.AGENT_UPDATED, date: at(minsAgo), subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", ...over });
  it("three updates to one agent within 10 minutes show as one row, at the newest time, from the union of groups", () => {
    const entries = feed([u("u1", 30, { changed: ["fit"] }), u("u2", 26, { changed: ["wishlist"] }), u("u3", 21, { changed: ["genres"] })]);
    expect(entries.map((e) => e.id)).toEqual(["u3"]);
    expect(sayText(entries[0].say)).toBe("You updated Nadia Hussain's details");
    expect(entries[0].at).toBe(new Date(at(21)).getTime());
  });
  it("11 minutes apart, two", () => {
    expect(feed([u("u1", 30, { changed: ["fit"] }), u("u2", 19, { changed: ["wishlist"] })]).map((e) => e.id)).toEqual(["u2", "u1"]);
  });
  it("a rename inside the burst still folds, and says it as a rename from the first name", () => {
    const rows = foldAgentBursts([
      u("u1", 30, { changed: ["name"], subjectName: "Nadia H", previousName: "Nadia Hussein" }),
      u("u2", 25, { changed: ["name"], subjectName: "Nadia Hussain", previousName: "Nadia H" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["u2"]);
    expect(rows[0].previousName).toBe("Nadia Hussein");
  });
  it("a different agent never folds in", () => {
    expect(feed([u("u1", 30, { changed: ["fit"] }), u("u2", 28, { changed: ["fit"], subjectName: "Rae Abbott", subjectAgency: "Abbott Books" })])).toHaveLength(2);
  });
});

describe("Part B — both agent save paths write ONE row through the one helper", () => {
  const db = readFileSync("src/lib/db.tsx", "utf8");
  const body = (fn: string) => { const i = db.indexOf(`const ${fn} = `); return db.slice(i, db.indexOf("\n  };\n", i)); };
  it("updateAgent: one agentUpdateActivity, no per-field rows, quiet for a sweep", () => {
    const b = body("updateAgent");
    expect(b.match(/agentUpdateActivity\(/g)).toHaveLength(1);
    expect(b).not.toContain("activitiesToCreate");
    expect(b).toContain("!opts.quiet");
  });
  it("saveAgentEdits: one agentUpdateActivity after the commit", () => {
    expect(body("saveAgentEdits").match(/agentUpdateActivity\(/g)).toHaveLength(1);
  });
  it("updateManuscript narrates only when the save changed something", () => {
    expect(body("updateManuscript")).toContain("msChange.changed.length > 0");
  });
});

/* ═══ Part C — one voice ═══════════════════════════════════════════════════════════════════════════ */
import { describeEvent } from "./dashFeed";
import { QueryStatus } from "../types";
import { importSentence } from "./importEvent";
import { f1Days, type F1Ctx } from "./dashF1Feed";
import type { DrawerEvent } from "./dashFeedDrawer";

const D3 = 3 * 86_400_000;
const T = "Tidewrack";
const ev = (status: QueryStatus | null, title = T, elapsed: number | null = D3, type = "Status Changed", armed = false, key: string | null = null) =>
  describeEvent(status, "Nadia Hussain", title, elapsed, type, armed, key)!;

describe("Part C — housekeeping", () => {
  const P = { t: "Nadia Hussain", who: true } as const, B = { t: T, em: true } as const;
  it.each([
    [{ activityType: ActivityType.AGENT_ADDED }, P, "You added Nadia Hussain to your contact list"],
    [{ activityType: ActivityType.AGENT_DELETED }, P, "You removed Nadia Hussain from your contact list"],
    [{ activityType: ActivityType.AGENT_DELETED, removedQueries: 1 }, P, "You removed Nadia Hussain from your contact list, along with 1 query"],
    [{ activityType: ActivityType.AGENT_DELETED, removedQueries: 4 }, P, "You removed Nadia Hussain from your contact list, along with 4 queries"],
    [{ activityType: ActivityType.AGENT_ADDED }, { t: "Penhallow Literary", who: true }, "You added Penhallow Literary to your contact list"],
    [{ activityType: ActivityType.MANUSCRIPT_ADDED }, B, "You added Tidewrack to your manuscripts"],
    [{ activityType: ActivityType.MANUSCRIPT_DELETED }, B, "You removed Tidewrack from your manuscripts"],
    [{ activityType: ActivityType.MANUSCRIPT_DELETED, removedQueries: 1 }, B, "You removed Tidewrack from your manuscripts, along with 1 query"],
    [{ activityType: ActivityType.MANUSCRIPT_DELETED, removedQueries: 2 }, B, "You removed Tidewrack from your manuscripts, along with 2 queries"],
  ] as [HouseFields, FeedSeg, string][])("%j → %s", (a, x, want) => {
    const say = houseSay(a, x)!;
    expect(sayText(say)).toBe(want);
    expect(say.filter((s) => s.who || s.em).map((s) => s.t)).toEqual([x.t]);
  });
  it("a sweep names how many, and no one", () => {
    const e = feed([act({ activityType: ActivityType.AGENT_UPDATED, batchCount: 6, description: "You updated 6 agents' details" })]);
    expect(e.map((x) => sayText(x.say))).toEqual(["You updated 6 agents' details"]);
    expect(e[0].say.some((s) => s.who)).toBe(false);
  });
});

describe("Part C — query events", () => {
  it.each([
    [ev(QueryStatus.QUERIED), "You sent your query for Tidewrack to Nadia Hussain"],
    [ev(QueryStatus.QUERIED, ""), "You queried Nadia Hussain"],
    [ev(QueryStatus.PARTIAL_REQUESTED), "Nadia Hussain asked for a partial of Tidewrack, 3 days after you queried"],
    [ev(QueryStatus.PARTIAL_REQUESTED, "", null), "Nadia Hussain asked for a partial"],
    [ev(QueryStatus.PARTIAL_SENT, T, null), "You sent the partial of Tidewrack to Nadia Hussain"],
    [ev(QueryStatus.FULL_REQUESTED, T, null), "Nadia Hussain asked for the full manuscript of Tidewrack"],
    [ev(QueryStatus.FULL_SENT, T, null), "You sent the full manuscript of Tidewrack to Nadia Hussain"],
    [ev(QueryStatus.FULL_SENT, "", null), "You sent the full manuscript to Nadia Hussain"],
    [ev(QueryStatus.REVISE_RESUBMIT, T, null), "Nadia Hussain asked you to revise and resubmit Tidewrack"],
    [ev(QueryStatus.RESUBMITTED, T, null), "You sent the revised manuscript of Tidewrack to Nadia Hussain"],
    [ev(QueryStatus.OFFER, T, null), "Nadia Hussain offered to represent Tidewrack"],
    [ev(QueryStatus.SIGNED, T, null), "You accepted the offer from Nadia Hussain for Tidewrack"],
    [ev(QueryStatus.REJECTED, T, null), "Nadia Hussain passed on Tidewrack"],
    [ev(QueryStatus.REJECTED, T), "Nadia Hussain passed on Tidewrack, 3 days after you queried"],
    [ev(QueryStatus.WITHDRAWN, T, null), "You withdrew your query for Tidewrack from Nadia Hussain"],
    [ev(QueryStatus.NO_RESPONSE, T), "You closed your query to Nadia Hussain for Tidewrack after 3 days without a reply"],
    [ev(QueryStatus.NO_RESPONSE, T, null, "x", true), "Your query to Nadia Hussain for Tidewrack closed without a reply"],
    [ev(null, T, D3, ActivityType.NUDGE_SENT), "You nudged Nadia Hussain, 3 days after you queried"],
    [ev(null, T, null, ActivityType.NUDGE_SENT), "You nudged Nadia Hussain"],
    [ev(null, T, null, "Holding Reply"), "Nadia Hussain sent a holding reply about Tidewrack"],
    [ev(null, T, null, ActivityType.OFFER_ACCEPTED), "You accepted the offer from Nadia Hussain for Tidewrack"],
    [ev(QueryStatus.WITHDRAWN, T, null, ActivityType.OFFER_DECLINED), "You declined the offer from Nadia Hussain for Tidewrack"],
    [ev(QueryStatus.WITHDRAWN, T, null, "Status Changed", false, "offer_declined"), "You declined the offer from Nadia Hussain for Tidewrack"],
  ])("%#: %s", (say, want) => {
    expect(sayText(say)).toBe(want);
    expect(say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
    expect(say.filter((s) => s.em).every((s) => s.t === T)).toBe(true);
  });
  it("the import's sentence (and so its stored description) has no full stop", () => {
    expect(sayText(importSentence({ agents: 2, queries: 3 }, T))).toBe("You imported your list: 2 agents and 3 queries for Tidewrack");
  });
  it("several sent on one day: with one title, and without", () => {
    const e = (id: string, who: string, queryId: string): DrawerEvent => ({
      entry: { id, at: new Date(at(10)).getTime(), time: "2:50pm", dayLabel: "Today", pill: "Query sent", status: QueryStatus.QUERIED, state: null, app: false,
        say: [], provenance: "", action: null, requery: null, queryId, isNew: false, dir: "out", activityType: "Query Sent", who, agency: "", need: null, met: null } as FeedEntry,
      say: [], tag: "", meta: "",
    });
    const ctx = (titles: string[]): F1Ctx => ({ queries: titles.map((_, i) => ({ id: `q${i}`, manuscriptId: `m${i}` })) as never, agents: [],
      manuscripts: titles.map((t, i) => ({ id: `m${i}`, title: t })) as never, qcRows: [], userName: "", now: NOW });
    const evs = [e("a", "Ann Lee", "q0"), e("b", "Bo Kim", "q1"), e("c", "Cy Ray", "q2")];
    const one = f1Days(evs, "all", ctx([T, T, T]))[0].items[0];
    expect(one.type === "mini" && sayText(one.say)).toBe("You sent your query for Tidewrack to Ann Lee, Bo Kim and Cy Ray");
    const mixed = f1Days(evs, "all", ctx([T, "Saltmarsh", T]))[0].items[0];
    expect(mixed.type === "mini" && sayText(mixed.say)).toBe("You queried Ann Lee, Bo Kim and Cy Ray");
  });
});

describe("Part C — no feed sentence ends in a full stop, and none contains a dash", () => {
  it("every sentence the feed builds, over every status, type and branch", () => {
    const all: string[] = [];
    for (const st of [...Object.values(QueryStatus), null] as (QueryStatus | null)[]) {
      for (const title of [T, ""]) for (const el of [D3, null]) for (const type of ["Status Changed", ActivityType.NUDGE_SENT, "Holding Reply", ActivityType.OFFER_ACCEPTED, ActivityType.OFFER_DECLINED]) {
        for (const armed of [false, true]) { const s = describeEvent(st, "Nadia Hussain", title, el, type, armed); if (s) all.push(sayText(s)); }
      }
    }
    for (const t of Object.values(ActivityType)) {
      for (const changed of [[], ["name"], ["agency"], ["open"], ["fit", "wishlist"], ["fit", "wishlist", "genres"], ["title"], ["status"]]) {
        const s = houseSay({ activityType: t, changed, previousName: "Old", changedTo: "Closed", removedQueries: 2 } as HouseFields, { t: "X", who: true }, "Agency");
        if (s) all.push(sayText(s));
      }
    }
    all.push(sayText(importSentence({ agents: 1, queries: 1 }, T)), sayText(importSentence({ agents: 0, queries: 2 }, "")));
    expect(all.length).toBeGreaterThan(100);
    for (const t of all) {
      expect(t.trimEnd().endsWith("."), t).toBe(false);
      expect(t.includes(" — ") || t.includes(" – "), t).toBe(false);
    }
  });
});

/* ═══ Part D — the cards ════════════════════════════════════════════════════════════════════════════ */
import { bigCard, type F1Big } from "./dashF1Feed";
import type { Query } from "../types";

describe("Part D — the cards", () => {
  const today1140 = new Date(2026, 10, 24, 11, 40).getTime();
  const card = (status: QueryStatus, dir: "in" | "out", agent: Partial<Agent>, atMs = today1140) => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status, dateSent: "2026-09-28T10:00:00.000Z" } as unknown as Query;
    const e = { id: "e", at: atMs, time: "", dayLabel: "", pill: "", status, state: null, app: false, say: [], provenance: "", action: null, requery: null,
      queryId: "q1", isNew: false, dir, activityType: "Status Changed", who: agent.name || agent.agency || "", agency: agent.agency ?? "", need: null, met: null } as FeedEntry;
    const kind = status === QueryStatus.OFFER ? "offer" : dir === "out" ? "sent" : "request";
    return bigCard({ entry: e, say: [], tag: "", meta: "" }, kind, {
      queries: [q], agents: [{ id: "a1", name: "", agency: "", ...agent } as Agent], manuscripts: [{ id: "m1", title: T } as Manuscript], qcRows: [], userName: "Bea Carter", now: NOW,
    }) as F1Big;
  };
  const named = { name: "Nadia Hussain", agency: "Hussain Literary" };
  it.each([
    [QueryStatus.PARTIAL_SENT, "out", "Your partial is with Nadia"],
    [QueryStatus.FULL_SENT, "out", "Your full manuscript is with Nadia"],
    [QueryStatus.OFFER, "in", "Nadia offered to represent Tidewrack"],
    [QueryStatus.FULL_REQUESTED, "in", "Nadia asked for the full manuscript"],
    [QueryStatus.PARTIAL_REQUESTED, "in", "Nadia asked for a partial"],
  ] as [QueryStatus, "in" | "out", string][])("%s headline: %s", (st, dir, want) => {
    expect(sayText(card(st, dir, named).headline)).toBe(want);
  });
  it("a nameless agent's agency is said once, in the sentence; the sub-line gives the title instead (v1.1)", () => {
    const pen = { name: "", agency: "Penhallow Literary" };
    const inn = card(QueryStatus.PARTIAL_REQUESTED, "in", pen);
    const out = card(QueryStatus.FULL_SENT, "out", pen);
    for (const c of [inn, out]) {
      const all = `${sayText(c.top)} ${sayText(c.sub)}`;
      expect(all.split("Penhallow Literary").length - 1, all).toBe(1);
      expect(c.sub).toEqual([{ t: T, em: true, to: "/manuscripts" }]); // v1.1 Part 3: the title links to the Manuscripts page
    }
    expect(sayText(out.headline)).toBe("Your full manuscript is with Penhallow Literary");
  });
  it("every card shows its time on the feed's 12-hour clock (v1.1: the day is the heading above it)", () => {
    expect(card(QueryStatus.FULL_SENT, "out", named).time).toBe("11:40am");
    expect(card(QueryStatus.FULL_SENT, "out", named, new Date(2026, 10, 23, 13, 5).getTime()).time).toBe("1:05pm");
    expect(card(QueryStatus.FULL_SENT, "out", named, new Date(2026, 10, 18, 9, 0).getTime()).time).toBe("9:00am");
  });
  it("one clock formatter for the rows and the cards", () => {
    const f1 = readFileSync("src/lib/dashF1Feed.ts", "utf8");
    const feedSrc = readFileSync("src/lib/dashFeed.ts", "utf8");
    expect(f1).not.toContain("toLocaleTimeString");
    expect(feedSrc.match(/toLocaleTimeString/g)).toHaveLength(1);
    expect(f1).toContain("feedClock(");
  });
});

/* Part E's source half moved to src/lib/feedWordingV11.test.ts (v1.1 Part 1 and Part 2): the headline lost its line cap
   and the time moved under the sentence. */
describe("the phone's Today reads the first person run as the name", () => {
  it("on a rename row that run is the NEW name", () => {
    const e = feed([act({ activityType: ActivityType.AGENT_UPDATED, changed: ["name"], previousName: "Nadia Hussein", subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", description: "x" })]);
    expect(e[0].say.find((s) => s.who)?.t).toBe("Nadia Hussain");
  });
});

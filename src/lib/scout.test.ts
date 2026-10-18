/**
 * Discover v1 — the Scout's derivations (lock A2 and the rest of Part A's pure layer).
 */
import { describe, expect, it } from "vitest";
import {
  DAY_MS, PASS_DAYS, DISCOVER_PREFS_DEFAULT, SHARE_FIELDS, buildSubmission, catalogueFigures, communityLine,
  decisionDoc, discoverPrefPath, discoverPrefs, hasAnyFigure, heldMap, isVerified, passIsLive, passedList,
  pickQueue, pickReasons, scoutTally, submissionId, yourPart, type ScoutDecision, type ScoutInput,
} from "./scout";
import { Agent, CommunityAgent, Manuscript, ManuscriptStatus, SubmissionMethod, SubmissionStatus } from "../types";

const NOW = Date.parse("2026-10-18T12:00:00Z");

const ca = (id: string, over: Partial<CommunityAgent> = {}): CommunityAgent => ({
  id, name: `Agent ${id}`, agency: `Agency ${id}`, email: "", website: "",
  genres: ["Literary Fiction"], mswlNotes: "", starRating: 3, submissionStatus: SubmissionStatus.OPEN,
  responseTimeWeeks: 8, noResponseMeansNo: false, submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00Z", lastCheckedDate: "2026-03-01T00:00:00Z", notes: "",
  contributedByCount: 0, lastVerifiedDate: "2026-03-01T00:00:00Z", dataSource: "seed", communityQueryCount: 0,
  ...over,
});

const ms: Manuscript = {
  id: "m1", userId: "u1", title: "Murphy's Day Out", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 80000,
  logline: "A family on a coastal day out confronts memory and grief.", comps: [],
  status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-01-01T00:00:00Z",
} as Manuscript;

const agent = (id: string, over: Partial<Agent> = {}): Agent => ({ id, name: `Mine ${id}`, agency: `House ${id}`, ...over } as Agent);

const input = (over: Partial<ScoutInput> = {}): ScoutInput => ({
  catalogue: [], agents: [], manuscript: ms, decisions: [], prefs: DISCOVER_PREFS_DEFAULT, nowMs: NOW, ...over,
});

describe("A2 · the pick queue", () => {
  it("holds only verified agents whose genres take the book", () => {
    const q = pickQueue(input({ catalogue: [
      ca("a"), ca("unverified", { lastVerifiedDate: "" }), ca("crime", { genres: ["Crime"] }),
    ] }));
    expect(q.map((p) => p.agent.id)).toEqual(["a"]);
  });

  it("leaves out an agent already on the list (while the switch is on) and brings it back with it off", () => {
    const cat = [ca("held", { name: "Eleanor Whitcombe", agency: "Marsh & Tide" }), ca("b")];
    const agents = [agent("x", { name: "Eleanor Whitcombe", agency: "Marsh & Tide" })];
    expect(pickQueue(input({ catalogue: cat, agents })).map((p) => p.agent.id)).toEqual(["b"]);
    expect(pickQueue(input({ catalogue: cat, agents, prefs: { ...DISCOVER_PREFS_DEFAULT, notOnList: false } })).map((p) => p.agent.id).sort()).toEqual(["b", "held"]);
  });

  it("hides a live pass, and an EXPIRED pass returns the agent to the queue", () => {
    const cat = [ca("p"), ca("q")];
    const live: ScoutDecision = { id: "p", decision: "passed", at: "2026-10-01T00:00:00Z", manuscriptId: "m1", until: new Date(NOW + DAY_MS).toISOString() };
    const expired: ScoutDecision = { ...live, until: new Date(NOW - DAY_MS).toISOString() };
    expect(pickQueue(input({ catalogue: cat, decisions: [live] })).map((p) => p.agent.id)).toEqual(["q"]);
    expect(pickQueue(input({ catalogue: cat, decisions: [expired] })).map((p) => p.agent.id).sort()).toEqual(["p", "q"]);
  });

  it("an added agent stays out, whatever the switches say", () => {
    const d: ScoutDecision = { id: "a", decision: "added", at: "2026-10-01T00:00:00Z", manuscriptId: "m1" };
    expect(pickQueue(input({ catalogue: [ca("a")], decisions: [d], prefs: { ...DISCOVER_PREFS_DEFAULT, notOnList: false } }))).toEqual([]);
  });

  it("the lens reorders the queue (the fixture arrives in neither order)", () => {
    const cat = [
      ca("slow-wish", { responseTimeWeeks: 16, mswlNotes: "family memory coastal grief" }),
      ca("fast-plain", { responseTimeWeeks: 2 }),
      ca("mid", { responseTimeWeeks: 8, mswlNotes: "memory" }),
    ];
    const order = (lens: ScoutInput["prefs"]["lens"]) => pickQueue(input({ catalogue: cat, prefs: { ...DISCOVER_PREFS_DEFAULT, lens } })).map((p) => p.agent.id);
    expect(order("best")).toEqual(["slow-wish", "mid", "fast-plain"]);
    expect(order("fast")).toEqual(["fast-plain", "mid", "slow-wish"]);
    expect(order("best")).not.toEqual(order("fast"));
  });

  it("closed agents wait while 'open only' is on", () => {
    const cat = [ca("shut", { submissionStatus: SubmissionStatus.CLOSED }), ca("open")];
    expect(pickQueue(input({ catalogue: cat })).map((p) => p.agent.id)).toEqual(["open"]);
    expect(pickQueue(input({ catalogue: cat, prefs: { ...DISCOVER_PREFS_DEFAULT, openOnly: false } }))).toHaveLength(2);
  });

  it("no manuscript, no queue", () => {
    expect(pickQueue(input({ catalogue: [ca("a")], manuscript: null }))).toEqual([]);
  });

  it("a genre fit alone is picked, as a possible fit", () => {
    const [p] = pickQueue(input({ catalogue: [ca("plain")] }));
    expect(p.fit).toBe("possible");
  });
});

describe("pick reasons — facts, with absent figures omitted", () => {
  it("names the genre hits, the matched words and the community signals", () => {
    const [p] = pickQueue(input({ catalogue: [ca("a", { genres: ["Upmarket", "Literary Fiction"], mswlNotes: "family and memory", contributedByCount: 23, communityQueryCount: 14 })] }));
    const r = pickReasons(p, ms);
    expect(r.genreHits).toEqual(["Literary Fiction"]);
    expect(r.words).toEqual(expect.arrayContaining(["family", "memory"]));
    expect(communityLine(r)).toEqual({ lists: "23 writers’ contact lists", queried: "queried 14 times" });
  });
  it("a zero clause goes, and both zero means no line", () => {
    expect(communityLine({ lists: 3, queried: null })).toEqual({ lists: "3 writers’ contact lists", queried: null });
    expect(communityLine({ lists: null, queried: null })).toBeNull();
  });
});

describe("the header's tally", () => {
  it("counts the queue, added and live passes over the book's pool — and nothing for nothing", () => {
    const cat = [ca("a"), ca("b"), ca("c"), ca("crime", { genres: ["Crime"] })];
    const decisions: ScoutDecision[] = [
      { id: "a", decision: "added", at: "2026-10-01T00:00:00Z", manuscriptId: "m1" },
      { id: "b", decision: "passed", at: "2026-10-02T00:00:00Z", manuscriptId: "m1", until: new Date(NOW + DAY_MS).toISOString() },
      { id: "crime", decision: "added", at: "2026-10-02T00:00:00Z", manuscriptId: "m1" },
    ];
    const i = input({ catalogue: cat, decisions });
    const t = scoutTally(i, pickQueue(i));
    expect(t).toEqual({ toReview: 1, added: 1, passed: 1, decided: 2, total: 3, pct: 67 });
    expect(scoutTally(input(), []).pct).toBeNull();
  });
});

describe("decisions, passes and prefs", () => {
  it("a pass lasts a year; an add carries no until", () => {
    const p = decisionDoc("passed", NOW, "m1");
    expect(Date.parse(p.until!) - NOW).toBe(PASS_DAYS * DAY_MS);
    expect("until" in decisionDoc("added", NOW, "m1")).toBe(false);
    expect(passIsLive({ id: "x", ...p }, NOW)).toBe(true);
    expect(passIsLive({ id: "x", ...p }, NOW + PASS_DAYS * DAY_MS + 1)).toBe(false);
  });
  it("the passed list is the live passes, newest first", () => {
    const cat = [ca("old"), ca("new"), ca("gone")];
    const ds: ScoutDecision[] = [
      { id: "old", decision: "passed", at: "2026-09-01T00:00:00Z", manuscriptId: "m1", until: "2027-09-01T00:00:00Z" },
      { id: "new", decision: "passed", at: "2026-10-01T00:00:00Z", manuscriptId: "m1", until: "2027-10-01T00:00:00Z" },
      { id: "expired", decision: "passed", at: "2025-01-01T00:00:00Z", manuscriptId: "m1", until: "2026-01-01T00:00:00Z" },
    ];
    expect(passedList(ds, cat, NOW).map((r) => r.agent.id)).toEqual(["new", "old"]);
  });
  it("prefs read leniently and write one leaf", () => {
    expect(discoverPrefs(undefined)).toEqual(DISCOVER_PREFS_DEFAULT);
    expect(discoverPrefs({ lens: "nope", openOnly: "yes", ukIreland: true })).toEqual({ ...DISCOVER_PREFS_DEFAULT, ukIreland: true });
    expect(discoverPrefPath("lens", "fast")).toEqual({ "discoverPrefs.lens": "fast" });
  });
  it("verified means a parseable lastVerifiedDate", () => {
    expect(isVerified({ lastVerifiedDate: "2026-01-01" })).toBe(true);
    expect(isVerified({ lastVerifiedDate: "" })).toBe(false);
    expect(isVerified({ lastVerifiedDate: "soon" })).toBe(false);
  });
});

describe("your part — one partition of the list", () => {
  it("the same agent on the list and in the catalogue counts once, in the catalogue, even when shared", () => {
    const cat = [ca("c1", { name: "Eleanor Whitcombe", agency: "Marsh & Tide" })];
    const agents = [agent("e", { name: "Eleanor Whitcombe", agency: "Marsh & Tide" }), agent("w"), agent("n")];
    const p = yourPart(cat, agents, new Set(["e", "w"]));
    expect([p.inCatalogue, p.waiting, p.notShared]).toEqual([1, 1, 1]);
    expect(p.candidates.map((a) => a.id)).toEqual(["n"]);
    expect(p.inCatalogue + p.waiting + p.notShared).toBe(agents.length);
  });
  it("held map uses the fuzzy agency match", () => {
    expect(heldMap([ca("c", { name: "Priya Sandhu", agency: "Northlight Literary Agency" })], [agent("m", { name: "Priya Sandhu", agency: "Northlight Literary" })]).get("c")).toBe("m");
  });
});

describe("sharing sends public details only", () => {
  it("only SHARE_FIELDS (plus who and when) — never notes, ratings or queries", () => {
    const a = agent("s", {
      name: "Sam Ferrier", agency: "Larkspur", website: "larkspur.ie", genres: ["Literary Fiction"], mswlNotes: "fathers and sons",
      notes: "my private note", starRating: 5, email: "sam@larkspur.ie", responseTimeWeeks: 4, noResponseMeansNo: false,
    } as Partial<Agent>);
    const s = buildSubmission(a, "uid1", NOW);
    expect(Object.keys(s).sort()).toEqual(["agency", "createdAt", "genres", "mswlNotes", "name", "noResponseMeansNo", "responseTimeWeeks", "sourceAgentId", "userId", "website"]);
    for (const k of Object.keys(s)) expect([...SHARE_FIELDS, "userId", "sourceAgentId", "createdAt"]).toContain(k);
    expect(JSON.stringify(s)).not.toContain("private note");
    expect(submissionId("uid1", "s")).toBe("uid1_s");
  });
});

describe("catalogue figures are absent until a source exists", () => {
  it("every figure is null, and nothing counts as drawable", () => {
    const f = catalogueFigures();
    expect(Object.values(f).every((v) => v === null)).toBe(true);
    expect(hasAnyFigure(f)).toBe(false);
  });
});

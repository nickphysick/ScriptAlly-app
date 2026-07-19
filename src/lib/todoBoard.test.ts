import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query, Agent, Manuscript, UserTask, TaskFlag, Activity, ActivityType } from "../types";
import { assembleBoard, boardStreamForTaskType, todaySplit, ribbonTiles, offerDue, offerQuiet, terseDoneLabel, reminderDue, reviewWeek, weekReviewStats, reviewSeedCandidates, reviewSurface, reviewCompletionSnooze, BoardCard, BoardInput } from "./todoBoard";
import { taskSurvivesMute } from "./todoHousekeeping";

const TODAY = "2026-07-09";
const NOW = Date.parse("2026-07-09T12:00:00Z");

const task = (id: string, taskType: string, rid: string): Task =>
  ({ id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId: rid, taskType, actionLabel: "", actionPath: "queries" } as Task);
const query = (id: string, agentId: string, status: QueryStatus, over: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "m1", status, dateSent: "2026-05-01T00:00:00Z", ...over } as unknown as Query);
const agent = (id: string, name: string): Agent => ({ id, name, agency: "Agency" } as unknown as Agent);
const ms = (id: string, title: string): Manuscript => ({ id, title } as unknown as Manuscript);
const utask = (id: string, over: Partial<UserTask> = {}): UserTask =>
  ({ id, userId: "u", text: "Redraft opening", done: false, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z", ...over } as UserTask);

const base = (over: Partial<BoardInput> = {}): BoardInput => ({
  tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [ms("m1", "Lost Clockworks")], taskFlags: [], activities: [], today: TODAY, now: NOW, ...over,
});

describe("boardStreamForTaskType", () => {
  it("routes derived types to do / hk, excludes out-of-scope", () => {
    expect(boardStreamForTaskType("offer_received")).toBe("do");
    expect(boardStreamForTaskType("nudge_overdue")).toBe("do");
    expect(boardStreamForTaskType("data_quality_poor")).toBe("hk");
    expect(boardStreamForTaskType("no_response_close")).toBe("hk");
    expect(boardStreamForTaskType("querying_unstarted")).toBeNull();
    expect(boardStreamForTaskType("dream_agent_unqueried")).toBeNull();
  });
});

describe("assembleBoard — three lanes (no cleared lane)", () => {
  const input = base({
    tasks: [
      task("t-full", "full_requested", "q1"),
      task("t-offer", "offer_received", "q2"),
      task("t-dq", "data_quality_poor", "a3"),
      task("t-unstarted", "querying_unstarted", "m1"), // OUT — must not appear
    ],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.OFFER)],
    agents: [agent("a1", "Juliet Mushens"), agent("a2", "Ivor Penn"), agent("a3", "Rowan Blake")],
    userTasks: [utask("u1"), utask("u2", { done: true, completedAt: "2026-07-09T09:00:00Z" })],
  });

  it("exposes exactly three lanes + the cleared union (cleared is NOT a lane)", () => {
    const b = assembleBoard(input);
    expect(Object.keys(b).sort()).toEqual(["cleared", "do", "hk", "nt"]);
  });

  it("splits Do next / Housekeeping and excludes out-of-scope task types", () => {
    const b = assembleBoard(input);
    expect(b.do.map((c) => c.taskType).sort()).toEqual(["full_requested", "offer_received"]);
    expect(b.hk.map((c) => c.taskType)).toEqual(["data_quality_poor"]);
    expect(b.do.some((c) => c.taskType === "querying_unstarted")).toBe(false);
  });

  it("pins the Offer to the top of Do next", () => {
    expect(assembleBoard(input).do[0].taskType).toBe("offer_received");
  });

  it("Your tasks = open user tasks only (done ones move to the cleared union)", () => {
    const b = assembleBoard(input);
    expect(b.nt.map((c) => c.userTaskId)).toEqual(["u1"]);
    expect(b.cleared.some((c) => c.title === "Redraft opening")).toBe(true); // u2 done today
  });

  it("housekeeping card carries no status dot (hk glyph)", () => {
    const b = assembleBoard(input);
    expect(b.hk[0].hk).toBe(true);
    expect(b.hk[0].status).toBeUndefined();
  });
});

describe("assembleBoard — note snooze (the ⏸ stance suppresses, never deletes)", () => {
  it("a snoozed user_task flag hides the note; an expired one doesn't", () => {
    const snoozed: TaskFlag = { id: "f", userId: "u", taskType: "user_task", queryId: "u1", snoozeCount: 1, snoozedUntil: "2026-07-16T00:00:00Z" }; // future of NOW (9 Jul)
    const expired: TaskFlag = { id: "f2", userId: "u", taskType: "user_task", queryId: "u2", snoozeCount: 1, snoozedUntil: "2026-07-01T00:00:00Z" };
    const b = assembleBoard(base({ userTasks: [utask("u1"), utask("u2")], taskFlags: [snoozed, expired] }));
    expect(b.nt.map((c) => c.userTaskId)).toEqual(["u2"]); // u1 suppressed, u2 back
  });
});

describe("assembleBoard — commit state", () => {
  it("derived card is committed when a matching taskFlag has committedDate === today", () => {
    const flag: TaskFlag = { id: "f", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 0, committedDate: TODAY };
    const b = assembleBoard(base({ tasks: [task("t", "full_requested", "q1")], queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED)], agents: [agent("a1", "JM")], taskFlags: [flag] }));
    expect(b.do[0].committed).toBe(true);
  });
  it("user card is committed from its OWN committedDate", () => {
    const b = assembleBoard(base({ userTasks: [utask("u1", { committedDate: TODAY }), utask("u2", { committedDate: "2026-07-01" })] }));
    const byId = Object.fromEntries(b.nt.map((c) => [c.userTaskId, c.committed]));
    expect(byId["u1"]).toBe(true);
    expect(byId["u2"]).toBe(false);
  });
});

describe("assembleBoard — cleared union (feeds the done-band, not a lane)", () => {
  const clearedInput = base({
    userTasks: [utask("u1", { done: true, completedAt: "2026-07-09T08:00:00Z" })],
    activities: [
      { id: "act1", activityType: ActivityType.QUERY_SENT, date: "2026-07-09T10:00:00Z", queryId: "q1" } as Activity,
      { id: "act2", activityType: ActivityType.AGENT_ADDED, date: "2026-07-09T10:00:00Z" } as Activity, // not a clearing type
    ],
    queries: [query("q1", "a1", QueryStatus.QUERIED)],
    agents: [agent("a1", "JM")],
  });

  it("cleared = done-today tasks + today's clearing activities (one completion → one item)", () => {
    const b = assembleBoard(clearedInput);
    expect(b.cleared.length).toBe(2); // 1 done task + 1 clearing activity (AGENT_ADDED excluded)
  });

  it("cleared cards carry a whenMs and are newest-first", () => {
    const b = assembleBoard(clearedInput);
    expect(b.cleared.every((c) => typeof c.whenMs === "number")).toBe(true);
    const times = b.cleared.map((c) => c.whenMs as number);
    expect(times).toEqual([...times].sort((a, z) => z - a)); // descending
    expect(b.cleared[0].title).not.toBe("Redraft opening"); // 10:00 activity beats the 08:00 task
  });
});

describe("todaySplit — committed band (today only) vs done band (uncapped)", () => {
  const flagToday: TaskFlag = { id: "f1", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 0, committedDate: TODAY };
  const input = base({
    tasks: [task("t-full", "full_requested", "q1"), task("t-part", "partial_requested", "q2")],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.PARTIAL_REQUESTED)],
    agents: [agent("a1", "JM"), agent("a2", "IP")],
    userTasks: [
      utask("u-roll", { committedDate: "2026-07-01" }), // rolled over — NOT committed-today
      utask("u-today", { committedDate: TODAY }),
      utask("u-done", { done: true, completedAt: "2026-07-09T09:00:00Z" }), // done → in cleared, not committed
    ],
    taskFlags: [flagToday],
  });

  it("committed = committedDate === today only (excludes rolled-over + uncommitted)", () => {
    const b = assembleBoard(input);
    const split = todaySplit(b, TODAY);
    const ids = split.committed.map((c) => c.userTaskId ?? c.taskType).sort();
    expect(ids).toEqual(["full_requested", "u-today"]); // the today flag + the today user task
    expect(split.committed.some((c) => c.userTaskId === "u-roll")).toBe(false);
    expect(split.committed.some((c) => c.taskType === "partial_requested")).toBe(false); // uncommitted
  });

  it("done band = the cleared union; the two counts are independent", () => {
    const b = assembleBoard(input);
    const split = todaySplit(b, TODAY);
    expect(split.done).toBe(b.cleared);
    expect(split.done.length).toBe(1); // u-done
    expect(split.committed.length).toBe(2);
    expect(split.committed.length).not.toBe(split.done.length);
  });
});

describe("ribbonTiles — the header tiles mirror the lanes", () => {
  const input = base({
    tasks: [
      task("t-full", "full_requested", "q1"),
      task("t-offer", "offer_received", "q2"),
      task("t-dq", "data_quality_poor", "a3"),
    ],
    queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED), query("q2", "a2", QueryStatus.OFFER)],
    agents: [agent("a1", "JM"), agent("a2", "IP"), agent("a3", "RB")],
    userTasks: [utask("u1"), utask("u2")],
  });

  it("urgent + notes tile counts equal their lane counts", () => {
    const b = assembleBoard(input);
    const tiles = ribbonTiles(b, 7);
    expect(tiles.urgent).toBe(b.do.length); // 2
    expect(tiles.notes).toBe(b.nt.length); // 2
  });

  it("housekeeping tile is the GAP count passed through (gaps, not piles)", () => {
    const b = assembleBoard(input);
    expect(ribbonTiles(b, 7).housekeeping).toBe(7);
    expect(ribbonTiles(b, 0).housekeeping).toBe(0);
  });
});

describe("offer card — quiet/wake + the reply-by countdown (journey-logic P4)", () => {
  const DAY = 86400000;

  it("offerDue counts down to reply-by; unset → the plain OFFER chip (no invented default)", () => {
    expect(offerDue(null, NOW)).toBe("OFFER");
    expect(offerDue(NaN, NOW)).toBe("OFFER");
    expect(offerDue(NOW + 14 * DAY, NOW)).toBe("OFFER · 14 DAYS TO REPLY");
    expect(offerDue(NOW + 1 * DAY, NOW)).toBe("OFFER · 1 DAY TO REPLY");
    expect(offerDue(NOW - DAY, NOW)).toBe("OFFER · REPLY-BY PASSED");
  });

  it("offerQuiet: quiet before the reminder, woken once it passes", () => {
    const remind = new Date(NOW + 3 * DAY).toISOString();
    expect(offerQuiet(remind, NOW + 14 * DAY, NOW)).toBe(true);
    expect(offerQuiet(remind, NOW + 14 * DAY, NOW + 3 * DAY)).toBe(false); // the reminder day arrives
    expect(offerQuiet(undefined, NOW + 14 * DAY, NOW)).toBe(false); // no reminder set → never quiet
  });

  it("offerQuiet: reply-by arriving FIRST wakes it regardless of the reminder", () => {
    const remind = new Date(NOW + 10 * DAY).toISOString();
    expect(offerQuiet(remind, NOW + 2 * DAY, NOW + 2 * DAY)).toBe(false);
    expect(offerQuiet(remind, null, NOW)).toBe(true); // no reply-by → the reminder alone governs
  });

  it("an assembled offer card carries quiet + the countdown due; other cards never get quiet", () => {
    const offerQ = query("qo", "a1", QueryStatus.OFFER, { responseDeadline: new Date(NOW + 14 * DAY).toISOString() });
    const flagged: BoardInput = {
      tasks: [task("t-offer", "offer_received", "qo")],
      userTasks: [],
      queries: [offerQ],
      agents: [agent("a1", "Tom Ellery")],
      manuscripts: [],
      taskFlags: [{ id: "f1", userId: "u", taskType: "offer_received", queryId: "qo", snoozedUntil: new Date(NOW + 5 * DAY).toISOString() } as unknown as import("../types").TaskFlag],
      activities: [],
      today: TODAY,
      now: NOW,
    };
    const b = assembleBoard(flagged);
    const card = b.do.find((c) => c.taskType === "offer_received")!;
    expect(card.quiet).toBe(true);
    expect(card.due).toBe("OFFER · 14 DAYS TO REPLY");
    expect(card.warn).toBe(true); // urgency never drops while quiet
    // woken: same board a week later
    const woken = assembleBoard({ ...flagged, now: NOW + 6 * DAY });
    expect(woken.do.find((c) => c.taskType === "offer_received")!.quiet).toBe(false);
  });
});

describe("terseDoneLabel — done rows use the committed rows' vocabulary, never celebration copy (popup P1)", () => {
  const a = (activityType: ActivityType, over: Partial<Activity> = {}) =>
    ({ activityType, description: "", ...over } as Pick<Activity, "activityType" | "description" | "resultingStatus">);

  it("sends read terse — full / partial / resubmit", () => {
    expect(terseDoneLabel(a(ActivityType.MATERIALS_SENT, { resultingStatus: QueryStatus.FULL_SENT, description: "Full manuscript sent to X" }), "Daniel O’Rourke")).toBe("Full sent to Daniel O’Rourke");
    expect(terseDoneLabel(a(ActivityType.MATERIALS_SENT, { resultingStatus: QueryStatus.PARTIAL_SENT }), "Priya Raman")).toBe("Partial sent to Priya Raman");
    expect(terseDoneLabel(a(ActivityType.MATERIALS_SENT, { resultingStatus: QueryStatus.FULL_SENT, description: "Revised manuscript (v2) resubmitted to X" }), "Tom")).toBe("Resubmitted to Tom");
  });

  it("the old offer path's celebration description maps to the pending form — never printed verbatim", () => {
    const celebration = "Congratulations! You've received an offer of representation from Tom Ellery at Curtis Vane!";
    expect(terseDoneLabel(a(ActivityType.STATUS_CHANGED, { description: celebration, resultingStatus: QueryStatus.OFFER }), "Tom Ellery")).toBe("Tom Ellery’s offer — decision pending");
    // even without the resultingStatus, the description pattern alone maps (the activityUtils regex, one source)
    expect(terseDoneLabel(a(ActivityType.STATUS_CHANGED, { description: celebration }), "Tom Ellery")).toBe("Tom Ellery’s offer — decision pending");
  });

  it("decisions, nudges, closes", () => {
    expect(terseDoneLabel(a(ActivityType.OFFER_ACCEPTED), "Tom")).toBe("Accepted Tom’s offer");
    expect(terseDoneLabel(a(ActivityType.OFFER_DECLINED), "Tom")).toBe("Declined Tom’s offer");
    expect(terseDoneLabel(a(ActivityType.NUDGE_SENT), "Jonathan Marsh")).toBe("Nudged Jonathan Marsh");
    expect(terseDoneLabel(a(ActivityType.STATUS_CHANGED, { resultingStatus: QueryStatus.NO_RESPONSE }), "Marcus")).toBe("Closed Marcus — no response");
    expect(terseDoneLabel(a(ActivityType.STATUS_CHANGED, { resultingStatus: QueryStatus.WITHDRAWN }), "Marcus")).toBe("Withdrew from Marcus");
  });

  it("unknown shapes fall back to the description; agent-less rows soften", () => {
    expect(terseDoneLabel(a(ActivityType.AGENT_UPDATED, { description: "You updated details for X" }))).toBe("You updated details for X");
    expect(terseDoneLabel(a(ActivityType.NUDGE_SENT))).toBe("Nudged the agent");
  });
});

describe("linked reminders — the approved P2 derivation clause (agentId + queryId + dueDate → Urgent)", () => {
  const DAY = 86400000;
  const mkTask = (id: string, over: Partial<UserTask>): UserTask =>
    ({ id, userId: "u", text: "Tell Daniel about the offer", done: false, createdAt: "2026-07-09T09:00:00Z", updatedAt: "2026-07-09T09:00:00Z", ...over } as UserTask);
  const base: BoardInput = { tasks: [], userTasks: [], queries: [], agents: [agent("a1", "Daniel")], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: NOW };

  it("all three links present → the do lane with the deadline chip; anything less stays a note", () => {
    const due = new Date(NOW + 5 * DAY).toISOString().slice(0, 10);
    const b = assembleBoard({ ...base, userTasks: [
      mkTask("full", { agentId: "a1", queryId: "qo", dueDate: due }),
      mkTask("no-due", { agentId: "a1", queryId: "qo" }),
      mkTask("no-agent", { queryId: "qo", dueDate: due }),
      mkTask("plain", {}),
    ] });
    expect(b.do.map((c) => c.key)).toEqual(["full"]);
    expect(b.nt.map((c) => c.key).sort()).toEqual(["no-agent", "no-due", "plain"]);
    expect(b.do[0].due).toBe("5 DAYS TO DEADLINE");
    expect(b.do[0].userTaskId).toBe("full"); // still ticks off like any user task
  });

  it("reminderDue: countdown, warn inside 3 days, today, passed", () => {
    const ymd = (d: number) => new Date(NOW + d * DAY).toISOString().slice(0, 10);
    expect(reminderDue(ymd(5), NOW)).toEqual({ label: "5 DAYS TO DEADLINE", warn: false });
    expect(reminderDue(ymd(2), NOW)).toEqual({ label: "2 DAYS TO DEADLINE", warn: true });
    expect(reminderDue(ymd(0), NOW)).toEqual({ label: "DEADLINE TODAY", warn: true });
    expect(reminderDue(ymd(-1), NOW)).toEqual({ label: "DEADLINE PASSED", warn: true });
  });
});

describe("the Sunday review — pure derivations (finishing P3)", () => {
  const SUN = Date.parse("2026-07-19T12:00:00Z"); // a Sunday
  const MON = Date.parse("2026-07-20T09:00:00Z");
  const TUE = Date.parse("2026-07-21T09:00:00Z");
  const act = (id: string, type: ActivityType, date: string, queryId: string, rs?: QueryStatus): Activity =>
    ({ id, userId: "u", queryId, manuscriptId: "m1", activityType: type, description: "", date, details: "", ...(rs ? { resultingStatus: rs } : {}) } as Activity);
  const rvAgent = (id: string, name: string, over: Partial<Agent> = {}): Agent =>
    ({ id, name, agency: `${name} Lit`, responseTimeWeeks: 8, noResponseMeansNo: true, ...over } as unknown as Agent);

  it("reviewWeek keys the most recent COMPLETED week on EVERY weekday (the demotion pack's recon fix)", () => {
    const qs = [query("q1", "a1", QueryStatus.QUERIED, { dateSent: "2026-07-01T10:00:00Z" })];
    const sun = reviewWeek(qs, SUN);
    expect(new Date(sun.startMs).getDay()).toBe(1); // an ISO Monday
    expect(sun.endMs - sun.startMs).toBe(7 * 86400000);
    expect(sun.weekNumber).toBe(3); // sent w/c 29 Jun → reviewing w/c 13 Jul = week three
    // Monday THROUGH Saturday all key the week that ended the previous Sunday — never the running week
    for (const d of [MON, TUE, Date.parse("2026-07-24T12:00:00Z"), Date.parse("2026-07-25T12:00:00Z")]) {
      expect(reviewWeek(qs, d).key).toBe(sun.key);
    }
    // and the NEXT Sunday supersedes with the next week's key
    expect(reviewWeek(qs, Date.parse("2026-07-26T12:00:00Z")).key).not.toBe(sun.key);
  });

  it("weekReviewStats: log-windowed sent/back/offers; newly-quiet = crossed the threshold IN the window", () => {
    const win = reviewWeek([], SUN);
    const midWinCross = new Date(win.startMs - 64 * 86400000).toISOString(); // close threshold (70d) lands mid-window
    const longStale = new Date(win.startMs - 200 * 86400000).toISOString(); // stale long before the window
    const input = {
      activities: [
        act("s1", ActivityType.MATERIALS_SENT, new Date(win.startMs + 86400000).toISOString(), "qs", QueryStatus.FULL_SENT),
        act("s2", ActivityType.QUERY_SENT, new Date(win.startMs - 3 * 86400000).toISOString(), "qs"), // out of window
        act("b1", ActivityType.STATUS_CHANGED, new Date(win.startMs + 4 * 86400000).toISOString(), "qo", QueryStatus.OFFER),
      ],
      queries: [
        query("qs", "a1", QueryStatus.FULL_SENT, { dateSent: longStale }),
        query("qo", "a1", QueryStatus.OFFER, { responseDeadline: "2026-07-31T11:00:00Z" }),
        query("qq", "a1", QueryStatus.QUERIED, { dateSent: midWinCross }),
        query("qold", "a1", QueryStatus.QUERIED, { dateSent: longStale }),
      ],
      agents: [rvAgent("a1", "Tom Ellery")],
    };
    const stats = weekReviewStats(input, win);
    expect(stats.sent.length).toBe(1);
    expect(stats.sent[0].badge).toBe("FULL");
    expect(stats.sent[0].label).toBe("Full sent to Tom Ellery");
    expect(stats.back.length).toBe(1);
    expect(stats.back[0].star).toBe(true);
    expect(stats.back[0].meta).toContain("REPLY BY 31 JUL");
    expect(stats.offers).toBe(1);
    expect(stats.quiet.map((r) => r.queryId)).toEqual(["qq"]); // the mid-window crosser ONLY — never the backlog
  });

  it("III P1 — reviewSurface: the window matrix (banner Sun–Mon undismissed · bar after/dismissed · null reviewed)", () => {
    const q1 = [query("q1", "a1", QueryStatus.QUERIED, { dateSent: "2026-07-01T10:00:00Z" })];
    const FRI = Date.parse("2026-07-24T12:00:00Z");
    const io = (now: number, over: Partial<BoardInput> = {}): BoardInput =>
      ({ tasks: [], userTasks: [], queries: q1, agents: [], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now, ...over });
    // Sun + Mon, undismissed → the BANNER
    expect(reviewSurface(io(SUN))!.kind).toBe("banner");
    expect(reviewSurface(io(MON))!.kind).toBe("banner");
    // Tue–Sat → the BAR (dismissed or not)
    for (const d of ["2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25"]) {
      expect(reviewSurface(io(Date.parse(`${d}T12:00:00Z`)))!.kind).toBe("bar");
    }
    // Sunday + dismissed (a non-sentinel snooze) → the BAR (dismissal gates the banner only)
    const win = reviewWeek(q1, SUN);
    const dismissed = [{ id: "f", userId: "u", taskType: "weekly_review", queryId: win.key, snoozeCount: 0, snoozedUntil: new Date(SUN + 3 * 86400000).toISOString() } as unknown as TaskFlag];
    expect(reviewSurface(io(SUN, { taskFlags: dismissed }))!.kind).toBe("bar");
    // the sunday_review mute suppresses the banner like a standing dismissal (the bar stands)
    expect(reviewSurface(io(SUN, { mutedTaskRules: ["sunday_review"] }))!.kind).toBe("bar");
    // REVIEWED (the completion sentinel) → neither, any day
    const done = [{ id: "f", userId: "u", taskType: "weekly_review", queryId: win.key, snoozeCount: 0, snoozedUntil: reviewCompletionSnooze(win) } as unknown as TaskFlag];
    expect(reviewSurface(io(SUN, { taskFlags: done }))).toBeNull();
    expect(reviewSurface(io(FRI, { taskFlags: done }))).toBeNull();
    // nothing queried → nothing to review; the next Sunday supersedes with a fresh banner
    expect(reviewSurface(io(SUN, { queries: [] }))).toBeNull();
    expect(reviewSurface(io(Date.parse("2026-07-26T12:00:00Z"), { taskFlags: done }))!.kind).toBe("banner");
    // the sentinel is single-sourced with finishReview
    expect(reviewCompletionSnooze(win)).toBe(new Date(win.endMs + 2 * 86400000).toISOString());
  });

  it("III P1 — the review is NOT a task: assembleBoard emits no weekly_review card even on Sunday (by construction)", () => {
    const base: BoardInput = { tasks: [], userTasks: [], queries: [query("q1", "a1", QueryStatus.QUERIED, { dateSent: "2026-07-01T10:00:00Z" })], agents: [], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: SUN };
    const b = assembleBoard(base);
    expect(b.do.some((x) => x.taskType === "weekly_review")).toBe(false);
    expect(b.hk.some((x) => x.taskType === "weekly_review")).toBe(false);
    // the counts every surface reads (tiles/filters/focus) derive from this same board — review-free for free
    expect(ribbonTiles(b, 0).urgent).toBe(b.do.length);
  });

  it("seed candidates: dated pre-ticked (offer window + linked reminders), undated offered, review excluded, capped at 5", () => {
    const card = (over: Partial<BoardCard>): BoardCard =>
      ({ key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, ...over } as BoardCard);
    const NOW = Date.parse("2026-07-19T12:00:00Z");
    const cards = [
      card({ key: "rv", taskType: "weekly_review" }),
      card({ key: "offer", taskType: "offer_received", relatedRecordId: "qo", who: "Tom" }),
      card({ key: "rem", userTaskId: "u1", title: "Tell Priya Raman about the offer", due: "3 DAYS TO DEADLINE" }),
      card({ key: "full", taskType: "full_requested", relatedRecordId: "q2", title: "Send your full to Marsh", due: "OVER TO YOU" }),
      card({ key: "n1", taskType: "nudge_overdue", relatedRecordId: "q3", title: "Nudge A", due: "90 DAYS · NO REPLY" }),
      card({ key: "n2", taskType: "nudge_overdue", relatedRecordId: "q4", title: "Nudge B", due: "91 DAYS · NO REPLY" }),
      card({ key: "n3", taskType: "nudge_overdue", relatedRecordId: "q5", title: "Nudge C", due: "92 DAYS · NO REPLY" }),
    ];
    const qs = [query("qo", "a1", QueryStatus.OFFER, { responseDeadline: new Date(NOW + 9 * 86400000).toISOString() })];
    const out = reviewSeedCandidates(cards, qs, NOW);
    expect(out.length).toBe(5); // capped
    expect(out.map((c) => c.key)).toEqual(["offer", "rem", "full", "n1", "n2"]); // dated first, review excluded
    expect(out[0]).toMatchObject({ label: "Reply to Tom’s offer", meta: "9 DAYS LEFT ON THE WINDOW", preTicked: true });
    expect(out[1]).toMatchObject({ meta: "REMINDER · 3 DAYS TO DEADLINE", preTicked: true });
    expect(out[2].preTicked).toBe(false);
  });
});

describe("Task Settings — sunday_review gates the BANNER only (III P1; the bar is exempt like the scrap was)", () => {
  const q1 = [query("q1", "a1", QueryStatus.QUERIED, { dateSent: "2026-07-01T10:00:00Z" })];
  const SUN = Date.parse("2026-07-19T12:00:00Z");
  const FRI = Date.parse("2026-07-24T12:00:00Z");
  const io = (now: number, muted?: string[]): BoardInput =>
    ({ tasks: [], userTasks: [], queries: q1, agents: [], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now, ...(muted ? { mutedTaskRules: muted } : {}) });

  it("sunday_review off → the Sunday banner falls to the bar; on → the banner returns", () => {
    expect(reviewSurface(io(SUN, ["sunday_review"]))!.kind).toBe("bar");
    expect(reviewSurface(io(SUN))!.kind).toBe("banner");
  });
  it("the bar IGNORES sunday_review — the offer still stands Tue–Sat when the prompt is switched off", () => {
    expect(reviewSurface(io(FRI, ["sunday_review"]))!.kind).toBe("bar");
    expect(reviewSurface(io(FRI, ["sunday_review"]))!.weekNumber).toBe(reviewWeek(q1, FRI).weekNumber);
  });
});

describe("Task Settings — the send key propagates from the ONE suppression point (v2 realignment)", () => {
  const baseInput = (tasks: import("../types").Task[]): BoardInput =>
    ({ tasks, userTasks: [], queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED)], agents: [agent("a1", "Daniel")], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: NOW });

  it("'Your turn to send' off → the send task is filtered at taskSurvivesMute, so it's absent from board.do, the Urgent count and the Focus count", () => {
    const sendTask = task("t-send", "full_requested", "q1");
    // mirror the engine's activeTasks filter (db.tsx) — the ONE point board/counts/dashboard/sublabel derive through
    const filtered = [sendTask].filter((t) => taskSurvivesMute(t.taskType, undefined, ["send"]));
    expect(filtered).toEqual([]); // gated at the single predicate

    const b = assembleBoard(baseInput(filtered));
    expect(b.do.some((c) => c.taskType === "full_requested")).toBe(false); // absent from the board
    const tiles = ribbonTiles(b, 0);
    expect(tiles.urgent).toBe(0); // absent from the Urgent post-it count
    expect(tiles.urgent).toBe(0); // absent from the Focus card's Begin count (the same tiles source)
    // the dashboard reads the SAME filtered `tasks` (buildOverToYouRows(tasks)) — excluded by construction

    // switched ON, the same task survives and lands on the board
    const on = [sendTask].filter((t) => taskSurvivesMute(t.taskType, undefined, []));
    expect(assembleBoard(baseInput(on)).do.some((c) => c.taskType === "full_requested")).toBe(true);
  });
});

describe("II·B P4 — stale titles always carry the duration", () => {
  it("a stale card's title reads '{name} silent for {n} days' (the ambient day count; stale tasks always have a dateSent)", () => {
    const NOW = Date.parse("2026-07-19T12:00:00Z");
    const sent = new Date(NOW - 100 * 86400000).toISOString();
    const board = assembleBoard({
      tasks: [{ id: "task-no-res-close-q1", priority: "suggested", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId: "q1", taskType: "no_response_close", actionLabel: "", actionPath: "" }],
      userTasks: [], taskFlags: [], activities: [],
      queries: [{ id: "q1", agentId: "a1", manuscriptId: "m1", status: "Queried", dateSent: sent } as never],
      agents: [{ id: "a1", name: "Marcus Reed", agency: "Bloomsbury" } as never],
      manuscripts: [], today: "2026-07-19", now: NOW,
    } as never);
    expect(board.hk).toHaveLength(1);
    expect(board.hk[0].title).toBe("Marcus Reed silent for 100 days");
  });
});

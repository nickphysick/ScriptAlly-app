import { describe, it, expect } from "vitest";
import { QueryStatus, Task, Query, Agent, Manuscript, UserTask, TaskFlag, Activity, ActivityType } from "../types";
import { assembleBoard, boardStreamForTaskType, todaySplit, ribbonTiles, offerDue, offerQuiet, terseDoneLabel, reminderDue, reviewWeek, weekReviewStats, reviewSeedCandidates, reviewCompletionSnooze, BoardCard, BoardInput } from "./todoBoard";
import { taskSurvivesMute } from "./todoHousekeeping";
import { todoCounts } from "./todoCount";

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

  /* ⚠️ AMENDED (corrections fix 4): unset now yields "", not "OFFER". The right band lane's only
     job is WHEN; the KIND lane already says OFFER, and returning "OFFER" here printed the word
     twice — "OFFER · OFFER" on the live board. Saying nothing when there is no date is the
     honest form of "no invented default", which is what this case was always protecting. */
  it("offerDue counts down to reply-by; unset → NOTHING (the kind lane already says OFFER)", () => {
    expect(offerDue(null, NOW)).toBe("");
    expect(offerDue(NaN, NOW)).toBe("");
    expect(offerDue(NOW + 14 * DAY, NOW)).toBe("14 DAYS TO REPLY");
    expect(offerDue(NOW + 1 * DAY, NOW)).toBe("1 DAY TO REPLY");
    expect(offerDue(NOW - DAY, NOW)).toBe("REPLY-BY PASSED");
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
    expect(card.due).toBe("14 DAYS TO REPLY");
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

describe("the two natures — a task promotes by DUE STATE (notes-and-tasks P3; supersedes the linked-reminder clause)", () => {
  const DAY = 86400000;
  const mkTask = (id: string, over: Partial<UserTask>): UserTask =>
    ({ id, userId: "u", text: "Tell Daniel about the offer", done: false, createdAt: "2026-07-09T09:00:00Z", updatedAt: "2026-07-09T09:00:00Z", ...over } as UserTask);
  const base: BoardInput = { tasks: [], userTasks: [], queries: [], agents: [agent("a1", "Daniel")], manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: NOW };

  it("a due/overdue task → the Urgent (do) lane; a future task or a dateless note → Notes (nt) — derived by the clock", () => {
    const future = new Date(NOW + 5 * DAY).toISOString().slice(0, 10);
    const past = new Date(NOW - 2 * DAY).toISOString().slice(0, 10);
    const b = assembleBoard({ ...base, userTasks: [
      mkTask("today", { dueDate: TODAY }),       // due today → promoted to Urgent
      mkTask("overdue", { dueDate: past }),      // overdue → stays promoted
      mkTask("future", { dueDate: future }),     // dated but not yet due → a task in Notes
      mkTask("note", {}),                        // dateless → a note in Notes
    ] });
    expect(b.do.map((c) => c.key).sort()).toEqual(["overdue", "today"]);
    expect(b.nt.map((c) => c.key).sort()).toEqual(["future", "note"]);
    const byKey = (k: string) => [...b.do, ...b.nt].find((c) => c.key === k)!;
    expect(byKey("note").nature).toBe("note");
    expect(byKey("future").nature).toBe("task");
    expect(byKey("future").dueState).toBe("future");
    expect(byKey("today").dueState).toBe("today");
    expect(byKey("overdue").dueState).toBe("overdue");
    expect(byKey("today").userTaskId).toBe("today"); // still ticks off like any user task
  });

  it("reminderDue: countdown, warn inside 3 days, today, passed", () => {
    const ymd = (d: number) => new Date(NOW + d * DAY).toISOString().slice(0, 10);
    expect(reminderDue(ymd(5), NOW)).toEqual({ label: "5 DAYS TO DEADLINE", warn: false });
    expect(reminderDue(ymd(2), NOW)).toEqual({ label: "2 DAYS TO DEADLINE", warn: true });
    expect(reminderDue(ymd(0), NOW)).toEqual({ label: "DEADLINE TODAY", warn: true });
    expect(reminderDue(ymd(-1), NOW)).toEqual({ label: "DEADLINE PASSED", warn: true });
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

/* ═══════ THE VISIBLE DATA BUGS, AT THEIR CAUSE (workspace P0B) ═══════════════════════════════
   Three of the four faults the live board showed are derivations, not templates, so they are
   locked here. (The fourth — the unguarded KIND pill — is a render guard, locked in
   todoWorkspaceP0B.test.ts against the source.) */

describe("the done band — one completion is one row, not one per record it wrote", () => {
  it("a close that logged an activity AND resolved its flag appears ONCE", () => {
    const board = assembleBoard(base({
      queries: [query("q1", "a1", QueryStatus.NO_RESPONSE)],
      agents: [agent("a1", "Marcus Reed")],
      activities: [
        { id: "act1", queryId: "q1", activityType: ActivityType.STATUS_CHANGED, date: "2026-07-09T09:00:00Z", resultingStatus: QueryStatus.NO_RESPONSE, description: "" } as unknown as Activity,
      ],
      taskFlags: [{ id: "f1", userId: "u", taskType: "no_response_close", queryId: "q1", snoozeCount: 0, resolvedAt: "2026-07-09T09:00:01Z" } as TaskFlag],
    }));
    expect(board.cleared).toHaveLength(1);
    // …and it is the ACTIVITY that survives, because it says what happened.
    expect(board.cleared[0].title).toBe("Closed Marcus Reed — no response");
    // The agent's name appears exactly once across the whole band.
    expect(board.cleared.filter((c) => c.title.includes("Marcus Reed"))).toHaveLength(1);
  });
});

describe("no card states a value it does not have", () => {
  it("every assembled card's KIND is a non-empty string or absent — never an empty pill", () => {
    const board = assembleBoard(base({
      tasks: [
        task("t1", "offer_received", "q1"), task("t2", "partial_requested", "q2"),
        task("t3", "full_requested", "q3"), task("t4", "revise_resubmit", "q4"),
        task("t5", "nudge_overdue", "q5"), task("t6", "no_response_close", "q6"),
        task("t7", "data_quality_poor", "a1"),
      ],
      queries: [
        query("q1", "a1", QueryStatus.OFFER), query("q2", "a1", QueryStatus.PARTIAL_REQUESTED),
        query("q3", "a1", QueryStatus.FULL_REQUESTED), query("q4", "a1", QueryStatus.REVISE_RESUBMIT),
        query("q5", "a1", QueryStatus.QUERIED), query("q6", "a1", QueryStatus.QUERIED),
      ],
      agents: [agent("a1", "Marcus Reed")],
      userTasks: [utask("u1"), utask("u2", { dueDate: TODAY })],
    }));
    for (const c of [...board.do, ...board.hk, ...board.nt]) {
      expect(c.kind, `card ${c.key} has an empty kind`).toBeTruthy();
      expect(String(c.kind)).not.toContain("undefined");
    }
    // THE CAUSE, pinned by value: derivedCopy computed these all along and derivedCard dropped
    // them, so every derived card arrived with kind undefined. Asserting the facets themselves
    // (not merely "truthy") means a silent return to the dropped-in-transit state cannot pass.
    const kindOf = (key: string) =>
      [...board.do, ...board.hk].find((c) => c.key === key)?.kind;
    expect(kindOf("t1")).toBe("OFFER");
    expect(kindOf("t2")).toBe("AGENT WAITING");
    expect(kindOf("t5")).toBe("AGENT WAITING");
    expect(kindOf("t6")).toBe("STALE");
    expect(kindOf("t7")).toBeTruthy(); // the data-quality facet varies with the gap
  });

  it("no card's rendered copy contains the literal 'undefined', even for a nameless agency-only agent", () => {
    const board = assembleBoard(base({
      tasks: [task("t1", "no_response_close", "q1"), task("t2", "data_quality_poor", "a1")],
      queries: [query("q1", "a1", QueryStatus.QUERIED)],
      // name OR agency — the agency-only record the display helpers exist for
      agents: [{ id: "a1", name: "", agency: "Reed Literary" } as unknown as Agent],
    }));
    for (const c of [...board.do, ...board.hk]) {
      for (const field of [c.title, c.subtitle, c.due, c.kind ?? "", c.record, c.who]) {
        expect(field).not.toContain("undefined");
      }
      expect(c.title.trim()).not.toMatch(/[:—]$/); // no dangling label with nothing after it
    }
  });
});

/* ═══════ THE COUNTING LAW, END TO END (port plan, charter item 3) ═════════════════════════
   The law's own suite (todoWorkspace.test.ts) exercises `todoCounts` against HAND-BUILT board
   objects, which proves the sum but not its premise. The premise is that the ASSEMBLER promotes
   a due-today task into the urgent lane — and if that ever stopped being true, those tests would
   all still pass while the badge quietly went wrong. So this one runs the real assembler. */
describe("the counting law, through assembleBoard rather than a hand-built board", () => {
  const promoted = assembleBoard(base({ userTasks: [utask("k", { dueDate: TODAY })] }));

  it("the fixture really does promote — the anchor the sum-only tests cannot state", () => {
    expect(promoted.do, "a task dated today belongs in the urgent lane").toHaveLength(1);
    expect(promoted.nt, "…and therefore not in the notes lane").toHaveLength(0);
  });

  it("so it is counted ONCE, not once per lane it could have been in", () => {
    expect(todoCounts(promoted, 0, 0).actionable).toBe(1);
  });

  it("a mixed desk: notes out, future tasks in, the promoted one counted once", () => {
    const mixed = assembleBoard(base({
      userTasks: [
        utask("n1"), utask("n2"),                 // notes — excluded
        utask("f1", { dueDate: "2026-12-01" }),   // future task — counted
        utask("p1", { dueDate: TODAY }),          // promoted — counted once
      ],
    }));
    const c = todoCounts(mixed, 3, 0);
    expect(c.notes).toBe(2);
    expect(c.actionable).toBe(1 /* do */ + 3 /* gaps */ + 1 /* future task */);
  });
});

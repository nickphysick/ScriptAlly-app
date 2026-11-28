/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v2 (re-pointed from v1, whose one-sentence step, fold and after-pick timeline v2 replaces) — THE NUDGE
 * DESK: it's overdue; send it yourself and confirm; tell us when. The workspace is rendered with a nudge task open (the
 * store mocked), and the flow is built as the desk builds it (`buildFlow`) to check the steps' gating and what Log it saves.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import { forgetTodoTask, rememberTodoTask, todoTaskScope } from "../../../lib/todoArrival";
import { agoWords, calendarShift, needsCompact, nudgeAnswers, nudgeDayWord, nudgeFacts, nudgeTimeline } from "../../../lib/todoNudgeDesk";
import { addDays, offWeekend } from "../../../lib/queryActions/dates";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const agent = (id: string, name: string, extra: Partial<Agent> = {}): Agent => ({ id, userId: "u1", name, agency: "Foxglove Literary", status: "Active", createdAt: iso(-200), updatedAt: iso(-200), ...extra } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);
const seed: { tasks: Task[]; queries: Query[]; agents: Agent[] } = { tasks: [], queries: [], agents: [] };

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true, tasksReady: true, tasksReadFailed: false,
    tasks: seed.tasks, userTasks: [], queries: seed.queries, agents: seed.agents, manuscripts: [{ id: "m1", userId: "u1", title: "The Marsh" }], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";
import { buildFlow, type Answers } from "./wsFlows";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const WILL = () => { seed.agents = [agent("a3", "William Fox", { responseTimeWeeks: 8 } as Partial<Agent>)]; seed.queries = [query("q3", "a3", QueryStatus.QUERIED)]; seed.tasks = [task("t3", "nudge_overdue", "q3")]; };
const openNudge = () => {
  const k = /data-tws-row="([^"]+)"[^>]*data-kind="nudge"/.exec(render())?.[1] ?? null;
  expect(k).not.toBeNull();
  rememberTodoTask(todoTaskScope("u1", "m1"), k);
  return render();
};
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; forgetTodoTask(); });

describe("the nudge desk renders: overdue, then the two steps", () => {
  it("the hawk beside the headline (no bubble), step 1 open with I've sent it, step 2 locked, Log it disabled and on the right", () => {
    WILL();
    const html = openNudge();
    const desk = html.slice(html.indexOf('data-tws="desk"'));
    expect(desk).toMatch(/data-twn="context"><img src="\/images\/todo\/mentor\.webp" alt=""\/><div><h2>William’s reply is <em>overdue<\/em>\.<\/h2><p>Send a nudge, then log it below\.<\/p>/);
    expect(desk, "no speech bubble on the nudge desk").not.toContain("tws-mnote");
    expect(desk).toMatch(/data-st="on" data-twn-step="send"/);
    expect(desk).toMatch(/<b>Send William a nudge<button type="button" class="twn2-info" data-twn="info" aria-label="How to send it" aria-describedby="(twn2-how-[\w-]+)">i<\/button><\/b>/);
    const howId = /aria-describedby="(twn2-how-[\w-]+)"/.exec(desk)![1];
    expect(desk, "the how-to line is the info mark's description").toContain(`<small id="${howId}" class="twn2-how" data-twn="how" role="note">From your own email, the way you sent the query: a short note asking if it reached them.</small>`);
    expect(desk).toMatch(/class="sp-btn sp-btn--line twn2-sent" data-twn="sent" aria-pressed="false">I’ve sent it</);
    expect(desk).toMatch(/data-st="off" data-twn-step="when" aria-disabled="true"/);
    const ans = [...desk.matchAll(/data-twn-when="(\w+)"[^>]*? disabled="" tabindex="-1"><span class="twn2-ic">[\s\S]*?<\/span><b>([^<]+)<\/b><small>([^<]+)<\/small>/g)].map((m) => `${m[1]}|${m[2]}`);
    expect(ans).toEqual(["today|Today", "yesterday|Yesterday", "other|Another day"]);
    expect(desk, "v1's sentence is gone").not.toContain("I nudged William");
    expect(desk, "v1's quiet line is gone").not.toContain("It goes on");
    const foot = /data-tws="footer"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
    expect(foot).toContain('data-twn-foot=""');
    expect(foot).toMatch(/data-log="" disabled="">Log it</);
  });
});

describe("the steps' gating (logic)", () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const q = query("q3", "a3", QueryStatus.QUERIED);
  const a = agent("a3", "William Fox", { responseTimeWeeks: 8 } as Partial<Agent>);
  const t = { key: "t3", kind: "nudge", group: "nudge", title: "Nudge William", first: "William", agentName: "William Fox", agency: "Foxglove Literary", query: q, agent: a, dueDays: -10, quietDays: null, type: null, hay: "", item: {} } as never;
  const flowFor = (A: Answers, set: (p: Answers) => void = () => {}) => buildFlow({
    t, A, set, today, uid: null, userFirst: "Nick", queries: [q], agents: [a], manuscripts: [], db: {} as never, snoozeFor: async () => null, waitCeiling: 30, said: () => {}, nudgedOn: null, suggestion: null,
  } as never, { openPartial: () => {}, openCard: () => {}, openOther: null });
  it("step 2 is locked until step 1 is confirmed: a pick before it does nothing", () => {
    const got: Answers[] = [];
    const nd = flowFor({}, (p) => got.push(p)).nudgeDesk!;
    expect(nd.sent).toBe(false);
    nd.pick("today"); nd.pick("other", addDays(today, -3));
    expect(got).toEqual([]);
  });
  it("I've sent it confirms step 1 (the questions' own `sent`); a pick fills `date`, so the save reads its own answers", () => {
    const got: Answers[] = [];
    flowFor({}, (p) => got.push(p)).nudgeDesk!.confirm();
    const nd = flowFor({ sent: true }, (p) => got.push(p)).nudgeDesk!;
    nd.pick("today"); nd.pick("yesterday"); nd.pick("other"); nd.pick("other", addDays(today, -4));
    expect(got).toEqual([
      { sent: true },
      { when: "today", date: ymd(today) },
      { when: "yesterday", date: ymd(addDays(today, -1)) },
      { when: "other", date: ymd(addDays(today, -4)) },
    ]);
  });
  it("un-confirming step 1 clears step 2's answer (and so Log it is disabled again)", () => {
    const got: Answers[] = [];
    const nd = flowFor({ sent: true, when: "today", date: ymd(today) }, (p) => got.push(p)).nudgeDesk!;
    expect(nd.picked).not.toBeNull();
    nd.confirm();
    /* toStrictEqual: toEqual would let `{ sent: undefined }` pass for this (undefined keys count as absent) */
    expect(got).toStrictEqual([{ sent: undefined, when: undefined, date: undefined }]);
    expect(Object.keys(got[0]).sort()).toEqual(["date", "sent", "when"]);
    expect(flowFor({}).nudgeDesk!.picked).toBeNull();
  });
  it("both steps done: the day, and the save's own next-reminder date (offWeekend(addDays(day, 28)))", () => {
    const y = addDays(today, -1);
    const nd = flowFor({ sent: true, when: "yesterday", date: ymd(y) }).nudgeDesk!;
    expect(ymd(nd.picked!)).toBe(ymd(y));
    expect(ymd(nd.then)).toBe(ymd(offWeekend(addDays(y, 28))));
    expect(flowFor({ when: "yesterday", date: ymd(y) }).nudgeDesk!.picked, "a day without step 1 is not a pick").toBeNull();
  });
  const src = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8");
  it("Log it is disabled until both steps are done (nd.picked needs both) and runs the flow's own commit", () => {
    expect(src).toContain('disabled={!nd.picked || busy || logged} onClick={() => void logIt()}');
  });
  it("keys 1, 2, 3 pick only while step 2 is unlocked", () => {
    expect(src).toContain('if (nd && nd.sent && tab === "todo" && !held && !adding && !pop && ["1", "2", "3"].includes(e.key)) {');
  });
  it("the save itself is untouched: saveNudgeSent with nudgePlan, in the drawer's snapshot; 28 days", () => {
    const fl = readFileSync(join(__dirname, "wsFlows.tsx"), "utf8");
    expect(fl).toContain("const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, sent, then)));");
    expect(fl).toContain("const NUDGE_THEN_DAYS = 28;");
  });
  it("Log it sits on the right of the footer", () => {
    const css = readFileSync(join(__dirname, "todoNudgeDesk.css"), "utf8");
    expect(css).toContain('.tws .tws-wf[data-twn-foot] .tws-go[data-tws="primary"] { margin-left: auto; }');
  });
});

describe("the words (pure)", () => {
  const today = new Date(2026, 10, 28);
  it("the agency, or the agent's name where there is none; no reply time stored is null", () => {
    const f = nudgeFacts({ status: QueryStatus.QUERIED, dateSent: "2026-06-03" } as unknown as Query, { name: "William Fox", agency: "" } as unknown as Agent, "William");
    expect(f.agencyOr).toBe("William Fox");
    expect(f.weeks).toBeNull();
  });
  it("the answers' days, the day word, the ago words", () => {
    expect(nudgeAnswers(today, null).map((x) => x.sub)).toEqual(["Sat 28 Nov", "Fri 27 Nov", "Pick the day"]);
    expect(nudgeAnswers(today, new Date(2026, 10, 25))[2].sub).toBe("Wed 25 Nov");
    expect(nudgeDayWord(today, today)).toBe("today");
    expect(nudgeDayWord(new Date(2026, 10, 27), today)).toBe("yesterday");
    expect(nudgeDayWord(new Date(2026, 10, 25), today)).toBe("on Wed 25 Nov");
    expect([14, 35, 7, 49, 62, 122].map(agoWords)).toEqual(["two weeks", "five weeks", "a week", "seven weeks", "two months", "four months"]);
  });
});

describe("Phase 2 — the timeline, there from the start", () => {
  const today = new Date(2026, 10, 28);
  const f = { first: "William", agencyOr: "Foxglove Literary", sent: new Date(2026, 5, 3), sentWhat: "query" as const, weeks: 8, expected: new Date(2026, 6, 29) };
  const then = new Date(2026, 11, 28);
  it("before a pick: queried, weeks up, the overdue hatch to today, today ringed; no nudge, no next reminder; same scale as after", () => {
    const before = nudgeTimeline(f, null, then, today), after = nudgeTimeline(f, today, then, today);
    expect(before.start).toMatchObject({ x: 0, label: "Queried", date: "3 Jun" });
    expect(before.due).toMatchObject({ label: "8 weeks up", date: "29 Jul" });
    expect(before.hatch).toMatchObject({ from: before.due!.x, to: before.today!.x, ago: "four months" });
    expect(before.nudge).toBeNull();
    expect(before.next).toBeNull();
    expect(before.dashed).toBeNull();
    expect(after.today).toBeNull();
    expect(after.nudge).toMatchObject({ x: before.today!.x, date: "Today" });
    expect(after.next).toMatchObject({ date: "28 Dec" });
    expect(after.dashed).toEqual({ from: after.nudge!.x, to: after.next!.x });
    expect(after.due!.x, "nothing jumps on a pick").toBe(before.due!.x);
  });
  it("no reply time stored: no weeks-up point and no hatch; the solid run goes to today / the nudge", () => {
    const sh = nudgeTimeline({ ...f, weeks: null, expected: null }, null, then, today);
    expect(sh.due).toBeNull();
    expect(sh.hatch).toBeNull();
    expect(sh.solid).toEqual({ from: 0, to: sh.today!.x });
  });
  it("shown from the moment the task opens: '{First}'s timeline', Today ringed", () => {
    WILL();
    const desk = openNudge().slice(0);
    expect(text(desk)).toContain("William’s timeline");
    expect(desk).toContain('data-twn-pt="today"');
    expect(desk).not.toContain('data-twn-pt="nudge"');
    expect(desk.indexOf('data-twn="context"')).toBeLessThan(desk.indexOf('data-twn="timeline"'));
    expect(desk.indexOf('data-twn="timeline"')).toBeLessThan(desk.indexOf('data-twn="steps"'));
  });
  it("only the new parts animate on a pick, keyed by the day; reduced motion: none", () => {
    const css = readFileSync(join(__dirname, "todoNudgeDesk.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of [
      ".tws .twn-nud { animation: twn-drop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both; }",
      ".tws .twn-s3 { animation: twn-draw 0.5s 0.3s cubic-bezier(0.4, 0, 0.2, 1) both; }",
      ".tws .twn-next { animation: twn-popin 0.3s 0.7s cubic-bezier(0.2, 1.4, 0.4, 1) both; }",
      ".tws .twn-l.twn-end { animation: twn-fadein 0.3s 0.75s both; }",
      ".tws .twn-tl *, .tws .twn-ttl { animation: none !important; }",
    ]) expect(css, rule).toContain(rule);
    expect(css, "the card has no animation of its own").not.toMatch(/\.twn-tl\s*\{[^}]*animation/);
    const src = readFileSync(join(__dirname, "WsNudgeDesk.tsx"), "utf8");
    expect(src).toContain("<React.Fragment key={day}>");
  });
});

describe("Phase 3 — the calendar for Another day (logic)", () => {
  const src = readFileSync(join(__dirname, "WsNudgeDesk.tsx"), "utf8");
  it("the calendar is bounded by the send and today", () => {
    expect(src).toContain("<NudgeCalendar today={today} min={nd.facts.sent ?? addDays(today, -730)}");
    expect(src).toContain("<MonthGrid month={month} onMonth={setMonth} min={min} max={today}");
  });
  it("Esc with the popover open closes only the popover: its own layer, which the page's Esc yields to", () => {
    expect(src).toContain("useEscapeLayer(true, onClose, ESC_LEVEL.page);");
    const ws = readFileSync(join(__dirname, "TodoWorkspace.tsx"), "utf8");
    const guard = ws.indexOf("isEditableTarget(e.target) || escapeDepth() > 0");
    expect(guard).toBeGreaterThan(0);
    expect(ws.indexOf("if (escGoesBack({"), "the page's Esc is asked only after the escape stack is empty").toBeGreaterThan(guard);
  });
  it("Another day only opens the calendar: nothing changes until a day is picked there; a click outside changes nothing", () => {
    expect(src).toContain('if (k === "other") { setOtherOpen(true); return; }');
    expect(src).toContain("onPick={(d) => { setOtherOpen(false); nd.pick(\"other\", d); }} onClose={() => setOtherOpen(false)}");
  });
});

describe("compact on short screens (logic)", () => {
  it("compact only when the column's room is under the desk's natural height at this width", () => {
    expect(needsCompact(515, 419), "1366×768 on open").toBe(true);
    expect(needsCompact(578, 451), "1280×800 on open").toBe(true);
    expect(needsCompact(495, 551), "1512×900: fits").toBe(false);
    expect(needsCompact(553, 731), "1920×1080: fits").toBe(false);
    expect(needsCompact(551, 551), "exactly fits").toBe(false);
    expect(needsCompact(500, 0), "no room measured yet").toBe(false);
  });
  const src = readFileSync(join(__dirname, "WsNudgeDesk.tsx"), "utf8");
  it("the trigger is the column's height read with the flag off, set before paint; never the viewport", () => {
    expect(src).toContain('el.removeAttribute("data-compact");');
    expect(src).toContain("const natural = el.offsetHeight;");
    expect(src).toContain('if (needsCompact(natural, room)) el.setAttribute("data-compact", "");');
    expect(src).toContain("const room = col.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);");
    expect(src).not.toMatch(/innerHeight|matchMedia\("\(max-height/);
  });
  const css = readFileSync(join(__dirname, "todoNudgeDesk.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("compact's values; the info mark only in compact", () => {
    for (const rule of [
      ".tws .twn2-info { display: none; }",
      ".tws .twn2[data-compact] { gap: 12px; }",
      ".tws .twn2[data-compact] .twn2-ctx img { width: 36px; }",
      ".tws .twn2[data-compact] .twn2-ctx h2 { font-size: 20px !important; margin: 0; }",
      ".tws .twn2[data-compact] .twn2-ctx p { display: none; }",
      ".tws .twn2[data-compact] .twn-band { height: 32px; box-sizing: border-box; display: flex; align-items: center; padding: 0 22px; margin-bottom: 26px; }",
      ".tws .twn2[data-compact] .twn-line { margin-bottom: 28px; }",
      ".tws .twn2[data-compact] .twn2-stp { padding: 12px 18px; }",
      ".tws .twn2[data-compact] .twn2-ch { height: 50px; box-sizing: border-box; padding: 0 6px; grid-template-columns: minmax(0, 1fr); text-align: center; }",
      ".tws .twn2[data-compact] .twn2-ch .twn2-ic { display: none; }",
      ".tws .twn2[data-compact] .twn-l b { display: inline; margin-left: 4px; }",
      ".tws .twn2[data-compact] .twn2-tx:has(.twn2-info:hover, .twn2-info:focus-visible) .twn2-how { display: block; animation: twn2-tip 0.15s ease-out both; }",
    ]) expect(css, rule).toContain(rule);
    expect(css, "compact: the picked-day line is folded").toContain('.tws .twn2[data-compact] [data-twn="nudged"] { display: none; }');
    expect(css, "not compact: nothing else hides it").not.toMatch(/(^|[^\]])\s\[data-twn="nudged"\]\s*\{[^}]*display:\s*none/m);
    expect(css, "the timeline labels keep their size in compact").not.toMatch(/\[data-compact\][^{]*\.twn-l[^{]*\{[^}]*font/);
  });
});

describe("the calendar stays wholly inside the column", () => {
  it("it comes down only by what would cross the column's top; where it fits, nothing moves", () => {
    expect(calendarShift(23.4)).toBe(24);
    expect(calendarShift(0)).toBe(0);
    expect(calendarShift(-55)).toBe(0);
    const src = readFileSync(join(__dirname, "WsNudgeDesk.tsx"), "utf8");
    expect(src).toContain("const over = col.getBoundingClientRect().top + 8 - el.getBoundingClientRect().top;");
    expect(src).toContain('el.style.bottom = "";');
  });
});

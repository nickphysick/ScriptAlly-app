/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58.2 — THE FIGURES TELL THE TRUTH. A tray row's figure (and the desk chip, which reads the same figure)
 * says what it counts from:
 *   · a nudge past the reply window "past expected"; past the writer's own date (a hold, a planned nudge, a check-in)
 *     "since your reminder";
 *   · an offer "since it came in", from `offerDate`, else `lastStatusChange`;
 *   · an own task past its date "past its date";
 *   · a request with no stored request date counts from the logged request (never `lastStatusChange`), else no figure.
 * Each population is asserted non-empty before it is read, so no case passes by reading nothing.
 */
import { describe, it, expect } from "vitest";
import { deskChip, trayFigure, type WsTask } from "./todoWs";
import { requestAskedMs, trayItem, type TrayDb, type TrayItem } from "./todoTray";
import type { BoardCard } from "./todoBoard";
import type { DueSource } from "./taskDue";
import { QueryStatus, type Activity, type Query } from "../types";

const DAY = 86400000;
const NOW = Date.parse("2026-11-22T12:00:00Z");
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

const task = (kind: WsTask["kind"], extra: Partial<WsTask> = {}, item: Partial<TrayItem> = {}): WsTask =>
  ({ key: `k-${kind}-${Math.random()}`, kind, group: "wait", title: "t", first: "Ana", agentName: "Ana Ruiz", agency: "Ruiz Literary",
    item: { anchorMs: NOW, waitMs: null, ...item } as TrayItem, dueDays: null, quietDays: null, type: "Send", hay: "", ...extra }) as WsTask;
const text = (t: WsTask) => { const f = trayFigure(t, NOW); return f ? `${f.n} ${f.words}`.trim() : null; };

describe("v58.2 A1 — a nudge's words follow its source", () => {
  const cases: [DueSource, string][] = [["window", "12 days past expected"], ["hold", "12 days since your reminder"], ["reminder", "12 days since your reminder"], ["check-in", "12 days since your reminder"]];
  it("past the reply window: past expected; past a hold, a planned nudge (nudgeDate) or a check-in: since your reminder", () => {
    expect(cases.length).toBeGreaterThan(0);
    for (const [source, want] of cases) expect(text(task("nudge", { dueDays: -12, dueSource: source })), source).toBe(want);
  });
  it("one day reads singular; a date not yet reached is days left whatever the source; the day itself is Today", () => {
    expect(text(task("nudge", { dueDays: -1, dueSource: "hold" }))).toBe("1 day since your reminder");
    expect(text(task("nudge", { dueDays: -1, dueSource: "window" }))).toBe("1 day past expected");
    for (const source of ["hold", "reminder", "window"] as DueSource[]) {
      expect(text(task("nudge", { dueDays: 4, dueSource: source }))).toBe("4 days left");
      expect(text(task("nudge", { dueDays: 0, dueSource: source }))).toBe("Today");
    }
  });
  it("no date at all: the waiting figure, unchanged", () => {
    expect(text(task("nudge", { dueDays: null }, { waitMs: Date.parse(ago(30)) }))).toBe("30 days waiting");
  });
});

describe("v58.2 A2 — an offer counts from the day it came in", () => {
  const offer = (q: Partial<Query>, extra: Partial<WsTask> = {}) => task("offer", { query: { id: "q", status: QueryStatus.OFFER, ...q } as Query, ...extra });
  it("from offerDate when stored — not from lastStatusChange, and not from its due dial", () => {
    expect(text(offer({ offerDate: ago(9), lastStatusChange: ago(2) } as Partial<Query>, { dueDays: -40, dueSource: "arrived" }))).toBe("9 days since it came in");
  });
  it("else from lastStatusChange; one day singular; the same day Today; with neither, no figure", () => {
    expect(text(offer({ lastStatusChange: ago(5) } as Partial<Query>))).toBe("5 days since it came in");
    expect(text(offer({ lastStatusChange: ago(1) } as Partial<Query>))).toBe("1 day since it came in");
    expect(text(offer({ offerDate: new Date(NOW - 3600000).toISOString() } as Partial<Query>))).toBe("Today");
    expect(trayFigure(offer({}), NOW)).toBeNull();
  });
  it("an offer never says past expected or days left, even held to a date", () => {
    const words = [-30, -1, 0, 6].map((d) => text(offer({ offerDate: ago(9) } as Partial<Query>, { dueDays: d, dueSource: "hold" })));
    expect(words.length).toBe(4);
    for (const w of words) expect(w).not.toMatch(/past expected|left/);
  });
});

describe("v58.2 A3 — an own task's words", () => {
  it("past its date: past its date; days left and Today stay; no date, no figure", () => {
    expect(text(task("own", { dueDays: -6 }))).toBe("6 days past its date");
    expect(text(task("own", { dueDays: -1 }))).toBe("1 day past its date");
    expect(text(task("own", { dueDays: 3 }))).toBe("3 days left");
    expect(text(task("own", { dueDays: 0 }))).toBe("Today");
    expect(trayFigure(task("own", { dueDays: null }), NOW)).toBeNull();
  });
});

/* ── A4: through the real trayItem, so the figure the row reads is the one under test ── */
const card = (taskType: string): BoardCard => ({ key: `c-${taskType}`, id: `c-${taskType}`, taskType, relatedRecordId: "q1", title: "t", priority: "urgent" } as unknown as BoardCard);
const act = (id: string, status: QueryStatus, d: number): Activity => ({ id, userId: "u1", queryId: "q1", manuscriptId: "m1", activityType: "status_change", date: ago(d), description: "", resultingStatus: status } as unknown as Activity);
const dbOf = (q: Partial<Query>, activities: Activity[]): TrayDb => ({
  queries: [{ id: "q1", userId: "u1", agentId: "a1", manuscriptId: "m1", dateSent: ago(200), ...q } as Query],
  agents: [{ id: "a1", userId: "u1", name: "Greg Panetta", agency: "Panetta Books" } as never], manuscripts: [], userTasks: [], activities, packages: [], taskFlags: [],
});
const daysOf = (i: TrayItem) => (i.waitMs == null ? null : Math.round((NOW - i.waitMs) / DAY));

describe("v58.2 A4 — a request with no stored request date counts from the log", () => {
  it("a stored request date wins", () => {
    const db = dbOf({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: ago(40), lastStatusChange: ago(3) } as Partial<Query>, [act("a1", QueryStatus.PARTIAL_REQUESTED, 147)]);
    expect(daysOf(trayItem(card("partial_requested"), db, NOW))).toBe(40);
  });
  it("no stored date and a logged request: counts from the EARLIEST logged request, not from lastStatusChange", () => {
    const logs = [act("a1", QueryStatus.PARTIAL_REQUESTED, 147), act("a2", QueryStatus.PARTIAL_REQUESTED, 60), act("a3", QueryStatus.PARTIAL_SENT, 39)];
    expect(logs.filter((a) => a.resultingStatus === QueryStatus.PARTIAL_REQUESTED).length).toBeGreaterThan(0);
    const db = dbOf({ status: QueryStatus.PARTIAL_REQUESTED, lastStatusChange: ago(3) } as Partial<Query>, logs);
    expect(daysOf(trayItem(card("partial_requested"), db, NOW))).toBe(147);
  });
  it("a later status write does not move it", () => {
    const logs = [act("a1", QueryStatus.FULL_REQUESTED, 90)];
    const before = daysOf(trayItem(card("full_requested"), dbOf({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(80) } as Partial<Query>, logs), NOW));
    const after = daysOf(trayItem(card("full_requested"), dbOf({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(1) } as Partial<Query>, logs), NOW));
    expect(before).toBe(90);
    expect(after).toBe(before);
  });
  it("an R&R counts from its logged R&R", () => {
    const db = dbOf({ status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: ago(2) } as Partial<Query>, [act("a1", QueryStatus.REVISE_RESUBMIT, 33)]);
    expect(daysOf(trayItem(card("revise_resubmit"), db, NOW))).toBe(33);
  });
  it("with neither a stored date nor a logged request: no figure (lastStatusChange is no longer a fallback)", () => {
    const db = dbOf({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(58) } as Partial<Query>, [act("other", QueryStatus.QUERIED, 200)]);
    const i = trayItem(card("full_requested"), db, NOW);
    expect(i.waitMs).toBeNull();
    expect(trayFigure(task("send", {}, i), NOW)).toBeNull();
  });
  it("a task that is not a request keeps its own anchor (requestAskedMs answers undefined)", () => {
    expect(requestAskedMs(card("nudge_overdue"), undefined, [])).toBeUndefined();
  });
});

/* ── A5: everything that reads the figure agrees; A6: no figure says "late" ── */
const EVERY: WsTask[] = [
  task("nudge", { dueDays: -12, dueSource: "window" }), task("nudge", { dueDays: -12, dueSource: "hold" }), task("nudge", { dueDays: -3, dueSource: "reminder" }),
  task("nudge", { dueDays: 5, dueSource: "window" }), task("nudge", { dueDays: 0, dueSource: "check-in" }), task("nudge", {}, { waitMs: Date.parse(ago(20)) }),
  task("offer", { query: { id: "q", status: QueryStatus.OFFER, offerDate: ago(9) } as unknown as Query }),
  task("offer", { query: { id: "q", status: QueryStatus.OFFER, lastStatusChange: ago(0) } as unknown as Query }),
  task("own", { dueDays: -6 }), task("own", { dueDays: 2 }), task("own", { dueDays: 0 }),
  task("send", {}, { waitMs: Date.parse(ago(147)) }), task("rr", {}, { waitMs: Date.parse(ago(33)) }),
  task("quiet", { quietDays: 102 }), task("other", { dueDays: -4 }), task("other", {}, { waitMs: Date.parse(ago(8)) }),
];
describe("v58.2 A5 — the desk chip shows the row's words, for every kind", () => {
  it("covers every kind that shows a figure", () => {
    expect(new Set(EVERY.map((t) => t.kind))).toEqual(new Set(["nudge", "offer", "own", "send", "rr", "quiet", "other"]));
  });
  it("deskChip's text equals trayFigure's text", () => {
    for (const t of EVERY) {
      const f = trayFigure(t, NOW);
      expect(f, t.kind).not.toBeNull();
      const c = deskChip(t, NOW)!;
      expect(`${c.b} ${c.s}`.trim(), t.kind).toBe(`${f!.n} ${f!.words}`.trim());
    }
  });
  it("no figure string contains \"late\"", () => {
    const all = EVERY.map(text).filter((x): x is string => !!x);
    expect(all.length).toBe(EVERY.length);
    for (const s of all) expect(s).not.toMatch(/late/i);
  });
});

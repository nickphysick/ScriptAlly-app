/**
 * Query card v161, Phase 1 — a reminder is not a nudge (QC161-1, -2, -3 at the rule; the pages are measured in
 * tests/e2e/qc161.measure.ts). `nudgeDate` is the writer's reminder; `lastNudgeSentDate` is a logged nudge.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { closeLeads, nudgeMsOf, queryState, remindedMs, replyExpectedMs, type StateInput } from "./queryState";
import { footer1522 } from "./qcFoot1522";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 19, 12);
const iso = (ago: number) => new Date(NOW - ago * DAY).toISOString();
const c4 = { quietWeeks: 4, nowMs: NOW };
const row = (o: { reply: number | null; remind?: number; nudge?: number; sent?: number }): StateInput => ({
  status: QueryStatus.QUERIED, expectedMs: o.reply == null ? null : NOW - o.reply * DAY, stageStartMs: NOW - (o.sent ?? 60) * DAY,
  sentMs: NOW - (o.sent ?? 60) * DAY, nrmn: false,
  query: { dateSent: iso(o.sent ?? 60), nudgeDate: o.remind != null ? iso(o.remind) : null, lastNudgeSentDate: o.nudge != null ? iso(o.nudge) : null },
});

describe("QC161-1 · not nudged", () => {
  it("a passed reminder with no logged nudge: nudgeMsOf is null, the reminder is due", () => {
    const r = row({ reply: -10, remind: 3 });
    expect(nudgeMsOf(r, NOW)).toBeNull();
    expect(remindedMs(r, NOW)).toBe(NOW - 3 * DAY);
  });
  it("its footer never says Nudged", () => {
    for (const r of [row({ reply: -10, remind: 3 }), row({ reply: 10, remind: 3 }), row({ reply: 40, remind: 30 })]) {
      const st = queryState(r, c4);
      const f = footer1522({ state: st, status: QueryStatus.QUERIED, first: "Jonathan", nowMs: NOW, replyMs: replyExpectedMs(r, c4), dueMs: null,
        nudgeMs: nudgeMsOf(r, NOW), quietWeeks: 4, closeLeads: closeLeads(r, c4), fullName: "Jonathan Marsh", phase: null, toTell: 0, askedFor: null, closedMs: null, closedHow: null } as never);
      expect(`${f.lead} ${f.sub}`).not.toMatch(/[Nn]udged(?! yet)/);
    }
  });
});
describe("QC161-2 · nudge due", () => {
  it("reply date ahead and the reminder come: nudge due, not waiting; reminder still ahead: waiting", () => {
    expect(queryState(row({ reply: -10, remind: 3 }), c4)).toBe("nudge");
    expect(queryState(row({ reply: -10, remind: -2 }), c4)).toBe("agent");
    expect(queryState(row({ reply: -10 }), c4)).toBe("agent");
  });
  it("reply date passed: nudge due inside the quiet window, gone quiet past it — counted from the reply date", () => {
    expect(queryState(row({ reply: 10, remind: 30 }), c4)).toBe("nudge");
    expect(queryState(row({ reply: 40, remind: 30 }), c4)).toBe("quiet");
    expect(replyExpectedMs(row({ reply: 40, remind: 30 }), c4)).toBe(NOW - 40 * DAY);
  });
  it("a reminder from before the latest send is an earlier stage's, and does nothing", () => {
    expect(queryState(row({ reply: -10, remind: 70, sent: 60 }), c4)).toBe("agent");
  });
  it("the nudge-due footer never says a day still to come 'was due'", () => {
    const r = row({ reply: -10, remind: 3 });
    const f = footer1522({ state: "nudge", status: QueryStatus.QUERIED, first: "Jonathan", nowMs: NOW, replyMs: replyExpectedMs(r, c4), dueMs: null,
      nudgeMs: null, quietWeeks: 4, closeLeads: false, fullName: "Jonathan Marsh", phase: null, toTell: 0, askedFor: null, closedMs: null, closedHow: null } as never);
    expect(f.sub).toMatch(/^Reply expected by /);
    expect(f.button?.act).toBe("nudge");
  });
});
describe("QC161-3 · which leads", () => {
  it("gone quiet, a passed reminder, no logged nudge, under 8 weeks past the reply date: Nudge leads", () => {
    expect(closeLeads(row({ reply: 40, remind: 30 }), c4)).toBe(false);
  });
  it("with a logged nudge, Close it leads; 8 weeks past the reply date, Close it leads", () => {
    expect(closeLeads(row({ reply: 70, nudge: 40, sent: 90 }), c4)).toBe(true);
    expect(closeLeads(row({ reply: 60, remind: 50, sent: 90 }), c4)).toBe(true);
  });
});

describe("QC161-5 · a real nudge still counts (at the rule)", () => {
  it("a nudge logged today counts at once, though it is stored at noon and it is still morning", () => {
    const morning = new Date(NOW); morning.setHours(9, 0, 0, 0);
    const noon = new Date(NOW); noon.setHours(12, 0, 0, 0);
    const r: StateInput = { ...row({ reply: 10 }), query: { dateSent: iso(60), lastNudgeSentDate: noon.toISOString() } };
    expect(nudgeMsOf(r, morning.getTime())).toBe(noon.getTime());
    expect(queryState(r, { quietWeeks: 4, nowMs: morning.getTime() })).toBe("agent");
    expect(replyExpectedMs(r, { quietWeeks: 4, nowMs: morning.getTime() })).toBe(noon.getTime() + 28 * DAY);
  });
  it("a reminder or a nudge on a day still to come does not count", () => {
    const tomorrow = new Date(NOW + DAY).toISOString();
    expect(nudgeMsOf({ ...row({ reply: 10 }), query: { dateSent: iso(60), lastNudgeSentDate: tomorrow } }, NOW)).toBeNull();
    expect(remindedMs({ ...row({ reply: -5 }), query: { dateSent: iso(60), nudgeDate: tomorrow } }, NOW)).toBeNull();
  });
});


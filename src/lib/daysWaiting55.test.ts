/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v55 (D7) — THE DAYS-WAITING FIGURE. A request read "0 days waiting" because two faults compounded: a query
 * written straight to Full Requested carries no `fullRequestedDate`, so `waitAnchorMs` had no anchor; and `trayItem`
 * then put NOW in its place, so the figure counted from today. These hold the fix at both ends, through the functions
 * the rows and the page header's legend actually call.
 */
import { describe, it, expect } from "vitest";
import { waitAnchorMs } from "./todoBuckets";
import { daysWaiting, trayFigure, type WsTask } from "./todoWs";
import { needRows } from "./todoHeader54";
import type { TrayItem } from "./todoTray";

const DAY = 86400000;
const NOW = Date.parse("2026-11-11T12:00:00Z");
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

describe("waitAnchorMs — a request counts from when the agent asked", () => {
  it("a full request with its request date stored counts from that date", () => {
    expect(waitAnchorMs("send", "full_requested", { dateSent: ago(1000), fullRequestedDate: ago(953), statusMovedAt: ago(10) })).toBe(Date.parse(ago(953)));
  });
  it("a full request with NO request date counts from the status's last move (the move to Full Requested)", () => {
    expect(waitAnchorMs("send", "full_requested", { dateSent: ago(1000), statusMovedAt: ago(953) })).toBe(Date.parse(ago(953)));
  });
  it("a partial request with no response and no request date does the same", () => {
    /* no reply recorded, no request date: the status change is the only record of when it was asked */
    expect(waitAnchorMs("send", "partial_requested", { dateSent: ago(400), statusMovedAt: ago(300), lastReplyAt: undefined })).toBe(Date.parse(ago(300)));
  });
  it("still NaN with neither — never today, never the query's creation", () => {
    expect(Number.isNaN(waitAnchorMs("send", "full_requested", { dateSent: ago(1000) }))).toBe(true);
  });
});

const task = (kind: WsTask["kind"], item: Partial<TrayItem>, extra: Partial<WsTask> = {}): WsTask =>
  ({ key: `k-${kind}-${Math.random()}`, kind, group: "wait", title: "t", first: "Jonathan", agentName: "Jonathan Marsh", agency: "The Marsh Agency",
    item: { anchorMs: NOW, ...item } as TrayItem, dueDays: null, quietDays: null, type: "Send", hay: "", ...extra }) as WsTask;

describe("daysWaiting — the one figure the row and the legend read", () => {
  it("counts from the record's anchor", () => {
    expect(daysWaiting(task("send", { anchorMs: Date.parse(ago(953)), waitMs: Date.parse(ago(953)) }), NOW)).toBe(953);
  });
  it("⚠️ a missing anchor is no figure, never 0 — even though anchorMs fell back to now for the sorts", () => {
    const t = task("send", { anchorMs: NOW, waitMs: null });
    expect(daysWaiting(t, NOW)).toBeNull();
    expect(trayFigure(t, NOW)).toBeNull();
  });
  it("the row's figure is the same number", () => {
    const f = trayFigure(task("send", { anchorMs: Date.parse(ago(953)), waitMs: Date.parse(ago(953)) }), NOW);
    expect(f).toEqual({ n: "953", words: "days waiting", late: false });
  });
  it("the legend's note is the longest of the rows' own figures, and an undated row adds nothing", () => {
    const rows = [
      task("send", { anchorMs: Date.parse(ago(953)), waitMs: Date.parse(ago(953)) }),
      task("send", { anchorMs: Date.parse(ago(84)), waitMs: Date.parse(ago(84)) }),
      task("send", { anchorMs: NOW, waitMs: null }),
    ];
    const bd = { wait: 3, nudge: 0, quiet: 0, house: 0, late: 0, need: 3 };
    const wait = needRows([{ id: "wait", name: "Agents are waiting", band: "wait", tasks: rows }], bd, NOW).find((r) => r.key === "wait");
    expect(wait?.note).toBe("953 days");
    expect(Math.max(...rows.map((r) => daysWaiting(r, NOW) ?? -1))).toBe(953);
  });
  it("an own task has no days-waiting figure", () => {
    expect(daysWaiting(task("own", { anchorMs: Date.parse(ago(5)), waitMs: Date.parse(ago(5)) }), NOW)).toBeNull();
  });
});

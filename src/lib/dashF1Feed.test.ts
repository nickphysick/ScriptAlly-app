/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DF1-D — Dashboard feed v1, Part D: the feed's model (pure). The rendered feed — the switch's populations, a big card
 * on the page, no drawer — is measured by tests/e2e/dashFeedV1.measure.ts (D1, D2).
 */
import { describe, it, expect } from "vitest";
import { ActivityType, QueryStatus, type Agent, type Manuscript, type Query } from "../types";
import type { FeedEntry } from "./dashFeed";
import type { DrawerEvent } from "./dashFeedDrawer";
import type { QcRow } from "./qcSummary";
import { bigKind, dayHeading, f1Days, f1From, journeyStops, stopDate, whenLine, type F1Big, type F1Ctx } from "./dashF1Feed";

const NOW = new Date(2026, 9, 30, 15, 0); // Friday 30 October 2026, 15:00
const at = (d: number, h = 11, m = 40) => new Date(2026, 9, d, h, m).getTime();

const entry = (o: Partial<FeedEntry>): FeedEntry => ({
  id: o.id ?? "e", at: o.at ?? at(30), time: "11:40am", dayLabel: "", pill: "", status: null, state: null, app: false, say: [{ t: "said" }],
  provenance: "", action: null, requery: null, queryId: null, isNew: false, dir: "in", activityType: "Status Change", who: "", agency: "",
  need: null, met: null, ...o,
} as FeedEntry);
const ev = (e: FeedEntry): DrawerEvent => ({ entry: e, say: e.say, tag: "", meta: "" });

const Q: Query = {
  id: "q1", agentId: "a1", manuscriptId: "ms-1", status: QueryStatus.FULL_REQUESTED, dateSent: "2026-09-28T10:00:00.000Z",
  expectedSendDate: "2026-11-26", sentHow: "package", sentPackageId: "p1", sentPackageName: "Package B",
  sentMaterials: "Package B package: Query letter Version 3 · Synopsis One page · First 3 chapters",
} as unknown as Query;
const A: Agent = { id: "a1", name: "Nadia Hussain", agency: "Hussain Literary" } as unknown as Agent;
const MS: Manuscript = { id: "ms-1", title: "Murphy’s Day Out", wordCount: 92400 } as unknown as Manuscript;
const span = (status: QueryStatus, d: number, m = 8) => ({ status, startMs: new Date(2026, m, d).getTime(), endMs: null, current: false });
const ROW = {
  id: "q1",
  history: { spans: [span(QueryStatus.QUERIED, 28), span(QueryStatus.PARTIAL_REQUESTED, 3, 9), span(QueryStatus.PARTIAL_SENT, 9, 9), { ...span(QueryStatus.FULL_REQUESTED, 30, 9), current: true }], currentStartMs: 0, dated: true },
} as unknown as QcRow;
const ctx: F1Ctx = { queries: [Q], agents: [A], manuscripts: [MS], qcRows: [ROW], userName: "Bethany Carter", now: NOW };

describe("DF1-D · which entries are big", () => {
  it("requests and offers from agents, and the writer's partial or full going out", () => {
    expect(bigKind(entry({ status: QueryStatus.FULL_REQUESTED, dir: "in" }))).toBe("request");
    expect(bigKind(entry({ status: QueryStatus.PARTIAL_REQUESTED, dir: "in" }))).toBe("request");
    expect(bigKind(entry({ status: QueryStatus.OFFER, dir: "in" }))).toBe("offer");
    expect(bigKind(entry({ status: QueryStatus.FULL_SENT, dir: "out" }))).toBe("sent");
    expect(bigKind(entry({ status: QueryStatus.PARTIAL_SENT, dir: "out" }))).toBe("sent");
  });
  it("everything else is a mini row", () => {
    expect(bigKind(entry({ status: QueryStatus.QUERIED, dir: "out" }))).toBeNull();
    expect(bigKind(entry({ status: QueryStatus.REJECTED, dir: "in" }))).toBeNull();
    expect(bigKind(entry({ status: null, dir: "out", activityType: ActivityType.NUDGE_SENT }))).toBeNull();
    expect(bigKind(entry({ status: QueryStatus.FULL_SENT, dir: "out", app: true }))).toBeNull();
  });
});

describe("DF1-D · a full request's big card", () => {
  const days = f1Days([ev(entry({ id: "r", queryId: "q1", status: QueryStatus.FULL_REQUESTED, dir: "in", need: { label: "Send full" }, who: "Nadia Hussain" }))], "all", ctx);
  const c = days[0].items[0] as F1Big;
  it("says who, when and what, like a person", () => {
    expect(c.type).toBe("big");
    expect(c.name).toBe("Nadia Hussain");
    expect(c.initials).toBe("NH");
    expect(c.meta).toBe("Today at 11:40 · Hussain Literary");
    expect(c.headline).toBe("Nadia asked for the full manuscript");
  });
  it("its two figures come from the record: days since the stage before, and the send-by date", () => {
    expect(c.figs).toEqual([{ label: "Days to reply", value: "21" }, { label: "Send by", value: "26 Nov" }]);
  });
  it("the journey folds a partial asked and sent into one stop, and the step still to come is last", () => {
    expect(c.stops.map((s) => s.label)).toEqual(["Queried", "Partial", "Full asked", "Send full"]);
    expect(c.stops[3]).toMatchObject({ next: true, date: "by 26 Nov" });
    expect(c.stops[2].date).toBe("Today");
  });
  it("names the package and its materials", () => {
    expect(c.pkg).toBe("Package B");
    expect(c.mats?.map((m) => m.name)).toEqual(["Query letter", "Synopsis", "Opening sample"]);
    expect(c.mats?.[0].version).toBe("Version 3");
  });
  it("drops a figure with no source, and draws no next step once the request is answered", () => {
    const bare = { ...Q, expectedSendDate: undefined } as unknown as Query;
    const d = f1Days([ev(entry({ id: "r", queryId: "q1", status: QueryStatus.FULL_REQUESTED, dir: "in", need: null }))], "all", { ...ctx, queries: [bare] });
    const b = d[0].items[0] as F1Big;
    expect(b.figs.map((f) => f.label)).toEqual(["Days to reply"]);
    expect(b.stops.some((s) => s.next)).toBe(false);
  });
});

describe("DF1-D · the writer's own full", () => {
  it("is from you, to the agent, with the words and the days since the query", () => {
    const q = { ...Q, status: QueryStatus.FULL_SENT } as unknown as Query;
    const row = { ...ROW, history: { ...ROW.history, spans: [...ROW.history.spans, span(QueryStatus.FULL_SENT, 28, 9)] } } as unknown as QcRow;
    const d = f1Days([ev(entry({ id: "s", queryId: "q1", status: QueryStatus.FULL_SENT, dir: "out", at: at(28, 11, 20) }))], "all", { ...ctx, queries: [q], qcRows: [row] });
    const c = d[0].items[0] as F1Big;
    expect(c.name).toBe("You sent a full manuscript");
    expect(c.initials).toBe("BC");
    expect(c.meta).toBe("28 Oct at 11:20 · to Nadia Hussain, Hussain Literary");
    expect(c.headline).toBe("The whole book is with Nadia");
    expect(c.figs).toEqual([{ label: "Words", value: "92,400" }, { label: "Days since query", value: "30" }]);
    expect(c.mats).toBeNull();
  });
});

describe("DF1-D · mini rows, the switch and the days", () => {
  const evs = [
    ev(entry({ id: "1", at: at(30, 9, 12), status: QueryStatus.QUERIED, dir: "out", who: "Ada Penhallow", queryId: "x" })),
    ev(entry({ id: "2", at: at(29, 18, 30), status: QueryStatus.REJECTED, dir: "in", who: "George Ashworth" })),
    ev(entry({ id: "3", at: at(26, 10), status: QueryStatus.QUERIED, dir: "out", who: "Joanna Pike" })),
    ev(entry({ id: "4", at: at(26, 9), status: QueryStatus.QUERIED, dir: "out", who: "Sam Adeyemi" })),
    ev(entry({ id: "5", at: at(26, 8), status: QueryStatus.QUERIED, dir: "out", who: "Rhiannon Hale" })),
  ];
  it("several queries sent on one day share one row", () => {
    const d = f1Days(evs, "all", ctx);
    expect(d.map((x) => x.items.length)).toEqual([1, 1, 1]);
    const say = d[2].items[0].type === "mini" ? d[2].items[0].say.map((s) => s.t).join("") : "";
    expect(say).toBe("You queried Joanna Pike, Sam Adeyemi and Rhiannon Hale.");
  });
  it("Agents shows only what agents did; You only what you did", () => {
    const inn = f1Days(evs, "in", ctx).flatMap((d) => d.items);
    const out = f1Days(evs, "out", ctx).flatMap((d) => d.items);
    expect(inn.length).toBeGreaterThan(0);
    expect(out.length).toBeGreaterThan(0);
    expect(inn.every((i) => i.dir === "in")).toBe(true);
    expect(out.every((i) => i.dir === "out")).toBe(true);
  });
  it("heads each day: Today, Yesterday, then the weekday", () => {
    expect(dayHeading(at(30, 0, 0), NOW)).toEqual({ first: "Today", rest: "Friday 30 October" });
    expect(dayHeading(new Date(2026, 9, 29).getTime(), NOW)).toEqual({ first: "Yesterday", rest: "Thursday 29 October" });
    expect(dayHeading(new Date(2026, 9, 28).getTime(), NOW)).toEqual({ first: "Wednesday", rest: "28 October" });
  });
  it("Yesterday holds across the clocks changing (25 October)", () => {
    const MON = new Date(2026, 9, 26, 12);
    expect(dayHeading(new Date(2026, 9, 25).getTime(), MON).first).toBe("Yesterday");
    expect(whenLine(new Date(2026, 9, 25, 9, 0).getTime(), MON)).toBe("Yesterday at 09:00");
  });
  it("dates and windows", () => {
    expect(whenLine(at(29, 13, 5), NOW)).toBe("Yesterday at 13:05");
    expect(stopDate(at(29), NOW)).toBe("Thu");
    expect(stopDate(at(9, 12, 0), NOW)).toBe("9 Oct");
    expect(f1From(NOW)).toBe(new Date(2026, 9, 24).getTime());
    expect(f1From(NOW, 2)).toBe(new Date(2026, 9, 17).getTime());
  });
  it("no journey stops without a row", () => {
    expect(journeyStops(undefined, Q, false, NOW)).toEqual([]);
  });
});

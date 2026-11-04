import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { askChips, buildThread, covers, discFill, materialsSummary, materialsTab, replyBox, sideOf, waitTip, type ThreadStepIn } from "./qcThread152";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);
const at = (daysAgo: number) => NOW - daysAgo * DAY;
const st = (key: string, status: QueryStatus | null, daysAgo: number, extra: Partial<ThreadStepIn> = {}): ThreadStepIn =>
  ({ key, status, kind: null, ms: at(daysAgo), chips: [], ...extra });
const ctx = { first: "Jonathan", nowMs: NOW, agentWeeks: 8 as number | null };

describe("the thread (v152 §2.3)", () => {
  it("the agent's steps on the left, yours on the right", () => {
    expect([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REJECTED].map((s) => sideOf({ status: s, kind: null }))).toEqual(["them", "them", "them", "them"]);
    expect([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].map((s) => sideOf({ status: s, kind: null }))).toEqual(["me", "me", "me", "me", "me"]);
    expect(sideOf({ status: null, kind: "nudge" })).toBe("me");
  });
  it("the disc is the status's cap colour; Query sent and a nudge have none", () => {
    expect(discFill({ status: QueryStatus.QUERIED, kind: null })).toBe("transparent");
    expect(discFill({ status: null, kind: "nudge" })).toBe("transparent");
    expect(discFill({ status: QueryStatus.PARTIAL_REQUESTED, kind: null })).toBe("#f3d3c6");
    expect(discFill({ status: QueryStatus.FULL_SENT, kind: null })).toBe("#d3dce7");
  });
  it("Day 1, the days between steps, today, and the end by state", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 60), st("pr", QueryStatus.PARTIAL_REQUESTED, 16)], { ...ctx, state: "materials", replyMs: null });
    expect(t.map((x) => x.t === "wait" ? x.label : x.t === "msg" ? x.side : x.kind)).toEqual(["Day 1", "me", "44 days", "them", "16 days · today"]);
    const a = buildThread([st("q", QueryStatus.QUERIED, 23)], { ...ctx, state: "agent", replyMs: NOW + 33 * DAY });
    const end = a[a.length - 1];
    expect(end.t === "end" && end.sub).toBe("Day 23 of about 56 · reply expected 10 Nov");
    expect(end.t === "end" && end.ring).toBeCloseTo(23 / 56);
    const c = buildThread([st("q", QueryStatus.QUERIED, 90), st("x", QueryStatus.REJECTED, 20)], { ...ctx, state: "closed", replyMs: null });
    expect(c.some((x) => x.t === "wait" && x.edge === "now")).toBe(false);
  });
  it("a wait over 70 days is long", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 100), st("x", QueryStatus.PARTIAL_REQUESTED, 20)], { ...ctx, state: "materials", replyMs: null });
    expect(t.find((x) => x.t === "wait" && x.label === "80 days")).toMatchObject({ long: true });
  });
});

describe("the tips on a wait (§2.4)", () => {
  const q = st("q", QueryStatus.QUERIED, 60), pr = st("pr", QueryStatus.PARTIAL_REQUESTED, 16), ps = st("ps", QueryStatus.PARTIAL_SENT, 2);
  it("their usual only when they state a reply time", () => {
    expect(waitTip(q, pr, 44, ctx)).toBe("Jonathan replied 44 days after your query. Their usual is about 8 weeks, so this was quicker than usual.");
    expect(waitTip(q, pr, 44, { ...ctx, agentWeeks: null })).toBe("Jonathan replied 44 days after your query.");
    expect(waitTip(q, pr, 56, ctx)).toMatch(/about the same as usual\.$/);
    expect(waitTip(ps, st("fr", QueryStatus.FULL_REQUESTED, 0), 100, ctx)).toMatch(/about 12 weeks, so this was longer than usual\.$/);
  });
  it("your side says what you did", () => {
    expect(waitTip(pr, ps, 14, ctx)).toBe("You sent the partial 14 days after Jonathan asked.");
    expect(waitTip(q, st("n", null, 0, { kind: "nudge" }), 70, ctx)).toBe("You nudged Jonathan 70 days after the query.");
  });
});

describe("the reply box (§2.5)", () => {
  const base = { first: "Priya", nowMs: NOW, replyMs: null as number | null, closedMs: null as number | null, dueMs: null as number | null };
  it("one field and one button per state", () => {
    expect(replyBox({ ...base, state: "offer", status: QueryStatus.OFFER, dueMs: NOW + 6 * DAY })).toMatchObject({ lead: "Answer the offer", sub: "6 days left", button: "Answer the offer", tone: "navy" });
    expect(replyBox({ ...base, state: "materials", status: QueryStatus.FULL_REQUESTED, dueMs: NOW + 7 * DAY })).toMatchObject({ lead: "Send the full", sub: "7 days left · by 15 Oct", button: "Mark full sent", tone: "navy" });
    expect(replyBox({ ...base, state: "materials", status: QueryStatus.PARTIAL_REQUESTED, dueMs: NOW - 8 * DAY })).toMatchObject({ sub: "8 days late", late: true, button: "Mark partial sent" });
    expect(replyBox({ ...base, state: "nudge", status: QueryStatus.QUERIED, replyMs: NOW - 12 * DAY })).toMatchObject({ lead: "Nudge Priya?", sub: "Reply was due 26 Sep", button: "Nudge", tone: "outline" });
    expect(replyBox({ ...base, state: "agent", status: QueryStatus.QUERIED })).toMatchObject({ lead: "Heard back?", sub: "Record it when Priya replies", button: "Record a response" });
    expect(replyBox({ ...base, state: "quiet", status: QueryStatus.QUERIED })).toMatchObject({ lead: "Still nothing?", sub: "Close it, or keep waiting", button: "Close it" });
    expect(replyBox({ ...base, state: "closed", status: QueryStatus.REJECTED, closedMs: Date.UTC(2026, 7, 11, 12) })).toMatchObject({ lead: "Closed", sub: "Closed on 11 Aug", button: "Reopen" });
  });
});

describe("the Agent tab (§2.6): page counts compare properly", () => {
  it("10 pages covers a request for 5; 5 does not cover 10", () => {
    expect(covers("First 10 pages", "First 5 pages")).toBe(true);
    expect(covers("First 5 pages", "First 10 pages")).toBe(false);
    expect(covers("Query letter", "Query letter")).toBe(true);
    expect(covers("Query letter", "Synopsis")).toBe(false);
  });
  it("names what was not sent", () => {
    expect(askChips(["Query letter", "Synopsis", "First 10 pages"], ["Query letter", "First 10 pages"]).missing).toEqual(["Synopsis"]);
    expect(askChips(["Query letter"], ["Query letter"]).missing).toEqual([]);
  });
});

describe("the Materials tab (§2.7)", () => {
  it("each send is a block; an unsent request is a request block until it is sent", () => {
    const q = st("q", QueryStatus.QUERIED, 60, { chips: [{ label: "Letter", detail: "" }, { label: "10 pages", detail: "" }] });
    const pr = st("pr", QueryStatus.PARTIAL_REQUESTED, 16);
    const open = materialsTab([q, pr], { first: "Clara", nowMs: NOW, dueMs: NOW - 8 * DAY, writerTurn: true });
    expect(open.blocks.map((b) => [b.title, b.request, b.date])).toEqual([["Query sent", false, "9 Aug"], ["Partial to send", true, "8 days late"]]);
    expect(materialsSummary(open.summary, "Clara")).toBe("2 things sent to Clara · 1 request to send");
    const done = materialsTab([q, pr, st("ps", QueryStatus.PARTIAL_SENT, 2)], { first: "Clara", nowMs: NOW, dueMs: null, writerTurn: false });
    expect(done.blocks.some((b) => b.request)).toBe(false);
  });
});

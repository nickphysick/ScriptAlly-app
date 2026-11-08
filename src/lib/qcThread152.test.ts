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
  it("the disc is the status's cap colour; Query sent and a nudge have none (the record form's options)", () => {
    expect(discFill({ status: QueryStatus.QUERIED, kind: null })).toBe("transparent");
    expect(discFill({ status: null, kind: "nudge" })).toBe("transparent");
    expect(discFill({ status: QueryStatus.PARTIAL_REQUESTED, kind: null })).toBe("#f3d3c6");
    expect(discFill({ status: QueryStatus.FULL_SENT, kind: null })).toBe("#d3dce7");
  });
  it("v152.1 §2.1 only events: no Day 1, no today, no ending; your Query sent first and the latest step last", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 60), st("pr", QueryStatus.PARTIAL_REQUESTED, 16)], { ...ctx, state: "materials", replyMs: null });
    expect(t.map((x) => (x.t === "wait" ? x.label : x.side))).toEqual(["me", "44 days later", "them"]);
    const a = buildThread([st("q", QueryStatus.QUERIED, 23)], { ...ctx, state: "agent", replyMs: NOW + 33 * DAY });
    expect(a.map((x) => x.t)).toEqual(["msg"]);
  });
  /* v152.2 §2.2 (supersedes v152.1 §2.3) — a wait is "N days later" on the next message's side; none beside an undated step */
  it("v152.2 §2.2 a wait reads 'N days later'; no line beside an undated step, which keeps its place", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 100), st("pr", QueryStatus.PARTIAL_REQUESTED, 0, { ms: null }), st("ps", QueryStatus.PARTIAL_SENT, 20)], { ...ctx, state: "agent", replyMs: null });
    expect(t.map((x) => (x.t === "wait" ? x.label : x.key))).toEqual(["q", "pr", "ps"]);
    const w = buildThread([st("q", QueryStatus.QUERIED, 10), st("pr", QueryStatus.PARTIAL_REQUESTED, 10), st("ps", QueryStatus.PARTIAL_SENT, 9)], { ...ctx, state: "agent", replyMs: null });
    /* v53 (D9): no "Same day" line — the day pill says it; "x days later" stays for a real gap */
    expect(w.filter((x) => x.t === "wait").map((x) => x.t === "wait" ? [x.label, x.side] : null)).toEqual([["1 day later", "me"]]);
    expect(t.find((x) => x.t === "msg" && x.key === "pr")).toMatchObject({ date: "Not dated", dated: false, stamp: null, dayMs: null });
  });
  it("v152.1 §2.2 yours paper (no tint), theirs tinted by the reply; a pass and your closes grey", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 90), st("fr", QueryStatus.FULL_REQUESTED, 60), st("rr", QueryStatus.REVISE_RESUBMIT, 40), st("x", QueryStatus.REJECTED, 20)], { ...ctx, state: "closed", replyMs: null });
    const m = t.filter((x) => x.t === "msg") as Extract<(typeof t)[number], { t: "msg" }>[];
    expect(m.map((x) => x.tint?.fill ?? null)).toEqual([null, "#e7edf4", "#e7edf4", "#f1efec"]);
    expect(m.map((x) => x.grey)).toEqual([false, false, false, true]);
    /* v53 (D9): the thread reads as messages */
    expect(m.map((x) => x.title)).toEqual([`You sent ${ctx.first} your query`, `${ctx.first.charAt(0).toUpperCase()}${ctx.first.slice(1)} asked for your full manuscript`,
      `${ctx.first.charAt(0).toUpperCase()}${ctx.first.slice(1)} asked you to revise and resubmit`, `${ctx.first.charAt(0).toUpperCase()}${ctx.first.slice(1)} passed`]);
  });
  it("v152.1 §2.4 a nudge quotes the query, and counts itself from the 2nd", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 90), st("n1", null, 60, { kind: "nudge" }), st("n2", null, 30, { kind: "nudge" })], { ...ctx, state: "agent", replyMs: null });
    const n = t.filter((x) => x.t === "msg" && x.kind === "nudge") as Extract<(typeof t)[number], { t: "msg" }>[];
    expect(n.map((x) => [x.side, x.follows, x.nth])).toEqual([["me", "Query sent · 10 Jul", null], ["me", "Query sent · 10 Jul", "2nd nudge"]]);
  });
  it("v152.1 §2.6 a quote on an agent step only; told other agents is yours", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 90, { quote: "not mine" }), st("o", QueryStatus.OFFER, 10, { quote: " I’d love to " }), st("t", null, 9, { kind: "told", toldCount: 6 })], { ...ctx, state: "offer", replyMs: null });
    const m = t.filter((x) => x.t === "msg") as Extract<(typeof t)[number], { t: "msg" }>[];
    expect(m.map((x) => x.quote)).toEqual([null, "I’d love to", null]);
    expect(m[2]).toMatchObject({ side: "me", title: "You told 6 agents about the offer" });
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

describe("v152.1 §3 the footer: where it stands, one bar per state", () => {
  const base = { first: "Priya", nowMs: NOW, replyMs: null as number | null, closedMs: null as number | null, dueMs: null as number | null };
  it("materials, R&R and the offer: the stage glyph on its tint, a navy action", () => {
    expect(replyBox({ ...base, state: "materials", status: QueryStatus.FULL_REQUESTED, dueMs: NOW + 7 * DAY })).toMatchObject({ icon: { k: "stage", tint: "#e7edf4" }, lead: "Send the full", sub: "7 days left · by 15 Oct", button: "Mark full sent", tone: "navy" });
    expect(replyBox({ ...base, state: "materials", status: QueryStatus.PARTIAL_REQUESTED, dueMs: NOW - 8 * DAY })).toMatchObject({ sub: "8 days late", late: true, button: "Mark partial sent" });
    expect(replyBox({ ...base, first: "Jonathan", state: "materials", status: QueryStatus.REVISE_RESUBMIT, steps: [st("rr", QueryStatus.REVISE_RESUBMIT, 7)] })).toMatchObject({ lead: "Revise and resubmit", sub: "Jonathan asked on 1 Oct", button: "Mark revision sent" });
    expect(replyBox({ ...base, first: "Tom", state: "offer", status: QueryStatus.OFFER, dueMs: NOW + DAY })).toMatchObject({ icon: { k: "stage", tint: "#e5eddf" }, lead: "Tom made an offer", sub: "1 day left · answer by 9 Oct", button: "Answer the offer", second: { label: "Tell other agents", act: "tell" } });
    const told = replyBox({ ...base, first: "Tom", state: "offer", status: QueryStatus.OFFER, dueMs: NOW + DAY, steps: [st("t", null, 1, { kind: "told", toldCount: 6, via: "offer deadline 16 Oct" })] });
    expect(told).toMatchObject({ sub: "You told 6 others · deadline 16 Oct", second: null });
  });
  it("nudge due, with the agent, gone quiet: a clock or the ring, an outlined action", () => {
    expect(replyBox({ ...base, state: "nudge", status: QueryStatus.QUERIED, replyMs: NOW - 12 * DAY })).toMatchObject({ icon: { k: "clock" }, lead: "No reply from Priya yet", sub: "Reply was due 26 Sep · 12 days ago", late: true, button: "Nudge", tone: "outline" });
    const a = replyBox({ ...base, state: "agent", status: QueryStatus.QUERIED, replyMs: NOW + 3 * DAY, steps: [st("q", QueryStatus.QUERIED, 9)] });
    expect(a).toMatchObject({ lead: "Waiting on Priya", sub: "Reply expected by 11 Oct", button: "Record a response" });
    expect(a.icon.k === "ring" && a.icon.p).toBeCloseTo(9 / 12);
    expect(replyBox({ ...base, state: "agent", status: QueryStatus.QUERIED, replyMs: NOW + 16 * DAY, quietWeeks: 4, steps: [st("q", QueryStatus.QUERIED, 99), st("n", null, 12, { kind: "nudge" })] }))
      .toMatchObject({ sub: "Quiet after 4 weeks · 16 days to go" });
    expect(replyBox({ ...base, first: "Daniel", state: "quiet", status: QueryStatus.QUERIED, replyMs: NOW - 4 * DAY })).toMatchObject({ icon: { k: "clock" }, lead: "No reply from Daniel", sub: "Quiet since 4 Oct · close it, or keep waiting", button: "Close it" });
  });
  it("closed: the grey glyph, who closed it and when, Reopen", () => {
    expect(replyBox({ ...base, first: "Jonathan", state: "closed", status: QueryStatus.REJECTED, closedMs: NOW - 3 * DAY, steps: [st("q", QueryStatus.QUERIED, 90), st("fs", QueryStatus.FULL_SENT, 30), st("x", QueryStatus.REJECTED, 3)] }))
      .toMatchObject({ icon: { k: "grey" }, lead: "Jonathan passed", sub: "On 5 Oct · after the full", button: "Reopen" });
    expect(replyBox({ ...base, state: "closed", status: QueryStatus.WITHDRAWN, closedMs: NOW - 3 * DAY, reason: "signed elsewhere" })).toMatchObject({ lead: "You withdrew", sub: "5 Oct · signed elsewhere", button: "Reopen" });
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

describe("v152.1 follow-up: a holding reply", () => {
  it("is white with the agent hairline, never the pass's grey, and carries its note", () => {
    const t = buildThread([st("q", QueryStatus.QUERIED, 30), st("h", null, 10, { kind: "holding", quote: "Thanks — reading now." })], { ...ctx, state: "agent", replyMs: null });
    const h = t.find((x) => x.t === "msg" && x.kind === "holding") as Extract<(typeof t)[number], { t: "msg" }>;
    expect(h).toMatchObject({ side: "them", tint: { fill: "#ffffff", edge: "#e3dbd0" }, grey: false, quote: "Thanks — reading now." });
  });
});

describe("v53 (D9) — the thread reads as messages", () => {
  it("every event type's words, by first name, and 'the agent' when none is saved; never he or she", async () => {
    const { msgTitle } = await import("./qcThread152");
    const all: [Parameters<typeof msgTitle>[0], string][] = [
      [{ status: QueryStatus.QUERIED, kind: null }, "You sent Jonathan your query"],
      [{ status: QueryStatus.PARTIAL_REQUESTED, kind: null }, "Jonathan asked for a partial"],
      [{ status: QueryStatus.PARTIAL_REQUESTED, kind: null, askedFor: "The first three chapters" }, "Jonathan asked for the first three chapters"],
      [{ status: QueryStatus.PARTIAL_SENT, kind: null }, "You sent Jonathan your partial"],
      [{ status: QueryStatus.FULL_REQUESTED, kind: null }, "Jonathan asked for your full manuscript"],
      [{ status: QueryStatus.FULL_SENT, kind: null }, "You sent Jonathan your full manuscript"],
      [{ status: QueryStatus.REVISE_RESUBMIT, kind: null }, "Jonathan asked you to revise and resubmit"],
      [{ status: QueryStatus.RESUBMITTED, kind: null }, "You sent Jonathan your revision"],
      [{ status: QueryStatus.OFFER, kind: null }, "Jonathan offered"],
      [{ status: QueryStatus.REJECTED, kind: null }, "Jonathan passed"],
      [{ status: QueryStatus.NO_RESPONSE, kind: null }, "You closed it: no reply"],
      [{ status: QueryStatus.WITHDRAWN, kind: null }, "You withdrew your query"],
      [{ status: QueryStatus.WITHDRAWN, kind: null, event: "offer_declined" }, "You turned down Jonathan’s offer"],
      [{ status: QueryStatus.SIGNED, kind: null }, "You accepted Jonathan’s offer"],
      [{ status: null, kind: "nudge" }, "You nudged Jonathan"],
      [{ status: null, kind: "holding" }, "Jonathan sent a holding reply"],
      [{ status: null, kind: "told", toldCount: 2 }, "You told 2 agents about the offer"],
    ];
    for (const [s, words] of all) expect(msgTitle(s, "Jonathan")).toBe(words);
    expect(msgTitle({ status: QueryStatus.REJECTED, kind: null }, "the agent")).toBe("The agent passed");
    expect(msgTitle({ status: QueryStatus.QUERIED, kind: null }, "the agent")).toBe("You sent the agent your query");
    const every = all.map(([s]) => msgTitle(s, "the agent")).join(" ");
    expect(every).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
  });
  it("the stamp and the day pill", async () => {
    const { stampOf, dayPill } = await import("./qcThread152");
    const now = new Date(2026, 10, 8, 15).getTime();
    expect(stampOf(new Date(2024, 3, 2, 9).getTime())).toBe("2 Apr");
    expect(dayPill(new Date(2026, 10, 8, 9).getTime(), now)).toBe("Today");
    expect(dayPill(new Date(2026, 10, 7, 23).getTime(), now)).toBe("Yesterday");
    expect(dayPill(new Date(2024, 3, 2, 9).getTime(), now)).toBe("2 April 2024");
  });
});

import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { DEFAULT_QUIET_WEEKS, daysQuiet, quickOf, queryState, quietWeeksOf, replyExpectedMs, stampRows, type StateInput } from "./queryState";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const c4 = { quietWeeks: 4, nowMs: NOW };

const agentRow = (o: Partial<StateInput> & { replyAgo?: number | null; nudgeAgo?: number; planAgo?: number; sentAgo?: number } = {}): StateInput => ({
  status: QueryStatus.QUERIED,
  expectedMs: o.replyAgo === null ? null : NOW - (o.replyAgo ?? -10) * DAY,
  stageStartMs: NOW - (o.sentAgo ?? 60) * DAY,
  sentMs: NOW - (o.sentAgo ?? 60) * DAY,
  query: {
    dateSent: iso(o.sentAgo ?? 60),
    ...(o.nudgeAgo != null ? { lastNudgeSentDate: iso(o.nudgeAgo) } : {}),
    ...(o.planAgo != null ? { nudgeDate: iso(o.planAgo) } : {}),
  },
  nrmn: o.nrmn ?? false,
  ...(o.status ? { status: o.status } : {}),
});

describe("queryState — the six states (v152 §1.1–1.2)", () => {
  it("the writer's court: an offer, and materials requested", () => {
    expect(queryState(agentRow({ status: QueryStatus.OFFER }), c4)).toBe("offer");
    expect(queryState(agentRow({ status: QueryStatus.PARTIAL_REQUESTED }), c4)).toBe("materials");
    expect(queryState(agentRow({ status: QueryStatus.FULL_REQUESTED }), c4)).toBe("materials");
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]) expect(queryState(agentRow({ status: s }), c4)).toBe("closed");
  });
  it("inside the reply time is with the agent; the reply date itself still is", () => {
    expect(queryState(agentRow({ replyAgo: -5 }), c4)).toBe("agent");
    expect(queryState({ ...agentRow(), expectedMs: NOW }, c4)).toBe("agent");
  });
  it("not nudged: Nudge due from the reply date, Gone quiet once the window has passed since it", () => {
    expect(queryState(agentRow({ replyAgo: 1 }), c4)).toBe("nudge");
    expect(queryState(agentRow({ replyAgo: 28 }), c4)).toBe("nudge");
    expect(queryState(agentRow({ replyAgo: 29 }), c4)).toBe("quiet");
  });
  it("no reply means no: Gone quiet on the reply date, never Nudge due", () => {
    expect(queryState(agentRow({ replyAgo: 1, nrmn: true }), c4)).toBe("quiet");
    expect(queryState(agentRow({ replyAgo: -1, nrmn: true }), c4)).toBe("agent");
  });
  it("nudged: with the agent until the nudge plus the window, then Gone quiet — and the window is the setting's", () => {
    const within = agentRow({ replyAgo: 40, nudgeAgo: 20 });
    expect(queryState(within, c4)).toBe("agent");
    expect(replyExpectedMs(within, c4)).toBe(NOW - 20 * DAY + 28 * DAY);
    expect(queryState(within, { quietWeeks: 2, nowMs: NOW })).toBe("quiet");
    expect(queryState(agentRow({ replyAgo: 70, nudgeAgo: 30 }), c4)).toBe("quiet");
  });
  it("THE MUTATION L1 NAMES: ignoring the nudge would put a nudged-within-window query in Gone quiet", () => {
    const within = agentRow({ replyAgo: 40, nudgeAgo: 20 });
    expect(queryState({ ...within, query: { dateSent: within.query.dateSent } }, c4)).toBe("quiet");
    expect(queryState(within, c4)).toBe("agent");
  });
  it("the nudge falls back to nudgeDate, but a future plan or a nudge before the latest send is no nudge", () => {
    expect(queryState(agentRow({ replyAgo: 40, planAgo: 10 }), c4)).toBe("agent");
    expect(queryState(agentRow({ replyAgo: 40, planAgo: -3 }), c4)).toBe("quiet");
    expect(queryState(agentRow({ replyAgo: 40, sentAgo: 30, nudgeAgo: 45 }), c4)).toBe("quiet");
  });
  it("an undated stage keeps the 84-day rule", () => {
    expect(queryState(agentRow({ replyAgo: null, sentAgo: 80 }), c4)).toBe("agent");
    expect(queryState(agentRow({ replyAgo: null, sentAgo: 90 }), c4)).toBe("quiet");
  });
  it("Your move covers Offers, Materials requested and Nudge due; Gone quiet is its own", () => {
    expect(["offer", "materials", "nudge"].map((s) => quickOf(s as never))).toEqual(["you", "you", "you"]);
    expect(quickOf("quiet")).toBe("quiet");
    expect(quickOf("agent")).toBe("agent");
  });
  it("days quiet count from the reply date", () => {
    expect(daysQuiet(agentRow({ replyAgo: 40 }), c4)).toBe(40);
  });
  it("the setting reads todoPrefs.queries.quietWeeks, defaulting to 4, refusing a value it does not offer", () => {
    expect(quietWeeksOf(null)).toBe(DEFAULT_QUIET_WEEKS);
    expect(quietWeeksOf({ todoPrefs: { queries: { quietWeeks: 6 } } })).toBe(6);
    expect(quietWeeksOf({ todoPrefs: { queries: { quietWeeks: 5 } } })).toBe(4);
  });
  it("stampRows applies the agent's no-reply-means-no, and the query's override over it", () => {
    const base = { ...agentRow({ replyAgo: 2 }), query: { ...agentRow({ replyAgo: 2 }).query, agentId: "a1" } };
    const [plain] = stampRows([base], [{ id: "a1", noResponseMeansNo: false }], c4);
    const [nrmn] = stampRows([base], [{ id: "a1", noResponseMeansNo: true }], c4);
    const [over] = stampRows([{ ...base, query: { ...base.query, nrmnOverride: false } }], [{ id: "a1", noResponseMeansNo: true }], c4);
    expect([plain.qs, nrmn.qs, over.qs]).toEqual(["nudge", "quiet", "nudge"]);
  });
});

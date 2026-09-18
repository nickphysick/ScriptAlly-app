/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashWeekMix — the week popup's breakdown (v33, 18 Sep).
 *
 * ⚠️ THE LOCK: THE ROWS SUM TO THE HEADLINE, AND THE HEADLINE IS THE LEDGER'S. Asserted as a property
 * over a mixed fixture at EVERY weekly close in its record — two derivations against each other,
 * never a literal on both sides — and with every branch entered: dated replay, today's read-through,
 * a provisional rung, a query closed and reopened.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Activity, type Query } from "../types";
import { aggregateLedger, dailyLedger } from "./oneScreen";
import { activeAt, indexActivities, MIX_STAGES, stageAt, stageLabel, weekMix } from "./dashWeekMix";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
const TODAY = new Date(2026, 8, 17).getTime();
let seq = 0;
const q = (id: string, status: QueryStatus, sent: number, over: Record<string, unknown> = {}): Query =>
  ({ id, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent: ago(sent), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus, n: number, over: Record<string, unknown> = {}): Activity =>
  ({ id: `v${++seq}`, queryId, resultingStatus, date: ago(n), description: "", ...over } as unknown as Activity);

const QUERIES = [
  q("plain", QueryStatus.QUERIED, 100),
  q("moved", QueryStatus.FULL_SENT, 90),
  q("closed", QueryStatus.REJECTED, 80, { lastStatusChange: ago(30) }),
  q("imported", QueryStatus.PARTIAL_SENT, 70),
  q("offer", QueryStatus.OFFER, 60),
  q("draft", QueryStatus.QUERIED, 0, { dateSent: undefined }),
];
const LOG = [
  act("moved", QueryStatus.QUERIED, 90), act("moved", QueryStatus.FULL_REQUESTED, 50), act("moved", QueryStatus.FULL_SENT, 40),
  act("closed", QueryStatus.QUERIED, 80), act("closed", QueryStatus.PARTIAL_REQUESTED, 60), act("closed", QueryStatus.REJECTED, 30),
  act("imported", QueryStatus.QUERIED, 70),
  act("imported", QueryStatus.PARTIAL_REQUESTED, 70, { dateProvisional: true }),
  act("imported", QueryStatus.PARTIAL_SENT, 70, { dateProvisional: true }),
  act("offer", QueryStatus.QUERIED, 60), act("offer", QueryStatus.OFFER, 10),
];
const index = indexActivities(LOG);

describe("⚠️ the rows sum to the headline, and the headline is the ledger's", () => {
  const weekly = aggregateLedger(dailyLedger(QUERIES, NOW), "weekly");
  it("at every weekly close in the record", () => {
    expect(weekly.length).toBeGreaterThan(10);
    const seen = { undated: 0, staged: 0, today: 0 };
    for (const p of weekly) {
      const mix = weekMix(QUERIES, index, p.end.getTime(), NOW);
      const rows = mix.rows.reduce((n, r) => n + r.count, 0) + mix.undated;
      expect(rows, `week of ${p.label}: rows sum to the headline`).toBe(mix.total);
      expect(mix.total, `week of ${p.label}: the headline is the ledger's active stock`).toBe(p.active);
      if (mix.undated) seen.undated += 1;
      if (mix.rows.length) seen.staged += 1;
      if (p.end.getTime() >= TODAY) seen.today += 1;
    }
    /* ⚠️ EVERY BRANCH WAS ENTERED — a fixture that drifts into one state must fail, not go green */
    expect(seen.undated, "some week held a stage that is not dated").toBeGreaterThan(0);
    expect(seen.staged).toBeGreaterThan(0);
    expect(seen.today, "the last point read today's statuses").toBe(1);
  });
  it("rows come in pipeline order and a stage with none is omitted", () => {
    const mix = weekMix(QUERIES, index, NOW.getTime() - 45 * DAY, NOW);
    const order = mix.rows.map((r) => MIX_STAGES.indexOf(r.status));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(mix.rows.every((r) => r.count > 0)).toBe(true);
  });
});

describe("the stage a query stood at", () => {
  const by = (id: string) => QUERIES.find((x) => x.id === id)!;
  it("replays the dated log: before a rung it has not happened, after it it has", () => {
    expect(stageAt(by("moved"), index.get("moved"), NOW.getTime() - 55 * DAY, TODAY)).toBe(QueryStatus.QUERIED);
    expect(stageAt(by("moved"), index.get("moved"), NOW.getTime() - 45 * DAY, TODAY)).toBe(QueryStatus.FULL_REQUESTED);
    expect(stageAt(by("moved"), index.get("moved"), NOW.getTime() - 35 * DAY, TODAY)).toBe(QueryStatus.FULL_SENT);
  });
  it("a query with no log at all has been Queried since it was sent", () => {
    expect(stageAt(by("plain"), undefined, NOW.getTime() - 20 * DAY, TODAY)).toBe(QueryStatus.QUERIED);
  });
  it("⚠️ a provisional rung makes the stage UNKNOWABLE in between — null, never the rung before or after", () => {
    expect(stageAt(by("imported"), index.get("imported"), NOW.getTime() - 20 * DAY, TODAY)).toBeNull();
  });
  it("⚠️ …but TODAY is read off the query, so the last point agrees with the rest of the app", () => {
    expect(stageAt(by("imported"), index.get("imported"), NOW.getTime(), TODAY)).toBe(QueryStatus.PARTIAL_SENT);
  });
  it("a provisional rung that repeats the base changes nothing", () => {
    const log = [act("x", QueryStatus.QUERIED, 50), act("x", QueryStatus.QUERIED, 50, { dateProvisional: true })];
    expect(stageAt(q("x", QueryStatus.QUERIED, 50), log, NOW.getTime() - 10 * DAY, TODAY)).toBe(QueryStatus.QUERIED);
  });
  it("a replay that lands on a closed status claims no stage — the line counted it, the rows do not guess", () => {
    /* closed on day 30 by the log, but the ledger's close is day 5: between them the two disagree */
    const reopened = q("r", QueryStatus.REJECTED, 80, { lastStatusChange: ago(5) });
    const log = [act("r", QueryStatus.QUERIED, 80), act("r", QueryStatus.REJECTED, 30)];
    expect(activeAt(reopened, NOW.getTime() - 20 * DAY)).toBe(true);
    expect(stageAt(reopened, log, NOW.getTime() - 20 * DAY, TODAY)).toBeNull();
  });
});

describe("the ledger's question, asked of one query", () => {
  it("unsent is never active; sent is active from its send; closed stops at its close", () => {
    expect(activeAt(QUERIES[5], NOW.getTime())).toBe(false);
    expect(activeAt(QUERIES[0], NOW.getTime() - 101 * DAY)).toBe(false);
    expect(activeAt(QUERIES[0], NOW.getTime() - 99 * DAY)).toBe(true);
    expect(activeAt(QUERIES[2], NOW.getTime() - 31 * DAY)).toBe(true);
    expect(activeAt(QUERIES[2], NOW.getTime() - 29 * DAY)).toBe(false);
  });
});

describe("the words", () => {
  it("the enum's own, in sentence case", () => {
    expect(stageLabel(QueryStatus.PARTIAL_REQUESTED)).toBe("Partial requested");
    expect(stageLabel(QueryStatus.FULL_SENT)).toBe("Full sent");
    expect(stageLabel(QueryStatus.REVISE_RESUBMIT)).toBe("Revise & resubmit");
  });
});

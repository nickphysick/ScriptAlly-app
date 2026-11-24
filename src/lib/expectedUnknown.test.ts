/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2.1.1 — THE WRITER'S "UNKNOWN" WINS OVER A FALLBACK (lib/expectedDate `resolveExpectedDate`, read by
 * lib/qcSummary `expectedFor`, the card's reply date). When the writer says a reply time is unknown, the save stamps
 * `writerExpectedSetAt` with no `writerExpectedDate`: a statement, made then, of no date. Before this, nothing was stored
 * and the card fell back to the house window (12 weeks for a partial or full sent) or the agent's weeks.
 *
 *   E1  a writer's Unknown (stamp, no date) beats the agency's window and the house window → no date
 *   E2  a writer's date is unchanged (it is the date)
 *   E3  nothing stated is unchanged (the agency's window, then nothing)
 *   E4  recency still holds: a reply stated AFTER the writer's Unknown wins; one stated before loses
 *   E5  the card's row: Partial sent with Unknown has no expected date; without it, the house window (unchanged)
 *   E6  Record a response's save: "Yes, it's gone" with Unknown stamps the statement and clears the date and the nudge
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("./firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Query } from "../types";
import { resolveExpectedDate } from "./expectedDate";
import { expectedFor } from "./qcSummary";
import { planOfResponse, type RespAnswers } from "./queryActions/respondStages";

const DAY = 86_400_000;
const SENT = new Date(2026, 10, 24, 12).getTime();
const q = (over: Record<string, unknown> = {}) => ({ id: "q1", userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-08-16", ...over }) as unknown as Query;
const unknownAt = (t: number) => ({ writerExpectedSetAt: new Date(t).toISOString() });

describe("the writer's Unknown wins over a fallback (v2.1.1)", () => {
  it("E1 Unknown beats the agency's window", () => {
    expect(resolveExpectedDate(q(unknownAt(SENT)), SENT, 12)).toEqual({ ms: null, source: "writer" });
  });
  it("E2 a writer's date is the date", () => {
    const d = new Date(2027, 0, 18, 12).toISOString();
    expect(resolveExpectedDate(q({ writerExpectedDate: d, writerExpectedSetAt: new Date(SENT).toISOString() }), SENT, 12)).toEqual({ ms: new Date(d).getTime(), source: "writer" });
  });
  it("E3 nothing stated: the agency's window, then nothing", () => {
    expect(resolveExpectedDate(q(), SENT, 12)).toEqual({ ms: SENT + 84 * DAY, source: "agent" });
    expect(resolveExpectedDate(q(), SENT, null)).toEqual({ ms: null, source: null });
  });
  it("E4 recency: a later reply beats Unknown, an earlier one does not", () => {
    const reply = (statedAt: number) => ({ ms: SENT + 30 * DAY, statedAt });
    expect(resolveExpectedDate(q(unknownAt(SENT)), SENT, 12, reply(SENT + DAY))).toEqual({ ms: SENT + 30 * DAY, source: "reply" });
    expect(resolveExpectedDate(q(unknownAt(SENT)), SENT, 12, reply(SENT - DAY))).toEqual({ ms: null, source: "writer" });
  });
  it("E5 the card's row: Partial sent with Unknown has no date; without it, the house window", () => {
    const ps = { status: QueryStatus.PARTIAL_SENT, partialSentDate: new Date(SENT).toISOString() };
    expect(expectedFor(q({ ...ps, ...unknownAt(SENT) }), null).ms).toBe(null);
    expect(expectedFor(q(ps), null).ms).toBe(SENT + 84 * DAY);
  });
  it("E6 the save: gone with Unknown stamps the statement, clears the date and the nudge", () => {
    const now = SENT;
    const a: RespAnswers = {
      kind: "pr", when: new Date(2026, 10, 24).getTime(), ask: { sample: true, full: false, syn: false, other: false }, extras: [], otherTx: "",
      samp: { unit: "pages", amt: 50, from: 1, sect: false, fu: null }, sentQ: "yes", sentMs: new Date(2026, 10, 24).getTime(),
      went: { main: true, syn: false, x: [] }, wsamp: null, synName: null, verId: null, sendBy: null, expectBy: null, nudgeOn: null,
      words: "", rrNext: null, rrBy: null, ofBy: null, others: null,
    };
    const queried = { id: "s0", data: { type: QueryStatus.QUERIED, resultingStatus: QueryStatus.QUERIED, createdAt: new Date(2026, 7, 16, 12).toISOString(), note: "Queried", queryId: "q1" } };
    const plans = planOfResponse({ uid: "u", q: q(), agent: null, ms: null, existing: [queried], feed: [], nowMs: now, quietWeeks: 6 } as never, a, []);
    const patch = Object.assign({}, ...plans.map((p) => (p as { query?: Record<string, unknown> }).query ?? {})) as Record<string, unknown>;
    expect(patch.writerExpectedSetAt).toBe(new Date(now).toISOString());
    expect(patch.writerExpectedDate).toBe(undefined);
    expect("writerExpectedDate" in patch).toBe(true);
    expect(patch.nudgeDate).toBe(undefined);
  });
});

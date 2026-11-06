/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v51 — "Reply expected by {date}" after a new reply time is the Query Centre's own clock run with the new
 * weeks (a dry run), and only where the date moves. The fixture holds a query whose date the naive arithmetic (send +
 * weeks) would move and the real clock does not — a partial, which reads the house window — so the shortcut fails.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));
import { QueryStatus, type Agent, type Query } from "../../../types";
import { replyDatesMoved } from "./wsFlows";

const agent = { id: "a1", name: "Tom Ellery", agency: "Ellery & Finch" } as Agent;
const q = (id: string, status: QueryStatus, extra: Partial<Query> = {}) => ({ id, agentId: "a1", manuscriptId: "m1", status, dateSent: "2026-10-01T12:00:00.000Z", ...extra } as Query);
const ctx = { manuscripts: [{ id: "m1", title: "The Taloned Mr Ripley" }] as never, queries: [] as Query[] };

describe("replyDatesMoved", () => {
  it("a queried query's reply date moves to the send day plus the new weeks", () => {
    const out = replyDatesMoved({ ...ctx, queries: [q("q1", QueryStatus.QUERIED)] }, agent, 6);
    expect(out).toEqual([{ queryId: "q1", ms: Date.parse("2026-10-01T12:00:00.000Z") + 42 * 86400000, title: "The Taloned Mr Ripley" }]);
  });
  it("a partial reads the house window, so a new reply time moves nothing (the naive sum would say it did)", () => {
    expect(replyDatesMoved({ ...ctx, queries: [q("q2", QueryStatus.PARTIAL_SENT, { partialSentDate: "2026-10-05T12:00:00.000Z" })] }, agent, 6)).toEqual([]);
  });
  it("nothing for a closed query, a writer's-turn query, or another agent's", () => {
    const qs = [q("c", QueryStatus.REJECTED), q("w", QueryStatus.PARTIAL_REQUESTED), { ...q("o", QueryStatus.QUERIED), agentId: "a2" }];
    expect(replyDatesMoved({ ...ctx, queries: qs }, agent, 6)).toEqual([]);
  });
  it("the same weeks the card already holds move nothing", () => {
    expect(replyDatesMoved({ ...ctx, queries: [q("q1", QueryStatus.QUERIED)] }, { ...agent, responseTimeWeeks: 6 }, 6)).toEqual([]);
  });
});

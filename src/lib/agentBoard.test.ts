/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where an agent stands — DERIVED, every time, from the queries.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CLOSED, NO_QUERIES, agentQueryStanding, boardColumns, columnCaption, columnAccent,
  historyBucket, monthAdded, replyBucket, standingColumn, GROUPINGS,
} from "./agentBoard";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES } from "../components/agents/contactFixture";
import { Query, QueryStatus, SubmissionMethod } from "../types";
import { STATUS_ORDER } from "./statusOrder";

const q = (id: string, agentId: string, status: QueryStatus, dateSent: string, lastStatusChange?: string): Query => ({
  id, userId: "t", manuscriptId: "m", agentId, packageId: "", status, dateSent,
  personalisationNotes: "", sendMethod: SubmissionMethod.EMAIL,
  ...(lastStatusChange ? { lastStatusChange } : {}),
} as unknown as Query);

describe("agentQueryStanding — furthest-along open, else the most recent close", () => {
  it("no queries is a real answer, not an absence", () => {
    expect(agentQueryStanding("nobody", [])).toEqual({ kind: "none" });
    expect(standingColumn({ kind: "none" })).toBe(NO_QUERIES);
  });

  /* ⚠️ FURTHEST ALONG, NOT MOST RECENT. A rejection from March must not outrank a full request
     from last week, and the newest query is not the most advanced one. */
  it("takes the furthest along the journey, whatever order they were sent in", () => {
    const qs = [
      q("a", "x", QueryStatus.FULL_REQUESTED, "2026-01-01T00:00:00.000Z"),
      q("b", "x", QueryStatus.QUERIED, "2026-09-01T00:00:00.000Z"),
    ];
    expect(agentQueryStanding("x", qs)).toEqual({ kind: "open", status: QueryStatus.FULL_REQUESTED });
  });

  /* ⚠️ CLOSED QUERIES NEVER OUTRANK A LIVE ONE, however far they got. */
  it("ignores terminal queries entirely while anything is open", () => {
    const qs = [
      q("a", "x", QueryStatus.OFFER, "2026-01-01T00:00:00.000Z"),
      q("b", "x", QueryStatus.QUERIED, "2026-02-01T00:00:00.000Z"),
    ];
    qs[0] = { ...qs[0], status: QueryStatus.REJECTED } as Query;
    expect(agentQueryStanding("x", qs)).toEqual({ kind: "open", status: QueryStatus.QUERIED });
  });

  it("falls back to the most recently closed, by the derived audit field", () => {
    const qs = [
      q("a", "x", QueryStatus.REJECTED, "2026-01-01T00:00:00.000Z", "2026-01-05T00:00:00.000Z"),
      q("b", "x", QueryStatus.WITHDRAWN, "2026-02-01T00:00:00.000Z", "2026-08-05T00:00:00.000Z"),
    ];
    expect(agentQueryStanding("x", qs)).toEqual({ kind: "closed", status: QueryStatus.WITHDRAWN });
  });

  /* ⚠️ ALL THREE TERMINALS ARE ONE COLUMN. Three ways of being over would give three thin columns
     of the same fact and push the live journey off the right-hand edge. */
  it("every terminal status lands in the ONE closed column", () => {
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(standingColumn({ kind: "closed", status: s })).toBe(CLOSED);
    }
  });

  /* ⚠️ NOTHING IS STORED. The board recomputes for every card on every render and a cached field
     on the agent would be one line — and a second writer of a truth `recomputeQuery` owns, stale
     from the first status change that did not think to update it. */
  it("reads no field on the agent at all", () => {
    const src = readFileSync(new URL("./agentBoard.ts", import.meta.url), "utf8");
    expect(src, "the standing is being cached onto the agent").not.toMatch(/agent\.(standing|boardColumn|queryStatus|cachedStatus)/);
    expect(src, "a writer appeared in a read-time derivation").not.toMatch(/updateAgent|setDoc|updateDoc/);
  });
});

describe("the columns", () => {
  const A = CONTACT_FIXTURE_AGENTS;
  const Q = CONTACT_FIXTURE_QUERIES;

  /* ⚠️ THE POPULATION FIRST — a board of one column proves nothing about grouping. */
  it("the fixture spreads across several status columns", () => {
    const cols = boardColumns(A, Q, "status").filter((c) => c.agents.length);
    expect(cols.length, "every agent landed in one column — the grouping is not separating anything").toBeGreaterThan(3);
    const total = cols.reduce((n, c) => n + c.agents.length, 0);
    expect(total, "agents were lost or double-counted by the grouping").toBe(A.length);
  });

  /* ⚠️ THE LADDER KEEPS ITS EMPTY RUNGS. You cannot see that nothing has reached Full sent if
     there is no Full sent column. */
  it("a fixed-order grouping renders its empty columns; a free one renders only what exists", () => {
    const status = boardColumns(A, Q, "status");
    expect(status.some((c) => c.agents.length === 0), "the journey lost its empty rungs").toBe(true);
    expect(status.map((c) => c.key).slice(0, 2)).toEqual([NO_QUERIES, String(STATUS_ORDER[0])]);
    const loc = boardColumns(A, Q, "loc");
    expect(loc.every((c) => c.agents.length > 0), "a free grouping invented an empty column").toBe(true);
  });

  /* ⚠️ THE ORDER IS BUILT FROM `STATUS_ORDER`, NOT TYPED OUT — a hand-written journey is a fourth
     copy of it, and it goes stale by silently dropping agents out of every column. */
  it("the status columns come from the canonical journey", () => {
    const keys = boardColumns(A, Q, "status").map((c) => c.key);
    for (const s of STATUS_ORDER) expect(keys, `${s} has no column`).toContain(String(s));
  });

  /* ⚠️ THE CAPTION READS THE CTA ENGINE, so the board cannot disagree with the command bar, the
     To-do flows or this page's own turn axis about whose move it is. */
  it("captions come from the ball-holder, and the two ends say so", () => {
    expect(columnCaption(NO_QUERIES)).toBe("not approached");
    expect(columnCaption(CLOSED)).toBe("closed");
    expect(columnCaption(String(QueryStatus.OFFER))).toBe("offer");
    expect(columnCaption(String(QueryStatus.QUERIED))).toBe("with the agent");
    expect(columnCaption(String(QueryStatus.PARTIAL_REQUESTED))).toBe("with you");
    const src = readFileSync(new URL("./agentBoard.ts", import.meta.url), "utf8");
    expect(src, "the caption is a hand table again — a fifth copy of whose-turn").toContain("getPrimaryAction(column as QueryStatus).ballHolder");
  });

  it("status columns take the v2 state accents; other groupings take the positional cycle", () => {
    expect(columnAccent(String(QueryStatus.PARTIAL_REQUESTED))).toBe("var(--state-you-deep)");
    expect(columnAccent(String(QueryStatus.FULL_SENT))).toBe("var(--state-agent-deep)");
    const loc = boardColumns(CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, "loc");
    expect(loc.every((c) => c.accent.startsWith("var(--state-")), "a country column invented a colour").toBe(true);
  });

  it("all seven groupings partition the list without losing anyone", () => {
    expect(GROUPINGS.length).toBe(7);
    for (const g of GROUPINGS) {
      const cols = boardColumns(A, Q, g.key);
      const total = cols.reduce((n, c) => n + c.agents.length, 0);
      expect(total, `${g.label} lost or duplicated agents`).toBe(A.length);
    }
  });
});

describe("the buckets", () => {
  it("a stated window falls in its band; an unstated one says so rather than becoming zero", () => {
    expect(replyBucket(4)).toBe("Within 4 weeks");
    expect(replyBucket(5)).toBe("5 to 8 weeks");
    expect(replyBucket(12)).toBe("9 to 12 weeks");
    expect(replyBucket(13)).toBe("Over 12 weeks");
    expect(replyBucket(undefined)).toBe("Not stated");
    expect(replyBucket(0), "a zero window read as a real band").toBe("Not stated");
  });

  it("history reuses the standing rather than re-deriving it", () => {
    expect(historyBucket({ kind: "none" })).toBe("Never queried");
    expect(historyBucket({ kind: "closed", status: QueryStatus.REJECTED })).toBe("Closed");
    expect(historyBucket({ kind: "open", status: QueryStatus.QUERIED })).toBe("Active queries");
  });

  it("an unparseable added date is stated, never rendered as an invalid month", () => {
    expect(monthAdded("2026-08-01T00:00:00.000Z")).toBe("Aug 2026");
    expect(monthAdded("not a date")).toBe("Not recorded");
  });
});

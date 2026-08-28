/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { bookFigures } from "./bookFigures";
import { Query, QueryStatus } from "../types";

/**
 * ⚠️ REAL ENUM MEMBERS. The first version of this fixture used `QueryStatus.SENT`, which does not
 * exist — vitest does not typecheck, so every case ran with `status: undefined`, was treated as
 * non-terminal, and passed. Eight green assertions about an input the system cannot produce.
 */
const q = (over: Partial<Query>): Query => ({
  id: "q", userId: "u", manuscriptId: "ms-1", agentId: "ag-1",
  status: QueryStatus.QUERIED, dateSent: "2026-01-10", sendMethod: "Email",
  ...over,
} as Query);

const val = (qs: Query[], key: string) => bookFigures(qs).find((f) => f.key === key)!.value;

describe("the book page's five figures", () => {
  it("states all five, in the ref's order", () => {
    expect(bookFigures([]).map((f) => f.label)).toEqual([
      "Queries sent", "Responses", "Still open", "Agents holding", "Last sent",
    ]);
  });

  /**
   * ⚠️ `0` WHERE ZERO IS TRUE, `—` WHERE NOTHING HAPPENED. A count of nought queries is a true
   * count; a last-sent date for a book never sent is not a date, and `0` there asserts an event.
   */
  it("an untouched book counts nought and dates nothing", () => {
    expect(val([], "sent")).toBe("0");
    expect(val([], "responses")).toBe("0");
    expect(val([], "open")).toBe("0");
    expect(val([], "holding")).toBe("0");
    expect(val([], "last"), "a book never sent was given a date").toBe("—");
  });

  /** ⚠️ TERMINAL IS EXACTLY Rejected / Withdrawn / No Response — the app's set, not a second one. */
  it("closed queries leave the open count and stay in the total", () => {
    const qs = [
      q({ id: "a", status: QueryStatus.QUERIED }),
      q({ id: "b", status: QueryStatus.REJECTED }),
      q({ id: "c", status: QueryStatus.WITHDRAWN }),
      q({ id: "d", status: QueryStatus.NO_RESPONSE }),
    ];
    expect(val(qs, "sent")).toBe("4");
    expect(val(qs, "open")).toBe("1");
  });

  /** An offer is not terminal — a live offer is very much still open. */
  it("an offer counts as open", () => {
    expect(val([q({ status: QueryStatus.OFFER })], "open")).toBe("1");
  });

  /**
   * ⚠️ AGENTS HOLDING COUNTS DISTINCT AGENTS, NOT QUERIES. Two open queries with one agent is one
   * agent holding your work; counting queries would state a number true of something else.
   */
  it("two open queries with one agent is one agent holding", () => {
    const qs = [q({ id: "a", agentId: "ag-1" }), q({ id: "b", agentId: "ag-1" })];
    expect(val(qs, "open")).toBe("2");
    expect(val(qs, "holding")).toBe("1");
  });

  it("a closed query's agent is not holding anything", () => {
    const qs = [q({ id: "a", agentId: "ag-1", status: QueryStatus.REJECTED }),
                q({ id: "b", agentId: "ag-2", status: QueryStatus.QUERIED })];
    expect(val(qs, "holding")).toBe("1");
  });

  it("last sent is the most recent, short-form", () => {
    const qs = [q({ id: "a", dateSent: "2026-01-10" }), q({ id: "b", dateSent: "2026-03-02" })];
    expect(val(qs, "last")).toBe("2 Mar");
  });

  /** ⚠️ REPORTS, NEVER APPRAISES — no verdict word may reach a label. */
  it("carries no verdict language", () => {
    const text = bookFigures([]).map((f) => `${f.label} ${f.value}`).join(" ").toLowerCase();
    for (const w of ["only", "already", "still need", "good", "slow", "poor", "strong"]) {
      expect(text, `a verdict reached the strip: ${w}`).not.toContain(w);
    }
  });
});

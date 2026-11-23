/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 · Phase 1 (D1) — ONE COUNT OF QUERIES SENT. Each surface's figure is computed by the expression its
 * own source uses (read from the file, so a surface that grows its own derivation again turns this red), over one book:
 *   24 queries, three of them undated → every surface says 24; one more dated tomorrow → still 24 (it has not gone).
 * Red before the change: the Dashboard's `sentAllTime` said 21 and the Queries page / Log a query said 25 with tomorrow's.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as dash2 from "../dash2";
import { reviewCounts } from "./logStages";
import { QueryStatus, type Query } from "../../types";

const qy = (i: number, dateSent: string): Query => ({ id: `q${i}`, userId: "u", agentId: `a${i}`, manuscriptId: "m", status: QueryStatus.QUERIED, dateSent } as unknown as Query);
const NOW = new Date(2026, 10, 23, 12);
/* 24 queries: three with no sent date, 21 dated in October */
const BOOK = Array.from({ length: 24 }, (_, i) => qy(i, i < 3 ? "" : "2026-10-01"));
const TOMORROW = qy(50, "2026-11-24");
const src = (p: string) => readFileSync(`src/${p}`, "utf8");

/** the Dashboard's "{n} queries sent": whichever lib/dash2 function its title calls */
function dashboard(book: Query[]): number {
  const m = src("components/dashboard/v2/Dash2Active.tsx").match(/sentCount\((\w+)\(queries, now\)\)/);
  expect(m, "the Dashboard's title reads a lib/dash2 count").not.toBeNull();
  const fn = (dash2 as unknown as Record<string, (q: Query[], n: Date) => number>)[m![1]];
  expect(typeof fn, `lib/dash2 exports ${m![1]}`).toBe("function");
  return fn(book, NOW);
}
/** the Queries page header's `sent:` — the one count, or (before) one per row */
function queriesPage(book: Query[]): number {
  const s = src("components/Queries.tsx");
  if (/sent: queriesSent\(qcScoped\.map\(\(r\) => r\.query\), now151\)/.test(s)) return dash2.queriesSent(book, NOW);
  if (/sent: qcScoped\.length,/.test(s)) return book.length;
  throw new Error("the Queries page header's count is neither");
}
/** Log a query's "Query number {n}" is the host's `count` + 1 */
function queryNumber(book: Query[]): number {
  const s = src("components/queries/centre/LogStagesHost.tsx");
  if (/count=\{queriesSent\(forBook, nowMs\)\}/.test(s)) return dash2.queriesSent(book, NOW) + 1;
  if (/count=\{queriesSentOf\(forBook\)\}/.test(s)) return book.length + 1;
  throw new Error("the host's count is neither");
}

describe("LAQ23-1 one count of queries sent (D1)", () => {
  it("24 queries, three undated: the Dashboard, the Queries page and Log a query's review all say 24", () => {
    expect(dashboard(BOOK)).toBe(24);
    expect(queriesPage(BOOK)).toBe(24);
    expect(reviewCounts(BOOK, null, NOW).sent[0]).toBe(24);
    expect(queryNumber(BOOK)).toBe(25);
  });
  it("one more, dated tomorrow, is not sent yet: every surface still says 24 (the review's next is 25)", () => {
    const book = [...BOOK, TOMORROW];
    expect(dashboard(book)).toBe(24);
    expect(queriesPage(book)).toBe(24);
    expect(reviewCounts(book, null, NOW).sent[0]).toBe(24);
    expect(queryNumber(book)).toBe(25);
    expect(reviewCounts(book, qy(99, "2026-11-23"), NOW).sent).toEqual([24, 25]);
  });
  it("the end of today still counts (a query sent today at 23:00)", () => {
    expect(dash2.queriesSent([qy(1, "2026-11-23T23:00:00")], NOW)).toBe(1);
  });
  it("only lib/dash2 derives it: no second count in src (v2.2's queriesSentOf and the Dashboard's sentAllTime are gone)", () => {
    const d = src("lib/dash2.ts");
    expect(d).not.toMatch(/export function sentAllTime/);
    expect(src("lib/queryActions/logStages.ts")).not.toMatch(/export const queriesSentOf/);
  });
});

describe("LAQ23-1b the Dashboard's line under the Sent weeks", () => {
  it("the words, one and many", () => {
    expect(dash2.undatedSentLine(3)).toBe("3 queries have no sent date, so they aren’t in the weeks above.");
    expect(dash2.undatedSentLine(1)).toBe("1 query has no sent date, so it isn’t in the weeks above.");
    expect(dash2.ADD_THE_DATES).toBe("Add the dates");
  });
  it("the undated are the ones with no sent date, and the weeks never draw them", () => {
    expect(dash2.undatedSentIds(BOOK)).toEqual(["q0", "q1", "q2"]);
    const weeks = dash2.dash2Weeks(BOOK, NOW).map((w) => ({ start: w.start }));
    const drawn = dash2.sentWeeks(BOOK, weeks, NOW).reduce((n, w) => n + w.n, 0);
    expect(drawn).toBe(21);
  });
  it("the line is under the plot in the Sent view only, with the link to the Queries page showing only those queries", () => {
    const s = src("components/dashboard/v2/Dash2Active.tsx");
    expect(s).toMatch(/\{mode === "sent" && undated\.length > 0 && \(/);
    expect(s).toMatch(/href=\{queriesForIds\(undated, UNDATED_FROM\)\}/);
    expect(src("components/dashboard/v58/Dash58.tsx")).toMatch(/onAddDates=\{\(ids\) => navigate\(queriesForIds\(ids, UNDATED_FROM\)\)\}/);
  });
});

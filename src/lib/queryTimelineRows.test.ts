/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre's Calendar adapter — the second caller of `laneBars`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../types";
import type { Query, Agent, Activity } from "../types";
import { queryTimelineRows, rowKeyFor } from "./queryTimelineRows";
import { stateFor, STATE_TOKEN } from "./queryCardFacts";

const TODAY = "2026-08-26";
const WIN_FROM = "2026-07-13";           /* today − 44, the board's own centring */
const DAYS = 90;

const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.QUERIED, dateSent: "2026-07-20T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);
const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: "a1", name: "P. Kaur", agency: "Kaur & Finch", ...over } as unknown as Agent);

const run = (queries: Query[], agents: Agent[] = [agent()], activities: Activity[] = []) =>
  queryTimelineRows({
    queries, agents, activities,
    winFrom: WIN_FROM, days: DAYS, today: TODAY,
    manuscriptTitle: (id) => id,
  });

describe("the adapter assembles laneBars' inputs and derives nothing itself", () => {
  it("⚠️ COMPUTES NO GEOMETRY OF ITS OWN — the whole point of a second caller", () => {
    /* ⚠️ A SOURCE CLAIM, DELIBERATELY. The property is "this file contains no date arithmetic",
       which is a fact about the file; a rendered check could only ever show that today's output
       happens to agree. Comments stripped first — the header EXPLAINS the ban and names what it
       bans, which a raw scan would read as the offence itself. */
    const src = readFileSync(join(__dirname, "queryTimelineRows.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const banned of ["getTime(", "setDate(", "Date.parse", "* 86400", "/ 86400", "86400000"]) {
      expect(src, `the adapter does its own date maths: ${banned}`).not.toContain(banned);
    }
    expect(src, "the adapter must call laneBars").toContain("laneBars(");
  });

  it("every query that draws something appears in exactly one lane — nothing dropped, nothing doubled", () => {
    /* ⚠️ THE BRIEF ASKED FOR "row count equals the filtered query count" AND THAT IS NOT THE MODEL.
       Rows are per AGENT with a lane per manuscript — To-do's shape, adopted so a lane COUNT (and
       so a row's HEIGHT) matches across the two pages. The honest conservation claim is this one:
       every query that draws is represented once. */
    const qs = [
      q({ id: "q1", manuscriptId: "m1" }),
      q({ id: "q2", manuscriptId: "m2" }),
      q({ id: "q3", agentId: "a2", manuscriptId: "m1" }),
    ];
    const { rows, barsByRow } = run(qs, [agent(), agent({ id: "a2", name: "R. Vale" } as Partial<Agent>)]);
    expect(rows.length, "one row per agent that draws").toBe(2);
    const lanes = rows.reduce((n, r) => n + r.lanes, 0);
    expect(lanes, "one lane per (agent, manuscript) that draws").toBe(3);
    const drawnQueryIds = new Set(
      [...barsByRow.values()].flatMap((b) => b.segments.map((s) => s.queryId)),
    );
    expect([...drawnQueryIds].sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("⚠️ ONE QUERY SPEAKS FOR A LANE, and it is the SHARED rule — a live one outranks a finished one", () => {
    const finished = q({ id: "old", status: QueryStatus.REJECTED, dateSent: "2026-07-15T09:00:00Z" });
    const live = q({ id: "new", status: QueryStatus.QUERIED, dateSent: "2026-07-20T09:00:00Z" });
    const { rows, barsByRow } = run([finished, live]);
    expect(rows.length).toBe(1);
    expect(rows[0].lanes, "two queries on one manuscript are ONE relationship").toBe(1);
    const ids = new Set(barsByRow.get(rows[0].key)!.segments.map((s) => s.queryId));
    expect([...ids], "the live query speaks for the lane").toEqual(["new"]);
  });

  it("the row's identity is the agent's, through the app's own naming helpers", () => {
    const { rows } = run([q({})]);
    expect(rows[0].name).toBe("P. Kaur");
    expect(rows[0].agency).toBe("Kaur & Finch");
    expect(rows[0].key).toBe(rowKeyFor(q({})));
  });

  it("⚠️ A TERMINAL QUERY WITH NO RECORDED CLOSE DRAWS NOTHING — inherited, not introduced", () => {
    /* ⚠️ THIS IS THE BOARD'S OWN LAW AND IT REACHES QUERY CENTRE UNCHANGED. `laneBars` needs a close
       EVENT to end a terminal bar; with none there is no end, and it draws no segment and no node
       rather than inventing one. Measured directly against `laneBars`: a `Queried` query yields one
       segment, the same query `Rejected` yields zero.

       It matters more here than on To-do, because the Queries list shows closed queries and a reader
       may expect them on the calendar. It is carried behaviour, flagged in the report, and NOT
       something this run may change — the two boards must agree. */
    const shut = run([q({ id: "b", status: QueryStatus.REJECTED })]);
    expect(shut.rows.length, "a closed query with no recorded close has nothing to draw").toBe(0);
    const open = run([q({ id: "a", status: QueryStatus.QUERIED })]);
    expect(open.rows[0].closed).toBe(false);
    /* the band the board paints follows the status, and the token is the CARD's */
    expect(STATE_TOKEN[stateFor(QueryStatus.REJECTED)]).toBe("var(--state-closed)");
  });

  it("⚠️ A ROW WITH NOTHING IN THE WINDOW IS NOT DRAWN — an empty lane states nothing", () => {
    /* sent years before the window and long closed: no segment, no node, no row */
    const ancient = q({ id: "z", status: QueryStatus.REJECTED, dateSent: "2019-01-01T09:00:00Z" });
    const { rows } = run([ancient]);
    expect(rows.every((r) => r.key !== rowKeyFor(ancient)) || rows.length === 0).toBe(true);
  });

  it("a query with no agent still gets a row of its own rather than vanishing", () => {
    const orphan = q({ id: "o", agentId: null as unknown as string });
    const { rows } = run([orphan], []);
    expect(rows.length, "an unresolvable agent is not a reason to drop a wait").toBe(1);
  });
});

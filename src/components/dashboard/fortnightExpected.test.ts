/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F2 (holding-reply pack) — "Response expected" survives the provenance pack.
 *
 * ⚠️ THIS MODULE HAD NO TESTS EITHER, AND THE REGRESSION WAS SILENT IN BOTH DIRECTIONS. The
 * provenance pack stopped `addQuery` seeding `responseDeadline` AND added a migration that deletes
 * every stored copy the agency's window can explain. This panel read that field and nothing else,
 * so its events simply stopped existing: no error, no failing test, no empty state — the dates were
 * there one day and absent the next, on the queries most likely to need chasing.
 *
 * ⚠️ THE FIXTURES CARRY NO `responseDeadline`, ON PURPOSE. That is the shape of every query the app
 * can create today, and of every migrated one; a fixture that set the field would test the world as
 * it was before the pack and pass whatever the code did.
 */
import { describe, it, expect } from "vitest";
import { deriveFortnightEvents } from "./fortnightEvents";
import { QueryStatus } from "../../types";

const DAY = 86400000;
const NOW = new Date("2026-08-18T12:00:00.000Z");
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

const query = (over: Record<string, unknown> = {}) =>
  ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: iso(-30), ...over }) as never;
const agent = (over: Record<string, unknown> = {}) => ({ id: "a1", name: "Aisha Bello", agency: "Quill", ...over }) as never;
const ms = () => ({ id: "m1", title: "The Smoke Test" }) as never;

const expectedEvents = (queries: never[], agents: never[]) =>
  deriveFortnightEvents(queries, agents, [ms()], [], NOW).filter((e) => e.type.startsWith("expected_"));

describe("F2 · the expected-reply event reads the resolver", () => {
  /**
   * ⚠️ THE REGRESSION ITSELF. Sent fifty days ago, an agency stating eight weeks: the reply falls
   * six days from now — inside the panel's ±7-day window — and before this fix it showed NOTHING,
   * because the query carries no stored deadline to read.
   */
  it("derives the date from the agency's window when nothing is stored", () => {
    const events = expectedEvents([query({ dateSent: iso(-50) })], [agent({ responseTimeWeeks: 8 })]);
    expect(events, "the panel went quiet — the field it read is no longer written").toHaveLength(1);
    expect(events[0].type).toBe("expected_upcoming");
    expect(events[0].line).toBe("Response expected");
  });

  it("and past that window it reads as elapsed, not as nothing", () => {
    const events = expectedEvents([query({ dateSent: iso(-60) })], [agent({ responseTimeWeeks: 8 })]);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("expected_overdue");
    expect(events[0].urgency).toBe("elapsed");
  });

  /**
   * ⚠️ THE WRITER'S OWN DATE WINS, and it is the field the migration adopts into — so a query the
   * migration touched keeps its date on this panel instead of losing it.
   */
  it("the writer's own date outranks the agency's window", () => {
    const events = expectedEvents(
      [query({ dateSent: iso(-50), writerExpectedDate: iso(3) })],
      [agent({ responseTimeWeeks: 8 })],
    );
    expect(events).toHaveLength(1);
    expect(events[0].date.toDateString()).toBe(new Date(iso(3)).toDateString());
  });

  /**
   * ⚠️ NO WINDOW, NO EVENT — the house 8/12/12-week assumption stays out of a panel that names
   * dates. It would put "Response expected 13 Oct" in front of a writer with nobody behind it.
   */
  it("states nothing when nobody has stated anything", () => {
    expect(expectedEvents([query()], [agent()]), "the app invented a date").toHaveLength(0);
  });

  /** A closed query is not waiting on anyone — unchanged, asserted so the rewire did not widen it. */
  it("closed queries still produce no expected-reply event", () => {
    const events = expectedEvents([query({ status: QueryStatus.REJECTED, dateSent: iso(-50) })], [agent({ responseTimeWeeks: 8 })]);
    expect(events).toHaveLength(0);
  });

  /**
   * ⚠️ THE ANCHOR IS THE LATEST SEND, not the original query. A full posted last week is what the
   * agent is sitting on; counting from the query eight months ago would date the expectation to a
   * wait that ended when they asked for the full.
   */
  it("anchors on the most recent send", () => {
    const events = expectedEvents(
      [query({ status: QueryStatus.FULL_SENT, dateSent: iso(-240), fullSentDate: iso(-7) })],
      [agent({ responseTimeWeeks: 2 })],
    );
    expect(events).toHaveLength(1);
    expect(events[0].date.toDateString()).toBe(new Date(iso(7)).toDateString());
  });
});

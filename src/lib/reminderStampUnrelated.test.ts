/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · close-out 1 — `nudgeSetAt` IS STAMPED ONLY WHEN A WRITE CHANGES THE REMINDER'S VALUE.
 *
 * A reminder set before the agent's reply entry reads as due on the entry's new date. If an unrelated edit after the
 * entry stamped the reminder "now", the reminder would read as set AFTER the entry and stop moving — the writer's
 * correction of a typo would silently put their nudge back on its old date. Each case below is a write that leaves the
 * reminder alone, made after the entry through the shape a real writer sends, followed by the read-through: the
 * reminder still moves.
 *
 * Proved red first: against the nudge writer as it was (no prior handed to the stamp) case 3 is red, and against a
 * stamp that fires on every write that carries the reminder, cases 1–3 are red (case 4 names no reminder, so no stamp
 * can reach it).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fakeStore, fakeFirestoreModule } from "../test/fakeFirestore";
vi.mock("firebase/firestore", async (orig) => ({ ...(await orig<object>()), ...fakeFirestoreModule }));
import { withReminderStamp, NUDGE_SET_AT_FIELD } from "./reminderStamp";
import { buildAgentReplyWrites, entryDatesFor } from "./agentReply";
import { commitNudge } from "./nudgeWrite";
import { buildNudgeWrites } from "./logNudge";
import { Activity, Agent, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 24, 12);
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const noon = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00`).getTime();

const agent = { id: "a1", name: "Rafe Moss" } as Agent;
const entryAt = NOW.getTime() - 2 * DAY;
const reminder = ymd(NOW.getTime() + 5 * DAY);
const newDate = ymd(NOW.getTime() + 40 * DAY);
/** a reminder set a week BEFORE the entry, stamped (the stamp's own case) — and the same query with no stamp */
const stamped = { id: "q1", userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: new Date(NOW.getTime() - 30 * DAY).toISOString(), nudgeDate: reminder, nudgeSetAt: new Date(entryAt - 7 * DAY).toISOString() } as unknown as Query;
const unstamped = { ...stamped } as Record<string, unknown>; delete unstamped.nudgeSetAt;
const acts = [{ ...(buildAgentReplyWrites(stamped, agent, { kind: "holding", on: new Date(entryAt).toISOString(), date: newDate }).activity as Activity), id: "e1", userId: "u" }];
const moves = (q: unknown) => entryDatesFor(q as Query, acts).reminderMs;
/** the query after a write: the stored fields merged with the patch, exactly as Firestore's update does */
const after = (q: unknown, patch: Record<string, unknown>) => ({ ...(q as object), ...patch });

describe("the fixture: before any edit, the reminder moves to the entry's date", () => {
  it.each([["stamped before", stamped], ["no stamp", unstamped]])("%s", (_l, q) => {
    expect(moves(q)).toBe(noon(newDate));
  });
});

describe("an unrelated edit after the entry does not stop the reminder moving", () => {
  const LATER = new Date(NOW.getTime() + 3600_000); // after the entry
  it.each([["stamped before", stamped], ["no stamp", unstamped]])("1 · updateQuery with the whole query (a form save that rewrites every field): %s", (_l, q) => {
    const patch = withReminderStamp({ ...(q as object), personalisationNotes: "Met at the York festival" } as Record<string, unknown>, q as { nudgeDate?: unknown }, LATER);
    expect(patch[NUDGE_SET_AT_FIELD], "an unchanged reminder was stamped").toBe((q as Record<string, unknown>)[NUDGE_SET_AT_FIELD]);
    expect(moves(after(q, patch))).toBe(noon(newDate));
  });
  it.each([["stamped before", stamped], ["no stamp", unstamped]])("2 · a card save carrying the reminder in another spelling of the same day: %s", (_l, q) => {
    const patch = withReminderStamp({ sendMethod: "Email", nudgeDate: `${reminder}T09:00:00.000Z` }, q as { nudgeDate?: unknown }, LATER);
    expect(NUDGE_SET_AT_FIELD in patch, "the same day re-sent was stamped").toBe(false);
    expect(moves(after(q, patch))).toBe(noon(newDate));
  });
  it.each([["stamped before", stamped], ["no stamp", unstamped]])("4 · a patch that does not name the reminder (recordResponse, the edits drawer, any field): %s", (_l, q) => {
    const patch = withReminderStamp({ agentComments: "Loved the voice" }, null, LATER);
    expect(NUDGE_SET_AT_FIELD in patch).toBe(false);
    expect(moves(after(q, patch))).toBe(noon(newDate));
  });

  describe("3 · the nudge writer (commitNudge), re-booking the check-in for the day it already had", () => {
    const UID = "u", QDOC = `users/${UID}/queries/q1`;
    beforeEach(() => { fakeStore.reset(); vi.spyOn(console, "error").mockImplementation(() => {}); });
    it.each([["stamped before", stamped], ["no stamp", unstamped]])("%s", async (_l, q) => {
      fakeStore.docs.set(QDOC, { ...(q as object) });
      const writes = buildNudgeWrites(q as Query, agent, { checkBackDate: `${reminder}T12:00:00.000Z` }, LATER);
      expect(writes.queryUpdates.nudgeDate, "the fixture must carry the reminder through the write").toBeDefined();
      const r = await commitNudge({} as never, UID, "q1", "act-n1", writes, { writeTwin: async () => {}, writeFlag: async () => {} }, q as { nudgeDate?: unknown });
      expect(r.success).toBe(true);
      const stored = fakeStore.docs.get(QDOC)!;
      expect(stored[NUDGE_SET_AT_FIELD], "a re-booked check-in on the same day was stamped as newly set").toBe((q as Record<string, unknown>)[NUDGE_SET_AT_FIELD]);
      expect(moves(stored)).toBe(noon(newDate));
    });
  });
});

describe("a write that DOES change the reminder after the entry stamps it, and that reminder stays", () => {
  it("moved by a day after the entry → stamped now → stays where the writer put it", () => {
    const LATER = new Date(NOW.getTime() + 3600_000);
    const next = ymd(NOW.getTime() + 6 * DAY);
    const patch = withReminderStamp({ nudgeDate: next }, stamped as unknown as { nudgeDate?: unknown }, LATER);
    expect(patch[NUDGE_SET_AT_FIELD]).toBe(LATER.toISOString());
    expect(moves(after(stamped, patch))).toBe(noon(next));
  });
});

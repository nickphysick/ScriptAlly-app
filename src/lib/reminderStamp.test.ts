/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · follow-up 2 — the reminder records when it was set (`nudgeSetAt`). Only a reminder set BEFORE the
 * agent's reply entry moves to the entry's new date; one set after it stays where the writer put it; one with no stamp
 * counts as set before. Proved red first against the read-through as it was (every reminder moved).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { deleteField } from "firebase/firestore";
import { withReminderStamp, nudgeSetAtMs, NUDGE_SET_AT_FIELD } from "./reminderStamp";
import { buildAgentReplyWrites, entryDatesFor } from "./agentReply";
import { reminderOf } from "./queryState";
import { Activity, Agent, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 24, 12);
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

describe("the stamp", () => {
  it("set or changed: now", () => {
    expect(withReminderStamp({ nudgeDate: "2026-12-01" }, null, NOW)).toEqual({ nudgeDate: "2026-12-01", nudgeSetAt: NOW.toISOString() });
    expect(withReminderStamp({ nudgeDate: "2026-12-01" }, { nudgeDate: "2026-11-30" }, NOW)[NUDGE_SET_AT_FIELD]).toBe(NOW.toISOString());
  });
  it("rewritten on the same day: untouched (a save that did not set it)", () => {
    expect(withReminderStamp({ nudgeDate: "2026-12-01T12:00:00.000Z" }, { nudgeDate: "2026-12-01" }, NOW)).toEqual({ nudgeDate: "2026-12-01T12:00:00.000Z" });
  });
  it("cleared: cleared the same way", () => {
    expect(withReminderStamp({ nudgeDate: undefined }, null, NOW)).toEqual({ nudgeDate: undefined, nudgeSetAt: undefined });
    const del = deleteField();
    expect(withReminderStamp({ nudgeDate: del }, null, NOW)[NUDGE_SET_AT_FIELD]).toBe(del);
  });
  it("an Undo naming the prior stamp is left alone; a patch without the reminder too", () => {
    const undo = { nudgeDate: "2026-12-01", nudgeSetAt: "2026-11-01T10:00:00.000Z" };
    expect(withReminderStamp(undo, null, NOW)).toBe(undo);
    const other = { closePlan: "2026-12-01" };
    expect(withReminderStamp(other, null, NOW)).toBe(other);
  });
});

describe("the read-through: only a reminder set before the entry moves", () => {
  const agent = { id: "a1", name: "Rafe Moss" } as Agent;
  const base = { id: "rm", userId: "u", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: new Date(NOW.getTime() - 20 * DAY).toISOString(), nudgeDate: ymd(NOW.getTime() + 5 * DAY) } as unknown as Query;
  const entryAt = NOW.getTime() - DAY;
  const newDate = ymd(NOW.getTime() + 40 * DAY);
  const acts = [{ ...(buildAgentReplyWrites(base, agent, { kind: "holding", on: new Date(entryAt).toISOString(), date: newDate }).activity as Activity), id: "e1", userId: "u" }];
  const at = (q: Query) => entryDatesFor(q, acts).reminderMs;
  const noon = (s: string) => new Date(`${s}T12:00:00`).getTime();
  it("no stamp: counts as set before, so it reads as due on the new date", () => {
    expect(at(base)).toBe(noon(newDate));
  });
  it("set before the entry: moves", () => {
    expect(at({ ...base, nudgeSetAt: new Date(entryAt - 3 * DAY).toISOString() } as Query)).toBe(noon(newDate));
  });
  it("set after the entry: stays where the writer put it", () => {
    expect(at({ ...base, nudgeSetAt: new Date(entryAt + 3600_000).toISOString() } as Query), "a reminder set after the entry was moved").toBe(noon(base.nudgeDate as string));
  });
  it("the Query Centre's reader agrees (queryState reminderOf over a row)", () => {
    const row = (q: Query) => ({ query: q, replyDateMs: noon(newDate), reply: { ms: entryAt } });
    expect(reminderOf(row({ ...base, nudgeSetAt: new Date(entryAt + 3600_000).toISOString() } as Query))).not.toBe(noon(newDate));
    expect(reminderOf(row(base))).toBe(noon(newDate));
    expect(nudgeSetAtMs({ nudgeSetAt: "x" })).toBeNull();
  });
});

describe("every writer of a query's reminder stamps it", () => {
  const FUNNELS: [string, string][] = [
    ["src/lib/db.tsx", "fields = withReminderStamp(fields as Record<string, unknown>, targetQ) as Partial<Query>;"],
    ["src/lib/db.tsx", "withReminderStamp(newQ as unknown as Record<string, unknown>)"],
    ["src/lib/db.tsx", "withReminderStamp(qUpdates as Record<string, unknown>, targetQ)"],
    ["src/lib/qc152Write.ts", "const patch = withReminderStamp(Object.fromEntries(Object.entries(plan.query)"],
    ["src/lib/nudgeWrite.ts", "withReminderStamp(writes.queryUpdates)"],
    ["src/lib/agentCardSave.ts", "withReminderStamp({ nudgeDate: dayIso(new Date(m.nudgeMs)) })"],
    ["src/lib/recordResponse.ts", "withReminderStamp(updates as Record<string, unknown>, preSnapshot"],
    ["src/lib/saveQueryEdits.ts", "withReminderStamp(queryPatch as Record<string, unknown>)"],
  ];
  it.each(FUNNELS)("%s stamps at its write", (file, line) => {
    expect(readFileSync(file, "utf8")).toContain(line);
  });
  it("commitMany stamps too (both plan writers)", () => {
    expect(readFileSync("src/lib/qc152Write.ts", "utf8").split("withReminderStamp(Object.fromEntries").length - 1).toBe(2);
  });
  it("no other file writes a query document AND names the reminder, except the two that hand the stamp over themselves", () => {
    const files = execSync("grep -rlE 'nudgeDate' src | grep -v '\\.test\\.' | xargs grep -lE '(updateDoc|setDoc|batch\\.update|batch\\.set|b\\.update|b\\.set)\\(' || true", { encoding: "utf8" })
      .split("\n").filter(Boolean).sort();
    const stamps = (f: string) => readFileSync(f, "utf8").includes("withReminderStamp");
    const HANDS_OVER: Record<string, string> = {
      /* restores the prior pair, nudgeSetAt included, explicitly */
      "src/lib/nudgeUndo.ts": "nudgeSetAt: prior.nudgeSetAt ?? deleteField(),",
      /* writes the query only through db.updateQuery (the funnel); its own writes are activity rows */
      "src/lib/queryActions/stepSaves.ts": "await db.updateQuery(q.id,",
    };
    for (const f of files) {
      if (stamps(f)) continue;
      expect(HANDS_OVER[f], `${f} writes and names the reminder but does not stamp it`).toBeDefined();
      expect(readFileSync(f, "utf8")).toContain(HANDS_OVER[f]);
    }
    expect(files.length).toBeGreaterThan(3);
  });
});

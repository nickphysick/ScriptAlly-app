/**
 * Nudge and weekly against a real Firestore (non-workspace v1, 9e): a seeded writer, flag off sends zero; flag on would
 * send exactly one of each. The send is a stub — nothing leaves the machine.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { runReminders, factsFromStore, type RUser } from "./reminderEmails";
import { resolveMailConfig } from "./emailConfig";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-16T08:00:00Z");
const UID = "rem-writer";
const user: RUser = { uid: UID, email: "writer@example.com", notifyPrefs: { nudges: true, weeklyDigest: true } };
const cfg = resolveMailConfig({ APP_PUBLIC_URL: "https://scriptally-dev.web.app", WAITLIST_PUBLIC_URL: "https://scriptally-dev.web.app" } as never);

beforeAll(async () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under emulators:exec").toBeTruthy();
  const iso = (ms: number) => new Date(ms).toISOString();
  await db.doc(`users/${UID}/manuscripts/m1`).set({ title: "The Lantern" });
  await db.doc(`users/${UID}/agents/a1`).set({ name: "Ada Reader" });
  await db.doc(`users/${UID}/agents/a2`).set({ name: "Bea Booker" });
  await db.doc(`users/${UID}/queries/q1`).set({ status: "Queried", agentId: "a1", manuscriptId: "m1", dateSent: iso(NOW - 70 * DAY) });
  await db.doc(`users/${UID}/queries/q2`).set({ status: "Queried", agentId: "a2", manuscriptId: "m1", dateSent: iso(NOW - 70 * DAY) });
  await db.doc(`users/${UID}/queries/q3`).set({ status: "Queried", agentId: "a2", manuscriptId: "m1", dateSent: iso(NOW - 2 * DAY) });
});
afterAll(async () => { await Promise.all(admin.apps.map((a) => a?.delete())); });

const run = async (kind: "nudge" | "weekly", flagOn: boolean) => {
  const sends: string[] = [];
  const out = await runReminders(kind, {
    listUsers: async () => [user], facts: (u) => factsFromStore(db, u),
    send: async (to, k) => { sends.push(`${k}:${to}`); return { ok: true }; }, flagOn, cfg, nowMs: NOW,
  });
  return { ...out, sends };
};

describe("the server flag decides", () => {
  it("flag off: both planned, zero sent", async () => {
    expect(await run("nudge", false)).toEqual({ planned: 1, sent: 0, sends: [] });
    expect(await run("weekly", false)).toEqual({ planned: 1, sent: 0, sends: [] });
  });
  it("flag on: exactly one of each — the two nudges due today are one email", async () => {
    expect((await run("nudge", true)).sends).toEqual(["nudge:writer@example.com"]);
    expect((await run("weekly", true)).sends).toEqual(["weekly:writer@example.com"]);
  });
});

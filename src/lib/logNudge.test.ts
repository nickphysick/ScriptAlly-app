import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock the Firestore boundary (the recomputeQuery import chain reaches src/lib/firebase.ts, whose
// live getAuth explodes in tests). Same pattern as recomputeQuery.test.ts; the derivation is REAL.
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), updateDoc: vi.fn(), deleteField: vi.fn(),
}));
vi.mock("./firebase", () => ({
  db: {},
  handleFirestoreError: vi.fn((e: unknown) => { throw e; }),
  OperationType: { UPDATE: "update" },
}));

import { buildNudgeWrites, NUDGE_NESTED_TYPE, reconcileNudge } from "./logNudge";
import { subcollectionDocToDerivable } from "./recomputeQuery";
import { deriveQueryFields } from "./queryDerivation";
import { queryAmbientStatus, deriveEscalation } from "./queryAmbient";
import { ActivityType, QueryStatus, type Query, type Agent } from "../types";

const q = (over: Record<string, any> = {}): Query =>
  ({ id: "q1", userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", sendMethod: "Email", status: QueryStatus.QUERIED, ...over }) as unknown as Query;

// Minimal fixtures — only the fields buildNudgeWrites reads.
const query = {
  id: "q1",
  userId: "u1",
  manuscriptId: "m1",
  agentId: "a1",
  packageId: "p1",
  status: QueryStatus.QUERIED,
  dateSent: "2026-01-01T00:00:00.000Z",
  responseDeadline: "2026-02-01T00:00:00.000Z",
  personalisationNotes: "",
  sendMethod: "Email",
} as unknown as Query;

const agent = { id: "a1", name: "Margaret Holloway", agency: "Pemberton Literary" } as unknown as Agent;

const NOW = new Date("2026-06-14T09:00:00.000Z");
const CHECK_BACK = "2026-06-28T00:00:00.000Z";

describe("buildNudgeWrites — the Log-nudge payloads", () => {
  it("writes a non-status NUDGE_SENT activity with the glyph-detected description prefix", () => {
    const { activity } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(activity.activityType).toBe(ActivityType.NUDGE_SENT);
    expect(activity.description.startsWith("Nudge sent to Margaret Holloway at Pemberton Literary")).toBe(true);
    expect(activity.queryId).toBe("q1");
    expect(activity.date).toBe(NOW.toISOString());
    // Non-status: recomputeQuery must ignore it → no resultingStatus.
    expect("resultingStatus" in activity).toBe(false);
    expect(activity.details).toContain("Follow-up reminder set for");
  });

  it("puts the optional note in details (no dedicated field — rules forbid one)", () => {
    const { activity } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK, note: "Polite bump, attached the synopsis." }, NOW);
    expect(activity.details).toContain("Follow-up reminder set for");
    expect(activity.details).toContain("Polite bump, attached the synopsis.");
  });

  it("sets nudgeDate + lastNudgeSentDate and NOTHING else on the query (no status / responseDeadline)", () => {
    const { queryUpdates } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(Object.keys(queryUpdates).sort()).toEqual(["lastNudgeSentDate", "nudgeDate"]);
    expect(queryUpdates.nudgeDate).toBe(new Date(CHECK_BACK).toISOString());
    expect(queryUpdates.lastNudgeSentDate).toBe(NOW.toISOString());
    expect(queryUpdates).not.toHaveProperty("status");
    expect(queryUpdates).not.toHaveProperty("responseDeadline");
    expect(queryUpdates).not.toHaveProperty("hasAgentResponded");
  });

  it("creates a custom-date resurface dismissal on the check-back date", () => {
    const { dismissal } = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);
    expect(dismissal.taskType).toBe("nudge_overdue");
    expect(dismissal.relatedRecordId).toBe("q1");
    expect(dismissal.dismissType).toBe("custom date");
    expect(dismissal.resurfaceDate).toBe(new Date(CHECK_BACK).toISOString());
  });

  it("falls back gracefully when no agent is on record", () => {
    const { activity } = buildNudgeWrites(query, null, { checkBackDate: CHECK_BACK }, NOW);
    expect(activity.description.startsWith("Nudge sent to agent at agency")).toBe(true);
  });
});

describe("P2 — the nudge reaches the AUTHORITATIVE store (and only once)", () => {
  const writes = buildNudgeWrites(query, agent, { checkBackDate: CHECK_BACK }, NOW);

  it("emits exactly ONE authoritative row, typed on the non-enum nudge type", () => {
    expect(writes.nested.type).toBe(NUDGE_NESTED_TYPE);
    // Non-enum by construction — the status dedupe/derivation can never pick it up.
    expect(Object.values(QueryStatus)).not.toContain(writes.nested.type);
    expect("resultingStatus" in writes.nested).toBe(false);
    expect(writes.nested.queryId).toBe("q1");
    expect(writes.nested.createdAt).toBe(NOW.toISOString());
    expect(writes.nested.note).toContain("Follow-up reminder set for");
  });

  it("the projection twin derives from the SAME build (same event time + family), not a parallel write", () => {
    expect(writes.activity.date).toBe(writes.nested.createdAt);
    expect(writes.activity.details).toBe(writes.nested.note);
    expect(writes.activity.queryId).toBe(writes.nested.queryId);
  });

  it("db.tsx writes the authoritative row FIRST, then the same-id projection twin (artefact lock)", () => {
    const db = readFileSync(resolve(__dirname, "./db.tsx"), "utf8");
    const auth = db.indexOf('"queries", queryId, "activity", actId), writes.nested');
    const twin = db.indexOf("addActivity({ ...writes.activity, id: actId })");
    expect(auth).toBeGreaterThan(-1);
    expect(twin).toBeGreaterThan(auth); // authoritative first; the twin is emitted from it
    // The old projection-only write path is gone.
    expect(db.includes("await addActivity(writes.activity);")).toBe(false);
  });

  it("response-safety through the REAL derivation: a nudge row changes nothing recomputeQuery writes", () => {
    const queried = subcollectionDocToDerivable("a1", { type: QueryStatus.QUERIED, resultingStatus: QueryStatus.QUERIED, createdAt: "2026-01-01T00:00:00.000Z" });
    const nudge = subcollectionDocToDerivable("a2", { type: writes.nested.type, createdAt: writes.nested.createdAt, note: writes.nested.note });
    // The nudge maps to a non-status derivable (resultingStatus null) …
    expect(nudge.resultingStatus).toBeNull();
    // … so every derived field — status, response flag, revision round, pipeline dates — is
    // identical with and without it. Overdue derives from dateSent + window, untouched by nudgeDate.
    expect(deriveQueryFields([queried, nudge])).toEqual(deriveQueryFields([queried]));
  });
});

describe("reconcileNudge — re-derive the query nudge snapshot after a delete (the desync fix)", () => {
  it("no nudges left → BOTH fields clear (query behaves as never-nudged → drops grace)", () => {
    expect(reconcileNudge([])).toEqual({ nudgeDate: null, lastNudgeSentDate: null, hasNudges: false });
  });
  it("nudges remain → the LATEST supplies lastNudgeSentDate (createdAt) + nudgeDate (reminderDate)", () => {
    const older = { type: NUDGE_NESTED_TYPE, createdAt: "2026-06-01T00:00:00.000Z", reminderDate: "2026-06-15T00:00:00.000Z" };
    const newer = { type: NUDGE_NESTED_TYPE, createdAt: "2026-07-01T00:00:00.000Z", reminderDate: "2026-07-20T00:00:00.000Z" };
    expect(reconcileNudge([older, newer])).toEqual({ nudgeDate: "2026-07-20T00:00:00.000Z", lastNudgeSentDate: "2026-07-01T00:00:00.000Z", hasNudges: true });
  });
  it("a legacy nudge with no structured reminderDate → nudgeDate clears (can't recover text-only), still hasNudges", () => {
    const legacy = { type: NUDGE_NESTED_TYPE, createdAt: "2026-06-01T00:00:00.000Z", note: "Follow-up reminder set for 15 Jun 2026" };
    expect(reconcileNudge([legacy])).toEqual({ nudgeDate: null, lastNudgeSentDate: "2026-06-01T00:00:00.000Z", hasNudges: true });
  });
  it("touches ONLY nudgeDate/lastNudgeSentDate — never status/response fields", () => {
    expect(Object.keys(reconcileNudge([])).sort()).toEqual(["hasNudges", "lastNudgeSentDate", "nudgeDate"]);
  });
});

describe("delete → un-grace, at the derivation level", () => {
  it("clearing the nudge snapshot (reconcile after deleting the only nudge) drops grace back to overdue", () => {
    const DAY = 86400000;
    const now = new Date("2026-07-06T00:00:00Z").getTime();
    const overdueAmbient = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: new Date(now - 57 * DAY).toISOString() }), "agent", undefined, now);
    // With the nudge present (future reminder) it's grace …
    expect(deriveEscalation(overdueAmbient, { reminderMs: now + 3 * DAY, lastNudgeMs: now - DAY, now })).toBe("grace");
    // … after delete, reconcile clears both → deriveEscalation reads null → back to overdue.
    const rec = reconcileNudge([]);
    expect(deriveEscalation(overdueAmbient, { reminderMs: rec.nudgeDate ? new Date(rec.nudgeDate).getTime() : null, lastNudgeMs: rec.lastNudgeSentDate ? new Date(rec.lastNudgeSentDate).getTime() : null, now })).toBe("overdue");
  });
});

/**
 * Nudge reminders and the weekly summary (non-workspace v1, 9e) — the planning rules.
 */
import { describe, it, expect } from "vitest";
import { planNudge, planWeekly, SERVER_CLOCK_DEFAULTS, remindersOn, type Facts, type RQuery } from "./reminderEmails";
import { resolveMailConfig } from "./emailConfig";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-16T08:00:00Z"); // a Monday
const cfg = resolveMailConfig({ APP_PUBLIC_URL: "https://scriptally-dev.web.app", WAITLIST_PUBLIC_URL: "https://scriptally-dev.web.app" } as never);
const iso = (ms: number) => new Date(ms).toISOString();
/* Two queries whose nudge falls today: sent 10 weeks ago to agents with no stated window (8 + 2 weeks). */
const due = (id: string): RQuery => ({ id, status: "Queried", agentId: `a-${id}`, manuscriptId: "m1", dateSent: iso(NOW - 70 * DAY) });
const facts = (queries: RQuery[], prefs: Record<string, unknown> = {}): Facts => ({
  user: { uid: "u1", email: "w@example.com", notifyPrefs: prefs },
  queries,
  agents: new Map(queries.map((q) => [q.agentId, { id: q.agentId, name: `Agent ${q.id}` }])),
  manuscripts: new Map([["m1", { id: "m1", title: "The Lantern" }]]),
});

/* "the server's clock is the app's clock" lives in src/lib/queryClock.test.ts (functions/ cannot import src/). */
void SERVER_CLOCK_DEFAULTS;

describe("nudges", () => {
  it("several due on one day are one email", () => {
    expect(planNudge(facts([due("q1"), due("q2")]), NOW, cfg)?.items).toHaveLength(2);
  });
  it("nothing due today, nothing planned", () => {
    expect(planNudge(facts([{ ...due("q1"), dateSent: iso(NOW - 20 * DAY) }]), NOW, cfg)).toBeNull();
  });
  it("already nudged, or closed, is never due", () => {
    expect(planNudge(facts([{ ...due("q1"), lastNudgeSentDate: iso(NOW - DAY) }, { ...due("q2"), status: "Rejected" }]), NOW, cfg)).toBeNull();
  });
  it("the Settings toggle off means no email", () => {
    expect(planNudge(facts([due("q1")], { nudges: false }), NOW, cfg)).toBeNull();
  });
});

describe("the weekly summary", () => {
  it("skips a week with nothing in it", () => {
    expect(planWeekly(facts([{ ...due("q1"), dateSent: iso(NOW - 200 * DAY), status: "Rejected" }]), NOW)).toBeNull();
  });
  it("tells the week: sent this week, and nudges coming", () => {
    const p = planWeekly(facts([{ ...due("q1"), dateSent: iso(NOW - 2 * DAY) }, { ...due("q2"), dateSent: iso(NOW - 67 * DAY) }]), NOW);
    expect(p?.happened).toEqual([{ kind: "sent", agentNames: ["Agent q1"] }]);
    expect(p?.coming.map((c) => c.kind)).toEqual(["nudge"]);
  });
  it("the toggle off means no email", () => {
    expect(planWeekly(facts([{ ...due("q1"), dateSent: iso(NOW - 2 * DAY) }], { weeklyDigest: false }), NOW)).toBeNull();
  });
});

describe("the one server flag", () => {
  it("is off unless set to on", () => {
    expect(remindersOn({} as never)).toBe(false);
    expect(remindersOn({ REMINDER_EMAILS: "true" } as never)).toBe(false);
    expect(remindersOn({ REMINDER_EMAILS: "on" } as never)).toBe(true);
  });
});

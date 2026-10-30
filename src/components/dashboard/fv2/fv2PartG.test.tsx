/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-G — Dashboard first visit v2, Part G: the nudge-email ask. The write through the app (Yes sets `notifyPrefs.nudges`
 * and leaves `weeklyDigest` and `discover` as they were; never asked again) is FV2 G1, on the running page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { QueryStatus, type Agent, type Activity, type Manuscript, type Query, type User } from "../../../types";
import { REMINDER, REMINDER_NOT_NOW, REMINDER_YES, firstNameOf, shouldAskReminder } from "../../../lib/dashFirstVisit";

describe("FV2-G · the words", () => {
  it("as the reference has them", () => {
    expect(REMINDER.title).toBe("Want an email when a nudge is due?");
    expect(REMINDER.text("Tessa")).toBe("If Tessa hasn't replied in time, we'll email you so you can follow up. Only when there's something to do, never more than once a day.");
    expect([REMINDER.yes, REMINDER.notNow, REMINDER.done, REMINDER.settings]).toEqual(["Yes, email me", "Not now", "We'll email you when a nudge is due.", "Change in Settings"]);
    expect(firstNameOf("Tessa Rowe")).toBe("Tessa");
    expect(firstNameOf("")).toBe("the agent");
  });
});

describe("FV2-G · when it asks, and what it writes", () => {
  it("after the first query, once, and never when nudge emails were already turned on", () => {
    expect(shouldAskReminder({ queries: 1, answered: null, storedNudges: undefined })).toBe(true);
    expect(shouldAskReminder({ queries: 0, answered: null, storedNudges: undefined })).toBe(false);
    expect(shouldAskReminder({ queries: 3, answered: "not_now", storedNudges: undefined })).toBe(false);
    expect(shouldAskReminder({ queries: 3, answered: null, storedNudges: true })).toBe(false);
    expect(shouldAskReminder({ queries: 3, answered: null, storedNudges: false })).toBe(true);
  });
  it("Yes is one leaf of notifyPrefs — the map is never written whole", () => {
    expect(Object.keys(REMINDER_YES).sort()).toEqual(["notifyPrefs.nudges", "todoPrefs.dash.reminder"]);
    expect(REMINDER_YES["notifyPrefs.nudges"]).toBe(true);
    expect(Object.keys(REMINDER_NOT_NOW)).toEqual(["todoPrefs.dash.reminder"]);
  });
});

describe("FV2-G · on the page", () => {
  const ms = { id: "ms-1", title: "The Lantern Keepers" } as unknown as Manuscript;
  const agent = { id: "a1", name: "Tessa Rowe", agency: "Rowe Literary" } as unknown as Agent;
  const now = new Date(2026, 9, 29, 12);
  const q = { id: "q1", status: QueryStatus.QUERIED, agentId: "a1", manuscriptId: "ms-1", dateSent: new Date(2026, 9, 29, 9, 40).toISOString() } as unknown as Query;
  const act = { id: "x1", userId: "u1", queryId: "q1", manuscriptId: "ms-1", activityType: "Query Sent", description: "Query sent to Tessa Rowe at Rowe Literary", date: q.dateSent, details: "", resultingStatus: QueryStatus.QUERIED } as unknown as Activity;
  const page = (todoPrefs?: unknown, notifyPrefs?: unknown) => renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dash58 loading={false} queries={[q]} agents={[agent]} manuscripts={[ms]} tasks={[]} userTasks={[]} activities={[act]} taskFlags={[]}
        currentUser={{ id: "u1", name: "Audit S1", todoPrefs, notifyPrefs } as unknown as User} activeManuscript={ms} onNavigate={() => {}} onPrefs={() => {}} now={now} />
    </MemoryRouter>,
  );
  it("shows under the first query's row, naming its agent", () => {
    const html = page();
    expect(html).toContain('data-fv2="reminder-ask"');
    expect(html).toContain("If Tessa hasn&#x27;t replied in time");
    expect(html.indexOf('data-fv2="reminder-ask"')).toBeGreaterThan(html.indexOf('data-df1="mini"'));
  });
  it("never once answered, and never when nudges were already on", () => {
    expect(page({ dash: { reminder: "not_now" } })).not.toContain('data-fv2="reminder-ask"');
    expect(page(undefined, { nudges: true })).not.toContain('data-fv2="reminder-ask"');
  });
});

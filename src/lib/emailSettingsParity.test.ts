/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The no-sign-in email settings page (functions/src/emailSettingsCore.ts) writes what Settings › Emails writes, from
 * the same defaults. functions/ cannot import src/, so the parity lives here (as queryClock.test.ts does for the clock).
 */
import { describe, it, expect } from "vitest";
import { NOTIFY_DEFAULT, notifyPrefs } from "./accountPrefs";
import { emailPatch as settingsPatch } from "./settingsSaves";
import { SERVER_NOTIFY_DEFAULT, emailPatch, emailState, ROWS } from "../../functions/src/emailSettingsCore";
import { EMAIL_LABEL } from "./settingsSaves";

describe("the page and Settings › Emails agree", () => {
  it("same defaults, every key", () => expect({ ...SERVER_NOTIFY_DEFAULT }).toEqual({ ...NOTIFY_DEFAULT }));
  it("same labels", () => {
    expect(ROWS.map(([k, l]) => [k, l])).toEqual([["nudges", EMAIL_LABEL.nudges], ["weekly", EMAIL_LABEL.weekly], ["news", EMAIL_LABEL.news]]);
  });
  it("the same notifyPrefs map for the same flip", () => {
    for (const stored of [undefined, { nudges: false }, { weeklyDigest: false, scout: true }]) {
      const st = emailState({ notifyPrefs: stored });
      const page = emailPatch({ notifyPrefs: stored }, { kind: "flip", key: "nudges" }, "T");
      expect(page).toEqual(settingsPatch("nudges", !st.nudges, notifyPrefs(stored)));
      const pageW = emailPatch({ notifyPrefs: stored }, { kind: "flip", key: "weekly" }, "T");
      expect(pageW).toEqual(settingsPatch("weekly", !st.weekly, notifyPrefs(stored)));
    }
  });
  it("product news is the same { granted, at } record", () => {
    const page = emailPatch({}, { kind: "flip", key: "news" }, "2026-11-13T09:00:00.000Z") as { marketingConsent: { granted: boolean; at: string } };
    const settings = settingsPatch("news", true, notifyPrefs(undefined)) as { marketingConsent: { granted: boolean; at: string } };
    expect(Object.keys(page.marketingConsent).sort()).toEqual(Object.keys(settings.marketingConsent).sort());
    expect(page.marketingConsent.granted).toBe(settings.marketingConsent.granted);
  });
});

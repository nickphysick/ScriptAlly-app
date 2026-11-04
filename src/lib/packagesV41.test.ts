/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { UserPlan, type User } from "../types";
import { packagesViaFounding } from "./entitlements";
import { FOUNDING_NOTE_PATH, foundingNoteHidden, headerSub } from "./packagesV41";

const user = (plan: UserPlan, prefs?: User["todoPrefs"]) => ({ plan, todoPrefs: prefs }) as Pick<User, "plan" | "todoPrefs">;

describe("v41 B · who is a founding writer", () => {
  it("a non-paid account has the page through founding access, so it is a founding writer", () => {
    expect(packagesViaFounding(user(UserPlan.FREE))).toBe(true);
  });
  it("a paid Pro account never is", () => {
    expect(packagesViaFounding(user(UserPlan.PRO))).toBe(false);
  });
  it("no account, no strip", () => {
    expect(packagesViaFounding(null)).toBe(false);
  });
  it("the dismissal is one leaf under todoPrefs, read back as hidden", () => {
    expect(FOUNDING_NOTE_PATH).toBe("todoPrefs.packages.foundingNoteHidden");
    expect(foundingNoteHidden(user(UserPlan.FREE))).toBe(false);
    expect(foundingNoteHidden(user(UserPlan.FREE, { packages: { foundingNoteHidden: true } }))).toBe(true);
    expect(foundingNoteHidden(user(UserPlan.FREE, { packages: { foundingNoteHidden: false } }))).toBe(false);
  });
});

describe("v41 C · the header's one line", () => {
  it("names the manuscript", () => {
    const s = headerSub("Murphy’s Day Out");
    expect(`${s.lead}${s.title}${s.tail}`).toBe("What each agent receives for Murphy’s Day Out, and what works best.");
  });
  it("reads without it when there is no active manuscript", () => {
    const s = headerSub(null);
    expect(s.title).toBeNull();
    expect(`${s.lead}${s.tail}`).toBe("What each agent receives, and what works best.");
    expect(headerSub("  ").title).toBeNull();
  });
});

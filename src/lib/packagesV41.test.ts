/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { UserPlan, type User } from "../types";
import { packagesViaFounding } from "./entitlements";
import { FOUNDING_NOTE_PATH, foundingNoteHidden, headerSub, listFilter, packagesCount, rateWords, statusWords, tabCounts } from "./packagesV41";

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

describe("v41 E · the list's tabs and words", () => {
  const stages = ["out", "out", "ready", "draft", "retired"] as const;
  it("counts the LIVE packages per tab; a retired one is in none", () => {
    expect(tabCounts([...stages])).toEqual({ all: 4, out: 2, ready: 1, draft: 1 });
  });
  it("shows a tab's packages, and the retired ones only when asked, on any tab", () => {
    expect(listFilter("out", "all", false)).toBe(true);
    expect(listFilter("out", "ready", false)).toBe(false);
    expect(listFilter("retired", "all", false)).toBe(false);
    expect(listFilter("retired", "draft", true)).toBe(true);
  });
  it("singular at one", () => {
    expect(packagesCount(1)).toBe("1 package");
    expect(packagesCount(4)).toBe("4 packages");
  });
  it("a draft names what it still needs", () => {
    expect(statusWords("draft", { version: true, letter: false })).toBe("Draft · needs a letter");
    expect(statusWords("draft", { version: false, letter: false })).toBe("Draft · needs a version and a letter");
    expect(statusWords("ready", { version: true, letter: true })).toBe("Ready to send");
    expect(statusWords("out", { version: true, letter: true })).toBe("Out with agents");
  });
  it("asked for more: a dash before anything is sent, Too early until ranked, then the share", () => {
    expect(rateWords({ sent: 0, ranked: false, pct: null }).text).toBe("—");
    expect(rateWords({ sent: 3, ranked: false, pct: 33 }).text).toBe("Too early");
    expect(rateWords({ sent: 5, ranked: true, pct: 40 }).text).toBe("40%");
  });
});

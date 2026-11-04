/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { UserPlan, type User } from "../types";
import { packagesViaFounding } from "./entitlements";
import { FOUNDING_NOTE_PATH, foundingNoteHidden, headerSub, railGroups, railLine, railLineText, statusWords } from "./packagesV41";

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

describe("v41 D · the rail's groups and lines", () => {
  const stages = ["draft", "out", "ready", "retired", "out"] as const;
  const pk = stages.map((st, i) => ({ id: `p${i}`, st }));
  it("groups Out with agents, Ready, Draft, in that order, each only when it has packages; retired fold apart", () => {
    const r = railGroups(pk, (p) => p.st);
    expect(r.groups.map((g) => [g.k, g.items.map((p) => p.id)])).toEqual([["out", ["p1", "p4"]], ["ready", ["p2"]], ["draft", ["p0"]]]);
    expect(r.retired.map((p) => p.id)).toEqual(["p3"]);
    expect(railGroups(pk.filter((p) => p.st !== "ready"), (p) => p.st).groups.map((g) => g.k)).toEqual(["out", "draft"]);
  });
  const f = (sent: number, answered: number, ranked: boolean, pct: number | null) => ({ sent, answered, ranked, pct });
  const both = { version: true, letter: true };
  it("out with agents: the rate once ranked, the answers in until then", () => {
    expect(railLineText(railLine("out", f(5, 4, true, 40), both, 4))).toBe("5 sent · 40% asked for more");
    expect(railLineText(railLine("out", f(3, 1, false, 33), both, 4))).toBe("3 sent · 1 of 4 answers in");
    expect(railLineText(railLine("out", f(9, 7, false, null), both, 4))).toBe("9 sent · 4 of 4 answers in");
  });
  it("ready, and what a draft still needs", () => {
    expect(railLineText(railLine("ready", f(0, 0, false, null), both, 4))).toBe("Ready to send");
    expect(railLineText(railLine("draft", f(0, 0, false, null), { version: true, letter: false }, 4))).toBe("Needs a letter");
    expect(railLineText(railLine("draft", f(0, 0, false, null), { version: false, letter: true }, 4))).toBe("Needs a version");
    expect(railLineText(railLine("draft", f(0, 0, false, null), { version: false, letter: false }, 4))).toBe("Needs a version and a letter");
  });
  it("a retired package keeps its figures if it went out", () => {
    expect(railLineText(railLine("retired", f(1, 1, false, 0), both, 4))).toBe("1 sent · 1 of 4 answers in");
    expect(railLineText(railLine("retired", f(0, 0, false, null), both, 4))).toBe("Retired");
  });
  it("the batch picker's status words", () => {
    expect(statusWords("ready", both)).toBe("Ready to send");
    expect(statusWords("out", both)).toBe("Out with agents");
  });
});

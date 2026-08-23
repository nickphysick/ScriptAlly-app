/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE ARTEFACT PAIR. `MAX_GOAL_ENTRIES` and the `queryingGoals` size cap in `firestore.rules`
 * are two statements of one number, in two files that are deployed separately. When they drift,
 * the client permits a write the rules deny — and a denied write in this app is SILENT, which is
 * the whole reason this test exists rather than a comment.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAX_GOAL_ENTRIES, boundGoalEntries } from "./queryingGoals";
import type { QueryingGoalEntry } from "../types";

const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
/* ⚠️ COMMENTS STRIPPED FIRST. The clause is explained in prose directly above itself, and that
   prose contains the number — a lock reading raw source would match its own documentation. */
const decls = rules.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("queryingGoals — the cap is one number in two files", () => {
  it("the rules cap equals MAX_GOAL_ENTRIES", () => {
    const m = /queryingGoals\s+is\s+list\s*&&\s*data\.queryingGoals\.size\(\)\s*<=\s*(\d+)/.exec(decls);
    expect(m, "the queryingGoals size clause must exist in isValidUser").not.toBeNull();
    expect(Number(m![1])).toBe(MAX_GOAL_ENTRIES);
  });

  it("⚠️ the field is in the user UPDATE allowlist — validation alone is not permission", () => {
    /* Two independent gates: isValidUser checks the VALUE, hasOnly() checks the KEY may change.
       A field that passes validation and is absent from hasOnly is denied on every update, and
       the client sees nothing. This has bitten the repo before (the affectedKeys gotcha). */
    const allow = /affectedKeys\(\)\.hasOnly\(\[([^\]]*)\]\)/.exec(decls);
    expect(allow, "the user update allowlist must be findable").not.toBeNull();
    expect(allow![1]).toContain("'queryingGoals'");
  });

  it("⚠️ the legacy fields are still allowlisted — they are unread, not removed", () => {
    /* Dropping them from the allowlist would deny any write that happens to carry them, which is
       a different and worse thing than not reading them. */
    expect(decls).toContain("'goalTarget'");
    expect(decls).toContain("'goalPeriod'");
  });
});

describe("boundGoalEntries", () => {
  const entry = (n: number): QueryingGoalEntry =>
    ({ target: n, cadence: "week", effectiveFrom: `2026-01-${String((n % 28) + 1).padStart(2, "0")}` });

  it("a list under the cap passes through unchanged", () => {
    const list = [entry(1), entry(2), entry(3)];
    expect(boundGoalEntries(list)).toEqual(list);
  });

  it("a list at the cap passes through unchanged", () => {
    const list = Array.from({ length: MAX_GOAL_ENTRIES }, (_, i) => entry(i));
    expect(boundGoalEntries(list)).toHaveLength(MAX_GOAL_ENTRIES);
  });

  it("⚠️ over the cap it keeps the TAIL — the newest intents are the ones in force", () => {
    const list = Array.from({ length: MAX_GOAL_ENTRIES + 5 }, (_, i) => entry(i));
    const out = boundGoalEntries(list);
    expect(out).toHaveLength(MAX_GOAL_ENTRIES);
    expect(out[out.length - 1]).toEqual(list[list.length - 1]);
    expect(out[0]).toEqual(list[5]);
  });

  it("it copies rather than aliasing — the caller cannot mutate stored state through it", () => {
    const list = [entry(1)];
    expect(boundGoalEntries(list)).not.toBe(list);
  });
});

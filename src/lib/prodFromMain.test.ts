/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prod deploys from main (25 Nov). The preflight's checks 4b and 4c name main: the deploy folder holds main's
 * pushed tip, checked out DETACHED, because git lets one branch be checked out in only one worktree and the
 * primary checkout holds main. 4c (HEAD is exactly origin's tip) is what guarantees the source; 4b only refuses
 * any other branch. release/live-1 is retired.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

describe("prod deploys from main", () => {
  const pre = read("scripts/live-preflight.mjs");
  it("the preflight names main and only main", () => {
    expect(pre).toContain('const BRANCHES = ["main"];');
    expect(pre).not.toMatch(/BRANCHES = \[[^\]]*release\/live-1/);
  });
  it("4b accepts main, or a detached HEAD (then 4c requires it to be origin's main exactly)", () => {
    expect(pre).toContain('const onLine = BRANCHES.includes(branch) || branch === "HEAD";');
    expect(pre).toContain("const pushed = pushedState(ROOT, BRANCHES[0]);");
  });
  it("CLAUDE.md says so", () => {
    const c = read("CLAUDE.md");
    expect(c).toContain("Prod only ever ships the pushed tip of `main`");
    expect(c).not.toContain("Prod only ever ships the pushed tip of `release/live-1`");
  });
});

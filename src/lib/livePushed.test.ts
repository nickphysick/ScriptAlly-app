/**
 * LIVE-PUSHED (4 Nov): prod ships the pushed tip of release/live-1 and nothing else.
 *
 * Prod was once built from a local release/live-1 holding 9 unpushed commits; a later deploy from the
 * pushed tip then rolled prod back. `pushedState` is the preflight's check 4c, and these cases run it
 * against a real throwaway repository and its own bare "origin", never against this checkout.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pushedState } from "../../scripts/livePushed.mjs";

const BRANCH = "release/live-1";
let root: string, work: string;
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const commit = (msg: string) => {
  writeFileSync(join(work, "f.txt"), msg);
  git(work, "add", "f.txt");
  git(work, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", msg);
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "qh-pushed-"));
  const origin = join(root, "origin.git");
  work = join(root, "work");
  git(root, "init", "-q", "--bare", origin);
  git(root, "init", "-q", "-b", BRANCH, work);
  git(work, "remote", "add", "origin", origin);
  commit("one");
  git(work, "push", "-q", "origin", BRANCH);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("LIVE-PUSHED · check 4c", () => {
  it("passes when HEAD is exactly the pushed tip", () => {
    expect(pushedState(work, BRANCH).ok).toBe(true);
  });

  it("fails on an unpushed commit, naming how far ahead", () => {
    commit("two, not pushed");
    const s = pushedState(work, BRANCH);
    expect(s.ok).toBe(false);
    expect(s.detail).toMatch(/1 unpushed/);
    git(work, "push", "-q", "origin", BRANCH);
    expect(pushedState(work, BRANCH).ok).toBe(true);
  });

  it("fails when origin has moved past HEAD", () => {
    git(work, "reset", "-q", "--hard", "HEAD~1");
    const s = pushedState(work, BRANCH);
    expect(s.ok).toBe(false);
    expect(s.detail).toMatch(/behind/);
    git(work, "reset", "-q", "--hard", `origin/${BRANCH}`);
  });

  it("fails on a detached HEAD at a commit origin does not have", () => {
    commit("three, detached");
    git(work, "checkout", "-q", "--detach");
    expect(pushedState(work, BRANCH).ok).toBe(false);
    git(work, "checkout", "-q", BRANCH);
    git(work, "reset", "-q", "--hard", `origin/${BRANCH}`);
  });

  it("fails when the branch is not on origin at all", () => {
    expect(pushedState(work, "no-such-branch").ok).toBe(false);
  });
});

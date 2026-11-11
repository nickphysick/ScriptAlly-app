/**
 * Worktree claims (scripts/hooks/claim-core.mjs): one Claude Code session per worktree. Every Phase 3
 * case of the brief, on a temporary store with injected liveness — no real claim is read or written.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bashRoots, decide, editRoot, isDead, makeStore, redirectTargets } from "../../scripts/hooks/claim-core.mjs";

const base = mkdtempSync(join(tmpdir(), "claims-"));
const W = join(base, "W"), W2 = join(base, "W2"), OUT = join(base, "outside");
for (const d of [W, W2, OUT]) mkdirSync(d);
/* a fake git: a path is in W or W2 if it starts with them; anything else is outside any repo */
const rootOf = (dir: string) => (dir.startsWith(W2) ? W2 : dir.startsWith(W) ? W : null);
const LIVE = new Set([101, 202]);
const isAlive = (pid: number) => LIVE.has(pid);
const A = { sessionId: "aaaaaaaa-1", ownerPid: 101, firstTask: "Session A's first prompt" };
const B = { sessionId: "bbbbbbbb-2", ownerPid: 202, firstTask: "Session B's first prompt" };
const fresh = () => makeStore(mkdtempSync(join(tmpdir(), "claim-store-")));
/* `decide` is plain .mjs, so its inferred option types are narrower than its real contract */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const opts = (store: ReturnType<typeof makeStore>, now = Date.now()): any => ({ store, isAlive, now, branch: () => "main" });

describe("worktree claims", () => {
  it("1 · session A changes W: claims it, allowed", () => {
    const s = fresh();
    expect(decide(W, A, opts(s))).toEqual({ allow: true, note: undefined });
    expect(s.get(W)).toMatchObject({ root: W, sessionId: A.sessionId, ownerPid: 101, branch: "main", firstTask: A.firstTask });
  });

  it("2 · session B changes W while A is live: blocked, with the message", () => {
    const s = fresh();
    decide(W, A, opts(s));
    const v = decide(W, B, opts(s));
    expect(v.allow).toBe(false);
    expect(v.reason).toMatch(/^This worktree \(main\) is in use by another session since \d\d:\d\d \(Session A's first prompt\)\. Use your own worktree, or ask Nick to release it: node scripts\/worktree-claim\.mjs release /);
  });

  it("the owner itself is refreshed, not blocked — and subagents share its session id", () => {
    const s = fresh();
    decide(W, A, opts(s, 1_000));
    expect(decide(W, { ...A, ownerPid: 999 }, opts(s, 2_000)).allow).toBe(true); // resumed under a new pid
    expect(s.get(W)).toMatchObject({ sessionId: A.sessionId, ownerPid: 999, lastSeen: new Date(2_000).toISOString() });
  });

  it("3 · read-only commands touch no worktree", () => {
    for (const cmd of ["git status", "grep -rn foo src", "cat package.json", "git log --oneline -3 | head", "ls > /dev/null 2>&1", "npx tsc --noEmit", "git diff --stat"]) {
      expect(bashRoots(cmd, W, { rootOf }), cmd).toEqual([]);
    }
  });

  it("4 · writing commands touch the worktree", () => {
    for (const cmd of ["git commit -m x", "sed -i '' 's/a/b/' f.txt", "echo x > f", "npm install", "git checkout -- f", "git stash", "rm f", "mv a b", "cp /tmp/x ./y", "echo y | tee notes.md", "cat a >> b"]) {
      expect(bashRoots(cmd, W, { rootOf }), cmd).toEqual([W]);
    }
    expect(bashRoots("cp src/a.ts /tmp/a.ts", W, { rootOf })).toEqual([]); // reading out of the worktree
    expect(bashRoots(`cd ${W2} && git commit -m x`, W, { rootOf })).toEqual([W2]);
    expect(bashRoots("cat > /tmp/x.sh <<'EOF'\necho hi > f\nEOF", W, { rootOf })).toEqual([]); // heredoc body is data
    expect(redirectTargets('echo "a > b" > out.txt')).toEqual(["out.txt"]);
  });

  it("5 · B changes W2: claims W2, allowed (A keeps W)", () => {
    const s = fresh();
    decide(W, A, opts(s));
    expect(decide(W2, B, opts(s)).allow).toBe(true);
    expect(s.get(W)?.sessionId).toBe(A.sessionId);
    expect(s.get(W2)?.sessionId).toBe(B.sessionId);
  });

  it("6 · once A's claim is released, B can claim W", () => {
    const s = fresh();
    decide(W, A, opts(s));
    for (const c of s.all()) if (c.sessionId === A.sessionId) s.drop(c.root); // what SessionEnd does
    expect(decide(W, B, opts(s)).allow).toBe(true);
    expect(s.get(W)?.sessionId).toBe(B.sessionId);
  });

  it("7 · a dead owner is reclaimed, and the allow says so", () => {
    const s = fresh();
    decide(W, { ...A, ownerPid: 31337 }, opts(s));
    const v = decide(W, B, opts(s));
    expect(v.allow).toBe(true);
    expect(v.note).toMatch(/^Reclaimed .* \(main\): its previous session aaaaaaaa \(claimed \d\d:\d\d\) is no longer running\.$/);
    expect(s.get(W)?.sessionId).toBe(B.sessionId);
  });

  it("with no owner pid, a claim is dead only after 3 hours without a change", () => {
    const t = Date.parse("2026-11-11T10:00:00Z");
    const c = { root: W, branch: "main", sessionId: "x", ownerPid: null, claimedAt: new Date(t).toISOString(), lastSeen: new Date(t).toISOString() };
    expect(isDead(c, { now: t + 2.9 * 3600e3, isAlive })).toBe(false);
    expect(isDead(c, { now: t + 3.1 * 3600e3, isAlive })).toBe(true);
  });

  it("9 · a path outside any repo is nobody's worktree", () => {
    expect(editRoot({ file_path: join(OUT, "notes.md") }, { rootOf })).toBeNull();
    expect(editRoot({ file_path: join(W, "src", "a.ts") }, { rootOf })).toBe(W);
    expect(editRoot({ notebook_path: join(W2, "n.ipynb") }, { rootOf })).toBe(W2);
    expect(bashRoots(`echo x > ${OUT}/f`, W, { rootOf })).toEqual([]);
  });
});

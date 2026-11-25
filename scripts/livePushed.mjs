/**
 * Check 4c of live-preflight (4 Nov): prod ships the PUSHED tip of release/live-1, and nothing else.
 *
 * Prod was once built from a local release/live-1 that held 9 unpushed commits. A later deploy from
 * the pushed tip then rolled prod back. So a deploy needs HEAD to BE the branch's tip on origin,
 * exactly: not ahead (unpushed work), not behind (a stale checkout), not elsewhere (detached).
 *
 * ⚠️ READ ONLY. The remote tip comes from `git ls-remote`, which asks origin and writes nothing,
 * not from `origin/<branch>`, which is only as fresh as the last fetch and would need a fetch (a
 * write) to trust. Locked by src/lib/livePushed.test.ts against a throwaway repository.
 */
import { execFileSync } from "node:child_process";

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** `{ ok, detail }` for "HEAD is exactly origin's tip of `branch`". */
export const pushedState = (cwd, branch) => {
  let remote;
  try {
    remote = git(cwd, ["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s+/)[0];
  } catch (e) {
    return { ok: false, detail: `could not ask origin: ${String(e.stderr ?? e.message).split("\n")[0]}` };
  }
  if (!remote) return { ok: false, detail: `${branch} is not on origin` };
  const head = git(cwd, ["rev-parse", "HEAD"]);
  if (head === remote) return { ok: true, detail: `HEAD ${head.slice(0, 8)} is origin's ${branch}` };

  let known = true;
  try { git(cwd, ["cat-file", "-e", `${remote}^{commit}`]); } catch { known = false; }
  if (!known) {
    return { ok: false, detail: `origin's ${branch} is ${remote.slice(0, 8)}, which this checkout has not fetched (HEAD ${head.slice(0, 8)})` };
  }
  const [ahead, behind] = git(cwd, ["rev-list", "--left-right", "--count", `HEAD...${remote}`]).split(/\s+/).map(Number);
  const parts = [];
  if (ahead) parts.push(`${ahead} unpushed commit${ahead === 1 ? "" : "s"}`);
  if (behind) parts.push(`${behind} behind origin`);
  return { ok: false, detail: `HEAD ${head.slice(0, 8)} vs origin ${remote.slice(0, 8)}: ${parts.join(", ")}` };
};

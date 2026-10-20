import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./types";

// The harness must never be uploaded with the functions source. Two facts about firebase-tools
// (15.19.1, lib/deploy/functions/prepareFunctionsUpload.js and lib/fsAsync.js) make this lock exact:
//  1. A configured `ignore` REPLACES the default ["node_modules", ".git"], so both must be restated
//     or every deploy starts uploading functions/node_modules.
//  2. Each pattern is matched by minimatch against the ABSOLUTE path with matchBase, and matchBase
//     only applies to a pattern with no slash — so "eval/**" matches nothing, and the bare name
//     "eval" (the same form as "node_modules") is what excludes the directory. Measured with the
//     CLI's own walker: "eval/**" left all 11 harness files in the upload; "eval" removed them and
//     nothing else.
describe("the functions deploy ignores the evaluation harness", () => {
  const cfg = JSON.parse(readFileSync(join(repoRoot(), "firebase.json"), "utf8"));
  it("restates the CLI's defaults and adds the harness", () => {
    expect(cfg.functions.ignore).toEqual(["node_modules", ".git", "eval"]);
  });
  it("uses no slashed pattern, which the CLI would silently never match", () => {
    for (const p of cfg.functions.ignore) expect(p, p).not.toContain("/");
  });
});

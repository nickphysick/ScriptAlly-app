/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the query↔package link (F7 of the Submission packages restructure).
 *
 * ⚠️ THE BUG THIS EXISTS TO STOP COMING BACK. `isValidQuery` requires `packageId` — a CREATE-time
 * shape check — but the query UPDATE rule's `affectedKeys().hasOnly([...])` omitted it. `hasOnly`
 * fails the WHOLE write if any changed key is outside the list, so attaching or detaching a package
 * on an existing query was denied, silently, and took the materials edit down with it because
 * `materialsLinkWrites` writes the pair together. Nothing errored where a user could see it.
 *
 * The two halves are asserted SEPARATELY and that is the point: the field being validated is what
 * made the omission invisible — the rule looked as though it knew about `packageId`, and it did,
 * in the half that never runs on an update.
 *
 * Like the other rule tests here (`homeCountryRule`, `agentCountryRule`, `agentIdentityRule`) this
 * asserts the real `firestore.rules` TEXT rather than behaviour — there is no Firestore emulator in
 * this environment (no Java). The true end-to-end is a live write after `firestore:rules` is
 * deployed, which is recorded in reports/submission-packages-restructure.md.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { sliceBetween } from "../test/sliceBetween";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

/* ⚠️ BOUNDED WITH `sliceBetween`, NEVER A BARE `indexOf` PAIR. A missing anchor makes `indexOf`
   return -1 and the slice silently widen to the rest of the file, at which point the assertions
   below would be reading OTHER collections' allowlists and passing for the wrong reason. */
const queryValidator = sliceBetween(rules, "function isValidQuery", "\n    }", "isValidQuery body");

const queryUpdateAllowlist = (() => {
  const block = sliceBetween(rules, "// ROUTE: Queries", "match /activity/{activityId}", "queries update rule");
  const m = block.match(/affectedKeys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
  expect(m, "the query update rule no longer has an affectedKeys().hasOnly([...]) list").not.toBeNull();
  /* ⚠️ COMMENTS STRIPPED BEFORE ASSERTING. This very allowlist now carries a nine-line comment
     naming `packageId` and quoting the bug — so a bare `toContain("packageId")` over the raw block
     would pass on the PROSE explaining the fix even if the key itself were removed. That is this
     repo's most-repeated lock failure, and the fix is always to assert on the declarations. */
  return (m?.[1] ?? "").replace(/\/\/[^\n]*/g, "");
})();

/** The allowlist as actual keys, so membership is exact rather than a substring match. */
const allowedKeys = queryUpdateAllowlist
  .split(",")
  .map((k) => k.trim().replace(/^'|'$/g, ""))
  .filter(Boolean);

describe("firestore.rules · the query↔package link", () => {
  it("isValidQuery requires packageId as a string (the create-time shape)", () => {
    expect(queryValidator.replace(/\s+/g, " ")).toContain("data.packageId is string");
  });

  /* ⚠️ THE ONE THAT WAS RED. Exact key membership, not `toContain` — see the comment-strip note. */
  it("the query UPDATE allowlist admits packageId, so a link can be attached and detached", () => {
    expect(allowedKeys, "packageId is not in the query update allowlist — attaching a package to an existing query is silently denied").toContain("packageId");
  });

  /* Guard #1's pair. `materialsLinkWrites` writes the package link OR the free-text materials and
     always clears the other, so a save touching one touches both — if only one were allowlisted the
     write would still fail hasOnly, and the fix would look done while nothing worked. */
  it("admits materialsWanted too — the two are written together or not at all", () => {
    expect(allowedKeys).toContain("materialsWanted");
  });

  /* A regression guard with teeth: the slice must have found a real list, not an empty string that
     makes every `toContain` above vacuous. The list is long and its length is not the assertion —
     that it is plainly a list of many keys is. */
  it("read a real allowlist rather than an empty slice", () => {
    expect(allowedKeys.length).toBeGreaterThan(20);
    expect(allowedKeys).toContain("status");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the materials model's two flow-pack additions: the `ref` content mode (NAME ONLY) and the
 * stored `wordCount`.
 *
 * ⚠️ THE VALIDATOR AND THE UPDATE ALLOWLIST ARE ASSERTED SEPARATELY, for the reason F7 cost a day:
 * a field can be perfectly validated and still be undeployable, because `isValidVersion` runs on
 * every write while `affectedKeys().hasOnly` runs only on updates. `packageId` was in the first and
 * not the second, and attaching a package was silently denied for months. `wordCount` changes on
 * every edit of pasted text, so it is exactly the same shape — checked here before it can bite.
 *
 * As with the other rule tests in this repo (`homeCountryRule`, `agentCountryRule`,
 * `packageLinkRule`), this asserts the real `firestore.rules` TEXT: there is no Firestore emulator
 * available here (no Java). The end-to-end is a live write after deploy, recorded in
 * reports/submission-packages-flow.md.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { sliceBetween } from "../test/sliceBetween";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

/* Bounded with sliceBetween — a bare indexOf pair silently widens to the rest of the file when an
   anchor is renamed, and every assertion then reads another collection's rules while passing. */
const versionValidator = sliceBetween(rules, "function isValidVersion", "\n    }", "isValidVersion body");

const versionsUpdateAllowlist = (() => {
  const block = sliceBetween(rules, "match /versions/{versionId}", "// ROUTE: SubmissionPackages", "versions update rule");
  const m = block.match(/affectedKeys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
  expect(m, "the versions update rule no longer has an affectedKeys().hasOnly([...]) list").not.toBeNull();
  /* ⚠️ COMMENTS STRIPPED FIRST. The allowlist now carries a comment naming `wordCount` and quoting
     the F7 lesson, so a bare toContain would pass on the prose even if the key were deleted. */
  return (m?.[1] ?? "").replace(/\/\/[^\n]*/g, "");
})();

const allowedKeys = versionsUpdateAllowlist
  .split(",").map((k) => k.trim().replace(/^'|'$/g, "")).filter(Boolean);

/** The validator with its own comments stripped, for the same reason. */
const decls = versionValidator.replace(/\/\/[^\n]*/g, "");

describe("firestore.rules · the materials model", () => {
  it("admits the four content modes, including ref", () => {
    for (const mode of ["text", "link", "file", "ref"]) {
      expect(decls, `contentType '${mode}' is not admitted`).toContain(`data.contentType == '${mode}'`);
    }
  });

  /* ⚠️ `ref` IS NOT `link`. Both survive: link was a URL to where the text lives, ref names the file
     the material sits in. If a future edit ever collapses them, this fails and says why. */
  it("keeps ref and link as separate modes", () => {
    expect(decls).toContain("data.contentType == 'link'");
    expect(decls).toContain("data.contentType == 'ref'");
  });

  it("admits wordCount as an absent-or-int, never a null", () => {
    /* `is int` is false for null, so "not counted" can only mean the key is omitted. */
    expect(decls).toMatch(/wordCount'\]\)\s*\|\|\s*\(data\.wordCount is int/);
  });

  it("bounds wordCount rather than accepting any integer", () => {
    expect(decls).toMatch(/data\.wordCount >= 0/);
    expect(decls).toMatch(/data\.wordCount <= \d+/);
  });

  /* ⚠️ THE ONE THAT WOULD OTHERWISE BE THE NEXT F7. */
  it("has wordCount in the versions UPDATE allowlist, so editing pasted text is not denied", () => {
    expect(allowedKeys, "wordCount is not in the versions update allowlist — every edit that changes pasted text would be silently denied").toContain("wordCount");
  });

  it("still allows the fields the modal writes alongside it", () => {
    for (const k of ["versionName", "contentDraft", "contentType", "fileName"]) {
      expect(allowedKeys).toContain(k);
    }
  });

  /* A real list was read, not an empty slice that makes every toContain above vacuous. */
  it("read a real allowlist", () => {
    expect(allowedKeys.length).toBeGreaterThan(5);
  });
});

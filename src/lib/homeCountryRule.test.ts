/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the User.homeCountry self-update gate. Like the other rule tests in this repo, this asserts
 * the real `firestore.rules` TEXT rather than behaviour — the Firestore emulator isn't available here
 * (no Java). It is RED on the pre-location rules (homeCountry absent from isValidUser + the user-update
 * allowlist → silently denied) and GREEN once both edits land. The true end-to-end is a live write
 * after `firestore:rules` is deployed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

// Isolate the isValidUser(...) body so we don't accidentally match another validator.
const userValidator = (() => {
  const start = rules.indexOf("function isValidUser");
  return rules.slice(start, rules.indexOf("\n    }", start)).replace(/\s+/g, " ");
})();

// Isolate the users/{userId} update rule allowlist (the affectedKeys().hasOnly([...]) line).
const userUpdateAllowlist = (() => {
  const matchStart = rules.indexOf("match /users/{userId}");
  const block = rules.slice(matchStart, rules.indexOf("// ROUTE: Manuscripts", matchStart));
  const m = block.match(/affectedKeys\(\)\.hasOnly\(\[([^\]]*)\]\)/);
  return m ? m[1] : "";
})();

describe("firestore.rules · user homeCountry self-update gate", () => {
  it("isValidUser admits an optional homeCountry string (absent-or-string idiom)", () => {
    expect(userValidator).toMatch(
      /!data\.keys\(\)\.hasAny\(\['homeCountry'\]\) \|\| \(data\.homeCountry is string/,
    );
  });

  it("rejects a literal null — the gate is `data.homeCountry is string`, not a looser check", () => {
    // `is string` is false for null, so a null write is denied; "not set" must mean the key is omitted.
    expect(userValidator).toMatch(/data\.homeCountry is string && data\.homeCountry\.size\(\) <= 64/);
  });

  it("the user-update allowlist permits homeCountry", () => {
    expect(userUpdateAllowlist).toContain("'homeCountry'");
  });

  it("the update rule is still owner-scoped (no cross-user writes)", () => {
    // homeCountry rides the existing users/{userId} update rule, which is gated on isOwner(userId).
    const matchStart = rules.indexOf("match /users/{userId}");
    const block = rules.slice(matchStart, rules.indexOf("// ROUTE: Manuscripts", matchStart));
    expect(block).toMatch(/allow update: if isOwner\(userId\)/);
  });
});

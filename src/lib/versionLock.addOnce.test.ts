/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2.1, locks 8 and 9 (the direct-write halves) — the add-once rule. A sent letter's text may be written
 * once, while its saved text is empty, and that add undone; a sent letter with text refuses every content write, as v2
 * did. And `updateVersion` really consults the rule, before any write (a rule nothing calls guards nothing).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { contentWriteAllowed } from "./versionLock";

const DELETE = { _methodName: "deleteField" }; // the shape of a FieldValue sentinel: an object, not a string

describe("contentWriteAllowed — the add-once rule", () => {
  it("a letter that has not gone out: always", () => {
    expect(contentWriteAllowed({ sent: false, savedText: "Dear agent", hasIncomingText: true, incomingText: "x" })).toBe(true);
  });
  it("lock 7's write: a sent letter with no saved text takes its text once", () => {
    for (const saved of [undefined, null, "", "   \n "]) {
      expect(contentWriteAllowed({ sent: true, savedText: saved, hasIncomingText: true, incomingText: "Dear agent" }), String(saved)).toBe(true);
    }
  });
  it("lock 8: after the add, the same letter refuses another write", () => {
    expect(contentWriteAllowed({ sent: true, savedText: "Dear agent", hasIncomingText: true, incomingText: "Dear agent, edited" })).toBe(false);
  });
  it("lock 9: a sent letter that always had text refuses a direct write (v2's lock holds), with or without new text", () => {
    expect(contentWriteAllowed({ sent: true, savedText: "The text it went with", hasIncomingText: true, incomingText: "Rewritten" })).toBe(false);
    expect(contentWriteAllowed({ sent: true, savedText: "The text it went with", hasIncomingText: false })).toBe(false);
  });
  it("Undo of the add may only put the text back to empty", () => {
    expect(contentWriteAllowed({ sent: true, savedText: "Dear agent", hasIncomingText: true, incomingText: DELETE, restoring: true })).toBe(true);
    expect(contentWriteAllowed({ sent: true, savedText: "Dear agent", hasIncomingText: true, incomingText: "", restoring: true })).toBe(true);
    expect(contentWriteAllowed({ sent: true, savedText: "Dear agent", hasIncomingText: true, incomingText: "Other words", restoring: true })).toBe(false);
    expect(contentWriteAllowed({ sent: true, savedText: "Dear agent", hasIncomingText: false, restoring: true })).toBe(false);
  });
});

describe("updateVersion consults the rule before it writes", () => {
  const db = readFileSync("src/lib/db.tsx", "utf8");
  const fn = db.slice(db.indexOf("const updateVersion = async"), db.indexOf("const deleteVersion = async"));
  it("the sent check calls contentWriteAllowed, above the write", () => {
    expect(fn.length).toBeGreaterThan(100);
    const check = fn.indexOf("!contentWriteAllowed({");
    const write = fn.indexOf("await updateDoc(");
    expect(check).toBeGreaterThan(0);
    expect(write).toBeGreaterThan(check);
    expect(fn).toMatch(/isVersionSent\(id, queries, packages\) && !contentWriteAllowed\(\{/);
  });
});

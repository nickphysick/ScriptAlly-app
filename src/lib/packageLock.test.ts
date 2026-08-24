/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ D-D1 — a package is freely editable until its first send, then it locks ═══════════════════
 *
 * The rule that makes the whole attachment model work. Because a sent package can never change, a
 * query may render its LIVE contents and can never misreport what an agent received — so there is
 * no snapshot, no copied materials, and no divergence to explain.
 *
 * ⚠️ THE RULES ARE THE GUARANTEE; THIS FILE AND THE CLIENT CHECK ARE THE EXPLANATION. A source lock
 * proves the clause was written, never that Firestore honours it — that is measured against the
 * deployed database by `tests/e2e/rulesProbe.mjs`, whose eight cases prove the lock is a LOCK and
 * not a WALL (the unsent write must still be accepted, or a rule denying every slot write would
 * pass this file and break the feature).
 *
 * ⚠️ AND THE STORED FIELD IS DELIBERATE. Sent-ness is "some query holds this packageId and has gone
 * out"; Firestore rules can `get()` a document by path but cannot QUERY a collection, and there is
 * no reverse index from a package to its queries. The derived form is not expressible in the one
 * place enforcement has to happen.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPackageLocked, LOCKED_PACKAGE_FIELDS, LOCKED_NOTE, LOCKED_WHY, duplicateName,
} from "./packageMetrics";
import type { SubmissionPackage } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ Comments first — this pack's prose names every field and state it forbids. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const pkg = (over: Partial<SubmissionPackage> = {}): SubmissionPackage => ({
  id: "p1", manuscriptId: "m1", userId: "u1", packageName: "Standard UK",
  queryLetterVersionId: "v-l", synopsisVersionId: "v-s", samplePagesVersionId: "",
  status: "Active", createdDate: "2026-08-01T00:00:00.000Z", ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
describe("isPackageLocked — absence is the whole test", () => {
  it("an unsent package is not locked", () => {
    expect(isPackageLocked(pkg())).toBe(false);
  });
  it("a stamped package is", () => {
    expect(isPackageLocked(pkg({ firstSentAt: "2026-08-20T00:00:00.000Z" }))).toBe(true);
  });
  it("a package that has never been sent carries NO stamp, rather than an empty one", () => {
    // ⚠️ ABSENT, NEVER `""`. A stored empty string would be a claim that a send happened and had no
    // date — and `!!""` is false, so the predicate would still read unlocked while the document
    // said otherwise. Absence is the honest encoding and the rule's `hasAny` reads it that way.
    expect(pkg().firstSentAt).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("what the lock freezes, and what it deliberately does not", () => {
  it("exactly the three version slots", () => {
    expect([...LOCKED_PACKAGE_FIELDS]).toEqual([
      "queryLetterVersionId", "synopsisVersionId", "samplePagesVersionId",
    ]);
  });

  it("NOT the name, the status, or the free-text line", () => {
    /**
     * ⚠️ RENAMING A SENT PACKAGE IS NOT CHANGING WHAT WENT. The lock exists so a query cannot
     * misreport an agent's envelope; a name is the writer's own filing label. And freezing `status`
     * would make a sent package impossible to archive — the un-archive trap one step along.
     */
    for (const open of ["packageName", "status", "otherMaterials"]) {
      expect([...LOCKED_PACKAGE_FIELDS], `${open} must stay writable`).not.toContain(open);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("duplicateName — D-D2, the way forward from a locked package", () => {
  it("names the first duplicate v2", () => {
    expect(duplicateName("Standard UK", ["Standard UK"])).toBe("Standard UK v2");
  });
  it("steps past names already taken", () => {
    expect(duplicateName("Standard UK", ["Standard UK", "Standard UK v2", "Standard UK v3"]))
      .toBe("Standard UK v4");
  });
  it("does not stack suffixes — duplicating a v2 gives v3, never 'v2 v2'", () => {
    // ⚠️ THE BASE IS STRIPPED FIRST. Without it a writer duplicating twice ends up with
    // "Standard UK v2 v2", which reads as a filing error rather than a third version.
    expect(duplicateName("Standard UK v2", ["Standard UK", "Standard UK v2"]))
      .toBe("Standard UK v3");
  });
  it("survives an empty name", () => {
    expect(duplicateName("   ", [])).toBe("Package v2");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the copy states the fact and offers the way on", () => {
  it("no verdict, no warning tone", () => {
    for (const line of [LOCKED_NOTE, LOCKED_WHY]) {
      expect(line).not.toMatch(/careful|sorry|unfortunately|cannot be undone|permanent|warning|afraid/i);
    }
  });
  it("the note names the fact; the why names the reason", () => {
    expect(LOCKED_NOTE).toBe("Locked — this package has been sent");
    expect(LOCKED_WHY).toContain("what the agent actually received");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the client refuses the write, and says why", () => {
  const db = decls(read("src/lib/db.tsx"));

  it("updatePackage checks the lock before writing", () => {
    expect(db).toContain("isPackageLocked(live) && LOCKED_PACKAGE_FIELDS.some((k) => k in fields)");
  });

  it("it RETURNS the reason rather than throwing or shrugging", () => {
    /**
     * ⚠️ THE REPORTED FAULT WAS SILENCE, NOT A BUG. A caller that cannot tell a refusal from a
     * success closes its form on a write it never made — and without this the refusal arrives from
     * three layers away as "Database transaction error".
     */
    expect(db).toContain("return `${LOCKED_NOTE}. ${LOCKED_WHY}`");
    expect(db).toMatch(/updatePackage[\s\S]{0,400}Promise<string \| null>/);
  });

  it("markPackageSent is the stamp's SINGLE writer, and is idempotent", () => {
    const writes = (db.match(/firstSentAt:\s*new Date\(\)\.toISOString\(\)/g) ?? []).length;
    expect(writes, "the stamp has more than one writer").toBe(1);
    // reading first is what makes the FIRST send the fact, rather than the last
    expect(db).toContain("if (!live || live.firstSentAt) return;");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the rule — proven against the deployed database by rulesProbe, asserted here as written", () => {
  const rules = decls(read("firestore.rules"));

  it("the stamp is a validated optional string", () => {
    expect(rules).toContain("!data.keys().hasAny(['firstSentAt'])");
    expect(rules).toContain("data.firstSentAt is string");
  });

  it("a sent package's three slots cannot change", () => {
    expect(rules).toContain(
      "!existing().keys().hasAny(['firstSentAt'])");
    expect(rules).toMatch(
      /affectedKeys\(\)\.hasAny\(\['queryLetterVersionId', 'synopsisVersionId', 'samplePagesVersionId', 'firstSentAt'\]\)/);
  });

  it("the stamp is write-once — it is in the SAME forbidden set", () => {
    // ⚠️ LEFT MUTABLE IT WOULD BE THE UNLOCK: clear the field, edit the slots, guarantee gone.
    const i = rules.indexOf("!existing().keys().hasAny(['firstSentAt'])");
    expect(i, "the immutability clause is gone").toBeGreaterThan(-1);
    expect(rules.slice(i, i + 320)).toContain("'firstSentAt'");
  });

  it("name, status and otherMaterials stay in the allowlist", () => {
    const i = rules.indexOf("match /packages/{packageId}");
    expect(i).toBeGreaterThan(-1);
    const block = rules.slice(i, rules.indexOf("match /agents/{agentId}", i));
    for (const k of ["'packageName'", "'status'", "'otherMaterials'", "'firstSentAt'"]) {
      expect(block, `${k} is not writable`).toContain(k);
    }
  });
});

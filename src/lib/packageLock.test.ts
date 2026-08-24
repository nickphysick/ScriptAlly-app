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

  it("every stamp is written INSIDE an atomic batch, never on its own", () => {
    /**
     * ⚠️ THE CLAIM CHANGED SHAPE, AND THE OLD ONE NAMED A FUNCTION THAT NEVER RAN. It asserted
     * `markPackageSent` was the single writer — but `markPackageSent` had **no caller**, written in
     * anticipation of a surface that turned out not to need it. Both real paths stamp inside their
     * own `writeBatch`: `commitQueryEdits` for the drawer, `setQueryPackage` for the pane, each
     * atomic with the link write it accompanies. A standalone stamp had nowhere safe to be called
     * from, which is precisely why nothing called it, and it is retired.
     *
     * ⚠️ SO THE INVARIANT IS NOT "one writer" BUT "no stamp outside a batch" — two surfaces, two
     * commits, and neither can leave a package locked with nothing sent.
     */
    expect(db, "markPackageSent is back").not.toMatch(/const markPackageSent\s*=/);
    const stamps = [...db.matchAll(/firstSentAt:\s*new Date\(\)\.toISOString\(\)/g)];
    expect(stamps.length, "no stamp writer in db.tsx").toBeGreaterThan(0);
    for (const m of stamps) {
      const before = db.slice(0, m.index ?? 0);
      const batchAt = before.lastIndexOf("writeBatch(db)");
      const commitAt = before.lastIndexOf("batch.commit()");
      expect(batchAt, "a stamp is written outside any batch").toBeGreaterThan(-1);
      expect(batchAt, "a stamp is written after its batch has committed").toBeGreaterThan(commitAt);
    }
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

// ─────────────────────────────────────────────────────────────────────────────
describe("D-D2 / D-D3 — the lock is visible where editing happens, and offers the way on", () => {
  const band = decls(read("src/components/packages/PackagesBand.tsx"));
  const modal = decls(read("src/components/packages/PackageModal.tsx"));
  const page = decls(read("src/components/SubmissionPackages.tsx"));

  it("a sent package's card says so, in the words the writer needs", () => {
    /**
     * ⚠️ THE REPORTED FAULT WAS SILENCE. Nothing on the page said a sent package cannot change, so
     * "edited it, nothing happened" read as a bug rather than as a rule.
     */
    expect(band).toContain("isPackageLocked(pkg)");
    expect(band).toContain("{LOCKED_NOTE}");
    expect(band).toContain("{LOCKED_WHY}");
  });

  it("Duplicate & edit sits in the same box as the note", () => {
    // ⚠️ A note that states a refusal and offers nothing is where a reader stops.
    const i = band.indexOf("pkgb-locked");
    expect(i, "the locked block is gone").toBeGreaterThan(-1);
    const block = band.slice(i, i + 900);
    expect(block).toContain("onDuplicatePackage");
    expect(block).toContain("Duplicate &amp; edit");
  });

  it("duplicating is a CREATE — the sent package is never the write target", () => {
    /**
     * ⚠️ THE ENTIRE POINT OF D-D2. `pkgEditing` stays null while `pkgDuplicating` is set, so
     * `savePackageDraft` takes the `addPackage` branch and the sent package is untouched.
     */
    expect(page).toContain("setPkgEditing(null);\n                  setPkgDuplicating(");
    expect(page).toMatch(/if \(pkgEditing\) \{[\s\S]{0,600}updatePackage\(pkgEditing\.id/);
  });

  it("the two modes are mutually exclusive at every entry point", () => {
    // open-to-edit clears duplicating; duplicate clears editing; new clears both.
    expect(page).toContain("setPkgDuplicating(null);\n                  setPkgModal(true);");
    expect(page).toContain("setPkgEditing(null); setPkgDuplicating(null); setPkgModal(true);");
  });

  it("the builder seeds from whichever it was given, and names the duplicate", () => {
    expect(modal).toContain("const seed = editing ?? duplicating ?? null;");
    expect(modal).toContain("duplicateName(duplicating.packageName, existingNames)");
    expect(modal).toContain('duplicating ? "Duplicate package"');
  });

  it("the note reports rather than warns — no caution palette", () => {
    const css = decls(read("src/components/packages/packagesBroadsheet.css"));
    const i = css.indexOf(".pkgb-locked {");
    expect(i, ".pkgb-locked is not declared").toBeGreaterThan(-1);
    const rule = css.slice(i, css.indexOf("}", i));
    // ⚠️ A sent package having stopped changing is the feature working, not damage.
    expect(rule).not.toMatch(/#f?[ae]|amber|blush|--pkg-pink\b/i);
    expect(rule).toContain("sage");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Ruling 2 — the stamp rides the write that creates the link", () => {
  const save = decls(read("src/lib/saveQueryEdits.ts"));
  const drawer = decls(read("src/components/EditQueryDrawer.tsx"));

  it("it is written inside the SAME batch as the query patch", () => {
    /**
     * ⚠️ ATOMICITY IS THE WHOLE POINT (D1). A stamp that can land without the link locks a package
     * nothing went out with; a link without the stamp leaves a live-rendered package editable
     * underneath a send. One `writeBatch`, one commit, so neither is reachable.
     */
    const i = save.indexOf("const batch = writeBatch(db);");
    const commit = save.indexOf("await batch.commit();", i);
    expect(i, "the batch is gone").toBeGreaterThan(-1);
    expect(commit, "the commit is gone").toBeGreaterThan(i);
    const inBatch = save.slice(i, commit);
    expect(inBatch, "the stamp is written outside the batch").toContain("ops.stampPackageId");
    expect(inBatch).toContain("firstSentAt: new Date().toISOString()");
  });

  it("a stamp on its own counts as an edit", () => {
    // ⚠️ Without this a save carrying ONLY the stamp short-circuits at the no-edits guard and the
    //    package never locks — the guard silently eating the one write that mattered.
    const i = save.indexOf("export function hasQueryEdits");
    const body = save.slice(i, save.indexOf("}", save.indexOf("return", i)));
    expect(body).toContain("if (ops.stampPackageId) return true;");
  });

  it("the caller only stamps a package that is NOT already stamped", () => {
    /**
     * ⚠️ WRITE-ONCE IS THE RULE, AND A DENIED WRITE FAILS THE WHOLE BATCH. Without this check a
     * writer re-selecting the same package — or correcting an unrelated field on an already-sent
     * one — would have their entire save refused.
     */
    expect(drawer).toContain("!isPackageLocked(stampTarget) ? { stampPackageId: stampTarget.id }");
  });

  it("it stamps only when the package link was actually touched", () => {
    // Opening the drawer and saving something else must not stamp anything.
    expect(drawer).toContain("materialsTouched && effPackageId");
  });

  it("detach does not unstamp — a package that has been sent has been sent (D4)", () => {
    /**
     * ⚠️ THE ABSENCE IS THE ASSERTION. Removing a package from a query does not unsend it: other
     * queries may hold it, and the agent received what they received. The rule refuses a clear
     * anyway; this is the client agreeing rather than trying.
     */
    const q = decls(read("src/components/Queries.tsx"));
    const i = q.indexOf("const detachPackage = (");
    const body = q.slice(i, q.indexOf("const writeMaterials = (", i));
    expect(i).toBeGreaterThan(-1);
    expect(body).not.toContain("firstSentAt");
  });

  it("nothing else in the app writes the stamp", () => {
    // ⚠️ SINGLE WRITER. `markPackageSent` in db.tsx and this batch are the two, and they are the
    //    same act reached from two surfaces; a third would be a third answer to "when did it go out".
    const roots = ["src/lib/db.tsx", "src/lib/saveQueryEdits.ts"];
    for (const f of ["src/components/Queries.tsx", "src/components/ImportCsv.tsx",
                     "src/components/packages/PackageModal.tsx", "src/lib/packagesOverview.ts"]) {
      expect(decls(read(f)), `${f} writes firstSentAt`).not.toMatch(/firstSentAt\s*:/);
    }
    const writers = roots.filter((f) => /firstSentAt\s*:\s*new Date/.test(decls(read(f))));
    expect(writers.sort()).toEqual(["src/lib/db.tsx", "src/lib/saveQueryEdits.ts"]);
  });
});

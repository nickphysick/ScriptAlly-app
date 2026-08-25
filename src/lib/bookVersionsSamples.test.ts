/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SAMPLES REFERENCE A VERSION (Part C) ══════════════════════════════════════════════════════
 *
 * Design authority: design-refs/manuscript-loop-design.html §3.
 *
 * ⚠️ D13 IS THE CONSTRAINT MOST LIKELY TO SLIP, AND MOST OF THIS FILE DEFENDS IT. Packages take NO
 * version field — not on the model, not in the builder, not on the card. They inherit through the
 * sample, so there is exactly ONE edge and the two can never disagree. The pull towards a second
 * edge is real: "versions inside packages" was the original suggestion, and adding a field there
 * would look like a convenience rather than the model breaking.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { materialColumns, materialShelf } from "./packagesOverview";
import { createPayload, updatePayload } from "./materialDraft";
import { ComponentType } from "../types";
import type { BookVersion, ManuscriptVersion, SubmissionPackage } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const bv = (id: string, name: string): BookVersion =>
  ({ id, name, kind: "reordering", createdDate: "2026-05-01" });
const TWO = [bv("bv-a", "Prologue-first"), bv("bv-b", "Worldbuilding-first")];

const mat = (id: string, type: ComponentType, bookVersionId?: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u", componentType: type, versionName: id,
     fileAttached: false, createdDate: "2026-03-01T00:00:00.000Z", bookVersionId } as ManuscriptVersion);

const sheetsFor = (mats: ManuscriptVersion[], versions: readonly BookVersion[]) =>
  materialShelf(mats, [] as SubmissionPackage[], versions);

// ─────────────────────────────────────────────────────────────────────────────
describe("D12 — the chip on a sample's card", () => {
  it("names the version a sample carries", () => {
    const [sh] = sheetsFor([mat("s1", ComponentType.SAMPLE_PAGES, "bv-a")], TWO);
    expect(sh.bookVersionName).toBe("Prologue-first");
  });

  it("is ABSENT on a letter or a synopsis carrying a stray id", () => {
    for (const type of [ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS]) {
      const [sh] = sheetsFor([mat("s1", type, "bv-a")], TWO);
      expect(sh.bookVersionName, `${type} rendered a version chip`).toBeUndefined();
      /* and the key is OMITTED, not set to undefined — absent is the app's "not recorded" */
      expect("bookVersionName" in sh).toBe(false);
    }
  });

  it("is absent on a sample carrying none", () => {
    const [sh] = sheetsFor([mat("s1", ComponentType.SAMPLE_PAGES)], TWO);
    expect("bookVersionName" in sh).toBe(false);
  });

  it("⚠️ is absent BELOW TWO VERSIONS, however the sample is stored", () => {
    /* The fence: a writer with one version sees no chip anywhere. The gate is read ONCE, in the
       derivation, so no surface can render a chip by forgetting to ask. */
    for (const versions of [[], [bv("bv-a", "Prologue-first")]]) {
      const [sh] = sheetsFor([mat("s1", ComponentType.SAMPLE_PAGES, "bv-a")], versions);
      expect("bookVersionName" in sh, `a chip at ${versions.length} version(s)`).toBe(false);
    }
  });

  it("is absent when a caller passes no versions at all", () => {
    const [col] = materialColumns([mat("s1", ComponentType.SAMPLE_PAGES, "bv-a")], []).filter((c) => c.sheets.length);
    expect("bookVersionName" in col.sheets[0]).toBe(false);
  });

  it("names an unknown id as nothing, rather than as the id", () => {
    const [sh] = sheetsFor([mat("s1", ComponentType.SAMPLE_PAGES, "bv-gone")], TWO);
    expect("bookVersionName" in sh).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D11/D14 — the modal's one field", () => {
  const modal = read("src/components/packages/MaterialModal.tsx");
  const src = decls(modal);

  it("is SELECTED, never typed — the vocabulary is defined in one place", () => {
    expect(src).toContain('id="pkgf-bookversion"');
    expect(src).toContain("<select");
    /* a text input bound to the version would let "Prologue-first" and "prologue first" both exist */
    expect(src).not.toMatch(/<input[^>]*bookVersion/i);
  });

  it("offers a way to record nothing", () => {
    expect(src).toContain('<option value="">');
  });

  it("appears on SAMPLE PAGES ONLY, and only above two versions", () => {
    expect(src).toContain("const showVersionField = type === ComponentType.SAMPLE_PAGES && bookVersions.length >= 2");
    expect(src).toContain("{showVersionField && (");
  });

  it("⚠️ seeds from what is STORED and never defaults to the latest", () => {
    /* A pre-filled answer the writer did not give is a recorded fault class in this app: a strip
       once stated three facts as the writer's before they had said any of them. */
    expect(src).toContain('useState(editing?.bookVersionId ?? "")');
    expect(src).not.toMatch(/latestVersion|bookVersions\[bookVersions\.length/);
  });

  it("D14 — states the limitation rather than hiding it", () => {
    expect(modal).toMatch(/records the\s+reference/);
    expect(modal).toMatch(/can&rsquo;t check that the text matches/);
  });

  it("drops the choice if the type is changed away from sample pages", () => {
    expect(src).toContain("bookVersionId: showVersionField ? bookVersionId :");
  });
});

describe("the write — absent means unwritten", () => {
  const base = { type: ComponentType.SAMPLE_PAGES, name: "Chapters 1–3", mode: "paste" as const,
                 text: "x", refName: "" };

  it("omits the key on create when nothing was chosen", () => {
    expect("bookVersionId" in createPayload({ ...base, bookVersionId: "" }, "m1")).toBe(false);
    expect("bookVersionId" in createPayload(base, "m1")).toBe(false);
  });

  it("stores it when one was", () => {
    expect(createPayload({ ...base, bookVersionId: "bv-a" }, "m1").bookVersionId).toBe("bv-a");
  });

  it("⚠️ CLEARING IT UNSETS — 'I picked the wrong version' has to be correctable", () => {
    const { set, unset } = updatePayload({ ...base, bookVersionId: "" });
    expect("bookVersionId" in set).toBe(false);
    expect(unset).toContain("bookVersionId");
  });

  it("sets it on an edit that chooses one", () => {
    const { set, unset } = updatePayload({ ...base, bookVersionId: "bv-b" });
    expect(set.bookVersionId).toBe("bv-b");
    expect(unset).not.toContain("bookVersionId");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ D13 — packages take NO version field, anywhere", () => {
  /**
   * ⚠️ THE ONE EDGE IS THE MODEL. A package that carried its own version could disagree with the
   * sample it holds, and there would be no answer to which was right. "Versions inside packages"
   * was the original suggestion and it is deliberately not built — so this reads as a convenience
   * somebody might add, which is exactly why it is locked rather than left to memory.
   */
  it("the SubmissionPackage type has no version member", () => {
    const types = decls(read("src/types.ts"));
    const i = types.indexOf("export interface SubmissionPackage {");
    expect(i).toBeGreaterThan(-1);
    const body = types.slice(i, types.indexOf("\n}", i));
    expect(body).not.toMatch(/bookVersion/i);
  });

  it("the package builder and the package card never mention one", () => {
    for (const f of ["src/components/packages/PackageModal.tsx",
                     "src/components/packages/PackagesBand.tsx"]) {
      expect(read(f), `${f} names a book version`).not.toMatch(/bookVersion/i);
    }
  });

  it("the rules do not allow one on a package", () => {
    const rules = readFileSync(join(root, "firestore.rules"), "utf8");
    const i = rules.indexOf("function isValidPackage");
    expect(i).toBeGreaterThan(-1);
    expect(rules.slice(i, rules.indexOf("\n    }", i))).not.toMatch(/bookVersion/i);
    /* ⚠️ AND THE ALLOWLIST IS BOUNDED AT ITS OWN CLOSING BRACKET, not by a character count. A
       fixed-length slice is the "slice(-1) reads the rest of the file" family one step along: it
       passes today because the list happens to be short, and silently stops covering the tail the
       day somebody adds a key. */
    const from = rules.indexOf("'packageName', 'queryLetterVersionId'");
    expect(from).toBeGreaterThan(-1);
    const end = rules.indexOf("])", from);
    expect(end).toBeGreaterThan(from);
    expect(rules.slice(from, end)).not.toMatch(/bookVersion/i);
  });

  it("⚠️ the aggregation reaches a package THROUGH its sample slot, never through a field of its own", () => {
    const src2 = decls(read("src/lib/bookVersions.ts"));
    expect(src2).toContain("p.samplePagesVersionId");
    expect(src2).not.toMatch(/\bp\.bookVersionId\b/);
  });
});

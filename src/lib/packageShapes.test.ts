/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ FLEXIBLE PACKAGE SHAPES — optional slots, and one free-text line that nothing counts ═══════
 *
 * Design authority: design-refs/package-shapes-amendment.html.
 *
 * Two claims, and the second is the one that will be broken by accident:
 *
 *   1. Only the covering letter is required. Letter-only and letter-plus-synopsis are real
 *      submission shapes, so synopsis and sample both offer a stated `Not included`.
 *   2. **`otherMaterials` is free text and MUST NEVER BE AGGREGATED** (F-N). It is prose the writer
 *      typed, not a reference to a saved version, so it has no identity to compare between
 *      packages. Counting it would either invent one — treating two differently-worded outlines as
 *      two different materials — or collapse them into a single fake one. "Requests by material"
 *      keys off a version id; this has none, and the absence is the design.
 *
 * ⚠️ THE AGGREGATION CHECK ASSERTS TWO DERIVATIONS AGAINST EACH OTHER, not against a literal. A
 * hand-written list of "things that must not mention otherMaterials" would go green the day someone
 * adds a fourth derivation, because the list would not know about it. Instead: the set of fields a
 * package contributes to any per-material derivation is READ from `PACKAGE_SLOTS`, and the claim is
 * that `otherMaterials` is not in it — so a new slot added there is caught, and so is this one being
 * quietly promoted into it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UNFILLED_SLOT, isSlotFilled, otherMaterialsText, OTHER_MAX } from "./packageMetrics";
import { PACKAGE_SLOTS, packageItems, linkedChips } from "./packageAttach";
import { packageTiles } from "./packagesOverview";
import { ComponentType, RecordStatus, SubmissionPackage, ManuscriptVersion } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ Strip comments first — these files' prose NAMES the fields and states being asserted. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const pkg = (over: Partial<SubmissionPackage> = {}): SubmissionPackage => ({
  id: "p1", manuscriptId: "m1", userId: "u1", packageName: "Standard UK",
  queryLetterVersionId: "v-letter",
  synopsisVersionId: UNFILLED_SLOT,
  samplePagesVersionId: UNFILLED_SLOT,
  status: "Active" as RecordStatus,
  createdDate: "2026-08-01T00:00:00.000Z",
  ...over,
});

const version = (id: string, type: ComponentType, name: string): ManuscriptVersion =>
  ({ id, manuscriptId: "m1", userId: "u1", componentType: type, versionName: name,
     status: "Active", createdDate: "2026-07-01T00:00:00.000Z" } as unknown as ManuscriptVersion);

const versions = [
  version("v-letter", ComponentType.QUERY_LETTER, "Hook-first"),
  version("v-syn", ComponentType.SYNOPSIS, "One-page"),
  version("v-smp", ComponentType.SAMPLE_PAGES, "Chapters 1–3"),
];

// ─────────────────────────────────────────────────────────────────────────────
describe("otherMaterialsText — absent, blank and whitespace are all 'no line'", () => {
  it("returns null when the key is absent", () => {
    expect(otherMaterialsText(pkg())).toBeNull();
  });
  it("returns null for empty and for whitespace-only", () => {
    // ⚠️ WHITESPACE MATTERS: a space-only value would otherwise render an empty Caveat row, which
    // reads as a rendering fault rather than as an unanswered question.
    expect(otherMaterialsText(pkg({ otherMaterials: "" }))).toBeNull();
    expect(otherMaterialsText(pkg({ otherMaterials: "   \n " }))).toBeNull();
  });
  it("trims what it returns", () => {
    expect(otherMaterialsText(pkg({ otherMaterials: "  chapter outline  " }))).toBe("chapter outline");
  });
  it("its ceiling matches the rule's, so the input cannot compose a refused write", () => {
    const rules = read("firestore.rules");
    expect(rules).toContain(`data.otherMaterials.size() <= ${OTHER_MAX}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the tile — three slot rows always, an Other line only when filled", () => {
  it("renders all three slot rows even when two are empty (letter-only)", () => {
    const [t] = packageTiles([pkg()], versions, []);
    expect(t.slots).toHaveLength(3);
    expect(t.slots.map((s) => s.state)).toEqual(["held", "empty", "empty"]);
  });

  it("omits Other entirely when it is not filled — no row, not a blank one", () => {
    const [t] = packageTiles([pkg()], versions, []);
    expect(t.other).toBeNull();
  });

  it("carries Other when filled", () => {
    const [t] = packageTiles([pkg({ otherMaterials: "chapter outline" })], versions, []);
    expect(t.other).toBe("chapter outline");
  });

  /**
   * ⚠️ THE LOAD-BEARING ONE. If Other ever lands in `slots`, everything that walks `slots` starts
   * treating prose as a material — silently, and correctly as far as the types are concerned.
   */
  it("NEVER puts Other in slots, whatever its value", () => {
    const [t] = packageTiles([pkg({ otherMaterials: "chapter outline" })], versions, []);
    expect(t.slots).toHaveLength(3);
    expect(t.slots.map((s) => s.label)).not.toContain("Other");
    expect(t.slots.some((s) => s.name === "chapter outline")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("F-N — nothing aggregates the free-text line", () => {
  /**
   * ⚠️ DERIVED FROM `PACKAGE_SLOTS`, NOT FROM A LITERAL LIST. This is the check that has to survive
   * a fourth slot being added by someone who has never read this file.
   */
  it("otherMaterials is not one of the fields a package contributes to per-material work", () => {
    const contributing = PACKAGE_SLOTS.map((s) => String(s.key));
    expect(contributing.length).toBeGreaterThanOrEqual(3);
    expect(contributing).not.toContain("otherMaterials");
  });

  it("packageItems yields nothing for it — a free-text line cannot become an attachable item", () => {
    const items = packageItems(pkg({ otherMaterials: "chapter outline" }), versions);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => JSON.stringify(i).includes("chapter outline"))).toBe(false);
  });

  it("no per-material derivation reads the field at all", () => {
    /**
     * Every module that groups, counts or ranks BY MATERIAL. Reading the field here would mean a
     * free-text line had been given a version's privileges.
     *
     * ⚠️ THE TOKEN IS BOUNDED, AND THE FIRST DRAFT OF THIS CHECK WAS NOT — it counted the substring,
     * so the ACCESSOR'S OWN NAME (`otherMaterialsText`) scored a read of the field it exists to
     * wrap, and the case went red on correct code. The same prefix trap the repo has hit with
     * `tdk-q`/`tdk-quiet`. `(?![A-Za-z0-9_])` is what makes it a field reference rather than any
     * identifier that happens to start with one.
     */
    const fieldReads = (src: string) => (src.match(/otherMaterials(?![A-Za-z0-9_])/g) ?? []).length;
    for (const f of ["src/lib/packageMetrics.ts", "src/lib/packageAnalytics.ts",
                     "src/lib/packageTracking.ts", "src/lib/packageAttach.ts"]) {
      const reads = fieldReads(decls(read(f)));
      // packageMetrics DEFINES the accessor (its parameter type and the one property read); no
      // module may CONSUME the field.
      const allowed = f.endsWith("packageMetrics.ts") ? 2 : 0;
      expect(reads, `${f} reads otherMaterials ${reads}× (allowed ${allowed})`).toBeLessThanOrEqual(allowed);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the rule — the letter is required on CREATE and only on create", () => {
  const rules = decls(read("firestore.rules"));

  it("isValidPackage does NOT require a filled letter", () => {
    /**
     * ⚠️ THE POINT IS THE ABSENCE, AND IT IS NOT FUSSINESS. `isValidPackage` gates UPDATE too, so
     * requiring a filled letter there would make every package written before this rule permanently
     * unupdatable — and therefore un-archivable and unrepairable, silently. A letterless legacy
     * record is a shape the writer has to be able to fix.
     */
    const fn = rules.slice(rules.indexOf("function isValidPackage"));
    const body = fn.slice(0, fn.indexOf("function isValidAgent"));
    expect(body).toContain("data.queryLetterVersionId is string");
    expect(body).not.toContain("data.queryLetterVersionId.size() >= 1");
  });

  it("the create rule requires one", () => {
    expect(rules).toContain("incoming().queryLetterVersionId.size() >= 1");
  });

  it("all three slot keys are still required to be PRESENT", () => {
    for (const k of ["queryLetterVersionId", "synopsisVersionId", "samplePagesVersionId"]) {
      expect(rules).toContain(`data.${k} is string`);
    }
  });

  it("otherMaterials is optional by key and in the update allowlist", () => {
    // ⚠️ BOTH HALVES OR THE WRITE IS SILENTLY DENIED — the allowlist omission is a recorded fault
    // class in this repo, and it fails with no error the client can act on.
    expect(rules).toContain("!data.keys().hasAny(['otherMaterials'])");
    expect(rules).toMatch(/hasOnly\(\[[^\]]*'otherMaterials'[^\]]*\]\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the builder states which slots are optional, and unsets rather than storing ''", () => {
  const modal = read("src/components/packages/PackageModal.tsx");
  const body = decls(modal);

  it("the hint says only the letter is required", () => {
    expect(modal).toContain("Only the covering");
    expect(modal).toContain("letter is required — send what each agency asks for.");
  });

  it("the hint no longer says 'one of each' — it is no longer true", () => {
    expect(body).not.toContain("one of each");
  });

  it("the synopsis offers Not included and the version Not recorded; the letter offers neither", () => {
    const between = (from: string, to: string) => {
      const a = body.indexOf(from);
      const b = body.indexOf(to, a + 1);
      // ⚠️ ASSERT BOTH ANCHORS — indexOf returns -1 and slice(-1) silently widens to the rest.
      expect(a, `anchor missing: ${from}`).toBeGreaterThan(-1);
      expect(b, `anchor missing: ${to}`).toBeGreaterThan(a);
      return body.slice(a, b);
    };
    /**
     * ⚠️ RETARGETED: the third slot is the VERSION, and its empty option is a different word for a
     * different fact. `Not included` says the writer left a material out; `Not recorded` says they
     * have not said which shape of the book this package tests — and D3 makes that permanent,
     * since a sent package can never gain one. Rendering the version's empty state as "Not
     * included" would claim the package was built without a manuscript.
     */
    expect(between("pkgf-pkg-letter", "pkgf-pkg-synopsis")).not.toContain("NOT_INCLUDED");
    expect(between("pkgf-pkg-synopsis", "pkgf-pkg-version")).toContain("NOT_INCLUDED");
    const ver = between("pkgf-pkg-version", "pkgf-pkg-other");
    expect(ver).toContain("NOT_RECORDED");
    expect(ver, "the version slot must not borrow the material wording").not.toContain("NOT_INCLUDED");
  });

  it("every slot label carries Required or Optional", () => {
    expect((body.match(/pkgf-opt/g) ?? []).length).toBe(4);
    expect(body).toContain(">Required<");
    expect(body).toContain(">Optional<");
    expect(body).toContain("Optional · free text");
  });

  it("editing an existing package does not re-fill a slot the writer left out", () => {
    // ⚠️ Seeding from `synopses[0]` on EDIT would fabricate a value the writer never chose — the
    // same family as a default branch that writes. Only a new package takes a default.
    /* ⚠️ THE SEED, NOT `editing` — the builder now opens on either the package being edited or the
       one being COPIED (D-D2), and both must preserve an empty slot. The claim is unchanged; the
       expression it reads was widened, which is exactly when a source lock needs re-pointing rather
       than re-writing. */
    expect(body).toContain("const seed = editing ?? duplicating ?? null;");
    expect(body).toContain("seed ? (isSlotFilled(seed.synopsisVersionId)");
  });

  it("the composition line omits unfilled slots rather than printing Not included", () => {
    expect(body).toContain("[letterId, synopsisId, sampleId].filter(isSlotFilled)");
  });

  it("a blank free-text field is UNSET by updatePackage, never stored as an empty string", () => {
    /**
     * ⚠️ RETARGETED FROM A LINE TO THE CLAIM, and the law is unchanged. This pinned the literal
     * `payload.otherMaterials = t ? t : deleteField()`; Part F generalised that into a loop when
     * the NOTE became the second unsettable field, so the lock went red on a refactor that changed
     * nothing it was about. A source lock that pins an implementation cannot tell a refactor from a
     * regression — which is the only thing it exists to do.
     *
     * What is asserted now is the property: the unsettable set is NAMED, both members are in it,
     * and a blank becomes `deleteField()` rather than `""`. The version slots must stay OUT of it —
     * they use `""` as their sentinel and `isValidPackage` requires the key present, so unsetting
     * one would be denied.
     */
    const db = decls(read("src/lib/db.tsx"));
    const i = db.indexOf("const updatePackage");
    expect(i, "updatePackage is gone").toBeGreaterThan(-1);
    const body2 = db.slice(i, db.indexOf("\n  };", i));
    /* ⚠️ THE ARRAY ITSELF, NOT THE FUNCTION BODY. The slot names appear in this function's TYPE
       SIGNATURE, so a `not.toContain` over the whole body fails on a correct build — the claim is
       about the unsettable SET, so that is what gets sliced. */
    const set = /of (\[[^\]]*\]) as const/.exec(body2);
    expect(set, "the unsettable set is no longer a named array").not.toBeNull();
    expect(set![1]).toBe('["otherMaterials", "note"]');
    expect(body2).toMatch(/deleteField\(\)/);
  });

  it("⚠️ clearing a note takes its timestamp with it", () => {
    /* A stamp surviving a cleared note has the drawer's footer state when a note that no longer
       exists last changed. */
    const db = decls(read("src/lib/db.tsx"));
    expect(db).toMatch(/if \(k === "note" && !t\) payload\.noteEditedAt = deleteField\(\);/);
  });

  it("save is refused, with a stated reason, when there is no covering letter", () => {
    // ⚠️ A DISABLED BUTTON WITH NO SENTENCE TEACHES NOTHING, and the write would otherwise be
    // refused by the rule three layers away as "Database transaction error".
    expect(body).toContain("const noLetter = !isSlotFilled(letterId)");
    expect(body).toContain("disabled={saving || noLetter}");
    expect(modal).toContain("Save a covering letter first");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the card renders Other as a note, not as a fourth material", () => {
  const band = decls(read("src/components/packages/PackagesBand.tsx"));
  const css = decls(read("src/components/packages/packagesBroadsheet.css"));

  it("the row is conditional on the value", () => {
    /* ⚠️ IT HAS MOVED TWICE AND THE CLAIM IS UNCHANGED: it renders only when filled. From the slot
       list into the card body (D-B1), and now into the ledger's name cell (D12) — which is the only
       home left, since it is not a slot and so has no column, and the drawer does not render it
       either. Dropping it with the card would have made something the writer typed invisible
       everywhere in the app. */
    expect(band).toContain("{t.other && <span className=\"pkgb-pother\">");
  });

  it("it is set in Caveat, in burgundy, and not italicised on top", () => {
    const a = css.indexOf(".pkgb-sln--other");
    expect(a, ".pkgb-sln--other is not declared").toBeGreaterThan(-1);
    const rule = css.slice(a, css.indexOf("}", a));
    expect(rule).toContain("'Caveat', cursive");
    expect(rule).toContain("var(--pkg-burg)");
    expect(rule).toContain("font-style: normal");
  });

  it("it does not read an undefined custom property", () => {
    // ⚠️ `var(--font-hand, 'Caveat', cursive)` would render correctly and be a knob that does not
    // exist — the fault class this repo records as "parameterised and is not".
    expect(css).not.toContain("--font-hand");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-D5 — a linked package's chips name its real materials", () => {
  const versions = [
    { id: "v-l", componentType: ComponentType.QUERY_LETTER, versionName: "Hook-first" },
    { id: "v-s", componentType: ComponentType.SYNOPSIS, versionName: "One-page" },
  ] as unknown as ManuscriptVersion[];
  const linked = pkg({ queryLetterVersionId: "v-l", synopsisVersionId: "v-s", samplePagesVersionId: "" });

  it("resolves each slot to its version NAME, never the canonical type", () => {
    /**
     * ⚠️ THE REPORTED BUG, AND ITS REAL SHAPE. A linked query rendered ONE chip carrying the
     * package's name, with `Covering letter · Synopsis · Sample pages` hidden in a `title` tooltip
     * — the TYPE of each slot rather than the material in it, and only on hover.
     */
    const chips = linkedChips(linked, versions);
    expect(chips.map((c) => c.name)).toEqual(["Hook-first", "One-page"]);
    for (const c of chips) {
      expect(["Covering letter", "Synopsis", "Sample pages", "Opening sample"]).not.toContain(c.name);
    }
  });

  it("carries a SHORT slot eyebrow", () => {
    // ⚠️ The name beside it is what the writer reads; a full `Covering letter` above `Hook-first`
    //    states the type twice at the size of the thing that matters.
    expect(linkedChips(linked, versions).map((c) => c.eyebrow)).toEqual(["Letter", "Syn"]);
  });

  it("an unfilled slot produces no chip at all", () => {
    // the sample is `""` above — an omitted slot is not a thing that went
    expect(linkedChips(linked, versions)).toHaveLength(2);
  });

  it("a slot whose material is GONE says so, rather than blanking (D3)", () => {
    /**
     * ⚠️ FILLED-BUT-UNRESOLVABLE IS NOT THE SAME AS EMPTY. The slot still records that something
     * went; only its name is missing. A blank chip reads as a rendering fault and omitting the row
     * hides the send.
     */
    const chips = linkedChips(pkg({ queryLetterVersionId: "v-deleted", synopsisVersionId: "", samplePagesVersionId: "" }), versions);
    expect(chips).toHaveLength(1);
    expect(chips[0].name).toBe("No longer available");
    expect(chips[0].missing).toBe(true);
  });

  it("the tooltip derivation it replaces is gone from the page", () => {
    const page = decls(read("src/components/Queries.tsx"));
    expect(page, "pkgComponents is back").not.toContain("const pkgComponents");
    /* ⚠️ MATCHED ON THE CALL'S SHAPE, NOT ITS ARGUMENT LIST. This pinned
       `linkedChips(linkedPackage, versions)` exactly and went red the day the helper gained a third
       argument — about a claim that had not moved. THE LAW IS "the chips come from `linkedChips`
       rather than a local derivation", and an argument the helper happens to take is not part of it. */
    expect(page).toMatch(/linkedChips\(\s*linkedPackage\s*,\s*versions\b/);
  });

  it("D-D6 — the chips are not the editable attached-material pill", () => {
    // ⚠️ `.qc-mchip-att` carries a × and an editor; a package's contents cannot be edited from the
    //    query, so these are a different class that happens to share the chip's shape.
    const page = decls(read("src/components/Queries.tsx"));
    /**
     * ⚠️ THE ANCHOR IS ASSERTED BEFORE THE SLICE, and it was not.
     *
     * This sliced from `indexOf("linkedChips(linkedPackage, versions)")` — which returned **-1** the
     * day the helper gained a third argument. `slice(-1, 499)` yields `""`, and the three assertions
     * then ran against an empty string. The positive one failed loudly, which is luck: the two
     * `not.toContain`s would both have passed on `""`, and this case would have gone green having
     * checked nothing. The `sliceBetween` family, one anchor along.
     */
    const i = page.search(/linkedChips\(\s*linkedPackage\s*,\s*versions\b/);
    expect(i, "the linkedChips call site has moved — this slice reads nothing").toBeGreaterThan(-1);
    const block = page.slice(i, i + 900);
    expect(block).toContain("qc-mchip-slot");
    expect(block).not.toContain("qc-mchip-att");
    expect(block).not.toContain("qc-mchipx");
  });
});

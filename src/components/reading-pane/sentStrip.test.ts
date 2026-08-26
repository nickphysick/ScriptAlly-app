/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SENT STRIP — Option A, one row, two cells ═════════════════════════════════════════════
 *
 * Design authority: design-refs/package-strip-parcel.html.
 *
 * ⚠️ THIS FILE REPLACES THE STATIONERY BAND'S SUITE, IN THE SAME COMMIT AS THE BAND. A lock kept
 * alive against a deleted construction is how that construction gets restored; every case here is
 * either about Option A or about a claim that outlived it.
 *
 * ⚠️ WHAT IT CANNOT DO. These are source and derivation checks — they prove the rules were written,
 * never that the browser laid them out. The row's HEIGHT, the mark's legibility at 24px and the
 * retired classes' absence from the SERVED stylesheet are measured in `tests/e2e/` and reported
 * separately. A CSS lock proving a rule exists is exactly the fault class this repo records against
 * `auto-fit`: the declaration WAS the bug, and the lock asserted the declaration.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARCEL_PX } from "./PackageGroup";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ Comments first — this pack's prose quotes the very classes and tokens it retired. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const tsx = read("src/components/reading-pane/PackageGroup.tsx");
const css = read("src/components/reading-pane/packageGroup.css");
const cssD = decls(css);
const timeline = decls(read("src/components/reading-pane/QueryTimeline.tsx"));

/** One CSS rule body, by exact selector. Asserts the selector exists before slicing. */
const rule = (sel: string) => {
  const i = cssD.indexOf(`${sel} {`);
  expect(i, `${sel} is not declared`).toBeGreaterThan(-1);
  return cssD.slice(i, cssD.indexOf("}", i));
};

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C1 — attachments hang off a send and nothing else", () => {
  it("the timeline renders sentExtra only on a send row", () => {
    /* ⚠️ ASSERT THE GATE ITSELF. "No request row shows a strip" is trivially true of a page that
       renders no rows at all — the vacuous-probe family. The gate is the claim. */
    expect(timeline).toContain("row.status === QueryStatus.QUERIED");
    expect(timeline).toContain("const showsExtra = !!sentExtra");
    expect(timeline).toContain("{showsExtra && sentExtra}");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Option A — one row, two cells (D1)", () => {
  it("is a flex row that clips its cells to its own radius", () => {
    const r = rule(".qc-pstrip");
    expect(r).toContain("display: flex");
    expect(r).toContain("border: 1px solid var(--pro-edge)");
    expect(r).toContain("border-radius: 9px");
    /* ⚠️ LOAD-BEARING, NOT TIDINESS: without it the blue cell's square corners stick out. */
    expect(r).toContain("overflow: hidden");
  });

  it("the left cell is the blue one, bordered on its right", () => {
    const r = rule(".qc-ps-nm");
    expect(r).toContain("linear-gradient(180deg, var(--pro-a), var(--pro-b))");
    expect(r).toContain("border-right: 1px solid var(--pro-edge)");
    expect(r).toContain("color: var(--pro-ink)");
    /* it sizes to its content so the white cell takes the slack */
    expect(r).toContain("flex: 0 0 auto");
  });

  it("the right cell is white — it declares no fill of its own", () => {
    expect(rule(".qc-ps-sl")).not.toContain("background");
    expect(rule(".qc-pstrip")).toContain("background: #ffffff");
  });

  it("the name clears Playfair's descenders", () => {
    /* ⚠️ THE STANDING FLOOR. A package name is writer-supplied, so it can hold a `g` or a `y`, and
       this row has a near-fixed height. */
    expect(rule(".qc-ps-nm b")).toContain("line-height: 1.3");
    expect(rule(".qc-ps-nm b")).toContain("var(--f12-serif)");
  });

  it("the slots read as `LABEL Value`, not as pills", () => {
    /* ⚠️ THE HOST'S OWN CHILDREN, STRIPPED — not rebuilt. That is what keeps the sample's version
       chip working without this file knowing anything about versions. */
    const r = rule(".qc-ps-sl .qc-mchip-slot");
    for (const gone of ["background: none", "border: none", "padding: 0"]) expect(r).toContain(gone);
    expect(rule(".qc-ps-sl .qc-mchipeye")).toContain("text-transform: uppercase");
    expect(rule(".qc-ps-sl .qc-mchiptx")).toContain("font-weight: 600");
  });
});

describe("D2/D7 — the commissioned parcel", () => {
  it("renders at 24px, which is a floor rather than a starting point", () => {
    expect(PARCEL_PX).toBe(24);
    expect(decls(tsx)).toContain("width={PARCEL_PX} height={PARCEL_PX}");
  });

  it("⚠️ is IMPORTED from src/assets, not referenced from public/", () => {
    /* The convention every recent asset follows: hashed filename, build-time error if it goes
       missing, one folder per feature area. See F-BF. */
    expect(tsx).toContain('from "../../assets/packages/package-mark.png"');
    expect(decls(tsx)).not.toMatch(/src="\/[a-z-]+\.png"/);
  });

  it("carries no alt text — the name beside it is the accessible label", () => {
    expect(decls(tsx)).toContain('alt=""');
  });

  it("⚠️ there is no 2× file, and the source is big enough that there need not be", () => {
    const { size } = require("node:fs").statSync(join(root, "src/assets/packages/package-mark.png"));
    expect(size).toBeGreaterThan(1000);
    /* 100×100 against a 24px box is better than 4×; a second asset would be bytes for nothing. */
    expect(require("node:fs").existsSync(join(root, "src/assets/packages/package-mark@2x.png"))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ D4 — the stationery band is GONE, not merely unused", () => {
  /**
   * Bounded tokens on both sides: `qc-stat` is a prefix of `qc-stat-acts`, which SURVIVES, so a
   * bare `toContain` would fail on a correct file. The delimiters are what make the claim exact.
   */
  it("no band rule survives in the stylesheet", () => {
    for (const c of ["qc-stat", "qc-stat-head", "qc-stat-body", "qc-stat-glyph", "qc-stat-l", "qc-stat-open"]) {
      expect(cssD, `.${c} still has a rule`).not.toMatch(new RegExp(`\\.${c}\\s*[{,]`));
    }
  });

  it("the mat, the gradient head and the separate body are all gone", () => {
    expect(cssD, "the mat's spread shadow survives").not.toContain("0 0 0 3px");
    /* the ONE gradient left is Option A's blue cell */
    expect((cssD.match(/linear-gradient/g) ?? []).length).toBe(1);
  });

  it("the component renders none of them", () => {
    const d = decls(tsx);
    for (const c of ["qc-stat-head", "qc-stat-body", "qc-stat-glyph", "qc-stat-l", "qc-stat-open"]) {
      expect(d, `${c} survives in the component`).not.toMatch(new RegExp(`["\\s\`]${c}["\\s\`]`));
    }
    expect(d, "the stroke glyph's path survives").not.toContain("M16 4 28 10v12L16 28 4 22V10z");
  });

  it("⚠️ and the survivors are named, so the sweep cannot creep into them (D6)", () => {
    /* `.qc-attach`, the drift note and the pointer controls all outlive the band deliberately. */
    for (const c of [".qc-attach", ".qc-stat-note", ".qc-stat-acts", ".qc-stat-a"]) {
      expect(cssD, `${c} was swept away with the band`).toContain(`${c} {`);
    }
  });
});

describe("D6 — everything else in the strip is unchanged", () => {
  it("Change package and Remove sit OUTSIDE the row", () => {
    const rowEnd = tsx.indexOf('className="qc-pstrip"');
    expect(rowEnd, "the row has moved").toBeGreaterThan(-1);
    const acts = tsx.indexOf('className="qc-stat-acts"');
    expect(acts).toBeGreaterThan(rowEnd);
    expect(tsx).toContain("Change package");
    expect(tsx).toContain(">Remove<");
  });

  it("the reveal is opacity, on hover AND focus-within", () => {
    expect(rule(".qc-stat-acts")).toContain("opacity: 0");
    expect(cssD).toContain(".qc-attach:focus-within .qc-stat-acts");
    expect(cssD).toContain("@media (hover: none), (pointer: coarse)");
  });

  it("offers no way to edit what is INSIDE the package", () => {
    const d = decls(tsx);
    expect(d).not.toContain("qc-mchipx");
    expect(d).not.toContain("qc-addmat");
  });
});

describe("D-C3 — loose materials have NO container, still", () => {
  /**
   * ⚠️ THE LOAD-BEARING CASE IN THIS FILE. The failure it guards is not a bug someone types by
   * mistake; it is a tidy-up someone makes on purpose, and it silently reverses the design's one
   * claim: a package is a convenience, not a status.
   */
  it("the floating row declares no border, fill, radius or shadow", () => {
    const r = rule(".qc-loose");
    for (const forbidden of ["border:", "border-radius", "background:", "box-shadow", "padding:"]) {
      expect(r, `.qc-loose has grown a container (${forbidden})`).not.toContain(forbidden);
    }
  });

  it("there is no 'Sent' slug wrapper and no promote control", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(decls(tsx)).not.toMatch(/["\s`]qc-loose-slug["\s`]/);
    expect(rules).not.toMatch(/["\s`.]qc-loose-promote["\s`{,:]/);
    expect(decls(tsx)).not.toContain("onSaveAsPackage");
  });
});

describe("no dashed placeholder anywhere in this strip", () => {
  it("the mark is a commissioned asset, not a commission slot", () => {
    const d = decls(tsx);
    expect(d).not.toContain("IllustrationSlot");
    expect(d).not.toContain("PARCEL_SLOT");
    expect(d).not.toContain("SHEETS_SLOT");
    expect(cssD).not.toContain("dashed");
  });
});

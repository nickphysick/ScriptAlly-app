/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SENT STRIP — contained when packaged, uncontained when not ════════════════════════════
 *
 * Design authority: design-refs/query-sent-strip-v2.html.
 *
 * The design's whole claim is **structural**: a package is a container and loose materials are not,
 * so the eye reads the difference before the words. Every case here defends one half of that, and
 * the half most likely to be broken by a well-meaning edit is the loose one — somebody will
 * eventually "tidy" the floating row into a light box, which turns *different* into *lesser*.
 *
 * ⚠️ WHAT THIS FILE CANNOT DO. These are source and derivation checks; they prove the rules were
 * written, never that the browser laid them out. The geometry claims — plate 38/22, the strip on one
 * row, nothing overlapping — are measured in `tests/e2e/`, and the report states which claims have
 * which kind of evidence. A CSS lock proving a rule exists is exactly the fault class this repo has
 * recorded against `auto-fit`: the declaration WAS the bug, and the lock asserted the declaration.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARCEL_SLOT, SHEETS_SLOT, STRIP_MARK_PX, STRIP_PLATE_PX } from "./PackageGroup";
import { PACKAGE_ICONS } from "../packages/packageIcons";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ Comments first — this pack's prose quotes the very classes and tokens it retired. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const tsx = read("src/components/reading-pane/PackageGroup.tsx");
const css = read("src/components/reading-pane/packageGroup.css");
const cssD = decls(css);
const queries = decls(read("src/components/Queries.tsx"));
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
    // ⚠️ ASSERT THE GATE ITSELF. "No request row shows a strip" is trivially true of a page that
    // renders no rows at all — the vacuous-probe family. The gate is the claim.
    expect(timeline).toContain("row.status === QueryStatus.QUERIED");
    expect(timeline).toContain("const showsExtra = !!sentExtra");
    expect(timeline).toContain("{showsExtra && sentExtra}");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C2 — packaged is a contained strip, and its blue is named once", () => {
  it("the three tokens carry the ref's values", () => {
    expect(cssD).toContain("--pro-fill: #e6edf4");
    expect(cssD).toContain("--pro-edge: #c3d5e4");
    expect(cssD).toContain("--pro-ink: #41627f");
    expect(cssD).toContain("--pro-slate: #6A89A7");
  });

  it("no call site restates a hex — every rule reads a token", () => {
    /**
     * ⚠️ THE POINT OF NAMING THEM. A second copy of `#e6edf4` in a rule is a value that will not
     * move when the token does, and F-M may well move it.
     */
    const afterTokens = cssD.slice(cssD.indexOf("}") + 1);
    const hexes = afterTokens.match(/#[0-9a-fA-F]{6}/g) ?? [];
    expect(hexes.filter((h) => !["#ffffff", "#7c3a2a", "#e8c8bc", "#3a1c14"].includes(h.toLowerCase())))
      .toEqual([]);
  });

  it("the strip is one row: slot, seal, items — and it is bordered and filled", () => {
    const r = rule(".qc-strip");
    expect(r).toContain("display: flex");
    expect(r).toContain("align-items: stretch");
    expect(r).toContain("border: 1px solid var(--pro-edge)");
    expect(r).toContain("border-radius: 10px");
    expect(rule(".qc-strip-slot")).toContain("background: var(--pro-fill)");
    expect(rule(".qc-strip-seal")).toContain("background: var(--pro-fill)");
  });

  it("the seal reads mono PACKAGE over the Playfair name, in that order", () => {
    const seal = tsx.indexOf('className="qc-strip-seal"');
    expect(seal, "the seal is not rendered").toBeGreaterThan(-1);
    const lbl = tsx.indexOf("qc-strip-lbl", seal);
    const nm = tsx.indexOf("{name}", seal);
    expect(lbl).toBeGreaterThan(-1);
    expect(nm).toBeGreaterThan(lbl); // label first
    expect(rule(".qc-strip-lbl")).toContain("text-transform: uppercase");
    expect(rule(".qc-strip-name")).toContain("Playfair Display");
  });

  it("the name's line-height clears Playfair's descenders", () => {
    // ⚠️ A PACKAGE NAME IS WRITER-SUPPLIED, so it can hold a `y` or a `g`. The standing law asks
    // 1.3 of mixed-case Playfair; the ref drew 1.15 with a name that happened to have none.
    const lh = rule(".qc-strip-name").match(/line-height:\s*([\d.]+)/);
    expect(lh, "no line-height on the package name").not.toBeNull();
    expect(Number(lh![1])).toBeGreaterThanOrEqual(1.3);
  });

  it("the pills inside take nothing from the strip", () => {
    const r = rule(".qc-strip-items");
    for (const forbidden of ["color:", "background:", "font-size:", "border:"]) {
      expect(r, `.qc-strip-items sets ${forbidden} on its children's row`).not.toContain(forbidden);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C3 — loose materials have NO container", () => {
  /**
   * ⚠️ THE LOAD-BEARING CASE IN THIS FILE. The failure it guards is not a bug someone types by
   * mistake; it is a tidy-up someone makes on purpose, and it silently reverses the design's one
   * claim. Stated as a property of the rule, not a list of today's declarations.
   */
  it("the floating row declares no border, fill, radius or shadow", () => {
    const r = rule(".qc-loose");
    for (const forbidden of ["border:", "border-radius", "background:", "box-shadow", "padding:"]) {
      expect(r, `.qc-loose has grown a container (${forbidden})`).not.toContain(forbidden);
    }
  });

  it("there is no 'Sent' slug wrapper — the ref defines one and never renders it", () => {
    expect(decls(tsx)).not.toMatch(/["\s`]qc-loose-slug["\s`]/);
    expect(cssD).not.toContain("qc-loose-slug");
  });

  it("slot B sits on a transparent ground, so the drawing is not given a container either", () => {
    expect(cssD).toContain(".qc-loose .pkgb-plate { background: transparent; }");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C4 — Save as package is offered once and never insisted on", () => {
  it("it is at the END of the row, after the materials", () => {
    const d = decls(tsx);
    expect(d.indexOf("{children}")).toBeLessThan(d.indexOf("qc-loose-promote"));
    expect(rule(".qc-loose-promote")).toContain("margin-left: auto");
  });

  it("it carries no colour weight — no fill, no pill", () => {
    const r = rule(".qc-loose-promote");
    expect(r).toContain("background: none");
    expect(r).not.toContain("border-radius");
    expect(r).not.toContain("padding: 4px");
  });

  it("nothing stores a dismissal", () => {
    // ⚠️ A THING YOU MAY IGNORE FOREVER NEEDS NOWHERE TO REMEMBER THAT YOU DID. A persisted
    // "dismissed" flag would be a rules field, a write and a migration for an offer with no state.
    const d = decls(tsx);
    expect(d).not.toMatch(/dismiss|localStorage|sessionStorage/i);
  });

  it("it is absent — not inert — when there is a package, and it shares the attach gate", () => {
    expect(queries).toContain("groups.length === 0 && canAttachPackages(currentUser)");
    expect(queries).toContain("? openPackages");
    // absent, because the prop is optional and the component omits the button when unset
    expect(decls(tsx)).toContain("{onSaveAsPackage && (");
  });

  it("the loose row itself is absent when there is nothing loose", () => {
    expect(queries).toContain("{loose.length > 0 && (");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C5 — two slots, one shared component, one library", () => {
  it("both marks exist in the shared library", () => {
    expect(Object.keys(PACKAGE_ICONS)).toContain(PARCEL_SLOT);
    expect(Object.keys(PACKAGE_ICONS)).toContain(SHEETS_SLOT);
  });

  it("both render at 22px inside a 38px plate", () => {
    expect(STRIP_MARK_PX).toBe(22);
    expect(STRIP_PLATE_PX).toBe(38);
    expect((decls(tsx).match(/px=\{STRIP_MARK_PX\}/g) ?? []).length).toBe(2);
    expect((decls(tsx).match(/width=\{STRIP_PLATE_PX\} height=\{STRIP_PLATE_PX\}/g) ?? []).length).toBe(2);
  });

  it("they go through IllustrationSlot, not a bespoke plate", () => {
    // ⚠️ ONE LIBRARY OR THEY DRIFT INTO TWO SETS. R1 established IllustrationSlot as the single
    // implementation for every slot; a hand-rolled 38px plate here would be the second.
    expect(tsx).toContain('import { IllustrationSlot } from "../packages/IllustrationSlot"');
    expect(decls(tsx)).not.toContain("<svg");
  });

  it("the chip plate has room for the mark — 8px radius and no padding", () => {
    const b = decls(read("src/components/packages/packagesBroadsheet.css"));
    const i = b.indexOf(".pkgb-plate--chip");
    expect(i, "the chip shape is not declared").toBeGreaterThan(-1);
    const r = b.slice(i, b.indexOf("}", i));
    expect(r).toContain("padding: 0");
    expect(r).toContain("border-radius: 8px");
  });

  it("the plate stays DASHED — these are still placeholders", () => {
    const b = decls(read("src/components/packages/packagesBroadsheet.css"));
    const i = b.indexOf(".pkgb-plate {");
    expect(b.slice(i, b.indexOf("}", i))).toContain("dashed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C6 / D-C7 — display only, and the derivation is untouched", () => {
  it("the package name is the strip's only control", () => {
    const d = decls(tsx);
    expect((d.match(/<button/g) ?? []).length).toBe(2); // the name, and the promote link
    expect(d).toContain('className="qc-strip-open"');
    expect(d).not.toContain("qc-strip-menu");
    // the separate `view` button of the block shape is retired into the name
    expect(d).not.toMatch(/["\s`]qc-pkggrp-view["\s`]/);
  });

  it("the strip adds no edit affordance of its own", () => {
    const d = decls(tsx);
    for (const verb of ["onEdit", "onRemove", "onDelete", "onCorrect"]) {
      expect(d, `the strip has grown an ${verb}`).not.toContain(verb);
    }
  });

  it("attachments never reach recomputeQuery", () => {
    // ⚠️ THE SINGLE-WRITER RULE. An attachment is payload on an activity; it must not participate in
    // deriving status, counts or dates.
    const rq = decls(read("src/lib/recomputeQuery.ts"));
    for (const t of ["packageId", "materialsWanted", "otherMaterials", "MaterialGroup"]) {
      expect(rq, `recomputeQuery reads ${t}`).not.toContain(t);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the block shape is gone, not merely unused", () => {
  it("no qc-pkggrp class survives in source or stylesheet", () => {
    // Bounded tokens — `qc-pkggrp` is a prefix of every class the old shape used.
    for (const c of ["qc-pkggrp", "qc-pkggrp-head", "qc-pkggrp-mark", "qc-pkggrp-id",
                     "qc-pkggrp-meta", "qc-pkggrp-items", "qc-pkggrp-note"]) {
      expect(decls(tsx), `${c} survives in the component`).not.toMatch(new RegExp(`["\\s\`]${c}["\\s\`]`));
      expect(cssD, `${c} survives in the stylesheet`).not.toContain(`.${c}`);
    }
  });

  it("the old pastille tokens are gone with it", () => {
    for (const t of ["--pastille:", "--pastille-tint", "--pastille-ink"]) {
      expect(cssD, `${t} survives`).not.toContain(t);
    }
  });
});

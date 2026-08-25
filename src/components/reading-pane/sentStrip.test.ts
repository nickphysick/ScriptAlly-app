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
import { PARCEL_SLOT, STRIP_MARK_PX, STRIP_PLATE_PX } from "./PackageGroup";
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
    /* ⚠️ THE TOKEN, NOT THE FAMILY NAME. This read `toContain("Playfair Display")`, which passed on
       the FALLBACK in `var(--f12-serif, 'Playfair Display', serif)`. The fallback is gone — this
       sheet renders inside `.t-f12`, which sets `--f12-serif` to exactly that family, so the
       fallback was provably inert and the token is what the rule should have been asserting all
       along. The claim is unchanged: the name is Playfair. */
    expect(rule(".qc-strip-name")).toContain("var(--f12-serif)");
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

});

// ─────────────────────────────────────────────────────────────────────────────
describe("D-C6 / D-C7 — display only, and the derivation is untouched", () => {
  it("the package name is the strip's only control", () => {
    /**
     * ⚠️ SUPERSEDED BY RULING 1, AND THE OLD FORM WAS A COUNT. It asserted exactly two buttons — the
     * name and the promote link — which was right when the strip had no pointer controls. It now
     * carries `Change package` and `Remove`, because WHICH package a query points at is that
     * query's own field and can be mistaken like any other.
     *
     * ⚠️ THE CLAIM THAT SURVIVES IS THE ONE THAT MATTERED: nothing here edits the package's
     * CONTENTS. That is a property, not a number, so it is asserted as one.
     */
    const d = decls(tsx);
    expect(d).toContain('className="qc-strip-open"');
    expect(d).not.toContain("qc-strip-menu");
    expect(d).not.toMatch(/["\s`]qc-pkggrp-view["\s`]/);
    /* no way to add to, or remove from, what is inside the package */
    expect(d, "a per-chip remove inside the strip").not.toContain("qc-mchipx");
    expect(d, "an attach control inside the strip").not.toContain("qc-mchip-add");
  });

  it("the strip adds no edit affordance of its own", () => {
    const d = decls(tsx);
    /* ⚠️ `onRemovePackage` IS THE POINTER, NOT THE CONTENTS — it changes this query's own field and
       rewrites nothing about the package. The content verbs stay forbidden. */
    for (const verb of ["onEdit", "onDelete", "onCorrect", "onRemoveMaterial"]) {
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

/**
 * ⚠️ THE LOOSE ROW'S SLOT AND ITS `Save as package ›` ARE RETIRED (D7/D8), so the cases that
 * asserted them are gone rather than adjusted — a lock kept alive against a deleted surface is how
 * that surface gets restored. What replaces them is the inverse, which is the stronger claim: the
 * row now carries pills and nothing else.
 *
 * ⚠️ AND `D-C5 — two slots` WENT WITH THEM, because there is one slot now. The packaged strip keeps
 * its parcel; the loose row never needed an emblem, and the contrast between the two is the design.
 */
describe("the loose row is pills and nothing else (D7/D8)", () => {
  it("declares no promote control and no slot rule", () => {
    /* ⚠️ COMMENTS STRIPPED FIRST — the standing rule, and it caught this on the first run. The
       sheet's own prose NAMES `.qc-loose-promote` to record that it is retired, which is exactly
       the documentation this repo wants and exactly what a bare `toContain` fails on. */
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).not.toMatch(/["\s`.]qc-loose-promote["\s`{,:]/);
    expect(rules).not.toContain(".qc-loose .pkgb-plate");
  });

  it("renders no illustration and no promote in the component", () => {
    const decls = tsx.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls).not.toContain("SHEETS_SLOT");
    expect(decls).not.toContain("onSaveAsPackage");
    /* ⚠️ THE PACKAGED STRIP KEEPS ITS OWN (D9) — asserted here so the removal above cannot creep. */
    expect(decls).toContain("PARCEL_SLOT");
  });
});

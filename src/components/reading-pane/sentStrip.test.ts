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
import { STRIP_MARK_PX } from "./PackageGroup";

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
describe("the stationery band — a letterhead over a body (Option B)", () => {
  it("is one card: a head, a body, and a mat that lifts it off the pane", () => {
    expect(tsx).toContain('className="qc-stat-head"');
    expect(tsx).toContain('className="qc-stat-body"');
    /* ⚠️ THE MAT IS A SPREAD SHADOW, NOT A BORDER OR A PADDED PARENT — it paints outside the card's
       rim without taking layout space, so the card keeps its box and everything below it stays put. */
    expect(rule(".qc-stat")).toContain("box-shadow: 0 0 0 3px var(--pro-fill)");
    expect(rule(".qc-stat")).toContain("border: 1px solid var(--pro-edge)");
  });

  it("the head reads glyph · Playfair name · right-aligned mono label", () => {
    const head = rule(".qc-stat-head");
    expect(head).toContain("align-items: baseline");
    expect(head).toContain("linear-gradient(180deg, var(--pro-fill), var(--pro-fill-deep))");
    expect(rule(".qc-stat-head h4")).toContain("var(--f12-serif)");
    /* the label is pushed right and refuses to shrink, so a long name wraps instead (D6) */
    expect(rule(".qc-stat-l")).toContain("margin-left: auto");
    expect(rule(".qc-stat-l")).toContain("flex: none");
    expect(tsx).toContain("Submission package");
  });

  it("the name clears Playfair's descenders", () => {
    /* ⚠️ THE REF GIVES NO LINE-HEIGHT, so this is the standing floor rather than a value read off a
       drawing — and a package name is writer-supplied, so it can hold a `g`, a `y` or a `p`. */
    expect(rule(".qc-stat-head h4")).toContain("line-height: 1.3");
  });

  it("the glyph is solid and permanent — no dashed placeholder anywhere (D5)", () => {
    expect(STRIP_MARK_PX).toBe(15);
    const d = decls(tsx);
    expect(d).not.toContain("IllustrationSlot");
    expect(d).not.toContain("PARCEL_SLOT");
    expect(d).not.toContain("SHEETS_SLOT");
    expect(cssD).not.toContain("dashed");
    /* it is drawn, not commissioned */
    expect(d).toContain("qc-stat-glyph");
  });

  it("the pills take nothing from the card (D3)", () => {
    /* ⚠️ THE BODY LAYS OUT AND NOTHING MORE. No colour, no size, no override — the packaged and
       loose states must read as one component in two moods. */
    const body = rule(".qc-stat-body");
    expect(body).not.toContain("color");
    expect(body).not.toContain("background");
    expect(body).toContain("flex-wrap: wrap");
  });
});

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
describe("the actions leave the object (D4), and the derivation is untouched", () => {
  it("Change package and Remove sit OUTSIDE the card", () => {
    /* ⚠️ WHICH PACKAGE A QUERY POINTS AT IS THE QUERY'S FIELD, not the package's — so the controls
       that change it sit beside the object rather than on it. */
    const acts = tsx.indexOf('className="qc-stat-acts"');
    const cardEnd = tsx.indexOf('</div>', tsx.indexOf('className="qc-stat-note"') > -1
      ? tsx.indexOf('className="qc-stat-note"') : tsx.indexOf('className="qc-stat-body"'));
    expect(acts).toBeGreaterThan(cardEnd);
    expect(tsx).toContain("Change package");
    expect(tsx).toContain(">Remove<");
  });

  it("offers no way to edit what is INSIDE the package", () => {
    const d = decls(tsx);
    expect(d).not.toContain("qc-mchipx");
    expect(d).not.toContain("qc-addmat");
  });
});

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
    /* ⚠️ THE PACKAGED CARD KEEPS ITS OWN MARK (D9) — asserted so the loose row's removal cannot
       creep into it. It is `qc-stat-glyph` now, not `PARCEL_SLOT`: the dashed commission slot was
       retired with Option B (D5) and the mark is drawn inline at 15px. */
    expect(decls).toContain("qc-stat-glyph");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · THE FOCUS SCRIM (ref design-refs/qdb-focus-spotlight.html).
 *
 * SUPERSEDES the per-surface dim (`qh-dim` opacity + brightness) and the darkened ground
 * (`--qh-focus-ground`). Both are deleted rather than layered under — a scrim plus three raised
 * elements is the whole mechanism.
 *
 * jsdom can't evaluate stacking contexts, so the audit that makes this work lives in the CSS
 * comment and in the browser checklist. What IS testable: the old approach is gone, the scrim
 * cannot swallow clicks, and the raise sits on the row rather than inside it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const index = read("../index.css");
const queries = read("../components/Queries.tsx");
/** Comments stripped — a count of class usages must not include the prose explaining them. */
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("the previous dim is GONE, not layered under", () => {
  it("no .qh-dim rule, class or token survives", () => {
    expect(code, "the dim class is still applied").not.toContain("qh-dim");
    expect(rule(".qh-dim"), "the dim rule is still in the sheet").toBe("");
    expect(css).not.toContain(".qh-focus .qh-dim");
  });

  it("the ground token and its rule are gone", () => {
    expect(index, "--qh-focus-ground survives").not.toContain("--qh-focus-ground");
    expect(css).not.toContain(".f12-root.qh-focus");
    // ...and .f12-root is back to painting nothing
    expect(rule(".f12-root"), "the hub is painting a ground again").not.toContain("background:");
  });
});

describe("the scrim", () => {
  it("is one full-viewport layer at the warm near-black token", () => {
    const r = rule(".qh-scrim");
    expect(r, "the .qh-scrim rule is missing").not.toBe("");
    expect(r).toContain("position: fixed");
    expect(r).toContain("inset: 0");
    expect(r).toContain("background: var(--qh-scrim)");
    expect(index).toContain("--qh-scrim: rgba(42, 31, 21, 0.42)");
  });

  it("CANNOT swallow clicks — the darkened list stays live", () => {
    expect(rule(".qh-scrim"), "pointer-events:none is the whole reason the click-away still works")
      .toContain("pointer-events: none");
    // and the row's click-away/discard path is untouched (pickRow = select + the mobile push —
    // Mobile Pass 1 — with the draft still resolved first)
    expect(queries).toContain("onClick={() => (creating ? closeCreate(() => pickRow(q.id)) : pickRow(q.id))}");
    expect(queries).toContain("setSelectedQueryId(id);"); // pickRow still selects
  });

  it("fades both ways from one transition, and not at all under reduced motion", () => {
    expect(rule(".qh-scrim")).toContain("transition: opacity 0.24s ease");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .qh-scrim { transition: none; } }");
    // always mounted, opacity-toggled — a conditional mount would need a frame to animate from
    expect(code).toContain('<div className="qh-scrim" aria-hidden="true" />');
  });

  it("is a child of the page root, NOT portalled", () => {
    // A body-level scrim would paint over the lit pane during the 180ms `pageIn` window, when
    // the stage slot is itself a stacking context (arriving via the rail's "+ Query").
    const root = code.indexOf("t-f12 f12-root");
    const scrim = code.indexOf('className="qh-scrim"');
    expect(scrim).toBeGreaterThan(root);
    expect(code.slice(root, scrim), "the scrim got portalled").not.toContain("createPortal");
  });
});

describe("exactly the right things are raised", () => {
  it("the raise is one rule, above the scrim", () => {
    const r = rule(".qh-focus .qh-lit");
    expect(r, "the raise rule is missing").not.toBe("");
    expect(r).toContain("position: relative");
    const lit = Number(r.match(/z-index: (\d+)/)?.[1]);
    const scrim = Number(rule(".qh-scrim").match(/z-index: (\d+)/)?.[1]);
    expect(lit).toBeGreaterThan(scrim);
  });

  it("the draft row is raised AS A UNIT — never an element inside it", () => {
    // The row animates its own opacity 0→1, and opacity < 1 creates a stacking context: a
    // z-index on a child would be trapped inside the row and never clear the scrim.
    expect(code).toMatch(/className=\{`f12-row f12-draft qh-lit\$\{/);
    expect(queries, "the reason must stay next to the raise").toContain("opacity < 1 makes it a stacking context");
  });

  it("the reading pane is raised", () => {
    // the wrapper lost its card skin (frame corrections); the RAISE is what this guards
    expect(code).toContain("qp-pane f12-detail qh-lit");
  });
});

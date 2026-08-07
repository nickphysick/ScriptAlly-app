/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P3 — the toolbar moves into the pane column
 * (ref design-refs/query-centre-final.html).
 *
 * The scrim's MOUNT is not revised by this pass. It is a child of .f12-root, not portalled,
 * because of the pageIn containing-block window (v10) — nothing here changes that reasoning.
 * The audit below is what licenses leaving it alone: no ancestor of a lit element creates a
 * stacking context, so the new workspace frame traps nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("the toolbar is a pane row now", () => {
  it("it renders INSIDE the reading pane, not in the page column", () => {
    const pane = code.indexOf("qp-pane f12-detail ");
    const bar = code.indexOf('className="f12-ctl', pane);
    const body = code.indexOf('className="f12-body"');
    expect(pane, "the pane is missing").toBeGreaterThan(-1);
    expect(bar, "the toolbar is not inside the pane").toBeGreaterThan(pane);
    expect(bar, "the toolbar is still above the panes in the page column").toBeGreaterThan(body);
  });

  it("and it is styled as a pane row — no page gutters, no centring", () => {
    const ctl = rule(".f12-ctl");
    expect(ctl).toContain("border-bottom: 1px solid var(--hairline)");
    expect(ctl, "the page-width band should be gone").not.toContain("var(--sa-col-max)");
    expect(ctl, "it no longer centres itself in the content column").not.toContain("margin: 0 auto");
  });

  it("create mode replaces it IN PLACE, in the same seat", () => {
    expect(code).toContain('className="f12-ctl f12-ctl-create"');
    expect(code).toContain("if (creating) {");
  });
});

describe("the redundant raises are gone", () => {
  /* ⚠️ AMENDED (create-mode v2, Phase 1): this used to assert that Cancel and Save carry NO
     qh-lit while the pane and the draft row do — a live distinction while a scrim existed to
     rank things against. The scrim is gone, so the assertion becomes the stronger and simpler
     one: NOTHING carries a raise, because there is nothing left to be raised above. */
  it("no z-raise survives anywhere — the scrim it existed for is gone", () => {
    expect(code).toContain('className="f12-btn-sec" onClick={() => closeCreate()}');
    expect(code).toContain('className="f12-btn-pri" onClick={saveCreate}');
    expect(code, "a raise outlived the scrim").not.toContain("qh-lit");
    expect(code, "the scrim element outlived its system").not.toContain("qh-scrim");
    expect(code, "the focus class outlived its system").not.toContain("qh-focus");
  });
});

describe("the scrim system is gone, and stays gone", () => {
  /* A deletion this wide needs a lock, or it comes back one rule at a time. The three names and
     the token are asserted absent from BOTH stylesheets and the page — anywhere a fragment could
     survive and quietly do nothing (or, worse, quietly do something). */
  const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  for (const name of ["qh-scrim", "qh-focus", "qh-lit"]) {
    it(`.${name} is absent from the page and both stylesheets`, () => {
      expect(code, `${name} survives in Queries.tsx`).not.toContain(name);
      expect(css, `${name} survives in f12.css`).not.toContain(name);
      expect(indexCss, `${name} survives in index.css`).not.toContain(name);
    });
  }

  it("the --qh-scrim token went with it — an unread token is a landmine, not a spare", () => {
    expect(indexCss).not.toContain("--qh-scrim");
  });

  /* ⚠️ NOT a scrim-system class, and deliberately KEPT: .qh-enter is the ROUTE-ENTRY stagger
     (masthead → toolbar → list → hero → cards → rows), shipped as its own phase with its own
     lock. It shares a prefix with the deleted classes and nothing else. */
  it("but the route-entry animation is untouched", () => {
    expect(code, "the load animation was deleted along with the scrim").toContain("qh-enter");
    expect(css).toContain(".qh-enter .f12-list");
  });
});

/* ⚠️ DELETED WITH THE SCRIM (create-mode v2, Phase 1) — a stacking-context audit over every
   ancestor of a "lit" element, a z-order comparison, and a check that the scrim stayed a child
   of the page root rather than being portalled. Every one of them was load-bearing while the
   focus system existed; none has a subject now. Recorded rather than dropped silently, because
   the reasoning is worth keeping: a `position: fixed` overlay mounted at body level would have
   painted OVER the pane during the 180ms `pageIn` window, when the stage slot is both a
   stacking context and the containing block for fixed positioning. Anyone reaching for an
   overlay on this page again should read that before mounting it. */


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
    const pane = code.indexOf("qp-pane f12-pane f12-detail qh-lit");
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
  /* Cancel and Save sit inside the pane now, and the pane is itself lit — so their own
     z-raise became dead weight the moment the toolbar moved in. Verified in the browser:
     both render above the scrim with zIndex:auto, carried by the pane's lift. */
  it("Cancel and Save no longer carry qh-lit", () => {
    expect(code).toContain('className="f12-btn-sec" onClick={() => closeCreate()}');
    expect(code).toContain('className="f12-btn-pri" onClick={saveCreate}');
    expect(code, "a dead raise was left in place").not.toContain("f12-btn-sec qh-lit");
    expect(code, "a dead raise was left in place").not.toContain("f12-btn-pri qh-lit");
  });

  it("exactly two things still carry it: the pane and the draft row", () => {
    expect(code.match(/qh-lit/g)?.length ?? 0).toBe(2);
  });
});

describe("the scrim survives the new frame (audit, not assumption)", () => {
  it("no ancestor of a lit element creates a stacking context", () => {
    const CREATORS = ["transform:", "filter:", "will-change:", "z-index:", "contain:", "isolation:", "backdrop-filter:"];
    for (const sel of [".f12-root", ".f12-body", ".f12-list", ".f12-pane", ".f12-detail", ".f12-rows", ".f12-ctl"]) {
      const r = rule(sel);
      for (const c of CREATORS) {
        expect(r, `${sel} creates a stacking context (${c}) — it would trap the lit elements`).not.toContain(c);
      }
    }
  });

  it("the scrim's mount is unchanged — still a child of the page root, still not portalled", () => {
    expect(code).toContain('<div className="qh-scrim" aria-hidden="true" />');
    const root = code.indexOf("t-f12 f12-root");
    const scrim = code.indexOf('className="qh-scrim"');
    expect(scrim).toBeGreaterThan(root);
    expect(code.slice(root, scrim)).not.toContain("createPortal");
  });

  it("and the lit elements still out-rank it", () => {
    const lit = Number(rule(".qh-focus .qh-lit").match(/z-index: (\d+)/)?.[1]);
    const scrim = Number(rule(".qh-scrim").match(/z-index: (\d+)/)?.[1]);
    expect(lit).toBeGreaterThan(scrim);
  });
});

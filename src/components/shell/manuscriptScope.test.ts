/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manuscriptViewPath, manuscriptViewHref, MANUSCRIPTS_PATH } from "./manuscriptScope";

const root = join(__dirname, "../../..");
const decls = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("picking a manuscript — scope everywhere, view only on the manuscripts page", () => {
  it("is a change of view on /manuscripts", () => {
    expect(manuscriptViewPath("/manuscripts", "abc")).toBe("/manuscripts?m=abc");
    /* A trailing slash is the same page, and App.tsx normalises the same way. */
    expect(manuscriptViewPath("/manuscripts/", "abc")).toBe("/manuscripts?m=abc");
  });

  /**
   * ⚠️ THE CLAUSE THE WHOLE HELPER EXISTS FOR. The switcher is global chrome; a control meaning
   * "which book am I working on" must not become "take me elsewhere" on nine pages out of ten.
   * Sub-routes count as elsewhere: /manuscripts/packages is a different page with its own job.
   */
  it("is NOT a change of view anywhere else", () => {
    for (const p of ["/queries", "/dashboard", "/agents", "/todo", "/manuscripts/packages", "/manuscripts/comps", "/"]) {
      expect(manuscriptViewPath(p, "abc"), `${p} navigated away`).toBeNull();
    }
  });

  it("encodes an id that would otherwise break the URL", () => {
    expect(manuscriptViewHref("a b&c=d")).toBe("/manuscripts?m=a%20b%26c%3Dd");
  });

  /**
   * ⚠️ BOTH SWITCHERS CALL THE HELPER, AND NEITHER RESTATES THE CONDITION. There are two — the
   * desktop picker in WorkspaceShell and the mobile one in ShellScope — which already differed
   * before this pass. A second copy of the rule would drift by BREAKPOINT: the kind nobody notices,
   * because whichever width you work at looks right.
   */
  it("both switchers read the rule rather than restating it", () => {
    for (const f of ["WorkspaceShell.tsx", "ShellSidebar.tsx"]) {
      const src = decls(readFileSync(join(root, "src/components/shell", f), "utf8"));
      expect(src, `${f} stopped calling the helper`).toContain("manuscriptViewPath(pathname,");
      expect(src, `${f} spells the manuscripts path itself`).not.toMatch(/["'`]\/manuscripts\?/);
    }
  });

  /**
   * ⚠️ ONE NAVIGATION, NOT TWO. The desktop picker already re-navigated to the same path, so the
   * naive addition would have navigated twice on the one page the param matters. The `??` is what
   * makes the helper's null fall through to the call this site was already making.
   */
  it("the desktop picker navigates exactly once", () => {
    const src = decls(readFileSync(join(root, "src/components/shell/WorkspaceShell.tsx"), "utf8"));
    const body = src.slice(src.indexOf("const pickMs ="), src.indexOf("const stepMs ="));
    expect(body).not.toBe("");
    expect((body.match(/onNavigatePath\(/g) ?? []).length, "picked a book and navigated twice").toBe(1);
    expect(body).toContain("manuscriptViewPath(pathname, id) ?? ");
  });

  /**
   * ⚠️ SCOPE IS NOT THE VIEW, AND BOTH PICKERS STILL WRITE IT. `scriptally_active_manuscript_id` is
   * the section-wide pointer packages, comps and analytics read; the param carries the view. If a
   * picker ever stopped writing the key, picking a book on /queries would silently stop re-scoping.
   */
  it("both switchers still write scope, on every page", () => {
    for (const f of ["WorkspaceShell.tsx", "ShellSidebar.tsx"]) {
      const src = decls(readFileSync(join(root, "src/components/shell", f), "utf8"));
      expect(src, `${f} stopped writing scope`).toMatch(/ACTIVE_MS_KEY/);
    }
  });

  /** The nav item's destination is the bare path — which is what makes it the route back to the grid. */
  it("the sidebar's Manuscripts item carries no view param", () => {
    const nav = decls(readFileSync(join(root, "src/components/shell/shellV2Nav.ts"), "utf8"));
    expect(nav).toContain(`path: "${MANUSCRIPTS_PATH}"`);
    expect(nav).not.toContain(`${MANUSCRIPTS_PATH}?`);
  });

  /**
   * ⚠️ THE VIEW IS A PROP, NOT STATE — the fault this pass fixes. While it was a `useState`,
   * nothing outside the component could clear it, so the grid had no route back by construction.
   */
  it("the page takes its view from the URL rather than owning it", () => {
    const page = decls(readFileSync(join(root, "src/components/AllManuscripts.tsx"), "utf8"));
    expect(page, "the view went back to local state").not.toMatch(/useState<string \| null>\(null\)[\s\S]{0,40}openId/);
    expect(page).not.toContain("setOpenId");
    expect(page).toContain("openId = null }");
    const app = decls(readFileSync(join(root, "src/App.tsx"), "utf8"));
    expect(app).toContain('params.get("m")');
    expect(app).toContain("openId={manuscriptView}");
  });
});

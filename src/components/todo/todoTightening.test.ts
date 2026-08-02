/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TIGHTENING (tightening pack) — source/rule-text locks. Refs: design-refs/card-grid.html
 * (the hero + the control strip + the card grammar) · design-refs/ledger-grid.html (system A,
 * the fixed column grid; system B is rejected). The root fault being fixed: rows and cards laid
 * themselves out with flex + margin-left:auto, so every item computed its own positions and
 * nothing aligned down the page. The page is auth-gated (jsdom mounts nothing); pixels are
 * Nick's in-browser checklist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("tightening P1 — the hero on one line + the recessed control strip", () => {
  it("NO SUBTITLE NODE: the header renders title + actions only, on one row", () => {
    const hdr = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect(hdr).not.toContain("description=");
    // the shared PageHeader's svh-top is a flex row — with no .svh-sub the title and the two
    // buttons share the line; the buttons take the page-scoped 34px step
    expect(rule(".tdb-wrap .svh-btn")).toContain("height: var(--hero-btn-h, 34px)");
  });

  it("THE STRIP: chips + search + toggle live inside ONE recessed bar directly beneath the hero", () => {
    const ctrl = page.slice(page.indexOf('<div className="tdb-ctrl">'), page.indexOf('<div className="tdb-board">'));
    expect(ctrl).toContain("{renderFilterChips()}");
    expect(ctrl).toContain("tdb-bsearch");
    expect(ctrl).toContain("tdb-vtog");
    const row = rule(".tdb-ctrl");
    expect(row).toContain("background: var(--strip-bg)");
    expect(row).toContain("border: 1px solid var(--strip-bd)");
    expect(row).toContain("padding: 6px 8px");
    expect(rule(".tdb-wrap")).toContain("--strip-bg: #f5f0e8");
    expect(rule(".tdb-wrap")).toContain("--strip-bd: #e4dbcd");
    expect(rule(".tdb-wrap")).toContain("--strip-r: 10px");
  });

  it("SECTION ANATOMY: label · mono count · a hairline rule filling the remaining width — one line", () => {
    const head = page.slice(page.indexOf("export const SectionHead"), page.indexOf("const Lane:"));
    expect(head).toContain("<h2>{label}</h2>");
    expect(head).toContain('<span className="tdb-cn">{count}</span>');
    expect(head).toContain('<span className="tdb-secrule" aria-hidden />'); // INSIDE the line
    const r = rule(".tdb-secrule");
    expect(r).toContain("flex: 1");
    expect(r).toContain("height: 1px");
    // the separate family-stub bar beneath is extinct
    expect(css).not.toContain(".tdb-secrule.do");
    expect(page).not.toContain("`tdb-secrule ${cls}`");
  });
});

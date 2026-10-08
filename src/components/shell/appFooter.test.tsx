import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppFooter } from "./AppFooter";
import { FOOTER_TAGLINE, SUPPORT_EMAIL } from "../../lib/companyInfo";
import { STATUS_GLYPH_COUNT } from "../../marketing/marketingMarks";

const html = renderToStaticMarkup(<AppFooter onNavigate={() => {}} />);
const src = readFileSync("src/components/shell/AppFooter.tsx", "utf8");
const css = readFileSync("src/components/shell/appFooter.css", "utf8");

describe("AppFooter (v126 §5) — the marketing footer's content, in the app's dress", () => {
  it("states the shared tagline and address, read rather than copied", () => {
    expect(html).toContain(FOOTER_TAGLINE.replace(/'/g, "&#x27;").replace(/&(?!#)/g, "&amp;"));
    expect(html).toContain(SUPPORT_EMAIL);
    expect(src, "a copied tagline").not.toContain(FOOTER_TAGLINE.slice(0, 24));
    expect(src).toMatch(/from "\.\.\/\.\.\/lib\/companyInfo"/);
  });
  it("draws the six glyphs and the three columns, with Help centre where the public footer opens the app", () => {
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(STATUS_GLYPH_COUNT + 1);
    for (const l of ["Features", "Pricing", "Help centre", "About", "Founding writers", "Contact", "Privacy", "Terms"]) expect(html).toContain(`>${l}<`);
    expect(html).not.toContain("Open QueryHawk");
    expect((html.match(/data-probe="app-footer-col"/g) ?? []).length).toBe(3);
  });
  /* Contact list v15.1 §5: a token-is-read claim, which is a source lock's job. What the footer ends up painted as is
     measured on the three routes that render it (tests/e2e/contactV151.measure.ts, F1). */
  it("has no ground of its own: the page's colour, read from the page's token, and one hairline on the inner wrapper", () => {
    const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = (sel: string) => { const m = decls.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`)); expect(m, `${sel} has a rule`).not.toBeNull(); return m![1]; };
    expect(decls, "a literal ground").not.toMatch(/#ebe9e5|--af-ground/i);
    expect(rule(".af")).toMatch(/background:\s*var\(--ws-page\)/);
    expect(rule(".af"), "a spread-shadow ground or its clip").not.toMatch(/box-shadow|clip-path/);
    expect(rule(".af-in")).toMatch(/border-top:\s*1px solid rgba\(28, 19, 15, 0\.14\)/);
  });
  it("never imports the marketing tier's stylesheet", () => {
    expect(src, "an import of the marketing sheet").not.toMatch(/^import [^\n]*marketing\.css/m);
    expect(css).not.toMatch(/\.mk-/);
  });
});

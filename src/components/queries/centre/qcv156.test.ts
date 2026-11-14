/**
 * Query Centre v156 — the stylesheet's locks (qcv156.css). This repo's tests read SOURCE; the rendered values are
 * measured by tests/e2e/qc156.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "qcv156.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** the declarations of the first rule whose selector list is exactly `sel` */
const rule = (sel: string): string => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

describe("v156 §4 · cards: full stage colour and navy seals", () => {
  it("a Queried card's band is the stage's sand fill again, with no edge or hairline", () => {
    const r = rule('.qc151.qc153 .qc154-card.qc154-card[data-status="Queried"] .qc154-hd');
    expect(r).toMatch(/background:\s*var\(--tone\)/);
    expect(r).toMatch(/box-shadow:\s*none/);
  });
  it("every seal is solid navy with cream initials and the white-then-navy double ring", () => {
    const r = rule(".qc151.qc153 .qc154-card.qc154-card .qc154-seal.qc154-seal");
    expect(r).toMatch(/background:\s*#2a3a52/);
    expect(r).toMatch(/color:\s*#f4eee5/);
    expect(r).toMatch(/box-shadow:\s*0 0 0 3px #fff,\s*0 0 0 4px rgba\(42, 58, 82, 0\.35\)/);
  });
  it("the narrow card keeps v154's smaller ring", () => {
    expect(css).toMatch(/@container \(max-width: 380px\)\s*\{\s*\.qc151\.qc153 \.qc154-card\.qc154-card \.qc154-seal\.qc154-seal\s*\{[^}]*box-shadow:\s*0 0 0 2\.5px #fff,\s*0 0 0 3\.5px rgba\(42, 58, 82, 0\.35\)/);
  });
});

describe("v156 §5 · one page colour, and nothing clipping the header's shadow", () => {
  it("the Query Centre retones the page token where the tab and the sheet read it", () => {
    const r = rule(".ws-app:has(.qc-wpg--v11:not([data-stage-off] *)) .ws-main");
    expect(r).toMatch(/--ws-page-rgb:\s*246, 243, 238/);
    expect(r).toMatch(/--ws-page:\s*rgb\(var\(--ws-page-rgb\)\)/);
  });
  it("the scroll area paints that token, not a second literal", () => {
    const r = rule(".ws-window .qc-wpg.qc-wpg--v11.qc-wpg--v11.qc-wpg--v11 > .wpg-scroll.wpg-scroll");
    expect(r).toMatch(/background-color:\s*var\(--ws-page\)/);
    expect(r).toMatch(/rgba\(var\(--ws-page-rgb\), 0\.45\)/);
    expect(r).not.toMatch(/#f6f3ee|246, 243, 238\)/);
  });
  it("the toolbar's wrapper paints nothing at rest, and the page colour with its 22px fade only once stuck", () => {
    expect(rule(".qc151.qc153 .qc154-tbw.qc154-tbw.qc154-tbw")).toMatch(/background:\s*none/);
    expect(rule(".qc151.qc153 .qc154-tbw.qc154-tbw.qc154-tbw[data-qc156-stuck]"))
      .toMatch(/background:\s*linear-gradient\(to bottom, var\(--ws-page\) 0, var\(--ws-page\) calc\(100% - 22px\), rgba\(var\(--ws-page-rgb\), 0\) 100%\)/);
  });
});

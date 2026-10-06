/**
 * Ink shell v1 — the source-level half of the locks (the rendered half is tests/e2e/inkShell.measure.ts).
 * A source lock proves a rule was written; whether it reached an element is measured on the page.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { INK_THEME_COLOR } from "./inkTokens";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const INDEX = strip(readFileSync("src/index.css", "utf8"));
const INK = strip(readFileSync("src/components/shell/inkShell.css", "utf8"));
const tok = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(INDEX)?.[1].trim();

describe("ink shell — the tokens", () => {
  it("defines the brief's values once, at :root", () => {
    expect(tok("--ink-shell")).toBe("#1b2433");
    expect(tok("--ink-cream")).toBe("#f4eee5");
    expect(tok("--ink-terra")).toBe("#d9967a");
    for (const [t, a] of [["92", "0.92"], ["66", "0.66"], ["42", "0.42"], ["12", "0.12"]]) {
      expect(tok(`--ink-cream-${t}`)).toBe(`rgba(244, 238, 229, ${a})`);
    }
  });

  it("the browser-chrome constant equals the token (a meta tag cannot read CSS)", () => {
    expect(INK_THEME_COLOR).toBe(tok("--ink-shell"));
  });

  it("re-values none of the shell tokens a page reads for its own content", () => {
    for (const t of ["--ws-page", "--ws-window", "--sp-anthracite", "--shell-active-bg", "--shell-active-fg"]) {
      expect(INK, `${t} is re-declared by the ink sheet`).not.toMatch(new RegExp(`${t}\\s*:`));
    }
  });

  it("states no literal colour — every colour reads a token", () => {
    expect(INK).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    /* an rgba() is allowed only over the token channels */
    for (const m of INK.matchAll(/rgba?\(([^)]*)\)/g)) {
      /* `[^)]*` stops at the inner `var(...)`'s own paren, so the capture ends at the token's name */
      expect(m[1], `literal rgba(${m[1]})`).toMatch(/^var\(--(ink-[a-z-]+-rgb|ws-page-rgb)$/);
    }
  });

  it("is desktop-only: every rule sits inside a min-width: 768px block (INK19)", () => {
    const outside = INK
      .replace(/@media \(min-width: 768px\)( and \([^)]*\))? \{[\s\S]*?\n\}/g, "")
      .replace(/@media \(max-width: 767px\)[^\n]*\n?/g, "");
    expect(outside.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g, "").trim()).toBe("");
  });

  it("the sheet, the tab and the fillet read one paper token", () => {
    expect(INK).toMatch(/\.ws-main\s*\{\s*--ink-sheet:\s*var\(--ws-page\)/);
    expect(INK).toMatch(/\.ws-window\s*\{[^}]*background:\s*var\(--ink-sheet\)/);
  });
});

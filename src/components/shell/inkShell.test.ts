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
      .replace(/@media \(min-width: 76[89]px\)( and \([^)]*\))* \{[\s\S]*?\n\}/g, "")
      .replace(/@media \(max-width: 767px\)[^\n]*\n?/g, "");
    expect(outside.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g, "").trim()).toBe("");
  });

  it("the sheet, the tab and the fillet read one paper token", () => {
    expect(INK).toMatch(/\.ws-main\s*\{\s*--ink-sheet:\s*var\(--ws-page\)/);
    expect(INK).toMatch(/\.ws-window\s*\{[^}]*background:\s*var\(--ink-sheet\)/);
  });
});

describe("ink fix-ups — the header card is the Query Centre's alone", () => {
  const PH = strip(readFileSync("src/components/shell/pageHeader.css", "utf8"));
  const block = PH.slice(PH.indexOf(".ph--full.ph--card"), PH.indexOf(".ph--full.ph--band.ph--bandfix"));
  it("every card rule names .ph--card, so the other bands cannot move", () => {
    expect(block.length, "the card block is found").toBeGreaterThan(100);
    for (const sel of block.match(/(^|\n|\})\s*([^{}@\n][^{}]*)\{/g) ?? []) {
      const s = sel.replace(/^[}\s]+/, "").replace(/\{$/, "").trim();
      /* the block is indented inside its ≥768 media query now (follow-up 2), so an indented at-rule can
         reach this match; at-rules are wrappers, not rules */
      if (!s || s.startsWith("@")) continue;
      expect(s, `a card-block rule without .ph--card: ${s}`).toContain(".ph--card");
    }
  });
  it("the card is desktop-only: the phone keeps main's full-bleed band (follow-up 2)", () => {
    const raw = readFileSync("src/components/shell/pageHeader.css", "utf8");
    const at = raw.indexOf(".ph--full.ph--card {");
    const media = raw.lastIndexOf("@media (min-width: 768px) {", at);
    expect(media, "the card block sits inside a ≥768 media query").toBeGreaterThan(-1);
    expect(raw.slice(media, at)).not.toMatch(/\n\}/);
  });
  it("only the Query Centre passes `card`; Analytics and the Contact list keep `band` alone", () => {
    const qc = readFileSync("src/components/queries/centre/QcCentre.tsx", "utf8");
    const empty = readFileSync("src/components/queries/centre/QcEmpty.tsx", "utf8");
    expect(qc).toMatch(/\n\s+card\n/);
    expect(empty).toMatch(/\n\s+card\n/);
    for (const f of ["src/components/QueryAnalytics.tsx", "src/components/agents/AgentList.tsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/\n\s+card\n|\bcard=\{/);
    }
  });
});

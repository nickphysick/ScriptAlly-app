import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ⚠️ EVERY `var(--x)` THE TO-DO SHEETS READ MUST RESOLVE TO A DEFINITION SOMEWHERE.
 *
 * This exists because the audit pass deleted three tokens from `todoDock.css` and a rule in
 * `paneSweep.css` was still reading all three, inside one `calc()`. `calc()` on an undefined
 * custom property is invalid, so the browser drops the ENTIRE declaration and reports nothing —
 * no error, no warning, a green build and a green suite. It was caught by grepping `dist/` before
 * a deploy, which is luck rather than a guard.
 *
 * ⚠️ THE DIRECTION IS THE WHOLE POINT, and it is the one this codebase has been caught by before:
 * checking that what you WROTE arrived cannot find what you REFERENCED and never wrote — or what
 * someone else referenced and you deleted. `shellV2Tokens.test.ts` states the same rule for the
 * shell; this is the To-do surfaces' copy of it.
 */
const here = new URL(".", import.meta.url).pathname;

/** every stylesheet in the app defines the vocabulary; the To-do sheets are what is checked */
const ALL_CSS_DIRS = ["", "../shell", "../agents", "../manuscripts", "../packages", "../forms", "../.."];

function allCss(): string {
  const out: string[] = [];
  for (const d of ALL_CSS_DIRS) {
    const dir = join(here, d);
    let names: string[] = [];
    try { names = readdirSync(dir); } catch { continue; }
    for (const n of names) if (n.endsWith(".css")) out.push(readFileSync(join(dir, n), "utf8"));
  }
  return out.join("\n");
}

describe("the To-do sheets read no token that nothing defines", () => {
  it("every var() resolves", () => {
    const universe = allCss();
    /* ⚠️ COMMENTS STRIPPED — this repo's prose quotes retired token names while explaining their
       retirement, so an unstripped read would count a note as a definition. */
    const bare = universe.replace(/\/\*[\s\S]*?\*\//g, "");
    const defined = new Set([...bare.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    /* Tailwind and the browser supply these; they are never authored here. */
    const BUILTIN = /^--(tw-|webkit-|moz-)/;

    const sheets = readdirSync(here).filter((n) => n.endsWith(".css"));
    expect(sheets.length, "no To-do stylesheets found — the path moved").toBeGreaterThan(2);

    const dangling: string[] = [];
    for (const n of sheets) {
      const src = readFileSync(join(here, n), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of src.matchAll(/var\((--[a-z0-9-]+)\s*(,|\))/g)) {
        const [, name, next] = m;
        /* a token WITH a fallback still renders; one without is a dropped declaration */
        if (next === ",") continue;
        if (BUILTIN.test(name) || defined.has(name)) continue;
        dangling.push(`${n} reads ${name}`);
      }
    }
    expect(dangling, `a To-do rule reads a token nothing defines:\n  ${dangling.join("\n  ")}`)
      .toHaveLength(0);
  });
});

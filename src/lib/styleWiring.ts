/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Style wiring — the guard for the failure mode a value-assertion cannot see.
 *
 * ⚠️ AN ASSERTION THAT A VALUE EXISTS IS NOT AN ASSERTION THAT ANYTHING RENDERS FROM IT, and the
 * difference shipped twice on one page. `--ct-scout-band-a` was defined in all three themes with the
 * right hex, asserted equal to that hex in all three, and read by no rule — so both cards kept the
 * sage band while a green lock said the blue was in. `.ct-kbd` was the same shape from the other
 * side: the class was rendered, the lock asserted it was rendered, and the rule had been swept, so
 * the key hint drew as bare text.
 *
 * ⚠️ AND THE BUNDLE CHECK REPORTED THE BUG AS A NUMBER I READ AS SUCCESS. `grep -c ct-scout-band-a
 * dist/…css` returned **3** — which is exactly the count of DEFINITIONS, one per theme. A token that
 * were also consumed would have read four or more. The grep had been written to prove the token
 * REACHED the bundle, and reach is not consumption.
 *
 * So the two directions, stated as arithmetic:
 *   · every token a sheet DEFINES is read somewhere        (defined − read = 0)
 *   · every token a sheet READS is defined somewhere       (the existing dangling-var guard)
 * Neither implies the other, and only the pair is a wiring check.
 *
 * ⚠️ THIS IS NOT COMPS-SPECIFIC. It takes a prefix and a pair of sources so any page can adopt it;
 * the same silence is available to every stylesheet in the app.
 */

/** Strip CSS and JS/TSX block comments — an explained deletion names the thing it removed. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Custom properties the sheet DECLARES (`--x:`), for a given prefix. */
export function definedTokens(css: string, prefix: string): string[] {
  const re = new RegExp(`(--${prefix}[a-z0-9-]+)\\s*:`, "g");
  return [...new Set(Array.from(stripComments(css).matchAll(re), (m) => m[1]))];
}

/** Custom properties any source READS (`var(--x)`), for a given prefix. */
export function readTokens(sources: string[], prefix: string): string[] {
  const re = new RegExp(`var\\(\\s*(--${prefix}[a-z0-9-]+)`, "g");
  const out = new Set<string>();
  for (const src of sources) {
    for (const m of stripComments(src).matchAll(re)) out.add(m[1]);
  }
  return [...out];
}

/**
 * Class names a component actually puts on an element, for a given prefix.
 *
 * ⚠️ IT READS `className` ONLY, never the whole file. This page carries `id="ct-comp-title"` on form
 * inputs, and an id is not a class — a naive scan reports five phantom classes and the guard gets
 * relaxed to shut it up, which is how a guard stops guarding.
 *
 * ⚠️ AND IT HANDLES TEMPLATE LITERALS, because that is where the interesting ones live:
 * `` className={`ct-crow${dragging ? " dragging" : ""}`} `` is the row, and a scan that only
 * understood plain strings would silently skip exactly the classes that carry state.
 */
/** Read a balanced `{…}` region starting at `i` (which must point at the `{`), quote-aware. */
function balanced(src: string, i: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === "\\") j++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(i + 1, j);
    }
  }
  return src.slice(i + 1);
}

/**
 * Class names a component actually puts on an element, for a given prefix.
 *
 * ⚠️ IT READS `className` ONLY, never the whole file. This page carries `id="ct-comp-title"` on form
 * inputs, and an id is not a class — a naive scan reports phantom classes, and a guard that cries
 * wolf gets relaxed to shut it up, which is how a guard stops guarding.
 *
 * ⚠️ THE REGION IS READ WITH A BRACE COUNTER, NOT A REGEX, and the first version of this file is why.
 * `` className={`ct-srow${leaving ? " gone" : ""}`} `` contains quotes INSIDE the interpolation, so a
 * non-greedy `[`"]…[`"]` match ends at the wrong quote and yields the fragment `ct-srow${leaving` —
 * a class name that does not exist, reported as a violation. The guard was red on my own extractor
 * as well as on the real faults, and a lock whose failures are half noise is one nobody trusts.
 *
 * ⚠️ AND IT COVERS TERNARIES, not just literals and templates. `className={x ? "a" : "b"}` is how the
 * shell writes its buttons; a scan that only understood quoted strings would silently miss every
 * class that varies with state — exactly the ones worth checking.
 */
export function renderedClasses(tsx: string, prefix: string): string[] {
  const src = stripComments(tsx);
  const out = new Set<string>();
  const add = (chunk: string) => {
    for (const cls of chunk.split(/\s+/)) {
      const name = cls.trim();
      if (name.startsWith(prefix)) out.add(name);
    }
  };

  const KEY = "className=";
  for (let i = src.indexOf(KEY); i > -1; i = src.indexOf(KEY, i + 1)) {
    let region = "";
    const at = i + KEY.length;
    const c = src[at];
    if (c === '"' || c === "'") {
      const close = src.indexOf(c, at + 1);
      region = close > -1 ? src.slice(at + 1, close) : "";
      add(region);
      continue;
    }
    if (c !== "{") continue;
    region = balanced(src, at);
    /* inside the expression, only the LITERAL text can carry class names — strip every
       interpolation, then read each remaining quoted or backticked chunk */
    const literalOnly = region.replace(/\$\{[^}]*\}/g, " ");
    for (const m of literalOnly.matchAll(/["'`]([^"'`]*)["'`]/g)) add(m[1]);
  }
  return [...out];
}

/** Class names the sheet has at least one rule for, for a given prefix. */
export function styledClasses(css: string, prefix: string): string[] {
  const re = new RegExp(`\\.(${prefix}[a-z0-9-]+)`, "g");
  return [...new Set(Array.from(stripComments(css).matchAll(re), (m) => m[1]))];
}

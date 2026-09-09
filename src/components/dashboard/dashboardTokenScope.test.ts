/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A `:root` DECLARATION MAY ONLY READ `:root`-RESOLVABLE TOKENS (v29, Phase 5).
 *
 * The fault this closes was invisible, total, and looked like nothing at all. `taskTicket.css`
 * declared, at `:root`:
 *
 *     --u-house-1: var(--sage-band);
 *     --u-yours-1: var(--gold-t);
 *
 * and both of those were defined on `.t-f12` — a theme class the To-do page and the Query Centre
 * wear and the dashboard does not. So on the dashboard the two `--u-*` tokens resolved to the
 * guaranteed-invalid value, `background: var(--u-house-1)` became invalid at computed-value time,
 * and the element painted TRANSPARENT. Every rule read correctly. Nothing errored. Three of the
 * to-do rule's five bands and every ticket tag in two of its three families simply were not there.
 *
 * ⚠️ THE EXISTING SWEEP COULD NOT SEE IT, WHICH IS WHY THIS IS A SECOND LOCK RATHER THAN A WIDER
 * ONE. `shellV2Tokens`'s rule — every `var(--x)` a stylesheet READS must resolve — was satisfied:
 * `--sage-band` IS defined, once, in this very repo. The question that catches this is not whether
 * a token exists but WHERE IT IS EVALUATED, which CLAUDE.md already states for `--content-top-gap`
 * and which nothing was asserting.
 *
 * The claim is narrow on purpose: a rule scoped to `.tpn` may read a `.tpn` token, and a rule
 * scoped to `.t-f12` may read a `.t-f12` token — those resolve by construction. Only `:root` is
 * special, because `:root` is where a token is published to everything.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function cssFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) cssFiles(p, out);
    else if (name.endsWith(".css")) out.push(p);
  }
  return out;
}

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** every `:root { … }` body in a file, brace-matched so a nested block cannot end the slice early */
function rootBlocks(css: string): string[] {
  const out: string[] = [];
  const re = /(?:^|[\s,}])(:root)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    out.push(css.slice(re.lastIndex, i - 1));
  }
  return out;
}

const files = cssFiles(SRC);
const all = files.map((f) => strip(readFileSync(f, "utf8")));

/** every custom property defined in ANY `:root` block, anywhere in the app */
const rootDefined = new Set<string>();
for (const css of all) {
  for (const body of rootBlocks(css)) {
    for (const m of body.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)) rootDefined.add(m[1]);
  }
}

describe("a :root token may only be built from :root tokens", () => {
  it("finds the app's :root blocks at all — an empty sweep proves nothing", () => {
    expect(rootDefined.size).toBeGreaterThan(50);
  });

  it("⚠️ every var() read inside a :root declaration resolves at :root", () => {
    const offences: string[] = [];
    files.forEach((file, i) => {
      for (const body of rootBlocks(all[i])) {
        for (const decl of body.split(";")) {
          const lhs = /^\s*(--[A-Za-z0-9-]+)\s*:/.exec(decl);
          if (!lhs) continue;
          for (const m of decl.matchAll(/var\(\s*(--[A-Za-z0-9-]+)\s*([,)])/g)) {
            /* a fallback makes the read legitimate — the token is then allowed to be absent */
            if (m[2] === ",") continue;
            if (!rootDefined.has(m[1])) {
              offences.push(`${file.replace(process.cwd() + "/", "")}: ${lhs[1]} reads ${m[1]}, which no :root block defines`);
            }
          }
        }
      }
    });
    expect(offences, offences.join("\n")).toEqual([]);
  });
});

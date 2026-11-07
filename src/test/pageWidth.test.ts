/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Page width v1 (6 Nov) — PW1 W5: the pages on the shared content column state no width of their own. The rendered
 * locks (W1–W4, W6) are tests/e2e/pageWidth.measure.ts. A source lock is the right tool here: the claim is "this
 * declaration is not written", not "this element ends up laid out like so".
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
/** Phone layouts are out of scope: drop every `@media (max-width: <768px) { … }` block, braces matched. */
function dropPhone(css: string): string {
  let out = "", i = 0;
  const re = /@media[^{]*max-width:\s*(\d+(?:\.\d+)?)px[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (parseFloat(m[1]) >= 768) continue;
    let depth = 1, j = m.index + m[0].length;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    out += css.slice(i, m.index); i = j; re.lastIndex = j;
  }
  return out + css.slice(i);
}
const read = (p: string) => dropPhone(strip(readFileSync(p, "utf8")));

/** Every rule (selector + body) in a sheet, comments stripped; at-rule wrappers are unwrapped by matching leaf blocks. */
function rules(css: string): { sel: string; body: string }[] {
  const out: { sel: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push({ sel: m[1].trim(), body: m[2] });
  return out;
}
/** A width-like declaration that names a length — what a page would write to give itself its own column. */
const OWN_WIDTH = /(?:^|;|\s)(max-width|width|min-width|--[\w-]*-(?:w|list|col|cap|width))\s*:\s*([^;]*)/g;
function widthDecls(body: string): string[] {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  OWN_WIDTH.lastIndex = 0;
  while ((m = OWN_WIDTH.exec(body))) {
    const v = m[2].trim();
    if (/px|hsheet-w|vw/.test(v)) hits.push(`${m[1]}: ${v}`);
  }
  /* any declaration sized from the sheet's width is a column of the page's own */
  for (const d of body.split(";")) if (d.includes("--hsheet-w") && !hits.includes(d.trim())) hits.push(d.trim());
  /* a horizontal padding on a page root replaces the shared gutter, unless it is the gutter itself */
  const PAD = /(?:^|;|\s)(padding|padding-inline|padding-left|padding-right)\s*:\s*([^;]*)/g;
  while ((m = PAD.exec(body))) if (!m[2].includes("var(--page-gutter)")) hits.push(`${m[1]}: ${m[2].trim()}`);
  return hits;
}

/** The on-rule pages: the sheet that styles each page's root, and the root's selector. */
const ROOTS: { file: string; sel: RegExp }[] = [
  { file: "src/components/queries/centre/qcv151.css", sel: /^\.qc151$/ },
  { file: "src/components/agents/contact/contactV24.css", sel: /^\.clv-group\[data-v24\]$/ },
  { file: "src/components/agents/contact/contactV24.css", sel: /^\.clv-group\[data-v24\] > \.(cl24-hd|clv-main)$/ },
  { file: "src/components/todo/corkboard/corkboard.css", sel: /^(\.wpg-scroll > )?\.cb2-page$/ },
  { file: "src/components/versions/versionsV2.app.css", sel: /^\.wpg-scroll > \.vv2$/ },
  { file: "src/components/letters/queryLetters.css", sel: /^\.qlp( > \*)?$/ },
  { file: "src/components/todo/ws/todoWs.css", sel: /^\.tws$/ },
];
/** Roots that sit straight in the scroller and must not override the shared rule anywhere in the tree. */
const SCROLLER_ROOTS = ["qcv-group", "rsp-page", "a17-page", "clv-group", "dv1-page", "vv2", "cpv-page", "tws", "cb2-page"];
/** §0.3's flagged pages, which keep their own widths: Submission packages, Dashboard, Manuscripts, Settings, Help, Plans. */
const ALLOWED = ["p6", "p41", "msv12-root", "ms21", "ms27", "d58", "acct-page", "hc", "sv2-focuscol"];

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? cssFiles(p) : p.endsWith(".css") ? [p] : [];
  });
}

describe("PW1 W5 — one column, stated once", () => {
  it("the shared rule reads the two tokens, 1256 and 40", () => {
    const css = read("src/components/shell/workspacePageGrid.css");
    expect(css).toMatch(/:root\s*\{[^}]*--page-cap:\s*1256px;[^}]*--page-gutter:\s*40px;/);
    const shared = rules(css).filter((r) => /^\.wpg-scroll > \*$|^\.wpg-toolband > \.wpg-tools$|\.wpg-chrome > \.wpg-mast/.test(r.sel));
    expect(shared.length).toBe(3);
    for (const r of shared) {
      expect(r.body, r.sel).toContain("max-width: calc(var(--page-cap) + var(--page-gutter) * 2)");
      expect(r.body, r.sel).toContain("padding-inline: var(--page-gutter)");
    }
    expect(css).not.toMatch(/max-width:\s*1360px|3\.2vw/);
  });

  it("no on-rule page's root states a width of its own", () => {
    for (const { file, sel } of ROOTS) {
      const found = rules(read(file)).filter((r) => r.sel.split(",").some((s) => sel.test(s.trim())));
      expect(found.length, `${file}: root rule not found`).toBeGreaterThan(0);
      for (const r of found) expect(widthDecls(r.body), `${file} ${r.sel}`).toEqual([]);
    }
  });

  it("nothing in the tree overrides the shared rule for an on-rule page", () => {
    const offenders: string[] = [];
    for (const f of cssFiles("src")) {
      for (const r of rules(read(f))) {
        for (const s of r.sel.split(",").map((x) => x.trim())) {
          const m = /\.wpg-scroll\s*>\s*\.([\w-]+)/.exec(s);
          if (!m) continue;
          if (ALLOWED.includes(m[1])) continue;
          if (!SCROLLER_ROOTS.includes(m[1])) continue;
          if (/max-width|padding-inline|(?:^|;|\s)width\s*:/.test(r.body)) offenders.push(`${f}: ${s}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the flagged pages are the only ones on the allow-list", () => {
    expect(ALLOWED).toEqual(["p6", "p41", "msv12-root", "ms21", "ms27", "d58", "acct-page", "hc", "sv2-focuscol"]);
  });
});

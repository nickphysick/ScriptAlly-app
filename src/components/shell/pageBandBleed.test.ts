/**
 * THE BAND-TIER HEADER BLEED — the invariant, not the value.
 *
 * ⚠️ THIS TEST EXISTS BECAUSE THE SAME MISTAKE WAS MADE TWICE, and both times a REPORTED NUMBER was
 * wrong in a way only a different measurement exposed. The workspace header's rule kept inheriting
 * whatever horizontal padding its page root happened to carry: 60px on the agent list, 28px on
 * Manuscripts and Comps, and — before the cap moved off the route slot — 278px on the three pages
 * that shared it. `f5be3af` reported the agent list's rule as "0.00 (full-bleed)"; it measured 61px
 * per side at a 1700px window. Every page looked right on its own and no two agreed.
 *
 * ⚠️ SO THIS ASSERTS THE MECHANISM, NEVER A MEASUREMENT. It cannot lay out — this repo's tests are
 * `environment: 'node'` (no jsdom, no cascade, `getBoundingClientRect` is 0), so a test that checked
 * "inset === 0" could only ever check a number someone typed. What makes the insets EQUAL is
 * structural and IS checkable at source:
 *
 *     every band-tier page declares its side gutter ONCE, as `--pg-gut`
 *     the page's own padding reads that token for its horizontal value
 *     `.wsh` bleeds by exactly `calc(-1 * var(--pg-gut, 0px))`
 *
 * Given those three, the header's border box equals the page root's PADDING box on every page, so
 * the rule is flush everywhere — whatever each page's gutter happens to be, and at every breakpoint.
 * A page that hardcodes a literal gutter breaks the chain, and THAT is what fails here.
 *
 * ⚠️ THE CENSUS IS THE POINT. A test that checked only the page in front of us is exactly how this
 * drifted twice; a new band-tier page must be added below, and the failure when it is not is the
 * feature.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const headerCss = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");

/**
 * ⚠️ EVERY BAND-TIER PAGE, and the root that carries its gutter. Packages is absent DELIBERATELY —
 * its padding is an inline style, so its token is declared inline too and it is asserted separately
 * below against the TSX. Splitting that pair across a stylesheet and an inline style would let the
 * inline padding win while the stylesheet's token sat ignored.
 */
const BAND_TIER: { page: string; file: string; root: string }[] = [
  { page: "Contact List", file: "components/agents/agentList.css", root: ".aglist .agl-page" },
  { page: "Discover", file: "components/agents/discover.css", root: ".dv2" },
  { page: "Manuscripts", file: "components/manuscripts/manuscripts.css", root: ".msv1" },
  { page: "Comparable titles", file: "components/manuscripts/comps.css", root: ".ctpage" },
];

/**
 * ⚠️ RETURNS EVERY BLOCK FOR A SELECTOR, NEVER THE FIRST. `.dv2` has TWO rules 28 lines apart (a
 * token block and a layout block) and `.aglist .agl-page` has three counting its breakpoints — a
 * first-match helper would check the one without padding, pass, and prove nothing. Duplicate rules
 * surviving an edit is a documented trap in this codebase.
 */
const blocksFor = (css: string, selector: string): string[] => {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sels = m[1].split(",").map((s) => s.trim().replace(/\s+/g, " "));
    if (sels.some((s) => s === selector || s.endsWith(" " + selector))) out.push(m[2]);
  }
  return out;
};

/** Split a shorthand on top-level whitespace — `var(...)` and `calc(...)` hold together. */
const parts = (value: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

/** The horizontal component of a padding shorthand, by CSS's own 1/2/3/4-value rules. */
const horizontalOf = (shorthand: string): string => {
  const p = parts(shorthand);
  return p.length === 1 ? p[0] : p[1];
};

describe("band-tier header bleed — the rule spans the page on EVERY page", () => {
  it("the header cancels the page gutter by reading the SAME token the page declares it with", () => {
    const wsh = blocksFor(headerCss, ".wsh");
    expect(wsh.length, "`.wsh` lost its rule block, or gained a second one that could disagree with it").toBe(1);
    expect(
      wsh[0].replace(/\s+/g, " "),
      "the header stopped bleeding — without this it is inset by whatever horizontal padding its page root happens to carry, which is the exact drift this pack existed to end",
    ).toContain("margin-inline: calc(-1 * var(--pg-gut, 0px))");
  });

  it("⚠️ the bleed keeps its 0px FALLBACK — `calc()` on an undefined property is NaN and CSS drops the declaration in silence", () => {
    expect(
      blocksFor(headerCss, ".wsh")[0],
      "the fallback went — a page that declares no gutter would now drop the whole margin-inline declaration with no error anywhere (the --pad-r incident)",
    ).toMatch(/var\(--pg-gut,\s*0px\)/);
  });

  for (const { page, file, root } of BAND_TIER) {
    it(`${page}: declares its gutter once as --pg-gut, and every padding reads it`, () => {
      const css = read(file);
      const blocks = blocksFor(css, root);
      expect(blocks.length, `no rule found for \`${root}\` — the census is stale`).toBeGreaterThan(0);

      expect(
        blocks.some((b) => /--pg-gut\s*:/.test(b)),
        `${page} never declares --pg-gut, so its header bleeds by 0 and its rule is inset by the page's own gutter while every other page's is flush`,
      ).toBe(true);

      /* ⚠️ EVERY block, including each breakpoint's. A literal at ONE breakpoint is the nastier
         failure: flush on desktop, overhanging or inset on a phone, with nothing to point at. */
      const padded = blocks.filter((b) => /(^|[;{\s])padding\s*:/.test(b));
      expect(padded.length, `${page} has no padding on ${root} — the census names the wrong root`).toBeGreaterThan(0);

      for (const b of padded) {
        const shorthand = /(?:^|[;{\s])padding\s*:([^;]+)/.exec(b)![1];
        expect(
          horizontalOf(shorthand),
          `${page} states a LITERAL horizontal padding (\`${shorthand.trim()}\`). The header's bleed reads --pg-gut, so a literal here breaks the one-number contract and the rule silently stops landing flush — the drift this test exists to catch. Move the number into --pg-gut and read it back.`,
        ).toBe("var(--pg-gut)");
      }
    });
  }

  it("Submission packages declares the pair INLINE — its padding is inline, so its token must be too", () => {
    const tsx = read("components/SubmissionPackages.tsx");
    const root = /className="pkg-root pkgw"[\s\S]{0,600}?\/>|className="pkg-root pkgw"[\s\S]{0,600}?>/.exec(tsx)?.[0] ?? "";
    expect(root, "the packages page root changed shape — this assertion can no longer see its style object").toContain("pkg-root pkgw");
    expect(
      root,
      "packages stopped declaring --pg-gut inline; with the padding inline and the token in a stylesheet, the padding wins and the token is ignored — the header would bleed by 0 against a 28px gutter",
    ).toMatch(/"--pg-gut"[^:]*\]?\s*:\s*"28px"/);
    expect(
      root,
      "packages' padding stopped reading its own token",
    ).toContain('padding: "11px var(--pg-gut) 16px"');
  });

  /**
   * ⚠️ THE OTHER HALF OF THE CONTRACT. The bleed only reaches the window if nothing between the
   * page root and the slot re-caps it — which is exactly what `contentVariant` on the route slot
   * used to do (1200px on three pages, 1600px on Discover). The cap moved INTO the pages; this
   * asserts it stayed there, expressed against the cap token rather than as a literal 1144.
   */
  it("the content cap sits on the CONTENT, tied to the cap token minus the page's own gutter", () => {
    const cases: [string, string, string][] = [
      ["Manuscripts", "components/manuscripts/manuscripts.css", ".msv-wrap"],
      ["Comparable titles", "components/manuscripts/comps.css", ".ctpage > :not(.wsh)"],
      ["Submission packages", "components/packages/packageWorkshop.css", ".pkgw > :not(.wsh)"],
    ];
    for (const [page, file, sel] of cases) {
      const blocks = blocksFor(read(file), sel);
      expect(blocks.length, `${page}: no cap rule for \`${sel}\` — content would fill an ultrawide window edge to edge`).toBeGreaterThan(0);
      const joined = blocks.join(" ").replace(/\s+/g, " ");
      expect(
        joined,
        `${page}: the content cap is not expressed as the read cap minus the page's own gutter. A literal (1144px) is a magic number that silently stops matching the day either the cap or the gutter moves.`,
      ).toContain("max-width: calc(var(--content-max-read) - 2 * var(--pg-gut))");
      expect(joined, `${page}: the capped column stopped centring — it would pin left and pool all the surplus on one side`).toContain("margin-inline: auto");
    }
  });
});

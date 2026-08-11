/**
 * THE BAND-TIER HEADER PLATE — the alignment invariant, not the values.
 *
 * ⚠️ THIS FILE'S INVARIANT INVERTED WITH AMENDMENT 7, and the history matters because the previous
 * shape is the obvious thing to reinstate. While the header was a BAND it was chrome: it spanned
 * the window and CANCELLED each page's gutter with a negative margin, and this file asserted that
 * cancellation. It is a PLATE now — an object on the page, whose left edge must meet the first card
 * and whose right edge the last. Those are different places past the content cap: at 2400px the
 * column centres and a window-spanning plate misses the cards by hundreds of pixels. So the bleed
 * is GONE and the plate lives inside the capped column, and what is asserted here is that it does.
 *
 * ⚠️ WHAT SURVIVED IS `--pg-gut`. The gutter is still declared once per page and still read by that
 * page's padding — it is the single token the plate aligns to, instead of the four different page
 * paddings that existed before. That half of the previous pass is load-bearing and still locked.
 *
 * ⚠️ AND IT STILL ASSERTS MECHANISM, NEVER A MEASUREMENT. This repo's tests are `environment:
 * 'node'` — no jsdom, no cascade, `getBoundingClientRect` is 0 — so "the edges align" could only
 * ever be a number someone typed. What MAKES them align is structural and is checkable at source:
 * the plate shares its page's capped column, and no page's padding hardcodes a gutter the token
 * does not know about.
 *
 * ⚠️ THE CENSUS IS THE POINT. Checking only the page in front of us is how this drifted twice.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

const headerCss = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8");
const indexCss = read("index.css");

const BAND_TIER: { page: string; file: string; root: string }[] = [
  { page: "Contact list", file: "components/agents/agentList.css", root: ".aglist .agl-page" },
  { page: "Discover", file: "components/agents/discover.css", root: ".dv2" },
  { page: "Manuscripts", file: "components/manuscripts/manuscripts.css", root: ".msv1" },
  { page: "Comparable titles", file: "components/manuscripts/comps.css", root: ".ctpage" },
  /* ⚠️ ADDED WHEN ANALYTICS TOOK THE PLATE (amendment 7 §7) — which is the census working as
     intended. A new band-tier page that is not listed here is not tested here, and the whole point
     of a census is that adding the page and forgetting the row is the thing that fails. */
  { page: "Analytics", file: "components/shell/workspaceShell.css", root: ".qa-wrap" },
];

/**
 * ⚠️ RETURNS EVERY BLOCK FOR A SELECTOR, NEVER THE FIRST. `.dv2` has TWO rules 28 lines apart (a
 * token block and a layout block) and `.aglist .agl-page` has three counting its breakpoints — a
 * first-match helper would check the one without padding, pass, and prove nothing.
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

describe("the header plate — one gutter token, and the plate inside the column", () => {
  it("⚠️ THE BLEED IS GONE — a plate that spanned the window would miss the cards past the cap", () => {
    /* ⚠️ CHECK EVERY BLOCK, DO NOT COUNT THEM. An earlier draft asserted `.wsh` had exactly ONE
       rule and went red the moment the reduced-motion query named it in a selector list — a
       perfectly good rule failing a test about something else. The invariant is "no `.wsh` rule
       anywhere reintroduces the margin", which is both stronger and immune to how many rules
       legitimately mention the class. This is the duplicate-rule trap in miniature. */
    const wsh = blocksFor(headerCss, ".wsh");
    expect(wsh.length, "`.wsh` has no rule block at all — the plate is unstyled").toBeGreaterThan(0);
    for (const b of wsh) {
      expect(
        b,
        "the negative margin came back. That was the BAND's contract: chrome cancelling the page gutter. A plate must sit inside the capped column so its edges meet the first and last card — at 2400px those are hundreds of pixels apart.",
      ).not.toContain("margin-inline");
    }
  });

  /**
   * ⚠️ THE TWO-ROW PLATE (amendment 8, Phase B). The toolbar is a ROW OF THE PLATE, not a second
   * sticky element with a computed `top` — that alternative has to track the plate's height through
   * the condense transition, so it is wrong for 200ms on every scroll. These assertions pin the
   * "one container" half of that: one border, one shadow, one background, one sticky element.
   */
  it("ONE background and ONE frame across both rows — the tool row paints neither", () => {
    const tools = blocksFor(headerCss, ".wsh-tools");
    expect(tools.length, "`.wsh-tools` has no rule — the plate's second row is unstyled").toBeGreaterThan(0);
    const t = tools[0].replace(/\s+/g, " ");
    expect(t, "the tool row gained its own fill. The plate is ONE surface with two rows; a second background makes it read as two stacked plates, and the condensed translucent state would stop covering both.").not.toMatch(/(^|[;{\s])background\s*:/);
    expect(t, "the tool row gained its own border/shadow — the separator is an internal hairline, not a second frame").not.toMatch(/(^|[;{\s])(box-shadow|border)\s*:/);
    expect(t, "the separator stopped being the plate's own edge token, so the two rows can now disagree about their hairline").toContain("border-top: 1px solid var(--ws-edge)");
    /* and it must follow the plate into the translucent state, or the hairline stays opaque
       against a see-through plate */
    expect(headerCss, "the tool row's hairline no longer follows the plate when it condenses").toContain(".wsh--scrolled .wsh-tools { border-top-color: var(--wsh-plate-edge-scrolled); }");
  });

  it("⚠️ the TOOL ROW does not condense, and it reserves nothing when absent", () => {
    /* Only the identity row carries a height, so the plate is the sum of its rows: a page with no
       toolbar renders no row and no hairline, and a page whose controls are taller simply gets a
       taller plate. A height on `.wsh` itself would break both. */
    for (const b of blocksFor(headerCss, ".wsh")) {
      expect(b, "`.wsh` took a height again. With two rows the plate's height is the SUM of them — a fixed height here either clips the tool row or reserves space for one that is not rendered.").not.toMatch(/(^|[;{\s])height\s*:/);
    }
    expect(blocksFor(headerCss, ".wsh-row")[0], "the identity row lost its height — that is where the 88/56 pair lives now").toContain("height: var(--wsh-plate-h)");
    expect(headerCss, "the identity row stopped condensing").toContain(".wsh--scrolled .wsh-row { height: var(--wsh-plate-h-scrolled); }");
    for (const b of blocksFor(headerCss, ".wsh-tools")) {
      expect(b, "the tool row gained a height — controls must stay legible while the identity row shrinks; a filter you cannot read is not a filter").not.toMatch(/(^|[;{\s])height\s*:/);
    }
  });

  it("⚠️ the wrapper pays back exactly what the condense takes — expressed, never a literal", () => {
    /* MEASURED: without this the 88 → 56 condense pulled the page up 32px (scrollHeight 952 → 920).
       The old fix was a fixed wrapper height, which cannot survive a tool row whose height CSS does
       not know — so it is padding, applied only while condensed, sized from the two row heights. */
    const w = blocksFor(headerCss, ".wsh-wrap--scrolled");
    expect(w.length, "the reservation is gone — condensing will pull the page below it upward again").toBeGreaterThan(0);
    expect(
      w[0].replace(/\s+/g, " "),
      "the reservation states a literal instead of deriving it. 32px is `--wsh-plate-h` minus `--wsh-plate-h-scrolled`; written out it silently stops matching the day either moves.",
    ).toContain("calc(var(--wsh-plate-gap) + (var(--wsh-plate-h) - var(--wsh-plate-h-scrolled)))");
    for (const b of blocksFor(headerCss, ".wsh-wrap")) {
      expect(b, "the wrapper took a fixed height again — that cannot accommodate a tool row of unknown height").not.toMatch(/(^|[;{\s])height\s*:/);
    }
  });

  it("the sticky host paints NOTHING — a backing strip is the dead band the ref rules out", () => {
    const wrap = blocksFor(headerCss, ".wsh-wrap");
    expect(wrap.length, "`.wsh-wrap` is missing — the plate has no sticky host and cannot condense").toBe(1);
    const w = wrap[0].replace(/\s+/g, " ");
    expect(w, "the plate stopped being sticky").toContain("position: sticky");
    expect(
      w,
      "the sticky host gained a fill. That paints an opaque band across the gutters beside the plate, and content vanishes into it before reaching the plate's edge — the exact fault the ref's `body.strip` toggle demonstrates. If a glitch seems to need one, report it.",
    ).toMatch(/background:\s*none/);
  });

  for (const { page, file, root } of BAND_TIER) {
    it(`${page}: declares its gutter once as --pg-gut, and every padding reads it`, () => {
      const css = read(file);
      const blocks = blocksFor(css, root);
      expect(blocks.length, `no rule found for \`${root}\` — the census is stale`).toBeGreaterThan(0);

      expect(
        blocks.some((b) => /--pg-gut\s*:/.test(b)),
        `${page} never declares --pg-gut — the one token the plate and the page's own padding both read`,
      ).toBe(true);

      /* ⚠️ EVERY block, including each breakpoint's — a literal at ONE breakpoint is the nastier
         failure: correct on desktop, wrong on a phone, with nothing to point at. */
      const padded = blocks.filter((b) => /(^|[;{\s])padding\s*:/.test(b));
      expect(padded.length, `${page} has no padding on ${root} — the census names the wrong root`).toBeGreaterThan(0);

      for (const b of padded) {
        const shorthand = /(?:^|[;{\s])padding\s*:([^;]+)/.exec(b)![1];
        expect(
          horizontalOf(shorthand),
          `${page} states a LITERAL horizontal padding (\`${shorthand.trim()}\`). The gutter must be one number the page declares and everything else reads back; a literal is how the five drifted apart twice.`,
        ).toBe("var(--pg-gut)");
      }
    });
  }

  it("Submission packages declares the pair INLINE — its padding is inline, so its token must be too", () => {
    const tsx = read("components/SubmissionPackages.tsx");
    const root = /className="pkg-root pkgw"[\s\S]{0,600}?>/.exec(tsx)?.[0] ?? "";
    expect(root, "the packages page root changed shape — this assertion can no longer see its style object").toContain("pkg-root pkgw");
    expect(
      root,
      "packages stopped declaring --pg-gut inline; with the padding inline and the token in a stylesheet, the padding wins and the token is ignored",
    ).toMatch(/"--pg-gut"[^:]*\]?\s*:\s*"28px"/);
    expect(root, "packages' padding stopped reading its own token").toContain('padding: "11px var(--pg-gut) 16px"');
  });

  /**
   * ⚠️ THE ALIGNMENT ITSELF. The plate's edges meet the cards only if the plate shares the cards'
   * capped column. On the three pages whose root is the flex/scroll parent that means the cap
   * applies to EVERY child — the header included, which is the change amendment 7 made. On the
   * other two the header is nested inside the capped element in the TSX, asserted below.
   */
  it("Comps and Packages cap EVERY child — the plate is no longer excluded from the column", () => {
    for (const [page, file, root] of [
      ["Comparable titles", "components/manuscripts/comps.css", ".ctpage"],
      ["Submission packages", "components/packages/packageWorkshop.css", ".pkgw"],
    ] as const) {
      const css = read(file);
      expect(
        css,
        `${page} still excludes the header from its content cap (\`${root} > :not(.wsh)\`). That was the BAND's bleed expressed as a selector; the plate must take the same cap the panels below it take, or its edges miss them past the cap.`,
      ).not.toContain(`${root} > :not(.wsh)`);
      expect(
        blocksFor(css, `${root} > *`).length,
        `${page} has no all-children cap — with the route slot no longer capping, content and the plate both run to the full window width`,
      ).toBeGreaterThan(0);
    }
  });

  it("Contact list, Discover and Manuscripts nest the plate INSIDE their capped column", () => {
    /* ⚠️ ASSERTED ON ORDER, NOT PRESENCE. Both the wrapper and the PageHeader exist either way —
       what changed is which encloses which, so a `toContain` on both would pass in the broken
       arrangement too. */
    for (const [page, file, wrapper] of [
      ["Contact list", "components/agents/AgentList.tsx", "agl-inner"],
      ["Discover", "components/DiscoverNewAgents.tsx", "dv-wrap"],
      ["Manuscripts", "components/AllManuscripts.tsx", "msv-wrap"],
    ] as const) {
      const tsx = read(file);
      const wrapAt = tsx.indexOf(`className="${wrapper}"`);
      const headerAt = tsx.indexOf("variant=\"workspace\"");
      expect(wrapAt, `${page}: \`.${wrapper}\` is gone — the content column it names no longer exists`).toBeGreaterThan(-1);
      expect(headerAt, `${page}: no workspace header found`).toBeGreaterThan(-1);
      expect(
        wrapAt,
        `${page}: the plate is rendered BEFORE \`.${wrapper}\` opens, so it sits outside the capped column and its edges will miss the cards past the cap. That was correct for a window-spanning band and is wrong for a plate.`,
      ).toBeLessThan(headerAt);
    }
  });

  it("the plate's colours and shadows are TOKENS, and the condensed border derives from ours", () => {
    const wsh = blocksFor(headerCss, ".wsh")[0] + blocksFor(headerCss, ".wsh--scrolled")[0];
    for (const t of ["--wsh-plate-bg", "--wsh-plate-radius", "--wsh-plate-sh", "--wsh-plate-bg-scrolled", "--wsh-plate-blur", "--wsh-plate-sh-scrolled", "--wsh-plate-edge-scrolled"]) {
      expect(wsh, `the plate stopped reading ${t} and states a literal instead`).toContain(`var(${t})`);
      expect(indexCss, `${t} is read but never defined`).toContain(`${t}:`);
    }
    /* ⚠️ THE PACK'S LITERAL WOULD HUE-SHIFT THE BORDER. `rgba(228,221,209,.75)` is the REF's edge
       (#e4ddd1); ours is `--ws-edge` #e9e2d7 = rgb(233,226,215). Condensing must quieten the
       border, not recolour it. */
    expect(indexCss, "the condensed border went back to the ref's hue — the plate would change colour as it condenses").toContain("--wsh-plate-edge-scrolled: rgba(233, 226, 215, 0.75)");
    expect(indexCss, "the see-through/blur pair drifted from the settled values the pack locks").toContain("--wsh-plate-bg-scrolled: rgba(255, 255, 255, 0.62)");
    expect(indexCss, "the blur went up — the plate is paper with a hint of depth, not frost").toContain("--wsh-plate-blur: blur(2px) saturate(1.08)");
  });

  it("⚠️ reduced motion kills the TRANSITIONS, never the condensed state", () => {
    /* A reduced-motion user must still get the 56px plate: the condense is a layout that gives
       working area back, not an embellishment. Only the tweening goes. */
    const rm = /@media \(prefers-reduced-motion: reduce\) \{([^}]*\{[^}]*\}[^}]*)*\}/g;
    const blocks = headerCss.match(rm)?.join(" ") ?? "";
    expect(blocks, "the plate's transitions are not suppressed under reduced motion").toContain(".wsh");
    expect(
      headerCss.slice(headerCss.indexOf(".wsh--scrolled")),
      "the condensed state was moved inside a motion query — a reduced-motion user would keep an 88px header covering the content it should have given back",
    ).toBeTruthy();
  });
});

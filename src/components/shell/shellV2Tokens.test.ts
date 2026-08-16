/**
 * Rule-text locks for the app-shell CAPSULE tokens (ref design-refs/scriptally-capsule-tone.html
 * scheme D "Stepped trio" — supersedes the ONE-SHARED-SURFACE law from capsule-shell.html).
 * Asserts the two token homes — index.css `--shell-*` and the designTokens.ts `shell*` JS twins
 * — BOTH carry the baked values, so the flagged duplication cannot drift; and locks the NEW
 * depth law: three role-named surfaces stepping BRIGHTER left→right (rail → panel → content)
 * over a darker ground, with no generic alias among them.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dt from "../../lib/designTokens";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

const BAKED: Record<string, string> = {
  // ⚠️ These two are in the BAKED map because a malformed comment once SWALLOWED --shell-desk:
  // the declaration sat outside its /* */ and the build emitted no token and no error, so the
  // desk simply came out the wrong colour with nothing to point at. A value asserted here fails
  // loudly the moment it stops being emitted.
  "--shell-desk": "#aebdb0",
  "--shell-active-fill": "#ffffff",
  "--gutter": "20px",
  "--icon": "38px",
  "--pitch": "42px",
  "--kid": "34px",
  // ⚠️ 72 → 66 (shell-rebuild pack, Phase 1). SUPERSEDED, NOT TUNED: both rebuild mockups draw
  // the head at 66, and it is the one number the workspace bar and the top-nav masthead have to
  // agree on — they are the same band at the same height on two different pages. The lock is
  // rewritten rather than deleted so the supersession is on the record, and so a later pass
  // cannot split it back into a per-shell pair without failing here.
  "--head": "66px",
  "--pad-r": "18px",
  "--shell-ease": "cubic-bezier(0.4, 0, 0.2, 1)",
  "--shell-spring": "cubic-bezier(0.34, 1.28, 0.64, 1)",
  "--col-min": "78px",
  "--col-max": "246px",
  "--shell-cap-rim": "inset 0 1px 0 rgba(255,255,255,.55)",
  "--shell-ground": "#e7e0d5",
  "--shell-rail": "#efe7db",   // the COLUMN capsule (app-shell Baked 3)
  "--shell-side": "#efe7db",   // legacy alias — the panel it named is gone
  "--shell-canvas": "#f7f2e9", // the CONTENT capsule, and its top bar
  "--shell-card": "#fdfaf5",
  "--shell-panel": "#f2ede7",
  "--shell-inset": "#efe8df",
  "--shell-line": "#e3d9cf",
  "--shell-line-soft": "#ece3da",
  // 58px: the bar's own height, so all three capsules close on one line (bar-per-page pack).
  "--shell-head-h": "58px",
  "--shell-row-h": "44px",
  "--shell-kid-h": "37px",
  "--shell-quiet": "#b3a598",
  "--shell-cap-radius": "18px",
  "--shell-cap-gap": "14px",
  "--shell-cap-border": "1px solid #d8ccbc",
  "--shell-rail-icon": "#a89a8a",
  "--shell-bar-bg": "#f1ebe3",
  "--shell-divider": "linear-gradient(90deg, transparent, rgba(46,39,35,.16) 22%, rgba(46,39,35,.16) 78%, transparent)",
  "--shell-gutter": "16px",
  "--shell-group": "24px",
  "--shell-within": "8px",
  "--shell-card-pad": "12px",
  "--shell-ink": "#2e2723",
  "--shell-ink-soft": "#6a615a",
  "--shell-muted": "#9c8878",
};

/**
 * ⚠️ EVERY TOKEN THE SHELL CSS *USES* MUST BE DEFINED. `--pad-r` was referenced by three rules
 * and by the selector's width maths while being defined nowhere: `calc()` on an undefined custom
 * property yields NaN, so the ONLY active marker rendered 0px wide — through a green build, a
 * green suite and a clean typecheck. A missing definition is silent in CSS; this makes it loud.
 */
describe("no shell rule reads a token that does not exist", () => {
  // shellColumn.css went with the one-expanding-column shell it styled (shell-rebuild Phase 3);
  // workspaceShell.css and primitives.css are the surfaces that replaced it, and they are held
  // to the same no-raw-hex rule.
  const shellFiles = ["./shellV2.css", "./workspaceShell.css", "./primitives.css", "./accountMenu.css", "./searchPalette.css", "./topNav.css", "./pageHeader.css"];
  /**
   * ⚠️ THE THREE TRANSLUCENCY TOKENS ARE RETIRED, AND THIS IS WHAT KEEPS THEM RETIRED.
   *
   * `--wsh-plate-bg-scrolled`, `--wsh-plate-blur` and `--wsh-plate-edge-scrolled` gave the
   * condensed header a frosted fill, from when it overlapped the content it condensed over. It
   * does not overlap anything: the scroller is the row BENEATH it, so there is nothing behind the
   * strip to see through, and `backdrop-filter` additionally creates a stacking context — its own
   * class of bug, already recorded against the illustrated marks.
   *
   * ⚠️ THIS LOCK EXISTS BECAUSE THE TOKENS WERE RESTORED ONCE, CORRECTLY. The consumption guard
   * below requires every `var(--x)` a shell sheet READS to resolve; when `--wsh-plate-*` went
   * missing while `pageHeader.css` still read them, restoring the definitions was the right fix
   * for the lock as written. A guard that only checks in one direction cannot tell "deleted by
   * mistake" from "deleted on purpose", so the direction is stated here instead: these three must
   * NOT exist. Nothing reads them, and nothing may define them again.
   */
  it("⚠️ the header's translucency tokens are GONE, and must not come back", () => {
    for (const token of ["--wsh-plate-bg-scrolled", "--wsh-plate-blur", "--wsh-plate-edge-scrolled"]) {
      expect(css, `${token} was reinstated — the strip is opaque and overlaps nothing, so a frosted fill has nothing to frost`)
        .not.toContain(`${token}:`);
    }
    const hdr = readFileSync(resolve(__dirname, "pageHeader.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(hdr, "a backdrop-filter came back onto the header — it frosts nothing and creates a stacking context")
      .not.toContain("backdrop-filter");
  });

  it("every var(--x) in the shell stylesheets resolves to a definition", () => {
    const defined = new Set<string>();
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    // a shell stylesheet may define its own scoped token, so collect those too
    const texts = shellFiles.map((f) => readFileSync(resolve(__dirname, f), "utf8"));
    for (const t of texts) for (const m of t.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    // Set INLINE per element rather than in a stylesheet: `--i` is the column's stagger index,
    // `--cols` is a mega-menu's column count. Both carry a fallback in the CSS, so an element
    // that somehow renders without them still lays out.
    const allowed = new Set([...defined, "--i", "--cols"]);
    /* ⚠️ READ THE RULES, NOT THE PROSE. A `var(--frame)` QUOTED IN A COMMENT is not read by any
       browser, and this guard failed on exactly that: a comment citing the design ref's own
       `.main{padding:var(--frame)}` was reported as a dangling token. Same trap as the sibling
       guard in workspaceShell.test.ts, which once caught its own warning — a rule about the
       stylesheet must be asserted against the stylesheet's rules. Definitions above are collected
       from the raw text on purpose: a token defined only inside a comment SHOULD NOT count. */
    for (const [i, f] of shellFiles.entries()) {
      const text = texts[i].replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of text.matchAll(/var\((--[a-z0-9-]+)/gi)) {
        expect(allowed.has(m[1]), `${f} reads ${m[1]}, which nothing defines`).toBe(true);
      }
    }
  });
});

describe("capsule tokens — index.css", () => {
  it("carries every baked value", () => {
    for (const [token, value] of Object.entries(BAKED)) {
      expect(css).toContain(`${token}: ${value}`);
    }
  });
  it("the flat scheme's dark rail and side edge are gone", () => {
    expect(css).not.toContain("#2e2622"); // the dark umber rail
    expect(css).not.toContain("--shell-side-edge");
  });
  it("the aliased --shell-topbar stays RETIRED; THE BAR IS THE CONTENT CAPSULE'S HEAD", () => {
    expect(css).not.toMatch(/--shell-topbar\s*:/);
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).not.toContain("var(--shell-topbar)");
    // It sits INSIDE the content capsule, so it wears that capsule's own colour — not the
    // column's. (It borrowed the rail's tone while the two were separate components.)
    expect(shellCss).toMatch(/\.sv2-topbar \{[^}]*background: var\(--shell-canvas\)/s);
    // ⚠️ THE HAIRLINE IS PERMANENT — it completes the corner with the capsule edge. The top-nav
    // shell reveals its own on scroll instead: no capsule there, so no corner. Deliberate.
    expect(shellCss).toMatch(/\.sv2-topbar \{[^}]*border-bottom: 1px solid var\(--shell-line\)/s);
    // and it reads --head, the SAME token as the column's masthead
    expect(shellCss).toMatch(/\.sv2-topbar \{[^}]*height: var\(--head\)/s);
  });

  it("THE LAYERED SHADOW is one token of four stops, worn by every capsule", () => {
    const shadow = css.match(/--shell-cap-shadow:([^;]*);/s)?.[1] ?? "";
    // ⚠️ GREEN-GREY, because the desk is sage. The tint belongs to the desk's colour family and
    // moves with it — a cool-blue or warm-brown shadow on a sage desk reads as dirt, not depth.
    // (The sage-desk mockup still ships a blue-grey rgba(60,66,80,…); that line is FENCED as
    // stale in design-refs — a reasoned value in the pack beats an unreasoned one in an artefact.)
    for (const stop of ["0 1px 2px rgba(56,66,58,.08)", "0 4px 10px rgba(56,66,58,.09)", "0 14px 30px rgba(56,66,58,.11)", "0 34px 66px rgba(56,66,58,.13)"]) {
      expect(shadow).toContain(stop);
    }
    expect(shadow).not.toContain("0 10px 30px"); // the single shadow is retired
    expect(shadow, "the warm-brown tint went with the cream ground").not.toContain("rgba(58,28,20");
    expect(shadow, "the pastille sheet's blue-grey belonged to a blue desk").not.toContain("rgba(60,66,80");
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).toMatch(/\.sv2-cap \{[^}]*box-shadow: var\(--shell-cap-shadow\)/);
    expect(shellCss).toMatch(/\.sv2-cap \{[^}]*border: var\(--shell-cap-border\)/); // the warm edge
  });

  it("THE FADING DIVIDER is one token, drawn as a gradient (a border cannot fade)", () => {
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).toMatch(/\.sv2-ff::before \{[^}]*background: var\(--shell-divider\)/s);
    expect(shellCss).toMatch(/\.sv2-ff::before \{[^}]*height: 1px/s);
    // the hard border it replaces is gone from that element
    expect(shellCss).not.toMatch(/\.sv2-ff \{[^}]*border-top: 1px solid/s);
  });

  it("THE CAPSULE EDGE is warm — the export's cold #9e9e9e reached nothing", () => {
    expect(css).toContain("--shell-cap-border: 1px solid #d8ccbc");
    // never as a VALUE anywhere — comments stripped, since the correction note names it
    const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(noComments).not.toContain("#9e9e9e");
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).not.toContain("#9e9e9e");
  });
});

describe("capsule tokens — designTokens.ts twins agree", () => {
  it("surfaces + fills", () => {
    expect(dt.shellGround).toBe("#e7e0d5");
    expect(dt.shellRail).toBe("#efe7db");
    expect(dt.shellSide).toBe("#efe7db");
    expect(dt.shellCanvas).toBe("#f7f2e9");
    expect(dt.shellCard).toBe("#fdfaf5");
    expect(dt.shellPanel).toBe("#f2ede7");
    expect(dt.shellInset).toBe("#efe8df");
    expect(dt.shellLine).toBe("#e3d9cf");
    expect(dt.shellLineSoft).toBe("#ece3da");
    expect(dt.shellInk).toBe("#2e2723");
    expect(dt.shellInkSoft).toBe("#6a615a");
    expect(dt.shellMuted).toBe("#9c8878");
  });
  it("capsule geometry", () => {
    expect(dt.shellCapRadius).toBe(18);
    expect(dt.shellCapGap).toBe(14);
    expect(dt.shellCapShadow).toContain("0 34px 66px rgba(56,66,58,.13)"); // the layered set, green-grey
    expect(dt.shellCapBorder).toBe("1px solid #d8ccbc");
    expect(dt.shellBarBg).toBe("#f1ebe3");
  });
  it("spacing scale", () => {
    expect(dt.shellGutter).toBe(16);
    expect(dt.shellGroup).toBe(24);
    expect(dt.shellWithin).toBe(8);
    expect(dt.shellCardPad).toBe(12);
  });
});

/** Relative luminance of a #rrggbb hex (an ordering lock, not colour science). */
const lum = (hex: string): number => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("the STEPPED TRIO depth law (scheme D) — depth recedes leftward", () => {
  it("⚠️ TWO capsules on a DARK desk — the stepped trio is superseded", () => {
    // The old law stepped three chrome surfaces brighter left→right over a cream ground. The
    // panel is gone and the ground is now sage, which is DARKER than any of them — depth comes
    // from the desk being dark, not from three cream steps.
    expect(lum(dt.shellDesk)).toBeLessThan(lum(dt.shellRail));
    expect(lum(dt.shellRail)).toBeLessThan(lum(dt.shellCanvas));
  });
  it("TWO capsules now — the panel folded into the column, so its token is a legacy alias", () => {
    expect(dt.shellRail).not.toBe(dt.shellCanvas);
    expect(dt.shellSide).toBe(dt.shellRail); // the alias tracks the column it merged into
  });
  it("⚠️ THE INTERIOR FILL NO LONGER READS AS AN INSET ON THE COLUMN — reported, not hidden", () => {
    // --shell-inset (#efe8df) and the column (#efe7db) are within a hair of each other now, so a
    // fill on the column is invisible. The sage-desk mockup does not use a fill there: its
    // chrome controls are WHITE with a hairline (.qb.g), which is what the column's ghost button
    // does. Anything else that relied on the fill/column step needs the same treatment.
    expect(Math.abs(lum(dt.shellInset) - lum(dt.shellRail))).toBeLessThan(0.01);
    // it still reads on the CONTENT capsule, which is where the search field and chips sit
    expect(lum(dt.shellInset)).toBeLessThan(lum(dt.shellCanvas));
  });
  it("⚠️ THE ACTIVE FILL IS THE BRIGHTEST SURFACE — laid ON the capsule, not cut through it", () => {
    // The old law made active the GROUND token, so active was the DARKEST step. That only worked
    // while the ground was neutral cream; against the sage desk it produced a green pill. Active
    // is now #fff — brighter than every capsule, which is what "laid on" has to mean.
    expect(lum(dt.shellActiveFill)).toBeGreaterThan(lum(dt.shellCanvas));
    expect(lum(dt.shellActiveFill)).toBeGreaterThan(lum(dt.shellRail));
    expect(dt.shellActiveFill).not.toBe(dt.shellDesk); // one token each, never shared again
  });

  it("the legacy cream ground stays darker than the hover fill (the old shell, until it goes)", () => {
    // The active law is unchanged (active = ground); this keeps active > hover in depth so the
    // hierarchy survives the step. The rail's MARGINS are narrow — reported for a browser check.
    expect(lum(dt.shellGround)).toBeLessThan(lum(dt.shellInset));
  });
  it("--shell-panel is IN-PAGE content, deliberately NOT moved with the chrome fill", () => {
    expect(dt.shellPanel).toBe("#f2ede7");
    expect(dt.shellPanel).not.toBe(dt.shellInset);
  });
});

/**
 * The ground gutter (tone/crumb/padding pack). jsdom cannot measure layout, so this locks the
 * CAUSE rather than the pixels: the app container's padding stays a single symmetric value with
 * no right-hand compensation, and the viewport-fixed dashboard drawer + pull tab measure their
 * insets from the content capsule (--shell-cap-gap) instead of the browser edge.
 */
describe("the ground gutter — equal on both edges", () => {
  const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
  const dashCss = readFileSync(resolve(__dirname, "../dashboard/dashboardV37.css"), "utf8");

  it("the app container keeps ONE symmetric padding — no compensating right-hand padding", () => {
    expect(shellCss).toMatch(/\.sv2-app \{ padding: var\(--shell-cap-gap\); gap: var\(--shell-cap-gap\); \}/);
    expect(shellCss).not.toMatch(/\.sv2-app[^{]*\{[^}]*padding-right/);
  });
  /* ⚠️ INVERTED BY THE REFINEMENT PASS (§1). The tab used to be position:fixed, measured from
     the BROWSER edge, so it needed --shell-cap-gap to line up with the capsule. It is anchored
     INSIDE the content card now, where right:0 already IS the card edge — re-adding the gap
     would push it a second inset inwards. The rule it protects (equal gutters) is unchanged. */
  it("the pull tab is anchored INSIDE the card, so right:0 is the card edge", () => {
    const dash = readFileSync(resolve(__dirname, "../dashboard/dashboardV37.css"), "utf8");
    expect(dash).toMatch(/\.sa-tltab \{[^}]*position: absolute/s);
    expect(dash).toContain(".sa-tltab { right: 0; }");
    expect(dash, "fixed positioning is what measured from the browser edge")
      .not.toMatch(/\.sa-tltab \{[^}]*position: fixed/s);
  });

  it("the drawer's insets read the gap token, not a bare number that only coincidentally matched", () => {
    const drawer = dashCss.match(/\.sa-tldrawer \{[^}]*\}/s)?.[0] ?? "";
    expect(drawer).toContain("top: var(--shell-cap-gap)");
    expect(drawer).toContain("bottom: var(--shell-cap-gap)");
    expect(drawer).toContain("right: var(--shell-cap-gap)");
    expect(drawer).toContain("translateX(calc(102% + var(--shell-cap-gap)))"); // the closed park clears it
  });
});

/**
 * The SHARED SIDEBAR RHYTHM (sidebar-refinements). The point of these tokens is that the rail
 * and the panel cannot drift: both must READ them rather than carry their own numbers. jsdom
 * cannot measure alignment, so this locks the referencing — the visual result is a browser check.
 */
describe("the shared sidebar rhythm — rail and panel read the SAME tokens", () => {
  const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
  const rule = (sel: string): string => {
    const m = shellCss.match(new RegExp("(?:^|\\n)\\s*" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`rule not found: ${sel}`);
    return m[1];
  };

  it("THE HEAD BLOCKS ARE FLUSH — no top padding survives to break the one line", () => {
    // --shell-pad-t is RETIRED. It put the rail head and the panel masthead 14px lower than the
    // bar, so the three capsules shared a HEIGHT token but not a BASELINE — which is the whole
    // point of the token. All three now start at their capsule's top edge.
    expect(css, "the retired padding token is gone from :root").not.toMatch(/^\s*--shell-pad-t:/m);
    expect(shellCss, "the rail no longer offsets its head").not.toContain("var(--shell-pad-t)");
    expect(shellCss).toContain("padding: 0 0 20px");
    expect(rule(".sv2-side-inner")).toContain("padding: 0");
  });

  it("the HEAD BLOCK is one token, referenced by ALL THREE capsules — rail, panel and BAR share a line", () => {
    expect(rule(".sv2-railhead")).toContain("height: var(--shell-head-h)");
    // the panel's head block is the NAVIGATE BAND now; the brand wordmark row it replaced is gone
    expect(rule(".sv2-ptop")).toContain("height: var(--shell-head-h)");
    expect(shellCss).not.toContain(".sv2-wmrow");
    // The bar joined the rhythm (bar-per-page pack): it used to restate 58px while the token
    // said 56, which is exactly how the two drifted apart in the first place.
    // (.sv2-topbar has two rules — the mobile display:none and the desktop block — so this
    // asserts the FILE, the same way the rail's two-rule case does above.)
    expect(shellCss).toContain("height: var(--shell-head-h)");
    expect(shellCss, "no literal twin of the bar height survives").not.toMatch(/height: ?58px/);
  });

  it("the NAV ROW PITCH is one token: the panel row IS 44px, and the rail's 40px rib + its gap make 44", () => {
    expect(rule(".sv2-asec")).toContain("height: var(--shell-row-h)");
    const rib = rule(".sv2-rib");
    expect(rib).toContain("width: 40px"); // the 40px hit area inside the 44px pitch
    expect(rib).toContain("height: 40px");
    expect(rib).toContain("margin-bottom: calc(var(--shell-row-h) - 40px)"); // derived, never a literal 4px
  });

  it("the CHILD pitch belongs to the panel alone — the rail has no children to pitch", () => {
    expect(rule(".sv2-akid")).toContain("height: var(--shell-kid-h)");
    expect(shellCss).not.toMatch(/\.sv2-rail[^{]*\{[^}]*--shell-kid-h/s);
  });

  it("NO component keeps a hard-coded twin of a shared value", () => {
    for (const sel of [".sv2-rail", ".sv2-side-inner", ".sv2-asec", ".sv2-railhead", ".sv2-ptop"]) {
      const r = rule(sel);
      expect(r, `${sel} literal 56`).not.toMatch(/height: 56px/);
      expect(r, `${sel} literal 44`).not.toMatch(/height: 44px/);
      expect(r, `${sel} literal 20 pad-top`).not.toMatch(/padding: 20px 0;/);
    }
  });

  it("the RAIL does not respond to accordion state — alignment holds with the accordion CLOSED only", () => {
    // no rule pairs the rail with an open section, and no spacer tracks the accordion
    expect(shellCss).not.toMatch(/\.sv2-rail[^{\n]*(open|akids)/);
    /* ⚠️ `ShellRail` AND `ShellSide` ARE BOTH GONE from `ShellV2.tsx`, so this slice read the whole
       file and its two assertions covered every component in it. The rule survives and is stated
       over the file: nothing anywhere pairs the rail with accordion state, and the spacer family
       is extinct. */
    const rail = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(rail).not.toContain("export const ShellRail");
    expect(rail).not.toContain("sv2-railspacer-");
  });

  /* ⚠️ RETARGETED, not deleted (sweep, 6 Aug 2026). This asserted the PANEL's group heading and
     its .sv2-slab token rule. The panel — ShellSidebarBody — is gone: the shell rebuild replaced
     it with WorkspaceShell and nothing has rendered it since. A test that reads a deleted
     component's source string passes or fails on nothing, so it now asserts the retirement, which
     is the fact worth locking: the component AND its orphaned rule are both away, and neither
     comes back without a surface to come back to. */
  it("the capsule panel is RETIRED — component and its orphaned token rule both gone", () => {
    const body = readFileSync(resolve(__dirname, "./ShellSidebar.tsx"), "utf8");
    expect(body).not.toContain("export const ShellSidebarBody");
    expect(body).not.toContain('<div className="sv2-slab">Quick actions</div>');
    // …and what SURVIVES this file, because both are live elsewhere:
    expect(body).toContain("export const ShellScope");
    expect(body).toContain("export function useShellNavCounts");
    // the rule went with its only consumer — a token nothing reads is not a token
    expect(shellCss).not.toContain(".sv2-slab {");
    expect(shellCss).not.toContain("#b3a598"); // the hex still lives ONLY on the token
  });

  /* ⚠️ REWRITTEN TWICE, NEVER DELETED. Phase 3 made the brand type rather than the PNG;
     Amendment 1 (C) moved the wordmark OUT of the sidebar to the head of the breadcrumb, as the
     real asset, leaving the rail's "S" tile as the sidebar's only mark. So the brand still
     appears exactly once in each place — one tile, one logotype.

     ⚠️ AND THE MEASURED-ASSET PROBLEM WENT WITH THE ASSET. The crumb's PNG carried the 51.7%-ink
     trap (a ~17px cap needing a 33px element); the v2 brand is TYPE — a Playfair "S" in an ink
     square — so there is no ink ratio to compensate for and no LOGOTYPE_PX to keep in step. */
  it("THE BRAND APPEARS ONCE per surface — mark and wordmark, in the sidebar", () => {
    const ws = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    expect(ws.match(/ws-bmark/g)?.length, "one mark").toBe(1);
    expect(ws.match(/ws-bwm/g)?.length, "one wordmark").toBe(1);
    /* ⚠️ COMMENT-STRIPPED — the tombstone trap. The first run of this line failed on the comment
       recording the retirement: the guard caught its own note. */
    expect(ws.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("LOGOTYPE_PX");
    const wsCss = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
    /* ⚠️ RETARGETED: THE MARK IS ARTWORK AGAIN, NOT A SERIF "S" (sidebar-collapse re-land).
       This asserted `var(--font-serif)` inside `.ws-bmark` because the mark was then a Playfair
       letter in an ink square. It is the plane-and-S image now — bare artwork, no plate, no fill
       — so a font assertion cannot pass and, worse, would read as "the brand is missing" rather
       than "the brand changed medium". What the lock is FOR is unchanged and still checked above:
       ONE mark and ONE wordmark per surface. Here it now pins the two properties that make the
       swap safe — a sized box and no plate — because a mark that grew a background would be the
       actual regression. The wordmark keeps the serif, and that is asserted where it lives. */
    expect(wsCss).toMatch(/\.ws-bmark \{[^}]*height: 38px/s);
    expect(wsCss, "the bare mark grew a plate").not.toMatch(/\.ws-bmark \{[^}]*background:/s);
    expect(wsCss).toMatch(/\.ws-bwm \{[^}]*var\(--font-serif\)/s);
  });
});

/**
 * ⚠️ THE SLIDING RAIL INDICATOR IS RETIRED, and so is the floating SELECTOR that inherited its
 * job (shell-rebuild pack, Phase 3). The double-decker marks the active row with two fills
 * instead of one travelling marker — a translucent square on the rail cell, a parchment pill on
 * the panel label — so there is nothing left to slide. The grammar is locked in
 * lib/workspaceShell.test.ts and components/shell/workspaceShell.test.tsx.
 */

/**
 * THE FOOT FADE (canonical shell pack). jsdom cannot measure a gradient or a scroll position, so
 * this locks the two things that make it correct rather than decorative: it is a STATE (opacity,
 * toggled by a class) and it is INSET so it cannot sit on the capsule's border.
 */
describe("the foot fade", () => {
  const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
  const shell = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
  const fade = shellCss.match(/\.sv2-fade \{([^}]*)\}/s)?.[1] ?? "";

  it("is a STATE, not decoration — hidden by default, shown by a class, 200ms", () => {
    expect(fade, "the .sv2-fade rule must exist").not.toBe("");
    expect(fade).toContain("opacity: 0");
    expect(shellCss).toContain(".sv2-fade.on { opacity: 1; }");
    expect(fade).toMatch(/transition: opacity 0\.2s/);
  });

  it("never eats a click, and never covers the capsule's border", () => {
    expect(fade).toContain("pointer-events: none");
    // inset 1px each side: over the border it would darken the capsule edge along its foot
    /* ⚠️ NO LONGER INSET BY 1px, because it is no longer ABSOLUTE inside a bordered wrapper: it
       is sticky at the foot of the card's own scroller, which already clips to the card radius. */
    expect(fade).toContain("position: sticky");
    // and the corners follow the capsule, minus that inset, or the fade squares off the curve
    expect(fade).toContain("calc(var(--shell-cap-radius) - 1px)");
    expect(fade).toContain("height: 56px");
  });

  /* ⚠️ REWRITTEN AGAIN (app-shell-v2), and this is the lock that mattered most in that move: the
     scroller went from the whole card (`.ws-cscroll`) to the WINDOW'S BODY (`.ws-wbody`), so the
     window's frame can stay put while its contents scroll. FOUR consumers address that element by
     id — stageScroll's overlay locks, per-route scroll memory, the To-do board's saved position
     and MobileSheet — and every one of them would fail SILENTLY if the id had not travelled with
     it. It is a constant, so they needed no edit; this asserts it actually moved. */
  it("the STAGE's identity travelled to the WINDOW's body — id, ref and memory intact", () => {
    const ws = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    expect(ws).toContain("id={scrollId}");
    expect(ws).toContain("ref={scrollRef}");
    const app = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
    expect(app).toContain("scrollId={STAGE_SCROLL_ID}");
    expect(app).toContain("scrollRef={stageRef}");
    expect(app).toContain("scrollMemo.current[routeKey] = el.scrollTop");
    // exactly one scroller: the work area must not have taken its overflow back
    const wsCss = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
    expect(wsCss).toMatch(/\.ws-wbody \{[^}]*overflow: auto/s);
    expect(wsCss).not.toMatch(/\.ws-work \{[^}]*overflow/s);
  });

  it("it is driven by CONTENT height, not only by scrolling", () => {
    // a freshly-navigated long page must fade before the first scroll, and a page that grows in
    // place (an accordion, a lazily-filled list) must gain one without a scroll or a resize
    expect(shell).toContain("scrollHeight - el.scrollTop - el.clientHeight > 8");
    expect(shell).toContain("new ResizeObserver(updateFade)");
    expect(shell).toMatch(/useEffect\(\(\) => \{\s*updateFade\(\);/);
  });
});

/**
 * Rule-text locks for the app-shell CAPSULE tokens (ref design-refs/scriptally-capsule-tone.html
 * scheme D "Stepped trio" — supersedes the ONE-SHARED-SURFACE law from capsule-shell.html).
 * Asserts the two token homes — index.css `--shell-*` and the designTokens.ts `shell*` JS twins
 * — BOTH carry the baked values, so the flagged duplication cannot drift; and locks the NEW
 * depth law: three role-named surfaces stepping BRIGHTER left→right (rail → panel → content)
 * over a darker ground, with no generic alias among them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as dt from "../../lib/designTokens";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

const BAKED: Record<string, string> = {
  "--shell-ground": "#e7e0d5",
  "--shell-rail": "#f1ebe3",
  "--shell-side": "#f8f4ee",
  "--shell-canvas": "#fdfbf8",
  "--shell-card": "#fdfaf5",
  "--shell-panel": "#f2ede7",
  "--shell-inset": "#efe8df",
  "--shell-line": "#e3d9cf",
  "--shell-line-soft": "#ece3da",
  "--shell-head-h": "56px",
  "--shell-row-h": "44px",
  "--shell-kid-h": "37px",
  "--shell-pad-t": "14px",
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
  it("the aliased --shell-topbar stays RETIRED; the bar now joins the RAIL's chrome family", () => {
    expect(css).not.toMatch(/--shell-topbar\s*:/);
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).not.toContain("var(--shell-topbar)");
    // chrome tokens: a PERMANENT fill sharing the rail's tone — no scroll state (superseded)
    expect(shellCss).toMatch(/\.sv2-topbar \{[^}]*background: var\(--shell-bar-bg\)/s);
    expect(css).toContain("--shell-bar-bg: #f1ebe3");
    expect(css).toContain("--shell-rail: #f1ebe3"); // one chrome family, deliberately
  });

  it("THE LAYERED SHADOW is one token of four stops, worn by every capsule", () => {
    const shadow = css.match(/--shell-cap-shadow:([^;]*);/s)?.[1] ?? "";
    for (const stop of ["0 1px 2px rgba(58,28,20,.04)", "0 2px 6px rgba(58,28,20,.045)", "0 8px 18px rgba(58,28,20,.05)", "0 20px 44px rgba(58,28,20,.055)"]) {
      expect(shadow).toContain(stop);
    }
    expect(shadow).not.toContain("0 10px 30px"); // the single shadow is retired
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
    expect(dt.shellRail).toBe("#f1ebe3");
    expect(dt.shellSide).toBe("#f8f4ee");
    expect(dt.shellCanvas).toBe("#fdfbf8");
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
    expect(dt.shellCapShadow).toContain("0 20px 44px rgba(58,28,20,.055)"); // the layered set
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
  it("ground darkest, then rail, then panel, then content brightest", () => {
    expect(lum(dt.shellGround)).toBeLessThan(lum(dt.shellRail));
    expect(lum(dt.shellRail)).toBeLessThan(lum(dt.shellSide));
    expect(lum(dt.shellSide)).toBeLessThan(lum(dt.shellCanvas));
  });
  it("the three surfaces are DISTINCT — the one-shared-surface law is retired", () => {
    expect(new Set([dt.shellRail, dt.shellSide, dt.shellCanvas]).size).toBe(3);
  });
  it("the interior fill moved with the panel: darker than every capsule, lighter than the ground", () => {
    expect(lum(dt.shellInset)).toBeLessThan(lum(dt.shellRail)); // still reads as an inset ON the rail
    expect(lum(dt.shellInset)).toBeLessThan(lum(dt.shellSide));
    expect(lum(dt.shellInset)).toBeGreaterThan(lum(dt.shellGround));
  });
  it("the nav active state (GROUND) stays darker than the hover fill on every capsule", () => {
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

  it("the pull tab tucks against the CAPSULE edge on desktop — it no longer sits at right:0", () => {
    expect(dashCss).toMatch(/\.sa-tltab \{ right: var\(--shell-cap-gap\); \}/);
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

  it("TOP PADDING is one token, referenced by BOTH capsules", () => {
    // (.sv2-rail has two rules — the mobile display:none and the desktop block; assert the file)
    expect(shellCss).toContain("padding: var(--shell-pad-t) 0 20px");
    expect(rule(".sv2-side-inner")).toContain("padding: var(--shell-pad-t) 18px 18px");
  });

  it("the HEAD BLOCK is one token, referenced by BOTH capsules — the two brand marks share a line", () => {
    expect(rule(".sv2-railhead")).toContain("height: var(--shell-head-h)");
    expect(rule(".sv2-wmrow")).toContain("height: var(--shell-head-h)");
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

  it("NEITHER component keeps a hard-coded twin of a shared value", () => {
    for (const sel of [".sv2-rail", ".sv2-side-inner", ".sv2-asec", ".sv2-railhead", ".sv2-wmrow"]) {
      const r = rule(sel);
      expect(r, `${sel} literal 56`).not.toMatch(/height: 56px/);
      expect(r, `${sel} literal 44`).not.toMatch(/height: 44px/);
      expect(r, `${sel} literal 14 pad`).not.toMatch(/padding: 14px/);
      expect(r, `${sel} literal 20 pad-top`).not.toMatch(/padding: 20px 0;/);
    }
  });

  it("the RAIL does not respond to accordion state — alignment holds with the accordion CLOSED only", () => {
    // no rule pairs the rail with an open section, and no spacer tracks the accordion
    expect(shellCss).not.toMatch(/\.sv2-rail[^{\n]*(open|akids)/);
    const rail = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    const railFn = rail.slice(rail.indexOf("export const ShellRail"), rail.indexOf("export const ShellSide"));
    expect(railFn).not.toContain("openSection === "); // it receives the value for railClickPlan only
    expect(railFn).not.toContain("sv2-railspacer-");
  });

  it("the GROUP HEADINGS: two quiet mono labels, and the tile caption SURVIVES", () => {
    const body = readFileSync(resolve(__dirname, "./ShellSidebar.tsx"), "utf8");
    expect(body).toContain('<div className="sv2-slab">Tasks &amp; reminders</div>'); // Working on left with the scope control
    expect(body).toContain('<div className="sv2-slab">Quick actions</div>');
    expect(body).toContain("Log · Respond · Agent · Manuscript"); // the caption stays (baked)
    const slab = rule(".sv2-slab");
    expect(slab).toContain("font-size: 7.5px");
    expect(slab).toContain("letter-spacing: 0.17em");
    expect(slab).toContain("text-transform: uppercase");
    expect(slab).toContain("color: var(--shell-quiet)"); // the role-named token, not a one-off hex
    expect(shellCss).not.toContain("#b3a598"); // the hex lives ONLY on the token
  });

  it("the brand mark is height-constrained at the larger size, aspect preserved", () => {
    const v2 = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(v2).toContain("<ScriptAllyLogo heightPx={27} />"); // ~27px, up from 30px box/~20px cap
    expect(rule(".sv2-mark")).toContain("width: 27px"); // the rail glyph grows to match
  });
});

/**
 * THE RAIL'S MOTION (chrome refinements P3). jsdom cannot run a transition or compute a
 * transform, so these lock the CONTRACT: route-driven position, transform-only movement,
 * silence on mount, the weight signal, and press feedback that cannot fight the indicator.
 */
describe("the sliding rail indicator", () => {
  const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
  const rail = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");

  it("is ROUTE-driven, not click-driven — so back/forward move it too", () => {
    expect(rail).toContain("const railIndex = SHELL_RAIL.findIndex((r) => r.key === activeKey);");
    expect(rail).toContain("const activeKey = shellSectionKeyForPath(pathname);");
    // the position comes from that index alone — no click handler writes it
    expect(rail).toContain("translateY(calc(${railIndex} * var(--shell-row-h)))");
    expect(rail).not.toMatch(/setRailIndex|setIndicator(?!Ready)/);
  });

  it("moves by TRANSFORM only — never `top`", () => {
    const pill = shellCss.match(/\.sv2-railpill \{([^}]*)\}/)?.[1] ?? "";
    expect(pill).toContain("top: 0"); // a static origin; the movement is the transform
    expect(shellCss).toMatch(/\.sv2-railpill\.ready \{ transition: transform 320ms/);
    expect(shellCss).not.toMatch(/\.sv2-railpill[^{]*\{[^}]*transition:[^;]*\btop\b/);
  });

  it("is SILENT ON MOUNT — the transition arrives a frame later, so it cannot slide in", () => {
    expect(rail).toContain("const [indicatorReady, setIndicatorReady] = useState(false);");
    expect(rail).toContain("window.requestAnimationFrame(() => setIndicatorReady(true))");
    expect(rail).toContain('className={`sv2-railpill${indicatorReady ? " ready" : ""}`}');
    // the bare class carries NO transition — only .ready does
    const pill = shellCss.match(/\.sv2-railpill \{([^}]*)\}/)?.[1] ?? "";
    expect(pill).not.toContain("transition");
  });

  it("the pill IS the active fill — the rib's own background goes transparent", () => {
    expect(shellCss).toMatch(/\.sv2-railnav \.sv2-rib\.on \{ background: transparent; \}/);
    expect(shellCss).toMatch(/\.sv2-railpill \{[^}]*background: var\(--shell-ground\)/s);
  });

  it("WEIGHT ON ACTIVE: 1.8 → 2.4, styled on the rendered SVG from the parent — TypeGlyph untouched", () => {
    expect(shellCss).toMatch(/\.sv2-rib svg \{[^}]*stroke-width: 1\.8/s);
    expect(shellCss).toMatch(/\.sv2-rib\.on svg \{ stroke-width: 2\.4; \}/);
    expect(shellCss).toMatch(/\.sv2-rib svg \{[^}]*transition: stroke-width/s);
    expect(rail).not.toContain("TypeGlyph"); // the rail draws lucide icons; the locked component is not involved
  });

  it("PRESS feedback scales the icon, not the pill — they cannot fight", () => {
    expect(shellCss).toMatch(/\.sv2-rib:active \{ transform: scale\(\.92\)/);
    expect(shellCss).toMatch(/\.sv2-frow:active[^{]*\{ transform: scale\(\.985\)/);
    expect(shellCss).toMatch(/\.sv2-rib:active \{[^}]*120ms/s);
    expect(shellCss).not.toMatch(/\.sv2-railpill[^{]*:active/); // the pill has no press state
  });

  it("REDUCED MOTION: the indicator jumps and the press does nothing", () => {
    const rm = shellCss.slice(shellCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".sv2-railpill.ready { transition: none; }");
    expect(rm).toMatch(/\.sv2-rib:active[^{]*\{ transform: none; \}/);
  });
});

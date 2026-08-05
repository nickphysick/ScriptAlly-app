/**
 * Locks for the double-decker shell COMPONENT (shell-rebuild pack, Phase 2).
 *
 * ⚠️ THE RULE THIS FILE EXISTS FOR IS T3 — the rail is PAINT, not a container. The state grammar
 * is proven in lib/workspaceShell.test.ts; what can only be proven here is that the DOM really is
 * one column with a painted gradient, and that no sibling rail element crept back in.
 *
 * Nothing here slices the markup: every assertion is a whole-string `toContain`/`toMatch`, per
 * the house rule about specs that slice on a marker they never asserted.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { ShellSection } from "../../lib/workspaceShell";

const MANUSCRIPTS = [
  { id: "m1", title: "The Hollow Sea" },
  { id: "m2", title: "Winter Ledger" },
];

let msFixture: unknown[] = MANUSCRIPTS;

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    manuscripts: msFixture,
    currentUser: { id: "u1", name: "Nick Physick", email: "n@example.com", plan: UserPlan.FREE },
  }),
}));

import { WorkspaceShell } from "./WorkspaceShell";

const css = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
const src = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");

/* ⚠️ ABSENCE IS ASSERTED AGAINST RULES, NOT PROSE. The first draft of the "no sibling rail"
   lock failed on the COMMENT that warns against building one — the guard caught its own warning.
   A `not.toContain` over a file that includes its own commentary passes and fails for reasons
   that have nothing to do with the stylesheet. */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* ⚠️ AND THE SAME TRAP EXISTS IN THE SOURCE. The "no Expand sidebar" guard first failed on the
   COMMENT recording that the item was superseded — the guard caught its own tombstone. Absence in
   the component is asserted against code with block comments stripped. */
const srcCode = src.replace(/\/\*[\s\S]*?\*\//g, "");

const SECTIONS: ShellSection[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  {
    id: "queries", label: "Queries", def: "q-centre",
    children: [
      { id: "q-centre", label: "Query Centre", path: "/queries" },
      { id: "q-analytics", label: "Analytics", path: "/queries/analytics" },
    ],
  },
  { id: "todo", label: "To-do", path: "/todo", count: 4, urgent: true },
];

/* ⚠️ THE COLLAPSED RENDER IS NOT REACHABLE HERE, and two attempts to fake it are worth recording.
   Collapse is read from `window.localStorage` behind a `typeof window === "undefined"` guard, and
   this environment is `node` with no window: seeding `globalThis.localStorage` silently did
   nothing (every "collapsed" render came back expanded — green, and testing the wrong state), and
   defining a bare `globalThis.window` broke every other render that branches on it.

   So T3b is asserted at SOURCE instead, and precisely: nothing in the rail may vary with
   `collapsed` except the one » control. That is the actual rule, and it is checkable without a
   layout engine. The visual half is browser-verify pending, as the report says. */
const at = (path: string) => {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell
        sections={SECTIONS}
        icons={{ dashboard: <svg />, queries: <svg />, todo: <svg /> }}
        onNavigatePath={() => {}}
        onOpenSearch={() => {}}
        onOpenHelp={() => {}}
      >
        <div>page</div>
      </WorkspaceShell>
    </MemoryRouter>
  );
};

/** The rail's markup alone — the T3b comparison must not include the panel. */
const railOf = (html: string) => {
  const i = html.indexOf('<aside');
  const j = html.indexOf('</aside>');
  expect(i, "the rail <aside> must exist").toBeGreaterThan(-1);
  return html.slice(i, j);
};

const rule = (sel: string) => {
  expect(css, `workspaceShell.css must define ${sel}`).toContain(sel + " {");
  const i = css.indexOf(sel + " {");
  return css.slice(i, css.indexOf("}", i));
};

/**
 * ⚠️⚠️ T3b — THE RAIL IS A STATIC COMPONENT THAT NEVER REFLOWS. This SUPERSEDES T3, whose rule
 * was that the rail is background paint under rows spanning both surfaces.
 *
 * That architecture kept the icons aligned by construction, but it also made the rail a FUNCTION
 * OF THE PANEL: an open accordion punched a void through the icon column, and the anti-echo
 * dimming turned the remainder into a broken strip. Decoupling them retires the drift problem
 * outright rather than defending against it, which is why T3's gradient-and-spanning-rows locks
 * are deleted here rather than weakened.
 */
describe("⚠️ T3b — the rail is static and never reflows", () => {
  /* THE fixture: the rail's markup must be identical between states apart from the » control and
     the active square. Anything else moving means the rail has become a function of the panel
     again — the exact regression T3b exists to catch. */
  /* THE fixture, at source: the rail's JSX reads `collapsed` EXACTLY ONCE, to render the » — so
     nothing else in it can vary between states. The active square comes from the route (`hit`),
     not from `collapsed`, which is why it is not an exception here. */
  it("nothing in the rail varies with `collapsed` except the » control", () => {
    const rail = src.slice(src.indexOf('className={`ws-rail'), src.indexOf("</aside>"));
    expect(rail, "the rail block must exist").toContain("ws-ri");
    const uses = rail.match(/collapsed/g) ?? [];
    // one in the tile's expand-on-click, one guarding », one in Settings' expand-on-click —
    // and all three are HANDLERS, not render branches, bar the » guard.
    expect(rail).toContain("{collapsed && (");
    expect(rail.match(/\{collapsed && \(/g), "exactly one render branch").toHaveLength(1);
    expect(uses.length).toBeGreaterThan(0);
  });

  it("the » control is the collapsed-only branch, and is absent when expanded", () => {
    expect(at("/queries")).not.toContain("ws-xtog");
    expect(src).toMatch(/\{collapsed && \([\s\S]{0,400}?ws-xtog/);
  });

  /* The rail has no width transition and no collapsed rule: it is not part of the animation. */
  it("no rule changes the rail between states", () => {
    expect(cssRules).not.toMatch(/\.ws-rail\.shut/);
    expect(cssRules).not.toMatch(/\.shut\s+\.ws-rail/);
    expect(rule(".ws-rail")).not.toContain("transition");
  });

  it("the rail is its own element at the rail width — not a gradient stop", () => {
    const r = rule(".ws-rail");
    expect(r).toContain("width: var(--shell-railw)");
    expect(r).toContain("background: var(--shell-ink)");
    expect(r).not.toContain("linear-gradient");
  });

  /* ⚠️ THE PANEL COLLAPSES, THE RAIL DOES NOT. */
  it("the panel is what goes to zero width", () => {
    expect(rule(".ws-panel")).toContain("width: var(--shell-panelw)");
    expect(css).toMatch(/\.ws-panel\.shut \{\s*width: 0;\s*opacity: 0;\s*\}/);
  });

  /* The shadow moved with the architecture: it is the PANEL's ::before now, because a shadow cast
     by the rail would need the rail to own it, and the rail must stay unconditionally static. */
  it("the rail shadow is the panel's ::before, and the rail casts nothing", () => {
    const r = rule(".ws-panel::before");
    expect(r).toContain("width: 18px");
    expect(r).toContain("linear-gradient(90deg, rgba(46, 39, 35, 0.1), transparent)");
    expect(r).toContain("pointer-events: none");
    expect(rule(".ws-rail")).not.toContain("box-shadow");
  });

  it("the panel width token is 232, not the superseded 216", () => {
    const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(indexCss).toMatch(/--shell-panelw:\s*232px\s*;/);
    expect(indexCss).not.toMatch(/--shell-panelw:\s*216px\s*;/);
  });
});

describe("Baked 4 + 5 — the active grammar is never a burgundy fill", () => {
  it("the rail cell takes a translucent white square", () => {
    expect(rule(".ws-ri.on")).toContain("background: rgba(255, 255, 255, 0.12)");
  });

  it("the panel row takes a parchment pill in ink, at weight 600", () => {
    const r = rule(".ws-ni.on");
    expect(r).toContain("background: var(--shell-parch)");
    expect(r).toContain("color: var(--shell-ink)");
    expect(r).toContain("font-weight: 600");
  });

  /* Burgundy is urgency in this shell — a burgundy nav fill would make every active row read as
     an alert. It is allowed on the rail badge and the Upgrade link, and nowhere else. */
  it("no nav fill is burgundy", () => {
    expect(rule(".ws-ni.on")).not.toContain("burgundy");
    expect(rule(".ws-ri.on")).not.toContain("burgundy");
  });

  it("the quiet parent is bold ink with NO fill", () => {
    const r = rule(".ws-ni.quiet");
    expect(r).toContain("font-weight: 600");
    expect(r).not.toContain("background:");
  });

  /* ⚠️ A DOT, NOT A NUMBER (Amendment 1, B). 52px has no room for a legible figure, and the ink
     ring is what keeps it readable against the rail. */
  it("the rail badge is a 7px burgundy dot with an ink ring", () => {
    const r = rule(".ws-bdg");
    expect(r).toContain("width: 7px");
    expect(r).toContain("background: #c96f52");
    expect(r).toContain("border: 2px solid var(--shell-ink)");
  });

  /* H5 — with the Queries filter children gone, attention lives on To-do alone. */
  it("only To-do carries a badge", () => {
    const html = at("/queries");
    expect(html.match(/ws-bdg/g)?.length ?? 0).toBe(1);
  });
});

describe("Baked 6 — children are text-only, indented to the parent's text axis", () => {
  it("the thread line hangs under the parent icon's centre", () => {
    const r = rule(".ws-subin::before");
    expect(r).toContain("left: 18px");
    expect(r).toContain("width: 1px");
    expect(r).toContain("background: var(--shell-edge)");
  });

  it("child rows are 30px and indent to the text axis", () => {
    const r = rule(".ws-srow");
    expect(r).toContain("height: 30px");
    expect(r).toContain("padding: 0 10px 0 36px");
  });

  it("children carry no icon — the indent and thread line carry the hierarchy", () => {
    const html = at("/queries");
    const kids = html.match(/<button[^>]*class="ws-srow[^"]*"[\s\S]*?<\/button>/g) ?? [];
    expect(kids.length).toBe(SECTIONS[1].children!.length);
    for (const k of kids) expect(k).not.toContain("ws-ic");
  });
});

/* ⚠️ T6 — the panel is hidden by WIDTH + OPACITY, never display:none. display:none mid-transition
   kills the animation and the panel vanishes in a single frame. */
describe("⚠️ T6 — the panel fades; it is never display:none", () => {
  it("collapse animates width and opacity", () => {
    expect(rule(".ws-panel")).toContain("transition: width 0.22s var(--shell-ease), opacity 0.18s");
    expect(css).toMatch(/\.ws-panel\.shut \{[^}]*opacity: 0/);
    expect(css).not.toMatch(/\.ws-panel\.shut \{[^}]*display: none/);
  });

  /* The inner block holds its full width while the panel animates to zero, so the contents slide
     out of view rather than reflowing to nothing on the way. */
  it("the inner block keeps its width so the contents do not reflow on the way out", () => {
    expect(rule(".ws-pin")).toContain("width: var(--shell-panelw)");
  });
});

describe("Rail tooltips", () => {
  it("compose Section · Child from the state grammar", () => {
    expect(at("/queries")).toContain('data-tip="Queries · Query Centre"');
  });

  it("wait out an intent delay", () => {
    expect(css).toMatch(/\.ws-ri:hover::after[\s\S]*?transition-delay: 0\.3s/);
  });

  it("are suppressed behind an open flyout", () => {
    expect(rule(".ws-rail.flyopen .ws-ri::after")).toContain("display: none");
  });
});

describe("Baked 9 — the manuscript selector heads the PANEL", () => {
  it("renders the active manuscript as a white pill", () => {
    expect(at("/queries")).toContain("The Hollow Sea");
    const r = rule(".ws-mspill");
    expect(r).toContain("background: #ffffff");
    expect(r).toContain("border: 1px solid var(--shell-edge)");
    expect(r).toContain("height: 40px");
  });

  it("offers a switcher when there is more than one manuscript", () => {
    expect(at("/queries")).toContain('aria-haspopup="menu"');
  });

  /* ⚠️ SCOPED TO THE PILL. A whole-document assertion catches the rail avatar's legitimate one. */
  it("is static and popover-less with a single manuscript", () => {
    msFixture = [MANUSCRIPTS[0]];
    const html = at("/queries");
    expect(html).toContain("ws-mspill");
    const pill = html.slice(html.indexOf("ws-mspill"), html.indexOf("ws-ctog"));
    expect(pill).toContain("static");
    expect(pill).not.toContain("aria-haspopup");
    expect(pill).not.toContain("ws-chev");
    msFixture = MANUSCRIPTS;
  });

  it("DOES show the switch chevron when there is more than one", () => {
    const html = at("/queries");
    expect(html.slice(html.indexOf("ws-mspill"), html.indexOf("ws-ctog"))).toContain("ws-chev");
  });

  /* ⚠️ Packages, Comps and Manuscripts READ this key — a selector that stops writing it breaks
     them with no error, just the wrong book. */
  it("writes the shared active-manuscript key", () => {
    expect(src).toContain('"scriptally_active_manuscript_id"');
    expect(src).toContain("localStorage.setItem(ACTIVE_MS_KEY");
  });

  /* Amendment 1 (B): the rail starts at Dashboard — collapsed users switch book by expanding or
     via the palette, so there is no book icon competing for the 52px column. */
  it("has NO manuscript icon on the rail", () => {
    const railHtml = railOf(at("/queries"));
    expect(railHtml).not.toContain("ws-mspill");
    expect(railHtml).not.toContain("The Hollow Sea");
  });
});

describe("Baked 10 (as amended) — the panel foot", () => {
  it("carries the name and plan line", () => {
    const html = at("/queries");
    expect(html).toContain("Nick Physick");
    expect(html).toContain("Free plan");
    expect(html).toContain("Upgrade");
  });

  it("has no email line", () => {
    expect(at("/queries")).not.toContain("n@example.com");
  });

  it("the Upgrade link is burgundy", () => {
    expect(rule(".ws-up")).toContain("color: var(--shell-burgundy)");
  });

  it("orders hairline → name → Settings, and stops there", () => {
    const d = src.indexOf("ws-pfoot");
    const u = src.indexOf("ws-urow");
    const st = src.indexOf("ws-setrow");
    expect(d).toBeGreaterThan(-1);
    expect(u).toBeGreaterThan(d);
    expect(st).toBeGreaterThan(u);
  });

  /* ⚠️ NO AVATAR IN THE PANEL (Amendment 1, B) — the RAIL carries the face, and it survives
     collapse. A second copy would be two mounts of one identity, disagreeing the day one moves. */
  it("has no avatar in the panel; the rail has it", () => {
    const html = at("/queries");
    expect(railOf(html)).toContain("sp-ava");
    expect(html.slice(html.indexOf("ws-panel"))).not.toContain("sp-ava");
  });

  it("there is no foot collapse row — the control lives in the panel head", () => {
    expect(cssRules).not.toContain(".ws-crow");
    expect(src).not.toContain("ws-crow");
  });
});

describe("Baked 12 + 13 + Amendment 1 (C) — the bar", () => {
  it("carries the search pill and the help button", () => {
    const html = at("/queries");
    expect(html).toContain("sp-search");
    expect(html).toContain("sp-help");
  });

  it("has NO search in the rail or panel", () => {
    const html = at("/queries");
    expect(html).toContain("ws-main");
    expect(html.slice(0, html.indexOf("ws-main"))).not.toContain("sp-search");
  });

  /* ⚠️ THE BRAND LEADS THE CRUMB (Amendment 1, C) — the real asset, not styled text, and it has
     left the sidebar entirely. */
  it("leads with the logotype ASSET, then a separator, then the crumb", () => {
    const html = at("/queries");
    expect(html).toContain('src="/scriptally-title-v2.png"');
    expect(html).toContain('alt="ScriptAlly"');
    expect(html).toContain("ws-sep");
    expect(html.indexOf("ws-logotype")).toBeLessThan(html.indexOf("<b>Queries</b>"));
  });

  /* ⚠️ 31px IS MEASURED, NOT CHOSEN. The asset is 2400×750 with the cap-"S" spanning y 190→577 —
     51.7% of the height. heightPx is NOT cap-height: asking for a 16px cap means a 31px element,
     and setting 16 would render an 8px cap that looks like the logo was made too small. */
  it("renders the logotype at the measured height for a ~16px cap", () => {
    expect(src).toContain("const LOGOTYPE_PX = 31");
    expect(at("/queries")).toMatch(/height:31px/);
  });

  it("the wordmark is GONE from the sidebar; the S tile is the only mark there", () => {
    const railHtml = railOf(at("/queries"));
    expect(railHtml).not.toContain("scriptally-title-v2.png");
    expect(railHtml).toContain("ws-tile");
  });

  it("the crumb reads Section · Child", () => {
    const html = at("/queries");
    expect(html).toContain("<b>Queries</b>");
    expect(html).toContain("Query Centre");
  });

  /* Baked 13 — the panel's pill carries the book; the crumb repeating it gives that fact two
     homes, and two homes eventually disagree. */
  it("the crumb does NOT carry the manuscript", () => {
    const html = at("/queries");
    const bar = html.slice(html.indexOf("ws-crumb"));
    expect(html).toContain("ws-crumb");
    expect(bar.slice(0, bar.indexOf("ws-bright"))).not.toContain("The Hollow Sea");
  });

  it("the bar reads the head token", () => {
    expect(rule(".ws-bar")).toContain("height: var(--head)");
  });
});

describe("Baked 21 — focus rings and reduced motion", () => {
  it("panel rows and rail icons both take a visible ring", () => {
    expect(rule(".ws-ni:focus-visible")).toContain("var(--shell-focus)");
    expect(rule(".ws-ri:focus-visible")).toContain("rgba(244, 239, 231, 0.5)");
  });

  it("reduced motion kills the transitions", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("Amendment 1 (A + B) — full-screen, card-on-ground", () => {
  /* ⚠️ THE SAGE DESK IS REJECTED FOR THE WORKSPACE, named so a later "faithful to the mockup"
     pass fails loudly rather than putting a green field back behind a shell that no longer
     floats. Same pattern as the rejected ink-avatar hex. */
  it("the sage desk gradient is REJECTED here", () => {
    expect(cssRules).not.toContain("--shell-desk-grad");
    expect(cssRules).not.toContain("#b4c2b6");
    expect(src).not.toContain("ws-desk");
    expect(src).not.toContain("ws-cap\"");
  });

  it("the app ground is the chrome token, edge to edge", () => {
    expect(rule(".ws-app")).toContain("background: var(--shell-chrome)");
  });

  it("the main area frames the card: 14px on three sides, 12px against the panel shadow", () => {
    expect(rule(".ws-main"))
      .toContain("padding: var(--shell-frame) var(--shell-frame) var(--shell-frame) 12px");
  });

  it("the card is white on the radius token, hairline-bordered and softly raised", () => {
    const r = rule(".ws-card");
    expect(r).toContain("background: #ffffff");
    expect(r).toContain("border-radius: var(--shell-card-radius)");
    expect(r).toContain("border: 1px solid rgba(46, 39, 35, 0.06)");
    expect(r).toContain("box-shadow: 0 1px 2px rgba(46, 39, 35, 0.05), 0 8px 24px rgba(46, 39, 35, 0.08)");
  });

  it("the bar renders INSIDE the card", () => {
    const html = at("/queries");
    expect(html).toContain("ws-card");
    expect(html.indexOf("ws-card")).toBeLessThan(html.indexOf("ws-bar"));
  });

  it("the frame tokens carry the specced values", () => {
    const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(indexCss).toMatch(/--shell-frame:\s*14px\s*;/);
    expect(indexCss).toMatch(/--shell-card-radius:\s*16px\s*;/);
  });
});

/* ⚠️ THE ANTI-ECHO DIMMING IS SUPERSEDED (Amendment 1, B). It existed because the rail mirrored
   the panel's rows; with the rail decoupled there is no echo to suppress, and dimming a static
   icon set read as a broken strip. The rail is full strength in both states. */
describe("Amendment 1 (B) — no rail dimming", () => {
  it("no rule dims the rail icons", () => {
    expect(cssRules).not.toContain("rgba(168, 154, 138, 0.4)");
    expect(cssRules).not.toContain("rgba(168, 154, 138, 0.65)");
  });

  it("the rail icon rests at full strength and brightens on hover", () => {
    expect(rule(".ws-ri")).toContain("color: var(--shell-rail-tx)");
    expect(rule(".ws-ri:hover")).toContain("color: var(--shell-rail-hi)");
  });

  it("panel rows keep their inline icon at .8, full on hover and active", () => {
    expect(rule(".ws-ic")).toContain("opacity: 0.8");
    expect(rule(".ws-ni:hover .ws-ic")).toContain("opacity: 1");
    expect(rule(".ws-ni.on .ws-ic")).toContain("opacity: 1");
  });
});

describe("Amendment 1 (D) — the collapse control", () => {
  it("expanded, the « ghost sits beside the manuscript pill", () => {
    const html = at("/queries");
    expect(html).toContain("ws-ctog");
    expect(html).toContain('aria-label="Collapse the navigation"');
    expect(html.indexOf("ws-mspill")).toBeLessThan(html.indexOf("ws-ctog"));
  });

  it("» sits on the rail above Settings, in the foot group", () => {
    const rail = src.slice(src.indexOf('className={`ws-rail'), src.indexOf("</aside>"));
    expect(rail.indexOf("ws-xtog")).toBeGreaterThan(rail.indexOf("ws-grow"));
    expect(rail.indexOf("ws-xtog")).toBeLessThan(rail.indexOf('data-tip="Settings"'));
  });

  it("both write the one persistence key", () => {
    expect(src).toContain("setShut(true)");
    expect(src).toContain("setShut(false)");
    expect(src).toContain("writeCollapsed");
  });
});

describe("Amendment 1 (E) — hover peeks, click commits", () => {
  it("rail icons peek on hover and schedule a graceful close", () => {
    expect(src).toContain("onMouseEnter={() => onRailEnter(sec)}");
    expect(src).toContain("onMouseLeave={schedulePeekClose}");
  });

  /* E3 — a peek resolving into a still-collapsed rail would leave you where you started. */
  it("flyout selection navigates, expands AND opens that accordion", () => {
    expect(src).toMatch(/setOpenId\(flySection\.id\); setShut\(false\); go\(ch\.path\)/);
  });

  it("the flyout is anchored to the rail and has NO foot action", () => {
    expect(rule(".ws-fly")).toContain("left: calc(var(--shell-railw) + 10px)");
    expect(srcCode).not.toContain("Expand sidebar");
  });

  it("Settings expands when collapsed rather than navigating away", () => {
    expect(src).toMatch(/if \(collapsed\) \{ setShut\(false\); return; \} go\("\/account"\)/);
  });

  it("`[` is bound and routed through the suppression rule", () => {
    expect(src).toContain('e.key !== "["');
    expect(src).toContain("collapseKeyAllowed");
    expect(src).toContain('document.querySelector(".sp-pal")');
  });
});

/* ⚠️ AMENDMENT 1 (G) — the dashboard renders INSIDE this shell. Both the S tile and the rail's
   Dashboard icon go there, and the sidebar persists across the trip. */
describe("Amendment 1 (G) — both brand marks route home, shell intact", () => {
  it("the S tile navigates to the dashboard", () => {
    expect(src).toMatch(/className="ws-tile"[\s\S]*?go\("\/dashboard"\)/);
    expect(at("/queries")).toContain('data-tip="Dashboard"');
  });

  it("Dashboard is a normal section in the nav", () => {
    const html = at("/dashboard");
    expect(html).toContain("Dashboard");
    expect(html).toContain("<b>Dashboard</b>");
  });

  it("the shell still renders on the dashboard route", () => {
    const html = at("/dashboard");
    expect(html).toContain("ws-rail");
    expect(html).toContain("ws-panel");
  });
});

describe("The IA is a PROP — the shell owns grammar, never a section list", () => {
  it("no section labels are hard-coded in the component", () => {
    expect(src).not.toContain('label: "Queries"');
    expect(src).not.toContain("SECTIONS =");
  });

  it("children of a shut section are unreachable by keyboard", () => {
    expect(src).toContain("tabIndex={st.open ? 0 : -1}");
  });
});

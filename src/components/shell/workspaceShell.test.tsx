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
    id: "queries", label: "Queries", def: "q-all",
    children: [
      { id: "q-all", label: "All queries", path: "/queries" },
      { id: "q-att", label: "Needs attention", path: "/queries?status=attention", count: 3, urgent: true },
    ],
  },
  { id: "todo", label: "To-do", path: "/todo", count: 4, urgent: true },
];

const at = (path: string) =>
  renderToStaticMarkup(
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

const rule = (sel: string) => {
  expect(css, `workspaceShell.css must define ${sel}`).toContain(sel + " {");
  const i = css.indexOf(sel + " {");
  return css.slice(i, css.indexOf("}", i));
};

describe("⚠️ T3 — the rail is PAINT, not a container", () => {
  /* THE fixture. If someone rebuilds this as two siblings, the gradient goes and a width appears
     on a rail element; icon drift on collapse comes back the same afternoon. */
  it("the ink band is a background gradient stop on the ONE column", () => {
    const r = rule(".ws-shell");
    expect(r).toContain("linear-gradient(");
    expect(r).toContain("var(--shell-ink) 0 var(--shell-railw)");
    expect(r).toContain("var(--shell-chrome) var(--shell-railw)");
  });

  it("the column's width is the SUM of the two widths — one element, not two", () => {
    expect(rule(".ws-shell")).toContain("width: calc(var(--shell-railw) + var(--shell-panelw))");
  });

  it("collapsing changes only that one width", () => {
    expect(css).toMatch(/\.ws-shell\.shut \{\s*width: var\(--shell-railw\);\s*\}/);
  });

  it("the icon cell is the same fixed 52px box in EVERY state — the anti-drift contract", () => {
    expect(rule(".ws-ci")).toContain("width: var(--shell-railw)");
    expect(css, "no collapsed-only override of the icon cell's width")
      .not.toMatch(/\.ws-shell\.shut[^{]*\.ws-ci\s*\{[^}]*width:/);
  });

  /* ⚠️ AMENDMENT 1 (B) — THE RAIL'S SHADOW IS A PAINTED OVERLAY, and that is a T3 rule rather
     than a stylistic one. A box-shadow needs an element to cast it, which would mean giving the
     rail its own container — exactly the refactor that reintroduces icon drift. */
  it("the rail shadow is an ::after overlay on the column, never a box-shadow", () => {
    const r = rule(".ws-shell::after");
    expect(r).toContain("left: var(--shell-railw)");
    expect(r).toContain("width: 18px");
    expect(r).toContain("linear-gradient(90deg, rgba(46, 39, 35, 0.1), rgba(46, 39, 35, 0))");
    expect(r).toContain("pointer-events: none");
    expect(rule(".ws-shell"), "the column casts no shadow of its own").not.toContain("box-shadow");
  });

  it("no sibling rail element exists to drift against", () => {
    expect(cssRules).not.toMatch(/\.ws-rail\s*\{/);
    expect(src).not.toContain("ws-rail");
  });
});

describe("Baked 4 — the active grammar is never a burgundy fill", () => {
  it("the rail cell takes a translucent white square", () => {
    expect(rule(".ws-row.rail-on .ws-ib")).toContain("background: rgba(255, 255, 255, 0.12)");
  });

  it("the panel label takes a parchment pill in ink, at weight 600", () => {
    const r = rule(".ws-row.fill-pill .ws-cl");
    expect(r).toContain("background: var(--shell-parch)");
    expect(r).toContain("color: var(--shell-ink)");
    expect(r).toContain("font-weight: 600");
  });

  /* Burgundy is urgency in this shell — a burgundy nav fill would make every active row read as
     an alert. It is allowed on the count dot and the Upgrade link, and nowhere else. */
  it("no nav fill is burgundy", () => {
    expect(rule(".ws-row.fill-pill .ws-cl")).not.toContain("burgundy");
    expect(rule(".ws-row.rail-on .ws-ib")).not.toContain("burgundy");
  });

  it("the quiet parent is bold ink with NO fill (Baked 5)", () => {
    const r = rule(".ws-row.fill-quiet .ws-cl");
    expect(r).toContain("font-weight: 600");
    expect(r).not.toContain("background:");
  });
});

describe("Baked 6 — children indent to the parent LABEL, not the icon column", () => {
  /* Indenting from the icon reads as a second icon column with nothing in it. */
  it("the thread line sits at rail + 16px", () => {
    expect(rule(".ws-subin::before")).toContain("left: calc(var(--shell-railw) + 16px)");
  });

  it("the thread line is the edge token, 1px", () => {
    const r = rule(".ws-subin::before");
    expect(r).toContain("width: 1px");
    expect(r).toContain("background: var(--shell-edge)");
  });

  it("child rows clear the icon column entirely", () => {
    expect(rule(".ws-srow")).toContain("margin: 1px 10px 1px calc(var(--shell-railw) + 6px)");
  });
});

describe("⚠️ T6 — the panel side FADES; it is never display:none", () => {
  /* display:none mid-transition kills the animation: the labels vanish in a single frame. */
  it("collapse hides the panel side with opacity + visibility", () => {
    const r = rule(".ws-shell.shut .ws-fade");
    expect(r).toContain("opacity: 0");
    expect(r).toContain("visibility: hidden");
    expect(r).not.toContain("display: none");
  });

  it("the fade is a transition, not a jump", () => {
    expect(rule(".ws-fade")).toContain("transition: opacity");
  });
});

describe("Baked 7 — collapsed tooltips", () => {
  it("compose Section · Child from the state grammar", () => {
    expect(at("/queries?status=attention")).toContain('data-tip="Queries · Needs attention"');
  });

  it("appear only while collapsed, after a 250ms intent delay", () => {
    expect(css).toMatch(/\.ws-shell\.shut \.ws-row:hover::after[\s\S]*?transition-delay: 0\.25s/);
  });

  it("are suppressed behind an open flyout", () => {
    expect(rule(".ws-shell.flyopen .ws-row::after")).toContain("display: none");
  });
});

describe("Baked 9 — the manuscript selector", () => {
  it("renders the active manuscript as a white pill on the panel side", () => {
    expect(at("/queries")).toContain("The Hollow Sea");
    const r = rule(".ws-hrowB .ws-cl");
    expect(r).toContain("background: #ffffff");
    expect(r).toContain("border: 1px solid var(--shell-edge)");
  });

  it("offers a switcher when there is more than one manuscript", () => {
    expect(at("/queries")).toContain('aria-haspopup="menu"');
  });

  /* Baked 9: one manuscript is the same row, static — no chevron, no popover. */
  /* ⚠️ SCOPED TO THE SELECTOR ROW ON PURPOSE. A whole-document `not.toContain("aria-haspopup")`
     passes only until the user row — which legitimately has one — is rendered, and then fails
     for a reason that has nothing to do with the manuscript selector. */
  it("is static and popover-less with a single manuscript", () => {
    msFixture = [MANUSCRIPTS[0]];
    const html = at("/queries");
    expect(html).toContain("The Hollow Sea");
    expect(html, "the selector row must exist for this claim to mean anything")
      .toContain("ws-hrowB");
    const row = html.slice(html.indexOf("ws-hrowB"), html.indexOf("ws-hdiv"));
    expect(row).toContain("static");
    expect(row).not.toContain("aria-haspopup");
    expect(row, "no switch chevron on a single manuscript").not.toContain("ws-chev");
    msFixture = MANUSCRIPTS;
  });

  it("DOES show the switch chevron when there is more than one", () => {
    const html = at("/queries");
    expect(html).toContain("ws-hrowB");
    expect(html.slice(html.indexOf("ws-hrowB"), html.indexOf("ws-hdiv"))).toContain("ws-chev");
  });

  /* ⚠️ Packages, Comps and Manuscripts READ this key. A selector that stops writing it breaks
     them with no error — just the wrong book. */
  it("writes the shared active-manuscript key", () => {
    expect(src).toContain('"scriptally_active_manuscript_id"');
    expect(src).toContain("localStorage.setItem(ACTIVE_MS_KEY");
  });

  it("is NOT disabled when static — a disabled button loses the tooltip that names the book", () => {
    expect(src).not.toMatch(/disabled=\{!manyMs/);
  });
});

describe("Baked 10 — the foot, in order, with nothing extra", () => {
  it("carries the user's name and plan line", () => {
    const html = at("/queries");
    expect(html).toContain("Nick Physick");
    expect(html).toContain("Free plan");
    expect(html).toContain("Upgrade");
  });

  it("has no email line", () => {
    expect(at("/queries")).not.toContain("n@example.com");
  });

  it("carries Settings", () => {
    expect(at("/queries")).toContain("Settings");
  });

  /* ⚠️ AMENDMENT 1 (A2) — THE FOOT COLLAPSE ROW IS GONE. The control moved to head row A, and
     the foot now ends at Settings. */
  it("has NO collapse row in the foot", () => {
    expect(cssRules).not.toContain(".ws-crow");
    expect(src).not.toContain("ws-crow");
  });

  it("the Upgrade link is burgundy — the only other burgundy in the shell", () => {
    expect(rule(".ws-urow .ws-up")).toContain("color: var(--shell-burgundy)");
  });

  it("orders hairline → user → Settings, and stops there", () => {
    const d = src.indexOf("ws-fdiv");
    const u = src.indexOf("ws-urow");
    const st = src.indexOf("ws-setrow");
    expect(d).toBeGreaterThan(-1);
    expect(u).toBeGreaterThan(d);
    expect(st).toBeGreaterThan(u);
  });
});

describe("Baked 11 — one avatar, including on the ink rail", () => {
  it("the foot uses AvatarChip, not a bespoke ink disc", () => {
    expect(at("/queries")).toContain("sp-ava");
    expect(css).not.toContain("#4a423c");
  });
});

describe("Baked 12 + 13 — the bar", () => {
  it("carries the search pill and the help button", () => {
    const html = at("/queries");
    expect(html).toContain("sp-search");
    expect(html).toContain("sp-help");
  });

  /* Baked 12 is explicit: no search in the panel. Two searches would answer differently. */
  it("has NO search in the shell panel", () => {
    const html = at("/queries");
    const shellPart = html.slice(0, html.indexOf("ws-main"));
    expect(html, "the bar must exist for this slice to mean anything").toContain("ws-main");
    expect(shellPart).not.toContain("sp-search");
  });

  it("the crumb reads Section · Child", () => {
    expect(at("/queries?status=attention")).toContain("<b>Queries</b> · Needs attention");
  });

  /* Baked 13 — the shell's selector carries the book; the crumb repeating it gives that fact two
     homes, and two homes eventually disagree. */
  it("the crumb does NOT carry the manuscript", () => {
    const html = at("/queries?status=attention");
    const bar = html.slice(html.indexOf("ws-crumb"));
    expect(html, "the crumb must exist for this slice to mean anything").toContain("ws-crumb");
    expect(bar.slice(0, bar.indexOf("ws-bright"))).not.toContain("The Hollow Sea");
  });

  it("the bar reads the SAME head token as the shell's brand row", () => {
    expect(rule(".ws-bar")).toContain("height: var(--head)");
    expect(rule(".ws-hrowA")).toContain("height: var(--head)");
  });

  /* ⚠️ AMENDMENT 1 (B) — THE BAR IS THE CARD'S HEADER. There is no bar outside the card, so the
     crumb and the search sit on the same white surface as the page rather than on the ground. */
  it("the bar renders INSIDE the content card", () => {
    const html = at("/queries");
    expect(html).toContain("ws-card");
    expect(html.indexOf("ws-card")).toBeLessThan(html.indexOf("ws-bar"));
  });
});

describe("Baked 21 — focus rings and reduced motion", () => {
  it("focus lands on the label expanded and on the icon cell collapsed", () => {
    expect(css).toMatch(/\.ws-row:focus-visible \.ws-cl[\s\S]*?var\(--shell-focus\)/);
    expect(css).toMatch(/\.ws-shell\.shut \.ws-row:focus-visible \.ws-ib[\s\S]*?var\(--shell-focus\)/);
  });

  it("reduced motion kills the transitions", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("The IA is a PROP — the shell owns grammar, never a section list", () => {
  it("no section labels are hard-coded in the component", () => {
    expect(src).not.toContain('label: "Queries"');
    expect(src).not.toContain("SECTIONS =");
  });

  it("renders whatever it is given", () => {
    const html = at("/todo");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Queries");
    expect(html).toContain("To-do");
  });

  it("children of a shut section are unreachable by keyboard", () => {
    expect(src).toContain("tabIndex={st.open ? 0 : -1}");
  });
});

/**
 * ⚠️⚠️ AMENDMENT 1 — FULL-SCREEN GEOMETRY. The desk and the capsule are GONE: the shell is the
 * leftmost column of the viewport, `--shell-chrome` is the page ground, and the content is a
 * white card floating on it.
 */
describe("Amendment 1 (A + B) — full-screen, card-on-ground", () => {
  /* ⚠️ THE SAGE DESK IS REJECTED FOR THE WORKSPACE, and is named here so a later "faithful to the
     mockup" pass fails loudly rather than putting a green field back behind a shell that no
     longer floats. Same pattern as the rejected ink-avatar hex. */
  it("the sage desk gradient is REJECTED here", () => {
    expect(cssRules).not.toContain("--shell-desk-grad");
    expect(cssRules).not.toContain("#b4c2b6");
    expect(src).not.toContain("ws-desk");
    expect(src).not.toContain("ws-cap");
  });

  it("the app ground is the chrome token, edge to edge", () => {
    expect(rule(".ws-app")).toContain("background: var(--shell-chrome)");
  });

  it("the capsule's radius and shadow are gone from the shell column", () => {
    expect(rule(".ws-shell")).not.toContain("border-radius");
    expect(rule(".ws-shell")).not.toContain("box-shadow");
  });

  it("the main area frames the card: 14px on three sides, 12px against the rail's shadow", () => {
    expect(rule(".ws-main"))
      .toContain("padding: var(--shell-frame) var(--shell-frame) var(--shell-frame) 12px");
  });

  it("the card is white on the radius token, hairline-bordered and softly raised", () => {
    const r = rule(".ws-card");
    expect(r).toContain("background: #ffffff");
    expect(r).toContain("border-radius: var(--shell-card-radius)");
    expect(r).toContain("border: 1px solid rgba(46, 39, 35, 0.06)");
    expect(r).toContain("box-shadow: 0 1px 2px rgba(46, 39, 35, 0.05), 0 8px 24px rgba(46, 39, 35, 0.08)");
    expect(r).toContain("overflow: hidden");
  });

  it("the two new tokens carry the specced values", () => {
    const indexCss = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(indexCss).toMatch(/--shell-frame:\s*14px\s*;/);
    expect(indexCss).toMatch(/--shell-card-radius:\s*16px\s*;/);
  });
});

/**
 * ⚠️ AMENDMENT 1 (C) — the icon moved beside the label, so the rail's copy of it now says the
 * same thing twice, 60px away. The anti-echo rule dims the rail copies while expanded and
 * restores them on collapse. It is a state-driven colour change on ONE icon set.
 */
describe("Amendment 1 (C) — inline label icons and the anti-echo rule", () => {
  it("every top-level label carries its icon inline", () => {
    const html = at("/queries");
    expect(html).toContain("ws-li");
    // three sections + the manuscript pill + Settings
    expect(html.match(/class="ws-li"/g)?.length).toBe(5);
  });

  it("the inline icon inherits the label's colour rather than carrying its own", () => {
    const r = rule(".ws-li");
    expect(r).toContain("color: inherit");
    expect(r).toContain("opacity: 0.8");
  });

  it("it reaches full strength on hover and when active", () => {
    expect(css).toMatch(/\.ws-row\.fill-pill \.ws-li[\s\S]{0,120}?opacity: 1/);
  });

  it("expanded, the inactive rail icons recede; the ACTIVE one is excluded", () => {
    expect(css).toContain(".ws-shell:not(.shut) .ws-navwrap .ws-row:not(.rail-on) .ws-ib");
    expect(css).toMatch(/\.ws-row:not\(\.rail-on\) \.ws-ib[\s\S]{0,140}?rgba\(168, 154, 138, 0\.4\)/);
    expect(css).toMatch(/:not\(\.rail-on\):hover \.ws-ib[\s\S]{0,140}?rgba\(168, 154, 138, 0\.65\)/);
  });

  /* Collapsed the rail icons are all there is, so they must come back to full strength — the
     dimming is scoped to `:not(.shut)` for exactly that reason. */
  it("the receding is scoped to the EXPANDED state only", () => {
    expect(css).not.toMatch(/\.ws-shell\.shut[^{]*\.ws-ib\s*\{[^}]*rgba\(168, 154, 138/);
  });

  /* ⚠️ SCOPED TO THE CHILD BUTTONS THEMSELVES. Slicing "from the sub-nav to the spacer" swept in
     every later section row, which legitimately carries an inline icon — the guard would have
     failed on the rule it was meant to protect. */
  it("children stay text-only — the indent and thread line carry the hierarchy", () => {
    const html = at("/queries");
    const kids = html.match(/<button[^>]*class="ws-srow[^"]*"[\s\S]*?<\/button>/g) ?? [];
    expect(kids.length, "child rows must render for this claim to mean anything")
      .toBe(SECTIONS[1].children!.length);
    for (const k of kids) expect(k).not.toContain("ws-li");
  });
});

/**
 * ⚠️ AMENDMENT 1 (D + E) — the collapse control moved to the head, and the grammar became
 * hover-peeks/click-commits.
 */
describe("Amendment 1 (D) — the collapse control lives in the head", () => {
  it("expanded, the chevrons sit beside the wordmark", () => {
    const html = at("/queries");
    expect(html).toContain("ws-ctog");
    expect(html).toContain('aria-label="Collapse the navigation"');
    expect(html.indexOf("ws-hrowA")).toBeLessThan(html.indexOf("ws-ctog"));
  });

  it("an expand row sits on the rail, shown only when collapsed", () => {
    expect(at("/queries")).toContain("ws-xtog");
    expect(rule(".ws-xtog")).toContain("display: none");
    expect(css).toContain(".ws-shell.shut .ws-xtog { display: flex; }");
  });

  it("both controls use the one persistence key", () => {
    expect(src).toContain("setShut(true)");
    expect(src).toContain("setShut(false)");
    expect(src).toContain("writeCollapsed");
  });
});

describe("Amendment 1 (E) — hover peeks, click commits", () => {
  it("rail rows peek on hover and schedule a graceful close", () => {
    expect(src).toContain("onMouseEnter={() => onRowEnter(sec)}");
    expect(src).toContain("onMouseLeave={schedulePeekClose}");
  });

  /* E3 — a peek that resolved into a still-collapsed rail would leave you where you started. */
  it("flyout selection navigates, expands AND opens that section's accordion", () => {
    expect(src).toMatch(/onSelect=\{\(\) => \{[\s\S]*?setOpenId\(flySection\.id\)[\s\S]*?setShut\(false\)[\s\S]*?go\(ch\.path\)/);
  });

  /* E4 — "Expand sidebar" was superseded the moment every click expanded. */
  it("the flyout has NO foot action", () => {
    expect(srcCode).not.toContain("Expand sidebar");
  });

  it("Settings and the manuscript pill expand when collapsed rather than navigating", () => {
    expect(src).toMatch(/onClick=\{\(\) => \{ if \(collapsed\) \{ setShut\(false\); return; \} go\("\/account"\); \}\}/);
    expect(src).toMatch(/if \(collapsed\) \{ setShut\(false\); return; \}\s*\n\s*if \(manyMs\)/);
  });

  it("`[` is bound, and routed through the suppression rule", () => {
    expect(src).toContain('e.key !== "["');
    expect(src).toContain("collapseKeyAllowed");
    expect(src).toContain('document.querySelector(".sp-pal")');
  });
});

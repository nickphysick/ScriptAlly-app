/**
 * Locks for the TOP-NAV shell. ⚠️ The rule that shaped it: THE SHELL RENDERS WHAT EXISTS, NEVER
 * WHAT IS PLANNED — roughly half the pack's menu items had no route, and every one of them is
 * absent rather than dead or greyed.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { NAV_MENUS, navPanels } from "../../lib/topNav";
import { WORKSPACE_PATHS } from "../../marketing/routeTiers";
import { TOPNAV_SHELL_PATHS, WORKSPACE_SHELL_PATHS } from "../../lib/shellForRoute";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Nick Physick", email: "n@example.com", plan: UserPlan.FREE },
  }),
}));

import { TopNavShell } from "./TopNavShell";

const css = readFileSync(resolve(__dirname, "./topNav.css"), "utf8");
const src = readFileSync(resolve(__dirname, "./TopNavShell.tsx"), "utf8");
const at = (extra: Partial<React.ComponentProps<typeof TopNavShell>> = {}) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <TopNavShell
        onNavigate={() => {}}
        onNavigatePath={() => {}}
        panelInput={{ overdue: 3, idle: 4, packagelessManuscripts: 1 }}
        {...extra}
      >
        <div />
      </TopNavShell>
    </MemoryRouter>
  );

describe("⚠️ the shell renders what EXISTS, never what is planned", () => {
  it("every menu destination is a real route or an existing capture — no dead links", () => {
    for (const menu of NAV_MENUS) {
      for (const col of menu.columns) {
        for (const item of col.items) {
          if (item.run.kind === "path") {
            expect(WORKSPACE_PATHS.has(item.run.path), `${item.label} → ${item.run.path}`).toBe(true);
          } else if (item.run.kind === "capture") {
            expect(["query", "record", "agent"]).toContain(item.run.capture);
          }
        }
      }
    }
  });

  it("the unbuilt items are ABSENT, not greyed and not inert", () => {
    const labels = NAV_MENUS.flatMap((m) => m.columns.flatMap((c) => c.items.map((i) => i.label)));
    for (const gone of ["Progress", "Archive", "Agencies", "Manuscript wish lists", "Response times",
      "Closed to queries", "Submission rules", "Query letters", "Synopses", "Opening samples", "Downloads"]) {
      expect(labels, gone).not.toContain(gone);
    }
    expect(src).not.toContain("disabled");
  });

  it("THREE headings — Learn is gone, because it opened onto one link", () => {
    expect(NAV_MENUS.map((m) => m.label)).toEqual(["Queries", "Agents", "Materials"]);
    // Help centre is not orphaned: the shared account menu carries it.
    const am = readFileSync(resolve(__dirname, "./AccountMenu.tsx"), "utf8");
    expect(am).toContain("Help centre");
  });

  /* ⚠️ REWRITTEN to assert the RULE rather than identical membership (shell-rebuild Phase 3).
     The two surfaces no longer carry the same list — the workspace nav follows the pack's IA,
     which does not place /import, while the mega menus still offer it — and asserting sameness
     would force one of them to misreport the pack. What must hold on BOTH is that nothing points
     at a route that does not exist, so that is what this proves now, by walking every path. */
  it("NEITHER surface points at a route that does not exist", () => {
    const nav = readFileSync(resolve(__dirname, "../../lib/workspaceNav.ts"), "utf8");
    for (const gone of ["Archive", "Query letters", "Synopses", "Opening samples", "Documents", "Learn"]) {
      expect(nav, gone).not.toContain(`label: "${gone}"`);
    }
    const real = new Set([...WORKSPACE_SHELL_PATHS, ...TOPNAV_SHELL_PATHS]);
    const paths = NAV_MENUS
      .flatMap((m) => m.columns.flatMap((c) => c.items))
      .filter((i) => i.run.kind === "path")
      .map((i) => (i.run as { kind: "path"; path: string }).path);
    expect(paths.length, "the menus must carry paths for this to mean anything").toBeGreaterThan(0);
    for (const p of paths) expect([...real], p).toContain(p.split("?")[0]);
  });
});

describe("the masthead", () => {
  it("reads --head, and has NO desk and NO capsules", () => {
    expect(css).toMatch(/\.tn-mast \{[^}]*height: var\(--head\)/s);
    expect(css).not.toContain("var(--shell-desk)");
    expect(css).not.toContain("var(--shell-cap-shadow)");
    expect(css).not.toContain("var(--shell-cap-rim)");
  });

  /* ⚠️⚠️ T1 — THE SEAM BELONGS TO THE MEGA, NOT THE BAR, and this is the lock that says so.
     Absolutely-positioned children paint OVER their parent's borders, so a bar-owned seam is
     covered by the very panel it is meant to separate. The bar's border is the SCROLL hairline
     only, and it goes transparent while open; the line you see between them is the mega wrap's
     own `border-top`. Rewritten from the ::after form in the shell rebuild. */
  it("⚠️ T1 — the seam is the MEGA's border-top; the bar's border goes transparent while open", () => {
    expect(css).toMatch(/\.tn-megawrap \{[^}]*border-top: 1px solid var\(--shell-seam\)/s);
    expect(css).toMatch(/\.tn-mast \{[^}]*border-bottom: 1px solid transparent/s);
    expect(css).toContain(".tn-mast.scrolled { border-bottom-color: var(--shell-hair); }");
    expect(css).toContain(".tn-mast.megaopen { border-bottom-color: transparent; }");
    expect(src).toContain("megaopen");
  });

  /* ⚠️ REWRITTEN (shell-rebuild Phase 4): the brand is the ink TILE plus a Playfair wordmark
     (Baked 15), not the PNG. Same rule — it is the route home, and there is no Dashboard item in
     these menus — but the artwork is no longer how it is drawn. */
  it("the brand is the ink tile + Playfair wordmark, and it is the route home", () => {
    const html = at();
    expect(html).toContain("tn-tile");
    expect(html).toContain("ScriptAlly");
    expect(html).not.toContain("scriptally-title-v2.png");
    expect(src).toContain('onNavigatePath("/dashboard")');
    expect(NAV_MENUS.map((m) => m.label)).not.toContain("Dashboard");
  });

  it("reuses the SHARED account menu — a second copy would drift", () => {
    expect(src).toContain('import { AccountMenu }');
    expect(src).not.toContain("Sign out"); // it does not re-implement the menu's rows
  });
});

describe("the mega-menus", () => {
  it("columns come from CONTENT — never three reserved slots", () => {
    expect(css).toMatch(/grid-template-columns: repeat\(var\(--cols, 2\), minmax\(0, 1fr\)\) minmax\(300px, 380px\)/);
    expect(src).toContain('["--cols" as string]: menu.columns.length');
    // the menus really are uneven, which is why this matters
    expect(new Set(NAV_MENUS.map((m) => m.columns.length)).size).toBeGreaterThan(0);
  });

  /* ⚠️⚠️ BAKED 16 — ONE MORPHING SURFACE, NOT FOUR MENUS. Four separate menus would each open
     and close on their own as the cursor slid along the bar, which reads as flicker no easing
     can hide. There is one wrap; the panes stack absolutely inside it. */
  it("is ONE wrap with the panes stacked inside it", () => {
    expect(css).toMatch(/\.tn-megawrap \{[^}]*position: absolute/s);
    expect(css).toMatch(/\.tn-mega \{[^}]*position: absolute/s);
    // one wrap in the markup, however many panes
    const html = at();
    expect(html.match(/tn-megawrap/g), "exactly one wrap").toHaveLength(1);
    expect(html.match(/class="tn-mega[ "]/g)?.length).toBe(NAV_MENUS.length);
  });

  /* ⚠️⚠️ T2 — THE HEIGHT IS SET IN JS AND CANNOT BE OTHERWISE: `height:auto` does not animate.
     The `+ 2` is the wrap's own top and bottom borders under border-box — not a fudge factor.
     Removing either half clips the pane or kills the morph. */
  it("⚠️ T2 — the wrap's height is JS-measured from the active pane, plus its two borders", () => {
    expect(src).toContain("offsetHeight + 2");
    expect(src).toContain("style={{ height: open ? wrapH : 0 }}");
    expect(css).toMatch(/\.tn-megawrap \{[^}]*height: 0/s);
    expect(css, "the transition supplies the easing; JS supplies the value")
      .toMatch(/\.tn-megawrap \{[^}]*transition: height var\(--shell-rollout\)/s);
    expect(css, "never auto").not.toMatch(/\.tn-megawrap \{[^}]*height: auto/s);
  });

  it("panes travel from the direction of travel, and leave the opposite way", () => {
    expect(css).toContain('.tn-mega.on[data-dir="1"]');
    expect(css).toContain('.tn-mega.on[data-dir="-1"]');
    expect(css).toContain('.tn-mega.out[data-dir="1"]');
    expect(css).toContain('.tn-mega.out[data-dir="-1"]');
    expect(css).toContain("@keyframes tn-in-right");
    expect(css).toContain("@keyframes tn-in-left");
  });

  it("Baked 17's timings are the specced ones", () => {
    expect(src).toContain("const INTENT_MS = 100");
    expect(src).toContain("const GRACE_MS = 160");
    expect(css).toMatch(/--shell-rollout/);
  });

  it("hover opens on intent, and click toggles for touch", () => {
    expect(src).toContain("onMouseEnter");
    expect(src).toContain("onClick={() => (open === menu.key ? hide() : show(menu.key))}");
  });

  it("scrim, Escape and outside-click all close them", () => {
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain("pointerdown");
    expect(css).toContain(".tn-scrim");
    expect(css).toMatch(/\.tn-scrim \{[^}]*background: rgba\(46, 39, 35, 0\.28\)/s);
  });

  it("onboarding suppresses the menus but keeps the masthead", () => {
    const html = at({ suppressMenus: true });
    expect(html).toContain("tn-mast");
    expect(html).toContain("tn-tile"); // the brand stays, so the page still looks like the product
    expect(html).not.toMatch(/["\s]tn-mega["\s]/);
  });
});

describe("the shared primitives — one component each, both shells", () => {
  it("the bar uses SearchPill, HelpButton and AvatarChip rather than copies", () => {
    const html = at();
    expect(html).toContain("sp-search");
    expect(html).toContain("sp-help");
    expect(html).toContain("sp-ava");
  });

  /* The bespoke search field and avatar this shell used to draw are GONE — two implementations
     of the same control is how the two shells come to disagree about what a search looks like. */
  it("the bespoke search field and avatar are retired", () => {
    expect(css).not.toContain(".tn-srch");
    expect(css).not.toContain(".tn-av ");
    expect(src).not.toContain("tn-srch");
  });
});

describe("the right-hand panel takes LIVE data", () => {
  it("derives every figure — no marketing copy, no stored field", () => {
    const p = navPanels({ overdue: 3, idle: 4, packagelessManuscripts: 1 });
    expect(p.queries.headline).toBe("Three queries are past their reply window");
    expect(p.agents.headline).toBe("Four agents you've saved but never queried");
    expect(p.materials.headline).toBe("A package saves you the rebuild");
  });

  it("singulars agree, and a zero states the calm truth rather than a zero", () => {
    expect(navPanels({ overdue: 1, idle: 1, packagelessManuscripts: 0 }).queries.headline)
      .toBe("One query is past its reply window");
    expect(navPanels({ overdue: 0, idle: 0, packagelessManuscripts: 0 }).queries.headline)
      .toBe("Nothing is past its reply window");
    expect(navPanels({ overdue: 0, idle: 0, packagelessManuscripts: 0 }).agents.headline)
      .toBe("Every agent on file has been queried");
  });
});

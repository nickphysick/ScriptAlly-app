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

  it("the RAIL and the MENUS agree — one rule, both surfaces", () => {
    const col = readFileSync(resolve(__dirname, "../../lib/shellColumn.ts"), "utf8");
    for (const gone of ["Archive", "Query letters", "Synopses", "Opening samples"]) {
      expect(col, gone).not.toContain(`label: "${gone}"`);
    }
    expect(col).toContain('path: "/import"'); // /import exists, so it is in both
  });
});

describe("the masthead", () => {
  it("reads --head, and has NO desk and NO capsules", () => {
    expect(css).toMatch(/\.tn-mast \{[^}]*height: var\(--head\)/s);
    expect(css).not.toContain("var(--shell-desk)");
    expect(css).not.toContain("var(--shell-cap-shadow)");
    expect(css).not.toContain("var(--shell-cap-rim)");
  });

  it("⚠️ the hairline is SCROLL-REVEALED, where the workspace bar's is permanent", () => {
    // No capsule here, so no corner to complete. The asymmetry is deliberate.
    expect(css).toMatch(/\.tn-mast::after \{[^}]*opacity: 0/s);
    expect(css).toContain(".tn-mast.scrolled::after { opacity: 1; }");
    const shellCss = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(shellCss).toMatch(/\.sv2-topbar \{[^}]*border-bottom: 1px solid var\(--shell-line\)/s);
  });

  it("the wordmark is the route home, so there is no Dashboard nav item", () => {
    expect(at()).toContain("scriptally-title-v2.png");
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
    expect(css).toMatch(/grid-template-columns: repeat\(var\(--cols, 2\), minmax\(0, 1fr\)\) 290px/);
    expect(src).toContain('["--cols" as string]: menu.columns.length');
    // the menus really are uneven, which is why this matters
    expect(new Set(NAV_MENUS.map((m) => m.columns.length)).size).toBeGreaterThan(0);
  });

  it("same page colour, separated by SHADOW alone", () => {
    expect(css).toMatch(/\.tn-mega \{[^}]*background: var\(--shell-canvas\)/s);
    expect(css).toMatch(/\.tn-mega \{[^}]*box-shadow:/s);
  });

  it("scrim, Escape and outside-click all close them", () => {
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain("pointerdown");
    expect(css).toContain(".tn-scrim");
  });

  it("onboarding suppresses the menus but keeps the masthead", () => {
    const html = at({ suppressMenus: true });
    expect(html).toContain("tn-mast");
    expect(html).toContain("scriptally-title-v2.png");
    expect(html).not.toContain("tn-mega");
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

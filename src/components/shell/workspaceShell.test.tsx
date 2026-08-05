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

  it("carries Settings and the collapse row", () => {
    const html = at("/queries");
    expect(html).toContain("Settings");
    expect(html).toContain("Collapse");
  });

  it("the Upgrade link is burgundy — the only other burgundy in the shell", () => {
    expect(rule(".ws-urow .ws-up")).toContain("color: var(--shell-burgundy)");
  });

  it("orders user → Settings → collapse in the source", () => {
    const u = src.indexOf("ws-urow");
    const s = src.indexOf("ws-setrow");
    const c = src.indexOf("ws-crow");
    expect(u).toBeGreaterThan(-1);
    expect(s).toBeGreaterThan(u);
    expect(c).toBeGreaterThan(s);
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

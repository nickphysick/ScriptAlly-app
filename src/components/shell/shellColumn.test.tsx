/**
 * Structural locks for the ONE COLUMN. Geometry is `lib/shellColumn.test.ts`; this file asserts
 * the things that live in the component and the stylesheet.
 *
 * ⚠️ FIRST PAINT IS THE SELECTOR STATE A TEST CANNOT SEE. It is a SILENCE — the marker must not
 * animate in from the top-left corner on mount — and jsdom runs no transitions. So the MECHANISM
 * is asserted here (mute on, placed before paint, unmuted exactly one frame later) and the
 * behaviour itself is a browser check, recorded in reports/app-shell.md.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
  }),
}));

import { ShellColumn } from "./ShellColumn";

const src = readFileSync(resolve(__dirname, "./ShellColumn.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "./shellColumn.css"), "utf8");
const at = (path: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <ShellColumn collapsed={false} onSetCollapsed={() => {}} onNavigatePath={() => {}} onNavigate={() => {}} />
    </MemoryRouter>
  );

describe("⚠️ the selector's FIRST PAINT — a silence, asserted by its mechanism", () => {
  it("mounts MUTED, and the mute kills the transition outright", () => {
    // Without this the selector is positioned by JS from (0,0) and springs into place on every
    // single mount — a marker sliding in from the corner on every page load.
    expect(src).toContain("const [muted, setMuted] = useState(true);");
    expect(at("/queries")).toContain("sc-sel mute");
    expect(css).toMatch(/\.sc-sel\.mute \{ transition: none; \}/);
  });

  it("places BEFORE paint and unmutes exactly ONE FRAME later — that order is the silence", () => {
    // useLayoutEffect runs before the browser paints, so the first position is never seen moving;
    // requestAnimationFrame then lifts the mute so every LATER move springs.
    const first = src.slice(src.indexOf("useLayoutEffect(() => {\n    place();"));
    expect(first).toContain("place();");
    expect(first).toContain("window.requestAnimationFrame(() => setMuted(false))");
    expect(first.indexOf("place()")).toBeLessThan(first.indexOf("requestAnimationFrame"));
  });
});

describe("the selector is the ONLY active marker", () => {
  it("no row fill, no underline, no left border, no pill on the icon", () => {
    // The quiet rail's whole trade: one marker, so it must be right in every state.
    expect(css).not.toMatch(/\.sc-row\.on \{[^}]*background:/);
    expect(css).not.toMatch(/\.sc-kid\.on \{[^}]*background:/);
    expect(css).not.toMatch(/\.sc-row[^{]*\{[^}]*border-left:/);
    expect(css).not.toMatch(/\.sc-ic \{[^}]*background:/);
    // what the active row DOES get is ink and weight — colour-independent, not a second fill
    expect(css).toMatch(/\.sc-row\.on \.sc-ic svg[^{]*\{ stroke-width: 2\.4/);
  });

  it("it reads the ACTIVE FILL, never the desk", () => {
    expect(css).toMatch(/\.sc-sel \{[^}]*background: var\(--shell-active-fill\)/s);
    expect(css).not.toContain("var(--shell-desk)");
  });

  it("spring on travel, standard easing on resize — one object moving, not a box redrawn", () => {
    const sel = css.match(/\.sc-sel \{([^}]*)\}/s)?.[1] ?? "";
    expect(sel, "the .sc-sel rule must exist").not.toBe("");
    expect(sel).toMatch(/transform 0\.34s var\(--shell-spring\)/);
    expect(sel).toMatch(/width 0\.3s var\(--shell-ease\)/);
  });
});

describe("the column's structure", () => {
  it("renders the three sections in order, with no counts anywhere", () => {
    const html = at("/queries");
    for (const label of ["Queries", "Agents", "Materials"]) expect(html).toContain(label);
    expect(html.indexOf("Queries")).toBeLessThan(html.indexOf("Agents"));
    expect(html.indexOf("Agents")).toBeLessThan(html.indexOf("Materials"));
    expect(html).not.toContain("sc-ct"); // counts live on the pages
  });

  it("NO HOVER FLYOUTS — clicking a section while collapsed expands and opens in one move", () => {
    expect(src).toContain("sectionClickPlan");
    expect(src).not.toContain("Flyout");
    expect(src).not.toContain("onMouseEnter");
  });

  it("the staggered reveal cascades on EXPAND and is instant on COLLAPSE", () => {
    // A staggered exit reads as lag rather than craft.
    expect(css).toMatch(/transition-delay: calc\(var\(--i, 0\) \* 26ms\)/);
    expect(css).toMatch(/\.sc-col\.shut \.sc-lb \{ transition-delay: 0ms; \}/);
  });

  it("scroll fades are 24px and STATE-driven — never a permanent fade over a short list", () => {
    expect(css).toMatch(/\.sc-sfade \{[^}]*height: 24px/s);
    expect(css).toMatch(/\.sc-sfade \{[^}]*opacity: 0/s);
    expect(css).toContain(".sc-sfade.on { opacity: 1; }");
    expect(src).toContain("el.scrollHeight - el.scrollTop - el.clientHeight > 4");
  });

  it("press scales the ICON, and the focus ring is :focus-visible only", () => {
    expect(css).toMatch(/\.sc-row:active \.sc-ic \{ transform: scale\(0\.92\); \}/);
    expect(css).toContain(":focus-visible");
    expect(css).toMatch(/\.sc-row:focus \{ outline: none; \}/);
  });

  it("explicitly NOT built: collapsed tooltips, shortcut hints, group labels, a resize handle", () => {
    // Each of these was considered and cut. The window `resize` LISTENER is a different thing —
    // it re-places the selector when the viewport changes, and the column needs it.
    expect(src, "no tooltip on a nav row").not.toContain('title="Queries"');
    expect(src, "no shortcut hints").not.toContain("⌘");
    expect(src, "no group labels").not.toContain("sc-grouplabel");
    expect(src, "no drag-to-resize handle").not.toMatch(/resiz(er|eHandle)|onPointerDown/);
    expect(css, "no resize affordance in the stylesheet").not.toContain("cursor: col-resize");
  });
});

describe("the foot — exactly two quick actions, and all four contracts survive", () => {
  it("New and Record a response, and Record is NOT also in the popover", () => {
    const html = at("/queries");
    expect(html).toContain("New");
    expect(html).toContain("Record a response");
    // the popover is closed at rest, so its three creates are asserted at the source
    expect(src).toContain('invokeCapture("query", onNavigate)');
    expect(src).toContain('invokeCapture("agent", onNavigate)');
    expect(src).toContain('onNavigate("manuscripts", "Add a manuscript")');
    expect(src).toContain('invokeCapture("record", onNavigate)');
    // Record appears ONCE — as its own button, not also inside Create
    const pop = src.slice(src.indexOf('role="menu"'), src.indexOf("sc-qb p"));
    expect(pop).not.toContain('invokeCapture("record"');
  });

  it("Pro is a text link in the foot — not a card, not a badge", () => {
    expect(src).toContain("sc-up");
    expect(css).toMatch(/\.sc-up \{[^}]*color: var\(--slate\)/s);
    expect(src).not.toContain("propill");
  });
});

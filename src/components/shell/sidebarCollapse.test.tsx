/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar collapse (sidebar-collapse pack) — what a node environment can actually prove.
 *
 * ⚠️ THE PACK'S OWN VERIFICATION RULE APPLIES: render and look, don't measure — jsdom cannot
 * verify flex/width chains, and this repo has no jsdom anyway. So the width chain lives in the
 * screenshot pass (reports/sidebar-collapse-2026-08-11.md); THESE tests cover the four things the
 * pack lists as testable — persistence round-trip, toggle state transitions, the keyboard handler
 * ignoring input targets, mini-badge only when a count exists — plus the source properties whose
 * regression would be silent.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  SIDEBAR_COLLAPSED_KEY, isEditableTarget, readSidebarCollapsed, sidebarShortcut, writeSidebarCollapsed,
} from "./useSidebarCollapsed";
import { workspaceSections } from "../../lib/workspaceNav";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
import { WorkspaceShell } from "./WorkspaceShell";

const hookSrc = readFileSync(resolve(__dirname, "./useSidebarCollapsed.ts"), "utf8");
const shellSrc = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

/* ── persistence round-trip ── */
describe("persistence", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };

  it("round-trips through the pack's key", () => {
    const s = mem();
    expect(readSidebarCollapsed(s)).toBe(false); // absent → expanded
    writeSidebarCollapsed(s, true);
    expect(s.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("1");
    expect(readSidebarCollapsed(s)).toBe(true);
    writeSidebarCollapsed(s, false);
    expect(s.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("0");
    expect(readSidebarCollapsed(s)).toBe(false);
  });

  it("tolerates a throwing storage (private mode) without throwing itself", () => {
    const angry = { getItem: () => { throw new Error("nope"); }, setItem: () => { throw new Error("nope"); } };
    expect(readSidebarCollapsed(angry as never)).toBe(false);
    expect(() => writeSidebarCollapsed(angry as never, true)).not.toThrow();
  });

  /* ⚠️ COMMENT-STRIPPED — the tombstone trap, hit by this very test's first draft: the hook's
     own history note NAMES the ghost's key, and the guard caught its own note. */
  it("⚠️ the ghost's key is not read — sa.shellSideTucked said 'collapsed' for everyone", () => {
    const code = hookSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toContain("shellSideTucked");
    expect(SIDEBAR_COLLAPSED_KEY).toBe("scriptally:sidebar-collapsed");
  });
});

/* ── the keyboard grammar ── */
describe("keyboard", () => {
  const el = (tag: string, editable = false) => ({ tagName: tag, isContentEditable: editable }) as unknown as EventTarget;
  const key = (over: Partial<Parameters<typeof sidebarShortcut>[0]>) =>
    sidebarShortcut({ key: "[", metaKey: false, ctrlKey: false, altKey: false, target: el("BUTTON"), ...over });

  it("the chord toggles ALWAYS — even from inside a field", () => {
    expect(key({ key: "\\", metaKey: true, target: el("INPUT") })).toBe("toggle");
    expect(key({ key: "\\", ctrlKey: true, target: el("TEXTAREA") })).toBe("toggle");
  });

  it("⚠️ bare [ never fires while typing", () => {
    expect(key({ target: el("INPUT") })).toBe(null);
    expect(key({ target: el("TEXTAREA") })).toBe(null);
    expect(key({ target: el("SELECT") })).toBe(null);
    expect(key({ target: el("DIV", true) })).toBe(null); // contentEditable
    expect(key({})).toBe("toggle"); // …and fires on a non-editable target
  });

  it("a modified [ is someone else's shortcut", () => {
    expect(key({ metaKey: true })).toBe(null);
    expect(key({ ctrlKey: true })).toBe(null);
    expect(key({ altKey: true })).toBe(null);
  });

  it("any other key is ignored", () => {
    expect(key({ key: "k", metaKey: true })).toBe(null);
    expect(key({ key: "]" })).toBe(null);
  });
});

/* ── the render, both states ── */
const ICONS = new Proxy({}, { get: (_, k) => <i data-icon={String(k)} /> }) as Record<string, React.ReactNode>;
const renderShell = (todo: number) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <WorkspaceShell
        sections={workspaceSections({ todo })}
        icons={ICONS}
        onNavigatePath={() => {}}
        onOpenSearch={() => {}}
        onOpenHelp={() => {}}
      >
        <div />
      </WorkspaceShell>
    </MemoryRouter>,
  );

describe("the rendered states", () => {
  /* ⚠️ RETARGETED (ink shell v1): the badge is the SAME terracotta pill in both states — collapsed, CSS
     moves it to the icon's corner — so no count still means no badge at all. */
  /* ⚠️ RETARGETED (sidebar rail v1): the 68px icon rail is retired. The rail is its own layer with its own
     corner badge (`.wsr-ct`), the full sidebar keeps its pill (`.ws-ct`); both layers are mounted, so the
     figure is rendered once in each — and no count still means no badge in either. */
  it("⚠️ the badge is one per layer, so no count still means no badge at all", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      const rail = renderShell(7);
      expect(rail.match(/class="ws-ct"/g)?.length).toBe(1);
      expect(rail.match(/class="wsr-ct"/g)?.length).toBe(1);
      expect(renderShell(0)).not.toMatch(/["\s`]ws-ct["\s`]/);
      expect(renderShell(0)).not.toMatch(/["\s`]wsr-ct["\s`]/);
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  /* ⚠️ RETARGETED (sidebar rail v1): "collapsed" is the rail now — the panel without `sr-wide`, the rail
     layer live and the full layer `inert`, all on the FIRST markup. */
  it("the synchronous read: a stored '1' renders the rail on the FIRST markup, no effect needed", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      const html = renderShell(0);
      expect(html).toContain('id="ws-sidebar"');
      expect(html).not.toContain("sr-wide");
      expect(html).toMatch(/class="ws-pin" inert=""/);
      expect(html).not.toMatch(/class="wsr-host" inert=""/);
      expect(html).toMatch(/class="wsr-tog"[^>]*aria-expanded="false"/);
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  /**
   * ⚠️ THE ACCOUNT ROW (Option D) — the pill is a SIBLING of the row, not a child, and that is the
   * whole budget fix: sharing a line with an ~88px pill left the name about 81px, nine characters.
   * Stacked, the name's box measures 142px (browser-measured; see lib/displayName).
   */
  /* ⚠️ RETARGETED (ink shell v1): the full-width row retires and "Upgrade" folds into the PLAN line —
     the second line, so the name keeps line one's full width (the starvation Option D fixed was the pill
     sharing the NAME's line). The row cost 44px the ink sidebar needs for its feedback card. */
  it("⚠️ Upgrade sits in the plan line, never on the name's line, and the row is gone", () => {
    const html = renderShell(0);
    const name = html.indexOf('class="ws-n"');
    const line = html.indexOf('class="ws-acctline"');
    const link = html.indexOf('class="ws-uplink"');
    expect(name).toBeGreaterThan(-1);
    expect(line).toBeGreaterThan(name);
    expect(link).toBeGreaterThan(line);
    expect(html).not.toContain("ws-upgrow");
    expect(html).not.toContain('class="ws-upg"');
  });

  /* ⚠️ THE PILL IS REMOVED AT 72px, NOT SQUEEZED. Step 0 confirmed upgrade stays reachable from
     the account menu and Settings, so nothing becomes unreachable — and an absent element cannot
     leave the stray border a zeroed pill used to. */
  /* ⚠️ RETARGETED (sidebar rail v1): the rail draws no Upgrade link — only the avatar. The full sidebar's
     plan line keeps its link, in the layer that is `inert` while the rail shows. */
  it("⚠️ the rail renders no Upgrade link; the full sidebar keeps it", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      const html = renderShell(0);
      expect(html).not.toContain("ws-upgrow");
      const rail = html.slice(html.indexOf('class="wsr"'), html.indexOf('class="ws-pin"'));
      expect(html.indexOf('class="wsr"'), "the rail layer").toBeGreaterThan(-1);
      expect(rail).not.toContain("ws-uplink");
      expect(rail).not.toContain(">Upgrade<");
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  /* ⚠️ RETARGETED (sidebar rail v1): the state is RAIL · FLOAT · PINNED under its own key; a stored pin
     renders the full sidebar on the first markup, and its close control reads expanded. */
  it("pinned: the full sidebar on the first markup, its close control reads expanded, controls the panel by id", () => {
    localStorage.setItem("scriptally:sidebar-pinned", "1");
    try {
      const html = renderShell(0);
      expect(html).not.toContain("sb-collapsed");
      expect(html).toContain("sr-wide");
      expect(html).toContain('aria-controls="ws-sidebar"');
      expect(html).toMatch(/aria-expanded="true"[^>]*aria-controls="ws-sidebar"[^>]*aria-keyshortcuts="BracketLeft Meta\+Backslash Control\+Backslash"[^>]*aria-label="Close sidebar"/);
      expect(html).toMatch(/class="ws-pinbtn"[^>]*aria-pressed="true"/);
      expect(html).toContain('aria-label="Main"');
    } finally {
      localStorage.removeItem("scriptally:sidebar-pinned");
    }
  });
});

/* ── source properties whose regression would be silent ── */
describe("the properties", () => {
  it("⚠️ the initialiser reads storage SYNCHRONOUSLY — an effect-read snaps shut after paint", () => {
    expect(hookSrc).toContain("useState<boolean>(() =>\n    readSidebarCollapsed(");
  });

  it("⚠️ sb-ready arrives by DOUBLE rAF — one can land inside the hydration frame", () => {
    expect(hookSrc).toContain("requestAnimationFrame(() => {");
    expect(hookSrc).toContain("requestAnimationFrame(() => setReady(true))");
  });

  /**
   * ⚠️ THE EXPANDED WIDTH HAS ~9px OF HEADROOM ON ITS LONGEST LABEL, and a label that outgrows its
   * row CLIPS SILENTLY (`.ws-lbl` is overflow:hidden + nowrap) — no wrap, no overflow, just a
   * quietly truncated word. Browser-measured at 224px: "Submission packages" 148 into 157.
   *
   * Node cannot measure text, so this guards the ARITHMETIC either side of it instead: the width
   * token, and the fixed chrome eating into the row (panel padding, row padding, icon, label
   * margin). If any of those moves, the headroom moved with it and someone must re-measure —
   * which is what the failure message says.
   */
  /* ⚠️ RETARGETED FOR APP SHELL v3 (26 Sep). The budget's terms all moved — width 224 → 248
     (`--shell-side-w`), panel padding 0/10 → 16/14/12, row padding 0/10 → 6/10, icon 17 → 16, the face
     Source Sans → Source Serif 4 — so the old 9px figure describes nothing. The RENDERED claim now
     lives in tests/e2e/shellV3.measure.ts ("L8 geometry · 1280 no horizontal clip"), which reads every
     label's scrollWidth against its box at 1280 with the web fonts loaded; this pins the arithmetic
     either side of that measurement, so a term that moves still says "re-measure". */
  it("⚠️ the label budget's terms are the v3 ones — re-measure (shellV3 L8) if any moves", () => {
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx, "panel width changed → re-measure the longest label").toContain("--shell-side-w: 248px");
    expect(idx, "the old name is an alias of the new width, never a second number").toContain("--shell-panelw: var(--shell-side-w)");
    const pin = cssRules.slice(cssRules.indexOf(".ws-pin {"));
    expect(pin.slice(0, pin.indexOf("}")), "panel padding is a term in the budget").toContain("padding: 16px 14px 12px");
    const ni = cssRules.slice(cssRules.indexOf(".ws-ni {"));
    /* sidebar metrics pass: the row is a fixed 32px with `padding: 0 10px` (was 6px 10px). Only the
       VERTICAL half moved; the budget is horizontal, so its 10px term is unchanged. */
    expect(ni.slice(0, ni.indexOf("}")), "row padding is a term").toContain("padding: 0 10px");
    expect(cssRules, "the icon's box is a term").toContain(".ws-ic svg { width: 16px; height: 16px");
    expect(cssRules, "the label's own margin is a term").toContain(".ws-lbl { display: inline-block; margin-left: 10px");
  });

  /* ⚠️ RETARGETED (sidebar rail v1): there is no collapsing label any more — the rail and the full sidebar
     are two layers that cross-fade by OPACITY, and the hidden one is `inert`. What this lock still holds:
     the retired `.sb-collapsed` rules are gone, and neither layer is hidden by `display`. */
  it("⚠️ the layers cross-fade by opacity, never display — and the old collapse rules are gone", () => {
    expect(cssRules).not.toContain(".sb-collapsed");
    const ink = readFileSync(resolve(__dirname, "./inkShell.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const at = ink.indexOf(".ws-panel > .ws-pin");
    expect(at, "the full layer's rule").toBeGreaterThan(-1);
    const rule = ink.slice(at, ink.indexOf("}", at));
    expect(rule).toContain("opacity: 0");
    expect(rule).not.toContain("display");
    const wide = ink.indexOf(".ws-panel.sr-wide .wsr");
    expect(wide, "the rail layer's hidden rule").toBeGreaterThan(-1);
    expect(ink.slice(wide, ink.indexOf("}", wide))).not.toContain("display");
  });

  it("⚠️ no transform anywhere in the collapse section's transitions — blend isolation", () => {
    const at = cssRules.indexOf(".ws-panel:not(.sb-ready)");
    expect(at).toBeGreaterThan(-1);
    const section = cssRules.slice(at, cssRules.indexOf("prefers-reduced-motion", at));
    const transitions = section.match(/transition:[^;]+/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) expect(t).not.toContain("transform");
  });

  it("⚠️ reduced motion: the width change is instant — the sheet's last-in-file blanket covers it", () => {
    const at = cssRules.lastIndexOf("prefers-reduced-motion");
    expect(at).toBeGreaterThan(cssRules.indexOf(".ws-panel:not(.sb-ready)")); // the blanket outranks the pack's rules
    expect(cssRules.slice(at)).toContain("transition-duration: 0.01ms !important");
  });

  it("the tooltip is portalled through DeskTooltip — never a ::after on a row", () => {
    expect(shellSrc).toContain('side="right" variant="rail"');
    expect(cssRules).not.toMatch(/\.ws-ni::?after[^{]*\{[^}]*content/);
  });

  /**
   * ⚠️ THE ROW SHOWS THE FORMATTED NAME; THE TOOLTIP SHOWS THE WHOLE ONE. Asserted at source
   * because the two only diverge for a name longer than the budget, and this repo's fixture user
   * ("Nick Physick", 12 chars) fits — a static render cannot tell the two apart, so a render test
   * here would pass whichever way it was wired.
   */
  it("⚠️ the account tooltip carries the FULL name, the row the formatted one", () => {
    expect(shellSrc).toContain('<span className="ws-n">{formatSidebarName(name)}</span>');
    expect(shellSrc).toContain("railTipFor(name, plan.label, undefined, 120, true)");
    expect(shellSrc).not.toContain("railTipFor(formatSidebarName(");
  });

  /* ⚠️ AND ITS GATE IS `true`, NOT `sidebar.collapsed` — the one rail tooltip that shows in BOTH
     states, because the name may be shortened or ellipsised even when the sidebar is open. */
  it("⚠️ the account tooltip is not gated on the rail", () => {
    const at = shellSrc.indexOf('className="ws-uacct"');
    expect(at).toBeGreaterThan(-1);
    const row = shellSrc.slice(at, shellSrc.indexOf("</div>", at));
    expect(row).toContain("120, true)");
    expect(row).not.toContain("120, sidebar.collapsed)");
  });

  it("the avatar's initials come from the same module as the name — no local copy", () => {
    expect(shellSrc).toContain("{getInitials(name)}");
    expect(shellSrc).not.toMatch(/const initials = \(n: string\)/);
  });
});

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
  it("⚠️ the badge is the SAME CountChip, so no count still means no badge at all", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      const collapsed = renderShell(7);
      expect(collapsed).toContain("sb-collapsed");
      expect(collapsed.match(/class="sp-ct"/g)?.length).toBe(1);
      expect(renderShell(0)).not.toContain("sp-ct");
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  it("the synchronous read: a stored '1' renders collapsed on the FIRST markup, no effect needed", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      const html = renderShell(0);
      expect(html).toContain('id="ws-sidebar"');
      expect(html).toContain("sb-collapsed");
      expect(html).toContain('aria-expanded="false"');
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  /**
   * ⚠️ THE ACCOUNT ROW (Option D) — the pill is a SIBLING of the row, not a child, and that is the
   * whole budget fix: sharing a line with an ~88px pill left the name about 81px, nine characters.
   * Stacked, the name's box measures 142px (browser-measured; see lib/displayName).
   */
  it("⚠️ the Upgrade pill is stacked BELOW the account row, not inside it", () => {
    const html = renderShell(0);
    const rowAt = html.indexOf('class="ws-uacct"');
    const rowEnds = html.indexOf("</div>", html.indexOf('class="ws-utext"'));
    const pillAt = html.indexOf("ws-upgrow");
    expect(rowAt).toBeGreaterThan(-1);
    expect(pillAt).toBeGreaterThan(rowEnds); // outside the row's markup, not nested in it
    expect(html).not.toContain('class="ws-upg"'); // the inline pill is gone, not restyled
  });

  /* ⚠️ THE PILL IS REMOVED AT 72px, NOT SQUEEZED. Step 0 confirmed upgrade stays reachable from
     the account menu and Settings, so nothing becomes unreachable — and an absent element cannot
     leave the stray border a zeroed pill used to. */
  it("⚠️ collapsed renders no Upgrade pill at all", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    try {
      expect(renderShell(0)).not.toContain("ws-upgrow");
    } finally {
      localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    }
  });

  it("expanded: no collapse class, toggle reads expanded, controls the panel by id", () => {
    const html = renderShell(0);
    expect(html).not.toContain("sb-collapsed");
    expect(html).toContain('aria-controls="ws-sidebar"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-keyshortcuts="Meta+Backslash Control+Backslash BracketLeft"');
    expect(html).toContain('aria-label="Main"');
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
  it("⚠️ the label budget is unchanged — 9px of headroom, re-measure if any term moves", () => {
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx, "panel width changed → re-measure the longest label").toContain("--shell-panelw: 224px");
    const pin = cssRules.slice(cssRules.indexOf(".ws-pin {"));
    expect(pin.slice(0, pin.indexOf("}")), "panel padding is a term in the budget").toContain("padding: 0 10px 10px");
    const ni = cssRules.slice(cssRules.indexOf(".ws-ni {"));
    expect(ni.slice(0, ni.indexOf("}")), "row padding is a term").toContain("padding: 0 10px");
    expect(cssRules, "the icon's box is a term").toContain("width: 17px; height: 17px");
    expect(cssRules, "the label's own margin is a term").toContain(".ws-lbl { display: inline-block; margin-left: 10px");
  });

  it("⚠️ labels collapse by opacity/max-width, NEVER display — they stay in the a11y tree", () => {
    /* ⚠️ ANCHORED ON A RULE, NOT PROSE — "SIDEBAR COLLAPSE" is a comment and cssRules strips
       comments; the first draft anchored there and sliced from -1. */
    const at = cssRules.indexOf(".ws-panel:not(.sb-ready)");
    expect(at).toBeGreaterThan(-1);
    const section = cssRules.slice(at);
    for (const sel of [".ws-lbl", ".ws-glabel", ".ws-utext", ".ws-mstt", ".ws-bwm"]) {
      const i = section.indexOf(`.sb-collapsed ${sel}`);
      if (i === -1) continue; // .ws-bwm's collapse rule lives with the brand block, checked below
      expect(section.slice(i, section.indexOf("}", i)), sel).not.toContain("display: none");
    }
    const bwm = cssRules.indexOf(".sb-collapsed .ws-bwm");
    expect(bwm).toBeGreaterThan(-1);
    expect(cssRules.slice(bwm, cssRules.indexOf("}", bwm))).not.toContain("display");
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

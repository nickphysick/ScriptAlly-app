/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell nav v3, Phase 3 (ref design-refs/shell-nav-v3.html, frame 3) — "Your notes" in the ink account menu, between
 * Task settings and Help centre, going to /your-notes, with the full sidebar link's "{n} new" when replies are unseen;
 * and the guide pill's outline (`.b-guide`: transparent, a cream hairline, the count in terracotta). The pill's
 * computed background on the Contact list and the Query Centre is SNV3-P1 in tests/e2e/shellNavV3.measure.ts.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InkAccountMenu } from "./InkAccountMenu";

const menu = (newReplies = 0, go: (p: string) => () => void = () => () => {}) => (
  <InkAccountMenu name="Isla Morven" email="i@example.com" upgrade={false} pos={{ left: 0, top: 0 }} go={go} onSignOut={() => {}} newReplies={newReplies} />
);
const rows = (h: string) => [...h.matchAll(/<button[^>]*role="menuitem"[^>]*>(?:(?!<\/button>).)*?<span>([^<]+)<\/span>/gs)].map((m) => m[1]);

describe("shell nav v3 — Your notes in the account menu", () => {
  it("SNV3-A1 the row sits between Task settings and Help centre", () => {
    expect(rows(renderToStaticMarkup(menu()))).toEqual(["Settings", "Task settings", "Your notes", "Help centre", "Sign out"]);
  });
  it("SNV3-A2 it goes to /your-notes", () => {
    const went: string[] = [];
    const el = (InkAccountMenu as unknown as { render: (p: unknown, r: unknown) => React.ReactElement }).render(
      { name: "I", upgrade: false, pos: null, go: (p: string) => () => went.push(p), onSignOut: () => {} }, null);
    const find = (n: unknown): React.ReactElement<Record<string, unknown>> | null => {
      if (Array.isArray(n)) { for (const x of n) { const f = find(x); if (f) return f; } return null; }
      if (!n || typeof n !== "object" || !("props" in (n as object))) return null;
      const e = n as React.ReactElement<Record<string, unknown>>;
      if (e.props["data-am"] === "your-notes") return e;
      return find(e.props.children);
    };
    const row = find(el);
    expect(row, "the row").not.toBeNull();
    (row!.props.onClick as () => void)();
    expect(went).toEqual(["/your-notes"]);
  });
  it("SNV3-A3 unseen replies show the sidebar link's \"{n} new\"; none shows nothing", () => {
    expect(renderToStaticMarkup(menu(3))).toMatch(/<span>Your notes<\/span><i class="am-new" data-probe="account-notes-new">3 new<\/i>/);
    expect(renderToStaticMarkup(menu(0))).not.toContain("am-new");
  });
  it("SNV3-A4 the row draws the nav's notes glyph (MessageSquareText, WORKSPACE_ICONS.notes)", () => {
    const shell = readFileSync(resolve(__dirname, "AppShell.tsx"), "utf8");
    expect(shell).toContain("notes: <MessageSquareText ");
    expect(renderToStaticMarkup(menu())).toMatch(/lucide-message-square-text[^>]*>(?:(?!<\/button>).)*<span>Your notes<\/span>/s);
  });
});

describe("shell nav v3 — the guide pill is an outline on the ink (`.b-guide`)", () => {
  const css = readFileSync(resolve(__dirname, "guide/pageChecklist.css"), "utf8");
  const rule = (sel: string) => {
    const m = css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`));
    expect(m, sel).not.toBeNull();
    return m![1];
  };
  it("SNV3-P2 transparent, a cream 22% hairline, cream 90% type; the count in terracotta; no blush", () => {
    const pill = rule(".pck-pill");
    expect(pill).toMatch(/background: transparent;/);
    expect(pill).toMatch(/box-shadow: inset 0 0 0 1px rgba\(var\(--ink-cream-rgb\), 0\.22\);/);
    expect(pill).toMatch(/color: rgba\(var\(--ink-cream-rgb\), 0\.9\);/);
    expect(pill).toMatch(/padding: 0 14px 0 10px;/);
    expect(rule(".pck-pill .pck-pn")).toMatch(/color: var\(--ink-terra\);/);
    expect(css).not.toMatch(/\.pck-pill \{[^}]*#fbeee8/);
  });
});

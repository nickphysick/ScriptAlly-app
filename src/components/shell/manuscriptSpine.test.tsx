/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscript spine v1 — the source-level locks. The rendered page is measured in
 * tests/e2e/manuscriptSpine.measure.ts; these hold what a source read can see: what the rail's BarSwitcher renders
 * for none, one and two manuscripts, where the spine sits in the rail's DOM (which is its tab order), the ref's
 * stylesheet constraints, and that the old collapsed tile is gone.
 *
 * (Rendered with renderToStaticMarkup under `environment: 'node'`: there is no document, so the portalled label
 * renders nothing here and the menu renders inline. The label's content and placement are the e2e's.)
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BarSwitcher } from "./BarSwitcher";
import { ManuscriptStatus, type Manuscript } from "../../types";

const ms = (id: string, title: string, over: Partial<Manuscript> = {}): Manuscript =>
  ({ id, userId: "u", title, genre: "Thriller", wordCount: 50000, status: ManuscriptStatus.QUERYING, logline: "", ...over } as Manuscript);
const rail = (books: Manuscript[]) =>
  renderToStaticMarkup(
    <BarSwitcher placement="rail" manuscripts={books} queries={[]} activeId={books[0]?.id ?? null} onPick={() => {}} onAdd={() => {}} onOpenActive={() => {}} />,
  );
/** The spine's button, as markup. */
const spineBtn = (html: string) => html.match(/<button[^>]*class="ms-spine-btn"[^>]*>/)?.[0] ?? "";
const src = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

describe("MSP-U1 · the rail's spine", () => {
  it("one manuscript: a door, not a menu — no aria-haspopup, no menu rendered", () => {
    const html = rail([ms("a", "Murphy's Day Out")]);
    const b = spineBtn(html);
    expect(b).toContain('data-ms="spine"');
    expect(b).not.toContain("aria-haspopup");
    expect(b).not.toContain("aria-expanded");
    expect(html).not.toContain('role="menu"');
  });
  it("two manuscripts: the spine opens the existing menu", () => {
    const html = rail([ms("a", "Murphy's Day Out"), ms("b", "Harbour of Glass")]);
    const b = spineBtn(html);
    expect(b).toContain('aria-haspopup="menu"');
    expect(b).toContain('aria-expanded="false"');
    expect(html).toContain('role="menu"');
    expect(html).toContain("YOUR MANUSCRIPTS");
  });
  it("named for its book, described by its label, and no native title to double up", () => {
    const b = spineBtn(rail([ms("a", "Murphy's Day Out")]));
    expect(b).toContain('aria-label="Manuscript: Murphy&#x27;s Day Out"');
    expect(b).toMatch(/aria-describedby="ms-spine-label-[^"]+"/);
    expect(b).toContain('aria-keyshortcuts="M"');
    expect(b).not.toMatch(/\stitle="/);
  });
  it("the title is on the cloth; an uploaded cover is not drawn on the rail", () => {
    const html = rail([ms("a", "Murphy's Day Out", { coverUrl: "https://example.test/c.jpg" })]);
    expect(html).toMatch(/<span class="ms-spine-title">Murphy&#x27;s Day Out<\/span>/);
    expect(html).toContain('class="ms-shelf"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("wsr-init");
  });
  it("no manuscript: the empty spine, named Add a manuscript", () => {
    const html = rail([]);
    const b = spineBtn(html);
    expect(b).toContain('data-ms="spine-empty"');
    expect(b).toContain('aria-label="Add a manuscript"');
    expect(html).toContain('class="ms-spine ms-spine--empty"');
  });
});

describe("MSP-U2 · the spine's place in the rail", () => {
  const rail = src("./SidebarRail.tsx");
  it("comes after both navs and before Feedback — the tab order is the visual order", () => {
    const nav = rail.indexOf('<nav className="wsr-nav"');
    const setnav = rail.indexOf('<nav className="wsr-setnav"');
    const sw = rail.indexOf("{switcher}");
    const fb = rail.indexOf("{onFeedback && (");
    for (const [k, v] of Object.entries({ nav, setnav, sw, fb })) expect(v, k).toBeGreaterThan(0);
    expect(nav).toBeLessThan(setnav);
    expect(setnav).toBeLessThan(sw);
    expect(sw).toBeLessThan(fb);
  });
  it("the old slot under the logo is gone, in the markup and the stylesheet", () => {
    expect(rail).not.toContain("wsr-mswrap");
    const css = src("./sidebarRail.css");
    expect(css).not.toContain("wsr-mswrap");
    expect(css).not.toMatch(/\.wsr \.wsr-ms\b/);
  });
  it("the rail mount passes no tile or tooltip props", () => {
    const shell = src("./WorkspaceShell.tsx");
    const mount = shell.slice(shell.indexOf('placement="rail"'), shell.indexOf("/>", shell.indexOf('placement="rail"')));
    expect(mount.length).toBeGreaterThan(20);
    expect(mount).not.toContain("railTileFor");
    expect(mount).not.toContain("railTipProps");
  });
});

describe("MSP-U3 · the stylesheet keeps the brief's constraints", () => {
  const css = src("./manuscriptSpine.css");
  it("no var() inside @keyframes, and no color-mix()", () => {
    const frames = [...css.matchAll(/@keyframes[^{]*\{((?:[^{}]*\{[^}]*\})*)[^}]*\}/g)].map((m) => m[1]);
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) expect(f).not.toContain("var(");
    expect(css).not.toContain("color-mix(");
  });
  it("the ref's tilt, its three triggers, and reduced motion without transition or animation", () => {
    expect(css).toContain("transform: rotate(-7deg) translateY(-3px);");
    expect(css).toContain(".wsr .ms-spine-btn:hover .ms-spine");
    expect(css).toContain(".wsr .ms-spine-btn:focus-visible .ms-spine");
    expect(css).toContain('.wsr .ms-spine-btn[aria-expanded="true"] .ms-spine');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.wsr \.ms-spine \{ transition: none; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.ms-label \{ animation: none; \}/);
  });
});

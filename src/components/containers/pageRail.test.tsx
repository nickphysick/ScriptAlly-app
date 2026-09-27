/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageRail — the shared side panel (page-anatomy-v2 §3). What a unit can prove: the structure, and
 * that the sheet makes it STICKY at 16px, never fixed, 340 wide on the materials tray and lift.
 * Where it lands on a page is measured, not read (tests/e2e/compsMat.measure.ts S3/S4).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PageRail } from "./PageRail";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "pageRail.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  expect(m, `${sel} has no rule`).toBeTruthy();
  return m![1];
};

describe("PageRail", () => {
  it("renders a named aside with the tray first and the body after it", () => {
    const html = renderToStaticMarkup(
      <PageRail label="The Scout, coming soon" className="x-rail" dataAttrs={{ "data-x": "rail" }} tray={<h2>T</h2>} trayClassName="x-tray">
        <p>Body</p>
      </PageRail>,
    );
    expect(html).toMatch(/^<aside class="sa-prail x-rail" aria-label="The Scout, coming soon" data-x="rail">/);
    expect(html.indexOf('class="sa-prail-tray x-tray"')).toBeGreaterThan(-1);
    expect(html.indexOf("sa-prail-tray")).toBeLessThan(html.indexOf("sa-prail-body"));
    expect(html).toContain("<p>Body</p>");
  });

  it("is sticky 16px inside its scroller — never fixed — 340 wide, on the materials tokens", () => {
    const r = rule(".sa-prail");
    expect(r).toMatch(/position:\s*sticky/);
    expect(r).toMatch(/top:\s*16px/);
    expect(r).toMatch(/width:\s*340px/);
    expect(r).toMatch(/box-shadow:\s*var\(--mat-soft\)/);
    expect(css).not.toMatch(/position:\s*fixed/);
    expect(rule(".sa-prail-tray")).toMatch(/background:\s*var\(--mat-tray\)/);
    expect(rule(".sa-prail-body")).toMatch(/overflow:\s*auto/);
  });

  it("derives its cap from the SCROLLER's measured top — never `100vh` minus a constant", () => {
    const src = readFileSync(join(here, "PageRail.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain('closest(".wpg-scroll")');
    expect(src).toMatch(/railHeight\(top \+ RAIL_TOP_GAP, window\.innerHeight\)/);
    expect(src + css).not.toMatch(/100vh/);
  });
});

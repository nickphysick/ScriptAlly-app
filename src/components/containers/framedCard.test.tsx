/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FramedCard's tokens are a documented COPY of the dashboard's card tokens. This asserts the copy
 * against the dashboard's own sheet — never a literal on both sides, which would go green the day
 * both were changed in the same wrong direction, or one was changed and the literal "fixed" to suit.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FramedCard } from "./FramedCard";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const fc = strip(readFileSync(join(process.cwd(), "src/components/containers/framedCard.css"), "utf8"));
const dash = strip(readFileSync(join(process.cwd(), "src/components/dashboard/oneScreen.css"), "utf8"));
const token = (sheet: string, name: string): string => {
  const m = sheet.match(new RegExp(`(?:^|[\\s;{])${name}:\\s*([^;]+);`));
  expect(m, `${name} is not declared`).toBeTruthy();
  return m![1].trim().replace(/\s+/g, " ");
};

describe("FramedCard — the dashboard's card, shared", () => {
  const PAIRS: [string, string][] = [
    ["--fc-card", "--dash-card"], ["--fc-radius", "--dash-radius"], ["--fc-rim", "--dash-rim"],
    ["--fc-frame", "--dash-frame"], ["--fc-frame-radius", "--dash-frame-radius"], ["--fc-shadow", "--dash-shadow"],
    ["--fc-ink", "--dash-ink"], ["--fc-page", "--dash-page"], ["--fc-navy", "--dash-navy"], ["--fc-stone", "--dash-stone"],
  ];
  it("every shared token holds the dashboard's value — read from the dashboard's sheet, not typed here", () => {
    for (const [mine, theirs] of PAIRS) expect(token(fc, mine), `${mine} ≠ ${theirs}`).toBe(token(dash, theirs));
  });
  it("the tokens live at :root, so their scope is an ancestor of every consumer", () => {
    const root = fc.match(/:root\s*\{([^}]*)\}/);
    expect(root, "no :root block").toBeTruthy();
    for (const [mine] of PAIRS) expect(root![1], `${mine} is not in the :root block`).toContain(`${mine}:`);
  });
  it("every var() the sheet READS resolves — to a :root token here, or to a property a rule in this sheet sets", () => {
    const reads = [...fc.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(reads.length).toBeGreaterThan(5);
    for (const r of new Set(reads)) expect(fc, `${r} is read and never declared`).toMatch(new RegExp(`${r}:`));
  });
  it("the frame clips, which is what lets the band take its corners; the card does not", () => {
    const rule = (sel: string) => { const m = fc.match(new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*\\{([^}]*)\\}`)); expect(m, sel).toBeTruthy(); return m![1]; };
    expect(rule(".fc-frame")).toMatch(/overflow:\s*hidden/);
    expect(rule(".fc-card")).not.toMatch(/overflow/);
    expect(rule(".fc-card")).not.toMatch(/border:\s*1px/);
  });
  it("renders rim → frame → band → children, and no band element when none is asked for", () => {
    const withBand = renderToStaticMarkup(<FramedCard probe="x" tone="navy" band={<h3>T</h3>}><p>body</p></FramedCard>);
    expect(withBand).toMatch(/^<div data-qcv="x" class="fc-card fc-card--cq fc-tone--navy"><div class="fc-frame" data-qcv="x-frame"><div class="fc-band" data-qcv="x-band"><h3>T<\/h3><\/div><p>body<\/p><\/div><\/div>$/);
    const bare = renderToStaticMarkup(<FramedCard><p>body</p></FramedCard>);
    expect(bare).not.toMatch(/["\s]fc-band["\s]/);
    const stateBand = renderToStaticMarkup(<FramedCard as="aside" bandFill="var(--state-you)" band="b" />);
    expect(stateBand).toContain("--fc-band:var(--state-you)");
    expect(stateBand.startsWith("<aside")).toBe(true);
  });
});

/**
 * Query Centre v156 §3 — the collapsed header's markup and its wiring. Its moment and its offsets (hidden at the top,
 * shown once the panel has gone, the toolbar meeting it to the pixel) are measured by tests/e2e/qc156.measure.ts V4.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { weekGoal154 } from "../../../lib/qc154goal";
import { QcSlim156 } from "./QcSlim156";

const NOW = Date.UTC(2026, 10, 11, 12);
const at = (m: number, d: number) => Date.UTC(2026, m - 1, d, 10);
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];
const STREAK = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 2), at(11, 3), at(11, 4), at(11, 9), at(11, 10)], WEEKLY3, NOW);
const src = (f: string) => readFileSync(resolve(__dirname, f), "utf8");

describe("the collapsed header", () => {
  it("left: the title and the manuscript; right (v156.1): the flame, the streak, its line and + Log a query — no n of goal, no Record a response", () => {
    const h = renderToStaticMarkup(<QcSlim156 sent={26} ms="Murphy’s Day Out" goal={STREAK} onLog={() => {}} />);
    expect(h).toContain('data-qc156="slim-title">26 queries sent</b>');
    expect(h).toContain('data-qc156="slim-for">for Murphy’s Day Out</i>');
    expect(h).toMatch(/<svg class="qc1561-sfl" viewBox="0 0 24 30" width="17" height="22"/);
    expect(h).toContain('data-qc156="slim-streak">2 week streak</b><em data-qc156="slim-line">1 more this week to keep it going.</em>');
    expect(h).not.toMatch(/ of 3|this week<\/em>|-week streak/);
    expect(h).toContain(">+ Log a query</button>");
    expect(h).not.toContain("Record a response");
  });
  it("no streak: no flame, \"No streak yet\" and its line; no manuscript, no for line", () => {
    const h = renderToStaticMarkup(<QcSlim156 sent={1} ms={null} goal={weekGoal154([at(9, 1)], WEEKLY3, NOW)} onLog={() => {}} />);
    expect(h).not.toContain("qc1561-sfl");
    expect(h).toContain('data-qc156="slim-streak">No streak yet</b><em data-qc156="slim-line">3 this week starts one.</em>');
    expect(h).not.toContain("slim-for");
    expect(h).toContain(">1 query sent</b>");
  });
  it("hidden on first render: inert and aria-hidden, so its button is out of the Tab order", () => {
    const h = renderToStaticMarkup(<QcSlim156 sent={26} ms={null} goal={STREAK} onLog={() => {}} />);
    expect(h).toMatch(/class="qc156-slim"[^>]*inert=""[^>]*aria-hidden="true"/);
    expect(h).not.toContain("data-shown");
  });
  it("the page mounts it first in the page's root, so it is sticky for the whole page", () => {
    const page = src("QcPage151.tsx");
    expect(page).toMatch(/ref=\{rootRef\}>\s*\{\/\*[^]*?\*\/\}\s*\{slim156\}/);
  });
  /* RE-POINTED (Contact list QC layout v1.1): both pages mount the one bar, shell/SlimBar, which calls the shared reader */
  it("the reader is shared: both pages mount shell/SlimBar, which calls shell/slimReveal, with the toolbar strip's 12px", () => {
    expect(src("../../shell/SlimBar.tsx")).toMatch(/useSlimReveal\(ref, \{ header, cover, extra \}\)/);
    expect(src("QcSlim156.tsx")).toMatch(/<SlimBar hook="data-qc156" header=\{header\} cover=\{cover\} extra=\{12\}/);
    const cl = src("../../agents/contact/ContactSlimBar.tsx");
    expect(cl).toMatch(/<SlimBar hook="data-clh2" header=\{header\} cover=\{cover\} extra=\{12\}/);
    expect(cl).not.toMatch(/addEventListener\("scroll"/);
  });
});

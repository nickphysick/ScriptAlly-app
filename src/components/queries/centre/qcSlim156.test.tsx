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
  it("left: the title and the manuscript; right: n of goal this week, the streak and + Log a query — no Record a response", () => {
    const h = renderToStaticMarkup(<QcSlim156 sent={26} ms="Murphy’s Day Out" goal={STREAK} onLog={() => {}} />);
    expect(h).toContain('data-qc156="slim-title">26 queries sent</b>');
    expect(h).toContain('data-qc156="slim-for">for Murphy’s Day Out</i>');
    expect(h).toContain("<b>2 of 3</b><em>this week</em>");
    expect(h).toMatch(/data-qc156="slim-streak"[^>]*>[\s\S]*?<\/svg>2-week streak<\/span>/);
    expect(h).toContain(">+ Log a query</button>");
    expect(h).not.toContain("Record a response");
  });
  it("no streak, no streak item; no manuscript, no for line", () => {
    const h = renderToStaticMarkup(<QcSlim156 sent={1} ms={null} goal={weekGoal154([at(9, 1)], WEEKLY3, NOW)} onLog={() => {}} />);
    expect(h).not.toContain("slim-streak");
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
  it("the reader is the Contact list's, shared: both rows call shell/slimReveal", () => {
    expect(src("QcSlim156.tsx")).toMatch(/useSlimReveal\(ref, \{ header, cover, extra: 12 \}\)/);
    const cl = src("../../agents/contact/ContactSlimRow.tsx");
    expect(cl).toMatch(/useSlimReveal\(ref, \{ header: slimHeader, cover: slimCover \}\)/);
    expect(cl).not.toMatch(/addEventListener\("scroll"/);
  });
});

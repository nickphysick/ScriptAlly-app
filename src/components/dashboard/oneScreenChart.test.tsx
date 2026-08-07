/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the chart card (spec §3–§4; P3). Geometry is pure and tested here; the SVG's rendered
 * behaviour (draw-in, crosshair motion, ResizeObserver) is a browser check, listed in the report.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import {
  chartX, chartY, lineYAtX, OneScreenChart, PADX, READ_MARGIN, snapIdx, STAGE_SHORT, xLabelEvery,
} from "./OneScreenChart";
import { STATUS_ORDER } from "../../lib/statusOrder";

const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
const q = (over: Record<string, unknown>) => ({ id: String(Math.random()), status: QueryStatus.QUERIED, ...over }) as any;

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

const render = (queries: any[]) =>
  renderToStaticMarkup(<OneScreenChart loading={false} queries={queries} agents={[]} now={NOW} />);

/* ── pure geometry ── */

describe("chart geometry", () => {
  it("x spreads the series inside the pads; y maps hi to the top", () => {
    expect(chartX(0, 300, 8)).toBe(PADX);
    expect(chartX(7, 300, 8)).toBe(300 - PADX);
    expect(chartY(10, 200, 0, 10)).toBeLessThan(chartY(0, 200, 0, 10));
  });

  it("snapIdx clamps at both ends — never a bin that is not there", () => {
    expect(snapIdx(-100, 300, 8)).toBe(0);
    expect(snapIdx(9999, 300, 8)).toBe(7);
  });

  it("lineYAtX interpolates linearly between neighbours", () => {
    const ys = [100, 50]; // two points, W chosen so the segment is the whole span
    const midY = lineYAtX(ys, 150, 300);
    expect(midY).toBeCloseTo(75, 0);
  });

  it("the reading zone's grace is the spec's 10px", () => {
    expect(READ_MARGIN).toBe(10);
  });

  it("x labels thin by ceil(len/8)", () => {
    expect(xLabelEvery(8)).toBe(1);
    expect(xLabelEvery(26)).toBe(4);
    expect(xLabelEvery(100)).toBe(13);
  });

  it("⚠️ STAGE_SHORT keys are the EXACT enum strings, one per journey stage", () => {
    for (const s of STATUS_ORDER) expect(STAGE_SHORT[s], String(s)).toBeTruthy();
    expect(STAGE_SHORT[QueryStatus.REVISE_RESUBMIT]).toBe("In revision");
  });
});

/* ── rendered structure ── */

describe("the chart card's structure", () => {
  const twoWeeks = [q({ dateSent: daysAgo(10) }), q({ dateSent: daysAgo(1) })];

  it("is focusable, role=img, with the instructive label and the live region", () => {
    const html = render(twoWeeks);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="img"');
    expect(html).toContain("Use the arrow keys to step through each week.");
    expect(html).toContain('aria-live="polite"');
  });

  it("the range toggle is a group of three; the numbers toggle carries aria-pressed", () => {
    const html = render(twoWeeks);
    expect(html).toContain('aria-label="Chart range"');
    expect(html).toContain("8 weeks");
    expect(html).toContain("6 months");
    expect(html).toContain('aria-pressed="false"');
  });

  it("the ledger table exists with the spec's columns, zeroes as em dashes", () => {
    const html = render(twoWeeks);
    for (const h of ["Week", "Active", "Sent", "Closed", "Net"]) expect(html).toContain(`<th>${h}</th>`);
    expect(html).toContain("—"); // a quiet cell is a dash, never a zero
  });

  it("sparse (<2 weeks) shows the line-begins message and no CHART svg", () => {
    /* the header's table-toggle icon is also an svg — the assertion targets the chart's role=img,
       not the tag name, or it fails on furniture that is meant to stay */
    const html = render([q({ dateSent: daysAgo(1) })]);
    expect(html).toContain("The line begins once you have queried in two separate weeks.");
    expect(html).not.toContain('role="img"');
  });

  it("no data at all is also sparse — never a crash on an empty ledger", () => {
    expect(render([])).toContain("The line begins");
  });
});

/* ── the CSS side of §3–§4 ── */

describe("the chart's stylesheet", () => {
  it("cursor flips across the reading boundary: default at rest, crosshair in the zone", () => {
    expect(cssRules).toContain(".os-chartwrap svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: default; outline: none; }");
    expect(cssRules).toContain(".os-chartwrap svg.reading { cursor: crosshair; }");
  });

  it("the Form 11 frame: parchment rim 5px/13, burgundy 1px frame radius 9, REAL overflow clip", () => {
    const tip = cssRules.slice(cssRules.indexOf(".os-tip {"), cssRules.indexOf(".os-tip.show"));
    expect(tip).toContain("border-radius: 13px");
    expect(tip).toContain("padding: 5px");
    const frame = cssRules.slice(cssRules.indexOf(".os-tip .frame {"), cssRules.indexOf(".os-tip .frame.pinframe"));
    expect(frame).toContain("border: 1px solid #7c3a2a");
    expect(frame).toContain("border-radius: 9px");
    expect(frame).toContain("overflow: hidden");
  });

  it("§4: zero-count stage rows dim to 40%, never omitted", () => {
    expect(cssRules).toContain(".os-tip .srow.dim { opacity: 0.4; }");
  });

  it("the ledger reads as a ledger: Playfair tabular numerals, washed current row, warm hover", () => {
    expect(cssRules).toContain("font-variant-numeric: tabular-nums");
    expect(cssRules).toContain(".os-dtable tr.now td { background: #faf3ea; }");
    expect(cssRules).toContain(".os-dtable tr:hover td { background: #fbf7f0; }");
  });
});

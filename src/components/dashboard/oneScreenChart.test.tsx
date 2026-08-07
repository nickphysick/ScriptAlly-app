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
    expect(html).toContain("Use the arrow keys to step through each point.");
    expect(html).toContain('aria-live="polite"');
  });

  /* ⚠️ THE THREE-PILL RANGE GROUP IS RETIRED (v16 §3) — it spent a pill per range and left no
     room to say anything about GRAIN. Two controls now: a select for grain, a slider for span. */
  it("frequency is a select of three; range is a snapping slider that states its value", () => {
    const html = render(twoWeeks);
    expect(html).toContain('aria-label="Chart frequency"');
    for (const f of ["Daily", "Weekly", "Monthly"]) expect(html).toContain(`>${f}</option>`);
    expect(html).toContain('type="range"');
    expect(html).toContain('aria-label="Chart range"');
    expect(html).toContain('aria-valuetext="Last 8 weeks"'); // the label is the value, spoken
    expect(html).toContain("Last 8 weeks");
    /* ⚠️ the numbers toggle's `aria-pressed` assertion lived here and the control is retired.
       The cover did NOT go with it — the two surviving controls carry the labels asserted above,
       so this component keeps its accessibility check. */
    /* ⚠️ anchor the class, not the stem — "os-rangeslider" contains "os-ranges" and a bare
       substring check passes for the wrong reason (it did, on the first run of this very case) */
    expect(html).not.toContain('class="os-ranges"');
  });

  /* the grain the chart OPENS on was asserted through the ledger's first column; the ledger is
     retired, so it is asserted on the select — the control that now states the grain */
  it("a short record opens DAILY and a long one WEEKLY, and the select says which", () => {
    expect(render(twoWeeks)).toContain('value="daily"');            // 11 days on the record
    expect(render([q({ dateSent: daysAgo(120) }), q({ dateSent: daysAgo(2) })])).toContain('value="weekly"');
  });

  it("sparse (a single point) shows the line-begins message and no CHART svg", () => {
    /* the header's table-toggle icon is also an svg — the assertion targets the chart's role=img,
       not the tag name, or it fails on furniture that is meant to stay */
    /* ⚠️ ONE DAY ON THE RECORD is now the only sparse case. Sent-yesterday gives TWO daily
       points and a real (flat) line — which is the honest picture, and better than telling
       someone with data on the board to come back later. */
    const html = render([q({ dateSent: daysAgo(0) })]);
    /* ⚠️ the message names the GRAIN — at daily the second point arrives the next day, so the
       old unconditional "two separate weeks" was simply false there */
    expect(html).toMatch(/The line begins once there are two (days|weeks|months) on the record\./);
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

  /* ⚠️ THE NUMBERS VIEW IS RETIRED — button, state, markup and CSS. This pins the removal so no
     orphan can drift back; the last removal of this kind left dead `.dtable` rules behind. */
  it("⚠️ no numbers-view remnants: not in the markup, not in the stylesheet", () => {
    const html = render([q({ dateSent: daysAgo(10) }), q({ dateSent: daysAgo(1) })]);
    for (const gone of ["os-tbl", "os-dtable", "Show the numbers"]) {
      expect(html, gone).not.toContain(gone);
      expect(cssRules, gone).not.toContain(gone);
    }
    const src = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).not.toContain("tableOn");
  });
});

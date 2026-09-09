/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the chart card (spec §3–§4; P3). Geometry is pure and tested here; the SVG's rendered
 * behaviour (draw-in, crosshair motion, ResizeObserver) is a browser check, listed in the report.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BAND_KEYS, BAND_LABEL } from "../../lib/chartBands";
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
  it("frequency is a select of three; range is a snapping BRUSH that states its value", () => {
    const html = render(twoWeeks);
    expect(html).toContain('aria-label="Chart frequency"');
    for (const f of ["Daily", "Weekly", "Monthly"]) expect(html).toContain(`>${f}</option>`);
    expect(html).toContain('type="range"');
    /* ⚠️ THE RANGE IS IN WEEKS NOW (v26) — the input carries 4-12 directly instead of a 0-100
       percentage, so its thumb and the drawn handle read the SAME number. Two mirrored expressions
       for one position is exactly how the brush came to be inverted. */
    expect(html).toContain('aria-label="Chart range in weeks"');
    expect(html).toContain('aria-valuetext="Last 8 weeks"'); // the label is the value, spoken
    expect(html).toContain("Last 8 weeks");
    /* ⚠️ the numbers toggle's `aria-pressed` assertion lived here and the control is retired.
       The cover did NOT go with it — the two surviving controls carry the labels asserted above,
       so this component keeps its accessibility check. */
    /* ⚠️ RETARGETED (Phase 4): the slider is a BRUSH — a thumbnail of the record with the excluded
       span shaded — and the real `input[type=range]` is laid over it, which is why every assertion
       above survives untouched. The control's keyboard, its snapping and its spoken value are the
       same control; only the picture behind it changed. */
    expect(html).toContain('class="os-brush"');
    expect(html).not.toContain('class="os-rangeslider"');
    expect(html).not.toContain('class="os-rangecap"');
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

/* ══ §4 · THE THREE BANDS (dashboard redesign, Phase 4) ══════════════════════════════════════ */

describe("the bands are drawn from the shared state colours, and there are three", () => {
  /* ⚠️ ITS OWN FIXTURE. `twoWeeks` is scoped to another describe, and reaching for a name that
     happens to be in the file is how a case comes to measure a set nobody chose for it. */
  const spread = [
    q({ dateSent: daysAgo(40) }),
    q({ status: QueryStatus.PARTIAL_REQUESTED, dateSent: daysAgo(35), partialRequestedDate: daysAgo(9) }),
    q({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(30), fullRequestedDate: daysAgo(18), fullSentDate: daysAgo(6) }),
  ];
  const chart = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /* ⚠️ THE FILLS COME FROM `STATE_TOKEN`, NEVER A LOCAL TABLE. These are the locked v2 state
     colours the Query Centre's cards and the To-do ticket's edge already read; a fourth copy of
     four hexes is how a page comes to be nearly the right colour. */
  it("⚠️ every band fill is STATE_TOKEN — no hex is restated in the component", () => {
    expect(chart).toContain('from "../../lib/queryCardFacts"');
    expect(chart).toContain("STATE_TOKEN[a.key]");
    for (const hex of ["#f7efe3", "#e0e5dd", "#f5e6df", "#d7e0e8"]) {
      expect(chart, `${hex} is restated in the component`).not.toContain(hex);
    }
  });

  /**
   * ⚠️ THREE BANDS, AND THE FOURTH HAS NOW BEEN BUILT TWICE AND CUT TWICE — which is why this
   * asserts its ABSENCE rather than saying nothing about it.
   *
   * It was drawn for the queries `bandsAt` cannot place: a query whose current state and last dated
   * rung are in different bands, so a full went out, the answer was Revise & Resubmit, and nothing
   * dated the turn. Drawing them in the offer colour closed the gap between the line and the top of
   * the stack, which was a real improvement on leaving clear air there — and the design does not
   * have a fourth band, so the honest close is the other one: the line is the three bands' SUM and
   * an unplaceable query is not on the chart at all.
   *
   * ⚠️ THE COST IS REAL AND IS NOT HIDDEN. `undatedNow` still derives the figure. What must not
   * happen is a fourth fill appearing without a fourth name beside it, or a line that counts
   * something it does not draw.
   */
  /* ⚠️ RETARGETED OFF THE LEGEND, WHICH WAS A PROXY AND HAS NOW GONE (v26, Phase 5). This counted
     LEGEND SWATCHES to prove there were three bands — so when the legend was removed the count went
     to zero and the case failed for a reason that has nothing to do with bands. Worse, it would
     have gone green on a chart that drew four bands and named three. The bands themselves are what
     the claim is about, so the bands are what it counts now: `.os-band` paths in the plot. */
  it("⚠️ no fourth band, in either data state — the line is the three bands' sum", () => {
    /* ⚠️ ASSERTED ON THE VOCABULARY, NOT ON RENDERED PATHS. This repo's specs render to a STRING
       and there is no DOM, so the plot's `.os-band` paths — whose geometry comes from a measured
       width — never appear here at all. Counting them would be a check that reads 0 forever and
       passes only because 0 was written into the expectation. `BAND_KEYS` is what the chart draws
       from and what a fourth band would have to join. */
    expect(BAND_KEYS).toHaveLength(3);
    expect(BAND_KEYS).not.toContain("offer");
    const plain = render(spread);
    expect(plain).not.toContain("--state-offer");
    /* the case that USED to produce one: an R&R after a full went out, with no date on the turn */
    const withResidual = render([...spread, q({
      status: QueryStatus.REVISE_RESUBMIT, dateSent: daysAgo(40),
      fullRequestedDate: daysAgo(20), fullSentDate: daysAgo(10),
    })]);
    expect(withResidual).not.toContain("--state-offer");
  });

  /* ⚠️ THE LEGEND IS REMOVED (v26, Phase 5) AND THIS CASE NOW ASSERTS ITS ABSENCE — plus the half
     of its old claim that survives the removal. Four swatches under a chart whose bands are already
     named where the reader is looking (the tooltip on hover, the strip on every bubble) cost 39.6px
     at every width, which was the whole of the top row's overshoot.
     ⚠️ THE NAMES ARE STILL ASSERTED, because they did not go with the legend — `BAND_LABEL` still
     writes them into the tooltip, and "OVER TO YOU" rather than "Your move" is still the law: a
     legend names a category, and "Your move" is the imperative the app uses beside an action. */
  it("the legend is gone, and the band names it used to carry are still the tooltip's", () => {
    const html = render(spread);
    expect(html).not.toContain('class="os-bandkey"');
    expect(html).not.toContain('class="os-bk"');
    /* ⚠️ THE NAMES MOVED, THEY DID NOT GO. They were only in the rendered markup BECAUSE the legend
       printed them; the tooltip that carries them now renders on hover, which a string render never
       reaches. `BAND_LABEL` is where they live, and it is the artefact the claim is about. */
    expect(Object.values(BAND_LABEL)).toEqual(
      expect.arrayContaining(["Awaiting first response", "Material with the agent", "Over to you"]),
    );
    expect(Object.values(BAND_LABEL)).not.toContain("Your move");
    expect(BAND_KEYS).toHaveLength(3);
  });

  /* ⚠️ THE PANEL'S STATUS ROWS RENDER THE COMPONENT, never a local circle. `StatusDot` is the app's
     one drawing of a query status and this pack's global rule forbids a second. */
  it("⚠️ the hover panel's status rows are StatusDot, by import", () => {
    expect(chart).toContain('import { StatusDot }');
    expect(chart).toContain("<StatusDot status={s.status}");
    /* the band rows are a SWATCH and deliberately not a dot — a band is not a status */
    expect(chart).toContain('className="bsw"');
  });

  /* ⚠️ TWO BLOCKS, AND WHICH ONE APPEARS IS A STATEMENT ABOUT WHAT IS KNOWN — the per-status list
     only on the final point, where a status is known rather than reconstructed. */
  it("⚠️ the panel says 'By whose turn' on a past point and 'Where they stand today' on the last", () => {
    /* ⚠️ THE CAPTIONS ARE JSX TEXT NODES, NOT QUOTED STRINGS — asserted as they are written. The
       first draft of this case looked for `"Where they stand today"` with its quotes and failed
       against a component that says exactly that, which is the wrong-artefact fault in miniature. */
    expect(chart).toContain(">Where they stand today<");
    expect(chart).toContain(">By whose turn<");
    expect(chart).toContain("focusIdx === lastIdx ?");
    /* the old caption pair is gone — "Where they stand" and "…today" said one thing twice */
    expect(chart).not.toContain(">Where they stand<");
  });
});

describe("the chart's stylesheet", () => {
  it("cursor flips across the reading boundary: default at rest, crosshair in the zone", () => {
    expect(cssRules).toContain(".os-chartwrap svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: default; outline: none; }");
    expect(cssRules).toContain(".os-chartwrap svg.reading { cursor: crosshair; }");
  });

  it("the Form 11 frame: parchment rim 5px/13, burgundy 1px frame radius 9, REAL overflow clip", () => {
    const tip = sliceBetween(cssRules, ".os-tip {", ".os-tip.show");
    expect(tip).toContain("border-radius: 13px");
    expect(tip).toContain("padding: 5px");
    const frame = sliceBetween(cssRules, ".os-tip .frame {", ".os-tip .frame.pinframe");
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

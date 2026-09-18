/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The active-queries chart card (dashboard stage 3, 17 Sep; v16, 18 Sep) — its header, its one grain,
 * its states, and the retirement of everything the previous charts carried.
 *
 * ⚠️ REWRITTEN, NOT RETARGETED. The previous file locked the stacked bands, the brush, the hover panel
 * and the reading zone — a chart that no longer exists — and it stopped loading the moment `chartBands`
 * was deleted. What that chart's locks guarded that still has a subject is carried here: the plot is
 * the ledger's, the grain opens on the record's own scale, and a single point says how the line begins.
 *
 * ⚠️ THIS FILE RENDERS WITHOUT LAYOUT (`environment: node`), so the plot is never measured here and the
 * svg carries no paths. The drawn geometry — the line, the fade, the dots on the curve — is locked in
 * `src/lib/dashChart.test.ts` against the path string itself, and measured in the browser by
 * `tests/e2e/dashStages.measure.ts`.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, type Query } from "../../types";
import { OneScreenChart } from "./OneScreenChart";
import { CHART_GRAIN } from "../../lib/dashChart";
import { cssRule, cssRuleCount } from "../../test/cssRule";
import { sliceBetween } from "../../test/sliceBetween";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const q = (status: QueryStatus, dateSent: string | undefined): Query =>
  ({ id: `h${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent } as unknown as Query);

const LONG = Array.from({ length: 30 }, (_, i) => q(QueryStatus.QUERIED, ago(i * 9)));
const chart = (over: Partial<React.ComponentProps<typeof OneScreenChart>> = {}) => renderToStaticMarkup(
  <OneScreenChart loading={false} queries={LONG} activities={[]} activeCount={30} now={NOW} {...over} />,
);

const src = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => cssRule(css, sel, "oneScreen.css");

describe("the header", () => {
  /**
   * ⚠️ THE HAWK IS GONE AND THE ROW IS STILL A ROW (Nick, 18 Sep). The picture came off with v16 and
   * the header keeps `.os-acid`, so a 96px slot can return beside the count without a relayout —
   * `lib/dashArt` still carries the file for exactly that. The slot being EMPTY is the claim; a
   * `.os-acart` back in this header is the hawk returning without the decision being taken again.
   */
  it("the title and its mono eyebrow, in the row the picture will come back to", () => {
    const html = chart();
    const head = sliceBetween(html, 'data-probe="chart-header"', 'class="os-aclegend"', "the chart's header");
    expect(head).toContain('<div class="os-acid">');
    expect(head).toContain('<h3 class="os-cardttl" data-probe-text="chart-title">Active queries</h3>');
    expect(head, "the hawk is back in the header").not.toContain("<img");
    expect(head).not.toContain("os-acart");
    const eyebrow = sliceBetween(head, 'data-probe-text="chart-eyebrow">', "</p>", "the eyebrow")
      .replace('data-probe-text="chart-eyebrow">', "").replace(/<[^>]+>/g, "");
    expect(eyebrow).toMatch(/^\d+ out with agents · (↑ \d+|↓ \d+|Level) over 8 weeks$/);
  });

  /* the figure is handed down — it is the header's own count, so the two cannot disagree */
  it("⚠️ the figure is the one it is handed — the chart derives no count of its own", () => {
    expect(chart({ activeCount: 12 })).toContain("12 out with agents");
    expect(code).not.toContain("liveCount");
    expect(code).not.toContain("dashBreakdown");
  });

  /**
   * ⚠️ ONE GRAIN, STATED RATHER THAN OFFERED (Nick, 18 Sep). The Daily/Monthly toggle is retired:
   * a control that opens onto a single choice teaches a reader that the app is broken. So the chip
   * is a SPAN — there is no button to press and none to forget to disable — and the two retired
   * grains may not be named anywhere in the card.
   */
  it("one grain, stated in a chip, with no control behind it", () => {
    const html = chart();
    expect(CHART_GRAIN).toBe("weekly");
    const head = sliceBetween(html, 'data-probe="chart-header"', 'class="os-aclegend"', "the chart's header");
    expect(head).toContain('<span class="os-mini" data-probe="chart-controls">Weekly</span>');
    expect(head).not.toContain("<button");
    expect(head).not.toMatch(/Daily|Monthly/);
    expect(code).not.toContain("aria-pressed");
  });

  /* ⚠️ THE LEGEND IS THE REF'S THREE, IN THE REF'S ORDER, and it is decorative: the plot's own
     `aria-label` is what a screen reader is given. */
  it("the legend names the line and the two kinds of dot", () => {
    const legend = sliceBetween(chart(), 'class="os-aclegend" aria-hidden="true"', 'class="os-acbody"', "the legend");
    expect([...legend.matchAll(/os-aclgd--(\w+)/g)].map((m) => m[1])).toEqual(["active", "request", "pass"]);
    for (const w of [">Active<", ">Request<", ">Pass<"]) expect(legend).toContain(w);
  });

  /* ⚠️ NEVER A NUMBER THAT MIGHT CHANGE (Nick) — the words stay, the figures wait */
  it("⚠️ while loading: the title, and no eyebrow at all", () => {
    const html = chart({ loading: true, activeCount: null });
    expect(html).toContain('data-probe-text="chart-eyebrow"></p>');
    expect(html).toContain(">Active queries<");
    expect(html, "a figure while the data is out").not.toMatch(/\d+ out with agents/);
  });
});

describe("the plot", () => {
  it("carries what it drew, for the harness, and says it in words for a screen reader", () => {
    const html = chart();
    const m = /data-series="([^"]+)"/.exec(html);
    expect(m, "the plot must render").not.toBeNull();
    const series = JSON.parse(m![1].replace(/&quot;/g, '"'));
    expect(Object.keys(series).sort()).toEqual(["dots", "every", "lab", "v"]);
    expect(series.v.length).toBeGreaterThan(1);
    expect(series.lab).toHaveLength(series.v.length);
    expect(html).toMatch(new RegExp(`role="img" aria-label="Active queries over the last 8 weeks: ${series.v[0]} to ${series.v[series.v.length - 1]}\\."`));
  });

  it("a single point says how the line begins, and draws no plot", () => {
    const html = chart({ queries: [q(QueryStatus.QUERIED, NOW.toISOString())], activeCount: 1 });
    expect(html).toContain("The line begins once there are two weeks on the record.");
    expect(html).not.toContain('data-probe="plot"');
  });

  it("the drawing is the ref's: a navy line at 2.6, round, over a navy fade; a hollow first dot and a solid last", () => {
    expect(code).toMatch(/className="os-acline"[^>]*stroke="#2a3a52" strokeWidth=\{2\.6\} strokeLinecap="round" strokeLinejoin="round"/);
    expect(code).toMatch(/<stop offset="0" stopColor="#2a3a52" stopOpacity="0\.22" \/>/);
    expect(code).toMatch(/<stop offset="1" stopColor="#2a3a52" stopOpacity="0" \/>/);
    expect(code).toMatch(/className="os-acfirst"[^>]*fill="#ffffff" stroke="#2a3a52"/);
    expect(code).toMatch(/className="os-aclast"[^>]*fill="#2a3a52"/);
    expect(code).toContain("geo.gridY.map(");
    /* ⚠️ THE REF'S OWN NO-OP PAIR, AND THEY ARE THE GUARANTEE RATHER THAN THE EFFECT. The viewBox
       always equals the measured box, so neither does anything today; they are what stops the stroke
       thickening and the drawing distorting the day the two stop agreeing. */
    expect(code).toContain('preserveAspectRatio="none"');
    expect(code).toContain('vectorEffect="non-scaling-stroke"');
    /* the ref's hatch under the fade — at its RENDERED density, not its viewBox numbers */
    expect(code).toMatch(/<pattern id="os-acbars" width="4"/);
  });

  it("the empty account sees the example, with its one control — never a chart of nothing", () => {
    const html = chart({ queries: [], activeCount: 0, empty: true });
    expect(html).toContain('data-probe="chart-empty"');
    expect(html).not.toContain('data-probe="plot"');
    expect(html.match(/<button/g) ?? []).toHaveLength(1);
  });
});

describe("⚠️ the previous chart is retired, rule and element together", () => {
  it("no bands, no brush, no readout, no draw-in, no mark in the component", () => {
    for (const gone of ["chartBands", "useCountUp", "os-band", "os-brush", 'type="range"', "os-tip",
                        "onPointerMove", "onMouseMove", "tabIndex", "strokeDashoffset", "OneScreenMark",
                        "os-bandkey", "os-chartwrap", "os-freqchips",
                        /* v16: the grain toggle, the hawk and the big figure */
                        "os-actog", "os-acart", "os-acn", "os-acttl", "os-acdelta", "CHART_FREQS",
                        "ACTIVE_QUERY_ART", "useState<Freq"]) {
      expect(code, gone).not.toContain(gone);
    }
  });

  it("…and none of their rules survive in the sheet", () => {
    for (const sel of [".os-chartwrap", ".os-brush", ".os-bw", ".os-tip", ".os-bandkey", ".os-bk", ".os-freqchips",
                       ".os-ctrls", ".os-rangelbl", ".os-stat", ".os-statxt", ".os-delta", ".os-xlabels", ".os-ylab",
                       ".os-pin", ".os-sr", ".os-chip", ".os-dayone",
                       ".os-actog", ".os-acart", ".os-acn", ".os-acttl", ".os-acdelta", ".os-acdc",
                       ".os-acrow"]) {
      expect(cssRuleCount(css, sel), sel).toBe(0);
    }
    expect(css).not.toMatch(/stroke-dashoffset/);
    expect(css).not.toContain(".os-tip ");
  });
});

describe("the chart's rules", () => {
  /**
   * ⚠️ THE MOUNT IS TWO BOXES, AND THAT IS THE REF'S CONSTRUCTION RATHER THAN A CARD WITH A BORDER:
   * a parchment rim (the card itself, its own padding replaced) holding a real frame — a 1px rust
   * line at 11px radius on white. The card's padding is REPLACED here rather than overridden per
   * child, so nothing inside the frame has to know it is inside a rim.
   */
  it("the mount: a parchment rim, a rust frame, and the card's own padding replaced", () => {
    const lead = rule(".os-lead");
    expect(lead).toContain("padding: 6px");
    expect(lead).toContain("background: var(--dash-parchment)");
    expect(lead).toContain("border-radius: 16px");
    expect(lead).toContain("border: 0");
    const frame = rule(".os-acframe");
    expect(frame).toContain("border: 1px solid var(--dash-frame)");
    expect(frame).toContain("border-radius: 11px");
    expect(frame).toContain("background: var(--dash-card)");
    expect(frame).toContain("padding: 18px 22px 16px");
    /* and it is a flex column that can be squeezed — the plot's `min-height` is the floor */
    expect(frame).toContain("min-height: 0");
  });

  it("the header: top-aligned, the two groups apart, and the picture's slot still a row", () => {
    const h = rule(".os-achead");
    for (const d of ["align-items: flex-start", "justify-content: space-between"]) expect(h, d).toContain(d);
    const id = rule(".os-acid");
    expect(id, "the picture's slot must stay a flex row").toContain("display: flex");
    expect(id).toContain("align-items: center");
    expect(id).toContain("gap: 14px");
  });

  it("the legend: three dots in the state papers, the line's own navy first", () => {
    expect(rule(".os-aclegend")).toContain("display: flex");
    expect(rule(".os-aclgd--active")).toContain("background: var(--dash-navy)");
    expect(rule(".os-aclgd--request")).toContain("background: var(--dash-rose)");
    expect(rule(".os-aclgd--pass")).toContain("background: var(--dash-stone)");
  });

  it("⚠️ the svg is absolute in its box, so it can never hold the track open", () => {
    const s = rule(".os-acplot > svg");
    expect(s).toContain("position: absolute");
    expect(s).toContain("inset: 0");
    const p = rule(".os-acplot");
    expect(p).toContain("flex: 1 1 auto");
    expect(p).toMatch(/min-height:\s*150px/);
  });

  it("the event dots wear the state papers — rose with a rust heart, stone with a muted one — on a white ring", () => {
    expect(rule(".os-acev > circle:first-child")).toContain("stroke: #ffffff");
    expect(rule(".os-acev--request > circle:first-child")).toContain("fill: var(--dash-rose)");
    expect(rule(".os-acev--request > .os-acevc")).toContain("fill: var(--dash-rust)");
    expect(rule(".os-acev--pass > circle:first-child")).toContain("fill: var(--dash-stone)");
    expect(code).toMatch(/<circle cx=\{d\.x\.toFixed\(1\)\} cy=\{d\.y\.toFixed\(1\)\} r=\{7\} strokeWidth=\{2\.5\} \/>/);
  });

  /**
   * ⚠️ ONE SLOT PER WEEK, AND THE TICK HANGS OFF THE SLOT. The ref draws a 4px rounded tick under
   * every week and turns it rose on a week a request came in. As the slot's own `::before` it cannot
   * drift from the label it belongs to — and a THINNED label (at 1280 nine dates will not fit)
   * leaves its tick behind, which is the whole reason the axis is slots rather than labels.
   */
  it("the axis is a flex slot per week, each carrying its own tick", () => {
    const x = rule(".os-acx");
    expect(x).toContain("display: flex");
    expect(x).toContain('font-family: "JetBrains Mono", monospace');
    const slot = rule(".os-acx span");
    expect(slot).toContain("flex: 1");
    expect(slot).toContain("text-align: center");
    expect(slot).toContain("position: relative");
    const tick = cssRule(css, ".os-acx span::before", "oneScreen.css");
    expect(tick).toContain("height: 4px");
    expect(tick).toContain("border-radius: 2px");
    expect(tick).toContain("background: var(--dash-stone)");
    expect(cssRule(css, ".os-acx span.hot::before", "oneScreen.css")).toContain("background: var(--dash-rose)");
    /* the retired absolutely-placed labels are gone with the axis that placed them */
    expect(cssRuleCount(css, ".os-acx span.first")).toBe(0);
    expect(cssRuleCount(css, ".os-acx span.last")).toBe(0);
  });
});

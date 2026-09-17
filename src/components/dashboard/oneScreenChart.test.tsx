/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The active-queries chart card (dashboard stage 3, 17 Sep) — its header, its grains, its states, and
 * the retirement of everything the previous chart carried.
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
import { OneScreenChart, CHART_FREQS } from "./OneScreenChart";
import { ACTIVE_QUERY_ART } from "../../lib/dashArt";
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
  it("the hawk, the live figure beside its words, and the caption beneath", () => {
    const html = chart();
    const head = sliceBetween(html, 'data-probe="chart-header"', 'class="os-acbody"', "the chart's header");
    expect(head).toContain(`src="${ACTIVE_QUERY_ART.src}?v=${ACTIVE_QUERY_ART.version}"`);
    expect(head).toMatch(/<img class="os-acart"[^>]*alt=""[^>]*data-probe="chart-illustration"/);
    expect(head).toContain('<span class="os-acn" data-probe-text="chart-figure">30</span>');
    expect(head).toContain('<span class="os-acttl" data-probe-text="chart-title">active queries</span>');
    const caption = sliceBetween(head, 'data-probe-text="chart-caption">', "</span></span>", "the caption")
      .slice('data-probe-text="chart-caption">'.length).replace(/<[^>]+>/g, "");
    expect(caption).toMatch(/^(↑ \d+|↓ \d+|Level) over 8 weeks · \d+ repl(y|ies)$/);
  });

  /* the figure is handed down — it is the header's own count, so the two cannot disagree */
  it("⚠️ the figure is the one it is handed — the chart derives no count of its own", () => {
    expect(chart({ activeCount: 12 })).toContain('data-probe-text="chart-figure">12<');
    expect(code).not.toContain("liveCount");
    expect(code).not.toContain("dashBreakdown");
  });

  it("three grains, one pressed, in a labelled group", () => {
    const html = chart();
    expect(CHART_FREQS).toEqual(["daily", "weekly", "monthly"]);
    const group = sliceBetween(html, 'role="group" aria-label="Chart frequency"', "</div>", "the toggle");
    expect(group.match(/<button/g) ?? []).toHaveLength(3);
    expect(group.match(/aria-pressed="true"/g) ?? []).toHaveLength(1);
    for (const w of [">Daily<", ">Weekly<", ">Monthly<"]) expect(group).toContain(w);
  });

  /* ⚠️ A NEW ACCOUNT OPENS ON DAILY — under a month of record makes a two-point weekly line */
  it("a short record opens on Daily, a long one on Weekly", () => {
    const pressed = (html: string) => /<button type="button" class="on" aria-pressed="true">(\w+)</.exec(html)?.[1];
    expect(pressed(chart({ queries: [q(QueryStatus.QUERIED, ago(6)), q(QueryStatus.QUERIED, ago(2))] }))).toBe("Daily");
    expect(pressed(chart())).toBe("Weekly");
  });

  /* ⚠️ NEVER A NUMBER THAT MIGHT CHANGE (Nick) — the words stay, the figures wait */
  it("⚠️ while loading: the words, and no figure or caption", () => {
    const html = chart({ loading: true, activeCount: null });
    expect(html).toContain('data-probe-text="chart-figure"></span>');
    expect(html).toContain('data-probe-text="chart-caption"></span>');
    expect(html).toContain(">active queries<");
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
    expect(html).toContain("The line begins once there are two days on the record.");
    expect(html).not.toContain('data-probe="plot"');
  });

  it("the drawing is the brief's: a navy line at 2.2, round, over a navy fade; a hollow first dot and a solid last", () => {
    expect(code).toMatch(/className="os-acline"[^>]*stroke="#2a3a52" strokeWidth=\{2\.2\} strokeLinecap="round" strokeLinejoin="round"/);
    expect(code).toMatch(/<stop offset="0" stopColor="#2a3a52" stopOpacity="0\.22" \/>/);
    expect(code).toMatch(/<stop offset="1" stopColor="#2a3a52" stopOpacity="0" \/>/);
    expect(code).toMatch(/className="os-acfirst"[^>]*fill="#ffffff" stroke="#2a3a52"/);
    expect(code).toMatch(/className="os-aclast"[^>]*fill="#2a3a52"/);
    expect(code).toContain("geo.gridY.map(");
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
                        "os-bandkey", "os-chartwrap", "os-freqchips"]) {
      expect(code, gone).not.toContain(gone);
    }
  });

  it("…and none of their rules survive in the sheet", () => {
    for (const sel of [".os-chartwrap", ".os-brush", ".os-bw", ".os-tip", ".os-bandkey", ".os-bk", ".os-freqchips",
                       ".os-ctrls", ".os-rangelbl", ".os-stat", ".os-statxt", ".os-delta", ".os-xlabels", ".os-ylab",
                       ".os-pin", ".os-sr", ".os-chip", ".os-dayone"]) {
      expect(cssRuleCount(css, sel), sel).toBe(0);
    }
    expect(css).not.toMatch(/stroke-dashoffset/);
    expect(css).not.toContain(".os-tip ");
  });
});

describe("the chart's rules", () => {
  it("the header: centred, the two groups apart, and the toggle wraps under them only when it must", () => {
    const h = rule(".os-achead");
    for (const d of ["align-items: center", "justify-content: space-between", "flex-wrap: wrap"]) expect(h, d).toContain(d);
    const art = rule(".os-acart");
    for (const d of ["width: 96px", "height: 96px", "max-width: none", "object-fit: contain"]) expect(art, d).toContain(d);
    const n = rule(".os-acn");
    expect(n).toContain("font-size: 33px");
    expect(n).toContain("font-weight: 600");
    const t = rule(".os-acttl");
    expect(t).toContain("font-family: var(--os-type)");
    expect(t).toContain("font-size: 18px");
    const d = rule(".os-acdelta");
    expect(d).toContain('font-family: "JetBrains Mono", monospace');
    /* the caption's clauses keep the mono face — the brand script names bare spans as elements */
    expect(rule(".os-acdc")).toContain("font-family: inherit");
  });

  it("the toggle: mono 10px in a hairline pill, the chosen grain on #f5f1eb", () => {
    const g = rule(".os-actog");
    expect(g).toContain("border: 1px solid #e6dfd6");
    expect(g).toContain("border-radius: 99px");
    const b = rule(".os-actog button");
    expect(b).toContain('font-family: "JetBrains Mono", monospace');
    expect(b).toContain("font-size: 10px");
    expect(rule(".os-actog button.on")).toContain("background-color: #f5f1eb");
  });

  it("⚠️ the svg is absolute in its box, so it can never hold the track open", () => {
    const s = rule(".os-acplot > svg");
    expect(s).toContain("position: absolute");
    expect(s).toContain("inset: 0");
    const p = rule(".os-acplot");
    expect(p).toContain("flex: 1 1 auto");
    expect(p).toMatch(/min-height:\s*\d+px/);
  });

  it("the event dots wear the state tokens — rose with a rust heart, stone with a muted one — on a white ring", () => {
    expect(rule(".os-acev > circle:first-child")).toContain("stroke: #ffffff");
    expect(rule(".os-acev--request > circle:first-child")).toContain("fill: var(--state-you)");
    expect(rule(".os-acev--request > .os-acevc")).toContain("fill: #8a4a3c");
    expect(rule(".os-acev--pass > circle:first-child")).toContain("fill: var(--state-closed)");
    expect(rule(".os-acev--pass > .os-acevc")).toContain("fill: #9c8f82");
    expect(code).toMatch(/<circle cx=\{d\.x\.toFixed\(1\)\} cy=\{d\.y\.toFixed\(1\)\} r=\{6\} strokeWidth=\{2\} \/>/);
  });

  it("the axis labels are mono, and the first and last read from their own points", () => {
    expect(rule(".os-acx span")).toContain('font-family: "JetBrains Mono", monospace');
    expect(rule(".os-acx span.first")).toContain("transform: none");
    expect(rule(".os-acx span.last")).toContain("transform: translateX(-100%)");
  });
});

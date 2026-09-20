/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries card (v33, 18 Sep; ref design-refs/dashboard-v33.html).
 *
 * ⚠️ WHAT A NODE RENDER CAN AND CANNOT SEE. The drawing is measured by a callback ref, and a server
 * render runs no refs — so the svg here carries no paths and no pins. The geometry is locked in
 * `src/lib/dashChart.test.ts` against the path string itself, the pins in `dashPins.test.ts`, the
 * week's figures in `dashWeekMix.test.ts`; and everything that is a fact about a LAID-OUT page — the
 * Mentor's claws on the baseline, the row not creeping, the glyphs on their discs, the cross-dissolve
 * — is measured in `tests/e2e/dashTopRow.measure.ts`. This file holds what the markup and the sheet
 * can honestly carry: what is rendered in each of the card's stages, and the rules whose absence is
 * silent.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, type Query } from "../../types";
import { activeTitle, OneScreenChart } from "./OneScreenChart";
import { PLOT } from "../../lib/dashChart";
import { cssRule } from "../../test/cssRule";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const q = (status: QueryStatus, dateSent: string | undefined): Query =>
  ({ id: `h${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent } as unknown as Query);

const LONG = Array.from({ length: 30 }, (_, i) => q(QueryStatus.QUERIED, ago(i * 9)));
const SHORT = [q(QueryStatus.QUERIED, ago(15)), q(QueryStatus.QUERIED, ago(3))];
const chart = (over: Partial<React.ComponentProps<typeof OneScreenChart>> = {}) => renderToStaticMarkup(
  <OneScreenChart loading={false} queries={LONG} activities={[]} activeCount={30} now={NOW} {...over} />,
);

const src = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => cssRule(css, sel, "oneScreen.css");

describe("the title is a sentence with the live count", () => {
  it("plural, singular, none — and the loading title states no figure", () => {
    expect(activeTitle(18)).toBe("18 active queries");
    expect(activeTitle(1)).toBe("1 active query");
    expect(activeTitle(0)).toBe("No active queries");
    expect(activeTitle(null)).toBe("Active queries");
    expect(chart({ loading: true })).toContain('data-probe-text="chart-title">Active queries</h3>');
  });
  it("⚠️ the figure is the one it is handed — the chart derives no count of its own", () => {
    expect(chart({ activeCount: 12 })).toContain('data-probe-text="chart-title">12 active queries</h3>');
    expect(code).not.toContain("liveCount");
    expect(code).not.toContain("dashBreakdown");
  });
  it("it sits in the navy band, inside the frame, and nothing sits under it", () => {
    const html = chart();
    expect(html).toMatch(/class="os-card os-lead"/);
    expect(html.indexOf('class="os-frame"')).toBeLessThan(html.indexOf('class="os-band"'));
    expect(html.indexOf('class="os-band"')).toBeLessThan(html.indexOf("chart-title"));
    /* no sub-heading, no chip, no key — all three retired with v33 */
    expect(html).not.toContain("os-sub");
    expect(html).not.toContain("out with agents");
    expect(html).not.toContain("os-mini");
    expect(html).not.toContain("os-aclegend");
  });
});

describe("the card over a campaign's life", () => {
  it("short: the quiet suffix says since when, and there is no minimap", () => {
    const html = chart({ queries: SHORT, activeCount: 2 });
    expect(html).toContain('data-probe-text="chart-since">since 2 Sep</span>');
    expect(html).not.toContain('data-probe="minimap"');
  });
  /* ⚠️ THE v34 MOCKUP (19 Sep): the control is IN THE NAVY BAND, after the title — not under the axis —
     and it carries no labels. What it shows is said in its `title` and its accessible name. */
  it("long: the range control arrives IN THE BAND, unlabelled, named for what it shows, reachable by keyboard", () => {
    const html = chart();
    const band = html.slice(html.indexOf('class="os-band"'), html.indexOf('data-probe="plot-box"'));
    expect(band.indexOf("chart-title")).toBeGreaterThan(-1);
    expect(band.indexOf('data-probe="minimap"'), "the control is inside the band, after the title").toBeGreaterThan(band.indexOf("chart-title"));
    expect(html.slice(html.indexOf('data-probe="plot-box"')), "…and nowhere under the plot").not.toContain('data-probe="minimap"');
    expect(html, "DEC 2023 and TODAY are dropped").not.toContain("os-mmlab");
    const name = /data-probe="minimap-window"[^>]*aria-label="([^"]+)"/.exec(html)![1];
    expect(name).toMatch(/^Showing \d{1,2} [A-Z][a-z]{2} to \d{1,2} [A-Z][a-z]{2}\. Drag to change the dates\.$/);
    expect(html).toContain(`data-probe="minimap" title="${name}"`);
    expect(html).toMatch(/data-probe="minimap-window"[^>]*role="slider"[^>]*tabindex="0"/);
    expect(html).not.toContain("chart-since");
  });

  it("⚠️ it is never hidden: in a card of 470px or less it takes the band's full line, and the band's row wraps", () => {
    expect(rule(".os-lead .os-bandrow")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule(".os-lead .os-bandrow")).toMatch(/row-gap:\s*11px/);
    expect(rule(".os-lead .os-bandrow")).toMatch(/gap:\s*16px/);
    expect(rule(".os-mm")).toMatch(/flex:\s*0 1 178px/);
    expect(rule(".os-mm")).toMatch(/min-width:\s*120px/);
    expect(rule(".os-mm")).toMatch(/max-width:\s*200px/);
    expect(css).toMatch(/@container \(max-width: 470px\)\s*\{\s*\.os-mm \{ flex-basis: 100%; max-width: none; margin-left: 0; \}/);
    /* no rule anywhere takes it off the page */
    expect(css).not.toMatch(/\.os-mm[^{]*\{[^}]*display:\s*none/);
  });

  it("⚠️ the end of the chart ALWAYS disintegrates — the carry no longer asks whether the window reaches today", () => {
    expect(code).not.toContain("windowAtToday");
    expect(code).not.toContain("atToday");
    expect(code).toMatch(/const carryTo = size \? Math\.max\(size\.carry, last \? last\[0\] : 0\) : null;/);
    /* what still depends on the dates: the line and its end marker stop at the last visible point */
    expect(code).toMatch(/\{last && <circle className="os-aclast" cx=\{last\[0\]\} cy=\{last\[1\]\}/);
  });
  it("⚠️ none: no chart and NO MENTOR — the Courier, what the card will become, and the one thing to do", () => {
    const html = chart({ queries: [], activeCount: 0, empty: true });
    expect(html).toContain('data-probe-text="chart-title">No active queries</h3>');
    expect(html).toContain('data-probe="chart-empty"');
    expect(html).toContain("/images/dash/courier.png");
    expect(html).toContain("No active queries right now");
    expect(html).toContain("As soon as one’s live, this becomes your campaign chart.");
    expect(html.match(/<button/g)?.length, "exactly one control, and it is the ink pill").toBe(1);
    expect(html).toMatch(/<button type="button" class="os-inkpill os-ce-cta">Log a query<\/button>/);
    expect(html).not.toContain("mentor");
    expect(html).not.toContain('data-probe="plot-box"');
  });
  it("a single day on the record says how the line begins, and draws no plot", () => {
    const html = chart({ queries: [q(QueryStatus.QUERIED, ago(0))], activeCount: 1 });
    expect(html).toContain("The line begins once there are two days on the record.");
    expect(html).not.toContain('data-probe="plot"');
  });
});

describe("the Mentor", () => {
  it("two drawings in one wrapper, both decoded up front, neither announced", () => {
    const html = chart();
    const m = html.slice(html.indexOf('data-probe="mentor"'), html.indexOf('class="os-acdraw"'));
    expect(m.match(/<img/g)?.length).toBe(2);
    expect(m).toContain("/images/dash/mentor-leaning.png?v=");
    expect(m).toContain("/images/dash/mentor-leaning-looking.png?v=");
    expect(m.match(/decoding="sync"/g)?.length).toBe(2);
    expect(m.match(/alt=""/g)?.length).toBe(2);
    expect(html).toMatch(/class="os-mentor" aria-hidden="true"/);
  });
  it("⚠️ the cross-dissolve is ADDITIVE, inside an isolated wrapper, on ONE linear 160ms clock", () => {
    expect(rule(".os-mentor")).toMatch(/isolation:\s*isolate/);
    expect(rule(".os-mentor-b")).toMatch(/mix-blend-mode:\s*plus-lighter/);
    expect(rule(".os-mentor-b")).toMatch(/opacity:\s*0\b/);
    expect(rule(".os-mentor img")).toMatch(/transition:\s*opacity 0\.16s linear/);
    /* the first goes OUT as the second comes IN — both halves, or it is two plain fades */
    expect(css).toMatch(/\.os-lead:hover \.os-mentor-a[^{]*\{\s*opacity:\s*0;/);
    expect(css).toMatch(/\.os-lead:hover \.os-mentor-b[^{]*\{\s*opacity:\s*1;/);
  });
  it("⚠️ his floor and the chart's floor are ONE fraction — the rule reads 92.5%, and so does the geometry", () => {
    expect(PLOT.baseline).toBe(0.925);
    expect(rule(".os-mentor")).toMatch(/top:\s*calc\(92\.5% - 150px \* 0\.9705\)/);
    expect(rule(".os-mentor")).toMatch(/height:\s*150px/);
    expect(rule(".os-mentor")).toMatch(/right:\s*-22px/);
    expect(rule(".os-acground")).toMatch(/top:\s*92\.5%/);
  });
});

describe("⚠️ the drawing never takes part in layout", () => {
  it("the plot is a flex child with a floor; the drawing box is absolute inside it, short of the Mentor", () => {
    expect(rule(".os-acplot")).toMatch(/flex:\s*1 1 0/);
    expect(rule(".os-acplot")).toMatch(/min-height:\s*170px/);
    expect(rule(".os-acplot")).toMatch(/position:\s*relative/);
    expect(rule(".os-acdraw")).toMatch(/position:\s*absolute/);
    expect(rule(".os-acdraw")).toMatch(/width:\s*calc\(100% - var\(--stand\)\)/);
    expect(rule(".os-acdraw > svg")).toMatch(/position:\s*absolute/);
    expect(rule(".os-acdraw > svg")).toMatch(/overflow:\s*visible/);
  });
  it("⚠️ `--stand` is on the FRAME — a container query cannot restyle its own container", () => {
    expect(rule(".os-lead > .os-frame")).toMatch(/--stand:\s*70px/);
    expect(css, "set on the card, the @container rule that zeroes it could never apply").not.toMatch(/\.os-lead\s*\{[^}]*--stand/);
    expect(css).toMatch(/@container \(max-width: 350px\)\s*\{[^@]*\.os-lead > \.os-frame \{ --stand: 0px; \}/);
    expect(rule(".os-acx")).toMatch(/margin-right:\s*var\(--stand\)/);
  });
  it("the box is measured by a CALLBACK ref, and the viewBox is the measured box", () => {
    expect(code).toMatch(/const drawRef = useCallback\(/);
    expect(code).toMatch(/<div className="os-acdraw" ref=\{drawRef\}>/);
    expect(code).toMatch(/new ResizeObserver\(measure\)/);
    expect(code).toMatch(/return \(\) => ro\.disconnect\(\)/);
    expect(code).toContain("viewBox={W && H ? `0 0 ${W} ${H}` : undefined}");
    expect(code, "a stretched drawing turns circles into ellipses").not.toContain("preserveAspectRatio");
  });
});

describe("the layers", () => {
  it("⚠️ the EVENT hit areas are drawn after the WEEK rect — so they are above it", () => {
    const week = code.indexOf('className="os-acweeks"');
    const hit = code.indexOf('className="os-achit"');
    expect(week).toBeGreaterThan(0);
    expect(hit).toBeGreaterThan(week);
    /* the glyph, the stem and the point: r14, a 12px strip, r8 */
    expect(code).toMatch(/r=\{14\}[^>]*data-ev=/);
    expect(code).toMatch(/strokeWidth=\{12\}[^>]*data-ev=/);
    expect(code).toMatch(/r=\{8\}[^>]*data-ev=/);
  });
  it("⚠️ a status is drawn by StatusDot, in an HTML layer over the plot — never a foreignObject", () => {
    expect(code).toContain("<StatusDot status={one.status}");
    expect(code).not.toContain("foreignObject");
    expect(rule(".os-acglyphs")).toMatch(/pointer-events:\s*none/);
    expect(rule(".os-acglyphs")).toMatch(/inset:\s*0/);
  });
  it("⚠️ the disc and the glyph scale TOGETHER — one factor, one clock", () => {
    expect(code).toMatch(/scale\(\$\{hoverPin\?\.id === p\.id \? 1\.25 : 1\}\)/);
    expect(rule(".os-acglyph.at")).toMatch(/scale\(1\.25\)/);
    expect(rule(".os-acdisc")).toMatch(/transition:\s*transform 0\.15s/);
    expect(rule(".os-acglyph")).toMatch(/transition:\s*transform 0\.15s/);
  });
  it("⚠️ every svg id is useId's — a hard-coded one is a duplicate under a shell that keeps pages mounted", () => {
    expect(code).toContain("useId()");
    expect(code.match(/\bid="/g), "a literal id in the chart").toBeNull();
    expect(code.match(/url\(#[a-z]/gi), "a literal url(#…) reference").toBeNull();
  });
  it("the fill's grain is the ref's filter, verbatim", () => {
    expect(code).toContain('baseFrequency={0.75} numOctaves={2} seed={7}');
    expect(code).toContain('values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0"');
    expect(code).toContain("k1={0} k2={1.25} k3={-1} k4={0.42}");
    expect(code).toContain("slope={9} intercept={-3.6}");
    expect(code).toContain('colorInterpolationFilters="sRGB"');
  });
});

describe("the axis", () => {
  it("one slot per week, under the drawing; under 560px of CARD every other label goes and its bar stays", () => {
    const html = chart();
    /* bounded on the axis's own element — the control that used to follow it is in the band now */
    const axis = /data-probe="chart-axis">(.*?)<\/div>/.exec(html)![1];
    expect(axis.match(/<span/g)?.length).toBe(9);
    expect(rule(".os-acx span")).toMatch(/flex:\s*1 1 0/);
    expect(rule(".os-acx span")).toMatch(/white-space:\s*nowrap/);
    expect(css).toMatch(/@container \(max-width: 560px\)\s*\{\s*\.os-acx span:nth-child\(even\) \{ font-size: 0; \}/);
    expect(rule(".os-acx span.at::before")).toMatch(/background:\s*var\(--dash-navy\)/);
  });
});

describe("⚠️ retired with v33, rule and element together", () => {
  const GONE = ["os-acframe", "os-achead", "os-acid", "os-acstat", "os-aclegend", "os-aclg", "os-acgrid", "os-acbars", "os-acev", "os-acfirst", "os-acbody"];
  it("nothing of the v16 chart is left in the component", () => {
    for (const c of GONE) expect(code, c).not.toMatch(new RegExp(`["\\s\`]${c}["\\s\`]`));
    expect(code).not.toContain("Weekly");
  });
  it("…and none of its rules survive in the sheet", () => {
    for (const c of GONE) expect(css, c).not.toMatch(new RegExp(`\\.${c}[\\s,{:.>]`));
  });
});

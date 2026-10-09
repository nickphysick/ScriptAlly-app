/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The desk card (Contact list v15.2 §2) — K3's three month-on-month branches as rendered markup, and the charts' own
 * arithmetic. On today's data the page can never show the DOWN branch (neither count can fall), so it is held here.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, DeskCard, RingChart, WeekBars } from "./DeskCard";
import { monthOnMonth } from "../../../lib/contactDesk";

const card = (delta: number | null) => renderToStaticMarkup(
  <DeskCard probe="x" icon={<svg />} figure="4" rest="agents on file" label="4 agents on file" mom={delta === null ? null : monthOnMonth(delta)} chart={<i />} />,
);
const UP = "M6 2.2 10 7.4H2z", DOWN = "M6 9.8 2 4.6h8z";

describe("the desk card's month-on-month line (K3)", () => {
  it("up draws the up triangle and takes the up class; down the down triangle and class; none neither, with its own words", () => {
    const up = card(3), down = card(-2), none = card(0);
    expect(up).toContain('data-dir="up"'); expect(up).toContain("dsk-mom is-up"); expect(up).toContain(UP); expect(up).not.toContain(DOWN);
    expect(down).toContain('data-dir="down"'); expect(down).toContain("dsk-mom is-down"); expect(down).toContain(DOWN); expect(down).not.toContain(UP);
    expect(none).toContain('data-dir="none"'); expect(none).toContain("No change since last month"); expect(none).not.toContain(UP); expect(none).not.toContain(DOWN);
    /* each branch was entered */
    expect(new Set([up, down, none].map((h) => /data-dir="(\w+)"/.exec(h)?.[1]))).toEqual(new Set(["up", "down", "none"]));
  });
  it("no snapshot, no line: a null month on month renders none at all", () => {
    expect(card(null)).not.toContain('data-dk-part="mom"');
  });
  it("the colours are the sheet's: up #4f7a4b, down rust #a0633f, none ink at 45%", () => {
    const css = readFileSync("src/components/shell/desk/desk.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.dsk-mom\.is-up\s*\{\s*color:\s*#4f7a4b/);
    expect(css).toMatch(/\.dsk-mom\.is-down\s*\{\s*color:\s*#a0633f/);
    expect(css).toMatch(/\.dsk-mom\.is-none\s*\{\s*color:\s*rgba\(28, 19, 15, 0\.45\)/);
  });
});

describe("the desk's charts (K4)", () => {
  it("the weekly bars: one per week, only the LAST at full ink, a zero week a 2-unit stub, the tallest the full height (v15.3 N6)", () => {
    const h = renderToStaticMarkup(<WeekBars values={[0, 1, 3, 0, 2, 1, 1, 2]} caption="added per week" />);
    const bars = [...h.matchAll(/<rect[^>]*>/g)].map((m) => m[0]);
    expect(bars.length).toBe(8);
    const op = bars.map((b) => /fill-opacity="([\d.]+)"/.exec(b)?.[1]);
    expect(op).toEqual(["0.22", "0.22", "0.22", "0.22", "0.22", "0.22", "0.22", "1"]);
    const ht = bars.map((b) => Number(/ height="([\d.]+)"/.exec(b)?.[1]));
    expect(ht[0]).toBe(2); expect(ht[3]).toBe(2); expect(ht[2]).toBe(36);
    /* each bar is inset 2.5 in a 14-unit slot */
    expect(bars.map((b) => /x="([\d.]+)"/.exec(b)?.[1]).slice(0, 2)).toEqual(["2.5", "16.5"]);
    expect(bars.every((b) => /width="9.0"/.test(b))).toBe(true);
    expect(h).toContain('data-dk-bars="0,1,3,0,2,1,1,2"');
    expect(h).toContain("added per week");
    expect(h).toContain('aria-hidden="true"');
  });
  it("the ring's closed arc is GREY, not pale blue (v15.3 §5, N3)", () => {
    const h = renderToStaticMarkup(<RingChart active={4} closed={2} total={41} caption="active · closed" />);
    expect(/data-dk-arc="closed"[^>]*stroke="#b3aca5"/.test(h)).toBe(true);
    expect(h).not.toContain("#9fb0c4");
  });
  it("the ring's arcs are active and closed as shares of the total, from 12 o'clock; the rest is the track", () => {
    const h = renderToStaticMarkup(<RingChart active={17} closed={5} total={41} caption="active · closed" />);
    const shares = [...h.matchAll(/data-dk-arc="(\w+)" data-dk-share="([\d.]+)"/g)].map((m) => [m[1], Number(m[2])] as const);
    expect(shares.map((s) => s[0])).toEqual(["active", "closed"]);
    expect(shares[0][1]).toBeCloseTo((17 / 41) * 100, 1);
    expect(shares[0][1] + shares[1][1]).toBeCloseTo((22 / 41) * 100, 1);
    /* a zero part draws no arc (a zero-length dash with a cap paints a dot) */
    expect(renderToStaticMarkup(<RingChart active={0} closed={0} total={5} caption="" />)).not.toContain("data-dk-arc");
  });
  it("the bar's fill is the percentage, clamped", () => {
    expect(renderToStaticMarkup(<BarChart pct={76} caption="31 of 41" />)).toContain("width:76%");
    expect(renderToStaticMarkup(<BarChart pct={140} caption="" />)).toContain("width:100%");
  });
});

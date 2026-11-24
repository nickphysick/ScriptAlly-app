/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2.1, Phase 3 — LOG A QUERY'S SLIDER DRAWS AS BEFORE. Record a response v2 gave the shared WeekSlider
 * three optional settings (`readout`, `unknownLabel`, `ends`) and let its fill read a surrounding `--sm`. With Log a
 * query's own props (QcLogStages: "Response time", 1–26 weeks, Unknown) the slider must render the words it always did,
 * and nothing outside the response journey may set `--sm`, so its fill resolves to the navy it always was.
 *
 *   W1  Log a query's props: the readout, the ends, the Unknown pill and the value text are v1's words
 *   W2  the null state reads "Unknown" on the pill and the readout, as before
 *   W3  `--sm` is set only by the response journey (its own stylesheet and component): Log a query's fill is navy
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeekSlider } from "./WeekSlider";

const laq = (value: number | null) => renderToStaticMarkup(
  <WeekSlider label="Response time" value={value} min={1} max={26} onChange={() => undefined} onUnknown={() => undefined} />,
);
const text = (html: string) => html.replace(/<[^>]+>/g, "|").split("|").map((s) => s.trim()).filter(Boolean);

describe("Log a query's slider draws as before (v2.1)", () => {
  it("W1 the readout, the ends, the pill and the value text", () => {
    const h = laq(8);
    expect(text(h)).toEqual(["Response time", "8 weeks", "Unknown", "1 week", "26 weeks"]);
    expect(h).toContain('aria-valuetext="8 weeks"');
    expect(text(laq(1))).toContain("1 week");
    /* the fill: navy unless something sets --sm */
    expect(h).toMatch(/background:linear-gradient\(90deg,var\(--sm,#2a3a52\) 0%,var\(--sm,#2a3a52\) 28(\.\d+)?%,#e7ddd0 28(\.\d+)?%,#e7ddd0 100%\)/);
  });
  it("W2 the null state reads Unknown", () => {
    const h = laq(null);
    expect(text(h)).toEqual(["Response time", "Unknown", "Unknown", "1 week", "26 weeks"]);
    expect(h).toContain('aria-valuetext="Unknown"');
  });
  it("W3 only the response journey sets --sm", () => {
    const root = join(__dirname, "..", "..");
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(css|tsx?)$/.test(n) || /\.test\./.test(n)) continue;
        const s = readFileSync(p, "utf8");
        /* a declaration (`--sm: …` after `{` or `;`), never a class name that ends "--sm" */
        if (/(^|[{;\s])--sm\s*:/m.test(s.replace(/[\w-]+--sm(?=[\s:.{,)])/g, "")) || /["']--sm["']/.test(s)) hits.push(relative(root, p));
      }
    };
    walk(root);
    expect(hits.length, "the scan found the journey's own setter").toBeGreaterThan(0);
    expect(hits.filter((h) => !/RespondStages|qcRespondStages/.test(h))).toEqual([]);
  });
});

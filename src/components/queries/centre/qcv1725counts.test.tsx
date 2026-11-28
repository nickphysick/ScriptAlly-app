/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.5 — Phase 4: the two counts around the ring. The panel's navy header reads "<showing> showing"
 * (Clear all when anything is set); the list toolbar reads "41 need you · 88 in all" unfiltered, "14 of 88" filtered,
 * and Birds-eye keeps "88 queries".
 */
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QcBar153, type QcBar153Props } from "./QcBar153";
import { QcSmart172 } from "./QcSmart172";
import { EMPTY172 } from "../../../lib/smart172";

const base = {
  view: "list", onView: () => {}, loading: false, showing: 88, total: 88, find: "", onFind: () => {},
  sort: { key: "due", desc: false }, onSort: () => {}, group: "attention", onGroup: () => {}, packageOk: false,
  beGroup: "urgency", onBeGroup: () => {}, beSort: "due", onBeSort: () => {}, onExport: () => {},
} as QcBar153Props;
const bar = (p: Record<string, unknown>) => renderToStaticMarkup(<QcBar153 {...base} {...(p as Partial<QcBar153Props>)} />).replace(/<[^>]+>/g, "");
const ctx = { nowMs: 0, pkg: () => "", stars: () => 0, country: () => "" };
const panel = (showing: number, s = EMPTY172) => renderToStaticMarkup(<QcSmart172 rows={[]} ctx={ctx} showing={showing} total={88} s={s} onChange={() => {}} onClear={() => {}} />);

describe("v172.5 · 4a the panel's header", () => {
  it("“Filter” and “<showing> showing”; Clear all only when something is set", () => {
    expect(panel(88)).toMatch(/<header class="qs172-h"><b>Filter<\/b><small>88 showing<\/small><\/header>/);
    expect(panel(14, { ...EMPTY172, stage: [1] })).toMatch(/<header class="qs172-h"><b>Filter<\/b><small>14 showing<\/small><button type="button">Clear all<\/button><\/header>/);
  });
});

describe("v172.5 · 4b the list toolbar's count", () => {
  it("unfiltered: “41 need you · 88 in all”, the numbers bold", () => {
    expect(bar({ need: 41 })).toMatch(/41 need you · 88 in all/);
    expect(renderToStaticMarkup(<QcBar153 {...base} {...({ need: 41 } as Partial<QcBar153Props>)} />)).toMatch(/<b>41<\/b> need you · <b>88<\/b> in all/);
  });
  it("filtered: “14 of 88” as before", () => {
    expect(bar({ need: 41, showing: 14 })).toMatch(/14 of 88/);
    expect(bar({ need: 41, showing: 14 })).not.toMatch(/need you/);
  });
  it("Birds-eye keeps “88 queries”", () => {
    expect(bar({ need: null, view: "birds" })).toMatch(/88 queries/);
  });
  it("the page passes the Action needed group's count to the bar, and none on Birds-eye", () => {
    const page = readFileSync(new URL("./QcPage151.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/<QcBar153[^>]*need=\{birds \? null : p\.need/);
    const queries = readFileSync(new URL("../../Queries.tsx", import.meta.url), "utf8");
    expect(queries).toMatch(/need=\{[^}]*group172\(/);
  });
});

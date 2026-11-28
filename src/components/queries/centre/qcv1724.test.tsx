/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.4 — the source half of the round: the list just ends; 14px slider handles; "Include closed" is a
 * tick; the loading shell on the list's and the panel's own frames; the one short arrival; the sort remembered per
 * device. The rendered half is tests/e2e/qc172.measure.ts L14–L17.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const DIR = new URL("./", import.meta.url);
const read = (f: string) => { try { return readFileSync(new URL(f, DIR), "utf8"); } catch { return ""; } };
const page = read("QcPage151.tsx");
const queries = read("../../Queries.tsx");
const css172 = read("qcv172.css");
const bare = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (css: string, sel: string): string => {
  for (const m of bare(css).matchAll(/([^{}]+)\{([^}]*)\}/g)) if (m[1].split(",").some((s) => s.trim() === sel)) return m[2];
  return "";
};
const load = async <T,>(f: string): Promise<T | null> => { try { return (await import(/* @vite-ignore */ f)) as T; } catch { return null; } };

describe("v172.4 · 1a the list just ends", () => {
  it("no sign-off under the last row: no “That’s all”, no quill block, no signoff prop", () => {
    expect(page).not.toMatch(/That’s all/);
    expect(page).not.toMatch(/data-qc151="signoff"/);
    expect(queries).not.toMatch(/\bsignoff=\{/);
  });
});

describe("v172.4 · 1b slider handles 14px, their centres on the track's ends", () => {
  it("the webkit thumb 14 × 14 with a 2px navy ring; the moz thumb 11; the input overhangs 7px each side", () => {
    const wk = rule(css172, ".qs172-dual input::-webkit-slider-thumb");
    expect(wk).toMatch(/width:\s*14px\s*!important/);
    expect(wk).toMatch(/height:\s*14px\s*!important/);
    expect(wk).toMatch(/box-shadow:\s*0 0 0 2px var\(--navy\), 0 1px 3px rgba\(28,\s*19,\s*15,\s*\.25\)\s*!important/);
    const moz = rule(css172, ".qs172-dual input::-moz-range-thumb");
    expect(moz).toMatch(/width:\s*11px\s*!important/);
    expect(moz).toMatch(/height:\s*11px\s*!important/);
    const inp = rule(css172, ".qs172-dual input");
    expect(inp).toMatch(/left:\s*-7px/);
    expect(inp).toMatch(/width:\s*calc\(100% \+ 14px\)/);
  });
});

describe("v172.4 · 1c Include closed is a tick box, like Not dated", () => {
  it("the panel draws a checkbox in .qs172-ck--closed, ticked by default, with the closed count; no pill", async () => {
    const m = await load<typeof import("./QcSmart172")>("./QcSmart172");
    const s = await load<typeof import("../../../lib/smart172")>("../../../lib/smart172");
    expect(m && s).toBeTruthy();
    const Panel = m!.QcSmart172;
    const html = renderToStaticMarkup(<Panel rows={[]} ctx={{ nowMs: 0, pkg: () => "", stars: () => 0, country: () => "" }} showing={0} total={0} s={s!.EMPTY172} onChange={() => {}} onClear={() => {}} />);
    expect(html).toMatch(/<div class="qs172-incs"><label class="qs172-ck qs172-ck--closed"><input type="checkbox" checked=""\/>Include closed <em>0<\/em><\/label><\/div>/);
    expect(html).not.toMatch(/class="qs172-inc[ "]/);
    expect(rule(css172, ".qs172-incs .qs172-ck")).toMatch(/margin-top:\s*0/);
    expect(css172).not.toMatch(/\.qs172-inc[\s.,:{]/);
  });
});

describe("v172.4 · 2 the loading shell on the page's own frames", () => {
  it("Skeleton172: two groups (5 + 3 rows) on the list's grid, inert, no figure", async () => {
    const m = await load<typeof import("./QcSk172")>("./QcSk172");
    expect(m).toBeTruthy();
    const Sk = m!.Skeleton172;
    const html = renderToStaticMarkup(<Sk />);
    expect(html).toMatch(/^<div class="sk172" data-qc172="skeleton" aria-hidden="true">/);
    expect(html.match(/class="sk172-grp"/g)).toHaveLength(2);
    expect(html.match(/class="sk172-row"/g)).toHaveLength(8);
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
  });
  it("RailSk172: the panel's frame, a navy header reading Filter and no count, inert, no figure", async () => {
    const m = await load<typeof import("./QcSk172")>("./QcSk172");
    const Rail = m!.RailSk172;
    const html = renderToStaticMarkup(<Rail />);
    expect(html).toMatch(/^<aside class="qs172 sk172-rail" aria-hidden="true"><header class="qs172-h"><b>Filter<\/b><\/header>/);
    expect(html.replace(/<[^>]*>/g, "")).toBe("Filter");
  });
  it("QcPage151: loading + show draws wrap169(<Skeleton172 />) and <RailSk172 /> — both gated on show — and no Skeleton155", () => {
    expect(page).toMatch(/import \{ RailSk172, Skeleton172 \} from "\.\/QcSk172";/);
    expect(page).toMatch(/const sk172 = p\.state155\?\.kind === "loading" && p\.state155\.show;/);
    expect(page).toMatch(/loading155 \? \(sk172 \? wrap169\(<Skeleton172 \/>\) : null\)/);
    expect(page).toMatch(/\{sk172 \? <RailSk172 \/> : p\.rail\}/);
    expect(page).not.toMatch(/Skeleton155/);
  });
  it("the shapes' sheen stops under reduced motion", () => {
    expect(css172).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ :is\(\.sk172, \.sk172-rail\) i \{ animation: none !important; \} \}/);
  });
});

describe("v172.4 · 3 the arrival: once, after loading, 700ms, never under reduced motion", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("arms on loading → content (and on a first mount straight to content), clears at 700ms", async () => {
    const m = await load<typeof import("../../../lib/arrival172")>("../../../lib/arrival172");
    expect(m).toBeTruthy();
    vi.useFakeTimers();
    const seen: boolean[] = [];
    const a = m!.arrival172((on) => seen.push(on), () => false);
    a.update(true);
    expect(seen).toEqual([]);
    a.update(false);
    expect(seen).toEqual([true]);
    vi.advanceTimersByTime(699);
    expect(seen).toEqual([true]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([true, false]);
    const b = m!.arrival172((on) => seen.push(on), () => false);
    b.update(false);
    expect(seen).toEqual([true, false, true]);
    vi.advanceTimersByTime(700);
    expect(seen).toEqual([true, false, true, false]);
  });
  it("a later change with content already shown (filter, sort, grouping, view, selection) never replays it", async () => {
    const m = await load<typeof import("../../../lib/arrival172")>("../../../lib/arrival172");
    vi.useFakeTimers();
    const seen: boolean[] = [];
    const a = m!.arrival172((on) => seen.push(on), () => false);
    a.update(false); vi.advanceTimersByTime(700);
    a.update(false); a.update(false);
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual([true, false]);
  });
  it("under reduced motion it is never set", async () => {
    const m = await load<typeof import("../../../lib/arrival172")>("../../../lib/arrival172");
    vi.useFakeTimers();
    const seen: boolean[] = [];
    const a = m!.arrival172((on) => seen.push(on), () => true);
    a.update(true); a.update(false);
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([]);
  });
  it("QcPage151 drives it from the loading flag and sets data-en172 on the list and the rail column", () => {
    expect(page).toMatch(/arrival172\(/);
    expect(page).toMatch(/className="qc153-list qc169"[^>]*data-en172=\{en172 \? "stagger" : undefined\}/);
    expect(page).toMatch(/className="qc153-railcol"[^>]*data-en172=\{en172 \? "stagger" : undefined\}/);
  });
  it("the arrival's CSS sits inside prefers-reduced-motion: no-preference and is done by 700ms", () => {
    const i = css172.indexOf("@media (prefers-reduced-motion: no-preference) {\n  .qc153-railcol[data-en172]");
    expect(i).toBeGreaterThan(-1);
    const block = css172.slice(i, css172.indexOf("\n}", i));
    /* each piece as written, then its end: the title 200; rows 320 + up to 210 apart; later rows 250 from 200; the
       panel body 250; the bars 300 from 80 */
    const parts: [RegExp, number][] = [
      [/\.qc153-sec \{ animation: en172-fade 200ms ease both; \}/, 200],
      [/en172-rise 320ms cubic-bezier\(\.2, \.8, \.2, 1\) both; animation-delay: var\(--d, 0ms\)/, 320 + 210],
      [/:nth-child\(8\) \{ --d: 210ms; \}/, 0],
      [/:not\(:first-child\) \{ animation: en172-fade 250ms ease 200ms both; \}/, 450],
      [/\.qs172 > :not\(\.qs172-h\) \{ animation: en172-fade 250ms ease both; \}/, 250],
      [/en172-grow 300ms cubic-bezier\(\.2, \.8, \.2, 1\) 80ms both/, 380],
    ];
    for (const [re, end] of parts) { expect(block).toMatch(re); expect(end).toBeLessThanOrEqual(700); }
  });
});

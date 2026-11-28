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
import { describe, expect, it } from "vitest";

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

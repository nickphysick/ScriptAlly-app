/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v2 — the unit-level locks (the rendered ones are tests/e2e/compsMat.measure.ts).
 *
 * These replace compsPhase2.test.ts and compsPhase3.test.ts, which read the v3 page's SOURCE for
 * its markup and copy and were retired with it. What survives here is the part a unit can prove
 * without a browser: the form's pure rules, what the page imports (C5), that the examples are
 * pictures (C7), and that a failed write cannot escape (C9).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { joinTags, splitTags, yearError } from "./CompForm";
import { CompCard } from "./CompCard";
import { CompsExhibit } from "./CompsEmpty";
import { CompsScoutRail } from "./CompsScoutRail";
import { SAVE_FAILED, runWrite } from "../../lib/compsWrite";

const here = dirname(fileURLToPath(import.meta.url));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const src = (f: string) => strip(readFileSync(join(here, f), "utf8"));

describe("C3 · the form's rules", () => {
  it("a year is four digits between 1000 and 2100, or empty", () => {
    for (const ok of ["", "  ", "1000", "2021", "2100"]) expect(yearError(ok), ok).toBeNull();
    for (const bad of ["20", "202", "20211", "999", "2101", "20a1", "-202"]) expect(yearError(bad), bad).toBe("Use four digits, like 2021.");
  });
  it("never judges a year by its age — only its shape", () => {
    expect(yearError("1066")).toBeNull();
  });
  it("tags are stored joined with ' · ', and split back the same way", () => {
    expect(joinTags(["harbour town", " tides ", ""])).toBe("harbour town · tides");
    expect(splitTags("harbour town · tides")).toEqual(["harbour town", "tides"]);
    expect(splitTags(undefined)).toEqual([]);
  });
});

describe("C5 · the page cannot reach the Scout", () => {
  const page = ["ComparableTitlesPage.tsx", "CompsScoutRail.tsx", "CompCard.tsx", "CompForm.tsx", "CompsQueryLine.tsx", "CompsEmpty.tsx"];
  it("nothing the page mounts imports the Scout's client or its panel", () => {
    for (const f of page) {
      const s = src(f);
      expect(s, `${f} imports lib/suggestComps`).not.toMatch(/from ["'][./]*lib\/suggestComps["']/);
      expect(s, `${f} names fetchCompRun`).not.toContain("fetchCompRun");
      expect(s, `${f} mounts ScoutPanel`).not.toMatch(/<ScoutPanel\b|from ["']\.\/ScoutPanel["']/);
    }
  });
  it("the rail renders no control at all", () => {
    const html = renderToStaticMarkup(<CompsScoutRail />);
    expect(html).toContain("The Scout");
    expect(html).toContain("Coming soon");
    expect(html, "the rail rendered a button").not.toMatch(/<button\b|<a\b[^>]*href|<input\b/);
    expect(html).toMatch(/data-cpv="rail-examples"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-cpv="rail-examples"/);
  });
});

describe("C7 · the empty state's examples are pictures", () => {
  /* living headers v3 §5: the examples are the exhibition now — the band is aria-hidden and inert,
     and the cards inside are CompCard's example picture (no button); the copy button is disabled. */
  it("the exhibition's cards render no live button, and the band is aria-hidden and inert", () => {
    const html = renderToStaticMarkup(<CompsExhibit msTitle="Murphy’s Day Out" now={2026} />);
    expect(html).toContain('data-lh="exhibition"');
    expect(html).toMatch(/data-lh="band" aria-hidden="true" inert=""/);
    expect(html, "a live comp card's switch rendered").not.toContain('role="switch"');
    /* every button sits inside the inert band — the format radios are CompsQueryLine's own picture */
    expect(html.indexOf("<button")).toBeGreaterThan(html.indexOf('data-lh="band"'));
    expect(html).toContain("HOW THE PAGE LOOKS ONCE YOU’VE ADDED A FEW");
  });
  it("the live card is the same component with real buttons", () => {
    const html = renderToStaticMarkup(<CompCard comp={{ title: "A", inQuery: true }} position={1} now={2026} />);
    expect((html.match(/<button\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('role="switch"');
    expect(html).toContain(">1st<");
  });
  it("the page no longer mounts the v3 marketing blocks", () => {
    expect(src("ComparableTitlesPage.tsx")).not.toMatch(/StagesBlock|FeatureBlock|compsMarketing/);
  });
});

describe("C9 · a failed write reverts and says so, and never escapes", () => {
  it("runWrite resolves false, calls onFail once, and does not reject", async () => {
    const onFail = vi.fn();
    const err = new Error("PERMISSION_DENIED");
    await expect(runWrite(() => Promise.reject(err), onFail)).resolves.toBe(false);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith(err);
  });
  it("…and a write that lands resolves true without calling onFail", async () => {
    const onFail = vi.fn();
    await expect(runWrite(() => Promise.resolve(), onFail)).resolves.toBe(true);
    expect(onFail).not.toHaveBeenCalled();
  });
  it("the page's writes all go through runWrite, and a failure toasts SAVE_FAILED", () => {
    const s = src("ComparableTitlesPage.tsx");
    expect(SAVE_FAILED).toBe("Couldn't save that change. Check your connection and try again.");
    expect(s, "a write still discards its promise").not.toMatch(/void updateManuscript/);
    expect((s.match(/updateManuscript\(/g) ?? []).length, "updateManuscript is called from more than the one guarded path").toBe(1);
    expect(s).toMatch(/runWrite\(\s*\(\) => updateManuscript\(/);
    expect(s).toContain("showToast({ message: SAVE_FAILED })");
  });
});

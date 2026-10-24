/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 — QC149-L0: the Versions page renders identically after its header card and alert banner were
 * lifted into the shared PageHeaderCard / PageAlertBanner (ruling on the Step 0 stop).
 *
 *   L0_CAPTURE=1  → read the BASE build (before the extraction) and write the reference: one screenshot per size and
 *                   the computed styles of the card, its title, tag, body, buttons and art, and the banner and its parts.
 *   otherwise     → read the build under test and compare: pixels differing ≤ 0.1%, every computed style equal.
 *
 * The reference is captured per run from the base build, never carried between days (the fixture's counts are dated).
 * ⚠️ The guide's popover is closed before reading, and motion is suppressed by a stylesheet rule.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { ctxFor, openV2 } from "./ver2Lib";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

const DIR = "reports/qc-v149/l0";
const CAPTURE = process.env.L0_CAPTURE === "1";
const TAG = process.env.L0_TAG ?? (CAPTURE ? "base" : "new");
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }];

const PARTS: Record<string, string> = {
  card: '[data-vv2="title"]', title: "#hbT", tag: '[data-vv2="title"] h1 > span', body: '[data-vv2="title"] p',
  bodyB: '[data-vv2="title"] p b', primary: '[data-vv2="new"]', secondary: '[data-vv2="how"]',
  art: '[data-vv2="title"] img', artBox: '[data-vv2="title"] [aria-hidden="true"]',
  banner: '[data-vv2="banner"]', bIcon: '[data-vv2="banner"] > span:first-child', bText: '[data-vv2="banner"] > div',
  bHead: "#msNoteT", bHeadB: "#msNoteT b", bLine: '[data-vv2="banner"] > div > p:nth-child(2)',
  bFaces: "#msNoteG", bFace: "#msNoteG > span", bAction: '[data-vv2="assign"]',
};
const PROPS = ["display", "grid-template-columns", "align-items", "justify-content", "gap", "column-gap", "row-gap",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-left-radius", "border-bottom-right-radius", "border-left-width", "border-left-color", "border-left-style",
  "border-top-width", "border-top-color", "background-color", "background-image", "box-shadow", "font-family", "font-size",
  "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "color", "height", "width", "max-width",
  "object-fit", "filter", "opacity", "overflow", "flex", "box-sizing", "cursor"];

const fx = (...a: string[]) => execFileSync("npx", ["tsx", "tests/e2e/ver2Fixture.mjs", ...a], { encoding: "utf8" });

async function read(page: Page) {
  return page.evaluate(([parts, props]) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const [k, sel] of Object.entries(parts as Record<string, string>)) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) { out[k] = null; continue; }
      const cs = getComputedStyle(el);
      const o: Record<string, string> = {};
      for (const p of props as string[]) o[p] = cs.getPropertyValue(p);
      o["box"] = [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight].join(",");
      o["text"] = (el.textContent ?? "").trim().slice(0, 160);
      out[k] = o;
    }
    return out;
  }, [PARTS, PROPS] as const);
}

function pixelDiff(a: Buffer, b: Buffer): { ratio: number; n: number; total: number } {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { ratio: 1, n: -1, total: A.width * A.height };
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    if (Math.abs(A.data[i] - B.data[i]) > 16 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 16) n++;
  }
  const total = A.width * A.height;
  return { ratio: n / total, n, total };
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
test.beforeAll(() => { if (CAPTURE) fx("--seed"); });

for (const vp of SIZES) {
  test(`QC149-L0 · Versions unchanged by the extraction @ ${vp.width}`, async ({ browser, baseURL }) => {
    mkdirSync(DIR, { recursive: true });
    const ctx = await ctxFor(browser, baseURL!, vp);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const s = document.createElement("style");
      s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
    });
    await openV2(page);
    if (await page.locator('[data-pck="popover"]').count()) { await page.locator('[data-pck="close"]').click(); await page.waitForTimeout(400); }
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const styles = await read(page);
    const shot = await page.screenshot();
    writeFileSync(`${DIR}/${TAG}-${vp.width}.png`, shot);
    writeFileSync(`${DIR}/${TAG}-${vp.width}.json`, JSON.stringify(styles, null, 1));
    await ctx.close();

    /* the population: every part the lock compares must exist, or an empty read would compare equal to an empty read */
    const missing = Object.entries(styles).filter(([, v]) => !v).map(([k]) => k);
    expect(missing, "parts not rendered").toEqual([]);
    if (CAPTURE) return;

    const ref = `${DIR}/base-${vp.width}`;
    expect(existsSync(`${ref}.png`), "no base reference: run with L0_CAPTURE=1 against the base build first").toBe(true);
    const base = JSON.parse(readFileSync(`${ref}.json`, "utf8")) as typeof styles;
    const diffs: string[] = [];
    for (const [k, v] of Object.entries(base)) for (const [p, val] of Object.entries(v ?? {})) {
      const now = styles[k]?.[p];
      if (now !== val) diffs.push(`${k}.${p}: ${val} → ${now}`);
    }
    const px = pixelDiff(readFileSync(`${ref}.png`), shot);
    console.log(`[L0 @${vp.width}] styles compared: ${Object.keys(base).length} parts × ${PROPS.length + 2}; differing: ${diffs.length}; pixels differing: ${px.n}/${px.total} (${(px.ratio * 100).toFixed(4)}%)`);
    for (const d of diffs.slice(0, 30)) console.log("  ✗ " + d);
    expect(diffs, "computed styles differ from the base build").toEqual([]);
    expect(px.ratio, "screenshot differs from the base build by more than 0.1%").toBeLessThanOrEqual(0.001);
  });
}

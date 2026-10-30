/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2 R14 — phone round two v1 leaves the desktop unchanged. At 1440 × 900, on Home, Queries, To-do, Agents, Submission
 * packages, Versions and Comparable titles, this build and the base build (the commit dev served before the pack) are
 * opened back to back in the same browser and compared two ways: the rendered pixels, and the DOM of the shell.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>    this build
 *   PR2_BASE_URL=http://127.0.0.1:<port>       the base build
 *   PR2_MUTATE=R14                             the named break: this build's desktop gains a red outline on its bar
 *   PR2_READINGS=<file>
 *
 * ⚠️ BOTH CAPTURES IN ONE RUN, NEVER A CARRIED REFERENCE: dates, "Day n" and the To-do calendar's rolling window move with
 * the clock, so a reference from another day differs with no code change at all (CLAUDE.md).
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const STORAGE_STATE = "tests/e2e/.auth/state.json";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };
const BASE = process.env.PR2_BASE_URL ?? "";
const MUTATE = process.env.PR2_MUTATE ?? "";
const READINGS = process.env.PR2_READINGS ?? "";
const PAGES = ["/dashboard", "/queries", "/todo", "/agents", "/queries/packages", "/manuscripts/versions", "/manuscripts/comps"];

/** the shell's DOM, with React's generated ids taken out (a wrapper component above a page shifts them, which is not a
 *  change anyone can see) and the stage's own scroll memory ignored */
const dom = (page: Page) => page.evaluate(() => {
  const root = document.querySelector(".ws-app") as HTMLElement | null;
  if (!root) return "";
  /* time-driven arcs (a progress dial's stroke-dasharray) move by hundredths between two captures taken seconds apart:
     rounded to whole units they still record any real change of shape */
  return root.outerHTML.replace(/«[^»]*»|:r[0-9a-z]+:/g, "«id»")
    .replace(/stroke-dasharray="([\d. ]+)"/g, (_m, v: string) => `stroke-dasharray="${v.split(" ").map((x) => Math.round(Number(x))).join(" ")}"`)
    .replace(/\s+/g, " ");
});

async function capture(browser: Browser, baseURL: string, path: string) {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE });
  const page = await ctx.newPage();
  await openRoute(page, path, { width: 1440, height: 900 });
  if (MUTATE === "R14" && baseURL !== BASE) await page.addStyleTag({ content: "@media (min-width: 768px) { .ws-pagebar, .ws-app { outline: 3px solid red !important; } }" });
  await page.waitForTimeout(2500);
  const shot = await page.screenshot();
  const html = await dom(page);
  await ctx.close();
  return { shot, html };
}

test.describe("PR2 R14 desktop unchanged", () => {
  test.skip(!BASE, "PR2_BASE_URL is the base build's preview");
  test("R14 at 1440 × 900 the seven desktop pages match the base build, pixel for pixel and in the DOM", async ({ browser, baseURL }) => {
    test.setTimeout(900_000);
    const rows: { path: string; px: number; noise: number; total: number; domSame: boolean; domNoise: boolean; firstDiff: string }[] = [];
    mkdirSync("reports/phone-round-two-v1/desktop", { recursive: true });
    for (const path of PAGES) {
      const base = await capture(browser, BASE, path);
      const mine = await capture(browser, baseURL!, path);
      /* the base against itself: the page's own render noise (anti-aliasing, a decoded image), the floor any difference
         is read against */
      const again = await capture(browser, BASE, path);
      const diff = (x: Buffer, y: Buffer) => {
        const a = PNG.sync.read(x), b = PNG.sync.read(y);
        if (a.width !== b.width || a.height !== b.height) return -1;
        let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n += 1;
        return n;
      };
      const px = diff(base.shot, mine.shot);
      const noise = diff(base.shot, again.shot);
      const a = PNG.sync.read(base.shot);
      let at = 0; while (at < base.html.length && base.html[at] === mine.html[at]) at += 1;
      const name = path.replace(/\W+/g, "-").replace(/^-/, "");
      writeFileSync(`reports/phone-round-two-v1/desktop/${name}-base.png`, base.shot);
      writeFileSync(`reports/phone-round-two-v1/desktop/${name}-this.png`, mine.shot);
      /* the DOM is compared against BOTH base captures: a mounted page measuring itself (the hidden dashboard's
         --df1-* sizes) can land in one capture and not the other, so the base is not always equal to itself */
      rows.push({ path, px, noise, total: a.width * a.height, domSame: mine.html === base.html || mine.html === again.html, domNoise: base.html !== again.html, firstDiff: base.html === mine.html ? "" : `${base.html.slice(Math.max(0, at - 60), at + 80)}  ⟂  ${mine.html.slice(Math.max(0, at - 60), at + 80)}` });
    }
    if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock: "R14", mutate: MUTATE || null, data: rows }) + "\n");
    expect(rows.length).toBe(PAGES.length);
    for (const r of rows) {
      expect(r.total, `${r.path}: a screenshot was taken`).toBeGreaterThan(0);
      expect(r.px, `${r.path}: differing pixels (the base against itself differs by ${r.noise})`).toBeLessThanOrEqual(r.noise);
      expect(r.domSame, `${r.path}: the DOM differs at ${r.firstDiff}`).toBe(true);
    }
  });
});

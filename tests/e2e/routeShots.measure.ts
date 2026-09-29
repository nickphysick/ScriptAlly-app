/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLEANUP PROOF — every route at 1440 × 900, full page, captured BEFORE and AFTER a deletion, then
 * compared pixel by pixel in the browser. A cleanup that removed something still in use shows as a
 * changed route.
 *
 *   SHOTS_TAG=before …   capture into reports/cleanup-v12/shots/before/
 *   SHOTS_TAG=after  …   capture into …/after/
 *   SHOTS_COMPARE=1  …   compare the two sets (SHOTS_A / SHOTS_B, default before / after); fails on
 *                        any route that differs. Run it on two BEFORE captures first: that is the noise.
 *
 * ⚠️ CAPTURE BOTH SETS IN ONE SESSION, ON ONE DAY. The calendar and the Birds-eye view draw a window
 * centred on today, so a reference carried to another day differs with no code change at all.
 *
 * ⚠️ AND THE SWEEP IS A STATE, NOT A ROUTE. The rules this cleanup removes belonged to the sweep's
 * sheets, which no route renders until "Start the sweep" is pressed — so the spec opens it too
 * where the account has a sweep card, and says so plainly where it cannot.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { ensureSignedIn } from "./measure";
import { gotoTodo, openTaskInView } from "./todoOpen";
import { ACCOUNT_SECTION_PATHS } from "../../src/lib/accountRoutes";

const ROOT = "reports/cleanup-v12/shots";
const TAG = process.env.SHOTS_TAG || "before";
const MARKETING = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy"];
const WORKSPACE = ["/dashboard", "/queries", "/queries/analytics", "/todo", "/todo/calendar", "/todo/noteboard", "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import", "/account", "/plans", "/help", ...ACCOUNT_SECTION_PATHS];
const slug = (p: string) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "-"));

async function settle(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}

test.describe(() => {
  test.skip(!!process.env.SHOTS_COMPARE, "capture run only");
  test(`capture every route at 1440 (${TAG})`, async ({ page }) => {
    test.setTimeout(900_000);
    const out = `${ROOT}/${TAG}`;
    mkdirSync(out, { recursive: true });
    await ensureSignedIn(page);
    let n = 0;
    /* SHOTS_ONLY=/queries,/todo — re-capture a few routes to isolate a difference */
    const only = process.env.SHOTS_ONLY ? process.env.SHOTS_ONLY.split(",") : null;
    for (const p of [...WORKSPACE, ...MARKETING].filter((x) => !only || only.includes(x))) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(p);
      /* ⚠️ NOT `networkidle`: Firestore holds its listeners open, so the network never idles and
         every route waited the full 30s — the first capture ran out of time at route 20. */
      await page.waitForLoadState("load").catch(() => {});
      await page.waitForTimeout(2500); /* data listeners settle; the loading covers lift */
      await settle(page);
      await page.screenshot({ path: `${out}/${slug(p)}.png`, fullPage: true });
      n++;
    }
    /* ⚠️ THE SWEEP IS A STATE. Its live door is the task pane's "Update the record" on one agent's
       data-quality card (the fix journey hands off to it); "Start the sweep" has had no caller since
       19 Aug. Open tasks in the list until the pane offers that button, press it, capture the sheet. */
    let swept = false;
    if (!only) await gotoTodo(page, "list");
    for (let i = 0; i < 40 && !swept && !only; i++) {
      try { await openTaskInView(page, "list", i, { navigate: false }); } catch { break; }
      const upd = page.getByRole("button", { name: /^Update the record$/ });
      if (await upd.count()) {
        await upd.first().click();
        await page.locator('[aria-label="Housekeeping sweep"]').first().waitFor({ timeout: 10_000 });
        await settle(page);
        await page.screenshot({ path: `${out}/zz-sweep-dq.png`, fullPage: false });
        swept = true;
      } else {
        await page.keyboard.press("Escape");
      }
    }
    console.log(`SHOTS ${TAG}: ${n} routes${swept ? " + the sweep open" : " — the sweep could NOT be opened on this account"}`);
    expect(n).toBe(only ? only.length : WORKSPACE.length + MARKETING.length);
  });
});

test("compare before and after", async ({ page }) => {
  test.skip(!process.env.SHOTS_COMPARE, "compare run only");
  test.setTimeout(600_000);
  const A = process.env.SHOTS_A || "before", B = process.env.SHOTS_B || "after";
  const files = readdirSync(`${ROOT}/${A}`).filter((f) => f.endsWith(".png"));
  /* a full set is ~29 routes; an isolation re-capture (SHOTS_ONLY) is one or two */
  expect(files.length).toBeGreaterThan(A.startsWith("iso") ? 0 : 20);
  const changed: string[] = [];
  await page.goto("about:blank");
  for (const f of files) {
    const a = `${ROOT}/${A}/${f}`, b = `${ROOT}/${B}/${f}`;
    if (!existsSync(b)) { changed.push(`${f}: missing after`); continue; }
    const res = await page.evaluate(async ([x, y]) => {
      const load = async (s: string) => { const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode(); return i; };
      const [i1, i2] = [await load(x), await load(y)];
      if (i1.width !== i2.width || i1.height !== i2.height) return { diff: -1, w: i1.width, h: i1.height, w2: i2.width, h2: i2.height };
      const c = (i: HTMLImageElement) => { const k = document.createElement("canvas"); k.width = i.width; k.height = i.height; const g = k.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const d1 = c(i1), d2 = c(i2);
      let diff = 0;
      for (let p = 0; p < d1.length; p += 4) if (d1[p] !== d2[p] || d1[p + 1] !== d2[p + 1] || d1[p + 2] !== d2[p + 2]) diff++;
      return { diff, w: i1.width, h: i1.height };
    }, [readFileSync(a).toString("base64"), readFileSync(b).toString("base64")] as const);
    console.log(`CMP ${f} ${JSON.stringify(res)}`);
    if (res.diff !== 0) changed.push(`${f}: ${JSON.stringify(res)}`);
  }
  expect(changed, changed.join("\n")).toEqual([]);
});

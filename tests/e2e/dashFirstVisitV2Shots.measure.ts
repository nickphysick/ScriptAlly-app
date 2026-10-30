/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — one shot beside each reference screen (design-refs/dashboard-first-visit-v2/screens/*), at
 * 1512×982 and 1280×800, into reports/dashboard-first-visit-v2/shots/. Every state is set up through seedFv2.mjs and put
 * back in the same run. FV2_SHOTS=<name>[,<name>] picks which (default: all).
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-first-visit-v2/shots";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const PRE = "db60-pre";
const Q = "seed-ms-1";
const seed = (a: string) => execSync(`node tests/e2e/seedFv2.mjs ${a}`, { encoding: "utf8" });
const dump = () => JSON.parse(seed(`dump ${PRE}`).trim().split("\n").pop()!);

async function open(page: Page, vp: { width: number; height: number }, ms: string, flags: Record<string, unknown> = {}) {
  await page.addInitScript(([m, f]) => { Object.assign(window, f); try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ } }, [ms, flags] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1800);
}
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${DIR}/${name}-${w}.png` });

type Shot = { name: string; run: (page: Page, vp: { width: number; height: number }) => Promise<void> };
const SHOTS: Shot[] = [
  { name: "01-first-visit-querying", run: async (p, vp) => { seed("stage early"); try { await open(p, vp, PRE, { __SA_DASH_NO_AGENTS: true }); await shot(p, "01-first-visit-querying", vp.width); } finally { seed("stage starting"); } } },
  { name: "02-04-tour", run: async (p, vp) => {
    seed("tour-reset");
    try {
      await open(p, vp, PRE);
      for (let i = 1; i <= 3; i++) {
        await vis(p, `[data-fv2="tour"][data-stop="${i}"] [data-pck="card"]:not([style*="hidden"])`).waitFor({ timeout: 15_000 });
        await p.waitForTimeout(400);
        await shot(p, `0${i + 1}-tour-stop-${i}`, vp.width);
        if (i < 3) await vis(p, '[data-fv2="tour-next"]').click();
      }
      await vis(p, '[data-fv2="tour-next"]').click();
      await p.waitForTimeout(1500);
    } finally { seed("tour-done"); }
  } },
  { name: "05-first-visit-not-yet", run: async (p, vp) => { const s = dump().msStatus; seed(`status ${PRE} "Ready to Query"`); try { await open(p, vp, PRE, { __SA_DASH_NO_AGENTS: true }); await shot(p, "05-first-visit-not-yet", vp.width); } finally { seed(`status ${PRE} "${s}"`); } } },
  { name: "06-still-writing", run: async (p, vp) => { await open(p, vp, PRE, { __SA_DASH_NO_AGENTS: true }); await shot(p, "06-still-writing", vp.width); } },
  { name: "07-change-answer-open", run: async (p, vp) => { await open(p, vp, PRE, { __SA_DASH_NO_AGENTS: true }); await vis(p, '[data-fv1="change"]').click(); await p.waitForTimeout(300); await shot(p, "07-change-answer-open", vp.width); } },
  { name: "08-import-left-halfway", run: async (p, vp) => {
    seed("draft-clear");
    try {
      await open(p, vp, PRE);
      await p.goto("/import");
      await p.locator('input[data-picker="template"]').setInputFiles("tests/e2e/fixtures/fv2-tracker-31.xlsx");
      await vis(p, '[data-im="summary"] [data-im="primary"]').click();
      await vis(p, '[data-im="deck"]').waitFor({ timeout: 20_000 });
      for (let i = 0; i < 23; i += 1) { await vis(p, '[data-im="deck-card"]').getByRole("button", { name: "Carry on without an agency" }).click(); await p.waitForTimeout(120); }
      await p.waitForTimeout(2500);
      await open(p, vp, PRE);
      await vis(p, '[data-fv2-card="resume"]').waitFor({ timeout: 15_000 });
      await shot(p, "08-import-left-halfway", vp.width);
    } finally { seed("draft-clear"); }
  } },
  { name: "09-one-agent", run: async (p, vp) => { const s = dump().msStatus; seed(`status ${PRE} "Ready to Query"`); try { await open(p, vp, PRE); await shot(p, "09-one-agent", vp.width); } finally { seed(`status ${PRE} "${s}"`); } } },
  { name: "11-12-reminder", run: async (p, vp) => {
    seed("g1-prep");
    try {
      await open(p, vp, Q);
      await vis(p, '[data-fv2="reminder-ask"]').scrollIntoViewIfNeeded();
      await shot(p, "11-first-query-reminder-ask", vp.width);
      await vis(p, '[data-fv2="reminder-yes"]').click();
      await p.waitForTimeout(800);
      await shot(p, "12-reminder-answered", vp.width);
      await p.waitForTimeout(1200);
    } finally { seed("g1-restore"); }
  } },
  { name: "13-first-query-closed-tab", run: async (p, vp) => { await open(p, vp, Q); await vis(p, '[data-df1-q="closed"]').click(); await p.waitForTimeout(500); await shot(p, "13-first-query-closed-tab", vp.width); } },
  { name: "14-all-closed", run: async (p, vp) => { seed("between-make"); try { await open(p, vp, "fv2-between"); await shot(p, "14-all-closed", vp.width); } finally { seed("between-clean"); } } },
  { name: "15-all-set-up", run: async (p, vp) => { seed(`h1-prep ${Q}`); seed(`h1-finish ${Q}`); try { await open(p, vp, Q); await vis(p, '[data-fv2="finish"]').waitFor({ timeout: 15_000 }); await p.waitForTimeout(700); await shot(p, "15-all-set-up", vp.width); } finally { seed(`h1-restore ${Q}`); } } },
  { name: "16-example-dashboard", run: async (p, vp) => { await open(p, vp, PRE); await vis(p, '[data-fv2="example-link"]').click(); await vis(p, '[data-fv2="example"] [data-d58="page"][data-loading="0"]').waitFor({ timeout: 15_000 }); await p.waitForTimeout(1600); await shot(p, "16-example-dashboard", vp.width); } },
];

const PICK = process.env.FV2_SHOTS?.split(",");
for (const s of SHOTS.filter((x) => !PICK || PICK.includes(x.name))) {
  for (const vp of SIZES) {
    test(`shot ${s.name} ${vp.width}`, async ({ page }) => {
      test.setTimeout(240_000);
      mkdirSync(DIR, { recursive: true });
      await s.run(page, vp);
    });
  }
}

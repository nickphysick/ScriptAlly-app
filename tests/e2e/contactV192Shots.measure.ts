/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.2 — the report's screenshots, one beside each design-refs/contact-list-v19-2/screens/* file, at the
 * same size (1512 × 900 or 1280 × 800 at 2×) and in the same state. Writes reports/contact-list-v19-2/shots/<name>.png.
 *
 * ⚠️ THE HARNESS ACCOUNT, NOT NICK'S: the pack asks for Nick's own account; the harness can only sign in as itself. It
 *    has no imported or long-overdue agents, so 02 and 03 seed temporary `zz192-*` agents (cl192Fixtures.ts) — two
 *    imported, one through the column matcher's builder, one hand-added; four overdue at 10, 30, 31 and 400 days — and
 *    remove them, with everything naming them, before the run ends.
 * ⚠️ THE GUIDE IS PUT BACK: its state is recorded first, marked seen with "pin" done, and restored exactly.
 */
import { test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openContacts16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";
import { type FixKey, fixId, scopedMs, withFixtures } from "./cl192Fixtures";

test.use({ deviceScaleFactor: 2 });
const OUT = "reports/contact-list-v19-2/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;

const shot = async (page: Page, name: string, vp: { width: number }) => {
  mkdirSync(OUT, { recursive: true });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-${vp.width}@2x.png` });
};
const fresh = async (page: Page, vp: { width: number; height: number }) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp);
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const waitRows = async (page: Page, keys: FixKey[]) => {
  for (const k of keys) await vis(page, `.aglist [data-clv='row'][data-agent-card="${fixId(k)}"]`).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
};
/** scroll so the given row sits just under the sticky headings */
const bringUp = (page: Page, id: string, gap = 30) => page.evaluate(async ({ id, gap }) => {
  const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0);
  const sc = row?.closest<HTMLElement>(".wpg-scroll"); if (!row || !sc) return;
  const head = [...document.querySelectorAll<HTMLElement>(".lt-labels.lth")].find((e) => e.getBoundingClientRect().height > 0);
  sc.style.scrollBehavior = "auto";
  for (let i = 0; i < 3; i++) {
    const want = (head?.getBoundingClientRect().bottom ?? 200) + gap;
    sc.scrollTop += row.getBoundingClientRect().top - want;
    await new Promise((r) => setTimeout(r, 300));
  }
}, { id, gap });

test("CL192 shots", async ({ page }) => {
  test.setTimeout(900_000);
  const g0 = guideNow();
  try {
    sh("node tests/e2e/guideFlags.mjs --seen --done pin");
    /* 01 · unpinned, at the top */
    for (const vp of SIZES) { await fresh(page, vp); await shot(page, "01-unpinned-top", vp); }
    /* 02 · unpinned, scrolled to the imported rows */
    await fresh(page, SIZES[0]);
    const imp: FixKey[] = ["mat", "imp1", "imp2", "hand"];
    await withFixtures(imp, await scopedMs(await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"))), async () => {
      for (const vp of SIZES) {
        await fresh(page, vp); await waitRows(page, imp);
        await bringUp(page, fixId("mat"), 60);
        await shot(page, "02-unpinned-imported", vp);
      }
    });
    /* 03 · pinned, grouped by Status, scrolled to the Queried group's overdue rows */
    await fresh(page, SIZES[0]);
    const od: FixKey[] = ["od10", "od30", "od31", "od400"];
    await withFixtures(od, await scopedMs(await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"))), async () => {
      for (const vp of SIZES) {
        await fresh(page, vp); await waitRows(page, od);
        await vis(page, "[data-cl19='pin']").click(); await page.waitForTimeout(900);
        await vis(page, "button.cl19-grp").click(); await page.waitForTimeout(400);
        await vis(page, '[data-opt="group:status"]').click(); await page.waitForTimeout(900);
        await bringUp(page, fixId("od10"), 80);
        await shot(page, "03-pinned-overdue", vp);
        await vis(page, "[data-cl19='group-stop']").click(); await page.waitForTimeout(700);
        await vis(page, "[data-cl19='pin']").click(); await page.waitForTimeout(900);
      }
    });
  } finally {
    sh(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
  }
});

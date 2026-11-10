/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 — the report's screens: the build at each reference moment (01–09 logging, 10–14 editing), then each
 * pair side by side (ref left, build right) and, for 01–09, a pixel diff with its mismatch percentage. The diff is
 * drawn in the browser from the two PNGs (no image library on this machine): a pixel is a mismatch when any channel
 * differs by more than 32 of 255; the diff image shows matches faded and mismatches in red.
 * Every log is undone in the same run.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openLog, panel, settledReady } from "./laqLib";
import { ensureSignedIn } from "./measure";

const OUT = "reports/log-a-query-v1-1";
const SHOTS = `${OUT}/shots`, SBS = `${OUT}/side-by-side`;
const REF = "design-refs/log-a-query-v1-1/screens";
const EQID = "seed-query-10";
const P = (page: Page) => page.locator('[data-qls="root"]');
const step = (page: Page) => P(page).getAttribute("data-step");
async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(700);
  await panel(page).screenshot({ path: `${SHOTS}/${name}.png`, animations: "disabled" });
}

test.describe.configure({ mode: "serial" });

test("logging 01–09", async ({ page }) => {
  test.setTimeout(900_000);
  await openLog(page);
  await shot(page, "01-agent");
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  await shot(page, "02-sent");
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await shot(page, "03-materials");
  if (await page.locator('[data-qls="choose-pieces"]').count()) {
    await page.locator('[data-qls="choose-pieces"]').click();
    await shot(page, "04-materials-pieces");
    await page.locator('[data-qls="back-packages"]').click().catch(() => {});
  }
  if (await page.locator('[data-qls="package"]').count()) await page.locator('[data-qls="package"]').first().click();
  else await page.locator('[data-qls="pieces-continue"]').click();
  if ((await step(page)) === "how") { await shot(page, "05-how"); await page.locator('[data-qls="how-opt"]').first().click(); }
  await expect(P(page)).toHaveAttribute("data-step", "check");
  await shot(page, "06-check");
  await page.locator('[data-qls="step"][data-k="when"]').click();
  await shot(page, "07-back-to-sent-from-track");
  await page.locator('[data-qls="when-opt"][data-k="today"]').click();
  await expect(P(page)).toHaveAttribute("data-step", "check");
  /* 08 — the celebration, then its Undo */
  await page.locator('[data-qls="log"]').click();
  await page.locator('[data-qls="yay"]').waitFor({ state: "visible", timeout: 180_000 });
  await page.waitForTimeout(3200);
  await shot(page, "08-celebration");
  await page.locator('[data-qls="undo"]').click();
  await expect(P(page)).toHaveAttribute("data-step", "check", { timeout: 180_000 });
  /* 09 — Log and start another, the next agent lands on the check; the first is undone from the toast */
  await page.locator('[data-qls="log-more"]').click();
  await expect(P(page)).toHaveAttribute("data-step", "who", { timeout: 180_000 });
  const undo = page.locator('[data-qls="toast-undo"]');
  await page.locator(`[data-qls="agent"][data-id="${await settledReady(page)}"]`).click();
  if ((await step(page)) === "how") await page.locator('[data-qls="how-opt"]').first().click();
  await expect(P(page)).toHaveAttribute("data-step", "check");
  await shot(page, "09-batch-check");
  if (await undo.isVisible().catch(() => false)) await undo.click();
  else console.log("[laqScreens11] the batch toast had gone: seedLaq --clean-today removes the log");
});

test("editing 10–14", async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto("/queries"); await ensureSignedIn(page);
  await page.goto(`/queries?q=${EQID}`);
  const card = page.locator(`.spanel [data-qc152="card"][data-id="${EQID}"]`).first();
  await card.waitFor({ state: "visible", timeout: 90_000 });
  await expect.poll(() => card.locator('[data-qc152="msg"][data-activity]').count(), { timeout: 120_000 }).toBeGreaterThanOrEqual(4);
  const pan = page.locator(`.spanel:has([data-qc152="card"][data-id="${EQID}"])`).first();
  const snap = async (n: string) => { mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(600); await pan.screenshot({ path: `${SHOTS}/${n}.png` }); };
  const msg = card.locator('[data-qc152="msg"][data-activity]').nth(1);
  await msg.hover();
  await snap("10-step-edit-pill");
  await msg.locator('[data-qc152="edit-step"]').click();
  await snap("11-step-editor");
  await card.locator('[data-qc1522="edit-cancel"]').click();
  await card.locator('[data-qc152="pencil"]').click();
  await snap("12-edit-mode-tracking");
  await card.locator('[data-qc152="tab"][data-tab="agent"]').click();
  const on = await card.locator('[data-qc152="reply-opt"].on').getAttribute("data-w").catch(() => null);
  await card.locator(`[data-qc152="reply-opt"][data-w="${on === "12" ? 6 : 12}"]`).click();
  await snap("13-edit-mode-agent-changed");
  await card.locator('[data-qc152="edit-stop"]').click();
  await snap("14-edit-mode-leave-check");
  await card.locator('[data-qc152="leave-lose"]').click();
});

const LOG = ["01-agent", "02-sent", "03-materials", "04-materials-pieces", "05-how", "06-check", "07-back-to-sent-from-track", "08-celebration", "09-batch-check"];
const EDIT = ["10-step-edit-pill", "11-step-editor", "12-edit-mode-tracking", "13-edit-mode-agent-changed", "14-edit-mode-leave-check"];
const uri = (p: string) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

test("side by side, and the diffs", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(SBS, { recursive: true });
  await page.setViewportSize({ width: 1800, height: 1000 });
  const table: Record<string, number | null> = {};
  for (const k of [...LOG, ...EDIT]) {
    const ref = `${REF}/${k}.png`, mine = `${SHOTS}/${k}.png`;
    if (!existsSync(ref) || !existsSync(mine)) { table[k] = null; continue; }
    const diff = LOG.includes(k);
    await page.setContent(`<body style="margin:0;background:#f4f0ea;font:14px Georgia,serif;color:#1c130f">
      <div id="w" style="display:flex;gap:24px;padding:20px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Ref · ${k}</figcaption><img id="a" src="${uri(ref)}"></figure>
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Build · ${k}</figcaption><img id="b" src="${uri(mine)}"></figure>
        ${diff ? `<figure style="margin:0"><figcaption id="dc" style="margin:0 0 8px">Diff</figcaption><canvas id="d"></canvas></figure>` : ""}
      </div></body>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    if (diff) {
      table[k] = await page.evaluate(() => {
        const a = document.getElementById("a") as HTMLImageElement, b = document.getElementById("b") as HTMLImageElement;
        const w = Math.max(a.naturalWidth, b.naturalWidth), h = Math.max(a.naturalHeight, b.naturalHeight);
        const ctx = (img: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const A = ctx(a), B = ctx(b);
        const d = document.getElementById("d") as HTMLCanvasElement; d.width = w; d.height = h;
        const dx = d.getContext("2d")!; const out = dx.createImageData(w, h);
        let bad = 0;
        for (let i = 0; i < A.length; i += 4) {
          const m = Math.abs(A[i] - B[i]) > 32 || Math.abs(A[i + 1] - B[i + 1]) > 32 || Math.abs(A[i + 2] - B[i + 2]) > 32;
          if (m) { bad++; out.data[i] = 220; out.data[i + 1] = 30; out.data[i + 2] = 30; out.data[i + 3] = 255; }
          else { const g = 255 - (255 - (A[i] + A[i + 1] + A[i + 2]) / 3) * 0.25; out.data[i] = out.data[i + 1] = out.data[i + 2] = g; out.data[i + 3] = 255; }
        }
        dx.putImageData(out, 0, 0);
        const pct = Math.round((bad / (w * h)) * 10000) / 100;
        document.getElementById("dc")!.textContent = `Diff · ${pct}% of pixels differ`;
        return pct;
      });
    } else table[k] = null;
    await page.locator("#w").screenshot({ path: `${SBS}/${k}.png` });
  }
  writeFileSync(`${OUT}/diffs.json`, JSON.stringify(table, null, 1));
  console.log("[diffs]", JSON.stringify(table));
});

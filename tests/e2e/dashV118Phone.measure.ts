/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v118.1 — phones are dashboard-mobile-v1's and must not move. `DB118_PHONE=capture` photographs /dashboard at
 * 390×844 from SA_E2E_BASE_URL under `DB118_PHONE_NAME`; `DB118_PHONE=compare` counts the pixels that differ.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openDash } from "./dm1Lib";
import { DIR } from "./db118Lib";

test.setTimeout(300_000);
const MODE = process.env.DB118_PHONE ?? "";
const NAME = process.env.DB118_PHONE_NAME ?? "after";

test("DB118-F · phone capture", async ({ page }) => {
  test.skip(MODE !== "capture");
  mkdirSync(`${DIR}/phone`, { recursive: true });
  await openDash(page, { width: 390, height: 844 });
  await page.waitForTimeout(2000);
  writeFileSync(`${DIR}/phone/${NAME}-390x844.png`, await page.screenshot());
});

test("DB118-F · phone compare", async ({ page }) => {
  test.skip(MODE !== "compare");
  const a = readFileSync(`${DIR}/phone/before-390x844.png`).toString("base64"), b = readFileSync(`${DIR}/phone/after-390x844.png`).toString("base64");
  await page.setContent("<p></p>");
  const r = await page.evaluate(async ([x, y]) => {
    const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib); let diff = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) diff++;
    return { size: `${ia.width}x${ia.height} / ${ib.width}x${ib.height}`, pixels: da.length / 4, diff };
  }, [a, b] as const);
  console.log("PHONE", JSON.stringify(r));
  writeFileSync(`${DIR}/phone/result.json`, JSON.stringify(r, null, 1));
  expect(r.diff).toBe(0);
});

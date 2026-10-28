/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD ON THE PHONE v1 — the desktop is unchanged. `DM1_PIXEL=capture` photographs /dashboard at 1512×900 and
 * 1280×800 from whatever SA_E2E_BASE_URL serves, under `DM1_PIXEL_NAME` (base | final); `DM1_PIXEL=compare` decodes the
 * two in a page and counts the pixels that differ. Run the two captures back to back, so the date-bound content is the
 * same on both.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DESKTOPS, DIR, openDash, tag } from "./dm1Lib";

test.setTimeout(420_000);
const MODE = process.env.DM1_PIXEL ?? "";
const NAME = process.env.DM1_PIXEL_NAME ?? "final";
/** the red proof: a capture with one stray rule, compared under its own name */
const CSS = process.env.DM1_PIXEL_CSS ?? "";
const B = process.env.DM1_PIXEL_B ?? "final";

test("DM1-F · desktop pixel capture", async ({ page }) => {
  test.skip(MODE !== "capture");
  mkdirSync(`${DIR}/pixel`, { recursive: true });
  for (const vp of DESKTOPS) {
    await openDash(page, vp);
    if (CSS) await page.addStyleTag({ content: CSS });
    await page.waitForTimeout(2500);
    await page.mouse.move(1, 1);
    writeFileSync(`${DIR}/pixel/${NAME}-${tag(vp)}.png`, await page.screenshot({ fullPage: false }));
  }
});

test("DM1-F · desktop pixel compare", async ({ page }) => {
  test.skip(MODE !== "compare");
  const out: Record<string, unknown> = {};
  for (const vp of DESKTOPS) {
    const a = readFileSync(`${DIR}/pixel/base-${tag(vp)}.png`).toString("base64");
    const b = readFileSync(`${DIR}/pixel/${B}-${tag(vp)}.png`).toString("base64");
    await page.setContent("<canvas></canvas>");
    const r = await page.evaluate(async ([x, y]) => {
      const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${s}`; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const da = px(ia), db = px(ib);
      let diff = 0;
      for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) diff++;
      return { size: `${ia.width}x${ia.height} / ${ib.width}x${ib.height}`, pixels: da.length / 4, diff };
    }, [a, b] as const);
    out[tag(vp)] = r;
  }
  console.log("PIXEL", JSON.stringify(out));
  writeFileSync(`${DIR}/pixel/result-${B}.json`, JSON.stringify(out, null, 1));
  for (const v of Object.values(out) as { diff: number }[]) expect(v.diff, "the desktop dashboard changed").toBe(0);
});

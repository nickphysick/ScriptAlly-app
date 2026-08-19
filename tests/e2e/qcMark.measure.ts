/** What size is the Query Centre header mark today? */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

test("current Query Centre header mark", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const wrap = document.querySelector<HTMLElement>(".wsh-mark");
    const inner = document.querySelector<HTMLElement>(".wsh-mark .os-mark");
    const img = document.querySelector<HTMLImageElement>(".wsh-mark .os-mark img");
    const svg = document.querySelector<SVGElement>(".wsh-mark .os-mark svg");
    const plate = document.querySelector<HTMLElement>(".wsh");
    const b = (e: Element | null) => e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null;
    return {
      wrapClass: wrap?.className ?? "(no .wsh-mark)",
      wrap: b(wrap), inner: b(inner), img: b(img), svg: b(svg),
      plateH: plate ? Math.round(plate.getBoundingClientRect().height) : null,
      hasArt: !!img,
      innerBorder: inner ? getComputedStyle(inner).border : "",
      innerBg: inner ? getComputedStyle(inner).backgroundColor : "",
      innerRadius: inner ? getComputedStyle(inner).borderRadius : "",
      blend: img ? getComputedStyle(img).mixBlendMode : "",
      imgOpacity: img ? getComputedStyle(img).opacity : "",
      naturalW: img ? (img as HTMLImageElement).naturalWidth : 0,
    };
  });
  console.log(`  ${JSON.stringify(r)}`);
});

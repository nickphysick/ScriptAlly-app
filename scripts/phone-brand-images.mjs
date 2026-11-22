/**
 * Phone app v2, Part 1E — renders the phone brand images into public/pwa/ from the EXISTING hawk mark
 * (public/images/queryhawk-logo.png) and wordmark (public/images/queryhawk_title.png), on the ink navy. No new drawing.
 *   node scripts/phone-brand-images.mjs
 * Writes icon-192/512, apple-touch-icon (the hawk on a navy square) and the iOS launch screens (navy, the hawk, the
 * wordmark in white). Re-run it if either source image changes.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const root = process.argv[2] ?? new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const b64 = (p) => `data:image/png;base64,${readFileSync(`${root}/public/${p}`).toString("base64")}`;
const hawk = b64("images/queryhawk-logo.png"), word = b64("images/queryhawk_title.png");
const NAVY = "#2a3a52";
const browser = await chromium.launch();
const shot = async (w, h, html, out, dpr = 1) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${NAVY};display:grid;place-items:center;overflow:hidden">${html}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${root}/public/pwa/${out}`, omitBackground: false });
  await page.close();
  console.log("wrote", out);
};
/* the icon: the hawk disc on a full navy square, 70% across (inside the maskable safe zone) */
const icon = (s) => `<img src="${hawk}" style="width:${Math.round(s * 0.7)}px;height:${Math.round(s * 0.7)}px">`;
await shot(512, 512, icon(512), "icon-512.png");
await shot(192, 192, icon(192), "icon-192.png");
await shot(180, 180, icon(180), "apple-touch-icon.png");
/* the launch screen: navy, the hawk and the wordmark (white), centred. CSS points; rendered at the device's scale. */
const launch = (w) => `<div style="display:flex;flex-direction:column;align-items:center;gap:${Math.round(w * 0.05)}px">
  <img src="${hawk}" style="width:${Math.round(w * 0.3)}px;height:${Math.round(w * 0.3)}px">
  <img src="${word}" style="width:${Math.round(w * 0.46)}px;filter:invert(1)"></div>`;
for (const [w, h, d, name] of [[375, 667, 2, "launch-750x1334.png"], [390, 844, 3, "launch-1170x2532.png"], [393, 852, 3, "launch-1179x2556.png"], [430, 932, 3, "launch-1290x2796.png"], [414, 896, 2, "launch-828x1792.png"]]) {
  await shot(w, h, launch(w), name, d);
}
await browser.close();

/**
 * HERO-1 (privacy page v1, addendum B, 2 Nov): the desktop landing card's shadow fades out on its own,
 * rather than stopping in a hard line where the hero section ends and the next one paints its ground.
 *
 *   SA_E2E_BASE_URL=<a preview of a production build> npx playwright test --project public heroShadow
 *
 * At 1440×900 and a device pixel ratio of 2, the pixel column under the card's horizontal centre is read
 * from the screenshot itself, from 1px to 90px below the card: each step changes luminance by at most
 * 4/255, and the pixel at +90 is the page's ground. `HERO_MUTATE=HERO1` puts the cut back.
 *
 * ⚠️ THE CENTRE COLUMN ALONE CANNOT SEE THE FAULT, AND TWO MORE READINGS ARE WHAT CAN. With the cut, the
 * next section paints its ground over the WHOLE shadow, so under the card's centre the column is flat
 * ground from +1px — smooth, and at the ground — and the brief's two checks pass on the broken page
 * (measured on 59a6dd73). So the lock also asks that a shadow is THERE (+2px darker than the ground by at
 * least 3/255), and reads a second column just outside the card's left edge, from 30px above its bottom to
 * 90px below, where the side shadow used to stop in a hard horizontal line.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "fs";

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const OUT = process.env.HERO_SHOTS;

test("HERO-1 · the card's shadow fades to the ground below it, with no hard step", async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.goto("/");
  await expect(page.locator(".mk-dh-card")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (process.env.HERO_MUTATE === "HERO1") await page.addStyleTag({ content: ".mk-dh{position:static!important;z-index:auto!important}" });
  await page.waitForTimeout(400);
  const geo = await page.evaluate(() => {
    const c = document.querySelector(".mk-dh-card")!.getBoundingClientRect();
    const ground = getComputedStyle(document.querySelector(".mk-lower")!).backgroundColor;
    return { x: c.left + c.width / 2, left: c.left, right: c.right, bottom: c.bottom, ground };
  });
  expect(geo.bottom + 92, "the column is inside the first screen").toBeLessThanOrEqual(900);
  const shot = await page.screenshot({ clip: { x: 0, y: Math.floor(geo.bottom) - 30, width: 1440, height: 130 } });
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}/card-bottom.png`, clip: { x: geo.left - 80, y: geo.bottom - 60, width: geo.right - geo.left + 160, height: 160 } });
    await page.screenshot({ path: `${OUT}/card-corner-left.png`, clip: { x: geo.left - 90, y: geo.bottom - 60, width: 220, height: 160 } });
    await page.screenshot({ path: `${OUT}/card-corner-right.png`, clip: { x: geo.right - 130, y: geo.bottom - 60, width: 220, height: 160 } });
  }
  /* Read the screenshot's pixels in the browser: draw the PNG on a canvas at its device size. */
  const top = Math.floor(geo.bottom) - 30;
  const r = await page.evaluate(async ({ b64, x, left, bottom, top }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const lum = (dy: number) => {
      const px = g.getImageData(Math.round(x * 2), Math.round((bottom - top + dy) * 2), 1, 1).data;
      return { l: 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2], rgb: [px[0], px[1], px[2]] };
    };
    const col = Array.from({ length: 90 }, (_, i) => lum(i + 1));
    /* The side column: 14px outside the card's left edge, from 30px above its bottom to 90px below. */
    const sideAt = (dy: number) => {
      const px = g.getImageData(Math.round((left - 14) * 2), Math.round((bottom - top + dy) * 2), 1, 1).data;
      return 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
    };
    const side = Array.from({ length: 120 }, (_, i) => +sideAt(i - 29).toFixed(2));
    return { lums: col.map((c) => +c.l.toFixed(2)), last: col[89].rgb, side };
  }, { b64: shot.toString("base64"), x: geo.x, left: geo.left, bottom: geo.bottom, top });
  const steps = r.lums.slice(1).map((l, i) => +Math.abs(l - r.lums[i]).toFixed(2));
  const worst = Math.max(...steps);
  console.log("HERO-1", JSON.stringify({ worst, at: steps.indexOf(worst) + 1, first: r.lums.slice(0, 8), last: r.last, ground: geo.ground }));
  expect(r.lums.length).toBe(90);
  expect(worst, `the largest step down the column is ${worst}/255 at +${steps.indexOf(worst) + 2}px`).toBeLessThanOrEqual(4);
  const g = geo.ground.match(/\d+/g)!.map(Number);
  for (let i = 0; i < 3; i++) expect(Math.abs(r.last[i] - g[i]), `+90px is the page's ground (${r.last} vs ${geo.ground})`).toBeLessThanOrEqual(1);
  const groundL = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2];
  expect(groundL - r.lums[1], `a shadow lies under the card (+2px ${r.lums[1]} against the ground ${groundL.toFixed(2)})`).toBeGreaterThanOrEqual(3);
  const sideSteps = r.side.slice(1).map((l, i) => +Math.abs(l - r.side[i]).toFixed(2));
  const sideWorst = Math.max(...sideSteps);
  console.log("HERO-1 side", JSON.stringify({ sideWorst, at: sideSteps.indexOf(sideWorst) - 28, around: r.side.slice(24, 36) }));
  expect(sideWorst, `beside the card the shadow has no hard line (largest step ${sideWorst}/255 at ${sideSteps.indexOf(sideWorst) - 28}px from the bottom)`).toBeLessThanOrEqual(4);
});

/* HERO-2 (hero v3, 2 Nov): the three-column strip along the card's foot. At 1440×900 its left, right and
   bottom edges are the card's (±1px), and its three columns are equal widths (±2px). `HERO_MUTATE=HERO2`
   insets the strip; `HERO2b` makes the first column wider. */
test("HERO-2 · the pillars strip is flush with the card's foot, in three equal columns", async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.goto("/");
  await expect(page.locator(".mk-dh-card")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const m = process.env.HERO_MUTATE;
  if (m === "HERO2") await page.addStyleTag({ content: ".mk-dh-pillars{margin:0 0 20px!important}" });
  if (m === "HERO2b") await page.addStyleTag({ content: ".mk-dh-pillars{grid-template-columns:2fr 1fr 1fr!important}" });
  await page.waitForTimeout(300);
  expect(await page.locator(".mk-dh-pillars").count(), "the strip is on the page").toBe(1);
  const r = await page.evaluate(() => {
    const b = (e: Element) => e.getBoundingClientRect();
    const card = b(document.querySelector(".mk-dh-card")!), strip = b(document.querySelector(".mk-dh-pillars")!);
    const cols = Array.from(document.querySelectorAll(".mk-dh-pillars > .mk-dh-pillar")).map((e) => b(e).width);
    return { card: { l: card.left, r: card.right, b: card.bottom }, strip: { l: strip.left, r: strip.right, b: strip.bottom }, cols };
  });
  console.log("HERO-2", JSON.stringify(r));
  expect(Math.abs(r.strip.l - r.card.l), "left edges").toBeLessThanOrEqual(1);
  expect(Math.abs(r.strip.r - r.card.r), "right edges").toBeLessThanOrEqual(1);
  expect(Math.abs(r.strip.b - r.card.b), "bottom edges").toBeLessThanOrEqual(1);
  expect(r.cols.length, "three columns").toBe(3);
  expect(Math.max(...r.cols) - Math.min(...r.cols), `column widths ${r.cols.map((w) => w.toFixed(1)).join(", ")}`).toBeLessThanOrEqual(2);
});

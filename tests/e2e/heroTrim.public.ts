/**
 * HT-6 (landing hero trim, 3 Nov): the trimmed heroes, measured on the rendered page.
 *   · desktop 1440×900: the sub-line is one line; the button sits ~36px under it; the button and the places
 *     bar are the same width, the label centred in it; the band below still starts above the fold.
 *   · phone 390×844: no founding heading; the hero sizes to its content, the chevron still straddles its
 *     foot, and the Birds-eye heading keeps the 84px it sat under that foot before (no new gap).
 * Both heroes' buttons still go to their founding section and focus its field (WLC-3 covers that path).
 */
import { test, expect, type Page } from "@playwright/test";

const open = async (page: Page, vp: { width: number; height: number }) => {
  await page.setViewportSize(vp);
  await page.route("**/api/waitlist", (r) => r.fulfill({ contentType: "application/json", body: '{"visible":true,"cap":50,"count":2}' }));
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); /* the places count-down */
};

test.describe("HT-6 · the trimmed heroes", () => {
  test("desktop 1440×900", async ({ page }) => {
    await open(page, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
      const sub = document.querySelector(".mk-dh-sub")!, g = document.createRange();
      g.selectNodeContents(sub);
      const lines = new Set([...g.getClientRects()].map((x) => Math.round(x.top))).size;
      const btn = document.querySelector(".mk-dh-fjoin")!, t = document.createRange();
      t.selectNodeContents(btn);
      const ink = t.getBoundingClientRect(), b = btn.getBoundingClientRect();
      return {
        lines, sub: sub.getBoundingClientRect().bottom, btnTop: b.top, btnW: b.width, btnH: b.height,
        inkMid: ink.left + ink.width / 2, btnMid: b.left + b.width / 2,
        places: box(".mk-dh .mk-places--hero")?.width ?? null, placesLeft: box(".mk-dh .mk-places--hero")?.left ?? null, btnLeft: b.left,
        head: !!document.querySelector(".mk-dh-fhead"), band: box(".mk-dh + *")?.top ?? null, vh: innerHeight,
      };
    });
    console.log("HT-6 desk", JSON.stringify(r));
    expect(r.head, "no founding heading").toBe(false);
    expect(r.lines, "the sub-line is one line at 1440").toBe(1);
    expect(Math.abs(r.btnTop - r.sub - 36), `~36px from sub-line to button (${(r.btnTop - r.sub).toFixed(1)})`).toBeLessThanOrEqual(2);
    expect(r.places, "the places bar renders").not.toBeNull();
    expect(Math.abs(r.btnW - r.places!), `button ${r.btnW} vs places bar ${r.places}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.btnLeft - r.placesLeft!), "the two share a left edge").toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.inkMid - r.btnMid), "the label is centred").toBeLessThanOrEqual(1);
    expect(r.btnH).toBe(56);
    expect(r.band!, "the band still peeks in above the fold").toBeLessThan(r.vh);
  });

  test("phone 390×844", async ({ page }) => {
    await open(page, { width: 390, height: 844 });
    const r = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const hero = box(".mk-wl-hero"), see = box(".mk-wl-see"), be = box("#mk-be-h"), btn = box(".mk-wl-fjoin"), places = box(".mk-wl-hero .mk-places--hero");
      return { heroH: hero.height, heroBottom: hero.bottom, seeMid: see.top + see.height / 2, beTop: be.top,
        btnBottom: btn.bottom, placesTop: places.top, placesBottom: places.bottom, head: !!document.querySelector(".mk-wl-fhead") };
    });
    console.log("HT-6 phone", JSON.stringify(r));
    expect(r.head, "no founding heading").toBe(false);
    expect(r.heroH, "the hero is shorter than before the trim (693.7)").toBeLessThan(693.7 - 60);
    expect(r.placesTop, "the places bar sits under the button").toBeGreaterThan(r.btnBottom);
    expect(Math.abs(r.seeMid - r.heroBottom), "the chevron straddles the hero's foot").toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.beTop - r.heroBottom - 84), `Birds-eye heading ${(r.beTop - r.heroBottom).toFixed(1)}px under the foot, as before`).toBeLessThanOrEqual(1);
  });
});

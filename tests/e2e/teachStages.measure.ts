import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-teach-v2/${n}.png`);

for (const width of [1440, 1920]) {
  test(`Phase 2 — the stages section @ ${width}`, async ({ page }) => {
    await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
    await page.evaluate(() => localStorage.setItem("scriptally_active_manuscript_id", "thin-ms"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2400);
    expect(await page.locator(".pkgt").count()).toBe(1);

    /* D4 — the section is a card, and it spans the page's content width */
    const sec = await page.locator(".pkgt-stages").evaluate((el) => {
      const c = getComputedStyle(el); const r = el.getBoundingClientRect();
      const p = (el.parentElement as HTMLElement).getBoundingClientRect();
      return {
        bg: c.backgroundColor, radius: c.borderTopLeftRadius, pad: c.padding,
        w: Math.round(r.width), parentW: Math.round(p.width),
        headSize: getComputedStyle(el.querySelector(".pkgt-stages-h")!).fontSize,
        subSize: getComputedStyle(el.querySelector(".pkgt-stages-sub")!).fontSize,
      };
    });
    console.log(`@${width} SECTION: ${JSON.stringify(sec)}`);
    expect(sec.w, "the section does not span the page's content width").toBe(sec.parentW);
    expect(sec.radius).toBe("16px");

    /* the three stage columns must measure equal */
    const cols = await page.locator(".pkgt-stage-grid").evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(" ").map((v) => Math.round(parseFloat(v))));
    console.log(`@${width} grid tracks: ${cols.join(" | ")}`);
    expect(cols[0], "stage columns 1 and 2 differ").toBe(cols[2]);
    expect(cols[2], "stage columns 2 and 3 differ").toBe(cols[4]);
    expect(cols[1], "the dash track is not 72").toBe(72);
    expect(cols[3]).toBe(72);

    /* D5 — the RENDERED dimensions the inventory table must state */
    const slots = await page.evaluate(() => {
      const r = (el: Element | null) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return `${Math.round(b.width)}×${Math.round(b.height)}`;
      };
      return {
        caroSlot: r(document.querySelector(".pkgt-caro-slot")),
        caroSvg: r(document.querySelector(".pkgt-caro-slot svg")),
        disc: r(document.querySelector(".pkgt-disc")),
        discSvg: r(document.querySelector(".pkgt-disc svg")),
        printed: [...document.querySelectorAll(".pkgt-slotlbl")].map((e) => (e as HTMLElement).innerText),
      };
    });
    console.log(`@${width} D5 RENDERED: ${JSON.stringify(slots)}`);

    /**
     * ⚠️ THE PLACEHOLDERS STAY DASHED (D5) — sizes changed, nature did not.
     */
    const dashed = await page.evaluate(() => {
      const c = (s: string) => { const e = document.querySelector(s); return e ? getComputedStyle(e).borderTopStyle : null; };
      return { caro: c(".pkgt-caro-slot"), disc: c(".pkgt-disc") };
    });
    console.log(`@${width} dashed: ${JSON.stringify(dashed)}`);
    expect(dashed.caro).toBe("dashed");
    expect(dashed.disc).toBe("dashed");

    /**
     * The Playfair descender sweep.
     *
     * ⚠️ `scrollHeight > clientHeight` FALSE-POSITIVES BY ONE PIXEL ON A FRACTIONAL LINE BOX, and
     * the standing law states the check in exactly that form. Both are integers; a line box of
     * 44.19px gives `clientHeight 44` and `scrollHeight 45`, so the boolean fires on 0.81px of
     * rounding rather than on lost ink. Measured here at three line-heights: the real overflow
     * against the FRACTIONAL rect stayed sub-pixel at every one — 0.81 at 1.3, 0.11 at 1.35, 0.41
     * at 1.4 — so raising the leading does not clear it, because there is nothing to clear.
     *
     * ⚠️ THE TELL IS THAT THE BOOLEAN DISAGREES WITH ITSELF. "Add your materials" has the same
     * 0.41px overflow as a heading the check called clean; the only difference is which side of .5
     * its height rounds to. So the comparison is against the fractional box with a 1px threshold —
     * which still catches the real thing: the hero's `1.18` was 2px, and no rounding of a single
     * boundary can produce that.
     */
    const clip = await page.evaluate(() => {
      const out: unknown[] = [];
      for (const el of document.querySelectorAll(".pkgt-stage h5, .pkgt-stages-h")) {
        const h = el as HTMLElement;
        const rect = h.getBoundingClientRect().height;
        out.push({
          t: h.innerText.slice(0, 26), desc: /[gjpqy]/.test(h.innerText),
          rect: +rect.toFixed(2), scroll: h.scrollHeight,
          over: +(h.scrollHeight - rect).toFixed(2),
        });
      }
      return out;
    });
    console.log(`@${width} PLAYFAIR: ${JSON.stringify(clip)}`);
    /* ⚠️ ASSERT THE POPULATION FIRST — an empty sweep reports no crops and proves nothing. */
    expect(clip.length, "no Playfair headings were measured").toBeGreaterThan(3);
    expect((clip as { desc: boolean }[]).some((c) => c.desc),
      "not one heading sampled has a descender — this proves nothing").toBe(true);
    const cropped = (clip as { t: string; over: number }[]).filter((c) => c.over >= 1);
    console.log(`@${width} genuinely cropping: ${cropped.length}`);
    expect(cropped, "a Playfair heading is losing ink").toEqual([]);

    await page.screenshot({ path: SHOT(`stages-${width}`) });
    await page.locator(".pkgt-stages").screenshot({ path: SHOT(`stages-only-${width}`) });
  });
}

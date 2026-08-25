import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(480_000);

for (const width of [1440, 1920]) {
  test(`the stationery band @ ${width}`, async ({ page }) => {
    await openRoute(page, "/queries", { width, height: 1000 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2600);
    const qc = page.locator(".qc-wpg");
    const rows = qc.locator(".f12-row");
    let at = -1;
    for (let i = 0; i < 25; i++) {
      await rows.nth(i).click(); await page.waitForTimeout(300);
      if (await qc.locator(".qc-stat").count()) { at = i; break; }
    }
    expect(at, "no packaged query renders the band").toBeGreaterThan(-1);

    const m = await qc.evaluate((r) => {
      const card = r.querySelector(".qc-stat") as HTMLElement;
      const head = r.querySelector(".qc-stat-head") as HTMLElement;
      const h4 = r.querySelector(".qc-stat-head h4") as HTMLElement;
      const lbl = r.querySelector(".qc-stat-l") as HTMLElement;
      const cs = getComputedStyle(card), hs = getComputedStyle(head), ns = getComputedStyle(h4);
      const hr = h4.getBoundingClientRect(), lr = lbl.getBoundingClientRect();
      return {
        cardBg: cs.backgroundColor, cardShadow: cs.boxShadow.slice(0, 60),
        headBg: hs.backgroundImage.slice(0, 62),
        name: h4.innerText, nameFont: ns.fontFamily.split(",")[0], nameSize: ns.fontSize,
        /* ⚠️ FRACTIONAL RECT, 1px THRESHOLD — the ref gives no line-height and this file's history
           records two crops from mockup values. */
        nameOverflow: +(h4.scrollHeight - hr.height).toFixed(2),
        hasDescender: /[gjpqy]/.test(h4.innerText),
        labelText: lbl.innerText, labelRight: Math.round(lr.right - hr.left),
        collide: hr.right > lr.left + 1,
        pills: r.querySelectorAll(".qc-stat-body .qc-mchip").length,
        dashed: [...r.querySelectorAll(".qc-stat *")].filter((e) => getComputedStyle(e).borderTopStyle === "dashed").length,
        glyph: r.querySelectorAll(".qc-stat-glyph svg").length,
        acts: [...r.querySelectorAll(".qc-stat-acts button")].map((b) => (b as HTMLElement).innerText.trim()),
        actsOutside: !card.contains(r.querySelector(".qc-stat-acts")),
      };
    });
    console.log(`@${width} BAND: ${JSON.stringify(m)}`);
    expect(m.glyph, "no glyph").toBe(1);
    expect(m.dashed, "a dashed placeholder survives (D5)").toBe(0);
    expect(m.actsOutside, "the actions are inside the card (D4)").toBe(true);
    expect(m.collide, "the name collides with the label (D6)").toBe(false);
    expect(m.nameOverflow, "the name is cropping").toBeLessThan(1);
    await page.locator(".qc-attach").first().screenshot({ path: resolve(process.cwd(), `reports/band/band-${width}.png`) });
    await page.screenshot({ path: resolve(process.cwd(), `reports/band/page-${width}.png`) });
  });
}

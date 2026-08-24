import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-teach-v2/${n}.png`);

for (const width of [1440, 1920]) {
  test(`Phase 1 — hero de-boxed, centred, enlarged @ ${width}`, async ({ page }) => {
    /* ⚠️ THE STATE IS PER-MANUSCRIPT (`msVersions.length + msPackages.length > 0`), so it is reached
       by SELECTING a manuscript that has neither — not by deleting anything. `thin-ms` (The Quiet
       Fixture) has 0 packages and 0 versions; the page reads the shared active-manuscript key. */
    await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
    await page.evaluate(() => localStorage.setItem("scriptally_active_manuscript_id", "thin-ms"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2400);
    const root = page.locator(".pkgw, .pkgt").first();
    const teach = await page.locator(".pkgt").count();
    console.log(`@${width} teach state present: ${teach}`);
    expect(teach, "the first-visit state is not rendering — does this manuscript have packages?").toBe(1);

    /* D1 — no container behind the hero */
    const box = await page.locator(".pkgt-hero").evaluate((el) => {
      const c = getComputedStyle(el); const r = el.getBoundingClientRect();
      return {
        bg: c.backgroundColor, border: c.borderTopWidth + " " + c.borderTopStyle,
        radius: c.borderTopLeftRadius, w: Math.round(r.width), left: Math.round(r.left),
        cols: c.gridTemplateColumns, gap: c.columnGap, pad: c.padding,
      };
    });
    console.log(`@${width} HERO: ${JSON.stringify(box)}`);
    expect(box.bg, "a fill still renders behind the hero").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(box.border, "a border still renders around the hero").toMatch(/0px|none/);
    expect(box.radius).toBe("0px");

    /* D2 — a fixed second column inside a centred 1010 block */
    const [c1, c2] = box.cols.split(" ").map((v) => Math.round(parseFloat(v)));
    console.log(`@${width} columns: ${c1} + ${c2} | gap ${box.gap} | block ${box.w}`);
    expect(c2, "the carousel column is not the fixed 456").toBe(456);
    expect(box.w).toBeLessThanOrEqual(1010);
    /* centred: the margins either side of the block must agree */
    const centred = await page.locator(".pkgt-hero").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const p = (el.parentElement as HTMLElement).getBoundingClientRect();
      return { leftGap: Math.round(r.left - p.left), rightGap: Math.round(p.right - r.right) };
    });
    console.log(`@${width} centring: ${JSON.stringify(centred)}`);
    expect(Math.abs(centred.leftGap - centred.rightGap), "the hero block is not centred").toBeLessThanOrEqual(1);

    /**
     * D3 — the descender question, measured at BOTH candidate line-heights in one pass.
     * ⚠️ THE PROBE MUST SEE A DESCENDER. The check is `scrollHeight === clientHeight`; a headline
     * with no `g` or `y` passes on a cropping box, which is how 1.12 shipped once already.
     */
    const lh = await page.locator(".pkgt-h").evaluate((el) => {
      const h = el as HTMLElement;
      const text = h.innerText;
      const out: Record<string, unknown> = { text: text.slice(0, 60), hasDescender: /[gjpqy]/.test(text) };
      for (const v of ["1.18", "1.3"]) {
        h.style.lineHeight = v;
        void h.offsetHeight;
        out[v] = { scroll: h.scrollHeight, client: h.clientHeight, crops: h.scrollHeight > h.clientHeight };
      }
      h.style.lineHeight = "";
      return out;
    });
    console.log(`@${width} LINE-HEIGHT: ${JSON.stringify(lh)}`);
    expect(lh.hasDescender, "the headline has no descender — this measurement proves nothing").toBe(true);

    await page.screenshot({ path: SHOT(`hero-${width}`) });
  });
}

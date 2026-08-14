/**
 * THE COLLAPSED BAND'S BOTTOM EDGE — is it still doing work now that the colour step does?
 *
 * ⚠️ THIS IS A DECISION AID, NOT A GATE. It renders the band both ways on the deployed build and
 * reports the contrast each version has to offer, plus a screenshot pair to look at. Nothing here
 * asserts a preference — the recommendation is Nick's to accept or reject.
 *
 * ⚠️ TRANSITIONS ARE SUPPRESSED BY A STYLESHEET RULE, not an inline style, because the plate's
 * edge is a border on the element and the mark's collapse rides `::after`-adjacent rules — an
 * inline style cannot reach a pseudo-element, which is the house trap. The header state is set by
 * a real wheel gesture BEFORE the suppression goes in, so the class lands honestly and only the
 * tweening is removed for the reading.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** relative luminance, WCAG — the only honest way to compare two near-whites */
const lum = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const parse = (s: string): [number, number, number] => {
  const m = s.match(/\d+/g) ?? [];
  return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 1000) / 1000;
};

test("the band's bottom edge — with and without", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });

  /* ⚠️ THE VISIBLE SCROLLER, NOT `.first()` — every page stays mounted, so the first `.wpg-scroll`
     in the document belongs to whichever slot renders earliest. Its box is empty, the wheel goes
     nowhere, and the header never collapses. The matrix learned this the same way. */
  const handle = page.locator(".wpg-scroll");
  const n = await handle.count();
  let box: { x: number; y: number; width: number; height: number } | null = null;
  for (let i = 0; i < n; i += 1) {
    const b = await handle.nth(i).boundingBox();
    if (b && b.height > 0 && b.width > 0) { box = b; break; }
  }
  expect(box, "no visible scroller on the page — nothing to wheel over").not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);

  /* ⚠️ AFTER the state change, never before — `animation: none` does not fire `animationend`, and
     a suppressed transition freezes a reading at its START value. Both are house traps. */
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });

  const read = await page.evaluate(() => {
    /* ⚠️ THE VISIBLE GRID, for the same reason as the scroller above — a bare `querySelector(".wsh")`
       returns a mounted-but-hidden page's header, which never collapses because nothing scrolled
       it, and reports `stripped: false` about a strip that is sitting there correctly. */
    const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const wsh = g.querySelector(".wsh") as HTMLElement;
    const win = document.querySelector(".ws-window") as HTMLElement;
    const c = getComputedStyle(wsh);
    return {
      band: c.backgroundColor,
      edge: c.borderBottomColor,
      edgeW: c.borderBottomWidth,
      window: getComputedStyle(win).backgroundColor,
      stripped: wsh.classList.contains("wsh--scrolled"),
    };
  });
  expect(read.stripped, "the header did not collapse — there is no band to judge").toBe(true);

  /* the visible plate, again — and a slice of the content beneath it, because the whole question
     is whether the band separates itself from what it sits above */
  /**
   * ⚠️ THE PIXELS, NOT A CROP. A 1px line 52px down a 1440px strip is invisible in any screenshot
   * small enough to look at, so a crop cannot answer the question it was taken for — I compared two
   * of them and called them identical, which proved nothing either way. The wide shot is kept for
   * context; the ANSWER is the actual column of rendered pixels across the boundary.
   */
  const shot = async (name: string) => {
    const b = await page.locator(".wpg").filter({ visible: true }).first().boundingBox();
    await page.screenshot({
      path: `test-results/band-${name}.png`,
      clip: { x: b!.x, y: b!.y, width: b!.width, height: 170 },
    });
    const strip = await page.screenshot({
      clip: { x: b!.x + 200, y: b!.y + 44, width: 4, height: 16 },
    });
    return page.evaluate(async (b64: string) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bin], { type: "image/png" }));
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      const rows: string[] = [];
      for (let y = 0; y < bmp.height; y += 1) {
        const i = (y * bmp.width + 1) * 4;
        rows.push(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      }
      return rows;
    }, strip.toString("base64"));
  };
  const withLine = await shot("with-hairline");

  /* the same band with its edge removed — nothing else changes */
  await page.addStyleTag({ content: ".wsh--scrolled { border-bottom-color: transparent !important; }" });
  await page.waitForTimeout(120);
  const without = await shot("no-hairline");

  console.log("\n══ THE BOUNDARY, PIXEL BY PIXEL (top → bottom across the band's edge) ══");
  console.table(withLine.map((px, i) => ({
    row: i,
    "with hairline": px,
    "without": without[i],
    same: px === without[i] ? "·" : "DIFFERS",
  })));

  console.log("\n══ THE COLLAPSED BAND'S EDGE ══");
  console.table([{
    window: read.window,
    band: read.band,
    "band vs window": ratio(read.band, read.window),
    edge: `${read.edgeW} ${read.edge}`,
    "edge vs band": ratio(read.edge, read.band),
    "edge vs window": ratio(read.edge, read.window),
  }]);
  console.log("screenshots: test-results/band-with-hairline.png · test-results/band-no-hairline.png\n");
});

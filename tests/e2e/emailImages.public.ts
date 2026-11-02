/**
 * EM-8 (privacy page v1, phase 2): every committed email image is what its source draws today.
 *
 *   SA_E2E_BASE_URL=<any local preview> npx playwright test --project public emailImages
 *
 * For each image in scripts/email-images/lib.mjs's SPECS, the source is rendered again (or, for the two
 * supplied images, the original is decoded) and compared with the committed PNG-8 in public/images/email:
 * at most 1% of pixels may differ by more than 24/255 on any channel. A template edit, a font that failed
 * to load, or a hand-edited file all fail here.
 *
 * ⚠️ AND THE TWO SUPPLIED IMAGES ARE NOT THE TEMPLATE'S. pass-pending and heading-confirm are Nick's art
 * (scripts/email-images/supplied/). The templates were aligned to them to within a pixel on every ink box,
 * but the supplied art was rasterised by a different renderer and every glyph edge differs: 2.8% and
 * 4.3% of pixels, measured 2 Nov. That distance is printed and held under 5% so the templates cannot drift
 * away from the approved art unnoticed; it is not the 1% the brief hoped for, and the report says so.
 *
 * ⚠️ 1% CANNOT SEE A WRONG NUMBER, SO A GENERATED IMAGE IS HELD TO 0.1%. Drawing pass-14 with "15" changes
 * one digit, 0.86% of the image, and passed the 1% rule (measured). A generated image is re-rendered by
 * the same renderer, so it comes back identical (0.00% measured on all 54); 0.1% is the real lock and the
 * brief's 1% the ceiling over it.
 *
 * `EM_MUTATE=EM8` draws pass-14 with the number 15: the committed pass-14 must then fail.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

test.setTimeout(240_000);

test("EM-8 · every email image matches its source within 1%", async () => {
  const lib = await import("../../scripts/email-images/lib.mjs");
  const browser = await lib.launch();
  const page = await browser.newPage();
  const rows: string[] = [];
  try {
    for (const spec0 of lib.SPECS) {
      const spec = process.env.EM_MUTATE === "EM8" && spec0.name === "pass-14"
        ? { ...spec0, vars: { ...spec0.vars, BIG: "No. 15" } } : spec0;
      const sup = join(lib.ROOT, "scripts/email-images/supplied", `${spec.name}.png`);
      const supplied = existsSync(sup);
      const src = supplied ? await lib.decodeInPage(page, readFileSync(sup)) : await lib.render(browser, spec);
      const committed = await lib.decodeInPage(page, readFileSync(join(lib.OUT_DIR, `${spec.name}.png`)));
      const d = lib.diffShare(src, committed).share;
      rows.push(`${spec.name.padEnd(16)} ${(100 * d).toFixed(2)}%${supplied ? " (supplied original)" : ""}`);
      expect(d, `${spec.name}: ${(100 * d).toFixed(2)}% of pixels differ from its source`).toBeLessThanOrEqual(supplied ? 0.01 : 0.001);
      if (supplied) {
        const tpl = await lib.render(browser, spec);
        const t = lib.diffShare(tpl, committed).share;
        rows.push(`${"".padEnd(16)} template vs supplied: ${(100 * t).toFixed(2)}%`);
        expect(t, `${spec.name}: the template has drifted from the supplied art`).toBeLessThanOrEqual(0.05);
      }
    }
  } finally {
    console.log("EM-8\n" + rows.join("\n"));
    await browser.close();
  }
  expect(rows.length).toBeGreaterThanOrEqual(lib.SPECS.length);
});

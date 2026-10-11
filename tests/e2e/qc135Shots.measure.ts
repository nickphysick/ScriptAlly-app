/**
 * Query Centre v135 — the report's shots: each open header's top and the desk, beside the reference PNGs. Not a lock.
 * `QC135_SHOTS=1` to run.
 */
import { test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DIR, HEADERS, SIZES, open, prepare } from "./qc135Lib";

test.skip(!process.env.QC135_SHOTS, "shots only on request");
test("QC135 shots", async ({ page, browser }) => {
  await prepare(page);
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  const pairs: [string, string, string][] = [];
  for (const vp of SIZES) {
    for (const h of HEADERS) {
      await open(page, h.route, vp);
      const p = `${out}/header${h.route.replace(/\//g, "-")}-${vp.width}.png`; await page.screenshot({ path: p });
      pairs.push([`header${h.route.replace(/\//g, "-")}-${vp.width}`, p, `design-refs/qc-v135/ref-header-${vp.width}@2x.png`]);
      if (h.route === "/queries") {
        pairs.push([`desk-${vp.width}`, p, `design-refs/qc-v135/ref-desk-${vp.width}@2x.png`]);
        if (vp.width === 1512) {
          await page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-pick"]').click();
          await page.waitForTimeout(500);
          const s = `${out}/desk-selected-1512.png`; await page.screenshot({ path: s });
          pairs.push(["desk-selected-1512", s, "design-refs/qc-v135/ref-desk-selected-1512@2x.png"]);
          await page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-pick"]').click();
        }
      }
    }
  }
  const pg = await browser.newPage({ viewport: { width: 1700, height: 620 } });
  for (const [k, p, ref] of pairs) {
    const a = readFileSync(p).toString("base64"), r = readFileSync(ref).toString("base64");
    await pg.setContent(`<body style="margin:0;background:#222;font:13px monospace;color:#ddd"><div style="display:flex;gap:12px;padding:12px"><div><div>branch · ${k}</div><img style="width:830px;display:block" src="data:image/png;base64,${a}"></div><div><div>reference · ${ref.split("/").pop()}</div><img style="width:830px;display:block" src="data:image/png;base64,${r}"></div></div></body>`);
    await pg.waitForTimeout(300);
    writeFileSync(`${out}/compare-${k}.png`, await pg.screenshot({ fullPage: true }));
  }
  await pg.close();
});

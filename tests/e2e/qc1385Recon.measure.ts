/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 §0 — RECON. The Contact list header and the Query Centre header at 1512 × 900 and 1280 × 800
 * with the shell: the sheet, the header, its rows and their boxes. Writes reports/qc-v138-5/recon.json.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const SEL: Record<string, string[]> = {
  agents: [".cl17-hd", ".cl18-tabs", ".cl17-tr", ".cl17-tb", ".cl17-acts", ".cl17-card", ".cl17-shadow", ".cl18-lh"],
  queries: [".qc138-hd", ".qc138-tr", ".qc138-srow", ".qc138-hg", ".qc138-hawk", ".qc138-bt", ".qc138-acts", ".qc138-gr", ".qc138-cc", ".qc138-shadow", "[data-qc138=filters]", ".qc138-top", ".qc138-fb", ".qc138-wk", ".qc138-sentinel"],
};

test("v138.5 recon", async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  const out: Record<string, unknown> = {};
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) for (const [key, sels] of Object.entries(SEL)) {
    await openRoute(page, `/${key}`, vp);
    await page.waitForTimeout(1500);
    const r = await page.evaluate((sels) => {
      const R = (e: Element | null | undefined) => { if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return null; return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
      const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) ?? null;
      const sheet = [...document.querySelectorAll(".ws-window")].find((e) => e.getBoundingClientRect().width > 0);
      const o: Record<string, unknown> = { sheet: R(sheet), side: R(document.querySelector(".ws-panel")) };
      for (const s of sels) {
        const e = vis(s);
        if (!e) { o[s] = null; continue; }
        const cs = getComputedStyle(e);
        o[s] = { box: R(e), pos: cs.position, z: cs.zIndex, op: cs.opacity, tf: cs.transform, mix: cs.mixBlendMode, filter: cs.filter, ml: cs.marginLeft, mr: cs.marginRight, mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pb: cs.paddingBottom, cols: cs.gridTemplateColumns, gap: cs.columnGap, inset: cs.getPropertyValue("--cl17-inset") };
      }
      return o;
    }, sels);
    out[`${key}@${vp.width}`] = r;
    await page.screenshot({ path: `reports/qc-v138-5/recon-${key}-${vp.width}.png` });
  }
  mkdirSync("reports/qc-v138-5", { recursive: true });
  writeFileSync("reports/qc-v138-5/recon.json", JSON.stringify(out, null, 1));
  expect(Object.keys(out).length).toBe(4);
});

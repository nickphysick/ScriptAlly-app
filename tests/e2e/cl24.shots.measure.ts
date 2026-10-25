/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 — the report's shots, one beside each design-refs/contact-list-v24/screens/* file, at the same size
 * and state. Run only with `CL24_SHOTS=1` (a routine run writes nothing).
 */
import { test, type Page } from "@playwright/test";
import { SIZES, openCl24, scrollTo, shot } from "./cl24Lib";

test.skip(process.env.CL24_SHOTS !== "1", "shots only with CL24_SHOTS=1");

/** an agent who shares an agency with another, preferring one not queried beside a live colleague */
async function sameAgency(page: Page, rowSel: string): Promise<string | null> {
  return page.evaluate((sel) => {
    const rows = [...document.querySelectorAll<HTMLElement>(sel)].map((r) => ({ id: r.dataset.id ?? "", k: r.dataset.k ?? "", ag: (r.querySelector(".cl24-whot small")?.textContent ?? "").trim().toLowerCase() }));
    const by = new Map<string, typeof rows>();
    for (const r of rows) if (r.ag) by.set(r.ag, [...(by.get(r.ag) ?? []), r]);
    const groups = [...by.values()].filter((g) => g.length > 1);
    for (const g of groups) { const nq = g.find((r) => r.k === "none"); if (nq && g.some((r) => r.k === "you" || r.k === "agent")) return nq.id; }
    return groups[0]?.[0]?.id ?? null;
  }, rowSel);
}
const W = (vp: { width: number }) => (vp.width === 1512 ? "1512" : "1280");

test("CL24 shots", async ({ page }) => {
  test.setTimeout(900_000);
  for (const vp of SIZES) {
    const w = W(vp);
    await openCl24(page, vp);
    await shot(page, `01-top-${w}`);
    await scrollTo(page, 560);
    await shot(page, `02-list-scrolled-${w}`);
    await scrollTo(page, 0);
    await page.locator("[data-cl24='view'][data-k='you']").first().click();
    await page.waitForTimeout(400);
    await scrollTo(page, 560);
    await shot(page, `03-list-your-move-${w}`);
    await page.locator("[data-cl24='row'][data-k='you'] .cl24-whot").first().click();
    await page.waitForTimeout(900);
    await shot(page, `04-agent-card-your-move-${w}`);
    await page.keyboard.press("Escape");
    await page.locator("[data-cl24='view'][data-k='all']").first().click();
    await page.waitForTimeout(400);
    const twin = await sameAgency(page, "[data-cl24='row']");
    if (twin) {
      await page.locator(`[data-cl24='row'][data-id='${twin}'] .cl24-whot`).first().click();
      await page.waitForTimeout(900);
      await page.evaluate(() => document.querySelector("[data-cl24='panel'] [data-cl24='also-at']")?.scrollIntoView({ block: "center" }));
      await shot(page, `05-agent-card-same-agency-${w}`);
      await page.keyboard.press("Escape");
    }
    await page.locator("[data-cl24='view-tab'][data-v='cards']").first().click();
    await page.waitForTimeout(600);
    await scrollTo(page, 560);
    await shot(page, `06-cards-${w}`);
    await page.locator("[data-cl24='card']").first().click({ position: { x: 40, y: 20 } });
    await page.waitForTimeout(900);
    await shot(page, `07-cards-agent-card-${w}`);
    await page.keyboard.press("Escape");
    await page.locator("[data-cl24='view-tab'][data-v='list']").first().click();
    /* full screen */
    await openCl24(page, vp, { full: true });
    await page.waitForTimeout(600);
    await shot(page, `08-full-screen-${w}`);
    for (const [k, name] of [["none", "09-full-screen-not-queried"], ["agent", "11-full-screen-querying"], ["closed", "12-full-screen-closed"]] as const) {
      const id = await page.evaluate((kk) => document.querySelector<HTMLElement>(`[data-cl24='book-row'][data-k='${kk}']`)?.dataset.id ?? null, k);
      if (!id) continue;
      await page.locator(`[data-cl24='book-row'][data-id='${id}']`).first().click();
      await page.waitForTimeout(700);
      await shot(page, `${name}-${w}`);
    }
    const twinB = await sameAgency(page, "[data-cl24='book-row']");
    if (twinB) {
      await page.locator(`[data-cl24='book-row'][data-id='${twinB}']`).first().click();
      await page.waitForTimeout(700);
      await shot(page, `10-full-screen-same-agency-${w}`);
    }
  }
});

/**
 * Query Centre v132 — QC132 R1…R5 ("Recently updated") and W1…W10 ("Your queries"), at 1280 / 1512 / 1920
 * with the harness account's real data. R4 is the unit test `src/lib/qcRecent.test.ts`.
 * Ref design-refs/query-centre/query-centre-v132.html.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV132
 *
 * Every case asserts its population first: a probe that finds nothing has failed, not skipped.
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const WIDTHS = [1280, 1512, 1920];
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
/** The desk's court for each status (tileCourt), stated here so a check never reads the page's own answer back. */
const COURT: Record<string, "you" | "agent" | "closed" | null> = {
  "Queried": "agent", "Partial Sent": "agent", "Full Sent": "agent", "Resubmitted": "agent",
  "Partial Requested": "you", "Full Requested": "you", "Revise & Resubmit": "you", "Offer": "you",
  "Rejected": "closed", "No Response": "closed", "Withdrawn": null, "Signed": null,
};
const NAME = { you: "With you", agent: "With agents", closed: "Closed" } as const;

async function openQc(page: Page, w: number) {
  await inkOpen(page, "/queries", w, { scope: "qc132" });
  await expect(page.locator('[data-qcv="ru"]:not([data-sk])'), "Recently updated is on the page").toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-qcv="row"]').first(), "the list loaded").toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
}
const listState = (page: Page) => page.evaluate(() => ({
  ids: [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => r.dataset.qid).join(","),
  counts: [...document.querySelectorAll<HTMLElement>('[data-qcv="showing"], [data-qcv="ws-showing"], [data-qcv="gband"]')].map((e) => e.innerText.replace(/\s+/g, " ").trim()).join("|"),
}));
const listRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => ({ id: r.dataset.qid!, name: r.dataset.name ?? "", status: r.dataset.status ?? "" })));

test.describe("Query Centre v132 — Recently updated", () => {
  test("R1 · thirds: the lede a third, the card on the stage's left, the panel 150 right, the card 34 down, centres level", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const r = await page.evaluate(() => {
        const g = (s: string) => document.querySelector<HTMLElement>(`[data-qcv="${s}"]`)?.getBoundingClientRect() ?? null;
        const ru = g("ru"), lede = g("ru-lede"), st = g("ru-stage"), pn = g("ru-panel");
        const card = document.querySelector<HTMLElement>('[data-qcv="ru-feat"] .qcard')?.getBoundingClientRect() ?? null;
        const gap = ru ? parseFloat(getComputedStyle(document.querySelector('[data-qcv="ru"]')!).columnGap) : NaN;
        return ru && lede && st && pn && card ? { ruW: ru.width, gap, ledeW: lede.width, stL: st.left, cardL: card.left, pnL: pn.left, cardT: card.top, pnT: pn.top, ledeC: lede.top + lede.height / 2, stC: st.top + st.height / 2 } : null;
      });
      expect(r, `${w}: the section's parts`).toBeTruthy();
      const want = (r!.ruW - r!.gap) / 3;
      expect(near(r!.ledeW, want, 8), `${w}: lede ${r!.ledeW} vs a third ${want}`).toBe(true);
      expect(near(r!.cardL, r!.stL, 1), `${w}: card left ${r!.cardL} vs stage ${r!.stL}`).toBe(true);
      expect(near(r!.pnL - r!.cardL, 150, 1), `${w}: panel starts ${r!.pnL - r!.cardL} right of the card`).toBe(true);
      expect(near(r!.cardT - r!.pnT, 34, 1), `${w}: card ${r!.cardT - r!.pnT} below the panel's top`).toBe(true);
      expect(near(r!.ledeC, r!.stC, 6), `${w}: centres ${r!.ledeC} / ${r!.stC}`).toBe(true);
    }
  });

  test("R2 · each desk card scopes the section to its court, and never the list", async ({ page }) => {
    await openQc(page, 1512);
    const all = await listRows(page);
    expect(all.length, "the list has rows").toBeGreaterThan(10);
    const before = await listState(page);
    await expect(page.locator('[data-qcv="ru-title"]')).toHaveText("Recently updated");
    for (const k of ["you", "agent", "closed"] as const) {
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(350);
      await expect(page.locator('[data-qcv="ru-title"]'), `${k}: the heading`).toHaveText(NAME[k]);
      const s = await page.evaluate(() => ({
        rows: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => r.dataset.qid!),
        feat: document.querySelector<HTMLElement>('[data-qcv="ru-feat"]')?.dataset.qid ?? null,
        names: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-say"] b')].map((b) => b.innerText.trim()).filter((t) => !/things?$/i.test(t)),
      }));
      const court = new Map(all.map((r) => [r.id, COURT[r.status]]));
      const courtNames = new Set(all.filter((r) => COURT[r.status] === k).map((r) => r.name));
      expect(s.rows.length, `${k}: rows shown`).toBeGreaterThan(0);
      expect(s.rows.every((id) => court.get(id) === k), `${k}: every row is the court's ${JSON.stringify(s.rows.map((id) => court.get(id)))}`).toBe(true);
      expect(s.feat && court.get(s.feat) === k, `${k}: the featured card is the court's`).toBe(true);
      expect(s.names.length > 0 && s.names.every((n) => courtNames.has(n)), `${k}: the sentence names only the court's queries ${JSON.stringify(s.names)}`).toBe(true);
      expect(await listState(page), `${k}: the list is untouched`).toEqual(before);
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(250);
      await expect(page.locator('[data-qcv="ru-title"]'), `${k}: cleared`).toHaveText("Recently updated");
    }
  });

  test("R3 · the button states the list's total, and goes to the list without touching it", async ({ page }) => {
    await openQc(page, 1512);
    const total = (await listRows(page)).length;
    expect(total, "the list has rows").toBeGreaterThan(10);
    await page.locator('[data-qcv="court"][data-court="closed"] [data-qcv="court-pick"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-qcv="ru-all"]')).toHaveText(`See all ${total} in the list`);
    const before = await listState(page);
    await page.locator('[data-qcv="ru-all"]').click();
    await page.waitForTimeout(900);
    const at = await page.evaluate(() => {
      const t = document.querySelector<HTMLElement>('[data-qcv="ws"], [data-qcv="ledger"]')?.getBoundingClientRect();
      const sc = document.querySelector<HTMLElement>(".wpg-scroll")!.getBoundingClientRect();
      return t ? t.top - sc.top : NaN;
    });
    expect(Math.abs(at) < 140, `the list is at the top of the view (${at})`).toBe(true);
    expect(await listState(page), "no filter was set").toEqual(before);
  });

  test("R5 · Also moved: five, newest first; a row features its card; and N more", async ({ page }) => {
    await openQc(page, 1512);
    const total = (await listRows(page)).length;
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => ({ id: r.dataset.qid!, t: +(r.dataset.moved ?? NaN) })));
    expect(rows.length, "five rows").toBe(Math.min(5, total));
    const dated = rows.filter((r) => Number.isFinite(r.t));
    expect(dated.every((r, i) => i === 0 || dated[i - 1].t >= r.t), `newest first ${JSON.stringify(rows.map((r) => r.t))}`).toBe(true);
    await page.locator('[data-qcv="ru-row"]').nth(2).click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      feat: document.querySelector<HTMLElement>('[data-qcv="ru-feat"]')?.dataset.qid ?? null,
      on: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => !!r.dataset.on),
      ids: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => r.dataset.qid),
    }));
    expect(after.ids, "the rows do not change when one is featured").toEqual(rows.map((r) => r.id));
    expect(after.feat, "row 3's card is featured").toBe(rows[2].id);
    expect(after.on, "row 3 is marked featured").toEqual([false, false, true, false, false]);
    const more = (await page.locator('[data-qcv="ru-more"]').innerText()).trim();
    expect(more, "and N more").toBe(`and ${total - 5} more`);
  });
});

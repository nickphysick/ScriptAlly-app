import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";
const OUT = "/tmp/ph"; mkdirSync(OUT, { recursive: true });
const ROUTES: [string, string][] = [
  ["/queries", "query-centre"], ["/queries/analytics", "analytics"],
  ["/todo", "todo"], ["/todo/calendar", "calendar"], ["/todo/noteboard", "noteboard"],
  ["/agents", "contact-list"], ["/agents/discover", "discover"],
  ["/manuscripts", "manuscripts"], ["/manuscripts/comps", "comps"],
  ["/manuscripts/packages", "packages"], ["/import", "import"],
];
async function open(page: Page, p: string, w: number) {
  await openRoute(page, p, { width: w, height: 900 });
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(800);
}
test("the rollout census", async ({ page }) => {
  for (const w of [1280, 1440]) {
    for (const [route, name] of ROUTES) {
      await open(page, route, w);
      await page.screenshot({ path: `${OUT}/${name}-${w}.png` });
      const r = await page.evaluate(() => {
        const h = [...document.querySelectorAll("[data-probe='page-header']")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        const bar = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        if (!h) return { header: null as string | null };
        const b = h.getBoundingClientRect();
        const t = (s: string) => (h.querySelector(s)?.textContent ?? "").trim().slice(0, 44);
        return {
          header: h.dataset.size ?? null, top: bar ? Math.round(b.top - bar.getBoundingClientRect().bottom) : null,
          h: Math.round(b.height),
          eyebrow: t("[data-probe='eyebrow']"), title: t("[data-probe='title']"),
          intro: t("[data-probe='intro']") || null,
          acts: [...h.querySelectorAll("[data-probe='actions'] button")].map((e) => (e.textContent ?? "").trim()),
          art: !!h.querySelector("[data-probe='art']"),
        };
      });
      // eslint-disable-next-line no-console
      console.log(`${w} ${route} ${JSON.stringify(r)}`);
    }
  }
});

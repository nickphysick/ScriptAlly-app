import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("every open query's send rung: is the method inline?", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll("[data-qcc-id]")].map((e) => e.getAttribute("data-qcc-id")!).slice(0, 30));
  const bad: unknown[] = []; let swept = 0; const seen = new Set<string>();
  for (const id of ids) {
    await page.locator(`[data-qcc-id="${id}"]`).click();
    await page.locator(".qpn[data-on='true']").waitFor();
    const r = await page.evaluate(() => {
      const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...qpn.querySelectorAll<HTMLElement>(".tl-r1")];
      return rows.map((row) => {
        const t = row.querySelector<HTMLElement>(".tl-ttl");
        const q = row.querySelector<HTMLElement>(".tl-qual");
        if (!t || !q) return null;
        const tr = t.getBoundingClientRect(), qr = q.getBoundingClientRect();
        return { title: (t.textContent ?? "").trim(), qual: (q.textContent ?? "").trim().slice(0, 24),
                 inline: qr.top < tr.bottom && qr.left >= tr.right - 1,
                 qualDisplay: getComputedStyle(q).display, rowWrap: getComputedStyle(row).flexWrap,
                 dTop: +(qr.top - tr.top).toFixed(1) };
      }).filter(Boolean);
    });
    swept++;
    for (const row of r as { title: string; qual: string; inline: boolean; qualDisplay: string; dTop: number }[]) {
      seen.add(`${row.qualDisplay}`);
      if (!row.inline) bad.push({ id, ...row });
    }
    await page.keyboard.press("Escape");
  }
  console.log(`SWEPT ${swept} queries · qual displays seen: ${[...seen].join(",")} · NOT-INLINE: ${JSON.stringify(bad)}`);
});

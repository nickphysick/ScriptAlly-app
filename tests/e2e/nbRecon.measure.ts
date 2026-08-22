/**
 * FINISH-RUN RECON (Step 0.2 + 0.3) — measured, not assumed.
 *   SA_E2E_BASE_URL=dev npx playwright test nbRecon
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/todo/noteboard";

test("0.3 — the toolbar wrap: which element shrinks, and what its flex resolves to", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const d = await page.evaluate(() => {
    /* ⚠️ PAGES STAY MOUNTED, so the first .tpl-tools in the document is the CALENDAR's hidden
       row (w=0, cal-nav children) — the default-subject trap, measured live: the first draft of
       this probe reported that row and every number was a zero. Scope to the row that contains
       the noteboard's own search. */
    const row = Array.from(document.querySelectorAll<HTMLElement>(".tpl-tools"))
      .find((r) => r.querySelector(".nb-search") && r.getBoundingClientRect().width > 0) ?? null;
    if (!row) return null;
    const rr = row.getBoundingClientRect();
    const kids = Array.from(row.children).map((el) => {
      const e = el as HTMLElement;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return {
        cls: e.className || e.tagName, w: Math.round(r.width), h: Math.round(r.height),
        flex: `${cs.flexGrow} ${cs.flexShrink} ${cs.flexBasis}`, minW: cs.minWidth,
        scrollW: e.scrollWidth, clientW: e.clientWidth,
        overflowing: e.scrollWidth > e.clientWidth + 1,
        display: cs.display, white: cs.whiteSpace, wrap: cs.flexWrap,
      };
    });
    const rowCs = getComputedStyle(row);
    return { row: { w: Math.round(rr.width), display: rowCs.display, wrap: rowCs.flexWrap, gap: rowCs.gap }, kids,
      sum: kids.reduce((n, k) => n + k.w, 0) };
  });
  expect(d, "no .tpl-tools row").toBeTruthy();
  console.log(`[row] w=${d!.row.w} display=${d!.row.display} flex-wrap=${d!.row.wrap} gap=${d!.row.gap} · children sum=${d!.sum}`);
  for (const k of d!.kids) {
    console.log(`  ${String(k.cls).slice(0, 34).padEnd(34)} w=${String(k.w).padStart(4)} h=${String(k.h).padStart(3)} flex=[${k.flex}] minW=${k.minW} ws=${k.white} disp=${k.display}${k.overflowing ? `  ⚠️ OVERFLOWING scroll=${k.scrollW} client=${k.clientW}` : ""}`);
  }
});

test("0.2 — all three papers border VISIBLY, and a swatch click repaints the composer", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  /* the three worn papers, border by computed value — the source-order fix was verified against
     the injected cascade; this reads the SEEDED cards */
  const worn = await page.evaluate(() => {
    const out: Record<string, { bg: string; bd: string }> = {};
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(".nb-note"))) {
      const t = (el.querySelector(".nb-body") as HTMLElement | null)?.innerText ?? "";
      const m = /^NBPAPER (\w+)/.exec(t.trim());
      if (!m) continue;
      const cs = getComputedStyle(el);
      out[m[1]] = { bg: cs.backgroundColor, bd: cs.borderTopColor };
    }
    return out;
  });
  expect(Object.keys(worn).sort(), "three seeded papers not on the page").toEqual(["pink", "sage", "yellow"]);
  for (const [k, v] of Object.entries(worn)) {
    console.log(`[0.2 worn] ${k.padEnd(7)} bg=${v.bg} bd=${v.bd}`);
    expect(v.bd, `${k} border is transparent`).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(v.bg, `${k} fill is transparent`).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  }
  expect(new Set(Object.values(worn).map((v) => v.bd)).size, "three borders are not three colours").toBe(3);

  /* the swatch interaction — open the composer, click sage, read the composer's own paint.
     No write: Cancel afterwards, so recon leaves no data behind. */
  await page.locator(".nb-ghost").click();
  const before = await page.locator(".nb-compose").evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator(".nb-sw.nb-c-sage").click();
  await page.waitForTimeout(150);
  const after = await page.locator(".nb-compose").evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log(`[0.2 swatch] composer ${before} → ${after}`);
  expect(before).not.toBe(after);
  expect(after).not.toMatch(/rgba\(0, 0, 0, 0\)/);
  await page.locator(".nb-ccancel").click();
});

import { test } from "@playwright/test";
import { openRoute } from "./measure";
test("desk vs window — rects, top rule, clipping ancestors", async ({ page }) => {
  for (const width of [1440, 2560]) {
    await openRoute(page, "/queries", { width, height: 900 });
    await page.locator('[data-qcc-id="cor-move-b"]').click();
    await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
    await page.locator(".qpn .tl-more").first().waitFor();
    await page.locator(".qpn-act", { hasText: "Record response" }).first().click();
    await page.locator(".qcd-card").waitFor();
    const r = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".qcd-card")!;
      const win = document.querySelector<HTMLElement>(".ws-window")!;
      const c = card.getBoundingClientRect(); const w = win.getBoundingClientRect();
      const clippers: string[] = [];
      let el: HTMLElement | null = card.parentElement;
      while (el && el !== document.body) {
        const st = getComputedStyle(el);
        if (/(hidden|clip|auto|scroll)/.test(st.overflow + st.overflowX + st.overflowY))
          clippers.push(`${el.className.toString().slice(0, 30)}[${st.overflow}/${st.overflowY}]`);
        el = el.parentElement;
      }
      return {
        card: { top: c.top, bottom: c.bottom, h: c.height },
        win: { top: w.top, bottom: w.bottom, h: w.height },
        styleTop: card.style.top, computedTop: getComputedStyle(card).top,
        cardPos: getComputedStyle(card).position,
        qcdPos: getComputedStyle(card.parentElement!).position,
        qcdRect: card.parentElement!.getBoundingClientRect().top,
        clippers,
        stripVisible: (() => { const s = getComputedStyle(card, "::before"); return s.content !== "none" ? s.top : "n/a"; })(),
      };
    });
    console.log(`w${width}`, JSON.stringify(r, null, 1));
    await page.keyboard.press("Escape");
  }
});

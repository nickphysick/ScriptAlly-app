import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);

for (const width of [1440, 1920]) {
  test(`Part B — banded cards @ ${width}`, async ({ page }) => {
    await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
    await page.evaluate(() => localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2600);

    const m = await page.evaluate(() => {
      const r = document.querySelector(".pkgw") as HTMLElement;
      const head = r.querySelector(".sa-sechead") as HTMLElement;
      const acts = r.querySelector(".sa-secacts") as HTMLElement;
      const card = r.querySelector(".pkgb-pkgcard") as HTMLElement;
      const ch = card?.querySelector(".pkgb-cardhead") as HTMLElement;
      const tickBefore = getComputedStyle(head, "::before");
      const ghost = r.querySelector(".pkgb-ghostpkg") as HTMLElement;
      return {
        /* D3 — rule-only band with a tick */
        bandBorder: getComputedStyle(head).borderBottomWidth,
        bandBg: getComputedStyle(head).backgroundColor,
        tickW: tickBefore.width, tickBg: tickBefore.backgroundColor,
        /* the ruled order */
        actionOrder: [...(acts?.children ?? [])].map((e) => (e as HTMLElement).innerText.trim().replace(/\n/g, " ")),
        /* D4 — the card's band head */
        headBg: ch ? getComputedStyle(ch).backgroundImage.slice(0, 58) : null,
        headInk: ch ? getComputedStyle(ch).color : null,
        headLabel: ch?.querySelector(".pkgb-chlbl")?.textContent,
        headState: ch?.querySelector(".pkgb-chrt")?.textContent ?? null,
        glyphPx: ch ? getComputedStyle(ch.querySelector("svg")!).width : null,
        /* D6 — slot rows */
        slotRows: [...card.querySelectorAll(".pkgb-slotline")].map((e) =>
          (e as HTMLElement).innerText.replace(/\n/g, " ")),
        noneItalic: [...card.querySelectorAll(".pkgb-sv--none")].map((e) => getComputedStyle(e).fontStyle),
        /* D7/D8 */
        artPanels: r.querySelectorAll(".pkgb-pkgart").length,
        lockBoxes: r.querySelectorAll(".pkgb-locked").length,
        lockLines: [...r.querySelectorAll(".pkgb-lockline")].map((e) => (e as HTMLElement).innerText.replace(/\n/g, " · ")),
        /* D10 — the ghost must be shorter than a real card */
        cardH: Math.round(card.getBoundingClientRect().height),
        ghostH: ghost ? Math.round(ghost.getBoundingClientRect().height) : null,
        /* D12 */
        dashedOnCards: [...r.querySelectorAll(".pkgb-pkgcard *")].filter((e) => getComputedStyle(e).borderTopStyle === "dashed").length,
      };
    });
    console.log(`@${width} ${JSON.stringify(m)}`);
    expect(m.bandBg, "the band still has a container (D3)").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(m.tickW, "no burgundy tick (D3)").toBe("56px");
    /* ⚠️ `Show archived` IS CONDITIONAL AND ITS ABSENCE IS CORRECT — it does not render when
       nothing is archived (F-H's D5: the concept appears when it becomes true). So the assertion is
       about ORDER among what renders, not a fixed list of three. */
    const order = m.actionOrder.map((t) => t.toLowerCase());
    expect(order[0]).toContain("how it works");
    expect(order[order.length - 1]).toContain("new package");
    const arc = order.findIndex((t) => t.includes("archived"));
    if (arc > -1) expect(arc).toBe(1);
    expect(m.glyphPx, "the card glyph is not 16px (D4)").toBe("16px");
    expect(m.headLabel).toBe("Submission package");
    expect(m.artPanels, "the art panel survives (D7)").toBe(0);
    expect(m.lockBoxes, "the grey lock box survives (D8)").toBe(0);
    expect(m.dashedOnCards, "a dashed placeholder survives on a card (D12)").toBe(0);
    expect(m.ghostH!, "the ghost is not shorter than a real card (D10)").toBeLessThan(m.cardH);
    await page.screenshot({ path: resolve(process.cwd(), `reports/pkgband/partB-${width}.png`) });
  });
}

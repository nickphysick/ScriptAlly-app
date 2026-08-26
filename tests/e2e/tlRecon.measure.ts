import { test } from "@playwright/test";
import { openRoute } from "./measure";
test("Phase 0 item 4 — rows at 900px and the chrome height", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const px = (n: number) => Math.round(n * 100) / 100;
    const board = document.querySelector(".tl-board") as HTMLElement | null;
    if (!board) return { none: true as const, body: document.body.innerText.replace(/\s+/g, " ").slice(0, 120) };
    const rows = Array.from(document.querySelectorAll(".tl-row:not(.tl-head)")) as HTMLElement[];
    const head = document.querySelector(".tl-head") as HTMLElement | null;
    const vis = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.height > 0 && b.top < window.innerHeight && b.bottom > 0; });
    const cs = rows[0] ? getComputedStyle(rows[0]) : null;
    const bar = document.querySelector(".tl-seg") as HTMLElement | null;
    const disc = document.querySelector('.tl-node[data-marker="status"]') as HTMLElement | null;
    const dir = document.querySelector('.tl-node[data-marker="direction"]') as HTMLElement | null;
    const tip = document.querySelector(".tl-tip") as HTMLElement | null;
    return {
      none: false as const,
      boardTop: px(board.getBoundingClientRect().top),
      chromeAbove: px(board.getBoundingClientRect().top),
      headH: head ? px(head.getBoundingClientRect().height) : null,
      rowsTotal: rows.length,
      rowsVisible: vis.length,
      rowH: rows[0] ? px(rows[0].getBoundingClientRect().height) : null,
      laneH: cs?.getPropertyValue("--lane-h").trim() || null,
      barH: cs?.getPropertyValue("--bar-h").trim() || null,
      disc: cs?.getPropertyValue("--disc").trim() || null,
      barRect: bar ? px(bar.getBoundingClientRect().height) : null,
      discRect: disc ? px(disc.getBoundingClientRect().width) : null,
      dirRect: dir ? px(dir.getBoundingClientRect().width) : null,
      restingCaptions: document.querySelectorAll(".tl-tip").length,
      tipVisible: tip ? getComputedStyle(tip).opacity : null,
      weekendCells: document.querySelectorAll(".tl-dh.wknd, .tl-wknd, [class*=weekend]").length,
      cols: getComputedStyle(document.querySelector(".tl-grid") as HTMLElement).gridTemplateColumns.split(" ").length,
    };
  });
  console.log(JSON.stringify(m, null, 1));
  console.log("console errors:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
});

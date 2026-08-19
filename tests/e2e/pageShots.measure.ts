import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
/** the ported pane on the page, at both widths */
test("page shots", async ({ page }) => {
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/todo");
    await page.waitForTimeout(7000);
    await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => /^Send your full/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      (row as HTMLElement | undefined)?.click();
    });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `reports/port/page-${w}.png` });
  }
  const m = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const q = (s: string) => [...document.querySelectorAll(s)].filter(vis) as HTMLElement[];
    const doc = document.documentElement;
    const v = q(".tpn .v")[0];
    return {
      classes: [...new Set(q(".tpn *").map((e) => String(e.className).split(" ")[0]).filter(Boolean))].slice(0, 40),
      pageOverflow: doc.scrollHeight - doc.clientHeight,
      paneScroll: v ? `${v.clientHeight}/${v.scrollHeight}` : "ABSENT",
      band: q(".tpn .band")[0] ? getComputedStyle(q(".tpn .band")[0]).backgroundImage : "-",
      workrow: q(".tpn .workrow")[0] ? getComputedStyle(q(".tpn .workrow")[0]).display + " wrap=" + getComputedStyle(q(".tpn .workrow")[0]).flexWrap : "-",
      tpnW: q(".tpn")[0] ? Math.round(q(".tpn")[0].getBoundingClientRect().width) : -1,
    };
  });
  console.log("\nMEASURED: " + JSON.stringify(m, null, 1) + "\n");
});

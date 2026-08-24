import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);
const ROOT = ".pkgw-body";

for (const width of [1440, 1920]) {
test(`workspace @ ${width}`, async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1500);
  const root = page.locator(ROOT);

  /* precondition — this is the workspace, not the teaching state */
  expect(await root.locator(".pkgt").count(), "still on first visit").toBe(0);
  const cards = await root.locator(".pkgb-pkgcard").count();
  console.log(`@${width} package cards: ${cards}`);
  expect(cards, "no package cards — is the fixture seeded?").toBeGreaterThan(0);

  /* D-B3 — the deleted panel is GONE and its figures are on the cards */
  const shape = await root.evaluate((r) => ({
    repliesByPackagePanel: [...r.querySelectorAll("*")].filter((e) =>
      /replies by package/i.test((e.textContent || "")) && e.children.length === 0).length,
    landingPanels: r.querySelectorAll(".pkgb-land").length,
    scorecardsOnCards: r.querySelectorAll(".pkgb-pkgcard .pkgb-score").length,
    idleCards: r.querySelectorAll(".pkgb-score--idle").length,
    scoreLabels: [...r.querySelectorAll(".pkgb-pkgcard .pkgb-l")].map((e) => (e.textContent || "").trim()),
    matColumns: r.querySelectorAll(".pkgb-matcol").length,
    shelves: r.querySelectorAll(".pkgb-shelf").length,
    sheets: r.querySelectorAll(".pkgb-msheet").length,
    addCards: r.querySelectorAll(".pkgb-msheetadd").length,
    ghostPkg: r.querySelectorAll(".pkgb-ghostpkg").length,
    percentSigns: [...r.querySelectorAll(".pkgb-land *")].filter((e) =>
      e.children.length === 0 && /%/.test(e.textContent || "")).length,
  }));
  console.log(`@${width} ${JSON.stringify(shape)}`);
  expect(shape.repliesByPackagePanel, "the Replies-by-package panel is back").toBe(0);
  expect(shape.scorecardsOnCards + shape.idleCards, "its figures are not on the cards").toBe(cards);
  expect(shape.scoreLabels.slice(0, 3)).toEqual(["Sent", "Replied", "Requests"]);
  expect(shape.matColumns, "the three material columns are back").toBe(0);
  expect(shape.shelves, "no shelf").toBe(1);
  expect(shape.addCards, "the shelf must have exactly one add card").toBe(1);
  expect(shape.ghostPkg, "the ghost package card is missing").toBe(1);
  expect(shape.percentSigns, "tracking is showing a percentage").toBe(0);

  /* D-B1 — packages LEAD. Measured by document position, not by reading the JSX: the first
     screenshot of this rebuild had "Your packages" below the fold under the materials shelf. */
  const order = await root.evaluate((r) => {
    const pkg = r.querySelector(".pkgb-pkgcard");
    const shelf = r.querySelector(".pkgb-shelf");
    if (!pkg || !shelf) return null;
    return { pkgTop: Math.round(pkg.getBoundingClientRect().top),
             shelfTop: Math.round(shelf.getBoundingClientRect().top) };
  });
  console.log(`@${width} order: ${JSON.stringify(order)}`);
  expect(order, "could not find both bands").toBeTruthy();
  expect(order!.pkgTop, "materials are above the packages").toBeLessThan(order!.shelfTop);

  /* D-B5 — descenders, measured not trusted */
  const clipped = await root.evaluate((r) =>
    [...r.querySelectorAll(".pkgb-pkgname, .pkgb-mname, .pkgb-n, .pkgb-gt")]
      .map((e) => ({ cls: e.className, t: (e.textContent || "").trim().slice(0, 22),
                     lh: getComputedStyle(e).lineHeight, fs: getComputedStyle(e).fontSize,
                     s: (e as HTMLElement).scrollHeight, c: (e as HTMLElement).clientHeight }))
      .filter((x) => x.s > x.c + 1));
  const sample = await root.evaluate((r) =>
    [...r.querySelectorAll(".pkgb-pkgname, .pkgb-mname, .pkgb-n, .pkgb-gt")].slice(0, 4)
      .map((e) => `${(e.className as string).split(" ")[0]} ${getComputedStyle(e).fontSize}/${getComputedStyle(e).lineHeight}`));
  console.log(`@${width} line-heights: ${JSON.stringify(sample)}`);
  console.log(`@${width} clipped headings: ${JSON.stringify(clipped)}`);
  expect(clipped, "a heading crops its own descenders").toEqual([]);

  /* one filled control, no sideways scroll */
  const filled = await root.evaluate((r) =>
    [...r.querySelectorAll("button")].filter((b) => (b.textContent || "").trim().length > 0)
      .filter((b) => { const m = getComputedStyle(b).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) return false; const [x,y,z,a="1"] = m[1].split(",").map(v=>v.trim());
        return Number(a) >= .5 && !(Number(x)>245 && Number(y)>240 && Number(z)>232); })
      .map((b) => (b.textContent || "").trim().slice(0, 26)));
  console.log(`@${width} filled: ${JSON.stringify(filled)}`);
  const over = await page.evaluate(() => { const e = document.scrollingElement || document.documentElement; return e.scrollWidth - e.clientWidth; });
  console.log(`@${width} overflow: ${over}px`);
  expect(over).toBeLessThanOrEqual(1);

  await page.screenshot({ path: resolve(process.cwd(), `reports/packages-two-state/ws-${width}.png`) });
});
}

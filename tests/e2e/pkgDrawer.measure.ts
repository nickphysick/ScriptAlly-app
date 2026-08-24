import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(420_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/pkg-drawer/${n}.png`);
const open = async (page: import("@playwright/test").Page, ms?: string) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  if (ms) {
    await page.evaluate((m) => localStorage.setItem("scriptally_active_manuscript_id", m), ms);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
};
const isOpen = (page: import("@playwright/test").Page) =>
  page.evaluate(() => !!document.querySelector(".pkgd-body"));

test("D4/D7 — the drawer opens from the header only, and closes four ways", async ({ page }) => {
  await open(page);
  /* ⚠️ D7: NOTHING OPENS IT BUT THE CONTROL. Asserted on arrival, before anything is clicked. */
  expect(await isOpen(page), "the drawer auto-opened on load").toBe(false);

  const trigger = page.getByRole("button", { name: /how it works/i }).first();
  await trigger.waitFor({ state: "visible", timeout: 20_000 });
  await trigger.click();
  await page.waitForTimeout(900);
  expect(await isOpen(page), "the header control did not open the drawer").toBe(true);

  const geo = await page.evaluate(() => {
    const body = document.querySelector(".pkgd-body") as HTMLElement;
    const panel = body.closest("div[class*='f11']") as HTMLElement ?? body.parentElement!;
    const r = panel.getBoundingClientRect();
    const scrim = [...document.querySelectorAll("div")].find((d) => {
      const c = getComputedStyle(d);
      return c.position === "fixed" && parseFloat(c.width) >= window.innerWidth - 2 &&
        /rgba?\(/.test(c.backgroundColor) && c.backgroundColor !== "rgba(0, 0, 0, 0)";
    });
    return {
      right: Math.round(window.innerWidth - r.right), w: Math.round(r.width),
      scrim: !!scrim,
      sections: [...document.querySelectorAll(".pkgd-sec")].map((e) => (e as HTMLElement).innerText),
      cards: document.querySelectorAll(".pkgd-card").length,
      notes: document.querySelectorAll(".pkgd-note").length,
      plates: [...document.querySelectorAll(".pkgd-art .pkgb-plate")].map((e) => {
        const b = e.getBoundingClientRect();
        return { size: `${Math.round(b.width)}×${Math.round(b.height)}`,
                 dashed: getComputedStyle(e).borderTopStyle, slot: e.getAttribute("data-slot") };
      }),
    };
  });
  console.log(`DRAWER: ${JSON.stringify(geo)}`);
  expect(geo.cards, "not three stage cards").toBe(3);
  expect(geo.notes, "not three Worth-knowing notes").toBe(3);
  /* ⚠️ `innerText` RETURNS THE UPPERCASED FORM — `text-transform` is applied before it is read, so a
     comparison against the source strings fails on correct markup. Fifth time in this build. */
  expect(geo.sections.map((t) => t.toLowerCase()))
    .toEqual(["stage one", "stage two", "stage three", "worth knowing"]);
  expect(geo.scrim, "no scrim behind the drawer").toBe(true);
  expect(geo.plates.every((p) => p.dashed === "dashed"), "a plate is not a dashed placeholder").toBe(true);
  await page.screenshot({ path: SHOT("drawer-open") });

  /* close 1 — Escape */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  expect(await isOpen(page), "Escape did not close it").toBe(false);

  /* close 2 — the footer button */
  await trigger.click(); await page.waitForTimeout(900);
  await page.locator(".pkgd-done").click();
  await page.waitForTimeout(900);
  expect(await isOpen(page), "the footer button did not close it").toBe(false);

  /* close 3 — the scrim */
  await trigger.click(); await page.waitForTimeout(900);
  await page.mouse.click(120, 500);
  await page.waitForTimeout(900);
  expect(await isOpen(page), "a scrim click did not close it").toBe(false);

  /* close 4 — the × */
  await trigger.click(); await page.waitForTimeout(900);
  const x = await page.evaluate(() => {
    /* ⚠️ SCOPED TO THE DRAWER, and the precedence bug that made this pass wrongly is worth naming:
       `a && b || c` binds as `(a && b) || c`, so an unscoped `aria-label=close` match found the beta
       strip's ✕ on another part of the page, clicked it, and reported success. */
    const head = document.querySelector(".pkgd-x") as HTMLButtonElement | null;
    const b = head && head.offsetParent !== null ? head : null;
    if (!b) return false; (b as HTMLButtonElement).click(); return true;
  });
  await page.waitForTimeout(900);
  console.log(`× present: ${x} | open after: ${await isOpen(page)}`);
  expect(x, "no × control on the drawer").toBe(true);
  expect(await isOpen(page), "the × did not close it").toBe(false);
});

test("D8 — the first-visit strip survives, and the drawer still never auto-opens", async ({ page }) => {
  await open(page, "thin-ms");
  const state = await page.evaluate(() => ({
    teach: document.querySelectorAll(".pkgt").length,
    strip: document.querySelectorAll(".pkgt-stage").length,
    drawer: document.querySelectorAll(".pkgd-body").length,
  }));
  console.log(`FIRST VISIT: ${JSON.stringify(state)}`);
  expect(state.teach, "the first-visit state is not rendering").toBe(1);
  expect(state.strip, "the first-visit stages strip lost its stages").toBe(3);
  expect(state.drawer, "the drawer opened on the teach state").toBe(0);
  await page.screenshot({ path: SHOT("first-visit-intact") });
});

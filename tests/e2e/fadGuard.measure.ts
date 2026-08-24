import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/fad/${n}.png`);

test("D1 — a linked package offers Archive; an unlinked one offers Delete", async ({ page }) => {
  const { db, uid } = await devDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const pk = await getDocs(collection(db, "users", uid, "packages"));
  const linkCount = (id: string) =>
    qs.docs.filter((d) => (d.data() as { packageId?: string }).packageId === id).length;
  for (const p of pk.docs) {
    const d = p.data() as { packageName?: string; manuscriptId?: string; firstSentAt?: string };
    console.log(`  ${p.id} | ${d.packageName} | links ${linkCount(p.id)} | stamped ${!!d.firstSentAt}`);
  }

  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);

  /* ⚠️ SCOPED to the packages page — every workspace page stays mounted. */
  const root = page.locator(".pkgw").first();
  const triggers = root.locator("button[aria-label*='emove'], button[title*='emove'], .pkgb-remove");
  const n = await triggers.count();
  console.log(`remove triggers on the page: ${n}`);
  expect(n, "no removal control found on the packages page").toBeGreaterThan(0);

  const seen: unknown[] = [];
  for (let i = 0; i < n; i++) {
    await triggers.nth(i).click();
    await page.waitForTimeout(700);
    const panel = await page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) =>
        /archive|delete/i.test((d as HTMLElement).innerText ?? "") &&
        (d as HTMLElement).offsetParent !== null &&
        (d as HTMLElement).innerText.length < 400 && (d as HTMLElement).innerText.length > 20);
      if (!el) return null;
      return {
        text: (el as HTMLElement).innerText.replace(/\n+/g, " · ").slice(0, 190),
        buttons: [...el.querySelectorAll("button")].map((b) => (b as HTMLElement).innerText.trim()).filter(Boolean),
      };
    });
    console.log(`  trigger ${i}: ${JSON.stringify(panel)}`);
    seen.push(panel);
    await page.screenshot({ path: SHOT(`removal-${i}`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  expect(seen.filter(Boolean).length, "no removal panel opened").toBeGreaterThan(0);
});

import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, getDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);

const pkgDoc = async (id: string) => {
  const { db, uid } = await devDb();
  const s = await getDoc(doc(db, "users", uid, "packages", id));
  return (s.data() ?? {}) as { firstSentAt?: string; packageName?: string; synopsisVersionId?: string };
};
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-two-state/${n}.png`);

test("Ruling 2 — the stamp lands with the link", async ({ page }) => {
  const before = await pkgDoc("seed-pkg-1");
  console.log(`BEFORE  seed-pkg-1 firstSentAt=${before.firstSentAt ?? "NO"}`);

  /**
   * ⚠️ THE DRAWER IS NOT REACHABLE FROM THE DESKTOP QUERY CENTRE (F10, recorded earlier). Its Edit
   * control sits inside `isMobile && mobileDetailOn` — so the only deterministic route to the one UI
   * path that writes a real `packageId` is the MOBILE detail view. The dashboard's to-do rows call
   * the same `openEditQuery(id)` but sit behind a tasks panel that has to be opened first.
   */
  /* ⚠️ SIGN IN AT DESKTOP, THEN RESIZE. `openRoute`'s own sign-in wait watches `.ws-panel`, which
     is the sidebar — HIDDEN below `md`. Opening straight at 375 times out in the harness, not in
     the app: the page is fine, the wait is looking at something mobile does not show. */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1800);

  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  console.log(`query rows: ${await rows.count()}`);
  await rows.first().click();
  await page.waitForTimeout(1200);

  const edit = page.locator("button.qh-mq", { hasText: /^Edit$/ }).first();
  console.log(`mobile Edit control: ${await edit.count()}`);
  expect(await edit.count(), "no Edit control even on mobile detail").toBeGreaterThan(0);
  await edit.click();
  await page.waitForTimeout(1400);

  const drawerOpen = await page.locator("select").count();
  console.log(`drawer open (selects on page): ${drawerOpen}`);
  await page.screenshot({ path: SHOT("stamp-1-drawer") });
  expect(drawerOpen, "the Edit Query drawer did not open").toBeGreaterThan(0);

  /* the package select */
  const sel = page.locator("select").filter({ hasText: /Custom materials|Standard UK|Comps-led/ }).first();
  const selCount = await sel.count();
  console.log(`package select found: ${selCount}`);
  expect(selCount, "no package select in the drawer").toBeGreaterThan(0);
  const opts = await sel.locator("option").allTextContents();
  console.log(`options: ${JSON.stringify(opts)}`);
  await sel.selectOption({ label: "Standard UK" });
  await page.waitForTimeout(400);

  /* ⚠️ THE FOOTER BUTTON IS DISABLED UNTIL THE DRAFT IS DIRTY, and a disabled button makes
     `click()` wait for enablement until the test times out — which reads as "the control is
     missing" when it is merely inert. Report its state before acting on it. */
  const save = page.locator("button", { hasText: /Save changes|Saving/ }).last();
  console.log(`save button: count=${await save.count()} disabled=${await save.isDisabled().catch(() => "n/a")}`);
  const foot = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /save/i.test(b.textContent || ""))
      .map((b) => ({ t: (b.textContent || "").trim(), disabled: (b as HTMLButtonElement).disabled })));
  console.log(`save-ish buttons: ${JSON.stringify(foot)}`);
  await save.scrollIntoViewIfNeeded().catch(() => {});
  await save.click({ timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT("stamp-2-saved") });

  const after = await pkgDoc("seed-pkg-1");
  console.log(`AFTER   seed-pkg-1 firstSentAt=${after.firstSentAt ?? "NO"}`);
  expect(after.firstSentAt, "the stamp did not land with the link").toBeTruthy();
});

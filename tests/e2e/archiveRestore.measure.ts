import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(480_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/fh/${n}.png`);

const state = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const root = document.querySelector(".pkgw") as HTMLElement | null;
  const tag = (h: string) => {
    const head = [...document.querySelectorAll(".sa-sechead")]
      .find((b) => new RegExp(h, "i").test((b as HTMLElement).innerText));
    return head ? ((head.querySelector(".pkgb-tag") as HTMLElement)?.innerText ?? null) : null;
  };
  return {
    heldTag: tag("your materials"),
    builtTag: tag("your packages"),
    toggles: [...document.querySelectorAll(".pkgb-arcToggle")].map((t) => (t as HTMLElement).innerText),
    archivedRows: [...document.querySelectorAll(".pkgb-arcRow")].map((r) => (r as HTMLElement).innerText.replace(/\n+/g, " · ")),
    liveSheets: root ? root.querySelectorAll(".pkgb-sheet").length : 0,
    liveCards: root ? root.querySelectorAll(".pkgb-pkgcard").length : 0,
  };
});

test("F-H — archive hides, the toggle reveals, Restore returns; D4 references survive", async ({ page }) => {
  const { db, uid } = await devDb();
  const vs = await getDocs(collection(db, "users", uid, "versions"));
  const pk = await getDocs(collection(db, "users", uid, "packages"));
  /* ⚠️ A REFERENCED MATERIAL, deliberately — D4's whole question is whether the package survives it. */
  const pkg = pk.docs[0];
  const refId = (pkg.data() as { queryLetterVersionId?: string }).queryLetterVersionId!;
  const refName = (vs.docs.find((d) => d.id === refId)?.data() as { versionName?: string })?.versionName;
  console.log(`archiving "${refName}" (${refId}), referenced by "${(pkg.data() as { packageName?: string }).packageName}"`);

  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
  const before = await state(page);
  console.log(`BEFORE: ${JSON.stringify(before)}`);
  expect(before.toggles.length, "a toggle rendered with nothing archived (D5)").toBe(0);

  /* archive one material and one package, out of band — the UI path is already covered elsewhere */
  await updateDoc(doc(db, "users", uid, "versions", refId), { status: "Retired" });
  await updateDoc(doc(db, "users", uid, "packages", pk.docs[1].id), { status: "Retired" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);

  const hidden = await state(page);
  console.log(`ARCHIVED (toggle off): ${JSON.stringify(hidden)}`);
  expect(hidden.archivedRows.length, "archived items render while the toggle is off").toBe(0);
  expect(hidden.toggles.length, "no toggle appeared once something was archived").toBe(2);
  expect(hidden.heldTag, "the held count still includes the archived material (D3)").not.toBe(before.heldTag);
  expect(hidden.builtTag, "the built count still includes the archived package (D3)").not.toBe(before.builtTag);
  await page.screenshot({ path: SHOT("toggle-off") });

  /* D4 — the package that references the archived material still resolves and renders it */
  const refShown = await page.evaluate((name) =>
    !!name && document.body.innerText.includes(name), refName);
  console.log(`D4 — the archived material still named by its package: ${refShown}`);
  expect(refShown, "archiving a referenced material broke the package's reference").toBe(true);

  /* toggle on */
  await page.locator(".pkgb-arcToggle").first().click();
  await page.waitForTimeout(800);
  const shown = await state(page);
  console.log(`ARCHIVED (toggle on): ${JSON.stringify(shown)}`);
  expect(shown.archivedRows.length, "the toggle revealed nothing").toBe(2);
  expect(shown.heldTag, "the count moved when the toggle did (D3)").toBe(hidden.heldTag);
  expect(shown.builtTag, "the count moved when the toggle did (D3)").toBe(hidden.builtTag);
  const lift = await page.evaluate(() => {
    const r = document.querySelector(".pkgb-arcRow") as HTMLElement;
    const before = r.getBoundingClientRect().top;
    r.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    return { moved: Math.abs(r.getBoundingClientRect().top - before) };
  });
  console.log(`hover lift on an archived row: ${lift.moved}px`);
  expect(lift.moved, "an archived row lifts on hover").toBeLessThan(1);
  /* D2 — Restore is the only action offered */
  const actions = await page.evaluate(() =>
    [...document.querySelectorAll(".pkgb-arcRow button")].map((b) => (b as HTMLElement).innerText.trim()));
  console.log(`actions on archived rows: ${JSON.stringify(actions)}`);
  /* ⚠️ LOWERCASED BEFORE COMPARING — `text-transform: uppercase` is applied before `innerText` is
     read, so a comparison against the source string fails on correct markup. Sixth time this build. */
  expect([...new Set(actions.map((a) => a.toLowerCase()))],
    "an archived row offers more than Restore").toEqual(["restore"]);
  await page.screenshot({ path: SHOT("toggle-on") });

  /* restore both */
  for (let i = 0; i < 2; i++) {
    await page.locator(".pkgb-arcRow button").first().click();
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(1200);
  const after = await state(page);
  console.log(`AFTER RESTORE: ${JSON.stringify(after)}`);
  expect(after.heldTag, "the held count did not return").toBe(before.heldTag);
  expect(after.builtTag, "the built count did not return").toBe(before.builtTag);
  expect(after.toggles.length, "the toggle outlived the last archived item (D5)").toBe(0);
  await page.screenshot({ path: SHOT("restored") });
});

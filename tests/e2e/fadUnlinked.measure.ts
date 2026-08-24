import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);

test("D1 — an unlinked package still offers Delete, and it works", async ({ page }) => {
  const { db, uid } = await devDb();
  const id = "probe-unlinked-pkg";
  /* ⚠️ CLEAR ANY LEFTOVER FIRST. `setDoc` over an existing doc is an UPDATE in rules terms, and its
     allowlist rejects the untouched keys a full-object write carries — so a probe that survived an
     earlier failed run makes the NEXT run look like a rules problem. */
  await deleteDoc(doc(db, "users", uid, "packages", id)).catch(() => {});
  const vs = await getDocs(collection(db, "users", uid, "versions"));
  const letter = vs.docs.find((d) => /letter/i.test(JSON.stringify(d.data())))?.id ?? "";
  /* ⚠️ THE LETTER IS REQUIRED ON CREATE (Part B), so an empty one would be denied rather than
     testing the guard. Every slot key must be present — `""` is the unfilled sentinel. */
  await setDoc(doc(db, "users", uid, "packages", id), {
    id, userId: uid, manuscriptId: "seed-ms-1", packageName: "Probe · unlinked",
    queryLetterVersionId: letter, synopsisVersionId: "", samplePagesVersionId: "",
    createdDate: new Date().toISOString(), status: "Active",
  });
  console.log(`created ${id} with letter=${letter || "(none)"}`);

  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
  const root = page.locator(".pkgw").first();
  const triggers = root.locator("button[aria-label*='emove'], button[title*='emove'], .pkgb-remove");

  let deleted = false;
  for (let i = 0; i < await triggers.count(); i++) {
    await triggers.nth(i).click();
    await page.waitForTimeout(700);
    const panel = await page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) =>
        /Probe · unlinked/.test((d as HTMLElement).innerText ?? "") &&
        /delete/i.test((d as HTMLElement).innerText ?? "") &&
        (d as HTMLElement).offsetParent !== null && (d as HTMLElement).innerText.length < 400);
      return el ? {
        text: (el as HTMLElement).innerText.replace(/\n+/g, " · ").slice(0, 200),
        buttons: [...el.querySelectorAll("button")].map((b) => (b as HTMLElement).innerText.trim()).filter(Boolean),
      } : null;
    });
    if (!panel) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); continue; }
    console.log(`UNLINKED PANEL: ${JSON.stringify(panel)}`);
    expect(panel.buttons.some((b) => /delete/i.test(b)), "no Delete offered on an unlinked package").toBe(true);
    await page.screenshot({ path: resolve(process.cwd(), "reports/fad/unlinked-delete.png") });
    /* ⚠️ SCOPED TO THE PANEL. `getByRole("button", {name: /^delete/i}).first()` matched a hidden
       copy on another mounted workspace page and waited on it forever. Click the one inside the
       panel that names this package. */
    const clicked = await page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) =>
        /Probe · unlinked/.test((d as HTMLElement).innerText ?? "") &&
        /delete/i.test((d as HTMLElement).innerText ?? "") &&
        (d as HTMLElement).offsetParent !== null && (d as HTMLElement).innerText.length < 400);
      const btn = el && [...el.querySelectorAll("button")]
        .find((b) => /^delete$/i.test((b as HTMLElement).innerText.trim()));
      if (!btn) return false;
      (btn as HTMLButtonElement).click();
      return true;
    });
    console.log(`clicked Delete: ${clicked}`);
    expect(clicked, "could not reach the panel's Delete button").toBe(true);
    await page.waitForTimeout(2200);
    deleted = true;
    break;
  }
  expect(deleted, "never found the probe package's removal panel").toBe(true);
  const still = await getDoc(doc(db, "users", uid, "packages", id));
  console.log(`package still exists after Delete: ${still.exists()}`);
  expect(still.exists(), "Delete was offered but the package survived").toBe(false);
  if (still.exists()) await deleteDoc(doc(db, "users", uid, "packages", id));
});

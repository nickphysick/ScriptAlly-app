import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
test.setTimeout(300_000);

test("R3 — is a query with an unresolvable manuscriptId hidden, or visible at All?", async ({ page }) => {
  const { db, uid } = await devDb();
  const mk = async (id: string, msId: string) => {
    await deleteDoc(doc(db, "users", uid, "queries", id)).catch(() => {});
    await setDoc(doc(db, "users", uid, "queries", id), {
      id, userId: uid, manuscriptId: msId, agentId: "seed-agent-1", packageId: "",
      status: "Queried", dateSent: new Date().toISOString(),
      personalisationNotes: `R3 probe ${id}`, sendMethod: "Email",
    });
  };
  await mk("probe-r3-bogus", "ms-does-not-exist");
  await mk("probe-r3-empty", "");

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");

  const atDefault = await rows.count();
  const scopeChips = await qc.evaluate((r) =>
    [...r.querySelectorAll("button")].map((b) => (b as HTMLElement).innerText.trim())
      .filter((t) => t && t.length < 30).slice(0, 14));
  console.log(`rows at DEFAULT scope: ${atDefault}`);
  console.log(`scope chips: ${JSON.stringify(scopeChips)}`);

  const all = qc.getByRole("button", { name: /^all$/i }).first();
  if (await all.count()) { await all.click(); await page.waitForTimeout(900); }
  const atAll = await rows.count();
  console.log(`rows at scope ALL: ${atAll}`);

  /* ⚠️ THE QUESTION IS WHETHER THE TWO PROBES ARE REACHABLE, not what the totals are. */
  const found = await qc.evaluate((r) =>
    [...r.querySelectorAll(".f12-row")].length);
  console.log(`total rows visible: ${found}`);
  await deleteDoc(doc(db, "users", uid, "queries", "probe-r3-bogus"));
  await deleteDoc(doc(db, "users", uid, "queries", "probe-r3-empty"));
  console.log("probes removed");
  expect(atAll).toBeGreaterThan(0);
});

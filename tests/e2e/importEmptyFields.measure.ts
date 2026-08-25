import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
test.setTimeout(420_000);

test("Ruling 1 — an imported agent carries no words the writer did not supply", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => d.id);

  await openRoute(page, "/import", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Agents Database/i }).click();
  await page.waitForTimeout(600);
  const ta = page.locator('textarea[placeholder^="Header 1"]').first();
  await ta.waitFor({ state: "visible" });
  /* ⚠️ NAME ONLY — every other column absent, which is the whole question: what does the app write
     into fields the CSV did not fill? */
  await ta.fill(`Name
Empty Fields Probe`);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Parse CSV Table/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Begin Processing Records/i }).click();
  await page.waitForTimeout(5000);

  const fresh = (await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => !before.includes(d.id));
  console.log(`agents created: ${fresh.length}`);
  expect(fresh.length).toBe(1);
  const a = fresh[0].data() as Record<string, unknown>;
  console.log(`AGENT: ${JSON.stringify({ name: a.name, agency: a.agency, email: a.email, notes: a.notes, mswlNotes: a.mswlNotes, responseTimeWeeks: a.responseTimeWeeks })}`);
  expect(a.name).toBe("Empty Fields Probe");
  expect(a.notes, "provenance was written into the writer's notes").toBe("");
  expect(a.agency, "an agency was invented").toBe("");
  expect(a.email, "an email address was invented").toBe("");
  expect(a.mswlNotes, "wish-list notes were invented").toBe("");
  /* ⚠️ KEPT ON PURPOSE (Ruling 1). A stated assumption about response times, not a claim about this
     agency — visibly editable, no false authorship. Asserted so a later sweep does not remove it by
     pattern-matching the others. */
  expect(a.responseTimeWeeks, "the stated default was removed").toBe(8);

  for (const d of fresh) await deleteDoc(doc(db, "users", uid, "agents", d.id));
  console.log("probe removed");
});

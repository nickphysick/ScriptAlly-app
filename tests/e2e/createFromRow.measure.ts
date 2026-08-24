import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(480_000);

test("D2 — Create from this row invents nothing", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = {
    q: (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id),
    m: (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.map((d) => d.id),
    a: (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => d.id),
  };

  await openRoute(page, "/import", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Query Log Entries/i }).click();
  await page.waitForTimeout(600);
  const ta = page.locator('textarea[placeholder^="Header 1"]').first();
  await ta.waitFor({ state: "visible" });
  await ta.fill(`Manuscript Title,Agent Name,State,Date Sent
Consent Probe Book,Consent Probe Agent,Queried,2026-08-05`);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Parse CSV Table/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Begin Processing Records/i }).click();
  await page.waitForTimeout(5000);

  /* nothing created by the import itself */
  const midM = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.length;
  const midA = (await getDocs(collection(db, "users", uid, "agents"))).docs.length;
  console.log(`after import — manuscripts ${midM} (was ${before.m.length}) · agents ${midA} (was ${before.a.length})`);
  expect(midM, "the import created a manuscript by itself").toBe(before.m.length);
  expect(midA, "the import created an agent by itself").toBe(before.a.length);

  const rowsShown = await page.evaluate(() =>
    [...document.querySelectorAll("li")].map((l) => (l as HTMLElement).innerText.replace(/\n+/g, " "))
      .filter((t) => /^Row \d/.test(t)));
  console.log(`summary rows: ${JSON.stringify(rowsShown)}`);
  expect(rowsShown.length).toBe(1);

  /* now the writer asks */
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((e) => (e as HTMLElement).offsetParent !== null && /create from this row/i.test((e as HTMLElement).innerText));
    if (!b) return false; (b as HTMLButtonElement).click(); return true;
  });
  console.log(`clicked Create: ${clicked}`);
  expect(clicked, "no Create control on the summary row").toBe(true);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: resolve(process.cwd(), "reports/import-unmatched/create-from-row.png") });

  const ms = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.filter((d) => !before.m.includes(d.id));
  const ag = (await getDocs(collection(db, "users", uid, "agents"))).docs.filter((d) => !before.a.includes(d.id));
  console.log(`created on consent — manuscripts ${ms.length} · agents ${ag.length}`);
  expect(ms.length, "no manuscript was created on consent").toBe(1);
  expect(ag.length, "no agent was created on consent").toBe(1);

  const m = ms[0].data() as Record<string, unknown>;
  const a = ag[0].data() as Record<string, unknown>;
  console.log(`MANUSCRIPT: ${JSON.stringify({ title: m.title, genre: m.genre, logline: m.logline, wordCount: m.wordCount, ageCategory: m.ageCategory })}`);
  console.log(`AGENT     : ${JSON.stringify({ name: a.name, agency: a.agency, email: a.email, starRating: a.starRating, mswlNotes: a.mswlNotes })}`);
  expect(m.title).toBe("Consent Probe Book");
  expect(m.genre, "a genre was invented").toBe("");
  expect(m.logline, "a logline was invented").toBe("");
  expect(m.wordCount, "a word count was invented").toBe(0);
  expect(m.ageCategory, "an age category was invented").toBe("");
  expect(a.name).toBe("Consent Probe Agent");
  expect(a.agency, "an agency was invented").toBe("");
  expect(a.email, "an email address was invented").toBe("");
  expect(a.starRating ?? "", "a star rating was invented").toBe("");

  /* and the query is linked, so the flag resolves */
  const q = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !before.q.includes(d.id));
  const qd = q[0].data() as { manuscriptId?: string; agentId?: string };
  console.log(`query now: ms="${qd.manuscriptId}" ag="${qd.agentId}"`);
  expect(qd.manuscriptId).toBe(ms[0].id);
  expect(qd.agentId).toBe(ag[0].id);

  for (const d of q) await deleteDoc(doc(db, "users", uid, "queries", d.id));
  for (const d of ms) await deleteDoc(doc(db, "users", uid, "manuscripts", d.id));
  for (const d of ag) await deleteDoc(doc(db, "users", uid, "agents", d.id));
  console.log("probes removed");
});

import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/import-package/${n}.png`);

/**
 * ⚠️ THE DEFECT IS PROVEN BEFORE THE FIX IS. Nothing on either account had ever been imported, so
 * the dangling link was a reasoned consequence and not an observed one. This constructs exactly the
 * row the old code wrote and renders it, so "it told the writer a package no longer exists" is a
 * measurement rather than a deduction.
 */
test("BEFORE — a query written the way the import used to writes it", async ({ page }) => {
  const { db, uid } = await devDb();
  const id = "probe-dangling-pkg";
  await setDoc(doc(db, "users", uid, "queries", id), {
    id, userId: uid, manuscriptId: "seed-ms-1", agentId: "seed-agent-1",
    packageId: "pkg-seed-default",           // ← what ImportCsv.tsx:522 used to write
    status: "Queried", dateSent: new Date().toISOString(),
    personalisationNotes: "", sendMethod: "Email",
  });
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const all = qc.getByRole("button", { name: /^all$/i }).first();
  if (await all.count()) { await all.click(); await page.waitForTimeout(800); }
  const rows = qc.locator(".f12-row");
  /* ⚠️ THE CENSUS IS THE INSTRUMENT, not a search for the state I expected. An earlier pass over
     the whole account found ZERO rows rendering anything other than exactly one attachment block;
     so whatever this query does show, it shows up as the one anomaly. */
  const anomalies: unknown[] = [];
  const n = Math.min(await rows.count(), 60);
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    const s = await qc.evaluate((r) => ({
      strip: r.querySelectorAll(".qc-strip--packed").length,
      loose: r.querySelectorAll(".qc-loose").length,
      fork: r.querySelectorAll(".qc-fork").length,
      state: (r.querySelector(".qc-strip-state") as HTMLElement)?.innerText ?? null,
      agent: (r.querySelector(".f12-idname, .qp-agent") as HTMLElement)?.innerText?.slice(0, 22) ?? null,
    }));
    if (s.strip + s.loose + s.fork !== 1) anomalies.push({ row: i, ...s });
  }
  console.log(`rows: ${n} | anomalies: ${anomalies.length}`);
  for (const a of anomalies) console.log(`  ${JSON.stringify(a)}`);
  if (anomalies.length) await page.screenshot({ path: SHOT("before-dangling") });
  expect(anomalies.length, "the dangling link rendered like any healthy query").toBeGreaterThan(0);

  await deleteDoc(doc(db, "users", uid, "queries", id));
  console.log("probe query removed");
});

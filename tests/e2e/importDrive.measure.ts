import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/import-package/${n}.png`);

test("AFTER — a real CSV import lands unattached", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id);

  await openRoute(page, "/import", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Query Log Entries/i }).click();
  await page.waitForTimeout(600);

  /* ⚠️ SCOPED: every workspace page stays mounted, so a bare `textarea` matches a hidden copy. */
  const ta = page.locator('textarea[placeholder^="Header 1"]').first();
  await ta.waitFor({ state: "visible" });
  await ta.fill(`Manuscript Title,Agent Name,State,Date Sent
The Smoke Test,Dangling Probe Agent,Queried,2026-08-01`);
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /Parse CSV Table/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT("flow-2-match") });

  await page.getByRole("button", { name: /Begin Processing Records/i }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: SHOT("flow-3-done") });
  const log = await page.evaluate(() => document.body.innerText.match(/Linked query logged[^\n]*/)?.[0] ?? null);
  console.log(`import log line: ${log}`);

  /* ── what did it actually store? ─────────────────────────────────────────────────────── */
  const after = await getDocs(collection(db, "users", uid, "queries"));
  const fresh = after.docs.filter((d) => !before.includes(d.id));
  console.log(`new queries: ${fresh.length}`);
  expect(fresh.length, "the import created no query").toBeGreaterThan(0);
  for (const d of fresh) {
    const q = d.data() as { packageId?: string; materialsWanted?: unknown[]; manuscriptId?: string };
    console.log(`  ${d.id}: packageId=${JSON.stringify(q.packageId)} · materialsWanted=${JSON.stringify(q.materialsWanted ?? null)} · ms=${q.manuscriptId}`);
    expect(q.packageId, "the import still writes a package id").toBe("");
  }

  /* ── and what does the pane render for it? ───────────────────────────────────────────── */
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const all = qc.getByRole("button", { name: /^all$/i }).first();
  if (await all.count()) { await all.click(); await page.waitForTimeout(800); }
  const rows = qc.locator(".f12-row");
  const n = Math.min(await rows.count(), 60);
  const blanks: unknown[] = [];
  let seen = 0;
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    const s = await qc.evaluate((r) => ({
      strip: r.querySelectorAll(".qc-strip--packed").length,
      loose: r.querySelectorAll(".qc-loose").length,
      fork: r.querySelectorAll(".qc-fork").length,
      agent: (r.querySelector(".qp-agent, .f12-idname") as HTMLElement)?.innerText?.slice(0, 24) ?? null,
    }));
    seen++;
    if (s.strip + s.loose + s.fork !== 1) blanks.push({ row: i, ...s });
    if (/Dangling Probe/i.test(s.agent ?? "")) {
      console.log(`IMPORTED QUERY RENDERS: ${JSON.stringify(s)}`);
      await page.screenshot({ path: SHOT("after-imported-pane") });
    }
  }
  console.log(`rows sampled: ${seen} | rendering nothing: ${blanks.length}`);
  for (const b of blanks) console.log(`  ${JSON.stringify(b)}`);
  expect(seen).toBeGreaterThan(10);
  expect(blanks, "a query renders no attachment block at all").toEqual([]);

  for (const d of fresh) await deleteDoc(doc(db, "users", uid, "queries", d.id));
  console.log(`cleaned up ${fresh.length} imported ${fresh.length === 1 ? "query" : "queries"}`);
});

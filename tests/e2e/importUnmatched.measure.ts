import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(480_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/import-unmatched/${n}.png`);

test("Phases 1/3/4 — every row lands, the summary names the gaps, the banner persists", async ({ page }) => {
  page.setDefaultTimeout(25_000);
  const { db, uid } = await devDb();
  const before = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id);

  await openRoute(page, "/import", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Query Log Entries/i }).click();
  await page.waitForTimeout(600);

  const ta = page.locator('textarea[placeholder^="Header 1"]').first();
  await ta.waitFor({ state: "visible" });
  /* all three failure cases, plus one clean row so "matched" is not zero */
  await ta.fill(`Manuscript Title,Agent Name,State,Date Sent
The Smoke Test,Elinor Hale,Queried,2026-08-01
A Book That Does Not Exist,Elinor Hale,Queried,2026-08-02
The Smoke Test,Nobody At All,Queried,2026-08-03
Another Missing Book,Also Nobody,Queried,2026-08-04`);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Parse CSV Table/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Begin Processing Records/i }).click();
  await page.waitForTimeout(6000);

  const summary = await page.evaluate(() => {
    const body = document.body.innerText;
    /* ⚠️ SCOPED TO THE COUNTS GRID. `.grid.grid-cols-3` also matches the wizard's step tabs, so an
       unscoped query returned five cells and reported the wrong two as the counts. */
    const grid = [...document.querySelectorAll(".grid.grid-cols-3")]
      .find((g) => /imported/i.test((g as HTMLElement).innerText));
    const nums = grid ? [...grid.children].map((d) => (d as HTMLElement).innerText.replace(/\n+/g, " ")) : [];
    const rows = [...document.querySelectorAll("li")]
      .map((l) => (l as HTMLElement).innerText.replace(/\n+/g, " "))
      .filter((t) => /^Row \d/.test(t));
    return { cells: nums, rows, quiet: !/need a decision/i.test(body) };
  });
  console.log(`SUMMARY CELLS: ${JSON.stringify(summary.cells)}`);
  console.log(`SUMMARY ROWS : ${JSON.stringify(summary.rows)}`);
  await page.screenshot({ path: SHOT("summary") });
  expect(summary.cells.length, "the summary does not show three counts").toBe(3);
  expect(summary.rows.length, "the summary lists no rows needing a decision").toBe(3);

  /* every row landed — nothing was skipped */
  const after = await getDocs(collection(db, "users", uid, "queries"));
  const fresh = after.docs.filter((d) => !before.includes(d.id));
  console.log(`rows in CSV: 4 · queries created: ${fresh.length}`);
  expect(fresh.length, "a row was skipped instead of imported").toBe(4);
  for (const d of fresh) {
    const q = d.data() as { manuscriptId?: string; agentId?: string };
    expect(q.manuscriptId === "" || q.manuscriptId === "seed-ms-1").toBe(true);
  }

  /* D6 — the banner, on the query list, after the wizard is gone */
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const rendered = await qc.locator(".f12-row").count();
  const bar = await qc.evaluate((r) => {
    const b = r.querySelector(".qc-needbar") as HTMLElement | null;
    return b ? b.innerText.replace(/\n+/g, " ") : null;
  });
  console.log(`rows rendered: ${rendered} (stored ${after.docs.length})`);
  console.log(`BANNER: ${JSON.stringify(bar)}`);
  await page.screenshot({ path: SHOT("banner") });
  expect(rendered, "rows are still being dropped from the list").toBe(after.docs.length);
  expect(bar, "no banner while flagged rows remain").toBeTruthy();

  /* it leaves when the last one resolves */
  for (const d of fresh) await deleteDoc(doc(db, "users", uid, "queries", d.id));
  await page.reload({ waitUntil: "domcontentloaded" });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2800);
  const gone = await qc.evaluate((r) => !r.querySelector(".qc-needbar"));
  console.log(`banner gone once the flagged rows are: ${gone}`);
  expect(gone, "the banner outlived the rows it was about").toBe(true);
});

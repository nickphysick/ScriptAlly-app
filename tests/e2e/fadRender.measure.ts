import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);

test("D2/D3 — a dangling link renders a message and the fork; nothing renders blank", async ({ page }) => {
  const { db, uid } = await devDb();
  const id = "probe-dangling-pkg";
  await deleteDoc(doc(db, "users", uid, "queries", id)).catch(() => {});
  await setDoc(doc(db, "users", uid, "queries", id), {
    id, userId: uid, manuscriptId: "seed-ms-1", agentId: "seed-agent-1",
    packageId: "pkg-gone-forever", status: "Queried",
    dateSent: new Date().toISOString(), personalisationNotes: "", sendMethod: "Email",
  });
  console.log("planted a query pointing at a package that does not exist");

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  /* ⚠️ WIDEN THE SCOPE — the list is manuscript-scoped and a default sweep omits other manuscripts. */
  const all = qc.getByRole("button", { name: /^all$/i }).first();
  if (await all.count()) { await all.click(); await page.waitForTimeout(900); }
  const rows = qc.locator(".f12-row");
  const n = await rows.count();

  const blanks: unknown[] = [];
  let gone: Record<string, unknown> | null = null;
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(310);
    const s = await qc.evaluate((r) => ({
      strip: r.querySelectorAll(".qc-strip--packed").length,
      loose: r.querySelectorAll(".qc-loose").length,
      fork: r.querySelectorAll(".qc-fork").length,
      msg: (r.querySelector(".qc-gonelink") as HTMLElement)?.innerText ?? null,
    }));
    if (s.strip + s.loose + s.fork !== 1) blanks.push({ row: i, ...s });
    if (s.msg && !gone) {
      gone = { row: i, ...s };
      await page.screenshot({ path: resolve(process.cwd(), "reports/fad/dangling-message.png") });
      await qc.locator(".qc-fork").first().screenshot({ path: resolve(process.cwd(), "reports/fad/dangling-fork.png") });
    }
  }
  console.log(`rows swept (scope All): ${n}`);
  console.log(`DANGLING RENDERS: ${JSON.stringify(gone)}`);
  console.log(`blank sections: ${blanks.length}`);
  for (const b of blanks) console.log(`  ${JSON.stringify(b)}`);

  expect(n, "nothing was swept").toBeGreaterThan(20);
  expect(gone, "the dangling link rendered no message").toBeTruthy();
  expect((gone as { msg: string }).msg).toContain("no longer on file");
  expect((gone as { fork: number }).fork, "the message showed but the fork did not").toBe(1);
  expect(blanks, "a query still renders no attachment block at all").toEqual([]);

  await deleteDoc(doc(db, "users", uid, "queries", id));
  console.log("probe query removed");
});

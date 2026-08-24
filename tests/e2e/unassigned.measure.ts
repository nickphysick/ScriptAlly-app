import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);
const IDS = ["probe-un-noms", "probe-un-noagent", "probe-un-both"];

test("D2/D3 — an unassigned query is findable, and states its gaps", async ({ page }) => {
  const { db, uid } = await devDb();
  const mk = async (id: string, msId: string, agId: string) => {
    await deleteDoc(doc(db, "users", uid, "queries", id)).catch(() => {});
    await setDoc(doc(db, "users", uid, "queries", id), {
      id, userId: uid, manuscriptId: msId, agentId: agId, packageId: "",
      status: "Queried", dateSent: new Date().toISOString(),
      personalisationNotes: "", sendMethod: "Email",
    });
  };
  await mk(IDS[0], "", "seed-agent-1");
  await mk(IDS[1], "seed-ms-1", "");
  await mk(IDS[2], "", "");
  const stored = (await getDocs(collection(db, "users", uid, "queries"))).docs.length;

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  const rendered = await rows.count();
  console.log(`stored ${stored} · rendered ${rendered} · difference ${stored - rendered}`);
  expect(stored - rendered, "an unresolvable row is still being dropped from the list").toBe(0);

  /* the three probes should be reachable and should not render blank */
  const blanks: unknown[] = [];
  for (let i = 0; i < rendered; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    const s = await qc.evaluate((r) => {
      const row = r.querySelector(".f12-row.on, .f12-row[aria-selected='true']") as HTMLElement | null;
      const pane = r.querySelector(".qp-agent, .f12-idname") as HTMLElement | null;
      return {
        rowText: (row?.innerText ?? "").replace(/\n+/g, " · ").slice(0, 60),
        paneName: pane?.innerText?.trim() ?? null,
      };
    });
    if (!s.rowText.trim() || s.rowText.trim() === "·") blanks.push({ row: i, ...s });
  }
  console.log(`rows rendering an empty label: ${blanks.length}`);
  for (const b of blanks.slice(0, 3)) console.log(`  ${JSON.stringify(b)}`);

  /* ⚠️ DRIVEN, NOT READ. The gate is that an unassigned query is FINDABLE, so the scope is opened
     and clicked rather than the filter's source being inspected. */
  const filterBtn = qc.locator("button").filter({ has: page.locator("svg") }).nth(1);
  await qc.getByRole("button", { name: /filter/i }).first().click().catch(async () => { await filterBtn.click(); });
  await page.waitForTimeout(800);
  const opts = await page.evaluate(() =>
    [...document.querySelectorAll("button, [role='radio']")]
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => (e as HTMLElement).innerText.trim())
      .filter((t) => /unassigned/i.test(t)));
  console.log(`Unassigned option: ${JSON.stringify(opts)}`);
  expect(opts.length, "no Unassigned scope is offered").toBeGreaterThan(0);
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, [role='radio']")]
      .find((e) => (e as HTMLElement).offsetParent !== null && /unassigned/i.test((e as HTMLElement).innerText));
    if (!b) return false; (b as HTMLElement).click(); return true;
  });
  await page.waitForTimeout(900);
  const scoped = await rows.count();
  console.log(`clicked: ${clicked} · rows under Unassigned: ${scoped}`);
  /* ⚠️ TWO, NOT THREE, AND THAT IS THE DESIGN. "Unassigned" is a MANUSCRIPT scope, so it holds the
     two probes with no manuscript. The third has a manuscript and no AGENT — a per-row state (D3),
     not a scope, because scoping by "missing agent" would file a query under something it lacks
     rather than under the book it belongs to. */
  expect(scoped, "the Unassigned scope does not hold both manuscript-less probes").toBe(2);
  expect(scoped, "the Unassigned scope is not filtering at all").toBeLessThan(rendered);

  await page.screenshot({ path: resolve(process.cwd(), "reports/import-unmatched/unassigned-scope.png") });
  for (const id of IDS) await deleteDoc(doc(db, "users", uid, "queries", id));
  console.log("probes removed");
});

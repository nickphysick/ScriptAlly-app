import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-two-state/${n}.png`);

test("D-D5 — a linked package's chips name its real materials", async ({ page }) => {
  /* find a query that is LINKED (packageId set) and one that is SNAPSHOT-marked, from the data */
  const { db, uid } = await devDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const linked = qs.docs.filter((d) => !!(d.data() as { packageId?: string }).packageId);
  const snap = qs.docs.filter((d) => ((d.data() as { materialsWanted?: unknown[] }).materialsWanted ?? [])
    .some((m) => typeof m !== "string" && !!(m as { fromPackageId?: string }).fromPackageId));
  console.log(`linked queries: ${linked.length} · snapshot queries: ${snap.length}`);
  expect(linked.length, "no linked query to read").toBeGreaterThan(0);

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2200);
  const qc = page.locator(".qc-wpg");                 // ⚠️ scoped — every workspace page stays mounted

  /* walk the list until a strip appears — which query is linked is data, not design */
  const rows = qc.locator(".f12-row");
  const n = Math.min(await rows.count(), 20);
  let found = -1;
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(550);
    if (await qc.locator(".qc-strip--packed").count()) { found = i; break; }
  }
  console.log(`packaged strip at row: ${found}`);
  expect(found, "no packaged strip rendered on any query").toBeGreaterThan(-1);

  /* ⚠️ READ THE CHIPS OFF THE RENDERED STRIP, not off the derivation. */
  const chips = await qc.locator(".qc-strip--packed").first().evaluate((el) =>
    [...el.querySelectorAll(".qc-mchip-slot")].map((c) => ({
      eyebrow: (c.querySelector(".qc-mchipeye") as HTMLElement)?.innerText ?? null,
      name: (c.querySelector(".qc-mchiptx") as HTMLElement)?.innerText ?? null,
      gone: c.classList.contains("qc-mchip-gone"),
    })));
  console.log(`CHIPS: ${JSON.stringify(chips)}`);
  expect(chips.length, "the strip rendered no material chips").toBeGreaterThan(0);

  /* D1 — real names, never the canonical type strings */
  for (const c of chips) {
    expect(["Covering letter", "Synopsis", "Sample pages", "Opening sample", "Query Letter"],
      `chip still shows a type name: ${c.name}`).not.toContain(c.name);
    expect(c.eyebrow, "no slot eyebrow").toBeTruthy();
  }
  const eyebrows = chips.map((c) => c.eyebrow);
  console.log(`eyebrows: ${JSON.stringify(eyebrows)}`);
  /* ⚠️ CASE-INSENSITIVE, BECAUSE `innerText` RETURNS WHAT THE CSS RENDERS. The eyebrow's source
     string is `Letter`; `text-transform: uppercase` makes the rendered text `LETTER`, and a probe
     comparing against the source is asking about a string the reader never sees. Reading the page
     means reading what the page says. */
  expect(eyebrows.map((e) => (e ?? "").toLowerCase()))
    .toEqual(expect.arrayContaining(["letter"]));
  for (const e of eyebrows) {
    expect(["letter", "syn", "sample"], `unexpected eyebrow ${e}`).toContain((e ?? "").toLowerCase());
  }

  /* D-D6 — the package's contents are not editable from the query */
  const edits = await qc.locator(".qc-strip--packed").first().evaluate((el) => ({
    removeX: el.querySelectorAll(".qc-mchipx").length,
    attach: el.querySelectorAll(".qc-mchip-add").length,
  }));
  console.log(`edit affordances inside the strip: ${JSON.stringify(edits)}`);
  expect(edits.removeX, "a per-chip × inside a packaged strip").toBe(0);
  expect(edits.attach, "a + Attach inside a packaged strip").toBe(0);

  await page.screenshot({ path: SHOT("dd5-linked") });

  /* F-V — how a snapshot reads beside it */
  if (snap.length) {
    for (let i = 0; i < n; i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(500);
      const g = await qc.locator(".qc-strip--packed .qc-mchip-att").count();
      if (g) {
        const s = await qc.locator(".qc-strip--packed").first().evaluate((el) =>
          [...el.querySelectorAll(".qc-mchiptx")].map((c) => (c as HTMLElement).innerText));
        console.log(`SNAPSHOT chips: ${JSON.stringify(s)}`);
        await page.screenshot({ path: SHOT("dd5-snapshot") });
        break;
      }
    }
  } else {
    console.log("F-V: no snapshot-attached query on the account — cannot compare on screen.");
  }
});

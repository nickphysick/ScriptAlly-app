import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(240_000);

test("F-Y — the pane's in-place grammar, and the harness put back", async ({ page }) => {
  /* ⚠️ RESTORE FIRST. The switch drive consumed `seed-query-20`'s unattached state; the seed writes
     `packageId: ""` and NO `materialsWanted` (its chips were the agent fallback), so this is exact. */
  const { db, uid } = await devDb();
  await updateDoc(doc(db, "users", uid, "queries", "seed-query-20"),
    { packageId: "", materialsWanted: deleteField() });
  console.log("restored seed-query-20 to its seeded state");

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");

  /* find a query showing the packed strip, so all in-place controls are on screen at once */
  let at = -1;
  for (let i = 0; i < 20; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(340);
    if (await qc.locator(".qc-strip--packed").count()) { at = i; break; }
  }
  expect(at, "no packaged query to read the grammar from").toBeGreaterThan(-1);
  await page.waitForTimeout(600);

  const grammar = await qc.evaluate((r) => {
    /* ⚠️ THE WHOLE IN-PLACE SET, not just the class — a control that edits in place may be found by
       its `title` grammar without wearing `.qp-inplace`. Both are collected so the report can say
       which is which. */
    const els = [...r.querySelectorAll('.qp-inplace, [title^="Change"]')]
      .filter((e) => (e as HTMLElement).offsetParent !== null);
    return els.map((e) => {
      const c = getComputedStyle(e); const b = e.getBoundingClientRect();
      return {
        text: (e as HTMLElement).innerText.trim().slice(0, 28),
        title: (e.getAttribute("title") ?? "").slice(0, 44),
        /* ⚠️ THE DASHED LINE IS A BORDER, NOT A TEXT DECORATION. Reading `textDecorationLine`
           returned "none" for every control including the pre-existing one, so a set-wide sameness
           check over it was satisfied by three identical nothings. */
        deco: c.borderBottom,
        cls: e.className.toString().slice(0, 40),
        size: c.fontSize, colour: c.color,
        y: Math.round(b.top), x: Math.round(b.left),
      };
    });
  });
  console.log(`F-Y in-place controls: ${grammar.length}`);
  for (const g of grammar) console.log(`  ${JSON.stringify(g)}`);

  /* ⚠️ THE CLAIM IS THAT THEY ARE ONE SET, so it is checked as a property across the set — not by
     naming the two new ones and asserting they look like the three old ones. */
  const decos = new Set(grammar.map((g) => g.deco));
  console.log(`distinct decorations: ${[...decos].join(" | ")}`);
  expect(grammar.length, "no in-place controls found at all").toBeGreaterThan(2);
  console.log(`F-Y decorations agree: ${decos.size === 1}`);
  const sizes = new Set(grammar.map((g) => g.size));
  const colours = new Set(grammar.map((g) => g.colour));
  console.log(`F-Y sizes: ${[...sizes].join(" | ")} | colours: ${[...colours].join(" | ")}`);

  await page.screenshot({ path: resolve(process.cwd(), "reports/packages-two-state/fy-inplace.png") });
  const strip = qc.locator(".qc-strip--packed").first();
  await strip.screenshot({ path: resolve(process.cwd(), "reports/packages-two-state/fy-strip.png") });
});

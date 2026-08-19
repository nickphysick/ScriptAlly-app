/**
 * PHASE B'S PROMISE — a closed query is excluded from the task list, so its materials must stay
 * fixable ON DEMAND from the query's own reading pane. This checks that the existing §2 materials
 * editor is reachable there for a CLOSED query, which is the whole basis of the exclusion.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("closed queries stay recoverable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/queries");
  await page.waitForTimeout(6500);

  /* ⚠️ USE THE PAGE'S OWN "Closed" FILTER rather than sniffing row text — the list rows do not
     print a status, so a text heuristic silently selects whatever happened to be first. */
  const picked = await page.evaluate(() => {
    const pill = [...document.querySelectorAll("button")].find((b) => /^closed$/i.test((b.textContent ?? "").trim()));
    if (pill) (pill as HTMLElement).click();
    return { filtered: !!pill };
  });
  await page.waitForTimeout(1800);
  const row = await page.evaluate(() => {
    const r = document.querySelector("[class*='qc-row'], [class*='qrow']") as HTMLElement | null;
    r?.click();
    return { found: !!r, label: (r?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 70) };
  });
  await page.waitForTimeout(2000);

  const r = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return {
      /* the §2 editor's own affordance — the add-material control on the send */
      addControl: !!document.querySelector("[class*='qc-mchip'], [class*='qc-addmat']"),
      coveringLetter: /covering letter/i.test(t),
      materialsArea: /what you sent|materials/i.test(t),
    };
  });

  const report = [
    "── a closed query's reading pane (1440×900)",
    `  Closed filter applied: ${picked.filtered}`,
    `  closed query selected: ${row.found}`,
    `  row: ${row.label}`,
    `  material chips/add:  ${r.addControl}`,
    `  "covering letter":   ${r.coveringLetter}`,
    `  materials area:      ${r.materialsArea}`,
    `  page errors:         ${errors.length}`,
  ].join("\n");
  writeFileSync("run-artifacts/closed-recoverable.txt", report);
  console.log("\n" + report + "\n");
  await page.screenshot({ path: "run-artifacts/closed-query-pane-1440.png" });
});

/** Post-deploy: is the work actually on the deployed dev site? */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("dev deploy check", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  const r = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".tdg-row")].find((x) =>
      /no record of what you sent/.test(x.textContent ?? ""));
    (row as HTMLElement | undefined)?.click();
    return {
      bulkCard: (row?.querySelector(".tdg-t")?.textContent ?? "").trim(),
      tickOnMaterials: !!row?.querySelector(".tdg-tick"),
      offerTick: !![...document.querySelectorAll(".tdg-row")]
        .find((x) => /Answer the offer/.test(x.textContent ?? ""))?.querySelector(".tdg-tick"),
    };
  });
  await page.waitForTimeout(1600);
  const open = await page.evaluate(() => ({
    bulkTable: !!document.querySelector(".prs-fills"),
    prime: (document.querySelector(".psw-prime")?.textContent ?? "").trim(),
    covering: /covering letter/i.test(document.body.innerText || ""),
  }));
  await page.screenshot({ path: "run-artifacts/dev-deploy-1440.png" });

  const dup = errs.filter((e) => /two children with the same key/i.test(e)).length;
  const other = errs.filter((e) => !/two children with the same key/i.test(e));
  const report = [
    "── deployed dev site (https://scriptally-dev.web.app), 1440×900",
    `  bulk card:            ${r.bulkCard}`,
    `  ⚠️ tick on materials:  ${r.tickOnMaterials}   (MUST be false — Phase A)`,
    `  ⚠️ tick on offer:      ${r.offerTick}   (MUST be false — Phase A)`,
    `  bulk table opens:     ${open.bulkTable}`,
    `  primary:              "${open.prime}"`,
    `  "covering letter":    ${open.covering}   (Phase C)`,
    `  known dup-key warns:  ${dup}`,
    `  ⚠️ OTHER errors:       ${other.length}   (MUST be 0)`,
    ...other.slice(0, 4).map((e) => "   " + e.slice(0, 160)),
  ].join("\n");
  writeFileSync("run-artifacts/dev-deploy-check.txt", report);
  console.log("\n" + report + "\n");
});

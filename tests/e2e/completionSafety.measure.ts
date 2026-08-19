/**
 * PHASE A ON THE PAGE — which rows offer a tick, and which no longer do.
 *
 * ⚠️ THE CLAIM IS ABOUT A WRITE, so the check is "is the affordance that performs it absent",
 * read off the rendered row rather than off the map that decides it.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("ticks on the To-do page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".tdg-row")].map((r) => ({
      key: r.getAttribute("data-tdgkey") ?? "",
      pill: (r.querySelector(".tdg-bpill")?.textContent ?? "").trim(),
      title: (r.querySelector(".tdg-t")?.textContent ?? "").trim().slice(0, 52),
      tick: !!r.querySelector(".tdg-tick"),
    })));

  const lines = rows.map((r) => `  ${r.tick ? "TICK" : "  — "}  ${r.pill.padEnd(7)} ${r.key.padEnd(26)} ${r.title}`);
  const report = [
    "── rows and their tick affordance (1440×900)",
    ...lines,
    "",
    `  offer rows with a tick:     ${rows.filter((r) => r.key.includes("offer") && r.tick).length}  (expect 0)`,
    `  materials rows with a tick: ${rows.filter((r) => r.key.includes("materials") && r.tick).length}  (expect 0)`,
    `  page errors: ${errors.length}`,
  ].join("\n");
  writeFileSync("run-artifacts/completion-safety.txt", report);
  console.log("\n" + report + "\n");
  await page.screenshot({ path: "run-artifacts/phaseA-ticks-1440.png" });
});

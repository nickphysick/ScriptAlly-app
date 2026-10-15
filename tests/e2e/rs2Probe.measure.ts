import { test } from "@playwright/test";
import { openRoute } from "./measure";
test("rs2 probe", async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, process.env.RS2_PMS ?? "seed-ms-1");
  await openRoute(page, process.env.RS2_ROUTE ?? "/queries/responses", { width: Number(process.env.RS2_W ?? 1512), height: Number(process.env.RS2_H ?? 900) });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(process.env.RS2_JS ?? "1");
  console.log("PROBE " + JSON.stringify(out, null, 1));
});

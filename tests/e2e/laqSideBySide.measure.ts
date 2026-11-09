/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — the report's side-by-side: each ref screen beside the build's screenshot of the same moment, drawn
 * as one page from local files and saved as one PNG per pair. Reads nothing from the app; needs no sign-in.
 */
import { test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const PAIRS = ["01-agent", "04-sent", "05-sent-calendar", "06-materials-packages", "07-materials-pieces", "09-how", "10-check",
  "13-stamp", "14-celebration", "16-milestone-25", "17-batch-next-agent", "19-no-packages"];
const OUT = "reports/log-a-query-v1/side-by-side";
const uri = (p: string) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

test("side by side", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1140, height: 900 });
  for (const k of PAIRS) {
    const ref = `design-refs/log-a-query-v1/screens/${k}.png`;
    /* 19: the harness book has packages, so the build's "no packages" view is the same pieces view as 07 */
    const mine = `reports/log-a-query-v1/shots/${k === "19-no-packages" ? "07-materials-pieces" : k}.png`;
    if (!existsSync(ref) || !existsSync(mine)) continue;
    await page.setContent(`<body style="margin:0;background:#f4f0ea;font:14px Georgia,serif;color:#1c130f">
      <div id="w" style="display:flex;gap:28px;padding:20px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Ref · ${k}</figcaption><img src="${uri(ref)}" style="width:520px"></figure>
        <figure style="margin:0"><figcaption style="margin:0 0 8px">Build · ${k}${k === "19-no-packages" ? " (pieces view; the harness book has packages)" : ""}</figcaption><img src="${uri(mine)}" style="width:520px"></figure>
      </div></body>`);
    await page.locator("#w").screenshot({ path: `${OUT}/${k}.png` });
  }
});

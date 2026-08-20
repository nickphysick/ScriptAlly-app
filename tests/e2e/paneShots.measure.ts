/**
 * Screenshots for the pane round's report — every journey at 1440 and 1920, plus the two
 * overlays the phases added. Not an assertion suite: it proves nothing, it SHOWS.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { mkdirSync } from "node:fs";

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill")||{}).textContent||"").trim() === ${JSON.stringify(kind)});
  if (!row) return false; row.click(); return true;
})()`;

/* ⚠️ THE PILL LABELS ARE `BUCKET_LABEL`s, NOT THE JOURNEY NAMES I first guessed — "Nudge",
   "Offer" and "Fill in" match no row, so three journeys were reported as absent from the account
   when they were absent from my list. */
const KINDS = ["Send", "Decide", "Chase", "Close", "Fix", "Note"];

test("pane shots", async ({ page }) => {
  mkdirSync("reports/pane-round", { recursive: true });
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/todo");
    await page.waitForTimeout(7000);
    for (const kind of KINDS) {
      const ok = await page.evaluate(OPEN(kind));
      if (!ok) { console.log(`skip ${kind} @${w} — no such row on this account`); continue; }
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `reports/pane-round/${kind.toLowerCase().replace(/\s+/g, "-")}-${w}.png` });
      console.log(`shot ${kind} @${w}`);
    }
  }
  /* the two overlays, at one width — they are the same control at both */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);
  /* the first attempt shot a pane that had not changed card and a dialog that was not open, and
     the picture said neither — a screenshot cannot fail, so the check has to be made explicitly */
  const opened = await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1500);
  const clicked = await page.evaluate(`(() => {
    const vis = ${VIS};
    const b = [...document.querySelectorAll(".tpn .actbar button")].filter(vis)
      .find((x) => /dismiss/i.test(x.textContent||""));
    if (!b) return false; b.click(); return true;
  })()`);
  await page.waitForTimeout(1000);
  const shown = await page.evaluate(`!!document.querySelector(".tdlg.open")`);
  console.log(`dismiss dialog: opened=${opened} clicked=${clicked} shown=${shown}`);
  if (!shown) throw new Error("the dismiss dialog did not open — not shooting a picture of nothing");
  await page.screenshot({ path: "reports/pane-round/dismiss-dialog-1440.png" });
  console.log("shot dismiss dialog");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.evaluate(`(() => {
    const vis = ${VIS};
    ([...document.querySelectorAll('.tlc .l-icon[aria-label="Filter"]')].filter(vis)[0])?.click();
  })()`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "reports/pane-round/filter-include-dismissed-1440.png" });
  console.log("shot filter menu");
});

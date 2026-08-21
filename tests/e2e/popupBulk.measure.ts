/** Bulk only: does one tick reach the primary's count? ⚠️ no backticks inside evaluates. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync } from "node:fs";
const OUT = "run-artifacts/popup-bulk.txt";
rmSync(OUT, { force: true });
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

test("bulk tick", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(8000);
  const log: string[] = [];
  const primary = async () => await page.evaluate(`(() => {
    const b = document.querySelector(".tpn .ab.go");
    return b ? (b.textContent || "").trim() : null;
  })()`);

  await page.evaluate(`(() => {
    const vis = ${VIS};
    const r = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .find((x) => (x.textContent || "").indexOf("missing their materials") > -1);
    if (r) r.click();
  })()`);
  await page.waitForTimeout(2500);
  log.push("docked, primary = " + await primary());

  const shape = await page.evaluate(`(() => {
    const vis = ${VIS};
    const t = document.querySelector(".tpn .bulk");
    if (!t) return { table: false };
    const ticks = [...t.querySelectorAll("button.tick")].filter(vis);
    return {
      table: true, ticks: ticks.length,
      first: ticks[0] ? { label: ticks[0].getAttribute("aria-label"), disabled: ticks[0].disabled,
        pressed: ticks[0].getAttribute("aria-pressed"), cls: ticks[0].className } : null,
      rows: [...t.querySelectorAll("tbody tr.bulkrow")].length,
    };
  })()`);
  log.push("table: " + JSON.stringify(shape));

  // click through Playwright, not through the DOM — a real pointer sequence, like a writer's
  const tick = page.locator(".tpn .bulk button.tick").first();
  const pressed = async () => await page.evaluate(`(() => {
    const t = document.querySelector(".tpn .bulk");
    const b = t ? t.querySelector("button.tick") : null;
    return b ? b.getAttribute("aria-pressed") : null;
  })()`);
  await tick.click();
  /* ⚠️ SAMPLED, NOT READ ONCE. A tick that flips and is then WIPED by a re-seed looks identical to
     one that never fired, a second later — and the two have completely different causes. */
  for (const ms of [80, 250, 600, 1200, 2500]) {
    await page.waitForTimeout(ms === 80 ? 80 : ms - (ms === 250 ? 80 : ms === 600 ? 250 : ms === 1200 ? 600 : 1200));
    log.push("  at " + ms + "ms: aria-pressed = " + await pressed() + " · primary = " + await primary());
  }
  log.push("after a real click, primary = " + await primary());
  const after = await page.evaluate(`(() => {
    const t = document.querySelector(".tpn .bulk");
    const b = t ? t.querySelector("button.tick") : null;
    return b ? b.getAttribute("aria-pressed") + "/" + b.className : null;
  })()`);
  log.push("first tick now: " + after);

  writeFileSync(OUT, log.join("\n") + "\n");
});

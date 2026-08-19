import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

const WALK = `(() => {
  const vis = (e) => !!e && e.offsetParent !== null;
  const start = [...document.querySelectorAll('.wpg-scroll')].find(vis);
  const lines = [];
  const rec = (el, d) => {
    if (d > 7 || !el) return;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    lines.push('  '.repeat(d) + (String(el.className).trim().split(/\\s+/).join('.') || el.tagName)
      + '  h=' + Math.round(r.height) + '/' + el.scrollHeight
      + '  disp=' + c.display + ' flex=' + c.flex + ' minH=' + c.minHeight + ' ovY=' + c.overflowY
      + (c.display.includes('flex') ? ' dir=' + c.flexDirection + ' wrap=' + c.flexWrap : '')
      + (c.display.includes('grid') ? ' rows=' + c.gridTemplateRows : ''));
    const kids = [...el.children].filter(vis);
    for (const k of kids.slice(0, 4)) rec(k, d + 1);
  };
  rec(start, 0);
  return lines.join('\\n');
})()`;

test("chain", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const parts: string[] = [];
  for (const route of ["/queries", "/todo"]) {
    await page.goto(route);
    await page.waitForTimeout(6500);
    parts.push(`══════ ${route} ══════\n` + (await page.evaluate(WALK)));
  }
  const t = parts.join("\n\n");
  writeFileSync("run-artifacts/qc-chain.txt", t);
  console.log("\n" + t + "\n");
});

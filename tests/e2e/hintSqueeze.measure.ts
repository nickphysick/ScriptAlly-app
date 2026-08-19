/** Is the squeezed foot hint mine, or does every journey do it? */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

const CARDS: [string, RegExp][] = [
  ["materials", /^No record of what you sent/],
  ["close",     /^No response from|^Log the close/],
  ["send",      /^Send your (full|partial)/],
];

test("foot hint width per journey", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  const rows: string[] = [];
  for (const [name, re] of CARDS) {
    await page.goto("/todo");
    await page.waitForTimeout(6000);
    const ok = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const row = [...document.querySelectorAll(".tdg-row")].find((r) =>
        rx.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      if (!row) return false;
      (row as HTMLElement).click();
      return true;
    }, re.source);
    if (!ok) { rows.push(`  ${name.padEnd(10)} no card on this account`); continue; }
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("[class*='tdk-'] button")]
        .find((x) => /^(Record|Action|Close|Send|Mark)/.test((x.textContent ?? "").trim()));
      (b as HTMLElement | undefined)?.click();
    });
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const h = document.querySelector(".pj-hint") as HTMLElement | null;
      const foot = document.querySelector(".pj-foot") as HTMLElement | null;
      if (!h || !foot) return null;
      const btns = [...foot.querySelectorAll("button")].map((b) => Math.round(b.getBoundingClientRect().width));
      return {
        hint: Math.round(h.getBoundingClientRect().width),
        lines: Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight || "16")),
        foot: Math.round(foot.getBoundingClientRect().width),
        btns,
        text: (h.textContent ?? "").trim().slice(0, 50),
      };
    });
    rows.push(m
      ? `  ${name.padEnd(10)} hint ${String(m.hint).padStart(4)}px / ${m.lines} lines · foot ${m.foot}px · buttons ${JSON.stringify(m.btns)}  "${m.text}"`
      : `  ${name.padEnd(10)} no journey foot found`);
  }
  const report = ["── foot hint width per journey (1440×900)", ...rows].join("\n");
  writeFileSync("run-artifacts/hint-squeeze.txt", report);
  console.log("\n" + report + "\n");
});

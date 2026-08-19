import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("vocab", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  const map = await page.evaluate(() => {
    const el = document.querySelector(".tdk") ?? document.body;
    const names = new Set<string>();
    for (const sh of [...document.styleSheets]) {
      let rules: CSSRuleList;
      try { rules = sh.cssRules; } catch { continue; }
      const walk = (rs: CSSRuleList) => {
        for (const r of [...rs] as CSSRule[]) {
          if ((r as CSSGroupingRule).cssRules) walk((r as CSSGroupingRule).cssRules);
          const st = (r as CSSStyleRule).style;
          if (!st) continue;
          for (let i = 0; i < st.length; i++) if (st[i].startsWith("--")) names.add(st[i]);
        }
      };
      walk(rules);
    }
    const cs = getComputedStyle(el);
    const out: Record<string, string> = {};
    for (const n of [...names].sort()) {
      const v = cs.getPropertyValue(n).trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) out[n] = v.toLowerCase();
    }
    return out;
  });
  /* invert: hex -> token names */
  const inv: Record<string, string[]> = {};
  for (const [n, v] of Object.entries(map)) (inv[v] ??= []).push(n);
  const lines = Object.entries(inv).sort().map(([h, ns]) => `${h}  ${ns.join(" ")}`);
  writeFileSync("run-artifacts/qc-vocab.txt", lines.join("\n"));
  console.log("\n" + lines.join("\n") + "\n");
});

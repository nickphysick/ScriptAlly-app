/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Runs design-refs/pricing-page-v1.html's own estimate script in a browser, with the clock pinned,
 * across every answer combination, and writes what it prints. `campaignEstimate.test.ts` reads the
 * file: the expected values come from the ref running, never from reading its code.
 *
 *   node scripts/pricing-v3-refoutputs.mjs [YYYY-MM-DD …]   (default 2026-10-21 and 2026-06-15)
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dates = process.argv.slice(2).length ? process.argv.slice(2) : ["2026-10-21", "2026-06-15"];
const ref = "file://" + resolve("design-refs/pricing-page-v1.html");
const out = [];
const browser = await chromium.launch();
for (const d of dates) {
  const page = await browser.newPage();
  await page.clock.setFixedTime(new Date(d + "T12:00:00"));
  await page.goto(ref);
  for (const stage of ["prep", "ready", "already"])
    for (const [kind, len] of [["novel", "s"], ["novel", "m"], ["novel", "l"], ["nonfic", null], ["pb", null]])
      for (const agents of [5, 15, 20, 40, 60, 65, 100, 150])
        for (const pace of ["steady", "brisk"]) {
          const r = await page.evaluate(async ({ stage, kind, len, agents, pace }) => {
            const q = (s) => document.querySelector(s);
            const step = (n) => q(`.jy-step[data-step="${n}"]`);
            /* back to question 1 with the stepper at its default */
            if (!step(0).hidden) {} else if (!step(4).hidden) q(".jy-again").click();
            else { while (step(0).hidden) [...document.querySelectorAll(".jy-step:not([hidden]) .jy-back")][0].click(); }
            step(0).querySelector(`[data-v="${stage}"]`).click(); step(0).querySelector(".jy-next").click();
            step(1).querySelector(`[data-q="kind"] [data-v="${kind}"]`).click();
            if (len) step(1).querySelector(`[data-q="len"] [data-v="${len}"]`).click();
            step(1).querySelector(".jy-next").click();
            const out = () => +q("#agentsOut").textContent;
            while (out() > agents) step(2).querySelector('[data-d="-5"]').click();
            while (out() < agents) step(2).querySelector('[data-d="5"]').click();
            step(2).querySelector(".jy-next").click();
            step(3).querySelector(`[data-v="${pace}"]`).click(); step(3).querySelector(".jy-next").click();
            const fit = +document.querySelector(".mini.is-fit").dataset.m;
            return { label: q("#estBig").textContent, why: q("#whyText").textContent, prep: !q("#prepNote").hidden,
              fit, plan: q("#planName").textContent, amt: q("#planAmt").textContent, pm: q("#planPm").textContent,
              tail: q("#planTail").textContent };
          }, { stage, kind, len, agents, pace });
          out.push({ today: d, answers: { stage, kind, len, agents, pace }, ...r });
        }
  await page.close();
}
await browser.close();
writeFileSync("src/marketing/campaignEstimate.ref.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} cases`);

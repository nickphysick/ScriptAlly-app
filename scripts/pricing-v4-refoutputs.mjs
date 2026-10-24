/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Runs design-refs/pricing-page-v2.html's own "Which plan suits me best?" script in a browser, with
 * the clock pinned, across every answer combination — "I don't know" and "Not sure yet" included —
 * and writes what it prints, notes and all. `campaignEstimate.test.ts` reads the file: the expected
 * values come from the ref running, never from reading its code.
 *
 *   node scripts/pricing-v4-refoutputs.mjs [YYYY-MM-DD …]   (default 2026-10-24 and 2026-06-15)
 *
 * Supersedes scripts/pricing-v3-refoutputs.mjs (ref pricing-page-v1), which is retired with it.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dates = process.argv.slice(2).length ? process.argv.slice(2) : ["2026-10-24", "2026-06-15"];
const ref = "file://" + resolve("design-refs/pricing-page-v2.html");
const out = [];
const browser = await chromium.launch();
for (const d of dates) {
  const page = await browser.newPage();
  await page.clock.setFixedTime(new Date(d + "T12:00:00"));
  await page.goto(ref);
  for (const stage of ["prep", "ready", "already"])
    for (const [kind, len] of [["novel", "s"], ["novel", "m"], ["novel", "l"], ["nonfic", null], ["pb", null]])
      for (const agents of [5, 15, 20, 40, 60, 65, 100, 150, "idk"])
        for (const pace of ["steady", "brisk", "unsure"]) {
          const r = await page.evaluate(async ({ stage, kind, len, agents, pace }) => {
            const q = (s) => document.querySelector(s);
            const step = (n) => q(`.jy-step[data-step="${n}"]`);
            const ins = (n) => { const b = step(n).querySelector(".jy-ins"); return b.hidden ? "" : b.querySelector(".jy-ins-t").textContent; };
            if (!step(4).hidden) q(".jy-again").click();
            else while (step(0).hidden) [...document.querySelectorAll(".jy-step:not([hidden]) .jy-back")][0].click();
            step(0).querySelector(`[data-v="${stage}"]`).click();
            const i0 = ins(0); step(0).querySelector(".jy-next").click();
            step(1).querySelector(`[data-q="kind"] [data-v="${kind}"]`).click();
            if (len) step(1).querySelector(`[data-q="len"] [data-v="${len}"]`).click();
            const i1 = ins(1); step(1).querySelector(".jy-next").click();
            const idk = q(".jy-idk");
            const out = () => +q("#agentsOut").textContent;
            if (agents === "idk") {
              if (idk.getAttribute("aria-pressed") !== "true") idk.click();
            } else {
              /* a stepper press clears "I don't know"; then walk to the count */
              if (idk.getAttribute("aria-pressed") === "true") { step(2).querySelector('[data-d="5"]').click(); }
              while (out() > agents) step(2).querySelector('[data-d="-5"]').click();
              while (out() < agents) step(2).querySelector('[data-d="5"]').click();
            }
            const i2 = ins(2); step(2).querySelector(".jy-next").click();
            step(3).querySelector(`[data-v="${pace}"]`).click();
            const i3 = ins(3); step(3).querySelector(".jy-next").click();
            const fit = +document.querySelector(".ptile.is-fit").dataset.m;
            const fits = document.querySelectorAll(".ptile.is-fit").length;
            return { label: q("#estBig").textContent, why: q("#whyText").textContent, prep: !q("#prepNote").hidden,
              fit, fits, plan: q("#planName").textContent, amt: q("#planAmt").textContent, pm: q("#planPm").textContent,
              tail: q("#planTail").textContent, notes: [i0, i1, i2, i3] };
          }, { stage, kind, len, agents, pace });
          out.push({ today: d, answers: { stage, kind, len, agents: agents === "idk" ? 40 : agents, agentsUnknown: agents === "idk", pace }, ...r });
        }
  await page.close();
}
await browser.close();
writeFileSync("src/marketing/campaignEstimate.ref.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} cases`);

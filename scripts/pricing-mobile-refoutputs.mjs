/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Runs design-refs/pricing-page-mobile-v1.html's own "Which plan suits me best?" script in a browser,
 * with the clock pinned, across every answer combination, and writes what it prints, notes and all.
 * `campaignEstimate.test.ts` reads the file: the expected values come from the ref running, never
 * from reading its code.
 *
 *   node scripts/pricing-mobile-refoutputs.mjs [out.json] [YYYY-MM-DD …]
 *     (default out src/marketing/campaignEstimate.ref.json; dates 2026-10-24 and 2026-06-15)
 *
 * ⚠️ IT SUPERSEDES scripts/pricing-v4-refoutputs.mjs AS THE SOURCE OF THE FILE (pricing on phones,
 * 25 Oct). The two refs run the same arithmetic and print the same estimate, why sentence, plan and
 * notes; they differ only in the two tail sentences that used to sell an extra month for £5.99. The
 * phone ref carries the policy Nick set on 24 Oct ("we'll be in touch with options to extend"), so it
 * is the ref that describes the page as it now is. The desktop script is kept: run against
 * pricing-page-v2.html it still reproduces the old tails, which is how the swap was checked.
 *
 * The phone ref draws seven phones; only the first one's page is driven.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const outPath = args[0] && args[0].endsWith(".json") ? args.shift() : "src/marketing/campaignEstimate.ref.json";
const dates = args.length ? args : ["2026-10-24", "2026-06-15"];
const ref = "file://" + resolve("design-refs/pricing-page-mobile-v1.html");
const out = [];
const browser = await chromium.launch();
for (const d of dates) {
  const page = await browser.newPage();
  await page.clock.setFixedTime(new Date(d + "T12:00:00"));
  await page.goto(ref);
  await page.waitForFunction(() => document.querySelectorAll(".screen .jsheet").length === 7);
  for (const stage of ["prep", "ready", "already"])
    for (const [kind, len] of [["novel", "s"], ["novel", "m"], ["novel", "l"], ["nonfic", null], ["pb", null]])
      for (const agents of [5, 15, 20, 40, 60, 65, 100, 150, "idk"])
        for (const pace of ["steady", "brisk", "unsure"]) {
          const r = await page.evaluate(({ stage, kind, len, agents, pace }) => {
            const scr = document.querySelector(".screen");
            const q = (s) => scr.querySelector(s);
            const step = (n) => q(`.step[data-step="${n}"]`);
            const ins = (n) => { const b = step(n).querySelector(".ins"); return b.hidden ? "" : b.textContent; };
            const next = () => q(".js-next").click();
            /* back to the first question, as "Change my answers" or Back would take a reader */
            if (!step(4).hidden) q(".res-again").click();
            else while (step(0).hidden) q(".js-back").click();
            step(0).querySelector(`[data-v="${stage}"]`).click();
            const i0 = ins(0); next();
            step(1).querySelector(`[data-q="kind"] [data-v="${kind}"]`).click();
            if (len) step(1).querySelector(`[data-q="len"] [data-v="${len}"]`).click();
            const i1 = ins(1); next();
            const idk = q(".idk-chip");
            const now = () => +q(".stepper output").textContent;
            if (agents === "idk") {
              if (idk.getAttribute("aria-pressed") !== "true") idk.click();
            } else {
              if (idk.getAttribute("aria-pressed") === "true") step(2).querySelector('[data-d="5"]').click();
              while (now() > agents) step(2).querySelector('[data-d="-5"]').click();
              while (now() < agents) step(2).querySelector('[data-d="5"]').click();
            }
            const i2 = ins(2); next();
            step(3).querySelector(`[data-v="${pace}"]`).click();
            const i3 = ins(3); next();
            const fits = scr.querySelectorAll(".pt.fit");
            return {
              label: q(".res-big").textContent, why: q(".res-why").textContent, prep: !q(".res-prep").hidden,
              fit: +fits[0].dataset.m, fits: fits.length, plan: q(".res-card h3").textContent,
              amt: q(".res-card .amt").textContent, pm: q(".res-pm").textContent,
              tail: q(".res-tail").textContent, notes: [i0, i1, i2, i3],
            };
          }, { stage, kind, len, agents, pace });
          out.push({ today: d, answers: { stage, kind, len, agents: agents === "idk" ? 40 : agents, agentsUnknown: agents === "idk", pace }, ...r });
        }
  await page.close();
}
await browser.close();
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} cases → ${outPath}`);

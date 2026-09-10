/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v33 · Phase 2's gate, which v33.1 stated and never measured.
 *
 * "The card's height increases by the footer's former height ±2px at all four widths, with no
 * change to the cards above it." That is a BEFORE-AND-AFTER claim, so it needs both builds — and
 * the before is a commit, not a memory. Run it against `51910fc3` and against HEAD and diff.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4192";
const TAG = process.env.SA_FOOTER_TAG || "after";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const WIDTHS = (process.env.SA_WIDTHS || "1536,1710,1920,2520").split(",").map(Number);
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}
function read() {
  const box = (s) => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { y: Math.round(r.y*10)/10, h: Math.round(r.height*10)/10, w: Math.round(r.width*10)/10 }; };
  const foot = document.querySelector(".os-tkfoot");
  return {
    footer: foot ? Math.round(foot.getBoundingClientRect().height*10)/10 : null,
    footerText: foot ? (foot.textContent || "").trim().slice(0, 44) : null,
    todo: box('[data-probe="todo-card"]'),
    /* ⚠️ THE CARD FILLS ITS COLUMN, SO THE RECLAIM LANDS INSIDE IT. See the gate's note. */
    grid: box(".os-tkgrid"),
    rulezone: box(".os-rulezone"),
    hero: box('[data-probe="hero"]'),
    toprow: box('[data-probe="toprow"]'),
    tickets: document.querySelectorAll(".os-tkgrid > *").length,
    /**
     * ⚠️ WHAT THE RECLAIM ACTUALLY MOVES. The card is `flex: 1 1 auto` in its column, so its box
     * cannot grow; the grid is `align-content: start`, so its box cannot shrink. The card CLIPS
     * (`.os-tasks { overflow: hidden }`), and the footer sat below the grid inside that clip — so
     * the 40.4px shows up as more of the grid being inside the card. The reader-facing figure is
     * how much of the list is visible, and how many tickets are wholly on screen.
     */
    clip: (() => {
      const card = document.querySelector('[data-probe="todo-card"]');
      const grid = document.querySelector(".os-tkgrid");
      if (!card || !grid) return null;
      const cb = card.getBoundingClientRect(), gb = grid.getBoundingClientRect();
      const kids = [...grid.children];
      const whole = kids.filter((k) => k.getBoundingClientRect().bottom <= cb.bottom + 0.5).length;
      return {
        cardBottom: Math.round(cb.bottom * 10) / 10,
        gridTop: Math.round(gb.top * 10) / 10,
        gridBottom: Math.round(gb.bottom * 10) / 10,
        visibleGrid: Math.round((Math.min(gb.bottom, cb.bottom) - gb.top) * 10) / 10,
        wholeTickets: whole,
        scrollH: Math.round(card.scrollHeight), clientH: Math.round(card.clientHeight),
      };
    })(),
  };
}
const OUT = join(ROOT, "run-artifacts", "footer-v33"); mkdirSync(OUT, { recursive: true });
const out = {};
const browser = await chromium.launch();
for (const W of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  const s = await Promise.race([
    page.locator(SHELL).first().waitFor({state:"attached",timeout:60000}).then(()=>"shell").catch(()=>null),
    page.locator("#au-email").waitFor({state:"attached",timeout:60000}).then(()=>"form").catch(()=>null)]);
  if (s !== "shell") {
    await page.goto(APP + "/#/signin");
    await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
    await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
    await page.getByRole("button",{name:/^Sign in$/}).last().click();
    await page.locator(SHELL).first().waitFor({state:"visible",timeout:90000});
    await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(3400);
  out[W] = await page.evaluate(read);
  console.log("──── " + W + "  " + JSON.stringify(out[W]));
  await page.close();
}
await browser.close();
writeFileSync(join(OUT, TAG + ".json"), JSON.stringify(out, null, 2));
console.log("written: " + join(OUT, TAG + ".json"));

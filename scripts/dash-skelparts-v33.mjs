/**
 * v33 · Phase 4 diagnosis — the ghost's own parts against the loaded page's parts.
 * The region gate says WHERE the disagreement lands; this says WHAT is the wrong height.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const WIDTHS = (process.env.SA_WIDTHS || "1536,1710,1920,2520").split(",").map(Number);
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}

function readParts(sels) {
  const out = {};
  for (const [name, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { out[name] = null; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[name] = {
      x: Math.round(r.x*10)/10, y: Math.round(r.y*10)/10,
      w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10,
      pad: cs.padding, gap: cs.gap || cs.rowGap, mb: cs.marginBottom,
    };
  }
  return out;
}

const GHOST = {
  content: ".os-skelpage .os-content",
  grid: ".os-skelpage .os-grid",
  greet: ".os-skelpage .os-greet, .os-skelpage .os-sk-greet",
  toprow: ".os-skelpage .os-toprow",
  aut: ".os-skelpage .os-sk-aut",
  chart: ".os-skelpage .os-sk-chart",
  colL: ".os-skelpage .os-colL",
  colR: ".os-skelpage .os-colR",
  tasks: ".os-skelpage .os-sk-tasks",
  actv: ".os-skelpage .os-sk-actv",
  com: ".os-skelpage .os-sk-comstrip",
};
const REAL = {
  content: '[data-probe="main"]',
  grid: '[data-probe="grid"]',
  greet: '[data-probe="hero"]',
  toprow: '[data-probe="toprow"]',
  aut: '[data-probe="manuscript-card"]',
  chart: '[data-probe="chart-card"], .os-toprow .os-chart, .os-toprow > .os-card:last-child',
  ahead: '[data-probe="chart-header"]',
  plot: '[data-probe="plot"]',
  colL: ".os-colL",
  colR: ".os-colR",
  tasks: '[data-probe="todo-card"]',
  actv: '[data-probe="activity-card"]',
  com: '[data-probe="community-strip"], [data-probe="community-tile"]',
};

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
  }
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  let ghost = null;
  for (let i = 0; i < 160; i++) {
    const up = await page.evaluate(() => !!document.querySelector(".os-skelpage"));
    if (up) { ghost = await page.evaluate(readParts, GHOST); break; }
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(3200);
  const real = await page.evaluate(readParts, REAL);

  console.log("──── " + W);
  const names = [...new Set([...Object.keys(GHOST), ...Object.keys(REAL)])];
  for (const n of names) {
    const g = ghost && ghost[n], r = real[n];
    const f = (o) => o ? `x${String(o.x).padStart(6)} y${String(o.y).padStart(6)} w${String(o.w).padStart(7)} h${String(o.h).padStart(7)}` : "—".padStart(30);
    console.log("   " + n.padEnd(9) + " ghost " + f(g) + "   real " + f(r));
  }
  await page.close();
}
await browser.close();

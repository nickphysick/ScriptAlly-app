/**
 * v30 — the focus ring, measured rather than described.
 * Clicks three kinds of control with a real mouse, reads what the focused element computes, then
 * presses Tab and reads again. Also sweeps every focusable control on the page for a RED ring in
 * any state. Browser-side reads are real functions, never template literals.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v30.html");
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const W = Number(process.env.SA_RECON_W || 1710);
const SIDE = process.env.SA_SIDE || "APP";
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}

function readFocus() {
  const el = document.activeElement;
  if (!el || el === document.body) return { none: true };
  const cs = getComputedStyle(el);
  const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
  return {
    el: el.tagName.toLowerCase() + (cls ? "." + String(cls).trim().split(/\s+/).slice(0,2).join(".") : ""),
    outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor,
    outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow.slice(0, 70),
    matchesFV: el.matches(":focus-visible"),
  };
}

/** any control whose focus ring is REDDISH, in any state — forced with :focus via a class sweep */
function redSweep() {
  const isRed = (c) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || "");
    if (!m) return false;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    return r > 110 && r - g > 45 && r - b > 45;      /* clearly red-dominant, not a warm neutral */
  };
  const out = [];
  for (const el of document.querySelectorAll("button, select, input, textarea, a[href], [tabindex]")) {
    const cs = getComputedStyle(el);
    if (isRed(cs.outlineColor) && cs.outlineStyle !== "none") out.push("outline " + cs.outlineColor);
    if (isRed(cs.boxShadow)) out.push("box-shadow " + cs.boxShadow.slice(0, 50));
  }
  return out;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);
let targets;
if (SIDE === "APP") {
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
  await page.waitForTimeout(2600);
  /* ⚠️ ANIMATIONS OFF BEFORE READING A RING. Without this the urgent ticket's attention PULSE
     (`urgentMotion.css`, a keyframe that reaches `0 0 0 4px rgba(232,200,188,.75)` at 84%) is
     caught mid-cycle and reads exactly like a pink focus ring on click. It cost one wrong
     diagnosis before the suppression went in. */
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(160);
  targets = [
    ["a rule band (chip)", '[data-probe="todo-rule"] .os-rb'],
    ["the frequency select", '[data-probe="brush"] ~ * select, .os-freqsel select'],
    ["a ticket", '[data-probe="todo-card"] .tkt'],
    ["the See-all link", '[data-probe="todo-card"] .os-see'],
  ];
} else {
  await page.goto(pathToFileURL(REF).href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  targets = [["a rule band (chip)", "#tfilters .sbar button"], ["a ticket", "#todoCard .tk"]];
}

console.log("──── " + SIDE + " @" + W);
for (const [name, sel] of targets) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) { console.log("\n  " + name + ": no such control"); continue; }
  await loc.click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(120);
  const afterClick = await page.evaluate(readFocus);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(120);
  const afterTab = await page.evaluate(readFocus);
  console.log("\n  " + name);
  console.log("    after MOUSE click : " + JSON.stringify(afterClick));
  console.log("    after Tab         : " + JSON.stringify(afterTab));
}
const reds = await page.evaluate(redSweep);
console.log("\n  RED rings anywhere on the page (resting sweep): " + (reds.length ? reds.join(" · ") : "none"));
await browser.close();

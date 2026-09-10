/**
 * v33 · Phase 3 — the sidebar boundary, and the standing gate that keeps it.
 *
 * ⚠️ TWO OF THIS PHASE'S THREE STATED CAUSES WERE ALREADY TRUE, and measuring said so before
 * anything was built: `.ws-panel` computes `border-right-width: 0px` and
 * `background-color: rgba(0,0,0,0)` on BOTH `/dashboard` and `/queries`. What was missing was the
 * soft scrim — `.dash-mode .ws-window::before`, a 16px gradient inside the content window's own
 * left edge — and only that variant was built. The ref carries five for comparison; four are not
 * features.
 *
 * ⚠️ THE GATE IS TWO-SIDED, AND THAT IS THE POINT. A scrim that reached every page would be a
 * dashboard decision applied to nine pages nobody asked about, so `/queries` is measured in the
 * same run and must report `content: none`. A one-route check cannot tell a scoped feature from a
 * global one.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}
function readRail() {
  const out = {};
  for (const sel of [".ws-panel", ".ws-side", ".ws-nav", ".sv2-app > aside", "aside"]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out[sel] = { w: Math.round(r.width), borderRight: cs.borderRightWidth + " " + cs.borderRightColor,
                 bg: cs.backgroundColor, boxShadow: cs.boxShadow.slice(0, 40) };
  }
  const work = document.querySelector(".ws-work");
  if (work) { const cs = getComputedStyle(work); out[".ws-work"] = { bg: cs.backgroundColor, pos: cs.position }; }
  const win = document.querySelector(".ws-window");
  out.scrim = null;
  if (win) {
    const cs2 = getComputedStyle(win, "::before");
    const wr = win.getBoundingClientRect();
    out.dashMode = !!document.querySelector(".dash-mode");
    out.scrim = { content: cs2.content, width: cs2.width, pe: cs2.pointerEvents, z: cs2.zIndex,
      bg: cs2.backgroundImage.slice(0, 58), winH: Math.round(wr.height),
      hit: (() => { const e = document.elementFromPoint(wr.x + 8, wr.y + wr.height / 2);
        const c = e && (e.className.baseVal !== undefined ? e.className.baseVal : e.className);
        return e ? e.tagName.toLowerCase() + (c ? "." + String(c).trim().split(/\s+/)[0] : "") : "(null)"; })() };
  }
  return out;
}
const OUT = join(ROOT, "run-artifacts", "rail-v33");
mkdirSync(OUT, { recursive: true });
const seen = {};
const browser = await chromium.launch();
for (const route of ["/dashboard", "/queries"]) {
  const page = await browser.newPage({ viewport: { width: 1710, height: 1150 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  await page.goto(APP + route, { waitUntil: "domcontentloaded" });
  const s = await Promise.race([
    page.locator(SHELL).first().waitFor({state:"attached",timeout:60000}).then(()=>"shell").catch(()=>null),
    page.locator("#au-email").waitFor({state:"attached",timeout:60000}).then(()=>"form").catch(()=>null)]);
  if (s !== "shell") {
    await page.goto(APP + "/#/signin");
    await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
    await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
    await page.getByRole("button",{name:/^Sign in$/}).last().click();
    await page.locator(SHELL).first().waitFor({state:"visible",timeout:90000});
    await page.goto(APP + route, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2600);
  console.log("──── " + route);
  const d = await page.evaluate(readRail);
  seen[route] = d;
  for (const [k, v] of Object.entries(d)) console.log("   " + String(k).padEnd(16) + " " + JSON.stringify(v));
  await page.close();
}
await browser.close();

/**
 * ⚠️ THE VERDICT IS COMPUTED HERE AND WRITTEN AS JSON, so `dash-refdiff.mjs` can carry it as a
 * standing gate rather than a thing somebody remembers to run. A measurement nobody runs by default
 * is a measurement that stops being true without anybody finding out.
 */
const dash = seen["/dashboard"] || {};
const other = seen["/queries"] || {};
const panelD = dash[".ws-panel"] || null;
const panelO = other[".ws-panel"] || null;
const verdict = {
  /* the boundary itself: no hard rule on the dashboard, and the SAME treatment on every other page */
  panelBorderDash: panelD ? panelD.borderRight : null,
  panelBorderOther: panelO ? panelO.borderRight : null,
  borderZeroOnDash: !!panelD && /^0px /.test(panelD.borderRight),
  borderUnchangedElsewhere: !!panelD && !!panelO && panelD.borderRight === panelO.borderRight,
  /* the scrim: present and inert on the dashboard, absent everywhere else */
  scrimOnDash: !!dash.scrim && dash.scrim.content !== "none",
  scrimWidth: dash.scrim ? dash.scrim.width : null,
  scrimPointerEvents: dash.scrim ? dash.scrim.pe : null,
  scrimZ: dash.scrim ? dash.scrim.z : null,
  scrimSpansWindow: !!dash.scrim && dash.scrim.winH > 400,
  /* ⚠️ THE HIT TEST IS THE ONLY THING THAT PROVES `pointer-events: none` REACHED THE PAINT.
     A computed `none` on a pseudo-element that never painted reads identically. */
  scrimHit: dash.scrim ? dash.scrim.hit : null,
  scrimOffOther: !!other.scrim && other.scrim.content === "none",
};
verdict.pass = verdict.borderZeroOnDash && verdict.borderUnchangedElsewhere
  && verdict.scrimOnDash && verdict.scrimWidth === "16px" && verdict.scrimPointerEvents === "none"
  && verdict.scrimZ === "0" && verdict.scrimSpansWindow
  && verdict.scrimHit !== null && !/before|scrim/i.test(verdict.scrimHit)
  && verdict.scrimOffOther;
writeFileSync(join(OUT, "rail.json"), JSON.stringify(verdict, null, 2));
console.log("");
console.log("GATE railBoundary: " + (verdict.pass ? "pass" : "FAIL") + "  " + JSON.stringify(verdict));

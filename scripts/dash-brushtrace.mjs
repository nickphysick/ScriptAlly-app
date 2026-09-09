/** Does the track itself move during a drag? Trace the live box, not just the handle. */
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = "http://127.0.0.1:4173";
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v29.html");
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const W = Number(process.env.SA_RECON_W || 1536);
const SIDE = process.env.SA_SIDE || "APP";
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:W,height:1150}, deviceScaleFactor:1 });
page.setDefaultTimeout(120000);
if (SIDE === "APP") {
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({state:"attached",timeout:60000}).then(()=> "shell").catch(()=>null),
    page.locator("#au-email").waitFor({state:"attached",timeout:60000}).then(()=> "form").catch(()=>null)]);
  if (settled !== "shell") {
    await page.goto(APP + "/#/signin");
    await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
    await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
    await page.getByRole("button",{name:/^Sign in$/}).last().click();
    await page.locator(SHELL).first().waitFor({state:"visible",timeout:90000});
    await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2600);
} else {
  await page.goto(pathToFileURL(REF).href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
}
await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
await page.waitForTimeout(200);

const SEL = SIDE === "APP"
  ? { track: '[data-probe="brush"] .os-bw', win: '[data-probe="brush"] .os-bwin', lbl: '.os-ctrls .os-rangelbl' }
  : { track: '#bw', win: '#bwin', lbl: '#bLbl' };

const box0 = await page.evaluate((s) => {
  const t = document.querySelector(s.track); if (!t) return null;
  const r = t.getBoundingClientRect(); return { x:r.left, y:r.top + r.height/2, w:r.width };
}, SEL);
if (!box0) { console.log("no track for", SIDE); await browser.close(); process.exit(0); }

const read = () => page.evaluate((s) => new Promise((res) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const t = document.querySelector(s.track), h = document.querySelector(s.win), l = document.querySelector(s.lbl);
    const cap = t.closest('.brush, .os-brush');
    const tr = t.getBoundingClientRect(), hr = h.getBoundingClientRect();
    const cr = cap ? cap.getBoundingClientRect() : {left:0,width:0};
    res({ trackLeft: Math.round(tr.left*100)/100, trackW: Math.round(tr.width*100)/100,
          handleLeft: Math.round((hr.left - tr.left)*100)/100,
          lblW: l ? Math.round(l.getBoundingClientRect().width*100)/100 : null,
          capLeft: Math.round(cr.left*100)/100, capW: Math.round(cr.width*100)/100,
          lbl: l ? (l.textContent||"").trim() : null });
  }));
}), SEL);

console.log("──── " + SIDE + " @" + W + "  track x=" + Math.round(box0.x) + " w=" + Math.round(box0.w));
console.log("  f      cursorX   trackLeft  trackW  handleLeft  cursorOff  lblW   label");
await page.mouse.move(box0.x + box0.w*0.05, box0.y);
await page.mouse.down();
for (let k = 0; k < 20; k++) {
  const f = 0.05 + 0.9*k/19;
  const cx = box0.x + box0.w*f;
  await page.mouse.move(cx, box0.y);
  const r = await read();
  const cursorOff = Math.round((cx - r.trackLeft)*100)/100;
  console.log("  " + f.toFixed(2) + "   " + String(Math.round(cx)).padStart(7)
    + "   " + String(r.trackLeft).padStart(9) + "  " + String(r.trackW).padStart(6)
    + "  " + String(r.handleLeft).padStart(10) + "  " + String(cursorOff).padStart(9)
    + "  " + String(r.lblW).padStart(6) + "  cap[" + r.capLeft + " w" + r.capW + "]  " + r.lbl);
}
await page.mouse.up();
const s = await read();
console.log("  settled: handleLeft=" + s.handleLeft + "  label=" + s.lbl);
await browser.close();

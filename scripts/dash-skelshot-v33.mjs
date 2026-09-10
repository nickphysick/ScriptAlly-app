/** v33 · a picture of the ghost — geometry can be perfect while the page looks broken. */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const OUT = join(ROOT, "run-artifacts", "skeleton-v33"); mkdirSync(OUT, { recursive: true });
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}
const browser = await chromium.launch();
for (const W of (process.env.SA_WIDTHS || "1710,2520").split(",").map(Number)) {
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
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(() => !!document.querySelector(".os-skelpage"))) break;
    await page.waitForTimeout(20);
  }
  await page.screenshot({ path: join(OUT, "ghost-" + W + ".png") });
  await page.waitForTimeout(3400);
  await page.screenshot({ path: join(OUT, "loaded-" + W + ".png") });
  console.log("shot " + W);
  await page.close();
}
await browser.close();

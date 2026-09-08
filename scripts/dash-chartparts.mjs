import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const env = (k) => (readFileSync("/Users/nickphysick/ScriptAlly-app/.env.local","utf8").match(new RegExp("^"+k+"=(.*)$","m"))||[])[1];
const REF = "file:///private/tmp/sa-dash-wt/design-refs/dashboard-cappuccino-v16.html";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1904, height: 1540 }, deviceScaleFactor: 1 });
const rp = await ctx.newPage();
await rp.goto(REF, { waitUntil: "networkidle" });
console.log("REF ", await rp.evaluate(() => {
  const H = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height*10)/10 : null; };
  return JSON.stringify({ card: H("#chartCard"), hd: H("#chartCard .hd"), chart: H("#chartCard .chart"),
    svg: H("#chartCard .chart > svg"), legend: H("#chartCard .legend") });
}));
const p = await ctx.newPage();
p.setDefaultTimeout(120000); p.setDefaultNavigationTimeout(120000);
await p.goto("http://127.0.0.1:4173/#/signin", { waitUntil: "domcontentloaded" });
await p.locator("#au-email").waitFor({ state: "visible", timeout: 90000 });
await p.locator("#au-email").fill(env("SA_E2E_EMAIL") || "harness@scriptally.test");
await p.locator("#au-pw").fill(env("SA_E2E_PASSWORD"));
await p.getByRole("button", { name: /^Sign in$/ }).last().click();
await p.locator(".ws-app").first().waitFor({ state: "visible", timeout: 90000 });
await p.goto("http://127.0.0.1:4173/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
console.log("APP ", await p.evaluate(() => {
  const vis = (s) => [...document.querySelectorAll(s)].find(e => e.getBoundingClientRect().height > 0);
  const H = (s) => { const e = vis(s); return e ? Math.round(e.getBoundingClientRect().height*10)/10 : null; };
  const band = vis(".os-lead > .os-ahead");
  return JSON.stringify({ card: H(".os-lead"), hd: H(".os-lead > .os-ahead"), lbody: H(".os-lbody"),
    wrap: H(".os-chartwrap"), legend: H(".os-bandkey"), xlab: H(".os-xlabels"),
    bandKids: band ? [...band.children].map(c => (c.className||"").toString().split(" ")[0] + " " + Math.round(c.getBoundingClientRect().height*10)/10) : null });
}));
await b.close();

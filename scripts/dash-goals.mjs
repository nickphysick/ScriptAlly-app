import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const env = (k) => (readFileSync("/Users/nickphysick/ScriptAlly-app/.env.local","utf8").match(new RegExp("^"+k+"=(.*)$","m"))||[])[1];
const b = await chromium.launch();
for (const [w, h] of [[1544, 1622], [1904, 1540]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(120000); p.setDefaultNavigationTimeout(120000);
  await p.goto("http://127.0.0.1:4173/#/signin", { waitUntil: "domcontentloaded" });
  await p.locator("#au-email").waitFor({ state: "visible", timeout: 90000 });
  await p.locator("#au-email").fill(env("SA_E2E_EMAIL") || "harness@scriptally.test");
  await p.locator("#au-pw").fill(env("SA_E2E_PASSWORD"));
  await p.getByRole("button", { name: /^Sign in$/ }).last().click();
  await p.locator(".ws-app").first().waitFor({ state: "visible", timeout: 90000 });
  await p.goto("http://127.0.0.1:4173/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  console.log(w, JSON.stringify(await p.evaluate(() => {
    const vis = (s) => [...document.querySelectorAll(s)].find(e => e.getBoundingClientRect().height > 0);
    const card = vis("[data-probe='goals-card']"); if (!card) return "no card";
    const H = (e) => e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null;
    const rings = card.querySelector(".os-goal-rings");
    const kids = rings ? [...rings.children].map(c => Math.round(c.getBoundingClientRect().y)) : [];
    return {
      card: H(card), w: Math.round(card.getBoundingClientRect().width),
      parts: [...card.firstElementChild.children].map(c => (c.className||"").toString().split(" ")[0] + " " + H(c)),
      slots: kids.length, slotRows: new Set(kids).size,
      hist: H(card.querySelector(".os-goal-hist")),
      barLabels: [...card.querySelectorAll(".os-goal-hlb")].map(e => e.textContent.trim()),
      overflowX: card.scrollWidth - card.clientWidth,
    };
  }), null, 0));
  await p.close();
}
await b.close();

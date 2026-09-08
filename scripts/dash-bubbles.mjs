import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const env = (k) => (readFileSync("/Users/nickphysick/ScriptAlly-app/.env.local","utf8").match(new RegExp("^"+k+"=(.*)$","m"))||[])[1];
const b = await chromium.launch();
for (const w of [1536, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(120000); p.setDefaultNavigationTimeout(120000);
  await p.goto("http://127.0.0.1:4173/#/signin", { waitUntil: "domcontentloaded" });
  await p.locator("#au-email").waitFor({ state: "visible", timeout: 90000 });
  await p.locator("#au-email").fill(env("SA_E2E_EMAIL") || "harness@scriptally.test");
  await p.locator("#au-pw").fill(env("SA_E2E_PASSWORD"));
  await p.getByRole("button", { name: /^Sign in$/ }).last().click();
  await p.locator(".ws-app").first().waitFor({ state: "visible", timeout: 90000 });
  await p.goto("http://127.0.0.1:4173/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => {
    const vis = (el) => el.getBoundingClientRect().height > 0;
    const feed = [...document.querySelectorAll("[data-probe='feed']")].find(vis);
    if (!feed) return { error: "no visible feed" };
    const fr = feed.getBoundingClientRect();
    const cs = getComputedStyle(feed);
    const inner = { left: fr.left + parseFloat(cs.paddingLeft), right: fr.right - parseFloat(cs.paddingRight) };
    const bubs = [...feed.querySelectorAll(".os-bub")].filter(vis);
    let bodyFilled = [], stripCount = {}, overflow = [], desk = 0, mirrored = 0;
    for (const bub of bubs) {
      const body = bub.querySelector(".os-bubin"); if (!body) continue;
      const bg = getComputedStyle(body).backgroundColor;
      if (!["rgb(255, 253, 249)", "rgb(255, 255, 255)"].includes(bg)) bodyFilled.push(bg);
      const strips = body.querySelectorAll(".os-bubstrip").length;
      const isDesk = bub.classList.contains("desk");
      if (isDesk) { desk += 1; if (strips) stripCount.deskHasStrip = (stripCount.deskHasStrip ?? 0) + 1; }
      else if (bub.classList.contains("run")) stripCount.run = (stripCount.run ?? 0) + 1;
      else stripCount[strips] = (stripCount[strips] ?? 0) + 1;
      const br = body.getBoundingClientRect();
      if (br.right > inner.right + 1 || br.left < inner.left - 1) overflow.push(Math.round(br.right - inner.right));
      if (bub.classList.contains("out")) {
        const say = bub.querySelector(".os-bubsay");
        if (say && getComputedStyle(say).textAlign === "right") mirrored += 1;
      }
    }
    return {
      bubbles: bubs.length, desk, bodyFilled, stripCount, overflow,
      outMirrored: mirrored, out: bubs.filter((x) => x.classList.contains("out")).length,
      feedScrollX: feed.scrollWidth - feed.clientWidth,
      metaEllipsis: getComputedStyle(feed.querySelector(".os-bubwho i") ?? feed).textOverflow,
    };
  });
  console.log(w, JSON.stringify(r));
  await p.close();
}
await b.close();

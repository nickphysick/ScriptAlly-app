/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.1 — THE REPORT'S PICTURES (not locks): shots at 1512 × 900 and 1280 × 800 beside the reference's screens
 * 01–14 and 19; the stills (the border mid-breath at each stage and with no query, the colour held mid-save, the light a
 * third of the way round, the same on Undo); and the screen recordings at CPU 1× and 4×. Motion suppression lifted.
 * Out: reports/agent-card-v2-1/{shots,stills,video}/. Every seed call has a timeout.
 */
import { test, type Page, type BrowserContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openCard, SIZES } from "./cl262Lib";

const DIR = "reports/agent-card-v2-1";
const AC = "[data-cl262='panel'] [data-acv2='card']";
const seed = () => execFileSync("node", ["tests/e2e/seedAcv21.mjs"], { stdio: "inherit", timeout: 60_000 });
const clean = () => execFileSync("node", ["tests/e2e/seedAcv21.mjs", "--clean"], { stdio: "inherit", timeout: 60_000 });
const dir = (d: string) => { mkdirSync(`${DIR}/${d}`, { recursive: true }); return `${DIR}/${d}`; };
const STAGE_CANDIDATES = ["seed-agent-4", "seed-agent-7", "seed-agent-8", "msv12-agent-3", "rj-agent-1", "seed-agent-9", "seed-agent-12", "cv25-agent-08", "seed-agent-2", "seed-agent-5", "acv21fx-full"];

async function lift(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addStyleTag({ content: "*, *::before, *::after { animation-play-state: running !important; }" }).catch(() => {});
}
async function open(page: Page, id: string, vp: { width: number; height: number }) {
  await openCard(page, { ...vp }, { id });
  await page.locator(AC).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
}
async function pen(page: Page, k: string) {
  if (await page.locator(`${AC} [data-acv21='open'][data-k='${k}']`).count()) return;
  const sec = k === "contact" ? page.locator(`${AC} [data-acv2='head']`) : page.locator(`${AC} [data-cl262='sec'][data-k='${k}']`);
  await sec.first().hover();
  await page.locator(`${AC} [data-cl262='pen'][data-k='${k}']`).first().click();
  await page.waitForTimeout(700);
}
async function clip(page: Page) {
  const b = await page.locator("[data-cl262='panel']").first().boundingBox();
  const vp = page.viewportSize()!;
  if (!b) return undefined;
  const x = Math.max(0, b.x - 30), y = Math.max(0, b.y - 20);
  return { x, y, width: Math.min(vp.width - x, b.width + 60), height: Math.min(vp.height - y, b.height + 40) };
}
const shot = async (page: Page, d: string, name: string) => { await page.screenshot({ path: `${dir(d)}/${name}.png`, clip: await clip(page) }).catch((e) => console.log(`  shot ${name}: ${String(e).slice(0, 120)}`)); };
const cross = async (page: Page, k: string) => { await page.locator(`${AC} [data-acv21='cross'][data-k='${k}']`).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400); };
const scrollBody = (page: Page, to: "top" | "bottom" | string) => page.evaluate((to) => {
  const c = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel'] [data-acv2='card']")].find((e) => e.offsetHeight > 0)!;
  const sc = c.querySelector<HTMLElement>("[data-apc='scroll']")!;
  if (to === "top") sc.scrollTop = 0; else if (to === "bottom") sc.scrollTop = sc.scrollHeight;
  else { const el = c.querySelector<HTMLElement>(to); if (el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12; }
}, to);

test.describe.configure({ mode: "default" });
/* video for the file (Playwright allows it only at the top level); only the recordings keep theirs */
test.use({ video: { mode: "on", size: SIZES[0] } });
test.beforeAll(() => { seed(); });
test.afterAll(() => { clean(); });

for (const vp of SIZES) {
  test(`AC21 shots · ${vp.width} × ${vp.height}`, async ({ page }) => {
    test.setTimeout(90_000 * 3);
    const w = vp.width, d = "shots";
    await open(page, "acv21fx-full", vp);
    await shot(page, d, `${w}-01-reading`);
    await scrollBody(page, "bottom"); await page.waitForTimeout(300);
    await shot(page, d, `${w}-02-reading-lower`);
    await scrollBody(page, "top"); await page.waitForTimeout(300);
    await page.locator(`${AC} [data-acv2='head']`).hover(); await page.waitForTimeout(300);
    await shot(page, d, `${w}-03-name-pencil`);
    await pen(page, "contact");
    await shot(page, d, `${w}-04-contact-open`);
    await page.locator(`${AC} input[data-ae='city']`).fill("Dublin"); await page.waitForTimeout(500);
    await scrollBody(page, "[data-acv21='geo']"); await page.waitForTimeout(300);
    await shot(page, d, `${w}-05-city-country-offer`);
    await page.locator(`${AC} [data-acv21='city-set']`).click().catch(() => {}); await page.waitForTimeout(400);
    await shot(page, d, `${w}-06-country-changed`);
    await cross(page, "contact");
    await pen(page, "how");
    await shot(page, d, `${w}-07-how-open`);
    await cross(page, "how");
    /* an agent with an open query: the response-time offer */
    await open(page, "seed-agent-4", vp);
    await pen(page, "how");
    const r = page.locator(`${AC} [data-acv21='open'][data-k='how'] [data-aap='weeks'] input[type='range']`);
    await r.focus().catch(() => {}); for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500);
    await scrollBody(page, "[data-co='rt']"); await page.waitForTimeout(300);
    await shot(page, d, `${w}-08-how-dates-offer`);
    await page.locator(`${AC} [data-acv21='tick'][data-k='how']`).click().catch(() => {}); await page.waitForTimeout(400);
    await shot(page, d, `${w}-09-how-saved`);
    await page.locator(".sa-toast-undo:visible").last().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500);
    await open(page, "acv21fx-full", vp);
    await pen(page, "wishlist"); await pen(page, "genres");
    await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill("Thrillers with a moral knot at the centre, and a sense of place.");
    await page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`).fill("Hor"); await page.waitForTimeout(400);
    await shot(page, d, `${w}-10-two-open-genres-find`);
    await page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`).fill("");
    await page.locator(`${AC} [data-cl262='tab'][data-tab='history']`).click(); await page.waitForTimeout(500);
    await shot(page, d, `${w}-11-leave-guard`);
    await page.locator(`${AC} [data-cl262='discard']`).click().catch(() => {}); await page.waitForTimeout(600);
    await page.locator(`${AC} [data-cl262='tab'][data-tab='profile']`).click(); await page.waitForTimeout(400);
    await pen(page, "materials");
    await shot(page, d, `${w}-12-asks-open`);
    await page.locator(`${AC} [data-acv21='mtick'][data-k='smp']`).click().catch(() => {});
    await page.locator(`${AC} [data-acv21='unit'] [data-unit='Chapters']`).click().catch(() => {}); await page.waitForTimeout(300);
    await scrollBody(page, "[data-acv21='open'][data-k='materials']"); await page.waitForTimeout(300);
    await shot(page, d, `${w}-13-asks-quantities`);
    await page.locator(`${AC} [data-acv21='tick'][data-k='materials']`).click().catch(() => {}); await page.waitForTimeout(1800);
    await shot(page, d, `${w}-14-asks-saved`);
    await page.locator(".sa-toast-undo:visible").last().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500);
    await open(page, "acv21fx-nameonly", vp);
    await shot(page, d, `${w}-19-name-only-profile`);
  });
}

test("AC21 stills · the border at each stage, mid-save, the light, the light on Undo", async ({ page }) => {
  test.setTimeout(90_000 * 4);
  const vp = SIZES[0], d = "stills";
  const done = new Set<string>();
  /* every stage: walk the cards with › from the first, and take the first agent of each tone (the tone follows the active
     manuscript, so ids cannot be guessed) */
  await open(page, "acv21fx-full", vp);
  const pv = page.locator(`${AC} [data-cl262='prev']`);
  for (let i = 0; i < 80 && (await pv.isEnabled()); i++) { await pv.click(); await page.waitForTimeout(100); }
  await lift(page);
  for (let i = 0; i < 80 && done.size < 6; i++) {
    const tone = (await page.locator(AC).first().getAttribute("data-tone").catch(() => "")) ?? "";
    if (tone && !done.has(tone)) {
      done.add(tone);
      await pen(page, "how");
      for (let j = 0; j < 60; j++) {
        const o = await page.evaluate(() => { const b = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-acv2='card'] > .qc163-rim > b"); return b ? parseFloat(getComputedStyle(b).opacity) : 0; });
        if (o > 0.6) break;
        await page.waitForTimeout(80);
      }
      await shot(page, d, `breath-${tone}`);
      await cross(page, "how");
    }
    const nx = page.locator(`${AC} [data-cl262='next-agent']`);
    if (!(await nx.isEnabled())) break;
    await nx.click();
    await page.waitForTimeout(250);
  }
  console.log(`  stills · stages seen: ${[...done].join(", ")}`);
  /* the colour held mid-save, the light a third of the way round, and the same on Undo */
  await open(page, "acv21fx-edit", vp);
  await lift(page);
  await pen(page, "wishlist");
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(`A still ${Date.now() % 1000}.`);
  await page.waitForTimeout(900);
  const tk = await page.locator(`${AC} [data-acv21='tick'][data-k='wishlist']`).boundingBox();
  await page.mouse.move(tk!.x + tk!.width / 2, tk!.y + tk!.height / 2);
  await page.mouse.down(); await page.waitForTimeout(350);
  await shot(page, d, "held-mid-save");
  const third = (back: boolean) => page.evaluate((back) => new Promise<boolean>((res) => {
    const t0 = performance.now();
    const look = () => {
      const a = document.getAnimations().find((x) => x.id === "qc163-light" && x.playState === "running" && ((x.effect as KeyframeEffect).target as HTMLElement).style.scale.startsWith(back ? "-1" : "1"));
      if (a && Number(a.currentTime) >= 1300 / 3) { res(true); return; }
      if (performance.now() - t0 > 6000) { res(false); return; }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }), back);
  const p1 = third(false);
  await page.mouse.up();
  if (await p1) await shot(page, d, "light-a-third-round");
  await page.waitForTimeout(800);
  const p2 = third(true);
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 6000 }).catch(() => {});
  if (await p2) await shot(page, d, "undo-light-a-third-round");
  await page.waitForTimeout(1200);
});

/** the brief's recording: Genres by its pencil, six seconds of the border breathing, type and add a genre, the wishlist
 *  too and changed, tick the wishlist, cross the genres, Undo, a number of words in what they ask for and tick it, "Dublin"
 *  as the city and the offer taken, then a tab change to see the rust bar and Save all */
async function record(context: BrowserContext, page: Page, rate: number) {
  const cdp = await context.newCDPSession(page);
  await open(page, "acv21fx-edit", SIZES[0]);
  await lift(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await pen(page, "genres");
  await page.waitForTimeout(6000);
  const gi = page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`);
  await gi.click(); await page.keyboard.type("Hor", { delay: 120 }); await page.waitForTimeout(500); await page.keyboard.press("Enter"); await page.waitForTimeout(800);
  await pen(page, "wishlist");
  const wl = page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`);
  await wl.click(); await page.keyboard.press("End"); await page.keyboard.type(" And a sense of place.", { delay: 60 }); await page.waitForTimeout(2600);
  await page.locator(`${AC} [data-acv21='tick'][data-k='wishlist']`).click(); await page.waitForTimeout(2600);
  await page.locator(`${AC} [data-acv21='cross'][data-k='genres']`).click(); await page.waitForTimeout(800);
  /* Undo the wishlist's save: the light runs back */
  await page.evaluate(() => { const t = [...document.querySelectorAll<HTMLElement>(".sa-toast")].find((e) => /Saved the wishlist/.test(e.textContent ?? "")); t?.querySelector<HTMLElement>(".sa-toast-undo")?.click(); });
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2600);
  await pen(page, "materials");
  await page.locator(`${AC} [data-acv21='mtick'][data-k='smp']`).click().catch(() => {});
  await page.locator(`${AC} [data-acv21='unit'] [data-unit='Words']`).click().catch(() => {}); await page.waitForTimeout(400);
  await page.locator(`${AC} [data-acv21='step'][data-k='smp'] [data-acv21='more']`).click().catch(() => {}); await page.waitForTimeout(600);
  await page.locator(`${AC} [data-acv21='tick'][data-k='materials']`).click(); await page.waitForTimeout(2600);
  await pen(page, "contact");
  const city = page.locator(`${AC} input[data-ae='city']`);
  await city.click(); await city.fill(""); await page.keyboard.type("Dublin", { delay: 120 }); await page.waitForTimeout(900);
  await page.locator(`${AC} [data-acv21='city-set']`).click().catch(() => {}); await page.waitForTimeout(900);
  await page.locator(`${AC} [data-cl262='tab'][data-tab='history']`).click(); await page.waitForTimeout(1500);
  await page.locator(`${AC} [data-acv21='save-all']`).click().catch(() => {}); await page.waitForTimeout(3500);
  /* put the agent back (Undo the Save all, then the materials) */
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(2500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
}
test.describe("AC21 recordings", () => {
  for (const rate of [1, 4]) {
    test(`AC21 recording · CPU ${rate}×`, async ({ page, context }) => {
      test.setTimeout(90_000 * 6);
      const vdir = dir("video");
      await record(context, page, rate).catch((e) => console.log(`  recording ${rate}×: ${String(e).slice(0, 200)}`));
      const v = page.video();
      await page.close();
      if (v) await v.saveAs(`${vdir}/acv21-cpu${rate}x.webm`);
    });
  }
});

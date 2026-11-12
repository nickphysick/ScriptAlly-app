/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 — the report's screenshots: the mock ("With principles") beside the built page at 1440
 * and 1280, each state, the add and Agent fit feedback, and the page at a 720px-wide content column. Writes only to
 * reports/contact-list-principles-v1/shots/. The add is undone in the same run (its own snackbar's Undo).
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openApp } from "./pageHeaderV2Lib";
import { KILL_MOTION_ID } from "./measure";

const OUT = "reports/contact-list-principles-v1/shots";
const MOCK = `file://${resolve("design-refs/contact-list-principles-v1/contact-list-principles-v1.html")}`;
mkdirSync(OUT, { recursive: true });
const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/aa1Emu.mjs", cmd], { encoding: "utf8" }).trim();

async function openCl(page: Page, vp: { width: number; height: number }, state?: string) {
  await page.setViewportSize(vp);
  await page.addInitScript((x) => {
    try {
      for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1");
      localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", group26: "letter" }));
    } catch { /* */ }
    if (x) (window as unknown as { __SA_CLP_STATE?: string }).__SA_CLP_STATE = x;
  }, state ?? "");
  await openApp(page, "/agents", vp);
  if (state === "loading" || state === "error") await page.locator(`.aglist [data-clp='state'][data-k='${state}']`).first().waitFor({ timeout: 30_000 });
  else await page.locator(".aglist [data-cl26='row']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.mouse.move(3, 3);
}
const unkill = (p: Page) => p.evaluate((id) => { for (const st of document.querySelectorAll("style")) if ((st.textContent ?? "").startsWith(`/*${id}*/`)) st.remove(); }, KILL_MOTION_ID);

test("CLP shots · the mock beside the page at 1440 and 1280", async ({ page }) => {
  test.setTimeout(240_000);
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(vp);
    await page.goto(MOCK);
    await page.waitForTimeout(2500);
    /* the notes card minimised, so the page under it shows */
    await page.frameLocator("#cf").locator(".pp-notes [data-min]").click().catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/mock-${vp.width}.png` });
    await openCl(page, vp);
    await page.screenshot({ path: `${OUT}/page-${vp.width}.png` });
  }
});

test("CLP shots · each state", async ({ page }) => {
  test.setTimeout(300_000);
  const vp = { width: 1440, height: 900 };
  for (const k of ["loading", "error", "day1"]) {
    const p = await page.context().newPage();
    await openCl(p, vp, k);
    await p.screenshot({ path: `${OUT}/state-${k}-1440.png` });
    await p.close();
  }
  await openCl(page, vp);
  await page.locator(".aglist [data-cl27='genre']:not([disabled]):visible").first().click();
  await page.locator(".aglist [data-cl26='find'] input:visible").fill("zzqx");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/state-none-1440.png` });
});

test("CLP shots · the add and Agent fit feedback", async ({ page }) => {
  test.setTimeout(300_000);
  const vp = { width: 1440, height: 900 };
  emu("pro");
  await openCl(page, vp);
  await page.locator(".aglist [data-cl27='add']:visible").first().click();
  await page.locator("[data-aaj='journey']").waitFor({ timeout: 20_000 });
  const name = `Marcus Shot${Date.now().toString(36).slice(-4)}`;
  await page.locator("[data-aaj='name']").fill(name);
  await page.locator("[data-aaj='agency']").fill("Lark Literary");
  await page.locator("[data-aaj='add']").click();
  await page.locator("[data-aaj='done']").waitFor({ timeout: 20_000 });
  await unkill(page);
  await page.locator("[data-aaj='done']").click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/feedback-added-1440.png` });
  await page.locator(".sa-toast .sa-toast-undo").first().click();
  await page.waitForTimeout(1500);
  if ((JSON.parse(emu("agents")) as { name: string }[]).some((a) => a.name === name)) throw new Error("the shot's add was not undone");
  await page.screenshot({ path: `${OUT}/feedback-removed-1440.png` });
  /* Agent fit: a star, the snackbar, then its Undo */
  await page.locator(".aglist [data-cl26='row']:visible").first().click();
  await page.locator("[data-cl262='fit'] [data-star]").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  const was = await page.locator("[data-cl262='fit'] [data-star][aria-checked='true']").count();
  await page.locator("[data-cl262='fit'] [data-star='4']").first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/feedback-fit-1440.png` });
  await page.locator(".sa-toast .sa-toast-undo").first().click();
  await page.waitForTimeout(1500);
  if (!was && (await page.locator("[data-cl262='fit'] [data-star][aria-checked='true']").count())) throw new Error("the shot's rating was not undone");
});

test("CLP shots · a 720px-wide content column", async ({ page }) => {
  test.setTimeout(120_000);
  await openCl(page, { width: 808, height: 1000 });
  await page.screenshot({ path: `${OUT}/narrow-720.png`, fullPage: false });
  const w = await page.evaluate(() => Math.round([...document.querySelectorAll<HTMLElement>(".aglist .agl-inner")].find((e) => e.offsetHeight)!.getBoundingClientRect().width));
  console.log(`[CLP shots] content column ${w}px at an 808px window`);
});

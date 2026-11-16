/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card offers v1 merged onto the served line — the agent card's focus, in its two dims (card-offers-v1-merge).
 *
 *   M1  viewing (the light dim): focus moves in; 40 Tab presses reach the page; the page is not inert; a row click
 *       switches the card
 *   M2  a section being edited (the action dim): 40 Tab presses never leave the card; the page is inert; a click on
 *       the scrim with a dirty form shows the guard
 *   M3  closing the card gives focus back to the row that opened it (by ✕ and by Escape, from inside the card). Two things
 *       restore it — the drawer hook and the Contact list's own row restore (principles v1) — so its mutation breaks both
 *
 * ⚠️ EMULATOR ONLY (co1Emu.mjs seeds the four co1 agents). Run through `npm run e2e:emu`.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

/* not serial: each lock seeds its own agents, and one red must not skip the next (one worker runs them in order) */
const DIR = "reports/card-offers-v1-merge";
const MUT = process.env.M_MUTATE ?? "";
const VP = { width: 1440, height: 900 };
const PANEL = "[data-cl262='panel']";

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/co1Emu.mjs", cmd], { encoding: "utf8" }).trim();

/** the Contact list with the co1 agents, no card open */
async function openList(page: Page) {
  await openApp(page, "/agents", VP);
  await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await page.locator(".aglist [data-cl26='row'][data-id='co1-rt']").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
}
/** the visible, live row for an agent (kept-alive pages and the slim bar duplicate elements) */
const row = (page: Page, id: string) => page.locator(`.aglist [data-cl26='row'][data-id='${id}']`).filter({ visible: true }).first();
/** open a card the way a keyboard user does: focus its row and press Enter */
async function openByRow(page: Page, id: string): Promise<Locator> {
  const r = row(page, id);
  await r.scrollIntoViewIfNeeded();
  await r.focus();
  await page.keyboard.press("Enter");
  const panel = page.locator(`${PANEL}[data-agent-id='${id}']`);
  await panel.waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  return panel;
}
async function editHow(page: Page, panel: Locator) {
  await panel.locator(".cl262-sec[data-k='how'] [data-cl262='pen']").evaluate((e) => (e as HTMLElement).click());
  await panel.locator(".cl262-sec[data-k='how'].is-edit").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
}
async function weeksBy(page: Page, panel: Locator, n: number) {
  const r = panel.locator(".cl262-sec[data-k='how'] [data-aap='weeks'] input[type='range']");
  await r.focus();
  for (let i = 0; i < Math.abs(n); i++) await page.keyboard.press(n < 0 ? "ArrowLeft" : "ArrowRight");
  await page.waitForTimeout(350);
}
/** where focus is: inside the card, on the page (#root), or elsewhere */
const where = (page: Page) => page.evaluate((sel) => {
  const a = document.activeElement;
  if (!a || a === document.body) return "body";
  if (a.closest(sel)) return "card";
  if (document.getElementById("root")?.contains(a)) return "page";
  return "other";
}, PANEL);
const rootInert = (page: Page) => page.evaluate(() => !!document.getElementById("root")?.hasAttribute("inert"));
async function tabs(page: Page, n: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { await page.keyboard.press("Tab"); out.push(await where(page)); }
  return out;
}

mkdirSync(`${DIR}/shots`, { recursive: true });
test.beforeEach(() => { emu("seed"); });
test.afterAll(() => { try { emu("clean"); } catch { /* the emulator is gone with the run */ } });

test("M1 · viewing the agent card: not modal — Tab reaches the page, a row click switches the card", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("M1");
  await openList(page);
  const panel = await openByRow(page, "co1-rt");
  const s = await page.locator(".cl262-scrim").first().getAttribute("data-on").catch(() => null);
  L.check("the light dim is up", s === "light", String(s));
  L.check("focus moved into the card", (await where(page)) === "card", await where(page));
  L.check("the page is not inert", !(await rootInert(page)), "inert");
  L.check("the card is not aria-modal", (await panel.getAttribute("aria-modal")) !== "true", String(await panel.getAttribute("aria-modal")));
  const seen = await tabs(page, 40);
  L.check("40 Tab presses reach the page", seen.includes("page"), [...new Set(seen)].join(","));
  /* a row covered or made inert by a modal card cannot be clicked: a short wait, then the check below says so */
  const clicked = await row(page, "co1-old").locator("[data-cl26='name']").first().click({ timeout: 8_000 }).then(() => true, () => false);
  await page.waitForTimeout(1200);
  const id = await page.locator(PANEL).getAttribute("data-agent-id").catch(() => null);
  L.check("a row click switches the card", clicked && id === "co1-old", `${clicked ? "clicked" : "not clickable"} · ${id}`);
  L.done(6);
});

test("M2 · editing the agent card: modal — Tab stays in, the page is inert, a scrim click on a dirty form asks", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("M2");
  await openList(page);
  const panel = await openByRow(page, "co1-rt");
  await editHow(page, panel);
  const s = await page.locator(".cl262-scrim").first().getAttribute("data-on").catch(() => null);
  L.check("the action dim is up", s === "true", String(s));
  L.check("the page is inert", await rootInert(page), "not inert");
  L.check("the card is aria-modal", (await panel.getAttribute("aria-modal")) === "true", String(await panel.getAttribute("aria-modal")));
  await weeksBy(page, panel, -2);
  const seen = await tabs(page, 40);
  L.check("40 Tab presses never leave the card", seen.every((w) => w === "card"), [...new Set(seen)].join(","));
  /* a point on the dimmed page, halfway between the window's left edge and the card: what is under it must be the
     agent card's scrim itself, so the click is the scrim's and nothing else's */
  const pb = (await panel.boundingBox())!;
  const px = Math.round(pb.x / 2), py = Math.round(VP.height / 2);
  L.check("the point clicked is the agent card's scrim", await page.evaluate(([x, y]) => !!(document.elementFromPoint(x, y) as HTMLElement | null)?.classList.contains("cl262-scrim"), [px, py]), `${px},${py}`);
  const before = await page.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y) as HTMLElement | null;
    const bar = document.querySelector("[data-cl262='save-bar']");
    return { hit: e ? `${e.tagName}.${e.className}` : "none", bar: bar ? [...bar.attributes].map((a) => a.name).join(" ") : "none", focus: (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 80) ?? "none" };
  }, [px, py]);
  await page.mouse.click(px, py);
  await page.waitForTimeout(500);
  L.check("a scrim click on the dirty form shows the guard", (await panel.locator("[data-cl262='save-bar'][data-guard]").count()) === 1, JSON.stringify(before));
  L.check("the card is still open", (await page.locator(PANEL).count()) === 1, "closed");
  await page.screenshot({ path: `${DIR}/shots/m2-editing-1440.png` }).catch(() => {});
  L.done(7);
});

test("M3 · closing the agent card returns focus to the row that opened it", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("M3");
  await openList(page);
  const panel = await openByRow(page, "co1-rt");
  /* ✕ by keyboard: focus is inside the card when it closes */
  const x = panel.locator("button[aria-label^='Close']").first();
  await x.focus();
  await page.keyboard.press("Enter");
  await page.locator(PANEL).waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest("[data-cl26='row']")?.getAttribute("data-id") ?? document.activeElement?.tagName ?? "none");
  L.check("✕: focus is back on the row that opened it", back === "co1-rt", back);
  /* Escape */
  await openByRow(page, "co1-rt");
  L.check("before Escape, focus is inside the card (it moved in on open)", (await where(page)) === "card", await where(page));
  await page.keyboard.press("Escape");
  await page.locator(PANEL).waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForTimeout(400);
  const back2 = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest("[data-cl26='row']")?.getAttribute("data-id") ?? document.activeElement?.tagName ?? "none");
  L.check("Escape: focus is back on the row that opened it", back2 === "co1-rt", back2);
  L.done(3);
});

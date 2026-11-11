/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card offers v1 (design-refs/card-offers-v1/agent-card-edit-v8.html) — the CO locks on the rendered page, over the
 * emulator's harness account and four agents of their own (`co1Emu.mjs seed`, re-seeded before each lock).
 *
 *   CO8   Response time 8 → 6 with an open query: the offer, its dates struck old → new; it holds still while the
 *         thumb is held and settles on release
 *   CO9   the save bar's second line follows the choice
 *   CO10  Closed: the closed offer, Suggested on Leave it open (in its window) / Close it as no reply (ten weeks, NRN)
 *   CO11  Closed with a full requested: the powder note, no options
 *   CO12  no rust "Also changes" anywhere on the card
 *
 * ⚠️ EMULATOR ONLY. `CO_MUTATE=<lock>` applies that lock's named break in the page; `CO_BASE=1` names the ledger for a
 *    run against the build before this pack (every lock red there).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

test.describe.configure({ mode: "serial" });
const DIR = "reports/card-offers-v1";
const MUT = process.env.CO_MUTATE ?? "";
const BASE = process.env.CO_BASE === "1";
const VP = { width: 1440, height: 900 };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

export const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/co1Emu.mjs", cmd], { encoding: "utf8" }).trim();
export const read = (): Record<string, { status: string; nudgeDate: string | null; writerExpectedDate: string | null; dateSent: string;
  activity: { type: string | null; eventKey: string | null; resultingStatus: string | null }[]; feed: { eventKey: string | null; resultingStatus: string | null }[];
  agent: { weeks: number | null; door: string | null } | null }> => JSON.parse(emu("read"));
const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
export const TODAY = noon(new Date());
export const dm = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}`;
export const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const offWeekend = (d: Date) => (d.getDay() === 6 ? plusDays(d, 2) : d.getDay() === 0 ? plusDays(d, 1) : d);
/** the co1-rt query: sent 21 days ago on 8 weeks; its nudge a week after the expected date, off the weekend */
export const RT_SENT = plusDays(TODAY, -21);
export const expOn = (weeks: number) => plusDays(RT_SENT, weeks * 7);
export const nudgeOn = (weeks: number) => offWeekend(plusDays(expOn(weeks), 7));

/** a seeded agent's card, at a viewport, with its How section in edit mode */
export async function openCard(page: Page, id: string, vp = VP): Promise<Locator> {
  await openApp(page, `/agents?agent=${id}`, vp);
  await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  const panel = page.locator(`[data-cl262='panel'][data-agent-id='${id}']`);
  await panel.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(900);
  return panel;
}
export async function editHow(page: Page, panel: Locator) {
  await panel.locator(".cl262-sec[data-k='how'] [data-cl262='pen']").click({ force: true }).catch(async () => {
    await panel.locator(".cl262-sec[data-k='how'] [data-cl262='pen']").evaluate((e) => (e as HTMLElement).click());
  });
  await panel.locator(".cl262-sec[data-k='how'].is-edit").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
}
/** step the response-time slider by keyboard (each step is a settled change) */
export async function weeksBy(page: Page, panel: Locator, n: number) {
  const r = panel.locator(".cl262-sec[data-k='how'] [data-aap='weeks'] input[type='range']");
  await r.focus();
  for (let i = 0; i < Math.abs(n); i++) await page.keyboard.press(n < 0 ? "ArrowLeft" : "ArrowRight");
  await page.waitForTimeout(350);
}
export async function closeDoor(page: Page, panel: Locator) {
  await panel.locator(".cl262-sec[data-k='how'] [data-aap='door'] [data-door='closed']").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(500);
  /* the reopening calendar opens on its own; it is not this lock's subject */
  if (await page.locator("[data-ae='calendar']").count()) await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
}
export async function discard(page: Page, panel: Locator) {
  if (await panel.locator("[data-cl262='cancel']").count()) await panel.locator("[data-cl262='cancel']").click();
  if (await panel.locator("[data-cl262='discard']").count()) await panel.locator("[data-cl262='discard']").click();
  await page.waitForTimeout(300);
}
const shown = (l: Locator) => l.evaluateAll((es) => es.filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length);

mkdirSync(`${DIR}/shots`, { recursive: true });
test.beforeEach(() => { emu("seed"); });
test.afterAll(() => { try { emu("clean"); } catch { /* the emulator is gone with the run */ } });

/* ═════════ CO8 ═════════ */
test("CO8 · Response time 8 → 6 with an open query: the offer, dates struck old → new, settling on release", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO8");
  const panel = await openCard(page, "co1-rt");
  await editHow(page, panel);
  if (MUT === "CO8") await css(page, ".co-offer[data-co='rt']{display:none!important}");
  /* held: a press on the thumb, a drag — the offer is not there yet */
  const r = panel.locator(".cl262-sec[data-k='how'] [data-aap='weeks'] input[type='range']");
  const box = (await r.boundingBox())!;
  const x8 = box.x + box.width * ((8 - 1) / 25);
  await page.mouse.move(x8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x8 - box.width * (2 / 25), box.y + box.height / 2, { steps: 6 });
  await page.waitForTimeout(250);
  const during = await shown(panel.locator("[data-co='rt']"));
  const heldVal = await r.inputValue();
  L.check("while the thumb is held the offer does not appear", during === 0 && Number(heldVal) !== 8, `offer ${during} · slider ${heldVal}`);
  await page.mouse.up();
  await page.waitForTimeout(450);
  const w = Number(await r.inputValue());
  const offer = panel.locator("[data-co='rt']");
  L.check("released: the offer appears under the slider", (await shown(offer)) === 1, `weeks ${w}`);
  L.check("its header is the mock's", /You have 1 open query with Sarah\. Move its dates too\?/.test((await offer.textContent().catch(() => "")) ?? ""), (await offer.textContent().catch(() => ""))?.slice(0, 90) ?? "");
  const exp = offer.locator("[data-co='exp']");
  const expOld = (await exp.locator("[data-co='old']").textContent().catch(() => null)) ?? "";
  const expNew = (await exp.locator("[data-co='new']").textContent().catch(() => null)) ?? "";
  L.check("reply expected: old struck through", expOld === dm(expOn(8)) && (await exp.locator("s[data-co='old']").count()) === 1, `${expOld} vs ${dm(expOn(8))}`);
  L.check("reply expected: new is the new window's", expNew === dm(expOn(w)), `${expNew} vs ${dm(expOn(w))}`);
  const nud = offer.locator("[data-co='nudge']");
  const nOld = (await nud.locator("[data-co='old']").textContent().catch(() => null)) ?? "";
  const nNew = (await nud.locator("[data-co='new']").textContent().catch(() => null)) ?? "";
  L.check("nudge due: the stored nudge, old → new", nOld === dm(nudgeOn(8)) && nNew === dm(nudgeOn(w)), `${nOld} → ${nNew} vs ${dm(nudgeOn(8))} → ${dm(nudgeOn(w))}`);
  const choice = await panel.locator("[data-co='rt-choice'] [role='radio'][aria-checked='true']").getAttribute("data-k").catch(() => null);
  L.check("Update its dates is the default", choice === "update", String(choice));
  L.check("the choices are one radiogroup", (await panel.locator("[data-co='rt-choice'][role='radiogroup'] [role='radio']").count()) === 2, "radios");
  /* arrow keys move the choice */
  await panel.locator("[data-co='rt-update']").focus().catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  const after = await panel.locator("[data-co='rt-choice'] [role='radio'][aria-checked='true']").getAttribute("data-k").catch(() => null);
  const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.k ?? "");
  L.check("→ moves the choice and the focus to Keep", after === "keep" && focused === "keep", `${after} · focus ${focused}`);
  await page.screenshot({ path: `${DIR}/shots/co8-rt-1440.png` }).catch(() => {});
  await discard(page, panel);
  L.done(9);
});

/* ═════════ CO9 ═════════ */
test("CO9 · the save bar's second line follows the choice", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO9");
  const panel = await openCard(page, "co1-rt");
  await editHow(page, panel);
  await weeksBy(page, panel, -2);
  const names = panel.locator("[data-cl262='save-names']");
  const t1 = ((await names.textContent().catch(() => "")) ?? "").trim();
  L.check("Update: · moves 1 query’s dates", t1 === "response time · moves 1 query’s dates", t1);
  L.check("the retired nudge count is gone", !/moves \d+ nudge/.test(t1), t1);
  await panel.locator("[data-co='rt-keep']").click();
  await page.waitForTimeout(200);
  const t2 = ((await names.textContent().catch(() => "")) ?? "").trim();
  L.check("Keep: · 1 query keeps its dates", t2 === "response time · 1 query keeps its dates", t2);
  await panel.locator("[data-co='rt-update']").click();
  await page.waitForTimeout(150);
  await closeDoor(page, panel);
  const t3 = ((await names.textContent().catch(() => "")) ?? "").trim();
  L.check("Closed, left open: · 1 query stays open · moves 1 query’s dates", t3.endsWith("· 1 query stays open · moves 1 query’s dates"), t3);
  await panel.locator("[data-co='close-close']").click();
  await page.waitForTimeout(200);
  const t4 = ((await names.textContent().catch(() => "")) ?? "").trim();
  L.check("Close it as no reply: · closes 1 query as no reply, and the dates no longer move", t4.endsWith("· closes 1 query as no reply"), t4);
  L.check("…and the response-time offer stands down with the mock's line", (await shown(panel.locator("[data-co='rt']"))) === 0
    && /Your query is closing as no reply, so its dates don’t need to move\./.test((await panel.locator(".cl262-sec[data-k='how']").textContent()) ?? ""), "rt offer gone");
  if (MUT === "CO9") await css(page, "[data-cl262='save-names']{visibility:hidden!important}");
  L.check("the line is visible in the navy bar", await names.isVisible(), "visible");
  await page.screenshot({ path: `${DIR}/shots/co9-savebar-1440.png` }).catch(() => {});
  await discard(page, panel);
  L.done(7);
});

/* ═════════ CO10 ═════════ */
test("CO10 · Closed: the closed offer, Suggested on the right option for both mock cases", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CO10");
  for (const [id, want, lead] of [["co1-rt", "keep", /Agents who close usually still answer the queries they already have\./], ["co1-old", "close", /It’s ten weeks old, past the date Olive usually replies by, and says no response means no\./]] as const) {
    const panel = await openCard(page, id);
    await editHow(page, panel);
    await closeDoor(page, panel);
    if (MUT === "CO10") await css(page, "[data-co='suggested']{display:none!important}");
    const off = panel.locator("[data-co='close']");
    L.check(`${id}: the closed offer, under Taking queries`, (await shown(off)) === 1
      && (await panel.locator("[data-co='door-offers'] [data-co='close']").count()) === 1, "offer");
    const tagIn = await panel.locator("[data-co='close-choice'] [role='radio']").evaluateAll((es) => es.filter((e) => {
      const t = e.querySelector("[data-co='suggested']") as HTMLElement | null; return !!t && t.getBoundingClientRect().height > 0;
    }).map((e) => (e as HTMLElement).dataset.k));
    L.check(`${id}: Suggested on ${want}`, tagIn.length === 1 && tagIn[0] === want, JSON.stringify(tagIn));
    const chosen = await panel.locator("[data-co='close-choice'] [role='radio'][aria-checked='true']").getAttribute("data-k").catch(() => null);
    L.check(`${id}: the choice starts on the suggestion`, chosen === want, String(chosen));
    const leadText = (await panel.locator("[data-co='lead']").textContent().catch(() => "")) ?? "";
    L.check(`${id}: the lead, the mock's`, lead.test(leadText), leadText);
    L.check(`${id}: "Happens when you save."`, /Happens when you save\. You can reopen a closed query from its card\./.test((await off.textContent()) ?? ""), "why");
    const hdr = getComputedStyleColor(page, panel.locator("[data-co='close'] .co-h"));
    L.check(`${id}: the header is sand #f7efe3`, (await hdr) === "rgb(247, 239, 227)", await hdr);
    await page.screenshot({ path: `${DIR}/shots/co10-${id}-1440.png` }).catch(() => {});
    await discard(page, panel);
  }
  L.done(12);
});
async function getComputedStyleColor(_page: Page, l: Locator): Promise<string> {
  return l.evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => "none");
}

/* ═════════ CO11 ═════════ */
test("CO11 · Closed with a full requested: the powder note, no options", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO11");
  const panel = await openCard(page, "co1-full");
  await editHow(page, panel);
  await closeDoor(page, panel);
  if (MUT === "CO11") await css(page, "[data-co='safe']{display:none!important}");
  const safe = panel.locator("[data-co='safe']");
  L.check("the safe note is shown", (await shown(safe)) === 1, "safe");
  const txt = ((await safe.textContent().catch(() => "")) ?? "").trim();
  L.check("its words", /Your full request with Fiona isn’t affected\. Closing to new queries doesn’t change a request that’s already in progress, so nothing else moves\./.test(txt), txt);
  L.check("powder #e6edf6, navy text", (await safe.evaluate((e) => `${getComputedStyle(e).backgroundColor} ${getComputedStyle(e).color}`).catch(() => "")) === "rgb(230, 237, 246) rgb(42, 58, 82)", "colours");
  L.check("no close offer, no options", (await panel.locator("[data-co='close'], [data-co='close-choice'] [role='radio']").count()) === 0, "no options");
  await page.screenshot({ path: `${DIR}/shots/co11-full-1440.png` }).catch(() => {});
  await discard(page, panel);
  L.done(4);
});

/* ═════════ CO12 ═════════ */
test("CO12 · no rust Also-changes element anywhere on the card", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO12");
  const panel = await openCard(page, "co1-rt");
  await panel.locator("[data-cl262='edit-all']").click();
  await page.waitForTimeout(500);
  await weeksBy(page, panel, -2);
  await closeDoor(page, panel);
  await panel.locator(".cl262-sec[data-k='how'] [data-nrn='yes']").evaluate((e) => (e as HTMLElement).click());
  await panel.locator("[data-ae='name']").fill("Sarah Offerton-Pike");
  await page.waitForTimeout(400);
  if (MUT === "CO12") await panel.locator(".cl262-sec[data-k='how']").evaluate((s) => { const d = document.createElement("div"); d.className = "cl262-also"; d.dataset.cl262 = "also"; d.innerHTML = "<em>Also changes</em><p>x</p>"; s.appendChild(d); });
  L.check("edits made: several things changed", Number(await panel.locator("[data-cl262='save-sum']").getAttribute("data-n")) >= 3, "n");
  L.check("no Also element", (await panel.locator(".cl262-also, [data-cl262='also']").count()) === 0, "count");
  L.check("no \"Also changes\" words", !/Also changes/.test((await panel.textContent()) ?? ""), "text");
  /* nothing on the card wears the rust edge the box drew (inset 3px #a2452a) */
  const rustEdge = await panel.evaluate((p) => [...p.querySelectorAll<HTMLElement>("*")].filter((e) => /inset 3px 0px 0px (rgb\(162, 69, 42\)|#a2452a)/.test(getComputedStyle(e).boxShadow)).length);
  L.check("no rust left edge anywhere", rustEdge === 0, String(rustEdge));
  await discard(page, panel);
  L.done(4);
});

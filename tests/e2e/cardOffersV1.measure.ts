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
 *   CO13  Update moves the stored nudge; the card and the Query Centre show the new reply date
 *   CO14  a nudge the writer moved themselves is left alone
 *   CO15  Keep: the card and the Query Centre still show the old date after the window changes
 *   CO16  Close it as no reply: No Response, nudge gone, on the Wall of no, the shared path's activity row
 *
 * ⚠️ EMULATOR ONLY. `CO_MUTATE=<lock>` applies that lock's named break in the page (or, for a break that lives in the
 *    code, the run edits the measurement copy's source and vite's hot reload serves it — never the worktree).
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

export const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/co1Emu.mjs", cmd], { encoding: "utf8", timeout: 60_000 }).trim();
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
  await panel.locator("[data-cl262='sec'][data-k='how'] [data-cl262='pen']").click({ force: true }).catch(async () => {
    await panel.locator("[data-cl262='sec'][data-k='how'] [data-cl262='pen']").evaluate((e) => (e as HTMLElement).click());
  });
  await panel.locator("[data-acv21='open'][data-k='how']").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
}
/** step the response-time slider by keyboard (each step is a settled change) */
export async function weeksBy(page: Page, panel: Locator, n: number) {
  const r = panel.locator("[data-cl262='sec'][data-k='how'] [data-aap='weeks'] input[type='range']");
  await r.focus();
  for (let i = 0; i < Math.abs(n); i++) await page.keyboard.press(n < 0 ? "ArrowLeft" : "ArrowRight");
  await page.waitForTimeout(350);
}
export async function closeDoor(page: Page, panel: Locator) {
  await panel.locator("[data-cl262='sec'][data-k='how'] [data-aap='door'] [data-door='closed']").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(500);
  /* the reopening calendar opens on its own; it is not this lock's subject */
  if (await page.locator("[data-ae='calendar']").count()) await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
}
export async function discard(page: Page, panel: Locator) {
  /* Agent card v2.1 — re-pointed: each open section has its own cross (no Cancel, no question) */
  for (let i = 0; i < 6 && (await panel.locator("[data-acv21='cross']").count()); i++) await panel.locator("[data-acv21='cross']").first().click({ timeout: 4000 }).catch(() => {});
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
  const r = panel.locator("[data-cl262='sec'][data-k='how'] [data-aap='weeks'] input[type='range']");
  /* Agent card v2 — the card is the query card's height and only its body scrolls, so the open "How {first} works"
     runs below the save bar at 900px: bring the slider into view before pressing it by its coordinates */
  await r.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
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
/* RETIRED by Agent card v2.1: there is no save bar, so no second line to follow the choice. The choice is read in the offer
   itself (CO8, CO10, CO11) and, after the tick, in the snackbar (", and moved the query’s dates": AC21-2d's words). */
test.skip("CO9 · the save bar's second line follows the choice", async ({ page }) => {
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
    && /Your query is closing as no reply, so its dates don’t need to move\./.test((await panel.locator("[data-cl262='sec'][data-k='how']").textContent()) ?? ""), "rt offer gone");
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
  /* Agent card v2.1 — re-pointed: editing is by section (no band pencil): How and Contact details, each by its pencil */
  await editHow(page, panel);
  await panel.locator("[data-cl262='pen'][data-k='contact']").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(500);
  await weeksBy(page, panel, -2);
  await closeDoor(page, panel);
  await panel.locator("[data-cl262='sec'][data-k='how'] [data-nrn='yes']").evaluate((e) => (e as HTMLElement).click());
  await panel.locator("[data-ae='name']").fill("Sarah Offerton-Pike");
  await page.waitForTimeout(400);
  if (MUT === "CO12") await panel.locator("[data-cl262='sec'][data-k='how']").evaluate((s) => { const d = document.createElement("div"); d.className = "cl262-also"; d.dataset.cl262 = "also"; d.innerHTML = "<em>Also changes</em><p>x</p>"; s.appendChild(d); });
  L.check("edits made: two sections open with changes", (await panel.locator("[data-acv21='open']").count()) === 2, "n");
  L.check("no Also element", (await panel.locator(".cl262-also, [data-cl262='also']").count()) === 0, "count");
  L.check("no \"Also changes\" words", !/Also changes/.test((await panel.textContent()) ?? ""), "text");
  /* nothing on the card wears the rust edge the box drew (inset 3px #a2452a) */
  const rustEdge = await panel.evaluate((p) => [...p.querySelectorAll<HTMLElement>("*")].filter((e) => /inset 3px 0px 0px (rgb\(162, 69, 42\)|#a2452a)/.test(getComputedStyle(e).boxShadow)).length);
  L.check("no rust left edge anywhere", rustEdge === 0, String(rustEdge));
  await discard(page, panel);
  L.done(4);
});

/* ══════════════ Phase 3 · what Save does (the emulator's store, then the rendered page) ══════════════ */

const isoDay = (iso: string | null) => (iso ? dm(new Date(iso)) : "none");
export async function saveCard(page: Page, panel: Locator) {
  /* Agent card v2.1 — re-pointed: How's own tick saves How (there is no save bar) */
  await panel.locator("[data-acv21='tick'][data-k='how']").click();
  await panel.locator("[data-acv21='open']").first().waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
}
/** Agent card v2 — the next-step box is retired; the footer says where the query stands (lib/agentCardV2 acFoot) */
const footWords = (panel: Locator) => panel.locator("[data-qc152='reply'] [data-qc152='reply-field']").first().innerText({ timeout: 5000 }).then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
const footButton = (panel: Locator) => panel.locator("[data-qc152='reply'] button.qc152-rbtn").first().innerText({ timeout: 5000 }).then((t) => t.trim()).catch(() => "");
const toastText = (page: Page) => page.locator(".sa-toasts .sa-toast").allTextContents().then((t) => t.join(" | ")).catch(() => "");
/** the Query Centre's open query: "reply expected by {d Mon}" */
async function qcExpected(page: Page, qid: string): Promise<string> {
  await openApp(page, `/queries?q=${qid}`, VP);
  const own = page.locator("[data-side-own]");
  await own.waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const t = ((await own.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
  return t.match(/reply expected by (\d{1,2} \w{3})/i)?.[1] ?? `none · ${t.slice(0, 120)}`;
}

/* ═════════ CO13 ═════════ */
test("CO13 · Update moves the stored nudge, and the Query Centre shows the new date", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CO13");
  const panel = await openCard(page, "co1-rt");
  await editHow(page, panel);
  await weeksBy(page, panel, -2);
  if (MUT === "CO13") await panel.locator("[data-co='rt-keep']").click();
  await saveCard(page, panel);
  const t = await toastText(page);
  /* Agent card v2's snackbar words (lib/agentCardV2 savedWords) */
  /* Agent card v2.1 — re-pointed: a section's save names the section */
  L.check("the toast: Saved how they work for Sarah, and moved the query’s dates", /Saved how they work for Sarah, and moved the query’s dates/.test(t), t);
  const st = read()["co1-rt"];
  L.check("the agent holds 6 weeks", st.agent?.weeks === 6, String(st.agent?.weeks));
  L.check("the stored nudge moved to the new window's", isoDay(st.nudgeDate) === dm(nudgeOn(6)), `${isoDay(st.nudgeDate)} vs ${dm(nudgeOn(6))}`);
  L.check("no writer's date was written", st.writerExpectedDate == null, String(st.writerExpectedDate));
  const next = await footWords(panel);
  L.check("the card's footer: waiting on Sarah, a reply expected by the new date", next.includes("Waiting on Sarah") && next.includes(`Reply expected by ${dm(expOn(6))}`), next);
  const qc = await qcExpected(page, "co1-rt-q");
  L.check("the Query Centre: reply expected by the new date", qc === dm(expOn(6)), `${qc} vs ${dm(expOn(6))}`);
  L.done(6);
});

/* ═════════ CO14 ═════════ */
test("CO14 · a nudge the writer moved themselves is left alone", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CO14");
  const before = read()["co1-wn"].nudgeDate;
  const panel = await openCard(page, "co1-wn");
  await editHow(page, panel);
  await weeksBy(page, panel, -2);
  const sub = ((await panel.locator("[data-co='rt'] [data-co='nudge']").textContent().catch(() => "")) ?? "").trim();
  L.check("the offer says the nudge stays", /You set this nudge yourself, so it stays\./.test(sub) && (await panel.locator("[data-co='rt'] [data-co='nudge'] s").count()) === 0, sub);
  await saveCard(page, panel);
  const st = read()["co1-wn"];
  L.check("the stored nudge is where the writer put it", st.nudgeDate === before, `${st.nudgeDate} vs ${before}`);
  L.check("the toast says the dates moved (the reply date did)", /, and moved the query’s dates/.test(await toastText(page)), await toastText(page));
  L.done(3);
});

/* ═════════ CO15 ═════════ */
test("CO15 · Keep: the card and the Query Centre still show the old date after the window changes", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CO15");
  const before = read()["co1-rt"].nudgeDate;
  const panel = await openCard(page, "co1-rt");
  await editHow(page, panel);
  await weeksBy(page, panel, -2);
  if (MUT !== "CO15") await panel.locator("[data-co='rt-keep']").click();
  await page.waitForTimeout(200);
  await saveCard(page, panel);
  const t = await toastText(page);
  /* Agent card v2's snackbar: the count and the agent, nothing about dates when nothing moved */
  L.check("the toast: Saved how they work for Sarah, and no dates moved", /Saved how they work for Sarah/.test(t) && !/moved|closed/.test(t), t);
  const st = read()["co1-rt"];
  L.check("the agent holds 6 weeks", st.agent?.weeks === 6, String(st.agent?.weeks));
  L.check("the old date is held on the query (stamped)", isoDay(st.writerExpectedDate) === dm(expOn(8)), `${isoDay(st.writerExpectedDate)} vs ${dm(expOn(8))}`);
  L.check("the nudge is left as it was", st.nudgeDate === before, `${st.nudgeDate} vs ${before}`);
  const next = await footWords(panel);
  L.check("the card's footer keeps the old date", next.includes(`Reply expected by ${dm(expOn(8))}`), next);
  const qc = await qcExpected(page, "co1-rt-q");
  L.check("the Query Centre keeps the old date", qc === dm(expOn(8)), `${qc} vs ${dm(expOn(8))}`);
  L.done(6);
});

/* ═════════ CO16 ═════════ */
test("CO16 · Close it as no reply: No Response, nudge gone, on the Wall of no, the shared path's activity row", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CO16");
  const panel = await openCard(page, "co1-old");
  await editHow(page, panel);
  await closeDoor(page, panel);
  if (MUT === "CO16") await panel.locator("[data-co='close-keep']").click();
  /* Agent card v2.1 — re-pointed: no save bar; the choice is the offer's own (Suggested, checked), and the snackbar names
     the section ("Saved how they work for Olive, and closed the query as no reply") */
  const extras = (await panel.locator("[data-co='close-close']").getAttribute("aria-checked")) ?? "";
  L.check("the offer: Close it as no reply (the suggestion) is chosen", extras === "true", extras);
  await saveCard(page, panel);
  const t = await toastText(page);
  L.check("the toast: Saved how they work for Olive, and closed the query as no reply", /Saved how they work for Olive, and closed the query as no reply/.test(t), t);
  const st = read()["co1-old"];
  L.check("the query is No Response", st.status === "No Response", st.status);
  L.check("its nudge is removed", st.nudgeDate == null, String(st.nudgeDate));
  L.check("the shared path wrote the closing row (closed_no_reply → No Response), in the log and the feed",
    st.activity.some((a) => a.eventKey === "closed_no_reply" && a.resultingStatus === "No Response") && st.feed.some((a) => a.resultingStatus === "No Response"),
    JSON.stringify({ a: st.activity, f: st.feed }));
  L.check("the agent is closed to queries", st.agent?.door === "Closed", String(st.agent?.door));
  const bold = await footWords(panel);
  const btn = await footButton(panel);
  L.check("the card's footer: Closed, and Query again", /^Closed\b/.test(bold) && btn === "Query again", `${bold} · ${btn}`);
  await openApp(page, "/queries/responses", VP);
  await page.waitForTimeout(3000);
  const wall = ((await page.locator("body").innerText().catch(() => "")) ?? "");
  L.check("on the Wall of no (the Responses page names Olive)", /Olive Offerton/.test(wall), wall.slice(0, 80));
  L.done(8);
});

/* ══════════════ Phase 4 · the page dims behind the card; + Website / + Email ══════════════ */

const scrimOf = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const c = getComputedStyle(e);
  return { on: (e as HTMLElement).dataset.on ?? "", bg: c.backgroundColor, op: c.opacity, pe: c.pointerEvents, z: c.zIndex };
}).catch(() => null);

/* ═════════ CO17 ═════════ */
/* RED BEFORE AGENT CARD V2: Record a response v1, Phase 5 retired the card's light, live dim — every slide-out dims the
   whole desk at the action level while it is out (AgentCardPanel262 `modal = !leaving`). Skipped so the serial run
   reaches CO18 and CO19; the light dim is not this lock's to restore. */
test.skip("CO17 · card open: the page dims lightly, and a row click still switches the agent", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO17");
  const panel = await openCard(page, "co1-rt");
  if (MUT === "CO17") await css(page, ".cl262-scrim{pointer-events:auto!important}");
  await page.waitForTimeout(400);
  const s = await scrimOf(page, ".spanel-scrim.cl262-scrim");
  L.check("one scrim under the card, at the light level", !!s && s.on === "light" && s.bg === "rgba(28, 19, 15, 0.16)" && s.op === "1", JSON.stringify(s));
  L.check("visual only: pointer events pass through", s?.pe === "none", String(s?.pe));
  L.check("under the card (z 60 < 61)", s?.z === "60", String(s?.z));
  /* a row behind the dim, not this agent's, not under the panel */
  const row = page.locator(".aglist [data-cl26='row'][data-k='agent']:not([data-id='co1-rt']):visible").first();
  await row.waitFor({ timeout: 20_000 });
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = (await row.boundingBox())!;
  const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.closest("[data-cl26='row']") ? "row" : e ? `${e.tagName}.${e.className}` : "nothing"; }, [box.x + 60, box.y + box.height / 2]);
  L.check("the row is reachable through the dim (what is under the pointer is the row)", hit === "row", hit);
  await page.mouse.click(box.x + 60, box.y + box.height / 2);
  await page.waitForTimeout(1200);
  const id = await page.locator("[data-cl262='panel']").getAttribute("data-agent-id").catch(() => null);
  L.check("the row click switched the card", !!id && id !== "co1-rt", String(id));
  await page.screenshot({ path: `${DIR}/shots/co17-light-1440.png` }).catch(() => {});
  L.done(5);
});

/* ═════════ CO18 ═════════ */
test("CO18 · editing: the action dim, and a click on it shows the rust guard when there are changes", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO18");
  const panel = await openCard(page, "co1-rt");
  await editHow(page, panel);
  await page.waitForTimeout(400);
  if (MUT === "CO18") await css(page, ".cl262-scrim{pointer-events:none!important}");
  const s = await scrimOf(page, ".spanel-scrim.cl262-scrim");
  L.check("the action level while editing", !!s && s.on === "true" && s.bg === "rgba(28, 19, 15, 0.45)" && s.op === "1" && s.pe === "auto", JSON.stringify(s));
  await weeksBy(page, panel, -2);
  /* a click on the dimmed page, clear of the card and of any row: over the Contact list's own heading, which does nothing
     when clicked — so with the scrim taking the click there is a guard, and without it there is none */
  const h = page.locator(".aglist h1:visible, .aglist [data-page-title]:visible").first();
  const hb = (await h.boundingBox().catch(() => null)) ?? { x: 300, y: 200, width: 100, height: 40 };
  await page.mouse.click(hb.x + Math.min(40, hb.width / 2), hb.y + hb.height / 2);
  await page.waitForTimeout(500);
  const guard = panel.locator("[data-cl262='save-bar'][data-guard]");
  L.check("the click is Escape: with changes, the rust guard", (await guard.count()) === 1, "guard");
  const rust = (await guard.count()) ? await guard.evaluate((e) => getComputedStyle(e).backgroundColor) : "no guard";
  L.check("rust #a2452a", rust === "rgb(162, 69, 42)", rust);
  L.check("the card is still open", (await page.locator("[data-cl262='panel'][data-agent-id='co1-rt']").count()) === 1, "open");
  await page.screenshot({ path: `${DIR}/shots/co18-action-1440.png` }).catch(() => {});
  if (await panel.locator("[data-cl262='discard']").count()) await panel.locator("[data-cl262='discard']").click();
  L.done(4);
});

/* ═════════ CO19 ═════════ */
/* RED BEFORE AGENT CARD V2, for CO17's reason: Record a response v1, Phase 5 dims the whole desk behind every slide-out,
   the Query Centre's query panel included (a panel this branch does not touch). */
test.skip("CO19 · the Query Centre's query panel has no scrim while browsing", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO19");
  await openApp(page, "/queries?q=co1-rt-q", VP);
  await page.locator("[data-side-panel]").first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  if (MUT === "CO19") await css(page, ".spanel-scrim{opacity:1!important;background:rgba(28,19,15,.16)!important}");
  const s = await scrimOf(page, "[data-side-scrim]");
  L.check("its scrim is off: clear and inert", !!s && s.on === "" && s.op === "0" && s.pe === "none", JSON.stringify(s));
  L.check("no agent-card scrim on the page", (await page.locator(".cl262-scrim").count()) === 0, "none");
  L.check("the shell's bar is not dropped under a dim", !(await page.evaluate(() => document.body.classList.contains("spanel-dim"))), "body");
  L.done(3);
});

/* ═════════ CO20 ═════════ */
/* Agent card v2 retires CO20: the head's "+ Website" / "+ Email" are gone (a section with nothing in it is not drawn, and the
   Finish block lists Housekeeping's items, which name neither). Contact details open from the band's pencil and "Edit these
   details", which AC2's editing reaches. */
test.skip("CO20 · + Website and + Email open Contact details with the cursor in that field", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("CO20");
  for (const [k, sel] of [["website", "add-website"], ["email", "add-email"]] as const) {
    const panel = await openCard(page, "co1-full");
    await panel.locator(`[data-cl262='${sel}']`).click();
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      const sc = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-cl262='scroll']");
      const ar = a?.getBoundingClientRect(), sr = sc?.getBoundingClientRect();
      return { ae: a?.dataset.ae ?? a?.tagName ?? "", inView: !!ar && !!sr && ar.top >= sr.top && ar.bottom <= sr.bottom };
    });
    L.check(`+ ${k}: the cursor is in the ${k} field`, r.ae === k, r.ae);
    L.check(`+ ${k}: the field is in view in the card`, r.inView, String(r.inView));
    L.check(`+ ${k}: Contact details is open`, (await panel.locator("[data-acv21='open'][data-k='contact']").count()) === 1, "contact");
    await page.screenshot({ path: `${DIR}/shots/co20-${k}-1440.png` }).catch(() => {});
  }
  L.done(6);
});

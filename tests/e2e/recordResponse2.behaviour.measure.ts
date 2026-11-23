/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE BEHAVIOUR LOCKS, on the rendered page, over the emulator's harness account at 1440 × 900.
 *
 *   B1  Who replied?: the search has focus; "Waiting to hear back" then "Already with you", longest wait first; no closed
 *       query until something is typed, then under "Closed · a reply reopens it"; ↓ and ↵ pick
 *   B2  What did {First} say?: the sub-line; a Queried query's likely replies (partial, full, passed), the rest behind
 *       "Another kind of reply"; a pick moves on by itself; the track becomes the reply's own (six steps for a partial)
 *   B3  the reply's calendar: no day in the future, none before the query's last step
 *   B4  a slider being moved does not redraw the screen (the same input node, the body's scroll unchanged)
 *   B5  the review: nothing cut off at 1440 × 900 with no note (the body does not scroll)
 *   B6  Record reply saves, the recorded screen shows, and Undo restores (the query is back at Queried)
 *   B7  Escape: the search first, then (with answers) the discard bar, then the bar away; with nothing answered it closes
 *   B8  a finished step on the track goes back to that step
 *   B9  Record and start another: back at "Who replied?", the toast with Undo, which brings the review back
 *
 * `RAR_MUTATE=<lock>` applies that lock's break in the page, for its red-first reading.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/recordResponse2.behaviour.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/record-a-response-v2";
const MUT = process.env.RAR_MUTATE ?? "";
const VP = { width: 1440, height: 900 };
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const R = (k: string) => `[data-rar="root"] [data-rar="${k}"]`;
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
async function open(page: Page) {
  await openApp(page, "/dashboard", VP);
  await page.locator("[data-d2='record']").filter({ visible: true }).first().click();
  await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await settle(page);
}
const step = (page: Page) => page.locator('[data-rar="root"]').getAttribute("data-step");
async function toQueriedPartial(page: Page) {
  await page.locator(`${R("who-row")}[data-status="Queried"]`).first().click(); await settle(page);
  await page.locator(`${R("kind")}[data-k="pr"]`).click(); await settle(page);
  await page.locator(`${R("when-opt")}[data-k="today"]`).click(); await settle(page);
}

test.beforeEach(async ({ page }) => { await page.setViewportSize(VP); });

test("B1–B3, B8 · who, reply, when, the track", async ({ page }) => {
  const L = new Ledger("B1-B3-B8");
  await open(page);
  const b1 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>('[data-rar="who-row"]')];
    const days = rows.filter((r) => r.dataset.group === "wait").map((r) => parseInt(r.querySelector('[data-rar="wait"]')?.textContent ?? "0", 10));
    return { focus: document.activeElement?.getAttribute("data-rar"), groups: [...document.querySelectorAll('[data-rar="group"]')].map((g) => g.getAttribute("data-k")),
      n: rows.length, closed: rows.filter((r) => r.dataset.group === "closed").length, days };
  });
  L.check("B1 population: rows on Who replied?", b1.n >= 5, String(b1.n));
  L.check("B1 the search has focus", b1.focus === "find", String(b1.focus));
  L.check("B1 groups in order", JSON.stringify(b1.groups) === JSON.stringify(["wait", "you"]) || JSON.stringify(b1.groups) === JSON.stringify(["wait"]), JSON.stringify(b1.groups));
  L.check("B1 longest wait first", b1.days.length > 1 && b1.days.every((d, i) => i === 0 || d <= b1.days[i - 1]), JSON.stringify(b1.days.slice(0, 8)));
  L.check("B1 no closed query with nothing typed", b1.closed === 0, String(b1.closed));
  await page.keyboard.type("Ashworth"); await settle(page);
  const c = await page.evaluate(() => ({ groups: [...document.querySelectorAll('[data-rar="group"]')].map((g) => g.textContent), closed: document.querySelectorAll('[data-rar="who-row"][data-group="closed"]').length }));
  L.check("B1 typing finds a closed query, under its heading", c.closed > 0 && c.groups.some((g) => (g ?? "").startsWith("Closed · a reply reopens it")), JSON.stringify(c));
  /* B7's first rung: Escape clears the search, the journey stays */
  await page.keyboard.press("Escape"); await settle(page);
  const afterEsc = await page.evaluate(() => ({ find: (document.querySelector('[data-rar="find"]') as HTMLInputElement | null)?.value, open: !!document.querySelector('[data-rar="root"]') }));
  L.check("B7 Escape clears the search first, the journey stays", afterEsc.find === "" && afterEsc.open, JSON.stringify(afterEsc));
  /* ↓ ↵ picks the second row */
  const second = await page.locator(R("who-row")).nth(1).getAttribute("data-id");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await settle(page);
  L.check("B1 ↓ and ↵ pick", (await step(page)) === "reply", String(await step(page)));
  L.check("B1 the picked query is the second row", (await page.locator(`${R("step")}[data-k="who"]`).count()) > 0, String(second));
  /* B2 — reply */
  await page.locator(R("step")).filter({ hasText: "Agent" }).first().click(); await settle(page);
  await page.locator(`${R("who-row")}[data-status="Queried"]`).first().click(); await settle(page);
  const b2 = await page.evaluate(() => ({ sub: document.querySelector('[data-rar="reply-sub"]')?.textContent ?? "", kinds: [...document.querySelectorAll('[data-rar="kinds"] [data-rar="kind"]')].map((k) => k.getAttribute("data-k")),
    more: !!document.querySelector('[data-rar="more"]'), track: document.querySelectorAll('[data-rar="track"] [data-rar="step"]').length }));
  L.check("B2 the sub-line", /^Queried since \d+ \w+, \d+ days? ago\.$/.test(b2.sub), b2.sub);
  L.check("B2 a Queried query's likely replies", JSON.stringify(b2.kinds) === JSON.stringify(["pr", "fr", "no"]), JSON.stringify(b2.kinds));
  L.check("B2 the rest behind Another kind of reply", b2.more, String(b2.more));
  L.check("B2 five steps before the reply is known", b2.track === 5, String(b2.track));
  await page.locator(`${R("kind")}[data-k="pr"]`).click(); await settle(page);
  L.check("B2 a pick moves on by itself", (await step(page)) === "when", String(await step(page)));
  L.check("B2 a partial's track: six steps", (await page.locator(`${R("track")} [data-rar="step"]`).count()) === 6, "");
  /* B3 — the calendar */
  await page.locator(`${R("when-opt")}[data-k="earlier"]`).click(); await settle(page);
  const b3 = await page.evaluate(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const days = [...document.querySelectorAll<HTMLButtonElement>('[data-rar="cal-day"]')];
    const month = document.querySelector('[data-rar="cal-month"]')?.textContent ?? "";
    const fut = days.filter((d) => +(d.dataset.day ?? 0) > t.getDate()).map((d) => d.disabled);
    return { n: days.length, futureAllOff: fut.every(Boolean), futureN: fut.length, month, next: (document.querySelector('[data-rar="cal-next"]') as HTMLButtonElement | null)?.disabled };
  });
  L.check("B3 population: the month's days", b3.n >= 28, String(b3.n));
  L.check("B3 no day in the future", b3.futureAllOff && b3.next === true, JSON.stringify(b3));
  /* B8 — the track's done step goes back */
  await page.locator(`${R("when-opt")}[data-k="today"]`).click(); await settle(page);
  await page.locator(`${R("step")}[data-k="reply"]`).click(); await settle(page);
  L.check("B8 a done step on the track goes back to it", (await step(page)) === "reply", String(await step(page)));
  /* B7 — with answers, Escape asks; Escape again keeps going */
  await page.keyboard.press("Escape"); await settle(page);
  L.check("B7 with answers, Escape shows the discard bar", (await page.locator(R("leave-discard")).count()) === 1, "");
  await page.keyboard.press("Escape"); await settle(page);
  L.check("B7 Escape again takes the bar away, the journey stays", (await page.locator(R("leave-discard")).count()) === 0 && (await page.locator('[data-rar="root"]').count()) === 1, "");
  await page.locator(R("close")).click(); await settle(page);
  await page.locator(R("leave-discard")).click(); await settle(page, 700);
  L.check("B7 Discard closes", (await page.locator('[data-rar="root"]').count()) === 0, "");
  await open(page);
  await page.keyboard.press("Escape"); await settle(page, 700);
  L.check("B7 with nothing answered, Escape just closes", (await page.locator('[data-rar="root"]').count()) === 0, "");
  L.done(20);
});

test("B4–B6, B9 · the slider, the review, record and undo, record another", async ({ page }) => {
  const L = new Ledger("B4-B6-B9");
  await open(page);
  const pickedName = (await page.locator(`${R("who-row")}[data-status="Queried"]`).first().locator("b").textContent())?.trim() ?? "";
  await toQueriedPartial(page);
  await page.locator(R("asked-go")).click(); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="no"] > button`).click(); await settle(page);
  /* B4 — move the slider by keyboard and by drag: the same node, the body's scroll held */
  const sl = page.locator(`${R("slider")}[data-k="byDays"] input[type="range"]`);
  await page.locator(R("body")).evaluate((b) => { b.scrollTop = 40; });
  const h = await sl.elementHandle();
  if (MUT === "B4") await page.evaluate(() => { const i = document.querySelector('[data-rar="slider"][data-k="byDays"] input[type="range"]'); i?.addEventListener("input", () => { const p = i.parentElement!; p.replaceChild(i.cloneNode(true), i); }); });
  const before = await page.locator(R("body")).evaluate((b) => b.scrollTop);
  await sl.focus(); for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  const box = await sl.boundingBox();
  if (box) { await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 6 }); await page.mouse.up(); }
  await settle(page);
  const b4 = await page.evaluate(([el, b0]) => ({ same: !!el && (el as Element).isConnected, scroll: document.querySelector<HTMLElement>('[data-rar="body"]')!.scrollTop, b0, note: document.querySelector('[data-rar="slider"][data-k="byDays"] [data-rar="slider-note"]')?.textContent }), [h, before] as const);
  L.check("B4 the slider's input is the same node after moving it", b4.same, JSON.stringify(b4));
  L.check("B4 the body's scroll is held", Math.abs(b4.scroll - b4.b0) <= 1, JSON.stringify(b4));
  L.check("B4 the date beneath follows", /On your to-do list for \w{3} \d+ \w{3}\./.test(b4.note ?? ""), String(b4.note));
  await page.locator(R("sent-go")).click(); await settle(page, 900);
  /* B5 — the review fits */
  if (MUT === "B5") await page.addStyleTag({ content: '[data-rar="body"] [data-rar="preview"] { margin-top: 160px !important; }' });
  await settle(page, 300);
  const b5 = await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-rar="body"]')!; return { sh: b.scrollHeight, ch: b.clientHeight, step: document.querySelector('[data-rar="root"]')?.getAttribute("data-step") }; });
  L.check("B5 on the review", b5.step === "check", String(b5.step));
  L.check("B5 nothing cut off at 1440 × 900 with no note (the body does not scroll)", b5.sh <= b5.ch + 1, `${b5.sh} in ${b5.ch}`);
  /* B6 — record, then Undo */
  await page.locator(R("record")).click();
  await page.locator('[data-rar="root"][data-step="done"]').waitFor({ timeout: 15_000 });
  L.check("B6 the recorded screen, with its stamp", (await page.locator(R("stamp")).count()) === 1, "");
  L.check("B6 the head says it was recorded", /^Recorded\./.test((await page.locator(".flh-t").first().textContent()) ?? ""), String(await page.locator(".flh-t").first().textContent()));
  await page.locator(R("undo")).click();
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 15_000 });
  await settle(page, 1200);
  L.check("B6 Undo brings the review back", (await step(page)) === "check", String(await step(page)));
  await page.locator(R("cancel")).click(); await settle(page);
  if (await page.locator(R("leave-discard")).count()) { await page.locator(R("leave-discard")).click(); await settle(page, 700); }
  await open(page);
  await page.keyboard.type(pickedName); await settle(page);
  const back = await page.locator(R("who-row")).first().getAttribute("data-status");
  L.check("B6 after Undo the query is back where it was (Queried)", back === "Queried", `${pickedName}: ${back}`);
  await page.keyboard.press("Escape"); await settle(page);
  /* B9 — record and start another, then its Undo */
  await toQueriedPartial(page);
  await page.locator(R("asked-go")).click(); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="no"] > button`).click();
  await page.locator(R("sent-go")).click(); await settle(page, 900);
  await page.locator(R("record-more")).click();
  await page.locator('[data-rar="root"][data-step="who"]').waitFor({ timeout: 15_000 });
  await settle(page, 400);
  const toast = (await page.locator(R("toast")).textContent()) ?? "";
  L.check("B9 back at Who replied?, with the toast", /^Recorded .+’s reply\.Undo$/.test(toast.trim()), toast);
  L.check("B9 the head counts this sitting", /That’s 1 recorded\./.test((await page.locator(".flh-t").first().textContent()) ?? ""), String(await page.locator(".flh-t").first().textContent()));
  await page.locator(R("toast-undo")).click();
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 15_000 });
  L.check("B9 the toast's Undo brings the review back", (await step(page)) === "check", String(await step(page)));
  await settle(page, 800);
  L.done(12);
});

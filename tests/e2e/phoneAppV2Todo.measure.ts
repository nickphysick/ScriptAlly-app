/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 5 — TO-DO AND THE CORKBOARD, PA2-5 (design-refs/phone-app-v2/ screens 24 and 25).
 *
 * T1 the band's tallies are the desktop tray's own · T2 the week's dots are the counted items per day, and no
 * housekeeping or offer dots · T3 a day filters to its own tasks and a second tap clears · T4 each verb opens its
 * journey and nothing writes · T5 Later refuses a passed send-by in the existing words and snoozes another with Undo
 * (writes and undoes) · T6 the notes keep the board's order, a note's tilt is stable, and Add a note opens the flow ·
 * T7 the To-do badge is From earlier + Today · T8 the colour laws and no image twice · T9 the desktop (PA2-1 S9).
 */
import { expect, test, type Page } from "@playwright/test";
import { collection, getDocs } from "firebase/firestore";
import { devDb } from "./devWrite";
import { Ledger, PHONES, colourSweep, imageSweep, openPhone, shot, tag } from "./pa2Lib";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const PART = "part-5";

const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x));
async function snapshot(): Promise<Record<string, string>> {
  const { db, uid } = await devDb();
  const out: Record<string, string> = {};
  for (const c of ["queries", "activities", "taskFlags", "tasks"]) for (const d of (await getDocs(collection(db, "users", uid, c))).docs) out[`${c}/${d.id}`] = canon(d.data());
  return out;
}
const diff = (a: Record<string, string>, b: Record<string, string>) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
const rowsNow = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="todo"] [data-pa="task-row"]')].filter((r) => r.getBoundingClientRect().height > 0)
  .map((r) => ({ key: r.dataset.key!, bucket: r.dataset.bucket!, type: r.dataset.type!, day: r.dataset.day!, when: (r.closest('[data-pa="when-group"]') as HTMLElement | null)?.dataset.when ?? "", verb: r.querySelector<HTMLElement>('[data-pa="verb"]')?.dataset.verb ?? "" })));
const closeAny = async (page: Page) => {
  for (let i = 0; i < 3; i++) {
    if (await page.locator(".pa-flow, [data-qad-drawer]:visible").count()) {
      await page.locator('[data-pf="close"], [data-qad-drawer]:visible button[aria-label="Close"]').first().click().catch(() => {}); await page.waitForTimeout(300);
      const d = page.getByRole("button", { name: /^Discard$/ }); if (await d.count()) { await d.first().click(); await page.waitForTimeout(300); }
    }
  }
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
};

for (const vp of PHONES) {
  test(`PA2-5 · To-do · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `todo-${tag(vp)}`);
    /* T1 — the desktop tray's own tallies first */
    await openRoute(page, "/todo", { width: 1512, height: 900 });
    await page.locator('[data-td7="count"][data-f="overdue"]:visible').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(2500);
    const desk = await page.evaluate(() => Object.fromEntries(["overdue", "today", "later"].map((f) => [f, Number(document.querySelector(`[data-td7="count"][data-f="${f}"] .td7-ctn`)?.textContent || "0")])));
    await openPhone(page, "/todo", vp);
    await page.locator('[data-pa="todo-tallies"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(800);
    const band = await page.evaluate(() => Object.fromEntries(["earlier", "today", "soon"].map((k) => [k, Number(document.querySelector(`[data-pa="tally-${k}"]`)?.textContent ?? NaN)])));
    L.check("pop", `${tag(vp)} the desktop tray's tallies were read`, Object.values(desk).every(Number.isFinite), JSON.stringify(desk));
    L.check("T1", `${tag(vp)} the band's tallies are the tray's own (from earlier · today · coming up)`, band.earlier === desk.overdue && band.today === desk.today && band.soon === desk.later, `${JSON.stringify(band)} vs ${JSON.stringify(desk)}`);
    const rows = await rowsNow(page);
    L.check("pop", `${tag(vp)} rows`, rows.length > 4, String(rows.length));
    L.check("T1", `${tag(vp)} each group holds exactly its tally`, rows.filter((r) => r.when === "earlier").length === band.earlier && rows.filter((r) => r.when === "today").length === band.today && rows.filter((r) => r.when === "soon").length === band.soon, JSON.stringify(rows.reduce<Record<string, number>>((a, r) => ((a[r.when] = (a[r.when] ?? 0) + 1), a), {})));
    /* T7 — the badge */
    const badge = (await page.locator('[data-pa="tab-badge"]').count()) ? Number(await page.locator('[data-pa="tab-badge"]').first().textContent()) : 0;
    L.check("T7", `${tag(vp)} the To-do badge is From earlier + Today`, badge === band.earlier + band.today, `${badge} vs ${band.earlier}+${band.today}`);
    /* T2 — the week's dots: the counted items on each day; housekeeping and offers never dot */
    const week = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="wk-day"]')].map((d) => ({ ymd: d.dataset.ymd!, dots: Number(d.dataset.dots), drawn: d.querySelectorAll(".wdots i").length })));
    L.check("pop", `${tag(vp)} seven days`, week.length === 7, String(week.length));
    for (const d of week) {
      const onDay = rows.filter((r) => r.day === d.ymd).length;
      L.check("T2", `${tag(vp)} ${d.ymd}: the dots count the tasks due that day`, d.dots === onDay && d.drawn === Math.min(3, onDay), `${d.dots}/${d.drawn} vs ${onDay}`);
    }
    const never = rows.filter((r) => r.bucket === "fix" || r.type === "offer_received");
    L.check("T2", `${tag(vp)} housekeeping and offers carry no day (never dot)`, never.every((r) => !r.day), JSON.stringify(never.filter((r) => r.day).slice(0, 3)));
    /* T3 — a day filters, a second tap clears */
    const withDot = week.find((d) => d.dots > 0) ?? week[0];
    await page.locator(`[data-pa="wk-day"][data-ymd="${withDot.ymd}"]`).click(); await page.waitForTimeout(300);
    const f1 = await rowsNow(page);
    L.check("T3", `${tag(vp)} tapping ${withDot.ymd} shows that day's tasks only`, f1.length === withDot.dots && f1.every((r) => r.day === withDot.ymd), `${f1.length} vs ${withDot.dots}`);
    await page.locator(`[data-pa="wk-day"][data-ymd="${withDot.ymd}"]`).click(); await page.waitForTimeout(300);
    L.check("T3", `${tag(vp)} a second tap clears the filter`, (await rowsNow(page)).length === rows.length, "");
    /* T8 */
    const col = await colourSweep(page, { roots: ".pa-band, .pa-td, .pa-tabbar" });
    L.check("T8", `${tag(vp)} To-do: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("T8", `${tag(vp)} To-do: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `24-todo-${tag(vp)}`);

    if (vp.width === 390) {
      /* T4 — each verb opens its journey; nothing writes */
      const b4 = await snapshot();
      const want: Record<string, string> = { Send: "sent", Nudge: "nudge", Decide: "" };
      for (const [verb, mode] of Object.entries(want)) {
        const r = rows.find((x) => x.verb === verb && x.bucket !== "fix");
        if (!r) { L.check("pop", `${tag(vp)} a ${verb} row`, false, ""); continue; }
        const row = page.locator(`[data-pa="todo"] [data-pa="task-row"][data-key="${r.key}"]`);
        await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(200);
        await row.locator('[data-pa="verb"]').click(); await page.waitForTimeout(900);
        const got = await page.locator("[data-qad-drawer]:visible").first().getAttribute("data-qad-drawer", { timeout: 6000 }).catch(() => null);
        L.check("T4", `${tag(vp)} ${verb} opens its journey`, mode ? got === mode : !!got, String(got));
        await closeAny(page);
      }
      const own = rows.find((x) => x.verb === "Done");
      if (own) {
        const row = page.locator(`[data-pa="todo"] [data-pa="task-row"][data-key="${own.key}"]`);
        await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(200);
        await row.locator('[data-pa="verb"]').click(); await page.waitForTimeout(500);
        L.check("T4", `${tag(vp)} Done asks before it ticks anything off`, (await page.locator('[data-pa="done-ask"]').count()) === 1, "");
        /* a write on tap would put an Undo on screen; press it so the account is put back, and fail */
        if (await page.locator("[data-qad-undo]").count()) await page.locator("[data-qad-undo]").first().click().catch(() => {});
        await page.getByRole("button", { name: /^Not yet$/ }).click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
      }
      await page.waitForTimeout(1500);
      const left = diff(b4, await snapshot());
      L.check("T4", `${tag(vp)} nothing was written by any verb`, left.length === 0, left.slice(0, 5).join(", "));

      /* T5 — Later: a passed send-by is refused in the existing words; another is snoozed, and Undo puts it back */
      const swipeLater = async (key: string) => {
        const row = page.locator(`[data-pa="todo"] [data-pa="task-row"][data-key="${key}"]`);
        await row.evaluate((e) => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(300);
        const b = (await row.locator(".pa-task").boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
        for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + b.width / 2 - 15 * i, b.y + b.height / 2);
        await page.mouse.up(); await page.waitForTimeout(400);
        await row.locator('[data-pa="later"]').click({ timeout: 6000 }); await page.waitForTimeout(700);
      };
      const send = rows.find((x) => x.bucket === "send");
      if (send) {
        await swipeLater(send.key);
        const words = await page.locator('[data-pa="later-sheet"] [data-td5="pop-passed"]').textContent({ timeout: 4000 }).catch(() => "");
        L.check("T5", `${tag(vp)} a passed send-by: "Can’t be snoozed", in the existing words`, /Can’t be snoozed/.test(words ?? "") && /send-by date passed/.test(words ?? ""), String(words).slice(0, 80));
        await shot(page, PART, `24-later-${tag(vp)}`);
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      } else L.check("pop", `${tag(vp)} a send row`, false, "");
      const nudge = rows.find((x) => x.bucket === "chase");
      if (nudge) {
        const b5 = await snapshot();
        await swipeLater(nudge.key);
        await page.locator('[data-pa="later-sheet"] .td5-pchips button').first().click({ timeout: 6000 }); await page.waitForTimeout(1200);
        const wrote = diff(b5, await snapshot());
        L.check("T5", `${tag(vp)} a snooze writes`, wrote.length > 0, wrote.slice(0, 3).join(", "));
        const ok = await page.locator("[data-qad-undo]").first().click({ timeout: 6000 }).then(() => true, () => false);
        expect(ok, "UNDO NOT PRESSED after the snooze: the harness account has a snoozed nudge — restore it").toBe(true);
        let left2: string[] = [];
        for (let t = 0; t < 8; t++) { await page.waitForTimeout(1000); left2 = diff(b5, await snapshot()); if (!left2.length) break; }
        L.check("T5", `${tag(vp)} Undo puts the account back`, left2.length === 0, left2.slice(0, 4).join(", "));
      } else L.check("pop", `${tag(vp)} a nudge row`, false, "");
    }
    L.done(vp.width === 390 ? 26 : 16);
  });

  test(`PA2-5 · the Corkboard · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `cork-${tag(vp)}`);
    await openRoute(page, "/todo/corkboard", { width: 1512, height: 900 });
    await page.locator("[data-note]").first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(1500);
    const deskOrder = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-note]")].map((n) => n.dataset.note!));
    await openPhone(page, "/todo/corkboard", vp);
    await page.locator('[data-pa="note"]').first().waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
    const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="cork"] [data-pa="note"]')].map((n) => ({ id: n.dataset.id!, tilt: Number(n.dataset.tilt), t: getComputedStyle(n).transform })));
    const a = await read();
    L.check("pop", `${tag(vp)} notes on both`, a.length > 2 && deskOrder.length > 2, `${a.length} / ${deskOrder.length}`);
    L.check("T6", `${tag(vp)} the notes keep the board's order`, JSON.stringify(a.map((n) => n.id)) === JSON.stringify(deskOrder), `${a.map((n) => n.id).slice(0, 4)} vs ${deskOrder.slice(0, 4)}`);
    L.check("T6", `${tag(vp)} every tilt is within −2° … +2°`, a.every((n) => Math.abs(n.tilt) <= 2), JSON.stringify(a.map((n) => n.tilt)));
    const band = Number(await page.locator('[data-pa="notes-n"]').textContent());
    L.check("T6", `${tag(vp)} the band counts the notes pinned`, band === a.length, `${band} vs ${a.length}`);
    await page.reload(); await page.locator('[data-pa="note"]').first().waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
    const b = await read();
    L.check("T6", `${tag(vp)} each note's tilt is the same across two renders`, JSON.stringify(a.map((n) => [n.id, n.t])) === JSON.stringify(b.map((n) => [n.id, n.t])), "");
    const col = await colourSweep(page, { roots: ".pa-band, .pa-cork, .pa-tabbar" });
    L.check("T8", `${tag(vp)} Corkboard: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("T8", `${tag(vp)} Corkboard: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `25-corkboard-${tag(vp)}`);
    await page.locator('[data-pa="add-note"]').click(); await page.waitForTimeout(800);
    L.check("T6", `${tag(vp)} Add a note opens the note flow`, (await page.locator('.pa-flow[data-pf="note"]').count()) === 1, "");
    await page.locator('[data-pf="close"]').click().catch(() => {}); await page.waitForTimeout(300);
    L.done(7);
  });
}

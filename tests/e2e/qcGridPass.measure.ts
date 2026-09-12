/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GRID PASS §5 + §6, MEASURED — the band verbs and the empty states on the rendered page, at
 * 1280/1440/1920.
 *
 * §5 · The band is exactly as tall hovered as at rest; the verb row's rect never intersects the
 *      fact line's; the row shows on hover and on focus while the turn caption fades; Tab from the
 *      card reaches this card's row, and Escape hands focus back; each verb opens what the list
 *      row's opens, anchored to the control pressed.
 * §6 · Filtered to zero, the card shows only where "Nothing needs you right now" is true on this
 *      account and the plain line shows everywhere else — decided against the registers the cards
 *      on the page state, never against a hope about the fixture.
 *
 * ⚠️ EVERY SWEEP ASSERTS ITS POPULATION AND TALLIES WHAT IT SAW. A geometry sweep over one kind of
 * card is a census of that kind, so the turns measured are printed and must be more than one.
 * ⚠️ NOTHING HERE COMMITS. Every popover it opens is dismissed; the desk it opens is abandoned.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const SHOTS = "reports/query-grid-pass-shots";
const JSON_OUT = "reports/query-grid-pass.json";
mkdirSync(SHOTS, { recursive: true });

/** each test adds its own key — runs are single-worker, but a file per key would hide a stale one */
const record = (key: string, value: unknown) => {
  const prev = existsSync(JSON_OUT) ? JSON.parse(readFileSync(JSON_OUT, "utf8")) : {};
  writeFileSync(JSON_OUT, JSON.stringify({ ...prev, [key]: value }, null, 2));
};

type Box = { x: number; y: number; w: number; h: number; op: number };
/** strict overlap with half a pixel of slack, so edges that merely meet are not an intersection */
const meets = (a: Box, b: Box) =>
  a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** ⚠️ THE VISIBLE SWITCH — the To-do page mounts the same component, and every page stays mounted */
const pickView = async (page: Page, label: string) => {
  await page.evaluate(() => {
    const live = [...document.querySelectorAll<HTMLElement>(".qvs")].find((e) => e.getBoundingClientRect().height > 0);
    live?.setAttribute("data-qvs-live", "1");
  });
  await page.locator('.qvs[data-qvs-live="1"] button', { hasText: new RegExp(`^${label}$`) }).click();
};

async function openGrid(page: Page, width: number) {
  await openRoute(page, "/queries", { width, height: 900 });
  await expect(page.locator(".qcc-grid, .qlv, .qbv").first()).toBeVisible({ timeout: 30_000 });
  await pickView(page, "Grid");
  await expect(page.locator(".qcc[data-qcc-id]").first()).toBeVisible({ timeout: 30_000 });
  await page.mouse.move(2, 2);
}

const read = (page: Page, id: string) =>
  page.evaluate((id) => {
    const card = document.querySelector<HTMLElement>(`[data-qcc-id="${id}"]`);
    if (!card) return null;
    const box = (sel: string) => {
      const e = card.querySelector<HTMLElement>(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, op: Number(getComputedStyle(e).opacity) };
    };
    return {
      turn: card.dataset.qccTurn ?? "",
      band: box(".qcc-band"),
      verbs: box(".qcc-verbs"),
      fact: box(".qcc-fact"),
      word: box(".qcc-word"),
      cap: box(".qcc-turn"),
    };
  }, id);

/** a card on the agent's side — it carries every verb: primary, snooze, close, ⋯ */
const agentSideCard = (page: Page) =>
  page.evaluate(() => {
    const c = [...document.querySelectorAll<HTMLElement>(".qcc[data-qcc-id]")].find(
      (e) => e.getBoundingClientRect().height > 0 && ["sand", "agent"].includes(e.dataset.qccTurn ?? ""),
    );
    return c?.dataset.qccId ?? null;
  });

for (const width of [1280, 1440, 1920] as const) {
  test(`§5 · the band holds its height and the verb row never reaches the fact line — ${width}`, async ({ page }) => {
    test.setTimeout(300_000);
    await openGrid(page, width);
    const all = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".qcc[data-qcc-id]")]
        .filter((e) => e.getBoundingClientRect().height > 0)
        .map((e) => ({ id: e.dataset.qccId!, turn: e.dataset.qccTurn ?? "" })),
    );
    expect(all.length, "the grid drew too few cards to measure").toBeGreaterThan(4);

    /* one card of every turn on the page first, then the first few — so the sweep is not one kind */
    const pick: string[] = [];
    for (const t of new Set(all.map((c) => c.turn))) pick.push(all.find((c) => c.turn === t)!.id);
    for (const c of all) if (pick.length < 10 && !pick.includes(c.id)) pick.push(c.id);

    const rows: Record<string, number | string | boolean>[] = [];
    const turns = new Set<string>();
    for (const id of pick) {
      const card = page.locator(`[data-qcc-id="${id}"]`);
      await card.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      const rest = await read(page, id);
      await card.hover({ position: { x: 24, y: 96 } });
      const hov = await read(page, id);
      expect(rest?.band && rest?.verbs && hov?.band && hov?.verbs && hov?.fact && hov?.word && hov?.cap, `${id}: a part is missing`).toBeTruthy();
      const band = hov!.band!;
      const verbs = hov!.verbs!;
      turns.add(hov!.turn);
      const row = {
        id,
        turn: hov!.turn,
        bandRest: +rest!.band!.h.toFixed(2),
        bandHover: +band.h.toFixed(2),
        rowRest: rest!.verbs!.op,
        rowHover: verbs.op,
        capHover: hov!.cap!.op,
        meetsFact: meets(verbs, hov!.fact!),
        inBand: verbs.y >= band.y - 0.5 && verbs.y + verbs.h <= band.y + band.h + 0.5,
        /* reported, not asserted: how far the row's left edge sits from the status word's right */
        wordGap: +(verbs.x - (hov!.word!.x + hov!.word!.w)).toFixed(1),
        rowW: +verbs.w.toFixed(1),
      };
      rows.push(row);
      expect(Math.abs(row.bandHover - row.bandRest), `${id}: the band changed height on hover`).toBeLessThan(0.01);
      expect(row.meetsFact, `${id}: the verb row covers the fact line`).toBe(false);
      expect(row.inBand, `${id}: the verb row left the band`).toBe(true);
      expect(row.rowRest, `${id}: the row shows at rest`).toBe(0);
      expect(row.rowHover, `${id}: hover did not reveal the row`).toBe(1);
      expect(row.capHover, `${id}: the turn caption did not fade`).toBe(0);
    }
    const gaps = rows.map((r) => r.wordGap as number);
    console.log(`  ${width}: ${rows.length} cards · turns ${[...turns].join("/")} · word gap min ${Math.min(...gaps)} max ${Math.max(...gaps)}`);
    for (const r of rows) console.log(`    ${r.id} ${r.turn} band ${r.bandRest}→${r.bandHover} row ${r.rowW}px gap ${r.wordGap}`);
    expect(turns.size, "every card measured was one kind — the sweep proves nothing about the rest").toBeGreaterThan(1);
    record(`geometry-${width}`, rows);

    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${SHOTS}/grid-rest-${width}.png` });
    const first = page.locator(`[data-qcc-id="${pick[0]}"]`);
    await first.scrollIntoViewIfNeeded();
    await first.hover({ position: { x: 24, y: 96 } });
    await page.screenshot({ path: `${SHOTS}/grid-hover-${width}.png` });
  });
}

test("§5 · keyboard — Tab from the card reaches its own row, and Escape hands focus back — 1440", async ({ page }) => {
  test.setTimeout(180_000);
  await openGrid(page, 1440);
  const id = await agentSideCard(page);
  expect(id, "no card on the agent's side to walk").toBeTruthy();
  const where = () =>
    page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return {
        card: a?.closest("[data-qcc-id]")?.getAttribute("data-qcc-id") ?? null,
        open: !!a?.classList.contains("qcc-open"),
        inRow: !!a?.closest(".qcc-verbs"),
        name: a?.getAttribute("aria-label") ?? (a?.textContent ?? "").trim(),
      };
    });
  await page.locator(`[data-qcc-id="${id}"]`).scrollIntoViewIfNeeded();
  await page.evaluate((id) => document.querySelector<HTMLElement>(`[data-qcc-id="${id}"] .qcc-open`)?.focus(), id);
  const f0 = await where();
  expect(f0.card).toBe(id);
  expect(f0.open, "the card's open control did not take focus").toBe(true);
  const shown = await page.evaluate(
    (id) => Number(getComputedStyle(document.querySelector(`[data-qcc-id="${id}"] .qcc-verbs`)!).opacity),
    id,
  );
  expect(shown, "focus on the card did not reveal its row").toBe(1);
  await page.keyboard.press("Tab");
  const f1 = await where();
  expect(f1.card, "Tab left the card").toBe(id);
  expect(f1.inRow, "Tab did not reach the verb row").toBe(true);
  await page.keyboard.press("Escape");
  const f2 = await where();
  expect(f2.card).toBe(id);
  expect(f2.open, "Escape did not hand focus back to the card").toBe(true);
  record("keyboard", { id, f0, f1, f2 });
});

test("§5 · each verb opens what the list row's opens, anchored to the control pressed — 1440", async ({ page }) => {
  test.setTimeout(240_000);
  await openGrid(page, 1440);
  const id = await agentSideCard(page);
  expect(id, "no card on the agent's side to press").toBeTruthy();
  const card = page.locator(`[data-qcc-id="${id}"]`);
  const pop = page.locator(".f12-pop[role='dialog']");
  const seen: Record<string, unknown> = {};

  for (const [label, title] of [["Snooze the nudge", "Snooze the nudge"], ["Mark closed", "Close this query"]] as const) {
    await card.scrollIntoViewIfNeeded();
    await card.hover({ position: { x: 24, y: 96 } });
    const btn = card.locator(`.qcc-verbs [aria-label="${label}"]`);
    const b = (await btn.boundingBox())!;
    await btn.click();
    await expect(pop, `${label} opened nothing`).toBeVisible({ timeout: 10_000 });
    await expect(pop).toContainText(title);
    const p = (await pop.boundingBox())!;
    const dx = Math.max(0, p.x - (b.x + b.width), b.x - (p.x + p.width));
    const dy = Math.max(0, p.y - (b.y + b.height), b.y - (p.y + p.height));
    seen[label] = { gap: +Math.hypot(dx, dy).toFixed(1), button: b, panel: p };
    expect(Math.hypot(dx, dy), `${label}: the popover is not anchored to the control pressed`).toBeLessThan(24);
    /* one decision each — the quick pair opens no drawer */
    expect(await page.locator(".qpn[data-on='true']").count(), `${label} opened the drawer`).toBe(0);
    await page.keyboard.press("Escape");
    await expect(pop, `${label}: Escape left the popover open`).toBeHidden({ timeout: 10_000 });
  }

  /* the primary composes, so it opens the drawer first and the desk beside it */
  await card.hover({ position: { x: 24, y: 96 } });
  await card.locator(".qcc-verbs .qcc-vb--p").click();
  await expect(page.locator(".qpn[data-on='true']"), "the primary opened no drawer").toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".qcd-card .qrd"), "the primary opened no desk").toBeVisible({ timeout: 15_000 });
  seen.primary = "drawer, then the desk";
  record("opens-grid", seen);
});

test("§5 · the list's verbs still open the same things — one handler, from the row — 1440", async ({ page }) => {
  test.setTimeout(240_000);
  await openGrid(page, 1440);
  await pickView(page, "List");
  await expect(page.locator(".qlv-row").first()).toBeVisible({ timeout: 20_000 });
  const idx = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".qlv-row")].findIndex((r) => {
      const b = r.querySelector<HTMLElement>('[aria-label="Snooze the nudge"]');
      return r.getBoundingClientRect().height > 0 && !!b && getComputedStyle(b).visibility === "visible";
    }),
  );
  expect(idx, "no list row on the agent's side").toBeGreaterThan(-1);
  const row = page.locator(".qlv-row").nth(idx);
  const pop = page.locator(".f12-pop[role='dialog']");
  await row.locator('[aria-label="Snooze the nudge"]').click();
  await expect(pop).toBeVisible({ timeout: 10_000 });
  await expect(pop).toContainText("Snooze the nudge");
  await page.keyboard.press("Escape");
  await expect(pop).toBeHidden({ timeout: 10_000 });
  await row.locator(".qlv-pri").click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".qcd-card .qrd")).toBeVisible({ timeout: 15_000 });
  record("opens-list", "snooze popover, then drawer and desk from the primary");
});

test("§6 · filtered to zero — the card only where its headline is true, the plain line elsewhere — 1440", async ({ page }) => {
  test.setTimeout(180_000);
  await openGrid(page, 1440);
  /* the tiles' set: every chip cleared, the All tile on */
  const clear = page.locator(".f12-clear:visible");
  if (await clear.count()) await clear.first().click();
  await page.locator(".qct-tile:visible", { hasText: "All queries" }).first().click();
  const regs: string[] = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".qcc[data-qcc-id] .qcc-rc")]
      .filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => (e.textContent ?? "").trim()),
  );
  expect(regs.length, "no cards to read registers from").toBeGreaterThan(0);
  const tally: Record<string, number> = {};
  for (const r of regs) tally[r] = (tally[r] ?? 0) + 1;
  const needsYou = regs.filter((r) => ["Your move", "Past expected", "Offer"].includes(r)).length;

  /* ⚠️ THE TOOLBAR'S SEARCH, NOT THE LIST HEAD'S. Both exist in the document; the list head's
     (`aria-label="Search queries"`) is the hidden column's, and targeting it waited out the whole
     test timeout on a page whose search box was on screen the whole time. */
  const search = page.locator('input[aria-label="Search agents or agencies"]:visible').first();
  await search.fill("zz-no-such-query-qq");
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({
    cards: [...document.querySelectorAll<HTMLElement>(".qcc[data-qcc-id]")].filter((e) => e.getBoundingClientRect().height > 0).length,
    filtered: !!document.querySelector(".qce--filtered"),
    first: !!document.querySelector(".qce--first"),
    none: !!document.querySelector(".qcc-none"),
    line: document.querySelector(".qce--filtered .qce-p")?.textContent ?? null,
    agentTile: [...document.querySelectorAll<HTMLElement>(".qct-tile")]
      .find((e) => e.getBoundingClientRect().height > 0 && (e.textContent ?? "").includes("With the agent"))
      ?.querySelector(".qct-n")?.textContent?.trim() ?? null,
  }));
  console.log(`  registers ${JSON.stringify(tally)} · needs you ${needsYou} · ${JSON.stringify(state)}`);
  expect(state.cards, "the search did not empty the view").toBe(0);
  expect(state.first, "the first-query card showed on an account with queries").toBe(false);
  if (needsYou > 0) {
    expect(state.none, "something waits on the writer, so the plain line must show").toBe(true);
    expect(state.filtered, '"Nothing needs you right now" shown while something does').toBe(false);
  } else {
    expect(state.filtered, "nothing waits on the writer, so the card must show").toBe(true);
    expect(state.none).toBe(false);
    const n = state.line?.match(/^(\d+) quer/)?.[1] ?? "0";
    expect(n, "the card's number is not the With-the-agent tile's").toBe(state.agentTile);
  }
  record("filtered-live", { tally, needsYou, state });
  await page.screenshot({ path: `${SHOTS}/filtered-live-1440.png` });
  await search.fill("");
});

test("shots — each register once, and the List's relational copy at every width", async ({ page }) => {
  test.setTimeout(300_000);
  await openGrid(page, 1440);
  const found: Record<string, boolean> = {};
  for (const reg of ["Waiting", "Past expected", "Your move", "Offer", "Closed"]) {
    const id = await page.evaluate((reg) => {
      const c = [...document.querySelectorAll<HTMLElement>(".qcc[data-qcc-id]")].find(
        (e) => e.getBoundingClientRect().height > 0 && e.querySelector(".qcc-rc")?.textContent?.trim() === reg,
      );
      return c?.dataset.qccId ?? null;
    }, reg);
    found[reg] = !!id;
    if (!id) continue;
    const card = page.locator(`[data-qcc-id="${id}"]`);
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await card.screenshot({ path: `${SHOTS}/register-${reg.toLowerCase().replace(/\s+/g, "-")}-1440.png` });
  }
  console.log(`  registers found: ${JSON.stringify(found)}`);
  record("registers", found);
  for (const width of [1280, 1440, 1920]) {
    await openGrid(page, width);
    await pickView(page, "List");
    await expect(page.locator(".qlv-row").first()).toBeVisible({ timeout: 20_000 });
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${SHOTS}/list-${width}.png` });
  }
});

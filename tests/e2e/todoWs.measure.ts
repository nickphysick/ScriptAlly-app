/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — THE TASK WORKSPACE, measured on the rendered page (design-refs/todo-list-v50/todo-list-v50.html).
 * Run against the emulator: `SA_E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/todoWs.measure.ts --project=measure --no-deps`
 * with `npm run dev:emu` serving, or through `npm run e2e:emu -- tests/e2e/todoWs.measure.ts`.
 *
 * Two cases write, and each puts the account back in the same run: one logs a nudge and presses Undo, one adds an own
 * task and deletes it. Every other case reads. Screenshots go to reports/todo-list-v51/.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";

const DIR = "reports/todo-list-v51";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
mkdirSync(DIR, { recursive: true });

async function open(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/todo", vp);
  await liftMotionSuppression(page);
  await expect(page.locator('[data-tws="page"]:visible')).toHaveCount(1, { timeout: 30_000 });
}

for (const vp of SIZES) {
  test(`the workspace at ${vp.width}`, async ({ page }) => {
    await open(page, vp);
    const read = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const box = (sel: string) => { const e = root.querySelector<HTMLElement>(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const ws = root.querySelector<HTMLElement>('[data-tws="workspace"]')!;
      const sc = root.closest<HTMLElement>(".wpg-scroll");
      /* no green anywhere on the page: every computed colour's green channel never leads red and blue by much */
      const greens: string[] = [];
      for (const el of root.querySelectorAll<HTMLElement>("*")) {
        const c = getComputedStyle(el);
        for (const v of [c.color, c.backgroundColor, c.borderTopColor]) {
          const m = /rgba?\((\d+), (\d+), (\d+)/.exec(v);
          if (!m) continue;
          const [r, g, b] = [+m[1], +m[2], +m[3]];
          if (g - r > 18 && g - b > 18) greens.push(`${el.className} ${v}`);
        }
      }
      return {
        header: box('[data-tws="header"]'), ws: box('[data-tws="workspace"]'), tray: box('[data-tws="tray"]'), desk: box('[data-tws="desk"]'),
        side: box('[data-tws="side"]'), rows: root.querySelectorAll("[data-tws-row]").length, priority: root.querySelector('[data-tws="priority"]')?.textContent ?? "",
        port: sc?.clientHeight ?? 0, wsH: ws.getBoundingClientRect().height, greens: greens.slice(0, 10),
        sections: [...root.querySelectorAll<HTMLElement>(".tws-gb b")].map((b) => b.textContent),
      };
    });
    console.log(JSON.stringify(read, null, 1));
    await page.screenshot({ path: `${DIR}/page-${vp.width}.png` });
    expect(read.header?.h).toBeGreaterThan(50);
    expect(read.header!.h).toBeLessThan(62);
    expect(read.rows).toBeGreaterThan(0);
    expect(read.tray?.w).toBe(340);
    expect(read.greens).toEqual([]);
    /* the workspace fills the scrollport under the header, with a 560px floor */
    expect(Math.abs(read.wsH - Math.max(560, read.port - 104))).toBeLessThan(2);
  });
}

test("a send, answered to the summary (nothing is logged)", async ({ page }) => {
  await open(page, SIZES[0]);
  const send = page.locator('[data-tws="page"]:visible [data-tws-row]').filter({ hasText: /^Send / }).first();
  test.skip(!(await send.count()), "the account has no send task");
  await send.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/send-1.png` });
  const desk = page.locator('[data-tws="desk"]:visible');
  await desk.locator(".tws-tile").first().click();
  await desk.locator('[data-tws="next"]').click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    const tiles = desk.locator(".tws-q .tws-tile");
    if (await tiles.count()) await tiles.first().click();
    const next = desk.locator('[data-tws="next"]');
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  await expect(desk.locator('[data-tws="story"]')).toBeVisible();
  await expect(desk.locator('[data-tws="log"]')).toBeEnabled();
  await page.screenshot({ path: `${DIR}/send-summary.png` });
  await desk.getByText("Check it on the card first").click();
  await expect(page.locator('[data-tws="review-drawer"]')).toBeVisible();
  await expect(desk.getByRole("button", { name: /Yes, log it/ })).toBeVisible();
  await expect(desk.getByRole("button", { name: /Change something/ })).toBeVisible();
  await page.waitForTimeout(400);
  /* nothing in the workspace sits under the drawer */
  const gap = await page.evaluate(() => {
    const ws = [...document.querySelectorAll<HTMLElement>('[data-tws="workspace"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const dr = document.querySelector<HTMLElement>('[data-tws="review-drawer"]')!;
    return dr.getBoundingClientRect().left - ws.getBoundingClientRect().right;
  });
  expect(gap).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: `${DIR}/send-review.png` });
});

test("the snoozed and done tabs, and the pop-ups", async ({ page }) => {
  await open(page, SIZES[0]);
  const tray = page.locator('[data-tws="tray"]:visible');
  await tray.getByRole("button", { name: /^Snoozed/ }).click();
  await expect(tray.getByText(/come back to/)).toBeVisible();
  await page.screenshot({ path: `${DIR}/snoozed.png` });
  await tray.getByRole("button", { name: /^Done/ }).click();
  await expect(tray.getByText(/dismissed is here too/)).toBeVisible();
  await page.screenshot({ path: `${DIR}/done.png` });
  await tray.getByRole("button", { name: /^To do/ }).click();
  const desk = page.locator('[data-tws="desk"]:visible');
  await desk.getByRole("button", { name: /^Snooze|^Move it/ }).first().click();
  await expect(page.locator('[data-tws="snooze-pop"]')).toBeVisible();
  await page.screenshot({ path: `${DIR}/snooze-pop.png` });
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tws="snooze-pop"]')).toHaveCount(0);
  await desk.getByRole("button", { name: /^Dismiss|^Delete/ }).first().click();
  await expect(page.locator('[data-tws="dismiss-pop"]')).toBeVisible();
  await page.screenshot({ path: `${DIR}/dismiss-pop.png` });
});

test("each kind of task on the desk", async ({ page }) => {
  await open(page, SIZES[0]);
  const rows = page.locator('[data-tws="page"]:visible [data-tws-row]');
  const n = await rows.count();
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    const title = (await r.locator(".tws-tx b").textContent()) ?? "";
    const kind = /^Send/.test(title) ? "send" : /offer/.test(title) ? "offer" : /^Nudge/.test(title) ? "nudge" : /gone quiet/.test(title) ? "quiet" : /reply\?|wishlist|want sent/.test(title) ? "fix" : "other";
    if (seen.has(kind)) continue;
    seen.add(kind);
    await r.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/kind-${kind}.png` });
  }
  console.log("kinds seen:", [...seen].join(", "));
});

test("your own task: add it, a step, then delete it (the account is put back)", async ({ page }) => {
  await open(page, SIZES[0]);
  const pg = page.locator('[data-tws="page"]:visible');
  const title = `Measure task ${Date.now()}`;
  await pg.locator('[data-tws="header"] .tws-addb').click();
  const add = page.locator('[data-tws="add"]:visible');
  await add.getByLabel("What do you need to do").fill(title);
  await add.getByRole("radio", { name: "Today" }).click();
  await add.getByRole("button", { name: /Add to your tray/ }).click();
  const row = pg.locator("[data-tws-row]").filter({ hasText: title });
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  await row.click();
  const desk = page.locator('[data-tws="desk"]:visible');
  await expect(desk.locator('[data-tws="own"]')).toBeVisible();
  await expect(desk.locator('[data-tws="own-empty"]')).toBeVisible();
  await desk.getByLabel("Add a step").fill("First step");
  await desk.getByLabel("Add a step").press("Enter");
  await expect(desk.getByRole("checkbox", { name: /First step/ })).toBeVisible({ timeout: 10_000 });
  await desk.getByRole("checkbox", { name: /First step/ }).click();
  await expect(desk.getByText("1 of 1 steps")).toBeVisible({ timeout: 10_000 });
  /* link it to an agent: the agent's card shows beside it */
  await desk.locator('[data-tws="own-empty"] .tws-olkadd').click();
  await desk.locator('[data-tws="link-picker"] li button').first().click();
  await expect(desk.locator('[data-tws="side"] [data-tws="preview"]')).toBeVisible({ timeout: 10_000 });
  await expect(desk.getByText(/^Linked: /)).toBeVisible();
  await page.screenshot({ path: `${DIR}/own.png` });
  /* put the account back */
  await desk.getByRole("button", { name: /^Delete/ }).first().click();
  await page.locator('[data-tws="dismiss-pop"]').getByRole("radio", { name: /Delete this task/ }).click();
  await page.locator('[data-tws="dismiss-pop"]').getByRole("button", { name: /^Delete$/ }).click();
  await expect(row).toHaveCount(0, { timeout: 15_000 });
});

test("a nudge, logged and undone: the celebration, then the task is back (the account is put back)", async ({ page }) => {
  await open(page, SIZES[0]);
  const pg = page.locator('[data-tws="page"]:visible');
  const nudge = pg.locator("[data-tws-row]").filter({ hasText: /^Nudge / }).first();
  test.skip(!(await nudge.count()), "the account has no nudge task");
  const title = ((await nudge.locator(".tws-tx b").textContent()) ?? "").trim();
  await nudge.click();
  const desk = page.locator('[data-tws="desk"]:visible');
  await desk.locator('[data-tws-q="sent"] .tws-tile').click();
  await desk.locator('[data-tws="next"]').click();
  await desk.locator('[data-tws="next"]').click();
  await expect(desk.locator('[data-tws="story"]')).toContainText("You nudged");
  await desk.locator('[data-tws="log"]').click();
  const yay = page.locator('[data-tws="yay"]:visible');
  await expect(yay).toBeVisible({ timeout: 15_000 });
  await expect(yay).toContainText("Nudge logged.");
  await expect(pg.locator("[data-tws-row]").filter({ hasText: title })).toHaveCount(0, { timeout: 15_000 });
  await page.screenshot({ path: `${DIR}/logged.png` });
  /* put the account back: the drawer's snapshot restores every touched document */
  await yay.getByRole("button", { name: "Undo" }).click();
  await expect(pg.locator("[data-tws-row]").filter({ hasText: title })).toHaveCount(1, { timeout: 20_000 });
});

test("the preview opens the real card as a drawer", async ({ page }) => {
  await open(page, SIZES[0]);
  const send = page.locator('[data-tws="page"]:visible [data-tws-row]').filter({ hasText: /^Send / }).first();
  await send.click();
  await page.locator('[data-tws="desk"]:visible [data-tws="preview"]').click();
  await expect(page.locator(".spanel.qsp:not(.tws-pvpanel)").first()).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `${DIR}/card-drawer.png` });
});

/* To-do list v51 — the To do tab's number is the sidebar badge's; the Housekeeping heading counts its own rows */
test("the To do count is the sidebar badge, and Housekeeping counts its own rows", async ({ page }) => {
  await open(page, SIZES[0]);
  const pg = page.locator('[data-tws="page"]:visible');
  await expect(pg.locator('[data-tws="todo-count"]')).toBeVisible();
  await page.waitForTimeout(1500);
  const more = pg.locator(".tws-more");
  if (await more.count()) await more.first().click();
  const read = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const tab = Number(root.querySelector('[data-tws="todo-count"]')?.textContent ?? "NaN");
    const badge = [...document.querySelectorAll<HTMLElement>('[data-shell="count"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const badgeN = badge ? Number((badge.getAttribute("aria-label") ?? "").match(/^(\d+)/)?.[1] ?? "NaN") : 0;
    /* each heading's own number, and the rows drawn between it and the next heading */
    const heads = [...root.querySelectorAll<HTMLElement>(".tws-gb")];
    const sections = heads.map((h) => {
      let n = 0;
      for (let e = h.nextElementSibling; e && !e.classList.contains("tws-gb"); e = e.nextElementSibling) if (e.hasAttribute("data-tws-row")) n++;
      return { name: h.querySelector("b")?.textContent ?? "", says: Number(h.querySelector("em")?.textContent ?? "NaN"), rows: n, open: h.getAttribute("aria-expanded") === "true" };
    });
    return { tab, badgeN, badgeShown: !!badge, sections, rows: root.querySelectorAll("[data-tws-row]").length };
  });
  console.log(JSON.stringify(read));
  expect(Number.isFinite(read.tab)).toBe(true);
  expect(read.tab, "the To do tab says what the sidebar badge says").toBe(read.badgeN);
  const house = read.sections.find((x) => x.name === "Housekeeping");
  if (house && house.open) expect(house.says, "the Housekeeping heading counts its own rows").toBe(house.rows);
  for (const x of read.sections.filter((y) => y.open)) expect(x.says, `${x.name}: the heading counts its rows`).toBe(x.rows);
});

test("tags stay reachable: Filters → Manage your tags opens the tags panel", async ({ page }) => {
  await open(page, SIZES[0]);
  const tray = page.locator('[data-tws="tray"]:visible');
  await tray.getByRole("button", { name: "Filters" }).click();
  await page.locator('[data-tws="tags-open"]:visible').click();
  await expect(page.getByRole("dialog", { name: "Tags" }).or(page.locator('[aria-label="Tags"]')).first()).toBeVisible({ timeout: 10_000 });
});

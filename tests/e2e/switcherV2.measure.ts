/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * switcherV2 — the manuscript switcher v2 locks (ref design-refs/shell/manuscript-switcher-v2.html).
 * S1–S6 and S8 here; S2's image branch is unit-level (barSwitcher.test.tsx) because `coverUrl` is
 * outside the manuscript-update rules allowlist, so no record on dev can carry one. Rendered, fonts
 * loaded, at 1280 and 1440. S3 shelves one fixture book for the run (seedSwitcherShelved.mjs) and
 * puts it back in the same test.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Ledger } from "./shellV3Lib";
import { openApp } from "./pageHeaderV2Lib";
import { liftMotionSuppression } from "./measure";
import { ManuscriptStatus } from "../../src/types";
import { SHORTCUTS, keycaps, type ShortcutId } from "../../src/lib/shortcuts";

test.describe.configure({ timeout: Number(process.env.SW_TIMEOUT ?? 900_000) });
const SIZES = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const;
const KEY = "scriptally_active_manuscript_id";
const STATUSES = Object.values(ManuscriptStatus) as string[];
const TILE = '[data-shell="switcher"] > button';

async function menuOpen(page: Page) {
  return page.evaluate(() => {
    const m = document.querySelector<HTMLElement>(".ws-ms-menu");
    return !!m && getComputedStyle(m).visibility === "visible";
  });
}
const focused = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return { cls: a?.className?.toString() ?? "", checked: a?.getAttribute("aria-checked") ?? null, text: a?.textContent?.trim().slice(0, 40) ?? "",
    isTile: !!a?.matches('[data-shell="switcher"] > button'), inMenu: !!a?.closest(".ws-ms-menu") };
});

for (const vp of SIZES) {
  test(`S1, S2, S3 · the tile and the menu at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`sw-tile-menu-${vp.width}`);
    execFileSync("node", ["tests/e2e/seedSwitcherShelved.mjs"], { stdio: "inherit" });
    try {
      await openApp(page, "/queries", vp);
      await liftMotionSuppression(page);
      const ctx = { route: "/queries", size: `${vp.width}`, state: "closed" };
      const tile = await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>('[data-shell="switcher"] > button')!;
        const cov = b.querySelector<HTMLElement>("[data-cover]");
        const r = b.getBoundingClientRect();
        return { aria: b.getAttribute("aria-label"), title: b.querySelector(".ws-ms-t")?.textContent ?? "",
          standing: b.querySelector('[data-ms="standing"]')?.textContent ?? null,
          cover: cov?.getAttribute("data-cover") ?? null, coverSvg: !!cov?.querySelector("svg"), coverBg: cov ? getComputedStyle(cov).backgroundColor : null,
          oMs: getComputedStyle(document.documentElement).getPropertyValue("--o-ms").trim(), h: r.height, w: r.width };
      });
      const hex = (h: string) => { const m = h.replace("#", ""); return `rgb(${parseInt(m.slice(0, 2), 16)}, ${parseInt(m.slice(2, 4), 16)}, ${parseInt(m.slice(4, 6), 16)})`; };
      L.check("S1 · the tile is 44 tall and at most 280 wide", ctx, Math.abs(tile.h - 44) <= 0.5 && tile.w <= 280.5, `${tile.h} × ${tile.w}`);
      L.check("S1 · the full title is in the accessible name", ctx, tile.aria === `Manuscript: ${tile.title}` && tile.title.length > 0, `${tile.aria} / ${tile.title}`);
      const st = tile.standing ?? "";
      const [statusPart, withPart] = st.split(" · ");
      L.check("S1 · the second line is the status, then 'N with you' when there are live queries", ctx,
        STATUSES.includes(statusPart) && (withPart === undefined || /^\d+ with you$/.test(withPart)), JSON.stringify(st));
      /* S2 · the tile's cover */
      L.check("S2 · no coverUrl: a tile in --o-ms, no book-outline icon", ctx, tile.cover === "tile" && !tile.coverSvg && tile.coverBg === hex(tile.oMs), `${tile.cover} svg ${tile.coverSvg} bg ${tile.coverBg} vs ${tile.oMs}`);

      await page.locator(TILE).first().click();
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const menu = document.querySelector<HTMLElement>(".ws-ms-menu")!;
        const kids = [...menu.children];
        const heads = kids.filter((k) => k.classList.contains("ws-ms-h")).map((k) => k.textContent?.trim());
        const shelvedAt = kids.findIndex((k) => k.getAttribute("data-ms") === "shelved-h");
        const rows = kids.map((k, i) => ({ k, i })).filter(({ k }) => k.matches(".ws-ms-it")).map(({ k, i }) => ({
          i, title: k.querySelector(".ws-ms-t")?.textContent ?? "", meta: k.querySelector('[data-ms="meta"]')?.textContent ?? null,
          facts: k.querySelector('[data-ms="facts"]')?.textContent ?? "", shelved: k.classList.contains("ws-ms-it--shelved"),
          checked: k.getAttribute("aria-checked"), opacity: getComputedStyle(k.querySelector(".ws-ms-tx")!).opacity,
        }));
        const r = menu.getBoundingClientRect(); const t = document.querySelector('[data-shell="switcher"] > button')!.getBoundingClientRect();
        return { heads, shelvedAt, rows, menuW: r.width, dy: r.top - t.bottom, dr: r.right - t.right, text: menu.textContent ?? "" };
      });
      const cm = { ...ctx, state: "open" };
      L.check("S3 · the menu is 340 wide, 8 below the tile, anchored to its right", cm, Math.abs(m.menuW - 340) <= 0.5 && Math.abs(m.dy - 8) <= 0.5 && Math.abs(m.dr) <= 0.5, `w ${m.menuW} dy ${m.dy} dr ${m.dr}`);
      L.check("S3 · 'YOUR MANUSCRIPTS' heads the list", cm, m.heads[0] === "YOUR MANUSCRIPTS", JSON.stringify(m.heads));
      L.check("S3 · '0 words' never appears", cm, !/\b0 words\b/.test(m.text), "");
      L.check("S3 · every row states its facts line", cm, m.rows.length > 1 && m.rows.every((r) => r.facts.length > 0 && (/^(Querying since .+ · \d+ quer(y|ies)|\d+ quer(y|ies)|No queries yet)$/.test(r.facts))), JSON.stringify(m.rows.map((r) => r.facts)));
      const shelvedRows = m.rows.filter((r) => r.shelved);
      L.check("S3 · population: at least one shelved book, under a SHELVED heading", cm, shelvedRows.length >= 1 && m.shelvedAt >= 0, `shelved ${shelvedRows.length} heading at ${m.shelvedAt}`);
      L.check("S3 · shelved books sit under SHELVED and nowhere else", cm, m.rows.every((r) => (r.i > m.shelvedAt) === r.shelved), JSON.stringify(m.rows.map((r) => [r.i, r.shelved])));
      L.check("S3 · shelved rows are faded to 60%", cm, shelvedRows.every((r) => r.opacity === "0.6"), JSON.stringify(shelvedRows.map((r) => r.opacity)));
      L.check("S3 · exactly one aria-checked='true', and it is the tile's book", cm, m.rows.filter((r) => r.checked === "true").length === 1 && m.rows.find((r) => r.checked === "true")?.title === tile.title, JSON.stringify(m.rows.map((r) => r.checked)));
      const act = m.rows.find((r) => r.checked === "true");
      L.check("S1 · the tile's second line is not the genre or word count (they are in the menu)", ctx, !!act && (act.meta === null || !st.includes(act.meta.split(" · ")[0])) && !/words/i.test(st), `tile ${st} / row meta ${act?.meta}`);
    } finally {
      execFileSync("node", ["tests/e2e/seedSwitcherShelved.mjs", "--restore"], { stdio: "inherit" });
    }
    L.write();
    expect(L.rows.length).toBeGreaterThanOrEqual(13);
    expect(L.failures().map((f) => `${f.lock} · ${f.size} ${f.state} — ${f.detail}`)).toEqual([]);
  });
}

test("S4 · the keys", async ({ page }) => {
  const L = new Ledger("sw-keys");
  for (const vp of SIZES) {
    const ctx = { route: "/queries", size: `${vp.width}`, state: "keys" };
    await openApp(page, "/queries", vp);
    const tile = page.locator(TILE).first();
    for (const key of ["Enter", " ", "ArrowDown"] as const) {
      await tile.focus();
      await page.keyboard.press(key === " " ? "Space" : key);
      await page.waitForTimeout(150);
      const f = await focused(page);
      L.check(`S4 · ${key === " " ? "Space" : key} opens, with focus on the active book`, ctx, (await menuOpen(page)) && f.checked === "true", JSON.stringify(f));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      const g = await focused(page);
      L.check(`S4 · Escape closes and returns focus to the tile (after ${key === " " ? "Space" : key})`, ctx, !(await menuOpen(page)) && g.isTile, JSON.stringify(g));
    }
    await tile.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(150);
    const n = await page.locator('.ws-ms-menu [role="menuitemradio"], .ws-ms-menu [role="menuitem"]').count();
    await page.keyboard.press("Home"); const first = await focused(page);
    await page.keyboard.press("ArrowUp"); const wrapUp = await focused(page);
    await page.keyboard.press("End"); const last = await focused(page);
    await page.keyboard.press("ArrowDown"); const wrapDown = await focused(page);
    L.check("S4 · Home is the first item, End the last", ctx, first.inMenu && last.inMenu && first.text !== last.text && n >= 3, `${first.text} / ${last.text} of ${n}`);
    L.check("S4 · ↑ from the first wraps to the last", ctx, wrapUp.text === last.text, `${wrapUp.text} vs ${last.text}`);
    L.check("S4 · ↓ from the last wraps to the first", ctx, wrapDown.text === first.text, `${wrapDown.text} vs ${first.text}`);
    await page.keyboard.press("Tab"); await page.waitForTimeout(150);
    const t = await focused(page);
    L.check("S4 · Tab closes without trapping focus", ctx, !(await menuOpen(page)) && !t.inMenu, JSON.stringify(t));
  }
  L.write();
  expect(L.rows.length).toBe(SIZES.length * 10);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

test("S5 · M opens the menu from the page, and nowhere it should not", async ({ page }) => {
  const L = new Ledger("sw-m");
  for (const vp of SIZES) {
    const ctx = { route: "/agents", size: `${vp.width}`, state: "M" };
    await openApp(page, "/agents", vp);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("m"); await page.waitForTimeout(150);
    const f = await focused(page);
    L.check("S5 · M from the page opens it, focus on the active book", ctx, (await menuOpen(page)) && f.checked === "true", JSON.stringify(f));
    await page.keyboard.press("Escape"); await page.waitForTimeout(100);
    /* an input: the page's own find field */
    const find = page.locator('.aglist input, [data-clv="find"] input, input[placeholder*="Find"]').filter({ visible: true }).first();
    await find.click(); await page.keyboard.press("m"); await page.waitForTimeout(150);
    L.check("S5 · M in an input does nothing", ctx, !(await menuOpen(page)), "");
    await find.fill("");
    /* a textarea, placed on the page for the probe — the guard is by element kind */
    await page.evaluate(() => { const t = document.createElement("textarea"); t.id = "sw-probe-ta"; t.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9999"; document.body.appendChild(t); t.focus(); });
    await page.keyboard.press("m"); await page.waitForTimeout(150);
    L.check("S5 · M in a textarea does nothing", ctx, !(await menuOpen(page)), "");
    await page.evaluate(() => document.getElementById("sw-probe-ta")?.remove());
    /* an open modal: the real add card, focus on its close button (not a field).
       v12 P2 (3 Oct): the "Paste a link" secondary retired with the quick-add — the SAME card
       opens from the primary now. */
    await page.locator('[data-probe="page-header"] .ph-primary').filter({ hasText: "+ Add an agent" }).first().click();
    /* (Agent card v1 P3: the add card is the agent card's editor, opened empty; its ✕ is the band's) */
    await page.locator('[data-ac="card"] [data-ae-mode="new"]').waitFor({ state: "visible", timeout: 5000 });
    await page.locator('[data-ac="card"] [data-ac="close"]').focus();
    await page.keyboard.press("m"); await page.waitForTimeout(150);
    L.check("S5 · M with a modal open does nothing", ctx, !(await menuOpen(page)), "");
    await page.locator('[data-ac="card"] [data-ac="close"]').click();
    await page.locator('[data-ac="card"]').waitFor({ state: "detached", timeout: 5000 });
  }
  L.write();
  expect(L.rows.length).toBe(SIZES.length * 4);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

test("S6 · switching: the key, the toast and the entrance; the active book is only a close", async ({ page }) => {
  const L = new Ledger("sw-switch");
  const ctx = { route: "/queries", size: "1440", state: "switch" };
  await openApp(page, "/queries", { width: 1440, height: 900 });
  const original = await page.evaluate((k) => localStorage.getItem(k), KEY);
  try {
    /* the replay is watched from BEFORE the click: a class that comes and goes in 180ms is missed by any poll */
    const arm = () => page.evaluate(() => {
      (window as unknown as { __swReplay: number }).__swReplay = 0;
      const mo = new MutationObserver((ms) => { for (const m of ms) if ((m.target as HTMLElement).classList?.contains("stage-page-on")) (window as unknown as { __swReplay: number }).__swReplay++; });
      mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
      (window as unknown as { __swMo: MutationObserver }).__swMo = mo;
    });
    const replays = () => page.evaluate(() => { (window as unknown as { __swMo: MutationObserver }).__swMo.disconnect(); return (window as unknown as { __swReplay: number }).__swReplay; });
    const toastText = () => page.evaluate(() => [...document.querySelectorAll(".sa-toast")].map((t) => t.textContent ?? "").join(" | "));

    await page.locator(TILE).first().click(); await page.waitForTimeout(200);
    const target = page.locator(".ws-ms-it").filter({ hasNot: page.locator(".ws-ms-ck") }).first();
    const targetTitle = (await target.locator(".ws-ms-t").textContent()) ?? "";
    await arm();
    await target.click();
    await page.waitForTimeout(400);
    const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
    const n = await replays();
    const toast = await toastText();
    L.check("S6 · picking another book writes the shared key", ctx, !!stored && stored !== original, `${original} → ${stored}`);
    L.check("S6 · …shows 'Now showing {title}'", ctx, toast.includes(`Now showing ${targetTitle}`), toast);
    L.check("S6 · …and replays the stage page's entrance", ctx, n > 0, `${n} class changes to stage-page-on`);
    await page.waitForTimeout(6500); // let that toast expire
    await page.locator(TILE).first().click(); await page.waitForTimeout(200);
    await arm();
    await page.locator('.ws-ms-it[aria-checked="true"]').click();
    await page.waitForTimeout(600);
    const n2 = await replays();
    L.check("S6 · picking the active book closes the menu, with no toast", ctx, !(await menuOpen(page)) && !(await toastText()).includes("Now showing"), await toastText());
    L.check("S6 · …and no entrance", ctx, n2 === 0, `${n2}`);
  } finally {
    await page.evaluate(([k, v]) => { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); }, [KEY, original] as const);
  }
  L.write();
  expect(L.rows.length).toBe(5);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

test("S8 · motion: stated durations, instant under reduced motion", async ({ browser }) => {
  const L = new Ledger("sw-motion");
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    const cx = await browser.newContext({ reducedMotion, storageState: "tests/e2e/.auth/state.json" });
    const page = await cx.newPage();
    await openApp(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await page.evaluate(() => {
      const d = (sel: string) => getComputedStyle(document.querySelector(sel)!).transitionDuration;
      return { menu: d(".ws-ms-menu"), chev: d(".ws-ms-chev") };
    });
    const c = { route: "/queries", size: "1440", state: reducedMotion };
    if (reducedMotion === "reduce") {
      const instant = (s: string) => s.split(",").every((x) => parseFloat(x) <= 0.00001);
      L.check("S8 · reduce: the menu's transitions are instant", c, instant(r.menu), r.menu);
      L.check("S8 · reduce: the chevron's turn is instant", c, instant(r.chev), r.chev);
    } else {
      L.check("S8 · no preference: the menu fades 0.16s and drops 0.18s", c, /^0\.16s, 0\.18s/.test(r.menu), r.menu);
      L.check("S8 · no preference: the chevron turns over 0.2s", c, r.chev === "0.2s", r.chev);
    }
    await cx.close();
  }
  L.write();
  expect(L.rows.length).toBe(4);
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
});

test("S7 · the shortcuts sheet: ? and the Help centre open it, and it lists the registry", async ({ page }) => {
  const L = new Ledger("sw-sheet");
  const ids = Object.keys(SHORTCUTS) as ShortcutId[];
  const sheetOpen = () => page.evaluate(() => !!document.querySelector('[data-shell="shortcuts"]'));
  for (const vp of SIZES) {
    const ctx = { route: "/queries", size: `${vp.width}`, state: "sheet" };
    await openApp(page, "/queries", vp);
    const tile = page.locator(TILE).first();
    await tile.focus();
    await page.keyboard.press("Shift+Slash"); await page.waitForTimeout(250);
    L.check("S7 · ? opens the sheet", ctx, await sheetOpen(), "");
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-shell="shortcuts"] [data-shortcut]')].map((r) => ({
      id: r.dataset.shortcut ?? "", label: r.querySelector(".sks-label")?.textContent ?? "", caps: [...r.querySelectorAll(".sks-cap")].map((c) => c.textContent ?? ""),
      scope: (r.closest("[data-scope]") as HTMLElement | null)?.dataset.scope ?? "" })));
    const mac = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ""));
    L.check("S7 · every registry entry is listed once, and nothing else is", ctx, rows.length === ids.length && ids.every((id) => rows.filter((r) => r.id === id).length === 1), `${rows.length} rows / ${ids.length} entries`);
    const wrong = rows.filter((r) => {
      const sc = SHORTCUTS[r.id as ShortcutId]; if (!sc) return true;
      const want = r.id === "taskChoice" ? [`${keycaps(sc.chords[0], mac)[0]}–${keycaps(sc.chords[1], mac)[0]}`] : sc.chords.flatMap((c) => keycaps(c, mac));
      return r.label !== sc.label || r.scope !== sc.scope || JSON.stringify(r.caps) !== JSON.stringify(want);
    });
    L.check("S7 · each row's label, scope and keycaps are the registry's", ctx, wrong.length === 0, JSON.stringify(wrong.slice(0, 3)));
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    const back = await focused(page);
    L.check("S7 · Escape closes it and focus returns to where it was", ctx, !(await sheetOpen()) && back.isTile, JSON.stringify(back));
    await page.evaluate(() => { const t = document.createElement("input"); t.id = "sw-probe-in"; t.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9999"; document.body.appendChild(t); t.focus(); });
    await page.keyboard.press("Shift+Slash"); await page.waitForTimeout(200);
    L.check("S7 · ? in a field does nothing", ctx, !(await sheetOpen()), "");
    await page.evaluate(() => document.getElementById("sw-probe-in")?.remove());
  }
  await openApp(page, "/help", { width: 1440, height: 900 });
  await page.locator('[data-probe="page-header"] .ph-secondary').filter({ hasText: "Keyboard shortcuts" }).first().click();
  await page.waitForTimeout(250);
  L.check("S7 · the Help centre's 'Keyboard shortcuts' opens it", { route: "/help", size: "1440", state: "sheet" }, await sheetOpen(), "");
  await page.keyboard.press("Escape");
  L.write();
  expect(L.rows.length).toBe(SIZES.length * 5 + 1);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} — ${f.detail}`)).toEqual([]);
});

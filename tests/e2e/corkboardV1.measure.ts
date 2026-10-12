/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CB1 — the Corkboard v1 locks (ref design-refs/corkboard-v4/corkboard-v4.html), measured on the rendered page
 * with the shell at 1512 × 900 and 1280 × 800.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:4611 npx playwright test corkboardV1 --project=measure
 *
 * ⚠️ RED FIRST: every lock was run against the build WITHOUT the pack (9fc11a2a) and against its named
 *    mutation; the readings are in reports/corkboard-v1/REDFIRST.md and mutation-proofs.jsonl.
 * ⚠️ THE FIXTURE IS `cbseed-*` (see cbLib). Cases that write preferences snapshot `todoPrefs.noteboard` first
 *    and put it back in the same run; cases that write a document remove it in the same run.
 */
import { test, expect } from "@playwright/test";
import { Ledger, OLD_ROUTE, PREFIX, ROUTE, SIZES, inPage, near, open, only, readHeader, readNotes, readableText, sz, writesDuring } from "./cbLib";

test.describe("CB1 · Part A — the name and the route", () => {
  test("A1 name: nothing a writer can read says Noteboard; the sidebar row and the tab read Corkboard and are current", async ({ page }) => {
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = `${ROUTE} ${sz(vp)}`;
      const text = await readableText(page);
      L.check("A1", where, text.length > 400, `the page rendered words to read (${text.length} chars)`);
      const hit = /note\s?board/i.exec(text);
      L.check("A1", where, !hit, hit ? `a writer can read "${text.slice(Math.max(0, hit.index - 40), hit.index + 50).replace(/\s+/g, " ")}"` : "no Noteboard");
      const nav = await page.evaluate(() => {
        const cur = [...document.querySelectorAll('.ws-nav .ws-ni[aria-current="page"]')].map((e) => e.getAttribute("aria-label"));
        const tab = [...document.querySelectorAll('[data-shell="tab"] [data-page-name]')].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).map((e) => (e.textContent || "").trim());
        const rows = [...document.querySelectorAll(".ws-nav .ws-ni")].map((e) => e.getAttribute("aria-label"));
        return { cur, tab, rows };
      });
      L.check("A1", where, nav.cur.length === 1 && nav.cur[0] === "Corkboard", `the current sidebar row is ${JSON.stringify(nav.cur)}`);
      L.check("A1", where, nav.tab.length === 1 && nav.tab[0] === "Corkboard", `the folder tab reads ${JSON.stringify(nav.tab)}`);
      L.check("A1", where, nav.rows.includes("Corkboard") && !nav.rows.some((r) => /noteboard/i.test(r || "")), `sidebar rows ${JSON.stringify(nav.rows)}`);
      L.check("A1", where, new URL(page.url()).pathname === ROUTE, `the address is ${new URL(page.url()).pathname}`);
    }
    /* the To-do list's desk carries the one link to this page */
    await open(page, "/todo", SIZES[0]);
    const todo = await readableText(page);
    const link = await page.locator('[data-todo-v2="noteboard-link"]:visible').first().innerText().catch(() => "");
    L.check("A1", "/todo desk", /Open the Corkboard/.test(link), `the desk's link reads "${link.trim()}"`);
    const hit = /note\s?board/i.exec(todo);
    L.check("A1", "/todo", !hit, hit ? `a writer can read "${todo.slice(Math.max(0, hit.index - 40), hit.index + 50).replace(/\s+/g, " ")}"` : "no Noteboard");
    L.done(14);
  });

  test("A2 route: /todo/noteboard?q=x lands on /todo/corkboard?q=x and renders the board", async ({ page }) => {
    const L = new Ledger("A2");
    await only(page, "cbseed-");
    for (const vp of SIZES) {
      await open(page, `${OLD_ROUTE}?q=x`, vp);
      const where = `${OLD_ROUTE}?q=x ${sz(vp)}`;
      const u = new URL(page.url());
      L.check("A2", where, u.pathname === ROUTE, `landed on ${u.pathname}`);
      L.check("A2", where, u.search === "?q=x", `the query string is "${u.search}"`);
      const seen = await page.evaluate(() => [...document.querySelectorAll(".nb-scope.tdb-wrap")].filter((e) => e.getBoundingClientRect().height > 0).length);
      L.check("A2", where, seen === 1, `${seen} visible board page(s)`);
      const cur = await page.evaluate(() => [...document.querySelectorAll('.ws-nav .ws-ni[aria-current="page"]')].map((e) => e.getAttribute("aria-label")));
      L.check("A2", where, cur.length === 1 && cur[0] === "Corkboard", `the current sidebar row is ${JSON.stringify(cur)}`);
    }
    L.done(8);
  });
});

test.describe("CB1 · Part B — the header and the add bar", () => {
  test("B1 header: the navy number panel counts the board (8, then 1), unfiltered, and holds no button", async ({ page }) => {
    const L = new Ledger("B1");
    await only(page, PREFIX);
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = `8 notes ${sz(vp)}`;
      const notes = await readNotes(page);
      L.check("B1", where, notes.length === 8, `the fixture put ${notes.length} notes on the board`);
      const h = await readHeader(page);
      L.check("B1", where, !!h && h.kind === "number" && h.living === "settled", `the header is ${h ? `${h.kind}/${h.living}` : "absent"}`);
      L.check("B1", where, h?.bg === "rgb(45, 58, 80)", `the panel is ${h?.bg}`);
      L.check("B1", where, h?.number === "8", `the number reads "${h?.number}"`);
      L.check("B1", where, h?.words === "notes pinned to your corkboard", `the words read "${h?.words}"`);
      L.check("B1", where, h?.name === "8 notes pinned to your corkboard", `the title is named "${h?.name}"`);
      L.check("B1", where, h?.sub === "Notes to self and your own tasks, kept in one place.", `the subline reads "${h?.sub}"`);
      L.check("B1", where, h?.buttons === 0, `the panel holds ${h?.buttons} button(s)`);
      L.check("B1", where, h?.art === "corkboard-header", `the drawing's slot is ${h?.art}`);
      /* the count is the BOARD's: a chip and a search narrow what is bright, never what is counted */
      await page.locator(inPage('[data-cb-chip="cbseed-tag-manuscript"]')).click();
      await page.locator(inPage(".cb-find")).fill("title");
      await page.waitForTimeout(300);
      const f = await readHeader(page);
      L.check("B1", `${where} · filtered`, f?.number === "8", `with a chip and a search on, the number reads "${f?.number}"`);
    }
    /* one note: the singular */
    await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SA_CB_ONLY = "cbseed-n1"; });
    await open(page, ROUTE, SIZES[0]);
    const one = await readHeader(page);
    const n = (await readNotes(page)).length;
    L.check("B1", "1 note", n === 1, `the fixture put ${n} note(s) on the board`);
    L.check("B1", "1 note", one?.number === "1", `the number reads "${one?.number}"`);
    L.check("B1", "1 note", one?.words === "note pinned to your corkboard", `the words read "${one?.words}"`);
    L.done(23);
  });

  test("B2 add bar: three paper buttons; pink opens the composer in pink; Task opens the To-do list's composer and writes nothing", async ({ page }) => {
    const L = new Ledger("B2");
    await only(page, PREFIX);
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const pads = await page.locator(inPage('[data-cb="pads"] button')).evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("aria-label"), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
      L.check("B2", where, pads.length === 3, `the Note control holds ${pads.length} button(s)`);
      L.check("B2", where, JSON.stringify(pads.map((p) => p.name)) === JSON.stringify(["Pin a yellow note", "Pin a pink note", "Pin a sage note"]), `they are named ${JSON.stringify(pads.map((p) => p.name))}`);
      L.check("B2", where, pads.every((p) => near(p.w, 22, 0.5) && near(p.h, 22, 0.5)), `their boxes are ${pads.map((p) => `${p.w}×${p.h}`).join(", ")}`);
      const bar = await page.locator(inPage('[data-cb="addrow"]')).evaluate((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopColor}`, radius: cs.borderTopLeftRadius, pad: cs.padding, label: (e.querySelector(".cb-addlab")?.textContent ?? "").trim() }; });
      L.check("B2", where, bar.label === "Add to your board", `the bar's label reads "${bar.label}"`);
      L.check("B2", where, bar.bg === "rgb(251, 249, 245)" && bar.border === "1px rgb(221, 214, 202)" && bar.radius === "12px" && bar.pad === "7px 9px 7px 16px", `the bar is ${bar.bg}, ${bar.border}, radius ${bar.radius}, padding ${bar.pad}`);
      /* pink → the built compose editor, with pink chosen, and nothing written by opening it */
      const w1 = await writesDuring(page, async () => { await page.locator(inPage('[data-cb-pad="pink"]')).click(); }, 900);
      const comp = await page.locator(inPage(".nb-compose")).evaluateAll((els) => els.map((e) => ({ cls: e.className, on: [...e.querySelectorAll('.nb-sw[aria-pressed="true"]')].map((b) => b.getAttribute("aria-label")), ta: !!e.querySelector("textarea") })));
      L.check("B2", where, comp.length === 1 && comp[0].ta, `${comp.length} compose editor(s) open`);
      L.check("B2", where, comp.length === 1 && /\bnb-c-pink\b/.test(comp[0].cls) && JSON.stringify(comp[0].on) === '["pink"]', `the editor's paper is ${comp[0]?.cls} with ${JSON.stringify(comp[0]?.on)} pressed`);
      L.check("B2", where, w1.length === 0, `opening the editor made ${w1.length} write(s)`);
      await page.keyboard.press("Escape");
      /* Task → the To-do list's own composer, in task mode; nothing is written until it is saved */
      const w2 = await writesDuring(page, async () => {
        await page.locator(inPage('[data-cb="add-task"]')).click();
        await page.waitForURL(/\/todo$/, { timeout: 10_000 }).catch(() => {});
      }, 1800);
      L.check("B2", where, new URL(page.url()).pathname === "/todo", `Task landed on ${new URL(page.url()).pathname}`);
      const tc = await page.locator(".tdb-nc:visible").evaluateAll((els) => els.map((e) => ({ cls: e.className, task: e.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? "" })));
      L.check("B2", where, tc.length === 1 && /tdb-nc--task/.test(tc[0].cls), `the own-task composer is ${tc.length ? tc[0].cls : "not open"} (${tc[0]?.task ?? ""})`);
      L.check("B2", where, w2.length === 0, `pressing Task made ${w2.length} write(s): ${w2[0]?.slice(0, 160) ?? ""}`);
      await page.keyboard.press("Escape");
    }
    L.done(20);
  });

  test("B3 filter: a tag chip fades, it does not hide — every note stays mounted, non-matches at 0.22, the count unchanged", async ({ page }) => {
    const L = new Ledger("B3");
    await only(page, PREFIX);
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const before = await readNotes(page);
      const hb = await readHeader(page);
      L.check("B3", where, before.length === 8 && before.every((n) => n.opacity === 1), `${before.length} notes at rest, opacities ${[...new Set(before.map((n) => n.opacity))].join("/")}`);
      const chips = await page.locator(inPage(".cb-chip[data-cb-chip]")).evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-cb-chip"), text: (e.textContent ?? "").replace(/\s+/g, " ").trim(), pressed: e.getAttribute("aria-pressed"), bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color })));
      L.check("B3", where, JSON.stringify(chips.map((c) => c.text)) === JSON.stringify(["All 8", "#agents 1", "#comps 1", "#manuscript 2", "#synopsis 1"]), `the chips read ${JSON.stringify(chips.map((c) => c.text))}`);
      await page.locator(inPage('[data-cb-chip="cbseed-tag-manuscript"]')).click();
      await page.waitForTimeout(350);
      const after = await readNotes(page);
      const ha = await readHeader(page);
      const want = new Set(["cbseed-n6", "cbseed-n8"]);
      L.check("B3", where, after.length === 8, `${after.length} notes mounted with the chip on`);
      const dim = after.filter((n) => !want.has(n.id)), lit = after.filter((n) => want.has(n.id));
      L.check("B3", where, dim.length === 6 && dim.every((n) => near(n.opacity, 0.22, 0.02)), `non-matching opacities ${dim.map((n) => n.opacity).join(",")}`);
      L.check("B3", where, lit.length === 2 && lit.every((n) => n.opacity === 1), `matching opacities ${lit.map((n) => n.opacity).join(",")}`);
      L.check("B3", where, after.every((n) => { const b = before.find((x) => x.id === n.id); return !!b && near(n.x, b.x, 1) && near(n.y, b.y, 1); }), "no note moved when the chip went on");
      L.check("B3", where, ha?.number === hb?.number && ha?.number === "8", `the header reads "${ha?.number}" (was "${hb?.number}")`);
      const pressed = await page.locator(inPage('[data-cb-chip="cbseed-tag-manuscript"]')).evaluate((e) => ({ p: e.getAttribute("aria-pressed"), bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color }));
      L.check("B3", where, pressed.p === "true" && pressed.bg === "rgb(45, 58, 80)" && pressed.fg === "rgb(246, 239, 226)", `the pressed chip is ${pressed.bg} on ${pressed.fg}`);
      const label = await page.locator(inPage('[data-cb="fcount"]')).innerText().catch(() => "");
      L.check("B3", where, label.trim().toLowerCase() === "2 of 8 notes", `the label reads "${label.trim()}"`);
      /* the find box fades too */
      await page.locator(inPage('[data-cb-chip="all"]')).click();
      await page.locator(inPage(".cb-find")).fill("PRIYA");
      await page.waitForTimeout(350);
      const found = await readNotes(page);
      L.check("B3", where, found.length === 8 && found.filter((n) => n.opacity === 1).map((n) => n.id).join() === "cbseed-n2", `"PRIYA" leaves ${found.filter((n) => n.opacity === 1).map((n) => n.id).join()} bright of ${found.length}`);
    }
    L.done(20);
  });
});

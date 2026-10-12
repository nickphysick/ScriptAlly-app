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
import { existsSync, mkdirSync } from "node:fs";
import { DIR, Ledger, canon, OLD_ROUTE, PREFIX, ROUTE, SIZES, dragItem, inPage, near, open, only, readBoard, readHeader, readNotes, readableText, sz, writesDuring } from "./cbLib";
import * as store from "./cbStore";
import { arrange } from "../../src/lib/corkboard";
import { reorderIds } from "../../src/lib/noteboard";
import { noteMenu } from "../../src/lib/todoMenu";

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

/* ───────────────────────────────────────────────────────────────────────────────────────────────
   Part C — the board. These cases WRITE the board's preferences (`todoPrefs.noteboard`), so each starts from
   the snapshot taken before the suite and puts it back when it ends, pass or fail.
   ─────────────────────────────────────────────────────────────────────────────────────────────── */
const SNAP = "tests/e2e/.auth/cb-prefs-snapshot.json"; // gitignored, beside the saved session
const prefs = () => store.prefs();
const rot = (m: { deg: number }) => Math.abs(m.deg);

test.describe("CB1 · Part C — the board", () => {
  /* ⚠️ THE SNAPSHOT IS TAKEN ONCE AND KEPT (it is not re-taken while the file exists): a run that died before
     its clean-up must not record its own residue as "how the account was". Delete the file to re-take it. */
  test.beforeAll(async () => { mkdirSync(DIR, { recursive: true }); if (!existsSync(SNAP)) await store.snap(SNAP); });
  test.beforeEach(async () => { await store.restore(SNAP); });
  test.afterEach(async () => { await store.restore(SNAP); });

  test("C1 board: cork under two noise layers in a 9px oak frame, the column wide, at least 790 inside", async ({ page }) => {
    const L = new Ledger("C1");
    await only(page, PREFIX);
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const b = await readBoard(page);
      L.check("C1", where, !!b, "the board is on the page");
      if (!b) continue;
      L.check("C1", where, b.bg === "rgb(185, 137, 90)", `the board's colour is ${b.bg}`);
      L.check("C1", where, b.images === 2, `${b.images} background image(s)`);
      L.check("C1", where, b.border === "9px solid rgb(228, 214, 189)", `the frame is ${b.border}`);
      L.check("C1", where, b.radius === "8px", `the frame's radius is ${b.radius}`);
      L.check("C1", where, /rgb\(191, 174, 144\) 0px 0px 0px 1px inset/.test(b.shadow) && /rgba\(40, 25, 10, 0\.3\) 0px 4px 14px 0px inset/.test(b.shadow) && /rgba\(40, 25, 10, 0\.28\) 0px 12px 20px -6px/.test(b.shadow), `the frame's shadows are ${b.shadow}`);
      L.check("C1", where, !!b.header && near(b.board.x, b.header.x, 1) && near(b.board.w, b.header.w, 1), `the board spans ${b.board.x}+${b.board.w}; the column (the header) ${b.header?.x}+${b.header?.w}`);
      L.check("C1", where, b.pinsInner.h >= 790, `the board is ${b.pinsInner.h} tall inside`);
      const lowest = Math.max(...b.items.map((i) => i.top + i.h));
      L.check("C1", where, b.items.length === 8 && b.pinsInner.h >= lowest + 59, `the lowest item ends at ${lowest}; the board is ${b.pinsInner.h} inside`);
      /* the row (it wraps when the column is narrower than its two halves): 22 under the panel, 14 above the board */
      L.check("C1", where, !!b.over && near(b.board.y - (b.over.y + b.over.h), 14, 1), `the board starts ${b.over ? (b.board.y - (b.over.y + b.over.h)).toFixed(1) : "?"} under the row`);
      L.check("C1", where, !!b.over && !!b.header && near(b.over.y - (b.header.y + b.header.h), 22, 1), `the row starts ${b.over && b.header ? (b.over.y - (b.header.y + b.header.h)).toFixed(1) : "?"} under the panel (header margin ${b.headerMb}, row margin ${b.overMt})`);
    }
    L.done(22);
  });

  test("C2 note dress: one pin or one tape each, a tilt within ±2.6° that is the same on every render, flat paper", async ({ page }) => {
    const L = new Ledger("C2");
    await only(page, PREFIX);
    const seen: Record<string, string>[] = [];
    for (const vp of [SIZES[0], SIZES[0], SIZES[1]]) {
      await open(page, ROUTE, vp);
      const where = `${sz(vp)} · render ${seen.length + 1}`;
      const b = await readBoard(page);
      const notes = (b?.items ?? []).filter((i) => i.note);
      L.check("C2", where, notes.length === 8, `${notes.length} notes on the board`);
      L.check("C2", where, notes.every((n) => n.pins + n.tapes === 1), `fixings per note: ${notes.map((n) => n.pins + n.tapes).join("")}`);
      L.check("C2", where, notes.every((n) => rot(n) <= 2.6) , `tilts ${notes.map((n) => n.deg).join(", ")}`);
      L.check("C2", where, notes.every((n) => n.bgImage === "none"), `paper images: ${[...new Set(notes.map((n) => n.bgImage))].join(" | ").slice(0, 80)}`);
      L.check("C2", where, notes.every((n) => n.w === 204), `widths ${[...new Set(notes.map((n) => n.w))].join("/")}`);
      L.check("C2", where, notes.every((n) => n.font === "Caveat 21px"), `body faces ${[...new Set(notes.map((n) => n.font))].join("/")}`);
      L.check("C2", where, notes.every((n) => /rgba\(40, 25, 10, 0\.22\) 0px 1px 1px 0px, rgba\(40, 25, 10, 0\.42\) 0px 12px 14px -7px/.test(n.shadow)), `shadows ${[...new Set(notes.map((n) => n.shadow))].join(" | ").slice(0, 120)}`);
      seen.push(Object.fromEntries(notes.map((n) => [n.note!, `${n.deg}|${n.pins ? `pin ${n.pc}` : "tape"}`])));
    }
    L.check("C2", "across renders", seen.length === 3 && JSON.stringify(seen[0]) === JSON.stringify(seen[1]) && JSON.stringify(seen[0]) === JSON.stringify(seen[2]), `render 1 ${JSON.stringify(seen[0])} · render 2 ${JSON.stringify(seen[1])}`);
    /* the monoculture check: a set of notes that all drew the same tilt or the same fixing proves nothing */
    const tilts = new Set(Object.values(seen[0] ?? {}).map((v) => v.split("|")[0])), fix = new Set(Object.values(seen[0] ?? {}).map((v) => v.split("|")[1].split(" ")[0]));
    L.check("C2", "variety", tilts.size >= 4 && fix.size === 2, `${tilts.size} distinct tilts; fixings seen: ${[...fix].join(", ")}`);
    L.done(23);
  });

  test("C3 drag saves: 300 right and 120 down, exactly one profile write holding layout[id], no task write, the same place after a reload", async ({ page }) => {
    const L = new Ledger("C3");
    await only(page, PREFIX);
    for (const vp of SIZES) {
      await store.restore(SNAP);
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const b0 = await readBoard(page);
      /* the top-left note has the room to travel */
      const start = (b0?.items ?? []).filter((i) => i.note).sort((p, q) => (p.left + p.top) - (q.left + q.top))[0];
      L.check("C3", where, !!start, "a note to drag");
      if (!start || !b0) continue;
      let midClass = "", midDeg = 99, midZ = 0;
      const writes = await writesDuring(page, async () => {
        const d = await dragItem(page, start.key, 300, 120);
        const mid = (await readBoard(page))!.items.find((i) => i.key === start.key)!;
        midClass = await page.locator(inPage(`[data-cb-item="${start.key}"]`)).getAttribute("class") ?? ""; midDeg = mid.deg; midZ = mid.z;
        await d.release();
      }, 1800);
      const after = (await readBoard(page))!.items.find((i) => i.key === start.key)!;
      L.check("C3", where, /\bcb-drag\b/.test(midClass) && midDeg === 0, `in the hand it is "${midClass.split(" ").filter((c) => c.startsWith("cb-")).join(" ")}" at ${midDeg}°`);
      L.check("C3", where, midZ > Math.max(...b0.items.filter((i) => i.key !== start.key).map((i) => i.z)), `in the hand its z-index is ${midZ}`);
      L.check("C3", where, near(after.box.x - start.box.x, 300, 2) && near(after.box.y - start.box.y, 120, 2), `it moved ${(after.box.x - start.box.x).toFixed(1)}, ${(after.box.y - start.box.y).toFixed(1)}`);
      L.check("C3", where, writes.length === 1, `${writes.length} write(s) for one drop`);
      const w = writes[0] ?? "";
      L.check("C3", where, w.includes(`todoPrefs.noteboard.layout.`) && w.includes(start.key) && /\/documents\/users\/[^/"]+"/.test(w), `the write is ${w.slice(0, 200)}`);
      L.check("C3", where, !/\/tasks\//.test(w), "it wrote no user task");
      const saved = (await prefs())?.layout?.[start.key];
      L.check("C3", where, !!saved && saved.x >= 0 && saved.x <= 1 && near(saved.x * b0.pinsInner.w, after.left, 1.5) && near(saved.y, after.top, 1), `saved ${JSON.stringify(saved)}; drawn at ${after.left}, ${after.top} on a board ${b0.pinsInner.w} wide`);
      L.check("C3", where, Object.keys((await prefs())?.layout ?? {}).length === 1, "the map holds one entry");
      await open(page, ROUTE, vp);
      const again = (await readBoard(page))!.items.find((i) => i.key === start.key)!;
      L.check("C3", where, near(again.box.x, after.box.x, 2) && near(again.box.y, after.box.y, 2), `after a reload it is at ${again.box.x.toFixed(1)}, ${again.box.y.toFixed(1)} (was ${after.box.x.toFixed(1)}, ${after.box.y.toFixed(1)})`);
      /* the keyboard: two presses are 32px, saved once, 600ms after the last key */
      const kw = await writesDuring(page, async () => {
        await page.locator(inPage(`[data-cb-item="${start.key}"]`)).focus();
        await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown");
      }, 1900);
      const keyed = (await readBoard(page))!.items.find((i) => i.key === start.key)!;
      L.check("C3", `${where} · keys`, keyed.left - again.left === 32 && keyed.top - again.top === 16, `three arrow keys moved it ${keyed.left - again.left}, ${keyed.top - again.top}`);
      L.check("C3", `${where} · keys`, kw.length === 1, `${kw.length} write(s) for one run of keys`);
    }
    L.done(22);
  });

  test("C4 stays inside: a note dragged past each edge ends inside the board; at 1024 wide a note saved at x 0.95 is inside", async ({ page }) => {
    const L = new Ledger("C4");
    await only(page, PREFIX);
    const inside = (i: { box: { x: number; y: number; w: number; h: number } }, p: { x: number; y: number; w: number; h: number }) => i.box.x >= p.x - 0.5 && i.box.y >= p.y - 0.5 && i.box.x + i.box.w <= p.x + p.w + 0.5 && i.box.y + i.box.h <= p.y + p.h + 0.5;
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const b0 = (await readBoard(page))!;
      const key = b0.items.filter((i) => i.note).sort((p, q) => p.top - q.top)[0].key;
      for (const [edge, dx, dy] of [["left", -3000, 0], ["top", 0, -3000], ["right", 3000, 0], ["bottom", 0, 3000]] as const) {
        const d = await dragItem(page, key, dx, dy); await d.release();
        const b = (await readBoard(page))!; const it = b.items.find((i) => i.key === key)!;
        L.check("C4", `${sz(vp)} · past the ${edge}`, inside(it, b.pins), `the note is at ${it.box.x.toFixed(0)},${it.box.y.toFixed(0)} ${it.box.w.toFixed(0)}×${it.box.h.toFixed(0)}; the board inside is ${b.pins.x.toFixed(0)},${b.pins.y.toFixed(0)} ${b.pins.w.toFixed(0)}×${b.pins.h.toFixed(0)}`);
        await page.mouse.move(10, 10);
      }
      await store.restore(SNAP);
    }
    await store.setLayout({ "cbseed-n1": { x: 0.95, y: 40 } });
    await open(page, ROUTE, { width: 1024, height: 768 });
    const b = (await readBoard(page))!; const it = b.items.find((i) => i.key === "cbseed-n1")!;
    L.check("C4", "1024 · x 0.95", b.view === "free" && inside(it, b.pins), `at 1024 the note is at ${it.box.x.toFixed(0)}+${it.box.w.toFixed(0)}; the board inside ends at ${(b.pins.x + b.pins.w).toFixed(0)} (${b.view})`);
    L.check("C4", "1024 · x 0.95", it.left + it.w > b.pinsInner.w - 40, `it is against the right edge (left ${it.left} of ${b.pinsInner.w})`);
    L.done(10);
  });

  test("C5 stale map: an entry for a missing id draws nothing and throws nothing; a note with no entry is on the board", async ({ page }) => {
    const L = new Ledger("C5");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await only(page, PREFIX);
    await store.setLayout({ "cbseed-ghost": { x: 0.5, y: 100 }, "cbseed-n2": { x: 0.1, y: 300 }, "not-on-this-board": { x: 0.2, y: 20 } });
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const b = await readBoard(page);
      L.check("C5", where, !!b, "the board rendered");
      if (!b) continue;
      const keys = b.items.map((i) => i.key);
      L.check("C5", where, !keys.includes("cbseed-ghost") && !keys.includes("not-on-this-board"), `items: ${keys.join(",")}`);
      L.check("C5", where, b.items.filter((i) => i.note).length === 8, `${b.items.filter((i) => i.note).length} notes drawn`);
      L.check("C5", where, keys.includes("cbseed-n3") && keys.includes("cbseed-n7"), "the notes the map never named are on the board");
      const n2 = b.items.find((i) => i.key === "cbseed-n2");
      L.check("C5", where, !!n2 && near(n2.left, 0.1 * b.pinsInner.w, 1.5) && n2.top === 300, `the note it does name is at ${n2?.left}, ${n2?.top}`);
      L.check("C5", where, (await readHeader(page))?.number === "8", "the header still counts 8");
    }
    L.check("C5", "errors", errors.length === 0, `page errors: ${errors.join(" | ").slice(0, 200) || "none"}`);
    L.done(13);
  });

  test("C6 tidy: straightens and flows the notes in the built order, writes view only; back restores every place; reorder writes order, not layout", async ({ page }) => {
    const L = new Ledger("C6");
    await only(page, PREFIX);
    const place = { "cbseed-n1": { x: 0.62, y: 410 }, "cbseed-n6": { x: 0.05, y: 520 }, "cbseed-n3": { x: 0.3, y: 96 } };
    for (const vp of SIZES) {
      await store.restore(SNAP); await store.setLayout(place);
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const free = (await readBoard(page))!;
      L.check("C6", where, free.view === "free" && free.items.some((i) => i.deg !== 0), `starts ${free.view}, tilts ${free.items.map((i) => i.deg).join(",")}`);
      const tidyBtn = page.locator(inPage('[data-cb="tidy"]'));
      L.check("C6", where, (await tidyBtn.innerText()).trim() === "Tidy into columns" && (await tidyBtn.getAttribute("aria-pressed")) === "false", `the chip reads "${(await tidyBtn.innerText()).trim()}"`);
      const w = await writesDuring(page, async () => { await tidyBtn.click(); }, 1500);
      const tidy = (await readBoard(page))!;
      L.check("C6", where, tidy.view === "tidy" && tidy.items.every((i) => i.deg === 0), `tidy tilts ${tidy.items.map((i) => i.deg).join(",")}`);
      L.check("C6", where, (await tidyBtn.innerText()).trim() === "Back to free pinning" && (await tidyBtn.getAttribute("aria-pressed")) === "true", `pressed, the chip reads "${(await tidyBtn.innerText()).trim()}"`);
      /* the built order, flowed: what `arrange` gives for these keys in DOM order at these measured sizes */
      const keys = tidy.items.map((i) => i.key);
      const want = arrange(keys, (k) => { const i = tidy.items.find((x) => x.key === k)!; return { w: i.w, h: i.h }; }, {}, tidy.pinsInner.w, "tidy");
      L.check("C6", where, tidy.items.every((i) => near(i.left, want.at[i.key].left, 1) && near(i.top, want.at[i.key].top, 1)), `places ${tidy.items.map((i) => `${i.left},${i.top}`).join(" ")} · the flow ${keys.map((k) => `${want.at[k].left},${want.at[k].top}`).join(" ")}`);
      const cols = [...new Set(tidy.items.map((i) => i.left))].sort((p, q) => p - q);
      L.check("C6", where, cols.length === want.columns && cols.length >= 2, `${cols.length} columns at ${cols.join(",")} (the flow has ${want.columns})`);
      L.check("C6", where, keys.slice(0, cols.length).every((k, n) => tidy.items.find((i) => i.key === k)!.left === cols[n] && tidy.items.find((i) => i.key === k)!.top === 30), "the first notes in the order head the columns, left to right");
      L.check("C6", where, w.length === 1 && /todoPrefs\.noteboard\.view/.test(w[0]) && !/noteboard\.layout/.test(w[0]), `tidy wrote ${w.length}: ${(w[0] ?? "").slice(0, 160)}`);
      const p1 = await prefs();
      L.check("C6", where, p1?.view === "tidy" && canon(p1?.layout) === canon(place), `prefs are view ${p1?.view}, layout ${JSON.stringify(p1?.layout)}`);
      /* drag-to-reorder in tidy: the first note onto the third. It writes `order` and leaves `layout` alone. */
      const from = keys[0], to = keys[2];
      const rw = await writesDuring(page, async () => {
        await page.locator(inPage(`[data-cb-item="${from}"] .nb-body`)).dragTo(page.locator(inPage(`[data-cb-item="${to}"] .nb-body`)));
      }, 1800);
      const p2 = await prefs();
      const orderNow = (await readBoard(page))!.items.map((i) => i.key);
      L.check("C6", `${where} · reorder`, rw.length === 1 && /todoPrefs\.noteboard\.order/.test(rw[0]) && !/noteboard\.layout/.test(rw[0]), `reorder wrote ${rw.length}: ${(rw[0] ?? "").slice(0, 160)}`);
      L.check("C6", `${where} · reorder`, canon(p2?.layout) === canon(place), `layout after the reorder ${JSON.stringify(p2?.layout)}`);
      L.check("C6", `${where} · reorder`, JSON.stringify(orderNow) === JSON.stringify(reorderIds(keys, from, to)) && JSON.stringify(p2?.order?.filter((k) => keys.includes(k))) === JSON.stringify(reorderIds(keys, from, to)), `the board reads ${orderNow.join(",")}`);
      /* back: every saved place is where it was */
      await tidyBtn.click(); await page.waitForTimeout(900);
      const back = (await readBoard(page))!;
      L.check("C6", `${where} · back`, back.view === "free" && Object.keys(place).every((k) => { const a = free.items.find((i) => i.key === k)!, z = back.items.find((i) => i.key === k)!; return near(z.box.x, a.box.x, 2) && near(z.box.y, a.box.y, 2); }), `saved notes are back at ${Object.keys(place).map((k) => { const z = back.items.find((i) => i.key === k)!; return `${z.left},${z.top}`; }).join(" ")}`);
      const p3 = await prefs();
      L.check("C6", `${where} · back`, p3?.view === "free", `prefs view is ${p3?.view}`);
    }
    L.done(26);
  });

  test("C7 menu: the ⋯ button shows on hover and on focus and opens the built menu; Remove asks first, and Undo restores the same document", async ({ page }) => {
    const L = new Ledger("C7");
    await only(page, PREFIX);
    const id = "cbseed-n4";
    const original = await store.task(id);
    const read = async () => { const t = await store.task(id); return t ? canon(t) : "absent"; };
    const before = await read();
    try {
      await open(page, ROUTE, SIZES[0]);
      const note = page.locator(inPage(`[data-cb-item="${id}"]`));
      const more = note.locator(".cb-more");
      const op = async () => Number(await more.evaluate((e) => getComputedStyle(e).opacity));
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      L.check("C7", "rest", (await op()) === 0, `at rest the ⋯ button's opacity is ${await op()}`);
      await note.hover(); await page.waitForTimeout(300);
      const box = await more.boundingBox(), nb = await note.boundingBox();
      L.check("C7", "hover", near(await op(), 0.7, 0.31), `hovered, its opacity is ${await op()}`);
      L.check("C7", "hover", !!box && !!nb && box.x > nb.x + nb.width / 2 && box.y < nb.y + 40, `it is at ${box?.x.toFixed(0)},${box?.y.toFixed(0)} on a note at ${nb?.x.toFixed(0)},${nb?.y.toFixed(0)} ${nb?.width.toFixed(0)} wide`);
      await page.mouse.move(5, 5); await more.focus(); await page.waitForTimeout(300);
      L.check("C7", "focus", (await op()) > 0.5, `focused, its opacity is ${await op()}`);
      await more.click();
      const items = await page.locator('[role="menu"]:visible [role="menuitem"]').allInnerTexts();
      const built = noteMenu(false).flatMap((g) => g.entries).map((e) => ("label" in e ? e.label : ""));
      L.check("C7", "menu", JSON.stringify(items.map((t) => t.trim())) === JSON.stringify(built), `the menu reads ${JSON.stringify(items)}; the built menu ${JSON.stringify(built)}`);
      const writes = await writesDuring(page, async () => { await page.locator('[role="menu"]:visible [role="menuitem"]', { hasText: "Remove note" }).click(); }, 900);
      const asks = await page.getByRole("button", { name: "Remove note" }).count() + await page.getByRole("button", { name: "Keep it" }).count();
      const mid = await read();
      L.check("C7", "remove", writes.length === 0 && mid !== "absent", `before the answer: ${writes.length} write(s), the note is ${mid === "absent" ? "gone" : "there"}`);
      L.check("C7", "remove", asks === 2, `the confirm offers ${asks} of its two buttons`);
      await page.getByRole("button", { name: "Remove note" }).click();
      await page.waitForTimeout(900);
      L.check("C7", "remove", (await read()) === "absent", "confirmed, the document is gone");
      const undo = page.locator(".tdb-toast:visible .tdb-toast-act");
      L.check("C7", "undo", (await undo.count()) === 1 && /undo/i.test(await undo.innerText()), "the toast offers Undo");
      await undo.click(); await page.waitForTimeout(1200);
      const after = await read();
      L.check("C7", "undo", after === before, `restored ${after === before ? "field for field" : `${after} · was ${before}`}`);
      L.check("C7", "undo", (await readBoard(page))!.items.some((i) => i.key === id), "the note is back on the board");
    } finally {
      /* the case puts its own fixture back whatever happened above */
      if (original && (await read()) !== before) await store.putTask(id, original);
    }
    L.done(11);
  });
});

test.describe("CB1 · L — loading and what stands around the page", () => {
  test("L1 no jump: the panel and the board's top are where they will be while the page is still loading", async ({ page }) => {
    const L = new Ledger("L1");
    await only(page, PREFIX, { __SA_CB_HOLD_MS: 9000 });
    for (const vp of SIZES) {
      await open(page, ROUTE, vp);
      const where = sz(vp);
      const h0 = await readHeader(page), b0 = await readBoard(page);
      L.check("L1", where, !!h0 && h0.living === "pending" && h0.number === "", `while loading the header is ${h0?.living} with number "${h0?.number}"`);
      L.check("L1", where, !!b0 && b0.items.length === 0, `while loading the board holds ${b0?.items.length} item(s)`);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-cb="page"]')].some((e) => (e as HTMLElement).getBoundingClientRect().height > 0 && !e.hasAttribute("data-loading")), undefined, { timeout: 20_000 });
      await page.waitForTimeout(900);
      const h1 = await readHeader(page), b1 = await readBoard(page);
      L.check("L1", where, h1?.number === "8" && b1?.items.length === 8, `loaded: number "${h1?.number}", ${b1?.items.length} items`);
      if (!h0 || !h1 || !b0 || !b1) continue;
      for (const k of ["x", "y", "w", "h"] as const) L.check("L1", where, near(h0.box[k], h1.box[k], 1), `the panel's ${k}: ${h0.box[k].toFixed(1)} loading, ${h1.box[k].toFixed(1)} loaded`);
      L.check("L1", where, near(b0.board.y, b1.board.y, 1) && near(b0.board.x, b1.board.x, 1) && near(b0.board.w, b1.board.w, 1), `the board's top: ${b0.board.y.toFixed(1)} loading, ${b1.board.y.toFixed(1)} loaded`);
      L.check("L1", where, !!b0.addrow && !!b1.addrow && near(b0.addrow.y, b1.addrow.y, 1) && near(b0.addrow.h, b1.addrow.h, 1), `the add bar: ${b0.addrow?.y.toFixed(1)} loading, ${b1.addrow?.y.toFixed(1)} loaded`);
    }
    L.done(18);
  });
});

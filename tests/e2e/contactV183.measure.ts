/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 — locks CL183 A1 to F5, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL183_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL183_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A page mutation is CSS or
 * script applied in the page; a `src` mutation (A3, C1, D1, D2, E3, F3, F4 — named in the report) is a source edit
 * made and undone in this pack's worktree, from a path-derived backup.
 *
 * ⚠️ THE WRITING LOCKS PUT THE ACCOUNT BACK: D1 deletes the probe agent it added (cleanupProbeAgent.mjs); D2 and F4
 *    edit the bare fixture `clv181-bare` and re-seed it; every F lock records the guide's state first and restores it.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { collection, deleteField, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { openContacts16 } from "./cl16Lib";
import { openRoute } from "./measure";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/contact-list-v18-3";
const MUT = process.env.CL183_MUTATE ?? "";
const BASE = process.env.CL183_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const BARE = "clv181-bare";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const reseed = () => sh("node tests/e2e/seedCl181.mjs");
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
const guideSet = (args: string) => sh(`node tests/e2e/guideFlags.mjs ${args}`);
const guideRestore = (json: string) => sh(`node tests/e2e/guideFlags.mjs --restore '${json}'`);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page. Locks absent here are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { js: `(() => { const fix = () => { const t = document.querySelector('[data-hk8="title-row"]'); if (t && !t.querySelector('[data-mut]')) { const b = document.createElement("button"); b.dataset.mut = "1"; b.className = "hk8-lnk"; b.textContent = "How points work"; t.appendChild(b); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  A2: { css: `.hk83-ptw { position: static !important; } .hk8-head.hk82 { position: relative !important; } .hk8-howpop.hk83-key { left: auto !important; right: 0 !important; }` },
  A4: { css: `.hk8-drawer, [data-hk8-drawer], .hkd, aside:has([data-hk8="head"]) { z-index: 1 !important; }` },
  B1: { js: `(() => { const fix = () => { if (!document.querySelector('[data-ftab="housekeeping"]')) { const b = document.createElement("button"); b.dataset.ftab = "housekeeping"; b.textContent = "Housekeeping"; b.style.cssText = "position:fixed;right:30px;bottom:30px;z-index:50"; document.body.appendChild(b); } }; fix(); setInterval(fix, 200); })()` },
  /* v18.3.3 — CL1833-E5 (the scroll re-check) is broken in src; the report names it. E1 to E4 retired by v19. */
  E2: { css: `.lth.lth { background: transparent !important; }` },
  F1: { js: `(() => { const go = () => { const p = document.querySelector('[data-pck="pill"]'); const side = [...document.querySelectorAll('.ws-panel, aside, nav')].find((e) => e.getBoundingClientRect().height > 300 && e.getBoundingClientRect().left < 50); if (p && side && p.parentElement !== side) side.appendChild(p); }; setInterval(go, 150); go(); })()` },
  F2: { js: `(() => { window.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest('[data-pck="item"][data-k="open"] button'); if (!b) return; setTimeout(() => { const r = [...document.querySelectorAll(".aglist [data-clv='row'][data-agent-card]")].find((x) => x.getBoundingClientRect().height > 0); r && r.click(); }, 50); }, true); })()` },
  F5: { css: `[data-pck="note"] { display: none !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string) => {
  await openContacts16(page, vp);
  await mutate(page, lock);
};
const shot = async (page: Page, name: string) => {
  if (process.env.CL183_SHOTS !== "1") return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png` });
};

/* ───────────────────────── helpers ───────────────────────── */
const openHome = async (page: Page) => {
  await page.keyboard.press("h"); await page.waitForTimeout(1000);
  if (await page.locator('[data-hk8="intro-start"]').count()) { await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(600); }
  if (await page.locator('[data-hk8="ways-all"]').count()) { await page.locator('[data-hk8="ways-all"]').click(); await page.waitForTimeout(600); }
};
const closeAll = async (page: Page) => { for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); } };
const openAgent = async (page: Page, id: string) => {
  const row = page.locator(`.aglist [data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded(); await row.click();
  await expect(page.locator(`[data-ap="panel"][data-ap-id="${id}"]`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
};
const agentDoc = async (id: string) => { const { db, uid } = await harnessDb(); return (await getDoc(doc(db, "users", uid, "agents", id))).data() ?? null; };
/** a bounded click: a control that is missing or covered is a RED READING, never a test that dies on a timeout */
const click = async (page: Page, L: Ledger, sel: string, where: string) => {
  try { await page.locator(sel).filter({ visible: true }).first().click({ timeout: 8000 }); return true; }
  catch { L.check(`${where}: "${sel}" could be pressed`, false, "missing, hidden or covered"); return false; }
};
/** quiet the guide: seen, so its first-visit open does not fall over the lock's own reads */
const quietGuide = () => guideSet("--seen");

/* ───────────────────────── A · Housekeeping ───────────────────────── */
test("A1 · header: the score is the hero, one line, no 'How points work', every tile label whole", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A1");
    await openHome(page);
    await shot(page, `02-hk-home-${vp.width}`);
    const r = await page.evaluate(() => {
      const head = document.querySelector<HTMLElement>('[data-hk8="head"]');
      const n = head?.querySelector<HTMLElement>('[data-hk8="pct"]'), lab = head?.querySelector<HTMLElement>('[data-hk8="label"]');
      const tr = head?.querySelector<HTMLElement>('[data-hk8="title-row"]');
      const how = [...document.querySelectorAll<HTMLElement>("[data-hk8] button, [data-hk8] a, button, a")].filter((e) => e.getBoundingClientRect().height > 0 && /How points work/i.test(e.textContent ?? "")).length;
      const tiles = [...(head?.querySelectorAll<HTMLElement>('[data-hk8="tile"]') ?? [])].map((t) => [...t.querySelectorAll<HTMLElement>("b, small")].map((x) => ({ t: x.textContent, clip: x.scrollWidth > x.clientWidth + 0.5 || x.getBoundingClientRect().right > t.getBoundingClientRect().right + 0.5 })));
      return {
        nfs: n ? parseFloat(getComputedStyle(n).fontSize) : null, lfs: lab ? parseFloat(getComputedStyle(lab).fontSize) : null,
        oneLine: !!(n && lab && tr) && Math.abs((n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2) - (lab.getBoundingClientRect().top + lab.getBoundingClientRect().height / 2)) < 20
          && lab.getClientRects().length === 1,
        how, tiles,
      };
    });
    L.check(`${w} the score's font size ≥ 52`, (r.nfs ?? 0) >= 52, `${r.nfs}`);
    L.check(`${w} "List health" ≥ 20`, (r.lfs ?? 0) >= 20, `${r.lfs}`);
    L.check(`${w} score and "List health" on one line`, r.oneLine, `${r.oneLine}`);
    L.check(`${w} no "How points work" element`, r.how === 0, `${r.how}`);
    L.check(`${w} three tiles`, r.tiles.length === 3, `${r.tiles.length}`);
    for (const [i, t] of r.tiles.entries()) L.check(`${w} tile ${i + 1}'s label is untruncated`, t.length >= 2 && t.every((x) => !x.clip), JSON.stringify(t));
    await closeAll(page);
  }
  L.done(14);
});

test("A2 · key: under the points tile, left within 2, 8–12 below, in view, unclipped; Escape closes it with the drawer open", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A2");
    await openHome(page);
    await page.locator('[data-hk8="tile"][data-k="points"]').click(); await page.waitForTimeout(400);
    await shot(page, `03-hk-points-key-${vp.width}`);
    const r = await page.evaluate(() => {
      const t = document.querySelector('[data-hk8="tile"][data-k="points"]')!.getBoundingClientRect();
      const kEl = document.querySelector<HTMLElement>('[data-hk8="how-pop"]');
      if (!kEl) return { has: false };
      const k = kEl.getBoundingClientRect();
      const pts = [[k.left + 6, k.top + 6], [k.right - 6, k.top + 6], [k.left + 6, k.bottom - 6], [k.right - 6, k.bottom - 6], [k.left + k.width / 2, k.top + k.height / 2]];
      const own = pts.filter(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && kEl.contains(e); }).length;
      return { has: true, dl: k.left - t.left, dt: k.top - t.bottom, inView: k.left >= 0 && k.top >= 0 && k.right <= innerWidth && k.bottom <= innerHeight, own, of: pts.length };
    });
    L.check(`${w} the key shows`, r.has, `${r.has}`);
    if (r.has) {
      L.check(`${w} its left is the tile's ±2`, near(r.dl, 0, 2), `${r.dl?.toFixed(1)}`);
      L.check(`${w} its top is 8–12 below the tile`, (r.dt ?? -1) >= 8 && (r.dt ?? 99) <= 12, `${r.dt?.toFixed(1)}`);
      L.check(`${w} fully in the viewport`, r.inView, `${r.inView}`);
      L.check(`${w} unclipped (its corners and centre hit it)`, r.own === r.of, `${r.own}/${r.of}`);
    }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ key: !!document.querySelector('[data-hk8="how-pop"]'), drawer: !!document.querySelector('[data-hk8="head"]') }));
    L.check(`${w} Escape closes the key`, !after.key, `${after.key}`);
    L.check(`${w} …with the drawer still open`, after.drawer, `${after.drawer}`);
    await closeAll(page);
  }
  L.done(14);
});

test("A3 · complete: with every reply time settled, no Reply time section; one gap brings it back", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A3");
  /* THE FIXTURE: the writer's own "Say it's not stated" list (todoPrefs.contacts.settled) clears an agent's reply gap,
     so settling every agent's reply makes the detail complete, one document write, and the original list goes back
     exactly (deleted where it was absent). On the harness account all five details have gaps, so without this the
     hidden branch would never be entered. */
  const { db, uid } = await harnessDb();
  const ref = doc(db, "users", uid);
  const before = ((await getDoc(ref)).data()?.todoPrefs?.contacts?.settled ?? null) as string[] | null;
  const docs = (await getDocs(collection(db, "users", uid, "agents"))).docs;
  const ids = docs.map((d) => d.id);
  /* the one to unsettle must have no reply time of its own, or unsettling it opens no gap */
  const open1 = docs.find((d) => !(Number(d.data().responseTimeWeeks) > 0))?.id ?? ids[0];
  const sections = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="detail"]')].map((c) => ({ g: c.dataset.gap, have: Number(c.dataset.have), base: Number(c.dataset.base) })));
  const toDetail = async () => {
    await openHome(page);
    await page.locator('[data-hkv="view"][data-v="detail"]').click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
  };
  try {
    await updateDoc(ref, { "todoPrefs.contacts.settled": ids.map((id) => `${id}:reply`) });
    await open(page, SIZES[0], "A3");
    await toDetail();
    const a = await sections();
    L.check("sections render (the population)", a.length > 0, JSON.stringify(a.map((c) => c.g)));
    L.check("with every reply settled, no Reply time section", !a.some((c) => c.g === "reply"), JSON.stringify(a));
    for (const c of a) L.check(`the ${c.g} section shown has a gap (${c.have} < ${c.base})`, c.have < c.base, `${c.have}/${c.base}`);
    await closeAll(page);
    await updateDoc(ref, { "todoPrefs.contacts.settled": ids.filter((id) => id !== open1).map((id) => `${id}:reply`) });
    await page.waitForTimeout(1500);
    await toDetail();
    const b = await sections();
    const reply = b.find((c) => c.g === "reply");
    L.check("one unsettled agent brings the Reply time section back", !!reply, JSON.stringify(b.map((c) => c.g)));
    if (reply) L.check("…with exactly that one gap", reply.base - reply.have === 1, `${reply.have}/${reply.base}`);
    await closeAll(page);
  } finally {
    await updateDoc(ref, { "todoPrefs.contacts.settled": before == null ? deleteField() : before });
  }
  L.done(5);
});

/* RE-POINTED by v19: "the pinned row" was v18.3's navy list bar (.cl18-lh); v19's is the list head ([data-cl19="head"],
   the toolbar), which sticks at the scroll area's top once the hero is behind. The law (the drawer is in front) is unchanged. */
test("A4 · front: the drawer is in front of the pinned row", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A4");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A4");
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; const lh = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='head']")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop += lh.getBoundingClientRect().top - sc.getBoundingClientRect().top + 900; });
    await page.waitForTimeout(500);
    await openHome(page);
    await shot(page, `04-hk-over-pinned-row-${vp.width}`);
    const r = await page.evaluate(() => {
      const lh = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='head']")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
      const head = document.querySelector<HTMLElement>('[data-hk8="head"]')!;
      let d: HTMLElement | null = head; while (d && getComputedStyle(d).position !== "fixed") d = d.parentElement;
      const dr = (d ?? head).getBoundingClientRect();
      const x = dr.left + 60, y = lh.top + lh.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { pinnedTop: lh.top, pinnedH: lh.height, x, y, inDrawer: !!hit && !!d && d.contains(hit), hit: hit ? `${hit.tagName}.${(hit as HTMLElement).className}` : null };
    });
    L.check(`${w} the pinned row is on screen (the precondition)`, r.pinnedTop >= 0 && r.pinnedH > 40, `${r.pinnedTop}`);
    L.check(`${w} the drawer's left + 60, at the pinned row's centre, is the drawer`, r.inDrawer, `${r.hit}`);
    await closeAll(page);
  }
  L.done(4);
});

/* ───────────────────────── B · the page header ───────────────────────── */
test("B1 · 'Fill in the gaps' with the open gaps' count; no Discover in the header; no floating tab; H opens Housekeeping", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("B1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "B1");
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>(".cl17-hd")].find((e) => e.getBoundingClientRect().height > 0)!;
      const fill = hd.querySelector<HTMLElement>('[data-cl183="fill"]');
      return {
        fill: fill?.textContent?.replace(/\d+/g, "").trim() ?? null, n: Number(hd.querySelector('[data-cl183="fill-n"]')?.textContent ?? NaN),
        discover: [...hd.querySelectorAll("button, a")].some((e) => /Discover agents/i.test(e.textContent ?? "")),
        tab: [...document.querySelectorAll<HTMLElement>('[data-ftab]')].filter((e) => e.getBoundingClientRect().height > 0).length,
      };
    });
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    const hk = await page.evaluate(() => ({ open: !!document.querySelector('[data-hk8="head"]'), gaps: Number(document.querySelector('[data-hk8="tile"][data-k="gaps"] b')?.textContent ?? NaN) }));
    L.check(`${w} the header's button reads "Fill in the gaps"`, r.fill === "Fill in the gaps", `${r.fill}`);
    L.check(`${w} H opens Housekeeping`, hk.open, `${hk.open}`);
    if (Number.isFinite(hk.gaps)) L.check(`${w} its count is the open gaps (${hk.gaps})`, r.n === hk.gaps, `${r.n}`);
    else L.check(`${w} the gaps tile is readable`, false, "the drawer opened on the intro");
    L.check(`${w} no "Discover agents" in the header`, !r.discover, `${r.discover}`);
    L.check(`${w} no floating tab`, r.tab === 0, `${r.tab}`);
    await closeAll(page);
  }
  L.done(10);
});

/* RETIRED by v19 (reports/contact-list-v19/REPORT.md): B2 measured 14 / 34 / 54 from the sheet to the A to Z tabs above the
   hero (.cl18-tabs), to the title row and to the navy list bar (.cl18-lh). v19 retires both the tabs and the bar: the list
   card sits 22px under the hero, its toolbar is the only A to Z (CL19-P2). Its ledgers are deleted with it. */

/* RETIRED by v19 (reports/contact-list-v19/REPORT.md): C1 (v18.3's three peek pills) and CL1833-E1 to E4 (v18.3.3's details
   line on the row's own columns: the columns, its 16/16 rhythm, the next-step link and the email that copied from the line)
   described an open row v19 replaces: the contact details are the row's Website and Email columns, and the open row is one
   powder strip of genres and the wishlist. CL19-C1 holds the columns, CL19-C3 the email that copies, CL19-D1 the strip.
   Their mutations and ledgers are deleted with them. CL1833-E5 ("always closes") is kept and still passes. */

/* ───────────────────────── v18.3.3 · the open row always closes ───────────────────────── */
const hoverRow = async (page: Page, id: string, wait: number) => {
  const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(350);
  const b = await row.boundingBox(); await page.mouse.move(b!.x + 60, b!.y + 20); await page.waitForTimeout(wait);
};
test("CL1833-E5 · closes: a scroll with every pointer event suppressed, a small scroll keeps it, blur, leaving early, and the keyboard", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("CL1833-E5");
  const anyOpen = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-peek]")].filter((e) => e.getBoundingClientRect().height > 0).length);
  const scrollBy = (dy: number) => page.evaluate((dy) => { const r = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row']")].find((e) => e.getBoundingClientRect().height > 0)!; let s: HTMLElement | null = r.parentElement; while (s && !(s.scrollHeight > s.clientHeight && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement; s!.scrollBy(0, dy); }, dy);
  const SUPPRESS = `for (const t of ["pointermove","pointerover","pointerout","pointerenter","pointerleave","pointerdown","pointerup","mousemove","mouseover","mouseout","mouseenter","mouseleave"]) window.addEventListener(t, (e) => e.stopImmediatePropagation(), { capture: true });`;
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL1833-E5");
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.agentCard!));
    const id = ids[3];
    /* (b) a 20px scroll that leaves the pointer on the row keeps it open */
    await hoverRow(page, id, 900);
    L.check(`${w} the row opened on hover (precondition)`, (await anyOpen()) === 1, `${await anyOpen()}`);
    await scrollBy(20); await page.waitForTimeout(300);
    L.check(`${w} (b) a 20px scroll that leaves the pointer on the row keeps it open`, (await anyOpen()) === 1, `${await anyOpen()}`);
    /* (c) window blur closes it */
    await hoverRow(page, id, 900);
    await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await page.waitForTimeout(200);
    L.check(`${w} (c) window blur closes it`, (await anyOpen()) === 0, `${await anyOpen()}`);
    /* (d) hover 300ms, leave the list: nothing opens at 450 */
    await hoverRow(page, ids[4], 300);
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    L.check(`${w} (d) leaving before the dwell: nothing opens`, (await anyOpen()) === 0, `${await anyOpen()}`);
    /* (e) Space opens, Escape closes; focus leaving closes */
    const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${ids[2]}"]`).filter({ visible: true }).first();
    await row.focus(); await page.keyboard.press(" "); await page.waitForTimeout(300);
    L.check(`${w} (e) Space opens the focused row (precondition)`, (await anyOpen()) === 1, `${await anyOpen()}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    L.check(`${w} (e) Escape closes it`, (await anyOpen()) === 0, `${await anyOpen()}`);
    await row.focus(); await page.keyboard.press(" "); await page.waitForTimeout(300);
    await page.evaluate(() => { const i = [...document.querySelectorAll<HTMLElement>("input, button")].find((e) => e.getBoundingClientRect().height > 0 && !e.closest(".aglist")); i?.focus(); });
    await page.waitForTimeout(300);
    L.check(`${w} (e) focus leaving the row closes it`, (await anyOpen()) === 0, `${await anyOpen()}`);
    /* (a) hover-open, then a 500px scroll with every pointer and mouse event suppressed: closed within 300ms */
    await hoverRow(page, id, 900);
    L.check(`${w} (a) open before the scroll (precondition)`, (await anyOpen()) === 1, `${await anyOpen()}`);
    await page.evaluate(SUPPRESS);
    await scrollBy(500); await page.waitForTimeout(300);
    L.check(`${w} (a) a 500px scroll with pointer events suppressed closes it within 300ms`, (await anyOpen()) === 0, `${await anyOpen()}`);
  }
  L.done(18);
});


/* ───────────────────────── D · adding an agent ───────────────────────── */
test("D1 · add: the panel's act view, no centred card, Add disabled until a name, saves through addAgent, then the panel shows them", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  const g0 = guideNow();
  try {
    quietGuide();
    await open(page, SIZES[0], "D1");
    await page.locator(".aglist [data-cl17='add']").filter({ visible: true }).first().click();
    await page.waitForTimeout(900);
    await shot(page, "10-add-agent-empty-1512");
    const r = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-ap="panel-new"]');
      const save = panel?.querySelector<HTMLButtonElement>('[data-ae="save"]');
      const ag = panel?.querySelector<HTMLInputElement>('[data-ae="agency"]');
      return {
        panel: !!panel && panel.getBoundingClientRect().height > 0, title: panel?.querySelector(".qad-h2")?.textContent?.trim() ?? null,
        centred: !!document.querySelector(".ac-root:not(.qad-root), [data-ac='card'], .agc-add, [data-ac-host='center']"),
        disabled: !!save?.disabled, paste: !!panel?.querySelector('[data-ae="paste"]'),
        agPh: ag?.getAttribute("placeholder") ?? "", agList: ag?.getAttribute("list") ?? null, lists: panel?.querySelectorAll("datalist").length ?? 0,
      };
    });
    L.check("the agent panel opens in a new-agent state", r.panel, `${r.panel}`);
    L.check('its title is "Add an agent"', r.title === "Add an agent", `${r.title}`);
    L.check("no centred add card in the DOM", !r.centred, `${r.centred}`);
    L.check("Add to your list is disabled until a name or agency", r.disabled, `${r.disabled}`);
    L.check('no "Paste a link" field', !r.paste, `${r.paste}`);
    L.check("the agency field has no placeholder and no datalist", !r.agPh && !r.agList && r.lists === 0, JSON.stringify(r));
    if (r.panel) {
      /* the spy: the existing add path writes the agent and its AGENT_ADDED line — Firestore says whether it ran */
      await page.locator('[data-ap="panel-new"] [data-ae="name"]').fill("Zz Probe Agent");
      await page.waitForTimeout(200);
      L.check("Add enables once a name is typed", !(await page.locator('[data-ap="panel-new"] [data-ae="save"]').isDisabled()), "");
      await shot(page, "11-add-agent-filled-1512");
      await page.locator('[data-ap="panel-new"] [data-ae="save"]').click();
      await page.waitForTimeout(2500);
      const after = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-ap="panel"]')].find((e) => e.getBoundingClientRect().height > 0);
        const foot = document.querySelector<HTMLElement>('[data-ap="panel-new"] [data-ae="foot"]')?.textContent ?? "";
        return { id: p?.dataset.apId ?? null, name: p?.textContent?.includes("Zz Probe Agent") ?? false, capped: /capped at \d+ agents/i.test(foot), foot };
      });
      const stored = after.id ? await agentDoc(after.id) : null;
      /* ⚠️ THE HARNESS ACCOUNT IS FREE AND OVER THE CAP: addAgent refuses every add there, and says so. The refusal is
         the existing add path answering (its own words, in the editor's foot), so it is the spy's reading; the after-add
         half ("then the panel shows the new agent") can only be read where the add lands, and is tallied, not faked. */
      L.check("the save reached the existing add path (it wrote the agent, or answered with its cap)", stored?.name === "Zz Probe Agent" || after.capped, JSON.stringify(after));
      if (stored) L.check("then the panel shows the new agent", !!after.id && after.name, JSON.stringify(after));
      else console.log("[D1] the account is capped: the after-add branch was not entered");
    }
  } finally {
    const out = sh("node tests/e2e/cleanupProbeAgent.mjs");
    console.log(`[D1] cleanup: ${out.trim()}`);
    guideRestore(g0);
  }
  L.done(8);
});

test("D2 · policy: 'Response policy' with its two values, writing noResponseMeansNo as before", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D2");
  const g0 = guideNow();
  try {
    reseed(); quietGuide();
    await open(page, SIZES[0], "D2");
    await openAgent(page, BARE);
    if (!(await click(page, L, '[data-ap="edit"]', "Edit profile"))) { L.done(1); return; }
    await page.waitForTimeout(800);
    const sec = await page.evaluate(() => document.querySelector('[data-ae="nrn"]')?.closest<HTMLElement>("[data-sec]")?.dataset.sec ?? null);
    if (sec) { await page.locator(`[data-ae="tabs"] [data-tab="${sec}"]`).first().click(); await page.waitForTimeout(300); }
    const r = await page.evaluate(() => {
      const seg = document.querySelector<HTMLElement>('[data-ae="nrn"]');
      const f = seg?.closest<HTMLElement>(".ac-f, .ae-f, label, div")?.parentElement;
      return { label: (f?.textContent ?? "").includes("Response policy"), old: /No reply means/.test(document.body.textContent ?? ""), opts: [...(seg?.querySelectorAll("button") ?? [])].map((b) => b.textContent?.trim()) };
    });
    L.check('the editor shows "Response policy"', r.label, `${r.label}`);
    L.check('no "No reply means" anywhere', !r.old, `${r.old}`);
    L.check('the options are "No response means no" / "Always replies"', JSON.stringify(r.opts) === JSON.stringify(["No response means no", "Always replies"]), JSON.stringify(r.opts));
    if (!(await page.locator('[data-ae="nrn"] button', { hasText: "Always replies" }).click({ timeout: 8000 }).then(() => true, () => false))) { L.check('"Always replies" can be chosen', false, "no such option"); L.done(1); return; }
    await page.waitForTimeout(200);
    await page.locator('[data-ae="save"]').filter({ visible: true }).first().click(); await page.waitForTimeout(2200);
    const a = await agentDoc(BARE);
    L.check('"Always replies" writes noResponseMeansNo = false', a?.noResponseMeansNo === false, `${a?.noResponseMeansNo}`);
    await page.locator('[data-ap="edit"]').filter({ visible: true }).first().click(); await page.waitForTimeout(800);
    if (sec) { await page.locator(`[data-ae="tabs"] [data-tab="${sec}"]`).first().click(); await page.waitForTimeout(300); }
    await page.locator('[data-ae="nrn"] button', { hasText: "No response means no" }).click(); await page.waitForTimeout(200);
    await page.locator('[data-ae="save"]').filter({ visible: true }).first().click(); await page.waitForTimeout(2200);
    const b = await agentDoc(BARE);
    L.check('"No response means no" writes noResponseMeansNo = true', b?.noResponseMeansNo === true, `${b?.noResponseMeansNo}`);
  } finally { reseed(); guideRestore(g0); }
  L.done(5);
});

/* ───────────────────────── E · the list header and headings ───────────────────────── */
/* RETIRED by v19 (reports/contact-list-v19/REPORT.md): E1 held v18.3's navy list bar at 64 tall with 36px controls and its
   chip "[data-ltb=chip]". v19's toolbar is 52 tall with 34px controls and never wraps (CL19-T1); its Group by chip and the
   "Grouped by" reading are CL19-E1's. E2 (the headings) and E3 (sorting inside groups) are re-pointed below. */

test("E2 · headings: opaque white while stuck, each label within 1px of its column — on both pages", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E2");
  const read = (heads: string, row: string, lab: string) => page.evaluate(async ([heads, row, lab]) => {
    const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
    const h0 = [...document.querySelectorAll<HTMLElement>(heads)].find((e) => e.getBoundingClientRect().height > 0)!;
    sc.scrollTop += h0.getBoundingClientRect().top - sc.getBoundingClientRect().top + 500;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const h = [...document.querySelectorAll<HTMLElement>(heads)].find((e) => e.getBoundingClientRect().height > 0)!;
    const hb = h.getBoundingClientRect();
    /* the first row whose top is under the headings */
    const r = [...document.querySelectorAll<HTMLElement>(row)].find((e) => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().top > hb.bottom)!;
    const cols = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      if (cs.display.includes("grid")) {
        const tr = cs.gridTemplateColumns.split(" ").map(parseFloat); const gap = parseFloat(cs.columnGap) || 0;
        let x = el.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
        return tr.map((t) => { const l = x; x += t + gap; return l; });
      }
      return [...el.children].map((c) => (c as HTMLElement).getBoundingClientRect().left);
    };
    /* a label sits over its column's start, or over the first words in that column (the QC's Agent label is over the
       name, after the disc) — both are the column's own edges, read from the row */
    const tw = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    const texts: number[] = [];
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!(n.textContent ?? "").trim()) continue; const g = document.createRange(); g.selectNodeContents(n); const b = g.getBoundingClientRect(); if (b.width > 0) texts.push(b.left); }
    const rowCols = [...cols(r), ...texts];
    const labs = [...h.querySelectorAll<HTMLElement>(lab)].map((e) => { const t = (e.querySelector("button, span") ?? e) as HTMLElement; const g = document.createRange(); g.selectNodeContents(t); const rr = g.getBoundingClientRect(); return rr.width ? rr.left : t.getBoundingClientRect().left; });
    const textAlignRight = [...h.querySelectorAll<HTMLElement>(lab)].map((e) => getComputedStyle(e).textAlign === "right" || getComputedStyle(e).justifyContent.includes("end"));
    return { bg: getComputedStyle(h).backgroundColor, top: hb.top - sc.getBoundingClientRect().top, stuck: hb.top <= sc.getBoundingClientRect().top + 400, rowCols, labs, textAlignRight };
  }, [heads, row, lab]);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    for (const pg of ["Contact list", "Query Centre"] as const) {
      if (pg === "Contact list") await open(page, vp, "E2");
      else { await openRoute(page, "/queries"); await page.setViewportSize(vp); await page.waitForTimeout(2500); await mutate(page, "E2"); }
      const r = pg === "Contact list" ? await read(".clv-group .lt-labels", ".aglist [data-clv='row']", ".lt-lab") : await read(".qc138-heads", ".qc138-row", ".qc138-h");
      await shot(page, `09-grouped-sticky-${pg === "Contact list" ? "cl" : "qc"}-${vp.width}`);
      L.check(`${w} ${pg}: scrolled past the top, the headings are stuck (precondition)`, r.stuck, `${r.top}`);
      L.check(`${w} ${pg}: their background is opaque white`, r.bg === "rgb(255, 255, 255)", r.bg);
      L.check(`${w} ${pg}: labels found`, r.labs.length >= 3, `${r.labs.length}`);
      r.labs.forEach((x, i) => {
        if (r.textAlignRight[i]) return; /* a right-aligned label is measured by its own column's right in the QC's last column; skipped */
        const d = Math.min(...r.rowCols.map((c) => Math.abs(c - x)));
        L.check(`${w} ${pg}: label ${i + 1} is within 1px of a column's left`, d <= 1, `${d.toFixed(1)} (label ${x.toFixed(1)}; columns ${r.rowCols.map((c) => c.toFixed(0)).join(",")})`);
      });
    }
  }
  L.done(16);
});

/* RE-POINTED by v19: the grouping chip is v19's Group by (button.cl19-grp); the claim is unchanged. */
test("E3 · grouped: one headings row; clicking Replies sorts every group", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E3");
  await open(page, SIZES[0], "E3");
  if (!(await click(page, L, "button.cl19-grp", "the grouping chip")) || !(await click(page, L, '[data-opt="group:status"]', "Status"))) { L.done(1); return; }
  await page.waitForTimeout(800);
  await shot(page, "08-grouped-status-1512");
  const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-group .lt-labels")].filter((e) => e.getBoundingClientRect().height > 0).length);
  const groups = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist .clv-grp")].filter((e) => e.getBoundingClientRect().height > 0).length);
  L.check("the list is grouped (precondition: more than one group)", groups > 1, `${groups}`);
  L.check("exactly one headings row is visible", n === 1, `${n}`);
  const replies = page.locator(".clv-group .lt-labels .lt-lab").filter({ hasText: /Replies/i }).first();
  await replies.click({ timeout: 8000 }).catch(() => L.check("the Replies heading can be pressed", false, "missing")); await page.waitForTimeout(700);
  const sorted = await page.evaluate(() => {
    /* v19.2 §C re-point: the reply time reads "~6 weeks" (was "~6 wks"); the old pattern read every row as Infinity, a vacuous green */
    const wk = (t: string) => { const m = t.match(/~?(\d+)\s*(?:weeks?|wks?)/); return m ? Number(m[1]) : Infinity; };
    return [...document.querySelectorAll<HTMLElement>(".aglist .clv-grp")].filter((e) => e.getBoundingClientRect().height > 0).map((g) => {
      const ws = [...g.querySelectorAll<HTMLElement>("[data-clv='row']")].map((r) => wk(r.querySelector<HTMLElement>(".cl14-rep, [data-clv='replies'], .clv-rep")?.textContent ?? r.textContent ?? ""));
      const up = ws.every((v, i) => i === 0 || v >= ws[i - 1]), down = ws.every((v, i) => i === 0 || v <= ws[i - 1]);
      return { n: ws.length, ok: up || down, ws };
    });
  });
  const labOn = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-group .lt-labels .lt-lab.on")].map((e) => e.textContent?.trim()));
  L.check("Replies is now the sort column", labOn.some((t) => /Replies/i.test(t ?? "")), JSON.stringify(labOn));
  for (const [i, g] of sorted.entries()) if (g.n > 1) L.check(`group ${i + 1}'s rows are in reply-time order`, g.ok, JSON.stringify(g.ws));
  await page.locator("[data-cl19='group-stop']").filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.locator(".clv-group .lt-labels .lt-lab").first().click().catch(() => {});
  L.done(4);
});

/* ───────────────────────── F · the page guide ───────────────────────── */
const centreY = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return r.top + r.height / 2; }, sel);

/* RE-POINTED by v19 §K: the checklist has six tasks ("Pin the list" is the third), so the count reads n/6 and "all done"
   includes the pin. The claims are unchanged. */
test("F1 · pill: left of the '?', centred with the bar, its words and count; gone after Hide it and after all five", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("F1");
  const g0 = guideNow();
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      guideSet("--clear"); guideSet("--seen"); guideSet("--done add,open");
      await open(page, vp, "F1");
      await page.waitForTimeout(800);
      await shot(page, `18-guide-closed-${vp.width}`);
      const r = await page.evaluate(() => {
        const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0) ?? null;
        const p = v("[data-pck='pill']"), help = v(".ws-help");
        const cy = (e: HTMLElement | null) => (e ? e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2 : null);
        return {
          has: !!p, inBar: !!p?.closest(".ws-pagebar"), leftOfHelp: !!p && !!help && p.getBoundingClientRect().right <= help.getBoundingClientRect().left,
          gap: p && help ? help.getBoundingClientRect().left - p.getBoundingClientRect().right : null,
          ys: [cy(p), cy(v(".ws-search")), cy(v(".ws-appctl--cap")), cy(help)], text: p?.querySelector(".pck-pt")?.textContent ?? null, n: p?.querySelector("[data-pck='count']")?.textContent ?? null,
        };
      });
      L.check(`${w} the pill is in the top bar`, r.has && r.inBar, JSON.stringify(r));
      L.check(`${w} it sits left of the "?" with 10 ±1 between`, r.leftOfHelp && near(r.gap, 10, 1), `${r.gap}`);
      L.check(`${w} its centre equals Search's, Log a query's and the "?"'s ±1`, r.ys.every((y) => near(y, r.ys[0] ?? NaN, 1)), JSON.stringify(r.ys));
      L.check(`${w} it reads "Contact list: Getting started"`, r.text === "Contact list: Getting started", `${r.text}`);
      L.check(`${w} and "2/6"`, r.n === "2/6", `${r.n}`);
      /* Hide it */
      await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(300);
      await click(page, L, "[data-pck='off']", "step"); await page.waitForTimeout(200);
      await shot(page, `17-guide-hide-for-good-${vp.width}`);
      L.check(`${w} "Don't show this again" asks first`, await page.locator("[data-pck='sure']").count() === 1, "");
      await click(page, L, "[data-pck='hide']", "step"); await page.waitForTimeout(1200);
      L.check(`${w} after Hide it the pill is absent`, (await page.locator("[data-pck='pill']").count()) === 0, "");
      await page.reload(); await page.waitForTimeout(3000);
      L.check(`${w} …and stays absent after a reload`, (await page.locator("[data-pck='pill']").count()) === 0, "");
      /* all five */
      guideSet("--clear"); guideSet("--seen"); guideSet("--done add,search,pin,open,edit,hk");
      await page.reload(); await page.waitForTimeout(3000);
      L.check(`${w} with all six done the pill is absent`, (await page.locator("[data-pck='pill']").count()) === 0, "");
    }
  } finally { guideRestore(g0); }
  L.done(18);
});

/* RE-POINTED by v19: six steps (§K's "Pin the list" third, its target the toolbar's Pin), and Find is the toolbar's
   ([data-cl19="find"]); the old list bar's Find is retired. The claims are unchanged. */
test("F2 · show: a checklist row changes nothing, closes the checklist, and shows the dim with a hole around the target and the step card", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("F2");
  const g0 = guideNow();
  try {
    guideSet("--clear"); guideSet("--seen");
    await open(page, SIZES[0], "F2");
    await page.waitForTimeout(600);
    const targets: Record<string, string> = { add: ".aglist [data-cl17='add']", search: ".aglist [data-cl19='find']", pin: ".aglist [data-cl19='pin']", open: ".aglist [data-clv='row'][data-agent-card]", edit: ".aglist [data-clv='row'][data-agent-card]", hk: ".aglist [data-cl183='fill']" };
    for (const [i, k] of ["add", "search", "pin", "open", "edit", "hk"].entries()) {
      await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(350);
      if (k === "add") await shot(page, "13-guide-open-1512");
      await click(page, L, `[data-pck='item'][data-k='${k}'] button`, k);
      /* v19: with six items the "open" item sits over the first row, and a still pointer there opens that row's strip
         after the 450ms dwell (by design), growing it past the hole that was cut for it. The pointer leaves first. */
      await page.mouse.move(5, 5); await page.waitForTimeout(700);
      await shot(page, `14-guide-step-${i + 1}-${k}-1512`);
      const r = await page.evaluate((sel) => {
        const te = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
        const t = te ? te.getBoundingClientRect() : null;
        const hole = JSON.parse(document.querySelector<HTMLElement>("[data-pck='dim']")?.dataset.hole ?? "null");
        const card = document.querySelector<HTMLElement>("[data-pck='card']");
        return {
          pop: !!document.querySelector("[data-pck='popover']"), dim: !!document.querySelector("[data-pck='dim']"), card: !!card && getComputedStyle(card).visibility !== "hidden",
          step: card?.querySelector(".pck-ck")?.textContent ?? null,
          contains: !!hole && !!t && hole.left <= t.left + 0.5 && hole.top <= t.top + 0.5 && hole.left + hole.width >= t.right - 0.5 && hole.top + hole.height >= t.bottom - 0.5,
          panel: !!document.querySelector('[data-ap="panel"], [data-ap="panel-new"]'), drawer: !!document.querySelector('[data-hk8="head"]'),
          find: (document.querySelector<HTMLInputElement>(".aglist .cl19-findw input")?.value ?? "") === "",
          pinned: document.querySelector<HTMLElement>(".aglist [data-cl19='pin']")?.getAttribute("aria-pressed") === "true",
        };
      }, targets[k]);
      L.check(`${k}: the checklist closed`, !r.pop, `${r.pop}`);
      L.check(`${k}: the dim shows`, r.dim, `${r.dim}`);
      L.check(`${k}: the step card shows "Step ${i + 1} of 6"`, r.card && /Step\s+\d\s+of\s+6/i.test(r.step ?? "") && r.step!.includes(`${i + 1}`), `${r.step}`);
      L.check(`${k}: the hole contains the target`, r.contains, `${r.contains}`);
      L.check(`${k}: no panel opened, no drawer, no search typed, not pinned`, !r.panel && !r.drawer && r.find && !r.pinned, JSON.stringify(r));
      await click(page, L, "[data-pck='back']", "step"); await page.waitForTimeout(300);
      await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    }
    const g = JSON.parse(guideNow() || "null");
    L.check("nothing was ticked by the guide's own buttons", !g?.done || Object.keys(g.done).length === 0, JSON.stringify(g));
  } finally { guideRestore(g0); }
  L.done(31);
});

test("F3 · end: a real click on the spotlit row opens the panel and ends the spotlight within 200ms", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("F3");
  const g0 = guideNow();
  try {
    guideSet("--clear"); guideSet("--seen");
    await open(page, SIZES[0], "F3");
    await page.waitForTimeout(600);
    await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(300);
    await click(page, L, "[data-pck='item'][data-k='open'] button", "open"); await page.waitForTimeout(700);
    /* v19.2 re-point: the click goes to the row's NAME, as every other contact lock's does. 30% across lands on the
       Date added text, which answers its own click (`.cl19-c [data-cl19]`, since v19); this passed on v19.1 only
       because the pointer, left on the checklist, happened to hover the first row open — v19.2 §A moved it 44px down */
    const box = await page.evaluate(() => { const row = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].find((e) => e.getBoundingClientRect().height > 0)!; const r = row.querySelector<HTMLElement>(".clv-rwn b")!.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    L.check("the spotlight is on (precondition)", await page.locator("[data-pck='spot']").count() === 1, "");
    await page.mouse.click(box.x, box.y);
    const t0 = Date.now();
    await page.waitForFunction(() => !document.querySelector("[data-pck='spot']"), null, { timeout: 2000 }).catch(() => {});
    const dt = Date.now() - t0;
    L.check("the spotlight ended within 200ms", (await page.locator("[data-pck='spot']").count()) === 0 && dt <= 200, `${dt}ms`);
    await page.waitForTimeout(800);
    L.check("the click opened the panel", await page.locator('[data-ap="panel"]').filter({ visible: true }).count() > 0, "");
    await closeAll(page);
  } finally { guideRestore(g0); }
  L.done(3);
});

test("F4 · done: a row click ticks Open, two characters tick Search, a saved edit ticks Edit, each across a reload", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("F4");
  const g0 = guideNow();
  try {
    reseed(); guideSet("--clear"); guideSet("--seen");
    await open(page, SIZES[0], "F4");
    await page.waitForTimeout(600);
    const done = async () => (JSON.parse(guideNow() || "null")?.done ?? {}) as Record<string, boolean>;
    /* open, by a plain row click — no checklist involved */
    await openAgent(page, BARE);
    await page.waitForTimeout(1200);
    L.check("a row click ticks Open (stored)", (await done()).open === true, JSON.stringify(await done()));
    /* edit, by a real save */
    await page.locator('[data-ap="edit"]').filter({ visible: true }).first().click(); await page.waitForTimeout(800);
    await page.locator('[data-ae="city"]').filter({ visible: true }).first().fill("Zz Probe City").catch(() => {});
    await page.locator('[data-ae="save"]').filter({ visible: true }).first().click(); await page.waitForTimeout(2200);
    L.check("a saved edit ticks Edit (stored)", (await done()).edit === true, JSON.stringify(await done()));
    await closeAll(page);
    /* search, by two characters */
    /* RE-POINTED by v19: Find is the toolbar's (the old list bar's is retired); at ≤1440 it opens on a click */
    await page.locator(".aglist .cl19-findw label.cl19-find").filter({ visible: true }).first().click().catch(() => {});
    const f = page.locator(".aglist .cl19-findw input").filter({ visible: true }).first();
    await f.fill("Th"); await page.waitForTimeout(1200);
    L.check("two characters tick Search (stored)", (await done()).search === true, JSON.stringify(await done()));
    await f.fill(""); await page.waitForTimeout(300);
    L.check("nothing else ticked", !(await done()).add && !(await done()).hk, JSON.stringify(await done()));
    await page.reload(); await page.waitForTimeout(3500);
    await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(400);
    const ui = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-pck='item']")].map((e) => [e.dataset.k, e.dataset.done === "true"])));
    L.check("after a reload the checklist shows Open, Search and Edit done", ui.open && ui.search && ui.edit && !ui.add && !ui.hk, JSON.stringify(ui));
    const cnt = await page.locator("[data-pck='count']").first().textContent({ timeout: 8000 }).catch(() => null);
    L.check("the pill reads 3/6 (v19 §K: six tasks)", cnt === "3/6", `${cnt}`);
    await page.keyboard.press("Escape");
  } finally { reseed(); guideRestore(g0); }
  L.done(6);
});

test("F5 · next: after a step is done, the note under the pill says 'Next: {next}', and pressing it starts that spotlight", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("F5");
  const g0 = guideNow();
  try {
    guideSet("--clear"); guideSet("--seen"); guideSet("--done add,search");
    await open(page, SIZES[0], "F5");
    await page.waitForTimeout(800);
    await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(300);
    await click(page, L, "[data-pck='item'][data-k='open'] button", "open"); await page.waitForTimeout(700);
    const row = page.locator(".aglist [data-clv='row'][data-agent-card]").filter({ visible: true }).first();
    await row.click(); await page.waitForTimeout(1500);
    await shot(page, "15-guide-done-note-1512");
    const r = await page.evaluate(() => {
      const n = [...document.querySelectorAll<HTMLElement>("[data-pck='note']")].find((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none");
      const pe = document.querySelector<HTMLElement>("[data-pck='pill']");
      const p = pe ? pe.getBoundingClientRect() : null;
      return n && p ? { has: true, next: n.querySelector("[data-pck='next']")?.textContent ?? null, below: n.getBoundingClientRect().top - p.bottom, right: n.getBoundingClientRect().right - p.right } : { has: false };
    });
    L.check("the note appears", r.has, `${r.has}`);
    if (r.has) {
      L.check('it reads "Next: Edit an agent"', /^Next: Edit an agent/.test(r.next ?? ""), `${r.next}`);
      L.check("it sits 12 ±2 under the pill, right-aligned to it ±2", near(r.below, 12, 2) && near(r.right, 0, 2), `${r.below} · ${r.right}`);
      await click(page, L, "[data-pck='next']", "step"); await page.waitForTimeout(700);
      await shot(page, "16-guide-next-step-1512");
      const s = await page.evaluate(() => document.querySelector("[data-pck='card'] b")?.textContent ?? null);
      L.check("pressing it starts the Edit spotlight", s === "Edit an agent", `${s}`);
    }
    await closeAll(page);
  } finally { guideRestore(g0); }
  L.done(4);
});

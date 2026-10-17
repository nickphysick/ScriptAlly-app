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
  B2: { css: `@media (min-width: 768px) { .clv-group > .cl17-hd + .clv-main, .clv-group > .cl17-hd ~ .clv-main { margin-top: 22px !important; } }` },
  C2: { css: `.cl183-pk { margin-top: 2px !important; }` },
  C3: { css: `.cl16-list .clv-row[data-clv="row"] > .clv-rtray.clv-rtray { position: absolute !important; right: 14px !important; top: 3px !important; bottom: 3px !important; grid-column: auto !important; padding-left: 30px !important; background: linear-gradient(90deg, transparent, #fdfbf8 18px) !important; } .cl16-list .clv-row[data-clv="row"]:is(:hover, :focus-within) > :is(.clv-rq, .clv-rrep) { opacity: 1 !important; visibility: visible !important; }` },
  E1: { js: `(() => { new MutationObserver(() => { const s = [...document.querySelectorAll('.cl18-lh .ltb-search')].find((e) => e.getBoundingClientRect().height > 0); const m = [...document.querySelectorAll('.lpop, [role="menu"]')].find((e) => e.getBoundingClientRect().height > 0 && /Group the list by/i.test(e.textContent || "")); if (s && m && !m.dataset.mut) { m.dataset.mut = "1"; m.style.setProperty("left", s.getBoundingClientRect().left + "px", "important"); m.style.setProperty("position", "fixed", "important"); } }).observe(document.body, { subtree: true, childList: true, attributes: true }); })()` },
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

test("A4 · front: the drawer is in front of the pinned row", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A4");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "A4");
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; const lh = [...document.querySelectorAll<HTMLElement>(".cl18-lh")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop += lh.getBoundingClientRect().top - sc.getBoundingClientRect().top + 900; });
    await page.waitForTimeout(500);
    await openHome(page);
    await shot(page, `04-hk-over-pinned-row-${vp.width}`);
    const r = await page.evaluate(() => {
      const lh = [...document.querySelectorAll<HTMLElement>(".cl18-lh")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
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

test("B2 · spacing 14 / 34 / 54, the last equal to the Query Centre's", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B2");
  const gaps = (sel: { hd: string; strip: string; row: string; navy: string }) => page.evaluate((s) => {
    const v = (q: string) => [...document.querySelectorAll<HTMLElement>(q)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const sc = v(".wpg-scroll"); if (sc) sc.scrollTop = 0;
    const sheet = v(".ws-window")!.getBoundingClientRect(), hd = v(s.hd);
    const strip = hd?.querySelector<HTMLElement>(s.strip)?.getBoundingClientRect(), row = hd?.querySelector<HTMLElement>(s.row)?.getBoundingClientRect(), navy = v(s.navy)?.getBoundingClientRect();
    return strip && row && navy ? { a: strip.top - sheet.top, b: row.top - strip.bottom, c: navy.top - row.bottom } : null;
  }, sel);
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "B2");
    const cl = await gaps({ hd: ".cl17-hd", strip: ".cl18-tabs", row: ".cl17-tr", navy: ".cl18-lh" });
    await shot(page, `01-page-${vp.width}`);
    await openRoute(page, "/queries"); await page.setViewportSize(vp); await page.waitForTimeout(2500);
    await mutate(page, "B2");
    const qc = await gaps({ hd: ".qc138-hd", strip: '[data-qc138="status-row"]', row: '[data-qc138="header-row"]', navy: ".qc138-top" });
    L.check(`${w} both pages measured`, !!cl && !!qc, JSON.stringify({ cl, qc }));
    if (cl && qc) {
      L.check(`${w} strip top − sheet top = 14 ±2`, near(cl.a, 14, 2), cl.a.toFixed(1));
      L.check(`${w} title row top − strip bottom = 34 ±2`, near(cl.b, 34, 2), cl.b.toFixed(1));
      L.check(`${w} navy top − title row bottom = 54 ±2`, near(cl.c, 54, 2), cl.c.toFixed(1));
      L.check(`${w} …and equals the Query Centre's (${qc.c.toFixed(1)}) ±2`, near(cl.c, qc.c, 2), cl.c.toFixed(1));
    }
  }
  L.done(10);
});

/* ───────────────────────── C · the row peek ───────────────────────── */
test("C1 · peek: the closed row's ground, three contact pills from the name's left, dashed when missing, nothing else", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "C1");
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).slice(0, 14).map((e) => e.dataset.agentCard!));
    let seenMissing = 0, seenFull = 0, peeks = 0;
    for (const id of ids) {
      const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
      await row.scrollIntoViewIfNeeded(); await row.hover(); await page.waitForTimeout(750);
      const p = await page.evaluate((id) => {
        const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
        const closed = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].find((e) => e.getBoundingClientRect().height > 0 && !e.hasAttribute("data-peek"))!;
        const pills = [...el.querySelectorAll<HTMLElement>('[data-cl183="peek-pill"]')];
        const name = el.querySelector<HTMLElement>(".clv-name, [data-clv='name'], h3, b")!;
        const pk = el.querySelector<HTMLElement>(".cl183-pk");
        const site = pills.find((x) => x.dataset.k === "website");
        return {
          open: el.hasAttribute("data-peek"), bg: getComputedStyle(el).backgroundColor, closedBg: getComputedStyle(closed).backgroundColor,
          ks: pills.map((x) => x.dataset.k), firstL: pills[0]?.getBoundingClientRect().left ?? null, nameL: name.getBoundingClientRect().left,
          missing: pills.filter((x) => x.hasAttribute("data-missing")).map((x) => ({ k: x.dataset.k, dashed: getComputedStyle(x).borderStyle.includes("dashed") || getComputedStyle(x).outlineStyle.includes("dashed") })),
          extra: !!pk && /wishlist|looking for|note/i.test([...pk.querySelectorAll("p, blockquote, .clv-wish, [data-cl18='wish']")].map((e) => e.textContent).join(" ")),
          rel: site && !site.hasAttribute("data-missing") ? (site.closest("a") ?? site.querySelector("a") ?? site).getAttribute("rel") : "n/a",
        };
      }, id);
      if (!p.open) continue;
      peeks += 1;
      L.check(`${w} ${id}: the open row's ground is a closed row's`, p.bg === p.closedBg, `${p.bg} vs ${p.closedBg}`);
      L.check(`${w} ${id}: exactly the three pills, in order`, JSON.stringify(p.ks) === JSON.stringify(["email", "website", "social"]), JSON.stringify(p.ks));
      L.check(`${w} ${id}: the first pill's left is the name's ±1`, near(p.firstL, p.nameL, 1), `${p.firstL} vs ${p.nameL}`);
      for (const m of p.missing) L.check(`${w} ${id}: the missing ${m.k} is dashed`, m.dashed, `${m.dashed}`);
      L.check(`${w} ${id}: no wishlist or notes text`, !p.extra, `${p.extra}`);
      if (p.rel !== "n/a") { seenFull += 1; L.check(`${w} ${id}: the website's rel has noopener`, /noopener/.test(p.rel ?? ""), `${p.rel}`); }
      if (p.missing.some((m) => m.k === "email" || m.k === "social")) seenMissing += 1;
      await page.mouse.move(5, 5); await page.waitForTimeout(250);
      if (peeks >= 6 && seenMissing && seenFull) break;
    }
    L.check(`${w} peeks were opened`, peeks > 0, `${peeks}`);
    L.check(`${w} a missing email or social was seen (the dashed branch)`, seenMissing > 0, `${seenMissing}`);
  }
  L.done(14);
});

/* ───────────────────────── C2 · the peek's spacing (v18.3.1) ───────────────────────── */
test("C2 · spacing: pills 16 (14) under the main line and 18 (16) above the row's foot; nothing else moves", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("C2");
  const boxes = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
    return rows.map((r) => ({ id: r.dataset.agentCard!, top: r.getBoundingClientRect().top, h: r.getBoundingClientRect().height, agy: r.querySelector<HTMLElement>(".clv-rwn")?.getBoundingClientRect().bottom ?? null }));
  });
  let seenFull = 0, seenCompact = 0;
  for (const vp of [...SIZES, { width: 1920, height: 1080 }]) {
    const w = `@${vp.width}`;
    await open(page, vp, "C2");
    const full = await page.evaluate(() => !!document.querySelector(".ws-app.sheet-wide"));
    if (full) seenFull += 1; else seenCompact += 1;
    const want = full ? { top: 16, foot: 18 } : { top: 14, foot: 16 };
    /* rows with an agency line, past the first, so there is a row above and below */
    const ids = (await boxes()).filter((b) => b.agy != null).slice(1, 4).map((b) => b.id);
    L.check(`${w} rows to open (the population)`, ids.length >= 2, `${ids.length}`);
    for (const id of ids) {
      const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
      await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const before = await boxes();
      await row.hover(); await page.waitForTimeout(800);
      const r = await page.evaluate((id) => {
        const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
        const pills = [...el.querySelectorAll<HTMLElement>('[data-cl183="peek-pill"]')].map((p) => p.getBoundingClientRect());
        /* the main line: the name and agency block */
        const agy = el.querySelector<HTMLElement>(".clv-rwn")!.getBoundingClientRect();
        const rb = el.getBoundingClientRect();
        return { open: el.hasAttribute("data-peek"), n: pills.length, pTop: Math.min(...pills.map((p) => p.top)), pBot: Math.max(...pills.map((p) => p.bottom)), agyB: agy.bottom, rowB: rb.bottom };
      }, id);
      const after = await boxes();
      L.check(`${w} ${id}: the peek opened`, r.open && r.n === 3, `${r.open} · ${r.n}`);
      if (!r.open) continue;
      L.check(`${w} ${id}: pills' top − main line's bottom = ${want.top} ±1`, near(r.pTop - r.agyB, want.top, 1), (r.pTop - r.agyB).toFixed(1));
      L.check(`${w} ${id}: row's bottom − pills' bottom = ${want.foot} ±1`, near(r.rowB - r.pBot, want.foot, 1), (r.rowB - r.pBot).toFixed(1));
      const i = before.findIndex((b) => b.id === id);
      const grow = after[i].h - before[i].h;
      L.check(`${w} ${id}: the main line does not move (±0.5)`, near(after[i].agy, before[i].agy ?? NaN, 0.5), `${before[i].agy} → ${after[i].agy}`);
      L.check(`${w} ${id}: the row grows by exactly the peek (${want.top} + pills + foot − its resting foot)`, grow > 0 && near(after[i].top + after[i].h - (r.pBot + want.foot), 0, 1), grow.toFixed(1));
      L.check(`${w} ${id}: the rows above do not move`, before.slice(0, i).every((b, k) => near(after[k].top, b.top, 0.5)), "");
      L.check(`${w} ${id}: the row below moves by exactly the growth`, i + 1 >= before.length || near(after[i + 1].top - before[i + 1].top, grow, 0.5), i + 1 < before.length ? `${(after[i + 1].top - before[i + 1].top).toFixed(1)} vs ${grow.toFixed(1)}` : "last");
    }
    await page.mouse.move(5, 5);
  }
  L.check("both the full and the compact branch were measured", seenFull > 0 && seenCompact > 0, `${seenFull} full · ${seenCompact} compact`);
  L.done(40);
});

/* C2d — C2's details half: Copy and the ↗ (the pack's C2 names Copy; the ↗ is held here beside it) */
test("C2d · pills' details: Copy is v18's small button, 22 tall with a ring; the website's ↗ is 13px navy", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("C2d");
  /* the harness account has no agent with a website, so the bare fixture gets one for this read and is re-seeded after */
  reseed();
  { const { db, uid } = await harnessDb(); await updateDoc(doc(db, "users", uid, "agents", BARE), { website: "https://example.com/agency" }); }
  try {
  await open(page, SIZES[0], "C3");
  const all = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.agentCard!));
  const ids = [BARE, ...all.filter((x) => x !== BARE)];
  let copy = 0, arrow = 0;
  for (const id of ids) {
    if (copy && arrow) break;
    const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
    await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(250);
    await row.hover(); await page.waitForTimeout(800);
    const r = await page.evaluate((id) => {
      const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
      const c = el.querySelector<HTMLElement>('[data-cl18="peek-copy"]');
      const a = el.querySelector<HTMLElement>('[data-cl183="peek-pill"][data-k="website"] [data-cl183="ext"]');
      const cs = c ? getComputedStyle(c) : null, as = a ? getComputedStyle(a) : null;
      return { c: cs && { fs: cs.fontSize, ff: cs.fontFamily, rad: cs.borderTopLeftRadius, ring: cs.boxShadow, h: c!.getBoundingClientRect().height, pad: cs.padding }, a: as && { fs: as.fontSize, col: as.color } };
    }, id);
    if (r.c && !copy) { copy++; L.check("Copy is mono 11", r.c.fs === "11px" && /Mono/i.test(r.c.ff), JSON.stringify(r.c)); L.check("Copy has radius 6 and a non-transparent inset ring", r.c.rad === "6px" && /inset/.test(r.c.ring) && !/rgba\([^)]*, 0\)/.test(r.c.ring), JSON.stringify(r.c)); L.check("Copy is 22 tall (±1) with padding 0 8px", near(r.c.h, 22, 1) && r.c.pad === "0px 8px", JSON.stringify(r.c)); }
    if (r.a && !arrow) { arrow++; L.check("the ↗ is 13px", r.a.fs === "13px", JSON.stringify(r.a)); L.check("the ↗ is navy #2d3a50", r.a.col === "rgb(45, 58, 80)", JSON.stringify(r.a)); }
  }
  L.check("an agent with an email and one with a website were found", copy > 0 && arrow > 0, `${copy} · ${arrow}`);
  } finally { reseed(); }
  L.done(6);
});

/* ───────────────────────── C3 · the hover actions (v18.3.1 §B) ───────────────────────── */
test("C3 · actions: in the status cell (reaching left over Replies only), on the main line, the status content swapped out", async ({ page }) => {
  test.setTimeout(500_000);
  const L = new Ledger("C3");
  let queried = 0, notQueried = 0, peeked = 0;
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "C3");
    const pick = await page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0);
      const q = rows.filter((r) => !r.querySelector(".cl17-log")).slice(0, 2), n = rows.filter((r) => r.querySelector(".cl17-log")).slice(1, 3);
      return [...q, ...n].map((r) => ({ id: r.dataset.agentCard!, log: !!r.querySelector(".cl17-log") }));
    });
    L.check(`${w} queried and not-queried rows to hover (the population)`, pick.some((p) => p.log) && pick.some((p) => !p.log), JSON.stringify(pick));
    for (const { id, log } of pick) {
      const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
      await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(350);
      const box = await row.boundingBox();
      await page.mouse.move(box!.x + 60, box!.y + 20);
      const read = (phase: string) => page.evaluate(([id, phase]) => {
        const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
        const cs = getComputedStyle(el), rb = el.getBoundingClientRect();
        /* the columns from the row's own grid: left = row's content edge + tracks + gaps */
        const tracks = cs.gridTemplateColumns.split(" ").map(parseFloat), gap = parseFloat(cs.columnGap) || 0;
        const lefts: number[] = []; let x = rb.left + parseFloat(cs.paddingLeft);
        for (const t of tracks) { lefts.push(x); x += t + gap; }
        const status = { l: lefts[3], r: lefts[3] + tracks[3] }, repL = lefts[2];
        const tray = el.querySelector<HTMLElement>(".clv-rtray")!;
        const acts = [...tray.children].map((c) => (c as HTMLElement).getBoundingClientRect()).filter((b) => b.width > 0);
        const wn = el.querySelector<HTMLElement>(".clv-rwn")!.getBoundingClientRect();
        const mainC = wn.top + wn.height / 2;
        const tb = tray.getBoundingClientRect();
        const hit = document.elementFromPoint(status.l + 4, mainC);
        const q = el.querySelector<HTMLElement>(".clv-rq")!;
        return {
          phase, peek: el.hasAttribute("data-peek"), n: acts.length,
          right: Math.max(...acts.map((b) => b.right)), left: Math.min(...acts.map((b) => b.left)), statusR: status.r, repL,
          trayC: tb.top + tb.height / 2, mainC, trayBg: getComputedStyle(tray).backgroundImage + "|" + getComputedStyle(tray).backgroundColor,
          hitOk: !!hit && (hit === el || tray.contains(hit) || (el.contains(hit) && !q.contains(hit) && !el.querySelector(".clv-rrep")!.contains(hit))), hit: hit ? `${hit.tagName}.${(hit as HTMLElement).className}` : null,
          qVis: getComputedStyle(q).visibility, inRow: acts.every((b) => b.top >= rb.top && b.bottom <= rb.bottom),
        };
      }, [id, phase] as const);
      await page.waitForTimeout(200);
      const closed = await read("peek closed");
      await page.waitForTimeout(700);
      const opened = await read("peek open");
      for (const r of [closed, opened]) {
        const t = `${w} ${id} (${log ? "not queried" : "queried"}, ${r.phase})`;
        L.check(`${t}: actions shown`, r.n >= 1, `${r.n}`);
        L.check(`${t}: (a) the actions' right edge is the status cell's ±1`, near(r.right, r.statusR, 1), `${r.right.toFixed(1)} vs ${r.statusR.toFixed(1)}`);
        L.check(`${t}: (a) nothing past the Replies column's left`, r.left >= r.repL - 0.5, `${r.left.toFixed(1)} vs ${r.repL.toFixed(1)}`);
        L.check(`${t}: (b) 4px inside the status cell, at the main line, is the row or an action`, r.hitOk, `${r.hit}`);
        L.check(`${t}: (c) the actions' centre is the main line's ±1`, near(r.trayC, r.mainC, 1), `${r.trayC.toFixed(1)} vs ${r.mainC.toFixed(1)}`);
        L.check(`${t}: no background of its own`, /none\|rgba\(0, 0, 0, 0\)/.test(r.trayBg), r.trayBg);
        L.check(`${t}: (d) the status content is hidden`, r.qVis === "hidden", r.qVis);
      }
      if (opened.peek) peeked += 1;
      if (log) notQueried += 1; else queried += 1;
      await page.mouse.move(5, 5); await page.waitForTimeout(200);
      const back = await page.evaluate((id) => { const el = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!; return getComputedStyle(el.querySelector(".clv-rq")!).visibility; }, id);
      L.check(`${w} ${id}: (d) the status content is visible again 200ms after leaving`, back === "visible", back);
    }
  }
  L.check("both branches (queried and not-queried rows) and an open peek were measured", queried > 0 && notQueried > 0 && peeked > 0, `${queried} · ${notQueried} · ${peeked}`);
  L.done(60);
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
const navyRead = (page: Page, row: string) => page.evaluate((row) => {
  const n = [...document.querySelectorAll<HTMLElement>(row)].find((e) => e.getBoundingClientRect().height > 0)!;
  const r = n.querySelector<HTMLElement>(".ltb-r");
  const ctl = r ? [...r.querySelectorAll<HTMLElement>(":scope > *")].flatMap((c) => c.matches(".ltb-search, .ltb-ctl, .ltb-dens, .plb, .ltb-round") ? [c] : [...c.querySelectorAll<HTMLElement>(".ltb-search, .ltb-ctl, .ltb-dens, .plb, .ltb-round")]) : [];
  const chip = n.querySelector<HTMLElement>(".ltb-chip");
  return {
    h: n.getBoundingClientRect().height, ctl: ctl.map((c) => Math.round(c.getBoundingClientRect().height * 10) / 10),
    sort: [...n.querySelectorAll<HTMLElement>("*")].some((e) => e.children.length === 0 && /\bSort\b/.test(e.textContent ?? "") && e.getBoundingClientRect().height > 0),
    chip: chip ? chip.textContent!.replace(/\s+/g, " ").replace("⌄", "").trim() : null, chipL: chip?.getBoundingClientRect().left ?? null,
  };
}, row);
const menuLeft = (page: Page) => page.evaluate(() => {
  const m = [...document.querySelectorAll<HTMLElement>('.lpop, [role="menu"], .qc138-gmenu')].find((e) => e.getBoundingClientRect().height > 0 && /group/i.test(e.textContent ?? ""));
  return m ? m.getBoundingClientRect().left : null;
});

test("E1 · toolbar: 64 tall, every right control 36, no 'Sort', 'Grouped by {Group}' with its menu under the chip — on both pages", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "E1");
    await page.locator(".cl18-lh").filter({ visible: true }).first().scrollIntoViewIfNeeded();
    const c = await navyRead(page, ".cl18-lh");
    await click(page, L, "[data-ltb='chip']", `${w} Contact list`); await page.waitForTimeout(400);
    await shot(page, `07-group-menu-${vp.width}`);
    const cm = await menuLeft(page);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await openRoute(page, "/queries"); await page.setViewportSize(vp); await page.waitForTimeout(2500);
    await mutate(page, "E1");
    await page.locator(".qc138-top").filter({ visible: true }).first().scrollIntoViewIfNeeded();
    const q = await navyRead(page, ".qc138-top");
    await shot(page, `x-qc-toolbar-${vp.width}`);
    await click(page, L, ".qc138-top .ltb-chip", `${w} Query Centre`); await page.waitForTimeout(400);
    const qm = await menuLeft(page);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    for (const [pg, r, ml] of [["Contact list", c, cm], ["Query Centre", q, qm]] as const) {
      L.check(`${w} ${pg}: the navy row is 64 ±1`, near(r.h, 64, 1), `${r.h}`);
      L.check(`${w} ${pg}: right-hand controls found`, r.ctl.length >= 4, JSON.stringify(r.ctl));
      L.check(`${w} ${pg}: every right-hand control is 36 ±1`, r.ctl.length > 0 && r.ctl.every((h) => near(h, 36, 1)), JSON.stringify(r.ctl));
      L.check(`${w} ${pg}: nothing in it reads "Sort"`, !r.sort, `${r.sort}`);
      L.check(`${w} ${pg}: the chip reads "Grouped by {Group}"`, /^Grouped by \S/.test(r.chip ?? ""), `${r.chip}`);
      L.check(`${w} ${pg}: its menu's left is the chip's ±2`, near(ml, r.chipL ?? NaN, 2), `${ml} vs ${r.chipL}`);
    }
  }
  L.done(24);
});

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

test("E3 · grouped: one headings row; clicking Replies sorts every group", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E3");
  await open(page, SIZES[0], "E3");
  if (!(await click(page, L, "[data-ltb='chip']", "the grouping chip")) || !(await click(page, L, '[data-opt="group:status"]', "Status"))) { L.done(1); return; }
  await page.waitForTimeout(800);
  await shot(page, "08-grouped-status-1512");
  const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-group .lt-labels")].filter((e) => e.getBoundingClientRect().height > 0).length);
  const groups = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist .clv-grp")].filter((e) => e.getBoundingClientRect().height > 0).length);
  L.check("the list is grouped (precondition: more than one group)", groups > 1, `${groups}`);
  L.check("exactly one headings row is visible", n === 1, `${n}`);
  const replies = page.locator(".clv-group .lt-labels .lt-lab").filter({ hasText: /Replies/i }).first();
  await replies.click({ timeout: 8000 }).catch(() => L.check("the Replies heading can be pressed", false, "missing")); await page.waitForTimeout(700);
  const sorted = await page.evaluate(() => {
    const wk = (t: string) => { const m = t.match(/~?(\d+)\s*wks?/); return m ? Number(m[1]) : Infinity; };
    return [...document.querySelectorAll<HTMLElement>(".aglist .clv-grp")].filter((e) => e.getBoundingClientRect().height > 0).map((g) => {
      const ws = [...g.querySelectorAll<HTMLElement>("[data-clv='row']")].map((r) => wk(r.querySelector<HTMLElement>(".cl14-rep, [data-clv='replies'], .clv-rep")?.textContent ?? r.textContent ?? ""));
      const up = ws.every((v, i) => i === 0 || v >= ws[i - 1]), down = ws.every((v, i) => i === 0 || v <= ws[i - 1]);
      return { n: ws.length, ok: up || down, ws };
    });
  });
  const labOn = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-group .lt-labels .lt-lab.on")].map((e) => e.textContent?.trim()));
  L.check("Replies is now the sort column", labOn.some((t) => /Replies/i.test(t ?? "")), JSON.stringify(labOn));
  for (const [i, g] of sorted.entries()) if (g.n > 1) L.check(`group ${i + 1}'s rows are in reply-time order`, g.ok, JSON.stringify(g.ws));
  await page.locator("[data-ltb='chip']").filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
  await page.locator('[data-opt="group:none"]').click({ timeout: 5000 }).catch(() => {});
  await page.locator(".clv-group .lt-labels .lt-lab").first().click().catch(() => {});
  L.done(4);
});

/* ───────────────────────── F · the page guide ───────────────────────── */
const centreY = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return r.top + r.height / 2; }, sel);

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
      L.check(`${w} and "2/5"`, r.n === "2/5", `${r.n}`);
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
      guideSet("--clear"); guideSet("--seen"); guideSet("--done add,search,open,edit,hk");
      await page.reload(); await page.waitForTimeout(3000);
      L.check(`${w} with all five done the pill is absent`, (await page.locator("[data-pck='pill']").count()) === 0, "");
    }
  } finally { guideRestore(g0); }
  L.done(18);
});

test("F2 · show: a checklist row changes nothing, closes the checklist, and shows the dim with a hole around the target and the step card", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("F2");
  const g0 = guideNow();
  try {
    guideSet("--clear"); guideSet("--seen");
    await open(page, SIZES[0], "F2");
    await page.waitForTimeout(600);
    const targets: Record<string, string> = { add: ".aglist [data-cl17='add']", search: ".aglist .cl18-lh [data-cl17='find']", open: ".aglist [data-clv='row'][data-agent-card]", edit: ".aglist [data-clv='row'][data-agent-card]", hk: ".aglist [data-cl183='fill']" };
    for (const [i, k] of ["add", "search", "open", "edit", "hk"].entries()) {
      await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(350);
      if (k === "add") await shot(page, "13-guide-open-1512");
      await click(page, L, `[data-pck='item'][data-k='${k}'] button`, k); await page.waitForTimeout(700);
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
          find: (document.querySelector<HTMLInputElement>(".aglist .cl18-lh [data-cl17='find'] input")?.value ?? "") === "",
        };
      }, targets[k]);
      L.check(`${k}: the checklist closed`, !r.pop, `${r.pop}`);
      L.check(`${k}: the dim shows`, r.dim, `${r.dim}`);
      L.check(`${k}: the step card shows "Step ${i + 1} of 5"`, r.card && /Step\s+\d\s+of\s+5/i.test(r.step ?? "") && r.step!.includes(`${i + 1}`), `${r.step}`);
      L.check(`${k}: the hole contains the target`, r.contains, `${r.contains}`);
      L.check(`${k}: no panel opened, no drawer, no search typed`, !r.panel && !r.drawer && r.find, JSON.stringify(r));
      await click(page, L, "[data-pck='back']", "step"); await page.waitForTimeout(300);
      await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    }
    const g = JSON.parse(guideNow() || "null");
    L.check("nothing was ticked by the guide's own buttons", !g?.done || Object.keys(g.done).length === 0, JSON.stringify(g));
  } finally { guideRestore(g0); }
  L.done(26);
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
    const box = await page.evaluate(() => { const r = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height / 2 }; });
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
    const f = page.locator(".aglist .cl18-lh [data-cl17='find'] input").filter({ visible: true }).first();
    await f.fill("Th"); await page.waitForTimeout(1200);
    L.check("two characters tick Search (stored)", (await done()).search === true, JSON.stringify(await done()));
    await f.fill(""); await page.waitForTimeout(300);
    L.check("nothing else ticked", !(await done()).add && !(await done()).hk, JSON.stringify(await done()));
    await page.reload(); await page.waitForTimeout(3500);
    await click(page, L, "[data-pck='pill']", "step"); await page.waitForTimeout(400);
    const ui = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-pck='item']")].map((e) => [e.dataset.k, e.dataset.done === "true"])));
    L.check("after a reload the checklist shows Open, Search and Edit done", ui.open && ui.search && ui.edit && !ui.add && !ui.hk, JSON.stringify(ui));
    const cnt = await page.locator("[data-pck='count']").first().textContent({ timeout: 8000 }).catch(() => null);
    L.check("the pill reads 3/5", cnt === "3/5", `${cnt}`);
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

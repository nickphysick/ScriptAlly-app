/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v59 — the DB59 locks, measured on the rendered page (ref design-refs/dashboard-v59/).
 *
 * R1 the right column · R2 the focus card's rust edge · V1 "View task →" lands and writes nothing ·
 * P1 the panel's copy · P2 the panel fits at every size · P3 the weekly pulse · P4 one feedback
 * panel · T1 the folder tab and its badge · S1 the hawk's shadow · S2 in front, then behind ·
 * E1 the first paint · F1 one screen · L1 loading does not jump. (P5 is the rules suite:
 * tests/rules/firestore.rules.test.ts, `/betaPulse`.)
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB59_MUTATE=<name>` applies a lock's named break in the page; the code mutations are run in the
 * worktree and recorded in reports/dashboard-v59/mutation-proofs.jsonl.
 *
 * ⚠️ THE CALLABLE IS NOT DEPLOYED, so P3 answers `sendWeeklyPulse` itself (`page.route`), once with a
 * yes and once with a refusal. The betaPulse rules are not deployed either, so every read of the
 * five weeks is refused on dev and the dots draw unanswered — which is the panel's own fallback.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";
import { harnessDb, snapshotQuery, stable } from "./harnessDocs";
import { isoWeekKey } from "../../src/lib/weeklyPulse";

const DIR = "reports/dashboard-v59";
const SIZES = [
  { width: 1920, height: 1080 }, { width: 1696, height: 820 }, { width: 1536, height: 864 }, { width: 1512, height: 900 },
  { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 800 }, { width: 1280, height: 720 },
  { width: 1280, height: 680 }, { width: 1366, height: 650 }, { width: 1280, height: 650 },
] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const V1512 = { width: 1512, height: 900 };
const MUT = process.env.DB59_MUTATE ?? "";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
const MUTATIONS: Record<string, string> = {
  "R2-edge-on-band": `.d58-focus::before { bottom: auto !important; height: 40px !important; }`,
  "P2-no-height-tiers": `.d59-fwnote, .d59-fwnote > span + span { display: block !important; }`,
  "S1-no-clip": `.d59-sheet { overflow: visible !important; }`,
  "S2-column-context": `[data-d58="right"] { position: relative !important; z-index: 1 !important; }`,
  "F1-panel-260": `.d59-fw { min-height: 260px !important; }`,
  "L1-no-panel-skeleton": `[data-d58="panel"][data-loading="1"] { display: none !important; }`,
};

async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"]').first().waitFor({ timeout: 12_000 }).catch(() => {});
  if (!("__SA_DASH_HOLD_MS" in flags)) {
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  if (MUT === "R1-rows") {
    await page.evaluate(() => document.querySelector('[data-d58="rule"]')?.insertAdjacentHTML("beforebegin", '<div class="d58-row" data-d58="row">a restored row</div>'));
  } else if (MUT === "P1-copy") {
    await page.evaluate(() => { const e = document.querySelector('[data-d58="panel-note2"]'); if (e) e.textContent = "Your feedback is gratefully received!"; });
  } else if (MUTATIONS[MUT]) {
    await page.addStyleTag({ content: MUTATIONS[MUT] });
  }
  await page.waitForTimeout(700);
}

const shot = async (page: Page, name: string, vp: VP) => {
  if (!process.env.DB59_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${tag(vp)}.png`, animations: "disabled" });
};

/** One read of every box the fit and column locks ask about. */
const readPage = (page: Page) => page.evaluate(() => {
  const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const right = q('[data-d58="right"]');
  const scroller = document.querySelector<HTMLElement>(".ws-wbody");
  const panel = q('[data-d58="panel"]');
  const frame = panel?.querySelector(".d59-fwframe") ?? null;
  const fb = frame?.getBoundingClientRect();
  const panelEscapes: string[] = [];
  let panelN = 0;
  if (panel && fb) {
    for (const el of panel.querySelectorAll<HTMLElement>("*")) {
      if (el.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      panelN += 1;
      if (r.bottom > fb.bottom + 1 || r.top < fb.top - 1 || r.right > fb.right + 1 || r.left < fb.left - 1) panelEscapes.push(`${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)}`);
    }
  }
  const shown = (s: string) => { const e = panel?.querySelector<HTMLElement>(s); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none"; };
  const h = q('[data-d58="panel-h"]');
  const title = q('[data-d58="list-title"]');
  const rule = q('[data-d58="rule"]');
  const kids = right ? [...right.children].map((c) => (c as HTMLElement).dataset.d58 ?? c.className) : [];
  return {
    kids,
    right: box(right), titleRow: box(q('[data-d58="title-row"]')), title: box(title), all: box(q('[data-d58="list-all"]')),
    allText: q('[data-d58="list-all"]')?.textContent ?? null,
    titleFits: title ? title.scrollWidth <= title.clientWidth + 0.5 : null,
    focus: box(q('[data-d58="focus"]')), rule: box(rule), ruleBg: rule ? getComputedStyle(rule).backgroundColor : null,
    panel: box(panel), tab: box(q('[data-d58="tab"]')), sheet: box(document.querySelector(".ws-window")),
    /* RE-POINTED (Dashboard v60): the left column's lowest card is the Closed hoop's row */
    closed: box(q('[data-d60="closed-hoop"]')),
    rows: document.querySelectorAll('[data-d58="row"], [data-d58="group"], [data-d58="then"]').length,
    scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth } : null,
    doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    panelN, panelEscapes: panelEscapes.slice(0, 5),
    headingFits: h ? h.scrollWidth <= h.clientWidth + 0.5 : null,
    /* RETIRED (Dashboard v71): the v59 panel's tiers — the founding card's fit is DB71 F3 */
  };
});

/* ── R1 · F1 · P2 — every listed size ───────────────────────────────────────────────────────── */

/* ⚠️ RETIRED BY DASHBOARD v71: R1 (the title row, "All {n} →", the hairline — all retired from the
   querying column; DB71 L1 asserts their absence) and P2 (the v59 panel's tiers — the panel is replaced;
   DB71 F3 holds the founding card's fit). F1 stays: the page is one screen. */
test("DB59 F1 — one screen", async ({ page }) => {
  const L = new Ledger("fit");
  for (const vp of SIZES) {
    await openDash(page, vp);
    const p = await readPage(page);
    const w = tag(vp);
    const s = p.scroller!;
    L.check("F1", `${w} one screen`, !!s && s.sh <= s.ch + 1, `scroller ${s?.sh} in ${s?.ch}`);
    L.check("F1", `${w} no horizontal overflow`, !!s && s.sw <= s.cw + 1 && p.doc.sw <= p.doc.cw + 1, `scroller ${s?.sw}/${s?.cw} · doc ${p.doc.sw}/${p.doc.cw}`);
  }
  L.done(SIZES.length * 2);
});

/* ── R2 — RETIRED BY DASHBOARD v71: the focus card and its rust edge are replaced by the task card,
   whose head is tinted by the item's kind (DB71 C1). ── */

/* ── V1 — "View task →" opens where the task is completed, and writes nothing ──────────────── */

test("DB59 V1 — View task lands, and writes nothing", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("view-task");
  const states: { name: string; drop: string[]; ms?: string }[] = [
    { name: "A as the account stands", drop: [] },
    { name: "B no agents waiting", drop: ["req"] },
    { name: "B2 gone quiet", drop: ["req", "nudge"] },
    { name: "C housekeeping only", drop: ["req", "nudge", "quiet"] },
    { name: "D ready to query", drop: ["req", "nudge", "quiet", "house"] },
    { name: "E coming up", drop: ["req", "nudge", "quiet", "house", "ready"] },
  ];
  /* RETIRED (Dashboard v60): the "F first run" state. Before the first query the right column is "Ready
     for lift off?" and there is no focus card to press; DB60 P1 holds that swap, and the left column's
     doors carry "Log a query" and "Add an agent". */
  const seen: Record<string, string> = {};
  for (const s of states) {
    await openDash(page, V1512, { __SA_DASH_DROP: s.drop }, s.ms);
    /* REWRITTEN (Dashboard v71): the task card's first item — the button text stays "View task →" */
    const f = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-d71="task"][data-loading="0"]');
      return el ? { group: el.dataset.group ?? "", key: el.dataset.key ?? "", query: el.dataset.query ?? "", act: el.querySelector('[data-d71="view"]')?.textContent ?? "" } : null;
    });
    L.check("V1", `${s.name} · the button`, !!f && f.act === "View task →", `${f?.group} · "${f?.act}"`);
    if (!f) continue;
    seen[s.name] = f.group;
    const before = f.query ? await snapshotQuery(f.query).catch(() => null) : null;
    if (["req", "nudge", "quiet", "coming"].includes(f.group)) L.check("V1", `${s.name} · the query is known`, !!before, f.query || "none");
    const dialogsBefore = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((e) => e.getBoundingClientRect().width > 0).length);
    await page.locator('[data-d71="view"]').click();
    await page.waitForTimeout(1200);
    const land = await page.evaluate(() => ({
      panel: [...document.querySelectorAll<HTMLElement>("[data-qp='panel']")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-qp-id")),
      drawer: [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-qad-drawer") ?? "drawer"),
      agent: [...document.querySelectorAll<HTMLElement>(".ac.agent-card")].filter((e) => e.getBoundingClientRect().width > 0).length,
      dialogs: [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((e) => e.getBoundingClientRect().width > 0).length,
      path: location.pathname,
    }));
    const where = land.panel.length ? `query panel ${land.panel[0]}` : land.agent ? "agent card" : land.drawer.length ? `drawer ${land.drawer[0]}` : `${land.path} · ${land.dialogs - dialogsBefore} new dialog(s)`;
    const expect = f.group === "house" && f.key.startsWith("hk:") ? "agent card"
      : f.group === "ready" || f.key === "start:query" ? "drawer"
        : f.key.startsWith("start:") ? "route"
          : "query panel";
    const ok = expect === "query panel" ? land.panel.length === 1 && land.panel[0] === f.query && land.drawer.length === 0
      : expect === "agent card" ? land.agent > 0 && land.panel.length === 0
        : expect === "drawer" ? land.drawer.length > 0 && land.panel.length === 0
          : land.path !== "/dashboard" || land.drawer.length > 0 || land.dialogs > dialogsBefore;
    L.check("V1", `${s.name} · lands on the ${expect}`, ok, `${f.key} → ${where}`);
    if (before) {
      await page.waitForTimeout(600);
      const after = await snapshotQuery(f.query).catch(() => null);
      L.check("V1", `${s.name} · nothing written`, !!after && stable(after) === stable(before), after ? (stable(after) === stable(before) ? "query, log and flags unchanged" : "the query changed") : "no reading");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  console.log(`  V1 kinds seen: ${JSON.stringify(seen)}`);
  L.check("V1", "four or more kinds entered", new Set(Object.values(seen)).size >= 4, JSON.stringify(seen));
  L.done(16);
});

/* ── P1 · P4 · P3 — RETIRED BY DASHBOARD v71. The v59 panel is replaced by the founding writer card,
   with new copy and without the history dots: DB71 F1 holds the copy, DB71 F2 the pulse (a yes, a
   refusal, Noted only on the yes) and the one feedback panel from both doors and the sidebar. ── */

/* ── T1 — the folder tab and its badge ──────────────────────────────────────────────────────── */

test("DB59 T1 — the folder tab on the sheet's edge, and its unseen badge", async ({ page }) => {
  const L = new Ledger("tab");
  const { uid } = await harnessDb();
  const key = `sa.feedSeenAt.${uid}`;
  /* everything in the window unseen: the badge counts every row the drawer shows */
  await page.addInitScript(([k]) => { try { if (!sessionStorage.getItem("db59-t1")) { localStorage.setItem(k, "1"); sessionStorage.setItem("db59-t1", "1"); } } catch { /* */ } }, [key] as const);
  await openDash(page, V1512);
  const t = await page.evaluate(() => {
    const tab = document.querySelector<HTMLElement>('[data-d58="tab"]');
    const win = document.querySelector(".ws-window")!.getBoundingClientRect();
    const probe = document.createElement("i");
    probe.style.background = "var(--ink-shell)";
    document.body.appendChild(probe);
    const desk = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return tab ? { text: tab.textContent, bottom: tab.getBoundingClientRect().bottom, sheet: win.bottom, bg: getComputedStyle(tab).backgroundColor, desk, badge: tab.querySelector('[data-d58="tab-badge"]')?.textContent ?? null } : null;
  });
  L.check("T1", "population", !!t, JSON.stringify(t));
  L.check("T1", "no LAST 30 DAYS", !!t && !/LAST 30 DAYS/i.test(t.text ?? ""), `"${t?.text}"`);
  L.check("T1", "on the sheet's bottom edge", !!t && Math.abs(t.bottom - t.sheet) <= 1, `tab ${t?.bottom} · sheet ${t?.sheet}`);
  L.check("T1", "the desk's colour", !!t && t.bg === t.desk && t.bg !== "rgba(0, 0, 0, 0)", `${t?.bg} · desk ${t?.desk}`);
  await page.locator('[data-d58="tab"]').click();
  await page.waitForTimeout(700);
  /* RE-POINTED (Dashboard first visit v1): the badge counts only what came IN — the writer's own acts are never unread (A5) */
  const rows = await page.locator('[data-d58="ev"][data-dir="in"]').count();
  const expected = rows > 9 ? "9+" : rows === 0 ? null : String(rows);
  L.check("T1", "the badge is the unseen count", rows > 0 && t?.badge === expected, `badge ${t?.badge} · ${rows} incoming rows in the drawer → ${expected}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const afterOpen = await page.locator('[data-d58="tab-badge"]').count();
  L.check("T1", "opening the drawer clears it", afterOpen === 0, `${afterOpen} badge(s)`);
  await page.reload();
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const afterReload = await page.locator('[data-d58="tab-badge"]').count();
  L.check("T1", "and stays cleared after a reload", afterReload === 0, `${afterReload} badge(s)`);
  L.done(7);
});

/* ── S1 · S2 — the hawk's shadow, and a hovered card in front of it ─────────────────────────── */

test("DB59 S1 · S2 — one shadow over the cards, and a hovered card comes forward", async ({ page, browser }) => {
  const L = new Ledger("shadow");
  await openDash(page, V1512);
  const s = await page.evaluate(() => {
    const all = document.querySelectorAll('[data-d58="shadow"]');
    const e = all[0] as HTMLElement | undefined;
    const c = e ? getComputedStyle(e) : null;
    const sheet = e?.parentElement ? getComputedStyle(e.parentElement) : null;
    const sc = document.querySelector<HTMLElement>(".ws-wbody")!;
    return c ? { n: all.length, pe: c.pointerEvents, op: Number(c.opacity), blend: c.mixBlendMode, layerOverflow: sheet?.overflow, sh: sc.scrollHeight, ch: sc.clientHeight, win: (document.querySelector(".ws-window") as HTMLElement).scrollHeight - (document.querySelector(".ws-window") as HTMLElement).clientHeight } : null;
  });
  L.check("S1", "exactly one shadow", s?.n === 1, JSON.stringify(s));
  L.check("S1", "no pointer events, .145, multiply", !!s && s.pe === "none" && Math.abs(s.op - 0.145) <= 0.005 && s.blend === "multiply", JSON.stringify(s));
  L.check("S1", "the sheet clips it, and it adds no scroll", !!s && s.layerOverflow === "clip" && s.sh <= s.ch + 1 && s.win <= 0, JSON.stringify(s));
  /* the drift: with motion allowed it moves; under reduced motion it does not */
  await liftMotionSuppression(page);
  const tr = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  const a = await tr(); await page.waitForTimeout(5000); const b = await tr();
  L.check("S1", "it drifts", a !== b, `${a} → ${b}`);
  const ctx = await browser.newContext({ storageState: await page.context().storageState(), reducedMotion: "reduce", viewport: V1512 });
  const rp = await ctx.newPage();
  await openDash(rp, V1512);
  await liftMotionSuppression(rp);
  const ra = await rp.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  await rp.waitForTimeout(5000);
  const rb = await rp.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  L.check("S1", "and not under reduced motion", ra === rb, `${ra} → ${rb}`);

  /* S2 — find the task card's pixels the shadow darkens, then hover (RE-POINTED, Dashboard v71: the
     focus card is replaced by the task card, which lifts the same way) */
  const focus = (await rp.locator('[data-d71="task"]').boundingBox())!;
  const clip = { x: Math.round(focus.x) + 10, y: Math.round(focus.y) + 60, width: Math.round(focus.width) - 20, height: Math.round(focus.height) - 70 };
  await rp.addStyleTag({ content: `/*s2*/[data-d58="shadow"]{visibility:hidden!important}` });
  const bare = readPng(await rp.screenshot({ clip }));
  await rp.evaluate(() => document.querySelectorAll("style").forEach((s) => { if (s.textContent?.startsWith("/*s2*/")) s.remove(); }));
  await rp.mouse.move(5, 5);
  await rp.waitForTimeout(200);
  const rest = readPng(await rp.screenshot({ clip }));
  const pts: [number, number][] = [];
  for (let y = 4; y < bare.height - 4; y += 6) for (let x = 4; x < bare.width - 4; x += 6) {
    const [r, g, bl] = bare.at(x, y);
    if (r < 250 || g < 250 || bl < 250) continue; // flat white only, so a 2px lift cannot move content under the point
    const [r2, g2, b2] = rest.at(x, y);
    if (r - r2 >= 6 && g - g2 >= 6 && bl - b2 >= 6) pts.push([x, y]);
  }
  L.check("S2", "population: the shadow crosses the task card", pts.length >= 10, `${pts.length} darkened white points`);
  await rp.mouse.move(focus.x + focus.width / 2, focus.y + 20);
  await rp.waitForTimeout(300);
  const hov = readPng(await rp.screenshot({ clip }));
  const lighter = pts.filter(([x, y]) => { const [r, g, bl] = rest.at(x, y); const [r2, g2, b2] = hov.at(x, y); return r2 - r >= 6 && g2 - g >= 6 && b2 - bl >= 6; }).length;
  L.check("S2", "at rest darker than hovered (the card is in front of the shadow)", pts.length > 0 && lighter >= pts.length * 0.9, `${lighter} of ${pts.length} points lighter when hovered`);
  const hovT = await rp.evaluate(() => { const f = document.querySelector('[data-d71="task"]')!; return { t: getComputedStyle(f).transform, z: getComputedStyle(f).zIndex, sz: getComputedStyle(document.querySelector('[data-d58="shadow"]')!).zIndex }; });
  L.check("S2", "under reduced motion: no transform, but above the shadow", hovT.t === "none" && Number(hovT.z) > Number(hovT.sz), JSON.stringify(hovT));
  await ctx.close();
  L.done(8);
});

/* ── E1 — the first paint ───────────────────────────────────────────────────────────────────── */

test("DB59 E1 — the first paint runs once, ends true, and not under reduced motion", async ({ page, browser }) => {
  const L = new Ledger("paint");
  await openDash(page, V1512);
  /* a fresh visit with motion allowed */
  await page.goto("/dashboard");
  const sawPaint = await page.locator('.d58[data-paint="1"]').waitFor({ timeout: 20_000 }).then(() => true, () => false);
  const mid = await page.evaluate(() => ({ left: getComputedStyle(document.querySelector(".d58-left")!).animationName, right: getComputedStyle(document.querySelector(".d58-right")!).animationName, counts: [...document.querySelectorAll('[data-d58="count"]')].length }));
  L.check("E1", "the paint runs on loading → loaded", sawPaint && mid.left === "d59Rise" && mid.right === "d59Rise" && mid.counts >= 3, JSON.stringify({ sawPaint, ...mid }));
  await page.waitForTimeout(1800);
  const end = await page.evaluate(() => ({
    attr: document.querySelector(".d58")?.getAttribute("data-paint") ?? null,
    figures: [...document.querySelectorAll<HTMLElement>('[data-d58="count"]')].map((e) => ({ text: e.textContent, value: e.getAttribute("value"), shown: getComputedStyle(e, "::after").content })),
  }));
  L.check("E1", "it ends, and the figures are the true figures", end.attr === null && end.figures.every((f) => f.text?.replace(/,/g, "") === f.value && f.shown === "none"), JSON.stringify(end));
  /* not again: a drawer open and close, a resize, a re-render */
  await page.locator('[data-d58="tab"]').click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  await page.locator('[data-d71="next"]').click({ timeout: 2000 }).catch(() => {});
  const again = await page.evaluate(() => new Promise<boolean>((res) => {
    const root = document.querySelector(".d58");
    let seen = root?.getAttribute("data-paint") === "1";
    const mo = new MutationObserver(() => { if (root?.getAttribute("data-paint") === "1") seen = true; });
    if (root) mo.observe(root, { attributes: true });
    setTimeout(() => { mo.disconnect(); res(seen); }, 1500);
  }));
  L.check("E1", "not after a drawer close, a resize or a step", again === false, `paint seen again: ${again}`);
  /* reduced motion */
  const ctx = await browser.newContext({ storageState: await page.context().storageState(), reducedMotion: "reduce", viewport: V1512 });
  const rp = await ctx.newPage();
  await openDash(rp, V1512);
  await rp.goto("/dashboard");
  await rp.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  const running = await rp.evaluate(() => new Promise<number>((res) => setTimeout(() => res(document.getAnimations().filter((a) => a.playState === "running" && (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".d58, .d59-sheet")).length), 200)));
  L.check("E1", "under reduced motion nothing on the page animates", running === 0, `${running} running animation(s)`);
  await ctx.close();
  L.done(4);
});

/* ── L1 — loading and loaded boxes are the same boxes ───────────────────────────────────────── */

test("DB59 L1 — loading and loaded boxes are the same boxes", async ({ page }) => {
  const L = new Ledger("loading");
  const read = () => page.evaluate(() => {
    const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const box = (s: string) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    return { header: box('[data-d58="header"]'), active: box('[data-d58="active"]'), closed: box('[data-d60="closed-hoop"]'), focus: box('[data-d71="task"]'), panel: box('[data-d58="panel"]'), tab: box('[data-d58="tab"]') };
  });
  /* RE-POINTED (Dashboard v71): "focus" is the task card; "panel" is the founding writer card */
  for (const vp of [V1512, { width: 1280, height: 800 }]) {
    await openDash(page, vp);
    await openDash(page, vp, { __SA_DASH_HOLD_MS: 6000 });
    const held = await read();
    const isLoading = await page.evaluate(() => document.querySelector('[data-d58="page"]')?.getAttribute("data-loading"));
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1800); // after the first paint has finished
    const loaded = await read();
    const w = tag(vp);
    L.check("L1", `${w} the hold is real`, isLoading === "1", `data-loading ${isLoading}`);
    for (const part of ["header", "active", "closed", "focus", "panel", "tab"] as const) {
      const a = held[part], b = loaded[part];
      const same = !!a && !!b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.w - b.w) <= 1 && Math.abs(a.h - b.h) <= 1;
      L.check("L1", `${w} ${part}`, same, a && b ? `loading ${Math.round(a.x)},${Math.round(a.y)} ${a.w.toFixed(1)}×${a.h.toFixed(1)} · loaded ${Math.round(b.x)},${Math.round(b.y)} ${b.w.toFixed(1)}×${b.h.toFixed(1)}` : `loading ${!!a} · loaded ${!!b}`);
    }
  }
  L.done(14);
});

/* ── the report's shots — RETIRED BY DASHBOARD v71: the focus card and the v59 panel are gone, and
   DB71 writes its own shots (DB71_SHOTS=1). ── */

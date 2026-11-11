/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v53 — TD53 L1–L14, measured on the rendered page (design-refs/todo-list-v53/todo-desk-v13.html and
 * todo-complete-v1.html), at 1440 × 900, 1920 × 1080 and 1366 × 768.
 * Through the emulator: `npm run e2e:emu -- tests/e2e/todoV53.measure.ts --project=measure`.
 *
 * `TD53_MUTATE=<lock>` applies that lock's named break in the page (tests/e2e/td53Mutate.sh runs each one and records
 * that its lock went red). Three cases write and put the account back in the same run: L5 logs a send, L7 a nudge, L8
 * marks a task done; each presses the snackbar's Undo (or deletes what it added) before any assertion can stop it.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openPhone } from "./pa2Lib";

const DIR = "reports/todo-list-v53";
const READ = `${DIR}/readings`;
mkdirSync(READ, { recursive: true });
const MUT = process.env.TD53_MUTATE ?? "";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 1366, height: 768 }] as const;
const PG = '[data-tws="page"]:visible';
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(name, v); };
test.afterAll(() => { for (const [name, v] of held) writeFileSync(`${READ}/${name}${MUT ? `-${MUT}` : ""}.json`, JSON.stringify(v, null, 1)); });

async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.removeItem("sa.todoTraySlim"); } catch { /* */ } });
  await openRoute(page, "/todo", vp);
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await mutate(page);
}

/* ── the named breaks (page-side) ── */
async function mutate(page: Page) {
  if (!MUT) return;
  await page.evaluate((l) => {
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    const root = () => [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    /* v54: the page may scroll by the header's height (D2), so L1's break makes the workspace 80px taller than the window */
    if (l === "L1") css(".tws .tws-ws { height: calc(var(--tws-port) + 80px) !important; }");
    if (l === "L2") css(".tws-wq { flex: 0 1 auto !important; }");
    if (l === "L3") document.addEventListener("click", (e) => { const t = e.target as HTMLElement; if (t.closest(".tws-tile")) window.setTimeout(() => (document.querySelector('[data-tws="primary"][data-next]') as HTMLElement | null)?.click(), 300); }, true);
    if (l === "L4") window.setInterval(() => document.querySelectorAll('[data-tws="check"]').forEach((e) => e.remove()), 50);
    if (l === "L5") window.setInterval(() => { const p = document.querySelector('.tws-wp[data-future] [data-qc152="pill"]'); if (p && !p.querySelector("[data-mut]")) { const x = document.createElement("i"); x.setAttribute("data-mut", ""); x.textContent = " (mutated)"; p.appendChild(x); } }, 50);
    if (l === "L6") window.setInterval(() => { const th = document.querySelector(".tws-pvz [data-qc152=\"thread\"]"); if (th && !th.querySelector(".qc1522-draft")) { const d = document.createElement("div"); d.className = "qc152-m me qc1522-draft"; th.appendChild(d); } }, 100);
    if (l === "L7") css(".tws-toast { display: none !important; }");
    if (l === "L8") css(".tws-mile { display: none !important; }");
    if (l === "L9") document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest('[data-tws="bar"] button')) { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((x) => x.getBoundingClientRect().height > 0); if (sc) { sc.style.height = "300px"; sc.scrollTop = 120; } } }, true);
    if (l === "L10") { const b = document.createElement("button"); b.setAttribute("data-tws", "start"); b.textContent = "Start here"; root()?.querySelector('[data-tws="list"]')?.prepend(b); }
    if (l === "L11") { const r = root()?.querySelector('[data-tws="figure"]'); if (r) r.textContent = "No date"; }
    if (l === "L12") window.setInterval(() => { const p = document.querySelector('[data-tws="hawk"] p'); if (p && !/keep an eye/.test(p.textContent ?? "")) p.textContent += " I’ll keep an eye out for his reply."; }, 100);
    if (l === "L13") window.setInterval(() => { const b = document.querySelector('.spanel:not(.tws-pvpanel) [data-qc152="msg-title"]'); if (b && b.textContent !== "Query sent") b.textContent = "Query sent"; }, 100);
    if (l === "L14") window.setInterval(() => { const pg = document.querySelector("[data-tdp]"); if (pg && !pg.querySelector(".tws-rail")) { const r = document.createElement("ol"); r.className = "tws-rail"; pg.appendChild(r); } }, 100);
  }, MUT);
}

const desk = (page: Page) => page.locator(`${PG} [data-tws="desk"]`);
const primary = (page: Page) => desk(page).locator('[data-tws="primary"]');

/** the open step's key ("check" on the check step), or "none" */
async function openStep(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const o = root.querySelector<HTMLElement>('[data-tws="desk"] [data-st="open"]');
    return o?.getAttribute("data-tws-step") ?? "none";
  });
}

/** answer the open question with its first choice; true if something was pressed */
async function answer(page: Page): Promise<boolean> {
  const q = desk(page).locator('[data-st="open"]').first();
  const tile = q.locator(".tws-tile:not(:disabled)").first();
  if (await tile.count()) { await tile.click(); return true; }
  const range = q.locator('input[type="range"]');
  if (await range.count()) { await range.focus(); await page.keyboard.press("ArrowRight"); return true; }
  const ta = q.locator("textarea");
  if (await ta.count()) { await ta.fill("Upmarket book club fiction."); return true; }
  return false;
}

/** the footer against the desk card: its bottom within 2px of the desk's */
async function footFit(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const d = root.querySelector<HTMLElement>('[data-tws="desk"]')?.getBoundingClientRect();
    const f = root.querySelector<HTMLElement>('[data-tws="footer"]')?.getBoundingClientRect();
    return { desk: d ? Math.round(d.bottom * 10) / 10 : null, foot: f ? Math.round(f.bottom * 10) / 10 : null, gap: d && f ? Math.abs(d.bottom - f.bottom) : 99 };
  });
}

/** the first row of each kind the tray holds (Housekeeping opened first) */
async function kinds(page: Page): Promise<{ kind: string; key: string }[]> {
  const qf = page.locator(`${PG} [data-tws-group="house"] .tws-gb[aria-expanded="false"]`);
  if (await qf.count()) await qf.click();
  const more = page.locator(`${PG} .tws-more`);
  if (await more.count()) await more.first().click();
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const out: { kind: string; key: string }[] = []; const seen = new Set<string>();
    for (const r of root.querySelectorAll<HTMLElement>("[data-tws-row]")) {
      const k = r.getAttribute("data-kind") ?? "?";
      /* ⚠️ v54 (D5): the "Fill in what you sent" batch no longer ends on "Check it, then log it" — it is two steps ending
         "Log it for {n} queries" (todoV54.measure.ts L7, L8 hold it) — so this walk leaves it out */
      if (k === "batch") continue;
      const kk = k === "fix" ? `fix:${(r.querySelector(".tws-tx b")?.textContent ?? "").match(/reply|wishlist|want sent/)?.[0] ?? "x"}` : k;
      if (seen.has(kk)) continue; seen.add(kk);
      out.push({ kind: kk, key: r.getAttribute("data-tws-row")! });
    }
    return out;
  });
}

/* L12: no agent is ever "he" or "she" anywhere on the desk; and the hawk (its bubble and the check step it writes) never
   claims to watch, check or hear from anyone — the writer's own answers ("To hear from the others first") are theirs */
const PRONOUN = /\b(he|she|him|her|his|hers)\b/i;
const HAWK_CLAIM = /keep an eye|watch(es|ing)?\b|I’ll check|I'll check|hear(s)? from|I’ll hear|I'll hear/i;

/** walk one task through every step to its end; read the footer and the copy on each */
async function walk(page: Page, key: string) {
  await page.locator(`${PG} [data-tws-row="${key}"]`).click();
  await page.waitForTimeout(300);
  const steps: { step: string; gap: number }[] = [];
  const copy: string[] = [];
  let end = "none";
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(150);
    const step = await openStep(page);
    steps.push({ step, gap: (await footFit(page)).gap });
    copy.push(await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const d = root.querySelector<HTMLElement>('[data-tws="desk"]');
      const hawk = [...root.querySelectorAll<HTMLElement>('[data-tws="hawk"], [data-tws="story"]')].map((e) => e.innerText).join(" ");
      return JSON.stringify({ all: d?.innerText ?? "", hawk });
    }));
    if (step === "check") { end = "check"; break; }
    if (step === "none") { end = "none"; break; }
    await answer(page);
    const nx = primary(page).and(page.locator("[data-next]"));
    if (!(await nx.count()) || !(await nx.isEnabled())) { end = "door"; break; }
    await nx.click();
  }
  const check = end === "check" ? await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const c = root.querySelector<HTMLElement>('[data-tws="check"]')!;
    const h = c.querySelector<HTMLElement>(".tws-chh");
    return {
      head: (h?.textContent ?? "").trim(), mb: h ? getComputedStyle(h).marginBottom : null,
      points: [...c.querySelectorAll('[data-tws="timeline"] li')].map((li) => ({ at: li.getAttribute("data-tws-at"), what: (li.querySelector(".tws-twhat")?.textContent ?? "").trim() })),
      hawk: !!root.querySelector('[data-tws="hawk"]'),
      primary: (root.querySelector('[data-tws="primary"]')?.textContent ?? "").trim(),
    };
  }) : null;
  return { steps, end, check, copy };
}

/* ══ L1 · the page never scrolls; L2 · the footer is pinned on every step; L4 · every kind ends on the check step;
   L12 · the copy (all at each size) ══════════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L1 + L2 + L4 + L12 · the page fits, the footer is pinned, every kind ends on "Check it, then log it" (${vp.width})`, async ({ page }) => {
    test.setTimeout(240_000);
    await open(page, vp);
    /* ⚠️ RE-POINTED BY v54 (D2): the header scrolls away and the workspace pins, so the page may scroll by AT MOST the
       header's height (todoV54.measure.ts L1 holds the rest: once it has, the frame fills the window). */
    const fit = await page.evaluate(() => {
      const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const hd = sc.querySelector<HTMLElement>('[data-tws="header"]');
      return { sh: sc.scrollHeight, ch: sc.clientHeight, hd: hd ? hd.offsetHeight : 0 };
    });
    expect(fit.ch, "L1 · a real scrollport").toBeGreaterThan(300);
    expect(fit.hd, "L1 · the page header is there").toBeGreaterThan(100);
    expect(fit.sh - fit.ch, "L1 · the page scrolls by no more than the header's height").toBeLessThanOrEqual(fit.hd);
    const ks = await kinds(page);
    expect(ks.length, "kinds on the account").toBeGreaterThanOrEqual(6);
    const out: Record<string, unknown> = {};
    for (const k of ks) {
      const w = await walk(page, k.key);
      out[k.kind] = { end: w.end, steps: w.steps, check: w.check };
      for (const s of w.steps) expect(s.gap, `L2 · ${k.kind} at ${s.step}: the footer's bottom on the desk's`).toBeLessThanOrEqual(2);
      if (k.kind !== "own" && w.end !== "door" && k.kind !== "other") {
        expect(w.end, `L4 · ${k.kind} ends on the check step`).toBe("check");
        expect(w.check!.head, `L4 · ${k.kind}: the heading`).toBe("Check it, then log it");
        expect(w.check!.mb, `L4 · ${k.kind}: 14px under the heading`).toBe("14px");
        expect(w.check!.points.length, `L4 · ${k.kind}: one to three dated points`).toBeGreaterThanOrEqual(1);
        expect(w.check!.points.length).toBeLessThanOrEqual(3);
        expect(w.check!.hawk, `L4 · ${k.kind}: the hawk steps aside on the check step`).toBe(false);
        expect(w.check!.primary, `L4 · ${k.kind}: the button`).toMatch(/^(Log it|Close it)$/);
      }
      for (const c of w.copy) {
        const { all, hawk } = JSON.parse(c) as { all: string; hawk: string };
        expect(all, `L12 · ${k.kind}: no he/she`).not.toMatch(PRONOUN);
        expect(hawk, `L12 · ${k.kind}: the hawk never watches, checks or hears from anyone`).not.toMatch(HAWK_CLAIM);
      }
      const after = await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; return sc.scrollHeight - sc.clientHeight; });
      expect(after, `L1 · ${k.kind}: still no more page scroll than the header (v54)`).toBeLessThanOrEqual(fit.hd);
    }
    note(`L1L2L4-${vp.width}`, { fit, kinds: ks.map((k) => k.kind), out });
  });
}

/* ══ L3 · a choice alone never advances ══════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L3 · a choice alone never moves on (1s) (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const send = page.locator(`${PG} [data-tws-row][data-kind="send"]`).first();
    test.skip(!(await send.count()), "no send task");
    await send.click();
    const before = await openStep(page);
    await desk(page).locator('[data-st="open"] .tws-tile').first().click();
    await page.waitForTimeout(1000);
    expect(await openStep(page), "L3 · the same step is open a second after the choice").toBe(before);
  });
}

/* ══ L6 · typing dots while questions are open; no dashed bubble anywhere ════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L6 · typing dots while the questions are open, and no dashed bubble (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const send = page.locator(`${PG} [data-tws-row][data-kind="send"]`).first();
    test.skip(!(await send.count()), "no send task");
    await send.click();
    await page.waitForTimeout(600);
    const pv = page.locator(`${PG} [data-tws="preview-card"]`);
    await expect(pv.locator('[data-qc153="typing"]'), "L6 · the dots are on the card").toHaveCount(1);
    await desk(page).locator('[data-st="open"] .tws-tile').first().click();
    await page.waitForTimeout(400);
    await expect(pv.locator('[data-qc153="typing"]')).toHaveCount(1);
    expect(await page.locator(".qc1522-draft, .qc152-m.drf").count(), "L6 · no dashed bubble anywhere").toBe(0);
  });
}

/* ══ L9 · the bar's counts are the groups'; a click scrolls the tray, never the page ═════════════════════════════ */
for (const vp of SIZES) {
  test(`L9 · the bar counts the groups, and a part scrolls the tray (${vp.width})`, async ({ page }) => {
    test.skip(true, "Retired by To-do list v55 — D1: the tray's breakdown bar and its counts line are removed; the page header's ring and legend give the breakdown (TD54 L5 holds them to the tray's groups).");
    await open(page, vp);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const grp = (id: string) => Number(root.querySelector(`[data-tws-group="${id}"] .tws-gb em`)?.textContent ?? 0);
      const bar = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-tws="bar"] button')].map((b) => [b.getAttribute("data-k"), Number(b.getAttribute("data-n"))]));
      const words = (root.querySelector('[data-tws="bar-words"]')?.textContent ?? "").replace(/\s+/g, " ");
      return { grp: { wait: grp("wait"), nudge: grp("nudge"), quiet: grp("quiet"), house: grp("house") }, bar, words };
    });
    for (const k of ["wait", "nudge", "quiet"] as const) if (r.grp[k]) expect(r.bar[k], `L9 · the bar's ${k}`).toBe(r.grp[k]);
    expect(r.words, "L9 · need you").toContain(`${r.grp.wait + r.grp.nudge + r.grp.quiet} need you`);
    if (r.grp.house) expect(r.words, "L9 · to tidy").toContain(`${r.grp.house} to tidy`);
    for (const k of ["quiet", "nudge", "wait"]) {
      const part = page.locator(`${PG} [data-tws="bar"] button[data-k="${k}"]`);
      if (!(await part.count())) continue;
      /* ⚠️ RE-POINTED BY v54 (D2): the page may scroll by the header's height now, so "the page did not scroll" is read
         as "the click left the page's scroll where it was" */
      const was = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!.scrollTop);
      await part.click();
      await page.waitForTimeout(700);
      const s = await page.evaluate((id) => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
        const list = root.querySelector<HTMLElement>('[data-tws="list"]')!;
        const h = root.querySelector<HTMLElement>(`[data-tws-group="${id}"]`)!;
        return { page: sc.scrollTop, headTop: h.getBoundingClientRect().top - list.getBoundingClientRect().top,
          atEnd: list.scrollTop + list.clientHeight >= list.scrollHeight - 2, moved: list.scrollTop };
      }, k);
      expect(s.page, `L9 · ${k}: the page did not scroll`).toBe(was);
      expect(s.headTop <= 32 || s.atEnd, `L9 · ${k}: the tray brought the group's header to its top (or as far as it goes)`).toBe(true);
    }
    note(`L9-${vp.width}`, r);
  });
}

/* ══ L10 · no Start here; L11 · no "No date" ═════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L10 + L11 · no Start here, and "No date" nowhere (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const hk = page.locator(`${PG} [data-tws-group="house"] .tws-gb[aria-expanded="false"]`);
    if (await hk.count()) await hk.click();
    /* v55 (D3, re-pointed): the old Filters menu is gone, and the new filter menu's When chip reads "No date" by Nick's
       ruling (the mock's word) — so the menu is no longer opened here; "No date" stays out of everything else */
    const t = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return { start: root.querySelectorAll('[data-tws="start"]').length, text: root.innerText };
    });
    expect(t.start, "L10 · no Start here card").toBe(0);
    expect(t.text, "L10 · no 'Start here' words").not.toMatch(/Start here/);
    expect(t.text, "L11 · no 'No date'").not.toMatch(/No date/);
    for (const k of ["quiet", "own", "fix", "batch"]) {
      const r = page.locator(`${PG} [data-tws-row][data-kind="${k}"]`).first();
      if (!(await r.count())) continue;
      await r.click();
      await page.waitForTimeout(500);
      expect(await page.locator(PG).innerText(), `L11 · ${k}: no 'No date' on the desk or the card`).not.toMatch(/No date/);
    }
  });
}

/* ── the write capture (v52's) with values: every document write on Firestore's channel while `fn` runs ── */
interface DocWrite { path: string; fields: string[]; mask: string[] | null; values: Record<string, unknown> }
async function docWritesDuring(page: Page, fn: () => Promise<void>, settleMs = 2500): Promise<DocWrite[]> {
  const out: DocWrite[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = new URLSearchParams(req.postData() ?? "");
    for (const [k, v] of body) {
      if (!/^req\d+___data__$/.test(k)) continue;
      let j: { writes?: { update?: { name: string; fields?: Record<string, unknown> }; updateMask?: { fieldPaths?: string[] } }[] };
      try { j = JSON.parse(v); } catch { continue; }
      for (const w of j.writes ?? []) {
        if (!w.update) continue;
        out.push({ path: w.update.name.split("/documents/")[1] ?? w.update.name, fields: Object.keys(w.update.fields ?? {}).sort(), mask: w.updateMask?.fieldPaths?.slice().sort() ?? null, values: w.update.fields ?? {} });
      }
    }
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(settleMs); } finally { page.off("request", on); }
  return out;
}
const strOf = (v: unknown): string => { const o = v as { stringValue?: string; timestampValue?: string } | undefined; return o?.stringValue ?? o?.timestampValue ?? ""; };
/** the local day of an ISO time (the app writes noon or midnight local) */
const dayOfIso = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function walkToCheck(page: Page, kind: string): Promise<string | null> {
  const row = page.locator(`${PG} [data-tws-row][data-kind="${kind}"]`).first();
  if (!(await row.count())) return null;
  const title = ((await row.locator(".tws-tx b").textContent()) ?? "").trim();
  await row.click();
  for (let i = 0; i < 8 && (await openStep(page)) !== "check"; i++) {
    await answer(page);
    await primary(page).and(page.locator("[data-next]")).click();
    await page.waitForTimeout(200);
  }
  return (await openStep(page)) === "check" ? title : null;
}

/** what a card shows: the band's word, the pill, the newest bubble of the save's kind, the status line, the footer */
async function cardFace(page: Page, sel: string) {
  return page.evaluate((s) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0) ?? document.body;
    const card = root.querySelector<HTMLElement>(s);
    if (!card) return null;
    const msgs = [...card.querySelectorAll<HTMLElement>('[data-qc152="msg"]')];
    const mark = card.querySelector<HTMLElement>('.qc153-chk, .qc153-lgd') ?? msgs[msgs.length - 1];
    const bub = mark?.closest<HTMLElement>('[data-qc152="msg"]') ?? mark;
    return {
      band: (card.querySelector('[data-qc152="band-word"]')?.textContent ?? "").trim(),
      pill: (card.querySelector('[data-qc152="pill"]')?.textContent ?? "").trim(),
      title: (bub?.querySelector('[data-qc152="msg-title"]')?.textContent ?? "").trim(),
      stamp: (bub?.querySelector('[data-qc152="msg-date"]')?.textContent ?? "").trim(),
      status: (card.querySelector('[data-qc153="status-line"]')?.textContent ?? "").trim(),
    };
  }, sel);
}

/* ══ L4 (the writes) + L5 · a send: the future card is the saved card, and the timeline's dates are the save's ════ */
for (const vp of SIZES) {
  test(`L4 + L5 · a send: the check step's dates are what the save writes, and the future card is the saved card (${vp.width})`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, vp);
    const title = await walkToCheck(page, "send");
    test.skip(!title, "no send task");
    const pts = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-tws="timeline"] li')].filter((e) => e.getBoundingClientRect().height > 0).map((li) => li.getAttribute("data-tws-at")));
    const future = await cardFace(page, '[data-tws="preview-card"]');
    let afterFace: Awaited<ReturnType<typeof cardFace>> = null;
    const docs = await docWritesDuring(page, async () => {
      await primary(page).click();
      await expect(page.locator(`${PG} [data-tws="preview-card"] [data-qc153="logged"]`)).toHaveCount(1, { timeout: 4000 });
      afterFace = await cardFace(page, '[data-tws="preview-card"]');
      await expect(page.locator('[data-tws="toast"] [data-tws="undo"]')).toBeVisible({ timeout: 6000 });
      await page.locator('[data-tws="toast"] [data-tws="undo"]').click();
    });
    await expect(page.locator(`${PG} [data-tws-row]`).filter({ hasText: title! }), "the account is put back").toHaveCount(1, { timeout: 20_000 });
    note(`L5-${vp.width}`, { title, pts, future, after: afterFace, docs: docs.map((d) => ({ path: d.path, fields: d.fields })) });
    const q = docs.find((d) => /^users\/[^/]+\/queries\/[^/]+$/.test(d.path) && d.fields.includes("nudgeDate"));
    expect(q, "L4 · the save writes the nudge date").toBeTruthy();
    expect(dayOfIso(strOf(q!.values.nudgeDate)), "L4 · the third point is the save's nudge date").toBe(pts[2]);
    expect(dayOfIso(strOf(q!.values.writerExpectedDate)), "L4 · the second point is the save's expected reply").toBe(pts[1]);
    expect(afterFace, "L5 · the card after the save").toBeTruthy();
    expect(future, "L5 · the future card is the saved card").toEqual(afterFace);
  });
}

/* ══ L7 · a nudge: exactly v52's three documents once each, the snackbar, Undo, and the next task opens itself ═════ */
for (const vp of SIZES) {
  test(`L7 · Log it on a nudge (${vp.width})`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, vp);
    const title = await walkToCheck(page, "nudge");
    test.skip(!title, "no nudge task");
    const thenAt = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-tws="timeline"] li')].filter((e) => e.getBoundingClientRect().height > 0).map((li) => li.getAttribute("data-tws-at"))[1]);
    let snack = "", deskAfter = "", logged = "", mile = 0, presses = 0;
    const log = primary(page);
    const docs = await docWritesDuring(page, async () => {
      await log.click(); presses++;
      await log.click({ timeout: 300 }).then(() => presses++).catch(() => undefined);
      await expect(log).toHaveText(/Logged/, { timeout: 5000 }).catch(() => undefined);
      logged = ((await log.textContent().catch(() => "")) ?? "").trim();
      await expect(page.locator('[data-tws="toast"][data-snack]'), "L7 · the snackbar appears").toBeVisible({ timeout: 6000 });
      snack = ((await page.locator('[data-tws="toast"]').textContent()) ?? "").trim();
      deskAfter = ((await desk(page).locator('[data-tws="desk-title"]').textContent()) ?? "").trim();
      mile = await page.locator(`${PG} [data-tws="milestone"]`).count();
      await page.locator('[data-tws="toast"] [data-tws="undo"]').click();
    });
    await expect(page.locator(`${PG} [data-tws-row]`).filter({ hasText: title! }), "L7 · Undo puts the task back").toHaveCount(1, { timeout: 20_000 });
    note(`L7-${vp.width}`, { title, logged, snack, deskAfter, mile, presses, docs: docs.map((d) => ({ path: d.path, fields: d.fields, mask: d.mask })) });
    expect(logged, "L7 · the button reads “✓ Logged”").toMatch(/Logged/);
    expect(presses, "L7 · one press: a second cannot land").toBe(1);
    expect(snack, "L7 · the snackbar names it").toMatch(/Nudge logged for/);
    expect(deskAfter, "L7 · the next task is on the desk with no click").not.toBe(title);
    expect(mile, "L7 · no milestone for one nudge of several").toBe(0);
    const shape = docs.filter((d) => !/\/taskFlags\//.test(d.path)).slice(0, 3).map((d) => {
      const rel = d.path.replace(/^users\/[^/]+\//, "");
      return { kind: /^queries\/[^/]+\/activity\/act-/.test(rel) ? "step" : /^activities\/act-/.test(rel) ? "feed" : /^queries\/[^/]+$/.test(rel) ? "query" : rel, fields: d.fields.join(","), mask: d.mask?.join(",") ?? null };
    });
    expect(shape, "L7 · Log it writes exactly v52's three documents, once each").toEqual([
      { kind: "step", fields: "agentName,createdAt,eventKey,note,queryId,reminderDate,type", mask: null },
      { kind: "feed", fields: "activityType,date,description,details,eventKey,id,manuscriptId,queryId,userId", mask: null },
      { kind: "query", fields: "closePlan,lastNudgeSentDate", mask: "closePlan,lastNudgeSentDate,nudgeDate" },
    ]);
    const q = docs.find((d) => /queries\/[^/]+$/.test(d.path) && d.fields.includes("closePlan"))!;
    expect(strOf(q.values.closePlan).slice(0, 10), "L4 · the nudge's second point is the save's consider-closing date").toBe(thenAt);
  });
}

/* ══ L8 · the milestone shows only when a group (or the list) empties ════════════════════════════════════════════
   L7 holds the other half (one nudge of several: no milestone). To empty a group for real, the account's own tasks are
   marked done through the emulator's admin REST, so "Your tasks" holds only the task this case adds; finishing it
   empties the group. Every one is put back in a `finally`, exactly as it was (a field that was absent is removed). */
const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
type FsDoc = { name: string; fields?: Record<string, { booleanValue?: boolean; stringValue?: string; nullValue?: null }> };
async function ownOpenTasks(): Promise<FsDoc[]> {
  const r = await fetch(`${EMU}/users/${UID}/tasks?pageSize=500`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) });
  const j = (await r.json()) as { documents?: FsDoc[] };
  return (j.documents ?? []).filter((d) => !!d.fields?.dueDate?.stringValue && d.fields?.done?.booleanValue !== true);
}
async function setDone(d: FsDoc, done: boolean | undefined) {
  const body = done === undefined ? { fields: {} } : { fields: { done: { booleanValue: done } } };
  const r = await fetch(`http://127.0.0.1:8085/v1/${d.name}?updateMask.fieldPaths=done`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`could not write ${d.name}: ${r.status}`);
}
for (const vp of SIZES) {
  test(`L8 · the milestone: only when a group empties (${vp.width})`, async ({ page }) => {
    test.setTimeout(150_000);
    test.skip(!/127\.0\.0\.1|localhost/.test(process.env.SA_E2E_BASE_URL ?? ""), "the emulator only");
    const parked = await test.step("read the own tasks (emulator REST)", () => ownOpenTasks());
    const text = `td53 milestone ${vp.width} ${Date.now()}`;
    let words = "";
    try {
      await test.step("set them aside", async () => { for (const d of parked) await setDone(d, true); });
      await test.step("open the page", () => open(page, vp));
      await expect(page.locator(`${PG} [data-tws-row][data-kind="own"]`), "Your tasks is empty before the case adds one").toHaveCount(0, { timeout: 15_000 });
      await page.locator(`${PG} .tws-addb`).click();
      await page.locator(`${PG} .tws-newt`).fill(text);
      await page.locator(`${PG} .tws-opts button`).first().click();
      await page.getByRole("button", { name: "Add to your tray →" }).click();
      const row = page.locator(`${PG} [data-tws-row]`).filter({ hasText: text });
      await expect(row).toHaveCount(1, { timeout: 15_000 });
      await row.click();
      await primary(page).click();
      const mile = page.locator(`${PG} [data-tws="milestone"]`);
      await expect(mile, "L8 · the milestone shows when Your tasks empties").toBeVisible({ timeout: 6000 });
      words = ((await mile.textContent()) ?? "").trim();
      /* put the new task away: Undo the done, then delete it */
      await page.locator('[data-tws="toast"] [data-tws="undo"]').click();
      await expect(row).toHaveCount(1, { timeout: 15_000 });
      await row.click();
      await desk(page).locator('[data-tws="footer"] button[aria-label="Delete"]').click();
      await page.locator(".tws-pop .tws-po").filter({ hasText: "Delete this task" }).click();
      await page.locator(".tws-pop .tws-go").click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });
    } finally {
      await test.step("put them back", async () => { for (const d of parked) await setDone(d, d.fields?.done ? d.fields.done.booleanValue : undefined); });
    }
    note(`L8-${vp.width}`, { words, parked: parked.length });
    expect(words).toMatch(/Your own tasks are done\./);
  });
}

/* ══ L13 · the Query Centre's card reads as messages, with the same words and stamps as the To-do's ═══════════════ */
test("L13 · the Query Centre card shows the same message wording and stamps", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, SIZES[0]);
  const row = page.locator(`${PG} [data-tws-row][data-kind="send"]`).first();
  test.skip(!(await row.count()), "no send task");
  await row.click();
  await page.waitForTimeout(800);
  const who = ((await desk(page).locator(".tws-m").textContent()) ?? "").split("·")[0].trim();
  const read = (sel: string) => page.evaluate((s) => {
    const card = s.startsWith("@") ? ([...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)?.querySelector<HTMLElement>(s.slice(1)) ?? null) : document.querySelector<HTMLElement>(s);
    return card ? [...card.querySelectorAll<HTMLElement>('[data-qc152="msg"]')].map((m) => `${(m.querySelector('[data-qc152="msg-title"]')?.textContent ?? "").trim()} | ${(m.querySelector('[data-qc152="msg-date"]')?.textContent ?? "").trim()}`) : null;
  }, sel);
  const todo = await read('@[data-tws="preview-card"]');
  await page.locator(`${PG} [data-tws="preview"]`).click();
  await page.waitForTimeout(1500);
  const qc = await read(".spanel:not(.tws-pvpanel) [data-qc152='card']");
  const pills = await page.locator(".spanel:not(.tws-pvpanel) [data-qc152='day-pill']").count();
  const waits = await page.locator(".spanel:not(.tws-pvpanel) [data-qc152='wait']").allTextContents();
  note("L13", { who, todo, qc, pills, waits });
  expect(qc, "L13 · the real card opened").toBeTruthy();
  /* the To-do's preview reads the global feed for its history and the Query Centre's card does not, so the To-do's
     card can carry a step from the feed that the Query Centre's leaves out (a data-source difference that predates v53);
     every message the Query Centre draws is drawn on the To-do's card with the same words and the same stamp */
  for (const m of qc!) expect(todo, `L13 · “${m}” is on the To-do's card in the same words, with the same stamp`).toContain(m);
  for (const m of qc!) expect(m.split(" | ")[0], "L13 · a message, never a bare label").toMatch(/^(You |The agent |[A-Z][a-z’'-]+ )/);
  expect(pills, "L13 · day pills").toBeGreaterThan(0);
  expect(waits.join(" "), "L13 · no Same day").not.toMatch(/Same day/);
});

/* ══ L14 · the phone To-do is unchanged: none of the desk's v53 parts reach it (TDP1 holds the rest) ══════════════ */
test("L14 · the phone To-do draws none of v53's desk", async ({ page }) => {
  await openPhone(page, "/todo", { width: 390, height: 844 });
  await expect(page.locator('[data-tdp="list"]:visible')).toHaveCount(1, { timeout: 30_000 });
  await mutate(page);
  await page.waitForTimeout(400);
  const n = await page.evaluate(() => ({
    rail: document.querySelectorAll(".tws-rail, [data-tws='breakdown'], [data-tws='check']").length,
    desk: [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
  }));
  expect(n, "L14 · no v53 desk parts on the phone").toEqual({ rail: 0, desk: 0 });
});

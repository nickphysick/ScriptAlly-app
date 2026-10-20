/**
 * IMPORT REVIEW v1 — the rendered locks (reports/import-review-feed-v1).
 *
 *   IRF-A  the review list (lab, no sign-in): the navy "Ready to import" band, "Don't import" leaving
 *          the row in place with Undo, live header counts, and a details panel that answers nothing.
 *   IRF-B  set-up steps (lab, at 1280 / 1512 / 1920): every step's column centred in the sheet within
 *          1px, the ack's lead on one line, and the ack's text column as wide as its card.
 *   IRF-C  the dashboard while loading (signed in, the dev hold): every card carries the one skeleton
 *          class, nothing renders inside any card (no digit, no title), and each card's box while
 *          loading equals its loaded box (±1px).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test importReviewFeed --project=measure --no-deps --workers=1
 *   IRF_MUTATE=<name>  apply a lock's named break in the page (see MUTATIONS)
 *   IRF_SHOTS=1        write the report's screenshots
 *
 * Every case writes its readings to a ledger and refuses a run with fewer than it claims.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const OUT = resolve("reports/import-review-feed-v1");
const MUT = process.env.IRF_MUTATE ?? "";
const SHOTS = !!process.env.IRF_SHOTS;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${OUT}/ledger`, { recursive: true });
    writeFileSync(`${OUT}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** Each lock's named break, applied in the page. */
const MUTATIONS: Record<string, string> = {
  "A-grey-head": `.sf .im-listhead--ready { background: #f4efe9 !important; }`,
  "B-inset": `.sf .sf-col, .sf .o9-solo, .sf .o9-welv { margin-left: 16px !important; margin-right: 0 !important; }`,
  "B-measure": `.sf .o9-beats { max-width: 60ch !important; }`,
  "C-show": `.d58-skcard * { visibility: visible !important; }`,
  "C-grow": `.d58-skcard { min-height: 720px !important; }`,
};
async function mutate(page: Page) { if (MUTATIONS[MUT]) await page.addStyleTag({ content: MUTATIONS[MUT] }); }
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(`${OUT}/shots`, { recursive: true });
  await page.screenshot({ path: `${OUT}/shots/${name}.png`, animations: "disabled" });
}

async function lab(page: Page, q: string, vp: { width: number; height: number }) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(vp);
  await page.goto("/#/onb-lab?" + q, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await page.locator(".sf").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  await mutate(page);
  await page.waitForTimeout(400);
}

/* ═══ IRF-A · the review list ══════════════════════════════════════════════════════════════════ */
test("IRF-A the review list: navy band, Don't import in place with Undo, a panel that answers nothing", async ({ page }) => {
  const L = new Ledger("irf-a");
  await lab(page, "s=review&fx=clear", { width: 1440, height: 900 });
  const head = await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('[data-im="ready"] [data-im="list-head"]');
    const mark = h?.querySelector<HTMLElement>(".im-readymark");
    const t = h?.querySelector<HTMLElement>(".im-listtitle");
    return h ? { bg: getComputedStyle(h).backgroundColor, mark: mark ? getComputedStyle(mark).backgroundColor : null,
      title: t?.textContent, size: t ? getComputedStyle(t).fontSize : null, chip: h.querySelector('[data-im="ready-chip"]')?.textContent ?? "" } : null;
  });
  L.check("A1", "the band is navy #2d3a50", head?.bg === "rgb(45, 58, 80)", `${head?.bg}`);
  L.check("A1", "the sage tick disc", head?.mark === "rgb(111, 165, 131)", `${head?.mark}`);
  L.check("A1", "the title", head?.title === "Ready to import" && head?.size === "24px", `${head?.title} ${head?.size}`);
  const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-im="ready"] [data-row-id]')].map((e) => e.getAttribute("data-row-id")));
  const before = await ids();
  const ready0 = Number((head?.chip ?? "").match(/\d+/)?.[0] ?? NaN);
  L.check("A2", "rows to work with", before.length >= 2, `${before.length}`);
  const target = before[1]!;
  await page.locator(`[data-row-id="${target}"] [data-im="row-remove"]`).click();
  await page.waitForTimeout(200);
  const after = await page.evaluate((id) => {
    const r = document.querySelector(`[data-im="ready"] [data-row-id="${id}"]`);
    return { out: r?.getAttribute("data-out"), word: r?.querySelector('[data-im="row-out"]')?.textContent ?? "",
      undo: !!r?.querySelector('[data-im="row-undo"]'), bg: r ? getComputedStyle(r).backgroundColor : "",
      chip: document.querySelector('[data-im="ready-chip"]')?.textContent ?? "", outCount: document.querySelector('[data-im="out-count"]')?.textContent ?? "",
      toast: !!document.querySelector('[data-im="toast"]'), tray: !!document.querySelector('[data-im="tray"]') };
  }, target);
  L.check("A2", "the row stays in its place", JSON.stringify(await ids()) === JSON.stringify(before), `${(await ids()).join(",")}`);
  L.check("A2", "it says it won't be imported, with Undo", after.out === "1" && after.word === "Won't be imported" && after.undo, JSON.stringify(after));
  L.check("A2", "pale ground", after.bg === "rgb(248, 245, 240)", after.bg);
  L.check("A2", "header counts update live", after.chip === `${ready0 - 1} ready` && after.outCount === "1 not importing", `${after.chip} · ${after.outCount}`);
  L.check("A2", "no toast, no tray", !after.toast && !after.tray, JSON.stringify({ toast: after.toast, tray: after.tray }));
  await shot(page, "review-dont-import-1440");
  await page.locator(`[data-row-id="${target}"] [data-im="row-undo"]`).click();
  await page.waitForTimeout(200);
  const back = await page.evaluate((id) => document.querySelector(`[data-im="ready"] [data-row-id="${id}"]`)?.getAttribute("data-out"), target);
  L.check("A2", "Undo restores it", back === "0", `${back}`);
  L.check("A2", "the count comes back", (await page.evaluate(() => document.querySelector('[data-im="ready-chip"]')?.textContent)) === `${ready0} ready`, "");

  /* the panel: on the first row */
  const first = before[0]!;
  await page.locator(`[data-row-id="${first}"] [data-im="row-action"]`).click();
  await page.waitForTimeout(300);
  const panel = await page.evaluate((id) => {
    const r = document.querySelector(`[data-row-id="${id}"]`)!;
    const p = r.querySelector<HTMLElement>('[data-im="row-edit"]');
    const rr = r.getBoundingClientRect(), pr = p?.getBoundingClientRect();
    return p ? {
      inset: Math.round(pr!.left - rr.left), bg: getComputedStyle(p).backgroundColor, radius: getComputedStyle(p).borderTopLeftRadius,
      open: p.querySelector('[data-im="det-open"]')?.getAttribute("aria-pressed"), closed: p.querySelector('[data-im="det-closed"]')?.getAttribute("aria-pressed"),
      note: p.querySelector('[data-im="det-doornote"]')?.textContent, unset: p.querySelector('[data-im="det-weeks-unset"]')?.textContent,
      slider: !!p.querySelector('input[type="range"]'), stars: /Agent fit/.test(p.textContent ?? ""), text: p.innerText,
    } : null;
  }, first);
  L.check("A3", "inset 82px from the row's left", panel?.inset === 82, `${panel?.inset}`);
  L.check("A3", "paper ground, 12px radius", panel?.bg === "rgb(251, 249, 245)" && panel?.radius === "12px", `${panel?.bg} ${panel?.radius}`);
  L.check("A3", "neither Open nor Closed chosen", panel?.open === "false" && panel?.closed === "false", `${panel?.open}/${panel?.closed}`);
  L.check("A3", "the door note", panel?.note === "Not known yet. Leave it if you're not sure.", `${panel?.note}`);
  L.check("A3", "reply time Not set, no slider", panel?.unset === "Not set" && !panel?.slider, `${panel?.unset} ${panel?.slider}`);
  L.check("A3", "no Agent fit", panel?.stars === false, "");
  L.check("A3", "no 6 weeks shown", !/\b6 weeks\b/.test(panel?.text ?? ""), "");
  await shot(page, "review-details-1440");
  L.done(18);
});

/* ═══ IRF-B · set-up steps centred ═════════════════════════════════════════════════════════════ */
const STEPS = ["s=welcome", "s=ack&stage=early", "s=bookmore", "s=fork", "s=confirm"];
for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`IRF-B set-up steps are centred, the ack lead is one line @${vp.width}`, async ({ page }) => {
    const L = new Ledger(`irf-b-${vp.width}`);
    for (const q of STEPS) {
      await lab(page, q, vp);
      const r = await page.evaluate(() => {
        const sc = document.querySelector<HTMLElement>('[data-sf="scroll"]')!;
        const cs = getComputedStyle(sc);
        const sr = sc.getBoundingClientRect();
        const contentL = sr.left + parseFloat(cs.paddingLeft), contentR = sr.right - parseFloat(cs.paddingRight);
        const step = [...document.querySelectorAll<HTMLElement>(".sf-col, .o9-solo, .o9-welv")].find((e) => e.getBoundingClientRect().width > 0)!;
        const b = step.getBoundingClientRect();
        /* the card's row: on the confirm step the card shares a row with "how it works" (.o9-conf),
           and that row is what spans the column under the title */
        const sc0 = step.querySelector<HTMLElement>(".sf-stepcard");
        const card = sc0?.closest<HTMLElement>(".o9-conf") ?? sc0;
        const beats = step.querySelector<HTMLElement>(".o9-beats");
        const lead = step.querySelector<HTMLElement>(".o9-beat--lead");
        const lh = lead ? parseFloat(getComputedStyle(lead).lineHeight) : 0;
        return { left: b.left - contentL, right: contentR - b.right, w: b.width,
          card: card ? card.getBoundingClientRect().width : null, beats: beats ? beats.getBoundingClientRect().width : null,
          leadLines: lead ? Math.round(lead.getBoundingClientRect().height / lh) : null, leadText: lead?.textContent ?? "" };
      });
      L.check("B1", `${q} centred (${r.left.toFixed(1)} | ${r.right.toFixed(1)})`, Math.abs(r.left - r.right) <= 1, `${r.left} vs ${r.right}`);
      if (r.card !== null) L.check("B3", `${q} the card fills the column`, Math.abs((r.card ?? 0) - r.w) <= 1, `${r.card} vs ${r.w}`);
      if (r.beats !== null) {
        L.check("B3", `${q} the text column is the card's width`, Math.abs((r.beats ?? 0) - (r.card ?? 0)) <= 1, `${r.beats} vs ${r.card}`);
        L.check("B2", `${q} the lead is one line`, r.leadLines === 1, `${r.leadLines} lines: ${r.leadText}`);
      }
      if (q.startsWith("s=ack")) await shot(page, `setup-ack-${vp.width}`);
    }
    L.done(11);
  });
}

/* ═══ IRF-C · one loading state across the dashboard ═══════════════════════════════════════════ */
const seed = (mode: "" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();
test.describe("IRF-C", () => {
  test.beforeAll(() => { seed(""); });
  test.afterAll(() => { seed("--clean"); });
  const STATES = [{ key: "pre", ms: "db60-pre" }, { key: "querying", ms: "seed-ms-1" }];
  async function open(page: Page, ms: string, hold: boolean) {
    await page.addInitScript(([m, h]) => {
      Object.assign(window, { __SA_DASH_HOLD_MS: h ? 6000 : undefined, __SA_DASH_NO_AGENTS: undefined, __SA_DASH_DROP: undefined });
      try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
    }, [ms, hold] as const);
    await openRoute(page, "/dashboard", { width: 1512, height: 900 });
    if (!hold) await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await mutate(page);
    await page.waitForTimeout(600);
  }
  /** Every card on the page: its key, box, skeleton class and the text it renders. */
  const cards = (page: Page) => page.evaluate(() => {
    const page = [...document.querySelectorAll<HTMLElement>('[data-d58="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const els = [...page.querySelectorAll<HTMLElement>(".os-card, .d58-focus, .d60-way, .d59-fw")].filter((e) => e.getBoundingClientRect().height > 0);
    return {
      loading: page.getAttribute("data-loading"),
      cards: els.map((e, i) => {
        const r = e.getBoundingClientRect();
        const base = e.getAttribute("data-d60") || e.getAttribute("data-d58") || e.getAttribute("data-probe") || `${e.className.split(" ")[0]}#${i}`;
        /* the four lift tiles share one attribute: the nth of a kind keeps its own key */
        const nth = els.slice(0, i).filter((x) => (x.getAttribute("data-d60") || x.getAttribute("data-d58") || x.getAttribute("data-probe")) === base).length;
        const key = nth ? `${base}#${nth}` : base;
        return { key, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), sk: e.classList.contains("d58-skcard"), text: e.innerText.trim() };
      }),
    };
  });
  for (const s of STATES) {
    test(`IRF-C ${s.key}: the same skeleton on every card, nothing inside, and no box moves`, async ({ page }) => {
      const L = new Ledger(`irf-c-${s.key}`);
      await open(page, s.ms, false);
      const loaded = await cards(page);
      await open(page, s.ms, true);
      const held = await cards(page);
      await shot(page, `dash-loading-${s.key}-1512`);
      L.check("C0", "the hold is real", held.loading === "1", `${held.loading}`);
      L.check("C0", "cards to measure", held.cards.length >= 4, `${held.cards.length}`);
      for (const c of held.cards) {
        L.check("C1", `${c.key} carries the skeleton class`, c.sk, "");
        L.check("C2", `${c.key} renders nothing inside`, c.text === "", JSON.stringify(c.text.slice(0, 80)));
        L.check("C2", `${c.key} no digit`, !/\d/.test(c.text), "");
      }
      const keyed = new Map(loaded.cards.map((c) => [c.key, c]));
      for (const c of held.cards) {
        const l = keyed.get(c.key);
        L.check("C3", `${c.key} loading box = loaded box`, !!l && Math.abs(l.x - c.x) <= 1 && Math.abs(l.y - c.y) <= 1 && Math.abs(l.w - c.w) <= 1 && Math.abs(l.h - c.h) <= 1,
          l ? `held ${c.x},${c.y} ${c.w}×${c.h} · loaded ${l.x},${l.y} ${l.w}×${l.h}` : "no loaded twin");
      }
      await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      await shot(page, `dash-loaded-${s.key}-1512`);
      L.done(10);
    });
  }
});

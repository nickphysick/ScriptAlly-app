/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the locks on the rendered page, at 1512 × 982 and 1280 × 832 with the shell. Written
 * BEFORE the build (Step 0.7) and proved red on the v26 branch first; every population is asserted non-zero before
 * a claim about it is believed.
 *
 *   L1  locked: a package with a sent query is never open on the workbench, its drawer offers no slot, no Add and
 *       no extra to tick (the rules' half is rulesProbe's v40 section)
 *   L2  New package from this: a copy with the same pieces and `copiedFromId`; the original byte-for-byte unchanged
 *   L4  the shelf lists exactly the Out and Retired packages; the workbench selector exactly Draft and Ready
 *   L5  Tests lists exactly the packages with a live `copiedFromId`; the state and verdict follow 5 sent and 10 points
 *   L6  figures: every % and count equals the fixture's arithmetic (seedPk40's header); 4 sent is "1 of 4", unranked;
 *       withdrawn is not counted
 *   L7  synopses: the "No synopsis" card counts exactly the queries sent with an empty synopsis slot (2)
 *   L8  mono census: no visible element is the mono face AND uppercase, except the illustration placeholders
 *   L9  widths: the shelf, the workbench frame and the tracking body are min(1600, sheet − 96) and centred (±1);
 *       the workbench header's art sits left of its title
 *   L10 smoke: populated and brand new, every tab, no console errors
 *   (L3, the stage table, is a unit lock: src/lib/packagesV40.test.ts.)
 *
 * Breaks: `PK40_MUTATE=<lock>` applies the in-page break below. FIXTURE: seedPk40.mjs (pk40-ms, pk40-new).
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v40";
const MUT = process.env.PK40_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
type Dump = Record<string, unknown> & { all: { id: string; name: string; copiedFromId: string | null; firstSentAt: boolean; status: string }[] };
const dump = (): Dump => JSON.parse(seed("--dump").trim().split("\n").pop()!);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** One named break per lock, applied in the page. */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* L8: an eyebrow comes back over the workbench heading */
  L8: { js: `document.addEventListener('DOMContentLoaded', () => { const put = () => { const h = document.querySelector('[data-pk40="wbh"] h2'); if (h && !document.getElementById('mut-k')) { const k = document.createElement('p'); k.id = 'mut-k'; k.textContent = 'The workbench'; k.style.cssText = 'font-family: JetBrains Mono, monospace; text-transform: uppercase; font-size: 9px'; h.before(k); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })` },
  /* L9: the shelf takes the v26 column back */
  L9: { css: `[data-pk40="shelf"] { width: auto !important; max-width: none !important; margin-left: 48px !important; }` },
  /* L4: a locked package back in the workbench selector */
  L4: { js: `document.addEventListener('DOMContentLoaded', () => { const put = () => { const s = document.querySelector('[data-pk40="wb-sel"]'); if (s && !s.querySelector('[data-pkid="pk40-std"]')) { const b = document.createElement('button'); b.className = 'p6-pkb'; b.dataset.pkid = 'pk40-std'; b.textContent = 'Standard'; s.prepend(b); } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })` },
};

async function open(page: Page, size: { width: number; height: number }, ms = "pk40-ms", route = "/queries/packages") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.locator('[data-pk26="page"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const ids = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => (e as HTMLElement).offsetParent).map((e) => e.getAttribute("data-pkid") ?? ""), sel);
const text = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => (e as HTMLElement).offsetParent).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()), sel);

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L4 · the shelf and the workbench split by stage ── */
test("L4 the shelf lists the Out and Retired packages; the workbench selector the Draft and Ready ones", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L4");
  await open(page, SIZES[0]);
  const shelf = (await ids(page, `${pg} [data-pk40="shelf"] [data-pk40="tile"]`)).sort();
  const sel = (await ids(page, `${pg} [data-pk40="wb-sel"] [data-pkid]`)).sort();
  L.check("the shelf has tiles", shelf.length > 0, JSON.stringify(shelf));
  L.check("the selector has buttons", sel.length > 0, JSON.stringify(sel));
  L.check("the shelf is exactly Out + Retired", JSON.stringify(shelf) === JSON.stringify(["pk40-old", "pk40-std", "pk40-std2"]), JSON.stringify(shelf));
  L.check("the selector is exactly Draft + Ready", JSON.stringify(sel) === JSON.stringify(["pk40-draft", "pk40-ready"]), JSON.stringify(sel));
  const order = await ids(page, `${pg} [data-pk40="shelf"] [data-pk40="tile"]`);
  L.check("active first, retired last", order[0] === "pk40-std" && order[order.length - 1] === "pk40-old", JSON.stringify(order));
  L.done(5);
});

/* ── L1 · a locked package never opens for change ── */
test("L1 a locked package is never open on the workbench, and its drawer offers no change", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L1");
  await open(page, SIZES[0]);
  const openId = await page.locator(`${pg} [data-pk40="open"]`).first().getAttribute("data-pkg", { timeout: 4000 }).catch(() => null);
  L.check("an open package on the workbench", !!openId, String(openId));
  L.check("…and it is not a locked one", !!openId && !["pk40-std", "pk40-std2", "pk40-old"].includes(openId), String(openId));
  await page.locator(`${pg} [data-pk40="tile"][data-pkid="pk40-std"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  const d = await page.evaluate(() => {
    const dr = document.querySelector('[data-pk40="shd"]');
    return dr ? { slots: dr.querySelectorAll(".p6-slt, [data-slot]").length, add: dr.querySelectorAll(".p6-lr-add, .p6-exa-b").length,
      ticks: dr.querySelectorAll('.p6-exc button[aria-pressed]').length, text: (dr as HTMLElement).innerText.replace(/\s+/g, " ") } : null;
  });
  L.check("the shelf drawer opens", !!d, JSON.stringify(d));
  L.check("…with no slot to drop on", !!d && d.slots === 0, JSON.stringify(d));
  L.check("…no Add", !!d && d.add === 0, JSON.stringify(d));
  L.check("…no extra to tick", !!d && d.ticks === 0, JSON.stringify(d));
  L.check("…and says it is locked", !!d && /On query · locked since/.test(d.text), d ? d.text.slice(0, 160) : "");
  L.done(7);
});

/* ── L2 · New package from this ── */
test("L2 New package from this copies the pieces and leaves the original as it was", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L2");
  const before = dump();
  await open(page, SIZES[0]);
  await page.locator(`${pg} [data-pk40="tile"][data-pkid="pk40-std"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  const btn = page.locator('[data-pk40="shd"] [data-pk40="dup"]').first();
  L.check("the drawer offers New package from this", (await btn.count()) === 1, String(await btn.count()));
  if (await btn.count()) await btn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const toast = (await page.locator(".sa-toast").allInnerTexts().catch(() => [] as string[])).join(" | ");
  const after = dump();
  const made = after.all.find((p) => !before.all.some((q) => q.id === p.id));
  const full = made ? (JSON.parse(seed("--dump").trim().split("\n").pop()!) as Record<string, unknown>) : null;
  void full;
  L.check("a new package was made", !!made, JSON.stringify(after.all.map((p) => p.name)));
  L.check("…named Standard 3 (the next free number)", made?.name === "Standard 3", String(made?.name));
  L.check("…copied from Standard", made?.copiedFromId === "pk40-std", String(made?.copiedFromId));
  L.check("…and not sent", made?.firstSentAt === false, String(made?.firstSentAt));
  /* every field and value, compared with the keys sorted: two reads of one unchanged document need not list its
     fields in the same order, so a raw JSON.stringify reported a difference that was only ordering */
  const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v);
  const b0 = JSON.stringify(canon(before["pk40-std"])), b1 = JSON.stringify(canon(after["pk40-std"]));
  L.check("the original is byte-for-byte unchanged", !!before["pk40-std"] && b0 === b1, b0 === b1 ? "same" : `${b0} → ${b1}`);
  L.check("the toast says so", /Made Standard 3 from Standard\. Standard stays as it was\./.test(toast), toast);
  const openId = await page.locator(`${pg} [data-pk40="open"]`).first().getAttribute("data-pkg", { timeout: 4000 }).catch(() => null);
  L.check("the copy is the open package", !!made && openId === made.id, `${openId} vs ${made?.id}`);
  seed();
  L.done(7);
});

/* ── L5 / L6 · tracking on the Packages tab ── */
test("L5 L6 Packages tracking: tests, verdicts and figures follow the fixture", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L5-L6");
  await open(page, SIZES[0]);
  const hh = await text(page, `${pg} [data-pk40="tp"] .p6-tp-c`);
  L.check("head to head has two cards", hh.length === 2, JSON.stringify(hh));
  L.check("A is Standard at 40%, 2 of 5 sent", /40\s*%/.test(hh[0] ?? "") && /2 of 5 sent/.test(hh[0] ?? ""), hh[0] ?? "");
  L.check("…its funnel: Sent 5 · Replied 3 · Asked for more 2 · Full request 1", /Sent 5 Replied 3 Asked for more 2 Full request 1/.test(hh[0] ?? ""), hh[0] ?? "");
  L.check("B is Standard 2, 1 of 4, too early for a %", /1 of 4/.test(hh[1] ?? "") && /Too early for a %/.test(hh[1] ?? ""), hh[1] ?? "");
  const vd = (await text(page, `${pg} [data-pk40="tp"] .p6-tp-vd`))[0] ?? "";
  L.check("the verdict: only the letter differs, too early", vd === "Only the letter differs. Too early to call: 5 and 4 sent. Each needs 5 before it counts.", vd);
  await page.locator(`${pg} [data-pk40="tp"] [data-tpv="b"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const rows = await text(page, `${pg} [data-pk40="tp"] .p6-tp-col:first-child .p6-tp-row`);
  L.check("the scoreboard ranks Standard and shows Standard 2 unranked as early", rows.some((r) => /^1 Standard 5 sent 40%/.test(r)) && rows.some((r) => /^· Standard 2 4 sent early/.test(r)), JSON.stringify(rows));
  const sum = (await text(page, `${pg} [data-pk40="tp"] .p6-tp-sum`))[0] ?? "";
  /* live packages only (Ready and Out, the mock's `live`): Standard 5 + Standard 2 4 = 9 (withdrawn out), 3 asked → 33%;
     Standard alone has 5 sent, of the 3 live packages */
  L.check("the summary: 9 sent with a package (withdrawn out), 33%, 1 of 3 to compare", /^9 queries sent with a package 33 ?% asked for more, across all of them 1 of 3 packages with enough to compare$/.test(sum), sum);
  await page.locator(`${pg} [data-pk40="tp"] [data-tpv="c"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const tests = await page.evaluate(() => [...document.querySelectorAll('[data-pk40="tp"] .p6-tp-t')].map((e) => e.getAttribute("data-pkid")));
  L.check("Tests lists exactly Standard 2", JSON.stringify(tests) === JSON.stringify(["pk40-std2"]), JSON.stringify(tests));
  const t = (await text(page, `${pg} [data-pk40="tp"] .p6-tp-t`))[0] ?? "";
  L.check("…Running, testing the letter", /^Running Testing the letter Letter: Hook-first → Comps-forward/.test(t), t);
  L.check("…footer: 1 to go", /Each side needs 5 sent\. 1 to go\./.test(t), t);
  L.done(10);
});

/* ── L6 · L7 · tracking on the Query letters and Synopses tabs ── */
test("L6 L7 letters and synopses tracking: the No synopsis card and the figures", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L6-L7");
  await open(page, SIZES[0]);
  await page.locator(`${pg} [data-pk26="tabs"] .p6-t-let`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  const lc = await text(page, `${pg} [data-pk40="tpm"] .p6-tm-c`);
  L.check("letters: two cards", lc.length === 2, JSON.stringify(lc));
  L.check("Hook-first: 7 sent (withdrawn out), 29%", lc.some((c) => /^Hook-first/.test(c) && /29\s*%/.test(c) && /2 of 7 sent/.test(c)), JSON.stringify(lc));
  L.check("Comps-forward: 1 of 4, 1 more to go", lc.some((c) => /^Comps-forward/.test(c) && /1 of 4/.test(c) && /Too early for a %: 1 more to go/.test(c)), JSON.stringify(lc));
  await page.locator(`${pg} [data-pk26="tabs"] .p6-t-syn`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  const sc = await text(page, `${pg} [data-pk40="tpm"] .p6-tm-c`);
  const none = sc.find((c) => /^No synopsis/.test(c)) ?? "";
  L.check("synopses: One-page and No synopsis", sc.length === 2 && !!none, JSON.stringify(sc));
  L.check("No synopsis counts exactly 2 (0 of 2)", /0 of 2/.test(none), none);
  L.check("One-page: 9 sent, 33%", sc.some((c) => /^One-page/.test(c) && /33\s*%/.test(c) && /3 of 9 sent/.test(c)), JSON.stringify(sc));
  L.done(6);
});

/* ── L8 · no small mono capitals ── */
async function monoCensus(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const roots = [...document.querySelectorAll('[data-pk26="page"], .p6-layer')];
    for (const r of roots) {
      for (const e of [r, ...r.querySelectorAll("*")] as HTMLElement[]) {
        if (!e.offsetParent && getComputedStyle(e).position !== "fixed") continue;
        if (!(e.innerText ?? "").trim()) continue;
        if (e.closest('[data-art]')) continue;
        const cs = getComputedStyle(e);
        if (/mono/i.test(cs.fontFamily) && cs.textTransform === "uppercase") out.push(`${e.tagName}.${e.className}: ${(e.innerText ?? "").trim().slice(0, 30)}`);
      }
    }
    return out;
  });
}
test("L8 no visible element on the page is mono AND uppercase", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L8");
  for (const ms of ["pk40-ms", "pk40-new"]) {
    await open(page, SIZES[0], ms);
    for (const tab of ["pk", "let", "syn"]) {
      if (tab !== "pk") { await page.locator(`${pg} [data-pk26="tabs"] .p6-t-${tab}`).first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
      const hits = await monoCensus(page);
      L.check(`${ms} · ${tab}: no mono capitals`, hits.length === 0, JSON.stringify(hits.slice(0, 8)));
    }
    await page.locator(`${pg} [data-pk26="tabs"] .p6-lead`).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    for (const [what, sel] of [["New package dialog", '[data-pk40="wbh"] button'], ["How it works", '[data-pk26="header"] .p6-hd-g']] as const) {
      const b = page.locator(`${pg} ${sel}`).first();
      if (await b.count()) { await b.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(600); }
      const hits = await monoCensus(page);
      L.check(`${ms} · ${what}: no mono capitals`, hits.length === 0, JSON.stringify(hits.slice(0, 8)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    if (ms === "pk40-ms") {
      await page.locator(`${pg} [data-pk40="tile"]`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      const hits = await monoCensus(page);
      L.check(`${ms} · the shelf drawer: no mono capitals`, hits.length === 0, JSON.stringify(hits.slice(0, 8)));
      L.check(`${ms} · the shelf drawer opened`, (await page.locator('[data-pk40="shd"]').count()) === 1, "drawer");
      await page.keyboard.press("Escape");
    }
  }
  L.done(12);
});

/* ── L9 · the Contact list width ── */
for (const size of SIZES) {
  test(`L9 the shelf, the workbench and the tracking body share min(1600, sheet − 96) at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L9-${size.width}`);
    await open(page, size);
    const r = await page.evaluate(() => {
      const s = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement;
      const sheet = s.getBoundingClientRect();
      const box = (sel: string) => { const e = s.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; };
      const art = box('[data-pk40="wbh"] [data-art]'), ttl = box('[data-pk40="wbh"] h2');
      return { sheet: { l: sheet.left, w: s.clientWidth }, shelf: box('[data-pk40="shelf"]'), wb: box('[data-pk40="wbf"]'), tp: box('[data-pk40="tp"] .p6-tp-body'), art, ttl };
    });
    const want = Math.min(1600, r.sheet.w - 96);
    const centred = (b: { l: number; w: number } | null) => !!b && Math.abs(b.l - (r.sheet.l + (r.sheet.w - b.w) / 2)) <= 1;
    /* ⚠️ B's single width is not the ref's for the tracking body: the ref widens it to sheet − 48 once the sheet is
       1200 or narrower (`@container sheet (max-width:1200px){.tp-body{width:calc(100% - 48px)}}`), measured in the
       ref at 1440 and 1280 (1144 and 984 against 1096 and 936 for the shelf). The ref is the oracle. */
    const wantTp = r.sheet.w <= 1200 ? r.sheet.w - 48 : want;
    for (const [k, b, w] of [["the shelf", r.shelf, want], ["the workbench frame", r.wb, want], ["the tracking body", r.tp, wantTp]] as const) {
      L.check(`${k} is ${w}px wide (±1)`, !!b && Math.abs(b.w - w) <= 1, JSON.stringify({ b, want: w }));
      L.check(`${k} is centred (±1)`, centred(b), JSON.stringify({ b, sheet: r.sheet }));
    }
    L.check("the workbench header's art sits left of its title", !!r.art && !!r.ttl && r.art.r <= r.ttl.l, JSON.stringify({ art: r.art, ttl: r.ttl }));
    L.done(7);
  });
}

/* ── L10 · smoke ── */
test("L10 the page renders populated and brand new, every tab, with no console errors", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L10");
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  for (const ms of ["pk40-ms", "pk40-new"]) {
    await open(page, SIZES[0], ms);
    for (const tab of ["let", "syn", "lead"]) {
      await page.locator(`${pg} [data-pk26="tabs"] .p6-${tab === "lead" ? "lead" : `t-${tab}`}`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    L.check(`${ms}: the shelf renders`, (await page.locator(`${pg} [data-pk40="shelf"]`).count()) === 1, "shelf");
    L.check(`${ms}: the workbench renders`, (await page.locator(`${pg} [data-pk40="wbf"]`).count()) === 1, "wbf");
    L.check(`${ms}: tracking renders`, (await page.locator(`${pg} [data-pk40="tp"]`).count()) === 1, "tp");
  }
  const real = errs.filter((e) => !/favicon|ResizeObserver loop/i.test(e));
  L.check("no console errors", real.length === 0, JSON.stringify(real.slice(0, 5)));
  L.done(7);
});

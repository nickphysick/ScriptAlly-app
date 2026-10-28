/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — the locks on the rendered page, at 1512 × 982 and 1280 × 832 with the shell. Every
 * population is asserted non-zero before a claim about it is believed. FIXTURE: seedPk40.mjs, unchanged (pk40-ms,
 * pk40-new), whose arithmetic under packageReplies' first-answer rule is:
 *
 *   Standard    (out, active)  6 queries, 1 withdrawn before any answer → sent 5 · replied 3 · asked for more 2 ·
 *                              answered 4 → RANKED, 40%
 *   Standard 2  (out)          sent 4 · asked 1 · answered 2 → too early
 *   Old one     (retired)      sent 1 · passed · answered 1 → too early
 *   Ready one / Draft one      not sent
 *   All packages: sent 10 · replied 6 (60%) · asked for more 3 (30%)
 *   Pieces: Hook-first 6 sent, 2 asked (33%) · Comps-forward 4, too early · One-page 9, 3 (33%) · Fast-paced 10, 3 (30%)
 *
 *   L1  no tabs: no tab bar and no Letters/Synopses page; `?tab=syn` lands with Your materials on Synopses
 *   L2  labels: a live label loads that package (header name matches); a retired label opens the drawer; the
 *       selected label is the only one marked selected
 *   L3  drawer: Figures opens the drawer for the open package; its rate equals packageReplies' for it; "Edit in the
 *       builder" loads it and closes the drawer
 *   L4  Results: no package appears in more than one Packages showcase
 *   L5  Results figures equal the fixture's packageReplies arithmetic; nothing under the threshold is a winner
 *   L6  the results band spans the sheet's full width (±1) at 1512 and 1280
 *   L7  empty: no packaged queries → the band's empty line, the dashed message, no showcases
 *   L8  mono census (v40's ruling, carried): no visible element is mono AND uppercase, page and every layer
 *   L9  a sent package opens in the builder LOCKED: no ✕, no Add, no extra to tick, a lock line; a Ready one is not
 *   L10 "Make a copy" opens New package with "A copy of {name}" chosen
 *   L11 smoke: both manuscripts render with no console errors
 *
 * Breaks: `PK38_MUTATE=<lock>` applies the in-page break below.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v38";
const MUT = process.env.PK38_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk40.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** One named break per lock, applied in the page (a MutationObserver re-applies it after every render). */
const watch = (body: string) => `document.addEventListener('DOMContentLoaded', () => { const put = () => { try { ${body} } catch (e) {} }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true, characterData: true }); put(); })`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* L1: the tab bar comes back */
  L1: { js: watch(`const p = document.querySelector('[data-pk26="page"]'); if (p && !p.querySelector('[data-pk26="tabs"]')) { const n = document.createElement('nav'); n.dataset.pk26 = 'tabs'; n.textContent = 'Packages · Query letters · Synopses'; p.prepend(n); }`) },
  /* L2: a second label is marked selected */
  L2: { js: watch(`const b = [...document.querySelectorAll('[data-pk38="labels"] .p8-pkl-b:not(.p8-ret)')]; const x = b.find((e) => e.getAttribute('aria-pressed') !== 'true'); if (x && b.filter((e) => e.getAttribute('aria-pressed') === 'true').length < 2) x.setAttribute('aria-pressed', 'true');`) },
  /* L3: the drawer states a rate packageReplies did not give */
  L3: { js: watch(`const b = document.querySelector('[data-pk38="pkd-rate"] .p8-dst-r b'); if (b && b.textContent !== '55%') b.textContent = '55%';`) },
  /* L4: the first Packages showcase appears twice */
  L4: { js: watch(`const g = document.querySelector('[data-pk38="row-pk"] .p8-ag3-g'); if (g && g.children.length && g.children.length < 4) g.appendChild(g.children[0].cloneNode(true));`) },
  /* L5: a too-early package wins Doing best */
  L5: { js: watch(`const a = document.querySelector('[data-show^="best:"] h3'); if (a && a.textContent !== 'Standard 2') a.textContent = 'Standard 2';`) },
  /* L6: the band takes the page's column instead of the sheet */
  L6: { css: `[data-pk38="band"] { margin-left: 48px !important; margin-right: 48px !important; }` },
  /* L7: a showcase in the empty state */
  L7: { js: watch(`const m = document.querySelector('[data-pk38="empty"]'); if (m && !document.querySelector('[data-pk38="show"]')) { const a = document.createElement('article'); a.dataset.pk38 = 'show'; m.after(a); }`) },
  /* L8: the ref's mono kicker over the labels comes back (pk38.css's override dropped) */
  L8: { css: `.p8-pkl .p8-pkl-k { font-family: "JetBrains Mono", monospace !important; text-transform: uppercase !important; }` },
  /* L10: New package opens on Empty whatever "Make a copy" asked for */
  L10: { js: watch(`const r = [...document.querySelectorAll('.p6-pd-from [role="radio"]')]; if (r.length === 2 && r[1].getAttribute('aria-checked') === 'true') { r[1].setAttribute('aria-checked', 'false'); r[0].setAttribute('aria-checked', 'true'); }`) },
  /* L9: a ✕ on the locked package */
  L9: { js: watch(`const o = document.querySelector('[data-pk40="open"][data-locked] .p6-mr-ac'); if (o && !o.querySelector('.p6-mr-x')) { const x = document.createElement('button'); x.className = 'p6-mr-x'; x.textContent = '✕'; o.appendChild(x); }`) },
};

async function open(page: Page, size: { width: number; height: number }, ms = "pk40-ms", route = "/queries/packages") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.locator('[data-pk38="labels"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500);
}
const pg = `[data-pk26="page"]`;
const txt = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => (e as HTMLElement).offsetParent || getComputedStyle(e).position === "fixed").map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()), sel);
const openPkg = (page: Page) => page.locator(`${pg} [data-pk40="open"]`).first().getAttribute("data-pkg", { timeout: 4000 }).catch(() => null);
const label = (page: Page, id: string) => page.locator(`${pg} [data-pk38="labels"] [data-pkid="${id}"]`).first();

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── L1 · one page, no tabs ── */
test("L1 no tab bar and no Letters/Synopses page; ?tab=syn opens Your materials on Synopses", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L1");
  await open(page, SIZES[0]);
  L.check("the page rendered (labels present)", (await page.locator(`${pg} [data-pk38="labels"]`).count()) === 1, "labels");
  L.check("no tab bar", (await page.locator(`${pg} [data-pk26="tabs"], ${pg} .p6-ptabs`).count()) === 0, "tabs");
  L.check("no Letters/Synopses page", (await page.locator(`${pg} [data-pk26="materials"]`).count()) === 0, "materials");
  L.check("Your materials is on the page", (await page.locator(`${pg} [data-pk26="lib"]`).count()) === 1, "lib");
  await open(page, SIZES[0], "pk40-ms", "/queries/packages?tab=syn");
  const sel = await page.evaluate(() => [...document.querySelectorAll('[data-pk26="lib"] [role="tab"]')].map((b) => `${(b as HTMLElement).innerText.replace(/\s+/g, " ").trim()}=${b.getAttribute("aria-selected")}`));
  L.check("Your materials' tabs read", sel.length === 3, JSON.stringify(sel));
  L.check("?tab=syn → Synopses selected", sel.some((s) => /^Synopses/.test(s) && s.endsWith("=true")), JSON.stringify(sel));
  L.check("…and only Synopses", sel.filter((s) => s.endsWith("=true")).length === 1, JSON.stringify(sel));
  const rows = await txt(page, `${pg} [data-pk26="lib-list"] .p6-lr`);
  L.check("…listing the synopsis", rows.some((r) => r.includes("One-page")), JSON.stringify(rows));
  L.done(8);
});

/* ── L2 · labels ── */
test("L2 a live label loads its package; a retired one opens the drawer; one label is selected", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L2");
  await open(page, SIZES[0]);
  const labels = await page.evaluate(() => [...document.querySelectorAll('[data-pk38="labels"] .p8-pkl-b')].map((b) => ({ id: b.getAttribute("data-pkid"), on: b.getAttribute("aria-pressed") === "true" })));
  L.check("labels are drawn (4 live)", labels.length === 4, JSON.stringify(labels));
  for (const id of ["pk40-std2", "pk40-ready", "pk40-draft", "pk40-std"]) {
    await label(page, id).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const now = await openPkg(page);
    const name = (await txt(page, `${pg} [data-pk40="open"] .p6-po-nm`))[0] ?? "";
    const lname = (await txt(page, `${pg} [data-pk38="labels"] [data-pkid="${id}"] .p8-pkl-t b`))[0] ?? "";
    const on = await page.evaluate(() => [...document.querySelectorAll('[data-pk38="labels"] .p8-pkl-b[aria-pressed="true"]')].map((b) => b.getAttribute("data-pkid")));
    L.check(`${id}: loads into the builder`, now === id, `${now}`);
    L.check(`${id}: the header name matches the label`, !!name && name === lname, `${name} vs ${lname}`);
    L.check(`${id}: it is the only label marked selected`, on.length === 1 && on[0] === id, JSON.stringify(on));
  }
  await page.locator(`${pg} [data-pk38="labels"] .p8-pkl-f`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  L.check("Show retired brings the retired label", (await label(page, "pk40-old").count()) === 1, "old");
  const before = await openPkg(page);
  await label(page, "pk40-old").click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  const d = await page.locator('[data-pk38="pkd"]').first().getAttribute("data-pkg").catch(() => null);
  L.check("the retired label opens the drawer for it", d === "pk40-old", String(d));
  L.check("…and does not load it into the builder", (await openPkg(page)) === before, `${await openPkg(page)} vs ${before}`);
  L.check("…which offers no Edit in the builder", (await page.locator('[data-pk38="pkd"] [data-pk38="edit"]').count()) === 0, "edit");
  L.done(16);
});

/* ── L3 · the package drawer ── */
test("L3 Figures opens the drawer for the open package at packageReplies' rate; Edit in the builder loads it", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L3");
  await open(page, SIZES[0]);
  const want: Record<string, { rate: string; line: RegExp }> = {
    "pk40-std": { rate: "40%", line: /^2 of 5 agents asked for more · you average 30%$/ },
    "pk40-std2": { rate: "Too early", line: /^1 of 4 agents asked for more$/ },
  };
  for (const [id, w] of Object.entries(want)) {
    await label(page, id).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.locator(`${pg} [data-pk40="open"] [data-pk38="figures"]`).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
    const d = await page.locator('[data-pk38="pkd"]').first().getAttribute("data-pkg").catch(() => null);
    L.check(`${id}: Figures opens the drawer for the open package`, d === id, String(d));
    const rate = (await txt(page, '[data-pk38="pkd-rate"] .p8-dst-r b'))[0] ?? "";
    const line = (await txt(page, '[data-pk38="pkd-rate"] .p8-dst-r span:not(.p8-rg)'))[0] ?? "";
    L.check(`${id}: the rate is packageReplies' (${w.rate})`, rate === w.rate, rate);
    L.check(`${id}: "{q} of {s} agents asked for more"`, w.line.test(line), line);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  }
  /* Edit in the builder, from a showcase's drawer */
  await label(page, "pk40-std2").click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.locator(`${pg} [data-show="best:pk40-std"] .p8-ag2-v`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  L.check("a showcase opens its package's drawer", (await page.locator('[data-pk38="pkd"][data-pkg="pk40-std"]').count()) === 1, "std drawer");
  await page.locator('[data-pk38="pkd"] [data-pk38="edit"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  L.check("Edit in the builder closes the drawer", (await page.locator('[data-pk38="pkd"]').count()) === 0, "drawer");
  L.check("…and loads the package", (await openPkg(page)) === "pk40-std", String(await openPkg(page)));
  L.done(9);
});

/* ── L4 · uniqueness ── */
test("L4 no package appears in more than one Packages showcase", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("L4");
  await open(page, SIZES[0]);
  const keys = await page.evaluate(() => [...document.querySelectorAll('[data-pk38="row-pk"] [data-pk38="show"]')].map((a) => a.getAttribute("data-show") ?? ""));
  const ids = keys.map((k) => k.split(":")[1]);
  L.check("there are showcases (3 on the fixture)", keys.length === 3, JSON.stringify(keys));
  L.check("no package twice", new Set(ids).size === ids.length, JSON.stringify(ids));
  L.check("the three slots, in order", keys.map((k) => k.split(":")[0]).join() === "best,most,prove", JSON.stringify(keys));
  L.done(3);
});

/* ── L5 · figures ── */
test("L5 every showcase's figure is packageReplies' for the fixture; nothing too early wins", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("L5");
  await open(page, SIZES[0]);
  const show = (k: string) => page.evaluate((k) => { const a = document.querySelector(`[data-show="${k}"]`) as HTMLElement | null; return a ? { h: (a.querySelector("h3") as HTMLElement).innerText.trim(), d: (a.querySelector(".p8-ag3-d") as HTMLElement).innerText.trim(), bars: [...a.querySelectorAll(".p8-ov-b")].map((b) => (b as HTMLElement).innerText.replace(/\s+/g, " ").trim()) } : null; }, k);
  const best = await show("best:pk40-std");
  L.check("Doing best is Standard (the one ranked package)", best?.h === "Standard", JSON.stringify(best));
  L.check("…40% of agents asked for more: 2 of 5, against your 30% average.", best?.d === "40% of agents asked for more: 2 of 5, against your 30% average.", String(best?.d));
  L.check("…Standard 2 is hatched in its bars (too early)", !!best?.bars.some((b) => /^Standard 2 –$/.test(b)), JSON.stringify(best?.bars));
  const most = await show("most:pk40-std2");
  L.check("Sent the most is Standard 2, out to 4", most?.d === "Out to 4 agents.", JSON.stringify(most));
  const prove = await show("prove:pk40-draft");
  L.check("Still to prove is a live, unsent package", !!prove && /^Not sent yet/.test(prove.d), JSON.stringify(prove));
  const want: [string, string, string][] = [
    ["let:pk40-let-a", "Hook-first", "33% of the 6 agents who got it asked for more."],
    ["syn:pk40-syn", "One-page", "33% of the 9 agents who got it asked for more."],
    ["ver:pk40-v1", "Fast-paced opening", "30% of the 10 agents who got it asked for more."],
  ];
  for (const [k, h, d] of want) {
    const s = await show(k);
    L.check(`${h}: drawn`, s?.h === h, JSON.stringify(s));
    L.check(`${h}: ${d}`, s?.d === d, String(s?.d));
  }
  /* the winners: never an unranked one (Standard 2, Comps-forward) */
  const winners = await txt(page, `${pg} [data-pk38="agg"] [data-show^="best:"] h3, ${pg} [data-pk38="row-pieces"] [data-pk38="show"] h3`);
  L.check("winners are read", winners.length === 4, JSON.stringify(winners));
  L.check("no winner is under the threshold", !winners.some((w) => /^(Standard 2|Comps-forward)$/.test(w)), JSON.stringify(winners));
  const band = await txt(page, `${pg} [data-pk38="totals"] > div`);
  L.check("band totals: 10 · 60% · 30%", band.join(" | ") === "10 queries sent with a package | 60% got a reply | 30% asked for more", band.join(" | "));
  L.done(13);
});

/* ── L6 · the band spans the sheet ── */
for (const size of SIZES) {
  test(`L6 the results band spans the sheet's full width at ${size.width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const L = new Ledger(`L6-${size.width}`);
    await open(page, size);
    const r = await page.evaluate(() => {
      const s = [...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk26="page"]')) as HTMLElement;
      const sheet = s.getBoundingClientRect();
      const b = s.querySelector('[data-pk38="band"]')!.getBoundingClientRect();
      return { sheet: { l: sheet.left, w: s.clientWidth }, band: { l: b.left, w: b.width } };
    });
    L.check("the sheet is measured", r.sheet.w > 600, JSON.stringify(r));
    L.check(`the band's width is the sheet's (±1)`, Math.abs(r.band.w - r.sheet.w) <= 1, JSON.stringify(r));
    L.check(`the band starts at the sheet's left (±1)`, Math.abs(r.band.l - r.sheet.l) <= 1, JSON.stringify(r));
    L.done(3);
  });
}

/* ── L7 · empty ── */
test("L7 no packaged queries: the empty line, the dashed message, no showcases", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("L7");
  await open(page, SIZES[0], "pk40-new");
  const line = (await txt(page, `${pg} [data-pk38="band"] .p8-bnr-l`))[0] ?? "";
  L.check("the band says what it will show", line === "Once you’ve logged queries with a package, this shows what’s working.", line);
  L.check("no totals", (await page.locator(`${pg} [data-pk38="totals"] > div`).count()) === 0, "totals");
  const empty = (await txt(page, `${pg} [data-pk38="empty"]`))[0] ?? "";
  L.check("the dashed message", empty === "Nothing to show yet. Log a query with a package and its results start here.", empty);
  L.check("no showcases", (await page.locator(`${pg} [data-pk38="show"]`).count()) === 0, "shows");
  L.done(4);
});

/* ── L8 · no small mono capitals ── */
async function monoCensus(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const roots = [...document.querySelectorAll('[data-pk26="page"], .p6-layer')];
    for (const r of roots) {
      for (const e of [r, ...r.querySelectorAll("*")] as HTMLElement[]) {
        if (!e.offsetParent && getComputedStyle(e).position !== "fixed") continue;
        if (![...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
        if (e.closest("[data-art]")) continue;
        const cs = getComputedStyle(e);
        if (/mono/i.test(cs.fontFamily) && cs.textTransform === "uppercase") out.push(`${e.tagName}.${e.className}: ${(e.innerText ?? "").trim().slice(0, 30)}`);
      }
    }
    return out;
  });
}
test("L8 no visible element on the page or its layers is mono AND uppercase", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("L8");
  for (const ms of ["pk40-ms", "pk40-new"]) {
    await open(page, SIZES[0], ms);
    const hits = await monoCensus(page);
    L.check(`${ms} · the page: no mono capitals`, hits.length === 0, JSON.stringify(hits.slice(0, 8)));
    for (const [what, sel, layer] of [["New package dialog", '[data-pk38="labels"] .p8-pkl-new', ".p6-pdlg"], ["How it works", ".p6-hd-s", '[data-pk26="hwm"]']] as const) {
      const b = page.locator(`${pg} ${sel}`).first();
      if (await b.count()) { await b.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(600); }
      L.check(`${ms} · ${what} opened`, (await page.locator(layer).count()) > 0, layer);
      const h = await monoCensus(page);
      L.check(`${ms} · ${what}: no mono capitals`, h.length === 0, JSON.stringify(h.slice(0, 8)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    if (ms === "pk40-ms") {
      await page.locator(`${pg} [data-pk26="lib"] .p6-lr-ed`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
      L.check(`${ms} · the material drawer opened`, (await page.locator(".p6-cx-drw.p6-on").count()) === 1, "drawer");
      const dh = await monoCensus(page);
      L.check(`${ms} · the material drawer: no mono capitals`, dh.length === 0, JSON.stringify(dh.slice(0, 8)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await page.locator(`${pg} [data-pk38="figures"]`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
      L.check(`${ms} · the package drawer opened`, (await page.locator('[data-pk38="pkd"]').count()) === 1, "pkd");
      const ph = await monoCensus(page);
      L.check(`${ms} · the package drawer: no mono capitals`, ph.length === 0, JSON.stringify(ph.slice(0, 8)));
      await page.keyboard.press("Escape");
    }
  }
  L.done(14);
});

/* ── L9 · a sent package opens locked ── */
test("L9 a sent package opens in the builder locked; a Ready one does not", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L9");
  await open(page, SIZES[0]);
  const read = () => page.evaluate(() => {
    const o = document.querySelector('[data-pk26="page"] [data-pk40="open"]') as HTMLElement | null;
    const lib = document.querySelector('[data-pk26="page"] [data-pk26="lib"]');
    return o ? { id: o.dataset.pkg, locked: o.hasAttribute("data-locked"), x: o.querySelectorAll(".p6-mr-x").length,
      ticks: [...o.querySelectorAll(".p6-exc > button[aria-pressed]")].filter((b) => !(b as HTMLButtonElement).disabled).length,
      addX: o.querySelectorAll(".p6-exa-b").length, line: o.querySelectorAll('[data-pk38="lock-line"]').length,
      libAdd: lib ? [...lib.querySelectorAll(".p6-lr-add")].filter((b) => !(b as HTMLButtonElement).disabled && /^Add$/.test((b as HTMLElement).innerText.trim())).length : -1,
      draggable: lib ? lib.querySelectorAll('.p6-lr[draggable="true"]').length : -1 } : null;
  });
  for (const [id, locked] of [["pk40-std", true], ["pk40-std2", true], ["pk40-ready", false]] as const) {
    await label(page, id).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const r = await read();
    L.check(`${id}: open`, r?.id === id, JSON.stringify(r));
    L.check(`${id}: ${locked ? "locked" : "not locked"}`, r?.locked === locked, JSON.stringify(r));
    if (locked) {
      L.check(`${id}: no ✕`, r?.x === 0, JSON.stringify(r));
      L.check(`${id}: no extra to tick and no + Add`, r?.ticks === 0 && r?.addX === 0, JSON.stringify(r));
      L.check(`${id}: no Add in Your materials, nothing draggable`, r?.libAdd === 0 && r?.draggable === 0, JSON.stringify(r));
      L.check(`${id}: the lock line`, r?.line === 1, JSON.stringify(r));
    } else {
      L.check(`${id}: Add and drag are live`, (r?.libAdd ?? 0) > 0 && (r?.draggable ?? 0) > 0, JSON.stringify(r));
    }
  }
  L.done(13);
});

/* ── L10 · Make a copy ── */
test("L10 Make a copy opens New package with a copy of that package chosen", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("L10");
  await open(page, SIZES[0]);
  await label(page, "pk40-std2").click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.locator(`${pg} [data-pk38="figures"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.locator('[data-pk38="pkd"] [data-pk38="copy"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  L.check("the drawer closed", (await page.locator('[data-pk38="pkd"]').count()) === 0, "pkd");
  const ch = await page.evaluate(() => [...document.querySelectorAll('.p6-pd-from [role="radio"]')].map((b) => `${(b as HTMLElement).innerText.split("\n")[0]}=${b.getAttribute("aria-checked")}`));
  L.check("New package opened with its Start from", ch.length === 2, JSON.stringify(ch));
  L.check("…“A copy of Standard 2” chosen", ch.includes("A copy of Standard 2=true"), JSON.stringify(ch));
  await page.keyboard.press("Escape");
  L.done(3);
});

/* ── L11 · smoke ── */
test("L11 both manuscripts render with no console errors", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("L11");
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  for (const ms of ["pk40-ms", "pk40-new"]) {
    await open(page, SIZES[0], ms);
    for (const k of ["labels", "band", "agg"]) L.check(`${ms}: ${k} renders`, (await page.locator(`${pg} [data-pk38="${k}"]`).count()) === 1, k);
    L.check(`${ms}: the builder renders`, (await page.locator(`${pg} [data-pk40="wbf"]`).count()) === 1, "wbf");
  }
  const real = errs.filter((e) => !/favicon|ResizeObserver loop/i.test(e));
  L.check("no console errors", real.length === 0, JSON.stringify(real.slice(0, 5)));
  L.done(9);
});

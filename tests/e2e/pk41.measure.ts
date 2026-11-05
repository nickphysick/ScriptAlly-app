/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 — the SP41 locks on the rendered page, at 1512 × 982 and 1280 × 832. FIXTURE: seedPk40.mjs
 * (pk40-ms in use) and pk41Fixture.mjs (the strip's preference, no active package, no packages), re-seeded per case
 * that changes anything and restored in afterAll. L2's paid-Pro half signs in as dv1@scriptally.test (Discover v1's
 * Pro fixture account; read only).
 *
 *   L1 Page: the gradient ground under the pattern at the Contact list's opacity; no header card art, label tiles, raised
 *      panel or explainer; no horizontal overflow
 *   L2 Banner: shown for a founding writer, absent for paid Pro; one line; the folder tab takes its colour; ✕ hides it
 *      for good (after a reload); "Tell us what you think" opens FeedbackDock; How it works brings it back
 *   L3 Header: exactly one navy panel above the results (the rail head and the builder band are not navy); a one-line
 *      subheader directly under the title, naming the active manuscript; no image
 *   L4 Batch: a strip INSIDE the header, flush to its left, right and bottom (±1); names the active package and its
 *      pieces (against the builder's own steps); Change sets another; Open → selects it; "Choose one →" with no active
 *      package; absent with no packages
 *   L5 Rail: 300 ±2 wide at 1512, 262 ±2 at 1280; its top level with the builder's (±1); groups Out with agents / Ready /
 *      Draft in that order with counts that are their rows; each row's line in its stage's words; the open row's left
 *      edge is the package's colour; selecting a row does not move the page; Retired folded (and absent at 0); still
 *      at the top after scrolling 600, its rows scrolling inside it; ↓ and Enter
 *   L6 Frames: builder, totals, three best cards, two tables — a 7 ±1 white rim, a 1px rgb(227,213,201) frame, the bands;
 *      the builder band's stripe is the open package's colour, for two packages of different colours
 *   L7 Preview: under the steps (its top at or below the last step's bottom); a sent package's buttons inside its well
 *   L8 Hawk: fixed bottom-right (± 1, before and after scrolling 600), 212 ±2 tall, clear of the content; none at 390
 *   L9 How it works: five steps with the exact titles, none of the old guide's words, Escape closes it
 *
 * Breaks: `PK41_MUTATE=<L1…L9>` applies that lock's break in the page.
 *
 * v42 (5 Nov): L4 (the batch strip), L5 (the rail), L7 (the preview under the steps) and L9 (the five-step guide) are
 * RETIRED with what they measured (tests/e2e/RETIRED-submission-packages-v42.md); L1, L3 and L6 are re-pointed to the
 * stat tiles and the v42 builder (whose frame is pk42.measure.ts L3's). L2 and L8 stand as written.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v41";
const MUT = process.env.PK41_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const node = (file: string, ...args: string[]) => execFileSync("node", [`tests/e2e/${file}`, ...args], { stdio: "pipe" }).toString();
const seed = (...a: string[]) => node("seedPk40.mjs", ...a);
const fix = (...a: string[]) => node("pk41Fixture.mjs", ...a);
const pg = `[data-pk41="page"]`;

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

/* Each lock's break, applied in the page. */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  L1: { css: `.pk39-wpg > .wpg-scroll { background-image: none !important; }` },
  L2: { css: `.p41-fb .p41-fb-tx { white-space: normal !important; } .p41-fb .p41-fb-tx span { display: inline !important; } .ws-app.ws-app .ws-main { --ink-tab: #fbf9f5 !important; }` },
  L3: { css: `.p41 .p41-bld .p93-bh { background: #2d3a50 !important; } .p41 .p41-hd .p41-sub { white-space: normal !important; flex-basis: 100% !important; }` },
  L4: { css: `.p41 .p41-hd.p41-wbt .p41-bt { margin: 18px 0 0 !important; flex-basis: 100% !important; }` },
  L5: { css: `.p41 .p41-ws { grid-template-columns: 340px minmax(0, 1fr) !important; } .p41 .p41-rr.p41-on { border-left-color: #2d3a50 !important; } .p41 .p41-rail { position: static !important; max-height: none !important; }` },
  L6: { css: `.p41 .p41-fr { padding: 0 !important; }` },
  L7: { css: `.p41 .p41-bld .p93-b { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; } .p41 .p41-bld .p93-btn { padding: 0 90px !important; } .p41 .p41-bld .p93-pv-f, .p41 .p41-bld .p93-pv-b { flex-wrap: nowrap !important; }` },
  L8: { css: `.p41-perch { right: 120px !important; height: 260px !important; }` },
  L9: { js: `new MutationObserver(() => { const t = document.querySelector('[data-pk41="hw-title"]'); if (t && t.textContent === 'Pick each piece') t.textContent = 'Drag them into the package'; }).observe(document, { subtree: true, childList: true, characterData: true });` },
};

async function open(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "pk40-ms"); } catch { /* */ } });
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  if (m?.css) await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), m.css);
  await openRoute(page, "/queries/packages", size);
  await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(900);
}
const SC = `[...document.querySelectorAll(".wpg-scroll")].find((x) => x.querySelector('[data-pk41="page"]'))`;
async function scrollTo(page: Page, sel: string, offset = 0) {
  await page.evaluate(({ sel, offset, sc }) => {
    const s = (0, eval)(sc) as HTMLElement; const el = s?.querySelector(sel) as HTMLElement | null;
    if (s && el) s.scrollTop = el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - offset;
  }, { sel, offset, sc: SC });
  await page.waitForTimeout(350);
}
const rect = (page: Page, sel: string) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
const near = (a: number | undefined, b: number, t = 1) => typeof a === "number" && Math.abs(a - b) <= t;

/* one worker, in order, and every case runs even after a red (each reseeds what it needs) */
test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); fix("--show-banner"); });
test.afterAll(() => { fix("--show-banner"); seed("--clean"); });

for (const size of SIZES) {
  const at = `${size.width}`;

  test(`L1 page · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L1-${at}`);
    await open(page, size);
    const r = await page.evaluate((sc) => {
      const s = (0, eval)(sc) as HTMLElement; const cs = getComputedStyle(s);
      const root = document.querySelector('[data-pk41="page"]') as HTMLElement;
      return {
        img: cs.backgroundImage, scrollW: s.scrollWidth, clientW: s.clientWidth, docW: document.documentElement.scrollWidth, winW: innerWidth,
        gone: ['[data-pk39="hd-card"]', '[data-pk38="labels"]', '[data-pk392="panel"]', '[data-pk39="tip"]', '[data-pk39="kicker"]', ".p8-bnr", ".p9-ag3", '[data-pk41="list"]', '[data-pk41="list-bar"]', "[data-pk41-tab]", '[data-pk41="rail"]', '[data-pk41="batch"]'].map((q) => [q, root.querySelectorAll(q).length]),
        headerImgs: root.querySelectorAll('[data-pk41="header"] img').length, kicker: root.textContent?.includes("Build, view and edit") ?? false, rows: root.querySelectorAll("[data-pk42-tile]").length, /* v42: the stat tiles (re-pointed from the rail rows) */
      };
    }, SC);
    const [ours, theirs] = await Promise.all(["/images/packages/packages-pattern.svg", "/images/contact/doodle-tile.svg"].map((u) => page.evaluate(async (u) => (await (await fetch(u)).text()).match(/stroke-opacity="([\d.]+)"/)?.[1] ?? null, u)));
    L.check("population", r.rows > 0, `${r.rows} package tiles`);
    L.check("ground: the gradient", /linear-gradient\(rgb\(251, 249, 245\)( 0%)?, rgb\(238, 235, 229\)( 100%)?\)/.test(r.img), r.img.slice(0, 200));
    L.check("ground: the pattern over it", /packages-pattern\.svg/.test(r.img) && r.img.indexOf("packages-pattern") < r.img.indexOf("linear-gradient"), r.img.slice(0, 120));
    L.check("pattern at the Contact list's opacity", !!ours && ours === theirs, `packages ${ours} · contact ${theirs}`);
    for (const [q, n] of r.gone) L.check(`retired: ${q}`, n === 0, `${n} in the DOM`);
    L.check("no BUILD, VIEW AND EDIT", !r.kicker, String(r.kicker));
    L.check("no header art", r.headerImgs === 0, `${r.headerImgs}`);
    L.check("no horizontal overflow (scroller)", r.scrollW <= r.clientW, `${r.scrollW} > ${r.clientW}`);
    L.check("no horizontal overflow (document)", r.docW <= r.winW, `${r.docW} > ${r.winW}`);
    L.done(14);
  });

  test(`L2 banner · ${at}`, async ({ page, browser }) => {
    test.setTimeout(300_000);
    const L = new Ledger(`L2-${at}`);
    fix("--show-banner");
    await open(page, size);
    const plan = JSON.parse(fix("--banner").trim().split("\n").pop()!).plan;
    const b = await page.evaluate(() => {
      const el = document.querySelector('[data-pk41="banner"]') as HTMLElement | null, tx = el?.querySelector('[data-pk41="banner-text"]') as HTMLElement | null;
      const tab = document.querySelector(".ws-ftab") as HTMLElement | null, foot = document.querySelector(".ws-ftfl") as SVGElement | null;
      return { n: document.querySelectorAll('[data-pk41="banner"]').length, h: el?.getBoundingClientRect().height ?? null, sw: tx?.scrollWidth ?? null, cw: tx?.clientWidth ?? null,
        th: tx ? tx.getClientRects().length : 0, tab: tab ? getComputedStyle(tab).backgroundColor : null, foot: foot ? getComputedStyle(foot).fill : null };
    });
    L.check("population: the harness is a founding writer (not paid Pro)", plan !== "Pro", `plan ${plan}`);
    L.check("shown for a founding writer", b.n === 1, `${b.n} strips`);
    L.check("one line: height ≤ 60", (b.h ?? 99) <= 60, `${b.h}`);
    L.check("one line: text scrollWidth ≤ clientWidth", b.sw != null && b.cw != null && b.sw <= b.cw, `${b.sw} / ${b.cw}`);
    L.check("folder tab takes the strip's colour", b.tab === "rgb(251, 239, 233)", `${b.tab}`);
    L.check("its curved foot too", b.foot === "rgb(251, 239, 233)", `${b.foot}`);
    /* Tell us what you think → FeedbackDock */
    await page.locator('[data-pk41="banner-ask"]').click();
    const dock = await page.locator('[data-fb="panel"]').first().waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
    L.check("“Tell us what you think” opens FeedbackDock", dock, String(dock));
    if (dock) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
    /* ✕ hides it, for good */
    await page.locator('[data-pk41="banner-x"]').click();
    await page.waitForTimeout(1500);
    L.check("✕ hides it", (await page.locator('[data-pk41="banner"]').count()) === 0, "still there");
    const stored = JSON.parse(fix("--banner").trim().split("\n").pop()!).hidden;
    L.check("the dismissal is stored on the user", stored === true, String(stored));
    await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
    L.check("…and stays hidden after a reload", (await page.locator('[data-pk41="banner"]').count()) === 0, "back after reload");
    const tab2 = await page.evaluate(() => { const t = document.querySelector(".ws-ftab"); return t ? getComputedStyle(t).backgroundColor : null; });
    L.check("the folder tab is cream again", tab2 !== "rgb(251, 239, 233)", `${tab2}`);
    /* How it works brings it back */
    await page.locator(`${pg} [data-pk41="how"]`).click(); await page.waitForTimeout(500);
    const link = page.locator('[data-pk41="show-founding"]');
    L.check("How it works offers the note back", (await link.count()) === 1, `${await link.count()}`);
    if (await link.count()) { await link.click(); await page.waitForTimeout(1500); }
    L.check("…and it comes back", (await page.locator('[data-pk41="banner"]').count()) === 1, "not back");
    /* paid Pro: never */
    const pro = await proHasBanner(browser, size);
    L.check("population: the Pro page rendered its header", pro.header, String(pro.header));
    L.check("absent for a paid Pro user", pro.banner === 0, `${pro.banner} strips`);
    fix("--show-banner");
    L.done(15);
  });

  test(`L3 header · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L3-${at}`);
    seed();
    await open(page, size);
    const h = await page.evaluate(() => {
      const root = document.querySelector('[data-pk41="page"]') as HTMLElement;
      const el = root.querySelector('[data-pk41="header"]') as HTMLElement, sub = el.querySelector('[data-pk41="sub"]') as HTMLElement, ttl = el.querySelector('[data-pk41="title"]') as HTMLElement;
      const res = root.querySelector('[data-pk41="results"]') as HTMLElement | null, resTop = res ? res.getBoundingClientRect().top : Infinity;
      const NAVY = "rgb(45, 58, 80)";
      /* every box above the results that paints the navy as its own ground, and is at least 200 × 40 */
      const navy = [...root.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width >= 200 && b.height >= 40 && b.top < resTop && getComputedStyle(e).backgroundColor === NAVY; }).map((e) => (e as HTMLElement).dataset.pk41 || (e as HTMLElement).className);
      const bg = (q: string) => { const e = root.querySelector(q); return e ? getComputedStyle(e).backgroundColor : null; };
      const sr = sub.getBoundingClientRect(), tr = ttl.getBoundingClientRect();
      return { navy, head: bg('[data-pk41="rail-head"]'), band: bg('[data-pk41="builder-frame"] .p93-bh'), sw: sub.scrollWidth, cw: sub.clientWidth,
        lines: Math.round(sr.height / parseFloat(getComputedStyle(sub).lineHeight)), under: sr.top - tr.bottom, sameCol: Math.abs(sr.left - tr.left),
        text: sub.textContent, imgs: el.querySelectorAll("img, svg image, picture").length, hbg: getComputedStyle(el).backgroundColor };
    });
    L.check("the header is navy", h.hbg === "rgb(45, 58, 80)", h.hbg);
    L.check("exactly one navy panel above the results", h.navy.length === 1 && h.navy[0] === "header", JSON.stringify(h.navy));
    L.check("the builder's heading row is not navy", !!h.band && h.band !== "rgb(45, 58, 80)", `${h.band}`);
    L.check("subheader: one line (no overflow)", h.sw <= h.cw, `${h.sw} / ${h.cw}`);
    L.check("subheader: one line box", h.lines === 1, `${h.lines}`);
    L.check("subheader: directly under the title (0–12px), in its column", h.under >= -0.5 && h.under <= 12 && h.sameCol <= 1, `gap ${h.under} · x ${h.sameCol}`);
    L.check("subheader names the active manuscript", (h.text ?? "").includes("for Locks of v40,"), `${h.text}`);
    L.check("no image in the header", h.imgs === 0, `${h.imgs}`);
    L.done(8);
  });

  /* v42: retired (RETIRED-submission-packages-v42.md) */
  test.skip(`L4 batch · ${at}`, async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger(`L4-${at}`);
    seed();
    await open(page, size);
    const g = await page.evaluate(() => {
      const hd = document.querySelector('[data-pk41="page"] [data-pk41="header"]') as HTMLElement, bt = document.querySelector('[data-pk41="page"] [data-pk41="batch"]') as HTMLElement | null;
      const a = hd.getBoundingClientRect(), b = bt?.getBoundingClientRect();
      return { inside: !!bt && hd.contains(bt), l: b ? b.left - a.left : null, r: b ? a.right - b.right : null, bot: b ? a.bottom - b.bottom : null };
    });
    L.check("the strip is inside the header", g.inside, String(g.inside));
    L.check("flush left ±1", near(g.l ?? 99, 0), `${g.l}`);
    L.check("flush right ±1", near(g.r ?? 99, 0), `${g.r}`);
    L.check("flush bottom ±1", near(g.bot ?? 99, 0), `${g.bot}`);
    const chips = await page.evaluate(() => {
      const t = (q: string) => document.querySelector(`[data-pk41="page"] [data-pk41="${q}"]`)?.textContent?.trim() ?? null;
      const syn = document.querySelector('[data-pk41="page"] [data-pk41="batch-syn"]') as HTMLElement | null;
      return { active: document.querySelector('[data-pk41="batch"]')?.getAttribute("data-active"), name: t("batch-name"), ver: t("batch-ver"), let: t("batch-let"), syn: t("batch-syn"), synShown: !!syn && getComputedStyle(syn).display !== "none" };
    });
    const stored = JSON.parse(fix("--active").trim().split("\n").pop()!).active;
    L.check("the strip is the stored active package", chips.active === stored && !!stored, `${chips.active} / ${stored}`);
    /* Open → selects it in the workspace; then the pieces, against the builder's own steps for that package */
    await page.locator(`${pg} [data-pk41-row="pk40-draft"]`).click(); await page.waitForTimeout(500);
    await page.locator(`${pg} [data-pk41="batch-open"]`).click(); await page.waitForTimeout(800);
    const openRow = await page.locator(`${pg} .p41-rr.p41-on`).getAttribute("data-pk41-row");
    L.check("Open → selects the active package", openRow === stored, `${openRow}`);
    const steps = await page.evaluate(() => Object.fromEntries(["ver", "let", "syn"].map((k) => [k, document.querySelector(`[data-pk41="page"] [data-pk393-step="${k}"] .p93-pick`)?.textContent?.trim() ?? null])));
    const pkName = await page.locator(`${pg} [data-pk39="name"]`).first().textContent();
    L.check("names the package", chips.name === pkName?.trim(), `${chips.name} / ${pkName}`);
    L.check("its version", !!steps.ver && (chips.ver ?? "").endsWith(steps.ver), `${chips.ver} / ${steps.ver}`);
    L.check("its letter", !!steps.let && (chips.let ?? "").endsWith(steps.let), `${chips.let} / ${steps.let}`);
    L.check("its synopsis", size.width > 1400 ? !!steps.syn && (chips.syn ?? "").endsWith(steps.syn) && chips.synShown : !chips.synShown, `${chips.syn} / ${steps.syn} shown ${chips.synShown}`);
    /* Change: another package through the existing writer */
    await scrollTo(page, '[data-pk41="header"]', 300);
    await page.locator(`${pg} [data-pk41="batch-change"]`).click(); await page.waitForTimeout(300);
    const opts = await page.locator('[data-pk41="batch-picker"] [data-pk41-pick]').evaluateAll((els) => els.map((e) => e.getAttribute("data-pk41-pick")));
    L.check("Change lists the Ready and Out-with-agents packages", JSON.stringify([...opts].sort()) === JSON.stringify(["pk40-ready", "pk40-std", "pk40-std2"]), JSON.stringify(opts));
    await page.locator('[data-pk41="batch-picker"] [data-pk41-pick="pk40-ready"]').click();
    await expect.poll(() => page.locator('[data-pk41="batch"]').getAttribute("data-active"), { timeout: 8000 }).toBe("pk40-ready").catch(() => {});
    const after = await page.locator('[data-pk41="batch"]').getAttribute("data-active");
    const stored2 = JSON.parse(fix("--active").trim().split("\n").pop()!).active;
    L.check("the strip updates", after === "pk40-ready", `${after}`);
    L.check("…and the manuscript's active package is written", stored2 === "pk40-ready", `${stored2}`);
    /* no active package */
    fix("--no-active");
    await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
    L.check("no active package: “Choose one →”", (await page.locator(`${pg} [data-pk41="batch-choose"]`).textContent())?.trim() === "Choose one →", "missing");
    /* no packages */
    fix("--no-packages");
    await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
    L.check("no packages: the strip is absent", (await page.locator(`${pg} [data-pk41="batch"]`).count()) === 0, "present");
    seed();
    L.done(15);
  });

  /* v42: retired (RETIRED-submission-packages-v42.md) */
  test.skip(`L5 rail · ${at}`, async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger(`L5-${at}`);
    seed(); fix("--colours");
    const dump = JSON.parse(seed("--dump").trim().split("\n").pop()!) as { all: { id: string; status: string; firstSentAt: boolean }[] };
    const live = dump.all.filter((p) => p.status !== "Retired"), retired = dump.all.length - live.length;
    await open(page, size);
    const r = await page.evaluate(() => {
      const root = document.querySelector('[data-pk41="page"]') as HTMLElement, rail = root.querySelector('[data-pk41="rail"]') as HTMLElement;
      const fr = root.querySelector('[data-pk41="builder-frame"]') as HTMLElement;
      return { n: root.querySelectorAll('[data-pk41="rail"]').length, w: rail.getBoundingClientRect().width, top: rail.getBoundingClientRect().top, ftop: fr.getBoundingClientRect().top,
        count: rail.querySelector('[data-pk41="rail-count"]')?.textContent?.trim(),
        groups: [...rail.querySelectorAll("[data-pk41-group]")].map((g) => ({ k: g.getAttribute("data-pk41-group"), n: Number(g.querySelector("[data-pk41-n]")?.textContent), rows: g.querySelectorAll("[data-pk41-row]").length,
          lines: [...g.querySelectorAll("[data-pk41-row]")].map((x) => ({ id: x.getAttribute("data-pk41-row"), t: x.querySelector("small")?.textContent?.trim() })) })),
        toggle: rail.querySelector('[data-pk41="retired-toggle"]')?.getAttribute("aria-expanded") ?? null };
    });
    L.check("one rail", r.n === 1, `${r.n}`);
    L.check(`width ${size.width > 1400 ? 300 : 262} ±2`, near(r.w, size.width > 1400 ? 300 : 262, 2), `${r.w}`);
    L.check("its top level with the builder's ±1", near(r.top, r.ftop), `${r.top} / ${r.ftop}`);
    L.check("the head counts the live packages", r.count === String(live.length), `${r.count} / ${live.length}`);
    const liveG = r.groups.filter((g) => g.k !== "retired");
    L.check("groups in order: out · ready · draft", JSON.stringify(liveG.map((g) => g.k)) === JSON.stringify(["out", "ready", "draft"]), JSON.stringify(liveG.map((g) => g.k)));
    for (const g of liveG) L.check(`group ${g.k}: its count is its rows`, g.n === g.rows && g.rows > 0, `${g.n} / ${g.rows}`);
    L.check("Out with agents holds the stored sent packages", liveG.find((g) => g.k === "out")?.rows === live.filter((p) => p.firstSentAt).length, "");
    const line = (id: string) => r.groups.flatMap((g) => g.lines).find((x) => x.id === id)?.t ?? "";
    L.check("a sent row: “{n} sent · …”", /^\d+ sent · (\d+% asked for more|\d of 4 answers in)$/.test(line("pk40-std")), line("pk40-std"));
    L.check("a ready row: “Ready to send”", line("pk40-ready") === "Ready to send", line("pk40-ready"));
    L.check("a draft row: what it needs", line("pk40-draft") === "Needs a version and a letter", line("pk40-draft"));
    const berry = await page.evaluate(() => { const e = document.querySelector('[data-pk41="page"] [data-pk41-row="pk40-draft"] small em'); return e ? getComputedStyle(e).color : null; });
    L.check("…in berry", berry === "rgb(155, 74, 87)", `${berry}`);
    L.check(retired ? "Retired folded by default" : "no retired: no Retired group", retired ? r.toggle === "false" : r.toggle === null, `${r.toggle} (${retired} retired)`);
    /* the open row wears its colour; selecting moves nothing */
    for (const [id, want] of [["pk40-std", "rgb(88, 58, 90)"], ["pk40-ready", "rgb(46, 86, 65)"]] as const) {
      const before = await page.evaluate((sc) => ((0, eval)(sc) as HTMLElement).scrollTop, SC);
      await page.locator(`${pg} [data-pk41-row="${id}"]`).click(); await page.waitForTimeout(500);
      const s = await page.evaluate(({ id, sc }) => { const e = document.querySelector(`[data-pk41="page"] [data-pk41-row="${id}"]`) as HTMLElement; return { on: e.classList.contains("p41-on"), c: getComputedStyle(e).borderLeftColor, w: getComputedStyle(e).borderLeftWidth, top: ((0, eval)(sc) as HTMLElement).scrollTop }; }, { id, sc: SC });
      L.check(`${id}: selected`, s.on, String(s.on));
      L.check(`${id}: a 3px left edge in its colour`, s.c === want && s.w === "3px", `${s.w} ${s.c}`);
      L.check(`${id}: selecting did not move the page`, near(s.top, before), `${before} → ${s.top}`);
    }
    /* keyboard: ↓ then Enter selects the next row */
    await page.locator(`${pg} [data-pk41-row="pk40-std"]`).focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
    const ids = r.groups.flatMap((g) => g.lines.map((x) => x.id));
    const nextId = ids[ids.indexOf("pk40-std") + 1];
    L.check("↓ and Enter select the next row", (await page.locator(`${pg} .p41-rr.p41-on`).getAttribute("data-pk41-row")) === nextId, `want ${nextId}`);
    /* sticky: still at the top after scrolling 600, its rows scroll inside it */
    const t0 = await page.evaluate(() => (document.querySelector('[data-pk41="rail"]') as HTMLElement).getBoundingClientRect().top);
    await page.evaluate((sc) => { ((0, eval)(sc) as HTMLElement).scrollTop += 600; }, SC); await page.waitForTimeout(400);
    const st = await page.evaluate((sc) => { const s = (0, eval)(sc) as HTMLElement, rl = document.querySelector('[data-pk41="rail"]') as HTMLElement, rows = rl.querySelector('[data-pk41="rail-rows"]') as HTMLElement; const sr = s.getBoundingClientRect(), b = rl.getBoundingClientRect();
      return { scrolled: s.scrollTop, top: b.top - sr.top, bottom: b.bottom, port: sr.bottom, oy: getComputedStyle(rows).overflowY }; }, SC);
    L.check("population: the page scrolled 600", st.scrolled >= 590, `${st.scrolled} (rail top was ${t0})`);
    L.check("after scrolling 600: the rail is at the scroller's top (14 ±1)", near(st.top, 14), `${st.top}`);
    L.check("after scrolling 600: the rail ends inside the scrollport", st.bottom <= st.port + 0.5, `${st.bottom} / ${st.port}`);
    L.check("its rows scroll inside it", st.oy === "auto" || st.oy === "scroll", st.oy);
    /* no packages: the empty line; nothing retired */
    fix("--no-packages");
    await page.reload(); await page.locator(`${pg} [data-pk41="header"]`).first().waitFor({ state: "visible", timeout: 30_000 }); await page.waitForTimeout(1500);
    const z = await page.evaluate(() => ({ rail: document.querySelectorAll('[data-pk41="page"] [data-pk41="rail"]').length, ret: document.querySelectorAll('[data-pk41="page"] [data-pk41="retired-toggle"]').length }));
    L.check("no packages: no rail (the first-run builder only) and no Retired", z.ret === 0, `${z.rail} rail · ${z.ret} retired`);
    seed();
    L.done(24);
  });

  test(`L6 frames · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L6-${at}`);
    seed();
    await open(page, size);
    const f = await page.evaluate(() => {
      const one = (el: Element | null) => {
        if (!el) return null;
        const fi = el.querySelector(":scope > .p41-fi") as HTMLElement | null, band = fi?.querySelector(":scope > .p41-band, :scope > .p93-bh") as HTMLElement | null;
        const cs = getComputedStyle(el as HTMLElement);
        return { pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat), rim: cs.backgroundColor, bw: fi ? getComputedStyle(fi).borderTopWidth : null, bc: fi ? getComputedStyle(fi).borderTopColor : null, band: band ? getComputedStyle(band).backgroundColor : null };
      };
      const q = (s: string) => document.querySelector(`[data-pk41="page"] ${s}`);
      return { totals: one(q('[data-pk41="totals"]')), best: one(q('[data-pk41="best-best"]')), most: one(q('[data-pk41="best-most"]')), prove: one(q('[data-pk41="best-prove"]')), tpk: one(q('[data-pk41="table-pk"]')), tpc: one(q('[data-pk41="table-pc"]')) };
    });
    const want: Record<string, string | null> = { totals: "rgb(45, 58, 80)", best: "rgb(244, 230, 214)", most: "rgb(226, 230, 224)", prove: "rgb(235, 231, 225)", tpk: "rgb(235, 231, 225)", tpc: "rgb(235, 231, 225)" };
    for (const [k, v] of Object.entries(f)) {
      L.check(`${k}: present`, !!v, "missing");
      if (!v) continue;
      L.check(`${k}: a 7 ±1 white rim`, v.pad.every((p) => near(p, 7)) && v.rim === "rgb(255, 255, 255)", `${v.pad.join(",")} ${v.rim}`);
      L.check(`${k}: a 1px rgb(227,213,201) frame`, v.bw === "1px" && v.bc === "rgb(227, 213, 201)", `${v.bw} ${v.bc}`);
      if (want[k]) L.check(`${k}: its band`, v.band === want[k], `${v.band} (want ${want[k]})`);
    }
    /* v42: the builder's frame and its colour band are retired here (pk42.measure.ts L3 holds the v42 container) */
    L.done(24);
  });

  /* v42: retired (RETIRED-submission-packages-v42.md) */
  test.skip(`L7 preview · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L7-${at}`);
    seed();
    await open(page, size);
    await page.locator(`${pg} [data-pk41-row="pk40-std"]`).click(); await page.waitForTimeout(800);
    const g = await page.evaluate(() => {
      const fr = document.querySelector('[data-pk41="page"] [data-pk41="builder-frame"]') as HTMLElement;
      const steps = [...fr.querySelectorAll("[data-pk393-step]")].map((e) => e.getBoundingClientRect().bottom), pv = fr.querySelector(".p93-pv") as HTMLElement;
      return { steps: steps.length, last: Math.max(...steps), pv: pv.getBoundingClientRect().top };
    });
    L.check("population: the steps", g.steps >= 4, `${g.steps}`);
    L.check("the preview is under the steps", g.pv >= g.last - 0.5, `preview top ${g.pv} / last step bottom ${g.last}`);
    await scrollTo(page, ".p93-pv-f", 300);
    const r = await page.evaluate(() => {
      const pv = document.querySelector('[data-pk41="page"] .p93-pv') as HTMLElement; const b = pv.getBoundingClientRect();
      return { locked: !!document.querySelector('[data-pk41="page"] [data-pk393="sent-note"]'), well: { l: b.left, r: b.right, t: b.top, b: b.bottom },
        btns: [...pv.querySelectorAll(".p93-pv-f button")].map((x) => { const q = x.getBoundingClientRect(); return { t: x.textContent?.trim(), l: q.left, r: q.right, top: q.top, b: q.bottom, h: q.height }; }) };
    });
    L.check("population: a sent package is open", r.locked, "not sent");
    L.check("population: its buttons", r.btns.length >= 3, `${r.btns.length}`);
    for (const x of r.btns) L.check(`“${x.t}” inside the preview well`, x.l >= r.well.l - 0.5 && x.r <= r.well.r + 0.5 && x.top >= r.well.t - 0.5 && x.b <= r.well.b + 0.5, `${x.l}–${x.r} in ${r.well.l}–${r.well.r}`);
    L.done(7);
  });

  test(`L8 hawk · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L8-${at}`);
    await open(page, size);
    const read = () => page.evaluate(() => {
      const h = document.querySelector('[data-pk41="hawk"]') as HTMLElement | null; const root = document.querySelector('[data-pk41="page"]') as HTMLElement;
      const cs = getComputedStyle(root), rr = root.getBoundingClientRect();
      const contentR = rr.right - parseFloat(cs.paddingRight), contentL = rr.left + parseFloat(cs.paddingLeft);
      const r = h?.getBoundingClientRect();
      /* every visible box in the content column */
      const hits = r ? [...root.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.right > r.left + 0.5 && b.left < r.right - 0.5 && b.bottom > r.top + 0.5 && b.top < r.bottom - 0.5; }).map((e) => (e as HTMLElement).className || e.tagName).slice(0, 5) : [];
      return { on: !!h && getComputedStyle(h).display !== "none", pos: h ? getComputedStyle(h).position : null, b: r?.bottom, h: r?.height, l: r?.left, vh: innerHeight, contentR, contentL, hits, aria: h?.getAttribute("aria-hidden"), pe: h ? getComputedStyle(h).pointerEvents : null };
    });
    const a = await read();
    L.check("present", a.on, "absent");
    L.check("fixed", a.pos === "fixed", `${a.pos}`);
    L.check("decorative", a.aria === "true" && a.pe === "none", `${a.aria} ${a.pe}`);
    L.check("bottom = the viewport's ±1", near(a.b, a.vh), `${a.b} / ${a.vh}`);
    L.check("212 ±2 tall", near(a.h, 212, 2), `${a.h}`);
    L.check("clear of the content column", (a.l ?? 0) >= a.contentR - 0.5, `left ${a.l} / content right ${a.contentR}`);
    L.check("overlaps no element in the content column", a.hits.length === 0, JSON.stringify(a.hits));
    await page.evaluate((sc) => { const s = (0, eval)(sc) as HTMLElement; s.scrollTop += 600; }, SC); await page.waitForTimeout(400);
    const b = await read();
    L.check("after scrolling 600: bottom = the viewport's ±1", near(b.b, b.vh), `${b.b} / ${b.vh}`);
    L.check("after scrolling 600: overlaps nothing", b.hits.length === 0, JSON.stringify(b.hits));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
    const c = await page.evaluate(() => { const h = document.querySelector('[data-pk41="hawk"]') as HTMLElement | null; return !!h && getComputedStyle(h).display !== "none" && h.getBoundingClientRect().height > 0; });
    L.check("absent at 390 wide", !c, String(c));
    L.done(10);
  });

  /* v42: retired (RETIRED-submission-packages-v42.md) */
  test.skip(`L9 how it works · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`L9-${at}`);
    await open(page, size);
    await page.locator(`${pg} [data-pk41="how"]`).click(); await page.waitForTimeout(500);
    const titles: string[] = []; let text = "";
    for (let i = 0; i < 6; i++) {
      const t = (await page.locator('[data-pk41="hw-title"]').textContent())?.trim() ?? "";
      if (titles.includes(t)) break;
      titles.push(t); text += (await page.locator(".p41-hw").textContent()) ?? "";
      await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350);
    }
    L.check("five steps with the exact titles", JSON.stringify(titles) === JSON.stringify(["Make a package", "Pick each piece", "Set your current batch", "Log a query with it", "See what’s working"]), JSON.stringify(titles));
    for (const old of ["Drag them into the package", "Keep your materials in one place", "Your packages sit in a row"]) L.check(`no “${old}”`, !text.includes(old), "still there");
    L.check("the last step reads “Got it”", (await page.locator('[data-pk41="hw-next"]').textContent())?.trim() === "Got it", "no");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    L.check("Escape closes it", (await page.locator(".p41-hw").count()) === 0, "still open");
    L.done(6);
  });
}

/** The paid-Pro half of L2: a fresh context signed in as dv1@scriptally.test (Pro), read only. */
async function proHasBanner(browser: Browser, size: { width: number; height: number }): Promise<{ header: boolean; banner: number }> {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport: size });
  try {
    const p = await ctx.newPage();
    await p.goto("/#/signin");
    await p.locator("#au-email").fill("dv1@scriptally.test");
    const { readFileSync } = await import("node:fs");
    const pw = process.env.SA_E2E_PASSWORD ?? readFileSync(".env.local", "utf8").match(/^SA_E2E_PASSWORD=(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "");
    await p.locator("#au-pw").fill(pw ?? "");
    await p.getByRole("button", { name: /^Sign in$/ }).last().click();
    await expect(p.locator("#au-pw")).toHaveCount(0, { timeout: 30_000 });
    await p.goto("/queries/packages");
    const header = await p.locator('[data-pk41="page"] [data-pk41="header"], [data-pk26="hero"]').first().waitFor({ state: "visible", timeout: 30_000 }).then(() => true, () => false);
    await p.waitForTimeout(2000);
    return { header, banner: await p.locator('[data-pk41="banner"]').count() };
  } finally { await ctx.close(); }
}

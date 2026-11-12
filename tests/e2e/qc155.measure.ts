/**
 * Query Centre v155 — the three new states (quiet, day one, loading) against design-refs/query-centre-v155.html, at
 * 1440 and 1920, and the everyday page held pixel-unchanged.
 *
 *   S1  quiet: the panel above the first group, its copy, the list carrying on (no Offers / Materials / Nudge groups)
 *   S2  day one: "No queries yet", the header's height unchanged, the panel alone in the list, both links' hrefs,
 *       the rail at 40% and inert, the toolbar reading "0 queries"
 *   S3  loading: the skeleton's shape (heading bars, 3-across grid, 168px cards), aria-busy, no spinner, and the
 *       header / toolbar / rail not moving when the data lands
 *   S4  everyday: a screenshot compared byte for byte with the before build's
 *
 * The states are asked of the page by its DEV-ONLY review aids, which fabricate INPUT (lib/qc155Review, useQcLoad's
 * hold, living headers' count): `__SA_QC_STATE` = "quiet" | "first", `__SA_LH_COUNT` = 0, `__SA_QC_HOLD_MS`.
 * SA_PHASE=before takes the Step 0 screens only. Screens, readings and ledgers to reports/qc-v155/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
const PAGE = ".qc151.qc153";
const SCROLL = ".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll";
const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/qc-v155";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];
const REF = resolve("design-refs/query-centre-v155.html");
test.setTimeout(600_000);

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    if (PHASE === "before") return;
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}
const near = (a: number | null | undefined, b: number, tol = 1) => a != null && Math.abs(a - b) <= tol;

type Aids = { state?: "quiet" | "first"; lh?: number; holdMs?: number };
async function openQc(page: Page, vp: { width: number; height: number }, aids: Aids, wait: "cards" | "page" | "none") {
  await page.addInitScript((a: Aids) => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    const w = window as unknown as Record<string, unknown>;
    if (a.state) w.__SA_QC_STATE = a.state;
    if (a.lh != null) w.__SA_LH_COUNT = a.lh;
    if (a.holdMs) w.__SA_QC_HOLD_MS = a.holdMs;
  }, aids);
  await openRoute(page, "/queries", vp);
  if (wait === "none") return;
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  if (wait === "cards") await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

/** the frames that must not move: header, its title block, toolbar, rail */
async function frames(page: Page) {
  return page.evaluate((sel) => {
    const box = (q: string) => { const e = document.querySelector<HTMLElement>(`${sel} ${q}`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    return {
      header: box("[data-qc1531='header']"), title: box("[data-qc151='title']"), acts: box(".qc1531-acts"), forLine: box("[data-qc1531='for']"),
      chart: box(".qc1531-rc"), toolbar: box("[data-qc154='toolbar']"), bar: box("[data-qc153='bar']"), rail: box(".qc153-rail"), list: box("[data-qc151='table']"),
    };
  }, PAGE);
}

async function refShot(page: Page, vp: { width: number; height: number }, v: string, path: string) {
  await page.setViewportSize(vp);
  await page.goto(`file://${REF}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(`.grpb[data-k="zs"] button[data-v="${v}"]`).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path });
}

for (const vp of SIZES) {
  test(`v155 S4 everyday · ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const L = new Ledger(`S4-${vp.width}${PHASE === "before" ? "-before" : ""}`);
    await openQc(page, vp, {}, "cards");
    const f = await frames(page);
    writeFileSync(`${DIR}/frames-everyday-${PHASE}-${vp.width}.json`, JSON.stringify(f, null, 1));
    await page.screenshot({ path: `${DIR}/everyday-${PHASE}-${vp.width}.png` });
    if (PHASE === "before") { L.done(0); return; }
    const a = readFileSync(`${DIR}/everyday-before-${vp.width}.png`).toString("base64"), b = readFileSync(`${DIR}/everyday-after-${vp.width}.png`).toString("base64");
    const px = await page.evaluate(async ([a, b]) => {
      const load = (s: string) => new Promise<HTMLImageElement>((r) => { const i = new Image(); i.onload = () => r(i); i.src = `data:image/png;base64,${s}`; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const read = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
      const da = read(ia), db = read(ib);
      /* the shell's beta banner (the top 42px) is counted apart: it is not this page, and its text row rasterises
         differently between builds */
      let n = 0, banner = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) { const p = k / 4, x = p % ia.width, y = Math.floor(p / ia.width); if (y < 42) { banner++; continue; } n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { same: ia.width === ib.width && ia.height === ib.height, n, banner, box: n ? [x0, y0, x1, y1] : null };
    }, [a, b] as const);
    writeFileSync(`${DIR}/pixels-everyday-${vp.width}.json`, JSON.stringify(px));
    L.check("S4 below the banner, the everyday page is pixel-identical to the before build", px.same && px.n === 0, JSON.stringify(px));
    const fb = JSON.parse(readFileSync(`${DIR}/frames-everyday-before-${vp.width}.json`, "utf8"));
    L.check("S4 every frame box unchanged", JSON.stringify(fb) === JSON.stringify(f), JSON.stringify(f));
    const panel = await page.locator(`${PAGE} [data-qc155="panel"]`).count();
    L.check("S4 no state panel on the everyday page", panel === 0, String(panel));
    L.done(3);
  });

  test(`v155 S2 day one · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`S2-${vp.width}${PHASE === "before" ? "-before" : ""}`);
    if (PHASE === "before") {
      await openQc(page, vp, { lh: 0, state: "first" }, "none");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${DIR}/dayone-before-${vp.width}.png` });
      L.done(0); return;
    }
    await openQc(page, vp, { state: "first" }, "page");
    const r = await page.evaluate((sel) => {
      const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(`${sel} ${s}`) as T | null;
      const panel = q("[data-qc155='panel']");
      const cs = panel ? getComputedStyle(panel) : null;
      const h = panel?.querySelector("h2, h3"); const hs = h ? getComputedStyle(h) : null;
      const p = panel?.querySelector("p"); const ps = p ? getComputedStyle(p) : null;
      const links = [...(panel?.querySelectorAll<HTMLAnchorElement>("a") ?? [])].map((a) => ({ t: a.textContent, href: a.getAttribute("href"), dl: a.hasAttribute("download"), c: getComputedStyle(a).color, w: getComputedStyle(a).fontWeight, off: getComputedStyle(a).textUnderlineOffset }));
      const railCol = q("[data-qc153='rail-column']");
      const list = q("[data-qc151='table']");
      return {
        title: q("[data-qc151='title']")?.textContent, forLine: q("[data-qc1531='for']")?.textContent ?? null,
        btns: [...document.querySelectorAll(`${sel} .qc1531-acts button`)].map((b) => b.textContent),
        count: q(".qc154-tn")?.textContent,
        heads: document.querySelectorAll(`${sel} [data-qc154='head']`).length, cards: document.querySelectorAll(`${sel} [data-qc154='card']`).length,
        listKids: list ? [...list.children].map((c) => (c as HTMLElement).dataset.qc155 ?? c.className) : [],
        panel: cs ? { bg: cs.backgroundColor, r: cs.borderRadius, sh: cs.boxShadow, pad: cs.padding, mt: cs.marginTop, mb: cs.marginBottom, w: panel!.getBoundingClientRect().width, listW: list!.getBoundingClientRect().width } : null,
        head: hs ? { t: h!.textContent, f: hs.fontFamily, s: hs.fontSize, w: hs.fontWeight, c: hs.color, mb: hs.marginBottom } : null,
        body: ps ? { t: p!.textContent, f: ps.fontFamily, s: ps.fontSize, lh: ps.lineHeight, c: ps.color, mw: ps.maxWidth } : null,
        links,
        rail: railCol ? { op: getComputedStyle(railCol).opacity, pe: getComputedStyle(railCol).pointerEvents, inert: railCol.hasAttribute("inert"), nums: [...railCol.querySelectorAll<HTMLElement>("[data-n]")].map((e) => e.dataset.n) } : null,
        chart: { head: q("[data-qc154='goal'] .qc154-gh, [data-qc154='goal'] h3")?.textContent ?? null, text: q("[data-qc154='goal']")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) },
        img: document.querySelectorAll(`${sel} [data-qc155='panel'] img, ${sel} [data-qc155='panel'] svg`).length,
        filledBtn: document.querySelectorAll(`${sel} [data-qc155='panel'] button`).length,
        ch: (() => { if (!p) return 0; const z = document.createElement("span"); z.textContent = "0"; z.style.cssText = "font:inherit;position:absolute;visibility:hidden"; p.appendChild(z); const w = z.getBoundingClientRect().width; z.remove(); return w; })(),
      };
    }, PAGE);
    writeFileSync(`${DIR}/readings-dayone-${vp.width}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r, null, 1));
    L.check("S2 the title reads No queries yet", r.title === "No queries yet", String(r.title));
    L.check("S2 both header buttons stay", r.btns.join("|") === "+ Log a query|Record a response", r.btns.join("|"));
    L.check("S2 the toolbar reads 0 queries", r.count?.trim() === "0 queries", String(r.count));
    L.check("S2 no group headings, no cards", r.heads === 0 && r.cards === 0, `${r.heads} heads, ${r.cards} cards`);
    L.check("S2 the panel and nothing else in the list", r.listKids.length === 1 && r.listKids[0] === "panel", JSON.stringify(r.listKids));
    L.check("S2 panel heading", r.head?.t === "No queries yet.", String(r.head?.t));
    L.check("S2 panel body", r.body?.t === "Log your first query and it will appear here, with the date a reply is expected. Already keeping a tracker somewhere? Bring it in with Smart import or use our template.", String(r.body?.t));
    L.check("S2 Smart import links to /import", r.links.some((l) => l.t === "Bring it in with Smart import" && l.href === "/import"), JSON.stringify(r.links));
    L.check("S2 the template link is the download", r.links.some((l) => l.t === "use our template" && l.href === "/QueryHawk-pipeline-import-template.xlsx" && l.dl), JSON.stringify(r.links));
    L.check("S2 panel: white, 16px, a 1px #e6dfd4 ring, 34px 30px, 14/18 margins, full width",
      r.panel?.bg === "rgb(255, 255, 255)" && r.panel.r === "16px" && r.panel.sh === "rgb(230, 223, 212) 0px 0px 0px 1px" && r.panel.pad === "34px 30px" && r.panel.mt === "14px" && r.panel.mb === "18px" && near(r.panel.w, r.panel.listW, 0.5), JSON.stringify(r.panel));
    L.check("S2 heading: Special Elite 26px 400 #1c130f, 8px under", /Special Elite/.test(r.head?.f ?? "") && r.head?.s === "26px" && r.head.w === "400" && r.head.c === "rgb(28, 19, 15)" && r.head.mb === "8px", JSON.stringify(r.head));
    /* a computed max-width is in px: 60ch of this face at 16px (its "0" is ~8.31px) */
    L.check("S2 body: Source Serif 4 16/1.5 #5b4f47, about 60 characters", /Source Serif 4/.test(r.body?.f ?? "") && r.body?.s === "16px" && r.body.lh === "24px" && r.body.c === "rgb(91, 79, 71)" && near(parseFloat(r.body.mw), 60 * r.ch, 0.5), JSON.stringify({ ...r.body, ch: r.ch }));
    L.check("S2 links: navy 600, underline offset 3px", r.links.length === 2 && r.links.every((l) => l.c === "rgb(42, 58, 82)" && l.w === "600" && l.off === "3px"), JSON.stringify(r.links));
    L.check("S2 no illustration and no button in the panel", r.img === 0 && r.filledBtn === 0, `${r.img} img, ${r.filledBtn} buttons`);
    L.check("S2 the rail at 40%, inert, every count 0", r.rail?.op === "0.4" && r.rail.pe === "none" && r.rail.inert && r.rail.nums.every((n) => n === "0"), JSON.stringify(r.rail));
    await page.screenshot({ path: `${DIR}/dayone-after-${vp.width}.png` });
    await refShot(page, vp, "first", `${DIR}/ref-dayone-${vp.width}.png`);
    L.done(15);
  });

  test(`v155 S1 quiet · ${vp.width}`, async ({ page }) => {
    if (PHASE === "before") return;
    const L = new Ledger(`S1-${vp.width}`);
    await openQc(page, vp, { state: "quiet" }, "cards");
    const r = await page.evaluate((sel) => {
      const list = document.querySelector<HTMLElement>(`${sel} [data-qc151='table']`)!;
      const first = list.firstElementChild as HTMLElement | null;
      const panel = list.querySelector<HTMLElement>("[data-qc155='panel']");
      return {
        first: first?.dataset.qc155 ?? first?.className, head: panel?.querySelector("h2, h3")?.textContent, body: panel?.querySelector("p")?.textContent,
        groups: [...list.querySelectorAll<HTMLElement>("[data-qc154='head']")].map((h) => h.dataset.label),
        title: document.querySelector(`${sel} [data-qc151='title']`)?.textContent,
      };
    }, PAGE);
    writeFileSync(`${DIR}/readings-quiet-${vp.width}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r, null, 1));
    L.check("S1 the panel is the list's first child", r.first === "panel", String(r.first));
    L.check("S1 heading", r.head === "Nothing needs you today.", String(r.head));
    L.check("S1 body names the count and a date, or says nothing is out",
      /^(\d+ queries are with agents\.|1 query is with an agent\.)( The next reply is expected by \d{1,2} [A-Z][a-z]{2}( \d{4})?\.)?$|^Nothing is out with agents right now\.$/.test(r.body ?? ""), String(r.body));
    L.check("S1 no group needing the writer", !r.groups.some((g) => /^(Offers|Materials requested|Nudge due)$/.test(g ?? "")), JSON.stringify(r.groups));
    L.check("S1 the list carries on", r.groups.length > 0, JSON.stringify(r.groups));
    await page.screenshot({ path: `${DIR}/quiet-after-${vp.width}.png` });
    await refShot(page, vp, "quiet", `${DIR}/ref-quiet-${vp.width}.png`);
    L.done(5);
  });

  test(`v155 S3 loading · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`S3-${vp.width}${PHASE === "before" ? "-before" : ""}`);
    const HOLD = 9000;
    await openQc(page, vp, { holdMs: HOLD }, "none");
    await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    const sk = await page.evaluate((sel) => {
      const list = document.querySelector<HTMLElement>(`${sel} [data-qc151='table']`);
      const cards = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc155='sk-card']`)];
      const heads = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc155='sk-head']`)];
      const grids = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc155='sk-grid']`)];
      const c0 = cards[0] ? getComputedStyle(cards[0]) : null;
      /* the harness's KILL_MOTION zeroes every animation, so the declared one is read from the sheet */
      const decl = (() => { for (const sh of [...document.styleSheets]) { try { for (const r of [...sh.cssRules]) { if (r instanceof CSSStyleRule && r.selectorText.includes(".qc155-skc::after")) return { name: r.style.animationName, dur: r.style.animationDuration }; } } catch { /* cross-origin */ } } return null; })();
      const c0a = decl ? { animationName: decl.name, animationDuration: decl.dur } : null;
      const h0 = heads[0] ? getComputedStyle(heads[0]) : null;
      return {
        busy: list?.getAttribute("aria-busy") ?? null, text: list?.textContent?.trim() ?? null,
        hidden: document.querySelector(`${sel} [data-qc155='skeleton']`)?.getAttribute("aria-hidden") ?? null,
        perGrid: grids.map((g) => g.querySelectorAll("[data-qc155='sk-card']").length),
        cols: grids[0] ? getComputedStyle(grids[0]).gridTemplateColumns : null, gap: grids[0] ? getComputedStyle(grids[0]).columnGap : null,
        card: c0 ? { h: cards[0].getBoundingClientRect().height, r: c0.borderRadius, bg: c0.backgroundColor, sh: c0.boxShadow, anim: c0a?.animationName, dur: c0a?.animationDuration } : null,
        head: h0 ? { h: heads[0].getBoundingClientRect().height, w: heads[0].getBoundingClientRect().width, r: h0.borderRadius, bg: h0.backgroundColor, mt: h0.marginTop, mb: h0.marginBottom } : null,
        spinners: document.querySelectorAll(`${sel} [role='progressbar'], ${sel} .spinner, ${sel} [class*='spin']`).length,
      };
    }, PAGE);
    writeFileSync(`${DIR}/readings-loading-${PHASE}-${vp.width}.json`, JSON.stringify(sk, null, 1));
    console.log(JSON.stringify(sk, null, 1));
    const fLoad = await frames(page);
    await page.screenshot({ path: `${DIR}/loading-${PHASE}-${vp.width}.png` });
    /* the data lands when the hold ends */
    await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(900);
    const fDone = await frames(page);
    const shift: Record<string, unknown> = {};
    for (const k of Object.keys(fLoad) as (keyof typeof fLoad)[]) {
      const a = fLoad[k], b = fDone[k];
      shift[k] = a && b ? { dx: +(b.x - a.x).toFixed(2), dy: +(b.y - a.y).toFixed(2), dw: +(b.w - a.w).toFixed(2), dh: +(b.h - a.h).toFixed(2) } : { load: a, done: b };
    }
    writeFileSync(`${DIR}/shift-${PHASE}-${vp.width}.json`, JSON.stringify({ load: fLoad, done: fDone, shift }, null, 1));
    console.log("shift", JSON.stringify(shift));
    if (PHASE === "before") { L.done(0); return; }
    L.check("S3 the list is aria-busy while loading", sk.busy === "true", String(sk.busy));
    L.check("S3 the placeholders are hidden from screen readers", sk.hidden === "true", String(sk.hidden));
    L.check("S3 two groups: 2 cards then 6", JSON.stringify(sk.perGrid) === "[2,6]", JSON.stringify(sk.perGrid));
    L.check("S3 3-across, 14px gaps", (sk.cols ?? "").split(" ").length === 3 && sk.gap === "14px", `${sk.cols} / ${sk.gap}`);
    L.check("S3 card: 168px, 16px, white, a 1px #ebe5db ring, a 1.3s sweep", near(sk.card?.h, 168, 0.5) && sk.card?.r === "16px" && sk.card.bg === "rgb(255, 255, 255)" && sk.card.sh === "rgb(235, 229, 219) 0px 0px 0px 1px" && sk.card.anim === "qc155-sweep" && sk.card.dur === "1.3s", JSON.stringify(sk.card));
    L.check("S3 heading bar: 22 × 220, 6px, #ebe5db, 26 above / 14 below", near(sk.head?.h, 22, 0.5) && near(sk.head?.w, 220, 0.5) && sk.head?.r === "6px" && sk.head.bg === "rgb(235, 229, 219)" && sk.head.mt === "26px" && sk.head.mb === "14px", JSON.stringify(sk.head));
    L.check("S3 no spinner", sk.spinners === 0, String(sk.spinners));
    L.check("S3 no words in the list while loading", sk.text === "", JSON.stringify(sk.text));
    /* the harness account has more than one manuscript and no scope, so it draws no "for" line, loaded or not */
    L.check("S3 forLine: absent loading and loaded on this account (reported)", fLoad.forLine === null && fDone.forLine === null, JSON.stringify(shift.forLine));
    for (const k of ["header", "title", "acts", "chart", "toolbar", "bar", "rail"] as const) {
      const s = shift[k] as { dx?: number; dy?: number; dw?: number; dh?: number; load?: unknown };
      /* the rail grows with its counts only if it is not reserved; every frame must hold */
      L.check(`S3 ${k} does not move when the data lands`, s.dx === 0 && s.dy === 0 && s.dw === 0 && s.dh === 0, JSON.stringify(s));
    }
    L.done(16);
  });

  test(`v155 S3 reduced motion · ${vp.width}`, async ({ page }) => {
    if (PHASE === "before" || vp.width !== 1920) return;
    const L = new Ledger(`S3rm-${vp.width}`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openQc(page, vp, { holdMs: 9000 }, "none");
    await page.waitForSelector(`${PAGE} [data-qc155='sk-card']`, { timeout: 30_000 });
    const a = await page.evaluate((sel) => { const c = document.querySelector(`${sel} [data-qc155='sk-card']`)!; const s = getComputedStyle(c, "::after"); return { anim: s.animationName, content: s.content, display: s.display }; }, PAGE);
    writeFileSync(`${DIR}/readings-reduced-motion.json`, JSON.stringify(a, null, 1));
    /* the harness zeroes animation anyway, so the proof is the reduced-motion rule's own display: none on the sweep */
    L.check("S3 reduced motion: no sweep (the highlight is not drawn)", a.display === "none", JSON.stringify(a));
    await page.screenshot({ path: `${DIR}/loading-reduced-${vp.width}.png` });
    L.done(1);
  });

  test(`v155 refs · ${vp.width}`, async ({ page }) => {
    if (PHASE === "before" || !existsSync(REF)) return;
    await refShot(page, vp, "load", `${DIR}/ref-loading-${vp.width}.png`);
    await refShot(page, vp, "day", `${DIR}/ref-everyday-${vp.width}.png`);
  });
}
void SCROLL;

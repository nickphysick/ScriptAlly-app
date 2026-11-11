/**
 * Query Centre v154.1 — the rendered page against design-refs/query-centre-v154-1.html, at 1440 and 1920.
 *
 *   N1  the warm page: the ground, the doodle wash and the toolbar strip's fade all in #f6f3ee; nothing cool left
 *   N2  quiet Queried bands (white, a 3px sand edge, a hairline) and quiet seals (white, navy initials, one ring);
 *       every other stage keeps its band
 *   N3  the rail recedes (no panels, hairlines between sections); the toolbar opens up (no container, its ends on the
 *       list's edges, the search field white) at the same height
 *   N4  the chart's pill and line by streak
 * SA_PHASE=before reads only (the Step 0 readings and the toolbar's height before); otherwise it asserts.
 * Screens, readings and ledgers to reports/qc-v154-1/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
const PAGE = ".qc151.qc153";
const SCROLL = ".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll";
async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
const scrollTo = (page: Page, y: number) => page.evaluate(([sel, y]) => { const s = document.querySelector<HTMLElement>(sel as string); if (s) s.scrollTop = y as number; }, [SCROLL, y] as const);

test.setTimeout(600_000);
const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/qc-v154-1";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];

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
const COOL = /245,\s*245,\s*243/;

/** every reading the brief names, from the rendered page */
async function readings(page: Page) {
  return page.evaluate(([sel, sc]) => {
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const port = document.querySelector<HTMLElement>(sc)!;
    const tbw = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!;
    const bar = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!;
    const find = bar.querySelector<HTMLElement>(".qc153-find")!;
    const grid = document.querySelector<HTMLElement>(`${sel} .qc154-grid`)!;
    const btns = [...bar.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetParent);
    const card = (st: string) => document.querySelector<HTMLElement>(`${sel} [data-qc154="card"][data-status="${st}"]`);
    const band = (c: HTMLElement | null) => { const h = c?.querySelector<HTMLElement>("[data-qc154='band']"); const s = cs(h ?? null); return s ? { bg: s.backgroundColor, shadow: s.boxShadow } : null; };
    const seal = document.querySelector<HTMLElement>(`${sel} [data-qc154="card"] .qc154-seal`)!;
    const ss = cs(seal)!;
    const secs = [...document.querySelectorAll<HTMLElement>(`${sel} .qc153-rail .qc153-rsec`)];
    const body = document.querySelector<HTMLElement>(`${sel} .qc153-rail .qc153-rbody`)!;
    const bs = cs(body)!, br = cs(bar)!, fs = cs(find)!;
    const others = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]:not([data-status="Queried"])`)].map((c) => ({ st: c.dataset.status, tone: c.dataset.tone, bg: cs(c.querySelector("[data-qc154='band']"))!.backgroundColor }));
    /* every painted colour on the page's ground: the scrollport, the strip, and anything between the port and the page root */
    const cool: string[] = [];
    for (let e: HTMLElement | null = document.querySelector<HTMLElement>(sel); e && e !== port.parentElement; e = e.parentElement) {
      const s = getComputedStyle(e); if (/245,\s*245,\s*243/.test(`${s.backgroundColor} ${s.backgroundImage}`)) cool.push(e.className.toString().slice(0, 60));
    }
    for (const e of [port, tbw, ...port.querySelectorAll<HTMLElement>("*")]) { const s = getComputedStyle(e); if (/245,\s*245,\s*243/.test(`${s.backgroundColor} ${s.backgroundImage} ${s.stroke} ${s.borderTopColor} ${s.boxShadow}`)) cool.push(e.className.toString().slice(0, 60)); }
    return {
      page: { bg: cs(port)!.backgroundColor, img: cs(port)!.backgroundImage.slice(0, 140) },
      fade: cs(tbw)!.backgroundImage,
      queried: band(card("Queried")), partial: band(card("Partial Requested")), full: band(card("Full Requested")),
      others,
      seal: { bg: ss.backgroundColor, color: ss.color, shadow: ss.boxShadow, font: ss.fontFamily, w: seal.offsetWidth, h: seal.offsetHeight },
      rail: {
        body: { bg: bs.backgroundColor, shadow: bs.boxShadow, pl: bs.paddingLeft, pr: bs.paddingRight },
        secs: secs.map((s) => ({ k: s.dataset.k, bb: getComputedStyle(s).borderBottom, pb: getComputedStyle(s).paddingBottom })),
        pos: cs(document.querySelector(`${sel} .qc153-rail`))!.position,
      },
      bar: { bg: br.backgroundColor, shadow: br.boxShadow, blur: br.backdropFilter, pl: br.paddingLeft, pr: br.paddingRight, h: +bar.getBoundingClientRect().height.toFixed(2),
        left: +(bar.getBoundingClientRect().left - grid.getBoundingClientRect().left).toFixed(2),
        firstBtn: +(btns[0].getBoundingClientRect().left - grid.getBoundingClientRect().left).toFixed(2),
        lastBtn: +(grid.getBoundingClientRect().right - btns[btns.length - 1].getBoundingClientRect().right).toFixed(2) },
      find: { bg: fs.backgroundColor, shadow: fs.boxShadow },
      chart: { pill: document.querySelector(`${sel} [data-qc154='streak']`)?.textContent ?? null, line: document.querySelector(`${sel} [data-qc154='goal-line']`)?.textContent ?? null, head: document.querySelector(`${sel} [data-qc154='goal-headline']`)?.textContent ?? null },
      cool,
    };
  }, [PAGE, SCROLL] as const);
}

for (const vp of SIZES) {
  test(`v154.1 N1–N4 · ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const L = new Ledger(`N-${vp.width}${PHASE === "before" ? "-before" : ""}`);
    await openQc(page, vp);
    const r = await readings(page);
    writeFileSync(`${DIR}/readings-${PHASE}-${vp.width}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r, null, 1));
    if (PHASE === "before") { L.done(0); return; }

    /* N1 · the warm page */
    L.check("N1 the ground is #f6f3ee", r.page.bg === "rgb(246, 243, 238)", r.page.bg);
    L.check("N1 the doodle wash is rgba(246,243,238,.45)", r.page.img.includes("rgba(246, 243, 238, 0.45)") && r.page.img.includes("doodle"), r.page.img);
    L.check("N1 the strip's fade is the warm paper", r.fade === "linear-gradient(rgb(246, 243, 238) 0px, rgb(246, 243, 238) calc(100% - 22px), rgba(246, 243, 238, 0) 100%)", r.fade);
    L.check("N1 nothing on the ground is cool", r.cool.length === 0, JSON.stringify(r.cool));

    /* N2 · quiet Queried bands, quiet seals */
    L.check("N2 a Queried band is white with a sand edge and a hairline", r.queried?.bg === "rgb(255, 255, 255)" && r.queried.shadow === "rgb(233, 223, 206) 0px 3px 0px 0px inset, rgb(240, 234, 224) 0px -1px 0px 0px inset", JSON.stringify(r.queried));
    L.check("N2 a Partial band keeps its rose", r.partial?.bg === "rgb(236, 214, 210)", JSON.stringify(r.partial));
    L.check("N2 every other stage keeps a coloured band", r.others.length > 0 && r.others.every((o) => o.bg !== "rgb(255, 255, 255)"), JSON.stringify(r.others.slice(0, 6)));
    L.check("N2 the seal: white, navy initials, one 1.5px ring, the typewriter, size unchanged",
      r.seal.bg === "rgb(255, 255, 255)" && r.seal.color === "rgb(42, 58, 82)" && r.seal.shadow === "rgb(197, 204, 214) 0px 0px 0px 1.5px inset" && /Special Elite/i.test(r.seal.font) && (r.seal.w === 38 || r.seal.w === 32), JSON.stringify(r.seal));

    /* N3 · the rail recedes, the toolbar opens up */
    L.check("N3 rail panels: no fill, no ring, no side padding", r.rail.body.bg === "rgba(0, 0, 0, 0)" && r.rail.body.shadow === "none" && r.rail.body.pl === "0px" && r.rail.body.pr === "0px", JSON.stringify(r.rail.body));
    const last = r.rail.secs[r.rail.secs.length - 1];
    L.check("N3 a 1px #e4ded4 hairline under each section with 6px above it; none under the last",
      r.rail.secs.slice(0, -1).every((s) => s.bb.startsWith("1px solid rgb(228, 222, 212)") && s.pb === "6px") && last.bb.startsWith("0px"), JSON.stringify(r.rail.secs));
    L.check("N3 the rail is still sticky (or scrolls when tall)", r.rail.pos === "sticky" || r.rail.pos === "relative", r.rail.pos);
    L.check("N3 the toolbar: no fill, no ring, no shadow, no blur", r.bar.bg === "rgba(0, 0, 0, 0)" && r.bar.shadow === "none" && (r.bar.blur === "none" || r.bar.blur === ""), JSON.stringify(r.bar));
    L.check("N3 the toolbar's ends sit on the list's edges", r.bar.pl === "0px" && r.bar.pr === "0px" && near(r.bar.firstBtn, 0, 4) && near(r.bar.lastBtn, 0, 1), JSON.stringify(r.bar));
    L.check("N3 the search field is white with a fine ring", r.find.bg === "rgb(255, 255, 255)" && r.find.shadow === "rgb(227, 221, 211) 0px 0px 0px 1px inset", JSON.stringify(r.find));
    const before = JSON.parse(readFileSync(`${DIR}/readings-before-${vp.width}.json`, "utf8"));
    L.check("N3 the toolbar's height at rest is unchanged", near(r.bar.h, before.bar.h, 0.01), `${before.bar.h} → ${r.bar.h}`);

    /* N4 · the pill and the line by streak (the harness's streak is what it is: read, and the rule checked against it) */
    L.check("N4 never a 0-week streak", !/^0-week/.test(r.chart.pill ?? ""), JSON.stringify(r.chart));
    L.check("N4 the line reads by the streak", r.chart.pill == null
      ? /^(Goal met — nice work\.|One more to hit your goal this week\.|\d+ more to hit your goal this week\.)$/.test(r.chart.line ?? "")
      : /^(Goal met — nice work\.|One more keeps the streak going\.|\d+ more keeps the streak going\.)$/.test(r.chart.line ?? ""), JSON.stringify(r.chart));

    /* screens: at rest, the rail, a Queried card beside a Partial, the chart, then mid-scroll in two groups */
    await page.screenshot({ path: `${DIR}/rest-${vp.width}.png` });
    await page.locator(`${PAGE} .qc153-rail`).screenshot({ path: `${DIR}/rail-${vp.width}.png` });
    await page.locator(`${PAGE} [data-qc154='goal']`).screenshot({ path: `${DIR}/chart-${vp.width}.png` });
    for (const st of ["Queried", "Partial Requested", "Full Requested"]) {
      const c = page.locator(`${PAGE} [data-qc154="card"][data-status="${st}"]`).first();
      if (await c.count()) { await c.scrollIntoViewIfNeeded(); await page.mouse.move(2, 2); await page.waitForTimeout(250); await c.screenshot({ path: `${DIR}/card-${st.split(" ")[0].toLowerCase()}-${vp.width}.png` }); }
    }
    await scrollTo(page, 0); await page.waitForTimeout(400);
    const heads = await page.evaluate(([sel, sc]) => { const s = document.querySelector<HTMLElement>(sc)!; return [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154='head']`)].map((h) => ({ label: h.dataset.label, top: s.scrollTop + h.getBoundingClientRect().top - s.getBoundingClientRect().top })); }, [PAGE, SCROLL] as const);
    const stickAt = await page.evaluate(([sel, sc]) => { const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!; return w.getBoundingClientRect().top - document.querySelector<HTMLElement>(sc)!.getBoundingClientRect().top - (parseFloat(getComputedStyle(w).top) || 0); }, [PAGE, SCROLL] as const);
    await scrollTo(page, Math.round(heads[0].top + 200)); await page.waitForTimeout(300);
    const lineFromTop = await page.evaluate(([sel, sc]) => { const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!.getBoundingClientRect(); return w.bottom - 22 - document.querySelector<HTMLElement>(sc)!.getBoundingClientRect().top; }, [PAGE, SCROLL] as const);
    for (const h of heads.slice(0, 2)) {
      /* 120px into the group, so cards run under the strip's fade */
      await scrollTo(page, Math.round(Math.max(h.top - lineFromTop + 120, stickAt + 4)));
      await page.waitForTimeout(450);
      const st = await page.evaluate((sel) => { const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!; return { bg: getComputedStyle(w).backgroundImage, g: w.querySelector("[data-qc154='toolbar-group']")?.textContent ?? "" }; }, PAGE);
      L.check(`N1 mid-scroll in ${h.label}: the warm fade and the group named`, st.bg.includes("rgb(246, 243, 238)") && !COOL.test(st.bg) && st.g.startsWith(h.label ?? "?"), JSON.stringify(st));
      await page.screenshot({ path: `${DIR}/scroll-${(h.label ?? "").replace(/\W+/g, "-").toLowerCase()}-${vp.width}.png` });
    }
    L.done(16);
  });
}

/**
 * Query Centre v156 — the launch look (design-refs/query-centre-v156.html), measured on the emulator harness.
 *
 *   SA_PHASE=before  Step 0's readings (header height and margin, tab and sheet colours, the toolbar's sticky offset and
 *                    what it paints at rest, the rail's width and offset, the Contact list's slim row) and the "before"
 *                    screens of both pages. Asserts nothing.
 *   (default)        the locks (V1–V9 below) and the screens for the report.
 *
 * Screens, readings and ledgers go to reports/qc-v156/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
const PAGE = ".qc151.qc153";
const SCROLL = ".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll";
const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/qc-v156";
const SHOTS = `${DIR}/shots`;
const SIZES = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }];
test.setTimeout(900_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

async function openQc(page: Page, vp: { width: number; height: number }, goal?: "streak" | "none" | "met") {
  await page.addInitScript((g) => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    if (g) (window as unknown as Record<string, unknown>).__SA_QC156_GOAL = g;
  }, goal ?? null);
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate(([sel, v]) => { const s = document.querySelector<HTMLElement>(sel as string); if (s) s.scrollTop = v as number; }, [SCROLL, y]);
  await page.waitForTimeout(450);
};

/** Step 0 — the readings this round starts from */
async function readings(page: Page) {
  return page.evaluate(([sel, sc]) => {
    const root = document.querySelector<HTMLElement>(sel as string)!;
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const hd = root.querySelector<HTMLElement>("[data-qc1531='header']");
    const tbw = root.querySelector<HTMLElement>("[data-qc154='toolbar']");
    const rail = root.querySelector<HTMLElement>(".qc153-rail, [data-qc156='views']");
    const port = document.querySelector<HTMLElement>(sc as string);
    /* the active page tab: the visible element reading "Query Centre" outside the page, its first painted ancestor */
    const tabEl = [...document.querySelectorAll<HTMLElement>("a, button, [role='tab'], span, div")]
      .find((e) => e.textContent?.trim() === "Query Centre" && !root.contains(e) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().y < 140);
    let painted: HTMLElement | null = tabEl ?? null;
    while (painted && getComputedStyle(painted).backgroundColor === "rgba(0, 0, 0, 0)") painted = painted.parentElement;
    const sheet = root.closest<HTMLElement>(".ws-window");
    /* every ancestor of the header that clips */
    const clips: string[] = [];
    for (let e = hd?.parentElement ?? null; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") clips.push(`${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${cs.overflowX}/${cs.overflowY}`);
    }
    return {
      header: box(hd), headerMarginBottom: hd ? getComputedStyle(hd).marginBottom : null,
      headerBg: hd ? getComputedStyle(hd).backgroundColor : null, headerShadow: hd ? getComputedStyle(hd).boxShadow : null,
      tab: tabEl ? { text: tabEl.textContent?.trim(), cls: painted?.className, bg: painted ? getComputedStyle(painted).backgroundColor : null, box: box(painted) } : null,
      sheet: sheet ? { bg: getComputedStyle(sheet).backgroundColor } : null,
      port: port ? { bg: getComputedStyle(port).backgroundColor, img: getComputedStyle(port).backgroundImage.slice(0, 90), top: box(port)?.y } : null,
      toolbar: tbw ? { box: box(tbw), top: getComputedStyle(tbw).top, bg: getComputedStyle(tbw).backgroundImage.slice(0, 160), bgc: getComputedStyle(tbw).backgroundColor, stuck: tbw.hasAttribute("data-qc156-stuck") } : null,
      rail: rail ? { box: box(rail), top: getComputedStyle(rail).top, position: getComputedStyle(rail).position } : null,
      clips,
      pinCover: getComputedStyle(root).getPropertyValue("--pin-cover"),
    };
  }, [PAGE, SCROLL]);
}

test.describe("Query Centre v156", () => {
  test("Step 0 — readings and before screens", async ({ page }) => {
    test.skip(PHASE !== "before", "Step 0 only");
    const out: Record<string, unknown> = {};
    for (const vp of SIZES) {
      await openQc(page, vp);
      out[`qc-${vp.width}-rest`] = await readings(page);
      await page.screenshot({ path: `${SHOTS}/before-qc-${vp.width}.png` });
      await scrollTo(page, 700);
      out[`qc-${vp.width}-scrolled`] = await readings(page);
      await page.screenshot({ path: `${SHOTS}/before-qc-${vp.width}-scrolled.png` });
      await scrollTo(page, 0);
    }
    /* the Contact list's slim row and rail, for the reuse question */
    await openRoute(page, "/agents", SIZES[0]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/before-cl-1920.png` });
    out["cl-rest"] = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>("[data-clh2='slim']");
      const rail = document.querySelector<HTMLElement>("[data-cl27='rail']");
      const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      return { slim: box(row), slimTop: row ? getComputedStyle(row).top : null, rail: box(rail) };
    });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0 && e.querySelector("[data-clh2='slim']")); if (s) s.scrollTop = 800; });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/before-cl-1920-scrolled.png` });
    out["cl-scrolled"] = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>("[data-clh2='slim']");
      const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      return { slim: box(row), shown: row?.hasAttribute("data-shown") };
    });
    writeFileSync(`${DIR}/step0-readings.json`, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
  });
  /* V1 (§4) — a Queried card's band is the sand fill; every seal is navy with the double ring.
     V2 (§5) — the tab and the scroll area are one colour; the toolbar's strip paints nothing at rest and the page colour
     once stuck; nothing between the header and the scroller clips. */
  test("V1–V2 — cards, page colour and the toolbar at rest", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("V1-V2");
    for (const vp of SIZES) {
      await openQc(page, vp);
      const r = await page.evaluate((sel) => {
        const root = document.querySelector<HTMLElement>(sel)!;
        const q = root.querySelector<HTMLElement>('[data-qc154="card"][data-status="Queried"] [data-qc154="band"]');
        const other = root.querySelector<HTMLElement>('[data-qc154="card"]:not([data-status="Queried"]) .qc154-seal');
        const seals = [...root.querySelectorAll<HTMLElement>('[data-qc154="card"] .qc154-seal')].map((e) => getComputedStyle(e).backgroundColor);
        const qs = root.querySelector<HTMLElement>('[data-qc154="card"][data-status="Queried"] .qc154-seal');
        return {
          band: q ? getComputedStyle(q).backgroundColor : null, bandShadow: q ? getComputedStyle(q).boxShadow : null,
          sealBg: qs ? getComputedStyle(qs).backgroundColor : null, sealInk: qs ? getComputedStyle(qs).color : null, sealRing: qs ? getComputedStyle(qs).boxShadow : null,
          seals: [...new Set(seals)], otherSeal: other ? getComputedStyle(other).backgroundColor : null,
        };
      }, PAGE);
      L.check(`${vp.width}: a Queried card's band is the sand fill`, r.band === "rgb(239, 231, 218)" && r.bandShadow === "none", `${r.band} / ${r.bandShadow}`);
      L.check(`${vp.width}: the Queried seal is navy, cream initials, double ring`, r.sealBg === "rgb(42, 58, 82)" && r.sealInk === "rgb(244, 238, 229)" && /rgb\(255, 255, 255\) 0px 0px 0px (3|2\.5)px, rgba\(42, 58, 82, 0\.35\)/.test(r.sealRing ?? ""), `${r.sealBg} / ${r.sealInk} / ${r.sealRing}`);
      L.check(`${vp.width}: every seal on the page is navy`, r.seals.length === 1 && r.seals[0] === "rgb(42, 58, 82)", r.seals.join(" | "));
      const rd = await readings(page);
      L.check(`${vp.width}: the tab is the page's colour`, rd.tab?.bg === rd.port?.bg && rd.port?.bg === "rgb(246, 243, 238)", `tab ${rd.tab?.bg} · page ${rd.port?.bg} · sheet ${rd.sheet?.bg}`);
      L.check(`${vp.width}: the toolbar's strip paints nothing at rest`, rd.toolbar?.bg === "none" && rd.toolbar?.bgc === "rgba(0, 0, 0, 0)" && !rd.toolbar?.stuck, `${rd.toolbar?.bg} / ${rd.toolbar?.bgc}`);
      L.check(`${vp.width}: no clipping ancestor between the header and the scroller`, rd.clips[0]?.startsWith("div.wpg-scroll"), rd.clips[0] ?? "none");
      if (vp.width === 1920) {
        await page.screenshot({ path: `${SHOTS}/v1-tab-meets-sheet-1920.png`, clip: { x: 0, y: 40, width: 900, height: 260 } });
        await page.screenshot({ path: `${SHOTS}/v1-cards-1920.png` });
      }
      await scrollTo(page, 900);
      const st = await readings(page);
      L.check(`${vp.width}: stuck, the strip paints the page with its fade`, !!st.toolbar?.stuck && /linear-gradient\(rgb\(246, 243, 238\) 0px, rgb\(246, 243, 238\) calc\(100% - 22px\), rgba\(246, 243, 238, 0\)( 100%)?\)/.test(st.toolbar?.bg ?? ""), `${st.toolbar?.stuck} ${st.toolbar?.bg}`);
      await scrollTo(page, 0);
    }
    L.done(14);
  });
  /* V3 (§1–2) — the navy panel: fill, radius, shadow, 8px above and 30px below, the three columns on the page's grid
     (hawk over the filter column, the title on the list's left edge, the week block on the list's right edge); the
     line with its text alternative; the three header screens (streak, none, met) through the dev-only aid. */
  test("V3 — the navy header and its line", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("V3");
    for (const vp of SIZES) {
      await openQc(page, vp);
      const r = await page.evaluate((sel) => {
        const root = document.querySelector<HTMLElement>(sel)!;
        const hd = root.querySelector<HTMLElement>("[data-qc1531='header']")!;
        const b = (e: Element | null | undefined) => { const x = e?.getBoundingClientRect(); return x ? { l: x.left, r: x.right, t: x.top, b: x.bottom, w: x.width, h: x.height } : null; };
        const cs = getComputedStyle(hd);
        const line = root.querySelector<SVGElement>("[data-qc156='line']");
        const rootTop = root.getBoundingClientRect().top;
        return {
          bg: cs.backgroundColor, radius: cs.borderRadius, shadow: cs.boxShadow, mt: cs.marginTop, pad: cs.padding,
          hd: b(hd), root: b(root), aboveRoot: hd.getBoundingClientRect().top - rootTop,
          cols: b(root.querySelector(".qc153-cl")), rail: b(root.querySelector("[data-qc153='rail-column']")), list: b(root.querySelector("[data-qc153='list-column']")),
          art: b(root.querySelector(".qc1531-art img")), title: b(root.querySelector("[data-qc151='title']")), wk: b(root.querySelector("[data-qc156='week']")),
          titleInk: getComputedStyle(root.querySelector("[data-qc151='title']")!).color,
          logBg: getComputedStyle(root.querySelector("[data-qc151='log']")!).backgroundColor, logInk: getComputedStyle(root.querySelector("[data-qc151='log']")!).color,
          recBg: getComputedStyle(root.querySelector("[data-qc151='record']")!).backgroundColor, recRing: getComputedStyle(root.querySelector("[data-qc151='record']")!).boxShadow,
          lineH: line?.getBoundingClientRect().height ?? 0, alt: line?.getAttribute("aria-label") ?? "", pts: (line?.querySelector("[data-qc156='stroke']")?.getAttribute("d") ?? "").split(/[ML]/).filter(Boolean).length,
          bars: root.querySelectorAll("[data-qc154='bar']").length, head: root.querySelector("[data-qc156='week-headline']")?.textContent ?? "",
        };
      }, PAGE);
      const w = vp.width;
      L.check(`${w}: the panel is navy, 20px radius, the ref's shadow`, r.bg === "rgb(42, 58, 82)" && r.radius === "20px" && r.shadow === "rgba(28, 19, 15, 0.55) 0px 22px 34px -22px", `${r.bg} / ${r.radius} / ${r.shadow}`);
      L.check(`${w}: padding 22 30 22 0, 8px above`, r.pad === "22px 30px 22px 0px" && r.mt === "8px", `${r.pad} / ${r.mt}`);
      L.check(`${w}: it spans the content width (filter column + list column)`, !!r.cols && !!r.hd && Math.abs(r.hd.l - r.cols.l) < 1 && Math.abs(r.hd.r - r.cols.r) < 1, `hd ${r.hd?.l}–${r.hd?.r} · cols ${r.cols?.l}–${r.cols?.r}`);
      L.check(`${w}: 30px between the panel and the columns`, !!r.cols && !!r.hd && Math.abs(r.cols.t - r.hd.b - 30) < 1, `${(r.cols!.t - r.hd!.b).toFixed(2)}`);
      L.check(`${w}: the hawk is 190 wide, centred over the filter column, inside the panel`, !!r.art && !!r.rail && Math.abs(r.art.w - 190) < 1 && Math.abs((r.art.l + r.art.r) / 2 - (r.rail.l + r.rail.r) / 2) < 1.5 && r.art.t >= r.hd!.t && r.art.b <= r.hd!.b, `art ${r.art?.l}–${r.art?.r} · rail ${r.rail?.l}–${r.rail?.r}`);
      L.check(`${w}: the title starts on the list column's left edge`, !!r.title && !!r.list && Math.abs(r.title.l - r.list.l) < 1, `${r.title?.l} vs ${r.list?.l}`);
      L.check(`${w}: the week block ends 30px inside the panel (the list's right edge)`, !!r.wk && Math.abs(r.wk.r - (r.hd!.r - 30)) < 1, `${r.wk?.r} vs ${r.hd!.r - 30}`);
      L.check(`${w}: the panel is about 237px tall (ref 243 with its paragraph hidden)`, r.hd!.h > 225 && r.hd!.h < 250, `${r.hd!.h.toFixed(1)}`);
      L.check(`${w}: cream title, inverted buttons`, r.titleInk === "rgb(251, 247, 240)" && r.logBg === "rgb(244, 238, 229)" && r.logInk === "rgb(42, 58, 82)" && r.recBg === "rgba(0, 0, 0, 0)" && /rgba\(244, 238, 229, 0\.6\) 0px 0px 0px 1\.5px inset/.test(r.recRing), `${r.titleInk} · ${r.logBg}/${r.logInk} · ${r.recBg} ${r.recRing}`);
      L.check(`${w}: the line is 74px with 20 points and a text alternative; no bars`, Math.abs(r.lineH - 74) < 0.5 && r.pts === 20 && /^Queries sent per week over the last 20 weeks\. This week: \d+ of \d+\.$/.test(r.alt) && r.bars === 0, `${r.lineH} · ${r.pts} · "${r.alt}" · bars ${r.bars}`);
      L.check(`${w}: the headline reads "n of goal sent this week"`, /^\d+ of \d+sent this week$/.test(r.head), r.head);
      if (w === 1920) await page.screenshot({ path: `${SHOTS}/v3-page-1920.png` });
    }
    for (const g of ["streak", "none", "met"] as const) {
      await page.context().clearCookies().catch(() => {});
      await openQc(page, SIZES[0], g);
      const t = await page.evaluate((sel) => ({
        streak: document.querySelector(`${sel} [data-qc156='streak']`)?.textContent ?? null,
        nudge: document.querySelector(`${sel} [data-qc156='nudge']`)?.textContent ?? null,
        head: document.querySelector(`${sel} [data-qc156='week-headline'] b`)?.textContent ?? null,
      }), PAGE);
      const want = g === "streak" ? /keeps the streak going\.$/ : g === "met" ? /^Goal met — nice work\.$/ : /more to hit your goal this week\.$/;
      L.check(`aid ${g}: ${t.head} · ${t.streak ?? "no streak"} · ${t.nudge}`, want.test(t.nudge ?? "") && (g === "none" ? t.streak === null : /^6-week streak$/.test(t.streak ?? "")), `${t.head} · ${t.streak} · ${t.nudge}`);
      const box = await page.locator(`${PAGE} [data-qc1531='header']`).boundingBox();
      if (box) await page.screenshot({ path: `${SHOTS}/v3-header-${g}-1920.png`, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 60 } });
    }
    L.done(25);
  });
  /* V4 (§3) — the collapsed header: hidden and inert at rest and while the panel is still under its line; shown once
     the panel has gone; 60px, the sheet's full width; the toolbar's top meets its bottom within 1px at three scroll
     positions; the filter column's card 14px under the toolbar's bar; reduced motion drops the slide. And the Contact
     list's slim row still behaves as before (the shared reader). */
  test("V4 — the collapsing header", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("V4");
    const read = () => page.evaluate(([sel, sc]) => {
      const root = document.querySelector<HTMLElement>(sel as string)!;
      const port = document.querySelector<HTMLElement>(sc as string)!;
      const slim = root.querySelector<HTMLElement>("[data-qc156='slim']");
      const tbw = root.querySelector<HTMLElement>("[data-qc154='toolbar']")!;
      const bar = root.querySelector<HTMLElement>("[data-qc153='bar']")!;
      const rail = root.querySelector<HTMLElement>(".qc153-rail")!;
      const hd = root.querySelector<HTMLElement>("[data-qc1531='header']")!;
      const r = (e: Element) => e.getBoundingClientRect();
      const cs = slim ? getComputedStyle(slim) : null;
      const before = slim ? getComputedStyle(slim, "::before") : null;
      const pr = r(port);
      return {
        shown: !!slim?.hasAttribute("data-shown"), opacity: cs?.opacity, vis: cs?.visibility, inert: !!slim?.inert, hidden: slim?.getAttribute("aria-hidden"),
        slimTop: slim ? r(slim).top - pr.top : null, slimBottom: slim ? r(slim).bottom - pr.top : null, slimH: slim ? r(slim).height : null,
        slimL: slim ? r(slim).left : null, slimR: slim ? r(slim).right : null, rootL: r(root).left, rootR: r(root).right,
        groundL: slim && before ? r(slim).left + parseFloat(before.left) : null, groundR: slim && before ? r(slim).right - parseFloat(before.right) : null,
        portL: pr.left, portR: pr.left + port.clientWidth, groundBg: before?.backgroundColor, hair: before?.boxShadow,
        tbwTop: r(tbw).top - pr.top, barTop: r(bar).top - pr.top, railTop: r(rail).top - pr.top, railPos: getComputedStyle(rail).position,
        hdBottom: r(hd).bottom - pr.top, transition: cs?.transitionDuration,
      };
    }, [PAGE, SCROLL]);
    for (const vp of SIZES) {
      await openQc(page, vp);
      const w = vp.width;
      const a = await read();
      L.check(`${w}: at rest the bar is hidden, inert and aria-hidden`, !a.shown && a.opacity === "0" && a.vis === "hidden" && a.inert && a.hidden === "true", JSON.stringify({ shown: a.shown, op: a.opacity, vis: a.vis, inert: a.inert }));
      if (w === 1920) await page.screenshot({ path: `${SHOTS}/v4-rest-1920.png` });
      /* mid-collapse: the panel's foot still below the bar's line */
      await scrollTo(page, Math.max(0, a.hdBottom - (a.slimBottom ?? 72) - 60));
      const m = await read();
      L.check(`${w}: mid-collapse (panel foot ${m.hdBottom.toFixed(0)} below the line ${m.slimBottom?.toFixed(0)}) the bar stays hidden`, !m.shown && m.hdBottom > (m.slimBottom ?? 0), `${m.shown}`);
      if (w === 1920) await page.screenshot({ path: `${SHOTS}/v4-mid-1920.png` });
      for (const y of [a.hdBottom + 40, 1400, 2600]) {
        await scrollTo(page, y);
        const c = await read();
        L.check(`${w} @${Math.round(y)}: shown, 60px, under the lip`, c.shown && c.opacity === "1" && !c.inert && Math.abs((c.slimH ?? 0) - 60) < 0.5 && Math.abs((c.slimTop ?? 0) - 12) < 1, `shown ${c.shown} h ${c.slimH} top ${c.slimTop}`);
        L.check(`${w} @${Math.round(y)}: the toolbar's top meets the bar's bottom within 1px`, Math.abs(c.tbwTop - (c.slimBottom ?? 0)) <= 1, `toolbar ${c.tbwTop.toFixed(2)} · bar bottom ${c.slimBottom?.toFixed(2)} · controls ${c.barTop.toFixed(2)}`);
        if (c.railPos === "sticky") L.check(`${w} @${Math.round(y)}: the filter column's card pins 14px under the toolbar's bar`, Math.abs(c.railTop - c.barTop - 14) <= 1, `rail ${c.railTop.toFixed(2)} · bar ${c.barTop.toFixed(2)}`);
      }
      const c = await read();
      L.check(`${w}: the ground spans the sheet; the content is inset to the page's edges`, Math.abs((c.groundL ?? 0) - c.portL) <= 1 && Math.abs((c.groundR ?? 0) - c.portR) <= 1 && Math.abs((c.slimL ?? 0) - c.rootL) <= 1 && Math.abs((c.slimR ?? 0) - c.rootR) <= 1,
        `ground ${c.groundL}–${c.groundR} · sheet ${c.portL}–${c.portR} · content ${c.slimL}–${c.slimR} · page ${c.rootL}–${c.rootR}`);
      L.check(`${w}: the page colour with the #e0d9ce hairline`, c.groundBg === "rgb(246, 243, 238)" && /rgb\(224, 217, 206\) 0px -1px 0px 0px inset/.test(c.hair ?? ""), `${c.groundBg} ${c.hair}`);
      if (w === 1920) {
        await page.screenshot({ path: `${SHOTS}/v4-collapsed-1920.png` });
        /* keyboard: the bar's button takes focus once shown */
        await page.locator(`${PAGE} [data-qc156='slim-log']`).focus();
        const f = await page.evaluate(() => document.activeElement?.getAttribute("data-qc156"));
        L.check("1920: the collapsed bar's + Log a query takes focus", f === "slim-log", `${f}`);
      }
      await scrollTo(page, 0);
      const z = await read();
      L.check(`${w}: back at the top it hides again`, !z.shown && z.inert, `${z.shown}`);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openQc(page, SIZES[0]);
    const rm = await read();
    L.check("reduced motion: no slide (transition none)", rm.transition === "0s", `${rm.transition}`);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    /* the Contact list after the extraction: the same row, the same moment */
    await openRoute(page, "/agents", SIZES[0]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/after-cl-1920.png` });
    const cl0 = await page.evaluate(() => { const r = document.querySelector<HTMLElement>("[data-clh2='slim']"); return { h: r?.getBoundingClientRect().height, top: r ? getComputedStyle(r).top : null, shown: r?.hasAttribute("data-shown") }; });
    await page.evaluate(() => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0 && e.querySelector("[data-clh2='slim']")); if (s) s.scrollTop = 800; });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/after-cl-1920-scrolled.png` });
    const cl1 = await page.evaluate(() => { const r = document.querySelector<HTMLElement>("[data-clh2='slim']"); const m = document.querySelector<HTMLElement>(".clv-main"); return { h: r?.getBoundingClientRect().height, shown: r?.hasAttribute("data-shown"), cover: m?.style.getPropertyValue("--pin-cover") }; });
    L.check("Contact list: the slim row is hidden at rest and shown at 800, 48px, writing --pin-cover 60px", cl0.shown === false && cl1.shown === true && cl0.h === 48 && cl1.h === 48 && cl1.cover === "60px", JSON.stringify({ cl0, cl1 }));
    L.done(25);
  });
});

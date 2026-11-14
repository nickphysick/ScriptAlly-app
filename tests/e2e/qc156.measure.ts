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

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
  });
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
});

/**
 * Query Centre v136 — the open ruled-corner header, the active and inactive bands, "View the full list"
 * (design-refs/query-centre/query-centre-v136.html). QC136 A1–A5, B1–B7, C1–C2, each on the rendered page
 * at 1512 × 900 and 1280 × 800 (both compact: the page sheet is narrower than 1440), each red first under
 * its named mutation (reports/qc-v136/mutation-proofs.json).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV136
 */
import { retiredHV3 } from "./inkRetired";
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";
import { readPng } from "./pngPixels";

const SIZES = [[1512, 900], [1280, 800]] as const;
const HD = '[data-qcv="open-header"]';
/* the courier's file: 484 × 375, its ink ending 1px short of the right edge and 8px short of the bottom */
const ART = { h: 375, padR: 1, padB: 8 };
const COURT_C: Record<string, string> = { you: "rgb(176, 96, 62)", agent: "rgb(61, 80, 112)", closed: "rgb(217, 211, 204)" };

async function openQc(page: Page, w: number, h: number) {
  await inkOpen(page, "/queries", w, { height: h, scope: "qc136" });
  await expect(page.locator(`${HD}:not([data-loading])`), `${w}: the open header, loaded`).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-qcv="court"][data-loading="false"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1200 }).catch(() => {});
  await page.waitForTimeout(500);
}
const read = (page: Page) => page.evaluate((HD) => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const R = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, cy: r.top + r.height / 2 }; };
  const hd = vis(HD)!, sheet = vis(".ws-window")!, bands = vis('[data-qcv="courts"]');
  const h1 = hd.querySelector<HTMLElement>("h1")!, hn = (hd.querySelector<HTMLElement>('[data-qcv="oh-hn"]') ?? hd.querySelector<HTMLElement>('[data-hp3-part="number"]'))!; /* RE-POINTED (header v3): the number is the shared panel header's */
  const sub = hd.querySelector<HTMLElement>('[data-qcv="oh-sub"]'), art = hd.querySelector<HTMLElement>('[data-qcv="oh-art"]');
  const margin = hd.querySelector<HTMLElement>('[data-qcv="oh-margin"]'), ruled = hd.querySelector<HTMLElement>('[data-qcv="oh-ruled"]');
  const boxed: string[] = [];
  for (let e: HTMLElement | null = hd; e && e !== sheet; e = e.parentElement) {
    const s = getComputedStyle(e);
    if ((s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || s.backgroundImage !== "none" || parseFloat(s.borderTopLeftRadius) > 0) boxed.push(`${e.className || e.tagName}: ${s.backgroundColor} ${s.backgroundImage.slice(0, 24)} r${s.borderTopLeftRadius}`);
  }
  const cs = getComputedStyle(hd), tab = vis(".ws-ftab");
  const groups = [...document.querySelectorAll<HTMLElement>('[data-qcv="glance-group"]')].map((g) => {
    const lb = g.querySelector<HTMLElement>('[data-qcv="glance-label"]')!, ls = getComputedStyle(lb);
    return { key: g.dataset.group!, box: R(g)!, bg: getComputedStyle(g).backgroundColor, radius: getComputedStyle(g).borderTopLeftRadius, label: lb.textContent ?? "", n: Number(g.querySelector<HTMLElement>('[data-qcv="glance-n"]')?.textContent ?? NaN), face: ls.fontFamily, size: parseFloat(ls.fontSize), colour: ls.color, upper: ls.textTransform,
      italics: [...g.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).fontStyle !== "normal").length };
  });
  const cards = [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((c) => {
    const s = getComputedStyle(c), num = c.querySelector<HTMLElement>('[data-qcv="court-count"]')!, list = c.querySelector<HTMLElement>(".qcg-lines")!;
    const top = c.querySelector<HTMLElement>(".qcg-top")!, pill = c.querySelector<HTMLElement>('[data-qcv="court-mom"]'), faces = c.querySelector<HTMLElement>('[data-qcv="court-faces"]')!;
    const fs = [...faces.querySelectorAll<HTMLElement>('[data-qcv="court-face"]')];
    const fcs = getComputedStyle(faces);
    return {
      key: c.dataset.court!, group: c.closest<HTMLElement>('[data-qcv="glance-group"]')?.dataset.group, box: R(c)!, bg: s.backgroundColor, radius: s.borderTopLeftRadius, shadow: s.boxShadow, pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(" "),
      pressed: c.querySelector('[data-qcv="court-pick"]')?.getAttribute("aria-pressed"), label: c.getAttribute("aria-label") ?? "",
      title: c.querySelector<HTMLElement>('[data-qcv="court-title"]')?.textContent ?? "", titleBox: R(c.querySelector('[data-qcv="court-title"]')),
      num: R(num)!, numText: num.textContent ?? "", numBorder: getComputedStyle(num).borderRightWidth, numSize: parseFloat(getComputedStyle(num).fontSize), list: R(list)!, top: R(top)!,
      pill: pill ? { box: R(pill)!, text: pill.textContent ?? "", dir: pill.dataset.dir ?? "", delta: Number(pill.dataset.delta) } : null,
      lines: [...c.querySelectorAll<HTMLElement>('[data-qcv="court-line"]')].map((l) => { const b = l.querySelector<HTMLElement>('[data-qcv="court-tile"]')!, t = l.querySelector<HTMLElement>('[data-qcv="court-label"]')!; return { n: Number(b.textContent), text: t.textContent ?? "", hot: l.dataset.hot === "true", fig: getComputedStyle(b).color, ink: getComputedStyle(t).color, clipped: t.scrollWidth - t.clientWidth }; }),
      overflowX: c.scrollWidth - c.clientWidth,
      facesH: faces.clientHeight - parseFloat(fcs.paddingTop) - parseFloat(fcs.paddingBottom), facesBox: R(faces)!,
      discs: fs.map((f) => { const r = f.getBoundingClientRect(), x = getComputedStyle(f); return { y: r.top, w: r.width, h: r.height, r: r.right, bg: x.backgroundColor, tip: f.dataset.tip ?? "", title: f.getAttribute("title") }; }),
      more: faces.querySelector<HTMLElement>('[data-qcv="court-more"]')?.textContent ?? null, moreR: faces.querySelector<HTMLElement>('[data-qcv="court-more"]')?.getBoundingClientRect().right ?? null,
    };
  });
  const link = vis('[data-qcv="full-list"]');
  return {
    sheet: R(sheet)!, hd: R(hd)!, txt: R(hd.querySelector('[data-qcv="oh-text"], [data-hp3-part="text"]'))!, bands: R(bands), boxed,
    panel: hd.classList.contains("hpanel") || hd.hasAttribute("data-hpanel"), sheets: [...document.querySelectorAll<HTMLElement>("[data-header-sheet]")].filter((e) => e.getBoundingClientRect().height > 0).length,
    tabBg: tab ? getComputedStyle(tab).backgroundColor : "", pageBg: getComputedStyle(document.documentElement).getPropertyValue("--ws-page").trim(), sheetBg: getComputedStyle(sheet).backgroundColor,
    rule: `${cs.borderBottomWidth} ${cs.borderBottomColor}`, hdBg: cs.backgroundColor, hdRadius: cs.borderTopLeftRadius,
    h1Text: h1.textContent ?? "", h1Label: h1.getAttribute("aria-label"), pageTitle: h1.hasAttribute("data-page-title"), hn: hn.textContent ?? "", hnSize: parseFloat(getComputedStyle(hn).fontSize), hnFace: getComputedStyle(hn).fontFamily,
    wordsSize: parseFloat(getComputedStyle(hd.querySelector('[data-qcv="oh-ht"], [data-hp3-part="words"]')!).fontSize),
    sub: sub ? { text: sub.textContent ?? "", em: sub.querySelector("em")?.textContent ?? null, emStyle: sub.querySelector("em") ? getComputedStyle(sub.querySelector("em")!).fontStyle : "", emColour: sub.querySelector("em") ? getComputedStyle(sub.querySelector("em")!).color : "", face: getComputedStyle(sub).fontFamily, size: parseFloat(getComputedStyle(sub).fontSize) } : null,
    art: R(art), artHidden: art?.getAttribute("aria-hidden"), stamp: hd.querySelector<HTMLElement>('[data-qcv="oh-stamp"]') ? getComputedStyle(hd.querySelector('[data-qcv="oh-stamp"]')!).color : null,
    margin: margin ? { box: R(margin)!, bg: getComputedStyle(margin).backgroundColor, hidden: margin.getAttribute("aria-hidden") } : null,
    ruled: ruled ? { box: R(ruled)!, mask: getComputedStyle(ruled).maskImage || getComputedStyle(ruled).webkitMaskImage, hidden: ruled.getAttribute("aria-hidden") } : null,
    faces: hd.querySelectorAll('[data-qcv="oh-face"], [data-qcv="oh-faces"]').length,
    groups, cards, link: link ? { box: R(link)!, text: link.querySelector<HTMLElement>(".qcfl-words")?.textContent ?? "", all: link.textContent ?? "", arrowHidden: link.querySelector<HTMLElement>(".qcfl-arrow")?.getAttribute("aria-hidden"), face: getComputedStyle(link).fontFamily, size: parseFloat(getComputedStyle(link).fontSize), tag: link.tagName } : null,
    vh: window.innerHeight, wide: !!document.querySelector(".ws-app.sheet-wide"),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}, HD);
/** rows of a 1px column, top to bottom, that are darker than the first (a ruled line crossing it) */
async function linesInColumn(page: Page, x: number, y0: number, y1: number): Promise<number> {
  const png = readPng(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y0), width: 1, height: Math.round(y1 - y0) }, animations: "disabled" }));
  const lum = (p: number[]) => p[0] + p[1] + p[2];
  const rows = Array.from({ length: png.height }, (_, y) => lum(png.at(0, y)));
  const ground = [...rows].sort((a, b) => a - b)[Math.floor(rows.length * 0.7)];
  let n = 0;
  for (let y = 1; y < rows.length; y++) if (ground - rows[y] >= 6 && ground - rows[y - 1] < 6) n++;
  return n;
}

test.describe("Query Centre v136 — A · the open header", () => {
  test("A1 · open: no surface or radius on the header or anything around it, no header sheet, no panel class; the tab is the page's colour", async ({ page }) => {
    test.skip(true, retiredHV3("the header of the Query Centre is the shared panel again, with a surface and a radius", "HV3 H1"));
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.wide, `${w}: the page sheet is compact (precondition)`).toBe(false);
      expect(g.boxed, `${w}: the header or an ancestor has a ground or a radius`).toEqual([]);
      expect(g.panel, `${w}: the header carries a panel class`).toBe(false);
      expect(g.sheets, `${w}: a header sheet is on screen`).toBe(0);
      expect(g.pageBg.length, `${w}: the page colour token resolved (${g.pageBg})`).toBeGreaterThan(0);
      expect(g.tabBg.replace(/\s/g, ""), `${w}: the folder tab is the page's colour`).toBe(g.pageBg.replace(/\s/g, ""));
      expect(g.rule, `${w}: the rule`).toBe("1px rgba(28, 19, 15, 0.16)");
      expect(g.faces, `${w}: no faces in the header`).toBe(0);
      expect(g.overflowX, `${w}: no sideways overflow`).toBeLessThanOrEqual(0);
    }
  });

  test("A2 · title: “You’ve sent {N} queries”, N = active + inactive, the figure at 88; the subheader is “for {title}” with the title italic", async ({ page }) => {
    test.skip(true, retiredHV3("the title is the stacked number and its words (82 queries sent), not the v136 sentence", "HV3 H2 and H3"));
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      const active = g.groups.find((x) => x.key === "active")!, inactive = g.groups.find((x) => x.key === "inactive")!;
      expect(active && inactive, `${w}: both band labels were read`).toBeTruthy();
      const N = active.n + inactive.n;
      expect(N, `${w}: the bands' total`).toBeGreaterThan(0);
      expect(g.hn, `${w}: the figure is active + inactive (${active.n} + ${inactive.n})`).toBe(String(N));
      expect(g.h1Text, `${w}: the title's text`).toBe(`You’ve sent${N}${N === 1 ? "query" : "queries"}`);
      expect(g.h1Label, `${w}: the title's accessible name`).toBe(`You’ve sent ${N} ${N === 1 ? "query" : "queries"}`);
      expect(g.pageTitle, `${w}: the h1 keeps data-page-title`).toBe(true);
      expect(g.hnFace, `${w}: the figure's face`).toMatch(/Special Elite/);
      expect(Math.abs(g.hnSize - 88), `${w}: the figure is ${g.hnSize}px`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.wordsSize - 34), `${w}: the words are ${g.wordsSize}px`).toBeLessThanOrEqual(1);
      if (g.stamp) expect(g.stamp, `${w}: the stamp is rust`).toBe("rgb(162, 69, 42)");
      /* the subheader names the manuscript the page is scoped to: scope it to one, through the page's own menu */
      /* the strip keeps an inert copy of itself to measure its fold: the visible button is the one to press */
      const more = page.locator('[data-qcv="ws-more"]').filter({ visible: true }).first();
      await more.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await more.click();
      const items = await page.locator('.qcv-menu [role="menuitemradio"]').evaluateAll((els) => els.map((e, i) => ({ i, label: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim() })));
      const from = items.findIndex((x) => /^All manuscripts/.test(x.label));
      expect(from, `${w}: the manuscript scope is in the menu`).toBeGreaterThanOrEqual(0);
      const book = items.slice(from + 1).find((x) => !/^Not assigned/.test(x.label) && /\d+\s*$/.test(x.label) && !/\b0\s*$/.test(x.label));
      expect(book, `${w}: a manuscript with queries to scope to`).toBeTruthy();
      await page.locator('.qcv-menu [role="menuitemradio"]').nth(book!.i).click();
      await page.waitForTimeout(600);
      const s = await read(page);
      const title = book!.label.replace(/\s*\d+\s*$/, "");
      expect(s.sub, `${w}: a subheader once the page is scoped to one book`).not.toBeNull();
      expect(s.sub!.text, `${w}: the subheader, exactly`).toBe(`for ${title}`);
      expect(s.sub!.em, `${w}: the title is the emphasised part`).toBe(title);
      expect(s.sub!.emStyle, `${w}: the title is italic`).toBe("italic");
      expect(s.sub!.emColour, `${w}: the title is full ink`).toBe("rgb(28, 19, 15)");
      expect(s.sub!.face, `${w}: the subheader's face`).toMatch(/Source Serif/);
      expect(Math.abs(s.sub!.size - 19), `${w}: the subheader is ${s.sub!.size}px`).toBeLessThanOrEqual(0.5);
      const sa = s.groups.find((x) => x.key === "active")!, si = s.groups.find((x) => x.key === "inactive")!;
      expect(s.hn, `${w}: scoped, the figure is still active + inactive`).toBe(String(sa.n + si.n));
      console.log(`[A2] ${w}: ${N} = ${active.n} + ${inactive.n}; scoped to "${title}": ${s.hn} = ${sa.n} + ${si.n}`);
      await more.click();
      await page.locator('.qcv-menu [role="menuitemradio"]').nth(from).click();
      await page.waitForTimeout(300);
    }
  });

  test("A3 · alignment: the text starts on the bands' left, the drawing's ink ends on their right and stands on the rule", async ({ page }) => {
    test.skip(true, retiredHV3("the drawing is centred inside the panel; there is no rule for it to stand on", "HV3 H6"));
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.bands && g.art, `${w}: the bands and the drawing were found`).toBeTruthy();
      expect(Math.abs(g.txt.x - g.bands!.x), `${w}: text left ${g.txt.x} / bands left ${g.bands!.x}`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.hd.x - g.bands!.x) <= 1 && Math.abs(g.hd.r - g.bands!.r) <= 1, `${w}: the header's edges are the content column's`).toBe(true);
      expect(Math.abs(g.art!.h - 231), `${w}: the drawing is ${g.art!.h} tall`).toBeLessThanOrEqual(1);
      const k = g.art!.h / ART.h, inkR = g.art!.r - ART.padR * k, inkB = g.art!.b - ART.padB * k, ruleY = g.hd.b - 1;
      expect(Math.abs(inkR - g.bands!.r), `${w}: the drawing's ink ends at ${inkR}, the bands at ${g.bands!.r}`).toBeLessThanOrEqual(3);
      expect(Math.abs(inkB - ruleY), `${w}: the drawing's ink ends at ${inkB}, the rule is at ${ruleY}`).toBeLessThanOrEqual(3);
      expect(g.artHidden, `${w}: the drawing is aria-hidden`).toBe("true");
      /* the text block is centred in the row */
      const rowTop = g.hd.y, rowBottom = g.hd.b - 1;
      expect(Math.abs(g.txt.cy - (rowTop + rowBottom) / 2), `${w}: the text block is centred in the header`).toBeLessThanOrEqual(2);
      console.log(`[A3] ${w}: ink right ${inkR.toFixed(1)} / ${g.bands!.r.toFixed(1)}, ink bottom ${inkB.toFixed(1)} / rule ${ruleY.toFixed(1)}`);
    }
  });

  test("A4 · ruled corner: a red margin line 26 left of the column from the sheet's top to the rule; ruled lines at the sheet's left, none past the fade", async ({ page }) => {
    test.skip(true, retiredHV3("the ruled corner and its margin line are gone", "HV3 H1"));
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.margin && g.ruled, `${w}: the two decoration layers were found`).toBeTruthy();
      expect(g.margin!.hidden === "true" && g.ruled!.hidden === "true", `${w}: both are aria-hidden`).toBe(true);
      expect(Math.abs(g.hd.x - g.margin!.box.x - 26), `${w}: the margin line is ${g.hd.x - g.margin!.box.x} left of the column`).toBeLessThanOrEqual(1);
      expect(g.margin!.bg, `${w}: the margin line's colour`).toBe("rgba(176, 72, 62, 0.42)");
      expect(Math.abs(g.margin!.box.w - 1), `${w}: 1px wide`).toBeLessThanOrEqual(0.2);
      expect(Math.abs(g.margin!.box.y - g.sheet.y), `${w}: it starts at the sheet's top (${g.margin!.box.y} / ${g.sheet.y})`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.margin!.box.b - (g.hd.b - 1)), `${w}: it ends at the rule (${g.margin!.box.b} / ${g.hd.b - 1})`).toBeLessThanOrEqual(1.5);
      /* the ruled layer starts at the sheet's left edge, is the sheet's width, and never reaches outside the sheet */
      expect(Math.abs(g.ruled!.box.x - g.sheet.x) <= 1 && Math.abs(g.ruled!.box.w - g.sheet.w) <= 1, `${w}: the ruled layer is the sheet's (${g.ruled!.box.x}/${g.ruled!.box.w} against ${g.sheet.x}/${g.sheet.w})`).toBe(true);
      expect(g.ruled!.box.r, `${w}: nothing past the sheet's right edge`).toBeLessThanOrEqual(g.sheet.r + 1);
      /* painted: lines cross a column 6px inside the sheet's left edge; none cross one in the gap before the drawing */
      const left = await linesInColumn(page, g.sheet.x + 6, g.sheet.y + 2, g.hd.b - 3);
      const farX = g.art!.x - 16;
      expect((farX - g.sheet.x) / g.sheet.w, `${w}: the far column is past the fade (precondition)`).toBeGreaterThan(0.45);
      const far = await linesInColumn(page, farX, g.sheet.y + 2, g.hd.b - 3);
      console.log(`[A4] ${w}: ${left} ruled lines at the sheet's left, ${far} at ${(100 * (farX - g.sheet.x) / g.sheet.w).toFixed(0)}% of its width`);
      expect(left, `${w}: ruled lines at the sheet's left`).toBeGreaterThanOrEqual(4);
      expect(far, `${w}: ruled lines past the fade`).toBe(0);
    }
  });

  test("A5 · rhythm: the bands start 40 under the rule", async ({ page }) => {
    test.skip(true, retiredHV3("the bands stand 28 under the panel, not 40 under a rule", "HV3 H9"));
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.bands, `${w}: the bands were found`).not.toBeNull();
      expect(Math.abs(g.bands!.y - g.hd.b - 40), `${w}: rule → bands ${g.bands!.y - g.hd.b}`).toBeLessThanOrEqual(2);
    }
  });
});

test.describe("Query Centre v136 — B · the active and inactive bands", () => {
  test("B1 · groups: blush active and grey inactive, typewriter labels with no italics, active = with you + with agents", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.groups.map((x) => x.key), `${w}: two groups, active first`).toEqual(["active", "inactive"]);
      const [a, i] = g.groups;
      expect(a.bg, `${w}: the active band`).toBe("rgb(243, 221, 210)");
      expect(i.bg, `${w}: the inactive band`).toBe("rgb(228, 222, 214)");
      const n = (k: string) => Number(g.cards.find((c) => c.key === k)!.numText);
      expect(a.label, `${w}: the active label`).toBe(`${n("you") + n("agent")} active`);
      expect(i.label, `${w}: the inactive label`).toBe(`${n("closed")} inactive`);
      for (const x of g.groups) {
        expect(x.face, `${w} ${x.key}: Special Elite`).toMatch(/Special Elite/);
        expect(Math.abs(x.size - 25), `${w} ${x.key}: ${x.size}px`).toBeLessThanOrEqual(1);
        expect(x.upper, `${w} ${x.key}: not uppercase`).toBe("none");
        expect(x.italics, `${w} ${x.key}: no italic text in the band`).toBe(0);
        expect(x.radius, `${w} ${x.key}: radius`).toBe("16px");
      }
      expect(a.colour === "rgb(91, 42, 31)" && i.colour === "rgb(74, 66, 60)", `${w}: label colours ${a.colour} / ${i.colour}`).toBe(true);
      expect(Math.abs(i.box.x - a.box.r - 20), `${w}: the bands are ${i.box.x - a.box.r} apart`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.box.w / i.box.w - 2), `${w}: 2fr to 1fr (${(a.box.w / i.box.w).toFixed(3)})`).toBeLessThanOrEqual(0.08);
      expect(Math.abs(a.box.h - i.box.h), `${w}: the bands are one height`).toBeLessThanOrEqual(1);
    }
  });

  test("B2 · cards: two in the active band 8 apart, one in the inactive; white, radius 11; equal heights", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.cards.map((c) => `${c.group}:${c.key}`), `${w}: the cards and their bands`).toEqual(["active:you", "active:agent", "inactive:closed"]);
      const [y, a, c] = g.cards;
      expect(Math.abs(a.box.x - y.box.r - 8), `${w}: the active cards are ${a.box.x - y.box.r} apart`).toBeLessThanOrEqual(1);
      for (const k of g.cards) {
        expect(k.bg, `${w} ${k.key}: white`).toBe("rgb(255, 255, 255)");
        expect(k.radius, `${w} ${k.key}: radius`).toBe("11px");
        expect(k.pad, `${w} ${k.key}: padding`).toBe("16px 18px 14px 18px");
        expect(k.shadow, `${w} ${k.key}: the hairline ring`).toMatch(/rgba\(28, 19, 15, 0\.06\) 0px 0px 0px 1px/);
      }
      expect(Math.abs(y.box.h - a.box.h) <= 1 && Math.abs(y.box.h - c.box.h) <= 1, `${w}: card heights ${y.box.h} / ${a.box.h} / ${c.box.h}`).toBe(true);
      expect(Math.abs(y.box.y - a.box.y) <= 1 && Math.abs(y.box.y - c.box.y) <= 1, `${w}: one row`).toBe(true);
    }
  });

  test("B3 · card layout: the number centred on its headlines with a divider to its right, the pill right-aligned, nothing overflowing", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      for (const c of g.cards) {
        expect(c.num.cy, `${w} ${c.key}: the number's centre ${c.num.cy} within the headlines ${c.list.y}–${c.list.b}`).toBeGreaterThanOrEqual(c.list.y);
        expect(c.num.cy, `${w} ${c.key}: the number's centre within the headlines`).toBeLessThanOrEqual(c.list.b);
        expect(c.numBorder, `${w} ${c.key}: a 1px divider on the number's right`).toBe("1px");
        expect(c.num.r, `${w} ${c.key}: the divider is left of the headlines`).toBeLessThan(c.list.x);
        expect(c.num.y, `${w} ${c.key}: the number is under the top row`).toBeGreaterThanOrEqual(c.top.b - 1);
        expect(Math.abs(c.numSize - 52), `${w} ${c.key}: the number is ${c.numSize}px`).toBeLessThanOrEqual(1);
        expect(c.pill, `${w} ${c.key}: a month pill`).not.toBeNull();
        expect(Math.abs(c.pill!.box.r - c.top.r), `${w} ${c.key}: the pill is right-aligned in the top row`).toBeLessThanOrEqual(1);
        expect(c.titleBox!.x, `${w} ${c.key}: the label is left of the pill`).toBeLessThan(c.pill!.box.x);
        expect(c.titleBox!.r, `${w} ${c.key}: the label and the pill do not meet`).toBeLessThanOrEqual(c.pill!.box.x);
        expect(c.overflowX, `${w} ${c.key}: no horizontal overflow in the card`).toBeLessThanOrEqual(0);
        for (const l of c.lines) expect(l.clipped, `${w} ${c.key}: "${l.text}" is whole`).toBeLessThanOrEqual(0);
        expect(c.facesBox.y, `${w} ${c.key}: the faces are under the headlines`).toBeGreaterThanOrEqual(c.list.b);
      }
    }
  });

  test("B4 · copy: the labels and lines exactly, rust only on a hot line, and the pill's words", async ({ page }) => {
    const LINE: Record<string, [(n: number) => string, (n: number) => string]> = {
      you: [(n) => (n === 1 ? "offer to consider" : "offers to consider"), (n) => ""],
      agent: [() => "overdue", () => "due this week"],
      closed: [(n) => (n === 1 ? "rejection" : "rejections"), () => "no response"],
    };
    const TITLE: Record<string, string> = { you: "With you", agent: "With agents", closed: "Closed" };
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      const hot: Record<string, number> = {};
      for (const c of g.cards) {
        expect(c.title, `${w} ${c.key}: the label`).toBe(TITLE[c.key]);
        expect(c.lines.length, `${w} ${c.key}: two lines`).toBe(2);
        expect(c.lines[0].text, `${w} ${c.key}: line 1`).toBe(LINE[c.key][0](c.lines[0].n));
        if (c.key === "you") expect(c.lines[1].text, `${w} you: line 2`).toMatch(c.lines[1].n === 1 ? /^(request|partial|full) to send$/ : /^(requests|partials|fulls) to send$/);
        else expect(c.lines[1].text, `${w} ${c.key}: line 2`).toBe(LINE[c.key][1](c.lines[1].n));
        c.lines.forEach((l, i) => {
          const should = i === 0 && c.key !== "closed" && l.n > 0;
          expect(l.hot, `${w} ${c.key} line ${i + 1}: hot exactly when the rule holds`).toBe(should);
          expect(l.fig, `${w} ${c.key} line ${i + 1}: the figure's colour`).toBe(should ? "rgb(162, 69, 42)" : "rgb(28, 19, 15)");
          expect(l.ink, `${w} ${c.key} line ${i + 1}: the label's ink`).toBe(should ? "rgb(28, 19, 15)" : "rgba(28, 19, 15, 0.8)");
          if (should) hot[c.key] = (hot[c.key] ?? 0) + 1;
        });
        const p = c.pill!;
        expect(Number.isFinite(p.delta), `${w} ${c.key}: the month-on-month figure was published`).toBe(true);
        expect(p.text, `${w} ${c.key}: the pill`).toBe(p.delta === 0 ? "No change on last month" : `${p.delta > 0 ? "▲" : "▼"} ${Math.abs(p.delta)} on last month`);
        expect(c.label, `${w} ${c.key}: the card's accessible name states its lines`).toContain(`${c.lines[0].n} ${c.lines[0].text}`);
      }
      console.log(`[B4] ${w}: hot lines ${JSON.stringify(hot)}; ${g.cards.map((c) => `${c.key}: ${c.lines.map((l) => `${l.n} ${l.text}`).join(" / ")} · ${c.pill!.text}`).join(" | ")}`);
    }
  });

  test("B5 · faces: one row a card, the court's colour, and the discs shown plus +N is the card's number", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      for (const c of g.cards) {
        expect(c.discs.length, `${w} ${c.key}: discs drawn`).toBeGreaterThan(0);
        const d = c.discs[0];
        expect(Math.abs(d.w - 30) <= 0.5 && Math.abs(d.h - 30) <= 0.5, `${w} ${c.key}: a disc is ${d.w} × ${d.h}`).toBe(true);
        expect(Math.abs(c.facesH - d.h), `${w} ${c.key}: the row is ${c.facesH} tall against a ${d.h} disc`).toBeLessThanOrEqual(1);
        for (const x of c.discs) {
          expect(Math.abs(x.y - d.y), `${w} ${c.key}: every disc on one line`).toBeLessThanOrEqual(0.5);
          expect(x.bg, `${w} ${c.key}: the court's colour`).toBe(COURT_C[c.key]);
          expect(x.tip.length, `${w} ${c.key}: a disc names its agent`).toBeGreaterThan(0);
          expect(x.title, `${w} ${c.key}: no native title`).toBeNull();
          expect(x.r, `${w} ${c.key}: a disc inside the row`).toBeLessThanOrEqual(c.facesBox.r + 0.5);
        }
        const rest = c.more ? Number(c.more.replace(/\D/g, "")) : 0;
        if (c.more) expect(c.more, `${w} ${c.key}: the remainder`).toMatch(/^\+\d+$/);
        expect(c.discs.length + rest, `${w} ${c.key}: ${c.discs.length} discs + ${rest} = the card's ${c.numText}`).toBe(Number(c.numText));
        if (c.moreR != null) expect(c.moreR, `${w} ${c.key}: "+N" inside the row`).toBeLessThanOrEqual(c.facesBox.r + 0.5);
      }
      /* hovering a disc shows the agent's name */
      const f = page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-face"]').first();
      const name = (await f.getAttribute("data-tip")) ?? "";
      await f.hover();
      await expect(page.locator('[data-qcv="tip"].on b'), `${w}: the popup names the agent`).toHaveText(name, { timeout: 2000 });
      await page.mouse.move(4, 4);
      console.log(`[B5] ${w}: ${g.cards.map((c) => `${c.key} ${c.discs.length}${c.more ?? ""} of ${c.numText}`).join(" · ")}`);
    }
  });

  test("B6 · select: pressing a card presses it, rings it in navy and scopes Recently updated only; pressing again clears", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const rows = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].map((r) => r.dataset.qid));
      const ru = () => page.locator('[data-qcv="ru"]').getAttribute("data-court");
      const before = await rows();
      expect(before.length, `${w}: the list has rows`).toBeGreaterThan(10);
      expect(await ru(), `${w}: Recently updated is unscoped at rest`).toBe("all");
      for (const k of ["you", "agent", "closed"]) {
        const pick = page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`);
        await pick.click();
        await page.waitForTimeout(350);
        const g = await read(page);
        const c = g.cards.find((x) => x.key === k)!;
        expect(c.pressed, `${w} ${k}: aria-pressed`).toBe("true");
        expect(c.shadow, `${w} ${k}: the navy ring`).toMatch(/rgb\(45, 58, 80\) 0px 0px 0px 2px/);
        expect(g.cards.filter((x) => x.pressed === "true").length, `${w} ${k}: one card pressed`).toBe(1);
        expect(await ru(), `${w} ${k}: Recently updated is scoped to it`).toBe(k);
        expect(await rows(), `${w} ${k}: the list is untouched`).toEqual(before);
        await pick.click();
        await page.waitForTimeout(300);
        expect((await read(page)).cards.find((x) => x.key === k)!.pressed, `${w} ${k}: pressing again clears it`).toBe("false");
        expect(await ru(), `${w} ${k}: and Recently updated is unscoped again`).toBe("all");
      }
    }
  });

  test("B7 · no jump: the header, the bands, the cards and the link are the same boxes loading and loaded", async ({ page }) => {
    const boxes = () => page.evaluate((HD) => {
      const R = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
      const hd = document.querySelector<HTMLElement>(HD);
      return {
        loading: !!hd?.hasAttribute("data-loading"), cardsLoading: [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].filter((c) => c.dataset.loading === "true").length,
        parts: {
          header: R(hd), text: R(hd?.querySelector('[data-qcv="oh-text"], [data-hp3-part="text"]') ?? null), drawing: R(hd?.querySelector('[data-qcv="oh-art"]') ?? null),
          ...Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qcv="glance-group"]')].map((g) => [`band-${g.dataset.group}`, R(g)])),
          ...Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((c) => [`card-${c.dataset.court}`, R(c)])),
          link: R(document.querySelector('[data-qcv="full-list"]')),
        } as Record<string, { x: number; y: number; w: number; h: number } | null>,
      };
    }, HD);
    for (const [w, h] of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
      await inkOpen(page, "/queries", w, { height: h, scope: "qc136" });
      await expect(page.locator(`${HD}[data-loading]`), `${w}: the loading header`).toBeVisible();
      await expect(page.locator('[data-qcv="court"][data-loading="true"]').first(), `${w}: the loading bands`).toBeVisible();
      const a = await boxes();
      await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(900);
      const b = await boxes();
      expect(a.loading && a.cardsLoading === 3, `${w}: measured loading (header ${a.loading}, cards ${a.cardsLoading})`).toBe(true);
      expect(!b.loading && b.cardsLoading === 0, `${w}: then loaded`).toBe(true);
      const keys = Object.keys(b.parts);
      expect(keys.length, `${w}: parts measured`).toBeGreaterThanOrEqual(9);
      for (const k of keys) {
        expect(a.parts[k] && b.parts[k], `${w}: ${k} measured in both states`).toBeTruthy();
        for (const d of ["x", "y", "w", "h"] as const) expect(Math.abs(a.parts[k]![d] - b.parts[k]![d]), `${w}: ${k} ${d} ${a.parts[k]![d]} → ${b.parts[k]![d]}`).toBeLessThanOrEqual(1);
      }
      console.log(`[B7] ${w}: ${keys.map((k) => `${k} ${b.parts[k]!.h}`).join(" · ")}`);
    }
  });
});

test.describe("Query Centre v136 — C · View the full list", () => {
  test("C1 · above the fold: the link's bottom edge is 24px or more inside the viewport, 40 under the bands, centred", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.link, `${w}: the link was found`).not.toBeNull();
      expect(g.vh, `${w}: the viewport`).toBe(h);
      expect(g.vh - g.link!.box.b, `${w}: the link ends ${g.vh - g.link!.box.b} above the viewport's foot`).toBeGreaterThanOrEqual(24);
      /* RE-POINTED (header v3 part C): 40 under the bands, where v136 drew 30 */
      expect(Math.abs(g.link!.box.y - g.bands!.b - 40), `${w}: bands → link ${g.link!.box.y - g.bands!.b}`).toBeLessThanOrEqual(2);
      expect(Math.abs((g.link!.box.x + g.link!.box.w / 2) - (g.bands!.x + g.bands!.w / 2)), `${w}: centred under the bands`).toBeLessThanOrEqual(2);
      console.log(`[C1] ${w}: the link ends at ${g.link!.box.b.toFixed(1)} of ${g.vh}`);
    }
  });

  test("C2 · link: the exact words, an aria-hidden arrow; activating it scrolls to Your queries, focuses its heading, and leaves the URL alone", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await read(page);
      expect(g.link!.text, `${w}: the words`).toBe("View the full list");
      expect(g.link!.all, `${w}: the words and the arrow`).toBe("View the full list↓");
      expect(g.link!.arrowHidden, `${w}: the arrow is aria-hidden`).toBe("true");
      expect(g.link!.face, `${w}: Special Elite`).toMatch(/Special Elite/);
      expect(Math.abs(g.link!.size - 24), `${w}: ${g.link!.size}px`).toBeLessThanOrEqual(0.5);
      const url = page.url();
      const headBefore = await page.locator('[data-qcv="ws-title"]').evaluate((e) => e.getBoundingClientRect().top);
      expect(headBefore, `${w}: the heading starts below the fold (precondition)`).toBeGreaterThan(h);
      await page.locator('[data-qcv="full-list"]').click();
      await expect.poll(() => page.locator('[data-qcv="ws-title"]').evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }), { timeout: 5000, message: `${w}: the heading scrolled into view` }).toBe(true);
      const f = await page.evaluate(() => ({ focused: document.activeElement?.getAttribute("data-qcv"), tag: document.activeElement?.tagName, tabindex: document.querySelector('[data-qcv="ws-title"]')?.getAttribute("tabindex") }));
      expect(f.focused, `${w}: focus is on the heading (${f.tag})`).toBe("ws-title");
      expect(f.tabindex, `${w}: the heading is focusable, out of the tab order`).toBe("-1");
      expect(page.url(), `${w}: the URL is unchanged`).toBe(url);
      /* by keyboard too */
      await page.locator('[data-qcv="courts"]').evaluate((e) => e.closest(".wpg-scroll")!.scrollTo({ top: 0 }));
      await page.waitForTimeout(300);
      await page.locator('[data-qcv="full-list"]').focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-qcv")), { timeout: 5000 }).toBe("ws-title");
    }
  });
});

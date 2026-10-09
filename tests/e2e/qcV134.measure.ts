/**
 * Query Centre v134 — the hero number and faces, the icon desk cards, the tinted band and the banner
 * (design-refs/query-centre/query-centre-v134.html). QC134 N1–N3, K1–K3, B1–B3, L1, each on the
 * rendered page at 1512 × 900 and 1280 × 800, each red first under its named mutation
 * (reports/qc-v134/mutation-proofs.json).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV134
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";
import { pixel, sameRgb } from "./qc126Lib";

const SIZES = [[1512, 900], [1280, 800]] as const;
const wide = (w: number) => w >= 1440;
const HD = '[data-qcv="open-header"]';
const RUST = "rgb(176, 96, 62)", BLUE = "rgb(61, 80, 112)", GREY = "rgb(179, 172, 165)";
const FACE_BG: Record<string, string> = { you: RUST, agent: BLUE, closed: GREY };

async function openQc(page: Page, w: number, h: number) {
  await inkOpen(page, "/queries", w, { height: h, scope: "qc134" });
  await expect(page.locator(`${HD}:not([data-loading])`), `${w}: the open header, loaded`).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-qcv="court"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[aria-label="Close the guide"], [data-guide-close]').first().click({ timeout: 1200 }).catch(() => {});
  await page.waitForTimeout(500);
}
const noOverflow = (page: Page) => page.evaluate((HD) => {
  const doc = document.documentElement, sc = document.querySelector<HTMLElement>(HD)?.closest<HTMLElement>(".wpg-scroll");
  return { doc: doc.scrollWidth - doc.clientWidth, sc: sc ? sc.scrollWidth - sc.clientWidth : NaN };
}, HD);
/** the desk's three figures, in order you · agent · closed */
const deskCounts = (page: Page) => page.evaluate(() => Object.fromEntries(["you", "agent", "closed"].map((k) =>
  [k, Number((document.querySelector<HTMLElement>(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-count"]`)?.innerText ?? "").replace(/\D/g, "") || NaN)])) as Record<string, number>);

test.describe("Query Centre v134 — the hero number and the faces", () => {
  test("N1 · hero: the number is the page's count at 124 (98), its words at 42 (34), on one line", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await page.evaluate((HD) => {
        const hd = document.querySelector<HTMLElement>(HD)!;
        const h1 = hd.querySelector<HTMLElement>("h1")!, hn = hd.querySelector<HTMLElement>('[data-qcv="oh-hn"]'), ht = hd.querySelector<HTMLElement>('[data-qcv="oh-ht"]');
        const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
        const total = Number((document.querySelector<HTMLElement>('[data-qcv="showing"]')?.dataset.y) ?? NaN);
        return {
          hn: hn?.textContent ?? "", ht: ht?.textContent ?? "", hnSize: parseFloat(cs(hn)?.fontSize ?? "0"), htSize: parseFloat(cs(ht)?.fontSize ?? "0"),
          hnFace: cs(hn)?.fontFamily ?? "", htFace: cs(ht)?.fontFamily ?? "", display: cs(h1)!.display, align: cs(h1)!.alignItems, gap: parseFloat(cs(h1)!.columnGap),
          pageTitle: h1.hasAttribute("data-page-title"), label: h1.getAttribute("aria-label"),
          hnBox: hn!.getBoundingClientRect().toJSON(), htBox: ht!.getBoundingClientRect().toJSON(), total,
        };
      }, HD);
      expect(Number.isFinite(g.total) && g.total > 0, `${w}: the list's total was read (${g.total})`).toBe(true);
      expect(g.hn, `${w}: the hero number is the page's count`).toBe(String(g.total));
      expect(g.ht, `${w}: the words`).toBe(g.total === 1 ? "query out" : "queries out");
      expect(Math.abs(g.hnSize - (wide(w) ? 124 : 98)), `${w}: the number is ${g.hnSize}px`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.htSize - (wide(w) ? 42 : 34)), `${w}: the words are ${g.htSize}px`).toBeLessThanOrEqual(1);
      expect(g.hnFace, `${w}: the number's face`).toMatch(/Special Elite/);
      expect(g.htFace, `${w}: the words' face`).toMatch(/Special Elite/);
      expect(g.display === "flex" && g.align === "baseline", `${w}: a baseline row (${g.display} ${g.align})`).toBe(true);
      expect(Math.abs(g.gap - (wide(w) ? 18 : 14)), `${w}: the gap is ${g.gap}`).toBeLessThanOrEqual(1);
      /* one line: the words start to the number's right, and their boxes overlap vertically */
      expect(g.htBox.left, `${w}: the words sit beside the number`).toBeGreaterThan(g.hnBox.right);
      expect(g.htBox.top < g.hnBox.bottom && g.htBox.bottom > g.hnBox.top, `${w}: on one line`).toBe(true);
      expect(g.pageTitle, `${w}: the h1 keeps data-page-title`).toBe(true);
      expect(g.label, `${w}: the h1's name`).toBe(`${g.total} ${g.ht}`);
      const o = await noOverflow(page);
      expect(o.doc <= 0 && o.sc <= 0, `${w}: no sideways overflow ${JSON.stringify(o)}`).toBe(true);
    }
  });

  test("N2 · faces: up to 3 with you, 3 with agents, 2 closed, in that order and in the court colours; + more; no key; one line", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const desk = await deskCounts(page);
      const g = await page.evaluate((HD) => {
        const hd = document.querySelector<HTMLElement>(HD)!, row = hd.querySelector<HTMLElement>('[data-qcv="oh-faces"]')!;
        const fs = [...row.querySelectorAll<HTMLElement>('[data-qcv="oh-face"]')];
        const txt = hd.querySelector<HTMLElement>('[data-qcv="oh-text"]')!.getBoundingClientRect();
        return {
          faces: fs.map((f) => { const s = getComputedStyle(f), r = f.getBoundingClientRect(); return { court: f.dataset.court!, bg: s.backgroundColor, w: r.width, h: r.height, x: r.left, y: r.top, z: Number(s.zIndex), hidden: f.getAttribute("aria-hidden"), shadow: s.boxShadow, initials: f.textContent ?? "" }; }),
          more: row.querySelector<HTMLElement>('[data-qcv="oh-more"]')?.textContent ?? null, label: row.getAttribute("aria-label") ?? "",
          key: hd.querySelectorAll('[class*="key"], [data-qcv*="key"]').length, rowR: row.getBoundingClientRect().right, txtR: txt.right,
          hn: Number(hd.querySelector<HTMLElement>('[data-qcv="oh-hn"]')!.textContent), page: getComputedStyle(document.documentElement).getPropertyValue("--ws-page").trim(),
        };
      }, HD);
      expect(Number.isFinite(desk.you) && Number.isFinite(desk.agent) && Number.isFinite(desk.closed), `${w}: the desk's counts were read ${JSON.stringify(desk)}`).toBe(true);
      const want = [...Array(Math.min(3, desk.you)).fill("you"), ...Array(Math.min(3, desk.agent)).fill("agent"), ...Array(Math.min(2, desk.closed)).fill("closed")];
      expect(g.faces.length, `${w}: faces drawn`).toBeGreaterThan(0);
      expect(g.faces.map((f) => f.court), `${w}: the groups, in order, each up to its cap and no further`).toEqual(want);
      for (const f of g.faces) {
        expect(f.bg, `${w}: a ${f.court} disc's colour`).toBe(FACE_BG[f.court]);
        expect(Math.abs(f.w - (wide(w) ? 38 : 32)) <= 0.5 && Math.abs(f.h - f.w) <= 0.5, `${w}: a disc is ${f.w} × ${f.h}`).toBe(true);
        expect(f.hidden, `${w}: discs are aria-hidden`).toBe("true");
        expect(f.shadow, `${w}: the 3px halo`).toMatch(/0px 0px 0px 3px/);
        expect(f.initials.length, `${w}: initials "${f.initials}"`).toBeGreaterThan(0);
      }
      for (let i = 1; i < g.faces.length; i++) {
        expect(Math.abs(g.faces[i - 1].x + g.faces[i - 1].w - g.faces[i].x - (wide(w) ? 7 : 5)), `${w}: disc ${i} overlaps the one before`).toBeLessThanOrEqual(0.6);
        expect(g.faces[i].z, `${w}: earlier discs sit on top`).toBeLessThan(g.faces[i - 1].z);
        expect(Math.abs(g.faces[i].y - g.faces[0].y), `${w}: one line`).toBeLessThanOrEqual(0.5);
      }
      const shown = g.faces.length;
      if (g.hn > shown) expect(g.more, `${w}: + more`).toBe(`+${g.hn - shown} more`); else expect(g.more, `${w}: no "+ more" when every query is shown`).toBeNull();
      expect(g.label, `${w}: the row's one sentence`).toBe(`${shown} of ${g.hn} queries shown: ${want.filter((c) => c === "you").length} with you, ${want.filter((c) => c === "agent").length} with agents, ${want.filter((c) => c === "closed").length} closed`);
      expect(g.key, `${w}: no key`).toBe(0);
      expect(g.rowR, `${w}: the row stays inside the text block (${g.rowR} / ${g.txtR})`).toBeLessThanOrEqual(g.txtR + 0.5);
      const o = await noOverflow(page);
      expect(o.doc <= 0 && o.sc <= 0, `${w}: no sideways overflow ${JSON.stringify(o)}`).toBe(true);
      console.log(`[N2] ${w}: desk ${JSON.stringify(desk)} · faces ${g.faces.map((f) => f.court).join(",")} · ${g.more}`);
    }
  });

  test("N3 · faces spacing: 16 under the subheader, 22 above the buttons; a disc's popup is the agent's name; a click opens that query", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const g = await page.evaluate((HD) => {
        const hd = document.querySelector<HTMLElement>(HD)!;
        const R = (s: string) => hd.querySelector<HTMLElement>(s)!.getBoundingClientRect();
        const sub = R('[data-qcv="oh-sub"]'), row = R('[data-qcv="oh-faces"]'), b1 = R('[data-qcv="oh-log"]');
        return { above: row.top - sub.bottom, below: b1.top - row.bottom };
      }, HD);
      expect(Math.abs(g.above - 16), `${w}: subheader → faces ${g.above}`).toBeLessThanOrEqual(2);
      expect(Math.abs(g.below - 22), `${w}: faces → buttons ${g.below}`).toBeLessThanOrEqual(2);
      const faces = page.locator(`${HD} [data-qcv="oh-face"]`);
      const n = await faces.count();
      expect(n, `${w}: faces to press`).toBeGreaterThan(0);
      /* the popup: the list's own (`data-qcv="tip"`), titled with the agent's name */
      for (const i of [0, n - 1]) {
        const f = faces.nth(i);
        const name = (await f.getAttribute("data-tip")) ?? "", line = (await f.getAttribute("data-tl")) ?? "", court = (await f.getAttribute("data-court")) ?? "";
        expect(name.length, `${w}: face ${i} names an agent`).toBeGreaterThan(0);
        await f.hover();
        const tip = page.locator('[data-qcv="tip"].on');
        await expect(tip, `${w}: face ${i}'s popup`).toBeVisible({ timeout: 2000 });
        expect(await tip.locator("b").innerText(), `${w}: the popup's title is the agent's name`).toBe(name);
        expect(await tip.locator("span").innerText(), `${w}: the popup's line`).toBe(line);
        expect(line, `${w}: the line ends with the court`).toMatch(new RegExp(` · ${court === "you" ? "with you" : court === "agent" ? "with agents" : "closed"}$`));
        expect(await f.getAttribute("title"), `${w}: no native title`).toBeNull();
        await page.mouse.move(4, 4);
      }
      /* a click opens THAT query's card (the one a row opens), never the agent card */
      const f0 = faces.first();
      const qid = (await f0.getAttribute("data-qid")) ?? "", name = (await f0.getAttribute("data-tip")) ?? "";
      await f0.click();
      const card = page.locator('[data-qcv="qm-card"]');
      await expect(card, `${w}: the query's card opened`).toBeVisible({ timeout: 8000 });
      expect(new URL(page.url()).searchParams.get("q"), `${w}: the URL names the query`).toBe(qid);
      expect(await card.innerText(), `${w}: the card is ${name}'s`).toContain(name.split(" ")[0]);
      expect(await page.locator('[data-ac="card"]').filter({ visible: true }).count(), `${w}: the agent card did not open`).toBe(0);
      await page.keyboard.press("Escape");
      await expect(card).toHaveCount(0, { timeout: 8000 });
    }
  });
});

const COURT_C: Record<string, string> = { you: "rgb(176, 96, 62)", agent: "rgb(61, 80, 112)", closed: "rgb(124, 113, 104)" };
const COURT_WORDS: Record<string, string> = { you: "with you", agent: "with agents", closed: "closed" };
const readDesk = (page: Page) => page.evaluate(() => {
  const desk = document.querySelector<HTMLElement>('[data-qcv="courts"]')!;
  const cards = [...desk.querySelectorAll<HTMLElement>('[data-qcv="court"]')];
  const R = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  return {
    v: desk.dataset.v, stamps: desk.querySelectorAll('[data-qcv="court-stamp"], .qc131-stamp, [class*="stamp"]').length,
    oldTrend: desk.querySelectorAll('[data-qcv="trend-hit"], [data-qcv="trend-tip"], .qc131-plot, [data-qcv="court-name"]').length,
    deskBg: getComputedStyle(desk).backgroundColor, deskShadow: getComputedStyle(desk).boxShadow,
    cards: cards.map((c) => {
      const cs = getComputedStyle(c), disc = c.querySelector<HTMLElement>('[data-qcv="court-disc"]'), ds = disc ? getComputedStyle(disc) : null;
      const words = c.querySelector<HTMLElement>('[data-qcv="court-words"]'), fig = c.querySelector<HTMLElement>('[data-qcv="court-count"]');
      const mom = c.querySelector<HTMLElement>('[data-qcv="court-mom"]'), svg = c.querySelector<SVGSVGElement>('[data-qcv="court-trend"]'), line = c.querySelector<SVGPathElement>('[data-qcv="trend-line"]');
      const chart = c.querySelector<HTMLElement>('[data-qcv="court-chart"]'), cap = c.querySelector<HTMLElement>('[data-qcv="trend-cap"]');
      const after = getComputedStyle(c, "::after");
      return {
        key: c.dataset.court!, box: R(c), bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
        label: c.getAttribute("aria-label") ?? "", pressed: c.querySelector('[data-qcv="court-pick"]')?.getAttribute("aria-pressed"),
        disc: disc ? { box: R(disc), bg: ds!.backgroundColor, shadow: ds!.boxShadow, hidden: disc.getAttribute("aria-hidden"), icon: disc.querySelector("svg") ? R(disc.querySelector("svg")!) : null, stroke: disc.querySelector("svg") ? getComputedStyle(disc.querySelector("svg")!).stroke : "" } : null,
        words: words?.textContent ?? "", wordsFace: words ? getComputedStyle(words).fontFamily : "", wordsSize: words ? parseFloat(getComputedStyle(words).fontSize) : 0, /* one line: the paragraph is no taller than its tallest glyph run, the 34px figure's own line box */
        wordsLines: words && fig ? Math.round(words.offsetHeight / (parseFloat(getComputedStyle(fig).fontSize) * 1.15)) : 0,
        figure: fig?.textContent ?? "", figSize: fig ? parseFloat(getComputedStyle(fig).fontSize) : 0,
        tiles: [...c.querySelectorAll<HTMLElement>('[data-qcv="court-line"]')].map((l) => { const t = l.querySelector<HTMLElement>('[data-qcv="court-tile"]')!, ts = getComputedStyle(t); return { n: t.textContent ?? "", text: l.querySelector<HTMLElement>('[data-qcv="court-label"]')?.textContent ?? "", hot: l.dataset.hot === "true", bg: ts.backgroundColor, color: ts.color, h: t.getBoundingClientRect().height }; }),
        mom: mom ? { text: mom.textContent ?? "", dir: mom.dataset.dir ?? "", delta: Number(mom.dataset.delta), color: getComputedStyle(mom).color, arrow: mom.querySelector("svg") ? { w: mom.querySelector("svg")!.getBoundingClientRect().width, fill: getComputedStyle(mom.querySelector("svg path")!).fill } : null, size: parseFloat(getComputedStyle(mom).fontSize), b: mom.getBoundingClientRect().bottom } : null,
        svgs: c.querySelectorAll('[data-qcv="court-chart"] svg').length, svg: svg ? R(svg) : null, values: (svg?.dataset.values ?? "").split(",").filter(Boolean).map(Number),
        vertices: (line?.getAttribute("d") ?? "").split(/[ML]/).filter(Boolean).length, stroke: line ? getComputedStyle(line).stroke : "", strokeW: line ? getComputedStyle(line).strokeWidth : "",
        chartHidden: chart?.getAttribute("aria-hidden"), cap: cap?.textContent ?? "", capB: cap ? cap.getBoundingClientRect().bottom : 0,
        afterBg: after.backgroundColor, afterH: after.height, afterL: after.left, afterR: after.right, afterContent: after.content,
      };
    }),
  };
});

test.describe("Query Centre v134 — the icon desk cards", () => {
  test("K1 · desk shape: three white cards, a court-coloured disc 28 (24) above each, no stamp; selected is the court's ring and foot bar", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const d = await readDesk(page);
      expect(d.cards.map((c) => c.key), `${w}: three cards`).toEqual(["you", "agent", "closed"]);
      expect(d.stamps, `${w}: no stamp element in the desk`).toBe(0);
      expect(d.oldTrend, `${w}: no title row, trend plot or trend tooltip`).toBe(0);
      expect(d.deskBg === "rgba(0, 0, 0, 0)" && d.deskShadow === "none", `${w}: the grid has no surface`).toBe(true);
      const gap = wide(w) ? 24 : 16;
      for (let i = 1; i < 3; i++) expect(Math.abs(d.cards[i].box.x - d.cards[i - 1].box.r - gap), `${w}: gap ${d.cards[i].box.x - d.cards[i - 1].box.r}`).toBeLessThanOrEqual(1);
      for (const c of d.cards) {
        expect(c.bg, `${w} ${c.key}: the card is white`).toBe("rgb(255, 255, 255)");
        expect(c.radius, `${w} ${c.key}: radius`).toBe("16px");
        expect(c.pad, `${w} ${c.key}: padding`).toBe(wide(w) ? "50px 24px 16px 24px" : "42px 18px 16px 18px");
        expect(c.shadow, `${w} ${c.key}: the hairline ring`).toMatch(/rgba\(28, 19, 15, 0\.09\) 0px 0px 0px 1px/);
        expect(c.disc, `${w} ${c.key}: a disc`).not.toBeNull();
        expect(Math.abs(c.box.y - c.disc!.box.y - (wide(w) ? 28 : 24)), `${w} ${c.key}: the disc's top is ${c.box.y - c.disc!.box.y} above the card`).toBeLessThanOrEqual(2);
        expect(Math.abs(c.disc!.box.x - c.box.x - (wide(w) ? 22 : 16)), `${w} ${c.key}: the disc's left`).toBeLessThanOrEqual(1);
        expect(Math.abs(c.disc!.box.w - (wide(w) ? 64 : 54)), `${w} ${c.key}: the disc is ${c.disc!.box.w}`).toBeLessThanOrEqual(0.5);
        expect(c.disc!.bg, `${w} ${c.key}: the disc is the court's colour`).toBe(COURT_C[c.key]);
        expect(c.disc!.shadow, `${w} ${c.key}: the 5px halo`).toMatch(/0px 0px 0px 5px/);
        expect(c.disc!.hidden, `${w} ${c.key}: the disc is aria-hidden`).toBe("true");
        expect(c.disc!.icon && Math.abs(c.disc!.icon.w - (wide(w) ? 46 : 38)) <= 0.5, `${w} ${c.key}: the icon is ${c.disc!.icon?.w}`).toBe(true);
        expect(c.disc!.stroke, `${w} ${c.key}: a cream icon`).toBe("rgb(244, 238, 229)");
        expect(c.pressed, `${w} ${c.key}: nothing selected at rest`).toBe("false");
      }
      const tops = d.cards.map((c) => Math.round(c.box.y)), bottoms = d.cards.map((c) => Math.round(c.box.b));
      expect(new Set(tops).size === 1 && new Set(bottoms).size === 1, `${w}: one row, one height (${tops} / ${bottoms})`).toBe(true);
      /* selected: the inset ring and the foot bar, in the court's colour */
      await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click();
      await page.waitForTimeout(350);
      const s = (await readDesk(page)).cards[1];
      expect(s.pressed, `${w}: With agents is pressed`).toBe("true");
      expect(s.shadow, `${w}: the 1.5px inset ring in the court colour`).toMatch(/rgb\(61, 80, 112\) 0px 0px 0px 1\.5px inset/);
      expect(s.afterBg, `${w}: the foot bar's colour`).toBe(COURT_C.agent);
      expect(s.afterH, `${w}: the foot bar is 3px`).toBe("3px");
      expect(s.afterL === (wide(w) ? "24px" : "18px") && s.afterR === s.afterL, `${w}: the bar is inset ${s.afterL} / ${s.afterR}`).toBe(true);
      await page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="court-pick"]').click();
      await page.waitForTimeout(250);
      const o = await noOverflow(page);
      expect(o.doc <= 0 && o.sc <= 0, `${w}: no sideways overflow ${JSON.stringify(o)}`).toBe(true);
    }
  });

  test("K2 · desk content: the line and its figure, v131.1's two tiles, and a neutral month-on-month", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const d = await readDesk(page);
      const dirs: Record<string, number> = {};
      for (const c of d.cards) {
        expect(c.figure, `${w} ${c.key}: a figure`).toMatch(/^\d+$/);
        expect(c.words, `${w} ${c.key}: the line`).toBe(`${c.figure}${COURT_WORDS[c.key]}`);
        expect(c.wordsFace, `${w} ${c.key}: Special Elite`).toMatch(/Special Elite/);
        expect(Math.abs(c.wordsSize - (wide(w) ? 21 : 17)) <= 0.5 && Math.abs(c.figSize - (wide(w) ? 34 : 28)) <= 0.5, `${w} ${c.key}: ${c.wordsSize} / ${c.figSize}`).toBe(true);
        expect(c.wordsLines, `${w} ${c.key}: the line is one line`).toBe(1);
        /* the two tiles, as v131.1 built them */
        expect(c.tiles.length, `${w} ${c.key}: two tiled lines`).toBe(2);
        expect(c.tiles.reduce((n, t) => n + Number(t.n), 0), `${w} ${c.key}: the tiles do not exceed the figure`).toBeLessThanOrEqual(Number(c.figure));
        for (const t of c.tiles) {
          expect(Math.abs(t.h - 26), `${w} ${c.key}: a tile is ${t.h} tall`).toBeLessThanOrEqual(0.5);
          if (t.hot) expect(t.color === "rgb(162, 69, 42)" && t.bg === "rgb(246, 221, 210)", `${w} ${c.key}: a hot tile is rust on blush (${t.color} on ${t.bg})`).toBe(true);
          else if (Number(t.n) === 0) expect(t.bg, `${w} ${c.key}: a zero is the muted tile`).toBe("rgb(241, 238, 233)");
          else expect(t.color, `${w} ${c.key}: a plain tile is the court's colour`).toBe(COURT_C[c.key]);
        }
        /* month on month: the words follow the figure, and the colour is ink at 58% whichever way it points */
        const m = c.mom!;
        expect(m, `${w} ${c.key}: a month-on-month line`).not.toBeNull();
        expect(Number.isFinite(m.delta), `${w} ${c.key}: the figure was published`).toBe(true);
        expect(m.dir, `${w} ${c.key}: the direction follows the figure`).toBe(m.delta > 0 ? "up" : m.delta < 0 ? "down" : "none");
        expect(m.text, `${w} ${c.key}: the words`).toBe(m.delta === 0 ? "No change since last month" : `${Math.abs(m.delta)} since last month`);
        expect(m.color, `${w} ${c.key}: neutral ink 58%, ${m.dir}`).toBe("rgba(28, 19, 15, 0.58)");
        if (m.dir === "none") expect(m.arrow, `${w} ${c.key}: no arrow with no change`).toBeNull();
        else { expect(Math.abs(m.arrow!.w - 11), `${w} ${c.key}: an 11px arrow`).toBeLessThanOrEqual(0.5); expect(m.arrow!.fill, `${w} ${c.key}: the arrow is the line's grey`).toBe("rgba(28, 19, 15, 0.58)"); }
        expect(Math.abs(m.size - (wide(w) ? 14.5 : 13)), `${w} ${c.key}: ${m.size}px`).toBeLessThanOrEqual(0.3);
        dirs[m.dir] = (dirs[m.dir] ?? 0) + 1;
        expect(c.label, `${w} ${c.key}: the card said aloud`).toBe(`${c.figure} ${COURT_WORDS[c.key]}: ${c.tiles.map((t) => `${t.n} ${t.text}`).join(", ")}; ${m.dir === "none" ? "no change" : `${m.dir} ${Math.abs(m.delta)}`} since last month`);
      }
      console.log(`[K2] ${w}: directions ${JSON.stringify(dirs)} · ${d.cards.map((c) => `${c.key} ${c.figure} (${c.mom!.delta})`).join(", ")}`);
    }
  });

  test("K3 · desk chart: one 112 × 38 (84 × 30) svg a card, ten points, the last is the figure, the court's stroke, aria-hidden", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      const d = await readDesk(page);
      for (const c of d.cards) {
        expect(c.svgs, `${w} ${c.key}: one svg`).toBe(1);
        expect(Math.abs(c.svg!.w - (wide(w) ? 112 : 84)) <= 1 && Math.abs(c.svg!.h - (wide(w) ? 38 : 30)) <= 1, `${w} ${c.key}: ${c.svg!.w} × ${c.svg!.h}`).toBe(true);
        expect(c.values.length, `${w} ${c.key}: ten points`).toBe(10);
        expect(c.vertices, `${w} ${c.key}: the line has ten vertices`).toBe(10);
        expect(c.values[9], `${w} ${c.key}: the last point is the card's figure`).toBe(Number(c.figure));
        expect(c.stroke, `${w} ${c.key}: the court's stroke`).toBe(COURT_C[c.key]);
        expect(c.strokeW, `${w} ${c.key}: 1.8px`).toBe("1.8px");
        expect(c.chartHidden, `${w} ${c.key}: the chart is aria-hidden`).toBe("true");
        expect(c.cap, `${w} ${c.key}: the caption`).toMatch(/^[A-Z][a-z]{2} → now$/);
        expect(c.label, `${w} ${c.key}: the card carries the accessible label`).toMatch(/since last month$/);
        expect(Math.abs(c.capB - c.mom!.b), `${w} ${c.key}: the foot's two halves share a bottom line (${c.capB} / ${c.mom!.b})`).toBeLessThanOrEqual(3);
      }
    }
  });
});

const BAND = [251, 249, 245], BLUSH = [243, 221, 210]; /* the band is paper white, --ws-band, since app shell v2 (it was 233, 230, 224) */
const LINES = ["One list to log them all, one list to find them,", "one list to hold your queries and in the darkness mind them."];
/** scroll the page's own scroller so `sel`'s middle sits mid-viewport, and wait for it to settle */
async function centre(page: Page, sel: string) {
  await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(350);
}
const sheet = (page: Page) => page.evaluate(() => { const r = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
/** the painted run of `rgb` along the row at `y`: true when it reaches both of the sheet's edges and stops there */
async function spansSheet(page: Page, y: number, rgb: number[]) {
  const s = await sheet(page);
  const at = async (x: number) => pixel(page, x, y);
  const inL = await at(s.l + 2), inR = await at(s.r - 3), mid = await at((s.l + s.r) / 2 - 300), outL = await at(s.l - 3);
  return { inL, inR, mid, outL, ok: sameRgb(inL, rgb, 3) && sameRgb(inR, rgb, 3) && !sameRgb(outL, rgb, 3), sheet: s };
}

test.describe("Query Centre v134 — the band and the banner", () => {
  test("B1 · band: Recently updated sits on paper white (#fbf9f5; app shell v2), edge to edge of the sheet, 64 (52) under the desk, 72 (64) of tint above and below", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      await centre(page, '[data-qcv="ru"]');
      const g = await page.evaluate(() => {
        const ru = document.querySelector<HTMLElement>('[data-qcv="ru"]')!, cs = getComputedStyle(ru), bf = getComputedStyle(ru, "::before");
        const R = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const desk = Math.max(...[...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((e) => e.getBoundingClientRect().bottom));
        const kids = [ru.querySelector<HTMLElement>('[data-qcv="ru-lede"]')!, ru.querySelector<HTMLElement>('[data-qcv="ru-stage"]')!];
        const feat = ru.querySelector<HTMLElement>('[data-qcv="ru-feat"]'), panel = ru.querySelector<HTMLElement>('[data-qcv="ru-panel"]')!, lede = kids[0];
        return {
          ru: R(ru), desk, beforeBg: bf.backgroundColor, border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
          padT: parseFloat(cs.paddingTop), padB: parseFloat(cs.paddingBottom),
          innerTop: Math.min(...kids.map((k) => k.getBoundingClientRect().top)), innerBottom: Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)),
          /* the section's own R1 geometry: the card's left on the stage's, the panel 150 right, the card 34 down */
          stage: R(kids[1]), panel: R(panel), feat: feat ? R(feat) : null, lede: R(lede),
          ring: feat?.querySelector<HTMLElement>(".qcard") ? getComputedStyle(feat.querySelector<HTMLElement>(".qcard")!).boxShadow : "",
        };
      });
      expect(g.beforeBg, `${w}: the band's colour`).toBe("rgb(251, 249, 245)");
      expect(g.border === "0px" && g.radius === "0px" && g.shadow === "none", `${w}: no border, radius or shadow on the band (${g.border} ${g.radius} ${g.shadow})`).toBe(true);
      expect(Math.abs(g.ru.y - g.desk - (wide(w) ? 64 : 52)), `${w}: desk → band ${g.ru.y - g.desk}`).toBeLessThanOrEqual(2);
      expect(Math.abs(g.padT - (wide(w) ? 72 : 64)) <= 2 && Math.abs(g.padB - (wide(w) ? 72 : 64)) <= 2, `${w}: inner padding ${g.padT} / ${g.padB}`).toBe(true);
      expect(Math.abs(g.innerTop - g.ru.y - g.padT) <= 2 && g.ru.b - g.innerBottom >= g.padB - 2, `${w}: the section starts ${g.innerTop - g.ru.y} inside the band and ends ${g.ru.b - g.innerBottom} above its foot`).toBe(true);
      /* painted: the tint reaches both of the sheet's edges on the band's own rows, and is not above or below it */
      const mid = await spansSheet(page, g.ru.y + g.ru.h / 2, BAND);
      expect(mid.ok, `${w}: the band's painted edges are the sheet's ${JSON.stringify(mid)}`).toBe(true);
      const top = await spansSheet(page, g.ru.y + 4, BAND), bot = await spansSheet(page, g.ru.b - 4, BAND);
      expect(top.ok && bot.ok, `${w}: the band's first and last rows are tinted edge to edge`).toBe(true);
      const above = await pixel(page, mid.sheet.l + 2, g.ru.y - 6), below = await pixel(page, mid.sheet.l + 2, g.ru.b + 6);
      expect(!sameRgb(above, BAND, 3) && !sameRgb(below, BAND, 3), `${w}: plain page above and below the band (${above} / ${below})`).toBe(true);
      /* the section's own layout is unchanged (v132 R1) */
      expect(g.feat, `${w}: a featured card`).not.toBeNull();
      expect(Math.abs(g.feat!.x - g.stage.x), `${w}: the card on the stage's left`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.panel.x - g.stage.x - 150), `${w}: the panel ${g.panel.x - g.stage.x} right`).toBeLessThanOrEqual(1);
      expect(Math.abs(g.feat!.y - g.stage.y - 34), `${w}: the card ${g.feat!.y - g.stage.y} down`).toBeLessThanOrEqual(1);
      expect(g.ring, `${w}: the featured card's outer ring is ink at 10%`).toMatch(/rgba\(28, 19, 15, 0\.1\) 0px 0px 0px 1px/);
      const o = await noOverflow(page);
      expect(o.doc <= 0 && o.sc <= 0, `${w}: no sideways overflow ${JSON.stringify(o)}`).toBe(true);
    }
  });

  const readBanner = (page: Page) => page.evaluate(() => {
    const ban = document.querySelector<HTMLElement>('[data-qcv="banner"]')!, p = ban.querySelector<HTMLElement>("p")!, spans = [...p.querySelectorAll<HTMLElement>("span")];
    const R = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const bf = getComputedStyle(ban, "::before"), af = getComputedStyle(ban, "::after"), ps = getComputedStyle(p);
    const lh = parseFloat(ps.lineHeight);
    const ru = document.querySelector<HTMLElement>('[data-qcv="ru"]')!.getBoundingClientRect();
    const bar = document.querySelector<HTMLElement>('[data-qcv="ws-bar"]')!.getBoundingClientRect();
    const hawk = document.querySelector<HTMLElement>('[data-qcv="ws-hawk"]')!.getBoundingClientRect();
    return {
      tag: ban.tagName, label: ban.getAttribute("aria-label"), box: R(ban), lines: spans.map((s) => ({ text: s.textContent ?? "", rows: Math.round(s.getBoundingClientRect().height / lh), box: R(s), display: getComputedStyle(s).display })),
      beforeBg: bf.backgroundColor, face: ps.fontFamily, size: parseFloat(ps.fontSize), colour: ps.color, align: ps.textAlign, minH: parseFloat(getComputedStyle(ban).minHeight), pad: `${getComputedStyle(ban).paddingTop} ${getComputedStyle(ban).paddingBottom}`,
      arrow: { w: parseFloat(af.width), h: parseFloat(af.height), left: af.left, top: af.top, bg: af.backgroundImage.slice(0, 24) },
      ruB: ru.bottom, barT: bar.top, hawkT: hawk.top, pCx: R(p).x + R(p).w / 2,
    };
  });

  test("B2 · banner: the exact two lines on blush, edge to edge, 56 (48) of page above, no arrow (app shell v2: the flap, SH2 B2), the bar 130 (118) below", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      await centre(page, '[data-qcv="banner"]');
      const g = await readBanner(page);
      expect(g.tag === "SECTION" && g.label === "A note", `${w}: a section labelled "A note" (${g.tag} ${g.label})`).toBe(true);
      expect(g.lines.map((l) => l.text), `${w}: the text, exactly`).toEqual(LINES);
      for (const l of g.lines) { expect(l.display, `${w}: each line is a block`).toBe("block"); expect(l.rows, `${w}: "${l.text.slice(0, 20)}…" is one row`).toBe(1); }
      expect(g.lines[1].box.y, `${w}: two lines`).toBeGreaterThanOrEqual(g.lines[0].box.b - 1);
      expect(g.beforeBg, `${w}: blush`).toBe("rgb(243, 221, 210)");
      expect(g.face, `${w}: Special Elite`).toMatch(/Special Elite/);
      expect(Math.abs(g.size - (wide(w) ? 30 : 24)), `${w}: ${g.size}px`).toBeLessThanOrEqual(0.5);
      expect(g.colour === "rgb(91, 42, 31)" && g.align === "center", `${w}: ${g.colour} ${g.align}`).toBe(true);
      expect(Math.abs(g.minH - (wide(w) ? 136 : 112)) <= 0.5 && g.pad === (wide(w) ? "36px 34px" : "28px 26px"), `${w}: min-height ${g.minH}, padding ${g.pad}`).toBe(true);
      expect(Math.abs(g.box.y - g.ruB - (wide(w) ? 56 : 48)), `${w}: ${g.box.y - g.ruB} of page above the banner`).toBeLessThanOrEqual(2);
      /* app shell v2: 104 (92) + the flap's 26 */
      expect(Math.abs(g.barT - g.box.b - (wide(w) ? 130 : 118)), `${w}: banner → bar ${g.barT - g.box.b}`).toBeLessThanOrEqual(2);
      /* painted edge to edge, with plain page above it */
      const mid = await spansSheet(page, g.box.y + g.box.h / 2, BLUSH);
      expect(mid.ok, `${w}: the banner's painted edges are the sheet's ${JSON.stringify(mid)}`).toBe(true);
      const gapPx = await pixel(page, mid.sheet.l + 2, g.box.y - 20);
      expect(!sameRgb(gapPx, BLUSH, 3) && !sameRgb(gapPx, BAND, 3), `${w}: plain page colour above the banner (${gapPx})`).toBe(true);
      /* RETIRED (app shell v2, 9 Oct): the arrow. The banner's bottom edge is the header sheet's flap, in blush (SH2 B2 measures its
         shape, depth and the absence of a shadow). What is held here is that no arrow is drawn. */
      expect(!(g.arrow.w > 0) && !/svg/.test(g.arrow.bg), `${w}: no arrow (${g.arrow.w} × ${g.arrow.h} ${g.arrow.bg})`).toBe(true);
      const o = await noOverflow(page);
      expect(o.doc <= 0 && o.sc <= 0, `${w}: no sideways overflow ${JSON.stringify(o)}`).toBe(true);
    }
  });

  test("B3 · the flying hawk's top clears the banner's bottom edge by 8px or more", async ({ page }) => {
    for (const [w, h] of SIZES) {
      await openQc(page, w, h);
      await centre(page, '[data-qcv="banner"]');
      const g = await readBanner(page);
      expect(g.hawkT, `${w}: the hawk was measured`).toBeGreaterThan(0);
      expect(g.hawkT - g.box.b, `${w}: the hawk's top ${g.hawkT} against the banner's bottom ${g.box.b}`).toBeGreaterThanOrEqual(8);
      console.log(`[B3] ${w}: the hawk clears the banner by ${(g.hawkT - g.box.b).toFixed(1)}`);
    }
  });

  test("L1 · no jump: the header, the desk cards, the band and the banner are the same boxes loading and loaded", async ({ page }) => {
    const read = () => page.evaluate((HD) => {
      const sc = document.querySelector<HTMLElement>(HD)?.closest<HTMLElement>(".wpg-scroll");
      const y0 = sc ? sc.getBoundingClientRect().top - sc.scrollTop : 0;
      const R = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.left.toFixed(1), y: +(r.top - y0).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
      const hd = document.querySelector<HTMLElement>(HD);
      return {
        loading: !!hd?.hasAttribute("data-loading"),
        parts: {
          header: R(hd), number: R(hd?.querySelector('[data-qcv="oh-hn"]')) && { ...R(hd?.querySelector('[data-qcv="oh-hn"]'))!, w: 0 }, faces: R(hd?.querySelector('[data-qcv="oh-faces"]')) && { ...R(hd?.querySelector('[data-qcv="oh-faces"]'))!, w: 0 },
          buttons: R(hd?.querySelector('[data-qcv="oh-log"]')),
          ...Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((c) => [`card-${c.dataset.court}`, R(c)])),
          band: R(document.querySelector('[data-qcv="ru"]')), banner: R(document.querySelector('[data-qcv="banner"]')),
        } as Record<string, { x: number; y: number; w: number; h: number } | null>,
        cardsLoading: [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].filter((c) => c.dataset.loading === "true").length,
        ruSk: !!document.querySelector('[data-qcv="ru"][data-sk]'),
      };
    }, HD);
    for (const [w, h] of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
      await inkOpen(page, "/queries", w, { height: h, scope: "qc134" });
      await expect(page.locator(`${HD}[data-loading]`), `${w}: the loading header`).toBeVisible();
      await expect(page.locator('[data-qcv="court"][data-loading="true"]').first(), `${w}: the loading desk`).toBeVisible();
      const a = await read();
      await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(900);
      const b = await read();
      expect(a.loading && a.cardsLoading === 3 && a.ruSk, `${w}: measured loading (header ${a.loading}, cards ${a.cardsLoading}, band ${a.ruSk})`).toBe(true);
      expect(!b.loading && b.cardsLoading === 0 && !b.ruSk, `${w}: then loaded`).toBe(true);
      const keys = Object.keys(b.parts);
      expect(keys.length, `${w}: parts measured`).toBeGreaterThanOrEqual(9);
      for (const k of keys) {
        expect(a.parts[k] && b.parts[k], `${w}: ${k} measured in both states`).toBeTruthy();
        for (const d of ["x", "y", "w", "h"] as const) expect(Math.abs(a.parts[k]![d] - b.parts[k]![d]), `${w}: ${k} ${d} ${a.parts[k]![d]} → ${b.parts[k]![d]}`).toBeLessThanOrEqual(1);
      }
      console.log(`[L1] ${w}: ${keys.map((k) => `${k} ${b.parts[k]!.h}`).join(" · ")}`);
    }
  });
});

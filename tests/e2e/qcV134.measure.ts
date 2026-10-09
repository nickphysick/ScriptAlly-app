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

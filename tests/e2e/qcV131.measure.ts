/**
 * Query Centre v131 — QC1…QC15 (QC5 is the unit test `src/lib/qcDeskWeeks.test.ts`), rendered at 1280 /
 * 1440 / 1710 with fonts loaded. Ref design-refs/query-centre/query-centre-v131.html.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV131
 *   INK_MUTATE=<qcN-…> …                         one named break, applied in the page (inkLib.ts)
 *   QC15_CAPTURE=1 against the pre-v131 build    writes the references QC15 compares against
 *
 * Every case asserts its precondition first — the element present, the state asked for — so a probe that
 * finds nothing fails rather than passing vacuously.
 */
import { test, expect, Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { WIDTHS, inkOpen, rect, applyMutation } from "./inkLib";
import { retiredV1311, retiredV132 } from "./inkRetired";
import { openRoute } from "./measure";

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;

async function openQc(page: Page, w: number, scope: string) {
  await inkOpen(page, "/queries", w, { scope });
  /* v131.1 — RE-POINTED: the desk is the ledger cards' ("131.1"); the page is still v131's */
  await expect(page.locator('.qc13 [data-qcv="courts"][data-v^="131"]'), "the v131 desk is on the page").toBeVisible();
  await expect(page.locator('.qcw-list [data-qcv="row"]').first()).toBeVisible();
  await page.waitForTimeout(300);
}

/** The left edge of the first text run inside an element — the TEXT, not the box (a chip pads its box). */
async function textLeft(page: Page, el: import("@playwright/test").Locator): Promise<number> {
  return el.evaluate((root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      if (!(n.textContent || "").trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 0) return b.left;
    }
    return NaN;
  });
}

test.describe("Query Centre v131", () => {
  /* ── QC1 · order ──────────────────────────────────────────────────────────────────────────────── */
  test("QC1 · hero, desk 22 below, Recently updated 44 below, Your queries 44 below; no header on the desk", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w, "qc1");
      const g = await page.evaluate(() => {
        const R = (s: string) => { const e = document.querySelector<HTMLElement>(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom }; };
        const desk = document.querySelector<HTMLElement>('[data-qcv="courts"]')!;
        const prev = desk.previousElementSibling as HTMLElement | null;
        return {
          hero: R('.qc13 [data-probe="page-header"]'), desk: R('[data-qcv="courts"]'), cz: R('[data-qcv="ru"]'), qs: R('[data-qcv="ws-head"]'),
          prevIsHero: !!prev && prev.matches('[data-probe="page-header"]'),
          headers: [...document.querySelectorAll('.qc13 h1, .qc13 h2, .qc13 h3')].filter((h) => h.getBoundingClientRect().top > (document.querySelector('[data-probe="page-header"]')!.getBoundingClientRect().bottom) && h.getBoundingClientRect().bottom <= desk.getBoundingClientRect().top + 1).length,
        };
      });
      expect(g.hero && g.desk && g.cz && g.qs, `${w}: all four parts measured`).toBeTruthy();
      expect(near(g.desk!.t - g.hero!.b, 22), `${w}: desk ${(g.desk!.t - g.hero!.b).toFixed(1)} below the hero`).toBe(true);
      expect(near(g.cz!.t - g.desk!.b, 44), `${w}: Recently updated ${(g.cz!.t - g.desk!.b).toFixed(1)} below the desk`).toBe(true);
      /* v132 §2 — RE-POINTED: the workspace starts 96 below Recently updated (the ref's #ws margin), room for the hawk's 74px rise */
      expect(near(g.qs!.t - g.cz!.b, 96), `${w}: Your queries ${(g.qs!.t - g.cz!.b).toFixed(1)} below Recently updated`).toBe(true);
      expect(g.prevIsHero, `${w}: the desk follows the hero directly`).toBe(true);
      expect(g.headers, `${w}: no heading between the hero and the desk`).toBe(0);
    }
  });

  /* ── QC2 · the hero ───────────────────────────────────────────────────────────────────────────── */
  test("QC2 · the hero card is 178 tall, its pills stacked left of the art, the disc 150", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w, "qc2");
      const card = (await rect(page, '.qc13 [data-probe="page-header"]'))!;
      const p1 = (await rect(page, '.qc13 [data-probe="page-header"] .ph-primary'))!;
      const p2 = (await rect(page, '.qc13 [data-probe="page-header"] .ph-secondary'))!;
      const disc = (await rect(page, '.qc13 [data-probe="band-disc"]'))!;
      expect(card && p1 && p2 && disc, `${w}: the hero's parts measured`).toBeTruthy();
      expect(near(card.h, 178, 2), `${w}: card ${card.h} tall`).toBe(true);
      expect(p2.y, `${w}: the pills are stacked`).toBeGreaterThanOrEqual(p1.b + 9);
      expect(near(p1.h, 40) && near(p2.h, 40), `${w}: 40px pills (${p1.h}, ${p2.h})`).toBe(true);
      expect(Math.max(p1.r, p2.r), `${w}: the pills sit left of the art`).toBeLessThan(disc.x);
      expect(near(disc.w, 150, 2), `${w}: disc ${disc.w} wide`).toBe(true);
    }
  });

  /* ── QC3 · the desk's text ────────────────────────────────────────────────────────────────────── */
  test("QC3 · each section: an eyebrow, a total, exactly two facts on one line each, a date left and a caption right", async ({ page }) => {
    test.skip(true, retiredV1311("the v131 desk's eyebrow, two facts, foot date and caption; v131.1's cards have a name, a stamp and two tiled lines, and no foot", "QC131-1 D2, D3, D4"));
    for (const w of WIDTHS) {
      await openQc(page, w, "qc3");
      const secs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((s) => {
        const facts = [...s.querySelectorAll<HTMLElement>('[data-qcv="court-fact"]')].map((f) => {
          const r = document.createRange(); r.selectNodeContents(f);
          const lines = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size;
          return { text: f.innerText, lines };
        });
        const when = s.querySelector<HTMLElement>('[data-qcv="court-when"]')!.getBoundingClientRect();
        const cap = s.querySelector<HTMLElement>('[data-qcv="court-cap"]')!.getBoundingClientRect();
        return {
          key: s.dataset.court, eyebrow: s.querySelector<HTMLElement>('[data-qcv="court-eyebrow"]')?.innerText ?? "",
          total: s.querySelector<HTMLElement>('[data-qcv="court-count"]')?.innerText ?? "",
          facts, whenText: s.querySelector<HTMLElement>('[data-qcv="court-when"]')!.innerText, whenR: when.right, capL: cap.left,
          capText: s.querySelector<HTMLElement>('[data-qcv="court-cap"]')!.innerText,
        };
      }));
      expect(secs.map((s) => s.key), `${w}: three sections`).toEqual(["you", "agent", "closed"]);
      for (const s of secs) {
        expect(s.eyebrow, `${w} ${s.key}: eyebrow`).toMatch(/^(WITH YOU|WITH THE AGENT|CLOSED)$/);
        expect(s.total, `${w} ${s.key}: total`).toMatch(/^\d+$/);
        expect(s.facts.length, `${w} ${s.key}: two facts`).toBe(2);
        for (const f of s.facts) expect(f.lines, `${w} ${s.key}: "${f.text}" is on ${f.lines} lines`).toBe(1);
        expect(s.whenText, `${w} ${s.key}: the foot's date`).toMatch(/^(OFFER DUE|NEXT DUE|NEXT REPLY DUE|LAST CLOSED) (\d{1,2} [A-Z]{3}|—)$/);
        expect(s.capText.length, `${w} ${s.key}: the caption`).toBeGreaterThan(3);
        expect(s.capL, `${w} ${s.key}: the caption sits right of the date`).toBeGreaterThan(s.whenR);
      }
    }
  });

  /* ── QC4 · the bars ───────────────────────────────────────────────────────────────────────────── */
  test("QC4 · twelve bars a section; the last is this week in full colour; an empty week 2px; the tallest 30", async ({ page }) => {
    test.skip(true, retiredV1311("the twelve weekly bars; v131.1 draws a ten-week running-count trend instead", "QC131-1 D5 (and D6, the unit test of the count)"));
    const FULL: Record<string, string> = { you: "rgb(217, 150, 122)", agent: "rgb(139, 155, 179)", closed: "rgb(181, 172, 164)" };
    let empties = 0;
    for (const w of WIDTHS) {
      await openQc(page, w, "qc4");
      const secs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].map((s) => ({
        key: s.dataset.court!,
        bars: [...s.querySelectorAll<HTMLElement>('[data-qcv="bar"]')].map((b) => ({ n: +b.dataset.n!, h: b.getBoundingClientRect().height, bg: getComputedStyle(b).backgroundColor, now: b.classList.contains("now") })),
      })));
      for (const s of secs) {
        expect(s.bars.length, `${w} ${s.key}: twelve bars`).toBe(12);
        expect(s.bars[11].now, `${w} ${s.key}: the last bar is the current week`).toBe(true);
        expect(s.bars[11].bg, `${w} ${s.key}: this week in full colour`).toBe(FULL[s.key]);
        for (const b of s.bars.slice(0, 11)) expect(b.bg, `${w} ${s.key}: earlier weeks are the 55% tint`).not.toBe(FULL[s.key]);
        for (const b of s.bars.filter((x) => x.n === 0)) { empties += 1; expect(near(b.h, 2, 0.5), `${w} ${s.key}: an empty week is ${b.h}px`).toBe(true); }
        const max = Math.max(...s.bars.map((b) => b.n));
        if (max > 0) expect(near(Math.max(...s.bars.map((b) => b.h)), 30), `${w} ${s.key}: the tallest bar`).toBe(true);
      }
    }
    expect(empties, "an empty week was measured (the precondition for the 2px stub)").toBeGreaterThan(0);
  });

  /* ── QC6 · bar hover ──────────────────────────────────────────────────────────────────────────── */
  test("QC6 · hovering bar i shows its own week and count; the accessible label matches", async ({ page }) => {
    test.skip(true, retiredV1311("the bars' hover tooltip and their list role; the trend's weeks carry the tooltip now", "QC131-1 D5 (its tooltip case)"));
    await openQc(page, 1440, "qc6");
    for (const court of ["you", "agent", "closed"]) {
      for (const i of [2, 7, 10]) {
        const bar = page.locator(`[data-qcv="court"][data-court="${court}"] [data-qcv="bar"]`).nth(i);
        await bar.hover({ force: true });
        await page.waitForTimeout(120);
        const tip = page.locator('[data-qcv="bar-tip"]');
        await expect(tip, `${court} bar ${i}: a tooltip`).toBeVisible();
        const [text, label, n] = [await tip.innerText(), await bar.getAttribute("aria-label"), await bar.getAttribute("data-n")];
        expect(text, `${court} bar ${i}`).toBe(label);
        expect(text).toMatch(new RegExp(`^W/C \\d{1,2} [A-Z]{3} · ${n} `));
        const tb = (await tip.boundingBox())!, bb = (await bar.boundingBox())!;
        expect(tb.y + tb.height, `${court} bar ${i}: the tooltip sits above its bar`).toBeLessThanOrEqual(bb.y);
        expect(near(tb.x + tb.width / 2, bb.x + bb.width / 2, 1), `${court} bar ${i}: centred on it`).toBe(true);
      }
    }
    const hit = await page.locator('[data-qcv="bar"]').first().evaluate((b) => { const s = getComputedStyle(b, "::before"); return { w: parseFloat(s.width), h: parseFloat(s.height) }; });
    expect(hit.w >= 13 && hit.h >= 42, `a bar's hit area is ${hit.w}×${hit.h}`).toBe(true);
    const lists = await page.locator('[data-qcv="court-bars"] [role="list"]').count();
    expect(lists, "each set of bars reads as a list").toBe(3);
  });

  /* ── QC7 · Recently updated ───────────────────────────────────────────────────────────────────── */
  test("QC7 · the title follows the chosen section, the link clears it, and the list does not move", async ({ page }) => {
    test.skip(true, retiredV132("the carousel's title, its \"show recently updated\" line and its clear link; a desk card now sets Recently updated's heading and a second press clears it", "QC132 R2"));
    await openQc(page, 1440, "qc7");
    const title = page.locator('[data-qcv="cz-head-title"]');
    const ids = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].map((r) => r.dataset.id).join(","));
    await expect(title).toHaveText("Recently updated");
    expect(await page.locator('[data-qcv="cz-head-line"]').count(), "no line with nothing chosen").toBe(0);
    const before = await ids();
    expect(before.length, "the list has rows (precondition)").toBeGreaterThan(10);
    /* v131.1 — RE-POINTED: the court is "With agents" on the desk and in the carousel's title */
    for (const [court, name] of [["you", "With you"], ["agent", "With agents"], ["closed", "Closed"]]) {
      await page.locator(`[data-qcv="court"][data-court="${court}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(250);
      await expect(title).toHaveText(name);
      await expect(page.locator('[data-qcv="cz-head-line"]')).toContainText("show recently updated");
      expect(await ids(), `${court}: the list is unchanged`).toBe(before);
    }
    await page.locator('[data-qcv="cz-clear"]').click();
    await expect(title).toHaveText("Recently updated");
  });

  /* ── QC8 · the showing line ───────────────────────────────────────────────────────────────────── */
  test("QC8 · after Find, x is the rendered row count; with nothing narrowed, x = y", async ({ page }) => {
    await openQc(page, 1440, "qc8");
    const read = () => page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-qcv="showing"]')!;
      return { x: +s.dataset.x!, y: +s.dataset.y!, shown: +(s.querySelector("b")?.textContent ?? "NaN"), rows: document.querySelectorAll('.qcw-list [data-qcv="row"]').length };
    });
    const a = await read();
    expect(a.x, "nothing narrowed: x = y").toBe(a.y);
    expect(a.shown, "and the line states it").toBe(a.rows);
    await page.locator('[data-qcv="find"] input').fill("marsh");
    await page.waitForTimeout(400);
    const b = await read();
    expect(b.rows, "Find narrowed the list (precondition)").toBeLessThan(a.rows);
    expect(b.shown, `"marsh": the line says ${b.shown}, the list renders ${b.rows}`).toBe(b.rows);
    expect(b.y, "y stays the manuscript's total").toBe(a.y);
  });

  /* ── QC9 · retirements ────────────────────────────────────────────────────────────────────────── */
  test("QC9 · no blush tray, no anthracite group band, no perched hawk, no banner headline", async ({ page }) => {
    test.skip(true, retiredV132("v131's absences (no blush tray, no anthracite band, no perched hawk, no banner headline); v132 draws the workspace panel, court bands and the flying hawk", "QC132 W1, W4"));
    for (const w of WIDTHS) {
      await openQc(page, w, "qc9");
      const r = await page.evaluate(() => {
        const g = document.querySelector<HTMLElement>(".qc13")!;
        const bgs = [...g.querySelectorAll<HTMLElement>("*")].map((e) => getComputedStyle(e).backgroundColor);
        return {
          blush: bgs.filter((b) => b === "rgb(244, 224, 212)").length,
          anthracite: [...g.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].filter((e) => getComputedStyle(e).backgroundColor === "rgb(42, 58, 82)").length,
          bands: g.querySelectorAll('[data-qcv="gband"]').length,
          hawk: g.querySelectorAll('[data-qcv="lhawk"], img[src*="qc-list-perch"]').length,
          headline: g.innerText.includes("Every query, in one place."),
          moved: g.innerText.includes("Recently moved"),
          counter: /LAST \d+ OF \d+/.test(g.innerText),
        };
      });
      expect(r.bands, `${w}: group headers present (precondition)`).toBeGreaterThan(0);
      expect(r.blush, `${w}: blush surfaces`).toBe(0);
      expect(r.anthracite, `${w}: anthracite group bands`).toBe(0);
      expect(r.hawk, `${w}: the perched hawk`).toBe(0);
      expect(r.headline || r.moved || r.counter, `${w}: a retired sentence`).toBe(false);
    }
  });

  /* ── QC10 · column alignment ──────────────────────────────────────────────────────────────────── */
  test("QC10 · every label's text starts where each row's main text starts (Agent: the name)", async ({ page }) => {
    test.skip(true, retiredV132("the v131 label row inside each group, whose text started on each row's main text", "QC132 W5 (one label row; labels and cells share x-edges)"));
    const COLS: [string, string][] = [
      ["agent", '[data-qcv="row-name"]'], ["queried", '[data-qcv="row-queried"] [data-qcv="row-main"]'],
      ["sent", '[data-qcv="row-sent"] [data-qcv="row-main"]'], ["stand", '[data-qcv="row-stand"] [data-qcv="row-main"]'],
      ["next", '[data-qcv="row-verb"]'],
    ];
    let checked = 0;
    for (const w of WIDTHS) {
      await openQc(page, w, "qc10");
      const groups = page.locator(".qc13-grp");
      for (let g = 0; g < await groups.count(); g++) {
        const grp = groups.nth(g);
        for (const [col, sel] of COLS) {
          const lx = await textLeft(page, grp.locator(`[data-qcv="colh-label"][data-col="${col}"]`));
          const cells = grp.locator(sel);
          const n = Math.min(await cells.count(), 6);
          for (let i = 0; i < n; i++) {
            const cell = cells.nth(i);
            /* the Sent column's main thing is an icon set or a chip — its box, not a text run */
            const x = col === "sent" ? (await cell.boundingBox())!.x : await textLeft(page, cell);
            expect(near(x, lx), `${w} group ${g} ${col} row ${i}: text at ${x.toFixed(1)}, label at ${lx.toFixed(1)}`).toBe(true);
            checked += 1;
          }
        }
      }
    }
    expect(checked, "cells compared").toBeGreaterThan(60);
  });

  /* ── QC11 · sticky labels ─────────────────────────────────────────────────────────────────────── */
  test("QC11 · 400px into the second group, its header is at the scroller's top and the label row right under it", async ({ page }) => {
    test.skip(true, retiredV132("the v131 group header and per-group label row sticking at the scroller's top; v132 has one label row for the panel", "QC132 W5"));
    for (const w of WIDTHS) {
      await openQc(page, w, "qc11");
      const r = await page.evaluate(async () => {
        const sc = document.querySelector<HTMLElement>(".qc13")!.closest<HTMLElement>(".wpg-scroll, #app-stage-scroll, .ws-wbody")!;
        const grp = document.querySelectorAll<HTMLElement>(".qc13-grp")[1];
        if (!grp) return null;
        const top0 = sc.getBoundingClientRect().top;
        sc.scrollTop += grp.getBoundingClientRect().top - top0 + 400;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const gh = grp.querySelector<HTMLElement>('[data-qcv="gband"]')!.getBoundingClientRect();
        const ch = grp.querySelector<HTMLElement>('[data-qcv="colh"]')!.getBoundingClientRect();
        const body = grp.querySelector<HTMLElement>('[data-qcv="gbody"]')!.getBoundingClientRect();
        return { top: sc.getBoundingClientRect().top, gh: gh.top, ghb: gh.bottom, ch: ch.top, bodyBottom: body.bottom, label: grp.querySelector<HTMLElement>('[data-qcv="gband"]')!.innerText };
      });
      expect(r, `${w}: a second group exists`).not.toBeNull();
      expect(r!.bodyBottom, `${w}: the group still runs past the fold (precondition)`).toBeGreaterThan(r!.top + 200);
      expect(near(r!.gh, r!.top), `${w}: "${r!.label}" header at ${r!.gh.toFixed(1)}, scroller top ${r!.top.toFixed(1)}`).toBe(true);
      expect(near(r!.ch, r!.ghb), `${w}: label row at ${r!.ch.toFixed(1)}, header foot ${r!.ghb.toFixed(1)}`).toBe(true);
    }
  });

  /* ── QC12 · chips ─────────────────────────────────────────────────────────────────────────────── */
  test("QC12 · chips are classed from the data, their text starts on the column line, and none wraps", async ({ page }) => {
    test.skip(true, retiredV132("v131's urgency chips in \"Coming up\"; v132's Next move phrase and dated line replace them", "src/lib/qcRowLines.test.ts (nextLine) and QC132 W4–W8"));
    const tally: Record<string, number> = {};
    for (const w of WIDTHS) {
      await openQc(page, w, "qc12");
      const cells = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qc13-list [data-qcv="row-verb"]')].map((c) => {
        const r = document.createRange(); r.selectNodeContents(c);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        const col = c.closest<HTMLElement>('[data-qcv="row-next"]')!.getBoundingClientRect();
        return { tone: c.dataset.tone ?? "", textLeft: rects[0]?.left ?? NaN, lines: new Set(rects.map((x) => Math.round(x.top))).size, colLeft: col.left, bg: getComputedStyle(c).backgroundColor, color: getComputedStyle(c).color };
      }));
      expect(cells.length, `${w}: Coming-up cells`).toBeGreaterThan(5);
      for (const c of cells) {
        tally[c.tone] = (tally[c.tone] ?? 0) + 1;
        expect(["over", "soon", "quiet", "plain"], `${w}: tone "${c.tone}"`).toContain(c.tone);
        expect(c.lines, `${w}: a ${c.tone} cell wraps`).toBe(1);
        expect(near(c.textLeft, c.colLeft), `${w}: a ${c.tone} cell's text at ${c.textLeft.toFixed(1)}, column at ${c.colLeft.toFixed(1)}`).toBe(true);
        if (c.tone === "over") expect([c.bg, c.color]).toEqual(["rgb(248, 224, 216)", "rgb(166, 61, 47)"]);
        if (c.tone === "soon") expect([c.bg, c.color]).toEqual(["rgb(246, 234, 208)", "rgb(122, 90, 18)"]);
        if (c.tone === "plain" || c.tone === "quiet") expect(c.bg).toBe("rgba(0, 0, 0, 0)");
      }
    }
    mkdirSync("reports/query-centre-v131", { recursive: true });
    writeFileSync("reports/query-centre-v131/qc12-tones.json", JSON.stringify(tally, null, 2));
    expect(tally.over ?? 0, "an overdue chip was measured (the margin's precondition)").toBeGreaterThan(0);
  });

  /* ── QC13 · the YOUR MOVE tag ─────────────────────────────────────────────────────────────────── */
  test("QC13 · no YOUR MOVE tag inside Your move; still on a your-move row when grouped by Stage", async ({ page }) => {
    test.skip(true, retiredV132("the YOUR MOVE tag held back inside the Your move group; v132 §3 stamps every with-you row", "QC132 W4 (the bands) and the brief §3"));
    await openQc(page, 1440, "qc13");
    const yours = page.locator('[data-qcv="grp"][data-group="you"]');
    await expect(yours, "a Your move group (precondition)").toHaveCount(1);
    expect(await yours.locator('[data-qcv="row"]').count()).toBeGreaterThan(0);
    expect(await yours.locator('[data-qcv="your-move-tag"]').count(), "tags inside Your move").toBe(0);
    /* the section head first, to the top: scrolled only to its own edge, the Group button sits under the
       fixed Birds-eye tab in the window's bottom-right corner */
    await page.evaluate(() => document.querySelector('[data-qcv="lbanner"]')?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(200);
    await page.locator('[data-qcv="pk-group"]').click();
    await expect(page.locator(".qcv-menu"), "the Group menu opened").toBeVisible();
    await page.getByRole("menuitemradio", { name: "Status" }).or(page.locator(".qcv-menu button", { hasText: "Status" })).first().click();
    await page.waitForTimeout(400);
    expect(await page.locator('[data-qcv="grp"][data-group="you"]').count(), "grouped by Stage now (precondition)").toBe(0);
    const tags = await page.locator('.qcw-list [data-qcv="row"][data-you="true"] [data-qcv="your-move-tag"]').count();
    const yourRows = await page.locator('.qcw-list [data-qcv="row"][data-you="true"]').count();
    expect(yourRows, "your-move rows (precondition)").toBeGreaterThan(0);
    expect(tags, "each your-move row carries the tag when grouped by Stage").toBe(yourRows);
  });

  /* ── QC14 · art slots ─────────────────────────────────────────────────────────────────────────── */
  test("QC14 · the section and group art comes from a slot: a PNG dropped in changes the pixels, no code change", async ({ page }) => {
    test.skip(true, retiredV132("the section and group spot-art slots; v132's bands carry fixed line icons and QcArtSlot is deleted", "QC132 W4"));
    /* a 64×64 solid magenta PNG, served for every spot file */
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAdklEQVR4nO3PQQkAMAzAwPo33Yno4xgEIuAyO/t1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWHHtBp+HSthEAJgAAAABJRU5ErkJggg==", "base64");
    const centre = async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="art-slot"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ spot: e.dataset.spot, art: e.dataset.art })));
    await openQc(page, 1440, "qc14");
    const before = await centre();
    /* v132 §1 — "Recently updated" lost its spot with the carousel; the group headers' slots remain */
    expect(before.length, "art slots on the page").toBeGreaterThanOrEqual(2);
    for (const s of before) expect(s.art, `${s.spot}: an icon until a file exists`).toBe("icon");
    const slot = page.locator(`[data-qcv="art-slot"][data-spot="${before[0].spot}"]`).first();
    const shotA = await slot.screenshot();
    await page.route("**/images/qc/spots/*.png", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png }));
    await openQc(page, 1440, "qc14");
    await page.waitForTimeout(600);
    const shotB = await slot.screenshot();
    const magenta = await page.evaluate(async (b64) => {
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${b64}`; });
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const d = x.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
      return d[0] > 200 && d[1] < 60 && d[2] > 200;
    }, shotB.toString("base64"));
    expect(shotA.equals(shotB), "the pixels changed").toBe(false);
    expect(magenta, "the slot draws the supplied file").toBe(true);
    await page.unroute("**/images/qc/spots/*.png");
  });

  /* ── QC15 · the empty state and the phone ─────────────────────────────────────────────────────── */
  test("QC15 · the empty state is the fix-ups pass's; at 390px the page is the pre-v131 page", async ({ page }) => {
    test.setTimeout(600_000);
    const dir = "reports/query-centre-v131/qc15-ref";
    const shots: Record<string, Buffer> = {};
    await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT: number }).__SA_LH_COUNT = 0; });
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await applyMutation(page, "qc15");
    shots["empty-1440"] = await page.locator('[data-probe="page-header"]').first().screenshot();
    const page2 = await page.context().newPage();
    await openRoute(page2, "/dashboard", { width: 1440, height: 900 });
    await page2.setViewportSize({ width: 390, height: 844 });
    await page2.goto("/queries"); await page2.waitForTimeout(2500);
    await applyMutation(page2, "qc15");
    shots["queries-390"] = await page2.screenshot({ fullPage: true });
    await page2.close();
    if (process.env.QC15_CAPTURE) {
      mkdirSync(dir, { recursive: true });
      for (const [k, v] of Object.entries(shots)) writeFileSync(`${dir}/${k}.png`, v);
      return;
    }
    for (const [k, v] of Object.entries(shots)) {
      const f = `${dir}/${k}.png`;
      expect(existsSync(f), `${f}: capture from the pre-v131 build first (QC15_CAPTURE=1)`).toBe(true);
      expect(Date.now() - statSync(f).mtimeMs, `${f} is older than 12 hours — recapture`).toBeLessThan(12 * 3600e3);
      expect(v.equals(readFileSync(f)), `${k} differs from the pre-v131 page`).toBe(true);
    }
  });

  /* ── QC16 · the list skeleton on desktop ──────────────────────────────────────────────────────── */
  test("QC16 · while loading, the desktop list is the v131 list's frames — header, label row, rows — and none moves when the data lands", async ({ page }) => {
    test.skip(true, retiredV132("the v131 list's loading frames (one group, the five-column label row, eight rows)", "QC132 W10 (Phase 4)"));
    const read = () => page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const R = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const row = vis('.qc13-list [data-qcv="sk-row"], .qcw-list [data-qcv="row"]');
      return {
        v126Rows: document.querySelectorAll('.qcv-row.qcv-row--sk:not(.qc13-rw)').length,
        skRows: document.querySelectorAll('.qc13-list [data-qcv="sk-row"]').length,
        list: R(vis(".qc13-list")),
        desk: R(vis('[data-qcv="courts"]')),
        /* v132 §1 — RE-POINTED: "Recently updated" replaced the carousel, and keeps its frame while loading */
        cz: R(vis('[data-qcv="ru"]')),
        /* the desk's numbers: what a reader can see, painted-over text excluded */
        /* v131.1 — RE-POINTED: the cards state a total, two tiles and a stamp (the facts and the foot retired) */
        deskStated: [...document.querySelectorAll<HTMLElement>('[data-qcv="court-count"], [data-qcv="court-tile"], [data-qcv="court-stamp"]')]
          .filter((e) => getComputedStyle(e).color !== "rgba(0, 0, 0, 0)").map((e) => e.innerText.trim()),
        gh: R(vis(".qc13-list .qc13-gh")),
        colh: R(vis(".qc13-list .qc13-colh")),
        labels: [...(vis(".qc13-list .qc13-colh")?.children ?? [])].map((c) => +c.getBoundingClientRect().left.toFixed(1)),
        row: R(row),
        cells: row ? [...row.querySelectorAll(":scope > .qc13-c")].map((c) => +c.getBoundingClientRect().left.toFixed(1)) : [],
      };
    });
    for (const w of [1280, 1440]) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
      await inkOpen(page, "/queries", w, { scope: "qc16" });
      await expect(page.locator('.qc13-list [data-qcv="sk-row"]').first(), `${w}: the desktop skeleton is drawn`).toBeVisible();
      const sk = await read();
      await expect(page.locator('.qcw-list [data-qcv="row"]').first(), `${w}: the list loaded`).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(900);
      const real = await read();
      expect(sk.skRows, `${w}: eight skeleton rows`).toBe(8);
      expect(sk.v126Rows, `${w}: no v126 skeleton rows on desktop`).toBe(0);
      for (const k of ["gh", "colh", "row"] as const) {
        expect(sk[k] && real[k], `${w}: ${k} measured in both states`).toBeTruthy();
        expect(Math.abs(sk[k]!.h - real[k]!.h), `${w}: ${k} height ${sk[k]!.h} → ${real[k]!.h}`).toBeLessThanOrEqual(1);
        expect(Math.abs(sk[k]!.x - real[k]!.x) <= 1 && Math.abs(sk[k]!.w - real[k]!.w) <= 1, `${w}: ${k} box ${JSON.stringify(sk[k])} → ${JSON.stringify(real[k])}`).toBe(true);
      }
      expect(sk.labels.length, `${w}: five labels`).toBe(5);
      expect(sk.labels.every((x, i) => Math.abs(x - real.labels[i]) <= 1), `${w}: labels ${sk.labels} → ${real.labels}`).toBe(true);
      expect(sk.cells.length, `${w}: five cells`).toBe(5);
      expect(sk.cells.every((x, i) => Math.abs(x - real.cells[i]) <= 1), `${w}: cells ${sk.cells} → ${real.cells}`).toBe(true);
      for (const k of ["list", "desk", "cz"] as const) {
        expect(sk[k] && real[k], `${w}: ${k} measured in both states`).toBeTruthy();
        expect(Math.abs(sk[k]!.y - real[k]!.y) <= 2 && Math.abs(sk[k]!.h - (k === "list" ? sk[k]!.h : real[k]!.h)) <= 2,
          `${w}: ${k} ${JSON.stringify(sk[k])} → ${JSON.stringify(real[k])}`).toBe(true);
      }
      expect(sk.deskStated, `${w}: the desk states no number while loading`).toEqual([]);
      expect(real.deskStated.length, `${w}: the loaded desk states its numbers (3 totals, 6 tiles, 3 stamps)`).toBe(12);
      console.log(`QC16 ${w}: list top ${sk.list?.y} → ${real.list?.y}, carousel h ${sk.cz?.h} → ${real.cz?.h}, desk h ${sk.desk?.h} → ${real.desk?.h}`);
    }
  });
});

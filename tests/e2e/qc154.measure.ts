/**
 * Query Centre v154 — the rendered page against design-refs/query-centre-v154.html, at 1440 and 1920.
 *
 *   M1  the grid and the card: three across, the band, no status word on show, two facts, labels never cut mid-word
 *   M2  the Next box's states, read from every card
 *   M3  hover: the action overlay, the track's draw and its one label, reduced motion
 *   M4  the paperclip pop-up in the first and third columns, never clipped, under the toolbar
 *   M5  the goal chart in the header; the header's height (v153.4: 218)
 *   M6  the sticky toolbar: rest unchanged, mid-scroll in three groups (fade + group label), no sticky headings, the rail
 * Screens, readings and ledgers to reports/qc-v154/. Readings only where the brief gives no number.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, KILL_MOTION_ID } from "./measure";

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
const motionOn = (page: Page) => page.evaluate((id) => document.querySelectorAll("style").forEach((s) => { if (s.textContent?.includes(id)) s.remove(); }), KILL_MOTION_ID);
const scrollTo = (page: Page, y: number) => page.evaluate(([sel, y]) => { const s = document.querySelector<HTMLElement>(sel as string); if (s) s.scrollTop = y as number; }, [SCROLL, y] as const);

test.setTimeout(600_000);
const DIR = "reports/qc-v154";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}
const near = (a: number | null | undefined, b: number, tol = 1) => a != null && Math.abs(a - b) <= tol;

/** every card's box, column, band and facts, and every label that is cut or wrapped */
async function cards(page: Page) {
  return page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)].map((c) => {
    const r = c.getBoundingClientRect();
    const grid = c.parentElement!.getBoundingClientRect();
    const hd = c.querySelector<HTMLElement>("[data-qc154='band']")!;
    const nx = c.querySelector<HTMLElement>("[data-k='next']")!;
    const cut: string[] = [];
    const named: string[] = [];
    c.querySelectorAll<HTMLElement>(".qc154-f > span.qc154-fl, .qc154-f > b, .qc154-f > em, .qc154-nm, .qc154-ag").forEach((e) => {
      const lh = parseFloat(getComputedStyle(e).lineHeight) || 16;
      const who = e.matches(".qc154-nm, .qc154-ag");
      /* the brief's rule for single-line labels is nowrap + ellipsis: a long name or agency may end in one (a reading);
         a fact's label, value or line never may */
      if (e.scrollWidth > e.clientWidth + 1) (who ? named : cut).push(`ellipsis:${e.textContent}`);
      if (e.getBoundingClientRect().height > lh * 1.6) cut.push(`wrapped:${e.textContent}`);
    });
    const vis = [...c.querySelectorAll<HTMLElement>("*")].filter((e) => e.childElementCount === 0 && e.offsetParent && getComputedStyle(e).opacity !== "0" && !e.closest(".qc154-sr,.qc154-act,.qc154-thl"))
      .map((e) => e.textContent?.trim()).filter(Boolean).join(" | ");
    return {
      id: c.dataset.id, status: c.dataset.status, tone: c.dataset.tone, grp: c.closest("section")?.getAttribute("data-k"),
      x: +(r.x - grid.x).toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      band: getComputedStyle(hd).backgroundColor, bandH: +hd.getBoundingClientRect().height.toFixed(1),
      next: nx.dataset.state, nextText: [...nx.children].filter((e) => !e.classList.contains("qc154-act")).map((e) => e.textContent?.trim()).join(" · "),
      hasBar: !!nx.querySelector(".qc154-bar"), nudgeLine: nx.querySelector(".qc154-nl")?.textContent ?? null,
      act: c.querySelector("[data-qc154='act']")?.textContent ?? null, clip: !!c.querySelector("[data-qc154='clip']"),
      word: c.querySelector("[data-qc154='word']")?.textContent ?? null, visible: vis, cut, named,
    };
  }), PAGE);
}

for (const vp of SIZES) {
  test(`v154 M1 grid and card · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M1-${vp.width}`);
    await openQc(page, vp);
    const all = await cards(page);
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/cards-${vp.width}.json`, JSON.stringify(all, null, 1));
    L.check("cards on the page (population)", all.length >= 6, String(all.length));
    const named = all.filter((c) => c.named.length);
    console.log(`reading: card width ${all[0]?.w}px; ${named.length} of ${all.length} names or agencies end in an ellipsis: ${named.map((c) => c.named.join("/")).join("; ")}`);
    writeFileSync(`${DIR}/ellipsis-${vp.width}.json`, JSON.stringify({ cardW: all[0]?.w, named: named.map((c) => ({ id: c.id, named: c.named })) }, null, 1));
    const grid = await page.evaluate((sel) => { const g = document.querySelector<HTMLElement>(`${sel} [data-qc154="grid"]`)!; const s = getComputedStyle(g); return { cols: s.gridTemplateColumns, gap: s.columnGap, w: g.getBoundingClientRect().width }; }, PAGE);
    L.check("three columns, 14px gap", grid.cols.split(" ").length === 3 && grid.gap === "14px", `${grid.cols} · ${grid.gap} · ${grid.w}`);
    const xs = [...new Set(all.map((c) => c.x))];
    L.check("cards sit in three columns", xs.length === 3 || all.length < 3, xs.join(", "));
    for (const c of all) {
      L.check(`${c.id}: no status word on show`, !!c.word && !c.visible.split(" | ").includes(c.word), `${c.word} · ${c.visible.slice(0, 120)}`);
      L.check(`${c.id}: band in the stage tone`, ({ sand: "rgb(239, 231, 218)", rose: "rgb(236, 214, 210)", blue: "rgb(217, 225, 234)", heather: "rgb(231, 214, 220)" } as Record<string, string>)[c.tone ?? ""] === c.band, `${c.tone} ${c.band}`);
      L.check(`${c.id}: no fact cut, nothing wrapped`, c.cut.length === 0, c.cut.join("; ") || "none");
    }
    /* screens: each group at this width */
    const groups = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc1511="group"], ${sel} [data-qc153="fold"]`)].map((g) => g.getAttribute("data-k")), PAGE);
    for (const k of groups) {
      const g = page.locator(`${PAGE} [data-qc1511="group"][data-k="${k}"], ${PAGE} [data-qc153="fold"][data-k="${k}"]`).first();
      await g.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await g.screenshot({ path: `${DIR}/group-${k}-${vp.width}.png` });
    }
    L.done(4);
  });

  test(`v154 M2 Next box states · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M2-${vp.width}`);
    await openQc(page, vp);
    const all = await cards(page);
    const by = (k: string) => all.filter((c) => c.next === k);
    writeFileSync(`${DIR}/next-${vp.width}.json`, JSON.stringify(all.map((c) => ({ id: c.id, grp: c.grp, status: c.status, next: c.next, text: c.nextText, bar: c.hasBar, nudge: c.nudgeLine, act: c.act })), null, 1));
    for (const c of by("over")) {
      L.check(`${c.id} overdue: Next · Response overdue · Send nudge now`, c.nextText === "Next · Response overdue · Send nudge now", c.nextText);
      L.check(`${c.id} overdue: no bar`, !c.hasBar, String(c.hasBar));
      L.check(`${c.id} overdue: sits in Nudge due`, c.grp === "nudge", String(c.grp));
    }
    for (const c of by("wait")) {
      L.check(`${c.id} waiting: Reply expected by · a date`, /^Reply expected by · \d{1,2} [A-Z][a-z]{2}( ’\d\d)?( · )?/.test(c.nextText), c.nextText);
      L.check(`${c.id} waiting: the bar`, c.hasBar, String(c.hasBar));
      L.check(`${c.id} waiting: nothing under the bar, or the planned nudge`, c.nudgeLine === null || /^Nudge on \d/.test(c.nudgeLine), String(c.nudgeLine));
    }
    L.check("no card says 'counts as a pass' or 'Nudge reminder: now'", !all.some((c) => /counts as a pass|Nudge reminder: now/i.test(c.nextText)), "checked");
    L.check("states present (population)", by("wait").length + by("over").length + by("other").length === all.length, `wait ${by("wait").length} · over ${by("over").length} · other ${by("other").length}`);
    for (const k of ["wait", "over", "other"]) {
      const c = by(k)[0];
      if (!c) { L.check(`a ${k} card to screen`, true, "none in the harness"); continue; }
      const el = page.locator(`${PAGE} [data-qc154="card"][data-id="${c.id}"]`);
      await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
      await el.screenshot({ path: `${DIR}/next-${k}-${vp.width}.png` });
    }
    const n = by("wait").find((c) => c.nudgeLine);
    if (n) { const el = page.locator(`${PAGE} [data-qc154="card"][data-id="${n.id}"]`); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${DIR}/next-wait-nudge-${vp.width}.png` }); }
    L.done(2);
  });

  test(`v154 M3 hover · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M3-${vp.width}`);
    await openQc(page, vp);
    await motionOn(page);
    const card = page.locator(`${PAGE} [data-qc154="card"]`).first();
    await card.scrollIntoViewIfNeeded();
    const act = card.locator(".qc154-act");
    L.check("action hidden at rest", (await act.evaluate((e) => getComputedStyle(e).opacity)) === "0", "opacity");
    await card.locator("[data-qc154='facts']").hover(); await page.waitForTimeout(400);
    L.check("hovered: the action shows", (await act.evaluate((e) => getComputedStyle(e).opacity)) === "1", String(await card.locator("[data-qc154='act']").textContent()));
    await card.screenshot({ path: `${DIR}/hover-card-${vp.width}.png` });
    await card.locator("[data-qc154='track']").hover(); await page.waitForTimeout(150);
    const mid = await card.evaluate((c) => ({ act: getComputedStyle(c.querySelector(".qc154-act")!).opacity, lab: getComputedStyle(c.querySelector(".qc154-thl")!).opacity, anim: [...c.querySelectorAll(".qc153-nd, .qc153-ln")].map((e) => getComputedStyle(e).animationName).join(",") }));
    L.check("track hovered: the action hides (fading, under 0.01)", Number(mid.act) < 0.01, mid.act);
    L.check("track hovered: the draw runs", /qc154-pop/.test(mid.anim), mid.anim);
    L.check("track hovered: the label waits for the draw", Number(mid.lab) < 0.5, mid.lab);
    await page.waitForTimeout(1200);
    const end = await card.evaluate((c) => ({ shown: [...c.querySelectorAll<HTMLElement>(".qc154-thl")].filter((e) => getComputedStyle(e).opacity === "1").map((e) => ({ t: e.textContent, inCur: !!e.closest(".qc153-nd--cur") })),
      inside: (() => { const l = c.querySelector(".qc154-thl")!.getBoundingClientRect(); const i = c.querySelector(".qc154-in")!.getBoundingClientRect(); return l.left >= i.left - 0.5 && l.right <= i.right + 0.5 && l.bottom <= i.bottom; })() }));
    L.check("exactly one label, under the current step", end.shown.length === 1 && end.shown[0].inCur, JSON.stringify(end.shown));
    L.check("the label is inside the card", end.inside, String(end.inside));
    await card.screenshot({ path: `${DIR}/hover-track-${vp.width}.png` });
    /* the far-right current step (an offer or a full) keeps its label inside the frame too */
    const right = page.locator(`${PAGE} [data-qc154="card"]:has(.qc153-nd--cur:last-child)`).first();
    if (await right.count()) {
      await right.scrollIntoViewIfNeeded(); await right.locator("[data-qc154='track']").hover(); await page.waitForTimeout(1200);
      const ok = await right.evaluate((c) => { const l = c.querySelector(".qc154-thl")!.getBoundingClientRect(); const i = c.querySelector(".qc154-in")!.getBoundingClientRect(); return { ok: l.right <= i.right + 0.5, l: l.right, i: i.right }; });
      L.check("a last-step label stays inside the frame", ok.ok, JSON.stringify(ok));
      await right.screenshot({ path: `${DIR}/hover-track-last-${vp.width}.png` });
    }
    /* reduced motion: no draw, no pulse, the label at once */
    await page.mouse.move(2, 2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(200);
    await card.scrollIntoViewIfNeeded();
    await card.locator("[data-qc154='track']").hover(); await page.waitForTimeout(60);
    const rm = await card.evaluate((c) => ({ lab: getComputedStyle(c.querySelector(".qc154-thl")!).opacity, anim: [...c.querySelectorAll(".qc153-nd, .qc153-ln")].map((e) => getComputedStyle(e).animationName).filter((n) => n !== "none") }));
    L.check("reduced motion: no animation", rm.anim.length === 0, rm.anim.join(",") || "none");
    L.check("reduced motion: the label shows at once", rm.lab === "1", rm.lab);
    L.done(9);
  });

  test(`v154 M4 paperclip pop-ups · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M4-${vp.width}`);
    await openQc(page, vp);
    const withClip = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)].filter((c) => c.querySelector("[data-qc154='clip']"))
      .map((c) => ({ id: c.dataset.id!, col: Math.round((c.getBoundingClientRect().x - c.parentElement!.getBoundingClientRect().x) / (c.getBoundingClientRect().width + 14)) })), PAGE);
    L.check("cards with materials (population)", withClip.length > 0, String(withClip.length));
    L.check("no clip on a card without materials", await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-qc154="card"]`)].every((c) => !!c.querySelector("[data-qc154='clip']") === !!c.querySelector(".qc1533-clip")), PAGE), "checked");
    for (const col of [0, 2]) {
      const c = withClip.find((x) => x.col === col);
      if (!c) { L.check(`a clipped card in column ${col + 1}`, false, "none"); continue; }
      const card = page.locator(`${PAGE} [data-qc154="card"][data-id="${c.id}"]`);
      await card.scrollIntoViewIfNeeded();
      await scrollTo(page, await page.evaluate(([sel, id]) => { const s = document.querySelector<HTMLElement>(sel)!; const e = document.querySelector<HTMLElement>(`[data-qc154="card"][data-id="${id}"]`)!; return s.scrollTop + e.getBoundingClientRect().top - s.getBoundingClientRect().top - 260; }, [SCROLL, c.id] as const));
      await page.waitForTimeout(250);
      await card.locator(".qc1533-clip").hover(); await page.waitForTimeout(300);
      const r = await page.evaluate(([id, sel]) => {
        const pop = document.querySelector<HTMLElement>(`[data-qc154="card"][data-id="${id}"] [data-qc1533="pop"]`);
        if (!pop) return null;
        const p = pop.getBoundingClientRect();
        const pt = document.elementFromPoint(p.left + p.width / 2, p.top + 12);
        const list = document.querySelector<HTMLElement>(`${sel} [data-qc153="list-column"]`)!.getBoundingClientRect();
        return { l: p.left, r: p.right, t: p.top, b: p.bottom, onTop: !!pt && pop.contains(pt), listL: list.left, listR: list.right, vw: innerWidth, up: pop.hasAttribute("data-up") };
      }, [c.id, PAGE] as const);
      L.check(`column ${col + 1}: the pop-up opens`, !!r, JSON.stringify(r));
      L.check(`column ${col + 1}: nothing paints over it`, !!r && r.onTop, JSON.stringify(r));
      L.check(`column ${col + 1}: inside the window`, !!r && r.l >= 0 && r.r <= r.vw, JSON.stringify(r));
      await page.screenshot({ path: `${DIR}/pop-col${col + 1}-${vp.width}.png`, clip: { x: Math.max(0, (r?.l ?? 0) - 340), y: Math.max(0, (r?.t ?? 0) - 160), width: 720, height: 420 } });
    }
    L.done(4);
  });

  test(`v154 M5 goal chart and header · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M5-${vp.width}`);
    await openQc(page, vp);
    const r = await page.evaluate((sel) => {
      const q = (s: string) => document.querySelector<HTMLElement>(`${sel} ${s}`);
      const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), r: +b.right.toFixed(1) }; };
      const g = q("[data-qc154='goal']");
      return {
        header: box(q("[data-qc1531='header']")), goal: box(g), list: box(q("[data-qc153='list-column']")),
        ring: !!q("[data-qc1531='ring']"), stillInPlay: (q("[data-qc1531='header']")?.textContent ?? "").includes("still in play"),
        headline: q("[data-qc154='goal-headline']")?.textContent, streak: q("[data-qc154='streak']")?.textContent ?? null, line: q("[data-qc154='goal-line']")?.textContent,
        rule: (() => { const h = q("[data-qc154='goal-head']"); return h ? getComputedStyle(h).borderBottom : null; })(),
        bars: [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154='bar']`)].map((b) => `${b.dataset.start}:${b.dataset.count}:${b.dataset.kind}`),
        goalFromWriter: g?.hasAttribute("data-goal-from-writer"),
      };
    }, PAGE);
    writeFileSync(`${DIR}/goal-${vp.width}.json`, JSON.stringify(r, null, 1));
    L.check("the stage ring is gone", !r.ring && !r.stillInPlay, `${r.ring} ${r.stillInPlay}`);
    L.check("headline [n] of [goal] this week", /^\d+ of \d+ this week$/.test(r.headline ?? ""), String(r.headline));
    L.check("streak pill [k]-week streak", r.streak === null || /^\d+-week streak$/.test(r.streak), String(r.streak));
    L.check("encouragement line", /^(One more|\d+ more) keeps the streak going\.$|^Goal met — nice work\.$/.test(r.line ?? ""), String(r.line));
    L.check("2px navy rule under the headline", r.rule === "2px solid rgb(42, 58, 82)", String(r.rule));
    L.check("twenty weeks", r.bars.length === 20, String(r.bars.length));
    L.check("right-aligned to the list's right edge (±1)", near(r.goal?.r, r.list!.r), `${r.goal?.r} · ${r.list?.r}`);
    L.check("header no taller than v153.4's 218", (r.header?.h ?? 999) <= 218.5, String(r.header?.h));
    await page.locator(`${PAGE} [data-qc1531='header']`).screenshot({ path: `${DIR}/header-${vp.width}.png` });
    const bar = page.locator(`${PAGE} [data-qc154='bar'][data-kind='now']`);
    await bar.hover(); await page.waitForTimeout(200);
    const tip = await page.locator(`${PAGE} [data-qc154='goal-tip']`).textContent();
    L.check("a bar's tooltip: w/c [date] · [n] sent", /^w\/c \d{1,2} [A-Z][a-z]{2} · \d+ sent$/.test(tip ?? ""), String(tip));
    const tipIn = await page.evaluate((sel) => { const t = document.querySelector<HTMLElement>(`${sel} [data-qc154='goal-tip']`)!.getBoundingClientRect(); const g = document.querySelector<HTMLElement>(`${sel} [data-qc154='goal']`)!.getBoundingClientRect(); return { ok: t.left >= g.left - 0.5 && t.right <= g.right + 0.5, t: [t.left, t.right], g: [g.left, g.right] }; }, PAGE);
    L.check("this week's tooltip stays inside the chart", tipIn.ok, JSON.stringify(tipIn));
    await page.locator(`${PAGE} [data-qc154='goal']`).screenshot({ path: `${DIR}/goal-hover-${vp.width}.png` });
    L.done(10);
  });

  test(`v154 M6 sticky toolbar · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`M6-${vp.width}`);
    await openQc(page, vp);
    const rest = await page.evaluate((sel) => { const b = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!.getBoundingClientRect(); const f = document.querySelector<HTMLElement>(`${sel} [data-qc153="list-column"] section, ${sel} [data-qc153="fold"]`)!.getBoundingClientRect(); return { barY: b.y, barH: b.height, firstY: f.y }; }, PAGE);
    writeFileSync(`${DIR}/rest-${vp.width}.json`, JSON.stringify(rest, null, 1));
    await page.screenshot({ path: `${DIR}/rest-${vp.width}.png` });
    L.check("at rest the toolbar shows the count", (await page.locator(`${PAGE} [data-qc153="count"]`).getAttribute("data-stuck")) === null, "not stuck");
    const sticky = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} .qc153-sec, ${sel} .qc153-fold, ${sel} .qc153-grp`)].filter((e) => getComputedStyle(e).position === "sticky").length, PAGE);
    L.check("no sticky group headings", sticky === 0, String(sticky));
    const heads = await page.evaluate(([sel, sc]) => { const s = document.querySelector<HTMLElement>(sc)!; return [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154='head']`)].map((h) => ({ label: h.dataset.label, count: h.dataset.count, top: s.scrollTop + h.getBoundingClientRect().top - s.getBoundingClientRect().top })); }, [PAGE, SCROLL] as const);
    /* the scroll at which the strip sticks: its resting offset in the port less its sticky top */
    const stickAt = await page.evaluate(([sel, sc]) => { const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!; return w.getBoundingClientRect().top - document.querySelector<HTMLElement>(sc)!.getBoundingClientRect().top - (parseFloat(getComputedStyle(w).top) || 0); }, [PAGE, SCROLL] as const);
    /* the toolbar's line (its strip's bottom less the 22px fade), from the scrollport's top, read once stuck */
    await scrollTo(page, Math.round(heads[0].top + 200)); await page.waitForTimeout(300);
    const lineFromTop = await page.evaluate(([sel, sc]) => { const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!.getBoundingClientRect(); return w.bottom - 22 - document.querySelector<HTMLElement>(sc)!.getBoundingClientRect().top; }, [PAGE, SCROLL] as const);
    for (const h of heads.slice(0, 3)) {
      /* each heading 30px above the toolbar's line: scrolled past it, so it is the current group */
      await scrollTo(page, Math.round(Math.max(h.top - lineFromTop + 30, stickAt + 4)));
      await page.waitForTimeout(450);
      const st = await page.evaluate((sel) => { const c = document.querySelector<HTMLElement>(`${sel} [data-qc153="count"]`)!; const g = c.querySelector<HTMLElement>("[data-qc154='toolbar-group']")!; const w = document.querySelector<HTMLElement>(`${sel} [data-qc154='toolbar']`)!; return { stuck: c.hasAttribute("data-stuck"), g: g.textContent, op: getComputedStyle(g).opacity, wy: w.getBoundingClientRect().y, bg: getComputedStyle(w).backgroundImage, ff: getComputedStyle(g).fontFamily }; }, PAGE);
      L.check(`mid-scroll in ${h.label}: the toolbar names the group`, st.stuck && st.g === `${h.label}${h.count}` && st.op === "1", JSON.stringify(st));
      L.check(`mid-scroll in ${h.label}: the 22px fade`, st.bg.includes("calc(100% - 22px)"), st.bg.slice(0, 120));
      await page.screenshot({ path: `${DIR}/scroll-${(h.label ?? "").replace(/\W+/g, "-").toLowerCase()}-${vp.width}.png` });
    }
    await scrollTo(page, 0); await page.waitForTimeout(500);
    const back = await page.evaluate((sel) => { const b = document.querySelector<HTMLElement>(`${sel} [data-qc153="bar"]`)!.getBoundingClientRect(); const f = document.querySelector<HTMLElement>(`${sel} [data-qc153="list-column"] section, ${sel} [data-qc153="fold"]`)!.getBoundingClientRect(); return { barY: b.y, barH: b.height, firstY: f.y, stuck: document.querySelector(`${sel} [data-qc153="count"]`)!.hasAttribute("data-stuck"), g: document.querySelector(`${sel} [data-qc154='toolbar-group']`)!.textContent }; }, PAGE);
    L.check("back at the top: the count again, and nothing has moved", !back.stuck && back.g === "" && near(back.barY, rest.barY, 0.5) && near(back.firstY, rest.firstY, 0.5), JSON.stringify({ rest, back }));
    const rail = await page.evaluate((sel) => { const r = document.querySelector<HTMLElement>(`${sel} .qc153-rail`)!; const s = getComputedStyle(r); return { pos: s.position, top: s.top, tall: r.hasAttribute("data-qc154-tall"), h: r.offsetHeight, port: document.querySelector<HTMLElement>(".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll")!.clientHeight }; }, PAGE);
    L.check("rail: sticky 14px under the lip, or scrolling when taller than the port", rail.tall ? rail.pos === "relative" : rail.pos === "sticky", JSON.stringify(rail));
    L.done(6);
  });
}

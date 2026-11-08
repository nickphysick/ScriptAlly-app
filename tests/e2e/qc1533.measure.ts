/**
 * Query Centre v153.3 — the rendered page against design-refs/query-centre-v153-3.html (ref: 19px badge, 13px glyph,
 * 5px over the top and right of a 34px node; a 34px tab centred on the seal).
 *
 *   B1  the arrow badge: a 19px disc, a 13px glyph centred, overhanging the current node 5px right and 5px up; nothing
 *       inside it reaches past its edge.
 * Screens to reports/qc-v153-3/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
export const DIR = "reports/qc-v153-3";
export const PAGE = ".qc151.qc153";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];

export class Ledger {
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

export async function ready(page: Page) {
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(page.locator(`${PAGE} [data-qc153="slip"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

export async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await ready(page);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

for (const vp of SIZES) {
  test(`v153.3 B1 arrow badge · ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const L = new Ledger(`B1-${vp.width}`);
    await openQc(page, vp);
    const b = await page.evaluate((sel) => {
      const r = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height, r: x.right, b: x.bottom }; };
      return [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='arrow']`)].filter((a) => a.getBoundingClientRect().width > 0).map((a) => {
        const cs = getComputedStyle(a);
        const p = a.querySelector("path");
        return { dir: a.dataset.dir, badge: r(a), glyph: r(a.querySelector("svg")), path: r(p), node: r(a.parentElement), bg: cs.backgroundColor, shadow: cs.boxShadow, sw: p?.getAttribute("stroke-width") ?? a.querySelector("svg")?.getAttribute("stroke-width") };
      });
    }, PAGE);
    L.check("population: badges on screen", b.length > 3, `${b.length}`);
    const dirs = new Set(b.map((x) => x.dir));
    L.check("both an in and an out badge measured", dirs.has("in") && dirs.has("out"), [...dirs].join(","));
    for (const x of b.slice(0, 12)) {
      const tag = `${x.dir}@${Math.round(x.badge!.y)}`;
      L.check(`${tag} disc 19px`, Math.abs(x.badge!.w - 19) < 0.5 && Math.abs(x.badge!.h - 19) < 0.5, `${x.badge!.w}×${x.badge!.h}`);
      L.check(`${tag} glyph 13px`, Math.abs(x.glyph!.w - 13) < 0.5 && Math.abs(x.glyph!.h - 13) < 0.5, `${x.glyph!.w}×${x.glyph!.h}`);
      const cx = x.glyph!.x + x.glyph!.w / 2 - (x.badge!.x + x.badge!.w / 2), cy = x.glyph!.y + x.glyph!.h / 2 - (x.badge!.y + x.badge!.h / 2);
      L.check(`${tag} glyph centred`, Math.abs(cx) < 0.6 && Math.abs(cy) < 0.6, `${cx.toFixed(2)}, ${cy.toFixed(2)}`);
      L.check(`${tag} overhangs 5 right, 5 up`, Math.abs(x.badge!.r - x.node!.r - 5) < 0.6 && Math.abs(x.node!.y - x.badge!.y - 5) < 0.6, `right +${(x.badge!.r - x.node!.r).toFixed(2)} · up ${(x.node!.y - x.badge!.y).toFixed(2)}`);
      L.check(`${tag} the glyph's ink stays inside the disc`, x.path!.x >= x.badge!.x && x.path!.y >= x.badge!.y && x.path!.r <= x.badge!.r && x.path!.b <= x.badge!.b, JSON.stringify({ path: x.path, badge: x.badge }));
      L.check(`${tag} stroke 2`, x.sw === "2", String(x.sw));
      L.check(`${tag} soft shadow`, x.shadow.includes("rgba(28, 19, 15, 0.25) 0px 1px 3px"), x.shadow);
      if (x.dir === "in") L.check(`${tag} navy disc`, x.bg === "rgb(42, 58, 82)", x.bg);
    }
    writeFileSync(`${DIR}/badges-${vp.width}.json`, JSON.stringify(b, null, 1));
    L.done(20);
  });
}

/* the badge at 4× zoom, for the report */
test.describe("v153.3 badge zoom", () => {
  test.use({ deviceScaleFactor: 4 });
  for (const vp of SIZES) test(`v153.3 B1 badge at 4× · ${vp.width}`, async ({ page }) => {
    await openQc(page, vp);
    const a = page.locator(`${PAGE} [data-qc153='arrow'][data-dir='in']`).first();
    await a.scrollIntoViewIfNeeded();
    const n = (await a.locator("xpath=..").boundingBox())!;
    await page.screenshot({ path: `${DIR}/badge-4x-${vp.width}.png`, clip: { x: n.x - 14, y: n.y - 14, width: 64, height: 64 } });
  });
});

/*   T1  the paperclip tab: centred on the seal (0 ± 1px), 16px from the longer line, 34 tall; Enter opens it, a click
 *       on it does not open the card; the pop-up above the facts and the next slip, never clipped; it opens upwards
 *       with under 200px below; hovering does not darken it. Slips near the top, middle and bottom of the viewport. */
for (const vp of SIZES) {
  test(`v153.3 T1 paperclip tab · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`T1-${vp.width}`);
    await openQc(page, vp);
    const geo = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='slip']`)].slice(0, 40).map((s) => {
      const t = s.querySelector<HTMLElement>("[data-qc1533='tab']");
      if (!t) return null;
      const r = (e: Element) => e.getBoundingClientRect();
      const seal = r(s.querySelector(".qc153-seal")!), tb = r(t), nm = r(s.querySelector("[data-qc153='name']")!), ag = r(s.querySelector("[data-qc153='agency']")!);
      const nmText = (() => { const rg = document.createRange(); rg.selectNodeContents(s.querySelector("[data-qc153='name']")!); return rg.getBoundingClientRect().right; })();
      const agText = (() => { const rg = document.createRange(); rg.selectNodeContents(s.querySelector("[data-qc153='agency']")!); return rg.getBoundingClientRect().right; })();
      const cs = getComputedStyle(t);
      return { id: s.dataset.id, h: tb.height, dy: (tb.top + tb.height / 2) - (seal.top + seal.height / 2), gap: tb.left - Math.max(nm.right, ag.right), gapInk: tb.left - Math.max(nmText, agText),
        bg: cs.backgroundColor, img: cs.backgroundImage, color: cs.color, label: t.getAttribute("aria-label"), n: t.textContent, tone: s.dataset.tone };
    }).filter(Boolean), PAGE);
    L.check("population: tabs on screen", geo.length >= 8, `${geo.length}`);
    const tones = new Set(geo.map((g) => g!.tone));
    L.check("more than one stage's tab measured", tones.size >= 2, [...tones].join(","));
    const ACC: Record<string, string> = { sand: "rgb(224, 210, 187)", rose: "rgb(221, 185, 177)", blue: "rgb(188, 203, 220)", heather: "rgb(212, 183, 194)" };
    const REST: Record<string, string> = { sand: "rgb(123, 108, 90)", rose: "rgb(124, 101, 96)", blue: "rgb(84, 105, 128)", heather: "rgb(129, 98, 116)" };
    for (const g of geo.slice(0, 14)) {
      L.check(`${g!.id} tab 34 tall`, Math.abs(g!.h - 34) < 0.5, `${g!.h}`);
      L.check(`${g!.id} centred on the seal`, Math.abs(g!.dy) <= 1, `${g!.dy.toFixed(2)}px`);
      L.check(`${g!.id} 16px from the longer line`, Math.abs(g!.gap - 16) <= 1, `box ${g!.gap.toFixed(1)} · ink ${g!.gapInk.toFixed(1)}`);
      L.check(`${g!.id} ${g!.tone} accent and resting ink`, g!.bg === ACC[g!.tone!] && g!.color === REST[g!.tone!], `${g!.bg} · ${g!.color}`);
      L.check(`${g!.id} named "N materials"`, g!.label === `${g!.n} material${g!.n === "1" ? "" : "s"}`, `${g!.label}`);
    }
    writeFileSync(`${DIR}/tabs-${vp.width}.json`, JSON.stringify(geo, null, 1));

    /* hover does not darken: the fill and the ink stay; it lifts 1px */
    const first = page.locator(`${PAGE} [data-qc1533='tab']`).first();
    await first.scrollIntoViewIfNeeded();
    const seal = (e: Element) => e.closest("[data-qc153='slip']")!.querySelector(".qc153-seal")!.getBoundingClientRect().top;
    const rest = await first.evaluate((e) => ({ c: getComputedStyle(e).color, b: getComputedStyle(e).backgroundColor, y: e.getBoundingClientRect().top - e.closest("[data-qc153='slip']")!.querySelector(".qc153-seal")!.getBoundingClientRect().top }));
    void seal;
    await first.hover(); await page.waitForTimeout(250);
    const hov = await first.evaluate((e) => ({ c: getComputedStyle(e).color, b: getComputedStyle(e).backgroundColor, y: e.getBoundingClientRect().top - e.closest("[data-qc153='slip']")!.querySelector(".qc153-seal")!.getBoundingClientRect().top, sw: getComputedStyle(e.querySelector("svg")!).strokeWidth, ts: getComputedStyle(e.querySelector("i")!).getPropertyValue("-webkit-text-stroke-width"), sh: getComputedStyle(e).boxShadow }));
    L.check("hover keeps the fill and the ink (no darker)", hov.c === rest.c && hov.b === rest.b, `${rest.c} → ${hov.c} · ${rest.b} → ${hov.b}`);
    L.check("hover lifts the tab 1px (against its own slip, which lifts too)", Math.abs(rest.y - hov.y - 1) < 0.3, `${(rest.y - hov.y).toFixed(2)}`);
    L.check("hover: icon stroke 1.8, number stroke .25", hov.sw === "1.8px" && hov.ts === "0.25px", `${hov.sw} · ${hov.ts}`);
    L.check("hover deepens the shadow", hov.sh.includes("0px 8px 16px -8px"), hov.sh);
    await page.mouse.move(2, 2); await page.waitForTimeout(200);

    /* three slips: near the top, the middle and the bottom of the viewport */
    const pick = async (where: "top" | "mid" | "bottom") => page.evaluate(([sel, w, h]) => {
      const tabs = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc1533='tab']`)];
            // scroll the first tab with a slip after it so that it sits at the target
      const sc = (() => { let e: HTMLElement | null = tabs[0].parentElement; while (e && !(e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; return e ?? document.scrollingElement as HTMLElement; })();
      const pickT = tabs[Math.min(tabs.length - 3, w === "top" ? 8 : w === "mid" ? 12 : 16)];
      /* the bar pins to the scroller's top once it scrolls: "near the top" is just under it */
      const pinned = sc.getBoundingClientRect().top + (document.querySelector<HTMLElement>(`${sel} [data-qc153='bar']`)?.offsetHeight ?? 0);
      const target = w === "top" ? pinned + 40 : w === "mid" ? h / 2 : h - 70;
      sc.scrollTo({ top: sc.scrollTop + pickT.getBoundingClientRect().top - target, behavior: "instant" as ScrollBehavior });
      return { id: pickT.closest<HTMLElement>("[data-qc153='slip']")!.dataset.id!, info: `scroller ${sc.className} top ${sc.scrollTop} max ${sc.scrollHeight - sc.clientHeight} · tab now ${pickT.getBoundingClientRect().top} · ${tabs.length} tabs` };
    }, [PAGE, where, vp.height] as const);
    for (const where of ["top", "mid", "bottom"] as const) {
      const { id, info } = await pick(where);
      console.log(`pick ${where}: ${info}`);
      await page.waitForTimeout(300);
      const tab = page.locator(`${PAGE} [data-qc153='slip'][data-id='${id}'] [data-qc1533='tab']`);
      const own = await tab.evaluate((e) => { const r = e.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, owner: at && e.contains(at) ? "tab" : (at as HTMLElement)?.className?.toString() ?? "none" }; });
      console.log(`${where}: the tab's centre is owned by ${own.owner}`);
      await page.mouse.move(own.x, own.y); await page.waitForTimeout(300);
      const pop = page.locator(`${PAGE} [data-qc153='slip'][data-id='${id}'] [data-qc1533='pop']`);
      await expect(pop).toBeVisible({ timeout: 4000 });
      const m = await page.evaluate(([sel, sid]) => {
        const slip = document.querySelector<HTMLElement>(`${sel} [data-qc153='slip'][data-id='${sid}']`)!;
        const tb = slip.querySelector<HTMLElement>("[data-qc1533='tab']")!.getBoundingClientRect();
        const pp = slip.querySelector<HTMLElement>("[data-qc1533='pop']")!;
        const pr = pp.getBoundingClientRect();
        // what owns the pop-up's pixels: sample a grid inside it
        let owned = 0, total = 0;
        for (let x = pr.left + 6; x < pr.right - 6; x += (pr.width - 12) / 6) for (let y = pr.top + 6; y < pr.bottom - 6; y += (pr.height - 12) / 5) {
          total++; const e = document.elementFromPoint(x, y); if (e && pp.contains(e)) owned++;
        }
        // clipped by an ancestor?
        let clip: string | null = null;
        for (let e = pp.parentElement; e && e !== document.body; e = e.parentElement) {
          const o = getComputedStyle(e).overflow; if (/hidden|clip|auto|scroll/.test(o)) { const r = e.getBoundingClientRect(); if (pr.left < r.left - 0.5 || pr.right > r.right + 0.5 || pr.top < r.top - 0.5 || pr.bottom > r.bottom + 0.5) { clip = `${e.className} (${o})`; break; } }
        }
        const groups = [...pp.querySelectorAll<HTMLElement>("[data-qc1533='group']")].map((g) => g.querySelector(".qc1533-pgh")!.textContent);
        return { up: pp.hasAttribute("data-up"), below: innerHeight - tb.bottom, popTop: pr.top, popBottom: pr.bottom, tabTop: tb.top, tabBottom: tb.bottom, leftDelta: pr.left - tb.left, owned, total, clip, onScreen: pr.top >= 0 && pr.bottom <= innerHeight, groups, z: getComputedStyle(slip).zIndex, color: getComputedStyle(pp).color };
      }, [PAGE, id] as const);
      L.check(`${where}: the tab sits ${where === "top" ? "near the top" : where === "mid" ? "mid-screen" : "near the foot"}`, where === "top" ? m.tabTop < vp.height * 0.35 : where === "mid" ? Math.abs(m.tabTop - vp.height / 2) < vp.height * 0.2 : m.below < 200, `${m.tabTop.toFixed(0)} of ${vp.height}`);
      L.check(`${where}: the pop-up is wholly on screen`, m.onScreen, `${m.popTop.toFixed(0)}–${m.popBottom.toFixed(0)} of ${vp.height}`);
      L.check(`${where}: it opens ${m.below < 200 ? "upwards" : "below"} (room below ${m.below.toFixed(0)})`, m.up === m.below < 200 && (m.up ? m.popBottom <= m.tabTop - 7 : m.popTop >= m.tabBottom + 7), `up ${m.up}`);
      L.check(`${where}: left-aligned to the tab`, Math.abs(m.leftDelta) < 0.6, `${m.leftDelta.toFixed(2)}`);
      L.check(`${where}: nothing paints over it (facts, the next slip)`, m.owned === m.total, `${m.owned}/${m.total}`);
      L.check(`${where}: no ancestor clips it`, m.clip === null, String(m.clip));
      L.check(`${where}: the slip is raised while it is open`, m.z === "40", m.z);
      L.check(`${where}: its text is ink, not the accent`, m.color === "rgb(28, 19, 15)", m.color);
      L.check(`${where}: groups in order`, m.groups.length > 0 && m.groups[0] !== null, m.groups.join(" | "));
      const sb = (await page.locator(`${PAGE} [data-qc153='slip'][data-id='${id}']`).boundingBox())!;
      const pb = (await pop.boundingBox())!;
      const y0 = Math.max(0, Math.min(sb.y, pb.y) - 20), y1 = Math.min(vp.height, Math.max(sb.y + sb.height, pb.y + pb.height) + 20);
      await page.screenshot({ path: `${DIR}/pop-${where}-${vp.width}.png`, clip: { x: sb.x - 20, y: y0, width: Math.min(sb.width + 40, 900), height: y1 - y0 } });
      await page.mouse.move(2, 2); await page.waitForTimeout(250);
    }

    /* keyboard: focus, Enter opens, Escape closes; a click on the tab never opens the card */
    const k = page.locator(`${PAGE} [data-qc1533='tab']`).nth(1);
    await k.scrollIntoViewIfNeeded();
    await k.focus();
    const focused = await k.evaluate((e) => document.activeElement === e);
    L.check("the tab takes focus", focused, `${focused}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await page.keyboard.press("Enter"); await page.waitForTimeout(200);
    L.check("Enter opens the pop-up", await k.getAttribute("aria-expanded") === "true", `${await k.getAttribute("aria-expanded")}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    L.check("Escape closes it", await k.getAttribute("aria-expanded") === "false", `${await k.getAttribute("aria-expanded")}`);
    await page.keyboard.press(" "); await page.waitForTimeout(200);
    L.check("Space opens it", await k.getAttribute("aria-expanded") === "true", `${await k.getAttribute("aria-expanded")}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await k.click(); await page.waitForTimeout(700);
    const panel = await page.locator("[data-qp='panel']:visible, .spanel:visible").count();
    L.check("a click on the tab does not open the card", panel === 0, `${panel} panels`);
    L.done(80);
  });
}

/*   P1  the rail as chips: one white card (no rim, no inner line); a pill click turns its filter on exactly as the old
 *       radio row did (one on at a time, the list narrows to the pill's count, a second click clears it); the tiles in
 *       their stage colours; drawn chevrons; no proportion bars. */
for (const vp of SIZES) {
  test(`v153.3 P1 chips rail · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`P1-${vp.width}`);
    await openQc(page, vp);
    const R = `${PAGE} [data-qc153='rail']`;
    const frame = await page.evaluate((r) => {
      const a = document.querySelector<HTMLElement>(r)!, cs = getComputedStyle(a), inn = a.firstElementChild as HTMLElement, ics = getComputedStyle(inn);
      const tiles = Object.fromEntries([...a.querySelectorAll<HTMLElement>("[data-qc153='court']")].map((t) => [t.dataset.k, getComputedStyle(t).backgroundColor + " " + getComputedStyle(t).backgroundImage.slice(0, 60) + " r" + getComputedStyle(t).borderRadius]));
      return { pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, shadow: cs.boxShadow, innerBorder: ics.borderTopWidth, bars: a.querySelectorAll(".qc153-pbar").length, chevrons: a.querySelectorAll("[data-qc153='rail-fold'] i svg").length, typed: a.textContent!.includes("⌄"), tiles,
        h5: getComputedStyle(a.querySelector("[data-qc153='rail-fold']")!).fontFamily + " " + getComputedStyle(a.querySelector("[data-qc153='rail-fold']")!).fontSize, sep: getComputedStyle(a.querySelectorAll<HTMLElement>("[data-qc153='rail-sec']")[1]).borderTopColor };
    }, R);
    L.check("one card: no rim padding", frame.pad === "0px", frame.pad);
    L.check("radius 16, white", frame.radius === "16px" && frame.bg === "rgb(255, 255, 255)", `${frame.radius} ${frame.bg}`);
    L.check("the ref's shadow", frame.shadow.startsWith("rgb(227, 213, 201) 0px 0px 0px 1px") && frame.shadow.includes("0px 18px 36px -24px"), frame.shadow);
    L.check("no inner frame line", frame.innerBorder === "0px", frame.innerBorder);
    L.check("no proportion bars", frame.bars === 0, `${frame.bars}`);
    L.check("four drawn chevrons, none typed", frame.chevrons === 4 && !frame.typed, `${frame.chevrons} · typed ${frame.typed}`);
    L.check("headings in the typewriter 15px", /Special Elite/.test(frame.h5) && frame.h5.endsWith("15px"), frame.h5);
    L.check("hairline #f1ebe2 between sections", frame.sep === "rgb(241, 235, 226)", frame.sep);
    L.check("tile With you dusty rose", frame.tiles.you?.startsWith("rgb(236, 214, 210)"), frame.tiles.you);
    L.check("tile With the agent sand", frame.tiles.agent?.startsWith("rgb(239, 231, 218)"), frame.tiles.agent);
    L.check("tile Gone quiet stone", frame.tiles.quiet?.startsWith("rgb(243, 239, 233)"), frame.tiles.quiet);
    L.check("tile Closed striped", /repeating-linear-gradient/.test(frame.tiles.closed ?? ""), frame.tiles.closed);
    L.check("tiles radius 12", Object.values(frame.tiles).every((t) => t.endsWith("r12px")), JSON.stringify(frame.tiles));

    /* the bar's own count: slips in a folded group (Gone quiet, Closed) are not drawn, so they are not counted on the page */
    const slips = async () => Number(await page.locator(`${PAGE} [data-qc153='count'] b`).first().textContent());
    const total = await slips();
    const pills = page.locator(`${R} [data-qc153='quick']:not([disabled])`);
    const n = await pills.count();
    L.check("population: pills that can be pressed", n >= 2, `${n}`);
    const a = pills.nth(0), b = pills.nth(1);
    const aN = Number(await a.getAttribute("data-n")), bN = Number(await b.getAttribute("data-n"));
    await a.click(); await page.waitForTimeout(600);
    L.check("a pill click turns it on", (await a.getAttribute("aria-checked")) === "true", `${await a.getAttribute("aria-checked")}`);
    L.check("the list narrows to the pill's count", (await slips()) === aN, `${await slips()} vs ${aN}`);
    L.check("the header says 1 on", (await page.locator(`${R} [data-qc153='rail-on']`).textContent()) === "1 on", `${await page.locator(`${R} [data-qc153='rail-on']`).textContent()}`);
    const on = await a.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, c: getComputedStyle(e).color }));
    L.check("on: navy, cream text", on.bg === "rgb(42, 58, 82)" && on.c === "rgb(244, 238, 229)", `${on.bg} ${on.c}`);
    const rb = (await page.locator(R).boundingBox())!;
    await page.screenshot({ path: `${DIR}/rail-pill-on-${vp.width}.png`, clip: { x: rb.x - 16, y: Math.max(0, rb.y - 16), width: rb.width + 32, height: Math.min(rb.height + 32, vp.height - Math.max(0, rb.y - 16)) } });
    await b.click(); await page.waitForTimeout(600);
    L.check("one on at a time, as the radio was", (await a.getAttribute("aria-checked")) === "false" && (await b.getAttribute("aria-checked")) === "true", "switched");
    L.check("the list follows the second pill", (await slips()) === bN, `${await slips()} vs ${bN}`);
    await b.click(); await page.waitForTimeout(600);
    L.check("a second click clears it", (await b.getAttribute("aria-checked")) === "false" && (await slips()) === total, `${await slips()} vs ${total}`);
    L.done(18);
  });
}

/*   G1  the group headings, ruled: name (typewriter 21), a glass count chip in the group's colour (26×24 min, radius 7),
 *       a 1px hairline filling the width, the description in italic at the right; centred; no swatch square. */
for (const vp of SIZES) {
  test(`v153.3 G1 ruled headings · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`G1-${vp.width}`);
    await openQc(page, vp);
    const hs = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc153='heading']`)].map((h) => {
      const r = (e: Element | null) => e ? e.getBoundingClientRect() : null;
      const b = h.querySelector("b")!, sm = h.querySelector("small")!, ru = h.querySelector(".qc1533-rule"), em = h.querySelector("em, .qc153-lnk");
      const bc = getComputedStyle(b), sc = getComputedStyle(sm), rc = ru ? getComputedStyle(ru) : null;
      const mid = (x: DOMRect | null) => x ? x.top + x.height / 2 : NaN;
      const hr = r(h)!, br = r(b)!, sr = r(sm)!, rr = r(ru), er = r(em);
      return { name: b.textContent, font: `${bc.fontFamily.split(",")[0]} ${bc.fontSize}`, chip: { w: sr.width, h: sr.height, r: sc.borderRadius, bg: sc.backgroundColor, img: sc.backgroundImage.slice(0, 40), f: `${sc.fontFamily.split(",")[0]} ${sc.fontSize}`, sh: sc.boxShadow },
        rule: rc ? { h: rr!.height, bg: rc.backgroundColor, left: rr!.left - sr.right, right: er ? er.left - rr!.right : hr.right - rr!.right } : null,
        emRight: er ? hr.right - er.right : null, emItalic: em ? getComputedStyle(em).fontStyle : null,
        centred: Math.max(...[br, sr, rr, er].filter(Boolean).map((x) => Math.abs(mid(x as DOMRect) - mid(hr)))), swatch: !!h.querySelector(".qc153-sw"), order: br.right <= sr.left && (!rr || sr.right <= rr.left) && (!rr || !er || rr.right <= er.left) };
    }), PAGE);
    L.check("population: headings", hs.length >= 2, `${hs.length}`);
    for (const h of hs) {
      L.check(`${h.name}: typewriter 21`, /Special Elite/.test(h.font) && h.font.endsWith("21px"), h.font);
      L.check(`${h.name}: glass chip ≥26 wide, 24 tall, radius 7`, h.chip.w >= 25.9 && Math.abs(h.chip.h - 24) < 0.5 && h.chip.r === "7px" && /linear-gradient/.test(h.chip.img), `${h.chip.w}×${h.chip.h} r${h.chip.r} ${h.chip.bg}`);
      L.check(`${h.name}: chip count in the typewriter 13.5`, /Special Elite/.test(h.chip.f) && h.chip.f.endsWith("13.5px"), h.chip.f);
      L.check(`${h.name}: a 1px hairline fills the width`, !!h.rule && Math.abs(h.rule.h - 1) < 0.1 && h.rule.bg === "rgba(28, 19, 15, 0.14)", JSON.stringify(h.rule));
      L.check(`${h.name}: name, count, rule, description in order`, h.order, `${h.order}`);
      L.check(`${h.name}: the description italic, at the right`, h.emRight == null || (h.emRight < 1 && h.emItalic === "italic"), `${h.emRight} ${h.emItalic}`);
      L.check(`${h.name}: all centred`, h.centred < 1.5, `${h.centred.toFixed(2)}`);
      L.check(`${h.name}: no swatch square`, !h.swatch, `${h.swatch}`);
    }
    const first = page.locator(`${PAGE} [data-qc153='heading']`).first();
    const hb = (await first.boundingBox())!;
    await page.screenshot({ path: `${DIR}/heading-${vp.width}.png`, clip: { x: hb.x - 10, y: hb.y - 10, width: hb.width + 20, height: hb.height + 20 } });
    writeFileSync(`${DIR}/headings-${vp.width}.json`, JSON.stringify(hs, null, 1));
    L.done(16);
  });
}

/*   S1  Settings → Preferences carries the Queries card; the picker shows the stored value, a change is stored and
 *       read back after a reload, and the header no longer carries the control. The account's value is put back. */
test("v153.3 S1 the quiet window in Settings", async ({ page }) => {
  const L = new Ledger("S1");
  await openRoute(page, "/account/preferences", { width: 1440, height: 900 });
  const sel = page.locator("#account-quiet-weeks");
  await sel.waitFor({ timeout: 30_000 });
  const card = page.locator("#acct-h-queries").locator("xpath=ancestor::section[1] | ancestor::div[contains(@class,'sc-card')][1]").first();
  const text = await page.locator("main, .acct-page").first().textContent() ?? "";
  L.check("the card is headed Queries", (await page.locator("#acct-h-queries").textContent())?.trim() === "Queries", `${await page.locator("#acct-h-queries").textContent()}`);
  L.check("the label", text.includes("Treat a query as gone quiet after"), "label");
  const help = page.locator(".acct-quiet-help");
  L.check("the helper, muted italic", (await help.textContent()) === "Queries with no reply after this long move to Gone quiet." && (await help.evaluate((e) => getComputedStyle(e).fontStyle)) === "italic", `${await help.textContent()}`);
  const opts = await sel.locator("option").allTextContents();
  L.check("the five choices", JSON.stringify(opts) === JSON.stringify(["2 weeks", "3 weeks", "4 weeks", "6 weeks", "8 weeks"]), opts.join(","));
  const was = await sel.inputValue();
  const other = was === "6" ? "3" : "6";
  await sel.selectOption(other); await page.waitForTimeout(1200);
  await page.reload(); await sel.waitFor({ timeout: 30_000 });
  L.check("a change is stored and read back", (await sel.inputValue()) === other, `${was} → ${await sel.inputValue()}`);
  const cb = await card.boundingBox().catch(() => null);
  await page.screenshot({ path: `${DIR}/settings-1440.png`, ...(cb ? { clip: { x: cb.x - 20, y: Math.max(0, cb.y - 20), width: cb.width + 40, height: cb.height + 40 } } : {}) });
  await sel.selectOption(was); await page.waitForTimeout(1200);
  await page.reload(); await sel.waitFor({ timeout: 30_000 });
  L.check("the account's value is put back", (await sel.inputValue()) === was, `${await sel.inputValue()}`);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await ready(page);
  L.check("the header carries no quiet control", (await page.locator(`${PAGE} [data-qc1531='header'] [data-qc152='quiet-setting']`).count()) === 0, "none");
  const acts = await page.locator(`${PAGE} .qc1531-acts > *`).allTextContents();
  L.check("the action row is the two buttons", JSON.stringify(acts.map((t) => t.trim())) === JSON.stringify(["+ Log a query", "Record a response"]), acts.join(" | "));
  L.done(8);
});

/* the page top, for the report */
for (const vp of SIZES) test(`v153.3 page top · ${vp.width}`, async ({ page }) => {
  await openQc(page, vp);
  await page.screenshot({ path: `${DIR}/page-top-${vp.width}.png` });
});

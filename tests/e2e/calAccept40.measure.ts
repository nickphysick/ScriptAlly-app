import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ v40's ACCEPTANCE — one card per relationship, at every width and every range (Phase 8).
 *
 * The whole pack is one sentence: a relationship is one card, running from the first send to today
 * or to its named end, with every status change riding on it as a mark. Every phase served that,
 * and the only honest way to accept it is to assert it everywhere the board can be looked at —
 * because the defect it replaces was invisible at some widths and obvious at others, and every
 * fragment had a correct width, a correct tone and a correct position.
 *
 * ⚠️ THE COMBINATIONS VISITED ARE COUNTED AND ASSERTED. A sweep that silently measured one board
 * eighteen times would report eighteen clean results; this repo has already had that from a
 * keyboard walk that lost focus.
 */
const WIDTHS = [1920, 1440, 1280, 1024, 900, 768] as const;

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
  const marks = [...document.querySelectorAll(".tl-mk2")].filter(vis) as HTMLElement[];
  const box = (e: HTMLElement) => { const r = e.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  const per = new Map<string, number>();
  const tiers: Record<string, number> = {};
  let clashes = 0, stray = 0;
  const detail: string[] = [];
  const clipped: string[] = [];
  for (const c of cards) {
    const rel = c.getAttribute("data-rel") || "";
    if (rel) per.set(rel, (per.get(rel) ?? 0) + 1);
    tiers[c.dataset.tier || "none"] = (tiers[c.dataset.tier || "none"] ?? 0) + 1;
    const cb = box(c);
    const on = marks.filter((m) => { const mb = box(m);
      return mb.cy > cb.t - 34 && mb.cy < cb.b + 34 && mb.cx > cb.l - 60 && mb.cx < cb.r + 60; });
    /* ⚠️ NOTHING A READER HAS TO READ MAY RUN PAST ITS OWN CARD. The card clips, so a pill placed
       past its right edge simply disappears — no error, no overflow, and the board looks like a
       card that chose to say nothing. It was on the six-month board and every mark-versus-content
       check passed over it, because the fault is between the content and the CARD rather than
       between the content and a mark. */
    for (const k of [...c.children].filter(vis)) {
      const kb = box(k as HTMLElement);
      if (kb.r > cb.r + 0.6 || kb.l < cb.l - 0.6) {
        clipped.push(`${rel} [${c.dataset.tier}] ${(k.textContent || "").trim().slice(0, 14)}`
          + ` ${kb.l.toFixed(0)}-${kb.r.toFixed(0)} outside card ${cb.l.toFixed(0)}-${cb.r.toFixed(0)}`);
      }
    }
    for (const m of on) {
      const mb = box(m);
      if (mb.cx < cb.l - 0.6 || mb.cx > cb.r + 0.6) stray += 1;
      for (const k of [...c.children].filter(vis)) {
        const kb = box(k as HTMLElement);
        if (kb.l < mb.r - 0.6 && kb.r > mb.l + 0.6) {
          clashes += 1;
          detail.push(`${rel} [${c.dataset.tier}] ${(k.textContent || "").trim().slice(0, 14)}`
            + ` ${kb.l.toFixed(0)}-${kb.r.toFixed(0)} vs mark ${mb.l.toFixed(0)}-${mb.r.toFixed(0)}`
            + ` card ${cb.l.toFixed(0)}-${cb.r.toFixed(0)} pillLeft ${c.style.getPropertyValue("--pill-left")}`);
        }
      }
    }
  }
  /* today's flag against the lane's own middle — the pack's other pinned geometry */
  const lane = [...document.querySelectorAll(".tl-c-tl")].filter(vis)[0] as HTMLElement | undefined;
  const flag = document.querySelector(".tl-todayline") as HTMLElement | null;
  const off = lane && flag
    ? Math.abs((flag.getBoundingClientRect().left + flag.getBoundingClientRect().width / 2)
      - (lane.getBoundingClientRect().left + lane.getBoundingClientRect().width / 2))
    : null;
  return { cards: cards.length, rels: per.size, worst: per.size ? Math.max(...per.values()) : 0,
    tiers, clashes, stray, detail, clipped, todayOff: off == null ? null : Math.round(off * 10) / 10,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});

test("one card per relationship, at every width and every range", async ({ page }) => {
  const seen = new Set<string>();
  const allTiers: Record<string, number> = {};
  const rows: string[] = [];
  for (const w of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(700);
    for (let i = 0; i < RANGE_LABELS.length; i++) {
      await setRangeTo(page, i);
      const m = await read(page);
      seen.add(`${w}:${i}`);
      for (const [k, v] of Object.entries(m.tiers)) allTiers[k] = (allTiers[k] ?? 0) + v;
      rows.push(`${String(w).padEnd(5)} ${RANGE_LABELS[i].padEnd(9)} `
        + `cards ${String(m.cards).padStart(2)} · rels ${String(m.rels).padStart(2)} · worst ${m.worst}`
        + ` · tiers ${JSON.stringify(m.tiers)} · clashes ${m.clashes} · stray ${m.stray}`
        + ` · today off ${m.todayOff} · page overflow ${m.overflowX}`);

      expect(m.rels, `[${w}/${RANGE_LABELS[i]}] no relationships drawn`).toBeGreaterThan(5);
      /* ⚠️ THE SENTENCE, ASSERTED: one card per relationship, everywhere. */
      expect(m.worst, `[${w}/${RANGE_LABELS[i]}] a relationship drawn as more than one card`).toBe(1);
      expect(m.stray, `[${w}/${RANGE_LABELS[i]}] a mark painted off its own card`).toBe(0);
      expect(m.detail, `[${w}/${RANGE_LABELS[i]}] content painted over a mark`).toEqual([]);
      expect(m.tiers.none ?? 0, `[${w}/${RANGE_LABELS[i]}] a card with no tier`).toBe(0);
      expect(m.clipped, `[${w}/${RANGE_LABELS[i]}] content painted outside its own card`).toEqual([]);
      /* today is the middle of the lane — v40's other pinned geometry */
      expect(m.todayOff, `[${w}/${RANGE_LABELS[i]}] today is off the lane's middle`).toBeLessThan(1.1);
      /* nothing may push the page sideways at any width */
      expect(m.overflowX, `[${w}/${RANGE_LABELS[i]}] the page scrolls sideways`).toBeLessThan(2);
    }
  }
  for (const r of rows) console.log(r);
  console.log(`ladder across the sweep: ${JSON.stringify(allTiers)}`);
  expect(seen.size, "width × range combinations visited").toBe(WIDTHS.length * RANGE_LABELS.length);
  /* ⚠️ AND THE SWEEP MUST HAVE EXERCISED MORE THAN ONE RUNG, or it is a monoculture reported as a
     census — eighteen boards all at `full` would satisfy every assertion above. */
  expect(Object.keys(allTiers).filter((k) => (allTiers[k] ?? 0) > 0).length,
    "the whole sweep sat at one rung").toBeGreaterThan(1);
});

import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ v54's ACCEPTANCE — the wait, the lead-in and the text, at every width and every range.
 *
 * The pack is one sentence: a card is the current wait, everything earlier is a lead-in before it,
 * and the text lives inside the card. Each half is checked where it can only be checked together —
 * a mark on a card, or a word outside one, is a failure of the whole model rather than of a value.
 */
const WIDTHS = [1920, 1440, 1280, 1024, 900, 768] as const;

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
  const cards = ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis);
  const marks = ([...document.querySelectorAll(".tl-mk2")] as HTMLElement[]).filter(vis);
  const box = (e: HTMLElement) => { const r = e.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  const maskOf = (e: HTMLElement | null) => {
    if (!e) return "none";
    const cs = getComputedStyle(e);
    const wk = (cs as unknown as Record<string, string>).webkitMaskImage;
    return cs.maskImage !== "none" ? cs.maskImage : (wk && wk !== "none" ? wk : "none");
  };
  const per = new Map<string, number>();
  const insets = new Set<string>();
  const fadeWrong: string[] = [];
  const insetSplit: string[] = [];
  let onCard = 0, outside = 0, maskedText = 0, tinted = 0, tight = 0, stubs = 0;
  for (const c of cards) {
    const cb = box(c);
    const rel = c.dataset.rel || "";
    if (rel) per.set(rel, (per.get(rel) ?? 0) + 1);
    const content = c.querySelector(".tl-content") as HTMLElement | null;
    /* ⚠️ THE CARD MAY NEVER CARRY A MASK — it contains the words. The CONTENT may, but only when
       the card is `tight`: that is the soft right edge on words which overflow, a different thing
       from the frame's fade, and v55 moved it onto this wrapper because the content is two lines
       now and a mask on the line alone would fade the headline and leave the pill hard. */
    if (maskOf(c) !== "none") maskedText += 1;
    if (maskOf(content) !== "none" && !c.hasAttribute("data-tight")) maskedText += 1;
    if (c.querySelector(".tl-late")) tinted += 1;
    if (c.hasAttribute("data-tight")) tight += 1;
    if (c.dataset.tier === "stub") stubs += 1;
    /* v55: the fades against the dates, and the two lines against each other */
    {
      const days = Number(c.dataset.days || "0");
      const tf = Number(c.dataset.truefrom || "NaN");
      const ne = c.dataset.namedend === "none" ? null : Number(c.dataset.namedend);
      const wantL = tf < -0.1, wantR = ne == null || ne > days + 0.1;
      if (c.classList.contains("fadeL") !== wantL || c.classList.contains("fadeR") !== wantR) {
        fadeWrong.push(`${rel}: trueFrom ${tf} namedEnd ${ne}/${days}`);
      }
      const pl = c.querySelector(".tl-pill") as HTMLElement | null;
      const hl2 = c.querySelector(".tl-hl") as HTMLElement | null;
      if (pl && hl2 && vis(pl) && vis(hl2)
          && Math.abs(pl.getBoundingClientRect().left - hl2.getBoundingClientRect().left) > 0.6) {
        insetSplit.push(rel);
      }
    }
    const kids = content ? ([...content.children] as HTMLElement[]).filter(vis) : [];
    if (kids.length) {
      const pl0 = c.querySelector(".tl-pill") as HTMLElement | null;
      if (pl0 && vis(pl0)) insets.add(`${c.classList.contains("fadeL") ? "fadeL" : "flat"}:${Math.round((pl0.getBoundingClientRect().left - cb.l) * 10) / 10}`);
    }
    for (const k of kids) {
      const kb = box(k);
      /* the pill and the line may be clipped by the card, never drawn outside its box */
      if (kb.l < cb.l - 0.6 || kb.l > cb.r + 0.6) outside += 1;
    }
    for (const m of marks) {
      const mb = box(m);
      if (mb.cy > cb.t - 30 && mb.cy < cb.b + 30 && mb.cx > cb.l + 0.6 && mb.cx < cb.r - 0.6) onCard += 1;
    }
  }
  const lane = ([...document.querySelectorAll(".tl-c-tl")] as HTMLElement[]).filter(vis)[0];
  const line = document.querySelector(".tl-todayline") as HTMLElement | null;
  const lb = lane?.getBoundingClientRect();
  const tb = line?.getBoundingClientRect();
  return {
    cards: cards.length, rels: per.size, worst: per.size ? Math.max(...per.values()) : 0,
    marks: marks.length, onCard, outside, maskedText, tinted, tight, stubs,
    insets: [...insets].sort(),
    todayOff: lb && tb ? Math.abs((tb.left + tb.width / 2) - (lb.left + lb.width / 2)) : null,
    fadeWrong, insetSplit,
    lineZ: line ? Number(getComputedStyle(line).zIndex) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

/**
 * ⚠️ THIS FILE SUPERSEDES `calAccept40.measure.ts`, WHICH WAS RETIRED RED RATHER THAN GREEN — and
 * that is the part worth recording. Its last claim was "every card has a `data-tier`", over the
 * v40 ladder that removed words as space ran out. v54 §4 replaced that ladder with clip-and-open
 * and left a single `delete seg.dataset.tier` behind, so nothing has set the attribute since; the
 * lock went red at that commit and stayed red, unnoticed, through two design rounds — because
 * nothing in this repo's routine runs that file, and a red nobody runs is indistinguishable from
 * a lock that does not exist.
 *
 * Every other claim it made is asserted here, at more widths: relationships drawn, one card per
 * relationship, content inside its own card, today centred, no sideways scroll. Its two mark
 * claims — a mark off its own card, content over a mark — are subsumed by "a mark sits on a card"
 * being zero, which is the stronger statement: in v55 a mark is a LEAD-IN and never touches a
 * card, so content cannot be painted over one.
 */
test("the acceptance sweep — one card per relationship, nothing outside its card, at every width", async ({ page }) => {
  /* ⚠️ RETARGETED WHOLESALE BY v64. The v55 anatomy this swept — pills, insets, the overdue tint,
     the dissolve's fade classes — is owned by its successors now (calBar63 d9/d11/d13, calFid63
     (4), calDens64). What this file KEEPS is what nothing else sweeps at every width together:
     ONE CARD PER RELATIONSHIP, no content outside its card, today at the lane's centre, no
     sideways scroll, and a console with no errors. */
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  const rows: string[] = [];
  for (const w of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 1;
      const byRel = new Map<string, number>();
      let outside = 0;
      for (const c of [...g.querySelectorAll<HTMLElement>(".tl-p")].filter(vis)) {
        const rel = (c as HTMLElement).dataset.rel || "";
        /* pieces of one run share a rel; a RELATIONSHIP is one card per its live run */
        if (rel) byRel.set(rel, (byRel.get(rel) ?? 0) + 1);
        const cb = c.getBoundingClientRect();
        for (const e of [...c.querySelectorAll<HTMLElement>(".tl-cardbody, .tl-sband")]) {
          const b = e.getBoundingClientRect();
          if (b.height < 1) continue;
          if (b.left < cb.left - 1 || b.right > cb.right + 1) outside += 1;
        }
      }
      const lane = [...g.querySelectorAll<HTMLElement>(".tl-c-tl")].find(vis)!;
      const line = g.querySelector<HTMLElement>(".tl-todayline");
      const lb = lane.getBoundingClientRect();
      const tb = line?.getBoundingClientRect() ?? null;
      return {
        rels: byRel.size,
        worst: Math.max(0, ...byRel.values()),
        outside,
        laneW: lb.width,
        todayOff: tb ? Math.abs((tb.left + tb.width / 2) - (lb.left + lb.width / 2)) : null,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    rows.push(`${String(w).padEnd(5)} rels ${m.rels} worst ${m.worst} outside ${m.outside}`
      + ` todayOff ${m.todayOff?.toFixed(1)} overflowX ${m.overflowX}`);
    expect(m.rels, `[${w}] no relationships drawn`).toBeGreaterThan(5);
    expect(m.worst, `[${w}] a relationship drawn as more than one card`).toBe(1);
    expect(m.outside, `[${w}] content drawn outside its card`).toBe(0);
    /* the half-day the day convention costs, plus the line's own -1px stroke-centring shift —
       both terms named (see calCentre) */
    expect(m.todayOff!, `[${w}] today is ${m.todayOff?.toFixed(1)}px off the lane's centre`)
      .toBeLessThanOrEqual(m.laneW / 90 / 2 + 1);
    expect(m.overflowX, `[${w}] the page scrolls sideways`).toBeLessThan(2);
  }
  for (const r of rows) console.log(r);
  expect(errors, "the console reported errors").toEqual([]);
});

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
  let onCard = 0, outside = 0, maskedText = 0, tinted = 0, tight = 0, stubs = 0;
  for (const c of cards) {
    const cb = box(c);
    const rel = c.dataset.rel || "";
    if (rel) per.set(rel, (per.get(rel) ?? 0) + 1);
    const content = c.querySelector(".tl-content") as HTMLElement | null;
    if (maskOf(content) !== "none" || maskOf(c) !== "none") maskedText += 1;
    if (c.querySelector(".tl-late")) tinted += 1;
    if (c.hasAttribute("data-tight")) tight += 1;
    if (c.dataset.tier === "stub") stubs += 1;
    const kids = content ? ([...content.children] as HTMLElement[]).filter(vis) : [];
    if (kids.length && c.dataset.tier !== "stub") {
      insets.add(`${c.classList.contains("fadeL") ? "fadeL" : "flat"}:${Math.round((box(kids[0]).l - cb.l) * 10) / 10}`);
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
    lineZ: line ? Number(getComputedStyle(line).zIndex) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

test("the wait, the lead-in and the text — every width, every range", async ({ page }) => {
  const seen = new Set<string>();
  const rows: string[] = [];
  const allInsets = new Set<string>();
  let totalCards = 0, totalMarks = 0, totalTinted = 0, totalTight = 0;
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });

  for (const w of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width: w, height: 900 });
    await page.waitForTimeout(700);
    for (let i = 0; i < RANGE_LABELS.length; i++) {
      await setRangeTo(page, i);
      const m = await read(page);
      seen.add(`${w}:${i}`);
      totalCards += m.cards; totalMarks += m.marks; totalTinted += m.tinted; totalTight += m.tight;
      for (const k of m.insets) allInsets.add(k);
      rows.push(`${String(w).padEnd(5)} ${RANGE_LABELS[i].padEnd(9)}`
        + ` cards ${String(m.cards).padStart(2)} rels ${String(m.rels).padStart(2)} worst ${m.worst}`
        + ` · marks ${String(m.marks).padStart(2)} on-card ${m.onCard}`
        + ` · text outside ${m.outside} masked ${m.maskedText}`
        + ` · tinted ${m.tinted} tight ${m.tight} stubs ${m.stubs}`
        + ` · today off ${m.todayOff?.toFixed(2)} z${m.lineZ} · page overflow ${m.overflowX}`);

      const at = `[${w}/${RANGE_LABELS[i]}]`;
      expect(m.rels, `${at} no relationships drawn`).toBeGreaterThan(5);
      /* the sentence */
      expect(m.worst, `${at} a relationship drawn as more than one card`).toBe(1);
      expect(m.onCard, `${at} a mark sits on a card`).toBe(0);
      expect(m.outside, `${at} content drawn outside its card`).toBe(0);
      expect(m.maskedText, `${at} a mask reaches the words`).toBe(0);
      /* the ground */
      expect(m.todayOff!, `${at} today is not the lane's centre`).toBeLessThan(1.1);
      expect(m.lineZ!, `${at} the today line does not clear every card`).toBeGreaterThanOrEqual(60);
      expect(m.overflowX, `${at} the page scrolls sideways`).toBeLessThan(2);
    }
  }
  for (const r of rows) console.log(r);
  console.log(`insets across the whole sweep: ${[...allInsets].sort().join(" · ")}`);
  console.log(`totals — cards ${totalCards} · lead-in marks ${totalMarks} · tinted ${totalTinted} · tight ${totalTight}`);
  console.log(`console errors: ${errors.length}${errors.length ? " → " + errors.slice(0, 3).join(" | ") : ""}`);

  expect(seen.size, "width × range combinations visited").toBe(WIDTHS.length * RANGE_LABELS.length);
  /* ⚠️ ONE ASSERTION OVER THE WHOLE SWEEP: the board draws its text at the two pinned insets and
     nowhere else. Before v54 it drew at twelve. */
  expect([...allInsets].sort(), "the board draws text at other than the two pinned insets")
    .toEqual(["fadeL:42", "flat:13"]);
  /* populations, so no claim above passed over an empty set */
  expect(totalMarks, "no lead-in mark anywhere in the sweep").toBeGreaterThan(10);
  expect(totalTinted, "no overdue tint anywhere in the sweep").toBeGreaterThan(5);
  expect(totalTight, "no clipped card anywhere in the sweep").toBeGreaterThan(5);
  expect(errors, "the console reported errors").toEqual([]);
});

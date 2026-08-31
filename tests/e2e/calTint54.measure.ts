import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ THE OVERDUE TINT (v54, Phase 5) — its span IS the lateness.
 *
 * It fills the card from the date the deed fell due to today, flat, with a hard edge at the due
 * date. A gradient would make the start of lateness a REGION rather than a date, and the date is
 * the fact being stated.
 *
 * ⚠️ THE THREE SAMPLES ARE REAL PIXELS, taken as 1x1 screenshots and compared byte for byte. A
 * computed `background-color` is one reading of one declaration — it cannot tell a flat fill from
 * a gradient that happens to declare a colour too, and it says nothing about what was painted over
 * it. Three identical PNGs is the composed claim, and it needs no decoder.
 */
const shot = async (page: import("@playwright/test").Page, x: number, y: number) =>
  (await page.screenshot({ clip: { x, y, width: 1, height: 1 } })).toString("base64");

test("the tint spans the lateness, is flat, and has a hard edge at the due date", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  /**
   * ⚠️ THE STIR IS SUPPRESSED BEFORE ANYTHING IS MEASURED, and it is not optional here.
   *
   * An owed card rotates. `getBoundingClientRect` on a rotated element returns its AXIS-ALIGNED
   * box, which is wider than its layout box at both ends — so the tint's reported left edge was
   * not where the edge is, and the two pixels sampled either side of it landed on the same side of
   * the real one. It read as a soft edge on a hard fill. The rotation also means two successive
   * screenshots are taken at different phases of the animation, so the same coordinate is not the
   * same pixel twice. The stir has its own lock; this one is about the tint.
   */
  await page.addStyleTag({ content: ".tl-p, .tl-p.owed { animation: none !important; }" });
  await page.waitForTimeout(900);
  const found = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const cards = [...document.querySelectorAll(".tl-p")].filter(vis) as HTMLElement[];
    const line = document.querySelector(".tl-todayline") as HTMLElement | null;
    const todayX = line ? line.getBoundingClientRect().left : null;
    return { todayX, tinted: cards.filter((c) => !!c.querySelector(".tl-late")).map((c) => {
      const cb = c.getBoundingClientRect();
      const t = (c.querySelector(".tl-late") as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(c.querySelector(".tl-late") as HTMLElement);
      const lane = c.parentElement!.getBoundingClientRect();
      const days = Number(c.dataset.days || "0");
      const lateFrom = Number(c.dataset.latefrom || "NaN");
      const dueAt = Number(c.dataset.dueat || "NaN");
      const from = Number(c.dataset.from || "0");
      return { rel: c.dataset.rel || "", cl: cb.left, cr: cb.right, cy: cb.top + cb.height / 2,
        /* the due date's own x, from the page's day units and the lane's width — a second
           derivation to check the painted edge against */
        /* ⚠️ FROM `dueAt`, THE DATE'S OWN POSITION — never from `lateFrom`, which is what PLACED
           the tint. Reading the placement and comparing it with the placement is one number twice,
           and a mutation that made every tint run its whole card passed that form. */
        dueX: days > 0 && Number.isFinite(dueAt) ? lane.left + (dueAt / days) * lane.width : null,
        lateFrom, from, days,
        /**
         * ⚠️ A LINE INSIDE THE CARD AND BELOW ITS WORDS, COMPUTED RATHER THAN GUESSED.
         *
         * The content is vertically centred, so the card's middle samples the pill and the
         * headline painted OVER the tint — three samples that differ because one hit a pill, one a
         * serif and one bare tint. `top + 5` was the first guess and it was inside the card's own
         * top border and the row above it: both sides of the tint's edge read the same there, and
         * a crisp edge was reported as soft. The content's own painted box is what defines the
         * clear band, so it is asked for.
         */
        sy: (() => {
          const ct = c.querySelector(".tl-content") as HTMLElement | null;
          const kids = ct ? ([...ct.children] as HTMLElement[]).filter(vis) : [];
          const inkBottom = kids.length
            ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : cb.top + cb.height / 2;
          /* halfway between the words' bottom and the card's inner bottom edge */
          return Math.min(cb.bottom - 4, (inkBottom + cb.bottom) / 2);
        })(),
        tl: t.left, tr: t.right, bg: cs.backgroundColor, img: cs.backgroundImage };
    }), untinted: cards.filter((c) => !c.querySelector(".tl-late")).length };
  });
  console.log(`tinted cards ${found.tinted.length} · untinted ${found.untinted} · today x ${found.todayX?.toFixed(0)}`);
  /* ⚠️ BOTH POPULATIONS — a board with no tint proves nothing, and a board where everything is
     tinted proves the "no passed due date paints no tint" half is not being tested. */
  expect(found.tinted.length, "no card carries a tint, so nothing was measured").toBeGreaterThan(0);
  expect(found.untinted, "every card is tinted, so the quiet case was not tested").toBeGreaterThan(3);

  for (const t of found.tinted) {
    console.log(`  ${t.rel}: card ${t.cl.toFixed(0)}..${t.cr.toFixed(0)} tint ${t.tl.toFixed(0)}..${t.tr.toFixed(0)} ${t.bg} img=${t.img}`);
    /* ⚠️ FLAT: the paint is a colour and nothing else. A `background-image` here would be the
       gradient the hard edge exists to forbid. */
    expect(t.img, `${t.rel} paints an image over its tint`).toBe("none");
    expect(t.bg, `${t.rel} is not the pinned tint`).toBe("rgba(230, 195, 180, 0.6)");
    /* its right edge is the card's own today edge */
    expect(Math.abs(t.tr - t.cr), `${t.rel}'s tint does not reach the card's edge`).toBeLessThan(1.5);
    /* it never starts before the card */
    expect(t.tl, `${t.rel}'s tint starts before its card`).toBeGreaterThan(t.cl - 1);
    /* ⚠️ AND ITS LEFT EDGE IS THE DUE DATE'S OWN x, computed from the page's published day units
       against the lane — not from the tint's own style, which is the number that placed it. A
       mutation that made every tint run its whole card passed the earlier form. */
    expect(t.dueX, `${t.rel} publishes no due date`).not.toBeNull();
    /* the painted edge is the due date's x, or the card's own left where lateness began before the
       window — all of a card whose lateness predates the view is late, which is what clamping says */
    const want = Math.max(t.dueX!, t.cl);
    expect(Math.abs(t.tl - want), `${t.rel}'s tint starts ${(t.tl - want).toFixed(1)}px from its due date`)
      .toBeLessThan(1.5);
  }

  /* ⚠️ THE THREE SAMPLES, AS PIXELS. Start, middle and end of the tinted span must be identical —
     a gradient fails this, and so does anything painted over part of it. */
/**
   * ⚠️ SAMPLED INSIDE THE REGION THE FADE DOES NOT TOUCH, and that is not a loosening.
   *
   * The tint lives inside the frame so it rounds and dissolves WITH the card — which is the point
   * of putting it there. On a card cut at both ends the first and last 34px are therefore
   * legitimately paler, and sampling at the very edges compared the tint against the fade rather
   * than against itself. What the claim is about is whether the tint is FLAT where it is fully
   * painted; a gradient across the span still fails it, which is the fault it exists to catch.
   */
  const fade = await page.evaluate(() => {
    const c = document.querySelector(".tl-p") as HTMLElement | null;
    return c ? parseFloat(getComputedStyle(c).getPropertyValue("--card-fade")) || 0 : 0;
  });
  const inner = found.tinted.map((t) => ({
    ...t,
    lo: Math.max(t.tl + 3, t.cl + fade + 3),
    hi: Math.min(t.tr - 3, t.cr - fade - 3),
  })).filter((t) => t.hi - t.lo > 30);
  const wide = inner[0];
  expect(wide, `no tinted span with ${"" + 30}px of fully-painted width to sample across`).toBeTruthy();
  const y = Math.round(wide.sy);
  const a = await shot(page, Math.round(wide.lo), y);
  const b = await shot(page, Math.round((wide.lo + wide.hi) / 2), y);
  const c = await shot(page, Math.round(wide.hi), y);
  console.log(`  sampled ${wide.rel} at ${Math.round(wide.lo)}/${Math.round((wide.lo + wide.hi) / 2)}/${Math.round(wide.hi)}`
    + ` (fade ${fade}px excluded each end) → ${a === b && b === c ? "identical" : "DIFFER"}`);
  expect(a, "the tint's start and middle are different colours").toBe(b);
  expect(b, "the tint's middle and end are different colours").toBe(c);

  /* ⚠️ AND THE PIXEL IMMEDIATELY LEFT OF THE DUE DATE IS THE CARD'S OWN GROUND — the hard edge.
     Only meaningful where the tint starts inside the card rather than at its edge. */
/* ⚠️ AND THE SAMPLE POINT IS PROVED ON SCREEN FIRST. `page.screenshot` with a clip outside the
     viewport throws "Clipped area is either empty or outside the resulting image" — which reads as
     a broken probe rather than as a card below the fold, and is the same precondition every
     coordinate-taking measurement in this repo needs. */
  const vp = page.viewportSize()!;
  const onScreen = (t: { tl: number; sy: number }) =>
    t.tl - 3 > 0 && t.tl + 3 < vp.width && t.sy > 0 && t.sy < vp.height;
  let inset = found.tinted.filter((t) => t.tl > t.cl + fade + 6).filter(onScreen)[0];
  /* ⚠️ AND THE BOARD IS SCROLLED TO FIND ONE. Two tints start inside their card and neither was
     above the fold, so the hard edge — the whole point of a flat fill with a stated start — went
     unmeasured on a green run. A claim that can be brought on screen must be. */
  if (!inset) {
    for (const to of [200, 400, 600, 800, 1000]) {
      await page.evaluate((y) => {
        const z = document.querySelector(".tpl-zone") as HTMLElement | null;
        if (z) z.scrollTop = y; else window.scrollTo(0, y);
      }, to);
      await page.waitForTimeout(220);
      const again = await page.evaluate(() => {
        const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
        return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis)
          .filter((c) => !!c.querySelector(".tl-late")).map((c) => {
            const cb = c.getBoundingClientRect();
            const t = (c.querySelector(".tl-late") as HTMLElement).getBoundingClientRect();
            /* ⚠️ THE SAME `sy` AS THE FIRST PASS, because two places computing one thing is
               how they come to disagree — and they did: the first was fixed to clear the words
               and this one went on sampling `top + 5`, so the corrected line was never used and
               the failure did not move. */
            const ctn = c.querySelector(".tl-content") as HTMLElement | null;
            const kids = ctn ? ([...ctn.children] as HTMLElement[]).filter(vis) : [];
            const inkBottom = kids.length
              ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : cb.top + cb.height / 2;
            const lane2 = c.parentElement!.getBoundingClientRect();
            const days2 = Number(c.dataset.days || "0");
            const dueAt2 = Number(c.dataset.dueat || "NaN");
            return { rel: c.dataset.rel || "", cl: cb.left, cr: cb.right,
              cy: cb.top + cb.height / 2,
              dueX: days2 > 0 && Number.isFinite(dueAt2) ? lane2.left + (dueAt2 / days2) * lane2.width : null,
              lateFrom: Number(c.dataset.latefrom || "NaN"),
              from: Number(c.dataset.from || "0"), days: days2,
              sy: Math.min(cb.bottom - 4, (inkBottom + cb.bottom) / 2),
              tl: t.left, tr: t.right, bg: "", img: "" };
          });
      });
      inset = again.filter((t) => t.tl > t.cl + fade + 6).filter(onScreen)[0];
      if (inset) break;
    }
  }
  if (inset) {
    const before = await shot(page, Math.round(inset.tl - 3), Math.round(inset.sy));
    const after = await shot(page, Math.round(inset.tl + 3), Math.round(inset.sy));
    console.log(`  hard edge on ${inset.rel}: card ${inset.cl.toFixed(0)}..${inset.cr.toFixed(0)}`
      + ` tint starts ${inset.tl.toFixed(0)} · sampling ${(inset.tl - 3).toFixed(0)} and ${(inset.tl + 3).toFixed(0)}`
      + ` at y ${inset.sy.toFixed(0)} · before ${before === after ? "SAME as" : "differs from"} after`);
    expect(before, "the pixel left of the due date is already tinted — the edge is not hard")
      .not.toBe(after);
  } else {
    const anyInset = found.tinted.filter((t) => t.tl > t.cl + fade + 6).length;
    console.log(`  hard edge UNMEASURED: ${anyInset} tint(s) start inside their card, none of them on screen`);
  }
});

test("⚠️ only a writer-owed passed date can produce the word overdue", async ({ page }) => {
  /**
   * The copy law, read off the rendered board rather than off the function: every card that says
   * "overdue" must be one the writer owes. An agency's window that has passed is a silence, not a
   * debt, and is stated as "reply expected … · none yet".
   */
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.waitForTimeout(800);
  const seen: { overdue: string[]; agency: string[]; owed: number; total: number } =
    { overdue: [], agency: [], owed: 0, total: 0 };
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    const rows = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      return ([...document.querySelectorAll(".tl-p")] as HTMLElement[]).filter(vis).map((c) => ({
        rel: c.dataset.rel || "", state: c.dataset.state || "",
        text: (c.querySelector(".tl-content")?.textContent || "").trim(),
        owed: c.classList.contains("owed") || c.classList.contains("req"),
        tinted: !!c.querySelector(".tl-late"),
      }));
    });
    for (const r of rows) {
      seen.total += 1;
      if (r.owed) seen.owed += 1;
      if (/overdue/i.test(r.text)) seen.overdue.push(`${r.rel} [${r.state}] owed=${r.owed}`);
      /* ⚠️ AN AGENCY ROW IS IDENTIFIED BY WHOSE MOVE IT IS, not by the words it happens to use.
         The first form looked for rows saying BOTH "reply expected" and "overdue" — so renaming
         the agency line to "overdue since …" removed the first phrase and the check found nothing.
         An agent-held row saying the word at all is the offence. */
      if (!r.owed && /overdue/i.test(r.text)) seen.agency.push(`${r.rel} [${r.state}]`);
    }
  }
  console.log(`cards ${seen.total} · writer-owed ${seen.owed} · saying "overdue" ${seen.overdue.length}`);
  for (const o of seen.overdue.slice(0, 6)) console.log(`  ${o}`);
  /* ⚠️ BOTH KINDS MUST BE PRESENT, or "no agency row says overdue" is satisfied by there being no
     agency rows — and the whole claim is a distinction between two kinds. */
  expect(seen.owed, "no writer-owed card on the board").toBeGreaterThan(0);
  expect(seen.total - seen.owed, "no agency-held card on the board").toBeGreaterThan(3);
  expect(seen.overdue.length, "nothing says overdue, so the word's rule is untested").toBeGreaterThan(0);
  expect(seen.overdue.filter((o) => o.includes("owed=false")),
    "a card the writer does not owe says overdue").toEqual([]);
  expect(seen.agency, "a row states an agency's expected date AND calls it overdue").toEqual([]);
});

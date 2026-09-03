import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** v58: one ninety-day window, today at its centre, stepped by whole weeks. */
const state = (page: import("@playwright/test").Page) => page.evaluate(`(() => {
  const vis = (e) => e.getBoundingClientRect().width > 0;
  const card = [...document.querySelectorAll(".tl-p")].filter(vis)[0];
  const dts = [...document.querySelectorAll(".tl-rail .tl-dt")].filter(vis).map((e) => (e.textContent || "").trim());
  const lane = [...document.querySelectorAll(".tl-rrow .tl-c-tl")].find(vis);
  const line = [...document.querySelectorAll(".tl-todayline")].find(vis);
  const lb = lane ? lane.getBoundingClientRect() : null;
  return {
    days: card ? Number(card.dataset.days) : null,
    dates: dts,
    todayPct: (line && lb) ? ((line.getBoundingClientRect().left - lb.left) / lb.width) * 100 : null,
  };
})()`) as Promise<{ days: number | null; dates: string[]; todayPct: number | null }>;

const step = (page: import("@playwright/test").Page, label: string) => page.evaluate(
  '(() => { const b = [...document.querySelectorAll("button")]'
  + '.find((x) => (x.getAttribute("aria-label") || "") === ' + JSON.stringify(label) + ');'
  + ' if (b) b.click(); })()');

test("the window is ninety days with today at its centre", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const s = await state(page);
  console.log(`window ${s.days} days · today at ${s.todayPct?.toFixed(1)}% · rail dates ${s.dates.length}`);
  expect(s.days, "no card, so the window span was not read").not.toBeNull();
  expect(s.days, "the window is not ninety days").toBe(90);
  /* ⚠️ THE CENTRE IS ASSERTED FROM THE PAINTED LINE, not from the token that positions it —
     one number read twice cannot show that the line and the window disagree. */
  expect(s.todayPct, "no today line on the board, so its position was not tested").not.toBeNull();
  expect(Math.abs((s.todayPct as number) - 50) < 1.5,
    `today sits at ${s.todayPct?.toFixed(1)}% rather than the lane's centre`).toBe(true);
});

test("⚠️ a step moves the window by exactly seven days, and the span does not change", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const before = await state(page);
  /* ⚠️ POPULATION: with no dated labels on the rail there is nothing to compare, and "the window
     moved" would be satisfied by two empty lists. */
  expect(before.dates.length, "the rail carries no dates, so a step cannot be measured")
    .toBeGreaterThan(3);

  await step(page, "Previous window");
  await page.waitForTimeout(500);
  const back = await state(page);
  console.log(`first rail date: ${before.dates[0]} → ${back.dates[0]} · span ${before.days} → ${back.days}`);
  expect(back.days, "the span changed when the window moved").toBe(before.days);
  expect(back.dates[0] === before.dates[0],
    `the window did not move (still ${before.dates[0]}) — the step is a no-op`).toBe(false);

  /* seven days, measured on the dates themselves */
  const parse = (t: string) => {
    const m = /^(\d+)\s+([A-Za-z]+)/.exec(t);
    if (!m) return NaN;
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      .findIndex((x) => m[2].slice(0, 3) === x);
    return mo < 0 ? NaN : Date.UTC(2026, mo, Number(m[1]));
  };
  const d0 = parse(before.dates[0]), d1 = parse(back.dates[0]);
  expect(Number.isNaN(d0) || Number.isNaN(d1), `could not read the rail's dates ("${before.dates[0]}")`)
    .toBe(false);
  const days = Math.round((d0 - d1) / 86400000);
  console.log(`  the window moved back ${days} days`);
  expect(days, `a step moved the window ${days} days rather than seven`).toBe(7);

  /* and Today puts it back */
  /* the Today control carries its word rather than an aria-label — matched on its text */
  await page.evaluate('(() => { const b = [...document.querySelectorAll("button")]'
    + '.find((x) => (x.textContent || "").trim() === "Today"); if (b) b.click(); })()');
  await page.waitForTimeout(500);
  const home = await state(page);
  expect(home.dates[0], "Today did not return the window to where it opened").toBe(before.dates[0]);
});

test("a long silence wears the No-response chip", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    return [...document.querySelectorAll(".tl-p")].filter(vis).map((c) => {
      const ch = c.querySelector(".tl-fchip");
      return { rel: c.dataset.rel || "", state: c.dataset.state || "",
        chip: ch ? (ch.textContent || "").trim() : "",
        kind: ch ? [...ch.classList].filter((x) => x !== "tl-fchip").join(" ") : "" };
    });
  })()`) as unknown as { rel: string; state: string; chip: string; kind: string }[];
  /* the board's OWN silence rule decides this — `barState`'s quiet and ghost */
  const silent = r.filter((c) => c.state === "quiet" || c.state === "ghost");
  const loud = r.filter((c) => c.state !== "quiet" && c.state !== "ghost");
  console.log(`cards ${r.length} — long silences ${silent.length} · everything else ${loud.length}`);
  /* ⚠️ BOTH POPULATIONS: a board with no silence cannot test the rule, and a board of nothing but
     silences cannot show that the chip is reserved for them. */
  expect(silent.length, "no long silence on the board, so the chip was not tested").toBeGreaterThan(2);
  expect(loud.length, "every card is a silence, so the chip's exclusivity was not tested")
    .toBeGreaterThan(3);
  expect(silent.filter((c) => c.chip !== "No Response").map((c) => `${c.rel}: "${c.chip}"`),
    "a long silence does not say so").toEqual([]);
  expect(silent.filter((c) => c.kind !== "quiet").map((c) => `${c.rel}: ${c.kind}`),
    "a long silence is not in the sand chip").toEqual([]);
  expect(loud.filter((c) => c.chip === "No Response").map((c) => c.rel),
    "a card that is not a long silence says No Response").toEqual([]);
});

test("⚠️ the only rose vertical is the owed strip, on owed rows", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  /**
   * ⚠️ SCROLL TO THE SUBJECTS FIRST. v58e made overdue work a TIER, so every owed row is now at
   * the top and the first screen holds nothing else — this probe's population went to zero the
   * moment the ordering was fixed, and its guard is the only reason that surfaced as a failure
   * rather than as a green over an empty set.
   */
  await page.evaluate(`(() => { const s = document.querySelector(".wpg-scroll"); if (s) s.scrollTop = 300;
    const z = document.querySelector(".tl-zone"); if (z) z.scrollTop = 300; })()`);
  await page.waitForTimeout(400);
  const r = await page.evaluate(`(() => {
    const visH = (e) => e.getBoundingClientRect().height > 0;
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const lane = [...document.querySelectorAll(".tl-rrow .tl-c-tl")].find(vis);
    const lb = lane.getBoundingClientRect();
    const rows = [...document.querySelectorAll(".tl-rrow")].filter(visH);
    /* ⚠️ ON SCREEN, OR THE PROBE ANSWERS ABOUT NOTHING. elementFromPoint outside the viewport
       returns null or whatever else is there — the fault that once reported a clean stack. */
    const onScreen = rows.filter((r) => {
      const b = r.getBoundingClientRect();
      return b.top > 100 && b.bottom < window.innerHeight - 20;
    });
    const notOwed = onScreen.filter((r) => !r.classList.contains("owes"));
    const hits = notOwed.map((r) => {
      const b = r.getBoundingClientRect();
      const el = document.elementFromPoint(Math.round(lb.left + 1), Math.round(b.top + b.height / 2));
      if (!el) return { row: r.dataset.rowkey, hit: "(none)" };
      const c = getComputedStyle(el);
      return { row: r.dataset.rowkey, hit: String(el.className).slice(0, 30),
        owedEl: el.classList.contains("owes"),
        bl: c.borderLeftWidth + " " + c.borderLeftColor, bg: c.backgroundColor };
    });
    /**
     * A rose vertical drawn by a CONTAINER — the board, the table, a row or a lane.
     *
     * ⚠️ THE CARD'S OWN FRAME IS EXCLUDED, AND DELIBERATELY. The ref gives an overdue card a
     * rose border (--pinkdd), so a sweep for "anything rose" flags a colour the ref chose — a
     * true reading, and an accusation about the wrong subject. The hypothesis is a rule down the
     * board's left edge, which only a container can draw.
     */
    const CONTAINERS = ".tl-board, .tl-tbl, .tl-rrow, .tl-c-tl, .tl-rail, .tl-wrap, .tl-zone";
    const rose = [];
    for (const e of document.querySelectorAll(CONTAINERS)) {
      const c = getComputedStyle(e);
      const m = c.borderLeftColor.match(/[0-9.]+/g);
      if (!m || parseFloat(c.borderLeftWidth) === 0) continue;
      const R = +m[0], G = +m[1], B = +m[2], A = m[3] === undefined ? 1 : +m[3];
      if (A > 0.2 && R > 170 && R - G > 25 && R - B > 25) {
        rose.push(String(e.className).slice(0, 28) + " " + c.borderLeftColor);
      }
    }
    return { probed: hits.length, hits, rose: [...new Set(rose)] };
  })()`) as unknown as any;
  console.log(`non-owed rows probed at the lane's left edge: ${r.probed}`);
  for (const h of r.hits.slice(0, 4)) console.log(`  ${h.row}: ${h.hit} · border-left ${h.bl}`);
  console.log(`containers drawing a rose left border: ${JSON.stringify(r.rose)}`);
  /* ⚠️ POPULATION: the earlier reading probed four rows of which two were BELOW the fold, so half
     its answer was about nothing. Only on-screen rows are probed, and there must be some. */
  expect(r.probed, "no non-owed row is on screen, so the probe answered about nothing")
    .toBeGreaterThan(1);
  const rosy = r.hits.filter((h: any) => {
    const m = (h.bl || "").match(/[0-9.]+/g);
    return m && parseFloat(h.bl) > 0 && +m[1] > 170 && +m[1] - +m[2] > 25;
  });
  expect(rosy.map((h: any) => `${h.row}: ${h.bl}`),
    "a non-owed row carries a rose border at the lane's left edge").toEqual([]);
  expect(r.rose, "a container draws a rose rule down the board's left edge").toEqual([]);
});

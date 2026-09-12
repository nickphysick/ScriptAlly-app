/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOUR FIXES, ON THE RENDERED PAGE — historic fills, the today line, the header, the reveal.
 * Ref for §3: `design-refs/query-calendar-header-v1.html` (treatment A, two leaves).
 *
 * ⚠️ THREE OF THE FOUR ARE BOARD-LEVEL, SO THEY ARE MEASURED ON BOTH HOSTS. §1, §2 and §4 are
 * `todoCalendar.css` and `TimelineBoard`, which To-do and the Query Centre's Calendar both mount;
 * a case that only ever looked at one of them would let the two drift, which is the exact fault §4
 * existed to fix. §3 is the Query Centre's own header and is measured there alone.
 *
 * ⚠️ AND §2 IS MEASURED AS PAINT, NOT AS A DOM STACK. The today line is `pointer-events: none` —
 * decoration that must never swallow a click meant for a card — so `elementFromPoint` at a
 * crossing answers "the card" on a correctly stacked page and on a broken one alike. The question
 * "is the line above the bars" is a question about pixels; this samples them.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { readPng } from "./pngPixels";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const SHOTS = "/Users/nickphysick/ScriptAlly-app/reports/calendar-fixes-shots";
const REF = "/Users/nickphysick/ScriptAlly-app/reports/calendar-fixes-ref";
mkdirSync(SHOTS, { recursive: true });

/** the five state fills, as the app declares them — read from the page, never retyped here */
type Tokens = Record<string, string>;

const vis = async (page: Page, sel: string) =>
  page.evaluate((sel) => {
    const l = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getBoundingClientRect().height > 0);
    if (l.length !== 1) throw new Error(`expected one visible ${sel}, found ${l.length}`);
    l[0].setAttribute("data-cal-live", "1");
  }, sel);

const openCalendar = async (page: Page, host: "todo" | "qc", width: number) => {
  if (host === "todo") {
    await openRoute(page, "/todo/calendar", { width, height: 1000 });
    await vis(page, ".wpg.tpl-wpg");
  } else {
    await openRoute(page, "/queries", { width, height: 1000 });
    await vis(page, ".wpg.qc-wpg");
    await page.locator('[data-cal-live] .qvs button:has-text("Calendar")').first().click();
    await page.waitForTimeout(1800);
  }
};

/** `#f7efe3` → `rgb(247, 239, 227)`, so a computed fill and a declared token can be compared */
const hexToRgb = (hex: string) => {
  const h = hex.trim().replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/* ══════════════════════════ §1 · historic bars, in their own colour ══════════════════════════ */

for (const host of ["qc", "todo"] as const) {
  test(`§1 · a past stage is its state colour at .34, and full strength on hover — ${host}`, async ({ page }) => {
    test.setTimeout(300_000);
    await openCalendar(page, host, 1440);

    const read = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-cal-live]")!;
      const cs = getComputedStyle(root.closest(".tl-board") || root);
      const tokens: Record<string, string> = {};
      for (const k of ["queried", "agent", "you", "offer", "closed"]) tokens[k] = cs.getPropertyValue(`--state-${k}`).trim();
      const stages = [...root.querySelectorAll<HTMLElement>(".tl-jc")].map((e) => {
        const s = getComputedStyle(e);
        const b = e.getBoundingClientRect();
        return { st: e.dataset.st ?? null, bg: s.backgroundColor, opacity: s.opacity, z: s.zIndex,
                 seg: e.dataset.seg ?? "", rect: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } };
      });
      const neighbourZ = [...root.querySelectorAll<HTMLElement>(".tl-p")].map((e) => Number(getComputedStyle(e).zIndex) || 0);
      return { tokens, stages, neighbourZ };
    });

    expect(read.stages.length, "no past stages on this board — nothing to measure").toBeGreaterThan(0);

    /* ⚠️ THE TALLY IS PRINTED, because a fixture where every stage is the same state proves one
       branch of five and passes. It is reported rather than asserted: which states this account
       holds is the fixture's business, not the board's. */
    const tally: Record<string, number> = {};
    for (const s of read.stages) tally[s.st ?? "(none)"] = (tally[s.st ?? "(none)"] ?? 0) + 1;
    console.log(`  ${host} §1: ${read.stages.length} stages, states ${JSON.stringify(tally)}, tokens ${JSON.stringify(read.tokens)}`);

    for (const s of read.stages) {
      expect(s.st, `a stage carries no state at all (${s.seg})`).not.toBeNull();
      const want = read.tokens[s.st!];
      expect(want, `a stage claims state "${s.st}", which is not one of the five`).toBeTruthy();
      expect(s.bg, `stage ${s.seg} is ${s.bg}, not its ${s.st} token ${want}`).toBe(hexToRgb(want));
      expect(s.bg, "a stage is still painted white").not.toBe("rgb(255, 255, 255)");
      expect(Number(s.opacity), `stage ${s.seg} rests at ${s.opacity}`).toBeCloseTo(0.34, 2);
    }

    /* hover the first stage: full strength, and above its neighbours */
    const first = read.stages[0];
    await page.mouse.move(first.rect.x + Math.min(30, first.rect.w / 2), first.rect.y + first.rect.h / 2);
    await page.waitForTimeout(400);
    const hov = await page.evaluate((seg) => {
      const e = document.querySelector<HTMLElement>(`[data-cal-live] .tl-jc[data-seg="${seg}"]`)!;
      const s = getComputedStyle(e);
      return { opacity: s.opacity, z: Number(s.zIndex) || 0, bg: s.backgroundColor };
    }, first.seg);
    console.log(`  ${host} §1 hovered: opacity ${hov.opacity}, z ${hov.z} against neighbours ${Math.max(...read.neighbourZ, 0)}`);
    expect(Number(hov.opacity), "a hovered stage does not come to full strength").toBeCloseTo(1, 2);
    expect(hov.z, "a hovered stage does not rise above its neighbours").toBeGreaterThan(Math.max(...read.neighbourZ, 0));
    expect(hov.bg, "hovering changed the fill — only the opacity may move").toBe(read.stages[0].bg);

    await page.screenshot({ path: `${SHOTS}/${host}-stage-hovered.png`,
      clip: { x: Math.max(0, first.rect.x - 20), y: Math.max(0, first.rect.y - 20), width: Math.min(520, first.rect.w + 200), height: first.rect.h + 40 } });
    await page.mouse.move(4, 4);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/${host}-stage-rest.png`,
      clip: { x: Math.max(0, first.rect.x - 20), y: Math.max(0, first.rect.y - 20), width: Math.min(520, first.rect.w + 200), height: first.rect.h + 40 } });
  });
}

/* ══════════════════════════ §2 · the today line sits above the bars ══════════════════════════ */

/** the dark pixels painted in a 6px strip over the line, inside one bar's own height */
async function strip(page: Page, x: number, top: number, height: number) {
  const bm = readPng(await page.screenshot({ clip: { x, y: top, width: 6, height } }));
  let dark = 0;
  for (let y = 0; y < bm.height; y++) for (let px = 0; px < bm.width; px++) {
    const [r, g, b] = bm.at(px, y);
    if (r < 90 && g < 90 && b < 90) dark++;
  }
  return dark;
}

for (const host of ["qc", "todo"] as const) {
  test(`§2 · the today line paints over a bar, hovered as well as at rest — ${host}`, async ({ page }) => {
    test.setTimeout(300_000);
    await openCalendar(page, host, 1440);

    /* ⚠️ BRING A CROSSING BAR ONTO THE SCREEN BEFORE ASKING ABOUT PIXELS. To-do's board is longer
       than the viewport and its crossings sat below the fold, so the first run of this case failed
       its own precondition rather than passing on an empty set — which is the failure this repo
       wants and is still a case that has measured nothing. The rows region is the one thing here
       that scrolls; a bar is only scrolled to when none is already visible. */
    await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-cal-live]")!;
      const tl = root.querySelector<HTMLElement>(".tl-todayline");
      if (!tl) return;
      const x = tl.getBoundingClientRect().x;
      const crossing = [...root.querySelectorAll<HTMLElement>(".tl-p")]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.x < x - 8 && r.x + r.width > x + 8 && r.height > 20; });
      if (!crossing.length) return;
      const onScreen = crossing.some((e) => { const r = e.getBoundingClientRect(); return r.y > 60 && r.y + r.height < innerHeight - 10; });
      if (!onScreen) crossing[0].scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(600);

    const found = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-cal-live]")!;
      const tl = root.querySelector<HTMLElement>(".tl-todayline");
      if (!tl) return null;
      const b = tl.getBoundingClientRect();
      const x = b.x;
      const bars = [...root.querySelectorAll<HTMLElement>(".tl-p")]
        .map((e) => ({ e, r: e.getBoundingClientRect() }))
        .filter((o) => o.r.x < x - 8 && o.r.x + o.r.width > x + 8 && o.r.height > 20
          && o.r.y > 60 && o.r.y + o.r.height < innerHeight - 10);
      if (!bars.length) return { x, line: getComputedStyle(tl).borderLeftColor, z: getComputedStyle(tl).zIndex, bars: [] as unknown[] };
      return { x, line: getComputedStyle(tl).borderLeftColor, z: getComputedStyle(tl).zIndex,
        bars: bars.map((o) => ({ cls: String(o.e.className).slice(0, 44),
          top: Math.round(o.r.y + 4), h: Math.round(o.r.height - 8),
          left: Math.round(o.r.x), w: Math.round(o.r.width) })) };
    });

    expect(found, "no today line on this board").not.toBeNull();
    /* ⚠️ THE PRECONDITION, ASSERTED FIRST. A window with nothing crossing today measures nothing
       and would pass having looked at no pixels at all. */
    expect((found!.bars as unknown[]).length, "no bar crosses today on screen — nothing to measure").toBeGreaterThan(0);

    const bars = found!.bars as { cls: string; top: number; h: number; left: number; w: number }[];
    const px = Math.round(found!.x - 2);
    const rest: number[] = [];
    for (const b of bars) rest.push(await strip(page, px, b.top, b.h));
    console.log(`  ${host} §2: line z=${found!.z} ${found!.line}; ${bars.length} crossings, dark at rest ${rest.join("/")}`);
    for (let i = 0; i < bars.length; i++) {
      expect(rest[i], `the line does not paint through a resting ${bars[i].cls}`).toBeGreaterThan(0);
    }

    /* the state the literal z-index of 3 was losing to: the card under the pointer */
    const b0 = bars[0];
    await page.mouse.move(b0.left + Math.min(40, b0.w / 2), b0.top + b0.h / 2);
    await page.waitForTimeout(450);
    const hovered = await strip(page, px, b0.top, b0.h);
    console.log(`  ${host} §2 hovered: dark ${hovered} (was ${rest[0]})`);
    expect(hovered, "the hovered card covers the today line").toBeGreaterThan(0);

    await page.screenshot({ path: `${SHOTS}/${host}-todayline-crossing.png`,
      clip: { x: Math.max(0, px - 170), y: Math.max(0, b0.top - 24), width: 340, height: b0.h + 48 } });
    await page.mouse.move(4, 4);
  });
}

/* ══════════════════════════ §3 · the header cannot collide ══════════════════════════════════ */

test("§3 · the Calendar header holds at 1100, 1280, 1440 and 1920", async ({ page }) => {
  test.setTimeout(360_000);
  await openCalendar(page, "qc", 1440);
  const out: Record<string, unknown> = {};
  const rangeWidths: number[] = [];

  for (const w of [1100, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-cal-live]")!;
      const Q = (s: string) => root.querySelector<HTMLElement>(s);
      const R = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2),
                 r: +(b.x + b.width).toFixed(2), bot: +(b.y + b.height).toFixed(2) }; };
      const head = Q(".qcc-calhead");
      const cells = { l: Q(".qcc-calhead-l"), c: Q(".qcc-calsearch"), r: Q(".qcc-calhead-r") };
      /* ⚠️ THE CONTROLS AS WELL AS THE CELLS, AND THE CONTROLS ARE WHERE THE FAULT WAS. The cells
         never intersected; the view switch overflowed its own cell leftwards across the search. */
      const controls = { l: Q(".qcc-calhead-l"), c: Q(".qcc-calsearch"), r: Q(".qvs") };
      const pair = (a: Element | null, b: Element | null) => {
        if (!a || !b) return null;
        const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
        const ox = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const oy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        return +Math.min(ox, oy).toFixed(2);
      };
      const rng = Q(".qcc-calhead-rng");
      const padB = head ? parseFloat(getComputedStyle(head).paddingBottom) : 0;
      const hs = [cells.l, cells.c, cells.r, rng].filter(Boolean)
        .map((e) => +(e as HTMLElement).getBoundingClientRect().height.toFixed(2));
      return {
        head: R(head), rng: R(rng), search: R(cells.c), views: R(controls.r), left: R(cells.l),
        leaves: root.querySelectorAll(".qcc-calleaf").length,
        arrow: root.querySelectorAll(".qcc-calleaf-arr").length,
        rngLabel: rng?.getAttribute("aria-label") ?? null,
        cellOverlap: { lc: pair(cells.l, cells.c), cr: pair(cells.c, cells.r), lr: pair(cells.l, cells.r) },
        ctrlOverlap: { lc: pair(controls.l, controls.c), cr: pair(controls.c, controls.r), lr: pair(controls.l, controls.r) },
        contentH: head ? +(head.getBoundingClientRect().height - padB).toFixed(2) : null,
        tallest: Math.max(...hs),
        searchName: root.querySelector<HTMLInputElement>(".qcc-calsearch input")?.getAttribute("aria-label") ?? null,
        viewNames: [...root.querySelectorAll<HTMLElement>(".qvs button")].map((b) => (b.textContent || "").trim()),
      };
    });
    out[`w${w}`] = m;
    console.log(`  §3 ${w}: range ${m.rng?.w} · search ${m.search?.w} · views ${m.views?.w} · ctrl gaps ${JSON.stringify(m.ctrlOverlap)} · row ${m.contentH}/${m.tallest}`);

    /* ⚠️ NOTHING INTERSECTS — cells AND controls, AND THIS GOES FIRST. An earlier failing assertion
       hides every one below it, and the claim this section exists for is the overlap: run against
       the build before the fix, "the range is not two leaves" fired and the overlap was never
       asked, while the printed numbers showed the switch sitting 38px inside the search at 1100.
       A negative overlap is a gap. */
    for (const [k, v] of Object.entries(m.ctrlOverlap)) {
      expect(v, `at ${w} the header's ${k} controls intersect by ${v}px`).toBeLessThanOrEqual(0);
    }
    for (const [k, v] of Object.entries(m.cellOverlap)) {
      expect(v, `at ${w} the header's ${k} cells intersect by ${v}px`).toBeLessThanOrEqual(0);
    }
    /* the two leaves and their arrow, at every width */
    expect(m.leaves, `the range is not two leaves at ${w}`).toBe(2);
    expect(m.arrow, `no arrow between the leaves at ${w}`).toBe(1);
    /* ⚠️ NO WRAP: the row is exactly as tall as its tallest control, less its own bottom padding */
    expect(Math.abs(m.contentH! - m.tallest), `at ${w} the row is ${m.contentH} against a ${m.tallest} control — it has wrapped`).toBeLessThanOrEqual(1);
    /* the search shrinks rather than anything overlapping — a ceiling, never a vanishing */
    expect(m.search!.w, `at ${w} the search is ${m.search!.w}px`).toBeLessThanOrEqual(340.5);
    expect(m.search!.w, `at ${w} the search has been squeezed out of existence`).toBeGreaterThan(0);
    /* the sentence survives where a reader without the picture can still reach it */
    expect(m.rngLabel, `the range states no window in words at ${w}`).toMatch(/\d/);
    /* and the switch keeps its accessible names even where it loses its words */
    expect(m.viewNames.join("|"), `the view switch lost a name at ${w}`).toContain("Calendar");
    rangeWidths.push(m.rng!.w);
    await page.screenshot({ path: `${SHOTS}/header-${w}.png`,
      clip: { x: Math.max(0, m.head!.x - 4), y: Math.max(0, m.head!.y - 8), width: Math.min(m.head!.w + 8, w), height: m.head!.h + 16 } });
  }

  /* ⚠️ THE POINT OF THE LEAVES: the range is the SAME WIDTH at every viewport, so it can never be
     the thing that squeezes the row again. */
  const spread = Math.max(...rangeWidths) - Math.min(...rangeWidths);
  console.log(`  §3 range widths ${rangeWidths.join("/")} — spread ${spread.toFixed(2)}`);
  expect(spread, `the range varies by ${spread}px across the four widths`).toBeLessThanOrEqual(0.5);
  writeFileSync(`${SHOTS}/../calendar-fixes-header.json`, JSON.stringify(out, null, 2));
});

/* ══════════════════════════ §4 · the reveal is hover and focus ══════════════════════════════ */

for (const host of ["qc", "todo"] as const) {
  test(`§4 · the caveat flag opens on hover and on focus, never on a click — ${host}`, async ({ page }) => {
    test.setTimeout(300_000);
    await openCalendar(page, host, 1440);

    const bar = page.locator("[data-cal-live] .tl-p").first();
    await expect(bar).toBeVisible({ timeout: 20_000 });
    const on = () => page.evaluate(() => document.querySelectorAll("[data-cal-live] .tl-act.on").length);
    /* the label's own painted opacity, which is what a reader actually sees */
    const lab = () => page.evaluate(() => {
      const e = [...document.querySelectorAll<HTMLElement>("[data-cal-live] .tl-act")]
        .find((a) => a.classList.contains("on") || a.matches(":focus-within"));
      const l = e?.querySelector<HTMLElement>(".tl-actlab");
      return l ? Number(getComputedStyle(l).opacity) : 0;
    });

    await page.mouse.move(4, 4);
    await page.waitForTimeout(400);
    const rest = await on();
    expect(rest, "a mark is revealed with the pointer parked off the board").toBe(0);

    /* ⚠️ HOVER, WITH NO CLICK ANYWHERE IN THE CASE UNTIL THE LAST LINE. */
    await bar.hover();
    await page.waitForTimeout(450);
    const hovered = await on();
    const hoveredLab = await lab();
    console.log(`  ${host} §4: rest ${rest} → hover ${hovered} (label opacity ${hoveredLab})`);
    expect(hovered, "hovering a bar reveals nothing — the reveal still needs a click").toBeGreaterThan(0);
    expect(hoveredLab, "the caveat label is revealed in name only").toBeCloseTo(1, 2);

    /* moving away hides it again — after the grace, which is why this waits rather than reading */
    await page.mouse.move(4, 4);
    await page.waitForTimeout(600);
    expect(await on(), "the reveal survived the pointer leaving").toBe(0);

    /* ⚠️ AND THE KEYBOARD REACHES IT. `opacity: 0` never took the button out of the tab order, so
       before this a Tab landed on an invisible control; the focus has to reveal what it lands on. */
    const focused = await page.evaluate(() => {
      const b = document.querySelector<HTMLButtonElement>("[data-cal-live] .tl-act .tl-actbtn");
      if (!b) return null;
      b.focus();
      const l = b.parentElement!.querySelector<HTMLElement>(".tl-actlab")!;
      return { lab: Number(getComputedStyle(l).opacity), btn: Number(getComputedStyle(b).opacity),
               isFocus: document.activeElement === b };
    });
    console.log(`  ${host} §4 focus: ${JSON.stringify(focused)}`);
    expect(focused, "there is no action button to focus").not.toBeNull();
    expect(focused!.isFocus, "the button could not take focus").toBe(true);
    expect(focused!.lab, "focusing the mark does not reveal its label").toBeCloseTo(1, 2);
    expect(focused!.btn, "focusing the mark does not reveal the button").toBeCloseTo(1, 2);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    /* ⚠️ NO CLICK HANDLER ON THE FLAG ITSELF. The button inside it is the one thing here that is
       pressed; the mark is a label, and a click on it must do nothing at all. */
    const marks = await page.evaluate(() => {
      const a = document.querySelector<HTMLElement>("[data-cal-live] .tl-act");
      return a ? { onclick: !!a.onclick, cursor: getComputedStyle(a).cursor } : null;
    });
    expect(marks!.onclick, "the mark carries a click handler of its own").toBe(false);
  });
}

/* ══════════════════════════ §5 · To-do against today's reference ════════════════════════════ */

test("§5 · To-do's board and winbar, against the reference taken from unmodified HEAD today", async ({ page }) => {
  test.setTimeout(360_000);
  /* ⚠️ THE REFERENCE IS DATE-BOUND AND IS REFUSED THE DAY AFTER IT WAS TAKEN. This board draws a
     rolling window centred on today, so a reference captured yesterday differs at every width with
     no code change at all — and the failure reads as damage from whatever the next session happened
     to be doing. Measured once already in this repo: a byte-identical calendar reference differed
     at three widths overnight, first rail date 29 → 30, every bar left by one day's 8.98px. The
     capture stamps its own date; this refuses to compare against any other. */
  const stamp = `${REF}/captured.json`;
  expect(existsSync(stamp), "no capture stamp — take the reference from unmodified HEAD, today").toBe(true);
  const captured = JSON.parse(readFileSync(stamp, "utf8")).captured as string;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  expect(captured,
    `the reference was captured on ${captured} and it is ${iso} — the board's window has moved; ` +
    "re-capture it from unmodified HEAD before comparing").toBe(iso);

  const diffs: Record<string, unknown> = {};
  for (const w of [1280, 1440, 1920]) {
    const refBoard = `${REF}/todo-board-${w}.html`;
    const refWin = `${REF}/todo-winbar-${w}.html`;
    /* ⚠️ THE REFERENCE IS DATE-BOUND AND IS NEVER CARRIED BETWEEN RUNS. This board draws a rolling
       window centred on today, so a reference captured yesterday differs at every width with no
       code change at all. If it is missing, the run says so rather than skipping. */
    expect(existsSync(refBoard), `no reference for ${w} — capture it from HEAD, today`).toBe(true);

    await openCalendar(page, "todo", w);
    const now = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-cal-live]")!;
      const R = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
      return {
        board: root.querySelector<HTMLElement>(".tl-cal.tl-board")?.outerHTML ?? "",
        winbar: root.querySelector<HTMLElement>(".tl-winbar")?.outerHTML ?? "",
        geom: { board: R(root.querySelector(".tl-cal.tl-board")), winbar: R(root.querySelector(".tl-winbar")),
                rows: R(root.querySelector(".tl-rows")), rail: R(root.querySelector(".tl-rail")) },
      };
    });

    /* ⚠️ THE WINBAR IS BYTE-IDENTICAL, FULL STOP. Nothing in this run touches it. */
    expect(now.winbar, `To-do's winbar changed at ${w}`).toBe(readFileSync(refWin, "utf8"));

    /* ⚠️ THE BOARD DIFFERS BY EXACTLY ONE THING, AND THE CASE NAMES IT. §1's diagnosis found the
       fault in the BOARD rather than in the Queries host — the two hosts measured identical — so
       To-do changes too, and the only permitted difference is the state a past stage now
       publishes. Anything else is a regression wearing a reference's clothes. */
    const before = readFileSync(refBoard, "utf8");
    const normalise = (s: string) => s.replace(/ data-st="[a-z]+"/g, "");
    expect(normalise(now.board), `To-do's board changed at ${w} by more than the stage's state`).toBe(normalise(before));
    const added = (now.board.match(/ data-st="[a-z]+"/g) ?? []).length;
    const stages = (now.board.match(/class="tl-jc/g) ?? []).length;
    expect(added, `${added} state attributes against ${stages} past stages at ${w}`).toBe(stages);
    expect(added, "no stage published a state — the reference comparison proved nothing").toBeGreaterThan(0);
    diffs[`w${w}`] = { added, stages, geom: now.geom };
    console.log(`  §5 ${w}: winbar identical; board identical but ${added} \`data-st\` on ${stages} stages`);

    /* geometry unchanged — a fill and a z-index move no boxes */
    const refGeom = JSON.parse(readFileSync(`${REF}/todo-diagnosis.json`, "utf8"))[`w${w}`].geom;
    for (const key of ["board", "winbar", "rows", "rail"] as const) {
      for (const dim of ["x", "y", "w", "h"] as const) {
        expect(Math.abs((now.geom as never as Record<string, Record<string, number>>)[key][dim] - refGeom[key][dim]),
          `To-do's ${key}.${dim} moved at ${w}: ${refGeom[key][dim]} → ${(now.geom as never as Record<string, Record<string, number>>)[key][dim]}`)
          .toBeLessThanOrEqual(0.5);
      }
    }
  }
  writeFileSync(`${SHOTS}/../calendar-fixes-todo-parity.json`, JSON.stringify(diffs, null, 2));
});

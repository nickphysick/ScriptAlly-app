/**
 * v60 — THE CHASSIS AND THE CARD, MEASURED ON THE RENDERED BOARD.
 *
 * ⚠️ EVERY NUMBER IS READ FROM THE REF AT TEST TIME, never typed here. `refValues` parses
 * `design-refs/timeline-v60.html`, which `check-design-refs` guards, so the assertion and the
 * design cannot come apart and a retune moves both together.
 *
 * ⚠️ AND EVERY SWEEP STATES ITS POPULATION FIRST. The rail's tiles silently emptied during this
 * build — `todayAt` is a fractional day midpoint, so `visible[2.5]` was `undefined` on every
 * iteration — and a green build, a clean typecheck and a passing suite all reported nothing. A
 * probe that finds no element reports no offence; only a count does.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { refTokens, refRule, refColour } from "./refValues";

const CAL = "/todo/calendar";

test.describe("v60 · the chassis", () => {
  test("⚠️ the rail is STATIC above a scrolling rows region — nothing can pass above it", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const rows = document.querySelector<HTMLElement>(".tl-rows");
      if (!rail || !rows) return null;
      return {
        railPos: getComputedStyle(rail).position,
        railTop: rail.getBoundingClientRect().top,
        rowsOverflow: getComputedStyle(rows).overflowY,
        scrollable: rows.scrollHeight - rows.clientHeight,
      };
    });
    expect(before, "the board has no rail or no rows region").not.toBeNull();
    /* Law 4 and lock (e): the rail is outside the scroller, so it cannot be reached by scrolling —
       a claim about STRUCTURE. `sticky` pins by clamping, which is a different mechanism with a
       different failure: on a board with nothing to scroll the clamp is all that is left. */
    expect(before!.railPos, "the rail is not static — v60 forbids sticky anywhere on this board")
      .toBe("relative");
    expect(before!.rowsOverflow).toBe("auto");
    /* ⚠️ THE PRECONDITION FIRST: a scroll test on a region with nothing to scroll passes by
       measuring nothing. This is reported rather than asserted — whether the harness account
       happens to hold enough rows today is a fact about the fixture, not about the page. */
    console.log(`rows region can scroll by ${Math.round(before!.scrollable)}px`);
    if (before!.scrollable > 40) {
      await page.evaluate(() => { document.querySelector<HTMLElement>(".tl-rows")!.scrollTop = 400; });
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => ({
        railTop: document.querySelector<HTMLElement>(".tl-rail")!.getBoundingClientRect().top,
        rowsTop: document.querySelector<HTMLElement>(".tl-rows")!.scrollTop,
      }));
      expect(after.rowsTop, "the rows region did not actually scroll").toBeGreaterThan(100);
      expect(Math.abs(after.railTop - before!.railTop), "the rail moved when the rows scrolled")
        .toBeLessThan(1);
    }
  });

  test("⚠️ the board paints no field, and the rail carries the tone instead", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const seen = await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>(".tl-board");
      const r = document.querySelector<HTMLElement>(".tl-rail");
      if (!b || !r) return null;
      const cs = getComputedStyle(b);
      return {
        boardBg: cs.backgroundColor,
        boardRadius: cs.borderTopLeftRadius,
        railBg: getComputedStyle(r).backgroundColor,
      };
    });
    expect(seen).not.toBeNull();
    /* v60's `.board` is `background: transparent; border: none; border-radius: 0` */
    expect(seen!.boardBg, "the board still paints a field").toBe("rgba(0, 0, 0, 0)");
    expect(seen!.boardRadius).toBe("0px");
    expect(seen!.railBg, "the rail is transparent — row text would read through it")
      .not.toBe("rgba(0, 0, 0, 0)");
  });

  test("⚠️ the rail draws week tiles, and the count is asserted before anything else", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rail = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll<HTMLElement>(".tl-rtile")];
      const now = tiles.filter((t) => t.classList.contains("now"));
      return {
        count: tiles.length,
        nowCount: now.length,
        nowBg: now.length ? getComputedStyle(now[0]).backgroundColor : null,
        plainBg: tiles.length ? getComputedStyle(tiles.find((t) => !t.classList.contains("now"))!).backgroundColor : null,
        radius: tiles.length ? getComputedStyle(tiles[0]).borderTopLeftRadius : null,
        dayFamily: tiles.length ? getComputedStyle(tiles[0].querySelector("b")!).fontFamily : null,
        monFamily: tiles.length ? getComputedStyle(tiles[0].querySelector("i")!).fontFamily : null,
        ticks: document.querySelectorAll(".tl-tick").length,
      };
    });
    /* ⚠️ THE POPULATION, FIRST. A 90-day window stepped weekly is twelve or thirteen tiles; zero
       is what this board rendered for one build, silently. */
    expect(rail.count, "the rail rendered no week tiles").toBeGreaterThan(8);
    /* exactly one tile is today's week — two would mean the anchoring lost its stride */
    expect(rail.nowCount, "today's week is not marked exactly once").toBe(1);
    expect(rail.nowBg).not.toBe(rail.plainBg);
    /* ⚠️ NO FALLBACK. `refRule` returns CSS property names as written, so `.borderRadius` was
       `undefined` and `?? "10px"` made the assertion pass on the fallback rather than on the ref —
       a lock asserting its own default, which this repo has already been caught by once. */
    const tileRadius = refRule(".rtile")["border-radius"];
    expect(tileRadius, "the ref's .rtile declares no border-radius").toBeTruthy();
    expect(rail.radius).toBe(tileRadius);
    expect(rail.dayFamily, "the tile's numeral is not Playfair").toMatch(/Playfair/);
    expect(rail.monFamily, "the tile's month is not the mono face").toMatch(/JetBrains|mono/i);
    /* v60 sets `.wktick { display: none }` under tiles — a tile IS the mark on its date */
    expect(rail.ticks, "ticks are still drawn beneath the tiles").toBe(0);
  });
});

test.describe("v60 · the sections", () => {
  test("⚠️ six sections, each a container with a tinted header and a numbered side", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const secs = await page.evaluate(() => {
      const vis = [...document.querySelectorAll<HTMLElement>(".tl-grp[data-sec]")]
        .filter((e) => e.getBoundingClientRect().height > 0);
      return vis.map((e) => {
        const head = e.querySelector<HTMLElement>(".tl-gt")!;
        const nums = [...e.querySelectorAll<HTMLElement>(".tl-gnum span")];
        return {
          sec: e.dataset.sec!,
          headBg: getComputedStyle(head).backgroundColor,
          headFamily: getComputedStyle(head).fontFamily,
          numsBg: getComputedStyle(e.querySelector<HTMLElement>(".tl-gnums")!).backgroundColor,
          rows: e.querySelectorAll(".tl-rrow").length,
          nums: nums.length,
          numText: nums.map((n) => n.textContent ?? ""),
          grpBg: getComputedStyle(e).backgroundColor,
        };
      });
    });
    expect(secs.length, "no sections rendered").toBeGreaterThan(2);
    const numbers: string[] = [];
    for (const s of secs) {
      expect(s.nums, `${s.sec}: ${s.nums} numbers against ${s.rows} rows`).toBe(s.rows);
      expect(s.headBg, `${s.sec}'s header is untinted`).not.toBe("rgba(0, 0, 0, 0)");
      /* ⚠️ THIS ASSERTED THE OPPOSITE YESTERDAY AND WAS WRONG, WHICH IS WHY IT WENT RED. I built
         the tint onto both the header and the number column from the ref's per-section rule, and
         missed that its base `.gnums` carries `background: transparent !important` — which beats
         that rule outright, since `!important` outranks specificity. The column sits on the page
         tone. The painted-pixel check lives in `calFidelity60`; this one states the relation. */
      expect(s.numsBg, `${s.sec}'s number column is filled`).toBe("rgba(0, 0, 0, 0)");
      expect(s.headBg, `${s.sec}'s header is the same tone as its body`).not.toBe(s.grpBg);
      expect(s.headFamily, `${s.sec}'s heading is not Playfair`).toMatch(/Playfair/);
      numbers.push(...s.numText);
    }
    /* ⚠️ THE NUMBERS ARE A CENSUS OF THE BOARD, NOT SIX RESTARTS — zero-padded and continuous */
    expect(numbers[0]).toBe("01");
    expect(numbers.map((n) => Number(n))).toEqual(numbers.map((_, i) => i + 1));
    expect(numbers.every((n) => n.length >= 2), `a number is not zero-padded: ${numbers.join(",")}`)
      .toBe(true);
    /* every tinted header is a DISTINCT tone — six sections reading one colour say nothing */
    const tones = new Set(secs.map((s) => s.headBg));
    expect(tones.size, `${secs.length} sections share ${tones.size} tone(s)`).toBe(secs.length);
  });
});

test.describe("v60 · the card", () => {
  test("⚠️ the badge is a StatusDot at the ref's size, and it bursts past the card's left edge", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* ⚠️ NO FALLBACK — THIS ONE WAS PASSING ON ITS OWN. `refTokens` read only the ref's FIRST
       `:root` and v60 declares three, so `--badge` came back undefined and `?? "58px"` asserted a
       number typed into the test against a ref it never read. Second instance of that shape in this
       file; the helper is fixed, and the fallback is gone so it cannot recur here. */
    const badgeTok = refTokens()["--badge"];
    expect(badgeTok, "the ref pins no --badge").toBeTruthy();
    const want = Number(badgeTok.replace("px", ""));
    const cards = await page.evaluate(() => {
      const out: { badgeW: number; badgeH: number; over: number; svg: boolean; bodyLeft: number; transform: string }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const m = c.querySelector<HTMLElement>(".tl-medal");
        const b = c.querySelector<HTMLElement>(".tl-cardbody");
        if (!m || !b) continue;
        const cr = c.getBoundingClientRect(), mr = m.getBoundingClientRect();
        if (cr.height < 1 || c.classList.contains("fadeL")) continue;
        const svg = m.querySelector("svg");
        out.push({
          badgeW: Math.round(mr.width), badgeH: Math.round(mr.height),
          over: Math.round(cr.left - mr.left),
          svg: !!svg,
          bodyLeft: Math.round(b.getBoundingClientRect().left - cr.left),
          transform: svg ? getComputedStyle(svg).transform : "none",
        });
      }
      return out;
    });
    expect(cards.length, "no cards carried a badge").toBeGreaterThan(3);
    for (const c of cards) {
      expect(c.svg, "the badge is not an SVG — StatusDot draws one").toBe(true);
      expect(c.badgeW, `the badge is ${c.badgeW}px, the ref's --badge is ${want}px`).toBe(want);
      expect(c.badgeH).toBe(want);
      /* ⚠️ THE OVERHANG IS 35% OF THE BADGE — read from the ref's own expression, not typed */
      expect(c.over, `the badge stands ${c.over}px proud, the ref's 35% is ${Math.round(want * 0.35)}px`)
        .toBeGreaterThan(Math.round(want * 0.3));
      /* ⚠️ SIZED BY width/height, NEVER A TRANSFORM (Law 8) — some engines ignore one on an SVG */
      expect(c.transform, "the badge is scaled by a CSS transform").toMatch(/^none$|matrix\(1, 0, 0, 1, 0, 0\)/);
      /* the words clear the badge: 66% of it plus 10px */
      expect(c.bodyLeft, `the words start at ${c.bodyLeft}px and the badge needs ${Math.round(want * 0.66) + 10}px`)
        .toBeGreaterThanOrEqual(Math.round(want * 0.66) + 8);
    }
  });

  test("⚠️ the card frame carries BOTH the ref's shadow layers, and a faded one hands them to a sibling", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const want = refRule(".frame")["box-shadow"];
    expect(want, "the ref's .frame declares no box-shadow").toBeTruthy();
    const layers = (want.match(/rgba\(/g) ?? []).length;
    expect(layers, "the ref's frame shadow did not parse").toBe(2);
    const seen = await page.evaluate(() => {
      const out: { faded: boolean; frameSh: string; shd: string | null }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        if (c.getBoundingClientRect().height < 1) continue;
        const f = c.querySelector<HTMLElement>(".tl-frame");
        if (!f) continue;
        const shd = c.querySelector<HTMLElement>(".tl-shd");
        out.push({
          faded: c.classList.contains("fadeR") || c.classList.contains("fadeL"),
          frameSh: getComputedStyle(f).boxShadow,
          shd: shd ? getComputedStyle(shd).boxShadow : null,
        });
      }
      return out;
    });
    const plain = seen.filter((s) => !s.faded);
    const faded = seen.filter((s) => s.faded);
    /* ⚠️ BOTH BRANCHES MUST BE ENTERED. A sweep where every card is in one state proves only that
       one state behaves — the monoculture fault this repo records against a census of eleven
       identical strips. */
    expect(plain.length, "no unfaded card on the board — the shadow claim is untested").toBeGreaterThan(0);
    expect(faded.length, "no faded card on the board — the handover claim is untested").toBeGreaterThan(0);
    for (const p of plain) {
      expect((p.frameSh.match(/rgba\(/g) ?? []).length,
        `an unfaded frame has ${(p.frameSh.match(/rgba\(/g) ?? []).length} shadow layer(s), the ref has 2`).toBe(2);
    }
    for (const f of faded) {
      /* ⚠️ THE MASK IS GONE AND THIS IS WHY: a mask clips the box-shadow with the paint, so a faded
         card lost the lift layer entirely. The frame drops its shadow and a sibling carries it. */
      expect(f.frameSh, "a faded frame still carries its own shadow").toBe("none");
      expect(f.shd, "a faded card has no shadow sibling — it is flat at the dissolve").not.toBeNull();
      expect((f.shd!.match(/rgba\(/g) ?? []).length).toBe(2);
    }
  });

  test("⚠️ no mask anywhere on this board, and none on any text-bearing element (Law 2)", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const masked = await page.evaluate(() => {
      const out: string[] = [];
      const board = document.querySelector(".tl-board");
      if (!board) return ["no board"];
      let n = 0;
      for (const el of board.querySelectorAll<HTMLElement>("*")) {
        n++;
        const cs = getComputedStyle(el);
        const mi = cs.maskImage || (cs as unknown as Record<string, string>).webkitMaskImage;
        if (mi && mi !== "none") out.push(`${el.className.toString().slice(0, 40)}: ${mi.slice(0, 40)}`);
      }
      return out.length ? out : [`__swept:${n}`];
    });
    /* the population, so a clean answer cannot mean "I measured nothing" */
    const sweptTag = masked.find((m) => m.startsWith("__swept:"));
    expect(sweptTag, `the sweep found offenders rather than a count: ${masked.join(" | ")}`).toBeTruthy();
    expect(Number(sweptTag!.split(":")[1]), "the board has almost no elements — nothing was swept")
      .toBeGreaterThan(50);
  });
});

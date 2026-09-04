/**
 * v62 — the scheme, the rail, the badges and the dividers.
 *
 * ⚠️ THE SCHEME'S CLAIM IS THAT NOTHING PAINTS ITS OWN COLOUR, so these read COMPUTED values off
 * the rendered board and compare elements against each other rather than against typed hexes. A
 * lock that pinned the greige values would go red on a legitimate retone, which is the opposite of
 * what it is for; a lock that says "the rows' ground IS the dividers' ground" survives any scheme.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test.describe("v62 · the scheme", () => {
  test("⚠️ (1) one ground below the rail, white cards, and shadows tinted to the ground", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const cal = document.querySelector<HTMLElement>(".tl-cal");
      const rows = document.querySelector<HTMLElement>(".tl-rows");
      const div = document.querySelector<HTMLElement>(".tl-gdiv .gp");
      const lanes = [...document.querySelectorAll<HTMLElement>(".tl-glanes")];
      const grps = [...document.querySelectorAll<HTMLElement>(".tl-grp")];
      const frames = [...document.querySelectorAll<HTMLElement>(".tl-p")]
        .filter((c) => c.getBoundingClientRect().height > 0
          && !["shut", "closedp", "quiet", "ghost"].some((k) => c.classList.contains(k)))
        .map((c) => {
          const fr = c.querySelector<HTMLElement>(".tl-frame")!;
          /* ⚠️ THE SHADOW LIVES ON WHICHEVER ELEMENT IS CARRYING IT. A card that ends in a chevron
             drops its frame's shadow and hands it to a `.tl-shd` sibling clipped to the tail's
             outline — so reading the frame alone reports "none" on every ongoing card, which is the
             mechanism working rather than a missing shadow. */
          const shd = c.querySelector<HTMLElement>(".tl-shd");
          const frSh = getComputedStyle(fr).boxShadow;
          return {
            bg: getComputedStyle(fr).backgroundColor,
            sh: frSh !== "none" ? frSh : (shd ? getComputedStyle(shd).boxShadow : "none"),
          };
        });
      return {
        cal: cal ? getComputedStyle(cal).backgroundColor : null,
        rows: rows ? getComputedStyle(rows).backgroundColor : null,
        div: div ? getComputedStyle(div).backgroundColor : null,
        lanes: lanes.map((e) => getComputedStyle(e).backgroundColor),
        grps: grps.map((e) => getComputedStyle(e).backgroundColor),
        frames,
      };
    });
    expect(f.frames.length, "no live card on the board").toBeGreaterThan(3);
    /* ⚠️ ONE GROUND. The container's interior, the rows area and the divider label are the same
       colour — v61 had the container white, the rows transparent and the dividers tinted, which is
       three surfaces where the design has one. */
    expect(f.rows, "the rows area is not the container's ground").toBe(f.cal);
    expect(f.div, "the divider label is not on the ground").toBe(f.cal);
    /* and nothing between them paints at all */
    for (const l of f.lanes) expect(l, "a lane paints its own ground").toBe("rgba(0, 0, 0, 0)");
    for (const g of f.grps) expect(g, "a group paints its own ground").toBe("rgba(0, 0, 0, 0)");
    for (const fr of f.frames) {
      expect(fr.bg, "a live card is not white").toBe("rgb(255, 255, 255)");
      /* ⚠️ THE SHADOW IS TINTED TO THE GROUND, NEVER WARM-ON-COOL. A brown shadow on a cool ground
         reads as dirt — the same law this repo records for the sage desk. Greige's shadow is
         rgba(40,36,30,…); every earlier version of this board used rgba(58,28,20,…). */
      const chans = [...fr.sh.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)]
        .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
      expect(chans.length, `a card's shadow parsed to nothing: "${fr.sh}"`).toBeGreaterThan(0);
      for (const [r, g, b] of chans) {
        expect(r - b, `a card's shadow is warm (${r},${g},${b}) on a cool ground`).toBeLessThan(14);
      }
    }
  });

  test("⚠️ (2) the rail runs edge to edge, and its lane still matches the rows'", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const cal = document.querySelector<HTMLElement>(".tl-cal");
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const railLane = document.querySelector<HTMLElement>(".tl-rail .tl-c-tl");
      const rows = [...document.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl")]
        .filter((e) => e.getBoundingClientRect().width > 100);
      if (!cal || !rail) return null;
      const cr = cal.getBoundingClientRect();
      const cs = getComputedStyle(cal);
      const rr = rail.getBoundingClientRect();
      const lr = railLane?.getBoundingClientRect();
      return {
        interiorL: cr.left + parseFloat(cs.borderLeftWidth),
        interiorR: cr.right - parseFloat(cs.borderRightWidth),
        railL: rr.left, railR: rr.right,
        railH: Math.round(rr.height),
        tok: Math.round(parseFloat(getComputedStyle(document.querySelector(".tl-board")!).getPropertyValue("--tl-rail-h"))),
        railLane: lr ? { l: lr.left, w: lr.width } : null,
        rows: rows.map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, w: b.width }; }),
      };
    });
    expect(f, "no container or rail").not.toBeNull();
    /* the board has no side padding — the date row is the container's full width */
    expect(Math.abs(f!.railL - f!.interiorL), "the rail is inset from the container's left")
      .toBeLessThan(1.5);
    expect(Math.abs(f!.railR - f!.interiorR), "the rail is inset from the container's right")
      .toBeLessThan(1.5);
    expect(f!.railH, `the rail is ${f!.railH}px against the token's ${f!.tok}px`).toBe(f!.tok);
    /* ⚠️ THE SEAM SURVIVES THE EDGE-TO-EDGE CHANGE. Removing the board's padding moves the rail's
       box; its LANE must still begin where every row's does, which is the fault that had the whole
       board 91px out in v60. */
    expect(f!.rows.length, "no row lanes to compare against").toBeGreaterThan(3);
    for (const r of f!.rows) {
      expect(Math.abs(r.l - f!.railLane!.l), "a row's lane does not start where the rail's does")
        .toBeLessThan(1.5);
      expect(Math.abs(r.w - f!.railLane!.w), "a row's lane is not the width of the rail's")
        .toBeLessThan(1.5);
    }
  });

  test("⚠️ (3) two tiers, one rose circle, and no month line below the rail", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const days = [...document.querySelectorAll<HTMLElement>(".tl-dt")];
      const now = days.filter((d) => d.classList.contains("now"));
      const mons = [...document.querySelectorAll<HTMLElement>(".tl-mlab")];
      const plain = days.find((d) => !d.classList.contains("now"));
      return {
        days: days.length, now: now.length, mons: mons.length,
        tiles: document.querySelectorAll(".tl-rtile").length,
        ticks: document.querySelectorAll(".tl-tick").length,
        divs: document.querySelectorAll(".tl-mdiv").length,
        nowBg: now[0] ? getComputedStyle(now[0]).backgroundColor : null,
        nowInk: now[0] ? getComputedStyle(now[0]).color : null,
        plainBg: plain ? getComputedStyle(plain).backgroundColor : null,
        monSep: mons[0] ? getComputedStyle(mons[0]).borderLeftWidth : null,
        monFam: mons[0] ? getComputedStyle(mons[0]).fontFamily : null,
        /* the month separator must exist in the RAIL and nowhere below it */
        colsBelow: [...document.querySelectorAll<HTMLElement>(".tl-rows .tl-col, .tl-rows .col")].length,
        capShown: (() => { const c = document.querySelector<HTMLElement>(".tl-todayflag"); return c ? getComputedStyle(c).display !== "none" : false; })(),
      };
    });
    expect(f.days, "the rail draws no day numerals").toBeGreaterThan(8);
    expect(f.mons, "the rail draws no month tier").toBeGreaterThan(1);
    /* ⚠️ EXACTLY ONE ROSE CIRCLE while today is in the window — two would mean the anchoring lost
       its stride, and it is the only colour the rail is allowed. */
    expect(f.now, `the rail marks today ${f.now} times`).toBe(1);
    expect(f.nowBg, "today's numeral is not filled").not.toBe("rgba(0, 0, 0, 0)");
    expect(f.nowInk, "today's numeral is not reversed out").toBe("rgb(255, 255, 255)");
    expect(f.plainBg, "an ordinary numeral is filled — today is the rail's only colour")
      .toBe("rgba(0, 0, 0, 0)");
    expect(f.monFam, "the month tier is not the mono face").toMatch(/JetBrains|mono/i);
    expect(parseFloat(f.monSep ?? "0"), "the month label carries no separator").toBeGreaterThan(0);
    /* the retired furniture */
    expect(f.tiles, "the tile rail is still drawn").toBe(0);
    expect(f.ticks, "ticks are still drawn").toBe(0);
    expect(f.divs, "a month divider element is still drawn").toBe(0);
    expect(f.colsBelow, "a month line runs down through the rows").toBe(0);
    expect(f.capShown, "the today cap is drawn over the rail's own circle").toBe(false);
  });

  test("⚠️ (4,5) badges at the token, dividers in ink with no fill", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const tok = Math.round(parseFloat(
        getComputedStyle(document.querySelector(".tl-board")!).getPropertyValue("--badge")));
      const meds = [...document.querySelectorAll<HTMLElement>(".tl-medal")]
        .filter((m) => m.getBoundingClientRect().height > 0);
      const stage = [...document.querySelectorAll<HTMLElement>(".tl-jmed")]
        .filter((m) => m.getBoundingClientRect().height > 0);
      const gps = [...document.querySelectorAll<HTMLElement>(".tl-gdiv .gp")]
        .filter((g) => g.getBoundingClientRect().height > 0);
      const cal = document.querySelector<HTMLElement>(".tl-cal");
      return {
        tok,
        badges: meds.map((m) => ({ h: Math.round(m.getBoundingClientRect().height), svg: !!m.querySelector("svg") })),
        stages: stage.map((m) => Math.round(m.getBoundingClientRect().height)),
        ground: cal ? getComputedStyle(cal).backgroundColor : "",
        pills: gps.map((g) => ({
          bg: getComputedStyle(g).backgroundColor,
          fam: getComputedStyle(g).fontFamily,
          ink: getComputedStyle(g).color,
          ico: g.querySelector("svg") ? getComputedStyle(g.querySelector("svg")!).color : "",
          num: g.querySelector("b") ? getComputedStyle(g.querySelector("b")!).color : "",
        })),
      };
    });
    expect(f.badges.length, "no badges on the board").toBeGreaterThan(3);
    for (const b of f.badges) {
      expect(b.svg, "a badge is not an SVG — StatusDot draws one").toBe(true);
      expect(b.h, `a badge is ${b.h}px against the token's ${f.tok}px`).toBe(f.tok);
    }
    /* past-stage dots are smaller again; reported rather than asserted where none is on screen */
    console.log(`past-stage badges: ${f.stages.length}${f.stages.length ? ` at ${f.stages[0]}px` : ""}`);
    for (const h of f.stages) expect(h, `a past-stage badge is ${h}px`).toBeLessThan(f.tok);

    expect(f.pills.length, "no divider labels").toBeGreaterThan(2);
    for (const p of f.pills) {
      /* ⚠️ NO TINTED PILL — the label sits ON the ground, and that is also what draws the hairline
         "from the label to the right edge": the opaque label masks the rule behind itself. */
      expect(p.bg, "a divider label still carries a tint").toBe(f.ground);
      expect(p.fam, "a divider name is not Playfair").toMatch(/Playfair/);
      /* name and icon are both the ink token, so the divider reads as one label */
      expect(p.ico, `a divider's icon (${p.ico}) is not its name's ink (${p.ink})`).toBe(p.ink);
      expect(p.num, "a divider's count is not muted against its name").not.toBe(p.ink);
    }
  });
});

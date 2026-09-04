/**
 * v60d Phase 1 — the probe.
 *
 * ⚠️ THE CAP'S DATE IS ASSERTED AGAINST THE RAIL'S OWN TILES, not against arithmetic repeated in
 * this file. Two independent derivations checked against each other is the only form that can
 * catch both of them being wrong; a lock that recomputes the date the way the page does would
 * agree with the page however wrong the page is.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test.describe("v60d · the alignment contract", () => {
  test("⚠️ the rail's lane and every row's lane are THE SAME BOX — this is the seam nothing watched", async ({ page }) => {
    /**
     * ⚠️ THE WHOLE BOARD WAS 91px OUT AND EVERY LOCK WAS GREEN.
     *
     * v60 gave the rows a number column and a badge gutter and never gave the rail its matching
     * spacer: measured, the rail's lane at x=287 width 1090 against a row's at x=378 width 999.
     * Every bar, flag and trail sat 91px right of the date the rail named — a whole week and more.
     *
     * ⚠️ AND IT SURVIVED BECAUSE EVERY OTHER LOCK MEASURES WITHIN ONE SYSTEM. Tiles against tiles.
     * Cards against the today line, which is itself placed from a row's lane. Trails against
     * today. Each was internally consistent and all of them were consistent with the same wrong
     * origin. A lock that never crosses a seam cannot see the seam — which is what this one is for,
     * and it is why it is a rendered measurement rather than a check that both read one token.
     */
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const lanes = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".tl-rail .tl-c-tl");
      const rows = [...document.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl")]
        .filter((e) => e.getBoundingClientRect().width > 100);
      const r = rail?.getBoundingClientRect();
      return {
        rail: r ? { l: r.left, w: r.width } : null,
        rows: rows.map((e) => {
          const b = e.getBoundingClientRect();
          return { l: b.left, w: b.width };
        }),
      };
    });
    expect(lanes.rail, "the rail has no timeline lane").not.toBeNull();
    expect(lanes.rows.length, "no row lanes to compare against").toBeGreaterThan(3);
    for (const row of lanes.rows) {
      expect(Math.abs(row.l - lanes.rail!.l),
        `a row's lane starts ${Math.round(row.l - lanes.rail!.l)}px from the rail's`)
        .toBeLessThan(1.5);
      expect(Math.abs(row.w - lanes.rail!.w),
        `a row's lane is ${Math.round(row.w - lanes.rail!.w)}px wider than the rail's`)
        .toBeLessThan(1.5);
    }
  });
});

test.describe("v60d · navigation", () => {
  test("⚠️ the name opens the relationship, and the card keeps its own job", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const links = await page.evaluate(() => {
      const out: { name: string; tag: string; focusable: boolean; sameFont: boolean }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        if (c.getBoundingClientRect().height < 1) continue;
        const n = c.querySelector<HTMLElement>(".tl-fnm");
        if (!n) continue;
        const cs = getComputedStyle(n);
        out.push({
          name: n.textContent ?? "",
          tag: n.tagName,
          focusable: n.tagName === "BUTTON" || n.hasAttribute("tabindex"),
          /* the link must look exactly like the name — the affordance is the hover underline */
          sameFont: cs.fontSize === "14.5px" && cs.fontWeight === "600",
        });
      }
      return out;
    });
    expect(links.length, "no card carries a name").toBeGreaterThan(5);
    for (const l of links) {
      /* ⚠️ A BUTTON, NOT A CLICK HANDLER ON A SPAN. A name that navigates must be reachable by Tab
         and announceable as an action; a span with an onClick is neither. */
      expect(l.tag, `"${l.name}" is a ${l.tag}, not a button`).toBe("BUTTON");
      expect(l.focusable, `"${l.name}" cannot be reached by keyboard`).toBe(true);
      expect(l.sameFont, `"${l.name}" does not look like the name it replaces`).toBe(true);
    }

    /* ⚠️ AND IT ACTUALLY NAVIGATES — asserted by driving it, not by reading the handler. */
    const before = page.url();
    await page.locator(".tl-p .tl-fnm").first().click();
    await page.waitForTimeout(700);
    const after = page.url();
    expect(after, `clicking a name left the reader at ${after}`).not.toBe(before);
    expect(after, "a name did not open the relationship workspace").toContain("/queries");
    expect(after, "the workspace opened without naming which relationship").toMatch(/[?&]q=/);
  });
});

test.describe("v60d · the probe", () => {
  test("⚠️ the cap reads the date the rail says is there — sampled on three tiles", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* the rail's tiles ARE the board's statement about which date sits at which x */
    const tiles = await page.evaluate(() => {
      const lane = [...document.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl")]
        .find((e) => e.getBoundingClientRect().width > 100);
      const r = lane?.getBoundingClientRect();
      return {
        y: r ? r.top + r.height / 2 : null,
        tiles: [...document.querySelectorAll<HTMLElement>(".tl-rtile")].map((t) => {
          const b = t.getBoundingClientRect();
          return {
            x: b.left + b.width / 2,
            day: t.querySelector("b")?.textContent ?? "",
            mon: t.querySelector("i")?.textContent ?? "",
          };
        }),
      };
    });
    expect(tiles.y, "no lane to hover").not.toBeNull();
    /* ⚠️ THREE SAMPLES, AND ONE OF THEM CROSSES A MONTH BOUNDARY — a stride that is right inside
       one month and wrong across a boundary is the shape a date sweep misses. */
    expect(tiles.tiles.length, "the rail rendered no tiles to sample").toBeGreaterThan(6);
    const months = new Set(tiles.tiles.map((t) => t.mon));
    expect(months.size, "every tile is in one month — the boundary sample is impossible")
      .toBeGreaterThan(1);
    const picks = [
      tiles.tiles[1],
      tiles.tiles[Math.floor(tiles.tiles.length / 2)],
      /* the first tile of a month that is not the first tile's month */
      tiles.tiles.find((t, i) => i > 0 && t.mon !== tiles.tiles[i - 1].mon)!,
    ];
    expect(picks.every(Boolean), "could not pick three tiles").toBe(true);

    for (const p of picks) {
      await page.mouse.move(p.x, tiles.y!);
      await page.waitForTimeout(120);
      const seen = await page.evaluate(() => {
        const lab = document.querySelector<HTMLElement>(".tl-xhlab");
        const xh = document.querySelector<HTMLElement>(".tl-xh");
        return {
          text: lab?.textContent ?? null,
          labX: lab ? lab.getBoundingClientRect().left + lab.getBoundingClientRect().width / 2 : null,
          lineX: xh ? xh.getBoundingClientRect().left : null,
        };
      });
      expect(seen.text, `no probe cap at the ${p.day} ${p.mon} tile`).toBeTruthy();
      /* ⚠️ THE DAY NUMBER IS THE CLAIM; the month is checked case-insensitively because the tile
         states it uppercase and the cap states it as the app writes dates. */
      expect(seen.text!.replace(/\s+/g, " ").toLowerCase(),
        `the cap reads "${seen.text}" over the ${p.day} ${p.mon} tile`)
        .toContain(p.day.toLowerCase());
      expect(seen.text!.toLowerCase(), `the cap's month disagrees with the tile's`)
        .toContain(p.mon.slice(0, 3).toLowerCase());
      /* the line and the cap stand on the cursor, together */
      expect(Math.abs(seen.lineX! - p.x), "the probe line is not under the cursor").toBeLessThan(3);
      expect(Math.abs(seen.labX! - p.x), "the cap is not centred on its line").toBeLessThan(4);
    }
  });

  test("⚠️ the line passes UNDER the rail and the cap sits ON it, and both go when the cursor does", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const geo = await page.evaluate(() => {
      const lane = [...document.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl")]
        .find((e) => e.getBoundingClientRect().width > 100);
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const r = lane?.getBoundingClientRect();
      return r && rail ? {
        x: r.left + r.width * 0.4, y: r.top + r.height / 2,
        railZ: Number(getComputedStyle(rail).zIndex),
        railTop: rail.getBoundingClientRect().top,
      } : null;
    });
    expect(geo).not.toBeNull();
    await page.mouse.move(geo!.x, geo!.y);
    await page.waitForTimeout(120);
    const on = await page.evaluate(() => {
      const lab = document.querySelector<HTMLElement>(".tl-xhlab");
      const xh = document.querySelector<HTMLElement>(".tl-xh");
      return {
        labZ: lab ? Number(getComputedStyle(lab).zIndex) : null,
        lineZ: xh ? Number(getComputedStyle(xh).zIndex) : null,
        labTop: lab ? lab.getBoundingClientRect().top : null,
        labBg: lab ? getComputedStyle(lab).backgroundColor : null,
        dash: xh ? getComputedStyle(xh).borderLeftStyle : null,
      };
    });
    expect(on.lineZ, `the probe line at ${on.lineZ} would cut through the rail at ${geo!.railZ}`)
      .toBeLessThan(geo!.railZ);
    expect(on.labZ, `the cap at ${on.labZ} sits behind the rail at ${geo!.railZ}`)
      .toBeGreaterThan(geo!.railZ);
    /* ⚠️ ON THE RAIL, NOT ABOVE IT. It floated 18px high because `top: 0` resolves against the
       wrap's padding box, and the wrap pads its top for the flags. */
    expect(on.labTop! - geo!.railTop, `the cap sits ${Math.round(on.labTop! - geo!.railTop)}px from the rail's top`)
      .toBeGreaterThanOrEqual(0);
    expect(on.labTop! - geo!.railTop).toBeLessThan(12);
    /* ⚠️ AND IT IS NOT A NEAR-BLACK PILL. The only dark fill on a cream board read as a tooltip
       rather than as a date on a ruler, and the colour law forbids it besides. */
    expect(on.labBg, "the probe cap is filled dark").toBe("rgb(255, 255, 255)");
    expect(on.dash, "the probe line is not dashed").toBe("dashed");

    /* it goes when the cursor leaves the rows */
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);
    const off = await page.evaluate(() => ({
      lab: !!document.querySelector(".tl-xhlab"),
      line: !!document.querySelector(".tl-xh"),
    }));
    expect(off.lab, "the probe cap survives the cursor leaving").toBe(false);
    expect(off.line, "the probe line survives the cursor leaving").toBe(false);
  });
});

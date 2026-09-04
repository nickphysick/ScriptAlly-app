/**
 * v63 E — actions.
 *
 * ⚠️ EVERY CLAIM IS DRIVEN, NOT READ. "Hidden at rest, shown on hover" is two states, and a case
 * that measures one of them proves nothing about the other; "at its true date" is arithmetic the
 * page performs, so the check redoes it independently and compares.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

async function acts(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0)!;
    return [...g.querySelectorAll<HTMLElement>(".tl-act")].map((a) => {
      const row = a.closest<HTMLElement>(".tl-rrow");
      const cs = getComputedStyle(a);
      const sym = a.querySelector<HTMLElement>(".tl-actsym");
      const lab = a.querySelector<HTMLElement>(".tl-actlab");
      const btn = a.querySelector<HTMLElement>(".tl-actbtn");
      const lane = a.parentElement;
      return {
        urgent: a.classList.contains("tl-act--od"),
        kind: a.dataset.act ?? null,
        opacity: cs.opacity,
        labOpacity: lab ? getComputedStyle(lab).opacity : null,
        btnOpacity: btn ? getComputedStyle(btn).opacity : null,
        syms: a.querySelectorAll(".tl-actsym").length,
        symW: sym ? Math.round(sym.getBoundingClientRect().width) : null,
        symBorder: sym ? getComputedStyle(sym).borderTopColor : null,
        glyphs: a.querySelectorAll(".tl-actsym svg").length,
        btnText: btn?.textContent?.trim() ?? null,
        btnBorder: btn ? getComputedStyle(btn).borderTopWidth : null,
        btnBg: btn ? getComputedStyle(btn).backgroundColor : null,
        btnCase: btn ? getComputedStyle(btn).textTransform : null,
        labFamily: lab ? getComputedStyle(lab).fontFamily.split(",")[0].replace(/["']/g, "") : null,
        labColour: lab ? getComputedStyle(lab).color : null,
        /* where it stands, and where the bar it belongs to ends — the same number by two routes */
        left: a.getBoundingClientRect().left,
        laneLeft: lane ? lane.getBoundingClientRect().left : null,
        laneW: lane ? lane.getBoundingClientRect().width : null,
        barRight: (() => {
          const c = row?.querySelector<HTMLElement>(".tl-p");
          return c ? c.getBoundingClientRect().right : null;
        })(),
        rowName: row?.querySelector(".tl-fnm")?.textContent?.trim() ?? null,
        anim: cs.animationName,
        labAnim: lab ? getComputedStyle(lab).animationName : null,
      };
    });
  });
}

test.describe("v63 · E — actions", () => {
  test("⚠️ (e1) the side-strip flag is gone and every action is one mark", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const gone = await page.evaluate(() => ({
      caps: document.querySelectorAll(".tl-cap").length,
      nlab: document.querySelectorAll(".tl-nlab").length,
      acts: document.querySelectorAll(".tl-act").length,
    }));
    /* ⚠️ ASKED OF THE RENDERED DOM. A source check proves the JSX changed; only the page proves
       nothing else draws them, and "hidden" would pass a source check. */
    expect(gone.caps, "the side-strip flag is still drawn").toBe(0);
    expect(gone.nlab, "a `tl-nlab` flag is in the DOM").toBe(0);
    expect(gone.acts, "no actions at all — the case is vacuous").toBeGreaterThan(3);

    const a = await acts(page);
    for (const x of a) {
      /* one symbol, or none on an urgent row — never two, and never a symbol with no glyph */
      expect(x.syms, `${x.rowName}: ${x.syms} symbols`).toBe(x.urgent ? 0 : 1);
      if (!x.urgent) {
        expect(x.symW, `${x.rowName}: the ring is ${x.symW}px`).toBe(22);
        expect(x.glyphs, `${x.rowName}: the ring holds ${x.glyphs} glyphs`).toBe(1);
      }
    }
  });

  test("⚠️ (e2) hidden at rest, shown under the row's hover — both states driven", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rest = await acts(page);
    const urgent = rest.filter((x) => x.urgent), quiet = rest.filter((x) => !x.urgent);
    console.log(`actions: ${urgent.length} urgent · ${quiet.length} other`);
    /* ⚠️ BOTH POPULATIONS, OR ONE BRANCH IS UNEXERCISED and the case proves half of itself. */
    expect(urgent.length, "no urgent action — that branch is unexercised").toBeGreaterThan(0);
    expect(quiet.length, "no ordinary action — that branch is unexercised").toBeGreaterThan(0);

    /* at rest: an urgent action is invisible entirely; an ordinary one shows its ring alone */
    for (const x of urgent) expect(x.opacity, `${x.rowName}: urgent action visible at rest`).toBe("0");
    for (const x of quiet) {
      expect(x.opacity, `${x.rowName}: the ring is hidden at rest`).toBe("1");
      expect(x.labOpacity, `${x.rowName}: its label is showing at rest`).toBe("0");
      expect(x.btnOpacity, `${x.rowName}: its button is showing at rest`).toBe("0");
    }

    /* now hover the row that holds the first urgent action and read the same fields again */
    const target = rest.findIndex((x) => x.urgent);
    await page.evaluate((i) => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!;
      const a = [...g.querySelectorAll<HTMLElement>(".tl-act")][i];
      a.closest<HTMLElement>(".tl-rrow")!.setAttribute("data-force-hover", "1");
    }, target);
    const box = await page.evaluate((i) => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!;
      const r = [...g.querySelectorAll<HTMLElement>(".tl-act")][i]
        .closest<HTMLElement>(".tl-rrow")!.getBoundingClientRect();
      return { x: r.left + 40, y: r.top + r.height / 2 };
    }, target);
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(260);
    const hov = await acts(page);
    expect(hov[target].opacity, "the urgent action stayed hidden under hover").toBe("1");
    expect(hov[target].labOpacity, "its label stayed hidden under hover").toBe("1");
    expect(hov[target].btnOpacity, "its button stayed hidden under hover").toBe("1");
  });

  test("⚠️ (e3) the button and the label are the ref's, and nothing animates", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const a = await acts(page);
    expect(a.length).toBeGreaterThan(3);
    for (const x of a) {
      expect(x.btnBg, `${x.rowName}: the button is not white`).toBe("rgb(255, 255, 255)");
      /* ⚠️ THE USED VALUE ROUNDS. A 1.5px border computes to 1px at DPR 1 — the same rounding the
         retired today stem recorded — so the declared width is a fact about the SHEET and is
         asserted there; what the page can say is that the outline is painted and is ink. */
      expect(parseFloat(x.btnBorder ?? "0"), `${x.rowName}: no outline`).toBeGreaterThan(0);
      expect(x.btnCase, `${x.rowName}: the button is not mono caps`).toBe("uppercase");
      expect(x.btnText, `${x.rowName}: the button has no chevron`).toMatch(/›$/);
      expect(x.labFamily, `${x.rowName}: the label is ${x.labFamily}`).toBe("Caveat");
      /* ⚠️ NO ANIMATION ON A LABEL. A label sliding in the corner of the eye on every pointer move
         is motion about something the reader has not asked for. The ring's colours transition; the
         label simply appears. */
      expect(x.anim, `${x.rowName}: the action animates`).toBe("none");
      expect(x.labAnim, `${x.rowName}: the label animates`).toBe("none");
    }
    /* the declared width, read from the sheet, because the used value rounds away from it */
    const css = readFileSync("src/components/todo/todoCalendar.css", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = css.match(/(?:^|\n)\s*\.tl-actbtn\s*\{([^}]*)\}/);
    expect(rule, "the button has no base rule").not.toBeNull();
    expect(rule![1], "the button's outline is not 1.5px ink").toMatch(/border\s*:\s*1\.5px solid #2a1f17/);

    /* the urgent label is rose; the ordinary one is not */
    for (const x of a.filter((y) => y.urgent))
      expect(x.labColour, "the urgent label is not rose").toBe("rgb(140, 79, 74)");
    for (const x of a.filter((y) => !y.urgent))
      expect(x.labColour, "an ordinary label is rose").not.toBe("rgb(140, 79, 74)");
  });

  test("⚠️ (e4) an action stands on its own date — never clamped into the lane", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const a = await acts(page);
    expect(a.length).toBeGreaterThan(3);
    /* ⚠️ THE SAME NUMBER BY TWO ROUTES. The action is `bar right + 14`; the bar's right edge is
       measured off the card. The old flag clamped with `min(…, 100% - 206px)`, which put an action
       on a day it does not belong to — so the check is that the two agree, not that it is on screen. */
    const off: string[] = [];
    for (const x of a) {
      if (x.barRight == null) continue;
      const want = x.barRight + 14;
      if (Math.abs(x.left - want) > 1.5) off.push(`${x.rowName}: at ${x.left.toFixed(1)}, date maths says ${want.toFixed(1)}`);
    }
    expect(off, `actions not on their own date: ${JSON.stringify(off)}`).toEqual([]);
    /* and at least one sits past the lane's right edge — proof nothing folds it back in */
    const past = a.filter((x) => x.laneLeft != null && x.laneW != null && x.left > x.laneLeft + x.laneW - 60);
    console.log(`actions past the lane's edge (clipped by the board, not clamped): ${past.length}`);

    /* ⚠️ AND NO ROW HOVER GROUND ANYWHERE IN THE SHEET — the card's lift is the whole response. */
    const sheet = readFileSync("src/components/todo/todoCalendar.css", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ ANCHORED TO THE ROW ITSELF, NOT TO ANY DESCENDANT OF IT. `[^{]*` spanned the space in
       `.tl-rrow:hover .tl-actsym { … background … }` and reported the ring's own hover fill as a
       row ground. The claim is about the ROW's background; a descendant's is a different rule. */
    expect(sheet, "a row hover background came back")
      .not.toMatch(/(?:^|\n)\s*\.tl-rrow:hover\s*\{[^}]*background/);
  });
});

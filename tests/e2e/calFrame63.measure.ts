/**
 * v63 A+B — the two-pane frame, the chrome, the group bars and the sidebar pane.
 *
 * ⚠️ THE CHROME'S CLAIM IS AN IDENTITY, NOT A VALUE. "The sidebar, the date bar and the group bars
 * are one surface" survives any retone; pinning `#faf9f7` would go red on a legitimate one, which
 * is the opposite of what a lock is for.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { CAL_SECTION_PURPOSE, CAL_SECTION_LABEL } from "../../src/lib/calendarSections";

const CAL = "/todo/calendar";

test.describe("v63 · A — the frame", () => {
  test("⚠️ (a) one container, two panes, and the numbers gutter is gone", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const cal = document.querySelector<HTMLElement>(".tl-cal");
      const axis = document.querySelector<HTMLElement>(".tl-axis");
      const pane = document.querySelector<HTMLElement>(".tl-boardpane");
      const tok = getComputedStyle(document.querySelector(".tl-board")!).getPropertyValue("--tl-axis-w").trim();
      const gut = document.querySelector<HTMLElement>(".tl-gnums");
      if (!cal || !axis || !pane) return null;
      return {
        dir: getComputedStyle(cal).flexDirection,
        axisW: Math.round(axis.getBoundingClientRect().width),
        tok: Math.round(parseFloat(tok)),
        axisInside: cal.contains(axis),
        paneInside: cal.contains(pane),
        axisL: axis.getBoundingClientRect().left,
        paneL: pane.getBoundingClientRect().left,
        gutterShown: gut ? getComputedStyle(gut).display !== "none" : false,
      };
    });
    expect(f, "no container or panes").not.toBeNull();
    expect(f!.dir, "the container is not a row — the axis is not a pane").toBe("row");
    /* ⚠️ THE SIDEBAR IS INSIDE THE FRAME. v61 had it beside the container on the page ground; the
       chrome only means something once the pane, the date bar and the group bars are one object. */
    expect(f!.axisInside, "the sidebar is not inside the container").toBe(true);
    expect(f!.paneInside, "the board is not inside the container").toBe(true);
    expect(f!.axisW, `the axis is ${f!.axisW}px against the token's ${f!.tok}px`).toBe(f!.tok);
    expect(f!.paneL, "the board pane does not sit right of the axis").toBeGreaterThan(f!.axisL);
    expect(f!.gutterShown, "the numbers gutter is still drawn").toBe(false);
  });

  test("⚠️ (b) chrome identity: sidebar = date bar = group bar; one ground; Urgent is blush", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const bg = (s: string) => {
        const e = document.querySelector<HTMLElement>(s);
        return e ? getComputedStyle(e).backgroundColor : null;
      };
      const bars = [...document.querySelectorAll<HTMLElement>(".tl-grp[data-sec] .tl-gdiv")]
        .filter((b) => b.getBoundingClientRect().height > 0)
        .map((b) => ({
          sec: (b.closest(".tl-grp") as HTMLElement).dataset.sec!,
          bg: getComputedStyle(b).backgroundColor,
          h: Math.round(b.getBoundingClientRect().height),
          eb: b.querySelector(".geb")?.textContent ?? null,
          ebCol: b.querySelector(".geb") ? getComputedStyle(b.querySelector(".geb")!).color : null,
          name: b.querySelector(".gp > span")?.textContent ?? null,
          fam: b.querySelector(".gp") ? getComputedStyle(b.querySelector(".gp")!).fontFamily : "",
        }));
      return {
        axis: bg(".tl-axis"), rail: bg(".tl-rail"),
        cal: bg(".tl-cal"), rows: bg(".tl-rows"), lanes: bg(".tl-glanes"),
        bars,
      };
    });
    expect(f.bars.length, "no group bars").toBeGreaterThan(2);
    /* the chrome is one surface across three pieces of furniture */
    expect(f.rail, "the date bar is not the sidebar's tone").toBe(f.axis);
    const calm = f.bars.filter((b) => b.sec !== "over");
    expect(calm.length, "no calm group bar — the identity claim is untested").toBeGreaterThan(1);
    for (const b of calm) {
      expect(b.bg, `${b.sec}'s bar is not the chrome tone`).toBe(f.axis);
      expect(b.h, `${b.sec}'s bar is ${b.h}px, not the ref's 40`).toBe(40);
      expect(b.fam, `${b.sec}'s name is not Playfair`).toMatch(/Playfair/);
      /* the eyebrow says what the group is FOR, and it is the app's own sentence */
      expect(b.eb, `${b.sec} has no purpose eyebrow`)
        .toBe(CAL_SECTION_PURPOSE[b.sec as keyof typeof CAL_SECTION_PURPOSE]);
      expect(b.name, `${b.sec}'s name is wrong`)
        .toBe(CAL_SECTION_LABEL[b.sec as keyof typeof CAL_SECTION_LABEL]);
    }
    /* one ground below the date bar */
    expect(f.rows, "the rows area is not the container's ground").toBe(f.cal);
    expect(f.lanes, "a lane paints its own ground").toBe("rgba(0, 0, 0, 0)");
    expect(f.cal, "the ground and the chrome are the same tone — nothing separates them")
      .not.toBe(f.axis);
    /* ⚠️ THE ONE EXCEPTION, and it must be a real one: Urgent is blush with rose numerals. */
    const urgent = f.bars.find((b) => b.sec === "over");
    expect(urgent, "no Urgent bar on the board — the exception is untested").toBeTruthy();
    expect(urgent!.bg, "the Urgent bar is not blush").not.toBe(f.axis);
    expect(urgent!.ebCol, "the Urgent eyebrow is not rose").not.toBe(calm[0].ebCol);
  });
});

test.describe("v63 · B — the sidebar pane", () => {
  test("⚠️ the window pill states its live range, and Back to today only when it has moved", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const at = await page.evaluate(() => ({
      range: document.querySelector(".tl-axis .wl")?.textContent ?? null,
      back: !!document.querySelector(".tl-axis .backtoday"),
      searchH: (() => { const s = document.querySelector<HTMLElement>(".tl-axis .tl-search"); return s ? Math.round(s.getBoundingClientRect().height) : null; })(),
    }));
    expect(at.range, "the window pill states no range").toMatch(/\w+.+–.+\w+/);
    /* ⚠️ IT APPEARS ONLY WHEN IT HAS SOMETHING TO UNDO. A permanent "Back to today" on a board
       already showing today is a control that does nothing, which teaches a reader to ignore it. */
    expect(at.back, "Back to today is offered on a board already showing today").toBe(false);
    /* ⚠️ AND THE CONTROLS WERE BUILT FOR A ROW. `.tl-search` carries `flex: 1`; in a column that
       fills the pane as one enormous empty box, which is what it did until it was given a flex. */
    expect(at.searchH, `the search field is ${at.searchH}px tall`).toBeLessThan(60);

    await page.locator('.tl-axis [aria-label="Previous window"]').click();
    await page.waitForTimeout(250);
    const moved = await page.evaluate(() => ({
      range: document.querySelector(".tl-axis .wl")?.textContent ?? null,
      back: !!document.querySelector(".tl-axis .backtoday"),
    }));
    expect(moved.range, "the range did not move with the window").not.toBe(at.range);
    expect(moved.back, "Back to today is not offered after the window moved").toBe(true);
    await page.locator(".tl-axis .backtoday").click();
    await page.waitForTimeout(250);
    const home = await page.evaluate(() => ({
      range: document.querySelector(".tl-axis .wl")?.textContent ?? null,
      back: !!document.querySelector(".tl-axis .backtoday"),
    }));
    expect(home.range, "Back to today did not restore the window").toBe(at.range);
    expect(home.back, "Back to today survives its own use").toBe(false);
  });

  test("⚠️ the views list is a census, and At a glance agrees with it", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => ({
      views: [...document.querySelectorAll<HTMLElement>(".tl-axis .gpill")].map((v) => ({
        sec: v.dataset.sec ?? "all",
        n: Number(v.querySelector("b")?.textContent ?? 0),
        rose: v.querySelector("b") ? getComputedStyle(v.querySelector("b")!).color : "",
      })),
      tiles: [...document.querySelectorAll<HTMLElement>(".tl-axis .st > div")].map((t) => ({
        n: Number(t.querySelector("b")?.textContent ?? 0),
        k: t.querySelector("small")?.textContent ?? "",
        rose: t.classList.contains("r"),
        col: t.querySelector("b") ? getComputedStyle(t.querySelector("b")!).color : "",
      })),
      rows: [...document.querySelectorAll<HTMLElement>(".tl-rrow")]
        .filter((r) => r.getBoundingClientRect().height > 0).length,
    }));
    const all = f.views.find((v) => v.sec === "all");
    const groups = f.views.filter((v) => v.sec !== "all");
    expect(all, "no All row").toBeTruthy();
    expect(groups.length, "the views list holds no groups").toBeGreaterThan(2);
    /* ⚠️ THE COUNTS SUM. A tally that changed as you clicked it is the fault the retired tab strip
       had, and it is the whole reason the list replaced it. */
    expect(groups.reduce((n, g) => n + g.n, 0), "the views do not sum to All").toBe(all!.n);
    expect(all!.n, "All disagrees with the rows on the board").toBe(f.rows);

    expect(f.tiles.length, "At a glance draws no tiles").toBe(4);
    /* ⚠️ AND THE TILES COME FROM THE SAME SECTIONS THE VIEWS COUNT — a sidebar holding two
       descriptions of one board is the fault this file records against tabs and dividers. */
    const need = f.tiles.find((t) => t.rose);
    const urgentView = groups.find((g) => g.sec === "over");
    expect(need, "no rose tile").toBeTruthy();
    expect(need!.n, `"need you now" says ${need!.n} against the Urgent view's ${urgentView?.n}`)
      .toBe(urgentView?.n);
    const plain = f.tiles.filter((t) => !t.rose);
    expect(plain.length, "every tile is rose").toBe(3);
    expect(need!.col, "the rose tile is not rose").not.toBe(plain[0].col);
  });
});

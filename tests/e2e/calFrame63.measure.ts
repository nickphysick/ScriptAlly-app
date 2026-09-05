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
          rule: getComputedStyle(b).borderBottomColor,
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
    /* ⚠️ RETARGETED BY v64 §A — "one ground" became THREE TONES, and the sidebar lost its pane:
       the axis paints NOTHING (the page cream shows through), the date row and the lane share
       #faf7f2, and the group bars carry their own #faf9f7. The blush Urgent wash is superseded by
       a rose RULE under the bar (asserted below); the names, eyebrows and Playfair survive. */
    expect(f.axis, "the sidebar paints a pane — v64 sits it on the page").toBe("rgba(0, 0, 0, 0)");
    expect(f.rail, "the date row is not the lane's tone").toBe("rgb(250, 247, 242)");
    const calm = f.bars.filter((b) => b.sec !== "over");
    expect(calm.length, "no calm group bar — the identity claim is untested").toBeGreaterThan(1);
    for (const b of calm) {
      expect(b.bg, `${b.sec}'s bar is not the bar tone`).toBe("rgb(250, 249, 247)");
      /* 52 sealed — the bar carries the group's 12px top spacing inside itself (v64 §D) */
      expect(b.h, `${b.sec}'s bar is ${b.h}px, not the sealed 52`).toBe(52);
      expect(b.fam, `${b.sec}'s name is not Playfair`).toMatch(/Playfair/);
      /* the eyebrow says what the group is FOR, and it is the app's own sentence */
      expect(b.eb, `${b.sec} has no purpose eyebrow`)
        .toBe(CAL_SECTION_PURPOSE[b.sec as keyof typeof CAL_SECTION_PURPOSE]);
      expect(b.name, `${b.sec}'s name is wrong`)
        .toBe(CAL_SECTION_LABEL[b.sec as keyof typeof CAL_SECTION_LABEL]);
    }
    /* the lane is one field below the date row; lanes paint nothing of their own */
    expect(f.rows, "the rows area is not the lane's tone").toBe("rgb(250, 247, 242)");
    expect(f.lanes, "a lane paints its own ground").toBe("rgba(0, 0, 0, 0)");
    /* ⚠️ URGENT'S MARK IS THE RULE, NOT A WASH (v64 §D): same bar tone, rose 2px rule beneath,
       rose eyebrow. A tinted band was two treatments arguing with the ladder on the cards. */
    const urgent = f.bars.find((b) => b.sec === "over");
    expect(urgent, "no Urgent bar on the board — the exception is untested").toBeTruthy();
    expect(urgent!.bg, "the Urgent bar re-grew its blush wash").toBe("rgb(250, 249, 247)");
    expect(urgent!.rule, "Urgent's rule is not rose").toBe("rgb(140, 79, 74)");
    expect(calm[0].rule, "a calm rule went rose").toBe("rgb(28, 19, 15)");
    expect(urgent!.ebCol, "the Urgent eyebrow is not rose").not.toBe(calm[0].ebCol);
  });
});

test.describe("v63 · B — the sidebar pane", () => {
  test("⚠️ the winbar's range headline, chevrons and gated Today link (v64 §B)", async ({ page }) => {
    /* ⚠️ RETARGETED BY v64 §B — the sidebar's window pill, its chevrons and Back-to-today moved
       into the winbar: a Playfair range headline in full months with the year once, ±7-day
       chevrons, and a Today LINK that renders only when the window has moved. The journey is the
       same one the pill's case drove; only the home changed. */
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const read = () => page.evaluate(() => ({
      range: document.querySelector(".tl-rng")?.textContent?.trim() ?? null,
      today: !!document.querySelector(".tl-todaylink"),
      searchH: (() => { const s = document.querySelector<HTMLElement>(".tl-winbar .tl-search");
        return s ? Math.round(s.getBoundingClientRect().height) : null; })(),
    }));
    const at = await read();
    expect(at.range, "the winbar states no range").toMatch(/^\d{1,2} [A-Z][a-z]+ – \d{1,2} [A-Z][a-z]+ \d{4}$/);
    expect(at.today, "Today is offered on a board already showing today").toBe(false);
    expect(at.searchH, "the search did not move into the winbar").not.toBeNull();
    await page.locator('.tl-winbar [aria-label="Back one week"]').click();
    await page.waitForTimeout(250);
    const moved = await read();
    expect(moved.range, "the range did not move with the window").not.toBe(at.range);
    expect(moved.today, "Today is not offered after the window moved").toBe(true);
    /* ⚠️ DISPATCHED ON THE ELEMENT — the winbar's grid re-centres as the range label changes
       width, so Playwright's stability wait can spin on a link that is perfectly clickable. The
       house idiom for a measurement that must not depend on pointer geometry. */
    await page.locator(".tl-todaylink").evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(250);
    const home = await read();
    expect(home.range, "Today did not restore the window").toBe(at.range);
    expect(home.today, "Today survives its own use").toBe(false);
  });

  test("⚠️ the Notion panel: Group and Sort open at rest, Filter closed reading All (v64 §E)", async ({ page }) => {
    /* ⚠️ RETARGETED BY v64 §E — the views list and At a glance are DELETED; the sidebar is three
       Notion rows over the facet model. The census half of the old claim survives in the facet
       counts, asserted in the flow case below. */
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const np = document.querySelector<HTMLElement>(".tl-axis .tl-np");
      if (!np) return null;
      const rows = [...np.querySelectorAll<HTMLElement>(".tl-pr")].map((r) => ({
        label: r.querySelector(".tl-prl")?.textContent?.trim() ?? r.textContent?.trim()?.slice(0, 12) ?? "",
        open: r.classList.contains("open"),
        value: r.querySelector(".tl-prv")?.textContent?.trim() ?? null,
      }));
      return {
        rows,
        gpills: document.querySelectorAll(".tl-axis .gpill").length,
        tiles: document.querySelectorAll(".tl-axis .st").length,
        groupOpts: [...np.querySelectorAll<HTMLElement>(".tl-px")][0]
          ? [...np.querySelectorAll<HTMLElement>(".tl-px")[0].querySelectorAll(".tl-pxo")].map((o) => o.textContent?.trim() ?? "")
          : [],
      };
    });
    expect(f, "no Notion panel in the sidebar").not.toBeNull();
    /* the retired furniture is GONE from the rendered page */
    expect(f!.gpills, "the views list is back").toBe(0);
    expect(f!.tiles, "At a glance is back").toBe(0);
    const byLabel = (s: string) => f!.rows.find((r) => new RegExp(s, "i").test(r.label));
    const grp = byLabel("group"), flt = byLabel("filter"), srt = byLabel("sort");
    expect(grp, "no Group row").toBeTruthy();
    expect(flt, "no Filter row").toBeTruthy();
    expect(srt, "no Sort row").toBeTruthy();
    expect(grp!.open, "Group is closed at rest").toBe(true);
    expect(srt!.open, "Sort is closed at rest").toBe(true);
    expect(flt!.open, "Filter is open at rest").toBe(false);
    expect(flt!.value, `Filter reads "${flt!.value}" with nothing hidden`).toBe("All");
    expect(grp!.value, "Group's resting value is not Attention").toBe("Attention");
    expect(srt!.value, "Sort's resting value is not Urgency").toBe("Urgency");
  });
});

test.describe("v63 · run 2 — the five corrections", () => {
  test("⚠️ 'Attention' in the panel, 'Urgent' on the bar — one section, two names (v64 §E)", async ({ page }) => {
    /* ⚠️ RETARGETED BY v64 §E. The 'Needs me' VIEW is deleted with the views list; the two-names
       law survives at its new address: the panel's Group row reads ATTENTION (what the cut does
       for the reader) while the board's first bar reads URGENT (the state of the rows under it).
       One section, two names, each on the surface whose question it answers. */
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => ({
      pills: document.querySelectorAll(".tl-axis .gpill").length,
      groupValue: (() => {
        const rowEls = [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-pr")];
        const g = rowEls.find((r) => /group/i.test(r.textContent ?? ""));
        return g?.querySelector(".tl-prv")?.textContent?.trim() ?? null;
      })(),
      bar: document.querySelector('.tl-grp[data-sec="over"] .tl-gdiv .gp > span')?.textContent ?? null,
    }));
    expect(f.pills, "the views list is back").toBe(0);
    expect(f.groupValue, "the Group row does not read Attention").toBe("Attention");
    expect(f.bar, "the group bar is not called Urgent").toBe("Urgent");
  });

  test("⚠️ At a glance is retired, and the panel still fits a short viewport (v64 §E)", async ({ page }) => {
    /* ⚠️ RETARGETED BY v64 §E. The four tiles are deleted, so the fourth-tile-reachable claim
       has no subject; what survives is the pane's own scroll — the axis still scrolls itself when
       its content overflows, and at 640 the panel with Group and Sort open must either fit or
       scroll, never clip. */
    await openRoute(page, CAL, { width: 1440, height: 640 });
    const f = await page.evaluate(() => {
      const a = document.querySelector<HTMLElement>(".tl-axis")!;
      return {
        tiles: a.querySelectorAll(".st").length,
        overflow: getComputedStyle(a).overflowY,
        scrollable: a.scrollHeight - a.clientHeight,
      };
    });
    expect(f.tiles, "At a glance is back").toBe(0);
    expect(["auto", "scroll"], `the pane's overflow is ${f.overflow}`).toContain(f.overflow);
    if (f.scrollable > 0) {
      await page.evaluate(() => { const a = document.querySelector<HTMLElement>(".tl-axis")!; a.scrollTop = a.scrollHeight; });
      const reached = await page.evaluate(() => document.querySelector<HTMLElement>(".tl-axis")!.scrollTop > 0);
      expect(reached, "the pane declares overflow it cannot scroll").toBe(true);
    }
  });

  test("⚠️ nothing is rendered below the numeral tier, and the search carries its glyph", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".tl-rail")!;
      const now = document.querySelector<HTMLElement>(".tl-dt.now");
      const nr = now?.getBoundingClientRect();
      /* everything painted inside the date bar that begins at or below the numeral's baseline */
      const below = nr ? [...rail.querySelectorAll<HTMLElement>("*")]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= nr.bottom - 0.5; })
        .map((e) => e.className.toString().slice(0, 30)) : ["__no today circle__"];
      /* v64 §B: the search lives in the winbar now, not the sidebar */
      const s = document.querySelector<HTMLElement>(".tl-winbar .tl-search")!;
      return {
        below, stems: document.querySelectorAll(".tl-todaystem").length,
        bgImage: getComputedStyle(s).backgroundImage,
        padL: parseFloat(getComputedStyle(s).paddingLeft),
      };
    });
    /* ⚠️ THE TICK IS GONE. It rose from the rail's baseline to meet a today CAP that no longer
       exists; the filled circle IS the mark, and a tick beneath a numeral inside its own disc is a
       second pointer at a date the disc already names. */
    expect(f.stems, "the today stem is still rendered").toBe(0);
    expect(f.below, `something is drawn below the numeral tier: ${f.below.join(", ")}`).toEqual([]);
    expect(f.bgImage, "the search field carries no magnifier").toContain("svg");
    expect(f.padL, "the search text is not cleared of its glyph").toBeGreaterThanOrEqual(28);
  });
});

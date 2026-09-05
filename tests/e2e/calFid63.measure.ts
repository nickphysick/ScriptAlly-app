/**
 * v63 fidelity — the four items, each measured on the rendered page.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const CAL = "/todo/calendar";

test.describe("v63 · fidelity", () => {
  test("⚠️ (1) the winbar and the date row are the board's own chrome, stacked on its top (v64 §A/§B)", async ({ page }) => {
    /* ⚠️ RETARGETED BY v64. The v63 toolbar is deleted (`.tl-vtool` — the winbar and the Notion
       sidebar carry its jobs), the container is `.tl-boardpane` (the `.tl-cal` is a transparent
       layout row now), and "one ground" became THREE TONES: white winbar, #faf7f2 date row and
       lane, white cards. What survives at its new size: the chrome is stacked flush on the
       container's interior top, nothing between the pieces. */
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const pane = g.querySelector<HTMLElement>(".tl-boardpane")!;
      const pb = pane.getBoundingClientRect();
      const bw = parseFloat(getComputedStyle(pane).borderTopWidth);
      const box = (s: string) => { const e = pane.querySelector<HTMLElement>(s)!;
        const b = e.getBoundingClientRect();
        return { top: +(b.top - pb.top).toFixed(1), bottom: +(b.bottom - pb.top).toFixed(1),
                 h: +b.height.toFixed(1), bg: getComputedStyle(e).backgroundColor,
                 rad: getComputedStyle(e).borderTopLeftRadius }; };
      return { interiorTop: bw, win: box(".tl-winbar"), rail: box(".tl-rail"),
               vtool: g.querySelectorAll(".tl-vtool").length,
               axisTop: +(g.querySelector(".tl-axis")!.getBoundingClientRect().top - pb.top).toFixed(1) };
    });
    /* the retired toolbar is GONE from the rendered page */
    expect(r.vtool, "the v63 toolbar is back").toBe(0);
    /* the winbar sits on the container's interior top; the sidebar starts on the same line */
    expect(r.win.top, "the winbar is not on the container's interior top").toBeCloseTo(r.interiorTop, 0);
    expect(Math.abs(r.axisTop - r.win.top), `the sidebar starts ${r.axisTop} vs winbar ${r.win.top}`)
      .toBeLessThanOrEqual(2);
    /* 58px border-box, the ref's winbar; the date row on its bottom, hairline only between */
    expect(r.win.h, `the winbar's box is ${r.win.h}`).toBeCloseTo(58, 0);
    expect(r.rail.top - r.win.bottom, `a ${(r.rail.top - r.win.bottom).toFixed(1)}px gap above the date row`)
      .toBeLessThanOrEqual(1.5);
    expect(r.rail.h, "the date row is not 55px").toBeCloseTo(55, 0);
    expect(r.rail.rad, "the date row rounds a corner mid-block").toBe("0px");
    /* three tones: the winbar is WHITE and the date row is the lane's #faf7f2 — not one ground */
    expect(r.win.bg, "the winbar is not white").toBe("rgb(255, 255, 255)");
    expect(r.rail.bg, "the date row is not the lane tone").toBe("rgb(250, 247, 242)");
  });

  test("⚠️ (2) the container is a page card, bounded to the page", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      /* ⚠️ v64 §A: the page card is `.tl-boardpane`; `.tl-cal` is a transparent layout row */
      const cal = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const g = cal.querySelector<HTMLElement>(".tl-boardpane")!;
      const b = g.getBoundingClientRect(), s = getComputedStyle(g);
      const rows = g.querySelector<HTMLElement>(".tl-rows")!;
      return { vh: window.innerHeight, vw: window.innerWidth,
        top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1),
        radius: s.borderTopLeftRadius, bw: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
        rowsOv: getComputedStyle(rows).overflowY,
        /* ⚠️ WHAT SPILLS, NOT WHAT IS SCROLLED. Everything below the fold in the rows region has a
           rect outside the container and is CLIPPED by it — the whole point of the bound. Walk to
           the first clipping ancestor and skip anything it contains, which is the same correction
           the "outside the card box" probe needed. */
        spill: [...g.querySelectorAll<HTMLElement>("*")].filter((e) => {
          const r2 = e.getBoundingClientRect();
          if (!(r2.width > 0 && r2.height > 0)) return false;
          for (let p2 = e.parentElement; p2 && p2 !== g.parentElement; p2 = p2.parentElement) {
            if (getComputedStyle(p2).overflow !== "visible") return false;
          }
          return r2.bottom > b.bottom + 1 || r2.right > b.right + 1;
        }).map((e) => (e.className || e.tagName).toString().slice(0, 24)),
      };
    });
    /* wholly within the viewport, all four edges painted */
    expect(r.bottom, `the container ends at ${r.bottom} in a ${r.vh} viewport`).toBeLessThan(r.vh);
    /* v64 §A names the bound: 24px of page beneath the container */
    expect(Math.abs(r.vh - r.bottom - 24), `the container ends ${(r.vh - r.bottom).toFixed(1)}px above the foot, not 24`)
      .toBeLessThanOrEqual(2);
    expect(r.top).toBeGreaterThan(0);
    expect(r.right).toBeLessThanOrEqual(r.vw);
    for (const w of r.bw) expect(parseFloat(w), `an edge is ${w}`).toBeGreaterThan(0);
    expect(parseFloat(r.radius), "no page radius").toBeGreaterThan(4);
    /* ⚠️ THE ROWS SCROLL INSIDE IT, which is what makes the bound possible at all */
    expect(r.rowsOv, "the rows region does not scroll").toBe("auto");
    expect([...new Set(r.spill)], `content spills past the container: ${JSON.stringify([...new Set(r.spill)])}`).toEqual([]);
  });

  test("⚠️ (3) an ongoing bar's right edge is the today line, and the pulse is centred on it", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const line = g.querySelector<HTMLElement>(".tl-todayline");
      if (!line) return null;
      const lb = line.getBoundingClientRect();
      const lx = lb.left + lb.width / 2;
      const on = [...g.querySelectorAll<HTMLElement>(".tl-p")]
        .filter((c) => c.classList.contains("fadeR") && !c.classList.contains("clipR"));
      return {
        lx: +lx.toFixed(1), n: on.length,
        deltas: on.map((c) => +(c.getBoundingClientRect().right - lx).toFixed(2)),
        /* ⚠️ THE FRAME'S INK, NOT THE CARD'S BOX. For two packs the frame stopped 16px short of
           the line (a v61 chevron-notch `right: 16px` nobody deleted) while this lock stayed green
           by measuring `.tl-p` — the box met the line and the paint did not. */
        inkDeltas: on.map((c) => +((c.querySelector(".tl-frame")?.getBoundingClientRect().right ?? 0) - lx).toFixed(2)),
        pulses: on.map((c) => { const p = c.querySelector<HTMLElement>(".tl-pulsedot");
          if (!p) return null; const b = p.getBoundingClientRect();
          return +(b.left + b.width / 2 - lx).toFixed(2); }).filter((v) => v != null),
        /* the seam v60d fixed, re-run: the rail's lane and a row's lane are the same box */
        seam: (() => {
          const a = g.querySelector<HTMLElement>(".tl-rail .tl-c-tl")!.getBoundingClientRect();
          const b = g.querySelector<HTMLElement>(".tl-rrow .tl-c-tl")!.getBoundingClientRect();
          return { dx: +(b.left - a.left).toFixed(1), dw: +(b.width - a.width).toFixed(1) }; })(),
      };
    });
    expect(r, "no today line on the board").not.toBeNull();
    expect(r!.n, "no ongoing bars — the claim is unexercised").toBeGreaterThan(0);
    const worst = Math.max(...r!.deltas.map(Math.abs));
    console.log(`today line ${r!.lx} · ${r!.n} ongoing · worst delta ${worst}px · seam ${JSON.stringify(r!.seam)}`);
    for (const d of r!.deltas) expect(Math.abs(d), `a bar ends ${d}px from the line`).toBeLessThanOrEqual(1);
    for (const d of r!.inkDeltas) expect(Math.abs(d), `a bar's PAINTED edge ends ${d}px from the line`).toBeLessThanOrEqual(1.5);
    for (const p of r!.pulses) expect(Math.abs(p!), `a pulse sits ${p}px off the line`).toBeLessThanOrEqual(1);
    /* ⚠️ THE SEAM, RE-RUN. It had come apart by 66px — the rail still reserved the numbers gutter
       §A hid — so every date on the date bar stood right of the column its bars sit in. */
    expect(Math.abs(r!.seam.dx), `the rail's lane and a row's lane differ by ${r!.seam.dx}px`).toBeLessThanOrEqual(1);
    expect(Math.abs(r!.seam.dw), `their widths differ by ${r!.seam.dw}px`).toBeLessThanOrEqual(1);
  });

  test("⚠️ (4) the card is the ref's card — hairline, radius, two body lines", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const tok = getComputedStyle(g).getPropertyValue("--tl-frame-bd").trim();
      return { tok, cards: [...g.querySelectorAll<HTMLElement>(".tl-p")].map((c) => {
        const f = c.querySelector<HTMLElement>(".tl-frame")!, fs = getComputedStyle(f);
        const body = c.querySelector<HTMLElement>(".tl-cardbody")!;
        const shut = ["shut", "closedp", "quiet", "ghost"].some((k) => c.classList.contains(k));
        /* ⚠️ v64 §F SPLITS THE RIGHT CUT: `fadeR` is the ONGOING edge at today (squared,
           borderless — a live wait runs out of board); `clipR` is the WINDOW's edge (whole —
           corners and hairline kept, 6px short of the lane). v63 lumped them, and the lump is
           exactly what let the window edge wear the wrong treatment for a pack. */
        const cut = { l: c.classList.contains("fadeL"), today: c.classList.contains("fadeR") };
        const cb = c.getBoundingClientRect();
        const fact = c.querySelector<HTMLElement>(".tl-ffx"), eb = c.querySelector<HTMLElement>(".tl-feb");
        const rg = document.createRange(); rg.selectNodeContents(body);
        return {
          cut, shut,
          bw: [fs.borderTopWidth, fs.borderRightWidth, fs.borderBottomWidth, fs.borderLeftWidth],
          bc: fs.borderTopColor, radL: fs.borderTopLeftRadius, radR: fs.borderTopRightRadius,
          bg: fs.backgroundColor, shadow: fs.boxShadow,
          bandW: +(c.querySelector(".tl-sband")?.getBoundingClientRect().width ?? 0).toFixed(1),
          cardW: +cb.width.toFixed(1),
          /* ⚠️ CLUSTERED, NOT BUCKETED. Line one holds a 15.5px name and a 12px agency on ONE
             baseline, so their rect TOPS differ by about 4px; a fixed bucket split them and
             reported a two-line body as four. A line is a run of rects whose tops sit within
             half a line-height of each other. */
          lines: (() => {
            const tops = [...rg.getClientRects()].filter((x) => x.height > 1)
              .map((x) => x.top).sort((a, b) => a - b);
            let n = 0, last = -Infinity;
            for (const t of tops) { if (t - last > 9) { n++; last = t; } }
            return n;
          })(),
          factTop: fact ? +fact.getBoundingClientRect().top.toFixed(1) : null,
          ebTop: eb ? +eb.getBoundingClientRect().top.toFixed(1) : null,
          chip: c.querySelectorAll(".tl-fchip").length, trail: c.querySelectorAll(".tl-ctrail").length,
        };
      }) };
    });
    expect(r.cards.length, "no cards").toBeGreaterThan(5);
    const hex = (rgb: string) => { const [a, b, c] = rgb.match(/\d+/g)!.map(Number);
      return "#" + [a, b, c].map((n) => n.toString(16).padStart(2, "0")).join(""); };
    for (const c of r.cards) {
      /* the hairline is the TOKEN's, on every card — no per-state edge */
      expect(hex(c.bc), `a card's edge is ${c.bc}, the token is ${r.tok}`).toBe(r.tok.toLowerCase());
      /* ⚠️ WHITE, EXCEPT A CLOSED CARD — WHICH THE REF TINTS TOO. `body[data-fill] .card.shut
         .frame` is `#f1eee8` under every fill variant, so "the card is white" is a claim about a
         LIVE card; asserting it of every card would have deleted a distinction the ref draws. */
      expect(c.bg, `a ${c.shut ? "closed" : "live"} card is ${c.bg}`)
        .toBe(c.shut ? "rgb(241, 238, 232)" : "rgb(255, 255, 255)");
      /* ⚠️ THE HOVER LIFT IS THE ONE SHADOW, and a card at rest has none. Read at rest, so a card
         reporting one here is a resting lift rather than a hover. */
      expect(c.shadow, `a card carries a resting shadow: ${c.shadow}`).toBe("none");
      expect(c.chip + c.trail, "a chip or a trail is back").toBe(0);
      /* ⚠️ ONLY THE TODAY EDGE IS SQUARED AND BORDERLESS (v64 §F). A window cut (`fadeL`/`clipR`)
         keeps its 1px hairline and 9px radius — the card is a whole object whose story continues
         off-screen, and the 6px lane gap (asserted in calDens64) is what says so. */
      expect(c.bw[0], "a card lost its top edge").toBe("1px");
      expect(c.bw[2], "a card lost its bottom edge").toBe("1px");
      expect(c.bw[3], `left edge ${c.bw[3]}`).toBe("1px");
      expect(c.bw[1], `right edge ${c.bw[1]} on ${c.cut.today ? "an ongoing" : "a whole-or-window"} side`).toBe(c.cut.today ? "0px" : "1px");
      expect(c.radL, `left radius ${c.radL}`).toBe("9px");
      expect(c.radR, `right radius on ${c.cut.today ? "an ongoing" : "a whole-or-window"} side`).toBe(c.cut.today ? "0px" : "9px");
      /* the band spans the whole card — it stopped 16px short for a chevron §D deleted */
      expect(c.bandW, `the band is ${c.bandW} on a ${c.cardW} card`).toBeCloseTo(c.cardW, 0);
      /* ⚠️ TWO LINES IN THE BODY, NEVER THREE, and the eyebrow is ON the fact's line */
      expect(c.lines, `the body is ${c.lines} lines`).toBe(2);
      if (c.factTop != null && c.ebTop != null) {
        expect(Math.abs(c.ebTop - c.factTop), `the eyebrow is ${(c.ebTop - c.factTop).toFixed(1)}px off the fact's line`)
          .toBeLessThanOrEqual(6);
      }
    }
  });
});

/**
 * v63 fidelity — the four items, each measured on the rendered page.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const CAL = "/todo/calendar";

test.describe("v63 · fidelity", () => {
  test("⚠️ (1) the toolbar and the date bar are one chrome block on the container's top", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      const gb = g.getBoundingClientRect();
      const bw = parseFloat(getComputedStyle(g).borderTopWidth);
      const box = (s: string) => { const e = g.querySelector<HTMLElement>(s)!;
        const b = e.getBoundingClientRect();
        return { top: +(b.top - gb.top).toFixed(1), bottom: +(b.bottom - gb.top).toFixed(1),
                 h: +b.height.toFixed(1), bg: getComputedStyle(e).backgroundColor,
                 rad: getComputedStyle(e).borderTopLeftRadius }; };
      return { interiorTop: bw, tool: box(".tl-vtool"), rail: box(".tl-rail"),
               axisTop: +(g.querySelector(".tl-axis")!.getBoundingClientRect().top - gb.top).toFixed(1) };
    });
    /* the container's interior top, the toolbar's top and the sidebar pane's top are one line */
    expect(r.tool.top, "the toolbar is not on the container's interior top").toBeCloseTo(r.interiorTop, 0);
    expect(r.axisTop, "the sidebar pane starts on a different line").toBeCloseTo(r.tool.top, 0);
    /* 44px of content plus its hairline — a 45px box, which is what the ref measures too */
    expect(r.tool.h, `the toolbar's box is ${r.tool.h}`).toBeCloseTo(45, 0);
    /* ⚠️ THE DATE BAR SITS ON THE TOOLBAR'S BOTTOM, +1 FOR THE HAIRLINE — no ground-coloured band
       between them. An 18px lift for a retired today flag used to stand there. */
    expect(r.rail.top - r.tool.bottom, `a ${(r.rail.top - r.tool.bottom).toFixed(1)}px gap above the date bar`)
      .toBeLessThanOrEqual(1.5);
    expect(r.rail.h, "the date bar is not 54px").toBeCloseTo(54, 0);
    expect(r.rail.rad, "the date bar rounds a corner mid-block").toBe("0px");
    expect(r.rail.bg, "the two are not on one ground").toBe(r.tool.bg);
  });

  test("⚠️ (2) the container is a page card, bounded to the page", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
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
    expect(r.vh - r.bottom, "the container is flush to the foot — no page padding below it").toBeGreaterThan(8);
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
        const cut = { l: c.classList.contains("fadeL"), r: c.classList.contains("fadeR") || c.classList.contains("clipR") };
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
      /* ⚠️ NO BORDER AND NO RADIUS ON THE CUT SIDE ONLY — the uncut sides keep both */
      expect(c.bw[0], "a card lost its top edge").toBe("1px");
      expect(c.bw[2], "a card lost its bottom edge").toBe("1px");
      expect(c.bw[3], `left edge ${c.bw[3]} on a ${c.cut.l ? "cut" : "whole"} side`).toBe(c.cut.l ? "0px" : "1px");
      expect(c.bw[1], `right edge ${c.bw[1]} on a ${c.cut.r ? "cut" : "whole"} side`).toBe(c.cut.r ? "0px" : "1px");
      expect(c.radL, `left radius on a ${c.cut.l ? "cut" : "whole"} side`).toBe(c.cut.l ? "0px" : "9px");
      expect(c.radR, `right radius on a ${c.cut.r ? "cut" : "whole"} side`).toBe(c.cut.r ? "0px" : "9px");
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

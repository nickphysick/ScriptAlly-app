/**
 * CALENDAR v64 §F — TWO DENSITIES, THE PEEK, AND THE WINDOW'S SOFT EDGES.
 *
 * Ref: design-refs/timeline-v64.html (`data-dens="compact"` + `data-orc="edge"` +
 * `data-orl="essentials"` + `data-grow="place"`, and the soft-edge block under
 * `data-tlext="content"`).
 *
 * ⚠️ EVERY CASE ASSERTS ITS POPULATION FIRST, AND THE EDGE CASE REPORTS ITS BRANCH COUNTS —
 * a fixture where every card is whole proves nothing about cut edges, and eleven identical
 * subjects are a monoculture wearing a census's clothes.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

const findBoard = `[...document.querySelectorAll(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)`;

async function toCompact(page: import("@playwright/test").Page) {
  /* the winbar's segmented control — the one home for density (v64 §B) */
  await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const btn = [...g.querySelectorAll<HTMLElement>(".tl-dseg button")].find((b) => /compact/i.test(b.textContent ?? ""))!;
    btn.click();
  });
  await page.waitForTimeout(120);
}

test("⚠️ compact is one 52px row — 40px bar, no band, dot left, holder right, no fact", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  await toCompact(page);
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const board = g.closest(".tl-board") ?? g;
    const dens = (board as HTMLElement).getAttribute("data-dens");
    /* ⚠️ VISIBLE CARDS ONLY, AND THE EXCLUSION IS COUNTED. The harness account seeds one
       off-window fixture relationship whose card renders at 0×0; measuring it would report the
       fixture, not the page. */
    const all = [...g.querySelectorAll<HTMLElement>(".tl-p")];
    const cards = all.filter((c) => c.getBoundingClientRect().height > 1);
    return {
      dens, n: cards.length, hidden: all.length - cards.length,
      rowH: getComputedStyle(g.querySelector(".tl-rrow")!).getPropertyValue("--row-h").trim()
        || getComputedStyle(g).getPropertyValue("--row-h").trim(),
      sample: cards.slice(0, 40).map((c) => {
        const band = c.querySelector<HTMLElement>(".tl-sband")!;
        const bs = getComputedStyle(band);
        const dot = band.querySelector<HTMLElement>("svg, .tl-tbox");
        const sw = band.querySelector<HTMLElement>(".tl-sw");
        const sh = band.querySelector<HTMLElement>(".tl-sh");
        const fact = c.querySelector<HTMLElement>(".tl-ffx");
        const nm = c.querySelector<HTMLElement>(".tl-fnm");
        const ag = c.querySelector<HTMLElement>(".tl-fag");
        const cb = c.getBoundingClientRect();
        return {
          barH: +cb.height.toFixed(1),
          bandBg: bs.backgroundColor, bandH: +band.getBoundingClientRect().height.toFixed(1),
          dotLeft: dot ? +(dot.getBoundingClientRect().left - cb.left).toFixed(1) : null,
          swShown: !!sw && getComputedStyle(sw).display !== "none",
          shRight: sh ? +(cb.right - sh.getBoundingClientRect().right).toFixed(1) : null,
          shFs: sh ? getComputedStyle(sh).fontSize : null,
          factShown: !!fact && getComputedStyle(fact).display !== "none",
          nmFs: nm ? getComputedStyle(nm).fontSize : null,
          agFs: ag ? getComputedStyle(ag).fontSize : null,
        };
      }),
    };
  });
  expect(r.dens, "the density segment did not switch the board").toBe("compact");
  expect(r.n, "no cards").toBeGreaterThan(5);
  console.log(`compact: ${r.n} visible cards · ${r.hidden} zero-height excluded`);
  for (const c of r.sample) {
    expect(Math.abs(c.barH - 40), `a compact bar is ${c.barH}px`).toBeLessThanOrEqual(1);
    /* the band is a transparent full-height rail — the BAND (the 26px tinted strip) is gone */
    expect(c.bandBg, "a compact band still paints").toBe("rgba(0, 0, 0, 0)");
    expect(Math.abs(c.bandH - c.barH), `band ${c.bandH} in a ${c.barH} bar`).toBeLessThanOrEqual(1);
    expect(c.swShown, "the status word survived compact").toBe(false);
    expect(c.factShown, "the fact renders at rest — it belongs to the peek").toBe(false);
    if (c.dotLeft != null) expect(c.dotLeft, `the dot sits ${c.dotLeft}px in`).toBeLessThanOrEqual(34);
    if (c.shRight != null) expect(c.shRight, `the holder sits ${c.shRight}px from the right`).toBeLessThanOrEqual(20);
    if (c.shFs) expect(Math.abs(parseFloat(c.shFs) - 6.5), `holder ${c.shFs}`).toBeLessThanOrEqual(0.5);
    if (c.nmFs) expect(Math.abs(parseFloat(c.nmFs) - 13.5), `name ${c.nmFs}`).toBeLessThanOrEqual(0.5);
    if (c.agFs) expect(Math.abs(parseFloat(c.agFs) - 11), `agency ${c.agFs}`).toBeLessThanOrEqual(0.5);
  }
});

test("⚠️ the 4px status edge is the ladder's own tint, and the frame is compact's ONE gradient", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  await toCompact(page);
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")].filter((c) => c.getBoundingClientRect().height > 1);
    const painted: string[] = [];
    const stripes: { cls: string; st: string; img: string; size: string }[] = [];
    for (const c of cards) {
      for (const e of [c, ...c.querySelectorAll<HTMLElement>("*")]) {
        const cs = getComputedStyle(e);
        if (/gradient/.test(cs.backgroundImage) && !e.classList.contains("tl-frame"))
          painted.push(e.className || e.tagName);
      }
      const f = c.querySelector<HTMLElement>(".tl-frame")!;
      const fs = getComputedStyle(f);
      const band = c.querySelector<HTMLElement>(".tl-sband")!;
      const stCls = [...band.classList].find((k) => k.startsWith("tl-st-")) ?? (band.classList.contains("tl-sband--task") ? "task" : "?");
      stripes.push({ cls: stCls, st: getComputedStyle(c).getPropertyValue("--st").trim(),
        img: fs.backgroundImage.slice(0, 60), size: fs.backgroundSize });
    }
    return { n: cards.length, painted: [...new Set(painted)], stripes };
  });
  expect(r.n, "no cards").toBeGreaterThan(5);
  /* ⚠️ THE SANCTIONED SET IS EXACTLY THE FRAME — the other half of calBar63 d13's carve-out */
  expect(r.painted, `a gradient outside the frame: ${JSON.stringify(r.painted)}`).toEqual([]);
  for (const s of r.stripes) {
    expect(s.st, `a ${s.cls} card resolved no --st`).not.toBe("");
    expect(/gradient/.test(s.img), `a ${s.cls} frame paints no stripe`).toBe(true);
    expect(s.size.split(" ")[1], `stripe height ${s.size}`).toBe("4px");
  }
  /* the monoculture guard: the fixture must exercise more than one rung */
  const rungs = [...new Set(r.stripes.map((s) => s.cls))];
  console.log(`stripe rungs seen: ${JSON.stringify(rungs)}`);
  expect(rungs.length, `every card wears one rung: ${JSON.stringify(rungs)}`).toBeGreaterThan(1);
});

test("⚠️ hovering a compact bar peeks the COMFORTABLE card over it, and leave or scroll clears it", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  await toCompact(page);
  /* a real pointer with real intent — the 60ms timer is the mechanism under test */
  const bar = page.locator(".tl-cal .tl-p").first();
  const barBox = (await bar.boundingBox())!;
  await page.mouse.move(barBox.x + Math.min(80, barBox.width / 2), barBox.y + barBox.height / 2);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const peek = document.querySelector<HTMLElement>("body > .tl-peek");
    if (!peek) return null;
    const pb = peek.getBoundingClientRect();
    const inner = peek.querySelector<HTMLElement>(".tl-p, .tl-jc");
    const band = peek.querySelector<HTMLElement>(".tl-sband");
    const fact = peek.querySelector<HTMLElement>(".tl-ffx");
    return {
      top: +pb.top.toFixed(1), left: +pb.left.toFixed(1), h: +pb.height.toFixed(1), w: +pb.width.toFixed(1),
      z: getComputedStyle(peek).zIndex,
      hasCard: !!inner,
      bandH: band ? +band.getBoundingClientRect().height.toFixed(1) : null,
      bandPaints: band ? getComputedStyle(band).backgroundColor !== "rgba(0, 0, 0, 0)" : null,
      factShown: !!fact && getComputedStyle(fact).display !== "none"
        && fact.getBoundingClientRect().height > 1,
      shadow: getComputedStyle(peek).boxShadow !== "none",
      compactInside: peek.matches('[data-dens="compact"]') || !!peek.closest('[data-dens="compact"]'),
    };
  });
  expect(r, "no peek appeared after 300ms of hover").not.toBeNull();
  expect(r!.hasCard, "the peek holds no card clone").toBe(true);
  expect(r!.h, `the peek is ${r!.h}px tall`).toBe(86);
  expect(r!.w, `the peek is ${r!.w}px wide`).toBeGreaterThanOrEqual(260);
  /* exactly over the bar: top-aligned (or bottom-aligned when it opened upward) */
  const overTop = Math.abs(r!.top - barBox.y) <= 1.5;
  const overBottom = Math.abs((r!.top + r!.h) - (barBox.y + barBox.height)) <= 1.5;
  expect(overTop || overBottom, `peek top ${r!.top} vs bar top ${barBox.y}`).toBe(true);
  /* the clone renders COMFORTABLE: the tinted 26px band is back and the fact is visible */
  expect(r!.compactInside, "the peek inherited compact — the clone is not the comfortable card").toBe(false);
  expect(r!.bandH, `the peek's band is ${r!.bandH}px`).toBe(26);
  expect(r!.bandPaints, "the peek's band does not paint its tint").toBe(true);
  expect(r!.factShown, "the peek hides the fact — the reveal is its whole job").toBe(true);
  expect(r!.shadow, "no soft shadow on the peek").toBe(true);
  /* leave clears it */
  await page.mouse.move(10, 10);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!document.querySelector("body > .tl-peek")), "the peek survived leave").toBe(false);
  /* hover again, then scroll — scroll clears it */
  await page.mouse.move(barBox.x + Math.min(80, barBox.width / 2), barBox.y + barBox.height / 2);
  await page.waitForTimeout(200);
  const again = await page.evaluate(() => !!document.querySelector("body > .tl-peek"));
  if (again) {
    await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
      g.querySelector(".tl-rows")!.dispatchEvent(new Event("scroll", { bubbles: false }));
    });
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => !!document.querySelector("body > .tl-peek")), "the peek survived a scroll").toBe(false);
  }
});

test("⚠️ a card at the window's edge is whole — hairline, corners, and 6px short of the lane", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const rows = g.querySelector<HTMLElement>(".tl-rows")!;
    const rs = getComputedStyle(rows);
    const rb = rows.getBoundingClientRect();
    const inL = rb.left + parseFloat(rs.paddingLeft), inR = rb.right - parseFloat(rs.paddingRight);
    const cards = [...g.querySelectorAll<HTMLElement>(".tl-p")];
    /* ⚠️ `cutR` IS THE WINDOW'S CUT (the drawn box at the lane's edge); `clipR` is knowledge —
       an expectation named beyond the board — and an overdue wait carries it while its bar stops
       at today. The 6px gap belongs to geometry alone. */
    const branch = { fadeL: 0, cutR: 0, clipONLY: 0, fadeR: 0, whole: 0 };
    const bad: string[] = [];
    const gaps: number[] = [];
    for (const c of cards.filter((x) => x.getBoundingClientRect().height > 1)) {
      const fL = c.classList.contains("fadeL"), cR = c.classList.contains("cutR"), fR = c.classList.contains("fadeR");
      if (fL) branch.fadeL++; if (cR) branch.cutR++;
      if (c.classList.contains("clipR") && !cR) branch.clipONLY++;
      if (fR && !cR) branch.fadeR++;
      if (!fL && !cR && !fR) branch.whole++;
      const f = c.querySelector<HTMLElement>(".tl-frame")!;
      const fs = getComputedStyle(f);
      const cb = c.getBoundingClientRect();
      const nm = c.querySelector(".tl-fnm")?.textContent?.trim() ?? "?";
      if (fL) {
        const gap = +(cb.left - inL).toFixed(1);
        gaps.push(gap);
        if (Math.abs(gap - 6) > 1) bad.push(`${nm}: left gap ${gap}`);
        if (fs.borderLeftWidth !== "1px") bad.push(`${nm}: left border ${fs.borderLeftWidth}`);
        if (fs.borderTopLeftRadius !== "9px") bad.push(`${nm}: left radius ${fs.borderTopLeftRadius}`);
      }
      if (cR) {
        const gap = +(inR - cb.right).toFixed(1);
        gaps.push(gap);
        if (Math.abs(gap - 6) > 1) bad.push(`${nm}: right gap ${gap}`);
        if (fs.borderRightWidth !== "1px") bad.push(`${nm}: right border ${fs.borderRightWidth}`);
        if (fs.borderTopRightRadius !== "9px") bad.push(`${nm}: right radius ${fs.borderTopRightRadius}`);
      }
    }
    return { branch, bad, gaps };
  });
  /* ⚠️ THE BRANCH COUNTS ARE THE REPORT — a fixture with no cut card proves nothing, and says so */
  console.log(`edge branches: ${JSON.stringify(r.branch)} · gaps ${JSON.stringify(r.gaps)}`);
  expect(r.branch.fadeL, "no left-cut card — the fadeL claim is unexercised").toBeGreaterThan(0);
  if (r.branch.cutR === 0) console.log("⚠️ no cutR card in the fixture — the right-window claim ran on zero subjects");
  expect(r.bad, `window edges: ${JSON.stringify(r.bad)}`).toEqual([]);
});

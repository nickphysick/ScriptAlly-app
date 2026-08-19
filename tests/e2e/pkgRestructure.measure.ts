/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages restructure — measurement (rail + infographic).
 *
 * ⚠️ THE TARGET IS A LOCAL DEV SERVER, NOT THE DEPLOYED SITE, and that is a deviation from
 * `playwright.config.ts`'s stated design. No deploys are permitted in this run, so a deployed
 * measurement could not contain the change being measured. Set SA_E2E_BASE_URL to the stream's
 * own port (3080) before running. What this keeps: a real browser, the real DOM, real computed
 * styles. What it loses: the bundled stylesheet's cascade order. The built CSS is grepped
 * separately for the same rules, which closes most of that gap.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "reports/pkg-restructure";
const ART = "run-artifacts/pkg-restructure";
mkdirSync(OUT, { recursive: true });
mkdirSync(ART, { recursive: true });

const ROUTE = "/manuscripts/packages";

test("recon — current Submission packages page", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const sbw = await scrollbarWidth(page);

  const shot = `${OUT}/recon-1440.png`;
  await page.screenshot({ path: shot, fullPage: true });

  /* what is actually on the page right now */
  const found = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s);
    const txt = (s: string) => (q(s)?.textContent ?? "").trim().slice(0, 120);
    const box = (s: string) => {
      const el = q(s) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      url: location.pathname,
      hasRoot: !!q(".pkg-root"),
      hasTabs: !!q(".pkgw-tabs"),
      tabLabels: Array.from(document.querySelectorAll(".pkgw-tab")).map((e) => (e.textContent ?? "").trim()),
      hasStrip: !!q(".pkgw-strip"),
      stripText: txt(".pkgw-strip"),
      hasPropill: !!q(".pkgw-propill"),
      title: txt(".wpg-plate h1, .wpg-plate h2, .pkgw h1"),
      plate: box(".wpg-plate"),
      root: box(".pkg-root"),
      /* every filled (non-transparent) control on the page */
      filledControls: Array.from(document.querySelectorAll("button")).filter((b) => {
        const bg = getComputedStyle(b).backgroundColor;
        return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      }).map((b) => ({ t: (b.textContent ?? "").trim().slice(0, 30), bg: getComputedStyle(b).backgroundColor })),
    };
  });

  writeFileSync(`${ART}/recon.txt`,
    `SCROLLBAR WIDTH: ${sbw}px\n` + JSON.stringify(found, null, 2) + "\n");
  console.log(`scrollbar=${sbw}px`);
  console.log(JSON.stringify(found, null, 2));
  expect(found.hasRoot).toBe(true);
});

/**
 * ⚠️ EVERY SELECTOR BELOW IS SCOPED INSIDE `.pkg-root`. Workspace pages stay mounted and toggle
 * `display`, so a document-wide query on this route can and does return the hidden Query Centre's
 * elements — recon proved it by reading a 0x0 `.wpg-plate` and the title "Query Centre".
 */
const SCOPED = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const plate = root.querySelector(".wsh");
  const grid = root.querySelector(".pkgo-grid");
  const rail = root.querySelector(".pkgo-rail");
  const stage = root.querySelector(".pkgo-stage");
  const panels = Array.from(root.querySelectorAll(".pkgo-panel"));
  /* filled = any button inside the page whose background is not transparent */
  const filled = Array.from(root.querySelectorAll("button")).filter((b) => {
    const bg = getComputedStyle(b).backgroundColor;
    return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
  }).map((b) => ({ label: (b.textContent || "").trim().slice(0, 32), bg: getComputedStyle(b).backgroundColor }));
  return {
    plate: box(plate),
    plateBorderTop: cs(plate, "border-top-width"),
    plateBorderTopColor: cs(plate, "border-top-color"),
    plateRadius: cs(plate, "border-top-left-radius"),
    plateBg: cs(plate, "background-color"),
    grid: box(grid),
    gridCols: cs(grid, "grid-template-columns"),
    gridGap: cs(grid, "column-gap"),
    rail: box(rail),
    stage: box(stage),
    panelCount: panels.length,
    panelLabels: panels.map((p) => (p.querySelector(".pkgo-lbl")?.textContent || "").trim()),
    panelBg: panels[0] ? cs(panels[0], "background-color") : null,
    panelWidths: panels.map((p) => Math.round(p.getBoundingClientRect().width)),
    filled,
    filledCount: filled.length,
    hasTabs: !!root.querySelector(".pkgw-tabs"),
  };
})()`;

test("phase 1 — shell: header card + two-column grid", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const sbw = await scrollbarWidth(page);
  const r = await page.evaluate(SCOPED);
  await page.screenshot({ path: `${OUT}/p1-shell-1440.png`, fullPage: true });
  writeFileSync(`${ART}/p1-shell.txt`, `SCROLLBAR: ${sbw}px\n${JSON.stringify(r, null, 2)}\n`);
  console.log(JSON.stringify(r, null, 2));
});

/** Where does the plate's width come from? One box per ancestor, scoped inside the page. */
test("probe — plate vs body width chain", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    const b = (s) => { const el = root.querySelector(s); if (!el) return { sel: s, missing: true };
      const rect = el.getBoundingClientRect(); const c = getComputedStyle(el);
      return { sel: s, x: Math.round(rect.x), w: Math.round(rect.width), maxW: c.maxWidth,
        padL: c.paddingLeft, padR: c.paddingRight, ml: c.marginLeft, mr: c.marginRight,
        gridCol: c.gridColumn, display: c.display, justifySelf: c.justifySelf }; };
    const rootBox = (() => { const rect = root.getBoundingClientRect(); const c = getComputedStyle(root);
      return { sel: ".pkg-root", x: Math.round(rect.x), w: Math.round(rect.width), maxW: c.maxWidth,
        padL: c.paddingLeft, padR: c.paddingRight, display: c.display,
        cols: getComputedStyle(root.querySelector(".pkgw-wpg")).gridTemplateColumns }; })();
    return [rootBox, ...[".pkgw-wpg", ".wsh-wrap", ".wsh", ".wpg-scroll", ".pkgw-strip", ".pkgo-grid"].map(b)];
  })()`);
  writeFileSync(`${ART}/p1-widthchain.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/** The grid's own placement properties — why is row 1 narrower than row 3? */
test("probe2 — grid placement", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    const wpg = root.querySelector(".pkgw-wpg");
    const c = getComputedStyle(wpg);
    const kids = Array.from(wpg.children).map((k) => {
      const kc = getComputedStyle(k); const rect = k.getBoundingClientRect();
      return { cls: k.className, x: Math.round(rect.x), w: Math.round(rect.width),
        gridColumn: kc.gridColumn, gridRow: kc.gridRow, justifySelf: kc.justifySelf, width: kc.width };
    });
    return {
      gridTemplateColumns: c.gridTemplateColumns,
      gridTemplateRows: c.gridTemplateRows,
      gridAutoColumns: c.gridAutoColumns,
      gridAutoFlow: c.gridAutoFlow,
      justifyItems: c.justifyItems,
      justifyContent: c.justifyContent,
      kids,
    };
  })()`);
  writeFileSync(`${ART}/p1-gridplacement.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/** Why is the body 980 inside a 1010 content box? Resolve the insets and the flex alignment. */
test("probe3 — body cap", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    const scroll = root.querySelector(".wpg-scroll");
    const strip = root.querySelector(".pkgw-strip");
    const sc = getComputedStyle(scroll), st = getComputedStyle(strip);
    const rc = getComputedStyle(root);
    return {
      contentGutter: rc.getPropertyValue("--content-gutter").trim(),
      headerInset: rc.getPropertyValue("--header-inset").trim(),
      scroll: { alignItems: sc.alignItems, display: sc.display, padL: sc.paddingLeft, padR: sc.paddingRight,
                w: Math.round(scroll.getBoundingClientRect().width), clientW: scroll.clientWidth },
      strip: { alignSelf: st.alignSelf, width: st.width, maxW: st.maxWidth, marginL: st.marginLeft,
               marginR: st.marginRight, w: Math.round(strip.getBoundingClientRect().width) },
    };
  })()`);
  writeFileSync(`${ART}/p1-bodycap.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/** The rail's registers, populated. Reads the RENDERED strings — never a predicted number. */
const RAIL = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const panels = Array.from(root.querySelectorAll(".pkgo-panel")).map((p) => ({
    label: (p.querySelector(".pkgo-lbl")?.textContent || "").trim(),
    chip: (p.querySelector(".pkgo-chip")?.textContent || "").trim() || null,
    action: (p.querySelector(".pkgo-add")?.textContent || "").trim() || null,
    ghost: p.querySelector(".pkgo-ghost")
      ? { inert: p.querySelector(".pkgo-ghost").classList.contains("pkgo-ghost--inert"),
          tag: p.querySelector(".pkgo-ghost").tagName,
          text: (p.querySelector(".pkgo-ghost").textContent || "").trim() }
      : null,
    rows: Array.from(p.querySelectorAll(".pkgo-row")).map((r) => ({
      tag: r.tagName,
      type: (r.querySelector(".pkgo-type")?.textContent || "").trim() || null,
      name: (r.querySelector(".pkgo-name")?.textContent || "").trim(),
      comp: (r.querySelector(".pkgo-comp")?.textContent || "").trim() || null,
      detail: (r.querySelector(".pkgo-detail")?.textContent || "").trim(),
    })),
  }));
  /* ⚠️ A FILLED CONTROL IS ONE CARRYING A FILL DISTINCT FROM THE PAGE SURFACE — not merely any
     button with a non-transparent background. The first version of this probe counted the white
     register ROWS and reported 9, which is a fault in the measure rather than the design: the ref
     itself draws .reg-row with a white background alongside a single .btn.primary, so
     white-on-a-surface is what a row IS. Excluding white keeps the check's teeth — a second pink
     or ink button still trips it — while not counting surfaces as controls. Both readings are
     recorded so nothing is hidden by the change. */
  const isSurface = (bg) => bg === "rgba(0, 0, 0, 0)" || bg === "transparent" || bg === "rgb(255, 255, 255)";
  const btns = Array.from(root.querySelectorAll("button"));
  const filled = btns.filter((b) => !isSurface(getComputedStyle(b).backgroundColor))
    .map((b) => ({ label: (b.textContent || "").trim().slice(0, 32), bg: getComputedStyle(b).backgroundColor }));
  const anyNonTransparent = btns.filter((b) => {
    const bg = getComputedStyle(b).backgroundColor;
    return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
  }).length;
  return { panels, filled, filledCount: filled.length, anyNonTransparent,
           railW: Math.round(root.querySelector(".pkgo-rail").getBoundingClientRect().width) };
})()`;

test("phase 2 — rail registers, populated", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(RAIL);
  await page.screenshot({ path: `${OUT}/p2-rail-populated-1440.png`, fullPage: true });
  writeFileSync(`${ART}/p2-rail-populated.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/**
 * The stage: problem statement + how-it-works, with the derived progress.
 *
 * ⚠️ THE PLATE HEIGHT AND THE STEP WIDTHS ARE MEASURED ON THE RENDERED BOXES, not read from the
 * declarations that produced them. A CSS lock proves a rule exists; it does not prove what the
 * cascade and the box model did with it — which is how `repeat(auto-fit, minmax(0, 1fr))` passed
 * its own lock while resolving to two real tracks and a hundred phantom ones.
 */
const STAGE = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const box = (el) => { const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const stage = root.querySelector(".pkgo-stage");
  const prob = root.querySelector(".pkgo-prob");
  const steps = Array.from(root.querySelectorAll(".pkgo-step"));
  const plates = Array.from(root.querySelectorAll(".pkgo-plate"));
  const vw = window.innerWidth, vh = window.innerHeight;
  return {
    stage: stage ? box(stage) : null,
    hand: (root.querySelector(".pkgo-hand")?.textContent || "").trim(),
    handFont: root.querySelector(".pkgo-hand") ? getComputedStyle(root.querySelector(".pkgo-hand")).fontFamily : null,
    probSub: (root.querySelector(".pkgo-probsub")?.textContent || "").trim(),
    hiwHead: (root.querySelector(".pkgo-hiwhead h2")?.textContent || "").trim(),
    hiwTag: (root.querySelector(".pkgo-hiwtag")?.textContent || "").trim(),
    stepCount: steps.length,
    stepWidths: steps.map((s) => Math.round(s.getBoundingClientRect().width)),
    stepTitles: steps.map((s) => (s.querySelector("h3")?.textContent || "").trim()),
    ticks: steps.map((s) => (s.querySelector(".pkgo-tick")?.textContent || "").trim() || null),
    numsDone: steps.map((s) => !!s.querySelector(".pkgo-num--done")),
    liveStep: steps.map((s) => s.classList.contains("pkgo-step--live")),
    plateHeights: plates.map((p) => Math.round(p.getBoundingClientRect().height)),
    plateLabels: Array.from(root.querySelectorAll(".pkgo-platelbl")).map((l) => (l.textContent || "").trim()),
    plateSvgs: plates.filter((p) => !!p.querySelector("svg")).length,
    /* ⚠️ prove the boxes are ON SCREEN before any claim about them — a rect outside the viewport
       is not a measurement, and elementsFromPoint there returns an empty array that satisfies a
       naive assertion by returning nothing at all. */
    onScreen: steps.map((s) => { const r = s.getBoundingClientRect();
      return r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw; }),
    stripPresent: !!root.querySelector(".pkgw-strip"),
  };
})()`;

test("phase 3 — stage: problem statement + how it works", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(STAGE);
  await page.screenshot({ path: `${OUT}/p3-stage-1440.png`, fullPage: true });
  writeFileSync(`${ART}/p3-stage.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

/**
 * ⚠️ A SECOND WIDTH, because a law that holds at exactly one width is a coincidence. The ref's
 * canvas is 1240px; inside the app the content column is 1170 at a 1440 viewport, so the stage is
 * narrower than the ref's and the step cards cannot be the ref's absolute width. What must hold at
 * BOTH widths is the ref's actual rules: three equal tracks, and a 150px plate.
 */
test("phase 3 — stage at 1920 (the ref's canvas width and beyond)", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1920, height: 1200 });
  const r = await page.evaluate(STAGE);
  await page.screenshot({ path: `${OUT}/p3-stage-1920.png`, fullPage: true });
  writeFileSync(`${ART}/p3-stage-1920.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify({
    stageW: r.stage?.w, stepWidths: r.stepWidths, plateHeights: r.plateHeights,
    equal: new Set(r.stepWidths).size === 1, onScreen: r.onScreen, ticks: r.ticks,
  }, null, 2));
});

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE 4 — acceptance
   ══════════════════════════════════════════════════════════════════════════════ */

/** The three stated gates, scoped inside the page. */
const ACCEPT = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const plate = root.querySelector(".wsh");
  const rail = root.querySelector(".pkgo-rail");
  const isSurface = (bg) => bg === "rgba(0, 0, 0, 0)" || bg === "transparent" || bg === "rgb(255, 255, 255)";
  const filled = Array.from(root.querySelectorAll("button"))
    .filter((b) => !isSurface(getComputedStyle(b).backgroundColor))
    .map((b) => ({ label: (b.textContent || "").trim().slice(0, 32), bg: getComputedStyle(b).backgroundColor }));
  return {
    railWidth: rail ? Math.round(rail.getBoundingClientRect().width) : null,
    headerBorderTop: cs(plate, "border-top-width"),
    headerBorderTopColor: cs(plate, "border-top-color"),
    headerRadius: cs(plate, "border-top-left-radius"),
    headerBg: cs(plate, "background-color"),
    filled,
    filledCount: filled.length,
    tabsGone: !root.querySelector(".pkgw-tabs"),
    stripGone: !root.querySelector(".pkgw-strip"),
    panels: Array.from(root.querySelectorAll(".pkgo-lbl")).map((l) => (l.textContent || "").trim()),
    steps: root.querySelectorAll(".pkgo-step").length,
    pageScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

for (const vp of [{ width: 1440, height: 900 }, { width: 1920, height: 1200 }]) {
  test(`phase 4 — acceptance at ${vp.width}`, async ({ page }) => {
    await openRoute(page, ROUTE, vp);
    const sbw = await scrollbarWidth(page);
    const r = await page.evaluate(ACCEPT);
    await page.screenshot({ path: `${OUT}/p4-accept-${vp.width}.png`, fullPage: true });
    writeFileSync(`${ART}/p4-accept-${vp.width}.txt`, `SCROLLBAR: ${sbw}px\n${JSON.stringify(r, null, 2)}\n`);
    console.log(`── ${vp.width} ──\n` + JSON.stringify(r, null, 2));
  });
}

/**
 * The flows, driven for real.
 *
 * ⚠️ MOTION SUPPRESSION IS LIFTED FIRST. A harness that kills animation cannot exercise anything
 * that tears down on `animationend`, and it has twice reported a working flow as broken in this
 * repo. These view swaps are plain conditional renders rather than animation-driven, but the rule
 * is "suppress for static geometry, lift for anything that changes state" — and this changes state
 * four times.
 */
test("phase 4 — the rail actually opens what it says it opens", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const steps: Record<string, unknown>[] = [];

  const state = async () => page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    /* NOTE: .pkgw-tv[role=region], NOT the first [role=region] in the page. The grid's own scroll
       row is also a labelled region ("Package Workshop"), so a bare query returned IT at every
       step and the field read the same value whatever the page was showing — the wrong-element
       trap again, one scope further in. The view's own region is the one that changes. */
    const region = root.querySelector('.pkgw-tv[role="region"]');
    return {
      overview: !!root.querySelector(".pkgo-grid"),
      region: region ? region.getAttribute("aria-label") : null,
      back: !!root.querySelector(".pkgo-back"),
      matEditor: !!root.querySelector(".pkgw-med, .pkgw-mchip"),
    };
  })()`);

  steps.push({ at: "landing", ...(await state() as object) });

  /* material row → the Workshop's materials editor */
  await page.locator(".pkgo-row").first().click();
  await page.waitForTimeout(600);
  steps.push({ at: "after material row", ...(await state() as object) });

  await page.locator(".pkgo-back").click();
  await page.waitForTimeout(400);
  steps.push({ at: "after back", ...(await state() as object) });

  /* Tracking row → the existing analytics view */
  const trackRow = page.locator(".pkgo-panel", { hasText: "Tracking" }).locator(".pkgo-row").first();
  await trackRow.click();
  await page.waitForTimeout(600);
  steps.push({ at: "after tracking row", ...(await state() as object) });

  await page.locator(".pkgo-back").click();
  await page.waitForTimeout(400);
  steps.push({ at: "after back again", ...(await state() as object) });

  await page.screenshot({ path: `${OUT}/p4-flows-end.png`, fullPage: true });
  writeFileSync(`${ART}/p4-flows.txt`, JSON.stringify(steps, null, 2) + "\n");
  console.log(JSON.stringify(steps, null, 2));
});

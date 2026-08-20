/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FILL-PAGE VANISH — measured (in-flow masthead, step 3).
 *
 * ⚠️ FIVE PAGES COULD NEVER COLLAPSE BEFORE THIS: their panes scroll and the page does not, so the
 * sentinel had nothing to report and the card stayed forever on exactly the pages with least room.
 * The trigger is the first pointerdown in the content area; the masthead goes to nothing, and does
 * not come back within the visit.
 *
 * ⚠️ AND THE MANUSCRIPTS DOSSIER IS CHECKED TWICE — opened DURING the visit, and already open ON
 * ARRIVAL. `AllManuscripts` passes `condensed={!!selected}`, and if a selection can be restored on
 * mount then the first click lands on a page that is already in the working state. That is a
 * different case from the one you would naturally test, and it is the one that fails silently.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const FILL: [string, string][] = [
  ["Query Centre", "/queries"],
  ["Manuscripts", "/manuscripts"],
  ["To-do list", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
];

/**
 * ⚠️ THE GRID IS ADDRESSED BY ITS PAGE CLASS, NOT BY "THE FIRST ONE WITH A BOX".
 *
 * The workspace keeps every page MOUNTED and toggles `display`, so the document holds eight `.wpg`
 * roots at all times. "First with height" is right at a single instant and wrong the moment
 * anything navigates — which is exactly what caught this file out: a probe click landed on a link
 * in Query Centre's reading pane, the app went to `/agents`, and the post-click read measured the
 * Contact list's grid and reported that the click had not engaged. The app was correct; the
 * measurement had changed subject mid-sentence.
 */
const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /* ⚠️ BY CLASS *AND* DISPLAYED, because `.tpl-wpg` is not unique: To-do, Calendar and Noteboard
     are three pages through ONE layout, so they share it. `querySelector` returns To-do's grid on
     every one of them — it reported "the wrong page is showing" on Calendar while Calendar was
     showing perfectly well. The class names the family; the box names which of them you are on. */
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = (all.find((e) => e.getBoundingClientRect().height > 0) ?? all[0]) ?? null;
  if (!g) return null;
  const mast = g.querySelector(".wpg-mast") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const firstAfter = mast.nextElementSibling as HTMLElement | null;
  return {
    onScreen: g.getBoundingClientRect().height > 0,
    fill: g.classList.contains("wpg--fill"),
    working: g.classList.contains("wpg--working"),
    mastH: r(mast.getBoundingClientRect().height),
    mastOpacity: Number(getComputedStyle(mast).opacity),
    /* where the first thing BELOW the masthead sits, relative to the scroller — the space handed
       back is the whole difference between these two readings */
    nextTop: firstAfter ? r(firstAfter.getBoundingClientRect().top - sc.getBoundingClientRect().top) : -1,
    nextClass: firstAfter?.className ?? "none",
  };
}, cls);

/** the page-specific class on each grid root, so a reading always names its subject */
const GRID_CLASS: Record<string, string> = {
  "/queries": "qc-wpg",
  "/manuscripts": "msv-wpg",
  "/todo": "tpl-wpg",
  "/todo/calendar": "tpl-wpg",
  "/todo/noteboard": "tpl-wpg",
};

/**
 * A pointerdown in the CONTENT area — and it lands in the scroller's own GUTTER.
 *
 * ⚠️ NOT A POINT IN THE MIDDLE OF THE CONTENT, and the reason is a measured one. The first version
 * clicked the centre of the content area 120px below the masthead; on Query Centre that is inside
 * the reading pane, the point landed on a link, and the app navigated to `/agents` mid-measurement.
 * The gutter is `.wpg-scroll`'s own horizontal padding: inside the scroller, unmistakably the
 * content area, and structurally incapable of holding a control.
 *
 * ⚠️ AND THE POINT IS PROVED ON SCREEN AND ON THE SCROLLER BEFORE IT IS USED. `elementsFromPoint`
 * outside the viewport returns an EMPTY array, so a probe that skips this asserts about a pixel the
 * browser never looked at.
 */
const clickContent = async (page: Page, cls: string) => {
  const box = await page.evaluate((c) => {
    const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
    const g = all.find((e) => e.getBoundingClientRect().height > 0) ?? all[0];
    const sc = g.querySelector(".wpg-scroll") as HTMLElement;
    const mast = g.querySelector(".wpg-mast") as HTMLElement;
    const b = sc.getBoundingClientRect(), m = mast.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(sc).paddingLeft);
    const x = Math.round(b.left + Math.max(6, pad / 2));
    const y = Math.round(Math.min(m.bottom + 80, b.bottom - 20));
    const onScreen = y > m.bottom && y < window.innerHeight && x > 0 && x < window.innerWidth;
    const stack = onScreen ? (document.elementsFromPoint(x, y) as HTMLElement[]) : [];
    return {
      x, y, onScreen,
      hitsScroller: stack.some((e) => e.classList?.contains("wpg-scroll")),
      /* a link or a button here would make this a navigation test rather than an engagement one */
      interactive: stack.slice(0, 3).some((e) => ["A", "BUTTON", "INPUT"].includes(e.tagName)),
      top: stack[0]?.className || stack[0]?.tagName || "none",
    };
  }, cls);
  expect(box.onScreen, "the content point is not below the masthead and on screen — its answer would mean nothing").toBe(true);
  expect(box.hitsScroller, `the content point does not reach the scroller (top: ${box.top})`).toBe(true);
  expect(box.interactive, `the content point landed on a control (${box.top}) — that would measure navigation, not engagement`).toBe(false);
  const before = page.url();
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(page.url(), "the click navigated — the reading after it would be about a different page").toBe(before);
};

test("the masthead vanishes on engagement, on every fill page", async ({ page }) => {
  const lines: string[] = [];
  for (const [name, route] of FILL) {
    const cls = GRID_CLASS[route];
    await openRoute(page, route, { width: 1440, height: 900 });
    /* ⚠️ MOTION SUPPRESSION IS LIFTED BEFORE ANY STATE CHANGE. A harness that kills animation cannot
       exercise a flow that ends on a transition — and it reports the result as a broken feature. */
    await liftMotionSuppression(page);
    const rest = await read(page, cls);
    expect(rest, `${name}: no grid with class .${cls}`).not.toBeNull();
    expect(rest!.onScreen, `${name}: the grid is mounted but not displayed — the wrong page is showing`).toBe(true);
    expect(rest!.fill, `${name} is not a fill page — this file measures fill pages`).toBe(true);

    await clickContent(page, cls);
    const worked = (await read(page, cls))!;

    lines.push(
      `\n══ ${name} (${route})`,
      `   REST    masthead ${rest!.mastH}px opacity ${rest!.mastOpacity} · next "${rest!.nextClass}" at ${rest!.nextTop} · working=${rest!.working}`,
      `   WORKED  masthead ${worked.mastH}px opacity ${worked.mastOpacity} · next at ${worked.nextTop} · working=${worked.working}`,
      `   reclaimed ${Math.round(rest!.nextTop - worked.nextTop)}px`,
    );

    expect(rest!.working, `${name}: the page arrived already working`).toBe(false);
    expect(rest!.mastH, `${name}: no masthead on arrival`).toBeGreaterThan(60);
    expect(worked.working, `${name}: the first click in the content area did not register as engagement`).toBe(true);
    expect(worked.mastH, `${name}: the masthead did not collapse to nothing`).toBeLessThanOrEqual(1);
    expect(worked.mastOpacity, `${name}: the masthead is still painted`).toBe(0);
    /* the space handed back is the masthead's FULL height, not a band's worth of it */
    expect(rest!.nextTop - worked.nextTop, `${name}: the content below did not rise by the masthead's height`)
      .toBeGreaterThanOrEqual(rest!.mastH - 1);
  }
  console.log(lines.join("\n"));
});

test("⚠️ a click ON the masthead does not collapse it", async ({ page }) => {
  /* The old rule was structural — the header was row 1 and only rows 2-4 carried the handler. The
     masthead is inside the scroller now, so this is a containment test in the component, and it is
     the difference between a header that leaves when you work and one that hides when you touch it. */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const pt = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.qc-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const b = (g.querySelector(".wsh-title") as HTMLElement).getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), ok: b.top > 0 && b.bottom < window.innerHeight };
  });
  expect(pt.ok, "the title is not on screen — the probe would mean nothing").toBe(true);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  const after = (await read(page, "qc-wpg"))!;
  expect(after.working, "clicking the masthead collapsed it — a control that hides itself when used").toBe(false);
  expect(after.mastH, "the masthead went on its own click").toBeGreaterThan(60);
});

test("⚠️ THE MANUSCRIPTS DOSSIER — opened during the visit, and the arrival case named", async ({ page }) => {
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const arrived = (await read(page, "msv-wpg"))!;
  expect(arrived.working, "Manuscripts arrived already working").toBe(false);
  expect(arrived.mastH, "no masthead on arrival").toBeGreaterThan(60);

  /* open a dossier by clicking a library card — the real path, not a synthesised state */
  const opened = await page.evaluate(() => {
    const card = document.querySelector(".mlib-card, .mlib-grid button, .mlib-grid [role='button']") as HTMLElement | null;
    if (!card) return false;
    card.click();
    return true;
  });
  expect(opened, "no manuscript card to open — the seeded account has no manuscripts").toBe(true);
  await page.waitForTimeout(800);
  const inDossier = (await read(page, "msv-wpg"))!;

  console.log(
    `\n══ Manuscripts dossier` +
    `\n   arrived  masthead ${arrived.mastH} working=${arrived.working}` +
    `\n   dossier  masthead ${inDossier.mastH} working=${inDossier.working}`,
  );
  expect(inDossier.working, "opening a dossier did not put the page in the working state").toBe(true);
  expect(inDossier.mastH, "the masthead survived the dossier opening").toBeLessThanOrEqual(1);

  /**
   * ⚠️ THE ALREADY-OPEN-ON-ARRIVAL CASE CANNOT CURRENTLY OCCUR, AND THAT IS A FINDING RATHER THAN A
   * REASON TO SKIP IT. `AllManuscripts` initialises `openId` to `null` and never seeds it — it
   * WRITES `scriptally_active_manuscript_id` for the comps and packages sub-pages to read, and
   * never reads it back into its own view state. So a fresh arrival is always the library.
   *
   * The concern behind the question is real all the same: if a selection is ever restored on
   * mount, `condensed` is true at FIRST PAINT and the first click lands on a page already in the
   * working state. That case is locked in `workspacePageGrid.test.tsx` against rendered output —
   * a grid that arrives working must arrive with its masthead already collapsed, never draw one
   * frame of full masthead and then remove it.
   */
  const restores = await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"));
  expect(restores, "the dossier wrote no active-manuscript pointer — the premise of this note has changed").toBeTruthy();
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const returned = (await read(page, "msv-wpg"))!;
  console.log(`   returning with a pointer in storage: masthead ${returned.mastH} working=${returned.working}`);
  expect(returned.working, "Manuscripts began restoring its dossier on mount — the arrival case is now live, and the note above needs rewriting").toBe(false);
  expect(returned.mastH, "the masthead did not return on the next visit").toBeGreaterThan(60);
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HIDE — the masthead's one action, and the only thing that folds it (masthead rethink, step 4).
 *
 * ⚠️ THIS REPLACES `mastheadVanish.measure.ts`, WHOSE SUBJECT IS DELETED. That file measured a fold
 * triggered by the first click anywhere in the content area, plus two cases that followed from it:
 * "absent after a content click" and "absent after journey exit". Both were assertions about an
 * INFERENCE — the app deciding the writer had started working — and the inference is gone. A click
 * in the content now does nothing to the masthead, and leaving a journey leaves whatever state the
 * writer chose.
 *
 * ⚠️ SO THE STRONGEST CASE HERE IS A NEGATIVE ONE: clicking in the content must NOT fold it. That
 * is the behaviour that changed, and nothing else in the suite would notice if it came back.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const FILL: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre", route: "/queries",         cls: "qc-wpg"  },
  { name: "Manuscripts",  route: "/manuscripts",     cls: "msv-wpg" },
  { name: "To-do list",   route: "/todo",            cls: "tpl-wpg" },
  { name: "Calendar",     route: "/todo/calendar",   cls: "tpl-wpg" },
  { name: "Noteboard",    route: "/todo/noteboard",  cls: "tpl-wpg" },
];

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /* by class AND displayed — `.tpl-wpg` is shared by the three Tasks pages */
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = all.find((e) => e.getBoundingClientRect().height > 0);
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const mast = g.querySelector(".wpg-mast") as HTMLElement;
  const mini = g.querySelector(".wpg-mini") as HTMLElement | null;
  const hide = g.querySelector(".wpg-mast-hide") as HTMLElement | null;
  const show = g.querySelector(".wpg-mini-show") as HTMLElement | null;
  const after = mast.nextElementSibling as HTMLElement | null;
  const scb = sc.getBoundingClientRect();
  return {
    hidden: g.classList.contains("wpg--hidden"),
    mastH: r(mast.getBoundingClientRect().height),
    miniH: mini ? r(mini.getBoundingClientRect().height) : -1,
    hasHide: !!hide,
    hasShow: !!show,
    /* where the first thing below the masthead sits — the space the fold hands back */
    nextTop: after ? r(after.getBoundingClientRect().top - scb.top) : -1,
    /* the masthead's own actionable count — Hide is the ONE exception to the no-actions rule */
    mastActionable: mast.querySelectorAll("button, a, input, select, textarea, [role='button']").length,
  };
}, cls);

/** a pointerdown in the scroller's own gutter — content area, structurally incapable of holding a control */
const clickContent = async (page: Page, cls: string) => {
  const box = await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
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
      interactive: stack.slice(0, 3).some((e) => ["A", "BUTTON", "INPUT"].includes(e.tagName)),
      top: stack[0]?.className || stack[0]?.tagName || "none",
    };
  }, cls);
  expect(box.onScreen, "the content point is off screen — its answer would mean nothing").toBe(true);
  expect(box.hitsScroller, `the content point does not reach the scroller (top: ${box.top})`).toBe(true);
  expect(box.interactive, `the content point landed on a control (${box.top})`).toBe(false);
  const before = page.url();
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(page.url(), "the click navigated — the reading after it would be about a different page").toBe(before);
};

/**
 * Click a control inside the DISPLAYED grid for a page.
 *
 * ⚠️ `.locator(...).first()` IS WRONG HERE AND IT FAILED EXACTLY AS THE REST OF THIS SUITE PREDICTS.
 * `.tpl-wpg` is three pages through one layout and the workspace keeps them all MOUNTED, toggling
 * `display` — so "the first match in the DOM" is a hidden page's control, and Playwright waited
 * seven minutes for something that will never become visible. The same trap `read()` already avoids
 * by finding the grid with a box: the class names the family, the box names which of them you are
 * on.
 *
 * ⚠️ AND IT CLICKS BY COORDINATE, WITH THE POINT PROVED ON SCREEN FIRST — a rect outside the
 * viewport is not something a user could click, and asserting against one asserts nothing.
 */
const clickIn = async (page: Page, cls: string, sel: string, what: string) => {
  const pt = await page.evaluate(([c, q]) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!g) return null;
    const el = g.querySelector(q) as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return {
      x: Math.round(b.left + b.width / 2),
      y: Math.round(b.top + b.height / 2),
      onScreen: b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= window.innerHeight,
    };
  }, [cls, sel] as const);
  expect(pt, `${what}: not rendered inside the displayed .${cls}`).not.toBeNull();
  expect(pt!.onScreen, `${what}: its box is off screen — clicking it would prove nothing`).toBe(true);
  await page.mouse.click(pt!.x, pt!.y);
  await page.waitForTimeout(600);
};

test("Hide folds the masthead, the chevron brings it back — on every fill page", async ({ page }) => {
  const lines: string[] = [];
  const restH: number[] = [];
  const miniH: number[] = [];

  for (const { name, route, cls } of FILL) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);

    const rest = await read(page, cls);
    expect(rest, `${name}: no visible grid with class .${cls}`).not.toBeNull();
    expect(rest!.hidden, `${name}: the page arrived folded — Hide is per-visit and starts false`).toBe(false);
    expect(rest!.mastH, `${name}: no masthead on arrival`).toBeGreaterThan(60);
    expect(rest!.hasHide, `${name}: a fill page renders no Hide — nothing can fold it`).toBe(true);
    expect(rest!.miniH, `${name}: a mini bar rendered beside a visible masthead`).toBe(-1);
    /* ⚠️ EXACTLY ONE ACTIONABLE ON THE MASTHEAD, AND IT IS HIDE. Structural, never a name list. */
    expect(rest!.mastActionable, `${name}: the masthead carries ${rest!.mastActionable} controls, not the single Hide`).toBe(1);

    /* ⚠️ THE BEHAVIOUR THAT CHANGED, ASSERTED FIRST: a content click must do NOTHING. Nothing else
       in the suite would notice the click-anywhere vanish coming back. */
    await clickContent(page, cls);
    const clicked = (await read(page, cls))!;
    expect(clicked.hidden, `${name}: a click in the content folded the masthead — that trigger is deleted`).toBe(false);
    expect(clicked.mastH, `${name}: the masthead moved on a content click`).toBeCloseTo(rest!.mastH, 0);

    await clickIn(page, cls, ".wpg-mast-hide", `${name}: Hide`);
    const folded = (await read(page, cls))!;

    lines.push(
      `\n══ ${name}`,
      `   rest    masthead ${rest!.mastH} · mini ${rest!.miniH} · next ${rest!.nextTop} · Hide=${rest!.hasHide}`,
      `   folded  masthead ${folded.mastH} · mini ${folded.miniH} · next ${folded.nextTop} · chevron=${folded.hasShow}`,
    );

    expect(folded.hidden, `${name}: Hide did not fold the masthead`).toBe(true);
    expect(folded.mastH, `${name}: the masthead did not fold to nothing`).toBeLessThanOrEqual(1);
    /* ⚠️ PRESENT AND NON-TRIVIAL, NOT A NUMBER (masthead measure, §3). The bar's height is now
       derived from its type — `2 × padding + the name's line box` — and `miniBar.measure.ts` owns
       that derivation. This file owns HIDE'S BEHAVIOUR, so what it needs is that something real
       took the masthead's place; pinning 51 here just duplicated a constant into a second file for
       it to go stale in. */
    expect(folded.miniH, `${name}: no mini bar took its place`).toBeGreaterThan(20);
    expect(folded.hasShow, `${name}: the mini bar carries no way back`).toBe(true);
    expect(folded.hasHide, `${name}: Hide is still rendered on a folded masthead`).toBe(false);

    /* the chevron reverses it */
    await clickIn(page, cls, ".wpg-mini-show", `${name}: the restore chevron`);
    const back = (await read(page, cls))!;
    expect(back.hidden, `${name}: the chevron did not restore the masthead`).toBe(false);
    expect(back.mastH, `${name}: the restored masthead is not its resting height`).toBeCloseTo(rest!.mastH, 0);
    expect(back.miniH, `${name}: the mini bar survived the restore`).toBe(-1);

    restH.push(rest!.mastH);
    /* ⚠️ THE MEASURED VALUE, NOT A LITERAL — AND IT USED TO BE `51`. Pushing a constant into the
       set below made the page-to-page check vacuous: ten copies of one number always collapse to
       one distinct value, so it passed by construction while claiming "page against page, never a
       constant" three lines later. The same family as an off-screen `elementsFromPoint` — an
       assertion satisfied by what it was handed rather than by what it measured. */
    miniH.push(folded.miniH);
  }
  console.log(lines.join("\n"));

  /* ⚠️ ONE COLLAPSED STATE EVERYWHERE — page against page, never a constant. */
  expect([...new Set(miniH)], "the folded bar differs page to page").toHaveLength(1);
  void restH;
});

test("⚠️ A SCROLLING PAGE HAS NO HIDE AND NO CHEVRON — not hidden, not rendered", async ({ page }) => {
  /* Its masthead leaves by scrolling. A Hide there would be a second way to do what the page
     already does, and a control that becomes pointless the moment you scroll past it. Asserted
     structurally, because a CSS `display: none` would still leave it in the tab order. */
  for (const [name, route, cls] of [
    ["Contact list", "/agents", "agl-wpg"],
    ["Analytics", "/queries/analytics", "qa-wpg"],
    ["Submission packages", "/manuscripts/packages", "pkgw-wpg"],
  ] as const) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await read(page, cls))!;
    expect(r.hasHide, `${name}: a scrolling page renders Hide`).toBe(false);
    expect(r.hasShow, `${name}: a scrolling page renders the restore chevron`).toBe(false);
    expect(r.mastActionable, `${name}: the masthead carries ${r.mastActionable} controls — a scrolling page's has none`).toBe(0);
  }
});

test("⚠️ THE FOLD IS PER-VISIT — a remount shows the masthead again", async ({ page }) => {
  /**
   * Hide is component state by decision: no `localStorage`, no key to migrate. A writer who folded
   * the header once to get at a list should not have to unfold it every day.
   *
   * ⚠️ AND THE RESET IS THE GRID'S BOX GOING HIDDEN → SHOWN, not an unmount — these pages never
   * unmount, because the workspace toggles `display`. Leaving and returning is what a visit IS
   * here, so that is what this exercises.
   */
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await clickIn(page, "msv-wpg", ".wpg-mast-hide", "Manuscripts: Hide");
  expect((await read(page, "msv-wpg"))!.hidden, "Hide did not fold it").toBe(true);

  /* leave for another workspace page, then come back — a display toggle, not an unmount */
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  await openRoute(page, "/manuscripts", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const back = (await read(page, "msv-wpg"))!;
  expect(back.hidden, "the fold survived a page visit — it is per-visit by decision").toBe(false);
  expect(back.mastH, "the masthead did not return on the next visit").toBeGreaterThan(60);
});

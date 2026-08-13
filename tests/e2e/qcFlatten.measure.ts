/**
 * QUERY CENTRE — THE FLATTEN, measured on the running page.
 *
 * ⚠️ IT RUNS AGAINST LOCALHOST, NOT THE DEPLOYED SITE. This pack must not deploy, so the deployed
 * bundle is one build behind and asserting against it would report on code that is not this.
 *
 *   npm run dev   (or preview_start)
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcFlatten
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const read = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const body = g.querySelector(".f12-body") as HTMLElement | null;
  const list = g.querySelector(".f12-list") as HTMLElement | null;
  const W = document.documentElement.clientWidth;
  const cs = body ? getComputedStyle(body) : null;
  const scb = sc.getBoundingClientRect();
  return {
    /* nothing between the scroller and the content may draw */
    /* ⚠️ CONTAINER PROPERTIES ONLY. The first version also flagged `padding`, and caught a 12px
       TOP pad that is not the frame's — it is an inline, conditional rule in Queries.tsx (`--gut`
       when no filter chips are showing, 0 when they are), i.e. vertical rhythm between the toolbar
       area and the panes rather than a box. Removing it would butt the panes against the toolbar
       on the commonest state. What must be gone is anything that draws a BOX. */
    bodyDraws: cs ? [
      cs.borderTopWidth !== "0px" || cs.borderLeftWidth !== "0px" ? `border ${cs.borderTopWidth}` : "",
      cs.borderRadius !== "0px" ? `radius ${cs.borderRadius}` : "",
      cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? `bg ${cs.backgroundColor}` : "",
      cs.boxShadow !== "none" ? "shadow" : "",
      cs.paddingLeft !== "0px" || cs.paddingRight !== "0px" || cs.paddingBottom !== "0px" ? `side/bottom pad ${cs.padding}` : "",
      cs.margin !== "0px" ? `margin ${cs.margin}` : "",
    ].filter(Boolean) : ["ABSENT"],
    rhythmPadTop: cs ? cs.paddingTop : "—",
    /* the seam */
    seam: list ? `${getComputedStyle(list).borderRightWidth} ${getComputedStyle(list).borderRightColor}` : "no list",
    /* gutters, measured from the window edges to the content */
    gutterL: body ? r(body.getBoundingClientRect().left - scb.left) : -1,
    gutterR: body ? r(scb.right - body.getBoundingClientRect().right) : -1,
    winL: body ? r(body.getBoundingClientRect().left) : -1,
    winR: body ? r(W - body.getBoundingClientRect().right) : -1,
    pageScroll: sc.scrollHeight - sc.clientHeight,
  };
});

for (const vp of [{ width: 1440, height: 900 }, { width: 1024, height: 800 }, { width: 1920, height: 1080 }]) {
  test(`§1 — the working area is not a container (${vp.width})`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    const s = await read(page);
    console.log(`${vp.width}: ${JSON.stringify(s)}`);
    /* ⚠️ THE BORDER WAS THE FAULT, NOT THE SPACE. A fill page whose content is short is taller
       than its content by design; framed that reads as broken, unframed it is simply page. */
    expect(s.bodyDraws, `the working area still draws: ${s.bodyDraws.join(", ")}`).toEqual([]);
    expect(s.seam, "the seam between the two independently scrolling columns is missing").toMatch(/^1px rgb/);
    /* ⚠️ MEASURED AGAINST THE ROW'S BORDER BOX, so the expected value is the row's own inset —
       `--content-gutter` 80px plus the 15px `scrollbar-gutter: stable both-edges` reservation — not
       zero. What matters is that the two sides AGREE and that the content states no inset of its
       own on top of them; my first version asserted 0 and was measuring the row's padding. */
    expect(s.gutterL, `the gutters differ: ${s.gutterL} vs ${s.gutterR}`).toBe(s.gutterR);
    expect(s.gutterL, "the content gained an inset of its own on top of the row's gutter").toBeLessThan(100);
    /* ⚠️ THE GUTTER IS MEASURED INSIDE THE SCROLL ROW, NOT FROM THE VIEWPORT EDGE. The first
       version compared distance-from-window and reported 342 against 118 — that difference is the
       RAIL, which is locked and out of scope. `gutterL === gutterR === 0` above already says the
       content sits exactly on the row's padding edges, and the row pays one token to both sides. */
    expect(s.winL - s.winR, `sanity: the left band should exceed the right by the rail's width, not by a content inset (${s.winL} vs ${s.winR})`)
      .toBeGreaterThan(150);
    /* the height chain is untouched — this stays a fill page */
    expect(s.pageScroll, "the page scrolls — the fill chain changed, and it must not have").toBe(0);
  });
}

/* ── §2 — the journey's strip offers no exit of its own ──────────────────────────────────────── */

const journeyState = (page: Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const strip = g.querySelector(".wsh") as HTMLElement;
  return {
    stripH: Math.round(strip.getBoundingClientRect().height),
    stripActions: [...g.querySelectorAll(".wsh-acts button")].map((b) => (b.textContent ?? "").trim()),
    open: !!g.querySelector(".qc-take-body"),
    inPaneCancel: [...g.querySelectorAll(".qch-acts button")].map((b) => (b.textContent ?? "").trim()),
  };
});

test("§2 — the strip keeps its band and loses its duplicate exit", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  /* ⚠️ SUPPRESSION OFF: the takeover tears down on `animationend`, which a suppressed animation
     never fires — it reads exactly like a broken exit. And it is lifted BY MARKER: the text-matching
     version deleted three of the app's own stylesheets under `vite dev` (see measure.ts). */
  await liftMotionSuppression(page);

  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(800);
  const open = await journeyState(page);
  console.log("journey open:", JSON.stringify(open));
  expect(open.open, "the takeover did not open").toBe(true);
  /* the BAND stays — it is the page's own chrome and strips on the journey */
  expect(open.stripH, "the header band left with the Close button — it should stay").toBe(52);
  /* ...and offers no exit of its own */
  expect(open.stripActions, `the strip still offers an action: ${open.stripActions.join(", ")}`).toEqual([]);
  /* the exit the writer uses is on the journey's own header */
  expect(open.inPaneCancel.some((t) => /cancel/i.test(t)), "the in-pane Cancel is missing — the journey has no exit at all").toBe(true);

  /* Esc closes */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  expect((await journeyState(page)).open, "Escape did not close the journey").toBe(false);

  /* and Cancel closes */
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(800);
  await page.locator(".qch-acts button", { hasText: /^Cancel$/ }).first().click();
  await page.waitForTimeout(900);
  const after = await journeyState(page);
  expect(after.open, "Cancel did not close the journey").toBe(false);
  expect(after.stripH, "the resting card did not come back after Cancel").toBe(96);
});

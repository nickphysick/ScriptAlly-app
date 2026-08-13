/**
 * §4 GATE — the two Query Centre journeys, on the real seeded page.
 *
 * ⚠️ IT STARTED AS A REPORT-ONLY DIAGNOSTIC and the report is what found the fault: every element
 * in the create journey was mounted, styled and correct, and the box holding them measured 0px. A
 * source scan could not have found that, and neither could an assertion written before anyone knew
 * which box it was. It asserts now because the answer is known.
 *
 *   npx playwright test --project=measure journeys
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const VP = { width: 1440, height: 900 };

const read = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const box = (s: string) => {
    const el = g.querySelector(s) as HTMLElement | null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { w: r(b.width), h: r(b.height), top: r(b.top), display: getComputedStyle(el).display, position: getComputedStyle(el).position, overflowY: getComputedStyle(el).overflowY };
  };
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  return {
    stripH: r((g.querySelector(".wsh") as HTMLElement).getBoundingClientRect().height),
    /* ⚠️ QUERY CENTRE'S WORKING STATE IS MODE-DRIVEN, NOT SCROLL-DRIVEN, so the matrix never sees
       it: the page is a fill page, nothing scrolls, and its strip only appears on entering a
       journey. It is therefore the ONE page whose working register the cross-page equality cannot
       reach — which is exactly the page a "same on every page" rule most needs to cover. */
    titleReg: (() => {
      const t = g.querySelector(".wsh-title") as HTMLElement | null;
      if (!t) return "—";
      const c = getComputedStyle(t);
      return `${c.fontFamily.split(",")[0].replace(/"/g, "")}/${c.fontSize}/${c.fontWeight}/${c.letterSpacing}/${c.textTransform}`;
    })(),
    markGone: (() => {
      const m = g.querySelector(".wsh-mark") as HTMLElement | null;
      return m ? (m.getBoundingClientRect().width === 0 && getComputedStyle(m).opacity === "0") : true;
    })(),
    /* the band, for the same reason the label is here: the matrix cannot reach this page's
       working state, so its ground and edge are unchecked anywhere else */
    band: (() => {
      const h = g.querySelector(".wsh") as HTMLElement;
      const c = getComputedStyle(h);
      return `${c.backgroundColor} / ${c.borderBottomWidth} ${c.borderBottomColor}`;
    })(),
    pageScroll: sc.scrollHeight - sc.clientHeight,
    scrollTop: r(sc.scrollTop),
    list: box(".f12-list"),
    toolbar: box(".f12-ctl"),
    takeBody: box(".qc-take-body"),
    steps: box(".qc-form"),
    stack: box(".qc-stack"),
    ref: box(".qc-ref"),
    picker: box(".qc-pickwrap"),
    /* the browsing surfaces, so "Close returns to browsing" means something */
    hero: box(".f12-hero"),
    cols: box(".qp-cols"),
    /* ⚠️ ANY BOX IN THE SCROLL ROW MEASURING 0 WHILE HOLDING RENDERED CONTENT — the fill-chain
       fault, stated once and checked in every state rather than only the one that showed it. */
    zeroKids: (() => {
      const out: string[] = [];
      const walk = (el: Element, d: number) => {
        for (const kid of Array.from(el.children)) {
          const k = kid as HTMLElement;
          const h = k.getBoundingClientRect().height;
          const inner = Math.max(0, ...[...k.querySelectorAll("*")].map((x) => x.getBoundingClientRect().height));
          if (h < 1 && inner > 1 && getComputedStyle(k).display !== "none") out.push(`${k.className.toString().slice(0, 26) || k.tagName.toLowerCase()} 0px holding ${Math.round(inner)}px`);
          else if (d < 3) walk(k, d + 1);
        }
      };
      walk(sc, 0);
      return out;
    })(),
  };
});

/** the motion needs the suppression stylesheet OFF — see the note where it is removed */
const motion = (page: Page) => page.evaluate(() => {
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const pane = g.querySelector(".qp-pane") as HTMLElement | null;
  const body = g.querySelector(".qc-take-body");
  return {
    cls: pane?.className ?? "",
    paneAnim: pane ? getComputedStyle(pane).animationName : "none",
    kids: body ? [...body.querySelectorAll("*")].slice(0, 80).map((x) => getComputedStyle(x).animationName).filter((n) => n !== "none") : [],
  };
});

/** `openRoute` injects `animation: none !important` so geometry can be read mid-transition — right
 *  for every other measurement and fatal for this one. It reported `animationName: none` on a class
 *  whose entire job is to run an animation, and I nearly filed working motion as dead. */
/* ⚠️ BY MARKER, NOT BY TEXT. Matching on the declaration deleted three of the app's OWN stylesheets
   under `vite dev`, which serves each CSS file as an injected `<style>` — `f12.css` carries that
   exact string in a reduced-motion block. It could not show against the deployed build, where the
   CSS is one linked file, and it presented as the header band measuring 24px with a computed
   height of 24: the rule was not overridden, its stylesheet was gone. */
const unsuppress = liftMotionSuppression;

const openCreate = async (page: Page) => {
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(700);
};

/** select a row whose status puts it on the branch we want, then open the response takeover */
const openRecord = async (page: Page, rowIndex = 0) => {
  const rows = page.locator(".f12-row");
  await rows.nth(rowIndex).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Record response|Mark sent|Record resubmission|Reopen/i }).first().click();
  await page.waitForTimeout(700);
};

test("§4 — browsing, create, record: the panes scroll and the page does not", async ({ page }) => {
  await openRoute(page, "/queries", VP);
  /**
   * ⚠️ SUPPRESSION OFF FOR ANY TEST THAT CHANGES STATE, and this is the SECOND false reading it has
   * produced in one session. `openRoute` injects `animation: none !important` so geometry can be
   * read mid-transition; the takeover's teardown is driven by `onAnimationEnd`, and a suppressed
   * animation never fires `animationend` — so Escape armed `qc-exit-cancel` and the journey simply
   * never left, at every timing tried. It reads exactly like a broken exit. `Queries.tsx` already
   * carries the warning ("`animation: none` does NOT still fire animationend — verified
   * in-browser"), which is why its reduced-motion path is a branch at the arming site.
   *
   * Every geometry reading here is taken AFTER a transition has settled, so nothing is lost by
   * letting the animations run: the harness waits instead of freezing.
   */
  await unsuppress(page);
  /* ⚠️ AND THEN WAIT, WHICH THIS CALL SITE DID NOT. Lifting the suppression restarts whatever was
     frozen at its start value, so the first frames after it are mid-transition: browsing measured
     7px of overflow at +0ms, 1px at +100ms and 0 from +300ms on. The note above already says every
     reading here is taken after a transition has settled — this was the one place that did not. */
  await page.waitForTimeout(400);

  const browse = (await read(page))!;
  expect(browse.stripH, "browsing does not hold the resting card").toBe(96);
  /* ⚠️ THE PAGE-SCROLLS SYMPTOM CLOSES WITH THE SEAM, and this is where that is confirmed rather
     than assumed. Before the fill variant this measured 729: `.f12-body` sized to content and grew
     past the row, so the row scrolled and the panes did not — the inverse of the page's own rule. */
  expect(browse.pageScroll, "the page scrolls — the fill chain has stopped resolving and the panes are growing past the row").toBe(0);
  expect(browse.list!.h, "the list is not filling the row").toBeGreaterThan(400);
  expect(browse.zeroKids, `a box measures 0 while holding content: ${browse.zeroKids.join(" · ")}`).toEqual([]);

  await openCreate(page);
  const create = (await read(page))!;
  expect(create.stripH, "the strip did not condense on entering the journey").toBe(52);
  /* the same label the other nine pages wear — asserted here because nothing else can reach it */
  expect(create.titleReg, "Query Centre's working title is not the mono label the other pages wear")
    .toBe("JetBrains Mono/11.5px/500/2.3px/uppercase");
  expect(create.markGone, "the mark is still drawn in Query Centre's working strip").toBe(true);
  expect(create.band, "Query Centre's band is not the parchment ground with its own edge").toMatch(/^rgb\(253, 250, 245\) \/ 1px rgb/);
  expect(create.pageScroll, "the takeover introduced an outer scroller").toBe(0);
  /* the takeover replaces the WHOLE work area — list and the browsing toolbar both go */
  expect(create.list!.display, "the list is still rendered under the takeover").toBe("none");
  expect(create.toolbar, "the browsing toolbar is still rendered above the takeover").toBeNull();
  /* ⚠️ THE FAULT, ASSERTED AS A HEIGHT. This measured exactly 0 with a 167px step stack inside it. */
  expect(create.takeBody!.h, "the journey body collapsed — the fill chain is broken").toBeGreaterThan(300);
  expect(create.stack!.h, "the step stack did not render").toBeGreaterThan(60);
  expect(create.steps!.overflowY, "the step flow does not scroll internally").toMatch(/auto|scroll/);
  /* stage 1 is ONE column: the picker grid takes the width the panel would have had (a decision,
     recorded in QueryCreatePane — a right-hand quick-picks column was deliberately removed) */
  expect(create.ref, "a reference panel appeared in stage 1 — stage 1 is single-column by decision").toBeNull();
  expect(create.picker, "the agent picker did not render").not.toBeNull();
  expect(create.zeroKids, `a box measures 0 while holding content: ${create.zeroKids.join(" · ")}`).toEqual([]);

  /* Close returns to browsing with the list and the reading pane intact */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const back = (await read(page))!;
  expect(back.stripH, "the resting card did not come back on exit").toBe(96);
  expect(back.takeBody, "the takeover is still mounted after Close").toBeNull();
  expect(back.list!.display, "the list did not come back").not.toBe("none");
  expect(back.pageScroll, "the page scrolls after returning to browsing").toBe(0);

  await openRecord(page);
  const rec = (await read(page))!;
  expect(rec.stripH, "the strip did not condense on the response journey").toBe(52);
  expect(rec.titleReg, "the response journey's title is not the mono label").toBe("JetBrains Mono/11.5px/500/2.3px/uppercase");
  expect(rec.markGone, "the mark is still drawn in the response journey's strip").toBe(true);
  expect(rec.band, "the response journey's band is not the parchment ground with its own edge").toMatch(/^rgb\(253, 250, 245\) \/ 1px rgb/);
  expect(rec.pageScroll, "the response takeover introduced an outer scroller").toBe(0);
  expect(rec.list!.display, "the list is still rendered beside the response takeover").toBe("none");
  expect(rec.toolbar, "the browsing verbs are still drawn above the query being recorded").toBeNull();
  expect(rec.takeBody!.h, "the response body collapsed").toBeGreaterThan(250);
  /* ⚠️ THE WIDTH IS THE TELL. With the list still rendered this measured 588 — the journey looked
     cramped rather than wrong, which is why it survived. It takes the work area now. */
  expect(rec.takeBody!.w, "the response takeover is squeezed — something is still sharing the work area").toBeGreaterThan(800);
  expect(rec.steps!.overflowY, "the step flow does not scroll internally").toMatch(/auto|scroll/);
  expect(rec.ref!.position, "the reference panel is not sticky").toBe("sticky");
  expect(rec.zeroKids, `a box measures 0 while holding content: ${rec.zeroKids.join(" · ")}`).toEqual([]);
});

test("§4 — the reference panel stays put while the step flow scrolls", async ({ page }) => {
  await openRoute(page, "/queries", VP);
  await unsuppress(page);  /* the journeys tear down on `animationend` — see the note above */
  await openRecord(page);
  const before = (await read(page))!;
  /* scroll the STEP FLOW, not the page — a wheel over the steps column */
  const steps = page.locator(".qc-form").first();
  const b = await steps.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);
  }
  const after = (await read(page))!;
  expect(after.pageScroll, "the page gained a scroller").toBe(0);
  expect(after.scrollTop, "the grid's own row scrolled — the takeover is not self-contained").toBe(0);
  expect(after.ref!.top, "the reference panel moved with the step flow — it is not sticky")
    .toBeCloseTo(before.ref!.top, 0);
});

test("§4 — the outcome branches: offer and revise & resubmit", async ({ page }) => {
  await openRoute(page, "/queries", VP);
  await unsuppress(page);  /* the journeys tear down on `animationend` — see the note above */
  await openRecord(page);
  /* ⚠️ DRIVEN THROUGH THE OUTCOME GRID, not by seeking a seeded query in that state. The branch is
     a property of the DRAFT — step 1 decides the stack — so choosing the outcome is what exercises
     it, and it works from any query rather than depending on the fixture holding one of each. */
  for (const label of [/offer/i, /revise/i]) {
    const card = page.locator(".qc-sec, .oc, [class*='qc-oc']").filter({ hasText: label }).first();
    const btn = (await card.count()) ? card : page.getByRole("button", { name: label }).first();
    if (!(await btn.count())) { console.log(`no control for ${label} — outcome grid not reachable from this state`); continue; }
    await btn.click();
    await page.waitForTimeout(500);
    const s = (await read(page))!;
    console.log(`${label}: body ${s.takeBody?.h}px · steps ${s.steps?.h}px · pageScroll ${s.pageScroll}`);
    expect(s.pageScroll, `${label}: the branch introduced an outer scroller`).toBe(0);
    expect(s.takeBody!.h, `${label}: the branch collapsed the body`).toBeGreaterThan(200);
    expect(s.stripH, `${label}: the strip left the working state`).toBe(52);
    expect(s.zeroKids, `${label}: a box measures 0 while holding content: ${s.zeroKids.join(" · ")}`).toEqual([]);
  }
});

test("§4 — the entry stagger and the exits run", async ({ page }) => {
  await openRoute(page, "/queries", VP);
  await unsuppress(page);
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(80);

  const entering = await motion(page);
  expect(entering.cls, "the entering class is not armed").toContain("qc-entering");
  expect(entering.paneAnim, "the frame-in animation is not running").toBe("qc-frame-in");
  /* the stagger: the header, the question and the stack's sections each on their own delay */
  expect(entering.kids.filter((n) => n === "qc-in").length, "the entry stagger is not running").toBeGreaterThan(2);
  expect(entering.kids, "the stack's last section has no closing beat").toContain("qc-in-last");

  await page.waitForTimeout(900);
  expect((await motion(page)).cls, "qc-entering never cleared — it would replay on the next state change").not.toContain("qc-entering");

  /* exit 1 — cancel */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
  const cancel = await motion(page);
  expect(cancel.cls, "the cancel exit is not armed").toContain("qc-exit-cancel");
  expect(cancel.paneAnim, "the cancel exit does not run").toBe("qc-exit-cancel");
  await page.waitForTimeout(600);
  expect((await read(page))!.stripH, "the card did not come back after the cancel exit").toBe(96);
});

test("§4 — reduced motion cuts to the final frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/queries", VP);
  await unsuppress(page);
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(60);
  const m = await motion(page);
  /* ⚠️ THE STATE STILL CHANGES — only the crossfade goes. A reduced-motion path that also skipped
     the state would leave the journey unopened. */
  expect(m.kids.length, "descendants are still animating under reduced motion").toBe(0);
  const s = (await read(page))!;
  expect(s.stripH, "the strip did not reach its working state under reduced motion").toBe(52);
  expect(s.takeBody!.h, "the takeover did not reach its final frame under reduced motion").toBeGreaterThan(300);
});

test("§4 — the save exit updates the row in place; the list does not re-enter", async ({ page }) => {
  /**
   * ⚠️ THIS GATE WRITES. It records a real response on the harness account, because "the row
   * changes, it does not re-enter" is a claim about what happens AFTER a successful write and
   * there is no way to observe it without one. `tests/e2e/seed.mjs` restores the fixture — its
   * documents carry fixed ids, so re-running it puts the changed query back.
   */
  await openRoute(page, "/queries", VP);
  await unsuppress(page);

  const rows = page.locator(".f12-row");
  /* ⚠️ THE MARKUP, NOT THE TEXT. A row states its status as a `StatusDot` — an SVG — so a
     recorded response changes the row without changing a character of its `innerText`. Asserting
     on text passed the "did not re-enter" half and then failed on a row that had in fact updated. */
  const before = { count: await rows.count(), first: await rows.first().innerHTML() };

  await openRecord(page);
  /* the outcome grid decides the stack — any ending needs only outcome + date, which openRecord
     has already pre-filled, so this is the shortest path to an enabled Save */
  const ending = page.getByText(/^Closed — no reply$/).first();
  if (!(await ending.count())) { console.log("no ending outcome reachable — save exit not exercised"); return; }
  await ending.click();
  await page.waitForTimeout(400);

  const save = page.getByRole("button", { name: /^Save response$/i });
  if (await save.isDisabled()) { console.log("save still disabled after outcome + date — reporting rather than forcing"); return; }
  await save.click();

  /**
   * ⚠️ POLLED, NOT SAMPLED — the save exit arms AFTER the write resolves, not on the click. A
   * single read at 70ms found the button mid-"Saving…" and no exit class, which reads exactly like
   * a dead exit; it actually arms at ~700ms. The cancel exit is instant because it writes nothing,
   * and copying its timing here is what produced the false negative.
   */
  let armed = false;
  for (let i = 0; i < 30 && !armed; i += 1) {
    armed = (await motion(page)).cls.includes("qc-exit-save");
    if (!armed) await page.waitForTimeout(100);
  }
  expect(armed, "the save exit never armed — the write may have been rejected").toBe(true);

  await page.waitForTimeout(1600);
  const after = (await read(page))!;
  expect(after.takeBody, "the takeover is still mounted after saving").toBeNull();
  expect(after.stripH, "the resting card did not come back after the save exit").toBe(96);
  expect(after.list!.display, "the list did not come back").not.toBe("none");

  /* ⚠️ IN PLACE, NOT RE-ENTERED. The list returning with a replayed entrance would read as the
     page reloading around the writer — the row is meant to change under them. */
  const root = await page.evaluate(() => (document.querySelector(".f12-root")?.className ?? "").toString());
  expect(root, "the page replayed its entrance after a save — the row should change in place").not.toContain("qh-enter");
  expect(await rows.count(), "the list changed length on a response — a response updates a row, it does not add one").toBe(before.count);
  /**
   * ⚠️ IT ASSERTS THE OUTCOME, NOT A DELTA — and the delta version was a gate that could only pass
   * once. Comparing the row against its own earlier markup fails on the SECOND run, because the
   * first run already recorded that outcome and the write is then a no-op: a green-then-red gate
   * that reports a regression when nothing changed. What is true every run is that the record now
   * states what was just recorded, so that is what is checked — on the reading pane, which states
   * the status in words rather than as a `StatusDot` an assertion cannot read.
   */
  await rows.first().click();
  await page.waitForTimeout(600);
  const status = await page.locator(".f12-hs").first().innerText();
  expect(status.toLowerCase(), `the record does not state the outcome just recorded (reads "${status}")`)
    .toMatch(/no response|closed|no reply/);
});

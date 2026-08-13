/**
 * §1 — rhythm and scope, measured on the running page.
 *
 * ⚠️ LOCALHOST, NOT THE DEPLOYED SITE — this pack does not deploy, so the deployed bundle is
 * behind and asserting against it would report on code that is not this.
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcRhythm
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const read = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const band = g.querySelector(".wsh") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const tools = g.querySelector(".wpg-tools") as HTMLElement | null;
  const first = (tools ?? sc) as HTMLElement;
  return {
    /* §1a — the distance from the band's bottom edge to the first content below it */
    topOffset: r(first.getBoundingClientRect().top + parseFloat(getComputedStyle(first).paddingTop) - band.getBoundingClientRect().bottom),
    gapToken: getComputedStyle(sc).paddingTop,
    reclaim: getComputedStyle(sc).paddingBottom,
    /* §1b */
    sub: (g.querySelector(".wsh-sub")?.textContent ?? "").trim(),
    subFont: g.querySelector(".wsh-sub") ? getComputedStyle(g.querySelector(".wsh-sub")!).fontFamily.split(",")[0].replace(/"/g, "") : "—",
    /* §1c */
    stripControls: tools ? [...tools.querySelectorAll("input, button")].map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().slice(0, 22)).filter(Boolean) : [],
    toolbarGone: !g.querySelector(".f12-ctl"),
    kebab: !!g.querySelector('[title="More actions for this query"]'),
  };
});

test("§1 — the rest state", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const s = await read(page);
  console.log(JSON.stringify(s, null, 1));

  /* ⚠️ 18px, PAGE-SCOPED. The shared token stays 70/35 — asserted separately below. */
  expect(s.topOffset, `content starts ${s.topOffset}px below the band, not 18`).toBe(18);
  expect(s.reclaim, "the invariance padding is still applied on a page that cannot scroll").toBe("0px");

  /* §1b — both counts, from the shared derivation, in mono */
  expect(s.sub, `the masthead does not state its counts: "${s.sub}"`).toMatch(/^\d+ quer(y|ies)( · \d+ awaiting reply)?$/);
  expect(s.subFont, "the counts are not in mono").toContain("JetBrains");

  /* §1c — the strip is list-scope only; nothing gated on selection */
  expect(s.toolbarGone, "the pane toolbar is still rendered").toBe(true);
  expect(s.kebab, "the kebab is missing from the hero").toBe(true);
  const strip = s.stripControls.join(" | ");
  for (const verb of ["Nudge", "tasks", "Delete", "Agent", "Manuscript"]) {
    expect(strip, `a selected-query verb is in the list strip: ${strip}`).not.toContain(verb);
  }
  expect(strip, `the list strip lost its controls: ${strip}`).toMatch(/Search queries/);
});

test("§1a — the shared rhythm is unchanged on another page", async ({ page }) => {
  /* ⚠️ THE POINT OF "PAGE-SCOPED". If Contact list moved too, this is a change of the shared
     rhythm wearing a page-scoped comment. */
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  /* ⚠️ READ THE TOKEN, NOT ONE ROW'S PADDING. Contact list has a toolbar row too, and
     `.wpg--tools > .wpg-scroll` zeroes the scroll row's copy so the gap is paid once — so the
     scroll row reads 0px there for a reason that has nothing to do with this override. */
  const gap = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const first = (g.querySelector(".wpg-tools") ?? g.querySelector(".wpg-scroll")) as HTMLElement;
    return { token: getComputedStyle(g).getPropertyValue("--content-top-gap").trim(),
             applied: getComputedStyle(first).paddingTop };
  });
  expect(gap.token, `the shared top gap moved to ${gap.token} — the override is not page-scoped`).toBe("70px");
  expect(gap.applied, "the shared gap is no longer paid by the first row under the hairline").toBe("70px");
});

/* ── §2 — the journeys distribute ────────────────────────────────────────────────────────────
 * ⚠️ BROWSER-MEASURED, BECAUSE JSDOM CANNOT SEE THIS. There is no layout engine there: a flex
 * chain reports `auto`, and a test asserting the elements exist passes against a broken layout.
 */
const fill = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const box = (s: string) => { const e = g.querySelector(s) as HTMLElement | null; return e ? e.getBoundingClientRect() : null; };
  const form = box(".qc-form"); const stack = box(".qc-stack"); const ref = box(".qc-ref");
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  return {
    formH: form ? r(form.height) : -1,
    stackH: stack ? r(stack.height) : -1,
    /* the gap BELOW the stack — the void §2a is about */
    slackBelowStack: form && stack ? r(form.bottom - stack.bottom) : -1,
    refH: ref ? r(ref.height) : -1,
    refSlack: form && ref ? r(form.bottom - ref.bottom) : -1,
    refPosition: ref ? getComputedStyle(g.querySelector(".qc-ref")!).position : "—",
    /* ⚠️ THE PANEL IS `display: none` BELOW 1100px BY DECISION — "the measured point at which the
       panel stops helping", the same rule the create context panel follows. Its height is 0 there
       for a reason that has nothing to do with the stretch. */
    refShown: (() => { const e = g.querySelector(".qc-ref") as HTMLElement | null; return !!e && getComputedStyle(e).display !== "none"; })(),
    place: (g.querySelector(".qch-place")?.textContent ?? "").trim(),
    pageScroll: sc.scrollHeight - sc.clientHeight,
  };
});

for (const vp of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`§2 — create distributes (${vp.width}x${vp.height})`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    await page.getByRole("button", { name: /^Log query$/i }).first().click();
    await page.waitForTimeout(900);
    const s = await fill(page);
    console.log(`create ${vp.width}: ${JSON.stringify(s)}`);
    /* the stack reaches the bottom of the column it sits in — it used to sit at the top with
       320.8px beneath it at 1440x900 */
    expect(s.slackBelowStack, `${vp.width}: ${s.slackBelowStack}px of void below the stack`).toBeLessThanOrEqual(1);
    expect(s.pageScroll, "the journey introduced an outer scroller").toBe(0);
    expect(s.place, "the place line is missing").not.toBe("");
  });

  test(`§2 — record distributes (${vp.width}x${vp.height})`, async ({ page }) => {
    await openRoute(page, "/queries", vp);
    await page.locator(".f12-row").first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Record response|Mark sent|Record resubmission|Reopen/i }).first().click();
    await page.waitForTimeout(900);
    const s = await fill(page);
    console.log(`record ${vp.width}: ${JSON.stringify(s)}`);
    expect(s.slackBelowStack, `${vp.width}: ${s.slackBelowStack}px of void below the stack`).toBeLessThanOrEqual(1);
    /* the panel takes the column's full height, and the sticky went with the reason for it */
    if (s.refShown) {
      expect(s.refSlack, `${vp.width}: the reference panel stops ${s.refSlack}px short of the foot`).toBeLessThanOrEqual(1);
      expect(s.refPosition, "the sticky survived the stretch — a dead property that reads as load-bearing").not.toBe("sticky");
    } else {
      /* below 1100 it is hidden by decision; assert THAT rather than skipping silently */
      expect(vp.width, `the panel is hidden at ${vp.width}px, which the 1100px rule does not allow`).toBeLessThanOrEqual(1100);
      console.log(`  (panel hidden at ${vp.width} — the documented below-1100px rule)`);
    }
    expect(s.pageScroll, "the journey introduced an outer scroller").toBe(0);
    expect(s.place, "the place line is missing").not.toBe("");
  });
}

/* ── §3 — the dock ───────────────────────────────────────────────────────────────────────────── */

const dockState = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  const d = g.querySelector(".qc-dock") as HTMLElement | null;
  const row = g.querySelector(".wpg-dock") as HTMLElement | null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  if (!d || !row) return null;
  const db = row.getBoundingClientRect(); const gb = g.getBoundingClientRect(); const sb = sc.getBoundingClientRect();
  return {
    say: (d.querySelector(".qc-dock-say")?.textContent ?? "").trim(),
    acts: [...d.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim()),
    /* outside the scroller, flush to the working area's foot */
    insideScroller: sc.contains(d),
    gapToFoot: r(gb.bottom - db.bottom),
    belowScroller: r(db.top - sb.bottom),
    hairline: getComputedStyle(row).borderTopWidth,
    anim: getComputedStyle(d).animationName,
  };
});

test("§3 — the dock, create", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(900);
  const s = (await dockState(page))!;
  console.log("dock create: " + JSON.stringify(s));
  expect(s, "the dock did not render").not.toBeNull();
  /* ⚠️ OUTSIDE THE SCROLLPORT BY CONSTRUCTION — a fourth grid row, not a sticky inside row 3. */
  expect(s.insideScroller, "the dock is inside the scroller — it would scroll away").toBe(false);
  expect(s.gapToFoot, "the dock is not flush with the working area's foot").toBeLessThanOrEqual(1);
  expect(s.belowScroller, "the dock overlaps the scroll row").toBeGreaterThanOrEqual(0);
  expect(s.hairline, "the dock has no hairline above it").toBe("1px");
  /* create has the continuation; record must not */
  expect(s.acts.join(" | "), "Save & log another is missing from create").toContain("log another");
  expect(s.say, "the consequence line does not read its empty state before a save is possible").not.toBe("");
});

test("§3 — the dock stays put while the content scrolls", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1024, height: 768 });
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(900);
  const before = (await dockState(page))!;
  const col = await page.locator(".qc-form").first().boundingBox();
  if (col) { await page.mouse.move(col.x + col.width / 2, col.y + col.height / 2); await page.mouse.wheel(0, 400); await page.waitForTimeout(400); }
  const after = (await dockState(page))!;
  expect(after.gapToFoot, "the dock moved when the content scrolled").toBe(before.gapToFoot);
});

test("§3 — record: no batch action, and the consequence updates with the outcome", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Record response|Mark sent|Record resubmission|Reopen/i }).first().click();
  await page.waitForTimeout(900);
  const start = (await dockState(page))!;
  console.log("dock record (before outcome): " + JSON.stringify(start));
  expect(start.acts.join(" | "), "a response is one query — there is no batch to log another of").not.toContain("log another");
  expect(start.say, "the dock does not read its empty state before an outcome is chosen").toBe("Nothing saved yet");

  /* ⚠️ IT UPDATES WITH THE OUTCOME — the whole point of stating a consequence before it happens. */
  const pick = page.getByText(/^Rejection$/).first();
  if (await pick.count()) {
    await pick.click();
    await page.waitForTimeout(400);
    const after = (await dockState(page))!;
    console.log("dock record (after outcome): " + JSON.stringify(after));
    expect(after.say, "the consequence line did not update with the outcome").not.toBe(start.say);
    expect(after.say, "the consequence line does not state what the save will do").toMatch(/^Saves as /);
  }
});

test("§3 — reduced motion cuts to the final frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => {
    if (s.textContent?.startsWith("/*sa-e2e-kill-motion*/")) s.remove();
  }));
  await page.getByRole("button", { name: /^Log query$/i }).first().click();
  await page.waitForTimeout(80);
  const s = (await dockState(page))!;
  expect(s.anim, "the dock still animates under reduced motion").toBe("none");
  expect(s.gapToFoot, "the dock did not reach its final position under reduced motion").toBeLessThanOrEqual(1);
});

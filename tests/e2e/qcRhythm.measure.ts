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

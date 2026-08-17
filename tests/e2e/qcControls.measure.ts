/**
 * §2/§3 — one Log-query control, and every control on one height.
 *
 * ⚠️ HEIGHTS ARE A COMPUTED QUESTION. Three declarations can name one token and still resolve
 * differently once padding, borders and line-height are involved, and the pairing the pack is
 * protecting — filter, sort and the search field on one line — is exactly the kind that holds in
 * the stylesheet and fails on the page.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2/§3 — the controls share a height and only one of them is pink", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const r = (n: number) => Math.round(n * 10) / 10;
    const box = (e: Element) => r(e.getBoundingClientRect().height);
    const verbs = [...document.querySelectorAll(".qc-phead .qc-btn")].map((b) => ({
      label: (b.textContent ?? "").trim() || (b.getAttribute("aria-label") ?? "icon"),
      h: box(b), w: r(b.getBoundingClientRect().width),
      bg: getComputedStyle(b as HTMLElement).backgroundColor,
      bw: getComputedStyle(b as HTMLElement).borderTopWidth,
      fs: getComputedStyle(b as HTMLElement).fontSize,
      glyph: (() => { const g = b.querySelector("svg"); return g ? `${r(g.getBoundingClientRect().width)}` : "—"; })(),
    }));
    const log = document.querySelector(".qc-logq") as HTMLElement | null;
    const search = document.querySelector(".f12-lsearch") as HTMLElement;
    const pills = [...document.querySelectorAll(".f12-lhead .f12-pill")];
    return {
      verbs,
      log: log ? { h: box(log), bg: getComputedStyle(log).backgroundColor, text: (log.textContent ?? "").trim(), x: r(log.getBoundingClientRect().left) } : null,
      cellX: r((document.querySelector(".qc-lhead") as HTMLElement).getBoundingClientRect().left),
      searchH: box(search), pillH: pills.map(box),
      /**
       * ⚠️ SCOPED TO THIS PAGE'S OWN GRID, and that is not a convenience. The workspace keeps every
       * page MOUNTED and toggles `display`, so a document-wide query for "Log query" found the
       * Contact list's twelve row buttons and reported thirteen controls on a page that has one.
       * A count of what is in the document is not a count of what is on the page.
       */
      logControls: [...(document.querySelector(".qc-wpg")?.querySelectorAll("button") ?? [])]
        .filter((b) => /log\s+(a\s+)?(new\s+)?query/i.test(b.textContent ?? ""))
        .map((b) => `${(b.textContent ?? "").trim()} @${(b.closest("[class]") as HTMLElement)?.className.split(" ")[0]}`),
      /* Export must still be in the band */
      bandActions: [...(document.querySelector(".qc-wpg")?.querySelectorAll(".wsh button") ?? [])].map((b) => (b.textContent ?? "").trim()).filter(Boolean),
    };
  });
  console.log(JSON.stringify(m, null, 1));

  /* §2 — exactly one, in the toolbar's left column, and Export stays in the band */
  expect(m.logControls.length, `Log query renders ${m.logControls.length} times: ${m.logControls.join(" | ")}`).toBe(1);
  expect(m.log, "the Log button is missing").toBeTruthy();
  expect(m.log!.x, "the Log button is not at the toolbar cell's left edge").toBe(m.cellX);
  expect(m.bandActions.some((a) => /export/i.test(a)), `Export left the band: ${m.bandActions.join(" | ")}`).toBe(true);
  expect(m.bandActions.some((a) => /log/i.test(a)), "Log query is still in the band").toBe(false);

  /* §3 — one height across the verbs, and the Log button joins them */
  const hs = [...new Set([...m.verbs.map((v) => v.h), m.log!.h])];
  expect(hs, `the toolbar's controls differ in height: ${hs.join(", ")}`).toHaveLength(1);
  expect(hs[0], "the controls did not grow").toBeGreaterThanOrEqual(38);
  /* ⚠️ THE PAIRING THE PACK IS PROTECTING — filter, sort and the field on one line */
  const rowHs = [...new Set([m.searchH, ...m.pillH])];
  expect(rowHs, `the search row's controls differ in height: ${rowHs.join(", ")}`).toHaveLength(1);
  expect(rowHs[0], "the list's controls did not rise with the toolbar's").toBe(hs[0]);
  /* the icon-only Export is square at the new height */
  const icon = m.verbs.find((v) => v.label === "icon" || /pdf/i.test(v.label));
  if (icon) expect(icon.w, `the icon button is ${icon.w}×${icon.h}, not square`).toBe(icon.h);

  /* ⚠️ ONE PINK SURFACE IN THIS ROW. Every verb white; the primary is a thicker rim and no colour. */
  const grounds = new Set(m.verbs.map((v) => v.bg));
  expect([...grounds], `a toolbar verb has a ground of its own: ${[...grounds].join(", ")}`).toHaveLength(1);
  expect([...grounds][0], "the verbs are not white").toBe("rgb(255, 255, 255)");
  expect(m.log!.bg, "the Log button is not pink").not.toBe("rgb(255, 255, 255)");
  const bws = m.verbs.map((v) => parseFloat(v.bw));
  expect(Math.max(...bws), "the primary lost its heavier outline").toBeGreaterThan(Math.min(...bws));
  expect([...new Set(m.verbs.map((v) => v.fs))], "the verbs differ in type size").toHaveLength(1);
  expect(parseFloat(m.verbs[0].fs), "the labels did not grow").toBeGreaterThanOrEqual(13);
});

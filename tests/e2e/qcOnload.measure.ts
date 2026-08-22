/**
 * §1–§3 · WHAT THE PAGE OPENS ON.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcOnload
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const state = (page: any) => page.evaluate(() => ({
  headings: Array.from(document.querySelectorAll(".qc-gh")).map((e) => (e.textContent || "").trim()),
  groups: document.querySelectorAll('.qc-grp[role="group"]').length,
  flat: document.querySelectorAll(".qc-grp--flat").length,
  rows: document.querySelectorAll(".f12-row").length,
  selected: document.querySelectorAll(".f12-row[aria-selected=true]").length,
}));

test("§1 · the list opens flat, and a state filter restores the groups", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(2500);

  const load = await state(page);
  console.log(`  on load · rows ${load.rows} · group headings ${load.headings.length} · role=group ${load.groups} · flat sections ${load.flat}`);
  expect(load.rows, "no rows — nothing to measure").toBeGreaterThan(0);
  expect(load.headings, "the list opened with group headings").toEqual([]);
  expect(load.groups, "the flat list announced itself as a group").toBe(0);
  expect(load.flat, "the flat section did not render").toBe(1);

  /* choosing Whose turn brings the grouped reading back */
  await page.locator('.f12-pill[aria-label="Filter"]').first().click();
  await page.waitForTimeout(600);
  const move = page.locator(".f12-prow", { hasText: "Your move" }).first();
  expect(await move.count(), "no Your move row in the filter").toBeGreaterThan(0);
  await move.click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  const grouped = await state(page);
  console.log(`  after Whose turn · headings ${JSON.stringify(grouped.headings)} · role=group ${grouped.groups}`);
  expect(grouped.headings.length, "choosing a state filter did not restore the headings").toBeGreaterThan(0);
  expect(grouped.groups, "the restored groups carry no role").toBeGreaterThan(0);
});

test("§2 · nothing is selected, the pane is bare, and selection still works", async ({ page }) => {
  test.setTimeout(240000);
  /* ⚠️ THE REMEMBERED ID SURVIVES BY DESIGN, so it is cleared first — otherwise this measures a
     restored selection and reports it as a failure to stop auto-selecting. */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.evaluate(() => { try { localStorage.removeItem("sa.lastViewedQueryId"); } catch { /* ignore */ } });
  await page.reload();
  await page.waitForTimeout(2600);

  const load = await state(page);
  console.log(`  on load · rows ${load.rows} · selected ${load.selected}`);
  expect(load.selected, "a query was auto-selected on load").toBe(0);

  /* the bare pane — art in flow, one caption, no chassis */
  const pane = await page.evaluate(() => {
    const el = document.querySelector(".qc-unsel");
    if (!el) return null;
    const art = el.querySelector(".qc-unsel-art");
    const cap = el.querySelector(".qc-unsel-cap");
    const wrap = el.closest(".qc-pane-bare, .qp-pane");
    const cs = wrap ? getComputedStyle(wrap) : null;
    const artBox = art?.getBoundingClientRect();
    const capBox = cap?.getBoundingClientRect();
    return {
      caption: (cap?.textContent || "").trim(),
      lines: el.querySelectorAll("p, h1, h2, h3, h4, h5, span").length,
      artPos: art ? getComputedStyle(art.firstElementChild || art).position : "",
      wrapCls: wrap?.className || "",
      bg: cs?.backgroundColor, border: cs?.borderStyle, radius: cs?.borderRadius,
      /* the caption sits BELOW the art, in its own row — never overlapping it */
      capBelowArt: !!(artBox && capBox && capBox.top >= artBox.bottom - 1),
      artW: artBox ? Math.round(artBox.width) : 0, artH: artBox ? Math.round(artBox.height) : 0,
    };
  });
  expect(pane, "the unselected pane did not render").not.toBeNull();
  console.log(`  pane · caption "${pane!.caption}" · art ${pane!.artW}×${pane!.artH} (${pane!.artPos}) · below: ${pane!.capBelowArt}`);
  console.log(`  chassis · class "${pane!.wrapCls}" bg ${pane!.bg} border ${pane!.border} radius ${pane!.radius}`);
  expect(pane!.caption).toBe("Select a query to get started");
  /* ⚠️ NO CHASSIS — transparent ground, no border */
  expect(pane!.bg, "the unselected pane kept a filled chassis").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(pane!.border, "the unselected pane kept a border").toMatch(/none/);
  /* ⚠️ IN FLOW, NEVER POSITIONED — no positioned element shares space with text */
  expect(pane!.artPos, "the art is positioned, not in flow").toBe("static");
  expect(pane!.capBelowArt, "the caption is not in its own row beneath the art").toBe(true);

  /* §2d · arrowing from nothing selects the first row */
  await page.locator(".f12-rows").first().focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(900);
  const arrowed = await state(page);
  console.log(`  after ArrowDown · selected ${arrowed.selected}`);
  expect(arrowed.selected, "arrowing from nothing selected no row").toBe(1);
});

test("§2a · a URL-restored selection still opens", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(2200);
  const id = await page.evaluate(() => document.querySelector(".f12-row")?.id?.replace("query-row-", "") || "");
  expect(id.length, "no row id to deep-link with").toBeGreaterThan(0);

  await openRoute(page, `/queries?q=${id}`, { width: 1440, height: 900 });
  await page.waitForTimeout(2600);
  const s = await state(page);
  console.log(`  deep-linked ?q=${id} · selected ${s.selected} · unselected pane ${await page.locator(".qc-unsel").count()}`);
  expect(s.selected, "the deep-linked query did not open").toBe(1);
  expect(await page.locator(".qc-unsel").count(), "the bare pane rendered over a selection").toBe(0);
});

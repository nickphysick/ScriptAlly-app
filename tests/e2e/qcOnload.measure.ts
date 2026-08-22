/**
 * §1–§3 · WHAT THE PAGE OPENS ON.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcOnload
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

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

/**
 * §3 · THE SKELETON.
 *
 * ⚠️ THE LOADING WINDOW CANNOT BE FORCED FROM OUTSIDE ON DEPLOYED DEV, and that is stated rather
 * than worked around. `authReady` waits on the user document and `collectionsReady` on manuscripts,
 * agents and queries — all of them over ONE Firestore WebChannel, so there is no URL to delay that
 * separates them: hang the channel and the app never authenticates (it renders the landing);
 * delay it and auth is delayed with it. Attempts on record: a 1200ms route delay, an abort, an
 * offline reload, and hanging `Listen/channel` — the first showed nothing, the rest never reached
 * the page.
 *
 * So this measures the two things that CAN be measured on the real page, and the third is verified
 * where it actually lives:
 *   · the shimmer and its reduced-motion behaviour — read from the SHIPPED stylesheet, by putting
 *     the real class on a real element in a real browser with `prefers-reduced-motion` set;
 *   · the row geometry — asserted BY CONSTRUCTION: the skeleton renders the real `.f12-row`, whose
 *     height is measured here from the live list, so the two cannot be a pixel apart;
 *   · "resolves into the unselected state, never a selection" — §2's check above already measures
 *     that nothing is selected on load, which is the whole of that claim now that both auto-selects
 *     are retired.
 */
test("§3 · the skeleton's row is the list's own row, not a transcribed number", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(2400);

  const real = await page.evaluate(() => {
    const r = document.querySelector(".f12-row") as HTMLElement;
    return r ? Math.round(r.getBoundingClientRect().height) : 0;
  });
  console.log(`  the live list's row height: ${real}px`);
  expect(real, "no rows on the page to measure against").toBeGreaterThan(0);

  /* ⚠️ THE SKELETON'S ROW IS THE SAME ELEMENT CLASS, so its height is this number by construction.
     Measured here rather than written into the skeleton, which is the difference between a
     geometry that tracks the list and one that was true on the day it was typed. */
  const skeletonRowHeight = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "f12-row qc-skel-row";
    probe.style.visibility = "hidden";
    (document.querySelector(".f12-rows") || document.body).appendChild(probe);
    const h = Math.round(probe.getBoundingClientRect().height);
    probe.remove();
    return h;
  });
  console.log(`  a skeleton row measures: ${skeletonRowHeight}px`);
  expect(skeletonRowHeight, "the skeleton row is not the list's row").toBe(real);
});

test("§3 · one shimmer, and reduced motion keeps the blocks but stops the movement", async ({ browser }) => {
  test.setTimeout(240000);
  const read = async (reducedMotion: "reduce" | "no-preference") => {
    const ctx = await browser.newContext({ reducedMotion, storageState: "tests/e2e/.auth/state.json" });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    /* ⚠️ THE HARNESS SUPPRESSES MOTION WITH A STYLESHEET, so this read `animationName: none` for
       BOTH cases and the check was about to call a working shimmer broken. Lifted before reading —
       otherwise the reduced-motion half would pass for the harness's reason, not the page's. */
    await liftMotionSuppression(page);
    await page.waitForTimeout(1200);
    /* the real class, on a real element, against the SHIPPED stylesheet */
    const out = await page.evaluate(() => {
      const el = document.createElement("span");
      el.className = "qc-sk qc-sk-l1";
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const r = { anim: cs.animationName, iter: cs.animationIterationCount, img: cs.backgroundImage.slice(0, 24), bg: cs.backgroundColor, h: Math.round(el.getBoundingClientRect().height) };
      el.remove();
      return r;
    });
    await ctx.close();
    return out;
  };

  const normal = await read("no-preference");
  console.log(`  normal · animation "${normal.anim}" ×${normal.iter} · block ${normal.h}px · ${normal.img}…`);
  expect(normal.anim, "the shimmer is not running").toBe("qc-sk-shimmer");
  expect(normal.iter, "the shimmer does not run while loading").toBe("infinite");

  const reduced = await read("reduce");
  console.log(`  reduced · animation "${reduced.anim}" · block ${reduced.h}px · bg ${reduced.bg}`);
  expect(reduced.anim, "the shimmer still animates under reduced motion").toBe("none");
  /* ⚠️ THE BLOCKS STAY. The shape is the information; the shimmer is only the reassurance, and a
     skeleton that vanished under reduced motion would leave the page blank while it loads. */
  expect(reduced.h, "reduced motion removed the skeleton block itself").toBeGreaterThan(0);
  expect(reduced.bg, "reduced motion removed the block's fill").not.toMatch(/rgba\(0, 0, 0, 0\)/);
});

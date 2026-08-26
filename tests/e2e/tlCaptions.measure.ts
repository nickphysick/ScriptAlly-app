import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 4 — a caption is shown because a reader asked for it, and never otherwise.
 *
 * ⚠️ THE CLAIM IS ABOUT THE BOARD, NOT ABOUT ONE MARKER. Every caption used to hang beneath its
 * marker permanently, which is readable at one week and unreadable at six months — a day is about
 * six pixels wide there and a caption needs eighty. So the rest-state assertion is a CENSUS with
 * its population stated: `0 of N showing` means something, `0 showing` on an empty board means
 * nothing at all, and that vacuous shape is the one this repo has been caught by most.
 */
test("Phase 4 — captions at rest, on hover, and on keyboard focus", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);

  const slider = page.getByRole("slider", { name: /range/i });
  const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];

  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(650);

    const rest = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
      const b = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const tips = [...b.querySelectorAll(".tl-tip")] as HTMLElement[];
      return {
        total: tips.length,
        showing: tips.filter((e) => getComputedStyle(e).opacity !== "0").length,
        markers: b.querySelectorAll(".tl-node").length,
        ways: b.querySelectorAll(".tl-wp").length,
      };
    });
    console.log(`${STOPS[i].padEnd(9)} rest: ${rest.showing}/${rest.total} showing · ${rest.markers} markers · ${rest.ways} waypoints`);
    expect(rest.total, `${STOPS[i]}: no captions exist at all — nothing was measured`).toBeGreaterThan(0);
    expect(rest.showing, `${STOPS[i]}: ${rest.showing} captions are painted with nothing hovered`).toBe(0);
  }

  /* ── one caption, and it is the one under the pointer ─────────────────────────────────────
     ⚠️ THE WINDOW OPENS AT TODAY AND RUNS FORWARD — the ref anchors the same way (`addD(TODAY, i)`
     from i = 0). Markers are RECORDS, which are in the past, so a board at rest has none of them:
     measured 16 rows, 18 bar segments, 1 waypoint, 0 markers. A probe that hovers `.tl-node`
     without paging back waits the full test timeout on an element that is not absent by accident.
     So page back until one exists, with a BOUND and a message — a hover that hangs for seven
     minutes says nothing about the page, and this one did. */
  await slider.fill("0");
  await page.waitForTimeout(650);

  const countNodes = () => page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
    return (all.find((e) => e.getBoundingClientRect().height > 0)!).querySelectorAll(".tl-node").length;
  });
  let back = 0;
  while ((await countNodes()) === 0 && back < 14) {
    await page.getByRole("button", { name: "Previous window" }).click();
    await page.waitForTimeout(320);
    back += 1;
  }
  const nodes = await countNodes();
  console.log(`paged back ${back} window(s) to reach ${nodes} marker(s)`);
  expect(nodes, `no marker within ${back} windows of today — nothing to hover`).toBeGreaterThan(0);

  const marker = page.locator(".tl-board .tl-node").first();
  await marker.hover();
  await page.waitForTimeout(250);

  const hovered = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
    const b = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const tips = [...b.querySelectorAll(".tl-tip")] as HTMLElement[];
    const lit = tips.filter((e) => getComputedStyle(e).opacity === "1");
    const own = b.querySelector(".tl-node") as HTMLElement;
    return {
      lit: lit.length, total: tips.length,
      text: (lit[0]?.textContent || "").trim(),
      label: own.getAttribute("aria-label") || "",
      /* ⚠️ THE PAIR RISES TOGETHER, or the caption is painted over by the next marker along —
         the collision moved rather than removed. */
      z: getComputedStyle(own).zIndex,
    };
  });
  console.log(`hover · ${hovered.lit}/${hovered.total} lit · "${hovered.text}" · z ${hovered.z}`);
  expect(hovered.lit, "hovering a marker paints more or fewer than one caption").toBe(1);
  expect(hovered.text.length, "the hovered marker's caption is empty").toBeGreaterThan(0);
  expect(hovered.label, "the caption and the accessible name disagree").toContain(hovered.text);
  expect(Number(hovered.z), "the hovered marker does not rise above its neighbours").toBeGreaterThan(3);

  /* ── and the keyboard reaches it, because hover alone would be a mouse-only feature ─────────
     ⚠️ THE TAB IS NOT DECORATION. `:focus-visible` is a MODALITY heuristic: after a mouse move
     Chromium is in pointer modality, so a programmatic `.focus()` does not match it and the check
     would fail over a rule that is perfectly correct for a real keyboard user. */
  await page.mouse.move(4, 4);
  await page.waitForTimeout(250);
  await page.keyboard.press("Tab");
  await marker.focus();
  await page.waitForTimeout(250);
  const focused = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
    const b = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const own = b.querySelector(".tl-node") as HTMLElement;
    return {
      lit: [...b.querySelectorAll(".tl-tip")].filter((e) => getComputedStyle(e).opacity === "1").length,
      fv: own.matches(":focus-visible"), focused: own === document.activeElement,
    };
  });
  console.log(`focus · ${focused.lit} lit · focused ${focused.focused} · :focus-visible ${focused.fv}`);
  expect(focused.focused, "the marker never took focus").toBe(true);
  expect(focused.lit, "a focused marker states nothing — the caption is mouse-only").toBe(1);

  /* ── the waypoint, which is the case hover-only could have deleted in silence ───────────────
     ⚠️ `page.hover()` CANNOT BE USED HERE and its refusal would be correct: the upright takes no
     pointer events, so Playwright's actionability check rejects it. The reach is a pseudo-element,
     which no locator can address — so the pointer is moved to the upright's own coordinates and
     the question is whether anything answers. That is exactly the reader's question too. */
  await page.mouse.move(4, 4);
  await page.waitForTimeout(200);
  const wpBox = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
    const b = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const w = b.querySelector(".tl-wp") as HTMLElement | null;
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, kind: w.getAttribute("data-kind") };
  });
  if (!wpBox) {
    console.log("waypoint · none in this window — not asserted");
  } else {
    await page.mouse.move(wpBox.x, wpBox.y);
    await page.waitForTimeout(300);
    const wpLit = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
      const b = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const w = b.querySelector(".tl-wp") as HTMLElement;
      const t = w.querySelector(".tl-tip") as HTMLElement;
      return { op: getComputedStyle(t).opacity, text: (t.textContent || "").trim() };
    });
    console.log(`waypoint · ${wpBox.kind} · opacity ${wpLit.op} · "${wpLit.text}"`);
    expect(wpLit.op, "a waypoint's caption cannot be reached — its forecast has no label at all").toBe("1");
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "console errors").toEqual([]);
});

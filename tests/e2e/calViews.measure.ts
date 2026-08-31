import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE FOUR VIEWS, THE ONE POPOVER, AND A LEGIBILITY SWEEP (v40, Phase 6).
 *
 * The third case is the one worth having. The selected tab painted NOTHING and kept its near-white
 * ink on a near-white ground, because `--tl-nearblack` was declared on `.tl-board` and the tools
 * row is drawn outside the board — a `background` on an undefined custom property is not an error,
 * the declaration is simply dropped. Every rule read correctly, the build was clean, and the
 * board's own selected control was invisible. Asking about the PAINTED contrast of a control
 * against its own ground catches that whatever caused it, which asking about a token cannot.
 */
const tabs = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const strip = document.querySelector(".tl-tabs") as HTMLElement | null;
  return [...(strip?.children ?? [])].map((b) => {
    const el = b as HTMLElement;
    const n = el.querySelector(".tl-tabn");
    return { label: (el.childNodes[0]?.textContent || "").trim(),
      count: n ? Number(n.textContent) : null,
      on: el.dataset.on === "true" };
  });
});

test("the four views are a strip, and their counts add up to the board", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const t = await tabs(page);
  console.log("tabs " + t.map((x) => `${x.label}${x.count == null ? "" : ` ${x.count}`}${x.on ? "*" : ""}`).join(" · "));
  expect(t.map((x) => x.label)).toEqual(["All", "Needs me", "With agents", "Closed"]);
  expect(t[0].on, "the board does not open on All").toBe(true);

  /* ⚠️ THE RECONCILIATION, AND IT IS WHY THE TABS PARTITION. Three counts beside a fourth they do
     not add up to is a strip a reader cannot trust; and asserted against the RENDERED row count
     rather than against a number this file writes down, so two derivations check each other. */
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".tl-rrow")].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).length);
  const parts = t.slice(1).map((x) => x.count ?? 0);
  const sum = parts.reduce((a, b) => a + b, 0);
  console.log(`rendered rows ${rows} · needs+agents+closed = ${parts.join("+")} = ${sum}`);
  expect(rows, "rows drawn").toBeGreaterThan(8);
  expect(sum, "the three views do not partition the board").toBe(rows);
});

test("picking a view draws that view, and only it", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  for (const [label, i] of [["Needs me", 1], ["With agents", 2]] as const) {
    await page.locator(".tl-tabs button").nth(i).click();
    await page.waitForTimeout(450);
    const got = await page.evaluate(() =>
      [...document.querySelectorAll(".tl-rrow")].filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).length);
    const t = await tabs(page);
    console.log(`${label}: tab says ${t[i].count}, board draws ${got}`);
    expect(t[i].on, `${label} did not select`).toBe(true);
    expect(got, `${label} drew a different number of rows than its tab claims`).toBe(t[i].count);
  }
});

test("⚠️ every selected control is legible against its own ground", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  await page.locator(".tl-menuwrap .tl-mbtn").last().click();
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const lum = (c: string) => {
      const m = c.match(/[\d.]+/g); if (!m) return null;
      const [r, g, b, a] = [Number(m[0]), Number(m[1]), Number(m[2]), m[3] == null ? 1 : Number(m[3])];
      if (a === 0) return null;
      const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /* ⚠️ THE EFFECTIVE GROUND, WALKED UP. A transparent background is exactly what the fault
       produced, so reading the element's own is what missed it — the walk is the check. */
    const ground = (el: HTMLElement): number | null => {
      let n: HTMLElement | null = el;
      while (n) { const l = lum(getComputedStyle(n).backgroundColor); if (l != null) return l; n = n.parentElement; }
      return null;
    };
    const sel = [...document.querySelectorAll('.tl-tabs button[data-on="true"], .tl-popopts button[data-on="true"]')] as HTMLElement[];
    return sel.map((el) => {
      const ink = lum(getComputedStyle(el).color);
      const bg = ground(el);
      const ratio = ink == null || bg == null ? null
        : (Math.max(ink, bg) + 0.05) / (Math.min(ink, bg) + 0.05);
      return { text: (el.textContent || "").trim().slice(0, 18),
        own: getComputedStyle(el).backgroundColor,
        ratio: ratio == null ? null : Math.round(ratio * 100) / 100 };
    });
  });
  console.log("selected controls: " + out.map((o) => `${o.text} ${o.ratio}`).join(" · "));
  /* ⚠️ POPULATION FIRST, and PER KIND — a sweep that found only the tab proves nothing about the
     popover, which reads the same token from the same scope and would fail the same way. */
  expect(out.length, "selected controls found").toBeGreaterThan(3);
  const bad = out.filter((o) => o.ratio == null || o.ratio < 4.5)
    .map((o) => `${o.text}: ratio ${o.ratio} (own background ${o.own})`);
  expect(bad, "a selected control is not legible against its own ground").toEqual([]);
});

test("the slider is gone, and its settings are in the one popover", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  /* ⚠️ THE RANGE SLIDER IS RETIRED, NOT HIDDEN. It occupied permanent width to state a setting
     read once; a control that is merely hidden comes back as a bug the next time somebody styles
     the row. Asserted on the rendered page, where a `display: none` copy would still be found. */
  /* ⚠️ SCOPED TO THE CALENDAR AND TO WHAT IS PAINTED. Every workspace page stays MOUNTED, so a
     document-wide sweep finds the dashboard's own `os-rangeslider` — zero-width, on a page nobody
     is looking at — and reports the Calendar's retired slider as still rendered. */
  const strays = await page.evaluate(() =>
    [...document.querySelectorAll('.cal-timeline input[type="range"]')]
      .filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0).length);
  expect(strays, "the range slider is still rendered").toBe(0);
  await page.locator(".tl-menuwrap .tl-mbtn").last().click();
  await page.waitForTimeout(300);
  const names = await page.evaluate(() =>
    [...document.querySelectorAll(".tl-pop .tl-popname")].map((e) => (e.textContent || "").trim()));
  const reset = await page.locator(".tl-popreset").textContent();
  console.log(`Display holds: ${names.join(" · ")} · reset "${reset?.trim()}"`);
  expect(names).toContain("Group");
  expect(names).toContain("Order");
  expect(names).toContain("Range");
  /* the reset names the defaults rather than clearing to nothing */
  expect(reset).toContain("All");
  expect(reset).toContain("One list");
});

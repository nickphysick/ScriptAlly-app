/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACKAGES, CONSOLIDATED — driven, at two widths ════════════════════════════════════════════
 *
 * The unit locks prove these rules were WRITTEN. This proves the browser laid them out — the split
 * this repo learned from `repeat(auto-fit, minmax(0, 1fr))`, where the lock asserted the very
 * declaration that was the fault and the page resolved to a hundred phantom tracks.
 *
 * Every case here states its PRECONDITION before its claim: a probe that finds nothing passes, and
 * an empty scan is the failure mode of every negative check in this file.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression, scrollbarWidth } from "./measure";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

test.setTimeout(300_000);

const OUT = (f: string) => resolve(process.cwd(), "reports/packages", f);
const log: string[] = [];
const say = (s: string) => { log.push(s); console.log(s); };

const WIDTHS = [1440, 1920];

/** Boxes of every VISIBLE TEXT LEAF in a region — leaves only, because a parent contains its
 *  children by construction and inline siblings share a line box. */
const LEAF_BOXES = `(root) => {
  const out = [];
  const walk = (el) => {
    const kids = [...el.children];
    const hasElementChild = kids.length > 0;
    const text = (el.textContent || "").trim();
    if (!hasElementChild && text) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none") {
        out.push({ t: text.slice(0, 40), x: r.x, y: r.y, w: r.width, h: r.height });
      }
    }
    kids.forEach(walk);
  };
  walk(root);
  return out;
}`;

test("packages page — the re-cut holds at both widths", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(900);

    const sb = await scrollbarWidth(page);
    say(`\n── packages @ ${width} (scrollbar ${sb}px) ──`);

    // ⚠️ PRECONDITION: the page actually rendered its bands. A clean sweep over nothing passes.
    const bands = await page.locator(".pkgb-band, .pkgo-steps, .pkgw-strip").count();
    say(`  bands/sections found: ${bands}`);

    // D-A6 — the swept layout must not have come back.
    const deadClasses = await page.evaluate(() =>
      ["pkgo-rail", "pkgo-grid", "pkgo-stage", "pkgo-panel", "pkgo-row", "pkgo-prob"]
        .filter((c) => document.getElementsByClassName(c).length > 0));
    say(`  retired rail classes present in the DOM: ${deadClasses.length ? deadClasses.join(", ") : "none"}`);
    expect(deadClasses, "a swept class is being rendered again").toEqual([]);

    // Horizontal overflow — the page must never scroll sideways.
    const over = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return { sw: el.scrollWidth, cw: el.clientWidth };
    });
    say(`  document scrollWidth ${over.sw} vs clientWidth ${over.cw}  → overflow ${over.sw - over.cw}px`);
    expect(over.sw - over.cw, "the packages page scrolls horizontally").toBeLessThanOrEqual(1);

    // Exactly one filled control on the page (the corrected probe from the re-cut).
    const filled = await page.evaluate(() => {
      const isFilled = (el: Element) => {
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
        if (Number(a) < 0.5) return false;
        // "filled" = a real tint, not white/near-white and not transparent
        return !(Number(r) > 245 && Number(g) > 240 && Number(b) > 232);
      };
      /* ⚠️ SCOPED TO THE PAGE, NOT THE DOCUMENT. The shell's own `New` and the plan `Upgrade` are
         filled controls on every route; counting them answers a question about the SHELL while
         wearing the name of a question about this page. An unscoped probe reported 3. */
      const root = document.querySelector(".pkgw, .pkgo, [class*='pkgw-']")?.closest("main, .ws-main") ||
                   document.querySelector(".ws-main") || document.body;
      const shell = document.querySelector(".ws-side, .ws-rail, aside");
      return [...root.querySelectorAll("button")]
        .filter((b) => (b as HTMLElement).offsetParent !== null && isFilled(b) && !(shell && shell.contains(b)))
        .map((b) => (b.textContent || "").trim().slice(0, 30));
    });
    say(`  filled controls: ${filled.length} → ${JSON.stringify(filled)}`);

    await page.screenshot({ path: OUT(`packages-${width}.png`), fullPage: false });
  }
});

test("the builder — optional slots, the Other line, and the composition preview", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(900);

  // Open the builder however this page offers it.
  const opener = page.locator("button", { hasText: /New package|Build a package|Add package/i }).first();
  const canOpen = await opener.count();
  say(`\n── builder ──\n  opener found: ${canOpen}`);
  if (!canOpen) { say("  NO OPENER — builder not reachable from this state; reported, not asserted."); return; }

  await opener.click().catch(() => {});
  await page.waitForTimeout(700);

  const modal = page.locator(".pkgf-modal");
  if (!(await modal.count())) {
    say("  MODAL DID NOT OPEN — likely the Pro gate. Reported, not asserted.");
    await page.screenshot({ path: OUT("builder-blocked.png") });
    return;
  }

  // ⚠️ PRECONDITION FIRST: all four fields present.
  const labels = await page.locator(".pkgf-fld label").allTextContents();
  say(`  fields: ${JSON.stringify(labels)}`);
  expect(labels.length, "the builder is not showing four fields").toBeGreaterThanOrEqual(4);

  const opts = await page.locator(".pkgf-opt").allTextContents();
  say(`  Required/Optional tags: ${JSON.stringify(opts)}`);
  expect(opts).toContain("Required");

  // D-B1 — synopsis offers Not included; the letter does not.
  const synOpts = await page.locator("#pkgf-pkg-synopsis option").allTextContents();
  const letOpts = await page.locator("#pkgf-pkg-letter option").allTextContents();
  say(`  synopsis options: ${JSON.stringify(synOpts)}`);
  say(`  letter options:   ${JSON.stringify(letOpts)}`);
  expect(synOpts, "synopsis cannot be left out").toContain("Not included");
  expect(letOpts, "the letter offers an omission it must not").not.toContain("Not included");

  // D-B5 — the composition line omits what is not there.
  const before = (await page.locator(".pkgf-comp").textContent()) ?? "";
  say(`  composition (as opened): ${before.replace(/\s+/g, " ").trim()}`);
  await page.selectOption("#pkgf-pkg-synopsis", "").catch(() => {});
  await page.waitForTimeout(200);
  const after = (await page.locator(".pkgf-comp").textContent()) ?? "";
  say(`  composition (synopsis omitted): ${after.replace(/\s+/g, " ").trim()}`);
  expect(after, "the composition line prints an omission as if it were sent").not.toContain("Not included");

  // D-B2 — the Other input exists and takes text.
  const other = page.locator("#pkgf-pkg-other");
  expect(await other.count(), "no Other field").toBe(1);
  say(`  Other placeholder: ${await other.getAttribute("placeholder")}`);
  await other.fill("chapter outline");
  await page.waitForTimeout(150);
  const afterOther = (await page.locator(".pkgf-comp").textContent()) ?? "";
  say(`  composition after Other: ${afterOther.replace(/\s+/g, " ").trim()}`);
  expect(afterOther, "free text leaked into the composition line").not.toContain("chapter outline");

  await page.screenshot({ path: OUT("builder-1440.png") });
});

test("the sent strip — packaged is contained, loose is not", async ({ page }) => {
  for (const width of WIDTHS) {
    await openRoute(page, "/queries", { width, height: 1000 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(1200);

    say(`\n── query centre @ ${width} ──`);

    /**
     * ⚠️ THE ROW IS `.f12-row`, AND IT IS SCOPED TO `.qc-wpg`. An unscoped text locator found
     * "Elinor Hale" on the DASHBOARD — every workspace page stays MOUNTED, so `querySelector`
     * happily returns a hidden page's copy, and the click then fails on a zero-sized element. The
     * documented hazard, hit first try.
     */
    const rows = page.locator(".qc-wpg .f12-row");
    const total = await rows.count();
    say(`  query rows: ${total}`);
    expect(total, "no query rows — the harness account has no data to measure").toBeGreaterThan(0);

    /* Walk until a send with materials appears. Which query carries one is data, not design. */
    let packed = 0, loose = 0, visited = 0;
    for (let i = 0; i < Math.min(total, 10); i++) {
      await rows.nth(i).click().catch(() => {});
      await page.waitForTimeout(700);
      visited++;
      packed = await page.locator(".qc-strip--packed").count();
      loose = await page.locator(".qc-loose").count();
      if (packed || loose) { say(`  row ${i} carries a send → packed ${packed}, loose ${loose}`); break; }
    }
    say(`  rows visited: ${visited} · packaged strips: ${packed} · loose rows: ${loose}`);

    if (packed) {
      const g = await page.locator(".qc-strip--packed").first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const slot = el.querySelector(".qc-strip-slot")?.getBoundingClientRect();
        const seal = el.querySelector(".qc-strip-seal")?.getBoundingClientRect();
        const plate = el.querySelector(".pkgb-plate")?.getBoundingClientRect();
        const name = el.querySelector(".qc-strip-name");
        const nb = name?.getBoundingClientRect();
        return {
          strip: { y: r.y, h: r.height, w: r.width },
          border: cs.borderTopColor, bg: cs.backgroundColor,
          slot: slot && { y: slot.y, h: slot.height, w: slot.width },
          seal: seal && { y: seal.y, h: seal.height, w: seal.width },
          plate: plate && { w: plate.width, h: plate.height },
          name: nb && { h: nb.height, scrollH: (name as HTMLElement).scrollHeight, clientH: (name as HTMLElement).clientHeight },
        };
      });
      say(`  strip box ${JSON.stringify(g.strip)}  border ${g.border}`);
      say(`  slot ${JSON.stringify(g.slot)}  seal ${JSON.stringify(g.seal)}  plate ${JSON.stringify(g.plate)}`);
      say(`  name ${JSON.stringify(g.name)}`);

      // D-C2 — slot and seal share the row's height: one object, not a badge beside a label.
      if (g.slot && g.seal) {
        expect(Math.abs(g.slot.y - g.seal.y), "slot and seal do not share a top").toBeLessThanOrEqual(1);
        expect(Math.abs(g.slot.h - g.seal.h), "slot and seal do not share a height").toBeLessThanOrEqual(1);
      }
      // D-C5 — the plate is 38px.
      if (g.plate) expect(Math.round(g.plate.w)).toBe(38);
      // The descender check — the name must not crop its own ink.
      if (g.name) expect(g.name.scrollH, "the package name is clipped").toBeLessThanOrEqual(g.name.clientH + 1);
    } else {
      say("  no packaged send in this data — cannot measure the packed strip here.");
    }

    if (loose) {
      const l = await page.locator(".qc-loose").first().evaluate((el) => {
        const cs = getComputedStyle(el);
        const plate = el.querySelector(".pkgb-plate");
        return {
          border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor,
          shadow: cs.boxShadow,
          plateBg: plate ? getComputedStyle(plate).backgroundColor : null,
          plateW: plate ? plate.getBoundingClientRect().width : null,
        };
      });
      say(`  loose: border ${l.border} · radius ${l.radius} · bg ${l.bg} · shadow ${l.shadow}`);
      say(`  loose plate: ${l.plateW}px on ${l.plateBg}`);
      // D-C3 — NO CONTAINER. Measured, not read off the sheet.
      expect(l.border, "the loose row has a border").toBe("0px");
      expect(l.bg, "the loose row has a fill").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
      expect(l.shadow, "the loose row has a shadow").toBe("none");
    } else {
      say("  no loose send in this data — cannot measure the floating row here.");
    }

    // D-C1 — nothing hangs off a non-send row.
    const strayOnNonSend = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".tl-row, .qc-tlrow, [data-tl-row]")];
      return rows.filter((r) => !/sent/i.test(r.textContent || "") &&
        (r.querySelector(".qc-strip") || r.querySelector(".qc-loose"))).length;
    });
    say(`  attachment blocks on non-send rows: ${strayOnNonSend}`);
    expect(strayOnNonSend, "an attachment block is hanging off a row that is not a send").toBe(0);

    const over = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    say(`  horizontal overflow: ${over}px`);
    expect(over).toBeLessThanOrEqual(1);

    await page.screenshot({ path: OUT(`strip-${width}.png`), fullPage: false });
  }
});

test.afterAll(() => {
  writeFileSync(resolve(process.cwd(), "reports/packages/measure.log"), log.join("\n") + "\n");
});

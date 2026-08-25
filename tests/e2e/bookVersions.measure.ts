/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE VERSIONS PANEL, ON THE RUNNING APP (Part B) ═══════════════════════════════════════════
 *
 * ⚠️ THE GATE IS THE CLAIM, AND A GATE CAN ONLY BE PROVED FROM BOTH SIDES. A run that only ever
 * opens the populated account proves the panel renders; it says nothing about the state the design
 * is actually about, which is the writer who has never used the feature seeing no trace of it. The
 * seed takes a COUNT for exactly this reason:
 *
 *   node tests/e2e/seedBookVersions.mjs 0     # then this file's "absent" cases
 *   node tests/e2e/seedBookVersions.mjs 3     # then its "present" cases
 *
 * The suite reads whichever state the account is in and reports it, rather than assuming — so a
 * run against the wrong fixture fails saying which fixture it found, not with a confusing diff.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1440, 1920];

/** Open the manuscript card and select "The record" — the tab the panel lives on. */
async function openRecord(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/manuscripts", { width, height: 1000 });
  /**
   * The library card, then the tab.
   *
   * ⚠️ THE CARD'S ROOT IS NOT `.mlib-card` — that class does not exist, and a locator written from
   * the obvious guess found nothing and reported "no panel", which reads exactly like a broken
   * panel. The card's own affordance is `.mlib-plate`, carrying an `Open →` label.
   *
   * ⚠️ AND EVERY LOCATOR IS FILTERED TO WHAT IS VISIBLE. Every workspace page stays MOUNTED under
   * this shell, so an unscoped `.first()` can return a hidden page's zero-sized copy — the standing
   * trap in this harness.
   */
  const plate = page.locator(".mlib-plate").first();
  if (await plate.isVisible().catch(() => false)) {
    await plate.click();
    await page.waitForTimeout(600);
  }
  /**
   * ⚠️ THE TAB LABEL IS UPPERCASED BY CSS, so `innerText` is "THE RECORD" while the source says
   * "The record". This repo has recorded that trap repeatedly; a case-sensitive name match reports
   * a control that is on screen as absent. Matched case-insensitively on the tab's own class.
   */
  const tab = page.locator(".msv-tab").filter({ hasText: /record/i }).first();
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
  await page.waitForTimeout(600);
}

test("the versions panel — gate, counts and chips", async ({ page }) => {
  const report: Record<string, unknown>[] = [];

  for (const width of WIDTHS) {
    await openRecord(page, width);

    const r = await page.evaluate(() => {
      const vis = (el: Element) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      };
      const panel = [...document.querySelectorAll(".bv-panel")].filter(vis)[0] as HTMLElement | undefined;
      const rows = [...document.querySelectorAll(".bv-row")].filter(vis);
      const bands = [...document.querySelectorAll(".bv-band")].filter(vis);
      const ghosts = [...document.querySelectorAll(".bv-ghost")].filter(vis);

      /* ⚠️ THE ROW'S META IS READ WHOLE, NOT PER SPAN. Two spans each holding the right string can
         still render as one run — the standing lesson from the packages band, where eleven
         per-element assertions passed over a line that read "TextIn 1 package". */
      const detail = rows.map((row) => ({
        name: (row.querySelector(".bv-name") as HTMLElement)?.innerText ?? "",
        chips: [...row.querySelectorAll(".bv-chip")].map((c) => ({
          kind: c.className.replace("bv-chip", "").trim(),
          text: (c as HTMLElement).innerText,
        })),
        meta: (row.querySelector(".bv-meta") as HTMLElement)?.innerText.replace(/\s*\n\s*/g, " · ") ?? "",
        note: (row.querySelector(".bv-note") as HTMLElement)?.innerText ?? "",
      }));

      /* Descenders: a version name is writer-supplied, so the box must clear a `g` or a `y`. */
      const clipped = rows.map((row) => {
        const el = row.querySelector(".bv-name") as HTMLElement;
        if (!el) return null;
        return el.scrollHeight - el.clientHeight > 1 ? el.innerText : null;
      }).filter(Boolean);

      return {
        panelPresent: !!panel,
        rows: rows.length,
        bands: bands.length,
        ghosts: ghosts.length,
        latest: document.querySelectorAll(".bv-chip--latest").length,
        rr: document.querySelectorAll(".bv-chip--rr").length,
        kind: document.querySelectorAll(".bv-chip--kind").length,
        detail, clipped,
      };
    });

    report.push({ width, ...r });

    /* ── the population floor. A negative check over an empty set passes having measured nothing,
          so the fixture is asserted before anything is concluded from it. ───────────────────── */
    expect(r.panelPresent, `no .bv-panel at ${width} — is the record tab open?`).toBe(true);

    if (r.rows === 0) {
      /* THE GATE, CLOSED. Below two versions: no band, no rows, no count — only the door. */
      expect(r.bands, `a band with no list at ${width}`).toBe(0);
      expect(r.ghosts, `no way to add a version at ${width}`).toBe(1);
      expect(r.latest + r.rr + r.kind, `chips with no rows at ${width}`).toBe(0);
    } else {
      /* THE GATE, OPEN — the ref's three versions. */
      expect(r.rows, `rows at ${width}`).toBe(3);
      expect(r.bands).toBe(1);
      expect(r.ghosts).toBe(1);

      /* D10 — exactly one Latest, and it is the NEWEST by date, not the last in the list. */
      expect(r.latest, `Latest chips at ${width}`).toBe(1);
      const latestRow = r.detail.find((d) => d.chips.some((c) => c.kind === "bv-chip--latest"));
      expect(latestRow?.name).toBe("Post-R&R (T. Marsh)");

      /* D10 — the R&R chip REPLACES the kind chip: three rows, one R&R, two kinds. */
      expect(r.rr, `R&R chips at ${width}`).toBe(1);
      expect(r.kind, `kind chips at ${width}`).toBe(2);
      expect(latestRow?.chips.some((c) => c.kind === "bv-chip--kind")).toBe(false);

      /* D7 — the derived counts, against figures derived by hand from the seed:
           bv-prologue  2 samples (pag, pag2)   · held by seed-query-8  (Partial Sent)
           bv-world     1 sample  (pag3)        · held by seed-query-10 (Full Sent)
           bv-postrr    nothing points at it yet                                        */
      const meta = Object.fromEntries(r.detail.map((d) => [d.name, d.meta]));
      expect(meta["Prologue-first"]).toContain("2 samples");
      expect(meta["Prologue-first"]).toContain("held by 1 agent");
      expect(meta["Worldbuilding-first"]).toContain("1 sample");
      expect(meta["Worldbuilding-first"]).toContain("held by 1 agent");
      expect(meta["Post-R&R (T. Marsh)"]).toContain("0 samples");
      expect(meta["Post-R&R (T. Marsh)"]).toContain("held by 0 agents");
      /* the date is the version's own, month and year */
      expect(meta["Prologue-first"]).toContain("MAR 2026");

      /* ⚠️ AND THE META IS ONE RUN OF SEPARATE LINES, not two strings colliding. */
      expect(meta["Prologue-first"]).toMatch(/MAR 2026.*2 samples.*held by 1 agent/s);
    }

    expect(r.clipped, `version names cropped at ${width}`).toEqual([]);
  }

  console.log(JSON.stringify(report, null, 2));
});

/**
 * ⚠️ THE EDITORIAL CLAIM IS MEASURED, NOT ASSERTED. The ref draws a sage band; this build makes it a
 * token because `manuscriptPlate.css` already rules that Editorial is monochrome. That reconciliation
 * is a decision about a rendered colour, so it is checked as one — by the repo's own standing test:
 * **not "is it sage" but "what is its chroma"**, because a rule written against one named hue passes
 * anything that is not that hue, and this codebase has already had a pink slip through such a check.
 *
 * The theme class is toggled in the DOM rather than through the settings control: the tokens are
 * resolved purely from that ancestor class, so swapping it exercises exactly the cascade under test
 * without writing a preference to the account.
 */
test("the band and the chips are a token, and Editorial keeps its chroma", async ({ page }) => {
  await openRecord(page, 1440);
  await expect(page.locator(".bv-panel").first()).toBeVisible({ timeout: 15_000 });

  const out = await page.evaluate(() => {
    const root = document.querySelector(".t-capp, .t-bold, .t-edn") as HTMLElement;
    if (!root) return { error: "no theme root" };
    const original = root.className;
    const read = () => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const grab = (el: HTMLElement | null, prop: string) =>
        el ? getComputedStyle(el).getPropertyValue(prop).trim() : "";
      return {
        band: grab(q(".bv-band"), "background-image") || grab(q(".bv-band"), "background-color"),
        rr: grab(q(".bv-chip--rr"), "background-color"),
        latest: grab(q(".bv-chip--latest"), "background-color"),
        kind: grab(q(".bv-chip--kind"), "background-color"),
      };
    };
    const res: Record<string, ReturnType<typeof read>> = {};
    for (const t of ["t-capp", "t-bold", "t-edn"]) {
      root.className = original.replace(/\bt-(capp|bold|edn)\b/g, t);
      res[t] = read();
    }
    root.className = original;
    return res;
  });

  console.log(JSON.stringify(out, null, 2));
  expect((out as { error?: string }).error).toBeUndefined();
  const themed = out as Record<string, Record<string, string>>;

  /* the band must not be the same value in every theme, or it is not a token at all */
  expect(themed["t-capp"].band).not.toBe(themed["t-edn"].band);

  /**
   * ⚠️ CHROMA SPREAD, NOT A NAMED HUE. Every colour Editorial paints here must have its channels
   * within 6 of one another — the standing form of this repo's Editorial rule.
   */
  const spread = (rgb: string): number => {
    const m = rgb.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return 0;
    const [r, g, b] = m.slice(0, 3).map(Number);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  for (const [key, value] of Object.entries(themed["t-edn"])) {
    for (const rgb of value.match(/rgba?\([^)]*\)/g) ?? []) {
      expect(spread(rgb), `Editorial's ${key} paints ${rgb} — chroma ${spread(rgb)}`).toBeLessThanOrEqual(6);
    }
  }
});

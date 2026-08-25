/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS IN THE QUERY CENTRE, ON THE RUNNING APP (Part E, phase 3) ════════════════════════
 *
 *   node tests/e2e/seedBookVersions.mjs 3
 *   node tests/e2e/seedQueryVersions.mjs      # match · differs · unrecorded
 *
 * ⚠️ THE THREE STATES ARE SEEDED, NOT WAITED FOR. `unrecorded` is the ordinary case — every send
 * made before this feature has no version — and it is the one two days of faults have shown gets
 * folded into a known.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CASES = [
  { q: "seed-query-8", expect: "match" },
  { q: "seed-query-10", expect: "differs" },
  { q: "seed-query-12", expect: "unknown" },
] as const;

const read = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const t = (el: Element | null) => (el as HTMLElement | null)?.innerText.trim() ?? null;
    const lines = [...document.querySelectorAll(".qv-line")].map((l) => ({
      key: t(l.querySelector(".qv-k")),
      chip: t(l.querySelector(".pkgb-mver")),
      none: t(l.querySelector(".qv-none")),
      note: t(l.querySelector(".qv-note")),
      src: t(l.querySelector(".qv-src")),
    }));
    return {
      lines,
      /* D5 — the chip inside the sample pill in the stationery band */
      sampleChip: t(document.querySelector(".qc-mchipver")),
      samplePills: document.querySelectorAll(".qc-mchip").length,
      /* the chip must be on the SAMPLE pill and no other */
      chipsOnPills: [...document.querySelectorAll(".qc-mchip")]
        .map((p) => ({ label: t(p.querySelector(".qc-mchiptx")), ver: t(p.querySelector(".qc-mchipver")) })),
    };
  });

test("the two derived lines, against a seeded match / differs / unrecorded", async ({ page }) => {
  const out: Record<string, unknown>[] = [];
  for (const width of [1440, 1920]) {
    for (const c of CASES) {
      await openRoute(page, `/queries?q=${c.q}`, { width, height: 1200 });
      await page.waitForTimeout(1100);
      const r = await read(page);
      out.push({ width, query: c.q, ...r });

      const keys = r.lines.map((l) => l.key);
      expect(keys, `${c.q} at ${width}: no version lines`).toContain("Opening read");
      expect(keys, `${c.q} at ${width}: no held line`).toContain("Manuscript held");

      const readLine = r.lines.find((l) => l.key === "Opening read")!;
      const heldLine = r.lines.find((l) => l.key === "Manuscript held")!;

      /* every case rides seed-pkg-1, so every case READS Prologue-first */
      expect(readLine.chip, `${c.q}: opening read`).toContain("PROLOGUE-FIRST");
      expect(readLine.src, `${c.q}: the derivation is unexplained`).toContain("SAMPLE");

      if (c.expect === "match") {
        expect(heldLine.chip).toContain("PROLOGUE-FIRST");
        expect(heldLine.note?.toLowerCase()).toContain("matches what they read");
      } else if (c.expect === "differs") {
        expect(heldLine.chip).toContain("WORLDBUILDING-FIRST");
        expect(heldLine.note?.toLowerCase()).toContain("differs from what they read");
        /* ⚠️ AND IT STOPS THERE — no verdict, no prompt, no control (D7). */
        for (const w of ["should", "check", "fix", "resend", "mistake", "wrong", "make sure"]) {
          expect(heldLine.note?.toLowerCase(), `the difference urges "${w}"`).not.toContain(w);
        }
      } else {
        /* ⚠️ THE ORDINARY CASE. Sent, version unknown: the line renders and SAYS SO. Silence here
           would read as agreement, and a chip would claim a version nobody recorded. */
        expect(heldLine.chip, `${c.q}: an unrecorded version drew a chip`).toBeNull();
        expect(heldLine.none?.toLowerCase()).toContain("not recorded");
        expect(heldLine.note?.toLowerCase()).toContain("version not recorded");
      }

      /* D5 — the chip is on the SAMPLE pill and on no other material */
      const withChip = r.chipsOnPills.filter((p) => p.ver);
      expect(withChip.length, `${c.q}: ${withChip.length} pills carry a version chip`).toBeLessThanOrEqual(1);
      if (withChip.length === 1) {
        expect(withChip[0].label?.toLowerCase()).toMatch(/chapter|page|sample|word/);
        expect(withChip[0].ver).toContain("PROLOGUE-FIRST");
      }
    }
  }
  console.log(JSON.stringify(out, null, 2));
});

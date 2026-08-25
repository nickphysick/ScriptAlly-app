/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SAMPLES AND THE TRACKING PANELS, ON THE RUNNING APP (Parts C and D) ═══════════════════════
 *
 *   node tests/e2e/seedBookVersions.mjs 3     # then these cases
 *   node tests/e2e/seedBookVersions.mjs 1     # the gate's closed side
 *
 * ⚠️ THE GATE IS PROVED FROM BOTH SIDES, as in Part B. The suite reads whichever state the account
 * is in and reports it rather than assuming, so a run against the wrong fixture says which fixture
 * it found instead of producing a confusing diff.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1440, 1920];

test("samples carry a version, and the two panels answer for them", async ({ page }) => {
  const report: Record<string, unknown>[] = [];

  for (const width of WIDTHS) {
    await openRoute(page, "/manuscripts/packages", { width, height: 1100 });
    await page.waitForTimeout(900);

    const r = await page.evaluate(() => {
      const vis = (el: Element) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      };
      const text = (el: Element | null) => (el as HTMLElement | null)?.innerText.replace(/\s*\n\s*/g, " · ") ?? "";

      /* ── Part C: the chip on a sample sheet ──────────────────────────────────────────────── */
      const sheets = [...document.querySelectorAll(".pkgb-msheet")].filter(vis).map((sh) => ({
        type: sh.getAttribute("data-type") ?? "",
        name: text(sh.querySelector(".pkgb-mname")),
        use: text(sh.querySelector(".pkgb-muse")),
        version: text(sh.querySelector(".pkgb-mver")) || null,
      }));

      /* ── Part D: the two panels. Found by their HEADING, not by index — a positional lookup
            would silently read "Requests by material" the day a panel is reordered. ─────────── */
      const panel = (heading: string) =>
        [...document.querySelectorAll(".pkgb-land")].filter(vis)
          .find((p) => (p.querySelector("h3") as HTMLElement | null)?.innerText.trim().toLowerCase() === heading);

      const openings = panel("requests by opening");
      const holders = panel("manuscripts out with agents");

      return {
        sheets,
        openings: openings
          ? [...openings.querySelectorAll(".pkgb-drow")].map((row) => ({
              name: text(row.querySelector(".pkgb-mver")),
              where: text(row.querySelector(".pkgb-drwhere")),
              meta: text(row.querySelector(".pkgb-drmeta")),
              /* ⚠️ THE WHOLE ROW, not its parts. Two spans each holding the right string can still
                 render as one run — the lesson from the packages band's "TextIn 1 package". */
              top: text(row.querySelector(".pkgb-drtop")),
            }))
          : null,
        holders: holders
          ? {
              tag: text(holders.querySelector(".pkgb-tag")),
              rows: [...holders.querySelectorAll(".pkgb-hrow")].map((row) => ({
                agent: text(row.querySelector(".pkgb-hagent")),
                what: text(row.querySelector(".pkgb-hwhat")),
                version: text(row.querySelector(".pkgb-mver")) || null,
                none: text(row.querySelector(".pkgb-hnone")) || null,
              })),
              note: text(holders.querySelector(".pkgb-hnote")) || null,
            }
          : null,
        materialsPanel: !!panel("requests by material"),
      };
    });

    report.push({ width, ...r });

    /* the population floor — a negative check over an empty page passes having measured nothing */
    expect(r.sheets.length, `no material sheets at ${width}`).toBeGreaterThan(2);

    const samples = r.sheets.filter((s) => s.type === "Sample Pages");
    const others = r.sheets.filter((s) => s.type !== "Sample Pages");
    expect(others.length, `no letters or synopses at ${width}`).toBeGreaterThan(0);

    /* ⚠️ D2/D12 — NOTHING BUT A SAMPLE EVER CARRIES ONE, whatever is stored. */
    for (const o of others) {
      expect(o.version, `${o.type} "${o.name}" drew a version chip`).toBeNull();
    }

    if (r.openings === null) {
      /* THE GATE, CLOSED (D18). Below two versions neither panel exists — and nor does a chip. */
      expect(r.holders, `holders panel with no openings panel at ${width}`).toBeNull();
      for (const s of samples) {
        expect(s.version, `a chip below two versions at ${width}`).toBeNull();
      }
      /* and the panel it sits beside is unaffected */
      expect(r.materialsPanel, `the materials panel vanished at ${width}`).toBe(true);
    } else {
      /* THE GATE, OPEN. */
      expect(samples.some((s) => s.version), `no sample carries a chip at ${width}`).toBe(true);

      /**
       * ⚠️ THE CHIP FLOWS WITH THE USAGE LINE — MEASURED AS GEOMETRY, NOT AS A SEPARATOR.
       *
       * The first version of this asserted `use` matched `/package.*·.*§/`. It passed, and it was
       * worthless: the `·` came from THIS PROBE's own newline-to-separator step, not from the page.
       * A check that measures its own helper is the proxy fault this repo keeps recording — the
       * same shape as a rule naming one hue, or a lookahead after optional whitespace.
       *
       * The real claim is containment and flow: the chip is INSIDE `.pkgb-muse`, and it sits at or
       * below the usage text rather than on top of it. On this narrow column card it wraps to its
       * own line, which is correct — the ref draws the row wide; the card is a column.
       */
      const flow = await page.evaluate(() => {
        const sh = [...document.querySelectorAll('.pkgb-msheet[data-type="Sample Pages"]')]
          .find((x) => x.querySelector(".pkgb-mver"));
        if (!sh) return null;
        const use = sh.querySelector(".pkgb-muse") as HTMLElement;
        const chip = sh.querySelector(".pkgb-mver") as HTMLElement;
        const u = use.getBoundingClientRect(), c = chip.getBoundingClientRect();
        return {
          inside: use.contains(chip),
          chipTopBelowUseTop: c.top >= u.top - 1,
          chipWithinUse: c.bottom <= u.bottom + 1,
          overflowsCard: c.right > sh.getBoundingClientRect().right + 1,
        };
      });
      expect(flow, "no sample sheet carries a chip on the page").not.toBeNull();
      expect(flow!.inside, "the chip is not inside the usage line").toBe(true);
      expect(flow!.chipTopBelowUseTop).toBe(true);
      expect(flow!.chipWithinUse, "the chip escapes its own block").toBe(true);
      expect(flow!.overflowsCard, "the chip overflows the card").toBe(false);

      /* D15 — one row per opening, INCLUDING the one nothing has gone out with */
      expect(r.openings.length, `openings at ${width}`).toBe(3);
      /* ⚠️ THE `§` IS ITS OWN SPAN, so `innerText` yields "§\nPrologue-first" and the probe's own
         newline-to-separator step turns that into "§ · PROLOGUE-FIRST". Stripped here rather than by
         reaching into the chip's text node: the mark is deliberately a separate element (it is
         `aria-hidden`), and a probe that assumed otherwise would break the moment it was labelled. */
      const bare = (s: string) => s.replace(/^§\s*(·\s*)?/, "").trim();
      const byName = Object.fromEntries(r.openings.map((o) => [bare(o.name), o]));
      expect(Object.keys(byName).sort()).toEqual(
        ["POST-R&R (T. MARSH)", "PROLOGUE-FIRST", "WORLDBUILDING-FIRST"].sort(),
      );
      /* ⚠️ NOT A RATE ANYWHERE ON THE PANEL (D15) */
      for (const o of r.openings) {
        expect(o.meta, `a percentage on "${o.name}"`).not.toContain("%");
        expect(o.meta).toMatch(/\d+ REQUESTS? FROM \d+ SENT/i);
        expect(o.where).toMatch(/\d+ SAMPLES? · \d+ PACKAGES?/i);
      }
      /* the seed points one sample at Prologue-first and one at Worldbuilding-first */
      expect(byName["PROLOGUE-FIRST"].where).toMatch(/^2 SAMPLES/i);
      expect(byName["WORLDBUILDING-FIRST"].where).toMatch(/^1 SAMPLE ·/i);

      /* D16 — the holders panel, and every row says what they hold */
      expect(r.holders, `no holders panel at ${width}`).not.toBeNull();
      const h = r.holders!;
      expect(h.rows.length).toBeGreaterThan(0);
      expect(h.tag).toMatch(new RegExp(`^${h.rows.length} HELD$`, "i"));
      for (const row of h.rows) {
        expect(row.agent.length, "a holder with no name").toBeGreaterThan(0);
        expect(row.what).toMatch(/^(FULL|PARTIAL)\b/i);
        /* ⚠️ EXACTLY ONE OF THE TWO — a chip, or the words that say there is no record. Never both,
           and never neither: a blank third column is the app declining to answer its own question. */
        expect(Number(!!row.version) + Number(!!row.none), `row "${row.agent}" answers twice or not at all`).toBe(1);
      }

      /* D17 — a count and nothing more */
      if (h.note) {
        /**
         * ⚠️ TWO SHAPES, AND THE SECOND IS WHY THIS MEASUREMENT EXISTS. On the live fixture two of
         * four holders had no recorded version and the line read "2 of 4" — true arithmetic, read
         * as "the other two hold the latest", which is false. An unrecorded holder now gets its own
         * clause instead of being folded into a total it cannot support.
         */
        const recorded = h.rows.filter((row) => !!row.version).length;
        const unknown = h.rows.length - recorded;
        expect(h.note).toMatch(
          unknown === 0
            ? /^\d+ of \d+ hold a version earlier than your latest\.$/i
            : /^\d+ hold a version earlier than your latest; \d+ (is|are) unrecorded\.$/i,
        );
        /* and the denominator, where it appears, is the number of holders and not a guess */
        const m = /^(\d+) of (\d+)/.exec(h.note);
        if (m) expect(Number(m[2])).toBe(h.rows.length);
        for (const w of ["should", "consider", "chase", "worth", "recommend", "update them"]) {
          expect(h.note.toLowerCase(), `the note urges: "${w}"`).not.toContain(w);
        }
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
});

/**
 * ⚠️ THE MODAL'S FIELD IS CHECKED BY OPENING THE MODAL, not by reading the component. A source lock
 * proves the control was written; only the page proves a writer can reach it — and this one is
 * behind a type condition, so "written" and "reachable" are genuinely different claims here.
 */
test("the From version field appears on a sample and nowhere else", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1100 });
  await page.waitForTimeout(900);

  const openSheet = async (type: string) => {
    const sheet = page.locator(`.pkgb-msheet[data-type="${type}"]`).first();
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await sheet.locator(".pkgb-mname").click();
    await page.waitForTimeout(500);
  };
  const readModal = () =>
    page.evaluate(() => {
      const sel = document.querySelector("#pkgf-bookversion") as HTMLSelectElement | null;
      const label = document.querySelector('label[for="pkgf-bookversion"]') as HTMLElement | null;
      return {
        present: !!sel,
        options: sel ? [...sel.options].map((o) => o.text) : [],
        value: sel?.value ?? null,
        label: label?.innerText.replace(/\s*\n\s*/g, " ") ?? null,
        hint: (sel?.closest(".pkgf-field")?.querySelector(".pkgf-sub") as HTMLElement | null)?.innerText ?? null,
        /* the vocabulary is SELECTED, never typed — no text input bound to it anywhere in the form */
        textInputs: [...document.querySelectorAll('.pkgf-field input[type="text"]')]
          .map((i) => (i as HTMLInputElement).getAttribute("aria-label") ?? ""),
      };
    });

  await openSheet("Sample Pages");
  const onSample = await readModal();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await openSheet("Query Letter");
  const onLetter = await readModal();
  await page.keyboard.press("Escape");

  console.log(JSON.stringify({ onSample, onLetter }, null, 2));

  expect(onLetter.present, "a letter was offered a version").toBe(false);

  if (onSample.present) {
    /* D11 — selected, never typed, and a way to record nothing */
    expect(onSample.options[0]).toMatch(/none/i);
    expect(onSample.options.length).toBeGreaterThan(1);
    expect(onSample.label).toMatch(/From version/i);
    expect(onSample.label).toMatch(/Optional/i);
    expect(onSample.textInputs.join(" ").toLowerCase()).not.toContain("version");
    /* D14 — the limitation is stated on the control, not buried */
    expect(onSample.hint).toMatch(/records the reference/i);
    expect(onSample.hint).toMatch(/can.t check that the text matches/i);
  }
});

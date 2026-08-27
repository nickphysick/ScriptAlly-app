import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 4 — the hand belongs to actions only.
 *
 * ⚠️ THE CLAIM IS ABOUT ABSENCE MORE THAN PRESENCE. A note is set in Caveat, which implies a
 * person wrote it, and the person it implies is the writer — so the fault to catch is a scrawl on
 * a row where nothing is being asked of them. Every group is swept, not only the ones that carry
 * notes, because "Watching brief renders none" is unverifiable if Watching brief is never read.
 */
test("Phase 4 — notes appear where there is an action, and nowhere else", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];
  const slider = page.getByRole("slider", { name: /range/i });
  const counts: string[] = [];

  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(620);

    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
      const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const kids = [...tl.children].filter((e) => e.getBoundingClientRect().height > 0);
      let group = "(none)";
      const rows: { group: string; note: string; deed: string; bars: string[]; states: string[] }[] = [];
      for (const el of kids) {
        if (el.classList.contains("tl-ghead")) {
          group = (el.querySelector(".tl-ghname")?.textContent || "").trim();
        } else if (el.classList.contains("tl-row") && !el.classList.contains("tl-head")) {
          const tail = el.querySelector(".tl-tail") as HTMLElement | null;
          rows.push({
            group,
            note: (tail?.textContent || "").trim(),
            deed: (tail?.querySelector("u")?.textContent || "").trim(),
            bars: [...el.querySelectorAll(".tl-seg .tl-lbl")].map((b) => (b.textContent || "").trim()),
            states: [...el.querySelectorAll(".tl-seg")]
              .flatMap((b) => [...b.classList].filter((c) => c.startsWith("s-"))),
          });
        }
      }
      const tail = tl.querySelector(".tl-tail") as HTMLElement | null;
      const cs = tail ? getComputedStyle(tail) : null;
      const u = tail?.querySelector("u") as HTMLElement | null;
      return {
        rows,
        look: cs ? {
          font: cs.fontFamily, size: cs.fontSize, colour: cs.color,
          transform: cs.transform, pe: cs.pointerEvents,
          /* the underline is DRAWN — a `text-decoration` under a hand is a printed rule */
          deco: u ? getComputedStyle(u).textDecorationLine : null,
          drawn: u ? getComputedStyle(u, "::after").borderBottomWidth : null,
        } : null,
        ink: tl.textContent || "",
      };
    });

    const noted = r.rows.filter((x) => x.note);
    counts.push(`${STOPS[i]}: ${noted.length}/${r.rows.length}`);
    console.log(`  ${STOPS[i].padEnd(9)} ${noted.length} of ${r.rows.length} rows carry a note` +
      (noted.length ? ` — ${noted.slice(0, 3).map((x) => `"${x.note}"`).join(", ")}` : ""));

    expect(r.rows.length, `${STOPS[i]}: no rows — nothing was measured`).toBeGreaterThan(0);

    for (const row of r.rows) {
      /* ⚠️ NOTHING SAGE, GREY OR CLOSED IS EVER SCRAWLED. Checked against the row's own bar STATES
         rather than its group, so a row filed under an action group whose bars are all waiting
         still fails — the two are different claims and this is the stricter one. */
      const actionable = row.states.some((s) => ["s-y1", "s-y2", "s-y3", "s-offer", "s-quiet"].includes(s))
        || row.group === "Needs you now" || row.group === "Offers";
      if (row.note) {
        expect(actionable, `${STOPS[i]}: "${row.note}" is scrawled on a ${row.group} row (${row.states.join(",")})`).toBe(true);
        expect(row.group, `${STOPS[i]}: a Watching brief row carries "${row.note}"`).not.toBe("Watching brief");
        expect(row.group, `${STOPS[i]}: a closed row carries "${row.note}"`).not.toBe("Recently closed");
        expect(row.group, `${STOPS[i]}: a quiet group row carries "${row.note}"`).not.toBe("Needs you soon");
        expect(row.deed.length, `${STOPS[i]}: "${row.note}" has no underlined deed`).toBeGreaterThan(0);
        /* ⚠️ AND THE NOTE NEVER SAYS WHAT ITS OWN BAR SAYS. The bar states what a stretch of time
           IS; the note states what to do about it. The ref itself breaks this once. */
        const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        for (const b of row.bars) {
          if (!b) continue;
          expect(norm(row.note), `${STOPS[i]}: the note repeats its own bar — "${b}"`).not.toBe(norm(b));
        }
      }
    }

    /* ⚠️ THE FORBIDDEN WORD, ON THE RENDERED BOARD. It is a verdict twice over: it says the writer
       failed, and it implies a deadline that mostly does not exist. */
    expect(r.ink.toLowerCase(), `${STOPS[i]}: the board says "overdue"`).not.toContain("overdue");

    if (i === 0 && r.look) {
      console.log(`  hand: ${r.look.font} ${r.look.size} ${r.look.colour} ${r.look.transform} · pe ${r.look.pe} · underline drawn ${r.look.drawn}`);
      expect(r.look.font, "the note is not in Caveat").toContain("Caveat");
      expect(r.look.size, "the note is not ~19px").toBe("19px");
      expect(r.look.colour, "the note is not burgundy").toBe("rgb(124, 58, 42)");
      /* ⚠️ THE ANGLE IS COMPUTED FROM THE MATRIX, NOT PATTERN-MATCHED OUT OF IT. `-1.1deg` is
         reported as `matrix(0.999816, -0.0191974, …)` and a regex over those digits pins Chromium's
         rounding rather than the design — it went red on a correct page over the sixth decimal.
         `atan2(b, a)` is the rotation, and asserting it within a tenth of a degree says what the
         design says. */
      const m = (r.look.transform.match(/matrix\(([-\d.]+), *([-\d.]+)/) ?? []).slice(1).map(Number);
      const deg = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
      console.log(`  tilt ${deg.toFixed(2)}°`);
      expect(Math.abs(deg - -1.1), `the note is tilted ${deg.toFixed(2)}°, not -1.1°`).toBeLessThan(0.1);
      expect(r.look.pe, "the note is pressable — that is Nick's call, not this pack's").toBe("none");
      expect(r.look.deco, "the deed uses text-decoration — a printed rule under a hand").toBe("none");
      /* ⚠️ ANY DRAWN RULE, NOT A WIDTH. `border-bottom: 1.6px` reports back as `1px` — Chromium
         rounds a sub-pixel border in `getComputedStyle` — so a `> 1` check fails on a border that
         is there and correct. What matters is that the underline is DRAWN rather than
         `text-decoration`, and a non-zero border on the pseudo-element is that claim. */
      expect(parseFloat(r.look.drawn || "0"), "the deed has no drawn underline").toBeGreaterThan(0);
    }
  }
  console.log(`  notes per range — ${counts.join(" · ")}`);
  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});

/**
 * v60b Phase 2 — the flags.
 *
 * ⚠️ TWO TREATMENTS, AND THE QUIET ONE IS NOT THE LOUD ONE FADED. A future state is a dotted
 * outline with no fill and no lift; an urgent one is a raised card with a pink strip and a `!`.
 * Both claims are asserted, and both populations are stated first.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { DEEDS } from "../../src/lib/calendarPill";

const CAL = "/todo/calendar";

type Flag = {
  sec: string; name: string; fut: number; od: number; mark: number;
  futText: string[]; odText: string[];
  futBd: string | null; futBg: string | null; futSh: string | null; futFamily: string | null;
  odAtToday: number | null; odStrip: string | null; odBang: string | null;
};

const read = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll<HTMLElement>(".tl-rrow")]
    .filter((r) => r.getBoundingClientRect().height > 0);
  const line = document.querySelector<HTMLElement>(".tl-todayline");
  const todayX = line ? line.getBoundingClientRect().left : null;
  return rows.map((r) => {
    const sec = (r.closest(".tl-grp") as HTMLElement | null)?.dataset.sec ?? "";
    const fut = [...r.querySelectorAll<HTMLElement>(".tl-cap:not(.od)")];
    const od = [...r.querySelectorAll<HTMLElement>(".tl-cap.od")];
    const s0 = fut[0] ? getComputedStyle(fut[0]) : null;
    const strip = od[0]?.querySelector<HTMLElement>(".fh") ?? null;
    return {
      sec, name: r.querySelector(".tl-fnm")?.textContent ?? "?",
      fut: fut.length, od: od.length,
      mark: r.querySelectorAll(".tl-tmark").length,
      futText: fut.map((e) => (e.innerText || "").replace(/\n/g, " · ")),
      odText: od.map((e) => (e.innerText || "").replace(/\n/g, " · ")),
      futBd: s0?.borderStyle ?? null,
      futBg: s0?.backgroundColor ?? null,
      futSh: s0?.boxShadow ?? null,
      futFamily: fut[0]?.querySelector(".w") ? getComputedStyle(fut[0].querySelector(".w")!).fontFamily : null,
      odAtToday: od[0] && todayX != null ? Math.round(od[0].getBoundingClientRect().left - todayX) : null,
      odStrip: strip ? getComputedStyle(strip).backgroundColor : null,
      odBang: strip ? getComputedStyle(strip, "::before").content : null,
    };
  });
});

test.describe("v60b · flags", () => {
  test("⚠️ a future state is dotted, unfilled and unlifted, with the deed in Caveat", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rows = (await read(page)) as Flag[];
    const withFut = rows.filter((r) => r.fut > 0);
    expect(withFut.length, "no future flag on the board — the claim is untested").toBeGreaterThan(2);
    for (const r of withFut) {
      expect(r.futBd, `${r.name}'s flag is ${r.futBd}, not dotted`).toBe("dotted");
      expect(r.futBg, `${r.name}'s future flag carries a fill`).toBe("rgba(0, 0, 0, 0)");
      expect(r.futSh, `${r.name}'s future flag is lifted`).toBe("none");
      expect(r.futFamily, "the deed is not in the app's handwriting").toMatch(/Caveat/);
      /* two lines: the deed, then the day it names, worded for its kind */
      for (const t of r.futText) {
        expect(t, `a future flag reads "${t}"`).toMatch(/·\s*(FROM|BY)\s/);
      }
      /* a flag standing at a dated end has the card's terminal mark beside it */
      expect(r.mark, `${r.name} has a flag but no mark at its end`).toBeGreaterThan(0);
    }
  });

  test("⚠️ every Urgent row carries exactly one urgent flag, at today, and no end mark", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rows = (await read(page)) as Flag[];
    const urgent = rows.filter((r) => r.sec === "over");
    const calm = rows.filter((r) => r.sec === "with" || r.sec === "need");
    expect(urgent.length, "no Urgent rows — untested").toBeGreaterThan(2);
    expect(calm.length, "no calm rows — the claim cannot discriminate").toBeGreaterThan(0);
    for (const r of urgent) {
      /* ⚠️ ONE PER ROW, NOT ONE PER SEGMENT. A row can hold several late stretches, and three
         identical pink flags stacked on one column say the same thing three times. */
      expect(r.od, `${r.name} carries ${r.od} urgent flags`).toBe(1);
      expect(r.odAtToday, `${r.name}'s urgent flag stands ${r.odAtToday}px from today`)
        .toBeGreaterThanOrEqual(0);
      expect(r.odAtToday!, `${r.name}'s urgent flag is ${r.odAtToday}px from today`).toBeLessThan(60);
      expect(r.odStrip, `${r.name}'s urgent flag has no pink strip`).not.toBe("rgba(0, 0, 0, 0)");
      expect(r.odBang, `${r.name}'s strip carries no !`).toContain("!");
      /* the deed is one of the app's own moves, and the mono line does not restate it */
      const [deed, ...rest] = r.odText[0].split(" · ");
      expect(new Set<string>(Object.values(DEEDS)).has(deed),
        `an urgent flag says "${deed}", which is not one of the app's moves`).toBe(true);
      expect(rest.join(" · ").trim().toLowerCase(),
        `${r.name}'s flag states its own deed twice`).not.toBe(deed.trim().toLowerCase());
    }
    for (const r of calm) {
      expect(r.od, `${r.name} is not Urgent and carries an urgent flag`).toBe(0);
    }
  });

  test("⚠️ ONE INSTRUCTION PER ROW — never an urgent flag and a future one together", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rows = (await read(page)) as Flag[];
    /* ⚠️ MEASURED BEFORE THE RULING: two rows read "6 weeks overdue" beside "Nudge · from 19
       Sept". Both were true — a passed estimate, and the agency's next window — and side by side
       they state two moves at once, leaving the reader to work out which is being asked of them.
       That is the opposite of what a flag is for. Both facts survive in the hover record. */
    const both = rows.filter((r) => r.od > 0 && r.fut > 0);
    expect(both.map((r) => `${r.name}: ${r.odText[0]} + ${r.futText[0]}`),
      "a row states two instructions at once").toEqual([]);
    /* both populations, or the claim is satisfied by a board that has neither kind */
    expect(rows.filter((r) => r.od > 0).length, "no urgent flag — untested").toBeGreaterThan(0);
    expect(rows.filter((r) => r.fut > 0).length, "no future flag — untested").toBeGreaterThan(0);
  });

  test("⚠️ an overdue card ends at today and takes no end mark", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rows = (await read(page)) as Flag[];
    /* ⚠️ THE DISCRIMINATOR CHANGED WITH THE ONE-INSTRUCTION RULING, AND THE CLAIM DID NOT.
       This used to select owed rows as "Urgent with no future flag"; suppressing future flags on
       Urgent rows made that every Urgent row, including the passed-estimate ones — which DO have a
       dated future window and correctly keep their mark. The claim was never about the flag: a card
       that runs to TODAY has no dated future moment to mark. So the selector is now the card's own
       right edge, which is what the claim is about. */
    const atToday = await page.evaluate(() => {
      const line = document.querySelector<HTMLElement>(".tl-todayline");
      const x = line ? line.getBoundingClientRect().left : null;
      const out: { name: string; marks: number }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const r = c.getBoundingClientRect();
        if (r.height < 1 || x == null || Math.abs(r.right - x) > 6) continue;
        out.push({
          name: c.querySelector(".tl-fnm")?.textContent ?? "?",
          marks: c.querySelectorAll(".tl-tmark").length,
        });
      }
      return out;
    });
    expect(atToday.length, "no card runs to today — untested").toBeGreaterThan(2);
    for (const c of atToday) {
      expect(c.marks, `${c.name} runs to today and still carries an end mark`).toBe(0);
    }
  });

  test("⚠️ the urgent flag wobbles, and its keyframes restate the base transform", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* ⚠️ THE HARNESS SUPPRESSES ANIMATION, so this must be lifted before the claim can be read at
       all — `animation: none` is what a suppressed board reports, which is indistinguishable from
       a rule that was never written. */
    await liftMotionSuppression(page);
    await page.waitForTimeout(150);
    const seen = await page.evaluate(() => {
      const od = [...document.querySelectorAll<HTMLElement>(".tl-cap.od")]
        .filter((e) => e.getBoundingClientRect().height > 0);
      /* the keyframe text, read from the live stylesheet rather than from source */
      let frames: string[] = [];
      for (const ss of [...document.styleSheets]) {
        let rules: CSSRuleList;
        try { rules = ss.cssRules; } catch { continue; }
        for (const r of [...rules]) {
          if (r instanceof CSSKeyframesRule && r.name === "tlWobF") {
            frames = [...r.cssRules].map((k) => (k as CSSKeyframeRule).style.transform);
          }
        }
      }
      return { count: od.length, anim: od[0] ? getComputedStyle(od[0]).animationName : null, frames };
    });
    expect(seen.count, "no urgent flag to animate").toBeGreaterThan(0);
    expect(seen.anim, "the urgent flag does not wobble").toBe("tlWobF");
    expect(seen.frames.length, "tlWobF has no frames").toBeGreaterThan(3);
    for (const t of seen.frames) {
      /* ⚠️ EVERY FRAME RESTATES THE BASE IN FULL. A frame stating only `rotate()` discards the
         `translateY(-50%)` that centres the flag on its bar, and a `var()` here resolves to
         nothing at all — both fail silently, which is why this is asserted frame by frame. */
      expect(t, `a frame reads "${t}" and drops the base transform`).toContain("translateY(-50%)");
      expect(t, "a keyframe reads a custom property, which resolves to nothing here")
        .not.toContain("var(");
    }
  });
});

/**
 * v60b Phase 1 — the fidelity of what was built, measured on the rendered board.
 *
 * ⚠️ EVERY VALUE COMES FROM THE REF AT TEST TIME, and every sweep states its population first.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { refTokens } from "./refValues";
import { DEEDS } from "../../src/lib/calendarPill";

const CAL = "/todo/calendar";

test.describe("v60b · fidelity", () => {
  test("⚠️ the numbers column has NO fill — measured as painted pixels, not as a computed value", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const seen = await page.evaluate(() => {
      const out: { sec: string; numsBg: string; headBg: string; grpBg: string }[] = [];
      for (const g of document.querySelectorAll<HTMLElement>(".tl-grp[data-sec]")) {
        if (g.getBoundingClientRect().height < 1) continue;
        out.push({
          sec: g.dataset.sec!,
          numsBg: getComputedStyle(g.querySelector<HTMLElement>(".tl-gnums")!).backgroundColor,
          headBg: getComputedStyle(g.querySelector<HTMLElement>(".tl-gt")!).backgroundColor,
          grpBg: getComputedStyle(g).backgroundColor,
        });
      }
      return out;
    });
    expect(seen.length, "no sections rendered").toBeGreaterThan(2);
    for (const s of seen) {
      /* ⚠️ THE HEADER KEEPS ITS TINT AND THE COLUMN DOES NOT. The ref's base `.gnums` carries
         `background: transparent !important`, which beats its own per-section rule outright —
         `!important` outranks specificity, so the usual "the later declaration wins" reading does
         not reach it. Built from the per-section rule alone, this drew a tinted stripe the height
         of every section. */
      expect(s.numsBg, `${s.sec}'s number column is filled`).toBe("rgba(0, 0, 0, 0)");
      expect(s.headBg, `${s.sec}'s header lost its tint`).not.toBe("rgba(0, 0, 0, 0)");
      expect(s.headBg, `${s.sec}'s header is the same tone as its body`).not.toBe(s.grpBg);
    }
    /* ⚠️ AND THE PAINTED PIXEL, because a computed `transparent` says only that THIS element paints
       nothing — an ancestor may still be painting a tint behind it, which is exactly the shape a
       computed-style probe cannot see. Screenshot a slice of the column and require it to match the
       section body rather than the header. */
    const box = await page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>('.tl-grp[data-sec="over"]')]
        .find((e) => e.getBoundingClientRect().height > 0);
      if (!g) return null;
      const n = g.querySelector<HTMLElement>(".tl-gnums")!.getBoundingClientRect();
      const l = g.querySelector<HTMLElement>(".tl-glanes")!.getBoundingClientRect();
      return {
        nums: { x: Math.round(n.x + 4), y: Math.round(n.y + 40), width: 8, height: 8 },
        lanes: { x: Math.round(l.x + 4), y: Math.round(l.y + 40), width: 8, height: 8 },
      };
    });
    expect(box, "no Urgent section to photograph").not.toBeNull();
    const a = await page.screenshot({ clip: box!.nums });
    const b = await page.screenshot({ clip: box!.lanes });
    expect(a.equals(b), "the number column is painted a different colour from the lanes beside it")
      .toBe(true);
  });

  test("⚠️ the badge is the ref's token, exceeds the bar, and its ring scales with it", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const want = Number((refTokens()["--badge"] ?? "").replace("px", ""));
    expect(want, "the ref pins no --badge").toBeGreaterThan(20);
    const seen = await page.evaluate(() => {
      const board = document.querySelector<HTMLElement>(".tl-board")!;
      const barH = parseFloat(getComputedStyle(board).getPropertyValue("--bar-h"));
      const out: { h: number; over: number; ring: number; disc: number; fill: string }[] = [];
      for (const m of document.querySelectorAll<HTMLElement>(".tl-medal")) {
        const r = m.getBoundingClientRect();
        if (r.height < 1) continue;
        /* a card whose left edge dissolves sits its badge inside — no edge to burst from */
        if (m.closest(".tl-p")?.classList.contains("fadeL")) continue;
        /* the disc is the StatusDot's own ringed circle — the first round child */
        const disc = [...m.querySelectorAll<HTMLElement>("span")]
          .find((e) => getComputedStyle(e).borderRadius === "50%" && !e.className.includes("pulse"));
        const cs = disc ? getComputedStyle(disc) : null;
        const card = m.closest<HTMLElement>(".tl-p");
        out.push({
          h: Math.round(r.height),
          over: card ? Math.round(card.getBoundingClientRect().left - r.left) : 0,
          ring: cs ? parseFloat(cs.borderTopWidth) : -1,
          disc: disc ? Math.round(disc.getBoundingClientRect().height) : -1,
          fill: cs ? cs.backgroundColor : "",
        });
      }
      return { out, barH };
    });
    expect(seen.out.length, "no badges on the board").toBeGreaterThan(3);
    for (const b of seen.out) {
      expect(b.h, `badge ${b.h}px against the ref's ${want}px`).toBe(want);
      /* ⚠️ THE PACK ASKED FOR "BADGE BOX EXCEEDS THE BAR HEIGHT" AND THE REF CONTRADICTS IT.
         v60 pins `--badge: 58px` against `--bar-h: 62px`, so the badge fits INSIDE the bar
         vertically; what it exceeds is the card's LEFT EDGE, by `calc(var(--badge) * -0.35)`. The
         authority split gives geometry to the ref, so that is what is asserted — the horizontal
         overhang, which is the claim the ref actually makes and the one a reader can see. */
      expect(b.h, `badge ${b.h}px against the bar's ${seen.barH}px`).toBeLessThanOrEqual(seen.barH);
      expect(b.over, `the badge stands ${b.over}px proud of the card's left edge`)
        .toBeGreaterThan(Math.round(want * 0.3));
      /* ⚠️ THE RING IS PROPORTIONAL, NOT A 1px HAIRLINE. Measured before the fix: a 58px disc in a
         pale tint with a 1px edge, which reads as a wash rather than a mark. The ref's circle is
         stroked at ~11.5% of its drawn diameter. */
      expect(b.ring, `the badge's ring is ${b.ring}px on a ${b.disc}px disc`).toBeGreaterThan(3);
      /* and the centre is clear, so the glyph reads out of a field rather than off a tint */
      expect(b.fill).toBe("rgb(255, 255, 255)");
    }
  });

  test("⚠️ every Urgent row states a move, in the writer's tone; everything else states a status", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const rows = await page.evaluate(() => {
      const out: { sec: string; chip: string | null; tone: string | null; fact: string | null }[] = [];
      for (const r of document.querySelectorAll<HTMLElement>(".tl-rrow")) {
        if (r.getBoundingClientRect().height < 1) continue;
        const sec = (r.closest(".tl-grp") as HTMLElement | null)?.dataset.sec ?? "";
        const chip = r.querySelector<HTMLElement>(".tl-fchip");
        out.push({
          sec,
          chip: chip?.textContent ?? null,
          tone: chip ? [...chip.classList].find((c) => ["you", "them", "rem", "quiet", "shut"].includes(c)) ?? null : null,
          fact: r.querySelector<HTMLElement>(".tl-ffx")?.textContent ?? null,
        });
      }
      return out;
    });
    const urgent = rows.filter((r) => r.sec === "over" && r.chip);
    const rest = rows.filter((r) => r.sec !== "over" && r.sec !== "task" && r.chip);
    /* ⚠️ BOTH SIDES, OR THE CLAIM IS HALF-TESTED. A sweep where every row is Urgent proves only
       that Urgent behaves — the monoculture fault this repo records against a census of eleven
       identical strips. */
    expect(urgent.length, "no Urgent rows — the imperative claim is untested").toBeGreaterThan(0);
    expect(rest.length, "no non-Urgent rows — the status claim is untested").toBeGreaterThan(0);

    /* ⚠️ THE SET COMES FROM `DEEDS`, NOT FROM A LITERAL LIST. The pack names five imperatives; the
       app has SIX — `Send the revision`, which Revise & Resubmit needs and the ref's fixture has no
       equivalent of. A lock spelling out five would fail on a status the app legitimately produces,
       which is the "hand-written argument its callers cannot supply" fault pointing the other way. */
    const moves = new Set<string>(Object.values(DEEDS));
    for (const r of urgent) {
      expect(moves.has(r.chip!), `an Urgent row says "${r.chip}", which is not one of the app's moves`)
        .toBe(true);
      expect(r.tone, `"${r.chip}" is drawn in the "${r.tone}" tone, not the writer's`).toBe("you");
    }
    for (const r of rest) {
      expect(moves.has(r.chip!), `a non-Urgent row states the move "${r.chip}" — the deed is for overdue work`)
        .toBe(false);
    }
    /* the passed-estimate rows take the lateness vocabulary, not a description of the absence */
    const est = urgent.filter((r) => r.chip === DEEDS.them);
    expect(est.length, "no passed-estimate row on the board — that branch is untested").toBeGreaterThan(0);
    for (const r of est) {
      expect(r.fact, `a passed-estimate row reads "${r.fact}"`).toMatch(/expected .+ overdue/);
      expect(r.fact, "the retired 'none yet' copy is still on the board").not.toMatch(/none yet/);
    }
  });

  test("⚠️ the today line spans the rail's top to the rows' foot, and no further", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const m = await page.evaluate(() => {
      const line = document.querySelector<HTMLElement>(".tl-todayline");
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const rows = document.querySelector<HTMLElement>(".tl-rows");
      if (!line || !rail || !rows) return null;
      const l = line.getBoundingClientRect();
      return {
        lineTop: l.top, lineBottom: l.bottom,
        railTop: rail.getBoundingClientRect().top,
        rowsBottom: rows.getBoundingClientRect().bottom,
      };
    });
    expect(m, "no today line on the board").not.toBeNull();
    /* ⚠️ IT BEGAN 18px HIGH, IN THE GAP UNDER THE CONTROLS. `top: 0` on an absolutely positioned
       child resolves against the containing block's PADDING box, and the wrap pads its top to give
       the flags room to fly — so the line pointed at nothing above the rail. */
    expect(Math.abs(m!.lineTop - m!.railTop), `the line starts ${Math.round(m!.lineTop - m!.railTop)}px from the rail's top`)
      .toBeLessThan(2);
    expect(Math.abs(m!.lineBottom - m!.rowsBottom), "the line does not reach the rows' foot")
      .toBeLessThan(2);
  });

  test("⚠️ every card whose wait runs to today dissolves at it — overlay AND shadow", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const line = document.querySelector<HTMLElement>(".tl-todayline");
      const todayX = line ? line.getBoundingClientRect().left : null;
      const out: { name: string; endsAtToday: boolean; fadeR: boolean; fov: number; shd: number }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const r = c.getBoundingClientRect();
        if (r.height < 1) continue;
        out.push({
          name: c.querySelector(".tl-fnm")?.textContent ?? "?",
          endsAtToday: todayX != null && Math.abs(r.right - todayX) < 40,
          fadeR: c.classList.contains("fadeR"),
          fov: c.querySelectorAll(".tl-fov").length,
          shd: c.querySelectorAll(".tl-shd").length,
        });
      }
      return out;
    });
    const running = f.filter((c) => c.endsAtToday);
    expect(running.length, "no card ends at today — the fade claim is untested").toBeGreaterThan(2);
    /* and the other side: a card that ends elsewhere must NOT be faded at its right edge for the
       claim to mean anything — otherwise "every card fades" would satisfy it */
    expect(f.length - running.length, "every card ends at today — the claim cannot discriminate")
      .toBeGreaterThan(0);
    const crisp = running.filter((c) => !c.fadeR || c.fov === 0 || c.shd === 0);
    expect(crisp.map((c) => c.name), "cards run to today and end crisp").toEqual([]);
  });
});

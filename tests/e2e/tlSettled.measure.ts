import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * Phase 6 — the settled timeline's acceptance, four widths × five ranges.
 *
 * ⚠️ EVERY CLAIM AT EVERY STOP. This pack changed what a bar is coloured by, what it says, what
 * moves and what is written beside it — four things whose interaction nothing had measured
 * together, and a law that holds at exactly one width is a coincidence.
 */
const WIDTHS = [1280, 1440, 1920, 2400];
/* ⚠️ THE STOPS ARE SPLICED FROM THE CONTROL, NEVER RETYPED — and this list was WRONG. The 1-week
   and 2-week stops were deleted in v35 (Porcelain, Phase 2), so every run since has driven indices
   3 and 4 against a three-stop control, where they clamp: two of five iterations silently measured
   the six-month board twice and reported it as "2 weeks" and "1 month". Green the whole time, over
   a census that was two-fifths a monoculture. */
const STOPS = [...RANGE_LABELS];
const FLAT = ["s-theirs", "s-theirsq", "s-nudged", "s-y1", "s-y2", "s-y3", "s-offer"];

test("Phase 6 — colour, breath, words and the hand, at every width and range", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    /* ⚠️ LIFTED, OR THE BREATH COLUMN IS THE HARNESS ANSWERING. `openRoute` suppresses animation
       with a stylesheet rule, so `animationName` reads `none` on a page whose pulse is perfectly
       correct — and a check that accepted that would go green on a build with no pulse at all. */
    await liftMotionSuppression(page);
    await page.waitForTimeout(950);
    /* ⚠️ THE RANGE SLIDER IS RETIRED (v40, Phase 6): the range is one row of the ONE `Display`
       popover now. The helper is shared — every file that drove the old control held its own copy,
       and all of them went red together the day it changed. */

    for (let i = 0; i < STOPS.length; i++) {
      await setRangeTo(page, i);

      const m = await page.evaluate((flat: string[]) => {
        const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
        const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
        const board = tl.closest(".tl-board") as HTMLElement;
        const zone = tl.closest(".tl-zone") as HTMLElement;
        const segs = [...tl.querySelectorAll<HTMLElement>(".tl-seg")];
        const names = [...tl.querySelectorAll(".tl-nmtxt")].map((n) => (n.textContent || "").trim());

        const mismatched: string[] = [];
        for (const s of segs) {
          const st = [...s.classList].find((c) => c.startsWith("s-")) ?? "";
          const cs = getComputedStyle(s);
          /* ⚠️ TRANSPARENT, PLUS THE CLIP THAT MAKES IT WORK. Comparing the border's colour to the
             fill's was the first form of this check and it caught the real fault — a pulse
             deepening the background while a border holding a COPY of the fill stayed put. */
          if (flat.includes(st) && cs.borderTopColor !== "rgba(0, 0, 0, 0)") {
            mismatched.push(`${st} border painted ${cs.borderTopColor}`);
          }
          if (flat.includes(st) && cs.backgroundClip !== "border-box") {
            mismatched.push(`${st} fill no longer paints under its border`);
          }
          if (st === "s-closed" && cs.borderTopStyle !== "dashed") mismatched.push("closed lost its dash");
        }

        /* ⚠️ A CLAMPED EDGE IS A BORDER AND THE TRACK CLIPS. Two claims that only mean something
           together: an edge that says "this runs past the board" is a lie if the bar has actually
           been allowed to spill out of the track and paint over the row head. */
        const spill: string[] = [];
        const zr = zone.getBoundingClientRect();
        for (const s of segs) {
          const r = s.getBoundingClientRect();
          if (r.right > zr.right + 1 || r.left < zr.left - 1) spill.push(`${Math.round(r.left)}–${Math.round(r.right)}`);
        }
        const clampL = tl.querySelector<HTMLElement>(".tl-seg.openleft");
        const clampR = tl.querySelector<HTMLElement>(".tl-seg.future");

        const bars = segs.map((b) => {
          const l = b.querySelector<HTMLElement>(".tl-lbl");
          const shown = l && getComputedStyle(l).display !== "none" ? (l.textContent || "").trim() : "";
          return { long: l?.dataset.long ?? "", short: l?.dataset.short ?? "", shown };
        });

        const notes = [...tl.querySelectorAll(".tl-tail")].map((t) => (t.textContent || "").trim());
        const y3 = tl.querySelector<HTMLElement>(".tl-seg.s-y3");
        /* ⚠️ THE REGRESSION THIS WHOLE PACK EXISTS FOR — labels at three and six months, where a
           density tier used to set `display: none` on every one of them. */
        const labels = [...tl.querySelectorAll<HTMLElement>(".tl-seg .tl-lbl")]
          .filter((e) => getComputedStyle(e).display !== "none" && (e.textContent || "").trim());
        /* ⚠️ AND THE BAR'S HEIGHT, which must not move with the range. It never did — no tier ever
           touched `--bar-h` — but this is the shape a future tier would reach for first. */
        const barH = segs.length ? Math.round(segs[0].getBoundingClientRect().height) : null;
        const says = [...tl.querySelectorAll<HTMLElement>(".tl-rowsay")];
        const notch = tl.querySelector<HTMLElement>(".tl-wp");
        const disc = tl.querySelector<HTMLElement>(".tl-node");
        const todayDd = tl.querySelector<HTMLElement>(".tl-dh.today .tl-dd");

        return {
          segs: segs.length, mismatched, spill: spill.slice(0, 3),
          clampL: clampL ? getComputedStyle(clampL).borderLeftStyle : null,
          clampR: clampR ? getComputedStyle(clampR).borderRightStyle : null,
          zoneClips: getComputedStyle(zone).overflowX,
          ground: getComputedStyle(board).backgroundColor,
          bars, notes, names,
          breath: y3 ? getComputedStyle(y3).animationName : null,
          labels: labels.length,
          barH,
          saysClipped: says.filter((x) => x.scrollWidth > x.clientWidth + 1).length,
          saysN: says.length,
          notch: notch ? { tag: notch.tagName, pe: getComputedStyle(notch).pointerEvents } : null,
          disc: disc ? { tag: disc.tagName, pe: getComputedStyle(disc).pointerEvents } : null,
          today: todayDd
            ? { text: (todayDd.textContent || "").trim(), over: todayDd.scrollWidth > todayDd.clientWidth + 1 }
            : null,
          ink: tl.textContent || "",
        };
      }, FLAT);

      const say = `[${width}] ${STOPS[i].padEnd(9)} ${m.segs} bars · ${m.labels} labels · ${m.notes.length} notes` +
        ` · bar ${m.barH}px · says ${m.saysN}/${m.saysClipped} clipped · breath ${m.breath}`;
      console.log(`  ${say}`);

      expect(m.segs, `${say} — no bars`).toBeGreaterThan(0);
      /* colour */
      expect(m.mismatched, `${say} — border/fill`).toEqual([]);
      expect(m.ground, `${say} — the board's ground is not its token`).toBe("rgb(234, 226, 214)");
      /* clamps and clipping */
      if (m.clampL) expect(m.clampL, `${say} — the left clamp is not dotted`).toBe("dotted");
      if (m.clampR) expect(m.clampR, `${say} — the right clamp is not dashed`).toBe("dashed");
      expect(m.zoneClips, `${say} — the track does not clip`).toBe("hidden");
      expect(m.spill, `${say} — a bar paints outside the track`).toEqual([]);
      /* words */
      for (const b of m.bars) {
        if (b.shown) expect([b.long, b.short], `${say} — "${b.shown}" is neither form`).toContain(b.shown);
        for (const n of m.names) {
          const sn = n.split(" ").pop() ?? "";
          if (sn.length >= 4) expect(b.long, `${say} — a bar names "${sn}"`).not.toContain(sn);
        }
      }
      expect(m.ink.toLowerCase(), `${say} — the board says "overdue"`).not.toContain("overdue");

      /* ── the density pack's own acceptances ──────────────────────────────────────────────── */
      /* ⚠️ THE REGRESSION, ASSERTED AT EVERY RANGE. A tier set `display: none` on every bar label
         at three months and beyond — the range the board opens at — so the whole of the settled
         pack's copy was rendered and then suppressed. */
      expect(m.labels, `${say} — no bar carries a label`).toBeGreaterThan(0);
      /* the bar's height is the row's token and nothing else; it cannot move with the range */
      expect(m.barH, `${say} — the bar is not 44px`).toBe(44);
      /* the row head finishes its sentence */
      expect(m.saysN, `${say} — no row-head sentences`).toBeGreaterThan(0);
      expect(m.saysClipped, `${say} — ${m.saysClipped} row-head sentences are cut`).toBe(0);
      /* ⚠️ A NOTCH IS A MARK AND A DISC IS AN OBJECT — asserted together, because each alone is
         satisfied by a board where everything is one or the other. */
      if (m.notch) {
        expect(m.notch.tag, `${say} — a notch is a control`).toBe("SPAN");
        expect(m.notch.pe, `${say} — a notch takes pointer events`).toBe("none");
      }
      if (m.disc) {
        expect(m.disc.tag, `${say} — a disc is not a control`).toBe("BUTTON");
        expect(m.disc.pe, `${say} — a disc takes no pointer events`).not.toBe("none");
      }
      /* today's header shows a date rather than a blob */
      if (m.today) {
        expect(m.today.text.length, `${say} — today's mark is empty`).toBeGreaterThan(0);
        expect(m.today.over, `${say} — "${m.today.text}" spills out of today's mark`).toBe(false);
      }
      /* ⚠️ THE BREATH, WHERE THERE IS A LONG-STANDING BAR TO BREATHE. `null` means the board holds
         none at this range, which is a fact about the data rather than a failure — reported so a
         range that quietly stops producing one is visible rather than absorbed. */
      if (m.breath === null) console.log(`      NOTE: no long-standing bar at ${STOPS[i]}`);
      else expect(m.breath, `${say} — long-standing does not breathe`).toMatch(/^tlUrge(Flat)?$/);
      /* the hand — never repeating its own bar */
      const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const note of m.notes) {
        for (const b of m.bars) {
          if (b.long) expect(norm(note), `${say} — a note repeats its bar "${b.long}"`).not.toBe(norm(b.long));
        }
      }
    }
  }
  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});

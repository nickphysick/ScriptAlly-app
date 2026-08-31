/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CALENDAR, PORCELAIN — the acceptance (ref design-refs/timeline-v35.html).
 *
 * ⚠️ EVERY CLAIM IS MEASURED ON A RENDERED PAGE, AND EVERY COLOUR CLAIM IS A COMPUTED STRING.
 * A source lock proves a rule was written, never that it reached an element — and this pack's
 * whole subject is a set of values that had drifted while every rule read correctly. Class names
 * are not evidence: a `.decide` bar with no rule is still a `.decide` bar.
 *
 * ⚠️ AND EVERY SWEEP REPORTS THE DISTINCT VALUES IT SAW, not just a count. A probe over a fixture
 * where every case is the same case proves nothing and passes — the monoculture-wearing-a-census's
 * -clothes fault. The tallies below are printed so a fixture drifting into one state is visible
 * rather than silently green.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openRoute } from "./measure";

const WIDTHS = [1280, 1440, 1920];
const HEIGHT = 900;

const hex = (h: string) => {
  const n = h.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  return `rgb(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)})`;
};

/** the ref's own values — the ONLY permitted source for this territory */
const FAMILY = {
  out:    { line: "#d9e1d6", fill: "#e6ece3", near: "#d7e0d2", text: "#55684f" },
  req:    { line: "#ecd3c6", fill: "#f3e0d5", near: "#ecc9b8", text: "#6b3a2a" },
  decide: { line: "#e2b8a5", fill: "#eccbba", near: "#e2b09a", text: "#58281a" },
  remind: { line: "#dde3da", fill: "#eef1ec", near: "#dfe6dc", text: "#5c6b59" },
} as const;
const MARKER = {
  in:    { line: "#9fb29a", ink: "#55684f" },
  outk:  { line: "#cfa08e", ink: "#7c3a2a" },
  bang:  { line: "#7c3a2a", ink: "#7c3a2a" },
  clock: { line: "#bdb8b0", ink: "#6b675f" },
} as const;

/* ⚠️ THE BOARD IS FOUND BY MEASUREMENT, NEVER BY `.first()`. Every workspace page stays MOUNTED
   and three of them carry `.wpg` — a locator's first match is routinely a hidden page's zero-sized
   copy, which Playwright then waits the full timeout for. */
/**
 * Move the board to one of the three ranges.
 *
 * ⚠️ IT THROWS RATHER THAN GUARDS, and the reason is the shell. Every workspace page stays
 * MOUNTED, so a bare `querySelector` returns a hidden page's copy — the dispatch then changes
 * nothing and the probe reports three identical readings for three different ranges without
 * erroring. That happened.
 *
 * ⚠️ AND IT IS AT MODULE SCOPE BECAUSE A SECOND COPY IS THE FAULT THIS PACK IS ABOUT. It lived
 * inside one test; the fill-edge case needs it too, and writing it out again would be two
 * functions answering one question — which is the disease, not the workaround for it.
 */
const setRangeTo = async (page: import("@playwright/test").Page, i: number) => {
  await page.evaluate(`(() => {
    const all = [...document.querySelectorAll('input[type=range]')]
      .filter((e) => e.getBoundingClientRect().width > 0);
    if (all.length !== 1) throw new Error("expected 1 visible range control, found " + all.length);
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(all[0], String(${i}));
    all[0].dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await page.waitForTimeout(700);
};

const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

/**
 * Marker clearance, box-to-box, against every bar on the marker's own line.
 *
 * ⚠️ ONE IMPLEMENTATION, CALLED TWICE. The structural case checks it per width and the sweep below
 * checks it per range; writing the rule out twice is the fault this whole pack is about, and a
 * second copy would be free to drift into the two wrong versions this one already survived.
 *
 * Two earlier versions were wrong in opposite directions. The first measured a gap only where the
 * boxes did NOT intersect, so an overlapping pair was skipped before it was measured — vacuous,
 * excluding exactly the case that fails. The second excused every bar whose span contained the
 * marker's midpoint, on the belief that a marker sits ON its own bar by design. It does not:
 * markers INTERRUPT bars, which is what the 12px gap exists for, so an overlap is a fault wherever
 * it occurs and the midpoint test was the old skip wearing a reason.
 *
 * The 3px halo is contrast against the card surface and never counts as clearance.
 */
const clearanceNow = async (page: import("@playwright/test").Page) =>
  (await page.evaluate(`(() => {
    const mks = [...document.querySelectorAll(".tl-mk2")].filter((m) => m.getBoundingClientRect().width > 0);
    let worst = Infinity; let pairs = 0; const offenders = [];
    for (const m of mks) {
      const mr = m.getBoundingClientRect();
      const lane = m.closest(".tl-c-tl");
      if (!lane) continue;
      for (const b of lane.querySelectorAll(".tl-p")) {
        const br = b.getBoundingClientRect();
        if (br.width <= 0) continue;
        /* the same LINE only — a two-lane row draws two independent journeys */
        if (Math.abs((br.top + br.height / 2) - (mr.top + mr.height / 2)) > 6) continue;
        pairs += 1;
        /* positive where they are apart, negative where they overlap — never skipped */
        const gap = br.left >= mr.right ? br.left - mr.right
          : mr.left >= br.right ? mr.left - br.right
          : -Math.min(mr.right, br.right) + Math.max(mr.left, br.left);
        if (gap < worst) worst = gap;
        if (gap < 1) offenders.push(Math.round(gap * 10) / 10 + "px");
      }
    }
    return { pairs, worst: Number.isFinite(worst) ? Math.round(worst * 10) / 10 : null, offenders };
  })()`)) as { pairs: number; worst: number | null; offenders: string[] };

test.describe("the Calendar — Porcelain", () => {
  for (const width of WIDTHS) {
    test(`painted values, structure and clearance at ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
      await page.waitForTimeout(1200);

      const read = await page.evaluate(TAG + `(() => {
        const out = {};
        const board = vis(".tl-board");
        out.board = !!board;
        /* ── bar families, by painted value ─────────────────────────────────────────────── */
        const bars = [...document.querySelectorAll(".tl-p")].filter((e) => e.getBoundingClientRect().width > 0);
        out.barCount = bars.length;
        const fam = {};
        const fam2Solid = {};
        const fills = {};
        for (const b of bars) {
          const f = ["out","req","decide","remind","quiet","closedp"].find((c) => b.classList.contains(c));
          if (!f) continue;
          /* THE TRACK CLAIM NEEDS A SOLID BAR. A hollow overrun is transparent BY DESIGN, so
             sampling the first bar of a family reports "the track is not white" about a bar that
             is correct - the probe's own monoculture problem, arriving through a STATE rather
             than through a fixture. */
          if (fam2Solid[f] === undefined && !b.classList.contains("hollow")) {
            fam2Solid[f] = getComputedStyle(b).backgroundColor;
          }
          const cs = getComputedStyle(b);
          const lbl = b.querySelector(".tl-plbl");
          const fl = b.querySelector(".tl-fl");
          /* THE TEXT COLOUR IS SAMPLED FROM A BAR THAT HAS A LABEL: a bar whose label the fit
             pass dropped has no label element to read, so taking the FIRST bar of each family
             returned null for two of them - a probe reporting "no colour" about a colour that is
             correct wherever it is painted. (No backticks in here: this comment lives INSIDE a
             template literal, and one backtick ends the string.) */
          if (fam[f] && !fam[f].text && lbl) fam[f].text = getComputedStyle(lbl).color;
          if (!fam[f]) fam[f] = {
            line: cs.borderTopColor, style: cs.borderTopStyle, width: cs.borderTopWidth,
            radius: cs.borderTopLeftRadius, height: cs.height,
            text: lbl ? getComputedStyle(lbl).color : null,
            track: cs.backgroundColor,
            fill: fl ? getComputedStyle(fl).backgroundColor : null,
            fillImage: fl ? getComputedStyle(fl).backgroundImage : null,
            near: b.classList.contains("near"),
          };
          const k = b.dataset.fill;
          fills[k] = (fills[k] || 0) + 1;
        }
        for (const k of Object.keys(fam)) if (fam2Solid[k] !== undefined) fam[k].track = fam2Solid[k];
        out.families = fam;
        out.fillTally = fills;
        /* a bar with no named end paints NO fill element at all */
        out.noGoalBarsWithoutFill = bars.filter((b) => b.dataset.fill === "none")
          .every((b) => !b.querySelector(".tl-fl"));
        out.noGoalCount = bars.filter((b) => b.dataset.fill === "none").length;
        /* the near step, where a seeded span reaches it */
        out.nearBars = bars.filter((b) => b.classList.contains("near")).length;
        out.hollowBars = bars.filter((b) => b.classList.contains("hollow")).length;
        const hollow = bars.find((b) => b.classList.contains("hollow"));
        out.hollow = hollow ? {
          bg: getComputedStyle(hollow).backgroundColor,
          borderStyle: getComputedStyle(hollow).borderTopStyle,
          borderWidth: getComputedStyle(hollow).borderTopWidth,
          labelOpacity: hollow.querySelector(".tl-plbl") ? getComputedStyle(hollow.querySelector(".tl-plbl")).opacity : null,
          hasFill: !!hollow.querySelector(".tl-fl"),
        } : null;
        /* ⚠️ NO BAR MAY CLIP ITS OWN LABEL. The fit pass exists to choose long, short or BARE by
           measurement — an ellipsis is a promise that the rest is somewhere, and on a bar it is
           not. This is the composed result: it cannot be read off either element alone, because
           the label was individually correct and the bar was individually correct and the pair
           was clipped. It caught a real one - the label was an INLINE span, so scrollWidth and
           clientWidth were meaningless, fitLabel was handed a bogus width and always answered
           "long", and five bars at 1440 clipped mid-word through rules that all read correctly. */
        out.clipped = bars.map((b) => {
          const l = b.querySelector(".tl-plbl");
          if (!l || !l.textContent) return null;
          /* INK against the CLIPPING ANCESTOR, never scrollWidth. On an INLINE element
             scrollWidth and clientWidth are both meaningless and happen to be EQUAL, so the
             obvious check passes on exactly the page it was written to catch - proved by
             removing the fix and watching it stay green. A Range gives the real painted ink, and
             the bar is the box that clips it. */
          const r = document.createRange();
          r.selectNodeContents(l);
          const rects = [...r.getClientRects()];
          r.detach && r.detach();
          if (!rects.length) return null;
          const ink = { left: Math.min(...rects.map((x) => x.left)), right: Math.max(...rects.map((x) => x.right)) };
          const box = b.getBoundingClientRect();
          return (ink.right > box.right + 1 || ink.left < box.left - 1) ? l.textContent : null;
        }).filter(Boolean);
        out.labelForms = { long: 0, short: 0, bare: 0 };
        for (const b of bars) {
          const l = b.querySelector(".tl-plbl");
          if (!l || !l.textContent) { out.labelForms.bare += 1; continue; }
          out.labelForms[l.textContent === l.dataset.long ? "long" : "short"] += 1;
        }
        /* ── markers ────────────────────────────────────────────────────────────────────── */
        const mks = [...document.querySelectorAll(".tl-mk2")].filter((e) => e.getBoundingClientRect().width > 0);
        out.markerCount = mks.length;
        const mk = {};
        for (const m of mks) {
          const f = ["in","outk","bang","clock"].find((c) => m.classList.contains(c));
          if (!f || mk[f]) continue;
          const cs = getComputedStyle(m);
          mk[f] = { line: cs.borderTopColor, ink: cs.color, w: cs.width, h: cs.height,
                    radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, bg: cs.backgroundColor };
        }
        out.markers = mk;
        /**
         * MARKER CLEARANCE, TO THE RULING: box-to-box, against EVERY bar in the row, >= 1px.
         *
         * Two earlier versions were wrong in opposite directions. The first measured a gap only
         * where the boxes did NOT intersect, so an overlapping pair was skipped before it was
         * measured — vacuous, excluding exactly the case that fails. The second excused every bar
         * whose span contained the marker's midpoint, on the belief that a marker sits ON its own
         * bar by design. It does not: markers INTERRUPT bars, which is what the 12px GAP exists
         * for, so an overlap is a fault wherever it occurs and the midpoint test was simply the
         * old skip wearing a reason.
         *
         * The 3px halo is contrast against the card surface and never counts as clearance.
         * (No backticks in here: this comment lives inside a template literal.)
         */
        let worst = Infinity; let pairs = 0; const offenders = [];
        for (const m of mks) {
          const mr = m.getBoundingClientRect();
          const lane = m.closest(".tl-c-tl");
          if (!lane) continue;
          for (const b of lane.querySelectorAll(".tl-p")) {
            const br = b.getBoundingClientRect();
            if (br.width <= 0) continue;
            /* the same LINE only — a two-lane row draws two independent journeys */
            if (Math.abs((br.top + br.height / 2) - (mr.top + mr.height / 2)) > 6) continue;
            pairs += 1;
            /* positive where they are apart, negative where they overlap — never skipped */
            const gap = br.left >= mr.right ? br.left - mr.right
              : mr.left >= br.right ? mr.left - br.right
              : -Math.min(mr.right, br.right) + Math.max(mr.left, br.left);
            if (gap < worst) worst = gap;
            if (gap < 1) {
              offenders.push(((m.closest(".tl-rrow").querySelector(".tl-nm2") || {}).textContent || "?")
                .slice(0, 18) + " " + gap.toFixed(1));
            }
          }
        }
        out.markerBarPairs = pairs;
        out.markerOffenders = offenders.slice(0, 12);
        out.markerOffenderCount = offenders.length;
        out.worstClearance = worst === Infinity ? null : +worst.toFixed(2);
        /* ── structure ──────────────────────────────────────────────────────────────────── */
        out.columnHeaders = document.querySelectorAll(".tl-hrow").length;
        out.dateLabels = document.querySelectorAll(".tl-hrow .tl-dt").length;
        out.railDates = document.querySelectorAll(".tl-rail .tl-dt").length;
        out.groupTitles = [...document.querySelectorAll(".tl-gt")].map((g) => ({
          title: (g.querySelector(".t")||{}).textContent || "",
          count: (g.querySelector(".n")||{}).textContent || "",
          sentence: (g.querySelector(".s")||{}).textContent || "",
        }));
        out.gridlines = document.querySelectorAll(".tl-cell, .tl-grid, .tl-dh").length;
        /* ── controls are never pills ───────────────────────────────────────────────────── */
        const btns = [...document.querySelectorAll(".tl-abtn, .tl-seg2 button, .tl-gtbtn")]
          .filter((e) => e.getBoundingClientRect().width > 0);
        out.controlCount = btns.length;
        out.controlRadii = [...new Set(btns.map((b) => getComputedStyle(b).borderTopLeftRadius))];
        out.barRadii = [...new Set(bars.map((b) => getComputedStyle(b).borderTopLeftRadius))];
        const ab = vis(".tl-abtn");
        out.actionBtn = ab ? {
          bg: getComputedStyle(ab).backgroundColor, line: getComputedStyle(ab).borderTopColor,
          ink: getComputedStyle(ab).color, radius: getComputedStyle(ab).borderTopLeftRadius,
          text: ab.textContent,
        } : null;
        out.dashCount = document.querySelectorAll(".tl-adash").length;
        /* ── scrawls ────────────────────────────────────────────────────────────────────── */
        const scr = [...document.querySelectorAll(".tl-scr")];
        out.scrawls = scr.map((s) => s.textContent);
        out.scrawlStyle = scr[0] ? {
          color: getComputedStyle(scr[0]).color,
          family: getComputedStyle(scr[0]).fontFamily,
          size: getComputedStyle(scr[0]).fontSize,
        } : null;
        /* ── today ──────────────────────────────────────────────────────────────────────── */
        const tl = vis(".tl-todayline");
        out.today = tl ? { border: getComputedStyle(tl).borderLeftColor, w: getComputedStyle(tl).borderLeftWidth } : null;
        out.todayFlag = (document.querySelector(".tl-todayflag") || {}).textContent || null;
        /* ── the one tooltip ────────────────────────────────────────────────────────────── */
        out.tooltips = document.querySelectorAll(".tl-tipp").length;
        /* ── nothing animates ───────────────────────────────────────────────────────────── */
        out.animated = [...document.querySelectorAll(".tl-board *")]
          .filter((e) => { const a = getComputedStyle(e).animationName; return a && a !== "none"; }).length;
        return out;
      })()`) as any;

      console.log(`\n══ ${width} ══\n` + JSON.stringify(read, null, 1));

      const unlabelled: string[] = [];
      expect(read.board, "no board").toBe(true);
      expect(read.barCount, "no bars to measure — the sweep proves nothing").toBeGreaterThan(3);

      /* ── the pinned values, exactly ─────────────────────────────────────────────────── */
      for (const [name, want] of Object.entries(FAMILY)) {
        const got = read.families[name];
        if (!got) continue;   /* a family the fixture does not produce is reported, not asserted */
        expect(got.line, `${name} border`).toBe(hex(want.line));
        /* ⚠️ A FAMILY WHOSE LABEL THE FIT PASS DROPPED EVERYWHERE HAS NO TEXT TO SAMPLE, and that
           is a fact about the board's widths rather than about the colour. It is REPORTED rather
           than asserted-on-null, and the census below is what stops the whole set going unchecked
           quietly. */
        if (got.text == null) unlabelled.push(name);
        else expect(got.text, `${name} text`).toBe(hex(want.text));
        expect(got.track, `${name} track is not white`).toBe("rgb(255, 255, 255)");
        if (got.fill) expect([hex(want.fill), hex(want.near)], `${name} fill`).toContain(got.fill);
        expect(got.radius, `${name} is not a pill`).toBe("999px");
        expect(got.height, `${name} height`).toBe("22px");
      }
      console.log(`families whose text could not be sampled at ${width}: ${unlabelled.length ? unlabelled.join(", ") : "none"}`);
      expect(unlabelled.length, `no family carried a label at all: ${unlabelled.join(", ")}`)
        .toBeLessThan(Object.keys(FAMILY).length);
      const seenFamilies = Object.keys(read.families);
      expect(seenFamilies.length, `only one family on the board: ${seenFamilies}`).toBeGreaterThan(1);

      /* ── a bar with no named end paints no fill ─────────────────────────────────────── */
      expect(read.noGoalBarsWithoutFill, "a bar with no named date painted a fill anyway").toBe(true);

      expect(read.clipped, `bars clipping their own labels: ${JSON.stringify(read.clipped)}`).toEqual([]);
      /* ⚠️ AND THE FORMS ARE PRINTED, because a board where every bar went bare would satisfy the
         clipping check for ever. A monoculture wearing a census's clothes. */
      console.log(`label forms at ${width}: ${JSON.stringify(read.labelForms)}`);

      /* ── markers: values, size, and PAINTED clearance ───────────────────────────────── */
      /* ⚠️ ALL FOUR FACES MUST BE ON THE BOARD, or the loop below skips the ones that are not and
         reports nothing about them. `in` and `bang` were absent from every fixture for two packs
         and the sweep said so in prose rather than in a failure; they are seeded now, and this is
         what stops them going missing again. */
      const facesSeen = Object.keys(read.markers).sort();
      console.log(`marker faces at ${width}: ${facesSeen.join(", ")}`);
      expect(facesSeen, "a marker face is not on the board — seed it or the sweep skips it")
        .toEqual(["bang", "clock", "in", "outk"]);
      for (const [name, want] of Object.entries(MARKER)) {
        const got = read.markers[name];
        if (!got) continue;
        expect(got.line, `${name} ring`).toBe(hex(want.line));
        expect(got.ink, `${name} ink`).toBe(hex(want.ink));
        expect(got.w, `${name} size`).toBe("20px");
        expect(got.radius, `${name} is not a circle`).toBe("999px");
        expect(got.shadow, `${name} has no halo`).toContain("3px");
      }
      /* ⚠️ THE POPULATION FIRST, then the property — the repaired sweep must actually be finding
         neighbouring pairs, or a clean result means it measured nothing. */
      console.log(`markers at ${width}: ${read.markerBarPairs} marker/bar pairs in row, `
        + `worst gap ${read.worstClearance}, ${read.markerOffenderCount} under 1px`
        + (read.markerOffenderCount ? ` — ${read.markerOffenders.join(", ")}` : ""));
      expect(read.markerBarPairs, "no neighbouring marker/bar pair — the sweep proves nothing")
        .toBeGreaterThan(0);
      /* ⚠️ AN ASSERTION NOW, NOT ONLY A CENSUS — the ruling settled the definition the earlier
         version said it lacked. A marker must be clear of EVERY bar in its own row, including the
         segments it joins, by at least 1px box-to-box. The census stays beside it, printing its
         distinct values, because a clean number over an empty set proves nothing. */
      expect(read.worstClearance, `${read.markerOffenderCount} marker/bar pairs under 1px: `
        + JSON.stringify(read.markerOffenders)).toBeGreaterThanOrEqual(1);

      /* ── structure ──────────────────────────────────────────────────────────────────── */
      /* ⚠️ THE DATE ROW IS THE RAIL NOW, AND THE CLAIM IS STRONGER FOR IT (v36, Phase 4). This
         asserted "exactly one `.tl-hrow` in the document", which was the best available guarantee
         while the row lived inside the first group's card — one card had it and the rest did not,
         and it scrolled away with that card. There are ZERO in-card headers now: the rail is the
         page's own, sticky above every group, and the alignment lock proves its ticks land on the
         same pixels as the lanes. */
      expect(read.columnHeaders, "an in-card date row came back").toBe(0);
      expect(read.railDates, "the rail's dates").toBeGreaterThan(5);
      expect(read.railDates, "too many dates to scan").toBeLessThan(14);
      expect(read.gridlines, "the day grid came back").toBe(0);
      const withSentence = read.groupTitles.filter((g: any) => g.sentence.trim().length > 0);
      expect(withSentence.length, "groups without a sentence").toBeGreaterThan(2);

      /* ── PILLS ARE DATA, CONTROLS ARE NOT PILLS ─────────────────────────────────────── */
      expect(read.controlRadii, `a control is drawn as a pill: ${read.controlRadii}`).not.toContain("999px");
      expect(read.barRadii, `a bar lost its pill: ${read.barRadii}`).toEqual(["999px"]);

      /* ── the pulse is gone ──────────────────────────────────────────────────────────── */
      expect(read.animated, "something on the board still animates").toBe(0);

      /* ── one tooltip, portalled ─────────────────────────────────────────────────────── */
      expect(read.tooltips, "the tooltip is not a single portalled element").toBe(1);

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });
  }

  test("the retired values are absent from the served bundle", async () => {
    const dist = join(process.cwd(), "dist/assets");
    const { readdirSync } = await import("node:fs");
    const js = readdirSync(dist).filter((f) => f.endsWith(".js"));
    const css = readdirSync(dist).filter((f) => f.endsWith(".css"));
    const all = [...js, ...css].map((f) => readFileSync(join(dist, f), "utf8")).join("");
    /* ⚠️ THE YELLOW AND THE BLUE. Neither had a code token, so "read the colour out of the code"
       meant "invent one" — and what got invented was a yellow reminder band and a blue decide bar
       on a board with no other yellow and no other blue. */
    for (const h of ["#c6d2e0", "#f6ecd2", "#cbd9e8", "#fff8e5"]) {
      expect(all.toLowerCase().includes(h), `${h} is still in the bundle`).toBe(false);
    }
  });

  test("RIGHT NOW is a filter of the one board, not a second board", async ({ page }) => {
    await openRoute(page, "/todo/calendar", { width: 1440, height: HEIGHT });
    await page.waitForTimeout(1000);
    const keys = () => page.evaluate(`
      [...document.querySelectorAll(".tl-rrow")].map((r) => (r.querySelector(".tl-nm2")||{}).textContent || "?")
    `) as Promise<string[]>;
    const before = await keys();
    /* ⚠️ ADDRESSED BY ROLE, never by class or coordinate */
    await page.getByRole("button", { name: "RIGHT NOW" }).click();
    await page.waitForTimeout(400);
    const narrowed = await keys();
    await page.getByRole("button", { name: "FULL BOARD" }).click();
    await page.waitForTimeout(400);
    const after = await keys();
    console.log(`FULL ${before.length} → RIGHT NOW ${narrowed.length} → FULL ${after.length}`);
    /* ⚠️ BY IDENTITY, NOT BY COUNT. Two lists of the same length can name different rows — which
       is exactly how the `Upcoming only` dedupe leak survived: the count agreed and the contents
       did not. */
    expect(after, "the round trip did not restore the same rows").toEqual(before);
    expect(narrowed.length, "RIGHT NOW showed the whole board").toBeLessThanOrEqual(before.length);
    for (const n of narrowed) expect(before, `${n} appeared only in RIGHT NOW`).toContain(n);
  });
});

/* ══ THE FIX PACK'S OWN CLAIMS (Phase 7) ═════════════════════════════════════════════════════ */

test.describe("the fix pack — one fact, one function", () => {
  const HEIGHT2 = 900;
  for (const width of [1280, 1440, 1920]) {
    test(`composed rows at ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      await openRoute(page, "/todo/calendar", { width, height: HEIGHT2 });
      await page.waitForTimeout(1400);

      const r = await page.evaluate(`(() => {
        const out = {};
        const rows = [...document.querySelectorAll(".tl-rrow")];
        out.rows = rows.map((row) => {
          const grp = row.closest(".tl-grp");
          const nm = row.querySelector(".tl-nm2");
          const ag = row.querySelector(".tl-ag2");
          const nmR = nm ? nm.getBoundingClientRect() : null;
          const agR = ag ? ag.getBoundingClientRect() : null;
          return {
            group: grp ? (grp.querySelector(".tl-gt .t") || {}).textContent : null,
            name: nm ? nm.textContent : null,
            agency: ag ? ag.textContent : null,
            nameBottom: nmR ? nmR.bottom : null,
            agencyTop: agR ? agR.top : null,
            bars: [...row.querySelectorAll(".tl-p")].map((b) => {
              const fl = b.querySelector(".tl-fl");
              const lbl = b.querySelector(".tl-plbl");
              return {
                fam: ["out","req","decide","remind","quiet","closedp"].find((c) => b.classList.contains(c)) || "?",
                near: b.classList.contains("near"),
                hollow: b.classList.contains("hollow"),
                fill: b.dataset.fill,
                fillPaint: fl ? getComputedStyle(fl).backgroundColor : null,
                label: lbl ? lbl.textContent : "",
                labelOpacity: lbl ? getComputedStyle(lbl).opacity : null,
              };
            }),
            btn: row.querySelector(".tl-abtn") ? row.querySelector(".tl-abtn").textContent : null,
            dash: !!row.querySelector(".tl-adash"),
            scrawl: row.querySelector(".tl-scr") ? row.querySelector(".tl-scr").textContent : null,
            chips: [...row.querySelectorAll(".tl-tchip")].map((c) => c.textContent),
          };
        });
        const flag = document.querySelector(".tl-todayflag");
        const line = document.querySelector(".tl-todayline");
        const gt = document.querySelector(".tl-gt .t");
        const fr = flag ? flag.getBoundingClientRect() : null;
        out.flagBottom = fr ? fr.bottom : null;
        out.flagCentre = fr ? (fr.left + fr.right) / 2 : null;
        out.flagText = flag ? flag.textContent : null;
        out.lineX = line ? line.getBoundingClientRect().left : null;
        out.firstTitleTop = gt ? gt.getBoundingClientRect().top : null;
        return out;
      })()`) as any;

      const rows: any[] = r.rows;
      console.log(`\n── fix pack ${width} ──`);
      for (const x of rows) {
        const fams = x.bars.map((b: any) => `${b.fam}${b.hollow ? "*" : ""}${b.near ? "~" : ""}`).join("|");
        console.log(` ${String(x.group).slice(0, 18).padEnd(18)} ${String(x.name).slice(0, 24).padEnd(24)} btn=${String(x.btn).slice(0, 18).padEnd(18)} [${fams}]`);
      }

      /* ── P1 · a same-holder run never alternates families, ON THE PAGE ────────────────── */
      const AGENT_FAMS = ["out", "quiet", "remind"];
      for (const x of rows) {
        for (let i = 1; i < x.bars.length; i += 1) {
          const a = x.bars[i - 1].fam; const b = x.bars[i].fam;
          const sameHolder = AGENT_FAMS.includes(a) === AGENT_FAMS.includes(b);
          if (sameHolder && a !== b) {
            /* only the LIVE stretch may differ within a holder — it is the last piece */
            expect(i, `${x.name} alternates families: ${x.bars.map((z: any) => z.fam).join("|")}`)
              .toBe(x.bars.length - 1);
          }
        }
      }

      /* ── P4 · every row in an asking group has exactly one button ─────────────────────── */
      const ASKING = ["Your tasks", "Offer on the table", "Needs you now"];
      const asking = rows.filter((x) => ASKING.includes(x.group));
      expect(asking.length, "no asking rows to check").toBeGreaterThan(2);
      for (const x of asking) {
        expect(x.btn, `${x.group} / ${x.name} has no deed`).not.toBeNull();
        expect(x.dash, `${x.group} / ${x.name} shows a dash as well`).toBe(false);
      }
      /* the offer's own deed, and a watching row's dash */
      const offer = rows.find((x) => x.group === "Offer on the table");
      if (offer) expect(offer.btn!.toUpperCase()).toContain("ANSWER");
      const watching = rows.filter((x) => x.group === "Watching brief");
      expect(watching.length, "nothing in the watching brief").toBeGreaterThan(0);
      for (const x of watching) expect(x.btn, `${x.name} was asked for a deed`).toBeNull();

      /* ── P5 · tasks are rows ──────────────────────────────────────────────────────────── */
      const tasks = rows.filter((x) => x.group === "Your tasks");
      expect(tasks.length, "no task rows").toBeGreaterThan(0);
      for (const x of tasks) {
        expect(x.agency).toBe("Your task");
        expect(x.btn, "a task row has no TICK IT OFF").toContain("TICK IT OFF");
        /* ⚠️ NAMED FOR ITS HISTORY: the chip must carry the title or a barFit form of it, never
           an interior truncation. `o'r` was a fragment of a title, whatever produced it. */
        for (const c of x.chips) {
          expect(c.length, `chip "${c}" is a fragment`).toBeGreaterThan(3);
          expect(c, `chip "${c}" is an interior truncation`).not.toMatch(/^[a-z]?['’][a-z]$/);
        }
      }

      /* ── P6 · the row head STACKS ─────────────────────────────────────────────────────── */
      const stacked = rows.filter((x) => x.agencyTop != null && x.nameBottom != null);
      expect(stacked.length, "no row with both lines").toBeGreaterThan(3);
      for (const x of stacked) {
        expect(x.agencyTop, `${x.name}: the agency sits inside the name's line box`)
          .toBeGreaterThanOrEqual(x.nameBottom - 1);
      }

      /* ── P6 · the flag is clear of the first group title ──────────────────────────────── */
      expect(r.flagText, "no today flag").not.toBeNull();
      expect(r.firstTitleTop - r.flagBottom, "the today flag crowds the first group title")
        .toBeGreaterThan(6);
      /* ⚠️ CENTRED ON ITS OWN RULE BY `translateX(-50%)`, never by an offset anyone has to keep in
         step with the flag's width — which changes with the date it prints. */
      expect(Math.abs(r.flagCentre - r.lineX), "the flag is not centred on the today rule")
        .toBeLessThan(2);

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });
  }

  test("the seeded fixtures are on the board, and the sweep can see them", async ({ page }) => {
    await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
    await page.waitForTimeout(1400);
    const r = await page.evaluate(`(() => {
      const out = { near: null, hollowLabelled: null, passed: 0, tally: {} };
      for (const b of document.querySelectorAll(".tl-p")) {
        const fl = b.querySelector(".tl-fl");
        const lbl = b.querySelector(".tl-plbl");
        const fam = ["out","req","decide","remind","quiet","closedp"].find((c) => b.classList.contains(c)) || "?";
        out.tally[fam] = (out.tally[fam] || 0) + 1;
        if (b.classList.contains("near") && !out.near) {
          out.near = { fam, paint: fl ? getComputedStyle(fl).backgroundColor : null, fill: b.dataset.fill };
        }
        if (b.classList.contains("hollow")) {
          out.passed += 1;
          if (lbl && lbl.textContent && !out.hollowLabelled) {
            out.hollowLabelled = {
              text: lbl.textContent, opacity: getComputedStyle(lbl).opacity,
              bg: getComputedStyle(b).backgroundColor,
              borderStyle: getComputedStyle(b).borderTopStyle,
            };
          }
        }
      }
      return out;
    })()`) as any;
    console.log("FIXTURES " + JSON.stringify(r, null, 1));

    /* ⚠️ THE NEAR STEP, PAINTED. The last run had to report this "not exercised" — nothing on the
       account sat between 85% and 100%. A seeded 13-day wait against a 14-day window does. */
    expect(r.near, "no bar reached the near step — the fixture is not on the board").not.toBeNull();
    expect(Number(r.near.fill)).toBeGreaterThanOrEqual(85);
    expect(Number(r.near.fill)).toBeLessThan(100);
    const DEEP: Record<string, string> = {
      out: "rgb(215, 224, 210)", req: "rgb(236, 201, 184)",
      decide: "rgb(226, 176, 154)", remind: "rgb(223, 230, 220)",
    };
    expect(r.near.paint, `the near step painted ${r.near.paint} for ${r.near.fam}`)
      .toBe(DEEP[r.near.fam]);

    /* ⚠️ AND THE HOLLOW OVERRUN'S LABEL, computed. Also "not exercised" last time. */
    expect(r.passed, "no hollow overrun on the board").toBeGreaterThan(0);
    expect(r.hollowLabelled, "no hollow stretch carries a label").not.toBeNull();
    expect(r.hollowLabelled.opacity).toBe("0.75");
    expect(r.hollowLabelled.bg, "a hollow stretch is filled").toBe("rgba(0, 0, 0, 0)");
    expect(r.hollowLabelled.borderStyle).toBe("solid");

    /* the distinct families seen — a monoculture would satisfy every check above */
    expect(Object.keys(r.tally).length, `only one family: ${JSON.stringify(r.tally)}`).toBeGreaterThan(2);
  });

  test("⚠️ the scrawl and the fill name the SAME date, on every row that names one", async ({ page }) => {
    await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
    await page.waitForTimeout(1400);
    const r = await page.evaluate(`(() => {
      const DATE = /\\b(\\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Oct|Nov|Dec)\\b/g;
      const out = [];
      for (const row of document.querySelectorAll(".tl-rrow")) {
        const scr = row.querySelector(".tl-scr");
        const bars = [...row.querySelectorAll(".tl-p")];
        const goals = [...new Set(bars.map((b) => b.dataset.fill).filter((f) => f && f !== "none"))];
        /* ⚠️ PER LANE, NOT PER ROW. A row is a RELATIONSHIP and can hold several queries — Tom
           Ellery holds two, on two lanes, with two legitimately different named ends. Comparing
           across the row would demand that two separate journeys agree about a date neither of
           them shares, which is not a contradiction but a row doing its job. */
        const byLane = {};
        for (const b of bars) {
          const lane = getComputedStyle(b).getPropertyValue("--lane").trim() || "0";
          const tip = b.getAttribute("data-tip") || "";
          if (!tip) continue;
          (byLane[lane] = byLane[lane] || []).push(tip);
        }
        for (const lane of Object.keys(byLane)) {
          const tips = [...new Set(byLane[lane])];
          out.push({
            name: ((row.querySelector(".tl-nm2") || {}).textContent || "?") + " lane " + lane,
            scrawl: scr ? scr.textContent : null,
            tips,
            hasFillTarget: goals.length > 0,
            tipDates: tips.map((t) => (t.match(DATE) || [])),
          });
        }
      }
      return out;
    })()`) as any[];
    let checked = 0;
    for (const row of r) {
      /* ⚠️ A CAPTION MAY NAME TWO DATES — a span has a start and an end, and "Out since 25 Jun ·
         reply expected 20 Aug" is one sentence saying both. What it may NOT do is name a
         different END from every other caption on its own row: that is the contradiction this
         pack found live, where one bar's label said "next reminder 8 Sept" and its own tooltip
         appended "16 Sept". So the LAST date in each caption — the end — must agree across the
         row. */
      const ends = [...new Set((row.tipDates as string[][]).map((ds) => ds[ds.length - 1]).filter(Boolean))];
      expect(ends.length, `${row.name}: the row's captions end on ${ends.length} different dates — ${JSON.stringify(row.tips)}`)
        .toBeLessThanOrEqual(1);
      if (ends.length) checked += 1;
      /* a row whose scrawl names a date must have something to fill toward */
      if (row.scrawl && /\d/.test(row.scrawl)) {
        expect(row.hasFillTarget, `${row.name} scrawls "${row.scrawl}" with no fill target`).toBe(true);
      }
    }
    console.log(`captions carrying a date: ${checked}`);
    expect(checked, "no caption named a date — the sweep proves nothing").toBeGreaterThan(2);
  });
});

/* ══ THE HONEST FILL, PAINTED (v36, Phase 2) ═════════════════════════════════════════════════ */

test("⚠️ a fill ratio is the same number at every range — the board is not guessing", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 950 });
  await page.waitForTimeout(1200);

  /* ⚠️ THE VISIBLE RANGE CONTROL. Every workspace page stays MOUNTED, so a bare querySelector
     returns a hidden page's copy — the dispatch then changes nothing and the probe reports three
     identical readings for three different ranges without erroring. That happened; it is why this
     throws rather than guards. */
  const setRange = (i: number) => setRangeTo(page, i);

  /* ⚠️ READ THE PAINTED WIDTH RATIO, not the data attribute. `data-fill` is what the code THINKS;
     the child's width against its parent's is what the reader sees, and the two are only the same
     thing if the element was drawn from the number. */
  /**
   * ⚠️ THE REPORTED NUMBER, AND WHAT IT STILL GOVERNS — REWRITTEN, BECAUSE ITS SECOND HALF WAS A
   * TAUTOLOGY AND ITS SUBJECT HAS SINCE CHANGED.
   *
   * It used to assert that the fill element was "drawn FROM the number" by comparing
   * `fl.style.width` against `data-fill`. Both were one `fillFor` call written into two attributes
   * by one JSX expression, so the check could only fail if someone wired two different numbers
   * into the same element — never for any real defect. Its own docstring reasoned its way there
   * honestly (comparing rects IS defeated by `box-sizing: border-box` and a 1px border) and landed
   * on something unfalsifiable.
   *
   * The fill no longer draws from the number at all — its edge is a date, mapped like every other
   * date on the board — so that half is not merely weak now, it is describing something that has
   * deliberately stopped being true. What the number still governs is the NEAR step: at or past
   * 85% a bar deepens. That is a painted colour, so the reported number and the paint can
   * genuinely disagree, and both branches are asserted with their populations.
   */
  const ratios = async () => page.evaluate(`(() => {
    const out = {};
    for (const row of document.querySelectorAll(".tl-rrow")) {
      const nm = (row.querySelector(".tl-nm2") || {}).textContent;
      /* ⚠️ THE STRETCH THAT SAYS IT IS LIVE. Geometry cannot name the same piece twice: a row is
         cut into a different number of pieces at each range, so "the last one", "the one
         containing today" and "the one whose edge is nearest today" each selected a DIFFERENT
         segment at each reading — all three were tried, and all three reported swings of fifty
         points on rows that had never been clipped. A range-invariance check that changes its
         subject between readings measures its own selection. */
      const b = row.querySelector('.tl-p[data-live="1"]');
      const fl = b ? b.querySelector(".tl-fl") : null;
      if (!b || !fl) continue;
      const said = Number(b.dataset.fill);
      if (!Number.isFinite(said)) continue;
      /* what the number GOVERNS, now that it no longer draws: the near step, which is a painted
         colour and can therefore disagree with it */
      out[nm] = { said, near: b.classList.contains("near"), fillPaint: getComputedStyle(fl).backgroundColor };
    }
    return out;
  })()`) as Promise<Record<string, { said: number; near: boolean; fillPaint: string }>>;

  const seen: Record<string, number[]> = {};
  const stepGap: string[] = [];
  let nearSeen = 0;
  let farSeen = 0;
  for (const i of [0, 1, 2]) {
    await setRange(i);
    const r = await ratios();
    for (const [k, v] of Object.entries(r)) {
      (seen[k] = seen[k] || []).push(v.said);
      /* the number governs the near step, in both directions */
      const shouldBeNear = v.said >= 85 && v.said < 100;
      if (shouldBeNear) nearSeen++; else farSeen++;
      if (shouldBeNear !== v.near) {
        stepGap.push(`${k} says ${v.said}% and ${v.near ? "wears" : "does not wear"} the near step`);
      }
    }
  }
  const across = Object.entries(seen).filter(([, v]) => v.length === 3);
  console.log("reported fill at 1m / 3m / 6m:");
  for (const [k, v] of across) console.log(`  ${k.padEnd(24)} ${v.join(" / ")}%`);

  expect(across.length, "no row carried a live fill at all three ranges").toBeGreaterThan(2);
  /* ⚠️ BOTH BRANCHES, OR THE CLAIM IS ABOUT WHICHEVER ONE THE FIXTURE HAPPENS TO HOLD. A sweep in
     which every bar is under 85% proves nothing about the step and passes. */
  expect(nearSeen, "no bar is at or past the near step — that branch was never exercised").toBeGreaterThan(0);
  expect(farSeen, "every bar is at the near step — the other branch was never exercised").toBeGreaterThan(0);
  expect(stepGap, `the reported number and the near step disagree: ${stepGap.join(" | ")}`).toEqual([]);
  for (const [k, v] of across) {
    expect(Math.max(...v) - Math.min(...v), `${k} reported ${v.join(" / ")}% at three ranges`)
      .toBeLessThanOrEqual(1);
  }
});

/* ══ DEEDS, GROUPS AND THE COUNT (v36, Phase 7) ══════════════════════════════════════════════ */

test("every asking row names what is owed, and the count says what it counts", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 950 });
  await page.waitForTimeout(1300);

  const r = await page.evaluate(`(() => {
    const ASKING = ["Your tasks", "Offer on the table", "Needs you now"];
    const out = { asking: [], soon: [], count: null, groups: [] };
    for (const g of document.querySelectorAll(".tl-grp")) {
      const title = (g.querySelector(".tl-gt .t") || {}).textContent || "";
      out.groups.push(title);
      for (const row of g.querySelectorAll(".tl-rrow")) {
        const rec = {
          group: title,
          name: (row.querySelector(".tl-nm2") || {}).textContent || "?",
          buttons: [...row.querySelectorAll(".tl-abtn")].map((b) => b.textContent),
          dash: !!row.querySelector(".tl-adash"),
        };
        if (ASKING.includes(title)) out.asking.push(rec);
        if (title === "Needs you soon") out.soon.push(rec);
      }
    }
    const c = document.querySelector(".tl-count");
    out.count = c ? c.textContent.trim() : null;
    return out;
  })()`) as any;

  console.log("groups: " + JSON.stringify(r.groups));
  console.log("count:  " + r.count);
  console.log("asking rows: " + r.asking.length + ", soon rows: " + r.soon.length);

  expect(r.asking.length, "no asking rows — the sweep proves nothing").toBeGreaterThan(2);
  for (const x of r.asking) {
    /* ⚠️ EXACTLY ONE BUTTON, and never the generic. "Open the query" occupied the one place on the
       row meant to say what is owed and said nothing — a dash wearing a costume. */
    expect(x.buttons.length, `${x.group} / ${x.name} has ${x.buttons.length} buttons`).toBe(1);
    expect(x.dash, `${x.group} / ${x.name} shows a dash as well`).toBe(false);
    expect(x.buttons[0].toLowerCase(), `${x.group} / ${x.name} renders the generic`)
      .not.toContain("open the query");
  }

  /* ⚠️ A REMINDER THAT HAS NOT FALLEN DUE IS NOT AN ASK. `Needs you soon` is its home, with a
     dash — nothing is being asked of the writer yet, and a button there would invent one.
     ⚠️ AND THE POPULATION IS ASSERTED, because the board carried NO such row until one was seeded
     and the loop below reported nothing while passing. A check that reports on nothing must fail
     loudly. */
  expect(r.soon.length, "no row in Needs you soon — the future-reminder claim is unexercised")
    .toBeGreaterThan(0);
  for (const x of r.soon) {
    expect(x.buttons.length, `${x.name} is asked for a deed in Needs you soon`).toBe(0);
    expect(x.dash, `${x.name} shows no dash in Needs you soon`).toBe(true);
  }

  /* ⚠️ TWO NOUNS OVER TWO SETS. A task row is not a relationship, and one noun counting both is a
     tally describing something other than what it counted. */
  /* ⚠️ GROUP ORDER IS LAW AND NEVER SORTS. `GROUP_ORDER` is the reading order of the board —
     offers before what needs you, what needs you before what is merely out — and a sort key able
     to lift a watching row above an offer would be a second opinion about urgency competing with
     the headings. The sort orders rows WITHIN a group; the page orders the groups. */
  const LAW = ["Your tasks", "Offer on the table", "Needs you now", "Needs you soon",
    "Watching brief", "Snoozed", "Recently closed"];
  const ranks = r.groups.map((g: string) => LAW.indexOf(g));
  expect(ranks.every((x: number) => x >= 0), `an unknown group heading: ${JSON.stringify(r.groups)}`).toBe(true);
  expect(ranks, `the groups rendered out of order: ${JSON.stringify(r.groups)}`)
    .toEqual([...ranks].sort((a: number, b: number) => a - b));

  expect(r.count, "no count rendered").not.toBeNull();
  expect(r.count).toMatch(/^\d+ RELATIONSHIPS?( · \d+ TASKS?)?$/);
  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

/* ══ ORDERING AND THE GHOST, ON THE PAINTED BOARD (v36 part two, Phase 1) ════════════════════ */

test("⚠️ the painted order matches the painted key, and the key matches the row's own words", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const groups = await page.evaluate(`(() => {
    const out = [];
    for (const g of document.querySelectorAll(".tl-grp")) {
      const title = (g.querySelector(".tl-gt .t") || {}).textContent || "";
      const rows = [...g.querySelectorAll(".tl-rrow")].map((r) => ({
        name: ((r.querySelector(".tl-nm2") || {}).textContent || "?").slice(0, 30),
        key: r.dataset.pressing,
        top: Math.round(r.getBoundingClientRect().top),
        tips: [...new Set([...r.querySelectorAll(".tl-p")].map((b) => b.getAttribute("data-tip") || "").filter(Boolean))],
      }));
      if (rows.length) out.push({ title, rows });
    }
    return out;
  })()`) as any[];

  let checked = 0;
  for (const g of groups) {
    /* ⚠️ THE PAINTED ORDER, read from the rows' own tops — not the array order, which is what a
       seeded case would have compared and is not what a reader sees. */
    const byTop = [...g.rows].sort((a: any, b: any) => a.top - b.top);
    const keys = byTop.filter((r: any) => r.key && r.key !== "none").map((r: any) => Number(r.key));
    if (keys.length < 2) continue;
    checked += 1;
    const sorted = [...keys].sort((a, b) => a - b);
    expect(keys, `${g.title} is painted out of key order: `
      + JSON.stringify(byTop.map((r: any) => [r.name, r.key]))).toEqual(sorted);
  }
  /* ⚠️ THE POPULATION, because a board of one-row groups would satisfy every loop above. */
  expect(checked, "no group had two keyed rows — the sweep proves nothing").toBeGreaterThan(0);

  /**
   * ⚠️ AND THE KEY MUST AGREE WITH THE ROW'S OWN WORDS. This is the assertion the seeded lock
   * could not make and the one the defect hid behind: `pressingAt` minimised over ALL an agent's
   * live queries while the row DRAWS one per manuscript, so a row sorted on a date it did not
   * show. Every key was ascending and the board was still wrong. Measured before the fix: Rachel
   * Lin keyed 2026-08-07 beside her own bar reading "reply expected 29 Sept".
   */
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  let agreed = 0;
  for (const g of groups) {
    for (const r of g.rows) {
      if (!r.key || r.key === "none" || !r.tips.length) continue;
      const d = new Date(Number(r.key));
      const stamp = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      /* the key's date must appear in at least one of the row's own captions */
      const said = r.tips.some((t: string) => t.includes(stamp));
      if (said) agreed += 1;
      else {
        expect(said, `${r.name} sorts on ${stamp} but its own bars say ${JSON.stringify(r.tips)}`).toBe(true);
      }
    }
  }
  console.log(`rows whose key their own bars state: ${agreed}`);
  expect(agreed, "no row's key could be checked against its words").toBeGreaterThan(4);
});

test("⚠️ a ghost chip is an origin, not a duplicate", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const rows = await page.evaluate(`(() => {
    const out = [];
    for (const row of document.querySelectorAll(".tl-rrow")) {
      const cs = [...row.querySelectorAll(".tl-tchip")];
      if (cs.length < 2) continue;
      out.push({
        name: ((row.querySelector(".tl-nm2") || {}).textContent || "?").slice(0, 30),
        chips: cs.map((c) => {
          const s = getComputedStyle(c);
          return {
            ghost: c.classList.contains("ghost"),
            border: s.borderTopStyle, bg: s.backgroundColor, ink: s.color,
            left: Math.round(c.getBoundingClientRect().left),
          };
        }),
      });
    }
    return out;
  })()`) as any[];

  /* ⚠️ THE POPULATION FIRST. The board carried no carried task at all until one was seeded, so
     this loop ran over an empty set and passed — a check that reports on nothing. */
  expect(rows.length, "no row carries two chips — seed a carried task or this proves nothing")
    .toBeGreaterThan(0);
  for (const r of rows) {
    const ghosts = r.chips.filter((c: any) => c.ghost);
    const live = r.chips.filter((c: any) => !c.ghost);
    expect(ghosts.length, `${r.name}: two chips and neither is a ghost`).toBeGreaterThan(0);
    expect(live.length, `${r.name}: no live chip`).toBeGreaterThan(0);
    /* the pair must be TOLD APART by paint, not by a class nobody can see */
    for (const gh of ghosts) {
      expect(gh.border, `${r.name}: the ghost is drawn solid like its live twin`).toBe("dashed");
      expect(gh.bg, `${r.name}: the ghost is filled like its live twin`).toBe("rgba(0, 0, 0, 0)");
      for (const lv of live) {
        expect(gh.ink, `${r.name}: ghost and live share one ink`).not.toBe(lv.ink);
        expect(gh.border, `${r.name}: ghost and live share one border`).not.toBe(lv.border);
      }
    }
    /* and the ghost is BEHIND the live one — it is where the task fell due */
    expect(Math.min(...ghosts.map((c: any) => c.left)))
      .toBeLessThan(Math.min(...live.map((c: any) => c.left)));
  }
});

/* ══ SURFACE, BAR CENTRING AND THE PAST WASH (v36 part two, Phases 3 and 5) ══════════════════ */

test("the surface is the pinned one, and the heading is not inside the card", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(`(() => {
    const board = [...document.querySelectorAll(".tl-board")].find((e) => e.getBoundingClientRect().height > 0);
    const card = document.querySelector(".tl-tbl");
    const head = document.querySelector(".tl-gt");
    const row = document.querySelector(".tl-rrow");
    const nm = document.querySelector(".tl-c-nm");
    const ac = document.querySelector(".tl-c-ac");
    const cs = (e) => (e ? getComputedStyle(e) : null);
    return {
      ground: cs(board).backgroundColor,
      card: { bg: cs(card).backgroundColor, border: cs(card).borderTopColor,
              w: cs(card).borderTopWidth, radius: cs(card).borderTopLeftRadius },
      /* the heading must NOT be inside the card it names */
      headInCard: !!(head && head.closest(".tl-tbl")),
      sep: cs(row).borderTopColor,
      nmW: Math.round(nm.getBoundingClientRect().width),
      acW: Math.round(ac.getBoundingClientRect().width),
      /* ── the bar's text is centred by flex, and its box centre matches the bar's ── */
      hiddenBars: [...document.querySelectorAll(".tl-p")]
        .filter((b) => getComputedStyle(b).display === "none").length,
      bars: [...document.querySelectorAll(".tl-p")].map((b) => {
        /* a piece with no room to draw is hidden outright (see the fit pass) — it has no box and
           no centre, so it is COUNTED above rather than measured here */
        if (getComputedStyle(b).display === "none") return null;
        const lbl = b.querySelector(".tl-plbl");
        if (!lbl || !lbl.textContent) return null;
        const br = b.getBoundingClientRect();
        const lr = lbl.getBoundingClientRect();
        return {
          drift: +(((lr.top + lr.bottom) / 2) - ((br.top + br.bottom) / 2)).toFixed(2),
          display: getComputedStyle(b).display,
          align: getComputedStyle(b).alignItems,
        };
      }).filter(Boolean),
      /* ── row head stacked ── */
      heads: [...document.querySelectorAll(".tl-rrow")].map((row2) => {
        const n = row2.querySelector(".tl-nm2");
        const a = row2.querySelector(".tl-ag2");
        if (!n || !a) return null;
        return { nameBottom: n.getBoundingClientRect().bottom, agencyTop: a.getBoundingClientRect().top };
      }).filter(Boolean),
    };
  })()`) as any;

  console.log(`ground ${r.ground} · card ${r.card.bg} ${r.card.w} ${r.card.border} r${r.card.radius}`);
  console.log(`columns ${r.nmW} / ${r.acW} · bars measured ${r.bars.length}, hidden ${r.hiddenBars}`);

  expect(r.ground, "the page ground").toBe("rgb(250, 247, 242)");
  expect(r.card.bg, "the card").toBe("rgb(247, 240, 230)");
  expect(r.card.border, "the card's border").toBe("rgb(239, 230, 218)");
  expect(r.card.w).toBe("1px");
  expect(r.card.radius).toBe("11px");
  expect(r.sep, "the row separator").toBe("rgb(238, 228, 214)");
  expect(r.headInCard, "a group heading is inside the card it names").toBe(false);
  expect(r.nmW, "the name column").toBe(288);
  expect(r.acW, "the action column").toBe(172);

  /* ⚠️ THE TEXT IS CENTRED BY FLEX, and the painted centres are what proves it — a `line-height`
     equal to the bar's height centres one line at one size and drifts at any other, with the rule
     still reading correctly. */
  expect(r.bars.length, "no labelled bar to measure — the sweep proves nothing").toBeGreaterThan(2);
  for (const b of r.bars) {
    expect(b.display).toBe("flex");
    expect(b.align).toBe("center");
    expect(Math.abs(b.drift), `a bar's text sits ${b.drift}px off its centre`).toBeLessThanOrEqual(1);
  }

  /* ⚠️ `agencyTop >= nameBottom`, never merely that the tops differ — two inline spans of
     different sizes have different tops while sitting on ONE baseline, which is exactly the state
     this assertion exists to reject. */
  expect(r.heads.length, "no row with both lines").toBeGreaterThan(3);
  for (const h of r.heads) {
    expect(h.agencyTop, "the agency sits inside the name's line box").toBeGreaterThanOrEqual(h.nameBottom - 1);
  }
  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

/**
 * Read the composited paint either side of the today line, from a screenshot the BROWSER decodes.
 *
 * ⚠️ A COMPUTED STYLE CANNOT SEE AN OVERLAY, WHICH IS THE WHOLE REASON THIS EXISTS.
 * `getComputedStyle(el).backgroundColor` returns what the stylesheet DECLARES, identically whether
 * or not a wash is painted on top of it — so the one assertion that used to stand for "the wash is
 * not on the data" could never have failed. Canvas gives the real pixel, and comparing a real
 * pixel against a declared value is a composed claim that can.
 */
const sample = async (page: import("@playwright/test").Page, shot: string) =>
  (await page.evaluate(
    `(async (b64) => {
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = "data:image/png;base64," + b64; });
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      const ctx = cv.getContext("2d");
      /* the shot is in DEVICE pixels and every rect is in CSS pixels */
      const k = img.naturalWidth / window.innerWidth;
      const at = (x, y) => {
        const d = ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
        return "rgb(" + d[0] + ", " + d[1] + ", " + d[2] + ")";
      };
      const vis = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0) || null;
      const line = vis(".tl-todayline");
      const tx = line.getBoundingClientRect().left;
      /**
       * ⚠️ "IN THE VIEWPORT" IS NOT "VISIBLE", AND THE DIFFERENCE COST A FALSE FAILURE.
       *
       * The pinned masthead covers the top of the scroll row. A row scrolled up behind it is still
       * inside the viewport, so a rect check passed it — and the pixel read there belonged to the
       * chrome. It reported one flat colour either side of today and read exactly like a wash that
       * was not being painted. elementsFromPoint names what actually owns the pixel, which is the
       * only thing that can answer the question a colour sample is asking.
       * (No backticks in here: this is inside an evaluate template and one would close it.)
       */
      const ownsPixel = (x, y, host) => {
        const st = document.elementsFromPoint(x, y);
        return st.length > 0 && host.contains(st[0]);
      };
      const topAt = (x, y) => { const st = document.elementsFromPoint(x, y); return st.length ? st[0] : null; };
      const inView = (r) => r.top > 4 && r.bottom < window.innerHeight - 4;

      const bars = []; const drop = { width:0, notInView:0, aheadOfToday:0, noFill:0, thin:0, notTop:0, noFam:0 };
      for (const b of document.querySelectorAll(".tl-p")) {
        const r = b.getBoundingClientRect();
        if (r.width <= 0) { drop.width++; continue; }
        if (!inView(r)) { drop.notInView++; continue; }
        /**
         * ⚠️ A BAR WHOLLY INSIDE THE WASHED REGION, WHICH IS THE STRONGER SUBJECT AND THE COMMONER
         * ONE. The first draft wanted a bar STRADDLING the line so both sides could be read off
         * one element; after the guards (the fill must reach the line, and nothing may own the
         * pixel instead) that left one candidate at one scroll position and none at another — a
         * claim resting on whichever bar happened to survive. A bar lying entirely behind today is
         * lying entirely under the wash, so if the wash reached the data its fill would be tinted;
         * and there are dozens of them.
         */
        if (r.right > tx - 4) { drop.aheadOfToday++; continue; }
        const fl = b.querySelector(".tl-fl");
        if (!fl) { drop.noFill++; continue; }
        const fr = fl.getBoundingClientRect();
        /* wide enough that the midpoint clears a marker at either end — they are ~12px and
           sit exactly where a bar is interrupted, which is what defeated a right-edge sample */
        if (fr.width < 44) { drop.thin++; continue; }
        const base = ["out","req","decide","remind","quiet"].find((c) => b.classList.contains(c));
        if (!base) { drop.noFam++; continue; }
        /**
         * ⚠️ NOT THE MIDDLE OF THE BAR — THE LABEL RIDES THERE.
         *
         * Sampled at mid-height, the past side returned rgb(184, 194, 180) against a declared fill
         * of rgb(230, 236, 227): an antialiased glyph of the label's own ink, which reads exactly
         * like a wash darkening the data. The band just under the top border is the only part of a
         * bar guaranteed to be nothing but fill or track.
         */
        const y = r.top + Math.min(4, r.height / 4);
        /* sample at the fill's MIDPOINT — furthest from both ends — and only where the fill itself
           owns that pixel. A containment test is not enough: the label is inside the bar too, and a
           marker sits exactly where the bar is interrupted, which is what a right-edge sample hit. */
        const fx = fr.left + fr.width / 2;
        if (topAt(fx, y) !== fl) { drop.notTop++; continue; }
        bars.push({
          key: b.className + '@' + Math.round(r.top) + ':' + Math.round(r.left),
          fam: base + (b.classList.contains("near") ? ":near" : ""),
          paintedFill: at(fx, y),
          declaredFill: getComputedStyle(fl).backgroundColor,
        });
      }

      /* the ground: a row where nothing is drawn across the line, sampled either side of it */
      const ground = [];
      for (const row of document.querySelectorAll(".tl-rrow")) {
        const lane = row.querySelector(".tl-c-tl");
        if (!lane) continue;
        const lr = lane.getBoundingClientRect();
        if (lr.height <= 0 || !inView(lr)) continue;
        const busy = [...row.querySelectorAll(".tl-p,.tl-tchip,.tl-mk2")].some((e) => {
          const r = e.getBoundingClientRect();
          return r.height > 0 && r.left < tx + 10 && r.right > tx - 10;
        });
        if (busy) continue;
        const y = lr.top + lr.height / 2;
        /* both sample points must belong to this lane, or the reading is about whatever covers it */
        if (!ownsPixel(tx - 6, y, lane) || !ownsPixel(tx + 6, y, lane)) continue;
        ground.push({ key: Math.round(lr.top) + ':' + Math.round(y),
                      nm: (row.querySelector(".tl-nm2") || {}).textContent,
                      past: at(tx - 6, y), ahead: at(tx + 6, y) });
      }
      return { bars, ground, drop };
    })(${JSON.stringify(shot)})`,
  )) as { bars: any[]; ground: any[] };

test("⚠️ the past is set back on the ground and never on the data", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(`(() => {
    const line = document.querySelector(".tl-todayline");
    if (!line) throw new Error("no today line to sample either side of");
    const tx = line.getBoundingClientRect().left;
    /* the wash is a pseudo-element, so it is read through the lane's own computed value */
    const lane = document.querySelector(".tl-rrow .tl-c-tl");
    const before = getComputedStyle(lane, "::before");
    /**
     * ⚠️ ONE FAMILY, ONE FILL COLOUR, WHEREVER IT SITS.
     *
     * The first draft looked for a bar whose FILL crossed the today line and found none — a fill
     * ends at today by definition, because that is what a fill IS. It failed loudly rather than
     * passing on an empty set, which is the only reason it was noticed. The claim it was reaching
     * for is that the wash never tints data, and that is measured by asking whether a family's
     * fill paints one colour on both sides of the line rather than by finding one bar that spans
     * it.
     */
    const sides = {};
    for (const b of document.querySelectorAll(".tl-p")) {
      const fl = b.querySelector(".tl-fl");
      if (!fl) continue;
      const fr = fl.getBoundingClientRect();
      if (fr.width <= 0) continue;
      /* THE near STEP IS A DIFFERENT STATE, NOT A DIFFERENT RENDERING OF ONE. A bar at >=85%
         deepens by design, so grouping it with its own family reported "out paints two fills
         either side of today" about two states that are both correct. The key is family AND
         step. */
      const base = ["out","req","decide","remind","quiet"].find((c) => b.classList.contains(c));
      if (!base) continue;
      const fam = base + (b.classList.contains("near") ? ":near" : "");
      const side = fr.right <= tx ? "past" : fr.left >= tx ? "ahead" : "both";
      const paint = getComputedStyle(fl).backgroundColor;
      sides[fam] = sides[fam] || {};
      (sides[fam][side] = sides[fam][side] || new Set()).add(paint);
    }
    const fills = {};
    for (const k of Object.keys(sides)) {
      fills[k] = {};
      for (const s2 of Object.keys(sides[k])) fills[k][s2] = [...sides[k][s2]];
    }
    /* ⚠️ THE LINE AND THE WASH MUST END ON THE SAME PIXEL. Both claim to mark today, and they are
       computed by different routes — the wash as a percentage of the lane, the line in pixels
       measured from the lane's own rect. Asserting one against the other is what caught the line
       being a percentage of the WRAP: it sat at x=557 while today was at x=903, inside the name
       column, 346px from the date it named. The flag was centred on the line, so the pair agreed
       with each other and both were wrong. */
    const laneR = lane.getBoundingClientRect();
    return {
      lineX: Math.round(line.getBoundingClientRect().left),
      washEndsAt: Math.round(laneR.left + parseFloat(before.width)),
      washBg: before.backgroundColor,
      washW: before.width,
      todayRule: getComputedStyle(line).borderLeftColor + " " + getComputedStyle(line).borderLeftWidth,
      fills,
      /* nothing in the lane may sit BEHIND the wash */
      barZ: getComputedStyle(document.querySelector(".tl-p")).zIndex,
      markerZ: document.querySelector(".tl-mk2") ? getComputedStyle(document.querySelector(".tl-mk2")).zIndex : null,
    };
  })()`) as any;
  console.log("wash " + JSON.stringify(r));

  expect(Math.abs(r.lineX - r.washEndsAt),
    `the today rule is at ${r.lineX} and the past ends at ${r.washEndsAt}`).toBeLessThanOrEqual(1);
  expect(r.washBg, "the past wash").toBe("rgba(58, 28, 20, 0.035)");
  expect(parseFloat(r.washW), "the wash has no width — it reports on nothing").toBeGreaterThan(1);
  expect(r.todayRule).toBe("rgba(58, 28, 20, 0.3) 1px");
  /* ⚠️ THE WASH IS BEHIND THE DATA. A bar at z-index 2 and a marker at 4 sit above a wash at 0,
     so neither is dimmed — the fill of a bar crossing the line is ONE colour, and a reader cannot
     mistake a washed fill for a paler one. */
  expect(Number(r.barZ)).toBeGreaterThan(0);
  expect(Number(r.markerZ)).toBeGreaterThan(0);
  /**
   * ⚠️ THE `fills` SWEEP IS RETIRED, AND BOTH REASONS ARE WORTH KEEPING.
   *
   * It required a family to appear on both sides of today and then required one colour. Since the
   * fill edge became today by construction (Phase 1), NO fill is ever ahead of the line — so the
   * precondition is unsatisfiable and the case failed loudly rather than passing on an empty set,
   * which is the only reason it was looked at. Its own comment records the first draft hitting
   * this and concluding the check was wrong: *"a fill ends at today by definition, because that is
   * what a fill IS"*. That reasoning was right and the board disagreed with it, so the reasoning
   * was discarded. It is true again now.
   *
   * ⚠️ AND IT COULD NEVER HAVE CAUGHT WHAT IT WAS FOR. It compared `getComputedStyle(fl)
   * .backgroundColor` on two elements — the DECLARED colour, which is identical whatever paints
   * on top of it. An overlay is exactly what a computed style cannot see, so the one assertion
   * aimed at "the wash is not on the data" was vacuous for its whole life.
   *
   * What replaces it is a real pixel: the browser decodes a screenshot into a canvas, and the
   * paint either side of the line is compared against the value the stylesheet DECLARES. That is
   * a composed claim — painted against declared — and it is the only shape that can fail if a
   * wash reaches the data.
   */
  /**
   * ⚠️ THE POPULATION IS GATHERED DOWN THE BOARD, NOT AT ONE SCROLL POSITION.
   *
   * A viewport shot can only sample what is on screen, and the guards below throw most candidates
   * away — a bar is only usable where its fill actually reaches the line and where nothing (the
   * label, the pinned masthead, a chip) owns the pixel instead. At one position that left a single
   * bar, and a claim resting on one sample is a claim about one bar. Stepping the scroller and
   * accumulating gives a real population, and the floor below is what makes a thin sweep fail
   * rather than quietly prove less than it says.
   */
  const scroller = page.locator(".wpg-scroll").first();
  const bars: any[] = [];
  const ground: any[] = [];
  const seen = new Set<string>();
  let lastDrop: any = null;

  /**
   * ⚠️ THE LABELS ARE HIDDEN FOR THE SHOT, AND `visibility` IS THE REASON IT IS SAFE.
   *
   * A label is a flex child spanning most of its bar, so it owns the pixel wherever you sample —
   * the guard rejected every candidate, and sampling anyway returned an antialiased glyph that
   * read exactly like a darkened fill. `visibility: hidden` takes an element out of painting AND
   * out of hit testing while leaving its box in flow, so every bar, fill and lane keeps the
   * geometry this case measures. The claim is about what the wash does to a fill; the words riding
   * on top of it are not part of it.
   */
  await page.addStyleTag({ content: ".tl-plbl { visibility: hidden !important; }" });
  await page.waitForTimeout(200);

  for (const frac of [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.85, 1]) {
    /* ⚠️ `.tl-zone`, NOT `.wpg-scroll`. The calendar is a FILL page, so the grid's scroll row does
       not scroll — the board scrolls inside its own zone. Stepping the wrong element moved nothing
       and the sweep gathered the same two bars eight times over, which reads exactly like a board
       that only has two. Choosing the scroller by measurement rather than by name is the guard. */
    await page.evaluate(`(() => {
      const sc = [...document.querySelectorAll(".tl-zone, .wpg-scroll")]
        .find((e) => e.scrollHeight > e.clientHeight + 8 && e.getBoundingClientRect().height > 0);
      if (!sc) throw new Error("no scrolling zone on the calendar");
      sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * ${frac};
    })()`);
    await page.waitForTimeout(400);
    const shot = (await page.screenshot()).toString("base64");
    const got = await sample(page, shot);
    for (const b of got.bars) if (!seen.has("b" + b.key)) { seen.add("b" + b.key); bars.push(b); }
    for (const g of got.ground) if (!seen.has("g" + g.key)) { seen.add("g" + g.key); ground.push(g); }
    lastDrop = (got as any).drop;
  }
  void scroller;
  const paint = { bars, ground, drop: lastDrop };

  console.log(`wash paint — ${paint.bars.length} bars behind today, ${paint.ground.length} clear ground rows; drops ${JSON.stringify(paint.drop)}`);

  /* ⚠️ POPULATION FIRST, BOTH HALVES. Either list being empty satisfies every claim below by
     having nothing in it, which is the shape this file exists to refuse. */
  expect(paint.bars.length, "no bar lies wholly behind today with a readable fill — nothing was measured")
    .toBeGreaterThan(3);
  expect(paint.ground.length, "no row has clear ground either side of today — nothing was measured")
    .toBeGreaterThan(0);

  /**
   * ⚠️ THE WASH IS ON THE GROUND, AND THE CLAIM IS THE COMPOSITE RATHER THAN "THEY DIFFER".
   *
   * "The two sides differ" passes on any accident that happens to change the colour — a hover, a
   * band, a neighbouring element. Compositing the declared wash over the measured AHEAD sample and
   * requiring the measured PAST sample to equal it is exact, holds whatever the row's base colour
   * is, and fails if the wash is the wrong alpha, the wrong tint, or absent.
   */
  const WASH = [58, 28, 20];
  const WASH_A = 0.035;
  for (const g of paint.ground) {
    const base = (g.ahead.match(/\d+/g) || []).map(Number);
    const want = base.map((c: number, i: number) => Math.round(c * (1 - WASH_A) + WASH[i] * WASH_A));
    const got = (g.past.match(/\d+/g) || []).map(Number);
    const off = got.map((c: number, i: number) => Math.abs(c - want[i]));
    expect(
      Math.max(...off),
      `${g.nm}: ground ahead of today paints ${g.ahead}, so behind it should paint rgb(${want.join(", ")}) — it paints ${g.past}`,
    ).toBeLessThanOrEqual(1);
  }
  /* and it is NOT on the data: these bars sit entirely under the wash, and each paints exactly the
     colour its own stylesheet rule declares — the composed claim a computed style cannot make */
  const tinted = paint.bars
    .filter((b: any) => b.paintedFill !== b.declaredFill)
    .map((b: any) => `${b.fam} declares ${b.declaredFill} and paints ${b.paintedFill} behind today`);
  expect(tinted, "the wash has reached the data").toEqual([]);
  console.log(`  families read behind today: ${JSON.stringify([...new Set(paint.bars.map((b: any) => b.fam))])}`);
});

/* ══ THE RAIL, AND THE ONE CLAIM THAT DECIDES WHETHER IT IS BUILT (v36 part two, Phase 4) ════ */

test("⚠️ a rail tick lands on the same pixel as that date inside a card lane", async ({ page }) => {
  for (const [label, idx] of [["1 month", 0], ["3 months", 1], ["6 months", 2]] as const) {
    await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
    await page.evaluate(`(() => {
      const all = [...document.querySelectorAll('input[type=range]')]
        .filter((e) => e.getBoundingClientRect().width > 0);
      if (all.length !== 1) throw new Error("expected 1 visible range control, found " + all.length);
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(all[0], String(${idx}));
      all[0].dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await page.waitForTimeout(700);

    const r = await page.evaluate(`(() => {
      const rail = document.querySelector(".tl-rail .tl-railtl");
      if (!rail) throw new Error("no rail on the board");
      const lane = [...document.querySelectorAll(".tl-rrow .tl-c-tl")]
        .find((e) => e.getBoundingClientRect().width > 0);
      if (!lane) throw new Error("no visible lane to compare against");
      const rr = rail.getBoundingClientRect();
      const lr = lane.getBoundingClientRect();
      /**
       * THE SAME DATE, BY BOTH ROUTES. A tick carries the day index it was placed at; the lane's
       * own x for that index is computed from the lane's rect and the window length. If the rail
       * and the rows shared no column source these would differ by the width of the two head
       * columns, which is what the today line was wrong by.
       * (No backticks in here: this comment lives inside a template literal.)
       */
      const days = Number(getComputedStyle(document.querySelector(".tl")).getPropertyValue("--tl-days"));
      const ticks = [...rail.querySelectorAll(".tl-tick")].map((t) => {
        const at = Number(t.dataset.at);
        return {
          at,
          railX: t.getBoundingClientRect().left,
          laneX: lr.left + lr.width * (at / days),
        };
      });
      return {
        days,
        railLeft: Math.round(rr.left), laneLeft: Math.round(lr.left),
        railW: Math.round(rr.width), laneW: Math.round(lr.width),
        drifts: ticks.map((t) => +(t.railX - t.laneX).toFixed(2)),
        n: ticks.length,
      };
    })()`) as any;

    console.log(`${label}: rail ${r.railLeft}/${r.railW} · lane ${r.laneLeft}/${r.laneW} · `
      + `${r.n} ticks, worst drift ${Math.max(...r.drifts.map(Math.abs)).toFixed(2)}`);

    /* ⚠️ THE COLUMNS THEMSELVES MUST COINCIDE — if they do not, every tick is wrong by the same
       amount and a per-tick tolerance would hide it behind an average. */
    expect(Math.abs(r.railLeft - r.laneLeft), `${label}: the rail's timeline column starts `
      + `${r.railLeft} and a lane starts ${r.laneLeft}`).toBeLessThanOrEqual(1);
    expect(Math.abs(r.railW - r.laneW), `${label}: rail ${r.railW}px wide, lane ${r.laneW}px`)
      .toBeLessThanOrEqual(1);
    expect(r.n, `${label}: no ticks — the sweep proves nothing`).toBeGreaterThan(4);
    for (const d of r.drifts) {
      expect(Math.abs(d), `${label}: a tick sits ${d}px from its own date in a lane`)
        .toBeLessThanOrEqual(1);
    }
  }
});

test("the rail is the page's own, and the cards carry no date row", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(`(() => {
    const rail = document.querySelector(".tl-rail");
    const cs = getComputedStyle(rail);
    const months = [...document.querySelectorAll(".tl-mlab")].map((m) => ({
      text: m.textContent, ink: getComputedStyle(m).color,
      weight: getComputedStyle(m).fontWeight, spacing: getComputedStyle(m).letterSpacing,
      now: m.classList.contains("now"), gone: m.classList.contains("gone"),
    }));
    const chip = document.querySelector(".tl-todaychip");
    const stem = document.querySelector(".tl-todaystem");
    return {
      h: cs.height, position: cs.position, border: cs.borderBottomColor,
      /* ⚠️ THE DATE ROW MUST HAVE LEFT THE CARDS ENTIRELY — it used to be drawn inside the first
         group's card, so it scrolled away with that card. */
      hrowsInCards: document.querySelectorAll(".tl-tbl .tl-hrow").length,
      railsInCards: document.querySelectorAll(".tl-tbl .tl-rail").length,
      labelsInRail: [...document.querySelectorAll(".tl-rail .tl-lbl3")].map((e) => e.textContent),
      labelsInCards: document.querySelectorAll(".tl-tbl .tl-lbl3").length,
      months,
      tick: (() => { const t = document.querySelector(".tl-tick"); const c = getComputedStyle(t);
        return { colour: c.borderLeftColor, h: c.height }; })(),
      baseline: getComputedStyle(document.querySelector(".tl-railtl"), "::after").borderBottomColor,
      chip: chip ? { bg: getComputedStyle(chip).backgroundColor, ink: getComputedStyle(chip).color } : null,
      stem: stem ? { colour: getComputedStyle(stem).borderLeftColor, w: getComputedStyle(stem).borderLeftWidth } : null,
    };
  })()`) as any;
  console.log("rail " + JSON.stringify({ h: r.h, position: r.position, months: r.months.map((m: any) => m.text) }));

  expect(r.h, "the rail's height").toBe("42px");
  expect(r.position, "the rail does not stick").toBe("sticky");
  expect(r.border, "the rail's bottom border").toBe("rgb(224, 211, 191)");
  expect(r.baseline, "the rail's baseline").toBe("rgb(227, 215, 196)");
  expect(r.tick.colour, "tick colour").toBe("rgb(205, 191, 168)");
  expect(r.tick.h, "tick height").toBe("5px");
  expect(r.hrowsInCards, "a card still carries a date row").toBe(0);
  expect(r.railsInCards, "the rail is inside a card").toBe(0);
  expect(r.labelsInCards, "AGENT / ACTION? still live in the cards").toBe(0);
  expect(r.labelsInRail, "the rail's own column labels").toEqual(["Agent", "Action?"]);

  /* ⚠️ THE MONTH SHELF: the one you are in is ink, the ones behind you are set back. A shelf
     where every label weighs the same makes the reader find today twice. */
  expect(r.months.length, "no months on the shelf").toBeGreaterThan(1);
  expect(r.months[0].spacing).toBe("1.76px");   /* .22em at 8px */
  const now = r.months.filter((m: any) => m.now);
  expect(now.length, "no current month on the shelf").toBe(1);
  expect(now[0].ink).toBe("rgb(58, 28, 20)");
  expect(now[0].weight).toBe("500");
  for (const m of r.months.filter((m: any) => m.gone)) expect(m.ink).toBe("rgb(195, 179, 156)");
  for (const m of r.months.filter((m: any) => !m.gone && !m.now)) expect(m.ink).toBe("rgb(168, 146, 122)");

  expect(r.chip.bg, "the today chip").toBe("rgb(124, 58, 42)");
  expect(r.stem.colour, "the today stem").toBe("rgb(124, 58, 42)");
  /* ⚠️ THE USED WIDTH ROUNDS. The stylesheet declares 1.5px and Chromium reports 1px at DPR 1 —
     a browser rounding a sub-pixel border, not a value that drifted. The DECLARED 1.5px is
     asserted in `barTokens.test.ts`, where a source lock is the right instrument; here the honest
     rendered claim is that the stem is painted, and painted burgundy. */
  expect(parseFloat(r.stem.w), "the today stem has no width").toBeGreaterThan(0);
});

/* ══ THE FILL EDGE IS TODAY (v36 part three, Phase 1) ═══════════════════════════════════════ */

/**
 * ⚠️ THIS REPLACES THE RANGE-INVARIANCE CHECK AS THE LOAD-BEARING ONE, and that check is kept
 * below because it is still true — not because it was ever going to catch this.
 *
 * The fill is elapsed time on an axis linear in time, so its right edge is today by construction.
 * The old drawing computed an honest ratio over the stretch's TRUE span and then multiplied it by
 * the PIECE's span — clipped at the window edge and cut at every break — so the painted edge
 * landed wherever that arithmetic put it: measured on the deployed board at 1440, nine of nine
 * partial fills right of today at one month, worst +243px, and −38px on a reminder bar at six.
 *
 * ⚠️ AND THE OLD CHECK COULD NOT HAVE SEEN ANY OF IT — TWICE OVER. A drawing wrong by the same
 * rule at every range satisfies "same ratio at every range" perfectly; and its second half, which
 * claimed to prove the element was drawn FROM the number, compared `fl.style.width` against
 * `data-fill` — one `fillFor` call written into two attributes by one JSX expression, so it could
 * only fail if someone wired two different numbers into one element. Necessary, never sufficient.
 */
test("the painted fill edge lands on today, at every range and every width", async ({ page }) => {
  const rows: string[] = [];
  let covered = 0;
  let worst = 0;

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForTimeout(1200);

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        const line = vis(".tl-todayline");
        const lane = vis(".tl-c-tl");
        if (!line || !lane) return { fatal: "no today line or no lane on the page" };
        const lr = line.getBoundingClientRect();
        /* the rule is a 1px left border on a zero-width box: its ink is its left edge */
        const todayX = lr.left;
        const partial = [], right = [], passed = [];
        for (const b of document.querySelectorAll(".tl-p")) {
          const br = b.getBoundingClientRect();
          if (br.width <= 0) continue;
          const fl = b.querySelector(".tl-fl");
          if (!fl) continue;
          const fr = fl.getBoundingClientRect();
          if (fr.width <= 0) continue;
          const row = b.closest(".tl-rrow");
          const nm = row ? (row.querySelector(".tl-nm2") || {}).textContent : "?";
          const said = Number(b.dataset.fill);
          const rec = { nm, said, dev: fr.right - todayX, edgeGap: br.right - fr.right };
          /* ⚠️ THE POPULATION IS SPLIT BY WHAT THE BOARD SAYS, NOT BY WHERE IT DREW. The
             reported number decides which claim applies before any geometry is looked at, so a
             fill drawn in the wrong place cannot select itself into a branch that forgives it.
             (No backticks in here: this is inside an evaluate template, and one would close it.) */
          if (Number.isFinite(said) && said > 0 && said < 100) partial.push(rec);
          else if (said >= 100) passed.push(rec);
          if (fr.right - todayX > 1) right.push(rec);
        }
        return { todayX, partial, right, passed };
      })()`) as any;

      expect(read.fatal, `${width}px range ${r}: ${read.fatal}`).toBeUndefined();

      /* ⚠️ THE POPULATION FIRST. A board with no partial fill satisfies every claim below by
         having nothing to check, which is the shape that goes green while measuring nothing. */
      expect(
        read.partial.length,
        `${width}px range ${r}: no bar carries a partial fill, so this case measured nothing`,
      ).toBeGreaterThan(2);
      covered += read.partial.length;

      for (const f of read.partial) {
        worst = Math.max(worst, Math.abs(f.dev));
        rows.push(`${width} r${r} ${String(f.nm).padEnd(20)} ${String(f.said).padStart(3)}% dev ${f.dev.toFixed(1)}px`);
      }
      const off = read.partial.filter((f: any) => Math.abs(f.dev) > 1);
      expect(
        off.map((f: any) => `${f.nm} ${f.said}% is ${f.dev.toFixed(1)}px from today`),
        `${width}px range ${r}: a fill in progress does not end on today`,
      ).toEqual([]);

      /* nothing paints fill to the right of today, whatever it says about itself */
      expect(
        read.right.map((f: any) => `${f.nm} ${f.dev.toFixed(1)}px right of today`),
        `${width}px range ${r}: fill painted to the right of today`,
      ).toEqual([]);

      /* a bar whose named end has passed is full to its own right edge, and that edge is left of
         today — the two halves together, because either alone is satisfiable by a bar drawn wrong */
      for (const f of read.passed) {
        expect(f.edgeGap, `${width}px range ${r}: ${f.nm} says 100% but stops ${f.edgeGap.toFixed(1)}px short of its own end`)
          .toBeLessThanOrEqual(2.5);
        expect(f.dev, `${width}px range ${r}: ${f.nm} has a passed end but paints ${f.dev.toFixed(1)}px right of today`)
          .toBeLessThanOrEqual(1);
      }
    }
  }
  console.log(`fill edge — ${covered} partial fills covered, worst deviation ${worst.toFixed(1)}px`);
  for (const r of rows) console.log(`  ${r}`);
});

/* ══ THE ROW'S SUBJECT (v36 part three, Phase 2) ════════════════════════════════════════════ */

/**
 * ⚠️ ONE PROPERTY THAT WOULD HAVE CAUGHT ALL THREE SHIPPED VARIANTS.
 *
 * A row draws one query per manuscript. Three times a row-level derivation reached for the
 * AGENT's whole set instead and produced a true sentence about a query the reader cannot see:
 * the deed asked of the row's lead while the group came from whichever query earned it; the sort
 * key minimised over every query the agent holds; and the deed's own repair searched the
 * everything-set again. Each was fixed at its own seam, and each left the next one writable.
 *
 * None of them is visible from appearance. A deed reading SEND THE PARTIAL beside a bar reading
 * "reply expected 29 Sept" is only WRONG if you know they are about different queries — the words
 * themselves are each true. So the row states which query each of its parts came from, and this
 * asks the only question that distinguishes the three: is it one of the ones drawn here?
 */
test("every part of a row is about a query that row actually draws", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  let rowsChecked = 0;
  let claimsChecked = 0;
  const tally: Record<string, number> = {};
  const deedsSeen: string[] = [];

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        const rows = [];
        for (const row of document.querySelectorAll(".tl-rrow")) {
          const drawn = [...row.querySelectorAll(".tl-p")]
            .map((b) => b.dataset.qid).filter(Boolean);
          /* the family of the LIVE piece for each query — a bar is cut into several pieces across
             time and only the running one carries the state the deed is answering */
          const live = {};
          for (const b of row.querySelectorAll('.tl-p[data-live="1"]')) {
            const fam = ["out","req","decide","remind","quiet","closedp"].find((c) => b.classList.contains(c));
            if (b.dataset.qid && fam) live[b.dataset.qid] = fam;
          }
          rows.push({
            nm: (row.querySelector(".tl-nm2") || {}).textContent,
            drawn,
            deed: row.dataset.subjDeed || null,
            caption: row.dataset.subjCaption || null,
            sort: row.dataset.subjSort || null,
            deedText: (row.querySelector(".tl-c-ac") || {}).textContent,
            live,
          });
        }
        return { rows, board: !!vis(".tl-board") };
      })()`) as any;

      expect(read.board, `${width}px range ${r}: no visible board`).toBe(true);

      const offences: string[] = [];
      for (const row of read.rows) {
        /* a row with no bar draws nothing, so it has no subject to be wrong about — the pinned
           task rows are the whole of that population and they carry no query at all */
        if (!row.drawn.length) continue;
        rowsChecked++;
        for (const part of ["deed", "caption", "sort"] as const) {
          const id = row[part];
          if (!id) continue;
          claimsChecked++;
          tally[part] = (tally[part] || 0) + 1;
          if (!row.drawn.includes(id)) {
            offences.push(
              `${row.nm}: the ${part} is about ${id}, which this row does not draw ` +
              `(it draws ${row.drawn.join(", ")})${part === "deed" ? ` — it reads "${String(row.deedText).trim()}"` : ""}`,
            );
          }
        }
      }
      expect(offences, `${width}px range ${r}: a row's words are about a query it does not draw`).toEqual([]);

      /**
       * ⚠️ AND THE DEED AGREES WITH THE BAR BESIDE IT — the reader-visible half.
       *
       * Identity nearly implies this: if the deed is about a query the row draws, both are derived
       * from that query's status and cannot disagree. Nearly, because the DEED table is a separate
       * mapping from `familyOf`, so a wrong entry there would put "SEND THE PARTIAL" against a bar
       * the board itself is drawing as the agent's move. That is the shape a reader would report,
       * and identity alone would not catch it.
       */
      const clash: string[] = [];
      for (const row of read.rows) {
        const want = /^\s*SEND\b/i.test(String(row.deedText)) ? "req"
          : /^\s*ANSWER\b/i.test(String(row.deedText)) ? "decide" : null;
        if (!want || !row.deed) continue;
        const fam = row.live[row.deed];
        if (fam && fam !== want) {
          clash.push(`${row.nm} reads "${String(row.deedText).trim()}" beside a ${fam} bar`);
          deedsSeen.push(`${row.nm}:${fam}`);
        } else if (fam) deedsSeen.push(`${row.nm}:${fam}`);
      }
      expect(clash, `${width}px range ${r}: a deed contradicts the bar beside it`).toEqual([]);
    }
  }

  /* ⚠️ THE POPULATION, AND PER PART. A sweep in which no row carried a deed would satisfy the
     claim by having nothing to check — and so would one that happened to check only captions. */
  console.log(`row subject — ${rowsChecked} drawing rows, ${claimsChecked} claims: ${JSON.stringify(tally)}`);
  expect(rowsChecked, "no row draws a bar — nothing was checked").toBeGreaterThan(20);
  console.log(`  deeds checked against their own bar: ${deedsSeen.length}`);
  expect(deedsSeen.length, "no asking deed had a live bar to be checked against").toBeGreaterThan(3);
  for (const part of ["deed", "caption", "sort"]) {
    expect(tally[part] || 0, `no row carried a ${part} subject — that part was never checked`).toBeGreaterThan(0);
  }
  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

/**
 * ⚠️ THE MONTH SHELF EARNS ITS PLACE OR IT IS ABSENT (v36 part three, Phase 4).
 *
 * At one month the window straddles two calendar months, so the shelf drew two labels and a
 * SINGLE divider — and one divider on a long rule reads as a stray mark rather than as a boundary
 * between two things. The nine date labels already carry that range.
 *
 * The assertion is on the DOM, not on opacity or width: a label nobody can see is still a label a
 * screen reader reads out, and "absent" is the claim being made.
 */
test("the month shelf appears only where there are months to tell apart", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        const rail = vis(".tl-railtl");
        if (!rail) return { fatal: "no rail" };
        return {
          labels: [...rail.querySelectorAll(".tl-mlab")].map((e) => e.textContent),
          dividers: rail.querySelectorAll(".tl-mdiv").length,
          days: [...rail.querySelectorAll(".tl-dt")].length,
        };
      })()`) as any;
      expect(read.fatal, `${width}px range ${r}: ${read.fatal}`).toBeUndefined();
      seen.push(`${width} r${r}: ${read.labels.length} labels ${JSON.stringify(read.labels)}, ${read.dividers} dividers, ${read.days} days`);

      if (r === 0) {
        expect(read.labels, `${width}px at one month: the shelf drew ${JSON.stringify(read.labels)}`).toEqual([]);
        expect(read.dividers, `${width}px at one month: ${read.dividers} month dividers`).toBe(0);
      } else {
        expect(read.labels.length, `${width}px range ${r}: the shelf is missing`).toBeGreaterThanOrEqual(3);
        expect(read.dividers, `${width}px range ${r}: the shelf has no dividers`).toBeGreaterThan(1);
      }
      /* ⚠️ AND THE DAY LABELS CARRY EVERY RANGE, INCLUDING THE ONE THE SHELF LEAVES. Without this
         the case above is satisfied by a rail that renders nothing at all at one month. */
      expect(read.days, `${width}px range ${r}: the rail has no date labels`).toBeGreaterThan(4);
    }
  }
  for (const s of seen) console.log(`  ${s}`);
});

/**
 * ⚠️ CLEARANCE AT EVERY RANGE, NOT ONLY THE ONE THE PAGE OPENS ON.
 *
 * The structural case measures it at three widths and one range. Bars change span with the range
 * — that is what a range IS — so the pair that is tightest at six months is not the pair that is
 * tightest at one, and a rule verified at a single range is verified for a single set of pairs.
 */
test("markers stay clear of every bar on their line, at every range", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const c = await clearanceNow(page);
      seen.push(`${width} r${r}: ${c.pairs} pairs, worst ${c.worst}px, ${c.offenders.length} under 1px`);
      expect(c.pairs, `${width}px range ${r}: no marker/bar pair — the sweep proves nothing`)
        .toBeGreaterThan(0);
      expect(c.worst, `${width}px range ${r}: ${c.offenders.length} pairs under 1px: ${JSON.stringify(c.offenders)}`)
        .toBeGreaterThanOrEqual(1);
    }
  }
  for (const s2 of seen) console.log(`  ${s2}`);
});

/* ══ TWO TOKENS, NOT ONE (v37, Phase 2) ════════════════════════════════════════════════════ */

/**
 * ⚠️ LIST DENSITY AND BAR HEIGHT ARE INDEPENDENT, AND THAT IS PROVED BY MOVING ONE.
 *
 * Two declarations sitting in one `:root` block look independent and are not: the question is
 * whether anything downstream reads one where it means the other. Reading the stylesheet cannot
 * answer it — a bar sized from the row, or a row sized from the bar, is a `calc()` away and looks
 * perfectly reasonable in either direction. So this measures the painted values, then overrides
 * ONE token on the live page and measures again: the other must not move.
 */
test("row height and bar height are independent, and the marker sits clear in the row", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        const board = vis(".tl-board");
        if (!board) return { fatal: "no board" };
        const bars = [...document.querySelectorAll(".tl-p")].filter((b) => b.getBoundingClientRect().width > 0);
        const mks = [...document.querySelectorAll(".tl-mk2")].filter((m) => m.getBoundingClientRect().width > 0);
        const rows = [...document.querySelectorAll(".tl-rrow")].filter((x) => x.getBoundingClientRect().height > 0);
        /* ONE-LANE rows only: a two-lane row is two lines and its height is a multiple by design */
        const oneLane = rows.filter((x) => (getComputedStyle(x).getPropertyValue("--lanes").trim() || "1") === "1");
        const h = (els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().height)))];
        /* the room above and below a marker inside its own row — the marker must not fill the line */
        const room = [];
        for (const m of mks) {
          const row = m.closest(".tl-rrow");
          if (!row) continue;
          const mr = m.getBoundingClientRect();
          const lanes = Number(getComputedStyle(row).getPropertyValue("--lanes").trim() || "1");
          if (lanes !== 1) continue;
          const rr = row.getBoundingClientRect();
          room.push({ top: Math.round(mr.top - rr.top), bottom: Math.round(rr.bottom - mr.bottom) });
        }
        return {
          barH: h(bars), mkH: h(mks), rowH: h(oneLane),
          barCount: bars.length, mkCount: mks.length, rowCount: oneLane.length,
          room,
        };
      })()`) as any;
      expect(read.fatal, `${width}px range ${r}: ${read.fatal}`).toBeUndefined();

      /* ⚠️ POPULATION FIRST, PER KIND. An empty set of bars satisfies "every bar is 34px". */
      expect(read.barCount, `${width}px range ${r}: no bars`).toBeGreaterThan(3);
      expect(read.mkCount, `${width}px range ${r}: no markers`).toBeGreaterThan(0);
      expect(read.rowCount, `${width}px range ${r}: no single-lane rows`).toBeGreaterThan(3);

      /* ⚠️ THE DISTINCT SET, NOT AN AVERAGE. One bar drawn at the wrong height disappears into a
         mean and is the whole of what this is looking for. */
      expect(read.barH, `${width}px range ${r}: bar heights ${JSON.stringify(read.barH)}`).toEqual([34]);
      expect(read.mkH, `${width}px range ${r}: marker sizes ${JSON.stringify(read.mkH)}`).toEqual([30]);
      expect(read.rowH, `${width}px range ${r}: single-lane row heights ${JSON.stringify(read.rowH)}`).toEqual([52]);

      /* the marker does not fill its line: clear room above and below, inside the row */
      const tight = read.room.filter((x: any) => x.top < 4 || x.bottom < 4);
      expect(tight, `${width}px range ${r}: a marker crowds its row: ${JSON.stringify(tight)}`).toEqual([]);
      seen.push(`${width} r${r}: bar ${read.barH} · row ${read.rowH} · marker ${read.mkH} · room ${read.room.length} markers`);
    }
  }
  for (const s of seen) console.log(`  ${s}`);

  /* ══ THE INDEPENDENCE, PROVED BY MOVING ONE ═══════════════════════════════════════════════ */
  const moved = await page.evaluate(TAG + `(() => {
    const board = vis(".tl-board");
    const oneLaneRow = () => [...document.querySelectorAll(".tl-rrow")]
      .filter((x) => x.getBoundingClientRect().height > 0)
      .find((x) => (getComputedStyle(x).getPropertyValue("--lanes").trim() || "1") === "1");
    const bar = () => [...document.querySelectorAll(".tl-p")].find((b) => b.getBoundingClientRect().width > 0);
    const rd = () => ({
      row: Math.round(oneLaneRow().getBoundingClientRect().height),
      bar: Math.round(bar().getBoundingClientRect().height),
    });
    const before = rd();
    /* move the BAR token alone */
    board.style.setProperty("--bar-h", "20px");
    const barMoved = rd();
    board.style.removeProperty("--bar-h");
    /* move the ROW token alone */
    board.style.setProperty("--row-h", "80px");
    const rowMoved = rd();
    board.style.removeProperty("--row-h");
    return { before, barMoved, rowMoved, after: rd() };
  })()`) as any;
  console.log(`  independence — rest ${JSON.stringify(moved.before)}`
    + ` · bar→20 ${JSON.stringify(moved.barMoved)} · row→80 ${JSON.stringify(moved.rowMoved)}`);

  /* the override must actually have taken, or every claim below is about a page that ignored it */
  expect(moved.barMoved.bar, "setting --bar-h changed nothing — the override did not take")
    .not.toBe(moved.before.bar);
  expect(moved.rowMoved.row, "setting --row-h changed nothing — the override did not take")
    .not.toBe(moved.before.row);
  /* and neither reaches the other */
  expect(moved.barMoved.row, "changing --bar-h moved the ROW height").toBe(moved.before.row);
  expect(moved.rowMoved.bar, "changing --row-h moved the BAR height").toBe(moved.before.bar);
  expect(moved.after, "the page did not return to rest").toEqual(moved.before);
});

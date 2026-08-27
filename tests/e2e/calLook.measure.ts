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
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

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
        const fills = {};
        for (const b of bars) {
          const f = ["out","req","decide","remind","quiet","closedp"].find((c) => b.classList.contains(c));
          if (!f) continue;
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
        /* ⚠️ PAINTED CLEARANCE: the halo must actually separate every marker from every bar. */
        let worst = Infinity; let pairs = 0;
        for (const m of mks) {
          const mr = m.getBoundingClientRect();
          const lane = m.closest(".tl-c-tl");
          if (!lane) continue;
          for (const b of lane.querySelectorAll(".tl-p")) {
            const br = b.getBoundingClientRect();
            if (br.width <= 0) continue;
            /* only bars on the same line matter */
            if (Math.abs((br.top + br.height / 2) - (mr.top + mr.height / 2)) > 6) continue;
            pairs += 1;
            /* the halo is 3px of the row's colour painted outside the marker's box */
            const gap = Math.min(Math.abs(mr.left - br.right), Math.abs(br.left - mr.right));
            if (mr.left > br.right || br.left > mr.right) worst = Math.min(worst, gap);
          }
        }
        out.markerBarPairs = pairs;
        out.worstClearance = worst === Infinity ? null : worst;
        /* ── structure ──────────────────────────────────────────────────────────────────── */
        out.columnHeaders = document.querySelectorAll(".tl-hrow").length;
        out.dateLabels = document.querySelectorAll(".tl-hrow .tl-dt").length;
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

      expect(read.board, "no board").toBe(true);
      expect(read.barCount, "no bars to measure — the sweep proves nothing").toBeGreaterThan(3);

      /* ── the pinned values, exactly ─────────────────────────────────────────────────── */
      for (const [name, want] of Object.entries(FAMILY)) {
        const got = read.families[name];
        if (!got) continue;   /* a family the fixture does not produce is reported, not asserted */
        expect(got.line, `${name} border`).toBe(hex(want.line));
        expect(got.text, `${name} text`).toBe(hex(want.text));
        expect(got.track, `${name} track is not white`).toBe("rgb(255, 255, 255)");
        if (got.fill) expect([hex(want.fill), hex(want.near)], `${name} fill`).toContain(got.fill);
        expect(got.radius, `${name} is not a pill`).toBe("999px");
        expect(got.height, `${name} height`).toBe("22px");
      }
      const seenFamilies = Object.keys(read.families);
      expect(seenFamilies.length, `only one family on the board: ${seenFamilies}`).toBeGreaterThan(1);

      /* ── a bar with no named end paints no fill ─────────────────────────────────────── */
      expect(read.noGoalBarsWithoutFill, "a bar with no named date painted a fill anyway").toBe(true);

      /* ── markers: values, size, and PAINTED clearance ───────────────────────────────── */
      for (const [name, want] of Object.entries(MARKER)) {
        const got = read.markers[name];
        if (!got) continue;
        expect(got.line, `${name} ring`).toBe(hex(want.line));
        expect(got.ink, `${name} ink`).toBe(hex(want.ink));
        expect(got.w, `${name} size`).toBe("20px");
        expect(got.radius, `${name} is not a circle`).toBe("999px");
        expect(got.shadow, `${name} has no halo`).toContain("3px");
      }
      if (read.markerBarPairs > 0) {
        expect(read.worstClearance, "a marker touches a bar").toBeGreaterThan(0);
      }

      /* ── structure ──────────────────────────────────────────────────────────────────── */
      expect(read.columnHeaders, "the column header is drawn per group again").toBe(1);
      expect(read.dateLabels, "the header's dates").toBeGreaterThan(5);
      expect(read.dateLabels, "too many dates to scan").toBeLessThan(14);
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

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
  const setRange = async (i: number) => {
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

  /* ⚠️ READ THE PAINTED WIDTH RATIO, not the data attribute. `data-fill` is what the code THINKS;
     the child's width against its parent's is what the reader sees, and the two are only the same
     thing if the element was drawn from the number. */
  /**
   * ⚠️ THE REPORTED NUMBER, AND THE PROOF THE ELEMENT IS DRAWN FROM IT.
   *
   * The painted width RATIO is not a usable invariance metric and three drafts proved it: the bar
   * is `box-sizing: border-box` with a 1px border, so a fill at `width: 100%` paints two pixels
   * narrower than the rect — 0.3% of a 600px bar and 36% of a 30px one. Comparing rects reported
   * 99 / 98 / 64 for a bar that was full at all three ranges. So this asserts the two halves that
   * actually matter and can each be measured honestly: the NUMBER the board reports is the same at
   * every range, and the fill element's own width is set FROM that number rather than from
   * anything else. Together they are the composed claim; either alone is not.
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
      const drawn = parseFloat(fl.style.width);
      out[nm] = { said, drawn: Number.isFinite(drawn) ? drawn : null };
    }
    return out;
  })()`) as Promise<Record<string, { said: number; drawn: number | null }>>;

  const seen: Record<string, number[]> = {};
  const drawnGap: string[] = [];
  for (const i of [0, 1, 2]) {
    await setRange(i);
    const r = await ratios();
    for (const [k, v] of Object.entries(r)) {
      (seen[k] = seen[k] || []).push(v.said);
      /* the element is drawn FROM the number: same value, allowing the render's own rounding */
      if (v.drawn == null || Math.abs(v.drawn - v.said) > 1.5) {
        drawnGap.push(`${k} says ${v.said}% and draws ${v.drawn}%`);
      }
    }
  }
  const across = Object.entries(seen).filter(([, v]) => v.length === 3);
  console.log("reported fill at 1m / 3m / 6m:");
  for (const [k, v] of across) console.log(`  ${k.padEnd(24)} ${v.join(" / ")}%`);

  expect(across.length, "no row carried a live fill at all three ranges").toBeGreaterThan(2);
  expect(drawnGap, `the fill element is not drawn from the number: ${drawnGap.join(" | ")}`).toEqual([]);
  for (const [k, v] of across) {
    expect(Math.max(...v) - Math.min(...v), `${k} reported ${v.join(" / ")}% at three ranges`)
      .toBeLessThanOrEqual(1);
  }
});

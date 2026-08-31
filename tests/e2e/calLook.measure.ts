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
import { setRangeTo, showGrouped, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ `.tl-plbl` IS `.tl-hl` SINCE v37. The bar's single label became two lines — what it is, and
 * when — so the element every sweep here sampled for "the label" is now the FIRST of two. The claim
 * each was making is unchanged: line one is the label, it carries the family's ink, and a bar the
 * fit pass stripped has none. Retargeted rather than deleted, and their population guards are what
 * caught the rename — three cases went red saying "no family carried a label at all" and "no
 * labelled bar to measure", which is a guard working rather than a suite breaking.
 *
 * The hollow wash and the fit-pass hide now target `.tl-txt`, the stack, because both apply to the
 * text as a whole rather than to one of its lines.
 */
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

/**
 * Put the board into GROUPED, for the cases whose subject is the groups.
 *
 * ⚠️ SINCE v37 THE DEFAULT IS ONE LIST, so a case that reads `.tl-gt` on the page as it opens is
 * reading a board that has no group headings by design — and it fails saying "groups without a
 * sentence", which reads like a copy bug rather than like a mode. The groups are still exactly what
 * they were; they are one control away, and these cases press it.
 *
 * ⚠️ IT THROWS IF THE CONTROL IS NOT THERE. A guard would let a case go on to assert about the
 * headings it never switched to, which is the shape that reports a real number about the wrong
 * page.
 */

test.describe("the Calendar — Porcelain", () => {
  for (const width of WIDTHS) {
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
    await showGrouped(page);
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
  }


});

/* ══ THE HONEST FILL, PAINTED (v36, Phase 2) ═════════════════════════════════════════════════ */


/* ══ DEEDS, GROUPS AND THE COUNT (v36, Phase 7) ══════════════════════════════════════════════ */

test("every asking row names what is owed, and the count says what it counts", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 950 });
  await page.waitForTimeout(1300);
  await showGrouped(page);

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
  await showGrouped(page);
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
  await showGrouped(page);
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
        /* ⚠️ THE CLAIM CHANGED WITH THE OBJECT (v39). It used to be that the bar's text was
           CENTRED in the bar, which was true of a bar holding one stack. A card is a COLUMN — the
           pill above, the line beneath — so the line sits below the centre by design and measuring
           its drift would report the layout as a fault. What must still hold is that the contents
           stay INSIDE the card: a pill or a line escaping its own box is the thing a reader sees.
           (No backticks in here: this is inside an evaluate template and one would close it.) */
        const lbl = b.querySelector(".tl-line");
        const pil = b.querySelector(".tl-pill");
        if (!lbl || !pil) return null;
        const l1 = lbl.querySelector(".tl-hl");
        if (!l1 || !l1.textContent) return null;
        const br = b.getBoundingClientRect();
        const lr = lbl.getBoundingClientRect();
        return {
          /* how far the contents escape the card, on either edge — 0 where they are contained */
          drift: +Math.max(0, br.top - Math.min(lr.top, pil.getBoundingClientRect().top),
                              Math.max(lr.bottom, pil.getBoundingClientRect().bottom) - br.bottom).toFixed(2),
          display: getComputedStyle(b).display,
          dir: getComputedStyle(b).flexDirection,
          justify: getComputedStyle(b).justifyContent,
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

  /**
   * ⚠️ THE BOARD PAINTS NOTHING NOW (v39 part two, Phase 1), so its computed background is
   * transparent by design rather than by omission. It used to carry `--tl-ground` (#faf7f2) and
   * the list wrapper carried another tone on top of it, stacked on the shell's panel — three
   * surfaces, so the lane sat on a ground that was neither the board's nor the panel's.
   *
   * The claim moved rather than lapsing: that there is ONE ground from the masthead to the foot of
   * the board is asserted in `calGround.measure.ts`, by sampling PAINTED pixels at four points
   * across three widths and three ranges. A declared colour on one element could never have made
   * that claim — it is exactly what was true here while the board looked wrong.
   */
  expect(r.ground, "the board paints a surface of its own again").toBe("rgba(0, 0, 0, 0)");
  /* ⚠️ THE GROUP CARD DRAWS NO SURFACE SINCE v39 PART TWO. It carried `--tl-row`, which was one of
     the two tones the calendar painted under the shell's panel. It keeps its border and its radius
     — those separate one group from the next without adding a ground — and the claim that a
     heading is not inside it, below, is untouched. */
  expect(r.card.bg, "the group card paints a surface again").toBe("rgba(0, 0, 0, 0)");
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
    /* ⚠️ A COLUMN SINCE v39, so the vertical centring moved axis. It was `align-items: center` on a
       row holding one text stack; the card stacks the pill above the line, so what centres them
       between the card's own edges is `justify-content`. Same claim — the contents sit in the
       middle of the card — asserted on the axis that now carries it. */
    expect(b.display).toBe("flex");
    expect(b.dir).toBe("column");
    expect(b.justify).toBe("center");
    expect(b.drift, `a card's contents escape its box by ${b.drift}px`).toBeLessThanOrEqual(1);
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
        if (!fl) { drop.noFill++; continue; }
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
        /* ⚠️ THE PAST IS A FALLOFF, SO ONE SAMPLE CANNOT DESCRIBE IT. Three positions across the
           washed span, each carrying the fraction of the gradient it sits at, so the claim can be
           the composite AT THAT POINT rather than one flat colour that no longer exists. */
        const pastW = tx - lr.left;
        /* ⚠️ EVERY PROBE IS OWNERSHIP-GUARDED, not just the pair either side of today. The first
           draft guarded only those two, so a falloff sample was free to land on a bar, a chip or
           the panel edge — and one did: it read pure white at 60% across the past and reported the
           ground as unwashed. A sample that is not on the surface being asked about is a true
           number about the wrong thing. */
        /* ⚠️ THE LANE ITSELF MUST BE TOPMOST, not merely an ancestor of what is. A lane CONTAINS
           its bars, so a containment test passes on a pixel belonging to a bar's white track —
           which is exactly what happened: a probe read pure white at 60% across the past and
           reported the ground as unwashed. Ownership by containment answers a different question
           from ownership by paint. */
        const probes = [0.25, 0.6, 0.95].map((f) => {
          const x = lr.left + pastW * f;
          return topAt(x, y) === lane ? { f, paint: at(x, y) } : null;
        }).filter(Boolean);
        /* and a row that could not give three clean samples is skipped rather than half-measured */
        if (probes.length < 3) continue;
        ground.push({ key: Math.round(lr.top) + ':' + Math.round(y),
                      nm: (row.querySelector(".tl-nm2") || {}).textContent,
                      probes, pastW: Math.round(pastW),
                      past: at(tx - 6, y), ahead: at(tx + 6, y) });
      }
      return { bars, ground, drop };
    })(${JSON.stringify(shot)})`,
  )) as { bars: any[]; ground: any[] };


/* ══ THE RAIL, AND THE ONE CLAIM THAT DECIDES WHETHER IT IS BUILT (v36 part two, Phase 4) ════ */

test("⚠️ a rail tick lands on the same pixel as that date inside a card lane", async ({ page }) => {
  /* ⚠️ SPLICED, NEVER RETYPED — the labels come from the control's own table (v54). */
  for (const [idx, label] of RANGE_LABELS.map((l, i) => [i, l] as const)) {
    await openRoute(page, "/todo/calendar", { width: 1440, height: 980 });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
    await setRangeTo(page, idx);

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

  expect(r.chip.bg, "the today chip").toBe("rgb(28, 19, 15)");
  expect(r.stem.colour, "the today stem").toBe("rgb(28, 19, 15)");
  /* ⚠️ THE USED WIDTH ROUNDS. The stylesheet declares 1.5px and Chromium reports 1px at DPR 1 —
     a browser rounding a sub-pixel border, not a value that drifted. The DECLARED 1.5px is
     asserted in `barTokens.test.ts`, where a source lock is the right instrument; here the honest
     rendered claim is that the stem is painted, and painted burgundy. */
  expect(parseFloat(r.stem.w), "the today stem has no width").toBeGreaterThan(0);
});

/* ══ THE FILL EDGE IS TODAY (v36 part three, Phase 1) ═══════════════════════════════════════ */


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
      expect(read.barH, `${width}px range ${r}: bar heights ${JSON.stringify(read.barH)}`).toEqual([54]);
      expect(read.mkH, `${width}px range ${r}: marker sizes ${JSON.stringify(read.mkH)}`).toEqual([28]);
      expect(read.rowH, `${width}px range ${r}: single-lane row heights ${JSON.stringify(read.rowH)}`).toEqual([62]);

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
    board.style.setProperty("--bar-h", "30px");
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

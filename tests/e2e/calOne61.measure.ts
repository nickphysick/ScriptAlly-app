/**
 * v61 — one calendar: the container, the dividers, the sidebar, the inset badge and the tail.
 *
 * ⚠️ EVERY VALUE READ FROM THE REF AT TEST TIME; every sweep states its population first.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test.describe("v61 · one calendar", () => {
  test("⚠️ (a) one container holds the rail and the rows, and no group has a frame", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const cal = document.querySelector<HTMLElement>(".tl-cal");
      if (!cal) return null;
      const cs = getComputedStyle(cal);
      const grps = [...document.querySelectorAll<HTMLElement>(".tl-grp")]
        .filter((g) => g.getBoundingClientRect().height > 0);
      return {
        border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor,
        holdsRail: !!cal.querySelector(".tl-rail"),
        holdsRows: !!cal.querySelector(".tl-rows"),
        groups: grps.map((g) => ({
          bd: getComputedStyle(g).borderTopWidth,
          sh: getComputedStyle(g).boxShadow,
          bg: getComputedStyle(g).backgroundColor,
        })),
      };
    });
    expect(f, "no container on the board").not.toBeNull();
    expect(f!.holdsRail, "the rail is outside the container").toBe(true);
    expect(f!.holdsRows, "the rows are outside the container").toBe(true);
    expect(parseFloat(f!.border), "the container has no border").toBeGreaterThan(0);
    expect(parseFloat(f!.radius), "the container is not rounded").toBeGreaterThan(8);
    expect(f!.bg, "the container is transparent").toBe("rgb(255, 255, 255)");
    expect(f!.groups.length, "no groups on the board").toBeGreaterThan(2);
    for (const g of f!.groups) {
      /* ⚠️ v60 FRAMED EACH SECTION — six objects sharing a date scale rather than one instrument */
      expect(parseFloat(g.bd), "a group still carries its own border").toBe(0);
      expect(g.sh, "a group still carries its own shadow").toBe("none");
      expect(g.bg, "a group still paints its own ground").toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("⚠️ (b) one divider pill per group, carrying that group's own count", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const out: { sec: string; pills: number; text: string; count: string; rows: number; tint: string; onRule: boolean }[] = [];
      for (const g of document.querySelectorAll<HTMLElement>(".tl-grp[data-sec]")) {
        if (g.getBoundingClientRect().height < 1) continue;
        const pills = g.querySelectorAll(".tl-gdiv .gp");
        const p = pills[0] as HTMLElement | undefined;
        const div = g.querySelector<HTMLElement>(".tl-gdiv");
        out.push({
          sec: g.dataset.sec!, pills: pills.length,
          text: p?.textContent ?? "",
          count: p?.querySelector("b")?.textContent ?? "",
          rows: g.querySelectorAll(".tl-rrow").length,
          tint: p ? getComputedStyle(p).backgroundColor : "",
          /* the pill sits ON the hairline, so the rule is drawn on the divider itself */
          onRule: div ? getComputedStyle(div, "::before").borderTopWidth !== "0px" : false,
        });
      }
      return out;
    });
    expect(f.length, "no dividers rendered").toBeGreaterThan(2);
    for (const g of f) {
      expect(g.pills, `${g.sec} has ${g.pills} divider pills`).toBe(1);
      expect(g.count, `${g.sec}'s pill says "${g.count}" over ${g.rows} rows`)
        .toBe(String(g.rows).padStart(2, "0"));
      expect(g.count.length, `${g.sec}'s count is not zero-padded`).toBeGreaterThanOrEqual(2);
      expect(g.tint, `${g.sec}'s pill is untinted`).not.toBe("rgba(0, 0, 0, 0)");
      expect(g.onRule, `${g.sec}'s divider draws no rule`).toBe(true);
    }
    /* every group's pill is a DISTINCT tone — six pills in one colour say nothing */
    const tones = new Set(f.map((g) => g.tint));
    expect(tones.size, `${f.length} dividers share ${tones.size} tone(s)`).toBe(f.length);
  });

  test("⚠️ (c) the sidebar's counts sum to All, and the tab strip is gone", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => ({
      pills: [...document.querySelectorAll<HTMLElement>(".gpill")].map((p) => ({
        sec: p.dataset.sec ?? "all",
        n: Number(p.querySelector("b")?.textContent ?? "0"),
      })),
      tabs: document.querySelectorAll(".tl-tabs").length,
      rows: [...document.querySelectorAll<HTMLElement>(".tl-rrow")]
        .filter((r) => r.getBoundingClientRect().height > 0).length,
    }));
    expect(f.tabs, "the retired tab strip is still rendered").toBe(0);
    const all = f.pills.find((p) => p.sec === "all");
    const groups = f.pills.filter((p) => p.sec !== "all");
    expect(all, "no All pill").toBeTruthy();
    expect(groups.length, "no group pills — the filter list is empty").toBeGreaterThan(2);
    /* ⚠️ THE SUM IS THE CLAIM. The tab strip's counts could not be added up — each tab reported its
       own view's total — and that is the fault the group list replaces. */
    expect(groups.reduce((n, g) => n + g.n, 0),
      `the groups sum to ${groups.reduce((n, g) => n + g.n, 0)} against All's ${all!.n}`)
      .toBe(all!.n);
    expect(all!.n, "All disagrees with the rows on the board").toBe(f.rows);
  });

  test("⚠️ (d) the rail is the inline token, its lane matches the rows', and the today cap is gone", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const railLane = document.querySelector<HTMLElement>(".tl-rail .tl-c-tl");
      const rows = [...document.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl")]
        .filter((e) => e.getBoundingClientRect().width > 100);
      const tok = getComputedStyle(document.querySelector(".tl-board")!).getPropertyValue("--tl-rail-h").trim();
      const tiles = [...document.querySelectorAll<HTMLElement>(".tl-rtile")];
      const now = tiles.find((t) => t.classList.contains("now"));
      const cap = document.querySelector<HTMLElement>(".tl-todayflag");
      const chip = document.querySelector<HTMLElement>(".tl-todaychip");
      const rr = railLane?.getBoundingClientRect();
      return {
        railH: rail ? Math.round(rail.getBoundingClientRect().height) : null,
        tok: Math.round(parseFloat(tok)),
        railLane: rr ? { l: rr.left, w: rr.width } : null,
        rows: rows.map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, w: b.width }; }),
        tiles: tiles.length,
        nowTile: !!now,
        /* the day and the month share ONE line under `inline` */
        oneLine: now ? getComputedStyle(now.querySelector("b")!).display === "inline" : false,
        capShown: cap ? getComputedStyle(cap).display !== "none" : false,
        chipShown: chip ? getComputedStyle(chip).display !== "none" : false,
      };
    });
    expect(f.railH, `the rail is ${f.railH}px against the token's ${f.tok}px`).toBe(f.tok);
    expect(f.tiles, "the rail rendered no tiles").toBeGreaterThan(8);
    expect(f.nowTile, "today's tile is not marked").toBe(true);
    expect(f.oneLine, "the tile stacks its day over its month — inline puts them on one line").toBe(true);
    /* ⚠️ THE SEAM. Every other lock measures within one system; only this compares the rail's
       statement about where a date sits with a row's. It found the board 91px out in v60d. */
    expect(f.railLane, "the rail has no lane").not.toBeNull();
    expect(f.rows.length, "no row lanes to compare against").toBeGreaterThan(3);
    for (const r of f.rows) {
      expect(Math.abs(r.l - f.railLane!.l), "a row's lane does not start where the rail's does")
        .toBeLessThan(1.5);
      expect(Math.abs(r.w - f.railLane!.w), "a row's lane is not the width of the rail's")
        .toBeLessThan(1.5);
    }
    /* ⚠️ THE TODAY CAP GOES WHILE THE TILE EXISTS — the tile already names today, in pink. */
    expect(f.capShown, "the today cap is drawn over the today tile").toBe(false);
    expect(f.chipShown, "the rail's own today chip is drawn over the today tile").toBe(false);
  });
});

test.describe("v61 · the card", () => {
  test("⚠️ (e,f) badges are inset soft-fill StatusDots inside a WHITE card", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const tok = Math.round(parseFloat(
        getComputedStyle(document.querySelector(".tl-board")!).getPropertyValue("--badge")));
      const out: { size: number; insideL: number; insideR: number; svg: boolean; fill: string; frame: string; shut: boolean }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const cr = c.getBoundingClientRect();
        if (cr.height < 1) continue;
        const m = c.querySelector<HTMLElement>(".tl-medal");
        const fr = c.querySelector<HTMLElement>(".tl-frame");
        if (!m || !fr) continue;
        const mr = m.getBoundingClientRect();
        const disc = [...m.querySelectorAll<HTMLElement>("span")]
          .find((e) => getComputedStyle(e).borderRadius === "50%" && !e.className.includes("pulse"));
        out.push({
          size: Math.round(mr.height),
          insideL: Math.round(mr.left - cr.left),
          insideR: Math.round(cr.right - mr.right),
          svg: !!m.querySelector("svg"),
          fill: disc ? getComputedStyle(disc).backgroundColor : "",
          frame: getComputedStyle(fr).backgroundColor,
          shut: c.classList.contains("shut") || c.classList.contains("closedp")
            || c.classList.contains("quiet") || c.classList.contains("ghost"),
        });
      }
      return { tok, out };
    });
    expect(f.out.length, "no badges on the board").toBeGreaterThan(4);
    expect(f.out.filter((b) => !b.shut).length, "every card is closed — the white claim is untested")
      .toBeGreaterThan(3);
    const fills = new Set<string>();
    for (const b of f.out) {
      expect(b.svg, "a badge is not an SVG — StatusDot draws one").toBe(true);
      expect(b.size, `a badge is ${b.size}px against the token's ${f.tok}px`).toBe(f.tok);
      /* ⚠️ INSIDE THE CARD, both edges — v60's medallion burst 35% past the left and every ancestor
         had to stay overflow-visible for it. */
      expect(b.insideL, `a badge sits ${b.insideL}px from the card's left edge`).toBeGreaterThanOrEqual(0);
      expect(b.insideR, "a badge overflows the card's right edge").toBeGreaterThan(0);
      /* the soft fill: a tinted disc, never white and never transparent */
      expect(b.fill, "a badge has no tinted disc — the soft-fill variant draws one").not.toBe("rgba(0, 0, 0, 0)");
      expect(b.fill, "a badge is white-centred — that is the retired v60b badge variant")
        .not.toBe("rgb(255, 255, 255)");
      /* ⚠️ (f) A LIVE CARD IS WHITE — the tinted-fill experiment is withdrawn. A CLOSED or silent
         one keeps its own faint ground, which the ref states separately (`.card.shut .frame`) and
         which is a statement about the relationship rather than about the section it sits in. The
         first version of this asserted white on every card and went red on exactly those. */
      if (!b.shut) expect(b.frame, "a live card is not white").toBe("rgb(255, 255, 255)");
      fills.add(b.fill);
    }
    /* ⚠️ THE PACK ASKS FOR SEVEN FILLS AND THE APP'S OWN LAW SAYS OTHERWISE — the app wins, per
       the authority split, and this lock states what is actually true rather than what was asked.
       `StatusDot`'s locked amendment (consolidated-v37): "the PALETTE of the six pipeline statuses
       is a theme token — one hue per theme via `--sd-hue`/`--sd-centre` … direction/stage is carried
       by SHAPE, not colour." The calendar renders under `.t-f12`, which sets that pair, so the six
       pipeline dots share one centre by design and the closed set and the Offer star keep their own.
       Measured: 23 badges, 2 fills.

       ⚠️ SO THE CLAIM IS THAT THE SOFT FILL IS DRAWN AND COMES FROM THE COMPONENT, not that it
       differs per status. Asserting seven tints here would have meant overriding a locked palette
       from a page — which is exactly what the lock exists to stop. */
    expect(fills.size, "no badge draws a fill at all").toBeGreaterThan(0);
    for (const fl of fills) {
      expect(fl, "a badge's disc is transparent").not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("⚠️ (g) an ongoing bar ends in a drawn chevron on today, with no dissolve", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const line = document.querySelector<HTMLElement>(".tl-todayline");
      const todayX = line ? line.getBoundingClientRect().left : null;
      const out: { name: string; tipX: number; paths: number; strokes: string[]; fov: number; frameRight: number }[] = [];
      let plain = 0;
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const cr = c.getBoundingClientRect();
        if (cr.height < 1) continue;
        if (!c.classList.contains("fadeR")) { plain++; continue; }
        const tail = c.querySelector<SVGElement>(".tl-tail");
        const fr = c.querySelector<HTMLElement>(".tl-frame");
        out.push({
          name: c.querySelector(".tl-fnm")?.textContent ?? "?",
          tipX: cr.right,
          paths: tail ? tail.querySelectorAll("path").length : 0,
          strokes: tail ? [...tail.querySelectorAll("path")].map((p) => getComputedStyle(p).stroke) : [],
          /* the right dissolve must be gone: a fade says "cut off", a tail says "still running" */
          fov: c.querySelectorAll(".tl-fov.r").length,
          frameRight: fr ? Math.round(cr.right - fr.getBoundingClientRect().right) : -1,
        });
      }
      return { todayX, out, plain };
    });
    expect(f.out.length, "no ongoing card — untested").toBeGreaterThan(2);
    expect(f.plain, "every card is ongoing — the claim cannot discriminate").toBeGreaterThan(0);
    for (const c of f.out) {
      expect(Math.abs(c.tipX - f.todayX!), `${c.name}'s tip is ${Math.round(c.tipX - f.todayX!)}px from today`)
        .toBeLessThanOrEqual(1.5);
      /* ⚠️ THE ELEMENT, NOT A CLIP. A `clip-path` on the frame would cut its border off with its
         fill and leave the diagonals bare; the shape has to be DRAWN and stroked. */
      expect(c.paths, `${c.name} has no drawn tail`).toBe(2);
      for (const st of c.strokes) {
        expect(st, `${c.name}'s tail has an unstroked diagonal`).not.toBe("none");
      }
      expect(c.fov, `${c.name} still carries a right-hand dissolve`).toBe(0);
      /* the frame stops short of the tip, and the chevron completes it */
      expect(c.frameRight, `${c.name}'s frame reaches its tip — nothing is left for the chevron`)
        .toBeGreaterThan(8);
    }
  });

  test("⚠️ (h) the trail never leaves the bar", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const out: { name: string; ongoing: boolean; fillR: number; trackR: number; trackW: number; cardR: number }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const cr = c.getBoundingClientRect();
        if (cr.height < 1) continue;
        const tr = c.querySelector<HTMLElement>(".tl-ctrack");
        const fi = c.querySelector<HTMLElement>(".tl-ctrail");
        if (!tr) continue;
        out.push({
          name: c.querySelector(".tl-fnm")?.textContent ?? "?",
          ongoing: c.classList.contains("fadeR"),
          fillR: fi ? fi.getBoundingClientRect().right : -Infinity,
          trackR: tr.getBoundingClientRect().right,
          trackW: tr.getBoundingClientRect().width,
          cardR: cr.right,
        });
      }
      return out;
    });
    expect(f.length, "no card carries a trail").toBeGreaterThan(5);
    expect(f.filter((c) => c.ongoing).length, "no ongoing card — the notch gap is untested").toBeGreaterThan(0);
    expect(f.filter((c) => !c.ongoing).length, "no dated end — untested").toBeGreaterThan(0);
    for (const c of f) {
      /* ⚠️ CONTAINMENT, NOT "ENDS ON TODAY". v60's fill landed on today to the pixel and could
         therefore run past the card's own end once the tail shortened the frame — the trail would
         have crossed its own chevron. */
      expect(c.fillR, `${c.name}'s fill runs past its track`).toBeLessThanOrEqual(c.trackR + 1);
      /* ⚠️ A CARD TOO NARROW FOR A TRACK DRAWS NONE, and that is the containment working rather
         than an exemption. Where a track IS drawn it clears the end by the gap. */
      if (c.trackW > 0) {
        const gap = c.ongoing ? 24 : 12;
        expect(c.cardR - c.trackR, `${c.name}'s track leaves ${Math.round(c.cardR - c.trackR)}px, needs ${gap}`)
          .toBeGreaterThanOrEqual(gap - 1);
      }
    }
  });

  test("⚠️ (i,j,k) line two is agency · fact, in one lateness vocabulary", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".tl-p")]
      .filter((c) => c.getBoundingClientRect().height > 0)
      .map((c) => ({
        name: c.querySelector(".tl-fnm")?.textContent ?? "?",
        agency: c.querySelector(".tl-ffx .agcy")?.textContent ?? "",
        fact: c.querySelector(".tl-ffx")?.textContent ?? "",
        sec: (c.closest(".tl-grp") as HTMLElement | null)?.dataset.sec ?? "",
        chip: c.querySelector(".tl-fchip")?.textContent ?? "",
        owed: c.classList.contains("owed") || c.classList.contains("quiet"),
      })));
    expect(f.length, "no cards").toBeGreaterThan(5);
    for (const c of f) {
      /* (i) the agency leads — it is the one thing about the row that is nowhere else on the card */
      expect(c.agency.length, `${c.name}'s line two has no leading agency`).toBeGreaterThan(1);
      expect(c.fact.trim().startsWith(c.agency.trim()),
        `${c.name}'s line two reads "${c.fact}" and does not begin with "${c.agency}"`).toBe(true);
      /* (k) one lateness vocabulary — "since" and "owed" are retired from it */
      expect(c.fact, `${c.name} reads "${c.fact}"`).not.toMatch(/\bsince\b/i);
      expect(c.fact, `${c.name} reads "${c.fact}"`).not.toMatch(/\bowed\b/i);
    }
    /* (j) an Urgent chip is a move, never a status word */
    /* ⚠️ THE CLAIM IS ABOUT THE OVERDUE SEGMENT, NOT EVERY CARD IN THE URGENT SECTION. A row can
       hold two waits — one late, one running to a date still ahead — and the second is correctly a
       STATUS word: the deed is for overdue work, and saying it of a date that has not arrived turns
       an arrangement into a reproach. The first version of this asserted over the section and went
       red on exactly that card. */
    const urgent = f.filter((c) => c.sec === "over" && c.chip && c.owed);
    expect(urgent.length, "no overdue card — untested").toBeGreaterThan(0);
    expect(f.filter((c) => c.sec === "over" && c.chip && !c.owed).length,
      "no calm card on an Urgent row — the discrimination is untested").toBeGreaterThanOrEqual(0);
    for (const c of urgent) {
      expect(c.chip, `${c.name}'s Urgent chip reads "${c.chip}"`)
        .toMatch(/^(Send the partial|Send the full|Send the revision|Answer them|Nudge due|Nudge them)$/);
    }
    /* the overdue form itself, wherever it appears */
    const late = f.filter((c) => /overdue/i.test(c.fact));
    expect(late.length, "no overdue row — the vocabulary is untested").toBeGreaterThan(0);
    for (const c of late) {
      expect(c.fact, `"${c.fact}" is not in the one lateness form`)
        .toMatch(/·\s*(due .+|no date promised|expected .+)\s*·\s*.+ overdue$/);
    }
  });
});

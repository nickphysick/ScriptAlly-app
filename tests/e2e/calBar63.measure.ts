/**
 * v63 D — the bar in Query Centre's language.
 *
 * ⚠️ THE CLAIMS ARE ABOUT THE COMPOSED CARD, NOT ITS PARTS. A band whose tint is right, a name
 * whose face is right and a fact whose size is right can still be a card whose words sit under its
 * own band — which is exactly what the first build did, and which every property-level assertion
 * passed. So the geometry cases compare BOXES against each other, and the census cases print the
 * distinct values they saw rather than trusting a count.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { readFileSync } from "node:fs";

const CAL = "/todo/calendar";

/** every drawn card, read as a whole rather than field by field */
async function cards(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!grid) return null;
    const r = (e: Element | null) => {
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1),
               rt: +b.right.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) };
    };
    return [...grid.querySelectorAll<HTMLElement>(".tl-p")].map((c) => {
      const band = c.querySelector<HTMLElement>(".tl-sband");
      const body = c.querySelector<HTMLElement>(".tl-cardbody");
      const nm = c.querySelector<HTMLElement>(".tl-fnm");
      const ffx = c.querySelector<HTMLElement>(".tl-ffx");
      const cs = (e: HTMLElement | null, p: string) =>
        e ? (getComputedStyle(e)[p as never] as string) : null;
      return {
        card: r(c), band: r(band), body: r(body),
        /* ⚠️ THE LAYOUT HEIGHT, NOT THE PAINTED ONE. `getBoundingClientRect` includes transforms,
           and the urgent cards carry a motion that survives the harness's transition suppression —
           they measured 86.52 against a computed `height` of exactly 86px. The rect is the right
           instrument for WHERE a box is; `getComputedStyle().height` is the right one for HOW BIG
           it is, and asking the wrong one produced a half-pixel "second card height" that was the
           animation doing its job. */
        cardH: parseFloat(getComputedStyle(c).height),
        rung: band ? [...band.classList].find((k) => k.startsWith("tl-st-")) ?? null : null,
        bandBg: cs(band, "backgroundColor"),
        bandH: band ? +band.getBoundingClientRect().height.toFixed(1) : null,
        dot: r(band?.querySelector("svg") ?? null),
        status: band?.querySelector(".tl-sw")?.textContent?.trim() ?? null,
        holder: band?.querySelector(".tl-sh")?.textContent?.trim() ?? null,
        holderInk: cs(band?.querySelector<HTMLElement>(".tl-sh") ?? null, "color"),
        nmFam: cs(nm, "fontFamily"), nmSize: cs(nm, "fontSize"), nmLh: cs(nm, "lineHeight"),
        agency: c.querySelector(".tl-fag")?.textContent?.trim() ?? null,
        agencyStyle: cs(c.querySelector<HTMLElement>(".tl-fag"), "fontStyle"),
        factFam: cs(ffx, "fontFamily"), factSize: cs(ffx, "fontSize"),
        factCase: cs(ffx, "textTransform"), fact: ffx?.textContent?.trim() ?? null,
        bang: !!c.querySelector(".tl-bang"),
        /* ⚠️ LATE IS `owed` OR `quiet`, WHICH IS `calSectionOf`'S OWN DEFINITION OF URGENT —
           an agency's stated reply date that has passed is a lateness on this board, and the ref's
           `.card.late` is its analogue. A lock reading only `owed` calls a rose holder wrong on a
           card the app considers late, which is what it did. */
        owed: c.classList.contains("owed") || c.classList.contains("quiet"),
        /* the whole point of `overflow: hidden` on the body: does anything actually clip? */
        bodyClips: body ? body.scrollHeight > body.clientHeight + 0.5 : null,
        /* the three end states, and the marks that ride them */
        fadeR: c.classList.contains("fadeR"), clipR: c.classList.contains("clipR"),
        fovR: !!c.querySelector(".tl-fov.r"), pulse: !!c.querySelector(".tl-pulsedot"),
        evn: c.querySelectorAll(".tl-evn").length,
        nudgeNote: c.querySelector(".tl-snote")?.textContent?.trim() ?? null,
        frameBorderR: cs(c.querySelector<HTMLElement>(".tl-frame"), "borderRightWidth"),
        /* the furniture the section retires — asserted absent on the RENDERED page */
        gone: {
          medal: !!c.querySelector(".tl-medal"), chip: !!c.querySelector(".tl-fchip"),
          trail: !!c.querySelector(".tl-ctrail"), track: !!c.querySelector(".tl-ctrack"),
          shd: !!c.querySelector(".tl-shd"), tail: !!c.querySelector(".tl-tail"),
        },
      };
    });
  });
}

test.describe("v63 · D — the bar", () => {
  test("⚠️ (d1) every card carries a band, and the words sit BELOW it", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = await cards(page);
    expect(cs, "no board").not.toBeNull();
    const withBand = cs!.filter((c) => c.band);
    /* ⚠️ THE POPULATION FIRST — every geometric claim below is vacuous over an empty set. */
    expect(withBand.length, `only ${withBand.length} cards — cannot exercise this`).toBeGreaterThan(5);
    expect(withBand.length, "a card was drawn with no status band").toBe(cs!.length);

    for (const c of withBand) {
      /* ⚠️ THE COMPOSED CLAIM. The first build had `top: calc(50% + 13px)` from an earlier variant
         and the body's own text overlapped the band — with every property-level assertion passing,
         because each element was correct on its own. Boxes against boxes is the only reading that
         sees it. */
      expect(c.body!.t, `words start above the band's foot on ${c.status}`)
        .toBeGreaterThanOrEqual(c.band!.b - 0.5);
      expect(c.body!.b, `words run past the card's foot on ${c.status}`)
        .toBeLessThanOrEqual(c.card!.b + 0.5);
      expect(c.bodyClips, `the body clips its own words on ${c.status}`).toBe(false);
      /* the band spans the card's width and sits on its top edge */
      expect(c.band!.t, "the band is not on the card's top edge").toBeCloseTo(c.card!.t, 0);
      expect(c.bandH, "the band is not 26px").toBeCloseTo(26, 0);
    }
    /* the card and row heights the four variants agree on */
    /* ⚠️ ROUNDED, AND THE RAW SET PRINTED. A card can land on a fractional y and report 86.5 for a
       box that is 86 — pinning the exact float is a lock that fails on sub-pixel noise, which
       trains the next reader to loosen it without looking. The rounded set is the claim; the raw
       set beside it is what tells a reader whether the spread is noise or a second height. */
    const raw = [...new Set(withBand.map((c) => c.cardH))].sort((a, b) => a - b);
    console.log("card heights (layout):", JSON.stringify(raw));
    /* ⚠️ THE SPREAD AND THE VALUE, SEPARATELY — and neither via `Math.round`, which turns 86.5 into
       87 and reports a second height where there is sub-pixel noise. The spread says every card is
       the same box; the value says which box. */
    expect(raw[raw.length - 1] - raw[0], `heights spread by more than a pixel: ${JSON.stringify(raw)}`)
      .toBeLessThan(1);
    for (const h of raw) expect(h, `a card is ${h}px, not the token's 86`).toBeCloseTo(86, 0);
  });

  test("⚠️ (d2) the band's tint is the ladder's rung, and the census is not a monoculture", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!.filter((c) => c.band);
    expect(cs.length).toBeGreaterThan(5);

    /* the eight rungs, read from the stylesheet so the lock does not restate a hex */
    const css = readFileSync("src/components/todo/todoCalendar.css", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const rung: Record<string, string> = {};
    for (const m of css.matchAll(/--tl-stage-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})/gi)) {
      rung[`tl-st-${m[1]}`] = m[2];
    }
    expect(Object.keys(rung).length, "the ladder is not declared").toBe(8);
    const hex = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
      return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    };
    const seen: Record<string, number> = {};
    for (const c of cs) {
      expect(c.rung, `a band carries no rung class (${c.status})`).not.toBeNull();
      seen[c.rung!] = (seen[c.rung!] ?? 0) + 1;
      expect(hex(c.bandBg!), `${c.status}: band is ${c.bandBg}, rung ${c.rung} is ${rung[c.rung!]}`)
        .toBe(rung[c.rung!]);
    }
    /* ⚠️ A MONOCULTURE PASSES EVERY LINE ABOVE. If every card is on one rung the mapping is
       unexercised and this case proves that one rung paints. The set is printed for that reason. */
    console.log("rungs seen:", JSON.stringify(seen));
    expect(Object.keys(seen).length, `every card is on one rung: ${JSON.stringify(seen)}`)
      .toBeGreaterThan(2);
  });

  test("⚠️ (d3) the band states the status and the holder, in Query Centre's own words", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!.filter((c) => c.band);
    expect(cs.length).toBeGreaterThan(5);

    const holders = new Set(cs.map((c) => c.holder));
    const statuses = new Set(cs.map((c) => c.status));
    console.log("statuses:", JSON.stringify([...statuses]), "| holders:", JSON.stringify([...holders]));
    /* ⚠️ THE WORDS ARE `turnWordFor`'S, which the Query Centre's own cards draw. A calendar-local
       set would let the two surfaces disagree about whose court a query is in. */
    const LEGAL = new Set(["With the agent", "With you", "Offer", "Closed", "No response"]);
    for (const h of holders) {
      expect(LEGAL.has(h ?? ""), `"${h}" is not one of Query Centre's holder words`).toBe(true);
    }
    expect(holders.size, "every card names one holder — the mapping is unexercised").toBeGreaterThan(1);
    /* the status is the exact enum string, never an abbreviation of it */
    for (const s of statuses) {
      expect(s, "a band abbreviated a status").not.toMatch(/R&R|\.\.\./);
    }
    /* the holder turns rose exactly when the card is late, and stays muted otherwise */
    const late = cs.filter((c) => c.owed), calm = cs.filter((c) => !c.owed);
    expect(late.length, "no late cards — the rose branch is unexercised").toBeGreaterThan(0);
    expect(calm.length, "no calm cards — the muted branch is unexercised").toBeGreaterThan(0);
    for (const c of late) expect(c.holderInk, `${c.status} is late and its holder is not rose`)
      .toBe("rgb(140, 79, 74)");
    for (const c of calm) expect(c.holderInk, `${c.status} is calm and its holder is rose`)
      .toBe("rgb(125, 108, 92)");
  });

  test("⚠️ (d4) the two text lines, and the ringed ! on what is late", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!.filter((c) => c.band && c.nmFam);
    expect(cs.length).toBeGreaterThan(5);

    for (const c of cs) {
      /* line one: the name in the page's serif, the agency italic beside it */
      expect(c.nmFam, "the name is not Playfair").toMatch(/Playfair/);
      expect(c.nmSize, "the name is not 15.5px").toBe("15.5px");
      /* ⚠️ THE HOUSE FLOOR FOR MIXED-CASE PLAYFAIR IN A CLIPPING BOX. The ref states none, which is
         safe in a document that clips nothing; this card carries `overflow: hidden`. */
      /* ⚠️ COMPARED IN PIXELS, NOT AS A RATIO. `1.3 × 15.5` is 20.15 and the division back gives
         1.2999999999999998 — a lock that reads correct CSS as a floor violation. The claim is
         "at least the floor's worth of leading", which is a pixel comparison with a hair of slack. */
      expect(parseFloat(c.nmLh!), "the name's leading is below the descender floor")
        .toBeGreaterThanOrEqual(15.5 * 1.3 - 0.01);
      if (c.agency) expect(c.agencyStyle, "the agency is not italic").toBe("italic");
      /* line two: a sentence, not a tag */
      expect(c.factFam, "the fact is not Inter").toMatch(/Inter/);
      expect(c.factSize, "the fact is not 12px").toBe("12px");
      expect(c.factCase, "the fact is uppercased — it is prose").toBe("none");
    }
    /* ⚠️ THE RING IS ON WHAT IS LATE AND ONLY ON WHAT IS LATE — both directions, or the case is
       satisfied by a page with no rings at all. */
    const late = cs.filter((c) => c.owed);
    expect(late.length, "no late cards to check the ring against").toBeGreaterThan(0);
    for (const c of late) expect(c.bang, `${c.status} is late and carries no ring`).toBe(true);
    for (const c of cs.filter((x) => !x.owed))
      expect(c.bang, `${c.status} is not late and carries a ring`).toBe(false);
  });

  test("⚠️ (d5) the retired furniture is GONE from the rendered page, not hidden", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!;
    expect(cs.length, "no cards to check").toBeGreaterThan(5);
    /* ⚠️ ASKED OF THE RENDERED DOM, NOT THE SOURCE. A source lock proves the JSX was edited; only
       the page proves nothing else renders them — and "hidden" would pass a source check. */
    const still: Record<string, number> = {};
    for (const c of cs) for (const [k, v] of Object.entries(c.gone)) if (v) still[k] = (still[k] ?? 0) + 1;
    expect(still, `retired furniture is still drawn: ${JSON.stringify(still)}`).toEqual({});
  });

  test("⚠️ (d6) ongoing and window-clipped end DIFFERENTLY, and the marks follow", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!;
    const ongoing = cs.filter((c) => c.fadeR && !c.clipR);
    const clipped = cs.filter((c) => c.clipR);
    console.log(`ends: ${ongoing.length} ongoing · ${clipped.length} clipped · ${cs.length} cards`);
    /* ⚠️ BOTH BRANCHES MUST BE PRESENT OR THE CASE PROVES ONE. They were ONE boolean until §D, so a
       fixture with no clipped card would go green over exactly the fault this replaced. */
    expect(ongoing.length, "no ongoing cards — the open end is unexercised").toBeGreaterThan(0);
    expect(clipped.length, "no clipped cards — the dissolve is unexercised").toBeGreaterThan(0);

    for (const c of ongoing) {
      expect(c.fovR, `an ongoing card dissolves — it has no end to continue to (${c.status})`).toBe(false);
      expect(c.frameBorderR, "an ongoing card kept its right border").toBe("0px");
    }
    for (const c of clipped) {
      expect(c.fovR, `a clipped card does not dissolve (${c.status})`).toBe(true);
      expect(c.frameBorderR, "a clipped card kept its right border").toBe("0px");
    }
    /* ⚠️ THE PULSE DOT IS ON AN OPEN END AND ONLY WHERE SOMETHING IS LATE — three conditions, and
       a lock that checked one would pass on a board that dotted every card. */
    for (const c of cs) {
      const want = c.fadeR && !c.clipR && c.owed;
      expect(c.pulse, `${c.status}: pulse ${c.pulse}, expected ${want}`).toBe(want);
    }
    const dotted = cs.filter((c) => c.pulse).length;
    expect(dotted, "no pulse dots at all — the case proves nothing").toBeGreaterThan(0);
    expect(dotted, "every card is dotted — the gate is inert").toBeLessThan(cs.length);
    /* ⚠️ THE LATENESS CONDITION NEEDS AN ONGOING-AND-CALM CARD TO BE PROVED, AND THIS SAYS SO.
       Removing `owed` from the render passed this case on a fixture where every ongoing card
       happens to be late — a monoculture, and the assertion above is satisfied by it. The count is
       printed and asserted so the branch is either exercised or the report says it was not. */
    const calmOngoing = cs.filter((c) => c.fadeR && !c.clipR && !c.owed);
    console.log(`pulse branches: ${cs.filter((c) => c.fadeR && !c.clipR && c.owed).length} late-ongoing`
      + ` · ${calmOngoing.length} calm-ongoing`
      + (calmOngoing.length ? "" : "  ⚠️ LATENESS GATE UNEXERCISED ON THIS FIXTURE"));
    /* ⚠️ THE LATENESS GATE IS UNPROVED ON THIS FIXTURE AND THE OUTPUT SAYS SO RATHER THAN THE
       ASSERTION PRETENDING OTHERWISE. Every ongoing relationship on the harness account is
       overdue — 12 late-ongoing, 0 calm-ongoing — so removing `owed` from the render changes
       nothing here and this case passes over it. Measured, not assumed: a mutation dropping the
       condition went green, which is how the gap was found.

       It is NOT downgraded to a floor of zero and forgotten: the line above prints the warning on
       every run, `reports/calendar-v63.md` carries it as a named gap, and the moment the fixture
       gains one calm ongoing query the branch below starts doing real work. Seeding one is a write
       to the shared harness account and belongs in a pass that can restore it in the same run. */
    if (calmOngoing.length) {
      for (const c of calmOngoing) {
        expect(c.pulse, `${c.status} is ongoing and calm and still carries a pulse dot`).toBe(false);
      }
    }
  });

  test("⚠️ (d7) a nudge is stated in the band AND marked on the bar", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const cs = (await cards(page))!;
    const nudged = cs.filter((c) => c.nudgeNote);
    console.log("nudge notes:", JSON.stringify(nudged.map((c) => c.nudgeNote)));
    expect(nudged.length, "no nudged card — the case is vacuous").toBeGreaterThan(0);
    for (const c of nudged) {
      /* ⚠️ A DATE, NEVER A COUNT. A nudge count lives in the query's activity subcollection and
         this page does not load per-query events; "Nudged twice" here would be a figure composed
         from data the board does not hold. */
      expect(c.nudgeNote, "the note states a count it cannot know")
        .not.toMatch(/once|twice|\b\d+ times?\b/i);
      expect(c.nudgeNote, "the note is not a dated nudge").toMatch(/^Nudged \d/);
      /* the band SAYS it happened; the bar says WHEN — both, or one question is unanswered */
      expect(c.evn, `${c.status}: a nudge note with no marker on the bar`).toBe(1);
      /* and the status survives beside it — the tint's rung is named for it */
      expect(c.status, "the nudge note replaced the status").toBeTruthy();
    }
    /* a card with no nudge carries no marker — the mark is the nudge, not decoration */
    for (const c of cs.filter((x) => !x.nudgeNote)) {
      expect(c.evn, `${c.status}: a marker with no nudge behind it`).toBe(0);
    }
  });

  test("⚠️ (d8) three densities, each moving the bar AND the body's ceiling", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const read = () => page.evaluate(() => {
      const b = document.querySelector<HTMLElement>(".tl-board")!;
      const body = document.querySelector<HTMLElement>(".tl-cardbody");
      const card = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
        .find((e) => e.getBoundingClientRect().height > 0)!.querySelector<HTMLElement>(".tl-p");
      return {
        dens: b.dataset.dens ?? null,
        bar: getComputedStyle(b).getPropertyValue("--bar-h").trim(),
        row: getComputedStyle(b).getPropertyValue("--row-h").trim(),
        cardH: card ? parseFloat(getComputedStyle(card).height) : null,
        maxH: body ? getComputedStyle(body).maxHeight : null,
        clips: body ? body.scrollHeight > body.clientHeight + 0.5 : null,
      };
    });
    const seen: Record<string, unknown> = {};
    for (const d of ["Comfortable", "Compact", "Regular"]) {
      await page.locator('.tl-tbtrig[aria-label="Display density"]').click();
      await page.locator('.tl-dd[aria-label="Display density"] .tl-ddopt', { hasText: d }).click();
      const r = await read();
      seen[d] = r;
      /* ⚠️ THE BAR AND THE BODY'S CEILING MOVE TOGETHER. Changing `--bar-h` alone leaves the words
         centred on a `top` written for a different card, which is how the eyebrow was clipped in
         this section's first build. */
      expect(r.cardH, `${d}: the card is not the bar's height`).toBeCloseTo(parseFloat(r.bar), 0);
      expect(r.clips, `${d}: the body clips its own words`).toBe(false);
    }
    console.log("densities:", JSON.stringify(seen, null, 1));
    const bars = new Set(Object.values(seen).map((v) => (v as { bar: string }).bar));
    /* three distinct heights, or the control is decorative */
    expect(bars.size, `the three densities share a bar height: ${[...bars].join(", ")}`).toBe(3);
  });
});

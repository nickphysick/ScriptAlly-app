/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FIX PACK 7 — the two "Test:" lines the pack states, measured on the deployed dev build.
 *
 * ⚠️ THESE ARE THE CLAUSES A SOURCE LOCK CANNOT REACH. `queryCentrePolish.test.ts` asserts the rules
 * were WRITTEN; only a laid-out page says they APPLIED — that the ring's rule beat the border it
 * replaced, that the header's fill is actually clipped by the frame, that no child raised itself
 * above the ring. Everything here reads computed style and geometry from the running app.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * The pack's own tones, resolved once from the running page rather than retyped as hexes.
 *
 * ⚠️ NORMALISED TO `rgb()` AT THE SOURCE. A token's declared value is a hex; every computed style
 * that reads it comes back as `rgb(…)`, so comparing the two fails on notation while agreeing on
 * colour — which is what all three cases did on their first run, reporting "the header is not the
 * sidebar's parchment" about `rgb(239, 231, 219)` against `#efe7db`. The page resolves both sides
 * through the same `color` computation, so the comparison is of COLOUR and cannot be defeated by
 * `#fff` versus `#ffffff` either.
 */
const tokens = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const root = (document.querySelector(".f12-root") ?? document.documentElement) as HTMLElement;
  const probe = document.createElement("span");
  probe.style.display = "none";
  root.appendChild(probe);
  const get = (n: string) => {
    probe.style.color = "";
    probe.style.color = `var(${n})`;
    const v = getComputedStyle(probe).color;
    return v;
  };
  const out = { line: get("--line"), rail: get("--shell-rail"), pinkT: get("--pink-t"), pinkAv: get("--pink-av"), white: get("--white"), burg: get("--burg") };
  probe.remove();
  return out;
});

test("§2 — the rim surrounds the card at the header's vertical range as well as the body's", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const t = await tokens(page);

  const read = () => page.evaluate(() => {
    const card = document.querySelector(".qp-cols .f12-card") as HTMLElement | null;
    if (!card) return null;
    const frame = card.querySelector(":scope > .f12-cfr") as HTMLElement | null;
    const head = card.querySelector(".f12-chh") as HTMLElement | null;
    const ring = getComputedStyle(card, "::after");
    const C = card.getBoundingClientRect();
    const H = head ? head.getBoundingClientRect() : null;
    return {
      cardBorder: getComputedStyle(card).borderTopWidth,
      cardOverflow: getComputedStyle(card).overflow,
      cardPosition: getComputedStyle(card).position,
      frameOverflow: frame ? getComputedStyle(frame).overflow : null,
      frameRadius: frame ? getComputedStyle(frame).borderTopLeftRadius : null,
      ringShadow: ring.boxShadow,
      ringRadius: ring.borderTopLeftRadius,
      ringPointer: ring.pointerEvents,
      ringBox: { w: parseFloat(ring.width), h: parseFloat(ring.height) },
      cardBox: { w: C.width, h: C.height },
      headBg: head ? getComputedStyle(head).backgroundColor : null,
      headSize: head ? getComputedStyle(head).fontSize : null,
      headRadius: head ? getComputedStyle(head).borderTopLeftRadius : null,
      /* the header's own box must sit INSIDE the card's, on every side it shares — if its fill were
         painting over the rim it would have to reach the card's outer edge */
      headInset: H ? { left: H.left - C.left, right: C.right - H.right, top: H.top - C.top } : null,
      /* nothing inside the card may raise itself above the ring */
      raised: Array.from(card.querySelectorAll("*")).filter((e) => {
        const c = getComputedStyle(e as HTMLElement);
        return c.zIndex !== "auto" && Number(c.zIndex) > 0;
      }).map((e) => (e as HTMLElement).className),
    };
  });

  const rest = await read();
  expect(rest, "no card in the pane").not.toBeNull();
  await page.locator(".qp-cols .f12-card").first().hover();
  await page.waitForTimeout(200);
  const hover = await read();

  console.log(`\n§2  rim tone --line = ${t.line}\n` + JSON.stringify({ rest, hover }, null, 1));

  for (const [state, g] of [["rest", rest!], ["hover", hover!]] as const) {
    /* the rim is a ring, and the card draws no border that could double it */
    expect(g.cardBorder, `${state}: the card took a border back`).toBe("0px");
    expect(g.cardPosition, `${state}: the ring has nothing to position against`).toBe("relative");
    expect(g.cardOverflow, `${state}: the card clips — it would clip its own ring`).toBe("visible");
    expect(g.ringShadow, `${state}: the ring is not 1px of --line`).toContain(t.line);
    expect(g.ringShadow, `${state}: the ring is not an inset ring`).toContain("inset");
    expect(g.ringPointer, `${state}: the ring intercepts clicks`).toBe("none");
    /* it covers the whole card — so the rim exists across the header's vertical range and the body's */
    expect(Math.round(g.ringBox.w), `${state}: the ring is narrower than the card`).toBe(Math.round(g.cardBox.w));
    expect(Math.round(g.ringBox.h), `${state}: the ring is shorter than the card`).toBe(Math.round(g.cardBox.h));
    /* the frame clips, so the header's fill stops at the radius rather than squaring the corners */
    expect(g.frameOverflow, `${state}: the frame stopped clipping`).toBe("hidden");
    expect(g.frameRadius, `${state}: the frame did not inherit the card's radius`).toBe(g.ringRadius);
    expect(g.headRadius, `${state}: the header grew a radius of its own`).toBe("0px");
    /* the header sits inside the card's box on all three shared sides — its fill cannot reach the rim */
    for (const side of ["left", "right", "top"] as const) {
      expect(g.headInset![side], `${state}: the header reaches the card's ${side} edge`).toBeGreaterThanOrEqual(0);
    }
    expect(g.raised, `${state}: something inside the card raised itself above the ring`).toEqual([]);
  }
});

test("§1/§3/§5 — parchment headers, a white plate, and one button family", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const t = await tokens(page);
  const g = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const cs = (s: string) => { const e = q(s); return e ? getComputedStyle(e) : null; };
    const head = cs(".qp-cols .f12-chh");
    const plate = cs(".f12-heroband");
    /* ⚠️ AN ENABLED NEIGHBOUR. The first standard button in this row is Nudge, which is disabled
       whenever no chase is due and wears the disabled rim tone — so an unqualified selector compared
       the primary against a GREYED control and reported a tone difference §5 never made. */
    const std = q(".qc-phead .qc-btn:not(.qc-btn-pri):not(.qc-btn-off):not(:disabled)");
    const pri = q(".qc-phead .qc-btn-pri");
    return {
      headBg: head?.backgroundColor, headSize: head?.fontSize, headRule: head?.borderBottomColor,
      plateBg: plate?.backgroundColor, plateShadow: plate?.boxShadow !== "none",
      std: std ? { w: getComputedStyle(std).borderTopWidth, c: getComputedStyle(std).borderTopColor, bg: getComputedStyle(std).backgroundColor, h: std.getBoundingClientRect().height } : null,
      pri: pri ? { w: getComputedStyle(pri).borderTopWidth, c: getComputedStyle(pri).borderTopColor, bg: getComputedStyle(pri).backgroundColor, h: pri.getBoundingClientRect().height } : null,
    };
  });
  console.log(`\n§1/§3/§5  --shell-rail ${t.rail} · --white ${t.white}\n` + JSON.stringify(g, null, 1));

  /* §1 — the header is the sidebar's ground, at 18px, with the rim's tone beneath it */
  expect(g.headBg, "the card header is not the sidebar's parchment").toBe(t.rail);
  expect(g.headSize, "the card title is not 18px").toBe("18px");
  expect(g.headRule, "the rule beneath the header is not the rim's tone").toBe(t.line);
  /* §3 — the plate is white and still lifted: the parent, not a peer of the headers */
  expect(g.plateBg, "the agent plate took the headers' parchment").toBe(t.white);
  expect(g.plateBg, "the agent plate is not white").not.toBe(t.rail);
  expect(g.plateShadow, "the plate lost the lift that says it is the parent").toBe(true);
  /* §5 — one family; the difference is the rim's weight, and nothing else */
  expect(g.std, "no standard button in the row").not.toBeNull();
  expect(g.pri, "no primary in the row").not.toBeNull();
  expect(g.pri!.bg, "the primary kept a fill of its own").toBe(g.std!.bg);
  expect(g.pri!.c, "the primary's rim is a different tone, not a different weight").toBe(g.std!.c);
  expect(parseFloat(g.pri!.w), "the primary's rim is not heavier").toBeGreaterThan(parseFloat(g.std!.w));
  /* ⚠️ THE USED WIDTH, WHICH IS THE ONLY ONE THAT MATTERS. A fractional multiplier is floored to
     whole device pixels by the browser — `calc(1px * 1.5)` measured `1px` here — so asserting the
     RATIO of the used values is what catches a distinction that exists only in the stylesheet. */
  expect(parseFloat(g.pri!.w) / parseFloat(g.std!.w), "the weights are not the stated 2x").toBeCloseTo(2, 2);
  expect(parseFloat(g.pri!.w) - parseFloat(g.std!.w), "the difference is under a whole pixel — it will not render")
    .toBeGreaterThanOrEqual(1);
  expect(Math.round(g.pri!.h), "the heavier rim changed the row's line").toBe(Math.round(g.std!.h));
});

test("§4 — a flat pink selection, no burgundy, and an inverted disc", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const t = await tokens(page);
  const g = await page.evaluate(() => {
    const sel = document.querySelector(".f12-row.f12-sel") as HTMLElement | null;
    const off = document.querySelector(".f12-row:not(.f12-sel)") as HTMLElement | null;
    const panel = document.querySelector(".f12-list") as HTMLElement | null;
    if (!sel || !off || !panel) return null;
    const av = (r: HTMLElement) => { const a = r.querySelector(".f12-av") as HTMLElement | null; return a ? getComputedStyle(a).backgroundColor : null; };
    /**
     * Every colour painted in the list's own CHROME, so "no burgundy" is a sweep and not a spot
     * check — with one exclusion, which is the point rather than a let-off.
     *
     * ⚠️ THE STATUS DOTS ARE THE ONE THING IN THIS COLUMN THAT IS SUPPOSED TO BE BURGUNDY, and they
     * are the whole reason the spine had to go: burgundy means OUTGOING on a dot sitting two columns
     * from the row's left edge, so a burgundy spine was the list saying one thing twice with two
     * meanings. A sweep that flagged the dots would be asserting the opposite of §4's argument —
     * it did, on the first run, reporting the canonical component as a violation.
     *
     * They have no class of their own (StatusDot takes `className` from its caller and the row
     * passes none), so the slot is identified structurally: the first child of `.f12-end`.
     */
    const paints = Array.from(panel.querySelectorAll("*")).filter((e) => {
      const end = e.closest(".f12-end");
      if (!end) return true;
      const slot = end.firstElementChild;
      return !(slot && (e === slot || slot.contains(e)));
    }).flatMap((e) => {
      const c = getComputedStyle(e as HTMLElement);
      return [c.backgroundColor, c.color, c.borderTopColor, c.borderLeftColor, c.boxShadow];
    });
    return {
      panelBg: getComputedStyle(panel).backgroundColor,
      selBg: getComputedStyle(sel).backgroundColor,
      selShadow: getComputedStyle(sel).boxShadow,
      selSpine: getComputedStyle(sel, "::before").content,
      selName: getComputedStyle(sel.querySelector(".f12-nm") as HTMLElement).color,
      selAv: av(sel), offAv: av(off),
      paints: paints.join(" "),
    };
  });
  expect(g, "no selected row — the page did not auto-select").not.toBeNull();
  console.log(`\n§4  --pink-t ${t.pinkT} · --pink-av ${t.pinkAv} · --burg ${t.burg}\n` +
    JSON.stringify({ ...g!, paints: undefined }, null, 1));

  expect(g!.panelBg, "the list panel is not white").toBe(t.white);
  expect(g!.selBg, "the selection is not the soft pink token").toBe(t.pinkT);
  /* ⚠️ FILL ONLY — no ring, no glow, no shadow */
  expect(g!.selShadow, "the selected row kept a shadow").toBe("none");
  expect(g!.selSpine, "the burgundy spine came back").toBe("none");
  /* the disc inverts, and the two discs must differ or the selected one has vanished into the fill */
  expect(g!.selAv, "the selected disc did not invert to white").toBe(t.white);
  expect(g!.offAv, "the unselected discs are not the pink token").toBe(t.pinkAv);
  expect(g!.selAv, "the two discs share a ground — the selected one disappears").not.toBe(g!.offAv);
  /* ⚠️ A SWEEP, NOT A SPOT CHECK: every painted colour in the panel, against the burgundy token */
  expect(g!.paints, `burgundy (${t.burg}) still appears in the list`).not.toContain(t.burg);
});

import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 3 — a notch is a mark ON the timeline; a disc is an object IN it.
 *
 * ⚠️ THE TWO HALVES ARE ONE CLAIM AND ARE ASSERTED TOGETHER. "Notches are not clickable" passes
 * on a board where nothing is clickable, and "discs are clickable" passes on a board that made
 * everything a button. What the grammar says is that the two DIFFER, and only both together say it.
 */
test("Phase 3 — notches are marks and are inert; discs are objects and are not", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  /* ⚠️ SIX MONTHS, BECAUSE THE KIND THAT MATTERS IS RARE. Only `deadline` renders at one week;
     the REMINDER is the kind that drew the dashed ring, so a probe that never meets one has not
     checked the thing this phase retired. The widest window is where every kind appears. */
  await page.getByRole("slider", { name: /range/i }).fill("4");
  await page.waitForTimeout(700);

  const r = await page.evaluate(() => {
    const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
    const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const barH = parseFloat(getComputedStyle(tl.querySelector(".tl-row")!).getPropertyValue("--bar-h"));
    const wps = [...tl.querySelectorAll<HTMLElement>(".tl-wp")].map((w) => {
      const cs = getComputedStyle(w);
      const before = getComputedStyle(w, "::before");
      const r = w.getBoundingClientRect();
      return {
        kind: w.getAttribute("data-kind"),
        tag: w.tagName, pe: cs.pointerEvents,
        w: Math.round(r.width * 10) / 10, h: Math.round(r.height),
        bg: cs.backgroundColor,
        radius: cs.borderTopLeftRadius,
        borders: [cs.borderLeftWidth, cs.borderRightWidth, cs.borderTopWidth, cs.borderBottomWidth].join("/"),
        /* ⚠️ THE RING WAS A `::before`. Asserting the element is not round is not enough — the
           circle was never on the element itself. */
        ringRadius: before.borderRadius, ringContent: before.content,
      };
    });
    const nodes = [...tl.querySelectorAll<HTMLElement>(".tl-node")].map((n) => ({
      tag: n.tagName, pe: getComputedStyle(n).pointerEvents,
      round: getComputedStyle(n.querySelector(".tl-mk") as HTMLElement).borderRadius,
    }));
    return { barH, wps, nodes };
  });

  const kinds = [...new Set(r.wps.map((w) => w.kind))].join(", ");
  console.log(`  ${r.wps.length} notches (${kinds}) · ${r.nodes.length} discs · --bar-h ${r.barH}`);
  if (r.wps[0]) console.log(`      notch: <${r.wps[0].tag}> ${r.wps[0].w}×${r.wps[0].h} ${r.wps[0].bg} · radius ${r.wps[0].radius} · borders ${r.wps[0].borders} · pe ${r.wps[0].pe}`);

  expect(r.wps.length, "no notches — nothing was measured").toBeGreaterThan(0);
  expect(r.nodes.length, "no discs — the second half of the claim cannot be checked").toBeGreaterThan(0);
  /* ⚠️ THE KIND THAT WAS A RING, NAMED. If it never renders the retirement is unproved, and a
     silent skip reads exactly like a pass. */
  const kindsSeen = new Set(r.wps.map((w) => w.kind));
  if (!kindsSeen.has("reminder")) console.log("  NOTE: no reminder waypoint — the retired ring is source-locked only");

  for (const w of r.wps) {
    /* the mark itself: 2px, solid, straight-sided, the bar plus six clear at each end */
    expect(w.w, `${w.kind}: the notch is ${w.w}px wide, not 2`).toBe(2);
    expect(w.h, `${w.kind}: the notch is ${w.h}px tall, not --bar-h + 12`).toBe(r.barH + 12);
    expect(w.bg, `${w.kind}: the notch has no fill — it is still drawn as a border`).toBe("rgb(201, 168, 158)");
    expect(w.borders, `${w.kind}: the notch is drawn with a border`).toBe("0px/0px/0px/0px");
    /* ⚠️ NOTHING ROUND. A circle here would put a date-with-nothing-behind-it into the vocabulary
       of recorded facts, which is exactly what the dashed ring did. */
    expect(parseFloat(w.radius), `${w.kind}: the notch is rounded`).toBeLessThanOrEqual(2);
    expect(w.ringContent, `${w.kind}: the dashed ring is back as a ::before`).toBe("none");
    /* inert — nothing is behind it */
    expect(w.tag, `${w.kind}: a notch is a <${w.tag}>, so it is a control`).toBe("SPAN");
    expect(w.pe, `${w.kind}: a notch takes pointer events`).toBe("none");
  }

  /* ⚠️ AND THE DISCS DIFFER, which is the half that stops the above passing vacuously. */
  for (const n of r.nodes) {
    expect(n.tag, "a disc is not a control").toBe("BUTTON");
    expect(n.pe, "a disc takes no pointer events").not.toBe("none");
    expect(n.round, "a disc is not round — the shape grammar has collapsed").toBe("50%");
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});

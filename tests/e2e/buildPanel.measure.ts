/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEW PACKAGE PANEL — pinned, capped to the scrollport, scrolling inside itself.
 *
 * ⚠️ THE SCROLL IS PROVEN WITH THREE FULL CARDS IN IT, NOT ONE. An empty bench is 310px tall and
 * would never overflow anything, so a check taken on it proves the panel exists and nothing else —
 * the case the internal scroll was built for is the only case that exercises it.
 *
 * ⚠️ AND IT IS DRIVEN AT A SHORT VIEWPORT ON PURPOSE. At 900px the cap is 720 and three cards fit,
 * so the overflow branch is unreachable there. A gate that only ran tall would go green on a panel
 * with no scroll at all.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const GAP = 16;

for (const [w, h] of [[1440, 900], [1920, 700]] as const) {
  test(`the New package panel at ${w}×${h}`, async ({ page }) => {
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await openRoute(page, "/manuscripts/packages?tab=builder", { width: w, height: h });
    await page.locator(".bldp").waitFor({ state: "visible", timeout: 25000 });
    await page.waitForTimeout(400);

    /* fill all three slots — one letter, one synopsis, one version */
    for (const name of ["Hook-first", "One-page", "Prologue-first"]) {
      await page.locator(`.bldr-railcol .bldr-mc:has(h5:text-is("${name}"))`).click();
      await page.waitForTimeout(150);
    }
    /* scroll so the chrome is pinned — the state the sticky offset exists for */
    await page.evaluate(() => {
      const sc = document.querySelector(".bldp")!.closest(".wpg")!.querySelector(".wpg-scroll") as HTMLElement;
      sc.scrollTop = sc.scrollHeight;
    });
    await page.waitForTimeout(600);

    const out = await page.evaluate((gap) => {
      const n = (v: number) => Math.round(v * 10) / 10;
      const p = document.querySelector(".bldp") as HTMLElement;
      /* ⚠️ THE PANEL'S OWN GRID — every workspace page stays mounted, so the first `.wpg` in the
         document routinely belongs to a page that is not on screen. */
      const grid = p.closest(".wpg") as HTMLElement;
      const sc = grid.querySelector(".wpg-scroll") as HTMLElement;
      const sl = p.querySelector(".bldp-slots") as HTMLElement;
      const cs = getComputedStyle(p);
      const gs = getComputedStyle(grid);
      const rect = (e: Element | null) => (e ? { t: n(e.getBoundingClientRect().top), b: n(e.getBoundingClientRect().bottom) } : null);
      const stuckH = parseFloat(gs.getPropertyValue("--wpg-stuck-h")) || 0;
      const portH = parseFloat(gs.getPropertyValue("--wpg-port-h")) || 0;
      return {
        pos: cs.position, top: n(parseFloat(cs.top)), maxH: n(parseFloat(cs.maxHeight)),
        stuckH: n(stuckH), portH: n(portH), portReal: sc.clientHeight,
        capFromPort: n(portH - stuckH - 2 * gap),
        capFromVh: n(window.innerHeight - stuckH - 2 * gap),
        panelW: n(p.getBoundingClientRect().width), panelH: n(p.getBoundingClientRect().height),
        /* the slots region and whether it is actually scrolling */
        slotsH: n(sl.getBoundingClientRect().height), slotsScroll: sl.scrollHeight,
        scrolls: sl.scrollHeight > sl.clientHeight + 1,
        overflowY: getComputedStyle(sl).overflowY,
        cards: [...p.querySelectorAll(".bldp-slot .bldr-mc")].map((c) => ({
          name: (c.querySelector("h5")?.textContent ?? "").trim(),
          kind: (c as HTMLElement).dataset.kind,
          h: n(c.getBoundingClientRect().height),
          /* a FULL card: it carries the description band and the two-slot foot */
          band: !!c.querySelector(".bldr-desc, .bldr-plate"),
          foot: (c.querySelector(".bldr-use")?.textContent ?? "").trim(),
          remove: !!c.querySelector(".bldr-mcx"),
          grip: !!c.querySelector(".bldr-grip"),
        })),
        /* the head and the foot must stay put while the slots move */
        panel: rect(p), head: rect(p.querySelector(".bldp-head")), foot: rect(p.querySelector(".bldp-foot")),
        slabBottom: n((grid.querySelector(".wpg-chrome") as HTMLElement).getBoundingClientRect().bottom),
        title: (p.querySelector(".bldp-title") as HTMLInputElement).value,
        /* ⚠️ THE FIELD MUST READ AS TYPEABLE (D12) — set in the heading's face with no box it read
           as the panel's title. The mark is asserted on the WRAPPER, which is where the border is
           and where the pencil cannot swallow a click. */
        titleUnderline: (() => { const w = p.querySelector(".bldp-titlewrap") as HTMLElement;
          const cs = getComputedStyle(w); return `${cs.borderBottomStyle} ${Math.round(parseFloat(cs.borderBottomWidth))}`; })(),
        titlePencil: (() => { const g = p.querySelector(".bldp-pencil") as HTMLElement | null;
          return g ? { present: true, events: getComputedStyle(g).pointerEvents } : { present: false, events: "" }; })(),
        titleTag: (p.querySelector(".bldp-title") as HTMLElement).tagName.toLowerCase(),
        titleFont: getComputedStyle(p.querySelector(".bldp-title")!).fontFamily.split(",")[0].replace(/["']/g, ""),
        why: (p.querySelector(".bldr-why")?.textContent ?? "").trim(),
        createDisabled: (p.querySelector(".bldr-btn--primary") as HTMLButtonElement).disabled,
      };
    }, GAP);
    console.log(`P${w}x${h} ` + JSON.stringify(out, null, 0));

    /* ⚠️ THE STICKY OFFSET IS THE PINNED CHROME'S OWN HEIGHT — a literal here would be a second
       element encoding a height it does not own, and the slab settles, so the number moves. */
    expect(out.pos).toBe("sticky");
    expect(out.stuckH, "the grid published no chrome height while pinned").toBeGreaterThan(10);
    expect(Math.abs(out.top - (out.stuckH + GAP))).toBeLessThanOrEqual(1);
    /* and it works: the panel's top edge clears the slab's bottom */
    expect(out.panel!.t).toBeGreaterThanOrEqual(out.slabBottom - 1);

    /* ⚠️ THE CAP IS THE SCROLLPORT, NEVER `100vh`. The scroller starts below the shell's chrome, so
       a viewport-based cap over-claims by exactly that offset. Both are computed and compared. */
    expect(out.portH).toBe(out.portReal);
    expect(Math.abs(out.maxH - out.capFromPort)).toBeLessThanOrEqual(1);
    expect(out.capFromVh, "the two caps are the same figure — this run cannot tell them apart")
      .not.toBe(out.capFromPort);
    expect(out.panelH).toBeLessThanOrEqual(out.maxH + 1);

    /* ⚠️ THE FLOOR HOLDS UNDER THE PIN — same number, different constraint (Nick's flag) */
    expect(out.panelW).toBeGreaterThanOrEqual(480);

    /* three FULL cards, one per family, each with a remove control and no grip */
    expect(out.cards.map((c) => c.kind)).toEqual(["let", "syn", "ver"]);
    for (const c of out.cards) {
      expect(c.band, `${c.name} is not a full card`).toBe(true);
      expect(c.foot, `${c.name} lost its usage slot`).toMatch(/^(In \d+|Not in a package)$/);
      expect(c.remove, `${c.name} has no way out of the slot`).toBe(true);
      expect(c.grip, "a card in a slot is not dragged anywhere").toBe(false);
    }
    /* ⚠️ AND THE HEIGHTS ARE PRINTED, so a fixture that drifts to three identical cards is visible */
    console.log(`P${w}x${h} CARDH ` + JSON.stringify(out.cards.map((c) => [c.name, c.h])));

    /* the title is the heading, and it took the suggestion */
    expect(out.titleTag).toBe("input");
    expect(out.titleUnderline, "no dashed underline — the name reads as a heading").toBe("dashed 1");
    expect(out.titlePencil.present, "no pencil — the name reads as a heading").toBe(true);
    expect(out.titlePencil.events, "the mark must not swallow a click aimed at the field").toBe("none");
    expect(out.titleFont).toMatch(/Playfair/i);
    expect(out.title).toBe("Hook-first · One-page · Prologue-first");
    /* ⚠️ A DUPLICATE IS STATED, NOT BLOCKED (D16) — and the fixture reaches it, because
       `seed-pkg-3` is exactly this combination. Only a missing letter disables Create. */
    expect(out.why).toMatch(/^Same combination as/);
    expect(out.createDisabled).toBe(false);

    /* ⚠️ THE SCROLL IS ON THE SLOTS, AND THE HEAD AND FOOT STAY INSIDE THE PANEL. A panel that
       scrolled whole would take its own Create button off the bottom of the screen at exactly the
       moment it became usable. */
    expect(out.overflowY).toBe("auto");
    expect(out.head!.t).toBeGreaterThanOrEqual(out.panel!.t - 1);
    expect(out.foot!.b).toBeLessThanOrEqual(out.panel!.b + 1);
    expect(out.foot!.b).toBeLessThanOrEqual(out.portReal + out.slabBottom);

    expect(errs.filter((e) => !/favicon|net::ERR/.test(e))).toEqual([]);
  });
}

test("⚠️ AND THE SHORT VIEWPORT ACTUALLY OVERFLOWS — the case the scroll exists for", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages?tab=builder", { width: 1440, height: 620 });
  await page.locator(".bldp").waitFor({ state: "visible", timeout: 25000 });
  for (const name of ["Hook-first", "One-page", "Prologue-first"]) {
    await page.locator(`.bldr-railcol .bldr-mc:has(h5:text-is("${name}"))`).click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const p = document.querySelector(".bldp") as HTMLElement;
    const sl = p.querySelector(".bldp-slots") as HTMLElement;
    const before = sl.scrollTop;
    sl.scrollTop = 9999;
    return { scrollH: sl.scrollHeight, clientH: sl.clientHeight, before, after: sl.scrollTop,
             footVisible: p.querySelector(".bldp-foot")!.getBoundingClientRect().bottom <= window.innerHeight + 1,
             titleVisible: p.querySelector(".bldp-title")!.getBoundingClientRect().top >= 0 };
  });
  console.log("SHORT " + JSON.stringify(r));
  expect(r.scrollH, "the slots did not overflow — the scroll is unproven").toBeGreaterThan(r.clientH + 1);
  expect(r.after, "the slots did not move").toBeGreaterThan(0);
  /* and the two things that must never scroll away with them */
  expect(r.footVisible).toBe(true);
  expect(r.titleVisible).toBe(true);
});

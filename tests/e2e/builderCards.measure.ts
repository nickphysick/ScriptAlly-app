/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BUILDER'S LIBRARY CARDS — four description states, two foot registers, and no card that wraps.
 *
 * ⚠️ IT DEPENDS ON A FIXTURE THAT CARRIES ALL FOUR BODIES. `seedPackages.mjs` supplies the pasted
 * draft (`seed-mat-ql1`), the attachment with no draft (`seed-mat-ql3`) and the material with
 * neither (`seed-mat-ql4`); `seedBookVersions.mjs` supplies one version with a note and two without.
 * Without them this sweep walks eight cards, sees one state and passes having proved a quarter of
 * the claim — so the population is asserted per branch rather than only in total.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

for (const w of [1440, 1920]) {
  test(`builder library cards at ${w}`, async ({ page }) => {
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await openRoute(page, "/manuscripts/packages?tab=builder", { width: w, height: 1200 });
    await page.locator(".bldr-mc").first().waitFor({ state: "visible", timeout: 25000 });
    await page.waitForTimeout(400);

    const out = await page.evaluate(() => {
      const n = (v: number) => Math.round(v * 10) / 10;
      const t = (e: Element | null) => (e?.textContent ?? "").trim();
      return {
        sections: [...document.querySelectorAll(".bldr-rsec")].map((s) => ({
          kind: (s.className.match(/bldr-t-(\w+)/) ?? [])[1],
          add: t(s.querySelector(".bldr-addbtn")),
          addPlus: !!s.querySelector(".bldr-addbtn svg"),
          headBg: getComputedStyle(s.querySelector("h4")!).backgroundColor,
          addBg: getComputedStyle(s.querySelector(".bldr-addbtn")!).backgroundColor,
        })),
        /* ⚠️ SCOPED TO THE LIBRARY. A slot in the New-package panel holds the SAME card component,
           so a bare `.bldr-mc` sweep counts a card twice the moment anything is in the bench — which
           is exactly what a "the library keeps every card" check must not do. */
        cards: [...document.querySelectorAll(".bldr-railcol .bldr-mc")].map((c) => {
          const el = c as HTMLElement;
          const desc = c.querySelector(".bldr-desc") as HTMLElement | null;
          const plate = c.querySelector(".bldr-plate") as HTMLElement | null;
          const band = (desc ?? plate)!;
          const src = c.querySelector(".bldr-src") as HTMLElement;
          const use = c.querySelector(".bldr-use") as HTMLElement;
          return {
            kind: el.dataset.kind,
            name: t(c.querySelector("h5")),
            /* the band: which of the four, and what it says */
            band: plate ? "plate" : desc!.classList.contains("bldr-desc--none") ? "words" : "text",
            bandText: t(band),
            fileName: t(c.querySelector(".bldr-platefn")),
            fileKind: t(c.querySelector(".bldr-platekind")),
            bandH: n(band.getBoundingClientRect().height),
            hold: (c.querySelector(".bldr-hold")?.textContent ?? "").trim(),
            holdClipped: (() => { const h = c.querySelector(".bldr-hold") as HTMLElement | null;
              return !!h && h.scrollWidth > h.clientWidth + 1; })(),
            /* the foot: two slots, and whether either wrapped */
            src: t(src), srcGlyph: !!src.querySelector("svg"),
            use: t(use),
            footH: n((c.querySelector(".bldr-mcfoot") as HTMLElement).getBoundingClientRect().height),
            wrapped: src.getBoundingClientRect().height > 14 || use.getBoundingClientRect().height > 14,
            /* ⚠️ CLIPPED IS THE CLAIM; WRAPPED IS THE PROXY THAT LET `Attac…` THROUGH. A slot set to
               `nowrap` with `text-overflow: ellipsis` cannot wrap by construction, so a wrap check
               over it is satisfied by a truncated word — which is worse than the wrap it replaced. */
            clipped: src.scrollWidth > Math.ceil(src.getBoundingClientRect().width) + 1
                  || use.scrollWidth > Math.ceil(use.getBoundingClientRect().width) + 1,
            plateClipped: (() => {
              const fn = c.querySelector(".bldr-platefn") as HTMLElement | null;
              const kd = c.querySelector(".bldr-platekind") as HTMLElement | null;
              return (!!fn && fn.scrollWidth > fn.clientWidth + 1) || (!!kd && kd.scrollWidth > kd.clientWidth + 1);
            })(),
            tag: !!c.querySelector(".bldr-unused"),
            edge: getComputedStyle(el, "::before").backgroundColor,
            edgeW: getComputedStyle(el, "::before").width,
          };
        }),
        cols: getComputedStyle(document.querySelector(".bldr-cards") as HTMLElement)
          .gridTemplateColumns.split(" ").length,
        railW: n((document.querySelector(".bldr-cards") as HTMLElement).getBoundingClientRect().width),
        splitCols: getComputedStyle(document.querySelector(".bldr-split") as HTMLElement)
          .gridTemplateColumns.split(" ").map((v) => Math.round(parseFloat(v))),
        cardW: n((document.querySelector(".bldr-mc") as HTMLElement).getBoundingClientRect().width),
      };
    });

    /* ⚠️ THE CENSUS IS PRINTED, NOT SUMMARISED — a monoculture is invisible in a pass/fail. */
    const bands = out.cards.map((c) => `${c.band}:${c.bandText.slice(0, 34)}`);
    console.log(`B${w} BANDS ` + JSON.stringify([...new Set(bands)], null, 0));
    console.log(`B${w} FEET ` + JSON.stringify(out.cards.map((c) => [c.name, c.src, c.use])));

    /* ── PART 1 · the description band ─────────────────────────────────────────────────────── */
    const byBand = (k: string) => out.cards.filter((c) => c.band === k);
    /* D1 — pasted text is unchanged */
    const text = byBand("text");
    expect(text.length, "no card with a body — D1 unproven").toBeGreaterThan(0);
    /* D2 — the plate: icon, filename, kind */
    const plates = byBand("plate");
    expect(plates.length, "no attachment card — D2 unproven").toBeGreaterThan(0);
    for (const p of plates) {
      expect(p.fileName).toMatch(/\./);
      expect(p.fileKind, "the fixture's .docx names a kind").toBe("Word document");
      /* D3 — the foot says what kind of thing it is, and does NOT repeat the name */
      expect(p.src).toBe("Attached file");
      expect(p.src).not.toContain(p.fileName);
      expect(p.srcGlyph, "no clip beside a plate that carries its own mark").toBe(false);
    }
    /* ⚠️ F-BR — THE HOLDINGS LINE IS BACK, IN THE BAND, and both branches are entered. It is the
       fact the versions feature exists to surface; the two-register foot has no slot for it. */
    const vers2 = out.cards.filter((c) => c.kind === "ver");
    console.log(`B${w} HOLD ` + JSON.stringify(vers2.map((c) => [c.name, c.hold])));
    expect(vers2.some((c) => /held by \d+ agents?/.test(c.hold)), "no version in a package — F-BR unproven").toBe(true);
    expect(vers2.some((c) => c.hold === ""), "no version in nothing — the omission is unproven").toBe(true);
    for (const c of vers2) {
      expect(c.hold, "never `held by 0 agents` — the foot states that absence once").not.toMatch(/\b0\b/);
      expect(c.holdClipped, `${c.name}'s holdings line is cut off`).toBe(false);
    }
    /* and no MATERIAL card carries one — it is a version's own metadata */
    for (const c of out.cards.filter((x) => x.kind !== "ver")) expect(c.hold).toBe("");

    /* D4 + D5 — the two sentences, and each is entered */
    const words = byBand("words").map((c) => c.bandText);
    console.log(`B${w} WORDS ` + JSON.stringify(words));
    expect(words.filter((x) => x === "No note on this version").length,
      "no note-less version — D4 unproven, and it is the majority state").toBeGreaterThan(0);
    expect(words.filter((x) => x === "Nothing written yet").length,
      "no empty material — D5 unproven").toBeGreaterThan(0);
    expect(new Set(words).size, "both sentences render").toBe(2);
    /* nothing anywhere renders a blank band */
    for (const c of out.cards) expect(c.bandText.length, `${c.name}'s band is empty`).toBeGreaterThan(0);
    /* ⚠️ D6 — EVERY BAND IS THE RESERVED 34, WITHIN A PIXEL, PLATE INCLUDED. Not an equality: a
       two-line clamped body measures 34.5 from its own line box and always did, so pinning one
       value would fail on a correct card. The plate is the one that can genuinely grow — its
       `min-height` reads 34 while its tallest child decides the box, and a wrapped kind line put it
       at 44, raising every card in that grid row. */
    console.log(`B${w} BANDH ` + JSON.stringify([...new Set(out.cards.map((c) => c.bandH))]));
    for (const c of out.cards) expect(Math.abs(c.bandH - 34), `${c.name}'s band height`).toBeLessThanOrEqual(1);

    /* ── PART 2 · the foot's two grammars ──────────────────────────────────────────────────── */
    for (const c of out.cards) {
      /* D7 — the left slot never carries a usage phrase */
      expect(c.src, `${c.name}'s source slot`).not.toMatch(/package|^In \d/i);
      /* D8 — the right slot is one of exactly three shapes */
      expect(c.use, `${c.name}'s usage slot`).toMatch(/^(In \d+|Not in a package)$/);
    }
    /* D9 — `Empty` is retired everywhere on the page */
    expect(out.cards.map((c) => c.src)).not.toContain("Empty");
    /* both usage branches present */
    const uses = out.cards.map((c) => c.use);
    expect(uses.some((u) => /^In /.test(u)), "no used card").toBe(true);
    expect(uses.some((u) => u === "Not in a package"), "no unused card").toBe(true);
    /* the retired tag is gone rather than merely unstyled */
    expect(out.cards.some((c) => c.tag), "the `Not used` tag still renders beside its replacement").toBe(false);

    /* D10 — no card's foot wraps AND none of it is cut off, with the longest name in the sweep */
    const wrapped = out.cards.filter((c) => c.wrapped);
    const clipped = out.cards.filter((c) => c.clipped || c.plateClipped);
    console.log(`B${w} WRAPPED ${wrapped.length} · CLIPPED ${clipped.length} of ${out.cards.length}` +
      ` · footH ${JSON.stringify([...new Set(out.cards.map((c) => c.footH))])} · cols ${out.cols}`);
    expect(out.cards.map((c) => c.name)).toContain("Post-R&R (T. Marsh)");
    expect(wrapped.map((c) => c.name)).toEqual([]);
    expect(clipped.map((c) => c.name), "a truncated word reads worse than the wrap it replaced").toEqual([]);
    expect(new Set(out.cards.map((c) => c.footH)).size, "one foot height across the grid").toBe(1);

    /* ── the family furniture, unchanged by this pass ──────────────────────────────────────── */
    expect(out.sections.map((s) => s.kind)).toEqual(["let", "syn", "ver"]);
    expect(out.sections.map((s) => s.add)).toEqual(["Add a letter", "Add a synopsis", "Add a version"]);
    for (const s of out.sections) { expect(s.addPlus).toBe(true); expect(s.addBg).toBe(s.headBg); }
    expect(new Set(out.sections.map((s) => s.headBg)).size).toBe(3);
    for (const c of out.cards) expect(c.edgeW).toBe("5px");
    expect(new Set(out.cards.map((c) => c.edge)).size, "three edges for three families").toBe(3);
    /* ⚠️ THE COLUMN COUNT IS REPORTED, NOT PINNED. It is a container query against the width the
       foot's phrases need, so a wider rail may legitimately return two — and a value pinned here
       would fail on that rather than on a regression. What must hold is that nothing is cut off,
       which the clipping assertion above states directly. */
    /* ⚠️ THE COLUMN COUNT IS DERIVED, SO IT IS REPORTED AND ITS DERIVATION IS ASSERTED — never a
       pinned number. What must hold is that the grid ANSWERS the width: a card at least the ref's
       236 wide, and as many as fit. A fixed value here would pass on the fault this replaced, which
       was one column at every viewport from 1440 to 2560. */
    console.log(`B${w} GRID cols ${out.cols} · card ${out.cardW} · rail ${out.railW}`);
    expect(out.cols).toBe(Math.floor((out.railW + 11) / (236 + 11)));
    expect(out.cardW).toBeGreaterThanOrEqual(236);
    /* ⚠️ AND THE LIBRARY IS THE LARGER HALF, which is what the derivation needs to be given space
       to answer. The rail was a literal 296px, so the grid resolved to one column at 1440, 1920 and
       2560 alike — a grid that answers the same at every width is not answering. This is the claim
       the column derivation cannot make on its own: at 296 the derivation is satisfied by one. */
    console.log(`B${w} SPLIT ${JSON.stringify(out.splitCols)}`);
    expect(out.splitCols.length).toBe(2);
    expect(out.splitCols[0], "the composer holds more width than the library").toBeGreaterThan(out.splitCols[1]);

    /* ⚠️ D9 (previous pack) — a card taken into the package DIMS; it does not leave the library.
       The count is taken BEFORE, because removal and dimming are indistinguishable afterwards. */
    const before = out.cards.length;
    const target = out.cards.find((c) => c.kind === "let" && c.name === "Hook-first")!;
    await page.locator(`.bldr-railcol .bldr-mc:has(h5:text-is("${target.name}"))`).click();
    await page.waitForTimeout(300);
    const after = await page.evaluate((name) => {
      const all = [...document.querySelectorAll(".bldr-railcol .bldr-mc")];
      const el = all.find((c) => (c.querySelector("h5")?.textContent ?? "").trim() === name) as HTMLElement | undefined;
      return { n: all.length, present: !!el, op: el ? getComputedStyle(el).opacity : null,
               mark: (el?.querySelector(".bldr-inuse")?.textContent ?? "").trim() };
    }, target.name);
    console.log(`B${w} PICK ` + JSON.stringify({ before, ...after }));
    expect(after.n).toBe(before);
    expect(after.present).toBe(true);
    expect(Number(after.op)).toBeLessThan(1);
    expect(after.mark).toBe("In this package");

    expect(errs.filter((e) => !/favicon|net::ERR/.test(e))).toEqual([]);
  });
}

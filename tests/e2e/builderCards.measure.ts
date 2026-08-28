/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BUILDER'S LIBRARY CARDS — three families, three source states, and dimming that is not removal.
 *
 * ⚠️ IT DEPENDS ON `seedPackages.mjs` CARRYING `seed-mat-ql3` AND `seed-mat-ql4`. Every other
 * material on the fixture is pasted text, so without those two this sweep is a monoculture: it walks
 * eight cards, sees one source state, and passes having proved a third of the claim. The two
 * assertions naming them exist to make that failure loud rather than silent.
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
          head: t(s.querySelector("h4")),
          headBg: getComputedStyle(s.querySelector("h4")!).backgroundColor,
          n: t(s.querySelector(".bldr-n")),
          add: t(s.querySelector(".bldr-addbtn")),
          addPlus: !!s.querySelector(".bldr-addbtn svg"),
          addBg: getComputedStyle(s.querySelector(".bldr-addbtn")!).backgroundColor,
        })),
        cards: [...document.querySelectorAll(".bldr-mc")].map((c) => {
          const el = c as HTMLElement, d = c.querySelector(".bldr-desc") as HTMLElement;
          return {
            kind: el.dataset.kind,
            name: t(c.querySelector("h5")),
            desc: t(d),
            descNone: d.classList.contains("bldr-desc--none"),
            descH: n(d.getBoundingClientRect().height),
            src: t(c.querySelector(".bldr-src")),
            glyph: !!c.querySelector(".bldr-src svg"),
            use: t(c.querySelector(".bldr-use")),
            /* D6 — colour is the left edge and nothing else */
            edge: getComputedStyle(el, "::before").backgroundColor,
            edgeW: getComputedStyle(el, "::before").width,
            pill: !!c.querySelector(".bldr-sh, [class*=pill]"),
          };
        }),
        cols: (() => {
          const g = document.querySelector(".bldr-cards") as HTMLElement;
          return getComputedStyle(g).gridTemplateColumns.split(" ").length;
        })(),
      };
    });
    console.log(`B${w} SECTIONS ` + JSON.stringify(out.sections));
    console.log(`B${w} CARDS ` + JSON.stringify(out.cards));

    /* D4 — three sections, each Add naming its own noun, each in its own fill */
    expect(out.sections.map((s) => s.kind)).toEqual(["let", "syn", "ver"]);
    expect(out.sections.map((s) => s.add)).toEqual(["Add a letter", "Add a synopsis", "Add a version"]);
    for (const s of out.sections) expect(s.addPlus, "the plus is a glyph, not a character in the label").toBe(true);
    expect(new Set(out.sections.map((s) => s.headBg)).size, "three distinct family fills").toBe(3);
    for (const s of out.sections) expect(s.addBg, "the Add button shares its head's fill").toBe(s.headBg);

    /* ⚠️ THE DISTINCT SOURCE STATES, PRINTED — a monoculture would prove one third of D5 */
    const states = [...new Set(out.cards.map((c) => `${c.glyph ? (c.src.match(/words/) ? "page" : "clip") : "none"}|${c.desc ? "desc" : c.descNone ? "none" : "empty"}`))];
    console.log(`B${w} STATES ` + JSON.stringify(states));
    const att = out.cards.find((c) => c.src.includes(".docx"));
    const emp = out.cards.find((c) => c.src === "Empty");
    expect(att, "no attachment card — the empty-description case would be unproven").toBeTruthy();
    expect(emp, "no empty material — `Nothing written yet` would be unproven").toBeTruthy();
/* ⚠️ `Nothing written yet` IS RESERVED FOR A MATERIAL WITH NEITHER TEXT NOR A FILE, and that is the
   durable claim here — not what an attachment's description area currently does with its space.
   A file with no draft has SOMETHING; saying nothing was written of it would be false, which is why
   the attachment's own description is asserted as `descNone: false` rather than pinned to a string.
   The treatment of that empty area is Nick's to design and this lock does not decide it. */
    expect(att!.descNone, "a file is not nothing written").toBe(false);
    expect(emp!.desc).toBe("Nothing written yet");
    expect(emp!.descNone).toBe(true);
    /* the foot stays on one line across the grid whatever the description does */
    expect(new Set(out.cards.map((c) => c.descH)).size, "one description height for every card").toBe(1);

    /* D8 — versions state holdings, never a word count, and carry no glyph */
    const vers = out.cards.filter((c) => c.kind === "ver");
    expect(vers.length).toBeGreaterThan(0);
    for (const v of vers) {
      expect(v.src).not.toMatch(/word/i);
      expect(v.glyph, "a version is not a document").toBe(false);
      expect(v.use, "the holdings ARE its source line").toBe("");
    }

    /* D6 — the edge is 5px in the family fill, and no card carries a type pill */
    for (const c of out.cards) { expect(c.edgeW).toBe("5px"); expect(c.pill).toBe(false); }
    expect(new Set(out.cards.map((c) => c.edge)).size, "three edges for three families").toBe(3);
    expect(out.cols, "two-column card grid").toBe(2);
    /* ⚠️ D9 — A CARD TAKEN INTO THE PACKAGE DIMS; IT DOES NOT LEAVE THE LIBRARY.
       Removal and dimming look identical from a count taken only afterwards, so the count is
       taken BEFORE and the same card is found again by name after the pick. */
    const before = out.cards.length;
    const target = out.cards.find((c) => c.kind === "let" && c.name === "Hook-first")!;
    await page.locator(`.bldr-mc:has(h5:text-is("${target.name}"))`).click();
    await page.waitForTimeout(300);
    const after = await page.evaluate((name) => {
      const all = [...document.querySelectorAll(".bldr-mc")];
      const el = all.find((c) => (c.querySelector("h5")?.textContent ?? "").trim() === name) as HTMLElement | undefined;
      return { n: all.length, present: !!el, op: el ? getComputedStyle(el).opacity : null,
               mark: (el?.querySelector(".bldr-inuse")?.textContent ?? "").trim() };
    }, target.name);
    console.log(`B${w} PICK ` + JSON.stringify({ before, ...after }));
    expect(after.n, "the library keeps every card").toBe(before);
    expect(after.present, "the picked card is still in the library").toBe(true);
    expect(Number(after.op)).toBeLessThan(1);
    expect(after.mark).toBe("In this package");

    expect(errs.filter((e) => !/favicon|net::ERR/.test(e))).toEqual([]);
  });
}

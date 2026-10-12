/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 (design-refs/contact-list-v16/contact-list-v16.html) — the CL16 locks, on the rendered page at
 * 1512 × 900 and 1280 × 800 with the shell, unless a lock says otherwise.
 *
 * Each lock was read RED twice before its green was believed: against the build before the pack (`CL16_BASE=1`,
 * a preview of the base tip) and with its named mutation (`CL16_MUTATE=<lock>`: one named thing broken IN THE
 * PAGE). Ledgers: reports/contact-list-v16/ledger.
 *
 * ⚠️ "FULL (COMPACT)" FOLLOWS THE PAGE SHEET (`.ws-app.sheet-wide`), as Query Centre v137 built it. At both
 *    measured sizes with the sidebar open the sheet is under 1440, so the page is compact at both.
 */
import { test, type Page } from "@playwright/test";
import { Ledger, SIZES16, near, openContacts16, mutate16 } from "./cl16Lib";

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the hero number back in the panel */
  A1: { js: `(() => { const b = document.querySelector('.aglist .cl15-hd [data-hp3-part="text"]'); if (b && !b.querySelector('[data-hp3-part="number"]')) { const n = document.createElement("span"); n.setAttribute("data-hp3-part", "number"); n.textContent = "41"; b.prepend(n); } })()` },
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string) => { await openContacts16(page, vp); await mutate16(page, lock, MUTATIONS); };

test.describe("Contact list v16", () => {
  test("A1 · header: the navy title panel, no hero number, stamp or faces", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("A1");
    for (const vp of SIZES16) {
      await open(page, vp, "A1");
      const r = await page.evaluate(() => {
        const { g, sc } = (window as never as { __cl: () => { g: HTMLElement; sc: HTMLElement } }).__cl();
        const box = (window as never as { __box: (e: Element | null) => { x: number; y: number; w: number; h: number; r: number; b: number } | null }).__box;
        const p = g.querySelector<HTMLElement>('[data-cl15="header"]');
        if (!p) return null;
        const h1 = p.querySelector<HTMLElement>("h1[data-page-title]");
        const disc = p.querySelector<HTMLElement>('[data-cl16="disc"]');
        const img = disc?.querySelector<HTMLElement>("img") ?? null;
        const cs = getComputedStyle(p);
        const scs = getComputedStyle(sc);
        /* the content column: the scroller's box less its own inline padding, or the group's box */
        const col = box(g)!;
        const sub = p.querySelector<HTMLElement>('[data-hp3-part="sub"]');
        const b1 = p.querySelector<HTMLElement>('[data-cl15="add"]'), b2 = p.querySelector<HTMLElement>('[data-cl16="discover"]');
        return {
          bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, border: cs.borderTopColor, pad: cs.padding, grid: cs.gridTemplateColumns.split(" ").length,
          box: box(p)!, col, scTop: box(sc)!.y, scPadTop: parseFloat(scs.paddingTop) || 0,
          name: h1 ? (h1.querySelector("[aria-label]")?.getAttribute("aria-label") ?? h1.textContent) : null,
          /* ⚠️ the face is read off the element that HOLDS THE TEXT: the h1's own face says nothing about its inner spans */
          size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null, face: h1 ? getComputedStyle(h1.querySelector('[aria-hidden="true"]') ?? h1).fontFamily : "",
          subFace: (() => { const t = p.querySelector<HTMLElement>('[data-cl16="sub"]'); return t ? getComputedStyle(t).fontFamily : ""; })(),
          lines: h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0, h1Colour: h1 ? getComputedStyle(h1).color : "",
          numbers: p.querySelectorAll('[data-hp3-part="number"], [data-hp3-part="words"], .hpanel-stamp, [data-cl15="faces"], [data-cl15="face"], [data-cl15="hero-n"], [data-cl15="faces-said"]').length,
          sub: sub?.textContent ?? "", subSize: sub ? parseFloat(getComputedStyle(sub).fontSize) : null, subGap: sub && h1 ? sub.getBoundingClientRect().top - h1.getBoundingClientRect().bottom : null,
          ms: (() => { const m = p.querySelector<HTMLElement>('[data-cl16="ms"]'); return m ? getComputedStyle(m).fontFamily : null; })(),
          actsGap: sub && b1 ? b1.getBoundingClientRect().top - sub.getBoundingClientRect().bottom : null,
          b1: b1 ? { text: b1.textContent, bg: getComputedStyle(b1).backgroundColor, fg: getComputedStyle(b1).color } : null,
          b2: b2 ? { text: b2.textContent, bg: getComputedStyle(b2).backgroundColor, fg: getComputedStyle(b2).color, ring: getComputedStyle(b2).boxShadow } : null,
          disc: disc ? { box: box(disc)!, bg: getComputedStyle(disc).backgroundColor, clip: getComputedStyle(disc).overflow, radius: getComputedStyle(disc).borderTopLeftRadius, hidden: !!disc.closest('[aria-hidden="true"]') } : null,
          img: img ? { box: box(img)!, src: img.getAttribute("src") ?? "", ok: (img as HTMLImageElement).naturalWidth > 0 } : null,
          artRight: disc ? box(p)!.r - box(disc)!.r : null,
          wide: !!document.querySelector(".ws-app.sheet-wide"),
        };
      });
      const w = `${vp.width}`;
      if (!r) { L.check("A1", `${w} header`, false, "no header on the page"); continue; }
      const full = r.wide;
      L.check("A1", `${w} panel`, r.bg === "rgb(45, 58, 80)" && r.radius === "14px", `${r.bg} · ${r.radius}`);
      L.check("A1", `${w} panel border`, r.border === "rgba(244, 238, 229, 0.14)", r.border);
      L.check("A1", `${w} at the column edges`, near(r.box.x, r.col.x, 1) && near(r.box.r, r.col.r, 1), `panel ${r.box.x.toFixed(1)}–${r.box.r.toFixed(1)} · column ${r.col.x.toFixed(1)}–${r.col.r.toFixed(1)}`);
      L.check("A1", `${w} 28 under the sheet's top`, near(r.box.y - r.scTop, 28, 1.5), `${(r.box.y - r.scTop).toFixed(1)}`);
      L.check("A1", `${w} padding`, r.pad === (full ? "34px 44px 36px 48px" : "28px 32px 30px 36px"), r.pad);
      L.check("A1", `${w} title`, r.name === "Every agent, in one place", `"${r.name}"`);
      L.check("A1", `${w} title size`, near(r.size, full ? 62 : 50, 0.5) && /Special Elite/.test(r.face), `${r.size} · ${r.face.slice(0, 24)} · wide ${full}`);
      L.check("A1", `${w} title is two lines, cream`, r.lines === 2 && r.h1Colour === "rgb(244, 238, 229)", `${r.lines} lines · ${r.h1Colour}`);
      L.check("A1", `${w} no hero number, stamp or faces`, r.numbers === 0, `${r.numbers} number, stamp or faces elements`);
      L.check("A1", `${w} subline`, /^Find, compare and keep track of (the agents for .+|your agents)\.$/.test(r.sub.trim()), `"${r.sub}"`);
      L.check("A1", `${w} subline size and gap`, near(r.subSize, full ? 21 : 18, 0.5) && near(r.subGap, full ? 16 : 14, 1.5), `${r.subSize}px · ${r.subGap?.toFixed(1)} under the title`);
      L.check("A1", `${w} the subline is set in the serif`, /Source Serif/.test(r.subFace), r.subFace.slice(0, 40));
      L.check("A1", `${w} the book's title is in the typewriter face`, r.ms === null || /Special Elite/.test(r.ms), `${r.ms}`);
      L.check("A1", `${w} buttons under the subline`, near(r.actsGap, full ? 26 : 22, 1.5), `${r.actsGap?.toFixed(1)}`);
      L.check("A1", `${w} primary`, r.b1?.text === "+ Add an agent" && r.b1.bg === "rgb(243, 238, 230)" && r.b1.fg === "rgb(27, 36, 51)", JSON.stringify(r.b1));
      L.check("A1", `${w} secondary`, r.b2?.text === "Discover agents" && r.b2.bg === "rgba(0, 0, 0, 0)" && r.b2.fg === "rgb(244, 238, 229)" && /rgba\(244, 238, 229, 0\.7\) 0px 0px 0px 1\.5px inset/.test(r.b2.ring), JSON.stringify(r.b2));
      const d = full ? 236 : 196;
      L.check("A1", `${w} disc`, !!r.disc && near(r.disc.box.w, d, 1) && near(r.disc.box.h, d, 1) && r.disc.bg === "rgb(244, 241, 236)" && r.disc.clip === "hidden" && r.disc.radius === "50%" && r.disc.hidden, JSON.stringify(r.disc));
      L.check("A1", `${w} the hawk is 118% of the disc, shifted 6% left`, !!r.img && !!r.disc && r.img.ok && /contact-disc-hawk\.webp/.test(r.img.src) && near(r.img.box.w, d * 1.18, 1.5) && near(r.disc.box.x - r.img.box.x, d * 0.06, 1.5), JSON.stringify(r.img));
      L.check("A1", `${w} the hawk is centred in the disc's height`, !!r.img && !!r.disc && near((r.img.box.y + r.img.box.h / 2) - (r.disc.box.y + r.disc.box.h / 2), 0, 1.5), `${r.img && r.disc ? ((r.img.box.y + r.img.box.h / 2) - (r.disc.box.y + r.disc.box.h / 2)).toFixed(1) : "none"}`);
      L.check("A1", `${w} the disc is vertically centred, 12 inside the padding`, !!r.disc && near((r.disc.box.y + r.disc.box.h / 2) - (r.box.y + r.box.h / 2), 0, 1.5) && near(r.artRight, (full ? 44 : 32) + 12 + 1, 1.5), `centre off by ${r.disc ? ((r.disc.box.y + r.disc.box.h / 2) - (r.box.y + r.box.h / 2)).toFixed(1) : "?"} · ${r.artRight?.toFixed(1)} from the panel's right`);
    }
    L.done(40);
  });
});

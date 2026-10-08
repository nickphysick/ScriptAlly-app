/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 (design-refs/contact-list-v15.html) — the rendered locks, §6 of the pack, at 1512 × 900 and
 * 1280 × 800. Each was proved red on the pre-v15 build (8093d64f) and by its named mutation before its green was
 * believed (reports/contact-list-v15/mutation-proofs-p*.jsonl).
 *
 * ⚠️ RUN AT ONE WORKER (`--workers=1`): the writing cases share the harness account with every other contact suite.
 */
import { test } from "@playwright/test";
import { Ledger, WIDTHS15, checkOverflow, near, openContacts } from "./cl15Lib";

test.beforeEach(async ({ page }) => {
  /* the page guide auto-opens on a first visit; every lock but the guide's reads the page without it */
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

const SUB = "Your agent data underpins everything. Collate and manage it here.";

/* ── lock 1 · the open header: no container behind the title; 72 / 58; the exact subheader; the text block and the
   drawing centred against each other; the drawing 56 (36) after the text; the hairline ── */
test("CL15-1 · header", async ({ page }) => {
  const L = new Ledger("cl15-1");
  for (const vp of WIDTHS15) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const narrow = vp.width < 1440;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const hd = pick('.aglist [data-cl15="header"]');
      const title = hd?.querySelector<HTMLElement>("h1") ?? null;
      const txt = hd?.querySelector<HTMLElement>('[data-cl15="header-text"]') ?? null;
      const art = hd?.querySelector<HTMLElement>('[data-cl15="header-art"]') ?? null;
      const img = art?.querySelector<HTMLElement>("img") ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, b: x.bottom, h: x.height, w: x.width }; };
      /* every box from the title up to the group: none may paint a background (no card, no band) */
      const painted: string[] = [];
      for (let e: HTMLElement | null = title; e && !e.classList.contains("clv-group"); e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor, bi = getComputedStyle(e).backgroundImage;
        if (bg !== "rgba(0, 0, 0, 0)" || bi !== "none") painted.push(`${e.tagName}.${e.className} ${bg} ${bi.slice(0, 30)}`);
      }
      const tcs = title ? getComputedStyle(title) : null;
      return {
        found: !!hd && !!title, painted,
        size: tcs ? parseFloat(tcs.fontSize) : null, family: tcs?.fontFamily ?? null,
        oneLine: !!title && !!tcs && title.getBoundingClientRect().height < parseFloat(tcs.lineHeight) * 1.5,
        titleText: title?.textContent ?? null, pageTitle: title?.hasAttribute("data-page-title") ?? false,
        sub: hd?.querySelector('[data-cl15="sub"]')?.textContent ?? null,
        add: hd?.querySelector('[data-cl15="add"]')?.textContent ?? null, disc: hd?.querySelector('[data-cl15="discover"]')?.textContent ?? null,
        txt: b(txt), art: b(art), img: b(img),
        line: hd ? `${getComputedStyle(hd).borderBottomWidth} ${getComputedStyle(hd).borderBottomStyle} ${getComputedStyle(hd).borderBottomColor}` : null,
        imgW: img ? img.getBoundingClientRect().width : null,
        rows: document.querySelectorAll('.aglist [data-clv="row"]').length,
      };
    });
    if (!r.found) { L.check("CL15-1 population: the open header renders", w, false, "no header"); continue; }
    L.check("CL15-1 no card or band behind the title — nothing between it and the group paints", w, r.painted.length === 0, r.painted.join(" | "));
    L.check(`CL15-1 the title is Special Elite at ${narrow ? 58 : 72} (±1), on one line`, w, r.size !== null && near(r.size, narrow ? 58 : 72, 1) && /Special Elite/.test(r.family ?? "") && r.oneLine, `${r.size} ${r.family} oneLine ${r.oneLine}`);
    L.check("CL15-1 the title is the count, \"N agents on file\", and carries data-page-title", w, /^\d+ agents? on file$/.test(r.titleText ?? "") && r.pageTitle, `${r.titleText} ${r.pageTitle}`);
    L.check("CL15-1 the subheader, exactly", w, r.sub === SUB, `${r.sub}`);
    L.check("CL15-1 the two buttons: + Add an agent · Discover agents", w, r.add === "+ Add an agent" && r.disc === "Discover agents", `${r.add} · ${r.disc}`);
    const ct = r.txt ? (r.txt.t + r.txt.b) / 2 : NaN, ca = r.art ? (r.art.t + r.art.b) / 2 : NaN;
    L.check("CL15-1 the text block's centre and the drawing's are within 4px", w, Math.abs(ct - ca) <= 4, `text ${ct.toFixed(1)} drawing ${ca.toFixed(1)}`);
    L.check(`CL15-1 the drawing starts ${narrow ? 36 : 56} (±2) after the text block`, w, !!r.txt && !!r.art && near(r.art.l - r.txt.r, narrow ? 36 : 56, 2), `${r.txt && r.art ? (r.art.l - r.txt.r).toFixed(1) : "—"}`);
    L.check(`CL15-1 the drawing is ${narrow ? 310 : 400} wide`, w, r.imgW !== null && near(r.imgW, narrow ? 310 : 400, 1), `${r.imgW}`);
    L.check("CL15-1 the hairline: 1px ink at 12%", w, r.line === "1px solid rgba(28, 19, 15, 0.12)", `${r.line}`);
    await checkOverflow(page, L, w);
  }
  L.done(20);
});

/* ── lock 2 · headroom: the drawing's top clears the top bar by 8px or more ── */
test("CL15-2 · headroom", async ({ page }) => {
  const L = new Ledger("cl15-2");
  for (const vp of WIDTHS15) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const img = pick('.aglist [data-cl15="header-art"] img');
      const bar = pick(".ws-pagebar");
      const sc = img?.closest<HTMLElement>(".wpg-scroll") ?? null;
      return { img: img ? img.getBoundingClientRect().top : null, bar: bar ? bar.getBoundingClientRect().bottom : null, scrollTop: sc?.scrollTop ?? null };
    });
    L.check("CL15-2 precondition: the page is at rest (scrollTop 0)", w, r.scrollTop === 0, `${r.scrollTop}`);
    L.check("CL15-2 the drawing's top is 8px or more below the top bar", w, r.img !== null && r.bar !== null && r.img - r.bar >= 8, `img ${r.img} bar ${r.bar} gap ${r.img !== null && r.bar !== null ? (r.img - r.bar).toFixed(1) : "—"}`);
  }
  L.done(4);
});

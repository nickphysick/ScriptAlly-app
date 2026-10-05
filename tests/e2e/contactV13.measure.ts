/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactV13 — Contact list v13's locks (ref design-refs/contact-list-v13.html, §11 of the pack), on
 * the rendered page at 1512×900, 1440×900 and 1280×800. Every lock also asserts no horizontal
 * overflow of the scroller. Ledgers land in reports/contact-list-v13/ledger/. A lock that cannot find
 * its subject has FAILED: it reads null and says so.
 */
import { test } from "@playwright/test";
import { INK, Ledger, WIDTHS, box, checkOverflow, near, openContacts, pixel, sameRgb } from "./cl13Lib";

test.describe.configure({ timeout: Number(process.env.CL13_TIMEOUT ?? 900_000) });

/* ── lock 1 · the band ── */
test("CL13-1 · band", async ({ page }) => {
  const L = new Ledger("cl13-1");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
      const band = vis('.aglist [data-probe="page-header"][data-band]');
      return {
        band: b(band), bg: band ? getComputedStyle(band).backgroundColor : null,
        bar: b(vis('[data-probe="navrow"]')), main: b(vis(".ws-main")),
        disc: b(band?.querySelector(".clv-bdisc") ?? null),
        discBg: band?.querySelector(".clv-bdisc") ? getComputedStyle(band.querySelector(".clv-bdisc")!).backgroundColor : null,
        img: (band?.querySelector(".clv-bdisc img") as HTMLImageElement | null)?.getAttribute("src") ?? null,
        title: band?.querySelector("h1")?.textContent ?? null,
        intro: (band?.querySelector(".ph-intro") as HTMLElement | null)?.innerText ?? null,
        buttons: [...(band?.querySelectorAll("button") ?? [])].map((x) => x.textContent?.trim() ?? ""),
      };
    });
    L.check("CL13-1 the band exists on the Contact list", w, !!r.band, JSON.stringify(r.band));
    if (!r.band || !r.bar || !r.main) { await checkOverflow(page, L, w); continue; }
    L.check("CL13-1 anthracite rgb(42,58,82)", w, r.bg === INK, `${r.bg}`);
    L.check("CL13-1 starts at the top bar's bottom (±1)", w, near(r.band.t, r.bar.b, 1), `band ${r.band.t} bar ${r.bar.b}`);
    const y = r.band.t + Math.min(30, r.band.h / 2);
    const left = await pixel(page, r.main.l + 3, y), right = await pixel(page, r.main.r - 3, y);
    L.check("CL13-1 the band spans the main column (pixel at each edge)", w, sameRgb(left, [42, 58, 82], 3) && sameRgb(right, [42, 58, 82], 3), `left ${left} right ${right}`);
    L.check("CL13-1 the disc is 290 (±2), white, round", w, !!r.disc && near(r.disc.w, 290, 2) && near(r.disc.h, 290, 2) && r.discBg === "rgb(255, 255, 255)", `${JSON.stringify(r.disc)} ${r.discBg}`);
    L.check("CL13-1 the disc holds contact-archivist.png", w, /\/images\/contact-archivist\.png/.test(r.img ?? ""), `${r.img}`);
    L.check("CL13-1 title 'N agents on file'", w, /^(\d+ agents|One agent) on file$/.test((r.title ?? "").trim()), `${r.title}`);
    /* the mutation this exists for: restore the v12 reply-time clause → red */
    L.check("CL13-1 the sentence has no reply-time clause", w, !!r.intro && !/reply|weeks?\b/i.test(r.intro), `${r.intro}`);
    L.check("CL13-1 the sentence is ONE sentence", w, !!r.intro && (r.intro.trim().match(/[.!?](\s|$)/g) ?? []).length === 1, `${r.intro}`);
    L.check("CL13-1 buttons: + Add an agent · Discover agents", w, r.buttons.includes("+ Add an agent") && r.buttons.includes("Discover agents"), JSON.stringify(r.buttons));
    await checkOverflow(page, L, w);
  }
  L.done(33);
});

/* ── lock 2 · the 40px rhythm (Phase 1: the band to the section under it) ── */
test("CL13-2 · rhythm", async ({ page }) => {
  const L = new Ledger("cl13-2");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const band = await box(page, '.aglist [data-probe="page-header"][data-band]');
    /* the first section under the band; Phase 2 puts the numbers strip here */
    const next = await box(page, '.aglist [data-cl13="strip"]') ?? await box(page, ".aglist .clv-idxwrap");
    L.check("CL13-2 band → the next section 40 (±1)", w, !!band && !!next && near(next.t - band.b, 40, 1), `${band && next ? next.t - band.b : "—"}`);
    await checkOverflow(page, L, w);
  }
  L.done(6);
});

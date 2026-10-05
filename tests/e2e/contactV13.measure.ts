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

/* ── lock 2 · the 40px rhythm: band → strip → carousel head → list banner ── */
test("CL13-2 · rhythm", async ({ page }) => {
  const L = new Ledger("cl13-2");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const band = await box(page, '.aglist [data-probe="page-header"][data-band]');
    const strip = await box(page, '.aglist [data-cl13="strip"]');
    L.check("CL13-2 band → strip 40 (±1)", w, !!band && !!strip && near(strip.t - band.b, 40, 1), `${band && strip ? strip.t - band.b : "—"}`);
    /* the section under the strip: the carousel's head from Phase 2b, the list's banner from Phase 3 */
    const czHead = await box(page, '.aglist [data-cz="contacts"] [data-cz-head]');
    const cz = await box(page, '.aglist [data-cz="contacts"]');
    const next = czHead ?? await box(page, '.aglist [data-cl13="lbanner"]') ?? await box(page, ".aglist .clv-idxwrap");
    L.check("CL13-2 strip → the next section 40 (±1)", w, !!strip && !!next && near(next.t - strip.b, 40, 1), `${strip && next ? next.t - strip.b : "—"}`);
    if (cz) {
      const after = await box(page, '.aglist [data-cl13="lbanner"]') ?? await box(page, ".aglist .clv-idxwrap");
      L.check("CL13-2 carousel → the section under it 40 (±1)", w, !!after && near(after.t - cz.b, 40, 1), `${after ? after.t - cz.b : "—"}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(9);
});

/* ── §3 · the numbers strip: five cells, its figures, three of them pressable ── */
test("CL13-S · strip", async ({ page }) => {
  const L = new Ledger("cl13-s");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const strip = [...document.querySelectorAll<HTMLElement>('.aglist [data-cl13="strip"]')].find((e) => e.getBoundingClientRect().height > 0);
      const band = [...document.querySelectorAll<HTMLElement>('.aglist [data-probe="page-header"][data-band]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!strip) return null;
      const cells = [...strip.querySelectorAll<HTMLElement>("[data-cl13-cell]")];
      const sb = strip.getBoundingClientRect();
      return {
        w: sb.width, bandW: band?.querySelector(".ph-hin")?.getBoundingClientRect().width ?? null,
        group: strip.parentElement?.getBoundingClientRect().width ?? null,
        bg: getComputedStyle(strip).backgroundColor, radius: getComputedStyle(strip).borderTopLeftRadius,
        cells: cells.map((c) => ({
          label: c.getAttribute("data-cl13-cell"), fig: c.querySelector(".cl13-sf")?.textContent?.trim() ?? "",
          line: c.querySelector(".cl13-se")?.textContent?.trim() ?? "", pressable: c.tagName === "BUTTON",
          figFont: getComputedStyle(c.querySelector(".cl13-sf")!).fontFamily, figSize: getComputedStyle(c.querySelector(".cl13-sf")!).fontSize,
          w: c.getBoundingClientRect().width, labelTop: c.querySelector(".cl13-sl")?.getBoundingClientRect().top ?? NaN,
        })),
        intro: (band?.querySelector(".ph-intro") as HTMLElement | null)?.innerText ?? "",
        spark: strip.querySelectorAll('[data-cl13="spark"] i').length,
        title: band?.querySelector("h1")?.textContent ?? "",
      };
    });
    L.check("CL13-S the strip exists", w, !!r, JSON.stringify(r));
    if (!r) continue;
    L.check("CL13-S five cells, the mock's labels in order", w, JSON.stringify(r.cells.map((c) => c.label)) === JSON.stringify(["On file", "Fit your book", "Open now", "Typical reply", "Added this month"]), JSON.stringify(r.cells.map((c) => c.label)));
    L.check("CL13-S every label on one top (a <button> cell does not centre its content)", w, r.cells.every((c) => near(c.labelTop, r.cells[0].labelTop, 1)), r.cells.map((c) => c.labelTop.toFixed(1)).join(" "));
    const want = (r.intro.match(/want ([^.]+?) and haven/) ?? [])[1] ?? null, take = (r.cells[1].line.match(/^take (.+)$/) ?? [])[1] ?? null;
    L.check("CL13-S the band and the strip name the genre one way", w, !take || want === take, `band "${want}" strip "${take}"`);
    L.check("CL13-S equal cells (±1)", w, r.cells.length === 5 && r.cells.every((c) => near(c.w, r.cells[0].w, 1)), r.cells.map((c) => c.w.toFixed(1)).join(" "));
    L.check("CL13-S the strip is the group's full width", w, near(r.w, r.group ?? -1, 1), `${r.w} vs ${r.group}`);
    L.check("CL13-S white, 16px corners", w, r.bg === "rgb(255, 255, 255)" && r.radius === "16px", `${r.bg} ${r.radius}`);
    L.check("CL13-S figures are Special Elite at 34px", w, r.cells.every((c) => /Special Elite/.test(c.figFont) && c.figSize === "34px"), JSON.stringify(r.cells.map((c) => [c.figFont.slice(0, 20), c.figSize])));
    L.check("CL13-S exactly Fit your book, Open now and Added this month are pressable", w, JSON.stringify(r.cells.filter((c) => c.pressable).map((c) => c.label)) === JSON.stringify(["Fit your book", "Open now", "Added this month"]), "");
    const onFile = Number(r.cells[0].fig), title = Number((r.title.match(/^(\d+)/) ?? [])[1] ?? (/^One/.test(r.title) ? 1 : NaN));
    L.check("CL13-S On file = the band's count", w, onFile === title, `${onFile} vs "${r.title}"`);
    L.check("CL13-S On file's line names the agencies; six spark bars", w, /^agents, across \d+ agenc(y|ies)$/.test(r.cells[0].line) && r.spark === 6, `${r.cells[0].line} · ${r.spark}`);
    L.check("CL13-S Open now's line counts the closed", w, /^\d+ closed for now$/.test(r.cells[2].line), r.cells[2].line);
    L.check("CL13-S Typical reply reads 'N wks' and names the fastest", w, (/^\d+wks$/.test(r.cells[3].fig) && /^fastest: .+, \d+ wks?$/.test(r.cells[3].line)) || r.cells[3].fig === "—", `${r.cells[3].fig} · ${r.cells[3].line}`);
    L.check("CL13-S Added this month reads '+N'", w, /^\+\d+$/.test(r.cells[4].fig), r.cells[4].fig);
    await checkOverflow(page, L, w);
  }
  L.done(45);
});

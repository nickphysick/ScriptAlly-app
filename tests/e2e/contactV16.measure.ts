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
import { Ledger, SIZES16, near, openContacts16, mutate16, setScroll16 } from "./cl16Lib";

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the hero number back in the panel */
  A1: { js: `(() => { const b = document.querySelector('.aglist .cl15-hd [data-hp3-part="text"]'); if (b && !b.querySelector('[data-hp3-part="number"]')) { const n = document.createElement("span"); n.setAttribute("data-hp3-part", "number"); n.textContent = "41"; b.prepend(n); } })()` },
  /* every group's figure counted from the faces it draws (at most seven), not from the group */
  B1: { js: `(() => { for (const c of document.querySelectorAll('.aglist [data-cl16="strip-cell"]:not([data-k="all"])')) { const f = c.querySelector('[data-cl16="strip-fig"]'); if (f && !f.hasAttribute("data-mut")) { f.setAttribute("data-mut", ""); f.textContent = String(c.querySelectorAll('[data-cl16="strip-face"]').length); } } })()` },
  /* pressing a cell scrolls to the list */
  B2: { js: `(() => { if (window.__m16) return; window.__m16 = true; document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest('[data-cl16="strip-cell"]')) { const l = [...document.querySelectorAll('.aglist [data-cl14="list"]')].find((x) => x.getBoundingClientRect().height > 0); l && l.scrollIntoView(); } }, true); })()` },
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

  /** one read of the strip and the list beneath it */
  const readStrip = (page: Page) => page.evaluate(() => {
    const { g, sc } = (window as never as { __cl: () => { g: HTMLElement; sc: HTMLElement } }).__cl();
    const box = (window as never as { __box: (e: Element | null) => { x: number; y: number; w: number; h: number; r: number; b: number } | null }).__box;
    const num = (e: Element | null) => Number((e?.textContent ?? "").trim());
    const cells = [...g.querySelectorAll<HTMLElement>('[data-cl16="strip-cell"]')].map((c) => {
      const faces = [...c.querySelectorAll<HTMLElement>('[data-cl16="strip-face"]')];
      const more = c.querySelector('[data-cl16="strip-more"]');
      const bars = [...c.querySelectorAll<SVGRectElement>('[data-cl16="strip-bar"]')];
      return {
        k: c.dataset.k ?? "", label: (c.querySelector('[data-cl16="strip-label"]')?.textContent ?? "").trim(), fig: num(c.querySelector('[data-cl16="strip-fig"]')),
        line: (c.querySelector('[data-cl16="strip-line"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
        ns: [...c.querySelectorAll('[data-cl16="strip-n"]')].map((b) => ({ n: num(b), hot: b.getAttribute("data-hot") === "true", colour: getComputedStyle(b).color })),
        pressed: c.getAttribute("aria-pressed"), on: c.classList.contains("is-on"), topBar: getComputedStyle(c, "::before").backgroundColor, topBarH: getComputedStyle(c, "::before").height,
        box: box(c)!, faces: faces.length, rest: more ? Number((more.textContent ?? "").replace("+", "")) : 0,
        faceTops: [...new Set(faces.map((f) => Math.round(f.getBoundingClientRect().top)))].length,
        faceBg: faces[0] ? getComputedStyle(faces[0]).backgroundColor : null, faceFg: faces[0] ? getComputedStyle(faces[0]).color : null, faceW: faces[0] ? faces[0].getBoundingClientRect().width : null,
        faceStep: faces.length > 1 ? faces[1].getBoundingClientRect().left - faces[0].getBoundingClientRect().left : null,
        bars: bars.length, lastFill: bars.length ? bars[bars.length - 1].getAttribute("fill") : null, otherRust: bars.slice(0, -1).filter((b) => b.getAttribute("fill") === "#a2452a").length,
      };
    });
    const rows = [...g.querySelectorAll<HTMLElement>('[data-clv="row"]')].filter((r) => r.getBoundingClientRect().height > 0);
    const stand = (k: string) => rows.filter((r) => (k === "live" ? r.dataset.stand === "you" || r.dataset.stand === "agent" : r.dataset.stand === k)).length;
    const second = (re: RegExp) => rows.filter((r) => re.test(r.querySelector('[data-clv="qd"]')?.textContent ?? "")).length;
    const strip = g.querySelector<HTMLElement>('[data-cl16="strip"]');
    const head = g.querySelector<HTMLElement>('[data-cl16="strip-heading"]');
    const shownEl = g.querySelector<HTMLElement>('[data-cl14="shown"]');
    return {
      cells, rows: rows.length, none: stand("none"), live: stand("live"), closed: stand("closed"), you: rows.filter((r) => r.dataset.stand === "you").length,
      shut: rows.filter((r) => r.dataset.stand === "none" && r.dataset.door === "closed").length, passed: second(/^Passed/), noReply: second(/^Closed with no reply/),
      strip: strip ? { box: box(strip)!, bg: getComputedStyle(strip).backgroundColor, radius: getComputedStyle(strip).borderTopLeftRadius, cols: getComputedStyle(strip).gridTemplateColumns.split(" ").length } : null,
      heading: head ? { text: head.textContent, size: parseFloat(getComputedStyle(head).fontSize), face: getComputedStyle(head).fontFamily } : null,
      kicker: g.querySelector('[data-cl16="strip-kicker"]')?.textContent ?? "", hint: g.querySelector('[data-cl16="strip-hint"]')?.textContent ?? "",
      hd: box(g.querySelector('[data-cl15="header"]')), headBox: box(head?.parentElement ?? null), group: box(g)!,
      shown: shownEl ? Number((shownEl.textContent ?? "").replace(/[^0-9]/g, "")) : null,
      scrollTop: sc.scrollTop, wide: !!document.querySelector(".ws-app.sheet-wide"),
      desk: g.querySelectorAll('[data-cl15="desk"]').length,
    };
  });

  test("B1 · strip: four cells, figures that are the list's own groups, bars and faces", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B1");
    for (const vp of SIZES16) {
      await open(page, vp, "B1");
      const r = await readStrip(page);
      const w = `${vp.width}`;
      const c = r.cells;
      L.check("B1", `${w} four cells, labelled`, c.map((x) => x.label).join("|") === "On file|Not queried|Querying|Closed" && c.map((x) => x.k).join("|") === "all|none|live|closed", c.map((x) => `${x.k}:${x.label}`).join(" · "));
      if (c.length !== 4 || !r.strip || !r.heading) { L.check("B1", `${w} strip`, false, "no strip"); continue; }
      L.check("B1", `${w} no desk`, r.desk === 0, `${r.desk} desk`);
      L.check("B1", `${w} the list is unfiltered and has rows`, r.rows > 3 && r.rows === r.shown, `${r.rows} rows · showing ${r.shown}`);
      L.check("B1", `${w} cell 1 is every agent`, c[0].fig === r.rows, `${c[0].fig} · ${r.rows} rows`);
      L.check("B1", `${w} cell 1 = cells 2 + 3 + 4`, c[0].fig === c[1].fig + c[2].fig + c[3].fig, `${c[0].fig} · ${c[1].fig} + ${c[2].fig} + ${c[3].fig}`);
      L.check("B1", `${w} not queried is the list's own`, c[1].fig === r.none, `${c[1].fig} · ${r.none} rows`);
      L.check("B1", `${w} querying is the list's own`, c[2].fig === r.live, `${c[2].fig} · ${r.live} rows`);
      L.check("B1", `${w} closed is the list's own`, c[3].fig === r.closed, `${c[3].fig} · ${r.closed} rows`);
      L.check("B1", `${w} on file line`, /^\d+ added this week, \d+ this month$/.test(c[0].line) && c[0].ns[0].n <= c[0].ns[1].n + 6, `"${c[0].line}"`);
      L.check("B1", `${w} not queried line`, /^\d+ ready to query, \d+ closed to submissions$/.test(c[1].line) && c[1].ns[1].n === r.shut && c[1].ns[0].n <= c[1].fig - c[1].ns[1].n, `"${c[1].line}" · ${r.shut} shut rows`);
      L.check("B1", `${w} querying line`, /^\d+ waiting on you, \d+ past their reply time$/.test(c[2].line) && c[2].ns[0].n <= r.you && c[2].ns[1].n <= r.you && c[2].ns[0].n + c[2].ns[1].n >= r.you, `"${c[2].line}" · ${r.you} your-move rows`);
      L.check("B1", `${w} waiting on you is hot only above zero`, c[2].ns[0].hot === c[2].ns[0].n > 0 && (!c[2].ns[0].hot || c[2].ns[0].colour === "rgb(162, 69, 42)"), JSON.stringify(c[2].ns[0]));
      L.check("B1", `${w} closed line`, /^\d+ passed, \d+ no reply$/.test(c[3].line) && c[3].ns[0].n === r.passed && c[3].ns[1].n === r.noReply, `"${c[3].line}" · ${r.passed} passed rows · ${r.noReply} no-reply rows`);
      L.check("B1", `${w} twenty bars, this week's in rust and no other`, c[0].bars === 20 && c[0].lastFill === "#a2452a" && c[0].otherRust === 0, `${c[0].bars} bars · last ${c[0].lastFill} · ${c[0].otherRust} other rust`);
      for (const x of c.slice(1)) {
        L.check("B1", `${w} ${x.k}: its faces and its "+N" are its figure`, x.faces + x.rest === x.fig && x.faces <= 7, `${x.faces} faces + ${x.rest} · figure ${x.fig}`);
        L.check("B1", `${w} ${x.k}: one row of faces`, x.faces === 0 || x.faceTops === 1, `${x.faceTops} rows`);
        if (x.faces > 0) {
          const want = x.k === "none" ? ["rgb(255, 255, 255)", "rgb(42, 58, 82)"] : x.k === "live" ? ["rgb(42, 58, 82)", "rgb(244, 238, 229)"] : ["rgb(179, 172, 165)", "rgb(43, 38, 34)"];
          L.check("B1", `${w} ${x.k}: face colours`, x.faceBg === want[0] && x.faceFg === want[1], `${x.faceBg} · ${x.faceFg}`);
          L.check("B1", `${w} ${x.k}: face size`, near(x.faceW, r.wide ? 30 : 26, 0.5) && (x.faceStep === null || near(x.faceStep, (r.wide ? 30 : 26) - 5, 0.5)), `${x.faceW} wide · step ${x.faceStep}`);
        }
      }
      /* the population: at least one group has more agents than faces, or "its figure is its group" proves nothing */
      L.check("B1", `${w} a group overflows its faces`, c.slice(1).some((x) => x.rest > 0), c.slice(1).map((x) => `${x.k} +${x.rest}`).join(" · "));
      L.check("B1", `${w} one white box, radius 14`, r.strip.bg === "rgb(255, 255, 255)" && r.strip.radius === "14px" && r.strip.cols === 4, JSON.stringify(r.strip));
      L.check("B1", `${w} equal cells in one row`, c.every((x) => near(x.box.w, c[0].box.w, 0.6) && near(x.box.y, c[0].box.y, 0.5) && near(x.box.h, c[0].box.h, 0.5)), c.map((x) => x.box.w.toFixed(1)).join(" · "));
      L.check("B1", `${w} on the column`, near(r.strip.box.x, r.group.x, 1) && near(r.strip.box.r, r.group.r, 1), `${r.strip.box.x.toFixed(1)}–${r.strip.box.r.toFixed(1)} · column ${r.group.x.toFixed(1)}–${r.group.r.toFixed(1)}`);
      L.check("B1", `${w} heading row`, r.heading.text === "At a glance" && near(r.heading.size, r.wide ? 28 : 25, 0.5) && /Special Elite/.test(r.heading.face) && r.kicker === "Where your agents stand" && r.hint === "Choose a card to filter the list", `${r.heading.text} ${r.heading.size} · "${r.kicker}" · "${r.hint}"`);
      L.check("B1", `${w} ${r.wide ? 40 : 34} under the panel, the box 14 under the heading`, !!r.hd && !!r.headBox && near(r.headBox.y - r.hd.b, r.wide ? 40 : 34, 1.5) && near(r.strip.box.y - r.headBox.b, 14, 1.5), `${r.hd && r.headBox ? (r.headBox.y - r.hd.b).toFixed(1) : "?"} · ${r.headBox ? (r.strip.box.y - r.headBox.b).toFixed(1) : "?"}`);
    }
    L.done(50);
  });

  test("B2 · filter: a cell filters the list, combines with a chip, clears, and never scrolls", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("B2");
    const cell = (k: string) => page.locator(`.aglist [data-cl16="strip-cell"][data-k="${k}"]`).filter({ visible: true }).first();
    const settle = () => page.waitForTimeout(700);
    for (const vp of SIZES16) {
      await open(page, vp, "B2");
      const w = `${vp.width}`;
      /* a non-zero scroll position with the strip still on screen, so "it did not scroll" is not "it was at 0" */
      const before = await setScroll16(page, 140);
      const r0 = await readStrip(page);
      /* the absence of the strip is a reading, not a crash */
      if (r0.cells.length !== 4) { L.check("B2", `${w} strip`, false, `${r0.cells.length} cells: no strip to press`); continue; }
      L.check("B2", `${w} at rest nothing is pressed`, r0.cells.every((c) => c.pressed === "false") && r0.rows === r0.cells[0].fig, r0.cells.map((c) => c.pressed).join(","));
      L.check("B2", `${w} the page is scrolled, with the strip on screen`, before > 100 && r0.cells[2].box.y > 0, `scrollTop ${before} · cell y ${r0.cells[2].box.y.toFixed(0)}`);
      await cell("live").click(); await settle();
      const r1 = await readStrip(page);
      const live = r1.cells[2];
      L.check("B2", `${w} Querying is pressed`, live.pressed === "true" && live.on && live.topBar === "rgb(45, 58, 80)" && live.topBarH === "3px", `${live.pressed} · ${live.topBar} ${live.topBarH}`);
      L.check("B2", `${w} the list is that group`, r1.rows === live.fig && r1.live === r1.rows && r1.rows > 0 && r1.rows < r0.rows, `${r1.rows} rows · ${r1.live} querying · figure ${live.fig}`);
      L.check("B2", `${w} "Showing" matches`, r1.shown === r1.rows, `showing ${r1.shown} · ${r1.rows} rows`);
      L.check("B2", `${w} the figures did not move`, r1.cells.map((c) => c.fig).join() === r0.cells.map((c) => c.fig).join(), r1.cells.map((c) => c.fig).join());
      L.check("B2", `${w} the press did not scroll`, near(r1.scrollTop, before, 1), `${before} → ${r1.scrollTop}`);
      /* combine with a chip: Open for submissions → Open. ⚠️ The filter row is brought on screen FIRST: a popover
         closes on any scroll, and a click that has to scroll its own button into view closes the menu it opens. */
      await page.evaluate(async () => {
        const { g } = (window as never as { __cl: () => { g: HTMLElement } }).__cl();
        g.querySelector('[data-cl14="fbar"]:not(.cl14-fbar--measure)')?.scrollIntoView({ block: "center" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      await page.locator('.aglist [data-cl14="fbar"]:not(.cl14-fbar--measure) [data-cl14-dd="open"]').filter({ visible: true }).first().click();
      await page.locator('[data-opt="open:open"]').filter({ visible: true }).first().click();
      await settle();
      const r2 = await page.evaluate(() => {
        const { g } = (window as never as { __cl: () => { g: HTMLElement } }).__cl();
        const rows = [...g.querySelectorAll<HTMLElement>('[data-clv="row"]')].filter((x) => x.getBoundingClientRect().height > 0);
        return { rows: rows.length, both: rows.filter((x) => (x.dataset.stand === "you" || x.dataset.stand === "agent") && x.dataset.door === "open").length, clear: !!g.querySelector('[data-cl14="fbar"]:not(.cl14-fbar--measure) [data-cl14="clear-all"]') };
      });
      L.check("B2", `${w} with a chip: both apply`, r2.rows === r2.both && r2.rows <= r1.rows, `${r2.rows} rows · ${r2.both} querying and open · was ${r1.rows}`);
      L.check("B2", `${w} "Clear all" is offered`, r2.clear, `${r2.clear}`);
      await page.keyboard.press("Escape").catch(() => {});
      await page.locator('.aglist [data-cl14="fbar"]:not(.cl14-fbar--measure) [data-cl14="clear-all"]').filter({ visible: true }).first().click(); await settle();
      const r3 = await readStrip(page);
      L.check("B2", `${w} "Clear all" clears both`, r3.rows === r0.rows && r3.cells.every((c) => c.pressed === "false"), `${r3.rows} rows · ${r3.cells.map((c) => c.pressed).join(",")}`);
      /* pressing the pressed cell clears it (from the same scrolled position as before) */
      const again = await setScroll16(page, 140);
      await cell("closed").click(); await settle();
      const r4 = await readStrip(page);
      L.check("B2", `${w} Closed filters to closed`, r4.cells[3].pressed === "true" && r4.rows === r4.cells[3].fig && r4.closed === r4.rows, `${r4.rows} rows · ${r4.closed} closed · figure ${r4.cells[3].fig}`);
      await cell("closed").click(); await settle();
      const r5 = await readStrip(page);
      L.check("B2", `${w} pressing it again restores all`, r5.rows === r0.rows && r5.cells[3].pressed === "false", `${r5.rows} rows`);
      /* cell 1 clears */
      await cell("none").click(); await settle();
      const r6 = await readStrip(page);
      L.check("B2", `${w} Not queried filters to not queried`, r6.cells[1].pressed === "true" && r6.rows === r6.cells[1].fig && r6.none === r6.rows, `${r6.rows} rows · ${r6.none} not queried`);
      await cell("all").click(); await settle();
      const r7 = await readStrip(page);
      L.check("B2", `${w} On file clears the filter and is never pressed`, r7.rows === r0.rows && r7.cells.every((c) => c.pressed === "false"), `${r7.rows} rows`);
      L.check("B2", `${w} no press scrolled`, near(r7.scrollTop, again, 1), `${again} → ${r7.scrollTop}`);
    }
    L.done(30);
  });
});

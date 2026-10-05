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

/** The list's whole visible state — its rows in order, the controls' labels and on-states, the filter
 *  line and the index strip. Lock 3 requires it IDENTICAL before and after a figure is pressed. */
async function listState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
    const rows = [...root.querySelectorAll<HTMLElement>('[data-clv="row"]')].map((r) => r.getAttribute("data-agent") ?? r.textContent?.slice(0, 40));
    const ctl = [...root.querySelectorAll<HTMLElement>('.clv-ctl button, [data-cl13="lbanner"] button, [data-cl13-pill]')].map((b) => `${b.textContent?.trim()}|${b.getAttribute("data-on") ?? ""}|${b.className}`);
    const line = (root.querySelector('[data-clv="bar"], [data-cl13="fline"]') as HTMLElement | null)?.innerText ?? "";
    const strip = (root.querySelector('[data-clv="idxwrap"]') as HTMLElement | null)?.innerText ?? "";
    const find = [...root.querySelectorAll<HTMLInputElement>('input[placeholder="Find an agent"]')].map((i) => i.value);
    return JSON.stringify({ rows, ctl, line, strip, find });
  });
}
const czState = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const cz = [...document.querySelectorAll<HTMLElement>('.aglist [data-cz="contacts"]')].find((e) => e.getBoundingClientRect().height > 0);
  if (!cz) return null;
  return {
    title: cz.querySelector(".cz-title")?.textContent ?? "",
    cards: [...cz.querySelectorAll<HTMLElement>('[data-cl13="ccard"]')].map((c) => c.getAttribute("data-agent")),
    pressed: [...cz.querySelectorAll<HTMLElement>("[data-cz-set]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-cz-set")),
    clear: !!cz.querySelector('[data-cl13="cz-clear"]'),
  };
});

/* ── lock 3 · a figure fills the carousel and leaves the list identical ── */
test("CL13-3 · figures fill the carousel, not the list", async ({ page }) => {
  const L = new Ledger("cl13-3");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const before = await listState(page);
    const cz0 = await czState(page);
    L.check("CL13-3 the carousel exists, on a set", w, !!cz0 && cz0.pressed.length === 1 && !cz0.clear, JSON.stringify(cz0));
    for (const [label, key] of [["Fit your book", "fit"], ["Open now", "open"], ["Added this month", "added"]] as const) {
      const fig = Number((await page.locator(`.aglist [data-cl13-fig="${key}"] .cl13-sf`).first().textContent() ?? "").replace("+", ""));
      await page.locator(`.aglist [data-cl13-fig="${key}"]`).first().click();
      await page.waitForTimeout(250);
      const cz = await czState(page);
      L.check(`CL13-3 ${label}: the carousel holds exactly the figure's agents`, w, !!cz && cz.cards.length === fig, `${cz?.cards.length} cards vs figure ${fig}`);
      L.check(`CL13-3 ${label}: the head reads "${label} · ${fig}", the selector dims, Clear shows`, w, !!cz && cz.title === `${label} · ${fig}` && cz.pressed.length === 0 && cz.clear, JSON.stringify(cz));
      L.check(`CL13-3 ${label}: the cell is pressed`, w, (await page.locator(`.aglist [data-cl13-fig="${key}"]`).first().getAttribute("aria-pressed")) === "true", "");
      L.check(`CL13-3 ${label}: the list is IDENTICAL — rows, order, controls, filter line, index`, w, (await listState(page)) === before, "list changed");
      /* pressing the figure again hands the carousel back */
      await page.locator(`.aglist [data-cl13-fig="${key}"]`).first().click();
      await page.waitForTimeout(250);
      const back = await czState(page);
      L.check(`CL13-3 ${label}: pressed again, the previous set is back`, w, JSON.stringify(back) === JSON.stringify(cz0), `${JSON.stringify(back)} vs ${JSON.stringify(cz0)}`);
    }
    /* Clear and a selector choice also hand it back */
    await page.locator('.aglist [data-cl13-fig="open"]').first().click();
    await page.locator('.aglist [data-cl13="cz-clear"]').first().click();
    await page.waitForTimeout(200);
    L.check("CL13-3 Clear returns the carousel to where it was", w, JSON.stringify(await czState(page)) === JSON.stringify(cz0), "");
    await page.locator('.aglist [data-cl13-fig="open"]').first().click();
    await page.locator('.aglist [data-cz-set="new"]').first().click();
    await page.waitForTimeout(200);
    const onNew = await czState(page);
    L.check("CL13-3 a selector choice clears the figure and shows its set", w, !!onNew && onNew.pressed.join() === "new" && !onNew.clear && (await page.locator('.aglist [data-cl13-fig="open"]').first().getAttribute("aria-pressed")) === "false", JSON.stringify(onNew));
    L.check("CL13-3 after all of it, the list is still identical", w, (await listState(page)) === before, "list changed");
    /* …and the other direction: narrowing the LIST leaves the carousel exactly as it was */
    await page.locator('.aglist [data-cz-set="fit"]').first().click();
    await page.waitForTimeout(200);
    const czBefore = await czState(page);
    const find = page.locator('.aglist input[placeholder="Find an agent"]').first();
    await find.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await find.fill("zzqx no such agent");
    await page.waitForTimeout(300);
    L.check("CL13-3 a Find that empties the list leaves the carousel identical", w, JSON.stringify(await czState(page)) === JSON.stringify(czBefore), `${JSON.stringify(await czState(page))} vs ${JSON.stringify(czBefore)}`);
    await find.fill("");
    await page.waitForTimeout(200);
    await checkOverflow(page, L, w);
  }
  L.done(60);
});

/* ── lock 4 · the carousel's cards are the agent card ── */
test("CL13-4 · carousel cards are the agent card", async ({ page }) => {
  const L = new Ledger("cl13-4");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    /* the set with the most cards, so the track scrolls and the peek shows */
    await page.locator('.aglist [data-cz-set="new"]').first().click();
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const cz = [...document.querySelectorAll<HTMLElement>('.aglist [data-cz="contacts"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const cards = [...cz.querySelectorAll<HTMLElement>('[data-cl13="ccard"]')];
      const track = cz.querySelector<HTMLElement>("[data-cz-track]")!;
      const c0 = cards[0], c1 = cards[1];
      return {
        n: cards.length,
        sig: cards.every((c) => c.classList.contains("ac") && !!c.querySelector('[data-cl13-blk="head"] .acq-ini') && !!c.querySelector('[data-cl13-blk="s-genres"] .acq-lab') && !!c.querySelector('[data-cl13-blk="s-wishlist"] .acq-lab') && !!c.querySelector('[data-cl13-blk="s-materials"] .acq-lab')),
        acMarks: cz.querySelectorAll("[data-ac]").length,
        ids: cards.filter((c) => c.querySelector("[id]")).length,
        w: c0?.getBoundingClientRect().width ?? 0,
        gap: c0 && c1 ? c1.getBoundingClientRect().left - c0.getBoundingClientRect().right : null,
        peek: track.scrollWidth > track.clientWidth && cards.some((c) => { const b = c.getBoundingClientRect(), t = track.getBoundingClientRect(); return b.left < t.right && b.right > t.right; }),
        agent: c0?.getAttribute("data-agent") ?? null,
        genres: c0?.querySelector('[data-cl13-blk="s-genres"]')?.innerHTML.replace(/data-(ac|cl13-blk)=/g, "data-x=") ?? null,
      };
    });
    L.check("CL13-4 cards render", w, r.n >= 2, `${r.n}`);
    L.check("CL13-4 every card is an agent card (.ac) built of the shared blocks", w, r.sig, "");
    L.check("CL13-4 no card carries an id (a carousel cannot duplicate the quick view's)", w, r.ids === 0, `${r.ids}`);
    L.check("CL13-4 no card carries a data-ac marker (the open card's probes stay unambiguous)", w, r.acMarks === 0, `${r.acMarks}`);
    L.check("CL13-4 318 wide, 18 apart, the last card peeking", w, near(r.w, 318, 1) && near(r.gap ?? -1, 18, 1) && r.peek, `${r.w} ${r.gap} peek ${r.peek}`);
    /* the same agent's blocks in the quick view are the same markup */
    await page.locator(`.aglist [data-cl13="ccard"][data-agent="${r.agent}"]`).first().click();
    await page.locator('[data-ac="overlay"] [data-ac="s-genres"]').first().waitFor({ timeout: 6000 }).catch(() => {});
    const qv = await page.evaluate(() => ({
      genres: document.querySelector('[data-ac="overlay"] [data-ac="s-genres"]')?.innerHTML.replace(/data-(ac|cl13-blk)=/g, "data-x=") ?? null,
    }));
    L.check("CL13-4 clicking a card opens the agent card", w, qv.genres !== null, "");
    L.check("CL13-4 the quick view's genres block IS the carousel card's", w, qv.genres === r.genres, `${qv.genres?.slice(0, 80)} vs ${r.genres?.slice(0, 80)}`);
    await page.keyboard.press("Escape");
    await page.locator('[data-ac="overlay"]').waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    /* the card's button opens the journey directly — the drawer, with no agent card over the page */
    const go = page.locator('.aglist [data-cl13="ccard"] [data-cl13="cgo"][data-act="log"]').first();
    if (await go.count()) {
      await go.click();
      await page.locator("[data-qad-drawer]:visible").first().waitFor({ timeout: 6000 }).catch(() => {});
      const st = await page.evaluate(() => ({
        drawer: [...document.querySelectorAll("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().height > 0).length,
        card: [...document.querySelectorAll('[data-ac="overlay"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
      }));
      L.check("CL13-4 the card's Log a query opens the drawer and no agent card", w, st.drawer === 1 && st.card === 0, JSON.stringify(st));
      await page.locator(".qad-dx").first().click();
      { const d = page.getByRole("button", { name: "Discard" }); if (await d.count()) await d.click(); }
      await page.locator("[data-qad-drawer]:visible").first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    } else L.check("CL13-4 a Log a query card was on the set", w, false, "none");
    await checkOverflow(page, L, w);
  }
  L.done(27);
});

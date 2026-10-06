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
import { AT_1512, INK, Ledger, WIDTHS, box, checkOverflow, near, openContacts, pixel, sameRgb } from "./cl13Lib";

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
    const next = czHead ?? await box(page, '.aglist [data-ob="contacts"]') ?? await box(page, ".aglist .clv-idxwrap");
    L.check("CL13-2 strip → the next section 40 (±1)", w, !!strip && !!next && near(next.t - strip.b, 40, 1), `${strip && next ? next.t - strip.b : "—"}`);
    if (cz) {
      const after = await box(page, '.aglist [data-ob="contacts"]') ?? await box(page, ".aglist .clv-idxwrap");
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
    /* the banner's controls: every pill's words and whether it is set (v13 P3; v12's .clv-ctl is retired) */
    const ctl = [...root.querySelectorAll<HTMLElement>('[data-cl13-ctl="banner"] button')].map((b) => `${b.textContent?.trim()}|${b.className}|${b.getAttribute("aria-label") ?? ""}`);
    const line = (root.querySelector('[data-cl13="fline"]') as HTMLElement | null)?.innerText ?? "";
    const strip = (root.querySelector('[data-clv="idxwrap"]') as HTMLElement | null)?.innerText ?? "";
    const find = [...root.querySelectorAll<HTMLInputElement>('input[placeholder="Find an agent"]')].map((i) => i.value);
    /* a guard against a snapshot of nothing: the controls must be there to compare */
    if (ctl.length < 4) throw new Error(`listState: the banner's controls are missing (${ctl.length}) — a snapshot of nothing compares equal to itself`);
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
    const find = page.locator('.aglist [data-cl13-ctl="banner"] input').first();
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

const vis = (page: import("@playwright/test").Page, sel: string) => page.locator(`.aglist ${sel}`).filter({ visible: true }).first();
const pillText = (page: import("@playwright/test").Page, k: string) => vis(page, `[data-cl13-ctl="banner"] [data-lp="${k}"]`).innerText().then((t) => t.replace(/\s+/g, " ").trim());
const pillBg = (page: import("@playwright/test").Page, k: string) => vis(page, `[data-cl13-ctl="banner"] [data-lp="${k}"]`).evaluate((e) => getComputedStyle(e).backgroundColor);
const openPop = async (page: import("@playwright/test").Page, k: string) => {
  await vis(page, `[data-cl13-ctl="banner"] [data-lp="${k}"]`).evaluate((e) => e.scrollIntoView({ block: "center" }));
  await vis(page, `[data-cl13-ctl="banner"] [data-lp="${k}"]`).click();
  await page.locator(`[data-lpop="${k}"]`).waitFor({ timeout: 4000 });
};
const popCount = (page: import("@playwright/test").Page) => page.locator(".lpop").count();

/* ── §5 · the open banner ── */
test("CL13-B · banner", async ({ page }) => {
  const L = new Ledger("cl13-b");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const ob = [...document.querySelectorAll<HTMLElement>('.aglist [data-ob="contacts"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!ob) return null;
      const h = ob.querySelector<HTMLElement>(".ob-h")!, k = ob.querySelector<HTMLElement>(".ob-k")!, img = ob.querySelector<HTMLImageElement>("[data-ob-perch]");
      const ctl = ob.querySelector<HTMLElement>("[data-ob-ctl]"), p = ob.querySelector<HTMLElement>(".ob-p")!;
      const b = ob.getBoundingClientRect(), cb = ctl?.getBoundingClientRect();
      return {
        k: k.innerText, kUpper: getComputedStyle(k).textTransform, h: h.textContent, hFace: getComputedStyle(h).fontFamily, hSize: getComputedStyle(h).fontSize,
        p: p.innerText, img: img?.getAttribute("src") ?? null, imgW: img?.getBoundingClientRect().width ?? 0,
        ctlIn: !!cb && cb.left >= b.left - 0.5 && cb.right <= b.right + 0.5, ctlRight: cb ? b.right - cb.right : null,
        pills: [...(ctl?.querySelectorAll("[data-lp]") ?? [])].map((x) => x.getAttribute("data-lp")),
      };
    });
    L.check("CL13-B the banner exists", w, !!r, "");
    if (!r) continue;
    L.check("CL13-B eyebrow 'N agents · M need you', set in capitals", w, /^\d+ agents? · \d+ need you$/i.test(r.k.trim()) && r.kUpper === "uppercase", `${r.k} ${r.kUpper}`);
    L.check("CL13-B heading 'Every agent, on file.' in Special Elite 42", w, r.h === "Every agent, on file." && /Special Elite/.test(r.hFace) && r.hSize === "42px", `${r.h} ${r.hFace.slice(0, 20)} ${r.hSize}`);
    L.check("CL13-B the sentence is the card index's", w, /^Your card index( for .+)?: what each agent wants, how fast they reply, and where your query to them stands\.$/.test(r.p.trim()), r.p);
    L.check("CL13-B the perched Archivist, 170 wide", w, /contact-hawk\.webp/.test(r.img ?? "") && near(r.imgW, 170, 1), `${r.img} ${r.imgW}`);
    L.check("CL13-B the controls: Find, Filters, Grouped, Sort and its direction, right-aligned inside the banner", w, r.ctlIn && near(r.ctlRight ?? -1, 0, 1) && JSON.stringify(r.pills) === JSON.stringify(["filter", "group", "sort", "dir"]), `${r.ctlIn} ${r.ctlRight} ${JSON.stringify(r.pills)}`);
    await checkOverflow(page, L, w);
  }
  L.done(21);
});

/* ── lock 7 · the pills and their popovers ── */
test("CL13-7 · pills", async ({ page }) => {
  const L = new Ledger("cl13-7");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    L.check("CL13-7 at rest: 'Filters', 'Grouped: Letter', 'Sort: Surname', none set", w,
      /^\S*\s*Filters$/.test(await pillText(page, "filter")) && (await pillText(page, "group")).includes("Grouped: Letter") && (await pillText(page, "sort")).includes("Sort: Surname") && (await pillBg(page, "filter")) !== INK,
      `${await pillText(page, "filter")} | ${await pillText(page, "group")} | ${await pillText(page, "sort")}`);
    /* filters: tick two options with a count, in two sections */
    await openPop(page, "filter");
    const picks = await page.evaluate(() => {
      const opts = [...document.querySelectorAll<HTMLElement>('[data-lpop="filter"] [data-opt]')].map((o) => ({ k: o.getAttribute("data-opt")!, n: Number(o.querySelector("small")?.textContent ?? "0") }));
      const a = opts.find((o) => o.k.startsWith("open:") && o.n > 0), b = opts.find((o) => o.k.startsWith("genres:") && o.n > 0);
      return [a?.k ?? null, b?.k ?? null];
    });
    L.check("CL13-7 two options with a count are on offer", w, !!picks[0] && !!picks[1], JSON.stringify(picks));
    const pop = page.locator('[data-lpop="filter"]');
    await pop.evaluate((e) => { e.scrollTop = 0; });
    await page.locator(`[data-lpop="filter"] [data-opt="${picks[0]}"]`).click();
    /* the panel keeps its scroll while you tick */
    await pop.evaluate((e) => { e.scrollTop = 120; });
    await page.locator(`[data-lpop="filter"] [data-opt="${picks[1]}"]`).evaluate((e) => (e as HTMLElement).click());
    const kept = await pop.evaluate((e) => e.scrollTop);
    L.check("CL13-7 the panel keeps its scroll while you tick", w, near(kept, 120, 2), `${kept}`);
    L.check("CL13-7 'Filters (2)' after two ticks, anthracite", w, (await pillText(page, "filter")).includes("Filters (2)") && (await pillBg(page, "filter")) === INK, `${await pillText(page, "filter")} ${await pillBg(page, "filter")}`);
    /* one popover at a time: opening Group closes Filters */
    await vis(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click();
    await page.waitForTimeout(150);
    L.check("CL13-7 one popover at a time", w, (await popCount(page)) === 1 && (await page.locator('[data-lpop="group"]').count()) === 1, `${await popCount(page)}`);
    await page.locator('[data-lpop="group"] [data-opt="group:stand"]').click();
    await page.waitForTimeout(150);
    L.check("CL13-7 'Grouped: Where you stand', anthracite, and the popover closed", w, (await pillText(page, "group")).includes("Grouped: Where you stand") && (await pillBg(page, "group")) === INK && (await popCount(page)) === 0, `${await pillText(page, "group")}`);
    await openPop(page, "sort");
    await page.locator('[data-lpop="sort"] [data-opt="sort:due"]').click();
    await page.waitForTimeout(150);
    const dir = await vis(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').getAttribute("aria-label");
    L.check("CL13-7 'Sort: Next date', anthracite; the direction says 'Soonest first'", w, (await pillText(page, "sort")).includes("Sort: Next date") && (await pillBg(page, "sort")) === INK && dir === "Sort order: Soonest first", `${await pillText(page, "sort")} ${dir}`);
    await vis(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').click();
    L.check("CL13-7 the toggle names the reversed order and turns anthracite", w, (await vis(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').getAttribute("aria-label")) === "Sort order: Latest first" && (await pillBg(page, "dir")) === INK, "");
    /* Escape with a popover open closes ONLY the popover */
    const before = await listState(page);
    await openPop(page, "group");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const after = { pops: await popCount(page), card: await page.locator('[data-ac="overlay"]').count(), list: (await listState(page)) === before, group: await pillText(page, "group") };
    L.check("CL13-7 Escape closes only the popover", w, after.pops === 0 && after.card === 0 && after.list && after.group.includes("Where you stand"), JSON.stringify(after));
    /* an outside press closes it */
    await openPop(page, "filter");
    await page.locator('.aglist [data-ob="contacts"] .ob-h').dispatchEvent("pointerdown", { bubbles: true });
    await page.waitForTimeout(150);
    L.check("CL13-7 an outside press closes it", w, (await popCount(page)) === 0, "");
    await checkOverflow(page, L, w);
  }
  L.done(33);
});

/* ── §5 · the filter line ── */
test("CL13-F · filter line", async ({ page }) => {
  const L = new Ledger("cl13-f");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    L.check("CL13-F no filter line on an unfiltered list", w, (await page.locator('.aglist [data-cl13="fline"]').count()) === 0, "");
    const total = await page.locator('.aglist [data-clv="row"]').count();
    await openPop(page, "filter");
    const k = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-lpop="filter"] [data-opt^="open:"]')].find((o) => Number(o.querySelector("small")?.textContent ?? 0) > 0)?.getAttribute("data-opt") ?? null);
    const n = Number(await page.locator(`[data-lpop="filter"] [data-opt="${k}"] small`).textContent());
    await page.locator(`[data-lpop="filter"] [data-opt="${k}"]`).click();
    await page.locator("[data-lpop-done]").click();
    await page.waitForTimeout(200);
    const line = await vis(page, '[data-cl13="fline"]').innerText();
    const rows = await page.locator('.aglist [data-clv="row"]').count();
    L.check("CL13-F live application: the option's count IS the rows shown", w, rows === n, `${rows} rows vs count ${n}`);
    L.check("CL13-F 'Showing n of N' and one chip", w, line.includes(`Showing ${n} of ${total}`) && (await page.locator('.aglist [data-cl13-chip]').count()) === 1, line.replace(/\n/g, " "));
    const heads = await page.locator('.aglist [data-cl13="gcount"]').allInnerTexts();
    L.check("CL13-F group headings read 'n of m'", w, heads.length > 0 && heads.every((t) => /^\d+ of \d+$/i.test(t.trim())), JSON.stringify(heads.slice(0, 4)));
    /* the search joins the line as its own chip */
    await vis(page, '[data-cl13-ctl="banner"] input').fill("a");
    await page.waitForTimeout(200);
    L.check("CL13-F the search text is a chip too", w, (await page.locator('.aglist [data-cl13-chip="find"]').count()) === 1, "");
    await vis(page, '[data-cl13-chip="find"] button').click();
    await page.waitForTimeout(150);
    L.check("CL13-F a chip's ✕ removes just that one", w, (await page.locator('.aglist [data-cl13-chip]').count()) === 1, "");
    /* nothing matches: say so, with a Clear button */
    await vis(page, '[data-cl13-ctl="banner"] input').fill("zzqx no such agent");
    await page.waitForTimeout(200);
    L.check("CL13-F nothing matches → the message and Clear", w, (await page.locator('.aglist [data-cl13="none"]').count()) === 1 && (await page.locator('.aglist [data-cl13="none-clear"]').count()) === 1, "");
    await vis(page, '[data-cl13="none-clear"]').click();
    await page.waitForTimeout(200);
    L.check("CL13-F Clear returns the whole list and the line goes", w, (await page.locator('.aglist [data-clv="row"]').count()) === total && (await page.locator('.aglist [data-cl13="fline"]').count()) === 0, "");
    await checkOverflow(page, L, w);
  }
  L.done(27);
});

/* ── lock 8 · remembered for the visit ── */
test("CL13-8 · remembered settings", async ({ page, browser }) => {
  const L = new Ledger("cl13-8");
  const vp = { width: 1512, height: 900 };
  await openContacts(page, vp);
  await openPop(page, "group");
  await page.locator('[data-lpop="group"] [data-opt="group:agency"]').click();
  await openPop(page, "filter");
  const k = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-lpop="filter"] [data-opt^="open:"]')].find((o) => Number(o.querySelector("small")?.textContent ?? 0) > 0)?.getAttribute("data-opt") ?? null);
  await page.locator(`[data-lpop="filter"] [data-opt="${k}"]`).click();
  await page.locator("[data-lpop-done]").click();
  const set = { group: await pillText(page, "group"), filter: await pillText(page, "filter") };
  L.check("CL13-8 set: Grouped: Agency and one filter", "1512", set.group.includes("Grouped: Agency") && set.filter.includes("Filters (1)"), JSON.stringify(set));
  /* the same tab, reloaded */
  await page.reload();
  await page.locator(".clv-row").first().waitFor({ timeout: 30_000 });
  const back = { group: await pillText(page, "group"), filter: await pillText(page, "filter"), chips: await page.locator('.aglist [data-cl13-chip]').count() };
  L.check("CL13-8 a reload in the same tab restores both", "1512", back.group.includes("Grouped: Agency") && back.filter.includes("Filters (1)") && back.chips === 1, JSON.stringify(back));
  /* the extra: to the Query Centre and back */
  await page.goto("/queries"); await page.waitForTimeout(1200);
  await page.goto("/agents"); await page.locator(".clv-row").first().waitFor({ timeout: 30_000 });
  L.check("CL13-8 (extra) to the Query Centre and back, both restored", "1512", (await pillText(page, "group")).includes("Grouped: Agency") && (await pillText(page, "filter")).includes("Filters (1)"), "");
  /* a fresh session: a new context carries no sessionStorage */
  const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", viewport: vp });
  const p2 = await ctx.newPage();
  await openContacts(p2, vp, { keep: true });
  const fresh = { group: await pillText(p2, "group"), filter: await pillText(p2, "filter") };
  L.check("CL13-8 a fresh session restores nothing", "1512", fresh.group.includes("Grouped: Letter") && !/\(/.test(fresh.filter), JSON.stringify(fresh));
  await ctx.close();
  L.done(4);
});

/* ── §5 · the sticky slim bar ── */
test("CL13-SB · sticky bar", async ({ page }) => {
  const L = new Ledger("cl13-sb");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const read = () => page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>('.aglist [data-sbar="contacts"]')].find((e) => e.isConnected)!;
      const inner = bar?.querySelector<HTMLElement>(".sbar-in");
      const sc = bar?.closest<HTMLElement>(".wpg-scroll");
      const ib = inner?.getBoundingClientRect(), sb = sc?.getBoundingClientRect();
      return {
        stuck: bar?.hasAttribute("data-stuck") ?? false, inert: inner?.hasAttribute("inert") ?? false,
        vis: inner ? getComputedStyle(inner).visibility : "",
        visible: !!ib && !!sb && ib.bottom > sb.top + 1, bg: inner ? getComputedStyle(inner).backgroundColor : "",
        mz: !!bar?.querySelector('[data-cl13="mz"]') && getComputedStyle(bar.querySelector('[data-cl13="mz"]')!).display !== "none",
        filter: bar?.querySelector('[data-lp="filter"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        /* every control inside the bar's own box: the mock clips its controls at 1512; the build must not */
        clipped: (() => { const row = bar?.querySelector<HTMLElement>(".sbar-row"); if (!row) return -1; const rr = row.getBoundingClientRect();
          const ctl = row.querySelector<HTMLElement>(".cl13-ctl")?.getBoundingClientRect();
          const out = [...row.querySelectorAll<HTMLElement>("[data-lp], .cl13-find")].filter((c) => { const b = c.getBoundingClientRect(); return b.right > rr.right + 0.5 || b.left < rr.left - 0.5; }).length;
          /* …and no mini-A–Z letter runs under the controls (a shrunk container with letters overflowing it) */
          const under = ctl ? [...row.querySelectorAll<HTMLElement>(".cl13-mz button")].filter((c) => c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().right > ctl.left + 0.5).length : 0;
          return out + under; })(),
      };
    });
    const rest = await read();
    L.check("CL13-SB at rest: off, out of sight, inert, and visibility hidden (so nothing targets its inputs)", w, !rest.stuck && !rest.visible && rest.inert && rest.vis === "hidden", JSON.stringify(rest));
    /* scroll until the banner has gone under the bar */
    await page.evaluate(() => {
      const ob = [...document.querySelectorAll<HTMLElement>('.aglist [data-ob="contacts"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = ob.closest<HTMLElement>(".wpg-scroll")!;
      sc.scrollTop += ob.getBoundingClientRect().bottom - sc.getBoundingClientRect().top + 60;
    });
    await page.waitForTimeout(400);
    const on = await read();
    L.check("CL13-SB once the banner is gone: on, in sight, not inert, visible", w, on.stuck && on.visible && !on.inert && on.vis === "visible", JSON.stringify(on));
    L.check("CL13-SB on the slate tray at .94", w, on.bg === "rgba(214, 223, 230, 0.94)", on.bg);
    L.check("CL13-SB the mini A–Z only at 1441px and wider", w, on.mz === (vp.width >= 1441), `${on.mz}`);
    L.check("CL13-SB no control is clipped by the bar (the mock's own fault, not copied)", w, on.clipped === 0, `${on.clipped} clipped`);
    /* the bar's pills share state with the banner's */
    /* ⚠️ CLICKED IN PLACE: Playwright's click scrolls its target into view, and scrolling to a sticky pill
       takes the page back to the top, where the bar hides — the click would land on the shell's bar */
    await page.locator('.aglist [data-sbar="contacts"] [data-lp="filter"]').evaluate((e) => (e as HTMLElement).click());
    await page.locator('[data-lpop="filter"]').waitFor({ timeout: 4000 });
    const k = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-lpop="filter"] [data-opt^="open:"]')].find((o) => Number(o.querySelector("small")?.textContent ?? 0) > 0)?.getAttribute("data-opt") ?? null);
    await page.locator(`[data-lpop="filter"] [data-opt="${k}"]`).evaluate((e) => (e as HTMLElement).click());
    await page.locator("[data-lpop-done]").evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(200);
    const banner = await page.evaluate(() => document.querySelector('.aglist [data-cl13-ctl="banner"] [data-lp="filter"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "");
    L.check("CL13-SB a filter set in the bar shows on the banner's pill too", w, (await read()).filter.includes("(1)") && banner.includes("(1)"), `${banner}`);
    await checkOverflow(page, L, w);
  }
  L.done(21);
});

/* ── lock 5 · the workspace: slate, the perch, the letter tabs, the rows' spacing ── */
test("CL13-5 · workspace", async ({ page }) => {
  const L = new Ledger("cl13-5");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const ws = [...document.querySelectorAll<HTMLElement>('.aglist [data-wsp="contacts"]')].find((e) => e.getBoundingClientRect().height > 0);
      const ob = [...document.querySelectorAll<HTMLElement>('.aglist [data-ob="contacts"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!ws || !ob) return null;
      const wb = ws.getBoundingClientRect(), perch = ob.querySelector<HTMLElement>("[data-ob-perch]")?.getBoundingClientRect();
      const tabs = [...ws.querySelectorAll<HTMLElement>('[data-clv="band"] b')];
      const rule = ws.querySelector<HTMLElement>('[data-clv="band"] i');
      const rows = [...ws.querySelectorAll<HTMLElement>('[data-clv="row"]')].slice(0, 6).map((x) => x.getBoundingClientRect());
      const gaps: number[] = [];
      for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i].left - rows[i - 1].left) < 1 && rows[i].top > rows[i - 1].bottom - 1 && rows[i].top - rows[i - 1].bottom < 40) gaps.push(Math.round((rows[i].top - rows[i - 1].bottom) * 10) / 10);
      const strip = ws.querySelector<HTMLElement>('[data-clv="idx"]');
      return {
        bannerBg: getComputedStyle(ob).backgroundColor, wsBg: getComputedStyle(ws).backgroundColor, radius: getComputedStyle(ws).borderTopLeftRadius,
        perchDrop: perch ? Math.round((perch.bottom - wb.top) * 10) / 10 : null,
        tabBg: tabs[0] ? getComputedStyle(tabs[0]).backgroundColor : null, tabColour: tabs[0] ? getComputedStyle(tabs[0]).color : null,
        tabFace: tabs[0] ? getComputedStyle(tabs[0]).fontFamily : null,
        ruleH: rule ? getComputedStyle(rule).height : null, ruleBg: rule ? getComputedStyle(rule).backgroundColor : null,
        gaps, stripIn: !!strip && ws.contains(strip), stripBg: strip ? getComputedStyle(strip).backgroundColor : null,
        stripSticky: strip ? getComputedStyle(strip.parentElement!).position : null,
        railGone: document.querySelectorAll('.aglist [data-clv="rail"]').length === 0,
        wsW: wb.width, colW: ws.parentElement!.getBoundingClientRect().width,
      };
    });
    L.check("CL13-5 the workspace and the banner exist", w, !!r, "");
    if (!r) continue;
    L.check("CL13-5 the banner is transparent", w, r.bannerBg === "rgba(0, 0, 0, 0)", r.bannerBg);
    L.check("CL13-5 the workspace is slate rgb(214,223,230), 22px corners", w, r.wsBg === "rgb(214, 223, 230)" && r.radius === "22px", `${r.wsBg} ${r.radius}`);
    L.check("CL13-5 the perch's feet 14 (±2) into the workspace", w, near(r.perchDrop ?? -99, 14, 2), `${r.perchDrop}`);
    L.check("CL13-5 the letter tabs are anthracite, cream, Special Elite", w, r.tabBg === INK && r.tabColour === "rgb(245, 241, 235)" && /Special Elite/.test(r.tabFace ?? ""), `${r.tabBg} ${r.tabColour} ${r.tabFace?.slice(0, 20)}`);
    L.check("CL13-5 the tab sits on a 2px anthracite rule", w, r.ruleH === "2px" && r.ruleBg === INK, `${r.ruleH} ${r.ruleBg}`);
    L.check("CL13-5 rows 10 apart (±1)", w, r.gaps.length >= 2 && r.gaps.every((g) => near(g, 10, 1)), JSON.stringify(r.gaps));
    L.check("CL13-5 the A–Z strip is inside the workspace, white, and not sticky", w, r.stripIn && r.stripBg === "rgb(255, 255, 255)" && r.stripSticky !== "sticky", `${r.stripIn} ${r.stripBg} ${r.stripSticky}`);
    L.check("CL13-5 the rail is gone; the workspace is the column's full width", w, r.railGone && near(r.wsW, r.colW, 1), `${r.railGone} ${r.wsW} vs ${r.colW}`);
    await checkOverflow(page, L, w);
  }
  L.done(30);
});

/* ── lock 6 · the row's edge is the query's state colour, deep ── */
test("CL13-6 · row edge", async ({ page }) => {
  const L = new Ledger("cl13-6");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const probe = document.createElement("i"); document.body.appendChild(probe);
      const tok = (v: string) => { probe.style.background = `var(${v})`; return getComputedStyle(probe).backgroundColor; };
      const want = { you: tok("--state-you-deep"), agent: tok("--state-agent-deep"), queried: tok("--state-queried-deep"), offer: tok("--state-offer-deep"), closed: tok("--state-closed-deep") };
      probe.remove();
      const rows = [...document.querySelectorAll<HTMLElement>('.aglist [data-clv="row"]')];
      const seen: Record<string, { n: number; bad: string[] }> = {};
      let topRules = 0;
      for (const x of rows) {
        const edge = x.getAttribute("data-edge") ?? "none";
        const before = getComputedStyle(x, "::before");
        const bg = before.backgroundColor, wpx = before.width, left = before.left, top = before.top, bottom = before.bottom;
        const ok = edge === "none" ? bg === "rgba(0, 0, 0, 0)" : bg === (want as Record<string, string>)[edge];
        (seen[edge] ??= { n: 0, bad: [] }).n++;
        if (!ok || wpx !== "6px" || left !== "0px" || top !== "0px" || bottom !== "0px") seen[edge].bad.push(`${bg} ${wpx} ${left}/${top}/${bottom}`);
        if (parseFloat(getComputedStyle(x, "::after").height) === 3) topRules++;
      }
      return { want, seen, topRules, n: rows.length };
    });
    L.check("CL13-6 the five deep tokens resolve (the two-nothings guard)", w, Object.values(r.want).every((v) => v !== "rgba(0, 0, 0, 0)" && v !== ""), JSON.stringify(r.want));
    for (const k of ["you", "agent", "queried", "closed", "none"]) {
      const s = r.seen[k];
      L.check(`CL13-6 ${k}: population, and a 6px left band in its colour`, w, !!s && s.n > 0 && s.bad.length === 0, s ? `${s.n} rows, bad ${s.bad.slice(0, 2).join(" | ")}` : "none on the fixture");
    }
    /* the account holds no agent whose standing query is an offer — the branch is ENTERED in the lab
       below; here it is only held to its colour wherever it does appear */
    L.check("CL13-6 offer: any offer row on the account wears its own colour", w, !r.seen.offer || r.seen.offer.bad.length === 0, r.seen.offer ? `${r.seen.offer.n} rows` : "none on the account (entered in the lab)");
    L.check("CL13-6 no 3px top rule anywhere", w, r.topRules === 0, `${r.topRules}`);
    await checkOverflow(page, L, w);
  }
  /* the offer branch, entered: the lab's cast carries an offer (fq-7 on fx-bare) — no sign-in */
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  await page.waitForSelector('[data-clv="row"]');
  const lab = await page.evaluate(() => {
    const probe = document.createElement("i"); document.body.appendChild(probe);
    probe.style.background = "var(--state-offer-deep)"; const want = getComputedStyle(probe).backgroundColor; probe.remove();
    const rows = [...document.querySelectorAll<HTMLElement>('[data-clv="row"][data-edge="offer"]')].filter((x) => x.getBoundingClientRect().height > 0);
    return { want, n: rows.length, bad: rows.map((x) => getComputedStyle(x, "::before")).filter((b) => b.backgroundColor !== want || b.width !== "6px").map((b) => `${b.backgroundColor} ${b.width}`) };
  });
  L.check("CL13-6 offer (the lab): population, and a 6px left band in the offer's deep slate", "lab", lab.n > 0 && lab.bad.length === 0 && lab.want !== "rgba(0, 0, 0, 0)", JSON.stringify(lab));
  L.done(28);
});

/* ── §5 · the hover tray: the next step, then Open card; the step opens the journey without the card ── */
test("CL13-T · hover tray", async ({ page }) => {
  const L = new Ledger("cl13-t");
  await openContacts(page, AT_1512);
  const row = page.locator('.aglist [data-clv="row"][data-stand="none"][data-door="open"]').first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await page.waitForTimeout(200);
  const t = await row.evaluate((x) => {
    const tray = x.querySelector<HTMLElement>('[data-cl13="tray"]');
    const rr = x.getBoundingClientRect(), tr = tray?.getBoundingClientRect();
    return {
      op: tray ? getComputedStyle(tray).opacity : null, btns: [...(tray?.querySelectorAll("button, [role=button]") ?? [])].map((b) => (b.textContent ?? "").trim()),
      dy: tr ? Math.round(((tr.top + tr.height / 2) - (rr.top + rr.height / 2)) * 10) / 10 : null, h: tr ? Math.round(tr.height * 10) / 10 : null,
      inside: !!tr && tr.top >= rr.top - 0.5 && tr.bottom <= rr.bottom + 0.5 && tr.right <= rr.right + 0.5,
    };
  });
  L.check("CL13-T hover shows the tray: the next step, then Open card", "1512", t.op === "1" && t.btns.length === 2 && t.btns[1] === "Open card" && t.btns[0] === "Log a query", JSON.stringify(t));
  L.check("CL13-T the tray sits on the row's centre line, one line of 32px pills, wholly inside the row", "1512", t.dy !== null && Math.abs(t.dy) <= 1 && near(t.h ?? 0, 32, 1) && t.inside, JSON.stringify(t));
  await row.locator('[data-cl13="tray-act"]').click();
  await page.locator("[data-qad-drawer]:visible").first().waitFor({ timeout: 6000 }).catch(() => {});
  const st = await page.evaluate(() => ({
    drawer: [...document.querySelectorAll("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().height > 0).length,
    card: [...document.querySelectorAll('[data-ac="overlay"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
  }));
  L.check("CL13-T the tray's step opens the journey without the card", "1512", st.drawer === 1 && st.card === 0, JSON.stringify(st));
  /* put the page back whichever way it went — a guarded tidy-up, so a wrong route fails on the check
     above rather than timing out here (measured: an unguarded ✕ waited 15 minutes for a drawer that
     a broken step never opened) */
  if (st.drawer) {
    await page.locator(".qad-dx:visible").first().click({ timeout: 5000 }).catch(() => {});
    { const d = page.getByRole("button", { name: "Discard" }); if (await d.count()) await d.click({ timeout: 3000 }).catch(() => {}); }
    await page.locator("[data-qad-drawer]:visible").first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  if (st.card) { await page.keyboard.press("Escape"); await page.locator('[data-ac="overlay"]').first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {}); }
  await row.hover();
  await row.locator('[data-cl13="tray-open"]').click();
  await page.locator('[data-ac="overlay"]').waitFor({ timeout: 6000 }).catch(() => {});
  L.check("CL13-T Open card opens the agent card", "1512", (await page.locator('[data-ac="overlay"]').count()) === 1, "");
  await page.keyboard.press("Escape");
  L.done(4);
});

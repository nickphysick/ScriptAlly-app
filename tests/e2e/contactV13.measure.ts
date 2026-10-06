/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactV13 — Contact list v13's locks (ref design-refs/contact-list-v13.html, §11 of the pack), on
 * the rendered page at 1512×900, 1440×900 and 1280×800. Every lock also asserts no horizontal
 * overflow of the scroller. Ledgers land in reports/contact-list-v13/ledger/. A lock that cannot find
 * its subject has FAILED: it reads null and says so.
 */
import { expect, test } from "@playwright/test";
import { AT_1512, DIR, INK, LOADED_ROW, Ledger, WIDTHS, box, checkOverflow, near, openContacts, pixel, sameRgb } from "./cl13Lib";
import { openApp } from "./pageHeaderV2Lib";
import { liftMotionSuppression } from "./measure";

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
/** what differs between two listState snapshots — a red that names its part, not just "list changed" */
function listDiff(a: string, b: string): string {
  const A = JSON.parse(a) as Record<string, unknown>, B = JSON.parse(b) as Record<string, unknown>;
  const keys = Object.keys(A).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
  return keys.length === 0 ? "same" : keys.map((k) => `${k}: ${JSON.stringify(A[k]).slice(0, 160)} → ${JSON.stringify(B[k]).slice(0, 160)}`).join(" | ");
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
  let lsNow = "";
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
      L.check(`CL13-3 ${label}: the list is IDENTICAL — rows, order, controls, filter line, index`, w, (lsNow = await listState(page)) === before, listDiff(before, lsNow));
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
    L.check("CL13-3 after all of it, the list is still identical", w, (lsNow = await listState(page)) === before, listDiff(before, lsNow));
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
  await page.locator(LOADED_ROW).first().waitFor({ timeout: 30_000 });
  const back = { group: await pillText(page, "group"), filter: await pillText(page, "filter"), chips: await page.locator('.aglist [data-cl13-chip]').count() };
  L.check("CL13-8 a reload in the same tab restores both", "1512", back.group.includes("Grouped: Agency") && back.filter.includes("Filters (1)") && back.chips === 1, JSON.stringify(back));
  /* the extra: to the Query Centre and back */
  await page.goto("/queries"); await page.waitForTimeout(1200);
  await page.goto("/agents"); await page.locator(LOADED_ROW).first().waitFor({ timeout: 30_000 });
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

/* ── lock 9 + HK v2 §9 · Housekeeping in the floating tab and the half-screen drawer ─────────────── */
const HDR = '[data-hdr="housekeeping"]';
const q = (s: string) => `${HDR} ${s}`;
/** Normalise the typographic quotes so a straight-quoted spec line compares with the curly build. */
const plain = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
async function openHk(page: import("@playwright/test").Page) {
  await page.mouse.click(5, 5).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  /* H is bound once the list has rendered; straight after a reload the first press can land before
     that (measured: one run in four), so press again rather than reading a missing drawer as a fault */
  for (let i = 0; i < 3 && !(await page.locator(HDR).isVisible()); i++) {
    await page.keyboard.press("h");
    await page.locator(HDR).waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(250);
}

test("CL13-9 · housekeeping drawer", async ({ page }) => {
  const L = new Ledger("cl13-9");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const t = await page.evaluate(() => {
      const win = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0);
      const tab = document.querySelector<HTMLElement>('[data-ftab="housekeeping"]');
      if (!win || !tab) return null;
      const a = win.getBoundingClientRect(), b = tab.getBoundingClientRect();
      return { right: Math.round((a.right - b.right) * 10) / 10, bottom: Math.round((a.bottom - b.bottom) * 10) / 10, vis: getComputedStyle(tab).visibility, op: getComputedStyle(tab).opacity };
    });
    L.check("CL13-9 the tab sits 24 ±1 from the main window's right and bottom", w, !!t && near(t.right, 24, 1) && near(t.bottom, 24, 1) && t.vis === "visible", JSON.stringify(t));
    await openHk(page);
    const d = await box(page, HDR);
    const want = vp.width === 1512 ? 780 : vp.width === 1280 ? 717 : Math.min(780, vp.width * 0.56);
    L.check("CL13-9 H opens the drawer, 780 wide at 1512 and 717 at 1280", w, !!d && near(d.w, want, 1), `${d?.w} want ${want}`);
    /* the header's title does not move when row 3 goes — a measured A/B on the one element */
    const tops = await page.evaluate((s) => {
      const t = document.querySelector<HTMLElement>(`${s} [data-hkv="title-h"]`), r3 = document.querySelector<HTMLElement>(`${s} [data-hkv="r3"]`);
      if (!t || !r3) return null;
      const a = t.getBoundingClientRect().top; r3.style.display = "none"; void t.offsetHeight;
      const b = t.getBoundingClientRect().top; r3.style.display = ""; return { with: a, without: b };
    }, HDR);
    L.check("CL13-9 the header block's title top is unchanged with row 3 present", w, !!tops && Math.abs(tops.with - tops.without) <= 0.5, JSON.stringify(tops));
    await page.locator(q('[data-hkv="row"] [data-hkv="rh"]')).first().click();
    const g = await page.evaluate((s) => {
      const why = document.querySelector(`${s} [data-hkv="row"].open [data-hkv="why"]`)?.getBoundingClientRect();
      const fix = document.querySelector(`${s} [data-hkv="row"].open [data-hkv="fix"]`)?.getBoundingClientRect();
      return why && fix ? { whyR: why.right, fixL: fix.left, fixR: fix.right } : null;
    }, HDR);
    L.check("CL13-9 an open row's fix sits right of its why", w, !!g && g.fixL > g.whyR && g.fixR <= (d?.r ?? 0), JSON.stringify(g));
    const hov = await page.evaluate((s) => { const el = document.querySelector<HTMLElement>(`${s} [data-hdr="body"]`); return el ? el.scrollWidth - el.clientWidth : NaN; }, HDR);
    L.check("CL13-9 the drawer's body does not overflow sideways", w, hov <= 0, `${hov}`);
    const tabGone = await page.evaluate(() => { const t = document.querySelector<HTMLElement>('[data-ftab="housekeeping"]'); return !t || getComputedStyle(t).visibility === "hidden" || getComputedStyle(t).opacity === "0"; });
    L.check("CL13-9 the tab hides while its drawer is open", w, tabGone, "");
    /* the dim closes it — click its far-left edge, which the drawer never covers */
    await page.locator('[data-hdr="dim"][data-hdr-of="housekeeping"]').click({ position: { x: 20, y: 300 } });
    await page.waitForTimeout(250);
    L.check("CL13-9 the dim closes the drawer", w, (await box(page, HDR)) === null, "");
    await openHk(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    L.check("CL13-9 Escape closes the drawer", w, (await box(page, HDR)) === null, "");
    await checkOverflow(page, L, w);
  }
  L.done(24);
});

test("CL13-HK · start here, the copy, the fixes and the toggle", async ({ page }) => {
  /* a missing subject must FAIL, named, in seconds — never wait out the 15-minute case timeout */
  page.setDefaultTimeout(15_000);
  const L = new Ledger("cl13-hk");
  await openContacts(page, AT_1512);
  await page.evaluate(() => { localStorage.removeItem("sa.hkGrouping"); sessionStorage.setItem("sa.hkGrouping", "agent"); });
  await page.reload(); await page.locator(LOADED_ROW).first().waitFor();
  await openHk(page);
  /* §9.9 the old session value is taken once, then deleted; the choice outlives a reload */
  const mig = await page.evaluate(() => ({ ss: sessionStorage.getItem("sa.hkGrouping"), ls: localStorage.getItem("sa.hkGrouping"), view: document.querySelector('[data-hdr="housekeeping"] [data-hkv="body-wrap"]')?.getAttribute("data-view") }));
  L.check("HK-9 the old sessionStorage key is taken on first read and removed", "1512", mig.ss === null && mig.ls === "agent" && mig.view === "agent", JSON.stringify(mig));
  await page.click(q('[data-hkv="view"][data-v="detail"]'));
  await page.reload(); await page.locator(LOADED_ROW).first().waitFor(); await openHk(page);
  const v2 = await page.evaluate(() => ({ ls: localStorage.getItem("sa.hkGrouping"), view: document.querySelector('[data-hdr="housekeeping"] [data-hkv="body-wrap"]')?.getAttribute("data-view") }));
  L.check("HK-9 the toggle persists across a reload in localStorage", "1512", v2.ls === "detail" && v2.view === "detail", JSON.stringify(v2));
  /* a broken toggle must fail HERE, by name — not as a missing row further down */
  if (v2.view !== "detail") await page.click(q('[data-hkv="view"][data-v="detail"]'));
  /* §9.2 Start here is shut by default and opens on tap */
  const start = page.locator(q('[data-hkv="start-label"] + [data-hkv="row"]'));
  const shut = await start.evaluate((r) => ({ open: r.classList.contains("open"), body: r.querySelector('[data-hkv="body"]')?.getBoundingClientRect().height ?? 0 }));
  L.check("HK-2 Start here is shut by default (its body has height 0)", "1512", !shut.open && shut.body === 0, JSON.stringify(shut));
  await start.locator('[data-hkv="rh"]').click();
  const opened = await start.evaluate((r) => r.querySelector('[data-hkv="body"]')?.getBoundingClientRect().height ?? 0);
  L.check("HK-2 … and opens on tap", "1512", opened > 40, `${opened}`);
  await start.locator('[data-hkv="rh"]').click();
  /* §9.3 the copy is §4's word for word — reply and materials, live and not live */
  const SPEC = {
    reply: { t: (f: string) => `How long ${f} takes to reply`, live: (f: string) => `You've queried ${f}. Add this and you'll see the date their answer is due, and when it's fair to follow up.`, not: (f: string) => `Add this and, once you query ${f}, you'll see when to expect an answer.`, where: `Most agencies say on their submissions page, something like "we aim to reply within 8 weeks".` },
    materials: { t: (f: string) => `What ${f} wants you to send`, live: (f: string) => `You've queried ${f}. Note what they ask for so you can check it matches what you sent.`, not: (f: string) => `Note what they ask for, and it'll be listed for you when you're ready to query ${f}.`, where: `Their submissions page will say, for example "query letter, one-page synopsis and the first three chapters".` },
  } as const;
  const seen: Record<string, number> = {};
  for (const gap of ["reply", "materials"] as const) {
    for (const live of [true, false]) {
      const rows = page.locator(q(`[data-hkv="row"][data-gap="${gap}"]`));
      const n = await rows.count();
      let hit = -1;
      for (let i = 0; i < n; i++) if ((await rows.nth(i).locator('[data-hkv="queried"]').count() > 0) === live) { hit = i; break; }
      if (hit < 0) { L.check(`HK-3 ${gap} ${live ? "live" : "not live"}: population`, "1512", false, "no such row on the account"); continue; }
      const r = rows.nth(hit);
      await r.locator('[data-hkv="rh"]').click();
      const got = await r.evaluate((x) => ({ t: x.querySelector('[data-hkv="title"]')?.textContent ?? "", why: x.querySelector('[data-hkv="why"]')?.textContent ?? "", where: (x.querySelector('[data-hkv="where"]')?.textContent ?? "").replace(/^Where to find it/, "") }));
      const f = plain(got.t).match(gap === "reply" ? /^How long (\S+) takes/ : /^What (\S+) wants/)?.[1] ?? "?";
      const s = SPEC[gap];
      L.check(`HK-3 ${gap} ${live ? "live" : "not live"}: title, why and where equal §4`, "1512",
        plain(got.t) === s.t(f) && plain(got.why) === (live ? s.live(f) : s.not(f)) && plain(got.where) === s.where, JSON.stringify(got));
      seen[`${gap}/${live}`] = 1;
      await r.locator('[data-hkv="rh"]').click();
    }
  }
  /* §9.7 the materials fix: steps 1 / 5 / 500, and a unit switch snaps to 3 / 10 / 5,000 */
  const mrow = page.locator(q('[data-hkv="row"][data-gap="materials"]')).first();
  await mrow.locator('[data-hkv="rh"]').click();
  const fx = mrow.locator('[data-hkv="fix"]');
  await fx.locator('[data-mt="smp"]').click();
  const txt = () => fx.locator('[data-ae="smp-step"] b').innerText();
  const steps: string[] = [];
  for (const u of ["Chapters", "Pages", "Words"]) {
    await fx.locator(`[data-ae="unit"] [data-v="${u}"]`).click();
    steps.push(await txt());
    await fx.locator('[data-ae="smp-step"] [data-d="1"]').click();
    steps.push(await txt());
  }
  L.check("HK-7 the opening sample snaps to 3 / 10 / 5,000 and steps by 1 / 5 / 500", "1512",
    JSON.stringify(steps) === JSON.stringify(["First 3", "First 4", "First 10", "First 15", "First 5,000", "First 5,500"]), JSON.stringify(steps));
  L.check("HK-7 Save is enabled once something is ticked", "1512", await mrow.locator('[data-hkv="save"]').isEnabled(), "");
  await mrow.locator('[data-hkv="rh"]').click();
  /* §9.4 the card link carries what was picked: two genres → the card on Wishlist with both in its draft.
     ⚠️ ENTERED IN THE LAB: every agent on the harness account states its genres, so the account has no
     genres gap to open (measured — the first run waited on a row that is not there). */
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  await page.waitForSelector('[data-clv="row"]');
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await openHk(page);
  if ((await page.locator(q('[data-hkv="body-wrap"]')).getAttribute("data-view")) !== "detail") await page.click(q('[data-hkv="view"][data-v="detail"]'));
  const grow = page.locator(q('[data-hkv="row"][data-gap="genres"]')).first();
  await grow.locator('[data-hkv="rh"]').click();
  const chips = grow.locator('[data-hkv="genre-chip"]');
  /* a chip may carry a hint after an interpunct ("Thriller · your book") — the genre is what precedes it */
  const names = [await chips.nth(0).innerText(), await chips.nth(1).innerText()].map((s) => s.split("·")[0].trim());
  await chips.nth(0).click(); await chips.nth(1).click();
  await grow.locator('[data-hkv="card-link"]').click();
  await page.locator('[data-ac="overlay"]').waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  const card = await page.evaluate(() => ({
    tab: document.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute("data-tab") ?? null,
    /* the CHOSEN chips only — the field's suggestion list names every genre and would satisfy "includes" */
    genres: [...document.querySelectorAll('[data-ae="genres"] .ae-chip')].map((c) => (c.firstChild?.textContent ?? "").trim().toLowerCase()).sort(),
    save: !(document.querySelector<HTMLButtonElement>('[data-ae="save"]')?.disabled ?? true),
    drawer: [...document.querySelectorAll('[data-hdr="housekeeping"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
  }));
  L.check("HK-4 the card opens on Wishlist, its draft holds both picked genres, and Save is enabled", "1512",
    card.tab === "want" && JSON.stringify(card.genres) === JSON.stringify(names.map((n) => n.toLowerCase()).sort()) && card.save, JSON.stringify({ ...card, names }));
  /* put it back: discard the draft without saving */
  await page.keyboard.press("Escape");
  { const d = page.getByRole("button", { name: /^Discard/ }); if (await d.count()) await d.first().click({ timeout: 3000 }).catch(() => {}); }
  await page.keyboard.press("Escape").catch(() => {});
  L.done(11);
});

/* ── HK v2 §9.5 / §9.8 / §9.10 · the writing cases: each restores the account in the same run ── */
test("CL13-HKW · Later, Undo and the reminder chip, read back from Firestore", async ({ page }) => {
  /* a missing subject must FAIL, named, in seconds — never wait out the 15-minute case timeout */
  page.setDefaultTimeout(15_000);
  const L = new Ledger("cl13-hkw");
  const { harnessDb } = await import("./harnessDocs");
  const fs = await import("firebase/firestore");
  const { db, uid } = await harnessDb();
  const uRef = fs.doc(db, "users", uid);
  const dk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const plus = (n: number) => dk(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));

  /* §9.8 Undo after a reply-time save restores the deadlines */
  await openContacts(page, AT_1512);
  await openHk(page);
  const rrow = page.locator(q('[data-hkv="row"][data-gap="reply"]:has([data-hkv="queried"])')).first();
  const agentId = ((await rrow.getAttribute("data-key")) ?? "").split(":")[0];
  expect(agentId, "population first — no live reply gap on the account").not.toBe("");
  const aRef = fs.doc(db, "users", uid, "agents", agentId);
  const aBefore = (await fs.getDoc(aRef)).data() ?? {};
  const mine = (await fs.getDocs(fs.query(fs.collection(db, "users", uid, "queries"), fs.where("agentId", "==", agentId)))).docs
    .map((d) => ({ ref: d.ref, data: d.data() })).filter((x) => typeof x.data.dateSent === "string");
  const ARRANGED = "2026-01-01T00:00:00.000Z";
  try {
    for (const x of mine) await fs.updateDoc(x.ref, { responseDeadline: ARRANGED });
    await page.waitForTimeout(1500);
    await rrow.locator('[data-hkv="rh"]').click();
    await rrow.locator('[data-hkv="save"]').click();
    const moved = async () => { let n = 0; for (const x of mine) if ((await fs.getDoc(x.ref)).data()?.responseDeadline !== ARRANGED) n++; return n; };
    await expect.poll(moved, { message: "the save moved no stored deadline", timeout: 15_000 }).toBeGreaterThan(0);
    L.check("HK-8 the save moved the agent's stored deadlines", "1512", (await moved()) > 0, `${mine.length} queries`);
    await page.locator(q('[data-hkv="undo"]')).click();
    await expect.poll(moved, { message: "Undo did not restore the deadline", timeout: 15_000 }).toBe(0);
    const w = (await fs.getDoc(aRef)).data()?.responseTimeWeeks ?? null;
    L.check("HK-8 Undo restores every deadline and the reply time", "1512", (await moved()) === 0 && JSON.stringify(w) === JSON.stringify(aBefore.responseTimeWeeks ?? null), `weeks ${w}`);
  } finally {
    await fs.updateDoc(aRef, { responseTimeWeeks: "responseTimeWeeks" in aBefore ? aBefore.responseTimeWeeks : fs.deleteField() });
    for (const x of mine) await fs.updateDoc(x.ref, { responseDeadline: "responseDeadline" in x.data ? x.data.responseDeadline : fs.deleteField() });
    const left = await Promise.all(mine.map(async (x) => (await fs.getDoc(x.ref)).data()?.responseDeadline ?? null));
    expect(left.filter((x) => x === ARRANGED).length, "THE ARRANGED DEADLINE WAS NOT REMOVED — the account has been changed").toBe(0);
  }

  /* §9.10 a reopen chip creates exactly one UserTask with that dueDate */
  const orow = page.locator(q('[data-hkv="row"][data-gap="reopen"]')).first();
  const oId = ((await orow.getAttribute("data-key")) ?? "").split(":")[0];
  expect(oId, "population first — no reopen gap on the account").not.toBe("");
  await orow.locator('[data-hkv="rh"]').click();
  const chip = orow.locator('[data-hkv="remind-chip"]').first();
  const on = await chip.getAttribute("data-on");
  const tasksFor = async () => (await fs.getDocs(fs.query(fs.collection(db, "users", uid, "tasks"), fs.where("agentId", "==", oId)))).docs;
  const had = new Set((await tasksFor()).map((d) => d.id));
  try {
    await chip.click();
    await expect.poll(async () => (await tasksFor()).filter((d) => !had.has(d.id)).length, { timeout: 10_000 }).toBe(1);
    /* "exactly one" is a claim about the writes SETTLING, not the first one landing: a poll that returns
       at one can be read before a second write arrives (measured — a double write passed this lock until
       it waited) */
    await page.waitForTimeout(2500);
    const added = (await tasksFor()).filter((d) => !had.has(d.id));
    L.check("HK-10 picking a chip creates exactly one UserTask with that dueDate", "1512", added.length === 1 && added[0].data().dueDate === on, JSON.stringify(added.map((d) => d.data().dueDate)));
  } finally {
    /* a late second write would land after a hasty sweep (measured, under a mutation that wrote twice):
       let the writes settle, then sweep everything new for this agent */
    await page.waitForTimeout(2500);
    for (const d of (await tasksFor()).filter((x) => !had.has(x.id))) await fs.deleteDoc(d.ref);
    expect((await tasksFor()).length, "A REMINDER WAS LEFT BEHIND — the account has been changed").toBe(had.size);
  }
  /* §9.5 Later */
  const before = (await fs.getDoc(uRef)).data() ?? {};
  const tpBefore = (before.todoPrefs ?? {}) as Record<string, unknown>;
  const laterBefore = ((tpBefore.contacts ?? {}) as Record<string, unknown>).later;
  let key: string | null = null;
  try {
    await openContacts(page, AT_1512);
    await openHk(page);
    const row = page.locator(q('[data-hkv="row"][data-gap="wishlist"]')).first();
    key = await row.getAttribute("data-key");
    await row.locator('[data-hkv="rh"]').click();
    await row.locator('[data-hkv="later"]').click();
    await page.waitForTimeout(900);
    L.check("HK-5 Later hides the row", "1512", (await page.locator(q(`[data-hkv="row"][data-key="${key}"]`)).count()) === 0, `${key}`);
    const read = async () => ((await fs.getDoc(uRef)).data() ?? {}) as Record<string, any>;
    await expect.poll(async () => (await read()).todoPrefs?.contacts?.later?.[key!] ?? null, { timeout: 10_000 }).toBe(plus(30));
    const after = await read();
    L.check("HK-5 todoPrefs.contacts.later holds today + 30 at the item's key", "1512", after.todoPrefs?.contacts?.later?.[key!] === plus(30), JSON.stringify(after.todoPrefs?.contacts?.later));
    for (const sub of ["noteboard", "manuscripts"]) {
      /* canonical: the client hands back a map's keys in whichever order its cache holds them (measured:
         the same noteboard map read back with `order` and `dismissedExamples` swapped), so the
         comparison is over sorted keys — every value, nothing about insertion order */
      const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x);
      const a1 = canon(tpBefore[sub] ?? null), a2 = canon(after.todoPrefs?.[sub] ?? null);
      L.check(`HK-5 the ${sub} sub-map is byte-identical after the write`, "1512", a1 === a2, a1 === a2 ? "" : `before ${a1.slice(0, 300)} | after ${a2.slice(0, 300)}`);
    }
    L.check("HK-5 the foot names the put-off rows and offers Show them now", "1512", (await page.locator(q('[data-hkv="show-all"]')).count()) === 1 || /Hidden until/.test(await page.locator(q('[data-hkv="foot-text"]')).innerText()), "");
    /* the row returns 31 days on — the clock moved, the stored date untouched */
    await page.clock.install({ time: new Date(today.getTime() + 31 * 86_400_000) });
    await openContacts(page, AT_1512);
    await openHk(page);
    L.check("HK-5 the row returns when the clock is advanced 31 days", "1512", (await page.locator(q(`[data-hkv="row"][data-key="${key}"]`)).count()) === 1, `${key}`);
  } finally {
    await fs.updateDoc(uRef, { "todoPrefs.contacts.later": laterBefore === undefined ? fs.deleteField() : laterBefore });
    const back = ((await fs.getDoc(uRef)).data() ?? {}) as Record<string, any>;
    expect(JSON.stringify(back.todoPrefs?.contacts?.later ?? null), "LATER WAS NOT PUT BACK — the account has been changed").toBe(JSON.stringify(laterBefore ?? null));
  }

  L.done(9);
});

/* ── lock 10 · the dock chip expands the docked card above itself, read-only (v13 §7), app-wide ── */
type PeekBox = { cardR: number; cardB: number; cardW: number; cardL: number; cardT: number; drawerL: number; primPE: string | null; vw: number; vh: number; paint: number | null; onTop: boolean } | null;
async function peekReading(page: import("@playwright/test").Page, card: string, prim: string): Promise<PeekBox> {
  return page.evaluate(([card, prim]) => {
    const c = [...document.querySelectorAll<HTMLElement>(card)].find((e) => e.getBoundingClientRect().height > 0);
    const d = document.querySelector<HTMLElement>(".qad-root .qad-drawer");
    if (!c || !d) return null;
    const r = c.getBoundingClientRect();
    const p = c.querySelector<HTMLElement>(prim);
    /* PAINTED, not merely placed: the product of every opacity from the primary up to the body (a box
       of the right size with an opacity-0 card inside it passed a geometry-only version of this), and
       what the browser hits at the card's centre is the card, not the drawer's dim */
    let op = 1; for (let e: HTMLElement | null = p; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || "1");
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 60));
    return { cardR: r.right, cardB: r.bottom, cardW: r.width, cardL: r.left, cardT: r.top, drawerL: d.getBoundingClientRect().left, primPE: p ? getComputedStyle(p).pointerEvents : null, vw: innerWidth, vh: innerHeight,
      paint: p ? Math.round(op * 100) / 100 : null, onTop: !!hit && c.contains(hit) };
  }, [card, prim] as const);
}
/** one surface: the drawer is open from a card; prove the chip, the peek, the inert primary and the two Escapes */
async function proveDockPeek(page: import("@playwright/test").Page, L: Ledger, where: string, card: string, prim: string, peekOn: string) {
  const chip = page.locator("[data-qad-dock]");
  await chip.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  const shut = await chip.getAttribute("data-peek").catch(() => null);
  const label0 = ((await page.locator("[data-qad-dock-label]").textContent().catch(() => "")) ?? "").trim();
  L.check("CL13-10 from the card's primary the chip shows, offering the card", where, shut === "shut" && /^Show card/.test(label0), `${shut} · ${label0}`);
  const g = await page.evaluate(() => {
    const c = document.querySelector("[data-qad-dock]")?.getBoundingClientRect();
    const d = document.querySelector(".qad-root .qad-drawer")?.getBoundingClientRect();
    return c && d ? { gap: d.left - c.right, bottom: innerHeight - c.bottom } : null;
  });
  L.check("CL13-10 the chip sits 24 left of the drawer and 24 off the foot", where, !!g && near(g.gap, 24, 1) && near(g.bottom, 24, 1), JSON.stringify(g));
  await chip.click();
  await page.locator(peekOn).first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const b = await peekReading(page, card, prim);
  L.check("CL13-10 a click puts the card above the chip: right edge = drawer left − 24 (±2), bottom 84", where,
    !!b && near(b.cardR, b.drawerL - 24, 2) && near(b.vh - b.cardB, 84, 2), JSON.stringify(b));
  L.check("CL13-10 the peeked card does not overlap the drawer and stays on screen", where, !!b && b.cardR <= b.drawerL && b.cardL >= 0 && b.cardT >= 0, JSON.stringify(b));
  L.check("CL13-10 the card is min(548, 100vw − 572) wide", where, !!b && near(b.cardW, Math.min(548, b.vw - 572), 1), JSON.stringify(b));
  L.check("CL13-10 the card's primary takes no press while peeking", where, b?.primPE === "none", `${b?.primPE}`);
  /* the primary is dimmed to .35 by design, so the card around it is fully painted when the chain reads .35 */
  L.check("CL13-10 the peeked card is painted (the dimmed primary reads .35, nothing above it fades) and on top of the drawer's dim", where, !!b && b.paint === 0.35 && b.onTop, JSON.stringify({ paint: b?.paint, onTop: b?.onTop }));
  const open = await chip.getAttribute("data-peek");
  const label1 = ((await page.locator("[data-qad-dock-label]").textContent()) ?? "").trim();
  const ring = await chip.evaluate((e) => getComputedStyle(e).boxShadow);
  L.check("CL13-10 the chip says Hide card, with a 2px anthracite ring", where, open === "open" && /^Hide card/.test(label1) && /rgb\(42, 58, 82\) 0px 0px 0px 2px/.test(ring), `${open} · ${label1} · ${ring}`);
  /* Escape folds the card before it touches the drawer */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const after1 = await page.evaluate((peekOn) => ({ peek: !!document.querySelector(peekOn), drawer: !!document.querySelector(".qad-root.is-open") }), peekOn);
  L.check("CL13-10 the first Escape folds the card and leaves the drawer open", where, !after1.peek && after1.drawer, JSON.stringify(after1));
  /* the second reaches the drawer: an untouched journey cancels and the card comes back */
  await page.keyboard.press("Escape");
  await page.locator(".qad-root.is-open").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const after2 = await page.evaluate(() => ({ drawer: !!document.querySelector(".qad-root.is-open"), chip: !!document.querySelector("[data-qad-dock]") }));
  L.check("CL13-10 the second Escape reaches the drawer", where, !after2.drawer && !after2.chip, JSON.stringify(after2));
}

test("CL13-10 · the dock chip expands the card (agent card and the Query Centre's card)", async ({ page }) => {
  const L = new Ledger("cl13-10");
  page.setDefaultTimeout(15_000);
  /* the agent card, opened from the list's tray */
  await openContacts(page, AT_1512);
  /* a never-queried row at an open door: its card's primary is Log a query, which opens a journey */
  const row = page.locator('.aglist [data-clv="row"][data-stand="none"][data-door="open"]').first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await row.locator('[data-cl13="tray-open"]').click();
  await page.locator('[data-ac="overlay"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  await page.locator('[data-ac="card"] [data-ac="primary"]').first().click();
  /* attached, not visible: `.qad-root` holds only fixed children, so its own box is empty */
  await page.locator(".qad-root.is-open").waitFor({ state: "attached", timeout: 10_000 });
  await page.waitForTimeout(400);
  await proveDockPeek(page, L, "agent card", '[data-ac="card"]', '[data-ac="primary"]', '[data-ac="overlay"][data-peek]');
  const back = await page.evaluate(() => ({ card: !!document.querySelector('[data-ac="overlay"]:not([data-docked])') }));
  L.check("CL13-10 the agent card is back in its place after the drawer goes", "agent card", back.card, JSON.stringify(back));
  await page.keyboard.press("Escape");
  /* the Query Centre's centred card, opened from a list row */
  await openApp(page, "/queries", AT_1512);
  await page.evaluate(() => document.fonts.ready);
  const qrow = page.locator('[data-qcv="row"]').first();
  await qrow.waitFor({ timeout: 30_000 });
  await qrow.click();
  await page.locator('[data-qcv="qm-card"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  await page.locator('[data-qcv="qm-card"] [data-qcv="open-action"]').click();
  /* attached, not visible: `.qad-root` holds only fixed children, so its own box is empty */
  await page.locator(".qad-root.is-open").waitFor({ state: "attached", timeout: 10_000 });
  await page.waitForTimeout(400);
  await proveDockPeek(page, L, "query card", '[data-qcv="qm-card"]', '[data-qcv="open-action"]', ".qcv-qm--peek");
  await page.keyboard.press("Escape");
  /* below 1100px there is no room beside the drawer: the chip keeps Agent card v1's behaviour */
  await openContacts(page, { width: 1080, height: 800 });
  const nrow = page.locator('.aglist [data-clv="row"][data-stand="none"][data-door="open"]').first();
  await nrow.scrollIntoViewIfNeeded();
  await nrow.hover();
  await nrow.locator('[data-cl13="tray-open"]').click();
  await page.locator('[data-ac="overlay"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  await page.locator('[data-ac="card"] [data-ac="primary"]').first().click();
  /* attached, not visible: `.qad-root` holds only fixed children, so its own box is empty */
  await page.locator(".qad-root.is-open").waitFor({ state: "attached", timeout: 10_000 });
  await page.waitForTimeout(400);
  const narrow = await page.evaluate(() => { const c = document.querySelector("[data-qad-dock]"); return c ? { peek: c.getAttribute("data-peek"), text: (c.querySelector(".qad-dk")?.textContent ?? "").trim() } : null; });
  L.check("CL13-10 below 1100px the chip keeps today's behaviour (Back to card, no peek)", "1080", !!narrow && narrow.peek === null && narrow.text === "Back to card", JSON.stringify(narrow));
  await page.keyboard.press("Escape");
  L.done(21);
});

/* ── lock 11 · shortcuts: / focuses Find, H does nothing while typing in it, ← → move the focused track ── */
test("CL13-11 · shortcuts", async ({ page }) => {
  const L = new Ledger("cl13-11");
  page.setDefaultTimeout(15_000);
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
  await openContacts(page, AT_1512);
  /* the key caps name what the registry binds */
  const caps = await page.evaluate(() => ({
    find: [...document.querySelectorAll('[data-cl13="find-key"]')].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? null,
    tab: [...document.querySelectorAll('[data-ftab="housekeeping"] [data-hkv="key"]')].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? null,
  }));
  L.check("CL13-11 the / and H hints show as key caps on Find and the tab", "1512", caps.find === "/" && caps.tab === "H", JSON.stringify(caps));
  /* / — the list comes into view and Find takes focus */
  await page.mouse.click(5, 5).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("/");
  await page.waitForTimeout(800);
  const f = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const ban = [...document.querySelectorAll<HTMLElement>('.aglist [data-ob="contacts"]')].find((e) => e.getBoundingClientRect().height > 0);
    const r = ban?.getBoundingClientRect();
    return { focused: !!a?.closest('[data-cl13-find="banner"]') && a?.tagName === "INPUT", bannerTop: r ? Math.round(r.top) : null, vh: innerHeight };
  });
  L.check("CL13-11 / scrolls to the list and focuses Find", "1512", f.focused && f.bannerTop !== null && f.bannerTop >= 0 && f.bannerTop < f.vh, JSON.stringify(f));
  /* H while typing in Find types an h and opens nothing */
  await page.keyboard.press("h");
  await page.waitForTimeout(300);
  const h = await page.evaluate(() => ({
    drawer: [...document.querySelectorAll('[data-hdr="housekeeping"]')].filter((e) => e.getBoundingClientRect().height > 0).length,
    value: (document.activeElement as HTMLInputElement | null)?.value ?? null,
  }));
  L.check("CL13-11 H does nothing while typing in Find (it types an h)", "1512", h.drawer === 0 && h.value === "h", JSON.stringify(h));
  /* put the page back whichever way it went, so a failure here is reported HERE and not as a timeout
     further down (an open drawer covers the carousel the next step presses) */
  if (h.drawer) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  else await page.keyboard.press("Backspace");
  /* ← → on the focused track move it by one card */
  await page.locator('.aglist [data-cz-set="new"]').first().click();
  await page.waitForTimeout(300);
  const track = page.locator('.aglist [data-cz="contacts"] [data-cz-track]').first();
  await track.focus();
  const step = await track.evaluate((t) => { const c = t.firstElementChild as HTMLElement; return c.offsetWidth + (parseFloat(getComputedStyle(t).columnGap) || 0); });
  const s0 = await track.evaluate((t) => t.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  const s1 = await track.evaluate((t) => t.scrollLeft);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(800);
  const s2 = await track.evaluate((t) => t.scrollLeft);
  L.check("CL13-11 → on the focused track moves it on one card", "1512", near(s1 - s0, step, 2), `${s0} → ${s1} (step ${step})`);
  L.check("CL13-11 ← on the focused track moves it back one card", "1512", near(s1 - s2, step, 2), `${s1} → ${s2} (step ${step})`);
  /* the shortcut sheet lists the page's keys */
  await page.mouse.click(5, 5).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("?");
  await page.locator('[data-shell="shortcuts"]').waitFor({ timeout: 5000 }).catch(() => {});
  const sheet = await page.evaluate(() => ["contactsHk", "contactsFind", "carouselBack", "carouselForward"].map((id) => !!document.querySelector(`[data-shell="shortcuts"] [data-shortcut="${id}"]`)));
  L.check("CL13-11 the shortcut sheet lists H, / and the carousel's arrows", "1512", sheet.every(Boolean), JSON.stringify(sheet));
  await page.keyboard.press("Escape");
  L.done(6);
});

/* ── lock 12 · loading: placeholders render while the agents are held, and the band's, the strip's and
   the first row's boxes are within 2px of their loaded boxes ── */
test("CL13-12 · loading", async ({ page }) => {
  const L = new Ledger("cl13-12");
  test.setTimeout(240_000);
  const boxes = () => page.evaluate(() => {
    const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    const b = (e?: HTMLElement) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; };
    return { band: b(v('.aglist [data-probe="page-header"]')), strip: b(v(".aglist .cl13-strip")), row: b(v(".aglist .clv-row")) };
  });
  for (const vp of WIDTHS) {
    const w = `${vp.width}`;
    await page.addInitScript(() => { (window as unknown as { __SA_AGENTS_HOLD_MS?: number }).__SA_AGENTS_HOLD_MS = 12000; try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
    await openApp(page, "/agents", vp);
    const held = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>(".aglist .clv-group[data-loading]");
      const card = g?.querySelector<HTMLElement>(".cl13-ac");
      const vis = (s: string) => { const e = g?.querySelector<HTMLElement>(s); return e ? getComputedStyle(e).opacity : null; };
      return {
        loading: !!g, inert: !!g?.hasAttribute("inert"),
        cards: g?.querySelectorAll(".cl13-ac").length ?? 0, rows: g?.querySelectorAll(".clv-row").length ?? 0,
        shimmer: card ? getComputedStyle(card).backgroundImage.includes("gradient") : false,
        perch: vis(".ob-perch"), ctl: vis(".cl13-ctl"), seg: vis(".cl13-seg"),
        tab: !!document.querySelector('[data-ftab="housekeeping"]'),
        bandShape: (() => { const t = g?.querySelector<HTMLElement>(".ph--band .ph-title"); return t ? getComputedStyle(t).backgroundImage.includes("52, 68, 94") || getComputedStyle(t).backgroundImage.includes("#34445e") : false; })(),
      };
    });
    L.check("CL13-12 with the agents held, the placeholders render: three cards, five rows, shimmering, inert", w,
      held.loading && held.inert && held.cards === 3 && held.rows === 5 && held.shimmer && held.bandShape, JSON.stringify(held));
    L.check("CL13-12 the perched art, the pills and the selector wait for data; no Housekeeping tab", w,
      held.perch === "0" && held.ctl === "0" && held.seg === "0" && !held.tab, JSON.stringify(held));
    const a = await boxes();
    await page.locator(".aglist .clv-group[data-loading]").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(600);
    const b = await boxes();
    for (const k of ["band", "strip", "row"] as const) {
      const x = a[k], y = b[k];
      L.check(`CL13-12 the ${k}'s box is within 2px of its loaded box`, w,
        !!x && !!y && near(x.l, y.l, 2) && near(x.t, y.t, 2) && near(x.w, y.w, 2) && near(x.h, y.h, 2), JSON.stringify({ held: x, loaded: y }));
    }
  }
  /* the shimmer, BOTH directions: it moves normally and holds still under reduced motion.
     ⚠️ openRoute injects `* { animation: none !important }` to freeze motion for measuring, so with it in
     place "no animation" is the HARNESS's answer about every element — a reduced-motion reading taken
     through it passed with the rule deleted (measured, 6 Oct). It is lifted before either reading. */
  const shimmerOf = async (rm: "no-preference" | "reduce") => {
    await page.emulateMedia({ reducedMotion: rm });
    await page.addInitScript(() => { (window as unknown as { __SA_AGENTS_HOLD_MS?: number }).__SA_AGENTS_HOLD_MS = 12000; });
    await openApp(page, "/agents", AT_1512);
    await liftMotionSuppression(page);
    return page.evaluate(() => { const c = document.querySelector<HTMLElement>(".aglist .clv-group[data-loading] .cl13-ac"); return c ? getComputedStyle(c).animationName : null; });
  };
  const moving = await shimmerOf("no-preference");
  L.check("CL13-12 the shapes shimmer (with the harness's motion freeze lifted)", "1512", moving === "cl13Shim", `${moving}`);
  const still = await shimmerOf("reduce");
  L.check("CL13-12 under reduced motion the shapes don't shimmer", "1512", still === "none", `${still}`);
  await page.emulateMedia({ reducedMotion: null });
  L.done(17);
});

/* ── lock 13 · the page guide: first visit shows step 1; × sets sa.guide.contacts; a reload doesn't
   show it; "Show the page guide" does ── */
test("CL13-13 · page guide", async ({ page }) => {
  const L = new Ledger("cl13-13");
  page.setDefaultTimeout(15_000);
  const G = '[data-guide="contacts"]';
  await openContacts(page, AT_1512);
  await page.evaluate(() => { localStorage.removeItem("sa.guide.contacts"); });
  await page.reload(); await page.locator(LOADED_ROW).first().waitFor();
  await page.locator(G).waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(900); /* longer than a smooth scroll, so an arrival scroll would have landed */
  const s1 = await page.evaluate((G) => {
    const g = document.querySelector<HTMLElement>(G);
    const tab = [...document.querySelectorAll<HTMLElement>('[data-ftab="housekeeping"]')].find((e) => e.getBoundingClientRect().height > 0);
    const gr = g?.getBoundingClientRect(), tr = tab?.getBoundingClientRect();
    return {
      title: g?.querySelector('[data-qcv="guide-title"]')?.textContent ?? null, kick: g?.querySelector('[data-qcv="guide-n"]')?.textContent ?? null,
      w: gr ? Math.round(gr.width) : null, above: !!gr && !!tr && gr.bottom <= tr.top + 0.5 && Math.abs(gr.right - tr.right) <= 1,
      ring: !!document.querySelector('.aglist [data-cl13="strip"].pgd-ring'),
      scrolled: [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.scrollTop),
    };
  }, G);
  /* the guide stands above the tab and under anything the reader opens over it */
  /* settle the pill in view first: a click that has to scroll lands as the page moves, and a scroll
     closes an open pill menu */
  await vis(page, '[data-cl13-ctl="banner"] [data-lp="group"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await vis(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click();
  await page.locator('[data-lpop="group"]').waitFor({ timeout: 4000 }).catch(() => {});
  const zs = await page.evaluate((G) => {
    const z = (sel: string) => { const e = [...document.querySelectorAll<HTMLElement>(sel)].find((x) => x.getBoundingClientRect().height > 0); return e ? Number(getComputedStyle(e).zIndex) : null; };
    return { guide: z(G), tab: z('[data-ftab="housekeeping"]'), pop: z('[data-lpop="group"]') };
  }, G);
  await page.keyboard.press("Escape");
  L.check("CL13-13 the guide is above the tab and under an open pill's menu", "1512", zs.guide !== null && zs.tab !== null && zs.pop !== null && zs.tab < zs.guide && zs.guide < zs.pop, JSON.stringify(zs));
  L.check("CL13-13 the guide's arrival moves nothing: the page has not scrolled", "1512", s1.scrolled.length === 1 && s1.scrolled[0] === 0, JSON.stringify(s1.scrolled));
  L.check("CL13-13 a first visit shows step 1, ringing the strip", "1512", s1.title === "Your list in numbers" && s1.kick === "How this page works · 1 of 4" && s1.ring, JSON.stringify(s1));
  L.check("CL13-13 the guide is 340 wide, above the Housekeeping tab, flush with its right", "1512", s1.w === 340 && s1.above, JSON.stringify(s1));
  await page.click(`${G} [data-qcv="guide-next"]`);
  const s2 = await page.evaluate((G) => ({ title: document.querySelector(`${G} [data-qcv="guide-title"]`)?.textContent ?? null,
    ring: !!document.querySelector('.aglist [data-cz="contacts"].pgd-ring'), stripRing: !!document.querySelector(".pgd-ring[data-cl13='strip']") }), G);
  L.check("CL13-13 Next moves to step 2 and rings the carousel (the strip's ring is released)", "1512", s2.title === "Who to query next" && s2.ring && !s2.stripRing, JSON.stringify(s2));
  await page.click(`${G} [data-qcv="guide-back"]`);
  L.check("CL13-13 Back returns to step 1", "1512", (await page.locator(`${G} [data-qcv="guide-title"]`).textContent()) === "Your list in numbers", "");
  await page.click(`${G} [data-qcv="guide-x"]`);
  const seen = await page.evaluate(() => localStorage.getItem("sa.guide.contacts"));
  L.check("CL13-13 × closes it and sets sa.guide.contacts", "1512", seen === "1" && (await page.locator(G).count()) === 0 && (await page.locator(".pgd-ring").count()) === 0, `${seen}`);
  await page.reload(); await page.locator(LOADED_ROW).first().waitFor();
  await page.waitForTimeout(1500);
  L.check("CL13-13 a reload doesn't show it", "1512", (await page.locator(G).count()) === 0, "");
  await page.click('[data-shell="help"]');
  await page.click('[data-shell="guide-again"]');
  await page.locator(G).waitFor({ timeout: 5000 }).catch(() => {});
  L.check("CL13-13 \"Show the page guide\" brings it back at step 1", "1512", (await page.locator(`${G} [data-qcv="guide-title"]`).textContent().catch(() => null)) === "Your list in numbers", "");
  /* the last step finishes with Got it */
  for (let i = 0; i < 3; i++) await page.click(`${G} [data-qcv="guide-next"]`);
  const last = await page.evaluate((G) => ({ title: document.querySelector(`${G} [data-qcv="guide-title"]`)?.textContent ?? null, btn: document.querySelector(`${G} [data-qcv="guide-next"]`)?.textContent ?? null,
    ring: !!document.querySelector('[data-ftab="housekeeping"].pgd-ring') }), G);
  L.check("CL13-13 step 4 rings the Housekeeping tab and finishes with Got it", "1512", last.title === "Housekeeping" && last.btn === "Got it" && last.ring, JSON.stringify(last));
  await page.click(`${G} [data-qcv="guide-next"]`);
  L.done(10);
});

/* ── §9 · the footer, and the empty state as v12 built it ── */
test("CL13-14 · footer and empty state", async ({ page }) => {
  const L = new Ledger("cl13-14");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const f = vis('.aglist [data-probe="app-footer"]'), fin = vis('.aglist [data-probe="app-footer-in"]');
      const ws = vis('.aglist [data-wsp="contacts"]'), strip = vis('.aglist [data-cl13="strip"]');
      const sc = f?.closest<HTMLElement>(".wpg-scroll");
      const txt = f?.textContent ?? "";
      return {
        found: !!f, after: !!f && !!ws && f.getBoundingClientRect().top > ws.getBoundingClientRect().bottom,
        /* the footer is the group's LAST row: nothing of the page's follows it in the scroller */
        last: !!f && !!sc && [...sc.querySelectorAll<HTMLElement>(".clv-group > *")].every((e) => e === f || e.getBoundingClientRect().bottom <= f.getBoundingClientRect().top + 0.5),
        fin: fin ? [fin.getBoundingClientRect().left, fin.getBoundingClientRect().width] : null,
        col: strip ? [strip.getBoundingClientRect().left, strip.getBoundingClientRect().width] : null,
        help: /Help centre/.test(txt), mail: /@/.test(txt),
      };
    });
    L.check("CL13-14 the app footer follows the workspace, the group's last row", w, r.found && r.after && r.last, JSON.stringify(r));
    L.check("CL13-14 its content box is the column's (the strip's x and width, ±1)", w, !!r.fin && !!r.col && near(r.fin[0], r.col[0], 1) && near(r.fin[1], r.col[1], 1), `${r.fin} vs ${r.col}`);
    L.check("CL13-14 it is the shared footer (Help centre, the email)", w, r.help && r.mail, JSON.stringify(r));
    await checkOverflow(page, L, w);
  }
  /* the empty state: no band, strip, carousel, list, tab or footer — v12's page, unchanged (§9) */
  await openContacts(page, AT_1512);
  await page.evaluate(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; window.dispatchEvent(new Event("sa:lh-count")); });
  await page.locator(".aglist [data-clv-empty]").first().waitFor({ timeout: 8000 }).catch(() => {});
  const e = await page.evaluate(() => {
    const n = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((x) => x.getBoundingClientRect().height > 0).length;
    return { empty: n(".aglist [data-clv-empty]"), band: n(".aglist .ph--band"), strip: n('.aglist [data-cl13="strip"]'), cz: n('.aglist [data-cz="contacts"]'),
      /* the empty state's own exhibition draws sample rows (v12 §4, by design); the LIST is any row outside it */
      rows: [...document.querySelectorAll<HTMLElement>(".aglist [data-agent-card]")].filter((x) => x.getBoundingClientRect().height > 0 && !x.closest("[data-clv-empty]")).length,
      exhibitRows: [...document.querySelectorAll<HTMLElement>(".aglist [data-clv-empty] [data-agent-card]")].filter((x) => x.getBoundingClientRect().height > 0).length, tab: n('[data-ftab="housekeeping"]'), footer: n('.aglist [data-probe="app-footer"]') };
  });
  L.check("CL13-14 the empty state shows, and none of the band, strip, carousel, list, tab or footer", "1512",
    e.empty === 1 && e.exhibitRows > 0 && e.band === 0 && e.strip === 0 && e.cz === 0 && e.rows === 0 && e.tab === 0 && e.footer === 0, JSON.stringify(e));
  await checkOverflow(page, L, "1512 empty");
  await page.screenshot({ path: `${DIR}/empty-1512.png` });
  await page.evaluate(() => { delete (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT; window.dispatchEvent(new Event("sa:lh-count")); });
  L.done(14);
});

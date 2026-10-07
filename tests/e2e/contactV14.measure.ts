/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 (design-refs/contact-list-v14.html) — the rendered locks, §10 of the pack, at 1512 × 900
 * and 1280 × 800. Each was proved red by its named mutation before its green was believed
 * (reports/contact-list-v14/mutation-proofs-p*.jsonl).
 *
 * ⚠️ RUN AT ONE WORKER (`--workers=1`): the writing cases share the harness account with every other contact
 * suite, and two workers on one account interfere (Contact list v13's report).
 */
import { test } from "@playwright/test";
import { INK14, LOADED_ROW, Ledger, WIDTHS14, checkOverflow, near, openContacts } from "./cl14Lib";

test.beforeEach(async ({ page }) => {
  /* the page guide auto-opens on a first visit; every lock but the guide's reads the page without it */
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

/* ── lock 1 · order and rhythm: the hero card, the strip, the next-step section, the workspace; no carousel ── */
test("CL14-1 · order", async ({ page }) => {
  const L = new Ledger("cl14-1");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height }; };
      const hero = pick('.aglist [data-probe="page-header"][data-band]');
      return {
        hero: b(hero), heroBg: hero ? getComputedStyle(hero).backgroundColor : null,
        heroCard: !!hero?.classList.contains("ph--card") && !!hero?.classList.contains("ph--compact"),
        strip: b(pick('.aglist [data-cl13="strip"]')),
        next: b(pick('.aglist [data-cl14="next"]')),
        ws: b(pick('.aglist [data-cl14="ws"]')),
        /* the carousel and every part it brought: the shell, its items, its track, its selector */
        carousel: document.querySelectorAll('.aglist [data-cz], .aglist .cz-item, .aglist [data-cz-track], .aglist [data-cz-set], .aglist .cl13-seg').length,
      };
    });
    L.check("CL14-1 the hero is v131's compact card, in rgb(42,58,82)", w, r.heroCard && r.heroBg === INK14, `${r.heroCard} ${r.heroBg}`);
    L.check("CL14-1 the strip follows the hero", w, !!r.hero && !!r.strip && r.strip.t > r.hero.b, `${JSON.stringify(r.hero)} ${JSON.stringify(r.strip)}`);
    L.check("CL14-1 no carousel in the DOM", w, r.carousel === 0, `${r.carousel}`);
    L.check("CL14-1 the next-step section follows the strip, 44 (±1) under it", w, !!r.strip && !!r.next && near(r.next.t - r.strip.b, 44, 1), `${r.strip && r.next ? r.next.t - r.strip.b : "—"}`);
    L.check("CL14-1 the workspace follows the section, 56 (±2) under it", w, !!r.next && !!r.ws && near(r.ws.t - r.next.b, 56, 2), `${r.next && r.ws ? r.ws.t - r.next.b : "—"}`);
    await checkOverflow(page, L, w);
  }
  L.done(12);
});

/* ── lock 2 · the figures are inert: clicking any of them changes nothing on the page ── */
test("CL14-2 · figures inert", async ({ page }) => {
  const L = new Ledger("cl14-2");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    /* the page's whole state, as text a reader could compare: the list's markup, the scroll, the URL, and
       whatever overlays are open */
    const snap = () => page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll");
      return JSON.stringify({
        html: root.outerHTML.length, rows: [...root.querySelectorAll("[data-agent-card]")].map((r) => r.getAttribute("data-agent-card")).join(","),
        pressed: root.querySelectorAll('[aria-pressed="true"]').length, scroll: sc?.scrollTop ?? -1, href: location.href,
        overlays: document.querySelectorAll('[data-ac="overlay"], [data-hdr], .qad-root.is-open, .lpop').length,
      });
    });
    const cells = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.aglist [data-cl13="strip"] [data-cl13-cell]')]
      .filter((c) => c.getBoundingClientRect().height > 0)
      .map((c) => ({ label: c.getAttribute("data-cl13-cell"), tag: c.tagName, cursor: getComputedStyle(c).cursor, tab: c.tabIndex })));
    L.check("CL14-2 five figures, none a control (no button, no pointer, not focusable)", w,
      cells.length === 5 && cells.every((c) => c.tag !== "BUTTON" && c.cursor !== "pointer" && c.tab < 0), JSON.stringify(cells));
    for (const c of cells) {
      const before = await snap();
      await page.locator(`.aglist [data-cl13="strip"] [data-cl13-cell="${c.label}"]`).first().click();
      await page.waitForTimeout(300);
      const after = await snap();
      L.check(`CL14-2 clicking "${c.label}" changes nothing`, w, after === before, after === before ? "" : `${before} → ${after}`);
    }
    await checkOverflow(page, L, w);
  }
  L.done(14);
});


/* ── lock 3 · the next-step section: Ready on the fixture, the card is the agent card, no space under it ── */
test("CL14-3 · next step", async ({ page }) => {
  const L = new Ledger("cl14-3");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height, w: x.width }; };
      const next = pick('.aglist [data-cl14="next"]');
      const frame = next?.querySelector<HTMLElement>(".cl14-nx") ?? null;
      const card = next?.querySelector<HTMLElement>('[data-cl14="card"] > .cl13-ac') ?? null;
      return {
        state: next?.getAttribute("data-state") ?? null, frame: b(frame), card: b(card),
        /* the shared blocks' signature: the identity and the three blocks, marked as a carousel card's */
        blocks: card ? [...card.querySelectorAll("[data-cl13-blk]")].map((e) => e.getAttribute("data-cl13-blk")).sort().join(",") : "",
        classes: card ? ["acq-head", "acq-ini"].filter((c) => card.querySelector(`.${c}`)).length : 0,
        /* none of the quick view's hooks: no id, no data-ac, no escape-stack overlay */
        ids: card ? card.querySelectorAll("[id]").length : -1, dataAc: card ? card.querySelectorAll("[data-ac]").length : -1,
        chip: card?.querySelector('[data-cl13="ctone"]')?.textContent?.trim() ?? null,
        seeAll: next?.querySelector('[data-cl14="see-all"]')?.textContent?.trim() ?? null,
      };
    });
    L.check("CL14-3 with the fixture, the state is Ready", w, r.state === "ready", `${r.state}`);
    L.check("CL14-3 the middle is the agent card, its band chip First up", w, !!r.card && r.chip === "First up", `${r.chip}`);
    L.check("CL14-3 the card carries the shared blocks' signature (identity + genres + wishlist + materials)", w,
      r.classes === 2 && /genres/.test(r.blocks) && /wishlist/.test(r.blocks) && /materials/.test(r.blocks), `${r.classes} · ${r.blocks}`);
    L.check("CL14-3 none of the quick view's hooks (no id, no data-ac)", w, r.ids === 0 && r.dataAc === 0, `ids ${r.ids} data-ac ${r.dataAc}`);
    L.check("CL14-3 the frame's bottom is 22 (±2) below the card's", w, !!r.frame && !!r.card && near(r.frame.b - r.card.b, 22, 2), `${r.frame && r.card ? (r.frame.b - r.card.b).toFixed(1) : "—"}`);
    L.check("CL14-3 no space under the card: the frame is no taller than the card + 22", w, !!r.frame && !!r.card && r.frame.h <= r.card.h + 22 + 0.5, `frame ${r.frame?.h.toFixed(1)} card ${r.card?.h.toFixed(1)}`);
    L.check("CL14-3 the card is 318 wide at 1512, 290 at 1280", w, !!r.card && near(r.card.w, vp.width >= 1440 ? 318 : 290, 1), `${r.card?.w}`);
    /* See all N: the list shows exactly the ready set (read the rows, not the counter) */
    const n = Number((r.seeAll ?? "").match(/\d+/)?.[0] ?? NaN);
    /* ⚠️ a missing button is a failed READING, never a timeout — a crash names a line, not the property */
    let rows = -1;
    if (Number.isFinite(n)) {
      await page.locator('.aglist [data-cl14="see-all"]').filter({ visible: true }).first().click();
      await page.waitForTimeout(700);
      rows = await page.locator(`.aglist ${LOADED_ROW}`).filter({ visible: true }).count();
    }
    L.check("CL14-3 See all N leaves exactly N rows in the list", w, Number.isFinite(n) && rows === n, `button ${n} rows ${rows}`);
    await checkOverflow(page, L, w);
  }
  /* clicking the card opens the agent card; a ledger row's Log a query opens the drawer */
  await openContacts(page, { width: 1512, height: 900 });
  const cardBlock = page.locator('.aglist [data-cl14="card"] .cl13-ac [data-cl13-blk="s-wishlist"]').filter({ visible: true }).first();
  if (await cardBlock.count()) {
    await cardBlock.click();
    await page.locator('[data-ac="overlay"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  }
  const opened = await page.locator('[data-ac="overlay"]').count();
  L.check("CL14-3 clicking the card opens the agent card", "1512", opened > 0, `${opened}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const row = page.locator('.aglist [data-cl14="nl-row"]').filter({ visible: true }).first();
  if (await row.count()) {
    await row.hover();
    await row.locator('[data-cl14="nl-log"]').click();
    await page.locator(".qad-root.is-open").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    const drawer = await page.locator(".qad-root.is-open").count();
    L.check("CL14-3 a Next-in-line row's Log a query opens the journey", "1512", drawer > 0, `${drawer}`);
    await page.keyboard.press("Escape");
  } else L.check("CL14-3 a Next-in-line row exists on the fixture", "1512", false, "no ledger row");
  L.done(18);
});

/* ── lock 5 · the workspace: 20 wider than the strip each side, the ink bar, the hawk above it, the controls white ── */
test("CL14-5 · workspace", async ({ page }) => {
  const L = new Ledger("cl14-5");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const ws = pick('.aglist [data-cl14="ws"]'), strip = pick('.aglist [data-cl13="strip"]'), bar = ws?.querySelector<HTMLElement>('[data-cl14="bar"]') ?? null;
      const img = ws?.querySelector<HTMLImageElement>('[data-cl14="art"] img') ?? null;
      const bg = (e: Element | null) => (e ? getComputedStyle(e).backgroundColor : null);
      const box = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, b: x.bottom }; };
      return {
        ws: box(ws), strip: box(strip), bar: box(bar), img: box(img), imgSrc: img?.getAttribute("src") ?? null, imgLoaded: !!img && img.complete && img.naturalWidth > 0,
        wsBg: bg(ws), wsRadius: ws ? getComputedStyle(ws).borderTopLeftRadius : null, barBg: bg(bar),
        find: bg(ws?.querySelector('[data-cl13-find="banner"]') ?? null),
        group: bg(ws?.querySelector('[data-cl13-ctl="banner"] [data-lp="group"]') ?? null),
        sort: bg(ws?.querySelector('[data-cl13-ctl="banner"] [data-lp="sort"]') ?? null),
        title: ws?.querySelector(".cl14-bar-t h2")?.textContent ?? null,
        line: (ws?.querySelector('[data-cl14="showing"]') as HTMLElement | null)?.innerText ?? null,
      };
    });
    L.check("CL14-5 the panel is 20 (±1) wider than the strip on each side", w,
      !!r.ws && !!r.strip && near(r.strip.l - r.ws.l, 20, 1) && near(r.ws.r - r.strip.r, 20, 1), `${r.ws && r.strip ? `${(r.strip.l - r.ws.l).toFixed(1)} / ${(r.ws.r - r.strip.r).toFixed(1)}` : "—"}`);
    L.check("CL14-5 the panel is white with 24px corners", w, r.wsBg === "rgb(255, 255, 255)" && r.wsRadius === "24px", `${r.wsBg} ${r.wsRadius}`);
    L.check("CL14-5 the bar is rgb(42,58,82) (ruling Q2)", w, r.barBg === INK14, `${r.barBg}`);
    L.check("CL14-5 the hawk at the card-index box, its top above the bar's top", w,
      /contact-index-hawk\.webp/.test(r.imgSrc ?? "") && r.imgLoaded && !!r.img && !!r.bar && r.img.t < r.bar.t, `${r.imgSrc} loaded ${r.imgLoaded} img ${r.img?.t.toFixed(1)} bar ${r.bar?.t.toFixed(1)}`);
    L.check("CL14-5 Find, Grouped and Sort are white", w, r.find === "rgb(255, 255, 255)" && r.group === "rgb(255, 255, 255)" && r.sort === "rgb(255, 255, 255)", `${r.find} ${r.group} ${r.sort}`);
    L.check("CL14-5 'Your agents' and 'Showing n of N for {book}'", w, r.title === "Your agents" && /^Showing \d+ of \d+( for .+)?$/.test((r.line ?? "").trim()), `${r.title} · ${r.line}`);
    await checkOverflow(page, L, w);
  }
  L.done(14);
});

/* ── lock 6 · the pills: each pill's number equals the rows it produces (rows read, not the counter) ── */
test("CL14-6 · pills", async ({ page }) => {
  const L = new Ledger("cl14-6");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    for (const k of ["you", "ready"] as const) {
      const pill = page.locator(`.aglist [data-cl14="pill-${k}"]`).filter({ visible: true }).first();
      /* ⚠️ a missing pill is a failed READING, never a timeout */
      if (!(await pill.count())) {
        L.check(`CL14-6 "${k}": the pill exists`, w, false, "no pill");
        L.check(`CL14-6 "${k}": the pill reads as pressed`, w, false, "no pill");
        continue;
      }
      const n = Number(((await pill.textContent()) ?? "").match(/\d+/)?.[0] ?? NaN);
      await pill.click();
      /* wait out the live count and the reflow (Phase 6), then read the ROWS */
      await page.waitForTimeout(900);
      const rows = await page.locator(`.aglist ${LOADED_ROW}`).filter({ visible: true }).count();
      const pressed = await pill.getAttribute("aria-pressed");
      L.check(`CL14-6 "${k}": the pill's number is the rows it leaves`, w, Number.isFinite(n) && n > 0 && rows === n, `pill ${n} rows ${rows}`);
      L.check(`CL14-6 "${k}": the pill reads as pressed`, w, pressed === "true", `${pressed}`);
      await pill.click();
      await page.waitForTimeout(500);
    }
    await checkOverflow(page, L, w);
  }
  L.done(10);
});

/* ── shared reads for locks 7–10 ── */
type P = import("@playwright/test").Page;
const v14 = (page: P, sel: string) => page.locator(`.aglist ${sel}`).filter({ visible: true }).first();
const rowCount = (page: P) => page.locator(`.aglist ${LOADED_ROW}`).filter({ visible: true }).count();
/** a pill's words — textContent, because below 1440 the lead-ins hide */
const pillWords = (page: P, k: string) => v14(page, `[data-cl13-ctl="banner"] [data-lp="${k}"]`)
  .evaluate((e) => [...e.childNodes].map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim()).catch(() => "");
const pops = (page: P) => page.locator(".lpop").count();
const settle = (page: P, ms = 700) => page.waitForTimeout(ms);
/** the group headings, in order */
const headings = (page: P) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
  return root ? [...root.querySelectorAll<HTMLElement>('[data-clv="band"] b')].map((b) => b.textContent?.trim() ?? "") : [];
});
/** the strip: its box, each control's top and right, and whether "More filters" is there */
const stripRead = (page: P) => page.evaluate(() => {
  const bar = [...document.querySelectorAll<HTMLElement>('.aglist [data-cl14="fbar"]')].find((e) => e.getBoundingClientRect().height > 0);
  if (!bar) return null;
  const r = bar.getBoundingClientRect();
  const kids = [...bar.children].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).map((e) => {
    const k = (e as HTMLElement).getBoundingClientRect();
    return { t: Math.round(k.top), b: Math.round(k.bottom), r: k.right, l: k.left, txt: (e.textContent ?? "").trim().slice(0, 30) };
  });
  return {
    top: r.top, right: r.right, h: r.height, kids,
    more: !!bar.querySelector('[data-cl14-dd="more"]'),
    chips: [...bar.querySelectorAll("[data-cl14-chip]")].map((e) => e.getAttribute("data-cl14-chip")),
  };
});

/* ── lock 7 · the filter strip: one line at both widths, the measured fold, live application ── */
test("CL14-7 · filter strip", async ({ page }) => {
  const L = new Ledger("cl14-7");
  const folded: Record<string, boolean> = {};
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const s = await stripRead(page);
    if (!s) { L.check("CL14-7 the strip renders", w, false, "no strip"); continue; }
    const tops = new Set(s.kids.map((k) => k.t));
    L.check("CL14-7 one line: every control on one top", w, s.kids.length >= 5 && tops.size === 1, JSON.stringify(s.kids.map((k) => `${k.txt}@${k.t}`)));
    L.check("CL14-7 one line: 34 tall", w, near(s.h, 34, 1), `${s.h}`);
    L.check("CL14-7 nothing runs past the strip's right edge", w, s.kids.every((k) => k.r <= s.right + 0.5), JSON.stringify(s.kids.map((k) => Math.round(k.r))) + ` vs ${Math.round(s.right)}`);
    folded[w] = s.more;
    /* folded or not, the three on/off controls are reachable: on the row, or inside "More filters" */
    L.check("CL14-7 folded ⇔ the three chips leave the row", w, s.more ? s.chips.length === 0 : s.chips.length === 3, `more ${s.more} chips ${JSON.stringify(s.chips)}`);
    /* live: Always responds — on the row or in the fold — leaves exactly its count */
    const total = await rowCount(page);
    let n = NaN;
    /* ⚠️ scroll the strip in BEFORE pressing: a page scroll closes an open popover (the panel is fixed and cannot
       follow its anchor), and a click that scrolls its own target into view is exactly such a scroll */
    await v14(page, '[data-cl14="fbar"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
    await settle(page, 300);
    if (s.more) {
      await v14(page, '[data-cl14-dd="more"]').click();
      await page.locator('[data-lpop="more"]').waitFor({ timeout: 4000 }).catch(() => {});
      n = Number((await page.locator('[data-lpop="more"] [data-opt="more:always"] small').textContent({ timeout: 3000 }).catch(() => "")) || NaN);
      await page.locator('[data-lpop="more"] [data-opt="more:always"]').click({ timeout: 3000 }).catch(() => {});
      await page.keyboard.press("Escape");
    } else {
      n = Number((await v14(page, '[data-cl14-chip="always"] em').textContent({ timeout: 3000 }).catch(() => "")) || NaN);
      await v14(page, '[data-cl14-chip="always"]').click({ timeout: 3000 }).catch(() => {});
    }
    await settle(page);
    const rows = await rowCount(page);
    L.check("CL14-7 Always responds: its count is the rows it leaves", w, Number.isFinite(n) && n > 0 && n < total && rows === n, `count ${n} rows ${rows} of ${total}`);
    const clear = page.locator('.aglist [data-cl14="clear-all"]').filter({ visible: true });
    L.check("CL14-7 Clear all appears once a control is on", w, (await clear.count()) === 1, "");
    if (await clear.count()) await clear.first().click();
    await settle(page);
    L.check("CL14-7 Clear all returns the whole list and goes", w, (await rowCount(page)) === total && (await clear.count()) === 0, `${await rowCount(page)} of ${total}`);
    await checkOverflow(page, L, w);
  }
  /* the fold is MEASURED: at 1280 the row cannot hold every control and folds; at 1512 it holds them */
  L.check("CL14-7 'More filters' at 1280, not at 1512", "both", folded["1280"] === true && folded["1512"] === false, JSON.stringify(folded));
  L.done(17);
});

/* ── lock 8 · grouping: Status in Nick's order, Action required, Country; YOUR MOVE absent where the heading says it ── */
const STATUS_ORDER = ["Signed", "Offer", "Resubmitted", "Revise & resubmit", "Full sent", "Full requested", "Partial sent", "Partial requested", "Queried", "Not queried", "Closed"];
const ACTION_ORDER = ["Answer the offer", "Send the partial", "Send the full", "Send the revision", "Nudge due", "Ready to query", "Waiting on the agent", "Closed to queries for now", "Nothing to do"];
const inOrder = (got: string[], order: string[]) => got.length > 0 && got.every((g) => order.includes(g)) && got.every((g, i) => i === 0 || order.indexOf(got[i - 1]) < order.indexOf(g));
const pickGroup = async (page: P, k: string) => {
  /* bounded: a grouping that does not exist is a failed READING downstream, never a timeout */
  await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click({ timeout: 5000 }).catch(() => {});
  await page.locator(`[data-lpop="group"] [data-opt="group:${k}"]`).click({ timeout: 4000 }).catch(() => page.keyboard.press("Escape"));
  await settle(page);
};
test("CL14-8 · grouping", async ({ page }) => {
  const L = new Ledger("cl14-8");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const total = await rowCount(page);
    L.check("CL14-8 at rest: 'Grouped: Letter', 'Sort: Surname, A to Z'", w,
      (await pillWords(page, "group")).includes("Letter") && (await pillWords(page, "sort")).includes("Surname, A to Z"), `${await pillWords(page, "group")} | ${await pillWords(page, "sort")}`);
    const ymLetter = await page.locator('.aglist [data-clv="ym"]').filter({ visible: true }).count();
    L.check("CL14-8 under Letter the YOUR MOVE tag shows (population)", w, ymLetter > 0, `${ymLetter}`);
    /* one popover at a time, and Escape / an outside press close only the popover */
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click({ timeout: 5000 }).catch(() => {});
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="sort"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
    L.check("CL14-8 one popover at a time", w, (await pops(page)) === 1 && (await page.locator('[data-lpop="sort"]').count()) === 1, `${await pops(page)}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    L.check("CL14-8 Escape closes only the popover", w, (await pops(page)) === 0 && (await page.locator('[data-ac="overlay"]').count()) === 0 && (await rowCount(page)) === total, "");
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click({ timeout: 5000 }).catch(() => {});
    await page.locator(".aglist .cl14-bar-t h2").filter({ visible: true }).first().dispatchEvent("pointerdown", { bubbles: true });
    await page.waitForTimeout(150);
    L.check("CL14-8 an outside press closes it", w, (await pops(page)) === 0, "");
    for (const [k, order, word] of [["status", STATUS_ORDER, "Status"], ["action", ACTION_ORDER, "Action required"]] as const) {
      await pickGroup(page, k);
      const h = await headings(page);
      L.check(`CL14-8 ${word}: the headings in the ruled order`, w, inOrder(h, [...order]) && h.length >= 3, JSON.stringify(h));
      L.check(`CL14-8 ${word}: the pill names it`, w, (await pillWords(page, "group")).includes(word), await pillWords(page, "group"));
      L.check(`CL14-8 ${word}: YOUR MOVE absent — the heading already says it`, w, (await page.locator('.aglist [data-clv="ym"]').filter({ visible: true }).count()) === 0, "");
      L.check(`CL14-8 ${word}: a partition — nobody lost`, w, (await rowCount(page)) === total, `${await rowCount(page)} of ${total}`);
      L.check(`CL14-8 ${word}: no A–Z tabs (Letter only)`, w, (await page.locator('.aglist [data-clv="idxwrap"]').filter({ visible: true }).count()) === 0, "");
      /* §5 — the powder band: #e9f1f8, 54 tall, 12px corners; the art circle white, the count pill white on #2f5f86 */
      const band = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
        const h = root?.querySelector<HTMLElement>(".lt-gh");
        if (!h) return null;
        const cs = getComputedStyle(h), em = h.querySelector("em"), art = h.querySelector(".lt-gart");
        return { bg: cs.backgroundColor, h: h.getBoundingClientRect().height, r: cs.borderTopLeftRadius, pos: cs.position,
          em: em ? [getComputedStyle(em).backgroundColor, getComputedStyle(em).color] : null, art: art ? getComputedStyle(art).backgroundColor : null };
      });
      L.check(`CL14-8 ${word}: the powder band rgb(233,241,248), 54 tall, 12px corners, sticky`, w,
        !!band && band.bg === "rgb(233, 241, 248)" && near(band.h, 54, 0.5) && band.r === "12px" && band.pos === "sticky", JSON.stringify(band));
      L.check(`CL14-8 ${word}: the count pill white on #2f5f86, the art circle white`, w,
        !!band && JSON.stringify(band.em) === JSON.stringify(["rgb(255, 255, 255)", "rgb(47, 95, 134)"]) && band.art === "rgb(255, 255, 255)", JSON.stringify(band));
    }
    await pickGroup(page, "country");
    const c = await headings(page);
    const named = c.filter((x) => x !== "Not recorded");
    L.check("CL14-8 Country: by name A–Z, 'Not recorded' last, no guessed nation", w,
      c.length >= 1 && JSON.stringify(named) === JSON.stringify([...named].sort((a, b) => a.localeCompare(b))) && (!c.includes("Not recorded") || c[c.length - 1] === "Not recorded") && !c.some((x) => /England|Scotland|Wales|Northern Ireland/.test(x)), JSON.stringify(c));
    /* the sort and its direction */
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="sort"]').click({ timeout: 5000 }).catch(() => {});
    await page.locator('[data-lpop="sort"] [data-opt="sort:reply"]').click({ timeout: 4000 }).catch(() => page.keyboard.press("Escape"));
    await settle(page, 300);
    const dir = await v14(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').getAttribute("aria-label");
    L.check("CL14-8 'Sort: Response time'; the direction says 'Fastest first'", w, (await pillWords(page, "sort")).includes("Response time") && dir === "Sort order: Fastest first", `${await pillWords(page, "sort")} ${dir}`);
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').click({ timeout: 5000 }).catch(() => {});
    L.check("CL14-8 the toggle names the reversed order", w, (await v14(page, '[data-cl13-ctl="banner"] [data-lp="dir"]').getAttribute("aria-label")) === "Sort order: Slowest first", "");
    await checkOverflow(page, L, w);
  }
  L.done(46);
});

/* ── lock 9 · remembered settings: versioned and validated — stale state reads as the defaults ── */
const seedMemory = async (page: P, value: unknown) => {
  await page.evaluate((v) => sessionStorage.setItem("sa.contactList.v2", JSON.stringify(v)), value);
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await settle(page, 600);
};
test("CL14-9 · remembered settings", async ({ page, browser }) => {
  const L = new Ledger("cl14-9");
  const vp = { width: 1512, height: 900 };
  const w = "1512";
  await openContacts(page, vp);
  const total = await rowCount(page);
  /* a good v2 state restores */
  const good = { v: 2, filters: { status: [], action: true, open: "either", queried: "either", mats: false, always: false, genres: [], genreMode: "any" }, search: "", group: "status", sort: "reply", reversed: false, density: "comfortable" };
  await seedMemory(page, good);
  L.check("CL14-9 a good state restores: Grouped: Status, Sort: Response time, Action required on", w,
    (await pillWords(page, "group")).includes("Status") && (await pillWords(page, "sort")).includes("Response time")
    && (await v14(page, '[data-cl14-chip="action"]').getAttribute("aria-pressed").catch(() => null)) === "true", `${await pillWords(page, "group")} | ${await pillWords(page, "sort")}`);
  /* a stale state — a grouping, a sort and a status that no longer exist, and v13's facets — reads as the defaults, and the page still renders */
  await seedMemory(page, { v: 2, filters: { status: ["Offer"], stand: ["you"], fit: ["takes"], open: ["open"], genres: [7] }, search: 3, group: "agency", sort: "due", reversed: "yes", density: "huge" });
  const stale = { group: await pillWords(page, "group"), sort: await pillWords(page, "sort"), rows: await rowCount(page), clear: await page.locator('.aglist [data-cl14="clear-all"]').filter({ visible: true }).count(), boundary: await page.getByText(/Something went wrong/i).count() };
  L.check("CL14-9 stale state: Letter, Surname A to Z, nothing on, every row, no error", w,
    stale.group.includes("Letter") && stale.sort.includes("Surname, A to Z") && stale.rows === total && stale.clear === 0 && stale.boundary === 0, JSON.stringify(stale));
  /* the PILL falls back to "Letter" by itself for a key it does not know, so it cannot prove the restore was
     refused — the LIST must be grouped by letter: the A–Z tabs shown and every heading a single letter */
  const heads = await headings(page);
  const idx = await page.locator('.aglist [data-clv="idxwrap"]').filter({ visible: true }).count();
  L.check("CL14-9 stale state: the list itself is grouped by letter (A–Z tabs, letter headings)", w,
    idx === 1 && heads.length > 1 && heads.every((h) => /^[A-Z#]$/.test(h)), `idx ${idx} ${JSON.stringify(heads.slice(0, 6))}`);
  /* v13's unversioned key is read by nothing */
  await page.evaluate(() => { sessionStorage.removeItem("sa.contactList.v2"); sessionStorage.setItem("sa.contactList", JSON.stringify({ filters: { stand: ["you"] }, group: "agency", sort: "due" })); });
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await settle(page, 600);
  L.check("CL14-9 v13's unversioned key is ignored", w, (await pillWords(page, "group")).includes("Letter") && (await rowCount(page)) === total, await pillWords(page, "group"));
  await page.evaluate(() => sessionStorage.removeItem("sa.contactList"));
  /* a fresh session restores nothing */
  await seedMemory(page, good);
  const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", viewport: vp });
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
  await openContacts(p2, vp, { keep: true });
  L.check("CL14-9 a fresh session restores nothing", w, (await pillWords(p2, "group")).includes("Letter"), await pillWords(p2, "group"));
  await ctx.close();
  await page.evaluate(() => sessionStorage.removeItem("sa.contactList.v2"));
  L.done(5);
});

/* ── lock 10 · the genre field: predictive tokens from the app's list, never free text ── */
test("CL14-10 · genre field", async ({ page }) => {
  const L = new Ledger("cl14-10");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const total = await rowCount(page);
    const input = v14(page, '[data-cl14="genres"] input');
    if (!(await input.count())) { L.check("CL14-10 the field renders", w, false, "no field"); continue; }
    await v14(page, '[data-cl14="fbar"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
    await input.click();
    /* lock 10's own words: typing "thr" lists Thriller first */
    await input.pressSequentially("thr", { delay: 20 });
    await page.waitForTimeout(200);
    const thr = await page.locator('.aglist [data-cl14="genre-list"] [data-cl14-sugg]').first().textContent({ timeout: 3000 }).catch(() => "");
    L.check("CL14-10 'thr' lists Thriller first", w, /^Thriller\d+ on your list$/.test((thr ?? "").trim()), `${thr}`);
    await input.fill("");
    /* "ro" offers several (Romance, Romantasy, Crime…), so ↓ has somewhere to go */
    await input.pressSequentially("ro", { delay: 20 });
    await page.waitForTimeout(200);
    const opts = page.locator('.aglist [data-cl14="genre-list"] [data-cl14-sugg]');
    const n = await opts.count();
    const first = n ? await opts.first().evaluate((e) => ({ bold: e.querySelector("b")?.textContent ?? "", txt: e.textContent ?? "", on: e.classList.contains("on") })) : null;
    L.check("CL14-10 up to seven matches, the first marked", w, n >= 1 && n <= 7 && !!first?.on, `${n} ${JSON.stringify(first)}`);
    L.check("CL14-10 the typed part in bold, and 'N on your list'", w, !!first && first.bold.toLowerCase() === "ro" && /\d+ on your list/.test(first.txt), JSON.stringify(first));
    await page.keyboard.press("ArrowDown");
    L.check("CL14-10 ↓ moves the mark", w, n > 1 && (await opts.nth(1).getAttribute("class"))?.includes("on") === true, `${n}`);
    await page.keyboard.press("ArrowUp");
    const tally = Number(first?.txt.match(/(\d+) on your list/)?.[1] ?? NaN);
    const id = n ? await opts.first().getAttribute("data-cl14-sugg") : null;
    await page.keyboard.press("Enter");
    await settle(page);
    L.check("CL14-10 Enter adds the token", w, (await page.locator(`.aglist [data-cl14-tok="${id}"]`).filter({ visible: true }).count()) === 1, `${id}`);
    L.check("CL14-10 the list is the genre's 'on your list' count", w, Number.isFinite(tally) && (await rowCount(page)) === tally, `${await rowCount(page)} vs ${tally}`);
    /* nothing free-typed */
    await input.pressSequentially("zzqx", { delay: 20 });
    await page.waitForTimeout(150);
    L.check("CL14-10 no match says so", w, (await page.locator('.aglist [data-cl14="genre-none"]').filter({ visible: true }).count()) === 1, "");
    await page.keyboard.press("Enter");
    L.check("CL14-10 Enter on no match adds nothing", w, (await page.locator(".aglist [data-cl14-tok]").filter({ visible: true }).count()) === 1, "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    L.check("CL14-10 Escape clears the typing, keeps the token, opens no card", w,
      (await input.inputValue()) === "" && (await page.locator(".aglist [data-cl14-tok]").filter({ visible: true }).count()) === 1 && (await page.locator('[data-ac="overlay"]').count()) === 0, `"${await input.inputValue()}"`);
    /* a second token brings any | all */
    await input.pressSequentially("crim", { delay: 20 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    await settle(page, 400);
    const anyRows = await rowCount(page);
    const mode = page.locator('.aglist [data-cl14="genre-mode"]').filter({ visible: true });
    L.check("CL14-10 two genres bring 'any | all'", w, (await mode.count()) === 1, "");
    if (await mode.count()) {
      await mode.locator("button", { hasText: "all" }).click();
      await settle(page, 400);
      /* strict on this account (no agent here lists both): a dead toggle reads the same as 'any' and goes red */
      L.check("CL14-10 'all' narrows", w, (await rowCount(page)) < anyRows, `${await rowCount(page)} < ${anyRows}`);
    }
    /* Backspace on an empty field removes the last token */
    await input.click();
    await page.keyboard.press("Backspace");
    await settle(page, 300);
    L.check("CL14-10 Backspace on empty removes the last token", w, (await page.locator(".aglist [data-cl14-tok]").filter({ visible: true }).count()) === 1, "");
    await page.keyboard.press("Backspace");
    await settle(page);
    L.check("CL14-10 every token gone → the whole list", w, (await rowCount(page)) === total, `${await rowCount(page)} of ${total}`);
    await checkOverflow(page, L, w);
  }
  L.done(28);
});

/* ── Phase 5 · the rows and the table (§5–§6): the panel, the sticky labels and dividers, the row grammar ── */
test("CL14-11 · rows", async ({ page }) => {
  const L = new Ledger("cl14-11");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
      if (!root) return null;
      const lbl = root.querySelector<HTMLElement>(".lt-labels"), div = root.querySelector<HTMLElement>(".lt-div");
      const rows = [...root.querySelectorAll<HTMLElement>('[data-clv="row"]')];
      const open = rows.find((x) => !x.hasAttribute("data-shut")), shut = rows.find((x) => x.hasAttribute("data-shut"));
      const col = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().left) : null);
      const labs = lbl ? [...lbl.querySelectorAll<HTMLElement>(".lt-lab")] : [];
      const cell = (x: HTMLElement | undefined, sel: string) => x?.querySelector(sel) ?? null;
      return {
        lbl: lbl ? { pos: getComputedStyle(lbl).position, top: getComputedStyle(lbl).top, h: lbl.getBoundingClientRect().height } : null,
        div: div ? { pos: getComputedStyle(div).position, top: getComputedStyle(div).top, h: div.getBoundingClientRect().height } : null,
        panels: root.querySelectorAll(".lt-panel").length,
        rowMin: open ? open.getBoundingClientRect().height : 0,
        edges: rows.map((x) => getComputedStyle(x, "::before").backgroundColor).filter((c) => c !== "rgba(0, 0, 0, 0)").length,
        disc: cell(open, ".clv-ini") ? [getComputedStyle(cell(open, ".clv-ini")!).backgroundColor, cell(open, ".clv-ini")!.getBoundingClientRect().width] : null,
        shutDisc: cell(shut, ".clv-ini") ? getComputedStyle(cell(shut, ".clv-ini")!).backgroundColor : null,
        shutName: cell(shut, ".clv-rwn b") ? getComputedStyle(cell(shut, ".clv-rwn b")!).color : null,
        pill: (() => { const m = root.querySelector<HTMLElement>(".clv-miss"); return m ? [m.textContent, getComputedStyle(m).outlineStyle, m.getBoundingClientRect().height] : null; })(),
        tick: (() => { const h = root.querySelector(".clv-hit"); return h ? getComputedStyle(h, "::before").content : null; })(),
        rep: rows.map((x) => x.querySelector(".clv-rrep")?.textContent ?? ""),
        /* composition: each label starts where its column's cell starts, in the same row grid */
        cols: open && labs.length === 4 && cell(open, ".clv-rq") ? {
          agent: [col(labs[0]) , col(cell(open, ".clv-rwho"))], want: [col(labs[1]), col(cell(open, ".clv-rfit"))],
          rep: [col(labs[2]), col(cell(open, ".clv-rrep"))],
          q: [Math.round(labs[3].getBoundingClientRect().right), Math.round(cell(open, ".clv-rq")!.getBoundingClientRect().right)],
        } : null,
      };
    });
    if (!r) { L.check("CL14-11 the list renders", w, false, "no list"); continue; }
    L.check("CL14-11 Letter: one panel", w, r.panels === 1, `${r.panels}`);
    L.check("CL14-11 the labels: sticky at 0, 40 tall", w, !!r.lbl && r.lbl.pos === "sticky" && r.lbl.top === "0px" && near(r.lbl.h, 40, 0.5), JSON.stringify(r.lbl));
    L.check("CL14-11 the letter divider: sticky at 40, 38 tall", w, !!r.div && r.div.pos === "sticky" && r.div.top === "40px" && near(r.div.h, 38, 0.5), JSON.stringify(r.div));
    L.check("CL14-11 a row is at least 80 tall", w, r.rowMin >= 79.5, `${r.rowMin}`);
    L.check("CL14-11 no row carries a coloured edge", w, r.edges === 0, `${r.edges}`);
    L.check("CL14-11 the disc: 38, #2a3a52", w, !!r.disc && r.disc[0] === "rgb(42, 58, 82)" && near(Number(r.disc[1]), 38, 0.5), JSON.stringify(r.disc));
    L.check("CL14-11 a closed agent: the grey disc #b5aca4 and a softer name", w, r.shutDisc === "rgb(181, 172, 164)" && r.shutName === "rgba(28, 19, 15, 0.7)", `${r.shutDisc} ${r.shutName}`);
    L.check("CL14-11 missing data: the dashed pill saying what to add", w, !!r.pill && /^\+ Add (their wishlist|genres)$/.test(String(r.pill[0])) && r.pill[1] === "dashed" && near(Number(r.pill[2]), 24, 0.5), JSON.stringify(r.pill));
    L.check("CL14-11 a chip that matches the book carries a tick", w, r.tick === '"✓"', `${r.tick}`);
    L.check("CL14-11 replies: '~N wks' or 'Not stated', over the door", w, r.rep.length > 3 && r.rep.every((t) => /^(~\d+ wks|Not stated)(Open to queries|Closed till \d+ \w+|Closed to queries)$/.test(t)), JSON.stringify(r.rep.slice(0, 4)));
    L.check("CL14-11 every label starts on its column", w, !!r.cols && Object.values(r.cols).every(([a, b]) => a != null && b != null && Math.abs(Number(a) - Number(b)) <= 1), JSON.stringify(r.cols));
    /* the labels lift once they pin: scroll the list under the scroller's top */
    const stuck = await page.evaluate(async () => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = root.querySelector<HTMLElement>(".wpg-scroll") ?? root.closest<HTMLElement>(".wpg-scroll") ?? document.querySelector<HTMLElement>(".wpg-scroll")!;
      const panel = root.querySelector<HTMLElement>(".lt-panel"), lbl = root.querySelector<HTMLElement>(".lt-labels");
      /* ⚠️ a missing panel is a failed READING, never a crash */
      if (!panel || !lbl || !sc) return { before: true, after: false, shadow: "none", gap: NaN };
      const before = lbl.classList.contains("is-stuck");
      sc.scrollTop += panel.getBoundingClientRect().top - sc.getBoundingClientRect().top + 400;
      await new Promise((res) => setTimeout(res, 400));
      return { before, after: lbl.classList.contains("is-stuck"), shadow: getComputedStyle(lbl).boxShadow, gap: lbl.getBoundingClientRect().top - sc.getBoundingClientRect().top };
    });
    L.check("CL14-11 the labels pin at the scroller's top and lift (a shadow) once pinned", w,
      !stuck.before && stuck.after && stuck.shadow !== "none" && near(stuck.gap, 0, 1), JSON.stringify(stuck));
    /* the marquee: a wishlist too long for its line scrolls on row hover (the Web Animations API) */
    const mq = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sp = root.querySelector<HTMLElement>('[data-clv="wish"] .clv-mq');
      if (!sp) return null;
      sp.textContent = "Literary suspense with a dark heart, slow-burn family secrets, unreliable narrators and coastal towns in winter, told with real restraint";
      const row = sp.closest<HTMLElement>('[data-clv="row"]')!;
      row.scrollIntoView({ block: "center" });
      return row.getAttribute("data-agent-card");
    });
    if (!mq) { L.check("CL14-11 the marquee: population (a wishlist row)", w, false, "none"); continue; }
    await page.locator(`.aglist [data-agent-card="${mq}"]`).filter({ visible: true }).first().hover();
    await page.waitForTimeout(1600);
    const moved = await page.evaluate((id) => {
      const sp = document.querySelector<HTMLElement>(`[data-agent-card="${id}"] .clv-mq`);
      return sp ? new DOMMatrix(getComputedStyle(sp).transform).m41 : null;
    }, mq);
    L.check("CL14-11 the marquee: a long wishlist scrolls on hover", w, moved != null && moved < -5, `${moved}`);
    await checkOverflow(page, L, w);
  }
  L.done(28);
});

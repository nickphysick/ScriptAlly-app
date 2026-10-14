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
/* RETIRED (Contact list v16, 12 Oct): the page's order is v16's: header, strip, heading, list (CL16 C1). tests/e2e/RETIRED-contact-list-v16.md */
test.skip("CL14-1 · order", async ({ page }) => {
  const L = new Ledger("cl14-1");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height }; };
      /* REPOINTED (Contact list v15 §2): the hero is the page-local open header — CL15-1 owns its geometry */
      const hero = pick('.aglist [data-cl15="header"]');
      return {
        hero: b(hero), heroBg: hero ? getComputedStyle(hero).backgroundColor : null,
        heroCard: !!hero && !document.querySelector('.aglist [data-probe="page-header"][data-band]'),
        /* REPOINTED (v15 §3): the desk replaced the strip */
        strip: b(pick('.aglist [data-cl15="desk"]')),
        next: b(pick('.aglist [data-cl14="next"]')),
        ws: b(pick('.aglist [data-cl14="ws"]')),
        /* the carousel and every part it brought: the shell, its items, its track, its selector */
        carousel: document.querySelectorAll('.aglist [data-cz], .aglist .cz-item, .aglist [data-cz-track], .aglist [data-cz-set], .aglist .cl13-seg').length,
      };
    });
    L.check("CL14-1 the header is v15's open header (no band, no card behind it)", w, r.heroCard && r.heroBg === "rgba(0, 0, 0, 0)", `${r.heroCard} ${r.heroBg}`);
    L.check("CL14-1 the desk follows the header", w, !!r.hero && !!r.strip && r.strip.t > r.hero.b, `${JSON.stringify(r.hero)} ${JSON.stringify(r.strip)}`);
    L.check("CL14-1 no carousel in the DOM", w, r.carousel === 0, `${r.carousel}`);
    /* RETIRED (Contact list v15 §4a): "44 under the desk" and "56 above the workspace" — the section's gaps are the
       feature stage's (66 / 58 to its PANEL; 56 / 50 below 1440), held by CL15-5a. The order still stands here. */
    L.check("CL14-1 the next-step section follows the desk", w, !!r.strip && !!r.next && r.next.t >= r.strip.b, `${r.strip && r.next ? r.next.t - r.strip.b : "—"}`);
    L.check("CL14-1 the workspace follows the section", w, !!r.next && !!r.ws && r.ws.t >= r.next.b, `${r.next && r.ws ? r.ws.t - r.next.b : "—"}`);
    await checkOverflow(page, L, w);
  }
  L.done(12);
});

/* CL14-2 (the strip's five figures are inert) is RETIRED with the strip (Contact list v15 §3): the desk replaces it, and
   its presses are CL15-3's — On file inert, Queried filters the list, Profiles opens Housekeeping.
   tests/e2e/RETIRED-contact-list-v15.md. */

/* ── lock 3 · the next-step section: Ready on the fixture, the card is the agent card, no space under it ── */
/* RETIRED (Contact list v16, 12 Oct): the next-step section is gone. tests/e2e/RETIRED-contact-list-v16.md */
test.skip("CL14-3 · next step", async ({ page }) => {
  const L = new Ledger("cl14-3");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height, w: x.width }; };
      const next = pick('.aglist [data-cl14="next"]');
      /* REPOINTED (v15 §4a): the card sits on the feature stage's card slot */
      const card = next?.querySelector<HTMLElement>('[data-fs-part="card"] > .cl13-ac') ?? null;
      return {
        state: next?.getAttribute("data-state") ?? null, card: b(card),
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
    /* RETIRED (v15 §4a): the white frame, its 22px foot under the card and the 318 / 290 card — the stage has no
       frame and its card is 300 / 270, vertically centred (CL15-5a). */
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
  const cardBlock = page.locator('.aglist [data-fs-part="card"] .cl13-ac [data-cl13-blk="s-wishlist"]').filter({ visible: true }).first();
  if (await cardBlock.count()) {
    await cardBlock.click();
    await page.locator('[data-ac="overlay"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  }
  const opened = await page.locator('[data-ac="overlay"]').count();
  L.check("CL14-3 clicking the card opens the agent card", "1512", opened > 0, `${opened}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  /* RETIRED (v15 §4a): "a Next-in-line row's Log a query opens the journey" — a row picks its agent onto the card
     now (CL15-5a); the card's own button logs the query. That door is held here instead. */
  const go = page.locator('.aglist [data-fs-part="card"] .cl13-ac [data-cl13="cgo"]').filter({ visible: true }).first();
  if (await go.count()) {
    await go.click();
    await page.locator(".qad-root.is-open").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    const drawer = await page.locator(".qad-root.is-open").count();
    L.check("CL14-3 the card's Log a query opens the journey", "1512", drawer > 0, `${drawer}`);
    await page.keyboard.press("Escape");
  } else L.check("CL14-3 the card's Log a query opens the journey", "1512", false, "no button on the card");
  L.done(12);
});

/* ── lock 5 · the workspace: 20 wider than the strip each side, the ink bar, the hawk above it, the controls white ── */
/* RETIRED (Contact list v16, 12 Oct): the "Your agents" panel and its title bar are gone; the list's frame is CL16 C1 and C2. tests/e2e/RETIRED-contact-list-v16.md */
test.skip("CL14-5 · workspace", async ({ page }) => {
  const L = new Ledger("cl14-5");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const ws = pick('.aglist [data-cl14="ws"]'), strip = pick('.aglist [data-cl15="desk"]') /* v15 §3: the desk */, bar = ws?.querySelector<HTMLElement>('[data-cl14="bar"]') ?? null;
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
    /* v15.2 §5: the bar reads "Agents on file" (it read "Your agents") */
    L.check("CL14-5 'Agents on file' and 'Showing n of N for {book}'", w, r.title === "Agents on file" && /^Showing \d+ of \d+( for .+)?$/.test((r.line ?? "").trim()), `${r.title} · ${r.line}`);
    await checkOverflow(page, L, w);
  }
  L.done(14);
});

/* ── lock 6 · the pills: each pill's number equals the rows it produces (rows read, not the counter) ── */
/* RETIRED (Contact list v16, 12 Oct): the bar's two pills went with the title bar; the strip filters (CL16 B2). tests/e2e/RETIRED-contact-list-v16.md */
test.skip("CL14-6 · pills", async ({ page }) => {
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
/** RE-POINTED (Contact list v16): the sort pill is gone; the column headings sort, and the active one says so */
const sortWords = (page: P) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
  const h = root?.querySelector<HTMLElement>(".lt-labels [aria-sort]");
  return h ? `${h.getAttribute("data-lt-col")} ${h.getAttribute("aria-sort")}` : "";
});
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
    /* RE-POINTED (Contact list v17 §E): the pills are 40 tall */
    L.check("CL14-7 one line: 40 tall", w, near(s.h, 40, 1), `${s.h}`);
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
  /* RE-POINTED (Contact list v16): the filter row carries "Showing n of N" and Summary now, so it folds at 1512 as well,
     as the v16 reference draws it (screens/03-pinned-1512) */
  L.check("CL14-7 'More filters' at 1280 and at 1512", "both", folded["1280"] === true && folded["1512"] === true, JSON.stringify(folded));
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
    /* RE-POINTED (Contact list v16): the list opens ungrouped and the Agent heading carries the sort */
    L.check("CL14-8 at rest: 'Grouped: No grouping', the Agent heading ascending", w,
      (await pillWords(page, "group")).includes("No grouping") && (await sortWords(page)) === "Agent ascending", `${await pillWords(page, "group")} | ${await sortWords(page)}`);
    await pickGroup(page, "letter");
    const ymLetter = await page.locator('.aglist [data-clv="ym"]').filter({ visible: true }).count();
    L.check("CL14-8 under Letter the YOUR MOVE tag shows (population)", w, ymLetter > 0, `${ymLetter}`);
    /* one popover at a time, and Escape / an outside press close only the popover */
    /* RE-POINTED (Contact list v16): the second popover is a filter's (the sort pill is gone) */
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
    L.check("CL14-8 one popover at a time", w, (await pops(page)) === 1 && (await page.locator('[data-lpop="group"]').count()) === 1, `${await pops(page)}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    L.check("CL14-8 Escape closes only the popover", w, (await pops(page)) === 0 && (await page.locator('[data-ac="overlay"]').count()) === 0 && (await rowCount(page)) === total, "");
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').click({ timeout: 5000 }).catch(() => {});
    await page.locator('.aglist [data-cl16="showing"]').filter({ visible: true }).first().dispatchEvent("pointerdown", { bubbles: true });
    await page.waitForTimeout(150);
    L.check("CL14-8 an outside press closes it", w, (await pops(page)) === 0, "");
    for (const [k, order, word] of [["status", STATUS_ORDER, "Status"], ["action", ACTION_ORDER, "Action required"]] as const) {
      await pickGroup(page, k);
      const h = await headings(page);
      L.check(`CL14-8 ${word}: the headings in the ruled order`, w, inOrder(h, [...order]) && h.length >= 3, JSON.stringify(h));
      L.check(`CL14-8 ${word}: the pill names it`, w, (await pillWords(page, "group")).includes(word), await pillWords(page, "group"));
      L.check(`CL14-8 ${word}: YOUR MOVE absent — the heading already says it`, w, (await page.locator('.aglist [data-clv="ym"]').filter({ visible: true }).count()) === 0, "");
      L.check(`CL14-8 ${word}: a partition — nobody lost`, w, (await rowCount(page)) === total, `${await rowCount(page)} of ${total}`);
      /* RE-POINTED (Contact list v16): the letter tabs are drawn under every grouping now (a pick returns the list to
         letters), where v14 drew them under Letter only */
      L.check(`CL14-8 ${word}: the A–Z tabs are still drawn`, w, (await page.locator('.aglist [data-clv="idxwrap"]').filter({ visible: true }).count()) === 1, "");
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
    /* the sort and its direction. RE-POINTED (Contact list v16): the Replies heading sorts; pressing it again reverses */
    const rep = v14(page, '.lt-labels [data-lt-col="Replies"]');
    await rep.click({ timeout: 5000 }).catch(() => {});
    await settle(page, 300);
    L.check("CL14-8 the Replies heading sorts, ascending", w, (await sortWords(page)) === "Replies ascending", await sortWords(page));
    await rep.click({ timeout: 5000 }).catch(() => {});
    await settle(page, 300);
    L.check("CL14-8 pressed again, it is descending", w, (await sortWords(page)) === "Replies descending", await sortWords(page));
    await checkOverflow(page, L, w);
  }
  L.done(46);
});

/* ── lock 9 · remembered settings: versioned and validated — stale state reads as the defaults ── */
const seedMemory = async (page: P, value: unknown) => {
  await page.evaluate((v) => sessionStorage.setItem("sa.contactList.v4", JSON.stringify(v)), value);
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
  /* a good state restores (v15 moved the key to v3 with the ready-only mode) */
  const good = { v: 4, filters: { status: [], action: true, open: "either", queried: "either", mats: false, always: false, genres: [], genreMode: "any" }, search: "", group: "status", sort: "reply", reversed: false, density: "comfortable", glance: null };
  await seedMemory(page, good);
  L.check("CL14-9 a good state restores: Grouped: Status, Sort: Response time, Action required on", w,
    (await pillWords(page, "group")).includes("Status") && (await sortWords(page)) === "Replies ascending"
    /* v17 §E: Action required is a switch in the More filters menu; the pill is navy while any is on */
    && (await page.locator('.aglist [data-cl17="pill"][data-k="more"][data-on]').filter({ visible: true }).count()) === 1, `${await pillWords(page, "group")} | ${await sortWords(page)}`);
  /* a stale state — a grouping, a sort and a status that no longer exist, and v13's facets — reads as the defaults, and the page still renders */
  await seedMemory(page, { v: 4, glance: "everyone", filters: { status: ["Offer"], stand: ["you"], fit: ["takes"], open: ["open"], genres: [7] }, search: 3, group: "agency", sort: "due", reversed: "yes", density: "huge" });
  const stale = { group: await pillWords(page, "group"), sort: await sortWords(page), rows: await rowCount(page), clear: await page.locator('.aglist [data-cl14="clear-all"]').filter({ visible: true }).count(), boundary: await page.getByText(/Something went wrong/i).count() };
  L.check("CL14-9 stale state: No grouping, the Agent heading ascending, nothing on, every row, no error", w,
    stale.group.includes("No grouping") && stale.sort === "Agent ascending" && stale.rows === total && stale.clear === 0 && stale.boundary === 0, JSON.stringify(stale));
  /* the PILL falls back by itself for a key it does not know, so it cannot prove the restore was refused — the LIST
     must be ungrouped (v16's default): no heading at all */
  const heads = await headings(page);
  L.check("CL14-9 stale state: the list itself is ungrouped (no headings)", w, heads.length === 0, JSON.stringify(heads.slice(0, 6)));
  /* v13's unversioned key is read by nothing */
  await page.evaluate(() => {
    sessionStorage.removeItem("sa.contactList.v4");
    sessionStorage.setItem("sa.contactList.v3", JSON.stringify({ v: 3, filters: {}, group: "status", sort: "reply", readyOnly: true }));
    sessionStorage.setItem("sa.contactList", JSON.stringify({ filters: { stand: ["you"] }, group: "agency", sort: "due" }));
    /* v14's key too: a v2 value is an older shape, refused whole */
    sessionStorage.setItem("sa.contactList.v2", JSON.stringify({ v: 2, filters: {}, group: "status", sort: "reply", readyOnly: true }));
  });
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await settle(page, 600);
  L.check("CL14-9 v13's unversioned key and the v2 and v3 keys are ignored", w, (await pillWords(page, "group")).includes("No grouping") && (await rowCount(page)) === total, await pillWords(page, "group"));
  await page.evaluate(() => { sessionStorage.removeItem("sa.contactList"); sessionStorage.removeItem("sa.contactList.v2"); sessionStorage.removeItem("sa.contactList.v3"); });
  /* a fresh session restores nothing */
  await seedMemory(page, good);
  const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", viewport: vp });
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
  await openContacts(p2, vp, { keep: true });
  L.check("CL14-9 a fresh session restores nothing", w, (await pillWords(p2, "group")).includes("No grouping"), await pillWords(p2, "group"));
  await ctx.close();
  await page.evaluate(() => sessionStorage.removeItem("sa.contactList.v4"));
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
    L.check("CL14-11 one panel", w, r.panels === 1, `${r.panels}`);
    /* RE-POINTED (Contact list v16): the headings pin UNDER the bar and the filter row (CL16 D1 measures the stack), so
       their sticky top is those two's height, not 0; and the ungrouped default draws no letter divider (CL16 D2) */
    L.check("CL14-11 the labels: sticky below the pinned bar and filter row, 40 tall", w, !!r.lbl && r.lbl.pos === "sticky" && parseFloat(r.lbl.top) === 68 /* v17 §C: under the 68px pinned row */ && near(r.lbl.h, 40, 0.5), JSON.stringify(r.lbl));
    L.check("CL14-11 ungrouped: no letter divider", w, r.div === null, JSON.stringify(r.div));
    L.check("CL14-11 a row is at least 80 tall", w, r.rowMin >= 79.5, `${r.rowMin}`);
    L.check("CL14-11 no row carries a coloured edge", w, r.edges === 0, `${r.edges}`);
    L.check("CL14-11 the disc: 38, #2a3a52", w, !!r.disc && r.disc[0] === "rgb(42, 58, 82)" && near(Number(r.disc[1]), 38, 0.5), JSON.stringify(r.disc));
    L.check("CL14-11 a closed agent: the grey disc #b5aca4 and a softer name", w, r.shutDisc === "rgb(179, 172, 165)" /* v17 §D: the closed disc is #b3aca5 */ && r.shutName === "rgba(28, 19, 15, 0.7)", `${r.shutDisc} ${r.shutName}`);
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
    L.check("CL14-11 the labels pin under the bar and filter row and lift (a shadow) once pinned", w,
      !stuck.before && stuck.after && stuck.shadow !== "none" && near(stuck.gap, 68, 1) /* v17: under the 68px pinned row */, JSON.stringify(stuck));
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

/* ── Phase 6 · the touches (§7) ── */
const scrollList = (page: P, by: number) => page.evaluate((by) => {
  const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
  const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll") ?? document.querySelector<HTMLElement>(".wpg-scroll")!;
  const panel = root.querySelector<HTMLElement>(".lt-panel");
  if (!panel) return false;
  sc.scrollTop += panel.getBoundingClientRect().top - sc.getBoundingClientRect().top + by;
  return true;
}, by);

/* lock 11 · the A–Z rail */
/* RETIRED (Contact list v16, 12 Oct): the A to Z rail is gone; the letter tabs are in the list and never pin (CL16 D2). tests/e2e/RETIRED-contact-list-v16.md */
test.skip("CL14-12 · rail", async ({ page }) => {
  const L = new Ledger("cl14-12");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const railShown = () => page.evaluate(() => { const r = document.querySelector<HTMLElement>('[data-cl14="rail"]'); return r ? { show: r.classList.contains("show"), op: getComputedStyle(r).opacity, w: r.getBoundingClientRect().width } : null; });
    const top = await railShown();
    L.check("CL14-12 hidden at the top of the page", w, !!top && !top.show && top.op === "0", JSON.stringify(top));
    await scrollList(page, 200);
    await page.waitForTimeout(400);
    const inGroups = await railShown();
    L.check("CL14-12 visible inside the letter groups, 26 wide", w, !!inGroups && inGroups.show && inGroups.op === "1" && near(inGroups.w, 26, 0.5), JSON.stringify(inGroups));
    const m = page.locator('[data-cl14="rail"] [data-azl="M"]');
    const mOn = (await m.count()) && !(await m.isDisabled());
    L.check("CL14-12 population: M has agents on this account", w, !!mOn, "");
    if (mOn) {
      await m.click();
      await page.waitForTimeout(500);
      const land = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
        const d = root.querySelector<HTMLElement>('[data-clv="band"][data-letter="M"]'), lbl = root.querySelector<HTMLElement>(".lt-labels");
        return d && lbl ? { gap: d.getBoundingClientRect().top - lbl.getBoundingClientRect().bottom, on: !!document.querySelector('[data-cl14="rail"] [data-azl="M"].on') } : null;
      });
      L.check("CL14-12 clicking M brings M's divider within 50px of the stuck labels", w, !!land && land.gap >= -1 && land.gap <= 50, JSON.stringify(land));
      L.check("CL14-12 …and M is the rail's current letter (filled ink)", w, !!land && land.on, JSON.stringify(land));
    }
    /* under any other grouping the rail does not show */
    await v14(page, '[data-cl13-ctl="banner"] [data-lp="group"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
    await pickGroup(page, "status");
    await scrollList(page, 200);
    await page.waitForTimeout(400);
    const other = await railShown();
    L.check("CL14-12 hidden under any grouping but Letter", w, !!other && !other.show, JSON.stringify(other));
    await checkOverflow(page, L, w);
  }
  L.done(14);
});

/* lock 12 · keyboard rows */
test("CL14-13 · keyboard", async ({ page }) => {
  const L = new Ledger("cl14-13");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const ring = () => page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...root.querySelectorAll<HTMLElement>('[data-clv="row"]')];
      const i = rows.findIndex((x) => x.classList.contains("kf"));
      const tray = i >= 0 ? getComputedStyle(rows[i].querySelector(".clv-rtray")!).opacity : null;
      return { i, n: rows.filter((x) => x.classList.contains("kf")).length, tray };
    });
    await scrollList(page, 0);
    await page.mouse.move(5, 5);
    await page.keyboard.press("j");
    await page.waitForTimeout(150);
    const a = await ring();
    await page.keyboard.press("j");
    await page.waitForTimeout(150);
    const b = await ring();
    L.check("CL14-13 J puts the ring on the first row, then moves it down one", w, a.i === 0 && b.i === 1 && b.n === 1, `${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    L.check("CL14-13 the ringed row's tray shows", w, b.tray === "1", `${b.tray}`);
    await page.keyboard.press("k");
    await page.waitForTimeout(150);
    L.check("CL14-13 K moves it back up", w, (await ring()).i === 0, "");
    /* L starts that row's action: the first row's tray step opens the query drawer */
    const kfBefore = await ring();
    await page.keyboard.press("l");
    /* polled, never a strict-mode waitFor: count the open drawers */
    const opened = await page.waitForFunction(() => document.querySelectorAll(".qad-root.is-open").length > 0, null, { timeout: 4000 }).then(() => true).catch(() => false);
    L.check("CL14-13 L starts that row's next action (the drawer opens)", w, opened, `ring ${JSON.stringify(kfBefore)} active ${await page.evaluate(() => document.activeElement?.tagName)}`);
    if (opened) {
      /* an untouched drawer: Escape cancels it outright (decision 8 — no answers, nothing to park) */
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelectorAll(".qad-root.is-open").length === 0, null, { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    /* Esc lets go */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    L.check("CL14-13 Esc lets go", w, (await ring()).n === 0, "");
    /* neither works while typing in Find */
    const find = v14(page, '[data-cl13-find="banner"] input');
    await find.click();
    await page.keyboard.press("j");
    await page.waitForTimeout(150);
    const typed = { ring: (await ring()).n, value: await find.inputValue() };
    await page.keyboard.press("l");
    await page.waitForTimeout(300);
    L.check("CL14-13 J and L stand down while typing in Find (they type)", w,
      typed.ring === 0 && (await find.inputValue()) === "jl" && (await page.locator(".qad-root.is-open").count()) === 0, JSON.stringify(typed));
    await find.fill("");
    await checkOverflow(page, L, w);
  }
  L.done(14);
});

/* lock 13 · the helpful dead end */
test("CL14-14 · dead end", async ({ page }) => {
  const L = new Ledger("cl14-14");
  for (const vp of WIDTHS14) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const setEmpty = async () => {
      await v14(page, '[data-cl14="fbar"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(200);
      if ((await v14(page, '[data-cl14-dd="more"]').count()) > 0) {
        await v14(page, '[data-cl14-dd="more"]').click();
        await page.locator('[data-lpop="more"] [data-opt="more:action"]').click({ timeout: 3000 }).catch(() => {});
        await page.keyboard.press("Escape");
      } else {
        await v14(page, '[data-cl14-chip="action"]').click();
      }
      await v14(page, '[data-cl14-dd="queried"]').click();
      await page.locator('[data-lpop="queried"] [data-opt="queried:no"]').click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
    };
    await setEmpty();
    const dead = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const n = root.querySelector<HTMLElement>('[data-cl13="none"]');
      return n ? { text: n.querySelector("b")?.textContent, lead: n.querySelector("span")?.textContent,
        drops: [...n.querySelectorAll<HTMLElement>("[data-cl14-drop]")].map((b) => ({ key: b.getAttribute("data-cl14-drop")!, n: Number(b.getAttribute("data-n")), label: b.textContent })),
        clear: !!n.querySelector('[data-cl13="none-clear"]') } : null;
    });
    L.check("CL14-14 the dead end says so, and offers drops", w,
      !!dead && dead.text === "No agents match all of these." && dead.lead === "Drop one filter to see some again:" && dead.drops.length >= 1 && dead.drops.length <= 4 && dead.clear, JSON.stringify(dead));
    L.check("CL14-14 the drops are ordered most first", w, !!dead && dead.drops.every((d, i, a) => i === 0 || a[i - 1].n >= d.n), JSON.stringify(dead?.drops));
    for (const d of dead?.drops ?? []) {
      await v14(page, `[data-cl14-drop="${d.key}"]`).click();
      await page.waitForTimeout(600);
      const rows = await rowCount(page);
      L.check(`CL14-14 "${d.label}": its number is what the drop returns`, w, rows === d.n, `rows ${rows} vs ${d.n}`);
      await v14(page, '[data-cl14="clear-all"]').click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      await setEmpty();
    }
    await v14(page, '[data-cl13="none-clear"]').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    await checkOverflow(page, L, w);
  }
  L.done(8);
});

/* lock 14 · reduced motion: no marquee, no reflow, no count animation — and each IS there without it */
test("CL14-15 · reduced motion", async ({ page }) => {
  const L = new Ledger("cl14-15");
  const probe = async (w: string, rm: boolean) => {
    await page.emulateMedia({ reducedMotion: rm ? "reduce" : "no-preference" });
    /* RE-POINTED (Contact list v16): at 1512 the "Always responds" chip is folded into More filters now, so this probe
       runs at 1920, where the chip is on the row */
    await openContacts(page, { width: 1920, height: 1000 }, { motion: true });
    const tag = rm ? "reduced" : "full";
    /* the count and the reflow: toggle a filter and read inside the first ~120ms */
    await v14(page, '[data-cl14="fbar"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const total = await rowCount(page);
    /* RE-POINTED (Contact list v17 §E): Always responds is a switch in the More filters menu, which is opened first */
    await v14(page, '[data-cl14-dd="more"]').click(); await page.waitForTimeout(300);
    await page.locator('.lpop [data-cl14-chip="always"]').click();
    const early = await page.evaluate(() => new Promise<{ ticking: boolean; shown: string; anims: number }>((res) => setTimeout(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const shown = root.querySelector<HTMLElement>('[data-cl14="shown"]');
      const rows = [...root.querySelectorAll<HTMLElement>('[data-clv="row"]')].slice(0, 14);
      res({ ticking: !!root.querySelector(".cl14-ticking"), shown: shown?.textContent ?? "", anims: rows.reduce((n, r) => n + r.getAnimations().length, 0) });
    }, 90)));
    const final = String(await rowCount(page));
    if (rm) {
      L.check(`CL14-15 ${tag}: the count lands at once, no ticking`, w, !early.ticking && early.shown === final, `${JSON.stringify(early)} final ${final}`);
      L.check(`CL14-15 ${tag}: no reflow animation on the rows`, w, early.anims === 0, `${early.anims}`);
    } else {
      L.check(`CL14-15 ${tag}: the count animates (ticking, mid-way)`, w, early.ticking && early.shown !== final, `${JSON.stringify(early)} final ${final} of ${total}`);
      L.check(`CL14-15 ${tag}: the rows reflow`, w, early.anims > 0, `${early.anims}`);
    }
    await page.locator('.lpop [data-cl14-chip="always"]').click();
    await page.waitForTimeout(400); await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    /* the marquee */
    const id = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sp = root.querySelector<HTMLElement>('[data-clv="wish"] .clv-mq');
      if (!sp) return null;
      sp.textContent = "Literary suspense with a dark heart, slow-burn family secrets, unreliable narrators and coastal towns in winter, told with real restraint";
      const row = sp.closest<HTMLElement>('[data-clv="row"]')!; row.scrollIntoView({ block: "center" });
      return row.getAttribute("data-agent-card");
    });
    if (!id) { L.check(`CL14-15 ${tag}: population (a wishlist row)`, w, false, ""); return; }
    await page.locator(`.aglist [data-agent-card="${id}"]`).filter({ visible: true }).first().hover();
    await page.waitForTimeout(1600);
    const x = await page.evaluate((id) => { const sp = document.querySelector<HTMLElement>(`[data-agent-card="${id}"] .clv-mq`); return sp ? new DOMMatrix(getComputedStyle(sp).transform).m41 : null; }, id);
    L.check(`CL14-15 ${tag}: the marquee ${rm ? "stays still" : "runs"}`, w, rm ? x === 0 : x != null && x < -5, `${x}`);
  };
  await probe("1512", false);
  await probe("1512", true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  L.done(6);
});

/* ── lock 16 · the page guide (§8): the four steps' words, verbatim, each ringing its own subject — the
   strip, the next-step section, the workspace, the Housekeeping tab — and a steered step brings its subject
   into view. (A fresh context: this file's beforeEach marks the guide seen on every navigation.) ── */
const GUIDE14 = [
  /* RE-POINTED (Contact list v17 §F): steps 1 to 3 ring the summary card, the filter row and the list, in the build's words */
  { title: "Your list in numbers", sel: '[data-cl17="card"]',
    body: "How many agents you have on file, and how many are not queried yet, querying or closed for this book. Choose a row to filter the list." },
  { title: "Find and filter", sel: '[data-cl17="filter-row"]',
    body: "Search by name or agency, or narrow the list by status, who’s open, and genre." },
  { title: "The full list", sel: '[data-cl16="list"]',
    body: "Every agent on your list. Group it your way, sort it from its column headings, or jump by letter. Click an agent to open them." },
  { title: "Housekeeping", sel: '[data-ftab="housekeeping"]',
    body: "The details missing from your agents’ profiles, and why each one helps. Fill them in here, a few at a time." },
] as const;
test("CL14-16 · page guide", async ({ browser }) => {
  const L = new Ledger("cl14-16");
  for (const vp of WIDTHS14) {
    const w = `${vp.width}`;
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", viewport: vp });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15_000);
    await page.addInitScript(() => { try { if (!sessionStorage.getItem("cl14-16")) { localStorage.removeItem("sa.guide.contacts"); sessionStorage.setItem("cl14-16", "1"); } } catch { /* private mode */ } });
    await openContacts(page, vp, { keep: true });
    const G = '[data-guide="contacts"]';
    await page.locator(G).waitFor({ timeout: 10_000 }).catch(() => {});
    for (let i = 0; i < GUIDE14.length; i++) {
      const s = GUIDE14[i];
      if (i > 0) { await page.click(`${G} [data-qcv="guide-next"]`); await page.waitForTimeout(900); }
      const r = await page.evaluate(({ G, sel }) => {
        const g = document.querySelector<HTMLElement>(G);
        const ringed = [...document.querySelectorAll<HTMLElement>(".pgd-ring")];
        const subj = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
        const b = subj?.getBoundingClientRect();
        return {
          title: g?.querySelector('[data-qcv="guide-title"]')?.textContent ?? null,
          body: [...(g?.querySelectorAll("p") ?? [])].map((p) => p.textContent).join(" "),
          rings: ringed.length, onSubject: !!subj && ringed.length === 1 && ringed[0] === subj,
          inView: !!b && b.bottom > 0 && b.top < window.innerHeight,
        };
      }, { G, sel: s.sel });
      L.check(`CL14-16 step ${i + 1} reads "${s.title}" with the pack's words`, w, r.title === s.title && r.body === s.body, `${r.title} | ${r.body}`);
      L.check(`CL14-16 step ${i + 1} rings exactly its subject, ${s.sel}, and it is on screen`, w, r.onSubject && r.inView, JSON.stringify(r));
    }
    await ctx.close();
  }
  L.done(16);
});

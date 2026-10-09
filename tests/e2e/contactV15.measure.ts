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
import { execSync } from "node:child_process";
import { Ledger, LOADED_ROW, WIDTHS15, checkOverflow, near, openContacts } from "./cl15Lib";

test.beforeEach(async ({ page }) => {
  /* the page guide auto-opens on a first visit; every lock but the guide's reads the page without it */
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

const SUB = "Your agent data underpins everything. Collate and manage it here.";

/* ── lock 1 · the open header: no container behind the title; 72 / 58; the exact subheader; the text block and the
   drawing centred against each other; the hairline.
   ⚠️ RETIRED BY v15.1 (8 Oct): "the drawing starts 56 (36) after the text block" (the drawing sits at the column's right
   edge now and the gap is a minimum — CL15.1 H2) and "the drawing is 400 / 310 wide" (490 / 380 — H1). The hairline is
   ink at 14% (H3). ── */
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
        /* v15.3: the h1 holds a 124 (98) figure beside its 42 (34) words, so one line is judged by its tallest part */
        oneLine: !!title && !!tcs && title.getBoundingClientRect().height < Math.max(parseFloat(tcs.lineHeight), ...[...title.children].map((c) => parseFloat(getComputedStyle(c).fontSize))) * 1.5,
        titleText: title?.textContent ?? null, pageTitle: title?.hasAttribute("data-page-title") ?? false,
        sub: hd?.querySelector('[data-cl15="sub"]')?.textContent ?? null,
        add: hd?.querySelector('[data-cl15="add"]')?.textContent ?? null, disc: hd?.querySelector('[data-cl15="view-all"]')?.textContent ?? null,
        txt: b(txt), art: b(art), img: b(img),
        line: hd ? `${getComputedStyle(hd).borderBottomWidth} ${getComputedStyle(hd).borderBottomStyle} ${getComputedStyle(hd).borderBottomColor}` : null,
        imgW: img ? img.getBoundingClientRect().width : null,
        rows: document.querySelectorAll('.aglist [data-clv="row"]').length,
      };
    });
    if (!r.found) { L.check("CL15-1 population: the open header renders", w, false, "no header"); continue; }
    L.check("CL15-1 no card or band behind the title — nothing between it and the group paints", w, r.painted.length === 0, r.painted.join(" | "));
    /* v15.3: the title is a hero number. The h1 carries the WORDS' size (42 / 34); the figure's 124 / 98 is CL15.3 N1's. */
    L.check(`CL15-1 the title is Special Elite, its words at ${narrow ? 34 : 42} (±1), on one line`, w, r.size !== null && near(r.size, narrow ? 34 : 42, 1) && /Special Elite/.test(r.family ?? "") && r.oneLine, `${r.size} ${r.family} oneLine ${r.oneLine}`);
    L.check("CL15-1 the title is the count, \"N agents on file\", and carries data-page-title", w, /^\d+ agents? on file$/.test(r.titleText ?? "") && r.pageTitle, `${r.titleText} ${r.pageTitle}`);
    L.check("CL15-1 the subheader, exactly", w, r.sub === SUB, `${r.sub}`);
    L.check("CL15-1 the two buttons: + Add an agent · View all agents (v15.2)", w, r.add === "+ Add an agent" && r.disc === "View all agents", `${r.add} · ${r.disc}`);
    const ct = r.txt ? (r.txt.t + r.txt.b) / 2 : NaN, ca = r.art ? (r.art.t + r.art.b) / 2 : NaN;
    L.check("CL15-1 the text block's centre and the drawing's are within 4px", w, Math.abs(ct - ca) <= 4, `text ${ct.toFixed(1)} drawing ${ca.toFixed(1)}`);
    /* RETIRED (app shell v2, 9 Oct): the header's hairline is gone — the header sheet's flap is its edge (SH2 S3, S4). What is held here is its absence. */
    L.check("CL15-1 no hairline under the header (retired by app shell v2; SH2 S4)", w, /^0px/.test(r.line ?? ""), `${r.line}`);
    await checkOverflow(page, L, w);
  }
  L.done(16);
});

/* ── lock 2 · headroom — RETIRED BY v15.1 (8 Oct). "The drawing's top is 8px or more below the top bar" held a header
   with a top margin of its own; the header has none now and the drawing's drop IS the headroom. CL15.1 H5 replaces it:
   the drawing's top is 30 (24) ±3 below the page sheet's top (tests/e2e/contactV151.measure.ts). ── */

/* ── lock 3 · the desk's PRESSES: On file changes nothing, Queried filters the list to exactly its figure, Profiles
   opens Housekeeping.
   ⚠️ RETIRED BY v15.2 (8 Oct): everything this lock said about the v15 CARDS — the three titles, ink titles, the
   weekly bars, the striped progress bar, the stamps and their inner rule, the two-row lists, "no row repeats its stamp"
   and "On file's figure is the header's count". The desk is three icon cards now: CL15.2 K1–K4
   (tests/e2e/contactV152.measure.ts). ── */
test("CL15-3 · desk presses", async ({ page }) => {
  const L = new Ledger("cl15-3");
  await openContacts(page, WIDTHS15[0]);
  const seen = await page.evaluate(() => { const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0); return root?.querySelectorAll('[data-cl15="desk"] [data-dk]').length ?? 0; });
  L.check("CL15-3 population: the desk renders three cards", "1512", seen === 3, `${seen}`);
  /* no desk: fail on the population reading, never by waiting out a click on a card that is not there */
  if (seen !== 3) { L.done(4); return; }
  /* the presses, at 1512 */
  await openContacts(page, WIDTHS15[0]);
  const snap = () => page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = root.closest<HTMLElement>(".wpg-scroll") ?? root.querySelector<HTMLElement>(".wpg-scroll");
    return JSON.stringify({
      rows: [...root.querySelectorAll("[data-agent-card]")].map((x) => x.getAttribute("data-agent-card")).join(","),
      pressed: root.querySelectorAll('[aria-pressed="true"]').length, scroll: sc?.scrollTop ?? -1, href: location.href,
      overlays: document.querySelectorAll('[data-ac="overlay"], [data-hdr="housekeeping"].is-in, .qad-root.is-open, .lpop').length,
    });
  });
  const before = await snap();
  await page.locator('.aglist [data-dk="week"]').filter({ visible: true }).first().click();
  await page.waitForTimeout(300);
  L.check("CL15-3 clicking the first card (v15.3: added this week) changes nothing", "1512", (await snap()) === before, "");
  const fig = Number(await page.locator('.aglist [data-dk="queried"] [data-dk-part="figure"]').filter({ visible: true }).first().textContent());
  await page.locator('.aglist [data-dk-press="queried"]').filter({ visible: true }).first().click();
  await page.waitForTimeout(900);
  const q = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
    const ws = root.querySelector<HTMLElement>('[data-cl14="ws"]');
    return { rows: root.querySelectorAll('[data-clv="row"]').length, wsTop: ws ? ws.getBoundingClientRect().top : null, queried: root.querySelector('[data-cl14-dd="queried"]')?.textContent ?? null };
  });
  L.check("CL15-3 Queried filters the list to exactly its figure, and scrolls to it", "1512", q.rows === fig && q.wsTop !== null && q.wsTop < 400, `${q.rows} rows vs ${fig}; ws top ${q.wsTop}; ${q.queried}`);
  await openContacts(page, WIDTHS15[0]);
  await page.locator('.aglist [data-dk-press="profiles"]').filter({ visible: true }).first().click();
  await page.waitForFunction(() => !![...document.querySelectorAll('[data-hdr="housekeeping"]')].find((e) => e.classList.contains("is-in")), undefined, { timeout: 5000 }).catch(() => {});
  const hk = await page.evaluate(() => !![...document.querySelectorAll('[data-hdr="housekeeping"]')].find((e) => e.classList.contains("is-in")));
  L.check("CL15-3 Profiles complete opens Housekeeping", "1512", hk, `${hk}`);
  await page.keyboard.press("Escape");
  L.done(4);
});

/* ── the ready-only list mode (§4): what the page says about it, read in one place ── */
const KEY15 = "sa.contactList.v3";
const EMPTY_FILTERS = { status: [], action: false, open: "either", queried: "either", mats: false, always: false, genres: [], genreMode: "any" };
type P15 = import("@playwright/test").Page;
const listState = (page: P15) => page.evaluate((rowSel) => {
  const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
  if (!root) return null;
  const num = (s: string | null | undefined) => Number((s ?? "").match(/\d+/)?.[0] ?? NaN);
  const next = root.querySelector<HTMLElement>('[data-cl14="next"]');
  const pill = root.querySelector<HTMLElement>('[data-cl14="pill-ready"]');
  return {
    rows: [...root.querySelectorAll<HTMLElement>(rowSel)].filter((e) => e.getBoundingClientRect().height > 0).length,
    state: next?.getAttribute("data-state") ?? null,
    section: num(next?.querySelector('[data-cl14="see-all"]')?.textContent),
    lede: next?.querySelector('[data-fs-part="sentence"]')?.textContent ?? "",
    pill: num(pill?.textContent), pressed: pill?.getAttribute("aria-pressed") ?? null,
    marker: root.querySelector('[data-cl15="ready-only"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    showing: root.querySelector('[data-cl14="showing"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    total: num(root.querySelector('[data-cl15="header"] h1')?.textContent),
  };
}, LOADED_ROW);

/* ── lock 5 · pill = section = rows: one ready rule everywhere. After the pill, the rows shown, the pill's number and
   the section's number are equal; ✕ or any filter leaves the mode; the mode is remembered for the visit. ── */
test("CL15-5 · pill = section = rows", async ({ page }) => {
  const L = new Ledger("cl15-5");
  /* ⚠️ THE "OR UNKNOWN" HALF HAS NO SUBJECT ON THE SHARED ACCOUNT (every ready agent there fits): `seedReadyUnknown.mjs`
     adds one open, unqueried agent with no genres, and this case removes it in the same run. */
  execSync("node tests/e2e/seedReadyUnknown.mjs", { stdio: "inherit" });
  try {
  const pill = () => page.locator('.aglist [data-cl14="pill-ready"]').filter({ visible: true }).first();
  for (const vp of WIDTHS15) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const at = await listState(page);
    if (!at || at.state !== "ready" || !(await pill().count())) {
      L.check("CL15-5 population: the fixture's state is Ready, with the pill drawn", w, false, JSON.stringify(at));
      continue;
    }
    L.check("CL15-5 population: the fixture's state is Ready, with the pill drawn", w, true, "");
    await pill().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const on = (await listState(page))!;
    L.check("CL15-5 after the pill: rows = the pill's number = the section's number", w,
      on.pill > 0 && on.rows === on.pill && on.pill === on.section, `rows ${on.rows} pill ${on.pill} section ${on.section}`);
    L.check("CL15-5 the pill reads as pressed and the line says so", w,
      on.pressed === "true" && on.marker !== null && /· ready to query/.test(on.marker) && new RegExp(`^Showing ${on.rows} of ${on.total}\\b`).test(on.showing), `${on.pressed} | ${on.showing}`);
    /* ✕ leaves the mode */
    await page.locator('.aglist [data-cl15="ready-only-x"]').filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
    const off = (await listState(page))!;
    L.check("CL15-5 ✕ leaves the mode: every agent again, no marker, the pill not pressed", w,
      off.rows === off.total && off.marker === null && off.pressed === "false", `rows ${off.rows} of ${off.total} marker ${off.marker} pressed ${off.pressed}`);
    /* See all applies the same mode */
    await page.locator('.aglist [data-cl14="see-all"]').filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    const all = (await listState(page))!;
    L.check("CL15-5 See all applies the same mode: the same rows", w, all.rows === on.rows && all.marker !== null, `rows ${all.rows} marker ${all.marker}`);
    /* touching any filter leaves the mode */
    /* "Action required" is a chip on the strip, or (folded, at 1280) an option under "More filters"; scroll the strip in
       first — the first click on a strip dropdown scrolls the page, and the popover closes on scroll */
    const v = (sel: string) => page.locator(`.aglist ${sel}`).filter({ visible: true }).first();
    const touchAction = async () => {
      await v('[data-cl14="fbar"]').evaluate((e) => e.scrollIntoView({ block: "center" })).catch(() => {});
      await page.waitForTimeout(200);
      if ((await v('[data-cl14-dd="more"]').count()) > 0) {
        await v('[data-cl14-dd="more"]').click({ timeout: 5000 }).catch(() => {});
        await page.locator('[data-lpop="more"] [data-opt="more:action"]').click({ timeout: 3000 }).catch(() => {});
        await page.keyboard.press("Escape");
      } else await v('[data-cl14-chip="action"]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
    };
    await touchAction();
    const fl = (await listState(page))!;
    L.check("CL15-5 touching a filter leaves the mode", w, fl.marker === null && fl.pressed === "false", `marker ${fl.marker} pressed ${fl.pressed} rows ${fl.rows}`);
    await touchAction();
    await checkOverflow(page, L, w);
  }
  /* the branches the rule separates, both entered on this fixture (a monoculture would prove nothing):
     an agent with no genres is IN the ready set, and an open, unqueried known mismatch is OUT of it */
  await openContacts(page, WIDTHS15[0]);
  const base = (await listState(page))!;
  L.check("CL15-5 population: some ready agents have no genres recorded", "1512", /no genres recorded/.test(base.lede), base.lede.slice(0, 160));
  await page.evaluate(([k, f]) => sessionStorage.setItem(k as string, JSON.stringify({ v: 3, filters: f, search: "", group: "letter", sort: "surname", reversed: false, density: "comfortable", readyOnly: false })),
    [KEY15, { ...EMPTY_FILTERS, open: "open", queried: "no" }] as const);
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const plain = (await listState(page))!;
  L.check("CL15-5 population: the plain Open + Not queried filter shows MORE rows than are ready (known mismatches exist)", "1512",
    plain.rows > base.pill, `plain ${plain.rows} ready ${base.pill}`);
  /* the mode is remembered for the visit, like any other list setting */
  await page.evaluate((k) => sessionStorage.removeItem(k), KEY15);
  await openContacts(page, WIDTHS15[0]);
  await pill().click({ timeout: 8000 });
  await page.waitForTimeout(700);
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const kept = (await listState(page))!;
  L.check("CL15-5 the mode survives a reload", "1512", kept.marker !== null && kept.rows === base.pill, `rows ${kept.rows} ready ${base.pill} marker ${kept.marker}`);
  await page.evaluate((k) => sessionStorage.removeItem(k), KEY15);
  } finally {
    execSync("node tests/e2e/seedReadyUnknown.mjs --clean", { stdio: "inherit" });
  }
  L.done(15);
});

/* ── lock 5a · the section's layout (§4a): the text on the page, the card over the white panel's left edge, the
   pickable list. The gaps are to the PANEL (66 / 58; 56 / 50 below 1440); the card overlaps it by 150 (130). ── */
/* ⚠️ RETIRED BY v15.1 (8 Oct): "the desk-to-panel gap is 66 (56)" and "the panel-to-workspace gap is 58 (50)". The
   section sits on a band now and its gaps are the band's — CL15.1 B2. */
test("CL15-5a · layout", async ({ page }) => {
  const L = new Ledger("cl15-5a");
  /* three ready agents, so there is a third row to pick (the shared account holds two; see CL15-5) */
  execSync("node tests/e2e/seedReadyUnknown.mjs", { stdio: "inherit" });
  try {
    for (const vp of WIDTHS15) {
      await openContacts(page, vp);
      const w = `${vp.width}`;
      const narrow = vp.width < 1440;
      const read = () => page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
        const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
        const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
        const fs = q(".fs"), lede = q('[data-fs-part="lede"]'), slot = q('[data-fs-part="card"]'), card = slot?.firstElementChild as HTMLElement | null, panel = q('[data-fs-part="panel"]');
        const title = q('[data-fs-part="title"]'), go = q(".fs-go");
        const rows = [...(root?.querySelectorAll<HTMLElement>("[data-fs-row]") ?? [])];
        const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
        return {
          state: fs?.getAttribute("data-state") ?? null,
          desk: b(q('[data-cl15="desk"]')), ws: b(q('[data-cl14="ws"]')), lede: b(lede), card: b(card), panel: b(panel),
          ledeBg: cs(lede)?.backgroundColor ?? null, ledeImg: cs(lede)?.backgroundImage ?? null,
          panelBg: cs(panel)?.backgroundColor ?? null, panelRadius: cs(panel)?.borderTopLeftRadius ?? null,
          titleSize: cs(title)?.fontSize ?? null, titleFace: cs(title)?.fontFamily ?? null,
          go: b(go), goBg: cs(go)?.backgroundColor ?? null,
          cardAgent: card?.getAttribute("data-agent") ?? null, chip: card?.querySelector('[data-cl13="ctone"]')?.textContent?.trim() ?? null,
          rows: rows.map((r) => ({ id: r.getAttribute("data-fs-row"), on: r.classList.contains("is-on"), bg: getComputedStyle(r).backgroundColor, text: (r.textContent ?? "").replace(/\s+/g, " ").trim(),
            wk: (() => { const k = r.querySelector<HTMLElement>(".fs-wk"); return k ? getComputedStyle(k).display : null; })() })),
          head: q('[data-fs-part="panel-head"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          log: root?.querySelectorAll('[data-cl14="nl-log"], .cl14-nx, .cl14-nx-well').length ?? -1,
          rise: card ? card.getAnimations().map((a) => Number(a.effect?.getTiming().duration)) : [],
        };
      });
      const r = await read();
      if (r.state !== "ready" || !r.card || !r.panel || !r.desk || !r.ws || !r.lede) { L.check("CL15-5a population: the Ready state on the stage", w, false, JSON.stringify({ state: r.state, card: !!r.card, panel: !!r.panel })); continue; }
      L.check("CL15-5a population: the Ready state on the stage", w, true, "");
      L.check(`CL15-5a the card overlaps the panel by ${narrow ? 130 : 150} (±4)`, w, near(r.card.r - r.panel.l, narrow ? 130 : 150, 4), `${(r.card.r - r.panel.l).toFixed(1)}`);
      L.check(`CL15-5a the card is ${narrow ? 270 : 300} wide, vertically centred on the panel, 34 (±3) inside it top and bottom at most`, w,
        near(r.card.w, narrow ? 270 : 300, 1) && near((r.card.t + r.card.b) / 2, (r.panel.t + r.panel.b) / 2, 2) && r.card.t - r.panel.t >= 31, `w ${r.card.w} centres ${((r.card.t + r.card.b) / 2).toFixed(1)} / ${((r.panel.t + r.panel.b) / 2).toFixed(1)} inset ${(r.card.t - r.panel.t).toFixed(1)}`);
      L.check("CL15-5a the text is straight on the page (no well, no background)", w, r.ledeBg === "rgba(0, 0, 0, 0)" && r.ledeImg === "none" && r.log === 0, `${r.ledeBg} ${r.ledeImg} old parts ${r.log}`);
      L.check("CL15-5a the panel is white with 22px corners", w, r.panelBg === "rgb(255, 255, 255)" && r.panelRadius === "22px", `${r.panelBg} ${r.panelRadius}`);
      L.check(`CL15-5a the title is Special Elite ${narrow ? 34 : 40}`, w, r.titleSize === (narrow ? "34px" : "40px") && /Special Elite/.test(r.titleFace ?? ""), `${r.titleSize} ${r.titleFace}`);
      L.check("CL15-5a one filled ink pill, 46 tall", w, !!r.go && near(r.go.h, 46, 0.5) && r.goBg === "rgb(42, 58, 82)", `${r.go?.h} ${r.goBg}`);
      L.check("CL15-5a the list: 'Next in line · best fit first', at most five rows, three on this fixture", w, /^Next in line\s*best fit first$/.test(r.head ?? "") && r.rows.length === 3, `${r.head} · ${r.rows.length}`);
      L.check("CL15-5a on load the first agent is picked: its row alone is tinted, the card shows it as First up", w,
        r.rows.filter((x) => x.on).length === 1 && r.rows[0].on && r.rows[0].bg === "rgb(234, 241, 247)" && r.cardAgent === r.rows[0].id && r.chip === "First up", `${r.cardAgent} ${r.chip} ${JSON.stringify(r.rows.map((x) => x.on))}`);
      L.check("CL15-5a an agent with no genres reads 'Genres not recorded' in place of the agency", w, r.rows.some((x) => /Genres not recorded/.test(x.text)), JSON.stringify(r.rows.map((x) => x.text)));
      L.check(`CL15-5a the reply time ${narrow ? "is hidden below 1440" : "shows on the right"}`, w, r.rows.every((x) => (narrow ? x.wk === "none" : x.wk !== "none" && x.wk !== null)), JSON.stringify(r.rows.map((x) => x.wk)));
      /* the card is ABOVE the panel where they overlap — asked of the pixel, with the point proved on screen first */
      await page.locator('.aglist [data-fs-part="card"]').filter({ visible: true }).first().evaluate((e) => e.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(200);
      const top = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0)!;
        const card = root.querySelector<HTMLElement>('[data-fs-part="card"]')!.firstElementChild as HTMLElement, panel = root.querySelector<HTMLElement>('[data-fs-part="panel"]')!;
        const c = card.getBoundingClientRect(), p = panel.getBoundingClientRect();
        const x = (p.left + c.right) / 2, y = (c.top + c.bottom) / 2;
        const on = x > 0 && y > 0 && x < innerWidth && y < innerHeight;
        const hit = on ? document.elementFromPoint(x, y) : null;
        return { on, inCard: !!hit && card.contains(hit) };
      });
      L.check("CL15-5a the card is above the panel where they overlap", w, top.on && top.inCard, JSON.stringify(top));
      /* picking the third row */
      const third = r.rows[2].id;
      await page.locator(`.aglist [data-fs-row="${third}"]`).filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {});
      const mid = await read();
      await page.waitForTimeout(500);
      const p3 = await read();
      L.check("CL15-5a clicking the third row puts that agent on the card as Next up, and tints only that row", w,
        p3.cardAgent === third && p3.chip === "Next up" && p3.rows.filter((x) => x.on).length === 1 && p3.rows[2].on, `${p3.cardAgent} ${p3.chip} ${JSON.stringify(p3.rows.map((x) => x.on))}`);
      L.check("CL15-5a the picked card rises over 280ms", w, mid.rise.includes(280), JSON.stringify(mid.rise));
      /* Enter on the focused first row picks it back */
      await page.locator(`.aglist [data-fs-row="${r.rows[0].id}"]`).filter({ visible: true }).first().focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      const p1 = await read();
      L.check("CL15-5a Enter on the focused first row picks it back: First up", w, p1.cardAgent === r.rows[0].id && p1.chip === "First up" && p1.rows[0].on && !p1.rows[2].on, `${p1.cardAgent} ${p1.chip}`);
      await checkOverflow(page, L, w);
    }
  } finally {
    execSync("node tests/e2e/seedReadyUnknown.mjs --clean", { stdio: "inherit" });
  }
  L.done(30);
});

/* ── lock 5b · load state: a fresh load shows all N agents. Counting the pill's number must not leave the ready-only
   mode switched on, and an older remembered shape cannot switch it on either. ── */
test("CL15-5b · load state", async ({ page, browser }) => {
  const L = new Ledger("cl15-5b");
  for (const vp of WIDTHS15) {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", viewport: vp });
    const p2 = await ctx.newPage();
    await p2.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
    await openContacts(p2, vp, { keep: true });
    const s = await listState(p2);
    const w = `${vp.width}`;
    L.check("CL15-5b a fresh load shows all N agents", w, !!s && s.total > 0 && s.rows === s.total, JSON.stringify(s && { rows: s.rows, total: s.total }));
    L.check("CL15-5b the pill has its number, and the mode is off (no marker, not pressed)", w, !!s && s.pill > 0 && s.marker === null && s.pressed === "false", JSON.stringify(s && { pill: s.pill, marker: s.marker, pressed: s.pressed }));
    await ctx.close();
  }
  /* v14's key carried no mode: a v2 value claiming one is an older shape and is refused whole */
  await openContacts(page, WIDTHS15[0]);
  await page.evaluate(() => sessionStorage.setItem("sa.contactList.v2", JSON.stringify({ v: 2, filters: {}, group: "letter", sort: "surname", readyOnly: true })));
  await page.reload();
  await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const old = await listState(page);
  L.check("CL15-5b an older remembered shape cannot switch the mode on", "1512", !!old && old.rows === old.total && old.marker === null, JSON.stringify(old && { rows: old.rows, total: old.total, marker: old.marker }));
  await page.evaluate(() => sessionStorage.removeItem("sa.contactList.v2"));
  L.done(5);
});

/* ── lock 6 · all queried (§4): two fixtures on their own manuscript (`seedAllQueried.mjs`, removed in the same run).
   A — everyone queried: "all N agents", no note. B — three known mismatches: "N−3 of your N agents" and "The other 3
   don't take {genres}." In both: queried + mismatches + closed = N, the split line's parts sum to queried, the desk's
   Queried figure is the sentence's, the panel is ≤ 350 tall at 1512, the Add card is solid white, and "Tell me when
   it's ready" survives a reload. ── */
test("CL15-6 · all queried", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("cl15-6");
  const MS = "aqfx-ms";
  const openDone = async (vp: { width: number; height: number }) => {
    await openContacts(page, vp);
    await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), MS);
    await page.reload();
    await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
  };
  const read = () => page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0);
    const q = <T extends HTMLElement>(s: string) => root?.querySelector<T>(s) ?? null;
    const tx = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const panel = q('[data-fs-part="panel"]'), add = q('[data-cl14="addcard"]'), addIn = q(".cl14-addc-in"), plus = q(".cl14-addc-plus");
    const soon = q('[data-cl15="discover-soon"]');
    const dq = q('[data-dk="queried"]');
    const notify = q('[data-cl15="discover-notify"]');
    return {
      state: q('[data-cl14="next"]')?.getAttribute("data-state") ?? null,
      title: tx(q('[data-fs-part="title"]')), titleSize: cs(q('[data-fs-part="title"]'))?.fontSize ?? null,
      sentence: tx(q('[data-fs-part="sentence"]')), split: q('[data-cl15="split"]') ? tx(q('[data-cl15="split"]')) : null, note: q('[data-cl15="note"]') ? tx(q('[data-cl15="note"]')) : null,
      buttons: root?.querySelectorAll('[data-fs-part="lede"] button').length ?? -1,
      total: Number(tx(q('[data-cl15="header"] h1')).match(/^(\d+)/)?.[1] ?? NaN),
      deskBig: Number(tx(dq?.querySelector('[data-dk-part="figure"]') ?? null).match(/^(\d+)/)?.[1] ?? NaN), deskAll: tx(dq?.querySelector('[data-dk-part="figure"]') ?? null),
      pill: Number(tx(q('[data-cl14="pill-ready"]')).match(/\d+/)?.[0] ?? NaN),
      panelH: panel ? panel.getBoundingClientRect().height : null,
      addBg: cs(add)?.backgroundColor ?? null, addBorder: cs(add)?.borderTopStyle ?? null, addPad: cs(addIn)?.padding ?? null, plusW: plus ? plus.getBoundingClientRect().width : null,
      soon: soon ? { head: tx(soon.querySelector('[data-fs-part="panel-head"]')), p: tx(soon.querySelector(".cl15-dt-p")), rows: soon.querySelectorAll(".cl15-dt-l li").length, rowText: tx(soon.querySelector(".cl15-dt-l")).replace(/\+ Add/g, "").trim() } : null,
      notify: notify ? { text: tx(notify), pressed: notify.getAttribute("aria-pressed") } : null,
    };
  });
  type R = Awaited<ReturnType<typeof read>>;
  const parts = (r: R) => {
    const all = r.sentence.match(/has gone to all (\d+) agents on your list\.$/);
    const some = r.sentence.match(/has gone to (\d+) of your (\d+) agents\.$/);
    const sp = (r.split ?? "").match(/^(\d+) reading · (\d+) asked for more · (\d+) passed(?: · (\d+) withdrawn)?$/);
    return {
      form: all ? "all" : some ? "some" : "none",
      queried: all ? Number(all[1]) : some ? Number(some[1]) : NaN, N: all ? Number(all[1]) : some ? Number(some[2]) : NaN,
      split: sp ? sp.slice(1).map((x) => (x === undefined ? 0 : Number(x))) : null, withdrawnShown: !!sp && sp[4] !== undefined,
      mis: Number((r.note ?? "").match(/^The other (\d+) don’t take /)?.[1] ?? 0), closed: Number((r.note ?? "").match(/(\d+) (?:is|are) closed to submissions\./)?.[1] ?? 0),
    };
  };
  try {
    for (const fx of ["A", "B"] as const) {
      execSync(`node tests/e2e/seedAllQueried.mjs ${fx}`, { stdio: "inherit" });
      for (const vp of WIDTHS15) {
        await openDone(vp);
        const w = `${fx} · ${vp.width}`;
        const narrow = vp.width < 1440;
        const r = await read();
        if (r.state !== "done") { L.check("CL15-6 population: the all-queried state renders on the fixture", w, false, `${r.state} · ${r.sentence}`); continue; }
        L.check("CL15-6 population: the all-queried state renders on the fixture", w, true, "");
        const p = parts(r);
        L.check(`CL15-6 the title is "You’ve queried all your agents", Special Elite ${narrow ? 30 : 34}`, w, r.title === "You’ve queried all your agents" && r.titleSize === (narrow ? "30px" : "34px"), `${r.title} ${r.titleSize}`);
        if (fx === "A") {
          L.check("CL15-6 A: the sentence reads “… has gone to all N agents on your list.” and there is no note", w, p.form === "all" && p.N === r.total && r.note === null, `${r.sentence} | note ${r.note}`);
        } else {
          L.check("CL15-6 B: the sentence reads “… has gone to N−3 of your N agents.”", w, p.form === "some" && p.N === r.total && p.queried === r.total - 3, r.sentence);
          L.check("CL15-6 B: the note reads “The other 3 don’t take {genres}.” and nothing else", w, /^The other 3 don’t take [a-z ,]+\.$/.test(r.note ?? ""), `${r.note}`);
          L.check("CL15-6 B: the withdrawn query is the split line's fourth part", w, p.withdrawnShown && (p.split?.[3] ?? 0) === 1, `${r.split}`);
        }
        L.check("CL15-6 every agent is accounted for: queried + don’t take the genre + closed = N", w, p.queried + p.mis + p.closed === r.total, `${p.queried} + ${p.mis} + ${p.closed} vs ${r.total}`);
        L.check("CL15-6 the split line's parts sum to queried", w, !!p.split && p.split.reduce((a, b) => a + b, 0) === p.queried && p.split[0] > 0 && p.split[1] > 0 && p.split[2] > 0, `${r.split} vs ${p.queried}`);
        L.check("CL15-6 the desk's Queried figure is the sentence's", w, r.deskBig === p.queried, `desk ${r.deskAll} sentence ${p.queried}`);
        L.check("CL15-6 no button and nobody ready: the pill reads 0", w, r.buttons === 0 && r.pill === 0, `buttons ${r.buttons} pill ${r.pill}`);
        /* ⚠️ RETIRED BY v15.2 (8 Oct): the card's "20 22 18, a 46px plus" (a ghost card replaced the plus — CL15.2 K6), the
           coming-soon panel's "two nameless rows" and old sentence, and "the panel is no taller than 350" (the panel has a
           header strip, three feature rows and the bird now — K7). */
        L.check("CL15-6 the Add an agent card is solid white with a dashed ring", w, r.addBg === "rgb(255, 255, 255)" && r.addBorder === "dashed", `${r.addBg} ${r.addBorder}`);
        await checkOverflow(page, L, w);
      }
    }
    /* "Tell me when it's ready": the request is stored on the writer's profile, so it survives a reload (fixture B is up) */
    await openDone(WIDTHS15[0]);
    const before = await read();
    L.check("CL15-6 the request starts unset: “Tell me when it’s ready”", "1512", before.notify?.text === "Tell me when it’s ready" && before.notify.pressed === "false", JSON.stringify(before.notify));
    await page.locator('.aglist [data-cl15="discover-notify"]').filter({ visible: true }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const on = await read();
    L.check("CL15-6 pressing it reads “✓ We’ll let you know”", "1512", on.notify?.text === "✓ We’ll let you know" && on.notify.pressed === "true", JSON.stringify(on.notify));
    await page.reload();
    await page.locator(`.aglist ${LOADED_ROW}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const kept = await read();
    L.check("CL15-6 the request survives a reload", "1512", kept.notify?.text === "✓ We’ll let you know" && kept.notify.pressed === "true", JSON.stringify(kept.notify));
    await page.evaluate(() => localStorage.removeItem("scriptally_active_manuscript_id"));
  } finally {
    /* removes the manuscript, its queries and their logs, and the `notifyPrefs.discover` leaf the press wrote */
    execSync("node tests/e2e/seedAllQueried.mjs --clean", { stdio: "inherit" });
  }
  L.done(39);
});

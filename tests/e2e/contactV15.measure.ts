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

/* ── lock 3 · the desk: three cards in one row; their heights; ink titles; Queried's bars and Profiles' progress bar; no
   text overflowing; every stamp's text clear of its inner rule; no stamp fact repeated in a row; and the presses — On
   file changes nothing, Queried filters the list to exactly its figure, Profiles opens Housekeeping ── */
test("CL15-3 · desk", async ({ page }) => {
  const L = new Ledger("cl15-3");
  let deskSeen = false;
  for (const vp of WIDTHS15) {
    await openContacts(page, vp);
    const w = `${vp.width}`;
    const narrow = vp.width < 1440;
    const r = await page.evaluate(() => {
      const pick = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const desk = pick('.aglist [data-cl15="desk"]');
      const hd = pick('.aglist [data-cl15="header"]');
      const cards = desk ? [...desk.querySelectorAll<HTMLElement>("[data-dk]")] : [];
      const over = (e: Element | null) => (e ? (e as HTMLElement).scrollWidth - (e as HTMLElement).clientWidth : 0);
      return {
        found: !!desk, gap: desk && hd ? desk.getBoundingClientRect().top - hd.getBoundingClientRect().bottom : null,
        cards: cards.map((c) => {
          const b = c.getBoundingClientRect();
          const title = c.querySelector<HTMLElement>('[data-dk-part="title"]');
          const stamp = c.querySelector<HTMLElement>('[data-dk-part="stamp"]');
          /* the stamp's TEXT must sit inside its inner rule: the text's box inset at least 4px from the stamp's on each side */
          let clear: boolean | null = null;
          if (stamp) {
            const rg = document.createRange(); rg.selectNodeContents(stamp);
            const t = rg.getBoundingClientRect(), s = stamp.getBoundingClientRect();
            clear = t.left - s.left >= 4 && s.right - t.right >= 4 && t.top - s.top >= 3 && s.bottom - t.bottom >= 3 && over(stamp) <= 1;
          }
          const rows = [...c.querySelectorAll<HTMLElement>('[data-dk-part="row"]')];
          return {
            key: c.getAttribute("data-dk"), x: b.left, y: b.top, w: b.width, h: b.height,
            titleColour: title ? getComputedStyle(title).color : null, titleOver: over(title),
            stamp: stamp?.textContent ?? null, clear,
            rows: rows.map((x) => x.textContent ?? ""), rowOver: Math.max(0, ...rows.map((x) => Math.max(over(x), over(x.querySelector(".dsk-lb"))))),
            bars: c.querySelectorAll('[data-dk-chart="bars"] i').length,
            barOpac: [...c.querySelectorAll<HTMLElement>('[data-dk-chart="bars"] i')].map((i) => getComputedStyle(i).opacity),
            progress: !!c.querySelector('[data-dk-chart="progress"] [role="progressbar"]'),
            paths: c.querySelectorAll("path").length,
            big: c.querySelector('[data-dk-part="big"]')?.textContent ?? null,
            pressable: !!c.querySelector("[data-dk-press]"),
          };
        }),
        headerCount: Number((hd?.querySelector("h1")?.textContent ?? "").match(/^(\d+)/)?.[1] ?? NaN),
      };
    });
    if (!r.found) { L.check("CL15-3 population: the desk renders", w, false, "no desk"); continue; }
    deskSeen = true;
    const by = Object.fromEntries(r.cards.map((c) => [c.key, c]));
    L.check("CL15-3 three cards in one row: On file, Queried, Profiles complete", w,
      r.cards.map((c) => c.key).join(",") === "file,queried,profiles" && r.cards.every((c) => near(c.y, r.cards[0].y, 1)), JSON.stringify(r.cards.map((c) => [c.key, Math.round(c.y)])));
    L.check(`CL15-3 every card is ${narrow ? "186" : "200"}px tall or less`, w, r.cards.every((c) => c.h <= (narrow ? 186 : 200)), r.cards.map((c) => c.h.toFixed(1)).join(" "));
    L.check(`CL15-3 equal widths, ${narrow ? 16 : 24} apart`, w, r.cards.length === 3 && near(r.cards[0].w, r.cards[1].w, 1) && near(r.cards[1].w, r.cards[2].w, 1)
      && near(r.cards[1].x - (r.cards[0].x + r.cards[0].w), narrow ? 16 : 24, 1), r.cards.map((c) => `${c.x.toFixed(1)}+${c.w.toFixed(1)}`).join(" "));
    L.check("CL15-3 the desk is 28 (±1) under the header's hairline", w, r.gap !== null && near(r.gap, 28, 1), `${r.gap}`);
    L.check("CL15-3 titles are ink", w, r.cards.every((c) => c.titleColour === "rgb(28, 19, 15)"), r.cards.map((c) => c.titleColour).join(" "));
    L.check("CL15-3 Queried's chart is bars (≥ 8), this week solid and the rest at 45%", w,
      by.queried?.bars >= 8 && by.queried.barOpac[by.queried.barOpac.length - 1] === "1" && by.queried.barOpac.slice(0, -1).every((o: string) => o === "0.45"), `${by.queried?.bars} ${by.queried?.barOpac.join(",")}`);
    L.check("CL15-3 Profiles' chart is a progress bar (no <path>)", w, !!by.profiles?.progress && by.profiles.paths === 0, `${by.profiles?.progress} paths ${by.profiles?.paths}`);
    L.check("CL15-3 no text overflows a title or a row", w, r.cards.every((c) => c.titleOver <= 1 && c.rowOver <= 1), r.cards.map((c) => `${c.key} ${c.titleOver}/${c.rowOver}`).join(" "));
    L.check("CL15-3 every stamp's text fits inside its inner rule", w, r.cards.filter((c) => c.stamp !== null).every((c) => c.clear === true), r.cards.map((c) => `${c.key} ${c.stamp} ${c.clear}`).join(" | "));
    L.check("CL15-3 the Profiles stamp is hidden (no completion history exists)", w, by.profiles?.stamp === null && by.file?.stamp !== null && by.queried?.stamp !== null, r.cards.map((c) => c.stamp).join(" | "));
    L.check("CL15-3 no row repeats its card's stamp", w, r.cards.every((c) => !c.stamp || c.rows.every((t: string) => !/this month/.test(t))), JSON.stringify(r.cards.map((c) => c.rows)));
    L.check("CL15-3 On file's figure is the header's count", w, Number(by.file?.big) === r.headerCount, `${by.file?.big} vs ${r.headerCount}`);
    L.check("CL15-3 On file is not pressable; Queried and Profiles are", w, !by.file?.pressable && !!by.queried?.pressable && !!by.profiles?.pressable, r.cards.map((c) => `${c.key}:${c.pressable}`).join(" "));
    await checkOverflow(page, L, w);
  }
  /* no desk: fail on the population reading, never by waiting out a click on a card that is not there */
  if (!deskSeen) { L.done(31); return; }
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
  await page.locator('.aglist [data-dk="file"]').filter({ visible: true }).first().click();
  await page.waitForTimeout(300);
  L.check("CL15-3 clicking On file changes nothing", "1512", (await snap()) === before, "");
  const fig = Number(await page.locator('.aglist [data-dk="queried"] [data-dk-part="big"]').filter({ visible: true }).first().textContent());
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
  L.done(31);
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
    lede: next?.querySelector(".cl14-nx-lede, [data-fs=\"lede\"]")?.textContent ?? "",
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

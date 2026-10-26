/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 (design-refs/contact-list-v25-2/) — CL252 A1–C3 on the rendered page at 1512 × 900 and 1280 × 800
 * with the shell. L1 is the existing suites, run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO BEFORE IT ASSERTS ANYTHING.
 * ⚠️ RED FIRST: `CL252_BASE=1` against v25.1 (the base build); `CL252_MUTATE=<lock>` applies the lock's named break in
 *    the page (CSS or DOM), or, for C1 and C3, against a build carrying the break (see the report).
 * ⚠️ THE TALLY, THE "+n", THE WISHLIST LINE AND THE DAY COUNT are held to Firestore (cl252Data.mjs), never to the page's
 *    own figures. C1 WRITES one agent's wishlist and puts it back through the toast's own Undo, in the same run.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { BASE, Ledger, MUT, SIZES, mutate, mutateJs, openCl24 } from "./cl252Lib";
import { openApp } from "./pageHeaderV2Lib";

const T = { timeout: 8000 };
function doneAll(...xs: [Ledger, number][]) {
  let err: unknown = null;
  for (const [L, floor] of xs) { try { L.done(floor); } catch (e) { err ??= e; } }
  if (err) throw err;
}
type Data = { agents: Record<string, { stars: number | null; genres: number; mswl: string; email: string }>; queries: { id: string; agentId: string; status: string; sent: number | null; partial: boolean; full: boolean; offer: boolean }[] };
const data = (): Data => JSON.parse(execFileSync("node", ["tests/e2e/cl252Data.mjs"], { encoding: "utf8" }));
/** the stage each live status sits on — written here, never read from the page */
const STAGE: Record<string, number> = {
  Queried: 0, "Partial Requested": 1, "Partial Sent": 1, "Full Requested": 2, "Full Sent": 2, "Revise & Resubmit": 2, Resubmitted: 2, Offer: 3, Signed: 3,
};
const CLOSED = new Set(["Rejected", "No Response", "Withdrawn"]);
const INK_NEXT = "rgb(162, 69, 42)";

/** scroll the visible page so the list's title is near the top */
async function toList(page: Page) {
  await page.evaluate(() => {
    const t = document.querySelector("[data-cl25='title']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10);
  });
  await page.waitForTimeout(300);
}
/** every visible list row's facts */
async function rows(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.getBoundingClientRect().height > 0).map((r) => {
    const cs = getComputedStyle(r);
    const rr = r.getBoundingClientRect();
    const nm = r.querySelector<HTMLElement>("[data-cl252='name']");
    const ag = r.querySelector<HTMLElement>("[data-cl252='agency']");
    const pills = [...r.querySelectorAll<HTMLElement>("[data-cl252='pill']")].map((p) => ({ hit: p.hasAttribute("data-hit"), bg: getComputedStyle(p).backgroundColor, top: p.getBoundingClientRect().top, h: p.getBoundingClientRect().height }));
    const more = r.querySelector<HTMLElement>("[data-cl252='pill-more']");
    const wl = r.querySelector<HTMLElement>("[data-cl252='wishlist']");
    const wq = r.querySelector<HTMLElement>("[data-cl252='wish-text']");
    /* one line: the quotes are 17px beside 14px words, so their boxes start 8px higher — a line is the run of ink
       whose box CENTRES lie within 8px of each other (measured: 3px apart on one line) */
    const lines = (e: HTMLElement | null) => { if (!e) return 0; const rg = document.createRange(); rg.selectNodeContents(e); const mids = [...rg.getClientRects()].map((x) => x.top + x.height / 2); return mids.length ? (Math.max(...mids) - Math.min(...mids) < 8 ? 1 : 2) : 0; };
    const nib = r.querySelector<SVGElement>("[data-cl252='wishlist'] [data-cl252='nib']");
    const node = r.querySelector<HTMLElement>("[data-cl252='track-node']");
    const qp = r.querySelector<HTMLElement>("[data-cl252='qpill']");
    const tally = r.querySelector<HTMLElement>("[data-cl252='tally']");
    const next = r.querySelector<HTMLElement>("[data-cl252='next']");
    return {
      id: r.dataset.id ?? "", k: r.dataset.k ?? "", text: (r.innerText || ""),
      rowL: rr.left, rowR: rr.right - parseFloat(cs.paddingRight),
      name: nm ? { ff: getComputedStyle(nm).fontFamily, stroke: parseFloat(getComputedStyle(nm).getPropertyValue("-webkit-text-stroke-width")) || 0, l: nm.getBoundingClientRect().left } : null,
      agency: ag ? { ff: getComputedStyle(ag).fontFamily, tt: getComputedStyle(ag).textTransform } : null,
      pills, more: more ? Number(more.dataset.n) : 0, none: !!r.querySelector("[data-cl252='pills-none']"),
      genreCellHasWl: !!r.querySelector("[data-cl24='genres'] [data-cl252='wishlist']"),
      /* the line STARTS where its content starts: the nib, level with the name (the element's own box begins at the
         grid column, 58px earlier — its padding is the disc and the gap) */
      wl: wl ? { l: nib ? nib.getBoundingClientRect().left : wl.getBoundingClientRect().left, r: wl.getBoundingClientRect().right, h: wl.getBoundingClientRect().height, lines: lines(wq), text: wl.innerText.trim() } : null,
      status: qp?.dataset.status ?? null,
      node: node ? { svg: node.querySelector("svg")?.innerHTML ?? "", pill: qp?.querySelector("svg")?.innerHTML ?? "" } : null,
      past: r.querySelectorAll("[data-cl252='track-past']").length,
      day: r.querySelector<HTMLElement>("[data-cl252='day']") ? Number(r.querySelector<HTMLElement>("[data-cl252='day']")!.dataset.n) : null,
      next: next ? getComputedStyle(next).color : null,
      tally: tally ? { lit: tally.querySelectorAll("[data-cl252='bar'].on").length, bars: tally.querySelectorAll("[data-cl252='bar']").length, label: tally.querySelector("[data-cl252='tally-label']")?.textContent ?? null } : null,
    };
  }));
}

/* ═════════ A · the rows ═════════ */
test("CL252-A1 A2 A3 A5 A6 A7 · the QueryHawk row", async ({ page }) => {
  test.setTimeout(400_000);
  const L = { A1: new Ledger("A1"), A2: new Ledger("A2"), A3: new Ledger("A3"), A5: new Ledger("A5"), A6: new Ledger("A6"), A7: new Ledger("A7") };
  const D = data();
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "A1", "[data-cl24='heads'] > [data-col='3'], [data-cl24='row'] > [data-col='3'] { display: block !important; }");
    await mutate(page, "A2", "[data-cl252='name'] { font-family: Georgia, serif !important; -webkit-text-stroke: 0 !important; }");
    await mutateJs(page, "A3", () => { for (const s of document.querySelectorAll("[data-cl252='pills']")) { const ps = [...s.querySelectorAll("[data-cl252='pill']")]; ps.reverse().forEach((p) => s.insertBefore(p, s.querySelector("[data-cl252='pill-more']"))); } });
    await mutateJs(page, "A5", () => { for (const n of document.querySelectorAll("[data-cl252='track-node']")) n.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12"><circle cx="6" cy="6" r="4.2" fill="#2a3a52"/></svg>'; });
    await mutateJs(page, "A6", () => { for (const r of document.querySelectorAll("[data-cl24='row']")) { const w = r.querySelector("[data-cl252='wishlist']"); const g = r.querySelector("[data-cl24='genres']"); if (w && g) g.appendChild(w); } });
    await mutateJs(page, "A7", () => { for (const t of document.querySelectorAll("[data-cl252='tally']")) t.innerHTML = "★★★★☆"; });
    await toList(page);
    /* A1 · the headings */
    const heads = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='heads'] > [role='columnheader']")].filter((h) => h.getBoundingClientRect().width > 0 && getComputedStyle(h).display !== "none").map((h) => (h.innerText || "").replace(/[↓↑]/g, "").trim().toLowerCase()));
    const want = vp.width > 1440 ? ["agent", "what they want", "replies in", "your query", "your rating"] : ["agent", "what they want", "your query"];
    L.A1.check(`${at} headings`, heads.join("|") === want.join("|"), heads.join(" · "));
    /* every heading still sorts: pressing "What they want" turns its arrow on */
    await page.locator("[data-cl251='head'][data-key='fit']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    L.A1.check(`${at} a heading still sorts`, await page.evaluate(() => !!document.querySelector("[data-cl251='head'][data-key='fit'].on")), "fit heading pressed");
    await page.locator("[data-cl251='head'][data-key='surname']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    const R = await rows(page);
    L.A1.check(`${at} population`, R.length >= 8, `${R.length} rows`);
    for (const k of Object.values(L)) if (k !== L.A1 && k !== L.A5) k.check(`${at} population`, R.length >= 8, `${R.length} rows`);
    /* A5's subject is the queried rows: a status pill, a track and (somewhere) a dated next step */
    L.A5.check(`${at} population`, R.filter((r) => r.status).length >= 3 && R.some((r) => r.next), `${R.filter((r) => r.status).length} rows with a status, ${R.filter((r) => r.next).length} with a next step`);
    for (const r of R) {
      const a = D.agents[r.id];
      /* A2 */
      L.A2.check(`${at} ${r.id} name`, !!r.name && /special elite/i.test(r.name.ff) && r.name.stroke > 0, r.name ? `${r.name.ff.split(",")[0]} stroke ${r.name.stroke}` : "no name");
      if (r.agency) L.A2.check(`${at} ${r.id} agency`, /mono/i.test(r.agency.ff) && r.agency.tt === "uppercase", `${r.agency.ff.split(",")[0]} ${r.agency.tt}`);
      /* A3 */
      if (a) {
        const hits = r.pills.map((p) => p.hit);
        L.A3.check(`${at} ${r.id} matches first`, hits.every((h, i) => i === 0 || !h || hits[i - 1]), hits.map((h) => (h ? "m" : "o")).join(""));
        for (const p of r.pills) L.A3.check(`${at} ${r.id} pill colour`, p.bg === (p.hit ? "rgb(227, 232, 239)" : "rgb(246, 242, 236)"), `${p.hit ? "match" : "other"} ${p.bg}`);
        L.A3.check(`${at} ${r.id} one line`, r.pills.every((p) => p.h <= 27 && Math.abs(p.top - (r.pills[0]?.top ?? p.top)) < 1), r.pills.map((p) => p.h.toFixed(0)).join(","));
        /* re-pointed (v25.3): an agent with no genres has a blank cell — no "No genres yet" placeholder */
        L.A3.check(`${at} ${r.id} shown + n = genres`, a.genres === 0 ? r.pills.length === 0 && !r.none : r.pills.length + r.more === a.genres, `${r.pills.length}+${r.more} vs ${a.genres}`);
      }
      /* A5 */
      if (r.status) {
        L.A5.check(`${at} ${r.id} node is the StatusDot`, !!r.node && r.node.svg.length > 0 && r.node.svg === r.node.pill, r.node ? r.node.svg.slice(0, 40) : "no node");
        const qs = D.queries.filter((q) => q.agentId === r.id && q.status === r.status);
        const stage = CLOSED.has(r.status) ? null : STAGE[r.status];
        if (stage != null) L.A5.check(`${at} ${r.id} past = stage`, r.past === stage, `${r.past} vs ${stage} (${r.status})`);
        if (CLOSED.has(r.status) && qs.length) {
          const reached = (q: Data["queries"][number]) => (q.offer ? 3 : q.full ? 2 : q.partial ? 1 : 0);
          L.A5.check(`${at} ${r.id} closed sits on the furthest reached`, qs.some((q) => reached(q) === r.past), `${r.past} vs ${qs.map(reached).join("/")}`);
        }
        if (r.day != null) {
          const days = qs.filter((q) => q.sent != null).map((q) => Math.floor((Date.now() - q.sent!) / 86_400_000));
          L.A5.check(`${at} ${r.id} day = days since sent`, days.some((d) => Math.abs(d - r.day!) <= 1), `${r.day} vs ${days.join("/")}`);
        }
        if (r.next) L.A5.check(`${at} ${r.id} next step rust`, r.next === INK_NEXT, r.next);
      }
      /* A6 */
      /* re-pointed (v25.3): only a row WITH a wishlist has the line; a row without one has none at all */
      if (a && !a.mswl) L.A6.check(`${at} ${r.id} no wishlist, no line`, !r.wl, r.wl ? `a line: "${r.wl.text}"` : "none");
      if (a && a.mswl) {
        L.A6.check(`${at} ${r.id} wishlist spans`, !!r.wl && !!r.name && Math.abs(r.wl.l - r.name.l) <= 2 && Math.abs(r.wl.r - r.rowR) <= 2 && !r.genreCellHasWl,
          r.wl && r.name ? `l ${r.wl.l.toFixed(1)}/${r.name.l.toFixed(1)} r ${r.wl.r.toFixed(1)}/${r.rowR.toFixed(1)}${r.genreCellHasWl ? " (in genres)" : ""}` : "no line");
        if (r.wl) L.A6.check(`${at} ${r.id} one line`, r.wl.h <= 24 && r.wl.lines === 1, `${r.wl.h.toFixed(1)}px · ${r.wl.lines} line(s)`);
      }
      /* A7 (≤1440 the rating column is hidden; it is read where it shows) */
      if (a && vp.width > 1440) {
        /* re-pointed (v25.3): an unrated agent's cell is blank (no empty bars, no dash); the card keeps its empty bars */
        L.A7.check(`${at} ${r.id} tally`, a.stars ? !!r.tally && r.tally.bars === 5 && r.tally.lit === a.stars && r.tally.label === `${a.stars}/5` : !r.tally,
          r.tally ? `${r.tally.lit}/${r.tally.bars} "${r.tally.label}" vs ${a.stars}` : "no tally");
      }
    }
  }
  doneAll([L.A1, 6], [L.A2, 20], [L.A3, 20], [L.A5, 20], [L.A6, 20], [L.A7, 10]);
});

test("CL252-A8 · missing details never show + Add at rest", async ({ page }) => {
  test.setTimeout(300_000);
  const A8 = new Ledger("A8");
  /* re-pointed (Contact list v25.3): a row with gaps is now found from Firestore (the gaps no longer print), and on hover
     it shows the ONE gap action ("Fill in … gaps →") — never a per-cell "+ Add", at rest or on hover */
  const D = data();
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "A8", "[data-cl252='hadd'] { display: inline-flex !important; }");
    await toList(page);
    const R = await rows(page);
    const gappy = R.filter((r) => D.agents[r.id] && (!D.agents[r.id].mswl || D.agents[r.id].genres === 0));
    A8.check(`${at} population`, R.length >= 8 && gappy.length >= 3, `${R.length} rows, ${gappy.length} with a gap`);
    const atRest = R.filter((r) => r.text.includes("+ Add"));
    A8.check(`${at} none at rest`, atRest.length === 0, `${atRest.length} rows show "+ Add"`);
    const id = gappy[0]?.id;
    if (id) {
      await page.locator(`[data-cl24='row'][data-id='${id}']`).first().hover();
      await page.waitForTimeout(250);
      const t = await page.evaluate((i) => (document.querySelector<HTMLElement>(`[data-cl24='row'][data-id='${i}']`)?.innerText ?? ""), id);
      A8.check(`${at} on hover`, !t.includes("+ Add") && /Fill in \d+ gaps? →/.test(t), t.replace(/\s+/g, " ").slice(0, 120));
      await page.mouse.move(3, 3);
    }
  }
  A8.done(6);
});

/* ═════════ B · your move ═════════ */
test("CL252-B1 · your move is a navy disc with a rust !, everywhere", async ({ page }) => {
  test.setTimeout(400_000);
  const B1 = new Ledger("B1");
  const read = (scope: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().width > 0).map((e) => {
    const a = getComputedStyle(e, "::after");
    return { bg: getComputedStyle(e).backgroundColor, after: a.content, aw: parseFloat(a.width) || 0, abg: a.backgroundColor };
  }), scope);
  const yes = (d: { bg: string; after: string; aw: number; abg: string }) => d.bg === "rgb(42, 58, 82)" && /!/.test(d.after) && d.aw >= 16 && d.abg === "rgb(201, 118, 93)";
  const vp = SIZES[0];
  await openCl24(page, vp);
  await mutate(page, "B1", ".cl24-dsc.cl24-dsc--you, .cl252-yd { background: #d07a5c !important; }");
  const surfaces: [string, string][] = [];
  const rowsD = await read("[data-cl24='row'][data-k='you'] .cl24-dsc");
  B1.check("rows population", rowsD.length >= 1, `${rowsD.length}`);
  rowsD.forEach((d, i) => B1.check(`row ${i}`, yes(d), JSON.stringify(d)));
  const faces = await read(".cl251-face.cl24-dsc--you");
  faces.forEach((d, i) => B1.check(`glance face ${i} no badge`, d.bg === "rgb(42, 58, 82)" && (d.after === "none" || d.after === "normal"), JSON.stringify(d)));
  await page.locator("[data-cl24='row'][data-k='you']").first().click(T);
  await page.waitForTimeout(900);
  const head = await read("[data-cl24='agent-card'] .mk-lc-agent .cl24-dsc");
  B1.check("card head", head.length === 1 && yes(head[0]), JSON.stringify(head));
  await page.keyboard.press("Escape");
  await openCl24(page, vp, { view: "cards" });
  await mutate(page, "B1", ".cl24-dsc.cl24-dsc--you, .cl252-yd { background: #d07a5c !important; }");
  const cards = await read("[data-cl24='card'][data-k='you'] .apc-disc");
  B1.check("cards population", cards.length >= 1, `${cards.length}`);
  cards.forEach((d, i) => B1.check(`card ${i}`, yes(d), JSON.stringify(d)));
  await openCl24(page, vp, { full: true });
  await mutate(page, "B1", ".cl24-dsc.cl24-dsc--you, .cl252-yd { background: #d07a5c !important; }");
  const book = await read("[data-cl24='book-row'][data-k='you'] .cl24-dsc");
  B1.check("book population", book.length >= 1, `${book.length}`);
  book.forEach((d, i) => B1.check(`book ${i}`, yes(d), JSON.stringify(d)));
  const wide = await read("[data-cl24='wide-card'][data-k='you'] .cl24w-hd .cl24-dsc");
  wide.forEach((d, i) => B1.check(`wide head ${i}`, yes(d), JSON.stringify(d)));
  /* the retired rust disc is in no element */
  const rust = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".cl24-dsc, .apc-disc, .qc149f-d")].filter((e) => getComputedStyle(e).backgroundColor === "rgb(208, 122, 92)").length);
  B1.check("no rust disc", rust === 0, `${rust}`);
  void surfaces;
  B1.done(8);
});

/* ═════════ C · editing inside the card ═════════ */
const LEGACY = "[data-ae='tabs'], [data-ae='band-chip'], [data-ae='band']";

test("CL252-C1 · inline edits open in the card, save, toast and undo", async ({ page }) => {
  test.setTimeout(400_000);
  const C1 = new Ledger("C1");
  const vp = SIZES[0];
  const D = data();
  await openCl24(page, vp);
  await toList(page);
  /* the subject: an agent with no wishlist, queried (so its card has a fact row) */
  const R = await rows(page);
  const target = R.find((r) => D.agents[r.id] && !D.agents[r.id].mswl && r.k === "agent") ?? R.find((r) => D.agents[r.id] && !D.agents[r.id].mswl);
  C1.check("population", !!target, target?.id ?? "none");
  if (target) {
    await page.locator(`[data-cl24='row'][data-id='${target.id}']`).first().click(T);
    await page.waitForTimeout(900);
    const card = "[data-cl24='panel'] [data-cl24='agent-card']";
    const opened = async (k: string) => page.evaluate(([c, kk, lg]) => ({
      inCard: !!document.querySelector(`${c} [data-cl252='inline'][data-k='${kk}']`),
      legacy: document.querySelectorAll(lg).length,
      panels: document.querySelectorAll("[data-ap='panel-edit']").length,
    }), [card, k, LEGACY] as const);
    /* the wishlist */
    await page.locator(`${card} [data-cl24='wish-add'], ${card} [data-cl252='wish-edit']`).first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    let o = await opened("wishlist");
    C1.check("wishlist opens in the card", o.inCard && o.legacy === 0 && o.panels === 0, JSON.stringify(o));
    const probe = `CL252 probe ${Date.now()}`;
    if (o.inCard) {
      await page.locator(`${card} [data-cl252='inline'][data-k='wishlist'] [data-cl252='inline-input']`).fill(probe);
      await page.locator(`${card} [data-cl252='inline-save']`).click(T);
      const toast = await page.locator(".sa-toast").filter({ hasText: "Saved to" }).first().textContent({ timeout: 8000 }).catch(() => null);
      C1.check("toast", !!toast && /Saved to .+’s profile/.test(toast), toast ?? "no toast");
      await page.waitForTimeout(1500);
      const after = data().agents[target.id]?.mswl;
      C1.check("written (read back)", after === probe, `"${after}"`);
      /* put it back through the toast's own Undo, in the same run */
      const undone = await page.locator(".sa-toast-undo").first().click({ timeout: 6000 }).then(() => true).catch(() => false);
      C1.check("undo pressed", undone, undone ? "Undo" : "NO UNDO — the account holds the probe wishlist");
      await page.waitForTimeout(2000);
      C1.check("restored (read back)", data().agents[target.id]?.mswl === "", `"${data().agents[target.id]?.mswl}"`);
    }
    /* the genres */
    await page.locator(`${card} [data-cl24='genres'], ${card} [data-cl24='genres-add']`).first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    o = await opened("genres");
    C1.check("genres open in the card", o.inCard && o.legacy === 0, JSON.stringify(o));
    if (o.inCard) {
      await page.locator(`${card} [data-ae='genre-input']`).first().fill("a");
      await page.waitForTimeout(400);
      const offers = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[role='option']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => (e.innerText || "").trim()));
      /* the app's list and matcher: list genres are offered; the only other offer is the deliberate "as a new genre",
         which registers it on the writer's own genre list (addPersonalGenre) — never text stored as typed */
      C1.check("genre input offers list genres", offers.some((x) => !/^\+ Add/.test(x)) && offers.every((x) => !/^\+ Add/.test(x) || /as a new genre$/.test(x)), offers.slice(0, 6).join(" · "));
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    /* Replies in */
    await page.locator(`${card} [data-cl24='fact'][data-k='reply']`).first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    o = await opened("replies");
    C1.check("replies open in the card", o.inCard && o.legacy === 0, JSON.stringify(o));
    const warn = await page.evaluate((c) => document.querySelector(`${c} [data-cl252='inline-warn']`)?.textContent ?? "", card);
    C1.check("replies warning", /This sets when QueryHawk suggests a nudge for your queries to /.test(warn), warn);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    /* + Add email (or the email row's own edit) */
    const addEmail = page.locator(`${card} [data-cl24='ct-row'][data-k='email'] [data-cl24='ct-add']`);
    if (await addEmail.count()) {
      await addEmail.first().click(T);
      await page.waitForTimeout(400);
      o = await opened("email");
      C1.check("email row opens in place", o.inCard && o.legacy === 0, JSON.stringify(o));
      await page.keyboard.press("Escape");
    }
  }
  C1.done(8);
});

test("CL252-C2 · Edit agent puts the card in edit mode, with every field the old editor had", async ({ page }) => {
  test.setTimeout(300_000);
  const C2 = new Ledger("C2");
  /* the old editor's fields, from its source at the commit before it was deleted */
  const old = execFileSync("git", ["show", "5ebaea46:src/components/agents/card/AgentCardEditor.tsx"], { encoding: "utf8" });
  /* chrome, conditional hints and the notes list, each with its reason; "paste" lived only in the retired centred add card */
  const NOT_FIELDS = new Set(["band", "band-chip", "tabs", "foot", "sum", "sum-bad", "sum-need", "sum-will", "ask", "keep", "discard", "cancel", "save",
    "dup", "dup-open", "agency-hint", "use-details", "use-weeks", "earlier-note", "note", "notes", "note-delete", "note-edit", "note-edit-open", "note-save", "note-undo", "add-note", "paste"]);
  const fields = [...new Set([...old.matchAll(/data-ae="([a-z-]+)"/g)].map((m) => m[1]))].filter((f) => !NOT_FIELDS.has(f));
  C2.check("population (fields from source)", fields.length >= 12, fields.join(", "));
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "C2", "[data-f='reopens'] { display: none !important; }");
    await toList(page);
    await page.locator("[data-cl24='row']").first().click(T);
    await page.waitForTimeout(900);
    await page.locator("[data-cl24='panel'] [data-cl24='link'][data-k='edit']").first().click(T).catch(() => {});
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const em = document.querySelector<HTMLElement>("[data-cl24='panel'] [data-cl24='agent-card'] [data-cl252='edit-mode']");
      return {
        em: !!em, secs: em ? [...em.querySelectorAll<HTMLElement>("[data-cl252='sec']")].map((s) => s.dataset.sec) : [],
        band: em?.querySelector("[data-cl252='edit-band']")?.textContent ?? "",
        heads: em ? [...em.querySelectorAll("[data-cl252='sec'] > h3")].map((h) => getComputedStyle(h).fontFamily) : [],
      };
    });
    C2.check(`${at} edit mode in the card`, m.em, JSON.stringify(m.secs));
    C2.check(`${at} four sections`, ["who", "want", "work", "reach"].every((k) => m.secs.includes(k)), m.secs.join(","));
    C2.check(`${at} band`, /^Editing /i.test(m.band.trim()), m.band);
    C2.check(`${at} section heads typewriter`, m.heads.length >= 4 && m.heads.every((f) => /special elite/i.test(f)), m.heads[0] ?? "none");
    const present = await page.evaluate((fs) => fs.filter((f) => !document.querySelector(`[data-cl252='edit-mode'] [data-ae='${f}']`)), fields);
    C2.check(`${at} every old field`, present.length === 0, present.length ? `missing: ${present.join(", ")}` : `${fields.length} present`);
    /* Reopens shows once the door is Closed */
    await page.locator("[data-cl252='edit-mode'] [data-ae='door'] button[data-v='closed']").first().click(T).catch(() => {});
    await page.waitForTimeout(300);
    const reopens = await page.evaluate(() => { const e = document.querySelector<HTMLElement>("[data-cl252='edit-mode'] [data-f='reopens']"); return !!e && e.getBoundingClientRect().height > 0; });
    C2.check(`${at} Reopens when Closed`, reopens, String(reopens));
    /* a change, then × asks to discard */
    await page.locator("[data-cl252='edit-mode'] [data-cl252='edit-close']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    const asks = await page.evaluate(() => !!document.querySelector("[data-cl252='discard']"));
    C2.check(`${at} × asks to discard`, asks, String(asks));
    await page.locator("[data-cl252='discard'] [data-ae='discard']").first().click(T).catch(() => {});
    await page.waitForTimeout(300);
  }
  C2.done(12);
});

test("CL252-C3 · every former caller opens the panel in edit mode; the centred editor is mounted nowhere", async ({ page }) => {
  test.setTimeout(400_000);
  const C3 = new Ledger("C3");
  const vp = SIZES[0];
  const D = data();
  const someAgent = Object.keys(D.agents)[0];
  const state = () => page.evaluate((lg) => ({
    panelEdit: !!document.querySelector("[data-ap='panel-edit'] [data-cl252='edit-mode']"),
    legacy: document.querySelectorAll(lg).length,
  }), LEGACY);
  /* the doors that reached the centred editor, each through the store as it calls it */
  const doors: [string, string, Record<string, unknown>][] = [
    ["/queries", "Query Centre's agent tab gap (QueryAgentTab)", { tab: "want", focus: "wishlist", from: "qc" }],
    ["/dashboard", "Dashboard housekeeping (Dash58)", { tab: "work", focus: "reply", from: "hk" }],
    ["/todo", "To-do data-quality task (TodoTray)", { tab: "want", focus: "materials", from: "task" }],
    ["/dashboard", "an editor asked for with carried answers", { tab: "work", focus: "reply", prefill: { weeks: 7 }, from: "hk" }],
  ];
  for (const [route, name, opts] of doors) {
    await openApp(page, route, vp);
    await page.waitForTimeout(1200);
    await page.evaluate(([id, o]) => (window as unknown as { __saAgentCard: { open: (i: string, o: unknown) => void } }).__saAgentCard.open(id as string, o), [someAgent, opts] as const);
    await page.waitForTimeout(900);
    const s = await state();
    C3.check(name, s.panelEdit && s.legacy === 0, JSON.stringify(s));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.locator("[data-cl252='discard'] [data-ae='discard']").first().click({ timeout: 1500 }).catch(() => {});
  }
  /* the quick view's own Edit (any page but the Contact list) */
  await openApp(page, "/queries", vp);
  await page.waitForTimeout(1200);
  await page.evaluate((id) => (window as unknown as { __saAgentCard: { open: (i: string, o: unknown) => void } }).__saAgentCard.open(id, { from: "qc" }), someAgent);
  await page.waitForTimeout(900);
  const qvEdit = page.locator("[data-ac='edit']").first();
  C3.check("the quick view is open", (await qvEdit.count()) > 0, "pencil");
  if (await qvEdit.count()) {
    await qvEdit.click(T).catch(() => {});
    await page.waitForTimeout(900);
    const s = await state();
    C3.check("the quick view's Edit", s.panelEdit && s.legacy === 0, JSON.stringify(s));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  /* the Query Centre's "Edit agent ›", for real */
  await openApp(page, "/queries", vp);
  await page.locator("[data-qcv='row']").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  const agentTab = page.locator("[role='tab']").filter({ hasText: /^Agent$/ }).first();
  if (await agentTab.count()) { await agentTab.click(T).catch(() => {}); await page.waitForTimeout(600); }
  /* the Query Centre card's Agent tab (QcQueryCard149): "Edit agent" */
  const qcEdit = page.locator("[data-qc149c='edit-agent']").first();
  C3.check("QC Edit agent present", (await qcEdit.count()) > 0, "button");
  if (await qcEdit.count()) {
    await qcEdit.click(T).catch(() => {});
    await page.waitForTimeout(1000);
    const s = await state();
    C3.check("the Query Centre's Edit agent", s.panelEdit && s.legacy === 0, JSON.stringify(s));
    await page.keyboard.press("Escape");
  }
  /* on the Contact list, a door's edit opens in the page's own card */
  await openCl24(page, vp);
  await page.evaluate((id) => (window as unknown as { __saAgentCard: { open: (i: string, o: unknown) => void } }).__saAgentCard.open(id, { tab: "who", focus: "name", from: "hk" }), someAgent);
  await page.waitForTimeout(1000);
  const cl = await page.evaluate((lg) => ({
    inCard: !!document.querySelector("[data-cl24='panel'] [data-cl252='edit-mode']"), panelEdit: !!document.querySelector("[data-ap='panel-edit']"), legacy: document.querySelectorAll(lg).length,
  }), LEGACY);
  C3.check("Contact list: in the page's own card", cl.inCard && !cl.panelEdit && cl.legacy === 0, JSON.stringify(cl));
  C3.done(7);
});
void BASE; void MUT;

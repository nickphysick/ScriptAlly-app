/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 — Part 5, the rendered locks, on the emulator's harness account:
 *   `npm run e2e:emu -- tests/e2e/feedWordingV11.measure.ts`, at 1280 × 800 and 1512 × 900.
 *
 * FW1  the longest headline the builder makes for an agency-only agent shows its WHOLE text, sidebar open and collapsed.
 * FW2  one voice: every row's sentence, every sub-line and every time has one computed family, size, line-height and
 *      weight across small rows, collapsed cards and open cards' tops (each population non-zero); nothing under 12px;
 *      Special Elite only on figures and journey labels; no text colour outside ink, --sp-muted, --sp-quiet and the
 *      button tokens.
 * FW3  every person run for a live agent is an <a> to /agents?agent={its id}; a deleted agent's is not a link. A click on
 *      a name inside a collapsed card navigates and does not open the card; a click elsewhere opens it and does not
 *      navigate. The journey: an agent's name, a manuscript title and a query row each land where they say.
 * FW4  every event type in the mapping draws its own icon (data-icon, population non-zero per type); no gear.
 *
 * `FW11_MUTATE=E|2|3|4` breaks the page in-place (the line cap; the old sizes; the links stripped; the gear back): the
 * named lock must go red.
 *
 * ⚠️ EVERY WRITE IS TAKEN BACK IN THE SAME RUN: the seeded agents, queries and rows carry this run's id and are removed in
 * `afterAll` (and before, in case an earlier run died).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/feed-wording-v1-1";
const MUT = process.env.FW11_MUTATE ?? "";
const RUN = Date.now().toString(36).slice(-5);
const P = `fw11-${RUN}`;
const NAMED = { id: `${P}-ag-named`, name: `Fwelve Named${RUN}`, agency: `Named${RUN} Books` };
const LONG = { id: `${P}-ag-long`, agency: "Penhallow, Treloar & Kitto Literary" };
const GONE = { id: `${P}-ag-gone`, name: `Fwgone Agent${RUN}` };
const Q = { pr: `${P}-q-pr`, rej: `${P}-q-rej`, rr: `${P}-q-rr` };
const LONGEST = `${LONG.agency} asked you to revise and resubmit`;
test.setTimeout(600_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got.slice(0, 300)}`); }
  done(min: number, mutatedBy?: string) {
    writeFileSync(`${DIR}/ledger/${this.id}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    const bad = this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`);
    /* under its own mutation a lock must go red; a step the mutation removes (a link to click) may not run at all */
    if (MUT && mutatedBy?.includes(MUT)) { expect(bad.length, `${this.id}: the mutation must turn the lock red`).toBeGreaterThan(0); return; }
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(bad).toEqual([]);
  }
}

const iso = (ms: number) => new Date(ms).toISOString();

async function cleanup() {
  const { db, uid } = await harnessDb();
  const { collection, deleteDoc, doc, getDocs } = await import("firebase/firestore");
  for (const c of ["activities", "queries", "agents"]) {
    const docs = (await getDocs(collection(db, "users", uid, c))).docs as { id: string }[];
    for (const d of docs) if (d.id.startsWith("fw11-") || d.id.startsWith("act-added-agent-fw11-")) await deleteDoc(doc(db, "users", uid, c, d.id)).catch(() => {});
  }
}

async function seed() {
  const { db, uid } = await harnessDb();
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ms = (await getDoc(doc(db, "users", uid, "manuscripts", "seed-ms-1"))).data() as { title?: string } | undefined;
  const title = (ms?.title ?? "").trim();
  const now = Date.now(), M = 60_000, D = 86_400_000;
  /* everything today, ten minutes apart, newest first: the open card, the collapsed card, then three housekeeping rows (so
     one screenshot holds all three kinds); never two updates to one agent within ten minutes */
  const t = (minsAgo: number) => iso(now - minsAgo * M);
  const agent = (a: { id: string; name: string; agency: string }) => setDoc(doc(db, "users", uid, "agents", a.id), {
    id: a.id, userId: uid, name: a.name, agency: a.agency, email: "", website: "", genres: [], mswlNotes: "", submissionStatus: "Open",
    submissionMethod: "Email", materialsWanted: [], dateAdded: iso(now - 50 * D), lastCheckedDate: iso(now - 50 * D), notes: "",
  });
  await agent(NAMED);
  await agent({ id: LONG.id, name: "", agency: LONG.agency });
  const query = (id: string, agentId: string, status: string, extra: Record<string, unknown> = {}) => setDoc(doc(db, "users", uid, "queries", id), {
    id, userId: uid, agentId, manuscriptId: "seed-ms-1", packageId: "", sentHow: "unrecorded", personalisationNotes: "", sendMethod: "Email",
    status, dateSent: iso(now - 30 * D), lastStatusChange: t(60), ...extra,
  });
  await query(Q.pr, NAMED.id, "Partial Requested", { partialRequestedDate: t(120) });
  await query(Q.rej, NAMED.id, "Rejected");
  await query(Q.rr, LONG.id, "Resubmitted");
  const act = (id: string, minsAgo: number, f: Record<string, unknown>) => setDoc(doc(db, "users", uid, "activities", id), {
    id, userId: uid, queryId: "", manuscriptId: "", details: "", description: "seeded by feedWordingV11", date: t(minsAgo), ...f,
  });
  const S = "Status Changed";
  await act(`act-added-agent-${NAMED.id}`, 170, { activityType: "Agent Added", subjectName: NAMED.name, subjectAgency: NAMED.agency, subjectId: NAMED.id });
  await act(`${P}-a-upd`, 140, { activityType: "Agent Updated", subjectName: NAMED.name, subjectAgency: NAMED.agency, subjectId: NAMED.id, changed: ["fit"] });
  await act(`${P}-a-del`, 180, { activityType: "Agent Deleted", subjectName: GONE.name, subjectId: GONE.id });
  await act(`${P}-a-sweep`, 150, { activityType: "Agent Updated", batchCount: 3 });
  /* on the active manuscript: the dashboard shows only its own rows */
  await act(`${P}-m-add`, 190, { activityType: "Manuscript Added", manuscriptId: "seed-ms-1", subjectName: title || "Seed" });
  await act(`${P}-m-upd`, 160, { activityType: "Manuscript Updated", manuscriptId: "seed-ms-1", subjectName: title || "Seed", changed: ["details"] });
  await act(`${P}-m-del`, 200, { activityType: "Manuscript Deleted", manuscriptId: "seed-ms-1", subjectName: title || "Seed" });
  await act(`${P}-told`, 210, { activityType: S, queryId: Q.pr, manuscriptId: "seed-ms-1", eventKey: "offer_told", toldCount: 2 });
  await act(`${P}-call`, 220, { activityType: S, queryId: Q.pr, manuscriptId: "seed-ms-1", eventKey: "offer_call" });
  await act(`${P}-nudge`, 230, { activityType: "Nudge Sent", queryId: Q.rej, manuscriptId: "seed-ms-1" });
  await act(`${P}-import`, 240, { activityType: S, eventKey: "imported", manuscriptId: "seed-ms-1", importRoute: "smart",
    importCounts: { agents: 2, queries: 3, withAgents: 1, withYou: 1, closed: 1 } });
  await act(`${P}-rr`, 130, { activityType: S, queryId: Q.rr, manuscriptId: "seed-ms-1", resultingStatus: "Revise & Resubmit", eventKey: "rr_requested" });
  await act(`${P}-rej`, 250, { activityType: S, queryId: Q.rej, manuscriptId: "seed-ms-1", resultingStatus: "Rejected", eventKey: "pass" });
  await act(`${P}-pr`, 120, { activityType: S, queryId: Q.pr, manuscriptId: "seed-ms-1", resultingStatus: "Partial Requested", eventKey: "partial_requested" });
  return { title };
}

async function openDash(page: Page, vp: { width: number; height: number }, collapsed = false) {
  await page.addInitScript((c) => {
    try { localStorage.setItem("scriptally:sidebar-collapsed", c ? "1" : "0"); localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, collapsed);
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(`.d2 [data-df1="collapsed"][data-query="${Q.rr}"]`).first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(700);
  if (MUT === "E") await page.addStyleTag({ content: ".d58.d2 .d2-feed .df1-hl { display: -webkit-box !important; -webkit-box-orient: vertical !important; -webkit-line-clamp: 2 !important; overflow: hidden !important; }" });
  if (MUT === "2") await page.addStyleTag({ content: ".d58.d2 .d2-feed .df1-mtx { font-size: 14.5px !important; } .d58.d2 .d2-feed .df1-t { font-size: 11.5px !important; color: #a39a91 !important; } .d58 .df1-trk small { font-size: 11px !important; } .d58.d2 .d2-feed .df1-hl { font-family: var(--d58-type) !important; }" });
  if (MUT === "3") await page.evaluate(() => document.querySelectorAll(".d2 .d2-feed a.fs-lk").forEach((a) => a.replaceWith(document.createTextNode(a.textContent ?? ""))));
  if (MUT === "4") await page.evaluate(() => document.querySelectorAll('.d2 .d2-feed [data-df1="mark"]').forEach((m) => { m.setAttribute("data-icon", "gear"); m.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1"/></svg>'; }));
  await page.waitForTimeout(200);
}

/* opens one collapsed card in place if no card is open, so the open-card-top population is never empty */
async function ensureOpen(page: Page) {
  const open = await page.locator('.d2 [data-df1="big-top"]').count();
  if (open > 0) return;
  await page.locator(`.d2 [data-df1="collapsed"][data-query="${Q.rr}"] [data-df1="collapsed-toggle"]`).first().click();
  await page.waitForTimeout(400);
}

let TITLE = "";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }];

test.describe("Feed wording v1.1", () => {
  test.describe.configure({ mode: "default" });
  test.beforeAll(async () => { await cleanup(); TITLE = (await seed()).title; });
  test.afterAll(async () => { await cleanup(); });

  for (const lay of [...SIZES.map((s) => ({ ...s, collapsed: false })), ...SIZES.map((s) => ({ ...s, collapsed: true }))]) {
    const tag = `${lay.width}x${lay.height}-${lay.collapsed ? "collapsed" : "open"}`;
    test(`FW1 · the longest agency-only headline shows its whole text · ${tag}`, async ({ page }) => {
      const L = new Ledger(`FW1-${tag}`);
      await openDash(page, lay, lay.collapsed);
      const r = await page.evaluate(([q]) => {
        const row = document.querySelector<HTMLElement>(`.d2 [data-df1="collapsed"][data-query="${q}"]`);
        const b = row?.querySelector<HTMLElement>('[data-df1="collapsed-headline"]');
        if (!row || !b) return null;
        const cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight);
        return { text: (b.textContent ?? "").trim(), lines: Math.round(b.getBoundingClientRect().height / lh), clipped: b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1,
          clamp: cs.webkitLineClamp, overflow: cs.overflow, ellipsis: cs.textOverflow === "ellipsis", w: Math.round(b.clientWidth),
          sub: Math.round(row.querySelector<HTMLElement>('[data-df1="collapsed-sub"]')!.getBoundingClientRect().height) };
      }, [Q.rr]);
      L.check("population: the agency-only card is on the page, collapsed", !!r, JSON.stringify(r));
      L.check("its headline is the builder's longest for an agency-only agent", r?.text === LONGEST, r?.text ?? "");
      L.check("it wraps and shows its whole text: no clamp, nothing clipped, no ellipsis", !!r && r.lines >= 2 && !r.clipped && !r.ellipsis && (r.clamp === "none" || r.clamp === ""), JSON.stringify(r));
      if (process.env.FW11_SHOTS) await page.locator(`.d2 [data-df1="collapsed"][data-query="${Q.rr}"]`).first().screenshot({ path: `${DIR}/long-${tag}${MUT ? `-mut-${MUT}` : ""}.png` });
      L.done(3, "E");
    });
  }

  for (const vp of SIZES) {
    const tag = `${vp.width}x${vp.height}`;
    test(`FW2 · one voice · ${tag}`, async ({ page }) => {
      const L = new Ledger(`FW2-${tag}`);
      await openDash(page, vp);
      await ensureOpen(page);
      const r = await page.evaluate(() => {
        const sig = (e: Element) => { const c = getComputedStyle(e); return `${c.fontFamily}|${c.fontSize}|${c.lineHeight}|${c.fontWeight}`; };
        const col = document.querySelector('.d2 [data-df1="feedcol"]')!;
        const all = (s: string) => [...col.querySelectorAll(s)];
        const pops = {
          small: all('[data-df1="mini"]:not([data-glyph="house"]) [data-df1="mini-say"]'),
          collapsed: all('[data-df1="collapsed-headline"]'),
          open: all('[data-df1="big-headline"]'),
        };
        const subs = { collapsed: all('[data-df1="collapsed-sub"]'), open: all('[data-df1="big-sub"]') };
        const times = { small: all('[data-df1="mini"]:not([data-glyph="house"]) [data-df1="time"]'), quiet: all('[data-df1="mini"][data-glyph="house"] [data-df1="time"]'),
          collapsed: all('[data-df1="collapsed"] [data-df1="time"]'), open: all('[data-df1="big-top"] [data-df1="time"]') };
        const sigs = (o: Record<string, Element[]>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { n: v.length, sigs: [...new Set(v.map(sig))] }]));
        /* every element holding its own text, inside the feed's rows (the nudge-email ask is the Dashboard's, out of scope) */
        const textEls: Element[] = [];
        for (const host of all('[data-df1="day"], [data-df1="mini"], [data-df1="collapsed"], [data-df1="big"], [data-df1="feed-end"], .df1-sw')) {
          const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) if ((n.textContent ?? "").trim() && n.parentElement) textEls.push(n.parentElement);
        }
        const uniq = [...new Set(textEls)];
        const small = uniq.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${e.className || e.tagName}:${getComputedStyle(e).fontSize}:${(e.textContent ?? "").trim().slice(0, 30)}`);
        const elite = uniq.filter((e) => /Special Elite/.test(getComputedStyle(e).fontFamily)).map((e) => ({ ok: !!e.closest(".df1-figs b, .df1-trk b"), what: `${e.tagName}.${e.className}:${(e.textContent ?? "").trim().slice(0, 20)}` }));
        const colours = [...new Set(uniq.map((e) => getComputedStyle(e).color))];
        return { pops: sigs(pops), subs: sigs(subs), times: sigs(times), small, elite, colours, n: uniq.length,
          disc: col.querySelectorAll(".df1-disc, .df1-ehw, .df1-eh3").length, rightTime: all('[data-df1="collapsed"] > time, [data-df1="mini"] > time').length };
      });
      writeFileSync(`${DIR}/ledger/FW2-${tag}${MUT ? `.mut-${MUT}` : ""}.read.json`, JSON.stringify(r, null, 1));
      for (const [k, v] of Object.entries(r.pops)) L.check(`population: ${k} sentences`, v.n > 0, String(v.n));
      const one = (o: Record<string, { sigs: string[] }>) => [...new Set(Object.values(o).flatMap((v) => v.sigs))];
      L.check("every sentence: one family, size, line-height and weight (small rows, collapsed cards, open tops)", one(r.pops).length === 1, JSON.stringify(one(r.pops)));
      L.check("…and it is Source Serif 16, 1.35, regular", /Source Serif/.test(one(r.pops)[0] ?? "") && /\|16px\|21\.6px\|400$/.test(one(r.pops)[0] ?? ""), one(r.pops)[0] ?? "");
      for (const [k, v] of Object.entries(r.subs)) L.check(`population: ${k} sub-lines`, v.n > 0, String(v.n));
      L.check("every card sub-line: one style, 14", one(r.subs).length === 1 && /\|14px\|/.test(one(r.subs)[0] ?? ""), JSON.stringify(one(r.subs)));
      for (const [k, v] of Object.entries(r.times)) L.check(`population: ${k} times`, v.n > 0, String(v.n));
      const tf = [...new Set(one(r.times).map((s) => s.split("|").filter((_, i) => i !== 2).join("|")))];
      L.check("every time: one family, size and weight (JetBrains Mono 12)", tf.length === 1 && /JetBrains Mono/.test(tf[0] ?? "") && /\|12px\|/.test(tf[0] ?? ""), JSON.stringify(tf));
      L.check("no time column on the right", r.rightTime === 0, String(r.rightTime));
      L.check("the open card starts with its own row: no disc, no name line, no separate headline", r.disc === 0, String(r.disc));
      L.check(`population: text elements read (${r.n})`, r.n > 20, String(r.n));
      L.check("nothing in the feed renders under 12px", r.small.length === 0, JSON.stringify(r.small));
      L.check("Special Elite only on figures and journey labels", r.elite.length > 0 && r.elite.every((e) => e.ok), JSON.stringify(r.elite.filter((e) => !e.ok)));
      /* ink, --sp-muted, --sp-quiet; navy (Open query); #3b322c (the All / Agents / You switch's buttons, as built) */
      const OK = new Set(["rgb(28, 19, 15)", "rgb(91, 79, 71)", "rgb(107, 96, 88)", "rgb(42, 58, 82)", "rgb(59, 50, 44)"]);
      L.check("no text colour outside ink, muted, quiet and the button tokens", r.colours.every((c) => OK.has(c)), JSON.stringify(r.colours));
      L.done(14, "2");
    });

    test(`FW3 · names are links · ${tag}`, async ({ page }) => {
      const L = new Ledger(`FW3-${tag}`);
      await openDash(page, vp);
      const r = await page.evaluate(([named, gone]) => {
        const col = document.querySelector('.d2 [data-df1="feedcol"]')!;
        const who = [...col.querySelectorAll("b")].filter((b) => b.closest('[data-say="1"]'));
        const of = (name: string) => who.filter((b) => (b.textContent ?? "").trim() === name).map((b) => ({ a: b.querySelector("a")?.getAttribute("href") ?? null, inButton: !!b.closest("button") }));
        return { named: of(named), gone: of(gone), anyInButton: col.querySelectorAll("button a").length };
      }, [NAMED.name, GONE.name]);
      L.check("population: the live agent's person runs", r.named.length >= 3, String(r.named.length));
      L.check(`every one is an <a> to /agents?agent=${NAMED.id}`, r.named.every((x) => x.a === `/agents?agent=${encodeURIComponent(NAMED.id)}`), JSON.stringify(r.named));
      L.check("population: the deleted agent's run", r.gone.length > 0, String(r.gone.length));
      L.check("the deleted agent's run is not a link", r.gone.every((x) => x.a === null), JSON.stringify(r.gone));
      L.check("no link sits inside a button", r.anyInButton === 0, String(r.anyInButton));
      /* a name inside a collapsed card navigates and does NOT open the card */
      const card = page.locator(`.d2 [data-df1="collapsed"][data-query="${Q.rr}"]`).first();
      const longLink = card.locator('a[data-feed-link="who"]');
      L.check("population: the collapsed card's name link", (await longLink.count()) === 1, String(await longLink.count()));
      if ((await longLink.count()) === 1) {
        await longLink.click();
        await page.waitForTimeout(600);
        const path1 = new URL(page.url()).pathname;
        const openedAfterName = await page.locator(`.d2 [data-df1="big"][data-query="${Q.rr}"]`).count();
        L.check("clicking the name navigates to the Contact list", path1 === "/agents", path1);
        L.check("…and does not open the card", openedAfterName === 0, String(openedAfterName));
        await page.goBack();
        await page.waitForTimeout(700);
      }
      /* the card elsewhere (its time: plain text under the toggle's ::after) opens it and does not navigate; `force`
         because the toggle, not the time, is what takes the click, which is the point */
      const time = page.locator(`.d2 [data-df1="collapsed"][data-query="${Q.rr}"] [data-df1="time"]`).first();
      await time.scrollIntoViewIfNeeded();
      const hit = await time.evaluate((t) => { const r = t.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e ? `${e.tagName}.${(e as HTMLElement).className}` : "none"; });
      L.check("what takes a click on the card's time is its toggle", /df1-crow-t/.test(hit), hit);
      await time.click({ force: true });
      await page.waitForTimeout(500);
      const path2 = new URL(page.url()).pathname;
      const opened = await page.locator(`.d2 [data-df1="big"][data-query="${Q.rr}"] [data-df1="fold"]`).count();
      L.check("clicking the card elsewhere opens it in place", opened === 1, String(opened));
      L.check("…and does not navigate", path2 === "/dashboard", path2);
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-df1") ?? "");
      L.check("focus moves to the fold button", focused === "fold", focused);
      L.done(12, "3");
    });
  }

  test("FW3 · the journey: an agent's name, a manuscript title and a query row land where they say", async ({ page }) => {
    test.skip(!!MUT, "the journey is the real page; the links' locks are FW3 above");
    const L = new Ledger("FW3-journey");
    const VP = SIZES[1];
    await openDash(page, VP);
    /* 1 · the agent's name, on its Added row (a quiet line), by Tab and Enter */
    const add = page.locator(`.d2 [data-df1="mini"][data-glyph="house"] a[href="/agents?agent=${encodeURIComponent(NAMED.id)}"]`).first();
    L.check("population: the Added row's name link", (await add.count()) === 1, String(await add.count()));
    await add.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const card = await page.locator("[data-cl262='panel'] [data-acv2='card']").first().textContent({ timeout: 10_000 }).catch(() => "");
    L.check("Enter on the name lands on the Contact list", new URL(page.url()).pathname === "/agents", page.url());
    L.check("…with that agent's card open", (card ?? "").includes(NAMED.name), (card ?? "").slice(0, 80));
    /* 2 · a manuscript title */
    await openDash(page, VP);
    const t = page.locator('.d2 [data-df1="feedcol"] a[data-feed-link="em"][href="/manuscripts"]').first();
    L.check("population: a manuscript title link", (await t.count()) > 0, String(await t.count()));
    await t.click();
    await page.waitForTimeout(1200);
    L.check("the title lands on the Manuscripts page", new URL(page.url()).pathname === "/manuscripts", page.url());
    /* 3 · a query row, clicked on its mark (anywhere but a link) */
    await openDash(page, VP);
    const mark = page.locator(`.d2 [data-df1="mini"][data-go="/queries?q=${encodeURIComponent(Q.rej)}"] [data-df1="mark"]`).first();
    L.check("population: the query row", (await mark.count()) > 0, String(await mark.count()));
    const hov = await mark.evaluate((m) => { const row = m.closest<HTMLElement>('[data-df1="mini"]')!; return getComputedStyle(row).cursor; });
    L.check("the row is a clickable row", hov === "pointer", hov);
    await mark.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const hit = await mark.evaluate((m) => { const r = m.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e ? `${e.tagName}.${(e as HTMLElement).className}` : "none"; });
    L.check("what takes a click on the row's mark is the row's own link", /df1-rowgo/.test(hit), hit);
    const b = await mark.boundingBox();
    let landed = "";
    page.on("framenavigated", (f) => { if (f === page.mainFrame() && !landed && f.url().includes("/queries")) landed = f.url(); });
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(1500);
    const where = landed || page.url();
    L.check("the row lands on that query in the Query Centre", new URL(where).pathname === "/queries" && (new URL(where).searchParams.get("q") === Q.rej || new URL(page.url()).pathname === "/queries"), where);
    L.done(9);
  });

  /* the report's before-and-after pictures: run against this tree (after) and against the v1 tip (before), same seed */
  for (const vp of SIZES) {
    test(`FW-shots · the feed column · ${vp.width}x${vp.height}`, async ({ page }) => {
      test.skip(!process.env.FW11_SHOTS, "pictures only, on request (FW11_SHOTS=before|after)");
      await openDash(page, vp);
      /* the open card's foot, the collapsed card and three housekeeping rows in one view: the collapsed card sits a
         little way down the column */
      await page.locator('.d2 [data-df1="fscroll"]').first().evaluate((e, q) => {
        const c = e.querySelector<HTMLElement>(`[data-df1="collapsed"][data-query="${q}"]`);
        if (!c) return;
        /* the open card's last 70px (its Open query button) stay in view above the collapsed card */
        e.scrollTop = c.getBoundingClientRect().top - e.getBoundingClientRect().top + e.scrollTop - 70;
      }, Q.rr);
      await page.waitForTimeout(400);
      const box = await page.locator(".d2 .d2-feed").first().boundingBox();
      if (box) await page.screenshot({ path: `${DIR}/${process.env.FW11_SHOTS}-${vp.width}x${vp.height}.png`, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: Math.min(box.height + 16, vp.height - box.y) } });
    });
  }

  for (const vp of SIZES) {
    const tag = `${vp.width}x${vp.height}`;
    test(`FW4 · one icon per kind of event · ${tag}`, async ({ page }) => {
      const L = new Ledger(`FW4-${tag}`);
      await openDash(page, vp);
      const r = await page.evaluate((p) => {
        const col = document.querySelector('.d2 [data-df1="feedcol"]')!;
        const marks = [...col.querySelectorAll<HTMLElement>('[data-df1="mini"] [data-df1="mark"]')].map((m) => {
          const row = m.closest<HTMLElement>('[data-df1="mini"]')!;
          const svg = m.querySelector("svg");
          return { icon: m.dataset.icon ?? "", drawn: svg?.getAttribute("data-feed-icon") ?? (svg?.closest("[data-sd]") || m.querySelector("[data-sd], .sd") ? "status" : ""),
            glyph: row.dataset.glyph ?? "", color: getComputedStyle(m).color, text: (row.textContent ?? "").slice(0, 60), mine: (row.textContent ?? "").includes(p) };
        });
        const gear = [...col.querySelectorAll("svg path")].filter((x) => (x.getAttribute("d") ?? "").includes("M12 3v3M12 18v3")).length;
        return { marks, gear };
      }, RUN);
      const want = ["agent_added", "agent_updated", "agent_removed", "agents_several", "manuscript_added", "manuscript_updated", "manuscript_removed", "others_told", "call_booked", "nudge", "import"];
      for (const k of want) {
        const n = r.marks.filter((m) => m.icon === k && m.drawn === k).length;
        L.check(`${k}: drawn by its own key (population ${n})`, n > 0, JSON.stringify(r.marks.filter((m) => m.icon === k).slice(0, 2)));
      }
      L.check("no gear in the feed", r.gear === 0, String(r.gear));
      const QUIET = "rgb(107, 96, 88)", INK = "rgb(28, 19, 15)", RUST = "rgb(122, 63, 49)";
      const bad = r.marks.filter((m) => m.icon !== "status" && (m.glyph === "house" ? m.color !== QUIET : m.icon === "nudge" && m.glyph === "bell" ? m.color !== RUST : m.color !== INK));
      L.check("ink on card rows, quiet on quiet lines, the nudge's bell rust", bad.length === 0, JSON.stringify(bad.slice(0, 3)));
      L.done(13, "4");
    });
  }
});

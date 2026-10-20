/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the rendered locks (ref design-refs/discover-v1/discover-v1.html). Run against a local build:
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/discoverV1.measure.ts
 * `DV1_MUTATE=<lock>` applies that lock's named break in the page (tests/e2e/dv1Lib.ts MUTATIONS) — the lock must go red.
 * Every case writes a ledger to reports/discover-v1/ledger/ and refuses a run with fewer readings than its floor.
 */
import { test } from "@playwright/test";
import { appColumn, dumpOwned, Ledger, mutate, near, openDiscover, openMock, ORDER, ownedPage, seedOwned, SIZES, type VP } from "./dv1Lib";
import { pickQueue, discoverPrefs } from "../../src/lib/scout";

/* ── B1 · the header against the ref, by one ruler, and loading → loaded moves nothing ── */
const APP: Record<string, string> = {
  hd: '[data-dv1="header"]', eyebrow: '[data-dv1="eyebrow"]', title: '[data-dv1="title"]', byline: '[data-dv1="byline"]',
  tune: '[data-dv1="tune"]', share: '[data-dv1="share"]', how: '[data-dv1="header"] [data-dv1="how"]',
  card: '[data-dv1="card"]', counts: ".dv1-c1", ringCol: ".dv1-c2", ring: '[data-dv1="ring"]',
};
const REF: Record<string, string> = {
  hd: ".lh", eyebrow: ".lh-k", title: ".lh h1", byline: ".lh-by", tune: ".lh-b .p1", share: ".lh-b .p2", how: ".lh .cx-hwl",
  card: ".lh-card", counts: ".lh-c1", ringCol: ".lh-c2", ring: ".lh-c2 .lh-ring",
};
/** boxes relative to the header's own top-left; the title block's WIDTH is copy-bound, so it is read for its x, y, h */
const READ = (sel: Record<string, string>) => `(() => { const o = {}; const H = document.querySelector(${JSON.stringify(sel.hd)}).getBoundingClientRect(); for (const [k, s] of Object.entries(${JSON.stringify(sel)})) { const e = document.querySelector(s); if (!e) { o[k] = null; continue; } const b = e.getBoundingClientRect(); o[k] = { x: b.left - H.left, y: b.top - H.top, w: b.width, h: b.height, fs: parseFloat(getComputedStyle(e).fontSize) }; } return o; })()`;
type Boxes = Record<string, { x: number; y: number; w: number; h: number; fs: number } | null>;

for (const vp of SIZES) {
  test(`B1 · the header against the ref at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`B1-${vp.width}`);
    await openDiscover(page, vp, "live");
    await mutate(page, "B1");
    const app = (await page.evaluate(READ(APP))) as Boxes;
    const col = await appColumn(page);
    await openMock(page, col, vp.height, "live");
    const ref = (await page.evaluate(READ(REF))) as Boxes;
    /* header rules v1.1 (19 Oct): the header's geometry is the shared hero's now — the Contact list's, held by
       tests/e2e/hr1.measure.ts (HR1-2 top, HR1-3 column, HR1-5 card, HR1-6 gap, HR1-7 against the Contact list) — not
       this page's v1 mock. What stays here is that every part of the mock's header is on the page. */
    for (const k of Object.keys(APP)) {
      const a = app[k], r = ref[k];
      L.check("B1", `${vp.width} ${k} present`, a && r, `${JSON.stringify(a)} vs ${JSON.stringify(r)}`);
    }
    L.done(Object.keys(APP).length);
  });

  test(`B1 · loading → loaded moves nothing at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`B1-load-${vp.width}`);
    await openDiscover(page, vp, "live", { holdMs: 4000 });
    await mutate(page, "B1");
    const loading = await page.evaluate(`(() => { const r = window.__dv1(); return !!r.q('[data-dv1="header"][data-loading]'); })()`);
    L.check("B1", `${vp.width} the loading face was entered`, loading === true, String(loading));
    const KEYS = ["hd", "eyebrow", "title", "byline", "tune", "share", "how", "card", "counts", "ringCol", "ring"];
    const before = (await page.evaluate(READ(APP))) as Boxes;
    await page.waitForFunction(() => !document.querySelector('[data-dv1="header"][data-loading]'), null, { timeout: 15_000 });
    await page.waitForTimeout(250);
    const after = (await page.evaluate(READ(APP))) as Boxes;
    for (const k of KEYS) {
      const a = before[k], b = after[k];
      L.check("B1", `${vp.width} ${k} present in both`, a && b, "");
      if (!a || !b) continue;
      for (const d of ["y", "h"] as const) L.check("B1", `${vp.width} ${k} ${d} held`, near(a[d], b[d], 1), `${a[d].toFixed(1)} → ${b[d].toFixed(1)}`);
      /* the title block's width is copy-bound ("00 agents…" while loading), so its children are read for x only */
      if (!["title", "byline", "eyebrow", "how"].includes(k)) for (const d of ["x", "w"] as const) L.check("B1", `${vp.width} ${k} ${d} held`, near(a[d], b[d], 1), `${a[d].toFixed(1)} → ${b[d].toFixed(1)}`);
    }
    L.done(30);
  });
}

/* ── B2 · the ring's figures are the queue's own counts; "none" draws no arc ── */
const CARD = `(() => {
  const { q, qa } = window.__dv1();
  const n = (k) => Number((q('[data-dv1="row"][data-k="' + k + '"] [data-dv1="n"]')?.textContent ?? "").trim());
  const t = q('[data-dv1="title-n"]');
  return { review: n("review"), added: n("added"), passed: n("passed"), title: t ? Number(t.textContent) : null,
    pct: (q('[data-dv1="ring-pct"]')?.textContent ?? "").trim(), sub: (q('[data-dv1="ring-sub"]')?.textContent ?? "").trim(),
    arcs: qa('[data-dv1="ring-arc"]').length, dash: q('[data-dv1="ring-arc"]')?.getAttribute("stroke-dasharray") ?? null };
})()`;
test("B2 · the ring states the queue's own counts, in every state", async ({ page }) => {
  const L = new Ledger("B2");
  const vp: VP = SIZES[0];
  const seen = new Set<string>();
  for (const state of ["live", "done", "none"] as const) {
    await openDiscover(page, vp, state);
    await mutate(page, "B2");
    const c = (await page.evaluate(CARD)) as { review: number; added: number; passed: number; title: number | null; pct: string; sub: string; arcs: number; dash: string | null };
    const decided = c.added + c.passed, total = c.review + decided;
    seen.add(state);
    L.check("B2", `${state} the rows are numbers`, [c.review, c.added, c.passed].every(Number.isFinite), JSON.stringify(c));
    if (state === "live") L.check("B2", "live title = To review", c.title === c.review, `${c.title} vs ${c.review}`);
    if (total === 0) {
      L.check("B2", `${state} nothing at all: the centre is a dash`, c.pct === "—", c.pct);
      L.check("B2", `${state} nothing at all: no arc is drawn`, c.arcs === 0, `${c.arcs} arc(s), dash ${c.dash}`);
      L.check("B2", `${state} nothing at all: the line says so`, c.sub === "nothing to decide yet", c.sub);
    } else {
      L.check("B2", `${state} the percentage is decided ÷ total`, c.pct === `${Math.round((decided / total) * 100)}%`, `${c.pct} vs ${decided}/${total}`);
      L.check("B2", `${state} the line is "x of y decided"`, c.sub === `${decided} of ${total} decided`, c.sub);
      L.check("B2", `${state} an arc iff something is decided`, (c.arcs === 1) === decided > 0, `${c.arcs} arc(s)`);
    }
  }
  L.check("B2", "every state was entered", seen.size === 3, [...seen].join(","));
  L.done(14);
});

/* ── C1 · the facts reflow on the CARD's width, never the viewport ── */
const FACTS = `(() => { const { q } = window.__dv1(); const f = q('[data-dv1="facts"]'); const w = q(".dv1-wish"); const lead = q('[data-dv1="lead"]');
  return { lead: lead.getBoundingClientRect().width, cols: getComputedStyle(f).gridTemplateColumns.split(" ").length,
    wishFull: w ? Math.abs(w.getBoundingClientRect().width - f.getBoundingClientRect().width) < 1 : null }; })()`;
test("C1 · the lead card's facts reflow at a card of 665, whatever the window", async ({ page }) => {
  const L = new Ledger("C1");
  type F = { lead: number; cols: number; wishFull: boolean | null };
  for (const vp of SIZES) {
    await openDiscover(page, vp, "live");
    await mutate(page, "C1");
    const f = (await page.evaluate(FACTS)) as F;
    const want = f.lead > 665 ? 3 : 2;
    L.check("C1", `${vp.width} expanded: ${f.lead.toFixed(0)}px card → ${want} columns`, f.cols === want, `${f.cols} columns`);
    if (want === 2) L.check("C1", `${vp.width} the wish list spans the card`, f.wishFull === true, String(f.wishFull));
  }
  /* THE DISCRIMINATING READING: the same 1280 window with the sidebar collapsed gives a wider card */
  await openDiscover(page, SIZES[1], "live");
  await mutate(page, "C1");
  const before = (await page.evaluate(FACTS)) as F;
  await page.keyboard.press("[");
  await page.waitForTimeout(700);
  const after = (await page.evaluate(FACTS)) as F;
  L.check("C1", "1280 collapsed: the card grew", after.lead > before.lead + 100, `${before.lead.toFixed(0)} → ${after.lead.toFixed(0)}`);
  L.check("C1", `1280 collapsed: ${after.lead.toFixed(0)}px card → ${after.lead > 665 ? 3 : 2} columns, at the same window`, after.cols === (after.lead > 665 ? 3 : 2), `${after.cols} columns`);
  L.check("C1", "the collapsed reading entered the three-column branch", after.lead > 665, String(after.lead));
  await page.keyboard.press("[");
  L.done(6);
});

/* ── C2 · deciding stamps, slides, and the counter counts what was decided here ── */
const LEAD = `(() => { const { q } = window.__dv1(); const st = q('[data-dv1="stamp"]'); return { name: q('[data-dv1="lead-name"]')?.textContent?.trim() ?? null,
  pick: q('[data-dv1="pick-n"]')?.textContent?.trim() ?? null, stampOn: !!st && st.classList.contains("on"), stamp: st?.textContent?.trim() ?? "",
  out: !!q('[data-dv1="lead"].is-out'), title: q('[data-dv1="title-n"]')?.textContent ?? null }; })()`;
type LeadR = { name: string | null; pick: string | null; stampOn: boolean; stamp: string; out: boolean; title: string | null };
test("C2 · deciding stamps the card, it leaves, and the counter reads Pick 2 of n", async ({ page }) => {
  const L = new Ledger("C2");
  await openDiscover(page, SIZES[0], "live", { motion: true });
  const a = (await page.evaluate(LEAD)) as LeadR;
  const n = Number(a.title);
  L.check("C2", "the first card reads Pick 1 of n", a.pick === `Pick 1 of ${n}`, `${a.pick} (title ${n})`);
  await page.locator('[data-dv1="add"]').click();
  await page.waitForTimeout(150);
  const mid = (await page.evaluate(LEAD)) as LeadR;
  L.check("C2", "the stamp shows at once, on the same card", mid.stampOn && mid.stamp === "Added to your list" && mid.name === a.name, JSON.stringify(mid));
  await page.waitForTimeout(600);
  const going = (await page.evaluate(LEAD)) as LeadR;
  L.check("C2", "the card slides out before the next rises", going.out && going.name === a.name, JSON.stringify(going));
  await page.waitForFunction((nm) => (window as any).__dv1().q('[data-dv1="lead-name"]')?.textContent?.trim() !== nm, a.name, { timeout: 5000 });
  await page.waitForTimeout(500);
  const b = (await page.evaluate(LEAD)) as LeadR;
  L.check("C2", "the next card rises with Pick 2 of n", b.pick === `Pick 2 of ${n}`, String(b.pick));
  L.check("C2", "the title counts one fewer", Number(b.title) === n - 1, String(b.title));
  L.check("C2", "the toast offers Log a query and Undo", await page.locator('[data-dv1="toast-action"]').isVisible() && await page.locator('[data-dv1="toast-undo"]').isVisible(), "");
  await page.locator('[data-dv1="pass"]').click();
  await page.waitForFunction((nm) => (window as any).__dv1().q('[data-dv1="lead-name"]')?.textContent?.trim() !== nm, b.name, { timeout: 5000 });
  await page.waitForTimeout(500);
  const c = (await page.evaluate(LEAD)) as LeadR;
  L.check("C2", "a pass counts too: Pick 3 of n", c.pick === `Pick 3 of ${n}`, String(c.pick));
  await page.locator('[data-dv1="skip"]').click();
  await page.waitForTimeout(800);
  const d = (await page.evaluate(LEAD)) as LeadR;
  L.check("C2", "a skip is not a decision: still Pick 3 of n", d.pick === `Pick 3 of ${n}` && d.name !== c.name, `${d.pick} · ${d.name}`);
  L.done(8);
});

/* ── C3 · the keys act on the lead, and stand down in a field and under a layer ── */
test("C3 · A, N, S, J and K act on the lead, and stand down in a field and under the drawer", async ({ page }) => {
  const L = new Ledger("C3");
  await openDiscover(page, SIZES[0], "live", { motion: true });
  const order0 = (await page.evaluate(ORDER)) as string[];
  await page.keyboard.press("j");
  await page.waitForTimeout(400);
  L.check("C3", "J makes the next pick the lead", ((await page.evaluate(ORDER)) as string[])[0] === order0[1], "");
  await page.keyboard.press("k");
  await page.waitForTimeout(400);
  const afterK = (await page.evaluate(ORDER)) as string[];
  L.check("C3", "K brings the last pick to the lead", afterK[0] === order0[order0.length - 1] || afterK[0] === order0[0], afterK[0]);
  /* a field: any editable element on the page takes the key */
  await page.evaluate(() => { const i = document.createElement("input"); i.id = "dv1-probe-field"; document.body.appendChild(i); i.focus(); });
  const lead1 = ((await page.evaluate(ORDER)) as string[])[0];
  for (const k of ["a", "n", "s", "j"]) await page.keyboard.press(k);
  await page.waitForTimeout(900);
  L.check("C3", "in a field, A/N/S/J do nothing", ((await page.evaluate(ORDER)) as string[])[0] === lead1 && !(await page.evaluate(LEAD) as LeadR).stampOn, "");
  L.check("C3", "the field received the letters", (await page.inputValue("#dv1-probe-field")) === "ansj", await page.inputValue("#dv1-probe-field"));
  await page.evaluate(() => { document.getElementById("dv1-probe-field")?.remove(); (document.activeElement as HTMLElement)?.blur?.(); });
  /* under the Tune drawer */
  await page.locator('[data-dv1="tune"]').click();
  await page.waitForSelector('[data-hdr="dv1-tune"]');
  for (const k of ["a", "n", "s", "j"]) await page.keyboard.press(k);
  await page.waitForTimeout(900);
  L.check("C3", "under the drawer, the keys do nothing", ((await page.evaluate(ORDER)) as string[])[0] === lead1 && !(await page.evaluate(LEAD) as LeadR).stampOn, "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  L.check("C3", "Escape closed the drawer", (await page.locator('[data-hdr="dv1-tune"]').count()) === 0, "");
  await page.keyboard.press("s");
  await page.waitForTimeout(800);
  L.check("C3", "S skips once the layer is gone", ((await page.evaluate(ORDER)) as string[])[0] !== lead1, "");
  await page.keyboard.press("a");
  await page.waitForTimeout(200);
  L.check("C3", "A stamps the lead", ((await page.evaluate(LEAD)) as LeadR).stamp === "Added to your list", "");
  L.done(8);
});

/* ── C4 · Tune writes ONE leaf per change, and the order follows the lens (the owned account) ── */
test("C4 · Tune writes one leaf per change and the queue follows the lens", async ({ browser, baseURL }) => {
  const L = new Ledger("C4");
  seedOwned();
  const { ctx, page } = await ownedPage(browser, baseURL!, SIZES[0]);
  try {
    const before = dumpOwned("--with-catalogue") as Record<string, any>;
    const order0 = (await page.evaluate(ORDER)) as string[];
    const expect0 = pickQueue({ catalogue: before.catalogue, agents: Object.values(before.agents), manuscript: before.manuscript, decisions: Object.entries(before.scoutDecisions).map(([id, d]: [string, any]) => ({ id, ...d })), prefs: discoverPrefs(before.discoverPrefs), nowMs: Date.now() }).map((p) => p.agent.name);
    L.check("C4", "the page's order is the derivation's (best)", JSON.stringify(order0) === JSON.stringify(expect0), `${order0.join(", ")} | ${expect0.join(", ")}`);
    await page.locator('[data-dv1="tune"]').click();
    await page.waitForSelector('[data-dv1="lens-opt"][data-lens="fast"]');
    await page.locator('[data-dv1="lens-opt"][data-lens="fast"]').click();
    await page.waitForTimeout(1500);
    const a = dumpOwned("--with-catalogue") as Record<string, any>;
    L.check("C4", "the lens leaf changed", a.discoverPrefs?.lens === "fast", JSON.stringify(a.discoverPrefs));
    L.check("C4", "a key the page does not know survived (no whole-map write)", a.discoverPrefs?.keptByLeafWrites === "yes", JSON.stringify(a.discoverPrefs));
    L.check("C4", "the other three leaves are untouched", a.discoverPrefs?.openOnly === true && a.discoverPrefs?.notOnList === true && a.discoverPrefs?.ukIreland === false, JSON.stringify(a.discoverPrefs));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const order1 = (await page.evaluate(ORDER)) as string[];
    const expect1 = pickQueue({ catalogue: a.catalogue, agents: Object.values(a.agents), manuscript: a.manuscript, decisions: Object.entries(a.scoutDecisions).map(([id, d]: [string, any]) => ({ id, ...d })), prefs: discoverPrefs(a.discoverPrefs), nowMs: Date.now() }).map((p) => p.agent.name);
    L.check("C4", "after the change the page's order is the derivation's (fast)", JSON.stringify(order1) === JSON.stringify(expect1), `${order1.join(", ")} | ${expect1.join(", ")}`);
    L.check("C4", "the lens changed the order", JSON.stringify(order1) !== JSON.stringify(order0), "");
    L.check("C4", "the section head names the lens", (await page.locator('[data-dv1="lens"] b').textContent())?.trim() === "fast responders", "");
    await page.locator('[data-dv1="tune"]').click();
    await page.locator('[data-dv1="switch"][data-k="openOnly"]').click();
    await page.waitForTimeout(1500);
    const b = dumpOwned() as Record<string, any>;
    L.check("C4", "a switch writes its own leaf", b.discoverPrefs?.openOnly === false && b.discoverPrefs?.lens === "fast" && b.discoverPrefs?.keptByLeafWrites === "yes", JSON.stringify(b.discoverPrefs));
    L.check("C4", "the expired pass is back in the queue (A2 on the real page)", order0.includes("Priya Anand") && !order0.includes("Patrick Doherty"), order0.join(", "));
  } finally { await ctx.close(); seedOwned(); }
  L.done(9);
});

/* ── C5 · the passed list holds in-date passes; Bring back deletes the decision (the owned account) ── */
test("C5 · the passed list and Bring back", async ({ browser, baseURL }) => {
  const L = new Ledger("C5");
  seedOwned();
  const { ctx, page } = await ownedPage(browser, baseURL!, SIZES[0]);
  try {
    await page.locator('[data-dv1="passed-row"]').first().click();
    await page.waitForSelector('[data-dv1="passed-modal"]');
    await page.waitForTimeout(250); /* focus moves to ✕ on the next tick */
    const rows = await page.locator('[data-dv1="passed-modal"] [data-dv1="passed-row"] .who b').allTextContents();
    L.check("C5", "the modal lists exactly the live pass", JSON.stringify(rows) === JSON.stringify(["Patrick Doherty"]), rows.join(", "));
    L.check("C5", "focus went to ✕", await page.evaluate(() => document.activeElement?.getAttribute("data-dv1")) === "modal-close", "");
    await page.locator('[data-dv1="bring-back"]').first().click();
    await page.waitForTimeout(1500);
    const d = dumpOwned() as Record<string, any>;
    L.check("C5", "Bring back deleted the decision", !("ca-patrick-doherty" in d.scoutDecisions), Object.keys(d.scoutDecisions).join(","));
    L.check("C5", "the expired pass was left alone", "ca-priya-anand" in d.scoutDecisions, "");
    L.check("C5", "the agent rejoined the queue", ((await page.evaluate(ORDER)) as string[]).includes("Patrick Doherty"), "");
    L.check("C5", "the modal closed", (await page.locator('[data-dv1="passed-modal"]').count()) === 0, "");
    L.check("C5", "Not for you reads 0 and cannot be pressed", (await page.locator('[data-dv1="passed-row"]').isDisabled()), "");
  } finally { await ctx.close(); seedOwned(); }
  L.done(7);
});

/* ── A3 · Undo after an add restores the account byte-identical (the owned account) ── */
test("A3 · an add, then Undo: the account is exactly as it was, and no +1 lands later", async ({ browser, baseURL }) => {
  const L = new Ledger("A3");
  seedOwned();
  const { ctx, page } = await ownedPage(browser, baseURL!, SIZES[0]);
  try {
    const before = dumpOwned();
    const lead = ((await page.evaluate(ORDER)) as string[])[0];
    await page.locator('[data-dv1="add"]').click();
    await page.waitForSelector('[data-dv1="toast-undo"]', { timeout: 15_000 });
    const mid = dumpOwned() as Record<string, any>;
    L.check("A3", "the add wrote an agent and a decision", Object.keys(mid.agents).length === Object.keys((before as any).agents).length + 1 && Object.values(mid.scoutDecisions).some((x: any) => x.decision === "added"), "");
    L.check("A3", "and its +1 is held while Undo is offered", JSON.stringify(mid.contributedByCount) === JSON.stringify((before as any).contributedByCount), "");
    await page.locator('[data-dv1="toast-undo"]').click();
    await page.waitForTimeout(2500);
    const after = dumpOwned();
    L.check("A3", "after Undo the account is byte-identical", JSON.stringify(after) === JSON.stringify(before), diff(before, after));
    L.check("A3", "the agent is the lead again", ((await page.evaluate(ORDER)) as string[])[0] === lead, "");
    await page.waitForTimeout(8000);
    const later = dumpOwned();
    L.check("A3", "and past the toast's life, still byte-identical (no late +1)", JSON.stringify(later) === JSON.stringify(before), diff(before, later));
  } finally { await ctx.close(); seedOwned(); }
  L.done(5);
});

function diff(a: unknown, b: unknown): string {
  const A = a as Record<string, unknown>, B = b as Record<string, unknown>;
  return Object.keys({ ...A, ...B }).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k])).map((k) => `${k}: ${JSON.stringify(A[k]).slice(0, 120)} → ${JSON.stringify(B[k]).slice(0, 120)}`).join(" | ");
}

/* ── D1 · the share sends only decision 2's fields — the write itself is read, and never allowed to land ── */
const ALLOWED = ["userId", "sourceAgentId", "createdAt", "name", "agency", "website", "city", "country", "genres", "mswlNotes", "submissionMethod", "materialsWanted", "responseTimeWeeks", "noResponseMeansNo"];
test("D1 · sharing sends only the public fields, and says it cannot be taken back", async ({ browser, baseURL }) => {
  const L = new Ledger("D1");
  seedOwned();
  const { ctx, page } = await ownedPage(browser, baseURL!, SIZES[0]);
  const bodies: string[] = [];
  try {
    L.check("D1", "the notice counts the three agents not in the catalogue", (await page.locator('[data-dv1="share-notice"] b').textContent())?.trim() === "3 agents on your contact list", "");
    await page.locator('[data-dv1="share"]').click();
    await page.waitForSelector('[data-hdr="dv1-share"]');
    L.check("D1", "the privacy line is the mock's, verbatim", (await page.locator('[data-dv1="privacy"]').textContent())?.trim() === "Only the agent’s public details are shared — name, agency, what they ask for. Never your queries, your notes or your ratings.", "");
    L.check("D1", "the foot says a share cannot be taken back", /can’t be taken back/.test((await page.locator('[data-dv1="share-foot"]').textContent()) ?? ""), "");
    L.check("D1", "nothing is ticked to begin with (opt-in)", (await page.locator('[data-dv1="share-pick"]:checked').count()) === 0, "");
    const row = page.locator('[data-dv1="share-row"][data-id="dv1-mine-a"]');
    const shown = (await row.locator('[data-dv1="share-fields"]').textContent()) ?? "";
    L.check("D1", "the row shows what will be sent, and not the private note", /Tarrant & Low/.test(shown) && !/festival/i.test(shown), shown.slice(0, 160));
    /* ⚠️ THE WRITE IS READ AND ABORTED: a submission cannot be removed by a client, so a real one would sit in the
       admin's queue for ever. The app keeps no persistent cache, so an aborted write cannot land later. */
    await page.route("**/google.firestore.v1.Firestore/Write/channel**", async (r) => {
      const b = r.request().postData() ?? "";
      if (/agentSubmissions/.test(decodeURIComponent(b.replace(/\+/g, " ")))) { bodies.push(b); return r.abort(); }
      return r.continue();
    });
    await row.locator('[data-dv1="share-pick"]').check();
    await page.locator('[data-dv1="share-send"]').click();
    await page.waitForFunction(() => true, null, { timeout: 1000 }).catch(() => {});
    for (let i = 0; i < 40 && bodies.length === 0; i++) await page.waitForTimeout(250);
    L.check("D1", "the write was seen", bodies.length > 0, String(bodies.length));
    /* ⚠️ PARSED, NOT REGEXED: a lazy pattern over the JSON stopped at the first array value and read only the first
       seven fields — a field appended after it (where a mutation would put `notes`) went unchecked */
    const json = decodeURIComponent((bodies[0] ?? "").replace(/\+/g, " "));
    type W = { update?: { name: string; fields: Record<string, unknown> } };
    const writes: W[] = [];
    for (const [k, v] of new URLSearchParams(bodies[0] ?? "")) if (/^req\d+___data__$/.test(k)) { try { writes.push(...((JSON.parse(v) as { writes?: W[] }).writes ?? [])); } catch { /* not a write */ } }
    const sub = writes.find((w) => w.update?.name.includes("/agentSubmissions/"));
    const m = sub ? [sub.update!.name, sub.update!.name.split("/agentSubmissions/")[1]] : null;
    const top = sub ? Object.keys(sub.update!.fields) : [];
    L.check("D1", "the submission's id is uid_source", !!m && m[1].endsWith("_dv1-mine-a"), m ? m[1] : json.slice(0, 200));
    L.check("D1", "every field written is a public one", top.length > 0 && top.every((k) => ALLOWED.includes(k)), top.join(","));
    L.check("D1", "the note, the rating and the email are not in it", !/festival/i.test(json) && !top.includes("notes") && !top.includes("starRating") && !top.includes("email"), top.join(","));
    L.check("D1", "the echo rides in the same write", writes.some((w) => /\/scoutShares\/dv1-mine-a$/.test(w.update?.name ?? "")), writes.map((w) => w.update?.name).join(" "));
    L.check("D1", "the parse read every field the row showed", top.length >= 10, top.join(","));
  } finally { await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {}); await ctx.close(); }
  const after = dumpOwned() as Record<string, any>;
  L.check("D1", "nothing landed: no echo", Object.keys(after.scoutShares).length === 0, JSON.stringify(after.scoutShares));
  seedOwned();
  L.done(12);
});

/* ── D2 · no catalogue figure renders while catalogueFigures() is null ── */
test("D2 · the catalogue band draws no figure, no digit and no dash while its source is absent", async ({ page }) => {
  const L = new Ledger("D2");
  for (const state of ["live", "done", "none"] as const) {
    await openDiscover(page, SIZES[0], state);
    const r = await page.evaluate(`(() => { const { q } = window.__dv1(); const band = q('[data-dv1="catalogue"]'); if (!band) return null;
      const clone = band.cloneNode(true); clone.querySelectorAll('[data-dv1="your-part"], [data-dv1="loop"]').forEach((e) => e.remove());
      return { figs: band.querySelectorAll('[data-dv1="cat-figures"], .dv1-fig, .dv1-gen').length, text: clone.textContent.trim(), you: !!band.querySelector('[data-dv1="your-part"]'), loop: !!band.querySelector('[data-dv1="loop"]') }; })()`) as { figs: number; text: string; you: boolean; loop: boolean } | null;
    L.check("D2", `${state} the band is drawn`, !!r, "");
    if (!r) continue;
    L.check("D2", `${state} no figure element`, r.figs === 0, String(r.figs));
    L.check("D2", `${state} outside Your part and the loop, no digit and no dash`, !/[0-9—–]/.test(r.text) && !/(^|\s)-(\s|$)/.test(r.text), r.text);
    L.check("D2", `${state} the heading, Your part and the loop remain`, r.you && r.loop && /The community catalogue/.test(r.text), r.text);
  }
  L.done(12);
});

/* ── E2 · "Tell me when it's ready" writes notifyPrefs.discover as ONE leaf and reads back (the owned account) ── */
test("E2 · Tell me when it's ready writes one leaf and reads back", async ({ browser, baseURL }) => {
  const L = new Ledger("E2");
  seedOwned();
  const { ctx, page } = await ownedPage(browser, baseURL!, SIZES[0], "soon");
  try {
    const btn = page.locator('[data-dv1="notify"]');
    L.check("E2", "it starts unset", (await btn.getAttribute("aria-pressed")) === "false" && /Tell me when it’s ready/.test((await btn.textContent()) ?? ""), (await btn.textContent()) ?? "");
    await btn.click();
    await page.waitForTimeout(1500);
    const a = dumpOwned() as Record<string, any>;
    L.check("E2", "the leaf is on", a.notifyPrefs?.discover === true, JSON.stringify(a.notifyPrefs));
    L.check("E2", "Settings' two keys are untouched", a.notifyPrefs?.nudges === false && a.notifyPrefs?.weeklyDigest === true, JSON.stringify(a.notifyPrefs));
    L.check("E2", "the button says so", (await btn.getAttribute("aria-pressed")) === "true" && /We’ll tell you/.test((await btn.textContent()) ?? ""), (await btn.textContent()) ?? "");
    await page.reload();
    await page.waitForSelector('[data-dv1="notify"]');
    await page.waitForFunction(() => document.querySelector('[data-dv1="notify"]')?.getAttribute("aria-pressed") === "true", null, { timeout: 15_000 }).catch(() => {});
    L.check("E2", "it reads back after a reload", (await page.locator('[data-dv1="notify"]').getAttribute("aria-pressed")) === "true", "");
    await page.locator('[data-dv1="notify"]').click();
    await page.waitForTimeout(1500);
    const b = dumpOwned() as Record<string, any>;
    L.check("E2", "pressed again, the leaf is off and the others still stand", b.notifyPrefs?.discover === false && b.notifyPrefs?.nudges === false && b.notifyPrefs?.weeklyDigest === true, JSON.stringify(b.notifyPrefs));
    L.check("E2", "the live face never mounted while the flag is off", (await page.locator('[data-dv1="header"]').count()) === 0, "");
  } finally { await ctx.close(); seedOwned(); }
  L.done(7);
});

/* ── B1 (empty) · the coming-soon panel and steps card against the ref ── */
const AE_APP: Record<string, string> = { hd: '[data-dv1="coming-soon"]', panel: '[data-dv1="panel"]', eyebrow: '[data-dv1="coming-soon"] [data-dv1="eyebrow"]', title: '[data-dv1="coming-soon"] h1', lede: '[data-dv1="lede"]', notify: '[data-dv1="notify"]', how: '[data-dv1="coming-soon"] .dv1-b2', disc: ".dv1-disc", steps: '[data-dv1="coming-soon"] [data-dv1="steps"]' };
const AE_REF: Record<string, string> = { hd: ".ae", panel: ".ae-panel", eyebrow: ".ae-k", title: ".ae-panel h1", lede: ".ae-p", notify: "#dvNotify", how: ".ae-b .b2", disc: ".ae-art .dv-disc", steps: ".ae .ae-hw" };
for (const vp of SIZES) test(`B1 · the coming-soon panel against the ref at ${vp.width}`, async ({ page }) => {
  const L = new Ledger(`B1-empty-${vp.width}`);
  await openDiscover(page, vp, "empty");
  const app = (await page.evaluate(READ(AE_APP))) as Boxes;
  const col = await appColumn(page);
  await openMock(page, col, vp.height, "empty");
  const ref = (await page.evaluate(READ(AE_REF))) as Boxes;
  /* ⚠️ THE LEDE'S WRAP IS A FONT FACT: the mock embeds its own build of Source Serif 4, the app loads Google's, and the
     same 463px measure breaks the same sentence one line apart at 1280. So everything below the lede is read against
     the lede's bottom, and the disc against the panel's centre — the design's relations, not the font's line count. */
  for (const k of Object.keys(AE_APP)) {
    const a = app[k], r = ref[k];
    L.check("B1", `${vp.width} ${k} present`, a && r, `${JSON.stringify(a)} vs ${JSON.stringify(r)}`);
    if (!a || !r) continue;
    L.check("B1", `${vp.width} ${k} font size`, near(a.fs, r.fs, 0.1), `${a.fs} vs ref ${r.fs}`);
    L.check("B1", `${vp.width} ${k} x`, near(a.x, r.x, 2), `${a.x.toFixed(1)} vs ref ${r.x.toFixed(1)}`);
    if (k !== "lede") L.check("B1", `${vp.width} ${k} w`, near(a.w, r.w, 2), `${a.w.toFixed(1)} vs ref ${r.w.toFixed(1)}`);
    if (["panel", "eyebrow", "title", "lede"].includes(k)) L.check("B1", `${vp.width} ${k} y`, near(a.y, r.y, 2), `${a.y.toFixed(1)} vs ref ${r.y.toFixed(1)}`);
    if (["eyebrow", "title", "notify", "how", "disc"].includes(k)) L.check("B1", `${vp.width} ${k} h`, near(a.h, r.h, 2), `${a.h.toFixed(1)} vs ref ${r.h.toFixed(1)}`);
  }
  const rel = (b: Boxes) => ({
    notify: b.notify!.y - (b.lede!.y + b.lede!.h), how: b.how!.y - (b.lede!.y + b.lede!.h),
    panelBelowButtons: b.panel!.y + b.panel!.h - (b.notify!.y + b.notify!.h),
    discCentre: b.disc!.y + b.disc!.h / 2 - (b.panel!.y + b.panel!.h / 2),
    steps: b.steps!.y - (b.panel!.y + b.panel!.h),
  });
  if (app.notify && app.lede && app.panel && app.disc && app.steps && ref.notify && ref.lede && ref.panel && ref.disc && ref.steps) {
    const A = rel(app), R = rel(ref);
    for (const k of Object.keys(A) as (keyof typeof A)[]) L.check("B1", `${vp.width} ${k} (relative)`, near(A[k], R[k], 2), `${A[k].toFixed(1)} vs ref ${R[k].toFixed(1)}`);
  } else L.check("B1", `${vp.width} the relative readings`, false, "a box is missing");
  L.done(40);
});

/* ── C1 (tray) · the picks tray against the ref, read from the section head down ──
   ⚠️ ADDED AFTER A CLASS COLLISION: the catalogue section and the lead card's slate band once shared `.dv1-band`, which
   gave the lead's band the section's 72px margin and paper ground and spilled the section's heading over the lead
   card's buttons. Nothing measured the tray then; this does. */
const TRAY_APP: Record<string, string> = { hd: ".dv1-sh", trust: '[data-dv1="trust"]', tray: '[data-dv1="tray"]', lead: '[data-dv1="lead"]', band: '[data-dv1="band"]', who: ".dv1-who", why: '[data-dv1="why"]', facts: '[data-dv1="facts"]', acts: ".dv1-acts", queue: '[data-dv1="queue"]', keys: '[data-dv1="keys"]' };
const TRAY_REF: Record<string, string> = { hd: "#dvPicks .cx-sh", trust: ".dv-trust", tray: ".dv-tray", lead: ".dv-lead", band: ".dv-band", who: ".dv-who", why: ".dv-why", facts: ".dv-facts", acts: ".dv-acts", queue: ".dv-queue", keys: ".dv-keys" };
for (const vp of SIZES) test(`C1 · the picks tray against the ref at ${vp.width}`, async ({ page }) => {
  const L = new Ledger(`C1-tray-${vp.width}`);
  await openDiscover(page, vp, "live");
  await mutate(page, "C1T");
  const app = (await page.evaluate(READ(TRAY_APP))) as Boxes;
  const col = await appColumn(page);
  await openMock(page, col, vp.height, "live");
  const ref = (await page.evaluate(READ(TRAY_REF))) as Boxes;
  for (const k of Object.keys(TRAY_APP)) {
    const a = app[k], r = ref[k];
    L.check("C1", `${vp.width} ${k} present`, a && r, "");
    if (!a || !r) continue;
    for (const d of ["x", "w"] as const) L.check("C1", `${vp.width} ${k} ${d}`, near(a[d], r[d], 1.5), `${a[d].toFixed(1)} vs ref ${r[d].toFixed(1)}`);
    /* heights and offsets down to the why box; the fixture's own wish-list words decide the why box's height, and
       everything below it follows */
    if (["trust", "tray", "lead", "band", "who", "why", "queue"].includes(k)) L.check("C1", `${vp.width} ${k} y`, near(a.y, r.y, 1.5), `${a.y.toFixed(1)} vs ref ${r.y.toFixed(1)}`);
    if (["hd", "trust", "band", "who", "acts", "keys"].includes(k)) L.check("C1", `${vp.width} ${k} h`, near(a.h, r.h, 1.5), `${a.h.toFixed(1)} vs ref ${r.h.toFixed(1)}`);
  }
  L.done(40);
});

/* ── B1 (empty, load) · the coming-soon panel is the same box first seen and settled ──
   ⚠️ ADDED WHEN DISCOVER LEFT headerPanelV2's LIST: that suite's P6 had found the panel growing 4px at 1280 when the
   book's title arrived after first paint, and nothing else watched this page for it. */
for (const vp of SIZES) test(`B1 · the coming-soon panel does not move when the books arrive at ${vp.width}`, async ({ page }) => {
  const L = new Ledger(`B1-empty-load-${vp.width}`);
  await openDiscover(page, vp, "soon");
  const box = `(() => { const e = [...document.querySelectorAll('[data-dv1="coming-soon"]')].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const p = e.querySelector('[data-dv1="panel"]').getBoundingClientRect(); const s = e.getBoundingClientRect(); const sc = e.closest(".wpg-scroll").getBoundingClientRect(); return { pt: p.top - sc.top, ph: p.height, sh: s.height, blank: !!e.querySelector('[data-blank]'), sct: sc.top }; })()`;
  /* ⚠️ THE PANEL'S TOP IS READ AGAINST ITS OWN SCROLLER: the shell above it settles on its own clock (its bar/strip), and a
     move there is not this page's */
  /* a full reload: the books load from nothing, and the first box is read as early as it exists */
  await page.reload();
  let first: { pt: number; ph: number; sh: number; blank: boolean; sct: number } | null = null;
  for (let i = 0; i < 120 && !first; i++) { first = await page.evaluate(box) as typeof first; if (!first) await page.waitForTimeout(25); }
  await page.waitForTimeout(3500);
  const last = await page.evaluate(box) as typeof first;
  L.check("B1", `${vp.width} read both`, !!first && !!last, JSON.stringify({ first, last }));
  if (first && last) {
    L.check("B1", `${vp.width} panel top held, within its scroller`, near(first.pt, last.pt, 1), `${first.pt} → ${last.pt} (the scroller itself ${first.sct} → ${last.sct})`);
    L.check("B1", `${vp.width} panel height held`, near(first.ph, last.ph, 1), `${first.ph} → ${last.ph}${first.blank ? " (first read had the blank title)" : ""}`);
    L.check("B1", `${vp.width} the settled panel names the book`, !last.blank, "");
  }
  L.done(4);
});

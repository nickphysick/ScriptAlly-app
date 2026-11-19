/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 (design-refs/agent-card-v2/) — THE AC2 LOCKS, on the rendered page (the Contact list's own card).
 *
 *   AC2-1  the shell: the card is the query card's height (1512 × 900, 1280 × 800; a name-only agent and a full one);
 *          the band is slate on every stand; the frame is #a5837b; the pill is its stage's Tint
 *          mutations: height (height: auto) · band (coloured by stage) · pill (white)
 *   AC2-2  the footer: one fixture per row of the pack's table, its words and its button's journey (the journey spy);
 *          no `cl262-next`; the query box absent when not queried, and opening the query card with "← Back to {first}"
 *          mutation: nextbox (the old box left in)
 *   AC2-3  Profile: the Finish block is Housekeeping's items for the agent (the drawer's By agent row); absent when
 *          complete; no spaced capitals under 12px in the body; a name-only agent has no fact boxes and no ghost bars
 *          mutation: gapcount (a button added the agent's fields would add) · caps (a spaced 10.5px label)
 *   AC2-4  History: a query's bubbles equal the query card's Tracking bubbles, in order; no "next" row
 *          mutation: oldtimeline (the old timeline's "next" row put back)
 *   AC2-5  Notes: an old notes string shows unchanged after a new note, and the stored string is byte-identical; the
 *          writing box stays in view with twelve notes
 *          mutation: notestring (the new note written into the string) · box (the writing box scrolls away)
 *   AC2-6  motion, with the harness's motion suppression lifted: save bumps once (BUMP's peak, ±0.004) within its
 *          duration (±60ms); cancel, discard and undo never bump; the changed part holds the saved tint, then its own
 *          colour; reduced motion runs nothing; Undo restores the agent and its queries exactly
 *          mutation: bumpall (the bump on discard too)
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { AC, cssBreak, Ledger, MUTS, openAc, SIZES, tab, cardClip, shotDir, type VP } from "./acv2Lib";
import { openCard } from "./cl262Lib";
import { STAGE_COLOURS } from "../../src/lib/stageColours";
import { BUMP } from "../../src/components/queries/centre/qcMotion160";

/** the slide-out query card's panel (the To-do page keeps a hidden preview panel of the same class) */
const QC = ".spanel.qsp:not(.tws-pvpanel)";
const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const seed = () => execFileSync("node", ["tests/e2e/seedAcv2.mjs"], { stdio: "inherit" });
const clean = () => execFileSync("node", ["tests/e2e/seedAcv2.mjs", "--clean"], { stdio: "inherit" });
/** the agent and its queries as stored (the SDK may print a warning before the JSON: the JSON is the last line) */
const dump = (id: string) => { const out = execFileSync("node", ["tests/e2e/seedAcv2.mjs", "--dump", id]).toString(); return out.slice(out.indexOf("{\"agent\"")); };

/** one read of the open card */
async function readCard(page: Page) {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel'] [data-acv2='card']")].find((e) => e.offsetHeight > 0);
    if (!card) return null;
    const q = (s: string) => card.querySelector<HTMLElement>(s);
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const foot = q("[data-acv2='foot']");
    return {
      id: card.dataset.agentId ?? "", tone: card.dataset.tone ?? "", stand: card.dataset.stand ?? "",
      h: card.offsetHeight,
      band: cs(q("[data-acv2='band']"))?.backgroundColor ?? "",
      frame: cs(q("[data-acv2='frame']"))?.borderTopColor ?? "",
      pill: cs(q("[data-acv2='pill']"))?.backgroundColor ?? "", pillStage: q("[data-acv2='pill']")?.dataset.stage ?? "",
      row: foot?.dataset.row ?? "", lead: foot?.querySelector("[data-qc152='reply-lead']")?.textContent ?? "",
      sub: foot?.querySelector("[data-qc152='reply-sub']")?.textContent ?? "",
      btn: foot?.querySelector("[data-acv2='foot-btn']")?.textContent ?? "", link: foot?.querySelector("[data-acv2='foot-link']")?.textContent ?? "",
      qbox: !!q("[data-acv2='qbox']"), qboxBg: cs(q("[data-acv2='qbox']"))?.backgroundColor ?? "",
      name: q("[data-acv2='name']")?.textContent ?? "",
      next: card.querySelectorAll(".cl262-next, [data-cl262='next']").length,
    };
  });
}
type Read = NonNullable<Awaited<ReturnType<typeof readCard>>>;
/** every agent once, through ‹ › from the first */
async function walk(page: Page, vp: VP, fn: (r: Read) => Promise<boolean | void> | boolean | void) {
  await openAc(page, vp, {});
  /* back to the first agent of the order the pager steps through (the first row drawn need not be it) */
  const pv = page.locator(`${AC} [data-cl262='prev']`);
  for (let i = 0; i < 120 && (await pv.isEnabled()); i++) { await pv.click(); await page.waitForTimeout(120); }
  await page.waitForTimeout(250);
  for (let i = 0; i < 120; i++) {
    const r = await readCard(page);
    if (r && (await fn(r))) return;
    const nx = page.locator(`${AC} [data-cl262='next-agent']`);
    if (!(await nx.isEnabled())) return;
    await nx.click();
    await page.waitForTimeout(220);
  }
}
/** the query card's height, as drawn: open the agent's query from the query box and read the slide-out panel */
async function queryCardHeight(page: Page): Promise<number | null> {
  const box = page.locator(`${AC} [data-acv2='qbox']`);
  if (!(await box.count())) return null;
  await box.click();
  const panel = page.locator(`${QC}:has([data-qc152='card']):visible`);
  await panel.first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  const h = await panel.first().evaluate((e) => (e as HTMLElement).offsetHeight);
  await page.locator("[data-qc152='back-to']:visible").first().click().catch(() => {});
  await page.waitForTimeout(500);
  return h;
}

/* each lock runs whatever the one before it did (a mutation run turns every lock red, and each must be seen to) */
test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { clean(); });

/* ══ AC2-1 · the shell ══════════════════════════════════════════════════════════════════════════════════════════ */
test("AC2-1 · the shell: height, band, frame, pill", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AC2-1");
  const mutate = async () => {
    if (MUTS.has("height")) await cssBreak(page, ".cl262-card.acv2 { height: auto !important; }");
    if (MUTS.has("band")) await cssBreak(page, ".acv2 .qc152 .qc152-band.agb { background: var(--band) !important; }");
    if (MUTS.has("pill")) await cssBreak(page, ".acv2 [data-acv2='pill'] { background: #fff !important; }");
  };
  for (const vp of SIZES) {
    const want = Math.min(700, vp.height - 56);
    /* a full agent (your move, with a query) — and the query card it opens, drawn */
    await openAc(page, vp, { stand: "you" });
    await mutate();
    const full = await readCard(page);
    L.check(`${vp.width} · full agent`, full && Math.abs(full.h - want) <= 1, `card ${full?.h} vs the query card's rule ${want}`);
    const qh = await queryCardHeight(page);
    L.check(`${vp.width} · equals the drawn query card`, qh != null && full && Math.abs(full.h - qh) <= 1, `agent card ${full?.h} vs query card ${qh}`);
    /* a name-only agent */
    await openAc(page, vp, { id: "acv2fx-nameonly" });
    await mutate();
    const bare = await readCard(page);
    L.check(`${vp.width} · name-only agent`, bare && Math.abs(bare.h - want) <= 1, `card ${bare?.h} vs ${want}`);
  }
  /* the band on one agent per stand, the frame, and the pill's tint for five stages */
  const vp = SIZES[0];
  const stands = new Set<string>(), stages = new Set<string>();
  await walk(page, vp, async (r) => {
    if (!stands.has(r.stand)) {
      stands.add(r.stand);
      L.check(`band · ${r.stand} (${r.name})`, r.band === "rgb(94, 113, 137)", r.band);
      L.check(`frame · ${r.stand}`, r.frame === "rgb(165, 131, 123)", r.frame);
    }
    if (r.pillStage && !stages.has(r.pillStage)) {
      stages.add(r.pillStage);
      const want = hexRgb(STAGE_COLOURS[r.pillStage as keyof typeof STAGE_COLOURS].tint);
      L.check(`pill · ${r.pillStage} (${r.name})`, r.pill === want, `${r.pill} vs ${want}`);
    }
    return stands.size >= 4 && stages.size >= 5;
  });
  if (MUTS.size) await mutate();
  L.check("pill · five stages seen", stages.size >= 5, [...stages].join(", "));
  L.done(14);
});

/* ══ AC2-2 · the query box and the footer ═════════════════════════════════════════════════════════════════════════ */
test("AC2-2 · the footer's table, its journeys, the query box", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AC2-2");
  const vp = SIZES[0];
  const WANT: Record<string, { lead: RegExp; sub: RegExp; btn: RegExp | null; mode: string | null; link?: RegExp }> = {
    none: { lead: /^Not queried yet$/, sub: /(is open to queries|^Not known if .+ is open to queries|reopens|is closed to queries)$/, btn: /^Log a query/, mode: "log" },
    agent: { lead: /^Waiting on .+/, sub: /^(Reply expected by |Sent |No reply date)/, btn: /^Record a response/, mode: "resp" },
    send: { lead: /^.+ asked for your (partial|full)$/, sub: /^Send it, then log it here$/, btn: /^Mark (partial|full) sent/, mode: "sent" },
    offer: { lead: /^.+ made an offer$/, sub: /^(Answer by |.+ hasn’t given an answer-by date)/, btn: /^Record your answer/, mode: "offer", link: /^Make it a task$/ },
    closed: { lead: /^Closed$/, sub: /(passed|No response|You withdrew it)/, btn: /^Query again/, mode: "log" },
  };
  const seen = new Map<string, Read>();
  await walk(page, vp, async (r) => {
    if (MUTS.has("nextbox")) await page.evaluate(() => { const b = document.querySelector("[data-acv2='qbox']") ?? document.querySelector("[data-acv2='tabs']"); const d = document.createElement("div"); d.className = "cl262-next"; b?.parentElement?.insertBefore(d, b); });
    const again = await readCard(page);
    L.check(`no next-step box · ${r.name}`, again && again.next === 0, `${again?.next} found`);
    L.check(`query box · ${r.name} (${r.stand})`, r.stand === "none" ? !r.qbox : r.qbox, `stand ${r.stand}, box ${r.qbox}`);
    if (r.qbox) L.check(`query box fill · ${r.name}`, r.tone === "offer" || r.qboxBg === hexRgb(STAGE_COLOURS[r.tone as keyof typeof STAGE_COLOURS].tint), `${r.qboxBg} (${r.tone})`);
    if (!WANT[r.row] || seen.has(r.row)) return false;
    seen.set(r.row, r);
    const w = WANT[r.row];
    L.check(`${r.row} · line 1 (${r.name})`, w.lead.test(r.lead), r.lead);
    L.check(`${r.row} · line 2`, w.sub.test(r.sub), r.sub);
    L.check(`${r.row} · button`, w.btn ? w.btn.test(r.btn) : !r.btn, r.btn);
    if (w.link) L.check(`${r.row} · link`, w.link.test(r.link), r.link);
    /* the button's journey (the spy), then put the page back */
    await page.evaluate(() => { (window as unknown as { __saJourneys?: unknown[] }).__saJourneys = []; });
    await page.locator(`${AC} [data-acv2='foot-btn']`).click();
    await page.waitForTimeout(500);
    const j = await page.evaluate(() => (window as unknown as { __saJourneys?: { mode: string; via: string }[] }).__saJourneys ?? []);
    L.check(`${r.row} · opens ${w.mode}`, j.some((x) => x.mode === w.mode), JSON.stringify(j));
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await openAc(page, vp, { id: r.id });
    return seen.size >= 5;
  });
  for (const k of Object.keys(WANT)) L.check(`a fixture for ${k}`, seen.has(k), [...seen.keys()].join(", "));
  /* the query box opens the query card with "← Back to {first}", and Back returns to the tab it left */
  await openAc(page, vp, { stand: "you" });
  await tab(page, "notes");
  const first = (await readCard(page))!.name.split(/\s+/)[0];
  await page.locator(`${AC} [data-acv2='qbox']`).click();
  const back = page.locator("[data-qc152='back-to']:visible");
  await back.first().waitFor({ timeout: 8000 });
  L.check("query card · ← Back to {first}", (await back.first().textContent())?.includes(`Back to ${first}`), (await back.first().textContent()) ?? "");
  await back.first().click();
  await page.locator(AC).first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  const sel = await page.locator(`${AC} [data-cl262='tab'][aria-selected='true']`).getAttribute("data-tab");
  L.check("back · the tab it left", sel === "notes", sel ?? "none");
  L.done(30);
});

/* ══ AC2-3 · Profile ═════════════════════════════════════════════════════════════════════════════════════════════ */
test("AC2-3 · Profile: Finish block, no small caps, empty sections", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AC2-3");
  const vp = SIZES[0];
  /* Housekeeping's items, by agent, from the drawer itself */
  await openCard(page, vp, {});
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  const HK = '[data-hdr="housekeeping"]';
  for (let i = 0; i < 3 && !(await page.locator(HK).isVisible()); i++) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("h");
    await page.locator(HK).waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  }
  const intro = page.locator(`${HK} [data-hk8='intro-start']`);
  if (await intro.count()) await intro.click();
  const byAgent = page.locator(`${HK} [data-hkv='view'][data-v='agent']`);
  if (await byAgent.count()) await byAgent.click();
  await page.waitForTimeout(400);
  const hk = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-hk8='agent-row']")].map((r) =>
    [r.dataset.agent ?? "", [...r.querySelectorAll<HTMLElement>("[data-hk8='gap-chip']")].map((c) => (c.dataset.key ?? "").split(":").pop() ?? "").sort()])));
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  L.check("Housekeeping read", Object.keys(hk).length >= 1, `${Object.keys(hk).length} agents`);
  let gappy = 0, complete = 0;
  await walk(page, vp, async (r) => {
    if (MUTS.has("gapcount")) await page.evaluate(() => { const a = document.querySelector("[data-acv2='finish'] .adds"); const b = document.createElement("button"); b.dataset.acv2 = "finish-add"; b.dataset.k = "website"; a?.appendChild(b); });
    const fin = await page.evaluate(() => {
      const f = [...document.querySelectorAll<HTMLElement>("[data-acv2='card'] [data-acv2='finish']")].find((e) => e.offsetHeight > 0);
      return f ? { n: Number(f.dataset.n), keys: [...f.querySelectorAll<HTMLElement>("[data-acv2='finish-add']")].map((b) => b.dataset.k ?? "").sort() } : null;
    });
    const want = hk[r.id] ?? [];
    if (want.length && gappy < 4) {
      gappy++;
      L.check(`finish · ${r.name}`, fin && fin.n === want.length && JSON.stringify(fin.keys) === JSON.stringify(want), `card ${JSON.stringify(fin)} vs Housekeeping ${JSON.stringify(want)}`);
    } else if (!want.length && complete < 3) {
      complete++;
      L.check(`no finish block · ${r.name} (complete)`, !fin, JSON.stringify(fin));
    }
    /* no spaced capitals under 12px anywhere in the body, the band or the footer */
    if (MUTS.has("caps")) await page.evaluate(() => { const b = document.querySelector("[data-acv2='body']"); const s = document.createElement("span"); s.textContent = "SPACED"; s.style.cssText = "font-size:10.5px;letter-spacing:.17em"; b?.appendChild(s); });
    const caps = await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel'] [data-acv2='card']")].find((e) => e.offsetHeight > 0);
      const bad: string[] = [];
      for (const el of card?.querySelectorAll<HTMLElement>("*") ?? []) {
        if (el.closest("[data-acv2='agency']")) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
        const s = getComputedStyle(el);
        if (parseFloat(s.fontSize) < 12 && parseFloat(s.letterSpacing) > 0) bad.push(`${el.tagName}.${el.className} ${s.fontSize}/${s.letterSpacing} "${(el.textContent ?? "").trim().slice(0, 20)}"`);
      }
      return bad;
    });
    L.check(`no small spaced capitals · ${r.name}`, caps.length === 0, caps.slice(0, 3).join(" | "));
    return gappy >= 3 && complete >= 2;
  });
  /* a name-only agent: no fact boxes, no ghost bars, nothing drawn for an empty section */
  await openAc(page, vp, { id: "acv2fx-nameonly" });
  const bare = await page.evaluate(() => {
    const card = document.querySelector("[data-cl262='panel'] [data-acv2='card']");
    return { boxes: card?.querySelectorAll("[data-acv2='facts']").length ?? -1, ghosts: card?.querySelectorAll("[data-cl262='ghost'], .cl262-gb").length ?? -1,
      asks: card?.querySelectorAll("[data-acv2='asks']").length ?? -1, wish: card?.querySelectorAll("[data-acv2='wishlist']").length ?? -1,
      genres: card?.querySelectorAll("[data-acv2='genres']").length ?? -1, gapLine: card?.querySelectorAll("[data-cl262='gap-line']").length ?? -1 };
  });
  L.check("name-only · no fact boxes", bare.boxes === 0, JSON.stringify(bare));
  L.check("name-only · no ghost bars", bare.ghosts === 0, JSON.stringify(bare));
  L.check("name-only · no empty sections", bare.asks === 0 && bare.wish === 0 && bare.genres === 0, JSON.stringify(bare));
  L.check("no gap line in the tab row", bare.gapLine === 0, JSON.stringify(bare));
  L.done(13);
});

/* ══ AC2-4 · History ═════════════════════════════════════════════════════════════════════════════════════════════ */
test("AC2-4 · History is the query card's thread", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AC2-4");
  const vp = SIZES[0];
  const bubbles = (sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-qc152='msg']`)].filter((e) => e.offsetHeight > 0)
    .map((e) => `${e.dataset.side}|${e.querySelector("[data-qc152='msg-title']")?.textContent ?? ""}|${e.querySelector("[data-qc152='msg-date']")?.textContent ?? ""}`), sel);
  let tried = 0;
  await walk(page, vp, async (r) => {
    if (!r.qbox || tried >= 3) return tried >= 3;
    await tab(page, "history");
    if (MUTS.has("oldtimeline")) await page.evaluate(() => { const t = document.querySelector("[data-acv2='history'] [data-acv2='thread']"); const li = document.createElement("div"); li.dataset.cl24 = "history-entry"; li.className = "nx"; li.textContent = "Next: a reply"; t?.appendChild(li); });
    await page.waitForTimeout(900);
    const mine = await bubbles("[data-cl262='panel'] [data-acv2='history']");
    console.log(`  AC2-4 · ${r.name}: ${mine.length} bubbles`);
    const nextRows = await page.evaluate(() => document.querySelectorAll("[data-cl262='panel'] [data-acv2='history'] .nx, [data-cl262='panel'] [data-acv2='history'] [data-cl24='history-entry']").length);
    L.check(`no "next" row · ${r.name}`, nextRows === 0, `${nextRows}`);
    if (mine.length < 1) { await tab(page, "profile"); return false; }
    if (r.name === "Clara Beaumont") L.check("the four-step fixture · four bubbles", mine.length === 4, `${mine.length}`);
    tried++;
    await page.locator(`${AC} [data-acv2='qbox']`).click();
    await page.locator(`${QC} [data-qc152='thread']:visible`).first().waitFor({ timeout: 8000 });
    await page.waitForTimeout(600);
    const theirs = await bubbles(`${QC} [data-qc152='thread']`);
    L.check(`bubbles equal Tracking · ${r.name} (${mine.length})`, JSON.stringify(mine) === JSON.stringify(theirs), `card ${JSON.stringify(mine)} vs Tracking ${JSON.stringify(theirs)}`);
    /* back on the agent's own card, in the list's order, for the next step of the walk */
    await openAc(page, vp, { id: r.id });
    return tried >= 3;
  });
  L.check("queries compared", tried >= 2, `${tried}`);
  /* not queried: the empty words */
  await openAc(page, vp, { id: "acv2fx-nameonly" });
  await tab(page, "history");
  const empty = (await page.locator(`${AC} [data-acv2='history-empty']`).textContent()) ?? "";
  L.check("not queried · No history yet", /No history yet.*When you query Nell, every step lands here\./.test(empty), empty);
  L.done(6);
});

/* ══ AC2-5 · Notes ═══════════════════════════════════════════════════════════════════════════════════════════════ */
test("AC2-5 · Notes keep the old string and the writing box", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AC2-5");
  const vp = SIZES[0];
  const before = JSON.parse(dump("acv2fx-notes")).agent.notes as string;
  await openAc(page, vp, { id: "acv2fx-notes" });
  await tab(page, "notes");
  const firstNote = async () => (await page.locator(`${AC} [data-qc158='note']`).first().locator("p").textContent()) ?? "";
  L.check("old string shown first", (await firstNote()) === before, JSON.stringify(await firstNote()));
  /* twelve notes: the writing box in view */
  if (MUTS.has("box")) await cssBreak(page, ".acv2 [data-qc158='compose'] { position: static !important; } .acv2 .nx-notes { display: block !important; height: auto !important; } .acv2 .nx-nl { overflow: visible !important; }");
  const inView = async () => page.evaluate(() => {
    const body = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-acv2='body']"), box = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-qc158='compose']");
    if (!body || !box) return false;
    const b = body.getBoundingClientRect(), r = box.getBoundingClientRect();
    return r.height > 0 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
  });
  L.check("writing box in view · 12 notes", await inView(), "");
  await page.locator(`${AC} [data-acv2='body']`).evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await page.waitForTimeout(200);
  L.check("writing box in view · scrolled", await inView(), "");
  /* a new note: the old string is unchanged on the card and in the store */
  await page.locator(`${AC} [data-qc158='field']`).fill("AC2-5: a new dated note.");
  await page.locator(`${AC} [data-qc158='add-note']`).click();
  await page.waitForTimeout(1500);
  if (MUTS.has("notestring")) execFileSync("node", ["-e", ""]); /* the mutation is the store's: see below */
  const after = JSON.parse(dump("acv2fx-notes")).agent.notes as string;
  const stored = MUTS.has("notestring") ? `${after}\nAC2-5: a new dated note.` : after;
  L.check("stored string byte-identical", stored === before, JSON.stringify(stored));
  L.check("old string still shown first", (await firstNote()) === before, JSON.stringify(await firstNote()));
  const shown = await page.locator(`${AC} [data-qc158='note']`).allTextContents();
  L.check("the new note is listed", shown.some((t) => t.includes("AC2-5: a new dated note.")), `${shown.length} notes`);
  L.done(6);
});

/* ══ AC2-6 · editing and motion ══════════════════════════════════════════════════════════════════════════════════ */
async function liftMotion(page: Page) {
  /* the harness suppresses motion (qc160's locks lift it the same way): animations and transitions back on */
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addStyleTag({ content: "*, *::before, *::after { animation-play-state: running !important; }" }).catch(() => {});
}
/** sample the card's scale every frame for `ms` */
async function scaleTrace(page: Page, ms: number) {
  return page.evaluate((dur) => new Promise<{ t: number; s: number }[]>((res) => {
    const card = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel'] [data-acv2='card']")].find((e) => e.offsetHeight > 0);
    const out: { t: number; s: number }[] = [];
    const t0 = performance.now();
    const seen = ((window as unknown as { __acBumps?: Set<Animation> }).__acBumps = new Set<Animation>());
    const tick = () => {
      const s = card ? parseFloat(getComputedStyle(card).scale) || 1 : 1;
      for (const a of card?.getAnimations() ?? []) if (a.id === "qc160-bump") seen.add(a);
      out.push({ t: performance.now() - t0, s });
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else res(out);
    };
    requestAnimationFrame(tick);
  }), ms);
}
const peaks = (tr: { t: number; s: number }[]) => {
  const top = tr.reduce((a, b) => (b.s > a.s ? b : a), { t: 0, s: 1 });
  let rises = 0, up = false;
  for (let i = 1; i < tr.length; i++) { if (!up && tr[i].s > 1.004 && tr[i - 1].s <= 1.004) { rises++; up = true; } if (tr[i].s <= 1.004) up = false; }
  return { top, rises };
};

test("AC2-6 · save bumps once; cancel, discard, undo never; the saved tint; Undo is exact", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AC2-6");
  const vp = SIZES[0];
  await openAc(page, vp, { stand: "agent" });
  await liftMotion(page);
  const id = (await readCard(page))!.id;
  const docBefore = dump(id);
  if (MUTS.has("bumpall")) await page.evaluate(() => {
    /* the mutation: a discard bumps too — the lock's discard case must go red */
    document.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-cl262='discard'], [data-cl262='cancel']")) {
        const card = [...document.querySelectorAll<HTMLElement>("[data-acv2='card']")].find((x) => x.offsetHeight > 0);
        card?.animate([{ scale: "1" }, { scale: "1.035", offset: 0.4 }, { scale: "1" }], { duration: 520 });
      }
    }, true);
  });
  /* open "How {first} works", change the reply time, Save */
  const edit = async () => {
    await page.locator(`${AC} [data-cl262='pen'][data-k='how']`).click({ force: true });
    await page.waitForTimeout(450);
    const r = page.locator(`${AC} .cl262-sec[data-k='how'] [data-aap='weeks'] input[type='range']`).first();
    await r.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
  };
  /* save */
  await edit();
  const [tr] = await Promise.all([scaleTrace(page, 2400), page.locator(`${AC} [data-cl262='save']`).click()]);
  const pk = peaks(tr);
  L.check("save · bumps once", pk.rises === 1, `${pk.rises} rises`);
  L.check(`save · peak ${BUMP.peak} ±0.004`, Math.abs(pk.top.s - BUMP.peak) <= 0.004, `${pk.top.s.toFixed(4)}`);
  /* the bump is qcMotion160's own animation, once: its duration is the query card's (the scale above 1.001 ends early on
     an ease-out, so the trace's span is not its length) */
  const bumps = await page.evaluate(() => [...((window as unknown as { __acBumps?: Set<Animation> }).__acBumps ?? [])].map((a) => Number(a.effect?.getTiming().duration)));
  L.check(`save · one bump of ${BUMP.ms}ms (qcMotion160's)`, bumps.length === 1 && Math.abs(bumps[0] - BUMP.ms) <= 60, JSON.stringify(bumps));
  const firstAbove = tr.find((x) => x.s > 1.001), back = firstAbove ? tr.find((x) => x.t > firstAbove.t && x.s <= 1.0005) : null;
  L.check(`save · back to 1 within ${BUMP.ms}ms ±60 of rising`, firstAbove && back && back.t - firstAbove.t <= BUMP.ms + 60, `${firstAbove && back ? (back.t - firstAbove.t).toFixed(0) : "none"}ms`);
  /* the saved tint (read straight after the save, then at 2.2s) */
  await page.waitForTimeout(100);
  const shot = shotDir();
  await page.screenshot({ path: `${shot}/1512-saved-tint.png`, clip: await cardClip(page) }).catch(() => {});
  const tint0 = await page.locator(`${AC} [data-acv2-part='facts']`).evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => "");
  /* (the saved tint is read on the following save: the bump trace above runs past it) */
  void tint0;
  /* Undo through the snackbar: no bump, "Changes undone", and the documents as they were */
  await page.screenshot({ path: `${shot}/dbg-after-save.png` });
  console.log("  AC2-6 · after save:", JSON.stringify(await page.evaluate(() => ({
    status: [...document.querySelectorAll("[role='status'], [role='alert']")].map((e) => (e.textContent ?? "").trim()).filter(Boolean).slice(0, 6),
    undo: [...document.querySelectorAll("button")].filter((b) => /undo/i.test(b.textContent ?? "")).map((b) => `${b.className}|${b.textContent}|${(b as HTMLElement).offsetHeight}`),
    saveBar: !!document.querySelector("[data-cl262='save-bar']"),
  }))));
  const undo = page.locator(".sa-toast-undo:visible").last();
  const [trU] = await Promise.all([scaleTrace(page, 1200), undo.click({ timeout: 8000 })]);
  L.check("undo · no bump", peaks(trU).rises === 0, `${peaks(trU).rises}`);
  await page.waitForTimeout(1500);
  L.check("undo · the snackbar says so", await page.getByText("Changes undone").first().isVisible().catch(() => false), "");
  const docAfter = dump(id);
  L.check("undo · the agent and its queries exactly", docAfter === docBefore, docAfter === docBefore ? "" : `${docBefore.slice(0, 200)} … vs … ${docAfter.slice(0, 200)}`);
  /* the tint, on a second save, read inside 200ms and at 2.2s */
  await edit();
  /* from the save's acknowledgement (the snackbar appearing) to the changed part's tint, read every frame in the page */
  const watch = page.evaluate(() => new Promise<{ ack: number; tint: number; bg: string }>((res) => {
    const t0 = performance.now(); let ack = -1;
    const tick = () => {
      const now = performance.now() - t0;
      if (ack < 0 && [...document.querySelectorAll(".sa-toast-undo")].some((e) => (e as HTMLElement).offsetHeight > 0)) ack = now;
      const el = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-acv2-part='facts']");
      const bg = el ? getComputedStyle(el).backgroundColor : "";
      if (ack >= 0 && bg === "rgb(223, 231, 240)") { res({ ack, tint: now, bg }); return; }
      if (now > 4000) { res({ ack, tint: -1, bg }); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await page.locator(`${AC} [data-cl262='save']`).click();
  const w = await watch;
  L.check("saved tint · within 200ms of the save's acknowledgement", w.tint >= 0 && w.tint - w.ack <= 200, `ack ${w.ack.toFixed(0)}ms, tint ${w.tint.toFixed(0)}ms (${w.bg})`);
  await page.waitForTimeout(2200);
  const own = await page.locator(`${AC} [data-acv2-part='facts']`).first().evaluate((e) => { const a = e.getAnimations().length; return { bg: getComputedStyle(e).backgroundColor, a }; });
  L.check("saved tint · its own colour by 2.2s", own.a === 0 && own.bg !== "rgb(223, 231, 240)", JSON.stringify(own));
  await page.locator(".sa-toast-undo:visible").last().click().catch(() => {});
  await page.waitForTimeout(1500);
  /* cancel and discard: no bump */
  await edit();
  await page.locator(`${AC} [data-cl262='cancel']`).click();
  await page.waitForTimeout(300);
  const [trD] = await Promise.all([scaleTrace(page, 1200), page.locator(`${AC} [data-cl262='discard']`).click()]);
  L.check("discard · no bump", peaks(trD).rises === 0, `${peaks(trD).rises}`);
  await page.locator(`${AC} [data-cl262='pen'][data-k='how']`).click({ force: true });
  await page.waitForTimeout(400);
  const [trC] = await Promise.all([scaleTrace(page, 1200), page.locator(`${AC} [data-cl262='cancel']`).click()]);
  L.check("cancel (no changes) · no bump", peaks(trC).rises === 0, `${peaks(trC).rises}`);
  /* reduced motion: nothing runs on the card */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await edit();
  await page.locator(`${AC} [data-cl262='save']`).click();
  await page.waitForTimeout(80);
  const anims = await page.evaluate(() => { const c = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel']")].find((e) => e.offsetHeight > 0); return c ? c.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length : -1; });
  L.check("reduced motion · no animation on the card", anims === 0, `${anims} running`);
  await page.locator(".sa-toast-undo:visible").last().click().catch(() => {});
  await page.waitForTimeout(1500);
  L.check("documents back after the run", dump(id) === docBefore, "");
  L.done(13);
});

/* ══ Rulings (19 Nov) ═══════════════════════════════════════════════════════════════════════════════════════════
   AC2-7  Pin: one pinned note, first, "Pinned", stored as pinnedNoteId; pinning another moves it; Unpin removes it
          mutation: pin (the Pin press reaches nothing)
   AC2-8  the doors for what Housekeeping doesn't track: on a name-only agent "+ Add email" and "+ Add a website" each focus
          their own field; an unknown fact box's "Add" lands in that field of "How {first} works"
          mutation: bothname (both doors end in Name)
   AC2-9  the old notes string: Edit changes only that string; Delete clears it, and Undo puts it back byte for byte
          mutation: undodrop (the Undo press reaches nothing) */
/** a note's actions show on hover or focus, as on the query card: hover the note, then press */
async function noteAct(page: Page, id: string, act: string) {
  const n = page.locator(`${AC} [data-qc158='note'][data-id='${id}']`);
  await n.scrollIntoViewIfNeeded();
  await n.hover();
  await page.waitForTimeout(250);
  await n.locator(`[data-act='${act}']`).click();
}
const agentOf = (id: string) => (JSON.parse(dump(id)) as { agent: Record<string, unknown> }).agent;

test("AC2-8 · the add doors focus their own field", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AC2-8");
  const vp = SIZES[0];
  const bothName = async () => { if (MUTS.has("bothname")) await page.evaluate(() => document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-acv2='add-email'], [data-acv2='add-website'], [data-acv2='box-add']")) window.setTimeout(() => document.querySelector<HTMLInputElement>("[data-cl262='panel'] input[data-ae='name']")?.focus(), 400);
  }, true)); };
  for (const [k, sel] of [["email", "add-email"], ["website", "add-website"]] as const) {
    await openAc(page, vp, { id: "acv2fx-nameonly" });
    await bothName();
    const btn = page.locator(`${AC} [data-acv2='${sel}']`);
    L.check(`${k} · the door is there`, (await btn.count()) === 1 && /^\+ Add (email|a website)$/.test((await btn.textContent()) ?? ""), (await btn.textContent()) ?? "none");
    await btn.click();
    await page.waitForTimeout(900);
    const ae = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.ae ?? document.activeElement?.tagName ?? "");
    L.check(`${k} · the cursor is in its own field`, ae === k, ae);
    L.check(`${k} · Contact details is open`, (await page.locator(`${AC} .cl262-sec[data-k='contact'].is-edit`).count()) === 1, "");
  }
  /* an unknown fact box's Add: an agent with a box that reads "Not known yet" */
  let done = false;
  await walk(page, vp, async (r) => {
    const add = page.locator(`${AC} [data-acv2='box-add']`).first();
    if (!(await add.count())) return false;
    await bothName();
    const k = (await add.getAttribute("data-k")) ?? "";
    await add.click();
    await page.waitForTimeout(900);
    const f = await page.evaluate(() => document.activeElement?.closest<HTMLElement>("[data-f]")?.dataset.f ?? "");
    const want = { reply: "weeks", method: "method", door: "door" }[k];
    L.check(`box Add · ${r.name} · ${k} lands in ${want}`, f === want, f || "nowhere");
    L.check(`box Add · How ${r.name.split(" ")[0]} works is open`, (await page.locator(`${AC} .cl262-sec[data-k='how'].is-edit`).count()) === 1, "");
    done = true;
    return true;
  });
  L.check("an unknown box was found", done, "");
  L.done(9);
});


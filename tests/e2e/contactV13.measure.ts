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

/* CL13-1 (the band — v14's compact hero card) and CL13-2 (the band → strip → next-step rhythm) are RETIRED (Contact list
   v15 §2): the header is the page-local open header, held by contactV15 CL15-1/CL15-2; the rhythm under it is the desk's
   and the section's (CL15 Phase 2/4 locks). tests/e2e/RETIRED-contact-list-v15.md. */

/* CL13-S (the numbers strip) is RETIRED with the strip (Contact list v15 §3): the desk replaces it — CL15-3.
   tests/e2e/RETIRED-contact-list-v15.md. */

/** the visible copy of a page element — every workspace page stays mounted (kept when CL13-S, which declared it, retired) */
const vis = (page: import("@playwright/test").Page, sel: string) => page.locator(`.aglist ${sel}`).filter({ visible: true }).first();

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
    /* RE-POINTED (ink shell v1): floating tabs sit 20px in from the sheet's corner — INK17 */
    L.check("CL13-9 the tab sits 20 ±1 from the main window's right and bottom", w, !!t && near(t.right, 20, 1) && near(t.bottom, 20, 1) && t.vis === "visible", JSON.stringify(t));
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
  /* RE-POINTED (ink shell v1): the chip's foot is 20px above the SHEET's foot, which is 8px above the window's — INK17 */
  L.check("CL13-10 the chip sits 24 left of the drawer and 28 off the foot", where, !!g && near(g.gap, 24, 1) && near(g.bottom, 28, 1), JSON.stringify(g));
  await chip.click();
  await page.locator(peekOn).first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const b = await peekReading(page, card, prim);
  L.check("CL13-10 a click puts the card above the chip: right edge = drawer left − 24 (±2), bottom 88", where,
    !!b && near(b.cardR, b.drawerL - 24, 2) && near(b.vh - b.cardB, 88, 2), JSON.stringify(b));
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
  /* v132: a row's centre is its "What you sent" cell, whose slot opens the edit drawer; the agent's name opens the card */
  await qrow.locator('[data-qcv="row-agent"]').click();
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
    /* REWRITTEN (v14 §3): "/" scrolls the "Your agents" panel into view (the open banner retired) */
    const ban = [...document.querySelectorAll<HTMLElement>('.aglist [data-cl14="ws"]')].find((e) => e.getBoundingClientRect().height > 0);
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
     further down (an open drawer covers what the next step reads) */
  if (h.drawer) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  else await page.keyboard.press("Backspace");
  /* the shortcut sheet lists the page's keys */
  await page.mouse.click(5, 5).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("?");
  await page.locator('[data-shell="shortcuts"]').waitFor({ timeout: 5000 }).catch(() => {});
  /* the carousel's ← → left with the carousel (v14 §1.4) */
  const sheet = await page.evaluate(() => ["contactsHk", "contactsFind"].map((id) => !!document.querySelector(`[data-shell="shortcuts"] [data-shortcut="${id}"]`)));
  L.check("CL13-11 the shortcut sheet lists H and /", "1512", sheet.every(Boolean), JSON.stringify(sheet));
  await page.keyboard.press("Escape");
  L.done(4);
});

/* ── lock 12 · loading: placeholders render while the agents are held, and the band's, the strip's and
   the first row's boxes are within 2px of their loaded boxes ── */
test("CL13-12 · loading", async ({ page }) => {
  const L = new Ledger("cl13-12");
  test.setTimeout(240_000);
  const boxes = () => page.evaluate(() => {
    const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    const b = (e?: HTMLElement) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; };
    /* REPOINTED (Contact list v15 §2): the header is the page-local open header (`[data-cl15="header"]`), not the band */
    return { band: b(v('.aglist [data-cl15="header"]')), strip: b(v('.aglist [data-cl15="desk"]')) /* v15 §3: the desk holds the strip's place */, row: b(v(".aglist .clv-row")) };
  });
  for (const vp of WIDTHS) {
    const w = `${vp.width}`;
    await page.addInitScript(() => { (window as unknown as { __SA_AGENTS_HOLD_MS?: number }).__SA_AGENTS_HOLD_MS = 12000; try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
    await openApp(page, "/agents", vp);
    const held = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>(".aglist .clv-group[data-loading]");
      const card = g?.querySelector<HTMLElement>(".clv-row");
      const vis = (s: string) => { const e = g?.querySelector<HTMLElement>(s); return e ? getComputedStyle(e).opacity : null; };
      return {
        loading: !!g, inert: !!g?.hasAttribute("inert"),
        rows: g?.querySelectorAll(".clv-row").length ?? 0,
        shimmer: card ? getComputedStyle(card).backgroundImage.includes("gradient") : false,
        perch: vis(".cl14-art"), ctl: vis(".cl13-ctl"),
        tab: !!document.querySelector('[data-ftab="housekeeping"]'),
        /* v15 §2: the open header's title holds its line box, painted over */
        bandShape: (() => { const t = g?.querySelector<HTMLElement>('[data-cl15="header"] .cl15-title'); return t ? getComputedStyle(t).backgroundImage.includes("gradient") : false; })(),
      };
    });
    /* v14 §1.4: the carousel's three placeholder cards went with it */
    L.check("CL13-12 with the agents held, the placeholders render: five rows, shimmering, inert", w,
      held.loading && held.inert && held.rows === 5 && held.shimmer && held.bandShape, JSON.stringify(held));
    L.check("CL13-12 the perched art and the pills wait for data; no Housekeeping tab", w,
      held.perch === "0" && held.ctl === "0" && !held.tab, JSON.stringify(held));
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
    return page.evaluate(() => { const c = document.querySelector<HTMLElement>(".aglist .clv-group[data-loading] .clv-row"); return c ? getComputedStyle(c).animationName : null; });
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
      ring: !!document.querySelector('.aglist [data-cl15="desk"].pgd-ring'), /* v15: step 1 rings the desk */
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
  L.check("CL13-13 a first visit shows step 1, ringing the desk", "1512", s1.title === "Your list in numbers" && s1.kick === "How this page works · 1 of 4" && s1.ring, JSON.stringify(s1));
  L.check("CL13-13 the guide is 340 wide, above the Housekeeping tab, flush with its right", "1512", s1.w === 340 && s1.above, JSON.stringify(s1));
  await page.click(`${G} [data-qcv="guide-next"]`);
  const s2 = await page.evaluate((G) => ({ title: document.querySelector(`${G} [data-qcv="guide-title"]`)?.textContent ?? null,
    /* v15: step 1's ring is on the desk — a strip selector here would pass forever, there being no strip */
    stripRing: !!document.querySelector(".pgd-ring[data-cl15='desk']") }), G);
  /* v14 §8: step 2 is "Your next step"; its ring lands on the next-step section (CL14-16 holds it) */
  L.check("CL13-13 Next moves to step 2, \"Your next step\" (the desk's ring is released)", "1512", s2.title === "Your next step" && !s2.stripRing, JSON.stringify(s2));
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
      /* REWRITTEN (v14 §3): the footer follows the "Your agents" panel (the slate workspace retired) */
      const ws = vis('.aglist [data-cl14="ws"]'), strip = vis('.aglist [data-cl15="desk"]'); /* v15 §3: the column is the desk's */
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
    L.check("CL13-14 its content box is the column's (the desk's x and width, ±1)", w, !!r.fin && !!r.col && near(r.fin[0], r.col[0], 1) && near(r.fin[1], r.col[1], 1), `${r.fin} vs ${r.col}`);
    L.check("CL13-14 it is the shared footer (Help centre, the email)", w, r.help && r.mail, JSON.stringify(r));
    await checkOverflow(page, L, w);
  }
  /* the empty state: no band, strip, carousel, list, tab or footer — v12's page, unchanged (§9) */
  await openContacts(page, AT_1512);
  await page.evaluate(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; window.dispatchEvent(new Event("sa:lh-count")); });
  await page.locator(".aglist [data-clv-empty]").first().waitFor({ timeout: 8000 }).catch(() => {});
  const e = await page.evaluate(() => {
    const n = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((x) => x.getBoundingClientRect().height > 0).length;
    return { empty: n(".aglist [data-clv-empty]"), band: n(".aglist .ph--band"), strip: n('.aglist [data-cl15="desk"]'), cz: n('.aglist [data-cz="contacts"]'),
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

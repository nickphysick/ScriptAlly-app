/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 6 — AGENTS, DISCOVER AND THE AGENT PROFILE, PA2-6 (design-refs/phone-app-v2/ screens 26–28).
 *
 * A1 the band's counts are the desktop Contact list's own for the book in scope · A2 rows lead with the right mark,
 * and their facts are the record's, with nothing drawn for a missing one · A3 a door nobody stated never reads Open ·
 * A4 Discover's cards follow the Scout's order, wear the slate band, and Add writes and Undo puts it back · A5 the
 * profile's three facts are the record's and the query's, and the foot opens the log flow with this agent · A6 the
 * colour laws and no image twice · A7 the desktop untouched (PA2-1 S9, now with /agents/discover).
 */
import { expect, test, type Page } from "@playwright/test";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { devDb } from "./devWrite";
import { Ledger, PHONES, colourSweep, imageSweep, openPhone, prime, shot, tag } from "./pa2Lib";
import { openRoute } from "./measure";
import { doorWords, howWords, replyWords } from "../../src/lib/agentsPhone";
import { DOOR_NOT_KNOWN } from "../../src/lib/agentList";
import { STAGE_NAME } from "../../src/lib/qcSummary";

test.setTimeout(600_000);
const PART = "part-6";

const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x));
async function snapshot(): Promise<Record<string, string>> {
  const { db, uid } = await devDb();
  const out: Record<string, string> = {};
  for (const c of ["agents", "activities", "scoutDecisions", "queries"]) for (const d of (await getDocs(collection(db, "users", uid, c))).docs) out[`${c}/${d.id}`] = canon(d.data());
  return out;
}
const diff = (a: Record<string, string>, b: Record<string, string>) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
async function records(): Promise<Record<string, Record<string, unknown>>> {
  const { db, uid } = await devDb();
  return Object.fromEntries((await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
}
const rowsNow = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="agents"] [data-pa="ag-row"]')].filter((r) => r.getBoundingClientRect().height > 0)
  .map((r) => ({ id: r.dataset.id!, stand: r.dataset.stand!, status: r.dataset.status!, ring: !!r.querySelector('[data-pa="ag-ring"]'), glyph: !!r.querySelector("svg, [data-status], .pa-disc"),
    f1: r.querySelector('[data-pa="ag-f1"]')?.textContent ?? null, f2: r.querySelector('[data-pa="ag-f2"]')?.textContent ?? null, text: r.textContent ?? "" })));

for (const vp of PHONES) {
  test(`PA2-6 · Agents · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `agents-${tag(vp)}`);
    /* A3 needs an agent whose door nobody stated, and the account has none: one is seeded from an existing record and
       removed in the same run, by id (the snapshot below proves the account is back) */
    const SEED = "pa2-door-unstated";
    const before = await snapshot();
    { const { db, uid } = await devDb(); const r0 = await records(); const src = Object.values(r0).find((a) => a.id !== SEED)!;
      const { id: _id, ...rest } = src; void _id;
      await setDoc(doc(db, "users", uid, "agents", SEED), { ...rest, id: SEED, name: "Pat Unstated", agency: "Unstated & Co", submissionStatus: "Unknown", notePreview: "" }); }
    try {
    const rec = await records();
    /* A1 — the desktop Contact list's own counts, for the same stored book */
    await prime(page);
    await openRoute(page, "/agents", { width: 1512, height: 900 });
    await page.locator('[data-cl251="cell"][data-k="none"]:visible').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(2500);
    const desk = await page.evaluate(() => {
      const n = (k: string) => Number((document.querySelector(`[data-cl251="cell"][data-k="${k}"]`)?.textContent ?? "").replace(/^\D+/, "").match(/^\d+/)?.[0] ?? NaN);
      return { total: Number(document.querySelector('[data-cl25="count-n"]')?.textContent ?? NaN), none: n("none") };
    });
    await openPhone(page, "/agents", vp);
    await page.locator('[data-pa="agents"] [data-pa="ag-row"]').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(800);
    const band = await page.evaluate(() => ({ onlist: Number(document.querySelector('[data-pa="ag-onlist"]')?.textContent ?? NaN), toq: Number(document.querySelector('[data-pa="ag-toq"]')?.textContent ?? NaN) }));
    L.check("pop", `${tag(vp)} the desktop counts were read`, Number.isFinite(desk.total) && Number.isFinite(desk.none), JSON.stringify(desk));
    L.check("A1", `${tag(vp)} on your list · to query are the Contact list's (agents on file · not queried)`, band.onlist === desk.total && band.toq === desk.none, `${JSON.stringify(band)} vs ${JSON.stringify(desk)}`);
    const all = await rowsNow(page);
    L.check("pop", `${tag(vp)} rows`, all.length === band.onlist, `${all.length} vs ${band.onlist}`);
    /* the chips filter; the band does not follow them */
    await page.locator('[data-pa="ag-chip"]:visible').nth(1).click(); await page.waitForTimeout(300);
    const toq = await rowsNow(page);
    const bandAfter = Number(await page.locator('[data-pa="ag-toq"]').first().textContent());
    L.check("A1", `${tag(vp)} To query shows the not-queried rows and the band does not follow the chip`, toq.length === band.toq && toq.every((r) => r.stand === "none") && bandAfter === band.toq, `${toq.length} rows, band ${bandAfter}`);
    await page.locator('[data-pa="ag-chip"]:visible').nth(0).click(); await page.waitForTimeout(300);

    /* A2 — the right mark, and the record's facts, nothing drawn for a missing one */
    let notq = 0, qd = 0, gaps = 0;
    for (const r of all) {
      const a = rec[r.id];
      if (!a) { L.check("A2", `${tag(vp)} ${r.id} is an agent on the account`, false, ""); continue; }
      L.check("A2", `${tag(vp)} ${r.id}: no dash and no "Unknown" anywhere on the row`, !/[—–]|\bUnknown\b/.test(r.text), r.text);
      if (r.stand === "none") {
        notq++;
        const want = [replyWords(a.responseTimeWeeks as number), howWords(a.submissionMethod as string)].filter(Boolean);
        if (want.length < 2) gaps++;
        L.check("A2", `${tag(vp)} ${r.id}: not queried leads with the dotted ring`, r.ring, "");
        L.check("A2", `${tag(vp)} ${r.id}: the reply time and the route are the record's`, JSON.stringify([r.f1, r.f2].filter(Boolean)) === JSON.stringify(want), `${JSON.stringify([r.f1, r.f2])} vs ${JSON.stringify(want)}`);
      } else {
        qd++;
        L.check("A2", `${tag(vp)} ${r.id}: a queried agent leads with its status glyph, not the ring`, !r.ring && !!r.status, r.status);
        L.check("A2", `${tag(vp)} ${r.id}: the status in words over "Day n"`, r.f1 === (STAGE_NAME as Record<string, string>)[r.status] && (r.f2 === null || /^Day \d+$/.test(r.f2)), `${r.f1} / ${r.f2}`);
      }
    }
    L.check("pop", `${tag(vp)} both kinds of row, and a not-queried agent with a fact missing`, notq > 0 && qd > 0 && gaps > 0, `${notq} not queried, ${qd} queried, ${gaps} with a gap`);

    /* A3 — a door nobody stated: every profile's door line, against the record */
    const unknown = all.filter((r) => { const s = rec[r.id]?.submissionStatus; return s !== "Open" && s !== "Closed"; });
    const probe = [...unknown.slice(0, 2), ...all.filter((r) => rec[r.id]?.submissionStatus === "Open").slice(0, 1)];
    L.check("pop", `${tag(vp)} an agent whose door nobody stated`, unknown.length > 0, `${unknown.length}`);
    for (const r of probe) {
      await page.locator(`[data-pa="agents"] [data-pa="ag-row"][data-id="${r.id}"]`).evaluate((e) => (e as HTMLElement).scrollIntoView({ block: "center" }));
      await page.locator(`[data-pa="agents"] [data-pa="ag-row"][data-id="${r.id}"]`).click(); await page.waitForTimeout(700);
      const door = (await page.locator('[data-pa="ag-profile"] [data-pa="ag-door"]').first().textContent()) ?? "";
      const want = doorWords(rec[r.id] as never);
      L.check("A3", `${tag(vp)} ${r.id} (${String(rec[r.id]?.submissionStatus)}): the door line`, door === want && (rec[r.id]?.submissionStatus === "Open" || (door === DOOR_NOT_KNOWN && !/^Open/.test(door))), `"${door}" vs "${want}"`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }

    /* A5 — the profile: three facts, and the foot */
    const pick = [all.find((r) => r.stand === "none"), all.find((r) => r.stand !== "none")].filter(Boolean) as typeof all;
    for (const r of pick) {
      const a = rec[r.id];
      await page.locator(`[data-pa="agents"] [data-pa="ag-row"][data-id="${r.id}"]`).evaluate((e) => (e as HTMLElement).scrollIntoView({ block: "center" }));
      await page.locator(`[data-pa="agents"] [data-pa="ag-row"][data-id="${r.id}"]`).click(); await page.waitForTimeout(800);
      const head = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-pa="ag-profile"] [data-pa="ag-stats"] > div')].map((d) => [d.dataset.k!, d.querySelector("b")?.textContent ?? ""])));
      const rw = replyWords(a.responseTimeWeeks as number);
      const hw = howWords(a.submissionMethod as string);
      L.check("A5", `${tag(vp)} ${r.id}: reply time is the record's`, head.reply === (rw ? rw.replace(" weeks", " wks").replace(" week", " wk") : "Not stated"), `${head.reply} vs ${rw}`);
      L.check("A5", `${tag(vp)} ${r.id}: submissions is the record's`, head.how === (hw ? hw.replace("By ", "").replace(/^./, (c) => c.toUpperCase()) : "Not stated"), `${head.how} vs ${hw}`);
      L.check("A5", `${tag(vp)} ${r.id}: your query is the row's status, or Not yet`, head.query === (r.stand === "none" ? "Not yet" : (STAGE_NAME as Record<string, string>)[r.status]), `${head.query} vs ${r.status || "none"}`);
      const foot = page.locator('[data-pa="ag-profile"] [data-pa="ag-foot"]').first();
      const mode = await foot.getAttribute("data-mode");
      const first = String(a.name || a.agency).trim().split(/\s+/)[0];
      L.check("A5", `${tag(vp)} ${r.id}: the foot names the agent and fits the standing`, mode === (r.stand === "none" ? "log" : "open") && ((await foot.textContent()) ?? "").endsWith(first), `${mode} "${await foot.textContent()}"`);
      if (vp.width === 390) await shot(page, PART, `28-profile-${r.stand === "none" ? "notq" : "queried"}-${tag(vp)}`);
      if (mode === "log") {
        const b4 = await snapshot();
        await foot.click(); await page.waitForTimeout(1200);
        /* the flow's live card names the CHOSEN agent; the picker below it lists them all, so its text proves nothing */
        const live = page.locator('.pa-flow:visible [data-pf="live-name"]').first();
        const txt = (await live.count()) ? ((await live.textContent()) ?? "").trim() : "";
        L.check("A5", `${tag(vp)} ${r.id}: the foot opens the log flow with ${a.name || a.agency} already chosen`, txt === String(a.name || a.agency).trim(), `"${txt}"`);
        await page.locator('[data-pf="close"], [data-qad-drawer]:visible button[aria-label="Close"]').first().click().catch(() => {}); await page.waitForTimeout(400);
        const d = page.getByRole("button", { name: /^Discard$/ }); if (await d.count()) { await d.first().click(); await page.waitForTimeout(300); }
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
        L.check("A5", `${tag(vp)} opening the log flow wrote nothing`, diff(b4, await snapshot()).length === 0, diff(b4, await snapshot()).slice(0, 3).join(", "));
      } else {
        await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      }
    }

    /* A6 — the colour laws, list and profile */
    const col = await colourSweep(page, { roots: ".pa-band, .pa-agents, .pa-tabbar" });
    L.check("A6", `${tag(vp)} Agents: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("A6", `${tag(vp)} Agents: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `26-agents-${tag(vp)}`);
    await page.locator(`[data-pa="agents"] [data-pa="ag-row"]`).first().click(); await page.waitForTimeout(800);
    const pcol = await colourSweep(page, { roots: ".pa-agsheet" });
    L.check("A6", `${tag(vp)} the profile: white on the navy head`, pcol.bad.length === 0 && pcol.navy > 0, pcol.bad.slice(0, 3).join(" | ") || `navy ${pcol.navy}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    } finally {
      const { db, uid } = await devDb(); await deleteDoc(doc(db, "users", uid, "agents", SEED));
    }
    const after = await snapshot();
    expect(diff(before, after), "the account has been changed: restore by id").toEqual([]);
    L.done(40);
  });

  test(`PA2-6 · Discover · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `discover-${tag(vp)}`);
    /* A4 — the gate: while DISCOVER_LIVE is off, the phone says what the desktop says — the Scout is coming — and puts up
       no queue and no "{n} new" */
    await openPhone(page, "/agents/discover", vp);
    await page.locator('[data-pa="d-soon"]').first().waitFor({ timeout: 20_000 });
    L.check("A4", `${tag(vp)} gate off: the coming-soon face, no cards`, (await page.locator('[data-pa="discover"] [data-pa="d-card"]').count()) === 0 && (await page.locator('[data-pa="d-soon"]:visible').count()) === 1, "");
    L.check("A4", `${tag(vp)} gate off: no "{n} new" on the switch`, (await page.locator('[data-pa="disc-new"]').count()) === 0, "");
    await shot(page, PART, `27-discover-soon-${tag(vp)}`);
    await openRoute(page, "/agents/discover", { width: 1512, height: 900 });
    await page.waitForTimeout(2500);
    L.check("A4", `${tag(vp)} gate off: the desktop says the same (its coming-soon face)`, (await page.locator('[data-dv1="coming-soon"]:visible').count()) === 1, "");
    /* the live face, over the account's real data, through the desktop's own dev review aid */
    await page.addInitScript(() => { (window as unknown as { __SA_DV_LIVE: number }).__SA_DV_LIVE = 1; });
    await openPhone(page, "/agents/discover", vp);
    await page.locator('[data-pa="d-card"]').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(800);
    const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="discover"] [data-pa="d-card"]')].filter((c) => c.getBoundingClientRect().height > 0).map((c) => ({
      id: c.dataset.id!, band: getComputedStyle(c.querySelector('[data-pa="d-band"]')!).backgroundColor, bandText: c.querySelector('[data-pa="d-band"]')?.textContent ?? "", door: c.querySelector('[data-pa="d-door"]')?.textContent ?? "", text: c.textContent ?? "" })));
    const fresh = Number((await page.locator('[data-pa="disc-new"]').first().textContent())?.match(/\d+/)?.[0] ?? NaN);
    L.check("pop", `${tag(vp)} Discover cards`, cards.length > 1, String(cards.length));
    L.check("A4", `${tag(vp)} the switch's "{n} new" is the number of cards the Scout put up`, fresh === cards.length, `${fresh} vs ${cards.length}`);
    /* the Scout's own order: its queue, read off the desktop Discover page at 1512 below */
    for (const c of cards) {
      L.check("A4", `${tag(vp)} ${c.id}: the slate band, "Verified by the Scout"`, c.band === "rgb(215, 224, 232)" && c.bandText.includes("Verified by the Scout"), c.band);
      L.check("A4", `${tag(vp)} ${c.id}: no dash and no "Unknown"; the door never Open for a door not stated`, !/[—–]|\bUnknown\b/.test(c.text) && (c.door === "Open to submissions" || c.door === "Closed to submissions" || c.door === DOOR_NOT_KNOWN), c.door);
    }
    const col = await colourSweep(page, { roots: ".pa-band, .pa-agents, .pa-tabbar" });
    L.check("A6", `${tag(vp)} Discover: white on navy, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("A6", `${tag(vp)} Discover: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `27-discover-${tag(vp)}`);

    if (vp.width === 390) {
      /* A4 — Add writes, and Undo puts the account back exactly */
      const b4 = await snapshot();
      const target = cards[0];
      await page.locator(`[data-pa="discover"] [data-pa="d-card"][data-id="${target.id}"] [data-pa="d-add"]`).click();
      await page.locator(".pa-snack").first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(1200);
      const mid = await snapshot();
      const added = diff(b4, mid);
      L.check("A4", `${tag(vp)} Add writes the agent and the decision`, added.some((k) => k.startsWith("agents/")) && added.some((k) => k === `scoutDecisions/${target.id}`), added.join(", "));
      const undo = page.locator(".pa-snack button").filter({ hasText: /Undo/ }).first();
      L.check("A4", `${tag(vp)} the snackbar offers Undo`, (await undo.count()) > 0, "");
      if (await undo.count()) await undo.click();
      await page.waitForTimeout(2500);
      const after = await snapshot();
      L.check("A4", `${tag(vp)} Undo puts the account back exactly`, diff(b4, after).length === 0, diff(b4, after).join(", "));
      expect(diff(b4, after), "the account has been changed: restore by id before anything else").toEqual([]);
      /* the order: the desktop Discover's queue for the same stored book */
      await openRoute(page, "/agents/discover", { width: 1512, height: 900 });
      await page.waitForTimeout(4000);
      const deskIds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-dv1="lead"], [data-dv1="queue-row"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.id!));
      if (deskIds.length) L.check("A4", `${tag(vp)} the cards follow the Scout's order (the desktop Discover's)`, JSON.stringify(deskIds.filter((id) => cards.some((c) => c.id === id))) === JSON.stringify(cards.map((c) => c.id).filter((id) => deskIds.includes(id))), `${deskIds.slice(0, 4)} vs ${cards.slice(0, 4).map((c) => c.id)}`);
      else L.check("pop", `${tag(vp)} the desktop Discover's queue was read`, false, "no ids on the desktop page");
    }
    L.done(vp.width === 390 ? 14 : 8);
  });
}

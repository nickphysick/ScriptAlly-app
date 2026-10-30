/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — THE FLOWS AND THE CELEBRATION, PA2-4 (design-refs/phone-app-v2/ screens 13–23).
 *
 * ⚠️ THESE WRITE AND UNDO ON THE HARNESS ACCOUNT, as QM1 L10 does. Every writing case snapshots the account first and
 * compares it, document by document, after its Undo; a failure to undo fails loudly naming the query, and the report
 * says what to restore. Nothing navigates between a save and its Undo — the snackbar IS the undo.
 *
 * F1 the questions walked are the journey's own steps, in order · F2 the live card fills each slot and a filled slot
 * returns to its question · F3 the check card lists every answer and a row returns to it with the answer kept · F4 a
 * full log then Undo leaves the account as it was · F5 the celebration on a partial or full request, never a pass, with
 * Undo on top · F6 the stamp's words match the response · F7 reduced motion: the stamp in place, nothing running ·
 * F8 the colour laws (burgundy only on the stamp) and no image twice · F9 the desktop untouched (PA2-1 S9, re-run).
 */
import { expect, test, type Page } from "@playwright/test";
import { collection, getDocs } from "firebase/firestore";
import { devDb } from "./devWrite";
import { Ledger, PHONES, colourSweep, imageSweep, openPhone, shot, tag } from "./pa2Lib";

test.setTimeout(600_000);
const PART = "part-4";

/** a document as text with its keys sorted, at every depth — a rewritten document comes back in another key order */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x));
/** the account as documents: every query, feed row, task flag and task, plus one query's own log */
async function snapshot(queryId?: string): Promise<Record<string, string>> {
  const { db, uid } = await devDb();
  const out: Record<string, string> = {};
  for (const c of ["queries", "activities", "taskFlags", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) out[`${c}/${d.id}`] = canon(d.data());
  }
  if (queryId) for (const d of (await getDocs(collection(db, "users", uid, "queries", queryId, "activity"))).docs) out[`log/${d.id}`] = canon(d.data());
  return out;
}
const diff = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => a[k] !== b[k]).map((k) => {
    if (!a[k] || !b[k]) return `${k} ${a[k] ? "removed" : "added"}`;
    const A = JSON.parse(a[k]) as Record<string, unknown>, B = JSON.parse(b[k]) as Record<string, unknown>;
    const f = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((x) => JSON.stringify(A[x]) !== JSON.stringify(B[x]));
    return `${k} {${f.map((x) => `${x}: ${JSON.stringify(A[x])} → ${JSON.stringify(B[x])}`).join("; ")}}`;
  });
};

/** the shell's own record of the journey: every step title, and where the walk stands */
const flowState = (page: Page) => page.evaluate(() => {
  const f = document.querySelector<HTMLElement>(".pa-flow");
  const st = f?.querySelector<HTMLElement>("[data-pf-step]");
  return {
    open: !!f,
    steps: (f?.dataset.pfSteps ?? "").split("␟").filter(Boolean),
    at: st?.dataset.pfStep ?? (f?.querySelector('[data-pf="check"]') ? "CHECK" : null),
    question: f?.querySelector('[data-pf="question"]')?.textContent ?? null,
  };
});
const cont = async (page: Page) => { await page.locator('[data-pf="primary"]').click({ timeout: 8000 }); await page.waitForTimeout(500); };
const undoNow = async (page: Page, why: string, qid: string) => {
  const ok = await page.locator("[data-qad-undo]").first().click({ timeout: 6000 }).then(() => true, () => false);
  expect(ok, `UNDO NOT PRESSED after ${why}: the harness account has been changed — restore query ${qid}`).toBe(true);
  await page.waitForTimeout(2500);
};
const closeFlow = async (page: Page) => {
  if (!(await page.locator(".pa-flow").count())) return;
  await page.locator('[data-pf="close"]').click().catch(() => {}); await page.waitForTimeout(300);
  const d = page.getByRole("button", { name: /^Discard$/ });
  if (await d.count()) { await d.first().click(); await page.waitForTimeout(300); }
};
const openSheetFor = async (page: Page, sel: string) => {
  await page.goto("/queries"); await page.locator('[data-pa="band"]').first().waitFor(); await page.waitForTimeout(1200);
  await page.locator('[data-qm1="chip"][data-key="all"]').click(); await page.waitForTimeout(300);
  const row = page.locator(`${sel}`).first();
  const id = await row.getAttribute("data-id");
  await row.locator(".pa-row").click(); await page.locator('.pa-qsheet [data-qc149c="card"]').waitFor(); await page.waitForTimeout(700);
  return id!;
};

for (const vp of PHONES) {
  test(`PA2-4 · the flows · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `flows-${tag(vp)}`);
    await openPhone(page, "/queries", vp);

    /* ── log a query: F1, F2, F3 (walked and discarded — nothing saved here) ── */
    await page.locator('[data-pa="plus"]').click(); await page.waitForTimeout(600);
    await page.locator('[data-pa="plus-sent"]').click(); await page.locator(".pa-flow").waitFor(); await page.waitForTimeout(800);
    const s0 = await flowState(page);
    L.check("F1", `${tag(vp)} log opens on its first step`, s0.at === s0.steps[0] && s0.question === "Who did you query?", JSON.stringify(s0));
    /* ⚠️ ADDED (phone fixes v1): opening on the right STEP said nothing about where the screen was. The agent field's
       autofocus scrolled the flow down to it, past the card. Red on the base build (ba0513b6): the sheet opens scrolled. */
    const at0 = await page.evaluate(() => { const sh = document.querySelector<HTMLElement>('.pa-flow [data-pf="sheet"]'); const c = document.querySelector('.pa-flow [data-pf="live"]')?.getBoundingClientRect(); return { sheet: sh?.scrollTop ?? -1, cardTop: c ? Math.round(c.top) : -1, focus: document.activeElement?.tagName ?? null }; });
    L.check("F1", `${tag(vp)} log opens at the top, the card in view, nothing focused`, at0.sheet === 0 && at0.cardTop >= 0 && at0.focus !== "INPUT", JSON.stringify(at0));
    await page.locator('[data-qad-agent]').nth(1).dispatchEvent("mousedown"); await page.waitForTimeout(600);
    const all = (await flowState(page)).steps;
    L.check("pop", `${tag(vp)} log has its five steps once an agent is chosen`, all.length >= 4, all.join(" | "));
    const walked: string[] = [];
    for (let i = 0; i < all.length + 1; i++) {
      const s = await flowState(page);
      walked.push(s.at ?? "?");
      if (s.at === "CHECK") break;
      await cont(page);
    }
    L.check("F1", `${tag(vp)} log: the questions walked are the journey's own steps, in order, then the check`, JSON.stringify(walked) === JSON.stringify([...all, "CHECK"]), JSON.stringify(walked));
    /* F2 — every answered step has a filled slot on the live card, and tapping one returns to its question */
    const slots = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.pa-flow .pf-lcf.on')].map((e) => Number(e.dataset.i)));
    L.check("F2", `${tag(vp)} the live card fills a slot for each answer after the first`, slots.length === all.length - 1, JSON.stringify(slots));
    await page.locator('.pa-flow .pf-lcf.on[data-i="1"]').click(); await page.waitForTimeout(400);
    const back = await flowState(page);
    L.check("F2", `${tag(vp)} a filled slot returns to its question`, back.at === all[1], String(back.at));
    await shot(page, PART, `15-log-what-${tag(vp)}`);
    /* F3 — the check card lists every answer; a row returns to it with the answer kept */
    for (let i = 1; i < all.length + 1 && (await flowState(page)).at !== "CHECK"; i++) await cont(page);
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.pa-flow [data-pf="check-row"]')].map((r) => ({ k: r.querySelector(".k")?.textContent, v: r.querySelector(".v")?.textContent })));
    L.check("F3", `${tag(vp)} the check card lists every answer`, rows.length === all.length && rows.every((r, i) => r.k === all[i] && !!r.v), JSON.stringify(rows.map((r) => r.k)));
    await shot(page, PART, `17-log-check-${tag(vp)}`);
    const before = rows[1]?.v;
    await page.locator('.pa-flow [data-pf="check-row"][data-i="1"]').click(); await page.waitForTimeout(400);
    const at = await flowState(page);
    const keptOn = await page.locator(".pa-flow [data-pf-step] .qad-chip.on, .pa-flow [data-pf-step] .qad-rad.on").count();
    L.check("F3", `${tag(vp)} a check row returns to its question, the answer kept`, at.at === all[1] && keptOn > 0, `${at.at} on=${keptOn}`);
    for (let i = 0; i < 6 && (await flowState(page)).open && (await flowState(page)).at !== "CHECK"; i++) await cont(page);
    const after = await page.locator('.pa-flow [data-pf="check-row"][data-i="1"] .v').textContent({ timeout: 3000 }).catch(() => "(the flow closed)");
    L.check("F3", `${tag(vp)} back at the check, the answer is unchanged`, after === before, `${before} → ${after}`);
    const col = await colourSweep(page, { roots: ".pa-flow" });
    L.check("F8", `${tag(vp)} the flow: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("F8", `${tag(vp)} the flow: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await closeFlow(page);

    if (vp.width === 390) {
      /* ── F4: a full log, then Undo, leaves the account as it was, document by document ── */
      const b4 = await snapshot();
      await page.locator('[data-pa="plus"]').click(); await page.waitForTimeout(600);
      await page.locator('[data-pa="plus-sent"]').click(); await page.locator(".pa-flow").waitFor(); await page.waitForTimeout(700);
      await page.locator('[data-qad-agent]').nth(1).dispatchEvent("mousedown"); await page.waitForTimeout(600);
      for (let i = 0; i < 8 && (await flowState(page)).at !== "CHECK"; i++) await cont(page);
      await page.locator('[data-pf="primary"]').click(); await page.waitForTimeout(1500);
      const made = diff(b4, await snapshot());
      L.check("F4", `${tag(vp)} the log wrote something`, made.length > 0, made.slice(0, 4).join(", "));
      await shot(page, PART, `18-snackbar-${tag(vp)}`);
      await undoNow(page, "the log", made.find((k) => k.startsWith("queries/")) ?? "(new query)");
      let left: string[] = [];
      for (let t = 0; t < 8; t++) { left = diff(b4, await snapshot()); if (!left.length) break; await page.waitForTimeout(1000); }
      L.check("F4", `${tag(vp)} after Undo the account is as it was, document by document`, left.length === 0, left.slice(0, 6).join(", "));
    }

    /* the no-undo mutant stops here: past this point its writes could not be put back by deleting what was added */
    if (process.env.PA2_ONLY === "F4") { L.done(2); return; }
    /* ── F5, F6, F8: a partial request cheers with the right stamp and Undo on top; a pass never cheers ── */
    for (const [k, stamp, cheers] of [["partial", "Partial requested", true], ["full", "Full requested", true], ["pass", null, false]] as const) {
      if (vp.width !== 390 && k !== "partial") continue;
      const qid = await openSheetFor(page, '[data-qm1="row"][data-where="agent"][data-status="Queried"]');
      const b5 = await snapshot(qid);
      await page.locator('.pa-qsheet [data-qc149c="next-second"], .pa-qsheet [data-qc149c="next-primary"]').filter({ hasText: /replied|response/i }).first().click();
      await page.locator(".pa-flow").waitFor(); await page.waitForTimeout(600);
      await page.locator(`.pa-flow [data-qad-chip="${k}"]`).click(); await page.waitForTimeout(300);
      for (let i = 0; i < 8 && (await flowState(page)).at !== "CHECK"; i++) await cont(page);
      await page.locator('[data-pf="primary"]').click();
      const shown = await page.locator('[data-pa="cele"]').waitFor({ timeout: 8000 }).then(() => true, () => false);
      L.check("F5", `${tag(vp)} ${k}: ${cheers ? "the celebration shows" : "no celebration"}`, shown === cheers, String(shown));
      if (shown) {
        const words = await page.locator('[data-pa="cele-stamp"]').textContent();
        L.check("F6", `${tag(vp)} ${k}: the stamp reads "${stamp}"`, words === stamp, String(words));
        /* the heading and the stamp are Special Elite — the portal once sat outside the phone's tokens and fell to the sans */
        const faces = await page.evaluate(() => ["h2.pa-celh", '[data-pa="cele-stamp"]', ".pa-ccnm"].map((q) => getComputedStyle(document.querySelector(q)!).fontFamily));
        L.check("F6", `${tag(vp)} ${k}: the heading, the stamp and the agent are Special Elite`, faces.every((f) => /Special Elite/.test(f)), JSON.stringify(faces));
        await page.locator("[data-qad-undo]").first().waitFor({ timeout: 6000 }).catch(() => {});
        const top = await page.evaluate(() => { const u = document.querySelector<HTMLElement>("[data-qad-undo]"); if (!u) return null; const b = u.getBoundingClientRect(); const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!h && u.contains(h); });
        L.check("F5", `${tag(vp)} ${k}: Undo is on top of the celebration`, top === true, String(top));
        const c = await colourSweep(page, { allowBurgundy: true, roots: '[data-pa="cele"]' });
        L.check("F8", `${tag(vp)} ${k}: the celebration's colours (burgundy only on the stamp)`, c.bad.length === 0 && c.navy > 0, c.bad.slice(0, 3).join(" | ") || `navy ${c.navy}`);
        const burg = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="cele"] *')].filter((e) => /124, 58, 42/.test(getComputedStyle(e).color) || /124, 58, 42/.test(getComputedStyle(e).borderTopColor)).map((e) => e.dataset.pa ?? e.className));
        L.check("F8", `${tag(vp)} ${k}: the only burgundy is the stamp`, burg.length === 1 && burg[0] === "cele-stamp", JSON.stringify(burg));
        if (k === "partial") await shot(page, PART, `20-celebration-${tag(vp)}`);
      }
      await undoNow(page, `the ${k}`, qid);
      if (shown) { await page.locator('[data-pa="cele-done"]').click().catch(() => {}); await page.waitForTimeout(300); }
      let left: string[] = [];
      for (let t = 0; t < 8; t++) { left = diff(b5, await snapshot(qid)); if (!left.length) break; await page.waitForTimeout(1000); }
      L.check("F4", `${tag(vp)} ${k}: after Undo the account is as it was`, left.length === 0, left.slice(0, 6).join(", "));
    }
    L.done(vp.width === 390 ? 25 : 13);
  });
}

/* ── F7: reduced motion shows the stamp in place, with nothing running ── */
test("PA2-4 · reduced motion · 390x844", async ({ page }) => {
  const L = new Ledger(PART, "reduced-390x844");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPhone(page, "/queries", PHONES[0], { motion: true });
  const qid = await openSheetFor(page, '[data-qm1="row"][data-where="agent"][data-status="Queried"]');
  const b = await snapshot(qid);
  await page.locator('.pa-qsheet [data-qc149c="next-second"], .pa-qsheet [data-qc149c="next-primary"]').filter({ hasText: /replied|response/i }).first().click();
  await page.locator(".pa-flow").waitFor(); await page.waitForTimeout(600);
  await page.locator('.pa-flow [data-qad-chip="full"]').click(); await page.waitForTimeout(300);
  for (let i = 0; i < 8 && (await flowState(page)).at !== "CHECK"; i++) await cont(page);
  await page.locator('[data-pf="primary"]').click();
  const shown = await page.locator('[data-pa="cele"]').waitFor({ timeout: 8000 }).then(() => true, () => false);
  L.check("pop", "the celebration shows", shown, "");
  if (shown) {
    const st = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-pa="cele-stamp"]')!;
      const conf = document.querySelector<HTMLElement>('[data-pa="confetti"]')!;
      return { running: s.getAnimations().length + (document.querySelector<HTMLElement>('[data-pa="cele-card"]')!.getAnimations().length), opacity: getComputedStyle(s).opacity, transform: getComputedStyle(s).transform, conf: getComputedStyle(conf).display };
    });
    L.check("F7", "reduced motion: no animation on the card or the stamp", st.running === 0, JSON.stringify(st));
    L.check("F7", "reduced motion: the stamp is shown in place, rotated", st.opacity === "1" && st.transform !== "none", JSON.stringify(st));
    L.check("F7", "reduced motion: no confetti", st.conf === "none", st.conf);
  }
  await undoNow(page, "the full request (reduced motion)", qid);
  if (shown) await page.locator('[data-pa="cele-done"]').click().catch(() => {});
  let left: string[] = [];
  for (let t = 0; t < 8; t++) { left = diff(b, await snapshot(qid)); if (!left.length) break; await page.waitForTimeout(1000); }
  L.check("F4", "after Undo the account is as it was", left.length === 0, left.slice(0, 6).join(", "));
  L.done(4);
});

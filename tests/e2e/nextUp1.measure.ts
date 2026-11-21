/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NEXT UP v1 — the NU1 locks, measured on the rendered Dashboard (ref design-refs/next-up-v1.html), at 1512 × 982 and
 * 1280 × 720, on the emulator's harness account. Each kind of task is put in the lead by the card's dev review aid
 * (`window.__SA_NEXT_LEAD`; the plan and its order are untouched), on the first seeded book that has one:
 *
 *   npm run e2e:emu -- tests/e2e/nextUp1.measure.ts
 *
 * P the kind is present and leads · R the five rows at the same offsets on every tracked card · A the first stop's
 * centre under the seal's, the last stop's right edge under the number's (2px) · W no text wraps or runs out of the
 * card · E a 40-character name and agency leave the height alone · B each button opens the slide-out at its step, and
 * closing it without confirming writes nothing (the activity log is counted before and after).
 */
import { test, expect, type Page, type Request } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/next-up-v1-1";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 720 }] as const;
const BOOKS = ["seed-ms-1", "seed-ms-2"] as const;
/* "other": housekeeping; "ready" and "coming" lead only once the work groups are dropped (the Dashboard's own aid) */
const KINDS = [
  { kind: "partial" }, { kind: "full" }, { kind: "revision" }, { kind: "nudge" }, { kind: "quiet" }, { kind: "offer" }, { kind: "tell" },
  { kind: "other" },
  { kind: "other", as: "ready", drop: ["req", "nudge", "quiet", "house"] },
  { kind: "coming", drop: ["req", "nudge", "quiet", "house", "ready"] },
] as const;
const TRACKED = new Set(["partial", "full", "revision", "nudge", "quiet", "offer", "coming"]);
/* what each kind's filled (and outline) button must open: the drawer mode and the step's title in the panel */
const OPENS: Record<string, { mode: string; sec?: string }[]> = {
  partial: [{ mode: "sent" }], full: [{ mode: "sent" }], revision: [{ mode: "sent" }],
  nudge: [{ mode: "nudge" }],
  quiet: [{ mode: "close" }, { mode: "nudge" }],
  offer: [{ mode: "offer", sec: "Your decision" }],
  tell: [{ mode: "offer", sec: "The others" }],
};

const EMU = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
async function countDocs(path: string): Promise<number> {
  let n = 0; let token = "";
  for (let i = 0; i < 50; i++) {
    const r = await fetch(`${EMU}/${path}?pageSize=300&mask.fieldPaths=__none__${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) });
    const j = (await r.json()) as { documents?: unknown[]; nextPageToken?: string };
    n += j.documents?.length ?? 0;
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return n;
}

/* The seed has an offer (seed-query-12) but no "tell the other agents" task: that card is derived (lib/db) only once the
   offer's step carries `tellLater` and other queries are marked with this offer and not yet told. This sets both through
   the emulator's admin REST and puts every field back as it was in a `finally` — a measurement that writes restores. */
type FsVal = { stringValue?: string; booleanValue?: boolean; timestampValue?: string; nullValue?: null };
type FsDoc = { name: string; fields?: Record<string, FsVal> };
const OFFER_Q = "seed-query-12";
async function fsList(path: string): Promise<FsDoc[]> {
  const out: FsDoc[] = []; let token = "";
  for (let i = 0; i < 50; i++) {
    const r = await fetch(`${EMU}/${path}?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) });
    const j = (await r.json()) as { documents?: FsDoc[]; nextPageToken?: string };
    out.push(...(j.documents ?? []));
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out;
}
async function fsPatch(name: string, fields: Record<string, FsVal | undefined>) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const body = { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) };
  const r = await fetch(`http://127.0.0.1:8085/v1/${name}?${mask}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`PATCH ${name}: ${r.status} ${await r.text()}`);
}
async function seedTell(): Promise<{ restore: () => Promise<void>; marked: number }> {
  const acts = await fsList(`users/${UID}/activities`);
  const qs = await fsList(`users/${UID}/queries`);
  const offer = qs.find((d) => d.name.endsWith(`/${OFFER_Q}`));
  if (!offer) throw new Error(`seedTell: no query ${OFFER_Q}`);
  /* the offer's own rung, or — the seed records this offer's status without one — a probe rung, deleted after */
  let rung = acts.find((d) => d.fields?.queryId?.stringValue === OFFER_Q && d.fields?.resultingStatus?.stringValue === "Offer");
  let created: string | null = null;
  if (!rung) {
    const id = "nu1-tell-probe";
    const on = String(offer.fields?.offerDate?.stringValue ?? offer.fields?.offerDate?.timestampValue ?? offer.fields?.lastStatusChange?.stringValue ?? new Date().toISOString());
    const r = await fetch(`${EMU}/users/${UID}/activities?documentId=${id}`, { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ fields: { id: { stringValue: id }, queryId: { stringValue: OFFER_Q }, userId: { stringValue: UID }, resultingStatus: { stringValue: "Offer" }, activityType: { stringValue: "status_change" }, date: { stringValue: on }, description: { stringValue: "NU1 probe" } } }) });
    if (!r.ok) throw new Error(`seedTell: probe rung ${r.status} ${await r.text()}`);
    created = `projects/demo-scriptally/databases/(default)/documents/users/${UID}/activities/${id}`;
    rung = { name: created, fields: {} };
  }
  const ms = offer.fields?.manuscriptId?.stringValue;
  const live = qs.filter((d) => !d.name.endsWith(`/${OFFER_Q}`) && d.fields?.manuscriptId?.stringValue === ms
    && ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent"].includes(d.fields?.status?.stringValue ?? "")).slice(0, 6);
  const before = { rung: rung.fields?.tellLater, qs: live.map((d) => ({ name: d.name, ref: d.fields?.offerRefQueryId, told: d.fields?.offerTold })) };
  const restore = async () => {
    if (created) await fetch(`http://127.0.0.1:8085/v1/${created}`, { method: "DELETE", headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(15_000) });
    else await fsPatch(rung!.name, { tellLater: before.rung });
    for (const q of before.qs) await fsPatch(q.name, { offerRefQueryId: q.ref, offerTold: q.told });
  };
  try {
    await fsPatch(rung.name, { tellLater: { booleanValue: true } });
    for (const q of live) await fsPatch(q.name, { offerRefQueryId: { stringValue: OFFER_Q }, offerTold: { booleanValue: false } });
  } catch (e) { await restore(); throw e; }
  return { restore, marked: live.length };
}

/* THE ACTIVITY LOG, ALL OF IT: the feed twins (users/{uid}/activities) and every query's own rungs
   (users/{uid}/queries/{id}/activity) — the seed keeps its history in the second, so counting the first alone reads 0 */
async function countActivity(): Promise<{ feed: number; rungs: number }> {
  const feed = await countDocs(`users/${UID}/activities`);
  const r = await fetch(`${EMU}/users/${UID}:runQuery`, { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "activity", allDescendants: true }], select: { fields: [{ fieldPath: "__name__" }] } } }) });
  const j = (await r.json()) as { document?: unknown }[];
  return { feed, rungs: Array.isArray(j) ? j.filter((x) => x.document).length : -1 };
}

type Row = { lock: string; where: string; ok: boolean; detail: string };
const rows: Row[] = [];
const check = (lock: string, where: string, ok: boolean, detail: string) => rows.push({ lock, where, ok: !!ok, detail });
const offsets: Record<string, Record<string, number[]>> = {};

async function openDash(page: Page, ms: string, vp: { width: number; height: number }, lead: string, drop: readonly string[] = []) {
  await page.addInitScript(([id, k, d]) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", id as string); } catch { /* private mode */ }
    (window as unknown as Record<string, unknown>).__SA_NEXT_LEAD = k;
    if ((d as string[]).length) (window as unknown as Record<string, unknown>).__SA_DASH_DROP = d;
  }, [ms, lead, [...drop]] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}

const CARD = '[data-d2-card="next"]';
const read = (page: Page) => page.evaluate((CARD) => {
  const card = [...document.querySelectorAll<HTMLElement>(CARD)].find((e) => e.getBoundingClientRect().width > 0) ?? null;
  if (!card) return null;
  const lead = card.querySelector<HTMLElement>('[data-d2="next-top"]');
  const r = (el: Element | null | undefined) => (el ? el.getBoundingClientRect() : null);
  const q = (s: string) => lead?.querySelector<HTMLElement>(s) ?? null;
  const L = r(lead);
  const pad = lead ? parseFloat(getComputedStyle(lead).paddingLeft) : 0;
  const stops = lead ? [...lead.querySelectorAll<HTMLElement>('[data-nu="stop"]')].map((s) => s.getBoundingClientRect()) : [];
  const seal = r(q('[data-nu="seal"]'));
  const fig = r(q('[data-nu="fig"]'));
  /* every one-line text: its height against its own line-height (a wrap doubles it), and its box inside the card */
  const lines = [...card.querySelectorAll<HTMLElement>('.nu-name, .nu-agency, .nu-n, .nu-cap, .nu-ask, .nu-lab, .nu-sub, .nu-rtx, .nu-wait, .d2-open, .nu-out, .d2-meta')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    /* a wrap is a second line of TEXT: the distinct line tops of the text's own rects (a button's box is taller than its line) */
    .map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); const tops = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
      const b = e.getBoundingClientRect(); const c = card.getBoundingClientRect();
      return { cls: e.className, lines: tops.size, inside: b.left >= c.left - 0.5 && b.right <= c.right + 0.5, text: (e.textContent ?? "").slice(0, 40) }; });
  return {
    kind: lead?.dataset.kind ?? null, key: lead?.dataset.key ?? null,
    head: getComputedStyle(card.querySelector(".os-band")!).backgroundImage + " " + getComputedStyle(card.querySelector(".os-band")!).backgroundColor,
    meta: card.querySelector(".d2-meta")?.textContent ?? "",
    leadH: L?.height ?? 0,
    off: L ? Object.fromEntries(["who", "ask", "track", "label", "acts", "sub"].map((k) => [k, q(`[data-nu="${k}"]`) ? Math.round((r(q(`[data-nu="${k}"]`))!.top - L.top) * 10) / 10 : -1])) : {},
    sealCx: seal ? seal.left + seal.width / 2 : null, firstCx: stops[0] ? stops[0].left + stops[0].width / 2 : null,
    figR: fig ? fig.right : null, lastR: stops[3] ? stops[3].right : null, leadInnerR: L ? L.right - pad : null,
    nStops: stops.length, cur: lead?.querySelectorAll(".nu-stp.is-cur").length ?? 0,
    lines,
    /* NU11-F · how far the sentence runs past its box: over 0 is the ellipsis showing */
    askOver: (() => { const a = q('[data-nu="ask"]'); return a ? a.scrollWidth - a.clientWidth : null; })(),
    sentence: q('[data-nu="ask"]')?.textContent ?? "", label: q('[data-nu="label"]')?.textContent ?? "", cap: q('[data-nu="cap"]')?.textContent ?? "", n: q('[data-nu="n"]')?.textContent ?? "",
    buttons: [...(lead?.querySelectorAll<HTMLElement>('[data-nu="acts"] button') ?? [])].map((b) => ({ t: b.textContent ?? "", filled: b.classList.contains("d2-open"), bg: getComputedStyle(b).backgroundColor })),
    rows: [...card.querySelectorAll<HTMLElement>('[data-d2="next-row"]')].map((b) => ({ text: b.querySelector(".nu-rtx")?.textContent ?? "", wait: b.querySelector(".nu-wait")?.textContent ?? null })),
    hScroll: (() => { const p = card.closest(".ws-wbody") as HTMLElement | null; return p ? p.scrollWidth - p.clientWidth : -1; })(),
  };
}, CARD);

/* every document write on Firestore's channel while `fn` runs (the To-do measurements' capture) */
async function writesDuring(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const out: string[] = [];
  const on = (req: Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = new URLSearchParams(req.postData() ?? "");
    for (const [k, v] of body) {
      if (!/^req\d+___data__$/.test(k)) continue;
      try { for (const w of (JSON.parse(v) as { writes?: { update?: { name: string }; delete?: string }[] }).writes ?? []) out.push(w.update?.name ?? w.delete ?? "?"); } catch { /* not a write */ }
    }
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(1500); } finally { page.off("request", on); }
  return out;
}

/** open the step from the lead's button `i`, read what the panel shows, then close it without confirming */
async function tryButton(page: Page, i: number) {
  const btn = page.locator(`${CARD} [data-d2="next-top"] [data-nu="acts"] button`).nth(i);
  const panel = page.locator('[data-qp="panel"]').filter({ has: page.locator("[data-qad-drawer]") });
  let mode: string | null = null; let sec: string | null = null; let inPanel = false;
  const writes = await writesDuring(page, async () => {
    await btn.click();
    const d = page.locator("[data-qad-drawer]").first();
    await d.waitFor({ state: "visible", timeout: 15_000 });
    mode = await d.getAttribute("data-qad-drawer");
    inPanel = (await panel.count()) > 0;
    sec = await page.locator("[data-qad-sec]").first().getAttribute("data-qad-sec").catch(() => null);
    await page.locator("[data-qad-drawer] .qad-dx").first().click();
    const disc = page.locator("[data-qad-discard] .disc").first();
    if (await disc.isVisible().catch(() => false)) await disc.click();
    await page.locator("[data-qad-drawer]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
    await page.keyboard.press("Escape");
  });
  return { mode, sec, inPanel, writes };
}

test.describe.serial("NU1 · Next up v1 on the page", () => {
  for (const vp of SIZES) for (const k of KINDS) {
    const name = "as" in k ? k.as : k.kind;
    const where = `${name} ${vp.width}x${vp.height}`;
    test(`NU1 · ${where}`, async ({ page }) => {
      test.setTimeout(150_000);
      let seeded: Awaited<ReturnType<typeof seedTell>> | null = null;
      if (k.kind === "tell") {
        try { seeded = await seedTell(); } catch (e) { check("S", where, false, String(e)); test.skip(true, "tell could not be seeded"); return; }
      }
      try {
      let m: Awaited<ReturnType<typeof read>> = null;
      let book = "";
      for (const ms of BOOKS) {
        await openDash(page, ms, vp, k.kind, "drop" in k ? k.drop : []);
        m = await read(page);
        const want = k.kind === "coming" ? "other" : k.kind;
        if (m?.kind === want && (k.kind !== "coming" || m.off.track! >= 0) && (name !== "other" || m.off.track === -1)) { book = ms; break; }
      }
      check("P", where, !!book, book ? `leads on ${book}: ${m?.key}` : `no ${name} task on ${BOOKS.join(" or ")} (lead was ${m?.kind})`);
      if (!book || !m) { test.skip(true, `no ${name} task seeded`); return; }
      mkdirSync(`${DIR}/shots`, { recursive: true });
      await page.locator(CARD).first().screenshot({ path: `${DIR}/shots/${name}-${vp.width}x${vp.height}.png` });

      /* R · the rows, in order and at their offsets */
      (offsets[`${vp.width}`] ??= {})[name] = TRACKED.has(k.kind) ? ["who", "ask", "track", "label", "acts"].map((x) => m!.off[x]) : [];
      if (TRACKED.has(k.kind)) {
        check("R1", where, m.nStops === 4 && m.cur === 1, `${m.nStops} stops, ${m.cur} ringed`);
        const o = ["who", "ask", "track", "label", "acts"].map((x) => m!.off[x]);
        check("R2", where, o.every((v, i) => v >= 0 && (i === 0 || v > o[i - 1])), o.join(" < "));
        /* A · alignment */
        const a1 = Math.abs(m.firstCx! - m.sealCx!), a2 = Math.abs(m.lastR! - m.figR!), a3 = Math.abs(m.lastR! - m.leadInnerR!);
        check("A1", where, a1 <= 2, `first stop centre ${m.firstCx?.toFixed(1)} vs seal centre ${m.sealCx?.toFixed(1)} (${a1.toFixed(1)}px)`);
        if (m.figR != null) check("A2", where, a2 <= 2, `last stop right ${m.lastR?.toFixed(1)} vs number right ${m.figR.toFixed(1)} (${a2.toFixed(1)}px)`);
        check("A3", where, a3 <= 2, `last stop right ${m.lastR?.toFixed(1)} vs the lead's content edge ${m.leadInnerR?.toFixed(1)}`);
      }
      /* W · no wrap, nothing out of the card */
      const bad = m.lines.filter((l) => l.lines > 1 || !l.inside);
      check("W1", where, bad.length === 0, bad.length ? JSON.stringify(bad) : `${m.lines.length} lines, one line each, inside the card`);
      check("W2", where, m.hScroll <= 0, `horizontal overflow ${m.hScroll}px`);
      check("W3", where, !/\b(overdue|late|he|she)\b/i.test(`${m.sentence} ${m.label} ${m.cap}`), `${m.sentence} | ${m.n} ${m.cap} | ${m.label}`);
      check("W4", where, m.rows.every((r) => !/\bago\b/.test(`${r.text} ${r.wait ?? ""}`)), JSON.stringify(m.rows));
      check("W5", where, /^\d+ of \d+ · See all$/.test(m.meta.trim()), m.meta);
      /* NU11-F (v1.1) · every kind's sentence fits the lead card with no ellipsis — the brief asks it at 1280x720; it runs
         at both sizes. The task's own title ("other", "ready", "coming") is the task's words, not one of the ruled eight:
         it is read and recorded, and red only for the eight. */
      const ruled = !["other", "ready", "coming"].includes(name);
      check(ruled ? "NU11-F" : "NU11-Fo", where, !ruled || (m.askOver ?? 1) <= 0, `"${m.sentence}" (${m.sentence.length} chars) runs ${m.askOver}px past its box`);
      check("W6", where, m.buttons.filter((b) => b.filled).length === 1, JSON.stringify(m.buttons));

      /* E · a 40-character name and agency leave the height alone (on a card with an agent row: both lines exist) */
      if (m.lines.some((l) => l.cls.includes("nu-name")) && m.lines.some((l) => l.cls.includes("nu-agency"))) {
        const before = m.leadH;
        const after = await page.evaluate((CARD) => {
          const lead = [...document.querySelectorAll<HTMLElement>(`${CARD} [data-d2="next-top"]`)].find((e) => e.getBoundingClientRect().width > 0)!;
          lead.querySelector<HTMLElement>(".nu-name")!.textContent = "Bartholomew Fitzwilliam-Ashcombe-Delacro";
          lead.querySelector<HTMLElement>(".nu-agency")!.textContent = "The Fitzwilliam Ashcombe Literary Agency";
          return lead.getBoundingClientRect().height;
        }, CARD);
        check("E1", where, Math.abs(after - before) < 0.5, `height ${before.toFixed(1)} → ${after.toFixed(1)} with a 40-character name and agency`);
      }
      await page.reload();
      await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1200);

      /* B · each button opens its step; closing without confirming writes nothing */
      const opens = OPENS[k.kind];
      if (opens) {
        const acts0 = await countActivity();
        for (let i = 0; i < opens.length; i++) {
          const got = await tryButton(page, i);
          const want = opens[i];
          check(`B${i + 1}`, where, got.mode === want.mode && got.inPanel && (!want.sec || got.sec === want.sec), `${m.buttons[i]?.t} → ${got.mode} "${got.sec}" in panel ${got.inPanel}`);
          check(`B${i + 1}w`, where, got.writes.length === 0, got.writes.length ? got.writes.join(", ") : "no writes on close");
          await page.waitForTimeout(600);
        }
        const acts1 = await countActivity();
        /* not vacuous: the log has records to lose */
        check("B9", where, acts0.rungs > 0 && acts0.rungs === acts1.rungs && acts0.feed === acts1.feed, `activity log: rungs ${acts0.rungs} → ${acts1.rungs}, feed ${acts0.feed} → ${acts1.feed}`);
      }
      if (seeded) check("S", where, seeded.marked > 0, `${seeded.marked} queries marked with ${OFFER_Q}'s offer for this case, restored after`);
      } finally { await seeded?.restore(); }
    });
  }

  test("NU1 · R3 the five rows sit at the same offsets on every tracked card", () => {
    for (const [w, byKind] of Object.entries(offsets)) {
      const tracked = Object.entries(byKind).filter(([, o]) => o.length === 5);
      const ref = tracked[0]?.[1];
      const off = tracked.filter(([, o]) => o.some((v, i) => Math.abs(v - ref![i]) > 1));
      check("R3", w, tracked.length > 1 && off.length === 0, `${tracked.length} kinds; ${JSON.stringify(Object.fromEntries(tracked))}`);
    }
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/ledger.json`, JSON.stringify({ rows, offsets }, null, 1));
    const red = rows.filter((r) => !r.ok);
    expect(red, red.map((r) => `${r.lock} ${r.where}: ${r.detail}`).join("\n")).toEqual([]);
  });
});

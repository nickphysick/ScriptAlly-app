/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1 — the feed's sentences and the collapsed card, on the rendered page (the emulator's harness account:
 * `npm run e2e:emu -- tests/e2e/feedWordingV1.measure.ts`).
 *
 * FW-J  the journey: an agent added, edited on the agent card (its email), renamed and deleted through the app's own UI; the
 *       dashboard feed shows a row for each, naming the agent once, the name its own bold run. The page clock is
 *       moved on 11 minutes between the edit, the rename and the delete, so the burst rule (10 minutes) keeps them
 *       apart, as a writer's day would.
 * FW-E  a collapsed card with a long headline shows its WHOLE text (v1.1 ruling: no line cap), the sub-line one line,
 *       at 1280 × 800 and 1512 × 900, the sidebar open and collapsed.
 *       `FW1_MUTATE=E` puts the one-line ellipsis back in the page, `FW1_MUTATE=C` the two-line cap: FW-E must go red.
 *
 * ⚠️ EVERY WRITE IS TAKEN BACK IN THE SAME RUN: the journey's agent deletes itself, and its four feed rows and FW-E's
 * seeded agent, query and row are removed in `afterAll`.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/feed-wording-v1";
const MUT = process.env.FW1_MUTATE ?? "";
const RUN = Date.now().toString(36).slice(-5);
const OLD = `Fwone Probe${RUN}`;
const NEW = `Fwone Renamed${RUN}`;
const AGENCY = `Probe${RUN} Literary`;
const AC = "[data-cl262='panel'] [data-acv2='card']";
const A = (s: string) => `${AC} ${s}`;
const HEAD = A("[data-acv22='head-open']");
const TOAST = A("[data-acv22='toast']");
test.setTimeout(600_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    const bad = this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`);
    if (MUT) expect(bad.length, `${this.id}: the mutation must turn the lock red`).toBeGreaterThan(0);
    else expect(bad).toEqual([]);
  }
}

const iso = (ms: number) => new Date(ms).toISOString();
const LONG = { agentId: `fw1-ag-long-${RUN}`, queryId: `fw1-q-long-${RUN}`, actId: `fw1-a-long-${RUN}`, agency: "Penhallow, Treloar & Kitto Literary" };

async function cleanup() {
  const { db, uid } = await harnessDb();
  const { collection, deleteDoc, doc, getDocs } = await import("firebase/firestore");
  const acts = (await getDocs(collection(db, "users", uid, "activities"))).docs as { id: string; data: () => Record<string, unknown> }[];
  for (const d of acts) {
    const x = d.data();
    const mine = [x.subjectName, x.subjectAgency, x.description].some((v) => typeof v === "string" && (v.includes(`Probe${RUN}`) || v.includes(`Renamed${RUN}`)));
    if (mine || d.id === LONG.actId) await deleteDoc(doc(db, "users", uid, "activities", d.id)).catch(() => {});
  }
  await deleteDoc(doc(db, "users", uid, "queries", LONG.queryId)).catch(() => {});
  await deleteDoc(doc(db, "users", uid, "agents", LONG.agentId)).catch(() => {});
}

async function seedLong() {
  const { db, uid } = await harnessDb();
  const { doc, setDoc } = await import("firebase/firestore");
  const now = Date.now(), H = 3_600_000, D = 86_400_000;
  await setDoc(doc(db, "users", uid, "agents", LONG.agentId), {
    id: LONG.agentId, userId: uid, name: "", agency: LONG.agency, email: "", website: "", genres: [], mswlNotes: "", submissionStatus: "Open",
    submissionMethod: "Email", materialsWanted: [], dateAdded: iso(now - 50 * D), lastCheckedDate: iso(now - 50 * D), notes: "",
  });
  await setDoc(doc(db, "users", uid, "queries", LONG.queryId), {
    id: LONG.queryId, userId: uid, agentId: LONG.agentId, manuscriptId: "seed-ms-1", packageId: "", sentHow: "unrecorded", personalisationNotes: "",
    sendMethod: "Email", status: "Full Sent", dateSent: iso(now - 40 * D), fullRequestedDate: iso(now - 10 * D), fullSentDate: iso(now - 4 * H), lastStatusChange: iso(now - 4 * H),
  });
  await setDoc(doc(db, "users", uid, "activities", LONG.actId), {
    id: LONG.actId, userId: uid, queryId: LONG.queryId, manuscriptId: "seed-ms-1", details: "", activityType: "Materials Sent", eventKey: "full_sent",
    resultingStatus: "Full Sent", date: iso(now - 4 * H), description: `Full manuscript sent to ${LONG.agency}`,
  });
}

async function openDash(page: Page, vp: { width: number; height: number }, collapsed = false) {
  await page.addInitScript((c) => {
    try { localStorage.setItem("scriptally:sidebar-collapsed", c ? "1" : "0"); localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, collapsed);
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

test.describe("Feed wording v1", () => {
  /* not serial: a journey failure must not skip the layout checks */
  test.describe.configure({ mode: "default" });
  test.beforeAll(async () => { await cleanup(); await seedLong(); });
  test.afterAll(async () => { await cleanup(); });

  test("FW-J · add, edit on the card, rename, delete: a row for each, the agent named once", async ({ page }) => {
    test.skip(!!MUT, "the journey has no in-page mutation; its sentences are locked red-first by src/lib/feedWording.test.ts");
    const L = new Ledger("FW-J");
    page.setDefaultTimeout(30_000);
    await page.clock.install();
    const VP = { width: 1512, height: 900 };
    /* 1 · add, through the Contact list's own journey */
    await openRoute(page, "/agents", VP);
    await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await page.locator("[data-cl27='add']:visible, [data-cl26='add']:visible").first().click();
    await page.locator("[data-aag='root']").waitFor({ timeout: 20_000 });
    await page.locator("[data-aag='root'] [data-aag='name']").fill(OLD);
    await page.locator("[data-aag='root'] [data-aag='agency']").fill(AGENCY);
    await page.locator("[data-aag='root'] [data-aag='add-later']").filter({ visible: true }).first().click();
    await page.waitForTimeout(900);
    await page.locator("[data-aag='root'] [data-aag='add']").filter({ visible: true }).first().click();
    const added = await page.locator("[data-aag='done']").first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
    L.check("the add journey finished", added, "");
    /* 2 · edit the wishlist on the agent card */
    await openRoute(page, "/agents", VP);
    const row = page.locator(".aglist [data-cl26='row']").filter({ hasText: OLD }).first();
    await row.scrollIntoViewIfNeeded();
    await row.locator("[data-cl26='name']").click();
    await page.locator(AC).first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(900);
    const pen = async (k: string) => {
      const host = k === "contact" ? page.locator(A("[data-acv2='head']")) : page.locator(A(`[data-cl262='sec'][data-k='${k}']`));
      await host.first().hover();
      await page.locator(A(`[data-cl262='pen'][data-k='${k}']`)).first().click();
      await page.waitForTimeout(450);
    };
    /* a new agent has no wishlist section to open, so the edit is the head's email: one group, "contact details" */
    await pen("contact");
    await page.locator(`${HEAD} input[data-ae='email']`).fill(`probe${RUN}@example.test`);
    await page.locator(`${HEAD} [data-qc168='tick']`).click();
    L.check("the email saved", await page.locator(TOAST).waitFor({ timeout: 20_000 }).then(() => true, () => false), "");
    await page.waitForTimeout(1200);
    /* 3 · eleven minutes on, rename it in the card's head */
    await page.clock.fastForward("11:00");
    await pen("contact");
    await page.locator(`${HEAD} input[data-ae='name']`).fill(NEW);
    await page.locator(`${HEAD} [data-qc168='tick']`).click();
    L.check("the rename saved", await page.locator(TOAST).waitFor({ timeout: 20_000 }).then(() => true, () => false), "");
    await page.waitForTimeout(1200);
    /* 4 · eleven minutes on, delete it (no queries: no typed name) */
    await page.clock.fastForward("11:00");
    await page.locator(A("[data-acv22='band-more']")).click();
    await page.locator(A("[data-qc168='band-menu'] [data-act='delete']")).click();
    await page.waitForTimeout(400);
    await page.locator(A("[data-cl24='remove-go']")).click();
    await page.waitForTimeout(2000);
    /* the dashboard's feed */
    await openDash(page, VP);
    const rows = await page.evaluate(([o, n]) => [...document.querySelectorAll<HTMLElement>('.d2 [data-df1="mini-say"]')]
      .map((e) => ({ text: (e.textContent ?? "").trim(), bold: [...e.querySelectorAll("b")].map((b) => (b.textContent ?? "").trim()) }))
      .filter((r) => r.text.includes(o) || r.text.includes(n)), [OLD, NEW]);
    writeFileSync(`${DIR}/ledger/FW-J.rows.json`, JSON.stringify(rows, null, 1));
    const want = [
      { text: `You removed ${NEW} from your contact list`, bold: [NEW] },
      { text: `You renamed ${OLD} to ${NEW}`, bold: [NEW] },
      { text: `You updated ${OLD}'s contact details`, bold: [OLD] },
      { text: `You added ${OLD} to your contact list`, bold: [OLD] },
    ];
    L.check("population: the journey's rows on the feed", rows.length > 0, String(rows.length));
    L.check("a row for each step, newest first, in the pack's words", JSON.stringify(rows.map((r) => r.text)) === JSON.stringify(want.map((w) => w.text)), JSON.stringify(rows.map((r) => r.text)));
    L.check("the person's bold run holds the name alone (on the rename, only the NEW name)", JSON.stringify(rows.map((r) => r.bold)) === JSON.stringify(want.map((w) => w.bold)), JSON.stringify(rows.map((r) => r.bold)));
    for (const r of rows) {
      const times = (s: string) => r.text.split(s).length - 1;
      L.check(`named once: ${r.text}`, times(OLD) <= 1 && times(NEW) <= 1 && times(AGENCY) === 0, `${times(OLD)}/${times(NEW)}/${times(AGENCY)}`);
      L.check(`no full stop, no dash: ${r.text}`, !r.text.endsWith(".") && !r.text.includes(" — "), r.text);
    }
    L.done(9);
  });

  const LAYOUTS = [
    { width: 1280, height: 800, collapsed: false }, { width: 1280, height: 800, collapsed: true },
    { width: 1512, height: 900, collapsed: false }, { width: 1512, height: 900, collapsed: true },
  ];
  for (const lay of LAYOUTS) {
    const tag = `${lay.width}x${lay.height}-${lay.collapsed ? "collapsed" : "open"}`;
    test(`FW-E · a long headline shows its whole text · ${tag}`, async ({ page }) => {
      const L = new Ledger(`FW-E-${tag}`);
      await openDash(page, lay, lay.collapsed);
      if (MUT === "E") await page.addStyleTag({ content: ".d58.d2 .d2-feed .df1-hl { display: block !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }" });
      if (MUT === "C") await page.addStyleTag({ content: ".d58.d2 .d2-feed .df1-hl { display: -webkit-box !important; -webkit-box-orient: vertical !important; -webkit-line-clamp: 2 !important; overflow: hidden !important; }" });
      await page.waitForTimeout(300);
      const sel = `.d2 [data-df1="collapsed"][data-query="${LONG.queryId}"]`;
      await page.locator(sel).first().waitFor({ timeout: 15_000 }).catch(() => {});
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.d2 [data-df1="collapsed"]')].map((row) => {
        const b = row.querySelector<HTMLElement>('[data-df1="collapsed-headline"]')!;
        const s = row.querySelector<HTMLElement>('[data-df1="collapsed-sub"]')!;
        const t = row.querySelector<HTMLElement>("time")!;
        const cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight), slh = parseFloat(getComputedStyle(s).lineHeight);
        return {
          q: row.dataset.query ?? "", text: (b.textContent ?? "").trim(), lines: Math.round(b.getBoundingClientRect().height / lh),
          need: Math.round(b.scrollHeight / lh), w: Math.round(b.clientWidth),
          rowW: Math.round(row.getBoundingClientRect().width), cols: getComputedStyle(row).gridTemplateColumns, timeW: Math.round(t.getBoundingClientRect().width),
          feedW: Math.round(row.closest<HTMLElement>('[data-df1="feedcol"]')?.getBoundingClientRect().width ?? -1),
          clipped: b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1, ellipsis: cs.textOverflow === "ellipsis" && cs.whiteSpace === "nowrap",
          subLines: Math.round(s.getBoundingClientRect().height / slh), subNowrap: getComputedStyle(s).whiteSpace === "nowrap",
          timeDy: Math.round((t.getBoundingClientRect().top - b.getBoundingClientRect().top) * 10) / 10,
          rowH: Math.round(row.getBoundingClientRect().height),
        };
      }));
      writeFileSync(`${DIR}/ledger/FW-E-${tag}.rows.json`, JSON.stringify(r, null, 1));
      const long = r.find((x) => x.q === LONG.queryId);
      const want = `Your full manuscript is with ${LONG.agency}`;
      L.check("population: the long card is on the page", !!long, `${r.length} collapsed rows`);
      L.check("its headline is the whole text", long?.text === want, long?.text ?? "");
      /* the seeded headline is longer than one line in every layout here: it must WRAP, in full, with no cap */
      L.check("it wraps, and shows its whole text (no ellipsis, nothing clipped)", !!long && long.lines >= 2 && !long.ellipsis && !long.clipped, JSON.stringify(long));
      for (const x of r) {
        L.check(`${x.q}: the whole headline shows, no ellipsis`, !x.clipped && !x.ellipsis, JSON.stringify(x));
        L.check(`${x.q}: the sub-line stays one line`, x.subLines === 1 && x.subNowrap, JSON.stringify(x));
      }
      if (process.env.FW1_SHOTS && long) {
        mkdirSync(`${DIR}/shots`, { recursive: true });
        await page.locator(sel).first().screenshot({ path: `${DIR}/shots/long-${tag}${MUT ? `-mut-${MUT}` : ""}.png` });
      }
      L.done(5);
    });
  }

});

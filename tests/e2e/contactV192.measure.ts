/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.2 — locks CL192 A1 to G1 (design-refs/contact-list-v19-2/contact-list-v19-2.html), on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (v19.1 as on dev; `CL192_BASE=1`, ledger `base-<lock>.json`) and
 * with its named mutation (`CL192_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A page
 * mutation is CSS or script applied in the page (MUTATIONS); a `src` mutation (B1, C1, D1, F1) is a source edit made and
 * undone in this pack's worktree from a path-derived backup, with `CL192_MUTATE` naming the ledger only.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible copy (box height > 0).
 * ⚠️ PINNING TICKS THE GETTING-STARTED GUIDE: every test that pins records the guide's state and restores it exactly.
 * ⚠️ B1, C1, D1, E1 AND F1 WRITE TO THE ACCOUNT: the harness has no imported, long-overdue or closed-with-a-reopening
 *    agents, so each seeds temporary `zz192-*` agents (cl192Fixtures.ts) and removes them, and everything naming them,
 *    in the same run; `withFixtures` throws if any survive.
 * ⚠️ A2's "PINNED IS UNCHANGED AGAINST v19.1" IS A COMPARISON WITH A READING TAKEN FROM THE BASE BUILD: the base run
 *    writes `ledger/ref-pinned-<width>.json`, every later run compares with it.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { openContacts16, LOADED_ROW16, LIB16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";
import { type FixKey, expectedOf, fixId, scopedMs, withFixtures } from "./cl192Fixtures";

const DIR = "reports/contact-list-v19-2";
const MUT = process.env.CL192_MUTATE ?? "";
const BASE = process.env.CL192_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
const guideSet = (args: string) => sh(`node tests/e2e/guideFlags.mjs ${args}`);
const guideRestore = (json: string) => sh(`node tests/e2e/guideFlags.mjs --restore '${json}'`);
const RUST = "rgb(162, 69, 42)";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const mine = MUT === this.name || MUT.startsWith(`${this.name}-`);
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${mine ? `mut-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page. B1, C1, D1 and F1 are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* restore the old padding: v19.1's 14px of header margin */
  "CL192-A1": { css: `@media (min-width: 768px) { .clv-group:not([data-full]) > .cl17-hd { margin-top: 14px !important; } }` },
  /* restore the old margin: v19.1's 22 under the hero */
  "CL192-A2": { css: `@media (min-width: 768px) { .clv-group:not([data-full]) > .cl17-hd ~ .clv-main.clv-main { margin-top: 22px !important; } }` },
  /* make the cell a block. Literally (`display: block` on the cell) it changes nothing a reader can see — the label is
     itself `display: block`, so it stays under the date — so the break is the cell's contents laid as one block LINE:
     the cell a block and the label inline in it, i.e. the label beside the date instead of under it. */
  "CL192-E1": { css: `.clv-group .cl19-card .cl19-cd { display: block !important; } .clv-group .cl19-card .cl19-cd .cl192-imp { display: inline !important; margin-left: 6px; }` },
  /* the literal reading, kept to show it changes nothing measurable (green under it; see E1's note) */
  "CL192-E1-literal": { css: `.clv-group .cl19-card .cl19-cd { display: block !important; }` },
  /* restore the line: "N gaps to fill" back under "List health", from the ring's own label */
  "CL192-G1": { js: `(() => { const fix = () => { for (const b of document.querySelectorAll('[data-cl17="health"]')) { const t = b.querySelector('.cl17-ht'); if (!t || t.querySelector('[data-cl17="health-gaps"]')) continue; const m = /(\\d+) gaps? to fill/.exec(b.getAttribute('aria-label') || ''); const e = document.createElement('em'); e.setAttribute('data-cl17', 'health-gaps'); e.textContent = m ? m[0] : ''; t.appendChild(e); } }; fix(); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock || MUT.startsWith(`${lock}-`) ? MUTATIONS[MUT] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
/** every open starts from the defaults (as CL19's and CL191's `open`) */
const open = async (page: Page, vp: VP, lock: string) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { try { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); } catch { /* private mode */ } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp);
  const dirty = await page.evaluate(({ m, v }) => { try { return [...m.map((k) => sessionStorage.getItem(k)), ...v.map((k) => localStorage.getItem(k))].some((x) => x != null && /"pinned":true|"group":"(?!none)|"scroll":[1-9]|"search":"[^"]/.test(x)); } catch { return false; } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  if (dirty) {
    await page.evaluate(({ m, v }) => { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); }, { m: MEMORY_KEYS, v: VIEW_KEYS });
    await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await page.waitForTimeout(400);
    await page.evaluate(LIB16);
  }
  await mutate(page, lock);
};
const withGuide = async (fn: () => Promise<void>) => {
  const g0 = guideNow();
  try { guideSet("--seen --done pin"); await fn(); } finally { await new Promise((r) => setTimeout(r, 1500)); guideRestore(g0); }
};
const click = async (page: Page, L: Ledger, sel: string, where: string) => {
  try { await page.locator(sel).filter({ visible: true }).first().click({ timeout: 6000 }); return true; }
  catch { L.check(`${where}: "${sel}" could be pressed`, false, "missing, hidden or covered"); return false; }
};
const pinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl19='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
const setPin = async (page: Page, L: Ledger, on: boolean, where: string) => {
  if ((await pinned(page)) === on) return true;
  const ok = await click(page, L, "[data-cl19='pin']", where);
  await page.waitForTimeout(900);
  return ok && (await pinned(page)) === on;
};
/** the page's scoped manuscript (the stored key, else the most recently created), for the overdue queries */
const msOf = async (page: Page) => scopedMs(await page.evaluate(() => { try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; } }));
/** wait until every fixture's row is drawn (the page reads the account live) */
const waitRows = async (page: Page, keys: FixKey[]) => {
  for (const k of keys) await page.locator(`.aglist [data-clv='row'][data-agent-card="${fixId(k)}"]`).filter({ visible: true }).first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(700);
};
/** fixtures are seeded once per lock, around both widths */
const withFix = async (page: Page, vp: VP, lock: string, keys: FixKey[], fn: (sent: Record<string, number>) => Promise<void>) => {
  await open(page, vp, lock);
  const ms = await msOf(page);
  await withFixtures(keys, ms, fn);
};

/* ───────────────────────── A · breathing room ───────────────────────── */
const readTop = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const eb = vis("[data-cl17='eyebrow']")[0], win = vis(".ws-window")[0], acts = vis("[data-cl17='acts']")[0], counts = vis("[data-cl17='card']")[0], card = vis("section.cl19-card[data-cl19='card']")[0];
  const b = (e?: HTMLElement) => (e ? e.getBoundingClientRect() : null);
  /* Contact list v20 §A: the title row now opens the list, between the hero and the card */
  const title = vis("[data-cl20='title-row']")[0];
  return { eb: b(eb)?.top ?? null, win: b(win)?.top ?? null, acts: b(acts)?.bottom ?? null, counts: b(counts)?.bottom ?? null, card: b(card)?.top ?? null, title: b(title)?.top ?? null, full: !!document.querySelector(".clv-group[data-full]") };
});
test("CL192-A1 · top: unpinned, the eyebrow's top is 36 ±2 below the content card's top", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-A1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL192-A1");
    const r = await readTop(page);
    L.check(`${w} unpinned (precondition)`, !(await pinned(page)) && !r.full, `${r.full}`);
    L.check(`${w} the eyebrow and the content card are there`, r.eb != null && r.win != null, JSON.stringify(r));
    L.check(`${w} eyebrow top − content card top = 36 ±2`, near((r.eb ?? NaN) - (r.win ?? NaN), 36, 2), `${((r.eb ?? NaN) - (r.win ?? NaN)).toFixed(1)}`);
  }
  L.done(6);
});

/** the pinned layout, relative to the content card's top (the reference for "unchanged against v19.1") */
const readPinned = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const win = vis(".ws-window")[0]?.getBoundingClientRect();
  const r = (s: string) => { const b = vis(s)[0]?.getBoundingClientRect(); return b && win ? { top: +(b.top - win.top).toFixed(1), h: +b.height.toFixed(1), left: +(b.left - win.left).toFixed(1), w: +b.width.toFixed(1) } : null; };
  return { card: r("section.cl19-card[data-cl19='card']"), head: r("[data-cl19='head']"), band: r(".cl19-band"), toolbar: r("[data-cl19='toolbar']"), labels: r(".lt-labels.lth"), row: r(".aglist [data-clv='row'][data-agent-card]") };
});
test("CL192-A2 · gap: unpinned, the list card's top is 44 ±2 below the lower of the buttons and the counts card; pinned unchanged against v19.1", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-A2");
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL192-A2");
      const r = await readTop(page);
      L.check(`${w} unpinned (precondition)`, !(await pinned(page)) && !r.full, "");
      L.check(`${w} the buttons, the counts card and the list card are there`, r.acts != null && r.counts != null && r.card != null, JSON.stringify(r));
      const low = Math.max(r.acts ?? NaN, r.counts ?? NaN);
      /* RE-POINTED (Contact list v20 §A): the 44 now lies between the hero and the TITLE ROW, which opens the list where
         the card used to start (the card follows 18 below it). The claim — the hero's gap below — is unchanged. */
      L.check(`${w} the title row (v20) is there`, r.title != null, `${r.title}`);
      L.check(`${w} title row top − max(buttons, counts card) = 44 ±2`, near((r.title ?? NaN) - low, 44, 2), `${((r.title ?? NaN) - low).toFixed(1)} (buttons ${r.acts?.toFixed(1)}, counts ${r.counts?.toFixed(1)})`);
      L.check(`${w} pinned (precondition)`, await setPin(page, L, true, `${w} pin`), "");
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const p = await readPinned(page);
      const ref = `${DIR}/ledger/ref-pinned-${vp.width}.json`;
      if (BASE) { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(ref, JSON.stringify(p, null, 1)); }
      const base = existsSync(ref) ? JSON.parse(readFileSync(ref, "utf8")) as typeof p : null;
      L.check(`${w} a v19.1 pinned reference exists (taken on the base build)`, !!base, ref);
      for (const k of Object.keys(p) as (keyof typeof p)[]) {
        const a = p[k], b = base?.[k];
        L.check(`${w} pinned ${k} is where v19.1 has it (top, height, left, width ±1)`, !!a && !!b && near(a.top - b.top, 0, 1) && near(a.h - b.h, 0, 1) && near(a.left - b.left, 0, 1) && near(a.w - b.w, 0, 1), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
      await setPin(page, L, false, `${w} unpin`);
    }
  });
  L.done(18);
});

/* ───────────────────────── B · only closed agents say so ───────────────────────── */
const readReps = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => e.getBoundingClientRect().height > 0).map((r) => {
  const rep = r.querySelector<HTMLElement>("[data-clv='rep']");
  const b = rep?.querySelector<HTMLElement>("b");
  const shut = rep?.querySelector<HTMLElement>("[data-cl192='rep-closed']");
  const c = shut ? getComputedStyle(shut) : null;
  return { id: r.dataset.agentCard!, text: (rep?.textContent ?? "").replace(/\s+/g, " ").trim(), b: (b?.textContent ?? "").trim(), bColor: b ? getComputedStyle(b).color : null,
    shut: shut ? { t: (shut.textContent ?? "").trim(), color: c!.color, style: c!.fontStyle, size: c!.fontSize, face: c!.fontFamily, under: shut.getBoundingClientRect().top >= (b?.getBoundingClientRect().bottom ?? Infinity) - 1 } : null,
    unknown: !!rep?.querySelector("[data-clv='door-unknown']") };
}));
const agentDocs = async () => {
  const { db, uid } = await harnessDb();
  return new Map((await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => [d.id, d.data() as { submissionStatus?: string; reopensOn?: string; responseTimeWeeks?: number }]));
};
test("CL192-B1 · open: no open agent's row says 'Open to queries'; a closed one says 'Closed till …' or 'Closed to queries' in rust italic serif 13px", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-B1");
  await withFix(page, SIZES[0], "CL192-B1", ["shut", "shutx"], async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL192-B1");
      await waitRows(page, ["shut", "shutx"]);
      const docs = await agentDocs();
      const reps = await readReps(page);
      const door = (id: string) => String(docs.get(id)?.submissionStatus ?? "").trim().toLowerCase();
      const openRows = reps.filter((r) => door(r.id) === "open"), shut = reps.filter((r) => door(r.id) === "closed");
      L.check(`${w} the population: open rows and closed rows (two seeded closed, one with a reopening date)`, openRows.length >= 10 && shut.length >= 2, `${openRows.length} open · ${shut.length} closed`);
      const said = openRows.filter((r) => /open to queries/i.test(r.text));
      L.check(`${w} no open agent's row shows "Open to queries" (any case)`, openRows.length > 0 && said.length === 0, JSON.stringify(said.slice(0, 3).map((r) => r.text)));
      L.check(`${w} an open agent's Replies cell holds the reply time and nothing under it`, openRows.every((r) => r.text === r.b && !r.shut), JSON.stringify(openRows.filter((r) => r.text !== r.b || r.shut).slice(0, 3).map((r) => r.text)));
      for (const r of shut) {
        const reopen = docs.get(r.id)?.reopensOn ? Date.parse(docs.get(r.id)!.reopensOn!) : NaN;
        const want = Number.isFinite(reopen) ? `Closed till ${dm(reopen)}` : "Closed to queries";
        L.check(`${w} ${r.id}: reads "${want}"`, r.shut?.t === want, `"${r.shut?.t ?? r.text}"`);
        L.check(`${w} ${r.id}: in rust ${RUST}, italic serif 13px, under the reply time`, !!r.shut && r.shut.color === RUST && r.shut.style === "italic" && r.shut.size === "13px" && /serif/i.test(r.shut.face) && !/sans/i.test(r.shut.face) && r.shut.under, JSON.stringify(r.shut));
      }
      L.check(`${w} the seeded "Closed till …" was read`, shut.some((r) => r.id === fixId("shut") && /^Closed till \d{1,2} [A-Z][a-z]{2}$/.test(r.shut?.t ?? "")), "");
      L.check(`${w} the seeded "Closed to queries" was read`, shut.some((r) => r.id === fixId("shutx") && r.shut?.t === "Closed to queries"), "");
    }
  });
  L.done(16);
});

/* ───────────────────────── C · no fake defaults ───────────────────────── */
/* Part C found the uniform "~6 wks" was STORED data: Smart Import (16 Jun – 11 Oct) wrote `responseTimeWeeks: 6` for
   every agent whose file gave none, and nothing records which stored windows came from that fill (`importedNeedsReview`
   marks the import, not the field). So "no agent with a default value shows a number" cannot be checked against the
   import's fill — no record says which 6 is one. What CAN be checked is the app's own default: an absent or zero
   window. Those rows (two seeded here, the harness's own no-window agents besides) must read "Not stated" with no number;
   that is the only case the clause can honestly cover. */
test("CL192-C1 · reply: every Replies value reads '~N weeks' (or '~1 week') or 'Not stated', never 'wks'; an absent or zero window shows no number", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-C1");
  await withFix(page, SIZES[0], "CL192-C1", ["zero", "none", "one"], async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL192-C1");
      await waitRows(page, ["zero", "none", "one"]);
      const docs = await agentDocs();
      const reps = await readReps(page);
      L.check(`${w} the population: Replies cells`, reps.length >= 20, `${reps.length}`);
      const bad = reps.filter((r) => !/^(~(1 week|([2-9]|\d{2,}) weeks)|Not stated)$/.test(r.b));
      L.check(`${w} every value is "~N weeks", "~1 week" or "Not stated"`, reps.length > 0 && bad.length === 0, JSON.stringify(bad.slice(0, 4).map((r) => r.b)));
      const wks = reps.filter((r) => /wks/i.test(r.text));
      L.check(`${w} no Replies cell reads "wks"`, wks.length === 0, JSON.stringify(wks.slice(0, 3).map((r) => r.text)));
      const dflt = reps.filter((r) => { const v = docs.get(r.id)?.responseTimeWeeks; return v === undefined || v === null || v === 0; });
      L.check(`${w} the absent/zero windows on screen (two seeded at least)`, dflt.length >= 2 && dflt.some((r) => r.id === fixId("zero")) && dflt.some((r) => r.id === fixId("none")), `${dflt.length}`);
      for (const r of dflt) L.check(`${w} ${r.id} (window ${JSON.stringify(docs.get(r.id)?.responseTimeWeeks ?? null)}): "Not stated", no number, ink at 55%`, r.b === "Not stated" && !/\d/.test(r.b) && r.bColor === "rgba(28, 19, 15, 0.55)", `"${r.b}" ${r.bColor}`);
      const one = reps.find((r) => r.id === fixId("one"));
      L.check(`${w} a one-week window reads "~1 week"`, one?.b === "~1 week", `"${one?.b}"`);
      const stated = reps.filter((r) => (docs.get(r.id)?.responseTimeWeeks ?? 0) > 0);
      L.check(`${w} each stated window reads its own number`, stated.length > 0 && stated.every((r) => r.b === `~${docs.get(r.id)!.responseTimeWeeks} ${docs.get(r.id)!.responseTimeWeeks === 1 ? "week" : "weeks"}`), JSON.stringify(stated.filter((r) => !r.b.startsWith(`~${docs.get(r.id)!.responseTimeWeeks} `)).slice(0, 3).map((r) => r.b)));
    }
  });
  L.done(16);
});

/* ───────────────────────── D · long overdue ───────────────────────── */
test("CL192-D1 · overdue: 10 and 30 days over read 'Expected … · Nd over'; 31 reads 'Overdue since …'; 400 adds the year; one style", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-D1");
  const keys: FixKey[] = ["od10", "od30", "od31", "od400"];
  await withFix(page, SIZES[0], "CL192-D1", keys, async (sent) => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL192-D1");
      await waitRows(page, keys);
      const lines = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
        const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0);
        const q = row?.querySelector<HTMLElement>("[data-clv='qd']");
        const c = q ? getComputedStyle(q) : null;
        return [id, q ? { t: (q.textContent ?? "").trim(), over: q.classList.contains("clv-qd--over"), style: `${c!.color}|${c!.fontFamily}|${c!.fontStyle}|${c!.fontSize}|${c!.fontWeight}` } : null];
      })), keys.map(fixId));
      const exp = (k: FixKey) => expectedOf(sent[k]);
      const yr = (k: FixKey) => new Date(exp(k)).getFullYear();
      const want: Record<string, string> = {
        od10: `Expected ${dm(exp("od10"))} · 10d over`,
        od30: `Expected ${dm(exp("od30"))} · 30d over`,
        od31: `Overdue since ${dm(exp("od31"))}${yr("od31") === new Date().getFullYear() ? "" : ` ${yr("od31")}`}`,
        od400: `Overdue since ${dm(exp("od400"))} ${yr("od400")}`,
      };
      L.check(`${w} the 400-day fixture's expected date is in another year (precondition)`, yr("od400") !== new Date().getFullYear(), `${yr("od400")}`);
      for (const k of keys) {
        const l = lines[fixId(k)];
        L.check(`${w} ${k}: "${want[k]}"`, l?.t === want[k], `"${l?.t}"`);
        L.check(`${w} ${k}: the overdue treatment (.clv-qd--over)`, !!l?.over, `${l?.over}`);
      }
      const s10 = lines[fixId("od10")]?.style;
      for (const k of ["od31", "od400"] as const) L.check(`${w} ${k}: same colour and style as the 10-day line`, !!s10 && lines[fixId(k)]?.style === s10, `${lines[fixId(k)]?.style} vs ${s10}`);
    }
  });
  L.done(20);
});

/* ───────────────────────── E · imported ───────────────────────── */
const readDates = (page: Page, ids: string[]) => page.evaluate((ids) => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const row0 = vis(".aglist [data-clv='row'][data-agent-card]")[0];
  const track = row0 ? parseFloat(getComputedStyle(row0).gridTemplateColumns.split(" ")[1]) : NaN;
  const cells = Object.fromEntries(ids.map((id) => {
    const row = vis(`.aglist [data-clv='row'][data-agent-card="${id}"]`)[0];
    const cell = row?.querySelector<HTMLElement>(".cl19-cd"), d = cell?.querySelector<HTMLElement>("[data-cl19='date']"), lab = cell?.querySelector<HTMLElement>("[data-cl192='imported']");
    const db = d?.getBoundingClientRect(), lb = lab?.getBoundingClientRect(), cb = cell?.getBoundingClientRect();
    const c = lab ? getComputedStyle(lab) : null;
    return [id, cell ? { date: (d?.textContent ?? "").trim(), label: lab ? (lab.textContent ?? "").trim() : null,
      under: !!db && !!lb && lb.top >= db.bottom - 1, sameLeft: !!db && !!lb && Math.abs(lb.left - db.left) <= 1, fits: !!cb && cell!.scrollWidth <= cell!.clientWidth + 1 && (!lb || lb.right <= cb.right + 0.5),
      font: c ? { style: c.fontStyle, size: c.fontSize, face: c.fontFamily, color: c.color } : null } : null];
  }));
  return { track, cells };
}, ids);
test("CL192-E1 · imported: an imported agent shows 'Imported' under its date, a hand-added one doesn't; the Date added column's width is unchanged by the label", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-E1");
  const keys: FixKey[] = ["imp1", "imp2", "hand", "mat"];
  const ids = keys.map(fixId);
  await withFix(page, SIZES[0], "CL192-E1", keys, async () => {
    const { db, uid } = await harnessDb();
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL192-E1");
      await waitRows(page, keys);
      const on = await readDates(page, ids);
      for (const k of ["imp1", "imp2"] as const) {
        const c = on.cells[fixId(k)];
        L.check(`${w} ${k}: "Imported" under its date, on its left`, c?.label === "Imported" && c.under && c.sameLeft, JSON.stringify(c));
        L.check(`${w} ${k}: serif italic 12.5px, ink at 50%`, !!c?.font && c.font.style === "italic" && c.font.size === "12.5px" && /serif/i.test(c.font.face) && !/sans/i.test(c.font.face) && c.font.color === "rgba(28, 19, 15, 0.5)", JSON.stringify(c?.font));
        L.check(`${w} ${k}: the date and the label fit the cell (nothing past its edge)`, !!c?.fits, JSON.stringify(c));
      }
      /* the column matcher's path (v19.2 §E follow-up): an agent exactly as `matcherAgentDoc` builds it. Its red-first
         is the unit lock (importedAgent.test.ts, red with the flag removed from the helper): on the base build the
         matcher wrote no flag, but a fixture seeded today carries whatever the helper says, so this clause can only
         read the page's half — that a flagged matcher agent is labelled like the rest */
      const m = on.cells[fixId("mat")];
      L.check(`${w} mat: the column matcher's agent shows "Imported" under its date`, m?.label === "Imported" && m.under && m.sameLeft, JSON.stringify(m));
      const h = on.cells[fixId("hand")];
      L.check(`${w} hand: a hand-added agent has its date and no label`, !!h && /^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(h.date) && h.label === null, JSON.stringify(h));
      /* the same rows with the flag off: the Date added column must not move (the label is measured out) */
      for (const k of ["imp1", "imp2"] as const) await updateDoc(doc(db, "users", uid, "agents", fixId(k)), { importedNeedsReview: false });
      await page.waitForFunction((ids) => ids.every((id) => { const r = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0); return r && !r.querySelector("[data-cl192='imported']"); }), [fixId("imp1"), fixId("imp2")], { timeout: 30_000 }).catch(() => null);
      await page.waitForTimeout(600);
      const off = await readDates(page, ids);
      L.check(`${w} with the flag off the labels are gone (precondition)`, [fixId("imp1"), fixId("imp2")].every((id) => off.cells[id]?.label === null), "");
      L.check(`${w} the Date added column's width with and without the labels is the same ±1`, near(on.track - off.track, 0, 1), `${on.track} with · ${off.track} without`);
      for (const k of ["imp1", "imp2"] as const) await updateDoc(doc(db, "users", uid, "agents", fixId(k)), { importedNeedsReview: true });
      await page.waitForTimeout(800);
    }
  });
  L.done(18);
});

/* ───────────────────────── F · stacked at 1280 ───────────────────────── */
/* "The email's top is within 2px of the name's top line": read as the email's vertical CENTRE against the CENTRE of the
   name's first line box. The email is 14px type beside a 19px name, so their tops sit ~4px apart when they share a line
   and the line is level; centres are the honest reading of "on the first line". The tops are reported beside it. */
test("CL192-F1 · stacked: at 1280, a row with an email and no website has the email on the name's line (centres ±2), '+ Add website' under it", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-F1");
  const vp = SIZES[1], w = `@${vp.width}`;
  await withFix(page, vp, "CL192-F1", ["both"], async () => {
    await open(page, vp, "CL192-F1");
    await waitRows(page, ["both"]);
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const range = document.createRange();
      return { stacked: vis(".aglist [data-cl19-stacked]").length > 0, rows: vis(".aglist [data-clv='row'][data-agent-card]").map((row) => {
        const cs = row.querySelector<HTMLElement>("[data-cl19='contacts']"); if (!cs) return null;
        const nm = row.querySelector<HTMLElement>(".clv-rwn b"); if (!nm) return null;
        range.selectNodeContents(nm); const n1 = range.getClientRects()[0];
        const em = cs.querySelector<HTMLElement>("[data-cl19='email']")?.getBoundingClientRect();
        const web = cs.querySelector<HTMLElement>("[data-cl19='website']")?.getBoundingClientRect();
        const add = cs.querySelector<HTMLElement>("[data-cl19='add-website']");
        const ab = add?.getBoundingClientRect(), mt = add?.querySelector<HTMLElement>(".cl19-mt");
        return { id: row.dataset.agentCard!, nameC: n1 ? (n1.top + n1.bottom) / 2 : NaN, nameTop: n1?.top ?? NaN,
          emC: em ? (em.top + em.bottom) / 2 : null, emTop: em?.top ?? null, emBottom: em?.bottom ?? null,
          webC: web ? (web.top + web.bottom) / 2 : null, addTop: ab?.top ?? null, addVis: mt ? getComputedStyle(mt).visibility : null, mailFirst: cs.hasAttribute("data-mail-first") };
      }).filter(Boolean) as { id: string; nameC: number; nameTop: number; emC: number | null; emTop: number | null; emBottom: number | null; webC: number | null; addTop: number | null; addVis: string | null; mailFirst: boolean }[] };
    });
    L.check(`${w} website and email are stacked (precondition)`, r.stacked, `${r.stacked}`);
    const mailOnly = r.rows.filter((x) => x.emC != null && x.webC == null);
    L.check(`${w} the population: rows with an email and no website`, mailOnly.length >= 3, `${mailOnly.length}`);
    for (const x of mailOnly) {
      L.check(`${w} ${x.id}: the email's centre is within 2px of the name's first-line centre`, near((x.emC ?? NaN) - x.nameC, 0, 2), `centres ${((x.emC ?? NaN) - x.nameC).toFixed(1)} · tops ${((x.emTop ?? NaN) - x.nameTop).toFixed(1)}`);
      L.check(`${w} ${x.id}: the hidden "+ Add website" is under the email, still hidden at rest`, x.addTop != null && x.addTop >= (x.emBottom ?? Infinity) - 1 && x.addVis === "hidden", `${x.addTop} vs ${x.emBottom} · ${x.addVis}`);
    }
    const both = r.rows.find((x) => x.id === fixId("both"));
    /* unchanged from v19.1: the website on line 1 and the email under it (the website's own centre sits ~3.5 below the
       name's in v19.1 and here alike — its icon box, not this pack; the order is what §F leaves alone) */
    L.check(`${w} a row with both is unchanged: the website on line 1, the email under it`, !!both && both.webC != null && near(both.webC - both.nameC, 0, 5) && (both.emTop ?? -Infinity) > both.webC && !both.mailFirst, JSON.stringify(both));
  });
  L.done(10);
});

/* ───────────────────────── G · one count for gaps ───────────────────────── */
test("CL192-G1 · gaps: the List health card has no 'gaps to fill' text; the Fill button still shows the count; the ring still opens Housekeeping", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL192-G1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL192-G1");
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const card = vis("[data-cl17='card']")[0], hb = card?.querySelector<HTMLElement>("[data-cl17='health']");
      const fill = vis("[data-cl183='fill-n']")[0];
      return { card: !!card, text: (card?.textContent ?? "").replace(/\s+/g, " ").trim(), gapsEl: !!card?.querySelector("[data-cl17='health-gaps']"),
        healthText: (hb?.textContent ?? "").replace(/\s+/g, " ").trim(), label: hb?.getAttribute("aria-label") ?? "", fill: fill ? (fill.textContent ?? "").trim() : null,
        fillBtn: fill ? (fill.closest("button")?.textContent ?? "").replace(/\s+/g, " ").trim() : null };
    });
    const n = Number(/(\d+) gaps? to fill/.exec(r.label)?.[1] ?? NaN);
    L.check(`${w} the card and its List health are there; the account has gaps (precondition)`, r.card && n > 0, `${r.label}`);
    L.check(`${w} the card has no "gaps to fill" text`, r.card && !/gaps? to fill/i.test(r.text) && !r.gapsEl, `"${r.text.slice(0, 120)}"`);
    L.check(`${w} the card ends at "List health"`, /List health$/.test(r.healthText), `"${r.healthText}"`);
    L.check(`${w} "Fill in the gaps" shows the count (${n})`, r.fill === String(n) && /^Fill in the gaps\s*\d+$/.test(r.fillBtn ?? ""), `"${r.fillBtn}" · ${r.fill}`);
    await page.locator(".aglist [data-cl17='health']").filter({ visible: true }).first().click();
    const opened = await page.locator('[data-hdr="housekeeping"].is-in').first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
    L.check(`${w} the ring opens Housekeeping`, opened, `${opened}`);
    for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  }
  L.done(10);
});

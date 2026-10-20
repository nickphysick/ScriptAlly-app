/**
 * Comparable titles v25 — the rendered-page locks (CV25). Each is measured on the page the app
 * serves, on the fixture `seedCompsV25.mjs` writes, at 1512 × 900 and 1280 × 800 unless noted.
 *
 *   A1 ids · A3 fixed · E2 picker          (A2 and A4 are unit locks)
 *   Comps v28 retired B1, B2, D1–D4, E1, F1 and L1 with the v25 list (tests/e2e/RETIRED-comps-v28.md); the three data
 *   locks here are re-pointed from list rows to the shelf's cards.
 *
 * MUTATIONS. All three are breaks in the source and need a rebuilt bundle; `cv25Mutations.sh` makes the edit,
 * rebuilds, runs the lock and puts the file back.
 *
 * ⚠️ THE WRITING CASES (A1, A3, E2) RE-SEED FIRST AND THE FIXTURE IS REMOVED AFTER THE RUN.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { MS, SIZES, type Vp, dump, openComps, pixelAt, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v25";
const MUT = process.env.CV25_MUTATE ?? "";
const near = (a: number, b: number, t = 1) => Math.abs(a - b) <= t;
/** JSON with its keys in order: the SDK hands a map's keys back in no fixed order, so two reads of one document can differ as text. */
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

const MUTATIONS: Record<string, { css?: string; js?: string; what: string }> = {};
const SOURCE_MUTATIONS = ["A1", "A3", "E2"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  /** a reading has already failed: a case that drives the page further on a broken premise would wait out its whole timeout */
  get red() { return this.rows.some((r) => !r.ok); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function mutate(page: Page, lock: string) {
  if (MUT !== lock) return;
  const m = MUTATIONS[lock];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}
async function open(page: Page, vp: Vp, lock: string, o: Parameters<typeof openComps>[2] = {}) {
  await openComps(page, vp, o);
  await mutate(page, lock);
}
const P = '[data-cv="page"] ';
const W = "(window as any)";
void W;

/* what the fixture holds (seedCompsV25.mjs) */
const FX = {
  comps: 7, books: 5, screen: 2, sent: 14, logged: 9, rate: "64%", mostUsed: 9, notInLetter: 4, needFirst: 1,
  order: ["The Tidewater Line", "Salt Road", "Nine Miles Out", "Bright Water", "Kestrel Hour", "The Ferry at Dusk", "Last Crossing"],
  tideQueries: ["06", "07", "08", "09", "10", "11", "12", "13", "14"].map((n) => `cv25-q-${n}`),
  L1: "cv25-let-1", L2: "cv25-let-2", L3: "cv25-let-3",
};

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

test.describe("Comparable titles v25", () => {
  /* comps v27: the h1 is "Comparable titles" on one line, and the subline no longer names the manuscript */
  /* comps v28 retired B1 (title panel), B2 (strip), D1–D4 (list heading, bar, column sort, grouping), E1 (row opens the
     drawer), F1 (full screen) and L1 (panel loading) with the list they measured (tests/e2e/RETIRED-comps-v28.md). The data
     locks below stay, re-pointed from list rows to the shelf's cards. */

  test("A1 · ids: every comp the page writes has a unique id, and an id survives an edit, an add and a remove", async ({ page }) => {
    const L = new Ledger("A1");
    seed("--empty");
    const before = dump();
    const had = before.comps.filter((c) => c.id).map((c) => c.id as string);
    L.check("the fixture holds a comp with no id", before.comps.length === FX.comps && had.length === FX.comps - 1, `${had.length} of ${before.comps.length} have ids`);
    await open(page, SIZES[0], "A1");
    await scrollTo(page, '[data-cx="shelf"]', 24);
    /* edit Salt Road's publisher (comps v28: its card opens the drawer) */
    await page.locator(`${P}[data-cx="card"][aria-label="Salt Road"]`).click();
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator('[data-cv="drawer-edit"]').click();
    await page.locator("#cpv-f-pub").fill("Faber & Faber");
    await page.locator('[data-hdr="comp"] [data-cf="save"]').click(); /* comps v26: the form's buttons are the drawer's pinned foot */
    await expect.poll(() => (dump().comps.find((c) => c.title === "Salt Road") as any)?.publisher, { timeout: 20_000 }).toBe("Faber & Faber");
    const a = dump();
    const ids = a.comps.map((c) => c.id as string | undefined);
    L.check("after an edit: every comp has an id", ids.every((i) => typeof i === "string" && /^cmp_/.test(i)), ids.join(" "));
    L.check("after an edit: the ids are unique", new Set(ids).size === ids.length, `${new Set(ids).size} distinct of ${ids.length}`);
    L.check("after an edit: every id that existed is unchanged, on the same comp", before.comps.every((c, i) => !c.id || a.comps[i].id === c.id), before.comps.map((c, i) => `${c.id ?? "(none)"}→${a.comps[i].id}`).join(" "));
    L.check("after an edit: the order is the writer's", a.comps.map((c) => c.title).join("|") === FX.order.join("|"), a.comps.map((c) => c.title).join(" · "));
    if (L.red) { L.done(8); return; }
    const kestrel = a.comps.find((c) => c.title === "Kestrel Hour")!.id as string;
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* add a comp: it gets an id of its own; nothing else moves */
    await page.keyboard.press("n");
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator("#cpv-f-title").fill("Low Water");
    await page.locator("#cpv-f-year").fill("2024");
    await page.locator('[data-hdr="comp"] [data-cf="save"]').click(); /* comps v26: the form's buttons are the drawer's pinned foot */
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps + 1);
    const b = dump();
    const bid = b.comps.map((c) => c.id as string);
    L.check("after an add: unique ids, the new one its own", new Set(bid).size === bid.length && !ids.includes(bid[bid.length - 1]), bid.join(" "));
    L.check("after an add: every earlier id is unchanged", a.comps.every((c, i) => b.comps[i].id === c.id) && b.comps.find((c) => c.title === "Kestrel Hour")!.id === kestrel, "earlier ids");
    if (L.red) { L.done(8); return; }
    /* remove it through the drawer, then Undo: it comes back with the SAME id */
    const added = bid[bid.length - 1];
    /* a plain Add closes the drawer, so the new comp is opened from its card; Remove is in the edit form's foot */
    await page.waitForTimeout(700);
    await page.locator(`${P}[data-cx="card"][aria-label="Low Water"]`).click();
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.locator('[data-cv="drawer-edit"]').click();
    await page.locator('[data-hdr="comp"] [data-cf="remove"]').click();
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps);
    await page.locator(".sa-toast-undo").last().click();
    await expect.poll(() => dump().comps.length, { timeout: 20_000 }).toBe(FX.comps + 1);
    const c = dump();
    L.check("after remove and Undo: the same id comes back", c.comps[c.comps.length - 1].id === added && new Set(c.comps.map((x) => x.id)).size === c.comps.length, `${c.comps[c.comps.length - 1].id} of ${added}`);
    L.done(8);
  });

  test("E2 · picker: Save writes compIds to the chosen letter only; Undo restores it exactly", async ({ page }) => {
    const L = new Ledger("E2");
    seed("--empty");
    const before = dump();
    await open(page, SIZES[0], "E2");
    await scrollTo(page, '[data-cx="shelf"]', 24);
    /* Nine Miles Out is in no letter: its card's "Log in a letter" opens the picker on the CURRENT letter (v3, not sent), ticked */
    /* everything that changes INSIDE the picker after it is first put in the document. An attribute record carries the
       value it had before, so the first frame's letter is known whenever this callback runs. */
    await page.evaluate(() => {
      const w = window as any; w.__pk = [];
      new MutationObserver((recs) => {
        for (const r of recs) {
          const el = (r.target.nodeType === 1 ? r.target : r.target.parentElement) as HTMLElement | null;
          if (!el || !el.closest('[data-cv="picker"]') || r.type === "childList") continue;
          w.__pk.push({ what: r.type === "attributes" ? r.attributeName : "text", on: el.getAttribute("data-cv") ?? el.tagName, was: r.oldValue });
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-letter", "data-fixed", "aria-checked", "aria-pressed"], characterData: true, characterDataOldValue: true });
    });
    await page.locator(`${P}[data-cx="card"][aria-label="Nine Miles Out"] [data-cx="slip-pick"]`).click();
    await page.waitForSelector('[data-cv="picker"]');
    /* ⚠️ THE FIRST FRAME (comps v26.1). The picker opens with its letter already chosen: this reads it the moment it
       mounts, with no wait. v26 waited for it to settle, because the picker chose its letter in an effect. */
    const p0 = await page.evaluate(() => { const p = document.querySelector('[data-cv="picker"]') as HTMLElement; return { letter: p.dataset.letter, fixed: p.dataset.fixed, on: [...p.querySelectorAll('[data-cv="picker-comp"][aria-checked="true"]')].map((x) => (x as HTMLElement).dataset.key), count: p.querySelector('[data-cv="picker-count"]')!.textContent, off: [...p.querySelectorAll('[data-cv="picker-comp"][aria-disabled="true"]')].map((x) => x.querySelector("b")!.textContent) }; });
    L.check("opens on the current letter, not fixed", p0.letter === FX.L3 && p0.fixed === "false", `${p0.letter} · fixed ${p0.fixed}`);
    L.check("its record plus the comp the door named", [...p0.on].sort().join("|") === ["cmp_cv25last", "cmp_cv25nine", "cmp_cv25tide"].join("|") && p0.count === "3 comps named", `${p0.on} · ${p0.count}`);
    L.check("a comp that is not ready cannot be ticked", p0.off.join("|") === "The Ferry at Dusk", p0.off.join(","));
    await page.waitForTimeout(600);
    const pk = await page.evaluate(() => (window as any).__pk as { what: string; on: string; was: string | null }[]);
    const first = pk.find((x) => x.what === "data-letter" && x.on === "picker");
    L.check("first frame: the letter is chosen when the picker is first drawn", (first ? first.was : p0.letter) === FX.L3, first ? `drawn with "${first.was}", then changed` : `${p0.letter}`);
    L.check("first frame: nothing in the picker changes after it is drawn", pk.length === 0, pk.length ? pk.slice(0, 6).map((x) => `${x.on} ${x.what} was "${x.was}"`).join(" · ") : "0 changes");
    await page.locator('[data-cv="picker-save"]').click();
    await expect.poll(() => (dump().letters[FX.L3]?.compIds ?? []).length, { timeout: 20_000 }).toBe(3);
    const a = dump();
    L.check("the chosen letter has the three", [...(a.letters[FX.L3].compIds ?? [])].sort().join("|") === ["cmp_cv25last", "cmp_cv25nine", "cmp_cv25tide"].join("|"), JSON.stringify(a.letters[FX.L3].compIds));
    L.check("no other letter changed", JSON.stringify(a.letters[FX.L1]) === JSON.stringify(before.letters[FX.L1]) && JSON.stringify(a.letters[FX.L2]) === JSON.stringify(before.letters[FX.L2]) && Object.keys(a.letters).length === 3, JSON.stringify({ l1: a.letters[FX.L1].compIds, l2: a.letters[FX.L2].compIds }));
    L.check("the unrecorded letter is still unrecorded", a.letters[FX.L1].compIds === null, `${JSON.stringify(a.letters[FX.L1].compIds)}`);
    L.check("the comps were not rewritten", stable(a.comps) === stable(before.comps), a.comps.map((c, i) => (stable(c) === stable(before.comps[i]) ? "=" : `${stable(before.comps[i])} → ${stable(c)}`)).join(" "));
    /* the toast IS the undo: nothing navigates before it is pressed */
    const undo = page.locator(".sa-toast-undo").last();
    L.check("Undo is offered", (await undo.count()) > 0, "toast");
    /* with no Undo to press there is nothing more to read, and a click would wait out the whole timeout */
    if (!(await undo.count())) { L.done(11); return; }
    await undo.click();
    await expect.poll(() => JSON.stringify(dump().letters[FX.L3]?.compIds), { timeout: 20_000 }).toBe(JSON.stringify(before.letters[FX.L3].compIds));
    const u = dump();
    L.check("Undo restores every letter exactly", JSON.stringify(u.letters) === JSON.stringify(before.letters), JSON.stringify(u.letters[FX.L3].compIds));
    L.done(11);
  });

  test("A3 · fixed: a sent, recorded letter offers no checkbox and makes a new version; a sent, unrecorded one accepts one save", async ({ page }) => {
    const L = new Ledger("A3");
    seed("--empty");
    const before = dump();
    await open(page, SIZES[0], "A3");
    const state = () => page.evaluate(() => {
      const p = document.querySelector('[data-cv="picker"]') as HTMLElement;
      const li = [...p.querySelectorAll('[data-cv="picker-comp"]')] as HTMLElement[];
      return { letter: p.dataset.letter, fixed: p.dataset.fixed, can: li.filter((x) => x.getAttribute("aria-disabled") === "false").length, on: li.filter((x) => x.getAttribute("aria-checked") === "true").map((x) => x.dataset.key), save: !!p.querySelector('[data-cv="picker-save"]'), newv: p.querySelector('[data-cv="picker-newv"]')?.textContent ?? null, notice: p.querySelector('[data-cv="picker-notice"]')?.textContent ?? "", locks: [...p.querySelectorAll('[data-cv="picker-letter"]')].map((b) => `${(b as HTMLElement).dataset.letter}:${b.querySelector("svg") ? "lock" : "open"}`) };
    });
    /* the notice's door opens the picker on the unrecorded letter (comps v28: the one notice under the header) */
    await page.locator(`${P}[data-cx="notice-log"]`).click();
    await page.waitForSelector('[data-cv="picker"]');
    const s1 = await state();
    L.check("v1: sent, nothing recorded, open to one save", s1.letter === FX.L1 && s1.fixed === "false" && s1.save && s1.can === FX.comps - 1 && s1.on.length === 0, `${s1.letter} · fixed ${s1.fixed} · ${s1.can} tickable`);
    L.check("v1: the notice says its queries are tracked too", s1.notice === "QL v1 has already gone out with 5 queries. Log what it mentioned and those queries are tracked too.", s1.notice);
    L.check("sent letters carry a padlock", s1.locks.join("|") === `${FX.L1}:lock|${FX.L2}:lock|${FX.L3}:open`, s1.locks.join(" "));
    /* v2 is fixed */
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L2}"]`).click();
    const s2 = await state();
    L.check("v2: fixed, no checkbox", s2.fixed === "true" && s2.can === 0 && !s2.save, `fixed ${s2.fixed} · ${s2.can} tickable · save ${s2.save}`);
    L.check("v2: its record is shown, read-only", [...s2.on].sort().join("|") === "cmp_cv25salt|cmp_cv25tide", s2.on.join(","));
    L.check("v2: the notice and the door", s2.notice === "QL v2 has gone out with 9 queries, so its comps are fixed. To change them, make a new version of the letter." && s2.newv === "New version of QL v2", `${s2.notice} · ${s2.newv}`);
    /* a click on a fixed letter's comp changes nothing */
    /* dispatched on the element: Playwright's own click waits out the whole timeout on an aria-disabled target */
    await page.evaluate(() => (document.querySelectorAll('[data-cv="picker-comp"]')[2] as HTMLElement).click());
    await page.waitForTimeout(150);
    L.check("v2: a click ticks nothing", (await state()).on.length === 2, "ticks after a click");
    if (L.red) { L.done(12); return; }
    await page.locator('[data-cv="picker-newv"]').click();
    await expect.poll(() => Object.keys(dump().letters).length, { timeout: 20_000 }).toBe(4);
    const a = dump();
    const made = Object.entries(a.letters).find(([id]) => !(id in before.letters))!;
    L.check("New version: the next name, the same comps", made[1].name === "Query letter v4" && JSON.stringify(made[1].compIds) === JSON.stringify(before.letters[FX.L2].compIds), `${made[1].name} · ${JSON.stringify(made[1].compIds)}`);
    L.check("New version: v2 is untouched", JSON.stringify(a.letters[FX.L2]) === JSON.stringify(before.letters[FX.L2]), JSON.stringify(a.letters[FX.L2]));
    await page.waitForFunction((id) => (document.querySelector('[data-cv="picker"]') as HTMLElement)?.dataset.letter === id, made[0], { timeout: 15_000 });
    const s3 = await state();
    L.check("New version: the picker moves to it, and it can be edited", s3.fixed === "false" && s3.save && s3.on.length === 2, `fixed ${s3.fixed} · ${s3.on.length} ticked`);
    /* v1 accepts ONE save, and is then fixed */
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L1}"]`).click();
    await page.locator('[data-cv="picker-comp"][data-key="cmp_cv25brit"]').click();
    await page.locator('[data-cv="picker-save"]').click();
    await expect.poll(() => JSON.stringify(dump().letters[FX.L1]?.compIds), { timeout: 20_000 }).toBe(JSON.stringify(["cmp_cv25brit"]));
    await page.waitForTimeout(600);
    const rows = await page.evaluate(() => { const w = window as any; const r = (w.__qa('[data-cx="card"]') as HTMLElement[]).find((x) => x.dataset.key === "cmp_cv25brit")!; return { where: r.dataset.where, n: (r.querySelector('[data-cx="slip-queries"]')?.textContent ?? ""), unrec: w.__qa('[data-cx="notice"]').length, rate: w.__q('[data-slh="ring-pct"]').textContent }; });
    L.check("v1 saved once: its five queries are tracked", rows.where === "sent" && rows.n.startsWith("5 queries") && rows.unrec === 0 && rows.rate === "100%", JSON.stringify(rows));
    /* comps v27: the door into the picker is in the "How comp tracking works" pop-up now */
    await page.evaluate(() => { const sc = (window as any).__cv().closest(".wpg-scroll") as HTMLElement; sc.scrollTop = 0; });
    await page.locator(`${P}[data-cx="how-link"]`).click();
    await page.locator('[data-cv="how-pop"] [data-cv="how-pick"]').click();
    await page.waitForSelector('[data-cv="picker"]');
    await page.locator(`[data-cv="picker-letter"][data-letter="${FX.L1}"]`).click();
    const s4 = await state();
    L.check("v1 is now fixed", s4.fixed === "true" && s4.can === 0 && !s4.save, `fixed ${s4.fixed} · ${s4.can} tickable`);
    L.done(12);
  });
});

test("CV25 · every lock has a named mutation", () => {
  expect([...Object.keys(MUTATIONS), ...SOURCE_MUTATIONS].sort()).toEqual(["A1", "A3", "E2"]);
});

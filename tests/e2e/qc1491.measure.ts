/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.1 (design-refs/query-centre-v149-1/) — the QC1491 locks, at 1280×800 and 1512×900 (L11 at 1920×1080
 * and 1440×900). Each proves its population before it asserts, and each was red first (base build, or its named
 * mutation: QC1491_MUTATE=<lock> for the page-level ones, a source edit for the rest; see the report).
 *
 * ⚠️ ITS FIXTURE IS ITS OWN (tests/e2e/seedQc1491.mjs, seeded in beforeAll and removed in afterAll): the harness account
 *    holds no request-and-answer story, no manuscript without a word count, no query with nothing dated, no requery and
 *    no name in capitals. QC1491_KEEP=1 leaves it seeded between runs.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { box, css, text, tap } from "./qc149Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);
const DIR = "reports/qc-v149-1";
const MUT = process.env.QC1491_MUTATE ?? "";
const BASE = process.env.QC1491_BASE === "1";
const ONLY = process.env.QC1491_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }].filter((v) => !process.env.QC1491_SIZE || String(v.width) === process.env.QC1491_SIZE);
const CARD = "[data-qp='panel'] [data-qc149c='card']";

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const mutateCss = async (page: Page, lock: string, rule: string) => { if (MUT === lock) await page.addStyleTag({ content: rule }); };

test.beforeAll(() => { execSync("node tests/e2e/seedQc1491.mjs", { stdio: "ignore" }); });
test.afterAll(() => { if (process.env.QC1491_KEEP !== "1") execSync("node tests/e2e/seedQc1491.mjs --clean", { stdio: "ignore" }); });

const rowSel = (id: string) => `.qc138-sheet [data-qcv='row'][data-id="${id}"]`;
async function open(page: Page, id: string) {
  await page.locator(rowSel(id)).first().scrollIntoViewIfNeeded();
  /* the agent's name, not First queried: on an undated row that cell is the "Add date" link */
  await page.locator(`${rowSel(id)} [data-qcv='row-name']`).first().click();
  await page.locator(CARD).first().waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900);
}
async function shut(page: Page) { if (await page.locator("[data-qp='panel']").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(700); } }
const hasRow = (page: Page, id: string) => page.evaluate((s) => !!document.querySelector(s), rowSel(id));

for (const vp of SIZES) {
  test.describe(`QC1491 @ ${vp.width}`, () => {
    test("L1 · the book block: the tile, a chip per present field, the package chip; no word count means no chip", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await openQc(page, vp);
      L.check("population: the seeded query is listed", await hasRow(page, "qc1491-q1"), "qc1491-q1 not in the list");
      await open(page, "qc1491-q1");
      const read = () => page.evaluate((s) => {
        const c = document.querySelector(s);
        return { tile: !!c?.querySelector("[data-qc149c='book-tile'] svg"), chips: [...(c?.querySelectorAll<HTMLElement>("[data-qc149c='book-chip']") ?? [])].map((e) => e.textContent?.trim() ?? ""), pkg: c?.querySelector("[data-qc149c='package']")?.textContent?.trim() ?? null };
      }, CARD);
      const a = await read();
      L.check("the book tile with its icon", a.tile, JSON.stringify(a));
      L.check("age category and genre (the manuscript's)", a.chips.includes("Adult") && a.chips.includes("Book club"), JSON.stringify(a.chips));
      L.check("word count 0 is no chip — absent, not blank", !a.chips.some((c) => /words/i.test(c)) && a.chips.every((c) => c.length > 0), JSON.stringify(a.chips));
      L.check("the package chip reads No package", /no package/i.test(a.pkg ?? ""), String(a.pkg));
      await shut(page);
      /* a query whose manuscript has a word count: the chip is there, in the record's own number */
      await open(page, "qc1491-q2");
      const b = await read();
      L.check("population: a manuscript with a word count", b.chips.length > 0, JSON.stringify(b));
      L.check("…its word count chip reads '92,000 words'", b.chips.includes("92,000 words"), JSON.stringify(b.chips));
      L.done(7);
    });

    test("L2 · the steps: a request rust, its answer green with a ✓, a note in italics, an undated step's Add date", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await openQc(page, vp);
      await mutateCss(page, "L2", ".qc149c .qc149c-ch.ask, .qc149c .qc149c-ch.ok { background: #f5f1ea !important; color: #5f5a53 !important; }");
      await open(page, "qc1491-q1");
      const s = await page.evaluate((c) => {
        const steps = [...document.querySelectorAll<HTMLElement>(`${c} [data-qc149c='step']`)];
        const by = (st: string) => steps.find((x) => x.dataset.status === st);
        const chip = (el: HTMLElement | undefined) => { const ch = el?.querySelector<HTMLElement>("[data-qc149c='chip']"); return ch ? { tone: ch.dataset.tone, bg: getComputedStyle(ch).backgroundColor, tick: !!ch.querySelector("svg path[d^='M3.5 8.5']"), text: ch.textContent?.trim() } : null; };
        const note = by("Revise & Resubmit")?.querySelector<HTMLElement>("[data-qc149c='step-note']");
        const nudge = steps.find((x) => x.dataset.kind === "nudge");
        return { n: steps.length, req: chip(by("Full Requested")), sent: chip(by("Full Sent")), note: note ? { text: note.textContent, style: getComputedStyle(note).fontStyle } : null, nudgeAdd: nudge?.querySelector("[data-qc149c='add-date']")?.textContent ?? null };
      }, CARD);
      L.check("population: the seeded story's steps", s.n >= 5, String(s.n));
      L.check("the request's chip is rust (#f5e6df)", s.req?.tone === "ask" && s.req.bg === "rgb(245, 230, 223)", JSON.stringify(s.req));
      L.check("the send that answers it is green (#e4ece1) with a ✓", s.sent?.tone === "ok" && s.sent.bg === "rgb(228, 236, 225)" && s.sent.tick, JSON.stringify(s.sent));
      L.check("the R&R's note is the agent's words, quoted, in italics", !!s.note && /middle third drags/.test(s.note.text ?? "") && s.note.style === "italic", JSON.stringify(s.note));
      L.check("the undated nudge says Add date", s.nudgeAdd === "Add date", String(s.nudgeAdd));
      /* Add date opens edit mode at that step's date field */
      await tap(page, `${CARD} [data-qc149c='step'][data-kind='nudge'] [data-qc149c='add-date']`);
      await page.waitForTimeout(700);
      const ed = await page.evaluate((c) => ({ mode: document.querySelector<HTMLElement>(c)?.dataset.mode, focus: (document.activeElement as HTMLElement | null)?.dataset?.qc149c ?? null }), CARD);
      L.check("Add date opens edit mode, focused on a date field", ed.mode === "edit" && ed.focus === "step-date", JSON.stringify(ed));
      await tap(page, `${CARD} [data-qc149c='cancel']`);
      L.done(6);
    });

    test("L3 · open queries end with a faint next step from the next-move rule; closed ones have none", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await openQc(page, vp);
      await open(page, "qc1491-q1");
      const a = await page.evaluate((c) => { const n = document.querySelector<HTMLElement>(`${c} [data-qc149c='next-step']`); return n ? { title: n.querySelector("[data-qc149c='next-title']")?.textContent, why: n.querySelector("[data-qc149c='next-why']")?.textContent, faint: getComputedStyle(n.querySelector<HTMLElement>(".qc149c-t")!).fontStyle, last: n === n.parentElement?.lastElementChild } : null; }, CARD);
      L.check("population: an open query", await hasRow(page, "qc1491-q1"), "missing");
      L.check("it ends with the next step, faint (italic)", !!a && a.last && a.faint === "italic", JSON.stringify(a));
      L.check("…which is the rule's own: the revision is owed", a?.title === "Send the revision", JSON.stringify(a));
      L.check("…with a one-line reason from the record", /asked for it on/.test(a?.why ?? ""), JSON.stringify(a));
      await shut(page);
      await open(page, "qc1491-q2");
      const b = await page.evaluate((c) => ({ card: !!document.querySelector(`${c}[data-where='closed']`), next: !!document.querySelector(`${c} [data-qc149c='next-step']`) }), CARD);
      L.check("population: a closed query", b.card, JSON.stringify(b));
      L.check("a closed query has no next step", !b.next, JSON.stringify(b));
      L.done(6);
    });

    test("L4 · the strip at the pane's foot, tinted by court; its button runs the tray's action; closed has none; no stand block", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await openQc(page, vp);
      await open(page, "qc1491-q1");
      const g = await page.evaluate((c) => {
        const pane = document.querySelector<HTMLElement>(`${c} [data-pane='tracking']`); const st = document.querySelector<HTMLElement>(`${c} [data-qc149c='strip']`);
        if (!pane || !st) return null;
        return { gap: pane.getBoundingClientRect().bottom - st.getBoundingClientRect().bottom, bg: getComputedStyle(st).backgroundColor, btn: st.querySelector("[data-qc149c='strip-btn']")?.textContent ?? null,
          bold: st.querySelector("[data-qc149c='strip-bold']")?.textContent ?? "", stand: !!document.querySelector(`${c} [data-qc149c='stand']`) };
      }, CARD);
      L.check("population: the strip in Tracking", !!g, "no strip");
      L.check("its bottom is within 16px of the pane's", !!g && g.gap >= -0.5 && g.gap <= 16, JSON.stringify(g));
      L.check("the court's tint (With you #f5e6df)", g?.bg === "rgb(245, 230, 223)", String(g?.bg));
      L.check("the old 'where it stands' block is gone", g?.stand === false, String(g?.stand));
      L.check("the button is the next move's", g?.btn === "Mark sent", String(g?.btn));
      const slot = () => page.evaluate(() => (document.querySelector<HTMLElement>("[data-qp='panel'] [data-side-slot]")?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 80));
      await tap(page, `${CARD} [data-qc149c='strip-btn']`);
      await page.waitForTimeout(1200);
      const viaStrip = await slot();
      await page.keyboard.press("Escape"); await page.waitForTimeout(600); await shut(page);
      await page.locator(`${rowSel("qc1491-q1")} [data-qcv='row-first']`).first().hover();
      await page.waitForTimeout(500);
      await page.locator(`${rowSel("qc1491-q1")} [data-qcv='row-act']`).first().click({ force: false }).catch(() => {});
      await page.waitForTimeout(1200);
      const viaTray = await slot();
      L.check("the strip's button opens what the tray's does", viaStrip.length > 0 && viaStrip === viaTray, `strip "${viaStrip}" · tray "${viaTray}"`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(600); await shut(page);
      await open(page, "qc1491-q2");
      const c = await page.evaluate((s) => ({ strip: !!document.querySelector(`${s} [data-qc149c='strip']`), btn: !!document.querySelector(`${s} [data-qc149c='strip-btn']`), bold: document.querySelector(`${s} [data-qc149c='strip-bold']`)?.textContent ?? "" }), CARD);
      L.check("a closed query's strip says how it ended, with no button", c.strip && !c.btn && /^Passed on /.test(c.bold), JSON.stringify(c));
      L.done(7);
    });

    test("L5 · the footer: the status line, then the three links and N / M; no separate primary", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await openQc(page, vp);
      await open(page, "qc1491-q1");
      const f = await page.evaluate((c) => {
        const l1 = document.querySelector<HTMLElement>(`${c} [data-qc149c='foot-l1']`), l2 = document.querySelector<HTMLElement>(`${c} [data-qc149c='more']`);
        return { l1: !!l1, l2: !!l2, order: l1 && l2 ? l1.getBoundingClientRect().bottom <= l2.getBoundingClientRect().top + 0.5 : false,
          due: !!l1?.querySelector("[data-qc149c='due']"),
          links: [...(l2?.querySelectorAll<HTMLElement>("button[data-qc149c]") ?? [])].map((b) => b.dataset.qc149c).filter((k) => k !== "prev" && k !== "next"),
          pos: l2?.querySelector("[data-qc149c='pos']")?.textContent ?? null, primary: !!document.querySelector(`${c} [data-qc149c='primary']`) };
      }, CARD);
      L.check("population: both rows", f.l1 && f.l2, JSON.stringify(f));
      L.check("row 1 is the status line, above row 2", f.due && f.order, JSON.stringify(f));
      L.check("row 2: Record a response · Edit query · Close query", JSON.stringify(f.links) === JSON.stringify(["record", "edit", "close-query"]), JSON.stringify(f.links));
      L.check("…then N / M", /^\d+ \/ \d+$/.test(f.pos ?? ""), String(f.pos));
      L.check("no separate primary link", !f.primary, String(f.primary));
      L.done(5);
    });

    test("L6 · the Agent tab: wishlist or its invitation, four facts, every query to the agent, Contact; no 'Not recorded'", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await openQc(page, vp);
      const read = () => page.evaluate((c) => {
        const p = document.querySelector<HTMLElement>(`${c} [data-qc149c='agent-pane']`);
        return p ? { wish: p.querySelector("[data-qc149c='wish-text']")?.textContent ?? null, add: p.querySelector("[data-qc149c='wish-add']")?.textContent ?? null,
          facts: p.querySelectorAll("[data-qc149c='fact']").length, hist: p.querySelectorAll("[data-qc149c='hist-row']").length,
          cur: p.querySelectorAll("[data-qc149c='hist-row'][data-current]").length, ct: p.querySelectorAll("[data-qc149c='ct-row']").length,
          bad: /not recorded|not stated/i.test(document.querySelector<HTMLElement>("[data-qp='panel']")?.innerText ?? "") } : null;
      }, CARD);
      await open(page, "qc1491-q1");
      await tap(page, `${CARD} [data-qc149c='tab'][data-tab='agent']`); await page.waitForTimeout(400);
      const a = await read();
      L.check("population: the Agent tab", !!a, "no agent pane");
      L.check("the wishlist, in the agent's words", /book club fiction with a dark edge/.test(a?.wish ?? ""), JSON.stringify(a));
      L.check("exactly four fact cells", a?.facts === 4, String(a?.facts));
      L.check("'You and Sophie' lists every query to her in the data (3), the current one marked", a?.hist === 3 && a.cur === 1, JSON.stringify(a));
      L.check("Contact: email, website and submissions rows", a?.ct === 3, String(a?.ct));
      L.check("no visible 'Not recorded' or 'Not stated'", a?.bad === false, String(a?.bad));
      await shut(page);
      /* an agent with almost nothing recorded keeps the same shape */
      await open(page, "qc1491-q3");
      await tap(page, `${CARD} [data-qc149c='tab'][data-tab='agent']`); await page.waitForTimeout(400);
      const b = await read();
      L.check("population: a thin agent", !!b, "no agent pane");
      L.check("no wishlist: '+ Add their wishlist'", b?.add === "+ Add their wishlist", JSON.stringify(b));
      L.check("…still four fact cells", b?.facts === 4, String(b?.facts));
      L.check("…and no 'Not recorded' or 'Not stated'", b?.bad === false, String(b?.bad));
      L.done(10);
    });

    test("L7 · the column header row is white", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await openQc(page, vp);
      await mutateCss(page, "L7", ".qcv-group[data-v138] .qc138-sheet .qc138-heads { background: #e9edf3 !important; }");
      const c = await css(page, ".qcv-group[data-v138] .qc138-sheet .qc138-heads", ["background-color", "border-bottom-width"]);
      L.check("population: the header row", !!c, "none");
      L.check("its background is white", c?.["background-color"] === "rgb(255, 255, 255)", String(c?.["background-color"]));
      L.check("…over its hairline", parseFloat(c?.["border-bottom-width"] ?? "0") > 0, String(c?.["border-bottom-width"]));
      L.done(3);
    });

    test("L8 · What you sent: nothing at rest when nothing was sent, + Add on hover; only the sent items' icons otherwise", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await openQc(page, vp);
      await page.mouse.move(2, 2);
      await page.locator(rowSel("qc1491-q3")).first().scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2); await page.waitForTimeout(300);
      const rest = await page.evaluate((s) => { const r = document.querySelector(s); const add = r?.querySelector<HTMLElement>("[data-qcv='row-add']"); return { row: !!r, tiles: r?.querySelectorAll("[data-qcv='sent-tile']").length ?? -1, add: add ? getComputedStyle(add).visibility : "none" }; }, rowSel("qc1491-q3"));
      L.check("population: a row with nothing sent", rest.row, JSON.stringify(rest));
      L.check("at rest: no icons", rest.tiles === 0, JSON.stringify(rest));
      L.check("at rest: no + Add", rest.add !== "visible", JSON.stringify(rest));
      await page.locator(`${rowSel("qc1491-q3")} [data-qcv='row-first']`).first().hover(); await page.waitForTimeout(400);
      const hov = await page.evaluate((s) => { const a = document.querySelector<HTMLElement>(`${s} [data-qcv='row-add']`); return a ? getComputedStyle(a).visibility : "none"; }, rowSel("qc1491-q3"));
      L.check("on hover: + Add", hov === "visible", hov);
      await page.mouse.move(2, 2);
      const sent = await page.evaluate(() => { const t = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qcv='sent-tile']")].filter((x) => x.getBoundingClientRect().width > 0); return { n: t.length, states: [...new Set(t.map((x) => x.dataset.state))] }; });
      L.check("population: rows with sent items", sent.n > 0, JSON.stringify(sent));
      L.check("every icon shown is a sent item (no faded placeholders)", JSON.stringify(sent.states) === JSON.stringify(["sent"]), JSON.stringify(sent));
      L.done(6);
    });

    test("L9 · one wording for a missing date: no 'Not dated' or 'No date set'; the replacements are there", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await openQc(page, vp);
      const bad = () => page.evaluate(() => { const t = (document.querySelector<HTMLElement>(".qcv-group[data-v138]")?.innerText ?? "") + "\n" + (document.querySelector<HTMLElement>("[data-qp='panel']")?.innerText ?? ""); return (t.match(/not dated|no date set/gi) ?? []).slice(0, 4); });
      const r = await page.evaluate((s) => { const row = document.querySelector<HTMLElement>(s); return { row: !!row, sub: row?.querySelector<HTMLElement>("[data-qcv='row-standline']")?.innerText.trim() ?? null, first: row?.querySelector<HTMLElement>("[data-qcv='row-first-date']")?.innerText.trim() ?? null, link: !!row?.querySelector("[data-qcv='row-adddate']") }; }, rowSel("qc1491-q3"));
      L.check("population: the seeded undated query", r.row, JSON.stringify(r));
      L.check("its sub-line reads 'Sent, add date', the last two words a link", r.sub === "Sent, add date" && r.link, JSON.stringify(r));
      L.check("First queried reads 'Add date'", r.first === "Add date", JSON.stringify(r));
      await page.locator(`${rowSel("qc1491-q3")} [data-qcv='row-first']`).first().hover();
      await page.waitForTimeout(1500);
      const pk = await page.evaluate((s) => { const row = document.querySelector<HTMLElement>(s)?.closest(".qc138-row") ?? document.querySelector<HTMLElement>(s); const w = row?.querySelector<HTMLElement>(".qc138-peekw"); return { text: w?.innerText ?? "", even: !!w?.querySelector("[data-qcv='peek'][data-undated]"), axis: w?.querySelectorAll("[data-qcv='peek-axis']").length ?? -1, stops: w?.querySelectorAll("[data-qcv='peek-stop']").length ?? 0 }; }, rowSel("qc1491-q3"));
      L.check("the hover summary reads 'No dates yet'", /No dates yet/.test(pk.text), pk.text.slice(0, 80));
      L.check("…its steps evenly spaced, without a scale", pk.even && pk.axis === 0 && pk.stops >= 2, JSON.stringify(pk));
      L.check("no 'Not dated' / 'No date set' on the list", (await bad()).length === 0, JSON.stringify(await bad()));
      await page.mouse.move(2, 2);
      await open(page, "qc1491-q1");
      L.check("…nor in the card", (await bad()).length === 0, JSON.stringify(await bad()));
      L.done(7);
    });

    test("L13 · a later query to the same agent for the same book is tagged from the record", async ({ page }) => {
      test.skip(!run("L13"));
      const L = new Ledger(`L13-${vp.width}`);
      await openQc(page, vp);
      const t = await page.evaluate(() => Object.fromEntries(["qc1491-q1", "qc1491-q4"].map((id) => [id, document.querySelector<HTMLElement>(`.qc138-sheet [data-qcv='row'][data-id="${id}"] [data-qcv='row-twin']`)?.textContent ?? null])));
      L.check("population: both queries listed", (await hasRow(page, "qc1491-q1")) && (await hasRow(page, "qc1491-q4")), JSON.stringify(t));
      L.check("the requery reads RESUBMISSION", t["qc1491-q4"] === "RESUBMISSION", JSON.stringify(t));
      L.check("the first query has no tag", t["qc1491-q1"] === null, JSON.stringify(t));
      L.done(3);
    });
  });
}

test.describe("QC1491 · L10 casing, L11 push", () => {
  test("L10 · an all-caps name is title-cased by the migration; mixed case is left alone", async ({ page }) => {
    test.skip(!run("L10") || BASE);
    const L = new Ledger("L10");
    const out = MUT === "L10" ? "skipped" : execSync("node tests/e2e/migrateNameCase.mjs --apply", { encoding: "utf8" });
    try {
      await openQc(page, { width: 1512, height: 900 });
      await page.goto("/agents"); await page.waitForTimeout(3500);
      const t = await page.evaluate(() => document.body.innerText);
      L.check("population: the contact list rendered agents", /Sophie Dunn/.test(t), "no agents");
      L.check("MARGOT ELLIS now reads Margot Ellis", /Margot Ellis/.test(t) && !/MARGOT ELLIS/.test(t), /MARGOT ELLIS/.test(t) ? "still in capitals" : "absent");
      L.check("Imke de Vries is unchanged", /Imke de Vries/.test(t), "changed or absent");
      L.check("the migration changed exactly the one name", /changed 1 /.test(out), out.trim().split("\n").pop() ?? "");
    } finally {
      const f = [...execSync("ls reports/qc-v149-1 2>/dev/null", { encoding: "utf8" }).split("\n")].find((x) => x.startsWith("name-case-"));
      if (f && existsSync(`${DIR}/${f}`)) execSync(`node tests/e2e/migrateNameCase.mjs --revert ${DIR}/${f} && rm ${DIR}/${f}`);
    }
    L.done(4);
  });

  /* RETIRED by v149.2 (QC1492 L3): v149.1 B6's push is removed; the panel overlays at every width. */
  test.skip("L11 · at 1920 the open panel pushes the list card; at 1440 it overlays as before", async ({ page }) => {
    test.skip(!run("L11"));
    const L = new Ledger("L11");
    const geo = () => page.evaluate(() => {
      const b = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0)?.getBoundingClientRect() ?? null;
      const f = b("[data-qc140='filters']"); const hitEl = f ? document.elementFromPoint(f.left + f.width / 2, f.top + f.height / 2) : null;
      const fe = [...document.querySelectorAll<HTMLElement>("[data-qc140='filters']")].find((x) => x.getBoundingClientRect().height > 0);
      return { sheetR: b(".qc138-sheet")?.right ?? null, panelL: b("[data-qp='panel']")?.left ?? null, hit: !!hitEl && !!fe && fe.contains(hitEl) };
    });
    await openQc(page, { width: 1920, height: 1080 });
    await mutateCss(page, "L11", ".qcv-group[data-v138] .qc138-sheet.qc138-sheet { margin-right: 0 !important; }");
    const rest = await geo();
    await open(page, "qc1491-q1");
    await page.waitForTimeout(600);
    const g = await geo();
    L.check("population: 1920 with the panel open", g.sheetR != null && g.panelL != null, JSON.stringify(g));
    L.check("the list card ends 16px left of the panel (±1)", g.sheetR != null && g.panelL != null && g.sheetR <= g.panelL - 16 + 1, JSON.stringify(g));
    L.check("Filters is visible and clickable", g.hit, JSON.stringify(g));
    await shut(page); await page.waitForTimeout(500);
    const back = await geo();
    L.check("closing restores the width", back.sheetR != null && rest.sheetR != null && Math.abs(back.sheetR - rest.sheetR) <= 1, `${rest.sheetR} → ${back.sheetR}`);
    await openQc(page, { width: 1440, height: 900 });
    const r14 = await geo();
    await open(page, "qc1491-q1");
    const g14 = await geo();
    L.check("at 1440 the card keeps its width under the panel (overlay)", r14.sheetR != null && g14.sheetR != null && Math.abs(g14.sheetR - r14.sheetR) <= 1 && g14.panelL != null && g14.sheetR > g14.panelL, JSON.stringify({ r14, g14 }));
    L.done(5);
  });
});
void box; void text;

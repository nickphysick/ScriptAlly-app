/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the PK26 locks on the rendered page, at 1512 × 982 and 1280 × 832 with the shell.
 *
 *   PK26-R   /manuscripts/packages?pkg=x lands on /queries/packages?pkg=x with that package open
 *   PK26-W   the header card's insets are 92 (±1), the tab bar's 72, the builder's and Results' 48
 *   PK26-B   a letter dropped on the Synopsis row does nothing; on the Query letter row it fills it; Add does the
 *            same from the keyboard; while dragging only the matching row is marked
 *   PK26-E   changing a SENT package's letter starts its next edition, and the query sent with it keeps the old one
 *   PK26-X   ticking an extra on a sent package does not change the sent query's extras
 *   PK26-D   the drawer's header fill stops at the inner border (measured against the drawer's border box)
 *   PK26-S   Results: an item under packageReplies' threshold is shown "Too early" and is not ranked
 *
 * Each lock was proved red before its green was believed: `PK26_MUTATE=<lock>` applies its named in-page break (the
 * table below) or, for the decisions the code makes, `node tests/e2e/pk26Mutate.mjs <lock>` edits the source in this
 * worktree (rebuild, run, `--restore`). The ledger `reports/submission-packages-v26/ledger/mut-<lock>.json` records it.
 *
 * FIXTURE: `seedPk26.mjs` — "Locks of v26" (pk26-ms), a manuscript of its own: two letters, a synopsis, an EMPTY
 * unsent package and a SENT package with one query credited to its 1st edition. Writes are put back in the same run
 * (the fixture is re-seeded after each writing lock, and removed in afterAll).
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/submission-packages-v26";
const MUT = process.env.PK26_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 832 }] as const;
const MS = "pk26-ms";
const seed = (arg?: string) => execFileSync("node", ["tests/e2e/seedPk26.mjs", ...(arg ? [arg] : [])], { stdio: "pipe" }).toString();
type Dump = Record<string, Record<string, unknown> | null>;
const dump = (): Dump => JSON.parse(seed("--dump").trim().split("\n").pop()!);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** One named break per lock, applied in the page. */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* PK26-R, PK26-E and PK26-X are SOURCE breaks (pk26Mutate.mjs): the redirect dropping its query string, and an
     edition engine that rewrites the 1st edition from the package's new contents — the realistic way a sent query
     would come to report a letter, or an extra, that it never carried. */
  /* the header card takes the shell's shared gutter back */
  "PK26-W": { css: `.wpg-scroll > .p6 { padding-inline: 20px !important; }` },
  /* every row accepts every drop */
  "PK26-B": { js: `document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('.p6-slt')) e.preventDefault(); }, true); document.addEventListener('drop', (e) => { const s = e.target.closest && e.target.closest('.p6-slt'); if (!s) return; const [k] = (e.dataTransfer.getData('text/plain') || '').split(':'); if (k && k !== s.dataset.slot) { const t = document.querySelector('.p6-slt[data-slot="' + k + '"]'); if (t) { e.stopImmediatePropagation(); t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: e.dataTransfer })); } } }, true);` },
  /* the drawer's header fill runs to the rim, over the inner border */
  "PK26-D": { css: `.p6-cx-drw .p6-dh { margin-left: -8px !important; margin-right: -8px !important; }` },
  /* rank everything, the too-early too */
  "PK26-S": { js: `document.addEventListener('DOMContentLoaded', () => { const put = () => { for (const r of document.querySelectorAll('.p6-rs-r.p6-early')) { r.classList.remove('p6-early'); const em = r.querySelector('.p6-rs-bar em'); if (em && em.textContent === 'Too early') em.textContent = '50%'; } }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }); put(); })` },
};

async function open(page: Page, size: { width: number; height: number }, route = "/queries/packages", ms = MS) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUTATIONS[MUT];
  if (m?.js) await page.addInitScript(m.js);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.locator('[data-pk26="page"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1200);
}
const vis = (page: Page, sel: string) => page.locator(`[data-pk26="page"] ${sel}`).first();

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { console.log(seed()); });
test.afterAll(() => { console.log(seed("--clean")); });

/* ── PK26-R ─────────────────────────────────────────────────────────────────────────────────────── */
test("PK26-R the old address redirects with its query and opens that package", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("PK26-R");
  await open(page, SIZES[0], "/manuscripts/packages?pkg=pk26-pkg-sent");
  const url = new URL(page.url());
  L.check("path", url.pathname === "/queries/packages", url.pathname);
  L.check("query kept", url.searchParams.get("pkg") === "pk26-pkg-sent", url.search);
  const openId = await vis(page, '[data-pk26="open"]').getAttribute("data-pkg");
  L.check("that package is open", openId === "pk26-pkg-sent", String(openId));
  const pressed = await vis(page, '.p6-pkb[aria-pressed="true"] b').textContent();
  L.check("its button is the selected one", pressed === "Sent one", String(pressed));
  L.done(4);
});

/* ── PK26-W ─────────────────────────────────────────────────────────────────────────────────────── */
for (const size of SIZES) {
  test(`PK26-W the three insets at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`PK26-W-${size.width}`);
    await open(page, size);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-pk26="page"]')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
      const sheet = (root.closest(".ws-window") as HTMLElement).getBoundingClientRect();
      const ins = (sel: string) => { const b = (root.querySelector(sel) as HTMLElement).getBoundingClientRect(); return [b.left - sheet.left, sheet.right - b.right]; };
      return { header: ins(".p6-hd-in"), tabs: ins(".p6-ptabs"), build: ins(".p6-pb-build"), results: ins(".p6-rs") };
    });
    for (const [k, want] of [["header", 92], ["tabs", 72], ["build", 48], ["results", 48]] as const) {
      const [l, rt] = r[k];
      L.check(`${k} left`, Math.abs(l - want) <= 1, `${l.toFixed(1)} (want ${want})`);
      L.check(`${k} right`, Math.abs(rt - want) <= 1, `${rt.toFixed(1)} (want ${want})`);
    }
    L.done(8);
  });
}

/* ── PK26-B ─────────────────────────────────────────────────────────────────────────────────────── */
test("PK26-B only the matching row takes a drop; Add does the same by keyboard", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("PK26-B");
  seed();
  await open(page, SIZES[0], "/queries/packages?pkg=pk26-pkg-open");
  L.check("the drag target is open", (await vis(page, '[data-pk26="open"]').getAttribute("data-pkg")) === "pk26-pkg-open", "open package");
  const letterB = vis(page, '.p6-lr[data-drag="let:pk26-let-b"]');
  /* while dragging: the package dims, the Query letter row alone is marked */
  await letterB.evaluate((el) => el.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: new DataTransfer() })));
  await page.waitForTimeout(200);
  const marks = await page.evaluate(() => {
    const o = [...document.querySelectorAll('[data-pk26="open"]')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
    return { dragging: o.classList.contains("p6-dragging"), ok: [...o.querySelectorAll(".p6-slt.p6-ok")].map((s) => (s as HTMLElement).dataset.slot) };
  });
  L.check("the package is marked as dragging", marks.dragging, JSON.stringify(marks));
  L.check("only the Query letter row is highlighted", JSON.stringify(marks.ok) === '["let"]', JSON.stringify(marks.ok));
  await letterB.evaluate((el) => el.dispatchEvent(new DragEvent("dragend", { bubbles: true })));
  /* onto the Synopsis row: nothing */
  await letterB.dragTo(vis(page, '.p6-slt[data-slot="syn"]'));
  await page.waitForTimeout(1500);
  let d = dump()["pk26-pkg-open"]!;
  L.check("a letter dropped on Synopsis changes nothing", d.queryLetterVersionId === "" && d.synopsisVersionId === "", `ql=${d.queryLetterVersionId} syn=${d.synopsisVersionId}`);
  /* onto the Query letter row: fills it */
  await letterB.dragTo(vis(page, '.p6-slt[data-slot="let"]'));
  await page.waitForTimeout(1500);
  d = dump()["pk26-pkg-open"]!;
  L.check("dropped on Query letter, it fills it", d.queryLetterVersionId === "pk26-let-b", `ql=${d.queryLetterVersionId}`);
  /* Add, by keyboard: the synopsis */
  await vis(page, '.p6-lib-tabs [role="tab"].p6-t-syn').click();
  const add = vis(page, '.p6-lr[data-drag="syn:pk26-syn"] .p6-lr-add');
  await add.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  d = dump()["pk26-pkg-open"]!;
  L.check("Add by keyboard fills the Synopsis row", d.synopsisVersionId === "pk26-syn", `syn=${d.synopsisVersionId}`);
  seed();
  L.done(6);
});

/* ── PK26-E / PK26-X ────────────────────────────────────────────────────────────────────────────── */
test("PK26-E a sent package's new letter starts its next edition; the sent query keeps the old", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("PK26-E");
  seed();
  await open(page, SIZES[0], "/queries/packages?pkg=pk26-pkg-sent");
  await vis(page, '.p6-lr[data-drag="let:pk26-let-b"] .p6-lr-add').click();
  await page.waitForTimeout(2000);
  const d = dump();
  const p = d["pk26-pkg-sent"]!, q = d["pk26-q1"]!;
  const eds = (p.editions as { n: number; queryLetterVersionId: string }[] | undefined) ?? [];
  L.check("the package is on its 2nd edition", p.edition === 2, `edition=${p.edition}`);
  L.check("its current letter is Letter B", p.queryLetterVersionId === "pk26-let-b", String(p.queryLetterVersionId));
  L.check("its 1st edition kept Letter A", eds.find((e) => e.n === 1)?.queryLetterVersionId === "pk26-let-a", JSON.stringify(eds.map((e) => [e.n, e.queryLetterVersionId])));
  L.check("the sent query is still credited to the 1st edition", q.sentPackageEdition === 1, String(q.sentPackageEdition));
  L.check("…and still says what went", q.sentMaterials === "Query letter Letter A", String(q.sentMaterials));
  seed();
  L.done(5);
});

test("PK26-X ticking an extra on a sent package does not change the sent query's extras", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("PK26-X");
  seed();
  await open(page, SIZES[0], "/queries/packages?pkg=pk26-pkg-sent");
  await vis(page, '[data-pk26="open"] .p6-exc button[aria-pressed]').first().click();
  await page.waitForTimeout(2000);
  const d = dump();
  const p = d["pk26-pkg-sent"]!, q = d["pk26-q1"]!;
  const eds = (p.editions as { n: number; otherMaterials?: string; extraIds?: string[] }[] | undefined) ?? [];
  L.check("the package now sends the extra", JSON.stringify(p.extraIds) === '["pk26-ext"]' && p.otherMaterials === "Author bio", `${JSON.stringify(p.extraIds)} · ${p.otherMaterials}`);
  L.check("ticking it started the next edition", p.edition === 2, `edition=${p.edition}`);
  L.check("the 1st edition (what went) has no extras", !eds.find((e) => e.n === 1)?.otherMaterials && !(eds.find((e) => e.n === 1)?.extraIds ?? []).length, JSON.stringify(eds[0] ?? null));
  L.check("the sent query's record is unchanged", q.sentMaterials === "Query letter Letter A" && q.sentPackageEdition === 1, `${q.sentMaterials} · ed ${q.sentPackageEdition}`);
  seed();
  L.done(4);
});

/* ── PK26-D ─────────────────────────────────────────────────────────────────────────────────────── */
for (const size of SIZES) {
  test(`PK26-D the drawer's header stops at its inner border at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`PK26-D-${size.width}`);
    await open(page, size);
    await vis(page, '[data-pk26="tabs"] .p6-t-let').click();
    await vis(page, '[data-pk26="materials"] .p6-xtb-r[data-mat]').click();
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const d = document.querySelector('[data-pk26="drawer"]') as HTMLElement;
      const box = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      const pad = { l: parseFloat(cs.paddingLeft), t: parseFloat(cs.paddingTop), r: parseFloat(cs.paddingRight), b: parseFloat(cs.paddingBottom) };
      const bw = { l: parseFloat(cs.borderLeftWidth), t: parseFloat(cs.borderTopWidth), r: parseFloat(cs.borderRightWidth) };
      const h = (d.querySelector(".p6-dh") as HTMLElement).getBoundingClientRect();
      const f = (d.querySelector(".p6-df") as HTMLElement | null)?.getBoundingClientRect() ?? null;
      return { box: [box.left, box.top, box.right, box.bottom], pad, bw, h: [h.left, h.top, h.right], f: f ? [f.left, f.right, f.bottom] : null, bg: getComputedStyle(d.querySelector(".p6-dh") as HTMLElement).backgroundColor };
    });
    /* the inner border sits inside the 7px white rim: rim = border + padding of the drawer's own box */
    const inL = r.box[0] + r.bw.l + r.pad.l, inR = r.box[2] - r.bw.r - r.pad.r, inT = r.box[1] + r.bw.t + r.pad.t;
    L.check("the rim is 7px or more", r.bw.l + r.pad.l >= 7, `rim ${r.bw.l + r.pad.l}`);
    L.check("header left at the inner border", Math.abs(r.h[0] - inL) <= 1.5, `${r.h[0].toFixed(1)} vs ${inL.toFixed(1)}`);
    L.check("header right at the inner border", Math.abs(r.h[2] - inR) <= 1.5, `${r.h[2].toFixed(1)} vs ${inR.toFixed(1)}`);
    L.check("header top at the inner border", Math.abs(r.h[1] - inT) <= 1.5, `${r.h[1].toFixed(1)} vs ${inT.toFixed(1)}`);
    L.check("the header is filled (pink)", r.bg !== "rgba(0, 0, 0, 0)", r.bg);
    L.check("the footer stops at the inner border too", !!r.f && Math.abs(r.f[0] - inL) <= 1.5 && Math.abs(r.f[1] - inR) <= 1.5, JSON.stringify(r.f));
    L.done(6);
  });
}

/* ── PK26-S ─────────────────────────────────────────────────────────────────────────────────────── */
test("PK26-S Results: under the threshold it is shown, Too early, and never ranked", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("PK26-S");
  await open(page, SIZES[0]);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-pk26="results"]')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
    const rows = [...root.querySelectorAll(".p6-rs-r")].map((b) => ({ name: b.querySelector(".p6-rs-n b")?.textContent ?? "", early: b.classList.contains("p6-early"), label: b.querySelector(".p6-rs-bar em")?.textContent ?? "" }));
    return { rows, lead: root.querySelector(".p6-rs-lead")?.textContent ?? "", foot: root.querySelector(".p6-rs-foot")?.textContent ?? "" };
  });
  /* the fixture's sent package has ONE query, still waiting — sent, never answered: under any threshold */
  const sent = r.rows.find((x) => x.name === "Sent one");
  L.check("the sent package is listed", !!sent, JSON.stringify(r.rows));
  L.check("…marked Too early", !!sent && sent.early && sent.label === "Too early", JSON.stringify(sent));
  L.check("…and not named as the best in the lead", !/^Sent one gets/.test(r.lead), r.lead);
  L.check("the unsent one reads Not sent", r.rows.some((x) => x.name === "Drag target" && x.label === "Not sent"), JSON.stringify(r.rows));
  L.check("the footnote states the threshold", /fewer than \d+ answers are shown but not ranked/.test(r.foot), r.foot);
  L.done(5);
});

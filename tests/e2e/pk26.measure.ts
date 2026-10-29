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
 * ⚠️ v38 (27 Oct): PK26-E, X, S, T and RT are RETIRED (they changed a sent package, which v40 locks, or read v26's
 *    Results and the tab bar, both gone); R, W, D and H are retargeted onto the labels row and Your materials.
 *    tests/e2e/RETIRED-submission-packages-v38.md lists each. pk38.measure.ts holds the page's v38 locks.
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
  /* v39.1: the builder goes back to a fixed 48, off the header card's inset */
  /* v39.2: the builder sits in the packages panel, which takes the width */
  "PK26-W": { css: `.p6.p6 > .p9-pkc { margin-left: 48px !important; margin-right: 48px !important; }` },
  /* the drawer's header fill runs to the rim, over the inner border */
  "PK26-D": { css: `.p6-cx-drw .p6-dh { margin-left: -8px !important; margin-right: -8px !important; }` },
  /* rank everything, the too-early too */
  /* v26.1 — the packages row goes back to two lines' height and loses the right padding that sets its tag's edge */
  "PK26-N": { css: `button.ws-ni[aria-label="Packages"] { height: 48px !important; padding-right: 3px !important; }` },
  /* v26.1 — the stuck bar's ground reaches only the ref's 32px past the tabs */
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
  /* v38: the package buttons are the labels row; the sent package opens (locked) in the builder */
  const pressed = await vis(page, '[data-pk38="labels"] .p9-pkl-b[aria-pressed="true"] .p9-pkl-t b').textContent();
  L.check("its label is the selected one", pressed === "Sent one", String(pressed));
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
      /* v38: the tab bar and v26's Results are gone (the band's width is pk38's L6).
         v39.1 A REWRITE: the builder's inset is no longer a fixed 48 — it is the header card's (the Contact list's
         card, max(24, (sheet − 1200)/2)); pk391 L1 owns that law across every block.
         v39.2 REWRITE: the builder sits inside the packages panel (pk392 L8), so the panel is what takes those insets */
      const hd = (root.querySelector(".pk39-card") as HTMLElement).getBoundingClientRect();
      return { build: ins(".p9-pkc"), want: [hd.left - sheet.left, sheet.right - hd.right] };
    });
    for (const [k, want] of [["build", r.want[0]]] as const) {
      const [l, rt] = r[k];
      L.check(`${k} left`, Math.abs(l - want) <= 1, `${l.toFixed(1)} (want ${want})`);
      L.check(`${k} right`, Math.abs(rt - r.want[1]) <= 1, `${rt.toFixed(1)} (want ${want})`);
    }
    L.done(2);
  });
}

/* PK26-B — RETIRED by v39.3 (drag and drop is retired with Your materials; a pick in the steps is pk393 L10). See
   tests/e2e/RETIRED-submission-packages-v39-3.md */

/* PK26-E / PK26-X — RETIRED with v38 (27 Oct); see tests/e2e/RETIRED-submission-packages-v38.md */

/* ── PK26-D ─────────────────────────────────────────────────────────────────────────────────────── */
for (const size of SIZES) {
  test(`PK26-D the drawer's header stops at its inner border at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`PK26-D-${size.width}`);
    /* v39.3: Your materials is retired; the letter step's Edit pencil opens the same drawer, on a live package */
    await open(page, size, "/queries/packages?pkg=pk26-pkg-open");
    await vis(page, '[data-pk393-step="let"] [data-pk393="step-head"]').click();
    await page.waitForTimeout(300);
    await vis(page, '[data-pk393-step="let"] [data-pk393="edit"]').click();
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

/* PK26-S — RETIRED with v38 (27 Oct); see tests/e2e/RETIRED-submission-packages-v38.md */

/* ── PK26-N · the sidebar row is Versions' structure ── */
for (const size of SIZES) {
  test(`PK26-N the Submission packages row matches Versions at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`PK26-N-${size.width}`);
    await open(page, size);
    const r = await page.evaluate(() => ["Packages", "Versions"].map((n) => {
      const b = [...document.querySelectorAll(`button.ws-ni[aria-label="${n}"]`)].find((e) => (e as HTMLElement).offsetParent) as HTMLElement | undefined;
      if (!b) return null;
      const t = b.querySelector(".ws-qpro"), l = b.querySelector(".ws-lbl");
      const R = (e: Element | null) => (e ? e.getBoundingClientRect() : null);
      return { h: b.getBoundingClientRect().height, tagR: R(t)?.right ?? null, tagL: R(t)?.left ?? null, lblR: R(l)?.right ?? null, lines: b.querySelectorAll(".ws-sub2, [data-shell=\"sub\"]").length, text: (l?.textContent ?? "").trim() };
    }));
    const [pk, ver] = r;
    L.check("both rows are on screen", !!pk && !!ver, JSON.stringify(r));
    if (pk && ver) {
      L.check("same height as Versions (±1)", Math.abs(pk.h - ver.h) <= 1, `${pk.h} vs ${ver.h}`);
      L.check("PRO tag's right edge where Versions' is (±1)", pk.tagR != null && ver.tagR != null && Math.abs(pk.tagR - ver.tagR) <= 1, `${pk.tagR} vs ${ver.tagR}`);
      L.check("no second line", pk.lines === 0, String(pk.lines));
      L.check("the label is \"Packages\" (the sidebar's short label, 25 Oct)", pk.text === "Packages", pk.text);
      L.check("the label stops before its tag", pk.lblR != null && pk.tagL != null && pk.lblR <= pk.tagL + 0.5, `${pk.lblR} vs ${pk.tagL}`);
    }
    L.done(6);
  });
}

/* PK26-T — RETIRED with v38 (27 Oct); see tests/e2e/RETIRED-submission-packages-v38.md */

/* ── PK26-M · Your materials: names in full, never the type as a summary ──
   REWRITTEN by v39.2 (Part C): a name is never cut off any more — it wraps, with no ellipsis and no title tooltip
   (it was one line with the full name as its title). The "no type for a summary" half is unchanged. */
/* PK26-M — RETIRED by v39.3 (Your materials' rows are retired; the steps' choice rows show the name and summary). See
   tests/e2e/RETIRED-submission-packages-v39-3.md */

/* ── PK26-H · the header note: one line, or "+ Add a note" that opens the details with the note focused ── */
test("PK26-H the package note is one line, or + Add a note", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("PK26-H");
  await open(page, SIZES[1]);
  await vis(page, '[data-pk38="labels"] .p9-pkl-b[title="Sent one"]').click(); await page.waitForTimeout(400);
  const withNote = await page.evaluate(() => {
    const h = [...document.querySelectorAll('[data-pk26="open"] .p9-po-tt')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
    const sm = h.querySelector("small") as HTMLElement;
    const h3 = h.querySelector("h3") as HTMLElement;
    return { text: sm?.textContent ?? "", h: sm?.getBoundingClientRect().height ?? 0, fs: sm ? parseFloat(getComputedStyle(sm).fontSize) : 0, cut: sm ? sm.scrollWidth > sm.clientWidth : false, h3h: h3.getBoundingClientRect().height, h3fs: parseFloat(getComputedStyle(h3).fontSize) };
  });
  L.check("the note is one line at 1280", withNote.h > 0 && withNote.h <= withNote.fs * 1.6, JSON.stringify(withNote));
  L.check("…cut short (it is longer than the room)", withNote.cut, JSON.stringify(withNote));
  /* v39: the pencil is gone (the name is edited in place); the law — the name keeps one line — stands */
  L.check("the name keeps one line", withNote.h3h <= withNote.h3fs * 1.6, JSON.stringify(withNote));
  await vis(page, '[data-pk38="labels"] .p9-pkl-b[title="Drag target"]').click(); await page.waitForTimeout(400);
  const add = vis(page, '[data-pk26="open"] .p9-po-addnote');
  /* v39: the note line itself, in the ref's words ("Add a note: who is this for?"); the law — no note offers one, and it
     opens Package details with the note focused — stands */
  L.check("no note: Add a note", (await add.count()) === 1 && (await add.textContent()) === "Add a note: who is this for?", String(await add.count()));
  if (await add.count()) {
    await add.click(); await page.waitForTimeout(500);
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.className ?? "");
    L.check("…it opens Package details with the note focused", /p6-id-pdNote/.test(focused), focused);
    await page.keyboard.press("Escape");
  } else L.check("…it opens Package details with the note focused", false, "no link");
  L.done(5);
});

/* PK26-RT — RETIRED with v38 (27 Oct); see tests/e2e/RETIRED-submission-packages-v38.md */


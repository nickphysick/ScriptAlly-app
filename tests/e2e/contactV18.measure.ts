/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 — locks CL18 A1 to F5, on the rendered page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (`CL18_BASE=1`, ledger `base-<lock>.json`) and with its named
 * mutation (`CL18_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. Mutations named `src` in
 * the table are source edits made and undone in the measurement worktree (what they break is a decision the code
 * makes, not something drawn); the rest are applied in the page.
 *
 * ⚠️ F1, F2 AND F4 WRITE TO THE HARNESS ACCOUNT AND PUT IT BACK IN THE SAME RUN: a reply time saved and undone, and
 *    the intro's flag cleared and left set (as it was before the run). `tests/e2e/hkFlags.mjs` reads and clears it.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible Contact list.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openContacts16, setScroll16 } from "./cl16Lib";
import { liftMotionSuppression } from "./measure";

const DIR = "reports/contact-list-v18";
const MUT = process.env.CL18_MUTATE ?? "";
const BASE = process.env.CL18_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const flags = (clear = false): { hkIntroSeen: boolean | null; tabDismissedAtGaps: number | null } =>
  JSON.parse(execSync(`node tests/e2e/hkFlags.mjs${clear ? " --clear" : ""}`, { encoding: "utf8" }).trim().split("\n").pop() ?? "{}");

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page; `src` locks are broken in the source (see the header) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* an interval that re-sets the pinned row's top */
  A3: { js: `(() => { let n = 0; setInterval(() => { const p = document.querySelector('[data-cl17="pinned"]'); if (p) p.style.top = (n++ % 2 ? 3 : 0) + "px"; }, 120); })()` },
  /* the cream fill restored */
  C2: { css: `.cl16-list .clv-row .sa-disc.clv-ini[data-disc="none"] { background: #f4eee5 !important; border-style: solid !important; }` },
  /* the frame drawn inside the panel */
  E1: { js: `(() => { const fix = () => { for (const c of document.querySelectorAll('[data-apc="card"][data-variant="plain"]')) if (!c.querySelector(".apc-frame")) { const f = document.createElement("div"); f.className = "apc-frame"; f.style.cssText = "border:1px solid #a5837b;border-radius:13px;height:4px"; c.prepend(f); } }; new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); fix(); })()` },
  /* the pop appended inside the drawer */
  /* the pop drawn in the drawer's own flow (absolute, inside its body) rather than in the top layer */
  F5: { js: `(() => { new MutationObserver(() => { const d = document.querySelector('.hdr[data-hdr="housekeeping"] .hdr-body'); for (const p of document.querySelectorAll('body > [data-hk8="pop"]')) if (d) { p.style.position = "absolute"; d.appendChild(p); } }).observe(document.body, { childList: true }); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
const open = async (page: Page, vp: { width: number; height: number }, lock: string, opts: { motion?: boolean } = {}) => {
  await openContacts16(page, vp, { motion: opts.motion });
  await mutate(page, lock);
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const scrollTo = (page: Page, top: number) => setScroll16(page, top);

/* RETIRED by Contact list v19 (reports/contact-list-v19/REPORT.md): A1 (26 counted tabs above the title) and A2 (a tab
   jump, and a grouped list switching to A to Z first) held the A to Z tabs above the hero. v19 retires them: the only A to Z
   is the list toolbar's (CL19-P2 asserts the tabs absent; QC138.6 C1 holds the M jump on the toolbar's letters), and grouped
   by anything but Letter the toolbar shows the jump row instead (CL19-E2). Their mutations and ledgers go with them. */

/* ───────────────────────── A3 · spy ───────────────────────── */
/* RE-POINTED by Contact list v19 §B: the strip is the toolbar's A to Z ([data-cl19="letter"], the current one aria-current);
   the claim (the current letter is the row at the line, and the sticky header holds one box) is unchanged. */
test("A3 · spy: stepping 1px over 600px, both strips name the row at the line; the pinned row holds one box", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A3");
  for (const vp of SIZES) {
    await open(page, vp, "A3"); const w = `@${vp.width}`;
    await scrollTo(page, 900); await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const g = [...document.querySelectorAll<HTMLElement>(".aglist .clv-group")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = g.closest<HTMLElement>(".wpg-scroll")!;
      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const start = sc.scrollTop; const bad: string[] = []; const boxes = new Set<string>(); let n = 0;
      for (let i = 0; i <= 600; i++) {
        sc.scrollTop = start + i; await frame();
        const lab = g.querySelector<HTMLElement>(".lt-panel > .lt-labels")!;
        const line = sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(lab).top) || 0) + lab.offsetHeight + 2;
        let cur: string | null = null;
        for (const row of g.querySelectorAll<HTMLElement>('[data-clv="row"][data-initial]')) { if (row.getBoundingClientRect().top <= line) cur = row.dataset.initial ?? null; else break; }
        const top = g.querySelector('[data-cl19="letter"][aria-current="true"]')?.getAttribute("data-l") ?? null;
        /* RETARGETED (Query Centre v138.6 §C): the pinned row and its compact letters are deleted, so the top strip is
           the one strip; the box check moves to the slate header, the sticky row (one box while stuck) */
        if (top !== cur) bad.push(`${i}:${cur}/${top}`);
        const p = g.querySelector<HTMLElement>('[data-cl18="list-header"]');
        if (p && p.getBoundingClientRect().top - sc.getBoundingClientRect().top <= 12.5) { const b = p.getBoundingClientRect(); boxes.add(`${b.left.toFixed(1)},${b.top.toFixed(1)},${b.width.toFixed(1)}`); }
        n++;
      }
      return { n, bad, boxes: [...boxes] };
    });
    L.check(`601 steps read ${w}`, r.n === 601, `${r.n}`);
    L.check(`the strip's current letter is the row at the line at every step ${w}`, r.bad.length === 0, `${r.bad.length} misses: ${r.bad.slice(0, 6).join(" ")}`);
    L.check(`the sticky header takes one box while stuck ${w}`, r.boxes.length === 1, `${r.boxes.length} boxes: ${r.boxes.slice(0, 3).join(" | ")}`);
  }
  L.done(6);
});

/* RETIRED by Contact list v19 (reports/contact-list-v19/REPORT.md): B1 (the slate list header: "Showing all N agents",
   search, Filters, density and full screen), B2 (v18's Filters panel) and C1 (the headings over v18's four columns, What
   they want among them) held what v19 replaces: the one toolbar (CL19-T1, CL19-P1), the Filters chip, menu and applied row
   (CL19-F1) and the columns Agent, Date added, Website, Email, Replies, Query status (CL19-C1). The density toggle is
   retired (the list is comfortable). Their mutations and ledgers go with them. */

/* ───────────────────────── C2 · disc ───────────────────────── */
test("C2 · disc: a not-queried disc is a dotted ring with no fill", async ({ page }) => {
  const L = new Ledger("C2");
  for (const vp of SIZES) {
    await open(page, vp, "C2"); const w = `@${vp.width}`;
    const r = await page.evaluate(() => {
      const d = [...document.querySelectorAll<HTMLElement>('.aglist [data-clv="row"][data-disc="none"] .clv-ini')].find((e) => e.getBoundingClientRect().height > 0);
      return d ? { bg: getComputedStyle(d).backgroundColor, style: getComputedStyle(d).borderTopStyle, w: getComputedStyle(d).borderTopWidth } : null;
    });
    L.check(`a transparent fill ${w}`, r?.bg === "rgba(0, 0, 0, 0)", `${r?.bg}`);
    L.check(`a dotted border ${w}`, r?.style === "dotted", `${r?.style} ${r?.w}`);
  }
  L.done(4);
});

/* ───────────────────────── D1 · peek ───────────────────────── */
/* RETIRED (Contact list v18.3 §C): the peek is three contact pills now; CL183 C1 holds it */
test.skip("D1 · peek: none at 300ms, open by 900ms; Copy never opens the row; Space toggles; missing fields not drawn", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    await open(page, vp, "D1"); const w = `@${vp.width}`;
    const row = vis(page, '.aglist [data-clv="row"]');
    await row.hover(); await page.waitForTimeout(300);
    const at300 = await page.locator('[data-cl18="peek"]').count();
    await page.waitForTimeout(600);
    const at900 = await page.locator('[data-cl18="peek"]').count();
    L.check(`no peek at 300ms, one by 900ms ${w}`, at300 === 0 && at900 === 1, `${at300} → ${at900}`);
    const copy = page.locator('[data-cl18="peek"] [data-cl18="peek-copy"]');
    const target = (await copy.count()) ? copy : page.locator('[data-cl18="peek"] [data-cl18="peek-words"] h4');
    await target.first().click(); await page.waitForTimeout(700);
    const panel = await page.locator('[data-ap="panel"]').filter({ visible: true }).count();
    L.check(`a click inside the card does not open the row ${w}`, panel === 0, `${panel} panel(s) · clicked ${(await copy.count()) ? "Copy" : "the card"}`);
    const missing = await page.evaluate(() => {
      const p = document.querySelector('[data-cl18="peek"]');
      return { nft: /Not for them/.test(p?.textContent ?? ""), viaLink: !!p?.querySelector('[data-k="via"] a'), fields: [...(p?.querySelectorAll('[data-cl18="peek-label"]') ?? [])].map((e) => e.textContent).join("|") };
    });
    L.check(`no "Not for them" and no query-via link (neither is stored) ${w}`, !missing.nft && !missing.viaLink && missing.fields === "Email|Website|Social|Query via|Send them|Replies", JSON.stringify(missing));
    await page.mouse.move(2, 2); await page.waitForTimeout(400);
    await row.focus(); await page.keyboard.press(" "); await page.waitForTimeout(300);
    const on = await page.locator('[data-cl18="peek"]').count();
    await page.keyboard.press(" "); await page.waitForTimeout(300);
    const off = await page.locator('[data-cl18="peek"]').count();
    L.check(`Space toggles the peek on a focused row ${w}`, on === 1 && off === 0, `${on} → ${off}`);
  }
  L.done(8);
});

/* ───────────────────────── E1 · card ───────────────────────── */
/* ⚠️ RETIRED BY CONTACT LIST v18.1 §B (tests/e2e/RETIRED-contact-list-v18-1.md): "the panel's plain card has no frame and no
   band" and "the panel masthead takes the three status colours" describe a panel that is gone. The panel is the card's
   panel variant now, with one frame and a band coloured by whose move it is: CL181 B1 holds both. The framed card's
   frame-holds-the-band reading is held by CL181 B1's frame readings on the same component. */
test.skip("E1 · card: the framed card's frame holds the band; the panel's plain card has neither; the masthead's three colours", async ({ page }) => {
  const L = new Ledger("E1");
  flags(true);
  await open(page, SIZES[0], "E1");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  const fr = await page.evaluate(() => {
    const c = document.querySelector('[data-apc="card"][data-variant="framed"]');
    const f = c?.querySelector<HTMLElement>(".apc-frame");
    return { frame: f ? getComputedStyle(f).borderTopColor : null, band: !!f?.querySelector(".apc-band") };
  });
  L.check("the framed card's 1px frame is rgb(165, 131, 123)", fr.frame === "rgb(165, 131, 123)", `${fr.frame}`);
  L.check("and the band is inside the frame", fr.band, `${fr.band}`);
  await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(600);
  const want: Record<string, string> = { none: "rgb(94, 113, 137)", live: "rgb(45, 58, 80)", closed: "rgb(169, 163, 156)" };
  for (const disc of ["none", "live", "closed"] as const) {
    const row = page.locator(`.aglist [data-clv="row"][data-disc="${disc}"]`).filter({ visible: true }).first();
    if (!(await row.count())) { L.check(`a ${disc} row to open`, false, "none on the account"); continue; }
    await row.click(); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-ap="card"]');
      const m = card?.querySelector<HTMLElement>(".qcv-open-mast");
      const plain = card?.querySelector('[data-apc="card"][data-variant="plain"]');
      return { mast: m ? getComputedStyle(m).backgroundColor : null, status: card?.getAttribute("data-ap-status"), plain: !!plain, frame: !!plain?.querySelector(".apc-frame, .apc-band, .apc-head") };
    });
    L.check(`${disc}: the masthead is ${want[disc]}`, r.mast === want[disc] || (disc === "none" && r.status === "closed"), `${r.mast} (${r.status})`);
    L.check(`${disc}: the Profile tab is the plain card, no frame, band or head`, r.plain && !r.frame, `plain ${r.plain} · frame ${r.frame}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  }
  L.done(8);
});

/* ───────────────────────── F1 · score ───────────────────────── */
test("F1 · score: the page ring, the tab and the drawer show one number; a reply time adds exactly 6", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F1");
  await open(page, SIZES[0], "F1");
  const nums = () => page.evaluate(() => ({
    ring: (document.querySelector('.aglist [data-cl17="ring-pct"]')?.textContent ?? "").replace("%", ""),
    tab: (document.querySelector('[data-hkv="tab-counts"]')?.textContent ?? "").match(/(\d+)% list health/)?.[1] ?? null,
    drawer: (document.querySelector('[data-hk8="pct"]')?.textContent ?? "").replace("%", "") || null,
    /* RE-POINTED (v18.2 §C): the points line under the score is retired; "{held} of {possible} pts" is the points tile */
    points: (() => { const t = document.querySelector('[data-hk8="tile"][data-k="points"]'); return t ? `${t.querySelector("b")?.textContent ?? ""} ${(t.querySelector("small")?.textContent ?? "").replace(/ pts$/, " points")}` : ""; })(),
  }));
  await page.keyboard.press("h"); await page.waitForTimeout(1000);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  const a = await nums();
  /* RE-POINTED (v18.3 §B): there is no tab; the page ring and the drawer show one number */
  L.check("the page ring and the drawer show one number", !!a.ring && a.ring === a.drawer, `${a.ring} · ${a.drawer}`);
  const held0 = Number(a.points.match(/^(\d+) of (\d+) points/)?.[1]);
  L.check("the drawer states held of possible", Number.isFinite(held0), `"${a.points}"`);
  /* a reply time: Focus on the first reply gap, one step, Save */
  const reply = page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first();
  if (!(await reply.count())) { L.check("a reply-time gap to fill", false, "none"); L.done(4); return; }
  await reply.click(); await page.waitForTimeout(600);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2500);
  const b = await nums();
  const held1 = Number(b.points.match(/^(\d+) of/)?.[1]);
  L.check("saving a reply time adds exactly 6 to held", held1 - held0 === 6, `${held0} → ${held1}`);
  L.check("the two still agree after the save", b.ring === b.drawer, `${b.ring} · ${b.drawer}`);
  /* put the account back */
  await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2500);
  const c = await nums();
  L.check("Undo puts held back", Number(c.points.match(/^(\d+) of/)?.[1]) === held0, `"${c.points}"`);
  L.done(5);
});

/* ───────────────────────── F2 · intro ───────────────────────── */
test("F2 · intro: on the first open only (stored); Not now sets the flag; Start lands in Focus", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F2");
  flags(true);
  await open(page, SIZES[0], "F2");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("the first open shows the intro", (await page.locator('[data-hk8="intro"]').count()) === 1, "intro");
  await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(1500);
  L.check("Not now stores the flag", flags().hkIntroSeen === true, JSON.stringify(flags()));
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("the next open lands on home", (await page.locator('[data-hk8="home"]').count()) === 1 && (await page.locator('[data-hk8="intro"]').count()) === 0, "home");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await page.reload(); await page.locator(".clv-group:not([data-loading]) .clv-row").first().waitFor({ timeout: 60_000 }); await page.waitForTimeout(800);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  L.check("after a reload, still home", (await page.locator('[data-hk8="intro"]').count()) === 0, "no intro");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  flags(true);
  await page.reload(); await page.locator(".clv-group:not([data-loading]) .clv-row").first().waitFor({ timeout: 60_000 }); await page.waitForTimeout(800);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  await page.locator('[data-hk8="intro-start"]').click(); await page.waitForTimeout(700);
  /* RE-POINTED (v18.2 §C): "Get started →" lands on home with the three ways, not in Focus (CL182 C4 owns the rest) */
  L.check("Get started lands on home showing the ways card", (await page.locator('[data-hk8="home"] [data-hk8="ways"]').count()) === 1, "ways");
  await page.waitForTimeout(1000);
  L.check("and it set the flag too (left set, as before the run)", flags().hkIntroSeen === true, JSON.stringify(flags()));
  L.done(6);
});

/* ───────────────────────── F3 · home ───────────────────────── */
test("F3 · home: Up next is the queue's first; the detail cards in points order sum to the gaps; a run counts within itself", async ({ page }) => {
  const L = new Ledger("F3");
  for (const vp of SIZES) {
    await open(page, vp, "F3"); const w = `@${vp.width}`;
    await page.keyboard.press("h"); await page.waitForTimeout(900);
    if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
    await page.locator('[data-hkv="view"][data-v="detail"]').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-hk8="detail"]')];
      const total = Number(document.querySelector('[data-hk8="up-next"] .hk8-upf b')?.textContent?.match(/\d+/)?.[0]);
      return { home: !!document.querySelector('[data-hk8="home"]'), order: cards.map((c) => c.dataset.gap), rows: cards.reduce((s, c) => s + c.querySelectorAll('[data-hk8="ledger-row"]').length, 0), total };
    });
    const ORDER = ["reply", "materials", "genres", "wishlist", "reopen"];
    L.check(`it opens on home ${w}`, r.home, `${r.home}`);
    L.check(`one card per applicable detail, in points order ${w}`, r.order.length > 0 && r.order.every((g, i) => i === 0 || ORDER.indexOf(g!) > ORDER.indexOf(r.order[i - 1]!)), r.order.join(","));
    L.check(`their rows sum to the gap total ${w}`, r.rows === r.total, `${r.rows} vs ${r.total}`);
    await page.locator('[data-hk8="up-start"]').click(); await page.waitForTimeout(500);
    const k1 = await page.locator('[data-hk8="card"]').getAttribute("data-key");
    const c1 = await page.locator('[data-hk8="counter"]').textContent();
    await page.locator('[data-hk8="back"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-hk8="fill-all"]').click(); await page.waitForTimeout(500);
    const k2 = await page.locator('[data-hk8="card"]').getAttribute("data-key");
    L.check(`Up next is the queue's first task ${w}`, !!k1 && k1 === k2 && c1 === `1 of ${r.total}`, `${k1} vs ${k2} · "${c1}"`);
    await page.locator('[data-hk8="back"]').click(); await page.waitForTimeout(300);
    const run = page.locator('[data-hk8="detail"] [data-hk8="fill-detail"]').first();
    const k = await run.evaluate((b) => b.closest('[data-hk8="detail"]')!.querySelectorAll('[data-hk8="ledger-row"]').length);
    await run.click(); await page.waitForTimeout(500);
    const c = await page.locator('[data-hk8="counter"]').textContent();
    L.check(`"Fill in all" starts a run counted within itself ${w}`, c === `1 of ${k}`, `"${c}" (run of ${k})`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(10);
});

/* ───────────────────────── F4 · focus ───────────────────────── */
test("F4 · focus: Save waits for an answer, writes through the save path, Skip goes to the end, Undo restores", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("F4");
  await open(page, SIZES[0], "F4");
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  await page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="fill-detail"]').click(); await page.waitForTimeout(500);
  const first = await page.locator('[data-hk8="card"]').getAttribute("data-key");
  const counter = await page.locator('[data-hk8="counter"]').textContent();
  L.check("Save is disabled until there is an answer", await page.locator('[data-hk8="save"]').isDisabled(), "disabled");
  await page.locator('[data-hk8="skip"]').click(); await page.waitForTimeout(500);
  const second = await page.locator('[data-hk8="card"]').getAttribute("data-key");
  const coming = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-hk8="coming"] .hk8-li')].map((e) => e.dataset.key));
  /* "Coming up" shows the next five: in a run of six or fewer the skipped task is the last of them; longer, it is past them */
  const runLen = Number((counter ?? "").match(/of (\d+)/)?.[1]);
  L.check("Skip moves the task to the end of the queue", second !== first && (runLen <= 6 ? coming[coming.length - 1] === first : !coming.includes(first ?? "")), `${first} → ${second} · run ${runLen} · coming ${coming.join(",")}`);
  L.check("the counter does not move on a skip", (await page.locator('[data-hk8="counter"]').textContent()) === counter, `${counter}`);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  L.check("an answer enables Save", !(await page.locator('[data-hk8="save"]').isDisabled()), "enabled");
  const agentId = (second ?? "").split(":")[0];
  const before = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  await page.locator('[data-hk8="save"]').click(); await page.waitForTimeout(2500);
  const foot = await page.locator('[data-hkv="foot-text"]').textContent().catch(() => null);
  const after = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  L.check("the save went through the page's save path (its saved line and Undo)", !!foot && (await page.locator('[data-hkv="undo"]').count()) === 1, `"${foot}"`);
  L.check("and the agent's row now shows the reply time", before !== after && /^~\d+ weeks?$/.test(after), `${before} → ${after}`); /* v19.2 §C re-point: "~N weeks", was "~N wks" */
  if (await page.locator('[data-hkv="undo"]').count()) { await page.locator('[data-hkv="undo"]').click(); await page.waitForTimeout(2500); }
  const undone = await page.evaluate((id) => document.querySelector(`.aglist [data-agent-card="${id}"] .clv-rrep b`)?.textContent ?? "", agentId);
  L.check("Undo restores what the save wrote", undone === before, `${after} → ${undone}`);
  L.done(7);
});

/* ───────────────────────── F5 · pop ───────────────────────── */
/* RETIRED (v18.2 §D.4): v18's two rising pops are replaced by one flight to the ring, held by CL182 D4 */
test.skip("F5 · pop: '+n' is fixed in the top layer, rises above the drawer, unclipped, gone by 1.5s; none under reduced motion", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const L = new Ledger("F5");
  await open(page, SIZES[0], "F5", { motion: true });
  await liftMotionSuppression(page);
  await page.keyboard.press("h"); await page.waitForTimeout(900);
  if (await page.locator('[data-hk8="not-now"]').count()) { await page.locator('[data-hk8="not-now"]').click(); await page.waitForTimeout(500); await page.keyboard.press("h"); await page.waitForTimeout(900); }
  await page.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first().click(); await page.waitForTimeout(600);
  await page.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-hk8="save"]').click();
  /* the pops float once the save has landed (the pack's order: write, then "+n"), so the 400ms runs from there */
  await page.locator('[data-hk8="pop"]').first().waitFor({ state: "attached", timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const d = document.querySelector('.hdr[data-hdr="housekeeping"]')!.getBoundingClientRect();
    const pops = [...document.querySelectorAll<HTMLElement>('[data-hk8="pop"]')];
    return pops.map((p) => {
      const b = p.getBoundingClientRect(); const pe = p.style.pointerEvents; p.style.pointerEvents = "auto";
      const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); p.style.pointerEvents = pe;
      return { fixed: getComputedStyle(p).position, top: b.top, drawerTop: d.top, hit: at === p, big: p.classList.contains("big") };
    });
  });
  L.check("two pops at 400ms", r.length === 2, `${r.length}`);
  const ring = r.find((x) => x.big);
  L.check("a pop is position: fixed", r.every((x) => x.fixed === "fixed"), r.map((x) => x.fixed).join(","));
  L.check("the ring's pop has risen above the drawer's top", !!ring && ring.top < ring.drawerTop, `${ring?.top.toFixed(1)} vs ${ring?.drawerTop.toFixed(1)}`);
  L.check("nothing clips it (elementFromPoint at its centre returns it)", r.length > 0 && r.every((x) => x.hit), r.map((x) => x.hit).join(","));
  await page.waitForTimeout(1000);
  L.check("gone by 1500ms (from the save landing)", (await page.locator('[data-hk8="pop"]').count()) === 0, `${await page.locator('[data-hk8="pop"]').count()}`);
  await page.waitForTimeout(1500);
  await page.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => undefined); await page.waitForTimeout(2500);
  /* reduced motion: never visible */
  const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: "tests/e2e/.auth/state.json" });
  const p2 = await ctx.newPage();
  await openContacts16(p2, SIZES[0]);
  await p2.keyboard.press("h"); await p2.waitForTimeout(900);
  await p2.locator('[data-hk8="detail"][data-gap="reply"] [data-hk8="ledger-row"]').first().click(); await p2.waitForTimeout(600);
  await p2.locator('[data-hk8="field"][data-gap="reply"] button[data-d="1"]').click(); await p2.waitForTimeout(200);
  await p2.locator('[data-hk8="save"]').click();
  let seen = 0;
  for (let i = 0; i < 12; i++) { seen += await p2.locator('[data-hk8="pop"]').count(); await p2.waitForTimeout(100); }
  L.check("under reduced motion no pop is ever drawn", seen === 0, `${seen}`);
  await p2.waitForTimeout(1500);
  await p2.locator('[data-hkv="undo"]').click({ timeout: 5000 }).catch(() => undefined); await p2.waitForTimeout(2500);
  await ctx.close();
  L.done(6);
});


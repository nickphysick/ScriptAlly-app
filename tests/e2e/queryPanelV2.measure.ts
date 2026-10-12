/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY PANEL v2 — the masthead, the ledger, and actions that dim the page (QP2 V1–V10), measured on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell. Ref design-refs/query-panel-v2.
 *
 * V1 masthead · V2 under the bar · V3 faces · V4 ledger · V5 stand card · V6 browse is light · V7 act is dim ·
 * V8 one surface · V9 top-right door · V10 tabs kept. (L1 is the QP1, QC137, feed drawer v2 and journey suites,
 * run beside this one.)
 *
 * Each was run with its named mutation (`QP2_MUTATE=<lock>`: one named thing broken IN THE PAGE) before its green
 * was believed: reports/query-panel-v2/mutation-proofs.json.
 *
 * ⚠️ ONLY V10 WRITES, and on a query of its own (tests/e2e/seedQp1Save.mjs, the `qp1s-` prefix): one note, added,
 *    edited, pinned, unpinned and deleted in the same run, and the query removed after. Every act step elsewhere is
 *    opened and left by Escape, "← Back" or Cancel.
 * ⚠️ V10's "as v1" IS A CAPTURE OF THE v1 BUILD (`QP2_CAPTURE=1` against a preview of query-panel-v1), kept in
 *    tests/e2e/fixtures/qp2AgentTabV1.json. It holds the agent's facts, never a box, so it does not age with the
 *    date — except a history row's month, which is the record's own.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute, liftMotionSuppression } from "./measure";

const DIR = "reports/query-panel-v2";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QP2_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const ROW = '.qcw-list [data-qcv="row"]';
const PANEL = '[data-qp="panel"]';
const MID: Record<string, string> = { you: "rgb(217, 150, 122)", agent: "rgb(139, 155, 179)", closed: "rgb(181, 172, 164)" };
const TINT: Record<string, string> = { you: "rgb(246, 226, 216)", agent: "rgb(226, 231, 239)", closed: "rgb(236, 232, 227)" };
const FACES = /^"?(Special Elite|Source Serif 4|JetBrains Mono)"?/;
const AGENT_IDS = ["seed-query-10", "seed-pkgq-9", "seed-query-3"];
const FIX = "tests/e2e/fixtures/qp2AgentTabV1.json";

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  V1: { css: `.qsp .qcv-open-mast { background: #fff !important; }` },
  V2: { css: `.spanel.qsp { top: 8px !important; }` },
  /* the leak fix removed: the rules that make the panel's elements inherit its face, and its face tokens */
  V3: { js: `(() => { for (const ss of [...document.styleSheets]) { let rs; try { rs = ss.cssRules; } catch { continue; } for (let i = rs.length - 1; i >= 0; i--) { const t = rs[i].selectorText || ""; if (t.includes(":where(.qsp)") || /^\\.spanel\\.qsp$/.test(t.trim()) || t.includes(".spanel.qsp h1")) ss.deleteRule(i); } } })()` },
  /* the date after the text */
  V4: { css: `.qlg > .qlg-d { grid-column: 3 !important; grid-row: auto !important; text-align: left !important; order: 9; }` },
  /* the old verdict lines left under the stand card */
  V5: { js: `(() => { if (window.__m5) return; window.__m5 = true; new MutationObserver(() => { const l = document.querySelector('${PANEL} [data-qp="ledger"]'); if (l && !l.querySelector(".tl-pastfig")) { const d = document.createElement("div"); d.className = "tl-pastfig"; d.style.gridColumn = "1 / -1"; d.innerHTML = "<b>7 months</b> past the window they stated"; l.appendChild(d); } }).observe(document.body, { subtree: true, childList: true }); })()` },
  /* dim on open */
  V6: { css: `.spanel-scrim { opacity: 1 !important; pointer-events: auto !important; }` },
  /* no scrim when acting */
  V7: { css: `.spanel-scrim { display: none !important; }` },
  /* the fork's "Something changed since" opens the standalone drawer */
  V8: { js: `(() => { if (window.__m8) return; window.__m8 = true; document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".cor-branch"); if (!b || !/Something changed since/.test(b.textContent || "")) return; e.stopImmediatePropagation(); e.preventDefault(); const id = document.querySelector('${PANEL}').dataset.qpId; window.__saQueryDrawer.open({ mode: "resp", queryId: id }); }, true); })()` },
  /* the shell's "Record a response" opens the standalone drawer */
  V9: { js: `(() => { if (window.__m9) return; window.__m9 = true; document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(".ws-capi"); if (!b || !/^Record a response/.test((b.textContent || "").trim())) return; e.stopImmediatePropagation(); e.preventDefault(); window.__saQueryDrawer.open({ mode: "resp" }); }, true); })()` },
  /* the history list dropped */
  V10: { css: `.qsp .qat-hist { display: none !important; }` },
  /* V13 has no in-page mutation: its two are SOURCE mutations (a build with every link in every state, and with
     "Keep tracking" leaving Close in the lead) — reports/query-panel-v2/mutation-runs/V13.patch */
  /* every step's name drawn, and allowed to wrap, as it was */
  V12: { css: `.qad-root--panel .qad-stp em { display: block !important; white-space: normal !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
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
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
}
async function openQC(page: Page, vp: VP, lock: string, motion = false) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await expect(page.locator(ROW).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  if (motion) await liftMotionSuppression(page);
  await mutate(page, lock);
}
const openRow = async (page: Page, sel: string) => {
  const r = page.locator(sel).first();
  await expect(r, `no row ${sel}`).toBeVisible({ timeout: 10_000 });
  await r.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await r.locator('[data-qcv="row-agent"], .qcw-agt').first().click();
  await expect(page.locator(PANEL)).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);
};
const rowOf = (court: string, n = 0) => `${ROW}[data-court="${court}"] >> nth=${n}`;
const tab = async (page: Page, name: string) => { await page.locator(`${PANEL} [role="tab"]`, { hasText: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(350); };
/** every text-bearing element on screen inside the panel whose first face is not one of the three */
const badFaces = (page: Page) => page.evaluate((re) => {
  const p = document.querySelector('[data-qp="panel"]');
  if (!p) return { n: 0, bad: ["no panel"] };
  const ok = new RegExp(re);
  const bad: string[] = []; let n = 0;
  for (const el of [...p.querySelectorAll<HTMLElement>("*")]) {
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.width === 0) continue;
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && (c.textContent || "").trim());
    if (!own && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) continue;
    n++;
    const ff = getComputedStyle(el).fontFamily;
    if (!ok.test(ff)) bad.push(`${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""} "${(el.textContent || "").trim().slice(0, 24)}" → ${ff.split(",")[0]}`);
  }
  return { n, bad: [...new Set(bad)].slice(0, 12) };
}, FACES.source);
const scrim = (page: Page) => page.evaluate(() => {
  const s = document.querySelector<HTMLElement>("[data-side-scrim]");
  if (!s) return { present: false, opacity: 0, alpha: 0, covers: false, pe: "none" };
  const cs = getComputedStyle(s); const r = s.getBoundingClientRect();
  const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor); const parts = m ? m[1].split(",").map((x) => parseFloat(x)) : [];
  return { present: cs.display !== "none", opacity: cs.display === "none" ? 0 : parseFloat(cs.opacity), alpha: parts.length === 4 ? parts[3] : parts.length === 3 ? 1 : 0, covers: r.left <= 0 && r.top <= 0 && r.right >= window.innerWidth && r.bottom >= window.innerHeight, pe: cs.pointerEvents };
});
const surfaces = (page: Page) => page.evaluate(() => {
  const p = document.querySelector<HTMLElement>('[data-qp="panel"]');
  const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return {
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(vis).length,
    outside: [...document.querySelectorAll(".qad-drawer")].filter((d) => vis(d) && !p?.contains(d)).length,
    head: !!p?.querySelector(".qad-head") && vis(p.querySelector(".qad-head")!), quill: !!p?.querySelector(".qad-head .qad-qwrap img"),
    step: p?.querySelector<HTMLElement>("[data-qp-step]")?.dataset.qpStep ?? null,
    title: p?.querySelector('[data-qp="step-title"]')?.textContent ?? "", back: p?.querySelector('[data-qp="step-back"]')?.textContent ?? "",
    id: p?.dataset.qpId ?? "",
  };
});
/** leave whatever is stepped into the panel, back to the query */
const leaveStep = async (page: Page) => {
  for (let i = 0; i < 4; i++) {
    if (!(await page.locator(`${PANEL} [data-qp-step]`).count())) return;
    await page.keyboard.press("Escape"); await page.waitForTimeout(450);
    const disc = page.locator("[data-qad-discard] .disc").first();
    if (await disc.isVisible().catch(() => false)) { await disc.click(); await page.waitForTimeout(400); }
  }
};
/** the Agent tab's facts, as text: what v1 showed, whatever its dress */
const agentFacts = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-qp="panel"] .qat');
  if (!p) return null;
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
  const t = (e: Element | null | undefined) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
  return {
    place: t(p.querySelector(".qat-fseg")), door: t(p.querySelector(".qat-open")),
    links: [...p.querySelectorAll(".qat-actb")].filter(vis).map((a) => `${t(a)}|${a.getAttribute("href") ?? ""}`),
    figures: [...p.querySelectorAll(".qat-tv")].filter(vis).map(t),
    wishlist: p.querySelector(".qat-quote") && vis(p.querySelector(".qat-quote")!) ? t(p.querySelector(".qat-quote")).replace(/Manuscript wishlist$/i, "").trim() : "",
    asks: [...p.querySelectorAll(".qat-achip")].filter(vis).map(t),
    history: [...p.querySelectorAll(".qat-hrow")].filter(vis).map((r) => [t(r.querySelector(".qat-hw")), t(r.querySelector(".qat-hs")), t(r.querySelector(".qat-hd"))].join(" | ")),
    footer: [...p.querySelectorAll(".qat-lnk")].filter(vis).map(t),
  };
});

/* ── the v1 capture (run once, against a preview of query-panel-v1) ── */
test("capture · the Agent tab's facts as v1 showed them", async ({ page }) => {
  test.skip(!process.env.QP2_CAPTURE, "QP2_CAPTURE=1 against a query-panel-v1 build writes the fixture");
  test.setTimeout(240_000);
  await openQC(page, SIZES[0], "none");
  const out: Record<string, unknown> = {};
  for (const id of AGENT_IDS) { await openRow(page, `${ROW}[data-qid="${id}"]`); await tab(page, "Agent"); out[id] = await agentFacts(page); expect(out[id], `no agent tab for ${id}`).not.toBeNull(); }
  writeFileSync(FIX, JSON.stringify(out, null, 1));
});

test.describe("Query panel v2", () => {
  test.skip(!!process.env.QP2_CAPTURE, "capturing");

  test("V1 V2 · the masthead, and the panel under the bar", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("V1-V2");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "none");
      for (const court of ["agent", "you", "closed"]) {
        await openRow(page, rowOf(court));
        await mutate(page, "V1"); await mutate(page, "V2");
        await page.waitForTimeout(200);
        const m = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!;
          const mast = p.querySelector<HTMLElement>(".qcv-open-mast"); const nm = p.querySelector<HTMLElement>(".qcv-open-nm"); const on = p.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
          const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0)!;
          const log = [...document.querySelectorAll<HTMLElement>(".ws-pagebar .ws-capl")].find((b) => b.getBoundingClientRect().height > 0)!;
          const lr = log.getBoundingClientRect(); const at = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2);
          const search = [...document.querySelectorAll<HTMLElement>(".ws-pagebar .ws-search")].find((b) => b.getBoundingClientRect().height > 0);
          const sr = search?.getBoundingClientRect(); const sat = sr ? document.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2) : null;
          const cs = (e: HTMLElement | null) => (e ? getComputedStyle(e) : null);
          const pr = p.getBoundingClientRect();
          return {
            court: p.querySelector<HTMLElement>(".qcv-open")?.dataset.court ?? "", mast: cs(mast)?.backgroundColor ?? "none", edge: cs(mast)?.boxShadow ?? "",
            nmFace: cs(nm)?.fontFamily ?? "", nmSize: parseFloat(cs(nm)?.fontSize ?? "0"), nmCol: cs(nm)?.color ?? "",
            und: cs(on)?.borderBottomWidth ?? "", undCol: cs(on)?.borderBottomColor ?? "", caps: [...(mast?.querySelectorAll<HTMLElement>("*") ?? [])].filter((e) => getComputedStyle(e).textTransform === "uppercase" && (e.textContent ?? "").trim()).length,
            top: pr.top, barBottom: bar.getBoundingClientRect().bottom, right: window.innerWidth - pr.right, bottom: window.innerHeight - pr.bottom,
            logHit: !!at && (at === log || log.contains(at)), searchHit: !!sat && !!search && (sat === search || search.contains(sat)),
          };
        });
        const c = `${w} ${court}`;
        L.check("V1", `${c} the masthead is navy`, m.mast === "rgb(45, 58, 80)", m.mast);
        L.check("V1", `${c} its top edge is the court's mid colour, 5px`, m.edge.includes(MID[m.court]) && /0px 5px 0px 0px inset/.test(m.edge), m.edge);
        L.check("V1", `${c} the name is Special Elite 30 in cream`, /Special Elite/.test(m.nmFace) && near(m.nmSize, 30, 1) && m.nmCol === "rgb(244, 238, 229)", `${m.nmFace.split(",")[0]} ${m.nmSize}px ${m.nmCol}`);
        L.check("V1", `${c} the active tab's underline is 3px in the court's mid colour`, m.und === "3px" && m.undCol === MID[m.court], `${m.und} ${m.undCol}`);
        L.check("V1", `${c} no small capitals in the masthead`, m.caps === 0, `${m.caps} uppercase element(s)`);
        L.check("V2", `${c} the panel's top is the bar's bottom`, near(m.top, m.barBottom, 1), `top ${m.top} · bar bottom ${m.barBottom}`);
        L.check("V2", `${c} right and bottom stay 8`, near(m.right, 8, 1) && near(m.bottom, 8, 1), `right ${m.right} · bottom ${m.bottom}`);
        L.check("V2", `${c} "Log a query" and Search are on top at their own centres`, m.logHit && m.searchHit, `log ${m.logHit} · search ${m.searchHit}`);
      }
      /* …and its menu drops over the panel, where it can be pressed */
      await page.locator(".ws-pagebar .ws-capr").filter({ visible: true }).first().click();
      await page.waitForTimeout(350);
      const menu = await page.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>(".ws-capi")].find((x) => x.getBoundingClientRect().height > 0); if (!b) return "no menu"; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return at && (at === b || b.contains(at)) ? "ok" : `covered by .${(at as HTMLElement | null)?.className ?? "nothing"}`; });
      L.check("V2", `${w} the bar's menu opens over the panel`, menu === "ok", menu);
      await page.keyboard.press("Escape");
    }
    L.done(50);
  });

  test("V3 · faces: every text-bearing element in the panel, on all three tabs and every act step", async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(10_000);
    const L = new Ledger("V3");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "V3");
      let scanned = 0;
      const scan = async (where: string) => { const r = await badFaces(page); scanned += r.n; L.check("V3", `${w} ${where}`, r.n > 3 && r.bad.length === 0, r.bad.length ? r.bad.join(" ; ") : `${r.n} elements`); };
      for (const sel of [rowOf("agent"), rowOf("you"), `${ROW}[data-status="Offer"]`, rowOf("closed")]) {
        if (!(await page.locator(sel).count())) continue;
        await openRow(page, sel);
        const who = (await page.locator(`${PANEL} .qcv-open`).getAttribute("data-status")) ?? sel;
        for (const t of ["Tracking", "Agent", "Notes"]) { await tab(page, t); await scan(`${who} · ${t}`); }
        await tab(page, "Tracking");
        const doors = await page.locator(`${PANEL} [data-door]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.door!));
        for (const d of doors) {
          await page.locator(`${PANEL} [data-door="${d}"]`).click(); await page.waitForTimeout(600);
          for (let i = 0; i < 6; i++) {
            await scan(`${who} · ${d} · step ${i + 1}`);
            const p = page.locator(`${PANEL} [data-qad-primary]`);
            if (!(await p.count()) || (await p.isDisabled()) || !/^Next/.test((await p.innerText()).trim())) break;
            await p.click(); await page.waitForTimeout(450);
          }
          await leaveStep(page);
        }
        /* the correction fork, and its edit */
        const fix = page.locator(`${PANEL} .qlg-fix`).first();
        if (await fix.count()) {
          await fix.click({ force: true }); await page.waitForTimeout(500); await scan(`${who} · fork`);
          const mistake = page.locator(`${PANEL} .cor-branch`, { hasText: /correcting a mistake/ }).first();
          if (await mistake.count()) { await mistake.click(); await page.waitForTimeout(500); await scan(`${who} · correct · the details`); }
          await leaveStep(page); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
        }
      }
      /* the picker */
      await page.locator(".ws-pagebar .ws-capr").filter({ visible: true }).first().click(); await page.waitForTimeout(300);
      await page.locator(".ws-capi", { hasText: /^Record a response/ }).first().evaluate((e) => (e as HTMLElement).click()); await page.waitForTimeout(900);
      await scan("the picker");
      await leaveStep(page);
      L.check("V3", `${w} the sweep had something to read`, scanned > 400, `${scanned} elements over ${L.rows.length} scans`);
    }
    L.done(40);
  });

  test("V4 V5 · the ledger, and the one stand card that ends it", async ({ page }) => {
    test.setTimeout(600_000);
    const L = new Ledger("V4-V5");
    const seen: Record<string, number> = {};
    const STATES: [string, RegExp][] = [["waiting", /^Waiting on /], ["past", /^No word from .+ yet$/], ["year", /^Still waiting on /], ["send", /^Send .+ the (partial|full|revision)$/], ["offer", /^Your answer is due$/], ["closed", / passed$|^Closed, no reply$|^You withdrew it$|^You signed with /]];
    /* ⚠️ THE HARNESS ACCOUNT HOLDS NO QUERY THAT IS WAITING AND NOT YET DUE (every agent's-turn query on it is past
       its window, by fixture drift), so that branch is met on a query of its own: Queried five days ago against an
       eight-week window. Removed in the same run. */
    execSync("node tests/e2e/seedQp1Save.mjs", { stdio: "inherit" });
    try {
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "none");
      await mutate(page, "V4"); await mutate(page, "V5");
      const ids = await page.locator(ROW).evaluateAll((els) => els.filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).map((e) => ({ id: (e as HTMLElement).dataset.qid!, court: (e as HTMLElement).dataset.court!, status: (e as HTMLElement).dataset.status! })));
      /* a spread: every court, the offer, and enough agent-court rows to meet waiting, late and over-a-year */
      const pick = [...ids.filter((r) => r.court === "agent").slice(0, 14), ...ids.filter((r) => r.court === "you").slice(0, 3), ...ids.filter((r) => r.status === "Offer").slice(0, 1), ...ids.filter((r) => r.court === "closed").slice(0, 3), ...ids.filter((r) => /seed-cal-passed865|thin-q-close|qp1s-q/.test(r.id))];
      const mine: Record<string, number> = {};
      for (const r of pick) {
        await openRow(page, `${ROW}[data-qid="${r.id}"]`);
        await tab(page, "Tracking");
        const g = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; const lg = p.querySelector<HTMLElement>('[data-qp="ledger"]');
          if (!lg) return null;
          const lr = lg.getBoundingClientRect(); const spine = lr.left + 92 + 14 + 13;
          const dates = [...lg.querySelectorAll<HTMLElement>('[data-qp="ledger-date"]')].map((d) => { const b = d.getBoundingClientRect(); return { left: b.left - lr.left, w: b.width, align: getComputedStyle(d).textAlign, text: (d.textContent ?? "").trim() }; });
          const marks = [...lg.querySelectorAll<HTMLElement>('[data-qp="ledger-mark"]')].map((m) => { const b = m.getBoundingClientRect(); return b.left + b.width / 2 - spine; });
          const entries = [...lg.querySelectorAll<HTMLElement>('[data-qp="ledger-entry"]')];
          const sent = entries.find((e) => e.dataset.status === "Queried" && e.dataset.kind === "status");
          const stands = [...p.querySelectorAll<HTMLElement>('[data-qp="stand"]')];
          const st = stands[0];
          return {
            court: p.querySelector<HTMLElement>(".qcv-open")?.dataset.court ?? "", dates, marks, entries: entries.length, cols: getComputedStyle(lg).gridTemplateColumns, gap: getComputedStyle(lg).columnGap,
            sentHasSlip: sent ? !!sent.querySelector('[data-qp="slip"]') : null, textLeft: entries[0] ? entries[0].getBoundingClientRect().left - lr.left : -1,
            stands: stands.length, standLast: !!st && lg.lastElementChild === st, standBg: st ? getComputedStyle(st).backgroundColor : "", standSpan: st ? Math.abs(st.getBoundingClientRect().width - lr.width) : -1,
            heading: st?.querySelector('[data-qp="stand-heading"]')?.textContent ?? "", figure: st?.querySelector('[data-qp="stand-figure"]')?.textContent ?? "", late: st?.dataset.past === "true", tone: st?.dataset.tone ?? "",
            old: p.querySelectorAll(".tl-wbar, .tl-pastfig, .tl-conv, .tl-offer, .tl-nhist").length, words: (p.innerText || "").replace(/Record a late reply/g, ""), headFace: st ? getComputedStyle(st.querySelector('[data-qp="stand-heading"]')!).fontFamily : "", headSize: st ? parseFloat(getComputedStyle(st.querySelector('[data-qp="stand-heading"]')!).fontSize) : 0,
          };
        });
        const c = `${w} ${r.id}`;
        if (!g) { L.check("V4", `${c} a ledger`, false, "no ledger"); continue; }
        L.check("V4", `${c} three columns, 92 · 26 · the rest, 14 apart`, /^92px 26px /.test(g.cols) && g.gap === "14px", `${g.cols} · gap ${g.gap}`);
        L.check("V4", `${c} every date is right-aligned in the first 92px column`, g.dates.length > 0 && g.dates.every((d) => d.align === "right" && near(d.left, 0, 1) && near(d.w, 92, 1)), g.dates.map((d) => `${d.text}@${Math.round(d.left)}/${Math.round(d.w)}/${d.align}`).join(" ").slice(0, 160));
        L.check("V4", `${c} every StatusDot's centre is on the spine`, g.marks.length === g.entries && g.marks.every((m) => Math.abs(m) <= 1), g.marks.map((m) => m.toFixed(1)).join(" "));
        L.check("V4", `${c} the entry's text is in the third column`, near(g.textLeft, 92 + 14 + 26 + 14, 1), `${g.textLeft}`);
        if (g.sentHasSlip != null) L.check("V4", `${c} the query-sent entry holds the slip`, g.sentHasSlip, `${g.sentHasSlip}`);
        L.check("V5", `${c} exactly one stand card, and it ends the ledger`, g.stands === 1 && g.standLast && near(g.standSpan, 0, 1), `${g.stands} card(s) · last ${g.standLast} · ${g.standSpan}px short of the ledger's width`);
        L.check("V5", `${c} its ground is the court's tint`, g.standBg === TINT[g.court], `${g.standBg} (court ${g.court})`);
        L.check("V5", `${c} no old verdict line is left`, g.old === 0, `${g.old}`);
        /* Nick's ruling (12 Oct): the panel never says "late" or "overdue". The one exception is the name of an action
           he ruled stays, "Record a late reply" — a reply that came after the close, not a verdict on anybody. */
        const m = /\b(late|overdue)\b/i.exec(g.words);
        L.check("V5", `${c} the panel says neither "late" nor "overdue"`, !m, m ? `"${g.words.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, " ")}"` : "neither");
        const state = STATES.find(([, re]) => re.test(g.heading))?.[0] ?? null;
        L.check("V5", `${c} its heading is one of the table's`, !!state && /Special Elite/.test(g.headFace) && near(g.headSize, 22, 1), `"${g.heading}" · ${g.headFace.split(",")[0]} ${g.headSize}`);
        const agree = state === "waiting" ? (!g.figure || /days? to go$/.test(g.figure)) && !g.late : state === "past" ? /days? past your date$/.test(g.figure) && g.late : state === "year" ? /year/.test(g.figure) && g.late : state === "send" ? (!g.figure || /days? (left|over)$/.test(g.figure)) && g.court === "you" : state === "offer" ? (!g.figure || /days? (left|over)$/.test(g.figure)) : state === "closed" ? g.court === "closed" && !g.late : false;
        L.check("V5", `${c} the figure and the court agree with it`, agree, `"${g.heading}" · figure "${g.figure}" · late ${g.late} · court ${g.court}`);
        if (state) { mine[state] = (mine[state] ?? 0) + 1; seen[state] = (seen[state] ?? 0) + 1; }
      }
      console.log(`  V5 ${w} states met: ${JSON.stringify(mine)}`);
      for (const [s] of STATES) L.check("V5", `${w} a query in the "${s}" state was met`, (mine[s] ?? 0) > 0, `${mine[s] ?? 0}`);
    }
    } finally { execSync("node tests/e2e/seedQp1Save.mjs --clean", { stdio: "inherit" }); }
    L.done(120);
  });

  /* ── V12 · the stepper at the panel's width (ruling 4) ── */
  test("V12 · stepper: numbered circles, the current step's name alone, on one line; every step named for assistive tech", async ({ page }) => {
    test.setTimeout(420_000);
    page.setDefaultTimeout(10_000);
    const L = new Ledger("V12");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "none");
      let steps = 0;
      const read = async (where: string) => {
        await mutate(page, "V12");
        const r = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>('[data-qp="panel"]')!; const pr = p.getBoundingClientRect();
          const st = [...p.querySelectorAll<HTMLElement>(".qad-stepper .qad-stp")].filter((e) => e.getBoundingClientRect().height > 0);
          const labs = st.map((s) => { const em = s.querySelector<HTMLElement>("em"); const b = em?.getBoundingClientRect(); const cs = em ? getComputedStyle(em) : null; const lh = cs ? (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3) : 0;
            return { cur: s.classList.contains("cur"), shown: !!b && b.height > 0, lines: b && lh ? Math.round(b.height / lh) : 0, inside: !b || b.height === 0 || (b.left >= pr.left - 0.5 && b.right <= pr.right + 0.5), text: (em?.textContent ?? "").trim(), aria: s.getAttribute("aria-label") ?? "", title: s.getAttribute("title") ?? "", circle: !!s.querySelector("i") && s.querySelector("i")!.getBoundingClientRect().height > 0 }; });
          return labs;
        });
        if (!r.length) return;
        steps++;
        const shown = r.filter((x) => x.shown);
        L.check("V12", `${w} ${where}: a numbered circle for every step, and only the current step's name is drawn`, r.every((x) => x.circle) && shown.length === 1 && shown[0].cur, `${r.length} steps · names drawn: ${shown.map((x) => x.text).join(" | ") || "none"}`);
        L.check("V12", `${w} ${where}: no name wraps, and it stays inside the panel`, shown.every((x) => x.lines === 1 && x.inside), shown.map((x) => `"${x.text}" ${x.lines} line(s)${x.inside ? "" : ", outside the panel"}`).join(" · ") || "none drawn");
        L.check("V12", `${w} ${where}: every step carries its name as aria-label and title`, r.every((x) => x.aria === x.text && x.title === x.text && x.text.length > 0), r.filter((x) => x.aria !== x.text || x.title !== x.text).map((x) => `"${x.text}" aria "${x.aria}" title "${x.title}"`).join(" · ") || "all named");
      };
      for (const sel of [rowOf("agent"), rowOf("you"), `${ROW}[data-status="Offer"]`]) {
        if (!(await page.locator(sel).count())) continue;
        await openRow(page, sel);
        const who = (await page.locator(`${PANEL} .qcv-open`).getAttribute("data-status")) ?? sel;
        const doors = await page.locator(`${PANEL} [data-door]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.door!));
        for (const d of doors) {
          await page.locator(`${PANEL} [data-door="${d}"]`).click(); await page.waitForTimeout(600);
          for (let i = 0; i < 6; i++) {
            await read(`${who} · ${d} · step ${i + 1}`);
            /* read in one go: the foot re-renders between steps, and a locator held across that can go stale */
            const nx = await page.evaluate(() => { const b = document.querySelector<HTMLButtonElement>('[data-qp="panel"] [data-qad-primary]'); return b && !b.disabled && /^Next/.test((b.textContent ?? "").trim()); });
            if (!nx) break;
            await page.locator(`${PANEL} [data-qad-primary]`).click(); await page.waitForTimeout(450);
          }
          await leaveStep(page);
        }
      }
      /* the correction's two steps */
      await openRow(page, `${ROW}[data-qid="seed-query-10"]`);
      await page.locator(`${PANEL} .qlg-fix`).first().click({ force: true }); await page.waitForTimeout(500);
      await page.locator(`${PANEL} .cor-branch`, { hasText: /correcting a mistake/ }).first().click(); await page.waitForTimeout(500);
      await read("the correction · the details");
      await leaveStep(page); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      L.check("V12", `${w} the walk met steppers`, steps >= 8, `${steps} stepper states read`);
    }
    L.done(40);
  });

  /* ── V11 · the serif's italic is a real face (ruling 2). Its mutation is not a style or a script in the page: the
        italic's stylesheet is refused on the network, which is what "never loaded" is. ── */

  test("V13 · the stand card's links: each only in its state, and Keep tracking swaps the footer's lead", async ({ page }) => {
    test.setTimeout(420_000);
    page.setDefaultTimeout(10_000);
    const L = new Ledger("V13");
    const dump = () => JSON.parse(execSync("node tests/e2e/seedQp2Links.mjs --dump", { encoding: "utf8" }).trim().split("\n").pop()!) as { docs: Record<string, Record<string, unknown>>; log: Record<string, string[]>; feed: string[]; queries: Record<string, { dateSent: string | null; keep: boolean | null; expected: string | null }>; tasks: { text: string; queryId: string; done: boolean }[] };
    const card = () => page.evaluate(() => {
      const p = document.querySelector<HTMLElement>('[data-qp="panel"]');
      if (!p) return null;
      const shown = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
      const links = [...p.querySelectorAll<HTMLElement>('[data-qp="stand-link"]')].filter(shown);
      const cs = links[0] ? getComputedStyle(links[0]) : null;
      return {
        id: p.querySelector("[data-id]")?.getAttribute("data-id") ?? "",
        cards: p.querySelectorAll('[data-qp="stand"]').length,
        links: links.map((b) => (b.textContent ?? "").trim()),
        style: cs ? `${cs.fontFamily.split(",")[0].replace(/"/g, "")} ${cs.fontSize} ${cs.color} ${cs.borderBottomWidth} ${cs.borderBottomStyle}` : "",
        under: links.length ? links.every((b) => b.getBoundingClientRect().top >= (p.querySelector('[data-qp="stand-text"]') as HTMLElement).getBoundingClientRect().bottom - 1) : true,
        text: (p.querySelector('[data-qp="stand-text"]')?.textContent ?? "").trim(),
        lead: (p.querySelector('[data-qcv="open-action"]')?.textContent ?? "").trim(),
        doors: [...p.querySelectorAll('[data-qcv="open-door"]')].map((b) => (b.textContent ?? "").trim()),
      };
    });
    /* the list tray's first button for a row, read from the row itself (the tray is drawn, and shown on hover) */
    const tray = (id: string) => page.evaluate((sel) => { const r = document.querySelector<HTMLElement>(sel); const b = r?.querySelector<HTMLElement>('[data-qcv="row-tray"] button'); return b ? `${(b.textContent ?? "").trim()}|${b.dataset.qcv}` : "(no tray button)"; }, `${ROW}[data-qid="${id}"]`);
    /* the row's "Next move" words */
    const verb = (id: string) => page.evaluate((sel) => (document.querySelector<HTMLElement>(`${sel} [data-qcv="row-verb"]`)?.textContent ?? "").trim(), `${ROW}[data-qid="${id}"]`);
    /* ONE DECISION SAID THREE WAYS: the column's words for each button the tray can lead with */
    const WORDS: Record<string, string[]> = {
      "Close query": ["Consider closing"], "Record a response": ["Waiting"], "Nudge": ["Nudge"],
      "Mark partial sent": ["Send partial"], "Mark full sent": ["Send full"], "Mark revision sent": ["Send revision"],
      "Record your answer": ["Decide on offer"], "Record what you sent": ["Record what you sent"],
    };
    const triple = async (id: string) => { const t = (await tray(id)).split("|"); const c = await card(); return { column: await verb(id), tray: t[1] === "row-act" ? t[0] : "", panel: c?.lead ?? "" }; };
    const openId = async (id: string) => { await openRow(page, `${ROW}[data-qid="${id}"]`); await tab(page, "Tracking"); };
    const LINK = (k: string) => `${PANEL} [data-qp="stand-link"][data-link="${k}"]`;
    const STYLE = "Source Serif 4 15px rgb(42, 58, 82) 1px solid";
    /* the states that must offer nothing, on the account's own rows, and the three that offer theirs */
    const WANT: Record<string, string[]> = { "qp2l-nosent": ["Add the date you sent it"], "qp2l-nowin": ["Set a date"], "qp2l-year": ["Remind me later", "Keep tracking"], "qp2l-request": ["Set a send-by date"] };
    try {
      execSync("node tests/e2e/seedQp2Links.mjs", { stdio: "inherit" });
      await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* */ } });
      const seen: Record<string, number> = {};
      const agree: Record<string, number> = {}; const apart: string[] = [];
      for (const vp of SIZES) {
        const w = `${vp.width}`;
        await openQC(page, vp, "none");
        for (const [id, want] of Object.entries(WANT)) {
          await openId(id);
          const c = await card();
          L.check("V13", `${w} ${id} · the panel shows this query, with one stand card`, c?.id === id && c.cards === 1, `${c?.id} · ${c?.cards} card(s)`);
          L.check("V13", `${w} ${id} · exactly its links`, JSON.stringify(c?.links) === JSON.stringify(want), `${JSON.stringify(c?.links)} (wants ${JSON.stringify(want)})`);
          L.check("V13", `${w} ${id} · quiet links: Source Serif 15, navy, an underline rule, under the paragraph`, c?.style === STYLE && c.under, `${c?.style} · under the paragraph ${c?.under}`);
          for (const l of c?.links ?? []) seen[l] = (seen[l] ?? 0) + 1;
          const t = await triple(id);
          if (t.tray) { agree[`${t.column} · ${t.tray}`] = (agree[`${t.column} · ${t.tray}`] ?? 0) + 1; L.check("V13", `${w} ${id} · the column's words are the tray button's`, (WORDS[t.tray] ?? []).includes(t.column), `column "${t.column}" · tray "${t.tray}" · panel "${t.panel}"`); }
        }
        /* the other states: a request, a closed query, and a query with the agent inside its dated wait */
        for (const court of ["you", "closed", "agent"]) {
          const sel = court === "closed" ? rowOf(court) : `${ROW}[data-court="${court}"]:not([data-qid^="qp2l-"])`;
          let read = 0;
          for (let n = 0; n < 3; n++) {
            const row = page.locator(sel).nth(n);
            if (!(await row.count())) break;
            await openRow(page, `${sel} >> nth=${n}`); await tab(page, "Tracking");
            const c = await card();
            /* a row of the account's own may itself be in a link state; what it may not show is a link its text does not earn */
            const earned = /Closing it keeps your reply rate honest/.test(c?.text ?? "") ? ["Remind me later", "Keep tracking"] : /No reply date is recorded/.test(c?.text ?? "") ? ["Add the date you sent it", "Set a date"]
              : /^Mark it sent once/.test(c?.text ?? "") ? ["Set a send-by date"] : [];
            const stray = (c?.links ?? []).filter((l) => !earned.includes(l));
            L.check("V13", `${w} ${court} row ${n} (${c?.id}) · no link outside its state`, c != null && stray.length === 0, stray.length ? `stray: ${stray.join(", ")}` : `${c?.links.length} link(s), ${earned.length ? "earned" : "none earned"}`);
            if (c && earned.length === 0) seen[`none:${court}`] = (seen[`none:${court}`] ?? 0) + 1;
            const t = c ? await triple(c.id) : null;
            if (t?.tray) {
              agree[`${t.column} · ${t.tray}`] = (agree[`${t.column} · ${t.tray}`] ?? 0) + 1;
              L.check("V13", `${w} ${court} row ${n} (${c!.id}) · the column's words are the tray button's`, (WORDS[t.tray] ?? []).includes(t.column), `column "${t.column}" · tray "${t.tray}" · panel "${t.panel}"`);
              if (t.tray !== t.panel) apart.push(`${c!.id}: tray "${t.tray}", panel "${t.panel}"`);
            }
            read++;
          }
          L.check("V13", `${w} ${court} · rows were read`, read > 0, `${read} row(s)`);
        }
      }
      /* each state was entered, and so was "no links" for a request and a closed query */
      console.log(`[V13] states seen: ${JSON.stringify(seen)}`);
      console.log(`[V13] column · tray pairs read: ${JSON.stringify(agree)}`);
      console.log(`[V13] rows under a year whose tray is their board card's act, not the panel's primary: ${[...new Set(apart)].join("; ") || "none"}`);
      L.check("V13", "the tally · more than one column and tray pair was read", Object.keys(agree).length >= 2, Object.keys(agree).join(" | "));
      /* "no links" on a request is read below, on this lock's own request once it has a date */
      for (const k of ["Add the date you sent it", "Set a date", "Remind me later", "Keep tracking", "Set a send-by date", "none:closed"]) L.check("V13", `the tally · ${k}`, (seen[k] ?? 0) > 0, `${seen[k] ?? 0}`);

      /* ── pressing them, at 1512 ── a step that cannot be taken is a red reading, not a thrown run: the
         readings above it still print */
      try {
      await openQC(page, SIZES[0], "none");
      /* Add the date you sent it → the sent-date editor, on top of the panel; leaving it writes nothing */
      await openId("qp2l-nosent");
      await page.locator(LINK("addSentDate")).click();
      const field = page.locator('input[type="date"][aria-label="Date sent"]');
      await expect(field, "the sent-date editor did not open").toBeVisible();
      const top = await field.evaluate((e) => { const r = e.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e; });
      L.check("V13", "Add the date you sent it · opens the sent-date editor, above the panel", top, top ? "the field is what is under its own centre" : "something covers the field");
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      L.check("V13", "Add the date you sent it · leaving the editor writes nothing", dump().queries["qp2l-nosent"]?.dateSent === null, JSON.stringify(dump().queries["qp2l-nosent"]));

      /* Set a date → the slider in the card; Cancel puts the link back and writes nothing */
      if (!(await page.locator(PANEL).count())) await openQC(page, SIZES[0], "none");
      await openId("qp2l-nowin");
      await page.locator(LINK("setDate")).click();
      const slider = page.locator(`${PANEL} [data-qp="stand-setdate"] input[type="range"]`);
      await expect(slider, "the slider did not open in the card").toBeVisible();
      const during = await card();
      L.check("V13", "Set a date · opens the weeks slider in the card, and the link stands down", during?.links.length === 0, JSON.stringify(during?.links));
      await page.locator(`${PANEL} [data-qp="stand-setdate"] .tl-setwin-cancel`).click(); await page.waitForTimeout(300);
      const after = await card();
      L.check("V13", "Set a date · Cancel puts the link back and writes nothing", JSON.stringify(after?.links) === '["Set a date"]' && dump().queries["qp2l-nowin"]?.expected === null, `${JSON.stringify(after?.links)} · ${JSON.stringify(dump().queries["qp2l-nowin"])}`);

      /* Set a send-by date → the edit journey's one step, in the panel; saving changes two fields and nothing else */
      await openId("qp2l-request");
      await page.locator(LINK("setSendBy")).click();
      const step = page.locator(`${PANEL} [data-qp-step]`);
      await expect(step, "the send-by step did not open in the panel").toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);
      const stepText = (await step.innerText()).replace(/\s+/g, " ");
      const chips = ["In a week", "In two weeks", "In four weeks", "No date given", "Two days before", "The day before", "On the day", "No reminder"];
      const missing = chips.filter((c) => !stepText.includes(c));
      L.check("V13", "Set a send-by date · the response journey's chips and reminder choices, in the panel", missing.length === 0 && /When you.ll send it by/.test(stepText) && (await scrim(page)).opacity > 0, missing.length ? `missing: ${missing.join(", ")}` : `all 8 choices · scrim opacity ${(await scrim(page)).opacity}`);
      /* the account at rest: the app settles its own documents after a load, and that is not this save */
      let before = dump();
      for (let i = 0; i < 6; i++) { await page.waitForTimeout(1500); const again = dump(); if (JSON.stringify(again) === JSON.stringify(before)) break; before = again; }
      for (let i = 0; i < 4; i++) {
        const b = page.locator(`${PANEL} [data-qad-primary]`);
        const label = await b.innerText();
        await b.click();
        if (!/^Next/.test(label)) break;
        await page.waitForTimeout(450);
      }
      await expect.poll(async () => (await card())?.links.length ?? -1, { timeout: 15_000 }).toBe(0);
      await page.waitForTimeout(800);
      const afterSave = dump();
      const d0 = before.docs["qp2l-request"] ?? {}; const d1 = afterSave.docs["qp2l-request"] ?? {};
      const changed = [...new Set([...Object.keys(d0), ...Object.keys(d1)])].filter((k) => JSON.stringify(d0[k]) !== JSON.stringify(d1[k])).sort();
      L.check("V13", "Set a send-by date · only the send-by date and its reminder changed on the query", JSON.stringify(changed) === '["expectedSendDate","sendReminderDate"]', `changed: ${changed.join(", ") || "nothing"}`);
      const keysOf = (k: string) => [...new Set([...Object.keys(before.docs[k] ?? {}), ...Object.keys(afterSave.docs[k] ?? {})])].filter((f) => JSON.stringify(before.docs[k]?.[f]) !== JSON.stringify(afterSave.docs[k]?.[f]));
      const others = Object.keys(before.docs).filter((k) => k !== "qp2l-request" && keysOf(k).length > 0).map((k) => `${k} (${keysOf(k).join(", ")})`);
      L.check("V13", "Set a send-by date · no entry, feed row or other query changed", JSON.stringify(before.log) === JSON.stringify(afterSave.log) && JSON.stringify(before.feed) === JSON.stringify(afterSave.feed) && others.length === 0, `log ${JSON.stringify(afterSave.log["qp2l-request"])} · feed ${afterSave.feed.length} (was ${before.feed.length}) · other queries changed: ${others.join(", ") || "none"}`);
      const due = String(d1.expectedSendDate ?? "").slice(0, 10); const rem = String(d1.sendReminderDate ?? "").slice(0, 10);
      const days = (iso: string) => Math.round((new Date(iso).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86_400_000);
      L.check("V13", "Set a send-by date · the defaults saved: two weeks out, reminded the day before", days(due) === 14 && days(rem) === 13, `send by ${due} (+${days(due)}) · reminder ${rem} (+${days(rem)})`);
      const sc = await card();
      L.check("V13", "Set a send-by date · a request with a date offers no link, and the card counts to it", sc?.links.length === 0 && /expecting it by/.test(sc?.text ?? ""), `"${sc?.text}" · ${JSON.stringify(sc?.links)}`);

      /* ··· → "I'm correcting a mistake" on the REQUEST carries the send-by date; on any other entry it does not */
      const openFix = async (n: number) => {
        await page.locator(`${PANEL} .qlg-fix`).nth(n).click();
        await page.locator(`${PANEL} .cor-branch`, { hasText: /correcting a mistake/ }).first().click();
        await expect(page.locator(`${PANEL} .cor-ta`), "the correction form did not open").toBeVisible();
      };
      const closeFix = async () => { await leaveStep(page); await expect(page.locator(`${PANEL} .cor-ta`)).toHaveCount(0); };
      const SB = `${PANEL} [data-qp="send-by"]`;
      await expect(page.locator(`${PANEL} .qlg-fix`)).toHaveCount(2);
      await openFix(0);
      L.check("V13", "··· edit · the sent entry of the same query shows no send-by step", (await page.locator(SB).count()) === 0, `${await page.locator(SB).count()} section(s)`);
      await closeFix();
      await openFix(1);
      const recorded = (await page.locator(`${SB} .qad-chip.on`).allInnerTexts()).join("|").replace(/\s+/g, " ");
      L.check("V13", "··· edit · the request shows the step after date and note, on the recorded date", (await page.locator(SB).count()) === 1 && /^As recorded/.test(recorded)
        && await page.evaluate((sel) => { const sb = document.querySelector(sel)!; const ta = document.querySelector('[data-qp="panel"] .cor-ta')!; return !!(ta.compareDocumentPosition(sb) & Node.DOCUMENT_POSITION_FOLLOWING); }, SB), `chip on: "${recorded}"`);
      const e0 = dump();
      await page.locator(`${SB} [data-qad-chip="4w"]`).click();
      await page.locator(`${SB} [data-qad-chip="0"]`).click();
      await page.locator(`${PANEL} .cor-save`).click();
      const undo = page.locator(".sa-toast-undo");
      await expect(undo, "no Undo after the correction saved").toBeVisible({ timeout: 15_000 });
      await expect.poll(() => String(dump().docs["qp2l-request"]?.expectedSendDate ?? "").slice(0, 10), { timeout: 15_000 }).not.toBe(String(e0.docs["qp2l-request"]?.expectedSendDate ?? "").slice(0, 10));
      const e1 = dump().docs["qp2l-request"] ?? {};
      const due2 = String(e1.expectedSendDate ?? "").slice(0, 10); const rem2 = String(e1.sendReminderDate ?? "").slice(0, 10);
      L.check("V13", "··· edit · saving changes the send-by date and its reminder with the rest", days(due2) === 28 && days(rem2) === 28, `send by ${due2} (+${days(due2)}) · reminder ${rem2} (+${days(rem2)})`);
      await undo.click();
      await expect.poll(() => String(dump().docs["qp2l-request"]?.expectedSendDate ?? "").slice(0, 10), { timeout: 15_000 }).toBe(String(e0.docs["qp2l-request"]?.expectedSendDate ?? "").slice(0, 10));
      const e2 = dump().docs["qp2l-request"] ?? {};
      L.check("V13", "··· edit · Undo puts both back", e2.expectedSendDate === e0.docs["qp2l-request"]?.expectedSendDate && e2.sendReminderDate === e0.docs["qp2l-request"]?.sendReminderDate, `send by ${String(e2.expectedSendDate).slice(0, 10)} · reminder ${String(e2.sendReminderDate).slice(0, 10)}`);
      /* every other entry type the account holds: no step */
      const kinds: Record<string, number> = {};
      for (const court of ["agent", "closed", "you"]) {
        const sel = court === "closed" ? rowOf(court) : `${ROW}[data-court="${court}"]:not([data-qid^="qp2l-"])`;
        for (let n = 0; n < 2; n++) {
          if (!(await page.locator(sel).nth(n).count())) break;
          await openRow(page, `${sel} >> nth=${n}`); await tab(page, "Tracking");
          const fixes = await page.locator(`${PANEL} .qlg-fix`).count();
          const status = (await page.locator(`${PANEL} .qcv-open`).getAttribute("data-status")) ?? "";
          for (let i = 0; i < fixes; i++) {
            await openFix(i);
            const subject = ((await page.locator(`${PANEL} .cor-subj`).first().innerText().catch(() => "")) || `entry ${i}`).replace(/\s+/g, " ").split(" · ")[0].slice(0, 40);
            const has = (await page.locator(SB).count()) > 0;
            /* the one entry that may carry it: the LAST entry of a query that still owes material */
            const live = court === "you" && i === fixes - 1;
            if (!live) { kinds[subject] = (kinds[subject] ?? 0) + 1; L.check("V13", `··· edit · ${status} · "${subject}" shows no send-by step`, !has, has ? "it shows one" : "none"); }
            await closeFix();
          }
        }
      }
      console.log(`[V13] entry kinds read without the step: ${JSON.stringify(kinds)}`);
      L.check("V13", "··· edit · several kinds of entry were read", Object.keys(kinds).length >= 3, Object.keys(kinds).join(" | "));

      /* over a year: Close leads; Remind me later hides itself; Keep tracking swaps the lead; the menu undoes it */
      await openId("qp2l-year");
      const y0 = await card();
      { const t = await triple("qp2l-year"); L.check("V13", "over a year · column, tray and panel agree", t.tray === t.panel && (WORDS[t.panel] ?? []).includes(t.column) && t.column === "Consider closing", `column "${t.column}" · tray "${t.tray}" · panel "${t.panel}"`); }
      L.check("V13", "over a year · the tray's first button is the panel's primary", (await tray("qp2l-year")) === `${y0?.lead}|row-act`, `tray "${await tray("qp2l-year")}" · panel "${y0?.lead}"`);
      L.check("V13", "over a year · Close leads the footer, Record a response beside it", y0?.lead === "Close query" && !!y0.doors.includes("Record a response"), `lead "${y0?.lead}" · ${y0?.doors.join(", ")}`);
      await page.locator(LINK("remindLater")).click();
      await expect.poll(async () => (await card())?.links.join("|"), { timeout: 10_000 }).toBe("Keep tracking");
      const tasks = dump().tasks.filter((t) => t.queryId === "qp2l-year" && !t.done);
      L.check("V13", "Remind me later · adds one open \"Nudge {agent}\" to-do, and hides while it stands", tasks.length === 1 && /^Nudge /.test(tasks[0].text), JSON.stringify(tasks));
      await page.locator(LINK("keepTracking")).click();
      /* wait on the card, not on the footer: the footer's lead is the claim, and is read below by name */
      await expect.poll(async () => (await card())?.links.length, { timeout: 10_000 }).toBe(0);
      await page.waitForTimeout(400);
      const y1 = await card();
      L.check("V13", "Keep tracking · Record a response leads instead of Close", y1?.lead === "Record a response" && !!y1.doors.includes("Close query"), `lead "${y1?.lead}" · ${y1?.doors.join(", ")}`);
      { const t = await triple("qp2l-year"); L.check("V13", "Keep tracking · column, tray and panel agree, on different words than before", t.tray === t.panel && (WORDS[t.panel] ?? []).includes(t.column) && t.column === "Waiting", `column "${t.column}" · tray "${t.tray}" · panel "${t.panel}"`); }
      L.check("V13", "Keep tracking · the tray's first button follows the panel's primary", (await tray("qp2l-year")) === `${y1?.lead}|row-act` && y1?.lead !== y0?.lead, `tray "${await tray("qp2l-year")}" · panel "${y1?.lead}" (was "${y0?.lead}")`);
      L.check("V13", "Keep tracking · the closing sentence and its links are gone", y1?.links.length === 0 && !/Closing it keeps/.test(y1?.text ?? "") && (y1?.text ?? "").length > 0, `${JSON.stringify(y1?.links)} · "${y1?.text}"`);
      L.check("V13", "Keep tracking · sets the existing flag", dump().queries["qp2l-year"]?.keep === true, JSON.stringify(dump().queries["qp2l-year"]));
      /* for good: it holds across a reload */
      await openQC(page, SIZES[0], "none"); await openId("qp2l-year");
      const y2 = await card();
      L.check("V13", "Keep tracking · holds after a reload", y2?.links.length === 0 && y2.lead === "Record a response", `${JSON.stringify(y2?.links)} · lead "${y2?.lead}"`);
      await page.locator(`${PANEL} [data-qcv="open-more"]`).click();
      const again = page.getByRole("menuitem", { name: "Suggest closing again" }).or(page.getByText("Suggest closing again", { exact: true })).first();
      await expect(again, "the menu has no \"Suggest closing again\"").toBeVisible();
      await again.click();
      await expect.poll(async () => (await card())?.links.join("|"), { timeout: 10_000 }).toBe("Keep tracking");
      await page.waitForTimeout(400);
      const y3 = await card();
      L.check("V13", "Suggest closing again · clears the flag: the sentence, Keep tracking and Close's lead are back", /Closing it keeps/.test(y3?.text ?? "") && !!y3?.links.includes("Keep tracking") && y3.lead === "Close query" && dump().queries["qp2l-year"]?.keep === null, `lead "${y3?.lead}" · ${JSON.stringify(y3?.links)} · ${JSON.stringify(dump().queries["qp2l-year"])}`);
      { const t = await triple("qp2l-year"); L.check("V13", "Suggest closing again · column, tray and panel agree again", t.tray === t.panel && t.column === "Consider closing", `column "${t.column}" · tray "${t.tray}" · panel "${t.panel}"`); }
      L.check("V13", "Suggest closing again · the tray's first button is the panel's primary again", (await tray("qp2l-year")) === `${y3?.lead}|row-act`, `tray "${await tray("qp2l-year")}" · panel "${y3?.lead}"`);
      await page.locator(`${PANEL} [data-qcv="open-more"]`).click(); await page.waitForTimeout(300);
      const offered = await page.getByText("Suggest closing again", { exact: true }).count();
      L.check("V13", "Suggest closing again · is offered only while the flag is set", offered === 0, `${offered} in the menu`);
      await page.keyboard.press("Escape");
      } catch (e) { L.check("V13", "pressing the links ran to its end", false, String((e as Error).message).split("\n")[0].slice(0, 200)); }
    } finally {
      execSync("node tests/e2e/seedQp2Links.mjs --clean", { stdio: "inherit" });
    }
    L.done(66);
  });

  test("V11 · italics: an italic span in the stand card is set in a loaded italic face, not a slanted upright", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("V11");
    if (MUT === "V11") await page.route(/fonts\.googleapis\.com\/css2\?family=Source\+Serif\+4:ital/, (r) => r.abort());
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "none");
      await openRow(page, rowOf("agent")); await tab(page, "Tracking");
      const r = await page.evaluate(async () => {
        const el = document.querySelector<HTMLElement>('[data-qp="panel"] [data-qp="stand"] .qsc-bl span') ?? document.querySelector<HTMLElement>('[data-qp="panel"] .qcv-open-ag');
        if (!el) return null;
        const cs = getComputedStyle(el);
        /* ask for the face the element uses, then wait for whatever that starts */
        await document.fonts.load(`italic ${cs.fontWeight} ${cs.fontSize} "Source Serif 4"`, el.textContent ?? "a").catch(() => []);
        await document.fonts.ready;
        const faces = [...document.fonts].filter((f) => /Source Serif 4/.test(f.family));
        return {
          what: el.className || el.tagName, style: cs.fontStyle, family: cs.fontFamily.split(",")[0].replace(/"/g, ""), weight: cs.fontWeight,
          italicFaces: faces.filter((f) => f.style === "italic").length, italicLoaded: faces.filter((f) => f.style === "italic" && f.status === "loaded").length,
          uprightLoaded: faces.filter((f) => f.style === "normal" && f.status === "loaded").length, link: !!document.getElementById("sa-app-serif-italic"),
        };
      });
      L.check("V11", `${w} an italic span in the stand card`, !!r && r.style === "italic" && r.family === "Source Serif 4", r ? `${r.what}: ${r.family} ${r.style} ${r.weight}` : "no italic span found");
      L.check("V11", `${w} a Source Serif 4 italic face is LOADED (so the slant is drawn, not synthesised)`, !!r && r.italicLoaded > 0, r ? `${r.italicLoaded} of ${r.italicFaces} italic face(s) loaded · ${r.uprightLoaded} upright loaded · the app's link present ${r.link}` : "none");
    }
    L.done(4);
  });

  test("V6 V7 V8 · browsing is light; acting dims, wears the drawer, and is one surface", async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(10_000);
    const L = new Ledger("V6-V8");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "none", true);
      await openRow(page, rowOf("agent"));
      await mutate(page, "V6"); await mutate(page, "V7"); await mutate(page, "V8");
      await page.waitForTimeout(300);
      /* V6 — browsing */
      const s0 = await scrim(page);
      L.check("V6", `${w} browsing: nothing outside the panel is dimmed`, s0.opacity < 0.02 && s0.pe === "none", `scrim opacity ${s0.opacity} · pointer-events ${s0.pe}`);
      const id0 = (await surfaces(page)).id;
      const other = await page.evaluate((cur) => { const labs = document.querySelector<HTMLElement>(".qcw-list .lt-labels")!.getBoundingClientRect().bottom; const r = [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"]')].find((x) => { const b = x.getBoundingClientRect(); return b.top > labs + 6 && b.bottom < window.innerHeight - 20 && x.dataset.qid !== cur; }); return r?.dataset.qid ?? null; }, id0);
      expect(other, "another row on screen").not.toBeNull();
      await page.locator(`${ROW}[data-qid="${other}"] .qcw-agt`).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      L.check("V6", `${w} browsing: a row click swaps the query`, (await surfaces(page)).id === other, `${id0} → ${(await surfaces(page)).id} (clicked ${other})`);
      /* under V6's own mutation the page cannot be pressed at all: its two readings are the verdict */
      if (MUT === "V6") continue;

      /* V7, V8 — every footer action of a waiting query and of a your-move query, and the fork */
      const act = async (label: string, press: () => Promise<void>) => {
        await press();
        await page.waitForTimeout(250);
        const s = await scrim(page); const f = await surfaces(page);
        L.check("V7", `${w} ${label}: within 250ms a 0.45 scrim covers the page`, s.present && s.opacity > 0.98 && near(s.alpha, 0.45, 0.02) && s.covers && s.pe === "auto", `opacity ${s.opacity} · alpha ${s.alpha} · covers ${s.covers}`);
        L.check("V7", `${w} ${label}: the panel shows the drawer's head, with the quill`, f.head && f.quill, `head ${f.head} · quill ${f.quill}`);
        L.check("V8", `${w} ${label}: one dialog, and no drawer outside the panel`, f.dialogs === 1 && f.outside === 0, `${f.dialogs} dialog(s) · ${f.outside} drawer(s) outside`);
      };
      const back = async (label: string) => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(250);
        const s = await scrim(page);
        const stepped = await page.locator(`${PANEL} [data-qp-step]`).count();
        L.check("V7", `${w} ${label}: within 250ms of Escape the scrim is gone`, stepped === 0 && s.opacity < 0.02, `stepped ${stepped} · opacity ${s.opacity}`);
        await leaveStep(page);
      };
      for (const court of ["agent", "you"]) {
        await openRow(page, rowOf(court));
        const doors = await page.locator(`${PANEL} [data-door]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.door!));
        expect(doors.length, `${court}: footer actions`).toBeGreaterThan(0);
        for (const d of doors) { await act(`${court} · ${d}`, () => page.locator(`${PANEL} [data-door="${d}"]`).click()); await back(`${court} · ${d}`); }
      }
      /* the ··· fork, and "Something changed since" from it */
      await openRow(page, `${ROW}[data-qid="seed-query-10"]`);
      await act("the ··· fork", () => page.locator(`${PANEL} .qlg-fix`).first().click({ force: true }));
      await page.locator(`${PANEL} .cor-branch`, { hasText: /Something changed since/ }).first().click();
      await page.waitForTimeout(900);
      const f = await surfaces(page);
      L.check("V8", `${w} "Something changed since" runs the response journey in the panel`, f.step === "resp" && f.dialogs === 1 && f.outside === 0 && /^What did /.test(f.title), `step ${f.step} · ${f.dialogs} dialog(s) · ${f.outside} outside · "${f.title}"`);
      /* a drawer of its own, if the mutation made one, is put away before the next size */
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(350); }
      await leaveStep(page);
    }
    L.done(MUT === "V6" ? 4 : 40);
  });

  test("V9 · the top-right door: Record a response opens the panel at the picker, with the open query first", async ({ page }) => {
    test.setTimeout(300_000);
    page.setDefaultTimeout(8000);
    const L = new Ledger("V9");
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "V9");
      await openRow(page, `${ROW}[data-qid="seed-query-10"]`);
      const name = (await page.locator(`${PANEL} .qcv-open-nm`).innerText()).trim();
      await page.evaluate(() => { (document.querySelector('[data-qp="panel"]') as unknown as { __same: boolean }).__same = true; });
      await page.locator(".ws-pagebar .ws-capr").filter({ visible: true }).first().click(); await page.waitForTimeout(300);
      await page.locator(".ws-capi", { hasText: /^Record a response/ }).first().click({ timeout: 5000 });
      await page.waitForTimeout(900);
      const a = await surfaces(page);
      const pick = await page.evaluate(() => { const p = document.querySelector('[data-qp="panel"]'); const first = p?.querySelector<HTMLElement>("[data-qad-query]"); const h = p?.querySelector("[data-qad-qpick-open]"); return { first: first?.dataset.qadQuery ?? null, firstName: first?.querySelector("b")?.textContent ?? "", heading: h?.textContent ?? "", headingFirst: !!h && !!first && (h.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0, rows: p?.querySelectorAll("[data-qad-query]").length ?? 0 }; });
      L.check("V9", `${w} the picker is in the panel, titled "Who replied?"`, a.title === "Who replied?" && a.dialogs === 1 && a.outside === 0 && a.head, `"${a.title}" · ${a.dialogs} dialog(s) · ${a.outside} drawer(s) outside`);
      L.check("V9", `${w} the open query is listed first, under "The query you had open"`, pick.first === "seed-query-10" && pick.firstName === name && pick.heading === "The query you had open" && pick.headingFirst && pick.rows > 1, `first ${pick.first} "${pick.firstName}" · heading "${pick.heading}" · ${pick.rows} rows`);
      const s = await scrim(page);
      L.check("V9", `${w} the page is dimmed`, s.opacity > 0.98, `${s.opacity}`);
      /* choose ANOTHER query */
      const other = page.locator(`${PANEL} [data-qad-query]:not([data-qad-query="seed-query-10"])`).first();
      const oid = await other.getAttribute("data-qad-query").catch(() => null);
      const oname = oid ? ((await other.locator("b").innerText().catch(() => "")).trim().split(/\s+/)[0]) : "";
      if (oid) { await other.click().catch(() => {}); await page.waitForTimeout(1000); }
      const b = await surfaces(page);
      const same = await page.evaluate(() => (document.querySelector('[data-qp="panel"]') as unknown as { __same?: boolean } | null)?.__same === true);
      L.check("V9", `${w} choosing another query continues to "What did {first} say?" in the same panel`, !!oid && b.title === `What did ${oname} say?` && b.step === "resp" && same && b.dialogs === 1 && b.outside === 0, `chose ${oid} · "${b.title}" · same panel ${same} · ${b.dialogs} dialog(s)`);
      L.check("V9", `${w} the panel is now that query's`, b.id === oid, `${b.id}`);
      /* back to the query — and, under the mutation, the standalone drawer put away first */
      if (MUT === "V9") { for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(350); } }
      await leaveStep(page);
      if (oid && MUT !== "V9") {
        const after = await page.evaluate(() => ({ id: document.querySelector<HTMLElement>('[data-qp="panel"]')?.dataset.qpId ?? "", sel: [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="row"][aria-selected="true"]')].map((r) => r.dataset.qid) }));
        L.check("V9", `${w} back at the query: its ledger, and its row selected`, after.id === oid && after.sel.length === 1 && after.sel[0] === oid, `${after.id} · selected ${after.sel.join()}`);
      }
    }
    L.done(MUT === "V9" ? 8 : 12);
  });

  test("V10 · tabs kept: the Agent tab's facts as v1 showed them, and the Notes tab's pin, edit, delete and composer", async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(12_000);
    const L = new Ledger("V10");
    expect(existsSync(FIX), `${FIX} is missing: QP2_CAPTURE=1 against a query-panel-v1 build writes it`).toBe(true);
    const v1 = JSON.parse(readFileSync(FIX, "utf8")) as Record<string, NonNullable<Awaited<ReturnType<typeof agentFacts>>>>;
    for (const vp of SIZES) {
      const w = `${vp.width}`;
      await openQC(page, vp, "V10");
      for (const id of AGENT_IDS) {
        await openRow(page, `${ROW}[data-qid="${id}"]`); await tab(page, "Agent");
        const now = await agentFacts(page);
        for (const k of ["place", "door", "links", "figures", "wishlist", "asks", "history", "footer"] as const) {
          /* strict, months included: the correction fixture that once re-dated these rows is held to a fixed
             date now (qcMove's SEED_NOW) */
          const a = JSON.stringify(v1[id]?.[k]); const b = JSON.stringify(now?.[k]);
          L.check("V10", `${w} ${id} · ${k}`, a === b, a === b ? `${b.slice(0, 80)}` : `v1 ${a} → ${b}`);
        }
      }
    }
    /* the Notes tab, on a query of its own */
    if (MUT !== "V10") {
      const QID = "qp1s-q";
      try {
        execSync("node tests/e2e/seedQp1Save.mjs", { stdio: "inherit" });
        await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* */ } });
        await openQC(page, SIZES[0], "none");
        await openRow(page, `${ROW}[data-qid="${QID}"]`); await tab(page, "Notes");
        const notes = () => page.locator(`${PANEL} .qn-note`);
        const foot = await page.evaluate(() => { const p = document.querySelector('[data-qp="panel"]')!; const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0; const ta = p.querySelector<HTMLElement>(".qn-ta"); const sv = p.querySelector<HTMLElement>(".qn-send"); return { action: vis(p.querySelector('[data-qcv="open-doors"]')) || vis(p.querySelector('[data-qcv="open-foot"]')), ta: ta ? ta.getBoundingClientRect().height : 0, save: sv ? getComputedStyle(sv).backgroundColor : "", row: !!ta && !!sv && Math.abs(ta.getBoundingClientRect().bottom - sv.getBoundingClientRect().bottom) < 2, bottom: sv ? window.innerHeight - sv.getBoundingClientRect().bottom : -1 }; });
        L.check("V10", "notes · the composer replaces the action footer", !foot.action && near(foot.ta, 48, 1) && foot.save === "rgb(45, 58, 80)" && foot.row, `action footer shown ${foot.action} · field ${foot.ta}px · Save ${foot.save} · one row ${foot.row}`);
        const n0 = await notes().count();
        await page.locator(`${PANEL} .qn-ta`).fill("A note from the QP2 lock.");
        await page.locator(`${PANEL} .qn-send`).click();
        await expect(notes()).toHaveCount(n0 + 1, { timeout: 10_000 });
        L.check("V10", "notes · the composer saves a note", (await notes().last().locator(".qn-body").innerText()).trim() === "A note from the QP2 lock.", await notes().last().locator(".qn-body").innerText());
        const card = await notes().last().evaluate((e) => { const cs = getComputedStyle(e); const when = e.querySelector<HTMLElement>(".qn-when"); return { bg: cs.backgroundColor, when: when ? getComputedStyle(when).fontFamily.split(",")[0] : "", whenText: when?.textContent ?? "" }; });
        L.check("V10", "notes · a note is a white card with its date in the typewriter", card.bg === "rgb(255, 255, 255)" && /Special Elite/.test(card.when) && /\d/.test(card.whenText), `${card.bg} · ${card.when} "${card.whenText}"`);
        await notes().last().hover();
        await notes().last().locator(".qn-acts button", { hasText: /^Edit$/ }).click();
        await page.locator(`${PANEL} .qn-editta`).fill("An edited note from the QP2 lock.");
        await page.locator(`${PANEL} .qn-editgo`).click();
        await expect(notes().last().locator(".qn-body")).toHaveText("An edited note from the QP2 lock.", { timeout: 10_000 });
        L.check("V10", "notes · Edit changes it", true, "edited");
        await notes().last().hover();
        await notes().last().locator(".qn-acts button", { hasText: /^Pin$/ }).click();
        await expect(page.locator(`${PANEL} .qn-pinned`)).toBeVisible({ timeout: 10_000 });
        const pin = await page.locator(`${PANEL} .qn-pinned`).evaluate((e) => getComputedStyle(e).backgroundColor);
        L.check("V10", "notes · Pin shows it in the gold strip", pin === "rgb(246, 236, 214)", pin);
        await page.locator(`${PANEL} .qn-unpin`).click();
        await expect(page.locator(`${PANEL} .qn-pinned`)).toHaveCount(0, { timeout: 10_000 });
        await notes().last().hover();
        await notes().last().locator(".qn-acts button", { hasText: /^Delete$/ }).click();
        await page.locator(".sa-confirm-ok").click();
        await expect(notes()).toHaveCount(n0, { timeout: 10_000 });
        L.check("V10", "notes · Delete removes it", (await notes().count()) === n0, `${await notes().count()} note(s), as before`);
      } finally {
        execSync("node tests/e2e/seedQp1Save.mjs --clean", { stdio: "inherit" });
      }
    }
    L.done(MUT === "V10" ? 40 : 54);
  });
});

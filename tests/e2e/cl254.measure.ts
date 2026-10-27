/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.4 (design-refs/contact-list-v25-4/) — CL254 F1–F6 on the rendered page at 1512 × 900 and 1280 × 800
 * with the shell. L1 is the existing suites, run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO FIRST. F3's two sparse branches come from `seedCl254Sparse.mjs`
 *    (written before, removed after: an agent with a reply time and no genres, and one with neither); F2's stages are
 *    the harness account's own (Queried, Partial requested and Passed are all present).
 * ⚠️ INDEPENDENT FIGURES: F2's stage and F3's genres / reply time are held to Firestore (cl254Data.mjs, read-only); F6's
 *    n to Housekeeping's OWN rendering (the drawer's By agent view, its gap chips per agent), never to the row.
 * ⚠️ RED FIRST: `CL254_BASE=1` against v25.3 (the base build); `CL254_MUTATE=<lock>` applies the lock's break in the page.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { BASE, Ledger, SIZES, mutate, mutateJs, openCl24 } from "./cl254Lib";

const T = { timeout: 8000 };
type Data = {
  agents: Record<string, { stars: number | null; genres: number; mswl: string; email: string; weeks: number | null }>;
  queries: { id: string; agentId: string; status: string }[];
};
const data = (): Data => JSON.parse(execFileSync("node", ["tests/e2e/cl254Data.mjs"], { encoding: "utf8" }));
const seed = (clean = false) => execFileSync("node", ["tests/e2e/seedCl254Sparse.mjs", ...(clean ? ["--clean"] : [])], { encoding: "utf8" });
/** the app's stage names, restated here (never imported) so the lock does not share the page's table */
const STAGE: Record<string, string> = {
  "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", "Full Requested": "Full requested", "Full Sent": "Full sent",
  "Revise & Resubmit": "Revise & resubmit", Offer: "Offer", Rejected: "Passed", Withdrawn: "Withdrawn", "No Response": "Closed with no reply",
  Resubmitted: "Resubmitted", Signed: "Signed",
};
const want = (status: string) => (status === "Queried" ? "Queried" : `Queried · ${STAGE[status] ?? "?"}`);

async function toList(page: Page) {
  await page.evaluate(() => {
    const t = document.querySelector("[data-cl25='title']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10);
  });
  await page.waitForTimeout(300);
}
/** Housekeeping's own figures: the drawer's By agent view — each agent's gap count and first gap */
async function hkFigures(page: Page, vp: { width: number; height: number }) {
  await openCl24(page, vp);
  await page.locator("[data-cl251='cell'][data-k='health']").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  await page.locator("[data-hkv='view'][data-v='agent']").first().click(T).catch(() => {});
  await page.waitForTimeout(800);
  const hk = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-hk8='agent-row']")].map((r) => [r.dataset.agent ?? "", {
    n: r.querySelectorAll("[data-hk8='gap-chip']").length,
    first: (r.querySelector<HTMLElement>("[data-hk8='gap-chip']")?.dataset.key ?? "").split(":").pop() ?? "",
  }])));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  return hk as Record<string, { n: number; first: string }>;
}
const FIELD: Record<string, string> = { reply: "[data-ae='weeks']", genres: "[data-ae='genres']", wishlist: "[data-ae='wishlist']", materials: "[data-ae='materials']", reopen: "[data-f='reopens']" };
/** is focus inside the edit mode's field for this gap? */
const focusIn = (page: Page, sel: string) => page.evaluate((s) => {
  const em = document.querySelector("[data-cl24='panel'] [data-cl252='edit-mode']");
  const a = document.activeElement as HTMLElement | null;
  const f = em?.querySelector(s);
  return { edit: !!em, inField: !!(a && f && (f === a || f.contains(a))), active: a ? `${a.tagName}.${a.className}`.slice(0, 60) : "none" };
}, sel);

/* ═════════ F1 · column order ═════════ */
test("CL254-F1 · headings read Agent, What they want, Replies in, Your rating, Your query (no rating at 1280); each still sorts", async ({ page }) => {
  test.setTimeout(300_000);
  const F1 = new Ledger("F1");
  const WANT: Record<number, string[]> = {
    1512: ["Agent", "What they want", "Replies in", "Your rating", "Your query"],
    1280: ["Agent", "What they want", "Replies in", "Your query"],
  };
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutateJs(page, "F1", () => {
      const th = document.querySelector("[data-cl24='heads']");
      const r = th?.querySelector("[data-key='rating']"), q = th?.querySelector("[data-key='urgency']");
      if (th && r && q) th.insertBefore(q, r);
    });
    await toList(page);
    const heads = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='heads'] > [role='columnheader']")]
      .filter((h) => h.offsetWidth > 0).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map((h) => ({ text: (h.querySelector("button > span")?.textContent ?? h.textContent ?? "").trim(), key: h.dataset.key ?? "" })));
    F1.check(`${at} population`, heads.length >= 4, `${heads.length} headings`);
    F1.check(`${at} order`, JSON.stringify(heads.map((h) => h.text)) === JSON.stringify(WANT[vp.width]), heads.map((h) => h.text).join(" · "));
    /* each still sorts: a click makes it the sorted column */
    for (const h of heads) {
      await page.locator(`[data-cl24='heads'] [data-cl251='head'][data-key='${h.key}']`).first().click(T).catch(() => {});
      await page.waitForTimeout(250);
      const s = await page.evaluate((k) => document.querySelector(`[data-cl24='heads'] [role='columnheader'][data-key='${k}']`)?.getAttribute("aria-sort") ?? "", h.key);
      F1.check(`${at} ${h.text} sorts`, s === "ascending" || s === "descending", s);
    }
  }
  F1.done(12);
});

/* ═════════ F2 · Your query, one line ═════════ */
test("CL254-F2 · every queried row reads Queried or Queried · {stage} with the stage's glyph; no pill, day or track; Not queried", async ({ page }) => {
  test.setTimeout(300_000);
  const F2 = new Ledger("F2");
  const D = data();
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "F2", ".cl254-q { display: none !important; } .cl254-qs::before { content: 'QUERIED'; display: inline-block; padding: 2px 8px; border-radius: 99px; background: #e8edf3; font: 600 10px var(--sp-mono); }");
    await mutateJs(page, "F2", () => { for (const c of document.querySelectorAll<HTMLElement>("[data-cl24='row'] [data-cl24='query']")) { const p = document.createElement("span"); p.className = "cl252-qpill"; p.dataset.cl252 = "qpill"; p.textContent = "QUERIED"; c.prepend(p); } });
    await toList(page);
    const R = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => {
      const c = r.querySelector<HTMLElement>("[data-cl24='query']")!;
      const line = c.querySelector<HTMLElement>("[data-cl254='query-line']");
      const glyph = line?.querySelector<HTMLElement>("[role='img'][aria-label]");
      const rng = document.createRange();
      const t = line?.querySelector<HTMLElement>(".cl254-qt") ?? line?.querySelector("em") ?? null;
      if (t) rng.selectNodeContents(t);
      const tops = t ? [...new Set([...rng.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)))] : [];
      return {
        id: r.dataset.id ?? "", k: r.dataset.k ?? "", status: line?.dataset.status ?? "",
        text: ((t?.textContent ?? "") as string).replace(/\s+/g, " ").trim(), glyph: glyph?.getAttribute("aria-label") ?? "",
        lines: tops.length, closedTag: !!c.querySelector("[data-cl251='closed-tag']"),
        old: c.querySelectorAll("[data-cl252='qpill'], [data-cl252='day'], [data-cl252='track'], [data-cl252='next'], [data-cl252='sent']").length,
      };
    }));
    const q = R.filter((r) => r.k !== "none"), nq = R.filter((r) => r.k === "none" && !r.closedTag);
    const seen = new Set(q.map((r) => r.status));
    F2.check(`${at} population`, q.length >= 5 && nq.length >= 3 && ["Queried", "Partial Requested", "Rejected"].every((s) => seen.has(s)), `${q.length} queried (${[...seen].join(", ")}), ${nq.length} not queried`);
    F2.check(`${at} no pill, day count or track in any row`, R.every((r) => r.old === 0), `${R.filter((r) => r.old).length} rows with one`);
    for (const r of q) {
      const theirs = D.queries.filter((x) => x.agentId === r.id).map((x) => x.status);
      F2.check(`${at} ${r.id} stage is theirs`, theirs.includes(r.status), `${r.status} in [${theirs.join(", ")}]`);
      F2.check(`${at} ${r.id} words`, r.text === want(r.status), `"${r.text}" vs "${want(r.status)}"`);
      F2.check(`${at} ${r.id} glyph matches`, !!r.glyph && r.glyph.toLowerCase().replace(/[^a-z]/g, "") === (r.status === "Rejected" ? "rejected" : r.status.toLowerCase().replace(/[^a-z]/g, "")), `glyph "${r.glyph}" for ${r.status}`);
      F2.check(`${at} ${r.id} one line`, r.lines === 1, `${r.lines} line boxes`);
    }
    for (const r of nq) F2.check(`${at} ${r.id} Not queried`, r.text === "Not queried" && r.lines === 1, `"${r.text}"`);
  }
  F2.done(60);
});

/* ═════════ F3 · the sparse-profile link ═════════ */
test("CL254-F3 · no genres: one always-shown link, spanning Replies in when there is no reply time; it opens the edit mode at the first gap", async ({ page }) => {
  test.setTimeout(420_000);
  const F3 = new Ledger("F3");
  seed();
  try {
    const D = data();
    const vp = SIZES[0];
    const hk = await hkFigures(page, vp);
    for (const v of SIZES) {
      const at = `${v.width}`;
      await openCl24(page, v);
      await mutate(page, "F3", ".cl254-fillp { visibility: hidden !important; } .cl24-tr:hover .cl254-fillp { visibility: visible !important; }");
      await toList(page);
      await page.mouse.move(3, 3);
      const R = await page.evaluate(() => {
        const heads = Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-cl24='heads'] > [role='columnheader']")].filter((h) => h.offsetWidth)
          .map((h) => { const b = h.getBoundingClientRect(); return [h.dataset.key ?? "", { l: b.left, r: b.right }]; }));
        return { heads, rows: [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => {
          const links = [...r.querySelectorAll<HTMLElement>("[data-cl254='profile-link']")];
          const shown = links.filter((l) => { const b = l.getBoundingClientRect(); return b.width > 0 && getComputedStyle(l).visibility === "visible" && Number(getComputedStyle(l).opacity) > 0.9; });
          const cell = links[0]?.closest<HTMLElement>("[role='cell']");
          const cb = cell?.getBoundingClientRect();
          return { id: r.dataset.id ?? "", n: links.length, shown: shown.length, words: links[0]?.textContent?.trim() ?? "", cell: cb ? { l: cb.left, r: cb.right } : null };
        }) };
      });
      const sparse = R.rows.filter((r) => (D.agents[r.id]?.genres ?? 1) === 0);
      const withW = sparse.filter((r) => D.agents[r.id].weeks), noW = sparse.filter((r) => !D.agents[r.id].weeks);
      F3.check(`${at} population`, withW.length >= 1 && noW.length >= 2, `${withW.length} with a reply time, ${noW.length} without`);
      for (const r of R.rows) {
        const g = D.agents[r.id]?.genres ?? 1;
        if (g > 0) { F3.check(`${at} ${r.id} has genres, no link`, r.n === 0, `${r.n}`); continue; }
        F3.check(`${at} ${r.id} one link, shown at rest`, r.n === 1 && r.shown === 1, `${r.n} link(s), ${r.shown} shown`);
        F3.check(`${at} ${r.id} words`, /^Fill in (\S+’s|this) profile →$/.test(r.words), r.words);
        const fit = R.heads.fit, rep = R.heads.reply;
        if (r.cell && fit && rep) {
          if (!D.agents[r.id].weeks) F3.check(`${at} ${r.id} spans What they want and Replies in`, Math.abs(r.cell.l - fit.l) <= 2 && r.cell.r >= rep.r - 2, `cell ${r.cell.l.toFixed(0)}–${r.cell.r.toFixed(0)} vs ${fit.l.toFixed(0)}–${rep.r.toFixed(0)}`);
          else F3.check(`${at} ${r.id} stays in What they want`, Math.abs(r.cell.l - fit.l) <= 2 && r.cell.r < rep.l, `cell ${r.cell.l.toFixed(0)}–${r.cell.r.toFixed(0)}, replies from ${rep.l.toFixed(0)}`);
        }
      }
    }
    /* the click: the panel's edit mode, focus in the first missing field (Housekeeping's order) */
    const ids = ["cl254fx-rep", "cl254fx-none"].filter((i) => hk[i]);
    F3.check("click population", ids.length === 2, ids.map((i) => `${i}:${hk[i]?.first}`).join(" "));
    for (const id of ids) {
      await openCl24(page, vp);
      await toList(page);
      const row = page.locator(`[data-cl24='row'][data-id='${id}']`).first();
      await row.scrollIntoViewIfNeeded();
      await row.locator("[data-cl254='profile-link']").click(T).catch(() => {});
      await page.waitForTimeout(1000);
      const m = await focusIn(page, FIELD[hk[id].first] ?? "[data-none]");
      F3.check(`${id} opens edit mode at ${hk[id].first}`, m.edit && m.inField, JSON.stringify(m));
    }
  } finally { seed(true); }
  F3.done(20);
});

/* ═════════ F4 · no row actions ═════════ */
test("CL254-F4 · hovering a row shows no gaps button and no copy / website icons; only not-queried rows offer Log a query", async ({ page }) => {
  test.setTimeout(300_000);
  const F4 = new Ledger("F4");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutateJs(page, "F4", () => { for (const r of document.querySelectorAll<HTMLElement>("[data-cl24='row']")) { const b = document.createElement("button"); b.dataset.cl253 = "fill"; b.textContent = "Fill in 2 gaps →"; b.className = "cl253-fill"; r.appendChild(b); } });
    await toList(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight)
      .map((r) => ({ id: r.dataset.id ?? "", nq: r.dataset.k === "none" && !r.querySelector("[data-cl251='closed-tag']") })));
    const pick = [...ids.filter((r) => r.nq).slice(0, 4), ...ids.filter((r) => !r.nq).slice(0, 6)];
    F4.check(`${at} population`, pick.filter((r) => r.nq).length >= 2 && pick.filter((r) => !r.nq).length >= 4, `${pick.length} rows`);
    for (const r of pick) {
      const row = page.locator(`[data-cl24='row'][data-id='${r.id}']`).first();
      await row.scrollIntoViewIfNeeded();
      await row.hover();
      await page.waitForTimeout(200);
      const v = await page.evaluate((i) => {
        const el = document.querySelector<HTMLElement>(`[data-cl24='row'][data-id='${i}']`)!;
        const vis = (e: Element) => { const b = (e as HTMLElement).getBoundingClientRect(); let n: HTMLElement | null = e as HTMLElement; while (n) { const cs = getComputedStyle(n); if (cs.visibility === "hidden" || Number(cs.opacity) < 0.1 || cs.display === "none") return false; n = n.parentElement; } return b.width > 0; };
        const acts = [...el.querySelectorAll("button, a")].filter(vis).map((b) => (b.textContent ?? "").trim() || b.getAttribute("aria-label") || "");
        return { acts, gaps: [...el.querySelectorAll("[data-cl253='fill']")].filter(vis).length, icons: [...el.querySelectorAll("[data-cl24='copy-email'], [data-cl24='open-site']")].filter(vis).length,
          log: [...el.querySelectorAll("[data-cl24='log']")].filter(vis).length };
      }, r.id);
      F4.check(`${at} ${r.id} no gaps button, no icons`, v.gaps === 0 && v.icons === 0, `${v.gaps} gaps, ${v.icons} icons`);
      const others = v.acts.filter((t) => !/Log a query/.test(t) && !/profile →$/.test(t) && !/^\d of 5$/.test(t));
      F4.check(`${at} ${r.id} ${r.nq ? "Log a query only" : "no actions"}`, (r.nq ? v.log === 1 : v.log === 0) && others.length === 0, `log ${v.log}; others [${others.join(" | ")}]`);
    }
    await page.mouse.move(3, 3);
  }
  F4.done(30);
});

/* ═════════ F5 · fit ═════════ */
test("CL254-F5 · no Your query text is clipped or wrapped (1280 and 1512)", async ({ page }) => {
  test.setTimeout(240_000);
  const F5 = new Ledger("F5");
  for (const vp of [...SIZES].reverse()) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "F5", ".cl24-sheet { --cl24-cols: minmax(0, 1.9fr) minmax(0, 1.9fr) minmax(0, 0.9fr) minmax(0, 0.9fr) !important; }");
    await toList(page);
    const R = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row'] [data-cl24='query']")].filter((c) => c.offsetHeight).map((c) => {
      const t = c.querySelector<HTMLElement>(".cl254-qt, .cl254-q--nq > em, [data-cl251='closed-tag'], .cl252-ql1, .cl252-nq em");
      if (!t) return { text: "", clip: true, lines: 0 };
      const rng = document.createRange(); rng.selectNodeContents(t);
      const lines = new Set([...rng.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size;
      return { text: (t.textContent ?? "").trim(), clip: t.scrollWidth > t.clientWidth + 0.5, lines };
    }));
    F5.check(`${at} population`, R.length >= 8 && R.some((r) => /Partial requested|Closed with no reply|Revise/.test(r.text)), `${R.length} cells`);
    const bad = R.filter((r) => r.clip || r.lines !== 1);
    F5.check(`${at} none clipped or wrapped`, bad.length === 0, bad.slice(0, 3).map((b) => `"${b.text}" clip ${b.clip} lines ${b.lines}`).join("; ") || "none");
  }
  F5.done(4);
});

/* ═════════ F6 · where gaps live ═════════ */
test("CL254-F6 · the card's Profile tab says {n} details missing (Housekeeping's n, absent at 0) and opens the edit mode; Missing details filters exactly those", async ({ page }) => {
  test.setTimeout(420_000);
  const F6 = new Ledger("F6");
  const vp = SIZES[0];
  const hk = await hkFigures(page, vp);
  const D = data();
  const gapIds = Object.keys(hk).filter((k) => hk[k].n > 0 && D.agents[k]);
  const zero = Object.keys(D.agents).filter((k) => !hk[k] && !k.startsWith("cl25"));
  F6.check("population", gapIds.length >= 3 && zero.length >= 1, `${gapIds.length} with gaps, ${zero.length} without`);
  /* the card's line */
  for (const id of [...gapIds.slice(0, 3), ...zero.slice(0, 2)]) {
    await openCl24(page, vp);
    await toList(page);
    const row = page.locator(`[data-cl24='row'][data-id='${id}']`).first();
    await row.scrollIntoViewIfNeeded();
    await row.locator("[data-cl252='name']").click(T).catch(() => {});
    await page.waitForTimeout(900);
    await mutateJs(page, "F6", () => { const l = document.querySelector<HTMLElement>("[data-cl254='gap-line']"); if (l && l.firstChild) l.firstChild.textContent = `${Number(l.dataset.n) + 1} `; });
    const line = await page.evaluate(() => {
      const l = [...document.querySelectorAll<HTMLElement>("[data-cl24='panel'] [data-cl254='gap-line']")].find((e) => e.offsetHeight);
      return l ? (l.textContent ?? "").replace(/\s+/g, " ").trim() : null;
    });
    const n = hk[id]?.n ?? 0;
    if (n) {
      F6.check(`${id} line = Housekeeping's ${n}`, line === `${n} ${n === 1 ? "detail" : "details"} missing · Fill them in →`, String(line));
    } else F6.check(`${id} no gaps, no line`, line === null, String(line));
    if (n && id === gapIds[0]) {
      await page.locator("[data-cl24='panel'] [data-cl254='gap-fill']").first().click(T).catch(() => {});
      await page.waitForTimeout(900);
      const m = await focusIn(page, FIELD[hk[id].first] ?? "[data-none]");
      F6.check(`${id} the link opens edit mode at ${hk[id].first}`, m.edit && m.inField, JSON.stringify(m));
    }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  /* the Filters panel's Missing details */
  await openCl24(page, vp);
  await toList(page);
  await page.locator("[data-cl24='table']").first().waitFor();
  await page.locator(".cl24-bar button:has-text('Filters'), [data-cl24='filters']").first().click(T).catch(() => {});
  await page.waitForTimeout(500);
  const tog = page.locator("[data-cl254='missing-filter']").first();
  const has = await tog.count();
  F6.check("Filters has Missing details", has === 1, `${has}`);
  if (has) {
    const shown = Number((await tog.locator("em").textContent()) ?? -1);
    await tog.click(T);
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => r.dataset.id ?? ""));
    const want2 = Object.keys(hk).filter((k) => hk[k].n > 0).sort();
    F6.check("filtered rows = Housekeeping's agents with n > 0", JSON.stringify([...ids].sort()) === JSON.stringify(want2), `${ids.length} rows vs ${want2.length}; extra [${ids.filter((i) => !want2.includes(i)).slice(0, 3)}] missing [${want2.filter((i) => !ids.includes(i)).slice(0, 3)}]`);
    F6.check("the toggle's count = Housekeeping's", shown === want2.length, `${shown} vs ${want2.length}`);
  }
  F6.done(8);
});

if (BASE) console.log("[CL254] measuring the BASE build (v25.3): every lock should be red");

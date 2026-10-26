/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — the DB71 locks, measured on the rendered page (ref design-refs/dashboard-v71/).
 *
 * H1 the desk-ink header · L1 the right column is two cards · L2 the bottoms line up, 14px above
 * the tab · L3 the tab is always on screen · L4 no card's shadow is clipped · C1 the task card's
 * kinds · C2 the reply-window bar · C3 the future step is dashed · C4 the cycle · C5 "View task →"
 * lands and writes nothing · F1 the founding card's copy · F2 ask → noted → sent · F3 the founding
 * card fits · G1 one screen.
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB71_MUTATE=<name>` applies a lock's named break in the page; the code mutations (C4, C5, F2)
 * are made in the worktree, rebuilt and recorded in reports/dashboard-v71/mutation-proofs.jsonl.
 *
 * ⚠️ `sendWeeklyPulse` IS NOT DEPLOYED ON DEV (checked 26 Oct), so F2 answers it itself
 * (`context.route`), once with a yes and once with a refusal. `sendBetaFeedback` IS deployed, and a
 * real call emails Nick — F2 answers that one itself too, always. Nothing here sends feedback.
 * ⚠️ NO REGEX INSIDE `page.evaluate`: strings come back to Node and are matched here.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { openRoute } from "./measure";
import { readPng } from "./pngPixels";
import { harnessDb, snapshotQuery, stable } from "./harnessDocs";
import { isoWeekKey } from "../../src/lib/weeklyPulse";

const DIR = "reports/dashboard-v71";
const SIZES = [
  { width: 1920, height: 1080 }, { width: 1512, height: 900 }, { width: 1440, height: 900 }, { width: 1366, height: 768 },
  { width: 1280, height: 800 }, { width: 1288, height: 660 }, { width: 1366, height: 650 }, { width: 1280, height: 650 },
  { width: 1100, height: 800 },
] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const V1512 = { width: 1512, height: 900 };
const MUT = process.env.DB71_MUTATE ?? "";
const PRE = "db60-pre";
const DAY = 86_400_000;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
const CSS_MUTATIONS: Record<string, string> = {
  "H1-white": `.d71-head { background: #fff !important; }`,
  "L2-fw-172": `.d71-fwslot > .d71-fw { flex: none !important; height: 172px !important; }`,
  "L3-tab-off": `.d59-ftab { right: -200px !important; }`,
  "L4-clip": `.d60-hoops, .d71-fwslot { overflow: hidden !important; }`,
  "C2-solid": `.d71-ok { width: 100% !important; } .d71-ov { display: none !important; }`,
  "C2-label-room": `.d71-task[data-kind="close"] .d71-win { margin-top: 0 !important; }`,
  "C3-solid": `.d71-step.is-todo { border-style: solid !important; }`,
  "F3-art-140": `.d71-fwart img { max-height: none !important; height: 140px !important; }`,
  "G1-hoops-320": `.d58[data-mode="q"] .d60-hoops { min-height: 320px !important; }`,
};

async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (CSS_MUTATIONS[MUT]) await page.addStyleTag({ content: CSS_MUTATIONS[MUT] });
  if (MUT === "L1-title") {
    await page.evaluate(() => document.querySelector('[data-d58="right"]')?.insertAdjacentHTML("afterbegin", '<h2 class="d58-listtitle" data-d58="list-title">What\'s on the list today?</h2>'));
  }
  if (MUT === "F1-copy") {
    await page.evaluate(() => { const e = document.querySelector('[data-d71="fw-line"]'); if (e) e.textContent = "Your feedback is gratefully received!"; });
  }
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
}

const shot = async (page: Page, name: string) => {
  if (!process.env.DB71_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  const vp = page.viewportSize()!;
  await page.screenshot({ path: `${DIR}/shots/${name}-${vp.width}x${vp.height}.png`, animations: "disabled" });
};

/* ── H1 — the header ─────────────────────────────────────────────────────────────────────────── */

test("DB71 H1 — the header is the desk-ink panel", async ({ page }) => {
  const L = new Ledger("header");
  for (const vp of [V1512, { width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1100, height: 800 }]) {
    await openDash(page, vp);
    const h = await page.evaluate(() => {
      const head = document.querySelector<HTMLElement>('[data-d58="header"]');
      const root = document.querySelector<HTMLElement>(".d58");
      if (!head || !root) return null;
      const probe = document.createElement("div");
      probe.style.background = "var(--ink-shell)";
      root.appendChild(probe);
      const token = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const btns = [...head.querySelectorAll<HTMLElement>("[data-d58^='btn-']")];
      return {
        bg: getComputedStyle(head).backgroundColor, token,
        title: getComputedStyle(head.querySelector('[data-d58="title"]')!).color,
        eyebrow: getComputedStyle(head.querySelector('[data-d58="eyebrow"]')!).color,
        btns: btns.map((b) => {
          const lab = b.querySelector<HTMLElement>(".d71-hbl");
          return {
            id: b.dataset.d58, bg: getComputedStyle(b).backgroundColor, icon: b.querySelector("svg") ? getComputedStyle(b.querySelector("svg")!).stroke : null,
            w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, aria: b.getAttribute("aria-label"),
            label: lab ? getComputedStyle(lab).display !== "none" : false, iconFirst: b.firstElementChild?.tagName.toLowerCase() === "svg",
          };
        }),
      };
    });
    const w = tag(vp);
    L.check("H1", `${w} population`, !!h && h.btns.length === 3, JSON.stringify(h?.btns.length));
    if (!h) continue;
    L.check("H1", `${w} the panel's background is --ink-shell`, h.bg === h.token && h.token !== "rgba(0, 0, 0, 0)", `${h.bg} vs token ${h.token}`);
    L.check("H1", `${w} title cream`, h.title === "rgb(246, 241, 232)", h.title);
    L.check("H1", `${w} eyebrow terracotta`, h.eyebrow === "rgb(217, 150, 122)", h.eyebrow);
    const [log, ...ghosts] = h.btns;
    L.check("H1", `${w} first is Log a query, cream, rust icon, icon first`, log.id === "btn-log" && log.bg === "rgb(244, 239, 230)" && log.icon === "rgb(162, 69, 42)" && log.iconFirst && log.label, JSON.stringify(log));
    if (vp.width < 1200) {
      L.check("H1", `${w} the two secondaries are icon-only with aria-labels`, ghosts.every((g) => !g.label && Math.abs(g.w - 40) <= 0.5 && !!g.aria), JSON.stringify(ghosts));
    } else {
      L.check("H1", `${w} the secondaries show their words`, ghosts.every((g) => g.label && g.iconFirst && !!g.aria), JSON.stringify(ghosts));
      L.check("H1", `${w} button height ${vp.width <= 1400 ? 40 : 44}`, h.btns.every((b) => Math.abs(b.h - (vp.width <= 1400 ? 40 : 44)) <= 0.5), h.btns.map((b) => b.h).join(","));
    }
  }
  L.done(24);
});

/* ── L1 — the right column holds two cards ───────────────────────────────────────────────────── */

test("DB71 L1 — the right column is the task card then the founding card", async ({ page }) => {
  const L = new Ledger("layout");
  await openDash(page, V1512);
  const r = await page.evaluate(() => {
    const right = document.querySelector<HTMLElement>('[data-d58="right"]');
    const box = (s: string) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return {
      kids: right ? [...right.children].map((c) => (c as HTMLElement).dataset.d71 ?? (c as HTMLElement).dataset.d58 ?? c.tagName) : [],
      task: !!right?.querySelector('[data-d71="task-slot"] > [data-d71="task"]'),
      fw: !!right?.querySelector('[data-d71="fw-slot"] > [data-d71="fw"]'),
      text: document.body.innerText,
      retired: document.querySelectorAll('[data-d58="list-title"], [data-d58="list-all"], [data-d58="right"] [data-d58="rule"], [data-d58="row"], [data-d58="then"], [data-d58="group"]').length,
      chart: box('[data-d58="active"]'), closed: box('[data-d60="closed-hoop"]'), agents: box('[data-d60="agents-hoop"]'),
    };
  });
  L.check("L1", "population: the right column was found", r.kids.length > 0, r.kids.join(">"));
  L.check("L1", "exactly the task card, then the founding card", r.kids.join(">") === "task-slot>fw-slot" && r.task && r.fw, `${r.kids.join(">")} · task ${r.task} · fw ${r.fw}`);
  L.check("L1", "no list title anywhere", !r.text.includes("What's on the list today?") && !r.text.includes("What’s on the list today?"), "title text present");
  L.check("L1", "no All {n}, hairline or list rows", r.retired === 0, `${r.retired} retired element(s)`);
  const side = !!r.closed && !!r.agents && !!r.chart && Math.abs(r.closed.t - r.agents.t) <= 1 && r.closed.r <= r.agents.l && r.closed.t >= r.chart.b;
  L.check("L1", "Closed and Agents side by side under the chart", side, JSON.stringify({ chart: r.chart, closed: r.closed, agents: r.agents }));
  L.done(5);
});

/* ── L2 · L3 · F3 · G1 — every listed size ───────────────────────────────────────────────────── */

const readFit = (page: Page) => page.evaluate(() => {
  const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
  const tab = q('[data-d58="tab"]');
  const tb = box(tab);
  let hit = false;
  if (tab && tb) { const e = document.elementFromPoint(tb.l + tb.w / 2, tb.t + tb.h / 2); hit = !!e && (e === tab || tab.contains(e)); }
  const fw = q('[data-d71="fw"]');
  const frame = fw?.querySelector(".d71-fwframe") ?? null;
  const fb = frame?.getBoundingClientRect();
  const escapes: string[] = [];
  let n = 0;
  if (fw && fb) {
    for (const el of fw.querySelectorAll<HTMLElement>("*")) {
      if (el.closest("svg")) continue;
      const b = el.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0 || getComputedStyle(el).display === "none") continue;
      n += 1;
      if (b.bottom > fb.bottom + 0.5 || b.top < fb.top - 0.5 || b.right > fb.right + 0.5 || b.left < fb.left - 0.5) escapes.push(`${el.className || el.tagName}`);
    }
  }
  const img = fw?.querySelector<HTMLImageElement>(".d71-fwart img") ?? null;
  const body = fw?.querySelector(".d71-fwbody") ?? null;
  const h = fw?.querySelector<HTMLElement>('[data-d71="fw-h"]') ?? null;
  const shown = (s: string) => { const e = fw?.querySelector<HTMLElement>(s); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none"; };
  const scroller = document.querySelector<HTMLElement>(".ws-wbody");
  /* cut text: a hoop legend row, or a part of the task card's head, that overflows its own box or runs
     past its card's edge (found at 1100×800: "1 OF 3" off the task card, "Querying" clipped) */
  const cut: string[] = [];
  let cutN = 0;
  for (const el of document.querySelectorAll<HTMLElement>('.d60-hl li, [data-d71="head"] > *, [data-d71="pos"] > *')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || getComputedStyle(el).display === "none") continue;
    cutN += 1;
    const card = el.closest<HTMLElement>(".d60-card, [data-d71='task']")?.getBoundingClientRect();
    const over = el.scrollWidth > el.clientWidth + 1 && el.tagName !== "BUTTON";
    if (over || (card && (r.right > card.right - 0.5 || r.left < card.left + 0.5))) cut.push(`${el.className || el.tagName} "${(el.textContent ?? "").trim().slice(0, 24)}"`);
  }
  return {
    cut, cutN,
    closed: box(q('[data-d60="closed-hoop"]')), agents: box(q('[data-d60="agents-hoop"]')), fw: box(fw), tab: tb, hit,
    vw: window.innerWidth, vh: window.innerHeight,
    n, escapes: escapes.slice(0, 5),
    img: box(img), imgDone: !!img && img.complete && img.naturalWidth > 0, body: box(body),
    headingFits: h ? h.scrollWidth <= h.clientWidth + 0.5 && h.scrollHeight <= h.clientHeight + 0.5 : null,
    line: shown('[data-d71="fw-line"]'), faces: shown('[data-d71="fw-faces"]'),
    scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth } : null,
    doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth },
  };
});

test("DB71 L2 · L3 · F3 · G1 — bottoms in line, the tab on screen, the card fits, one screen", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("fit");
  for (const vp of SIZES) {
    await openDash(page, vp);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const f = await readFit(page);
    const w = tag(vp);
    await shot(page, "page");
    L.check("L2", `${w} population`, !!f.closed && !!f.agents && !!f.fw && !!f.tab, JSON.stringify({ c: !!f.closed, a: !!f.agents, fw: !!f.fw, tab: !!f.tab }));
    if (f.closed && f.agents && f.fw && f.tab) {
      const bs = [f.closed.b, f.agents.b, f.fw.b];
      L.check("L2", `${w} the three bottoms are equal (±1)`, Math.max(...bs) - Math.min(...bs) <= 1, bs.map((b) => b.toFixed(1)).join(" / "));
      /* REWRITTEN (Dashboard v77): from 901px tall the Fixed shape ends the page where its content ends and
         the spare height sits below — DB77 A3 holds the tall case. The 14px holds up to 900px tall. */
      if (vp.height <= 900) L.check("L2", `${w} 14px (±2) above the tab's top`, bs.every((b) => Math.abs(f.tab!.t - b - 14) <= 2), bs.map((b) => (f.tab!.t - b).toFixed(1)).join(" / "));
      else L.check("L2", `${w} (Fixed shape) the cards end above the tab`, bs.every((b) => b <= f.tab!.t - 14 + 2), bs.map((b) => (f.tab!.t - b).toFixed(1)).join(" / "));
    }
    L.check("L3", `${w} the tab is inside the viewport`, !!f.tab && f.tab.l >= 0 && f.tab.r <= f.vw && f.tab.t >= 0 && f.tab.b <= f.vh + 0.5, JSON.stringify(f.tab));
    L.check("L3", `${w} nothing covers the tab's centre`, f.hit, String(f.hit));
    L.check("F3", `${w} population`, f.n >= 8 && f.imgDone, `${f.n} boxes · image loaded ${f.imgDone}`);
    L.check("F3", `${w} nothing leaves the frame`, f.escapes.length === 0, f.escapes.join(" | "));
    L.check("F3", `${w} the art's whole box is inside the body`, !!f.img && !!f.body && f.img.t >= f.body.t - 0.5 && f.img.b <= f.body.b + 0.5 && f.img.l >= f.body.l - 0.5 && f.img.h > 20, JSON.stringify({ img: f.img, body: f.body }));
    L.check("F3", `${w} the heading never overflows`, f.headingFits === true, String(f.headingFits));
    if (vp.height <= 760) L.check("F3", `${w} short window: the line hidden, the faces shown`, !f.line && f.faces, `line ${f.line} · faces ${f.faces}`);
    L.check("G1", `${w} nothing cut in the hoop legends or the task card's head`, f.cutN >= 6 && f.cut.length === 0, `${f.cutN} parts · ${f.cut.join(" | ") || "none cut"}`);
    L.check("G1", `${w} one screen: no vertical scroll`, !!f.scroller && f.scroller.sh <= f.scroller.ch, JSON.stringify(f.scroller));
    L.check("G1", `${w} no horizontal overflow`, !!f.scroller && f.scroller.sw <= f.scroller.cw && f.doc.sw <= f.doc.cw, JSON.stringify({ s: f.scroller, d: f.doc }));
  }
  /* L3 at the shell's minimum desktop width: the page flows there, and the tab must still be reachable */
  await openDash(page, { width: 768, height: 800 });
  const m = await readFit(page);
  L.check("L3", "768x800 the tab is inside the viewport", !!m.tab && m.tab.l >= 0 && m.tab.r <= m.vw && m.tab.b <= m.vh + 0.5, JSON.stringify(m.tab));
  L.check("L3", "768x800 nothing covers the tab's centre", m.hit, String(m.hit));
  L.done(SIZES.length * 12);
});

/* ── L4 — no card's shadow is clipped ────────────────────────────────────────────────────────── */

test("DB71 L4 — the bottom cards' shadows show in full", async ({ page }) => {
  const L = new Ledger("shadow");
  for (const vp of [V1512, { width: 1280, height: 800 }]) {
    await openDash(page, vp);
    const f = await readFit(page);
    const png = readPng(await page.screenshot({ animations: "disabled" }));
    const w = tag(vp);
    L.check("L4", `${w} population`, !!f.closed && !!f.agents && !!f.fw && !!f.tab, "three cards and the tab");
    for (const [name, b] of [["closed", f.closed], ["agents", f.agents], ["founding", f.fw]] as const) {
      if (!b || !f.tab) continue;
      /* the bottom-centre, unless the tab sits under it there — then a point of the card's bottom edge clear of the tab */
      let x = Math.round(b.l + b.w / 2);
      if (x >= f.tab.l - 16 && x <= f.tab.r + 16) x = Math.round(Math.max(b.l + 24, f.tab.l - 30));
      const y = Math.round(b.b + 6);
      const shade = png.at(x, y), ground = png.at(x, y + 30);
      const darker = shade.every((c, i) => c <= ground[i] - 2);
      L.check("L4", `${w} ${name}: 6px under its edge is darker than the ground 30px down`, darker, `x ${x} · ${shade.join(",")} vs ${ground.join(",")}`);
    }
  }
  L.done(8);
});

/* ── C1 · C2 · C3 — the task card's kinds ────────────────────────────────────────────────────── */

type Card = { index: number; of: number; kind: string; key: string; query: string; kicker: string; headBg: string; kickBg: string; title: string; who: string };
const readCard = (page: Page) => page.evaluate(() => {
  const c = document.querySelector<HTMLElement>('[data-d71="task"][data-loading="0"]');
  if (!c) return null;
  const pos = c.querySelector('[data-d71="pos-text"]')?.textContent ?? "1 OF 1";
  const head = c.querySelector<HTMLElement>('[data-d71="head"]');
  const kick = c.querySelector<HTMLElement>('[data-d71="kicker"]');
  return {
    index: Number(c.dataset.index ?? 0), pos, kind: c.dataset.kind ?? "", key: c.dataset.key ?? "", query: c.dataset.query ?? "",
    kicker: kick?.textContent ?? "", headBg: head ? getComputedStyle(head).backgroundColor : "", kickBg: kick ? getComputedStyle(kick).backgroundColor : "",
    title: c.querySelector('[data-d71="title"]')?.textContent ?? "", who: c.querySelector('[data-d71="title"] b')?.textContent ?? "",
  };
});

/** Every item the card holds, in order, by pressing › round the cycle (reduced motion: nothing moves on its own). */
async function walk(page: Page): Promise<Card[]> {
  const out: Card[] = [];
  const first = await readCard(page);
  if (!first) return out;
  const of = Number(first.pos.split(" OF ")[1] ?? 1);
  for (let i = 0; i < of; i++) {
    const c = await readCard(page);
    if (c) out.push({ ...c, of } as unknown as Card);
    if (of > 1) { await page.locator('[data-d71="next"]').click(); await page.waitForTimeout(80); }
  }
  return out;
}
async function goTo(page: Page, index: number) {
  for (let g = 0; g < 80; g++) {
    const c = await readCard(page);
    if (!c || c.index === index) return;
    await page.locator('[data-d71="next"]').click();
    await page.waitForTimeout(60);
  }
}

const TABLE: Record<string, { kicker: string; tint: string; accent: string }> = {
  nudge: { kicker: "TIME TO NUDGE", tint: "rgb(232, 238, 246)", accent: "rgb(42, 58, 82)" },
  close: { kicker: "CONSIDER CLOSING", tint: "rgb(239, 235, 229)", accent: "rgb(125, 112, 100)" },
  send: { kicker: "YOUR MOVE · SEND", tint: "rgb(244, 231, 225)", accent: "rgb(162, 69, 42)" },
};

test("DB71 C1 · C2 · C3 — nudge, close and send, as tabled", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("kinds");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDash(page, V1512);
  const all = await walk(page);
  const tally: Record<string, number> = {};
  for (const c of all) tally[c.kind] = (tally[c.kind] ?? 0) + 1;
  console.log(`  C1 items: ${all.length} · ${JSON.stringify(tally)}`);
  L.check("C1", "population: a nudge, a close and a send (full requested) are on the card", !!tally.nudge && !!tally.close && all.some((c) => c.kind === "send" && c.title.startsWith("Send your full to ")), JSON.stringify(tally));
  for (const kind of ["nudge", "close", "send"] as const) {
    const c = kind === "send" ? all.find((x) => x.kind === "send" && x.title.startsWith("Send your full to ")) : all.find((x) => x.kind === kind);
    if (!c) continue;
    await goTo(page, c.index);
    if (MUT === "C1-close-title" && kind === "close") {
      await page.evaluate(() => { const t = document.querySelector('[data-d71="title"]'); const b = t?.querySelector("b")?.textContent ?? ""; if (t) t.textContent = `Close ${b}?`; });
    }
    const r = (await readCard(page))!;
    const t = TABLE[kind];
    L.check("C1", `${kind} kicker`, r.kicker === t.kicker, `"${r.kicker}"`);
    L.check("C1", `${kind} tint`, r.headBg === t.tint, r.headBg);
    L.check("C1", `${kind} accent`, r.kickBg === t.accent, r.kickBg);
    const want = kind === "nudge" ? `Nudge ${r.who}` : kind === "close" ? `Close your query to ${r.who}?` : `Send your full to ${r.who}`;
    L.check("C1", `${kind} title`, r.who.length > 0 && r.title === want, `"${r.title}" vs "${want}"`);
    await shot(page, `task-${kind}`);

    if (kind === "nudge" || kind === "close") {
      const b = await page.evaluate(() => {
        const bar = document.querySelector<HTMLElement>('[data-d71="task"] [data-d71="bar"]');
        const track = bar?.querySelector(".d71-wbar")?.getBoundingClientRect();
        const solid = bar?.querySelector('[data-d71="bar-solid"]')?.getBoundingClientRect();
        const over = bar?.querySelector<HTMLElement>('[data-d71="bar-over"]');
        const mark = bar?.querySelector('[data-d71="close-mark"]')?.getBoundingClientRect();
        return bar && track && solid ? {
          sent: Number(bar.dataset.sent), expected: bar.dataset.expected ? Number(bar.dataset.expected) : null, close: bar.dataset.close ? Number(bar.dataset.close) : null, today: Number(bar.dataset.today),
          tl: track.left, tr: track.right, tw: track.width, sr: solid.right,
          overShown: !!over && getComputedStyle(over).display !== "none", overR: over ? over.getBoundingClientRect().right : null,
          overImg: over ? getComputedStyle(over).backgroundImage : "",
          mark: mark ? mark.left + mark.width / 2 : null,
        } : null;
      });
      L.check("C2", `${kind} population: the bar and its dates`, !!b && b.today > b.sent, JSON.stringify(b));
      if (!b) continue;
      if (b.expected != null) {
        const want = b.tl + Math.min(1, Math.max(0, (b.expected - b.sent) / (b.today - b.sent))) * b.tw;
        L.check("C2", `${kind} the solid part ends at the expected date (±2px)`, Math.abs(b.sr - want) <= 2, `${b.sr.toFixed(1)} vs ${want.toFixed(1)}`);
      }
      L.check("C2", `${kind} the hatched part runs to the end`, b.overShown && b.overR != null && Math.abs(b.overR - b.tr) <= 1 && b.overImg.includes("repeating-linear-gradient"), `${b.overR} vs ${b.tr} · ${b.overImg.slice(0, 40)}`);
      if (kind === "close") {
        const want = b.close != null ? b.tl + Math.min(1, Math.max(0, (b.close - b.sent) / (b.today - b.sent))) * b.tw : null;
        L.check("C2", "close: the marker sits at the threshold (±2px)", b.mark != null && want != null && Math.abs(b.mark - want) <= 2, `${b.mark} vs ${want}`);
        /* its words: clear of the sentence above, and inside the card (found on the close card at 1512) */
        const w2 = await page.evaluate(() => {
          const r = (s: string) => { const e = document.querySelector(`[data-d71="task"] ${s}`); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
          return { em: r('[data-d71="close-mark"] em'), line: r('[data-d71="line"]'), card: r(".d71-tb") };
        });
        L.check("C2", "close: the marker's words clear the sentence and stay in the card", !!w2.em && !!w2.line && !!w2.card && w2.em.t >= w2.line.b && w2.em.l >= w2.card.l && w2.em.r <= w2.card.r, JSON.stringify(w2));
      }
      /* the dates are the query's own: the send is the document's, checked against Firestore */
      if (r.query) {
        const s = await snapshotQuery(r.query).catch(() => null);
        const docSent = s ? [s.query.fullSentDate, s.query.partialSentDate, s.query.dateSent].map((v) => (typeof v === "string" ? Date.parse(v) : NaN)).filter((v) => !Number.isNaN(v)) : [];
        L.check("C2", `${kind} the bar starts on a send the query document records (same day)`, docSent.some((d) => Math.abs(d - b.sent) < DAY), `${new Date(b.sent).toISOString()} vs ${docSent.map((d) => new Date(d).toISOString().slice(0, 10)).join(",")}`);
      }
    } else {
      const s = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-d71="task"] .d71-step')].map((e) => {
        const cs = getComputedStyle(e);
        return { todo: e.classList.contains("is-todo"), style: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle], bg: cs.backgroundColor, text: e.textContent ?? "" };
      }));
      L.check("C3", "population: done steps and one step still to do", s.filter((x) => x.todo).length === 1 && s.some((x) => !x.todo), JSON.stringify(s.map((x) => x.text)));
      const todo = s.find((x) => x.todo);
      L.check("C3", "the step still to do is dashed and unfilled", !!todo && todo.style.every((v) => v === "dashed") && todo.bg === "rgba(0, 0, 0, 0)", JSON.stringify(todo));
      L.check("C3", "the done steps are filled and not dashed", s.filter((x) => !x.todo).every((x) => x.bg !== "rgba(0, 0, 0, 0)" && x.style.every((v) => v !== "dashed")), JSON.stringify(s.filter((x) => !x.todo)));
    }
  }
  L.done(21);
});

/* ── C4 — the cycle ──────────────────────────────────────────────────────────────────────────── */

test("DB71 C4 — 7s a task, held on hover, stepped by hand, still under reduced motion", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const L = new Ledger("cycle");
  await openDash(page, V1512);
  const n = await page.evaluate(() => document.querySelectorAll('[data-d71="segment"]').length);
  L.check("C4", "population: more than one task, with segments", n > 1, `${n} segment(s)`);
  const card = page.locator('[data-d71="task"]');
  const idx = () => page.evaluate(() => Number(document.querySelector<HTMLElement>('[data-d71="task"]')?.dataset.index ?? -1));
  /* ‹ › step and restart: press ›, then leave — the next change is one dwell after the release */
  await card.hover();
  const i0 = await idx();
  await page.locator('[data-d71="next"]').click();
  const i1 = await idx();
  L.check("C4", "› steps", i1 === (i0 + 1) % Math.max(1, Number((await page.locator('[data-d71="pos-text"]').textContent())?.split(" OF ")[1] ?? 1)), `${i0} → ${i1}`);
  await page.evaluate(() => {
    const w = window as unknown as { __d71: number | null };
    w.__d71 = null;
    const c = document.querySelector('[data-d71="task"]')!;
    new MutationObserver(() => { if (w.__d71 == null) w.__d71 = performance.now(); }).observe(c, { attributes: true, attributeFilter: ["data-index"] });
  });
  /* leave it: the pointer off the card AND focus out of it (focus inside holds it too) */
  await page.mouse.move(2, 2);
  const t0 = await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); return performance.now(); });
  await page.waitForTimeout(8500);
  const t1 = await page.evaluate(() => (window as unknown as { __d71: number | null }).__d71);
  const dwell = t1 == null ? null : t1 - t0;
  L.check("C4", "it advances 7s (±300ms) after the release", dwell != null && Math.abs(dwell - 7000) <= 300, `${dwell?.toFixed(0)}ms`);
  /* held: 10s with the pointer on the card, and nothing moves */
  await card.hover();
  const h0 = await idx();
  await page.waitForTimeout(10_000);
  const h1 = await idx();
  const full = await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-d71="segment"] > b'); return b ? b.className : ""; });
  L.check("C4", "hovered for 10s, it holds", h0 === h1, `${h0} → ${h1}`);
  L.check("C4", "held, the current segment shows full", full.includes("is-full"), full);
  await page.mouse.move(2, 2);
  /* reduced motion: 15s, and it never advances */
  const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/state.json", reducedMotion: "reduce" }).catch(() => null as BrowserContext | null);
  if (ctx) {
    const p2 = await ctx.newPage();
    await openDash(p2, V1512);
    const r0 = await p2.evaluate(() => Number(document.querySelector<HTMLElement>('[data-d71="task"]')?.dataset.index ?? -1));
    await p2.waitForTimeout(15_000);
    const r1 = await p2.evaluate(() => Number(document.querySelector<HTMLElement>('[data-d71="task"]')?.dataset.index ?? -1));
    L.check("C4", "reduced motion: no advance in 15s", r0 >= 0 && r0 === r1, `${r0} → ${r1}`);
    await ctx.close();
  } else {
    L.check("C4", "reduced motion: a context opened", false, "no context");
  }
  L.done(6);
});

/* ── C5 — "View task →" lands, and writes nothing ────────────────────────────────────────────── */

test("DB71 C5 — View task lands on the query, and nothing is written", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("view");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDash(page, V1512);
  const all = await walk(page);
  const picks = (["nudge", "close", "send"] as const).map((k) => all.find((c) => c.kind === k)).filter(Boolean) as Card[];
  L.check("C5", "population: a nudge, a close and a send", picks.length === 3, picks.map((p) => p.kind).join(","));
  const { db, uid } = await harnessDb();
  for (const c of picks) {
    await goTo(page, c.index);
    const before = await snapshotQuery(c.query).catch(() => null);
    L.check("C5", `${c.kind} the query is known`, !!before, c.query || "none");
    try {
      await page.locator('[data-d71="view"]').click();
      await page.waitForTimeout(1200);
      const land = await page.evaluate(() => ({
        panel: [...document.querySelectorAll<HTMLElement>("[data-qp='panel']")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-qp-id")),
        drawer: [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().width > 0).length,
      }));
      L.check("C5", `${c.kind} lands on that query in the query panel`, land.panel.length === 1 && land.panel[0] === c.query && land.drawer === 0, JSON.stringify(land));
      await page.waitForTimeout(800);
      const after = await snapshotQuery(c.query).catch(() => null);
      L.check("C5", `${c.kind} nothing written`, !!before && !!after && stable(after) === stable(before), after ? (stable(after) === stable(before) ? "query, log and feed unchanged" : "the query changed") : "no reading");
    } finally {
      /* the C5 code mutation writes personalisationNotes; put it back exactly as it was */
      if (MUT === "C5-write" && before) {
        const ref = doc(db, "users", uid, "queries", c.query);
        const was = before.query.personalisationNotes;
        await updateDoc(ref, { personalisationNotes: typeof was === "string" ? was : deleteField() }).catch(() => {});
        const now = (await getDoc(ref)).data()?.personalisationNotes;
        console.log(`  C5 restore ${c.query}: ${now === was ? "restored" : `NOT RESTORED (${now} vs ${was})`}`);
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  L.done(10);
});

/* ── F1 · F2 — the founding card's copy, and ask → noted → sent ─────────────────────────────── */

const FW = {
  band: "— FOUNDING WRITER —", more: "Tell us anything →",
  ask: { h: "The early bird gets the worm.", line: "How’s QueryHawk going this week?", sig: "— Nick, founder", faces: ["Lost", "Meh", "Good", "Loving it"] },
  noted: { h: "Noted, thank you.", line: "You said Good this week. Anything behind that?", row: ["Say more →", "Change"] },
  sent: { h: "Sent. Thank you.", line: "I read every note myself. If you left your email, I may reply.", row: ["— Nick", "Send another"] },
  failed: "That didn't send. Try again?",
};
const readFw = (page: Page) => page.evaluate(() => {
  const p = document.querySelector<HTMLElement>('[data-d71="fw"][data-loading="0"]');
  const t = (s: string) => p?.querySelector(s)?.textContent ?? null;
  const row = p?.querySelector('[data-d71="fw-row"]');
  return {
    state: p?.dataset.state ?? null, band: t('[data-d71="fw-band-title"]'), more: t('[data-d71="fw-more"]'),
    bandColor: p ? getComputedStyle(p.querySelector('[data-d71="fw-band-title"]')!).color : null,
    moreColor: p ? getComputedStyle(p.querySelector('[data-d71="fw-more"]')!).color : null,
    body: p ? getComputedStyle(p.querySelector('[data-d71="fw-body"]')!).backgroundColor : null,
    h: t('[data-d71="fw-h"]'), line: t('[data-d71="fw-line"]'), failed: t('[data-d71="fw-failed"]'),
    row: row ? [...row.children].filter((c) => !(c as HTMLElement).matches(".d71-faces")).map((c) => c.textContent ?? "") : [],
    faces: [...(p?.querySelectorAll<HTMLElement>('[data-d71="fw-face"]') ?? [])].map((f) => ({ label: f.dataset.label ?? "", on: f.getAttribute("aria-pressed") === "true" })),
    titles: p ? p.querySelectorAll("[title]").length : -1,
    text: p?.innerText ?? "",
    docks: document.querySelectorAll('[data-fb="panel"]').length,
  };
});

test("DB71 F1 · F2 — the founding card: copy, the pulse, the one feedback panel", async ({ page, context }) => {
  test.setTimeout(300_000);
  const L = new Ledger("founding");
  const week = isoWeekKey(new Date());
  const calls: unknown[] = [];
  let answer: "yes" | "no" = "yes";
  await context.route("**/sendWeeklyPulse", async (route) => {
    calls.push(route.request().postDataJSON());
    await new Promise((r) => setTimeout(r, 900));
    if (answer === "yes") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) });
    else await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { status: "INTERNAL", message: "no" } }) });
  });
  /* ⚠️ ALWAYS ANSWERED HERE: the real callable emails Nick */
  const fbCalls: unknown[] = [];
  await context.route("**/sendBetaFeedback", async (route) => {
    fbCalls.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) });
  });
  /* every press is bounded: a control that is not there is a recorded red, never a test that hangs */
  const press = async (sel: string, what: string) => {
    const ok = await page.locator(sel).first().click({ timeout: 5000 }).then(() => true, () => false);
    if (!ok) L.check("F2", `pressed ${what}`, false, `${sel} was not there to press`);
    return ok;
  };
  const { uid } = await harnessDb();
  await page.addInitScript(([u, w]) => { try { localStorage.removeItem(`sa.pulse.${u}.${w}`); } catch { /* */ } }, [uid, week] as const);
  await openDash(page, V1512);
  let r = await readFw(page);
  if (r.state === "noted") { await press('[data-d71="fw-change"]', '[data-d71="fw-change"]'); await page.waitForTimeout(400); r = await readFw(page); }
  /* F1 — the band, the body, Ask */
  L.check("F1", "population: the card, on Ask, with four faces", r.state === "ask" && r.faces.length === 4, JSON.stringify({ state: r.state, faces: r.faces.length }));
  L.check("F1", "band words", r.band === FW.band && r.more === FW.more, `"${r.band}" · "${r.more}"`);
  L.check("F1", "the band's two texts are white", r.bandColor === "rgb(255, 255, 255)" && r.moreColor === "rgb(255, 255, 255)", `${r.bandColor} · ${r.moreColor}`);
  L.check("F1", "the body is soft pink", r.body === "rgb(243, 224, 215)", String(r.body));
  L.check("F1", "Ask heading and line", r.h === FW.ask.h && r.line === FW.ask.line, `"${r.h}" · "${r.line}"`);
  L.check("F1", "Ask row: the signature and the four faces", r.row[0] === FW.ask.sig && r.faces.map((f) => f.label).join("|") === FW.ask.faces.join("|"), `${JSON.stringify(r.row)} · ${r.faces.map((f) => f.label).join("|")}`);
  L.check("F1", "no native title", r.titles === 0, `${r.titles}`);
  await shot(page, "founding-ask");

  /* F2 — a yes: one call, nothing says Noted before it resolves, then Noted */
  await press('[data-d71="fw-face"][data-label="Good"]', '[data-d71="fw-face"][data-label="Good"]');
  await page.waitForTimeout(300);
  const pending = await readFw(page);
  L.check("F2", "nothing says Noted before the call resolves", !pending.text.includes("Noted") && pending.state === "ask", JSON.stringify({ state: pending.state }));
  await page.waitForTimeout(1500);
  r = await readFw(page);
  const body = calls[0] as { data?: { mood?: number; week?: string } } | undefined;
  L.check("F2", "one call, { mood: 3, week }", calls.length === 1 && body?.data?.mood === 3 && body?.data?.week === week, `${calls.length} · ${JSON.stringify(body)} · ${week}`);
  L.check("F1", "Noted heading and line", r.state === "noted" && r.h === FW.noted.h && r.line === FW.noted.line, `"${r.h}" · "${r.line}"`);
  L.check("F1", "Noted row", r.row.join("|") === FW.noted.row.join("|"), JSON.stringify(r.row));
  await shot(page, "founding-noted");

  /* Change → Ask, this week's answer pre-filled */
  await press('[data-d71="fw-change"]', '[data-d71="fw-change"]');
  await page.waitForTimeout(400);
  r = await readFw(page);
  L.check("F2", "Change returns to Ask with Good pre-filled", r.state === "ask" && r.faces.find((f) => f.on)?.label === "Good", JSON.stringify(r.faces));

  /* a refusal: no Noted anywhere, the face cleared, the failure line */
  answer = "no";
  await press('[data-d71="fw-face"][data-label="Meh"]', '[data-d71="fw-face"][data-label="Meh"]');
  await page.waitForTimeout(1800);
  r = await readFw(page);
  L.check("F2", "on a refusal no Noted text exists", r.state === "ask" && !r.text.includes("Noted"), JSON.stringify({ state: r.state }));
  L.check("F2", "the failure line, and Meh is not left chosen", r.failed === FW.failed && !r.faces.find((f) => f.label === "Meh")?.on, `"${r.failed}" · ${JSON.stringify(r.faces)}`);

  /* back to Noted, then the two doors and the sidebar's: one panel, the same element */
  answer = "yes";
  await press('[data-d71="fw-face"][data-label="Good"]', '[data-d71="fw-face"][data-label="Good"]');
  await page.waitForTimeout(1600);
  L.check("F2", "docks at rest", (await readFw(page)).docks <= 1, String((await readFw(page)).docks));
  await press('[data-d71="fw-say"]', '[data-d71="fw-say"]');
  await page.waitForTimeout(500);
  const sayDocks = await page.evaluate(() => ({ all: document.querySelectorAll('[data-fb="panel"]').length, shown: [...document.querySelectorAll<HTMLElement>('[data-fb="panel"]')].filter((e) => e.getBoundingClientRect().width > 0).length }));
  L.check("F2", "Say more opens the one feedback panel, and only one exists", sayDocks.all === 1 && sayDocks.shown === 1, JSON.stringify(sayDocks));
  await shot(page, "dock-from-say-more");
  /* ⚠️ THE DOCK UNMOUNTS WHEN IT CLOSES, so "the same element" across two openings is not a thing a
     DOM can show. What is checkable is that each door opens THE dock — FeedbackDock's own panel — and
     that there is never a second one. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await press('[data-d71="fw-more"]', '[data-d71="fw-more"]');
  await page.waitForTimeout(500);
  const tell = await page.evaluate(() => ({ all: document.querySelectorAll('[data-fb="panel"]').length, dock: document.querySelectorAll('.fb-panel[role="dialog"][data-fb="panel"]').length }));
  L.check("F2", "Tell us anything opens the one feedback panel", tell.all === 1 && tell.dock === 1, JSON.stringify(tell));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const sidebar = page.locator('[data-probe="feedback"]:visible, .ws-fbb:visible, .ws-fbi:visible').first();
  if ((await sidebar.count()) > 0) {
    await sidebar.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const side = await page.evaluate(() => ({ all: document.querySelectorAll('[data-fb="panel"]').length, dock: document.querySelectorAll('.fb-panel[role="dialog"][data-fb="panel"]').length }));
    L.check("F2", "the sidebar opens the same one feedback panel", side.all === 1 && side.dock === 1, JSON.stringify(side));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } else {
    L.check("F2", "the sidebar's Give feedback is on the page", false, "not found");
  }

  /* Sent: from Say more, a note goes (answered here), and the card says so */
  await press('[data-d71="fw-say"]', '[data-d71="fw-say"]');
  await page.waitForTimeout(500);
  const kinds = page.locator('[data-fb="panel"] [data-fb="kind"]');
  const kn = await kinds.count();
  for (let i = 0; i < kn; i++) { const k = await kinds.nth(i).getAttribute("data-k"); if (k && !k.includes("broken")) { await kinds.nth(i).click({ timeout: 5000 }).catch(() => {}); break; } }
  await page.locator('[data-fb="panel"] [data-fb="message"]').fill("DB71 F2 — a measured send, answered by the harness. Not a real note.", { timeout: 5000 }).catch(() => {});
  await page.locator('[data-fb="panel"] [data-fb="send"]').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  r = await readFw(page);
  L.check("F2", "the dock's send was answered here, never sent", fbCalls.length === 1, `${fbCalls.length} call(s)`);
  L.check("F1", "Sent heading and line", r.state === "sent" && r.h === FW.sent.h && r.line === FW.sent.line, `"${r.h}" · "${r.line}"`);
  L.check("F1", "Sent row", r.row.join("|") === FW.sent.row.join("|"), JSON.stringify(r.row));
  await page.locator('[data-fb="panel"] [data-fb="close2"]').click().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "founding-sent");
  L.done(21);
});

/* ── L3 (first use) — before the first query the founding card ends clear of the tab ─────────────── */

test.describe("first use", () => {
  /* the pre-query manuscript exists only while DB60's own seeder holds it, and is cleaned after */
  const seed = (mode: "" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();
  test.beforeAll(() => { seed(""); });
  test.afterAll(() => { seed("--clean"); });
  test("DB71 L3 (first use) — the founding card is never under the Activity feed tab", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("first-use");
    for (const vp of [V1512, { width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
      for (const flags of [{ __SA_DASH_NO_AGENTS: true }, { __SA_DASH_NO_AGENTS: undefined }]) {
        await openDash(page, vp, flags, PRE);
        const r = await page.evaluate(() => {
          const b = (s: string) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const k = e.getBoundingClientRect(); return { l: k.left, r: k.right, t: k.top, b: k.bottom }; };
          return { mode: document.querySelector<HTMLElement>(".d58")?.dataset.mode ?? null, fw: b('[data-d71="fw"]'), tab: b('[data-d58="tab"]') };
        });
        const w = `${tag(vp)} ${flags.__SA_DASH_NO_AGENTS ? "day one" : "agents, no queries"}`;
        L.check("L3", `${w} population: the first-use page, the card and the tab`, r.mode === "pre" && !!r.fw && !!r.tab, JSON.stringify(r));
        if (r.fw && r.tab) {
          const overlapX = r.fw.r > r.tab.l && r.fw.l < r.tab.r;
          L.check("L3", `${w} the card ends above the tab`, !overlapX || r.fw.b <= r.tab.t - 8, `card bottom ${r.fw.b.toFixed(1)} · tab top ${r.tab.t.toFixed(1)} · gap ${(r.tab.t - r.fw.b).toFixed(1)}`);
        }
      }
    }
    L.done(16);
  });
});

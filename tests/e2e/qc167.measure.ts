/**
 * Query card v167 — the Agent, Materials and Notes tabs: ghost bars, the slimmer Agent tab, the profile drawers, and the
 * journey that waits under them. design-refs/query-card-v167/query-card-v167.html.
 *
 * Modes (QC167_TAG):
 *   after  — (default) the locks, L1–L13.
 *   mutant — the same locks after a NAMED mutation per lock (QC167_MUT lists them, default all). Every lock must go red.
 *            The ledgers are written as mutant-L*.json.
 * Frames (QC167_ONLY=F): Chromium and WebKit, 1512 wide.
 *
 * ⚠️ LAYOUT SIZES, NOT BOUNDING BOXES: the panel leans 1.6° and straightens while a drawer is open, so a bounding box moves
 *    when nothing has. Every position here is offsetTop/Left/Width/Height, summed up to the card.
 * ⚠️ A WRITE RESTORES IN THE SAME RUN: a profile save is undone by its own toast (or saved back through the same drawer)
 *    before anything else is opened, and the agent is read back to prove it.
 */
import { test, expect, webkit, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const TAG = (process.env.QC167_TAG ?? "after") as "after" | "mutant";
const ONLY = process.env.QC167_ONLY ?? "";
const run = (id: string) => (!ONLY && id !== "F") || ONLY.split(",").includes(id);
const MUT = TAG === "mutant" ? (process.env.QC167_MUT ?? "1,2,3,4,5,6,7,8,9,10,11,12,13").split(",") : [];
const DIR = "reports/query-card-v167";
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const CP = C("[data-qc1522='composer']");
const PROF = C("[data-qc167='profile']");
const TOAST = C("[data-qc1522='toast']");
const UNDO = C("[data-qc1522='undo']");
test.setTimeout(900_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc167.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
const agentOf = (k: string) => JSON.parse(seed(`--agent ${k}`).trim().split("\n").pop()!);
const queryOf = (k: string) => JSON.parse(seed(`--query ${k}`).trim().split("\n").pop()!);
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });
const ID = (k: string) => `q167-${k}`;

/** the lock now running: in mutant mode only ITS mutation is applied (all at once, they break each other's locks) */
let CUR = "";
class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) { CUR = id.slice(1); }
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${TAG}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    const bad = this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`);
    if (TAG === "mutant") expect(bad.length, `${this.id}: the mutation must turn the lock red`).toBeGreaterThan(0);
    else expect(bad).toEqual([]);
  }
}
const prefs = () => {
  try {
    sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
  } catch { /* private mode */ }
};
async function openQc(page: Page, vp = { width: 1512, height: 900 }) {
  await page.setViewportSize(vp);
  page.setDefaultTimeout(30_000); /* a removed part fails in 30s, not the test's 15 minutes */
  await page.addInitScript(prefs);
  await openRoute(page, "/queries", vp);
  await liftMotionSuppression(page);
  await page.locator(`${PAGE} [data-qc154='card']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, key: string): Promise<boolean> {
  const id = ID(key);
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  if (!(await c.count())) return false;
  const x = page.locator(C("[data-qc149c='close']"));
  if (await x.count()) { await x.first().click().catch(() => {}); await page.locator(CARD).waitFor({ state: "detached", timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  const ok = await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  await page.waitForTimeout(900);
  return ok;
}
async function tab(page: Page, t: string) { await page.locator(C(`[data-qc152='tab'][data-tab='${t}']`)).click(); await page.waitForTimeout(400); await mutate(page); }

/* ── the named mutations (mutant mode), each the undoing of one lock's subject, applied in the page ── */
async function mutate(page: Page) {
  const own = MUT.includes(CUR) ? [CUR] : [];
  if (!own.length) return;
  await page.evaluate(({ m, card }) => {
    const root = document.querySelector<HTMLElement>(card);
    if (!root) return;
    const on = (k: string) => m.includes(k);
    const css = (id: string, t: string) => { if (!document.getElementById(id)) { const s = document.createElement("style"); s.id = id; s.textContent = t; document.head.append(s); } };
    /* M1 bar and words swapped with display: the words take their own room */
    if (on("1")) css("m1", `${card} .qc167-ga, ${card} .qc167-gso { position: static !important; display: none !important; translate: none !important; }
      ${card} [data-qc167-ed]:is(:hover, :focus-visible) .qc167-ga, ${card} .qc167-gsw:is(:hover, :focus-visible) .qc167-gso { display: block !important; opacity: 1 !important; }
      ${card} [data-qc167-ed]:is(:hover, :focus-visible) .qc167-g { display: none !important; }`);
    /* M2 an empty section hidden */
    if (on("2")) css("m2", `${card} [data-qc167='asks']:has([data-ghost]), ${card} .nx-grp:has([data-qc167='ghost-row']) { display: none !important; }`);
    /* M3 the old empty sentence back, and the bars 10px */
    if (on("3")) { css("m3", `${card} .qc167-g { height: 10px !important; }`); root.querySelectorAll("[data-qc167='ghost-row']").forEach((r) => { if (!r.querySelector("[data-m3]")) { const e = document.createElement("em"); e.dataset.m3 = "1"; e.textContent = "Nothing recorded"; r.append(e); } }); }
    /* M4 the tiles' fixed height gone, the value allowed to wrap */
    if (on("4")) css("m4", `${card} .nx-box.qc167-tile { height: auto !important; min-height: 0 !important; } ${card} .nx-box.qc167-tile b { white-space: normal !important; font-size: 22px !important; }`);
    /* M5 Copy email back on the tab */
    if (on("5")) { const t = root.querySelector("[data-qc167='agent']"); if (t && !t.querySelector("[data-m5]")) { const b = document.createElement("button"); b.dataset.m5 = "1"; b.textContent = "Copy email"; t.append(b); } }
    /* M6 the four fixed buttons in place of the slider */
    if (on("6")) root.querySelectorAll("[data-qc167='reply-time'] .sa-wk-slider").forEach((s) => { const w = document.createElement("span"); w.innerHTML = [4, 6, 8, 12].map((n) => `<button type="button" data-qc152="reply-opt">${n} weeks</button>`).join(""); s.replaceWith(w); });
    /* M7 the sample picker gone, a fixed amount offered */
    if (on("7")) root.querySelectorAll("[data-qad-sample='profile']").forEach((s) => { const b = document.createElement("button"); b.textContent = "First 5 pages"; s.replaceWith(b); });
    /* M8 the button says Save */
    if (on("8")) root.querySelectorAll<HTMLElement>("[data-qc167='save']").forEach((b) => { if (b.firstChild && b.firstChild.nodeType === 3) b.firstChild.textContent = "Save"; });
    /* M11 the drawer list's height cap removed (and the drawer's own) */
    if (on("11")) css("m11", `${card} .qc167-cp .qc1522-cb.qc167-ak { max-height: none !important; overflow: visible !important; } ${card} .qc1522-cp.qc167-cp { max-height: none !important; }`);
    /* M12 the reduced-motion rule ignored: the expand animates regardless */
    if (on("12")) css("m12", `${card} .qc167-xt .exp { transition: grid-template-rows 0.26s ease !important; } ${card} .qc167-xt .expi { transition: opacity 0.2s ease !important; }`);
    /* M13 the band's line at 10px, in an uppercase mono label */
    if (on("13")) css("m13", `${card} .qc167-pf i, ${card} .qc167-ga { font: 400 10px "JetBrains Mono", monospace !important; text-transform: uppercase !important; }`);
  }, { m: own, card: CARD });
}

/** every part of the open tab, by its layout box summed up to the card (no bounding boxes: the panel leans) */
async function shell(page: Page) {
  return page.evaluate((card) => {
    const root = document.querySelector<HTMLElement>(card)!;
    const body = root.querySelector<HTMLElement>("[data-qc152='body']")!;
    const pos = (e: HTMLElement) => { let x = 0, y = 0; for (let n: HTMLElement | null = e; n && n !== root; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; } return { x, y, w: e.offsetWidth, h: e.offsetHeight }; };
    const sel = "[data-qc167='tile'], [data-qc167='asks'], [data-qc167='asks'] h4, [data-qc167='asks-list'], [data-qc167='asks-list'] li, [data-qc167='full-card'], .nx-grp, .nx-grp h4, .nx-items, .nx-items li, .nx-foot, [data-qc167='ghost-note'], [data-qc158='note'], [data-qc158='compose'], [data-qc167='bar']";
    const parts = [...body.querySelectorAll<HTMLElement>(sel)].map((e) => ({ k: `${e.tagName.toLowerCase()}${e.dataset.qc167 ? `[${e.dataset.qc167}]` : ""}${e.dataset.k ? `.${e.dataset.k}` : ""}${e.className && typeof e.className === "string" ? `.${e.className.split(" ")[0]}` : ""}`, ...pos(e) }));
    const pane = body.firstElementChild as HTMLElement | null;
    return { parts, total: pane ? pane.offsetHeight : 0, scroll: body.scrollHeight };
  }, CARD);
}
/** the shell's structure only: what parts there are, in order (L2) */
async function structure(page: Page) {
  return page.evaluate((card) => {
    const body = document.querySelector<HTMLElement>(card)!.querySelector<HTMLElement>("[data-qc152='body']")!;
    const sel = "[data-qc167='tile'], [data-qc167='asks'], [data-qc167='asks'] > h4, [data-qc167='asks-list'], [data-qc167='full-card'], .nx-grp, .nx-grp > h4, .nx-items, .nx-foot, [data-qc158='list'], [data-qc158='compose']";
    /* only what is shown: a hidden section is a different shell */
    return [...body.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getClientRects().length > 0).map((e) => `${e.tagName.toLowerCase()}${e.dataset.qc167 ? `[${e.dataset.qc167}]` : ""}${e.dataset.qc158 ? `{${e.dataset.qc158}}` : ""}${e.className && typeof e.className === "string" ? `.${e.className.split(" ")[0]}` : ""}`);
  }, CARD);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const diff = (a: { parts: { k: string; x: number; y: number; w: number; h: number }[]; total: number }, b: typeof a) => {
  const out: string[] = [];
  if (a.total !== b.total) out.push(`total ${a.total}→${b.total}`);
  if (a.parts.length !== b.parts.length) out.push(`parts ${a.parts.length}→${b.parts.length}`);
  a.parts.forEach((p, i) => { const q = b.parts[i]; if (q && (p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h)) out.push(`${p.k} ${p.x},${p.y},${p.w}x${p.h}→${q.x},${q.y},${q.w}x${q.h}`); });
  return out;
};

/* ══ L1 — no movement: nothing recorded, at rest, on hover and on focus, every part of all three tabs stays put ═════════ */
if (run("1")) test("QC167-1 · no movement: rest, hover and focus are the same layout on all three tabs", async ({ page }) => {
  const L = new Ledger("L1");
  await openQc(page);
  for (const key of ["nothing", "pending"]) {
    L.check(`${key}: the card opened`, await openCard(page, key), "");
    for (const t of ["agent", "materials", "notes"]) {
      await tab(page, t);
      const rest = await shell(page);
      const eds = await page.locator(C("[data-qc152='body'] [data-qc167-ed]")).count();
      if (t !== "notes") L.check(`${key}/${t}: population — editable boxes`, eds > 0, String(eds));
      L.check(`${key}/${t}: population — parts read`, rest.parts.length > 2, String(rest.parts.length));
      for (let i = 0; i < eds; i++) {
        const box = page.locator(C("[data-qc152='body'] [data-qc167-ed]")).nth(i);
        await box.hover(); await page.waitForTimeout(260);
        const hov = await shell(page);
        const words = await box.evaluate((e) => { const w = e.querySelector<HTMLElement>(".qc167-ga, .qc167-gso"); return w ? getComputedStyle(w).opacity : "none"; });
        L.check(`${key}/${t} #${i}: hover moves nothing`, diff(rest, hov).length === 0, diff(rest, hov).join("; ") || "same");
        if (words !== "none") L.check(`${key}/${t} #${i}: hover shows the words`, words === "1", words);
        await page.mouse.move(2, 2); await page.waitForTimeout(220);
        await page.keyboard.press("Shift"); await box.focus(); await page.waitForTimeout(260);
        const foc = await shell(page);
        L.check(`${key}/${t} #${i}: focus moves nothing`, diff(rest, foc).length === 0, diff(rest, foc).join("; ") || "same");
        await box.evaluate((e) => (e as HTMLElement).blur());
      }
      if (t === "notes") L.check(`${key}/notes: back at rest, as before`, diff(rest, await shell(page)).length === 0, "");
    }
  }
  L.done(20);
});

/* ══ L2 — the same shell for Nothing, Some and Everything ════════════════════════════════════════════════════════════ */
if (run("2")) test("QC167-2 · same shell: the parts and their order per tab do not depend on what is recorded", async ({ page }) => {
  const L = new Ledger("L2");
  await openQc(page);
  const got: Record<string, Record<string, string[]>> = {};
  for (const key of ["nothing", "some", "everything"]) {
    L.check(`${key}: the card opened`, await openCard(page, key), "");
    got[key] = {};
    for (const t of ["agent", "materials", "notes"]) { await tab(page, t); got[key][t] = await structure(page); }
  }
  for (const t of ["agent", "materials", "notes"]) {
    L.check(`${t}: population`, got.nothing[t].length >= 2, got.nothing[t].join(" "));
    L.check(`${t}: Nothing = Some`, same(got.nothing[t], got.some[t]), `${got.nothing[t].join(" ")} | ${got.some[t].join(" ")}`);
    L.check(`${t}: Nothing = Everything`, same(got.nothing[t], got.everything[t]), `${got.nothing[t].join(" ")} | ${got.everything[t].join(" ")}`);
  }
  writeFileSync(`${DIR}/ledger/${TAG}-L2-shells.json`, JSON.stringify(got, null, 1));
  L.done(9);
});

/* ══ L3 — no empty sentence on the card; the bars are 12px ═══════════════════════════════════════════════════════════ */
if (run("3")) test("QC167-3 · no 'Nothing saved yet' or 'Nothing recorded'; ghost bars 12px high", async ({ page }) => {
  const L = new Ledger("L3");
  await openQc(page);
  let bars = 0;
  for (const key of ["nothing", "pending", "some"]) {
    await openCard(page, key);
    for (const t of ["agent", "materials", "notes"]) {
      await tab(page, t);
      const txt = await page.locator(C("[data-qc152='body']")).innerText();
      L.check(`${key}/${t}: no empty sentence`, !/Nothing saved yet|Nothing recorded|Nothing noted yet/.test(txt), txt.slice(0, 80).replace(/\n/g, " / "));
      const hs = await page.locator(C("[data-qc152='body'] [data-qc167='bar']")).evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetHeight));
      bars += hs.length;
      L.check(`${key}/${t}: every bar 12px`, hs.every((h) => h === 12), hs.join(","));
    }
  }
  L.check("population: bars were read", bars >= 6, String(bars));
  L.done(10);
});

/* ══ L4 — the tiles are 86px before and after a save, the longest value on one line ═════════════════════════════════ */
if (run("4")) test("QC167-4 · tiles 86px high before and after a save, 'About 26 weeks' on one line", async ({ page }) => {
  const L = new Ledger("L4");
  await openQc(page);
  await openCard(page, "everything");
  await tab(page, "agent");
  const read = () => page.locator(C("[data-qc167='tile']")).evaluateAll((els) => els.map((e) => { const b = e.querySelector<HTMLElement>("b")!; const lh = parseFloat(getComputedStyle(b).lineHeight); return { h: (e as HTMLElement).offsetHeight, text: b.innerText, one: b.offsetHeight <= Math.ceil(lh) + 1 && b.scrollWidth <= b.clientWidth + 1 }; }));
  const before = await read();
  L.check("population: three tiles", before.length === 3, String(before.length));
  L.check("the longest value", before[0]?.text === "About 26 weeks", before[0]?.text ?? "");
  L.check("before: every tile 86px", before.every((t) => t.h === 86), before.map((t) => t.h).join(","));
  L.check("before: every value on one line, uncut", before.every((t) => t.one), JSON.stringify(before));
  /* a save: 26 → 25 weeks, read, then its Undo */
  const was = agentOf("everything");
  await page.locator(C("[data-qc167='tile'][data-k='reply']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await mutate(page);
  await page.locator(C("[data-qc167='reply-time'] input[type='range']")).focus();
  await page.keyboard.press("ArrowLeft");
  await page.locator(C("[data-qc167='save']")).click();
  await page.locator(TOAST).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await mutate(page);
  const after = await read();
  L.check("after: the new value", after[0]?.text === "About 25 weeks", after[0]?.text ?? "");
  L.check("after: every tile 86px", after.every((t) => t.h === 86), after.map((t) => t.h).join(","));
  await page.locator(UNDO).click();
  await page.waitForTimeout(2500);
  L.check("restored: the agent as before", same(agentOf("everything").responseTimeWeeks, was.responseTimeWeeks), JSON.stringify(agentOf("everything").responseTimeWeeks));
  L.done(7);
});

/* ══ L5 — the slimmer tab, and its one row opens that agent's card ═══════════════════════════════════════════════════ */
if (run("5")) test("QC167-5 · no Copy email, website, wishlist, Edit these details or 'You sent everything'; the full-card row", async ({ page }) => {
  const L = new Ledger("L5");
  await openQc(page);
  await openCard(page, "everything");
  await tab(page, "agent");
  const txt = await page.locator(C("[data-qc152='body']")).innerText();
  for (const gone of ["Copy email", "Add a website", "Wishlist", "Edit these details", "You sent everything", "You didn’t send"]) L.check(`no "${gone}"`, !txt.includes(gone), "");
  const row = page.locator(C("[data-qc167='full-card']"));
  L.check("one full-card row", (await row.count()) === 1, String(await row.count()));
  L.check("its words", (await row.innerText()).includes("Evie’s full card"), (await row.innerText()).replace(/\n/g, " / "));
  await row.click();
  await page.waitForTimeout(1500);
  const opened = await page.locator("[data-acv2='card']").filter({ hasText: "Evie Lark" }).first().isVisible({ timeout: 8000 }).catch(() => false);
  L.check("it opens Evie's card", opened, String(opened));
  L.done(9);
});

/* ══ L6 — the reply-time drawer is the WeekSlider; Unknown saves null ═══════════════════════════════════════════════ */
if (run("6")) test("QC167-6 · the reply-time drawer renders the WeekSlider, and Unknown saves null", async ({ page }) => {
  const L = new Ledger("L6");
  await openQc(page);
  await openCard(page, "some");
  await tab(page, "agent");
  const was = agentOf("some");
  L.check("population: Some replies in 8 weeks", was.responseTimeWeeks === 8, JSON.stringify(was));
  await page.locator(C("[data-qc167='tile'][data-k='reply']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await mutate(page);
  L.check("the slider (1–26)", await page.locator(C("[data-qc167='reply-time'] input.sa-wk-slider[type='range'][min='1'][max='26']")).count() === 1, "");
  L.check("no fixed week buttons", await page.locator(C("[data-qc167='reply-time'] [data-qc152='reply-opt']")).count() === 0, "");
  const unk = page.locator(C("[data-qc167='reply-time'] button")).filter({ hasText: "Unknown" }).first();
  L.check("the Unknown pill", await unk.count() === 1, "");
  if (await unk.count()) {
    await unk.click();
    await page.locator(C("[data-qc167='save']")).click();
    await page.locator(TOAST).waitFor({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const now = agentOf("some");
    L.check("Unknown saved null", now.responseTimeWeeks == null, JSON.stringify(now.responseTimeWeeks));
    L.check("the tile is a ghost now", await page.locator(C("[data-qc167='tile'][data-k='reply'][data-ghost]")).count() === 1, "");
    await page.locator(UNDO).click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  L.check("restored", agentOf("some").responseTimeWeeks === 8, JSON.stringify(agentOf("some").responseTimeWeeks));
  L.done(7);
});

/* ══ L7 — the sample tile renders SampleControl, no fixed amounts; what it saves is what the full card shows ═══════ */
if (run("7")) test("QC167-7 · the sample tile is SampleControl; it saves through the encoder; the full card shows it", async ({ page }) => {
  const L = new Ledger("L7");
  await openQc(page);
  await openCard(page, "some");
  await tab(page, "agent");
  await page.locator(C("[data-qc167='asks-list']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await page.locator(C("[data-qc167='expand'][data-x='sample'] [data-qc167='expand-head']")).click();
  await page.waitForTimeout(450);
  await mutate(page);
  L.check("the app's SampleControl", await page.locator(C("[data-qc167='expand'][data-x='sample'] [data-qad-sample='profile']")).count() === 1, "");
  const fixed = await page.locator(C("[data-qc167='profile'] button")).evaluateAll((bs) => bs.map((b) => (b as HTMLElement).innerText.trim()).filter((t) => /^First \d+ (pages|chapters)$/i.test(t)));
  L.check("no element offers a fixed amount", fixed.length === 0, fixed.join(","));
  L.check("units and amount only (no section)", await page.locator(C("[data-qad-sample='profile'] .qad-from")).count() === 0, "");
  /* chapters 3 → 4 with its + */
  await page.locator(C("[data-qad-sample='profile'] button[aria-label='More']")).click().catch(() => {});
  await page.locator(C("[data-qc167='save']")).click().catch(() => {});
  await page.locator(TOAST).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const saved = agentOf("some").materialsWanted;
  L.check("saved through the encoder's spelling", same(saved, ["First 4 chapters"]), JSON.stringify(saved));
  const tabText = await page.locator(C("[data-qc167='asks-list']")).innerText().catch(() => "");
  L.check("the tab shows it", /First 4 chapters/i.test(tabText), tabText.replace(/\n/g, " / "));
  /* the agent's full card shows the same sample (opening it leaves the toast, so the fixture is re-seeded after) */
  await page.locator(C("[data-qc167='full-card']")).click();
  const full = page.locator("[data-acv2='card']").filter({ hasText: "Sami Lark" }).first();
  await full.waitFor({ timeout: 10_000 }).catch(() => {});
  const ft = await full.innerText().catch(() => "");
  L.check("the full card shows the same sample", /4 chapters/i.test(ft), ft.replace(/\n/g, " / ").slice(0, 200));
  seed();
  L.check("restored (re-seeded)", same(agentOf("some").materialsWanted, []), JSON.stringify(agentOf("some").materialsWanted));
  L.done(7);
});

/* ══ L8 — every profile drawer: the band, Save to profile; the toast names the profile; Undo restores every field ═══ */
if (run("8")) test("QC167-8 · the band, 'Save to profile', the toast and its Undo on every profile drawer", async ({ page }) => {
  const L = new Ledger("L8");
  await openQc(page);
  await openCard(page, "everything");
  await tab(page, "agent");
  const before = agentOf("everything");
  for (const [k, open] of [["weeks", "[data-qc167='tile'][data-k='reply']"], ["method", "[data-qc167='tile'][data-k='method']"], ["asks", "[data-qc167='asks-list']"]] as const) {
    await page.locator(C(open)).click();
    await page.locator(PROF).waitFor({ timeout: 10_000 });
    await mutate(page);
    const band = await page.locator(C("[data-qc167='profile-band']")).innerText();
    L.check(`${k}: the band names Evie's profile`, /Evie’s profile/.test(band) && /Saved for every query you send Evie/.test(band), band.replace(/\n/g, " / "));
    const btn = (await page.locator(C("[data-qc167='save']")).innerText()).trim();
    L.check(`${k}: the button reads Save to profile`, btn === "Save to profile", btn);
    /* change one thing */
    if (k === "weeks") { await page.locator(C("[data-qc167='nrmn']")).click(); }
    if (k === "method") { await page.locator(C("[data-qc167='methods'] [data-method='Email']")).click(); }
    if (k === "asks") { await page.locator(C("[data-ask='syn']")).click(); }
    await page.locator(C("[data-qc167='save']")).click().catch(() => {});
    await page.locator(TOAST).waitFor({ timeout: 15_000 }).catch(() => {});
    const t = await page.locator(TOAST).innerText().catch(() => "");
    L.check(`${k}: the toast`, /Saved to Evie’s profile/.test(t), t.replace(/\n/g, " "));
    await page.waitForTimeout(1200);
    const mid = agentOf("everything");
    L.check(`${k}: the change was written`, !same(mid, before), "");
    await page.locator(UNDO).click().catch(() => {});
    await page.waitForTimeout(2500);
    const back = agentOf("everything");
    L.check(`${k}: Undo restored every field`, same({ ...back, updatedAt: null }, { ...before, updatedAt: null }), JSON.stringify(back));
  }
  L.done(15);
});

/* ══ L9 — one save shows on the agent's other query ══════════════════════════════════════════════════════════════════ */
if (run("9")) test("QC167-9 · a save from the card changes the agent once, and another query for the agent shows it", async ({ page }) => {
  const L = new Ledger("L9");
  await openQc(page);
  await openCard(page, "some");
  await tab(page, "agent");
  const was = agentOf("some");
  await page.locator(C("[data-qc167='tile'][data-k='reply']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await page.locator(C("[data-qc167='reply-time'] input[type='range']")).focus();
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  /* M9: the drawer's Save does nothing (Back instead) */
  await page.locator(C(MUT.includes("9") ? "[data-qc167='cancel']" : "[data-qc167='save']")).click();
  await page.waitForTimeout(2000);
  const now = agentOf("some");
  L.check("the agent now replies in 10 weeks", now.responseTimeWeeks === 10, JSON.stringify(now));
  L.check("the other fields as they were", same({ ...now, responseTimeWeeks: 0, updatedAt: null }, { ...was, responseTimeWeeks: 0, updatedAt: null }), "");
  await openCard(page, "some2");
  await tab(page, "agent");
  const v = await page.locator(C("[data-qc167='tile'][data-k='reply'] b")).innerText();
  L.check("the other query shows the new value", v === "About 10 weeks", v);
  /* back through the same drawer, on the other query */
  if (now.responseTimeWeeks === 10) {
    await page.locator(C("[data-qc167='tile'][data-k='reply']")).click();
    await page.locator(PROF).waitFor({ timeout: 10_000 });
    await page.locator(C("[data-qc167='reply-time'] input[type='range']")).focus();
    await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft");
    await page.locator(C("[data-qc167='save']")).click();
    await page.waitForTimeout(2000);
  }
  L.check("restored", agentOf("some").responseTimeWeeks === 8, JSON.stringify(agentOf("some").responseTimeWeeks));
  L.done(4);
});

/* ══ L10 — mid-journey: the journey waits under the drawer and comes back as it was, every journey on the footers ════ */
if (run("10")) test("QC167-10 · mid-journey: Save, Back and Esc return to the journey at its step, answers intact, nothing written", async ({ page }) => {
  test.setTimeout(1_500_000);
  const L = new Ledger("L10");
  await openQc(page);
  const journeys = new Set<string>();
  /** what the journey holds: which journey, every value, every pressed choice */
  const sig = () => page.locator(CP).evaluate((cp) => JSON.stringify({ j: (cp as HTMLElement).dataset.j,
    vals: [...cp.querySelectorAll<HTMLInputElement>("input, textarea")].map((i) => `${i.type}:${i.type === "checkbox" ? i.checked : i.value}`),
    on: [...cp.querySelectorAll<HTMLElement>("button")].map((b) => `${b.className.includes(" on") || b.classList.contains("on") ? 1 : 0}${b.getAttribute("aria-pressed") ?? ""}${b.getAttribute("aria-checked") ?? ""}`).join("") }));
  for (const key of ["pending", "some", "offer", "passed"]) {
    if (!(await openCard(page, key))) { L.check(`${key}: the card opened`, false, ""); continue; }
    const foot = await page.locator(C("[data-qc152='reply-btn'], [data-qc1522='foot-link'], [data-qc1522='foot-replied']")).count();
    for (let fi = 0; fi < foot; fi++) {
      for (const how of ["save", "back", "esc"] as const) {
        await openCard(page, key);
        await tab(page, "tracking");
        const fb = page.locator(C("[data-qc152='reply-btn'], [data-qc1522='foot-link'], [data-qc1522='foot-replied']")).nth(fi);
        if (!(await fb.count())) continue;
        await fb.click();
        if (!(await page.locator(CP).waitFor({ timeout: 8000 }).then(() => true, () => false))) continue;
        const j = await page.locator(CP).getAttribute("data-j");
        journeys.add(j ?? "?");
        /* answer its first step: the first unpressed choice, else the first box */
        const pick = page.locator(`${CP} .qc1522-seg button:not(.on), ${CP} .qc1522-cb button[aria-pressed='false']`).first();
        if (await pick.count()) await pick.click().catch(() => {});
        else { const ta = page.locator(`${CP} textarea`).first(); if (await ta.count()) await ta.fill("A line of my own"); }
        await page.locator(`${CP} button, ${CP} input, ${CP} textarea`).first().focus();
        await page.evaluate(() => document.activeElement?.setAttribute("data-m10-focus", "1"));
        const s0 = await sig();
        const q0 = queryOf(key);
        const a0 = agentOf(key === "pending" ? "pending" : key === "some" ? "some" : key);
        /* M10: the journey is closed (unmounted) when the profile drawer opens */
        if (MUT.includes("10")) { await page.locator(`${CP} [data-qc1522='cancel']`).click().catch(() => {}); await page.locator(`${CARD} [data-qc1522='discard']`).click().catch(() => {}); }
        await tab(page, "agent");
        await page.locator(C("[data-qc167='tile'][data-k='reply']")).click();
        const opened = await page.locator(PROF).waitFor({ timeout: 8000 }).then(() => true, () => false);
        const line = opened ? await page.locator(C("[data-qc167='profile-line']")).innerText() : "";
        const back = opened ? (await page.locator(C("[data-qc167='cancel']")).innerText()).trim() : "";
        L.check(`${key}/${j}/${how}: the band says the journey waits`, /is waiting for you\.$/.test(line), line);
        L.check(`${key}/${j}/${how}: Cancel is Back to it`, /^Back to “.+”$/.test(back), back);
        if (how === "save") {
          await page.locator(C("[data-qc167='reply-time'] input[type='range']")).focus();
          await page.keyboard.press("ArrowRight");
          await page.locator(C("[data-qc167='save']")).click();
        } else if (how === "back") await page.locator(C("[data-qc167='cancel']")).click().catch(() => {});
        else await page.keyboard.press("Escape");
        await page.waitForTimeout(900);
        const cpBack = await page.locator(CP).isVisible().catch(() => false);
        L.check(`${key}/${j}/${how}: the journey is back`, cpBack && (await page.locator(PROF).count()) === 0, String(cpBack));
        const s1 = cpBack ? await sig() : "";
        L.check(`${key}/${j}/${how}: the same step and answers`, s1 === s0, s1 === s0 ? "same" : `${s0} → ${s1}`);
        const foc = await page.evaluate(() => document.activeElement?.getAttribute("data-m10-focus") ?? null);
        L.check(`${key}/${j}/${how}: focus on the control it left`, foc === "1", String(foc));
        const q1 = queryOf(key);
        L.check(`${key}/${j}/${how}: nothing written to the query`, same(q0, q1), `${JSON.stringify(q0)} → ${JSON.stringify(q1)}`);
        if (how === "save") {
          /* the profile save is undone by its own toast, here, before anything else happens */
          await page.locator(UNDO).click().catch(() => {});
          await page.waitForTimeout(2500);
          L.check(`${key}/${j}/save: the agent restored`, same({ ...agentOf(key), updatedAt: null }, { ...a0, updatedAt: null }), "");
        }
        /* leave the journey: Cancel, and Discard if it asks */
        await page.locator(`${CP} [data-qc1522='cancel']`).click().catch(() => {});
        await page.locator(`${CARD} [data-qc1522='discard']`).click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    }
  }
  L.check("population: the journeys run", journeys.size >= 4, [...journeys].join(","));
  writeFileSync(`${DIR}/ledger/${TAG}-L10-journeys.json`, JSON.stringify([...journeys]));
  L.done(20);
});

/* ══ L11 — both tiles open: the card does not scroll, the header stays in view ═══════════════════════════════════════ */
if (run("11")) test("QC167-11 · both expanding tiles open at 1512×900 and 1280×720: no card overflow, the header in view", async ({ page }) => {
  const L = new Ledger("L11");
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 720 }]) {
    await openQc(page, vp);
    await openCard(page, "some");
    await tab(page, "agent");
    await page.locator(C("[data-qc167='asks-list']")).click();
    await page.locator(PROF).waitFor({ timeout: 10_000 });
    for (const x of ["sample", "other"]) await page.locator(C(`[data-qc167='expand'][data-x='${x}'] [data-qc167='expand-head']`)).click();
    await page.waitForTimeout(500);
    await mutate(page);
    await page.waitForTimeout(300);
    const m = await page.evaluate((card) => {
      const root = document.querySelector<HTMLElement>(card)!;
      const inn = root.querySelector<HTMLElement>(".qc152-in")!;
      const band = root.querySelector<HTMLElement>("[data-qc152='band']")!;
      const body = root.querySelector<HTMLElement>("[data-qc152='body']")!;
      return { over: Math.max(root.scrollHeight - root.clientHeight, inn.scrollHeight - inn.clientHeight), top: inn.scrollTop + root.scrollTop, bandTop: band.offsetTop, bodyH: body.offsetHeight };
    }, CARD);
    L.check(`${vp.width}×${vp.height}: the card's scroll overflow is 0`, m.over <= 0, JSON.stringify(m));
    L.check(`${vp.width}×${vp.height}: the header in view (not scrolled)`, m.top === 0 && m.bandTop >= 0, JSON.stringify(m));
    L.check(`${vp.width}×${vp.height}: the tabs' body still has room`, m.bodyH > 40, String(m.bodyH));
    await page.locator(C("[data-qc167='cancel']")).click().catch(() => {});
  }
  L.done(6);
});

/* ══ L12 — expanding moves nothing above it; reduced motion animates nothing ═══════════════════════════════════════ */
if (run("12")) test("QC167-12 · expanding a tile moves nothing above it; with reduced motion nothing animates", async ({ page }) => {
  const L = new Ledger("L12");
  await openQc(page);
  await openCard(page, "some");
  await tab(page, "agent");
  await page.locator(C("[data-qc167='asks-list']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  const above = () => page.evaluate((card) => {
    const root = document.querySelector<HTMLElement>(card)!;
    const pos = (e: HTMLElement) => { let y = 0; for (let n: HTMLElement | null = e; n && n !== root; n = n.offsetParent as HTMLElement | null) y += n.offsetTop; return `${y}:${e.offsetHeight}`; };
    const xt = root.querySelector<HTMLElement>("[data-qc167='expand'][data-x='sample']")!;
    return [root.querySelector<HTMLElement>("[data-qc152='band']")!, root.querySelector<HTMLElement>("[data-qc167='profile-band']")!, ...root.querySelectorAll<HTMLElement>("[data-ask]"), xt.querySelector<HTMLElement>("[data-qc167='expand-head']")!].map(pos);
  }, CARD);
  const a0 = await above();
  await page.locator(C("[data-qc167='expand'][data-x='sample'] [data-qc167='expand-head']")).click();
  await page.waitForTimeout(500);
  const a1 = await above();
  L.check("population", a0.length >= 4, a0.join(" "));
  L.check("nothing above the tile moved", same(a0, a1), `${a0.join(" ")} → ${a1.join(" ")}`);
  await page.locator(C("[data-qc167='expand'][data-x='sample'] [data-qc167='expand-head']")).click();
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mutate(page);
  await page.locator(C("[data-qc167='expand'][data-x='other'] [data-qc167='expand-head']")).click();
  const anims = await page.evaluate((card) => document.getAnimations().filter((an) => { const t = (an.effect as KeyframeEffect | null)?.target as Element | null; return !!t && !!t.closest(`${card} [data-qc167='profile']`) && an.playState === "running"; }).map((an) => (an as CSSTransition).transitionProperty ?? (an as CSSAnimation).animationName ?? "?"), CARD);
  L.check("reduced motion: the expand makes no animation", anims.length === 0, anims.join(","));
  const open = await page.locator(C("[data-qc167='expand'][data-x='other'] .exp")).evaluate((e) => getComputedStyle(e).gridTemplateRows);
  L.check("reduced motion: the tile is open at once", !/^0px/.test(open), open);
  await page.emulateMedia({ reducedMotion: null });
  L.done(4);
});

/* ══ L13 — nothing new under 12px; no uppercase mono label ═══════════════════════════════════════════════════════════ */
if (run("13")) test("QC167-13 · nothing new under 12px, no new uppercase mono label", async ({ page }) => {
  const L = new Ledger("L13");
  await openQc(page);
  const scan = () => page.evaluate((card) => {
    const root = document.querySelector<HTMLElement>(card)!;
    const scope = [...root.querySelectorAll<HTMLElement>("[data-qc167='agent'], [data-qc167='profile'], [data-qc167='ghost-row'], [data-qc167='ghost-note']")];
    /* the WeekSlider is the app's, untouched, lettering and all (v167 deviation 3): not new, so not scanned */
    const own = (e: Element) => !!e.closest(".sa-fld, [class*='sa-wk']");
    const out: string[] = [];
    let n = 0;
    for (const s of scope) {
      const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        const e = t.parentElement!; if (!(t.textContent ?? "").trim() || own(e)) continue;
        n++;
        const cs = getComputedStyle(e); const px = parseFloat(cs.fontSize);
        if (px < 12) out.push(`${px}px "${t.textContent!.trim().slice(0, 20)}"`);
        if (cs.textTransform === "uppercase" && /mono/i.test(cs.fontFamily)) out.push(`mono caps "${t.textContent!.trim().slice(0, 20)}"`);
      }
    }
    return { n, out };
  }, CARD);
  let n = 0;
  for (const key of ["nothing", "everything"]) {
    await openCard(page, key);
    for (const t of ["agent", "materials", "notes"]) { await tab(page, t); const r = await scan(); n += r.n; L.check(`${key}/${t}`, r.out.length === 0, r.out.join("; ")); }
    await tab(page, "agent");
    for (const open of ["[data-qc167='tile'][data-k='reply']", "[data-qc167='tile'][data-k='method']", "[data-qc167='asks-list']"]) {
      await page.locator(C(open)).click();
      await page.locator(PROF).waitFor({ timeout: 10_000 });
      for (const x of ["sample", "other"]) { const h = page.locator(C(`[data-qc167='expand'][data-x='${x}'] [data-qc167='expand-head']`)); if (await h.count()) await h.click(); }
      await page.waitForTimeout(400);
      await mutate(page);
      const r = await scan(); n += r.n;
      L.check(`${key} drawer ${open}`, r.out.length === 0, r.out.join("; "));
      await page.locator(C("[data-qc167='cancel']")).click();
      await page.waitForTimeout(300);
    }
  }
  L.check("population: text read", n > 60, String(n));
  L.done(13);
});

/* ══ F — the frames: each tab at Nothing, hovered, and Everything; each drawer; both tiles open; mid-journey; the toast ═ */
async function frames(page: Page, eng: string) {
  const clip = () => page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: Math.min(innerWidth - Math.max(0, r.left - 20), r.width + 40), height: Math.min(innerHeight - Math.max(0, r.top - 20), r.height + 40) }; }, CARD);
  const shot = async (name: string) => { await page.waitForTimeout(450); await page.screenshot({ path: `${DIR}/frames/${eng}-1512-${name}.png`, clip: await clip() }); };
  await openQc(page);
  for (const key of ["nothing", "everything"]) {
    await openCard(page, key);
    for (const t of ["agent", "materials", "notes"]) {
      await tab(page, t);
      await shot(`${key}-${t}`);
      if (key === "nothing") { const b = page.locator(C("[data-qc152='body'] [data-qc167-ed]")).first(); if (await b.count()) { await b.hover(); await shot(`${key}-${t}-hover`); await page.mouse.move(2, 2); } }
    }
  }
  await openCard(page, "everything");
  await tab(page, "agent");
  for (const [n, open] of [["reply", "[data-qc167='tile'][data-k='reply']"], ["method", "[data-qc167='tile'][data-k='method']"], ["asks", "[data-qc167='asks-list']"]] as const) {
    await page.locator(C(open)).click(); await page.locator(PROF).waitFor({ timeout: 10_000 });
    await shot(`drawer-${n}`);
    if (n === "asks") { for (const x of ["sample", "other"]) await page.locator(C(`[data-qc167='expand'][data-x='${x}'] [data-qc167='expand-head']`)).click(); await shot("drawer-asks-both-open"); }
    await page.locator(C("[data-qc167='cancel']")).click(); await page.waitForTimeout(300);
  }
  await openCard(page, "pending");
  await page.locator(C("[data-qc152='reply-btn']")).first().click();
  await page.locator(CP).waitFor({ timeout: 8000 }).catch(() => {});
  await tab(page, "agent");
  await page.locator(C("[data-qc167='tile'][data-k='reply']")).click(); await page.locator(PROF).waitFor({ timeout: 10_000 }).catch(() => {});
  await shot("mid-journey");
  await page.locator(C("[data-qc167='cancel']")).click().catch(() => {});
  await page.locator(`${CP} [data-qc1522='cancel']`).click().catch(() => {});
  await page.locator(`${CARD} [data-qc1522='discard']`).click({ timeout: 2000 }).catch(() => {});
  await openCard(page, "everything");
  await tab(page, "agent");
  await page.locator(C("[data-qc167='tile'][data-k='reply']")).click(); await page.locator(PROF).waitFor({ timeout: 10_000 });
  await page.locator(C("[data-qc167='nrmn']")).click();
  await page.locator(C("[data-qc167='save']")).click();
  await page.locator(TOAST).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/frames/${eng}-1512-toast.png`, clip: await clip() });
  await page.locator(UNDO).click().catch(() => {});
  await page.waitForTimeout(2500);
}
if (run("F")) test("QC167-F · frames, Chromium and WebKit", async ({ page, baseURL }) => {
  test.setTimeout(1_200_000);
  await frames(page, "chromium");
  const b = await webkit.launch();
  try {
    const ctx = await b.newContext({ baseURL: baseURL ?? process.env.SA_E2E_BASE_URL });
    await frames(await ctx.newPage(), "webkit");
  } finally { await b.close(); }
});

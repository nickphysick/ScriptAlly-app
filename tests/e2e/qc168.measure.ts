/**
 * Query card v168 — ONE WAY TO EDIT on the slide-in query card (desktop): the pencil on the thing, the cross and the tick
 * where the pencil was, one thing open at a time, the card's own toast with Undo; the band's ⋯ for Move and Delete.
 * design-refs/query-card-v168/query-card-v168.html.
 *
 * Modes (QC168_TAG):
 *   after  — (default) the locks, L1–L14.
 *   mutant — the same locks, each under ITS OWN named mutation only (QC168_MUT lists which locks, default all). Every
 *            lock must go red. Code mutations are `window.__qc168mut = [lock]` (read by QcEdit168 `mut168`, off
 *            production only); CSS/DOM ones (L2, L7, L13) are applied in the page. Ledgers: mutant-L*.json.
 * Frames (QC168_ONLY=F): Chromium and WebKit, 1512 wide.
 *
 * ⚠️ LAYOUT SIZES, NOT BOUNDING BOXES: the panel leans 1.6° and straightens while something is open, so a bounding box
 *    moves when nothing has. Every position here is offsetTop/Left/Width/Height, summed up to the card.
 * ⚠️ EVERY WRITE IS PUT BACK IN THE SAME RUN, through its own Undo where it has one (and read back), else by the seed
 *    (a deleted note: `--restore-note`).
 */
import { test, expect, webkit, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";
import { openCard as openAgentRow } from "./cl262Lib";

const TAG = (process.env.QC168_TAG ?? "after") as "after" | "mutant";
const ONLY = process.env.QC168_ONLY ?? "";
const run = (id: string) => (!ONLY && !id.startsWith("F")) || ONLY.split(",").includes(id);
const MUT = TAG === "mutant" ? (process.env.QC168_MUT ?? "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19").split(",") : [];
const DIR = "reports/query-card-v168";
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const AC = "[data-cl262='panel'] [data-acv2='card']";
const C = (s: string) => `${CARD} ${s}`;
const STEP = C("[data-qc1522='step-edit']");
const TOAST = C("[data-qc1522='toast']");
const UNDO = C("[data-qc1522='undo']");
const PROF = C("[data-qc167='profile']");
const VP = { width: 1512, height: 900 };
const QID = "q168-main";
/** v168.2 — a partial asked for (Bram), so the footer opens the "send" journey and its materials (L18) */
const RID = "q168-req";
const ACT = (k: string) => `${QID}-${k}`;
test.setTimeout(900_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc168.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
type Read = { agentId: string | null; status: string | null; log: Record<string, { materials: unknown; replyNote: string | null; at: string }>; notes: Record<string, string | null>; ava: { responseTimeWeeks: number | null; notes: string | null } | null };
const readDb = (): Read => JSON.parse(seed("--read").trim().split("\n").pop()!);
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

/** WebKit frames only: desktop WebKit refuses Playwright's pointer actions in this harness ("<html> intercepts pointer
 *  events", 23 Nov), so its frames press with a DOM click and skip hover (tests/e2e/pc3.measure.ts did the same) */
let domClick = false;
const press = async (l: import("@playwright/test").Locator) => { if (domClick) await l.first().evaluate((e) => (e as HTMLElement).click()); else await l.click(); };
const over = async (l: import("@playwright/test").Locator) => { if (!domClick) await l.hover(); };
/** the lock now running: in mutant mode only ITS mutation is applied */
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
const own = () => (MUT.includes(CUR) ? CUR : "");
const prefs = (m: string) => {
  try {
    sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
  } catch { /* private mode */ }
  (window as unknown as { __qc168mut?: string[] }).__qc168mut = m ? [m] : [];
};
async function openQc(page: Page) {
  await page.setViewportSize(VP);
  page.setDefaultTimeout(30_000);
  await page.addInitScript(prefs, own());
  await openRoute(page, "/queries", VP);
  await liftMotionSuppression(page);
  await page.locator(`${PAGE} [data-qc154='card']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, id = QID): Promise<boolean> {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  if (!(await c.count())) return false;
  const x = page.locator(C("[data-qc149c='close']"));
  if (await x.count()) { await press(x).catch(() => {}); await page.locator(CARD).waitFor({ state: "detached", timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
  await c.scrollIntoViewIfNeeded();
  await press(c.locator("[data-qc154='name']"));
  const ok = await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  await page.waitForTimeout(900);
  await mutate(page);
  return ok;
}
async function tab(page: Page, t: string) { await press(page.locator(C(`[data-qc152='tab'][data-tab='${t}']`))); await page.waitForTimeout(400); await mutate(page); }
const selected = (page: Page) => page.locator(C("[data-qc152='tab'][aria-selected='true']")).getAttribute("data-tab");
const bubble = (k: string) => C(`[data-qc152='thread'] > [data-qc152='msg'][data-activity='${ACT(k)}']`);
async function openStep(page: Page, k: string) { const b = page.locator(bubble(k)); await b.scrollIntoViewIfNeeded(); await over(b); await press(b.locator("[data-qc168='pen']")); await page.locator(STEP).waitFor({ timeout: 10_000 }); await page.waitForTimeout(250); }
const note = (k: string) => C(`[data-qc158='note'][data-id='${ACT(k)}']`);
async function openNote(page: Page, k: string) { const n = page.locator(note(k)); await n.scrollIntoViewIfNeeded(); await over(n); await press(n.locator("[data-qc168='pen']")); await page.waitForTimeout(250); }
async function toastSays(page: Page, words: string) { return page.locator(TOAST).filter({ hasText: words }).waitFor({ timeout: 20_000 }).then(() => true, () => false); }
async function undo(page: Page) { await page.locator(UNDO).click(); await page.waitForTimeout(2500); }

/* ── the in-page mutations (CSS/DOM): L2, L7, L13 ── */
async function mutate(page: Page) {
  const m = own();
  if (!["2", "7", "13", "17", "18"].includes(m)) return;
  await page.evaluate((m) => {
    const css = (id: string, t: string) => { if (!document.getElementById(id)) { const s = document.createElement("style"); s.id = id; s.textContent = t; document.head.append(s); } };
    /* M2 the pencil placed in the flow on hover (it takes its own room) */
    if (m === "2") css("m2", ".qc152 .qc168-pen { display: none !important; } .qc152 [data-qc168-host]:hover .qc168-pen { display: grid !important; position: static !important; }");
    /* M7 the hover row of actions back, with its max-height rule */
    if (m === "7") {
      css("m7", ".qc152 .nx-acts.m7 { display: flex; gap: 14px; margin-top: 0; max-height: 0; opacity: 0; overflow: hidden; } .qc152 .nx-n:hover .nx-acts.m7 { margin-top: 8px; max-height: 30px; opacity: 1; }");
      document.querySelectorAll(".qc152 .nx-n").forEach((n) => { if (!n.querySelector(".m7")) { const d = document.createElement("div"); d.className = "nx-acts m7"; d.innerHTML = "<button type='button' class='nx-lk'>Pin to the top</button>"; n.append(d); } });
    }
    /* M13 one retired sheet loaded again */
    if (m === "13") css("m13", ".qc152 .qc152-ebar { display: flex; } .qc152 .qc152-edstrip { display: flex; }");
    /* M17 the step editor's chip words back in mono capitals */
    if (m === "17") css("m17", ".qc152 .qc1522-edit .qc152-mp { font-family: var(--sp-mono) !important; text-transform: uppercase !important; }");
    /* M18 the journeys' chip words back in mono capitals, as v152 drew them (9.5px) */
    if (m === "18") css("m18", ".qc152 .qc152-mp { font: 400 9.5px/1 var(--sp-mono) !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; }");
  }, m);
}

/** every part of the card, by its layout box summed up to the card (no bounding boxes: the panel leans); the pencils
 *  and ⋯ discs themselves are left out (they are the things that appear) */
async function layout(page: Page, root = CARD) {
  return page.evaluate((card) => {
    const top = document.querySelector<HTMLElement>(card)!;
    const pos = (e: HTMLElement) => { let x = 0, y = 0; for (let n: HTMLElement | null = e; n && n !== top; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; } return `${x},${y},${e.offsetWidth},${e.offsetHeight}`; };
    return [...top.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest(".qc168-pen") && !(e instanceof SVGElement) && !e.closest("svg") && e.offsetParent !== null)
      .map((e, i) => `${i}:${e.tagName}.${typeof e.className === "string" ? e.className.split(" ")[0] : ""}@${pos(e)}`);
  }, root);
}
const changed = (a: string[], b: string[]) => { const out: string[] = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) out.push(`${a[i]} → ${b[i]}`); return out; };

/* ══ L1 — no band pencil, no edit mode; ⋯ holds exactly the two items ═══════════════════════════════════════════════ */
if (run("1")) test("QC168-1 · no band pencil, no [data-editing]; the band's ⋯ holds exactly Move and Delete", async ({ page }) => {
  const L = new Ledger("L1");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  L.check("no pencil on the band", await page.locator(C("[data-qc152='band'] [data-qc152='pencil']")).count() === 0, String(await page.locator(C("[data-qc152='pencil']")).count()));
  L.check("no [data-editing] on or in the card", await page.locator(`${CARD}[data-editing], ${CARD} [data-editing]`).count() === 0, "");
  await page.locator(C("[data-qc168='band-more']")).click();
  const items = await page.locator(C("[data-qc168='band-menu'] [role='menuitem']")).allTextContents();
  L.check("⋯ holds exactly two items", items.length === 2, JSON.stringify(items));
  L.check("…Move to another agent, then Delete this query", items[0]?.trim() === "Move to another agent" && items[1]?.trim() === "Delete this query", JSON.stringify(items));
  const rust = await page.locator(C("[data-qc168='band-menu'] [data-act='delete']")).evaluate((e) => getComputedStyle(e).color);
  L.check("Delete this query is in rust words (--sp-rust)", rust === "rgb(122, 63, 49)", rust);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  /* one Escape cascade: the menu closes first, the card stays */
  L.check("Esc closes the ⋯ menu and leaves the card open", await page.locator(C("[data-qc168='band-menu']")).count() === 0 && await page.locator(CARD).count() === 1, "");
  L.done(6);
});

/* ══ L2 — hovering a bubble, a tile, a group and a note changes no size or position on the card ═════════════════════ */
if (run("2")) test("QC168-2 · hover changes no offset size or position (bubble, tile, group, note)", async ({ page }) => {
  const L = new Ledger("L2");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  const probe = async (what: string, sel: string) => {
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const before = await layout(page);
    const t = page.locator(C(sel)).first();
    L.check(`population: ${what} is drawn`, await t.count() === 1, sel);
    await t.hover(); await page.waitForTimeout(450);
    const pens = await page.locator(C("[data-qc168='pen']")).evaluateAll((ps) => ps.filter((p) => getComputedStyle(p).opacity === "1").length);
    const after = await layout(page);
    const d = changed(before, after);
    L.check(`${what}: its pencil shows on hover`, pens >= 1, String(pens));
    L.check(`${what}: nothing on the card moved or resized`, d.length === 0, d.slice(0, 4).join(" | "));
  };
  await probe("a bubble", `[data-qc152='thread'] > [data-qc152='msg'][data-activity='${ACT("freq")}']`);
  await tab(page, "agent"); await probe("a tile", "[data-qc167='tile'][data-k='reply']");
  await tab(page, "materials"); await probe("a group", ".nx-grp .nx-items[data-qc168-host]");
  await tab(page, "notes"); await probe("a note", `[data-qc158='note'][data-id='${ACT("n1")}']`);
  L.done(13);
});

/* ══ L3 — a step opens where its bubble was; the card's chrome stays; the tick waits for a change ═══════════════════ */
if (run("3")) test("QC168-3 · a step opens in place; band, ✕, tabs and footer stay; the tick is disabled until a change", async ({ page }) => {
  const L = new Ledger("L3");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  const at = await page.evaluate((s) => { const b = document.querySelector(s); return b ? [...b.parentElement!.children].indexOf(b) : -1; }, bubble("freq"));
  await openStep(page, "freq");
  const now = await page.evaluate(([th, i]) => { const t = document.querySelector(th as string)!; const e = t.children[i as number] as HTMLElement | undefined; return e?.dataset.qc1522 ?? e?.dataset.qc152 ?? "none"; }, [C("[data-qc152='thread']"), at] as const);
  L.check("the editor is where its bubble was (same place in the thread)", at >= 0 && now === "step-edit", `${at} → ${now}`);
  L.check("only the one step is open", await page.locator(STEP).count() === 1, "");
  for (const [w, s] of [["band", "[data-qc152='band']"], ["✕", "[data-qc149c='close']"], ["tabs", "[role='tablist']"], ["footer", "[data-qc152='reply']"], ["book", "[data-qc152='book']"]] as const) {
    const h = await page.locator(C(s)).first().evaluate((e) => (e as HTMLElement).offsetHeight).catch(() => 0);
    L.check(`the ${w} is still drawn`, h > 0, String(h));
  }
  L.check("the cross and the tick are in the editor's heading row", await page.locator(`${STEP} .qc1522-eh [data-qc168='cross']`).count() === 1 && await page.locator(`${STEP} .qc1522-eh [data-qc168='tick']`).count() === 1, "");
  L.check("the tick is disabled before a change", await page.locator(`${STEP} [data-qc168='tick']`).isDisabled(), "");
  await page.locator(`${STEP} [data-qc1522='edit-words']`).fill("Loved the opening. Please send the full when you can. QC168-L3");
  L.check("the tick is enabled after a change", await page.locator(`${STEP} [data-qc168='tick']`).isEnabled(), "");
  L.check("no native <select> anywhere on the card", await page.locator(C("select")).count() === 0, "");
  L.check("no 'Steps are edited one at a time' line", await page.locator(C("[data-qc152='track-note']")).count() === 0, "");
  await page.locator(`${STEP} [data-qc168='cross']`).click();
  L.check("the cross closed it", await page.locator(STEP).count() === 0, "");
  L.check("nothing was written", readDb().log[ACT("freq")]?.replyNote === "Loved the opening. Please send the full when you can.", JSON.stringify(readDb().log[ACT("freq")]?.replyNote));
  L.done(14);
});

/* ══ L4 — the cross with a change discards at once; Undo reopens it with what was typed ═════════════════════════════ */
if (run("4")) test("QC168-4 · the cross: 'Changes discarded', and Undo reopens the step with the typed words", async ({ page }) => {
  const L = new Ledger("L4");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await openStep(page, "freq");
  const typed = "Loved the opening. Please send the full when you can. QC168-L4 typed";
  await page.locator(`${STEP} [data-qc1522='edit-words']`).fill(typed);
  await page.locator(`${STEP} [data-qc168='cross']`).click();
  await page.waitForTimeout(400);
  L.check("the editor is gone", await page.locator(STEP).count() === 0, "");
  L.check("the toast says Changes discarded", await toastSays(page, "Changes discarded"), (await page.locator(TOAST).textContent().catch(() => "")) ?? "");
  L.check("the toast offers Undo", await page.locator(UNDO).count() === 1, "");
  await page.locator(UNDO).click(); await page.waitForTimeout(700);
  L.check("Undo reopened the step", await page.locator(STEP).count() === 1, "");
  const v = await page.locator(`${STEP} [data-qc1522='edit-words']`).inputValue().catch(() => "");
  L.check("…with the typed words", v === typed, JSON.stringify(v));
  L.check("…and the tick is enabled (it is a change)", await page.locator(`${STEP} [data-qc168='tick']`).isEnabled().catch(() => false), "");
  await page.locator(`${STEP} [data-qc168='cross']`).click().catch(() => {});
  L.check("nothing was written", readDb().log[ACT("freq")]?.replyNote === "Loved the opening. Please send the full when you can.", "");
  L.done(8);
});

/* ══ L5 — with a changed step, a tab click asks in the step and does not change tab; Discard then changes it ═══════ */
if (run("5")) test("QC168-5 · a changed step: Materials asks first; Discard then changes tab", async ({ page }) => {
  const L = new Ledger("L5");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await openStep(page, "freq");
  await page.locator(`${STEP} [data-qc1522='edit-words']`).fill("QC168-L5");
  await page.locator(C("[data-qc152='tab'][data-tab='materials']")).click(); await page.waitForTimeout(400);
  L.check("the tab is still Tracking", (await selected(page)) === "tracking", String(await selected(page)));
  L.check("the question shows in the step", await page.locator(`${STEP} [data-qc168='ask']`).count() === 1, "");
  L.check("…in its words", ((await page.locator(`${STEP} [data-qc168='ask']`).textContent().catch(() => "")) ?? "").includes("Discard your changes?"), "");
  await page.locator(`${STEP} [data-qc168='keep']`).click().catch(() => {});
  L.check("Keep editing keeps the step and the words", await page.locator(STEP).count() === 1 && (await page.locator(`${STEP} [data-qc1522='edit-words']`).inputValue().catch(() => "")) === "QC168-L5", "");
  await page.locator(C("[data-qc152='tab'][data-tab='materials']")).click(); await page.waitForTimeout(300);
  await page.locator(`${STEP} [data-qc168='discard']`).click().catch(() => {});
  await page.waitForTimeout(500);
  L.check("Discard: the tab is Materials", (await selected(page)) === "materials", String(await selected(page)));
  L.check("…and nothing was written", readDb().log[ACT("freq")]?.replyNote === "Loved the opening. Please send the full when you can.", "");
  L.done(7);
});

/* ══ L6 — Materials: open a group, remove one item, tick; the tab never changes; the step's materials read back ══════ */
if (run("6")) test("QC168-6 · Materials edits in the tab: remove one, tick, read back; Undo restores", async ({ page }) => {
  const L = new Ledger("L6");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  const was = JSON.stringify(readDb().log[ACT("sent")]?.materials);
  const wasAt = readDb().log[ACT("sent")]?.at;
  L.check("population: the query went with three things", (JSON.parse(was) as unknown[]).length === 3, was);
  await tab(page, "materials");
  const grp = page.locator(C("[data-qc158='group'][data-kind='query']"));
  await grp.locator(".nx-items").hover();
  await grp.locator("[data-qc168='pen']").click(); await page.waitForTimeout(400);
  L.check("open: the tab is still Materials", (await selected(page)) === "materials", String(await selected(page)));
  const ed = page.locator(C("[data-qc168='group-edit']"));
  L.check("the group is open in place with its three chips", await ed.count() === 1 && await ed.locator("[data-qc152='mat-chip']").count() === 3, String(await ed.locator("[data-qc152='mat-chip']").count()));
  L.check("the cross and the tick sit in the group's heading, in place of its date", await page.locator(C("[data-qc158='group'] h4 [data-qc168='ct']")).count() === 1 && await page.locator(C("[data-qc168-open-grp] [data-qc158='when']")).count() === 0, "");
  L.check("MatChips' own + Add is there", await ed.locator("[data-qc152='mat-add']").count() === 1, "");
  await ed.locator("[data-qc152='mat-x']").last().click(); await page.waitForTimeout(200);
  await page.locator(C("[data-qc168='tick']")).click();
  const saved = await toastSays(page, "Saved what went");
  L.check("the toast says Saved what went", saved, (await page.locator(TOAST).textContent().catch(() => "")) ?? "");
  L.check("saved: the tab is still Materials", (await selected(page)) === "materials", String(await selected(page)));
  const now = readDb().log[ACT("sent")];
  L.check("read back: the step went with two things", Array.isArray(now?.materials) && (now!.materials as unknown[]).length === 2, JSON.stringify(now?.materials));
  L.check("read back: its date is unchanged", !!now?.at && now?.at === wasAt, `${wasAt} → ${now?.at}`);
  if (saved) await undo(page);
  L.check("Undo put the three back exactly", JSON.stringify(readDb().log[ACT("sent")]?.materials) === was, JSON.stringify(readDb().log[ACT("sent")]?.materials));
  L.done(11);
});

/* ══ L7 — hovering a note leaves its height and the next note's top unchanged, on both cards ════════════════════════ */
async function noteHover(page: Page, L: Ledger, where: string, root: string) {
  const items = page.locator(`${root} [data-qc158='note'], ${root} [data-qc158='quote']`);
  const n = await items.count();
  L.check(`${where}: population: two entries or more`, n >= 2, String(n));
  const read = () => items.evaluateAll((es) => es.slice(0, 2).map((e) => `${(e as HTMLElement).offsetTop},${(e as HTMLElement).offsetHeight}`));
  await page.mouse.move(2, 2); await page.waitForTimeout(300);
  const a = await read();
  await items.first().hover(); await page.waitForTimeout(500);
  const b = await read();
  L.check(`${where}: the note's height is unchanged on hover`, a[0]?.split(",")[1] === b[0]?.split(",")[1], `${a[0]} → ${b[0]}`);
  L.check(`${where}: the next entry's top is unchanged`, a[1]?.split(",")[0] === b[1]?.split(",")[0], `${a[1]} → ${b[1]}`);
  L.check(`${where}: no hover row of actions`, await page.locator(`${root} .nx-acts`).count() === 0, "");
}
if (run("7")) test("QC168-7 · a note's hover moves nothing, on the query card and the agent card", async ({ page }) => {
  const L = new Ledger("L7");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "notes");
  await noteHover(page, L, "query card", CARD);
  await openAgentRow(page, VP, { id: "q168-ag-ava" });
  await page.locator(AC).first().waitFor({ timeout: 10_000 });
  await page.locator(`${AC} [data-cl262='tab'][data-tab='notes']`).click(); await page.waitForTimeout(500);
  await mutate(page);
  await noteHover(page, L, "agent card", AC);
  L.done(9);
});

/* ══ L8 — a note edited and a note deleted on the query card are read back; restored ═══════════════════════════════ */
if (run("8")) test("QC168-8 · a note edited (Undo) and a note deleted (restored by the seed), read back", async ({ page }) => {
  const L = new Ledger("L8");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "notes");
  const n1 = readDb().notes[ACT("n1")];
  await openNote(page, "n1");
  const box = page.locator(C("[data-qc168='note-edit'] textarea"));
  L.check("the note opened in place, its words in a field", await box.count() === 1 && (await box.inputValue()) === n1, "");
  L.check("…with Delete this note at its foot", await page.locator(C("[data-qc168='delete-note']")).count() === 1, "");
  await box.fill(`${n1} QC168-L8`);
  await page.locator(C("[data-qc168='note-edit'] [data-qc168='tick']")).click();
  const ok = await toastSays(page, "Saved that note");
  await page.waitForTimeout(800);
  L.check("read back: the note's new words", readDb().notes[ACT("n1")] === `${n1} QC168-L8`, JSON.stringify(readDb().notes[ACT("n1")]));
  if (ok) await undo(page);
  L.check("Undo wrote the old words back", readDb().notes[ACT("n1")] === n1, JSON.stringify(readDb().notes[ACT("n1")]));
  await openNote(page, "n2");
  await page.locator(C("[data-qc168='delete-note']")).click();
  L.check("Delete asks 'Delete this note?'", ((await page.locator(C("[data-qc168='delete-ask']")).textContent().catch(() => "")) ?? "").includes("Delete this note?"), "");
  await page.locator(C("[data-qc168='delete-ok']")).click();
  await page.waitForTimeout(1500);
  const gone = !(ACT("n2") in readDb().notes);
  L.check("read back: the note is deleted", gone, JSON.stringify(Object.keys(readDb().notes)));
  if (gone) seed("--restore-note n2");
  L.check("restored", readDb().notes[ACT("n2")] != null, "");
  L.done(8);
});

/* ══ L9 — opening a second pencil closes the first when unchanged: one editor at any time ═══════════════════════════ */
if (run("9")) test("QC168-9 · one thing open at a time", async ({ page }) => {
  const L = new Ledger("L9");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await openStep(page, "fsent"); await openStep(page, "freq");
  L.check("Tracking: one step editor, the second one", await page.locator(STEP).count() === 1 && await page.locator(`${STEP} [data-qc1522='edit-words']`).count() === 1, "");
  await page.locator(`${STEP} [data-qc168='cross']`).click();
  await tab(page, "notes");
  await openNote(page, "n1"); await openNote(page, "n2");
  const open = await page.locator(C("[data-qc168='note-edit']")).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.id));
  L.check("Notes: one note open, the second one", open.length === 1 && open[0] === ACT("n2"), JSON.stringify(open));
  L.check("anywhere on the card: one editor", await page.locator(C("[data-qc168='note-edit'], [data-qc1522='step-edit'], [data-qc168='group-edit']")).count() === 1, "");
  L.check("the other entries sit back (42%)", await page.locator(note("n1")).evaluate((e) => getComputedStyle(e).opacity) === "0.42", await page.locator(note("n1")).evaluate((e) => getComputedStyle(e).opacity));
  L.done(5);
});

/* ══ L10 — a changed profile drawer asks before Cancel loses it ═════════════════════════════════════════════════════ */
if (run("10")) test("QC168-10 · a changed profile drawer asks before Cancel", async ({ page }) => {
  const L = new Ledger("L10");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "agent");
  const before = readDb().ava?.responseTimeWeeks;
  await page.locator(C("[data-qc167='tile'][data-k='reply'] [data-qc168='pen']")).click();
  await page.locator(PROF).waitFor({ timeout: 10_000 });
  await page.locator(`${PROF} input.sa-wk-slider`).focus(); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
  L.check("population: the change made Save live", await page.locator(`${PROF} [data-qc167='save']`).isEnabled(), "");
  await page.locator(`${PROF} [data-qc167='cancel']`).click(); await page.waitForTimeout(300);
  L.check("Cancel with a change asks in the drawer's footer", await page.locator(`${PROF} [data-qc168='ask']`).count() === 1, "");
  L.check("…and the drawer is still open", await page.locator(PROF).count() === 1, "");
  await page.locator(`${PROF} [data-qc168='discard']`).click().catch(() => {}); await page.waitForTimeout(400);
  L.check("Discard closes it", await page.locator(PROF).count() === 0, "");
  L.check("nothing was written", readDb().ava?.responseTimeWeeks === before, `${before} → ${readDb().ava?.responseTimeWeeks}`);
  L.done(6);
});

/* ══ L11 — Move through ⋯: the query's agent read back, then put back ═══════════════════════════════════════════════ */
if (run("11")) test("QC168-11 · Move to another agent: read back, Undo puts it back", async ({ page }) => {
  const L = new Ledger("L11");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  L.check("population: the query is to Ava", readDb().agentId === "q168-ag-ava", String(readDb().agentId));
  await page.locator(C("[data-qc168='band-more']")).click();
  await page.locator(C("[data-qc168='band-menu'] [data-act='move']")).click();
  L.check("the list asks Who's this query to?", ((await page.locator(C("[data-qc168='move-menu']")).textContent().catch(() => "")) ?? "").includes("Who’s this query to?"), "");
  await page.locator(C("[data-qc168='move-menu'] [data-v='q168-ag-bram']")).click();
  const ok = await toastSays(page, "Moved to Bram Lark");
  L.check("the toast says Moved to Bram Lark", ok, (await page.locator(TOAST).textContent().catch(() => "")) ?? "");
  await page.waitForTimeout(800);
  L.check("read back: the query is to Bram", readDb().agentId === "q168-ag-bram", String(readDb().agentId));
  if (ok) await undo(page);
  L.check("Undo: the query is to Ava again", readDb().agentId === "q168-ag-ava", String(readDb().agentId));
  L.done(6);
});

/* ══ L12 — Delete through ⋯ reaches the existing confirm (not confirmed) ════════════════════════════════════════════ */
if (run("12")) test("QC168-12 · Delete this query reaches the existing confirm", async ({ page }) => {
  const L = new Ledger("L12");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await page.locator(C("[data-qc168='band-more']")).click();
  await page.locator(C("[data-qc168='band-menu'] [data-act='delete']")).click();
  const dlg = page.getByRole("dialog").filter({ hasText: "Delete this query?" });
  const shown = await dlg.first().waitFor({ timeout: 5000 }).then(() => true, () => false);
  L.check("the existing confirm opens", shown, "");
  L.check("…with its words: This can’t be undone", shown && ((await dlg.first().textContent()) ?? "").includes("This can’t be undone"), "");
  if (shown) await dlg.first().getByRole("button", { name: "Keep it" }).click().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(600);
  L.check("not confirmed: the query is still there", readDb().status === "Full Sent", String(readDb().status));
  L.done(4);
});

/* ══ L13 — no import of the retired parts; qcv152inplace.css not loaded ═════════════════════════════════════════════ */
if (run("13")) test("QC168-13 · the retired layer is neither imported nor loaded", async ({ page }) => {
  const L = new Ledger("L13");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(f)) files.push(p); } };
  walk("src");
  const hits = files.filter((f) => /QcCardEdit152|qcv152inplace|useEditLayer|NotesEditPane|\bEditStrip\b|\bSaveBar\b|\bLeaveAsk\b/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
  L.check("no source imports or names a retired part", hits.length === 0, hits.join(", "));
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  const rules = await page.evaluate(() => {
    let n = 0;
    for (const s of [...document.styleSheets]) { let rs: CSSRuleList | null = null; try { rs = s.cssRules; } catch { continue; } for (const r of [...rs]) if (/qc152-ebar|qc152-edstrip|qc152-trknote|qc152-leave\b|qc152-inl|qc152-notes-ed/.test(r.cssText)) n++; }
    return n;
  });
  L.check("no rule of qcv152inplace.css is loaded", rules === 0, String(rules));
  L.done(3);
});

/* ══ L14 — the keyboard: Tab reaches each pencil, Enter opens, Esc with a change asks, Cmd/Ctrl + Enter saves a note ═ */
if (run("14")) test("QC168-14 · keyboard: Tab, Enter, Esc, and Cmd/Ctrl + Enter on a note", async ({ page }) => {
  const L = new Ledger("L14");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  const tabTo = async (from: string, k: string) => {
    await page.locator(C(from)).focus();
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.qc168K ?? "");
      if (at) seen.push(at);
      if (at === k) return seen;
    }
    return seen;
  };
  const steps = await tabTo("[data-qc152='tab'][data-tab='tracking']", `step:${ACT("freq")}`);
  L.check("Tab reaches each step's pencil on the way", [ACT("sent"), ACT("freq")].every((a) => steps.includes(`step:${a}`)), JSON.stringify(steps));
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  L.check("Enter opens the step", await page.locator(STEP).count() === 1, "");
  await page.locator(`${STEP} [data-qc1522='edit-words']`).focus();
  await page.keyboard.type(" QC168-L14");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  L.check("Esc with a change asks", await page.locator(`${STEP} [data-qc168='ask']`).count() === 1, "");
  await page.locator(`${STEP} [data-qc168='discard']`).click().catch(() => {});
  await tab(page, "notes");
  await page.locator(note("n2")).hover(); await page.locator(`${note("n2")} [data-qc168='more']`).click(); await page.waitForTimeout(300);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  L.check("Esc with a note's ⋯ menu open closes the menu, not the card", await page.locator(C("[data-qc168='note-menu']")).count() === 0 && await page.locator(CARD).count() === 1, "");
  const n1 = readDb().notes[ACT("n1")];
  const ns = await tabTo("[data-qc152='tab'][data-tab='notes']", `note:${ACT("n1")}`);
  L.check("Tab reaches the note's pencil", ns.includes(`note:${ACT("n1")}`), JSON.stringify(ns));
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const box = page.locator(C("[data-qc168='note-edit'] textarea"));
  L.check("Enter opens the note, its field focused", await box.evaluate((e) => e === document.activeElement).catch(() => false), "");
  await page.keyboard.type(" kb");
  await page.keyboard.press("Control+Enter");
  const ok = await toastSays(page, "Saved that note");
  await page.waitForTimeout(800);
  L.check("Ctrl + Enter saved it (read back)", readDb().notes[ACT("n1")] === `${n1} kb`, JSON.stringify(readDb().notes[ACT("n1")]));
  if (ok) await undo(page);
  L.check("restored", readDb().notes[ACT("n1")] === n1, JSON.stringify(readDb().notes[ACT("n1")]));
  L.done(9);
});

/* ══ Query card v168.1 ══════════════════════════════════════════════════════════════════════════════════════════════ */
/* L15 — an open group draws one row per item, its label the reading row's, in the reading row's type; one × per row */
if (run("15")) test("QC168-15 · an open group is the tab's own rows", async ({ page }) => {
  const L = new Ledger("L15");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "materials");
  const grp = page.locator(C("[data-qc158='group'][data-kind='query']"));
  const read = await grp.locator("[data-qc158='item']").evaluateAll((ls) => ls.map((l) => { const cs = getComputedStyle(l); return { t: ((l.textContent ?? "").slice(0, (l.textContent ?? "").length - (l.querySelector(".r")?.textContent ?? "").length)).trim(), fam: cs.fontFamily, size: cs.fontSize }; }));
  L.check("population: the group reads three items", read.length === 3, JSON.stringify(read.map((r) => r.t)));
  await grp.locator(".nx-items").hover(); await grp.locator("[data-qc168='pen']").click(); await page.waitForTimeout(400);
  const rows = await page.locator(C("[data-qc168='group-edit'] [data-qc168='mat-row']")).evaluateAll((rs) => rs.map((r) => {
    const lab = r.querySelector<HTMLElement>("[data-qc168='mat-label']"); const cs = lab ? getComputedStyle(lab) : null;
    return { t: (lab?.textContent ?? "").trim(), fam: cs?.fontFamily ?? "", size: cs?.fontSize ?? "", up: cs?.textTransform ?? "", x: r.querySelectorAll(".qc168-mx").length };
  }));
  L.check("one row per item", rows.length === read.length, `${rows.length} rows for ${read.length} items`);
  L.check("each row's label is the reading row's", rows.length === read.length && rows.every((r, i) => r.t === read[i].t), JSON.stringify(rows.map((r) => r.t)));
  L.check("…in the same font family and size", rows.length > 0 && rows.every((r, i) => r.fam === read[i]?.fam && r.size === read[i]?.size), JSON.stringify(rows.map((r) => `${r.fam.slice(0, 20)} ${r.size}`)));
  L.check("…not upper-cased", rows.length > 0 && rows.every((r) => r.up !== "uppercase"), JSON.stringify(rows.map((r) => r.up)));
  L.check("one × per row", rows.length > 0 && rows.every((r) => r.x === 1), JSON.stringify(rows.map((r) => r.x)));
  L.check("a last '+ Add' row", ((await page.locator(C("[data-qc168='group-edit'] [data-qc168='add-row']")).textContent().catch(() => "")) ?? "").trim() === "+ Add", "");
  await page.locator(C("[data-qc168='cross']")).click();
  L.done(8);
});

/* L16 — no Materials row shows a detail equal to its label; the group's pencil overlaps no text in the group */
if (run("16")) test("QC168-16 · a row says its name once, and the pencil sits clear of the words", async ({ page }) => {
  const L = new Ledger("L16");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "materials");
  const r = await page.evaluate((card) => {
    const root = document.querySelector<HTMLElement>(card)!;
    const items = [...root.querySelectorAll<HTMLElement>("[data-qc158='group']:not([data-pending]) [data-qc158='item']")];
    const twice = items.filter((li) => { const d = li.querySelector(".r"); const all = li.textContent ?? ""; const lab = all.slice(0, all.length - (d?.textContent ?? "").length).trim(); return !!d && d.textContent!.trim().toLowerCase() === lab.toLowerCase(); }).map((li) => li.textContent);
    const overlaps: string[] = [];
    for (const ul of root.querySelectorAll<HTMLElement>(".nx-items[data-qc168-host]")) {
      const pen = ul.querySelector<HTMLElement>(":scope > [data-qc168='pen']")!.getBoundingClientRect();
      const w = document.createTreeWalker(ul, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        if (!(t.textContent ?? "").trim() || t.parentElement!.closest("[data-qc168='pen']")) continue;
        const rg = document.createRange(); rg.selectNodeContents(t); const b = rg.getBoundingClientRect();
        if (b.right > pen.left && b.left < pen.right && b.bottom > pen.top && b.top < pen.bottom) overlaps.push(t.textContent!.trim());
      }
    }
    return { rows: items.length, twice, overlaps };
  }, CARD);
  L.check("population: sent rows read", r.rows >= 3, String(r.rows));
  L.check("no row shows a detail equal to its label", r.twice.length === 0, JSON.stringify(r.twice));
  L.check("the pencil's box overlaps no text box in its group", r.overlaps.length === 0, JSON.stringify(r.overlaps));
  L.done(4);
});

/* L17 — an open step's material labels and "+ Add" are not mono and not upper-cased */
if (run("17")) test("QC168-17 · a step's chips speak in the serif, never mono capitals", async ({ page }) => {
  const L = new Ledger("L17");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await openStep(page, "sent");
  await mutate(page);
  const r = await page.locator(`${STEP} [data-qc152='mat-chip'], ${STEP} [data-qc152='mat-add']`).evaluateAll((es) => es.map((e) => { const cs = getComputedStyle(e); return { t: (e.textContent ?? "").trim(), fam: cs.fontFamily, up: cs.textTransform, px: parseFloat(cs.fontSize) }; }));
  L.check("population: the step's chips and + Add", r.length >= 4, JSON.stringify(r.map((x) => x.t)));
  L.check("not mono", r.length > 0 && r.every((x) => !/mono/i.test(x.fam)), JSON.stringify(r.map((x) => x.fam.slice(0, 24))));
  L.check("not upper-cased", r.length > 0 && r.every((x) => x.up !== "uppercase"), JSON.stringify(r.map((x) => x.up)));
  L.check("nothing under 12px", r.length > 0 && r.every((x) => x.px >= 12), JSON.stringify(r.map((x) => x.px)));
  await page.locator(`${STEP} [data-qc168='cross']`).click().catch(() => {});
  L.done(5);
});

/* L18 — v168.2: in each journey that draws materials (the composer's "send": Mark the partial / full / revision sent),
   no chip label or "+ Add" is mono, upper-cased or under 12px */
if (run("18")) test("QC168-18 · a journey's chips speak in the serif, never mono capitals", async ({ page }) => {
  const L = new Ledger("L18");
  await openQc(page);
  L.check("population: Bram's card opened (a partial asked for)", await openCard(page, RID), "");
  await press(page.locator(C("[data-qc152='reply-btn']")));
  const cp = C("[data-qc1522='composer'][data-j='send']");
  const open = await page.locator(cp).waitFor({ timeout: 10_000 }).then(() => true, () => false);
  L.check("population: the footer opened the send journey", open, (await page.locator(C("[data-qc1522='composer']")).getAttribute("data-j").catch(() => null)) ?? "none");
  if (open && !(await page.locator(`${cp} [data-qc152='mat-chip']`).count())) {
    await press(page.locator(`${cp} [data-qc152='mat-add']`));
    await press(page.locator("[data-qc152='mat-kind'][data-k='letter']"));
    await press(page.locator("[data-qc152='mat-done']")).catch(() => {});
  }
  await page.waitForTimeout(300);
  await mutate(page);
  const r = await page.locator(`${cp} [data-qc152='mat-chip'], ${cp} [data-qc152='mat-add']`).evaluateAll((es) => es.map((e) => { const cs = getComputedStyle(e); return { t: (e.textContent ?? "").trim(), fam: cs.fontFamily, up: cs.textTransform, px: parseFloat(cs.fontSize) }; }));
  L.check("population: a chip and + Add", r.length >= 2 && r.some((x) => x.t === "+ Add"), JSON.stringify(r.map((x) => x.t)));
  L.check("not mono", r.length > 0 && r.every((x) => !/mono/i.test(x.fam)), JSON.stringify(r.map((x) => x.fam.slice(0, 24))));
  L.check("not upper-cased", r.length > 0 && r.every((x) => x.up !== "uppercase"), JSON.stringify(r.map((x) => x.up)));
  L.check("nothing under 12px", r.length > 0 && r.every((x) => x.px >= 12), JSON.stringify(r.map((x) => x.px)));
  L.check("the words are sentence case", r.length > 0 && r.every((x) => x.t === "+ Add" || /^[^a-z]*[A-Z0-9][^A-Z]*$/.test(x.t.replace(/ · .*$/, ""))), JSON.stringify(r.map((x) => x.t)));
  /* leave: nothing saved (Cancel, then Discard when it asks) */
  await press(page.locator(`${cp} [data-qc1522='cancel']`)).catch(() => {});
  await page.waitForTimeout(300);
  if (await page.locator(C("[data-qc1522='discard']")).count()) await press(page.locator(C("[data-qc1522='discard']")));
  L.check("left without a write (the journey is closed)", await page.locator(cp).count() === 0, "");
  L.done(7);
});

/* L19 — v168.2: a step's recorded material says its name once: no chip's detail is its label, so a bubble's tip shows the
   label alone (no head over an empty line, no name said twice) */
if (run("19")) test("QC168-19 · a material's name is said once, in the bubble's tip", async ({ page }) => {
  const L = new Ledger("L19");
  await openQc(page);
  L.check("population: the card opened", await openCard(page), "");
  await tab(page, "tracking");
  const chips = page.locator(`${bubble("sent")} [data-qc152='chip'], ${bubble("fsent")} [data-qc152='chip']`);
  const n = await chips.count();
  L.check("population: the sent steps' materials (letter, synopsis, sample; the full)", n >= 4, String(n));
  const got: { label: string; tip: string; head: string | null; body: string }[] = [];
  for (let i = 0; i < n; i++) {
    const c = chips.nth(i);
    const label = ((await c.textContent()) ?? "").trim();
    await c.scrollIntoViewIfNeeded(); await press(c); await page.waitForTimeout(250);
    const t = await page.locator("[data-qc152='tip']").first().evaluate((e) => {
      const b = e.querySelector("b");
      const head = b ? (b.textContent ?? "") : null;
      const all = (e.textContent ?? "");
      return { tip: all.trim(), head, body: (head === null ? all : all.slice(head.length)).trim() };
    }).catch(() => ({ tip: "", head: null, body: "" }));
    got.push({ label, ...t });
    /* the tip closes on the chip's blur (a click outside the panel would close the card) */
    await c.evaluate((e) => (e as HTMLElement).blur()); await page.waitForTimeout(150);
  }
  L.check("every tip opens", got.length > 0 && got.every((g) => g.tip !== ""), JSON.stringify(got.map((g) => g.tip)));
  L.check("each tip shows the label", got.length > 0 && got.every((g) => g.tip.includes(g.label)), JSON.stringify(got));
  L.check("…once (the detail is not the label again)", got.length > 0 && got.every((g) => g.tip.split(g.label).length - 1 === 1), JSON.stringify(got.map((g) => g.tip)));
  L.check("no head over an empty line", got.length > 0 && got.every((g) => g.head === null || g.body !== ""), JSON.stringify(got.map((g) => [g.head, g.body])));
  L.done(6);
});

/* ══ F — the frames: a step open, a group open, a note open, the ⋯ menu, the move list, a why-tip, the toast ══════════ */
async function frames(page: Page, eng: string) {
  domClick = eng === "webkit";
  const clip = () => page.evaluate((s) => { const r = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: Math.min(window.innerWidth - Math.max(0, r.left - 20), r.width + 40), height: Math.min(window.innerHeight - Math.max(0, r.top - 20), r.height + 40) }; }, CARD);
  const shot = async (name: string) => { await page.waitForTimeout(450); await page.screenshot({ path: `${DIR}/frames/${eng}-1512-${name}.png`, clip: await clip() }); };
  await openQc(page);
  await openCard(page);
  await shot("reading");
  await over(page.locator(bubble("freq"))); if (!domClick) await shot("tracking-hover");
  await openStep(page, "freq"); await shot("step-open");
  await page.locator(`${STEP} [data-qc1522='edit-words']`).fill("Loved the opening. Please send the full when you can. (draft)");
  await press(page.locator(C("[data-qc152='tab'][data-tab='notes']"))); await shot("step-asks");
  await press(page.locator(`${STEP} [data-qc168='discard']`)).catch(() => {});
  await tab(page, "materials");
  await over(page.locator(C("[data-qc158='group'][data-kind='query'] .nx-items"))); if (!domClick) await shot("materials-hover");
  await press(page.locator(C("[data-qc158='group'][data-kind='query'] [data-qc168='pen']"))); await shot("group-open");
  await press(page.locator(C("[data-qc168='cross']")));
  await tab(page, "notes");
  await over(page.locator(note("n1"))); if (!domClick) await shot("notes-hover");
  await press(page.locator(`${note("n1")} [data-qc168='more']`)); await shot("note-menu");
  await page.keyboard.press("Escape");
  await openNote(page, "n1"); await shot("note-open");
  await press(page.locator(C("[data-qc168='note-edit'] [data-qc168='cross']")));
  await tab(page, "agent");
  await over(page.locator(C("[data-qc167='tile'][data-k='heard']"))); await page.waitForTimeout(500); if (!domClick) await shot("why-last-heard");
  await page.mouse.move(2, 2);
  await press(page.locator(C("[data-qc168='band-more']"))); await shot("band-menu");
  await press(page.locator(C("[data-qc168='band-menu'] [data-act='move']"))); await shot("move-list");
  await page.keyboard.press("Escape");
  await tab(page, "tracking");
  await openStep(page, "freq");
  await page.locator(`${STEP} [data-qc1522='edit-words']`).fill("discard me");
  await press(page.locator(`${STEP} [data-qc168='cross']`)); await shot("toast-discarded");
  domClick = false;
}
if (run("F")) test("QC168-F · frames, Chromium and WebKit", async ({ page, baseURL }) => {
  test.setTimeout(1_200_000);
  await frames(page, "chromium");
  const b = await webkit.launch();
  try {
    const ctx = await b.newContext({ baseURL: baseURL ?? process.env.SA_E2E_BASE_URL, viewport: VP });
    /* ⚠️ A LAUNCHED CONTEXT HAS NO ACTION TIMEOUT, and desktop WebKit cannot click the harness's Sign in: sign in with
       Enter first (tests/e2e/pc3.measure.ts PC3-W) */
    ctx.setDefaultTimeout(45_000);
    const p = await ctx.newPage();
    const pw = process.env.SA_E2E_PASSWORD ?? (/^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/m.exec(readFileSync(".env.local", "utf8"))?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
    await p.locator("#au-pw").fill(pw);
    await p.locator("#au-pw").press("Enter");
    await p.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "attached", timeout: 60_000 });
    await frames(p, "webkit");
  } finally { await b.close(); }
});

/* F2 — v168.2 frames (Chromium): one journey's chips (Mark the partial sent) */
if (run("F2")) test("QC168-F2 · a journey's chips, framed", async ({ page }) => {
  await openQc(page);
  await openCard(page, RID);
  await page.locator(C("[data-qc152='reply-btn']")).click();
  const cp = C("[data-qc1522='composer'][data-j='send']");
  await page.locator(cp).waitFor({ timeout: 10_000 });
  if (!(await page.locator(`${cp} [data-qc152='mat-chip']`).count())) {
    await page.locator(`${cp} [data-qc152='mat-add']`).click();
    await page.locator("[data-qc152='mat-kind'][data-k='letter']").click();
    await page.locator("[data-qc152='mat-done']").click().catch(() => {});
  }
  await page.waitForTimeout(500);
  const r = await page.evaluate((s) => { const e = document.querySelector<HTMLElement>(s)!.closest<HTMLElement>(".spanel")!.getBoundingClientRect(); return { x: Math.max(0, e.left - 20), y: Math.max(0, e.top - 20), width: Math.min(window.innerWidth - Math.max(0, e.left - 20), e.width + 40), height: Math.min(window.innerHeight - Math.max(0, e.top - 20), e.height + 40) }; }, CARD);
  await page.screenshot({ path: `${DIR}/frames/chromium-1512-journey-send-chips.png`, clip: r });
  await page.locator(`${cp} [data-qc1522='cancel']`).click().catch(() => {});
  if (await page.locator(C("[data-qc1522='discard']")).count()) await page.locator(C("[data-qc1522='discard']")).click();
});

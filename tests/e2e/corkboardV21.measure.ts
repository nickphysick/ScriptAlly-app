/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v2.1 — CB15 to CB21 (ref design-refs/corkboard-v14/), on the emulator build at 1512 × 982 and 1280 × 800
 * (CB21 also at 390). The fixtures are seedCorkboardV2.mjs: `seed` (the v2 board, 13 notes) and `few` (three notes,
 * one pile). Every case starts from a fixture it seeds and the file puts the account back afterwards.
 *
 *   npm run e2e:emu -- tests/e2e/corkboardV21.measure.ts --project=measure
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, Ledger, PAGE, PREFIX, ROOT_FN, ROUTE, SIZES, only, open, openPhone, seeder, sz } from "./cb2Lib";

const SNAP = `${DIR}/prefs-v21.json`;
const TAG = (l: string) => `${PREFIX}tag-${l}`;
const last = (out: string) => out.trim().split("\n").pop()!;
const task = (tid: string) => JSON.parse(last(seeder("task", tid)));
const prefs = () => JSON.parse(last(seeder("prefs"))) as { started?: string[] } | null;
const defs = () => JSON.parse(last(seeder("tagdefs"))) as { id: string; label: string }[];
const DLG = '[data-cb2="start-pile"]';

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seeder("snap", SNAP); });
test.afterAll(() => { seeder("clean"); seeder("restore", SNAP); });

async function setView(page: Page, v: "board" | "piles") {
  await page.locator(`${PAGE} [data-view="${v}"]`).click();
  await page.waitForTimeout(700);
}
async function toast(page: Page) {
  return (await page.locator(".tdb-toast").first().textContent({ timeout: 6000 }).catch(() => "")) ?? "";
}
async function undo(page: Page) {
  await page.locator(".tdb-toast .tdb-toast-act", { hasText: "Undo" }).click();
  await page.waitForTimeout(1500);
}
const ticked = (page: Page) => page.evaluate((sel) => [...document.querySelectorAll<HTMLInputElement>(`${sel} [data-pick] input`)].filter((i) => i.checked).map((i) => i.closest("[data-pick]")!.getAttribute("data-pick")), DLG);
const listed = (page: Page) => page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-pick]`)].map((e) => e.getAttribute("data-pick")), DLG);

test("CB15 new-note tile: the wall's last child, a post-it's size, opens the note pop-up, gone while filtered", async ({ page }) => {
  const L = new Ledger("CB15");
  seeder("seed");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    await setView(page, "board");
    const m = await page.evaluate((ROOT) => {
      const root = (0, eval)(ROOT) as HTMLElement;
      const wall = root.querySelector<HTMLElement>('[data-cb2="wall"]')!;
      const kids = [...wall.children] as HTMLElement[];
      const g = wall.querySelector<HTMLElement>('[data-cb2="ghost-new"]');
      const notes = kids.filter((k) => k.hasAttribute("data-cb2-note"));
      const gr = g?.getBoundingClientRect();
      const row = gr ? notes.filter((n) => Math.abs(n.getBoundingClientRect().top - gr.top) < 1) : [];
      return {
        lastIsGhost: kids[kids.length - 1] === g && !!g,
        gw: gr?.width ?? 0, gh: gr?.height ?? 0,
        nw: notes[0]?.getBoundingClientRect().width ?? 0,
        rowH: row.length ? row[0].getBoundingClientRect().height : null,
      };
    }, ROOT_FN);
    L.check("CB15", `${sz(vp)} last child`, m.lastIsGhost, `last child is the ghost: ${m.lastIsGhost}`);
    L.check("CB15", `${sz(vp)} width`, Math.abs(m.gw - m.nw) <= 1, `ghost ${m.gw} vs post-it ${m.nw}`);
    const wantH = m.rowH ?? 232;
    L.check("CB15", `${sz(vp)} height`, Math.abs(m.gh - wantH) <= 1, `ghost ${m.gh} vs ${m.rowH === null ? "a post-it's 232 floor" : "its row's post-it"} ${wantH}`);
    await page.locator(`${PAGE} [data-cb2="ghost-new"]`).click();
    const opened = await page.locator('[data-cb2="note-dialog"]').isVisible({ timeout: 4000 }).catch(() => false);
    L.check("CB15", `${sz(vp)} opens`, opened, `the note pop-up ${opened ? "opened" : "did not open"}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    /* filtered three ways: find, a tag pill, an At a glance row */
    await page.locator(`${PAGE} input[data-cb2="find"]`).fill("synopsis");
    await page.waitForTimeout(500);
    L.check("CB15", `${sz(vp)} find`, (await page.locator(`${PAGE} [data-cb2="ghost-new"]`).count()) === 0, "the ghost shows while find narrows the wall");
    await page.locator(`${PAGE} input[data-cb2="find"]`).fill("");
    await page.locator(`${PAGE} [data-chip="${TAG("strategy")}"]`).click();
    await page.waitForTimeout(500);
    L.check("CB15", `${sz(vp)} tag pill`, (await page.locator(`${PAGE} [data-cb2="ghost-new"]`).count()) === 0, "the ghost shows while a tag pill narrows the wall");
    await page.locator(`${PAGE} [data-chip="${TAG("strategy")}"]`).click();
    await page.locator('.cb2:visible [data-glance="linked"]').click();
    await page.waitForTimeout(500);
    L.check("CB15", `${sz(vp)} glance`, (await page.locator(`${PAGE} [data-cb2="ghost-new"]`).count()) === 0, "the ghost shows while a glance row narrows the wall");
    await page.locator('.cb2:visible [data-glance="linked"]').click();
  }
  L.done(14);
});

test("CB16 start-pile doors: the heading button, the dashed tile and the menu's New pile…; the menu ticks its note", async ({ page }) => {
  const L = new Ledger("CB16");
  seeder("seed");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    for (const door of ["start-pile-btn", "ghost-pile"]) {
      await page.locator(`${PAGE} [data-cb2="${door}"]`).click();
      const ok = await page.locator(DLG).isVisible({ timeout: 4000 }).catch(() => false);
      L.check("CB16", `${sz(vp)} ${door}`, ok, `the pop-up ${ok ? "opened" : "did not open"}`);
      L.check("CB16", `${sz(vp)} ${door} nothing ticked`, (await ticked(page)).length === 0, `ticked ${JSON.stringify(await ticked(page))}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    /* the menu: open a pile, then a note's ⋯ */
    await page.locator(`${PAGE} [data-pile="${TAG("agents")}"]`).click();
    await page.waitForTimeout(500);
    const nid = await page.locator(`${PAGE} [data-cb2-note]`).first().getAttribute("data-cb2-note");
    await page.locator(`${PAGE} [data-cb2-note="${nid}"]`).hover();
    await page.locator(`${PAGE} [data-cb2-note="${nid}"] [data-cb2="more"]`).click();
    await page.locator('[data-cb2="menu"] [data-act="newpile"]').click();
    const ok = await page.locator(DLG).isVisible({ timeout: 4000 }).catch(() => false);
    L.check("CB16", `${sz(vp)} menu`, ok, `the pop-up ${ok ? "opened" : "did not open"} from New pile…`);
    const t = await ticked(page);
    L.check("CB16", `${sz(vp)} menu pre-tick`, t.length === 1 && t[0] === nid, `ticked ${JSON.stringify(t)} (want ${nid})`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  L.done(12);
});

test("CB17 start writes: #agents with two ticked sets agents first, keeps the rest, mints the def; Undo restores", async ({ page }) => {
  const L = new Ledger("CB17");
  await only(page);
  for (const vp of SIZES) {
    seeder("few");
    seeder("droptag", "agents");
    const beforeF1 = task(`${PREFIX}f1`).tags ?? [];
    const beforeF3 = task(`${PREFIX}f3`).tags ?? [];
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
    await page.locator(`${DLG} [data-cb2="pile-name-in"]`).fill("agents");
    for (const n of ["f1", "f3"]) await page.locator(`${DLG} [data-pick="${PREFIX}${n}"] input`).check();
    const chosen = (await page.locator(`${DLG} [data-cb2="chosen"]`).textContent()) ?? "";
    L.check("CB17", `${sz(vp)} chosen`, chosen.trim() === "2 notes chosen", `"${chosen}"`);
    await page.locator(`${DLG} [data-cb2="start-save"]`).click();
    await page.waitForTimeout(1500);
    const msg = await toast(page);
    L.check("CB17", `${sz(vp)} toast`, msg.includes("Started #agents with 2 notes"), `toast "${msg}"`);
    const def = defs().find((d) => d.label === "agents");
    L.check("CB17", `${sz(vp)} minted`, !!def && def.id.startsWith("tag-"), `def ${JSON.stringify(def)} (newTag ids start "tag-")`);
    const f1 = task(`${PREFIX}f1`).tags ?? [];
    const f3 = task(`${PREFIX}f3`).tags ?? [];
    L.check("CB17", `${sz(vp)} f1`, !!def && JSON.stringify(f1) === JSON.stringify([def.id]), `f1 ${JSON.stringify(f1)}`);
    L.check("CB17", `${sz(vp)} f3 keeps the rest`, !!def && JSON.stringify(f3) === JSON.stringify([def.id, ...beforeF3.slice(1)]), `f3 ${JSON.stringify(f3)} (was ${JSON.stringify(beforeF3)})`);
    const opened = await page.locator(`${PAGE} [data-cb2="pile-open"]`).isVisible().catch(() => false);
    L.check("CB17", `${sz(vp)} opens the pile`, opened, `the new pile ${opened ? "is open" : "is not open"}`);
    await undo(page);
    L.check("CB17", `${sz(vp)} undo f1`, JSON.stringify(task(`${PREFIX}f1`).tags ?? []) === JSON.stringify(beforeF1), `f1 ${JSON.stringify(task(`${PREFIX}f1`).tags ?? [])}`);
    L.check("CB17", `${sz(vp)} undo f3`, JSON.stringify(task(`${PREFIX}f3`).tags ?? []) === JSON.stringify(beforeF3), `f3 ${JSON.stringify(task(`${PREFIX}f3`).tags ?? [])}`);
  }
  seeder("droptag", "agents");
  L.done(16);
});

test("CB18 empty pile: started with none ticked it is listed empty; a note drops it off the list; Remove keeps a def in use", async ({ page }) => {
  const L = new Ledger("CB18");
  await only(page);
  for (const vp of SIZES) {
    seeder("few");
    seeder("droptag", "ideas");
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
    await page.locator(`${DLG} [data-cb2="pile-name-in"]`).fill("ideas");
    await page.locator(`${DLG} [data-cb2="start-save"]`).click();
    await page.waitForTimeout(1500);
    const msg = await toast(page);
    L.check("CB18", `${sz(vp)} toast`, msg.includes("Started #ideas") && !msg.includes("with"), `toast "${msg}"`);
    const def = defs().find((d) => d.label === "ideas");
    L.check("CB18", `${sz(vp)} started`, !!def && (prefs()?.started ?? []).includes(def.id), `started ${JSON.stringify(prefs()?.started)} def ${def?.id}`);
    L.check("CB18", `${sz(vp)} empty panel`, await page.locator(`${PAGE} [data-cb2="pile-empty"]`).isVisible().catch(() => false), "the open empty pile shows no dashed panel");
    await page.locator(`${PAGE} [data-cb2="all-piles"]`).click();
    await page.waitForTimeout(500);
    const dashed = def ? await page.locator(`${PAGE} [data-pile="${def.id}"] [data-cb2="empty-stack"]`).count() : 0;
    L.check("CB18", `${sz(vp)} listed empty`, dashed === 1, `the empty pile's dashed stack: ${dashed}`);
    /* a note goes in: the pile drops off the started list */
    await page.locator(`${PAGE} [data-pile="${def?.id}"]`).click();
    await page.locator(`${PAGE} [data-cb2="add-notes"]`).click();
    await page.locator(`${DLG} [data-pick="${PREFIX}f1"] input`).check();
    await page.locator(`${DLG} [data-cb2="start-save"]`).click();
    await page.waitForTimeout(2500);
    L.check("CB18", `${sz(vp)} drops off`, !!def && !(prefs()?.started ?? []).includes(def.id), `started ${JSON.stringify(prefs()?.started)}`);
    /* Remove pile on a started pile whose def another note uses (f3 carries "strategy" as its second tag) */
    seeder("started", "strategy");
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    await page.locator(`${PAGE} [data-pile="${TAG("strategy")}"]`).click();
    await page.waitForTimeout(500);
    await page.locator(`${PAGE} [data-cb2="remove-pile"]`).click();
    await page.waitForTimeout(1500);
    L.check("CB18", `${sz(vp)} removed from list`, !(prefs()?.started ?? []).includes(TAG("strategy")), `started ${JSON.stringify(prefs()?.started)}`);
    L.check("CB18", `${sz(vp)} def kept`, defs().some((d) => d.id === TAG("strategy")), "the strategy def was deleted");
    L.check("CB18", `${sz(vp)} f3 untouched`, JSON.stringify(task(`${PREFIX}f3`).tags) === JSON.stringify([TAG("calls"), TAG("strategy")]), `f3 ${JSON.stringify(task(`${PREFIX}f3`).tags)}`);
  }
  seeder("droptag", "ideas");
  L.done(16);
});

test("CB19 add notes: the list leaves out the pile's own notes; adding moves them, with Undo", async ({ page }) => {
  const L = new Ledger("CB19");
  await only(page);
  for (const vp of SIZES) {
    seeder("seed");
    const before = task(`${PREFIX}n12`).tags ?? [];
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    await page.locator(`${PAGE} [data-pile="${TAG("agents")}"]`).click();
    await page.waitForTimeout(500);
    await page.locator(`${PAGE} [data-cb2="add-notes"]`).click();
    const h = (await page.locator(`${DLG} h2`).textContent()) ?? "";
    L.check("CB19", `${sz(vp)} title`, h === "Add notes to #agents", `"${h}"`);
    const ids = await listed(page);
    const own = [`${PREFIX}n2`, `${PREFIX}n4`];
    L.check("CB19", `${sz(vp)} excludes`, ids.length === 11 && own.every((o) => !ids.includes(o)), `${ids.length} listed; own ${own.filter((o) => ids.includes(o)).join(", ") || "none"}`);
    await page.locator(`${DLG} [data-pick="${PREFIX}n12"] input`).check();
    await page.locator(`${DLG} [data-cb2="start-save"]`).click();
    await page.waitForTimeout(1500);
    const msg = await toast(page);
    L.check("CB19", `${sz(vp)} toast`, msg.includes("Added 1 note to #agents"), `toast "${msg}"`);
    const after = task(`${PREFIX}n12`).tags ?? [];
    L.check("CB19", `${sz(vp)} moved`, after[0] === TAG("agents") && JSON.stringify(after.slice(1)) === JSON.stringify(before.slice(1)), `n12 ${JSON.stringify(after)} (was ${JSON.stringify(before)})`);
    await undo(page);
    L.check("CB19", `${sz(vp)} undo`, JSON.stringify(task(`${PREFIX}n12`).tags ?? []) === JSON.stringify(before), `n12 ${JSON.stringify(task(`${PREFIX}n12`).tags ?? [])}`);
  }
  L.done(10);
});

test("CB20 clash: an existing pile's name disables the button and shows the clash line", async ({ page }) => {
  const L = new Ledger("CB20");
  seeder("seed");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    await setView(page, "piles");
    await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
    const sugg = await page.locator(`${DLG} [data-sugg]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-sugg")));
    L.check("CB20", `${sz(vp)} suggestions`, sugg.length <= 6 && !sugg.includes("agents") && !sugg.includes("synopsis") && !sugg.includes("comps"), `suggested ${sugg.join(", ")}`);
    await page.locator(`${DLG} [data-cb2="pile-name-in"]`).fill("#Agents");
    const clash = await page.locator(`${DLG} [data-cb2="clash"]`).textContent().catch(() => null);
    L.check("CB20", `${sz(vp)} clash line`, clash === "There’s already a pile with that name.", `clash "${clash}"`);
    L.check("CB20", `${sz(vp)} disabled`, await page.locator(`${DLG} [data-cb2="start-save"]`).isDisabled(), "the button is enabled on a clash");
    await page.locator(`${DLG} [data-cb2="pile-name-in"]`).fill("agents-new");
    L.check("CB20", `${sz(vp)} clear`, (await page.locator(`${DLG} [data-cb2="clash"]`).count()) === 0 && await page.locator(`${DLG} [data-cb2="start-save"]`).isEnabled(), "a fresh name still clashes or stays disabled");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  L.done(8);
});

test("CB21 no overflow: 1280 and 390, the pop-up open and closed", async ({ page }) => {
  const L = new Ledger("CB21");
  seeder("seed");
  await only(page);
  const measure = () => page.evaluate((sel) => {
    const d = document.querySelector<HTMLElement>(`${sel} [role="dialog"]`);
    const r = d?.getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, dl: r ? r.left : 0, dr: r ? r.right : 0 };
  }, DLG);
  for (const [label, go] of [
    ["1280", async () => { await open(page, ROUTE, SIZES[1]); }],
    ["390", async () => { await openPhone(page, ROUTE); }],
  ] as const) {
    await go();
    await setView(page, "piles");
    const closed = await measure();
    L.check("CB21", `${label} closed`, closed.sw <= closed.iw, `scrollWidth ${closed.sw} / ${closed.iw}`);
    await page.locator(`${PAGE} [data-cb2="start-pile-btn"]`).click();
    await page.waitForTimeout(400);
    const m = await measure();
    L.check("CB21", `${label} open`, m.sw <= m.iw && m.dl >= 0 && m.dr <= m.iw, `scrollWidth ${m.sw} / ${m.iw}; dialog ${m.dl}–${m.dr}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await setView(page, "board");
  }
  L.done(4);
});

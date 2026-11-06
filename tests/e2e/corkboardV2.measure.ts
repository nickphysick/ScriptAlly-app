/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CORKBOARD v2 — the locks, CB1–CB14 (ref design-refs/corkboard-v13/), on the rendered page at 1512 × 982 and
 * 1280 × 800 (CB12 at 390). The fixture is seedCorkboardV2.mjs (`cb2seed-`), seeded and cleaned in the same run;
 * every lock that writes puts the account back before it ends. `CB2_MUTATE=<lock>` names the mutation a run was
 * built with (cb2Mutate.mjs), so its ledger is kept apart.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DIR, Ledger, PAGE, PREFIX, ROOT_FN, ROUTE, SIZES, near, only, open, openPhone, readWall, rgbOf, seeder, sz, writesDuring } from "./cb2Lib";
import { openRoute } from "./measure";

const SNAP = `${DIR}/prefs-locks.json`;
const PAPERS: Record<string, string> = { butter: "#faf0cf", blush: "#f5e2d8", powder: "#e2e7ef", sand: "#f0e5d4", stone: "#ece8e3" };
const task = (id: string) => JSON.parse(seeder("task", id).trim().split("\n").pop()!);
const id = (n: number) => `${PREFIX}n${n}`;
const LINKED = [id(2), id(3), id(4), id(9)];

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seeder("snap", SNAP); seeder("seed"); });
test.afterAll(() => { seeder("clean"); seeder("deltext", "CB2 PROBE"); seeder("restore", SNAP); });

async function setSort(page: Page, label: string) {
  await page.locator(`${PAGE} [data-cb2="sort"]`).click();
  await page.locator(`${PAGE} [data-cb2="sort-pop"] .cb2-opt`, { hasText: label }).click();
  await page.waitForTimeout(700);
}
async function setView(page: Page, v: "board" | "piles") {
  await page.locator(`${PAGE} [data-view="${v}"]`).click();
  await page.waitForTimeout(700);
}

test("CB1 colours: the five papers, and the old three mapped when read with no write on load", async ({ page }) => {
  const L = new Ledger("CB1");
  seeder("legacy");
  await only(page);
  for (const vp of SIZES) {
    const writes = await writesDuring(page, async () => { await open(page, ROUTE, vp); }, 2500);
    const wall = await readWall(page);
    const seeded: Record<string, string> = { [id(1)]: "butter", [id(3)]: "blush", [id(2)]: "powder", [id(5)]: "sand", [id(12)]: "stone" };
    for (const [nid, c] of Object.entries(seeded)) {
      const n = wall.find((w) => w.id === nid);
      L.check("CB1", `${sz(vp)} ${c}`, n?.bg === rgbOf(PAPERS[c]), `${nid} paints ${n?.bg} (want ${rgbOf(PAPERS[c])})`);
    }
    for (const [old, now] of [["old1", "butter"], ["old2", "blush"], ["old3", "powder"]] as const) {
      const n = wall.find((w) => w.id === `${PREFIX}${old}`);
      L.check("CB1", `${sz(vp)} legacy ${old}`, n?.bg === rgbOf(PAPERS[now]), `${old} paints ${n?.bg} (want ${now})`);
    }
    const mine = writes.filter((w) => w.doc.includes("/tasks/"));
    L.check("CB1", `${sz(vp)} no write on load`, mine.length === 0, `${mine.length} task write(s) on load: ${JSON.stringify(mine.slice(0, 3))}`);
  }
  for (const old of ["old1", "old2", "old3"]) {
    const t = task(`${PREFIX}${old}`);
    L.check("CB1", `stored ${old}`, ["yellow", "pink", "sage"].includes(t.colour), `the document still says ${t.colour}`);
  }
  seeder("deltext", "An old ");
  L.done(19);
});

test("CB2 header: the Contact list's panel, the counts, and no zero glance row", async ({ page }) => {
  const L = new Ledger("CB2");
  await only(page);
  for (const vp of SIZES) {
    await openRoute(page, "/agents", vp);
    await page.waitForTimeout(800);
    const cl = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>(".cl26-panel")].find((e) => e.getBoundingClientRect().width > 0);
      const w = document.querySelector<HTMLElement>(".ws-window")!.getBoundingClientRect();
      if (!p) return null;
      const r = p.getBoundingClientRect(); const cs = getComputedStyle(p);
      return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, l: r.left - w.left, r: w.right - r.right };
    });
    await open(page, ROUTE, vp);
    const cb = await page.evaluate((ROOT) => {
      const p = ((0, eval)(ROOT) as HTMLElement).querySelector<HTMLElement>('[data-cb2="panel"]');
      const w = document.querySelector<HTMLElement>(".ws-window")!.getBoundingClientRect();
      if (!p) return null;
      const r = p.getBoundingClientRect(); const cs = getComputedStyle(p);
      const title = p.querySelector("h1")?.textContent?.trim();
      const sentence = p.querySelector('[data-cb2="sentence"]')?.textContent?.trim();
      return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, l: r.left - w.left, r: w.right - r.right, title, sentence };
    }, ROOT_FN);
    const where = sz(vp);
    L.check("CB2", where, !!cl && !!cb, `both panels found (contact ${!!cl}, corkboard ${!!cb})`);
    if (cl && cb) {
      L.check("CB2", `${where} background`, cl.bg === cb.bg, `${cb.bg} vs the Contact list's ${cl.bg}`);
      L.check("CB2", `${where} radius`, near(parseFloat(cb.radius), parseFloat(cl.radius), 1), `${cb.radius} vs ${cl.radius}`);
      L.check("CB2", `${where} left inset`, near(cb.l, cl.l, 1), `${cb.l.toFixed(1)} vs ${cl.l.toFixed(1)}`);
      L.check("CB2", `${where} right inset`, near(cb.r, cl.r, 1), `${cb.r.toFixed(1)} vs ${cl.r.toFixed(1)}`);
      L.check("CB2", `${where} title`, cb.title === "Corkboard", `title "${cb.title}"`);
      const notes = (await readWall(page)).length;
      L.check("CB2", `${where} sentence`, cb.sentence === `${notes} notes on your board. 1 is on your to-do list.`, `"${cb.sentence}" over ${notes} notes, 1 dated`);
    }
  }
  /* no links, no dates, no pins: n1, n10–n13 — the glance rows are all zero, so none shows */
  await only(page, `${PREFIX}n1`);
  await open(page, ROUTE, SIZES[0]);
  const rows = await page.locator(`${PAGE} [data-glance]`).count();
  const pick = await page.locator(`${PAGE} [data-cb2="pick"]`).count();
  L.check("CB2", "no links fixture", rows === 0 && pick === 1, `${rows} glance row(s), Pick a colour ${pick ? "shown" : "absent"}`);
  /* ⚠️ A SECOND COUNT, so a sentence that states 13 whatever the board holds cannot pass on the 13-note fixture */
  const five = (await readWall(page)).length;
  const said = (await page.locator(`${PAGE} [data-cb2="sentence"]`).textContent())?.trim();
  L.check("CB2", "the count follows the board", five !== 13 && said === `${five} notes on your board.`, `"${said}" over ${five} notes`);
  L.done(16);
});

test("CB3 glance filter: linked to agents leaves exactly the linked notes at full opacity, and clears", async ({ page }) => {
  const L = new Ledger("CB3");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    await page.locator(`${PAGE} [data-glance="linked"]`).click();
    await page.waitForTimeout(500);
    const on = await readWall(page);
    const full = on.filter((n) => n.opacity > 0.9).map((n) => n.id).sort();
    L.check("CB3", sz(vp), JSON.stringify(full) === JSON.stringify([...LINKED].sort()), `full opacity: ${full.join(", ")}`);
    L.check("CB3", `${sz(vp)} faded`, on.filter((n) => !LINKED.includes(n.id)).every((n) => near(n.opacity, 0.22, 0.02)), "the others at 22%");
    await page.locator(`${PAGE} [data-glance="linked"]`).click();
    await page.waitForTimeout(500);
    L.check("CB3", `${sz(vp)} cleared`, (await readWall(page)).every((n) => n.opacity > 0.9), "every note back at full");
  }
  L.done(6);
});

test("CB4 font: a post-it's words are Special Elite", async ({ page }) => {
  const L = new Ledger("CB4");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    const wall = await readWall(page);
    L.check("CB4", sz(vp), wall.length > 5 && wall.every((n) => /Special Elite/.test(n.font)), `${wall.length} notes, first face ${wall[0]?.font}`);
  }
  L.done(2);
});

test("CB5 clamp: a long note shows Read all, a short one does not", async ({ page }) => {
  const L = new Ledger("CB5");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    const wall = await readWall(page);
    L.check("CB5", `${sz(vp)} long`, wall.find((n) => n.id === id(13))?.readAll === true, "n13 (a paragraph) shows Read all");
    L.check("CB5", `${sz(vp)} short`, wall.find((n) => n.id === id(12))?.readAll === false, "n12 (one line) does not");
    L.check("CB5", `${sz(vp)} only cut`, wall.filter((n) => n.readAll).length === 1, `${wall.filter((n) => n.readAll).length} note(s) show Read all`);
  }
  L.done(6);
});

test("CB6 pinned: first in every sort and on top of its pile", async ({ page }) => {
  const L = new Ledger("CB6");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    for (const s of ["Newest first", "Oldest first", "By colour", "My order"]) {
      await setSort(page, s);
      const first = (await readWall(page))[0];
      L.check("CB6", `${sz(vp)} ${s}`, first?.id === id(5) && first.pinnedTag, `first is ${first?.id}`);
    }
    await setView(page, "piles");
    const top = await page.evaluate((ROOT) => {
      const pile = [...((0, eval)(ROOT) as HTMLElement).querySelectorAll<HTMLElement>(".cb2-pile")].find((p) => p.getAttribute("data-pile") === "");
      const papers = pile ? [...pile.querySelectorAll(".cb2-stack .cb2-paper")] : [];
      return papers.length ? papers[papers.length - 1].textContent?.trim() : null;
    }, ROOT_FN);
    L.check("CB6", `${sz(vp)} pile`, top?.startsWith("Read the letter aloud"), `top of Loose notes: "${top}"`);
    await setView(page, "board");
    await setSort(page, "Newest first");
  }
  L.done(10);
});

test("CB7 reorder: one order leaf, My order, and the note lands where the line showed", async ({ page }) => {
  const L = new Ledger("CB7");
  await only(page);
  for (const vp of SIZES) {
    await open(page, ROUTE, vp);
    await setSort(page, "Newest first");
    const before = (await readWall(page)).map((n) => n.id);
    /* both near the top, so the drag needs no scroll mid-gesture (a scroll moves the pointer off its target) */
    const from = before[4], target = before[1];
    await page.locator(`${PAGE} [data-cb2-note="${target}"]`).scrollIntoViewIfNeeded();
    const src = page.locator(`${PAGE} [data-cb2-note="${from}"]`), dst = page.locator(`${PAGE} [data-cb2-note="${target}"]`);
    const box = await dst.boundingBox();
    const writes = await writesDuring(page, async () => {
      await src.dragTo(dst, { targetPosition: { x: 10, y: (box?.height ?? 200) / 2 } });
    }, 2000);
    const user = writes.filter((w) => /^users\/[^/]+$/.test(w.doc));
    const paths = user.flatMap((w) => w.paths);
    L.check("CB7", `${sz(vp)} one write`, user.length === 1, `${user.length} user-document write(s): ${JSON.stringify(user)}`);
    L.check("CB7", `${sz(vp)} the leaf`, paths.includes("todoPrefs.noteboard.order") && !paths.includes("todoPrefs") && !paths.includes("todoPrefs.noteboard"), `paths ${paths.join(", ")}`);
    const label = (await page.locator(`${PAGE} [data-cb2="sort"]`).textContent())?.trim();
    L.check("CB7", `${sz(vp)} My order`, label === "My order", `the sort reads "${label}"`);
    const after = (await readWall(page)).map((n) => n.id);
    L.check("CB7", `${sz(vp)} landed`, after.indexOf(from) === after.indexOf(target) - 1, `${from} at ${after.indexOf(from)}, ${target} at ${after.indexOf(target)}`);
    seeder("restore", SNAP);
  }
  L.done(8);
});

test("CB8 piles: a drop sets the pile's tag first and keeps the rest; Undo restores; New pile mints", async ({ page }) => {
  const L = new Ledger("CB8");
  await only(page);
  await open(page, ROUTE, SIZES[0]);
  await setView(page, "piles");
  const was = task(id(8)).tags as string[];
  await page.locator(`${PAGE} .cb2-pile[data-pile="${was[0]}"]`).click();
  await page.waitForTimeout(500);
  await page.locator(`${PAGE} [data-cb2-note="${id(8)}"]`).dragTo(page.locator(`${PAGE} .cb2-mini[data-mini="cb2seed-tag-calls"]`));
  await page.waitForTimeout(1500);
  const moved = task(id(8)).tags as string[];
  L.check("CB8", "first tag", moved[0] === "cb2seed-tag-calls", `tags ${JSON.stringify(moved)}`);
  L.check("CB8", "rest kept", JSON.stringify(moved.slice(1)) === JSON.stringify(was.slice(1)), `was ${JSON.stringify(was)}`);
  await page.locator(".tdb-toast .tdb-toast-act", { hasText: "Undo" }).click();
  await page.waitForTimeout(1500);
  const back = task(id(8)).tags as string[];
  L.check("CB8", "undo", JSON.stringify(back) === JSON.stringify(was), `after Undo ${JSON.stringify(back)}`);
  /* New pile: the tag is minted through the app's minter (a TagDef on the user document) and made first */
  await page.locator(`${PAGE} [data-cb2-note="${id(8)}"]`).dragTo(page.locator(`${PAGE} [data-cb2="new-pile"]`));
  await page.locator(`${PAGE} [data-cb2="pile-name"]`).fill("cb2festival");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const defs = JSON.parse(seeder("tagdefs").trim().split("\n").pop()!) as { id: string; label: string }[];
  const def = defs.find((d) => d.label === "cb2festival");
  const minted = task(id(8)).tags as string[];
  L.check("CB8", "minted", !!def && minted[0] === def.id, `def ${JSON.stringify(def)}, tags ${JSON.stringify(minted)}`);
  L.check("CB8", "minted keeps rest", JSON.stringify(minted.slice(1)) === JSON.stringify(was.slice(1)), `tags ${JSON.stringify(minted)}`);
  seeder("droptag", "cb2festival");
  seeder("seed");
  seeder("restore", SNAP);
  L.done(5);
});

test("CB9 task: Add a task writes what /todo's composer writes; Turn into a task writes only dueDate (and colour if absent)", async ({ page }) => {
  const L = new Ledger("CB9");
  await only(page);
  await open(page, ROUTE, SIZES[0]);
  await page.locator(`${PAGE} [data-cb2="add-task"]`).click();
  /* RE-POINTED (dev line, To-do list v51): both sides are v51's "A new task" form — the Corkboard hosts that form
     (ws/TodoWorkspace AddTask), /todo draws it on the desk. The same answers on each: words, Tomorrow, notes. */
  const fill = async (scope: string, text: string) => {
    await page.locator(`${scope} [aria-label="What do you need to do"]`).fill(text);
    await page.locator(`${scope} [role="radio"]`, { hasText: "Tomorrow" }).click();
    await page.locator(`${scope} [aria-label="Notes"]`).fill("Probe notes");
    await page.locator(`${scope} button`, { hasText: "Add to your tray" }).click();
  };
  await fill('[data-cb2="task-dialog"]', "CB2 PROBE from the corkboard");
  await page.waitForTimeout(1500);
  const fromCork = (JSON.parse(seeder("tasks", "CB2 PROBE from the corkboard").trim().split("\n").pop()!) as Record<string, unknown>[])[0];
  /* the same answers on /todo, through its own composer (the one-shot key it reads on arrival) */
  await page.addInitScript(() => { try { sessionStorage.setItem("sa.todoCompose", "task"); } catch { /* */ } });
  await openRoute(page, "/todo", SIZES[0]);
  await page.locator('[data-tws="add"]:visible').waitFor();
  await fill('[data-tws="add"]:visible', "CB2 PROBE from the todo list");
  await page.waitForTimeout(2000);
  const fromTodo = (JSON.parse(seeder("tasks", "CB2 PROBE from the todo list").trim().split("\n").pop()!) as Record<string, unknown>[])[0];
  const shape = (t: Record<string, unknown> | undefined) => t ? Object.fromEntries(Object.entries(t).filter(([k]) => !["id", "text", "createdAt", "updatedAt"].includes(k)).sort()) : null;
  L.check("CB9", "both written", !!fromCork && !!fromTodo, `corkboard ${!!fromCork}, todo ${!!fromTodo}`);
  L.check("CB9", "same fields", JSON.stringify(shape(fromCork)) === JSON.stringify(shape(fromTodo)), `${JSON.stringify(shape(fromCork))} vs ${JSON.stringify(shape(fromTodo))}`);
  seeder("deltext", "CB2 PROBE");
  /* Turn into a task, on a note with no colour (n7) and one with a colour (n12) */
  for (const [nid, stamp] of [[id(7), true], [id(12), false]] as const) {
    await open(page, ROUTE, SIZES[0]);
    const card = page.locator(`${PAGE} [data-cb2-note="${nid}"]`);
    await card.hover();
    await card.locator('[data-cb2="more"]').click();
    await page.locator('[data-cb2="menu"] [data-act="task"]').click();
    await page.locator('[data-cb2="turn-dialog"] [data-when="next"]').click();
    const writes = await writesDuring(page, async () => { await page.locator('[data-cb2="add-to-todo"]').click(); }, 1500);
    const paths = [...new Set(writes.filter((w) => w.doc.endsWith(`/tasks/${nid}`)).flatMap((w) => w.paths))].sort();
    const want = stamp ? ["colour", "dueDate", "updatedAt"] : ["dueDate", "updatedAt"];
    L.check("CB9", `turn ${nid}`, JSON.stringify(paths) === JSON.stringify(want), `paths ${paths.join(", ")} (want ${want.join(", ")})`);
  }
  seeder("seed");
  L.done(4);
});

test("CB10 remember: the view and the sort survive a reload", async ({ page }) => {
  const L = new Ledger("CB10");
  await only(page);
  await open(page, ROUTE, SIZES[0]);
  await setSort(page, "Oldest first");
  await setView(page, "piles");
  await page.reload();
  await page.waitForTimeout(2500);
  L.check("CB10", "view", (await page.locator(`${PAGE} [data-view="piles"]`).getAttribute("aria-pressed")) === "true", "Piles is pressed after a reload");
  await setView(page, "board");
  await page.reload();
  await page.waitForTimeout(2500);
  L.check("CB10", "sort", (await page.locator(`${PAGE} [data-cb2="sort"]`).textContent())?.trim() === "Oldest first", "the sort reads Oldest first after a reload");
  const prefs = JSON.parse(seeder("prefs").trim().split("\n").pop()!);
  L.check("CB10", "stored", prefs?.view === "board" && prefs?.sort === "old", `todoPrefs.noteboard ${JSON.stringify({ view: prefs?.view, sort: prefs?.sort })}`);
  seeder("restore", SNAP);
  L.done(3);
});

test("CB11 empty: Pick a colour to start and four examples; Keep this creates a note and leaves the empty state", async ({ page }) => {
  const L = new Ledger("CB11");
  await only(page, "cb2none-");
  await open(page, ROUTE, SIZES[0]);
  L.check("CB11", "pick", await page.locator(`${PAGE} [data-cb2="pick"]`).count() === 1, "Pick a colour to start");
  L.check("CB11", "heading", (await page.locator(`${PAGE} [data-cb2="pick"] h2`).textContent())?.trim() === "Pick a colour to start", "its words");
  L.check("CB11", "examples", await page.locator(`${PAGE} [data-cb2-example]`).count() === 4, "four examples");
  L.check("CB11", "no wall", await page.locator(`${PAGE} [data-cb2="wall"]`).count() === 0, "no wall");
  await page.locator(`${PAGE} [data-cb2="keep"]`).first().click();
  await page.waitForTimeout(1500);
  const kept = JSON.parse(seeder("tasks", "Heard [agent]").trim().split("\n").pop()!) as { id: string }[];
  L.check("CB11", "created", kept.length === 1, `${kept.length} note(s) created`);
  if (kept[0]) {
    await only(page, kept[0].id);
    await open(page, ROUTE, SIZES[0]);
    L.check("CB11", "left empty", await page.locator(`${PAGE} [data-cb2="wall"]`).count() === 1 && await page.locator(`${PAGE} [data-cb2="empty"]`).count() === 0, "the wall, not the empty page");
  }
  seeder("deltext", "Heard [agent]");
  L.done(6);
});

test("CB12 phone: at 390, no sideways overflow, one column, nothing draggable", async ({ page }) => {
  const L = new Ledger("CB12");
  await only(page);
  await openPhone(page, ROUTE);
  const m = await page.evaluate((ROOT) => {
    const root = (0, eval)(ROOT) as HTMLElement;
    const xs = [...root.querySelectorAll<HTMLElement>("[data-cb2-note]")].map((n) => Math.round(n.getBoundingClientRect().left));
    return {
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      wide: [...root.querySelectorAll<HTMLElement>("*")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest(".cb2-chips, .cb2-shelf")).length,
      cols: new Set(xs).size, notes: xs.length,
      drag: document.querySelectorAll('[draggable="true"]').length,
    };
  }, ROOT_FN);
  L.check("CB12", "overflow", m.sw <= m.iw && m.wide === 0, `scrollWidth ${m.sw} / ${m.iw}, ${m.wide} element(s) past the edge`);
  L.check("CB12", "one column", m.notes > 5 && m.cols === 1, `${m.notes} notes in ${m.cols} column(s)`);
  L.check("CB12", "no drag", m.drag === 0, `${m.drag} draggable element(s)`);
  L.done(3);
});

/* RETIRED ON THE DEV LINE (To-do list v51): /todo's composer is v51's "A new task" form, which makes dated tasks only and
   offers no paper, so Part H has no subject here. On the corkboard-v2 branch (the v5.1 desk) CB13 stands and was red
   on its named break (Yellow / Pink / Sage). */
test.skip("CB13 to-do composer: Note mode offers the five papers (retired on the dev line: v51 has no Note mode)", async () => {});

test("CB14 rules: the five papers, the old three and pinned are accepted; anything else is refused", async () => {
  const L = new Ledger("CB14");
  const r = JSON.parse(seeder("rules").trim().split("\n").pop()!) as { accepted: string[]; refused: string[]; pinned: string; link: string };
  L.check("CB14", "five", ["butter", "blush", "powder", "sand", "stone"].every((c) => r.accepted.includes(c)), `accepted ${r.accepted.join(", ")}`);
  L.check("CB14", "old three", ["yellow", "pink", "sage"].every((c) => r.accepted.includes(c)), `accepted ${r.accepted.join(", ")}`);
  L.check("CB14", "refused", r.refused.join(",") === "green", `refused ${r.refused.join(", ")}`);
  L.check("CB14", "pinned", r.pinned === "accepted", `pinned ${r.pinned}`);
  L.check("CB14", "link", r.link === "accepted", `a link change ${r.link}`);
  L.done(5);
});

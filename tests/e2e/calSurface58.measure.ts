import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { refRule, refColour, refTokens } from "./refValues";

/**
 * v58 SURFACE, TASKS AND ORDER — asserted against values READ FROM THE REF at test time.
 *
 * ⚠️ NOT ONE NUMBER IN THIS FILE IS TYPED FROM THE REF. A lock that copies the design's values
 * asserts what somebody once read; the day the ref moves it keeps passing over a board that no
 * longer matches. `refRule`/`refColour` parse `design-refs/timeline-v58.html` on every run, and
 * `check-design-refs` fails the build if that file changes without being enrolled — so the values
 * cannot drift and the file cannot move unnoticed.
 */
const px = (v: string) => parseFloat(v);

test("the board and the rail wear the ref's field", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const one = (s) => { const e = [...document.querySelectorAll(s)].find(vis); if (!e) return null;
      const c = getComputedStyle(e);
      return { bg: c.backgroundColor, tl: c.borderTopLeftRadius, tr: c.borderTopRightRadius,
        z: c.zIndex, iso: c.isolation }; };
    return { board: one(".tl-board"), rail: one(".tl-rail") };
  })()`) as unknown as any;
  const refBoard = refRule(".board"), refRail = refRule(".rail");
  console.log(`board ${JSON.stringify(got.board)}`);
  console.log(`rail  ${JSON.stringify(got.rail)}`);
  expect(got.board, "no board on the page").not.toBeNull();
  expect(got.rail, "no rail on the page").not.toBeNull();
  expect(got.board.bg, "the board is not on the ref's field").toBe(refColour(refBoard.background));
  expect(got.rail.bg, "the rail is not opaque in the ref's field tone").toBe(refColour(refRail.background));
  /* the ref rounds the board and caps it with the rail's top corners */
  expect(px(got.board.tl), "the board's radius is not the ref's")
    .toBe(px(refBoard["border-radius"]));
  expect(px(got.rail.tl), "the rail's top radius is not the ref's")
    .toBe(px(refRail["border-radius"].split(" ")[0]));
  /* Law 4: the rail outranks the rows, and is opaque so it can */
  expect(got.rail.iso, "the rail owns no stacking context").toBe("isolate");
  expect(Number(got.rail.z), "the rail does not outrank the rows")
    .toBeGreaterThanOrEqual(Number(refRail["z-index"]));
});

test("⚠️ the card is an object on the field — the ref's border, radius and BOTH shadow layers", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const cards = [...document.querySelectorAll(".tl-p")].filter(vis);
    /* an UNCUT card: a clipped one squares its corners and drops a border by design */
    const plain = cards.filter((c) => !/fade/.test(c.className));
    return { plain: plain.length, total: cards.length,
      frames: plain.map((c) => { const f = c.querySelector(".tl-frame"); const s = getComputedStyle(f);
        return { rel: c.dataset.rel, bd: s.borderTopWidth + " " + s.borderTopStyle + " " + s.borderTopColor,
          r: s.borderTopLeftRadius, sh: s.boxShadow, bg: s.backgroundColor,
          owed: c.classList.contains("owed") }; }) };
  })()`) as unknown as any;
  const r = refRule(".frame");
  console.log(`uncut cards ${got.plain} of ${got.total}`);
  /* ⚠️ POPULATION: every card clipped means no card can show the resting frame at all. */
  expect(got.plain, "every card is clipped, so the resting frame was not tested").toBeGreaterThan(0);
  /* the base card — an owed one legitimately differs, per the ref's own `.card.owed .bg` */
  const base = got.frames.filter((f: any) => !f.owed);
  expect(base.length, "no unclipped, un-owed card, so the base frame was not tested")
    .toBeGreaterThan(0);
  const refBd = r.border.replace(/#[0-9a-f]{6}/i, (m: string) => refColour(m));
  for (const f of base) {
    expect(f.bg, `${f.rel}: the frame is not the ref's fill`).toBe(refColour(r.background));
    expect(f.bd, `${f.rel}: the frame's border is not the ref's`).toBe(refBd);
    expect(px(f.r), `${f.rel}: the frame's radius is not the ref's`).toBe(px(r["border-radius"]));
    /* ⚠️ BOTH LAYERS. Ours was one faint shadow — a card PRINTED on the field rather than resting
       on it — and "has a shadow" would have passed over exactly that. The ref's declaration has a
       comma; the count is the claim. */
    const layers = (f.sh.match(/rgba?\(/g) || []).length;
    const refLayers = (r["box-shadow"].match(/rgba?\(/g) || []).length;
    expect(layers, `${f.rel}: the frame has ${layers} shadow layer(s), the ref has ${refLayers}`)
      .toBe(refLayers);
  }
});

test("a rolled task's ghost is a bare box; the label is the board's own face", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const got = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    return [...document.querySelectorAll(".tl-tchip")].filter(vis).map((t) => {
      const nm = t.querySelector(".tl-tname"), mk = t.querySelector(".tl-tmk");
      const ms = mk ? getComputedStyle(mk) : null;
      return { ghost: t.classList.contains("ghost"),
        text: (t.textContent || "").trim(),
        family: nm ? getComputedStyle(nm).fontFamily : "",
        size: nm ? getComputedStyle(nm).fontSize : "",
        weight: nm ? getComputedStyle(nm).fontWeight : "",
        box: ms ? ms.width + "|" + ms.borderTopWidth : "" };
    });
  })()`) as unknown as any[];
  const ghosts = got.filter((t) => t.ghost), live = got.filter((t) => !t.ghost);
  console.log(`tasks ${got.length} — live ${live.length} · rolled ghosts ${ghosts.length}`);
  /* ⚠️ BOTH POPULATIONS: no ghost and the bare-box rule is untested; no live task and the
     typography rule is. */
  expect(live.length, "no live task, so the label rules were not tested").toBeGreaterThan(0);
  expect(ghosts.length, "no rolled task, so the bare-box rule was not tested").toBeGreaterThan(0);
  expect(ghosts.filter((g) => g.text !== "").map((g) => `"${g.text}"`),
    "a rolled task's ghost carries text — the ref draws a box alone").toEqual([]);
  const t = refRule(".task .tl"), b = refRule(".task .box");
  for (const l of live) {
    expect(px(l.size), "a task label is not the ref's size").toBe(px(t["font-size"]));
    expect(l.weight, "a task label is not the ref's weight").toBe(t["font-weight"]);
    /* ⚠️ THE REF SETS NO FAMILY ON A TASK LABEL, so it is the board's body face. Playfair is the
       page's display type; on a 12.5px label beside a checkbox it reads as a heading for admin. */
    expect(/playfair/i.test(l.family), `a task label is set in Playfair ("${l.family}")`).toBe(false);
  }
  for (const l of got) {
    expect(px(l.box.split("|")[0]), "a task's box is not the ref's size").toBe(px(b.width));
  }
});

test("⚠️ owed work is a tier: every overdue row precedes every row that is not", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const rows = await page.evaluate(`(() => {
    const visH = (e) => e.getBoundingClientRect().height > 0;
    return [...document.querySelectorAll(".tl-rrow")].filter(visH).map((r) => ({
      key: r.dataset.rowkey || "",
      owed: [...r.querySelectorAll(".tl-p")].some((c) => c.classList.contains("owed")),
    }));
  })()`) as unknown as { key: string; owed: boolean }[];
  const owed = rows.map((r, i) => (r.owed ? i : -1)).filter((i) => i >= 0);
  const rest = rows.map((r, i) => (r.owed ? -1 : i)).filter((i) => i >= 0);
  console.log(`rows ${rows.length} — overdue ${owed.length} · everything else ${rest.length}`);
  /* ⚠️ BOTH POPULATIONS, or "the overdue lead" is a claim about an empty set or about everything. */
  expect(owed.length, "no overdue row, so the tier was not tested").toBeGreaterThan(2);
  expect(rest.length, "every row is overdue, so there is nothing for them to lead").toBeGreaterThan(3);
  expect(Math.max(...owed) < Math.min(...rest),
    `an overdue row is painted below one that is not (last overdue ${Math.max(...owed)},`
    + ` first other ${Math.min(...rest)}: ${rows[Math.min(...rest)].key})`).toBe(true);
});

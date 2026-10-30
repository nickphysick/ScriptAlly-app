/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 1 — THE SHELL LOCKS, PA2-1 (design-refs/phone-app-v2/). S1–S8 at 390 × 844 and 360 × 780; S9 at
 * 1512 × 900 and 1280 × 800 as a capture of the base build and of this build, then a compare (PA2_L1=capture|compare,
 * PA2_L1_NAME=base|head).
 *
 * Each lock was proved red by a named mutation before its green was trusted: the CSS ones with `PA2_MUTATE=<name>`
 * (tests/e2e/pa2Lib.ts), the code ones by a source edit in the worktree, a rebuild and a run — both listed in
 * reports/phone-app-v2/part-1/REPORT.md.
 *
 * ⚠️ S7 WRITES. It records a pass on one Queried query and presses Undo in the same run, so the account is put back; a
 *    run that cannot press Undo fails saying the account has changed.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { DIR, Ledger, PHONES, colourSweep, imageSweep, openPhone, prime, shot, tag } from "./pa2Lib";

test.setTimeout(420_000);
const PART = "part-1";
const CHROME = ".pa-band, .pa-tabbar, .pa-layer";

const bar = (page: Page) => page.evaluate(() => {
  const nav = document.querySelector<HTMLElement>('[data-pa="tabbar"]');
  if (!nav) return null;
  const order = [...nav.children].map((c) => (c as HTMLElement).dataset.tab ?? ((c as HTMLElement).dataset.pa === "plus" ? "plus" : "?"));
  const on = nav.querySelector<HTMLElement>('[aria-current="page"]');
  const pill = on?.querySelector<HTMLElement>(".pa-tbi");
  const icon = pill?.querySelector("svg");
  const r = nav.getBoundingClientRect();
  return {
    order, on: on?.dataset.tab ?? null, pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
    iconColour: icon ? getComputedStyle(icon).color : null,
    badge: document.querySelector('[data-pa="tab-badge"]')?.textContent ?? null,
    badgeOn: (document.querySelector('[data-pa="tab-badge"]')?.closest("[data-tab]") as HTMLElement | null)?.dataset.tab ?? null,
    away: nav.classList.contains("away"), top: r.top, h: r.height,
  };
});

/* ── S1 · S3 · S8 — the bar and the band on the four tabs ───────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`PA2-1 · the tab bar and the band · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `tabs-${tag(vp)}`);
    /* the To-do tray's own tally, read off its desktop headline (S1's reference): overdue + due today */
    await prime(page);
    await openRoute(page, "/todo", { width: 1512, height: 900 });
    /* ⚠️ THE VISIBLE ONE: every page stays mounted, so `.first()` can pick a hidden copy and wait out the timeout */
    /* To-do v12 (on dev from 29 Oct) replaced the td7 headline with "Needs you now" and its summary line; read whichever
       this build draws — both state the tray's overdue and due-today counts */
    await page.locator('[data-td7="headline"]:visible, [data-td12="summary"]:visible, [data-td12="none"]:visible, [data-td12="ack"]:visible').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const tray = await page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const head = [...document.querySelectorAll('[data-td7="headline"]')].find(vis) ?? null;
      if (head) {
        const n = (sel: string) => Number((head.querySelector(sel)?.textContent ?? "0").match(/\d+/)?.[0] ?? 0);
        return { overdue: n('[data-td52="title-od"]'), today: n('[data-td52="title-today"]'), head: head.textContent ?? "" };
      }
      const sum = [...document.querySelectorAll('[data-td12="summary"], [data-td12="none"], [data-td12="ack"]')].find(vis) ?? null;
      const t = sum?.textContent ?? "";
      const od = t.match(/(\d+) overdue/), td = t.match(/(\d+) due today/);
      return { overdue: od ? Number(od[1]) : 0, today: td ? Number(td[1]) : 0, head: t };
    });
    L.check("pop", `${tag(vp)} the tray's headline was read`, tray.head.trim().length > 0, JSON.stringify(tray));

    await openPhone(page, "/dashboard", vp);
    for (const [path, key] of [["/dashboard", "home"], ["/queries", "queries"], ["/todo", "todo"], ["/agents", "agents"]] as const) {
      await page.goto(path);
      await page.locator('[data-pa="tabbar"]').waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1800);
      const b = await bar(page);
      L.check("pop", `${tag(vp)} ${key}: the bar is drawn`, !!b, String(b));
      if (!b) continue;
      /* S1 — five slots in the ref's order, + in the middle, the chosen pill navy with a white icon */
      L.check("S1", `${tag(vp)} ${key}: Home · Queries · + · To-do · Agents`, b.order.join(",") === "home,queries,plus,todo,agents", b.order.join(","));
      L.check("S1", `${tag(vp)} ${key}: its own tab is chosen`, b.on === key, String(b.on));
      L.check("S1", `${tag(vp)} ${key}: the chosen pill is navy, its icon white`, b.pillBg === "rgb(42, 58, 82)" && b.iconColour === "rgb(255, 255, 255)", `${b.pillBg} / ${b.iconColour}`);
      const due = tray.overdue + tray.today;
      L.check("S1", `${tag(vp)} ${key}: the badge is on To-do and equals the tray's overdue + today`,
        due > 0 ? b.badgeOn === "todo" && b.badge === String(due) : b.badge === null, `${b.badgeOn} ${b.badge} vs ${due}`);
      /* S3 — the band: navy, the title Special Elite at 400, every text node on navy white */
      const band = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-pa="band"]');
        const t = el?.querySelector<HTMLElement>('[data-pa="band-title"]');
        return el && t ? { bg: getComputedStyle(el).backgroundColor, fam: getComputedStyle(t).fontFamily, w: getComputedStyle(t).fontWeight, colour: getComputedStyle(t).color, text: t.textContent, chip: !!el.querySelector('[data-pa="book-chip"]'), variant: el.dataset.variant } : null;
      });
      L.check("S3", `${tag(vp)} ${key}: the band is navy`, band?.bg === "rgb(42, 58, 82)", String(band?.bg));
      L.check("S3", `${tag(vp)} ${key}: the title is Special Elite at 400`, /Special Elite/.test(band?.fam ?? "") && band?.w === "400", `${band?.fam} ${band?.w}`);
      L.check("S3", `${tag(vp)} ${key}: the title is white`, band?.colour === "rgb(255, 255, 255)", String(band?.colour));
      L.check("S3", `${tag(vp)} ${key}: the tab band carries the book chip`, band?.variant === "tab" && band.chip, JSON.stringify(band));
      if (key === "home") L.check("S3", `${tag(vp)} home: the title is the greeting`, /^(Morning|Afternoon|Evening)\b/.test(band?.text ?? ""), String(band?.text));
      /* S8 — the colour laws and the image census, over the chrome this part draws */
      const col = await colourSweep(page, { roots: CHROME });
      L.check("S8", `${tag(vp)} ${key}: navy grounds judged`, col.navy > 0, JSON.stringify({ navy: col.navy, blush: col.blush }));
      L.check("S8", `${tag(vp)} ${key}: white on navy, ink on blush, no green or red`, col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
      const sets = await imageSweep(page);
      for (const s of sets) L.check("S8", `${tag(vp)} ${key}: no image twice`, new Set(s).size === s.length, JSON.stringify(s.filter((x, i) => s.indexOf(x) !== i)));
      if (key === "home") await shot(page, PART, `01-home-${tag(vp)}`);
    }
    L.done(40);
  });
}

/* ── S2 — the bar tucks away and comes back ─────────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`PA2-1 · tuck-away · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `tuck-${tag(vp)}`);
    await openPhone(page, "/dashboard", vp);
    const stage = '#app-stage-scroll';
    const can = await page.evaluate((s) => { const e = document.querySelector<HTMLElement>(s)!; return e.scrollHeight - e.clientHeight; }, stage);
    L.check("pop", `${tag(vp)} Home scrolls (precondition)`, can > 260, String(can));
    const scrollTo = async (y: number) => { await page.evaluate(([s, v]) => { document.querySelector<HTMLElement>(s as string)!.scrollTop = v as number; }, [stage, y] as const); await page.waitForTimeout(250); };
    await scrollTo(0);
    L.check("S2", `${tag(vp)} at rest the bar is in`, (await bar(page))?.away === false, "");
    for (const y of [50, 100, 150, 200]) await scrollTo(y);
    L.check("S2", `${tag(vp)} after 200 down the bar is away`, (await bar(page))?.away === true, "");
    await scrollTo(180);
    L.check("S2", `${tag(vp)} after 20 up the bar is back`, (await bar(page))?.away === false, "");
    L.done(4);
  });
}

/* ── S4 — a menu page: the page band, no tab bar ────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`PA2-1 · the page band · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `pageband-${tag(vp)}`);
    await openPhone(page, "/dashboard", vp);
    for (const [path, title] of [["/queries/analytics", "Analytics"], ["/help", null], ["/account", null]] as const) {
      await page.goto(path);
      await page.locator('[data-pa="band"]').first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>('[data-pa="band"]');
        return { variant: b?.dataset.variant, back: !!b?.querySelector('[data-pa="back"]'), chip: !!b?.querySelector('[data-pa="book-chip"]'), bar: !!document.querySelector('[data-pa="tabbar"]'), title: b?.querySelector('[data-pa="band-title"]')?.textContent ?? "" };
      });
      L.check("S4", `${tag(vp)} ${path}: the page band with a back arrow`, r.variant === "page" && r.back, JSON.stringify(r));
      L.check("S4", `${tag(vp)} ${path}: no tab bar`, r.bar === false, JSON.stringify(r));
      L.check("S4", `${tag(vp)} ${path}: no book chip`, r.chip === false, JSON.stringify(r));
      if (title) L.check("S4", `${tag(vp)} ${path}: titled ${title}`, r.title === title, r.title);
    }
    /* back returns to where you came from */
    await page.goto("/dashboard"); await page.waitForTimeout(1200);
    await page.goto("/queries/analytics"); await page.locator('[data-pa="back"]').waitFor();
    await page.locator('[data-pa="back"]').click(); await page.waitForTimeout(1200);
    L.check("S4", `${tag(vp)} back returns to Home`, new URL(page.url()).pathname === "/dashboard", page.url());
    L.done(10);
  });
}

/* ── S5 · S6 — the + sheet and the menu ─────────────────────────────────────────────────────────────────────── */

for (const vp of PHONES) {
  test(`PA2-1 · the + sheet and the menu · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `sheets-${tag(vp)}`);
    await openPhone(page, "/queries", vp);
    /* S5 — two rows and three pills, each door opens its journey or page */
    const doors: [string, (p: Page) => Promise<boolean>, string][] = [
      ["plus-sent", (p) => p.locator('[data-qad-drawer="log"]:visible').waitFor({ timeout: 8000 }).then(() => true, () => false), "the log drawer"],
      ["plus-replied", (p) => p.locator('[data-qad-drawer]:visible, [role="dialog"]:visible').first().waitFor({ timeout: 8000 }).then(() => true, () => false), "the response journey"],
      ["plus-agent", async (p) => { const d = await p.locator('[data-ac="overlay"]:visible, [role="dialog"]:visible').first().waitFor({ timeout: 8000 }).then(() => true, () => false); return d && new URL(p.url()).pathname === "/queries"; }, "the add-agent card, in place"],
      /* Part 4: on a phone the task is added in the flow layout, wherever you are */
      ["plus-task", async (p) => { await p.waitForTimeout(1200); const ok = (await p.locator('.pa-flow[data-pf="task"]').count()) === 1; if (ok) { await p.locator('[data-pf="close"]').click(); await p.waitForTimeout(300); } return ok; }, "the task flow"],
      ["plus-import", async (p) => { await p.waitForTimeout(1200); return new URL(p.url()).pathname === "/import"; }, "/import"],
    ];
    for (const [door, opened, what] of doors) {
      await page.goto("/queries"); await page.locator('[data-pa="plus"]').waitFor(); await page.waitForTimeout(800);
      await page.locator('[data-pa="plus"]').click();
      const sheet = await page.locator('[data-pa="sheet"]').waitFor({ timeout: 5000 }).then(() => true, () => false);
      if (door === "plus-sent") {
        const parts = await page.evaluate(() => ({ rows: document.querySelectorAll(".pa-actrow").length, pills: document.querySelectorAll(".pa-pills .pa-chip").length, title: document.querySelector(".pa-sheet .pa-sht")?.textContent, plus: document.querySelector('[data-pa="plus"]')?.getAttribute("aria-expanded") }));
        L.check("S5", `${tag(vp)} the + sheet: "What happened?", two rows, three pills`, sheet && parts.rows === 2 && parts.pills === 3 && parts.title === "What happened?", JSON.stringify(parts));
        L.check("S5", `${tag(vp)} the + reads as the close button while open`, parts.plus === "true", String(parts.plus));
        const col = await colourSweep(page, { roots: CHROME });
        L.check("S8", `${tag(vp)} the + sheet: colour laws`, col.bad.length === 0, col.bad.slice(0, 4).join(" | "));
        await shot(page, PART, `13-plus-sheet-${tag(vp)}`);
      }
      await page.locator(`[data-pa="${door}"]`).click();
      const ok = await opened(page);
      L.check("S5", `${tag(vp)} ${door} opens ${what}`, ok, page.url());
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      if (await page.locator("[data-qad-drawer]:visible").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
      const discard = page.getByRole("button", { name: /^Discard$/ });
      if (await discard.count()) await discard.first().click().catch(() => {});
    }

    /* S6 — the menu: every "you"-sheet item reachable; the tile lines equal their pages' own figures */
    await page.goto("/dashboard"); await page.locator('[data-pa="menu-btn"]').waitFor(); await page.waitForTimeout(1000);
    await page.locator('[data-pa="menu-btn"]').click();
    await page.locator('[data-pa="menu-tiles"]').waitFor();
    const menu = await page.evaluate(() => ({
      tiles: [...document.querySelectorAll<HTMLElement>('[data-pa="menu-tile"]')].map((t) => ({ key: t.dataset.key!, line: t.querySelector('[data-pa="tile-line"]')?.textContent ?? null, disabled: (t as HTMLButtonElement).disabled })),
      rows: ["menu-import", "menu-help", "menu-feedback", "menu-settings", "menu-plan-row", "menu-signout"].filter((k) => document.querySelector(`[data-pa="${k}"]`)),
      sign: !!document.querySelector('[data-pa="menu-sign"] img.wm'),
    }));
    await shot(page, PART, `29-menu-${tag(vp)}`);
    L.check("S6", `${tag(vp)} eight tiles in the ref's order`, menu.tiles.map((t) => t.key).join(",") === "responses,analytics,goals,manuscript,materials,comps,discover,feedback", menu.tiles.map((t) => t.key).join(","));
    L.check("S6", `${tag(vp)} the you-sheet's rows are all here (import, help, settings, plan/upgrade, sign out)`, menu.rows.length === 6, menu.rows.join(","));
    L.check("S6", `${tag(vp)} the sign-off carries the wordmark`, menu.sign, "");
    const lines = Object.fromEntries(menu.tiles.map((t) => [t.key, t.line]));
    /* only the three tiles whose figures the app computes carry a number; the others show the name alone */
    for (const k of ["analytics", "materials", "discover", "feedback"]) L.check("S6", `${tag(vp)} ${k}: no number of its own`, lines[k] === null, String(lines[k]));
    /* Part 7 built Streaks & goals: the tile that waited for it is live (PA2-7 P5 opens it) */
    L.check("S6", `${tag(vp)} goals: present and live since Part 7`, menu.tiles.find((t) => t.key === "goals")?.disabled === false, JSON.stringify(menu.tiles.find((t) => t.key === "goals")));
    /* Responses: equal to the Responses page's own replies figure (more + passed) */
    const respLine = Number((lines.responses ?? "").match(/\d+/)?.[0] ?? NaN);
    await page.locator('[data-pa="menu-tile"][data-key="responses"]').click(); await page.waitForTimeout(3000);
    const page5 = await page.evaluate(() => document.body.innerText);
    L.check("S6", `${tag(vp)} Responses opens /queries/responses`, new URL(page.url()).pathname === "/queries/responses", page.url());
    L.check("S6", `${tag(vp)} the Responses tile's figure is a whole number`, Number.isFinite(respLine), String(lines.responses));
    L.check("S6", `${tag(vp)} the Responses page states that figure`, new RegExp(`\\b${respLine}\\b`).test(page5), `${respLine}`);
    L.done(18);
  });
}

/* ── S7 — the snackbar (WRITES, and puts it back) ───────────────────────────────────────────────────────────── */

test("PA2-1 · the snackbar · 390x844", async ({ page }) => {
  const L = new Ledger(PART, "snack-390x844");
  const vp = PHONES[0];
  await openPhone(page, "/queries", vp);
  await page.locator('[data-qm1="chip"][data-key="agent"]').click(); await page.waitForTimeout(500);
  const target = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')].find((r) => /Queried/.test(r.textContent ?? ""))?.dataset.id ?? null);
  L.check("pop", "a Queried query with the agent", !!target, String(target));
  await page.goto(`/queries?q=${target}`);
  await page.locator('[data-qm1="query"] [data-qc149c="card"]').waitFor({ timeout: 20_000 });
  const primary = (await page.locator('[data-qm1="query"] [data-qc149c="next-primary"]').textContent({ timeout: 3000 }).catch(() => "")) ?? "";
  await page.locator(`[data-qm1="query"] [data-qc149c="${/response/i.test(primary) ? "next-primary" : "next-second"}"]`).click({ timeout: 8000 });
  /* Part 4: on a phone the response is recorded in the response journey's flow layout (PA2-4) — pick Passed, walk to
     the check card, save */
  await page.locator('.pa-flow [data-qad-chip="pass"]').click({ timeout: 8000 });
  for (let i = 0; i < 8 && !(await page.locator('.pa-flow [data-pf="check"]').count()); i++) { await page.locator('.pa-flow [data-pf="primary"]').click({ timeout: 8000 }); await page.waitForTimeout(400); }
  await page.locator('.pa-flow [data-pf="primary"]').click({ timeout: 8000 });
  await page.locator("[data-qad-undo]").waitFor({ timeout: 15_000 });
  const s = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-pa="snack"]');
    const u = el?.querySelector<HTMLElement>("[data-qad-undo]");
    const tx = el?.querySelector<HTMLElement>(".pa-snacktx");
    const tb = document.querySelector<HTMLElement>('[data-pa="tabbar"]');
    const ub = u?.getBoundingClientRect();
    const hit = ub ? document.elementFromPoint(ub.left + ub.width / 2, ub.top + ub.height / 2) : null;
    return el && u && tx ? {
      bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius, text: tx.textContent, textColour: getComputedStyle(tx).color,
      undoBg: getComputedStyle(u).backgroundColor, undoColour: getComputedStyle(u).color, pic: !!el.querySelector('[data-pa="art-placeholder"], img'),
      aboveBar: tb ? el.getBoundingClientRect().bottom <= tb.getBoundingClientRect().top + 1 : true, undoTop: !!hit && u.contains(hit),
    } : null;
  });
  await shot(page, PART, "18-snackbar-390x844");
  L.check("S7", "the snackbar is a navy pill", s?.bg === "rgb(42, 58, 82)" && /999|px/.test(s.radius), JSON.stringify(s));
  L.check("S7", "one line of white text", s?.textColour === "rgb(255, 255, 255)" && (s.text ?? "").length > 0, JSON.stringify(s));
  L.check("S7", "Undo is a blush pill with ink text", s?.undoBg === "rgb(232, 200, 188)" && s.undoColour === "rgb(31, 38, 51)", JSON.stringify(s));
  L.check("S7", "the small round picture", s?.pic === true, "");
  L.check("S7", "it floats above the tab bar, and Undo is on top", s?.aboveBar === true && s.undoTop === true, JSON.stringify(s));
  const ok = await page.locator("[data-qad-undo]").click({ timeout: 5000 }).then(() => true, () => false);
  expect(ok, `UNDO NOT PRESSED: the harness account has been changed — restore query ${target}`).toBe(true);
  const done = await page.locator('[data-qad-toast="done"]').waitFor({ timeout: 15_000 }).then(() => true, () => false);
  L.check("S7", "Undo restores (the bar says it is undone)", done, "");
  /* the record is put back: the query is in the agent's court again (the list's own derivation, whereItStands) */
  await page.goto("/queries"); await page.locator('[data-qm1="chip"][data-key="agent"]').click(); await page.waitForTimeout(800);
  const where = await page.evaluate((id) => document.querySelector<HTMLElement>(`[data-qm1="row"][data-id="${id}"]`)?.dataset.where ?? null, target);
  L.check("S7", "the query is back with the agent", where === "agent", String(where));
  L.done(7);
});

/* ── S9 — the desktop is untouched ──────────────────────────────────────────────────────────────────────────── */

const L1 = process.env.PA2_L1 ?? "";
const L1_NAME = process.env.PA2_L1_NAME ?? "head";
const DESKS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
/* Part 5 adds the Corkboard (the desktop noteboard page must not change either). PA2_L1_ROUTES narrows a capture to
   some routes — how the Corkboard's base was captured after the fact, from the base build */
const DESK_ROUTES = process.env.PA2_L1_ROUTES ? process.env.PA2_L1_ROUTES.split(",") : ["/dashboard", "/queries", "/todo", "/agents", "/account", "/todo/corkboard", "/agents/discover", "/queries/responses", "/queries/analytics", "/manuscripts"];
const l1Path = (name: string, vp: { width: number }, r: string, ext: string) => `${DIR}/${PART}/l1/${name}-${vp.width}${r.replace(/\//g, "_")}.${ext}`;

test("PA2-1 · S9 desktop capture", async ({ page }) => {
  test.skip(L1 !== "capture");
  mkdirSync(`${DIR}/${PART}/l1`, { recursive: true });
  const t = new Date(); t.setHours(12, 0, 0, 0);
  await page.clock.setFixedTime(t);
  await prime(page);
  await openRoute(page, "/dashboard", DESKS[0]);
  for (const vp of DESKS) for (const r of DESK_ROUTES) {
    await page.setViewportSize(vp);
    await page.goto(r);
    await page.waitForTimeout(3500);
    await page.mouse.move(1, 1);
    writeFileSync(l1Path(L1_NAME, vp, r, "png"), await page.screenshot());
    const dom = await page.evaluate(() => (document.querySelector(".ws-main") ?? document.body).outerHTML.replace(/index-[A-Za-z0-9_-]+\.(js|css)/g, "index.$1"));
    writeFileSync(l1Path(L1_NAME, vp, r, "html"), dom);
  }
});

/**
 * ⚠️ THE DASHBOARD IS NOT DETERMINISTIC AT THE PIXEL, IN EITHER BUILD. Captured three times from the unchanged base, it
 * differed from itself (the chart's first pin flips between two antialiasing states; the founding card's tiles too) —
 * base against base by as much as base against head. So the claim is relative to the base's OWN variation: the closest
 * head capture may differ from the closest base capture by no more pixels than two base captures differ from each other.
 * On a deterministic page that envelope is 0, so the claim there is byte-for-byte equality, exactly as before. The DOM must
 * be identical on every page.
 */
const pxDiff = (page: Page, a: string, b: string) => page.evaluate(async ([A, B]) => {
  const load = (s: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
  const [ia, ib] = await Promise.all([load(A), load(B)]);
  if (ia.width !== ib.width || ia.height !== ib.height) return Number.MAX_SAFE_INTEGER;
  const data = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
  const da = data(ia), db = data(ib); let n = 0;
  for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) n++;
  return n;
}, [`data:image/png;base64,${readFileSync(a).toString("base64")}`, `data:image/png;base64,${readFileSync(b).toString("base64")}`] as const);

test("PA2-1 · S9 desktop compare", async ({ page }) => {
  test.skip(L1 !== "compare");
  const L = new Ledger(PART, "desktop");
  const names = (prefix: string) => ["", "2", "3"].map((n) => `${prefix}${n}`);
  for (const vp of DESKS) for (const r of DESK_ROUTES) {
    const bases = names("base").filter((n) => existsSync(l1Path(n, vp, r, "png")));
    const heads = names("head").filter((n) => existsSync(l1Path(n, vp, r, "png")));
    L.check("pop", `${vp.width} ${r}: two or more base captures and a head capture`, bases.length >= 2 && heads.length > 0, `${bases} / ${heads}`);
    if (bases.length < 2 || !heads.length) continue;
    let envelope = 0;
    for (let i = 0; i < bases.length; i++) for (let j = i + 1; j < bases.length; j++) envelope = Math.max(envelope, await pxDiff(page, l1Path(bases[i], vp, r, "png"), l1Path(bases[j], vp, r, "png")));
    let closest = Number.MAX_SAFE_INTEGER;
    for (const b of bases) for (const h of heads) closest = Math.min(closest, await pxDiff(page, l1Path(b, vp, r, "png"), l1Path(h, vp, r, "png")));
    const dom = bases.some((b) => heads.some((h) => readFileSync(l1Path(b, vp, r, "html"), "utf8") === readFileSync(l1Path(h, vp, r, "html"), "utf8")));
    L.check("S9", `${vp.width} ${r}: pixels within the base's own variation`, closest <= envelope, `head ${closest} px vs base-to-base ${envelope} px`);
    L.check("S9", `${vp.width} ${r}: DOM-identical to the base`, dom, "");
  }
  L.done(30);
});

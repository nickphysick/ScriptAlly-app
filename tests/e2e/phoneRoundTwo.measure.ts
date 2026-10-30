/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2 — phone round two v1 (30 Oct; ref design-refs/phone-round-two-v1/, picks p3 · f1 · c4 · t1 · n2 · land A ·
 * build B). Runs on the two phone projects (`iphone`: iPhone 13 on WebKit; `pixel`: Pixel 5 on Chromium), with touch.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   this build
 *   PR2_MUTATE=<lock>                         that lock's named CSS break (behaviour breaks are source edits, applied
 *                                             and undone by scripts/pr2-mutate.mjs)
 *   PR2_READINGS=<file>                       one JSON line of readings per lock
 *   PR2_LOOK=1                                the look pass only (screenshots of every surface)
 *
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION FIRST. ⚠️ A LOCK THAT WRITES DOES SO ON CHROMIUM ONLY AND PUTS THE ACCOUNT BACK
 * IN THE SAME RUN: Playwright's WebKit here cannot open Firestore's Write channel (phone fixes v1, F8), so on the iPhone
 * the write never leaves the page.
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query as fsq, updateDoc, where } from "firebase/firestore";
import { MUTATE, go, phone, record, snap } from "./pr2Lib";
import { engine } from "./touch";
import { devDb } from "./devWrite";
import { feedEntries } from "../../src/lib/dashFeed";
import { drawerSummary } from "../../src/lib/dashFeedDrawer";
import { scopeActivities } from "../../src/lib/manuscriptScope";
import { packageStage } from "../../src/lib/packagesV40";
import { isVersionSent } from "../../src/lib/versionLock";
import { resolveActivePackage } from "../../src/lib/packageMetrics";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../../src/types";

const LOOK = process.env.PR2_LOOK === "1";
const chromium = (page: Page) => engine(page) === "chromium";

/** the account, read-only */
async function account() {
  const { db, uid } = await devDb();
  const read = async <T,>(c: string) => (await getDocs(collection(db, "users", uid, c))).docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  return {
    db, uid,
    queries: await read<Query>("queries"), agents: await read<Agent>("agents"), manuscripts: await read<Manuscript>("manuscripts"),
    activities: await read<Activity>("activities"), packages: await read<SubmissionPackage>("packages"), versions: await read<ManuscriptVersion>("versions"),
  };
}
/** the manuscript the shell has in scope on the page (the shared active key, else the first) */
const scopedMs = async (page: Page, ms: Manuscript[]) => {
  const id = await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"));
  return ms.find((m) => m.id === id) ?? ms[0]!;
};
async function stepFlow(page: Page) {
  const pri = page.locator('[data-pf="primary"]');
  if (await pri.count() && await pri.isEnabled()) { const l = (await pri.textContent()) ?? ""; await pri.tap(); return l; }
  const opt = page.locator("[data-pf-step] button").first();
  if (await opt.count()) { await opt.tap(); return "(option)"; }
  return null;
}

const sweepGreen = (page: Page) => page.evaluate(() => {
  const hsl = (c: string) => {
    const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(c); if (!m) return null;
    if (m[4] !== undefined && Number(m[4]) < 0.05) return null;
    const [r, g, b] = [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0 };
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s };
  };
  const bad: string[] = []; let n = 0;
  const roots = [document.querySelector(".ws-app"), ...document.querySelectorAll(".pa-layer")].filter(Boolean) as Element[];
  for (const root of roots) for (const el of root.querySelectorAll<HTMLElement>("*")) {
    if (el.closest("[data-pc], img, picture")) continue;
    const r0 = el.getBoundingClientRect(); if (!r0.width || !r0.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
    n += 1;
    for (const [k, v] of [["bg", cs.backgroundColor], ["color", (el.textContent ?? "").trim() ? cs.color : ""], ["fill", cs.fill], ["stroke", cs.stroke]] as const) {
      const c = v ? hsl(v) : null;
      if (c && c.s > 0.12 && c.h >= 75 && c.h <= 165) bad.push(`${el.tagName}.${String(el.getAttribute("class") ?? "").slice(0, 40)} ${k} ${v}`);
    }
  }
  return { n, bad: bad.slice(0, 12) };
});

/* ═══ the look pass ═══ */
test.describe("PR2 look", () => {
  test.skip(!LOOK, "PR2_LOOK=1 for the look pass");
  test("every surface", async ({ page }) => {
    test.setTimeout(600_000);
    await phone(page, "/dashboard");
    if (process.env.PR2_SHOTS === "before") {
      /* Step 0: the base build (what dev served), at 390 and 360 */
      for (const [w, h] of [[390, 844], [360, 780]] as const) {
        await page.setViewportSize({ width: w, height: h });
        for (const [path, name] of [["/dashboard", "home"], ["/queries", "queries"], ["/todo", "todo"], ["/agents", "agents"], ["/manuscripts#packages", "ms-packages"], ["/manuscripts#materials", "ms-letters"], ["/manuscripts#versions", "ms-versions"], ["/manuscripts#comps", "ms-comps"]] as const) {
          await go(page, path); await page.waitForTimeout(900); await snap(page, `${name}-${w}`);
        }
      }
      return;
    }
    for (const [path, name] of [["/dashboard", "home"], ["/queries", "queries"], ["/agents", "agents"], ["/todo", "todo"], ["/queries/packages", "packages"], ["/queries/packages?build=new", "builder"], ["/queries/packages?comps=1", "comps"], ["/dashboard?activity=1", "activity-page"]] as const) {
      await go(page, path); await page.waitForTimeout(500); await snap(page, name);
    }
  });
});

test.describe("PR2 phone round two", () => {
  test.skip(LOOK, "the look pass only");

  /* R1 — the tab bar */
  test("R1 tab bar: Home · Queries · + · Packages · Agents, the badge on Home, every old To-do address opens To-do", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/dashboard");
    const bar = await page.evaluate(() => [...document.querySelectorAll('[data-pa="tabbar"] > button')].map((b) => (b as HTMLElement).dataset.tab ?? ((b as HTMLElement).dataset.pa === "plus" ? "+" : "?")));
    await go(page, "/todo");
    const tally = await page.evaluate(() => Number(document.querySelector('[data-pa="tally-earlier"]')?.textContent ?? "NaN") + Number(document.querySelector('[data-pa="tally-today"]')?.textContent ?? "NaN"));
    await go(page, "/queries");
    const badge = await page.evaluate(() => { const b = document.querySelector('[data-tab="home"] [data-pa="tab-badge"]'); return b ? Number(b.textContent) : 0; });
    const todoTabs = await page.locator('[data-tab="todo"]').count();
    const routes: Record<string, string> = {};
    for (const p of ["/todo", "/todo/corkboard", "/todo/calendar", "/todo/noteboard"]) {
      await go(page, p);
      routes[p] = await page.evaluate(() => `${location.pathname}|${document.title}`);
    }
    record("R1", { bar, tally, badge, todoTabs, routes });
    expect(bar).toEqual(["home", "queries", "+", "packages", "agents"]);
    expect(todoTabs, "To-do is not a tab").toBe(0);
    expect(Number.isFinite(tally), "the To-do tallies were read").toBe(true);
    expect(badge, "the Home badge counts what the To-do badge counted: from earlier + today").toBe(tally);
    for (const [p, r] of Object.entries(routes)) expect(r.startsWith("/todo"), `${p} → ${r}`).toBe(true);
  });

  /* R2 — the band's tiles are the filters; nothing is clipped at the sheet's top */
  test("R2 Queries: four tiles filter the list, a second tap clears, nothing clipped at the sheet's top", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/queries");
    await go(page, "/queries");
    /* WebKit here loads the activity log later than Chromium: the band's counts arrive first and the list holds its
       loading skeleton, so wait for the cards before tapping (measured: 0 cards behind a tile saying 16) */
    await page.locator('[data-qm1="list"] [data-pa="qcard"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    if (MUTATE === "R2") await page.addStyleTag({ content: ".pa-qbody > .pa-rows { transform: translateY(-14px) !important; }" });
    const tiles = await page.locator('[data-pa="band-tile"]').evaluateAll((els) => els.map((e) => ({ k: (e as HTMLElement).dataset.key!, n: Number((e as HTMLElement).dataset.count) })));
    const rows: { k: string; n: number; on: string | null; cards: number; courts: (string | undefined)[]; off: string | null }[] = [];
    for (const t of tiles) {
      const tile = page.locator(`[data-pa="band-tile"][data-key="${t.k}"]`);
      await tile.tap(); await page.waitForTimeout(350);
      const on = await tile.getAttribute("aria-pressed");
      const cards = await page.locator('[data-qm1="list"] [data-pa="qcard"]').count();
      const courts = await page.locator('[data-qm1="list"] [data-pa="qcard"]').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.court))]);
      await tile.tap(); await page.waitForTimeout(350);
      rows.push({ ...t, on, cards, courts, off: await tile.getAttribute("aria-pressed") });
    }
    const clip = await page.evaluate(() => {
      const sheet = document.querySelector<HTMLElement>(".pa-qbody")!.getBoundingClientRect().top;
      return [...document.querySelectorAll<HTMLElement>(".pa-qbody > *")].map((c) => ({ c: c.className, d: Math.round((c.getBoundingClientRect().top - sheet) * 10) / 10 }));
    });
    record("R2", { tiles, rows, clip });
    expect(tiles.map((t) => t.k)).toEqual(["you", "agent", "quiet", "closed"]);
    expect(tiles.reduce((n, t) => n + t.n, 0), "the tiles count something").toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.on, `${r.k} pressed`).toBe("true");
      expect(r.cards, `${r.k}: the list shows exactly the tile's count`).toBe(r.n);
      if (r.cards) expect(r.courts, `${r.k}: only that court`).toEqual([r.k]);
      expect(r.off, `${r.k}: a second tap clears it`).toBe("false");
    }
    expect(clip.length).toBeGreaterThan(0);
    for (const c of clip) expect(c.d, `${c.c} sits at least 8px below the sheet's top`).toBeGreaterThanOrEqual(8);
  });

  /* R3 — a query is a card */
  test("R3 Queries: each card's strip is its court's colour, the track fills to the stage, closed has no track", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/queries");
    await go(page, "/queries");
    const cards = await page.locator('[data-qm1="list"] [data-pa="qcard"]').evaluateAll((els) => els.map((e) => {
      const strip = getComputedStyle(e.querySelector<HTMLElement>('[data-pa="qcard-strip"]')!).backgroundColor;
      const track = e.querySelector<HTMLElement>('[data-pa="qcard-track"]');
      const segs = track ? [...track.querySelectorAll("i")].map((i) => getComputedStyle(i).backgroundColor) : null;
      return { court: (e as HTMLElement).dataset.court!, strip, step: track ? Number(track.dataset.step) : null, segs };
    }));
    const STRIP: Record<string, string> = { you: "rgb(245, 230, 223)", agent: "rgb(247, 239, 227)", quiet: "rgb(228, 225, 219)", closed: "rgb(228, 225, 219)" };
    const FILL = { you: "rgb(232, 200, 188)", other: "rgb(42, 58, 82)" };
    record("R3", { n: cards.length, byCourt: Object.fromEntries(["you", "agent", "quiet", "closed"].map((k) => [k, cards.filter((c) => c.court === k).length])), sample: cards.slice(0, 3) });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.filter((c) => c.court === "you").length, "a card with you").toBeGreaterThan(0);
    expect(cards.filter((c) => c.court === "agent" || c.court === "quiet").length, "a card with the agent").toBeGreaterThan(0);
    for (const c of cards) {
      expect(c.strip, `${c.court} strip`).toBe(STRIP[c.court]);
      if (c.court === "closed") { expect(c.segs, "a closed query has no track").toBeNull(); continue; }
      expect(c.segs?.length, "four steps").toBe(4);
      const fill = c.court === "you" ? FILL.you : FILL.other;
      c.segs!.forEach((s, i) => expect(s === fill, `${c.court} step ${i} of ${c.step}`).toBe(i <= c.step!));
    }
  });

  /* R4 — Agents: the ring and the tiles */
  test("R4 Agents: the arc is queried ÷ list, and the tiles are two columns at 360 and 390", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/agents");
    const out: Record<string, { queried: number; onlist: number; shownQd: number; pct: number; tiles: number; tilesQueried: number; cols: number; wide: number }> = {};
    for (const w of [390, 360]) {
      await page.setViewportSize({ width: w, height: w === 360 ? 780 : 844 });
      await go(page, "/agents");
      out[w] = await page.evaluate(() => {
        const band = document.querySelector<HTMLElement>('[data-pa="agents-band"]')!;
        const tiles = [...document.querySelectorAll<HTMLElement>('[data-pa="ag-row"]')];
        const grid = document.querySelector<HTMLElement>('[data-pa="ag-tiles"]');
        return {
          queried: Number(band.dataset.queried), onlist: Number(band.dataset.onlist), shownQd: Number(band.querySelector('[data-pa="ag-qd"]')?.textContent),
          pct: Number(band.querySelector<SVGElement>('[data-pa="ag-ring-arc"]')?.dataset.pct ?? 0),
          tiles: tiles.length, tilesQueried: tiles.filter((t) => t.dataset.stand !== "none").length,
          cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0, wide: document.documentElement.scrollWidth - innerWidth,
        };
      });
    }
    record("R4", out);
    for (const [w, r] of Object.entries(out)) {
      expect(r.tiles, `${w}: tiles drawn`).toBeGreaterThan(0);
      expect(r.onlist, `${w}: the ring's list is every tile`).toBe(r.tiles);
      expect(r.shownQd, `${w}: "{q} of {n} queried" counts agents queried`).toBe(r.tilesQueried);
      expect(Math.abs(r.pct - r.tilesQueried / r.tiles), `${w}: the arc`).toBeLessThan(0.001);
      expect(r.cols, `${w}: two columns`).toBe(2);
      expect(r.wide, `${w}: nothing wider than the screen`).toBeLessThanOrEqual(0);
    }
  });

  /* R5 — Activity */
  test("R5 Activity: Home's five are the desktop feed's first five, the page's figures are the drawer's", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/dashboard");
    await go(page, "/dashboard");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    const now = new Date();
    const entries = feedEntries({ activities: scopeActivities(a.activities, ms.id), queries: a.queries, agents: a.agents, manuscripts: a.manuscripts, now, seenAt: null, honestDates: true });
    const sum = drawerSummary(entries);
    if (entries.length) await page.locator('[data-pa="home-activity"] [data-pa="act-row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    const home = await page.locator('[data-pa="home-activity"] [data-pa="act-row"]').evaluateAll((els) => els.map((e) => ({ id: (e as HTMLElement).dataset.id!, need: (e as HTMLElement).dataset.need ?? "0", act: !!e.querySelector('[data-pa="act-action"]') })));
    await go(page, "/dashboard?activity=1");
    await page.locator('[data-pa="activity-page"]').waitFor({ timeout: 15_000 });
    if (entries.length) await page.locator('[data-pa="activity-page"] [data-pa="act-row"]').first().waitFor({ timeout: 30_000 });
    const figs = await page.locator('[data-pa="act-sum"]').evaluateAll((els) => Object.fromEntries(els.map((e) => [(e as HTMLElement).dataset.k, Number((e as HTMLElement).dataset.n)])));
    const pageIds = await page.locator('[data-pa="activity-page"] [data-pa="act-row"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
    const needRows = await page.locator('[data-pa="activity-page"] [data-pa="act-row"][data-need="1"]').count();
    let flow: string | null = null;
    if (needRows) {
      await page.locator('[data-pa="activity-page"] [data-pa="act-action"]').first().tap();
      await page.locator(".pa-flow").waitFor({ timeout: 10_000 }).catch(() => {});
      flow = await page.evaluate(() => document.querySelector<HTMLElement>(".pa-flow")?.dataset.pf ?? null);
      if (flow) { await page.locator('.pa-flow [data-pf="close"]').tap(); await page.waitForTimeout(400); }
    }
    const needWant = entries.filter((e) => e.need && e.queryId).length;
    record("R5", { ms: ms.id, entries: entries.length, expect5: entries.slice(0, 5).map((e) => e.id), home, figs, sum, pageN: pageIds.length, needRows, needWant, flow });
    expect(entries.length, "the account has activity in the window").toBeGreaterThan(0);
    expect(home.length).toBeLessThanOrEqual(5);
    expect(home.map((h) => h.id), "Home's events are the desktop feed's first five").toEqual(entries.slice(0, 5).map((e) => e.id));
    expect(pageIds, "the page lists every event").toEqual(entries.map((e) => e.id));
    expect(figs).toEqual({ replies: sum.replies, did: sum.did, need: sum.need });
    /* the action branch: where the account holds no request in the window it is reported as not exercised, never passed */
    expect(needRows, "the page offers exactly the requests the derivation marks").toBe(needWant);
    for (const h of home) expect(h.act, `${h.id}: an action exactly where it still needs the writer`).toBe(h.need === "1");
    if (needRows) expect(flow, "the action opens the flow").toMatch(/^(sent|offer)$/);
  });

  /* R6 — To-do */
  test("R6 To-do: one Up next card, no verb on any row, a tick opens the task's door and completes nothing", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/todo");
    await go(page, "/todo");
    const up = await page.locator('[data-pa="todo-upnext"]').evaluateAll((els) => els.map((e) => ({ key: (e as HTMLElement).dataset.key, bucket: (e as HTMLElement).dataset.bucket })));
    const verbs = await page.locator('[data-pa="task-row"] [data-pa="verb"]').count();
    const rowsN = await page.locator('[data-pa="task-row"]').count();
    const pick = page.locator('[data-pa="task-row"]:not([data-type=""])').first();
    const key = await pick.getAttribute("data-key");
    const type = await pick.getAttribute("data-type");
    await pick.locator('[data-pa="tick"]').tap();
    await page.waitForTimeout(900);
    const opened = await page.evaluate(() => ({ flow: document.querySelector<HTMLElement>(".pa-flow")?.dataset.pf ?? null, card: !!document.querySelector("[data-ac], .ac-root, .agc-root, [data-agent-card]"), ask: !!document.querySelector('[data-pa="done-ask"]') }));
    if (opened.flow) { await page.locator('.pa-flow [data-pf="close"]').tap().catch(() => {}); await page.waitForTimeout(500); }
    await page.keyboard.press("Escape").catch(() => {});
    await go(page, "/todo");
    const still = await page.locator(`[data-pa="task-row"][data-key="${key}"], [data-pa="todo-upnext"][data-key="${key}"]`).count();
    record("R6", { up, verbs, rowsN, key, type, opened, still });
    expect(rowsN, "the checklist has rows").toBeGreaterThan(0);
    expect(up.length, "exactly one Up next").toBe(1);
    expect(verbs, "no verb button on any row").toBe(0);
    expect(!!opened.flow || opened.card, "the tick opened the task's own door").toBe(true);
    expect(opened.ask, "a query's task is never ticked off outright").toBe(false);
    expect(still, "and completed nothing: the task is still there").toBeGreaterThan(0);
  });

  /* R7 — the Packages page against the desktop */
  test("R7 Packages: the active card, What's landing and the labels are the desktop's", async ({ page }) => {
    test.setTimeout(400_000);
    await phone(page, "/queries/packages");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    const pkgs = a.packages.filter((p) => p.manuscriptId === ms.id);
    const wasRaw = ms.activePackageId;
    const wasActive = resolveActivePackage(ms, pkgs)?.id ?? null;
    const target = pkgs.find((p) => p.status !== "Retired" && (packageStage(p) === "out" || packageStage(p) === "ready"));
    expect(target, "a package that can be used for new queries").toBeTruthy();
    const undo: (() => Promise<unknown>)[] = [];
    try {
      if (!wasActive) {
        /* set the active package through the page's own control (Chromium; WebKit writes nothing here), then put it back */
        if (chromium(page)) {
          await go(page, `/queries/packages?pkg=${target!.id}`);
          await page.locator('[data-pa="pkg-use"]').first().tap();
        } else await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), { activePackageId: target!.id });
        undo.push(() => updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), { activePackageId: wasRaw === undefined ? deleteField() : wasRaw }));
        await page.waitForTimeout(2000);
      }
      await go(page, "/queries/packages");
      await page.waitForTimeout(800);
      const after = (await getDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id))).data() as Manuscript;
      const phoneRead = await page.evaluate(() => ({
        active: document.querySelector<HTMLElement>('[data-pa="pk-active"]')?.dataset.id ?? null,
        shows: [...document.querySelectorAll<HTMLElement>('[data-pa="pk-show"]')].map((s) => `${s.dataset.k}:${s.dataset.id}`),
        stages: Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-pa="pk-row"]')].map((r) => [r.dataset.id, r.dataset.stage])),
        inuse: [...document.querySelectorAll<HTMLElement>('[data-pa="pk-shelf"] [data-pa="pk-sheet"][data-inuse="1"]')].map((s) => `${s.closest<HTMLElement>("[data-kind]")!.dataset.kind}:${s.dataset.id}`),
      }));
      /* the desktop page, in the same browser, at 1440 */
      const vp = page.viewportSize()!;
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(2000);
      const desk = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pk38="show"]')].map((s) => s.dataset.show!));
      await page.setViewportSize(vp);
      const deskBest = Object.fromEntries(desk.filter((d) => !d.startsWith("none:")).map((d) => { const [k, id] = d.split(":"); return [k === "best" ? "pk" : k, id]; }).filter(([k]) => ["pk", "let", "ver", "syn"].includes(k!)));
      const phoneBest = Object.fromEntries(phoneRead.shows.map((s) => s.split(":")).filter(([k]) => k !== "comp"));
      const stagesWant = Object.fromEntries(pkgs.map((p) => [p.id, packageStage(p)]));
      const activePkg = resolveActivePackage(after, pkgs);
      record("R7", { ms: ms.id, wasActive, nowActive: after.activePackageId ?? null, phoneRead, desk, deskBest, phoneBest, stagesWant });
      expect(Object.keys(phoneRead.stages).length, "packages listed").toBeGreaterThan(0);
      expect(desk.length, "the desktop results were read").toBeGreaterThan(0);
      expect(activePkg, "a package is active for the comparison").toBeTruthy();
      expect(phoneRead.active, "the active card is the desktop's active package (resolveActivePackage)").toBe(activePkg!.id);
      expect(phoneBest, "What's landing's best is the desktop results' best").toEqual(deskBest);
      expect(phoneRead.stages, "the lifecycle labels are the desktop's").toEqual(stagesWant);
      /* the desktop's in-use rule (usePk26Model rowsOf): in the active package AND not put away */
      const letterLive = a.versions.find((v) => v.id === activePkg?.queryLetterVersionId && v.status !== "Retired");
      if (letterLive) expect(phoneRead.inuse, "the in-use letter is ringed").toContain(`let:${letterLive.id}`);
      const synLive = a.versions.find((v) => v.id === activePkg?.synopsisVersionId && v.status !== "Retired");
      if (synLive) expect(phoneRead.inuse, "the in-use synopsis is ringed").toContain(`syn:${synLive.id}`);
      expect(phoneRead.inuse.filter((x) => x.startsWith("let:") || x.startsWith("syn:")).sort(), "nothing else is ringed")
        .toEqual([letterLive ? `let:${letterLive.id}` : null, synLive ? `syn:${synLive.id}` : null].filter(Boolean).sort());
    } finally { for (const u of undo.reverse()) await u().catch(() => {}); }
  });

  /* R8 — locking */
  test("R8 a package that has gone out is locked: the note, no Edit, and Make a copy makes an unsent copy", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/queries/packages");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    const out = a.packages.filter((p) => p.manuscriptId === ms.id && packageStage(p) === "out")[0];
    expect(out, "a package out with agents").toBeTruthy();
    await go(page, `/queries/packages?pkg=${out!.id}`);
    const read = await page.evaluate(() => ({ note: !!document.querySelector('[data-pa="pkg-locked"]'), edit: document.querySelectorAll('[data-pa="pkg-edit"]').length, copy: !!document.querySelector('[data-pa="pkg-copy"]'), state: document.querySelector<HTMLElement>('[data-pa="pkg-state"]')?.dataset.stage }));
    let copy: SubmissionPackage | null = null;
    try {
      if (chromium(page)) {
        const before = new Set(a.packages.map((p) => p.id));
        await page.locator('[data-pa="pkg-copy"]').tap();
        for (let t = 0; t < 15 && !copy; t++) {
          await page.waitForTimeout(1000);
          copy = (await getDocs(collection(a.db, "users", a.uid, "packages"))).docs.map((d) => ({ id: d.id, ...d.data() }) as SubmissionPackage).find((p) => !before.has(p.id)) ?? null;
        }
      }
      record("R8", { out: out!.id, read, copy: copy ? { id: copy.id, from: copy.copiedFromId, stage: packageStage(copy), sent: copy.firstSentAt ?? null } : null });
      expect(read.state).toBe("out");
      expect(read.note, "the lock note").toBe(true);
      expect(read.edit, "no Edit").toBe(0);
      expect(read.copy, "Make a copy").toBe(true);
      if (chromium(page)) {
        expect(copy, "a copy was made").toBeTruthy();
        expect(copy!.copiedFromId).toBe(out!.id);
        expect(copy!.firstSentAt ?? null, "the copy has not gone out").toBeNull();
        expect(packageStage(copy!), "and is not locked").not.toBe("out");
        for (const k of ["queryLetterVersionId", "synopsisVersionId", "bookVersionId"] as const) expect(copy![k] ?? "", `${k}`).toBe(out![k] ?? "");
        expect([...(copy!.extraIds ?? [])].sort()).toEqual([...(out!.extraIds ?? [])].sort());
      }
    } finally { if (copy) await deleteDoc(doc(a.db, "users", a.uid, "packages", copy.id)).catch(() => {}); }
  });

  /* R9 — the builder */
  test("R9 the builder: version, letter, synopsis, extras; a letter fills the email; Mark as ready makes it Ready", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/queries/packages");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    await go(page, "/queries/packages?build=new");
    const order = await page.locator('[data-pa="build-slot"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.k));
    await page.locator('[data-pa="build-slot"][data-k="let"]').tap();
    await page.locator('[data-pa="build-picker"] [data-pa="pick-row"]').first().waitFor({ timeout: 10_000 });
    const letterName = (await page.locator('[data-pa="build-picker"] [data-pa="pick-row"] b').first().evaluate((b) => (b.childNodes[0]?.textContent ?? "").trim()));
    await page.locator('[data-pa="build-picker"] [data-pa="pick-row"]').first().tap();
    await page.waitForTimeout(500);
    const filled = await page.evaluate(() => ({ step: document.querySelector<HTMLElement>('[data-pa="build-step"][data-k="let"]')?.dataset.ok, slot: document.querySelector('[data-pa="build-slot"][data-k="let"] b')?.textContent?.trim() }));
    if (!(await page.locator('[data-pa="build-step"][data-k="ver"][data-ok="1"]').count())) {
      await page.locator('[data-pa="build-slot"][data-k="ver"]').tap();
      await page.locator('[data-pa="build-picker"] [data-pa="pick-row"]').first().tap();
      await page.waitForTimeout(500);
    }
    let made: SubmissionPackage | null = null;
    const before = new Set(a.packages.map((p) => p.id));
    try {
      if (chromium(page)) {
        await page.locator('[data-pa="build-ready"]').tap();
        for (let t = 0; t < 15; t++) {
          await page.waitForTimeout(1000);
          made = (await getDocs(collection(a.db, "users", a.uid, "packages"))).docs.map((d) => ({ id: d.id, ...d.data() }) as SubmissionPackage).find((p) => !before.has(p.id)) ?? null;
          if (made && made.queryLetterVersionId) break;
        }
      }
      record("R9", { order, letterName, filled, made: made ? { id: made.id, stage: packageStage(made), let: made.queryLetterVersionId, ver: made.bookVersionId ?? null } : null });
      expect(order).toEqual(["ver", "let", "syn", "ext"]);
      expect(letterName.length, "a letter to choose").toBeGreaterThan(0);
      expect(filled.step, "the Letter step ticks").toBe("1");
      expect(filled.slot, "the email card names the letter").toBe(letterName);
      if (chromium(page)) {
        expect(made, "the package was saved").toBeTruthy();
        expect(packageStage(made!), "Mark as ready leaves it Ready").toBe("ready");
      }
    } finally {
      if (made) {
        await deleteDoc(doc(a.db, "users", a.uid, "packages", made.id)).catch(() => {});
        const m = (await getDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id))).data() as Manuscript;
        if (m.activePackageId === made.id) await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), ms.activePackageId ? { activePackageId: ms.activePackageId } : { activePackageId: deleteField() }).catch(() => {});
      }
    }
  });

  /* R10 — a sent letter saves as a new version */
  test("R10 editing a letter that has gone out saves a new version and leaves the old text byte-identical", async ({ page }) => {
    test.setTimeout(300_000);
    test.skip(!chromium(page), "a write: Chromium only (WebKit cannot reach Firestore's Write channel here)");
    await phone(page, "/queries/packages");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    const sent = a.versions.filter((v) => v.manuscriptId === ms.id && v.componentType === "Query Letter" && isVersionSent(v.id, a.queries, a.packages))[0];
    expect(sent, "a letter that has gone out").toBeTruthy();
    const textBefore = sent!.contentDraft ?? "";
    await go(page, `/queries/packages?edit=${sent!.id}`);
    await page.locator('[data-pmx="text"]').waitFor({ timeout: 15_000 });
    const gone = await page.locator('[data-pmx="gone"]').textContent().catch(() => null);
    await page.locator('[data-pmx="text"]').fill(`${textBefore}\n\nWith thanks.`);
    const before = new Set(a.versions.map((v) => v.id));
    await page.locator('[data-pmx="save"]').tap();
    let fresh: ManuscriptVersion | null = null;
    for (let t = 0; t < 15 && !fresh; t++) {
      await page.waitForTimeout(1000);
      fresh = (await getDocs(collection(a.db, "users", a.uid, "versions"))).docs.map((d) => ({ id: d.id, ...d.data() }) as ManuscriptVersion).find((v) => !before.has(v.id)) ?? null;
    }
    try {
      const old = (await getDoc(doc(a.db, "users", a.uid, "versions", sent!.id))).data() as ManuscriptVersion;
      record("R10", { sent: sent!.id, name: sent!.versionName, gone, fresh: fresh ? { id: fresh.id, name: fresh.versionName } : null, oldSame: (old.contentDraft ?? "") === textBefore });
      expect(gone, "the editor says it saves as a new version").toMatch(/has gone out, so your changes save as/);
      expect(fresh, "a new version was saved").toBeTruthy();
      expect(fresh!.contentDraft).toBe(`${textBefore}\n\nWith thanks.`);
      expect(old.contentDraft ?? "", "the sent letter's text is byte-identical").toBe(textBefore);
    } finally { if (fresh) await deleteDoc(doc(a.db, "users", a.uid, "versions", fresh.id)).catch(() => {}); }
  });

  /* R11 — comps */
  test("R11 comps: the tick list writes compIds, a sent letter's list is read-only, the age chip is blush past five years", async ({ page }) => {
    test.setTimeout(300_000);
    await phone(page, "/queries/packages");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    /* the harness manuscript holds no comps, so the lock lends it three for the run — two, exactly five and twelve years
       old, so the five-year boundary is actually tested — and takes them back in `finally` */
    const y = new Date().getFullYear();
    const hadComps = ms.comps;
    const lent = [{ id: "cmp_pr2a", title: "PR2 Recent", author: "A. Writer", year: y - 2 }, { id: "cmp_pr2b", title: "PR2 Five", author: "B. Writer", year: y - 5 }, { id: "cmp_pr2c", title: "PR2 Older", author: "C. Writer", year: y - 12 }];
    await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), { comps: [...(hadComps ?? []), ...lent] });
    await page.waitForTimeout(1500);
    await go(page, "/queries/packages?comps=1");
    /* the lent comps reach WebKit's listener later than Chromium's: wait for the cards themselves */
    await page.locator('[data-pa="comp-card"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const ages = await page.locator('[data-pa="comp-card"]').evaluateAll((els) => els.map((e) => ({ age: (e as HTMLElement).dataset.age, old: (e as HTMLElement).dataset.old, chip: e.querySelector('[data-pa="comp-age"]')?.className ?? null })));
    const letters = a.versions.filter((v) => v.manuscriptId === ms.id && v.componentType === "Query Letter" && v.status !== "Retired");
    const sentL = letters.find((v) => isVersionSent(v.id, a.queries, a.packages) && Array.isArray(v.compIds));
    const free = letters.find((v) => !isVersionSent(v.id, a.queries, a.packages));
    let fixed: string | null = null;
    if (sentL) { await go(page, `/queries/packages?compsin=${sentL.id}`); fixed = await page.locator('[data-pa="compsin"]').getAttribute("data-fixed"); }
    let wrote: string[] | null = null;
    const before = free?.compIds;
    try {
      if (free && chromium(page)) {
        await go(page, `/queries/packages?compsin=${free.id}`);
        const row = page.locator('[data-pa="compsin-row"]').first();
        await row.waitFor({ timeout: 15_000 });
        const id = await row.getAttribute("data-id");
        const wasOn = (await row.getAttribute("data-on")) === "1";
        await row.tap(); await page.locator('[data-pa="compsin-save"]').tap();
        for (let t = 0; t < 10; t++) { await page.waitForTimeout(800); const v = (await getDoc(doc(a.db, "users", a.uid, "versions", free.id))).data() as ManuscriptVersion; if (Array.isArray(v.compIds) && v.compIds.includes(id!) !== wasOn) { wrote = v.compIds; break; } }
      }
      record("R11", { ages, sentL: sentL?.id ?? null, fixed, free: free?.id ?? null, wrote });
      expect(ages.length, "comps listed").toBeGreaterThan(0);
      expect(ages.filter((x) => x.age).length, "comps with a year").toBeGreaterThan(0);
      expect(ages.some((x) => x.age === "5"), "a comp exactly five years old (the boundary)").toBe(true);
      for (const g of ages.filter((x) => x.age)) expect(g.old === "1", `age ${g.age}`).toBe(Number(g.age) > 5);
      for (const g of ages.filter((x) => x.age)) expect((g.chip ?? "").includes("old"), `chip at age ${g.age}`).toBe(Number(g.age) > 5);
      if (sentL) expect(fixed, "a sent letter's comps are read-only").toBe("1");
      if (free && chromium(page)) expect(wrote, "ticking writes the letter's compIds").toBeTruthy();
    } finally {
      if (free && wrote) await updateDoc(doc(a.db, "users", a.uid, "versions", free.id), before === undefined ? { compIds: deleteField() } : { compIds: before }).catch(() => {});
      await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), hadComps === undefined ? { comps: deleteField() } : { comps: hadComps }).catch(() => {});
    }
  });

  /* R12 — what you sent */
  test("R12 Log a query: What did you send lists the active package first, at least two real options", async ({ page }) => {
    test.setTimeout(400_000);
    await phone(page, "/queries");
    const a = await account();
    const ms = await scopedMs(page, a.manuscripts);
    const queried = new Set(a.queries.filter((q) => q.manuscriptId === ms.id).map((q) => q.agentId));
    const agent = a.agents.filter((x) => !queried.has(x.id) && (x.name ?? "").trim().length > 2)[engine(page) === "webkit" ? 1 : 0];
    expect(agent, "an agent with no query on this book").toBeTruthy();
    const pkgs = a.packages.filter((p) => p.manuscriptId === ms.id);
    const wasRaw = ms.activePackageId;
    const wasActive = resolveActivePackage(ms, pkgs);
    const target = wasActive ?? pkgs.find((p) => p.status !== "Retired" && packageStage(p) !== "draft");
    expect(target, "a package that can go").toBeTruthy();
    if (!wasActive) await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), { activePackageId: target!.id });
    const made: string[] = [];
    try {
      await go(page, "/queries");
      await page.waitForTimeout(1500);
      await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap();
      await page.locator('.pa-flow[data-pf="log"]').waitFor({ timeout: 15_000 });
      await page.locator("[data-qad-agent-input]").fill(agent!.name!);
      await page.waitForTimeout(400);
      await page.locator("[data-qad-sugg] button").filter({ hasText: agent!.name! }).first().tap();
      let read: { opts: { pa: string; id: string; now: string; h: number }[]; first: string | null } | null = null;
      for (let i = 0; i < 8 && !read; i++) {
        await page.waitForTimeout(450);
        const step = await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step") ?? "check");
        if (step === "What you sent") {
          if (MUTATE === "R12") await page.addStyleTag({ content: ".pa-flow .pa-logopt { height: 2px !important; min-height: 0 !important; padding: 0 !important; overflow: hidden !important; }" });
          read = await page.evaluate(() => {
            const opts = [...document.querySelectorAll<HTMLElement>('[data-pa="log-sent"] > button')].map((b) => ({ pa: b.dataset.pa!, id: b.dataset.id ?? "", now: b.dataset.now ?? "", h: Math.round(b.getBoundingClientRect().height) }));
            return { opts, first: opts[0]?.id ?? null };
          });
          break;
        }
        if (!(await stepFlow(page))) break;
      }
      expect(read, "reached What did you send?").toBeTruthy();
      const visible = read!.opts.filter((o) => o.h > 40);
      let saved: Query | null = null;
      if (chromium(page)) {
        await page.locator('[data-pa="log-pkg"][data-now="1"]').tap();
        const qsBefore = new Set(a.queries.map((q) => q.id));
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(450);
          const l = await stepFlow(page);
          if (!l || (/^Log/.test(l) && !/^Logging/.test(l))) break;
        }
        for (let t = 0; t < 15 && !saved; t++) {
          await page.waitForTimeout(1000);
          const d = (await getDocs(collection(a.db, "users", a.uid, "queries"))).docs.find((x) => !qsBefore.has(x.id) && x.data().agentId === agent!.id);
          if (d) { saved = { id: d.id, ...d.data() } as Query; made.push(d.id); }
        }
      }
      record("R12", { opts: read!.opts, visible: visible.length, active: target!.id, saved: saved ? { id: saved.id, sentPackageId: saved.sentPackageId ?? null, sentHow: saved.sentHow ?? null } : null });
      expect(read!.first, "the active package first").toBe(target!.id);
      expect(read!.opts[0]!.now).toBe("1");
      expect(visible.length, "at least two options over 40px tall").toBeGreaterThanOrEqual(2);
      if (chromium(page)) expect(saved?.sentPackageId, "the query records the package").toBe(target!.id);
    } finally {
      for (const id of made) {
        for (const x of (await getDocs(collection(a.db, "users", a.uid, "queries", id, "activity"))).docs) await deleteDoc(x.ref).catch(() => {});
        for (const c of ["activities", "taskFlags", "tasks"]) for (const r of (await getDocs(fsq(collection(a.db, "users", a.uid, c), where("queryId", "==", id)))).docs) await deleteDoc(r.ref).catch(() => {});
        await deleteDoc(doc(a.db, "users", a.uid, "queries", id)).catch(() => {});
      }
      /* the package was stamped as sent by that query; a package that had never gone out gets its stamp taken back */
      const p = (await getDoc(doc(a.db, "users", a.uid, "packages", target!.id))).data() as SubmissionPackage | undefined;
      if (made.length && !target!.firstSentAt && p?.firstSentAt) await updateDoc(doc(a.db, "users", a.uid, "packages", target!.id), { firstSentAt: deleteField() }).catch(() => {});
      if (!wasActive) await updateDoc(doc(a.db, "users", a.uid, "manuscripts", ms.id), { activePackageId: wasRaw === undefined ? deleteField() : wasRaw }).catch(() => {});
    }
  });

  /* R13 — no green on a phone */
  test("R13 no green: no fill, background or text on any phone page has a hue in 75°–165° above 12% saturation", async ({ page }) => {
    test.setTimeout(400_000);
    await phone(page, "/dashboard");
    const offenders: Record<string, string[]> = {};
    let counted = 0;
    for (const path of ["/dashboard", "/dashboard?activity=1", "/queries", "/todo", "/agents", "/queries/packages", "/queries/packages?comps=1"]) {
      await go(page, path);
      if (MUTATE === "R13") await page.addStyleTag({ content: ".pa-fill-sage { background: #e0e5dd !important; }" });
      await page.waitForTimeout(400);
      const r = await sweepGreen(page);
      counted += r.n;
      if (r.bad.length) offenders[path] = r.bad;
    }
    /* the Log a query flow too: its "What did you send?" step can carry a match note, which the drawer dresses in sage */
    await go(page, "/queries"); await page.waitForTimeout(1200);
    await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap();
    await page.locator('.pa-flow[data-pf="log"]').waitFor({ timeout: 15_000 });
    await page.locator("[data-qad-agent-input]").fill("a"); await page.waitForTimeout(500);
    await page.locator("[data-qad-sugg] button").first().tap();
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(450);
      if ((await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step"))) === "What you sent") break;
      if (!(await stepFlow(page))) break;
    }
    const pkgOpt = page.locator('[data-pa="log-pkg"]').first();
    if (await pkgOpt.count()) { await pkgOpt.tap(); await page.waitForTimeout(500); }
    if (MUTATE === "R13") await page.addStyleTag({ content: ".pa-fill-sage { background: #e0e5dd !important; }" });
    const fr = await sweepGreen(page);
    counted += fr.n;
    if (fr.bad.length) offenders["log flow"] = fr.bad;
    await page.locator('.pa-flow [data-pf="close"]').tap().catch(() => {}); await page.waitForTimeout(300);
    const discard = page.locator(".pa-flow button").filter({ hasText: /^Discard$/ });
    if (await discard.count()) await discard.first().tap().catch(() => {});
    record("R13", { counted, offenders });
    expect(counted, "elements swept").toBeGreaterThan(500);
    expect(offenders).toEqual({});
  });
});

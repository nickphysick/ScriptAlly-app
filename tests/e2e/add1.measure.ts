/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retire the add-agent pop-up — locks ADD1-A1 to ADD1-A4, on the rendered page at 1512 × 900 and 1280 × 800.
 *
 *   A1 every route: each live "Add an agent" door opens the slide-in new-agent panel in add mode, and no centred add
 *      dialog (the old pop-up, or the centred agent card) is in the DOM.
 *   A2 stays put: an add from the Dashboard never changes the URL, and the Dashboard's agent total rises by one with no
 *      reload.
 *   A3 hand-back: Log a query → a new name → add → save: the new agent is the one picked in the log flow.
 *   A4 gone: the pop-up's strings and its component name are nowhere in the built bundle.
 *
 * Each lock was run against the build before the pack (dev as it was, with the pop-up; `ADD1_BASE=1`, ledger
 * `base-<lock>.json`) and under its named mutation (`ADD1_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was
 * believed. Every mutation here is a `src` edit made and undone in this pack's worktree from a path-derived backup;
 * `ADD1_MUTATE` names the ledger only:
 *   A1  Dash58.tsx: the header's "Add an agent" calls `openNewAgentCard({ from: "button" })` — no host, so the centred card
 *   A2  App.tsx: the "Add an agent" interception navigates to /agents after opening the panel
 *   A3  agentCardStore.ts: `completeNewAgent` no longer calls the request's `onCreated`
 *   A4  App.tsx: the deleted AddAgentFocusForm restored from git, imported and mounted closed
 *
 * ⚠️ THE DASHBOARD HEADER'S "Add an agent" IS ONLY SHOWN FROM 1440 UP (by design): at 1280 A1 asserts it is hidden and
 *    tests the other doors; A2 uses the top bar's capture there.
 * ⚠️ A2 AND A3 SAVE A REAL AGENT, AND THE HARNESS ACCOUNT IS FREE AND OVER THE CAP: `withPro` (add1Admin.ts) lifts the
 *    plan with admin credentials for the length of the test and restores it exactly, then removes every `zzadd1-` agent
 *    and everything naming it, and checks the agent count is back.
 * ⚠️ AN ADD TICKS THE CONTACT LIST'S GUIDE, AND THE LOG DRAWER MAY TICK THE QUERY CENTRE'S: both are recorded and put back.
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read is of the visible copy (box height > 0).
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { openRoute } from "./measure";
import { ADD1_PREFIX, withPro } from "./add1Admin";

const DIR = "reports/retire-add-agent-modal";
const MUT = process.env.ADD1_MUTATE ?? "";
const BASE = process.env.ADD1_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = (pg: string) => sh(`node tests/e2e/guideFlags.mjs --page ${pg}`).trim().split("\n").pop()!;
const guideRestore = (pg: string, json: string) => sh(`node tests/e2e/guideFlags.mjs --page ${pg} --restore '${json}'`);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const mine = MUT === this.name;
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${mine ? `mut-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** both guides recorded and put back exactly */
const withGuides = async (fn: () => Promise<void>) => {
  const c0 = guideNow("contacts"), q0 = guideNow("queries");
  try { await fn(); } finally { await new Promise((r) => setTimeout(r, 1500)); guideRestore("contacts", c0); guideRestore("queries", q0); }
};

/** what is on screen: the new-agent panel, and any OTHER dialog (the log drawer excepted — the log door opens over it) */
const readState = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
  const panels = [...document.querySelectorAll("[data-ap='panel-new']")].filter(vis);
  const p = panels[0];
  const others = [...document.querySelectorAll("[role=dialog], [aria-modal=true], [data-ac='card']")].filter(vis)
    .filter((d) => !d.closest("[data-ap='panel-new']") && !d.closest("[data-qad-drawer]"))
    .map((d) => `${d.getAttribute("aria-label") ?? d.getAttribute("data-ac") ?? d.className} :: ${(d.textContent ?? "").replace(/\s+/g, " ").slice(0, 50)}`);
  return {
    panels: panels.length, acting: p?.getAttribute("data-ap-acting") ?? null, over: p?.getAttribute("data-ap-over") ?? null,
    edit: !!p?.querySelector("[data-ap='edit']"), name: p?.querySelector<HTMLInputElement>("[data-ae='name']")?.value ?? null,
    others, pop: /building your list|the right agent is out there/i.test(document.body.innerText), url: location.pathname + location.search,
  };
});
const press = async (page: Page, sel: string, opts: { mousedown?: boolean } = {}) => {
  try {
    const l = page.locator(sel).filter({ visible: true }).first();
    await l.waitFor({ timeout: 6000 });
    if (opts.mousedown) await l.dispatchEvent("mousedown"); else await l.click({ timeout: 6000 });
    return true;
  } catch { return false; }
};
/** wait for the panel's editor, briefly (a door that opens something else must not cost a minute) */
const waitPanel = (page: Page) => page.locator("[data-ap='panel-new'] [data-ap='edit']").filter({ visible: true }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
/** cancel the panel; a prefilled draft asks first */
const closePanel = async (page: Page) => {
  if (await press(page, "[data-ap='panel-new'] [data-ae='cancel']")) {
    await page.waitForTimeout(300);
    await press(page, "[data-ap='panel-new'] [data-ae='discard']");
  }
  await page.waitForTimeout(500);
};
/** close the log drawer: ✕, then Discard when it asks */
const closeDrawer = async (page: Page) => {
  if (await press(page, "[data-qad-drawer='log'] .qad-dx")) {
    await page.waitForTimeout(400);
    await press(page, "[data-qad-drawer='log'] .disc");
  }
  await page.waitForTimeout(600);
};

type Door = { name: string; route: string; wide?: boolean; open: (page: Page) => Promise<boolean>; prefill?: string };
const LOG_NAME = `${ADD1_PREFIX}a1-typed`;
const DOORS: Door[] = [
  { name: "Dashboard header", route: "/dashboard", wide: true, open: (p) => press(p, "[data-d58='btn-agent']") },
  { name: "top-bar capture (Dashboard)", route: "/dashboard", open: async (p) => (await press(p, ".ws-capr")) && (await p.waitForTimeout(300), press(p, "[data-cap='agent']")) },
  { name: "top-bar capture (Query Centre)", route: "/queries", open: async (p) => (await press(p, ".ws-capr")) && (await p.waitForTimeout(300), press(p, "[data-cap='agent']")) },
  { name: "top-bar capture (Discover)", route: "/agents/discover", open: async (p) => (await press(p, ".ws-capr")) && (await p.waitForTimeout(300), press(p, "[data-cap='agent']")) },
  {
    name: "search palette", route: "/dashboard",
    open: async (p) => {
      if (!(await press(p, "[aria-label='Search (⌘K)']"))) return false;
      await p.waitForTimeout(400); await p.keyboard.type("Add an agent"); await p.waitForTimeout(500); await p.keyboard.press("Enter");
      return true;
    },
  },
  { name: "Contact list", route: "/agents", open: (p) => press(p, ".aglist [data-cl17='add']") },
  {
    name: "Log a query picker", route: "/queries", prefill: LOG_NAME,
    open: async (p) => {
      if (!(await press(p, ".ws-capl"))) return false;
      try { await p.locator("[data-qad-agent-input]").filter({ visible: true }).first().fill(LOG_NAME, { timeout: 8000 }); } catch { return false; }
      await p.waitForTimeout(400);
      return press(p, "[data-qad-new-agent]", { mousedown: true });
    },
  },
];

/* ───────────────────────── A1 · every route ───────────────────────── */
test("ADD1-A1 · every door opens the slide-in new-agent panel, and no centred add dialog exists", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("ADD1-A1");
  await withGuides(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      for (const d of DOORS) {
        await openRoute(page, d.route, vp);
        const where = `${w} ${d.name}`;
        if (d.wide && vp.width < 1440) {
          const shown = await page.locator("[data-d58='btn-agent']").filter({ visible: true }).count();
          L.check(`${where}: hidden below 1440 (by design)`, shown === 0, `${shown} visible`);
          continue;
        }
        const url0 = await page.evaluate(() => location.pathname + location.search);
        const opened = await d.open(page);
        L.check(`${where}: the door could be pressed`, opened, "missing, hidden or covered");
        const got = opened && (await waitPanel(page));
        await page.waitForTimeout(700);
        const s = await readState(page);
        L.check(`${where}: the new-agent panel is open in add mode`, got && s.panels === 1 && s.acting === "new" && s.edit, JSON.stringify(s));
        L.check(`${where}: no centred add dialog and no pop-up is in the DOM`, s.others.length === 0 && !s.pop, JSON.stringify({ others: s.others, pop: s.pop }));
        L.check(`${where}: nothing navigated`, s.url === url0, `${url0} → ${s.url}`);
        if (d.prefill) {
          L.check(`${where}: the typed name is carried in`, s.name === d.prefill, `${s.name}`);
          L.check(`${where}: the panel lies over the query drawer`, s.over === "drawer", `${s.over}`);
        }
        await closePanel(page);
        const after = await readState(page);
        L.check(`${where}: cancel closes the panel`, after.panels === 0, JSON.stringify(after));
        if (d.name === "Dashboard header") {
          const back = await page.evaluate(() => document.activeElement?.getAttribute("data-d58") ?? document.activeElement?.className ?? null);
          L.check(`${where}: focus returns to the button that opened it`, back === "btn-agent", `${back}`);
        }
        if (d.prefill) await closeDrawer(page);
        /* the base build's pop-up: Escape, so the next door starts clean */
        if (s.pop || s.others.length) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); }
      }
    }
  });
  L.done(60);
});

/* ───────────────────────── A2 · stays put ───────────────────────── */
const hoopTotal = (page: Page) => page.evaluate(() => {
  const h = [...document.querySelectorAll("[data-d60='agents-hoop']")].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
  try { return h ? (JSON.parse(h.getAttribute("data-cov") ?? "null")?.total ?? null) : null; } catch { return null; }
});
const toastText = (page: Page) => page.evaluate(() => [...document.querySelectorAll(".sa-toast")].map((t) => (t.textContent ?? "").replace(/\s+/g, " ").trim()).join(" | "));

test("ADD1-A2 · an add from the Dashboard stays on the Dashboard, and the agent total rises without a reload", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("ADD1-A2");
  const run = await withPro(async () => {
    await withGuides(async () => {
      for (const vp of SIZES) {
        const w = `@${vp.width}`;
        const name = `${ADD1_PREFIX}a2-${vp.width}`;
        await openRoute(page, "/dashboard", vp);
        await page.waitForFunction(() => document.querySelector("[data-d60='agents-hoop'][data-cov]") != null, null, { timeout: 20_000 }).catch(() => {});
        await page.evaluate(() => { (window as unknown as { __add1Mark?: number }).__add1Mark = 1; });
        const t0 = await hoopTotal(page);
        L.check(`${w} the Dashboard's agent total is drawn (precondition)`, typeof t0 === "number", `${t0}`);
        const urls: string[] = [await page.evaluate(() => location.pathname + location.search)];
        const door = vp.width >= 1440 ? "the header's Add an agent" : "the top-bar capture";
        const opened = vp.width >= 1440 ? await press(page, "[data-d58='btn-agent']")
          : (await press(page, ".ws-capr")) && (await page.waitForTimeout(300), press(page, "[data-cap='agent']"));
        L.check(`${w} ${door} could be pressed`, opened, "missing");
        const got = await waitPanel(page);
        await page.waitForTimeout(400);
        urls.push(await page.evaluate(() => location.pathname + location.search));
        L.check(`${w} the new-agent panel opened`, got, JSON.stringify(await readState(page)));
        let filled = false;
        try {
          await page.locator("[data-ap='panel-new'] [data-ae='name']").filter({ visible: true }).first().fill(name, { timeout: 5000 });
          await page.locator("[data-ap='panel-new'] [data-ae='agency']").filter({ visible: true }).first().fill(`${ADD1_PREFIX}Agency`, { timeout: 5000 });
          filled = true;
        } catch { /* recorded below */ }
        urls.push(await page.evaluate(() => location.pathname + location.search));
        const saved = filled && (await press(page, "[data-ap='panel-new'] [data-ae='save']"));
        L.check(`${w} the agent could be saved`, saved, `filled ${filled}`);
        let t1: number | null = null, closed = false, toast = "";
        for (let i = 0; i < 40; i += 1) {
          await page.waitForTimeout(300);
          urls.push(await page.evaluate(() => location.pathname + location.search));
          t1 = await hoopTotal(page);
          closed = (await readState(page)).panels === 0;
          toast = toast || (await toastText(page));
          if (closed && typeof t0 === "number" && t1 === t0 + 1 && toast) break;
        }
        const mark = await page.evaluate(() => (window as unknown as { __add1Mark?: number }).__add1Mark ?? null);
        const distinct = [...new Set(urls)];
        L.check(`${w} the URL never changed (open, fill, save, after)`, distinct.length === 1 && distinct[0] === "/dashboard", JSON.stringify(distinct));
        L.check(`${w} the panel closed after the save`, closed, "still open");
        L.check(`${w} the agent total rose by one`, typeof t0 === "number" && t1 === t0 + 1, `${t0} → ${t1}`);
        L.check(`${w} without a reload (the page's own mark survived)`, mark === 1, `${mark}`);
        L.check(`${w} the confirmation said so`, toast.includes(`Added ${name} to your contact list`), toast || "(no toast)");
        if (!closed) await closePanel(page);
      }
    });
  });
  console.log(`[ADD1-A2] plan ${run.before} → Pro → ${run.after}; agents ${run.count0} → ${run.count1}; removed ${run.removed.join(", ")}`);
  L.check("the plan was restored exactly", run.after === run.before, `${run.before} → ${run.after}`);
  L.check("every agent the lock made is gone", run.count1 === run.count0, `${run.count0} → ${run.count1}`);
  L.done(14);
});

/* ───────────────────────── A3 · hand-back ───────────────────────── */
const drawerAgent = (page: Page) => page.evaluate(() => {
  const r = [...document.querySelectorAll("[data-qad-drawer='log']")].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
  if (!r) return null;
  const vis = (s: string) => [...r.querySelectorAll(s)].some((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
  return { change: vis(".qad-change"), input: vis("[data-qad-agent-input]"), text: (r.textContent ?? "").replace(/\s+/g, " ") };
});

test("ADD1-A3 · Log a query: a new agent added from the picker is the one picked", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("ADD1-A3");
  const run = await withPro(async () => {
    await withGuides(async () => {
      for (const vp of SIZES) {
        const w = `@${vp.width}`;
        const name = `${ADD1_PREFIX}a3-${vp.width}`;
        await openRoute(page, "/queries", vp);
        L.check(`${w} Log a query could be pressed`, await press(page, ".ws-capl"), "missing");
        let typed = false;
        try { await page.locator("[data-qad-agent-input]").filter({ visible: true }).first().fill(name, { timeout: 8000 }); typed = true; } catch { /* below */ }
        L.check(`${w} the picker took the name`, typed, "no picker");
        await page.waitForTimeout(400);
        L.check(`${w} "+ Add … as a new agent" could be pressed`, await press(page, "[data-qad-new-agent]", { mousedown: true }), "missing");
        const got = await waitPanel(page);
        const s = await readState(page);
        L.check(`${w} the panel opened over the drawer with the name`, got && s.over === "drawer" && s.name === name, JSON.stringify(s));
        let saved = false;
        try {
          await page.locator("[data-ap='panel-new'] [data-ae='agency']").filter({ visible: true }).first().fill(`${ADD1_PREFIX}Agency`, { timeout: 5000 });
          saved = await press(page, "[data-ap='panel-new'] [data-ae='save']");
        } catch { /* below */ }
        L.check(`${w} the agent could be saved`, saved, "no agency field or save");
        let d: Awaited<ReturnType<typeof drawerAgent>> = null;
        for (let i = 0; i < 40; i += 1) {
          await page.waitForTimeout(300);
          d = await drawerAgent(page);
          if (d && d.change && !d.input) break;
        }
        L.check(`${w} the panel closed`, (await readState(page)).panels === 0, "still open");
        L.check(`${w} the drawer is still open`, d != null, "the drawer went");
        L.check(`${w} the new agent is picked in the log flow (CHANGE shown, no picker)`, !!d && d.change && !d.input, JSON.stringify(d && { change: d.change, input: d.input }));
        L.check(`${w} the picked agent is the new one`, !!d && d.text.includes(name), d ? d.text.slice(0, 120) : "-");
        await closeDrawer(page);
        L.check(`${w} the log was discarded`, (await drawerAgent(page)) == null, "the drawer is still there");
      }
    });
  });
  console.log(`[ADD1-A3] plan ${run.before} → Pro → ${run.after}; agents ${run.count0} → ${run.count1}; removed ${run.removed.join(", ")}`);
  L.check("the plan was restored exactly", run.after === run.before, `${run.before} → ${run.after}`);
  L.check("every agent the lock made is gone", run.count1 === run.count0, `${run.count0} → ${run.count1}`);
  L.done(20);
});

/* ───────────────────────── A4 · gone ───────────────────────── */
test("ADD1-A4 · the pop-up's strings and its component name are nowhere in the built bundle", async () => {
  const L = new Ledger("ADD1-A4");
  const dir = BASE ? `${os.homedir()}/cl183-logs/basedist-raam/assets` : "dist/assets";
  L.check("the bundle is there (precondition)", existsSync(dir), dir);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(js|css)$/.test(f)) : [];
  L.check("it holds scripts (precondition)", files.some((f) => f.endsWith(".js")), `${files.length} files`);
  const all = files.map((f) => [f, readFileSync(`${dir}/${f}`, "utf8")] as const);
  for (const [label, re] of [
    ["the eyebrow \"Building your list\"", /building your list/i],
    ["the line \"The right agent is out there\"", /the right agent is out there/i],
    ["the component name AddAgentFocusForm", /AddAgentFocusForm/],
  ] as const) {
    const hits = all.filter(([, t]) => re.test(t)).map(([f]) => f);
    L.check(`${label} is in no built file`, hits.length === 0, hits.join(", ") || "none");
  }
  if (!BASE) {
    let src = "";
    try { src = sh(`grep -rlnE "AddAgentFocusForm|Building your list|The right agent is out there" src || true`).trim(); } catch { src = "grep failed"; }
    L.check("and nowhere in src", src === "", src);
  }
  L.done(BASE ? 5 : 6);
});

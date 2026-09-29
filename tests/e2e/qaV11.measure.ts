/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1.1 — the follow-up pass's rendered locks.
 *
 * 1. DELETING A HISTORY ENTRY is the mock's inline confirm on the ROW, then the Undo bar. The status
 *    goes back to the entry before it (asserted against the log that remains, not a literal), and
 *    Undo puts every document back byte-identical. The FIRST entry asks about the whole query, and
 *    Keep writes nothing.
 * 2. "RECORD A RESPONSE" WITH NO QUERY opens the drawer on a picker that lists LIVE queries only;
 *    picking one starts the response journey on it.
 * 5. MOBILE: at 390 and 768 the drawer is a full-screen sheet with the "Step N of M" bar, and no
 *    journey's first step or review overflows the viewport or clips its text. Screenshots of every
 *    journey's first step and review land in reports/query-actions-v1/shots/mobile/.
 *
 * ⚠️ THE WRITES ARE UNDONE IN THE SAME RUN (the Undo is the thing under test), inside `finally`, and
 * nothing navigates between a commit and its undo.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { collection, doc, getDoc, getDocs, query as fsQuery, where } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { openQueryById, openTab } from "./openQuery";

const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
type Docs = Map<string, string>;
function canon(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const o = v as Record<string, unknown>;
  if (typeof (o as { toMillis?: () => number }).toMillis === "function") return `ts:${(o as { toMillis: () => number }).toMillis()}`;
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(o).sort().map((k) => `${k}:${canon(o[k])}`).join(",")}}`;
}
async function readSet(id: string): Promise<Docs> {
  const { db, uid } = await harnessDb();
  const out: Docs = new Map();
  const q = await getDoc(doc(db, "users", uid, "queries", id));
  if (q.exists()) out.set(q.ref.path, canon(q.data()));
  (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).forEach((d) => out.set(d.ref.path, canon(d.data())));
  for (const c of ["activities", "taskFlags", "tasks"]) (await getDocs(fsQuery(collection(db, "users", uid, c), where("queryId", "==", id)))).forEach((d) => out.set(d.ref.path, canon(d.data())));
  return out;
}
const diffSets = (a: Docs, b: Docs) => {
  const d: string[] = [];
  for (const [k, v] of a) if (b.get(k) !== v) d.push(`changed/removed ${k}`);
  for (const k of b.keys()) if (!a.has(k)) d.push(`added ${k}`);
  return d;
};
async function all() {
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  return { db, uid, qs, ags };
}
/** The status rungs of a query's own log, oldest first. */
async function rungs(id: string) {
  const { db, uid } = await harnessDb();
  return (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).docs
    .map((d) => ({ id: d.id, st: String((d.data().resultingStatus ?? "") as string), t: (d.data().createdAt as { toMillis?: () => number })?.toMillis?.() ?? new Date(String(d.data().createdAt)).getTime() }))
    .filter((r) => r.st)
    .sort((a, b) => a.t - b.t);
}

test.describe("v1.1 — deleting a history entry", () => {
  test.setTimeout(300_000);
  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
  });

  test("the latest rung: inline confirm on the row → the status goes back → Undo is byte-identical", async ({ page }) => {
    const { qs } = await all();
    /* a query whose latest status rung has a rung before it */
    let target: (typeof qs)[number] | undefined;
    for (const q of qs.filter((x) => x.status === "Partial Requested")) { if ((await rungs(q.id)).length >= 2) { target = q; break; } }
    expect(target, "a Partial Requested query with two status rungs").toBeTruthy();
    const id = target!.id;
    const before = await readSet(id);
    const log = await rungs(id);
    const host = await openQueryById(page, id);
    await openTab(page, host, "Tracking");
    const mores = page.locator(`${host.root} .tl-more`);
    await expect(mores.first()).toBeVisible();
    await mores.last().click();
    await page.locator("[data-cor-delete]").click();
    const conf = page.locator(`${host.root} [data-qcv="entry-delc"]`);
    await expect(conf, "the row did not turn into the inline confirm").toBeVisible();
    const txt = (await conf.textContent()) || "";
    expect(txt).toMatch(/^Delete “.+”\?/);
    expect(txt).toContain("The status goes back to the entry before it.");
    await expect(conf.getByRole("button", { name: "Keep" })).toBeVisible();
    await conf.locator('[data-qcv="entry-del-go"]').click();
    let failure: unknown = null;
    try {
      await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator(".qad-toast")).toContainText("Entry deleted");
      const remaining = await rungs(id);
      expect(remaining.length, "one status rung was removed").toBe(log.length - 1);
      const expected = remaining[remaining.length - 1].st;
      await expect.poll(async () => String((await getDoc(doc((await harnessDb()).db, "users", (await harnessDb()).uid, "queries", id))).data()?.status), { timeout: 15_000, message: "the status did not go back to the entry before it" }).toBe(expected);
      await expect(page.locator(".qad-toast")).toContainText(`STATUS NOW ${expected.toUpperCase()}`);
    } catch (e) { failure = e; } finally {
      await page.locator("[data-qad-undo]").click();
      await expect(page.locator('[data-qad-toast="done"]')).toBeVisible({ timeout: 30_000 });
      await expect.poll(async () => diffSets(before, await readSet(id)), { timeout: 20_000, message: "Undo left the account different" }).toEqual([]);
    }
    if (failure) throw failure;
  });

  test("the first entry: the confirm is about the whole query, and Keep writes nothing", async ({ page }) => {
    const { qs } = await all();
    const target = qs.find((q) => q.status === "Partial Requested") ?? qs.find((q) => !TERMINAL.has(String(q.status)));
    const id = target!.id;
    const before = await readSet(id);
    const host = await openQueryById(page, id);
    await openTab(page, host, "Tracking");
    await page.locator(`${host.root} .tl-more`).first().click();
    await page.locator("[data-cor-delete]").click();
    const conf = page.locator(`${host.root} [data-qcv="entry-delc"]`);
    await expect(conf).toBeVisible();
    await expect(conf).toContainText("Delete this whole query?");
    await expect(conf).toContainText("Its history and reminders go too.");
    await conf.locator('[data-qcv="entry-keep"]').click();
    await expect(conf).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(diffSets(before, await readSet(id)), "Keep wrote something").toEqual([]);
  });
});

test.describe("v1.1 — Record a response with no query", () => {
  test.setTimeout(240_000);
  test("the drawer opens on a picker of LIVE queries; a pick starts the response journey", async ({ page }) => {
    await ensureSignedIn(page);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const { qs, ags } = await all();
    const live = new Set(qs.filter((q) => !TERMINAL.has(String(q.status))).map((q) => q.id));
    await page.locator(".ph-secondary", { hasText: "Record a response" }).first().click();
    await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-qad-qpick]")).toBeVisible();
    const listed = await page.locator("[data-qad-query]").evaluateAll((els) => els.map((e) => e.getAttribute("data-qad-query")));
    expect(listed.length, "the picker listed no queries").toBeGreaterThan(0);
    for (const q of listed) expect(live.has(String(q)), `a closed query was offered: ${q}`).toBe(true);
    /* the harness account is on the free plan: the Pro paste link is absent, never an upsell */
    await expect(page.locator("[data-qad-paste-email]")).toHaveCount(0);
    /* narrow by an agent's name and pick */
    const pick = qs.find((q) => live.has(q.id) && ags.some((a) => a.id === q.agentId && a.name));
    const agent = ags.find((a) => a.id === pick!.agentId)!;
    await page.locator("[data-qad-query-input]").fill(String(agent.name).split(" ")[0]);
    const narrowed = await page.locator("[data-qad-query]").evaluateAll((els) => els.map((e) => e.textContent || ""));
    for (const t of narrowed) expect(t.toLowerCase()).toContain(String(agent.name).split(" ")[0].toLowerCase());
    await page.locator(`[data-qad-query="${pick!.id}"]`).click();
    await expect(page.locator("[data-qad-qpick]")).toHaveCount(0);
    await expect(page.locator('[data-qad-step="0"]')).toContainText(/response/i);
    await page.keyboard.press("Escape");
    const d = page.getByRole("button", { name: "Discard" });
    if (await d.count()) await d.click();
    await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
  });
});

/* ── 5. mobile: a full-screen sheet with the step bar, nothing overflowing or clipped ───────── */

const SHOTS = "reports/query-actions-v1/shots/mobile";
mkdirSync(SHOTS, { recursive: true });

async function sheetAudit(page: Page) {
  return page.evaluate(() => {
    const d = document.querySelector("[data-qad-drawer]") as HTMLElement;
    const r = d.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: string[] = [];
    const clipped: string[] = [];
    for (const el of Array.from(d.querySelectorAll<HTMLElement>("*"))) {
      if ((el as unknown as SVGElement).ownerSVGElement) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      /* inside the sheet's own horizontal scroller (none expected) the box may legitimately run on */
      if (b.right > vw + 0.5 || b.left < -0.5) out.push(`${el.className || el.tagName} ${Math.round(b.left)}→${Math.round(b.right)}`);
      const clips = /(hidden|clip)/.test(cs.overflowX) || /(hidden|clip)/.test(cs.overflow);
      const leaf = el.children.length === 0 && (el.textContent || "").trim().length > 0;
      if (leaf && clips && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== "ellipsis") clipped.push(`${el.className || el.tagName}: "${(el.textContent || "").trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    const bar = document.querySelector("[data-qad-stepper-sm]") as HTMLElement | null;
    const big = document.querySelector(".qad-stepper") as HTMLElement | null;
    return {
      rect: { l: r.left, r: r.right, t: r.top, b: r.bottom }, vw, vh,
      docOverflow: document.documentElement.scrollWidth - vw,
      sheetOverflow: d.scrollWidth - d.clientWidth,
      out: out.slice(0, 12), clipped: clipped.slice(0, 12),
      bar: bar && getComputedStyle(bar).display !== "none" ? (bar.textContent || "").trim() : null,
      bigShown: !!big && getComputedStyle(big).display !== "none",
    };
  });
}
async function walkToReview(page: Page) {
  for (let i = 0; i < 8; i++) {
    if (await page.locator("[data-qad-review]").count()) return true;
    const btn = page.locator("[data-qad-primary]");
    if (!/^Next/i.test(((await btn.textContent()) || "").trim())) return !!(await page.locator("[data-qad-review]").count());
    if (await btn.isDisabled()) {
      const o = page.locator(".qad-body .qad-chip:not(.on), .qad-body .qad-rad:not(.on)").first();
      if (!(await o.count())) return false;
      await o.click();
      if (await btn.isDisabled()) return false;
    }
    await btn.click();
    await page.waitForTimeout(350);
  }
  return !!(await page.locator("[data-qad-review]").count());
}

for (const [w, h] of [[390, 844], [768, 1024]] as const) {
  test(`mobile ${w}: every journey is a full-screen sheet with the step bar; nothing overflows or clips`, async ({ page }) => {
    test.setTimeout(600_000);
    await ensureSignedIn(page);
    /* ⚠️ NOT `openRoute`: it waits for the desktop shell's panels, which the phone layout does not
       draw. The drawer only needs the app mounted, and its dev hook proves that. */
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/queries");
    await page.waitForFunction(() => !!(window as unknown as { __saQueryDrawer?: unknown }).__saQueryDrawer, null, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    await liftMotionSuppression(page);
    const { qs, ags } = await all();
    const need = <T,>(v: T | undefined, what: string): T => { expect(v, `the fixture has no ${what}`).toBeTruthy(); return v as T; };
    const msId = String(qs[0]?.manuscriptId);
    const liveAg = new Set(qs.filter((q) => q.manuscriptId === msId && !TERMINAL.has(String(q.status))).map((q) => String(q.agentId)));
    const free = need(ags.find((a) => !liveAg.has(a.id) && !a.setAside), "agent free to query");
    let pr: (typeof qs)[number] | undefined; let firstRung: { id: string } | undefined;
    for (const q of qs.filter((x) => x.status === "Partial Requested")) { const r = await rungs(q.id); if (r.length) { pr = q; firstRung = r[0]; break; } }
    need(pr, "Partial Requested query with a status rung");
    const queried = need(qs.find((q) => q.status === "Queried"), "Queried query");
    const closed = need(qs.find((q) => q.status === "No Response"), "No Response query");
    const offer = need(qs.find((q) => q.status === "Offer"), "Offer query");
    const journeys: [string, Record<string, unknown>][] = [
      ["log", { mode: "log", agentId: free.id, manuscriptId: msId }],
      ["resp", { mode: "resp", queryId: queried.id }],
      ["pick", { mode: "resp" }],
      ["late", { mode: "resp", queryId: closed.id }],
      ["sent", { mode: "sent", queryId: pr!.id }],
      ["nudge", { mode: "nudge", queryId: queried.id }],
      ["close", { mode: "close", queryId: queried.id }],
      ["offer", { mode: "offer", queryId: offer.id }],
      ["edit", { mode: "edit", queryId: pr!.id, entryId: firstRung!.id }],
    ];
    const problems: string[] = [];
    let measured = 0;
    for (const [name, req] of journeys) {
      await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
      await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);
      for (const phase of ["first", "review"] as const) {
        if (phase === "review" && name === "pick") break; /* a picker has no review: the pick moves it on */
        if (phase === "review") { const ok = await walkToReview(page); if (!ok && name !== "pick") problems.push(`${name}: could not reach the review`); if (!ok) break; await page.waitForTimeout(500); }
        await page.screenshot({ path: `${SHOTS}/${w}-${name}-${phase}.png` });
        const a = await sheetAudit(page);
        measured++;
        const tag = `${w} ${name} ${phase}`;
        if (Math.abs(a.rect.l) > 0.5 || Math.abs(a.rect.r - a.vw) > 0.5 || Math.abs(a.rect.t) > 0.5 || Math.abs(a.rect.b - a.vh) > 0.5) problems.push(`${tag}: not full-screen ${JSON.stringify(a.rect)}`);
        if (a.bigShown) problems.push(`${tag}: the desktop stepper is showing`);
        if (a.bar !== null && !(name === "pick" ? /^Choose the query$/i.test(a.bar) : /^Step \d+ of \d+/i.test(a.bar))) problems.push(`${tag}: the step bar reads "${a.bar}"`);
        if (a.bar === null && phase === "first" && name !== "pick") problems.push(`${tag}: no step bar`);
        if (a.docOverflow > 0.5) problems.push(`${tag}: the page scrolls sideways by ${a.docOverflow}`);
        if (a.sheetOverflow > 0.5) problems.push(`${tag}: the sheet scrolls sideways by ${a.sheetOverflow}`);
        for (const o of a.out) problems.push(`${tag}: past the edge — ${o}`);
        for (const c of a.clipped) problems.push(`${tag}: clipped — ${c}`);
      }
      await page.keyboard.press("Escape");
      const dsc = page.getByRole("button", { name: "Discard" });
      if (await dsc.count()) await dsc.click();
      await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
    }
    console.log(`MOBILE ${w}: ${measured} screens measured`);
    expect(measured, "too few screens were measured").toBeGreaterThanOrEqual(16);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

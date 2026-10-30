/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2 journeys J8–J10 — phone round two v1, driven end to end by touch on a phone, every write read back from Firestore
 * and every write undone in the same run. Chromium only (the Pixel): Playwright's WebKit here cannot open Firestore's
 * Write channel, so a journey that writes cannot complete on the iPhone; the iPhone's half of each surface is the PR2
 * locks' (which run on both).
 *
 *   J8  build a package, mark it ready, log a query with it, see it lock and read "Out with agents", make a copy.
 *   J9  edit a letter that has gone out into a new version, and use the new version in a new package.
 *   J10 tick comps in an unsent letter, then send a query with that letter.
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query as fsq, updateDoc, where } from "firebase/firestore";
import { go, phone, record } from "./pr2Lib";
import { engine } from "./touch";
import { devDb } from "./devWrite";
import { packageStage } from "../../src/lib/packagesV40";
import { isVersionSent } from "../../src/lib/versionLock";
import type { Agent, Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../../src/types";

type Db = Awaited<ReturnType<typeof devDb>>;
const all = async <T,>(d: Db, c: string) => (await getDocs(collection(d.db, "users", d.uid, c))).docs.map((x) => ({ id: x.id, ...x.data() }) as T);
const fresh = async <T extends { id: string },>(d: Db, c: string, before: Set<string>, ok: (x: T) => boolean = () => true, tries = 15) => {
  for (let t = 0; t < tries; t++) { await new Promise((r) => setTimeout(r, 1000)); const hit = (await all<T>(d, c)).find((x) => !before.has(x.id) && ok(x)); if (hit) return hit; }
  return null;
};
async function scoped(page: Page, d: Db) {
  const id = await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"));
  const ms = await all<Manuscript>(d, "manuscripts");
  return ms.find((m) => m.id === id) ?? ms[0]!;
}
async function step(page: Page) {
  const pri = page.locator('[data-pf="primary"]');
  if (await pri.count() && await pri.isEnabled()) { const l = (await pri.textContent()) ?? ""; await pri.tap(); return l; }
  const opt = page.locator("[data-pf-step] button").first();
  if (await opt.count()) { await opt.tap(); return "(option)"; }
  return null;
}
/** build a package on the phone's builder: the given letter (or the first), a version; returns the new package */
async function build(page: Page, d: Db, letterName?: string) {
  const before = new Set((await all<SubmissionPackage>(d, "packages")).map((p) => p.id));
  await go(page, "/queries/packages?build=new");
  await page.locator('[data-pa="build-slot"][data-k="let"]').tap();
  const rows = page.locator('[data-pa="build-picker"] [data-pa="pick-row"]');
  await rows.first().waitFor({ timeout: 10_000 });
  if (letterName) await rows.filter({ hasText: letterName }).first().tap(); else await rows.first().tap();
  await page.waitForTimeout(400);
  if (!(await page.locator('[data-pa="build-step"][data-k="ver"][data-ok="1"]').count())) {
    await page.locator('[data-pa="build-slot"][data-k="ver"]').tap();
    await rows.first().tap(); await page.waitForTimeout(400);
  }
  await page.locator('[data-pa="build-ready"]').tap();
  return fresh<SubmissionPackage>(d, "packages", before, (p) => !!p.queryLetterVersionId);
}
/** log a query with the active package (or "Something different"), to an agent with none on this book */
async function logQuery(page: Page, d: Db, ms: Manuscript, pick: "active" | "pkg", pkgId?: string) {
  const qs = await all<Query>(d, "queries");
  const queried = new Set(qs.filter((q) => q.manuscriptId === ms.id).map((q) => q.agentId));
  const agent = (await all<Agent>(d, "agents")).filter((a) => !queried.has(a.id) && (a.name ?? "").trim().length > 2)[0]!;
  await go(page, "/queries"); await page.waitForTimeout(1200);
  await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap();
  await page.locator('.pa-flow[data-pf="log"]').waitFor({ timeout: 15_000 });
  await page.locator("[data-qad-agent-input]").fill(agent.name!); await page.waitForTimeout(400);
  await page.locator("[data-qad-sugg] button").filter({ hasText: agent.name! }).first().tap();
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(450);
    const s = await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step") ?? "check");
    if (s === "What you sent") {
      await page.locator(pick === "active" ? '[data-pa="log-pkg"][data-now="1"]' : `[data-pa="log-pkg"][data-id="${pkgId}"]`).tap();
      break;
    }
    if (!(await step(page))) break;
  }
  const before = new Set(qs.map((q) => q.id));
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(450); const l = await step(page); if (!l || (/^Log/.test(l) && !/^Logging/.test(l))) break; }
  return fresh<Query>(d, "queries", before, (q) => q.agentId === agent.id);
}
async function dropQuery(d: Db, id: string) {
  for (const x of (await getDocs(collection(d.db, "users", d.uid, "queries", id, "activity"))).docs) await deleteDoc(x.ref).catch(() => {});
  for (const c of ["activities", "taskFlags", "tasks"]) for (const r of (await getDocs(fsq(collection(d.db, "users", d.uid, c), where("queryId", "==", id)))).docs) await deleteDoc(r.ref).catch(() => {});
  await deleteDoc(doc(d.db, "users", d.uid, "queries", id)).catch(() => {});
}

test.describe("PR2 journeys", () => {
  test.beforeEach(async ({ page }) => { test.skip(engine(page) !== "chromium", "writes: Chromium only (see the header)"); });

  test("J8 build, ready, log a query with it, it locks, make a copy", async ({ page }) => {
    test.setTimeout(500_000);
    const d = await devDb();
    await phone(page, "/queries/packages");
    const ms = await scoped(page, d);
    const wasRaw = ms.activePackageId;
    const undo: (() => Promise<unknown>)[] = [];
    const trace: Record<string, unknown> = {};
    try {
      const p = await build(page, d);
      expect(p, "built").toBeTruthy();
      undo.push(() => deleteDoc(doc(d.db, "users", d.uid, "packages", p!.id)));
      trace.built = { id: p!.id, stage: packageStage(p!) };
      expect(packageStage(p!)).toBe("ready");
      /* make it the package new queries go out with, through its page */
      await go(page, `/queries/packages?pkg=${p!.id}`);
      if (await page.locator('[data-pa="pkg-use"]').count()) await page.locator('[data-pa="pkg-use"]').first().tap();
      undo.push(() => updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), { activePackageId: wasRaw === undefined ? deleteField() : wasRaw }));
      await page.waitForTimeout(1500);
      const q = await logQuery(page, d, ms, "active");
      expect(q, "a query was logged").toBeTruthy();
      undo.push(() => dropQuery(d, q!.id));
      trace.query = { id: q!.id, sentPackageId: q!.sentPackageId };
      expect(q!.sentPackageId, "the query records the package").toBe(p!.id);
      const after = (await getDoc(doc(d.db, "users", d.uid, "packages", p!.id))).data() as SubmissionPackage;
      trace.after = { stage: packageStage(after), firstSentAt: after.firstSentAt ?? null };
      expect(packageStage(after), "it has gone out").toBe("out");
      await go(page, "/queries/packages");
      expect(await page.locator(`[data-pa="pk-row"][data-id="${p!.id}"] [data-pa="pk-stage"]`).textContent()).toContain("Out with agents");
      await go(page, `/queries/packages?pkg=${p!.id}`);
      expect(await page.locator('[data-pa="pkg-locked"]').count(), "locked").toBe(1);
      expect(await page.locator('[data-pa="pkg-edit"]').count(), "no Edit").toBe(0);
      const before = new Set((await all<SubmissionPackage>(d, "packages")).map((x) => x.id));
      await page.locator('[data-pa="pkg-copy"]').tap();
      const copy = await fresh<SubmissionPackage>(d, "packages", before);
      expect(copy, "a copy").toBeTruthy();
      undo.push(() => deleteDoc(doc(d.db, "users", d.uid, "packages", copy!.id)));
      trace.copy = { id: copy!.id, from: copy!.copiedFromId, stage: packageStage(copy!) };
      expect(copy!.copiedFromId).toBe(p!.id);
      expect(packageStage(copy!)).not.toBe("out");
    } finally {
      record("J8", trace);
      for (const u of undo.reverse()) await u().catch(() => {});
    }
  });

  test("J9 a sent letter edited into a new version, used in a new package", async ({ page }) => {
    test.setTimeout(500_000);
    const d = await devDb();
    await phone(page, "/queries/packages");
    const ms = await scoped(page, d);
    const wasRaw = ms.activePackageId;
    const versions = await all<ManuscriptVersion>(d, "versions");
    const qs0 = await all<Query>(d, "queries"), pk0 = await all<SubmissionPackage>(d, "packages");
    const sent = versions.find((v) => v.manuscriptId === ms.id && v.componentType === "Query Letter" && isVersionSent(v.id, qs0, pk0));
    expect(sent, "a letter that has gone out").toBeTruthy();
    const undo: (() => Promise<unknown>)[] = [];
    const trace: Record<string, unknown> = {};
    try {
      await go(page, `/queries/packages?edit=${sent!.id}`);
      await page.locator('[data-pmx="text"]').fill(`${sent!.contentDraft ?? ""}\n\nJ9.`);
      await page.locator('[data-pmx="save"]').tap();
      const nv = await fresh<ManuscriptVersion>(d, "versions", new Set(versions.map((v) => v.id)));
      expect(nv, "a new version").toBeTruthy();
      undo.push(() => deleteDoc(doc(d.db, "users", d.uid, "versions", nv!.id)));
      const old = (await getDoc(doc(d.db, "users", d.uid, "versions", sent!.id))).data() as ManuscriptVersion;
      trace.version = { from: sent!.versionName, to: nv!.versionName, oldSame: old.contentDraft === sent!.contentDraft };
      expect(old.contentDraft, "the sent letter is unchanged").toBe(sent!.contentDraft);
      const p = await build(page, d, nv!.versionName);
      expect(p, "a package with the new version").toBeTruthy();
      undo.push(() => deleteDoc(doc(d.db, "users", d.uid, "packages", p!.id)));
      undo.push(() => updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), { activePackageId: wasRaw === undefined ? deleteField() : wasRaw }));
      trace.pkg = { id: p!.id, letter: p!.queryLetterVersionId };
      expect(p!.queryLetterVersionId).toBe(nv!.id);
    } finally {
      record("J9", trace);
      for (const u of undo.reverse()) await u().catch(() => {});
    }
  });

  test("J10 comps ticked in an unsent letter, then a query sent with it", async ({ page }) => {
    test.setTimeout(500_000);
    const d = await devDb();
    await phone(page, "/queries/packages");
    const ms = await scoped(page, d);
    const wasRaw = ms.activePackageId;
    const hadComps = ms.comps;
    const y = new Date().getFullYear();
    const undo: (() => Promise<unknown>)[] = [];
    const trace: Record<string, unknown> = {};
    try {
      await updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), { comps: [...(hadComps ?? []), { id: "cmp_j10", title: "J10 Comp", author: "J. Writer", year: y - 1 }] });
      undo.push(() => updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), hadComps === undefined ? { comps: deleteField() } : { comps: hadComps }));
      const qs = await all<Query>(d, "queries"), pk = await all<SubmissionPackage>(d, "packages");
      const free = (await all<ManuscriptVersion>(d, "versions")).find((v) => v.manuscriptId === ms.id && v.componentType === "Query Letter" && v.status !== "Retired" && !isVersionSent(v.id, qs, pk));
      expect(free, "an unsent letter").toBeTruthy();
      const was = free!.compIds;
      undo.push(() => updateDoc(doc(d.db, "users", d.uid, "versions", free!.id), was === undefined ? { compIds: deleteField() } : { compIds: was }));
      await page.waitForTimeout(1200);
      await go(page, `/queries/packages?compsin=${free!.id}`);
      await page.locator('[data-pa="compsin-row"][data-id="cmp_j10"]').tap();
      await page.locator('[data-pa="compsin-save"]').tap();
      await page.waitForTimeout(1500);
      const lv = (await getDoc(doc(d.db, "users", d.uid, "versions", free!.id))).data() as ManuscriptVersion;
      trace.compIds = lv.compIds;
      expect(lv.compIds, "the letter names the comp").toContain("cmp_j10");
      const p = await build(page, d, free!.versionName);
      expect(p).toBeTruthy();
      undo.push(() => deleteDoc(doc(d.db, "users", d.uid, "packages", p!.id)));
      undo.push(() => updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), { activePackageId: wasRaw === undefined ? deleteField() : wasRaw }));
      await updateDoc(doc(d.db, "users", d.uid, "manuscripts", ms.id), { activePackageId: p!.id });
      await page.waitForTimeout(1200);
      const q = await logQuery(page, d, ms, "active");
      expect(q, "a query sent with the letter").toBeTruthy();
      undo.push(() => dropQuery(d, q!.id));
      trace.query = { id: q!.id, pkg: q!.sentPackageId };
      expect(q!.sentPackageId).toBe(p!.id);
      /* the comp now reads as named in a letter that went out: the comps page says so */
      await go(page, "/queries/packages?comps=1");
      const slip = await page.locator('[data-pa="comp-card"]').filter({ hasText: "J10 Comp" }).locator(".slip").textContent();
      trace.slip = slip;
      expect(slip, "named in the letter, in a query").toMatch(/Named in .*1 query/);
    } finally {
      record("J10", trace);
      for (const u of undo.reverse()) await u().catch(() => {});
    }
  });
});

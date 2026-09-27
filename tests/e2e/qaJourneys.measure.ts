/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1 — journeys end to end on the built app (brief §H 3, 4, 10).
 *
 * Every case: read the documents the save can touch (node side, the harness account), walk the
 * journey in the browser, assert what was WRITTEN (status, fields, `eventKey` in both stores), then
 * press Undo and assert Firestore is BYTE-IDENTICAL to before — no compensating entries.
 *
 * ⚠️ THIS WRITES TO THE SHARED HARNESS ACCOUNT, AND IT PUTS IT BACK IN THE SAME RUN. Nothing
 * navigates between a save and its Undo (the bar IS the undo), and the press is asserted
 * immediately with a message saying the account has changed.
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, doc, getDoc, getDocs, query as fsQuery, where } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

let asserted = 0;
const ok = (c: unknown, m: string) => { asserted++; expect(c, m).toBeTruthy(); };

type Docs = Map<string, unknown>;
function canon(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const o = v as Record<string, unknown>;
  if (typeof (o as { toMillis?: unknown }).toMillis === "function") return `ts:${(o as { toMillis: () => number }).toMillis()}`;
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(o).sort().map((k) => `${k}:${canon(o[k])}`).join(",")}}`;
}
async function readSet(ids: string[]): Promise<Docs> {
  const { db, uid } = await harnessDb();
  const out: Docs = new Map();
  for (const id of ids) {
    const q = await getDoc(doc(db, "users", uid, "queries", id));
    if (q.exists()) out.set(q.ref.path, canon(q.data()));
    (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).forEach((d) => out.set(d.ref.path, canon(d.data())));
    (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", id)))).forEach((d) => out.set(d.ref.path, canon(d.data())));
  }
  return out;
}
const diffSets = (a: Docs, b: Docs) => {
  const d: string[] = [];
  for (const [k, v] of a) if (b.get(k) !== v) d.push(`changed/removed ${k}`);
  for (const k of b.keys()) if (!a.has(k)) d.push(`added ${k}`);
  return d;
};
async function rawDocs(ids: string[]) {
  const { db, uid } = await harnessDb();
  const out: { path: string; data: Record<string, unknown> }[] = [];
  for (const id of ids) {
    const q = await getDoc(doc(db, "users", uid, "queries", id));
    if (q.exists()) out.push({ path: q.ref.path, data: q.data() });
    (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).forEach((d) => out.push({ path: d.ref.path, data: d.data() }));
    (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", id)))).forEach((d) => out.push({ path: d.ref.path, data: d.data() }));
  }
  return out;
}

async function openDrawer(page: Page, req: Record<string, unknown>) {
  await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
}
async function toReview(page: Page) {
  for (let i = 0; i < 8; i++) {
    if (await page.locator("[data-qad-review]").count()) return;
    const p = page.locator("[data-qad-primary]");
    await expect(p).toBeEnabled();
    await p.click();
  }
  await expect(page.locator("[data-qad-review]")).toBeVisible();
}
async function saveAndUndo(page: Page, ids: () => string[], before: Docs, onSaved: () => Promise<void>) {
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
  /* ⚠️ THE UNDO RUNS IN A `finally`. A failed assertion about the save must never leave the shared
     account changed — it happened once, on `msv12-q-8`, and was repaired by hand. */
  let failure: unknown = null;
  try { await onSaved(); } catch (e) { failure = e; }
  const undo = page.locator("[data-qad-undo]");
  ok(await undo.count() > 0, "no Undo on the bar — THE HARNESS ACCOUNT HAS BEEN CHANGED; restore it by hand");
  await undo.click();
  await expect(page.locator('[data-qad-toast="done"]')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => diffSets(before, await readSet(ids())), { timeout: 15_000, message: "undo left the account different from before" }).toEqual([]);
  asserted++;
  if (failure) throw failure;
}

async function fixture() {
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  return { qs, ags };
}
const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);

test.describe("query drawer journeys", () => {
  test.setTimeout(300_000);
  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await liftMotionSuppression(page);
  });

  test("D1 — log a query: the writes, the snapshot, the event key, and undo leaves nothing behind", async ({ page }) => {
    const { qs, ags } = await fixture();
    const msId = String(qs[0]?.manuscriptId);
    const live = new Set(qs.filter((q) => q.manuscriptId === msId && !TERMINAL.has(String(q.status))).map((q) => String(q.agentId)));
    const agent = ags.find((a) => !live.has(a.id) && !a.setAside);
    ok(!!agent, "no agent without a live query on the fixture's manuscript");
    await openDrawer(page, { mode: "log", agentId: agent!.id, manuscriptId: msId });
    await expect(page.locator("[data-qad-who]")).toBeVisible();
    await toReview(page);
    const newId = await page.evaluate(() => null);
    void newId;
    const beforeIds = new Set(qs.map((q) => q.id));
    let created = "";
    await saveAndUndo(page, () => (created ? [created] : []), new Map(), async () => {
      const after = await fixture();
      const fresh = after.qs.filter((q) => !beforeIds.has(q.id));
      ok(fresh.length === 1, `one query created, found ${fresh.length}`);
      created = fresh[0].id;
      const q = fresh[0];
      ok(q.agentId === agent!.id && q.status === "Queried", `created ${JSON.stringify({ a: q.agentId, s: q.status })}`);
      ok(typeof q.sentMaterials === "string" && String(q.sentMaterials).length > 0, "the sent snapshot is written");
      const docs = await rawDocs([created]);
      const acts = docs.filter((d) => !/\/queries\/[^/]+$/.test(d.path));
      ok(acts.length >= 2, `both stores carry the send (${acts.length})`);
      ok(acts.every((d) => d.data.eventKey === "query_sent" || d.data.eventKey === "requery_sent"), `every row carries an eventKey: ${acts.map((d) => d.data.eventKey).join(",")}`);
    });
    ok(created !== "", "a query was created and then undone");
  });

  test("D1 — the duplicate block, and 'It's a separate query' overrides it", async ({ page }) => {
    const { qs } = await fixture();
    const liveQ = qs.find((q) => !TERMINAL.has(String(q.status)));
    ok(!!liveQ, "a live query to duplicate");
    await openDrawer(page, { mode: "log", agentId: liveQ!.agentId, manuscriptId: liveQ!.manuscriptId });
    await expect(page.locator('[data-qad-note="ALREADY LIVE"]')).toBeVisible();
    ok(await page.locator("[data-qad-primary]").isDisabled(), "Next is disabled on a blocked step");
    await page.getByRole("button", { name: "It's a separate query" }).click();
    ok(await page.locator("[data-qad-primary]").isEnabled(), "the override clears the block");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-qad-discard]")).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.locator("[data-qad-drawer]")).toHaveCount(0);
  });

  test("D2 — record a partial request; the late-reply path replaces a no-reply ending; undo is exact", async ({ page }) => {
    const { qs } = await fixture();
    const target = qs.find((q) => q.status === "Queried");
    ok(!!target, "a Queried query");
    const ids = [target!.id];
    const before = await readSet(ids);
    await openDrawer(page, { mode: "resp", queryId: target!.id });
    await page.locator('[data-qad-chips="resp"] [data-qad-chip="partial"]').click();
    await toReview(page);
    await saveAndUndo(page, () => ids, before, async () => {
      const [q] = (await rawDocs(ids)).filter((d) => /\/queries\/[^/]+$/.test(d.path));
      ok(q.data.status === "Partial Requested", `status ${q.data.status}`);
      const acts = (await rawDocs(ids)).filter((d) => d.data.eventKey === "partial_requested");
      ok(acts.length >= 1, "the rung carries eventKey partial_requested");
    });

    const closed = qs.find((q) => q.status === "No Response");
    if (closed) {
      const ids2 = [closed.id];
      const before2 = await readSet(ids2);
      await openDrawer(page, { mode: "resp", queryId: closed.id });
      await expect(page.locator('[data-qad-note="LATE REPLY"]')).toBeVisible();
      await page.locator('[data-qad-chips="resp"] [data-qad-chip="pass"]').click();
      await toReview(page);
      await saveAndUndo(page, () => ids2, before2, async () => {
        const docs = await rawDocs(ids2);
        const left = docs.filter((d) => d.data.resultingStatus === "No Response" || d.data.type === "No Response");
        ok(left.length === 0, `the no-reply ending is replaced, not appended to — still there: ${left.map((d) => d.path).join(", ")} (query ${closed.id})`);
      });
    }
    expect(asserted).toBeGreaterThanOrEqual(6);
  });

  test("D3 — I've sent it: a partial goes out, leaves Your move, and undo is exact", async ({ page }) => {
    const { qs } = await fixture();
    const target = qs.find((q) => q.status === "Partial Requested" || q.status === "Full Requested");
    ok(!!target, "a query owing material");
    const ids = [target!.id];
    const before = await readSet(ids);
    await openDrawer(page, { mode: "sent", queryId: target!.id });
    await toReview(page);
    await saveAndUndo(page, () => ids, before, async () => {
      const [q] = (await rawDocs(ids)).filter((d) => /\/queries\/[^/]+$/.test(d.path));
      ok(q.data.status === (target!.status === "Full Requested" ? "Full Sent" : "Partial Sent"), `status ${q.data.status}`);
      ok(typeof q.data.lastSentLabel === "string", "the last-sent label is written");
    });
  });
});

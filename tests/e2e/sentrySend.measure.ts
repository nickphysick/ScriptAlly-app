/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 5 — a crash on the deployed dev site reaches Sentry, the CSP lets it
 * through, and what leaves the browser carries no query string, email, headers or page content.
 *
 *   SA_E2E_BASE_URL=dev ALLOW_LIVE_FIRESTORE=1 npx playwright test tests/e2e/sentrySend.measure.ts
 *
 * The outgoing envelope is written to reports/crash-reporting-v1/sentry-envelope.json with the uid
 * replaced by <uid>, so the report can show exactly what was sent.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const INGEST = "o4512398078967808.ingest.de.sentry.io";

test("a dev crash reaches Sentry's EU ingest, scrubbed, with no CSP violation", async ({ page }) => {
  const csp: string[] = [];
  page.on("console", (m) => { const t = m.text(); if (/Content Security Policy|Content-Security-Policy|violates/i.test(t)) csp.push(t); });
  page.on("pageerror", (e) => { if (/Content Security Policy/i.test(e.message)) csp.push(e.message); });

  await openRoute(page, "/dashboard");
  const uid = await page.evaluate(async () => {
    /* the signed-in uid, read from Firebase's own IndexedDB record, only to redact it below */
    const db = await new Promise<IDBDatabase>((ok, no) => { const r = indexedDB.open("firebaseLocalStorageDb"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const rows = await new Promise<unknown[]>((ok) => { const r = db.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll(); r.onsuccess = () => ok(r.result as unknown[]); });
    const user = rows.map((x) => (x as { value?: { uid?: string } }).value).find((v) => v?.uid);
    return user?.uid ?? null;
  });
  expect(uid, "signed in").toBeTruthy();

  const sent = page.waitForRequest((r) => r.url().includes(INGEST) && r.method() === "POST", { timeout: 30_000 });
  await page.goto("/queries?qh-crash=queries&r=FW-SHOULD-NOT-LEAVE#frag");
  await expect(page.locator('[data-boundary-fallback="queries"]')).toBeVisible({ timeout: 20_000 });
  const req = await sent;
  const res = await req.response();
  const body = req.postData() ?? "";

  expect(res?.status(), "Sentry accepted the event").toBe(200);
  expect(req.url()).toMatch(new RegExp(`^https://${INGEST.replace(/\./g, "\\.")}/api/4512398086701136/envelope/`));

  /* the envelope is newline-separated JSON: a header, an item header, the event */
  const lines = body.split("\n").filter(Boolean);
  const event = JSON.parse(lines[lines.length - 1]);
  expect(event.tags?.boundary).toBe("queries");
  expect(event.environment).toBe("dev");
  expect(event.user).toEqual({ id: uid });
  expect(event.request).toEqual({ url: expect.stringMatching(/\/queries$/) });
  expect(body).not.toMatch(/FW-SHOULD-NOT-LEAVE|qh-crash=|#frag|\?r=/);
  expect(body).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  expect(body).not.toMatch(/"headers"|"cookies"|User-Agent|Referer/i);
  for (const b of event.breadcrumbs ?? []) expect(b.category).toBe("navigation");

  await page.waitForTimeout(1500);
  expect(csp, "CSP violations in the console").toEqual([]);

  mkdirSync("reports/crash-reporting-v1", { recursive: true });
  const redacted = body.split(uid as string).join("<uid>");
  writeFileSync("reports/crash-reporting-v1/sentry-envelope.json", redacted + "\n");
  console.log(`[sentrySend] status ${res?.status()}, ${body.length} bytes, CSP violations ${csp.length}`);
});

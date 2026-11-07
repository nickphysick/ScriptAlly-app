/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A diagnostic, not a lock (Nick, 6 Nov): what the browser asks the Firestore emulator for.
 *
 *   LISTEN_ROUTE=/queries LISTEN_IDLE_S=60 npm run e2e:emu -- tests/e2e/listenCount.measure.ts --project=measure --workers=1
 *
 * Loads one page, once, with no seeding and no other test, then sits idle. From the page's own requests it counts:
 *   - Listen stream OPENS: a POST to …/Firestore/Listen/channel with no SID (a new webchannel session);
 *   - targets ADDED and REMOVED: each `addTarget` / `removeTarget` in a Listen POST body, by collection path;
 *   - commits: every …:commit / Write/channel request (a write loop would show here).
 * Every 10 s a sample is taken, so a count that climbs while idle is visible. Writes LISTEN_OUT (JSON). Asserts nothing.
 */
import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { byPath, record } from "./listenTally";

test.setTimeout(240_000);
const ROUTE = process.env.LISTEN_ROUTE ?? "/queries";
const IDLE_S = Number(process.env.LISTEN_IDLE_S ?? 60);
const OUT = process.env.LISTEN_OUT ?? "reports/qc-v152-2/listen-idle.json";

test(`listen opens on ${ROUTE}, idle ${IDLE_S}s`, async ({ page }) => {
  const t = record(page); const t0 = t.t0;
  const opens = t.opens, commits = t.commits, adds = t.adds, hosts = t.requests;
  const removes = { get length() { return t.removes; } };
  await openRoute(page, ROUTE, { width: 1280, height: 800 });
  const loadedMs = Date.now() - t0;
  const samples: { s: number; opens: number; adds: number; removes: number; commits: number }[] = [];
  const snap = (s: number) => samples.push({ s, opens: opens.length, adds: adds.length, removes: removes.length, commits: commits.length });
  snap(0);
  for (let s = 10; s <= IDLE_S; s += 10) { await page.waitForTimeout(10_000); snap(s); }
  const top = byPath(t);
  const out = { route: ROUTE, idleS: IDLE_S, loadedMs, totals: { opens: opens.length, adds: adds.length, removes: removes.length, commits: commits.length }, samples, top, requests: hosts, opensAt: opens, commitsAt: commits.slice(0, 50) };
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`[listen] ${ROUTE}: ${JSON.stringify(out.totals)} · samples ${JSON.stringify(samples)}`);
  console.log(`[listen] requests: ${JSON.stringify(hosts)}`);
  console.log(`[listen] top: ${JSON.stringify(top.slice(0, 15))}`);
});

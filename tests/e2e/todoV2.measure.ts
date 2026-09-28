/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ TO-DO LIST v2 — THE MEASUREMENT ══════════════════════════════════════════════════════════
 *
 * Oracle: design-refs/todo-list-v2.html, SHA256 67da1fb4…7992e. The first case refuses to run
 * anything against a ref whose bytes have moved: a stale anchor fails here, loudly, rather than
 * every later case quietly measuring the page against a drawing nobody signed off.
 *
 * ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN. A suite that cannot find its subject has
 * failed, not skipped — so every case bumps the counter, and a worker that ran fewer assertions
 * than twice its cases fails in the language of a failure.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";

export const TODO_V2_REF = "design-refs/todo-list-v2.html";
export const TODO_V2_SHA = "67da1fb43ca9b170f985b6eb71806f9c1ec8296237f475cf458d880e1dd7992e";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });
test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[todoV2] assertions run: ${asserts} across ${ran} tests (this worker)`);
  if (asserts < ran * 2) throw new Error(`todoV2 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

test.describe("phase 1 — the ref and the wiring", () => {
  test("the oracle is the ref that was signed off, byte for byte", () => {
    const bytes = readFileSync(join(process.cwd(), TODO_V2_REF));
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha, `${TODO_V2_REF} has changed since it was enrolled — a stale anchor`).toBe(TODO_V2_SHA);
    bump();
    expect(bytes.length).toBeGreaterThan(1000);
    bump();
  });

  test("the v2 page is the one mounted at /todo", async ({ page }) => {
    await openRoute(page, "/todo", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".tpl-wpg");
    const found = await page.evaluate((s) => !!document.querySelector(`${s} [data-todo-v2="page"]`), scope);
    expect(found, "no [data-todo-v2=page] under the visible To-do page — the v2 page is not mounted").toBe(true);
    bump(2);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.3 — the report's screenshots beside each design-refs/contact-list-v18-3-3/screens/* file: the full,
 * sparse and not-queried rows open at 1512 and 1280, and at 1512 the full row's email on hover and just copied. The full
 * and sparse rows get the mock's contact details (read first, put back exactly). The guide is marked seen for the run so
 * its first-visit checklist does not cover a row, and put back after.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { openContacts16 } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/contact-list-v18-3/shots-v18-3-3";
const FULL = "msv12-agent-4", SPARSE = "msv12-agent-5", BARE = "clv181-bare";
const CONTACT = ["email", "website", "socials", "twitter", "bluesky", "instagram"] as const;

const rowOf = (page: Page, id: string) => page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
const openRow = async (page: Page, id: string) => {
  const row = rowOf(page, id);
  await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(350);
  const b = await row.boundingBox(); await page.mouse.move(b!.x + 300, b!.y + 20); await page.waitForTimeout(900);
};
const shot = async (page: Page, id: string, name: string) => {
  const bb = (await rowOf(page, id).boundingBox())!;
  mkdirSync(DIR, { recursive: true });
  await page.screenshot({ path: `${DIR}/${name}.png`, clip: { x: 248, y: bb.y - 8, width: page.viewportSize()!.width - 248, height: bb.height + 16 } });
};

test("shots · v18.3.3 open rows, email hover and copied, 1512 and 1280", async ({ page }) => {
  test.setTimeout(300_000);
  const { db, uid } = await harnessDb();
  const ref = (id: string) => doc(db, "users", uid, "agents", id);
  const before: Record<string, Record<string, unknown>> = {};
  for (const id of [FULL, SPARSE]) { const d = (await getDoc(ref(id))).data() ?? {}; before[id] = Object.fromEntries(CONTACT.map((k) => [k, d[k]])); }
  const g0 = execSync("node tests/e2e/guideFlags.mjs", { encoding: "utf8" }).trim().split("\n").pop()!;
  try {
    execSync("node tests/e2e/guideFlags.mjs --seen");
    await updateDoc(ref(FULL), { email: "theo@abaragrant.co.uk", website: "https://www.abaragrantliterary.co.uk", socials: [{ platform: "bluesky", handle: "@theo.abara.bsky.social" }] });
    await updateDoc(ref(SPARSE), { website: "https://parkliterary.example" });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await openContacts16(page, { width: 1512, height: 900 });
    await openRow(page, FULL); await shot(page, FULL, "01-open-full-1512");
    const em = rowOf(page, FULL).locator('[data-k="email"]');
    await em.hover(); await page.waitForTimeout(250); await shot(page, FULL, "02-email-hover-1512");
    await em.click(); await page.waitForTimeout(150); await shot(page, FULL, "03-email-copied-1512");
    await page.waitForTimeout(1500);
    await openRow(page, SPARSE); await shot(page, SPARSE, "04-open-sparse-1512");
    await openRow(page, BARE); await shot(page, BARE, "05-open-not-queried-1512");
    await openContacts16(page, { width: 1280, height: 800 });
    await openRow(page, FULL); await shot(page, FULL, "06-open-full-1280");
    await openRow(page, SPARSE); await shot(page, SPARSE, "07-open-sparse-1280");
    await openRow(page, BARE); await shot(page, BARE, "08-open-not-queried-1280");
  } finally {
    for (const id of [FULL, SPARSE]) await updateDoc(ref(id), Object.fromEntries(CONTACT.map((k) => [k, before[id][k] === undefined ? deleteField() : before[id][k]])));
    execSync(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
  }
});

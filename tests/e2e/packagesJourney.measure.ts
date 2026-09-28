/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PACKAGES THROUGH THE JOURNEY — Part A on the built app (docs/contracts/package-editions.md;
 * refs design-refs/packages-journey/*). The pure halves are in src/lib/queryActions/packagesJourney.test.ts.
 *
 * ⚠️ USES THE PACKAGES SESSION'S v2 FIXTURE, READ-ONLY USE OF ITS SCRIPT (as qaSnapshot does):
 * seeded in beforeAll, removed in afterAll. It deletes-before-write, so a `firstSentAt` a log
 * stamps on `pv2-p4` does not outlive the run. Every query a case logs is undone by the drawer's Undo
 * inside the same case, and nothing navigates between a commit and its undo.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/packagesJourney.measure.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { collection, doc, getDoc, getDocs, updateDoc, deleteField } from "firebase/firestore";
import { openQueryById, openTab } from "./openQuery";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

const MS = "seed-ms-pkgv2";
const MS_EMPTY = "seed-ms-pkgv2e";
const ACTIVE = "pv2-p1";
const UNSENT = "pv2-p4";
const RETIRED = "pv2-p3";
const SHOTS = "reports/packages-journey/shots";
let asserted = 0;
const ok = (c: boolean, m: string) => { expect(c, m).toBe(true); asserted++; };

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(SHOTS, { recursive: true }); execSync("node tests/e2e/seedPackagesV2Fixture.mjs", { stdio: "inherit" }); });
test.afterAll(() => {
  execSync("node tests/e2e/seedPackagesV2Fixture.mjs --restore", { stdio: "inherit" });
  console.log(`PACKAGES-JOURNEY assertions: ${asserted}`);
});

async function openDrawer(page: Page, req: Record<string, unknown>) {
  /* a drawer still sliding out after a discard is the PREVIOUS request — wait for it to go */
  await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
  await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
}
async function toStep2(page: Page) {
  for (let i = 0; i < 4; i++) {
    if (await page.locator("[data-qad-how]").count()) return;
    await page.locator("[data-qad-primary]").click();
  }
  await expect(page.locator("[data-qad-how]").first()).toBeVisible();
}
async function toReview(page: Page) {
  for (let i = 0; i < 8; i++) {
    if (await page.locator("[data-qad-review]").count()) return;
    await page.locator("[data-qad-primary]").click();
  }
}
async function freeAgentFor(ms: string) {
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.data());
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const busy = new Set(qs.filter((q) => q.manuscriptId === ms && !["Rejected", "Withdrawn", "No Response", "Signed"].includes(q.status)).map((q) => q.agentId));
  return ags.find((a) => !busy.has(a.id) && !a.setAside)!;
}
async function start(page: Page) {
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
}
const how = (page: Page) => page.locator("[data-qad-how].on").getAttribute("data-qad-how");
const selected = (page: Page) => page.locator(".qad-prow.on").getAttribute("data-qad-pkg");
async function shot(page: Page, name: string) {
  await page.locator("[data-qad-drawer]").screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Log, read the new query, run the check, then Undo — the Undo is pressed whatever the check says. */
async function logAndCheck(page: Page, check: (q: Record<string, unknown>) => Promise<void> | void) {
  const { db, uid } = await harnessDb();
  const before = new Set((await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id));
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 20_000 });
  let failure: unknown = null;
  try {
    const fresh = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !before.has(d.id));
    ok(fresh.length === 1, "one query was logged");
    await check(fresh[0].data());
  } catch (e) { failure = e; } finally {
    await page.locator("[data-qad-undo]").click();
    await expect(page.locator('[data-qad-toast="done"]'), "UNDO DID NOT COMPLETE — the account has been changed").toBeVisible({ timeout: 20_000 });
  }
  if (failure) throw failure;
}

test("S1 + LP1 — the default: opens on a package, with the 'used for new queries' one selected", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page);
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS });
  await toStep2(page);
  ok(await how(page) === "package", "LP1: opens on the package option");
  ok(await selected(page) === ACTIVE, `LP1: the manuscript's active package is selected (got ${await selected(page)})`);
  ok(await page.locator(`.qad-prow[data-qad-pkg="${ACTIVE}"] em.u`).count() === 1, "USED FOR NEW QUERIES tags the active package");
  ok(await page.locator(`.qad-prow[data-qad-pkg="${RETIRED}"]`).count() === 0, "the retired package is not offered");
  ok(await page.locator("[data-qad-inpk]").isVisible(), "IN THIS PACKAGE is shown");
  ok(!(await page.getByText("Custom", { exact: true }).count()), "there is no Custom card");
  await shot(page, "step2-1-package-default");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard" }).click();
});

test("S1 + LP2 + LP3 — a preset holds against the agent; a retired preset falls through", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page);
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS, packageId: UNSENT });
  await toStep2(page);
  ok(await selected(page) === UNSENT, `LP2: the preset holds after the agent is picked (got ${await selected(page)})`);
  console.log("MATCHES tags:", await page.locator(".qad-prow em.m").count());
  await shot(page, "step2-2-package-preset");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard" }).click();

  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS, packageId: RETIRED });
  await toStep2(page);
  ok(await selected(page) === ACTIVE, `LP3: a retired preset falls through to the default (got ${await selected(page)})`);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard" }).click();
});

test("S1 + LP4 — no packages: individually, the package option disabled, and the leave bar works", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page);
  const agent = await freeAgentFor(MS_EMPTY);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS_EMPTY });
  await toStep2(page);
  ok(await how(page) === "individual", "LP4: individually is selected");
  ok(await page.locator('[data-qad-how="package"]').isDisabled(), "LP4: the package option is disabled");
  ok((await page.locator('[data-qad-how="package"]').innerText()).includes("None made yet"), "LP4: it says None made yet");
  ok(await page.locator("[data-qad-nopkg]").isVisible(), "LP4: the No packages yet line is shown");
  await shot(page, "step2-4-no-packages");
  await page.locator("[data-qad-nopkg] a").click();
  ok(await page.locator("[data-qad-leave]").isVisible(), "LP4: the link raises the leave bar");
  ok((await page.locator("[data-qad-leave]").innerText()).includes("Leave this query to make a package?"), "the leave bar's wording");
  await shot(page, "step2-4b-leave-bar");
  await page.locator("[data-qad-leave] .keep").click();
  ok(await page.locator("[data-qad-leave]").count() === 0, "Keep editing dismisses it");
  await page.locator("[data-qad-nopkg] a").click();
  await page.locator("[data-qad-leave] .disc").click();
  await page.waitForURL(/\/manuscripts\/packages/, { timeout: 10_000 });
  ok(/\/manuscripts\/packages/.test(page.url()), "LP4: Leave goes to Submission packages");
  await expect(page.locator("[data-qad-drawer]"), "and the drawer is closed").toHaveCount(0, { timeout: 5_000 }); asserted++;
});

test("S1 + LP5 — a package save records the package; an individual save records none", async ({ page }) => {
  test.setTimeout(300_000);
  await start(page);
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS, packageId: UNSENT });
  await toStep2(page);
  await toReview(page);
  await shot(page, "review-package");
  await logAndCheck(page, async (q) => {
    ok(q.sentHow === "package", `sentHow package (got ${q.sentHow})`);
    ok(q.sentPackageId === UNSENT && q.packageId === UNSENT, "the id, in step with packageId");
    ok(q.sentPackageEdition === 1, "edition 1");
    ok(Array.isArray(q.sentVersions) && (q.sentVersions as string[]).every((v) => v.startsWith("pv2-")), `sentVersions are version ids (${JSON.stringify(q.sentVersions)})`);
    ok(typeof q.sentMaterials === "string" && /^Winter draft package: Query letter /.test(q.sentMaterials as string), `the summary is the name and the pieces (${q.sentMaterials})`);
    const { db, uid } = await harnessDb();
    const p = (await getDoc(doc(db, "users", uid, "packages", UNSENT))).data()!;
    ok(!!p.firstSentAt, "the package is stamped first-sent");
  });

  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS_EMPTY });
  await toStep2(page);
  await shot(page, "step2-3-individually");
  await toReview(page);
  await logAndCheck(page, (q) => {
    ok(q.sentHow === "individual", "sentHow individual");
    ok(!("sentPackageId" in q) && !("sentPackageEdition" in q) && !("basedOnPackageId" in q), "no package fields");
    ok(q.packageId === "", "packageId empty");
  });
});

test("LP7 — attach, switch to individually and drop a piece: based on, never a package", async ({ page }) => {
  test.setTimeout(300_000);
  await start(page);
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS, packageId: UNSENT });
  await toStep2(page);
  await page.locator("[data-qad-inpk] a").click();
  ok(await how(page) === "individual", "Choose individually switches");
  await page.locator(`[data-qad-toggle="syn"]`).click();
  ok((await page.locator(".qad-drawer").innerText()).includes("It'll be recorded as"), "the BASED ON note appears");
  await shot(page, "based-on-note");
  await toReview(page);
  await logAndCheck(page, (q) => {
    ok(q.sentHow === "individual", "saved as individual");
    ok(q.basedOnPackageId === UNSENT && q.basedOnPackageEdition === 1, "based on the package, edition 1");
    ok(Array.isArray(q.sentChanges) && (q.sentChanges as string[]).some((c) => c.startsWith("Synopsis:")), `sentChanges (${JSON.stringify(q.sentChanges)})`);
    ok(!("sentPackageId" in q), "LP7: NOT sentPackageId");
  });
});

test("LP8 — individually but exactly a package: the review asks, and declining keeps it individual", async ({ page }) => {
  test.setTimeout(300_000);
  await start(page);
  const agent = await freeAgentFor(MS);
  await openDrawer(page, { mode: "log", agentId: agent.id, manuscriptId: MS, packageId: UNSENT });
  await toStep2(page);
  await page.locator("[data-qad-inpk] a").click();
  await toReview(page);
  ok(await page.locator("[data-qad-exact]").isVisible(), "LP8: the exact-match prompt shows");
  ok((await page.locator("[data-qad-exact]").innerText()).includes("This is exactly your Winter draft package"), "its wording");
  await shot(page, "exact-match-prompt");
  await page.locator("[data-qad-exact] .keep").click();
  ok(await page.locator("[data-qad-exact]").count() === 0, "declining hides it");
  await logAndCheck(page, (q) => {
    ok(q.sentHow === "individual", "LP8: kept individual — never converted silently");
    ok(!("sentPackageId" in q), "no package");
  });
});

/* ─────────────── LP9 · the six cases on the rendered card and Tracking (§A3) ─────────────── */
const AUTUMN = "Autumn round package: Query letter v3 · Synopsis 1 page · Fast-paced opening · Also: Author bio in the email body";
const SIX: Record<string, { id: string; fields: Record<string, unknown>; chip: RegExp; box: string }> = {
  pkg: { id: "pv2-q1", fields: { sentHow: "package", sentPackageId: "pv2-p1", sentPackageEdition: 1, sentMaterials: AUTUMN }, chip: /AUTUMN ROUND PACKAGE/, box: "package" },
  ind: { id: "pv2-q2", fields: { sentHow: "individual", packageId: "", sentMaterials: "Query letter v3 · first 5,000 words" }, chip: /^MATERIALS LOGGED INDIVIDUALLY$/, box: "individual" },
  based: { id: "pv2-q3", fields: { sentHow: "individual", packageId: "", basedOnPackageId: "pv2-p1", basedOnPackageEdition: 1, sentChanges: ["Synopsis: 1 page → none"], sentMaterials: "Based on Autumn round: Query letter v3 · Fast-paced opening" }, chip: /BASED ON AUTUMN ROUND/, box: "individual" },
  ret: { id: "pv2-q14", fields: { sentHow: "package", sentPackageId: "pv2-p3", sentPackageEdition: 1, sentMaterials: "Spring round package: Query letter v1 · Slow-burn opening" }, chip: /SPRING ROUND PACKAGE/, box: "package" },
  cor: { id: "pv2-q4", fields: { sentHow: "package", sentPackageId: "pv2-p1", sentPackageEdition: 1, sentMaterials: AUTUMN, sentCorrectedAt: "2026-09-28T10:00:00Z", sentCorrectedFrom: "Agents with MSWL package: Query letter v2" }, chip: /AUTUMN ROUND PACKAGE/, box: "package" },
  imp: { id: "pv2-q9", fields: { sentHow: "unrecorded", packageId: "", sentMaterials: deleteField() }, chip: /MATERIALS NOT RECORDED/, box: "unrecorded" },
};

test("LP9 — the six cases: solid ink for a package, dashed for individually, quiet for not recorded", async ({ page }) => {
  test.setTimeout(400_000);
  const { db, uid } = await harnessDb();
  for (const c of Object.values(SIX)) await updateDoc(doc(db, "users", uid, "queries", c.id), c.fields as Record<string, unknown>);
  await page.addInitScript((ms) => { try { localStorage.setItem("scriptally_active_manuscript_id", ms); } catch { /* */ } }, MS);
  await start(page);
  const seen: Record<string, string> = {};
  for (const [k, c] of Object.entries(SIX)) {
    const host = await openQueryById(page, c.id);
    const chip = page.locator(`${host.root} [data-sent-how]`).first();
    await expect(chip, `${k}: the card has no chip`).toBeVisible();
    const txt = (await chip.innerText()).trim();
    ok(c.chip.test(txt), `${k}: chip reads ${txt}`);
    const cls = (await chip.getAttribute("class")) ?? "";
    ok(cls.includes(c.box === "package" ? "sh-chip--pk" : c.box === "individual" ? "sh-chip--in" : "sh-chip--no"), `${k}: chip treatment (${cls})`);
    await openTab(page, host, "Tracking");
    const box = page.locator(`${host.root} [data-sent-box]`).first();
    await expect(box, `${k}: Tracking has no box`).toBeVisible();
    ok((await box.getAttribute("data-sent-box")) === c.box, `${k}: the Tracking box is the ${c.box} treatment`);
    /* the treatment is the RENDERED style, not only the class: ink band vs dashed outline */
    /* preflight gives every box `border-style: solid` at 0px, so the style alone says nothing: read width AND style */
    const style = await box.evaluate((el) => { const cs = getComputedStyle(el); return `${cs.borderTopWidth} ${cs.borderTopStyle}|${cs.boxShadow}`; });
    ok(c.box === "package" ? style.startsWith("0px") && /rgb\(42, 58, 82\)/.test(style) : /^1(\.5)?px dashed/.test(style), `${k}: rendered treatment ${style}`); /* 1.5px snaps to 1px at DPR 1 */
    if (k === "ret") ok((await box.innerText()).includes("RETIRED"), "ret: the RETIRED tag");
    if (k === "cor") ok((await box.innerText()).includes("WAS RECORDED AS"), "cor: the corrected line");
    if (k === "based") ok((await box.locator(".sh-row.chg").count()) > 0, "based: the changed piece shows in rust");
    seen[k] = txt;
    const card = page.locator(host.root);
    await card.screenshot({ path: `${SHOTS}/case-${k}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  console.log("SIX CASES:", JSON.stringify(seen));
});

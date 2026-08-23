/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 5 — the tightest case, under stress.
 *
 * ⚠️ 1440×720 LEAVES THE ACTIVITY CARD AT EXACTLY ITS 120px FLOOR IN STATE C. Zero slack means
 * the layout absorbs the reached state and nothing more, so the question is not "does it fit"
 * but "what is one change away from it not fitting". A layout that only holds at the content it
 * happened to be measured with is a coincidence — so this repeats the measurement with the
 * tallest realistic card: four history periods (the cap), and two-digit numbers on both sides.
 */
import { expect, test } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc, deleteField, setDoc } from "firebase/firestore";
import { openRoute } from "./measure";

const env = (f: string) => Object.fromEntries(
  readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
) as Record<string, string>;
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing to seed anything but dev.");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
}, "goals-stress");
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);

/* ⚠️ THE STRESS QUERIES ARE THROWAWAYS THIS FILE CREATES AND DELETES — never seeded fixtures.
   Four history periods need sends in four prior months, which the harness account does not have;
   writing them onto existing records would leave the next run measuring this run's damage. */
const STRESS_IDS = Array.from({ length: 16 }, (_, i) => `probe-goalstress-${i}`);
const MONTH_OFFSETS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 5]; // 12 this month, then four past

let uid = "";
let priorGoals: unknown;

const londonToday = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
};
/** The 5th of the month `back` months before today, London. */
const monthsBack = (back: number) => {
  const [y, m] = londonToday().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - (back - 1), 5));
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async () => {
  const pw = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!pw) throw new Error("No SA_E2E_PASSWORD in .env.local");
  const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", pw);
  uid = user.uid;
  const snap = await getDoc(doc(db, "users", uid));
  priorGoals = snap.data()?.queryingGoals;
  const ms = snap.data()?.id ? "seed-ms-1" : "seed-ms-1";
  for (let i = 0; i < STRESS_IDS.length; i++) {
    await setDoc(doc(db, "users", uid, "queries", STRESS_IDS[i]), {
      id: STRESS_IDS[i], userId: uid, manuscriptId: ms, agentId: "seed-agent-1", packageId: "",
      status: "Queried", dateSent: monthsBack(MONTH_OFFSETS[i]),
      personalisationNotes: "", sendMethod: "Email",
    });
  }
  /* target 10 against 12 sent — two digits both sides, and reached */
  await updateDoc(doc(db, "users", uid), {
    queryingGoals: [{ target: 10, cadence: "month", effectiveFrom: londonToday() }],
  });
});

/** Swap the cadence without re-seeding the queries. */
async function setCadence(c: "week" | "fortnight" | "month", target: number) {
  await updateDoc(doc(db, "users", uid), {
    queryingGoals: [{ target, cadence: c, effectiveFrom: londonToday() }],
  });
}

test.afterAll(async () => {
  if (!uid) return;
  const { deleteDoc } = await import("firebase/firestore");
  for (const id of STRESS_IDS) { try { await deleteDoc(doc(db, "users", uid, "queries", id)); } catch { /* leave nothing half-done unreported */ } }
  await updateDoc(doc(db, "users", uid), { queryingGoals: priorGoals === undefined ? deleteField() : priorGoals } as never);
});

for (const vp of [{ width: 1440, height: 720 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`state C under stress @ ${vp.width}x${vp.height}`, async ({ page }) => {
    await openRoute(page, "/dashboard", vp);
    await page.waitForTimeout(1600);
    const out = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(s) as HTMLElement | null;
      const sc = q(".ws-wbody"); const goal = q(".os-goal"); const actv = q(".os-actv"); const hist = q(".os-goal-hist");
      const r = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : null);
      return {
        found: sc !== null && goal !== null && actv !== null,
        over: sc ? sc.scrollHeight - sc.clientHeight : null,
        goalH: r(goal), actvH: r(actv), actvMin: actv ? parseFloat(getComputedStyle(actv).minHeight) : null,
        goalClips: goal ? goal.scrollHeight - goal.clientHeight : null,
        histH: r(hist), histEntries: hist ? hist.querySelectorAll("span:not(.os-goal-dot)").length : 0,
        text: goal ? (goal.textContent || "").replace(/\s+/g, " ").trim().slice(0, 110) : null,
      };
    });
    expect(out.found, "scroller, card and activity card must all exist").toBe(true);
    expect(out.histEntries, "the stress fixture must actually produce four history periods").toBe(4);
    expect(out.goalClips, "⚠️ the card must not crop its own contents").toBe(0);
    expect(out.over, `⚠️ ${vp.width}x${vp.height}: stressed state C must not make the dashboard scroll`).toBeLessThanOrEqual(0);
    const slack = (out.actvH ?? 0) - (out.actvMin ?? 0);
    console.log(`\n### ${vp.width}x${vp.height} STRESSED\n  goal ${out.goalH}  actv ${out.actvH} (min ${out.actvMin}, slack ${Math.round(slack * 10) / 10})  over ${out.over}  hist ${out.histH} (${out.histEntries})\n  "${out.text}"`);
    if (vp.width === 1440 && vp.height === 720) {
      await page.locator(".os-colR").first().screenshot({ path: "reports/goals/state-c-1440x720-stressed.png" });
    }
  });
}

/**
 * ⚠️ THE REAL WORST CASE IS A WEEKLY CADENCE, NOT A MONTHLY ONE. Monthly history labels are three
 * characters ("JUL"); weekly and fortnightly ones are a date ("10 AUG"), roughly twice as wide.
 * The strip wraps, so four long labels are what can add a line — and at 1440×720 the activity card
 * is already at its floor with zero slack, so one extra line is the difference between fitting and
 * scrolling. Measuring the monthly case and calling the layout safe would have been a coincidence
 * of the cadence the fixture happened to use.
 */
test("⚠️ the widest history — weekly labels at the tightest viewport", async ({ page }) => {
  /* ⚠️ A SEND DATED TODAY, or the weekly period is empty and this measures state B — which is
     134px shorter and would report the tight case as comfortable. The first run of this case did
     exactly that. */
  await setDoc(doc(db, "users", uid, "queries", "probe-goalstress-today"), {
    id: "probe-goalstress-today", userId: uid, manuscriptId: "seed-ms-1", agentId: "seed-agent-1",
    packageId: "", status: "Queried", dateSent: londonToday(), personalisationNotes: "", sendMethod: "Email",
  });
  await setCadence("week", 1);
  await openRoute(page, "/dashboard", { width: 1440, height: 720 });
  await page.waitForTimeout(1600);
  const out = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const sc = q(".ws-wbody"); const goal = q(".os-goal"); const hist = q(".os-goal-hist");
    const h = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : null);
    return {
      found: sc !== null && goal !== null,
      over: sc ? sc.scrollHeight - sc.clientHeight : null,
      goalH: h(goal), histH: h(hist),
      histText: hist ? (hist.textContent || "").replace(/\s+/g, " ").trim() : null,
      /* ⚠️ THE WRAP IS THE THING BEING MEASURED — one line of this strip is ~15px. */
      histLines: hist ? Math.round((hist.getBoundingClientRect().height - 11) / 15) : null,
      reached: q(".os-goal-illph") !== null,
    };
  });
  expect(out.found, "the scroller and the card must both exist").toBe(true);
  console.log(`\n### 1440x720 · WEEKLY HISTORY\n  goal ${out.goalH}  hist ${out.histH} (~${out.histLines} line(s))  over ${out.over}\n  "${out.histText}"`);
  expect(out.reached, "this must be the REACHED state, or the tight case was not measured").toBe(true);
  expect(out.over, "⚠️ the widest history must not tip the tightest viewport into scrolling").toBeLessThanOrEqual(0);
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", uid, "queries", "probe-goalstress-today"));
});

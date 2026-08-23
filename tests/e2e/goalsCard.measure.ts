/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 5 — the goals card, measured in a real browser at four viewports.
 *
 * ⚠️ THE SCROLLER IS `.ws-wbody`, NOT `.ws-cscroll`. The pack named the latter; it does not exist
 * on this route — `WorkspaceShell` moved the scroller and says so in its own comment — and a null
 * selector reports zero overflow and passes having measured nothing. Every read asserts its
 * element is non-null BEFORE the claim, which is the precondition rule this repo keeps paying for.
 *
 * ⚠️ THE STATES ARE SEEDED, NOT WAITED FOR. The harness account is put into each state by writing
 * `queryingGoals` and reloading; the alternative measures whichever state the account happens to
 * be in and calls that coverage. Every write is undone at the end, and the account's prior value
 * is captured first so an interrupted run can be reasoned about.
 *
 * ⚠️ THE TARGETS ARE DERIVED FROM THE ACCOUNT'S OWN COUNT, read off the unset card. Hard-coding a
 * target would produce state B on a quiet account and state C on a busy one, silently.
 */
import { expect, test } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc, deleteField } from "firebase/firestore";
import { openRoute } from "./measure";

/* ── the harness account, same guard as seed.mjs and rulesProbe.mjs ────────────────────────── */
const env = (file: string) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
) as Record<string, string>;
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing to seed anything but dev.");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
}, "goals-measure");
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);

let uid = "";
let priorGoals: unknown;

async function signIn() {
  if (uid) return;
  const pw = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!pw) throw new Error("No SA_E2E_PASSWORD in .env.local");
  const { user } = await signInWithEmailAndPassword(
    getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", pw);
  uid = user.uid;
  priorGoals = (await getDoc(doc(db, "users", uid))).data()?.queryingGoals;
}

/** London today, so the seeded entry is in force the moment the page loads. */
const londonToday = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
};

async function seed(target: number | null, cadence: "week" | "fortnight" | "month" | null) {
  await signIn();
  await updateDoc(doc(db, "users", uid),
    { queryingGoals: [{ target, cadence, effectiveFrom: londonToday() }] });
}
async function clearSeed() {
  await signIn();
  await updateDoc(doc(db, "users", uid), {
    queryingGoals: priorGoals === undefined ? deleteField() : priorGoals,
  } as never);
}

async function readCard(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const h = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : null);
    const scroller = q(".ws-wbody");
    const goal = q(".os-goal");
    const actv = q(".os-actv");
    const fill = q(".os-goal-meter i");
    return {
      scrollerFound: scroller !== null,
      over: scroller ? scroller.scrollHeight - scroller.clientHeight : null,
      goalFound: goal !== null,
      goalH: h(goal),
      actvH: h(actv),
      actvMin: actv ? parseFloat(getComputedStyle(actv).minHeight) : null,
      hasMeter: q(".os-goal-meter") !== null,
      hasIll: q(".os-goal-illph") !== null,
      hasHist: q(".os-goal-hist") !== null,
      hasCad: q(".os-goal-cad") !== null,
      hasMore: q(".os-goal-more") !== null,
      fill: fill ? { w: getComputedStyle(fill).width, bg: getComputedStyle(fill).backgroundColor } : null,
      text: goal ? (goal.textContent || "").replace(/\s+/g, " ").trim() : null,
    };
  });
}

/** The account's own count this month, read off the unset card's sentence. */
async function monthCount(page: import("@playwright/test").Page): Promise<number> {
  const t = (await readCard(page)).text ?? "";
  const m = /You've sent (\d+) quer/.exec(t);
  expect(m, `the unset card must state a count; got: ${t.slice(0, 90)}`).not.toBeNull();
  return Number(m![1]);
}

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1440, height: 720 },
];

test.afterAll(async () => { if (uid) await clearSeed(); });

for (const vp of SIZES) {
  test(`goals card — three states @ ${vp.width}x${vp.height}`, async ({ page }) => {
    const label = `${vp.width}x${vp.height}`;
    const lines: string[] = [];

    /* ── A · unset ─────────────────────────────────────────────────────────────────────────── */
    await seed(null, null);
    await openRoute(page, "/dashboard", vp);
    await page.waitForTimeout(1400);
    const a = await readCard(page);
    expect(a.scrollerFound, "`.ws-wbody` must exist — a null scroller passes vacuously").toBe(true);
    expect(a.goalFound, "the goals card must be on the page").toBe(true);
    const n = await monthCount(page);
    expect(a.hasMeter, "unset: no meter").toBe(false);
    expect(a.hasIll, "unset: no illustration").toBe(false);
    expect(a.hasCad, "unset: no cadence tag").toBe(false);
    expect(a.hasMore, "unset: no ⋯").toBe(false);
    lines.push(`A unset      goal ${a.goalH}  actv ${a.actvH} (min ${a.actvMin})  over ${a.over}  hist ${a.hasHist}  "${a.text?.slice(0, 66)}"`);

    /* ── B · in progress ───────────────────────────────────────────────────────────────────── */
    await seed(n + 5, "month");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1600);
    const b = await readCard(page);
    expect(b.hasMeter, "in progress: the meter draws").toBe(true);
    expect(b.hasIll, "in progress: no illustration").toBe(false);
    expect(b.hasCad, "in progress: the cadence tag").toBe(true);
    expect(b.hasMore, "in progress: the ⋯").toBe(true);
    lines.push(`B ${n}/${n + 5}       goal ${b.goalH}  actv ${b.actvH}  over ${b.over}  fill ${b.fill?.w} ${b.fill?.bg}`);

    /* ── C · reached ───────────────────────────────────────────────────────────────────────── */
    /* ⚠️ A TARGET OF 1 ONLY REACHES IF THE ACCOUNT HAS SENT SOMETHING THIS MONTH. With n = 0 there
       is no reached state to measure and saying so is better than measuring state B twice. */
    if (n >= 1) {
      await seed(Math.max(1, Math.min(n, 99)), "month");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1600);
      const c = await readCard(page);
      expect(c.hasIll, "reached: the illustration placeholder").toBe(true);
      expect(c.hasMeter, "⚠️ reached: THE METER IS GONE — at target it could only read full").toBe(false);
      expect(c.text, "reached: states the day").toContain("Target reached");
      /* ⚠️ THE GATE. State C is the tallest state; nothing may scroll because of it. */
      expect(c.over, `⚠️ ${label}: state C must not make the dashboard scroll`).toBeLessThanOrEqual(0);
      const slack = (c.actvH ?? 0) - (c.actvMin ?? 0);
      lines.push(`C reached    goal ${c.goalH}  actv ${c.actvH} (min ${c.actvMin}, slack ${Math.round(slack * 10) / 10})  over ${c.over}  hist ${c.hasHist}`);
      lines.push(`   Δ C−A ${Math.round(((c.goalH ?? 0) - (a.goalH ?? 0)) * 10) / 10}px   Δ C−B ${Math.round(((c.goalH ?? 0) - (b.goalH ?? 0)) * 10) / 10}px`);
      if (slack < 30) lines.push(`   ⚠️ SLACK UNDER 30px (${Math.round(slack)}) — flagged per the pack`);
    } else {
      lines.push("C reached    NOT MEASURED — the account has sent nothing this month");
    }

    console.log(`\n### ${label}\n${lines.join("\n")}`);
  });
}

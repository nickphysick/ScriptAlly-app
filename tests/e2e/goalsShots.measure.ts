/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pictures of the three states, for the report. Seeds and restores like its siblings.
 */
import { test } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc, deleteField, setDoc, deleteDoc } from "firebase/firestore";
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
}, "goals-shots");
const db = getFirestore(app);
const ids = ["probe-shot-1", "probe-shot-2", "probe-shot-3", "probe-shot-4"];
let uid = ""; let prior: unknown;
const today = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
};

test("three states, pictured", async ({ page }) => {
  const pw = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD!;
  const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", pw);
  uid = user.uid;
  prior = (await getDoc(doc(db, "users", uid))).data()?.queryingGoals;
  for (const id of ids) {
    await setDoc(doc(db, "users", uid, "queries", id), {
      id, userId: uid, manuscriptId: "seed-ms-1", agentId: "seed-agent-1", packageId: "",
      status: "Queried", dateSent: today(), personalisationNotes: "", sendMethod: "Email",
    });
  }
  const shot = async (name: string) => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.locator(".os-goal").first().screenshot({ path: `reports/goals/${name}.png` });
  };
  await updateDoc(doc(db, "users", uid), { queryingGoals: deleteField() } as never);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await shot("state-a-unset");
  await updateDoc(doc(db, "users", uid), { queryingGoals: [{ target: 12, cadence: "month", effectiveFrom: today() }] });
  await shot("state-b-progress");
  await updateDoc(doc(db, "users", uid), { queryingGoals: [{ target: 3, cadence: "month", effectiveFrom: today() }] });
  await shot("state-c-reached");
  for (const id of ids) await deleteDoc(doc(db, "users", uid, "queries", id));
  await updateDoc(doc(db, "users", uid), { queryingGoals: prior === undefined ? deleteField() : prior } as never);
});

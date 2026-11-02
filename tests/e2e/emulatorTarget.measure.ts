/**
 * THE e2e RUN READS THE EMULATOR AND NOTHING ELSE — measured on the wire, not inferred from config.
 *
 * Opens five signed-in routes and records every request the page makes. It fails if any reaches a
 * live Firebase backend (Firestore, Auth, Storage, Installations, Functions) or names either real
 * project, and it requires that Firestore traffic DID reach the emulator — a page that loaded no data
 * would otherwise pass by making no requests at all.
 *
 * Skipped on a live run (ALLOW_LIVE_FIRESTORE=1), where live traffic is the point.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";

const LIVE_HOSTS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebasestorage.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "cloudfunctions.net",
];
const REAL_PROJECTS = ["scriptally-dev", "gen-lang-client-0801391782"];

test("EMU1 · every backend request goes to the local emulators, none to a real project", async ({ page }) => {
  test.skip(process.env.ALLOW_LIVE_FIRESTORE === "1", "a live run is meant to reach the real backend");
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));

  await page.goto("/dashboard");
  await ensureSignedIn(page);
  for (const route of ["/dashboard", "/queries", "/agents", "/manuscripts", "/todo"]) {
    await page.goto(route);
    await page.locator("#ws-sidebar, .ws-work").first().waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(1500);
  }

  const live = urls.filter((u) => LIVE_HOSTS.some((h) => new URL(u).hostname.endsWith(h)));
  const named = urls.filter((u) => REAL_PROJECTS.some((p) => u.includes(p)));
  const toEmulator = urls.filter((u) => u.startsWith("http://127.0.0.1:8085/"));
  console.log(`EMU1 requests=${urls.length} firestoreEmulator=${toEmulator.length} live=${live.length} realProjectNamed=${named.length}`);

  expect(toEmulator.length, "no Firestore request reached the emulator — the page loaded nothing, so this proves nothing").toBeGreaterThan(0);
  expect(live, "requests to a live Firebase backend").toEqual([]);
  expect(named, "requests naming a real project").toEqual([]);
});

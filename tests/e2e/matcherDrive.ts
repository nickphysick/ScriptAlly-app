/**
 * One way into the column matcher for every e2e that drives it (onboarding v5 part 3, phase 4).
 * The matcher sits behind the Import page's third tile now; four suites each knew the old page's
 * labels, so the route in and the labels live here, once.
 *
 * `snapshot`/`cleanup` remove every document a run created, in the same run: queries (with their
 * history), agents, manuscripts and the feed's rows.
 */
import { type Page } from "@playwright/test";
import { collection, getDocs, deleteDoc, type Firestore } from "firebase/firestore";
import { openRoute, liftMotionSuppression } from "./measure";

export type Kind = "Agents" | "Manuscripts" | "Queries" | "Query history";
const visible = '.impm:not([hidden])';

/** Open /import, press "Match columns", and choose what the file holds. */
export async function openMatcher(page: Page, kind: Kind, viewport = { width: 1440, height: 1000 }) {
  await openRoute(page, "/import", viewport);
  await liftMotionSuppression(page);
  await page.locator('.impg [data-act="match"]:visible').first().click();
  await page.locator(`${visible} [data-impm="card"]`).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(`${visible}`).getByRole("radio", { name: new RegExp(`^${kind}`) }).click();
}

/** Paste the rows, read them, and press Import. Resolves when the run has finished. */
export async function runMatcher(page: Page, csv: string) {
  await page.locator(`${visible} [data-impm="paste"]`).fill(csv);
  await page.locator(`${visible} [data-impm="read"]`).click();
  await page.locator(`${visible} [data-impm="import"]`).waitFor({ state: "visible", timeout: 15_000 });
  await page.locator(`${visible} [data-impm="import"]`).click();
  await page.waitForFunction(() => document.querySelector('.impm [data-impm="run-title"]')?.textContent === "Import finished.", null, { timeout: 60_000 });
}

/** What the finished run shows. */
export async function readRun(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".impm")!;
    return {
      title: root.querySelector('[data-impm="run-title"]')?.textContent ?? "",
      counts: [...root.querySelectorAll('[data-impm="counts"] > div')].map((d) => `${d.querySelector("dt")?.textContent}: ${d.querySelector("dd")?.textContent}`),
      decide: [...root.querySelectorAll('[data-impm="decide"] li')].map((l) => (l.textContent ?? "").replace(/\s+/g, " ").trim()),
      log: [...root.querySelectorAll('[data-impm="log"] li')].map((l) => l.textContent ?? ""),
      text: (root as HTMLElement).innerText,
    };
  });
}

const COLLECTIONS = ["queries", "agents", "manuscripts", "activities"] as const;
export type Snapshot = Record<(typeof COLLECTIONS)[number], string[]>;
export async function snapshot(db: Firestore, uid: string): Promise<Snapshot> {
  const out = {} as Snapshot;
  for (const c of COLLECTIONS) out[c] = (await getDocs(collection(db, "users", uid, c))).docs.map((d) => d.id);
  return out;
}
/** Delete everything created since `before`; returns how many documents went. */
export async function cleanup(db: Firestore, uid: string, before: Snapshot): Promise<number> {
  let n = 0;
  for (const c of COLLECTIONS) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) {
      if (before[c].includes(d.id)) continue;
      if (c === "queries") for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); n += 1; }
      await deleteDoc(d.ref); n += 1;
    }
  }
  return n;
}

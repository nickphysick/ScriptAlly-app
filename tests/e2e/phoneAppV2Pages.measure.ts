/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 7 — THE MENU PAGES, PA2-7 (design-refs/phone-app-v2/ screens 32–38).
 *
 * P1 Responses' figures are `lib/responses`' and the wall holds exactly the passes and the no replies · P2 each
 * package's result is `packagesV38`'s, ranked only once enough have answered · P3 the Analytics headline, stage counts
 * and median wait are the app's own for the range, and the range is remembered · P4 milestone dates are the writer's
 * own first events, and the streak never reads a week after today · P5 the Materials and Comparable titles tiles land
 * on their sections, and Streaks & goals opens · P6 no Manuscripts file changed · P7 the colour laws and no image twice ·
 * P8 the desktop: PA2-1 S9 over this part's routes, and a computer sent from /goals to the dashboard.
 *
 * Every expected figure is computed here, in node, by the SAME library calls over the account's own records — so the
 * claim is that each page wires the right inputs to the right function, which is what a mutation of either breaks.
 */
import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { devDb } from "./devWrite";
import { Ledger, MS, PHONES, colourSweep, imageSweep, openPhone, shot, tag } from "./pa2Lib";
import { openRoute } from "./measure";
import { buildQcRows } from "../../src/lib/qcSummary";
import { listNos, pageCounts, respItems } from "../../src/lib/responses";
import { buildRows } from "../../src/lib/analytics";
import { creditedTo, packageSplit } from "../../src/lib/packageReplies";
import { figOf, labelStatus } from "../../src/lib/packagesV38";
import { inWindow, packageHeading, type PhoneRange } from "../../src/lib/phonePages";
import { bandFigures } from "../../src/lib/qc140";
import { analyticsModel } from "../../src/lib/analyticsModel";
import { anyToMs } from "../../src/lib/qcStages";
import { milestones, weekStreak } from "../../src/lib/milestones";
import { periodBounds } from "../../src/lib/queryingGoals";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SubmissionPackage, User } from "../../src/types";

test.setTimeout(600_000);
const PART = "part-7";
/** the commit before Part 7A — P6 diffs the part against it */
const PART_BASE = "5572ebce";

async function account() {
  const { db, uid } = await devDb();
  const all = async <T,>(c: string) => (await getDocs(collection(db, "users", uid, c))).docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
  const [queries, activities, agents, packages, versions, manuscripts] = await Promise.all([
    all<Query>("queries"), all<Activity>("activities"), all<Agent>("agents"), all<SubmissionPackage>("packages"), all<ManuscriptVersion>("versions"), all<Manuscript>("manuscripts")]);
  const user = (await getDoc(doc(db, "users", uid))).data() as User | undefined;
  return { queries, activities, agents, packages, versions, manuscripts, user };
}
const num = (page: Page, sel: string) => page.locator(sel).first().textContent().then((t) => Number((t ?? "").replace(/[^\d]/g, "")));

for (const vp of PHONES) {
  test(`PA2-7 · Responses and Manuscript · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `resp-ms-${tag(vp)}`);
    const a = await account();
    const nowMs = Date.now();
    const own = a.queries.filter((q) => q.manuscriptId === MS);
    const rows = buildQcRows(own, a.agents, a.activities, nowMs);
    const items = respItems(rows);
    const pc = pageCounts(items, rows);
    const wallWant = listNos(items, { kind: null, find: "", sort: "date", desc: true }).map((i) => i.id);

    /* P1 — Responses */
    await openPhone(page, "/queries/responses", vp);
    await page.locator('[data-pa="resp-band"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
    const replies = await num(page, '[data-pa="resp-replies"]'), sent = await num(page, '[data-pa="resp-sent"]');
    L.check("P1", `${tag(vp)} "Heard back from {replies} of {sent}" is pageCounts'`, replies === pc.replies && sent === pc.sent, `${replies} of ${sent} vs ${pc.replies} of ${pc.sent}`);
    const reqN = await num(page, '[data-pa="resp-reqn"]');
    L.check("P1", `${tag(vp)} the Requests count is the asked-for-more set`, reqN === pc.more, `${reqN} vs ${pc.more}`);
    const wall = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="resp-no"]')].map((e) => ({ id: e.dataset.id!, group: e.dataset.group!, t: e.style.transform })));
    L.check("pop", `${tag(vp)} the wall has cards`, wall.length > 2, String(wall.length));
    L.check("P1", `${tag(vp)} the wall holds exactly the passes and the no replies, newest first`, JSON.stringify(wall.map((w) => w.id)) === JSON.stringify(wallWant), `${wall.length} vs ${wallWant.length}`);
    const bad = wall.filter((w) => !["Rejected", "No Response"].includes(String(own.find((q) => q.id === w.id)?.status)));
    L.check("P1", `${tag(vp)} no card on the wall is anything but a pass or a no reply`, bad.length === 0, JSON.stringify(bad.slice(0, 3).map((b) => own.find((q) => q.id === b.id)?.status)));
    L.check("P1", `${tag(vp)} "{n} on the wall" counts the cards`, (await num(page, '[data-pa="resp-walln"]')) === wall.length, "");
    const tilts1 = wall.map((w) => w.t);
    await page.reload(); await page.locator('[data-pa="resp-no"]').first().waitFor({ timeout: 20_000 }); await page.waitForTimeout(500);
    const tilts2 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="resp-no"]')].map((e) => e.style.transform));
    L.check("P1", `${tag(vp)} each card's tilt is the same on every render`, JSON.stringify(tilts1) === JSON.stringify(tilts2), "");
    const col = await colourSweep(page, { roots: ".pa-band, .pa-pg" });
    L.check("P7", `${tag(vp)} Responses: white on navy, ink on blush, no green or red`, col.bad.length === 0 && col.navy > 0, col.bad.slice(0, 3).join(" | ") || `navy ${col.navy}`);
    for (const s of await imageSweep(page)) L.check("P7", `${tag(vp)} Responses: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `32-responses-${tag(vp)}`);
    await page.locator('[data-pa="resp-wall"]').evaluate((e) => e.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await shot(page, PART, `33-wall-${tag(vp)}`);

    /* P2 — the packages on the Manuscript page */
    const msQ = own;
    const rowsById = new Map(buildRows(msQ, a.activities, a.agents, nowMs).map((r) => [r.id, r]));
    const live = a.packages.filter((p) => p.manuscriptId === MS && p.status !== "Retired");
    await openPhone(page, "/manuscripts", vp);
    await page.locator('[data-pa="ms-band"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
    const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="ms-pkg"]')].map((e) => ({ id: e.dataset.id!, ranked: e.dataset.ranked, head: e.querySelector('[data-pa="ms-pkg-head"]')?.textContent ?? "", status: e.querySelector('[data-pa="ms-pkg-status"]')?.textContent ?? "" })));
    L.check("pop", `${tag(vp)} the packages are all drawn`, cards.length === live.length && cards.length > 0, `${cards.length} vs ${live.length}`);
    let early = 0, ranked = 0;
    for (const c of cards) {
      const p = live.find((x) => x.id === c.id)!;
      const f = figOf(packageSplit(p, msQ, rowsById), creditedTo(p.id, msQ), rowsById);
      if (f.ranked) ranked++; else if (f.sent) early++;
      L.check("P2", `${tag(vp)} ${p.packageName}: the heading is the first answers it drew`, c.head === packageHeading(f), `"${c.head}" vs "${packageHeading(f)}"`);
      L.check("P2", `${tag(vp)} ${p.packageName}: ranked only once ${4} have answered (labelStatus)`, c.status === labelStatus(f, false) && c.ranked === (f.ranked ? "1" : "0"), `"${c.status}" vs "${labelStatus(f, false)}"`);
    }
    L.check("pop", `${tag(vp)} a package still too early to rank`, early > 0, `${early} early, ${ranked} ranked`);
    /* the stats are whereItsBeen's and the live packages' */
    L.check("P2", `${tag(vp)} the packages figure is the live packages`, (await num(page, '[data-pa="ms-pkgn"]')) === live.length, "");
    const mcol = await colourSweep(page, { roots: ".pa-band, .pa-pg" });
    L.check("P7", `${tag(vp)} Manuscript: white on navy, ink on blush, no green or red`, mcol.bad.length === 0 && mcol.navy > 0, mcol.bad.slice(0, 3).join(" | ") || `navy ${mcol.navy}`);
    for (const s of await imageSweep(page)) L.check("P7", `${tag(vp)} Manuscript: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `37-manuscript-${tag(vp)}`);

    /* P5 — the tiles land on their sections */
    for (const [key, id] of [["materials", "materials"], ["comps", "comps"]] as const) {
      await openPhone(page, "/dashboard", vp);
      await page.locator('[data-pa="menu-btn"]').click(); await page.locator('[data-pa="menu-tiles"]').waitFor();
      await page.locator(`[data-pa="menu-tile"][data-key="${key}"]`).click();
      await page.waitForURL(new RegExp(`/manuscripts#${id}$`), { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const at = await page.evaluate((h) => {
        const el = document.querySelector<HTMLElement>(`[data-pa="manuscript"] #${h}`);
        const sc = el?.closest<HTMLElement>(".ws-wbody, .wpg-scroll, [data-stage-scroll]") ?? null;
        const r = el?.getBoundingClientRect(); const s = sc?.getBoundingClientRect();
        /* a section near the page's end cannot reach the top: there the landing is the scroller's end, the section on screen */
        const atEnd = !!sc && sc.scrollTop > 0 && Math.abs(sc.scrollHeight - sc.clientHeight - sc.scrollTop) < 2;
        return { url: location.pathname + location.hash, top: r ? Math.round(r.top - (s?.top ?? 0)) : null, h: window.innerHeight, atEnd, visible: !!r && r.top < (s?.bottom ?? window.innerHeight) - 40 };
      }, id);
      L.check("P5", `${tag(vp)} the ${key} tile opens the Manuscript page at #${id}`, at.url === `/manuscripts#${id}` && at.top != null && at.top >= -2 && (at.top < 120 || (at.atEnd && at.visible)), JSON.stringify(at));
    }
    L.done(14);
  });

  test(`PA2-7 · Analytics and Streaks & goals · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `an-goals-${tag(vp)}`);
    const a = await account();
    const nowMs = Date.now();
    const own = a.queries.filter((q) => q.manuscriptId === MS);

    /* P3 — the headline, the stages and the wait for each range; the range is remembered */
    await openPhone(page, "/queries/analytics", vp);
    await page.locator('[data-pa="an-band"]').waitFor({ timeout: 20_000 });
    for (const range of ["all", "d90"] as PhoneRange[]) {
      await page.locator(`[data-pa="an-range"][data-k="${range}"]`).click(); await page.waitForTimeout(500);
      const win = own.filter((q) => inWindow(anyToMs(q.dateSent), range, nowMs));
      const bf = bandFigures(buildQcRows(win, a.agents, a.activities, nowMs), nowMs);
      const model = analyticsModel({ queries: win, activities: a.activities, agents: a.agents, packages: a.packages, versions: a.versions, range: "all", nowMs, title: "" });
      const whole = analyticsModel({ queries: own, activities: a.activities, agents: a.agents, packages: a.packages, versions: a.versions, range: "all", nowMs, title: "" });
      const wait = whole.v17.glance.find((g) => g.key === "wait")![range];
      const got = await page.evaluate(() => ({
        pct: document.querySelector('[data-pa="an-pct"]')?.textContent ?? "", sub: document.querySelector('[data-pa="an-sub"]')?.textContent ?? "",
        stages: Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-pa="an-stage"]')].map((e) => [e.dataset.k!, Number(e.dataset.n)])),
      }));
      L.check("P3", `${tag(vp)} ${range}: "{p}% heard back" is bandFigures' heardPct`, got.pct === `${bf.heardPct}%`, `${got.pct} vs ${bf.heardPct}%`);
      L.check("P3", `${tag(vp)} ${range}: the stage counts are analyticsModel's reached counts`, got.stages.queried === model.sent && got.stages.request === model.requests && got.stages.full === model.fulls && got.stages.offer === model.offers, `${JSON.stringify(got.stages)} vs ${model.sent}/${model.requests}/${model.fulls}/${model.offers}`);
      L.check("P3", `${tag(vp)} ${range}: the wait is the glance's median for the range`, got.sub.includes(`median wait ${wait.value}${wait.unit ? ` ${wait.unit}` : ""}`), `"${got.sub}" vs ${wait.value} ${wait.unit}`);
    }
    await page.reload(); await page.locator('[data-pa="an-band"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(500);
    L.check("P3", `${tag(vp)} the range is remembered across a reload`, (await page.locator('[data-pa="an-band"]').getAttribute("data-range")) === "d90", "");
    await page.locator('[data-pa="an-range"][data-k="all"]').click(); await page.waitForTimeout(300);
    const weeks = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="an-week"]')].length);
    L.check("P3", `${tag(vp)} fourteen weeks`, weeks === 14, String(weeks));
    const acol = await colourSweep(page, { roots: ".pa-band, .pa-pg" });
    L.check("P7", `${tag(vp)} Analytics: white on navy, no green or red`, acol.bad.length === 0 && acol.navy > 0, acol.bad.slice(0, 3).join(" | ") || `navy ${acol.navy}`);
    await shot(page, PART, `34-analytics-${tag(vp)}`);

    /* P4 — milestones and the streak, from the writer's own queries */
    const rows = buildRows(a.queries, a.activities, a.agents, nowMs);
    const want = milestones(rows);
    const streak = weekStreak(rows.map((r) => r.sentMs), a.user?.queryingGoals, nowMs);
    await openPhone(page, "/goals", vp);
    await page.locator('[data-pa="goals"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
    const badges = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="goal-badge"]')].map((b) => ({ k: b.dataset.k!, earned: b.dataset.earned, at: b.dataset.at })));
    L.check("pop", `${tag(vp)} six milestones`, badges.length === 6, String(badges.length));
    for (const w of want) {
      const b = badges.find((x) => x.k === w.key);
      L.check("P4", `${tag(vp)} ${w.label}: earned and dated by the writer's own first event`, !!b && b.earned === (w.earned ? "1" : "0") && b.at === String(w.atMs ?? ""), `${JSON.stringify(b)} vs ${w.earned} ${w.atMs}`);
    }
    L.check("pop", `${tag(vp)} an earned milestone with a date`, want.some((w) => w.earned && w.atMs != null), "");
    const dots = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="goal-week"]')].map((d) => ({ start: d.dataset.start!, met: d.dataset.met })));
    const thisMonday = periodBounds("week", new Date(nowMs)).start;
    L.check("P4", `${tag(vp)} seven week dots, the last is this week, none after today`, dots.length === 7 && dots[6].start === thisMonday && dots.every((d) => d.start <= thisMonday), `${dots.map((d) => d.start).join(",")} vs ${thisMonday}`);
    L.check("P4", `${tag(vp)} the dots and the streak are weekStreak's`, JSON.stringify(dots) === JSON.stringify(streak.weeks.slice(-7).map((w) => ({ start: w.start, met: w.met ? "1" : "0" })))
      && (await page.locator('[data-pa="goal-streak"]').getAttribute("data-best")) === String(streak.best), "");
    const gcol = await colourSweep(page, { roots: ".pa-band, .pa-pg" });
    L.check("P7", `${tag(vp)} Streaks & goals: white on navy, no green or red`, gcol.bad.length === 0 && gcol.navy > 0, gcol.bad.slice(0, 3).join(" | ") || `navy ${gcol.navy}`);
    for (const s of await imageSweep(page)) L.check("P7", `${tag(vp)} Streaks & goals: no image twice`, new Set(s).size === s.length, JSON.stringify(s));
    await shot(page, PART, `36-goals-${tag(vp)}`);

    /* P5 — the Streaks & goals tile opens the page */
    await openPhone(page, "/dashboard", vp);
    await page.locator('[data-pa="menu-btn"]').click(); await page.locator('[data-pa="menu-tiles"]').waitFor();
    await page.locator('[data-pa="menu-tile"][data-key="goals"]').click(); await page.waitForTimeout(1200);
    L.check("P5", `${tag(vp)} the Streaks & goals tile opens /goals`, new URL(page.url()).pathname === "/goals" && (await page.locator('[data-pa="goals"]').count()) === 1, page.url());
    L.done(20);
  });
}

/* P6 opens no page, so it can run while a file is touched on purpose (bundleGuard would refuse a page measurement then) */
test("PA2-7 · P6 no Manuscripts file changed", async () => {
  const L = new Ledger(PART, "files");
  /* changed, deleted or renamed — the files that EXISTED when the part began; a new file the brief names (ManuscriptPhone) is not one */
  const touched = execSync(`git diff --name-only --diff-filter=MDR ${PART_BASE}`, { encoding: "utf8" }).split("\n").filter(Boolean);
  const forbidden = touched.filter((f) => f.startsWith("src/components/manuscripts/") || /(^|\/)AllManuscripts\.tsx$/.test(f) || /(^|\/)Manuscript[^/]*$/.test(f));
  L.check("pop", "the part changed existing files", touched.length > 3, String(touched.length));
  L.check("P6", "no Manuscripts file changed since the part began", forbidden.length === 0, forbidden.join(", "));
  L.done(2);
});

test("PA2-7 · P8 /goals on a computer", async ({ page }) => {
  const L = new Ledger(PART, "desktop-goals");
  await openRoute(page, "/goals", { width: 1512, height: 900 });
  await page.waitForTimeout(2500);
  L.check("P8", "on a computer /goals goes to the dashboard", new URL(page.url()).pathname === "/dashboard" && (await page.locator('[data-pa="goals"]').count()) === 0, page.url());
  L.done(1);
});

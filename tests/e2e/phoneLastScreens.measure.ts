/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PLS1 — the last screens on phones v1 (30 Oct; ref design-refs/phone-last-screens-v1/).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   this build (dev mode: `#/throw-lab` and `#/onb-lab` are dev-only)
 *   PLS1_BASE_URL=http://127.0.0.1:<port>     the build before the pack, for L11
 *   PLS1_MUTATE=<lock>                        that lock's named break, to prove it goes red
 *   PLS1_READINGS=<file>                      one JSON line of readings per lock
 *
 * The lab cases (L1, L2, L3) need no sign-in; the app cases sign in through `openPhone` (pa2Lib).
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION FIRST. A census over nothing passes.
 */
import { test, expect, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { PHONES, colourSweep, imageSweep, openPhone } from "./pa2Lib";
import { openRoute } from "./measure";
import { devDb } from "./devWrite";
import { doc, getDoc } from "firebase/firestore";

const MUTATE = process.env.PLS1_MUTATE ?? "";
const BEFORE = process.env.PLS1_BASE_URL ?? "";
const READINGS = process.env.PLS1_READINGS ?? "";
const origin = () => (test.info().project.use.baseURL as string).replace(/\/$/, "");
const record = (lock: string, data: unknown) => { if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, mutate: MUTATE || null, data }) + "\n"); };

const BREAK: Record<string, string> = {
  L1: "@media (max-width: 767.98px) { .sf--account .ws-ftsibs { display: flex !important; } }",
};

async function lab(page: Page, hash: string, vp: { width: number; height: number }, base = origin()) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("about:blank");
  await page.goto(`${base}/${hash}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(800);
}

test.describe("PLS1 the last screens on phones", () => {
  test("L1 account screens show one tab, nothing clipped at 320/360, no small capitals", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of [...PHONES, { width: 320, height: 700 }]) for (const s of ["signin", "signup", "reset", "reset-sent"]) {
      await lab(page, `#/onb-lab?s=${s}`, vp);
      rows.push({ vp: vp.width, s, ...(await page.evaluate(() => {
        const shown = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none";
        const tabs = [...document.querySelectorAll(".sf--account .ws-ftab, .sf--account .ws-ftsib")].filter(shown).length;
        const label = shown(document.querySelector(".sf--account .ws-ftg"));
        const caps: string[] = []; const clipped: string[] = []; let n = 0;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t: Node | null;
        while ((t = tw.nextNode())) {
          const el = t.parentElement; if (!el || !t.textContent?.trim() || el.closest(".ws-beta, script, style")) continue;
          const r = el.getBoundingClientRect(); if (!r.width) continue; const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
          n++;
          if (cs.textTransform === "uppercase" && parseFloat(cs.fontSize) < 14) caps.push(t.textContent.trim().slice(0, 20));
          if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) clipped.push(t.textContent.trim().slice(0, 20));
        }
        return { tabs, label, caps, clipped, n, overflow: document.documentElement.scrollWidth - innerWidth, frame: !!document.querySelector(".sf--account") };
      })) });
    }
    record("L1", rows);
    expect(rows.length).toBe(12);
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.frame, `${r.s}: the account frame`).toBe(true);
      expect(r.n as number, `${r.s}: text measured`).toBeGreaterThan(5);
      expect(r.tabs, `${r.s} @${r.vp}: one tab`).toBe(1);
      expect(r.label, `${r.s} @${r.vp}: no "Your account" label`).toBe(false);
      expect(r.caps, `${r.s} @${r.vp}: small capitals`).toEqual([]);
      expect(r.clipped, `${r.s} @${r.vp}: clipped text`).toEqual([]);
      expect(r.overflow as number, `${r.s} @${r.vp}: sideways scroll`).toBeLessThanOrEqual(0);
    }
  });

  test("L2 the dead ends carry the band and pinned actions; each action fires its own handler", async ({ page }) => {
    const want: Record<string, string[]> = { "used-free": ["back", "byhand", "template"], "used-pro": ["back", "byhand"], unreadable: ["back", "byhand", "download"], unloaded: ["byhand", "restart"] };
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) for (const [s, acts] of Object.entries(want)) {
      await lab(page, `#/onb-lab?s=${s}`, vp);
      const shape = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".sf-foothost");
        return {
          band: document.querySelector('[data-sf="pband-step"]')?.textContent ?? null,
          pinned: !!host && host.childElementCount > 0 && Math.round(host.getBoundingClientRect().bottom) === innerHeight,
          acts: [...(host?.querySelectorAll<HTMLElement>("button[data-act], button.sf-link") ?? [])].map((b) => b.dataset.act ?? b.textContent?.trim() ?? ""),
        };
      });
      const fired: Record<string, string[]> = {};
      for (const a of acts) {
        await lab(page, `#/onb-lab?s=${s}`, vp);
        /* the break: two actions' labels swapped, so each press reaches the other's handler */
        if (MUTATE === "L2") await page.evaluate(() => { const bs = [...document.querySelectorAll<HTMLElement>(".sf-foothost button")]; if (bs.length > 1) { const a = bs[0].dataset.act, b = bs[1].dataset.act; if (b) bs[0].dataset.act = b; else delete bs[0].dataset.act; if (a) bs[1].dataset.act = a; else delete bs[1].dataset.act; } });
        const sel = a === "back" ? ".sf-foothost button:not([data-act])" : `.sf-foothost [data-act="${a}"]`;
        await page.locator(sel).first().click({ timeout: 10_000 });
        fired[a] = await page.evaluate(() => ((window as unknown as { __onbLab?: { calls: { name: string }[] } }).__onbLab?.calls ?? []).map((c) => c.name));
      }
      rows.push({ vp: vp.width, s, ...shape, fired });
    }
    record("L2", rows);
    expect(rows.length).toBe(8);
    for (const r of rows as Array<{ vp: number; s: string; band: string | null; pinned: boolean; fired: Record<string, string[]> }>) {
      expect(r.band, `${r.s}: the band`).toMatch(/^Step \d of \d$/);
      expect(r.pinned, `${r.s} @${r.vp}: actions pinned`).toBe(true);
      for (const [a, calls] of Object.entries(r.fired)) expect(calls.length, `${r.s} ${a}: one handler fired`).toBe(1);
      const names = Object.values(r.fired).map((c) => c[0]);
      expect(new Set(names).size, `${r.s}: each action its own handler`).toBe(names.length);
    }
  });

  test("L3 the error page renders on a forced error, with Reload, Go to Home and the feedback link", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of [...PHONES, { width: 1440, height: 900 }]) {
      await lab(page, "#/throw-lab", vp);
      if (MUTATE === "L3") await page.addStyleTag({ content: ".eb-page { background: #F5F0EA !important; } .eb-btn--home, .eb-tell { display: none !important; }" });
      const r = await page.evaluate(() => {
        const pg = document.querySelector<HTMLElement>('[data-eb="page"]');
        const box = pg?.getBoundingClientRect();
        const vis = (s: string) => { const e = document.querySelector<HTMLElement>(s); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none"; };
        return {
          page: !!pg, bg: pg ? getComputedStyle(pg).backgroundColor : null, full: !!box && box.width === innerWidth && box.height === innerHeight,
          title: document.querySelector(".eb-h")?.textContent, titleFace: getComputedStyle(document.querySelector(".eb-h")!).fontFamily,
          reload: vis('[data-eb="reload"]'), home: vis('[data-eb="home"]'), tell: (document.querySelector<HTMLAnchorElement>('[data-eb="tell"]')?.getAttribute("href")) ?? null,
          tellShown: vis('[data-eb="tell"]'), colWidth: Math.round(document.querySelector(".eb-in")!.getBoundingClientRect().width),
        };
      });
      let homePath = "";
      if (r.home) { await page.click('[data-eb="home"]'); await page.waitForTimeout(300); homePath = await page.evaluate(() => location.pathname + location.hash); }
      rows.push({ vp: vp.width, ...r, homePath, gone: await page.locator('[data-eb="page"]').count() === 0 });
    }
    record("L3", rows);
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.page, `@${r.vp}: the fallback rendered`).toBe(true);
      expect(r.bg, `@${r.vp}: shell ink`).toBe("rgb(27, 36, 51)");
      expect(r.full).toBe(true);
      expect(r.title).toBe("Something went wrong.");
      expect(String(r.titleFace)).toMatch(/Special Elite/);
      expect(r.reload).toBe(true);
      expect(r.home, `@${r.vp}: Go to Home`).toBe(true);
      expect(r.tellShown, `@${r.vp}: Tell us what happened`).toBe(true);
      expect(r.tell).toBe("/contact");
      expect(r.colWidth as number).toBeLessThanOrEqual(420);
      expect(r.homePath, "Go to Home lands on /dashboard").toBe("/dashboard");
      expect(r.gone, "the boundary resets").toBe(true);
    }
  });

  test("L4 the four addresses open the right section or tab on a phone; desktop routes unchanged", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    const cases: [string, string, string][] = [
      ["/queries/packages", "/manuscripts#packages", '[data-pa="ms-pkgs"]'],
      ["/manuscripts/comps", "/manuscripts#comps", "#comps"],
      ["/manuscripts/versions", "/manuscripts#versions", '[data-pa="ms-pro"]'],
      ["/todo/calendar", "/todo", '[data-pa="wk-day"]'],
    ];
    for (const vp of PHONES) {
      await openPhone(page, "/dashboard", vp);
      for (const [from, to, mark] of cases) {
        await page.goto(`${origin()}/dashboard`); await page.locator('[data-pa="band"]').first().waitFor();
        await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, from);
        if (MUTATE === "L4") await page.evaluate((p) => history.replaceState({}, "", p), from);
        await page.waitForTimeout(1500);
        const r = await page.evaluate((m) => {
          const el = document.querySelector<HTMLElement>(m);
          const head = (el && el.id !== "comps" && el.dataset.pa !== "wk-day" ? el.previousElementSibling as HTMLElement : el) ?? null;
          const t = head?.getBoundingClientRect().top ?? null;
          return { at: location.pathname + location.hash, top: t, vh: innerHeight };
        }, mark);
        await page.goBack(); await page.waitForTimeout(500);
        const back = await page.evaluate(() => location.pathname);
        rows.push({ vp: vp.width, from, to, ...r, back });
      }
    }
    await openRoute(page, "/queries/packages", { width: 1440, height: 900 }); await page.waitForTimeout(800);
    const desk = await page.evaluate(() => location.pathname);
    record("L4", { rows, desk });
    expect(rows.length).toBe(8);
    for (const r of rows as Array<{ vp: number; from: string; to: string; at: string; top: number | null; vh: number; back: string }>) {
      expect(r.at, `${r.from} @${r.vp}`).toBe(r.to);
      expect(r.top, `${r.from} @${r.vp}: its section is on screen`).not.toBeNull();
      expect(r.top!, `${r.from} @${r.vp}: its section is near the top`).toBeGreaterThanOrEqual(0);
      expect(r.top!).toBeLessThan(r.vh * 0.6);
      expect(r.back, `${r.from} @${r.vp}: back returns to the opener`).toBe("/dashboard");
    }
    expect(desk, "the desktop route is unchanged").toBe("/queries/packages");
  });

  test("L5 the matcher tile on a phone opens the sheet; both doors reach their flows; desktop opens the matcher", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) {
      await openPhone(page, "/import", vp);
      if (MUTATE === "L5") await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-pa="imp-match"]'); b?.replaceWith(Object.assign(document.createElement("a"), { textContent: "x" })); });
      await page.locator('[data-pa="imp-match"]').click({ timeout: 10_000 });
      await page.waitForTimeout(500);
      const sheet = await page.locator('[data-pa="imp-match-sheet"]').isVisible();
      const words = sheet ? await page.locator('[data-pa="imp-match-sheet"]').innerText() : "";
      const smartEnabled = sheet && await page.locator('[data-pa="imp-match-smart"]').isEnabled();
      const tplChooser = sheet ? await Promise.race([page.waitForEvent("filechooser", { timeout: 5000 }).then(() => true).catch(() => false), page.locator('[data-pa="imp-match-template"]').click().then(() => new Promise<boolean>(() => {}))]) : false;
      rows.push({ vp: vp.width, sheet, words: words.slice(0, 80), smartEnabled, tplChooser, matcher: await page.locator('[data-impm]').count() });
    }
    await openRoute(page, "/import", { width: 1440, height: 900 }); await page.waitForTimeout(600);
    await page.locator('[data-tile="match"] [data-act="match"]').click(); await page.waitForTimeout(500);
    const desk = await page.locator('[data-impg="matcher-view"]').count();
    record("L5", { rows, desk });
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.sheet, `@${r.vp}: the sheet opens`).toBe(true);
      expect(String(r.words)).toContain("Matching columns works best on a computer.");
      expect(r.tplChooser, `@${r.vp}: Upload my sheet reaches the template upload`).toBe(true);
      expect(r.matcher, `@${r.vp}: the matcher stays shut on a phone`).toBe(0);
    }
    expect(desk, "the desktop tile still opens the matcher").toBe(1);
  });

  test("L6 email drop: paste, two proposals, untick one, only the other is saved", async ({ page }) => {
    /* On `#/email-drop-lab` (dev only): the phone screens over a fixture, the save recorded rather than
       written. ⚠️ The brief's account-writing half (save on the harness account, then Undo) cannot run:
       the flow is Pro only and the harness account is free (the rules refuse a client plan change). */
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) {
      await lab(page, "#/email-drop-lab", vp);
      const paste = await page.evaluate(() => ({
        allowance: document.querySelector('[data-edp="allowance"]')?.textContent, clip: !!document.querySelector('[data-edp="clipboard"]'),
        readOff: (document.querySelector('[data-edp="read"]') as HTMLButtonElement | null)?.disabled,
        area: Math.round(document.querySelector('[data-edp="text"]')!.getBoundingClientRect().height),
        pinBottom: Math.round(document.querySelector(".edp-pin")!.getBoundingClientRect().bottom), vh: innerHeight,
      }));
      await page.fill('[data-edp="text"]', "Dear Writer, I'd love to read the full manuscript. Best, Marcus");
      await page.click('[data-edp="read"]');
      await page.locator('[data-edp="updates"]').waitFor();
      const count = await page.locator('[data-edp="count"]').innerText();
      const n = await page.locator('[data-edp="proposal"]').count();
      const tickedAtFirst = await page.locator('[data-edp="tick"]:checked').count();
      await page.locator('[data-edp="tick"]').nth(1).click();
      if (MUTATE === "L6") await page.locator('[data-edp="tick"]').nth(1).click(); // the break: save all
      const label = await page.locator('[data-edp="save"]').innerText();
      await page.click('[data-edp="save"]');
      const saved = await page.evaluate(() => (window as unknown as { __edLab?: { saved: { resultingStatus: string }[] | null } }).__edLab?.saved?.map((r) => r.resultingStatus) ?? null);
      rows.push({ vp: vp.width, ...paste, count, n, tickedAtFirst, label, saved });
    }
    record("L6", rows);
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.n, `@${r.vp}: proposals`).toBe(2);
      expect(r.count).toBe("2 updates found");
      expect(r.tickedAtFirst, "ticked by default").toBe(2);
      expect(r.readOff, "Read waits for an email").toBe(true);
      expect(r.area).toBe(280);
      expect(r.pinBottom).toBe(r.vh);
      expect(r.label).toBe("Save 1 update");
      expect(r.saved, `@${r.vp}: only the ticked proposal is saved`).toEqual(["Full Requested"]);
    }
  });

  test("L7 editing: every drawer field is reachable; the wheel saves the drawer's own value and Undo restores it", async ({ page }) => {
    /* WRITES AND UNDOES on the harness account: one reply-window change, through the phone screens. */
    test.setTimeout(400_000);
    const vp = PHONES[0];
    await openPhone(page, "/queries", vp);
    const id = await page.locator('[data-qm1="row"]').first().getAttribute("data-id");
    expect(id, "a query to edit").toBeTruthy();
    await page.locator(`[data-qm1="row"][data-id="${id}"] .pa-row`).click();
    await page.locator('.pa-qsheet [data-qc149c="more-btn"]').click(); await page.waitForTimeout(400);
    await page.locator('[data-pa="more-edit"]').click();
    await page.locator('[data-eqp="page"]').waitFor({ timeout: 10_000 });
    const sections = await page.locator('[data-eqp="section"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.section));
    /* every drawer field, by the section that holds it (the report's map); each section must open a step */
    const FIELD_SECTION: Record<string, string> = {
      agentId: "agent", manuscriptId: "sent", packageId: "sent", materialsWanted: "sent", personalisationNotes: "sent",
      dateSent: "howwhen", sendMethod: "howwhen", writerExpectedDate: "reply", ifNoResponse: "reply",
      timelineAppends: "responses", timelineEdits: "responses", timelineDeletes: "responses", rejectionType: "responses", agentComments: "responses", journal: "notes",
    };
    const opened: Record<string, string> = {};
    for (const sec of sections) {
      await page.locator(`[data-eqp="section"][data-section="${sec}"]`).click();
      opened[sec!] = (await page.locator('[data-eqp="step"]').getAttribute("data-section")) ?? "";
      await page.locator('[data-eqp="cancel"]').click(); await page.waitForTimeout(200);
    }
    const { db, uid } = await devDb();
    const before = (await getDoc(doc(db, "users", uid, "queries", id!))).data()!;
    await page.locator('[data-eqp="section"][data-section="reply"]').click();
    if (MUTATE === "L7") await page.evaluate(() => { const d = document.querySelector('[data-eqp="due"]'); d?.replaceWith(d.cloneNode(true)); });
    const due0 = await page.locator('[data-eqp="due"]').innerText();
    const wk0 = Number(await page.locator('[data-eqp="col-weeks"] .eqp-it.on').innerText());
    const wk = wk0 === 11 ? 13 : 11, dy = 3;
    await page.locator('[data-eqp="col-weeks"]').evaluate((e, w) => { e.scrollTop = w * 40; }, wk);
    await page.locator('[data-eqp="col-days"]').evaluate((e, d) => { e.scrollTop = d * 40; }, dy);
    await page.waitForTimeout(500);
    const due1 = await page.locator('[data-eqp="due"]').innerText();
    const sentMs = new Date(before.dateSent).getTime();
    const s = new Date(sentMs + (wk * 7 + dy) * 86_400_000);
    const want = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 12).toISOString(); /* the drawer's own: the date input at noon */
    await page.locator('[data-eqp="save"]').click();
    await page.locator('[data-pa="snack"]').waitFor({ timeout: 15_000 });
    const saved = (await getDoc(doc(db, "users", uid, "queries", id!))).data()!;
    await page.locator('[data-pa="snack-undo"]').click();
    await page.waitForTimeout(2500);
    const after = (await getDoc(doc(db, "users", uid, "queries", id!))).data()!;
    record("L7", { id, sections, opened, due0, due1, wk, dy, want, saved: saved.writerExpectedDate, restored: after.writerExpectedDate ?? null, was: before.writerExpectedDate ?? null });
    expect(sections).toEqual(["agent", "sent", "howwhen", "reply", "responses", "notes"]);
    for (const sec of new Set(Object.values(FIELD_SECTION))) expect(opened[sec], `section ${sec} opens its step`).toBe(sec);
    expect(due1, "the band's date updates before saving").not.toBe(due0);
    expect(saved.writerExpectedDate, "the wheel saves the drawer's value for that input, days kept").toBe(want);
    expect(after.writerExpectedDate ?? null, "Undo puts the query back").toBe(before.writerExpectedDate ?? null);
  });

  test("L10 colour laws and no image twice on this pack's phone screens", async ({ page }) => {
    const bad: string[] = []; let judged = 0;
    for (const vp of PHONES) {
      for (const s of ["signin", "signup", "reset", "used-free", "unreadable", "unloaded"]) {
        await lab(page, `#/onb-lab?s=${s}`, vp);
        const c = await colourSweep(page); judged += c.navy + c.blush; c.bad.forEach((b: string) => bad.push(`${s} ${b}`));
        for (const set of await imageSweep(page)) set.filter((x, i) => set.indexOf(x) !== i).forEach((x) => bad.push(`${s} image twice ${x}`));
      }
      await openPhone(page, "/import", vp);
      await page.locator('[data-pa="imp-match"]').click(); await page.waitForTimeout(400);
      const c = await colourSweep(page); judged += c.navy + c.blush; c.bad.forEach((b: string) => bad.push(`match ${b}`));
    }
    record("L10", { judged, bad });
    expect(judged).toBeGreaterThan(0);
    expect([...new Set(bad)]).toEqual([]);
  });

  test("L11 desktop unchanged at 1440 and 1280 on the touched lab screens (the error page exempt by name)", async ({ browser }) => {
    test.skip(!BEFORE, "PLS1_BASE_URL is required");
    const screens = ["signin", "signup", "reset", "used-free", "used-pro", "unreadable", "nothing", "unloaded", "import-page"];
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) for (const s of screens) {
      const grab = async (base: string, broken: boolean) => {
        const ctx = await browser.newContext(); const p = await ctx.newPage();
        await p.setViewportSize({ width: w, height: h }); await p.emulateMedia({ reducedMotion: "reduce" });
        await p.goto(`${base}/#/onb-lab?s=${s}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700);
        if (broken && MUTATE === "L11") await p.addStyleTag({ content: ".sf--account .ws-ftsibs { display: none !important; }" });
        const dom = await p.evaluate(() => document.body.innerHTML.replace(/ style="[^"]*"/g, ""));
        const png = await p.screenshot({ fullPage: true }); await ctx.close(); return { dom, png };
      };
      const A: Buffer[] = [], B: Buffer[] = []; let dom = true;
      for (let k = 0; k < 5; k++) { // the sign-up screen renders one of two byte-different frames on the same build
        const a = await grab(BEFORE, false), b = await grab(origin(), true);
        if (k === 0) dom = a.dom === b.dom;
        A.push(a.png); B.push(b.png);
        if (A.some((x) => B.some((y) => x.equals(y)))) break;
      }
      rows.push({ vp: w, s, dom, px: A.some((x) => B.some((y) => x.equals(y))) });
    }
    record("L11", rows);
    expect(rows.length).toBe(screens.length * 2);
    expect(rows.filter((r) => !r.dom || !r.px), "screens that changed at a desktop width").toEqual([]);
  });
});

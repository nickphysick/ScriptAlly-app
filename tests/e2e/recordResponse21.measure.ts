/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2.1 — THE LOCKS, on the rendered page, over the emulator's harness account at 1440 × 900
 * (design-refs/record-a-response-v2-1).
 *
 *   P1  the recorded screen follows what was saved: for a partial and a full request that has gone (with a reminder,
 *       with a reply date only, with no reply date) and one not yet sent, the head, the big line and the sentence agree
 *       with the status on the card beneath; no sentence narrates the status change
 *   P2  "Open {First}'s card" opens the query's card OVER the journey: the journey stays in the page, dimmed and stepped
 *       back (its box measured against the card's), takes no Tab; Escape closes only the card; the same recorded screen
 *       comes back with focus on "Open {First}'s card"; Undo still restores; the path never changes
 *
 * Each case records and then undoes, so the harness account is left as it was.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/recordResponse21.measure.ts --project=measure`.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/record-a-response-v2-1";
const VP = { width: 1440, height: 900 };
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const R = (k: string) => `[data-rar="root"] [data-rar="${k}"]`;
class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); this.save(); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); }
  save() { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1)); }
  done(floor: number) {
    this.save();
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
async function openFromDashboard(page: Page) {
  await openApp(page, "/dashboard", VP);
  await page.locator("[data-d2='record']").filter({ visible: true }).first().click();
  await page.locator('[data-rar="root"]').waitFor({ timeout: 10_000 });
  await settle(page);
}
const click = (page: Page, k: string) => page.locator(R(k)).first().click();
/** Queried → a partial or full request, today, asked for as offered, then the "sent" answer */
async function toSent(page: Page, k: "pr" | "fr", sent: "yes" | "no", reply: "nudge" | "date" | "unknown" = "nudge"): Promise<string> {
  const row = page.locator(`${R("who-row")}[data-status="Queried"]`).first();
  await row.waitFor({ timeout: 10_000 });
  const id = (await row.getAttribute("data-id")) ?? "";
  await row.click(); await settle(page);
  await page.locator(`${R("kind")}[data-k="${k}"]`).click(); await settle(page);
  await page.locator(`${R("when-opt")}[data-k="today"]`).click(); await settle(page);
  await click(page, "asked-go"); await settle(page);
  await page.locator(`${R("opt-row")}[data-k="${sent}"] > button`).click(); await settle(page);
  if (sent === "yes") {
    if (reply === "unknown") { await page.locator(`${R("slider")}[data-k="wk"] .sa-wk-unkbtn`).click(); await settle(page); }
    if (reply === "date") { await click(page, "nudge"); await settle(page); }
    await click(page, "sent-go"); await settle(page);
    await click(page, "went-ask"); await settle(page);
  } else {
    await click(page, "sent-go"); await settle(page);
  }
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 10_000 });
  return id;
}
async function record(page: Page) {
  await click(page, "record");
  await page.locator('[data-rar="root"][data-step="done"]').waitFor({ timeout: 45_000 });
  await settle(page, 700);
}
async function undo(page: Page) {
  await click(page, "undo");
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 45_000 });
  await settle(page, 800);
}
/* the most specific first: the card's text runs its words together, so this is a substring match */
const STAGES = ["Partial requested", "Partial sent", "Full requested", "Full sent", "Revise & Resubmit", "Offer", "Rejected", "Withdrawn", "Queried"];
async function readDone(page: Page) {
  return page.evaluate((stages) => {
    const t = (s: string) => (document.querySelector(s)?.textContent ?? "").replace(/\s+/g, " ").trim();
    const card = t('[data-rar="done"] .laq-slipw');
    return {
      head: t('[data-rar="root"] .flh-t'), slot: t('[data-rar="done"] .qi-slot'),
      big: t('[data-rar="done-head"]'), line: t('[data-rar="done-line"]'),
      status: stages.find((s) => card.includes(s)) ?? null, card: card.slice(0, 160),
    };
  }, STAGES);
}
const NARRATES = /so the query is now|the query is now|is now (partial|full)/i;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(VP);
  page.on("console", (m) => { if (m.type() === "error" && /record a response|FirebaseError|permission/i.test(m.text())) console.log(`[page error] ${m.text().slice(0, 400)}`); });
});

test("P1 · the recorded screen follows what was saved", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("P1");
  const cases: { name: string; k: "pr" | "fr"; sent: "yes" | "no"; reply?: "nudge" | "date" | "unknown"; status: string; head: RegExp; big: RegExp; line: RegExp; slot: RegExp }[] = [
    { name: "partial, gone, reminder", k: "pr", sent: "yes", reply: "nudge", status: "Partial sent", head: /^Recorded\. Partial sent!/, big: /^Your partial is with .+\.$/, line: /^We’ll remind you to nudge on \w{3} \d+ \w{3}\.$/, slot: /celebration · partial sent/ },
    { name: "full, gone, reminder", k: "fr", sent: "yes", reply: "nudge", status: "Full sent", head: /^Recorded\. Full sent!/, big: /^Your full is with .+\.$/, line: /^We’ll remind you to nudge on \w{3} \d+ \w{3}\.$/, slot: /celebration · full sent/ },
    { name: "partial, gone, reply date only", k: "pr", sent: "yes", reply: "date", status: "Partial sent", head: /^Recorded\. Partial sent!/, big: /^Your partial is with .+\.$/, line: /^A reply is expected by \w{3} \d+ \w{3}\.$/, slot: /celebration · partial sent/ },
    { name: "partial, gone, no reply date", k: "pr", sent: "yes", reply: "unknown", status: "Partial sent", head: /^Recorded\. Partial sent!/, big: /^Your partial is with .+\.$/, line: /^There’s no reply date yet\.$/, slot: /celebration · partial sent/ },
    { name: "partial, not yet sent", k: "pr", sent: "no", status: "Partial requested", head: /^Recorded\. A partial request!/, big: /^.+ wants to read more\.$/, line: /^Sending your partial is on your to-do list for \w{3} \d+ \w{3}\.$/, slot: /celebration · partial request/ },
  ];
  for (const c of cases) {
    await openFromDashboard(page);
    await toSent(page, c.k, c.sent, c.reply);
    await record(page);
    const d = await readDone(page);
    const tag = `${c.name}`;
    L.check(`${tag}: the card beneath shows ${c.status}`, d.status === c.status, `${d.status} · ${d.card}`);
    L.check(`${tag}: the head`, c.head.test(d.head), d.head);
    L.check(`${tag}: the big line`, c.big.test(d.big), d.big);
    L.check(`${tag}: the sentence`, c.line.test(d.line), d.line);
    L.check(`${tag}: the illustration slot`, c.slot.test(d.slot), d.slot);
    L.check(`${tag}: nothing narrates the status change`, !NARRATES.test(`${d.head} ${d.big} ${d.line}`), d.line);
    await undo(page);
    await page.keyboard.press("Escape"); await settle(page, 300);
    if (await page.locator(R("leave-discard")).count()) { await page.locator(R("leave-discard")).click(); await settle(page, 700); }
  }
  L.done(30);
});

/* ── P2 · the card opens over the journey ── */
async function stack(page: Page) {
  return page.evaluate(() => {
    const j = document.querySelector<HTMLElement>('[data-side-panel][data-rar="panel"]');
    const c = [...document.querySelectorAll<HTMLElement>('[data-side-panel][data-qp="panel"]')].find((x) => x.getBoundingClientRect().width > 0) ?? null;
    const box = (e: HTMLElement | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left * 10) / 10, t: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
    return {
      journey: !!j, under: j?.getAttribute("data-under") ?? null, inert: !!j?.inert, dim: j ? getComputedStyle(j, "::after").opacity : null,
      dimBg: j ? getComputedStyle(j, "::after").backgroundColor : null, transform: j ? getComputedStyle(j).transform : null,
      step: document.querySelector('[data-rar="root"]')?.getAttribute("data-step") ?? null,
      jBox: box(j), cBox: box(c), card: !!c, path: location.pathname + location.hash.replace(/\?.*$/, ""), href: location.href,
      focus: (document.activeElement as HTMLElement | null)?.getAttribute("data-rar") ?? document.activeElement?.tagName ?? null,
      inJourney: !!j && j.contains(document.activeElement), bodyScroll: document.querySelector<HTMLElement>('[data-rar="body"]')?.scrollTop ?? null,
      doneHead: document.querySelector('[data-rar="done-head"]')?.textContent ?? null,
    };
  });
}

test("P2 · the card opens over the journey, and closing it brings the journey back", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("P2");
  await openFromDashboard(page);
  const qid = await toSent(page, "pr", "yes", "nudge");
  await record(page);
  const s0 = await stack(page);
  const openCard = async () => {
    await page.locator(R("open-card")).click();
    await page.locator('[data-side-panel][data-qp="panel"]').first().waitFor({ timeout: 15_000 });
    await settle(page, 900);
  };
  const back = async (how: string) => {
    await page.locator('[data-side-panel][data-qp="panel"]').first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
    await settle(page, 900);
    const s = await stack(page);
    L.check(`${how}: the card is gone`, !s.card, JSON.stringify(s.cBox));
    L.check(`${how}: the same recorded screen is back, forward`, s.journey && s.step === "done" && s.under === null && !s.inert && s.doneHead === s0.doneHead, `${s.step} · under ${s.under} · inert ${s.inert} · ${s.doneHead}`);
    L.check(`${how}: the journey is back in its place (no step back)`, s.transform === "none" || s.transform === "matrix(1, 0, 0, 1, 0, 0)", String(s.transform));
    L.check(`${how}: focus is on “Open {First}’s card”`, s.focus === "open-card", String(s.focus));
    L.check(`${how}: the same scroll`, s.bodyScroll === s0.bodyScroll, `${s.bodyScroll} (was ${s0.bodyScroll})`);
    L.check(`${how}: the path is unchanged`, s.path === s0.path && !/[?&]q=/.test(s.href), `${s.href} (was ${s0.path})`);
  };

  /* 1 — open: both in the page, the journey stepped back and dimmed behind the card */
  await openCard();
  const s1 = await stack(page);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/ledger/P2-boxes.json`, JSON.stringify({ viewport: VP, recorded: s0.jBox, stacked: { journey: s1.jBox, card: s1.cBox, transform: s1.transform, dim: s1.dim, dimBg: s1.dimBg } }, null, 1));
  L.check("open: the journey is still in the page", s1.journey && s1.step === "done", `${s1.journey} · ${s1.step}`);
  L.check("open: the card is open", s1.card, JSON.stringify(s1.cBox));
  L.check("open: the journey is marked under and inert", s1.under === "true" && s1.inert, `${s1.under} · ${s1.inert}`);
  L.check("open: the journey is dimmed .45 over the whole panel", s1.dim === "1" && /rgba\(28, 19, 15, 0\.45\)/.test(s1.dimBg ?? ""), `${s1.dim} · ${s1.dimBg}`);
  L.check("open: the journey is scaled to .955 and moved 40px left", /^matrix\(0\.955, 0, 0, 0\.955, /.test(s1.transform ?? ""), String(s1.transform));
  const j = s1.jBox, c = s1.cBox;
  if (j && c) {
    L.check("open: about 15px of the journey's left edge shows beside the card", c.l - j.l >= 10 && c.l - j.l <= 22, `${(c.l - j.l).toFixed(1)}px`);
    L.check("open: the journey's right edge sits behind the card", j.r < c.r && j.r > c.l, `journey ${j.l}–${j.r}, card ${c.l}–${c.r}`);
    L.check("open: the journey is narrower than before by the scale", Math.abs(j.w - (s0.jBox?.w ?? 0) * 0.955) <= 1.5, `${j.w} vs ${s0.jBox?.w} × .955`);
  } else L.check("open: both boxes measured", false, JSON.stringify({ j, c }));
  L.check("open: the path is unchanged", s1.path === s0.path, `${s1.href} (was ${s0.path})`);
  /* Tab never reaches the journey */
  let tabbedIn = 0;
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); if ((await stack(page)).inJourney) tabbedIn++; }
  L.check("open: Tab never reaches the journey's controls", tabbedIn === 0, `${tabbedIn} of 12 presses landed in the journey`);
  /* 2 — Escape closes only the card */
  await page.keyboard.press("Escape");
  await back("Escape");

  /* 3 — the card's ✕ */
  await openCard();
  await page.locator('[data-side-panel][data-qp="panel"] button[aria-label^="Close"]').first().click();
  await back("the card's ✕");

  /* 4 — a click on the dimmed journey */
  await openCard();
  const s4 = await stack(page);
  if (s4.jBox && s4.cBox) await page.mouse.click(s4.jBox.l + Math.max(4, (s4.cBox.l - s4.jBox.l) / 2), (s4.jBox.t + s4.jBox.b) / 2);
  await back("a click on the dimmed journey");

  /* 5 — Undo still restores the snapshot */
  await page.locator(R("undo")).click();
  await page.locator('[data-rar="root"][data-step="check"]').waitFor({ timeout: 45_000 }).catch(() => undefined);
  await settle(page, 900);
  L.check("Undo after the card: back on the review", (await stack(page)).step === "check", String((await stack(page)).step));
  await page.keyboard.press("Escape"); await settle(page, 300);
  if (await page.locator(R("leave-discard")).count()) { await page.locator(R("leave-discard")).click(); await settle(page, 700); }
  await openFromDashboard(page);
  const st = await page.locator(`${R("who-row")}[data-id="${qid}"]`).first().getAttribute("data-status").catch(() => null);
  L.check("Undo after the card: the query is back at Queried", st === "Queried", `${qid}: ${st}`);
  L.done(28);
});

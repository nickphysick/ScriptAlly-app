/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.1 — the QC1521 locks (design-refs/query-centre-v152-1/), on the rendered page at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (tests/e2e/seedQc152.mjs, seeded and removed in the same run). Each asserts its
 * population first and was red first: against the v152 build it amends (QC1521_BASE=1) and against its named mutation
 * (QC1521_MUTATE=L<n>: a page break here, or a source break in tests/e2e/qc1521Mutate.sh).
 *
 *   §1  L1 queried
 *   §2  L2 events only · L3 colour rule · L4 waits · L5 nudge · L6 quote · L7 collapse · L9 no colour · L10 new steps
 *   §3  L8 footer
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v152-1";
const MUT = process.env.QC1521_MUTATE ?? "";
const BASE = process.env.QC1521_BASE === "1";
const ONLY = process.env.QC1521_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the named page breaks (source breaks live in qc1521Mutate.sh) */
const PAGE_MUT: Record<string, string> = {
  /* (L1's mutation is a source break: #e6d9c6 put back in STATUS_FILL — qc1521Mutate.sh) */
};

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { encoding: "utf8", stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { encoding: "utf8", stdio: "pipe" }); });

async function open(page: Page, vp: VP, o: { group?: string } = {}) {
  await page.addInitScript((g) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: g, sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o.group ?? "attention");
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  if (PAGE_MUT[MUT]) await page.addStyleTag({ content: PAGE_MUT[MUT] });
}
const click = (page: Page, sel: string) => page.locator(sel).first().click({ timeout: 8000 }).catch(() => {});

/** open a fixture's card by its row, and wait for the panel to settle */
async function openCard(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("[data-qcv='row-first'], td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`[data-qp='panel'] [data-qc152='card'][data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const CARD = "[data-qp='panel'] [data-qc152='card']";
const OLD_SAND = "rgb(230, 217, 198)";

for (const vp of SIZES) {
  test.describe(`QC1521 §1 @ ${vp.width}`, () => {
    test("L1 · queried: Queried caps #f2ebe0, its status header #f4eee5, its Birds-eye bars #f2ebe0 / #f7f2ea, and #e6d9c6 nowhere", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      /* the old colour, anywhere on the page: every element's own colours (backgrounds, text, borders, shadows) */
      const sweep = () => page.evaluate((old) => {
        const hits: string[] = [];
        let n = 0;
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          const s = getComputedStyle(el); n++;
          const all = [s.backgroundColor, s.backgroundImage, s.color, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor, s.boxShadow, s.outlineColor].join(" ");
          if (all.includes(old)) hits.push(`${el.tagName.toLowerCase()}.${(el.className && typeof el.className === "string" ? el.className : "").split(" ")[0]}`);
        }
        return { n, hits };
      }, OLD_SAND);

      /* the list, grouped by who it's with: the row caps */
      await open(page, vp);
      const caps = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")]
        .filter((r) => r.querySelector("[data-qc1512='cap']") && /Queried/.test(r.querySelector("[data-qc1512='cap']")!.parentElement?.textContent ?? ""))
        .map((r) => getComputedStyle(r.querySelector<HTMLElement>("[data-qc1512='cap']")!).backgroundColor));
      L.check("population: Queried rows with a cap", caps.length >= 4, `${caps.length}`);
      L.check("every Queried row's cap is #f2ebe0", caps.length > 0 && caps.every((c) => c === "rgb(242, 235, 224)"), JSON.stringify([...new Set(caps)]));
      const s1 = await sweep();
      L.check("population: the list page swept", s1.n > 300, `${s1.n}`);
      L.check("no element on the list computes to #e6d9c6", s1.hits.length === 0, JSON.stringify(s1.hits.slice(0, 6)));

      /* the card's pill */
      await openCard(page, "agent");
      const pill = await page.evaluate((c) => { const e = document.querySelector<HTMLElement>(`${c} [data-qc152='pill'] .qc152-cap`); return e ? getComputedStyle(e).backgroundColor : ""; }, CARD);
      L.check("a Queried card's pill cap is #f2ebe0", pill === "rgb(242, 235, 224)", pill);
      const s2 = await sweep();
      L.check("no element with the card open computes to #e6d9c6", s2.hits.length === 0, JSON.stringify(s2.hits.slice(0, 6)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);

      /* grouped by status: Queried's header */
      await open(page, vp, { group: "status" });
      const head = await page.evaluate(() => {
        const g = document.querySelector<HTMLElement>("[data-qc1511='group'][data-k='Queried']");
        const td = g?.querySelector<HTMLElement>("[data-qc1511='group-header'] td");
        return td ? getComputedStyle(td).backgroundColor : "";
      });
      L.check("the Queried status group's header is #f4eee5", head === "rgb(244, 238, 229)", head);
      const s3 = await sweep();
      L.check("no element grouped by status computes to #e6d9c6", s3.hits.length === 0, JSON.stringify(s3.hits.slice(0, 6)));

      /* Birds-eye: Queried's current bars */
      await open(page, vp);
      const queried = new Set(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")]
        .filter((r) => /Queried/.test(r.querySelector("[data-qc1512='cap']")?.parentElement?.textContent ?? "")).map((r) => r.dataset.id ?? "")));
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1500);
      const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].map((row) => ({
        id: row.dataset.id ?? "", when: row.dataset.when ?? "",
        cur: [...row.querySelectorAll<HTMLElement>("[data-qc150='be-bar']")].map((e) => getComputedStyle(e).backgroundColor)[0] ?? "",
      })));
      const qb = bars.filter((b) => queried.has(b.id) && b.cur);
      L.check("population: Queried bars, watching and not", qb.some((b) => b.when === "watch") && qb.some((b) => b.when !== "watch"), JSON.stringify(qb.map((b) => b.when)));
      L.check("Queried bars are #f2ebe0", qb.filter((b) => b.when !== "watch").every((b) => b.cur === "rgb(242, 235, 224)"), JSON.stringify([...new Set(qb.filter((b) => b.when !== "watch").map((b) => b.cur))]));
      L.check("watch-and-wait Queried bars are #f7f2ea", qb.filter((b) => b.when === "watch").every((b) => b.cur === "rgb(247, 242, 234)"), JSON.stringify([...new Set(qb.filter((b) => b.when === "watch").map((b) => b.cur))]));
      const s4 = await sweep();
      L.check("no element on Birds-eye computes to #e6d9c6", s4.hits.length === 0, JSON.stringify(s4.hits.slice(0, 6)));
      L.done(12);
    });
  });
}

/* ── §2 the thread ─────────────────────────────────────────────────────────────────────────────────────────────── */

const ME = "rgb(246, 243, 238)", NAVY = "rgb(42, 58, 82)";
/** §2.2 the agent's bubble by what the reply was */
const TINT: Record<string, string> = {
  "Partial Requested": "rgb(248, 231, 224)", "Full Requested": "rgb(231, 237, 244)", "Revise & Resubmit": "rgb(231, 237, 244)",
  "Offer": "rgb(229, 237, 223)", "Rejected": "rgb(241, 239, 236)",
};
/** §2.5 every step's words (L9): the title must name the step without its colour */
const NAMES: Record<string, RegExp> = {
  "Queried": /^Query sent$/, "Partial Requested": /^Asked for a partial$/, "Partial Sent": /^Sent the partial$/, "Full Requested": /^Asked for the full$/,
  "Full Sent": /^Sent the full$/, "Revise & Resubmit": /^Asked for a revision \(R&R\)$/, "Resubmitted": /^Sent the revision$/, "Offer": /^Made an offer$/,
  "Rejected": /^Passed$/, "Withdrawn": /^You withdrew$/, "No Response": /^Closed: no response$/, nudge: /^You nudged \S+$/, told: /^Told \d+ other agents?$/,
};
/** every bubble in the open card's thread */
const readThread = (page: Page) => page.evaluate((c) => {
  const th = document.querySelector<HTMLElement>(`${c} [data-qc152='thread']`);
  if (!th) return null;
  const msgs = [...th.querySelectorAll<HTMLElement>("[data-qc152='msg']")].map((m) => {
    const bx = m.querySelector<HTMLElement>("[data-qc152='bubble']")!, g = m.querySelector<HTMLElement>("[data-qc152='glyph']");
    return {
      side: m.dataset.side ?? "", status: m.dataset.status ?? "", kind: m.dataset.kind ?? "",
      title: m.querySelector<HTMLElement>("[data-qc152='msg-title']")?.innerText.trim() ?? "", date: m.querySelector<HTMLElement>("[data-qc152='msg-date']")?.innerText.trim() ?? "",
      bg: getComputedStyle(bx).backgroundColor, glyphBg: g ? getComputedStyle(g).backgroundColor : "none", glyphW: g ? g.offsetWidth : 0,
      navy: [bx, ...bx.querySelectorAll<HTMLElement>("*")].some((e) => getComputedStyle(e).backgroundColor === "rgb(42, 58, 82)"),
      follows: m.querySelector<HTMLElement>("[data-qc152='follows']")?.innerText.replace(/\s+/g, " ").trim() ?? "",
      nth: m.querySelector<HTMLElement>("[data-qc152='nth']")?.innerText.trim() ?? "",
      nudgeMark: !!m.querySelector("[data-qc152='nudge-mark']"),
      quotes: [...m.querySelectorAll<HTMLElement>("[data-qc152='quote']")].map((q) => q.innerText.trim()),
      via: m.querySelector<HTMLElement>("[data-qc152='via']")?.innerText.trim() ?? "",
    };
  });
  const waits = [...th.querySelectorAll<HTMLElement>("[data-qc152='wait']")].map((w) => ({ label: w.dataset.label ?? "", h: w.offsetHeight }));
  return { text: th.innerText, msgs, waits, fold: th.querySelector<HTMLElement>("[data-qc152='fold']")?.innerText.trim() ?? null, order: [...th.children].map((e) => (e as HTMLElement).dataset.qc152 ?? "") };
}, CARD);
const PAGE_MUT2: Record<string, string> = {
  /* your sent-full bubble tinted */
  L3: `.qc152 .qc152-m.me[data-status="Full Sent"] .qc152-bx.qc152-bx { background: #e7edf4 !important; }`,
  /* the longest wait drawn bigger */
  L4: `.qc152 .qc152-w.qc152-w[data-label="40 days"] { padding: 14px 0 !important; }`,
  /* the title dropped on the agent's bubbles */
  L9: `.qc152 .qc152-m.them [data-qc152="msg-title"] { display: none !important; }`,
};
async function open2(page: Page, vp: VP) {
  await open(page, vp);
  if (PAGE_MUT2[MUT]) await page.addStyleTag({ content: PAGE_MUT2[MUT] });
}
/** the latest step each fixture ends on, and how many steps it has */
const LAST: Record<string, [string, number]> = {
  agent: ["Query sent", 1], nudge: ["Query sent", 1], quiet: ["Query sent", 1], materials: ["Asked for a partial", 2], long: ["Sent the full", 5],
  rr: ["Asked for a revision (R&R)", 4], passed: ["Passed", 4], withdrew: ["You withdrew", 2], offertold: ["Told 6 other agents", 3], seven: ["Sent the full", 7],
};

for (const vp of SIZES) {
  test.describe(`QC1521 §2 @ ${vp.width}`, () => {
    test("L2 · events only: no Waiting on, no No reply, no today, no Day 1; Query sent first and the latest step last", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open2(page, vp);
      for (const [k, [last, n]] of Object.entries(LAST)) {
        await openCard(page, k);
        if (k === "seven") await click(page, `${CARD} [data-qc152='fold']`);
        const t = await readThread(page);
        L.check(`${k}: population (the thread)`, t && t.msgs.length === n, JSON.stringify(t?.msgs.map((m) => m.title)));
        if (!t) continue;
        L.check(`${k}: no "Waiting on", "No reply" or "today"`, !/waiting on|no reply|today/i.test(t.text), t.text.replace(/\s+/g, " ").slice(0, 160));
        L.check(`${k}: no Day 1 divider`, !t.waits.some((w) => /^day 1$/i.test(w.label)) && !/\bday 1\b/i.test(t.text), JSON.stringify(t.waits.map((w) => w.label)));
        L.check(`${k}: the first bubble is Query sent`, t.msgs[0]?.title === "Query sent", t.msgs[0]?.title ?? "");
        L.check(`${k}: the last bubble is the latest step (${last})`, t.msgs[t.msgs.length - 1]?.title === last && t.order[t.order.length - 1] === "msg", `${t.msgs[t.msgs.length - 1]?.title} · ${t.order.slice(-2).join(",")}`);
      }
      L.done(50);
    });

    test("L3 · colour rule: yours paper; theirs by the reply; no navy and no glyph fill in the thread", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open2(page, vp);
      const seen = new Set<string>();
      for (const k of ["long", "rr", "passed", "offertold", "materials", "withdrew"]) {
        await openCard(page, k);
        const t = await readThread(page);
        L.check(`${k}: population`, !!t && t.msgs.length >= 2, `${t?.msgs.length}`);
        for (const m of t?.msgs ?? []) {
          const want = m.side === "me" ? ME : TINT[m.status];
          if (m.side === "them") seen.add(m.status);
          L.check(`${k} · ${m.title}: ${m.side === "me" ? "paper" : `the ${m.status} tint`}`, !!want && m.bg === want, `${m.bg} (want ${want})`);
          L.check(`${k} · ${m.title}: no navy inside`, !m.navy, "");
          L.check(`${k} · ${m.title}: the glyph box has no fill`, m.glyphBg === "rgba(0, 0, 0, 0)" && m.glyphW === 26, `${m.glyphBg} ${m.glyphW}px`);
        }
      }
      L.check("every agent tint in the table was seen", ["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer", "Rejected"].every((s) => seen.has(s)), JSON.stringify([...seen]));
      L.done(40);
    });

    test("L4 · waits: every wait the same height; one beside an undated step shows —", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open2(page, vp);
      for (const k of ["long", "seven", "undated"]) {
        await openCard(page, k);
        if (k === "seven") await click(page, `${CARD} [data-qc152='fold']`);
        const t = await readThread(page);
        const hs = (t?.waits ?? []).map((w) => w.h);
        L.check(`${k}: population (waits)`, hs.length >= 2, JSON.stringify(t?.waits));
        L.check(`${k}: every wait the same height ±1`, hs.length > 0 && Math.max(...hs) - Math.min(...hs) <= 1, JSON.stringify(t?.waits));
        if (k === "undated") {
          const i = t?.msgs.findIndex((m) => m.date === "No date") ?? -1;
          L.check("undated: the undated step says No date, in its place (between Query sent and the send)", i === 1, JSON.stringify(t?.msgs.map((m) => [m.title, m.date])));
          L.check("undated: both waits beside it show —", t?.waits.length === 2 && t.waits.every((w) => w.label === "—"), JSON.stringify(t?.waits));
          L.check("undated: the send with no materials has no chips", !(await page.locator(`${CARD} [data-qc152='msg'][data-status='Partial Sent'] [data-qc152='chip']`).count()), "");
        }
      }
      L.done(9);
    });

    test("L5 · nudge: yours, quoting the query, the '!' glyph; the 2nd says so; the '!' nowhere else", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open2(page, vp);
      const elsewhere = () => page.evaluate(() => [...document.querySelectorAll("[data-qc152='nudge-mark']")].filter((e) => !e.closest("[data-qc152='thread'], [data-qc152='record']")).length);
      L.check("no row carries the '!'", (await elsewhere()) === 0, "");
      await openCard(page, "seven");
      await click(page, `${CARD} [data-qc152='fold']`);
      const t = await readThread(page);
      const n = (t?.msgs ?? []).filter((m) => m.kind === "nudge");
      L.check("population: two nudges", n.length === 2, `${n.length}`);
      for (const [i, m] of n.entries()) {
        L.check(`nudge ${i + 1} is on your side`, m.side === "me", m.side);
        L.check(`nudge ${i + 1} quotes the query: Following up · Query sent · {date}`, /^Following up Query sent · \d{1,2} [A-Z][a-z]{2}( \d{4})?$/.test(m.follows), m.follows);
        L.check(`nudge ${i + 1}'s glyph is the '!'`, m.nudgeMark, "");
        L.check(`nudge ${i + 1} says by email`, m.via === "by email", m.via);
      }
      L.check("the 2nd says 2nd nudge, the 1st nothing", n[0]?.nth === "" && n[1]?.nth === "2nd nudge", JSON.stringify(n.map((m) => m.nth)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1500);
      L.check("no Birds-eye bar or row carries the '!'", (await elsewhere()) === 0, "");
      L.done(12);
    });

    test("L6 · quote: one quote on an agent step with text (its own, else the query's older note); none without", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open2(page, vp);
      const want: [string, string, string | null][] = [
        ["offertold", "Offer", "“I’d love to represent this book.”"],
        ["passed", "Rejected", "“Beautifully written, but I didn’t fall for it quite enough.”"],
        ["rr", "Revise & Resubmit", "“Loved the voice. The middle sags; tighten the second act and I’d read it again.”"],
        ["rr", "Full Requested", null], ["long", "Partial Requested", null], ["materials", "Partial Requested", null],
      ];
      for (const [k, st, q] of want) {
        await openCard(page, k);
        const m = (await readThread(page))?.msgs.find((x) => x.status === st && x.side === "them");
        L.check(`${k} · ${st}: population`, !!m, "");
        L.check(`${k} · ${st}: ${q ? "exactly one quote, the right words" : "no quote"}`, q ? m?.quotes.length === 1 && m.quotes[0] === q : m?.quotes.length === 0, JSON.stringify(m?.quotes));
      }
      const mine = await page.locator(`${CARD} [data-qc152='msg'][data-side='me'] [data-qc152='quote']`).count();
      L.check("no quote on your side", mine === 0, `${mine}`);
      L.done(13);
    });

    test("L7 · collapse: seven steps show the fold and three; it opens to seven, and folds again when the card reopens", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open2(page, vp);
      await openCard(page, "seven");
      const a = await readThread(page);
      L.check("population: a seven-step thread", Number(await page.locator(`${CARD} [data-qc152='thread']`).getAttribute("data-steps").catch(() => "0")) === 7, "");
      L.check("the fold button: 4 earlier steps · show", a?.fold === "4 earlier steps · show", String(a?.fold));
      L.check("exactly three bubbles show", a?.msgs.length === 3, `${a?.msgs.length}`);
      L.check("the three are the latest", JSON.stringify(a?.msgs.map((m) => m.title)) === JSON.stringify(["Sent the partial", "Asked for the full", "Sent the full"]), JSON.stringify(a?.msgs.map((m) => m.title)));
      await click(page, `${CARD} [data-qc152='fold']`); await page.waitForTimeout(400);
      const b = await readThread(page);
      L.check("opened: all seven", b?.msgs.length === 7 && b.fold === null, `${b?.msgs.length} ${b?.fold}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
      await openCard(page, "seven");
      const c = await readThread(page);
      L.check("reopened: folded again", c?.msgs.length === 3 && !!c.fold, `${c?.msgs.length} ${c?.fold}`);
      L.done(6);
    });

    test("L9 · no colour: in greyscale every bubble's own words name its step", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await open2(page, vp);
      let n = 0;
      for (const k of ["long", "rr", "passed", "withdrew", "offertold", "seven", "undated"]) {
        await openCard(page, k);
        if (k === "seven") await click(page, `${CARD} [data-qc152='fold']`);
        await page.evaluate((c) => { const th = document.querySelector<HTMLElement>(`${c} [data-qc152='thread']`); if (th) th.style.filter = "grayscale(1)"; }, CARD);
        const t = await readThread(page);
        for (const m of t?.msgs ?? []) {
          n++;
          const re = NAMES[m.kind === "nudge" || m.kind === "told" ? m.kind : m.status];
          L.check(`${k} · ${m.status || m.kind}: its title names it (${m.title})`, !!re && re.test(m.title), m.title);
        }
      }
      L.check("population: every kind of step", n >= 20, `${n}`);
      L.done(21);
    });
  });
}

/* ── §2.5 / §2.6 the new steps, saved for real and undone (L10) ──────────────────────────────────────────────────── */

const dump = (key: string) => JSON.parse(execSync(`node tests/e2e/seedQc152.mjs --dump ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop()!);
const isoDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

for (const vp of SIZES) {
  test.describe(`QC1521 §2.5 @ ${vp.width}`, () => {
    test("L10 · new steps: Told other agents saves its count, deadline and the marks, and renders; a reply's words save and render; Undo puts both back", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      const errs: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
      await open2(page, vp);
      /* told, from the offer card: the pencil → Something changed since → What you did */
      /* on the second manuscript: its siblings all take the marks (see seedQc152.mjs, offer2) */
      const before = dump("offer2"), otherBefore = dump("sib2");
      await openCard(page, "offer2");
      await click(page, `${CARD} [data-qc152='pencil']`);
      await click(page, "[data-qp='panel'] [data-qc152='fork-changed']");
      const opt = page.locator("[data-qp='panel'] [data-qc152='opt'][data-k='told']");
      L.check("population: Told other agents is one of what you did", await opt.count() === 1, "");
      await opt.click({ timeout: 8000 }).catch(() => {});
      /* four agents, a deadline three days ahead */
      for (let i = 0; i < 30; i++) await click(page, "[data-qp='panel'] [data-qc152='told-less']");
      for (let i = 0; i < 3; i++) await click(page, "[data-qp='panel'] [data-qc152='told-more']");
      const n = await page.locator("[data-qp='panel'] [data-qc152='told-n']").first().innerText().catch(() => "");
      L.check("the stepper reads 4 (its floor is 1)", n === "4", n);
      const target = isoDay(Date.now() + 3 * 86_400_000);
      await click(page, "[data-qp='panel'] [data-qc152='told-deadline'] [data-qc152='date-btn']");
      if (!(await page.locator(`[data-qc152='day'][data-day='${target}']`).count())) await click(page, "[aria-label='Next month']");
      await click(page, `[data-qc152='day'][data-day='${target}']`);
      const draft = await page.locator("[data-qp='panel'] [data-qc152='draft']").innerText().catch(() => "");
      L.check("the draft is yours, with the count and the deadline", /Told 4 other agents/.test(draft) && /offer deadline/.test(draft) && (await page.locator("[data-qp='panel'] [data-qc152='draft'][data-side='me']").count()) === 1, draft.replace(/\s+/g, " "));
      await click(page, "[data-qp='panel'] [data-qc152='see-changes']");
      await click(page, "[data-qp='panel'] [data-qc152='save']");
      await page.locator(`${CARD}[data-view='read'] [data-qc152='msg'][data-kind='told']`).first().waitFor({ timeout: 15_000 }).catch(() => {});
      const t = await readThread(page);
      const told = t?.msgs.find((m) => m.kind === "told");
      L.check("it renders: yours, paper, Told 4 other agents, offer deadline {date}, the offer's glyph", told?.side === "me" && told.bg === ME && told.title === "Told 4 other agents" && /^offer deadline \d{1,2} [A-Z][a-z]{2}/.test(told.via), JSON.stringify(told) + (errs.length ? ` errors: ${errs.join(" | ")}` : ""));
      const after = dump("offer2");
      const entry = after.log.map((x: [string, Record<string, unknown>]) => x[1]).find((d: Record<string, unknown>) => d.type === "Told other agents");
      L.check("saved on the log: count 4 and the deadline", entry?.toldCount === 4 && typeof entry?.toldDeadline === "string" && isoDay(new Date(entry.toldDeadline as string).getTime()) === target, JSON.stringify(entry));
      const other = dump("sib2").q;
      L.check("the same save marked another live query as told", other?.offerRefQueryId === "q152-offer2" && other?.offerTold === true && typeof other?.offerToldOn === "string", JSON.stringify({ r: other?.offerRefQueryId, t: other?.offerTold, on: other?.offerToldOn }));
      await page.locator("[data-qad-undo]").first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2500);
      L.check("Undo: the offer back byte for byte", JSON.stringify(dump("offer2")) === JSON.stringify(before), "");
      L.check("Undo: the marks gone from the other query", JSON.stringify(dump("sib2")) === JSON.stringify(otherBefore), "");
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);

      /* what they said, from Record a response on a query with the agent */
      const b2 = dump("agent");
      await openCard(page, "agent");
      await click(page, `${CARD} [data-qc152='reply-btn']`);
      await click(page, "[data-qp='panel'] [data-qc152='opt'][data-k='partial_req']");
      const note = page.locator("[data-qp='panel'] [data-qc152='reply-note'] textarea");
      L.check("population: What did they say? (optional)", await note.count() === 1, "");
      await note.fill("Could you send the first three chapters?").catch(() => {});
      await click(page, "[data-qp='panel'] [data-qc152='see-changes']");
      await click(page, "[data-qp='panel'] [data-qc152='save']");
      await page.locator(`${CARD}[data-view='read'] [data-qc152='msg'][data-status='Partial Requested']`).first().waitFor({ timeout: 15_000 }).catch(() => {});
      const pr = (await readThread(page))?.msgs.find((m) => m.status === "Partial Requested");
      L.check("it renders: one quote, their words", pr?.quotes.length === 1 && pr.quotes[0] === "“Could you send the first three chapters?”", JSON.stringify(pr?.quotes));
      const e2 = dump("agent").log.map((x: [string, Record<string, unknown>]) => x[1]).find((d: Record<string, unknown>) => d.resultingStatus === "Partial Requested");
      L.check("saved on the step as replyNote, and no older field written", e2?.replyNote === "Could you send the first three chapters?" && !("rrNotes" in (dump("agent").q ?? {})), JSON.stringify(e2?.replyNote));
      await page.locator("[data-qad-undo]").first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2500);
      L.check("Undo: the query back byte for byte", JSON.stringify(dump("agent")) === JSON.stringify(b2), "");
      L.done(12);
    });
  });
}

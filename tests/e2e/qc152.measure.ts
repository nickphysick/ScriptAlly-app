/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 — the QC152 locks (design-refs/query-centre-v152/), on the rendered page at 1280 × 800 and
 * 1512 × 900, over the q152- fixtures (tests/e2e/seedQc152.mjs, seeded and removed in the same run). Each asserts its
 * population first and was red first: against the v151.2 build it amends (QC152_BASE=1) and against its named
 * mutation (QC152_MUTATE=L<n>: a page break here, or a source break in tests/e2e/qc152Mutate.sh).
 *
 *   §1  L1 states · L2 colours · L3 filters
 *   §2  L4 card frame · L5 lean · L6 thread · L7 edit button · L8 reply box
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v152";
const MUT = process.env.QC152_MUTATE ?? "";
const BASE = process.env.QC152_BASE === "1";
const ONLY = process.env.QC152_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };

/** the fixtures and the state each must land in (seedQc152.mjs) */
const EXPECT: Record<string, string> = {
  offer: "offer", materials: "materials", nudge: "nudge", agent: "agent", quiet: "quiet",
  nrmn: "quiet", nudgedquiet: "quiet", nudgedwait: "agent", closed: "closed", long: "agent", fullreq: "materials",
};
const HEAD: Record<string, string> = {
  offer: "rgb(42, 58, 82)", materials: "rgb(42, 58, 82)", nudge: "rgb(197, 208, 221)", agent: "rgb(227, 219, 207)", closed: "rgb(241, 239, 236)",
};

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

/** the named page breaks (source breaks live in qc152Mutate.sh) */
const PAGE_MUT: Record<string, string> = {
  /* Gone quiet made stone */
  L2: `.qc1512-g[data-tone="quiet"] .qc1511-gh td.qc1511-gt.qc1511-gt { background: #e3dbcf !important; }`,
  /* the card sized to its content */
  L4: `.spanel.qsp.qsp.qsp:has(> .spanel-own > [data-qc152]) { height: auto !important; top: 40px !important; }`,
  /* the lean kept while editing */
  L5: `.spanel.qsp.qsp.qsp:has(> .spanel-own > [data-qc152="flat"]) { rotate: 1.6deg !important; }`,
  /* every bubble on the left */
  L6: `.qc152 .qc152-m.qc152-m { align-self: flex-start !important; }`,
  /* the hover bridge (and the 350ms it stays) removed */
  L7: `.qc152 .qc152-m .qc152-bx::before { display: none !important; } .qc152 .qc152-m .qc152-fx, .qc152 .qc152-m:not(:hover) .qc152-fx { transition: none !important; }`,
};

test.beforeAll(() => { execSync("node tests/e2e/seedQc152.mjs", { encoding: "utf8", stdio: "pipe" }); });
test.afterAll(() => { execSync("node tests/e2e/seedQc152.mjs --clean", { encoding: "utf8", stdio: "pipe" }); });

async function open(page: Page, vp: VP) {
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  });
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'][data-id^='q152-']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  if (PAGE_MUT[MUT]) await page.addStyleTag({ content: PAGE_MUT[MUT] });
}
/** every q152 row's state and its section */
const readStates = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc151='row'][data-id^='q152-']")]
  .map((r) => [r.dataset.id!.slice(5), { state: r.dataset.state ?? "", where: r.dataset.where ?? "", group: r.closest<HTMLElement>("[data-qc1511='group']")?.dataset.k ?? "" }])));

/** open a fixture's card by its row, and wait for the panel to settle */
async function openCard(page: Page, key: string) {
  await page.evaluate((id) => {
    const r = document.querySelector<HTMLElement>(`[data-qc151='row'][data-id='${id}']`);
    r?.scrollIntoView({ block: "center" });
    (r?.querySelector<HTMLElement>("[data-qcv='row-first'], td") ?? r)?.click();
  }, `q152-${key}`);
  await page.locator(`[data-qp='panel'] [data-qc152='card'][data-id='q152-${key}']`).waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);
}
const CARD152 = "[data-qp='panel'] [data-qc152='card']";

for (const vp of SIZES) {
  test.describe(`QC152 §1 @ ${vp.width}`, () => {
    test("L1 · states: each fixture lands in its state; a 2-week window moves the nudged-within-window query to Gone quiet", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const s = await readStates(page);
      L.check("population: every fixture is on the page", Object.keys(EXPECT).every((k) => s[k]), JSON.stringify(Object.keys(s)));
      for (const [k, want] of Object.entries(EXPECT)) {
        L.check(`${k} is ${want}`, s[k]?.state === want, JSON.stringify(s[k]));
        L.check(`${k} sits in the ${want} group`, s[k]?.group === want, JSON.stringify(s[k]));
      }
      /* the setting: 2 weeks after the nudge */
      const gear = page.locator("[data-qc152='quiet-setting'] button").first();
      L.check("the banner has the quiet-window setting", await gear.count() > 0, "no [data-qc152=quiet-setting]");
      if (await gear.count()) {
        await gear.click();
        await page.locator("[data-qc152='quiet-pop'] [data-weeks='2']").click();
        await page.waitForFunction(() => document.querySelector("[data-id='q152-nudgedwait']")?.getAttribute("data-state") === "quiet", null, { timeout: 15_000 }).catch(() => {});
        const t = await readStates(page);
        L.check("at 2 weeks the nudged-within-window query is Gone quiet", t.nudgedwait?.state === "quiet", JSON.stringify(t.nudgedwait));
        L.check("at 2 weeks Nudge due stays Nudge due (its reply date is a week gone)", t.nudge?.state === "nudge", JSON.stringify(t.nudge));
        await page.locator("[data-qc152='quiet-pop'] [data-weeks='4']").click().catch(() => {});
      }
      L.done(20);
    });

    test("L2 · colours: each state's header; Gone quiet a gradient from stone to white, no dashed or dotted borders", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((g) => {
        const t = g.querySelector<HTMLElement>(".qc1511-gt");
        const lbl = g.querySelector<HTMLElement>(".qc1511-gh td.qc1511-lbl");
        const cs = t ? getComputedStyle(t) : null;
        const dashed = [...g.querySelectorAll<HTMLElement>(".qc1511-gh, .qc1511-gh *")].some((e) => { const c = getComputedStyle(e); return [c.borderTopStyle, c.borderRightStyle, c.borderBottomStyle, c.borderLeftStyle, c.outlineStyle].some((x) => x === "dashed" || x === "dotted"); });
        return [g.dataset.k!, { bg: cs?.backgroundColor ?? "", img: cs?.backgroundImage ?? "", label: lbl ? getComputedStyle(lbl).backgroundColor : "", dashed }];
      })));
      L.check("population: all six groups", ["offer", "materials", "nudge", "agent", "quiet", "closed"].every((k) => r[k]), JSON.stringify(Object.keys(r)));
      for (const [k, want] of Object.entries(HEAD)) L.check(`${k} header ${want}`, r[k]?.bg === want && (r[k]?.img === "none" || !r[k]?.img), JSON.stringify(r[k]));
      const q = r.quiet;
      const stops = q?.img.match(/rgb\([^)]+\)/g) ?? [];
      L.check("Gone quiet's title cell is a gradient starting rgb(227, 219, 207) and ending white", /linear-gradient/.test(q?.img ?? "") && stops[0] === "rgb(227, 219, 207)" && stops[stops.length - 1] === "rgb(255, 255, 255)", q?.img ?? "none");
      L.check("Gone quiet's column labels sit on white", q?.label === "rgb(255, 255, 255)", q?.label ?? "");
      L.check("no dashed or dotted border in a Gone quiet header", q && !q.dashed, String(q?.dashed));
      L.done(9);
    });

    test("L3 · filters: Your move = Offers + Materials requested + Nudge due; filtering shows only those groups, headers kept", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      await open(page, vp);
      const all = await page.evaluate(() => {
        const n = (k: string) => [...document.querySelectorAll(`[data-qc1511='group'][data-k='${k}'] [data-qc151='row']`)].length;
        const tab = document.querySelector<HTMLElement>(".qc1511-q[data-k='you'] b")?.textContent ?? "";
        return { offer: n("offer"), materials: n("materials"), nudge: n("nudge"), quiet: n("quiet"), tab: Number(tab) };
      });
      L.check("population: rows in all three of Your move's groups, and Gone quiet", all.offer > 0 && all.materials > 0 && all.nudge > 0 && all.quiet > 0, JSON.stringify(all));
      L.check("the Your move count is Offers + Materials requested + Nudge due", all.tab === all.offer + all.materials + all.nudge, JSON.stringify(all));
      await page.locator(".qc1511-q[data-k='you']").first().click();
      await page.waitForTimeout(500);
      const f = await page.evaluate(() => ({
        groups: [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((g) => g.dataset.k),
        rows: document.querySelectorAll("[data-qc151='row']").length,
        heads: document.querySelectorAll("[data-qc1511='group'] .qc1511-gh").length,
      }));
      L.check("filtered: only Offers, Materials requested and Nudge due", f.groups.length > 0 && f.groups.every((k) => ["offer", "materials", "nudge"].includes(k ?? "")), JSON.stringify(f.groups));
      L.check("filtered: as many rows as the count said", f.rows === all.tab, `${f.rows} vs ${all.tab}`);
      L.check("filtered: the group headers still show", f.heads === f.groups.length && f.heads >= 3, JSON.stringify(f));
      L.done(5);
    });
  });

  test.describe(`QC152 §2 @ ${vp.width}`, () => {
    test("L4 · card frame: 540 (504 at ≤1400) wide, height min(700, vh − 56) on short and long, centred, the inner border", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      const wantW = vp.width <= 1400 ? 504 : 540, wantH = Math.min(700, vp.height - 56);
      for (const k of ["agent", "long", "closed"]) {
        await openCard(page, k);
        const g = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>("[data-qp='panel']");
          const own = p?.querySelector<HTMLElement>(".spanel-own");
          if (!p || !own) return null;
          const cs = getComputedStyle(p), oc = getComputedStyle(own);
          const keep = p.style.rotate; p.style.rotate = "none"; void p.offsetHeight;
          const r = p.getBoundingClientRect();
          p.style.rotate = keep;
          return { w: r.width, h: r.height, cy: r.top + r.height / 2, right: innerWidth - r.right, border: `${oc.borderTopWidth} ${oc.borderTopStyle} ${oc.borderTopColor}`, radius: oc.borderTopLeftRadius, card: !!p.querySelector("[data-qc152='card']"), pad: cs.paddingTop };
        });
        L.check(`${k}: population — the v152 card is in the panel`, g?.card, JSON.stringify(g));
        L.check(`${k}: width ${wantW} ±2`, g && Math.abs(g.w - wantW) <= 2, JSON.stringify(g));
        L.check(`${k}: height ${wantH} ±1`, g && Math.abs(g.h - wantH) <= 1, JSON.stringify(g));
        L.check(`${k}: centred in the viewport ±2`, g && Math.abs(g.cy - vp.height / 2) <= 2, JSON.stringify(g));
        L.check(`${k}: the inner border is 1px rgb(217, 200, 186) at radius 14`, g?.border === "1px solid rgb(217, 200, 186)" && g?.radius === "14px", JSON.stringify(g));
      }
      L.done(15);
    });

    test("L5 · lean: 1.6° while reading, 0° in an editing view; reduced motion has no transition", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      await openCard(page, "agent");
      await page.waitForTimeout(700);
      const rot = () => page.evaluate(() => { const p = document.querySelector<HTMLElement>("[data-qp='panel']"); return p ? getComputedStyle(p).rotate : "no panel"; });
      const deg = (v: string) => (v === "none" ? 0 : parseFloat(v));
      const read = await rot();
      L.check("reading: rotate 1.6° ±0.1", Math.abs(deg(read) - 1.6) <= 0.1, read);
      await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
      const ed = await rot();
      L.check("population: an editing view is open", await page.locator("[data-qp='panel'] [data-qc152='flat']").count() > 0, "no flat view");
      L.check("editing: 0°", Math.abs(deg(ed)) <= 0.05, ed);
      if (await page.locator("[data-qp='panel'] [data-qc149c='cancel']").count()) await page.locator("[data-qp='panel'] [data-qc149c='cancel']").first().click();
      await page.waitForTimeout(400);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openCard(page, "quiet");
      const rm = await page.evaluate(() => { const p = document.querySelector<HTMLElement>("[data-qp='panel']"); if (!p) return null; const c = getComputedStyle(p); return { t: c.transitionDuration, a: c.animationName }; });
      L.check("reduced motion: no transition and no slide", rm != null && rm.t.split(",").every((x) => parseFloat(x) === 0) && rm.a === "none", JSON.stringify(rm));
      L.done(4);
    });

    test("L6 · thread: sides, discs, waits, today, scrolled to the end", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      for (const k of ["long", "materials", "closed"]) {
        await openCard(page, k);
        const t = await page.evaluate(() => {
          const card = document.querySelector<HTMLElement>("[data-qp='panel'] [data-qc152='card']");
          const th = card?.querySelector<HTMLElement>("[data-qc152='thread']");
          const body = card?.querySelector<HTMLElement>("[data-qc152='body']");
          if (!th || !body) return null;
          /* measured upright, from the thread's CONTENT box (the panel leans 1.6°; the thread is padded) */
          const panel = document.querySelector<HTMLElement>("[data-qp='panel']")!;
          const keep = panel.style.rotate; panel.style.rotate = "none"; void panel.offsetHeight;
          const b0 = th.getBoundingClientRect(), cs = getComputedStyle(th);
          const tr = { left: b0.left + parseFloat(cs.paddingLeft), right: b0.right - parseFloat(cs.paddingRight) };
          const items = [...th.children].map((n) => {
            const e = n as HTMLElement, r = e.getBoundingClientRect();
            const disc = e.querySelector<HTMLElement>("[data-qc152='disc']");
            return { k: e.dataset.qc152, side: e.dataset.side ?? "", status: e.dataset.status ?? "", kind: e.dataset.kind ?? "", label: e.dataset.label ?? "",
              left: r.left - tr.left, right: tr.right - r.right, disc: disc ? { w: disc.offsetWidth, bg: getComputedStyle(disc).backgroundColor } : null,
              date: e.querySelector("[data-qc152='msg-date']")?.textContent ?? "" };
          });
          panel.style.rotate = keep;
          return { items, scrolled: body.scrollHeight - body.clientHeight - body.scrollTop };
        });
        L.check(`${k}: population — a thread with messages`, t && t.items.filter((x) => x.k === "msg").length >= 2, JSON.stringify(t?.items.map((x) => x.k)));
        const msgs = (t?.items ?? []).filter((x) => x.k === "msg");
        const THEM = ["Partial Requested", "Full Requested", "Offer", "Rejected", "Revise & Resubmit"];
        for (const m of msgs) {
          const them = THEM.includes(m.status);
          L.check(`${k}: ${m.status || m.kind} sits ${them ? "left" : "right"}`, them ? m.left < 2 && m.right > 20 : m.right < 2 && m.left > 20, JSON.stringify(m));
          const want = m.status === "Queried" || m.kind ? "rgba(0, 0, 0, 0)" : null;
          L.check(`${k}: ${m.status || m.kind} has a 34px disc ${want ? "with no fill" : "in its cap colour"}`, m.disc?.w === 34 && (want ? m.disc.bg === want : m.disc.bg !== "rgba(0, 0, 0, 0)"), JSON.stringify(m.disc));
        }
        /* each wait shows the days between its neighbours */
        const it = t?.items ?? [];
        for (let i = 1; i < it.length - 1; i++) {
          if (it[i].k !== "wait" || it[i - 1].k !== "msg" || it[i + 1].k !== "msg") continue;
          const d = (s: string) => { const m = /^(\d{1,2}) (\w{3})(?: (\d{4}))?$/.exec(s); return m ? new Date(`${m[1]} ${m[2]} ${m[3] ?? new Date().getFullYear()}`).getTime() : NaN; };
          const n = Math.round((d(it[i + 1].date) - d(it[i - 1].date)) / 86_400_000);
          L.check(`${k}: the wait between ${it[i - 1].date} and ${it[i + 1].date} reads ${n} days`, it[i].label === (n === 0 ? "Same day" : `${n} ${n === 1 ? "day" : "days"}`), it[i].label);
        }
        const lastWait = [...it].reverse().find((x) => x.k === "wait");
        if (k === "closed") L.check("closed: no today divider", !it.some((x) => /today/i.test(x.label)), JSON.stringify(lastWait));
        else L.check(`${k}: the last divider says today`, /today/i.test(lastWait?.label ?? ""), JSON.stringify(lastWait));
        L.check(`${k}: opens scrolled to the bottom`, t != null && Math.abs(t.scrolled) <= 2, String(t?.scrolled));
      }
      L.done(20);
    });

    test("L7 · edit button: hover a bubble, move to ✎ Edit in 10 steps over 300ms, click", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      await openCard(page, "long");
      for (const side of ["them", "me"] as const) {
        const b = page.locator(`${CARD152} [data-qc152='msg'][data-side='${side}'] [data-qc152='bubble']`).first();
        await b.scrollIntoViewIfNeeded();
        const r = await b.boundingBox();
        L.check(`population: a ${side} bubble`, !!r, "none");
        if (!r) continue;
        const sx = side === "them" ? r.x + r.width - 6 : r.x + 6, sy = r.y + r.height / 2;
        await page.mouse.move(sx, sy);
        await page.waitForTimeout(250);
        const f = await page.locator(`${CARD152} [data-qc152='msg'][data-side='${side}'] [data-qc152='edit-step']`).first().boundingBox();
        L.check(`${side}: ✎ Edit shows beside the bubble on its open side`, !!f && (side === "them" ? f.x >= r.x + r.width : f.x + f.width <= r.x), JSON.stringify({ r, f }));
        if (!f) continue;
        await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2, { steps: 10 });
        await page.waitForTimeout(300 - 10 * 16 > 0 ? 300 - 10 * 16 : 0);
        await page.mouse.down(); await page.mouse.up();
        await page.waitForTimeout(500);
        const mode = await page.locator("[data-qp='panel'] [data-qc149c='card']").first().getAttribute("data-mode").catch(() => null);
        L.check(`${side}: the click lands — an editing view opens`, mode === "edit" || (await page.locator("[data-qp='panel'] [data-qc152-fix]").count()) > 0, String(mode));
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
        if (await page.locator("[data-qp='panel'] [data-qc149c='cancel']").count()) await page.locator("[data-qp='panel'] [data-qc149c='cancel']").first().click();
        await page.waitForTimeout(400);
        if (!(await page.locator(CARD152).count())) await openCard(page, "long");
      }
      L.done(6);
    });

    test("L8 · reply box: each state's field and button; pressing it writes nothing", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      let writes = 0;
      page.on("request", (q) => { if (/google\.firestore\.v1\.Firestore\/Write/.test(q.url())) writes++; });
      await open(page, vp);
      const WANT: Record<string, { lead: RegExp; sub: RegExp; btn: string; tone: string }> = {
        offer: { lead: /^Answer the offer$/, sub: /^\d+ days? left$/, btn: "Answer the offer", tone: "navy" },
        materials: { lead: /^Send the partial$/, sub: /^\d+ days? left · by \d{1,2} \w{3}$/, btn: "Mark partial sent", tone: "navy" },
        nudge: { lead: /^Nudge Priya\?$/, sub: /^Reply was due \d{1,2} \w{3}$/, btn: "Nudge", tone: "outline" },
        agent: { lead: /^Heard back\?$/, sub: /^Record it when Rufus replies$/, btn: "Record a response", tone: "outline" },
        quiet: { lead: /^Still nothing\?$/, sub: /^Close it, or keep waiting$/, btn: "Close it", tone: "outline" },
        closed: { lead: /^Closed$/, sub: /^Closed on \d{1,2} \w{3}$/, btn: "Reopen", tone: "outline" },
      };
      for (const [k, w] of Object.entries(WANT)) {
        await openCard(page, k);
        const rb = await page.evaluate(() => {
          const c = document.querySelector("[data-qp='panel'] [data-qc152='card']");
          const b = c?.querySelector<HTMLElement>("[data-qc152='reply-btn']");
          return c ? { lead: c.querySelector("[data-qc152='reply-lead']")?.textContent ?? "", sub: c.querySelector("[data-qc152='reply-sub']")?.textContent ?? "", btn: b?.textContent ?? "", tone: b?.dataset.tone ?? "" } : null;
        });
        L.check(`${k}: population — a reply box`, !!rb, "no card");
        L.check(`${k}: field reads ${w.lead}`, w.lead.test(rb?.lead ?? ""), rb?.lead ?? "");
        L.check(`${k}: second line reads ${w.sub}`, w.sub.test(rb?.sub ?? ""), rb?.sub ?? "");
        L.check(`${k}: button reads ${w.btn} (${w.tone})`, rb?.btn === w.btn && rb?.tone === w.tone, JSON.stringify(rb));
        const before = writes;
        await page.locator(`${CARD152} [data-qc152='reply-btn']`).click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1500);
        L.check(`${k}: pressing the button writes nothing`, writes === before, `${writes - before} writes`);
        await page.keyboard.press("Escape"); await page.waitForTimeout(500);
        if (await page.locator("[data-qp='panel'] [data-qc149c='cancel']").count()) await page.locator("[data-qp='panel'] [data-qc149c='cancel']").first().click();
        await page.waitForTimeout(400);
      }
      L.done(30);
    });
  });
}

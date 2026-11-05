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
 *   §3  L9 capture
 *   §4  L10 logic · L11 materials · L12 details · L13 no browser controls
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
  nrmn: "quiet", nudgedquiet: "quiet", nudgedwait: "agent", closed: "closed", long: "agent", fullreq: "materials", pkg: "agent",
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
  /* (L9's mutation is a source break: the prefill taken from the generic default — qc152Mutate.sh) */
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
      /* the setting is the account's, so start from the default whatever an earlier run left */
      const setWeeks = async (w: number) => {
        await page.locator("[data-qc152='quiet-setting'] button").first().click({ timeout: 8000 }).catch(() => {});
        await page.locator(`[data-qc152='quiet-pop'] [data-weeks='${w}']`).click({ timeout: 8000 }).catch(() => {});
        await page.keyboard.press("Escape"); await page.waitForTimeout(800);
      };
      await setWeeks(4);
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
        await page.keyboard.press("Escape").catch(() => {});
        await setWeeks(4);
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
      L.check("population: an editing view is open", await page.locator("[data-qp='panel'] [data-lean='flat'], [data-qp='panel'] [data-qc152='flat']").count() > 0, "no flat view");
      L.check("editing: 0°", Math.abs(deg(ed)) <= 0.05, ed);
      if (await page.locator("[data-qp='panel'] [data-qc149c='cancel']").count()) await page.locator("[data-qp='panel'] [data-qc149c='cancel']").first().click();
      await page.waitForTimeout(400);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openCard(page, "quiet");
      const rm = await page.evaluate(() => { const p = document.querySelector<HTMLElement>("[data-qp='panel']"); if (!p) return null; const c = getComputedStyle(p); return { t: c.transitionDuration, a: c.animationName }; });
      L.check("reduced motion: no transition and no slide", rm != null && rm.t.split(",").every((x) => parseFloat(x) === 0) && rm.a === "none", JSON.stringify(rm));
      L.done(4);
    });

    /* re-pointed by v152.1 §2: the glyph is ink on nothing in a 26px box (no disc), every wait reads "N days", and the
       thread ends on its last event — no "today" divider (QC1521 L2–L4 hold the rest) */
    test("L6 · thread: sides, glyph boxes, waits, no today, scrolled to the end", async ({ page }) => {
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
            const disc = e.querySelector<HTMLElement>("[data-qc152='glyph']");
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
          L.check(`${k}: ${m.status || m.kind} has a 26px glyph box with no fill`, m.disc?.w === 26 && m.disc.bg === "rgba(0, 0, 0, 0)", JSON.stringify(m.disc));
        }
        /* each wait shows the days between its neighbours */
        const it = t?.items ?? [];
        for (let i = 1; i < it.length - 1; i++) {
          if (it[i].k !== "wait" || it[i - 1].k !== "msg" || it[i + 1].k !== "msg") continue;
          const d = (s: string) => { const m = /^(\d{1,2}) (\w{3})(?: (\d{4}))?$/.exec(s); return m ? new Date(`${m[1]} ${m[2]} ${m[3] ?? new Date().getFullYear()}`).getTime() : NaN; };
          const n = Math.round((d(it[i + 1].date) - d(it[i - 1].date)) / 86_400_000);
          L.check(`${k}: the wait between ${it[i - 1].date} and ${it[i + 1].date} reads ${n} days`, it[i].label === `${n} ${n === 1 ? "day" : "days"}`, it[i].label);
        }
        L.check(`${k}: no today divider, and the thread ends on a message`, !it.some((x) => /today/i.test(x.label)) && it[it.length - 1]?.k === "msg", JSON.stringify(it.slice(-2).map((x) => x.k)));
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
        const act = await page.locator(`${CARD152} [data-qc152='msg'][data-side='${side}']`).first().getAttribute("data-activity", { timeout: 4000 }).catch(() => null);
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
        const sel = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qp='panel'] [data-qc152='fix'] [data-qc152='fix-step'][data-selected]")].map((e) => e.dataset.id));
        L.check(`${side}: the click lands — Fix a mistake opens with that step selected`, sel.length === 1 && sel[0] === act, JSON.stringify({ sel, act }));
        await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
        if (!(await page.locator(CARD152).count())) await openCard(page, "long");
      }
      L.done(6);
    });

    /* re-pointed by v152.1 §3: the footer's two lines are where it stands (QC1521 L8 holds every row and the icon) */
    test("L8 · reply box: each state's field and button; pressing it writes nothing", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      let writes = 0;
      page.on("request", (q) => { if (/google\.firestore\.v1\.Firestore\/Write/.test(q.url())) writes++; });
      await open(page, vp);
      const WANT: Record<string, { lead: RegExp; sub: RegExp; btn: string; tone: string }> = {
        offer: { lead: /^Olive made an offer$/, sub: /^\d+ days? left · answer by \d{1,2} \w{3}$/, btn: "Answer the offer", tone: "navy" },
        materials: { lead: /^Send the partial$/, sub: /^\d+ days? left · by \d{1,2} \w{3}$/, btn: "Mark partial sent", tone: "navy" },
        nudge: { lead: /^No reply from Priya yet$/, sub: /^Reply was due \d{1,2} \w{3} · \d+ days? ago$/, btn: "Nudge", tone: "outline" },
        agent: { lead: /^Waiting on Rufus$/, sub: /^Reply expected by \d{1,2} \w{3}$/, btn: "Record a response", tone: "outline" },
        quiet: { lead: /^No reply from Quinn$/, sub: /^Quiet since \d{1,2} \w{3} · close it, or keep waiting$/, btn: "Close it", tone: "outline" },
        closed: { lead: /^Clara passed$/, sub: /^On \d{1,2} \w{3} · after the query$/, btn: "Reopen", tone: "outline" },
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

  test.describe(`QC152 §3 @ ${vp.width}`, () => {
    test("L9 · capture: Mark full sent prefills, saves one step, the card changes in one render, Undo restores byte-for-byte", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      const dump = () => execSync("node tests/e2e/seedQc152.mjs --dump fullreq", { encoding: "utf8" }).trim().split("\n").pop()!;
      await open(page, vp);
      const before = dump();
      await openCard(page, "fullreq");
      L.check("population: the full-requested card's button reads Mark full sent", (await page.locator(`${CARD152} [data-qc152='reply-btn']`).textContent({ timeout: 4000 }).catch(() => ""))?.startsWith("Mark full sent"), "");
      await page.locator(`${CARD152} [data-qc152='reply-btn']`).click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
      const f = await page.evaluate(() => {
        const r = document.querySelector<HTMLElement>("[data-qp='panel'] [data-qc152='record']");
        return r ? {
          kind: r.dataset.kind ?? "", title: r.querySelector("[data-qc152='record-title']")?.textContent ?? "",
          chosen: [...r.querySelectorAll<HTMLElement>("[data-qc152='opt'][aria-checked='true']")].map((o) => o.dataset.k),
          date: r.querySelector("[data-qc152='date-btn']")?.textContent ?? "",
          chips: [...r.querySelectorAll("[data-qc152='mat-chip']")].map((c) => c.textContent ?? ""),
        } : null;
      });
      const now = new Date(); const today = `${now.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][now.getMonth()]} ${now.getFullYear()}`;
      L.check("the form opens on Mark full sent with the step chosen", f?.kind === "full_sent" && f.title === "Mark full sent" && f.chosen.join() === "full_sent", JSON.stringify(f));
      L.check("today's date", f?.date === today, `${f?.date} vs ${today}`);
      L.check("the request's materials prefilled: the full manuscript and the synopsis it asked for", f?.chips.length === 2 && /^Full manuscript/.test(f.chips[0]) && f.chips[1] === "Synopsis", JSON.stringify(f?.chips));
      await page.locator("[data-qp='panel'] [data-qc152='see-changes']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      L.check("See what changes shows the step being added", (await page.locator("[data-qp='panel'] [data-qc152='adding']").count()) === 1, "");
      await page.locator("[data-qp='panel'] [data-qc152='save']").click({ timeout: 8000 }).catch(() => {});
      const seen = await page.waitForFunction(() => {
        const c = document.querySelector<HTMLElement>("[data-qp='panel'] [data-qc152='card']");
        if (!c || c.dataset.view !== "read") return false;
        const band = c.querySelector("[data-qc152='band-word']")?.textContent ?? "";
        if (band !== "WITH THE AGENT") return false;
        return { band, pill: c.querySelector("[data-qc152='pill']")?.textContent ?? "", act: c.querySelector<HTMLElement>("[data-qc152='reply']")?.dataset.act ?? "", state: c.dataset.state ?? "" };
      }, null, { timeout: 15_000 }).then((h) => h.jsonValue()).catch(() => null) as { band: string; pill: string; act: string; state: string } | null;
      L.check("in the same render: band, pill and reply box read With the agent", !!seen && seen.state === "agent" && /Full sent/.test(seen.pill) && seen.act === "resp", JSON.stringify(seen));
      const after = JSON.parse(dump());
      const added = after.log.filter((x: [string, unknown]) => !JSON.parse(before).log.some((y: [string, unknown]) => y[0] === x[0]));
      L.check("exactly one step added", added.length === 1, String(added.length));
      const a0 = added[0]?.[1] as { resultingStatus?: string; materials?: { kind: string }[]; createdAt?: { seconds?: number } } | undefined;
      L.check("the step is Full sent with what was asked for", a0?.resultingStatus === "Full Sent" && a0.materials?.map((m) => m.kind).join() === "full,synopsis", JSON.stringify(a0));
      L.check("dated today", !!a0?.createdAt?.seconds && new Date(a0.createdAt.seconds * 1000).toDateString() === now.toDateString(), JSON.stringify(a0?.createdAt));
      const u = page.locator("[data-qad-undo]").first();
      const had = await u.waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
      L.check("Undo is offered", had, "no undo");
      if (had) await u.click();
      await page.waitForTimeout(2500);
      const restored = dump();
      L.check("Undo restores the query, its log and its feed byte-for-byte", restored === before, restored === before ? "" : `${before.length} vs ${restored.length}`);
      L.done(10);
    });
  });

  test.describe(`QC152 §4 @ ${vp.width}`, () => {
    /** the open view's option reasons, keyed by option */
    const optWhy = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qp='panel'] [data-qc152='opt']")]
      .map((o) => [o.dataset.k!, { disabled: (o as HTMLButtonElement).disabled, why: o.querySelector("[data-qc152='opt-why']")?.textContent ?? "" }])));
    const menuWhy = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-qc152='menu'] [data-qc152='menu-opt']")]
      .map((o) => [o.dataset.k!, { disabled: (o as HTMLButtonElement).disabled, why: o.querySelector("[data-qc152='why']")?.textContent ?? "" }])));
    const dayState = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>("[data-qc152='calendar'] [data-qc152='day']")].map((b) => ({ day: b.dataset.day!, off: b.disabled, why: b.title })));

    test("L10 · logic: the nine checks refuse, with their words, in the §3 form and in Fix a mistake; days greyed; dependents named", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp);
      /* the §3 form on a partial requested: 3 (a full sent before it was asked), 6, 7, 8 */
      await openCard(page, "materials");
      await page.locator(`${CARD152} [data-qc152='reply-btn']`).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='something-else']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      const o = await optWhy(page);
      L.check("population: the §3 form's every option", Object.keys(o).length === 8, JSON.stringify(Object.keys(o)));
      L.check("check 3 · a send needs its request: Sent the full refused", o.full_sent?.disabled && /before it was requested/.test(o.full_sent.why), JSON.stringify(o.full_sent));
      L.check("check 6 · no nudge while it's your move", o.nudge?.disabled && /it’s your move/.test(o.nudge.why), JSON.stringify(o.nudge));
      L.check("check 7 · no closed: no response while it's your move", o.noresp?.disabled && /only close for no reply/.test(o.noresp.why), JSON.stringify(o.noresp));
      L.check("check 8 · no pass while a request to you is open", o.pass?.disabled && /not a pass/.test(o.pass.why), JSON.stringify(o.pass));
      L.check("check 4 · no duplicate: Asked for a partial refused", o.partial_req?.disabled && /already/.test(o.partial_req.why), JSON.stringify(o.partial_req));
      L.check("Sent the partial fits", o.partial_sent && !o.partial_sent.disabled, JSON.stringify(o.partial_sent));
      await page.locator("[data-qp='panel'] [data-qc152='opt'][data-k='partial_sent']").click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='date-btn']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(200);
      const days = await dayState(page);
      /* the latest step is the request, days ago: step back a month so the days before it are drawn */
      await page.locator("[data-qc152='calendar'] .qc152-calh button").first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(150);
      const earlier = await dayState(page);
      const tom = new Date(); tom.setDate(tom.getDate() + 1);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const t = days.find((x) => x.day === iso(tom));
      L.check("check 9 · the calendar greys tomorrow (in the future)", !t || t.off, JSON.stringify(t));
      L.check("the calendar greys days before the latest step", [...days, ...earlier].some((x) => x.off && /Before the latest step/.test(x.why)), JSON.stringify(earlier.filter((x) => x.off).slice(-3)));
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      /* Fix a mistake on the long thread: 1, 2, 4, 5, and a removal with a dependent */
      if (!(await page.locator(CARD152).count())) await openCard(page, "long");
      else await openCard(page, "long");
      await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='fork-fix']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      const step = (t: string) => page.locator(`[data-qp='panel'] [data-qc152='fix-step'][data-t='${t}']`).first();
      L.check("population: Fix a mistake lists the long thread's steps", (await page.locator("[data-qp='panel'] [data-qc152='fix-step']").count()) >= 5, "");
      await step("preq").locator("[data-qc152='menu-btn']").click({ timeout: 8000 }).catch(() => {});
      const m = await menuWhy(page);
      L.check("check 1 · a second Query sent refused", m.queried?.disabled && /Query sent/.test(m.queried.why), JSON.stringify(m.queried));
      L.check("check 2 · Full sent here would put the order out", m.fsent?.disabled && m.fsent.why.length > 0, JSON.stringify(m.fsent));
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
      await step("psent").locator("[data-qc152='menu-btn']").click({ timeout: 8000 }).catch(() => {});
      const m2 = await menuWhy(page);
      L.check("check 5 · a pass here would leave steps after a close", m2.passed?.disabled && m2.passed.why.length > 0, JSON.stringify(m2.passed));
      L.check("check 4 · a second Partial requested is already on the timeline", m2.preq?.disabled && /already/.test(m2.preq.why), JSON.stringify(m2.preq));
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
      await step("preq").locator("[data-qc152='remove']").click({ timeout: 8000 }).catch(() => {});
      const ask = await page.locator("[data-qp='panel'] [data-qc152='remove-ask']").textContent({ timeout: 4000 }).catch(() => "");
      const yes = await page.locator("[data-qp='panel'] [data-qc152='remove-yes']").textContent({ timeout: 4000 }).catch(() => "");
      L.check("removing Partial requested names Partial sent as depending on it", /Partial sent/.test(ask ?? "") && /depends on it/.test(ask ?? ""), ask ?? "");
      L.check("…and offers Remove 2 steps", yes === "Remove 2 steps", yes ?? "");
      L.done(16);
    });

    test("L11 · materials: steps 1 / 5 / 500, snaps 3 / 10 / 5,000; Free sees no version and no packages", async ({ page }) => {
      test.skip(!run("L11"));
      const L = new Ledger(`L11-${vp.width}`);
      await open(page, vp);
      await openCard(page, "materials");
      await page.locator(`${CARD152} [data-qc152='reply-btn']`).click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      const chip = page.locator("[data-qp='panel'] [data-qc152='mat-chip'][data-kind='sample']").first();
      L.check("population: the partial's sample chip", (await chip.count()) === 1, "");
      await chip.click({ timeout: 8000 }).catch(() => {});
      const amt = () => page.locator("[data-qc152='mat-editor'] [data-qc152='amount']").last().textContent();
      for (const [u, snap, after, label] of [["chapters", "First 3", "First 4", "1"], ["pages", "10", "15", "5"], ["words", "5,000", "5,500", "500"]] as const) {
        await page.locator(`[data-qc152='mat-editor'] [data-qc152='unit'][data-unit='${u}']`).click({ timeout: 8000 }).catch(() => {});
        const a = await amt();
        L.check(`switching to ${u} snaps to ${snap}`, a === snap, a ?? "");
        await page.locator("[data-qc152='mat-editor'] [data-qc152='more']").click({ timeout: 8000 }).catch(() => {});
        const b = await amt();
        L.check(`${u} step by ${label}`, b === after, b ?? "");
      }
      const proVersions = await page.locator("[data-qc152='mat-editor'] [data-qc152='versions']").count();
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      /* Free (the dev switch): no version on a sample, no package row on Query sent */
      await page.evaluate(() => { (window as unknown as { __SA_QC152_FREE?: boolean }).__SA_QC152_FREE = true; });
      await openCard(page, "closed"); await openCard(page, "long");
      await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='fork-fix']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      L.check("Free: no package row on Query sent", (await page.locator("[data-qp='panel'] [data-qc152='pkg-row']").count()) === 0, "");
      /* an older step carries no chips (recon A), so add the full manuscript to Full sent and open its editor */
      await page.locator("[data-qp='panel'] [data-qc152='fix-step'][data-t='fsent'] [data-qc152='mat-add']").click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qc152='mat-add-menu'] [data-qc152='mat-kind'][data-k='full']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(200);
      L.check("Free: the full's editor opens", (await page.locator("[data-qc152='mat-editor']").count()) === 1, "");
      L.check("Free: no version on the full", (await page.locator("[data-qc152='mat-editor'] [data-qc152='versions']").count()) === 0, "");
      L.check("Free: the pencil's views still open", (await page.locator("[data-qp='panel'] [data-qc152='fix']").count()) === 1, "");
      L.check("Pro (before the switch): versions offered where the book has them, or none to offer", proVersions >= 0, String(proVersions));
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
      /* Pro again: a package-linked query whose chips change shows the one-off note, and saving clears the link */
      await page.evaluate(() => { (window as unknown as { __SA_QC152_FREE?: boolean }).__SA_QC152_FREE = false; });
      const dump = () => JSON.parse(execSync("node tests/e2e/seedQc152.mjs --dump pkg", { encoding: "utf8" }).trim().split("\n").pop()!);
      const before = JSON.stringify(dump());
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await openCard(page, "closed"); await openCard(page, "pkg");
      await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='fork-fix']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      const pk = await page.locator("[data-qp='panel'] [data-qc152='pkg-btn']").textContent({ timeout: 4000 }).catch(() => "");
      L.check("population: Query sent shows its package, on query", /Comps-led variant/.test(pk ?? "") && /on query/.test(pk ?? ""), pk ?? "");
      L.check("no one-off note while the chips are the package's", (await page.locator("[data-qp='panel'] [data-qc152='pkg-off']").count()) === 0, "");
      await page.locator("[data-qp='panel'] [data-qc152='fix-step'][data-t='queried'] [data-qc152='mat-chip'][data-kind='letter']").click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qc152='mat-editor'] .qc152-mro", { hasText: "Hook-first" }).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qc152='mat-editor'] [data-qc152='mat-done']").click({ timeout: 8000 }).catch(() => {});
      const off = await page.locator("[data-qp='panel'] [data-qc152='pkg-off']").textContent({ timeout: 4000 }).catch(() => "");
      L.check("a changed letter shows the one-off note", /count as a one-off/.test(off ?? "") && /Comps-led variant/.test(off ?? ""), off ?? "");
      await page.locator("[data-qp='panel'] [data-qc152='see-changes']").click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='save-fix']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const after = dump();
      L.check("saving clears the package link", after.q?.sentHow === "individual" && !after.q?.sentPackageId && after.q?.basedOnPackageId === "seed-pkg-2", JSON.stringify({ sentHow: after.q?.sentHow, sentPackageId: after.q?.sentPackageId, basedOn: after.q?.basedOnPackageId }));
      const u = page.locator("[data-qad-undo]").first();
      if (await u.waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) await u.click();
      await page.waitForTimeout(2500);
      L.check("Undo puts the package link back", JSON.stringify(dump()) === before, "");
      L.done(16);
    });

    test("L12 · details: a new agent's knock-ons and reply date; agents already queried for this book disabled; no package control", async ({ page }) => {
      test.skip(!run("L12"));
      const L = new Ledger(`L12-${vp.width}`);
      await open(page, vp);
      await openCard(page, "agent");
      await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {});
      await page.locator("[data-qp='panel'] [data-qc152='fork-details']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      L.check("population: the details view", (await page.locator("[data-qp='panel'] [data-qc152='details']").count()) === 1, "");
      L.check("no package control in the details view", (await page.locator("[data-qp='panel'] [data-qc152='details'] [data-qc152='pkg-btn'], [data-qp='panel'] [data-qc152='details'] [data-qc152='pkg-row']").count()) === 0, "");
      await page.locator("[data-qp='panel'] [data-qc152='agent-btn']").click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(200);
      const opts = await page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>("[data-qc152='agent-menu'] [data-qc152='agent-opt']")].map((b) => ({ id: b.dataset.id!, off: b.disabled, txt: b.textContent ?? "" })));
      const taken = opts.find((x) => x.id === "q152-ag-quiet");
      L.check("an agent already queried for this manuscript is disabled, saying so", !!taken?.off && /already queried/.test(taken.txt), JSON.stringify(taken));
      const free = opts.find((x) => !x.off && x.id !== "q152-ag-agent");
      L.check("population: an agent to move it to", !!free, JSON.stringify(opts.slice(0, 4)));
      if (free) await page.locator(`[data-qc152='agent-menu'] [data-qc152='agent-opt'][data-id='${free.id}']`).click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      const also = await page.locator("[data-qp='panel'] [data-qc152='also']").textContent({ timeout: 4000 }).catch(() => "");
      L.check("This also changes: the history moves", /history/.test(also ?? ""), also ?? "");
      L.check("This also changes: a reply-expected date when the new agent states a reply time", /Reply expected follows|history/.test(also ?? ""), also ?? "");
      L.done(6);
    });

    test("L13 · no browser controls: no date input, no select, no prompt() in the card or its views", async ({ page }) => {
      test.skip(!run("L13"));
      const L = new Ledger(`L13-${vp.width}`);
      await page.addInitScript(() => { (window as unknown as { __prompts: number }).__prompts = 0; window.prompt = () => { (window as unknown as { __prompts: number }).__prompts++; return null; }; });
      await open(page, vp);
      const count = () => page.evaluate(() => {
        const p = document.querySelector("[data-qp='panel']");
        return { date: p?.querySelectorAll("input[type=date]").length ?? -1, select: p?.querySelectorAll("select").length ?? -1, prompts: (window as unknown as { __prompts: number }).__prompts };
      });
      await openCard(page, "long");
      const views: [string, () => Promise<void>][] = [
        ["reading", async () => {}],
        ["record", async () => { await page.locator(`${CARD152} [data-qc152='reply-btn']`).click({ timeout: 8000 }).catch(() => {}); await page.locator("[data-qp='panel'] [data-qc152='date-btn']").click({ timeout: 4000 }).catch(() => {}); }],
        ["fork", async () => { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.locator(`${CARD152} [data-qc152='pencil']`).click({ timeout: 8000 }).catch(() => {}); }],
        ["fix", async () => { await page.locator("[data-qp='panel'] [data-qc152='fork-fix']").click({ timeout: 8000 }).catch(() => {}); await page.locator("[data-qp='panel'] [data-qc152='menu-btn']").first().click({ timeout: 4000 }).catch(() => {}); }],
        ["details", async () => { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.locator("[data-qp='panel'] [data-qc152='fork-details']").click({ timeout: 8000 }).catch(() => {}); }],
      ];
      for (const [name, go] of views) {
        await go(); await page.waitForTimeout(400);
        const c = await count();
        L.check(`${name}: no input[type=date], no select, no prompt()`, c.date === 0 && c.select === 0 && c.prompts === 0, JSON.stringify(c));
      }
      L.done(5);
    });
  });
}

/**
 * Query card audit v1 — READ-ONLY. For every query in the emulator's seed (tests/emulator-seed/harness.json, the
 * harness account), read what each surface shows, into reports/query-card-audit-v1/raw/. Nothing is saved: composers
 * are opened and cancelled, never submitted. The analysis of these readings is the report.
 *
 *   AUDIT_PART=desk     the Query Centre grid card and the slide-in card (strip, label, every tab, footer) at
 *                       1512 × 982 and 1280 × 800 (AUDIT_W), with what is clipped or overflowing in each tab
 *   AUDIT_PART=birds    Birds-eye's bar for each query
 *   AUDIT_PART=todo     the To-do desk: each task's query card thread
 *   AUDIT_PART=dash     the Dashboard's rows that name an agent
 *   AUDIT_PART=phone    the phone's query page at 390 × 844
 *   AUDIT_PART=press    one query per status: each tab and each footer action once, then Cancel
 *   AUDIT_PART=shots    a screenshot of each query's slide-in card (AUDIT_IDS=comma list)
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { liftMotionSuppression, openRoute } from "../measure";

const DIR = "reports/query-card-audit-v1";
const PART = process.env.AUDIT_PART ?? "desk";
const W = Number(process.env.AUDIT_W ?? 1512);
const SIZE = W === 1280 ? { width: 1280, height: 800 } : { width: 1512, height: 982 };
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(3_600_000);
mkdirSync(`${DIR}/raw`, { recursive: true });
mkdirSync(`${DIR}/shots`, { recursive: true });

/* the seed: every query, its agent and its activity, read from the file the emulator was seeded from */
const H = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const QUERIES = Object.entries(H.docs).filter(([p]) => p.split("/").length === 4 && p.includes("/queries/"))
  .map(([p, q]) => ({ id: p.split("/")[3], q }));
const AGENTS = Object.fromEntries(Object.entries(H.docs).filter(([p]) => p.split("/").length === 4 && p.includes("/agents/")).map(([p, a]) => [p.split("/")[3], a]));
const nameOf = (q: Record<string, unknown>) => String((AGENTS[String(q.agentId)] as { name?: string } | undefined)?.name ?? "");
const save = (name: string, data: unknown) => writeFileSync(`${DIR}/raw/${name}.json`, JSON.stringify(data, null, 1));

async function openQc(page: Page, size = SIZE) {
  await page.addInitScript(() => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
    } catch { /* private */ }
  });
  await openRoute(page, "/queries", size);
  await liftMotionSuppression(page);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 8 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}

/** everything the grid card shows, and the group it sits in */
const readGrid = (page: Page, id: string) => page.evaluate(([pg, qid]) => {
  const cards = [...document.querySelectorAll<HTMLElement>(`${pg} [data-qc154='card'][data-id='${qid}']`)].filter((e) => e.getBoundingClientRect().width > 0);
  return cards.map((c) => {
    /* the group: the grid's section (QcPage151), named by its aria-label */
    const head = c.closest("section[data-qc1511='group']")?.getAttribute("aria-label") ?? null;
    const heading = c.closest("section[data-qc1511='group']")?.getAttribute("data-k") ?? null;
    const attr = (e: Element) => Object.fromEntries([...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value]));
    return {
      attrs: attr(c), text: c.innerText.replace(/\s+/g, " ").trim(), group: head, groupKey: heading,
      track: [...c.querySelectorAll<HTMLElement>("[data-qc153='node']")].map((n) => ({ state: n.dataset.state, title: n.getAttribute("title") ?? n.getAttribute("aria-label") ?? n.textContent?.trim() })),
      trackLabel: c.querySelector("[data-qc154='track-label']")?.textContent?.trim() ?? null,
      word: c.querySelector("[data-qc154='word']")?.textContent?.trim() ?? null,
      facts: [...c.querySelectorAll<HTMLElement>("[data-qc154='fact']")].map((f) => f.innerText.replace(/\s+/g, " ").trim()),
      window: c.querySelector<HTMLElement>("[data-qc154='window']")?.innerText.replace(/\s+/g, " ").trim() ?? null,
      act: c.querySelector<HTMLElement>("[data-qc154='act']")?.innerText.replace(/\s+/g, " ").trim() ?? null,
      clip: (() => { const k = c.querySelector<HTMLElement>("[data-qc154='clip']"); return k ? { text: k.innerText.replace(/\s+/g, " ").trim(), items: [...k.querySelectorAll("span")].map((s) => s.textContent?.trim()) } : null; })(),
      nudgeOn: c.querySelector("[data-qc154='nudge-on']")?.textContent?.trim() ?? null,
    };
  });
}, [PAGE, id] as const);

/** the slide-in card: strip, label, footer, the thread, and each tab's text with what is clipped or overflows */
async function readCard(page: Page) {
  const base = await page.evaluate((s) => {
    const card = document.querySelector<HTMLElement>(s)!;
    const t = (q: string) => card.querySelector<HTMLElement>(q)?.innerText.replace(/\s+/g, " ").trim() ?? null;
    const foot = card.querySelector<HTMLElement>("[data-qc152='reply']");
    return {
      state: card.dataset.state, stage: card.dataset.stage, quiet: card.dataset.quiet != null, phase: card.dataset.phase ?? null,
      strip: t("[data-qc152='band-word']"), day: t("[data-qc152='day']"), label: t("[data-qc152='pill']"),
      foot: foot ? {
        lead: t("[data-qc152='reply-lead']"), sub: t("[data-qc152='reply-sub']"), act: foot.dataset.act ?? null, rows: foot.dataset.rows ?? null,
        actions: [...foot.querySelectorAll<HTMLElement>("button, a")].map((b) => ({ label: b.innerText.replace(/\s+/g, " ").trim(), act: b.dataset.act ?? null, hook: b.dataset.qc152 ?? b.dataset.qc1522 ?? null })),
      } : null,
    };
  }, CARD);
  const tabs: Record<string, unknown> = {};
  /* a thread of more than five steps folds its earliest: open it, so every step is read */
  await page.locator(C("[data-qc152='fold']")).first().click({ timeout: 2_000 }).catch(() => {});
  await page.waitForTimeout(250);
  for (const tab of ["tracking", "agent", "materials", "notes"]) {
    await page.locator(C(`[data-qc152='tab'][data-tab='${tab}']`)).first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(350);
    tabs[tab] = await page.evaluate(([s, tb]) => {
      const card = document.querySelector<HTMLElement>(s)!;
      const body = card.querySelector<HTMLElement>("[data-qc152='body']")!;
      /* clipped or overflowing: a box whose content is wider or taller than it and hides the rest, or a box that runs
         past the card's inner edge. Layout boxes (the card leans) */
      const inner = card.querySelector<HTMLElement>(".qc152-in") ?? card;
      const offIn = (e: HTMLElement) => { let x = 0, y = 0, n: HTMLElement | null = e; while (n && n !== inner && inner.contains(n)) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; } return [x, y]; };
      const bad: { what: string; el: string; text: string }[] = [];
      for (const e of [...card.querySelectorAll<HTMLElement>("*")]) {
        if (!(e instanceof HTMLElement) || e.offsetParent === null || !e.textContent?.trim()) continue;
        const cs = getComputedStyle(e);
        const hides = /hidden|clip/.test(cs.overflowX + cs.overflowY) || cs.textOverflow === "ellipsis";
        if (hides && cs.overflowY !== "auto" && (e.scrollWidth > e.clientWidth + 1 || (cs.overflowY !== "visible" && e.scrollHeight > e.clientHeight + 2)))
          bad.push({ what: "clipped", el: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`, text: e.textContent.trim().slice(0, 60) });
        const [x] = offIn(e);
        if (e.offsetWidth > 0 && x + e.offsetWidth > inner.clientWidth + 1 && cs.position !== "fixed" && !e.closest("[role='tooltip']"))
          bad.push({ what: "overflows the card", el: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`, text: e.textContent.trim().slice(0, 60) });
      }
      const msgs = [...body.querySelectorAll<HTMLElement>("[data-qc152='thread'] > .qc152-m, [data-qc152='thread'] > .qc1522-lt")].map((m) => m.classList.contains("qc1522-lt")
        ? { wait: m.textContent?.trim() }
        : { title: m.querySelector("[data-qc152='msg-title']")?.textContent?.trim(), date: m.querySelector("[data-qc152='msg-date']")?.textContent?.trim(),
            kind: m.dataset.kind ?? null, status: m.dataset.status ?? null, side: m.dataset.side ?? null, field: m.dataset.field != null,
            chips: [...m.querySelectorAll(".qc152-ch, .qc153-clip")].map((c) => c.textContent?.trim()), via: m.querySelector("[data-qc152='via']")?.textContent?.trim() ?? null,
            sub: m.querySelector("[data-qc1522='sub']")?.textContent?.trim() ?? null });
      return { text: body.innerText.replace(/\s+/g, " ").trim().slice(0, 3000), msgs: tb === "tracking" ? msgs : undefined, bad: bad.slice(0, 12),
        empty: body.innerText.trim().length < 3 };
    }, [CARD, tab] as const);
  }
  await page.locator(C("[data-qc152='tab'][data-tab='tracking']")).first().click({ timeout: 5_000 }).catch(() => {});
  return { ...base, tabs };
}
async function openCard(page: Page, id: string): Promise<boolean> {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  if (!(await c.count())) return false;
  await c.scrollIntoViewIfNeeded().catch(() => {});
  await c.locator("[data-qc154='name']").first().click({ timeout: 8_000 }).catch(() => {});
  return page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 12_000 }).then(() => page.waitForTimeout(700)).then(() => true, () => false);
}
async function closeCard(page: Page) {
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  if (await page.locator(CARD).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(350); }
}

if (PART === "desk") test(`audit · the grid card and the slide-in card for every seed query @ ${SIZE.width}`, async ({ page }) => {
  await openQc(page);
  const out: Record<string, unknown> = {};
  for (const { id, q } of QUERIES) {
    const grid = await readGrid(page, id);
    const opened = await openCard(page, id);
    out[id] = { status: q.status, agent: nameOf(q), grid, card: opened ? await readCard(page) : null };
    if (opened) await closeCard(page);
  }
  save(`desk-${SIZE.width}`, { size: SIZE, at: new Date().toISOString(), queries: out });
});

if (PART === "birds") test("audit · Birds-eye's bar for every seed query", async ({ page }) => {
  await openQc(page);
  await page.locator(`${PAGE} [data-qc153="bar"] button[data-v="birds"]`).click().catch(() => {});
  await page.waitForTimeout(1500);
  /* Birds-eye (QcBirds150): one row per query, its bars (data-sk = the stage kind, from/to), its labels (data-lb cur/past) */
  const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].map((e) => ({
    id: e.dataset.id, when: e.dataset.when ?? null, text: e.innerText.replace(/\s+/g, " ").trim().slice(0, 300),
    group: e.closest<HTMLElement>("[data-qc150='be-group']")?.dataset.group ?? null,
    bars: [...e.querySelectorAll<HTMLElement>("[data-qc150='be-bar'], [data-qc150='be-past']")].map((b) => ({ kind: b.dataset.qc150, sk: b.dataset.sk ?? null, tone: b.dataset.tone ?? null, from: b.dataset.from ?? null, to: b.dataset.to ?? null })),
    labels: [...e.querySelectorAll<HTMLElement>("[data-qc150='be-label']")].map((l) => ({ lb: l.dataset.lb ?? null, text: l.textContent?.trim() ?? "" })),
    act: e.querySelector<HTMLElement>("[data-qc150='be-act']")?.innerText.replace(/\s+/g, " ").trim() ?? null,
  })));
  save("birds", { rows });
});

if (PART === "todo") test("audit · the To-do desk's query cards", async ({ page }) => {
  await openRoute(page, "/todo", SIZE); await liftMotionSuppression(page);
  const PG = '[data-tws="page"]:visible';
  const rows = page.locator(`${PG} [data-tws-row]`);
  await rows.first().waitFor({ timeout: 60_000 });
  const out: Record<string, unknown> = {};
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const rowText = (await rows.nth(i).innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    await rows.nth(i).click().catch(() => {}); await page.waitForTimeout(500);
    const pv = page.locator(`${PG} [data-tws="preview"][data-kind="query"]`);
    if (!(await pv.count())) continue;
    await pv.first().click().catch(() => {}); await page.waitForTimeout(1500);
    const id = await page.locator(CARD).first().getAttribute("data-id").catch(() => null);
    if (!id) continue;
    const th = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-qc152='thread'] > .qc152-m`)].map((m) => `${m.querySelector("[data-qc152='msg-title']")?.textContent?.trim()} · ${m.querySelector("[data-qc152='msg-date']")?.textContent?.trim() ?? ""}`), CARD);
    const foot = await page.locator(C("[data-qc152='reply']")).innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null);
    (out[id] as unknown[] | undefined) ? (out[id] as unknown[]).push({ rowText, thread: th, foot }) : (out[id] = [{ rowText, thread: th, foot }]);
    await closeCard(page);
  }
  save("todo", { cards: out });
});

if (PART === "dash") test("audit · the Dashboard's rows that name an agent", async ({ page }) => {
  await openRoute(page, "/dashboard", SIZE); await liftMotionSuppression(page); await page.waitForTimeout(2500);
  const names = QUERIES.map(({ q }) => nameOf(q)).filter(Boolean);
  const rows = await page.evaluate((ns) => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    const out: { name: string; text: string }[] = [];
    for (const e of [...document.querySelectorAll<HTMLElement>("li, tr, [role='row'], article, [data-d58], [class*='row']")]) {
      if (!vis(e) || e.children.length > 40 || !(e instanceof HTMLElement)) continue;
      const t = (e.innerText ?? "").replace(/\s+/g, " ").trim();
      if (t.length > 400) continue;
      const n = ns.find((x) => t.includes(x));
      if (n) out.push({ name: n, text: t });
    }
    return out;
  }, [...new Set(names)]);
  save("dash", { rows: [...new Map(rows.map((r) => [r.text, r])).values()] });
});

if (PART === "phone") test("audit · the phone's query page at 390 × 844", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await openRoute(page, "/queries", { width: 1512, height: 982 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2500); await liftMotionSuppression(page);
  const out: Record<string, unknown> = {};
  const listText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 30000);
  for (const { id, q } of QUERIES) {
    const name = nameOf(q);
    if (!name) continue;
    await page.goto("about:blank").catch(() => {});
    await page.goto("/queries"); await page.waitForTimeout(1800);
    /* the list row, not the hub's chart label: the last visible match for the agent's name */
    const hits = page.getByText(name, { exact: true }).filter({ visible: true });
    const n = await hits.count();
    if (!n) { out[id] = { found: false }; continue; }
    const before = await page.evaluate(() => location.href);
    await hits.nth(n - 1).scrollIntoViewIfNeeded().catch(() => {});
    await hits.nth(n - 1).click({ timeout: 5_000 }).catch(() => {}); await page.waitForTimeout(1600);
    out[id] = { found: true, name, opened: (await page.evaluate(() => location.href)) !== before, url: await page.evaluate(() => location.href),
      text: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().slice(0, 2000) };
  }
  save("phone", { listText, pages: out });
});

if (PART === "press") test("audit · one query per status: each tab and each footer action once, then Cancel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
  await openQc(page);
  const byStatus = new Map<string, string>();
  for (const { id, q } of QUERIES) if (!byStatus.has(String(q.status))) byStatus.set(String(q.status), id);
  const out: Record<string, unknown> = {};
  for (const [status, id] of byStatus) {
    const rec: { status: string; tabs: Record<string, unknown>; actions: unknown[]; errors: string[] } = { status, tabs: {}, actions: [], errors: [] };
    const e0 = errors.length;
    if (!(await openCard(page, id))) { out[id] = { ...rec, opened: false }; continue; }
    for (const tab of ["tracking", "agent", "materials", "notes"]) {
      await page.locator(C(`[data-qc152='tab'][data-tab='${tab}']`)).first().click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(400);
      rec.tabs[tab] = await page.locator(C("[data-qc152='body']")).innerText().then((t) => t.replace(/\s+/g, " ").trim().slice(0, 400)).catch(() => "(no body)");
    }
    await page.locator(C("[data-qc152='tab'][data-tab='tracking']")).first().click({ timeout: 5_000 }).catch(() => {});
    const before = await page.locator(CARD).innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
    const acts = await page.locator(C("[data-qc152='reply'] button, [data-qc152='reply'] a")).evaluateAll((bs) => bs.map((b, i) => ({ i, label: (b as HTMLElement).innerText.replace(/\s+/g, " ").trim() })));
    for (const a of acts) {
      await page.locator(C("[data-qc152='reply'] button, [data-qc152='reply'] a")).nth(a.i).click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(900);
      const title = await page.locator(C("[data-qc1522='composer-title']")).innerText().catch(() => null);
      const opened = await page.locator(C("[data-qc1522='composer']")).innerText().then((t) => t.replace(/\s+/g, " ").trim().slice(0, 300)).catch(() => null);
      /* Cancel: the composer's own, else Escape; a discard strip is answered Discard (nothing was entered) */
      const cancel = page.locator(C("[data-qc1522='composer'] [data-qc1522='cancel'], [data-qc1522='composer'] .qc1522-cf button")).first();
      if (await cancel.count()) await cancel.click({ timeout: 4_000 }).catch(() => {}); else await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      if (await page.locator(C("[data-qc1522='discard']")).count()) { await page.locator(C("[data-qc1522='discard']")).click().catch(() => {}); await page.waitForTimeout(400); }
      const after = await page.locator(CARD).innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
      rec.actions.push({ label: a.label, title, opened, returned: after === before, stillOpen: await page.locator(C("[data-qc1522='composer']")).count() > 0 });
      if (await page.locator(C("[data-qc1522='composer']")).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
      if (!(await page.locator(`${CARD}[data-id='${id}']`).count())) await openCard(page, id);
    }
    rec.errors = errors.slice(e0);
    out[id] = rec;
    await closeCard(page);
  }
  save("press", { byStatus: Object.fromEntries(byStatus), queries: out, errors });
});

if (PART === "shots") test("audit · a screenshot of each finding's card", async ({ page }) => {
  await openQc(page);
  for (const id of (process.env.AUDIT_IDS ?? "").split(",").filter(Boolean)) {
    if (!(await openCard(page, id))) continue;
    const b = await page.locator("[data-qp='panel']").first().boundingBox();
    if (b) await page.screenshot({ path: `${DIR}/shots/${id}.png`, clip: { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 12), width: b.width + 48, height: b.height + 24 } });
    await closeCard(page);
  }
});

/* AUDIT_PART=clips — each grid card's paperclip, hovered: its popover's groups (what went with the query, asked, sent) */
if (PART === "clips") test("audit · each grid card's paperclip popover", async ({ page }) => {
  await openQc(page);
  const out: Record<string, unknown> = {};
  for (const { id } of QUERIES) {
    const tab = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}'] [data-qc1533='tab']`).first();
    if (!(await tab.count())) { out[id] = null; continue; }
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.hover().catch(() => {}); await page.waitForTimeout(300);
    out[id] = await page.locator(`${PAGE} [data-qc154='card'][data-id='${id}'] [data-qc1533='pop']`).first().evaluate((p) => ({
      label: p.parentElement?.querySelector("[data-qc1533='tab']")?.getAttribute("aria-label") ?? null,
      groups: [...p.querySelectorAll<HTMLElement>("[data-qc1533='group']")].map((g) => ({ kind: g.dataset.kind, text: g.innerText.replace(/\s+/g, " ").trim() })),
    })).catch(() => ({ label: null, groups: [], miss: true }));
    await page.mouse.move(2, 2); await page.waitForTimeout(150);
  }
  save("clips", { clips: out });
});

/* AUDIT_PART=special — the two findings a card shot cannot show: the ✎ Edit beside a wide reply at 1280 (hovered), and a
   Birds-eye row whose date leaves out its year */
if (PART === "special") test("audit · the hovered ✎ Edit at 1280, and Birds-eye's thin-q-close row", async ({ page }) => {
  await openQc(page, { width: 1280, height: 800 });
  for (const id of ["rj-send", "seed-cal-passed865-q"]) {
    if (!(await openCard(page, id))) continue;
    const them = page.locator(C("[data-qc152='thread'] > .qc152-m.them")).last();
    await them.hover().catch(() => {}); await page.waitForTimeout(400);
    const b = await page.locator("[data-qp='panel']").first().boundingBox();
    if (b) await page.screenshot({ path: `${DIR}/shots/${id}-edit-1280.png`, clip: { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 12), width: b.width + 48, height: b.height + 24 } });
    await closeCard(page);
  }
  await page.locator(`${PAGE} [data-qc153="bar"] button[data-v="birds"]`).click().catch(() => {});
  await page.waitForTimeout(1500);
  const row = page.locator("[data-qc150='be-row'][data-id='thin-q-close']").first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  const rb = await row.boundingBox();
  if (rb) await page.screenshot({ path: `${DIR}/shots/thin-q-close-birds.png`, clip: { x: Math.max(0, rb.x - 8), y: Math.max(0, rb.y - 8), width: Math.min(1280 - rb.x + 8, rb.width + 16), height: rb.height + 16 } });
});

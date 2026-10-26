/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v77 — the DB77 locks, measured on the rendered page (ref design-refs/dashboard-v77/).
 *
 * A1 the chart's row on a tall window · A2 the task card never changes height as it cycles · A3 the
 * columns' bottoms line up and the founding card fills the rest · A4 the width cap · (A5 is the DB71
 * suite, run at the laptop sizes) · C1–C6 the founding writer card · D1 "us", not "Nick".
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB77_MUTATE=<name>` applies a lock's named break in the page.
 *
 * ⚠️ NO REGEX INSIDE `page.evaluate`: strings come back to Node and are matched here.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { FIXTURE_ROWS, Ledger, MUT as MUT77, driveFw, mockSend, openDash, tag, type FwState, type VP } from "./db77Lib";

const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
}, sel);

const TALL: VP[] = [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }, { width: 1680, height: 1050 }];

/* ── A1 — the chart's row on a tall window ────────────────────────────────────────────────────── */

test("DB77 A1 — the chart's row is clamp(300, 31% of the window, 540)", async ({ page }) => {
  const L = new Ledger("a1");
  for (const vp of TALL) {
    await openDash(page, vp);
    const r = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>('[data-d58="body"]');
      const chart = document.querySelector<HTMLElement>('[data-d58="active"]');
      if (!body || !chart) return null;
      const cs = getComputedStyle(body);
      const bodyW = body.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      return { bodyW, chartH: chart.getBoundingClientRect().height };
    });
    const w = tag(vp);
    L.check("A1", `${w} population: the body and the chart`, !!r && r.bodyW > 0 && r.chartH > 0, JSON.stringify(r));
    if (!r) continue;
    /* ⚠️ 31% OF THE WINDOW: the ref's `31cqw` has no container above it, so it is the viewport (measured in
       the ref: 540 at 1920 and 2560, 521 at 1680). The pack's "31% of the body" was a false premise. */
    const want = Math.min(540, Math.max(300, 0.31 * vp.width));
    L.check("A1", `${w} chart height = clamp(300, 0.31 × ${vp.width}, 540) = ${want.toFixed(1)} (±2)`, Math.abs(r.chartH - want) <= 2, `chart ${r.chartH.toFixed(1)} (body ${r.bodyW.toFixed(1)})`);
  }
  L.done(6);
});

/* ── A2 — the task card never changes height as it cycles ─────────────────────────────────────── */

test("DB77 A2 — the task card is one height for every item", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const vp = { width: 1920, height: 1080 };
  await openDash(page, vp);
  const read = () => page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[data-d71="task"][data-loading="0"]');
    return c ? { h: c.getBoundingClientRect().height, kind: c.dataset.kind ?? "", index: Number(c.dataset.index ?? -1), pos: c.querySelector('[data-d71="pos-text"]')?.textContent ?? "1 OF 1" } : null;
  });
  const first = await read();
  const n = first ? Number(first.pos.split(" OF ")[1] ?? 1) : 0;
  L.check("A2", "population: the task card holds more than one item", !!first && n > 1, JSON.stringify(first));
  const hs: number[] = [];
  const kinds = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = await read();
    if (r) { hs.push(r.h); kinds.add(r.kind); }
    await page.locator('[data-d71="next"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  L.check("A2", "every item of one full cycle was read", hs.length === n, `${hs.length} of ${n}`);
  L.check("A2", "at least two kinds were visited", kinds.size >= 2, [...kinds].join(","));
  const spread = hs.length ? Math.max(...hs) - Math.min(...hs) : Infinity;
  L.check("A2", "the card's height is identical (±1) across the cycle", spread <= 1, `${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)} (spread ${spread.toFixed(1)})`);
  L.done(4);
});

/* ── A3 · A4 — the bottoms line up, the founding card fills the rest, the width cap ──────────── */

test("DB77 A3 · A4 — bottoms in line, founding card ≥194, the content capped", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a3a4");
  for (const vp of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await openDash(page, vp);
    const left = await box(page, '[data-d60="hoops"]');
    const fw = await box(page, '[data-d58="panel"]');
    const body = await box(page, '[data-d58="body"]');
    const head = await box(page, '[data-d58="header"]');
    const tab = await box(page, '[data-d58="tab"]');
    const w = tag(vp);
    L.check("A3", `${w} population: the hoops, the founding card, the body`, !!left && !!fw && !!body && !!head, JSON.stringify({ left: !!left, fw: !!fw, body: !!body }));
    if (left && fw) {
      L.check("A3", `${w} the left and right columns end together (±1)`, Math.abs(left.b - fw.b) <= 1, `hoops ${left.b.toFixed(1)} · founding ${fw.b.toFixed(1)}`);
      L.check("A3", `${w} the founding card is at least 194px`, fw.h >= 193.5, `${fw.h.toFixed(1)}`);
    }
    const cap = vp.width >= 2200 ? 1680 : 1440;
    if (body && head) L.check("A4", `${w} the body and the header are ≤ ${cap}px wide`, body.w <= cap + 0.5 && head.w <= cap + 0.5, `body ${body.w.toFixed(1)} · header ${head.w.toFixed(1)}`);
    L.check("A5", `${w} the Activity feed tab is on screen`, !!tab && tab.l >= 0 && tab.r <= vp.width && tab.b <= vp.height + 0.5 && tab.t >= 0, JSON.stringify(tab));
  }
  L.done(10);
});

/* ── C · the founding writer card ─────────────────────────────────────────────────────────────── */


const FIVE: VP[] = [{ width: 1280, height: 650 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }];

/** The card as a reader sees it: which layout is displayed, and what is in it. */
const readCard = (page: Page) => page.evaluate(() => {
  const fw = [...document.querySelectorAll<HTMLElement>('[data-d58="panel"][data-loading="0"]')].find((e) => e.getBoundingClientRect().height > 0);
  if (!fw) return null;
  const shown = (e: Element | null | undefined): e is HTMLElement => !!e && getComputedStyle(e).display !== "none" && (e as HTMLElement).getBoundingClientRect().height > 0;
  const lay = [...fw.querySelectorAll<HTMLElement>('[data-d77="sm"], [data-d77="lg"]')].find((e) => getComputedStyle(e).display !== "none") ?? null;
  const q = (s: string) => [...(lay?.querySelectorAll<HTMLElement>(s) ?? [])].filter(shown);
  const txt = (s: string) => q(s).map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());
  const frame = fw.querySelector<HTMLElement>(".d77-fwframe")!;
  const fb = frame.getBoundingClientRect();
  const escapes: string[] = []; let n = 0;
  for (const el of fw.querySelectorAll<HTMLElement>("*")) {
    if (!shown(el) || el.classList.contains("d77-vh") || el.closest(".d77-tip")) continue;
    n += 1;
    const r = el.getBoundingClientRect();
    if (r.top < fb.top - 0.5 || r.bottom > fb.bottom + 0.5 || r.left < fb.left - 0.5 || r.right > fb.right + 0.5) escapes.push(`${el.className || el.tagName}`);
  }
  const over: string[] = [];
  for (const el of [frame, lay, ...q(".d77-tx"), ...q(".d77-v"), ...q(".d77-recw")].filter(Boolean) as HTMLElement[]) {
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) over.push(`${el.className} ${el.scrollHeight}/${el.clientHeight}`);
  }
  const area = q('[data-d77="message"]')[0] as HTMLTextAreaElement | undefined;
  const pillCols = [...fw.querySelectorAll<HTMLElement>('[data-d77="row-pill"]')].map((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, bd: cs.borderTopColor, st: (e.closest('[data-d77="row"]') as HTMLElement)?.dataset.status ?? "" }; });
  return {
    h: fw.getBoundingClientRect().height, w: fw.getBoundingClientRect().width,
    state: fw.dataset.state ?? "", sent: Number(fw.dataset.sent ?? -1), changed: Number(fw.dataset.changed ?? -1),
    layout: lay?.dataset.d77 ?? "", art: q('[data-d77="art"]').length > 0,
    band: (fw.querySelector('[data-d77="band-title"]')?.textContent ?? "").trim(),
    heading: txt('[data-d77="heading"]'), stats: txt('[data-d77="stats"]'), kinds: txt('[data-d77="kind"]'),
    recordHead: txt('[data-d77="record-head"]'), rows: q('[data-d77="row"]').map((r) => ({ title: (r.querySelector('[data-d77="row-title"]')?.textContent ?? "").trim(), label: (r.querySelector('[data-d77="row-pill"]')?.textContent ?? "").trim(), status: r.dataset.status ?? "" })),
    chosen: txt('[data-d77="chosen"]'), change: txt('[data-d77="change"]'), cancel: txt('[data-d77="cancel"]'), send: txt('[data-d77="send"]'),
    placeholder: area?.placeholder ?? null, aria: area?.getAttribute("aria-label") ?? null, value: area?.value ?? null,
    line: txt('[data-d77="sent-line"]'), again: txt('[data-d77="again"]'), failed: txt('[data-d77="failed"]'),
    sendDisabled: (q('[data-d77="send"]')[0] as HTMLButtonElement | undefined)?.disabled ?? null,
    allText: (fw.textContent ?? "") + " " + [...fw.querySelectorAll("*")].flatMap((e) => [...e.attributes].map((a) => a.value)).join(" "),
    n, escapes: escapes.slice(0, 6), over, pillCols,
  };
});

test("DB77 C1 — the variant comes from the card's own height", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("c1");
  const want: Record<string, { layout: string; art: boolean; rows: number }> = {
    "1280x650": { layout: "sm", art: false, rows: 0 }, "1366x768": { layout: "sm", art: true, rows: 0 }, "1440x900": { layout: "sm", art: true, rows: 0 },
    "1920x1080": { layout: "lg", art: true, rows: 3 }, "2560x1440": { layout: "lg", art: true, rows: 4 },
  };
  for (const vp of FIVE) {
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
    const c = await readCard(page);
    const w = tag(vp), x = want[w];
    L.check("C1", `${w} population: the card, and the record holds ${FIXTURE_ROWS.length} docs`, !!c && c.sent === FIXTURE_ROWS.length, JSON.stringify({ h: c?.h, sent: c?.sent }));
    if (!c) continue;
    const variant = c.layout === "lg" ? `Big·${c.rows.length}` : c.art ? "Laptop" : "Compact";
    const wantV = x.layout === "lg" ? `Big·${x.rows}` : x.art ? "Laptop" : "Compact";
    L.check("C1", `${w} the card (${c.h.toFixed(0)}px tall) is ${wantV}`, variant === wantV, `${variant}`);
    if (x.layout === "sm") L.check("C1", `${w} ${x.art ? "Laptop shows the stats line" : "Compact has no stats line"}`, x.art ? c.stats.length === 1 : c.stats.length === 0, JSON.stringify(c.stats));
  }
  L.done(13);
});

test("DB77 C2 — nothing is cut: idle, write and sent at five sizes", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("c2");
  await mockSend(page, true);
  for (const vp of FIVE) for (const st of ["idle", "write", "sent"] as FwState[]) {
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
    await driveFw(page, st);
    await page.mouse.move(2, 2);
    const c = await readCard(page);
    const w = `${tag(vp)} ${st}`;
    L.check("C2", `${w} population: the card in that state, with its parts`, !!c && c.state === st && c.n >= 8, JSON.stringify({ state: c?.state, n: c?.n }));
    if (!c) continue;
    L.check("C2", `${w} every element lies inside the card's frame`, c.escapes.length === 0, c.escapes.join(" | ") || "none");
    L.check("C2", `${w} no box inside the card scrolls (scroll ≤ client)`, c.over.length === 0, c.over.join(" | ") || "none");
  }
  L.done(45);
});

test("DB77 C3 · C4 — the copy table, no Nick, no green", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("c3c4");
  await mockSend(page, true);
  const KINDS = ["Something's broken", "Something's confusing", "An idea", "Something I liked"];
  const nick = (t: string) => t.toLowerCase().includes("nick");
  for (const vp of [{ width: 1440, height: 900 }, { width: 2560, height: 1440 }]) {
    const w = tag(vp);
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
    if (MUT77 === "C3-copy") await page.evaluate(() => { const h = [...document.querySelectorAll('[data-d77="heading"]')]; h.forEach((e) => { e.textContent = "We'd love your feedback, says Nick."; }); });
    const i = (await readCard(page))!;
    L.check("C3", `${w} population: the card`, !!i, "");
    L.check("C3", `${w} band`, i.band === "You’re a QueryHawk founding writer", i.band);
    L.check("C3", `${w} idle heading`, i.heading.join("|") === "We’d love to hear your feedback.", i.heading.join("|"));
    L.check("C3", `${w} stats`, i.stats.join("|") === "5 sent · 2 changed QueryHawk", i.stats.join("|"));
    L.check("C3", `${w} the four pills, in order`, i.kinds.join("|") === KINDS.join("|"), i.kinds.join("|"));
    if (i.layout === "lg") {
      L.check("C3", `${w} record header`, i.recordHead.join("|") === "WHAT YOUR FEEDBACK CHANGED", i.recordHead.join("|"));
      L.check("C3", `${w} status labels`, i.rows.map((r) => r.label).join("|") === "Built|Fixed|Planned|Read", i.rows.map((r) => r.label).join("|"));
      L.check("C3", `${w} a row with no title shows its message, quoted`, i.rows.some((r) => r.title === "“The chart is my favourite bit”"), i.rows.map((r) => r.title).join(" | "));
      const tip = await page.evaluate(() => { const r = [...document.querySelectorAll<HTMLElement>('[data-d77="lg"] [data-d77="row"]')].find((e) => e.getBoundingClientRect().height > 0); return r ? { native: r.hasAttribute("title") || !!r.querySelector("[title]"), vh: r.querySelector(".d77-vh")?.textContent ?? "" } : null; });
      L.check("C3", `${w} the tooltip is drawn, not native, and read to screen readers`, !!tip && !tip.native && tip.vh === "Your idea, 2 Oct → Shipped 20 Oct", JSON.stringify(tip));
    }
    L.check("C3", `${w} no "Nick" anywhere in the card (idle)`, !nick(i.allText), "");
    for (const p of i.pillCols) {
      for (const [k, col] of [["background", p.bg], ["border", p.bd]] as const) {
        const m = col.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
        if (!m) continue;
        const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255); const a = m[4] === undefined ? 1 : Number(m[4]);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        let hue = 0; if (d) hue = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); if (hue < 0) hue += 360;
        L.check("C4", `${w} ${p.st} pill ${k} is not green`, a === 0 || sat <= 0.15 || hue < 80 || hue > 170, `${col} hue ${hue.toFixed(0)} sat ${(sat * 100).toFixed(0)}%`);
      }
    }
    L.check("C4", `${w} population: the pills read`, i.layout !== "lg" || i.pillCols.length >= 4, `${i.pillCols.length}`);
    /* write */
    await driveFw(page, "write", "");
    const r = (await readCard(page))!;
    L.check("C3", `${w} write: placeholder and aria-label are the kind's question`, r.placeholder === "What would make QueryHawk better for you?" && r.aria === r.placeholder, `${r.placeholder} / ${r.aria}`);
    L.check("C3", `${w} write: Cancel and Tell us`, r.cancel.join("|") === "Cancel" && r.send.join("|") === "Tell us", `${r.cancel}|${r.send}`);
    L.check("C3", `${w} write: Tell us is disabled until there is text`, r.sendDisabled === true, String(r.sendDisabled));
    if (r.layout === "sm") L.check("C3", `${w} write (Laptop): the chosen kind as a chip, with Change`, r.chosen.join("|") === "An idea" && r.change.join("|") === "Change", `${r.chosen}|${r.change}`);
    await page.locator('[data-d77="message"]:visible').fill("   ");
    L.check("C3", `${w} write: whitespace alone does not enable Tell us`, (await readCard(page))!.sendDisabled === true, "");
    await page.locator('[data-d77="message"]:visible').fill("A calendar of my send dates.");
    await page.locator('[data-d77="send"]:visible').click();
    await page.locator('[data-d58="panel"][data-state="sent"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    const s = (await readCard(page))!;
    if (s.layout === "lg") L.check("C3", `${w} sent heading (Big)`, s.heading.join("|") === "Thank you. We read all feedback.", s.heading.join("|"));
    else L.check("C3", `${w} sent (Laptop): Thank you. / We read all feedback. / Tell us something else`, s.heading.join("|") === "Thank you." && s.line.join("|") === "We read all feedback." && s.again.join("|") === "Tell us something else", `${s.heading}|${s.line}|${s.again}`);
    L.check("C3", `${w} no "Nick" anywhere in the card (sent)`, !nick(s.allText), "");
  }
  L.done(30);
});

test("DB77 C5 — the send path: the payload, a failure keeps the text, a success heads the record", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("c5");
  const vp = { width: 2560, height: 1440 };
  /* failure */
  let fail = true;
  const calls: Array<Record<string, unknown>> = [];
  await page.context().route("**/sendBetaFeedback", async (r) => {
    try { calls.push((JSON.parse(r.request().postData() ?? "{}") as { data?: Record<string, unknown> }).data ?? {}); } catch { calls.push({}); }
    if (fail) await r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { status: "INTERNAL", message: "no" } }) });
    else await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) });
  });
  await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS });
  const text = "Show me which agents read my partial.";
  await driveFw(page, "write", text);
  await page.locator('[data-d77="send"]:visible').click();
  await page.locator('[data-d77="failed"]:visible').first().waitFor({ timeout: 8000 }).catch(() => {});
  const f = (await readCard(page))!;
  L.check("C5", "failure: one call was made", calls.length === 1, `${calls.length}`);
  const p = calls[0] ?? {};
  L.check("C5", "the payload carries {kind, message, wantsReply: true, severity: \"\", pageName}", p.kind === "An idea" && p.message === text && p.wantsReply === true && p.severity === "" && p.pageName === "Dashboard", JSON.stringify({ kind: p.kind, message: p.message, wantsReply: p.wantsReply, severity: p.severity, pageName: p.pageName }));
  L.check("C5", "failure: still writing, the text kept, the line shown", f.state === "write" && f.value === text && f.failed.join("|") === "That didn't send. Try again?", JSON.stringify({ state: f.state, value: f.value, failed: f.failed }));
  /* success */
  fail = false;
  await page.locator('[data-d77="send"]:visible').click();
  await page.locator('[data-d58="panel"][data-state="sent"]').first().waitFor({ timeout: 8000 }).catch(() => {});
  const s = (await readCard(page))!;
  L.check("C5", "success: the card is sent", s.state === "sent", s.state);
  L.check("C5", "success: the new note heads the record, as Sent", s.rows[0]?.status === "sent" && s.rows[0]?.label === "Sent" && s.rows[0]?.title === `“${text}”`, JSON.stringify(s.rows[0]));
  L.check("C5", "success: the sent count ticks up by one", s.sent === FIXTURE_ROWS.length + 1 && s.stats.join("|").startsWith(`${FIXTURE_ROWS.length + 1} sent`), `${s.sent} · ${s.stats}`);
  L.check("C5", "success: a second call was made", calls.length === 2, `${calls.length}`);
  /* Big's sent state keeps the pills live */
  await page.locator('[data-d77="kind"]:visible').nth(0).click();
  L.check("C5", "sent (Big): a pill opens the form again", (await readCard(page))!.state === "write", "");
  await page.locator('[data-d77="cancel"]:visible').click();
  const c = (await readCard(page))!;
  L.check("C5", "Cancel: back to idle, the text cleared", c.state === "idle", c.state);
  L.done(9);
});

test("DB77 C6 — nothing sent: no stats and no record; nothing changed: only the sent count", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("c6");
  for (const vp of [{ width: 2560, height: 1440 }, { width: 1440, height: 900 }]) {
    const w = tag(vp);
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: [] });
    const z = (await readCard(page))!;
    L.check("C6", `${w} population: the card with nothing sent`, !!z && z.sent === 0, `${z?.sent}`);
    L.check("C6", `${w} sent = 0: no stats line`, z.stats.length === 0, JSON.stringify(z.stats));
    L.check("C6", `${w} sent = 0: no record block`, z.recordHead.length === 0 && z.rows.length === 0, `${z.recordHead.length}/${z.rows.length}`);
    await openDash(page, vp, { __SA_FEEDBACK_ROWS: FIXTURE_ROWS.filter((r) => !r.status || r.status === "read" || r.status === "planned") });
    const n = (await readCard(page))!;
    L.check("C6", `${w} changed = 0: "3 sent"`, n.stats.join("|") === "3 sent", JSON.stringify(n.stats));
  }
  L.done(8);
});

/* ── D1 — "us", not "Nick", where a writer gives feedback ─────────────────────────────────────── */

test("DB77 D1 — the dock, the help receipt and the help home say us, never Nick", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("d1");
  await mockSend(page, true);
  const vp = { width: 1440, height: 900 };
  const vis = (sel: string) => page.locator(sel).filter({ visible: true }).first();
  const textOf = (sel: string) => page.evaluate((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    /* what a person can see or hear: the text, and the attributes a screen reader or a tooltip speaks (never a data-* hook) */
    const SPOKEN = ["aria-label", "title", "alt", "placeholder"];
    return e ? `${e.innerText} ${[...e.querySelectorAll("*")].flatMap((x) => SPOKEN.map((k) => x.getAttribute(k) ?? "")).join(" ")}` : null;
  }, sel);
  const nick = (t: string | null) => !!t && t.toLowerCase().includes("nick");
  /* the dock, open and then sent */
  await openDash(page, vp);
  await vis(".ws-fbtn, .ws-fbb, .ws-fbi").click();
  await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 }).catch(() => {});
  if (MUT77 === "D1-nick") await page.evaluate(() => { const p = document.querySelector("[data-fb='panel'] p"); if (p) p.textContent = "Every message reaches Nick, the founder."; });
  const open = await textOf("[data-fb='panel']");
  L.check("D1", "population: the dock is open", !!open && open.includes("Tell us what you found"), String(open?.slice(0, 80)));
  L.check("D1", "the open dock names no Nick", !nick(open), String(open?.slice(0, 200)));
  L.check("D1", "the dock says 'Every message reaches our founder.'", !!open && open.includes("Every message reaches our founder."), "");
  await vis("[data-fb='kind'][data-k='An idea']").click();
  await vis("[data-fb='message']").fill("A note from the D1 lock.");
  await vis("[data-fb='send']").click();
  await page.locator("[data-fb='sent']").first().waitFor({ timeout: 8000 }).catch(() => {});
  const done = await textOf("[data-fb='panel']");
  L.check("D1", "population: the dock's sent view", !!done && done.includes("Got it, thank you"), String(done?.slice(0, 80)));
  L.check("D1", "the sent dock names no Nick, and signs as the team", !nick(done) && !!done && done.includes("— The QueryHawk team"), String(done?.slice(0, 200)));
  await page.keyboard.press("Escape");
  /* the help article's receipt */
  await openRoute(page, "/help/list-health", vp);
  await vis("[data-hc='helpful-no']").click();
  await vis("[data-hc='helpful-input']").fill("A worked example would help");
  await vis("[data-hc='helpful-send']").click();
  await vis("[data-hc='helpful-sent']").waitFor({ timeout: 10_000 }).catch(() => {});
  const receipt = await textOf("[data-hc='helpful-sent']");
  L.check("D1", "the help receipt reads 'Thanks. That goes straight to us.'", !!receipt && receipt.trim() === "Thanks. That goes straight to us.", String(receipt));
  /* the help home's no-results line */
  await openRoute(page, "/help", vp);
  const input = vis("[data-hc='search-input']");
  await input.waitFor({ timeout: 15_000 });
  await input.fill("zzqxv");
  await page.waitForTimeout(200);
  const home = await textOf(".ws-window");
  const nores = await textOf("[data-hc='no-results']");
  L.check("D1", "population: the help home and its no-results line", !!home && !!nores, String(nores));
  L.check("D1", "the help home names no Nick", !nick(home) && !nick(nores), String(nores));
  L.done(8);
});

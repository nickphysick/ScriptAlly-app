/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v105 — the founding card as a press ID (ref design-refs/dashboard-v105/founding-flow-v104.html).
 *
 *   B1  the ID strip: the name, "FOUNDING WRITER · No. 0NN" (or no number) and an ⓘ; no "How it works" link in the body
 *   B2  idle at tiers 0, 0+waiting, 1 and 4: the photo and its label; the ranks' colour heads and the one current
 *   B3  compose per kind (callable mocked): question, placeholder, kind sent; the chip is the kind; Send disabled when
 *       empty; a refusal keeps the text; the Compact card opens the sidebar's panel preset to the kind
 *   B4  sent: the copy at tier 0 and tier ≥1; the crack is drawn after 1.5s
 *   C1  the celebration: plays once when the rank is above the rank seen, writes foundingSeenTier, a reload shows idle;
 *       a skipped rank celebrates the highest only; the words; the timeline; reduced motion shows the end state
 *   D1  How it works: three slides, the dots, Back / Next / Got it, arrows, Esc and the dim layer; focus trapped and
 *       returned to the ⓘ; it reopens at slide 1; v93's panel is gone
 *   S1  nothing cut, every state × the seven sizes
 *   S2  no green; no "Nick"; at 370px the three labels whole
 *
 * Every lock reads the rendered page. `DB105_MUTATE=<name>` applies each lock's named break (db105Lib).
 */
import { test, type Page } from "@playwright/test";
import { Ledger, SIZES, STATS, fit, mockCallable, openDash, tag, type VP } from "./db105Lib";
import { liftMotionSuppression } from "./measure";
import { execFileSync } from "node:child_process";

/** The harness account's stored seen-rank on dev (tests/e2e/foundingSeen.mjs): "absent" or "0"–"5". */
const seenOnDev = (...args: string[]) => execFileSync("node", ["tests/e2e/foundingSeen.mjs", ...args], { encoding: "utf8" }).trim().split("\n").pop() ?? "";

const card = '[data-d105="card"]';
const vis = (page: Page, sel: string) => page.locator(`${card} ${sel}`).filter({ visible: true }).first();
const text = async (page: Page, sel: string) => ((await vis(page, sel).textContent({ timeout: 3000 }).catch(() => null)) ?? "").trim();
const isCompact = (vp: VP) => vp.height <= 650;

/* ── B1 ── */
test("DB105 B1 — the ID strip: name, founding number and ⓘ; no How it works link in the body", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("b1");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1100, height: 800 }, { width: 1920, height: 1080 }]) {
    for (const [st, line] of [["egg", "FOUNDING WRITER · No. 023"], ["nonumber", "FOUNDING WRITER"]] as const) {
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[st] });
      const w = `${tag(vp)} ${st}`;
      const r = await page.evaluate((c) => {
        const el = [...document.querySelectorAll<HTMLElement>(c)].find((e) => e.getBoundingClientRect().height > 0);
        if (!el) return null;
        const strip = el.querySelector<HTMLElement>('[data-d105="strip"]');
        const on = (e: Element | null | undefined) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
        const info = strip?.querySelector<HTMLElement>('[data-d105="info"]');
        const bodyText = [...el.querySelectorAll<HTMLElement>(".d105-body, .d105-compact")].filter(on).map((b) => b.innerText).join(" ");
        return {
          name: strip?.querySelector<HTMLElement>('[data-d105="name"]')?.innerText.trim() ?? "",
          no: strip?.querySelector<HTMLElement>('[data-d105="no"]')?.innerText.trim() ?? "",
          info: on(info) ? info!.getAttribute("aria-label") : null,
          infoInStrip: !!info && strip!.contains(info),
          howInBody: /how it works/i.test(bodyText),
          noFont: strip ? getComputedStyle(strip.querySelector('[data-d105="no"]')!).fontFamily : "",
        };
      }, card);
      L.check("B1", `${w} population`, !!r, JSON.stringify(r));
      if (!r) continue;
      L.check("B1", `${w} the name is the writer's display name`, r.name.length > 0, r.name);
      L.check("B1", `${w} the number line`, r.no === line, r.no);
      L.check("B1", `${w} the ⓘ is in the strip and opens How it works`, r.info === "How it works" && r.infoInStrip, String(r.info));
      L.check("B1", `${w} no How it works link in the body`, !r.howInBody, String(r.howInBody));
      L.check("B1", `${w} the number line is mono`, /JetBrains Mono/.test(r.noFont), r.noFont);
    }
  }
  L.done(30);
});

/* ── B2 ── */
const B2 = [
  { st: "egg", photo: "egg", label: "EGG", colour: 1, you: 0 },
  { st: "hatching", photo: "hatching", label: "HATCHING", colour: 1, you: 0 },
  { st: "fledgling", photo: "head", label: "FLEDGLING", colour: 2, you: 1 },
  { st: "mentor", photo: "head", label: "MENTOR", colour: 5, you: 4 },
] as const;
test("DB105 B2 — idle: the photo and its label by tier; the ranks' colour heads and exactly one current", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("b2");
  const vp = { width: 1440, height: 900 };
  for (const c of B2) {
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[c.st] });
    const r = await page.evaluate((sel) => {
      const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0)!;
      const photo = el.querySelector<HTMLElement>('[data-d105="photo"]');
      const heads = [...el.querySelectorAll<HTMLElement>('[data-d105="head"]')];
      /* colour is RENDERED colour: an image with no greyscale filter, or the egg's drawing */
      const colour = heads.filter((h) => { const i = h.querySelector("img"); return !i || !/grayscale/.test(getComputedStyle(i).filter); }).length;
      const ringed = heads.map((h, i) => [i, getComputedStyle(h).boxShadow] as const).filter(([, b]) => /1\.5px/.test(b)).map(([i]) => i);
      const img = photo?.querySelector<HTMLImageElement>("img");
      return {
        photo: photo?.dataset.photo ?? "", label: photo?.querySelector("small")?.textContent?.trim() ?? "",
        img: img ? img.getAttribute("src") : null, imgDone: img ? img.complete && img.naturalWidth > 0 : null,
        heads: heads.length, colour, ringed, current: heads.filter((h) => h.getAttribute("aria-current") === "step").length,
      };
    }, card);
    const w = `${c.st}`;
    L.check("B2", `${w} population: six heads`, r.heads === 6, String(r.heads));
    L.check("B2", `${w} the photo`, r.photo === c.photo, r.photo);
    L.check("B2", `${w} the label`, r.label === c.label, r.label);
    if (c.photo === "head") L.check("B2", `${w} the head is the tier's, and drawn`, !!r.img && r.img.includes(c.st) && r.imgDone === true, `${r.img} ${r.imgDone}`);
    L.check("B2", `${w} colour heads`, r.colour === c.colour, `${r.colour} of 6`);
    L.check("B2", `${w} exactly one current, ringed in ink, at ${c.you}`, r.current === 1 && r.ringed.length === 1 && r.ringed[0] === c.you, JSON.stringify(r.ringed));
  }
  L.done(22);
});

/* ── B3 ── */
const B3 = [
  { k: "like", q: "What do you like?", ph: "Tell us what’s working for you…", kind: "Something I liked", chip: null },
  { k: "dont", q: "What isn’t working?", ph: "What happened, or where did you get stuck?", kind: "Something's broken", chip: null },
  { k: "dont", q: "What isn’t working?", ph: "What happened, or where did you get stuck?", kind: "Something's confusing", chip: "Something's confusing" },
  { k: "idea", q: "What would you add?", ph: "Something you wish QueryHawk did…", kind: "An idea", chip: null },
] as const;
test("DB105 B3 — compose per kind: the question, placeholder and kind sent; Send disabled when empty; a refusal keeps the text", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("b3");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    for (const c of B3) {
      const sent = await mockCallable(page, "ok");
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.egg });
      const w = `${tag(vp)} ${c.k}${c.chip ? " (confusing)" : ""}`;
      await vis(page, `[data-d105="kind"][data-k="${c.k}"]`).click();
      await page.waitForTimeout(250);
      L.check("B3", `${w} the question`, (await text(page, '[data-d105="question"]')) === c.q, await text(page, '[data-d105="question"]'));
      const ta = vis(page, '[data-d105="text"]');
      L.check("B3", `${w} the placeholder`, (await ta.getAttribute("placeholder")) === c.ph, String(await ta.getAttribute("placeholder")));
      L.check("B3", `${w} the textarea has focus`, await ta.evaluate((e) => document.activeElement === e), "");
      const send = page.locator(`${card} button:visible`, { hasText: /^Send$/ }).first();
      L.check("B3", `${w} Send is disabled when empty`, await send.isDisabled(), "");
      await ta.fill("   \n  ");
      L.check("B3", `${w} Send is disabled for whitespace`, await send.isDisabled(), "");
      if (c.k === "dont") {
        const chips = await page.locator(`${card} [data-d105="chip"]`).evaluateAll((es) => es.map((e) => [e.getAttribute("data-kind"), e.getAttribute("aria-checked")]));
        L.check("B3", `${w} two chips, broken selected by default`, JSON.stringify(chips) === JSON.stringify([["Something's broken", "true"], ["Something's confusing", "false"]]), JSON.stringify(chips));
        if (c.chip) await page.locator(`${card} [data-d105="chip"][data-kind="${c.chip}"]`).click();
      }
      await ta.fill("The filter resets every time I come back to the page.");
      L.check("B3", `${w} Send is enabled with text`, !(await send.isDisabled()), "");
      await send.click();
      await page.locator(`${card}[data-state="sent"]`).waitFor({ timeout: 8000 }).catch(() => {});
      L.check("B3", `${w} one payload, the kind sent`, sent.length === 1 && sent[0].kind === c.kind, JSON.stringify(sent.map((s) => s.kind)));
      L.check("B3", `${w} the message and the fields`, sent[0]?.message === "The filter resets every time I come back to the page." && sent[0]?.severity === "" && sent[0]?.wantsReply === true && sent[0]?.screenshotPath === "", JSON.stringify(sent[0] ?? {}).slice(0, 160));
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
  /* a refusal: stay in compose, the text kept, the line said */
  const vp = { width: 1440, height: 900 };
  await mockCallable(page, "fail");
  await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.egg });
  await vis(page, '[data-d105="kind"][data-k="idea"]').click();
  await vis(page, '[data-d105="text"]').fill("A bulk nudge for everyone who has gone quiet.");
  await page.locator(`${card} button:visible`, { hasText: /^Send$/ }).first().click();
  await page.waitForTimeout(2500);
  const st = await page.locator(card).first().getAttribute("data-state");
  L.check("B3", "refusal: still composing", st === "write", String(st));
  L.check("B3", "refusal: the text is kept", (await vis(page, '[data-d105="text"]').inputValue()) === "A bulk nudge for everyone who has gone quiet.", "");
  L.check("B3", "refusal: the line", (await text(page, '.d105-wn')) === "That didn’t send. Try again?", await text(page, ".d105-wn"));
  await page.unrouteAll({ behavior: "ignoreErrors" });
  /* ✕ goes back to idle, and the text is kept until the card leaves */
  await vis(page, '[data-d105="cancel"]').click();
  L.check("B3", "✕ returns to idle", (await page.locator(card).first().getAttribute("data-state")) === "idle", "");
  await vis(page, '[data-d105="kind"][data-k="idea"]').click();
  L.check("B3", "the text is kept after ✕", (await vis(page, '[data-d105="text"]').inputValue()) === "A bulk nudge for everyone who has gone quiet.", "");
  /* the Compact card (1280×650): a round button opens the sidebar's panel, preset to the kind */
  for (const [k, kind] of [["like", "Something I liked"], ["dont", "Something's broken"], ["idea", "An idea"]] as const) {
    await openDash(page, { width: 1280, height: 650 }, { __SA_FOUNDING_STATS: STATS.egg });
    await vis(page, `[data-d105="ckind"][data-k="${k}"]`).click();
    await page.waitForTimeout(500);
    const chosen = await page.locator('[data-fb="kind"][aria-checked="true"]').filter({ visible: true }).first().getAttribute("data-k", { timeout: 3000 }).catch(() => null);
    L.check("B3", `compact ${k}: the panel opens on ${kind}`, chosen === kind, String(chosen));
    L.check("B3", `compact ${k}: the card stays idle`, (await page.locator(card).first().getAttribute("data-state")) === "idle", "");
  }
  L.done(60);
});

/* ── B4 ── */
test("DB105 B4 — sent: the thank-you by tier; the crack is drawn after 1.5s", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("b4");
  for (const [st, tier] of [["egg", 0], ["mentor", 4]] as const) {
    for (const motion of ["no-preference", "reduce"] as const) {
      await page.emulateMedia({ reducedMotion: motion });
      await mockCallable(page, "ok");
      await openDash(page, { width: 1440, height: 900 }, { __SA_FOUNDING_STATS: STATS[st] });
      /* ⚠️ THE HARNESS SUPPRESSES ANIMATION BY DEFAULT: the crack only draws once that is lifted */
      await liftMotionSuppression(page);
      await vis(page, '[data-d105="kind"][data-k="like"]').click();
      await vis(page, '[data-d105="text"]').fill("The calendar view makes my week much clearer.");
      await page.locator(`${card} button:visible`, { hasText: /^Send$/ }).first().click();
      await page.locator(`${card}[data-state="sent"]`).waitFor({ timeout: 8000 }).catch(() => {});
      const w = `${st} ${motion}`;
      const first = (await page.evaluate(() => (document.querySelector<HTMLElement>('[data-d105="name"]')?.innerText ?? "").trim().split(/\s+/)[0]));
      L.check("B4", `${w} the title thanks them by first name`, (await text(page, '[data-d105="sent-title"]')) === `Thank you, ${first}.`, await text(page, '[data-d105="sent-title"]'));
      const body = await text(page, '[data-d105="sent-body"]');
      L.check("B4", `${w} the body`, tier === 0
        ? body === "Your note is with us, and your egg is starting to crack. It hatches as soon as we’ve read it, usually within a few days."
        : body === "Your note is with us, and it counts once we’ve read it.", body);
      L.check("B4", `${w} Send another`, (await text(page, '[data-d105="again"]')) === "Send another", "");
      if (tier === 0) {
        if (motion === "no-preference") await page.waitForTimeout(1500);
        const off = await page.evaluate(() => getComputedStyle(document.querySelector('[data-d105="sent"] [data-d105="crack"]')!).strokeDashoffset);
        L.check("B4", `${w} the crack is drawn (dashoffset 0)`, parseFloat(off) === 0, off);
      } else {
        L.check("B4", `${w} the tier's head with a tick`, await page.locator(`${card} .d105-hxhead[src*="mentor"]`).count() === 1 && await page.locator(`${card} .d105-tick`).count() === 1, "");
      }
      await vis(page, '[data-d105="again"]').click();
      L.check("B4", `${w} Send another returns to idle`, (await page.locator(card).first().getAttribute("data-state")) === "idle", "");
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  L.done(20);
});

/* ── S1 ── */
async function s1Read(L: Ledger, page: Page, where: string, expectState: string) {
  const f = await fit(page);
  L.check("S1", `${where} population`, f.n >= 6 && f.leaves >= 4 && f.state === expectState, `${f.n} boxes · ${f.leaves} leaves · ${f.state}`);
  L.check("S1", `${where} every box inside the card`, f.escapes.length === 0, f.escapes.slice(0, 3).join(" | "));
  L.check("S1", `${where} nothing scrolls`, f.scrolls.length === 0, f.scrolls.join(" | "));
  L.check("S1", `${where} no text cut`, f.clipped.length === 0, f.clipped.slice(0, 3).join(" | "));
  L.check("S1", `${where} nothing sits on anything else`, f.overlaps.length === 0, f.overlaps.slice(0, 3).join(" | "));
}
test("DB105 S1 — nothing cut, for every state at every size", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("s1");
  for (const vp of SIZES) {
    for (const st of ["egg", "hatching", "fledgling", "mentor", "nonumber"]) {
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[st] });
      await s1Read(L, page, `${tag(vp)} idle-${st}`, "idle");
    }
    /* the celebration, at its end state (reduced motion), through the dev seen-rank aid — nothing is written */
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const st of ["fledgling", "mentor", "queryhawk"]) {
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[st], __SA_FOUNDING_SEEN: 0 });
      await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 8000 }).catch(() => {});
      await s1Read(L, page, `${tag(vp)} celebrate-${st}`, "celebrate");
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (isCompact(vp)) continue; /* the Compact card composes in the sidebar's panel (B3) */
    for (const st of ["egg", "mentor"]) {
      await mockCallable(page, "ok");
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[st] });
      /* ⚠️ A MISSED CLICK IS A RED ROW, NEVER A TIMEOUT: a timeout ends the test before the ledger is written, so
         the readings already taken are lost and the red says nothing about what was measured */
      const press = async (sel: string, what: string) => {
        const ok = await vis(page, sel).click({ timeout: 5000 }).then(() => true, () => false);
        if (!ok) L.check("S1", `${tag(vp)} ${st}: ${what} can be pressed`, false, sel);
        return ok;
      };
      let wrote = true;
      for (const k of ["like", "dont", "idea"]) {
        if (!(await press(`[data-d105="kind"][data-k="${k}"]`, `the ${k} button`))) { wrote = false; break; }
        await page.waitForTimeout(250);
        await s1Read(L, page, `${tag(vp)} write-${k} ${st}`, "write");
        if (k !== "idea" && !(await press('[data-d105="cancel"]', "✕"))) { wrote = false; break; }
        await page.waitForTimeout(150);
      }
      if (!wrote) { await page.unrouteAll({ behavior: "ignoreErrors" }); continue; }
      await vis(page, '[data-d105="text"]').fill("A bulk nudge for everyone who has gone quiet would save me an hour a week.", { timeout: 5000 }).catch(() => undefined);
      await page.locator(`${card} button:visible`, { hasText: /^Send$/ }).first().click({ timeout: 5000 }).catch(() => L.check("S1", `${tag(vp)} ${st}: Send can be pressed`, false, ""));
      await page.locator(`${card}[data-state="sent"]`).waitFor({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await s1Read(L, page, `${tag(vp)} sent ${st}`, "sent");
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
  L.done(500);
});

/* ── S2 ── */
test("DB105 S2 — no green, no Nick, and at 370px the three labels whole", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("s2");
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1100, height: 800 }, { width: 1920, height: 1080 }]) {
    for (const st of ["egg", "mentor"]) {
      await openDash(page, vp, { __SA_FOUNDING_STATS: STATS[st] });
      const r = await page.evaluate((sel) => {
        const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0)!;
        const green: string[] = [];
        const hue = (c: string) => {
          const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); if (!m || (m[4] !== undefined && +m[4] < 0.05)) return null;
          const [r, g, b] = [+m[1] / 255, +m[2] / 255, +m[3] / 255]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
          if (d === 0) return { h: 0, s: 0 }; const s = d / (1 - Math.abs(2 * l - 1));
          const h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
          return { h: (h + 360) % 360, s };
        };
        let n = 0;
        for (const e of [el, ...el.querySelectorAll<HTMLElement>("*")]) {
          if (e.getBoundingClientRect().width <= 0) continue;
          const cs = getComputedStyle(e);
          for (const c of [cs.color, cs.backgroundColor, cs.borderTopColor, ...(cs.backgroundImage.match(/rgba?\([^)]*\)/g) ?? [])]) {
            n++; const x = hue(c); if (x && x.s > 0.15 && x.h >= 80 && x.h <= 170) green.push(`${e.className} ${c}`);
          }
        }
        const labels = [...el.querySelectorAll<HTMLElement>('[data-d105="kind"]')].filter((b) => b.getBoundingClientRect().height > 0).map((b) => {
          const s = b.querySelector("span")!; const cs = getComputedStyle(s);
          return { t: s.innerText.trim(), whole: s.scrollWidth <= s.clientWidth + 0.5 && b.scrollWidth <= b.clientWidth + 0.5 && cs.textOverflow !== "ellipsis" };
        });
        /* RE-POINTED (v116): the card is tilted at rest, so this is the LAYOUT width, never the rotated rect's */
        return { n, green, text: el.innerText, labels, w: el.offsetWidth };
      }, card);
      const w = `${tag(vp)} ${st}`;
      L.check("S2", `${w} population`, r.n > 40, String(r.n));
      L.check("S2", `${w} no green`, r.green.length === 0, r.green.slice(0, 3).join(" | "));
      L.check("S2", `${w} no "Nick"`, !/\bNick\b/i.test(r.text), "");
      if (Math.abs(r.w - 370) <= 1) {
        L.check("S2", `${w} three labels`, r.labels.length === 3, JSON.stringify(r.labels));
        L.check("S2", `${w} the labels whole`, r.labels.every((l) => l.whole) && r.labels.map((l) => l.t).join("|") === "What I like|What I don’t|An idea", JSON.stringify(r.labels));
      }
    }
  }
  L.done(26);
});

/* ── C1 ── */
test("DB105 C1 — the celebration plays once, records the rank, and a reload shows idle; a skipped rank celebrates the highest", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("c1");
  const vp = { width: 1440, height: 900 };
  const before = seenOnDev("get");
  L.check("C1", "the harness account starts with no seen-rank", before === "absent", before);
  try {
    /* the real path: peak 1 > seen (absent = 0) → the hatch plays, and foundingSeenTier = 1 is WRITTEN to the account */
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.fledgling, __SA_FOUNDING_SEEN: "real", __SA_FOUNDING_WRITE: true });
    await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 8000 }).catch(() => {});
    const t = await page.locator(card).first().getAttribute("data-state");
    L.check("C1", "peak 1 > seen 0: the hatch plays", t === "celebrate" && (await page.locator(`${card} [data-d105="celebrate"]`).getAttribute("data-tier")) === "1", String(t));
    L.check("C1", "the words", (await text(page, '[data-d105="cel-kicker"]')) === "YOU’VE HATCHED" && (await text(page, '[data-d105="cel-title"]')) === "Meet your Fledgling"
      && (await text(page, '[data-d105="cel-body"]')) === "Just hatched, and already helping. Two more notes and you become an Archivist." && (await text(page, '[data-d105="give-more"]')) === "Give more feedback",
      [await text(page, '[data-d105="cel-kicker"]'), await text(page, '[data-d105="cel-title"]'), await text(page, '[data-d105="cel-body"]')].join(" | "));
    let stored = "";
    for (let i = 0; i < 10 && stored !== "1"; i++) { await page.waitForTimeout(800); stored = seenOnDev("get"); }
    L.check("C1", "foundingSeenTier = 1 is written", stored === "1", stored);
    await page.reload();
    await page.locator('[data-d105="card"][data-loading="0"]').first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    L.check("C1", "a reload shows idle at Fledgling, no replay", (await page.locator(card).first().getAttribute("data-state")) === "idle" && (await text(page, '[data-d105="photo-label"]')) === "FLEDGLING", `${await page.locator(card).first().getAttribute("data-state")} ${await text(page, '[data-d105="photo-label"]')}`);
    /* Give more feedback → idle */
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.fledgling, __SA_FOUNDING_SEEN: 0 });
    await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 8000 }).catch(() => {});
    await vis(page, '[data-d105="give-more"]').click();
    L.check("C1", "Give more feedback returns to idle", (await page.locator(card).first().getAttribute("data-state")) === "idle", "");
    /* a skipped rank: seen 0, shown 4 → one celebration, of the Mentor, recorded as 4 */
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.mentor, __SA_FOUNDING_SEEN: 0 });
    await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 8000 }).catch(() => {});
    L.check("C1", "a skipped rank celebrates the highest (4)", (await page.locator(`${card} [data-d105="celebrate"]`).getAttribute("data-tier")) === "4" && (await text(page, '[data-d105="cel-kicker"]')) === "YOU’VE RANKED UP" && (await text(page, '[data-d105="cel-title"]')) === "You’re now a Mentor", await text(page, '[data-d105="cel-title"]'));
    L.check("C1", "…and records 4", (await page.evaluate(() => (window as unknown as { __SA_FOUNDING_SEEN_WRITTEN?: number }).__SA_FOUNDING_SEEN_WRITTEN)) === 4, "");
    L.check("C1", "the rank-up draws no egg", await page.locator(`${card} .d105-hx.is-rankup .d105-stop`).evaluate((e) => getComputedStyle(e).display === "none"), "");
    /* seen ≥ shown: no celebration */
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.mentor, __SA_FOUNDING_SEEN: 4 });
    await page.waitForTimeout(800);
    L.check("C1", "seen 4, shown 4: idle", (await page.locator(card).first().getAttribute("data-state")) === "idle", "");
    /* the timeline (motion lifted): words hidden before 1.9s, shown after; the bird out, the halves gone */
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.fledgling, __SA_FOUNDING_SEEN: 0 });
    await liftMotionSuppression(page);
    await page.reload();
    await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 15000 });
    const read = () => page.evaluate(() => {
      const c = document.querySelector('[data-d105="celebrate"]');
      const o = (s: string) => Number(getComputedStyle(c!.querySelector(s)!).opacity);
      return { words: o(".d105-ct"), bird: o(".d105-sfl"), top: o(".d105-stop"), burst: o(".d105-sb") };
    });
    await page.waitForTimeout(500);
    const early = await read();
    await page.waitForTimeout(2300);
    const late = await read();
    L.check("C1", "at 0.5s: the words not yet, the egg whole, the bird hidden", early.words < 0.05 && early.top > 0.95 && early.bird < 0.05, JSON.stringify(early));
    L.check("C1", "at 2.8s: the words, the bird out, the top half gone, the burst on", late.words > 0.95 && late.bird > 0.95 && late.top < 0.05 && late.burst > 0.95, JSON.stringify(late));
    /* reduced motion: the end state at once */
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.fledgling, __SA_FOUNDING_SEEN: 0 });
    await page.locator(`${card}[data-state="celebrate"]`).waitFor({ timeout: 8000 }).catch(() => {});
    const still = await read();
    L.check("C1", "reduced motion: the end state, no animation", still.words > 0.95 && still.bird > 0.95 && still.top < 0.05, JSON.stringify(still));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    /* the onboarding ghost passes no writer: no celebration (unit: celebrateTier(…, false)) */
  } finally {
    seenOnDev("clear");
  }
  const after = seenOnDev("get");
  L.check("C1", "the account is put back (absent)", after === "absent", after);
  L.done(14);
});

/* ── D1 ── */
test("DB105 D1 — How it works: three slides, the controls, Esc and the dim layer, focus back on the ⓘ, reopens at slide 1", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("d1");
  const vp = { width: 1440, height: 900 };
  await openDash(page, vp, { __SA_FOUNDING_STATS: STATS.egg });
  await liftMotionSuppression(page);
  const state = () => page.evaluate(() => {
    const m = document.querySelector<HTMLElement>('[data-d105h="modal"]');
    const b = m?.getBoundingClientRect();
    const a = document.activeElement as HTMLElement | null;
    const shown = [...(m?.querySelectorAll<HTMLElement>('[data-d105h="slide"]') ?? [])].find((s) => { const r = s.getBoundingClientRect(); return r.left >= (b?.left ?? 0) - 1 && r.right <= (b?.right ?? 0) + 1; });
    const back = m?.querySelector<HTMLElement>('[data-d105h="back"]');
    return {
      open: !!m?.classList.contains("on"), w: b?.width ?? 0, cx: b ? b.left + b.width / 2 - window.innerWidth / 2 : 99, cy: b ? b.top + b.height / 2 - window.innerHeight / 2 : 99,
      slides: m?.querySelectorAll('[data-d105h="slide"]').length ?? 0, slide: Number(m?.dataset.slide ?? -1),
      title: shown?.querySelector("h3")?.textContent ?? "", body: shown?.querySelector("p")?.textContent ?? "",
      dots: [...(m?.querySelectorAll('[data-d105h="dots"] i') ?? [])].map((d) => d.className),
      backShown: !!back && getComputedStyle(back).visibility !== "hidden",
      next: m?.querySelector<HTMLElement>('[data-d105h="next"]')?.textContent ?? "",
      focus: a?.dataset.d105 ?? a?.dataset.d105h ?? a?.tagName ?? "", inModal: !!(m && a && m.contains(a)),
      v93: !!document.querySelector('[data-d93="panel"]'),
      titleFont: shown ? getComputedStyle(shown.querySelector("h3")!).fontFamily : "",
    };
  });
  /* a click the dim layer intercepts is a red READING, not a timeout */
  const open = async () => { await vis(page, '[data-d105="info"]').click({ timeout: 5000 }).catch(() => undefined); await page.waitForTimeout(450); return state(); };
  let s = await open();
  L.check("D1", "opens: centred, 520 wide, three slides, focus inside", s.open && Math.abs(s.w - 520) <= 1 && Math.abs(s.cx) <= 1 && Math.abs(s.cy) <= 1 && s.slides === 3 && s.inModal, JSON.stringify({ w: s.w, cx: s.cx, cy: s.cy, n: s.slides, focus: s.focus }));
  L.check("D1", "v93's panel is gone", !s.v93, "");
  const TITLES = ["Tell us anything", "Climb the ranks", "Get thanked"];
  L.check("D1", "slide 1: its title, no Back, the first dot a pill, Next", s.slide === 0 && s.title === TITLES[0] && !s.backShown && s.dots.join(",") === "on,," && s.next === "Next", JSON.stringify({ t: s.title, back: s.backShown, dots: s.dots, next: s.next }));
  L.check("D1", "the title is typewriter", /Special Elite/.test(s.titleFont), s.titleFont);
  await page.locator('[data-d105h="next"]').click(); await page.waitForTimeout(450); s = await state();
  L.check("D1", "Next → slide 2, Back shown", s.slide === 1 && s.title === TITLES[1] && s.backShown && s.dots.join(",") === ",on,", JSON.stringify({ t: s.title, dots: s.dots }));
  L.check("D1", "slide 2's words", s.body === "One note hatches your Fledgling. Then 3, 8, 15 and 25 notes take you all the way to QueryHawk. Your rank never goes down.", s.body);
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(450); s = await state();
  L.check("D1", "→ slide 3, and its button is Got it", s.slide === 2 && s.title === TITLES[2] && s.next === "Got it", JSON.stringify({ t: s.title, next: s.next }));
  const fine = await page.locator('[data-d105h="modal"] .d105-fp').textContent();
  L.check("D1", "slide 3's fair-play line", fine === "Fair play: up to 3 notes a week count, a sentence or more, in your own words.", String(fine));
  await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(450); s = await state();
  L.check("D1", "← back to slide 2", s.slide === 1, String(s.slide));
  await page.locator('[data-d105h="back"]').click(); await page.waitForTimeout(450); s = await state();
  L.check("D1", "Back → slide 1", s.slide === 0, String(s.slide));
  /* the trap: twelve Tabs never leave the modal */
  let escaped = 0;
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); if (!(await state()).inModal) escaped++; }
  L.check("D1", "Tab stays inside the modal", escaped === 0, `${escaped} of 12 left it`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(450);
  for (const how of ["esc", "dim", "close", "gotit"] as const) {
    s = await open();
    L.check("D1", `${how}: reopens at slide 1`, s.open && s.slide === 0, String(s.slide));
    if (how === "esc") await page.keyboard.press("Escape");
    else if (how === "dim") await page.mouse.click(40, vp.height / 2);
    else if (how === "close") await page.locator('[data-d105h="close"]').click({ timeout: 5000 }).catch(() => undefined);
    else { for (let i = 0; i < 3; i++) { await page.locator('[data-d105h="next"]').click({ timeout: 5000 }).catch(() => undefined); await page.waitForTimeout(400); } }
    await page.waitForTimeout(450);
    const c = await state();
    L.check("D1", `${how}: closes, focus back on the ⓘ`, !c.open && c.focus === "info", JSON.stringify({ open: c.open, focus: c.focus }));
  }
  L.done(19);
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §7 — THE ACCEPTANCE GATE THAT HAS BEEN MISSING.
 *
 * ⚠️ EVERY ASSERTION HERE IS A MEASUREMENT OF THE DEPLOYED PAGE, not a reading of the source. That
 * is the whole point of the row: "everything above has been unverifiable by the test suite, which
 * is why the same faults survived three passes." A unit lock proves the code was written; only the
 * browser knows what the cascade and the box model did with it.
 *
 * ⚠️ AND IT MEASURES AT THREE WIDTHS, because a law that holds at exactly one width is a
 * coincidence. The motif/close-control intersection is the worked example: it appeared at 1920 and
 * not at 1440, because the identity block wraps at the narrower width and the taller band pushes
 * the vertically-centred motif clear.
 *
 * §7 as corrected: single column at 1440, the two-track relationship at 1920 with the record the
 * wider, and a third width measured rather than assumed.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "reports/card-conformance");
const WIDTHS = [1440, 1920, 2560] as const;

/**
 * ⚠️ THE BUCKET IS FOUND BY THE ROW'S OWN KIND TAG, not by an index into the list. An index is a
 * fact about today's data; the tag is what the row says it is, and `cardBucket` is what put it
 * there. A row order that changes overnight would silently repoint every assertion at another card.
 */
const BUCKETS = ["decide", "send", "chase", "close", "fix", "note"] as const;
type Bucket = (typeof BUCKETS)[number];
const TAG: Record<Bucket, string> = {
  decide: "Decide", send: "Send", chase: "Chase", close: "Close", fix: "Fix", note: "Note",
};

interface Reading {
  found: boolean;
  paneW: number;
  tracks: string;
  trackPx: number[];
  recordWider: boolean | null;
  singleColumn: boolean;
  motif: { x: number; right: number } | null;
  close: { x: number; right: number } | null;
  motifIntersectsClose: boolean | null;
  bandFact: { k: string; v: string } | null;
  stats: { k: string; v: string }[];
  bandRepeatsStat: boolean;
  timelineEntries: number;
  rings: number;
  ringClasses: string[];
  trackingLabel: boolean;
  holdersSection: boolean;
  holdersRows: number;
  holdersEmptyLine: string | null;
  subject: string;
}

async function readCard(page: import("@playwright/test").Page): Promise<Reading> {
  return page.evaluate(() => {
    const vis = (el: Element) => el.getBoundingClientRect().height > 0;
    const one = <T extends HTMLElement>(sel: string): T | null =>
      ([...document.querySelectorAll(sel)].find(vis) as T | undefined) ?? null;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const txt = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

    const pane = one(".tdk-w");
    if (!pane) {
      return { found: false } as unknown as Reading;
    }
    const body = one(".tdk-body")!;
    const tracks = getComputedStyle(body).gridTemplateColumns;
    const trackPx = tracks.split(/\s+/).map((t) => parseFloat(t)).filter((n) => Number.isFinite(n));

    const motifEl = one(".tdk-motif");
    const closeEl = one(".tdk-x");
    const box = (el: HTMLElement | null) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: r1(b.x), right: r1(b.right) };
    };
    const m = box(motifEl);
    const c = box(closeEl);

    const factEl = one(".tdk-fact");
    const bandFact = factEl
      ? { k: txt(factEl.querySelector(".k")), v: txt(factEl.querySelector(".v")) }
      : null;

    /* ⚠️ THE STAT'S FIGURE IS READ WITHOUT ITS UNIT SPAN, so "6" and "6 weeks" compare as the same
       figure — the §5 law is about the FIGURE appearing twice, and a unit suffix would let a
       duplicate slip past a naive string compare. */
    const stats = [...document.querySelectorAll(".tdk-tstat")].filter(vis).map((s) => {
      const big = s.querySelector(".big");
      const clone = big?.cloneNode(true) as HTMLElement | undefined;
      clone?.querySelector(".u")?.remove();
      return { k: txt(s.querySelector(".k")), v: (clone?.textContent ?? "").trim() };
    });

    const entries = [...document.querySelectorAll(".tdk-tl li")].filter(vis);
    const rings = [...document.querySelectorAll(".tdk-tlm")].filter(vis);

    const holds = [...document.querySelectorAll(".tdk-hold")].filter(vis);
    const holdNone = one(".tdk-holdnone");
    const holdHead = [...document.querySelectorAll(".tdk-fk")]
      .filter(vis).some((h) => txt(h) === "Who else holds material");

    return {
      found: true,
      paneW: r1(pane.getBoundingClientRect().width),
      tracks,
      trackPx,
      recordWider: trackPx.length === 2 ? trackPx[0] > trackPx[1] : null,
      singleColumn: trackPx.length === 1,
      motif: m,
      close: c,
      /* boxes INTERSECT when the motif's right edge is past the control's left edge */
      motifIntersectsClose: m && c ? m.right > c.x : null,
      bandFact,
      stats,
      bandRepeatsStat: !!bandFact && stats.some((s) => s.v === bandFact.v),
      timelineEntries: entries.length,
      rings: rings.length,
      ringClasses: entries.map((e) => e.getAttribute("class") ?? "—"),
      trackingLabel: [...document.querySelectorAll(".tdk-storyk")].filter(vis).length > 0,
      holdersSection: holdHead,
      holdersRows: holds.length,
      holdersEmptyLine: holdNone ? txt(holdNone) : null,
      subject: txt(one(".tdk-name")),
    } as Reading;
  });
}

/**
 * Click the first rail row whose kind tag names this bucket.
 *
 * ⚠️ IT VERIFIES THAT THE CARD ACTUALLY DOCKED, AND THE FIRST RUN OF THIS PASS PROVES WHY.
 * `openDock` REFUSES an undockable key rather than substituting one — so clicking a housekeeping
 * Fix row left the PREVIOUS card in the pane, and the pass measured `close`'s card twice, once
 * under the name `fix`. Every assertion passed. That is precisely the harness failure this whole
 * tool exists to end: confident numbers about something the page is not showing.
 *
 * The tell is the `sel` class: the rail marks the row it docked, so a row that does not take it
 * was refused. Reported as uncovered rather than measured as though it were there.
 */
type DockResult = "docked" | "refused" | "absent";

async function dock(page: import("@playwright/test").Page, tag: string): Promise<DockResult> {
  const row = page.locator(".tdg-row").filter({ hasText: new RegExp(`^${tag}`) }).first();
  if ((await row.count()) === 0) return "absent";
  await row.click();
  await page.waitForTimeout(400);
  const cls = (await row.getAttribute("class")) ?? "";
  return /(^|\s)sel(\s|$)/.test(cls) ? "docked" : "refused";
}

test("§7 — the card, one of each bucket, at three widths", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const uncovered: string[] = [];
  const log: string[] = [];

  for (const width of WIDTHS) {
    await openRoute(page, "/todo", { width, height: 900 });
    const bar = await scrollbarWidth(page);
    log.push(`\n═══════════ ${width} × 900 ═══════════   scrollbar ${bar}px ${bar === 0 ? "(OVERLAY — this browser cannot produce a classic bar; see measure.ts)" : "(classic)"}`);

    for (const b of BUCKETS) {
      const opened = await dock(page, TAG[b]);
      if (opened !== "docked") {
        const why = opened === "absent"
          ? "NO CARD ON DEV"
          : "A CARD EXISTS BUT THE PANE REFUSED IT — the row did not take `sel`, so `openDock` "
            + "declined the key and the PREVIOUS card stayed on screen. Measuring here would "
            + "report another bucket's card under this name.";
        if (width === WIDTHS[0]) uncovered.push(`${b} (${opened})`);
        log.push(`  ${b.padEnd(7)} — ${why}`);
        continue;
      }
      const r = await readCard(page);
      expect(r.found, `${b} @ ${width}: the card did not render`).toBe(true);

      await page.locator(".tdk-w").first()
        .screenshot({ path: resolve(SHOTS, `${b}-${width}.png`) })
        .catch(() => { /* a card shorter than the clip is still a screenshot worth having */ });

      /* ── the two tracks ─────────────────────────────────────────────────────────────────── */
      if (width === 1440) {
        expect(r.singleColumn, `${b} @1440: expected a single column, got "${r.tracks}"`).toBe(true);
      } else {
        expect(r.trackPx.length, `${b} @${width}: expected two tracks, got "${r.tracks}"`).toBe(2);
        expect(r.recordWider, `${b} @${width}: the record is NOT the wider column ("${r.tracks}")`).toBe(true);
      }

      /* ── §2.5 the motif clears the close control ────────────────────────────────────────── */
      if (r.motif && r.close) {
        expect(r.motifIntersectsClose,
          `${b} @${width}: motif right ${r.motif.right} is past the close control's left ${r.close.x}`).toBe(false);
      }

      /* ── §5 no figure twice ─────────────────────────────────────────────────────────────── */
      expect(r.bandRepeatsStat,
        `${b} @${width}: the band fact "${r.bandFact?.k} / ${r.bandFact?.v}" repeats a stat figure`).toBe(false);

      /* ── §3.5 a ring per entry ──────────────────────────────────────────────────────────── */
      expect(r.rings, `${b} @${width}: ${r.timelineEntries} entries but ${r.rings} rings`).toBe(r.timelineEntries);

      /* ── §3.3 no Tracking on a note ─────────────────────────────────────────────────────── */
      if (b === "note") {
        expect(r.trackingLabel, `note @${width}: a Tracking section rendered`).toBe(false);
      }

      /* ── §4.4 decide states the holders OR states its emptiness — never nothing ─────────── */
      if (b === "decide") {
        expect(r.holdersSection, `decide @${width}: no "Who else holds material" heading`).toBe(true);
        expect(r.holdersRows > 0 || !!r.holdersEmptyLine,
          `decide @${width}: the section rendered neither agents nor its own empty line`).toBe(true);
      }

      /* ── §2.6 which buckets carry a band fact ───────────────────────────────────────────── */
      if (b === "send" || b === "chase") {
        expect(r.bandFact, `${b} @${width}: §2.6 requires a forward-looking band fact`).not.toBeNull();
      }
      if (b === "close" || b === "fix" || b === "note") {
        expect(r.bandFact, `${b} @${width}: §2.6 says this bucket carries no band fact`).toBeNull();
      }

      log.push(
        `  ${b.padEnd(7)} pane ${String(r.paneW).padStart(7)}  tracks ${r.tracks.padEnd(18)}` +
        `  record-wider ${String(r.recordWider)}\n` +
        `          subject "${r.subject}"\n` +
        `          motif ${r.motif ? `${r.motif.x}→${r.motif.right}` : "—"}  close ${r.close ? `${r.close.x}→${r.close.right}` : "—"}` +
        `  intersects ${String(r.motifIntersectsClose)}\n` +
        `          band ${r.bandFact ? `"${r.bandFact.k} / ${r.bandFact.v}"` : "(none)"}` +
        `   stats ${r.stats.map((s) => `"${s.k} / ${s.v}"`).join("  ") || "(none)"}\n` +
        `          timeline ${r.timelineEntries} entries · ${r.rings} rings [${r.ringClasses.join(", ")}]` +
        `   Tracking ${r.trackingLabel}` +
        (b === "decide" ? `\n          holders ${r.holdersRows} rows · empty-line ${r.holdersEmptyLine ? `"${r.holdersEmptyLine}"` : "none"}` : ""),
      );
    }
  }

  console.log(log.join("\n"));
  console.log(`\nBUCKETS WITH NO CARD ON DEV: ${uncovered.length ? uncovered.join(", ") : "none"}`);
  console.log(`Screenshots → reports/card-conformance/`);
});

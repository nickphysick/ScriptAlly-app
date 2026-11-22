/**
 * Query Centre v157 Phase 5 — gone quiet on the grid card: which cards are quiet (the page's own test), the Next box's
 * words and line, the chip that opens the card, and the marks (band, dots, z's). Rendered values: tests/e2e/qc157.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryStatus } from "../../../types";
import type { RowAct } from "../../../lib/qc1512";
import { rowAct } from "../../../lib/qc1512";
import { QUIET_CHIP, QUIET_LABEL, QUIET_VALUE, chipPress, isQuietCard, nextBox154, quietLine } from "../../../lib/qc154";
import { card154, row154 } from "./qc154.fixture";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime();
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** a stamped quiet row (the page stamps `qs`); `nudgedAt` puts a sent nudge after the latest send */
const quiet = (status = QueryStatus.QUERIED, nudgedAt?: number, extra: Record<string, unknown> = {}) => row154(status, "agent", {
  qs: "quiet", expectedMs: NOW - 70 * DAY, sentMs: NOW - 120 * DAY, closeLeads: true, nudged: nudgedAt != null,
  query: { id: "q1", dateSent: iso(NOW - 120 * DAY), ...(nudgedAt != null ? { lastNudgeSentDate: iso(nudgedAt) } : {}) }, ...extra,
});
const css = readFileSync(resolve(__dirname, "qcv157.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("v157 · which cards are quiet", () => {
  it("the stamped state where there is one; offers, closed and waiting cards never", () => {
    expect(isQuietCard(quiet(), NOW)).toBe(true);
    expect(isQuietCard(row154(QueryStatus.QUERIED, "agent", { qs: "agent" }), NOW)).toBe(false);
    expect(isQuietCard(row154(QueryStatus.OFFER, "offer", { qs: "offer" }), NOW)).toBe(false);
    expect(isQuietCard(row154(QueryStatus.REJECTED, "closed", { qs: "closed" }), NOW)).toBe(false);
  });
  it("an unstamped row falls back to the old four-set rule rowAct also uses (whereItStands)", () => {
    const old = row154(QueryStatus.QUERIED, "agent", { expectedMs: NOW - 200 * DAY, stageStartMs: NOW - 260 * DAY });
    expect(isQuietCard(old, NOW)).toBe(true);
    expect(isQuietCard(row154(QueryStatus.OFFER, "offer", { expectedMs: NOW - 200 * DAY }), NOW)).toBe(false);
  });
});

describe("v157 · the quiet Next box (QC157-9's source half)", () => {
  it("Gone quiet · Nudge or close; no bar", () => {
    expect([QUIET_LABEL, QUIET_VALUE, QUIET_CHIP]).toEqual(["Gone quiet", "Nudge or close", "Nudge or close"]);
    const h = card154(quiet());
    const nx = h.match(/<div class="qc154-f qc154-nx[^"]*"[^>]*data-k="next"[\s\S]*?<button/)?.[0] ?? "";
    expect(nx).toContain('<span class="qc154-fl">Gone quiet</span>');
    expect(nx).toContain("<b>Nudge or close</b>");
    expect(nx).not.toContain("qc154-bar");
  });
  it("nudged since the last send: “nudged {the nudge's date}”; otherwise “since {the reply date}”; neither: no line", () => {
    expect(quietLine(quiet(QueryStatus.QUERIED, NOW - 40 * DAY), NOW)).toBe("nudged 29 Sep");
    expect(quietLine(quiet(), NOW)).toBe("since 30 Aug");
    expect(quietLine(quiet(QueryStatus.QUERIED, undefined, { expectedMs: null }), NOW)).toBeNull();
    /* a nudge from before the latest send is no nudge this stage: the reply date is used */
    expect(quietLine(quiet(QueryStatus.FULL_SENT, NOW - 100 * DAY, { sentMs: NOW - 90 * DAY }), NOW)).toBe("since 30 Aug");
    expect(nextBox154(quiet(QueryStatus.QUERIED, NOW - 40 * DAY), NOW)).toEqual({ kind: "quiet", line: "nudged 29 Sep" });
  });
  it("the box is hot, so it takes the navy outline (is-hot)", () => {
    expect(card154(quiet())).toMatch(/class="qc154-f qc154-nx is-hot"[^>]*data-k="next"/);
  });
});

describe("v157 · the quiet chip (QC157-10's source half)", () => {
  it("one press opens the card and runs no journey, whatever rowAct says; other cards keep their act", () => {
    const act = rowAct(quiet(), NOW);
    expect(act?.label).toMatch(/Nudge|Close it/);
    expect(chipPress(true, act)).toEqual({ kind: "open" });
    const send: RowAct = { tone: "navy", label: "Send your partial", mode: "sent" };
    expect(chipPress(false, send)).toEqual({ kind: "act", mode: "sent" });
    expect(chipPress(false, null)).toEqual({ kind: "open" });
  });
  it("the chip is named and titled “Nudge or close”, mode open", () => {
    const h = card154(quiet(), rowAct(quiet(), NOW));
    const chip = h.match(/<button[^>]*class="qc1561-chip"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(chip).toContain('aria-label="Nudge or close"');
    expect(chip).toContain('data-mode="open"');
    expect(chip).toContain('<span class="qc1561-tip" aria-hidden="true">Nudge or close</span>');
  });
  it("the component hands the press to chipPress, never straight to onAct", () => {
    const src = readFileSync(resolve(__dirname, "QcCard154.tsx"), "utf8");
    expect(src).toContain("const press = chipPress(quiet, cta);");
    expect(src).toContain('if (press.kind === "act") onAct(r.id, press.mode); else open();');
  });
});

describe("v157 · the quiet marks", () => {
  it("data-quiet on quiet cards only; the z's (three, aria-hidden) on quiet cards only, on the card itself", () => {
    const q = card154(quiet());
    expect(q).toMatch(/data-qc154="card"[^>]*data-quiet=""/);
    expect(q).toContain('<span class="qc157-zz" data-qc157="zz" aria-hidden="true"><b>z</b><b>z</b><b>z</b></span>');
    for (const r of [row154(QueryStatus.QUERIED, "agent", { qs: "agent" }), row154(QueryStatus.OFFER, "offer", { qs: "offer" })]) {
      const h = card154(r);
      expect(h).not.toContain("data-quiet");
      expect(h).not.toContain("qc157-zz");
    }
  });
  it("the badge holds three dots (viewBox 0 0 12 12, cx 2.6 / 6 / 9.4, cy 6, r 1.25) and no arrow", () => {
    const b = card154(quiet()).match(/<b class="qc153-arw[^"]*"[\s\S]*?<\/b>/)?.[0] ?? "";
    expect(b).toContain("qc153-arw--quiet");
    expect(b).toContain('viewBox="0 0 12 12"');
    expect([...b.matchAll(/<circle cx="([\d.]+)" cy="6" r="1.25"/g)].map((m) => m[1])).toEqual(["2.6", "6", "9.4"]);
    expect(b).not.toContain("<path");
    expect(card154(row154(QueryStatus.QUERIED, "agent", { qs: "agent" }))).toMatch(/<b class="qc153-arw qc153-arw--out"[^>]*><svg[^>]*><path/);
  });
  it("the band fades to white; the badge navy, 12px; the link after the current step dotted", () => {
    expect(css).toContain(".qc151.qc153 .qc154-card.qc154-card[data-quiet] .qc154-hd.qc154-hd { background: linear-gradient(90deg, var(--tone) 0, var(--tone) 26%, #fff 82%); }");
    expect(css).toContain(".qc151.qc153 .qc154-card.qc154-card[data-quiet] .qc153-nd--cur .qc153-arw.qc153-arw { background: #2a3a52; color: #fff; }");
    expect(css).toMatch(/\[data-quiet\] \.qc153-trk:not\(\.is-ended\) \.qc153-nd--cur \+ \.qc153-ln\.qc153-ln \{\s*background: repeating-linear-gradient\(90deg, rgba\(28, 19, 15, 0\.5\) 0 2px, transparent 2px 4px\);/);
  });
  it("the z's: placed from the card's corner, 12/15/19px, rising in over 250ms at 0/90/180ms; 6px left on the narrow card", () => {
    expect(css).toMatch(/> \.qc157-zz \{ position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none;/);
    expect(css).toContain("opacity: 0; transform: translate(-3px, 6px); transition: opacity 0.25s ease-out, transform 0.25s ease-out;");
    expect(css).toContain("b:nth-child(1) { left: 44px; top: 9px; font-size: 12px !important; }");
    expect(css).toContain("b:nth-child(2) { left: 54px; top: -3px; font-size: 15px !important; }");
    expect(css).toContain("b:nth-child(3) { left: 67px; top: -18px; font-size: 19px !important; }");
    expect(css).toMatch(/b:nth-child\(2\) \{ opacity: 0\.85; transition-delay: 0\.09s; \}/);
    expect(css).toMatch(/b:nth-child\(3\) \{ opacity: 1; transition-delay: 0\.18s; \}/);
    expect(css).toMatch(/@container \(max-width: 380px\) \{[^@]*nth-child\(1\) \{ left: 38px; \}[^@]*nth-child\(2\) \{ left: 48px; \}[^@]*nth-child\(3\) \{ left: 61px; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.qc151\.qc153 \.qc154-card > \.qc157-zz > b \{ transform: none; transition: none; \}/);
  });
});

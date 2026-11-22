/**
 * Query Centre v154 — the card (design-refs/query-centre-v154.html): no status word on show, but the word is still the
 * card's and the track's accessible name; on hover the Next box becomes the slip's own action, in the slip's words.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import type { RowAct } from "../../../lib/qc1512";
import { card154, row154 } from "./qc154.fixture";

/** the markup with every visually hidden span (and the track's attributes) taken out: what a sighted reader sees */
const visible = (h: string) => h.replace(/<span class="qc154-sr"[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, " ");

describe("the v154 card", () => {
  it("shows no status word, but keeps it for screen readers: the card's name, the track's name and title", () => {
    const h = card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"));
    expect(h).toContain('id="query-row-q1"');
    expect(h).toContain('role="button"');
    expect(h).toContain('aria-label="Tom Ellery, Curtis Vane, Partial requested"');
    const trk = h.match(/<span[^>]*data-qc154="track"[^>]*>/)?.[0] ?? "";
    expect(trk).toContain('aria-label="Where it stands: Partial requested"');
    expect(trk).toContain('title="Partial requested"');
    expect(h).toMatch(/<span class="qc154-sr"[^>]*>Partial requested<\/span>/);
    /* the label under the current node is the hover's, hidden at rest by the sheet; strip it too */
    expect(visible(h.replace(/<span class="qc154-thl"[^>]*>[^<]*<\/span>/g, ""))).not.toContain("Partial requested");
    expect(h).toContain('data-tone="partial"');
    expect(h).toContain("105 days ago");
    expect(h.match(/data-qc154="fact"/g)?.length).toBe(2);
  });

  it("v156.1 §3: the action is a real button — a 32px arrow chip in the Next box — named by the action's label", () => {
    const act: RowAct = { tone: "navy", label: "Send your partial", mode: "sent" };
    const h = card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"), act);
    const chip = h.match(/<button[^>]*class="qc1561-chip"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(chip).toContain('data-qc154="act"');
    expect(chip).toContain('data-mode="sent"');
    expect(chip).toContain('aria-label="Send your partial"');
    expect(chip).not.toContain("tabindex");
    expect(chip).toMatch(/<span class="qc1561-tip" aria-hidden="true">Send your partial<\/span>/);
    /* inside the Next box, which keeps its content: no navy overlay, nothing hidden from assistive tech */
    expect(h).toMatch(/data-k="next"[\s\S]*?class="qc1561-chip"/);
    expect(h).not.toContain("qc154-act");
    expect(h).not.toContain("Send your partial →");
    /* a plain act (Record a response) is the slip's "Open the card" */
    const plain = card154(row154(QueryStatus.QUERIED, "agent"), { tone: "plain", label: "Record a response", mode: "resp" });
    expect(plain).toContain('aria-label="Open the card"');
    expect(plain).toContain('data-mode="open"');
    /* its click runs the action and stops there: the card's own click (the slide-out) does not also run */
    const src = readFileSync(new URL("./QcCard154.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/className="qc1561-chip"[\s\S]*?onClick=\{\(e\) => \{ e\.stopPropagation\(\);/);
    /* the sheet: hidden at rest, risen 4px; shown on hover or focus-within over 150ms; always shown without hover; no
       rise under reduced motion; the Next box never turns navy */
    const css = readFileSync(new URL("./qcv1561.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.qc151 \.qc1561-chip\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(4px\);[^}]*transition:\s*opacity 150ms, transform 150ms/);
    expect(css).toMatch(/\.qc151 \.qc154-card:hover \.qc1561-chip,\s*\.qc151 \.qc154-card:focus-within \.qc1561-chip\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none/);
    expect(css).toMatch(/@media \(hover: none\)\s*\{[^}]*\.qc1561-chip[^{]*\{[^}]*opacity:\s*1/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.qc1561-chip[^{]*\{[^}]*transform:\s*none/);
  });

  it("draws no rust, and text on the partial band is ink (Plumage colours v1)", () => {
    expect(card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"))).not.toMatch(/a2452a|8a3a28|b4553f/i);
    const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
    expect(css).not.toMatch(/a2452a|8a3a28|b4553f/i);
    /* Plumage colours v1 — the band is inline: a Partial requested card is the requested shade; v2: no outline */
    const h = card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"));
    expect(h).toMatch(/style="--tone:#f1d9cf"/);
    expect(h).not.toMatch(/data-wy|--wy/);
    expect(css).toMatch(/\.qc154-nm \{[^}]*color: #1c130f/);
  });
});

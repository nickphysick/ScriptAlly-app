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
    expect(h).toContain('data-tone="rose"');
    expect(h).toContain("105 days ago");
    expect(h.match(/data-qc154="fact"/g)?.length).toBe(2);
  });

  it("on hover the Next box becomes the slip's action, with the slip's label, and nothing else is a button at rest", () => {
    const act: RowAct = { tone: "navy", label: "Send your partial", mode: "sent" };
    const h = card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"), act);
    const nx = h.match(/<div[^>]*data-k="next"[\s\S]*?<\/button><\/span><\/div>/)?.[0] ?? "";
    expect(nx).toContain('data-qc154="act"');
    expect(nx).toContain('data-mode="sent"');
    expect(nx).toContain("Send your partial →");
    /* a plain act (Record a response) is the slip's "Open the card →" */
    const plain = card154(row154(QueryStatus.QUERIED, "agent"), { tone: "plain", label: "Record a response", mode: "resp" });
    expect(plain).toContain("Open the card →");
    expect(plain).not.toContain("Record a response →");
    /* the sheet hides it at rest and shows it on hover or focus-within, except while the track is hovered */
    const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.qc154-act\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.qc154-card:hover \.qc154-act,\s*\.qc154-card:focus-within \.qc154-act\s*\{[^}]*opacity:\s*1/);
    expect(css).toMatch(/\.qc154-card:has\(\.qc154-trkw:hover\) \.qc154-act/);
  });

  it("draws no rust, and the rose band's ink is #5f433d", () => {
    expect(card154(row154(QueryStatus.PARTIAL_REQUESTED, "you"))).not.toMatch(/a2452a|8a3a28|b4553f/i);
    const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
    expect(css).not.toMatch(/a2452a|8a3a28|b4553f/i);
    expect(css).toMatch(/\[data-tone="rose"\][^{]*\{[^}]*#5f433d/);
  });
});

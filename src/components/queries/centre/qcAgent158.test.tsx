/**
 * Query card v158 §3 — the Agent tab's source and render locks (QC158-5, -6, -7's source halves). The measured halves
 * (equal tops and heights, the centred text block, one line at 504px) are tests/e2e/qc158.measure.ts.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentTab158, takesWords, sentenceCase, type AgentTab158Props } from "./QcAgent158";
import { askChips } from "../../../lib/qcThread152";

const NOW = new Date(2026, 10, 18, 12).getTime();
const DAY = 86_400_000;
const base: AgentTab158Props = {
  first: "Fenella", nowMs: NOW, weeks: 8, nrmn: true, how: "By email", queriedVia: "by email", sentMs: NOW - 51 * DAY,
  lastHeardMs: NOW - 29 * DAY, asks: askChips(["Query letter", "Synopsis", "First 5 chapters"], ["Query letter", "Synopsis", "First 5 chapters"]),
  hasAsks: true, wishlist: "Big-hearted YA thrillers.", email: "fenella@brightwater.example", website: "", websiteHref: null,
  onCopyEmail: () => {}, onField: () => {}, onEdit: () => {}, dbl: () => ({}),
};
const html = (p: Partial<AgentTab158Props> = {}) => renderToStaticMarkup(<AgentTab158 {...base} {...p} />);
const css = readFileSync("src/components/queries/centre/qcv158.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("QC158-5 (source) three fact boxes", () => {
  it("three boxes in order: Replies in, Takes queries, Last heard, each label, value and line", () => {
    const h = html();
    expect((h.match(/data-qc158="box"/g) ?? []).length).toBe(3);
    expect(h.indexOf("Replies in")).toBeLessThan(h.indexOf("Takes queries"));
    expect(h.indexOf("Takes queries")).toBeLessThan(h.indexOf("Last heard"));
    expect(h).toContain(">About 8 weeks<");
    expect(h).toContain("no reply means no");
    expect(h).toContain(">By email<");
    expect(h).toContain("you queried by email");
    expect(h).toContain("29 days ago");
    expect(html({ nrmn: false })).toContain("always replies");
    /* v167 — "Not yet" is smaller, italic, grey (its own class); "since {sent date}" beneath as built */
    expect(html({ lastHeardMs: null })).toMatch(/class="qc167-notyet">Not yet<\/b><i data-qc167="sub">since 28 Sept?<\/i>/);
  });
  /* v167 §A re-points this lock: an unrecorded value is a ghost bar with its "+ Add …" words over it (the box itself is
     the way in), never a link, a sentence or a dash */
  it("an unrecorded value is a ghost bar with its words over it, never a dash", () => {
    const h = html({ weeks: null, how: null });
    expect(h).toMatch(/data-k="reply" data-ghost=""[^]*?data-qc167="bar"[^]*?>\+ Add reply time<\/span>/);
    expect(h).toMatch(/data-k="method" data-ghost=""[^]*?data-qc167="bar"[^]*?>\+ Add how<\/span>/);
    expect(h).not.toMatch(/>—</);
  });
  it("the boxes centre their contents top to bottom, and are the grid card's boxes", () => {
    expect(css).toMatch(/\.qc152 \.nx-box \{ display: flex; flex-direction: column; justify-content: center; gap: 3px; min-height: 84px; padding: 10px 12px; border-radius: 10px; background: #fbf9f5; box-shadow: inset 0 0 0 1px #efe9df;/);
    expect(css).toMatch(/\.qc152 \.nx-boxes \{ display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 8px; \}/);
  });
  it("the agent is never a pronoun: the submission form is said plainly", () => {
    expect(takesWords("Through their submission form")).toBe("By online form");
    const h = html({ how: "Through their submission form", queriedVia: "by online form" }).replace(/<[^>]+>/g, " ");
    expect(h).not.toMatch(/\b(he|she|they|them|their|his|her)\b/i);
  });
});

describe("QC158-6 (source) what the agent asks for", () => {
  it("a sent item has the ticked disc and 'sent with your query'; an unsent one the empty ring and 'not sent'; the line matches", () => {
    const h = html({ asks: askChips(["Query letter", "Synopsis", "First 5 chapters"], ["Query letter"]) });
    const rows = h.match(/<li data-qc158="ask"[^]*?<\/li>/g) ?? [];
    expect(rows.length).toBe(3);
    expect(rows[0]).toMatch(/data-sent=""[^]*class="nx-tick"[^]*sent with your query/);
    expect(rows[1]).toMatch(/class="nx-tick no"[^]*>not sent</);
    expect(h).toContain("You didn’t send synopsis, first 5 chapters.");
    expect(html()).toContain("You sent everything Fenella asks for.");
    /* v167 §A — nothing recorded: three ghost rows and the words over them, no sentence */
    const none = html({ hasAsks: false, asks: { chips: [], missing: [] } });
    expect(none).not.toContain("Nothing saved yet");
    expect((none.match(/data-qc167="bar"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(none).toContain(">+ Add what Fenella asks for<");
  });
  it("items read in sentence case", () => {
    expect(sentenceCase("FIRST 5 CHAPTERS")).toBe("First 5 chapters");
  });
});

describe("QC158-7 (source) the contact row never wraps", () => {
  it("Copy email with the address cut by an ellipsis, then the website or + Add a website, on one line", () => {
    expect(css).toMatch(/\.qc152 \.nx-reach \{ display: flex; flex-wrap: nowrap;/);
    expect(css).toMatch(/\.qc152 \.nx-btn small \{[^}]*overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/);
    expect(css).toMatch(/\.qc152 \.nx-reach \.nx-btn:first-child \{ flex: 0 1 auto; min-width: 0; \}/);
    const h = html();
    expect(h).toMatch(/data-qc158="copy-email"[^>]*>[^]*Copy email<small data-qc158="address">fenella@brightwater\.example<\/small>/);
    expect(h).toContain(">+ Add a website</button>");
  });
  it("wishlist as a quote, and the two links", () => {
    const h = html();
    expect(h).toContain('<p class="nx-quote" data-qc152="wishlist">Big-hearted YA thrillers.</p>');
    expect(h).toContain("in Fenella’s words");
    expect(h).toContain(">Open Fenella’s full card</button>");
    expect(h).toContain(">Edit these details</button>");
    expect(html({ wishlist: "" })).toMatch(/Nothing saved yet\. <button[^>]*>Add Fenella’s wishlist<\/button>/);
  });
  it("the old strip and the definition list are gone from the reading view", () => {
    const card = readFileSync("src/components/queries/centre/QcCard152.tsx", "utf8");
    expect(card).toMatch(/<AgentTab158 /);
    expect(card).not.toMatch(/<div className="qc152-agt" data-qc152="agent-pane">/);
  });
});

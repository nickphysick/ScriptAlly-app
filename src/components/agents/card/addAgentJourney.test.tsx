/**
 * Add agent v1 Phase 3 — the journey's arrival, held at unit level (the rendered walk is AA1–AA9, e2e): the header is
 * Nick's words, nothing is red, sections 2–4 are locked until there is a name or an agency.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AddAgentJourney, firstOf } from "./AddAgentJourney";
import { FLOW_WORDS } from "../../shared/FlowHead";

const noop = () => {};
const html = renderToStaticMarkup(React.createElement(AddAgentJourney, {
  agents: [], personal: [], msGenre: "Thriller", genrePool: [], personalGenres: [], allGenres: ["Thriller", "Crime"], nowMs: Date.UTC(2026, 10, 9),
  onNewGenre: async () => ({ ok: false as const, reason: "" }), onCreate: async () => ({ ok: false as const, error: "" }),
  onLeave: noop, onAnother: noop, onOpenDup: noop, renderPreview: () => null,
}));

describe("Adding new agent — on arrival", () => {
  it("is headed with the flow's own words", () => {
    expect(html).toContain(FLOW_WORDS.agent.title);
    expect(html).toContain("Who are you adding?");
  });
  it("shows no red and no aria-invalid", () => {
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toMatch(/class="[^"]*\bbad\b/);
    expect(html).toContain("Add their name and agency to start.");
  });
  it("locks sections 2–4 until there is a name or an agency", () => {
    expect((html.match(/class="aaj-row" data-go="(want|query|reach)" aria-disabled="true"/g) ?? []).length).toBe(3);
  });
  it("starts in the UK and asks nothing else", () => {
    expect(html).toMatch(/data-country="GB"[^>]*|aria-checked="true"[^>]*data-country="GB"/);
    expect(html).toContain("Not rated yet");
  });
  it("names the agent by first name, capitalised, or the agency", () => {
    expect(firstOf("sarah jones", "")).toBe("Sarah");
    expect(firstOf("", "Fenwick & Rowe")).toBe("Fenwick & Rowe");
    expect(firstOf("", "")).toBe("them");
  });
});

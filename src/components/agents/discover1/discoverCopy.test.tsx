/**
 * Discover v1 — lock L1, the copy sweep. Over every state's RENDERED page (live, done and none through the dev review
 * aid's fixture, and coming soon) and over the overlays' own strings in source (the drawer, the modals and the toast
 * render through portals a static render never opens):
 *   · no "Draft a query" — QueryHawk never writes for the writer (decision 4);
 *   · no rank or verdict word — a pick is a fact (decision 5);
 *   · UK spelling;
 *   · no agent is given a gendered pronoun.
 * ⚠️ SOURCE IS READ WITH COMMENTS STRIPPED, so a note explaining why a word is banned does not trip the ban.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPage, renderPageSeeded, noNavigate } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { DiscoverPage } from "./DiscoverPage";

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const SOURCES = ["DiscoverPage.tsx", "DvHeader.tsx", "DvPicks.tsx", "DvLayers.tsx", "DvShare.tsx"].map((f) => strip(readFileSync(resolve(__dirname, f), "utf8")));
const SCOUT = strip(readFileSync(resolve(__dirname, "../../../lib/scout.ts"), "utf8"));

function render(state: "live" | "done" | "none" | null): string {
  const g = globalThis as unknown as { window?: Record<string, unknown> };
  const had = "window" in g;
  const before = g.window;
  if (state) g.window = { ...(before ?? {}), __SA_DV_STATE: state };
  try { return renderPageSeeded(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover"); }
  finally { if (state) { if (had) g.window = before; else delete g.window; } }
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const PAGES = { live: text(render("live")), done: text(render("done")), none: text(render("none")), soon: text(renderPage(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover")) };
/** the words a reader could see: string literals and JSX text, never identifiers (`p.score` is code, not copy) */
const words = (src: string) => [
  ...[...src.matchAll(/"([^"\\\n]{3,})"/g)].map((m) => m[1]),
  ...[...src.matchAll(/`([^`]{3,})`/g)].map((m) => m[1]),
  ...[...src.matchAll(/>([^<>{}\n]{3,})</g)].map((m) => m[1]),
].filter((w) => !/^[\w./@-]+$/.test(w.trim()) || /\s/.test(w)).join("\n");
const ALL = [...Object.values(PAGES), ...SOURCES.map(words), words(SCOUT)].join("\n");

const VERDICT = [/\bperfect (?:match|fit)\b/i, /\bideal\b/i, /\bguarantee/i, /\btop pick/i, /#1\b/, /\bbest agent/i, /\bwinner\b/i, /\byou should\b/i, /\brecommended\b/i, /\bmust[- ]query\b/i, /\bscore\b/i, /\branked (?:first|second|#)/i, /\bmatch score\b/i];
const US = [/\bcolor/i, /\bcatalog\b/i, /\bfavorite/i, /\borganiz/i, /\bcenter\b/i, /\bbehavior/i, /\banalyz/i, /\bprioritiz/i, /\bcustomiz/i, /\bcanceled\b/i];

describe("L1 · the copy sweep", () => {
  it("every state rendered, and each carries its own words (the sweep is not over an empty page)", () => {
    expect(PAGES.live).toContain("agents to consider");
    expect(PAGES.done).toContain("You’re up to date");
    expect(PAGES.none).toContain("Nothing to consider yet");
    expect(PAGES.soon).toContain("out looking");
  });
  it("no “Draft a query” anywhere", () => {
    expect(ALL).not.toMatch(/draft a query/i);
  });
  it("no rank or verdict word", () => {
    for (const re of VERDICT) expect(ALL, String(re)).not.toMatch(re);
  });
  it("UK spelling", () => {
    for (const re of US) expect(ALL, String(re)).not.toMatch(re);
  });
  it("no gendered pronoun in what a writer reads", () => {
    for (const [k, t] of Object.entries(PAGES)) expect(t, k).not.toMatch(/\b(he|him|his|she|her|hers)\b/i);
  });
  it("the community figures are facts: the sentence is a count, never a ranking", () => {
    expect(PAGES.live).toMatch(/On \d+ writers’ contact lists here/);
  });
});

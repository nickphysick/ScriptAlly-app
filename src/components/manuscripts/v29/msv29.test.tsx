/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v29 — the unit locks beside the page (design-refs/manuscripts-v29/manuscripts-v29.html). Source and
 * markup only (this repo's Vitest runs in node, no DOM): the rendered page's geometry, focus, clipboard and the
 * save → Undo round trip are tests/e2e/manuscriptsV29.measure.ts.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderPageSeededWith, noNavigate, setActiveManuscript } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ManuscriptPage } from "../v12/ManuscriptPage";
import { writeClipboard } from "./Msv29Parts";
import {
  pitchSub, queryFoot, sinceShown, unquoted, splitLastWord, countWords, inverseOf, pitchChanged, writtenCount,
} from "../../../lib/manuscriptV29";
import { ManuscriptStatus, QueryStatus } from "../../../types";
import type { Manuscript } from "../../../types";

afterEach(() => { setActiveManuscript(null); vi.unstubAllGlobals(); });
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").trim();

const SYN = "On the morning of his father’s funeral, MURPHY (41) takes the urn from the undertaker’s and drives for the Dublin ferry. His father asked, once and only to him, to be scattered off the Welsh coast where he worked as a young man. The family plot in Kildare has been paid for; his sister ORLA (44) has organised everything, and nobody else believes the request was ever made.\n\nMurphy misses the first sailing after his car is clamped. Stuck in the port, he meets DES, a retired lorry driver who knew his father under a different name.";
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const FULL = (over: Partial<Manuscript> = {}): Manuscript => ({
  id: "m1", userId: "smoke-user", title: "Murphy’s Day Out", genre: "Literary mystery", subGenres: ["Book club", "Crime"],
  ageCategory: "Adult", wordCount: 84000, status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-03-10T00:00:00.000Z",
  logline: "Murphy has twelve hours to get his father’s ashes across the Irish Sea before his sister finds out he took them.",
  elevatorPitch: "It’s a road trip with an urn.", synopsis: SYN, createdDate: "2026-01-01T00:00:00.000Z",
  ...over,
} as Manuscript);
const NEW = (): Manuscript => ({
  id: "m1", userId: "smoke-user", title: "Murphy’s Day Out", genre: "Literary mystery", subGenres: [], ageCategory: "Adult",
  wordCount: 0, status: ManuscriptStatus.DRAFTING, createdDate: "2026-01-01T00:00:00.000Z",
} as unknown as Manuscript);
const Q = (n: number, first = "2026-03-10T09:00:00.000Z") => Array.from({ length: n }, (_, i) => ({
  id: `q${i}`, userId: "smoke-user", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
  dateSent: i === 0 ? first : "2026-04-01T00:00:00.000Z", personalisationNotes: "", materialsWanted: [],
}));
const render = (ms: Manuscript, queries: unknown[] = []) => {
  setActiveManuscript("m1");
  return renderPageSeededWith(<ManuscriptPage onNavigate={noNavigate} />, "/manuscripts", { manuscripts: [ms], queries });
};
const part = (html: string, probe: string) => {
  const i = html.indexOf(`data-ms29="${probe}"`);
  expect(i, `${probe} is on the page`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", i));
};

/* ══ the rules ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

describe("R — the pure rules", () => {
  it("R1 the pitch band's three sub-lines", () => {
    expect(pitchSub(3)).toBe("Your book in one line, in thirty seconds and in full.");
    expect(pitchSub(1)).toBe("1 of 3 written.");
    expect(pitchSub(2)).toBe("2 of 3 written.");
    expect(pitchSub(0)).toBe("Three ways of telling people what your book is. Add them when you’re ready.");
    expect(writtenCount(FULL({ elevatorPitch: "  " }))).toBe(2);
  });
  it("R2 the queries foot: many, one, none", () => {
    expect(queryFoot(14)).toEqual({ n: 14, text: "queries sent for this book", link: "See them" });
    expect(queryFoot(1)).toEqual({ n: 1, text: "query sent for this book", link: "See them" });
    expect(queryFoot(0)).toEqual({ n: null, text: "No queries sent for this book yet.", link: "Log a query" });
  });
  it("R3 since only when Querying and a date exists", () => {
    expect(sinceShown(FULL(), "2026-03-10T09:00:00Z")).toBe("10 Mar 2026");
    expect(sinceShown(FULL(), "2026-03-10T09:00:00Z", true)).toBe("10 March 2026");
    expect(sinceShown(FULL(), null)).toBeNull();
    expect(sinceShown(FULL({ status: ManuscriptStatus.SHELVED }), "2024-02-01")).toBeNull();
    expect(sinceShown(FULL({ shelved: true } as Partial<Manuscript>), "2024-02-01")).toBeNull();
    expect(sinceShown(FULL({ status: ManuscriptStatus.DRAFTING }), "2024-02-01")).toBeNull();
  });
  it("R4 the logline's own quote marks are dropped from the display only; the last word carries the mark", () => {
    expect(unquoted("“Already quoted.”")).toBe("Already quoted.");
    expect(unquoted("\"Straight quotes\"")).toBe("Straight quotes");
    expect(unquoted("Murphy’s day.")).toBe("Murphy’s day.");
    expect(unquoted("“”")).toBe("“”");
    expect(splitLastWord("  A ferry skipper races the tide. ")).toEqual({ head: "A ferry skipper races the ", last: "tide." });
    expect(countWords(" a  b\n\nc ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
  it("R5 the inverse puts back exactly what the save changed — deleteField() for a field that was absent", () => {
    const before = FULL({ elevatorPitch: undefined });
    delete (before as unknown as Record<string, unknown>).elevatorPitch;
    const inv = inverseOf(before, {
      title: before.title, genre: before.genre, subGenres: ["Book club", "Crime"], ageCategory: "Adult", wordCount: 90000,
      logline: before.logline, status: ManuscriptStatus.REVISING, elevatorPitch: "Now written.",
    });
    expect(Object.keys(inv).sort()).toEqual(["elevatorPitch", "status", "statusChangedDate", "wordCount"]);
    expect(inv.wordCount).toBe(84000);
    expect(inv.status).toBe(ManuscriptStatus.QUERYING);
    expect(inv.statusChangedDate).toBe("2026-03-10T00:00:00.000Z");
    expect((inv.elevatorPitch as { isEqual?: unknown }).isEqual).toBeTypeOf("function");
    expect(inverseOf(before, { title: before.title, wordCount: 84000 })).toEqual({});
    /* a key the rules require is never deleted (legacy data without one): the Undo would be denied whole */
    const legacy = { ...before } as unknown as Record<string, unknown>;
    delete legacy.logline;
    expect(inverseOf(legacy as unknown as Manuscript, { logline: "", wordCount: 90000 })).toEqual({ wordCount: 84000 });
    expect(pitchChanged(before, { logline: before.logline, elevatorPitch: "Now written." })).toEqual(["elevatorPitch"]);
  });
  it("R6 Copy writes the stored text verbatim; a refused write reports false", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await writeClipboard("“Mine.”")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("“Mine.”");
    vi.stubGlobal("navigator", { clipboard: { writeText: async () => { throw new Error("denied"); } } });
    expect(await writeClipboard("x")).toBe(false);
    vi.stubGlobal("navigator", {});
    expect(await writeClipboard("x")).toBe(false);
  });
});

/* ══ Everyday ════════════════════════════════════════════════════════════════════════════════════════════════════ */

describe("Everyday — all three written, a long synopsis, further genres, Querying since 10 Mar, 14 queries", () => {
  const html = render(FULL(), Q(14));
  it("A1 the header has ONE button, Edit details, with the pen; Edit and View summary are gone", () => {
    const hd = html.slice(html.indexOf('data-wsnh="header"'), html.indexOf('data-ms29="desk"'));
    const btns = [...hd.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => text(m[1]));
    expect(btns).toEqual(["Edit details"]);
    expect(hd).toMatch(/data-ms29="edit-details"[^>]*><svg/);
    expect(text(html)).not.toMatch(/View summary/);
    expect(html).not.toContain('data-ms27="full"');
  });
  it("A2 the vitals: 84,000 words, the genre, the age, Querying since 10 Mar 2026", () => {
    const v = part(html, "vitals");
    expect(text(v.slice(0, v.indexOf("</div></div>") + 12))).toBe("84,000 words Literary mystery Adult Querying since 10 Mar 2026");
  });
  it("B1 the pitch: the band, three written rows, each with Copy and Edit", () => {
    expect(text(part(html, "band-sub").slice(0, 200))).toMatch(/^Your book in one line, in thirty seconds and in full\./);
    expect(html.match(/data-ms29="copy"/g)?.length).toBe(3);
    expect(html.match(/data-ms29="edit" /g)?.length).toBe(3);
    expect(html).not.toContain('data-ms29="add"');
    for (const h of ["logline", "elevator pitch", "synopsis"]) expect(html).toContain(`aria-label="Copy the ${h}"`);
  });
  it("B2 the logline sits in one pair of curly quotes, the closing mark bound to the last word", () => {
    expect(html).toMatch(/<p class="ms29-q" data-ms29="text">“Murphy has [^<]*<span class="ms29-qend">them\.”<\/span><\/p>/);
  });
  it("B3 the synopsis clamps above 90 words: Read it all, aria-expanded false, the word count", () => {
    expect(html).toMatch(/<p class="ms29-cl" id="ms29-syn"/);
    expect(html).toMatch(/data-ms29="more" aria-expanded="false" aria-controls="ms29-syn">Read it all</);
    expect(html).toContain(`>${countWords(SYN)} words<`);
  });
  it("C1 Details: five rows, each a button with its aria-label; since 10 March 2026; also fits", () => {
    const rows = [...html.matchAll(/data-ms29="dt-row" data-k="(\w+)" aria-label="([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&#x27;/g, "'")]);
    expect(rows).toEqual([
      ["status", "Where it stands: Querying. Edit"], ["genre", "Genre: Literary mystery. Edit"], ["age", "Age category: Adult. Edit"],
      ["words", "Word count: 84,000. Edit"], ["series", "Series: Standalone. Edit"],
    ]);
    expect(html).toContain("<small>since 10 March 2026</small>");
    expect(html).toContain("<small>also fits Book club, Crime</small>");
  });
  it("C2 the foot: 14 queries sent for this book · See them", () => {
    expect(text(part(html, "foot").slice(0, 400))).toMatch(/^14 queries sent for this book See them/);
  });
  it("D1 your manuscripts: the active book, then the coming-soon tile — no button, no tabindex, labelled", () => {
    expect(text(part(html, "active").slice(0, 400))).toMatch(/^Murphy’s Day Out Literary mystery Active/);
    const nx = part(html, "next");
    const tile = nx.slice(0, nx.indexOf("</div></div>") + 12);
    expect(tile).toMatch(/^<div class="ms29-nx" data-ms29="next" role="group" aria-label="Add a manuscript, coming soon">/);
    expect(tile).not.toMatch(/<button|<a |tabindex/);
    expect(text(tile)).toBe("Add a manuscript Coming soon We’re working on this – watch this space.");
  });
  it("D2 the desk: the pitch, then the side column of Details then Your manuscripts", () => {
    const order = [...html.matchAll(/data-ms29="(desk|pitch|side|details|shelf)"/g)].map((m) => m[1]);
    expect(order).toEqual(["desk", "pitch", "side", "details", "shelf"]);
  });
  it("D3 the retired parts are gone: the book view, the logline strip, the foot and its tiles", () => {
    for (const p of ['data-ms27="book"', 'data-ms27="logline"', 'data-ms28="foot"', 'data-ms28="tile-versions"', "ms27-bx"]) expect(html).not.toContain(p);
    expect(text(html)).not.toMatch(/Multiple manuscripts|Open Versions|Open Submission packages/);
    for (const f of ["v27/BookView.tsx", "v28/MsFoot.tsx", "v28/QuotedLine.tsx"]) expect(existsSync(join(__dirname, "..", f)), f).toBe(false);
  });
  it("E1 no verdicts, no Pro information, no small uppercase labels on the page", () => {
    const desk = html.slice(html.indexOf('data-ms29="desk"'));
    expect(text(desk)).not.toMatch(/missing|incomplete|readiness|ready to send|versions?\b|packages?\b|comps\b|activity/i);
    const css = readFileSync(join(__dirname, "msv29.css"), "utf8");
    expect(css).not.toMatch(/text-transform:\s*uppercase|--font-mono/);
    expect(css).not.toMatch(/#7c3a2a|#a2452a|burgundy/i);
  });
});

/* ══ Just added ══════════════════════════════════════════════════════════════════════════════════════════════════ */

describe("Just added — none written, no word count, Drafting, no queries", () => {
  const html = render(NEW());
  it("A3 Add a word count replaces the numeral; the status is Drafting with no since", () => {
    expect(html).toMatch(/data-ms29="add-words"[^>]*>Add a word count<\/button>/);
    expect(text(part(html, "vit-status").slice(0, 200))).toMatch(/^Drafting\b/);
    expect(text(html)).not.toMatch(/since/);
  });
  it("B4 the pitch band says nothing is written yet, and each row says why and offers Add one", () => {
    expect(html).toContain("Three ways of telling people what your book is. Add them when you’re ready.");
    expect(html.match(/data-ms29="add"/g)?.length).toBe(3);
    expect(html).not.toContain('data-ms29="copy"');
    for (const [b, w] of [
      ["No logline yet.", "The hook in a single sentence. It’s the line that opens your query letter."],
      ["No elevator pitch yet.", "What you’d say if someone asked what your book’s about. Keep it on the tip of your tongue."],
      ["No synopsis yet.", "The whole story in brief, ending included."],
    ]) expect(html.replace(/&#x27;/g, "'")).toContain(`<p><b>${b}</b>${w}</p>`);
  });
  it("C3 Not set for the word count; the foot offers Log a query", () => {
    expect(html).toContain('aria-label="Word count: Not set. Edit"');
    expect(text(part(html, "foot").slice(0, 300))).toMatch(/^No queries sent for this book yet\. Log a query/);
  });
});

/* ══ the edge seeds ══════════════════════════════════════════════════════════════════════════════════════════════ */

describe("Edges — 90 words exactly, one query, Shelved with an old date, a writer's own quotes", () => {
  it("B5 a synopsis of exactly 90 words: no clamp, no link, the count still shows", () => {
    const html = render(FULL({ synopsis: words(90) }), Q(3));
    expect(html).not.toContain('data-ms29="more"');
    expect(html).not.toContain("ms29-cl");
    expect(html).toContain(">90 words<");
    expect(render(FULL({ synopsis: words(91) }), Q(3))).toContain('data-ms29="more"');
  });
  it("C4 one query: 1 query sent for this book · See them", () => {
    expect(text(part(render(FULL(), Q(1)), "foot").slice(0, 300))).toMatch(/^1 query sent for this book See them/);
  });
  it("C5 Shelved with an old querying-since date: no since anywhere", () => {
    const html = render(FULL({ status: ManuscriptStatus.SHELVED }), Q(2, "2024-02-01T00:00:00.000Z"));
    expect(text(html)).not.toMatch(/since/);
    expect(html).toContain('aria-label="Where it stands: Shelved. Edit"');
  });
  it("B6 a logline the writer quoted shows one pair of marks", () => {
    const html = render(FULL({ logline: "“One Saturday to find him.”" }), Q(1));
    expect(text(html)).toContain("“One Saturday to find him.”");
    expect(text(html)).not.toContain("““");
  });
  it("B7 one or two written: {n} of 3 written.", () => {
    expect(render(FULL({ elevatorPitch: "", synopsis: "" }), Q(1))).toContain("1 of 3 written.");
  });
});

/* ══ the drawer's three additions (source: the behaviour is measured in the e2e harness) ═════════════════════════ */

describe("F — the drawer: Undo, the word-count entry, the flash", () => {
  const drawer = readFileSync(join(__dirname, "..", "v28", "MsEditDrawer.tsx"), "utf8");
  const page = readFileSync(join(__dirname, "..", "v12", "ManuscriptPage.tsx"), "utf8");
  it("F1 the saved toast carries Undo with the undone message; a no-op save offers none", () => {
    expect(drawer).toContain("showToast({ message: SAVED, undo: () => undo(inverse), undoneMessage: UNDONE })");
    expect(drawer).toContain("if (undo && Object.keys(inverse).length)");
  });
  it("F2 Undo never goes back through the narrating write, and deletes the feed row the save made", () => {
    const u = page.slice(page.indexOf("const undo = async"), page.indexOf("const copy = async"));
    expect(u).toContain("updateManuscriptQuiet(msId, fields");
    expect(u).not.toMatch(/\bupdateManuscript\(/);
    expect(u).toContain("deleteActivity(id)");
  });
  it("F3 Add a word count opens the drawer on the word count input", () => {
    expect(page).toContain('onAddWords={() => openEdit("wordCount")}');
    expect(drawer).toContain('field === "wordCount" ? "#ms21-f-words"');
  });
  it("F4 the flash is one animation, off under reduced motion", () => {
    const css = readFileSync(join(__dirname, "msv29.css"), "utf8");
    expect(css).toMatch(/\.ms29-pt\.is-flash \{ animation: ms29-fl 1\.1s ease-out; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ms29 \.ms29-pt\.is-flash \{ animation: none !important; \}/);
  });
});

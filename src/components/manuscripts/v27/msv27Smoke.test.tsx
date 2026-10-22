/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 — render smokes and the unit halves of MSV27. The rendered halves (geometry, the book opening, the
 * guide's spotlight over Edit details) are tests/e2e/manuscriptsV27.measure.ts.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderPageSeeded, noNavigate, setActiveManuscript } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ManuscriptPage, MS_ALL_DONE, MS_FINAL, MS_STEP_CARDS } from "../v12/ManuscriptPage";
import { BookView } from "./BookView";
import { PITCH_HINT, PITCH_PLACEHOLDER, SYNOPSIS_HINT } from "../v28/MsEditDrawer";
import { MS_CHECKLIST, msGuideOf } from "../../../lib/pageChecklist";
import { bookRows, cardGenre, cardRows, coverKicker, msGuideDone, sinceDay, allGenres, paragraphs } from "../../../lib/manuscriptV27";
import { ManuscriptStatus } from "../../../types";
import type { Manuscript } from "../../../types";

afterEach(() => setActiveManuscript(null));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
const page = () => <ManuscriptPage onNavigate={noNavigate} />;
const MS = (over: Partial<Manuscript> = {}): Manuscript => ({
  id: "m", userId: "u", title: "Murphy's Day Out", genre: "Thriller", subGenres: ["Crime", "Mystery"], ageCategory: "Adult",
  wordCount: 82400, logline: "A ferry skipper has one Saturday.", status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-01-01",
  ...over,
} as Manuscript);

describe("A1 — the page is two containers and nothing else", () => {
  const html = renderPageSeeded(page(), "/manuscripts");
  /* v28 Part F: the page is the book and the page foot now — its sections and copy are locked in v28/msv28Smoke.test.tsx */
  it("no versions, What's landing, comps, packages cards, activity, banner or footer", () => {
    for (const probe of ["versions", "materials", "activity", "banner", "door", "book"]) expect(html, probe).not.toContain(`data-ms21="${probe}"`);
    expect(html).not.toContain('data-probe="app-footer"');
    expect(text(html)).not.toMatch(/What's landing|What’s landing|Comparable|Recent activity|\+ New version|Add manuscript/);
  });
  it("the header: eyebrow, the title, the byline and two buttons — no How it works", () => {
    expect(html).toMatch(/data-ms27="eyebrow">— Manuscripts —</);
    expect(html).toMatch(/<h1 class="ms27-h1" id="ms27-title" data-page-title="" data-ms27="title">The Smoke Test<\/h1>/);
    expect(html).toMatch(/data-ms27="byline"><i aria-hidden="true"><\/i><em>by<\/em> /);
    /* v28.1: the buttons read Edit and View summary */
    expect(html).toMatch(/aria-label="Edit the book&#x27;s details"[^>]*>Edit<\/button>/);
    expect(html).toMatch(/aria-label="View the book&#x27;s summary"[^>]*>View summary<\/button>/);
    expect(text(html)).not.toMatch(/Edit details|Full details|Read it all/);
    expect(text(html)).not.toMatch(/How it works/i);
  });
});

describe("A2/A3 — the details card and the logline strip", () => {
  it("the card's rows: genre (primary + first sub), age, status, since; words fifth", () => {
    const rows = cardRows(MS(), "2026-03-03T10:00:00Z");
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Genre", "Thriller · Crime"], ["Age", "Adult"], ["Status", "Querying"], ["Since", "3 Mar 2026"], ["Words", "82,400"],
    ]);
    expect(cardRows(MS(), null).find((r) => r.key === "since")!.value).toBe("Not querying yet");
    expect(cardGenre(MS({ subGenres: [] }))).toBe("Thriller");
    expect(sinceDay("2026-03-03")).toBe("3 Mar 2026");
  });
  it("a written logline sits in the strip alone, closed by a rust quote mark bound to its last word (v28.1)", () => {
    setActiveManuscript(null);
    const html = renderPageSeeded(page(), "/manuscripts");
    const strip = /data-ms27="logline">([\s\S]*?)<\/div>/.exec(html);
    expect(strip).toBeTruthy();
    expect(strip![1]).not.toMatch(/<button|<a /);
    expect(strip![1]).toMatch(/<span class="ms28-qend" data-ms28="qend">\S+<span class="ms28-cq" aria-hidden="true" data-ms28="close-quote">\u201D<\/span><\/span><\/p>/);
  });
});

/* A4 (the coming-soon strip) retired by v28 Part F: the foot's copy is locked in v28/msv28Smoke.test.tsx */

describe("B — the book view", () => {
  const rows = bookRows(MS({ setting: undefined, series: "" }), null);
  it("omits a row with no value, and never draws a dash", () => {
    /* v28 Part B: Series is always a row ("Standalone" when unset), and Setting never is */
    expect(rows.map((r) => r.key)).toEqual(["genre", "age", "words", "status", "series"]);
    expect(rows.find((r) => r.key === "series")!.value).toBe("Standalone");
    expect(rows.every((r) => !/^[—–-]$/.test(r.value.trim()))).toBe(true);
    expect(allGenres(MS())).toBe("Thriller · Crime · Mystery");
  });
  it("the cover's kicker uses a or an, lower case, and drops with no genre", () => {
    expect(coverKicker("Thriller")).toBe("A thriller");
    expect(coverKicker("Upmarket")).toBe("An upmarket");
    expect(coverKicker("")).toBeNull();
  });
  it("renders the three pages' parts, with Not written yet for an absent pitch", () => {
    const html = renderToStaticMarkup(
      <BookView title="T" author="N" kicker="A thriller" words="82,400" rows={rows} stats={{ sent: 14, askedForMore: 3, withAgents: 3 }}
        logline="L" pitch="" synopsis={"One.\n\nTwo."} onClosed={() => {}} onEdit={() => {}} onQueryCentre={() => {}} />,
    );
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="ms27-bxT"');
    expect(html).toContain('data-ms27bx="none-elevatorPitch"');
    expect(html.match(/class="ms27-bx-sy"/g)?.length).toBe(2);
    expect(paragraphs("a\n\n\nb")).toEqual(["a", "b"]);
    for (const h of ["Logline", "Elevator pitch", "Synopsis"]) expect(html).toContain(`<h4>${h}</h4>`);
    expect(text(html)).not.toMatch(/working (copy|synopsis)/i);
    expect(text(html)).toContain("See them in the Query Centre");
  });
});

describe("C1 — copy: no 'working copy' on the page, the drawer or the book view; the two hints", () => {
  it("the hints and the placeholder are the prompt's", () => {
    expect(PITCH_PLACEHOLDER).toBe("e.g. A ferry skipper races the tide to bring his brother home.");
    /* v28 Part B rewrote the pitch hint */
    expect(PITCH_HINT).toBe("What you’d say if someone asked what your book’s about: the hook, then the stakes and what makes it yours. Keep it on the tip of your tongue. You never know when the right person might ask.");
    expect(SYNOPSIS_HINT).toBe("The whole story in brief, ending included.");
  });
  it("no user-facing 'working copy' or 'working synopsis' in the page's files", () => {
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const dir = join(__dirname, "..", "v12");
    const files = [
      ...readdirSync(__dirname).filter((f) => f.endsWith(".tsx") && !f.includes(".test.")).map((f) => join(__dirname, f)),
      join(dir, "ManuscriptPage.tsx"), join(dir, "Msv21Dialogs.tsx"),
    ];
    for (const f of files) expect(strip(readFileSync(f, "utf8")), f).not.toMatch(/working (copy|synopsis)/i);
  });
});

describe("D — the guide", () => {
  it("four items, in order, with the prompt's titles and lines", () => {
    expect(MS_CHECKLIST.map((i) => [i.title, i.line])).toEqual([
      ["Check your book's details", "Genre, age category and word count."],
      /* v28 Part B rewrote these two lines */
      ["Write your logline", "The hook in a single sentence."],
      ["Add an elevator pitch", "The 30-second version, said out loud."],
      ["Add a synopsis", "The whole story, ending included."],
    ]);
  });
  it("done is read from the saved manuscript", () => {
    expect(msGuideDone(MS())).toEqual({ details: true, logline: true });
    expect(msGuideDone(MS({ wordCount: 0 })).details).toBeUndefined();
    expect(msGuideDone(MS({ elevatorPitch: "x", synopsis: "  " }))).toEqual({ details: true, logline: true, pitch: true });
    expect(msGuideDone(null)).toEqual({});
  });
  it("every step opens Edit details on its own field, never the book", () => {
    expect(Object.fromEntries(Object.entries(MS_STEP_CARDS).map(([k, c]) => [k, c.field]))).toEqual({
      details: "basics", logline: "logline", pitch: "elevatorPitch", synopsis: "synopsis",
    });
    const src = readFileSync(join(__dirname, "..", "v12", "ManuscriptPage.tsx"), "utf8");
    const start = src.slice(src.indexOf("const startStep"), src.indexOf("const toVersions"));
    expect(start).toContain("setBookOpen(false)");
    expect(start).not.toContain("setBookOpen(true)");
  });
  it("the final note and the all-done header are the prompt's words", () => {
    expect(MS_FINAL).toEqual({ kicker: "Manuscripts · 4 of 4", title: "Your book’s set up.", line: "Everything an agent asks about the book, in one place. Now put it to work with smart querying." });
    expect(MS_ALL_DONE).toEqual({ title: "Your book's set up", line: "Everything an agent asks about the book, in one place. Next, try smart querying." });
  });
  it("state is per account at todoPrefs.manuscripts.guide", () => {
    expect(msGuideOf({ todoPrefs: { manuscripts: { guide: { seen: true } } } } as never)).toEqual({ seen: true, hidden: false });
  });
});

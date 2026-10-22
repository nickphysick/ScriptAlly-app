/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — render smokes and the unit halves of MSV28 (A2, B1, B2, F1's copy). The rendered halves are
 * tests/e2e/manuscriptsV28.measure.ts.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderPageSeeded, noNavigate, setActiveManuscript } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ManuscriptPage } from "../v12/ManuscriptPage";
import { FOOT_COPY, MsFoot } from "./MsFoot";
import { LOGLINE_HINT, LOGLINE_TAG, PITCH_HINT, PITCH_TAG, SERIES_ON, seriesLine, seriesOn, seriesPatch } from "./MsEditDrawer";
import { deleteField, type FieldValue } from "firebase/firestore";

afterEach(() => setActiveManuscript(null));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

describe("F1 — the page is the book and the page foot", () => {
  const html = renderPageSeeded(<ManuscriptPage onNavigate={noNavigate} />, "/manuscripts");
  it("the book container, then the foot: the bar and two tiles", () => {
    const sec = /<div class="ms27-bkp" data-ms27="sections">([\s\S]*)$/.exec(html);
    expect(sec).toBeTruthy();
    expect([...sec![1].matchAll(/<(section|div) class="(ms27-bkx|ms28-foot)"/g)].map((m) => m[2])).toEqual(["ms27-bkx", "ms28-foot"]);
    expect(html).not.toContain("ms27-soon");
  });
  it("the copy is exact, and the Versions text carries no bold", () => {
    const f = renderToStaticMarkup(<MsFoot onVersions={() => {}} onPackages={() => {}} />);
    const t = text(f);
    for (const s of [FOOT_COPY.chip, FOOT_COPY.title, "We’re working on this. Watch this space.",
      "Prologue first? Cut the flashback? Faster-paced start? Tweak, save and track different versions of your manuscript to see what lands.",
      "Bundle query letters, synopses and comparable titles with your manuscript and attach them to queries to see what performs best.",
      "Open Versions →", "Open Submission packages →"]) expect(t).toContain(s);
    const v = /data-ms28="tile-versions"[\s\S]*?<\/button>/.exec(f)![0];
    expect(v).not.toMatch(/<strong|<b>[^<]*Prologue|<b>[^<]*Tweak/);
    expect(/data-ms28="tile-text">([^<]*)</.exec(v)![1]).toBe(FOOT_COPY.versions.text);
  });
});

describe("A2/B — the drawer's sections and copy", () => {
  const src = readFileSync(join(__dirname, "MsEditDrawer.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("the section headings, in order: The book, Logline, Elevator pitch, Synopsis, Series; no Setting", () => {
    const titles = [...src.matchAll(/<Sect n=\{(\d)\} id="[a-zA-Z]+" title="([^"]+)"/g)].map((m) => m[2]);
    expect(titles).toEqual(["The book", "Logline", "Elevator pitch", "Synopsis", "Series"]);
    expect(src).not.toMatch(/Setting/);
  });
  it("the logline and pitch tags and hints are the prompt's", () => {
    expect(LOGLINE_TAG).toBe("one sentence");
    expect(LOGLINE_HINT).toBe("The hook in a single sentence. It’s the line that opens your query letter.");
    expect(PITCH_TAG).toBe("30 seconds, out loud");
    expect(PITCH_HINT).toBe("What you’d say if someone asked what your book’s about: the hook, then the stakes and what makes it yours. Keep it on the tip of your tongue. You never know when the right person might ask.");
  });
  it("B1 series: on writes 'Part of a series' unless a value is kept; off omits the key; any value reads as on", () => {
    expect(seriesPatch(true, undefined)).toBe(SERIES_ON);
    expect(seriesPatch(true, "The Ferry Trilogy")).toBeNull();
    expect((seriesPatch(false, "Part of a series") as FieldValue).isEqual(deleteField())).toBe(true);
    expect(seriesPatch(false, undefined)).toBeNull();
    expect(seriesOn("Book two")).toBe(true);
    expect(seriesOn("  ")).toBe(false);
    expect(seriesLine(false)).toBe("No, it’s a standalone");
    expect(seriesLine(true)).toBe("Yes, it’s part of a series");
  });
});

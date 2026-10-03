/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts — render smokes and the unit halves of the page's locks (v12's, carried, and v13's).
 *
 * The rendered halves (geometry, the bands, the shelf, the tiles, the activity) live in
 * tests/e2e/manuscriptsV13.measure.ts; here are the halves a source render can honestly carry: the
 * page renders in both states, the filled page is one column of five banded cards with no rail, the
 * empty state's five example sections are inert furniture (L6, unchanged — F8), every status glyph
 * is the real StatusDot and no mock ring was ported (L5), an unset series reads "Standalone" (v13
 * Phase 2), the page's own words never grade the writer (L11), the owed row's click path performs
 * NO write (L4's source half), and the two dialogs carry the mock's fields and write as stated.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderPage, renderPageSeeded, noNavigate, setActiveManuscript } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ManuscriptPage } from "./ManuscriptPage";
import { Msv12EditDetails, Msv12NewVersion, factPatch } from "./Msv12EditDetails";
import { SD_VIEWBOX } from "../../../test/statusDotSignature";
import { sliceBetween } from "../../../test/sliceBetween";
import { deleteField, type FieldValue } from "firebase/firestore";

afterEach(() => setActiveManuscript(null));

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const text = (html: string) => html.replace(/<[^>]+>/g, " ");
const page = () => <ManuscriptPage onNavigate={noNavigate} />;

describe("/manuscripts (v12) renders", () => {
  it("empty: the invitation, not a crash", () => {
    const html = renderPage(page(), "/manuscripts");
    expect(html).toContain("Your manuscript starts here");
    expect(html).toContain('data-msv12="empty-cta"');
  });

  it("filled: the hero states the seeded book, over one column of five banded cards and no rail", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("The Smoke Test");
    expect(html).toContain('data-msv12="hero"');
    expect(html, "v13 retired the rail (F1)").not.toContain('data-msv12="rail"');
    expect(html).toContain('data-msv13="shelf"');
    for (const card of ["comps", "materials", "packages", "versions", "activity"]) {
      /* the band is the card's first child — the anthracite header every container carries (F2) */
      expect(html, `${card} renders under its band`).toMatch(new RegExp(`data-msv13-card="${card}"[^>]*><div class="msv13-band" data-msv13="band">`));
    }
    /* Edit details sits under the facts (Phase 2): the facts list closes, then the button opens */
    expect(html).toMatch(/<\/dl><button[^>]*data-msv12="edit-details"/);
  });

  it("L6 · the empty state's five sections are inert examples", () => {
    const html = renderPage(page(), "/manuscripts");
    for (const key of ["versions", "letters", "synopses", "packages", "comps"]) {
      expect(html, `section ${key}`).toContain(`data-msv12-esec="${key}"`);
    }
    /* every ghost block is aria-hidden furniture; the Example tag count matches the sections */
    expect(html.match(/data-msv12-ghost=""/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(html.match(/aria-hidden="true" class="msv12-ghost|class="msv12-ghost[^"]*" data-msv12-ghost="" aria-hidden="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(0);
    expect(html.match(/data-msv12="example-tag"/g)?.length ?? 0).toBe(5);
    /* the ghosts never contain a button or a link — nothing clickable in furniture */
    for (const m of html.matchAll(/data-msv12-ghost=""[^>]*>([\s\S]*?)<\/div>\s*<\/section>/g)) {
      expect(m[1]).not.toContain("<button");
      expect(m[1]).not.toContain("<a ");
    }
  });

  it("L5 · every status glyph is the real StatusDot, and no mock ring was ported", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    /* the signature the house lock module states — the 24-viewBox drawing */
    expect(html).toContain(SD_VIEWBOX);
    /* the mock's `.dot` ring class must not exist anywhere on the page */
    expect(html).not.toMatch(/class="[^"]*\bdot\b[^"]*"/);
    /* every wrapper that claims to hold a status glyph actually holds the svg */
    const wraps = html.split('data-msv12-sd=""').length - 1;
    expect(wraps).toBeGreaterThan(0);
  });

  it("an unset series reads 'Standalone', muted — never 'Not recorded', a dash or a blank (v13 Phase 2)", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    /* bounded by anchors that cannot nest — the series is the last fact, so the list's close */
    const series = sliceBetween(html, 'data-msv12="fact-series"', "</dl>", "the series fact");
    expect(series).toContain('class="msv12-miss">Standalone</dd>');
    expect(series).not.toContain("Not recorded");
    expect(series).not.toContain("<button");
    expect(series).not.toContain("—");
    /* the setting keeps v12's rule (L9): unset is "Not recorded" with an Add control */
    const setting = sliceBetween(html, 'data-msv12="fact-setting"', 'data-msv12="fact-series"', "the setting fact");
    expect(setting).toContain("Not recorded");
    expect(setting).toContain("<button");
  });

  it("L11 · no appraisal word in the page's own text, either state", () => {
    const banned = /(?<![\w-])(only|already|still|good|bad|slow|fast|poor|strong|weak|overdue|late|behind|impressive|finally|unfortunately)(?![\w-])/i;
    for (const html of [renderPage(page(), "/manuscripts"), renderPageSeeded(page(), "/manuscripts")]) {
      const hit = banned.exec(text(html));
      expect(hit ? `"${hit[0]}" at …${text(html).slice(Math.max(0, hit.index - 40), hit.index + 40)}…` : null).toBeNull();
    }
  });
});

describe("L4 · the owed row's click path writes nothing (source half)", () => {
  const root = join(__dirname);
  const pageSrc = strip(readFileSync(join(root, "ManuscriptPage.tsx"), "utf8"));
  const secSrc = strip(readFileSync(join(root, "Msv12Sections.tsx"), "utf8"));

  it("no status writer is named anywhere in the page or its sections", () => {
    /* the writers a shortcut would reach for — the query drawer is the ONLY route, opened through
       `openQueryDrawer`, and it is declarative, not a call the row can make */
    for (const src of [pageSrc, secSrc]) {
      expect(src).not.toMatch(/\bupdateQueryStatus\s*\(/);
      expect(src).not.toMatch(/\brecordMaterialsSent\b/);
      expect(src).not.toMatch(/\bcommitSendFromPane\b/);
      expect(src).not.toMatch(/\brecordQueryResponse\b/);
    }
  });

  it("the send button's handler opens the query drawer and nothing else", () => {
    /* the owed button's one job: hand its row to `onSend`; the page's `openSend` only opens the
       drawer's "I've sent it" journey for that query (TaskModal is deleted, 27 Sep) */
    expect(secSrc).toContain('data-msv12="owed-send" onClick={() => onSend(row)}');
    expect(pageSrc).toContain('openQueryDrawer({ mode: "sent", queryId: row.query.id })');
    expect(pageSrc, "no modal host survives").not.toMatch(/TaskModal|setModalCard|commitFromModal/);
    expect(pageSrc, "openSend raises no CommitRequest").not.toMatch(/setRequest\(|DashTaskCommit/);
  });
});

/**
 * The edit dialog's ONE write (Nick's ruling, 25 Sep): the two-write split and its rules-window
 * message came out once tests/rules proved the allowlist carries `setting` and `series` (19f8fba9).
 * These are the halves a unit suite can carry; the emulator suite owns the rules themselves.
 */
describe("the edit dialog's one write", () => {
  const src = strip(readFileSync(join(__dirname, "Msv12EditDetails.tsx"), "utf8"));
  const dialog = sliceBetween(src, "export const Msv12EditDetails", "export const Msv12NewVersion", "the edit dialog");

  it("performs exactly one write, and no longer speaks of a rules window", () => {
    expect(dialog.match(/\bupdateManuscript\(/g)?.length ?? 0, "the dialog writes once").toBe(1);
    expect(src).not.toMatch(/rules deploy|hasn.t landed/i);
  });

  it("a fact rides only when it changed, and a cleared fact is REMOVED — never '' and never undefined", () => {
    expect(factPatch("West Cork", "West Cork")).toBeNull();
    expect(factPatch("  West Cork ", "West Cork")).toBeNull();
    expect(factPatch("", undefined)).toBeNull();
    expect(factPatch("West Cork, today", undefined)).toBe("West Cork, today");
    expect(factPatch(" Cork ", "West Cork")).toBe("Cork");
    /* Firestore here rejects `undefined` outright, so a clear that is anything but deleteField()
       throws — which is exactly what the first cut shipped */
    const cleared = factPatch("", "West Cork");
    expect(cleared, "a clear produced no patch").not.toBeNull();
    expect(typeof cleared, "a clear wrote a value instead of removing the key").not.toBe("string");
    expect((cleared as FieldValue).isEqual(deleteField()), "a clear is not deleteField()").toBe(true);
  });

  it("the rules carry both keys the dialog writes — the pairing that makes one write safe", () => {
    const rules = readFileSync(join(__dirname, "..", "..", "..", "..", "firestore.rules"), "utf8");
    const block = [...rules.matchAll(/hasOnly\(\[([\s\S]*?)\]/g)]
      .map((m) => m[1]).find((b) => b.includes("'bookVersions'"));
    expect(block, "the manuscript update allowlist moved — re-find it").toBeTruthy();
    /* comments stripped first: a note that NAMES a key must not satisfy a claim that it is LISTED */
    const listed = block!.replace(/\/\/[^\n]*/g, "");
    expect(listed, "setting left the allowlist — every setting edit now fails the whole save").toContain("'setting'");
    expect(listed, "series left the allowlist — every series edit now fails the whole save").toContain("'series'");
  });
});

/** The seeded manuscript, as the dialogs receive it. */
const SEEDED_MS = {
  id: "m1", userId: "u1", title: "The Smoke Test", genre: "Literary Fiction", ageCategory: "Adult",
  wordCount: 82000, logline: "A page that would not load.", status: "Querying",
  statusChangedDate: "2026-01-05T00:00:00.000Z",
} as unknown as React.ComponentProps<typeof Msv12EditDetails>["ms"];

describe("the dialogs carry the mock's fields (v13)", () => {
  const noop = async () => undefined;
  const labels = (html: string) => [...html.matchAll(/<label for="[^"]+">([^<]+)/g)].map((m) => m[1].trim());

  it("Edit details: the mock's nine fields in its order, the status as segments, Save details", () => {
    const html = renderPage(
      <Msv12EditDetails ms={SEEDED_MS} authorName="Nick Physick" updateManuscript={noop} updateUserProfile={noop} onClose={() => {}} />,
      "/manuscripts",
    );
    expect(labels(html)).toEqual(["Title", "Author name", "Word count", "Genre", "Age category", "Logline", "Setting", "Series"]);
    expect(html).toContain('id="msv12-f-status">Status</span>');
    const seg = sliceBetween(html, 'class="msv12-seg"', 'class="msv12-dfoot"', "the status segments");
    expect([...seg.matchAll(/aria-pressed="(true|false)"[^>]*>([^<]+)</g)].map((m) => [m[2], m[1]]))
      .toEqual([["Drafting", "false"], ["Querying", "true"], ["On submission", "false"], ["Shelved", "false"]]);
    expect(html).toContain('value="Nick Physick"');
    expect(html).toContain(">Save details</button>");
    expect(html).toContain("One or two sentences. It leads the page and the query line.");
  });

  it("New version: name and what changed, no kind and no word count (no model field), Save version", () => {
    const html = renderPage(<Msv12NewVersion ms={SEEDED_MS} editing={null} updateManuscript={noop} onClose={() => {}} />, "/manuscripts");
    expect(labels(html)).toEqual(["Name", "What changed"]);
    expect(html).toContain("A new ordering or edit of the book. It becomes the current version.");
    expect(html).toContain(">Save version</button>");
    expect(html).not.toMatch(/Kind|Word count/);
  });

  it("the author name is the account's, written only when it changed and only after the manuscript's write", () => {
    const src = strip(readFileSync(join(__dirname, "Msv12EditDetails.tsx"), "utf8"));
    const dialog = sliceBetween(src, "export const Msv12EditDetails", "export const Msv12NewVersion", "the edit dialog");
    expect(dialog.match(/\bupdateUserProfile\(/g)?.length ?? 0).toBe(1);
    expect(dialog.indexOf("updateManuscript("), "the manuscript writes first").toBeLessThan(dialog.indexOf("updateUserProfile("));
    expect(dialog).toMatch(/if \(d\.author\.trim\(\) !== authorName\.trim\(\)\)/);
  });

  it("a new version is dated by the London calendar, never the UTC date", () => {
    const src = strip(readFileSync(join(__dirname, "Msv12EditDetails.tsx"), "utf8"));
    expect(src).toContain("createdDate: londonDay(new Date())");
    expect(src).not.toMatch(/toISOString\(\)\.slice\(0, 10\)/);
  });
});

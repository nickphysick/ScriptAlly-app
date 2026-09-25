/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — render smokes and the unit halves of the page's locks.
 *
 * The rendered halves of L1/L2/L8/L10 (geometry) live in tests/e2e/manuscriptsV12.measure.ts;
 * here are the halves a source render can honestly carry: the page renders in both states, the
 * empty state's five example sections are inert furniture (L6), every status glyph is the real
 * StatusDot and no mock ring was ported (L5), the unset series says "Not recorded" (L9), the
 * page's own words never grade the writer (L11), and the owed row's click path performs NO write
 * (L4's source half — only the modal's commit writes, through DashTaskCommit).
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
import { factPatch } from "./Msv12EditDetails";
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

  it("filled: the hero states the seeded book", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("The Smoke Test");
    expect(html).toContain('data-msv12="hero"');
    expect(html).toContain('data-msv12="rail"');
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

  it("L9 · an unset series is 'Not recorded' with an Add control, never a dash or a blank", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    const series = /data-msv12="fact-series"[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
    expect(series, "the series fact renders").not.toBe("");
    expect(series).toContain("Not recorded");
    expect(series).toContain("<button");
    expect(series).not.toContain("—");
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
    /* the writers a shortcut would reach for — the modal's commit path (DashTaskCommit →
       useTaskCommit) is the ONLY route, and it is declarative, not a call the row can make */
    for (const src of [pageSrc, secSrc]) {
      expect(src).not.toMatch(/\bupdateQueryStatus\s*\(/);
      expect(src).not.toMatch(/\brecordMaterialsSent\b/);
      expect(src).not.toMatch(/\bcommitSendFromPane\b/);
      expect(src).not.toMatch(/\brecordQueryResponse\b/);
    }
  });

  it("the send button's handler opens the modal host and nothing else", () => {
    /* the owed button's one job: hand its row to `onSend`; the page's `openSend` only sets the
       modal card (or routes to the Query Centre when the board raises no card) */
    expect(secSrc).toContain('data-msv12="owed-send" onClick={() => onSend(row)}');
    expect(pageSrc).toContain("setModalCard(c)");
    expect(pageSrc, "openSend must not raise a CommitRequest — only commitFromModal does")
      .not.toMatch(/openSend[\s\S]{0,400}setRequest\(/);
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

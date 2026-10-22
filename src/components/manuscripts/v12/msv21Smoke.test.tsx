/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v21 — render smokes and the unit halves of the page's locks. The rendered halves
 * (geometry, the deck, the doors, the three states on real accounts) are
 * tests/e2e/manuscriptsV21.measure.ts.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderPage, renderPageSeeded, noNavigate, setActiveManuscript } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ManuscriptPage, DELETED_TITLE, EMPTY_TITLE, deletedSub } from "./ManuscriptPage";
import { factPatch, parseWords } from "./Msv21Dialogs";
import { EMPTY_PREVIEWS } from "./Msv21Parts";
import { sliceBetween } from "../../../test/sliceBetween";
import { deleteField, type FieldValue } from "firebase/firestore";

afterEach(() => setActiveManuscript(null));

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const text = (html: string) => html.replace(/<[^>]+>/g, " ");
const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const page = () => <ManuscriptPage onNavigate={noNavigate} />;

describe("/manuscripts (v21) renders", () => {
  it("empty: the open header with one action, the banner and three previews — nothing from the filled page", () => {
    const html = renderPage(page(), "/manuscripts");
    expect(html).toContain(EMPTY_TITLE.replace("'", "&#x27;"));
    expect(html).toContain('data-own-header=""');
    expect(html.match(/data-ms21="add"/g)?.length ?? 0).toBe(1);
    expect(html.match(/data-ms21="preview"/g)?.length ?? 0).toBe(3);
    for (const p of EMPTY_PREVIEWS) expect(html).toContain(p.title);
    for (const probe of ["book", "activity", "versions", "materials"]) expect(html, probe).not.toContain(`data-ms21="${probe}"`);
    /* header v3 does not reach the empty state: it keeps the header it had */
    expect(html).not.toContain("data-hp3");
    expect(html).toContain('class="ms21-title"');
    /* the previews are inert furniture: each ghost is aria-hidden and holds no control */
    const ghosts = [...html.matchAll(/<div class="ms21-ghost[^"]*" aria-hidden="true" data-ms21="ghost">([\s\S]*?)<\/div><h3/g)];
    expect(ghosts.length).toBe(3);
    for (const g of ghosts) expect(g[1]).not.toMatch(/<button|<a |<input/);
  });

  /* v27 (22 Oct): the filled page is two containers (msv27Smoke.test.tsx). Retired here, deliberately: "filled: the book,
     activity, the banner, versions and three doors" and "every status glyph is the real StatusDot" (no query status is
     drawn on the v27 page). */

  it("no appraisal word in the page's own text, either state", () => {
    const banned = /(?<![\w-])(only|already|still|good|bad|slow|fast|poor|strong|weak|overdue|late|behind|impressive|finally|unfortunately)(?![\w-])/i;
    for (const html of [renderPage(page(), "/manuscripts"), renderPageSeeded(page(), "/manuscripts")]) {
      const hit = banned.exec(text(html));
      expect(hit ? `"${hit[0]}" at …${text(html).slice(Math.max(0, hit.index - 40), hit.index + 40)}…` : null).toBeNull();
    }
  });

  it("the just-deleted copy names the book and says what went with it", () => {
    expect(DELETED_TITLE).toBe("Add your book again");
    expect(deletedSub("The Salt Ledger")).toBe("The Salt Ledger has been deleted, along with its queries and materials. Add a manuscript to start again.");
  });

  /* v27: the three-step PageGuide is retired; the page's guide is the four-item checklist (msv27Smoke.test.tsx) */
});

describe("the page writes nothing itself, and deletes nothing", () => {
  const src = strip(read("ManuscriptPage.tsx"));
  const parts = strip(read("Msv21Parts.tsx"));

  it("no status writer and no delete is named in the page or its parts", () => {
    for (const s of [src, parts]) {
      expect(s).not.toMatch(/\bupdateQuery\w*\(|\brecordResponse\w*\(|\brecordMaterialsSent\(|\bdeleteManuscript\b|\bsetDoc\(|\bupdateDoc\(/);
    }
    expect(parts, "the parts take no writer at all").not.toMatch(/updateManuscript|addManuscript/);
  });

  /* v27: the activity card left the page, and with it the row door ("an activity row opens the query drawer") */

  it("the retired components are gone", () => {
    for (const f of ["Msv12EditDetails.tsx", "Msv12Empty.tsx", "Msv12Sections.tsx", "Msv13Shelf.tsx"]) {
      expect(existsSync(join(__dirname, f)), f).toBe(false);
    }
  });
});

describe("the dialogs", () => {
  const src = strip(read("Msv21Dialogs.tsx"));
  const edit = sliceBetween(src, "export const Msv21EditDetails", "export const Msv21Version", "the edit dialog");
  const version = sliceBetween(src, "export const Msv21Version", "export const Msv21AddManuscript", "the version dialog");
  const add = src.slice(src.indexOf("export const Msv21AddManuscript"));

  it("Edit details: one write, the fields in five sections (v27 Part C adds the pitch and the synopsis), the six statuses, and no author", () => {
    expect(edit.match(/\bupdateManuscript\(/g)?.length ?? 0).toBe(1);
    const labels = [...edit.matchAll(/<label htmlFor="[^"]+">([^<]+)<\/label>|<span className="ms21-fl"[^>]*>([^<]+)<\/span>/g)].map((m) => m[1] ?? m[2]);
    expect(labels).toEqual(["Title", "Word count", "Genre", "Age category", "Status", "Shelved reason", "Logline", "Elevator pitch", "Synopsis", "Setting", "Series"]);
    expect(edit).toContain("STATUS_ORDER.map");
    expect(edit).not.toMatch(/author|updateUserProfile/i);
    expect(edit).toMatch(/<select id="ms21-f-genre"/);
  });

  it("a fact rides only when it changed, and a cleared fact is REMOVED — never '' and never undefined", () => {
    expect(factPatch("West Cork", "West Cork")).toBeNull();
    expect(factPatch("  West Cork ", "West Cork")).toBeNull();
    expect(factPatch("", undefined)).toBeNull();
    expect(factPatch("West Cork, today", undefined)).toBe("West Cork, today");
    const cleared = factPatch("", "West Cork");
    expect(cleared).not.toBeNull();
    expect(typeof cleared).not.toBe("string");
    expect((cleared as FieldValue).isEqual(deleteField())).toBe(true);
  });

  it("the rules carry the keys the dialogs write, and do not check a book version field by field", () => {
    const rules = readFileSync(join(__dirname, "..", "..", "..", "..", "firestore.rules"), "utf8");
    const block = [...rules.matchAll(/hasOnly\(\[([\s\S]*?)\]/g)].map((m) => m[1]).find((b) => b.includes("'bookVersions'"));
    expect(block, "the manuscript update allowlist moved — re-find it").toBeTruthy();
    const listed = block!.replace(/\/\/[^\n]*/g, "");
    for (const k of ["'title'", "'genre'", "'ageCategory'", "'wordCount'", "'logline'", "'status'", "'shelvedReason'", "'setting'", "'series'", "'elevatorPitch'", "'synopsis'", "'bookVersions'"]) {
      expect(listed, `${k} left the allowlist — every save carrying it now fails whole`).toContain(k);
    }
    /* `BookVersion.wordCount` is safe to add only while the rules treat the list as a list */
    const code = rules.replace(/\/\/[^\n]*/g, "");
    expect(code).toMatch(/data\.bookVersions is list && data\.bookVersions\.size\(\) <= 50/);
    expect(code, "the rules began checking a version's fields: wordCount needs a line there").not.toMatch(/bookVersions\[\d*\]\.|isValidBookVersion/);
  });

  it("a version: the name is required, a count rides only when one was given, the day is London's, and an edit is name and note", () => {
    expect(version).toContain("Add a name to save it.");
    expect(version).toMatch(/\.\.\.\(count !== null \? \{ wordCount: count \} : \{\}\)/);
    expect(version).toContain("createdDate: londonDay(new Date())");
    expect(version).not.toMatch(/toISOString\(\)\.slice/);
    expect(version).toMatch(/renameBookVersion\(existing, editing\.id, trimmed, note\)/);
    expect(version).toMatch(/\{editing \? null : \(/);
    expect(parseWords("48,500")).toBe(48500);
    expect(parseWords("")).toBeNull();
    expect(parseWords("0")).toBeNull();
  });

  it("Add your manuscript: one write through addManuscript, the first version inside it, kind initial", () => {
    expect(add.match(/\baddManuscript\(/g)?.length ?? 0).toBe(1);
    expect(add).not.toMatch(/\bupdateManuscript\(/);
    expect(add).toMatch(/kind: "initial"/);
    expect(add).toMatch(/bookVersions: appendBookVersion\(\[\], first\)/);
    expect(add).toContain("Add a title to save it.");
    expect(add).toContain('version: "First draft"');
  });

  it("every dialog portals out of #root — useOverlay seals #root inert, so a dialog inside it is dead", () => {
    expect(src.match(/return toBody\(/g)?.length ?? 0, "the one shell every dialog is drawn through").toBe(1);
    expect(src).toMatch(/createPortal\(node, document\.body\)/);
    expect(src.match(/<Shell\b/g)?.length ?? 0).toBe(3);
    /* the dialogs' sheet reads only :root tokens, so leaving the page's scope loses nothing */
    const css = read("msv21.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const dialogs = css.slice(css.indexOf(".ms21-layer {"));
    expect(dialogs.length).toBeGreaterThan(500);
    expect(dialogs).not.toMatch(/var\(--msv12-/);
  });
});

describe("the sheet", () => {
  const css = read("msv21.css").replace(/\/\*[\s\S]*?\*\//g, "");
  /* app shell v2 (9 Oct): the page, sheet and band colours are the shell's `:root` tokens, read here rather than restated. */
  it("every token it reads is a :root token", () => {
    const read = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    const own = new Set([...css.matchAll(/(--ms21-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    for (const t of read) expect(own.has(t) || ["--sp-type", "--sp-serif", "--font-mono", "--ws-page", "--ws-sheet", "--ws-band", "--hsheet-flap", "--hsheet-w", "--hsheet-clip"].includes(t) || /^--hpanel-/.test(t) /* the header panel's :root tokens (shell/headerPanel.css) */, t).toBe(true);
  });
  it("the deck and the doors stand still under reduced motion", () => {
    const rm = sliceBetween(css, "@media (prefers-reduced-motion: reduce)", ".ms21-band {", "the reduced-motion block");
    expect(rm).toMatch(/\.ms21-vc[^{]*\{ transition: none !important; \}/);
    expect(rm).toMatch(/\.ms21 \.ms21-door:hover \{ transform: none; \}/);
  });
});

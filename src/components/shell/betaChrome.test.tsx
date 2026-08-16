/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The beta strip and the feedback dock.
 *
 * ⚠️ VERIFICATION LEVEL: CODE + UNIT, NOT MEASURED. The workspace is auth-gated, so the browser
 * pane cannot reach it and the Playwright harness opens the DEPLOYED dev site, which does not carry
 * this change. What is asserted below is structural — the strip is outside `.wpg`, so the page
 * grid's collapse and reclaim arithmetic cannot see it — and that is a claim about where an element
 * sits, which source can answer. The pixel claim is NOT made here.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import React from "react";
import { stripComments } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());

import { BetaStrip } from "./BetaStrip";
import { FeedbackDock } from "./FeedbackDock";
import {
  BETA_MODE, BETA_PILL, BETA_STRIP_REPORT_LINK, FEEDBACK_FAB, FEEDBACK_KINDS,
  FEEDBACK_PRIVACY_NOTE, feedbackContextLines,
} from "../../lib/beta";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

/** ⚠️ RENDERED HTML ESCAPES THE APOSTROPHE, and most of this copy has one. */
const esc = (copy: string) => copy.replace(/'/g, "&#x27;");

const strip = () => renderToStaticMarkup(<BetaStrip onReport={() => {}} />);
const dock = (open: boolean) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/queries"]}>
      <FeedbackDock uid="u1" open={open} onOpenChange={() => {}} onReceipt={() => {}} />
    </MemoryRouter>,
  );

describe("the beta strip says one thing, once", () => {
  it("renders while beta mode is on", () => {
    expect(BETA_MODE).toBe(true);
    expect(strip()).toContain(BETA_PILL);
  });

  /** ⚠️ NO MODAL. A sentence that stops the app to say "expect rough edges" makes the beta sound
   *  more alarming than it is. */
  it("is a note, not a dialog", () => {
    const html = strip();
    expect(html).toContain('role="note"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('role="alertdialog"');
  });

  it("offers a way to report from inside the sentence", () => {
    expect(strip()).toContain(esc(BETA_STRIP_REPORT_LINK));
  });

  /**
   * ⚠️ NO DEAD LINK. There is no known-issues page yet, and a link to nothing teaches a beta user
   * that the strip is decoration — which is the one thing it cannot afford to be. The slot exists;
   * the link appears when it has somewhere to go.
   */
  it("omits the known-issues link while there is nowhere to send it", () => {
    expect(strip()).not.toContain("What we already know about");
  });

  /**
   * ⚠️ SESSION, NOT LOCAL. A notice dismissed in March should be back the next time the app opens:
   * what it says is still true.
   */
  it("remembers its dismissal for the session only", () => {
    const source = read("BetaStrip.tsx");
    expect(source).toContain("sessionStorage");
    expect(source).not.toContain("localStorage");
  });
});

describe("⚠️ the strip takes no part in the page grid's arithmetic", () => {
  /**
   * The header's collapse and its scroll-invariance padding are computed inside `.wpg`. The strip
   * is a sibling of the whole workspace, so neither can see it. This asserts the placement, which
   * is the thing that makes the pixel claim true rather than the pixel claim itself.
   */
  const shell = read("AppShell.tsx");

  it("is mounted above WorkspaceShell, outside the grid", () => {
    const stripAt = shell.indexOf("<BetaStrip");
    const workspaceAt = shell.indexOf("<WorkspaceShell");
    expect(stripAt).toBeGreaterThan(-1);
    expect(workspaceAt).toBeGreaterThan(-1);
    expect(stripAt).toBeLessThan(workspaceAt);
  });

  it("never touches the grid's reclaim or collapse tokens", () => {
    const source = read("BetaStrip.tsx") + read("betaChrome.css");
    for (const token of ["--wpg-reclaim-pad", "--wpg-foot", "wpg-scroll", "wpg--working", "wpg--fill"]) {
      expect(source).not.toContain(token);
    }
  });
});

describe("the feedback dock", () => {
  it("shows only its button until it is opened", () => {
    const closed = dock(false);
    expect(closed).toContain(FEEDBACK_FAB);
    expect(closed).not.toContain('role="dialog"');
  });

  it("offers all four kinds, including one that is not a complaint", () => {
    const html = dock(true);
    for (const kind of FEEDBACK_KINDS) expect(html).toContain(esc(kind));
    // A channel that only accepts faults becomes a complaints box, and then only the angriest
    // tenth ever use it.
    expect(FEEDBACK_KINDS).toContain("Something I liked");
  });

  /**
   * ⚠️ THE WRITER SEES EXACTLY WHAT TRAVELS. A context block they cannot inspect is one they have
   * to take on trust, and the thing being asked for is trust about their own work in progress.
   */
  it("prints the captured context and states the limit in words", () => {
    const html = dock(true);
    for (const line of feedbackContextLines({ route: "/queries", viewport: "", browser: "", uid: "u1" })) {
      expect(html).toContain(line.split(" · ")[0]);
    }
    expect(html).toContain("PAGE · /queries");
    expect(html).toContain(esc(FEEDBACK_PRIVACY_NOTE));
  });

  /**
   * ⚠️ NEVER PAGE CONTENT. The dock may send the route, the viewport, the user agent and the uid —
   * and nothing a writer has typed anywhere else in the app.
   */
  it("captures nothing from the page it is sitting on", () => {
    const source = read("FeedbackDock.tsx");
    for (const forbidden of ["document.body", "innerText", "innerHTML", "querySelectorAll", "localStorage"]) {
      expect(source).not.toContain(forbidden);
    }
  });

  /** A failed send keeps the words — they are the one thing the writer cannot get back. */
  it("does not clear the message on failure", () => {
    const source = read("FeedbackDock.tsx");
    const failure = source.slice(source.indexOf("} catch (e)"));
    expect(failure).not.toContain('setMessage("")');
  });
});

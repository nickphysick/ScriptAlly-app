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
import { WorkspaceShell } from "./WorkspaceShell";
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

/**
 * ⚠️ THE BAR IS ASSERTED AS RENDERED, NOT AS WRITTEN. Where the pill ends up among the bar's other
 * controls is an ARRANGEMENT claim, and a source lock answers it only by accident — it reads the
 * order the JSX happens to be typed in, which survives no refactor and proves nothing about a
 * control rendered behind a gate. This renders the shell and reads the markup.
 */
const bar = (wired: boolean): string =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/queries"]}>
      <WorkspaceShell
        sections={[]}
        icons={{}}
        onNavigatePath={() => {}}
        onOpenSearch={() => {}}
        onOpenHelp={() => {}}
        onOpenFeedback={wired ? () => {} : undefined}
      >
        content
      </WorkspaceShell>
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
  /**
   * ⚠️ RETARGETED, AND THE LAW IS UNCHANGED (feedback pack). This case used to read "shows only its
   * button until it is opened" and asserted the dock rendered `FEEDBACK_FAB`. The law it was
   * really holding is *a beta has a visible, labelled route to the panel, and the panel does not
   * exist until it is asked for* — and that law survives the move: the button became a labelled
   * pill in the workspace top bar, so the claim is now asserted where the control lives.
   *
   * Both halves are pinned on purpose. Asserting only the retirement would go green on a build
   * that had lost the control altogether, which is the one outcome a beta cannot afford.
   */
  it("draws nothing until it is opened — the dock is the PANEL now, not a button", () => {
    const closed = dock(false);
    /* ⚠️ THE PRECONDITION FIRST. A closed dock renders an empty string, and `not.toContain` on ""
       passes for the wrong reason forever — so state that it is empty rather than inferring it. */
    expect(closed).toBe("");
    expect(dock(true)).toContain('role="dialog"');
  });

  it("its floating button is retired, and the bar carries the labelled control instead", () => {
    const source = read("FeedbackDock.tsx");
    expect(source, "the FAB was a puck hovering over the reader's work").not.toMatch(/["\s`]sa-fbfab["\s`]/);
    expect(read("betaChrome.css")).not.toMatch(/\.sa-fbfab[\s{,:]/);

    /* THE NEW HOME. Labelled, because a bare pencil among three glyphs is a control nobody
       presses; and left of the divider, so it reads as the reader's action rather than as one
       more piece of system furniture in the icon cluster. */
    const html = bar(true);
    expect(html).toContain('class="ws-fbpill"');
    expect(html).toContain("Feedback");
    /* The accessible name is on the BUTTON, not the label span, so it survives the narrow state
       where the CSS folds the label away and only the pencil is left. */
    expect(html).toContain(`aria-label="${FEEDBACK_FAB}"`);
    expect(FEEDBACK_FAB).toBe("Give feedback");

    const cluster = html.indexOf('class="ws-bright"');
    expect(cluster, "the bar must draw its right-hand cluster").toBeGreaterThan(-1);
    const order = (needle: string) => {
      const i = html.indexOf(needle, cluster);
      expect(i, `the rendered bar must contain ${needle}`).toBeGreaterThan(-1);
      return i;
    };
    expect(order('class="sp-search"')).toBeLessThan(order('class="ws-fbpill"'));
    expect(order('class="ws-fbpill"')).toBeLessThan(order('class="ws-bdiv"'));
    expect(order('class="ws-bdiv"')).toBeLessThan(order('class="sp-help"'));
  });

  /**
   * ⚠️ THE HANDLER MOVED HOUSE; IT DID NOT CHANGE. The pill toggles the SAME `feedbackOpen` the
   * FAB toggled and the beta strip sets — one state, three ways in. A second piece of state here
   * would give the app two feedback panels that disagree about whether one is open.
   */
  it("the pill and the strip open the same panel, from the same state", () => {
    const app = read("AppShell.tsx");
    expect(app).toContain("onOpenFeedback={() => setFeedbackOpen((o) => !o)}");
    expect(app).toContain("feedbackOpen={feedbackOpen}");
    expect(app).toContain("onReport={() => setFeedbackOpen(true)}");
    expect(app).toContain("open={feedbackOpen}");
    /* ⚠️ ABSENT RATHER THAN INERT when nothing is wired: a feedback button that opens nothing
       collects the report the writer believes they have sent. Asserted on the RENDERED bar, so it
       holds however the gate is written — and the wired case above is what stops this passing on
       a build that simply lost the control. */
    const unwired = bar(false);
    expect(unwired).toContain('class="ws-bright"');
    expect(unwired).not.toContain("ws-fbpill");
    expect(unwired).not.toContain("ws-bdiv");
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

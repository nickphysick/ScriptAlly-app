/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The capture fork — three options, one open reveal, and a primary whose label follows the choice.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  CAPTURE_OPTIONS, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_LATER, capturePrimaryLabel,
  TEMPLATE_TASTER_NOTE,
} from "../../lib/captureFork";

import { CaptureFork } from "./CaptureFork";

const noop = () => {};

/** ⚠️ RENDERED HTML ESCAPES THE APOSTROPHE. Half this copy contains one ("doesn't", "I've"), so a
 *  raw `toContain` against the constant fails on correct output — the assertion has to compare
 *  what the renderer actually writes. */
const esc = (copy: string) => copy.replace(/'/g, "&#x27;");
const fork = (selected: (typeof CAPTURE_OPTIONS)[number]) =>
  renderToStaticMarkup(
    <CaptureFork
      selected={selected}
      onSelect={noop}
      onChooseFile={noop}
      onUploadTemplate={noop}
      onNothingYet={noop}
      onOpenImportDesk={noop}
      onDownloadTemplate={noop}
    />,
  );

describe("the fork's copy", () => {
  /**
   * ⚠️ THE HEADING ASKS, IT DOES NOT INSTRUCT. Three genuinely different ways of doing the same
   * thing need a question above them; a heading like "Import your list" would already have chosen.
   */
  it("asks the question rather than naming one of the answers", () => {
    expect(CAPTURE_HEADING).toContain("How shall we capture");
    for (const key of CAPTURE_OPTIONS) {
      expect(CAPTURE_HEADING).not.toContain(CAPTURE_CHOICES[key].title);
    }
  });

  /**
   * ⚠️ EVERY OPTION STATES ITS COST. The template is only a real alternative if the writer can see
   * that it does not spend the taster; without that, they read two upload paths and pick the
   * cleverer-sounding one.
   */
  it("gives every option a cost tag and a fit tag", () => {
    for (const key of CAPTURE_OPTIONS) {
      const kinds = CAPTURE_CHOICES[key].tags.map((t) => t.kind);
      expect(kinds).toContain("cost");
      expect(kinds).toContain("fit");
    }
  });

  /** ⚠️ THE APP REPORTS; IT NEVER APPRAISES. "Best for" describes the sheet, not the writer. */
  it("never grades the writer", () => {
    for (const key of CAPTURE_OPTIONS) {
      const copy = `${CAPTURE_CHOICES[key].desc} ${CAPTURE_CHOICES[key].tags.map((t) => t.label).join(" ")}`;
      expect(copy).not.toMatch(/\b(serious|committed|proper|only if|just a|merely)\b/i);
    }
  });

  /**
   * ⚠️ THE PRIMARY SAYS WHAT IT WILL DO. A fixed "Continue" would send a writer who chose "by hand"
   * into a file picker.
   */
  it("changes the primary's label with the choice", () => {
    const labels = CAPTURE_OPTIONS.map(capturePrimaryLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("the rendered fork", () => {
  it("offers all three as radios in one group", () => {
    const html = fork("smart");
    expect(html).toContain('role="radiogroup"');
    expect((html.match(/role="radio"/g) ?? []).length).toBe(CAPTURE_OPTIONS.length);
    for (const key of CAPTURE_OPTIONS) expect(html).toContain(CAPTURE_CHOICES[key].title);
  });

  /**
   * ⚠️ RADIO SEMANTICS, NOT `aria-pressed`. Three toggles that happen to be one-on-two-off is not
   * what a screen reader should be told about a single choice out of three.
   */
  it("marks exactly one as checked, and never uses aria-pressed", () => {
    const html = fork("template");
    expect((html.match(/aria-checked="true"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("aria-pressed");
  });

  it("opens only the selected option's reveal", () => {
    expect(fork("template")).toContain(esc(TEMPLATE_TASTER_NOTE));
    expect(fork("smart")).not.toContain(esc(TEMPLATE_TASTER_NOTE));
  });

  /**
   * ⚠️ THE FOOTER PRIMARY IS THE CARD'S, NOT THE FORK'S — so this asserts the fork does NOT draw a
   * second one. Two primaries on one screen is the fault the Smart Import hero already had once,
   * where a cue inside the panel read louder than the actual button beneath it.
   */
  it("draws no primary of its own", () => {
    for (const key of CAPTURE_OPTIONS) {
      expect(fork(key)).not.toContain(esc(capturePrimaryLabel(key)));
    }
  });

  /**
   * ⚠️ A TEXT LINK, NEVER A FOURTH CARD. Offered as a peer, "nothing to capture yet" reads as a
   * fourth way of capturing a list — and a writer with no list would be choosing between four
   * things when they have nothing to choose between.
   */
  it("offers the quiet exit outside the radiogroup", () => {
    const html = fork("smart");
    expect(html).toContain(esc(CAPTURE_LATER));
    const group = html.slice(html.indexOf('role="radiogroup"'));
    const exit = group.indexOf(esc(CAPTURE_LATER));
    const groupEnd = group.indexOf("</div>", group.lastIndexOf('role="radio"'));
    expect(exit).toBeGreaterThan(groupEnd);
  });

  /** The Import desk stays reachable for a sheet with columns none of the three routes suit. */
  it("keeps the column-matching escape hatch beneath the card", () => {
    expect(fork("smart")).toContain("match them up yourself");
  });
});

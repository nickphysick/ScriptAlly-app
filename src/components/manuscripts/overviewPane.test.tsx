/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Overview: the pitch and the synopsis ═══════════════════════════════════
 *
 * ⚠️ THE STAT ROW AND `Who holds what` ARE GONE FROM THIS PANE (amendment 2), and their locks with
 * them — deliberately, not by omission. Three of the five figures are the HERO's cells now and are
 * asserted in `bookProfile.test.tsx`; the holdings table is "Out with agents now" on Journey, where
 * `journeyPane.test.tsx` already covers it. The `still open + closed = queries sent` property is not
 * lost so much as no longer claimed: the page states neither figure, so there is nothing to
 * reconcile. The two journey sums are untouched and still locked as properties.
 *
 * ⚠️ WHAT THIS FILE IS FOR NOW IS THE PLACEHOLDER. A click-to-edit block whose placeholder is
 * rendered as TEXT CONTENT gets saved by the first writer who clicks in and out again — the trap
 * this pane was built to be structurally immune to.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OverviewPane } from "./OverviewPane";
import {
  PITCH_PLACEHOLDER, SYNOPSIS_PLACEHOLDER, SYNOPSIS_NOTE, pitchMeta, synopsisMeta,
} from "../../lib/manuscriptProfile";

const pane = (over: Partial<React.ComponentProps<typeof OverviewPane>> = {}) =>
  renderToStaticMarkup(
    <OverviewPane
      pitch="A fly that shouldn't exist."
      pitchMeta={pitchMeta("A fly that shouldn't exist.")}
      onSavePitch={() => {}}
      synopsis="Murphy finds the fly."
      synopsisMeta={synopsisMeta("Murphy finds the fly.")}
      onSaveSynopsis={() => {}}
      {...over}
    />,
  );

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ THE PLACEHOLDER IS NEVER PERSISTED, AND IT IS STRUCTURAL", () => {
  /**
   * The guarantee is not a check somebody remembered to write — it is that the placeholder reaches
   * the field through the browser's own `placeholder` ATTRIBUTE. It is never in `value`, never in
   * the element's text content, and there is no code path from it to `onCommit`.
   */
  it("renders as an attribute, never as content", () => {
    const html = pane({ pitch: null, pitchMeta: null });
    expect(html).toContain(`placeholder="${PITCH_PLACEHOLDER.replace(/'/g, "&#x27;")}"`);
    // …and NOT between the tags, which is the form that gets saved.
    expect(html).not.toContain(`>${PITCH_PLACEHOLDER}<`);
  });

  /**
   * ⚠️ ASSERTED TWO WAYS, BECAUSE THIS REPO HAS NO DOM. `vitest.config.ts` is `environment: "node"`,
   * so the hook cannot run and a blur cannot be fired; what CAN be proved is that the placeholder is
   * not in the field's value on a real render, and that no code path carries it to `onCommit`.
   */
  it("leaves the field's value empty — the prompt is not in it", () => {
    const html = pane({ pitch: null, pitchMeta: null });
    const field = /<textarea[^>]*aria-label="Elevator pitch"[^>]*>([\s\S]*?)<\/textarea>/.exec(html);
    expect(field, "the pitch field is not on the page").toBeTruthy();
    /* A textarea's value is its CHILD TEXT in static markup. Empty is the whole claim. */
    expect(field![1]).toBe("");
    expect(field![0]).toContain("placeholder=");
  });

  it("carries the placeholder nowhere near the commit", () => {
    const src = readFileSync(join(__dirname, "..", "containers", "InlineText.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    /* The draft starts from the STORED value and from nothing else… */
    expect(src).toContain('useState(value ?? "")');
    expect(src).toContain('setDraft(value ?? "")');
    /* …and the commit sends the draft. `placeholder` is read once, as an attribute, and never
       assigned to state or passed to a handler. */
    expect(src).toContain("onCommit(draft.trim())");
    const uses = [...src.matchAll(/placeholder/g)].length;
    expect(uses, "placeholder is referenced more than as a prop and an attribute").toBeLessThanOrEqual(4);
    expect(src).not.toMatch(/setDraft\([^)]*placeholder/);
    expect(src).not.toMatch(/onCommit\([^)]*placeholder/);
  });

  /** ⚠️ NOT A `contenteditable`, ANYWHERE IN THE PRIMITIVE — the whole trap lives in that element. */
  it("uses no contenteditable", () => {
    const src = readFileSync(join(__dirname, "..", "containers", "InlineText.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src.toLowerCase()).not.toContain("contenteditable");
    expect(src).toContain("<textarea");
  });

  /** ⚠️ AND IT IS NOT COUNTED. The meta measures the stored text; an unwritten pitch has no count. */
  it("counts no placeholder words", () => {
    expect(pitchMeta(null)).toBeNull();
    expect(synopsisMeta(null)).toBeNull();
    expect(pitchMeta("")).toBeNull();
    /* The prompt is a sentence of its own; nothing must ever report its length as the pitch's. */
    expect(pitchMeta(null) ?? "").not.toContain("word");
    expect(synopsisMeta(PITCH_PLACEHOLDER), "the prompt was measured as if it were content")
      .not.toBe(pitchMeta(null));
  });

  it("says so in the meta rather than stating a count of nought", () => {
    const html = pane({ pitch: null, pitchMeta: null, synopsis: null, synopsisMeta: null });
    expect(html.match(/Not written yet/g)).toHaveLength(2);
    expect(html).not.toContain("0 words");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the pitch has no container", () => {
  it("is two quotation marks and the words between them", () => {
    const html = pane();
    expect(html.match(/msp-qmark/g)).toHaveLength(2);
    expect(html).toContain("msp-qmark close");
    /* ⚠️ NO CAPPED CARD. The cap grammar is for panels of derived figures; this is the one thing on
       the page the writer composed. */
    expect(html).not.toContain("sa-card");
    expect(html).not.toContain("sa-cap--");
  });

  it("hides the marks from the accessibility tree — they are punctuation, not content", () => {
    const marks = [...pane().matchAll(/<span class="msp-qmark[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(marks).toHaveLength(2);
    for (const m of marks) expect(m).toContain('aria-hidden="true"');
  });

  it("names the field for a screen reader, since the marks cannot", () => {
    expect(pane()).toContain('aria-label="Elevator pitch"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the synopsis", () => {
  it("is a bordered box, clamped, with a way to open it", () => {
    const html = pane();
    expect(html).toContain("msp-synbox");
    expect(html).toContain("msp-synclamp");
    expect(html).toContain(">Expand<");
  });

  /** Nothing written → nothing to expand. A toggle over an empty box would do nothing visible. */
  it("offers no expand control when there is nothing to clamp", () => {
    expect(pane({ synopsis: null, synopsisMeta: null })).not.toContain("msp-synmore");
  });

  /**
   * ⚠️ IT ASSERTS NO RELATIONSHIP TO THE PACKAGES SYNOPSIS MATERIALS, AND THAT IS THE POINT. Whether
   * this is the master the "One-page" and "Two-page" materials derive from, or a separate scratch
   * copy, is an OPEN QUESTION. The footnote says "working copy" and names where the sent ones are
   * built; it claims neither answer, so neither has to be unpicked later.
   */
  it("claims no master/derived relationship in its own words", () => {
    expect(pane()).toContain(SYNOPSIS_NOTE);
    for (const word of ["master", "derived", "source of", "generated from", "synced"]) {
      expect(SYNOPSIS_NOTE.toLowerCase(), word).not.toContain(word);
    }
  });

  it("has its own placeholder, distinct from the pitch's", () => {
    expect(SYNOPSIS_PLACEHOLDER).not.toBe(PITCH_PLACEHOLDER);
    expect(pane({ synopsis: null, synopsisMeta: null })).toContain('aria-label="Synopsis"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("what left this pane", () => {
  /** ⚠️ ONE FACT, ONE HOME. `Out with agents now` on Journey is the same table. */
  it("no longer tables who holds what", () => {
    const html = pane();
    expect(html).not.toContain("Who holds what");
    expect(html).not.toContain("<table");
  });

  it("no longer states the five-figure stat row", () => {
    const html = pane();
    for (const label of ["Queries sent", "Responses", "Still open", "Closed", "Agents holding"]) {
      expect(html, `${label} is still on Overview`).not.toContain(label);
    }
  });

  /** ⚠️ THE PITCH IS EDITABLE NOW, AND ONLY BECAUSE THE RULES CARRY THE FIELD. */
  it("is editable because firestore.rules allowlists elevatorPitch", () => {
    const rules = readFileSync(join(__dirname, "..", "..", "..", "firestore.rules"), "utf8");
    const block = [...rules.matchAll(/hasOnly\(\[([\s\S]*?)\]/g)]
      .map((m) => m[1]).find((b) => b.includes("'bookVersions'"));
    expect(block, "the manuscript update allowlist moved — re-find it").toBeTruthy();
    expect(block, "elevatorPitch left the allowlist — the pitch editor now fails in silence")
      .toContain("'elevatorPitch'");
    expect(block, "synopsis left the allowlist — the synopsis editor now fails in silence")
      .toContain("'synopsis'");
  });
});

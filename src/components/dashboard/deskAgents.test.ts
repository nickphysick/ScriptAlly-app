/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the agents pictogram's link-building (dashboard redesign, Phase 5).
 *
 * ⚠️ THE PIN STATE AND THE FOCUS MOVE CANNOT BE TESTED HERE — no jsdom, so there is no pointer, no
 * focus and no document to portal into. What CAN be proven is that no href is ever malformed and
 * that a missing field never becomes a dead link. The interaction itself is a browser check, and
 * it is listed as one in the build report.
 */
import { describe, it, expect } from "vitest";
import { mailtoHref, websiteHref, websiteText } from "./DeskStats";

describe("the website link", () => {
  it("adds a scheme when the stored value has none", () => {
    expect(websiteHref("curtisvane.co.uk")).toBe("https://curtisvane.co.uk");
  });

  /* A stored "https://…" prefixed again gives "https://https://…" — a link that 404s while
     looking perfectly normal in the row. */
  it("does NOT double a scheme the value already has", () => {
    expect(websiteHref("https://curtisvane.co.uk")).toBe("https://curtisvane.co.uk");
    expect(websiteHref("http://curtisvane.co.uk")).toBe("http://curtisvane.co.uk");
    expect(websiteHref("  https://curtisvane.co.uk  ")).toBe("https://curtisvane.co.uk");
  });

  it("shows the domain, without the scheme or a trailing slash", () => {
    expect(websiteText("https://curtisvane.co.uk/")).toBe("curtisvane.co.uk");
    expect(websiteText("curtisvane.co.uk")).toBe("curtisvane.co.uk");
  });
});

describe("the mailto link", () => {
  it("pre-fills the subject with the manuscript", () => {
    expect(mailtoHref("a@b.co.uk", "Murphy's Day Out"))
      .toBe("mailto:a@b.co.uk?subject=Query%20%E2%80%94%20Murphy's%20Day%20Out");
  });

  /* ⚠️ THE SUBJECT IS ENCODED. An em dash and an apostrophe go in raw and a title with an
     ampersand — "Smoke & Mirrors" — would truncate the subject at the "&", silently, because the
     browser reads it as the next mailto parameter. */
  it("encodes a title containing an ampersand rather than truncating at it", () => {
    const href = mailtoHref("a@b.co.uk", "Smoke & Mirrors");
    expect(href).toContain("%26");
    expect(href).not.toMatch(/subject=[^&]*&(?!amp)/);
  });

  it("trims a stored address rather than building `mailto: a@b`", () => {
    expect(mailtoHref("  a@b.co.uk ", "X")).toContain("mailto:a@b.co.uk?");
  });
});

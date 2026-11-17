/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `StatusDot` — the ring set (v21 §9, with status marks v3's seal and arrows), asserted as a
 * COMPOSITION rather than as ten drawings. The v3 paths themselves are locked against the
 * reference in statusMarksV3.test.tsx.
 *
 * ⚠️ THE SET'S WHOLE VALUE IS THAT IT IS A GRAMMAR, so the assertions are about the grammar: a
 * dashed ring means the agent has asked for something, a solid one that you have sent it, and the
 * centre says what it is about. Pinning ten `d` attributes would go red on any legitimate retune of
 * the geometry and would say nothing about whether the set still composes.
 *
 * There is no jsdom in this repo (`environment: "node"`), so these render to a string and read the
 * markup — which is exactly the right artefact here, because the claim IS the markup.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../types";
import { StatusDot } from "./StatusDot";
import { SD_INK, SD_RING, SD_STROKE, SD_VIEWBOX } from "../test/statusDotSignature";

const draw = (status: QueryStatus, over: Partial<React.ComponentProps<typeof StatusDot>> = {}) =>
  renderToStaticMarkup(<StatusDot status={status} {...over} />);

/** The shapes the mark is made of, read back off the rendered svg. */
const parts = (html: string) => ({
  ring: html.includes(SD_RING),
  dashed: html.includes('stroke-dasharray="6 4"'),
  half: /<path d="M12 12L12 5\.5A6\.5 6\.5 0 0 1 12 18\.5Z"/.test(html),
  full: html.includes('<circle cx="12" cy="12" r="6.5"'),
  bar: html.includes('d="M7.5 12h9"'),
  /* status marks v3 — the star seal (Offer, Signed) and the recycle arrows (R&R); the paths are held
     to the reference in statusMarksV3.test.tsx, so here only their presence is read */
  seal: /<path d="M12\.00 2\.40A[^"]*"[^>]*fill-rule="evenodd"/.test(html),
  arrows: html.includes('d="M7.63 10.6A4.76 4.76 0 0 1 16.2 9.76"'),
});

describe("the ring set is a grammar, and each status is a sentence in it", () => {
  it("dashed means asked for, solid means sent; the centre says what it is about", () => {
    const table: [QueryStatus, ReturnType<typeof parts>][] = [
      [QueryStatus.QUERIED, { ring: true, dashed: false, half: false, full: false, bar: false, seal: false, arrows: false }],
      [QueryStatus.PARTIAL_REQUESTED, { ring: true, dashed: true, half: true, full: false, bar: false, seal: false, arrows: false }],
      [QueryStatus.PARTIAL_SENT, { ring: true, dashed: false, half: true, full: false, bar: false, seal: false, arrows: false }],
      [QueryStatus.FULL_REQUESTED, { ring: true, dashed: true, half: false, full: true, bar: false, seal: false, arrows: false }],
      [QueryStatus.FULL_SENT, { ring: true, dashed: false, half: false, full: true, bar: false, seal: false, arrows: false }],
      [QueryStatus.REVISE_RESUBMIT, { ring: true, dashed: false, half: false, full: false, bar: false, seal: false, arrows: true }],
      [QueryStatus.OFFER, { ring: false, dashed: false, half: false, full: false, bar: false, seal: true, arrows: false }],
      [QueryStatus.SIGNED, { ring: false, dashed: false, half: false, full: false, bar: false, seal: true, arrows: false }],
    ];
    for (const [status, want] of table) expect(parts(draw(status)), status).toEqual(want);
  });

  /**
   * ⚠️ REVISE & RESUBMIT WAS THE ONE GLYPH MOST EASILY CONFUSED WITH QUERIED (Nick, 21 Sep): until
   * status marks v3 the two were the same ring and only the dash told them apart. v3 gives R&R the
   * recycle arrows, so the claim is now that the ARROWS are the difference: take them out of R&R's
   * drawing and what is left is Queried's ring, and Queried carries no arrow and no dash.
   */
  it("⚠️ R&R and Queried share the ring, and the arrows are what tell them apart", () => {
    const rr = draw(QueryStatus.REVISE_RESUBMIT);
    const queried = draw(QueryStatus.QUERIED);
    expect(parts(rr).arrows, "R&R has lost its arrows — it is now indistinguishable from Queried").toBe(true);
    expect(parts(queried).arrows, "Queried has gained the arrows").toBe(false);
    expect(queried, "Queried has gained a dash").not.toContain("stroke-dasharray");
    /* ⚠️ THE EQUALITY IS ON THE DRAWING, NOT THE WHOLE MOUNT — the wrappers differ in `aria-label`
       and `title`, and must. */
    const svg = (html: string) => html.slice(html.indexOf("<svg"));
    expect(svg(rr).replace(/<path d="[^"]*" stroke-width="1\.8" stroke-linecap="round" stroke-linejoin="round"><\/path>/g, ""),
      "R&R and Queried differ by something other than the arrows").toBe(svg(queried));
  });

  it("all three closed statuses draw the one closed mark, and the drawing does not tell them apart", () => {
    const closed = [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN];
    const drawings = closed.map((s) => draw(s, { decorative: true }));
    for (const d of drawings) expect(parts(d)).toEqual({ ring: true, dashed: false, half: false, full: false, bar: true, seal: false, arrows: false });
    /* ⚠️ THE COLLAPSE IS DELIBERATE AND IS ASSERTED, so nobody "fixes" it by inventing a glyph */
    expect(new Set(drawings).size, "the three closed statuses have stopped sharing one mark").toBe(1);
    /* …and the NAME still tells them apart, which is what makes the collapse honest */
    const named = closed.map((s) => draw(s));
    expect(new Set(named).size, "a closed mark no longer carries its own accessible name").toBe(3);
    for (const s of closed) expect(draw(s)).toContain(`aria-label="${s}"`);
  });

  it("one ink stroke on a 24 viewBox, and the ghost is the same ring drained to grey", () => {
    const html = draw(QueryStatus.FULL_SENT);
    expect(html).toContain(SD_VIEWBOX);
    expect(html).toContain(SD_STROKE);
    expect(html).toContain(SD_INK);
    expect(draw(QueryStatus.FULL_SENT, { ghost: true })).toContain("color:#a99e90");
    /* the retired treatments are gone rather than merely unasserted */
    expect(html).not.toContain("border-radius:50%");
    expect(html).not.toContain("sa-statusdot__pulse");
  });

  it("the size a caller asks for is the size it gets, and the stroke does not thin with it", () => {
    for (const px of [12, 15, 30]) expect(draw(QueryStatus.QUERIED, { overrideSize: px })).toContain(`width:${px}px;height:${px}px`);
    /* ⚠️ THE STROKE IS 2 ON THE VIEWBOX AT EVERY SIZE — that is what keeps eleven rendered sizes
       looking like one family, and it is why a caller never passes a weight. */
    for (const px of [12, 30]) expect(draw(QueryStatus.QUERIED, { overrideSize: px })).toContain(SD_STROKE);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LH6 — the exhibition is a PICTURE: inert, and made from the page's sample constant alone.
 *
 * Two halves, because each catches what the other cannot. The SOURCE half forbids every way this
 * app reaches data (the store hook, Firestore, fetch, a listener) in the two exhibit modules and in
 * the band wrapper; the RENDER half renders each band and requires that every name it draws is one
 * the constant declares, that the band is `inert` and `aria-hidden`, and that nothing in it is a
 * link. The rendered page repeats the check in the browser (livingHeaders.measure.ts), with the
 * network watched.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcExhibit, QC_SAMPLE_AGENTS, QC_SAMPLE_ROWS, QC_EXHIBIT_ROWS } from "../queries/centre/QcExhibit";
import { ContactExhibit, CONTACT_SAMPLE_AGENTS, CONTACT_EXHIBIT_ROWS } from "../agents/contact/ContactExhibit";
import { sortRows, DEFAULT_SORT } from "../../lib/qcSummary";

describe("LH6 · the exhibition reads nothing but its constant (render)", () => {
  const qc = renderToStaticMarkup(<QcExhibit />);
  const cl = renderToStaticMarkup(<ContactExhibit />);

  it("the band is inert, hidden from assistive tech, and holds no link", () => {
    for (const h of [qc, cl]) {
      expect(h).toMatch(/data-lh="band"[^>]*aria-hidden="true"[^>]*inert=""|data-lh="band"[^>]*inert=""[^>]*aria-hidden="true"/);
      /* from the band on — React 19's SSR prepends an image preload `<link href>` to the whole string */
      const band = h.slice(h.indexOf('data-lh="band"'));
      expect(h.indexOf('data-lh="band"')).toBeGreaterThan(-1);
      expect(band).not.toMatch(/<a[\s>]/);
      expect(band).not.toContain("href=");
    }
  });

  /* ⚠️ READ OUT OF THE ROWS THEMSELVES, NEVER THE WHOLE MARKUP: the Birds-eye rail draws the same
     names, so a `toContain` over the band stays green when a ledger row is swapped for a live one. */
  it("the Query Centre ledger draws exactly the constant's first rows, in order", () => {
    const want = sortRows(QC_SAMPLE_ROWS, DEFAULT_SORT).slice(0, QC_EXHIBIT_ROWS).map((r) => r.agentName);
    const ledger = qc.slice(qc.indexOf('data-qcv="list"'), qc.indexOf('data-qcv="railcal"'));
    expect(qc.indexOf('data-qcv="list"')).toBeGreaterThan(-1);
    const drawn = [...ledger.matchAll(/class="qcv-row-nm">([^<]+)</g)].map((m) => m[1]);
    expect(drawn).toEqual(want);
    for (const nm of drawn) expect(QC_SAMPLE_AGENTS.map((a) => a.name)).toContain(nm);
  });

  it("the Contact list rows are the constant's agents, and only its", () => {
    const ids = [...cl.matchAll(/data-agent-card="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBe(CONTACT_EXHIBIT_ROWS);
    for (const id of ids) {
      const a = CONTACT_SAMPLE_AGENTS.find((x) => x.id === id);
      expect(a, `a row the constant does not declare: ${id}`).toBeTruthy();
      expect(cl).toContain(a!.name);
    }
  });
});

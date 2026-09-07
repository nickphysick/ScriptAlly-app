/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * READ AND EDIT MUST AGREE, FIELD FOR FIELD.
 *
 * ⚠️ THE FAILURE THIS FORECLOSES IS A FIELD YOU CAN EDIT AND CANNOT SEE. A writer opens the
 * drawer, types a city, presses Save, and the read view never mentions it — so they have no way
 * to tell whether it took, and the only remaining check is to press Edit again and look at the
 * input. That is the app being unable to show someone their own record.
 *
 * ⚠️ BOTH SETS ARE DERIVED FROM RENDERED OUTPUT, NEVER LISTED. An assertion whose expected value
 * is written by hand tests the hand that wrote it, and one that derives its expectation from the
 * thing under test cannot fail at all. So the EDIT set comes from rendering `AgentEditor`'s
 * Contact tab and collecting `data-field`; the READ set comes from rendering the drawer's read
 * view and doing the same; and the two are compared in BOTH directions. Neither side can satisfy
 * the check by being empty, because the population is asserted first.
 *
 * ⚠️ A ROW THAT SHOWS TWO FIELDS DECLARES BOTH TOKENS. "Based in" is one sentence over `country`
 * and `city`, which the editor asks for separately; `data-field="country city"` is what keeps the
 * comparison honest rather than forcing the read view to draw two rows it does not want.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentEditor } from "./AgentEditor";
import { ContactPeek } from "./ContactPeek";
import { AgentDrawer } from "./AgentDrawer";
import { CONTACT_FIXTURE_AGENTS } from "./contactFixture";
import { draftFromAgent } from "../../lib/agentDraft";

const agent = CONTACT_FIXTURE_AGENTS[0];

/** Every `data-field` token in a fragment of markup, as a set. Space-separated = several. */
const fields = (html: string): Set<string> => {
  const out = new Set<string>();
  for (const m of html.matchAll(/data-field="([^"]+)"/g)) {
    for (const token of m[1].split(/\s+/).filter(Boolean)) out.add(token);
  }
  return out;
};

const editHtml = renderToStaticMarkup(
  <AgentEditor
    draft={draftFromAgent(agent)}
    onChange={() => {}}
    tab="contact"
    onTab={() => {}}
    onDone={() => {}}
    onDiscard={() => {}}
    dirty={false}
    error={null}
    onImageError={() => {}}
    isNew={false}
    hasActiveQueries={false}
    notes={[]}
    notesLoaded
    onPostNote={() => {}}
    onDeleteNote={() => {}}
    onPinNote={() => {}}
  />,
);

const readHtml = renderToStaticMarkup(
  <AgentDrawer
    agent={agent}
    open
    tab="contact"
    onTab={() => {}}
    editing={false}
    onEdit={() => {}}
    onClose={() => {}}
    onStep={() => {}}
    canStepBack={false}
    canStepOn={false}
    position={{ index: 0, total: 1 }}
    matchGenre={null}
    editor={null}
    onLogQuery={() => {}}
  />,
);

describe("the Contact tab's field sets", () => {
  const edit = fields(editHtml);
  const read = fields(readHtml);

  it("both sides render enough fields to be a comparison at all", () => {
    expect(edit.size, "the editor rendered no tagged fields — the comparison below would be vacuous").toBeGreaterThan(6);
    expect(read.size, "the read view rendered no tagged fields").toBeGreaterThan(6);
  });

  it("every field the editor offers has a row in the read view", () => {
    const missing = [...edit].filter((f) => !read.has(f)).sort();
    expect(missing, "a writer can edit these and cannot see them afterwards").toEqual([]);
  });

  it("and every row in the read view is a field the editor offers", () => {
    const extra = [...read].filter((f) => !edit.has(f)).sort();
    expect(extra, "the read view states something the editor cannot set — either it is stale, or the field is unreachable").toEqual([]);
  });
});

describe("the peek owns its five rows, and the drawer appends rather than re-implementing", () => {
  const peek = fields(renderToStaticMarkup(<ContactPeek agent={agent} />));

  it("the peek carries how to reach them", () => {
    for (const f of ["email", "website", "country", "city", "submissionMethod", "socials"]) {
      expect(peek.has(f), `${f} left the peek`).toBe(true);
    }
  });

  /* ⚠️ THE THREE APPENDED ROWS ARE NOT THE PEEK'S. It renders in two containers with no room for
     them, and folding them in would put "typical response" on a popover anchored to a list row. */
  it("what the drawer appends is NOT in the peek", () => {
    for (const f of ["responseTimeWeeks", "noResponseMeansNo", "submissionStatus"]) {
      expect(peek.has(f), `${f} was folded into the peek — the popover has no room for it`).toBe(false);
    }
  });

  /* the whole point of one component: the drawer's Contact tab contains the peek's own markup */
  it("the drawer's read view CONTAINS the peek rather than restating it", () => {
    expect(readHtml).toContain('class="agl-peek agl-peek--drawer"');
    for (const f of ["email", "website", "country city", "submissionMethod", "socials"]) {
      expect(readHtml, `${f} is not rendered through ContactPeek`).toContain(`data-field="${f}"`);
    }
  });
});

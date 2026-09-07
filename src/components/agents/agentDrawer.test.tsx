/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drawer's behaviour — mode, the draft's lifetime, and what the chevrons do mid-edit.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AgentDrawer } from "./AgentDrawer";
import { CONTACT_FIXTURE_AGENTS } from "./contactFixture";
import { stripComments } from "../../lib/styleWiring";

const agent = CONTACT_FIXTURE_AGENTS[0];
const list = readFileSync(new URL("./AgentList.tsx", import.meta.url), "utf8");
const drawerSrc = readFileSync(new URL("./AgentDrawer.tsx", import.meta.url), "utf8");

const draw = (over: Partial<React.ComponentProps<typeof AgentDrawer>> = {}) =>
  renderToStaticMarkup(
    <AgentDrawer
      agent={agent} open tab="contact" onTab={() => {}} editing={false}
      onEdit={() => {}} onClose={() => {}}
      onStep={() => {}} canStepBack canStepOn position={{ index: 1, total: 7 }}
      matchGenre={null} editor={<div id="the-editor" />} onLogQuery={() => {}}
      {...over}
    />,
  );

describe("read is the default", () => {
  it("opens in read, with Edit in the footer and no editor mounted", () => {
    const html = draw();
    expect(html).toContain(">Edit<");
    expect(html, "the editor is mounted in read mode").not.toContain('id="the-editor"');
  });

  /* ⚠️ WHILE EDITING THE DRAWER IS A CONTAINER AND NOTHING ELSE. `AgentEditor` is a complete form
     — identity head with the avatar picker and the star control, its own four tabs, Done and
     Discard with the dirty confirmation — so a drawer head, a second tab row and a second pair of
     commit buttons drew the name twice, stacked two tablists and offered two ways to save. The
     second tablist was not merely untidy: it made a role-based query for a tab ambiguous, which
     is the accessibility tree saying the same thing. */
  it("editing hands the whole form over — no second head, no second tab row, no second Save", () => {
    const html = draw({ editing: true });
    expect(html).toContain('id="the-editor"');
    expect(html, "the drawer kept its own head over the form's").not.toContain("agl-dhead");
    expect(html, "the drawer kept its own tab row over the form's").not.toContain("agl-dtabs");
    expect(html, "the drawer kept a footer, so there are two ways to save").not.toContain("agl-dfoot");
    expect(html, "Edit is still offered while editing").not.toContain(">Edit<");
  });

  it("it is the shared SlideOver, not a fourth private drawer", () => {
    expect(drawerSrc).toContain('from "../shared/SlideOver"');
    expect(stripComments(drawerSrc), "the drawer re-implements a scrim of its own").not.toMatch(/position:\s*fixed/);
  });
});

/**
 * ⚠️ THE CHEVRONS ARE DISABLED WHILE EDITING — the ruling, and it is a ruling rather than a
 * limitation. Stepping to the next agent mid-edit has exactly two honest outcomes, commit
 * silently or discard silently, and both are the app deciding something about a writer's work
 * that the writer did not say. Save and Cancel are one click away in the footer and both are
 * labelled; blocking the step commits nothing and discards nothing, structurally.
 */
describe("stepping between agents", () => {
  /* ⚠️ THE RULING STANDS AND IT IS NOW STRUCTURAL RATHER THAN A DISABLED ATTRIBUTE. Stepping to
     the next agent mid-edit has exactly two honest outcomes — commit silently or discard silently
     — and both are the app deciding something about a writer's work that the writer did not say.
     The chevrons live in the drawer's head, and the head is not rendered while editing, so the
     step is not merely refused: there is nothing to press. Done and Discard are in the form. */
  it("there are NO chevrons at all while editing — the step cannot be taken, not merely refused", () => {
    const html = draw({ editing: true });
    expect(html.match(/aria-label="(Previous|Next) agent"/g) ?? [], "a chevron survives mid-edit — stepping would commit or discard without being asked").toEqual([]);
  });

  it("and they are live in read mode, at both ends", () => {
    const html = draw();
    const chevrons = [...html.matchAll(/<button[^>]*aria-label="(Previous|Next) agent"[^>]*>/g)].map((m) => m[0]);
    expect(chevrons.every((c) => !c.includes("disabled")), "a chevron is dead in read mode").toBe(true);
  });

  /* ⚠️ IT NEVER WRAPS. At the ends the step is simply unavailable — wrapping would make the two
     ends indistinguishable from the middle, which is the same rule the card pager follows. */
  it("the ends are ends, not a loop", () => {
    expect(draw({ canStepBack: false }), "the first agent's back chevron is live").toMatch(/aria-label="Previous agent"[^>]*disabled|disabled[^>]*aria-label="Previous agent"/);
    expect(draw({ canStepOn: false })).toMatch(/aria-label="Next agent"[^>]*disabled|disabled[^>]*aria-label="Next agent"/);
  });

  /* ⚠️ THE ARROW KEYS READ THE SAME GUARD AS THE BUTTONS — one derivation, so the keyboard and
     the chevrons cannot come apart about whether the drawer is navigable. */
  it("the arrow keys are gated on the same expression, and stand down in a field", () => {
    expect(drawerSrc, "the keys still step mid-edit even though the chevrons are gone — the two must agree").toContain("if (editing) return;");
    expect(drawerSrc).toContain("if (back ? !canStepBack : !canStepOn) return;");
    expect(drawerSrc, "typing a letter in a field would move you to another agent").toContain('el.tagName === "INPUT"');
  });

  /* the order stepped through is the one on screen — not the underlying store */
  it("steps through the list's own order, filtered and sorted as shown", () => {
    expect(list).toContain("const drawerIndex = openId ? shown.findIndex((a) => a.id === openId) : -1;");
  });
});

/**
 * ⚠️ THE DRAFT IS THE EDIT SESSION. `draft !== null` is the only thing that says the drawer is in
 * edit mode, so the mode and the buffer cannot disagree — and because the PAGE owns it, it
 * survives a tab switch: the four tabs are a view onto one buffer, not four forms. A draft owned
 * by the drawer would be created fresh each time the tab changed, and a writer who typed a city,
 * looked at Materials and came back would find it gone.
 */
describe("the draft's lifetime", () => {
  const decl = stripComments(list);

  it("the page owns it, and the tab does not touch it", () => {
    expect(decl).toContain("const drawerAgent = openAgent ?? (newAgent && openId === newAgent.id ? newAgent : null);");
    expect(decl, "the drawer is passed an editor the page builds, so the buffer outlives a tab switch").toContain("editor={drawerAgent ? editorFor(drawerAgent) : null}");
    expect(decl, "changing tab clears the draft — a half-typed record would vanish on a glance at Materials").not.toMatch(/onTab=\{[^}]*setDraft/);
  });

  it("entering edit is the ONLY place a draft is created", () => {
    const creations = [...decl.matchAll(/setDraft\(draftFromAgent\(/g)];
    expect(creations.length, "a second path creates a draft, so two of them can be live at once").toBe(1);
  });

  /* ⚠️ DISCARDING MEANS TWO THINGS AND THE DIFFERENCE IS WHETHER THERE IS ANYTHING TO GO BACK TO.
     An edit to an EXISTING agent returns to read — the record is still there. An UNSAVED NEW agent
     has no read state, so the drawer closes and the draft card leaves. Both go through ONE
     expression, so Escape and the form's own Discard cannot disagree about which just happened. */
  it("discarding returns to READ on an existing agent, and closes on an unsaved new one", () => {
    expect(decl).toContain("const cancelEdit = useCallback(() => { setDraft(null); setError(null); }, []);");
    expect(decl).toContain("if (newAgent && openId === newAgent.id) { discard(); return; }");
    expect(decl, "the form's Discard closes the drawer even on an existing agent — there is a read view to return to").toContain("onDiscard={leaveEdit}");
    expect(decl, "Escape and Discard take different paths out of edit").toContain("leaveEdit();");
    expect(decl, "discarding writes").not.toMatch(/cancelEdit[^;]*updateAgent/);
  });

  /* ⚠️ ESCAPE STEPS OUT OF THE FORM; IT DOES NOT CLOSE THE RECORD. SlideOver has its own Escape
     and does not capture, so one press leaves edit and a second closes the drawer. Going straight
     from a half-typed form to a closed drawer is two dismissals for one key. */
  it("Escape leaves EDIT rather than closing the drawer", () => {
    expect(decl).toContain("if (!draft) return;");
    expect(decl).toContain("}, [draft, leaveEdit]);");
  });
});

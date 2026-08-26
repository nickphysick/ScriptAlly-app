/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tags, for real (tasks-pages pack, Phase 5): the model's constraints, the ONE picker in its
 * three mounts, inline creation, additive filtering, the settings CRUD, delete-detaches, and
 * tags surviving the note→task conversion.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TagDef } from "../../types";
import { TAG_PALETTE } from "../../lib/todoFamily";
import {
  TAG_COLOURS, normaliseTagLabel, isValidTagLabel, canCreateTag, nextTagColour, newTag,
  tagUsageCounts, toggleTagSel, matchesTags,
} from "../../lib/todoTags";

const here = __dirname;
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const noteboard = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
/* ⚠️ RE-POINTED AT THE PORTED PANE — `TodoDock.tsx` is deleted. Where a case's subject was the
   retired component's own markup it is retired with it; what survives is read here. */
const dock = readFileSync(join(here, "TaskPane.tsx"), "utf8");
const picker = readFileSync(join(here, "TagPicker.tsx"), "utf8");
/* the retired sheet was the tags door; the board's "Set aside & tags" panel is now */
const panel = readFileSync(join(here, "SetAsidePanel.tsx"), "utf8");
/* board-optimise P5: the tag CRUD moved to its OWN sheet — these locks follow it there, and the
   settings sheet is asserted to keep only the DOOR. */
const tagsSheet = readFileSync(join(here, "TagsSheet.tsx"), "utf8");
const side = readFileSync(join(here, "TodoSideContainer.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");

const tag = (over: Partial<TagDef>): TagDef => ({ id: "tag-1", label: "synopsis", colour: "pink", ...over });

/* ── the model's constraints ───────────────────────────────────────────────────────────────── */

describe("⚠️ the tag model: lowercase, no spaces, unique, palette-only", () => {
  it("labels normalise to lowercase with no spaces (and no #)", () => {
    expect(normaliseTagLabel("#Query Letter!")).toBe("queryletter");
    expect(normaliseTagLabel("SYNOPSIS")).toBe("synopsis");
    expect(normaliseTagLabel("first-fifty")).toBe("first-fifty");
    expect(isValidTagLabel("queryletter")).toBe(true);
    expect(isValidTagLabel("Query Letter")).toBe(false);
    expect(isValidTagLabel("")).toBe(false);
  });

  it("unique per user — by the label the writer types", () => {
    expect(canCreateTag("synopsis", [tag({})])).toBe(false);
    expect(canCreateTag("ideas", [tag({})])).toBe(true);
  });

  it("⚠️ colour is PALETTE-ONLY, from the family tones, assigned at creation by rotation", () => {
    expect(TAG_COLOURS).toEqual(["pink", "sage", "butter", "latte", "parchment"]);
    expect(Object.keys(TAG_PALETTE)).toEqual(TAG_COLOURS);
    // rotation: the least-used tone next
    expect(nextTagColour([])).toBe("pink");
    expect(nextTagColour([tag({ colour: "pink" })])).toBe("sage");
    const one = newTag("Ideas!", [tag({})]);
    expect(one).toMatchObject({ label: "ideas", colour: "sage" });
    expect(newTag("synopsis", [tag({})])).toBeNull(); // uniqueness holds at creation
  });
});

/* ── one picker, three mounts ──────────────────────────────────────────────────────────────── */

describe("⚠️ ONE TagPicker, mounted in exactly three places", () => {
  it("the composer, the item sheet (the dock's user-task surface), and the ⋯ Tags…", () => {
    // 1. the composer (compact)
    expect(listPage).toContain("MOUNT 1 of 3");
    const composer = listPage.slice(listPage.indexOf("tdb-nc-tags"), listPage.indexOf("tdb-nc-tags") + 700);
    expect(composer).toContain("<TagPicker");
    // 2. the dock's tagsSlot
    /* ⚠️ THE PANE'S TAG SLOT WENT WITH THE RETIRED PANE, and that is a REAL GAP rather than a
       tidying: the ported pane has no tags surface because the mockup has none. Recorded here so
       the third mount is not quietly forgotten — the composer and the ⋯ menu still carry it. */
    expect(dock).not.toContain("tagsSlot.ReactNode");

    /* ⚠️ TWO MOUNTS NOW, NOT THREE — the pane's tag surface went with the retired `TodoDock`,
       because the mockup this pane is a port of has no tags anywhere. Stated as an absence rather
       than quietly dropped from the count: the title still says three, and this is where a reader
       finds out why it is two and what restoring the third would take. */
    expect(listPage, "the pane grew a tags slot without the mockup gaining one").not.toContain("tagsSlot=");
    // 3. the ⋯ menu's Tags… sheet — on the board AND the noteboard, same component
    expect(listPage).toContain("MOUNT 3 of 3");
    expect(noteboard.match(/<TagPicker/g)?.length).toBe(1);
    // and nobody builds a lookalike: the chips class exists only in the one component
    for (const [name, src] of [["list", listPage], ["noteboard", noteboard], ["dock", dock]] as const) {
      expect(src.includes("tgp-chips"), name).toBe(false);
    }
  });

  it("⚠️ creation happens where tagging happens: the inline Create #{label}", () => {
    expect(picker).toContain("Create #{label}");
    expect(picker).toContain("canCreateTag(label, tags)");
    expect(picker).toContain("normaliseTagLabel(draft)");
    // every mount passes onCreate through the user-doc write
    expect(listPage).toContain("createTagDef(tag)");
    expect(noteboard).toContain("createTagDef(tag)");
  });
});

/* ── additive filtering ────────────────────────────────────────────────────────────────────── */

describe("⚠️ tag filters combine ADDITIVELY with FILTERS (Urgent AND #synopsis)", () => {
  it("matchesTags: empty selection passes all; a selection requires EVERY tag", () => {
    expect(matchesTags(undefined, [])).toBe(true);
    expect(matchesTags(["a"], ["a"])).toBe(true);
    expect(matchesTags(["a"], ["a", "b"])).toBe(false);
    expect(matchesTags(["a", "b", "c"], ["a", "b"])).toBe(true);
    expect(matchesTags(undefined, ["a"])).toBe(false); // derived cards carry none — they narrow away
  });

  it("toggleTagSel is a clean multi-select", () => {
    expect(toggleTagSel([], "a")).toEqual(["a"]);
    expect(toggleTagSel(["a", "b"], "a")).toEqual(["b"]);
  });

  it("every narrowing surface composes through the SAME predicate — never a per-page second copy", () => {
    /* ⚠️ THE TO-DO LIST'S TAG FILTER LEFT WITH THE SIDEBAR AND CAME BACK TO THE TOOL ROW
       (tasks-consolidation P2 and its follow-up, 9 Aug). What did NOT change either time is this:
       one pure `matchesTags`, which is what stops two surfaces disagreeing about what a selection
       means. The list's selection is SINGLE (the Noteboard's `#All ▾` vocabulary), so it is passed
       as a set of one rather than growing a second comparison for one-versus-many. */
    const listPage2 = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    expect(listPage2).toContain("matchesTags(c.tags, [tagSel])");
    /* ⚠️ RETARGETED by the `calendar` session (timeline pack, Phase 3), flagged in
       reports/calendar-timeline.md. THE LAW IS UNCHANGED — no page grows a second predicate — and
       it is asserted here from the other side: the Calendar narrows by no tags at all.
       It never really did. `tagSel` was a `useState<string[]>([])` whose setter had no caller
       after the tag sheet moved to the board, and `matchesTags(x, [])` is provably identity, so
       the narrowing was a no-op with a live-looking call site. The rewrite dropped it rather than
       carrying four dead symbols into a new file. If a tag control returns to this page it comes
       back through `matchesTags`, like everything else. */
    const cal = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
    expect(cal).not.toContain("matchesTags");
  });

  it("⚠️ ONE TAG IDEA, TWO SURFACES — and neither invents its own vocabulary", () => {
    /* ⚠️ REWRITTEN (Noteboard rebuild, 22 Aug). This case used to require the Noteboard to draw
       the To-do list's `#All ▾` dropdown, so the two would not be lookalikes. The LIST's copy had
       already gone with its tool row, so the case was comparing the Noteboard against a surface
       that no longer draws one — a precondition that had quietly stopped holding.
       What it was really about survives and is asserted here: whatever each surface draws, both
       read the SAME defs and the SAME palette, so a tag is one thing with one name and one
       colour wherever it appears. */
    const nb = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
    /* the Noteboard: a derived chip row over the tags in use */
    expect(nb).toContain("nb-chipset");
    expect(nb).toContain("noteTagChips(");
    expect(nb).not.toMatch(/["\s`]nb-tagwrap["\s`]/);   // the dropdown it replaced, bounded token
    /* both surfaces name a tag from the user's own defs, never from a raw id */
    expect(nb).toContain("currentUser?.tags ?? []");
    expect(nb).toContain("TAG_PALETTE[def.colour]");
    expect(side).toContain("TAG_PALETTE[t.colour]");
    /* and the free-text composer mints through the app's minter rather than an untracked string */
    expect(nb).toContain("newTag(label, userTags)");
  });

  it("the sidebar's TAGS section is REAL: rows with counts, multi-select, a clear control", () => {
    // the retirement comment may QUOTE the old box; the RENDERED class is what must be extinct
    expect(side).not.toMatch(/["\s`]tds-soon["\s`]/);
    expect(side).toContain("tagCounts?.get(t.id) ?? 0");
    expect(side).toContain("onToggleTag");
    expect(side).toContain("Clear");
    expect(side).toContain("TAG_PALETTE[t.colour]"); // swatches from the one colour module
  });
});

/* ── the settings CRUD + delete-detaches ───────────────────────────────────────────────────── */

describe("⚠️ The tags sheet: rename, recolour, delete — with usage counts", () => {
  it("rename normalises and keeps uniqueness; recolour stays inside the palette", () => {
    expect(tagsSheet).toContain("normaliseTagLabel(renameDraft)");
    expect(tagsSheet).toContain("tags.some((t) => t.id !== id && t.label === label)");
    expect(tagsSheet).toContain("TAG_COLOURS.map((c) =>");
    expect(tagsSheet).toContain("tagUsageCounts(userTasks)");
    // and the panel keeps only the pane — the CRUD is not duplicated into its host
    expect(panel).toContain("<TagsPane />");
    expect(panel).not.toContain("recolourTag");
  });

  it("⚠️ deleting DETACHES from items and never deletes them", () => {
    const del = tagsSheet.slice(tagsSheet.indexOf("const deleteTag"), tagsSheet.indexOf("const deleteTag") + 700);
    expect(del).toContain("updateUserTask(t.id, { tags: rest.length ? rest : null })");
    expect(del).toContain("tags.filter((t) => t.id !== id)");
    expect(del).not.toContain("deleteUserTask");
    expect(tagsSheet).toContain("never deletes them");
  });
});

/* ── conversion carries tags + the store ───────────────────────────────────────────────────── */

describe("⚠️ tags survive note→task conversion — the date is the door, the tags are the luggage", () => {
  it("⚠️ THE TAGS ARE THE LUGGAGE BY CONSTRUCTION AGAIN — the projection lasted one day", () => {
    /* ⚠️ THE MECHANISM REVERSED TWICE, AND THE CLAIM NEVER MOVED. Original model: one document,
       the conversion wrote only dueDate, tags untouched by construction. Projection (one day):
       two documents, tags COPIED onto the task. Finish run Phase 4: one document again — the
       date goes onto the note itself, so the tags are back to untouched-by-construction and the
       copy is GONE, not shadowed. The claim throughout: a writer filtering #agents on the To-do
       board must not lose the task they made from an #agents note. */
    const make = sliceBetween(noteboard, "const makeTask", "const detachTask");
    expect(make).toContain("updateUserTask(note.id, { dueDate: dateDraft })");
    expect(make).not.toContain("tags");
    expect(noteboard).not.toContain("projectedTaskId");
  });
  it("the card carries them into every room (userCard copies t.tags)", () => {
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    expect(board).toContain("tags: t.tags,");
  });

  it("the rules allowlist both stores (user defs + task ids) — deployed to dev, prod pending Nick", () => {
    expect(rules).toContain("'committedDate', 'tags'");   // task keys + update allowlist
    expect(rules).toContain("'tourSeenAt', 'tags'");      // the user update allowlist
    expect(rules).toContain("(!data.keys().hasAny(['tags']) || (data.tags is list");
  });
});

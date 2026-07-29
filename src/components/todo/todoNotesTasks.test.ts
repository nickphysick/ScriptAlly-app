/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NOTES AND TASKS (notes-and-tasks pack) — source/rule-text locks for the two natures of a
 * user-created item: a NOTE (pinned, dateless) and a TASK (dated, remindable). Design authority:
 * design-refs/notes-and-tasks.html (frame 1 the empty section · frame 2 the composer · frame 3
 * the cards). The page is auth-gated (jsdom mounts nothing); geometry, grammar and wiring are
 * locked here, the pixels are Nick's in-browser checklist.
 *   P1 — the empty Notes section
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const types = readFileSync(join(here, "..", "..", "types.ts"), "utf8");
const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("notes-and-tasks P1 — the empty Notes section", () => {
  const emptyFn = page.slice(page.indexOf("function renderNotesEmpty"), page.indexOf("function renderFilterChips"));

  it("the Notes section renders the dashed butter card (frame 1) when it is empty", () => {
    expect(page).toContain("function renderNotesEmpty()");
    expect(emptyFn).toContain('<div className="tdb-nte">');
    expect(emptyFn).toContain("<Pin size={16} />"); // the pin glyph in its tile (lucide — see report)
    expect(emptyFn).toContain("Nothing pinned here yet"); // Playfair headline
    // the explanatory line, verbatim from the pack
    expect(emptyFn).toContain("Notes are for the things you want to remember but don’t need chasing");
    expect(emptyFn).toContain("a reminder of where you left off.");
  });

  it("the ink 'Write a note' button opens the composer in NOTE mode", () => {
    expect(emptyFn).toContain("＋ Write a note");
    expect(emptyFn).toContain('className="tdb-nte-btn"');
    expect(emptyFn).toContain('onClick={() => openComposer("note")}');
    // openComposer sets the nature AND the seat — the mode seam the P2 composer reads
    const open = page.slice(page.indexOf("const openComposer ="), page.indexOf("function addTask"));
    expect(open).toContain("setComposerMode(mode)");
    expect(open).toContain('setComposerAt(view === "ledger" ? "ledger" : "cards")');
    expect(page).toContain('const [composerMode, setComposerMode] = useState<"note" | "task">("note")'); // default note
    // the composer reads the mode (drives the P2 live transformation)
    expect(page).toContain("`tdb-nc tdb-nc--${composerMode}`");
  });

  it("the card is the nt lane's empty node ONLY (gone the moment a note exists) with an honest count", () => {
    // the Lane shows emptyNode when isEmpty, else the grid of children — so the card vanishes on the first note
    expect(page).toContain('emptyNode={composerAt === "cards" ? renderComposer() : renderNotesEmpty()}');
    expect(page).toContain("{isEmpty ? (");
    expect(page).toContain('<div className="tdb-emptylane">{emptyNode}</div>');
    // the section head + its honest count still render above it (the Lane always draws SectionHead)
    expect(page).toContain('count={active ? vNt.length : tiles.notes}');
    expect(page).toContain("<SectionHead cls={cls} label={label} count={count}");
    // the old ghost '＋' card is retired from the nt empty node
    expect(page).not.toContain('className="tdb-ghostcard quiet" onClick={addTask} aria-label="Add a note"');
  });

  it("the dashed card's tokens + treatment: butter ground, dashed border, the ink button", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--nt-empty-bg: #fbf7ee");
    expect(w).toContain("--nt-empty-bd: #d9cca8");
    expect(w).toContain("--nt-tile-bg: #f4ecd4");
    expect(w).toContain("--nt-ink-bg: #2a1a13");
    const card = rule(".tdb-nte");
    expect(card).toContain("background: var(--nt-empty-bg)");
    expect(card).toContain("border: 1px dashed var(--nt-empty-bd)");
    expect(card).toContain("border-radius: 13px");
    expect(rule(".tdb-nte-tx h4")).toContain("font-family: var(--f12-serif)"); // Playfair headline
    const btn = rule(".tdb-nte-btn");
    expect(btn).toContain("background: var(--nt-ink-bg)");
    expect(btn).toContain("color: var(--nt-ink-tx)");
    expect(btn).toContain("border-radius: 99px");
  });
});

describe("notes-and-tasks P2 — the composer + the schema", () => {
  const comp = page.slice(page.indexOf("function renderComposer"), page.indexOf("function renderNotesEmpty"));

  it("the SCHEMA: UserTask gains detail + surfaceOffset; surfaceOffset is an in-app lead, NOT a notification", () => {
    expect(types).toContain('export type SurfaceOffset = "on-day" | "day-before" | "week-before"');
    expect(types).toContain("detail?: string;");
    expect(types).toContain("surfaceOffset?: SurfaceOffset;");
    // the type's own words disclaim any delivery mechanism
    expect(types).toContain("NEVER a notification");
    expect(types).toMatch(/no push, no email/i);
  });

  it("addUserTask persists the new fields (detail trimmed; surfaceOffset only on a dated task, default omitted)", () => {
    expect(db).toContain("detail?: string");
    expect(db).toContain("surfaceOffset?: SurfaceOffset");
    expect(db).toContain("...(fields.detail && fields.detail.trim() ? { detail: fields.detail.trim() } : {})");
    expect(db).toContain('...(fields.dueDate && fields.surfaceOffset && fields.surfaceOffset !== "on-day" ? { surfaceOffset: fields.surfaceOffset } : {})');
  });

  it("the rules ALLOWLIST detail + surfaceOffset (create + update); surfaceOffset is one of three fixed strings", () => {
    expect(rules).toContain("'text', 'detail', 'done'"); // detail in the isValidUserTask hasOnly
    expect(rules).toContain("'dueDate', 'surfaceOffset', 'committedDate'"); // surfaceOffset in hasOnly
    expect(rules).toContain("data.surfaceOffset in ['on-day', 'day-before', 'week-before']");
    expect(rules).toContain("hasOnly(['text', 'detail', 'done', 'completedAt', 'updatedAt', 'dueDate', 'surfaceOffset'])"); // update affectedKeys
  });

  it("two entry points, two default natures: the section opens NOTE, the hero opens TASK", () => {
    expect(page).toContain('onClick={() => openComposer("note")}'); // the Notes-section 'Write a note'
    expect(page).toContain('onClick: () => openComposer("task")'); // the hero 'Add task or note'
    // openComposer resets EVERY field so a seat never inherits a stale draft
    const open = page.slice(page.indexOf("const openComposer ="), page.indexOf("const closeComposer ="));
    for (const reset of ['setComposerDraft("")', 'setComposerDetail("")', 'setComposerDate("")', 'setComposerSurface("on-day")']) {
      expect(open).toContain(reset);
    }
  });

  it("the type segment: ✎ Note / ✓ Task, the selected one deep-ink filled", () => {
    expect(comp).toContain("✎ Note");
    expect(comp).toContain("✓ Task");
    expect(comp).toContain('className={`tdb-nc-sgb${isTask ? "" : " on"}`}');
    expect(comp).toContain('className={`tdb-nc-sgb${isTask ? " on" : ""}`}');
    expect(rule(".tdb-nc-sgb.on")).toContain("background: var(--nt-seg-on-bg)"); // deep-ink fill
  });

  it("switching TRANSFORMS every property live — typeface, offset block, fields, nomark, save verb", () => {
    // title + detail swap Caveat (note) ↔ typeset (task) via the .note modifier
    expect(comp).toContain('className={`tdb-nc-ttl${isTask ? "" : " note"}`}');
    expect(comp).toContain('className={`tdb-nc-dtl${isTask ? "" : " note"}`}');
    expect(rule(".tdb-nc-ttl")).toContain("font-family: var(--f12-serif)"); // task = Playfair
    expect(rule(".tdb-nc-ttl.note")).toContain("font-family: Caveat"); // note = handwriting
    // the offset block swaps butter ↔ sage by mode
    expect(rule(".tdb-nc--note")).toContain("--nt-comp-block: var(--nt-block-note)");
    expect(rule(".tdb-nc--task")).toContain("--nt-comp-block: var(--nt-block-task)");
    expect(rule(".tdb-wrap")).toContain("--nt-block-note: #eedfae"); // butter
    expect(rule(".tdb-wrap")).toContain("--nt-block-task: #d5dbd3"); // sage
    // the date + surfacing fields are task-only; the note shows the NO-DATE line; the verb changes
    expect(comp).toContain("isTask ? (");
    expect(comp).toContain("NO DATE · NOTHING WILL CHASE YOU");
    expect(comp).toContain('{isTask ? "Add the task" : "Pin the note"}');
  });

  it("the surfacing field is IN-APP Today's-list timing, never a reminder — and it needs a date first", () => {
    expect(comp).toContain("Show it in Today’s list"); // NOT "Remind me"
    for (const opt of ["On the day", "A day early", "A week early"]) expect(comp).toContain(opt);
    // surfacing renders only once a date is set (dependency)
    expect(comp).toContain("{composerDate && (");
    expect(comp).toContain("<BrandDatePicker value={composerDate} onChange={setComposerDate}");
    // NO notification vocabulary anywhere in the composer
    for (const banned of ["Remind me", "remind", "notification", "notify", "push", "email"]) {
      expect(comp.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("validation + keyboard + NO native dialogs", () => {
    // title always required; a TASK additionally requires a date
    expect(page).toContain('const composerCanSave = !!composerDraft.trim() && (composerMode === "note" || !!composerDate)');
    expect(comp).toContain("disabled={!composerCanSave}");
    // ⌘⏎ saves · Esc runs the styled discard-confirm (only when dirty)
    expect(comp).toContain('(e.metaKey || e.ctrlKey) && e.key === "Enter"');
    expect(comp).toContain('e.key === "Escape"');
    expect(comp).toContain("tryCloseComposer()");
    expect(page).toContain('await confirmAsk("Discard this?"');
    // no native prompt/alert/confirm in the To-do page
    for (const nativeDlg of ["window.confirm", "window.alert", "window.prompt", "window.confirm("]) {
      expect(page).not.toContain(nativeDlg);
    }
  });

  it("save writes the nature: a note = title (+detail); a task = + dueDate + surfaceOffset", () => {
    const save = page.slice(page.indexOf("async function saveComposer"), page.indexOf("function renderComposer"));
    expect(save).toContain("text: composerDraft.trim()");
    expect(save).toContain("detail: composerDetail.trim() || undefined");
    expect(save).toContain("dueDate: isTask ? composerDate : undefined");
    expect(save).toContain("surfaceOffset: isTask ? composerSurface : undefined");
  });
});

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
    // the composer reads the mode (P1 seam; P2 expands the transformation)
    expect(page).toContain("`tdb-composer tdb-composer--${composerMode}`");
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

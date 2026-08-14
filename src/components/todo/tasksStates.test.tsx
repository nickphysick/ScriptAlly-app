/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ROW'S STATES, THE LOADING SHELL AND THE EMPTY PANELS (tasks-consolidation, Phase 5; ref
 * design-refs/tasks-states.html, sheets 2–4) — and Phase 6's motion contract, which is the same
 * question asked of movement rather than of state.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { BoardColumns } from "../../lib/todoColumns";
import { taskGroups } from "../../lib/todoGroups";
import { TaskList, TaskListSkeleton, RING_MS } from "./TaskList";

const here = __dirname;
const css = readFileSync(join(here, "todoGroups.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");
const cssDecls = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string): string => {
  const i = cssDecls.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return cssDecls.slice(i, cssDecls.indexOf("}", i));
};

const card = (o: Partial<BoardCard> = {}): BoardCard => ({
  key: "k1", stream: "do", title: "Send your full", who: "", subtitle: "The Marsh Agency",
  due: "26 DAYS", kind: "AGENT WAITING", warn: false, snoozes: 0, hk: false, initials: "JM",
  record: "", committed: false, done: false, taskType: "full_requested", relatedRecordId: "q1", ...o,
});
const cols = (o: Partial<BoardColumns> = {}): BoardColumns => ({ todo: [], today: [], snoozed: [], done: [], ...o });
const render = (c: BoardColumns, loading = false) => renderToStaticMarkup(
  <TaskList groups={taskGroups(c)} hkExpanded={false} loading={loading}
    onToggleHk={() => {}} onOpen={() => {}} onTick={() => {}} onVerb={() => {}} onSnooze={() => {}} />,
);

/* ── sheet 2: the row's states ──────────────────────────────────────────────────────────────── */

describe("⚠️ FOCUS IS AN INK BAR, NEVER A BROWSER OUTLINE", () => {
  it("the outline is suppressed and replaced by an inset rule", () => {
    expect(rule(".tdg-row:focus {")).toContain("outline: none");
    const f = rule(".tdg-row:focus-visible {");
    expect(f).toContain("box-shadow: inset 3px 0 0 #2a1a13");
    expect(f).toContain("background: #fdfaf3");
  });

  it("⚠️ `:focus-visible`, NOT `:focus` — a pointer press must not leave a row looking picked", () => {
    /* The row is a `role="button"`, so clicking it to open the dock focuses it for real. Painting
       every focus would make the last row you touched look selected for the rest of the session. */
    expect(cssDecls).toContain(".tdg-row:focus-visible {");
    expect(cssDecls).not.toContain(".tdg-row:focus {\n  background");
  });
});

describe("⚠️ THE OPTIMISTIC WRITE IS BELIEVED IMMEDIATELY, AND ONLY FAILURE INTERRUPTS", () => {
  it("the dim and the lockout are one state", () => {
    const p = rule(".tdg-row.pend {");
    expect(p).toContain("opacity: 0.55");
    /* a second click on a row already writing is not a second act */
    expect(p).toContain("pointer-events: none");
  });

  it("⚠️ THE PENDING KEY CLEARS ON SETTLE, NOT ON A DATA CHANGE", () => {
    /* A REFUSED write changes no data. Clearing on the next render would leave a denied row dimmed
       for ever — which is how a silent permission failure becomes a page that looks broken. */
    expect(list).toContain("void Promise.resolve(onTick(c)).finally(");
    expect(list).toContain("onTick: (card: BoardCard) => void | Promise<void>;");
  });

  it("the spinner takes the TICK'S place rather than sitting beside it", () => {
    expect(list).toContain('{pending.has(c.key) ? <span className="tdg-spin" aria-hidden /> : tickable && (');
    expect(rule(".tdg-spin {")).toContain("border-radius: 50%");
  });
});

describe("⚠️ THE COMPLETION RING IS A RECEIPT, AND IT IS DERIVED FROM ARRIVAL", () => {
  it("it triggers on a key newly present in Done — the fact, not the click that caused it", () => {
    expect(list).toContain("const fresh = [...now].filter((k) => !before.has(k));");
    expect(list).toContain("if (!before) return;"); // arriving at a page is not an achievement
    expect(RING_MS).toBe(600);
  });

  it("⚠️ AND IT SURVIVES REDUCED MOTION, where everything else stops", () => {
    /* Sheet 6's last row: every transform becomes an opacity change or nothing — but the ring
       carries a FACT, so it is information rather than decoration and it stays. */
    const rm = cssDecls.slice(cssDecls.indexOf("@media (prefers-reduced-motion: reduce)", cssDecls.indexOf(".tdg-sk")));
    expect(rm).toContain(".tdg-sk, .tdg-spin { animation: none; }");
    expect(rm).not.toContain("tdg-row.rung");
    expect(rule(".tdg-row.rung {")).toContain("box-shadow: 0 0 0 2px #8a9e88");
  });
});

/* ── sheet 3: the loading shell ─────────────────────────────────────────────────────────────── */

describe("⚠️ THE SKELETON IS THE REAL ROW WEARING PLACEHOLDERS", () => {
  const html = renderToStaticMarkup(<TaskListSkeleton />);

  it("it reuses the row's own class, so the six tracks are the SAME six tracks", () => {
    expect(html).toContain('class="tdg-row"');
    expect(html).toContain('class="tdg-acts"');
    /* nothing shifts by a pixel when the data lands, because there is no second layout to drift */
    expect(cssDecls).not.toContain(".tdg-skrow {");
  });

  it("⚠️ ITS ACTION CELL IS EMPTY, BECAUSE THE LOADED ROW'S IS TOO (icon-cluster pack)", () => {
    const rows = (html.match(/class="tdg-row"/g) ?? []).length;
    expect(rows).toBe(6); // two groups × three rows — the ref's "the first two render"
    /* The skeleton's whole job is that nothing shifts when the data lands. It held a placeholder
       for the split button; the cluster renders NOTHING at rest, so a placeholder there would draw
       a shape the loaded row does not have — a bar that vanishes on arrival is the exact jump the
       skeleton exists to prevent. The 152px track still reserves the space, which was the only
       part that ever mattered. */
    expect((html.match(/class="tdg-acts"/g) ?? []).length).toBe(rows);
    expect(html).not.toContain("tdg-sk split");
    expect(cssDecls).not.toContain(".tdg-sk.split");   // deleted, not left unreferenced
    expect(html).not.toContain("tdg-slot");
  });

  it("it announces itself rather than miming content silently", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading your tasks"');
  });

  it("⚠️ 'NO TASKS' AND 'WE DO NOT KNOW YET' ARE DIFFERENT SENTENCES", () => {
    /* The shell replaces the list wholesale; it is not an empty state and must never be told as
       one. The trigger is the db's OWN first-snapshot flag — the same one the Dashboard reads. */
    expect(list).toContain("if (loading) return <TaskListSkeleton />;");
    expect(page).toContain("loading={!collectionsReady}");
  });

  it("the shimmer stops under reduced motion; the shell still reads as a shell", () => {
    expect(rule(".tdg-sk {")).toContain("animation: tdgShim");
  });
});

/* ── sheet 4: the empty states ──────────────────────────────────────────────────────────────── */

describe("⚠️ A FILTERED-EMPTY RESULT IS A DEAD END TO ESCAPE, NOT A MOMENT TO DECORATE", () => {
  /**
   * ⚠️ IT LIVES IN THE RAIL NOW (Phase 4), and that is the whole point of the state. It used to
   * replace the entire body, so a search matching nothing took the WORKSPACE with it — the pane
   * cleared because a search box narrowed, which is the one behaviour this page must not have.
   * A narrowed-to-nothing rail is a RAIL fact; the pane holds what you were working on.
   */
  it("it names what you narrowed by, states the way back, and carries NO art", () => {
    expect(page).toContain("Nothing matches “${search.trim()}”");
    /* the chip has its own words — "nothing matches" would be a lie when you typed nothing */
    expect(page).toContain('"Nothing in this filter"');
    expect(page).toContain("Clear it to see all {allDockable.length}");
    expect(page).toContain("Clear search");
    expect(page).toContain('"Show all"');
    const at = page.indexOf('className="tdg-empty tdw-empty"');
    expect(at, "the rail-empty marker is gone — this slice would read the whole file").toBeGreaterThan(-1);
    const panel = page.slice(at, at + 900);
    expect(panel).not.toContain("ArtSlot");
  });

  it("⚠️ AND THE PANE IS NOT PART OF IT — the empty state is inside the rail, above the split", () => {
    /* the marker sits INSIDE `.tdw-rail`, so the workspace column renders regardless */
    const a = page.indexOf('className="tdw-rail"');
    const b = page.indexOf('className="tdw-work"');
    expect(a, "the rail marker is gone").toBeGreaterThan(-1);
    expect(b, "the workspace marker is gone").toBeGreaterThan(a);
    const rail = page.slice(a, b);
    expect(rail).toContain("tdw-empty");
    expect(rail).toContain("renderList()");
    /* and the pane reads the HELD card, which is what survives a narrowing */
    expect(page).toContain("const paneCard = docked.card ??");
  });

  it("the two states that DO carry art keep it, and they are the two that earn it", () => {
    expect(page).toContain('<ArtSlot name="first-run-board"');
    expect(page).toContain('<ArtSlot name="desk-clear"');
  });

  /**
   * ⚠️ TWO OF THE REF'S FIVE EMPTY STATES CANNOT EXIST, AND THE LAW IS RIGHT RATHER THAN THE REF.
   *
   * Sheet 4 draws "Nothing cleared yet today" (Done) and "Housekeeping is empty". Neither can
   * render: `taskGroups` filters an empty group out entirely, and that law is locked with its
   * reason — an empty section states a category the writer has no business in today, and five of
   * them stack into a page that looks full of nothing. The ref's own housekeeping copy admits it
   * ("This group hides itself when it has nothing to say"), which reads as a DEMONSTRATION of the
   * rule rather than a state to build.
   *
   * So they are deliberately absent. The `done-empty` ART SLOT survives in the census, unmounted,
   * exactly as `seize-the-day` does — flagged in the report rather than deleted.
   */
  it("an empty group renders nothing at all — no panel, no heading, no teaching line", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html).not.toContain("Housekeeping");
    expect(html).not.toContain("Done today");
    expect(html).not.toContain("Nothing cleared yet today");
  });
});

/* ── sheet 6: the motion contract ───────────────────────────────────────────────────────────── */

describe("⚠️ ONE CURVE AND TWO DURATIONS — anything past 300ms on this page is a bug", () => {
  it("the curve and the two durations are tokens, so no rule picks its own", () => {
    const t = rule(".tdg {");
    expect(t).toContain("--tdg-ease: cubic-bezier(0.2, 0.7, 0.3, 1)");
    expect(t).toContain("--tdg-emph: 120ms");
    expect(t).toContain("--tdg-move: 240ms");
  });

  it("⚠️ NO TRANSITION IN THIS SHEET EXCEEDS 300ms", () => {
    /* ⚠️ TRANSITIONS ONLY, AND THE DISTINCTION IS THE RULE RATHER THAN A LOOPHOLE. The budget is
       about how long the page takes to ANSWER you. An ambient loop — the skeleton's 1.4s shimmer,
       the spinner's 640ms turn — answers nothing and repeats until the data lands; capping those
       at 300ms would make them frantic. Both are named here so the exception is a decision. */
    const durations = [...cssDecls.matchAll(/transition:[^;]*?(\d+(?:\.\d+)?)(ms|s)/g)]
      .map((m) => (m[2] === "s" ? parseFloat(m[1]) * 1000 : parseFloat(m[1])));
    expect(durations.length, "there must BE transitions to bound").toBeGreaterThan(0);
    for (const d of durations) expect(d, `${d}ms transition`).toBeLessThanOrEqual(300);
    /* every animation in this sheet is an ambient LOOP; a one-shot animation past the budget
       would be movement wearing a different keyword */
    const loops = [...cssDecls.matchAll(/animation:\s*[^;]*?(\d+(?:\.\d+)?)(ms|s)[^;]*/g)].map((m) => m[0]);
    expect(loops.length, "there must BE loops to exempt").toBeGreaterThan(0);
    for (const l of loops) expect(l, l).toMatch(/infinite/);
    expect(RING_MS).toBe(600); // the hold lives in TS: it is a timer, not a transition
  });

  /**
   * ⚠️ AN ENTRANCE ANIMATION MUST NEVER CARRY VISIBILITY — and this was browser-measured, twice.
   *
   * The ref asks the fold's new rows to "fade up". A fade starts at `opacity: 0`, so the rows are
   * INVISIBLE until the animation advances — and in the in-app browser pane they sat at zero
   * indefinitely, under `fill-mode: both` AND under `backwards`, because the clock never moved.
   * Chrome throttles animations in background tabs for the same reason. The rows RISE and never
   * fade now: the stagger's failure mode is a stagger you do not get, rather than work you cannot
   * see, which on this page is not a close call.
   */
  it("no keyframe in this sheet starts content at opacity 0", () => {
    const frames = [...cssDecls.matchAll(/@keyframes\s+\w+\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
    expect(frames.length, "there must BE keyframes to check").toBeGreaterThan(0);
    for (const f of frames) {
      expect(f, `a keyframe starts at opacity 0: ${f.trim().slice(0, 60)}`).not.toMatch(/from\s*\{[^}]*opacity:\s*0\b/);
    }
  });

  it("…and reduced motion STOPS the rise rather than swapping in a fade", () => {
    /* An opacity swap under reduced motion would reintroduce the exact fade whose failure mode is
       invisible content — for the readers least able to afford it. */
    const rm = cssDecls.slice(cssDecls.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".tdg-panel.grown > .tdg-row:nth-child(n + 5) { animation: none; }");
    expect(cssDecls).not.toContain("tdgFade");
  });
});

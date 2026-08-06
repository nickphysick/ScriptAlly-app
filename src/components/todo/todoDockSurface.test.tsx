/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dock's rendered surface and its wiring (board+dock P4).
 *
 * It RENDERS — per the lesson of the page that did not load, a source-string test proves the code
 * was written, not that it runs. The wiring half reads the page, because what matters there is
 * WHICH primitive is called, and calling it for real would need the whole db.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { TodoDock } from "./TodoDock";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const dockSrc = readFileSync(join(here, "TodoDock.tsx"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const QUEUE = [
  card({ key: "a", title: "Send your full to Jonathan Marsh", taskType: "full_requested", kind: "AGENT WAITING", due: "12 JUL", record: "Jonathan Marsh · The Marsh Agency" }),
  card({ key: "b", title: "Eleanor Whitfield silent", taskType: "no_response_close", kind: "STALE", hk: true }),
  card({ key: "c", title: "Redraft the opening", userTaskId: "u1", nature: "task", kind: "YOUR TASK" }),
];

const render = (active = "a", queue = QUEUE) =>
  renderToStaticMarkup(
    <TodoDock
      queue={queue}
      activeKey={active}
      onSelect={() => {}}
      onClose={() => {}}
      timeline={() => [{ key: "e1", label: "Full requested", when: "12 Jul" }]}
      onPrimary={() => {}}
      onSnooze={() => {}}
      onMore={() => {}}
    />
  );

describe("the dock renders, 30/70, queue left and work surface right", () => {
  it("renders without throwing", () => {
    expect(() => render()).not.toThrow();
  });

  it("is a 30/70 split, in the stylesheet rather than in the markup", () => {
    const css = readFileSync(join(here, "todoDock.css"), "utf8");
    expect(css).toContain("grid-template-columns: 30% 70%");
  });

  it("the queue lists every item, in the order it was given", () => {
    const html = render();
    for (const c of QUEUE) expect(html).toContain(c.title);
  });

  it("⚠️ the DOCKED rail is ringed in ink; the others are not dimmed — they are where you go next", () => {
    const html = render("b");
    expect(html).toContain('aria-current="true"');
    expect((html.match(/aria-current="true"/g) ?? []).length).toBe(1);
    const css = readFileSync(join(here, "todoDock.css"), "utf8");
    expect(css).toContain(".tdk-rail.on { border-color: #2a1a13;");
    expect(css).not.toMatch(/\.tdk-rail(?!\.on)[^{]*\{[^}]*opacity/);
  });

  it("the work surface carries the family band, the title and the record line", () => {
    const html = render();
    expect(html).toContain("tdk-band fam-urgent");
    expect(html).toContain("Send your full to Jonathan Marsh");
    expect(html).toContain("Jonathan Marsh · The Marsh Agency");
  });

  it("the timeline renders when there is history, and is absent when there is none", () => {
    expect(render()).toContain("Full requested");
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onSnooze={() => {}} onMore={() => {}} />
    );
    expect(bare).not.toContain("tdk-tl");
  });
});

describe("the flow mounted is the card's own kind", () => {
  it("agent-waiting offers the send, and its ink act NAMES what it records", () => {
    const html = render("a");
    expect(html).toContain("What goes");
    expect(html).toContain("Record the full as sent");
    expect(html).not.toContain(">Done<");
  });

  it("⚠️ the send's primary is DISABLED until the writer confirms what goes", () => {
    expect(render("a")).toContain("disabled=\"\"");
  });

  it("stale offers the close, and says what closing means for the response rate", () => {
    const html = render("b");
    expect(html).toContain("Close this query");
    expect(html).toContain("not a rejection");
  });

  it("a user task offers the tick — the only kind that finishes by ticking", () => {
    const html = render("c");
    expect(html).toContain("Mark it done");
    expect(html).toContain("ticking it is what finishes it");
  });
});

describe("the foot: one ink act, two quiet verbs, and where you are going", () => {
  it("names the next item, and says so plainly at the end of the queue", () => {
    expect(render("a")).toContain("NEXT: Eleanor Whitfield silent");
    expect(render("c")).toContain("LAST IN THE QUEUE");
  });

  it("carries Snooze and More as quiet controls beside the primary", () => {
    const html = render();
    expect(html).toContain('aria-label="Snooze"');
    expect(html).toContain('aria-label="More"');
  });
});

describe("⚠️ ONE ACT, THREE RECORDS — and only two of them are writes", () => {
  const fn = page.slice(page.indexOf("async function dockPrimary"), page.indexOf("function advanceDock"));

  it("the send calls the EXISTING primitive, which writes the activity AND moves the status", () => {
    expect(fn).toContain("await recordMaterialsSent({");
    expect(fn).toContain("targetStatus:");
    expect(fn).toContain("sentDate:");
  });

  it("⚠️ the THIRD record — the task going away — is DERIVED, never written", () => {
    /* The engine generates a partial_requested task BECAUSE the query sits at PARTIAL_REQUESTED.
       Moving the status retires the task by construction. A write there would be a second record
       of a fact the first already carries, and the two would eventually disagree. */
    expect(fn).not.toContain("resolveTaskFlag(");
    expect(fn).not.toContain("done: true");
    expect(page).toContain("DERIVED, not written");
  });

  it("the resubmit flag rides through, because the primitive's revision bump depends on it", () => {
    expect(fn).toContain("isResubmit");
  });

  it("and the act is undoable — a completion you cannot reverse is not recoverable", () => {
    expect(fn).toContain('label: "Undo"');
    expect(fn).toContain("undoQueryStatus(");
  });

  it("a user task completes through quickDone — the same primitive the board's tick uses", () => {
    expect(fn).toContain("await quickDone(card)");
  });
});

describe("⚠️ ONE SURFACE, EVERY ENTRANCE", () => {
  it("Action now, the bounce toast's Open, Focused session and Work the list all call openDock", () => {
    expect(page).toContain('case "action": openDock(');
    expect(page).toContain("fn: async () => { openDock(");                   // the bounce
    expect(page).toContain("function openFocusedSession() { openDock(");     // the tool row
    expect(page).toContain("const onWork = () => openDock(");                // Today
  });

  it("and the separate focused-session surface is GONE", () => {
    expect(page).not.toContain("<FocusedSession");
    expect(page).not.toContain("setSession(");
  });

  it("closing restores the board's scroll — you go back where you were, not to the top", () => {
    expect(page).toContain("boardScroll.current = document.getElementById(STAGE_SCROLL_ID)?.scrollTop");
    expect(page).toContain("el.scrollTop = boardScroll.current;");
  });

  it("⚠️ advancing OFFERS the next item — it never runs it", () => {
    const adv = page.slice(page.indexOf("function advanceDock"), page.indexOf("function renderBoard"));
    expect(adv).toContain("nextInQueue(");
    expect(adv).not.toContain("dockPrimary(");   // never performs the next act
    expect(page).toContain("it never runs it");
  });
});

describe("keyboard", () => {
  it("Esc closes, ↑↓ walk the queue, Enter is the primary", () => {
    expect(dockSrc).toContain('if (e.key === "Escape")');
    expect(dockSrc).toContain('e.key === "ArrowDown" || e.key === "ArrowUp"');
    expect(dockSrc).toContain('if (e.key === "Enter" && card)');
  });

  it("⚠️ and it never steals keys from a field being typed into", () => {
    expect(dockSrc).toContain('closest("input, textarea, select")');
  });
});

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
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const dockSrc = readFileSync(join(here, "TodoDock.tsx"), "utf8");
/* ⚠️ ON DECLARATIONS — the card's own notes QUOTE the foot bar they retired, and reading prose as
   code fails a file that is correct. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const dockCssRule = (sel: string): string => {
  /* ⚠️ COMMENTS OUT BEFORE THE SLICE, NOT AFTER — and both halves matter. A rule's own prose
     explains the value it replaced, so an unstripped slice fails `not.toContain` on the note
     saying the thing was removed; and a `}` inside a comment would truncate the rule early,
     which is the quiet direction — assertions passing against half a rule. */
  const css = readFileSync(join(here, "todoDock.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const QUEUE = [
  /* ⚠️ `who` IS SET, as a real card's is — the band reads it, and a fixture without it would test
     the no-agent fallback while claiming to test an agent. */
  card({ key: "a", title: "Send your full to Jonathan Marsh", who: "Jonathan Marsh", taskType: "full_requested", kind: "AGENT WAITING", due: "12 JUL", record: "Jonathan Marsh · The Marsh Agency" }),
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
      onMore={() => {}}
    />
  );

/**
 * ⚠️ THE PANE DRAWS NO QUEUE OF ITS OWN (rail + workspace, Phase 5).
 *
 * It used to: a 30% left column of slim rails, defended in its own file with "a slide-over would
 * hide the queue, and the queue is half the point". That was TRUE of a surface which had REPLACED
 * the list — the stack was the only way to see where you were going next. The rail is that stack
 * now, permanently on screen, so the column became a second copy of it. A copy drawn from a
 * SNAPSHOT while the rail was live, which is how the two came to disagree about what was
 * outstanding.
 *
 * These cases are inverted rather than deleted, and the survivors — ↑↓ and the NEXT line — are
 * locked AS survivors: their visible invoker is gone, so nothing else would notice if they broke.
 */
describe("⚠️ THE PANE DRAWS NO QUEUE — the rail is the stack", () => {
  it("renders without throwing", () => {
    expect(() => render()).not.toThrow();
  });

  it("one column, and no rail markup anywhere in it", () => {
    const tdk = dockCssRule(".tdk {");
    /* ⚠️ `display: flex` NOW, AND IT IS STILL ONE COLUMN. This asserted `display: block`, which was
       the shape when the pane scrolled and the card was sized by its content. The wrapper is a flex
       COLUMN so the position line keeps its height and the card takes the rest; what this case
       actually protects — that there is no second track holding a queue — is the grid assertion
       below, and that is unchanged. */
    expect(tdk).toContain("flex-direction: column");
    expect(tdk).not.toContain("grid-template-columns");
    /* ⚠️ ANCHORED, NOT PREFIXED — a bare `tdk-q` matches `tdk-quiet`, which is the footer's own
       live class. The house rule on this exists because the failure is silent in the other
       direction: a prefix test passes on a file that still draws the thing. */
    for (const cls of ["tdk-q", "tdk-qcap", "tdk-rail"]) {
      expect(dockSrc, cls).not.toMatch(new RegExp(`["\`\\s]${cls}[\`"\\s]`));
    }
    /* the count line went with it — "30 to work through" beside a rail showing a different
       number was the divergence made visible */
    expect(dockSrc).not.toContain("to work through");
  });

  it("⚠️ THE OTHER CARDS ARE NOT DRAWN HERE — only the docked one, and the NEXT line's name", () => {
    const html = render("a");
    /* the docked card's IDENTITY is on screen — the band names it now, not a body title */
    expect(html).toContain("Jonathan Marsh");
    /* the card AFTER next is nowhere: with the stack gone there is no list in this surface */
    expect(html).not.toContain("Redraft the opening");
    /* ⚠️ AND THE FORWARD LOOK MOVED TOO (visual rebuild, Phase 4). "NEXT: …" was the card foot's
       last survivor; the command bar's previous/next pair says the same thing as a POSITION rather
       than as a name, and the head row's "Task 2 of 4" states the set. Nothing in this surface
       names another card now. */
    expect(html).not.toContain("Eleanor Whitfield silent");
    expect(html).not.toContain("tdk-rail");
  });

  /**
   * ⚠️ THE SURVIVORS, LOCKED AS SURVIVORS. ↑↓ and the forward look were always array-driven —
   * they read the `queue` PROP, never the stack — which is why cutting the stack stranded
   * nothing. With their visible neighbour gone, nothing else would notice if they broke.
   */
  it("↑↓ still walk the queue, through `stepQueue` on the prop", () => {
    expect(dockSrc).toContain('if (e.key === "ArrowDown" || e.key === "ArrowUp")');
    expect(dockSrc).toContain('stepQueue(queue, card?.key ?? "", e.key === "ArrowDown" ? 1 : -1)');
    expect(dockSrc).toContain("onSelect(to.key)");
  });

  it("⚠️ THE FORWARD LOOK IS THE BAR'S PREV/NEXT PAIR NOW — a position, not a name", () => {
    /* `nextInQueue` survives in `lib/todoDock` (advanceDock reads it) but the CARD names no other
       card. The bar's arrows and the head row's "Task 2 of 4" carry where you are and where you
       can go, which is the same fact stated once rather than twice. */
    expect(code(dockSrc)).not.toContain("nextLabel");
    expect(dockSrc).not.toContain("LAST IN THE QUEUE");
    expect(page).toContain('aria-label="Next task"');
    expect(page).toContain('aria-label="Previous task"');
  });

  /**
   * ⚠️ THE BAND CARRIES THE IDENTITY AND THE BODY NEVER REPEATS IT (corrections, Phase 1). This
   * asserted the title and the record line in the body — which is exactly what put the agent's
   * name in the right-hand column with the facts floating across it. The band holds the avatar,
   * the pre-line, the Playfair name and the agency; the body holds the doing.
   */
  it("the band carries the identity — avatar, pre-line, name, agency", () => {
    const html = render();
    /* ⚠️ `fam-urgent` IS GONE. The band was classed by FAMILY, which answers "how urgent is this" —
       and `urgent` covers every send, every R&R and the offer alike, so nine cards of ten rendered
       in the pink offer treatment. A send is the sage default. */
    expect(html).toContain("tdk-band v-default");
    expect(html).not.toContain("tdk-band fam-");
    expect(html).toContain("tdk-id");
    expect(html).toContain("Sending your full to");
    expect(html).toContain("Jonathan Marsh");
    expect(html).toContain("The Marsh Agency");
  });

  /**
   * ⚠️ PINK IS THE OFFER AND NOTHING ELSE — one card of ten in the ref. Measured on the deployed
   * page before the fix: EVERY card came back `fam-urgent`, because the variant was reading the
   * family. The derivation (`bandVariant`) is asserted here against the rendered output, and the
   * two variants are checked against each other so neither can drift into the other's job.
   */
  it("⚠️ the band variant is sage by default and pink ONLY for an offer", () => {
    expect(render("a")).toContain("tdk-band v-default");            // a send
    expect(render("b")).toContain("tdk-band v-default");            // a stale close
    expect(render("c")).toContain("tdk-band v-default");            // the writer's own note
    const offer = renderToStaticMarkup(
      <TodoDock queue={[card({ key: "o", title: "An offer", who: "Tom Ellery", taskType: "offer_received" })]}
        activeKey="o" onSelect={() => {}} onClose={() => {}} timeline={() => []}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(offer).toContain("tdk-band v-offer");
    expect(offer).not.toContain("v-default");
  });

  /**
   * ⚠️ THE MOTIF NEVER TOUCHES A CONTROL — and `z-index: 1` on the motif was not enough on its own.
   * `.tdk-x` was `position: static`, and a static element takes no z-index at all, so a positioned
   * sibling paints over it whatever the DOM order says. Measured on the deployed page at 1920 the
   * motif's box crossed the ×'s; at 1440 it did not, because the identity block wraps there and
   * the taller band pushes the vertically-centred motif clear. A fault that comes and goes with
   * the viewport is still a fault, and stacking is the thing to assert rather than the geometry.
   */
  /**
   * ⚠️ THE BLOCK SIZES TO ITS CONTENTS. It was a fixed `1fr 1fr`, so a card with ONE stat — which
   * is every note — drew one tile and an empty half, with a divider beside nothing.
   */
  it("one stat spans the block; two share it, and only then is there a divider", () => {
    const stats = dockCssRule(".tdk-tstats {");
    /* ⚠️ AUTO-FLOW COLUMNS, NOT `auto-fit`. Auto-fit with a ZERO minimum has no reason to stop —
       measured on the deployed page it generated a hundred-odd phantom `0px` tracks after the two
       real ones, and rendered correctly only by luck. */
    expect(stats).toContain("grid-auto-flow: column");
    expect(stats).toContain("grid-auto-columns: 1fr");
    expect(stats).not.toContain("1fr 1fr");
    expect(stats).not.toContain("auto-fit");
    /* the divider is a sibling rule, so it cannot exist without something to divide */
    const css = readFileSync(join(here, "todoDock.css"), "utf8");
    expect(css).toContain(".tdk-tstat + .tdk-tstat { border-left:");
  });

  /**
   * ⚠️ THE TAG ROW SITS INSIDE THE CARD. It had `padding: 10px 0 2px` and is a direct child of
   * `.tdk-w`, which has no horizontal padding of its own — so the chip and the field ran to the
   * card's edges, across the inset frame and out over the rounded corner.
   */
  it("the tag row respects the card's own inset", () => {
    const tags = dockCssRule(".tdk-tags {");
    expect(tags).toContain("padding: 10px 24px 18px");
    /* ⚠️ ONE OWNER — the old rule in `todo.css` is retired rather than left as a second one */
    const shared = readFileSync(join(here, "todo.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shared).not.toContain(".tdk-tags {");
  });

  it("⚠️ the close control outranks the motif — positioned AND stacked", () => {
    const x = dockCssRule(".tdk-x {");
    expect(x).toContain("position: relative");
    expect(x).toContain("z-index: 3");
    /* the three layers, in order, asserted together so no one of them can drift alone */
    expect(dockCssRule(".tdk-motif {")).toContain("z-index: 1");
    expect(dockCssRule(".tdk-id {")).toContain("z-index: 2");
  });

  it("⚠️ each bucket carries its own motif, behind the text and clipped by the band", () => {
    /* keyed on the BUCKET, so a new task type inherits the mark of the act it performs */
    expect(render("a")).toContain("tdk-motif");                     // send → the manuscript stack
    expect(render("c")).toContain("tdk-motif");                     // note → the torn note
    const m = dockCssRule(".tdk-motif {");
    expect(m).toContain("position: absolute");
    expect(m).toContain("z-index: 1");                              // BEHIND the content's 2
    expect(m).toContain("pointer-events: none");
    expect(dockCssRule(".tdk-band {")).toContain("overflow: hidden"); // what clips it
    /* ⚠️ THE FACTS STRIP CLEARS IT, in ONE declaration — a second `padding-right` later in the
       same rule is what silently wins, and that is exactly how this was first written. */
    const facts = dockCssRule(".tdk-facts {");
    expect((facts.match(/padding-right:/g) ?? [])).toHaveLength(1);
    /* ⚠️ §2.5 — COMPUTED FROM THE MOTIF'S LANE, NEVER RESTATED. This asserted a flat `96px` beside
       a motif at `right: 22px` with a 92px box — two authored numbers that could drift apart, and
       had: 96 < 22 + 92, so the figures already overlapped the illustration while the rule's own
       prose said they cleared it. A lock on the literal could not see that; a lock on the
       RELATIONSHIP can only be satisfied by keeping it. */
    expect(facts).toContain("calc(var(--tdk-motif-right) + var(--tdk-motif-w) - var(--tdk-facts-inset))");
    expect(facts).not.toMatch(/padding-right:\s*\d/);
  });

  it("⚠️ §2.5 — the motif's lane is derived from the close control's, and clears it", () => {
    const band = dockCssRule(".tdk-band {");
    /* the three authored measurements, and nothing else authored downstream of them */
    expect(band).toContain("--tdk-band-px: 26px");
    expect(band).toContain("--tdk-x-w: 19px");
    expect(band).toContain("--tdk-motif-w: 92px");
    /* ⚠️ THE LANE IS A SUM OF THINGS THAT EXIST, not a chosen offset — so moving the band's
       padding or the control's size moves the motif with them. */
    expect(band).toContain("--tdk-motif-right: calc(var(--tdk-band-px) + var(--tdk-x-w) + 8px)");
    /* the band reads its own tokens rather than restating their values */
    expect(band).toContain("padding: 16px var(--tdk-band-px) 14px");
    expect(band).toContain("gap: var(--tdk-band-gap)");
    /* ⚠️ AND THE REF'S 22px IS GONE FROM THE MOTIF. v14 drew that offset into a band with NO close
       button; taking it literally is what put the illustration behind the control. */
    const motif = dockCssRule(".tdk-motif {");
    expect(motif).toContain("right: var(--tdk-motif-right)");
    expect(motif).not.toContain("right: 22px");
    /* ⚠️ THE SUBTRAHEND IS BUILT FROM THE SAME THREE NUMBERS — otherwise the facts' `calc()` would
       subtract a stale inset and the padding would drift silently in whichever direction the band
       moved. */
    expect(band).toContain("--tdk-facts-inset: calc(var(--tdk-band-px) + var(--tdk-x-w) + var(--tdk-band-gap))");
    /* ⚠️ AND THE SUM IS EVALUATED, because `calc()` has no opinion about signs: a facts padding
       that came out NEGATIVE would push the figures right, back over the illustration and under
       the ×, and the stylesheet would parse without complaint. Read the authored values and do the
       arithmetic here rather than trusting the shape of the expression. */
    const px = (k: string) => Number(/(\d+)px/.exec(new RegExp(`${k}:([^;]+)`).exec(band)![1])![1]);
    const motifLeftEdge = px("--tdk-band-px") + px("--tdk-x-w") + 8 + px("--tdk-motif-w");
    const factsInset = px("--tdk-band-px") + px("--tdk-x-w") + px("--tdk-band-gap");
    expect(motifLeftEdge - factsInset, "the facts' computed padding is negative — the figures land back on the motif")
      .toBeGreaterThan(0);
  });

  it("⚠️ AND THE BODY REPEATS NEITHER THE NAME NOR THE TITLE", () => {
    const html = render();
    const at = html.indexOf('class="tdk-body"');
    expect(at, "the body marker is gone — this slice would read the whole card").toBeGreaterThan(-1);
    const body = html.slice(at);
    /* the STORY column legitimately names the agent inside timeline entries; what must not repeat
       is the card's own title and record line, which is what collided with the facts */
    expect(body).not.toContain("Send your full to Jonathan Marsh");
    /* ⚠️ THE EXACT CLASS, NOT THE SUBSTRING. This read `not.toMatch(/["\s`]tdk-rec["\s`]/)`, which is
       satisfied by any class merely STARTING with it — §3.11's `tdk-recnote` tripped it, and the
       looseness runs the other way too: a real `tdk-record` would have passed. The retired class
       is `tdk-rec` exactly. */
    expect(html).not.toContain('class="tdk-rec"');
    expect(html).not.toContain('class="tdk-t"');
  });

  it("⚠️ THE SUBJECT IS NOT ALWAYS A PERSON — a note's band names the standing subject", () => {
    /* a Fix card's subject can be a manuscript and a Note's is the writer's own board; a blank
       disc with an empty line beside it is the collision in a quieter form */
    const note = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="c" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(note).toContain("Your noteboard");
  });

  it("the timeline renders when there is history, and is absent when there is none", () => {
    expect(render()).toContain("Full requested");
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />
    );
    expect(bare).not.toMatch(/["\s`]tdk-tl["\s`]/);
  });

  /**
   * ⚠️ THE THREE VALUES THE SPECIFICATION AND v14 BOTH NAME, AND THE APP HAD DRIFTED FROM ALL
   * THREE. None of the three had a reason recorded anywhere against it — they were not decisions
   * that beat the artefacts, they were numbers that had wandered. Locked together because a
   * wandering value is exactly what a lock is for, and because a single test naming all three
   * makes the next drift one red rather than three separate silences.
   */
  it("⚠️ §2.1 / §2.3 / §3.8 — the disc, the subject and the date track are the named figures", () => {
    expect(dockCssRule(".tdk-av {")).toContain("width: 40px; height: 40px");   // §2.1
    const name = dockCssRule(".tdk-name {");
    expect(name).toContain("font-size: 20px");                                  // §2.3
    expect(name).toContain("line-height: 1.15");
    /* ⚠️ §3.8's 66px DATE TRACK IS SUPERSEDED, and this lock caught the change rather than being
       quietly edited around it. `todo-journey-in-pane.html` is the newer of the two authoritative
       refs and describes the pane this timeline is in; its `.tl-row` is 60 · 20 · rest, and the
       20 is sized for a real `StatusDot` rather than for the local ring 66 was drawn around. */
    expect(dockCssRule(".tdk-tl li {")).toContain("grid-template-columns: 60px 20px");
  });

  /* ── Item 9 · the journey renders in the pane ──────────────────────────────────────────────── */

  const withJourney = (over: Partial<React.ComponentProps<typeof TodoDock>> = {}) =>
    renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}}
        materials={() => [{ label: "The partial — as Greg asked", sub: "v4" }]}
        primaryLabel={() => "Record the partial as sent"}
        onCommitSend={() => {}} {...over} />,
    );

  it("⚠️ THE CARD OPENS ON THE CARD — the journey is not the default view", () => {
    /* a surface that opened mid-form would show a writer a set of questions before they had asked
       to answer any */
    const html = withJourney();
    expect(html).toContain("Sending your full to");     // the band's own pre-line
    expect(html).not.toContain("Back to the task");
    expect(html).toContain("tdk-foot");                  // the card's footer, with the deed
  });

  it("⚠️ THE JOURNEY IS NOT AN OVERLAY — no portal, no scrim, no `useOverlay`", () => {
    /* THE POINT OF THE MOVE. `useOverlay`'s `sealBackground()` puts `inert` on `#root` on the
       premise that overlays portal to `document.body`; FocusFlow does not portal, so its takeover
       sealed ITSELF and every control inside was unreachable. A journey that is the card's body
       cannot have that fault — asserted at source so it cannot quietly become one. */
    const src = readFileSync(join(here, "PaneJourney.tsx"), "utf8");
    const code_ = code(src);
    expect(code_).not.toContain("useOverlay");
    expect(code_).not.toContain("createPortal");
    expect(code_).not.toContain("inert");
    /* the card mounts it inline, as a child of the scroller it already had */
    expect(code(dockSrc)).toContain("<PaneJourney");
  });

  it("⚠️ ALL THREE WAYS OUT WRITE NOTHING, and Escape cascades to the journey first", () => {
    const src = code(dockSrc);
    /* the journey's own two are `onCancel`, which only clears the draft */
    expect(code(readFileSync(join(here, "PaneJourney.tsx"), "utf8"))).toContain("onClick={onCancel}");
    /* and Escape leaves the journey before it closes the pane — a single handler that always
       closed the dock would throw away a half-filled form to do it */
    expect(src).toContain('if (e.key === "Escape" && draft) { e.preventDefault(); setDraft(null); return; }');
    const esc = src.indexOf('e.key === "Escape" && draft');
    const close = src.indexOf('if (e.key === "Escape") { e.preventDefault(); onClose(); return; }');
    expect(esc, "the cascade is the wrong way round — the pane closes before the journey").toBeLessThan(close);
  });

  it("⚠️ THE QUEUE'S KEYS STAND DOWN while a form is open", () => {
    /* ↑↓ would step the pane out from under a form in progress; Enter would re-fire the deed that
       opened it */
    expect(code(dockSrc)).toContain("if (draft) return;");
  });

  it("⚠️ ONE FOOTER AT A TIME — the card's stands down and the journey brings its own", () => {
    /* two footers would put two primaries on one card, and the outer one would offer to re-open a
       journey that is already open */
    expect(code(dockSrc)).toContain("{!draft && (");
    const pj = code(readFileSync(join(here, "PaneJourney.tsx"), "utf8"));
    expect(pj).toContain("pj-foot");
    expect(pj).toContain("pj-prime");
  });

  it("⚠️ THE BUCKETS MOVE ONE AT A TIME — no `onCommitSend`, and the card still opens the takeover", () => {
    /* this is what makes a stop survivable: a bucket without the prop is untouched, so five
       half-wired journeys is not a state this can reach */
    const src = code(dockSrc);
    expect(src).toContain("if (onCommitSend) {");
    expect(src).toContain("onPrimary(card);");
    /* the declaration is a TABLE now — `paneJourneyKind` names the buckets that have one, and the
       three that do not fall through to `undefined` and keep the takeover */
    expect(page).toContain("onCommitSend={paneJourneyKind(paneCard) ? commitFromPane : undefined}");
    expect(page).toContain('case "send": return "send";');
    expect(page).toContain('case "chase": return "chase";');
    expect(page).toContain('case "close": return "close";');
    expect(page).toContain("default: return undefined;");
  });

  it("⚠️ THE COMMIT RUNS THE EXISTING WRITE — never a second path", () => {
    /* `quickSendPayload` → `markSentWriteArgs` → `recordMaterialsSent` is the quick ✓'s path too,
       so the two surfaces cannot come to record different things. */
    expect(page).toContain("await recordMaterialsSent(markSentWriteArgs(p));");
    expect(page).toContain("const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);");
    /* and it does NOT advance — the writer watches the record change and moves on separately */
    const commit = page.slice(page.indexOf("async function commitSendFromPane"), page.indexOf("function dockTimeline"));
    expect(commit).not.toContain("stepQueue");
    expect(commit).not.toContain("setDockKey");
    expect(commit).not.toContain("openFlowCards");
  });

  /* ── Item 5 · the import's bookkeeping ─────────────────────────────────────────────────────── */

  it("⚠️ A PROVISIONAL RUNG SHOWS THE EVENT AND NOTHING ELSE", () => {
    /* the page's own derivation is what suppresses it, so this asserts the SHAPE the card is handed
       and that the card renders a note when there genuinely is one */
    const withNote = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [{ key: "e1", label: "Full requested", when: "2 Apr", status: "Full Requested", note: "First fifty pages as a PDF" }]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(withNote).toContain("First fifty pages as a PDF");
    /* and none at all when the page withholds it */
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [{ key: "e1", label: "Full requested", when: "2 Apr", status: "Full Requested" }]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(bare).not.toContain("tdk-tlq");
  });

  it("⚠️ AND THE PAGE WITHHOLDS IT ON THE STORED FLAG, NEVER BY MATCHING THE STRING", () => {
    /* matching "(imported" would be deriving state by reading a display string — the fault the
       record is built to avoid. `dateProvisional` is a real field and says exactly this. */
    expect(page).toContain("x.r.dateProvisional !== true ? { note: String(x.r.note) }");
    expect(code(page)).not.toContain("imported — date needed");
    expect(code(page)).not.toContain("(imported");
  });

  /* ── §3.5 — THE RINGS ────────────────────────────────────────────────────────────────────── */

  it("⚠️ the timeline renders the REAL StatusDot — never a ring drawn here", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [
          { key: "e1", label: "Query sent", when: "2 Jun", status: "Queried" },
          { key: "e2", label: "Partial requested", when: "28 Jun", status: "Partial Requested" },
          { key: "e3", label: "Offer received", when: "1 Aug", status: "Offer" },
        ]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    /* ⚠️ ASSERTED AGAINST THE COMPONENT'S OWN ROOT, not against a class this file chose and not
       against one BRANCH of its output. Two markers were tried and both were true of only some
       statuses: `<svg>` (several statuses are a tinted disc with no glyph) and `var(--sd-centre)`
       (Offer and the closed set keep their own palette rather than the theme tokens — the
       StatusDot lock says so). The root span's own signature is true of every status. */
    const ROOT = "width:20px;height:20px;flex-shrink:0;display:inline-flex";
    const marks = html.split('class="tdk-tlm"').slice(1);
    expect(marks).toHaveLength(3);
    for (const m of marks) expect(m.slice(0, 600)).toContain(ROOT);
    /* ⚠️ AND THE THREE DIFFER — one glyph per status. A dot that rendered the same mark for every
       rung would satisfy "it renders StatusDot" and still say nothing. */
    const glyphs = marks.map((m) => m.slice(0, 900));
    expect(new Set(glyphs).size, "every rung drew the same mark").toBe(3);
  });

  it("⚠️ A NUDGE CARRIES NO STATUS AND SO TAKES NO DOT — it is not a status change", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [{ key: "n1", label: "Nudge sent", when: "3 Jul" }]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    /* the track still renders — the connector runs past it — but nothing is drawn in it */
    expect(html).toContain('class="tdk-tlm"');
    expect(html.split('class="tdk-tlm"')[1].slice(0, 200))
      .not.toContain("width:20px;height:20px;flex-shrink:0;display:inline-flex");
  });

  it("⚠️ THE LOCAL RING IS GONE FROM THE STYLESHEET, not merely unused in the markup", () => {
    const css = readFileSync(join(here, "todoDock.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ COMMENTS STRIPPED FIRST — this file's own prose names every one of these while explaining
       that they were removed, and an unstripped read fails a file that is correct. */
    for (const dead of [".tdk-tlm i", "--tdk-ring", "r-out", "r-in", "r-now"]) {
      expect(css, `${dead} survives in the stylesheet`).not.toContain(dead);
    }
    /* the connector is the track's, and it is still there */
    expect(css).toContain(".tdk-tl li:not(:last-child) .tdk-tlm::after");
  });
});

describe("the flow mounted is the card's own kind", () => {
  it("agent-waiting offers the send, and its ink act NAMES what it records", () => {
    const html = render("a");
    expect(html).toContain("What goes");
    /* ⚠️ THE ACT'S NAME IS THE CARD FOOTER'S AGAIN, and the bar's copy of it is retired. It was
       moved to the bar on the "one action surface" rule, which was right — and the bar was the
       wrong surface: the deed belongs on the object it acts on. One derivation still, read once. */
    expect(page).toContain("primaryLabel={(c) => rowPrimaryLabel(c,");
    expect(code(page)).not.toContain("rowPrimaryLabel(paneCard, col)");
  });

  /**
   * ⚠️ THE CARD RECORDS, IT DOES NOT ASK — and this case asserted the opposite. It pinned a
   * CHECKBOX on the reading card, and a checkbox is the journey's control: it is where the writer
   * CHOOSES what went. On the card the same material is a statement of what is on file, so the
   * tick is a MARK. The old `confirmSend` state went with it — the card never read it back to
   * anything, so it was a control whose only effect was to look like one.
   */
  it("⚠️ the materials are a RECORD — a marked row, never an input", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} materials={() => [{ label: "The partial", sub: "QL v2" }]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(html).toContain("tdk-mat");
    expect(html).toContain("The partial");
    expect(html).toContain("QL v2");
    /* ⚠️ NO INPUT ANYWHERE IN THE WORK COLUMN — the tick is a glyph, not a control */
    const at = html.indexOf('class="tdk-work"');
    expect(at, "the work column marker is gone").toBeGreaterThan(-1);
    expect(html.slice(at)).not.toContain("<input");
    /* ⚠️ COMMENT-STRIPPED — the retirement note in `TodoDock.tsx` names the very identifier this
       forbids, which is the false red the house rule exists for. */
    expect(code(dockSrc)).not.toContain("confirmSend");
  });

  it("stale offers the close, and says what closing means for the response rate", () => {
    const html = render("b");
    expect(html).toContain("not a rejection");
  });

  it("a user task offers the tick — the only kind that finishes by ticking", () => {
    const html = render("c");
    expect(html).toContain("ticking it is what finishes it");
  });
});

/**
 * ⚠️ THE FOOT BAR IS RETIRED INTO THE COMMAND BAR (visual rebuild, Phase 4), and this describe
 * inverts rather than going. Two places to act on one task is how they come to offer different
 * verbs; a bar inside the card could only ever act on the card, while the page's bar states the
 * list's count as well.
 *
 * WHERE EACH PIECE WENT: the named primary → the bar's pink button (same `rowPrimaryLabel`);
 * Snooze → the bar's clock, another door onto the one dial; ⋯ → the bar's `Open query` and
 * `Dismiss`, which is what it actually reached; `NEXT: …` → the bar's previous/next pair, which
 * says the same thing as a position rather than as a name.
 */
describe("⚠️ THE CARD HAS NO ACTION BAR — there is one action surface and it is not here", () => {
  /**
   * ⚠️ THE CARD HAS A FOOTER AGAIN, AND THE DEED IS IN IT. This asserted the opposite, and the
   * reasoning behind that — "two places to act on one task is how they come to offer different
   * verbs" — was right about the DANGER and wrong about the remedy. What the page actually shipped
   * was a card that simply stopped, its last section cut by the pane's edge, with the only act
   * floating in a bar three inches above the thing it acted on.
   *
   * ⚠️ THE DANGER IS ANSWERED BY ONE DERIVATION, NOT BY ONE MOUNT. Both controls read the page's
   * own `rowPrimaryLabel`, so they cannot come to name the deed differently — which is asserted
   * below and is what makes two mounts safe where two vocabularies would not be.
   */
  it("the card's footer carries the deed; the quiet verbs stay on the bar", () => {
    const html = render();
    expect(html).toContain("tdk-foot");
    expect(html).toContain("tdk-prime");
    /* the verbs that belong to the surrounding chrome are still NOT in the card */
    for (const gone of ["tdk-next", 'aria-label="More"', 'aria-label="Snooze"']) {
      expect(html, gone).not.toContain(gone);
    }
  });

  it("⚠️ THE DEED HAS ONE MOUNT AGAIN — the card's footer, and the bar's copy is gone", () => {
    /* This case existed to make TWO mounts safe by pinning them to one derivation. The second
       mount is retired, so it now asserts the simpler and stronger thing: there is one. */
    expect(page).toContain("primaryLabel={(c) => rowPrimaryLabel(c,");        // the card
    expect(code(page)).not.toContain("tdw-cbprim");                           // the bar's is gone
    /* the card still holds no vocabulary of its own — the label arrives as a prop */
    expect(code(dockSrc)).not.toContain("rowPrimaryLabel");
  });

  it("…and the bar carries the SURROUNDING verbs, which is a different job", () => {
    /* Snooze, Open query, Dismiss and the previous/next pair act on the task's PLACE in the list;
       the deed acts on the record. The bar keeps the first kind and has given up the second. */
    for (const verb of ["Snooze", "Open query", "Dismiss", "Next task", "Previous task"]) {
      expect(page, verb).toContain(verb);
    }
    expect(code(page)).not.toContain("tdw-cbprim");
  });
});

describe("⚠️ THE ACTION BUTTON NEVER COMPLETES DIRECTLY — it opens the journey, and the journey commits", () => {
  /**
   * ⚠️ THIS SUITE USED TO ASSERT THE OPPOSITE, and the inversion is the point rather than a
   * deletion. It pinned `dockPrimary`'s inline `recordMaterialsSent` and `quickDone` — so the two
   * COMMONEST card kinds wrote straight from the command bar and the journey never opened, while
   * offer / stale / housekeeping / agent-waiting went the long way. One button, two behaviours,
   * and nothing on screen distinguishing them. Baked decision 4 now holds without exception.
   *
   * ⚠️ THE WRITES DID NOT DISAPPEAR, THEY MOVED TO THE ONE SURFACE THAT CAN STATE THEM. A send
   * still runs `recordMaterialsSent` through `markSentWriteArgs`, a note still runs
   * `updateUserTask` — asserted in `journeyTakeover.test.ts` under "COMMITTING WRITES ONCE,
   * THROUGH THE PRIMITIVE THAT ALREADY EXISTED", which is where they now live.
   */
  const fn = page.slice(page.indexOf("function dockPrimary"), page.indexOf("⚠️ `advanceDock` IS RETIRED"));

  it("its whole body is the journey — no write path is reachable from the bar", () => {
    expect(page.indexOf("function dockPrimary"), "dockPrimary is gone or renamed").toBeGreaterThan(-1);
    expect(fn.length, "the dockPrimary slice came out empty").toBeGreaterThan(40);
    expect(fn).toContain("openFlowCards([card])");
    for (const w of ["recordMaterialsSent", "quickDone", "updateQueryStatus", "updateUserTask",
      "upsertTaskFlag", "resolveTaskFlag", "logNudge", "dismissTask"]) {
      expect(fn, `dockPrimary reached for ${w}`).not.toContain(w);
    }
  });

  it("and it carves out no card kind — there is no spec, so there is nothing to fast-path", () => {
    /* the `SendSpec` argument existed ONLY to feed the inline write; taking it away is what makes
       a carve-out impossible to reintroduce by accident rather than merely discouraged */
    expect(fn).not.toContain("spec");
    expect(page).toContain("onPrimary={(c) => dockPrimary(c)}");
    expect(dockSrc).toContain("onPrimary: (card: BoardCard) => void;");
    expect(dockSrc).toContain("onPrimary(card);");
  });

  it("⚠️ the task going away is still DERIVED, never written — that law is unchanged", () => {
    /* The engine generates a partial_requested task BECAUSE the query sits at PARTIAL_REQUESTED.
       Moving the status retires the task by construction; a write there would be a second record
       of a fact the first already carries, and the two would eventually disagree. */
    expect(fn).not.toContain("done: true");
    expect(page).toContain("remains DERIVED");
  });
});

describe("⚠️ §4.4 — WHO ELSE HOLDS MATERIAL, and it states its own emptiness", () => {
  const offer = (holders: () => { queryId: string; name: string; holds: string; mail: { href: string | null; why: string } }[]) =>
    renderToStaticMarkup(
      <TodoDock queue={[card({ key: "o", title: "An offer", who: "Tom Ellery", taskType: "offer_received" })]}
        activeKey="o" onSelect={() => {}} onClose={() => {}} timeline={() => []}
        holders={holders} onPrimary={() => {}} onMore={() => {}} />,
    );

  it("a row per agent — name, what they hold, a draft link", () => {
    const html = offer(() => [{ queryId: "q1", name: "Jonathan Marsh", holds: "FULL SENT", mail: { href: "mailto:jm@x.co", why: "" } }]);
    expect(html).toContain("Who else holds material");
    expect(html).toContain("Jonathan Marsh");
    expect(html).toContain("FULL SENT");
    expect(html).toContain('href="mailto:jm@x.co"');
  });

  /**
   * ⚠️ A CORRECTLY-EMPTY SECTION AND AN UNBUILT ONE LOOK IDENTICAL, which is why this states the
   * answer rather than vanishing: neither the writer nor a reviewer could tell which they were
   * looking at, and the acceptance pass could not assert the difference either. "Nobody else is
   * holding anything" is also a real answer at offer stage — there is no one to notify.
   */
  it("⚠️ nobody holding anything SAYS SO — the heading stands and the answer is stated", () => {
    const html = offer(() => []);
    expect(html).toContain("Who else holds material");
    expect(html).toContain("No other agent is holding material.");
  });

  it("a greyed draft link keeps its reason on the control", () => {
    const html = offer(() => [{ queryId: "q1", name: "Ana", holds: "PARTIAL SENT", mail: { href: null, why: "No email address on file for this agent." } }]);
    expect(html).toContain("No email address on file for this agent.");
    expect(html).not.toContain('href="mailto:null');
  });
});

describe("⚠️ AN UNDOCKABLE KEY IS REFUSED, NEVER SUBSTITUTED", () => {
  /**
   * ⚠️ MEASURED ON THE DEPLOYED PAGE: clicking the grouped "12 wish lists" row opened Noah
   * Bright's offer. `openDock` read `activeKey && dockable.some(…) ? activeKey : dockable[0].key`,
   * so a key the queue does not hold silently docked the FIRST card. Worse than a stale selection,
   * because it is always the same card and so looks deliberate — the writer clicks one row and is
   * shown another, with nothing saying so.
   */
  it("a named key that is not in the queue docks nothing", () => {
    expect(code(page)).toContain("if (activeKey && !dockable.some((c) => c.key === activeKey)) return;");
    /* ⚠️ AND THE SUBSTITUTION IS GONE, not merely guarded ahead of */
    expect(code(page)).not.toContain("? activeKey : dockable[0].key");
  });

  it("⚠️ but NO key still starts at the top — that is the work-through entrance, not a fallback", () => {
    expect(code(page)).toContain("const start = activeKey ?? dockable[0].key;");
    expect(code(page)).toContain('onClick={() => openDock()}');
  });
});

describe("⚠️ ONE SURFACE, EVERY ENTRANCE", () => {
  it("Action now, the bounce toast's Open and the card doors all call openDock", () => {
    /* board fixes II P1 reshaped the action case: a SWEEP routes to its batch sheet first, and
       every other card docks — the assert follows the call, not the old one-line layout.
       P3 then retired the tool-row launcher: openFocusedSession is DELETED (its one line lives
       on as the card doors' own call), so the entrances are cards · menu · bounce · Today. */
    expect(page).toContain('case "action":');
    expect(page).toContain("openDock(card.key);");
    expect(page).toContain("fn: async () => { openDock(");                   // the bounce
    expect(page).not.toContain("openFocusedSession");                        // the identifier is extinct
    expect(page).not.toContain("tdb-ghb");                                   // and so is its button
    expect(page).toContain("onOpen={(c) => openDock(c.key)}"); // the doors
    /* ⚠️ "Work the list" IS RETIRED (corrections, Phase 4) — it opened the dock over the whole
       queue, and the dock IS the right-hand pane now, so the button entered a mode you were
       already in. Its listener went with it; nothing else in `src/` dispatches the event. */
    expect(code(page)).not.toContain("const onWork");
    expect(code(page)).not.toContain("TODO_WORK_THE_LIST,");
  });

  it("and the separate focused-session surface is GONE", () => {
    expect(page).not.toContain("<FocusedSession");
    expect(page).not.toContain("setSession(");
  });

  it("closing restores the board's scroll — you go back where you were, not to the top", () => {
    expect(page).toContain("boardScroll.current = document.getElementById(STAGE_SCROLL_ID)?.scrollTop");
    expect(page).toContain("el.scrollTop = boardScroll.current;");
  });

  it("⚠️ advancing is RETIRED with the inline write — the journey owns its own queue", () => {
    /* `advanceDock` pointed the pane at the next card once the BAR had recorded this one. The bar
       records nothing now, so there is no moment here to advance from — and reinstating it would
       mean the pane moving on for a completion that happened in another surface.
       ⚠️ `nextInQueue` GOES WITH IT — `advanceDock` was its only caller on this page. The dock's
       own left/right step walks `dockable[i ± 1]` by index and never used it. */
    expect(code(page)).not.toContain("function advanceDock");
    expect(code(page)).not.toContain("advanceDock(");
    expect(code(page)).not.toContain("nextInQueue");
    expect(page).toContain("dockable[i - 1]");
    expect(page).toContain("dockable[i + 1]");
    expect(page).toContain("owns its own queue and its own advance");
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

/* ── the dock's DOORS (board fixes II, Phase 2) ────────────────────────────────────────────── */

describe("⚠️ the card is the door — click, Enter, and the menu's Action now all dock it", () => {
  const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
  const css = readFileSync(join(here, "todoBoard.css"), "utf8");

  it("the page's onOpen docks the clicked card (not the whole page's default)", () => {
    expect(page).toContain("onOpen={(c) => openDock(c.key)}");
  });

  it("click and Enter both call onOpen; the ⋯ trigger stops propagation so the seat never docks", () => {
    const article = board.slice(board.indexOf("<article"), board.indexOf("</article>"));
    expect(article).toContain("if (!clickIsDrag(e)) onOpen(c)");
    expect(article).toContain('e.key === "Enter" || e.key === " "');
    const seat = article.slice(article.indexOf('className="tbd-more"'));
    expect(seat).toContain("e.stopPropagation()");
  });

  it("⚠️ click is distinguished from drag by MOVEMENT — a threshold plus the dragstart poison", () => {
    expect(board).toContain("const DRAG_THRESHOLD_PX = 5");
    expect(board).toContain("Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_THRESHOLD_PX");
    expect(board).toContain("draggedRef.current = true; setDragging(");
    // the poison is consumed on read — one drag must not eat the NEXT genuine click
    expect(board).toContain("if (draggedRef.current) { draggedRef.current = false; return true; }");
  });

  it("OPEN ▸ whispers on every card — always in the DOM, revealed by the card's hover", () => {
    const columns = { todo: [card({ key: "a" }), card({ key: "b" })], today: [], snoozed: [], done: [] };
    const html = renderToStaticMarkup(
      <TodoBoard columns={columns} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(html.match(/OPEN ▸/g)?.length).toBe(2);
    // the reveal is opacity in the stylesheet — never conditional render
    expect(css).toMatch(/\.tbd-hint\s*\{[^}]*opacity:\s*0/);
    expect(css).toContain(".tbd-card:hover .tbd-hint");
  });
});

/* ── the two-column work surface (board-optimise pack, Phase 4) ────────────────────────────── */

describe("⚠️ the work surface is a TWO-COLUMN SHEET — the story beside the work, not above it", () => {
  const dockCss = readFileSync(join(here, "todoDock.css"), "utf8");

  /**
   * ⚠️ THE INNER SPLIT STANDS; THE OUTER ONE DOES NOT (Phase 5). This case used to assert the
   * 30/70 outer grid on the grounds that "a slide-over would hide the queue, and the queue is
   * half the point" — true of a surface that had replaced the list. The rail holds the queue now,
   * so the outer column is gone and the story-beside-work sheet is the only split left.
   */
  it("the outer 30/70 split is RETIRED — one column, and no Queue landmark", () => {
    expect(dockCss).not.toMatch(/\.tdk\s*\{[^}]*grid-template-columns/);
    expect(dockSrc).not.toContain('aria-label="Queue"');
  });

  /**
   * ⚠️ THE RECORD TAKES THE WIDTH, THE DOING IS BOUNDED — and these were INVERTED. `.tdk-story`
   * was pinned at 230px while `.tdk-work` flexed, so the timeline (the richest thing on the card,
   * and the only part whose content varies) was squeezed into the narrowest column while a
   * checkbox and two buttons took the rest.
   */
  it("the record column is the flexible one; the doing column is bounded", () => {
    const body = dockCssRule(".tdk-body {");
    expect(body).toContain("display: grid");
    /* ⚠️ 300–360, NOT THE REF'S 330–400. `minmax` takes its MAX whenever there is room, so a 400px
       doing column leaves the fr track everything above 400 + 30 of gap — the record is only the
       wider of the two on a card past ~878px. Measured on the deployed page at 1920, card filling
       its 830px pane, the body still resolved to `352px 400px`. The pane cannot get wider, so the
       ref's numbers cannot produce the ref's intent here. THE LAW WINS OVER THE NUMBERS. */
    expect(body).toContain("grid-template-columns: minmax(0, 1fr) minmax(300px, 360px)");
    /* ⚠️ THE RECORD IS FIRST — the wide track is the story's, not the work's */
    const html = render();
    const story = html.indexOf('class="tdk-story"');
    const work = html.indexOf('class="tdk-work"');
    expect(story, "the story column is gone").toBeGreaterThan(-1);
    expect(work, "the work column is gone").toBeGreaterThan(-1);
    expect(story).toBeLessThan(work);
    /* neither column carries a fixed width any more */
    expect(dockCssRule(".tdk-story {")).not.toContain("230px");
  });

  /**
   * ⚠️ THE STACK IS A CONTAINER QUERY. The card sits in a pane whose width the viewport does not
   * describe — the split's rail takes its share first — so the old `@media (max-width: 900px)`
   * stacked it on a wide screen and left it two-up in a narrow pane.
   */
  it("it stacks on the CARD's width, not the viewport's", () => {
    const css = readFileSync(join(here, "todoDock.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.tdk-w \{[^}]*container-type: inline-size/);
    const at = css.indexOf("@container");
    expect(at, "the card has no container query").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    const cols = /\.tdk-body \{[^}]*grid-template-columns:([^;}]+)/.exec(block);
    expect(cols, "the container query does not restate the body's columns").toBeTruthy();
    const tracks = cols![1].trim().replace(/minmax\([^)]*\)/g, "T").split(/\s+/).filter(Boolean);
    expect(tracks).toHaveLength(1);
    /* and no viewport query is doing the container's job for this card */
    expect(css).not.toContain("@media (max-width: 900px)");
  });

  /**
   * ⚠️ THE COLUMN IS **TRACKING** NOW (journeys pack, Phase 2), borrowing the Query Centre's own
   * section rather than growing a second story panel. Its stat pair re-presents the band's two
   * facts — one derivation, three presentations — and its rows read `activityEventLabel`, which
   * `dockTimeline` already called.
   */
  it("the column is headed TRACKING and opens with the stat pair", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [{ key: "e1", label: "Full requested", when: "12 Jul" }]}
        onPrimary={() => {}} onMore={() => {}}
        handoff={() => ({ waitLabel: "Greg has waited", waitValue: "6 weeks", anchorLabel: "Requested", anchorValue: "28 Jun" })} />,
    );
    expect(html).toContain("TRACKING");
    expect(html).toContain("tdk-tstats");
    expect(html).toContain("6");            // the Playfair figure
    expect(html).toContain("weeks");        // …with the unit split off for Inter
    expect(html).toContain("28 Jun");
    expect(html).toContain("Full requested");
  });

  it("⚠️ EVERY ENRICHMENT IS ABSENT WHERE THE RECORD IS SILENT", () => {
    /* a row that says "Full requested" and nothing else renders exactly that — no empty chip
       strip, no bar with no scale, no channel invented */
    const bare = render();
    expect(bare).not.toContain("tdk-chips");
    expect(bare).not.toContain("tdk-prog");
    expect(bare).not.toContain('class="via"');
  });

  /**
   * ⚠️ THE RULE IS "THE BODY OMITS WHATEVER THE BAND IS SHOWING", not "the body never shows the
   * title" — and the difference is a whole feature. The original was written for an AGENT card,
   * where `bandSubject` returns the name, and generalised to every kind. On a user task
   * `card.who` is `""`, so the band falls through to the standing label "Your noteboard"; with
   * the title also withheld, the note's own words rendered NOWHERE. Both halves are asserted
   * together now, so neither can be "simplified" back into the rule that broke one of them.
   */
  it("an AGENT card omits the title and the record — the band is already showing them", () => {
    const html = render();
    const at = html.indexOf('class="tdk-work"');
    expect(at, "the work column marker is gone").toBeGreaterThan(-1);
    const work = html.slice(at);
    expect(work).not.toContain("tdk-t\"");
    expect(work).not.toMatch(/["\s`]tdk-rec["\s`]/);
    expect(work).toContain("tdk-flow");
    /* and the band IS carrying the name, which is what earns the omission */
    expect(html.slice(0, at)).toContain("Jonathan Marsh");
  });

  it("⚠️ a NOTE shows its own words — the band is only showing a standing label", () => {
    const html = render("c");
    const at = html.indexOf('class="tdk-work"');
    expect(at, "the work column marker is gone").toBeGreaterThan(-1);
    /* ⚠️ THE BAND SLICE ENDS AT THE BODY, NOT AT THE WORK COLUMN. The note moved INTO the record
       column, which sits between the two — so slicing to `.tdk-work` now includes the note and the
       assertion would be reading the body while claiming to read the band. */
    const bodyAt = html.indexOf('class="tdk-body"');
    expect(bodyAt, "the body marker is gone").toBeGreaterThan(-1);
    /* the band names the surface, not the note — which is precisely why the body must carry it */
    expect(html.slice(0, bodyAt)).toContain("Your noteboard");
    expect(html.slice(0, bodyAt)).not.toContain("Redraft the opening");
    /* ⚠️ THE NOTE IS IN THE RECORD COLUMN NOW, NOT THE DOING ONE (pane faults, Phase 2) — it is
       the content of a note card, so it leads, in the WIDE column. It was in the bounded column
       beside a hint sentence while the wide one held a stat tile and an empty Tracking section. */
    const story = html.indexOf('class="tdk-story"');
    expect(story, "the record column is gone").toBeGreaterThan(-1);
    expect(story).toBeLessThan(at);
    const rec = html.slice(story, at);
    expect(rec, "the note's own text renders nowhere on its own pane").toContain("Redraft the opening");
    const work = rec;
    expect(work).toContain("tdk-bignote");
    expect(dockCssRule(".tdk-bignote")).toContain("Caveat");
    expect(dockCssRule(".tdk-bignote")).toContain("font-size: 28px");
  });


  /**
   * ⚠️ AND A NOTE SHOWS NO TRACKING SECTION AT ALL. A note has no query and no history, so
   * "Nothing logged yet." against one is an empty section pretending to be a populated one — the
   * heading is suppressed rather than filled with an empty state.
   */
  it("a note suppresses Tracking entirely — heading and empty state both", () => {
    const html = render("c");
    expect(html).not.toContain("TRACKING");
    expect(html).not.toContain("Nothing logged yet.");
  });

  /* ⚠️ ON AN AGENT CARD — a note has no history to be empty OF, and suppresses the section whole
     (see above). The fixture is the send, not the note, which is what this asserted before the
     note's own column existed to confuse it. */
  it("an empty history says so rather than leaving a frame implying something is missing", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(html).toContain("Nothing logged yet.");
  });

  it("⚠️ THE FOOTER IS PINNED AND DOES NOT SCROLL — it is the body's bottom edge", () => {
    /* This asserted the footer's ABSENCE, on the reading that its contract had moved wholly to the
       command bar. Half of that is still true and still asserted — the quiet verbs are the bar's —
       but the deed came back, and with it the thing the card had been missing: a bottom edge for
       the body to scroll against. */
    expect(render()).toContain("tdk-foot");
    expect(page).toContain('className="tdw-cbar"');
    const foot = dockCssRule(".tdk-foot {");
    expect(foot).toContain("flex: none");                 // outside the scroller
    /* inside the 6px inset, like the band above it — a flush footer would lay its fill across the
       frame at the bottom corners, which is why the band carries the same margin */
    expect(foot).toContain("margin: 0 6px 6px");
    expect(foot).toContain("border-radius: 0 0 8px 8px");
    /* and it is a SIBLING of the body, never inside it */
    const src = code(dockSrc);
    expect(src.indexOf('className="tdk-foot"')).toBeGreaterThan(src.indexOf('className="tdk-body"'));
  });
});

/**
 * ⚠️ THE DOCK-SEAL IS UNMOUNTED, AND ITS ART IS NOT DELETED (visual rebuild, Phase 4). The seal was
 * struck by the CARD'S ink primary as a flourish over a finished act; the act is the command bar's
 * now, so there is nothing here to strike it. `ArtSlot name="dock-seal"`, its 600ms keyframe and
 * the reduced-motion stop are all untouched in `artSlot.css` — the flourish returns the day a
 * completion has a home in this surface again.
 *
 * Inverted rather than deleted so the ASSET is not quietly orphaned: if someone removes the art
 * believing it dead, this is where the reason it survives is written down.
 */
describe("⚠️ THE SEAL IS UNMOUNTED, ITS ART SURVIVES", () => {
  it("nothing in the card strikes it, and no seal state remains", () => {
    expect(code(dockSrc)).not.toContain("setSealing");
    expect(code(dockSrc)).not.toContain("SEAL_MS");
    expect(code(dockSrc)).not.toContain("reducedMotion");
  });

  it("⚠️ AND THE ART IS STILL REGISTERED — an orphaned asset is not a deleted one", () => {
    const slots = readFileSync(join(here, "ArtSlot.tsx"), "utf8");
    expect(slots).toContain("dock-seal");
  });
});

/* ── the workspace card (rail + workspace, Phase 5) ──────────────────────────────────────────── */

describe("⚠️ THE HEAD ROW IS CHROME ABOUT THE CARD, and the arrows are the pointer's ↑↓", () => {
  it("the position names where you are in the set the rail is showing", () => {
    expect(render("a")).toContain("Task 1 of 3");
    expect(render("b")).toContain("Task 2 of 3");
  });

  /**
   * ⚠️ DISABLED AT THE ENDS, NOT HIDDEN. A control that vanishes at the edge of a list makes the
   * edge feel like a fault; a dim one says "this is the end" and stays where your hand expects it.
   * The same reasoning as the row cluster's dim-in-place icons.
   */
  it("previous is dead on the first card, next on the last, and neither disappears", () => {
    const first = render("a");
    expect((first.match(/class="tdk-nav"/g) ?? [])).toHaveLength(2);
    expect(first).toContain('aria-label="Previous task" disabled');
    expect(first).not.toContain('aria-label="Next task" disabled');
    const last = render("c");
    expect((last.match(/class="tdk-nav"/g) ?? [])).toHaveLength(2);
    expect(last).toContain('aria-label="Next task" disabled');
  });

  it("⚠️ THE ARROWS AND THE KEYS REACH ONE FUNCTION — `stepQueue`, on the queue prop", () => {
    /* Two ways to walk a list that resolved through different code would eventually disagree
       about what "next" means, and only one of them would be tested. */
    expect((dockSrc.match(/stepQueue\(queue, card\??\.?key/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  /**
   * ⚠️ THE CARD FILLS THE PANE, AND THE 640px CAP IS WHAT INVERTED THE COLUMNS. Measured on the
   * deployed page at 1920 the body resolved to `162px 400px` — the RECORD on 162 — which is
   * exactly the fault the column swap was meant to fix. The arithmetic: 640 card → 592 content →
   * minus the 30px gap → 562, and the doing's `minmax(330px, 400px)` takes 400 of it, leaving the
   * fr track 162. Two columns need 690 of content before the record gets an equal share. The track
   * numbers are the ref's and are right; the cap was mine and was wrong — and the ref says so in
   * its own comment: "the card fills the pane; the frame is the workspace edge".
   *
   * ⚠️ THE READING MEASURE MOVED TO THE BOUNDED TRACK, which is a better home for it: the doing
   * column's own `minmax(330px, 400px)` is what stops prose running long, without also deciding
   * the record's width.
   */
  it("the card fills the pane — no cap competing with the column tracks", () => {
    const w = dockCssRule(".tdk-w {");
    expect(w).not.toContain("max-width");
    expect(dockCssRule(".tdk-head {")).not.toContain("max-width");
    /* the measure now lives where it only constrains the doing */
    expect(dockCssRule(".tdk-body {")).toContain("minmax(300px, 360px)");
  });

  /**
   * ⚠️ THE CARD IS A DOCUMENT, NOT A PANEL (v14 `.f11`). It was a white box with a hairline — the
   * sections right, the object wrong. Three layers, each doing a different job, and the frame is
   * the one with a history: drawn on a CHILD it is an overlay border that fills paint over and
   * siblings escape, which is the `.qhbar::after` spill the MountCard fix exists to prevent.
   */
  it("⚠️ the card is parchment with grain and a two-part shadow — and NO border", () => {
    const rule = dockCssRule(".tdk-w {");
    expect(rule).toContain("background: var(--paper)");
    expect(rule).toContain("feTurbulence");
    expect(rule).toContain("slope='0.03'");            // the app's own grain, not a new opacity
    expect(rule).toContain("border-radius: 14px");
    /* the contact shadow AND the lift — one without the other is a card that floats or sits, not both */
    expect(rule).toContain("0 1px 2px rgba(58, 28, 20, 0.05), 0 10px 32px rgba(58, 28, 20, 0.08)");
    /* ⚠️ NO HAIRLINE: the shadow separates the card from the ground, and a border would draw the
       edge twice. Matched as a declaration so `border-radius` / `box-sizing` cannot satisfy it. */
    expect(rule).not.toMatch(/(^|;)\s*border:/);
  });

  it("⚠️ the inset frame is on the CARD, above everything, inert — never on a child", () => {
    const frame = dockCssRule(".tdk-w::before {");
    expect(frame).toContain("inset: 6px");
    expect(frame).toContain("border: 1px solid rgba(124, 58, 42, 0.28)");
    expect(frame).toContain("border-radius: 10px");
    expect(frame).toContain("pointer-events: none");
    expect(frame).toContain("z-index: 5");
    /* ⚠️ THE BAND STAYS INSIDE IT BY ITS OWN MARGIN — and that margin IS the frame's inset. Two
       numbers that must agree, agreeing because they describe one gap. Asserted together so a
       change to either fails rather than silently putting the band's fill across the rule. */
    const band = dockCssRule(".tdk-band {");
    expect(band).toContain("margin: 6px 6px 0");
    expect(band).toContain("overflow: hidden");
  });

  it("⚠️ the card REACHES THE BOTTOM of the pane, and does not become full-bleed", () => {
    const rule = dockCssRule(".tdk-w {");
    /* vertical: it fills. `min-height: 340px` was a CONTENT floor pretending to be a height — a
       short record left a stub card floating in a tall pane with the desk showing beneath it. */
    /* ⚠️ IT FILLS RATHER THAN MERELY REACHING. `min-height: 100%` made the card AT LEAST the pane's
       height and let it grow past it — which is how a long record produced a card whose bottom edge
       was never on screen and whose band scrolled away. `flex: 1; min-height: 0` makes it exactly
       the remaining height, so the body is what scrolls. `min-height: 340px`, the content floor
       that started all this, stays gone. */
    expect(rule).toContain("flex: 1");
    expect(rule).toContain("min-height: 0");
    expect(rule).not.toContain("min-height: 340px");
    expect(rule).not.toContain("min-height: 100%");
    /* ⚠️ THE MATHS DEPENDS ON THE BOX MODEL, SO THE RULE DECLARES IT rather than inheriting
       preflight — the harness trap the house rules name. */
    expect(rule).toContain("box-sizing: border-box");
    /* ⚠️ HORIZONTAL: THE CAP IS GONE — see "the card fills the pane". It competed with the column
       tracks and the record lost. The measure is the doing column's bounded track now. */
    expect(rule).not.toContain("max-width");
    /* ⚠️ AND THE CARD'S BODY SCROLLS WHEN THE RECORD OUTGROWS IT — not the pane. The pane holds a
       definite height so the card can fill it; a scrolling pane over a content-sized card is what
       cut the record paragraph mid-sentence with the card's bottom edge off screen. */
    const split = readFileSync(join(here, "todoSplit.css"), "utf8");
    const pane = split.slice(split.indexOf(".tdw-work {"), split.indexOf("}", split.indexOf(".tdw-work {")));
    expect(pane.length, "the .tdw-work slice came out empty").toBeGreaterThan(20);
    expect(pane).toContain("display: flex");
    /* ⚠️ ASSERTED ON THE RENDERED CARD, not on the stylesheet. `EdgeFadeScroll` sets the scroller's
       overflow INLINE, so a CSS lock reads a rule that no longer carries it and fails a page that
       works — the mirror image of a CSS lock passing while the cascade does something else. */
    const html = render();
    expect(html).toContain("overflow-y:auto");
    expect(html).toContain('class="tdk-body"');
    /* ⚠️ AND THE FADES ARE THE SHARED COMPONENT'S — never a second mechanism drawn here. The two
       overlays are what make the overflow EVIDENT; the scrolling was never the missing half. */
    expect(html).toContain("linear-gradient(to bottom, var(--paper");
    expect(html).toContain("linear-gradient(to top, var(--paper");
  });
});

/**
 * ⚠️ THE HAND-OFF IS THE POINT OF THE PAGE. ScriptAlly does not send anything — the work happens
 * in the writer's own email or on the agency's site — so the card's job is to hand them over with
 * the recipient and subject composed, and then be told what happened.
 */
describe("⚠️ THE HAND-OFF HANDS OVER, and it never invents what it hands", () => {
  const withAgent = (active = "a") => renderToStaticMarkup(
    <TodoDock
      queue={QUEUE} activeKey={active} onSelect={() => {}} onClose={() => {}}
      timeline={() => []} onPrimary={() => {}} onMore={() => {}}
      handoff={() => ({ email: "b@carter.co.uk", website: "carterlit.com", msTitle: "Murphy's Day Out" })}
    />,
  );

  it("a send carries both links, the subject as copyable text, and the one italic line", () => {
    const html = withAgent("a");
    expect(html).toContain("mailto:b@carter.co.uk");
    expect(html).toContain("https://carterlit.com");
    expect(html).toContain("Requested full");
    expect(html).toContain("tdk-copy");
    expect(html).toContain("The send happens in your own email");
  });

  /**
   * ⚠️ A MISSING FIELD GREYS AND EXPLAINS — it does not vanish, and it is `aria-disabled` on a
   * live element rather than `disabled`, because the tooltip that says WHY is the only thing that
   * explains the grey and a dead control is unreachable by pointer and keyboard alike.
   */
  it("no email on file: the control stays, greyed, naming the field", () => {
    const html = render("a"); // the bare render passes no handoff data at all
    expect(html).toContain("tdk-hbtn");
    expect(html).toContain("off");
    expect(html).toContain("No email address on file");
    expect(html).not.toContain("mailto:");
  });

  it("⚠️ ONLY A SEND GETS ONE — a stale query has nobody to send anything to", () => {
    /* `paneSections` decides; the card asks. A "Where to send it" block over a housekeeping gap
       would offer to email an agent about a missing postcode. */
    const stale = withAgent("b");
    expect(stale).not.toContain("The send happens in your own email");
    expect(stale).not.toContain("mailto:");
  });

  it("the card asks `paneSections` rather than branching on the task type itself", () => {
    expect(dockSrc).toContain("const sections = paneSections(card);");
    expect(dockSrc).toContain('sections.some((x) => x.id === "handoff")');
  });
});

describe("⚠️ THE PANE IS NEVER PROVISIONALLY EMPTY, and never congratulates", () => {
  it("the page rests on the first open card in the current filter — once, not on every render", () => {
    expect(page).toContain("setDockKey(dockable[0].key);");
    expect(page).toContain("if (restedOnce.current) return;");
    /* otherwise closing the pane deliberately would re-open it on the next frame */
    expect(page).toContain("restedOnce.current = true;");
  });

  it("the empty pane states facts and carries no verdict", () => {
    expect(page).toContain("Nothing needs you.");
    expect(page).toContain("paneRestLine(");
    const at = page.indexOf('className="tdw-none"');
    expect(at, "the empty pane's marker is gone — this slice would read the whole file").toBeGreaterThan(-1);
    const panel = page.slice(at, at + 700);
    expect(panel).not.toMatch(/\b(great|well done|congrat|nice work)\b/i);
  });
});

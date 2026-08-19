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
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { TodoDock } from "./TodoDock";
import { TodoBoard } from "./TodoBoard";
import { parseAgentMaterials } from "../../lib/agentMaterials";

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

/* one offer card, shared by the two specs that mount one — the queue and the `card` prop must name
   the SAME object, so declaring it once is the only way they cannot drift */
const OFFER_CARD = card({ key: "o", title: "An offer", who: "Tom Ellery", taskType: "offer_received" });

const render = (active = "a", queue = QUEUE) =>
  renderToStaticMarkup(
    <TodoDock
      queue={queue}
      /* ⚠️ THE SPEC RESOLVES IT THE WAY THE PAGE DOES, and this is the one place a literal would be
         wrong: passing a card the queue does not contain would make every spec below test a mount
         the app cannot produce. */
      card={queue.find((c) => c.key === active) ?? queue[0]}
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
    /* `nextInQueue` survives in `lib/todoDock` but the CARD names no other card. The PANE HEADER's
       arrows and its "Task 2 of 4" carry where you are and where you can go — one fact, stated
       once. (They were the bar's; the bar's copy is retired, so this now reads the header's own,
       which is in `TodoDock` rather than in the page.) */
    expect(code(dockSrc)).not.toContain("nextLabel");
    expect(dockSrc).not.toContain("LAST IN THE QUEUE");
    expect(dockSrc).toContain('aria-label="Next task"');
    expect(dockSrc).toContain('aria-label="Previous task"');
    /* and the page no longer carries a second pair that could disable differently */
    expect(code(page)).not.toContain('aria-label="Next task"');
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
      <TodoDock queue={[OFFER_CARD]} card={OFFER_CARD}
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

  it("⚠️ THE BAND LEADS WITH THE DEED — a note's band names the note, not a standing subject", () => {
    /* ⚠️ SUPERSEDED BY PHASE A, AND INVERTED RATHER THAN DELETED. This asserted "Your noteboard":
       the band led with the agent, so a card with no person fell back to a standing label to give
       the disc something to introduce. There is no disc now and the band leads with the DEED, so a
       note names the note. The old fallback would today be the band answering a question nobody
       asked. */
    const note = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE.find((c) => c.key === "c") ?? QUEUE[0]} activeKey="c" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(note).toContain("Redraft the opening");
    expect(note, "the retired monogram is back").not.toMatch(/["\s]tdk-av["\s]/);
  });

  it("the timeline renders when there is history, and is absent when there is none", () => {
    expect(render()).toContain("Full requested");
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
    /* ⚠️ §2.1's DISC IS RETIRED (Phase A) AND THE LOCK NOW GUARDS ITS ABSENCE — the stronger
       claim. A rule left in the stylesheet for a deleted element is how the disc comes back. */
    expect(readFileSync(join(here, "todoDock.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
      "the monogram rule is back in the stylesheet").not.toContain(".tdk-av {");
    /* §2.3 is the DEED now, at the chassis contract's 26px/500 — `.tdk-name` is gone with the
       agent-led band that needed it. */
    const deed = dockCssRule(".tdk-deed {");
    expect(deed).toContain("font-size: 26px");
    expect(deed).toContain("font-weight: 500");
    /* ⚠️ §3.8's 66px DATE TRACK IS SUPERSEDED, and this lock caught the change rather than being
       quietly edited around it. `todo-journey-in-pane.html` is the newer of the two authoritative
       refs and describes the pane this timeline is in; its `.tl-row` is 60 · 20 · rest, and the
       20 is sized for a real `StatusDot` rather than for the local ring 66 was drawn around. */
    expect(dockCssRule(".tdk-tl li {")).toContain("grid-template-columns: 60px 20px");
  });

  /* ── Item 9 · the journey renders in the pane ──────────────────────────────────────────────── */

  const withJourney = (over: Partial<React.ComponentProps<typeof TodoDock>> = {}) =>
    renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
    /* ⚠️ AND EVERY BULK SURFACE JOINS THE RULE RATHER THAN BYPASSING IT. FOUR footers exist in this
       file now — the card's own, the journey's, the housekeeping sweep's and the record sweep's —
       and the card's stands down for any of the other three, which never render together.

       ⚠️ ASSERTED AS THE GUARD'S TERMS, NOT AS ONE LITERAL. This read `{!cohort && draft && (` and
       went red the moment a third surface joined the guard — a correct change failing a lock that
       was pinned to the old arity rather than to the rule. The terms are what the rule is. */
    for (const term of ["!draft", "!cohort", "!recCohort"]) {
      expect(code(dockSrc), `the card's own foot ignores ${term}`).toContain(term);
    }
    expect(code(dockSrc)).toContain("{!draft && !cohort && !recCohort && (");
    expect(code(dockSrc)).toContain("{!cohort && !recCohort && draft && (");
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
    const commit = sliceBetween(page, "async function commitSendFromPane", "function dockTimeline");
    expect(commit).not.toContain("stepQueue");
    expect(commit).not.toContain("setDockKey");
    expect(commit).not.toContain("openFlowCards");
  });

  /* ── the footer's task verbs ────────────────────────────────────────────────────────────────── */

  it("⚠️ THE FOOTER CARRIES THIS TASK'S VERBS — hint, three quiet buttons, divider, black Action", () => {
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}}
        primaryLabel={() => "Action"}
        verbs={() => ({
          snooze: { disabled: false, onPress: () => {} },
          openQuery: { disabled: false, onPress: () => {} },
          dismiss: { disabled: false, onPress: () => {} },
        })} />,
    );
    const foot = html.slice(html.indexOf('class="tdk-foot"'));
    expect(html.indexOf('class="tdk-foot"'), "the footer marker is gone — this slice reads nothing").toBeGreaterThan(-1);
    for (const v of ["Snooze", "Open query", "Dismiss", "Action"]) expect(foot, v).toContain(v);
    expect(foot).toContain("tdk-vbsep");
    /* the order the ref draws: hint, three verbs, divider, primary */
    const at = (t: string) => foot.indexOf(t);
    expect(at("tdk-foothint")).toBeLessThan(at("Snooze"));
    expect(at("Snooze")).toBeLessThan(at("Open query"));
    expect(at("Open query")).toBeLessThan(at("Dismiss"));
    expect(at("Dismiss")).toBeLessThan(at("tdk-vbsep"));
    expect(at("tdk-vbsep")).toBeLessThan(at("tdk-prime"));
  });

  it("⚠️ AN INAPPLICABLE VERB GREYS IN PLACE AND NEVER VANISHES", () => {
    /* an offer cannot be dismissed; a control that disappears leaves the writer wondering whether
       the app knows something they do not */
    const html = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}}
        verbs={() => ({
          snooze: { disabled: true, onPress: () => {} },
          openQuery: { disabled: true, onPress: () => {} },
          dismiss: { disabled: true, onPress: () => {} },
        })} />,
    );
    expect(html).toContain("Dismiss");
    expect((html.match(/class="tdk-vb" disabled/g) ?? [])).toHaveLength(3);
    /* the house disabled grammar — paper, hairline, faint, not-allowed; never opacity alone */
    const rule = dockCssRule(".tdk-vb:disabled {");
    expect(rule).toContain("cursor: not-allowed");
    expect(rule).not.toContain("opacity");
  });

  it("⚠️ THE HINT GIVES UP THE SPACE FIRST — buttons never wrap to a second row", () => {
    /* a verb on its own line reads as a different control from the three above it */
    const hint = dockCssRule(".tdk-foothint {");
    expect(hint).toContain("margin-right: auto");
    expect(hint).toContain("min-width: 0");
    /* ⚠️ IT GIVES BY WRAPPING NOW, NOT BY ELLIPSING — and the intent is unchanged: the hint is
       still the only thing that yields, and `.tdk-vb`'s `flex: none` below is still what keeps the
       buttons on one row. The mechanism changed because the ellipsis cut the sentence mid-word on
       the note pane ("…this records…"), and a promise the reader cannot finish is worse than a
       second line. Asserted as the absence of the truncation pair, so it cannot come back. */
    expect(hint).not.toContain("text-overflow: ellipsis");
    expect(hint).not.toContain("white-space: nowrap");
    expect(hint).toContain("overflow-wrap: anywhere");
    expect(dockCssRule(".tdk-vb {")).toContain("flex: none");
  });

  it("the card renders no verbs at all when the page hands it none", () => {
    /* the prop is the seam — a card without it is the surface as it was */
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(bare).not.toContain("tdk-vbsep");
    expect(bare).not.toContain("Open query");
  });

  /* ── Item 5 · the import's bookkeeping ─────────────────────────────────────────────────────── */

  it("⚠️ A PROVISIONAL RUNG SHOWS THE EVENT AND NOTHING ELSE", () => {
    /* the page's own derivation is what suppresses it, so this asserts the SHAPE the card is handed
       and that the card renders a note when there genuinely is one */
    const withNote = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => [{ key: "e1", label: "Full requested", when: "2 Apr", status: "Full Requested", note: "First fifty pages as a PDF" }]}
        onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(withNote).toContain("First fifty pages as a PDF");
    /* and none at all when the page withholds it */
    const bare = renderToStaticMarkup(
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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

  it("…and the verbs live where they act", () => {
    /* ⚠️ THE SPLIT CHANGED, AND THIS CASE HOLDS THE NEW ONE. Snooze, Open query and Dismiss act on
       the TASK, so they are the card footer's; previous/next act on which task you are LOOKING at,
       so they are the pane header's. Neither is the bar's any more — the bar had them because it
       was the only permanent surface, which was a fact about the layout rather than about the
       verbs. */
    for (const verb of ["Snooze", "Open query", "Dismiss"]) {
      expect(dockSrc, verb).toContain(verb);
    }
    for (const nav of ["Next task", "Previous task"]) {
      expect(dockSrc, nav).toContain(nav);
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
  const fn = sliceBetween(page, "function dockPrimary", "⚠️ `advanceDock` IS RETIRED");

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
      <TodoDock queue={[OFFER_CARD]} card={OFFER_CARD}
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
    /* the step is `stepQueue` on the pane header now — the same clamped walk the ↑↓ keys take,
       which is the point: one derivation, so the pointer path and the keyboard path cannot come to
       mean different things. The page's `dockable[i ± 1]` pair went with the bar's arrows. */
    expect(dockSrc).toContain("stepQueue(queue, card.key, -1)");
    expect(dockSrc).toContain("stepQueue(queue, card.key, 1)");
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
    const article = sliceBetween(board, "<article", "</article>");
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
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
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
    /* ⚠️ INVERTED BY PHASE A. This read "the band names the surface, not the note" — true while the
       band led with an agent and needed a standing label for cards with no person. The band leads
       with the DEED now, so the note's own words ARE the band's subject, and the old assertion
       would be pinning the very fallback the redesign removed. */
    expect(html.slice(0, bodyAt)).toContain("Redraft the opening");
    expect(html.slice(0, bodyAt)).not.toContain("Your noteboard");
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
      <TodoDock queue={QUEUE} card={QUEUE[0]} activeKey="a" onSelect={() => {}} onClose={() => {}}
        timeline={() => []} onPrimary={() => {}} onMore={() => {}} />,
    );
    expect(html).toContain("Nothing logged yet.");
  });

  it("⚠️ THE FOOTER IS PINNED AND DOES NOT SCROLL — it is the body's bottom edge", () => {
    /* This asserted the footer's ABSENCE, on the reading that its contract had moved wholly to the
       command bar. The whole of that is now reversed: the deed came back, then the verbs, and the
       bar itself is gone — so the card's footer carries the contract it was said to have given up,
       and with it the thing the card had been missing, a bottom edge for the body to scroll
       against. */
    expect(render()).toContain("tdk-foot");
    expect(code(page)).not.toContain("tdw-cbar");
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
  /**
   * ⚠️ THE CARD IS A QUERY CENTRE PANEL NOW, AND THIS CASE ASSERTS IT AGAINST THAT COMPONENT rather
   * than against four values retyped here. The parchment-document idiom — cream ground, paper grain,
   * a burgundy rule inset inside the edge, no border — was the reason the two pages read as
   * different products. It is gone, and what replaced it is not a near-match: it is `.f12-card`'s
   * own declarations.
   */
  it("⚠️ the card reads `.f12-card`'s OWN four values — not a near-match", () => {
    const rule = dockCssRule(".tdk-w {");
    const f12 = readFileSync(join(here, "../shell/f12.css"), "utf8");
    /* ⚠️ ANCHORED ON THE LINE START. A bare `.f12-card {` matches inside `.qp-cols .f12-card {`,
       which is the 38-character override rule two lines above — so the slice read that instead and
       reported it empty. The base rule is the one at column 0. */
    const panel = sliceBetween(f12, "\n.f12-card {", "}", ".f12-card base rule");
    expect(panel.length, "the .f12-card slice came out empty").toBeGreaterThan(40);
    /* ⚠️ ASSERTED AGAINST THE OTHER COMPONENT, so the day the Query Centre's panel is retoned this
       fails rather than the two silently drifting apart again. */
    /**
     * ⚠️ THE RIM IS COMPARED AS WEIGHT-AND-TONE, NOT AS A DECLARATION (Query Centre fix pack 7 §2).
     * `.f12-card` draws its rim as an `::after` overlay ring now, so that it can surround a FILLED
     * header rather than stopping where the fill begins — a border cannot do that, and an inset
     * shadow paints beneath its own children. The task card has no filled header and keeps a plain
     * border.
     *
     * ⚠️ WHICH IS EXACTLY THE COUPLING THIS CASE EXISTS FOR, working. It caught a change to a shared
     * class the moment it happened. What must not drift is what the two cards LOOK like — 1px of
     * `--line` — so that is what is asserted; the property that draws it is free to differ, because
     * the two cards have different problems to solve.
     */
    const ring = sliceBetween(f12, "\n.f12-card::after {", "}", ".f12-card ring");
    const rim = /inset 0 0 0 (\S+) (var\(--[a-z-]+\))/.exec(ring);
    expect(rim, `the panel's ring could not be read: ${ring}`).not.toBeNull();
    expect(rule, `the task card's rim is not the panel's ${rim![1]} ${rim![2]}`)
      .toContain(`border: ${rim![1]} solid ${rim![2]}`);
    expect(panel, ".f12-card took a border back — it would double with its own ring")
      .not.toMatch(/(?:^|;|\{)\s*border\s*:/);
    for (const decl of ["border-radius: var(--r-lg)", "box-shadow: var(--sh-1)"]) {
      expect(panel, `.f12-card no longer declares ${decl}`).toContain(decl);
      expect(rule, `the task card no longer declares ${decl}`).toContain(decl);
    }
    /* ⚠️ THE GROUND IS THE ONE THE PANEL ACTUALLY PAINTS, NOT THE ONE ITS BASE RULE DECLARES.
       `.f12-card` says `var(--panel)`; the Tracking panel lives inside `.qp-cols`, whose more
       specific rule wins — measured on the deployed page as `rgb(255,255,255)`. A lock written
       against the base rule would have pinned the wrong white and looked rigorous doing it. */
    expect(f12).toContain(".qp-cols .f12-card { background: var(--white); }");   // the override that wins
    expect(rule).toContain("background: var(--white)");
    /* ⚠️ AND THE GRAIN IS GONE WITH THE PARCHMENT — a texture on white reads as dirt. */
    expect(rule).not.toContain("feTurbulence");
  });

  it("⚠️ THE INSET FRAME IS EXTINCT, AND SO ARE THE THREE MARGINS THAT SERVED IT", () => {
    /* The frame was the parchment idiom's rule-inside-the-edge. Its 6px inset was load-bearing for
       the band, the card footer and the journey's foot, each of which carried a matching margin for
       the sole purpose of staying inside it — so with the frame gone those margins became a white
       gutter around a sage band. Flush now, clipped by the card's own `overflow: hidden`, which is
       how `.f12-card` seats its header. */
    const css = readFileSync(join(here, "todoDock.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ THE `::before` PROHIBITION STANDS AND IS NOW THE CHASSIS'S OWN RULE TOO. §2 requires the
       rim to be a REAL clipping container precisely because an overlay border spilled the MountCard
       header fill — so what this half forbids is what the redesign also refuses. */
    expect(css).not.toContain(".tdk-w::before");
    /* ⚠️ THE COLOUR BAN IS SUPERSEDED, AND A DIFFERENT OBJECT IS WHAT BRINGS THE COLOUR BACK. The
       frame retired at `acdf126` was an inset RULE on a white panel with the band held off it by
       margins, and the note calling it "a second border inside the first" was right about that one.
       `.tdk-rim` is the frame the band fills TO — a clipping child, measured flush at 1px on every
       edge. Same colour, opposite job; the three margins below are still gone, which is the half of
       this lock that never stopped being true. */
    const rimRule = dockCssRule(".tdk-rim {");
    expect(rimRule, "the rim is not a real clipping container").toContain("overflow: hidden");
    expect(rimRule).toContain("rgba(124, 58, 42, 0.28)");
    const band = dockCssRule(".tdk-band {");
    expect(band).toContain("margin: 0");
    expect(band).toContain("overflow: hidden");
    expect(dockCssRule(".tdk-foot {")).toContain("margin: 0");
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
    /* the mist is the card's GROUND, and the card is a white panel now — a cream fade over it was
       the parchment assumption showing through */
    expect(html).toContain("linear-gradient(to bottom, var(--white");
    expect(html).toContain("linear-gradient(to top, var(--white");
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
      queue={QUEUE} card={QUEUE.find((c) => c.key === active) ?? QUEUE[0]} activeKey={active}
      onSelect={() => {}} onClose={() => {}}
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

/* ── the fix journey ─────────────────────────────────────────────────────────────────────────── */

describe("⚠️ THE FIX JOURNEY WRITES THROUGH `updateAgent`, and omits what was not answered", () => {
  /* ⚠️ STRIPPED BEFORE ASSERTING, and this suite proved why twice while it was being written: the
     commit's own note explains that `doneToast` is deliberately NOT used, and the dock's prop doc
     names `agentDataQualityNeeds` to say the dock must not call it. Both `not.toContain`s failed on
     the prose describing the very absence they were checking for. */
  const commit = code(sliceBetween(page, "async function commitFixFromPane", "async function commitSendFromPane", "commitFixFromPane"));

  it("one write, and it is the existing one — no second agent-update path", () => {
    expect(commit).toContain("await updateAgent(ag.id, fields)");
    expect(commit).not.toContain("updateDoc");
    expect(commit).not.toContain("setDoc");
  });

  it("⚠️ EACH FIELD IS GATED ON AN ANSWER — a skipped question writes nothing at all", () => {
    /* Zeroing a skipped reply window would not clear the gap: `agentDataQualityNeeds` reads `0` as
       the stub that RAISED the card. So the guard is correctness, not tidiness. */
    for (const f of ["responseTimeWeeks", "materialsWanted", "mswlNotes"]) {
      expect(commit, `${f} is written unconditionally`).toContain(f);
    }
    expect(commit).toContain("if (v.fixResponseWeeks.trim())");
    expect(commit).toContain("if (v.fixMaterials.length)");
    expect(commit).toContain("if (v.fixMswl.trim())");
    expect(commit).toContain("if (!Object.keys(fields).length) return;");
  });

  it("⚠️ THE FLAG RESOLVES AFTER THE WRITE, never before", () => {
    const write = commit.indexOf("await updateAgent");
    const flag = commit.indexOf("resolveTaskFlag");
    expect(write).toBeGreaterThan(-1);
    expect(flag).toBeGreaterThan(write);
    /* and a failed write returns before either */
    expect(commit.indexOf("return;")).toBeLessThan(flag);
  });

  it("⚠️ NO UNDO IS OFFERED, because none can be delivered", () => {
    /* The other four undo by restoring a query's previous status. Here the previous state is an
       ABSENT field, and `deleteField()` over three fields the writer may have edited elsewhere is
       not an undo. `doneToast` requires an undo arm, so its absence is the signature enforcing it. */
    expect(commit).not.toContain("doneToast");
    expect(commit).not.toContain("rememberUndo");
    expect(commit).toContain('flash("Saved to the profile.")');
  });

  it("⚠️ THE PANE IS WITHHELD WHEN THERE IS NOTHING TO ASK", () => {
    const kindFn = sliceBetween(page, "function paneJourneyKind", "\n  }", "paneJourneyKind");
    expect(kindFn).toContain('case "fix": return cardGaps(card).length > 0 ? "fix" : undefined;');
  });

  it("⚠️ THE GAPS COME FROM THE DERIVATION THAT RAISED THE CARD — one source, not two", () => {
    const gapsFn = sliceBetween(page, "function cardGaps", "\n  }", "cardGaps");
    expect(gapsFn).toContain("agentDataQualityNeeds(ag)");
    /* the dock is a conduit: it must not derive them a second time */
    expect(code(dockSrc)).not.toContain("agentDataQualityNeeds");
  });

  it("⚠️ THE MATERIALS EDITOR WRITES WHAT `parseAgentMaterials` CAN READ BACK", () => {
    /* "Opening sample" is the LABEL — `MAT_OPTS` stores `Sample pages`, and the parser classifies
       by whole-string match, so writing the label would file it as Other. And Full manuscript /
       Author bio are excluded from this surface by the standing law. */
    const opts = sliceBetween(readFileSync(join(here, "PaneJourney.tsx"), "utf8"), "const FIX_MATERIALS", "];", "FIX_MATERIALS");
    expect(opts).toContain('{ label: "Opening sample", stored: "Sample pages" }');
    expect(opts).not.toMatch(/Full manuscript/i);
    expect(opts).not.toMatch(/Author bio/i);
    for (const stored of ["Query letter", "Synopsis", "Sample pages"]) {
      expect(parseAgentMaterials([stored]).selected, `${stored} does not round-trip`).toContain(stored);
    }
  });
});

/* ── item 6 · the dock's identity ────────────────────────────────────────────────────────────── */

describe("⚠️ THE DOCK RENDERS THE CARD IT IS GIVEN — a held card outlives its place in the queue", () => {
  /**
   * ⚠️ THE FIXTURE IS THE FAULT: a card that is NOT in the queue. That is the state a commit
   * creates (the card leaves `dockable`) and the state a search narrowing creates, and the old
   * `queue.find(activeKey) ?? queue[0]` resolved it to the FIRST REMAINING TASK — silently, with
   * the page still holding the original and the activity listener still keyed on its query.
   *
   * Measured on the deployed page before the fix, without a write: dock Joan Whitfield, search for
   * "Ana Duarte", and the pane swapped to Ana Duarte with no action taken on the pane.
   */
  const HELD = card({
    key: "gone", title: "Chase your query", who: "Joan Whitfield",
    record: "Joan Whitfield · Whitfield Agency", taskType: "nudge_overdue", kind: "AGENT WAITING",
  });
  const REMAINING = [card({ key: "x", title: "Send your full", who: "Ana Duarte", record: "Ana Duarte · Duarte Words", taskType: "full_requested" })];

  const held = renderToStaticMarkup(
    <TodoDock queue={REMAINING} card={HELD} activeKey={HELD.key}
      onSelect={() => {}} onClose={() => {}} timeline={() => []}
      onPrimary={() => {}} onMore={() => {}} />,
  );

  it("it draws the held card, not the queue's first", () => {
    expect(held).toContain("Joan Whitfield");
    expect(held, "the dock fell back to the queue's first card").not.toContain("Ana Duarte");
  });

  it("⚠️ AND THE FALLBACK IS GONE FROM THE SOURCE, not merely unreached", () => {
    /* stripped first — the prop's own doc quotes the expression it retired, and reading prose as
       code fails a file that is correct. */
    expect(code(dockSrc)).not.toContain("queue.find");
    expect(code(dockSrc)).not.toContain("?? queue[0]");
  });

  it("the queue survives for the WALK, which is a different question from identity", () => {
    /* prev/next genuinely step through the live list; what the dock must never do again is decide
       which card this IS. Both facts, so a future simplification cannot drop the queue entirely. */
    expect(dockSrc).toContain("queue");
    expect(held).toContain("tdk-pos");
  });
});

/* ── item 4 · the group sweep ────────────────────────────────────────────────────────────────── */

describe("⚠️ THE GROUP SWEEP RENDERS IN THE CARD, and nothing in it is pre-selected", () => {
  const SWEEP = card({
    key: "sweep-dq_materials", title: "16 materials wanted", who: "", record: "16 agents are missing a materials list",
    taskType: "data_quality_poor", kind: "MATERIALS", hk: true, initials: "•",
  });
  const MEMBERS = [
    { agentId: "a1", name: "Ffion Reece", agency: "Reece & Hall", website: "reecehall.co.uk" },
    { agentId: "a2", name: "Adam Castell", agency: "Castell Literary" },
  ];
  const html = renderToStaticMarkup(
    <TodoDock queue={[SWEEP]} card={SWEEP} activeKey={SWEEP.key}
      onSelect={() => {}} onClose={() => {}} timeline={() => []}
      onPrimary={() => {}} onMore={() => {}}
      sweep={() => ({ rule: "dq_materials", members: MEMBERS })}
      onCommitSweep={() => {}} />,
  );

  it("one row per member, each naming its agent and agency", () => {
    expect(html).toContain("Ffion Reece");
    expect(html).toContain("Reece &amp; Hall");
    expect(html).toContain("Adam Castell");
    expect((html.match(/psw-row/g) ?? [])).toHaveLength(MEMBERS.length);
  });

  it("⚠️ NOTHING IS PRE-SELECTED — no chip renders as chosen", () => {
    /* Guessing an agent's requirements and having a writer accept it by not looking is how bad data
       gets in. Asserted against the rendered attribute, bounded, so `psw-chip on` cannot hide in a
       longer class name and a substring cannot fake a pass. */
    expect(html).toContain('class="psw-chip"');
    expect(html).not.toMatch(/["\s`]psw-chip on["\s`]/);
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("⚠️ THE COMMIT IS CLOSED AT ZERO, and its words name the number", () => {
    expect(html).toContain('class="psw-prime"');
    expect(html).toContain("disabled");
    expect(html).toContain("Nothing recorded yet.");
    /* it says "Record", not "Record 0 answers" — a zero the writer never asked for */
    expect(html).not.toContain("Record 0");
  });

  it("⚠️ THERE IS NO APPLY-TO-ALL ANYWHERE ON THE SURFACE", () => {
    const src = code(readFileSync(join(here, "PaneSweep.tsx"), "utf8"));
    expect(src).not.toMatch(/apply.?to.?all|applyAll|selectAll|tickAll/i);
    expect(html).not.toMatch(/apply to all/i);
    /* the only bulk control is the one that writes nothing */
    expect(html).toContain("Skip the rest for now");
  });

  it("a member with no website gets NO link rather than a dead one", () => {
    const links = html.match(/psw-link/g) ?? [];
    expect(links).toHaveLength(1);            // Ffion has a site, Adam does not
    expect(html).toContain("reecehall.co.uk");
  });

  it("the band states the cohort, and does not repeat the rail's own words", () => {
    expect(html).toContain("A materials list is missing for");
    expect(html).toContain("2 agents");
    /* the row's title is the rail's line; the band must not echo it */
    expect(html).not.toContain("16 materials wanted");
    /* and the progress block reports this pass */
    expect(html).toContain("0 of 2");
  });

  it("⚠️ THE CARD'S OWN FOOTER STANDS DOWN — one primary on the card, never two", () => {
    expect(html).toContain("psw-prime");
    expect(html).not.toContain("tdk-prime");
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Evening-run sheet locks (Parts B/C). Logic-only test policy → source/rule-text layer;
 * derivation tests live beside their pure modules (todoWalk / queryTimelineRows).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const flow = readFileSync(join(here, "HousekeepingSweep.tsx"), "utf8");
const hub = readFileSync(join(here, "..", "reading-pane", "QueryTimeline.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
/* the tags pane wears the same sheet chrome the retired settings sheet demonstrated */
const tags = readFileSync(join(here, "TagsSheet.tsx"), "utf8");

describe("B2 — the sheet renders the HUB'S timeline (reuse, not imitation)", () => {
  /* ⚠️ THE TAKEOVER'S CONDENSED TIMELINE WENT WITH ITS QUERY JOURNEYS (27 Sep). `FocusFlow`
     rendered the Hub's own rows above each send/nudge sheet; those sheets moved to the query drawer
     and the survivor (`HousekeepingSweep`) is about agents' records, so it renders none — and must
     not grow a second imitation back. */
  it("the sweep renders no query timeline, and no imitation of one", () => {
    expect(flow).not.toContain("TimelineRows");
    expect(flow).not.toContain("timelineChips");
    expect(flow).not.toContain("buildAgentTimeline");
    expect(css).not.toContain("tdb-fftl");
  });
  it("the Hub consumes the MOVED component verbatim — same rows, same ⋯ wiring, extraction only", () => {
    expect(hub).toContain("export const TimelineRows");
    /* ⚠️ THE ⋯ WIRING NOW HANDS UP THE TRIGGER ELEMENT, NOT A HAND-COMPUTED STYLE (§1, popover
       sweep). The equivalence this test is named for is untouched — both hosts still render the one
       `TimelineRows`, and the ⋯ still appears on exactly the rows with an `activityId`. What
       changed is that the Hub anchors the menu through `useFixedMenu` instead of positioning it
       from the button's rect with an assumed 184px width, so it can flip when the entry sits low. */
    /* drawer cut 2 §3 — `onEntryFork` (additive, defaulted off) takes precedence when a host
       wants the ⋯ to open the correction desk directly; with it absent this wiring is
       byte-identical to before, which is the equivalence this case is named for. */
    expect(hub).toContain("onMenuOpen={onEntryFork ?? (onEditEntry || onDeleteEntry ? (entry, trigger) => {");
    expect(hub).toContain("setMenu({ entry });");
    expect(hub).toContain("row.activityId && row.activityId !== ghostId && onMenuOpen"); // the ⋯ condition, equivalence preserved
    /* ⚠️ `TL_MARK` SINCE §6 — and this lock is the reason the token behind it sits at `:root`.
       To-do rendered these rows inside `.tdb-ffhubtl`, nowhere near `.t-f12`, so a page-scoped
       `--tl-mark` would have left that host's markers unsized with nothing to point at. */
    /* ⚠️ THE `decorative` NUDGE DOT IS GONE (§2), AND THAT IS THE POINT OF THE CHANGE. A nudge
       borrowed the outgoing QUERIED glyph at the full 27px, so a follow-up wore the mark of a
       status it does not have and claimed a request's weight. Minor events take a 9px hollow ring
       drawn by the container; only status rows reach `StatusDot`.
       ⚠️ To-do renders these rows too, so this asserts the SHARED shape — the reason `--tl-mark`
       and `--tl-mark-sm` both sit at `:root` rather than inside `.t-f12`. */
    expect(hub).toContain("StatusDot status={row.status} overrideSize={TL_MARK}");
    expect(hub, "a nudge still borrows a status glyph").not.toContain('decorative={row.kind === "nudge"}');
    expect(hub, "the minor mark is not the container's").toContain('className="tl-minormark"');
  });
});

describe("B3 — the duplicate-send guard wires all three write moments (source locks)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  /* the takeover's two write moments (its Mark-sent journey and its sweep quick-done) went to the
     query drawer (27 Sep), whose own send consults `priorSameTypeSend`; the sweep writes no send */
  it("the sweep writes no send, so it has no guard to skip", () => {
    for (const w of ["recordMaterialsSent", "markSentWriteArgs", "priorSameTypeSend", "duplicateSendPrompt"]) {
      expect(flow, `the sweep reached for ${w}`).not.toContain(w);
    }
  });
  it("the board quick-✓: guard BEFORE the one write path; decline returns", () => {
    /* ⚠️ THE BOARD'S HALF OF THE GUARD MOVED (Pack C Phase 1). The quick-✓ is `quickDone`'s and
       went to `useTaskCommit`. The law is the one this case was written for and is unchanged: the
       guard is consulted BEFORE the one write path, and declining returns without writing. */
    const writer = readFileSync(join(here, "useTaskCommit.tsx"), "utf8");
    expect(writer).toContain("const prior = priorSameTypeSend(activitiesRef.current, q.id");
    const pq = writer.indexOf("prior && !(await confirmAsk");
    expect(pq).toBeGreaterThan(-1);
    expect(pq).toBeLessThan(writer.indexOf("await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path"));
  });
  it("no guard state anywhere in the sweep", () => {
    expect(flow).not.toContain("useState<.*prior"); // read-at-write-time, no guard state
  });
});

describe("C1 — anatomy + exit (ref todo-sheet-restyle-v1.html; both sheets)", () => {
  it("the wrapper/overflow split: the sheet clips (band corners), the exit lives on the wrapper", () => {
    expect(css).toMatch(/\.tdb-ffsheet \{[^}]*overflow: hidden/);
    expect(css).toContain(".tdb-ffwrap { position: relative; width: min(860px, 92vw);");
    expect(css).toContain(".tdb-ffx { position: absolute; top: -16px; right: -16px;");
  });
  it("the corner exit is the letterpress circle: 44px, parchment, 1.5px ink, scrim shadow, hover 1.06, labelled", () => {
    const x = css.match(/\.tdb-ffx \{([^}]*)\}/)?.[1] ?? "";
    expect(x).toContain("width: 44px; height: 44px");
    expect(x).toContain("background: var(--paper)");
    expect(x).toContain("border: 1.5px solid var(--ink)");
    expect(x).toContain("box-shadow: 0 4px 14px rgba(20, 8, 4, 0.3)");
    expect(css).toContain(".tdb-ffx:hover { transform: scale(1.06); }");
    expect(css).toContain('@media (max-width: 760px) { .tdb-ffx { top: 12px; right: 12px; } }');
    expect(flow).toContain('strokeWidth="2.4" strokeLinecap="round"');
  });
  /* ⚠️ THE SECOND SPECIMEN FOR THE CORNER EXIT WAS `TaskSettingsSheet`, WHICH IS DELETED. Its
     sibling law — the exit is a corner control on the WRAPPER, never a footer bar — is unchanged
     and still demonstrated by the journey sheet above, so what goes is the duplicate subject rather
     than the rule. The retired variant of it (a bar, an inline exit) is asserted extinct across the
     whole surface instead of on one file, which is a stronger claim than the one it replaces. */
  it("no sheet grew a footer bar or an inline exit in place of the corner control", () => {
    const journey = readFileSync(join(here, "..", "queries", "QueryJourneySheet.tsx"), "utf8");
    for (const [name, src] of [["journey sheet", journey], ["housekeeping sweep", flow], ["tags pane", tags]] as const) {
      expect(src, `${name} grew a footer bar`).not.toContain("tdb-ffbar");
      expect(src, `${name} grew an inline exit`).not.toContain("tdb-ffexit");
    }
    expect(css).toContain(".tdb-ffx { position: absolute; top: -16px; right: -16px;");
  });
  it("the zoned E band: family shell, kicker→headline→sub left, the art right", () => {
    /* the send journey that first proved it went to the query drawer (27 Sep); the band shell and
       its family law are the sweep's still */
    expect(flow).toContain('band("cof", "Housekeeping", emTitle(c), undefined, { art: "details", kickCls: "hk" })');
    expect(flow).toContain('<div key={f} className={`tdb-fband ${f} journey`}>');
    expect(css).toContain(".tdb-fband.pink { background: linear-gradient(180deg, var(--pink-t), var(--pink-btn)); border-color: var(--pink-b); }");
    expect(css).toContain(".tdb-fbart { width: 165px; height: 120px;");
    expect(css).toContain("drop-shadow(0 3px 6px rgba(58, 28, 20, 0.14))"); // assets ship shadowless
  });
  it("the manifest exists with send populated; the band title keeps the aria-stamp class", () => {
    const art = readFileSync(join(here, "journeyArt.ts"), "utf8");
    expect(art).toContain('import sendArt from "../../assets/journeys/send.png";');
    expect(art).toContain("send: sendArt,");
    expect(flow).toContain('className="tdb-ffq tdb-fbh"');
  });
});

describe("C2 — families across every mode; ceremony D; the manifest; mobile", () => {
  it("band family per mode: coffee details/batch/hand-off · sage save · paper notes/settings", () => {
    /* the pink send/nudge/offer bands and the coffee stale band went with their journeys to the
       query drawer (27 Sep) */
    expect(flow).not.toContain('band("pink"');
    expect(flow).toContain('band("cof", "Housekeeping"');
    expect(flow).toContain('band("cof", <>Housekeeping · {meta.label.toLowerCase()}</>');
    expect(flow).toContain('band("sage", "Ready to save"');
    /* ⚠️ THE JOURNEY TAKEOVER OBEYS THE SAME FAMILY LAW (journeys pack, Phase 2). `journeyBand`
       goes through the same `.tdb-fband` shell, so the journeys are covered here rather than in a
       second table that could disagree with this one: coffee for the hand-off, paper for the
       writer's own note. */
    expect(flow).toContain('journeyBand("paper", "Crossing it off"');
    expect(flow).toContain('journeyBand("cof", "Tidying the record"');
      expect(tags).toContain('<div className="tdb-fband paper">');
    // no step composes its own kicker outside a band any more (uniform reach — halt (f) clear)
    expect(flow).not.toContain('<div className="tdb-ffstream off">');
    expect(flow).not.toContain('<div className="tdb-ffstream hk">');
    expect(flow).not.toContain('<div className="tdb-ffstream nt">');
  });
  it("mixed walks crossfade by key", () => {
    /* the speed-grammar sweep mode (its per-item stream family) and the ritual's whole-walk sage
       had no caller and went with the query paths (27 Sep); the keyed crossfade is the band's own */
    expect(flow).not.toContain("streamFam");
    expect(flow).not.toContain("ritual");
    expect(flow).toContain("<div key={f} className={`tdb-fband ${f}");
    expect(css).toContain("@keyframes tdbBandIn"); // the keyed crossfade
    const page2 = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    /* ⚠️ workspace P3: "Work the list" left the corner panel with it. It is the Today PAGE's
       header primary now, which announces TODO_WORK_THE_LIST; ToDoPage answers by launching the
       SAME FocusedSession over the committed set. The ritual flag went with the panel's own
       button. */
    expect(page2).toContain("TODO_WORK_THE_LIST");
  });
  it("ceremony D on the enumerated steps ONLY: the completion/receipt screens", () => {
    /* the offer celebration and the Sunday review's open/close screens went with them (27 Sep) */
    const centers = flow.match(/center: true/g) ?? [];
    expect(centers.length).toBe(2); // saved + walked
    expect(flow).toContain('band("sage", "All saved"');
  });
  it("the empty art slot renders NOTHING (no placeholder, no broken image); the slot is fit-within with the CSS shadow", () => {
    expect(flow).toContain("const src = opts?.art ? JOURNEY_ART[opts.art] : null;");
    expect(flow).toContain('{!opts?.center && src && <div className="tdb-fbart">');
    expect(css).toContain(".tdb-fbart img, .tdb-fbart svg { max-width: 100%; max-height: 100%;");
  });
  it("mobile: bands stack text-above-art at reduced scale; art hides under 480 (the reported call); the exit insets at 12", () => {
    expect(css).toContain("@media (max-width: 480px) { .tdb-fbart { display: none; } }");
    expect(css).toMatch(/max-width: 760px\) \{\n  \.tdb-fband \{ flex-direction: column/);
    expect(css).toContain("@media (max-width: 760px) { .tdb-ffx { top: 12px; right: 12px; } }");
  });
});

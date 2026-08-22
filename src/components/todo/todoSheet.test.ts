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
const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
const hub = readFileSync(join(here, "..", "reading-pane", "QueryTimeline.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
/* the tags pane wears the same sheet chrome the retired settings sheet demonstrated */
const tags = readFileSync(join(here, "TagsSheet.tsx"), "utf8");

describe("B2 — the sheet renders the HUB'S timeline (reuse, not imitation)", () => {
  it("FocusFlow imports the shared TimelineRows + buildTimelineRows from the reading pane", () => {
    expect(flow).toContain('import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";');
    expect(flow).toContain("<TimelineRows rows={rows} />");
  });
  it("condensed to the most recent 3–4, newest first; Open the full query sits directly beneath", () => {
    expect(flow).toContain(".slice(-4).reverse()");
    const sheet = flow.slice(flow.indexOf("{sheetTimeline(q, ag)}"));
    expect(sheet.indexOf("{openQueryLink(q)}")).toBeGreaterThan(0);
    expect(sheet.indexOf("{openQueryLink(q)}")).toBeLessThan(120); // the very next mount in the step body
    expect(flow).toContain("Open the full query →"); // the link's copy (helper definition)
  });
  it("the old chips are GONE (component + CSS); the shape-adapter maps the twinned nudge type", () => {
    expect(flow).not.toContain("timelineChips");
    expect(flow).not.toContain("buildAgentTimeline");
    expect(css).not.toContain("tdb-fftl");
    expect(flow).toContain("a.activityType === ActivityType.NUDGE_SENT ? NUDGE_NESTED_TYPE : a.resultingStatus");
  });
  it("the Hub consumes the MOVED component verbatim — same rows, same ⋯ wiring, extraction only", () => {
    expect(hub).toContain("export const TimelineRows");
    /* ⚠️ THE ⋯ WIRING NOW HANDS UP THE TRIGGER ELEMENT, NOT A HAND-COMPUTED STYLE (§1, popover
       sweep). The equivalence this test is named for is untouched — both hosts still render the one
       `TimelineRows`, and the ⋯ still appears on exactly the rows with an `activityId`. What
       changed is that the Hub anchors the menu through `useFixedMenu` instead of positioning it
       from the button's rect with an assumed 184px width, so it can flip when the entry sits low. */
    expect(hub).toContain("onMenuOpen={onEditEntry || onDeleteEntry ? (entry, trigger) => {");
    expect(hub).toContain("setMenu({ entry });");
    expect(hub).toContain("row.activityId && onMenuOpen"); // the ⋯ condition, equivalence preserved
    /* ⚠️ `TL_MARK` SINCE §6 — and this lock is the reason the token behind it sits at `:root`.
       To-do renders these rows inside `.tdb-ffhubtl`, nowhere near `.t-f12`, so a page-scoped
       `--tl-mark` would have left THIS host's markers unsized with nothing to point at. */
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
  it("the journey's Mark sent: guard BEFORE stageAndAdvance; decline stages nothing (staged work intact)", () => {
    /* ⚠️ ANCHOR BEFORE THE SLICE (house rule). A missing marker makes `slice` return the tail of
       the file, and whether the assertions below notice depends on what happens to sit there. */
    const anchor = 'if (action.kind !== "mark-sent") { advance(); return; }\n      // B3';
    expect(flow.indexOf(anchor), "the send journey's commit no longer opens with the mark-sent guard").toBeGreaterThan(-1);
    const site = flow.slice(flow.indexOf(anchor));
    expect(site.indexOf("priorSameTypeSend(activities, q.id")).toBeGreaterThan(-1);
    const guardAt = site.indexOf("await confirmAsk(duplicateSendPrompt(");
    expect(guardAt).toBeGreaterThan(-1); // hero-pair P4: the styled ask replaced window.confirm
    expect(guardAt).toBeLessThan(site.indexOf("stageAndAdvance({"));
  });
  it("the sweep quick-done + the board quick-✓: guard BEFORE the one write path; decline returns", () => {
    expect(flow).toContain("const priorQuick = priorSameTypeSend(activitiesRef.current, q.id");
    const fq = flow.indexOf("priorQuick && !(await confirmAsk");
    expect(fq).toBeGreaterThan(-1);
    expect(fq).toBeLessThan(flow.indexOf("await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path"));
    expect(page).toContain("const prior = priorSameTypeSend(activitiesRef.current, q.id");
    const pq = page.indexOf("prior && !(await confirmAsk");
    expect(pq).toBeGreaterThan(-1);
    expect(pq).toBeLessThan(page.indexOf("await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path"));
  });
  it("R&R is passed through as isResubmit at every site (never guarded); no new state anywhere", () => {
    expect((flow.match(/action\.markKind === "resubmit"\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
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
    for (const [name, src] of [["journey sheet", journey], ["focus flow", flow], ["tags pane", tags]] as const) {
      expect(src, `${name} grew a footer bar`).not.toContain("tdb-ffbar");
      expect(src, `${name} grew an inline exit`).not.toContain("tdb-ffexit");
    }
    expect(css).toContain(".tdb-ffx { position: absolute; top: -16px; right: -16px;");
  });
  it("the zoned E band proves on the send journey: pink family, kicker→headline→sub left, the plane right", () => {
    expect(flow).toContain('band("pink", sendKicker(c, { queries, taskFlags }, Date.now()), emTitle(c), c.subtitle || undefined, { art: "send"');
    /* ⚠️ THE SEND JOURNEY'S SECOND SCREEN IS THE TAKEOVER NOW (journeys pack, Phase 1) — the band
       is `journeyBand`, which keeps the same pink family and the same plane, and swaps the
       headline/sub pair for avatar · pre-line · name · agency. Same band shell, same family law. */
    expect(flow).toContain('journeyBand("pink", "Recording what you sent", ag, c.initials, "send")');
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
  it("band family per mode: pink sends/nudges/offer(★) · coffee stale/details/batch · sage review/save · paper notes/settings", () => {
    expect(flow).toContain('band("pink", sendKicker(');
    expect(flow).toContain('band("pink", c.due || "No reply yet"');
    expect(flow).toContain('band("pink", `★ ${kicker}`');
    expect(flow).toContain('band("pink", "★ Recording your decision"');
    expect(flow).toContain('band("cof", "Stale query"');
    expect(flow).toContain('band("cof", "Housekeeping"');
    expect(flow).toContain('band("cof", <>Housekeeping · {meta.label.toLowerCase()}</>');
    expect(flow).toContain('band("sage", "Ready to save"');
    /* ⚠️ THE JOURNEY TAKEOVER OBEYS THE SAME FAMILY LAW (journeys pack, Phase 2). `journeyBand`
       goes through the same `fam()` and the same `.tdb-fband` shell, so the six journeys are
       covered here rather than in a second table that could disagree with this one: pink for the
       three that send or chase, coffee for the two housekeeping ones, paper for the writer's own
       note. The note's band moved from `band("paper", c.due || "Note to self", …)` when it became
       a journey — same family, new builder. */
    expect(flow).toContain('journeyBand("pink", "Recording what you sent"');
    expect(flow).toContain('journeyBand("pink", "Recording your resubmission"');
    expect(flow).toContain('journeyBand("pink", "Recording your follow-up"');
    expect(flow).toContain('journeyBand("cof", "Closing the record"');
    expect(flow).toContain('journeyBand("paper", "Crossing it off"');
    expect(flow).toContain('journeyBand(decide ? "pink" : "cof", decide ? "Answering the offer" : "Tidying the record"');
      expect(tags).toContain('<div className="tdb-fband paper">');
    // no step composes its own kicker outside a band any more (uniform reach — halt (f) clear)
    expect(flow).not.toContain('<div className="tdb-ffstream off">');
    expect(flow).not.toContain('<div className="tdb-ffstream hk">');
    expect(flow).not.toContain('<div className="tdb-ffstream nt">');
  });
  it("Focused sessions wear the lane they sweep (per-item stream family); mixed walks crossfade by key; Today's walks are sage rituals", () => {
    expect(flow).toContain('const streamFam = c.stream === "hk" ? "cof" as const : c.stream === "nt" ? "paper" as const : "pink" as const;');
    expect(flow).toContain("band(streamFam, c.due");
    expect(flow).toContain("const fam = (f: BandFam): BandFam => (ritual ? \"sage\" : f);");
    expect(css).toContain("@keyframes tdbBandIn"); // the keyed crossfade
    const page2 = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    /* ⚠️ workspace P3: "Work the list" left the corner panel with it. It is the Today PAGE's
       header primary now, which announces TODO_WORK_THE_LIST; ToDoPage answers by launching the
       SAME FocusedSession over the committed set. The ritual flag went with the panel's own
       button — the sage-ritual treatment is asserted on FocusFlow above, which is where it lives. */
    expect(page2).toContain("TODO_WORK_THE_LIST");
  });
  it("ceremony D on the enumerated steps ONLY: offer celebration · review open/close · completion/receipt screens", () => {
    const centers = flow.match(/center: true/g) ?? [];
    expect(centers.length).toBe(5); // celebration + rv open + rv close + saved + walked/swept
    expect(flow).toContain('band("pink", `★ ${kicker}`, <>{who} has offered to represent you.</>, undefined, { art: "offerCelebration", center: true');
    expect(flow).toContain('{ art: "reviewOpen", center: true }');
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

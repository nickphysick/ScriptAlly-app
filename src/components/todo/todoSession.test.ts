/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION — FINAL (the in-place design): source/rule-text locks (jsdom mounts
 * nothing; the stage maths is REAL-unit-tested in sessionStage.test.ts). The engine
 * invariant: the queue is the board's own boardCards order; the container is presentation +
 * session bookkeeping only and writes nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const ss = readFileSync(join(here, "FocusedSession.tsx"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("v7 P1 — the hero: title crossfade · the fixed sub-slot · the ritual", () => {
  it("Begin launches the session with the engine's own queue; the overlay stays transparent", () => {
    expect(page).toContain('onClick={() => setSession({ queue: boardCards })}>');
    expect(page).toContain("queue={session.queue}");
    expect(rule(".tdb-ss")).not.toContain("background");
    expect(ss).not.toContain("canvas");
  });
  it("the title crossfades gently (opacity only, 800ms) between the two lines — a stacked pair, driven by clearing", () => {
    expect(page).toContain('<h1 className={`tdb-ask t1${heroSession.clearing ? " out" : ""}`}>What’s on your desk?</h1>');
    expect(page).toContain('<h1 className={`tdb-ask t2${heroSession.clearing ? " in" : ""}`} aria-hidden={!heroSession.clearing}>In focus</h1>'); // v9
    expect(css).toContain(".tdb-ask.t1, .tdb-ask.t2 { transition: opacity 800ms ease; }");
    expect(rule(".tdb-ask.t2")).toContain("opacity: 0"); // t2 waits; .in reveals it
    expect(css).toContain(".tdb-ask.t1.out { opacity: 0; }");
    expect(css).toContain(".tdb-ask.t2.in { opacity: 1; }");
    // FocusedSession drives it BOTH ways: clearing:true on start, clearing:false on Back to desk
    expect(ss).toContain('onHero({ clearing: true, slot: null }); // the title crossfades to "Clearing the desk" as the session begins');
    expect(ss).toContain("onHero({ clearing: false, slot: null }); // the title crossfades back WITH the reassembly");
  });
  it("the spacing law: the hero is a stacked flow — the sub-slot is FIXED HEIGHT with even gaps; no absolute over the board", () => {
    const slot = rule(".tdb-srchrow");
    expect(slot).toContain("min-height: 46px"); // the slot never collapses when the search leaves
    expect(slot).toContain("align-items: center");
    expect(slot).toContain("margin: 20px 0 12px"); // ≥10px even gaps above/below
    // the ONE intended overlap is the title crossfade pair; the sub-slot content is a real child
    expect(page).toContain('className={`tdb-srchrow${heroSession.slot ? " insession" : ""}`}');
    expect(page).not.toContain("style={{ top: geo.subTop }}"); // the v6 measured overlay is gone
    expect(ss).not.toContain("tdb-fssub");
    expect(css).not.toContain("tdb-fssub");
    expect(ss).not.toContain("tdb-fsslot");
  });
  it("the sub-slot hosts EXACTLY ONE occupant: search at rest → ritual → the progress row (v9); the search fades in session", () => {
    expect(page).toContain('<div className="tdb-heroslot" aria-live="polite">');
    expect(css).toContain(".tdb-srchrow.insession .tdb-bigsearch"); // the search fades within the slot
    expect(rule(".tdb-heroslot")).toContain("position: absolute; inset: 0");
    expect(page).toContain('<span className="tdb-fsfrac">{slot.i} / {slot.n}</span>');
    expect(page).not.toContain("FOCUSED SESSION · TASK"); // the prefix + the subtitle are dropped in v7
  });
  it("the ritual lines: the three, italic Playfair 19 ink-muted, 780ms each, reported up per line", () => {
    expect(ss).toContain('RITUAL_LINES.forEach((_, i) => at(GATHER.ritualStartMs + i * GATHER.lineMs, () => onHero({ clearing: true, slot: { kind: "ritual", index: i } })));');
    const l = rule(".tdb-fsrit span");
    expect(l).toContain("font-style: italic");
    expect(l).toContain("font-size: 19px");
    expect(l).toContain("color: #6b5a4e");
    expect(page).toContain('className={slot.index === i ? "on" : slot.index > i ? "off" : ""}'); // rise-in/out both kept
  });
  it("the session line updates LIVE with the carriage index (one sync effect owns it; it empties at the close)", () => {
    expect(ss).toContain('if (phase === "session" && composed) onHero({ clearing: true, slot: { kind: "session", i: Math.min(index + 1, total), n: total } });');
    expect(ss).toContain('else if (phase === "close") onHero({ clearing: true, slot: null });');
    expect(ss).toContain("}, [phase, composed, index, total]);");
  });
  it("skip: any click/keypress jumps to the composed state; reduced motion starts there", () => {
    expect(ss).toContain('<div className="tdb-fsskip" onPointerDown={jumpToComposed}'); // v9 — its own layer
    expect(ss).toContain("const [composed, setComposed] = useState(reduce);");
    expect(css).toContain(".tdb-ask.t1, .tdb-ask.t2, .tdb-fsrit span, .tdb-heroslot { transition: none; animation: none; }");
  });
});

describe("v7 P3 — the gather + morph (the deck retired; the pile fully fades)", () => {
  it("the gather flies every other item onto the ENGINE's first task, staggered, z beneath it", () => {
    expect(ss).toContain("const firstKey = queue[0]?.key ?? \"\";".replace(/\\/g, ""));
    expect(page).toContain("data-tdbkey={c.key}");
    expect(ss).toContain("const s = staggerFor(flyers.length + 1);");
    expect(ss).toContain("el.style.opacity = String(GATHER.gatherOpacity);"); // ~85% behind
    expect(ss).toContain('firstEl.style.zIndex = "30";'); // the first never covered
  });
  it("the morph grows the pile to the computed rest (min 20, resize) and the pile FULLY FADES — no residual stack", () => {
    expect(ss).toContain("const gRestY = restTop(g.regionH, g.cardH);");
    expect(ss).toContain("big.style.transition = `transform ${GATHER.morphMs}ms cubic-bezier(.25,.8,.3,1.05)`;");
    // the gathered items (flyers + the first) all fade to 0 as the pile morphs — nothing left behind
    expect(ss).toContain("for (const el of [...flyers, ...(firstEl ? [firstEl] : [])]) {");
    expect(ss).toContain('el.style.opacity = "0";');
    expect(ss).not.toContain("tdb-fsdeck"); // the deck-edge motif is retired
  });
  it("the card wrap is inset by the curtains, so the rest centres BETWEEN them (window centre)", () => {
    expect(ss).toContain('style={{ top: geo.wrapTop, left: curtW, right: curtW }}');
    expect(rule(".tdb-fsseat")).toContain("left: 50%"); // centre of the inset wrap
    expect(ss).toContain("const seatLeft = window.innerWidth / 2 - GATHER.sessionCardW / 2;");
  });
});

describe("v7 P5 — wiring + the supersession sweep", () => {
  it("the state machine: board → gather → session → close → board; back + END SESSION land safely", () => {
    expect(ss).toContain('const [phase, setPhase] = useState<"gather" | "session" | "close">("gather");');
    expect(ss).toContain('window.addEventListener("popstate", onPop);'); // browser back → onClose
    expect(ss).toContain('setPhase("close")'); // v9 — the quiet exit line at the stage foot closes the session
  });
  it("the overture plays every session (no seen-flag); its skip is instant; the styled set strips on any exit", () => {
    expect(ss).not.toContain("localStorage");
    expect(ss).toContain("const styled = useRef<Set<HTMLElement>>(new Set());");
    expect(ss).toContain('for (const el of styled.current) el.style.cssText = "";');
  });
  it("the v6 presentation is EXTINCT: no pool, no deck, no sweep/rise/skip-down, no subtitle, no room bar", () => {
    for (const dead of ["tdb-fspool", "tdb-fsdeck", "tdb-fssub", "tdb-fsslot", "tdbRise", "tdbSweepOff", "tdbSkipDown", "POOL OF LIGHT", "Focused session</div>", "tdb-ssbar", "tdb-ssroom"]) {
      expect(ss).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
  it("focus-art stays reserved and unused; the tour's Begin copy still speaks true of the session", () => {
    expect(ss).not.toContain("focus-art");
    expect(page).not.toContain("import focusArt");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain("Begin a focused session");
  });
});

describe("v7 P2 — the curtains + the dim (pool of light + deck edges retired)", () => {
  it("the curtains: ink panels close from L/R with the gradient toward centre; responsive width; 1.1s", () => {
    expect(css).toContain(".tdb-fscurt { position: absolute; top: 0; bottom: 0; background: linear-gradient(90deg, #1d100c, #2a1a13);");
    expect(rule(".tdb-fscurt")).toContain("transition: transform 1100ms");
    expect(css).toContain(".tdb-fscurt.r { right: 0; transform: translateX(100%); background: linear-gradient(270deg, #1d100c, #2a1a13); }");
    expect(css).toContain(".tdb-fscurt.on { transform: translateX(0); }");
    // the width is a viewport token; the wrap insets by it (the curtains clip nothing)
    expect(ss).toContain('<div className={`tdb-fscurt l${curtains ? " on" : ""}`} style={{ width: curtW, top: geo.barBottom }} aria-hidden />'); // v9 — below the bar
    expect(ss).toContain('style={{ top: geo.wrapTop, left: curtW, right: curtW }}'); // the card wrap inset
    expect(ss).toContain("const [curtW, setCurtW] = useState(curtainWidth(window.innerWidth));");
    expect(ss).toContain("setCurtW(curtainWidth(window.innerWidth));"); // remeasured on resize
  });
  it("curtainWidth: 200 at ≥1500, else ~13vw floored at 96", () => {
    // (the maths itself is unit-tested in sessionStage.test.ts; here we bind the usage)
    expect(ss).toContain("curtainWidth,");
  });
  it("the dim: a SLIGHT rgba(58,28,20,.16) wash over the work area, the card exempt (renders above it)", () => {
    const d = rule(".tdb-fsdim");
    expect(d).toContain("background: rgba(58, 28, 20, 0.16)");
    expect(d).toContain("z-index: 0"); // under the card (z 3)
    expect(rule(".tdb-fscard")).toContain("z-index: 3");
    expect(rule(".tdb-fscurt")).toContain("z-index: 6"); // above the card; at the edges only
    expect(ss).toContain('<div className={`tdb-fsdim${curtains ? " on" : ""}`} style={{ top: geo.wrapTop }} aria-hidden />');
  });
  it("both present ONLY during the session: on with the gather, withdraw on Back to your desk", () => {
    expect(ss).toContain("requestAnimationFrame(() => setCurtains(true)); // the curtains close as the session begins");
    expect(ss).toContain("setCurtains(false); // the curtains withdraw + the dim lifts WITH the reassembly");
    expect(ss).toContain("const [curtains, setCurtains] = useState(reduce);"); // reduced motion starts closed
  });
  it("the pool of light + the deck edges are EXTINCT (retired in v7)", () => {
    for (const dead of ["tdb-fspool", "tdb-fsdeck", "tdb-fsseat.lit", "radial-gradient(ellipse, rgba(58, 28, 20, 0.14)", "0 26px 60px"]) {
      expect(ss).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
});

describe("v7 P4 — the card + the carriage (transition A)", () => {
  it("frame-A content: family band + tag + lane, Playfair title, the italic line, WHERE THIS STANDS from templates", () => {
    expect(ss).toContain('<span className="tdb-fslane">{lane(current)}</span>');
    expect(rule(".tdb-fscardc h2")).toContain("font-size: 21px");
    expect(ss).toContain("{standFor(current) && (");
    expect(ss).toContain(">WHERE THIS STANDS</b>");
    expect(ss).toContain('if (c.userTaskId) return "";'); // notes say nothing
    expect(ss).toContain("owed: q ? STATUS_OWED[q.status as string] : undefined");
  });
  it("the actions: Action now (opens the journey OVER the session) · ✓ Mark handled (gated) · Skip; the page wires the primitives", () => {
    expect(ss).toContain('onClick={() => onOpenJourney(current)}>Action now</button>');
    expect(ss).toContain("{canQuickComplete(current) && (");
    expect(ss).toContain('onClick={() => onQuickComplete(current)}>✓ Mark handled</button>');
    expect(ss).toContain("onClick={skipCurrent}>Skip for now</button>");
    expect(page).toContain('onOpenJourney={(card) => setFlow({ items: [{ kind: "card", card }] })}');
    expect(page).toContain("onQuickComplete={quickDone}");
    expect(page).toContain('if (c.taskType === "offer_received") return false;'); // the standing no-one-tap rule
  });
  it("the round-trip law: a completed task VANISHES from liveKeys and deals as handled; a survivor resumes in place", () => {
    expect(ss).toContain("if (!liveKeys.has(current.key)) markHandledAdvance(current);");
    expect(ss).toContain("setHandled((h) => (h.some((x) => x.key === c.key) ? h : [...h, c]));");
  });
  it("the carriage: stamp → hold → the outgoing slides straight OUT LEFT while the incoming slides IN from the RIGHT, overlapping", () => {
    expect(ss).toContain("const advanceAtMs = reduce ? 400 : CARRIAGE.stampHoldMs + CARRIAGE.overlapMs;"); // the incoming overlaps the out-slide
    expect(ss).toContain("at(advanceAtMs, () => { if (!willClose) { advancePast(index + 1); setRose(true); } });"); // + the session-line advance; the last defers the close
    expect(css).toContain(".tdb-fsleave.handled { animation: tdbCarriageOut 500ms cubic-bezier(0.55, 0.05, 0.55, 0.95) 440ms forwards; }");
    expect(css).toContain("@keyframes tdbCarriageOut { to { transform: translateX(-120%); opacity: 0; } }");
    expect(css).toContain(".tdb-fscard.carriagein { animation: tdbCarriageIn 500ms cubic-bezier(0.2, 0.85, 0.3, 1.1); }");
    expect(css).toContain("@keyframes tdbCarriageIn { from { transform: translateX(120%); } }");
  });
  it("skip: NO stamp — the same out-left slide; the engine's requeue decides what slides in (to the session order's end)", () => {
    expect(css).toContain(".tdb-fsleave.skip { animation: tdbCarriageOut 500ms cubic-bezier(0.55, 0.05, 0.55, 0.95) forwards; }");
    expect(ss).toContain('{deal.kind === "handled" && <span className="tdb-ssstamp" aria-hidden>✓</span>}');
    expect(ss).toContain("const next = [...rest, c0]; // the requeue — to the session order's end");
    expect(ss).toContain('if (!rest.some((x) => liveKeys.has(x.key))) { setOrder(next); setPhase("close"); return; }');
    expect(css).not.toContain("tdbSkipDown");
  });
  it("v7: no residual stack (deck edges retired); the true count lives in the session line; next-up is the next LIVE", () => {
    expect(ss).not.toContain("tdb-fsdeck");
    expect(ss).toContain("const nextUp = order.slice(index + 1).find((x) => liveKeys.has(x.key));"); // never a ghost
    expect(ss).toContain(">NEXT UP · <i>{nextUp.title}</i></div>");
  });
  it("reduced motion: instant swaps; the stamp appears without its pop", () => {
    expect(css).toContain(".tdb-fsleave.static .tdb-ssstamp { animation: none; transform: rotate(-8deg) scale(1); }");
    expect(css).toContain(".tdb-fsleave.handled, .tdb-fsleave.skip, .tdb-fscard.carriagein, .tdb-ssstamp { animation: none; }");
  });
});

describe("v7 P5 — the close, in place", () => {
  it("the LAST card sweeps off before the close mounts (the deferral); the pool leaves with the branch", () => {
    expect(ss).toContain("const willClose = !order.slice(index + 1).some((x) => liveKeys.has(x.key));");
    expect(ss).toContain('at(clearAtMs, () => { setDeal(null); dealRef.current = false; if (willClose) setPhase("close"); });');
    expect(ss).toContain("at(advanceAtMs, () => { if (!willClose) { advancePast(index + 1); setRose(true); } });");
  });
  it("the headline by state over the same centre region; the session line empties at the close", () => {
    expect(ss).toContain('{anyLive ? "Good session." : "Desk cleared."}');
    expect(ss).toContain(">Every box ticked turns the dial in your favour.</div>");
    expect(ss).toContain('else if (phase === "close") onHero({ clearing: true, slot: null });'); // v7: the session line leaves; the title stays clearing until Back
    expect(css.match(/\.tdb-ssclose h1 \{([^}]*)\}/)?.[1] ?? "").toContain("font-size: 46px");
  });
  it("the honest ledger from the session events + the frozen timer; Review expands the per-task marks", () => {
    expect(ss).toContain(">Handled<span className=\"tdb-sssn\">{handled.length}</span>".replace(/\\/g, ""));
    expect(ss).toContain(">Skipped — back on your desk<span className=\"tdb-sssn\">{skipped.length}</span>".replace(/\\/g, ""));
    expect(ss).toContain('if (phase === "close" && closedAt.current === null) closedAt.current = Date.now();');
    expect(ss).toContain("Math.max(1, Math.round(((closedAt.current ?? Date.now()) - startedAt.current) / 60000))");
    expect(ss).toContain('onClick={() => setReviewOpen((v) => !v)}>Review what you did</button>');
    expect(css).toContain(".tdb-sssd.done { background: linear-gradient(180deg, var(--hk-sage), var(--hk-sage-2));");
  });
  it("Back to your desk REVERSES the opening compressed (~700ms): curtains withdraw + dim lifts + title back, then strip + close", () => {
    expect(ss).toContain('onClick={backToDesk}>Back to your desk</button>');
    expect(ss).toContain("setCurtains(false); // the curtains withdraw + the dim lifts WITH the reassembly");
    expect(ss).toContain("onHero({ clearing: false, slot: null }); // the title crossfades back WITH the reassembly");
    expect(ss).toContain("window.setTimeout(() => { stripAll(); onClose(); }, GATHER.reverseMs + 60);");
  });
  it("the board is already correct via the shared derivation — the session WRITES NOTHING (no sync)", () => {
    for (const w of ["recordMaterialsSent", "updateQueryStatus", "upsertTaskFlag", "updateUserTask", "updateAgent", "updateUserProfile", "dismissTask", "logNudge", "addUserTask", "deleteActivity"]) {
      expect(ss).not.toContain(w);
    }
  });
});

describe("final P5 — wiring + the supersession sweep", () => {
  it("the state machine: board → gather → session → close → board; back + END SESSION land safely", () => {
    expect(ss).toContain('const [phase, setPhase] = useState<"gather" | "session" | "close">("gather");');
    expect(ss).toContain('window.addEventListener("popstate", onPop);');
  });
  it("the room presentation is GONE: no veil/spotlight/dark lines/pair, no room bar, no oat ground", () => {
    for (const dead of ["createRadialGradient", "destination-out", "requestAnimationFrame(step)", "tdb-ssdim", "tdb-ssveil", "tdb-sslines", "tdb-ssctas", "tdb-ssfirst", "tdb-ssroom", "tdb-ssbar", "tdb-ssprog", "tdb-ssheet", "tdb-ssstack", "tdb-ssdeck", "tdb-ssleave", "Begin session"]) {
      expect(ss).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
  it("the overture plays every session (no seen-flag); focus-art stays reserved and unused", () => {
    expect(ss).not.toContain("localStorage");
    expect(ss).not.toContain("focus-art");
    expect(page).not.toContain("import focusArt");
  });
});

describe("v9 P1 — THE FRAME: the bar exempt · the pair out · In focus + progress · the band", () => {
  it("THE APP BAR IS EXEMPT: the curtains take their top from the MEASURED bar bottom", () => {
    expect(ss).toContain("const barBottom = Math.max(0, wrapEl?.getBoundingClientRect().top ?? 0);");
    expect(ss).toContain("style={{ width: curtW, top: geo.barBottom }}");
    // the v7 fault: the curtains rode the whole viewport and covered the bar
    expect(ss).not.toContain('className={`tdb-fscurt l${curtains ? " on" : ""}`} style={{ width: curtW }}');
  });
  it("the overlay is POINTER-TRANSPARENT — it can no longer swallow the hero's controls", () => {
    expect(rule(".tdb-ss")).toContain("pointer-events: none");
    expect(css).toContain(".tdb-ss button, .tdb-ss a, .tdb-fsskip { pointer-events: auto; }");
    // the overture's skip is its OWN layer, alive only during the opening
    expect(ss).toContain('{phase === "gather" && !composed && (');
    expect(ss).toContain('<div className="tdb-fsskip" onPointerDown={jumpToComposed}');
    expect(ss).not.toContain('onPointerDown={phase === "gather" && !composed ? jumpToComposed : undefined}');
  });
  it("the Begin/review pair and the search LEAVE for the session and return with the exit", () => {
    expect(page).toContain('{heroSession.slot?.kind !== "session" && (');
    expect(page).toContain('<div className={`tdb-heropair${heroSession.clearing ? " insession" : ""}`}>');
    expect(rule(".tdb-heropair.insession")).toContain("opacity: 0");
    expect(rule(".tdb-heropair.insession")).toContain("pointer-events: none");
    expect(css).toContain(".tdb-srchrow.insession .tdb-bigsearch"); // the search still fades in its slot
  });
  it("the title is 'In focus' — 'Clearing the desk' is replaced, both directions still crossfade", () => {
    expect(page).toContain(">In focus</h1>");
    expect(page).toContain("What\u2019s on your desk?</h1>");
    expect(page).not.toContain("Clearing the desk");
    expect(ss).toContain("onHero({ clearing: false, slot: null })"); // the exit crossfades back
    expect(ss).toContain("onHero({ clearing: true, slot: null })");
  });
  it("the progress treatment replaces the mono session line — a bar + a Playfair fraction, NO kicker", () => {
    expect(page).toContain('<div className="tdb-fsprog"');
    expect(page).toContain("progressPct(slot.i, slot.n)");
    expect(page).toContain('<span className="tdb-fsfrac">{slot.i} / {slot.n}</span>');
    expect(rule(".tdb-fsbar")).toContain("#ddd2c2");
    expect(rule(".tdb-fsbar b")).toContain("background: var(--ink)");
    expect(rule(".tdb-fsprog")).toContain("width: 340px");
    expect(rule(".tdb-fsfrac")).toContain("var(--f12-serif)");
    expect(rule(".tdb-fsfrac")).toContain("lining-nums tabular-nums");
    // no kicker node, and the old line is gone
    expect(css).not.toContain(".tdb-fsses ");
    expect(page).not.toContain("TASK <b>");
    expect(page).not.toContain("tdb-fskick");
  });
  it("THE SPACING LAW is real space: the seat region comes from sessionRegion, resize-aware", () => {
    expect(ss).toContain("const region = sessionRegion(sr ? sr.bottom : slotTop + 30, window.innerHeight);");
    expect(ss).toContain("const wrapTop = region.top;");
    expect(ss).toContain('window.addEventListener("resize", onResize)');
  });
});expect(page).toContain('<span className="tdb-fsfrac">{slot.i} / {slot.n}</span>'); // v9 — the progress row

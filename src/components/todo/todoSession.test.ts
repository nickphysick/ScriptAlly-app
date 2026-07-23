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
    expect(page).toContain('<h1 className={`tdb-ask t2${heroSession.clearing ? " in" : ""}`} aria-hidden={!heroSession.clearing}>Clearing the desk</h1>');
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
  it("the sub-slot hosts EXACTLY ONE occupant: search at rest → ritual → the mono session line; the search fades in session", () => {
    expect(page).toContain('<div className="tdb-heroslot" aria-live="polite">');
    expect(css).toContain(".tdb-srchrow.insession .tdb-bigsearch"); // the search fades within the slot
    expect(rule(".tdb-heroslot")).toContain("position: absolute; inset: 0");
    expect(page).toContain("TASK <b>{slot.i}</b> OF <b>{slot.n}</b>");
    expect(page).not.toContain("FOCUSED SESSION · TASK"); // the prefix + the subtitle are dropped in v7
    expect(page).toContain('onClick={slot.onEnd}>END SESSION ✕</button>');
  });
  it("the ritual lines: the three, italic Playfair 19 ink-muted, 780ms each, reported up per line", () => {
    expect(ss).toContain('RITUAL_LINES.forEach((_, i) => at(GATHER.ritualStartMs + i * GATHER.lineMs, () => { setLine(i); onHero({ clearing: true, slot: { kind: "ritual", index: i } }); }));');
    const l = rule(".tdb-fsrit span");
    expect(l).toContain("font-style: italic");
    expect(l).toContain("font-size: 19px");
    expect(l).toContain("color: #6b5a4e");
    expect(page).toContain('className={slot.index === i ? "on" : slot.index > i ? "off" : ""}'); // rise-in/out both kept
  });
  it("the session line updates LIVE with the carriage index (one sync effect owns it; it empties at the close)", () => {
    expect(ss).toContain('if (phase === "session" && composed) onHero({ clearing: true, slot: { kind: "session", i: Math.min(index + 1, total), n: total, onEnd: () => setPhase("close") } });');
    expect(ss).toContain('else if (phase === "close") onHero({ clearing: true, slot: null });');
    expect(ss).toContain("}, [phase, composed, index, total]);");
  });
  it("skip: any click/keypress jumps to the composed state; reduced motion starts there", () => {
    expect(ss).toContain('onPointerDown={phase === "gather" && !composed ? jumpToComposed : undefined}');
    expect(ss).toContain("const [composed, setComposed] = useState(reduce);");
    expect(css).toContain(".tdb-ask.t1, .tdb-ask.t2, .tdb-fsrit span, .tdb-heroslot { transition: none; animation: none; }");
  });
});

describe("final P2 — the pool of light (option 5; every other treatment rejected)", () => {
  it("the lit seat deepens the card's shadow to the ref's order; the pool is the soft ellipse beneath", () => {
    expect(css).toContain(".tdb-fsseat.lit .tdb-fscard { box-shadow: 0 26px 60px rgba(58, 28, 20, 0.38); }");
    const pool = rule(".tdb-fspool");
    expect(pool).toContain("background: radial-gradient(ellipse, rgba(58, 28, 20, 0.14), transparent 65%)");
    expect(pool).toContain("width: 640px"); // wider than the 500 card
    expect(rule(".tdb-fscard")).toContain("transition: box-shadow 500ms ease"); // the deepening rides the landing
  });
  it("z-order: the pool(0) under the deck edges(1) under the card(3)", () => {
    expect(rule(".tdb-fspool")).toContain("z-index: 0");
    expect(rule(".tdb-fsdeck")).toContain("z-index: 1");
    expect(rule(".tdb-fscard")).toContain("z-index: 3");
  });
  it("presence is bound to the composed session and leaves with the close; it follows the card's seat through the deals", () => {
    expect(ss).toContain('{composed && <div className="tdb-fspool" aria-hidden />}');
    expect(ss).toContain('className={`tdb-fsseat${composed ? " lit" : ""}`}'); // the state class rides the CONTAINER
    // the pool lives inside the phase !== "close" branch — the close unmounts it
    const branch = ss.slice(ss.indexOf('{phase !== "close" && current && ('), ss.indexOf('{phase === "close" && ('));
    expect(branch).toContain("tdb-fspool");
  });
  it("the rejected treatments are absent: no vignette, no ground shift, no inset frame, no ribbon", () => {
    for (const dead of ["vignette", "tdb-fsvig", "tdb-fsframe", "tdb-fsribbon", "radial-gradient(ellipse 72%"]) {
      expect(ss).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
});

describe("final P3 — the card + the deal at the rest line", () => {
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
  it("the deal: stamp → hold → sweep left → the rise (450) WITH the session-line advance; skip goes down-and-behind", () => {
    expect(ss).toContain("const advanceAtMs = reduce ? 400 : DEAL.stampHoldMs + DEAL.riseDelayMs;");
    expect(ss).toContain("at(advanceAtMs, () => { if (!willClose) { advancePast(index + 1); setRose(true); } });"); // P4: the last sweep defers the close
    expect(css).toContain(".tdb-fsleave.handled { animation: tdbSweepOff 500ms cubic-bezier(0.5, 0.05, 0.6, 1) 520ms forwards; }");
    expect(css).toContain(".tdb-fscard.rise { animation: tdbRise 450ms cubic-bezier(0.2, 0.9, 0.3, 1.15); }");
    expect(css).toContain(".tdb-fsleave.skip { animation: tdbSkipDown 450ms ease forwards; }");
    expect(css).toContain(".tdb-fsleave.skip { z-index: 2; }"); // down AND BEHIND
    expect(ss).toContain("const next = [...rest, c0]; // the requeue — to the session order's end");
    expect(ss).toContain('if (!rest.some((x) => liveKeys.has(x.key))) { setOrder(next); setPhase("close"); return; }');
  });
  it("the stack thins 2 → 1 → 0 with the LIVE queue; the true count lives in the session line; next-up updates", () => {
    expect(ss).toContain("const remaining = order.slice(index + 1).filter((x) => liveKeys.has(x.key)).length;");
    expect(ss).toContain('{edgesOn && remaining >= 2 && <div className="tdb-fsdeck d2" aria-hidden />}');
    expect(ss).toContain('{edgesOn && remaining >= 1 && <div className="tdb-fsdeck d1" aria-hidden />}');
    expect(ss).toContain("const nextUp = order.slice(index + 1).find((x) => liveKeys.has(x.key));"); // the next LIVE — never a ghost
    expect(ss).toContain(">NEXT UP · <i>{nextUp.title}</i></div>");
  });
  it("reduced motion: instant swaps; the stamp appears without its pop", () => {
    expect(css).toContain(".tdb-fsleave.static .tdb-ssstamp { animation: none; transform: rotate(-8deg) scale(1); }");
    expect(css).toContain(".tdb-fsleave.handled, .tdb-fsleave.skip, .tdb-fscard.rise, .tdb-ssstamp { animation: none; }");
  });
});

describe("final P4 — the close, in place", () => {
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
  it("Back to your desk REVERSES the opening compressed (~700ms): the styles unwind, then strip, then close", () => {
    expect(ss).toContain('onClick={backToDesk}>Back to your desk</button>');
    expect(ss).toContain("el.style.transition = `transform ${GATHER.reverseMs}ms ease, opacity ${GATHER.reverseMs}ms ease, background ${GATHER.reverseMs}ms ease, border-color ${GATHER.reverseMs}ms ease, box-shadow ${GATHER.reverseMs}ms ease`;");
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

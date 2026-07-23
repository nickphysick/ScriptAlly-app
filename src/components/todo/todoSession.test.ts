/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOCUSED SESSION — source/rule-text locks (jsdom mounts nothing; the stage maths is
 * REAL-unit-tested in sessionStage.test.ts). The engine invariant: the queue is the board's
 * own boardCards order; the container is presentation + session bookkeeping only.
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

describe("session P1 — the opening", () => {
  it("Begin launches the SESSION with the engine's own queue (boardCards order, captured at launch)", () => {
    expect(page).toContain('onClick={() => setSession({ queue: boardCards })}>');
    expect(page).toContain("const [session, setSession] = useState<{ queue: BoardCard[] } | null>(null);");
    expect(page).toContain("queue={session.queue}");
    expect(page).not.toContain("setFlow({ items: boardCards.map"); // the old whole-board walk entry is superseded
  });
  it("the sequence: darken → fly (nearest edges, staggered) → the three ritual lines → the reveal → the pair", () => {
    expect(ss).toContain("setDimOn(true); // 1 — the slow darken (1.1s wash)");
    expect(ss).toContain("at(OPENING.flyDelayMs, flyOut); // 2 — the desk clears via nearest edges");
    expect(ss).toContain("RITUAL_LINES.forEach((_, i) => at(OPENING.linesDelayMs + i * OPENING.lineMs, () => setLine(i)));");
    expect(ss).toContain("at(i * OPENING.flyStaggerMs, () => {"); // the stagger
    expect(ss).toContain("nearestEdgeFly(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, W, H)");
    expect(ss).toContain("at(OPENING.spotDelayMs, wander);");
    expect(ss).toContain("at(OPENING.pairDelayMs, () => setPairOn(1));");
    expect(ss).toContain("at(OPENING.pairDelayMs + OPENING.pairGapMs, () => setPairOn(2));");
    expect(rule(".tdb-ssdim")).toContain("transition: background 1100ms ease");
    expect(rule(".tdb-ssdim.on")).toContain("rgba(26, 13, 9, 0.74)");
  });
  it("the lines: the three ritual strings verbatim from the lib, italic Playfair 34, cream", () => {
    expect(ss).toContain("{RITUAL_LINES.map((l, i) => (");
    const l = rule(".tdb-sslines span");
    expect(l).toContain("font-style: italic");
    expect(l).toContain("font-size: 34px");
    expect(l).toContain("color: #f3e7da");
  });
  it("THE REVEAL INVARIANT: the card mounts BENEATH the veil (z 2 < 3) inside the overlay — visible only in the beam", () => {
    expect(rule(".tdb-ssfirst")).toContain("z-index: 2");
    expect(rule(".tdb-ssveil")).toContain("z-index: 3");
    expect(ss).toContain('ctx.fillStyle = `rgba(26,13,9,${OPENING.veilTo})`;'); // the 0.9 full dark
    expect(ss).toContain('ctx.globalCompositeOperation = "destination-out";'); // the punched beam
    expect(ss).toContain("draw(-999, -999, 1);"); // mounts unseen — the light must FIND it
    expect(ss).toContain("setFirstOn(true);");
  });
  it("skip: ANY click or keypress during the sequence jumps to the final composition", () => {
    expect(ss).toContain('onPointerDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}');
    expect(ss).toContain('onKeyDown={phase === "opening" && !openingFinal ? jumpToFinal : undefined}');
    expect(ss).toContain("if (finalRef.current || phase !== \"opening\") return;");
    expect(ss).toContain("timers.current.forEach((t) => window.clearTimeout(t));");
  });
  it("reduced motion starts at the final composition; the css transitions go quiet with it", () => {
    expect(ss).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;');
    expect(ss).toContain("const [openingFinal, setOpeningFinal] = useState(reduce);");
    expect(css).toContain(".tdb-ssdim, .tdb-ssveil, .tdb-sslines span, .tdb-ssb, .tdb-ssfirst { transition: none; }");
  });
  it("Back to desk reverses compressed (~600ms) and STRIPS every inline style it added — from any exit path", () => {
    expect(ss).toContain("restoreDesk(OPENING.reverseMs);");
    expect(ss).toContain("window.setTimeout(onClose, OPENING.reverseMs + 40);");
    expect((ss.match(/el\.style\.cssText = el\.style\.cssText\.replace\(/g) ?? []).length).toBe(2); // the reverse + the unmount guard
  });
  it("the fly targets the board wrap's CONTENTS only — never the app chrome (the wrap-scoped query)", () => {
    expect(ss).toContain("wrapEl.querySelectorAll<HTMLElement>(FLY_SELECTOR)");
    expect(page).toContain("wrapEl={wrapRef.current}");
  });
  it("the overlay's z law: 48 — beneath the journey flow (50), the toast (60) and the ask (90)", () => {
    expect(rule(".tdb-ss")).toContain("z-index: 48");
  });
});

describe("session P2 — the room", () => {
  it("the bar: FOCUSED SESSION · TASK i OF n, the live progress line, the lane label, End session", () => {
    expect(ss).toContain("FOCUSED SESSION · TASK {Math.min(index + 1, total)} OF {total}");
    expect(ss).toContain("width: `${Math.round(((index + 1) / Math.max(1, total)) * 100)}%`");
    expect(rule(".tdb-ssprog")).toContain("background: #e3d8c8");
    expect(rule(".tdb-ssprog b")).toContain("background: var(--ink)");
    expect(ss).toContain("{lane(current)}");
    expect(ss).toContain('onClick={() => setPhase("close")}>End session ✕</button>'); // exits to the close in its early state
  });
  it("the sheet: 560, family band + tag, Playfair 26 title, the italic manuscript · agent line", () => {
    expect(rule(".tdb-ssheet")).toContain("width: 560px");
    expect(rule(".tdb-ssheetc h2")).toContain("font-size: 26px");
    expect(ss).toContain("{[current.subtitle, current.who].filter(Boolean).join(\" · \")}".replace(/\\/g, ""));
    expect(rule(".tdb-ssms2")).toContain("font-style: italic");
  });
  it("WHERE THIS STANDS: templates from existing derived fields only; an empty composition hides the card", () => {
    expect(ss).toContain("{standFor(current) && (");
    expect(ss).toContain(">WHERE THIS STANDS</b>");
    // the assembler reads the REAL stores through the existing derivations — never free text
    expect(ss).toContain("whereThisStands({ kind: \"offer\", agentName, offerDate: q?.lastStatusChange, outstanding });".replace(/\\/g, ""));
    expect(ss).toContain('getPrimaryAction(x.status as QueryStatus).ballHolder === "agent"');
    expect(ss).toContain("owed: q ? STATUS_OWED[q.status as string] : undefined");
    expect(ss).toContain('if (c.userTaskId) return "";'); // notes say nothing
  });
  it("the actions: Action now (ink, opens the journey OVER the session) · ✓ Mark handled (gated on the honest arm) · Skip", () => {
    expect(ss).toContain('onClick={() => onOpenJourney(current)}>Action now</button>');
    expect(ss).toContain("{canQuickComplete(current) && (");
    expect(ss).toContain('onClick={() => onQuickComplete(current)}>✓ Mark handled</button>');
    expect(ss).toContain("onClick={skipCurrent}>Skip for now</button>");
    // the page: the gate mirrors quickDone's arms; offers keep the standing no-one-tap rule
    expect(page).toContain('if (c.taskType === "offer_received") return false;');
    expect(page).toContain('return !!q && getPrimaryAction(q.status as QueryStatus).kind === "mark-sent";');
    expect(page).toContain('onOpenJourney={(card) => setFlow({ items: [{ kind: "card", card }] })}'); // the journey mounts at z 50, over the session
    expect(page).toContain("onQuickComplete={quickDone}"); // the completion primitive with its undo toast
  });
  it("the round-trip law: a completed task vanishes from liveKeys and deals as handled; a survivor resumes in place", () => {
    expect(ss).toContain("if (!liveKeys.has(current.key)) markHandledAdvance(current);");
    expect(ss).toContain("setHandled((h) => (h.some((x) => x.key === c.key) ? h : [...h, c]));");
    // Mark handled fires the primitive only — the vanish drives the advance, so a declined
    // dup-guard honestly stays put
    expect(ss).not.toContain("onQuickComplete(current).then");
  });
  it("the footer whispers what's next; dead queue entries fast-forward silently", () => {
    expect(ss).toContain(">NEXT UP · <i>{order[index + 1].title}</i></div>");
    expect(ss).toContain("while (i < order.length && !liveKeys.has(order[i].key)) i += 1;");
  });
  it("skip requeues to the session order's end (the engine has no requeue — recon); skipping the last live task closes", () => {
    expect(ss).toContain("const next = [...rest, c0]; // the requeue — to the session order's end"); // (P3 reworded the comment)
    expect(ss).toContain('if (!rest.some((x) => liveKeys.has(x.key))) { setOrder(next); setPhase("close"); return; }'); // (P3: the requeued order lands before the close)
  });
});

describe("session P3 — the deal (option A: the paper stack)", () => {
  it("the stack caps at TWO edges regardless of queue length; the states thin (1 left → one edge; last → none)", () => {
    expect(ss).toContain("const remaining = order.slice(index + 1).filter((x) => liveKeys.has(x.key)).length;");
    expect(ss).toContain('{remaining >= 2 && <div className="tdb-ssdeck d2" aria-hidden />}');
    expect(ss).toContain('{remaining >= 1 && <div className="tdb-ssdeck d1" aria-hidden />}');
    expect(rule(".tdb-ssdeck")).toContain("scale(0.975)");
    expect(rule(".tdb-ssdeck.d2")).toContain("scale(0.95)");
    expect(rule(".tdb-ssdeck.d2")).toContain("opacity: 0.7");
  });
  it("HANDLED: stamp (rotated −8°, 350ms pop) → hold 520 → sweep off left → the next rises 180 in; the advance fires WITH the rise", () => {
    expect(ss).toContain('setDeal({ card: c, kind: "handled" });');
    expect(ss).toContain("const advanceAtMs = reduce ? 400 : DEAL.stampHoldMs + DEAL.riseDelayMs;");
    expect(ss).toContain("at(advanceAtMs, () => { advancePast(index + 1); setRose(true); });");
    expect(css).toContain("animation: tdbStampIn 350ms cubic-bezier(0.2, 0.9, 0.3, 1.5) both;");
    expect(css).toContain("@keyframes tdbStampIn { from { transform: rotate(-8deg) scale(0); } to { transform: rotate(-8deg) scale(1); } }");
    expect(css).toContain(".tdb-ssleave.handled { animation: tdbSweepOff 500ms cubic-bezier(0.5, 0.05, 0.6, 1) 520ms forwards; }");
    expect(css).toContain("@keyframes tdbSweepOff { to { transform: translateX(-160%) rotate(-5deg); opacity: 0; } }");
    expect(css).toContain(".tdb-ssheet.rise { animation: tdbRise 400ms cubic-bezier(0.2, 0.9, 0.3, 1.15); }");
  });
  it("SKIP: no stamp — down and behind (450ms, z beneath the risen sheet) with the requeue via the session order", () => {
    expect(ss).toContain('if (!reduce) setDeal({ card: c0, kind: "skip" });');
    expect(ss).toContain('{deal.kind === "handled" && <span className="tdb-ssstamp" aria-hidden>✓</span>}'); // skip stamps nothing
    expect(css).toContain(".tdb-ssleave.skip { animation: tdbSkipDown 450ms ease forwards; }");
    expect(css).toContain(".tdb-ssleave.skip { z-index: 1; }");
    expect(ss).toContain("at(reduce ? 0 : DEAL.skipAdvanceMs, doRequeue);");
  });
  it("progress + footer sync: they read index/order, which move at the rise moment; the actions sit disabled while dealing", () => {
    expect(ss).toContain("disabled={!!deal} onClick={() => onOpenJourney(current)}");
    expect(ss).toContain("disabled={!!deal} onClick={skipCurrent}");
    expect(ss).toContain("if (dealRef.current) return;"); // the vanish effect + re-entry guard
  });
  it("reduced motion: instant swaps; the stamp appears without its pop", () => {
    expect(css).toContain(".tdb-ssleave.static .tdb-ssstamp { animation: none; transform: rotate(-8deg) scale(1); }");
    expect(css).toContain(".tdb-ssleave.handled, .tdb-ssleave.skip, .tdb-ssheet.rise, .tdb-ssstamp { animation: none; }");
  });
});


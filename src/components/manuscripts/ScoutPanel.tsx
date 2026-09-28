/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScoutPanel — the Scout's working panel (Pro; flagged behind `SCOUT_LIVE`), moved VERBATIM out of
 * ComparableTitlesPage.tsx by comps v2 (27 Sep).
 *
 * ⚠️ IT IS MOUNTED NOWHERE, DELIBERATELY. Comparable titles v2 dedicates its rail to "The Scout,
 * coming soon" (D1, D5), and the page must never call `fetchCompRun`. The code is kept — with
 * `lib/suggestComps.ts` and the callable — for the day the Scout goes live, when it is re-homed in
 * the rail rather than rewritten. Its behaviour is still asserted by compsScoutPanel.test.ts.
 */
import React, { useState } from "react";
import { Check, Lock, RefreshCw } from "lucide-react";
import { CompTitle } from "../../types";
import { ScoutEmptySketch } from "./compMarks";
import { ScoutRow, returnedLine } from "./compsScoutRow";
import {
  ScoutRun,
  SuggestCompsInput,
  fetchCompRun,
  scoutLive,
  suggestionToComp,
  visibleSuggestions,
} from "../../lib/suggestComps";
import { formatDate } from "../../lib/dates";
import "./comps.css";

// ── The Scout (Pro; flagged) ──

/**
 * ⚠️ THE RUNNING STATE NARRATES WHAT IS HAPPENING, and its three steps are the three things the
 * function actually does. Copy that promised a fourth stage the function does not perform would be a
 * claim like any other.
 */
const RUN_STEPS = ["Reading your manuscript", "Searching recent titles", "Verifying against a catalogue"];
/** ⚠️ A FLOOR, NOT A DELAY. A run that returns in 90ms would otherwise flash three steps and vanish. */
const RUN_FLOOR_MS = 450;

const sleepMs = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** `LAST SENT OUT — 13 AUG, 09:41`, or null when the run carried no usable timestamp. */
function lastSentOut(runAt: string): string | null {
  if (!runAt) return null;
  const d = new Date(runAt);
  if (Number.isNaN(d.getTime())) return null;
  const date = formatDate(d, { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Last sent out — ${date}, ${time}`;
}


/**
 * One suggestion row.
 *
 * ⚠️ THE GRID IS THE ALIGNMENT SPEC AND IT IS EXACT: `26px minmax(0,1fr) 104px`, `align-items:start`.
 * The action column is a FIXED width so every row's right edge is flush regardless of title length —
 * sizing it to content is what made the previous version ragged. And the why-line lives INSIDE
 * column two rather than spanning the grid, which is what stopped it running under the buttons.
 */

type ScoutPhase = "idle" | "running" | "done" | "notyet" | "error";

export const ScoutPanel: React.FC<{
  isPro: boolean;
  input: SuggestCompsInput;
  shelfTitles: string[];
  onAddToShelf: (comp: CompTitle) => void;
  onUpgrade: () => void;
}> = ({ isPro, input, shelfTitles, onAddToShelf, onUpgrade }) => {
  const [phase, setPhase] = useState<ScoutPhase>("idle");
  const [run, setRun] = useState<ScoutRun | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const visible = run ? visibleSuggestions(run.suggestions, shelfTitles, dismissed) : [];

  const send = async () => {
    if (!scoutLive()) { setPhase("notyet"); return; }
    setPhase("running");
    setStep(0);
    const advance = window.setInterval(() => setStep((n) => Math.min(n + 1, RUN_STEPS.length - 1)), 320);
    try {
      const [data] = await Promise.all([fetchCompRun(input, isPro), sleepMs(RUN_FLOOR_MS)]);
      setRun(data);
      setDismissed([]);
      setPhase("done");
    } catch {
      setPhase("error");
    } finally {
      window.clearInterval(advance);
    }
  };

  /** ⚠️ THE ROW LEAVES BEFORE THE LIST CHANGES, so the gap and the receipt agree. */
  const slideOut = (title: string, after: () => void) => {
    setLeaving(title);
    window.setTimeout(() => { setLeaving(null); after(); }, 240);
  };

  /**
   * ⚠️ THE FREE STATE SHOWS THE SHAPE OF THE FEATURE, NEVER INVENTED BOOKS.
   *
   * The pack asks for the three most recent REAL suggestions, blurred. A free user has never run the
   * Scout — they cannot — so there are none, and the only way to fill that space is to make some up.
   * Blurring a fabricated title does not stop it being one, and this is the card whose footer
   * promises that nothing is invented: undercutting that promise inside the same card to sell the
   * feature the promise is about would be the worst place in the app to do it.
   *
   * So the veil sits over three empty row SKELETONS. The writer sees the shape, the density and the
   * fixed action column — everything the feature looks like — and no title they could mistake for a
   * real book. Deliberate deviation, reported.
   */
  if (!isPro) {
    return (
      <div className="ct-body">
        <div className="ct-upsell">
          {/* ⚠️ ONE BLURRED TEASER, AND IT IS DECORATION — `aria-hidden`, `inert`, and holding no
              real title. A screen reader must not read it and a Tab must not land in it: it is a
              picture of a card, not a card. `inert` is what actually removes it from the tab order;
              `aria-hidden` alone hides it from the reader while leaving it focusable, which is the
              worst of both — a control a keyboard user can reach and cannot hear.

              ⚠️ AND IT SHOWS NO NAMED TITLE. A blurred card carrying a real suggestion would be
              showing a free user the answer and charging them to read it; a placeholder shape says
              "there is something here" without pretending to be a specific book. */}
          <div className="ghost" aria-hidden="true" inert>
            <div className="ct-srow skeleton">
              <div className="ct-spine" />
              <div className="ct-cmain">
                <span className="bar w70" /><span className="bar w40" /><span className="bar w90" />
              </div>
              <div className="ct-saside"><span className="bar btn" /></div>
            </div>
          </div>
          <div className="lockwrap">
            <div className="lock"><Lock /></div>
            {/* ⚠️ NO COUNT AND NO "up to N". The ref's heading names 1,240 library titles; there is
                no library behind this Scout and no quota on this plan — free comps are unlimited and
                the Pro boundary is the Scout itself. A number here would be either invented or a
                limit that does not exist. */}
            <h3>The Scout finds titles shelved beside manuscripts like yours</h3>
            <p>
              Pro sends the Scout out to find recent comps in your category, each checked against a
              real catalogue and shown with the facts it matched on.
            </p>
            <button type="button" className="ct-btn-slate" onClick={onUpgrade}>
              See what the Scout finds — Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sent = run ? lastSentOut(run.runAt) : null;
  const returned = phase === "done" && run;
  return (
    <div className="ct-sbody">
      {/* ⚠️ THE IDLE STATE IS THE PANEL, not a strip above one (v3 §4). With nothing to list, the
          slot takes the height the suggestions will take, so the panel does not resize the first
          time a run comes back. Status, one line on what a run does, then the send. */}
      {phase === "idle" && !run && (
        <div className="ct-sidle">
          <div className="ct-sslot" data-slot="comp-scout-idle" aria-hidden="true">
            <span>comp-scout-idle</span><span>300×200</span>
          </div>
          <div className="ct-sstatus">Not sent out yet</div>
          <p className="ct-snote">
            The Scout reads your manuscript&rsquo;s details and returns recent, real titles that
            match it — with the reason each one surfaced.
          </p>
          <button type="button" className="ct-btn-blue" onClick={send}>Send the Scout out</button>
        </div>
      )}

      {/* ⚠️ THE RETURNED HEADER STATES WHEN AND HOW MANY, and the count is what is SHOWN. */}
      {returned && (
        <div className="ct-sstatus ct-sstatus--back">{returnedLine(run.runAt, visible.length)}</div>
      )}

      {(phase === "running" || phase === "notyet" || phase === "error") && (
        <div className="ct-sctl">
          <span className="dotok" aria-hidden="true" />
          <span className="status">{run ? (sent ?? "Sent out this session") : "Not sent out yet"}</span>
          <button type="button" className="ct-btn-blue" onClick={send} disabled={phase === "running"}>
            {phase === "running" ? "Sending…" : run ? "Send again" : "Send the Scout out"}
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="ct-runsteps" role="status" aria-live="polite">
          {RUN_STEPS.map((label, i) => (
            <div key={label} className={`ct-runstep${i === step ? " on" : ""}${i < step ? " done" : ""}`}>
              <span className="pip" aria-hidden="true" />{label}
            </div>
          ))}
        </div>
      )}

      {phase === "notyet" && (
        <div className="ct-notyet">
          <b>The Scout goes live soon.</b> Its catalogue checks are being finished, so every title it
          brings back is a real book with a real year. Until then, add your own comps on the left.
        </div>
      )}

      {/* ⚠️ STATES WHAT HAPPENED AND WHAT TO DO. No apology, no red, no stack detail. */}
      {phase === "error" && (
        <div className="ct-notyet">The Scout couldn&rsquo;t complete this run. Try sending it out again.</div>
      )}

      {phase === "done" && visible.length === 0 && (
        <div className="ct-estate">
          <div className="ct-islot" data-slot="scout-empty"><ScoutEmptySketch /></div>
          <div className="em">Nothing left from this run.</div>
          <div className="es">
            You&rsquo;ve worked through every suggestion. Send the Scout out again whenever your
            manuscript or your list has moved on.
          </div>
        </div>
      )}

      {phase === "done" && visible.map((s) => (
        <ScoutRow
          key={s.title}
          s={s}
          onShelf={shelfTitles.some((t) => t.trim().toLowerCase() === s.title.trim().toLowerCase())}
          leaving={leaving === s.title}
          onAdd={() => slideOut(s.title, () => onAddToShelf(suggestionToComp(s)))}
          onDismiss={() => slideOut(s.title, () => setDismissed((d) => [...d, s.title]))}
        />
      ))}

      {/* ⚠️ THE RE-RUN PINS TO THE FOOT via `margin-top: auto`, not a fixed height — the panel's
          height comes from the comps card beside it, and a number here would have to be kept in
          step with a list whose length the writer controls. */}
      {returned && (
        <button type="button" className="ct-btn-blue ct-srerun" onClick={send}>
          <RefreshCw aria-hidden="true" />Send the Scout out again
        </button>
      )}

      {/* ⚠️ THE CLAIM THE WHOLE CONTRACT EXISTS TO EARN — see `verification`. */}
      <div className="ct-sfoot">
        <Check />
        <span className="ct-lbl">Every title checked against a real catalogue — nothing invented</span>
      </div>
    </div>
  );
};


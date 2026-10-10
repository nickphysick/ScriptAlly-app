/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scatter-and-settle import loader (extraction wait) — built to scriptally-loader-scatter-settle.html
 * + scriptally-loader-liveliness.html. The writer's OWN raw cells (sampled client-side on upload —
 * display only, never the real extraction path) land strewn across the screen at slight angles the
 * instant the file's read. While extraction runs the screen stays ALIVE: the scattered cards drift
 * gently and independently, on-brand process-sparks pop and fade, the bottom bar eases smoothly toward
 * ~78% (never parked) and the status text rotates honestly through read → parse → match → tidy. None
 * of this races ahead — the drift / sparks / bar-ease / text keep cycling until extraction ACTUALLY
 * returns. Then each card snaps one-by-one into a neat centred column and crystallises messy → clean:
 * the raw line gives way to a real <StatusDot> with a small pop, the agent's name, and an
 * "Agency · Status · Date" line, and the bar completes to 100%.
 *
 * Truthful: real raw in, real clean out (clean fields from the real result, paired by order). For big
 * imports only a representative handful scatter; the rest are noted as "+N more". Reduced-motion: no
 * drift, no sparks, no fly-in — just the easing bar + rotating status text, then the clean stack.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./importFlow.css";
import { SheenWave } from "./SheenWave";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";


export interface LoaderCard {
  /** The row's raw cells as the writer typed them — shown while scattered. */
  messy: string;
  /** Clean agent name (Playfair) — filled once extraction completes. */
  name?: string;
  /** The clean detail parts — agency + date sit muted, the status is highlighted in ink between them. */
  agency?: string;
  date?: string;
  /** Drives the real StatusDot AND the highlighted status label — filled once extraction completes. */
  status?: QueryStatus | string;
}
export interface ScatterSettleLoaderProps {
  cards: LoaderCard[];
  /** Extraction finished — begin the snap-and-crystallise settle. */
  complete: boolean;
  /** Total records extracted (drives the count + any "+N more" beyond the scattered sample). */
  total: number;
  /** Called once the settle beat finishes — the host routes to the Overview. */
  onProceed: () => void;
  /** Hard-timeout / unrecoverable wait — the host exits to its fallback (never dead-ends onboarding). */
  onTimeout?: () => void;
}

// Scatter slots — offsets (px) from the centre of the stage + a slight rotation + per-card drift
// (bob amplitude/rotation + a varied duration & delay so each breathes independently). Deterministic.
const SCATTER = [
  { dx: -300, dy: -158, r: -7, bx: 5, by: -7, br: 1.4, d: 3.6, dl: 0 },
  { dx: 300, dy: -178, r: 6, bx: -6, by: 6, br: -1.1, d: 4.0, dl: 0.5 },
  { dx: -332, dy: 6, r: 5, bx: 7, by: 5, br: 1.0, d: 3.3, dl: 0.9 },
  { dx: 332, dy: -8, r: -6, bx: -5, by: -6, br: -1.3, d: 3.8, dl: 0.25 },
  { dx: -250, dy: 168, r: 7, bx: 6, by: -5, br: 1.0, d: 3.5, dl: 0.7 },
  { dx: 282, dy: 176, r: -5, bx: -7, by: 5, br: -1.0, d: 4.1, dl: 0.15 },
  { dx: -36, dy: -196, r: 3, bx: 5, by: 6, br: 1.3, d: 3.4, dl: 0.55 },
  { dx: 58, dy: 168, r: -4, bx: -6, by: -6, br: -1.0, d: 3.9, dl: 0.85 },
];
const GRID_X = 150;       // half the gap between the two grid columns (centre-relative)
const GRID_ROW = 82;      // grid row pitch
// ── Three-zone timing spine: Intro (fixed) → Work (elastic, loops till extraction) → Reveal (gated) ──
const INTRO_MS = 1200;    // fixed intro beat (the squeeze-pop scatter entrance)
const FLOOR_MS = 2800;    // Reveal floor: fast extraction is padded to here so the reveal never flashes
const SLOW_AT_MS = 10000; // past this, the status text owns up to a larger import
const TIMEOUT_MS = 30000; // hard wait ceiling → host fallback (never an infinite loop)
const CRYST_STAGGER = 150; // ms between successive cards crystallising in place
const WAIT_TXT = ["Reading your file…", "Parsing agents…", "Interpreting dates…", "Matching statuses…", "Tidying records…", "Almost there…"];
const SLOW_TXT = "Larger import — almost there…";
const SPARK_KINDS = ["q", "a", "p", "d"] as const;
const SPARK_GLYPH: Record<typeof SPARK_KINDS[number], React.ReactNode> = {
  q: "?",
  a: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>,
  p: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12 22 3 13 22l-2.5-7.5L2 12Z" /></svg>,
  d: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>,
};

const prefersReduced = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * ⚠️ THE SCATTER NEEDS ROOM IT DOES NOT HAVE ON A PHONE, so below this width it does not scatter.
 *
 * The `SCATTER` table below is a set of ABSOLUTE offsets from the stage centre, out to ±332px
 * horizontally — about 700px of spread plus a 440px card. Under roughly 1400px the outer cards
 * begin leaving the viewport, and on a phone most of the writer's own rows would simply be
 * off-screen while a loader told them their file was being read.
 *
 * ⚠️ IT REUSES THE REDUCED-MOTION PATH RATHER THAN ADDING A SECOND FALLBACK. That path already
 * produces exactly what is wanted here — no drift, no sparks, no fly-in, just the easing bar, the
 * rotating status text and then the clean settled stack — and it is a path that already gets
 * exercised. A parallel narrow-screen branch would be a second thing to keep in step with every
 * future change to the loader, for no different outcome.
 */
const NARROW_BP = 900;
const isNarrow = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(`(max-width: ${NARROW_BP - 1}px)`).matches;

/** Static presentation: either the writer asked for less motion, or the screen cannot hold the scatter. */
const prefersStatic = () => prefersReduced() || isNarrow();

const CARD_W = 440;        // wide while messy (holds the full raw row)
const RESOLVED_W = 268;    // tightens to the on-brand card width on crystallise (grid-friendly)

// Work-zone "forms being filled" — a small Add-an-agent / Log-a-query form drifts through behind the
// scraps, its fields populated from the writer's own raw cells (display-only; split on the visible
// separators — never invented). A capped, cycling pool keeps it lively without instantiating dozens.
const FORM_POOL = 6;       // max forms alive at once
const FORM_SPAWN = 720;    // ms between spawns
const FORM_LIFE = 3000;    // ms a form lives (fade in → drift up → fade out)
type FormKind = "agent" | "query";
const FORM_META: Record<FormKind, { title: string; glyph: React.ReactNode; fields: [string, string] }> = {
  agent: { title: "Add an agent", fields: ["Name", "Agency"],
    glyph: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg> },
  query: { title: "Log a query", fields: ["Status", "Date sent"],
    glyph: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12 22 3 13 22l-2.5-7.5L2 12Z" /></svg> },
};
// Two evocative field values pulled from the raw scrap (split on its own separators; trimmed). Honest:
// these are the writer's cells, never fabricated — just shown as if being typed into the form.
const formFields = (messy: string, kind: FormKind): [string, string] => {
  const parts = messy.split(/[·,|]/).map((p) => p.trim()).filter(Boolean);
  if (kind === "agent") return [parts[0] || "…", parts[1] || "…"];                         // name · agency (head)
  return [parts[parts.length - 2] || parts[0] || "…", parts[parts.length - 1] || "…"];     // status-ish · date-ish (tail)
};

/** The last status line. ⚠️ "Ready" and nothing after it: the summary that follows says what was
 *  read, and nothing in the import says "here's what we found" (onboarding v5 part 2). */
export const READY_TXT = "Ready";

/** The timing spine, exported for lock R1 and for nothing else: no caller may set these. */
export const SCATTER_TIMINGS = { INTRO_MS, FLOOR_MS, SLOW_AT_MS, TIMEOUT_MS, STATUS_INTERVAL_MS: 1300 } as const;

/** How far the outermost scattered card reaches from the stage's centre at full spread: the widest
 *  slot offset plus half a messy card. The stage scales the spread to its own box below this. */
const FULL_SPREAD = 332 + CARD_W / 2;

export const ScatterSettleLoader: React.FC<ScatterSettleLoaderProps> = ({ cards, complete, total, onProceed, onTimeout }) => {
  const reduced = prefersStatic();
  /* ⚠️ POSITIONS ARE MEASURED FROM THE STAGE, NOT THE WINDOW. The loader fills the frame's sheet
     now, which is narrower than the window by the sidebar, so the scatter is scaled to the stage's
     own width: at full spread a 1280 window's outer cards ran 40px past the sheet's edge. */
  const stageRef = useRef<HTMLElement>(null);
  const [spread, setSpread] = useState(1);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      if (w > 0) setSpread(Math.max(0.2, Math.min(1, (w / 2 - 14 - CARD_W / 2) / (FULL_SPREAD - CARD_W / 2))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = cards.length;
  const [introDone, setIntroDone] = useState(reduced); // intro beat over → the Work zone (drift) begins
  const [minElapsed, setMinElapsed] = useState(false); // Reveal floor reached
  const [slow, setSlow] = useState(false);             // a larger import — own up to the longer wait
  const [settling, setSettling] = useState(false);
  const [resolved, setResolved] = useState(0); // cards that have crystallised messy → clean (in place)
  const [arranged, setArranged] = useState(false); // crystallised cards moved into the tidy grid
  const [squeeze, setSqueeze] = useState(false);   // grid squeezes to centre (then fades into the tick)
  const [tick, setTick] = useState(false);         // the big sage tick lands — hands to the Overview
  const [txtIdx, setTxtIdx] = useState(0);     // rotating status line during the wait
  const [waitStarted, setWaitStarted] = useState(false); // kicks the bar's ease off the start line
  const [sparks, setSparks] = useState<{ id: number; kind: typeof SPARK_KINDS[number]; x: number; y: number }[]>([]);
  const sparkId = useRef(0);
  const [forms, setForms] = useState<{ id: number; kind: FormKind; messy: string; x: number; y: number; rot: number }[]>([]);
  const formId = useRef(0);
  const cardsRef = useRef(cards); cardsRef.current = cards; // read latest scraps in the spawn loop without re-arming it

  // Timing spine — Intro (fixed) then the Reveal floor. The floor pads a fast extraction so the reveal
  // never flashes. Reduced-motion keeps the gate (we still wait for the data) but skips the timed
  // theatre — records appear in order the moment extraction returns.
  useEffect(() => {
    if (reduced) { setIntroDone(true); setMinElapsed(true); return; }
    const t1 = setTimeout(() => setIntroDone(true), INTRO_MS);
    const t2 = setTimeout(() => setMinElapsed(true), FLOOR_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reduced]);

  // Larger-import status shift (both motion prefs) + a hard wait ceiling → the host's fallback, so a
  // hung or error-bound extraction never spins forever. Both disarm the moment the data is back.
  const timeoutRef = useRef(onTimeout); timeoutRef.current = onTimeout;
  useEffect(() => {
    if (complete) return; // data's back — the settle path owns the rest
    const slowT = setTimeout(() => setSlow(true), SLOW_AT_MS);
    const killT = setTimeout(() => timeoutRef.current?.(), TIMEOUT_MS);
    return () => { clearTimeout(slowT); clearTimeout(killT); };
  }, [complete]);

  // Begin settling ONLY once extraction has actually returned (and, for the animated path, the cards
  // have had their scatter moment). Honest: nothing snaps or completes before the data is ready.
  useEffect(() => {
    if (complete && minElapsed) setSettling(true);
  }, [complete, minElapsed]);

  // Defensive reset if extraction is re-run (complete → false). Real flow is one-shot; matters for a
  // re-upload or the dev harness loop.
  useEffect(() => {
    if (!complete) { setSettling(false); setResolved(0); setArranged(false); setSqueeze(false); setTick(false); }
  }, [complete]);

  // Kick the bar off the start line so its long ease toward ~78% animates (instead of rendering parked).
  useEffect(() => { const id = requestAnimationFrame(() => setWaitStarted(true)); return () => cancelAnimationFrame(id); }, []);

  // Rotating honest status text — cycles through the read→tidy phases until the settle begins (both
  // motion preferences; this is the reduced-motion path's main sign of life).
  useEffect(() => {
    if (settling) return;
    const id = setInterval(() => setTxtIdx((i) => (i + 1) % WAIT_TXT.length), SCATTER_TIMINGS.STATUS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [settling]);

  // Process-sparks pop around the cards while we wait (animated path only) — a few at a time, never a swarm.
  useEffect(() => {
    if (reduced || settling || n === 0) return;
    const spawn = () => {
      const kind = SPARK_KINDS[sparkId.current % SPARK_KINDS.length];
      const id = ++sparkId.current;
      const x = 12 + Math.random() * 76, y = 16 + Math.random() * 60; // % of the stage
      setSparks((s) => [...s, { id, kind, x, y }]);
      setTimeout(() => setSparks((s) => s.filter((sp) => sp.id !== id)), 1500);
    };
    const id = setInterval(spawn, 560);
    return () => { clearInterval(id); setSparks([]); };
  }, [reduced, settling, n]);

  // Work-zone forms — a capped, cycling pool of Add-an-agent / Log-a-query forms drifts through behind
  // the scraps, each populated from one raw scrap. Begins after the intro beat; clears when settling.
  useEffect(() => {
    if (reduced || settling || !introDone || n === 0) return;
    const spawn = () => {
      const id = ++formId.current;
      const card = cardsRef.current[id % n];
      if (!card) return;
      const kind: FormKind = id % 2 === 0 ? "agent" : "query";
      const x = 16 + Math.random() * 68;   // % of the stage
      const y = 24 + Math.random() * 50;
      const rot = (Math.random() * 5 - 2.5);
      setForms((f) => (f.length >= FORM_POOL ? f : [...f, { id, kind, messy: card.messy, x, y, rot }]));
      setTimeout(() => setForms((f) => f.filter((fm) => fm.id !== id)), FORM_LIFE);
    };
    spawn();
    const iv = setInterval(spawn, FORM_SPAWN);
    return () => { clearInterval(iv); setForms([]); };
  }, [reduced, settling, introDone, n]);

  // Reveal choreography (only once extraction's back AND the floor's met): the scraps crystallise in
  // place → arrange into a tidy grid → squeeze to centre → resolve into the big sage tick → hand off to
  // the Overview. Reduced-motion shows them already in the grid, then runs the squeeze→tick beats.
  const proceedRef = useRef(onProceed); proceedRef.current = onProceed;
  useEffect(() => {
    if (!settling) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      setResolved(n); setArranged(true);
      timers.push(setTimeout(() => setSqueeze(true), 600));
      timers.push(setTimeout(() => setTick(true), 1020));
      timers.push(setTimeout(() => proceedRef.current(), 1970));
      return () => timers.forEach(clearTimeout);
    }
    for (let i = 0; i < n; i++) timers.push(setTimeout(() => setResolved((c) => Math.max(c, i + 1)), i * CRYST_STAGGER)); // 1 · crystallise in place
    const cryst = Math.max(0, n - 1) * CRYST_STAGGER + 420;
    timers.push(setTimeout(() => setArranged(true), cryst + 220));        // 2 · arrange into the grid
    const sq = cryst + 220 + 720;
    timers.push(setTimeout(() => setSqueeze(true), sq));                  // 3 · squeeze to centre
    timers.push(setTimeout(() => setTick(true), sq + 430));               // 4 · the tick
    timers.push(setTimeout(() => proceedRef.current(), sq + 430 + 1000)); //     hand off
    return () => timers.forEach(clearTimeout);
  }, [settling, reduced, n]);

  const remainder = Math.max(0, total - n);
  const allShownResolved = settling && resolved >= n;
  const countShown = Math.min(resolved + (allShownResolved ? remainder : 0), total);
  // Bar: eases to ~78% across the wait (never parked), then completes to 100% as cards resolve.
  const barW = settling ? Math.round(78 + (resolved / Math.max(1, n)) * 22) : (waitStarted ? 78 : 4);
  const barTransition = settling ? "width .45s ease" : "width 6s cubic-bezier(.25,.6,.4,1)";
  const txt = allShownResolved ? READY_TXT : settling ? "Tidying records…" : slow ? SLOW_TXT : WAIT_TXT[txtIdx];

  return (
    <div className="im-bare im-ssl" data-im="reading" data-im-state={tick ? "done" : settling ? "settling" : "work"}>
      <style>{`
        @keyframes saScAppear{from{opacity:0}to{opacity:1}}
        @keyframes saScPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        /* Intro beat — each scrap squeeze-pops in (squash → overshoot → settle); rotation held via --r. */
        @keyframes saScSqueeze{0%{transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(.18,.64);opacity:0}55%{transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(1.12,.9);opacity:1}74%{transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(.95,1.05)}100%{transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(1,1);opacity:1}}
        /* gentle independent drift while we wait (offsets/rotation/duration set per card via vars) */
        @keyframes saScBob{0%,100%{transform:translate(-50%,-50%) rotate(var(--r,0deg))}50%{transform:translate(calc(-50% + var(--bx,5px)), calc(-50% + var(--by,-6px))) rotate(calc(var(--r,0deg) + var(--br,1deg)))}}
        @keyframes saScSpark{0%{transform:scale(.3);opacity:0}20%{transform:scale(1.1);opacity:1}55%{transform:scale(1);opacity:1}100%{transform:scale(.96) translateY(-10px);opacity:0}}
        .sa-sc-card{transition:left .6s cubic-bezier(.34,1.3,.5,1), top .6s cubic-bezier(.34,1.3,.5,1), transform .7s cubic-bezier(.5,0,.3,1), width .55s cubic-bezier(.4,0,.2,1), opacity .5s ease .12s, background .4s ease, border-color .4s ease, box-shadow .5s ease;}
        @keyframes saScBigtick{0%{transform:translate(-50%,-50%) scale(0);opacity:0}60%{transform:translate(-50%,-50%) scale(1.12);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
        @keyframes saScHalo{0%{box-shadow:0 0 0 0 rgba(45,58,80,.42)}100%{box-shadow:0 0 0 26px rgba(45,58,80,0)}}
        .sa-sc-bigtick{animation:saScBigtick .75s cubic-bezier(.34,1.56,.64,1) forwards, saScHalo 1.6s ease .5s;}
        @media(prefers-reduced-motion:reduce){.sa-sc-bigtick{animation:none;transform:translate(-50%,-50%) scale(1);opacity:1;}}
        .sa-sc-appear{animation:saScAppear .4s ease both;}
        .sa-sc-squeeze{animation:saScSqueeze .52s cubic-bezier(.34,1.56,.64,1) both;}
        .sa-sc-float{animation:saScBob var(--d,3.6s) ease-in-out infinite;animation-delay:var(--dl,0s);}
        .sa-sc-dotpop svg{animation:saScPop .5s cubic-bezier(.34,1.56,.64,1);}
        .sa-sc-spark{position:absolute;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:saScSpark 1.5s ease forwards;z-index:6;}
        /* Work-zone forms — drift up through the background, behind the scraps. */
        @keyframes saScForm{0%{opacity:0;transform:translate(-50%,-50%) translateY(18px) scale(.93) rotate(var(--fr,0deg))}16%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) translateY(-32px) scale(.98) rotate(var(--fr,0deg))}}
        .sa-sc-form{position:absolute;animation:saScForm 3s cubic-bezier(.4,0,.3,1) forwards;z-index:4;pointer-events:none;}
        @keyframes saScBlink{0%,100%{opacity:.4}50%{opacity:1}}
        .sa-sc-pip{animation:saScBlink 1.1s ease-in-out infinite;}
        @media(prefers-reduced-motion:reduce){.sa-sc-card{transition:none;}.sa-sc-appear,.sa-sc-squeeze,.sa-sc-float,.sa-sc-dotpop svg,.sa-sc-spark,.sa-sc-pip{animation:none;}.sa-sc-form{display:none;}}
      `}</style>

      <main className="im-ssl-stage" ref={stageRef} data-im="stage">
        {/* Work-zone forms — Add-an-agent / Log-a-query, fields filling from the raw scraps, drifting BEHIND them */}
        {!reduced && !settling && forms.map((fm) => {
          const meta = FORM_META[fm.kind];
          const [v1, v2] = formFields(fm.messy, fm.kind);
          const rows: [string, string][] = [[meta.fields[0], v1], [meta.fields[1], v2]];
          return (
            <div key={fm.id} className="sa-sc-form" style={{ left: `${fm.x}%`, top: `${fm.y}%`, width: 248, ["--fr" as string]: `${fm.rot}deg` }} aria-hidden>
              <div className="im-sc-formbox">
                <h4>{meta.glyph}{meta.title}</h4>
                {rows.map(([label, val], k) => (
                  <p key={k}><small>{label}</small><span>{val}</span></p>
                ))}
              </div>
            </div>
          );
        })}
        {n === 0 ? (
          <div className="im-ssl-empty">Reading your file…</div>
        ) : cards.map((card, i) => {
          const slot = SCATTER[i % SCATTER.length];
          const isDone = i < resolved;                 // crystallised (clean on-brand layer)
          const drifting = !reduced && introDone && !settling; // bob through the Work zone (after the intro beat)
          // 2-column grid centred on the stage; a lone last card (odd count) centres in its row.
          const cols = 2, rows = Math.ceil(n / cols), col = i % cols, row = Math.floor(i / cols);
          const lone = i === n - 1 && n % cols === 1;
          const gx = lone ? 0 : (col === 0 ? -GRID_X : GRID_X);
          const gy = (row - (rows - 1) / 2) * GRID_ROW;
          let left: string, top: string, transform: string, cardOpacity = 1;
          if (squeeze) {                               // squeeze to centre + fade into the tick
            left = "50%"; top = "50%"; transform = "translate(-50%,-50%) scale(.24)"; cardOpacity = 0;
          } else if (arranged || reduced) {            // tidy grid
            left = `calc(50% + ${gx}px)`; top = `calc(50% + ${gy}px)`; transform = "translate(-50%,-50%) rotate(0deg)";
          } else {                                     // scattered — straightens to 0° as it crystallises in place
            left = `calc(50% + ${Math.round(slot.dx * spread)}px)`; top = `calc(50% + ${slot.dy}px)`; transform = `translate(-50%,-50%) rotate(${isDone ? 0 : slot.r}deg)`;
          }
          return (
            <div key={i} className={`sa-sc-card${reduced || introDone ? "" : " sa-sc-squeeze"}${drifting ? " sa-sc-float" : ""}`} aria-hidden data-im="card"
              style={{
                position: "absolute", left, top, transform, opacity: cardOpacity, width: isDone ? RESOLVED_W : CARD_W, maxWidth: "calc(100% - 20px)", minHeight: 66, zIndex: arranged ? 20 + i : (isDone ? 15 : 10),
                animationDelay: reduced ? undefined : `${50 + i * 80}ms`,
                ["--r" as string]: `${slot.r}deg`, ["--bx" as string]: `${slot.bx}px`, ["--by" as string]: `${slot.by}px`, ["--br" as string]: `${slot.br}deg`, ["--d" as string]: `${slot.d}s`, ["--dl" as string]: `${slot.dl}s`,
                background: "#fff", border: isDone ? "1px solid transparent" : "1px solid rgba(28,19,15,.12)", borderRadius: 13,
                boxShadow: isDone ? "0 13px 32px -15px rgba(28,19,15,.3)" : "0 14px 30px -16px rgba(28,19,15,.4)",
              }}>
              {/* messy (raw) layer — fades out on crystallise */}
              <div className="im-sc-messy" style={{ opacity: isDone ? 0 : 1 }}>
                <i>▦</i>
                <span>{card.messy}</span>
              </div>
              {/* clean layer — the white rim (inset 5) holds the navy sheen frame: dot + name + agency */}
              <div className="im-sc-clean" style={{ opacity: isDone ? 1 : 0 }}>
                <SheenWave radius={9} borderWidth={1.5} style={{ height: "100%", background: "#fff", padding: "11px 14px", display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minWidth: 0 }}>
                    <span className={isDone ? "sa-sc-dotpop" : undefined} style={{ width: 25, height: 25, flexShrink: 0, display: "inline-flex" }}>
                      {card.status ? <StatusDot status={card.status} overrideSize={25} /> : <span className="im-sc-blank" />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="im-sc-name">{card.name || "—"}</div>
                      <div className="im-sc-sub">{card.agency || ""}</div>
                    </div>
                  </div>
                </SheenWave>
              </div>
            </div>
          );
        })}

        {/* process-sparks — popping around the cards while we work */}
        {sparks.map((s) => (
          <div key={s.id} className={`sa-sc-spark im-sc-spark ${s.kind}`} aria-hidden style={{ left: `${s.x}%`, top: `${s.y}%` }}>{SPARK_GLYPH[s.kind]}</div>
        ))}

        {/* the remainder of a big import — a quiet pill below the grid; fades as the grid squeezes away */}
        {settling && remainder > 0 && (
          <div className="im-sc-more" style={{ top: `calc(50% + ${(Math.ceil(n / 2) - 1) / 2 * GRID_ROW + 72}px)`, opacity: squeeze ? 0 : 1 }}>
            + {remainder} more, tidied
          </div>
        )}

        {/* the done beat — records squeeze to centre and resolve into the navy mark (hands to the summary) */}
        {tick && (
          <div className="sa-sc-bigtick im-sc-tick" data-im="tick" aria-hidden>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
        )}
      </main>

      {/* the strip at the sheet's foot — rust pip · rotating status · easing progress · count */}
      <div className="im-ssl-bar" data-im="strip" role="status">
        <span className="sa-sc-pip im-ssl-pip" />
        <span key={txt} className="im-ssl-txt" data-im="status" style={{ animation: "saScAppear .25s ease" }}>{txt}</span>
        <span className="im-ssl-track"><i style={{ width: `${barW}%`, transition: barTransition }} /></span>
        <span className="im-ssl-cnt" data-im="count">{total > 0 ? `${countShown} / ${total}` : ""}</span>
      </div>
    </div>
  );
};

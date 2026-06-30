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
import React, { useEffect, useRef, useState } from "react";
import { OnbNav } from "./SmartImportReview";
import { SheenWave } from "./SheenWave";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";

const SERIF = "'Playfair Display',serif";
const MONO = "'JetBrains Mono',monospace";

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
  userName?: string;
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

const CARD_W = 440;        // wide while messy (holds the full raw row)
const RESOLVED_W = 268;    // tightens to the on-brand card width on crystallise (grid-friendly)

// Work-zone "forms being filled" — a small Add-an-agent / Log-a-query form drifts through behind the
// scraps, its fields populated from the writer's own raw cells (display-only; split on the visible
// separators — never invented). A capped, cycling pool keeps it lively without instantiating dozens.
const FORM_POOL = 6;       // max forms alive at once
const FORM_SPAWN = 720;    // ms between spawns
const FORM_LIFE = 3000;    // ms a form lives (fade in → drift up → fade out)
type FormKind = "agent" | "query";
const FORM_META: Record<FormKind, { title: string; glyph: React.ReactNode; accent: string; fields: [string, string] }> = {
  agent: { title: "Add an agent", accent: "#5a6e58", fields: ["Name", "Agency"],
    glyph: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg> },
  query: { title: "Log a query", accent: "#7c3a2a", fields: ["Status", "Date sent"],
    glyph: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12 22 3 13 22l-2.5-7.5L2 12Z" /></svg> },
};
// Two evocative field values pulled from the raw scrap (split on its own separators; trimmed). Honest:
// these are the writer's cells, never fabricated — just shown as if being typed into the form.
const formFields = (messy: string, kind: FormKind): [string, string] => {
  const parts = messy.split(/[·,|]/).map((p) => p.trim()).filter(Boolean);
  if (kind === "agent") return [parts[0] || "…", parts[1] || "…"];                         // name · agency (head)
  return [parts[parts.length - 2] || parts[0] || "…", parts[parts.length - 1] || "…"];     // status-ish · date-ish (tail)
};

export const ScatterSettleLoader: React.FC<ScatterSettleLoaderProps> = ({ cards, complete, total, onProceed, onTimeout, userName }) => {
  const reduced = prefersReduced();
  const userInitial = userName ? userName[0].toUpperCase() : "?";
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
    const id = setInterval(() => setTxtIdx((i) => (i + 1) % WAIT_TXT.length), 1300);
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
  const txt = allShownResolved ? "ready — here's what we found" : settling ? "Tidying records…" : slow ? SLOW_TXT : WAIT_TXT[txtIdx];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#fbf7f1", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Source Sans Pro, sans-serif", color: "#3a1c14", backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 33px,rgba(124,58,42,.022) 33px,rgba(124,58,42,.022) 34px)" }}>
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
        @keyframes saScHalo{0%{box-shadow:0 0 0 0 rgba(138,158,136,.42)}100%{box-shadow:0 0 0 26px rgba(138,158,136,0)}}
        .sa-sc-bigtick{animation:saScBigtick .75s cubic-bezier(.34,1.56,.64,1) forwards, saScHalo 1.6s ease .5s;}
        @media(prefers-reduced-motion:reduce){.sa-sc-bigtick{animation:none;transform:translate(-50%,-50%) scale(1);opacity:1;}}
        .sa-sc-appear{animation:saScAppear .4s ease both;}
        .sa-sc-squeeze{animation:saScSqueeze .52s cubic-bezier(.34,1.56,.64,1) both;}
        .sa-sc-float{animation:saScBob var(--d,3.6s) ease-in-out infinite;animation-delay:var(--dl,0s);}
        .sa-sc-layer{position:absolute;left:17px;right:17px;top:0;bottom:0;display:flex;align-items:center;transition:opacity .4s ease;}
        .sa-sc-dotpop svg{animation:saScPop .5s cubic-bezier(.34,1.56,.64,1);}
        .sa-sc-spark{position:absolute;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:saScSpark 1.5s ease forwards;z-index:6;}
        .sa-sc-spark.q{background:#f7eed8;color:#a8842c;font-family:${SERIF};font-weight:700;font-size:18px;}
        .sa-sc-spark.a{background:#e9ede6;color:#5a6e58;}
        .sa-sc-spark.p{background:#f5e2da;color:#7c3a2a;}
        .sa-sc-spark.d{background:#eef1ec;color:#5a6e58;}
        /* Work-zone forms — drift up through the background, behind the scraps. */
        @keyframes saScForm{0%{opacity:0;transform:translate(-50%,-50%) translateY(18px) scale(.93) rotate(var(--fr,0deg))}16%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) translateY(-32px) scale(.98) rotate(var(--fr,0deg))}}
        .sa-sc-form{position:absolute;animation:saScForm 3s cubic-bezier(.4,0,.3,1) forwards;z-index:4;pointer-events:none;}
        @media(prefers-reduced-motion:reduce){.sa-sc-card{transition:none;}.sa-sc-appear,.sa-sc-squeeze,.sa-sc-float,.sa-sc-dotpop svg,.sa-sc-spark{animation:none;}.sa-sc-form{display:none;}}
      `}</style>

      <OnbNav userInitial={userInitial} />

      <main style={{ flex: "1 1 auto", minHeight: 0, position: "relative", overflow: "hidden" }}>
        {/* Work-zone forms — Add-an-agent / Log-a-query, fields filling from the raw scraps, drifting BEHIND them */}
        {!reduced && !settling && forms.map((fm) => {
          const meta = FORM_META[fm.kind];
          const [v1, v2] = formFields(fm.messy, fm.kind);
          const rows: [string, string][] = [[meta.fields[0], v1], [meta.fields[1], v2]];
          return (
            <div key={fm.id} className="sa-sc-form" style={{ left: `${fm.x}%`, top: `${fm.y}%`, width: 248, ["--fr" as string]: `${fm.rot}deg` }} aria-hidden>
              <div style={{ background: "#fffdfa", border: "1px solid #ece1d4", borderRadius: 11, boxShadow: "0 12px 28px -18px rgba(58,28,20,.32)", padding: "11px 13px", opacity: 0.84 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, color: meta.accent, fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>{meta.glyph}{meta.title}</div>
                {rows.map(([label, val], k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: k === 0 ? 6 : 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: "#a89a8c", width: 50, flexShrink: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: "Source Sans Pro", fontSize: 11, color: "#5a4a3e", background: "#f6f1ea", border: "1px solid #ece1d4", borderRadius: 6, padding: "4px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {n === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: SERIF, fontSize: 22, color: "#7c3a2a" }}>Reading your file…</div>
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
            left = `calc(50% + ${slot.dx}px)`; top = `calc(50% + ${slot.dy}px)`; transform = `translate(-50%,-50%) rotate(${isDone ? 0 : slot.r}deg)`;
          }
          return (
            <div key={i} className={`sa-sc-card${reduced || introDone ? "" : " sa-sc-squeeze"}${drifting ? " sa-sc-float" : ""}`} aria-hidden
              style={{
                position: "absolute", left, top, transform, opacity: cardOpacity, width: isDone ? RESOLVED_W : CARD_W, minHeight: 66, zIndex: arranged ? 20 + i : (isDone ? 15 : 10),
                animationDelay: reduced ? undefined : `${50 + i * 80}ms`,
                ["--r" as string]: `${slot.r}deg`, ["--bx" as string]: `${slot.bx}px`, ["--by" as string]: `${slot.by}px`, ["--br" as string]: `${slot.br}deg`, ["--d" as string]: `${slot.d}s`, ["--dl" as string]: `${slot.dl}s`,
                background: "#fff", border: isDone ? "1px solid transparent" : "1px solid #e7ddd2", borderRadius: 13,
                boxShadow: isDone ? "0 13px 32px -15px rgba(58,28,20,.3)" : "0 14px 30px -16px rgba(58,28,20,.4)",
              }}>
              {/* messy (raw) layer — fades out on crystallise */}
              <div style={{ position: "absolute", inset: 0, padding: "13px 17px", display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0 : 1, transition: "opacity .4s ease" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: "#f2ece3", display: "flex", alignItems: "center", justifyContent: "center", color: "#bcae9f", flexShrink: 0, fontSize: 12 }}>▦</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: "#a89a8c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.messy}</span>
              </div>
              {/* clean (on-brand) layer — the white rim (inset 5) holds the SheenWave inset frame: dot + name + agency */}
              <div style={{ position: "absolute", inset: 5, opacity: isDone ? 1 : 0, transition: "opacity .45s ease .1s" }}>
                <SheenWave radius={9} borderWidth={1.5} style={{ height: "100%", background: "#fff", padding: "11px 14px", display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minWidth: 0 }}>
                    <span className={isDone ? "sa-sc-dotpop" : undefined} style={{ width: 25, height: 25, flexShrink: 0, display: "inline-flex" }}>
                      {card.status ? <StatusDot status={card.status} overrideSize={25} /> : <span style={{ width: 25, height: 25, borderRadius: "50%", border: "2px solid #e3d4c7", display: "inline-block" }} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, lineHeight: 1.1, color: "#3a1c14", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name || "—"}</div>
                      <div style={{ fontFamily: "Source Sans Pro", fontSize: 11, color: "#9a8c80", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.agency || ""}</div>
                    </div>
                  </div>
                </SheenWave>
              </div>
            </div>
          );
        })}

        {/* process-sparks — on-brand glyphs popping around the cards while we work */}
        {sparks.map((s) => (
          <div key={s.id} className={`sa-sc-spark ${s.kind}`} aria-hidden style={{ left: `${s.x}%`, top: `${s.y}%` }}>{SPARK_GLYPH[s.kind]}</div>
        ))}

        {/* the remainder of a big import — a quiet pill below the grid; fades as the grid squeezes away */}
        {settling && remainder > 0 && (
          <div style={{ position: "absolute", left: "50%", top: `calc(50% + ${(Math.ceil(n / 2) - 1) / 2 * GRID_ROW + 72}px)`, transform: "translate(-50%, -50%)", opacity: squeeze ? 0 : 1, transition: "opacity .4s ease", fontFamily: MONO, fontSize: 11.5, color: "#8a8178", background: "#efe7db", padding: "5px 13px", borderRadius: 20, whiteSpace: "nowrap" }}>
            + {remainder} more, tidied
          </div>
        )}

        {/* the done beat — records squeeze to centre and resolve into the big sage tick (hands to the Overview) */}
        {tick && (
          <div className="sa-sc-bigtick" style={{ position: "absolute", left: "50%", top: "50%", width: 116, height: 116, borderRadius: "50%", background: "#e9ede6", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, boxShadow: "0 14px 36px -18px rgba(58,28,20,.3)" }} aria-hidden>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
        )}
      </main>

      {/* slim bottom status bar — gold blinking pip · rotating status · smoothly-easing progress · count */}
      <div style={{ flexShrink: 0, height: 52, background: "rgba(253,250,245,.92)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", borderTop: "1px solid #e7ddd2", display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <style>{`@keyframes saScBlink{0%,100%{opacity:.4}50%{opacity:1}} .sa-sc-pip{animation:saScBlink 1.1s ease-in-out infinite;} @media(prefers-reduced-motion:reduce){.sa-sc-pip{animation:none;}}`}</style>
        <span className="sa-sc-pip" style={{ width: 9, height: 9, borderRadius: "50%", background: "#a8842c", flexShrink: 0 }} />
        <span key={txt} style={{ fontFamily: MONO, fontSize: 12.5, color: "#6a5c50", whiteSpace: "nowrap", minWidth: 168, animation: "saScAppear .25s ease" }}>{txt}</span>
        <span style={{ flex: 1, height: 5, borderRadius: 3, background: "#ece3d6", overflow: "hidden", maxWidth: 420 }}>
          <span style={{ display: "block", height: "100%", width: `${barW}%`, background: "linear-gradient(90deg,#8a9e88,#5a6e58)", borderRadius: 3, transition: barTransition }} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#9a8c80", marginLeft: "auto", whiteSpace: "nowrap" }}>{total > 0 ? `${countShown} / ${total}` : ""}</span>
      </div>
    </div>
  );
};

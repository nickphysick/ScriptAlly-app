/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §F — A PAGE'S "GETTING STARTED" GUIDE, built so any page can supply one (only the Contact list does).
 *
 *   the pill      in the top bar's page slot (`lib/barSlot`), left of the "?": five bars, "{Page}: Getting started", n/5
 *   the checklist a popover under the pill: the scout, the five items, "{n} of 5 done", "Don't show this again"
 *   the spotlight pressing an item SHOWS the control to press — a dim with a live hole and a step card — and never
 *                 performs the action (§F.3)
 *   the note      once a step is done, under the pill for 6s, with "Next: {item}"
 *
 * ⚠️ NOTHING HERE MARKS AN ITEM DONE. The page reads its own state and real saves and passes `done` in (§F.4); a row
 *    press only spotlights. A row that performed its action would be the mock's first bug: it ticked "open" only when
 *    its own button opened a card, and missed every row click.
 * ⚠️ THE SPOTLIGHT ENDS ON THE NEXT PRESS ANYWHERE, read on POINTERDOWN IN THE CAPTURE PHASE on the window — before any
 *    handler on the page can stop it, and without stopping it: a press on the target goes through the hole and does
 *    its own job. A bubble-phase `click` would be stopped by any control that stops propagation, and arrive late.
 * ⚠️ THE HOLE IS A CLIP PATH ON THE DIM (even-odd), so hit-testing passes through it to the target; a box-shadow "hole"
 *    would paint the same picture and leave the dim catching nothing outside it.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBarSlot } from "../../../lib/barSlot";
import {
  type ChecklistItem, type DoneMap, cardPlace, dimPath, doneCount, holeFor, nextUndone, scrollDelta,
} from "../../../lib/pageChecklist";
import "./pageChecklist.css";

export interface ChecklistTarget {
  el: HTMLElement | null;
  text: string;
  /** a key that does the same as the target (Query Centre v139: the Birds-eye tab's B), drawn as a key cap */
  keyCap?: string;
}

/**
 * Query Centre v139 — A STEP CARD THE PAGE DRIVES. Where an item is more than one press (the log journey's second card,
 * the practice query's six), the page hands its current card here and keeps it until the walkthrough ends: the dim,
 * the live hole and the card are this component's, the order of cards and every decision about them are the page's.
 * Unlike the one-press spotlight it does not end on the next press; Escape is the page's (`onEscape`).
 */
export interface FlowCard {
  /** changes whenever the card does, so it is placed afresh */
  id: string;
  target: () => HTMLElement | null;
  /** the eyebrow, whole: "Query Centre · Step 4 of 5 · 1 of 6" */
  kicker: string;
  title: string;
  body: React.ReactNode;
  /** "left": beside the target, to its left (a panel on the right); otherwise below, or above near the foot */
  place?: "auto" | "left";
  dots?: { k: number; n: number };
  /** replaces "← Back to checklist" (the practice's last card: "Clear Pip away") */
  action?: { label: string; onClick: () => void; attrs?: Record<string, string> };
  onBack: () => void;
  onEscape: () => void;
  /** presses outside the hole reach the page (the log journey's card: the drawer's own Cancel stays live) */
  passThrough?: boolean;
}

export interface PageChecklistProps<K extends string> {
  /** the page's name: "Contact list" */
  page: string;
  items: readonly ChecklistItem<K>[];
  done: DoneMap<K>;
  /** the account has seen it open once (the first visit's automatic open) */
  seen: boolean;
  /** "Hide it": retired for this account */
  hidden: boolean;
  /** the page's route is the one on screen (every page stays mounted) */
  active: boolean;
  /** the page has settled (its data loaded): the 1.4s before the first automatic open starts here */
  ready: boolean;
  /** the control to press for an item, and what to say about it, read at the moment of showing */
  targetFor: (key: K) => ChecklistTarget;
  onSeen: () => void;
  onHide: () => void;
  /** the scout beside the checklist's title */
  art?: string;
  /** Query Centre v139 — items that cannot be done yet, and the line each shows instead (no arrow, not pressable) */
  disabled?: Partial<Record<K, string>>;
  /** Query Centre v139 — with all done, the header says so and the pill stays (sage) for the rest of the visit */
  allDone?: { title: string; line: string };
  /** Query Centre v139 — the page's own card for a walkthrough of several presses (see `FlowCard`) */
  flow?: FlowCard | null;
  /** Query Centre v139 — an item the page walks through itself: return true and the checklist only closes */
  onStart?: (key: K) => boolean;
  /** Query Centre v139 — bumped by the page to open the checklist (a walkthrough left early returns to it) */
  openNonce?: number;
}

const AUTO_OPEN_MS = 1400;
const NOTE_MS = 6000;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const boxOf = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };

export function PageChecklist<K extends string>(p: PageChecklistProps<K>): React.ReactElement | null {
  const slot = useBarSlot();
  const { items, done } = p;
  const n = doneCount(items, done);
  const all = n === items.length;

  /* the pill shows its last tick, then goes: only when the fifth tick lands WHILE it is on screen */
  const [lingering, setLingering] = useState(false);
  const prevAll = useRef(all);
  useEffect(() => {
    if (all && !prevAll.current) { setLingering(true); const t = window.setTimeout(() => setLingering(false), 2400); prevAll.current = all; return () => window.clearTimeout(t); }
    prevAll.current = all;
    return undefined;
  }, [all]);

  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [spot, setSpot] = useState<K | null>(null);
  const [note, setNote] = useState<{ key: K } | null>(null);
  const [just, setJust] = useState<K | null>(null);
  const pillRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [pillBox, setPillBox] = useState<{ right: number; bottom: number } | null>(null);

  const shown = p.active && !p.hidden && (!all || lingering || !!p.allDone);

  /* the page asks for the checklist (a walkthrough left early) */
  const nonce = useRef(p.openNonce ?? 0);
  useEffect(() => {
    if ((p.openNonce ?? 0) === nonce.current) return;
    nonce.current = p.openNonce ?? 0;
    if (p.active && !p.hidden) { setNote(null); setSure(false); setOpen(true); }
  }, [p.openNonce, p.active, p.hidden]);

  /* leaving the route closes everything */
  useEffect(() => { if (!p.active || p.hidden) { setOpen(false); setSpot(null); setNote(null); setSure(false); } }, [p.active, p.hidden]);

  /* the first visit: open once, 1.4s after the page settles, so the writer sees where it lives */
  const { onSeen } = p;
  useEffect(() => {
    if (!shown || p.seen || !p.ready) return undefined;
    const t = window.setTimeout(() => { setOpen(true); onSeen(); }, AUTO_OPEN_MS);
    return () => window.clearTimeout(t);
  }, [shown, p.seen, p.ready, onSeen]);

  /* the pill's box, for the popover and the note, which are fixed to the window */
  const readPill = useCallback(() => {
    const el = pillRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.height > 0) setPillBox({ right: window.innerWidth - r.right, bottom: r.bottom });
  }, []);
  useLayoutEffect(() => {
    if (!open && !note) return undefined;
    readPill();
    window.addEventListener("resize", readPill);
    return () => window.removeEventListener("resize", readPill);
  }, [open, note, readPill]);

  /* the popover: an outside press closes it; Escape closes it before anything under it hears the key */
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || pillRef.current?.contains(t)) return;
      setOpen(false); setSure(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); setOpen(false); setSure(false); pillRef.current?.focus(); } };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, [open]);

  /* a tick landing: the note under the pill, and the row's short pop */
  const prevDone = useRef<DoneMap<K>>(done);
  useEffect(() => {
    const was = prevDone.current;
    prevDone.current = done;
    const fresh = items.find((it) => done[it.key] && !was[it.key]);
    if (!fresh || !p.active) return undefined;
    setJust(fresh.key);
    setNote({ key: fresh.key });
    const t = window.setTimeout(() => setNote(null), NOTE_MS);
    const j = window.setTimeout(() => setJust(null), 600);
    return () => { window.clearTimeout(t); window.clearTimeout(j); };
  }, [done, items, p.active]);

  /* ── the spotlight ── */
  const [geo, setGeo] = useState<{ path: string; hole: { left: number; top: number; width: number; height: number; r: number } } | null>(null);
  const [cardAt, setCardAt] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const spotText = useRef("");
  const spotKey = useRef<string | null>(null);
  const { targetFor } = p;

  const endSpot = useCallback(() => { setSpot(null); setGeo(null); setCardAt(null); }, []);
  const { onStart } = p;
  const startSpot = useCallback((k: K) => {
    if (onStart?.(k)) { setOpen(false); setSure(false); setNote(null); return; }
    const t = targetFor(k);
    if (!t.el) return;
    setOpen(false); setSure(false); setNote(null);
    /* the sheet scrolls first when the target is not wholly in view, so it sits ~150 from the top */
    const sc = t.el.closest<HTMLElement>(".wpg-scroll");
    if (sc) {
      const v = sc.getBoundingClientRect();
      const d = scrollDelta(boxOf(t.el), { top: v.top, bottom: v.bottom });
      if (d) sc.scrollTo({ top: Math.max(0, sc.scrollTop + d), behavior: "instant" as ScrollBehavior });
    }
    spotText.current = t.text;
    spotKey.current = t.keyCap ?? null;
    setSpot(k);
  }, [targetFor, onStart]);

  const draw = useCallback(() => {
    if (!spot) return;
    const t = targetFor(spot);
    if (!t.el) { endSpot(); return; }
    const b = boxOf(t.el);
    if (b.width === 0) { endSpot(); return; }
    const hole = holeFor(b);
    setGeo({ path: dimPath(window.innerWidth, window.innerHeight, hole), hole });
    const c = cardRef.current;
    if (c) setCardAt(cardPlace(hole, { width: c.offsetWidth, height: c.offsetHeight }, window.innerWidth, window.innerHeight));
  }, [spot, targetFor, endSpot]);

  useLayoutEffect(() => {
    if (!spot) return undefined;
    draw();
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    /* ends on the next press anywhere (capture phase, not stopped), Enter or Space, Escape */
    const down = (e: PointerEvent) => { if (cardRef.current?.contains(e.target as Node)) return; endSpot(); };
    const key = (e: KeyboardEvent) => {
      if (cardRef.current?.contains(e.target as Node)) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); endSpot(); }
      else if (e.key === "Enter" || e.key === " ") endSpot();
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on, true); window.removeEventListener("resize", on);
      window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true);
    };
  }, [spot, draw, endSpot]);
  /* the card's own size is known after its first paint: place it once more then */
  useLayoutEffect(() => { if (spot && geo && !cardAt) draw(); }, [spot, geo, cardAt, draw]);

  /* ── the page's own card (Query Centre v139) ──
     ⚠️ PLACED ONLY ONCE ITS TARGET HAS STOPPED MOVING. A panel slides in over ~300ms; a card placed on the first frame
     lands on top of the moving panel (the mock's own fix). The target's box is read every frame, and the card waits
     until two frames agree; after that it follows the target (scroll, resize, a panel growing). */
  const { flow } = p;
  const flowRef = useRef<HTMLDivElement | null>(null);
  const [fgeo, setFgeo] = useState<{ path: string; hole: { left: number; top: number; width: number; height: number; r: number } } | null>(null);
  const [fcard, setFcard] = useState<{ left: number; top: number; up: boolean; side: boolean } | null>(null);
  useLayoutEffect(() => {
    setFgeo(null); setFcard(null);
    if (!flow) return undefined;
    let raf = 0; let last = ""; let still = 0; let shownOnce = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = flow.target();
      const b = el ? boxOf(el) : null;
      if (!b || b.width === 0) { last = ""; still = 0; return; }
      const sig = `${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)},${Math.round(b.height)},${window.innerWidth},${window.innerHeight}`;
      if (sig === last) still += 1; else { still = 0; last = sig; if (shownOnce) return; }
      if (!shownOnce && still < 2) return;
      if (shownOnce && still !== 0) return;
      shownOnce = true;
      const hole = holeFor(b);
      setFgeo({ path: dimPath(window.innerWidth, window.innerHeight, hole), hole });
      const c = flowRef.current;
      const cw = c?.offsetWidth ?? 320; const ch = c?.offsetHeight ?? 160;
      if (flow.place === "left") {
        const left = Math.max(12, hole.left - 14 - cw);
        const top = Math.max(12, Math.min(hole.top + 40, window.innerHeight - 12 - ch));
        setFcard({ left, top, up: false, side: true });
      } else {
        setFcard({ ...cardPlace(hole, { width: cw, height: ch }, window.innerWidth, window.innerHeight), side: false });
      }
    };
    raf = requestAnimationFrame(tick);
    /* Escape is the page's; a press outside the card and the hole is swallowed unless the card passes it through */
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault(); flow.onEscape();
    };
    window.addEventListener("keydown", key, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", key, true); };
  }, [flow]);
  /* the card's size is known after its first paint: placed once more then */
  const flowId = flow?.id;
  useLayoutEffect(() => {
    if (!flow || !fgeo || !flowRef.current) return;
    const c = flowRef.current, hole = fgeo.hole;
    if (flow.place === "left") {
      setFcard({ left: Math.max(12, hole.left - 14 - c.offsetWidth), top: Math.max(12, Math.min(hole.top + 40, window.innerHeight - 12 - c.offsetHeight)), up: false, side: true });
    } else setFcard({ ...cardPlace(hole, { width: c.offsetWidth, height: c.offsetHeight }, window.innerWidth, window.innerHeight), side: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, fgeo?.path]);

  if (!slot || !shown) return null;

  const step = spot ? items.findIndex((i) => i.key === spot) + 1 : 0;
  const spotItem = spot ? items.find((i) => i.key === spot)! : null;
  const off: Partial<Record<K, string>> = p.disabled ?? {};
  const after = note ? nextUndone(items.filter((i) => !off[i.key]), done, note.key) : null;
  const finished = all && !!p.allDone;
  const bars = (cls: string) => (
    <span className={cls} aria-hidden="true">{items.map((it) => <i key={it.key} className={done[it.key] ? "on" : undefined} />)}</span>
  );

  const pill = (
    <button ref={pillRef} type="button" className={`pck-pill${open ? " open" : ""}${finished ? " all" : ""}`} data-pck="pill"
      aria-haspopup="dialog" aria-expanded={open} aria-label={`${p.page}: Getting started, ${n} of ${items.length} done`}
      onClick={() => { setNote(null); setSure(false); setOpen((o) => !o); }}>
      {bars("pck-pbars")}
      <span className="pck-pt"><b>{p.page}:</b> Getting started</span>
      <em className="pck-pn" data-pck="count">{finished ? "✓ " : ""}{n}/{items.length}</em>
    </button>
  );

  const popover = open && pillBox ? (
    <div ref={popRef} className="pck-pop" role="dialog" aria-label={`${p.page}: Getting started`} data-pck="popover"
      style={{ top: pillBox.bottom + 12, right: pillBox.right }}>
      <div className="pck-fr">
        <div className="pck-h">
          <div className="pck-ht">
            {p.art ? <img className="pck-art" src={p.art} alt="" width={40} height={40} /> : null}
            <h4><span className="pck-pg">{p.page}</span>{finished ? p.allDone!.title : "Getting started"}</h4>
            <button type="button" className="pck-x" aria-label="Hide for now" data-pck="close" onClick={() => { setOpen(false); setSure(false); pillRef.current?.focus(); }}>✕</button>
          </div>
          {bars("pck-bar")}
        </div>
        {sure ? (
          <div className="pck-sure" data-pck="sure">
            <b>Hide this for good?</b>
            <p>It won't come back, even for the things you haven't tried yet.</p>
            <div className="pck-sb">
              <button type="button" className="pck-keep" data-pck="keep" onClick={() => setSure(false)}>Keep it</button>
              <button type="button" className="pck-off2" data-pck="hide" onClick={() => { setOpen(false); setSure(false); p.onHide(); }}>Hide it</button>
            </div>
          </div>
        ) : (
          <>
            {finished ? <p className="pck-fin" data-pck="fin">{p.allDone!.line}</p> : null}
            <ul className="pck-l">
              {items.map((it) => (
                <li key={it.key} className={`${done[it.key] ? "is-done" : ""}${just === it.key ? " just" : ""}${off[it.key] && !done[it.key] ? " is-off" : ""}`} data-pck="item" data-k={it.key} data-done={done[it.key] ? "true" : "false"}
                  data-off={off[it.key] && !done[it.key] ? "true" : undefined}>
                  <button type="button" disabled={!!off[it.key] && !done[it.key]} onClick={() => startSpot(it.key)}>
                    <span className="pck-tick" aria-hidden="true">{done[it.key] ? "✓" : ""}</span>
                    <span className="pck-tx"><b>{it.title}</b><small>{off[it.key] && !done[it.key] ? off[it.key] : it.line}</small></span>
                    {off[it.key] && !done[it.key] ? <span /> : <span className="pck-go" aria-hidden="true">→</span>}
                  </button>
                </li>
              ))}
            </ul>
            <p className="pck-n"><i>{n} of {items.length} done</i>
              <button type="button" className="pck-off" data-pck="off" onClick={() => setSure(true)}>Don't show this again</button></p>
          </>
        )}
      </div>
    </div>
  ) : null;

  const spotlight = spot && spotItem ? (
    <div className="pck-spot" data-pck="spot">
      <div className="pck-dim" data-pck="dim" style={geo ? { clipPath: `path(evenodd, "${geo.path}")` } : { opacity: 0 }}
        data-hole={geo ? JSON.stringify(geo.hole) : undefined} />
      <div ref={cardRef} className={`pck-card${cardAt?.up ? " up" : ""}`} role="status" data-pck="card"
        style={cardAt ? { left: cardAt.left, top: cardAt.top } : { visibility: "hidden", left: 0, top: 0 }}>
        <span className="pck-ck">{p.page} · Step {step} of {items.length}</span>
        <b>{spotItem.title}</b>
        <span className="pck-ci">{spotText.current}</span>
        <span className="pck-cf">
          <button type="button" className="pck-back" data-pck="back" onClick={() => { endSpot(); setOpen(true); }}>← Back to checklist</button>
          {spotKey.current ? <kbd className="pck-kc" data-pck="keycap">{spotKey.current}</kbd> : null}
        </span>
      </div>
    </div>
  ) : null;

  /* the page's own card: the same dim and hole, its own words, dots and buttons */
  const flowEl = flow ? (
    <div className={`pck-spot${flow.passThrough ? " pck-thru" : ""}`} data-pck="flow" data-flow={flow.id}>
      <div className="pck-dim" data-pck="dim" style={fgeo ? { clipPath: `path(evenodd, "${fgeo.path}")` } : { opacity: 0 }}
        data-hole={fgeo ? JSON.stringify(fgeo.hole) : undefined} />
      <div ref={flowRef} className={`pck-card${fcard?.up ? " up" : ""}${fcard?.side ? " side" : ""}`} role="status" data-pck="card" data-flow-card={flow.id}
        style={fcard ? { left: fcard.left, top: fcard.top } : { visibility: "hidden", left: 0, top: 0 }}>
        <span className="pck-ck">{flow.kicker}</span>
        <b>{flow.title}</b>
        <span className="pck-ci">{flow.body}</span>
        <span className="pck-cf">
          {flow.action
            ? <button type="button" className="pck-cta" data-pck="flow-action" {...(flow.action.attrs ?? {})} onClick={flow.action.onClick}>{flow.action.label}</button>
            : <button type="button" className="pck-back" data-pck="back" onClick={flow.onBack}>← Back to checklist</button>}
          {flow.dots ? (
            <span className="pck-dots" aria-label={`${flow.dots.k} of ${flow.dots.n}`}>
              {Array.from({ length: flow.dots.n }, (_, i) => <i key={i} className={i < flow.dots!.k ? "on" : undefined} />)}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  ) : null;

  const noteEl = note && pillBox ? (
    <div className="pck-note" role="status" data-pck="note" style={{ top: pillBox.bottom + 12, right: pillBox.right }}>
      <span className="pck-ok" aria-hidden="true">✓</span>
      <span className="pck-nt"><b>{items.find((i) => i.key === note.key)?.title}</b>
        <small>{p.page} · {n} of {items.length} done</small></span>
      {after ? (
        <button type="button" data-pck="next" onClick={() => { const k = after.key; setNote(null); startSpot(k); }}>Next: {after.title} →</button>
      ) : <span className="pck-all" data-pck="all-done">All done</span>}
    </div>
  ) : null;

  return (
    <>
      {createPortal(pill, slot)}
      {(popover || spotlight || noteEl || flowEl) && createPortal(<div className={`pck-layer${reduced() ? " pck-still" : ""}`}>{popover}{spotlight}{flowEl}{noteEl}</div>, document.body)}
    </>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §F — A PAGE'S "GETTING STARTED" GUIDE, built so any page can supply one (the Contact list and the
 * Query Centre do). Help system v1 (Part C) re-dressed it:
 *
 *   the pill      in the top bar's page slot (`lib/barSlot`), left of the "?": a ring, "{Page} guide", "{n} of {N}";
 *                 finished in this visit it turns sage, "{Page}: Learned ✓", and is gone next visit
 *   the checklist a popover under the pill (in the one pop-up layer): the scout, the items with SKIP and LEARN MORE on
 *                 hover, "{n} of {N} done", "Don't show this again". It closes INTO the pill (it shrinks to the caret,
 *                 then the pill bumps); starting a step closes it at once
 *   the spotlight pressing an item SHOWS the control to press — a dim with a live hole and a step card — and never
 *                 performs the action (§F.3)
 *   the note      once a step is done, under the pill for 6s with a countdown line, paused by hover or focus, then it
 *                 folds into the pill; the last item's note is sage and stays until closed
 *   on its own    once per page, 1.2s after the page is ready, one per browser session, never over a task (`quiet`) or
 *                 on an empty page; a page skipped for the session, or first visited after a week, pulses instead
 *   the Help menu reads it through `lib/guideHub` (state, next item) and can continue, open or restore it
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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useBarSlot } from "../../../lib/barSlot";
import {
  type ChecklistItem, type DoneMap, cardPlace, dimPath, doneCount, holeFor, nextUndone, scrollDelta,
} from "../../../lib/pageChecklist";
import "./pageChecklist.css";
import { GuideRing } from "./GuideRing";
import {
  autoOpenedThisSession, clearGuide, markAutoOpened, publishGuide, readSkipped, stampVisit, useGuidesOff, writeSkipped,
} from "../../../lib/guideHub";
import { ITEM_ARTICLES, articleHref } from "../../../lib/helpArticles";
import { AnchoredPortal, useAnchoredPopover } from "../useAnchoredPopover";
import { claimTopbar, onTopbarClaim, releaseTopbar } from "../../../lib/popoverLayer";

export interface ChecklistTarget {
  el: HTMLElement | null;
  /** the card's sentence; a node where a control's name is set in bold (Query Centre v140 §G: "Press **Pin list** …") */
  text: React.ReactNode;
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
  /** Help system v1 C.1 — every item was done in an EARLIER visit: the pill does not come back by itself. Omitted, it is
   *  read once, the first time the page is ready. */
  finished?: boolean;
  /** Help system v1 C.3 — a task is open (a drawer, a panel, a deep link, a search holding text): no automatic open, for
   *  the rest of this visit */
  quiet?: boolean;
  /** Help system v1 C.3 — the page's empty state: the pill shows, nothing opens by itself */
  empty?: boolean;
  /** Help system v1 B — the Help menu's "Show the page guide again": clear the page's "hidden" */
  onUnhide?: () => void;
  /** Help system v1 C.4 — the next unfinished guide, in sidebar order, for the last note ("Your next guide is …") */
  nextGuide?: string | null;
}

const AUTO_OPEN_MS = 1200;
export const NOTE_MS = 6000;
const SHRINK_MS = 380;
const FOLD_MS = 450;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const boxOf = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
/** restart a one-shot class animation on an element (the pill's bump and pulse) */
const replay = (el: HTMLElement | null, cls: string, ms: number) => {
  if (!el || reduced()) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
};

export function PageChecklist<K extends string>(p: PageChecklistProps<K>): React.ReactElement | null {
  const slot = useBarSlot();
  const navigate = useNavigate();
  const off = useGuidesOff();
  const { items, done, page } = p;

  /* ── C.5 skips: per page, on this device; a real save outranks a skip ── */
  const [skipped, setSkipped] = useState<string[]>(() => readSkipped(page));
  const isSkip = (k: K) => !done[k] && skipped.includes(k);
  const eff = useMemo(() => {
    const m: DoneMap<K> = {};
    for (const it of items) if (done[it.key] || skipped.includes(it.key)) m[it.key] = true;
    return m;
  }, [items, done, skipped]);
  const n = doneCount(items, eff);
  const all = n === items.length;
  const setSkip = (k: K, on: boolean) => {
    const next = on ? [...new Set([...skipped, k])] : skipped.filter((x) => x !== k);
    setSkipped(next);
    writeSkipped(page, next);
  };

  /* ── C.1 finished: in an EARLIER visit the pill does not come back; finished in THIS visit it stays, sage ── */
  const atLoad = useRef<boolean | null>(null);
  if (atLoad.current === null && p.ready) atLoad.current = all;
  const finishedBefore = p.finished ?? !!atLoad.current;

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sure, setSure] = useState(false);
  const [spot, setSpot] = useState<K | null>(null);
  const [note, setNote] = useState<{ key: K; final: boolean } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [just, setJust] = useState<K | null>(null);
  /* opened from the Help menu (restore, or a finished guide opened again): the pill shows for the rest of the visit */
  const [reopened, setReopened] = useState(false);
  const [said, setSaid] = useState("");
  const pillRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  const shown = p.active && !off && (!p.hidden || reopened) && (!finishedBefore || reopened);

  const say = (t: string) => { setSaid(""); window.setTimeout(() => setSaid(t), 30); };

  /* the page asks for the checklist (a walkthrough left early) */
  const nonce = useRef(p.openNonce ?? 0);
  useEffect(() => {
    if ((p.openNonce ?? 0) === nonce.current) return;
    nonce.current = p.openNonce ?? 0;
    if (p.active && !p.hidden) { setNote(null); setSure(false); setOpen(true); }
  }, [p.openNonce, p.active, p.hidden]);

  /* leaving the route closes everything, and a new visit starts */
  const visit = useRef({ pulsed: false, quietSeen: false });
  useEffect(() => {
    if (!p.active || p.hidden && !reopened) { setOpen(false); setClosing(false); setSpot(null); setNote(null); setSure(false); }
    if (!p.active) { visit.current = { pulsed: false, quietSeen: false }; setReopened(false); }
  }, [p.active, p.hidden, reopened]);

  /* ── C.2 the bump and the pulse ── */
  const bump = useCallback(() => replay(pillRef.current, "bump", 450), []);
  const pulse = useCallback(() => {
    if (visit.current.pulsed) return;
    visit.current.pulsed = true;
    replay(pillRef.current, "pulse", 3300);
  }, []);

  /* the first visit after seven days with items left: one pulse (the stamp is written once per visit) */
  const stamped = useRef(false);
  useEffect(() => {
    if (!p.active) { stamped.current = false; return undefined; }
    if (stamped.current || !shown || !p.ready) return undefined;
    stamped.current = true;
    const long = stampVisit(page);
    if (long && !all) { const t = window.setTimeout(pulse, 600); return () => window.clearTimeout(t); }
    return undefined;
  }, [p.active, shown, p.ready, page, all, pulse]);

  /* ── C.3 when it opens by itself: once per page, 1.2s after the page is ready, one per browser session, never over a
     task (`quiet`, which also holds it off for the rest of this visit) and never on an empty page ── */
  if (p.active && p.quiet) visit.current.quietSeen = true;
  const { onSeen } = p;
  useEffect(() => {
    if (!shown || p.seen || !p.ready || all || p.empty) return undefined;
    if (p.quiet || visit.current.quietSeen) return undefined;
    if (autoOpenedThisSession()) { const t = window.setTimeout(pulse, AUTO_OPEN_MS); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => {
      if (visit.current.quietSeen || autoOpenedThisSession()) return;
      markAutoOpened();
      setOpen(true);
      onSeen();
    }, AUTO_OPEN_MS);
    return () => window.clearTimeout(t);
  }, [shown, p.seen, p.ready, p.quiet, p.empty, all, onSeen, pulse]);

  /* Help system v1, Part A — the popover and the note live in the one pop-up layer, placed from the pill; one top-bar
     pop-up at a time (opening the Help menu closes this, and this closes it) */
  const popPlace = useAnchoredPopover(pillRef, popRef, open, { align: "end", gap: 12 });
  const notePlace = useAnchoredPopover(pillRef, noteRef, !!note, { align: "end", gap: 12 });
  useEffect(() => { if (open) claimTopbar("checklist"); else releaseTopbar("checklist"); }, [open]);
  useEffect(() => onTopbarClaim((id) => { if (id !== "checklist") { setOpen(false); setClosing(false); setSure(false); setNote(null); } }), []);

  /* ── C.2 close into the pill: the popover shrinks to the caret, then the pill bumps. Starting a step does not. ── */
  const closePop = useCallback((focusPill: boolean) => {
    setSure(false);
    if (focusPill) pillRef.current?.focus();
    if (reduced() || !pillRef.current) { setOpen(false); return; }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); bump(); }, SHRINK_MS);
  }, [bump]);

  /* the popover: an outside press closes it; Escape closes it before anything under it hears the key */
  useEffect(() => {
    if (!open || closing) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || pillRef.current?.contains(t)) return;
      closePop(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); closePop(true); } };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); };
  }, [open, closing, closePop]);
  /* C.6 — the checklist is a dialog: focus moves in when it opens */
  useEffect(() => { if (open && !closing) requestAnimationFrame(() => popRef.current?.focus({ preventScroll: true })); }, [open, closing]);

  /* ── C.4 a tick landing: the note under the pill, the row's short pop, the live region ── */
  const doneSig = items.filter((it) => done[it.key]).map((it) => it.key).join(",");
  const prevDone = useRef<string | null>(null);
  const prevAll = useRef<boolean | null>(null);
  useEffect(() => {
    const was = prevDone.current;
    prevDone.current = doneSig;
    const wasAll = prevAll.current;
    prevAll.current = all;
    /* ⚠️ THE BASELINE IS TAKEN ONCE THE PAGE IS READY: work credited as the data arrives (an agent already on file, a
       query already logged) is not a tick landing, and must not raise a note on arrival */
    if (was === null || wasAll === null || !p.active || !p.ready) return;
    const before = new Set(was ? was.split(",") : []);
    const fresh = items.find((it) => done[it.key] && !before.has(it.key));
    const finishedNow = all && !wasAll;
    if (!fresh && !finishedNow) return;
    if (fresh) { setJust(fresh.key); window.setTimeout(() => setJust(null), 600); say(`${fresh.title} done. ${n} of ${items.length}.`); }
    setLeaving(false); setPaused(false);
    setNote({ key: (fresh?.key ?? items[items.length - 1].key) as K, final: finishedNow });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSig, all, p.active, p.ready]);

  /* the note's clock: 6s, paused while hovered or focused; at 0 it folds up into the pill, which bumps.
     The last item's note has no clock: it stays until closed. */
  const foldNote = useCallback(() => {
    if (reduced()) { setNote(null); return; }
    setLeaving(true);
    window.setTimeout(() => { setNote(null); setLeaving(false); bump(); }, FOLD_MS);
  }, [bump]);
  const noteKey = note ? `${note.key}:${note.final}` : "";
  const remain = useRef(NOTE_MS);
  useEffect(() => { remain.current = NOTE_MS; }, [noteKey]);
  useEffect(() => {
    if (!note || note.final || leaving || paused) return undefined;
    let raf = 0;
    const start = performance.now(), from = remain.current;
    const tick = () => {
      const left = from - (performance.now() - start);
      remain.current = Math.max(0, left);
      if (clockRef.current) clockRef.current.style.transform = `scaleX(${Math.max(0, left / NOTE_MS)})`;
      if (left <= 0) { foldNote(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [noteKey, note, leaving, paused, foldNote]);
  /* Escape closes the note at once — when nothing nearer the reader answered the key first */
  useEffect(() => {
    if (!note || open) return undefined;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) setNote(null); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [note, open]);

  /* ── the spotlight ── */
  const [geo, setGeo] = useState<{ path: string; hole: { left: number; top: number; width: number; height: number; r: number } } | null>(null);
  const [cardAt, setCardAt] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const spotText = useRef<React.ReactNode>("");
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


  /* ── Part B: what the Help menu knows about this guide, and what it can ask of it ── */
  const offItems: Partial<Record<K, string>> = p.disabled ?? {};
  const nextItem = nextUndone(items.filter((i) => !offItems[i.key]), eff);
  const startRef = useRef(startSpot);
  startRef.current = startSpot;
  const nextRef = useRef(nextItem);
  nextRef.current = nextItem;
  const { onUnhide } = p;
  const unhideRef = useRef(onUnhide);
  unhideRef.current = onUnhide;
  const cmds = useMemo(() => ({
    continueNext: () => { const nx = nextRef.current; setNote(null); if (nx) startRef.current(nx.key); },
    open: () => { setReopened(true); setNote(null); setSure(false); setOpen(true); },
    restore: () => { setReopened(true); unhideRef.current?.(); setNote(null); setSure(false); setOpen(true); },
  }), []);
  const hubState = p.hidden && !reopened ? "hidden" : finishedBefore || all ? "finished" : "live";
  useEffect(() => {
    if (!p.active) return undefined;
    publishGuide({ page, n, total: items.length, next: nextItem ? { key: nextItem.key, title: nextItem.title } : null, state: hubState }, cmds);
    return undefined;
  }, [p.active, page, n, items.length, nextItem, hubState, cmds]);
  useEffect(() => { if (!p.active) clearGuide(page); }, [p.active, page]);
  useEffect(() => () => clearGuide(page), [page]);

  if (!slot || !shown) return null;

  const step = spot ? items.findIndex((i) => i.key === spot) + 1 : 0;
  const spotItem = spot ? items.find((i) => i.key === spot)! : null;
  const off2 = offItems;
  const after = note && !note.final ? nextUndone(items.filter((i) => !off2[i.key]), eff, note.key) : null;
  const finished = all;
  const learnHref = (k: K) => articleHref(ITEM_ARTICLES[page]?.[k]);
  const bars = (cls: string) => (
    <span className={cls} aria-hidden="true">{items.map((it) => <i key={it.key} className={eff[it.key] ? "on" : undefined} />)}</span>
  );

  /* ── C.1 the pill: the ring, "{Page} guide", "{n} of {N}"; finished this visit: sage, "{Page}: Learned ✓" ── */
  const pill = (
    <button ref={pillRef} type="button" className={`pck-pill${open && !closing ? " open" : ""}${finished ? " all" : ""}`} data-pck="pill"
      data-state={finished ? "done" : "live"}
      aria-haspopup="dialog" aria-expanded={open && !closing}
      aria-label={finished ? `${page} guide: learned` : `${page} guide, ${n} of ${items.length} done`}
      onClick={() => { setNote(null); if (open) closePop(false); else { setSure(false); setOpen(true); } }}>
      <GuideRing n={n} total={items.length} size={24} colour={finished ? "#4b6151" : "#a2452a"} track="#ffffff" className="pck-ring" />
      {finished
        ? <span className="pck-pt"><b>{page}:</b> Learned</span>
        : <span className="pck-pt"><b>{page}</b> guide</span>}
      <em className="pck-pn" data-pck="count">{finished ? "✓" : `${n} of ${items.length}`}</em>
    </button>
  );

  const popover = open ? (
    <div ref={popRef} tabIndex={-1} className={`pck-pop${closing ? " shrink" : ""}${reduced() ? " pck-still" : ""}`} role="dialog"
      aria-label={`${page}: Getting started`} data-pck="popover" style={popPlace.style}>
      <div className="pck-fr">
        <div className="pck-h">
          <div className="pck-ht">
            {p.art ? <img className="pck-art" src={p.art} alt="" width={40} height={40} /> : null}
            <h4><span className="pck-pg">{page}</span>{finished && p.allDone ? p.allDone.title : "Getting started"}</h4>
            <button type="button" className="pck-x" aria-label="Hide for now" data-pck="close" onClick={() => closePop(true)}>✕</button>
          </div>
          {bars("pck-bar")}
        </div>
        {sure ? (
          <div className="pck-sure" data-pck="sure">
            <b>Hide this for good?</b>
            <p>It won't come back, even for the things you haven't tried yet.</p>
            <div className="pck-sb">
              <button type="button" className="pck-keep" data-pck="keep" onClick={() => setSure(false)}>Keep it</button>
              <button type="button" className="pck-off2" data-pck="hide" onClick={() => { setOpen(false); setSure(false); setReopened(false); p.onHide(); }}>Hide it</button>
            </div>
          </div>
        ) : (
          <>
            {finished && p.allDone ? <p className="pck-fin" data-pck="fin">{p.allDone.line}</p> : null}
            <ul className="pck-l">
              {items.map((it) => {
                const skip = isSkip(it.key);
                const realDone = !!done[it.key];
                const blocked = !!off2[it.key] && !eff[it.key];
                return (
                  <li key={it.key} className={`${eff[it.key] ? "is-done" : ""}${skip ? " is-skip" : ""}${just === it.key ? " just" : ""}${blocked ? " is-off" : ""}`}
                    data-pck="item" data-k={it.key} data-done={eff[it.key] ? "true" : "false"} data-skipped={skip ? "true" : undefined}
                    data-off={blocked ? "true" : undefined}>
                    <button type="button" disabled={blocked} onClick={() => startSpot(it.key)}>
                      <span className="pck-tick" aria-hidden="true">{realDone ? "✓" : skip ? "–" : ""}</span>
                      <span className="pck-tx"><b>{it.title}{skip ? <span className="pck-sk"> (skipped)</span> : null}</b><small>{blocked ? off2[it.key] : it.line}</small></span>
                      {blocked ? <span /> : <span className="pck-go" aria-hidden="true">→</span>}
                    </button>
                    {/* C.5 — Skip and Learn more, over the row's top right on hover or focus; they never move anything */}
                    <span className="pck-acts" data-pck="acts">
                      {skip ? (
                        <button type="button" className="pck-act" data-pck="undo" onClick={() => setSkip(it.key, false)}>Undo</button>
                      ) : (
                        <>
                          {!eff[it.key] && !blocked && (
                            <button type="button" className="pck-act" data-pck="skip"
                              onClick={() => { setSkip(it.key, true); say(`${it.title} skipped. ${n + 1} of ${items.length}.`); }}>SKIP</button>
                          )}
                          <button type="button" className="pck-act" data-pck="learn" onClick={() => { setOpen(false); navigate(learnHref(it.key)); }}>LEARN MORE</button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
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

  const noteItem = note ? items.find((i) => i.key === note.key) : null;
  const noteEl = note ? (
    note.final ? (
      <div ref={noteRef} className={`pck-note pck-note--final${leaving ? " leave" : ""}${reduced() ? " pck-still" : ""}`} role="status" data-pck="note"
        data-final="true" style={notePlace.style}>
        <span className="pck-ok" aria-hidden="true">✓</span>
        <span className="pck-nt"><b>{page} learned</b>
          <small className="pck-nl">All {items.length} steps done. {p.nextGuide ? `Your next guide is the ${p.nextGuide}.` : "That's every guide done."}</small>
          {p.nextGuide ? <button type="button" data-pck="guides" onClick={() => { setNote(null); navigate("/help"); }}>See your guides →</button> : null}
        </span>
        <button type="button" className="pck-nx" aria-label="Close" data-pck="note-close" onClick={() => setNote(null)}>✕</button>
      </div>
    ) : (
      <div ref={noteRef} className={`pck-note${leaving ? " leave" : ""}${paused ? " paused" : ""}${reduced() ? " pck-still" : ""}`} role="status" data-pck="note"
        style={notePlace.style}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => { if (!noteRef.current?.contains(document.activeElement)) setPaused(false); }}
        onFocus={() => setPaused(true)} onBlur={(e) => { if (!noteRef.current?.contains(e.relatedTarget as Node) && !noteRef.current?.matches(":hover")) setPaused(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setNote(null); pillRef.current?.focus(); } }}>
        <span className="pck-ok" aria-hidden="true">✓</span>
        <span className="pck-nt"><b>{noteItem?.title}</b>
          <small>{page} · {n} of {items.length} done</small></span>
        {after ? (
          <button type="button" data-pck="next" onClick={() => { const k = after.key; setNote(null); startSpot(k); }}>Next: {after.title} →</button>
        ) : <span className="pck-all" data-pck="all-done">All done</span>}
        <button type="button" className="pck-nx" aria-label="Close" data-pck="note-close" onClick={() => setNote(null)}>✕</button>
        <span ref={clockRef} className="pck-clock" aria-hidden="true" data-pck="clock" />
      </div>
    )
  ) : null;

  return (
    <>
      {createPortal(<>{pill}<span className="pck-sr" role="status" aria-live="polite" data-pck="live">{said}</span></>, slot)}
      {(popover || noteEl) && <AnchoredPortal>{popover}{noteEl}</AnchoredPortal>}
      {(spotlight || flowEl) && createPortal(<div className={`pck-layer${reduced() ? " pck-still" : ""}`}>{spotlight}{flowEl}</div>, document.body)}
    </>
  );
}

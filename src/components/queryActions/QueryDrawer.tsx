/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY DRAWER — "every page finishes in the query drawer" (brief K1). Mounted ONCE, by App,
 * and opened only through `openQueryDrawer(…)` (lib/queryActions/drawerStore).
 *
 * This file owns the pipeline around a journey: which journey is open, switching journeys in
 * place (D5's "They said no" → D2 with Pass), the save — snapshot, write, undo — and where the
 * result goes: the undo bar, or a task row's own receipt strip (K2).
 *
 * ⚠️ AND IT OWNS PARKING (Agent card v1 §6.3–§6.5). A journey put away with answers stays MOUNTED
 * and hidden — as a failed save already did — so Resume in the same tab hands it back with its
 * answers and its step intact; only a reload drops the instance, and then the journey is mounted
 * again from its own snapshot. The parked journey and the open one are told apart by the store's
 * `instance`: a park keeps it, a resume reuses it, a new door gets a new one.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../../lib/db";
import {
  closeQueryDrawer, currentClash, currentDrawerRequest, currentParked, discardParked, parkQueryDrawer, restoreParked,
  showUndoBar, subscribeDrawer, subscribeParked,
  type DrawerMode, type DrawerPreset, type OpenRequest, type ParkedJourney,
} from "../../lib/queryActions/drawerStore";
import { journeyDoing, journeyTitle } from "../../lib/queryActions/parking";
import { packagesHeldBy, packagesIn, restoreSnapshot, takeSnapshot } from "../../lib/queryActions/snapshot";
import { todayDay } from "../../lib/queryActions/dates";
import { DrawerContext, initialsOf } from "./controls";
import { peekOffered, setDockPeek, useDockPeek } from "../../lib/queryActions/dockPeek";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { DrawerShell, type ShellState } from "./DrawerShell";
import { ParkedChip } from "./ParkedChip";
import type { JourneyView } from "./journey";
import { LogJourney } from "./journeys/LogJourney";
import { ResponseJourney } from "./journeys/ResponseJourney";
import { SentJourney } from "./journeys/SentJourney";
import { NudgeJourney } from "./journeys/NudgeJourney";
import { CloseJourney } from "./journeys/CloseJourney";
import { OfferJourney } from "./journeys/OfferJourney";
import { EditJourney } from "./journeys/EditJourney";
import "./queryDrawer.css";

export interface JourneyProps {
  req: OpenRequest;
  today: Date;
  /** The journey hands its view up on every render. */
  children: (view: JourneyView, initialStep?: number) => React.ReactElement;
  /** Swap to another journey in place, keeping the same query. */
  switchTo: (mode: DrawerMode, preset?: DrawerPreset) => void;
  /** v1.1 — a journey opened with no query (the sidebar's "Record a response") picks one. */
  pickQuery: (queryId: string) => void;
}

const JOURNEYS: Partial<Record<DrawerMode, React.ComponentType<JourneyProps>>> = {
  log: LogJourney,
  resp: ResponseJourney,
  sent: SentJourney,
  nudge: NudgeJourney,
  close: CloseJourney,
  offer: OfferJourney,
  edit: EditJourney,
};

/* The measurement harness opens the drawer the way every door does, through the store. Development
   builds only: the MODE literal is replaced at build time, so a production bundle carries none of it. */
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  (window as unknown as { __saQueryDrawer?: unknown }).__saQueryDrawer = { open: (r: OpenRequest) => import("../../lib/queryActions/drawerStore").then((m) => m.openQueryDrawer(r)) };
}

const reduced = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The agent a journey is for — the query's, the door's, or (Log) the one chosen inside it. */
const agentIdOf = (r: OpenRequest, queries: { id: string; agentId: string }[], answers?: unknown): string | undefined => {
  const q = r.queryId ? queries.find((x) => x.id === r.queryId) : undefined;
  const chosen = answers && typeof answers === "object" && typeof (answers as { agentId?: unknown }).agentId === "string"
    ? (answers as { agentId: string }).agentId : undefined;
  return q?.agentId ?? r.agentId ?? chosen;
};

export function QueryDrawer() {
  const db = useScriptAllyDb();
  const [req, setReq] = useState<OpenRequest | null>(currentDrawerRequest());
  const [parked, setParked] = useState<ParkedJourney | null>(currentParked());
  const [clash, setClash] = useState<OpenRequest | null>(currentClash());
  const [open, setOpen] = useState(false);
  /* A failed save keeps the journey MOUNTED, hidden, so "Try again" reopens it exactly as entered. */
  const [hidden, setHidden] = useState(false);
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [gen, setGen] = useState(0);
  const savingRef = useRef(false);
  const viewRef = useRef<JourneyView | null>(null);
  const shellRef = useRef<ShellState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeDrawer((r) => {
    setReq(r);
    setHidden(false);
    setOpenCal(null);
    if (r) { setOpen(false); requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true))); }
    else setOpen(false);
  }), []);
  useEffect(() => subscribeParked((p, c) => { setParked(p); setClash(c); }), []);
  /* a journey parked before a reload comes back as its chip (§6.4) */
  useEffect(() => { restoreParked(); }, []);
  /* …and is dropped silently if its agent or its query has gone — once the data can say so */
  useEffect(() => {
    if (!parked || parked.live || !db.collectionsReady) return;
    const r = parked.req;
    const gone = (r.queryId && !db.queries.some((x) => x.id === r.queryId))
      || (() => { const aid = agentIdOf(r, db.queries, parked.answers); return !!aid && !db.agents.some((a) => a.id === aid); })();
    if (gone) discardParked();
  }, [parked, db.collectionsReady, db.queries, db.agents]);

  /* the journey on stage: the open one, else the one parked in this tab (mounted, hidden) */
  const active = req ?? (parked?.live ? parked.req : null);
  const parkedAway = !req && !!parked?.live;
  const today = useMemo(() => todayDay(), [gen, active?.instance]);

  const close = useCallback(() => {
    const r = currentDrawerRequest();
    setOpen(false);
    /* ⚠️ ONLY THE REQUEST THAT ASKED TO CLOSE IS CLOSED. The slide-out takes 240ms, and a drawer
       opened inside that window (a door clicked straight after Cancel) is a NEW request: closing
       whatever is current then shut the new one as it arrived (packages-journey, 28 Sep). */
    window.setTimeout(() => { if (currentDrawerRequest() === r) closeQueryDrawer(); r?.onCancel?.(); }, 240);
  }, []);

  const switchTo = useCallback((mode: DrawerMode, preset?: DrawerPreset) => {
    setReq((r) => (r ? { ...r, mode, preset } : r));
    setGen((g) => g + 1);
  }, []);
  const pickQuery = useCallback((queryId: string) => {
    setReq((r) => (r ? { ...r, queryId } : r));
    setGen((g) => g + 1);
  }, []);

  /**
   * PARK (decision 8): the drawer shrinks into the chip's place (280ms) and the journey stays
   * mounted, hidden; the store keeps it, and a reload keeps its snapshot. Whatever was docked comes
   * back, as on a cancel — nothing was saved (`onDock(false)` when the drawer goes).
   */
  const parkingRef = useRef(false);
  const park = useCallback(async () => {
    const r = req;
    const v = viewRef.current;
    const st = shellRef.current;
    if (!r || !v || !st || parkingRef.current) return;
    parkingRef.current = true;
    const answers = v.snapshot?.() ?? null;
    const q = r.queryId ? db.queries.find((x) => x.id === r.queryId) : undefined;
    const aid = agentIdOf(r, db.queries, answers);
    const a = aid ? db.agents.find((x) => x.id === aid) : undefined;
    const drawer = rootRef.current?.querySelector<HTMLElement>(".qad-drawer");
    let anim: Animation | null = null;
    if (drawer && !reduced() && typeof drawer.animate === "function") {
      const b = drawer.getBoundingClientRect();
      const w = Math.min(422, window.innerWidth - 40);
      const h = 54;
      const tx = window.innerWidth - 20 - w - b.left;
      const ty = window.innerHeight - 20 - h - b.top;
      anim = drawer.animate(
        [{ transformOrigin: "0 0", transform: "none", opacity: 1 }, { transformOrigin: "0 0", transform: `translate(${tx}px,${ty}px) scale(${w / b.width},${h / b.height})`, opacity: 0 }],
        { duration: 280, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
      );
      setOpen(false);
      await anim.finished.catch(() => undefined);
    }
    parkQueryDrawer({
      req: r, step: st.step, seen: st.seen, of: st.of, answers,
      title: journeyTitle(r.mode, q?.status), doing: journeyDoing(r.mode, q?.status),
      name: (a?.name || a?.agency || "").trim(),
    });
    /* the instance is hidden by now; take the shrink off it so a resume slides in from the side */
    if (anim) { const done = anim; requestAnimationFrame(() => done.cancel()); }
    parkingRef.current = false;
  }, [req, db.queries, db.agents]);

  /** "← name" and the dock chip: park with answers, cancel without (decision 8). */
  const backToCard = useCallback(() => {
    if (viewRef.current?.dirty) void park();
    else close();
  }, [park, close]);

  const runSave = useCallback(async (view: JourneyView) => {
    if (!req || savingRef.current) return;
    const uid = db.currentUser?.id;
    if (!uid) return;
    savingRef.current = true;
    const r = req;
    try {
      const snap = await takeSnapshot(uid, view.touched());
      const out = await view.commit();
      /* the stale-stamp rule (Nick, 28 Sep): after an undo, every package the query pointed at before
         OR after the save is reconciled — lifted if nothing points at it now, stamped if something does */
      const undo = async () => {
        const after = await packagesHeldBy(uid, snap.queryIds);
        await restoreSnapshot(snap);
        await db.reconcileStamps([...packagesIn(snap), ...after]);
      };
      setOpen(false);
      window.setTimeout(() => closeQueryDrawer(), 240);
      if (r.receipt && r.onSaved) {
        r.onSaved({ mode: r.mode, queryId: out.queryId, message: out.message, sub: out.sub, undo });
      } else {
        r.onSaved?.({ mode: r.mode, queryId: out.queryId, message: out.message, sub: out.sub, undo });
        showUndoBar({ message: out.message, sub: out.sub, undo, again: out.again });
      }
    } catch (e) {
      console.error("[query drawer] save failed", e);
      setHidden(true);
      setOpen(false);
      showUndoBar({
        message: "Couldn't save",
        sub: "NOTHING WAS CHANGED · YOUR ANSWERS ARE KEPT",
        failed: { retry: () => { setHidden(false); requestAnimationFrame(() => setOpen(true)); } },
      });
    } finally {
      savingRef.current = false;
    }
  }, [req, db.currentUser?.id]);

  /* Opened from a card, the card DOCKS while the drawer is open — it steps out of the way and its
     chip waits beside the drawer, and it comes back on save, cancel or park (§6.1). The Query
     Centre's card listens to the body class; a card that passed `onDock` is told directly, with
     false the moment the drawer is not on screen, whatever the reason. */
  const docked = !!req?.dock && !hidden;
  useEffect(() => {
    document.body.classList.toggle("qad-docked", docked);
    return () => { document.body.classList.remove("qad-docked"); };
  }, [docked]);
  /* v13 §7 — the chip expands the docked card above itself, read-only, while the drawer stays open.
     Offered only where there is room beside the drawer (≥1100px of window); below that the chip keeps
     Agent card v1's behaviour. The peek never outlives the dock, and Escape folds it before the
     drawer hears the key (ESC_LEVEL.dockPeek sits above the drawer's own layer). */
  const peek = useDockPeek();
  const [wide, setWide] = useState(() => typeof window !== "undefined" && peekOffered(window.innerWidth));
  useEffect(() => {
    const on = () => setWide(peekOffered(window.innerWidth));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  useEffect(() => { if (!docked || !wide) setDockPeek(false); }, [docked, wide]);
  useEffect(() => () => setDockPeek(false), []);
  useEffect(() => {
    document.body.classList.toggle("qad-peek", docked && peek);
    return () => { document.body.classList.remove("qad-peek"); };
  }, [docked, peek]);
  useEscapeLayer(docked && peek, () => setDockPeek(false), ESC_LEVEL.dockPeek);
  const onChip = useCallback(() => {
    if (wide) setDockPeek(!peek);
    else backToCard();
  }, [wide, peek, backToCard]);
  const dockedTo = useRef<((d: boolean) => void) | undefined>(undefined);
  useEffect(() => {
    const cb = docked ? req?.onDock : undefined;
    if (dockedTo.current && dockedTo.current !== cb) dockedTo.current(false);
    if (cb && dockedTo.current !== cb) cb(true);
    dockedTo.current = cb;
  }, [docked, req?.onDock]);

  /* the clash's second line names what the door would start, for whom */
  const next = useMemo(() => {
    if (!clash) return null;
    const q = clash.queryId ? db.queries.find((x) => x.id === clash.queryId) : undefined;
    const aid = agentIdOf(clash, db.queries);
    const a = aid ? db.agents.find((x) => x.id === aid) : undefined;
    return { doing: journeyDoing(clash.mode, q?.status), name: (a?.name || a?.agency || "").trim() };
  }, [clash, db.queries, db.agents]);

  const chip = parked && !req ? <ParkedChip key={parked.req.instance ?? "restored"} parked={parked} clash={clash} next={next} /> : null;
  if (!active) return chip;
  const J = JOURNEYS[active.mode];
  if (!J) return chip;

  return (
    <>
      {createPortal(
        <DrawerContext.Provider value={{ today, openCal, setOpenCal }}>
          <div ref={rootRef} className={`qad-root${open ? " is-open" : ""}`} data-qad-root
            style={hidden || parkedAway ? { display: "none" } : undefined}>
            <J key={`${active.instance ?? 0}-${active.mode}-${gen}`} req={active} today={today} switchTo={switchTo} pickQuery={pickQuery}>
              {(view, initialStep) => {
                viewRef.current = view;
                return (
                  <DrawerShell view={view} mode={active.mode} open={open && !hidden && !parkedAway}
                    initialStep={active.resume?.step ?? initialStep ?? active.preset?.step} initialSeen={active.resume?.seen}
                    from={req?.dock?.name ?? null} stateRef={shellRef}
                    onCancel={close} onPark={() => void park()} onSave={() => runSave(view)} />
                );
              }}
            </J>
          </div>
          {req?.dock && !hidden ? (
            wide ? (
              <button type="button" className={`qad-dock qad-dock--peek${peek ? " open" : ""}`} data-qad-dock data-peek={peek ? "open" : "shut"}
                onClick={onChip} aria-expanded={peek} aria-label={`${peek ? "Hide" : "Show"} ${req.dock.name}'s card`}>
                <span className="qad-av">{initialsOf(req.dock.name)}</span>
                <span className="qad-dk-tx"><b>{req.dock.name}</b>{req.dock.status ? <small>{req.dock.status}</small> : null}</span>
                <span className="qad-dk" data-qad-dock-label>{peek ? "Hide card" : "Show card"}
                  {/* drawn, not typed: ⌃ and ⌄ are in neither the mono face nor Special Elite */}
                  <svg className="qad-dk-chev" viewBox="0 0 10 6" width="9" height="6" aria-hidden="true"><path d={peek ? "M1 1l4 4 4-4" : "M1 5l4-4 4 4"} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </button>
            ) : (
              <button type="button" className="qad-dock" data-qad-dock onClick={backToCard} aria-label={`Back to ${req.dock.name}`}>
                <span className="qad-av">{initialsOf(req.dock.name)}</span>
                <span className="qad-dk-tx"><b>{req.dock.name}</b>{req.dock.status ? <small>{req.dock.status}</small> : null}</span>
                <span className="qad-dk">Back to card</span>
              </button>
            )
          ) : null}
        </DrawerContext.Provider>,
        document.body,
      )}
      {chip}
    </>
  );
}

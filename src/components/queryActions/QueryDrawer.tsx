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
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../../lib/db";
import {
  closeQueryDrawer, showUndoBar, subscribeDrawer, currentDrawerRequest,
  type DrawerMode, type DrawerPreset, type OpenRequest,
} from "../../lib/queryActions/drawerStore";
import { restoreSnapshot, takeSnapshot } from "../../lib/queryActions/snapshot";
import { todayDay } from "../../lib/queryActions/dates";
import { DrawerContext, initialsOf } from "./controls";
import { DrawerShell } from "./DrawerShell";
import type { JourneyView } from "./journey";
import { LogJourney } from "./journeys/LogJourney";
import { ResponseJourney } from "./journeys/ResponseJourney";
import { SentJourney } from "./journeys/SentJourney";
import { NudgeJourney } from "./journeys/NudgeJourney";
import { CloseJourney } from "./journeys/CloseJourney";
import "./queryDrawer.css";

export interface JourneyProps {
  req: OpenRequest;
  today: Date;
  /** The journey hands its view up on every render. */
  children: (view: JourneyView, initialStep?: number) => React.ReactElement;
  /** Swap to another journey in place, keeping the same query. */
  switchTo: (mode: DrawerMode, preset?: DrawerPreset) => void;
}

const JOURNEYS: Partial<Record<DrawerMode, React.ComponentType<JourneyProps>>> = {
  log: LogJourney,
  resp: ResponseJourney,
  sent: SentJourney,
  nudge: NudgeJourney,
  close: CloseJourney,
};

/* The measurement harness opens the drawer the way every door does, through the store. Development
   builds only: the MODE literal is replaced at build time, so a production bundle carries none of it. */
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  (window as unknown as { __saQueryDrawer?: unknown }).__saQueryDrawer = { open: (r: OpenRequest) => import("../../lib/queryActions/drawerStore").then((m) => m.openQueryDrawer(r)) };
}

export function QueryDrawer() {
  const db = useScriptAllyDb();
  const [req, setReq] = useState<OpenRequest | null>(currentDrawerRequest());
  const [open, setOpen] = useState(false);
  /* A failed save keeps the journey MOUNTED, hidden, so "Try again" reopens it exactly as entered. */
  const [hidden, setHidden] = useState(false);
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [gen, setGen] = useState(0);
  const today = useMemo(() => todayDay(), [gen]);
  const savingRef = useRef(false);

  useEffect(() => subscribeDrawer((r) => {
    setReq(r);
    setHidden(false);
    setOpenCal(null);
    if (r) { setGen((g) => g + 1); setOpen(false); requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true))); }
    else setOpen(false);
  }), []);

  const close = useCallback(() => {
    const r = currentDrawerRequest();
    setOpen(false);
    window.setTimeout(() => { closeQueryDrawer(); r?.onCancel?.(); }, 240);
  }, []);

  const switchTo = useCallback((mode: DrawerMode, preset?: DrawerPreset) => {
    setReq((r) => (r ? { ...r, mode, preset } : r));
    setGen((g) => g + 1);
  }, []);

  const runSave = useCallback(async (view: JourneyView) => {
    if (!req || savingRef.current) return;
    const uid = db.currentUser?.id;
    if (!uid) return;
    savingRef.current = true;
    const r = req;
    try {
      const snap = await takeSnapshot(uid, view.touched());
      const out = await view.commit();
      const undo = async () => { await restoreSnapshot(snap); };
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

  /* Opened from a query card, the card DOCKS while the drawer is open — it steps out of the way to
     the chip at bottom-left and comes back on cancel or save (brief §A). One body class carries it,
     so the card's own stylesheet need not know the drawer exists. */
  const docked = !!req?.dock && !hidden;
  useEffect(() => {
    document.body.classList.toggle("qad-docked", docked);
    return () => { document.body.classList.remove("qad-docked"); };
  }, [docked]);

  if (!req) return null;
  const J = JOURNEYS[req.mode];
  if (!J) return null;

  return createPortal(
    <DrawerContext.Provider value={{ today, openCal, setOpenCal }}>
      <div className={`qad-root${open ? " is-open" : ""}`} data-qad-root style={hidden ? { display: "none" } : undefined}>
        <J key={`${req.mode}-${gen}`} req={req} today={today} switchTo={switchTo}>
          {(view, initialStep) => (
            <DrawerShell view={view} mode={req.mode} open={open && !hidden} initialStep={initialStep ?? req.preset?.step}
              onCancel={close} onSave={() => runSave(view)} />
          )}
        </J>
      </div>
      {req.dock && !hidden ? (
        <div className="qad-dock" data-qad-dock>
          <span className="qad-av">{initialsOf(req.dock.name)}</span>
          <span>{req.dock.name}</span>
        </div>
      ) : null}
    </DrawerContext.Provider>,
    document.body,
  );
}

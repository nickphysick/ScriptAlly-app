/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — ONE JOURNEY, OPENED IN PLACE, FROM EVERY DOOR (desktop). Mounted once for the workspace (App),
 * beside the query drawer, so no page is the thing that renders it: the Dashboard's button, the top bar, the Queries page,
 * a query's card, the agent card, search, Analytics, Responses and the To-do all reach it through `openResponse`
 * (lib/queryPanelStore), and it opens over whatever page is on screen. Nothing navigates.
 *
 *   openResponse()                → "Who replied?"
 *   openResponse({ queryId })     → "What did {First} say?", the Agent step done and not changeable
 *   reply                         → the answer it starts on (the To-do's "they asked for the partial")
 *   onSaved                       → told once, by `responseSaved`, when the reply is recorded
 *   back                          → opened from an agent's card: that card comes back when the journey closes
 *
 * ⚠️ IT CLAIMS THE RIGHT-HAND PANEL (`claimRightPanel("response")`), so the feed, Birds-eye and the cards close themselves.
 * ⚠️ v2.1 — "OPEN {First}'S CARD" DOES NOT CLOSE IT. The journey lends its place (`lendRightPanel`) and the query's own
 *    card opens over it; the journey stays mounted behind, stepped back (40px left, scaled to .955 from its right edge)
 *    under a .45 dim; its content is `inert` (no Tab, no keys) and its Escape layers are off, so Escape closes only the
 *    card. A click anywhere on the dimmed journey lands on a catcher over it (`under-hit`) and is the card's own Escape
 *    (its leave checks run), as a click on any panel's scrim is. When the card releases the place, the journey has it back
 *    exactly as it was (the same screen, the same scroll) and focus returns to “Open {First}’s card”.
 * ⚠️ CARD JOURNEYS v1 — the same panel hosts Mark sent, Close, Answer an offer and Reopen (CardJourneyHost), opened through
 *    `openCardJourney`. From the query's own card (`fromCard`) the card lends its place and steps back BEHIND the journey
 *    (the v2.1 stacking the other way round); Close's "{First} passed" and Reopen's "replied after all" hand over to
 *    Record a response in this same panel.
 * ⚠️ THE PHONE DOES NOT LISTEN (below 768px nothing subscribes), so `openResponse` keeps the phone's own flow there.
 * ⚠️ THE PRACTICE QUERY (Pip) is handed to the Query Centre's guided walk, which drives its own practice journey and
 *    writes nothing (lib/practiceQuery); it never reaches this host.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useIsMobile } from "../../shell/mobileChrome";
import { SidePanel } from "../../shell/SidePanel";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { claimRightPanel, isLent, lendRightPanel, openPipResponse, openQueryPanel, releaseRightPanel, rightPanelOwner, subscribeCardJourney, subscribeResponse, subscribeRightPanel, unlendRightPanel, type CardJourneyKind, type CardJourneyRequest, type ResponseRequest } from "../../../lib/queryPanelStore";
import { isPracticeId } from "../../../lib/practiceQuery";
import { openAgentCard } from "../../../lib/agentCardStore";
import { useScriptAllyDb } from "../../../lib/db";
import { RespondStagesHost, kindOfReply } from "./RespondStagesHost";
import { CardJourneyHost } from "./CardJourneyHost";

/** Card journeys v1 — the panel hosts Record a response and the four card journeys, one at a time */
type PanelReq = ({ journey: "response" } & ResponseRequest & { fromCard?: boolean }) | ({ journey: CardJourneyKind } & CardJourneyRequest);
const LABEL: Record<PanelReq["journey"], string> = { response: "Record a response", send: "Mark sent", close: "Close the query", offer: "Answer the offer", reopen: "Reopen the query" };

export const RespondStagesPanel: React.FC = () => {
  const phone = useIsMobile();
  const { queries } = useScriptAllyDb();
  const [req, setReq] = useState<(PanelReq & { n: number }) | null>(null);
  const n = useRef(0);
  useEffect(() => (phone ? undefined : subscribeResponse((r) => {
    if (r.queryId && isPracticeId(r.queryId)) { openPipResponse(); return; }
    setReq({ ...r, journey: "response", n: ++n.current });
  })), [phone]);
  /* Card journeys v1 — Mark sent, Close, Answer an offer, Reopen (the practice query has none of these) */
  useEffect(() => (phone ? undefined : subscribeCardJourney((r) => {
    if (isPracticeId(r.queryId)) return;
    setReq({ ...r, journey: r.kind, n: ++n.current });
  })), [phone]);
  /* behind the query's card: the journey lent its place */
  const [behind, setBehind] = useState(false);
  useEffect(() => {
    if (!req) return undefined;
    /* Card journeys v1 — opened from the query's own card: the card lends its place and stays behind, stepped back
       (QueryPanelHost `under`); releasing hands the place back to it, and it comes forward */
    if (req.fromCard && rightPanelOwner() === "query") lendRightPanel("query");
    claimRightPanel("response");
    setBehind(false);
    return () => { unlendRightPanel("response"); releaseRightPanel("response"); };
  }, [req?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the place comes back when the card over it releases it */
  useEffect(() => subscribeRightPanel((o) => { if (o === "response") setBehind(false); else if (isLent("response")) setBehind(true); }), []);
  /* behind: the journey takes no Tab and no keys (its content inert); back: focus to "Open {First}'s card" */
  const wasBehind = useRef(false);
  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-side-panel][data-rar="panel"] [data-rar="root"]');
    if (el) el.inert = behind;
    if (behind) {
      wasBehind.current = true;
      /* the step back is measured from where the card sits: the query's card stands further in from the window's edge than
         the journey (its own layout, untouched), so the journey also moves by that gap and about 15px of its left edge
         still shows beside the card. Layout boxes (offset*), so neither panel's transform or lean is read. */
      const raf = requestAnimationFrame(() => {
        const j = document.querySelector<HTMLElement>('[data-side-panel][data-rar="panel"]');
        const c = [...document.querySelectorAll<HTMLElement>('[data-side-panel][data-qp="panel"]')].find((x) => x.offsetWidth > 0);
        if (!j || !c) return;
        const dx = Math.max(0, (j.offsetLeft + j.offsetWidth) - (c.offsetLeft + c.offsetWidth));
        j.style.setProperty("--rar-under-dx", `${dx}px`);
      });
      return () => cancelAnimationFrame(raf);
    }
    if (!wasBehind.current) return undefined;
    wasBehind.current = false;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-rar="panel"] [data-rar="open-card"]')?.focus({ preventScroll: true });
    }));
    return () => cancelAnimationFrame(raf);
  }, [behind]);
  const reqRef = useRef(req);
  reqRef.current = req;
  const close = () => {
    const back = reqRef.current?.back;
    setReq(null);
    if (back) openAgentCard(back.agentId);
  };
  const leaveRef = useRef<(() => void) | null>(null);
  useEscapeLayer(!!req && !behind, () => close(), ESC_LEVEL.drawer);
  if (!req || phone) return null;
  const status = req.queryId ? queries.find((q) => q.id === req.queryId)?.status ?? null : null;
  /* "{First} passed" inside Close, "{First} replied after all" inside Reopen: Record a response takes over in the same
     panel (same request number, so the panel and its claim stay), at "When did {First} reply?" with Passed chosen, or
     at "What did {First} say?" */
  const handOver = (reply: "passed" | null) => setReq((o) => (o ? { journey: "response", queryId: o.queryId, from: o.from, back: o.back, fromCard: o.fromCard, reply, n: o.n } : o));
  return (
    <SidePanel label={LABEL[req.journey]} className="qsp" attrs={{ "data-rar": "panel", "data-journey": req.journey, "data-under": behind ? "true" : undefined }} onScrim={() => (leaveRef.current ? leaveRef.current() : close())}>
      {req.journey === "response"
        ? <RespondStagesHost key={`r${req.n}`} seedQueryId={req.queryId ?? null} seedKind={kindOfReply(req.reply, status)} leaveRef={leaveRef} onClose={close} behind={behind}
            onOpenCard={(id) => { lendRightPanel("response"); setBehind(true); openQueryPanel(id, req.from ?? "other"); }} />
        : <CardJourneyHost key={`c${req.n}`} queryId={req.queryId} kind={req.journey} fromCard={!!req.fromCard} leaveRef={leaveRef} onClose={close} onHandOver={handOver} />}
      {behind ? <div className="rar-under-hit" data-rar="under-hit" aria-hidden="true"
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))} /> : null}
    </SidePanel>
  );
};

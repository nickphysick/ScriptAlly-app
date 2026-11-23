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
 * ⚠️ THE PHONE DOES NOT LISTEN (below 768px nothing subscribes), so `openResponse` keeps the phone's own flow there.
 * ⚠️ THE PRACTICE QUERY (Pip) is handed to the Query Centre's guided walk, which drives its own practice journey and
 *    writes nothing (lib/practiceQuery); it never reaches this host.
 */
import React, { useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../shell/mobileChrome";
import { SidePanel } from "../../shell/SidePanel";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { claimRightPanel, openPipResponse, openQueryPanel, releaseRightPanel, subscribeResponse, type ResponseRequest } from "../../../lib/queryPanelStore";
import { isPracticeId } from "../../../lib/practiceQuery";
import { openAgentCard } from "../../../lib/agentCardStore";
import { useScriptAllyDb } from "../../../lib/db";
import { RespondStagesHost, kindOfReply } from "./RespondStagesHost";

export const RespondStagesPanel: React.FC = () => {
  const phone = useIsMobile();
  const { queries } = useScriptAllyDb();
  const [req, setReq] = useState<(ResponseRequest & { n: number }) | null>(null);
  const n = useRef(0);
  useEffect(() => (phone ? undefined : subscribeResponse((r) => {
    if (r.queryId && isPracticeId(r.queryId)) { openPipResponse(); return; }
    setReq({ ...r, n: ++n.current });
  })), [phone]);
  useEffect(() => {
    if (!req) return undefined;
    claimRightPanel("response");
    return () => releaseRightPanel("response");
  }, [req?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const reqRef = useRef(req);
  reqRef.current = req;
  const close = () => {
    const back = reqRef.current?.back;
    setReq(null);
    if (back) openAgentCard(back.agentId);
  };
  const leaveRef = useRef<(() => void) | null>(null);
  useEscapeLayer(!!req, () => close(), ESC_LEVEL.drawer);
  if (!req || phone) return null;
  const status = req.queryId ? queries.find((q) => q.id === req.queryId)?.status ?? null : null;
  return (
    <SidePanel label="Record a response" className="qsp" attrs={{ "data-rar": "panel" }} onScrim={() => (leaveRef.current ? leaveRef.current() : close())}>
      <RespondStagesHost key={req.n} seedQueryId={req.queryId ?? null} seedKind={kindOfReply(req.reply, status)} leaveRef={leaveRef} onClose={close}
        onOpenCard={(id) => { setReq(null); openQueryPanel(id, req.from ?? "other"); }} />
    </SidePanel>
  );
};

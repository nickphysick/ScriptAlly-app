/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 — ONE JOURNEY, OPENED IN PLACE, FROM EVERY DOOR (desktop). Mounted once for the workspace (App), beside
 * Record a response's panel, so no page is the thing that renders it: every door reaches it through `openAddAgent`
 * (lib/addAgentStore), and it opens over whatever page is on screen, the desk dimmed. Nothing navigates.
 *
 * ⚠️ THE SAVE IS THE ONE EVERY ADD HAS USED SINCE ADD AGENT V1: `addAgent(agentFromDraft(draft))` — the store's own
 *    twin merge, its AGENT_ADDED activity, its first-win stamp. The record is the old journey's, field for field.
 * ⚠️ FROM INSIDE LOG A QUERY (`over: "laq"`) the log journey steps back behind this one, dimmed (`body.aag-over-laq`),
 *    and is handed the new agent once it is added; Cancel leaves it exactly as it was.
 * ⚠️ THE PHONE DOES NOT LISTEN (below 768px nothing subscribes), so the old opener keeps the phone's own flow there.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { useIsMobile } from "../../shell/mobileChrome";
import { SidePanel } from "../../shell/SidePanel";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { subscribeAddAgent, type AddAgentRequest } from "../../../lib/addAgentStore";
import { agentFromDraft } from "../../../lib/agentCreate";
import { agentGaps } from "../../../lib/contactHousekeeping";
import { stageAgents } from "../../../lib/queryActions/logStages";
import { bookOf } from "../../../lib/queryActions/sample";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { currentAgentCard, openAgentCard, subscribeAgentCard } from "../../../lib/agentCardStore";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { useEditOptions } from "../../agents/card/useEditOptions";
import { PreviewAgentCard } from "../../todo/ws/WsPreview";
import type { Agent } from "../../../types";
import { QcAddAgent } from "./QcAddAgent";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export const AddAgentPanel: React.FC = () => {
  const phone = useIsMobile();
  const [req, setReq] = useState<(AddAgentRequest & { n: number }) | null>(null);
  const n = useRef(0);
  useEffect(() => (phone ? undefined : subscribeAddAgent((r) => setReq({ ...r, n: ++n.current }))), [phone]);
  const reqRef = useRef(req);
  reqRef.current = req;
  const addedRef = useRef(false);
  useEffect(() => { addedRef.current = false; }, [req?.n]);
  /* from inside Log a query: the log steps back, dimmed, while this one is open */
  useEffect(() => {
    if (!req || req.over !== "laq") return undefined;
    document.body.classList.add("aag-over-laq");
    return () => document.body.classList.remove("aag-over-laq");
  }, [req?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => {
    const r = reqRef.current;
    setReq(null);
    if (r && !addedRef.current) r.onCancel?.();
  };
  const leaveRef = useRef<(() => void) | null>(null);
  /* an agent already on the list: its card opens over the journey, which steps back behind it until the card closes
     (the way Record a response v2.1 stands a card over its journey) */
  const [behind, setBehind] = useState(false);
  useEffect(() => {
    if (!behind) return undefined;
    document.body.classList.add("aag-behind");
    const off = subscribeAgentCard(() => { if (!currentAgentCard()) setBehind(false); });
    return () => { off(); document.body.classList.remove("aag-behind"); };
  }, [behind]);
  useEffect(() => { if (!req) setBehind(false); }, [req]);
  useEscapeLayer(!!req && !behind, () => close(), ESC_LEVEL.drawer);
  if (!req || phone) return null;
  return (
    <SidePanel label="Add an agent" className="qsp" attrs={{ "data-aag": "panel" }} onScrim={() => (leaveRef.current ? leaveRef.current() : close())}>
      <AddAgentHost key={req.n} req={req} leaveRef={leaveRef} onClose={close} onAdded={() => { addedRef.current = true; }} behind={behind} onBehind={setBehind} />
    </SidePanel>
  );
};

const AddAgentHost: React.FC<{ req: AddAgentRequest; leaveRef: React.MutableRefObject<(() => void) | null>; onClose: () => void; onAdded: () => void; behind: boolean; onBehind: (v: boolean) => void }> = ({ req, leaveRef, onClose, onAdded, behind, onBehind }) => {
  const { currentUser, agents, queries, activities, manuscripts, addAgent } = useScriptAllyDb();
  const nowMs = useMemo(() => Date.now(), []);
  const ms = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
  }, [manuscripts]);
  const opts = useEditOptions(ms?.genre ?? null);
  /* how each agent on the list stands, in the Queries page's words (Log a query's own reading, over every book) */
  const standing = useMemo(() => new Map(stageAgents(agents, queries, nowMs).map((a) => [a.id, a.standing])), [agents, queries, nowMs]);
  const withQuery = useMemo(() => new Set(queries.map((q) => q.agentId)), [queries]);
  /* the Dashboard's "Agents on file" (lib/dashFirstUse `agentCoverage`: every agent on the list) */
  const onFile = agents.length;
  if (!currentUser) return null;
  const iso = new Date(nowMs).toISOString();
  const agentOf = (d: Parameters<typeof agentFromDraft>[0]): Agent => ({ ...agentFromDraft(d), id: "aag-preview", userId: currentUser.id, dateAdded: iso, lastCheckedDate: iso });
  return (
    <QcAddAgent nowMs={nowMs} agents={agents} onFile={onFile} seedName={req.name ?? ""} fromLog={req.over === "laq"}
      standingOf={(id) => standing.get(id) ?? null} hasQuery={(id) => withQuery.has(id)}
      genre={{ options: { ms: ms?.genre ?? null, pool: opts.genrePool, personal: opts.personalLabels, all: [...opts.allGenres] }, onNew: opts.onNewGenre }}
      book={bookOf(ms?.wordCount)}
      agentOf={agentOf}
      gapsOf={(a) => agentGaps(a, { hasReopenTask: false }, []).length}
      renderCard={(a) => <PreviewAgentCard agent={a} queries={queries} activities={activities} agents={agents} manuscript={ms} manuscripts={manuscripts}
        personalGenres={currentUser.personalGenres ?? []} draft={null} nowMs={nowMs} withGaps />}
      onAdd={async (d) => {
        const res = await addAgent(agentFromDraft(d));
        if (!res.success || !res.id) return { error: res.error ?? "Couldn’t add the agent." };
        onAdded();
        return { id: res.id, name: d.name.trim() || d.agency.trim() };
      }}
      onOpenCard={(id) => { onClose(); openAgentCard(id, { host: "panel", from: "button" }); }}
      onOpenDupe={(id) => { onBehind(true); openAgentCard(id, { host: "panel", from: "button" }); }} behind={behind}
      onLog={(id) => { onClose(); openQueryDrawer({ mode: "log", agentId: id, ...(ms?.id ? { manuscriptId: ms.id } : {}) }); }}
      onBackToLog={(a) => { req.onAdded?.(a.id, a.name); onClose(); }}
      onClose={onClose} leaveRef={leaveRef} />
  );
};

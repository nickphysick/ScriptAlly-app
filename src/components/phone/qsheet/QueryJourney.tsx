/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 §C — THE FIVE JOURNEYS OVER THE SHEET: Mark sent, Record a response, Close, Answer an offer and
 * Reopen. Each is the DESKTOP's journey — its host (CardJourneyHost / RespondStagesHost), its spec, its steps, its plans
 * and its one batched save — drawn by the desktop shells' `phone` mode (the thin progress bar, the app's slider for "An
 * earlier date", the phone's verb on the review, and the save handed back here). Nothing on this side writes.
 *   - it rises from the bottom to 62px from the top (radius 24) over the sheet, which steps back behind it;
 *   - Close → "{First} passed" and Reopen → "{First} replied after all" hand over to Record a response exactly as the
 *     desktop panel does (RespondStagesPanel `handOver`: the same query, `kindOfReply`), at its "when" step with Passed
 *     chosen, or at "What did {First} say?";
 *   - haptics as Birds-eye v3: 8ms on a choice, 12ms on the save.
 */
import React, { useEffect, useRef, useState } from "react";
import { CardJourneyHost } from "../../queries/centre/CardJourneyHost";
import { RespondStagesHost, kindOfReply } from "../../queries/centre/RespondStagesHost";
import type { CardJourneyKind } from "../../../lib/queryPanelStore";
import type { RKind } from "../../../lib/queryActions/respondStages";
import { useScriptAllyDb } from "../../../lib/db";
import "../../queries/centre/qcLogStages.css";
import "../../queries/centre/qcRespondStages.css";
import "../../queries/centre/qcCardJourney.css";
import "./queryJourney.css";

export type PqjKind = CardJourneyKind | "resp";
/** the review's button on the phone: the journey's verb (brief §C) */
export const PQJ_VERB: Record<CardJourneyKind, string> = { send: "Mark sent", close: "Close it", offer: "Log it", reopen: "Reopen" };

const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* no haptics */ } };

export interface QueryJourneyProps {
  id: string;
  kind: PqjKind;
  /** Record a response opened by a hand-over: its preselected answer */
  seedKind?: RKind | null;
  onClose: () => void;
  /** a save: the toast's words and its Undo (the desktop's own snapshot restore) */
  onSaved: (msg: string, undo: () => Promise<void>) => void;
}

export const QueryJourney: React.FC<QueryJourneyProps> = ({ id, kind: kind0, seedKind: seed0 = null, onClose, onSaved }) => {
  const db = useScriptAllyDb();
  const [j, setJ] = useState<{ kind: PqjKind; seed: RKind | null; n: number }>({ kind: kind0, seed: seed0, n: 0 });
  useEffect(() => { setJ({ kind: kind0, seed: seed0, n: 0 }); }, [kind0, seed0, id]);
  const [on, setOn] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setOn(true), 20); return () => window.clearTimeout(t); }, []);
  const leaveRef = useRef<(() => void) | null>(null);
  const first = (() => { const q = db.queries.find((x) => x.id === id); const a = q ? db.agents.find((x) => x.id === q.agentId) : null; return (a?.name ?? "").trim().split(/\s+/)[0] || a?.agency || "the agent"; })();
  const handOver = (reply: "passed" | null) => {
    const status = db.queries.find((x) => x.id === id)?.status ?? null;
    setJ((o) => ({ kind: "resp", seed: kindOfReply(reply, status) ?? null, n: o.n + 1 }));
  };
  const saved = (msg: string, undo: () => Promise<void>) => { buzz(12); onSaved(msg, undo); };
  return (
    <div className={`pqj${on ? " on" : ""}`} data-pqj="journey" data-kind={j.kind} role="dialog" aria-modal="true"
      onClickCapture={(e) => { if ((e.target as HTMLElement).closest?.(".laq-big > button")) buzz(8); }}>
      <div className="pqj-in">
        {j.kind === "resp"
          ? <RespondStagesHost key={`r${j.n}`} seedQueryId={id} seedKind={j.seed} leaveRef={leaveRef} onClose={onClose} onOpenCard={onClose} phone
              onPhoneSaved={(s) => saved(`Recorded ${first}’s reply.`, s.undo)} />
          : <CardJourneyHost key={`c${j.n}`} queryId={id} kind={j.kind} fromCard leaveRef={leaveRef} onClose={onClose} onHandOver={handOver} phone verb={PQJ_VERB[j.kind]}
              onPhoneSaved={(s, head) => saved(`${head[0]} ${head[1]}`, s.undo)} />}
      </div>
    </div>
  );
};
